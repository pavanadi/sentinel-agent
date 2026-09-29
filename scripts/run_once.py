"""Run the local Sentinel AgentApp once on SuperGrid, non-interactively.

`flwr run` can't send a prompt to an AgentApp, so this reuses the same calls
`flwr chat` makes. It prints streamed text and saves every run event to
runs/run-<id>.json.

Usage (from the repo root, after `uv run flwr login supergrid`):
    uv run python scripts/run_once.py "A tropical cyclone is active in the region. Brief me."
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from flwr.cli.chat.chat_app import parse_task_event, start_chat_run
from flwr.cli.chat.chat_local_agent import build_local_agent
from flwr.cli.constant import CHAT_FAILURE_EVENTS, CHAT_TEXT_DELTA_EVENT
from flwr.cli.flower_config import read_superlink_connection
from flwr.cli.utils import init_http_client_from_connection
from flwr.proto.control_pb2 import StreamRunEventsRequest  # pylint: disable=E0611

REPO_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    prompt = " ".join(sys.argv[1:]) or "A tropical cyclone is active in the region. Brief me."
    connection = read_superlink_connection(os.environ.get("FLWR_CHAT_SUPERLINK", "supergrid"))
    client = init_http_client_from_connection(connection)
    local_agent = build_local_agent(REPO_ROOT)
    try:
        run_id, _ = start_chat_run(
            client,
            prompt,
            connection.federation,
            None,
            local_agent.app_spec,
            local_agent.fab_hash,
            local_agent.fab_content,
        )
        print(f"run_id={run_id}", file=sys.stderr)

        events = []
        for res in client.StreamRunEvents(StreamRunEventsRequest(run_id=run_id)):
            event_type, payload = parse_task_event(res.task_event)
            events.append({"event": event_type, "data": payload})
            if event_type == CHAT_TEXT_DELTA_EVENT:
                print(payload.get("delta", ""), end="", flush=True)
            elif event_type == "response.completed":
                print("\n\n--- response.completed ---\n", flush=True)
            elif event_type in CHAT_FAILURE_EVENTS:
                print(f"\n[FAILURE] {json.dumps(payload)[:500]}", file=sys.stderr)
    finally:
        client.close()

    out_dir = REPO_ROOT / "runs"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"run-{run_id}.json"
    out_path.write_text(json.dumps({"run_id": run_id, "prompt": prompt, "events": events}, indent=1))
    print(f"\nsaved {len(events)} events -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
