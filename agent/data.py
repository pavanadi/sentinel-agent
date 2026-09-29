"""River-basin data for the Sentinel demo.

Five upstream countries each monitor one river that drains into Bangladesh.
Readings in agent/basins/*.json are each country's PRIVATE gauge data (200
daily rows, synthetic); only that country's agent may read them. Same readings
as data/supernode-*/river_readings.csv, without the location columns.

Travel times, danger thresholds and the map are public hydrology, so the
coordinator may use them.
"""

from __future__ import annotations

import json
from pathlib import Path

BASIN_DIR = Path(__file__).resolve().parent / "basins"

DOWNSTREAM = "Bangladesh"
DOWNSTREAM_DANGER_M3S = 44000
DEFAULT_AS_OF = "2026-07-03"

# Public: river, and days for water to reach Bangladesh.
BASINS = {
    "China": {"river": "Yarlung Tsangpo", "file": "china.json", "travel_hours": 96, "travel_days": 4},
    "Nepal": {"river": "Koshi", "file": "nepal.json", "travel_hours": 60, "travel_days": 2},
    "India": {"river": "Ganga", "file": "india.json", "travel_hours": 48, "travel_days": 2},
    "Bhutan": {"river": "Manas", "file": "bhutan.json", "travel_hours": 36, "travel_days": 2},
    "Myanmar": {"river": "Barak/Meghna", "file": "myanmar.json", "travel_hours": 30, "travel_days": 1},
}
NATION_ORDER = list(BASINS)

REGION_GEOGRAPHY = (
    f"China, Nepal, India, Bhutan and Myanmar each lie upstream of {DOWNSTREAM}. "
    f"Their rivers (Yarlung Tsangpo, Koshi, Ganga, Manas, Barak/Meghna) all drain into {DOWNSTREAM}. "
    f"Water takes about 4, 2.5, 2, 1.5 and 1.25 days respectively to reach {DOWNSTREAM}. "
    f"{DOWNSTREAM} floods when combined inflow exceeds {DOWNSTREAM_DANGER_M3S:,} m3/s."
)


def load_readings(nation: str) -> list[dict[str, float | str]]:
    """Load one country's private daily readings."""
    return json.loads((BASIN_DIR / BASINS[nation]["file"]).read_text())
