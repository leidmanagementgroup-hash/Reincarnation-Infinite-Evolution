// Sonda di costo riproducibile (Living World 2.0, incremento 6): separa simulazione, impulso a bassa frequenza, eventi e
// attività economiche, serializzazione e crescita dello stato, sul motore reale in Node (senza disegno).
// Uso:   node tests/sonda-costi.cjs [radice-del-progetto] [--days 30] [--out misure.json]
//   La radice predefinita è questa cartella; per il confronto prima/dopo passa la cartella di un'altra build (es. ../Reincarnation
//   su main). Seme fisso 19425: le due radici giocano la stessa partita. Il disegno (rendering) e la geometria urbana si misurano
//   nel browser con tests/sonda-sessione.cjs e si confrontano con tests/confronto-mondo.cjs.
// Fasi:
//   A. simulazione per fotogramma (Game.step 1/60 s) in quattro luoghi: Valle, Borgo dei Filoni, Velaris, Porto di Calis;
//   B. funzioni dell'impulso (Economy.tick, Daily.tick e, se esistono, WorldMemory.tick, Requests.tick, Renown.tick) e delle viste
//      lette all'apertura del diario, su uno stato saturo (60 ricordi, 40 voci) quando i moduli esistono;
//   C. serializzazione: durata di Game.exportSave e byte per campo, a inizio partita e con lo stato saturo;
//   D. sessione lunga simulata: N giorni con il passo reale del motore, durata, dimensione del salvataggio, memoria del processo
//      e impronta dello stato finale, ripetuta due volte in due contesti nuovi (stesso seme → stessa impronta).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const days = Number(opt('days', 30));
const outFile = opt('out', '');
const root = path.resolve(args[0] || path.join(__dirname, '..'));
const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);

function surface() {
  const pixels = {
    createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
    getImageData(_x, _y, width, height) { return pixels.createImageData(width, height); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get(target, key) { return key in target ? target[key] : () => undefined; } });
  return { width: 1, height: 1, getContext: () => context };
}
function world() {
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of modules) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return 19425 / 4294967296; if (k === 1) return .24;
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, scope);
  if (!scope.Game.newGame()) throw new Error('nuova partita non riuscita');
  const G = scope.Game;
  const steps = n => { for (let i = 0; i < n; i++) G.step(1 / 60, {}); };
  const minutesNow = () => scope.Calendar.view(G.s.calendar, G.s.time, G.s.region).minutes;
  const advanceMinutes = m => { G.step(1 / 60, {}, m * 1800 / 1440); steps(90); };
  const travelTo = region => {
    for (let i = 0; i < 14 && G.s.region !== region; i++) {
      const gate = scope.World.route(G.s.region, region, G.s.campaign.stage); if (!gate) throw new Error('nessuna rotta verso ' + region);
      Object.assign(G.s.player, { x: gate.x, y: gate.y }); steps(2); G.action('interact'); steps(2);
    }
    if (G.s.region !== region) throw new Error('viaggio non riuscito verso ' + region);
  };
  return { scope, G, steps, advanceMinutes, minutesNow, travelTo };
}
const stats = list => {
  const a = [...list].sort((x, y) => x - y), at = q => a[Math.min(a.length - 1, Math.floor(q * a.length))];
  return { mean: +(a.reduce((n, x) => n + x, 0) / a.length).toFixed(4), p50: +at(.5).toFixed(4), p95: +at(.95).toFixed(4), max: +a.at(-1).toFixed(4) };
};
const time = (fn, n) => { const out = []; for (let i = 0; i < n; i++) { const t = performance.now(); fn(); out.push(performance.now() - t); } return stats(out); };
const bytes = x => Buffer.byteLength(JSON.stringify(x, (k, v) => typeof v === 'bigint' ? String(v) : v) || '', 'utf8');
const report = { root, modules: modules.length, days, node: process.version };
const has = (scope, name) => typeof scope[name] === 'object' && !!scope[name];

