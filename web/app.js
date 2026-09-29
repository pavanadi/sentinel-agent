/**
 * Sentinel dashboard -- replays a captured run (web/data/sample-run.json) as
 * a typed-out sequence: each nation reports in turn, then the coordinator's
 * verdict lights up. This is a REPLAY by design (see PLAN.md) so the demo
 * never depends on a live network call on stage.
 *
 * To point this at a different captured transcript, change DATA_URL below.
 * The expected JSON shape is documented in web/data/sample-run.json --
 * treat that shape as the contract between FS-1 (produces real transcripts)
 * and FS-3 (renders them). If FS-1 changes the agent's output schema,
 * update the mapping in renderNationCard()/renderVerdict() accordingly.
 */

const DATA_URL = "data/sample-run.json";
const TYPE_SPEED_MS = 12; // per character
const PAUSE_BETWEEN_NATIONS_MS = 400;

const nationsEl = document.getElementById("nations");
const verdictEl = document.getElementById("verdict");
const verdictBodyEl = document.getElementById("verdict-body");
const replayBtn = document.getElementById("replay-btn");

let running = false;

async function loadRun() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  return res.json();
}

function severityClass(severity) {
  if (severity >= 0.66) return "high";
  if (severity >= 0.34) return "mid";
  return "low";
}

function buildNationCard(nation) {
  const card = document.createElement("article");
  card.className = "nation-card";
  card.innerHTML = `
    <div class="name">${nation.country}</div>
    <span class="private-tag">private local data -- not shared</span>
    <div class="narrative"><span class="typed"></span><span class="cursor"></span></div>
    <div class="signal">
      <div class="signal-row"><span>Anomaly</span><strong>${nation.signal.anomaly_type}</strong></div>
      <div class="signal-row"><span>Trend</span><strong>${nation.signal.trend_vector}</strong></div>
      <div class="severity-bar"><div class="severity-bar-fill ${severityClass(nation.signal.severity)}"></div></div>
      <div class="signal-row"><span>Confidence</span><strong>${Math.round(nation.signal.confidence * 100)}%</strong></div>
    </div>
  `;
  return card;
}

function typeText(el, text) {
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => {
      el.textContent = text.slice(0, i);
      i += 1;
      if (i > text.length) {
        clearInterval(timer);
        resolve();
      }
    }, TYPE_SPEED_MS);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runReplay(run) {
  nationsEl.innerHTML = "";
  verdictEl.classList.remove("active");
  verdictBodyEl.innerHTML = '<p class="placeholder">Waiting for all nation reports...</p>';

  const cards = [];
  for (const nation of run.nations) {
    const card = buildNationCard(nation);
    nationsEl.appendChild(card);
    cards.push(card);
    // eslint-disable-next-line no-await-in-loop
    await sleep(50);
    card.classList.add("active");
    const typedEl = card.querySelector(".typed");
    // eslint-disable-next-line no-await-in-loop
    await typeText(typedEl, nation.narrative);
    card.querySelector(".severity-bar-fill").style.width = `${Math.round(nation.signal.severity * 100)}%`;
    card.classList.add("done");
    // eslint-disable-next-line no-await-in-loop
    await sleep(PAUSE_BETWEEN_NATIONS_MS);
  }

  await sleep(300);
  verdictEl.classList.add("active");
  const c = run.coordinator;
  verdictBodyEl.innerHTML = `
    <span class="most-impacted">Flood warning: ${c.most_impacted}</span>
    <p class="narrative"><span class="typed-verdict"></span></p>
    <p class="recommendation">${c.recommendation}</p>
  `;
  await typeText(verdictBodyEl.querySelector(".typed-verdict"), c.narrative);
}

async function start() {
  if (running) return;
  running = true;
  replayBtn.disabled = true;
  try {
    const run = await loadRun();
    await runReplay(run);
  } catch (err) {
    verdictBodyEl.innerHTML = `<p class="placeholder">Could not load run data: ${err.message}</p>`;
  } finally {
    running = false;
    replayBtn.disabled = false;
  }
}

replayBtn.addEventListener("click", start);
start();
