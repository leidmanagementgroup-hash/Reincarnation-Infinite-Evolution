// Banco di prova della popolazione in Edge: quanto costa ogni sistema del gioco con 25…500 residenti di Velaris.
// Uso:   node tests/banco-popolazione.cjs <build.html> [altra-build.html] [--sizes native,25,50,100,250,500]
//          [--rounds 2] [--seed 19425] [--out misure.json]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per Edge visibile (GPU).
// Riusa senza modificarla la strumentazione di PERF-002 (tests/benchmark-npc.cjs: popolazione sintetica deterministica e
// cronometro del pianificatore), iniettata in tutti gli scenari (anche quello con i residenti nativi), e aggiunge:
//   - tre finestre: GIORNO (10:00, strade piene), SERA (dalle 22:00 finché il piano del giorno dopo è davvero pronto, con il
//     numero di fotogrammi necessari), MEZZANOTTE (cambio di giorno, 240 fotogrammi: il rinnovo dei residenti scatta ogni
//     180 fotogrammi e gli impulsi seguono s.life.nextPulse, non il calendario);
//   - il primo fotogramma dopo ogni salto del calendario a parte («salto di tempo»): è il costo di dormire, entrare in città
//     dopo ore o caricare una partita, non quello del tempo che scorre; dopo la mezzanotte due casi del gioco vero: RIENTRO
//     (uscita dal varco, ore che passano fuori, ritorno alle 08:00) e CARICAMENTO della partita salvata (caso a freddo:
//     piani e tratte da ricostruire, competenza di PERF-003);
//   - il costo per fotogramma di ogni sistema (le colonne si annidano, vedi COLONNE);
//   - memoria JS dopo una raccolta forzata (protocollo DevTools), all'inizio e alla fine, mai subito prima di un salto;
//   - salvataggio: byte UTF-8 e durata di Game.exportSave (esclusa la scrittura in localStorage).
// La pagina è servita da un indirizzo finto con intestazioni COOP/COEP (isolamento cross-origin): così performance.now ha
// una risoluzione di pochi microsecondi invece di 100 µs. Ogni altra richiesta viene bloccata: il gioco resta offline.
// Ogni scenario parte in un contesto nuovo (salvataggi isolati, nessuna partita reale toccata), con seme fisso e callback
// requestAnimationFrame reali (un tick di gioco di 1/60 s per callback). Con due build i giri si alternano.
// «cpu» e «disegno» misurano il tempo dello script; rasterizzazione e composizione del Canvas avvengono dopo e si vedono solo
// nell'intervallo fra i fotogrammi (colonna «intervallo»).
// Nessun retry: un errore JavaScript, un residente fuori dalla griglia percorribile o un piano mai pronto fanno fallire lo scenario.
// Bilancio indicativo per fotogramma a 60 Hz: CPU p95 entro 8 ms e massimo entro 16,7 ms; oltre viene segnalato, non nascosto.
//
// COLONNE (ms per fotogramma). sim = Game.step, che CONTIENE residenti (UrbanLife.tick), economia, abitanti, conflitti, Living
// World (WorldMemory/Requests/Renown.tick) e salvataggio automatico (Game.save); interfaccia = Game.view (contiene i luoghi dei
// residenti, UrbanLife.sites); attori = Game.actors (contiene UrbanLife.actors); disegno = terreno, primo piano e luce;
// percorsi = tutte le chiamate a path(), ovunque avvengano; pianificatore = spread/prepareNextDay al netto dei suoi percorsi;
// resto = cpu − sim − interfaccia − attori − disegno (pannelli, effetti, HUD).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const { instrumentPopulation, instrumentPlanner } = require('./benchmark-npc.cjs');

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf('--' + name); if (i < 0) return fallback; const v = args[i + 1]; args.splice(i, 2); return v; };
const outPath = option('out', null);
const sizes = option('sizes', 'native,25,50,100,250,500').split(',').map(s => s === 'native' ? null : Number(s));
const rounds = Number(option('rounds', '2'));
const seed = Number(option('seed', '19425'));
const FRAMES = { day: Number(option('day-frames', '360')), eveningMin: Number(option('evening-frames', '600')), eveningMax: 6000,
  midnight: Number(option('midnight-frames', '240')) };
assert(sizes.every(n => n === null || (Number.isInteger(n) && n >= 7)) && rounds >= 1 && args.length >= 1 && args.length <= 2,
  'Uso: node tests/banco-popolazione.cjs <build.html> [altra.html] [--sizes …] [--rounds 2] [--out file.json]');