// A. Simulazione per fotogramma in quattro luoghi.
{
  const w = world(), { scope, G } = w; report.simulation = {};
  const places = [['valle', 'valley'], ...['filoni', 'velaris', 'calis'].map(id => [id, scope.Economy.profiles.find(p => p.id === id).region])];
  for (const [name, region] of places) {
    w.travelTo(region);
    const m = scope.Economy.profiles.find(p => p.region === region);
    if (m) Object.assign(G.s.player, { x: m.x, y: m.y + 40 });
    w.steps(240);
    const actors = typeof G.actors === 'function' ? (G.actors() || []).length : null;
    report.simulation[name] = { region, actors, step: time(() => G.step(1 / 60, {}), 1800) };
  }
}
// B. Impulso e viste, C. serializzazione (prima e dopo la saturazione).
{
  const w = world(), { scope, G } = w, s = G.s;
  w.travelTo('valley'); for (let d = 0; d < 12; d++) w.advanceMinutes(1440); w.steps(60); // dodici giorni: ricordi e voci su giorni diversi
  const fields = () => Object.fromEntries(Object.keys(s).map(k => [k, bytes(s[k])]).sort((a, b) => b[1] - a[1]));
  const ser = label => { const f = fields(); report.serialization[label] = { total: G.exportSave().length, exportSave: time(() => G.exportSave(), 120),
    top: Object.fromEntries(Object.entries(f).slice(0, 8)), living: Object.fromEntries(['memory', 'careers', 'requests', 'renown'].filter(k => k in f).map(k => [k, f[k]])) }; };
  report.serialization = {}; ser('inizio');
  const lw = has(scope, 'WorldMemory') && has(scope, 'Renown') && has(scope, 'Requests');
  if (lw) {
    const day = scope.Calendar.absoluteDays(s.calendar, s.time), npcs = Object.keys(scope.WorldMemory.people), kinds = Object.keys(scope.WorldMemory.kinds || {});
    const kindList = kinds.length ? kinds : ['shortage-help', 'promise-kept', 'saw-help', 'request-kept', 'heard-praise'];
    const eps = []; for (let d = 6; d >= 0; d--) for (const npc of npcs) for (const kind of kindList) eps.push({ npc, kind, day: Math.max(0, day - d), source: 'self' });
    s.memory = scope.WorldMemory.restore({ schema: 1, episodes: eps, promise: null, reserveDay: -1 }, s);
    const markets = Object.keys(scope.Renown.realms), rk = ['community', 'craft', 'commerce'];
    s.renown = scope.Renown.restore({ schema: 1, seq: 40, deeds: Array.from({ length: 40 }, (_, i) => ({ id: i + 1, kind: rk[i % 3], sign: i % 7 ? 1 : -1, market: markets[i % 5], day: Math.max(0, day - (i % 6)), text: 'Impresa di prova numero ' + (i + 1), heard: true })) }, s);
    report.saturated = { episodes: s.memory.episodes.length, deeds: s.renown.deeds.length };
    console.log('Stato saturo: ' + s.memory.episodes.length + ' ricordi, ' + s.renown.deeds.length + ' voci');
  }
  const pulse = { 'Economy.tick': () => scope.Economy.tick(s) };
  if (lw) Object.assign(pulse, { 'WorldMemory.tick': () => scope.WorldMemory.tick(s), 'Requests.tick': () => scope.Requests.tick(s), 'Renown.tick': () => scope.Renown.tick(s),
    'Requests.view (diario)': () => scope.Requests.view(s), 'Renown.view (diario)': () => scope.Renown.view(s), 'WorldMemory.view (diario)': () => scope.WorldMemory.view(s),
    'WorldMemory.merchantView (Tessa)': () => scope.WorldMemory.merchantView(s) });
  if (has(scope, 'Careers') && scope.Careers.view) pulse['Careers.view (mercato)'] = () => scope.Careers.view(s, 'filoni');
  pulse['Game.view(dettagliata)'] = () => G.view(true);
  report.pulse = Object.fromEntries(Object.entries(pulse).map(([k, fn]) => { try { return [k, time(fn, 400)]; } catch (e) { return [k, 'errore: ' + e.message]; } }));
  ser('satura');
}
// D. Sessione lunga simulata, due volte in contesti nuovi.
report.long = [];
for (let run = 0; run < 2; run++) {
  global.gc?.();
  const heap0 = process.memoryUsage().heapUsed, w = world(), { G } = w, t0 = performance.now(), perDay = [];
  w.travelTo('valley');
  for (let d = 0; d < days; d++) { const t = performance.now(); w.advanceMinutes(1440); w.steps(600); perDay.push(performance.now() - t); }
  const ms = performance.now() - t0, save = G.exportSave(); global.gc?.();
  const strip = JSON.parse(save); delete strip.savedAt;
  report.long.push({ days, ms: Math.round(ms), perDay: stats(perDay), saveBytes: save.length, heapMB: +((process.memoryUsage().heapUsed - heap0) / 1048576).toFixed(1),
    hash: crypto.createHash('sha256').update(JSON.stringify(strip)).digest('hex').slice(0, 16) });
}
report.deterministic = report.long[0].hash === report.long[1].hash;

const f = x => typeof x === 'object' ? `media ${x.mean} · p95 ${x.p95} · max ${x.max} ms` : x;
console.log('Radice: ' + root + ' (' + modules.length + ' moduli)');
for (const [k, v] of Object.entries(report.simulation)) console.log(`A ${k.padEnd(8)} attori ${String(v.actors).padStart(3)} · passo ${f(v.step)}`);
for (const [k, v] of Object.entries(report.pulse)) console.log(`B ${k.padEnd(34)} ${f(v)}`);
for (const [k, v] of Object.entries(report.serialization)) console.log(`C ${k.padEnd(7)} ${(v.total / 1024).toFixed(1)} KB · exportSave ${f(v.exportSave)} · Living World ${JSON.stringify(v.living)} · maggiori ${JSON.stringify(v.top)}`);
for (const [i, v] of report.long.entries()) console.log(`D giro ${i + 1}: ${v.days} giorni in ${v.ms} ms (giorno ${f(v.perDay)}) · salvataggio ${(v.saveBytes / 1024).toFixed(1)} KB · memoria +${v.heapMB} MB · impronta ${v.hash}`);
console.log('Stesso seme → stessa impronta: ' + (report.deterministic ? 'sì' : 'NO'));
if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
process.exit(report.deterministic ? 0 : 1);
