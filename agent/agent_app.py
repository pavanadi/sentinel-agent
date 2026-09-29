"""Sentinel: federated cross-border cyclone early warning.

Three nation-local agents (Doria, Kessa, Averlyn) each analyze only their own
country's sensor data and emit an anonymized risk signal -- no raw sensor
data crosses a border. A coordinator agent then reasons ONLY over those three
signals (it never sees raw data from any nation) to predict which nation
will be hit hardest next and recommend a coordinated response.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from flwr.agentapp import AgentApp, AgentSession
from flwr.app import Context
from openai import OpenAI

from agent.data import LOCAL_SENSOR_DATA, NATION_ORDER

MODEL = "openai/gpt-5.6-sol"
DEFAULT_PROMPT = "Brief me on current conditions."

app = AgentApp()


def _stream_and_emit(client: OpenAI, agent: AgentSession, *, instructions: str, input_text: str) -> str:
    """Send one streamed model request, publish its events, return the full text."""
    stream = client.responses.create(
        model=MODEL,
        input=input_text,
        instructions=instructions,
        stream=True,
    )
    output_text: list[str] = []
    for event in stream:
        agent.events.emit(event.to_dict())
        if event.type in {"error", "response.failed", "response.incomplete"}:
            raise RuntimeError(f"Model response did not complete: {event}")
        if event.type in {"response.output_text.delta", "response.refusal.delta"}:
            output_text.append(event.delta)
    return "".join(output_text)


def _extract_json_block(text: str) -> dict[str, Any]:
    """Pull the trailing ```json ... ``` block a nation agent was asked to emit."""
    match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON signal block found in model output")
    return json.loads(match.group(1))


NATION_INSTRUCTIONS = """You are the National Meteorological Agent for {country}.

You may ONLY use the sensor data for {country} given below. You have no
access to any other nation's sensor data, and you must not guess, assume, or
mention what conditions might be like elsewhere -- only report on {country}.

Sensor data for {country}:
{data}

Write a short (3-5 sentence) analysis for a regional briefing, starting with
the bolded line "**{country} -- National Meteorological Agent**". Then, on a
new line, emit ONLY this JSON object in a fenced ```json code block as the
very last thing in your response (no text after it):

{{
  "country": "{country}",
  "severity": <float 0-1, this nation's own current risk level>,
  "anomaly_type": "<one short phrase>",
  "trend_vector": "<one short phrase describing how this nation's readings are changing over time>",
  "confidence": <float 0-1>,
  "key_evidence": ["<short bullet>", "<short bullet>"]
}}
"""

COORDINATOR_INSTRUCTIONS = """You are the Regional Early Warning Coordinator.

You have NEVER seen raw sensor data from any nation -- national governments do
not share that. You have only the three independent risk signals below, each
produced by that nation's own analyst reasoning over data that never left
their country.

Signals:
{signals}

Using only these signals, write a regional briefing that:
1. States which nation is likely to be hit hardest NEXT (not necessarily the
   one with the highest current severity -- reason about trajectory/trend).
2. Explains the cross-border pattern that no single nation's own signal
   reveals on its own.
3. Gives one concrete, coordinated recommendation for the nations to act on
   together.

Start with the bolded line "**Regional Early Warning Coordinator**". Be
concise: at most 6 sentences total.
"""


@app.main()
def main(agent: AgentSession, context: Context) -> None:
    """Run the three nation agents, then the coordinator, over one prompt."""
    client = OpenAI(
        base_url=os.environ["FLWR_RUNTIME_BASE_URL"],
        api_key=os.environ["FLWR_RUNTIME_API_KEY"],
        max_retries=0,
    )
    prompt = agent.prompt or DEFAULT_PROMPT

    signals: list[dict[str, Any]] = []
    for country in NATION_ORDER:
        instructions = NATION_INSTRUCTIONS.format(
            country=country,
            data=json.dumps(LOCAL_SENSOR_DATA[country], indent=2),
        )
        try:
            text = _stream_and_emit(
                client,
                agent,
                instructions=instructions,
                input_text=prompt,
            )
            signal = _extract_json_block(text)
        except (RuntimeError, ValueError, json.JSONDecodeError) as exc:
            signal = {
                "country": country,
                "severity": 0.5,
                "anomaly_type": "unparsed",
                "trend_vector": "unknown",
                "confidence": 0.0,
                "key_evidence": [f"agent output could not be parsed: {exc}"],
            }
        signals.append(signal)
        print(f"[{country}] {signal}")

    coordinator_text = _stream_and_emit(
        client,
        agent,
        instructions=COORDINATOR_INSTRUCTIONS.format(signals=json.dumps(signals, indent=2)),
        input_text=prompt,
    )
    print(coordinator_text)
