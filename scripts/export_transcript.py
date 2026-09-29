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

from agent.agent_app import LOCAL_WINDOW_DAYS, _as_of, _combine, _projected_inflow  # noqa: E402
from agent.data import (  # noqa: E402
    BASINS,
    DOWNSTREAM,
    DOWNSTREAM_DANGER_M3S,
    NATION_ORDER,
    load_readings,
)

SECTION_BREAK = "\n\n---\n\n"
DEFAULT_OUTPUT = REPO_ROOT / "web/data/sample-run.json"
DASHBOARD = REPO_ROOT / "web/index.html"
FALLBACK_BLOCK = re.compile(
    r"(/\* SENTINEL_FALLBACK_START \*/\n).*?(\n/\* SENTINEL_FALLBACK_END \*/)", re.DOTALL
)
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


def add_computed_fields(nation: dict, as_of: str) -> None:
    """Recompute the code-derived fields the agent app attaches after the LLM output.

    Same inputs as agent_app.main: the last LOCAL_WINDOW_DAYS readings up to as_of.
    """
    country = nation["country"]
    readings = [r for r in load_readings(country) if r["date"] <= as_of]
    window = readings[-LOCAL_WINDOW_DAYS:]
    latest = window[-1]
    nation["river"] = BASINS[country]["river"]
    nation["travel_hours"] = BASINS[country]["travel_hours"]
    nation["travel_days"] = BASINS[country]["travel_days"]
    nation["pct_of_local_danger"] = latest["pct_of_local_danger"]
    nation["local_alert"] = int(latest["local_alert"])
    nation["projected_inflow_m3s"] = _projected_inflow(country, window, as_of)


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
    as_of = _as_of(run["prompt"])
    signals = []
    for nation in nations:
        add_computed_fields(nation, as_of)
        signals.append({"country": nation["country"], "projected_inflow_m3s": nation["projected_inflow_m3s"]})
    coordinator_text = strip_header(sections[-1]).replace("**", "")
    sentences = SENTENCE_END.split(coordinator_text)
    coordinator = {
        "narrative": " ".join(sentences[:-1]),
        "most_impacted": DOWNSTREAM,
        "recommendation": re.sub(r"^Recommendation:\s*", "", sentences[-1]),
    }
    return {
        "prompt": run["prompt"],
        "as_of": as_of,
        "downstream": DOWNSTREAM,
        "threshold_m3s": DOWNSTREAM_DANGER_M3S,
        "nations": nations,
        "combined": _combine(signals),
        "coordinator": coordinator,
    }


def embed_fallback(transcript: dict) -> bool:
    """Refresh the copy of the run embedded in web/index.html (used when opened via file://)."""
    if not DASHBOARD.exists():
        return False
    html = DASHBOARD.read_text()
    body = "window.SENTINEL_FALLBACK_RUN = " + json.dumps(transcript, indent=2, ensure_ascii=False).replace("</", "<\\/") + ";"
    new_html, count = FALLBACK_BLOCK.subn(lambda m: m.group(1) + body + m.group(2), html)
    if count != 1:
        return False
    DASHBOARD.write_text(new_html)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("run_file", nargs="?", type=Path)
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    run_file = args.run_file or max((REPO_ROOT / "runs").glob("run-*.json"), key=lambda p: p.stat().st_mtime)
    transcript = convert(json.loads(run_file.read_text()))
    args.output.write_text(json.dumps(transcript, indent=2, ensure_ascii=False) + "\n")

    print(f"{run_file.name} -> {args.output}")
    if args.output.resolve() == DEFAULT_OUTPUT.resolve() and embed_fallback(transcript):
        print(f"  refreshed embedded fallback copy in {DASHBOARD.relative_to(REPO_ROOT)}")
    for nation in transcript["nations"]:
        print(
            f"  {nation['country']:<9} severity={nation['signal']['severity']}"
            f" pct_of_local_danger={nation['pct_of_local_danger']} local_alert={nation['local_alert']}"
        )
    for row in transcript["combined"]:
        print(f"  {row['arrival_date']} {row['combined_inflow_m3s']:>7,} m3/s ({row['nations_reporting']}/{len(NATION_ORDER)})")
    print(f"  recommendation: {transcript['coordinator']['recommendation'][:100]}")


if __name__ == "__main__":
    main()
