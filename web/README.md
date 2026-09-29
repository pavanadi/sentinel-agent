# Sentinel dashboard (FS-3 / UI-UX)

Zero build step, plain HTML/CSS/JS. Serve it with any static file server
(needed because `fetch()` of a local JSON file is blocked from `file://`):

```console
$ cd web
$ python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk also works: it falls back to a copy
of the run embedded in the page (refreshed automatically by
`scripts/export_transcript.py` when writing `web/data/sample-run.json`).

## How it works

`index.html` is self-contained (no build, no CDN). It replays a captured
SuperGrid run from `data/sample-run.json` -- a **replay by design** (see
`PLAN.md`): never depend on a live network call on stage.

- **Each nation alone**: click a nation; the rest fogs out. Shows its river,
  travel time, narrative, % of its own local danger level, local_alert, what it
  shares (projected inflow by arrival date) and what stays private.
- **Federated**: signals fly to the coordinator, the water arriving on the
  warning date is replayed down each river (leaving on arrival date minus
  `travel_days`), then the verdict: warning date, combined inflow vs threshold,
  per-country stacked contribution, and partial dates marked as lower bounds.
- **Scrubber**: steps through arrival dates in `combined`.
- **Auto demo**: plays the whole story hands-free.
- Test hooks: `?autoplay`, `?view=verdict`, `?view=verdict&date=1`, `?nation=0`.

All numbers come from the run file; animation speeds are illustrative.

## Regenerating the data

```console
$ uv run --no-sync python scripts/export_transcript.py runs/run-<id>.json
```

The narratives are the LLM's text verbatim. The code-computed fields are
recomputed deterministically with `agent.data` / `agent.agent_app` (same
`as_of` and `LOCAL_WINDOW_DAYS` window the run used):

```json
{
  "prompt": "string",
  "as_of": "2026-07-03",
  "downstream": "Bangladesh",
  "threshold_m3s": 44000,
  "nations": [
    {
      "country": "China",
      "narrative": "string",
      "signal": {"country": "China", "severity": 0.78, "anomaly_type": "...", "trend_vector": "...", "confidence": 0.98, "key_evidence": ["..."]},
      "river": "Yarlung Tsangpo",
      "travel_hours": 96,
      "travel_days": 4,
      "pct_of_local_danger": 77.8,
      "local_alert": 0,
      "projected_inflow_m3s": {"2026-07-04": 6709.0}
    }
  ],
  "combined": [
    {"arrival_date": "2026-07-04", "combined_inflow_m3s": 44475, "nations_reporting": 5, "complete": true, "above_danger": true, "by_nation_m3s": {"India": 23244}}
  ],
  "coordinator": {"narrative": "string", "most_impacted": "Bangladesh", "recommendation": "string"}
}
```
