// Controlla le mappe di Tiled attive prima di provarle nel gioco.
// Uso:  node strumenti/verifica-mappe.cjs [cartella delle mappe]      (predefinita: mappe)
// Controlla: lettura della mappa, errori di importazione, porte libere e raggiungibili dalla piazza (raggio 5 e 6),
// edifici sovrapposti, oggetti duplicati, soste raggiungibili, percorsi dei residenti per un giorno intero su tre semi
// (nessun residente fermo, nessun tratto che attraversa un ostacolo). Esce con codice 1 se trova errori.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const folder = path.resolve(process.argv[2] || path.join(root, 'mappe'));
const python = process.env.PYTHON || 'python';
let maps;
try { maps = JSON.parse(cp.execFileSync(python, [path.join(root, 'build.py'), '--mappe-json', '--mappe', folder], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); }
catch (e) { console.error('✗ ' + (e.stderr || e.message).trim()); process.exit(1); }
if (!maps.length) { console.log('Nessuna mappa attiva in ' + folder + ' (in Tiled: Mappa → Proprietà della mappa → attiva = sì).'); process.exit(0); }

const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
const surface = () => { const px = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return px.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(px, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
const store = new Map(), G = { console: { warn() {}, log() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
G.window = G; G.TILED_MAPS = maps; vm.createContext(G);
for (const file of modules) {
  if (file === 'audio.js') break;
  let src = fs.readFileSync(path.join(root, file), 'utf8');
  if (file === 'urban-life.js') src = src.replace('window.UrbanLife={', 'window.__UL={useRuntime,profiles,dailyPlan,samplePlan,sampleStreet,route,minute:s=>minute(s)};window.UrbanLife={');
  vm.runInContext(src, G, { filename: file });
}
let failed = false;
const say = (good, text) => { console.log((good ? '✓ ' : '✗ ') + text); if (!good) failed = true; };
for (const m of maps) console.log('Mappa: ' + m.file + ' — ' + (m.properties.nome || '') + ' (regione ' + m.properties.regione + ')');
const ext = G.UrbanExterior.create(19425), e = G.TiledMaps.edits('city-velaris');
for (const p of G.TiledMaps.problems) {
  for (const w of p.warnings) console.log('! ' + p.file + ': ' + w);
  for (const err of p.errors) say(false, p.file + ': ' + err);
}
if (!e) { say(false, 'La mappa non viene applicata: nel gioco la zona resterebbe quella procedurale.'); process.exit(1); }
say(true, 'Mappa letta e applicata: ' + e.buildings.length + ' edifici, ' + e.props.length + ' oggetti, ' + e.solids.length + ' collisioni, ' + e.stops.length + ' soste, ' +
  (e.terrain ? [...e.terrain.cells].filter(k => k >= 0).length : 0) + ' piastrelle di terreno.');
for (const seed of [19425, 555, 2024]) {
  const report = G.TiledMaps.verify(seed === 19425 ? ext : G.UrbanExterior.create(seed), e.area);
  say(!report.errors.length, 'Seme ' + seed + ': ' + report.doors + ' porte e ' + report.stops + ' soste raggiungibili dalla piazza' + (report.errors.length ? ' — ' + report.errors.join(' ') : ''));
  for (const w of report.warnings) console.log('! ' + w);
}
const UL = G.__UL;
let samples = 0, stuck = 0, legs = 0, noRoute = 0, illegal = 0;
for (const seed of [19425, 555, 2024]) {
  vm.runInContext(`Math.random=(()=>{let n=0;return()=>n++===0?${seed}/4294967296:.24})()`, G);
  G.Game.newGame(); const s = G.Game.s; s.region = 'city-velaris';
  const rt = UL.useRuntime(s), seen = new Set();
  for (let minute = 0; minute < 1440; minute += 20) {
    const C = G.Calendar, cur = ((C.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((minute - cur + 1440) % 1440) / (C.minutesPerSecond || .8);
    for (const p of UL.profiles(s.seed).list) {
      samples++;
      const plan = UL.dailyPlan(s, p, rt), ph = UL.samplePlan(plan, UL.minute(s)), st = UL.sampleStreet(s, p, plan, rt);
      const a = ph.previous.point, b = ph.now.point, q = st.point, moved = Math.hypot(a.x - b.x, a.y - b.y) >= 1;
      if (!st.moving && moved && Math.hypot(q.x - b.x, q.y - b.y) > 1 && Math.hypot(q.x - a.x, q.y - a.y) < 1) stuck++;
      const key = [a.x, a.y, b.x, b.y].join(',');
      if (!moved || seen.has(key)) continue;
      seen.add(key); legs++;
      const road = UL.route(rt, a, b);
      if (!road) { noRoute++; continue; }
      for (let i = 1; i < road.points.length; i++) {
        const P = road.points[i - 1], Q = road.points[i], n = Math.max(1, Math.ceil(Math.hypot(Q.x - P.x, Q.y - P.y) / .5));
        let bad = false;
        for (let j = 0; j <= n && !bad; j++) bad = !rt.ext.canWalk(P.x + (Q.x - P.x) * j / n, P.y + (Q.y - P.y) * j / n, 5);
        if (bad) { illegal++; break; }
      }
    }
  }
}
say(!stuck && !noRoute && !illegal, 'Residenti per un giorno intero su 3 semi: ' + samples + ' campioni, ' + legs + ' tratte, ' + stuck + ' fermi, ' + noRoute + ' senza percorso, ' + illegal + ' che attraversano ostacoli.');
console.log(failed ? '\nCi sono errori: correggi la mappa in Tiled prima di ricostruire il gioco.' : '\nTutto a posto: ricostruisci con «python build.py» e apri Reincarnation.html.');
process.exit(failed ? 1 : 0);
