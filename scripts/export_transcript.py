"""Convert a saved run (runs/run-<id>.json) into the dashboard's replay format.

Usage:
    uv run python scripts/export_transcript.py                  # latest run -> web/data/sample-run.json
    uv run python scripts/export_transcript.py runs/run-123.json -o web/data/real-run.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from agent.data import DOWNSTREAM, NATION_ORDER  # noqa: E402

SECTION_BREAK = "\n\n---\n\n"
JSON_BLOCK = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def strip_header(text: str) -> str:
    lines = text.strip().splitlines()
    if lines and lines[0].startswith("**"):
        lines = lines[1:]
    return "\n".join(lines).strip()


def parse_nation(section: str) -> dict:
    match = JSON_BLOCK.search(section)
    if not match:
        raise ValueError(f"No JSON signal block in section:\n{section[:300]}")
    signal = json.loads(match.group(1))
    narrative = strip_header(JSON_BLOCK.sub("", section))
    return {"country": signal["country"], "narrative": narrative, "signal": signal}


def convert(run: dict) -> dict:
    text = "".join(
        e["data"].get("delta", "")
        for e in run["events"]
        if e["event"] == "response.output_text.delta"
    )
    sections = [s for s in text.split(SECTION_BREAK) if s.strip()]
    if len(sections) != len(NATION_ORDER) + 1:
        raise ValueError(f"Expected {len(NATION_ORDER) + 1} sections, found {len(sections)}")

    nations = [parse_nation(s) for s in sections[:-1]]
    coordinator_text = strip_header(sections[-1]).replace("**", "")
    sentences = SENTENCE_END.split(coordinator_text)
    coordinator = {
        "narrative": " ".join(sentences[:-1]),
        "most_impacted": DOWNSTREAM,
        "recommendation": re.sub(r"^Recommendation:\s*", "", sentences[-1]),
    }
    return {"prompt": run["prompt"], "nations": nations, "coordinator": coordinator}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("run_file", nargs="?", type=Path)
    parser.add_argument("-o", "--output", type=Path, default=REPO_ROOT / "web/data/sample-run.json")
    args = parser.parse_args()

    run_file = args.run_file or max((REPO_ROOT / "runs").glob("run-*.json"), key=lambda p: p.stat().st_mtime)
    transcript = convert(json.loads(run_file.read_text()))
    args.output.write_text(json.dumps(transcript, indent=2, ensure_ascii=False) + "\n")

    print(f"{run_file.name} -> {args.output}")
    for nation in transcript["nations"]:
        print(f"  {nation['country']:<9} severity={nation['signal']['severity']}")
    print(f"  recommendation: {transcript['coordinator']['recommendation'][:100]}")


if __name__ == "__main__":
    main()
