# Sentinel — Federated Cross-Border Cyclone Early Warning

Three fictional coastal nations (Doria, Kessa, Averlyn) sit along a cyclone's
path. Each keeps its raw meteorological sensor data private. Each nation's
agent analyzes only its own data and emits an anonymized risk signal — no raw
data crosses a border. A coordinator agent reasons only over those three
signals (never raw data) to predict which nation will be hit hardest next and
recommends a coordinated response.

No single nation's own signal predicts the outcome — only the federated
combination does.

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

Sentinel's demo scenario is deliberately fictional (Doria/Kessa/Averlyn) — we
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
A tropical cyclone is active in the region. Brief me.
```

## Publish to Flower Hub

```console
$ uv run flwr app publish .
```
