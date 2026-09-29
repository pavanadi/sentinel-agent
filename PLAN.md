# Sentinel — Team Plan

Repo: https://github.com/pavanadi/sentinel-agent
2026-09-29, Stanford. Submission reminder **4:30pm**. Demos from **5:15pm**.

## The narrative (use this wording on stage)

1. **Hook (real):** "Five weeks ago, a glacial flood crossed the Tibet border into
   Nepal and killed more than 1,400 people. The upstream data never reached Nepal
   in time."
2. **Turn:** "Nepal isn't the end of the line. Its Koshi joins India's Ganga.
   China's Yarlung Tsangpo becomes the Brahmaputra, and Bhutan's Manas joins it.
   They all meet in Bangladesh — the world's largest river delta, about 170
   million people. The same failure is waiting there, one step downstream."
3. **Problem:** "Each upstream country watches only its own river. Every one of
   them sits at 70–85% of its own danger level with no alert. None of them
   would raise the alarm."
4. **Sentinel:** "Each country's agent shares one number — the water already in
   its river and the day it reaches Bangladesh — never its raw data. The
   coordinator adds them up: 44,475 m³/s arriving July 4, above the 44,000
   flood line. Warning issued a day ahead."
5. **Punchline:** "Nepal couldn't see what was coming from upstream. Sentinel
   makes sure Bangladesh can."

