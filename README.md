# Transboundary Flood Warning - Flower Collaborative Agent (SuperGrid)

Five upstream SuperNodes each hold river data. The agent combines their delayed flow to determine whether Bangladesh is at flood risk.

| SuperNode | Key | Data |
| --- | --- | --- |
| Nepal - Koshi | `supernode-0` | `data/supernode-nepal/river_readings.csv` |
| India - Ganga | `supernode-1` | `data/supernode-india/river_readings.csv` |
| China - Yarlung Tsangpo | `supernode-2` | `data/supernode-china/river_readings.csv` |
| Bhutan - Manas | `supernode-3` | `data/supernode-bhutan/river_readings.csv` |
| Myanmar - Barak/Meghna | `supernode-4` | `data/supernode-myanmar/river_readings.csv` |

`ground_truth/` is for judging only. Do not mount it on any SuperNode.

## Run the SuperNodes

You need a Flower account with SuperGrid access, Docker Desktop, and `uvx`.

```shell
./register.sh
export FLWR_MODEL_API_KEY="your-flower-api-key"
docker compose up
```

The registration script logs in to SuperGrid, creates five local key pairs, and registers the five SuperNodes. The Compose file mounts each country's data directory into its matching container. Private keys are stored in `keys/`, which is ignored by Git.

On flower.ai:

1. Create a federation of type **deployment**.
2. Add the five registered SuperNodes to it.
3. Run `@flwrlabs/collaborative-agent` on that federation.

## Agent prompt

```text
Each node holds daily river readings with the fields discharge_m3s,
travel_time_to_bd_h, and date.

Shift each node's discharge forward by travel_time_to_bd_h / 24 days,
then sum the shifted values across all nodes by date.

Bangladesh floods when combined inflow is above 44,000 m3/s.
Which dates need a warning, even though every node reports local_alert = 0?
```

Compare the agent's answer with `ground_truth/bangladesh_combined.csv` using the `bd_flooded` column.
