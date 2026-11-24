// PERF-004: calcolo anticipato delle tratte dei residenti di Velaris. Motore reale in Node, Canvas senza disegno.
// Uso:   node --expose-gc tests/verifica-perf-004.cjs [cartella-di-riferimento] [cartella-da-verificare] [--sizes native,250,500]
//   Riferimento predefinito: ../Reincarnation (main senza PERF-004). Da verificare: questa cartella.
// Le due versioni giocano la stessa partita (seme 19425) con la popolazione sintetica di PERF-002 (tests/benchmark-npc.cjs) e
// ricevono le stesse azioni: per ogni scena si confrontano byte per byte i residenti disegnati (aspetto, posizione, movimento,
// direzione), la scheda di un residente e i luoghi d'interazione, e si controlla che ogni residente disegnato stia su suolo
// percorribile. Scene: giorno (salto alle 10:00 e poi tempo che scorre), salto alle 21:59, sera fino al piano pronto,
// mezzanotte, salto alle 08:00 del giorno dopo (come il sonno), spostamento del giocatore lontano (come l'uscita da un edificio).
// Controlla anche: salti ripetuti per cinque giorni (sera, sonno, salti rapidi nella giornata) con memoria stabile, nessun
// percorso nel fotogramma del salto quando il calcolo anticipato ha finito, memoria delle tratte limitata
// a oggi e domani, stesso risultato in due esecuzioni (determinismo), salvataggi identici, e una mutazione (tratta ricostruita
// senza l'ultimo punto) che deve far fallire il confronto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const sizes = opt('sizes', 'native,250,500').split(',').map(s => s === 'native' ? null : Number(s));
const here = path.resolve(__dirname, '..');
const reference = path.resolve(args[0] || path.join(here, '..', 'Reincarnation'));
const target = path.resolve(args[1] || here);
const SEED = 19425;

function surface() {
  const pixels = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData(_x, _y, w, h) { return pixels.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (t, k) => k in t ? t[k] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}
function load(root, mutate = null) {
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
    if (file === 'urban-life.js') { source = instrumentPlanner(instrumentPopulation(source)); if (mutate) source = mutate(source); }
    vm.runInContext(source, scope, { filename: file });
  }
  return scope;
}
function begin(scope, population) {
  const { Game, World, UrbanWorld, Calendar } = scope;
  vm.runInContext(`Math.random = (() => { let n = 0; return () => n++ === 0 ? ${SEED} / 4294967296 : .24; })()`, scope);
  assert(Game.newGame());
  const s = Game.s;
  scope.__npcPopulation(population, SEED);
  const ext = UrbanWorld.exterior(s.seed), original = ext.path;
  scope.pathCalls = 0;
  ext.path = function (...a) { scope.pathCalls++; return original.apply(this, a); };
  for (let i = 0; i < 8 && s.region !== 'city-velaris'; i++) {
    const gate = World.route(s.region, 'city-velaris', s.campaign.stage);
    Object.assign(s.player, { x: gate.x, y: gate.y });
    assert(Game.action('interact'));
  }
  assert.equal(s.region, 'city-velaris');
  const plaza = ext.plaza.point || ext.plaza;
  Object.assign(s.player, { x: plaza.x, y: plaza.y });
  const time = () => Calendar.timestamp(s.calendar, s.time);
  let base = Math.floor(time() / 1440) * 1440; if (time() > base + 590) base += 1440;
  scope.jump = minute => { const change = base + minute - time(); assert(change >= 0); s.calendar.offset += change; };
  scope.frames = n => { for (let i = 0; i < n; i++) Game.step(1 / 60, {}); };
  scope.ext = ext;
  return s;
}
function snapshot(scope) {
  const { Game, UrbanLife, ActorArt, World } = scope, s = Game.s, drawn = [], draw = ActorArt.draw;
  const before = scope.pathCalls;
  try {
    ActorArt.draw = (_c, skin, x, y, o) => {
      assert(World.canWalk(x, y, 5), `Residente fuori dal suolo percorribile (${x}, ${y})`);
      drawn.push({ skin, x, y, moving: o.moving, dir: o.dir });
    };
    for (const actor of UrbanLife.actors(s)) actor.draw(null);
  } finally { ActorArt.draw = draw; }
  const paths = scope.pathCalls - before;
  return { scene: JSON.stringify({ drawn, view: UrbanLife.view(s, 'velaris-staff-guild'), sites: UrbanLife.sites(s) }), paths, count: drawn.length };
}
// Avanza entrambe le partite fotogramma per fotogramma e confronta una scena ogni `every` fotogrammi.
function run(a, b, frames, every, label, stats, until = null) {
  for (let i = 0; i < frames; i++) {
    a.frames(1); b.frames(1);
    if ((i + 1) % every === 0) compare(a, b, `${label}, fotogramma ${i + 1}`, stats);
    if (until && until(b)) { compare(a, b, `${label}, fotogramma ${i + 1} (fine)`, stats); return i + 1; }
  }
  return frames;
}
function compare(a, b, label, stats) {
  const x = snapshot(a), y = snapshot(b);
  assert.equal(y.scene, x.scene, 'Scene diverse: ' + label);
  stats.scenes++; stats.residents += y.count;
  return { reference: x.paths, target: y.paths, count: y.count };
}

