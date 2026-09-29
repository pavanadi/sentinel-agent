"""Sentinel: federated cross-border flood early warning.

Five upstream nations each monitor one river that drains into the delta
nation Calderune. Each nation's agent reads only its own gauge data and shares
one derived signal: its flow, projected to the day it reaches the delta.
Rainfall, soil moisture, gauge levels and history never leave the nation.
The coordinator sums those projections and warns Calderune -- even though no
upstream nation's own data ever crosses its local alert threshold.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
from collections import defaultdict
from typing import Any

from flwr.agentapp import AgentApp, AgentSession
from flwr.app import Context
from openai import OpenAI

from agent.data import (
    BASINS,
    DEFAULT_AS_OF,
    DOWNSTREAM,
    DOWNSTREAM_DANGER_M3S,
    NATION_ORDER,
    REGION_GEOGRAPHY,
    load_readings,
)

MODEL = "openai/gpt-5.6-sol"
DEFAULT_PROMPT = "Brief me on current river conditions."
NATION_TASK = "Report on {country}'s own river conditions as of {as_of}."
SECTION_BREAK = "\n\n---\n\n"
LOCAL_WINDOW_DAYS = 7
AS_OF_DATE = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")

app = AgentApp()


def _emit_text(agent: AgentSession, text: str) -> None:
    """Publish app-generated text as a delta so it renders inline in chat."""
    agent.events.emit({"type": "response.output_text.delta", "delta": text})


def _stream_and_emit(
    client: OpenAI,
    agent: AgentSession,
    *,
    instructions: str,
    input_text: str,
    final: bool,
) -> str:
    """Send one streamed model request, publish its events, return the full text.

    Flower Chat stops rendering at the first response.completed, so only the
    final persona's completion event is published.
    """
    stream = client.responses.create(
        model=MODEL,
        input=input_text,
        instructions=instructions,
        stream=True,
    )
    output_text: list[str] = []
    for event in stream:
        if final or event.type != "response.completed":
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


def _as_of(prompt: str) -> str:
    match = AS_OF_DATE.search(prompt)
    return match.group(1) if match else DEFAULT_AS_OF


def _projected_inflow(nation: str, readings: list[dict[str, Any]], as_of: str) -> dict[str, float]:
    """The only number a nation shares: flow already in the river, keyed by delta arrival date."""
    shift = dt.timedelta(days=BASINS[nation]["travel_days"])
    projected = {}
    for row in readings:
        arrival = (dt.date.fromisoformat(row["date"]) + shift).isoformat()
        if arrival > as_of:
            projected[arrival] = row["discharge_m3s"]
    return projected


def _combine(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sum projected inflow by arrival date. Dates missing a nation are lower bounds."""
    by_date: dict[str, dict[str, float]] = defaultdict(dict)
    for signal in signals:
        for date, flow in signal["projected_inflow_m3s"].items():
            by_date[date][signal["country"]] = flow
    rows = []
    for date in sorted(by_date):
        shares = by_date[date]
        total = sum(shares.values())
        rows.append(
            {
                "arrival_date": date,
                "combined_inflow_m3s": round(total),
                "nations_reporting": len(shares),
                "complete": len(shares) == len(signals),
                "above_danger": total > DOWNSTREAM_DANGER_M3S,
                "by_nation_m3s": {
                    c: round(f) for c, f in sorted(shares.items(), key=lambda kv: -kv[1])
                },
            }
        )
    return rows


NATION_INSTRUCTIONS = """You are the National Hydrology Agent for {country}, which
monitors the {river} river.

You may ONLY use {country}'s own gauge readings below (the last {days} days up
to {as_of}). You have no access to any other nation's data. Do not guess or
mention conditions elsewhere, including downstream.

{country} readings:
{data}

Write a short (3-4 sentence) local report, starting with the bolded line
"**{country} -- National Hydrology Agent ({river} river)**". Judge severity
against {country}'s own local danger level only. Then emit ONLY this JSON
object in a fenced ```json code block as the very last thing in your response
(no text after it):

{{
  "country": "{country}",
  "severity": <float 0-1, {country}'s own local flood risk>,
  "anomaly_type": "<one short phrase>",
  "trend_vector": "<one short phrase describing how {country}'s readings are changing>",
  "confidence": <float 0-1>,
  "key_evidence": ["<short bullet>", "<short bullet>"]
}}
"""

COORDINATOR_INSTRUCTIONS = """You are the Regional Flood Early Warning Coordinator
for the {downstream} delta. Today is {as_of}.

You have NEVER seen any nation's gauge data. Each upstream nation shared only
its own local assessment and the flow already in its river, projected to the
date it will reach the delta.

Public hydrology:
{geography}

Nation signals:
{signals}

Combined projected delta inflow (computed exactly; do not recompute). Dates
with fewer than {n} nations reporting are lower bounds -- more water will
still arrive:
{combined}

Write a regional briefing that:
1. States clearly whether {downstream} needs a flood warning, for which
   date(s), and how much lead time that gives.
2. Explains why no single nation could have seen this from its own data.
3. Names which nations' water contributes most on the warning date(s), using
   by_nation_m3s.
4. Gives one concrete, coordinated recommendation.

Start with the bolded line "**Regional Flood Early Warning Coordinator**".
Be concise: at most 7 sentences. Quote the combined inflow figures above
exactly; do not invent numbers.
"""


@app.main()
def main(agent: AgentSession, context: Context) -> None:
    """Run the five nation agents, then the coordinator, over one prompt."""
    client = OpenAI(
        base_url=os.environ["FLWR_RUNTIME_BASE_URL"],
        api_key=os.environ["FLWR_RUNTIME_API_KEY"],
        max_retries=0,
    )
    prompt = agent.prompt or DEFAULT_PROMPT
    as_of = _as_of(prompt)

    signals: list[dict[str, Any]] = []
    for country in NATION_ORDER:
        readings = [r for r in load_readings(country) if r["date"] <= as_of]
        window = readings[-LOCAL_WINDOW_DAYS:]
        instructions = NATION_INSTRUCTIONS.format(
            country=country,
            river=BASINS[country]["river"],
            days=LOCAL_WINDOW_DAYS,
            as_of=as_of,
            data=json.dumps(window, indent=1),
        )
        try:
            text = _stream_and_emit(
                client,
                agent,
                instructions=instructions,
                input_text=NATION_TASK.format(country=country, as_of=as_of),
                final=False,
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
        latest = window[-1]
        signal["local_alert"] = int(latest["local_alert"])
        signal["pct_of_local_danger"] = latest["pct_of_local_danger"]
        signal["projected_inflow_m3s"] = _projected_inflow(country, window, as_of)
        signals.append(signal)
        print(f"[{country}] {signal}")
        _emit_text(agent, SECTION_BREAK)

    combined = _combine(signals)
    print(f"[combined] {combined}")
    coordinator_text = _stream_and_emit(
        client,
        agent,
        instructions=COORDINATOR_INSTRUCTIONS.format(
            downstream=DOWNSTREAM,
            as_of=as_of,
            geography=REGION_GEOGRAPHY,
            signals=json.dumps(signals, indent=1),
            n=len(signals),
            combined=json.dumps(combined, indent=1),
        ),
        input_text=prompt,
        final=True,
    )
    print(coordinator_text)
