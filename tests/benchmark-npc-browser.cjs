// PERF-002 in Edge, con Canvas, HUD e simulazione dalla build HTML offline.
// Uso: node tests/benchmark-npc-browser.cjs <prima.html> [dopo.html] [--out misure.json]
// Opzioni: --sizes native,20,50,100,250,500 --rounds 2 --warmup 24 --prewarm 600 --rollover 96
// PW_CORE punta a playwright-core installato fuori dal progetto; PW_HEADED=1 apre Edge a schermo.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const { instrumentPopulation, instrumentPlanner } = require('./benchmark-npc.cjs');

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf('--' + name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  assert(value && !value.startsWith('--'), 'Specificare --' + name);
  args.splice(index, 2);
  return value;
}
function integer(value, min, name) {
  const number = Number(value);
  assert(Number.isInteger(number) && number >= min, 'Valore non valido per ' + name);
  return number;
}
const outPath = option('out', null);
const sizes = option('sizes', 'native,20,50,100,250,500').split(',').map(s => s === 'native' ? null : integer(s, 7, 'sizes'));
const rounds = integer(option('rounds', '2'), 1, 'rounds');
const seed = integer(option('seed', '19425'), 0, 'seed');
const warmup = integer(option('warmup', '24'), 1, 'warmup');
const prewarm = integer(option('prewarm', '600'), 4, 'prewarm');
const rollover = integer(option('rollover', '96'), 50, 'rollover');
assert(args.length >= 1 && args.length <= 2 && !args.some(arg => arg.startsWith('--')),
  'Uso: node tests/benchmark-npc-browser.cjs <prima.html> [dopo.html] [--out misure.json]');

function sourceFixture(file) {
  const bytes = fs.readFileSync(file);
  const source = bytes.toString('utf8');
  const start = source.indexOf('/* Velaris: persistent residents, street routines and commissions;');
  const exportAt = source.indexOf('window.UrbanLife=', start);
  const end = source.indexOf('\n})();', exportAt) + '\n})();'.length;
  assert(start >= 0 && exportAt > start && end > exportAt, 'Modulo UrbanLife non trovato in ' + file);
  return {
    file,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    fixture: instrumentPlanner(instrumentPopulation(source.slice(start, end)))
  };
}

function installClock() {
  // Un fotogramma di gioco per callback reale di Edge, con tempo di gioco fissato a 60 tick/s.
  // Un picco CPU si traduce comunque in callback mancati/in ritardo nel successivo timestamp reale.
  const realRAF = window.requestAnimationFrame.bind(window);
  let timestamp = performance.now(), queue = [], nextId = 0;
  window.requestAnimationFrame = callback => { queue.push([++nextId, callback]); return nextId; };
  window.cancelAnimationFrame = id => { queue = queue.filter(([item]) => item !== id); };
  window.__perfNPCFrame = async () => {
    const actual = await new Promise(resolve => realRAF(resolve));
    timestamp += 1000 / 60;
    const pending = queue;
    queue = [];
    const from = performance.now();
    for (const [, callback] of pending) callback(timestamp);
    return { actual, cpu: performance.now() - from, callbacks: pending.length };
  };
}

function setup({ population, seed }) {
  const originalRandom = Math.random;
  let calls = 0;
  Math.random = () => calls++ === 0 ? seed / 4294967296 : .24;
  try { Game.newGame(); } finally { Math.random = originalRandom; }
  const s = Game.s;
  if (s.seed !== seed) throw new Error('Seme inatteso: ' + s.seed);
  const exterior = UrbanWorld.exterior(s.seed);
  if (population !== null) window.__npcPopulation(population, seed);

  const bench = window.__npcBench;
  const usage = {};
  let visible = [];
  function watch(object, method, key, onResult) {
    const original = object?.[method];
    if (typeof original !== 'function') throw new Error('Impossibile misurare ' + method);
    object[method] = function (...params) {
      usage[key + 'Calls'] = (usage[key + 'Calls'] || 0) + 1;
      const begin = performance.now();
      try {
        const result = original.apply(this, params);
        if (onResult) onResult(result);
        return result;
      } finally {
        const elapsed = performance.now() - begin;
        usage[key] = (usage[key] || 0) + elapsed;
        if (key === 'path' && bench?.perf.active) usage.plannerPath = (usage.plannerPath || 0) + elapsed;
      }
    };
  }
  watch(Game, 'step', 'step');
  watch(Game, 'actors', 'actors');
  watch(UrbanLife, 'actors', 'urban', actors => { visible = actors; });
  watch(World, 'drawGround', 'draw');
  watch(World, 'drawFront', 'draw');
  watch(WorldLight, 'ambient', 'draw');
  watch(WorldLight, 'draw', 'draw');
  watch(exterior, 'path', 'path');

  for (let i = 0; i < 8 && s.region !== 'city-velaris'; i++) {
    const gate = World.route(s.region, 'city-velaris', s.campaign.stage);
    if (!gate) throw new Error('Percorso per Velaris assente da ' + s.region);
    Object.assign(s.player, { x: gate.x, y: gate.y });
    if (!Game.action('interact')) throw new Error('Varco rifiutato: ' + gate.id);
  }
  if (s.region !== 'city-velaris' || World.region !== s.region) throw new Error('Velaris non raggiunta');
  const location = exterior.plaza.point || exterior.plaza;
  Object.assign(s.player, { x: location.x, y: location.y });

  const time = () => Calendar.timestamp(s.calendar, s.time);
  function goToMinute(target) {
    const change = target - time();
    if (change < 0) throw new Error('Il test può solo avanzare il calendario');
    s.calendar.offset += change;
  }
  window.__perfNpcRun = async (minute, frames) => {
    goToMinute(minute);
    let previous = null;
    const output = [];
    for (let i = 0; i < frames; i++) {
      for (const key of Object.keys(usage)) usage[key] = 0;
      if (bench) bench.perf.planner = 0;
      const frame = await window.__perfNPCFrame();
      if (!usage.stepCalls || !usage.urbanCalls || !usage.drawCalls) throw new Error('Fotogramma di gioco incompleto');
      output.push({ minute: time(), cpu: frame.cpu, interval: previous === null ? null : frame.actual - previous,
        step: usage.step || 0, actors: usage.actors || 0, urban: usage.urban || 0,
        draw: usage.draw || 0, path: usage.path || 0, pathCalls: usage.pathCalls || 0, visible: visible.length,
        planner: bench ? Math.max(0, bench.perf.planner - (usage.plannerPath || 0)) : null });
      previous = frame.actual;
    }
    const runtime = bench?.scheduler ? bench.useRuntime(s) : null;
    return { frames: output, validVisible: visible.every(q => World.canWalk(q.x, q.y, 5)),
      readyThroughDay: runtime?.nextPlans?.day ?? null, completedResidents: runtime?.preparing?.index ?? null };
  };
}

