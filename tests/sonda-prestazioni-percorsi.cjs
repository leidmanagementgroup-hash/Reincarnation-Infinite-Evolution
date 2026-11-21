// Sonda PERF-001: misura ripetibile del costo di path() di Velaris sulle tratte reali dei residenti.
// Uso: node tests/sonda-prestazioni-percorsi.cjs [opzioni]
//   --root <cartella>     sorgenti da misurare (predefinita: la cartella del progetto)
//   --seeds 555,2024,...  semi (predefiniti: 555,2024,1,77,3,19425)
//   --reps N              ripetizioni, ognuna con una città nuova e memorie vuote (predefinito 3)
//   --save-legs <file>    salva le tratte raccolte dalle routine; --legs <file> usa tratte salvate (confronto fra versioni)
//   --dump <file>         salva i percorsi restituiti (per verificare che un'ottimizzazione non li cambi)
//   --json                stampa solo il riassunto in JSON
// Condizioni fisse: per ogni seme si crea una città nuova (UrbanExterior.create, nessuna memoria condivisa), si chiama
// path(a,b,5) una volta per tratta nell'ordine in cui le routine le producono (minuti 0..1440 ogni 20), con raggio 5 come
// urban-life.js. Il tempo misurato è solo quello di path().
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const root = path.resolve(opt('--root') || path.join(__dirname, '..'));
const seeds = (opt('--seeds') || '555,2024,1,77,3,19425').split(',').map(Number);
const reps = Math.max(1, Number(opt('--reps') || 3));

function load(dir) {
  const modules = fs.readFileSync(path.join(dir, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const surface = () => { const px = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return px.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(px, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
  const store = new Map(), scope = { console: { warn() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  scope.window = scope; vm.createContext(scope);
  for (const f of modules) {
    if (f === 'audio.js') break;
    let src = fs.readFileSync(path.join(dir, f), 'utf8');
    if (f === 'urban-life.js') src = src.replace('window.UrbanLife={', 'window.__UL={useRuntime,profiles,dailyPlan,samplePlan,minute:s=>minute(s)};window.UrbanLife={');
    vm.runInContext(src, scope, { filename: f });
  }
  scope.newGame = seed => { vm.runInContext(`Math.random=(()=>{let n=0;return()=>n++===0?${seed}/4294967296:.24})()`, scope); if (!scope.Game.newGame()) throw new Error('newGame'); const s = scope.Game.s; s.region = 'city-velaris'; return s; };
  scope.setMinute = (s, m) => { const C = scope.Calendar; const cur = ((C.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((m - cur + 1440) % 1440) / (C.minutesPerSecond || .8); };
  return scope;
}

const W = load(root);
let legs;
if (opt('--legs')) legs = JSON.parse(fs.readFileSync(opt('--legs'), 'utf8'));
else {
  // Tratte distinte prodotte dalle routine di questa versione (stesso criterio delle sonde di BUG-011).
  legs = [];
  for (const seed of seeds) {
    const s = W.newGame(seed), UL = W.__UL, rt = UL.useRuntime(s), seen = new Set();
    // le routine chiamano path() per scegliere le soste: si raccolgono le tratte senza misurare
    for (let m = 0; m < 1440; m += 20) {
      W.setMinute(s, m);
      for (const p of UL.profiles(s.seed).list) {
        const ph = UL.samplePlan(UL.dailyPlan(s, p, rt), UL.minute(s)), a = ph.previous.point, b = ph.now.point;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 1) continue;
        const k = [a.x, a.y, b.x, b.y].join(',');
        if (seen.has(k)) continue;
        seen.add(k); legs.push({ seed, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } });
      }
    }
  }
}
if (opt('--save-legs')) fs.writeFileSync(opt('--save-legs'), JSON.stringify(legs));

const now = () => Number(process.hrtime.bigint()) / 1e6;
const times = [], firsts = [], dump = [], slow = [];
let total = 0;
for (let rep = 0; rep < reps; rep++) {
  for (const seed of [...new Set(legs.map(l => l.seed))]) {
    const ext = W.UrbanExterior.create(seed);      // città nuova: nessuna memoria di percorsi o di passi
    let first = true, order = 0;
    for (const leg of legs) {
      if (leg.seed !== seed) continue;
      const t0 = now(), out = ext.path(leg.a, leg.b, 5), ms = now() - t0;
      times.push(ms); total += ms;
      if (first) { firsts.push(ms); first = false; }
      if (ms > 30) slow.push({ rep, seed, order, ms: +ms.toFixed(1), length: Math.round(Math.hypot(leg.a.x - leg.b.x, leg.a.y - leg.b.y)) });
      order++;
      if (rep === 0) dump.push(out.map(p => [p.x, p.y]));
    }
  }
}
if (args.includes('--slow')) console.log(JSON.stringify(slow.slice(0, 20)));
if (opt('--dump')) fs.writeFileSync(opt('--dump'), JSON.stringify(dump));
const sorted = [...times].sort((a, b) => a - b), q = f => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))].toFixed(2);
const summary = { root: path.basename(root), legs: legs.length, calls: times.length, reps, mean: +(total / times.length).toFixed(2), p50: q(.5), p95: q(.95), p99: q(.99),
  max: +sorted[sorted.length - 1].toFixed(1), over30: times.filter(t => t > 30).length, over16: times.filter(t => t > 16).length,
  over30PerRep: +(times.filter(t => t > 30).length / reps).toFixed(1), firstCallMean: +(firsts.reduce((a, b) => a + b, 0) / firsts.length).toFixed(1), totalMs: Math.round(total),
  empty: dump.filter(d => !d.length).length };
console.log(JSON.stringify(summary));
