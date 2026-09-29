"""Synthetic, per-nation sensor data.

Each nation's readings are deliberately visible ONLY to that nation's own
agent call in agent_app.py. No function here combines data across nations —
that boundary is the point of the demo.
"""

NATION_ORDER = ["Doria", "Kessa", "Averlyn"]

# Storm is currently over Doria (moving west, toward Kessa then Averlyn).
LOCAL_SENSOR_DATA = {
    "Doria": {
        "readings": [
            {"t": "T-12h", "pressure_hpa": 985, "wind_kmh": 140, "sea_surface_temp_c": 29.4, "rainfall_mm_24h": 210},
            {"t": "T-6h", "pressure_hpa": 978, "wind_kmh": 155, "sea_surface_temp_c": 29.1, "rainfall_mm_24h": 260},
            {"t": "T0", "pressure_hpa": 982, "wind_kmh": 145, "sea_surface_temp_c": 28.7, "rainfall_mm_24h": 190},
        ],
        "notes": "Landfall occurred near the capital 4 hours ago. Pressure has begun rising and winds easing as the system moves offshore to the west.",
    },
    "Kessa": {
        "readings": [
            {"t": "T-12h", "pressure_hpa": 1006, "wind_kmh": 35, "sea_surface_temp_c": 28.2, "rainfall_mm_24h": 5},
            {"t": "T-6h", "pressure_hpa": 1001, "wind_kmh": 55, "sea_surface_temp_c": 28.4, "rainfall_mm_24h": 20},
            {"t": "T0", "pressure_hpa": 994, "wind_kmh": 80, "sea_surface_temp_c": 28.6, "rainfall_mm_24h": 45},
        ],
        "notes": "Pressure falling steadily and wind speed rising over the last 12 hours. No landfall yet. Coastal fishing fleets have been advised to return to harbor.",
    },
    "Averlyn": {
        "readings": [
            {"t": "T-12h", "pressure_hpa": 1012, "wind_kmh": 18, "sea_surface_temp_c": 30.1, "rainfall_mm_24h": 0},
            {"t": "T-6h", "pressure_hpa": 1011, "wind_kmh": 20, "sea_surface_temp_c": 30.6, "rainfall_mm_24h": 0},
            {"t": "T0", "pressure_hpa": 1010, "wind_kmh": 22, "sea_surface_temp_c": 31.2, "rainfall_mm_24h": 0},
        ],
        "notes": "Sky clear, seas calm. The one unusual reading is sea-surface temperature, which is well above seasonal average and has been rising for three straight readings.",
    },
}
