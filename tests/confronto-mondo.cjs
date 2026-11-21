// Confronto geometrico fra due versioni dei moduli del mondo: dimostra che un intervento grafico non cambia
// collisioni, acqua, punti, varchi, rotte e geometria delle regioni.
// Uso:  node tests/confronto-mondo.cjs <cartella-di-riferimento> [cartella-da-provare] [--seeds 19425,555] [--step 4]
// Esempio: node tests/confronto-mondo.cjs ../Reincarnation .   (riferimento = main in un altro worktree)
// Per ogni regione e seme confronta World.canWalk su una griglia (raggi 4, 6 e 10), World.buildWater, dimensioni,
// spawn, punti (risorse, mostri, boss, varchi), luoghi e World.route fra tutte le coppie di regioni.
// Esce con codice 1 alla prima differenza (stampa le prime dieci).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const seeds = opt('seeds', '19425,555,2024,1').split(',').map(Number);
const step = Number(opt('step', 4));
const [refRoot, testRoot = path.resolve(__dirname, '..')] = args.map(a => path.resolve(a));
if (!refRoot) { console.log('Uso: node tests/confronto-mondo.cjs <riferimento> [prova] [--seeds a,b] [--step 4]'); process.exit(2); }

function surface() {
  const pixels = {
    createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
    getImageData(_x, _y, width, height) { return pixels.createImageData(width, height); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    measureText() { return { width: 0 }; }
  };
  const context = new Proxy(pixels, { get(target, key) { return key in target ? target[key] : () => undefined; }, set() { return true; } });
  return { width: 1, height: 1, getContext: () => context };
}
function load(root) {
  const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    matchMedia: () => ({ matches: false, addEventListener() {} }) };
  scope.window = scope; vm.createContext(scope);
  // Solo i moduli che costruiscono World (fino a urban-world.js compreso).
  for (const file of modules) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: path.join(root, file) });
    if (file === 'urban-world.js') break;
  }
  return scope.World;
}
const A = load(refRoot), B = load(testRoot);
const diffs = [];
const differ = (what, a, b) => { if (diffs.length < 10) diffs.push(what + ': ' + JSON.stringify(a).slice(0, 160) + ' ≠ ' + JSON.stringify(b).slice(0, 160)); };
const regionsA = Object.keys(A.regions).sort(), regionsB = Object.keys(B.regions).sort();
if (JSON.stringify(regionsA) !== JSON.stringify(regionsB)) differ('regioni', regionsA, regionsB);
let samples = 0, routes = 0;
const t0 = Date.now();
for (const seed of seeds) {
  for (const id of regionsA) {
    const okA = !!A.setRegion(id, seed), okB = !!B.setRegion(id, seed);
    if (okA !== okB) { differ(`setRegion ${id}/${seed}`, okA, okB); continue; }
    if (!okA) continue;
    const meta = W => JSON.stringify({ r: W.region, w: W.width, h: W.height, spawn: W.spawn, points: W.points, landmarks: W.landmarks });
    if (meta(A) !== meta(B)) differ(`dati ${id}/${seed}`, meta(A), meta(B));
    const { width, height } = A;
    for (let y = 0; y <= height; y += step) for (let x = 0; x <= width; x += step) {
      for (const r of [4, 6, 10]) {
        samples++;
        if (A.canWalk(x, y, r) !== B.canWalk(x, y, r)) differ(`canWalk ${id}/${seed} (${x},${y}) r${r}`, A.canWalk(x, y, r), B.canWalk(x, y, r));
      }
      if (A.buildWater && (A.buildWater(x, y, 6) !== B.buildWater(x, y, 6))) differ(`buildWater ${id}/${seed} (${x},${y})`, A.buildWater(x, y, 6), B.buildWater(x, y, 6));
    }
    if (diffs.length >= 10) break;
  }
  if (diffs.length >= 10) break;
}
for (const from of regionsA) for (const to of regionsA) for (const stage of [0, 2, 5]) {
  routes++;
  const a = JSON.stringify(A.route(from, to, stage)), b = JSON.stringify(B.route(from, to, stage));
  if (a !== b) differ(`route ${from}→${to} (${stage})`, a, b);
}
console.log(`regioni ${regionsA.length}, semi ${seeds.join('/')}, campioni canWalk ${samples}, rotte ${routes}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (diffs.length) { console.log('DIFFERENZE:'); for (const d of diffs) console.log('  ' + d); process.exit(1); }
console.log('Identici: collisioni, acqua, punti, luoghi, varchi e rotte.');