const BUDGET = { p95: 8, max: 16.7 };
const BASE_URL = 'http://localhost:47913/'; // contesto sicuro (serve all'isolamento); intercettato, nessun server reale

function fixtureOf(file) {
  const bytes = fs.readFileSync(file), source = bytes.toString('utf8');
  const start = source.indexOf('/* Velaris: persistent residents, street routines and commissions;');
  const exportAt = source.indexOf('window.UrbanLife=', start);
  const end = source.indexOf('\n})();', exportAt) + '\n})();'.length;
  assert(start >= 0 && exportAt > start && end > exportAt, 'Modulo UrbanLife non trovato in ' + file);
  return { file, bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), fixture: instrumentPlanner(instrumentPopulation(source.slice(start, end))) };
}

function installClock() {
  const realRAF = window.requestAnimationFrame.bind(window);
  let timestamp = performance.now(), queue = [], nextId = 0;
  window.requestAnimationFrame = cb => { queue.push([++nextId, cb]); return nextId; };
  window.cancelAnimationFrame = id => { queue = queue.filter(([item]) => item !== id); };
  window.__benchFrame = async () => {
    const actual = await new Promise(resolve => realRAF(resolve));
    timestamp += 1000 / 60;
    const pending = queue; queue = [];
    const from = performance.now();
    for (const [, cb] of pending) cb(timestamp);
    return { actual, cpu: performance.now() - from };
  };
}

