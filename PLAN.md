# Sentinel — Team Implementation Plan

Repo: https://github.com/pavanadi/sentinel-agent
Started: 2026-09-29, 12:19pm PDT. Submission reminder: 4:30pm. Demos from 5:15pm.

## Roles and ownership

To avoid merge conflicts under time pressure, each role owns a directory.
Commit directly to short-lived branches (`<name>/<thing>`), open a PR, merge
fast (no formal review needed today — just don't merge on top of a broken
`main`). Pull `main` before you start each new chunk of work.

| Role | Owns | Branch prefix |
|---|---|---|
| FS-1 (Backend/Agent core) | `agent/agent_app.py`, `agent/data.py` — prompt design, JSON signal schema, per-persona robustness | `fs1/` |
| FS-2 (Platform/Deploy) | `pyproject.toml`, build/login/publish/run pipeline, SuperGrid verification, Nebius SuperNode stretch goal | `fs2/` |
| FS-3 (Frontend) | new `web/` directory — dashboard that visualizes the run | `fs3/` |
| UI/UX | Design assets, wireframes, visual language, works pair-style with FS-3 | `uiux/` |
| QA | `tests/`, `docs/test-log.md`, submission checklist, demo rehearsal/backup recording | `qa/` |

## The product, in one paragraph (for anyone who missed context)

Three fictional coastal nations (Doria, Kessa, Averlyn) sit along a cyclone's
path. Each keeps its raw sensor data private. Three agent "personas" inside
one Flower AgentApp each analyze only their own nation's data and emit an
anonymized risk signal (severity, anomaly type, trend, confidence) — no raw
data crosses a border. A fourth "coordinator" persona sees only those three
signals, never raw data, and from the combination alone predicts which nation
gets hit hardest next. Punchline: no single nation's own data predicts the
outcome — only the federated combination does.

## Why there's frontend work at all

Flower Chat (the built-in UI) will show the raw streamed transcript, which is
fine but not visually compelling for a 4-minute stage demo. FS-3 + UI/UX build
a small standalone dashboard that makes the "3 private nations -> 1 shared
verdict" story visually obvious: a map/board with 3 nation cards that light up
as each agent reports, then a highlighted coordinator verdict card. This is
the single highest-leverage thing for the "demo clarity" judging criterion.

For time-safety, the dashboard consumes a **replay** of a captured run (a JSON
transcript file) by default, with a stretch option to also support a live
feed if FS-2 exposes one in time. Never let the demo depend on a live network
call working correctly on stage.

## Hour-by-hour

**12:20–12:45 — Kickoff (all)**
- Everyone clones the repo, reads this file and README.md.
- Confirm roles above, agree on the exact wording of the demo's closing line
  (the "no single nation could have known this alone" punchline) so backend
  prompts and UI copy stay consistent.

**12:45–2:00 — Build block 1**
- FS-1: Get `agent_app.py` running locally end-to-end (`flwr chat`, `/load .`,
  real prompt). Fix JSON parsing against real model output — this is the
  highest-risk piece, start here. Commit early/often to `fs1/agent-core`.
- FS-2: Get the project building (`uv sync`, `flwr build`), get `flwr login
  supergrid` working on a real account, confirm `pyproject.toml` publisher
  field process. Do NOT publish yet — wait for FS-1's app to be stable.
- FS-3 + UI/UX: Agree on the dashboard's visual layout (3 nation cards in a
  row + coordinator verdict banner below). UI/UX produces a quick wireframe
  (paper/Figma/plain HTML mockup — whatever is fastest). FS-3 scaffolds
  `web/` (plain HTML/CSS/JS is fine, no build step needed for a 1-day demo)
  with static placeholder data matching the JSON signal schema FS-1 defined.
- QA: Write `tests/prompts.md` — a list of prompts/edge cases to throw at the
  agent once it's running (normal prompt, empty prompt, prompt in a different
  language, a prompt trying to ask the coordinator to reveal raw nation data
  it shouldn't have — good demo talking point if it correctly refuses).

**2:00–2:15 — Sync (all, 5 min standup)**
Confirm: does `agent_app.py` run cleanly end to end? Is the JSON schema
final? If yes, FS-3 wires the dashboard to real captured output next.

**2:15–3:15 — Build block 2**
- FS-1: Polish prompts based on real output quality. Freeze the JSON schema
  once it's stable — tell FS-3 immediately if it changes.
- FS-2: Once FS-1's app is stable, run `flwr build` + `flwr app publish .` to
  Flower Hub. Verify a real SuperGrid run end-to-end via `flwr chat`. Capture
  one full real transcript (`flwr chat` output or run-event JSON) and hand it
  to FS-3 as the replay data source.
- FS-3 + UI/UX: Wire the dashboard to replay the real captured transcript
  (typed-out streaming effect per nation card, then the verdict banner).
  Polish visuals — color-code severity, simple line/arrow showing storm
  movement across the 3 cards.
- QA: Run the prompt list from block 1 against the real running app as soon
  as FS-1/FS-2 have it live. Log pass/fail + weird outputs in
  `docs/test-log.md`. Flag anything that would embarrass the team on stage.

**3:15–3:30 — Buffer / lunch**

**3:30–4:00 — Build block 3 (polish + integration)**
- FS-1 + FS-2: Fix anything QA flagged. Re-run and re-capture a clean final
  transcript if prompts changed.
- FS-3 + UI/UX: Final visual polish, make sure it works on the venue's
  projector resolution/aspect ratio if known.
- QA: Full clean-checkout test — clone the repo fresh into a new folder,
  follow README.md exactly, confirm a new person could get it running. This
  is the single most common hackathon-demo failure mode (works on one
  laptop, breaks on the demo laptop).

**4:00–4:30 — Submission (QA drives, all available)**
- Publish final AgentApp version to Flower Hub if not already done.
- Push everything to `main`, tag the commit used for the demo (e.g.
  `git tag demo-final`).
- Fill team registration form, project description, confirm GitHub repo link
  is correct and public, submit before 4:30 reminder.
- QA records a full backup demo video NOW, before the room gets busy —
  insurance against wifi/projector/live-model failure on stage.

**4:30–5:15 — Rehearse**
- Full run-through of the 3–5 minute demo, twice. Confirm who says what.
  Suggested split: FS-1 opens with the problem/architecture (30s), UI/UX or
  FS-3 drives the live dashboard demo (2 min), FS-2 covers the Flower/
  SuperGrid technical integration (30s), someone closes with the punchline
  and impact statement (30s).
- QA times it and flags anything over 4:30.

**5:15+ — Present**

## Git workflow

```console
$ git clone https://github.com/pavanadi/sentinel-agent
$ git checkout -b <yourprefix>/<short-description>
# ... work, commit often ...
$ git push -u origin <yourprefix>/<short-description>
$ gh pr create --fill   # or just merge directly if things are moving fast
```

Pull `main` before starting a new task block to avoid stacking conflicts.
Whoever finishes block 1 first in each area should ping the group rather than
sit on unpushed work — nobody should be blocked more than ~15 minutes waiting
on another branch to land.

## Submission checklist (own this, QA)

- [ ] Team registration form
- [ ] App published on Flower Hub
- [ ] Project description written
- [ ] GitHub repo link (public): https://github.com/pavanadi/sentinel-agent
- [ ] Backup demo recording saved somewhere everyone can access if wifi dies
