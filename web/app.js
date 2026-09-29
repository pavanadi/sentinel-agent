// Copy of sample-run.json for opening index.html straight from disk.
// Only used when fetch() of the JSON fails. Keep in sync if you change the sample.
window.SENTINEL_FALLBACK_RUN = {
  "prompt": "A tropical cyclone is active in the region. Brief me.",
  "nations": [
    {
      "country": "Doria",
      "narrative": "Landfall occurred near the capital four hours ago. Pressure has begun rising and winds easing as the system moves offshore to the west. Rainfall totals remain high but are trending down from their peak. Coastal damage assessments are underway; the immediate danger here is receding.",
      "signal": {
        "country": "Doria",
        "severity": 0.55,
        "anomaly_type": "post-landfall weakening system",
        "trend_vector": "pressure rising, wind easing, moving west",
        "confidence": 0.82,
        "key_evidence": [
          "Pressure has started to rise",
          "Wind speed is easing after landfall"
        ]
      }
    },
    {
      "country": "Kessa",
      "narrative": "No landfall yet, but pressure has fallen steadily and wind speed has more than doubled over the last twelve hours. Coastal fishing fleets have been advised to return to harbor. Conditions are consistent with an approaching system rather than a departing one.",
      "signal": {
        "country": "Kessa",
        "severity": 0.68,
        "anomaly_type": "intensifying approach",
        "trend_vector": "pressure falling, wind rising sharply",
        "confidence": 0.79,
        "key_evidence": [
          "Pressure has fallen steadily",
          "Wind speed has risen sharply over the same window"
        ]
      }
    },
    {
      "country": "Averlyn",
      "narrative": "Skies are clear and seas are calm. The one unusual reading is sea-surface temperature, which is well above seasonal average and has been rising for three consecutive readings. No other indicators are currently elevated.",
      "signal": {
        "country": "Averlyn",
        "severity": 0.22,
        "anomaly_type": "anomalous sea-surface warming",
        "trend_vector": "sea-surface temperature rising, all else calm",
        "confidence": 0.65,
        "key_evidence": [
          "Sea-surface temperature has risen for several readings",
          "No pressure or wind anomaly detected locally"
        ]
      }
    }
  ],
  "coordinator": {
    "narrative": "Doria's own data suggests the danger there is receding, and Kessa's data alone suggests a moderate approaching storm. Neither nation's own signal points to Averlyn as the greatest concern. But combined, the pattern is clear: the system is moving west along the same track as Doria-to-Kessa, and Averlyn sits directly ahead of it over water that is anomalously warm and still warming -- the exact condition that lets a weakening system re-intensify. No single nation's own signal shows this; it only emerges from comparing all three.",
    "most_impacted": "Averlyn",
    "recommendation": "Averlyn should activate coastal preparedness now, not wait for local conditions to change. Kessa should share its next sensor reading with Averlyn as soon as it's available, since Kessa's trend is the earliest confirmation of the storm's continued westward track."
  }
};


/**
 * Sentinel dashboard: an interactive map of the federated cyclone demo.
 *
 * What you can do on the page
 *   - "Each nation alone": click a nation. Everything else fades into fog,
 *     because a single nation only ever sees its own analysis.
 *   - "Federated" (or the Combine button): the three anonymized signals fly to
 *     the coordinator, the storm track appears, and the verdict is revealed.
 *   - Drag the slider to move the storm along the coordinator's projected track.
 *   - "Auto demo" plays the whole story hands-free (good backup on stage).
 *
 * Data: a REPLAY of a captured run (see PLAN.md: never depend on a live network
 * call on stage). The contract is documented in web/README.md. Nothing here is
 * computed by the browser: every number and sentence comes from the run file.
 * Optional field: run.solo = [{country, predicted_next, confidence}] shows what
 * each signal predicts on its own.
 *
 * Map positions are assigned by index (0, 1, 2 = first, second, third nation in
 * the file), so real runs with different country names still render.
 */

"use strict";