function setup({ population, seed }) {
  const r0 = Math.random; let calls = 0;
  Math.random = () => calls++ === 0 ? seed / 4294967296 : .24;
  try { Game.newGame(); } finally { Math.random = r0; }
  const s = Game.s;
  if (s.seed !== seed) throw new Error('Seme inatteso: ' + s.seed);
  const exterior = UrbanWorld.exterior(s.seed);
  window.__npcPopulation(population, seed); // null = residenti nativi, con lo stesso modulo strumentato
  const bench = window.__npcBench, usage = {};
  let visible = [];
  const watch = (object, method, key, onResult) => {
    const original = object?.[method];
    if (typeof original !== 'function') throw new Error('Impossibile misurare ' + key + ' (' + method + ')');
    object[method] = function (...params) {
      const begin = performance.now();
      try { const result = original.apply(this, params); if (onResult) onResult(result); return result; }
      finally {
        const ms = performance.now() - begin;
        usage[key] = (usage[key] || 0) + ms; usage[key + 'Calls'] = (usage[key + 'Calls'] || 0) + 1;
        if (key === 'path' && bench.perf.active) usage.plannerPath = (usage.plannerPath || 0) + ms;
      }
    };
  };
  watch(Game, 'step', 'step');
  watch(Game, 'view', 'view');
  watch(Game, 'save', 'save');
  watch(Game, 'actors', 'actors');
  watch(UrbanLife, 'actors', 'urban', a => { visible = a; });
  watch(UrbanLife, 'tick', 'residents');
  watch(UrbanLife, 'sites', 'sites');
  watch(Economy, 'tick', 'economy');
  watch(Society, 'tick', 'society');
  watch(Conflicts, 'tick', 'conflicts');
  for (const object of [window.WorldMemory, window.Requests, window.Renown]) if (object) watch(object, 'tick', 'living');
  watch(World, 'drawGround', 'draw'); watch(World, 'drawFront', 'draw');
  watch(WorldLight, 'ambient', 'draw'); watch(WorldLight, 'draw', 'draw');
  watch(exterior, 'path', 'path');
  for (let i = 0; i < 8 && s.region !== 'city-velaris'; i++) {
    const gate = World.route(s.region, 'city-velaris', s.campaign.stage);
    if (!gate) throw new Error('Percorso per Velaris assente da ' + s.region);
    Object.assign(s.player, { x: gate.x, y: gate.y });
    if (!Game.action('interact')) throw new Error('Varco rifiutato: ' + gate.id);
  }
  if (s.region !== 'city-velaris' || World.region !== s.region) throw new Error('Velaris non raggiunta');
  const at = exterior.plaza.point || exterior.plaza;
  Object.assign(s.player, { x: at.x, y: at.y });
  const time = () => Calendar.timestamp(Game.s.calendar, Game.s.time);
  let base = Math.floor(time() / 1440) * 1440; if (time() > base + 590) base += 1440; // giorno in cui le 10:00 non sono passate
  const KEYS = ['cpu', 'step', 'residents', 'economy', 'society', 'conflicts', 'living', 'save', 'view', 'sites', 'actors', 'urban', 'draw', 'path', 'planner', 'rest'];
  // Una finestra: salto del calendario (se minute non è null), poi fotogrammi finché `frames` è raggiunto e, se richiesto,
  // finché il piano del giorno dopo è pronto (al massimo `max` fotogrammi).
  window.__benchRun = async ({ minute, frames, untilReady = false, max = frames }) => {
    if (minute !== null) {
      const change = base + minute - time();
      if (change < 0) throw new Error('Il calendario può solo avanzare');
      Game.s.calendar.offset += change;
    }
    const nextDay = Math.floor((time() + 1) / 1440) + 1;
    let previous = null, readyAfter = null, invalid = 0;
    const out = [];
    for (let i = 0; i < max && (i < frames || (untilReady && readyAfter === null)); i++) {
      for (const k of Object.keys(usage)) usage[k] = 0;
      bench.perf.planner = 0;
      const f = await window.__benchFrame();
      if (!usage.stepCalls || !usage.urbanCalls || !usage.drawCalls) throw new Error('Fotogramma incompleto');
      const row = { minute: time() - base, cpu: f.cpu, interval: previous === null ? null : f.actual - previous, pathCalls: usage.pathCalls || 0, visible: visible.length };
      for (const k of KEYS.slice(1, -2)) row[k] = usage[k] || 0;
      row.planner = Math.max(0, bench.perf.planner - (usage.plannerPath || 0));
      row.rest = Math.max(0, f.cpu - row.step - row.view - row.actors - row.draw);
      out.push(row); previous = f.actual;
      if (untilReady && readyAfter === null && bench.useRuntime(Game.s)?.nextPlans?.day >= nextDay) readyAfter = i + 1;
      if (i % 30 === 0) invalid += visible.filter(q => !World.canWalk(q.x, q.y, 5)).length;
    }
    if (untilReady && readyAfter === null) throw new Error('Piano del giorno dopo non pronto in ' + max + ' fotogrammi');
    return { frames: out, readyAfter, invalid };
  };
  // Rientro in città dopo ore: uscita dal varco, salto del calendario, ritorno dal varco (azioni vere del gioco).
  const travel = target => {
    for (let i = 0; i < 8 && Game.s.region !== target; i++) {
      const gate = World.route(Game.s.region, target, Game.s.campaign.stage);
      if (!gate) throw new Error('Percorso assente verso ' + target);
      Object.assign(Game.s.player, { x: gate.x, y: gate.y });
      if (!Game.action('interact')) throw new Error('Varco rifiutato: ' + gate.id);
    }
    if (Game.s.region !== target) throw new Error('Destinazione non raggiunta: ' + target);
  };
  window.__benchReenter = minute => {
    const gate = World.route('city-velaris', 'valley', Game.s.campaign.stage);
    Object.assign(Game.s.player, { x: gate.x, y: gate.y });
    if (!Game.action('interact') || Game.s.region === 'city-velaris') throw new Error('Uscita da Velaris non riuscita');
    const change = base + minute - time();
    if (change < 0) throw new Error('Il calendario può solo avanzare');
    Game.s.calendar.offset += change;
    travel('city-velaris');
    Object.assign(Game.s.player, { x: at.x, y: at.y });
  };
  // Caricamento della partita salvata: stato nuovo, quindi piani e tratte da ricostruire (caso a freddo, PERF-003).
  window.__benchLoad = () => { if (!Game.save() || !Game.load()) throw new Error('Salvataggio o caricamento non riusciti'); Object.assign(Game.s.player, { x: at.x, y: at.y }); };
  window.__benchSave = () => {
    const times = [];
    let text = '';
    for (let i = 0; i < 15; i++) { const t = performance.now(); text = Game.exportSave(); times.push(performance.now() - t); }
    times.sort((a, b) => a - b);
    return { bytes: new Blob([text]).size, p50: times[7], max: times.at(-1) };
  };
  return { crossOriginIsolated: window.crossOriginIsolated };
}

