# FS-1 checklist: get agent_app.py running and validate JSON parsing

This uses Flower's **local SuperLink** dev loop, not SuperGrid — no
`flwr login supergrid` needed for this part. Much faster for iterating on
prompts. FS-2 handles the actual SuperGrid/Hub deployment once this is stable.

## 0. Fast path (this repo already builds — verified with flwr 1.39.0)

```console
$ git clone https://github.com/pavanadi/sentinel-agent && cd sentinel-agent
$ uv sync --python 3.11 --no-install-package uv
$ uv run flwr build
```

`--no-install-package uv` skips a 17.5 MB wheel that `flwr` depends on. On
the venue wifi it downloads at ~55 KB/s and `uv sync` times out. You already
have the `uv` binary, so skipping it is harmless. Always use `uv run flwr ...`
from inside the project (not a global/other venv's `flwr`) so the CLI and
SuperLink versions match. If it complains about `VIRTUAL_ENV`, run
`deactivate` first.

If this works, skip step 1.

## 1. Scaffold + merge (only if the fast path fails)

```console
$ uvx --from flwr flwr new @flwrlabs/agent
$ cd agent
# copy in this repo's agent/agent_app.py and agent/data.py, merge the
# [project]/[tool.flwr.app] sections of pyproject.toml (keep flwr/openai
# version bounds that `flwr new` generated)
$ uv sync
$ uv run flwr build   # checkpoint: should report a .fab path with no errors
```

## 2. Get a Flower model API key

This is different from a full SuperGrid login — it's just a key so the local
runtime can reach a model. Get it from your Flower account settings.

## 3. Start local SuperLink (Terminal A, leave running)

```console
$ export FLWR_MODEL_API_KEY="<your-flower-api-key>"
$ uv run flower-superlink --insecure
```

## 4. Add the local connection (one-time)

Add to `~/.flwr/config.toml`:

```toml
[superlink.local-agent]
address = "127.0.0.1:8000"
insecure = true
```

## 5. Chat with the app (Terminal B)

```console
$ export FLWR_CHAT_SUPERLINK=local-agent
$ uv run flwr chat
```

At the prompt:

```text
/load .
A tropical cyclone is active in the region. Brief me.
```

Checkpoint: you should see 4 distinct streamed sections (Doria, Kessa,
Averlyn, then the coordinator), each starting with its bolded header line.

## 6. Validate JSON parsing

Find the run ID (printed by `flwr chat`, or `uv run flwr list local-agent`),
then:

```console
$ uv run flwr log <run-id> local-agent --show
```

This surfaces `agent_app.py`'s `print()` output directly:
- `[Doria] {...}`, `[Kessa] {...}`, `[Averlyn] {...}` — the parsed signal
  dicts. Confirm all three parsed cleanly (no `"anomaly_type": "unparsed"`
  fallback) and the values make sense (severity/confidence in [0,1], sensible
  trend_vector text).
- The final printed block — the coordinator's full text.

If a signal shows the fallback (`"unparsed"`), the model didn't close its
fenced ` ```json ` block correctly — tighten the instructions in
`NATION_INSTRUCTIONS` (e.g. be more explicit that nothing may follow the
closing fence) and re-run.

## 7. Deliberately break it once

Comment out or corrupt one nation's synthetic data / instructions temporarily
to confirm the `except` fallback in `main()` triggers and the run still
completes with a coordinator verdict, instead of failing the whole run. This
is the single most important robustness property for a live demo — a bad
model response from one persona should never kill the other three.

## 8. Declare "stable" and hand off

Once 3 consecutive clean runs produce parseable JSON for all 3 nations and a
coherent coordinator verdict:

1. Reshape one clean captured run (from step 6's `flwr log --show` output)
   into the shape documented in `web/README.md`, and hand it to FS-3 to
   replace the placeholder `web/data/sample-run.json`.
2. Ping FS-2 — this is the trigger to move to SuperGrid (`flwr login
   supergrid`, `flwr app publish .`) and do the real end-to-end run.
3. Push your branch (`fs1/...`), open a PR into `main`.