const DATA_URL = "data/sample-run.json";
const NS = "http://www.w3.org/2000/svg";
const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// Storm moves along the track in index.html (#track); it stops near the north-east
// coast of each nation so it never covers the labels. TRACK_SEG1 is the leg to slot 1.
const TRACK_SEG1 = "M 862 132 C 790 152 650 205 564 248";
const SLOTS = [
  {
    cx: 800, cy: 168, rx: 132, ry: 98,
    land: "M 690 150 C 700 105 760 80 820 90 C 880 98 920 130 915 175 C 910 220 860 245 800 240 C 740 236 680 200 690 150 Z",
    islets: [[935, 112, 9], [700, 250, 7]],
  },
  {
    cx: 502, cy: 284, rx: 132, ry: 94,
    land: "M 395 280 C 400 235 450 210 505 215 C 565 220 615 245 610 290 C 605 335 560 355 500 352 C 440 350 390 325 395 280 Z",
    islets: [[648, 338, 9], [372, 232, 7], [560, 392, 6]],
  },
  {
    cx: 226, cy: 395, rx: 132, ry: 94,
    land: "M 120 400 C 118 350 170 320 230 322 C 290 324 335 355 330 400 C 325 445 275 470 220 467 C 165 464 122 445 120 400 Z",
    islets: [[362, 340, 8], [96, 476, 10]],
  },
];
const HUB = { x: 170, y: 118 };
const RAW_KINDS = "pressure, wind, sea temperature, rainfall, buoy and radar coverage";

// ---------------------------------------------------------------- helpers
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 30) : ms));
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const pct = (x) => Math.round(Number(x) * 100);

function svgEl(tag, attrs, parent, text) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  if (text !== undefined) el.textContent = text;
  if (parent) parent.appendChild(el);
  return el;
}

function typeInto(el, text) {
  if (!el) return Promise.resolve();
  if (fast()) { el.textContent = text; return Promise.resolve(); }
  clearInterval(el._timer);
  return new Promise((resolve) => {
    let i = 0;
    el._timer = setInterval(() => {
      if (!el.isConnected) { clearInterval(el._timer); resolve(); return; }
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(el._timer); resolve(); }
    }, 12);
  });
}

// ---------------------------------------------------------------- state
const state = {
  run: null,
  mode: "solo",      // "solo" | "fed"
  selected: null,    // index of the nation being inspected
  received: 0,       // signals that have reached the coordinator
  fedDone: false,
  busy: false,
  token: 0,          // bump to cancel any running animation
  stormT: 0,
  view: "intro",
  instant: false,    // skip navigation animations (repeat visit via a mode tab)
};

const seen = { solo: false, fed: false, nations: new Set() };
const fast = () => REDUCED || state.instant;

function setInstant(on) {
  state.instant = on;
  document.body.classList.toggle("instant", on);
}

let nations = [];    // { g, halo, status }
let links = [];      // link paths nation -> hub
let hub = {};
let track = { total: 1, stops: [0, 0.5, 1] };
let tickEls = [];

const map = () => $("map");

function sevClass(s) {
  if (typeof s !== "number") return "none";
  if (s >= 0.66) return "high";
  if (s >= 0.34) return "mid";
  return "low";
}
const signalOf = (i) => state.run.nations[i].signal || {};
const hasSignal = (i) => typeof signalOf(i).severity === "number" && signalOf(i).status !== "unavailable";
const nameOf = (i) => state.run.nations[i].country;

function mostImpactedIdx() {
  const want = String(state.run.coordinator.most_impacted || "").toLowerCase();
  const i = state.run.nations.findIndex((n) => String(n.country).toLowerCase() === want);
  return i < 0 ? state.run.nations.length - 1 : i;
}