const r3 = v => +v.toFixed(3);
function dist(values) {
  if (!values.length) return null;
  const a = values.slice().sort((x, y) => x - y), q = f => a[Math.min(a.length - 1, Math.ceil(a.length * f) - 1)];
  return { mean: r3(values.reduce((n, v) => n + v, 0) / values.length), p50: r3(q(.5)), p95: r3(q(.95)), max: r3(a.at(-1)) };
}
const round = row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'number' ? r3(v) : v]));
function summarize(all, jumped = true) {
  const jump = jumped ? round(all.frames[0]) : null;
  const frames = jumped ? all.frames.slice(1) : all.frames;
  const keys = ['cpu', 'step', 'residents', 'economy', 'society', 'conflicts', 'living', 'save', 'view', 'sites', 'actors', 'urban', 'draw', 'path', 'planner', 'rest'];
  const out = Object.fromEntries(keys.map(k => [k, dist(frames.map(f => f[k]))]));
  const iv = frames.map(f => f.interval).filter(v => v !== null);
  out.interval = dist(iv); out.over33 = iv.filter(v => v > 33.5).length;
  out.frames = frames.length; out.pathCalls = frames.reduce((n, f) => n + f.pathCalls, 0);
  out.visible = Math.max(...frames.map(f => f.visible));
  out.overBudget = out.cpu.p95 > BUDGET.p95 || out.cpu.max > BUDGET.max;
  out.worst = round(frames.reduce((a, f) => f.cpu > a.cpu ? f : a, frames[0]));
  out.jump = jump; out.readyAfter = all.readyAfter; out.invalid = all.invalid;
  return out;
}

async function scenario(browser, build, population) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  try {
    // Unica risorsa servita: la build, con isolamento cross-origin. Tutto il resto viene bloccato (gioco offline).
    await context.route('**/*', route => route.request().url() === BASE_URL + 'index.html'
      ? route.fulfill({ status: 200, body: build.bytes, headers: { 'content-type': 'text/html; charset=utf-8',
        'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp' } })
      : route.abort());
    await context.addInitScript(installClock);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(BASE_URL + 'index.html');
    assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'), build.sha256, 'HTML aperto diverso');
    await page.evaluate(async () => { for (let i = 0; i < 5; i++) await window.__benchFrame(); });
    await page.locator('#playBtn').click();
    await page.locator('#dialog button[data-do="resume"]').first().click({ timeout: 5000 });
    await page.evaluate(src => (0, eval)(src), build.fixture);
    const env = await page.evaluate(setup, { population, seed });
    const cdp = await context.newCDPSession(page);
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize; };
    const heap0 = await heap();
    await page.evaluate(o => window.__benchRun(o), { minute: 9 * 60 + 58, frames: 30 }); // riscaldamento
    const day = await page.evaluate(o => window.__benchRun(o), { minute: 10 * 60, frames: FRAMES.day });
    const evening = await page.evaluate(o => window.__benchRun(o), { minute: 22 * 60 - .04, frames: FRAMES.eveningMin, untilReady: true, max: FRAMES.eveningMax });
    // Fino alle 23:59,96 il gioco continua a girare: il salto verso la mezzanotte avviene a piano già pronto.
    const midnight = await page.evaluate(o => window.__benchRun(o), { minute: 24 * 60 - .04, frames: FRAMES.midnight });
    await page.evaluate(m => window.__benchReenter(m), 24 * 60 + 8 * 60);
    const reenter = await page.evaluate(o => window.__benchRun(o), { minute: null, frames: 60 });
    await page.evaluate(() => window.__benchLoad());
    const loaded = await page.evaluate(o => window.__benchRun(o), { minute: null, frames: 60 });
    const heapEnd = await heap();
    const save = await page.evaluate(() => window.__benchSave());
    assert(midnight.frames.some(f => f.minute >= 24 * 60), 'Manca il passaggio della mezzanotte');
    assert.equal(day.invalid + evening.invalid + midnight.invalid + reenter.invalid + loaded.invalid, 0, 'Residenti fuori dalla griglia percorribile');
    assert.deepEqual(errors, [], errors.join(' | '));
    return { crossOriginIsolated: env.crossOriginIsolated, day: summarize(day), evening: summarize(evening), midnight: summarize(midnight), reenter: summarize(reenter), loaded: summarize(loaded),
      heap: { startMB: r3(heap0 / 1048576), endMB: r3(heapEnd / 1048576) }, save };
  } finally { await context.close(); }
}