const round = value => +value.toFixed(3);
function distribution(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((n, value) => n + value, 0);
  const sample = fraction => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
  return { total: round(sum), p50: round(sample(.5)), p95: round(sample(.95)), max: round(sorted.at(-1)) };
}
function summarize(result) {
  const interval = result.frames.map(frame => frame.interval).filter(value => value !== null);
  const totals = Object.fromEntries(['cpu', 'step', 'actors', 'urban', 'draw', 'path', 'planner'].map(key =>
    [key, distribution(result.frames.map(frame => frame[key]).filter(value => value !== null))]));
  return { ...totals, interval: distribution(interval), fps: round(1000 * interval.length / interval.reduce((a, b) => a + b, 0)),
    intervalsOver20: interval.filter(ms => ms > 20).length, intervalsOver33: interval.filter(ms => ms > 33.5).length,
    pathCalls: result.frames.reduce((n, frame) => n + frame.pathCalls, 0),
    maxVisible: Math.max(...result.frames.map(frame => frame.visible)), validVisible: result.validVisible,
    readyThroughDay: result.readyThroughDay, completedResidents: result.completedResidents };
}

async function scenario(browser, build, population) {
  const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 720 } });
  const errors = [];
  try {
    await context.addInitScript(installClock);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const request = await page.goto(pathToFileURL(build.file).href);
    assert.equal(crypto.createHash('sha256').update(await request.body()).digest('hex'), build.sha256, 'HTML aperto diverso');
    await page.evaluate(async () => { for (let i = 0; i < 5; i++) await window.__perfNPCFrame(); });
    await page.locator('#playBtn').click();
    await page.locator('#dialog button[data-do="resume"]').first().click({ timeout: 5000 });
    if (population !== null) await page.evaluate(source => (0, eval)(source), build.fixture);
    await page.evaluate(setup, { population, seed });
    await page.evaluate(n => window.__perfNpcRun(20 * 60, n), warmup);
    const prepare = await page.evaluate(n => window.__perfNpcRun(22 * 60 - .04, n), prewarm);
    const midnight = await page.evaluate(n => window.__perfNpcRun(24 * 60 - .04, n), rollover);
    assert(prepare.frames.at(-1).minute > 22 * 60 && prepare.frames[0].minute < 22 * 60, 'Manca la soglia delle 22');
    const crossedAt = midnight.frames.findIndex(frame => frame.minute >= 24 * 60);
    assert(crossedAt > 0, 'Manca il passaggio della mezzanotte');
    assert(prepare.validVisible && midnight.validVisible, 'Residente visibile fuori dalla griglia percorribile');
    assert.deepEqual(errors, [], errors.join(' | '));
    return { prepare: summarize(prepare), midnight: summarize(midnight), crossedAt,
      frames: { prepare: prepare.frames, midnight: midnight.frames } };
  } finally { await context.close(); }
}

(async () => {
  const builds = args.map(file => sourceFixture(path.resolve(file)));
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const entries = [];
  let edge;
  try {
    edge = browser.version();
    for (let run = 0; run < rounds; run++) {
      const order = run % 2 ? builds.slice().reverse() : builds;
      for (const size of sizes) for (const build of order) {
        const results = await scenario(browser, build, size);
        const label = builds.indexOf(build) === 0 ? 'prima' : 'dopo';
        entries.push({ label, run: run + 1, population: size ?? 'native', ...results });
        const { prepare, midnight } = results;
        console.log(`${label} ${size ?? 'nativa'}, giro ${run + 1}: CPU max preparazione ${prepare.cpu.max} ms, ` +
          `mezzanotte ${midnight.cpu.max} ms; intervallo max ${midnight.interval.max} ms (${midnight.fps} rAF/s)`);
      }
    }
  } finally { await browser.close(); }
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify({ edge, offline: true, headless: !process.env.PW_HEADED,
      timing: 'callback rAF reali, tick di gioco fisso (60/s), disegno e simulazione dall’HTML',
      cpu: os.cpus()[0]?.model, logicalProcessors: os.cpus().length, platform: os.platform(),
      seed, rounds, warmup, prewarm, rollover, viewport: [1280, 720],
      builds: builds.map(({ file, sha256 }) => ({ file, sha256 })), entries }, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