const results = [];
const check = (name, fn) => {
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 400)); }
};
// Lettura del runtime (tratte conservate) tramite la strumentazione di PERF-002, senza API aggiunte al gioco.
function legsOf(scope) {
  const rt = scope.__npcBench.useRuntime(scope.Game.s);
  if (!rt?.legs) return null;
  const today = Math.floor(scope.Calendar.timestamp(scope.Game.s.calendar, scope.Game.s.time) / 1440);
  let points = 0, bytes = 0; const days = new Set();
  for (const [key, leg] of rt.legs) { days.add(leg.day); if (leg.pts) { points += leg.pts.length / 2; bytes += leg.pts.byteLength; } bytes += key.length * 2 + 48; }
  return { legs: rt.legs.size, points, bytes, days: [...days].sort((x, y) => x - y), today,
    warmedToday: !!rt.store?.warmed.has(today), warmedTomorrow: !!rt.store?.warmed.has(today + 1) };
}

function scenario(population, mutate = null) {
  const a = load(reference), b = load(target, mutate);
  begin(a, population); begin(b, population);
  const stats = { scenes: 0, residents: 0 }, notes = {};
  a.jump(10 * 60); b.jump(10 * 60);
  compare(a, b, 'salto alle 10:00', stats);
  // Giorno: il tempo scorre finché il calcolo anticipato di oggi è finito (al massimo 6000 fotogrammi).
  notes.warmDay = run(a, b, 6000, 150, 'giorno', stats, x => legsOf(x)?.warmedToday);
  notes.legsDay = legsOf(b);
  a.jump(22 * 60 - .04); b.jump(22 * 60 - .04);
  notes.jumpEvening = compare(a, b, 'salto alle 21:59', stats);
  // Sera: fino al piano del giorno dopo pronto e alle tratte di domani calcolate.
  notes.warmEvening = run(a, b, 9000, 300, 'sera', stats, x => legsOf(x)?.warmedTomorrow);
  notes.legsEvening = legsOf(b);
  a.jump(24 * 60 - .04); b.jump(24 * 60 - .04);
  run(a, b, 240, 20, 'mezzanotte', stats);
  // Il mattino dopo, all'ora in cui i residenti escono di casa (come il sonno seguito da qualche ora in città).
  a.jump(24 * 60 + 8 * 60); b.jump(24 * 60 + 8 * 60);
  notes.jumpMorning = compare(a, b, 'salto alle 08:00 del giorno dopo', stats);
  // Il giocatore si sposta lontano (come l'uscita da un edificio in un altro quartiere).
  const far = a.ext.waypoints.find(w => w.id === 'orchards-court') || a.ext.waypoints.at(-1);
  for (const x of [a, b]) Object.assign(x.Game.s.player, { x: far.x, y: far.y });
  notes.jumpFar = compare(a, b, 'giocatore spostato in un altro quartiere', stats);
  run(a, b, 300, 50, 'mattino', stats);
  for (const key of ['urban', 'economy', 'reputation', 'calendar'])
    assert.equal(JSON.stringify(b.Game.s[key]), JSON.stringify(a.Game.s[key]), 'Stato salvato diverso: ' + key);
  // I conflitti degli NPC sono esclusi: PERF-005 fase 2 li ha resi continui di proposito (impulsi su una griglia assoluta).
  const saved = x => { const d = JSON.parse(x.Game.exportSave()); delete d.conflicts; delete d.savedAt; return JSON.stringify(d).length; };
  assert.equal(saved(b), saved(a), 'Salvataggio di dimensione diversa (esclusi i conflitti)');
  notes.legsEnd = legsOf(b);
  notes.hash = crypto.createHash('sha256').update(JSON.stringify(snapshot(b).scene)).digest('hex').slice(0, 16);
  return { stats, notes };
}

