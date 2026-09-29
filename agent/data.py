"""River-basin data for the Sentinel demo.

Five fictional upstream nations each monitor one river that drains into the
downstream delta nation, Calderune. Readings in agent/basins/*.json are each
nation's PRIVATE gauge data (200 daily rows); only that nation's agent may read
them. Derived from the team's SuperNode dataset with names changed and
coordinates removed.

Travel times, danger thresholds and the map are public hydrology, so the
coordinator may use them.
"""

from __future__ import annotations

import json
from pathlib import Path

BASIN_DIR = Path(__file__).resolve().parent / "basins"

DOWNSTREAM = "Calderune"
DOWNSTREAM_DANGER_M3S = 44000
DEFAULT_AS_OF = "2026-07-03"

# Public: river, and days for water to reach the Calderune delta.
BASINS = {
    "Kaldor": {"river": "Upper Kal", "file": "kaldor.json", "travel_hours": 96, "travel_days": 4},
    "Torvia": {"river": "Tor", "file": "torvia.json", "travel_hours": 60, "travel_days": 2},
    "Brenholt": {"river": "Bren", "file": "brenholt.json", "travel_hours": 48, "travel_days": 2},
    "Veyra": {"river": "Veyr", "file": "veyra.json", "travel_hours": 36, "travel_days": 2},
    "Ostmark": {"river": "Ost", "file": "ostmark.json", "travel_hours": 30, "travel_days": 1},
}
NATION_ORDER = list(BASINS)

REGION_GEOGRAPHY = (
    f"Kaldor, Torvia, Brenholt, Veyra and Ostmark each lie upstream of {DOWNSTREAM}. "
    f"Their rivers (Upper Kal, Tor, Bren, Veyr, Ost) all converge in the {DOWNSTREAM} delta. "
    "Water takes about 4, 2.5, 2, 1.5 and 1.25 days respectively to reach the delta. "
    f"The {DOWNSTREAM} delta floods when combined inflow exceeds {DOWNSTREAM_DANGER_M3S:,} m3/s."
)


def load_readings(nation: str) -> list[dict[str, float | str]]:
    """Load one nation's private daily readings."""
    return json.loads((BASIN_DIR / BASINS[nation]["file"]).read_text())
