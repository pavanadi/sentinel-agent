# Sentinel — Federated Cross-Border Flood Early Warning

Five fictional upstream nations (Kaldor, Torvia, Brenholt, Veyra, Ostmark)
each monitor one river, and all five rivers converge in the delta nation of
Calderune. Each nation keeps its gauge data private: rainfall, soil moisture,
river levels and history never leave the country. Each nation's agent reports
on its own river and shares exactly one derived number: the flow already in
its river, projected to the day it reaches the delta. A coordinator agent sums
those projections and warns Calderune.

Every upstream nation's own data stays below its local danger level
(`local_alert = 0` on every one of 200 days), yet their combined flow floods
the delta on 46 of those days. No single nation's data shows the flood; only
the federated combination does.

Try it: the default briefing is as of 2026-07-03, and the coordinator warns of a
flood on 2026-07-04 (44,475 m³/s against a 44,000 m³/s threshold). To brief as
of another date, name it in the prompt, e.g. "Brief me as of 2026-08-27".

## Why this matters right now

This isn't a hypothetical failure mode. On August 26, 2026, a glacial lake
outburst flood on the Nepal-Tibet border killed at least 1,451 people in
Nepal (5,745 more missing), plus 43 dead in Tibet — Nepal's deadliest disaster
since the 2015 earthquake. A central factor: China treats Tibetan glacial-lake
and hydrological data as strategically sensitive and does not share it with
Nepal in real time, and Nepali officials have said that withheld data could
have given earlier warning. A new lake has since formed at the same site and
is feared to burst again.

- [2026 Nepal–Tibet floods — Wikipedia](https://en.wikipedia.org/wiki/2026_Nepal%E2%80%93Tibet_floods)
- [UN News: Nepal flooding deaths surpass 900 as needs climb](https://news.un.org/en/story/2026/08/1168233)
- [Al Jazeera: Why Nepal faces another flood threat from a new lake on China border](https://www.aljazeera.com/news/2026/8/28/is-nepal-facing-another-devastating-flood-from-a-new-lake)
- [Stimson Center: Investigating an Emerging Climate Hazard — Transboundary Glacial Floods on the China-Nepal Border](https://www.stimson.org/2025/investigating-an-emerging-climate-hazard-transboundary-glacial-floods-on-the-china-nepal-border/)

Sentinel's demo scenario is deliberately fictional (Kaldor, Torvia, Brenholt, Veyra, Ostmark and Calderune) — we
are not asserting claims about the real, still-unfolding Nepal-Tibet situation
or the countries involved. The fictional scenario exists so we can show the
mechanism (private local analysis -> anonymized signal sharing -> a
coordinator that sees only combined signals, never raw data) clearly and
safely, while being explicit that the underlying failure mode — one party
holding data another party needs, with no trusted way to share it without
exposing sensitive raw information — is real, current, and lethal.

## Setup

This project's `agent/` and `pyproject.toml` are written by hand to match the
official AgentApp template. To avoid drifting from whatever `flwr` version you
have installed, regenerate the template fresh and then copy these files over
it:

```console
$ uvx --from flwr flwr new @flwrlabs/agent
$ cd agent   # the generated project directory
```

Then replace the generated `agent/agent_app.py` with this repo's
`agent/agent_app.py`, add `agent/data.py`, and merge the `[project]` /
`[tool.flwr.app]` sections from this repo's `pyproject.toml` into the
generated one (keep whatever `flwr`/`openai` version bounds `flwr new` wrote,
since those are guaranteed to match your installed `flwr`).

Set `publisher` in `pyproject.toml` to your Flower Hub username before
publishing.

## Run locally / on SuperGrid

```console
$ uv sync
$ uv run flwr build
$ uv run flwr login supergrid
$ uv run flwr chat
```

At the chat prompt:

```text
/load .
Brief me on river conditions for the Calderune delta.
```

## Publish to Flower Hub

```console
$ uv run flwr app publish .
```