for (const population of sizes) {
  const label = population ?? 'nativa (95)';
  let first = null;
  check(`${label}: scene identiche a main, residenti sempre su suolo percorribile, stato e salvataggio identici`, () => {
    first = scenario(population);
    const { stats, notes } = first;
    return `${stats.scenes} scene, ${stats.residents} residenti disegnati confrontati; tratte di oggi pronte dopo ${notes.warmDay} fotogrammi, di domani dopo ${notes.warmEvening}`;
  });
  check(`${label}: nel fotogramma del salto nessun percorso da calcolare (main: uno per residente in cammino)`, () => {
    assert(first, 'scenario non eseguito');
    const { jumpEvening: e, jumpMorning: m, jumpFar: f } = first.notes;
    assert.equal(e.target, 0, `salto serale: ${e.target} percorsi`);
    assert.equal(m.target, 0, `salto al mattino: ${m.target} percorsi`);
    assert(f.target <= f.reference, `spostamento: ${f.target} contro ${f.reference}`);
    return `salto serale ${e.reference}→${e.target}, mattino ${m.reference}→${m.target}, altro quartiere ${f.reference}→${f.target} percorsi`;
  });
  check(`${label}: memoria delle tratte limitata a oggi e domani`, () => {
    const { legsDay: d, legsEvening: e, legsEnd: z } = first.notes;
    assert(d && e && z, 'informazioni sulle tratte non disponibili');
    assert(z.days.every(x => x >= z.today), 'tratte di giorni passati conservate: ' + z.days.join(','));
    return `giorno ${d.legs} tratte (${d.points} punti, ~${Math.round(d.bytes / 1024)} KB), sera ${e.legs} (~${Math.round(e.bytes / 1024)} KB), mattino dopo ${z.legs} (~${Math.round(z.bytes / 1024)} KB)`;
  });
  if (population === 500 || (population === null && !sizes.includes(500))) check(`${label}: determinismo (due esecuzioni identiche)`, () => {
    const again = scenario(population);
    assert.equal(again.notes.hash, first.notes.hash);
    return 'impronta ' + first.notes.hash;
  });
}
// Salti ripetuti per più giorni: sera, sonno fino al mattino dopo, salti rapidi nella stessa giornata (12:00, 15:00, 18:00),
// sempre contro main. Controlla scene identiche, nessun percorso nei fotogrammi dei salti e memoria che non cresce con i giorni.
function repeated(population, days = 5) {
  const a = load(reference), b = load(target);
  begin(a, population); begin(b, population);
  const stats = { scenes: 0, residents: 0 }, jumps = [], legs = [];
  a.jump(10 * 60); b.jump(10 * 60);
  compare(a, b, 'salto alle 10:00', stats);
  run(a, b, 6000, 300, 'primo giorno', stats, x => legsOf(x)?.warmedToday);
  for (let k = 0; k < days; k++) {
    const at = minute => { a.jump(k * 1440 + minute); b.jump(k * 1440 + minute); };
    at(22 * 60 - .04); jumps.push(['sera ' + (k + 1), compare(a, b, `giorno ${k + 1}, salto alle 21:59`, stats)]);
    run(a, b, 9000, 400, `giorno ${k + 1}, sera`, stats, x => legsOf(x)?.warmedTomorrow);
    for (const minute of [1440 + 8 * 60, 1440 + 12 * 60, 1440 + 15 * 60, 1440 + 18 * 60]) {
      at(minute); jumps.push([`giorno ${k + 2} ${minute / 60 - 24}:00`, compare(a, b, `giorno ${k + 2}, salto alle ${minute / 60 - 24}:00`, stats)]);
    }
    run(a, b, 120, 60, `giorno ${k + 2}, pomeriggio`, stats);
    legs.push(legsOf(b));
  }
  for (const key of ['urban', 'economy', 'reputation', 'calendar'])
    assert.equal(JSON.stringify(b.Game.s[key]), JSON.stringify(a.Game.s[key]), 'Stato salvato diverso: ' + key);
  return { stats, jumps, legs };
}
for (const population of sizes.includes(500) ? [500] : sizes.slice(-1)) {
  const label = population ?? 'nativa (95)';
  check(`${label}: salti ripetuti per cinque giorni (sera, sonno, 08:00, 12:00, 15:00, 18:00) identici a main, memoria stabile`, () => {
    const r = repeated(population);
    const busy = r.jumps.filter(([, j]) => j.target > 0);
    assert.deepEqual(busy.map(([n, j]) => n + ': ' + j.target), [], 'percorsi calcolati nel fotogramma del salto');
    assert(r.legs.every(l => l.days.every(d => d >= l.today)), 'tratte di giorni passati conservate');
    const sizesKB = r.legs.map(l => Math.round(l.bytes / 1024));
    assert(Math.max(...sizesKB) <= 1.25 * Math.min(...sizesKB) + 50, 'la memoria delle tratte cresce con i giorni: ' + sizesKB.join(', '));
    const saved = r.jumps.reduce((n, [, j]) => n + j.reference, 0);
    return `${r.stats.scenes} scene identiche, ${r.jumps.length} salti, percorsi nei fotogrammi dei salti: main ${saved}, PERF-004 0; memoria per giorno ${sizesKB.join(', ')} KB`;
  });
}
check('Mutazione: tratta conservata senza l’ultimo punto → il confronto con main deve fallire', () => {
  let failed = false;
  try { scenario(sizes.includes(250) ? 250 : sizes[0], src => src.replace('for(let i=0;i<pts.length;i+=2)points.push', 'for(let i=0;i<pts.length-2;i+=2)points.push')); }
  catch (e) { failed = /Scene diverse|percorribile/.test(e.message); if (!failed) throw e; }
  assert(failed, 'la mutazione non è stata rilevata');
  return 'rilevata';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
