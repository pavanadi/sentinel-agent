# Sentinel — Federated Cross-Border Cyclone Early Warning

Three fictional coastal nations (Doria, Kessa, Averlyn) sit along a cyclone's
path. Each keeps its raw meteorological sensor data private. Each nation's
agent analyzes only its own data and emits an anonymized risk signal — no raw
data crosses a border. A coordinator agent reasons only over those three
signals (never raw data) to predict which nation will be hit hardest next and
recommends a coordinated response.

No single nation's own signal predicts the outcome — only the federated
combination does.

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
