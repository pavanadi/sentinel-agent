# Sentinel dashboard (FS-3 / UI-UX)

Zero build step, plain HTML/CSS/JS. Serve it with any static file server
(needed because `fetch()` of a local JSON file is blocked from `file://`):

```console
$ cd web
$ python3 -m http.server 8000
# open http://localhost:8000
```

## How it works

`app.js` replays a captured run from `data/sample-run.json`: each nation card
types out its narrative and reveals its signal (severity bar, anomaly type,
trend, confidence), then the coordinator verdict banner lights up. This is a
**replay by design** — see `PLAN.md` at the repo root for why the demo should
never depend on a live network call on stage.

## The data contract (agree changes with FS-1 before editing)

`data/sample-run.json` shape:

```json
{
  "prompt": "string",
  "nations": [
    {
      "country": "string",
      "narrative": "string -- the human-readable analysis text",
      "signal": {
        "country": "string",
        "severity": 0.0,
        "anomaly_type": "string",
        "trend_vector": "string",
        "confidence": 0.0,
        "key_evidence": ["string"]
      }
    }
  ],
  "coordinator": {
    "narrative": "string",
    "most_impacted": "string -- must match one of the nations' country values",
    "recommendation": "string"
  }
}
```

This is currently placeholder content written to match the JSON schema in
`agent/agent_app.py`'s prompts. Once FS-1/FS-2 have a real SuperGrid run
working, they'll hand off a real captured transcript in this exact shape (or
tell you how the real shape differs) — swap it into `data/sample-run.json` (or
add `data/real-run.json` and change `DATA_URL` in `app.js`).

## To do (FS-3 + UI-UX)

- [ ] Swap placeholder run for a real captured transcript once available
- [ ] Visual polish pass (spacing, typography, color contrast at a distance —
      test on the venue's projector if possible)
- [ ] Optional: simple map/arrow motif showing the five rivers converging on
      Bangladesh, if time allows
- [ ] Optional stretch: a toggle to pull a live run's events instead of the
      static replay, only if FS-2 exposes a way to read run events and only
      as a fallback-safe addition (replay must still work if this breaks)