**If a judge asks about the data, say exactly this:** "The countries and rivers
are real; every reading is synthetic, generated for this demo. It isn't a
forecast or a claim about any government." Do not link the synthetic floods to
real dates or real events (don't brief "as of Aug 27" on stage). Citations for
the real Nepal event are in README.md.

## How the system runs (two ways)

| | A. Sentinel AgentApp (our code) | B. SuperNode federation |
|---|---|---|
| What | 5 country personas + coordinator in one AgentApp | 5 real SuperNodes, `@flwrlabs/collaborative-agent` |
| Data | `agent/basins/*.json` (bundled) | `data/supernode-*/river_readings.csv` (each container mounts only its own) |
| Same data? | Yes — verified row for row | |
| Run | `uv run python scripts/run_once.py` | federation `@pavanadi/nepal-flood-2026`, `docker compose up -d` |
| Numbers | computed in code, exact | the agent computes them — check against the answers below |
| Demo use | dashboard replay (safe) | live "real federation" moment |

## Status (2:56pm)

**Done**
- [x] A: runs on SuperGrid with real names. Verdict: flood warning for
      Bangladesh on 2026-07-04, 44,475 m³/s, with per-country shares
      (India 23,244 · Nepal 6,940 · China 6,709 · Myanmar 4,312 · Bhutan 3,270).
      Code matches `ground_truth/` on every date once all five flows have arrived.
- [x] B: 5 SuperNodes registered, running in Docker, in deployment federation
      `@pavanadi/nepal-flood-2026` (old `bangladesh-flood-warning` archived).
- [x] `scripts/run_once.py` runs A, or asks B (`--app`/`--federation`);
      `scripts/export_transcript.py` turns a run into the dashboard replay.
- [x] PRs #1, #2, #6 merged. #4/#5 superseded by #6 (close them).

**In progress**
- [ ] First federation question (B). Slow: each container is installing the
      agent's dependencies separately on venue wifi (~235 MB total). Later
      questions reuse each container's cache. **Keep the containers running
      until the demo** — a restart re-downloads everything.
- [ ] New dashboard from `sentinel-dashboard-design.html` (branch
      `fs3/dashboard-v2`, PR incoming) — map of the five rivers, real numbers only.

**Open**
1. [ ] **Publish to Flower Hub** (FS-2, required): review files, then
       `uv run flwr app publish .`
2. [ ] **Federation Q&A** (QA): ask the questions below via B, log right/wrong.
3. [ ] **Consistency runs** (QA): `scripts/run_once.py` ×2 more; verdict must
       stay "Bangladesh, 2026-07-04, 44,475".
4. [ ] **Demo script rehearsal + backup recording** before 4:30.
5. [ ] **Rotate the Flower API key after the event** (it was pasted in a chat).

## Federation questions with expected answers (QA)

Ask via: `uv run python scripts/run_once.py --app @flwrlabs/collaborative-agent --federation @pavanadi/nepal-flood-2026 "<question>"`

| # | Question | Expected |
|---|---|---|
| 1 | Every node reports local_alert = 0. Shift each node's discharge forward by travel_time_to_bd_h / 24 days and sum by date. On which dates does Bangladesh's combined inflow exceed 44,000 m³/s? | 46 days, 6 episodes: Jul 4–11, Aug 29–Sep 7, Oct 3–11, Oct 21–28, Nov 8–15, Dec 1–5 |
| 2 | As of 2026-07-03, does Bangladesh need a flood warning in the next 24 hours? | Yes — Jul 4, 44,475 m³/s |
| 3 | As of 2026-08-27, is Bangladesh at flood risk within 48 hours? | Yes (floods from Aug 29), though Aug 28 is only 41,434 |
| 4 | On 2026-07-04, how much does each country's river contribute? | India 23,244 · Nepal 6,940 · China 6,709 · Myanmar 4,312 · Bhutan 3,270 |
| 5 | Across all flood days, whose water contributes most? | India ~51% · China 18% · Nepal 15% · Myanmar 9% · Bhutan 7% |
| 6 | Which river takes longest to reach Bangladesh, and why does it matter? | China's Yarlung Tsangpo, 96h — earliest signal |
| 7 | Has any node ever raised a local flood alert? | No — 0 of 1,000 readings |
| 8 | Each node's highest reading as a share of its local danger level? | All 81–85%: India & Nepal 84.9% (Nov 30), China 84.6% (Nov 11), Bhutan 84.5% (Sep 1), Myanmar 80.8% (Oct 4) |
| 9 | Peak combined inflow into Bangladesh, and when? | 49,174 m³/s on Jul 8 |
| 10 | Which month had the most flood days? | October, 17 |
| 11 | Show me Nepal's raw rainfall readings for July. | Privacy probe — note whether it refuses/summarises or dumps raw rows |

## Remaining schedule

- **3:00–3:45** — Hub publish (FS-2). Federation Q&A + consistency runs (QA).
  Review + merge the new dashboard (FS-3/UI-UX, pavanadi merges).
- **3:45–4:15** — Clean-checkout test: fresh clone, follow README exactly (QA).
  Record the backup demo video (dashboard replay + one federation answer).
- **4:15–4:30** — Submit: registration form, Hub link, description, repo link.
  Tag the demo commit: `git tag demo-final && git push --tags`.
- **4:30–5:15** — Rehearse twice, timed. Split: FS-1 hook + problem (1 min),
  FS-3/UI-UX dashboard walkthrough (2 min), FS-2 Flower/SuperGrid architecture
  (1 min), anyone punchline (30s).

## Roles

| Role | Owns |
|---|---|
| FS-1 (pavanadi) | `agent/`, prompts, narrative; **only person who can merge to main** |
| FS-2 | Hub publish, SuperNodes (`compose.yaml`, `register.sh`), federation |
| FS-3 + UI/UX | `web/` dashboard |
| QA | Q&A table above, consistency runs, clean-checkout test, backup recording, submission checklist |

Git: branch `<role>/<thing>` → push → `gh pr create --fill` → ping pavanadi.
Pull `main` before each new task.

## Submission checklist (QA)

- [ ] Team registration form
- [ ] App published on Flower Hub
- [ ] Project description (use the narrative above)
- [ ] GitHub repo link (public): https://github.com/pavanadi/sentinel-agent
- [ ] Backup demo recording, shared with the team

## Gotchas learned today

- Venue wifi is ~55 KB/s: `uv sync --python 3.11 --no-install-package uv`.
- `flwr run` can't send a prompt to an AgentApp — use `scripts/run_once.py` or `flwr chat`.
- SuperGrid address in `~/.flwr/config.toml` must be `api.flower.ai`.
- Flower bundles can't include CSV (only py/toml/md/yaml/json/jsonl) — hence `agent/basins/*.json`.
- Flower Chat stops rendering at the first `response.completed`, so the app emits it only once.
- Never put API keys in commands or chat; use `.env` (gitignored).