// ---------------------------------------------------------------- data
async function loadRun() {
  // Opened by double-click (file://): browsers block fetch(), so use the embedded copy.
  if (location.protocol === "file:" && window.SENTINEL_FALLBACK_RUN) {
    return { run: window.SENTINEL_FALLBACK_RUN, source: "embedded" };
  }
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { run: await res.json(), source: "file" };
  } catch (err) {
    if (window.SENTINEL_FALLBACK_RUN) return { run: window.SENTINEL_FALLBACK_RUN, source: "embedded" };
    throw err;
  }
}

// ---------------------------------------------------------------- map building
function buildMap() {
  const layer = $("nations-layer");
  layer.innerHTML = "";
  nations = state.run.nations.map((n, i) => {
    const s = SLOTS[i];
    const g = svgEl("g", {
      class: "nation", tabindex: "0", role: "button", "data-i": i,
      "aria-label": `${n.country}: show its private analysis`,
    }, layer);
    const halo = svgEl("circle", { class: "halo", cx: s.cx, cy: s.cy, r: 110, fill: "url(#halo-none)" }, g);
    svgEl("ellipse", { class: "ring", cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry }, g);
    svgEl("path", { class: "land", d: s.land }, g);
    s.islets.forEach(([x, y, r]) => svgEl("circle", { class: "islet", cx: x, cy: y, r }, g));
    svgEl("circle", { class: "impact-ring", cx: s.cx, cy: s.cy, r: 80 }, g);
    svgEl("circle", { class: "impact-ring b", cx: s.cx, cy: s.cy, r: 80 }, g);
    const lock = svgEl("g", { class: "lock", transform: `translate(${s.cx} ${s.cy - 34})` }, g);
    svgEl("rect", { x: -8, y: -3, width: 16, height: 12, rx: 2.5 }, lock);
    svgEl("path", { d: "M-5 -3 v-4 a5 5 0 0 1 10 0 v4" }, lock);
    svgEl("text", { class: "name", x: s.cx, y: s.cy + 6 }, g, n.country);
    const status = svgEl("text", { class: "status", x: s.cx, y: s.cy + 30 }, g, "private data");
    svgEl("text", { class: "qmark", x: s.cx, y: s.cy + 22 }, g, "?");
    g.addEventListener("click", () => onNation(i));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNation(i); }
    });
    return { g, halo, status };
  });

  // links nation -> coordinator hub
  const linkLayer = $("links-layer");
  linkLayer.innerHTML = "";
  links = SLOTS.slice(0, nations.length).map((s) => {
    const dx = HUB.x - s.cx, dy = HUB.y - s.cy, len = Math.hypot(dx, dy);
    const mx = (s.cx + HUB.x) / 2 - (dy / len) * 50, my = (s.cy + HUB.y) / 2 + (dx / len) * 50;
    return svgEl("path", { class: "link", d: `M ${s.cx} ${s.cy} Q ${mx} ${my} ${HUB.x} ${HUB.y}` }, linkLayer);
  });

  // coordinator hub
  const hubLayer = $("hub-layer");
  hubLayer.innerHTML = "";
  const g = svgEl("g", { class: "hub", transform: `translate(${HUB.x} ${HUB.y})` }, hubLayer);
  svgEl("circle", { class: "hub-glow", r: 74 }, g);
  svgEl("circle", { class: "hub-ring", r: 46 }, g);
  svgEl("circle", { class: "hub-core", r: 32 }, g);
  const count = svgEl("text", { class: "hub-count", y: 6 }, g, `0/${nations.length}`);
  svgEl("text", { class: "hub-label", y: 68 }, g, "Regional Coordinator");
  svgEl("text", { class: "hub-sub", y: 86 }, g, "sees signals only");
  hub = { g, count };
}

function buildStorm() {
  const arms = $("storm-arms");
  arms.innerHTML = "";
  for (let k = 0; k < 3; k += 1) {
    let d = "";
    for (let a = 0.2; a <= 5.2; a += 0.15) {
      const r = 3 + 4.4 * a, th = a + (k * 2 * Math.PI) / 3;
      d += `${d ? " L " : "M "}${(r * Math.cos(th)).toFixed(1)} ${(r * Math.sin(th)).toFixed(1)}`;
    }
    svgEl("path", { d }, arms);
  }
}

