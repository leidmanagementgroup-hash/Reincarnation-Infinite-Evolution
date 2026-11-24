// Sonda di continuità (PERF-005, preparazione): misura, senza modificare il gioco, quali sistemi danno lo stesso stato del
// mondo vivendo il tempo fotogramma per fotogramma o saltandolo, e se le posizioni dei residenti dipendono solo dall'ora.
// È il contratto che il futuro sistema a livelli di simulazione dovrà rispettare: promuovere o declassare un'entità non deve
// cambiare ciò che il mondo «ricorda». Motore reale in Node, Canvas senza disegno, seme fisso. Non fallisce: riporta.
// Uso:   node tests/sonda-continuita.cjs [--hours 9] [--sizes native,500] [--out risultati.json]
// Parte A — notte: due partite identiche alla locanda di Vela alle 21:00; A vive 9 ore di fotogrammi (1/60 s), B dorme fino
//   alle 06:00 (Game.command('sleep'), l'unico salto di tempo del gioco). Si confrontano, sistema per sistema, gli stati del
//   mondo: calendario, economia (mercati e flussi), borghi (Society), costruzioni, Velaris (scorte e commissione), conflitti
//   degli NPC, memoria/richieste/voci di Living World, mostri congelati delle regioni non correnti.
// Parte B — Velaris: due partite nella piazza alle 10:00; A vive 4 ore di fotogrammi, B salta il calendario alle 14:00; poi
//   entrambe attendono che il lavoro di fondo finisca e si confrontano i residenti disegnati (posizione, movimento, direzione).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const hours = Number(opt('hours', '9'));
const sizes = opt('sizes', 'native,500').split(',').map(s => s === 'native' ? null : Number(s));
const outFile = opt('out', '');
const root = path.resolve(__dirname, '..');
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
function load() {
  const { instrumentPopulation } = require(path.join(root, 'tests', 'benchmark-npc.cjs'));
  const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, performance, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) {
    if (file === 'audio.js') break;
    let source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file === 'urban-life.js') source = instrumentPopulation(source);
    vm.runInContext(source, scope, { filename: file });
  }
  return scope;
}
function begin(scope, population = null) {
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${SEED} / 4294967296; if (k === 1) return .24;
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, scope);
  if (!scope.Game.newGame()) throw new Error('nuova partita');
  scope.__npcPopulation(population, SEED);
  const s = scope.Game.s, { Calendar } = scope;
  scope.minute = () => Calendar.view(scope.Game.s.calendar, scope.Game.s.time, scope.Game.s.region).minutes;
  scope.frames = n => { for (let i = 0; i < n; i++) scope.Game.step(1 / 60, {}); };
  scope.toMinute = m => { scope.Game.step(1 / 60, {}, ((m - scope.minute() + 1440) % 1440) * 1800 / 1440); scope.frames(2); };
  scope.travel = target => {
    for (let i = 0; i < 12 && scope.Game.s.region !== target; i++) {
      const gate = scope.World.route(scope.Game.s.region, target, scope.Game.s.campaign.stage);
      Object.assign(scope.Game.s.player, { x: gate.x, y: gate.y }); scope.frames(2); scope.Game.action('interact'); scope.frames(2);
    }
    if (scope.Game.s.region !== target) throw new Error('viaggio non riuscito verso ' + target);
  };
  return s;
}
const json = x => JSON.stringify(x, (k, v) => typeof v === 'bigint' ? String(v) : v);
const hash = x => crypto.createHash('sha256').update(json(x) ?? 'undefined').digest('hex').slice(0, 12);
// Differenze fra due strutture: numero di foglie diverse e i primi percorsi, con i valori.
function diff(a, b, at = '', out = []) {
  if (json(a) === json(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], at ? at + '.' + k : k, out);
  } else out.push([at, json(a)?.slice(0, 40), json(b)?.slice(0, 40)]);
  return out;
}
const report = { hours, nights: [], velaris: [] };