const fmt = d => d ? `${d.p95}/${d.max}` : '—';
const avg = d => d ? d.mean.toFixed(3) : '—';
(async () => {
  const builds = args.map(f => fixtureOf(path.resolve(f)));
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const entries = [];
  let edge;
  try {
    edge = browser.version();
    console.log(`Edge ${edge} · ${process.env.PW_HEADED ? 'finestra visibile (GPU)' : 'senza finestra'} · seme ${seed} · ${rounds} giri · ` +
      'cpu p95/max; sistemi come media per fotogramma; ms');
    for (let run = 0; run < rounds; run++) {
      const order = run % 2 ? builds.slice().reverse() : builds;
      for (const size of sizes) for (const build of order) {
        const r = await scenario(browser, build, size);
        const label = builds.length > 1 ? (builds.indexOf(build) === 0 ? 'A ' : 'B ') : '';
        entries.push({ build: path.basename(build.file), label: label.trim(), run: run + 1, population: size ?? 'native', ...r });
        const d = r.day, e = r.evening, m = r.midnight, j = e.jump;
        console.log(`${label}${String(size ?? 'nativa (95)').padEnd(11)} giro ${run + 1}${r.crossOriginIsolated ? '' : ' [timer a 100 µs]'}\n` +
          `   GIORNO      cpu ${fmt(d.cpu)}${d.overBudget ? ' OLTRE' : ''} · sim ${avg(d.step)} (residenti ${avg(d.residents)}, economia ${avg(d.economy)}, abitanti ${avg(d.society)}, ` +
          `conflitti ${avg(d.conflicts)}, Living World ${avg(d.living)}, salvataggio ${avg(d.save)}) · interfaccia ${avg(d.view)} · attori ${avg(d.actors)} · disegno ${avg(d.draw)} · ` +
          `resto ${avg(d.rest)} · percorsi ${avg(d.path)} (${d.pathCalls}) · visibili ${d.visible}\n` +
          `   SERA        cpu ${fmt(e.cpu)}${e.overBudget ? ' OLTRE' : ''} · piano pronto dopo ${e.readyAfter} fotogrammi · pianificatore ${fmt(e.planner)} · percorsi ${fmt(e.path)} ` +
          `[peggiore: sim ${e.worst.step}, salvataggio ${e.worst.save}, interfaccia ${e.worst.view}, attori ${e.worst.actors}, percorsi ${e.worst.path} in ${e.worst.pathCalls}, disegno ${e.worst.draw}]\n` +
          `   MEZZANOTTE  cpu ${fmt(m.cpu)}${m.overBudget ? ' OLTRE' : ''} [peggiore: sim ${m.worst.step}, salvataggio ${m.worst.save}, attori ${m.worst.actors}, percorsi ${m.worst.path}]\n` +
          `   SALTO 10:00→21:59  cpu ${j.cpu}${j.cpu > BUDGET.max ? ' OLTRE' : ''} · percorsi ${j.path} in ${j.pathCalls} chiamate · attori ${j.actors} · interfaccia ${j.view} · disegno ${j.draw}\n` +
          `   RIENTRO alle 08:00 del giorno dopo  cpu ${r.reenter.jump.cpu}${r.reenter.jump.cpu > BUDGET.max ? ' OLTRE' : ''} · percorsi ${r.reenter.jump.path} in ${r.reenter.jump.pathCalls} · poi p95/max ${fmt(r.reenter.cpu)}\n` +
          `   CARICAMENTO (a freddo, PERF-003)  cpu ${r.loaded.jump.cpu}${r.loaded.jump.cpu > BUDGET.max ? ' OLTRE' : ''} · pianificatore ${r.loaded.jump.planner} · percorsi ${r.loaded.jump.path} in ${r.loaded.jump.pathCalls} · poi p95/max ${fmt(r.loaded.cpu)}\n` +
          `   memoria ${r.heap.startMB}→${r.heap.endMB} MB · salvataggio ${(r.save.bytes / 1024).toFixed(1)} KB in ${r3(r.save.p50)} ms`);
      }
    }
  } finally { await browser.close(); }
  if (outPath) fs.writeFileSync(outPath, JSON.stringify({ edge, headless: !process.env.PW_HEADED, seed, rounds, frames: FRAMES, budget: BUDGET,
    cpu: os.cpus()[0]?.model, logicalProcessors: os.cpus().length, node: process.version,
    builds: builds.map(({ file, sha256 }) => ({ file, sha256 })), entries }, null, 2) + '\n');
})().catch(e => { console.error(e); process.exitCode = 1; });