function measureTrack() {
  const path = $("track");
  const total = path.getTotalLength();
  const tmp = svgEl("path", { d: TRACK_SEG1, visibility: "hidden" }, $("track-layer"));
  const seg1 = tmp.getTotalLength();
  tmp.remove();
  track = { total, stops: [0, seg1, total] };

  const ticks = $("ticks");
  ticks.innerHTML = "";
  tickEls = nations.map((_, i) => {
    const span = document.createElement("span");
    span.style.left = `${(track.stops[i] / total) * 100}%`;
    span.textContent = nameOf(i);
    ticks.appendChild(span);
    return span;
  });
}

// ---------------------------------------------------------------- storm
function updateStorm(t) {
  state.stormT = t;
  const L = track.total * t;
  const p = $("track").getPointAtLength(L);
  $("storm").setAttribute("transform", `translate(${p.x} ${p.y})`);
  $("track-done").style.strokeDasharray = `${L} ${track.total + 10}`;
  $("scrub").value = Math.round(t * 1000);
  nations.forEach((n, i) => {
    const near = Math.abs(track.stops[i] - L) < track.total * 0.07;
    n.g.classList.toggle("near", near && state.mode === "fed" && map().classList.contains("storm-on"));
    tickEls[i].classList.toggle("near", near && map().classList.contains("storm-on"));
  });
}