// ----- Parte A: una notte vissuta contro una notte dormita
{
  const a = load(), b = load();
  for (const x of [a, b]) {
    begin(x); x.travel('valley');
    const inn = x.Tradecraft.inn; Object.assign(x.Game.s.player, { x: inn.x, y: inn.y + 14 }); x.frames(2);
    x.toMinute(21 * 60);
  }
  const startDay = a.Calendar.absoluteDays(a.Game.s.calendar, a.Game.s.time);
  const t0 = performance.now();
  const frames = Math.round(hours * 60 / a.Calendar.minutesPerSecond * 60);
  a.frames(frames);
  const liveMs = performance.now() - t0;
  const t1 = performance.now();
  const slept = b.Game.command('sleep');
  b.frames(2);
  const sleepMs = performance.now() - t1;
  const systems = {
    'calendario (giorno, minuto)': x => [x.Calendar.absoluteDays(x.Game.s.calendar, x.Game.s.time), Math.floor(x.minute())],
    'economia: mercati': x => x.Game.s.economy?.markets,
    'economia: flussi e carovane': x => x.Game.s.economy?.flows,
    'borghi (Society)': x => x.Game.s.society?.towns,
    'costruzioni (Build)': x => x.Game.s.build,
    'Velaris: scorte della città': x => x.Game.s.urban?.city,
    'conflitti delle regioni lontane': x => { const c = x.Game.s.conflicts, here = x.Game.s.region;
      return { people: Object.fromEntries(Object.entries(c?.people || {}).filter(([, p]) => p.point?.region !== here)),
        regions: Object.fromEntries(Object.entries(c?.regions || {}).filter(([r]) => r !== here)) }; },
    'conflitto nella regione del giocatore (atteso diverso: scontro vissuto contro forma astratta)': x => { const c = x.Game.s.conflicts, here = x.Game.s.region;
      return { people: Object.fromEntries(Object.entries(c?.people || {}).filter(([, p]) => p.point?.region === here)), region: c?.regions?.[here] }; },
    'Living World (memoria, richieste, voci)': x => [x.Game.s.memory, x.Game.s.requests, x.Game.s.renown],
    'mostri congelati delle altre regioni': x => Object.fromEntries(Object.entries(x.Game.s.regions || {}).filter(([id]) => id !== x.Game.s.region)),
  };
  const rows = Object.entries(systems).map(([name, pick]) => {
    const d = diff(pick(a), pick(b));
    return { system: name, equal: d.length === 0, differences: d.length, examples: d.slice(0, 3) };
  });
  report.nights.push({ startDay, frames, liveMs: Math.round(liveMs), sleepOk: !!slept, sleepMs: Math.round(sleepMs),
    endA: [a.Calendar.absoluteDays(a.Game.s.calendar, a.Game.s.time), Math.floor(a.minute())],
    endB: [b.Calendar.absoluteDays(b.Game.s.calendar, b.Game.s.time), Math.floor(b.minute())], rows });
}

// ----- Parte B: residenti di Velaris, quattro ore vissute contro un salto del calendario
function scene(x) {
  const drawn = [], draw = x.ActorArt.draw;
  try { x.ActorArt.draw = (_c, skin, px, py, o) => drawn.push([skin, Math.round(px * 100) / 100, Math.round(py * 100) / 100, o.moving, o.dir]); for (const a of x.UrbanLife.actors(x.Game.s)) a.draw(null); }
  finally { x.ActorArt.draw = draw; }
  return drawn;
}
for (const population of sizes) {
  const a = load(), b = load();
  for (const x of [a, b]) {
    begin(x, population); x.travel('city-velaris');
    const plaza = x.UrbanWorld.exterior(x.Game.s.seed).plaza; Object.assign(x.Game.s.player, plaza.point || plaza); x.frames(2);
    x.toMinute(10 * 60); x.frames(600);
  }
  const t0 = performance.now();
  a.frames(Math.round(4 * 60 / a.Calendar.minutesPerSecond * 60));
  const liveMs = performance.now() - t0;
  // B salta il calendario esattamente all'ora di A (come dopo un sonno o un'uscita dalla città), poi entrambe avanzano insieme
  // finché il lavoro di fondo ha finito.
  const stamp = x => x.Calendar.timestamp(x.Game.s.calendar, x.Game.s.time);
  b.Game.s.calendar.offset += stamp(a) - stamp(b);
  for (const x of [a, b]) x.frames(600);
  const sa = scene(a), sb = scene(b), d = diff(sa, sb);
  report.velaris.push({ population: population ?? 'native', minuteA: Math.round(a.minute() * 100) / 100, minuteB: Math.round(b.minute() * 100) / 100,
    residents: sa.length, equal: d.length === 0, differences: d.length, examples: d.slice(0, 3), liveMs: Math.round(liveMs), hashA: hash(sa), hashB: hash(sb) });
}

console.log(`Parte A — ${hours} ore vissute (${report.nights[0].frames} fotogrammi, ${report.nights[0].liveMs} ms) contro sonno (${report.nights[0].sleepOk ? 'riuscito' : 'RIFIUTATO'}, ${report.nights[0].sleepMs} ms); fine A giorno/minuto ${report.nights[0].endA.join('/')}, fine B ${report.nights[0].endB.join('/')}`);
for (const r of report.nights[0].rows) console.log(`  ${r.equal ? 'uguale ' : 'DIVERSO'}  ${r.system}${r.equal ? '' : ` — ${r.differences} differenze, es. ${r.examples.map(e => e[0] + ': ' + e[1] + ' → ' + e[2]).join(' | ')}`}`);
console.log('Parte B — residenti di Velaris: 4 ore vissute contro salto del calendario');
for (const r of report.velaris) console.log(`  ${r.equal ? 'uguale ' : 'DIVERSO'}  ${r.population} residenti, ${r.residents} disegnati, minuto ${r.minuteA}/${r.minuteB}${r.equal ? '' : ` — ${r.differences} differenze, es. ${r.examples.map(e => e[0] + ': ' + e[1] + ' → ' + e[2]).join(' | ')}`} (${r.liveMs} ms di fotogrammi)`);
if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
