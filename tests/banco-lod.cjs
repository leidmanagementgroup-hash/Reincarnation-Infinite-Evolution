// Banco dei livelli di simulazione (PERF-005, preparazione), motore reale in Node, popolazione sintetica deterministica di
// PERF-002 (tests/benchmark-npc.cjs). Non modifica il gioco. Misura ciò che esiste oggi per 95, 500, 1 000, 5 000 e 10 000
// residenti, distinguendo i livelli:
//   L1 completo  — residenti vicini al giocatore: posizione sul percorso vero, attori disegnabili (UrbanLife.actors, cache calda);
//   L2 semplice  — tutti i residenti: posizione dagli orari, senza percorso (samplePlan, come il filtro grossolano di oggi);
//   piani        — costo di un giorno di piani individuali (la base di L1 e L2) e memoria che occupano;
//   salvataggio  — dimensione (i residenti si ricavano dal seme e non si salvano).
//   L3–L5 (quartieri aggregati, regioni strategiche, continenti) non esistono ancora: il banco li riporta come «non presenti»,
//   così le misure future si confronteranno con questa base.
// Uso:   node --expose-gc tests/banco-lod.cjs [--sizes native,500,1000,5000,10000] [--seed 19425] [--out misure.json]
// Avvertenza: tutti i residenti sintetici abitano la stessa città (Velaris), che non è disegnata per migliaia di persone; il
// costo dei piani oltre il migliaio misura quindi il limite dell'algoritmo, non una città reale.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const sizes = opt('sizes', 'native,500,1000,5000,10000').split(',').map(s => s === 'native' ? null : Number(s));
const seed = Number(opt('seed', '19425'));
const outFile = opt('out', '');
const root = path.resolve(__dirname, '..');

function surface() {
  const pixels = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData(_x, _y, w, h) { return pixels.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (t, k) => k in t ? t[k] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}
function load() {
  const { instrumentPopulation, instrumentPlanner } = require(path.join(root, 'tests', 'benchmark-npc.cjs'));
  const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, performance, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) {
    if (file === 'audio.js') break;
    let source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file === 'urban-life.js') source = instrumentPlanner(instrumentPopulation(source));
    vm.runInContext(source, scope, { filename: file });
  }
  return scope;
}
const heap = () => { global.gc?.(); return process.memoryUsage().heapUsed; };
const stats = v => { const a = v.slice().sort((x, y) => x - y); return { mean: +(v.reduce((n, x) => n + x, 0) / v.length).toFixed(3), p95: +a[Math.floor(a.length * .95)].toFixed(3), max: +a.at(-1).toFixed(3) }; };
const rows = [];
for (const population of sizes) {
  const scope = load(), { Game, World, UrbanWorld, UrbanLife, Calendar } = scope;
  vm.runInContext(`Math.random = (() => { let n = 0; return () => n++ === 0 ? ${seed} / 4294967296 : .24; })()`, scope);
  Game.newGame();
  const s = Game.s, B = scope.__npcBench;
  for (let i = 0; i < 10 && s.region !== 'city-velaris'; i++) {
    const g = World.route(s.region, 'city-velaris', s.campaign.stage); Object.assign(s.player, { x: g.x, y: g.y }); Game.action('interact');
  }
  const plaza = UrbanWorld.exterior(s.seed).plaza; Object.assign(s.player, plaza.point || plaza);
  const h0 = heap();
  let t = performance.now();
  scope.__npcPopulation(population, seed);
  const list = B.profiles(s.seed).list;
  const profilesMs = performance.now() - t;
  const h1 = heap();
  // Piani di un giorno per tutti (come spread al primo utilizzo).
  const rt = B.useRuntime(s);
  t = performance.now();
  B.dailyPlan(s, list[0], rt);
  const planMs = performance.now() - t;
  const h2 = heap();
  const plans = list.map(p => B.dailyPlan(s, p, rt));
  // L2: posizione dagli orari per tutti, a ogni fotogramma (60 fotogrammi distribuiti su 4 ore di gioco).
  const l2 = [];
  for (let f = 0; f < 60; f++) {
    const minute = 600 + f * 4;
    t = performance.now();
    for (let i = 0; i < plans.length; i++) B.samplePlan(plans[i], minute);
    l2.push(performance.now() - t);
  }
  // L1: residenti vicini con percorso vero, cache calda (prima si lascia lavorare il motore).
  const stamp = () => Calendar.timestamp(s.calendar, s.time);
  s.calendar.offset += (Math.floor(stamp() / 1440) * 1440 + 600) - stamp() + (stamp() % 1440 > 600 ? 1440 : 0);
  for (let i = 0; i < 300; i++) Game.step(1 / 60, {});
  const l1 = [];
  let visible = 0;
  for (let f = 0; f < 120; f++) {
    Game.step(1 / 60, {});
    t = performance.now();
    visible = UrbanLife.actors(s).length;
    l1.push(performance.now() - t);
  }
  const save = Game.exportSave().length;
  const row = { population: population ?? 'native (95)', residents: list.length,
    profilesMs: +profilesMs.toFixed(1), profilesKB: Math.round((h1 - h0) / 1024),
    planDayMs: +planMs.toFixed(1), plansKB: Math.round((h2 - h1) / 1024), bytesPerResident: Math.round((h2 - h0) / list.length),
    L1: { visible, ...stats(l1) }, L2: { residents: plans.length, ...stats(l2) }, saveKB: +(save / 1024).toFixed(1),
    L3: 'non presente', L4: 'non presente', L5: 'non presente' };
  rows.push(row);
  console.log(`${String(row.population).padEnd(11)} profili ${row.profilesMs} ms · piani di un giorno ${row.planDayMs} ms (${row.plansKB} KB, ${row.bytesPerResident} B per residente) · ` +
    `L1 ${row.L1.visible} vicini ${row.L1.mean}/${row.L1.max} ms · L2 ${row.L2.residents} dagli orari ${row.L2.mean}/${row.L2.max} ms per fotogramma · salvataggio ${row.saveKB} KB · L3–L5 non presenti`);
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ seed, node: process.version, rows }, null, 2));