function animateStorm(from, to, ms, alive) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const D = REDUCED ? 10 : ms;
    const step = (now) => {
      if (!alive()) { resolve(); return; }
      const p = Math.min(1, (now - t0) / D);
      updateStorm(from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

function flyPacket(i, alive) {
  const path = links[i];
  const L = path.getTotalLength();
  const dot = svgEl("g", { class: "packet" }, $("packets-layer"));
  svgEl("circle", { class: "pulse", r: 13 }, dot);
  svgEl("circle", { r: 6 }, dot);
  return new Promise((resolve) => {
    const t0 = performance.now();
    const D = REDUCED ? 10 : 1100;
    const step = (now) => {
      if (!alive()) { dot.remove(); resolve(); return; }
      const p = Math.min(1, (now - t0) / D);
      const pt = path.getPointAtLength(L * ease(p));
      dot.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      if (p < 1) requestAnimationFrame(step); else { dot.remove(); resolve(); }
    };
    requestAnimationFrame(step);
  });
}

// ---------------------------------------------------------------- map state
function revealNation(i, on) {
  const n = nations[i];
  n.g.classList.toggle("revealed", on);
  if (!on) { n.status.textContent = "private data"; return; }
  const s = signalOf(i);
  const ok = hasSignal(i);
  n.halo.setAttribute("r", String(70 + 95 * (ok ? s.severity : 0.3)));
  n.halo.setAttribute("fill", `url(#halo-${sevClass(ok ? s.severity : undefined)})`);
  n.status.textContent = ok ? `${pct(s.severity)}% risk` : "no signal";
}

function captionText() {
  if (state.mode === "solo") {
    return state.selected === null
      ? "Each nation sees only its own sensors. Click one to see what it knows."
      : `Viewing ${nameOf(state.selected)}'s private analysis. It cannot see the other two nations.`;
  }
  if (!state.fedDone) return "Anonymized signals are travelling to the coordinator...";
  return state.selected === null
    ? "Coordinator view: three anonymized signals, combined."
    : `${nameOf(state.selected)}'s signal, as the coordinator received it.`;
}

function applyMap() {
  const fed = state.mode === "fed";
  nations.forEach((n, i) => {
    n.g.classList.toggle("selected", state.selected === i);
    n.g.classList.toggle("fogged", !fed && state.selected !== null && state.selected !== i);
    if (!fed) revealNation(i, state.selected === i);
  });
  $("caption").textContent = captionText();
  $("mode-solo").setAttribute("aria-selected", String(!fed));
  $("mode-fed").setAttribute("aria-selected", String(fed));
}

function resetVisuals() {
  map().classList.remove("fed", "storm-on");
  $("packets-layer").innerHTML = "";
  hub.g.classList.remove("on");
  hub.count.textContent = `0/${nations.length}`;
  nations.forEach((n, i) => {
    n.g.classList.remove("impact", "near", "sending", "selected", "fogged");
    revealNation(i, false);
  });
  $("scrub").disabled = true;
  $("scrubber").classList.remove("on");
  updateStorm(0);
}

// ---------------------------------------------------------------- flows
function toSolo() {
  state.token += 1;
  state.busy = false;
  state.mode = "solo";
  state.selected = null;
  state.fedDone = false;
  state.received = 0;
  resetVisuals();
  applyMap();
  renderPanel();
  seen.solo = true;
}

async function combine() {
  if (state.busy) return;
  state.token += 1;
  const my = state.token;
  const alive = () => my === state.token;
  resetVisuals();
  state.mode = "fed";
  state.selected = null;
  state.fedDone = false;
  state.received = 0;
  map().classList.add("fed");
  if (state.instant) { finishFed(); return; }
  state.busy = true;
  applyMap();
  renderPanel();

  await sleep(350);
  if (!alive()) return;
  for (let i = 0; i < nations.length; i += 1) {
    nations[i].g.classList.add("sending");
    await flyPacket(i, alive);
    if (!alive()) return;
    nations[i].g.classList.remove("sending");
    revealNation(i, true);
    state.received += 1;
    hub.count.textContent = `${state.received}/${nations.length}`;
    const row = $(`prog-${i}`);
    if (row) { row.classList.add("done"); row.querySelector(".mark").textContent = "✓"; }
    await sleep(280);
    if (!alive()) return;
  }
  hub.g.classList.add("on");
  await sleep(600);
  if (!alive()) return;

  map().classList.add("storm-on");
  $("scrubber").classList.add("on");
  $("scrub").disabled = false;
  updateStorm(0);
  await sleep(500);
  if (!alive()) return;

  const mi = mostImpactedIdx();
  await animateStorm(0, track.stops[mi] / track.total, 3400, alive);
  if (!alive()) return;
  finishFed();
}

function finishFed() {
  nations.forEach((_, i) => revealNation(i, true));
  state.received = nations.length;
  hub.count.textContent = `${nations.length}/${nations.length}`;
  hub.g.classList.add("on");
  map().classList.add("storm-on");
  $("scrubber").classList.add("on");
  $("scrub").disabled = false;
  const mi = mostImpactedIdx();
  updateStorm(track.stops[mi] / track.total);
  nations[mi].g.classList.add("impact");
  state.fedDone = true;
  seen.fed = true;
  state.busy = false;
  applyMap();
  renderPanel();
}

async function autoDemo() {
  toSolo();
  const my = state.token;
  await sleep(600);
  for (let i = 0; i < nations.length; i += 1) {
    if (my !== state.token) return;
    state.selected = i;
    applyMap();
    renderPanel();
    await sleep(3600);
  }
  if (my !== state.token) return;
  state.selected = null;
  applyMap();
  await combine();
}

function onNation(i) {
  if (state.busy) return;
  state.token += 1; // a manual click cancels a running auto demo
  state.selected = state.selected === i ? null : i;
  // Each card animates only on its first open; closing returns to an already-seen view.
  setInstant(state.selected === null || seen.nations.has(i));
  if (state.selected !== null) seen.nations.add(i);
  applyMap();
  renderPanel();
}

// ---------------------------------------------------------------- panel views
function chip(i, withRisk) {
  const s = signalOf(i);
  const cls = withRisk ? sevClass(s.severity) : "";
  const risk = withRisk && hasSignal(i) ? ` <small>${pct(s.severity)}%</small>` : "";
  return `<button class="chip ${cls}" type="button" data-nation="${i}"><i></i>${esc(nameOf(i))}${risk}</button>`;
}

function introView() {
  return `
    <h2>Three nations. Three private views.</h2>
    <p class="lead">Each nation's agent reads only its own sensors and shares one small, anonymized signal.
      Click a nation on the map to see what it can know on its own.</p>
    <div class="chips">${nations.map((_, i) => chip(i, false)).join("")}</div>
    <p class="hint">Then combine the signals and watch what the coordinator can see that no single nation can.</p>
    <div class="btn-row"><button class="btn" type="button" data-action="combine">Combine signals &rarr;</button></div>`;
}

function meter(label, value, cls) {
  return `<div class="meter"><span>${label}</span><div class="bar"><i class="${cls}" data-w="${pct(value)}"></i></div><b>${pct(value)}%</b></div>`;
}

function nationView(i) {
  const n = state.run.nations[i];
  const s = signalOf(i);
  const ok = hasSignal(i);
  const evidence = (s.key_evidence || []).filter((e) => typeof e === "string" && !/\d/.test(e));
  const solo = (state.run.solo || []).find((x) => x.country === n.country);

  const signal = ok ? `
    <dl class="signal">
      <div><dt>Anomaly</dt><dd>${esc(s.anomaly_type)}</dd></div>
      <div><dt>Trend</dt><dd>${esc(s.trend_vector)}</dd></div>
      ${evidence.length ? `<div><dt>Evidence</dt><dd>${esc(evidence.join("; "))}</dd></div>` : ""}
    </dl>
    ${meter("Risk", s.severity, sevClass(s.severity))}
    ${meter("Confidence", s.confidence, "")}`
    : `<p class="hint">This nation's agent produced no usable signal. The coordinator treats that as a data gap, not as zero risk.</p>`;

  const alone = solo
    ? `<strong>Forecast from this signal alone</strong>
       <p>Next hit: <b>${esc(solo.predicted_next)}</b> (${pct(solo.confidence)}% confident)</p>`
    : `<strong>Where does the storm go next?</strong>
       <p>This signal describes ${esc(n.country)} only. It says nothing about where the storm heads after it.</p>`;

  const buttons = state.mode === "solo"
    ? `<button class="btn" type="button" data-action="combine">Combine signals &rarr;</button>
       <button class="btn secondary" type="button" data-action="deselect">Back</button>`
    : `<button class="btn secondary" type="button" data-action="deselect">&larr; Back to verdict</button>`;

  return `
    <div class="head-row"><h2>${esc(n.country)}</h2><span class="tag">private analysis</span></div>
    <p class="narr" id="narr"></p>
    ${signal}
    <div class="receipt">
      <div><span>&#128274; Stayed home</span><b>${RAW_KINDS}</b></div>
      <div class="sent"><span>&#10142; Crossed border</span><b>severity, anomaly, trend, confidence</b></div>
    </div>
    <div class="alone">${alone}</div>
    <div class="btn-row">${buttons}</div>`;
}

function progressView() {
  const rows = nations.map((_, i) => `
    <li id="prog-${i}" class="${i < state.received ? "done" : ""}">
      <span class="mark">${i < state.received ? "✓" : ""}</span>${esc(nameOf(i))}: signal received
    </li>`).join("");
  return `
    <h2>Coordinator is receiving signals</h2>
    <p class="lead">Only anonymized summaries cross the border. Watch what arrives.</p>
    <ul class="prog">${rows}</ul>
    <p class="hint">The coordinator never sees a single pressure, wind, temperature or rainfall reading.</p>`;
}

function verdictView() {
  const c = state.run.coordinator;
  const mi = mostImpactedIdx();
  let top = -1;
  nations.forEach((_, i) => { if (hasSignal(i) && (top < 0 || signalOf(i).severity > signalOf(top).severity)) top = i; });
  const note = top >= 0 && top !== mi
    ? `<p>Highest current risk: <b>${esc(nameOf(top))}</b> (${pct(signalOf(top).severity)}%). The coordinator still expects
       <b>${esc(nameOf(mi))}</b> to be hit next, inferred from the three signals together.</p>`
    : "";
  return `
    <h2>Regional Early Warning Coordinator</h2>
    <div class="verdict-badge"><span>Most impacted next</span><strong>${esc(c.most_impacted)}</strong></div>
    <div class="punch">
      <div class="chips">${nations.map((_, i) => chip(i, true)).join("")}</div>
      ${note}
    </div>
    <p class="narr" id="vnarr"></p>
    <div class="reco"><h4>Coordinated recommendation</h4><p>${esc(c.recommendation)}</p></div>
    <div class="btn-row">
      <button class="btn" type="button" data-action="combine">&#8635; Replay</button>
      <button class="btn secondary" type="button" data-action="solo">See each nation alone</button>
    </div>`;
}

function renderPanel() {
  let html, view;
  if (state.mode === "solo") {
    view = state.selected === null ? "intro" : "nation";
    html = view === "intro" ? introView() : nationView(state.selected);
  } else if (state.selected !== null) {
    view = "nation";
    html = nationView(state.selected);
  } else if (state.fedDone) {
    view = "verdict";
    html = verdictView();
  } else {
    view = "progress";
    html = progressView();
  }
  state.view = view;
  $("panel").innerHTML = `<div class="view">${html}</div>`;

  requestAnimationFrame(() => {
    document.querySelectorAll("#panel .bar i[data-w]").forEach((el) => { el.style.width = `${el.dataset.w}%`; });
  });
  if (view === "nation") typeInto($("narr"), state.run.nations[state.selected].narrative);
  if (view === "verdict") typeInto($("vnarr"), state.run.coordinator.narrative);
}

// ---------------------------------------------------------------- wiring
function bind() {
  $("panel").addEventListener("click", (e) => {
    const nat = e.target.closest("[data-nation]");
    if (nat) { onNation(Number(nat.dataset.nation)); return; }
    const act = e.target.closest("[data-action]");
    if (!act) return;
    const a = act.dataset.action;
    setInstant(a === "deselect"); // going back lands on an already-seen view
    if (a === "combine") combine();
    if (a === "solo") toSolo();
    if (a === "deselect") { state.selected = null; applyMap(); renderPanel(); }
  });
  // Mode tabs animate only on the first visit; Replay, Auto demo and Reset always animate.
  $("mode-solo").addEventListener("click", () => { setInstant(seen.solo); toSolo(); });
  $("mode-fed").addEventListener("click", () => {
    if (state.mode !== "fed") { setInstant(seen.fed); combine(); }
  });
  $("reset-btn").addEventListener("click", () => {
    seen.solo = seen.fed = false;
    seen.nations.clear();
    setInstant(false);
    toSolo();
  });
  $("demo-btn").addEventListener("click", () => { setInstant(false); autoDemo(); });
  $("scrub").addEventListener("input", (e) => updateStorm(Number(e.target.value) / 1000));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !state.busy && state.selected !== null) {
      setInstant(true);
      state.selected = null;
      applyMap();
      renderPanel();
    }
  });
}

async function init() {
  try {
    const { run, source } = await loadRun();
    if (!run || !Array.isArray(run.nations) || run.nations.length < 3 || !run.coordinator) {
      throw new Error("run file must contain 3 nations and a coordinator");
    }
    run.nations = run.nations.slice(0, 3);
    state.run = run;
    const label = source === "file" ? "Replaying a captured run" : "Replaying a captured run (built-in copy)";
    $("source-note").textContent = run.prompt ? `${label}. Prompt: "${run.prompt}"` : label;
  } catch (err) {
    $("panel").innerHTML = `<div class="view"><h2>Could not load the run</h2><p class="lead">${esc(err.message)}</p>
      <p class="hint">Serve this folder with: python3 -m http.server 8000</p></div>`;
    $("source-note").textContent = "No data";
    return;
  }
  buildMap();
  buildStorm();
  measureTrack();
  bind();
  toSolo();
}

init();

