/* Mappe di Tiled: importazione, integrazione con il mondo procedurale, collisioni, porte, soste, percorsi dei residenti,
   salvataggi ed errori. Uso: node tests/verifica-mappe-tiled.cjs
   Richiede Python 3 (usa `python build.py --mappe-json` per leggere le mappe come fa la build). */
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
const TEMPLATE = path.join(root, 'mappe', 'orti-dell-alambicco.tmj'), DEMO = path.join(root, 'mappe', 'esempi', 'orti-dimostrazione.tmj');
const AREA = { x: 2114, y: 752, w: 736, h: 736 };
const inArea = (x, y) => x >= AREA.x && y >= AREA.y && x < AREA.x + AREA.w && y < AREA.y + AREA.h;
let checks = 0;
const ok = (value, message) => { assert(value, message); checks++; };
const equal = (a, b, message) => { assert.equal(JSON.stringify(a), JSON.stringify(b), message); checks++; };
const notes = [];

// ---------- strumenti ----------
const python = process.env.PYTHON || 'python';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mappe-tiled-'));
let counter = 0;
/* Scrive una o più mappe (oggetti .tmj) in una cartella temporanea, con i tileset del progetto, e le legge come la build. */
function normalize(...list) {
  const dir = path.join(tmp, 'set' + (counter++));
  fs.mkdirSync(dir);
  list.forEach((map, i) => {
    const copy = JSON.parse(JSON.stringify(map));
    for (const t of copy.tilesets) if (t.source) t.source = path.resolve(path.dirname(map.__from || TEMPLATE), t.source);
    delete copy.__from;
    fs.writeFileSync(path.join(dir, 'mappa-' + i + '.tmj'), JSON.stringify(copy));
  });
  return JSON.parse(cp.execFileSync(python, [path.join(root, 'build.py'), '--mappe-json', '--mappe', dir], { encoding: 'utf8' }));
}
const readMap = file => Object.assign(JSON.parse(fs.readFileSync(file, 'utf8')), { __from: file });
const setProp = (map, name, value) => { map.properties.find(p => p.name === name).value = value; return map; };
const prop = (o, name) => (o.properties || []).find(p => p.name === name)?.value;
const layer = (map, name) => map.layers.find(l => l.name === name);
const active = map => setProp(JSON.parse(JSON.stringify(map)), 'attiva', true);

/* Carica il gioco (senza audio e interfaccia) con le mappe indicate già incorporate. */
function game(maps = [], withLife = false) {
  const surface = () => { const px = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return px.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(px, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
  const store = new Map(), warnings = [];
  const scope = { console: { warn: m => warnings.push(String(m)), log() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  scope.window = scope; scope.TILED_MAPS = maps; scope.__warnings = warnings;
  vm.createContext(scope);
  for (const file of modules) {
    if (file === 'audio.js') break;
    let src = fs.readFileSync(path.join(root, file), 'utf8');
    if (withLife && file === 'urban-life.js') src = src.replace('window.UrbanLife={', 'window.__UL={useRuntime,profiles,dailyPlan,samplePlan,sampleStreet,route,minute:s=>minute(s)};window.UrbanLife={');
    vm.runInContext(src, scope, { filename: file });
  }
  return scope;
}
const snapshot = ext => ({
  buildings: ext.buildings.map(b => [b.id, b.key, b.name, b.kind, b.style, b.color, b.box, b.door, b.front]),
  props: ext.props.map(o => [o.key, o.name, o.x, o.y, o.solid || 0, o.solidBox || null, o.label || null]),
  waypoints: ext.waypoints.map(w => [w.id, w.x, w.y, w.district]),
  residences: ext.residences.map(r => [r.id, r.x, r.y])
});
const walkGrid = (ext, r) => { let s = ''; for (let y = AREA.y; y < AREA.y + AREA.h; y += 6) for (let x = AREA.x; x < AREA.x + AREA.w; x += 6) s += ext.canWalk(x, y, r) ? '1' : '0'; return s; };

// ---------- 1. Il progetto consegnato non cambia il gioco finché una mappa non è attivata ----------
{
  const official = JSON.parse(cp.execFileSync(python, [path.join(root, 'build.py'), '--mappe-json'], { encoding: 'utf8' }));
  equal(official, [], 'nella cartella mappe/ non ci sono mappe attive: la build ufficiale resta quella procedurale');
  const template = readMap(TEMPLATE);
  equal(prop({ properties: template.properties }, 'attiva'), false, 'il modello è consegnato non attivo');
  ok(['terreno', 'decorazioni', 'edifici', 'oggetti', 'collisioni', 'ingressi'].every(n => layer(template, n)), 'il modello ha i sei livelli');
}

// ---------- 2. Il modello attivato senza modifiche non cambia nulla (stesso seme del modello) ----------
const template = readMap(TEMPLATE);
const baseGame = game();
const base = baseGame.UrbanExterior.create(19425);
{
  const maps = normalize(active(template));
  const G = game(maps), ext = G.UrbanExterior.create(19425);
  equal(G.TiledMaps.problems, [], 'nessun problema nel modello');
  equal(snapshot(ext), snapshot(base), 'edifici, oggetti, soste e case identici al mondo procedurale');
  for (const r of [5, 6]) equal(walkGrid(ext, r), walkGrid(base, r), 'collisioni identiche nell’area (raggio ' + r + ')');
  const targets = [base.waypoints.find(w => w.id === 'plaza'), ...base.waypoints.filter(w => inArea(w.x, w.y))];
  for (const b of base.buildings.filter(q => inArea(q.door.x, q.door.y))) for (const t of targets)
    equal(ext.path(b.door, t, 5), base.path(b.door, t, 5), 'stesso percorso dalla porta di ' + b.name);
}

// ---------- 3. Su un altro seme l'area segue la mappa, il resto della città resta procedurale ----------
{
  const maps = normalize(active(template));
  const G = game(maps), ext = G.UrbanExterior.create(555), plain = baseGame.UrbanExterior.create(555);
  const mine = b => inArea(b.door.x, b.door.y);
  equal(ext.buildings.filter(mine).map(b => [b.key, b.box]), base.buildings.filter(mine).map(b => [b.key, b.box]), 'gli Orti hanno la disposizione della mappa anche con il seme 555');
  equal(ext.buildings.filter(b => !mine(b)).map(b => [b.id, b.box]), plain.buildings.filter(b => !mine(b)).map(b => [b.id, b.box]), 'il resto di Velaris è quello procedurale del seme 555');
  const keys = ext.props.filter(o => inArea(o.x, o.y)).map(o => o.key);
  equal(keys.length, new Set(keys).size, 'nessun oggetto duplicato nell’area');
  equal(G.TiledMaps.verify(ext, AREA).errors, [], 'porte, soste e sovrapposizioni corrette con il seme 555');
}

// ---------- 4. Mappa di dimostrazione: le modifiche fatte in Tiled arrivano nel gioco ----------
const demoMaps = normalize(readMap(DEMO));
{
  const G = game(demoMaps), ext = G.UrbanExterior.create(19425), e = G.TiledMaps.edits('city-velaris');
  equal(G.TiledMaps.problems, [], 'la dimostrazione è valida');
  const byKey = k => ext.buildings.find(b => b.key === k);
  ok(!byKey('annesso-4-1'), 'la Casa Selce è stata demolita');
  ok(!ext.props.some(o => o.key === 'planter@annesso-4-1'), 'con la sua fioriera');
  equal(byKey('annesso-5-3').box.x, base.buildings.find(b => b.key === 'annesso-5-3').box.x - 20, 'la Casa Vetro è spostata di 20 pixel');
  equal(byKey('annesso-5-3').door.x, base.buildings.find(b => b.key === 'annesso-5-3').door.x - 20, 'e la sua porta la segue');
  const fresh = ext.buildings.find(b => b.name === 'Casa del Frutteto');
  ok(fresh && fresh.key.startsWith('tiled-') && fresh.style === 'cottage' && fresh.kind === 'residence', 'la casa nuova esiste ed è un’abitazione');
  ok(ext.residences.some(r => r.id === fresh.id), 'e i residenti la possono usare come casa');
  equal(new Set(ext.buildings.map(b => b.id)).size, ext.buildings.length, 'nessun id di edificio duplicato');
  equal(ext.props.filter(o => o.name === 'fruitTree' && inArea(o.x, o.y)).length, 12, 'otto alberi da frutto esistenti più quattro nuovi');
  ok(ext.props.some(o => o.name === 'stall' && o.x === 2484 && o.y === 1246 && o.solid === 9), 'la bancarella nuova è solida come quelle procedurali');
  ok(!ext.canWalk(2628, 1138, 5) && base.canWalk(2628, 1138, 5), 'l’aiuola con la collisione non si calpesta più');
  ok(!ext.canWalk(2172, 1172, 5), 'gli alberi nuovi bloccano il passaggio come quelli procedurali');
  equal([...e.terrain.cells].filter(k => k >= 0).length, 4 * 3 + 6 * 3, 'trenta piastrelle di terreno dipinte');
  const report = G.TiledMaps.verify(ext, AREA);
  equal(report.errors, [], 'tutte le porte raggiungono la piazza (raggio 5 e 6), soste raggiungibili, nessuna sovrapposizione');
  notes.push('dimostrazione: ' + report.buildings + ' edifici, ' + report.doors + ' porte verificate, ' + report.stops + ' soste');
  for (const seed of [555, 2024]) equal(G.TiledMaps.verify(G.UrbanExterior.create(seed), AREA).errors, [], 'verifica superata anche con il seme ' + seed);
  // determinismo: stessa mappa, stesso risultato
  equal(snapshot(game(demoMaps).UrbanExterior.create(19425)), snapshot(ext), 'risultato deterministico');
}

// ---------- 5. Percorsi dei residenti con la mappa di dimostrazione ----------
{
  const G = game(demoMaps, true), UL = G.__UL;
  let samples = 0, stuck = 0, legs = 0, noRoute = 0, illegal = 0;
  for (const seed of [19425, 555, 2024]) {
    vm.runInContext(`Math.random=(()=>{let n=0;return()=>n++===0?${seed}/4294967296:.24})()`, G);
    assert(G.Game.newGame()); const s = G.Game.s; s.region = 'city-velaris';
    const rt = UL.useRuntime(s), ext = rt.ext, seen = new Set();
    for (let m = 0; m < 1440; m += 20) {
      const C = G.Calendar, cur = ((C.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((m - cur + 1440) % 1440) / (C.minutesPerSecond || .8);
      for (const p of UL.profiles(s.seed).list) {
        samples++;
        const plan = UL.dailyPlan(s, p, rt), ph = UL.samplePlan(plan, UL.minute(s)), st = UL.sampleStreet(s, p, plan, rt);
        const a = ph.previous.point, b = ph.now.point, q = st.point, moved = Math.hypot(a.x - b.x, a.y - b.y) >= 1;
        if (!st.moving && moved && Math.hypot(q.x - b.x, q.y - b.y) > 1 && Math.hypot(q.x - a.x, q.y - a.y) < 1) stuck++;
        if (!moved) continue;
        const key = [a.x, a.y, b.x, b.y].join(',');
        if (seen.has(key)) continue;
        seen.add(key); legs++;
        const road = UL.route(rt, a, b);
        if (!road) { noRoute++; continue; }
        for (let i = 1; i < road.points.length; i++) {           // controllo indipendente: nessun tratto entra in un ostacolo
          const P = road.points[i - 1], Q = road.points[i], n = Math.max(1, Math.ceil(Math.hypot(Q.x - P.x, Q.y - P.y) / .5));
          let bad = false;
          for (let j = 0; j <= n && !bad; j++) bad = !ext.canWalk(P.x + (Q.x - P.x) * j / n, P.y + (Q.y - P.y) * j / n, 5);
          if (bad) { illegal++; break; }
        }
      }
    }
  }
  equal(stuck, 0, 'nessun residente fermo per mancanza di percorso (' + samples + ' campioni)');
  equal(noRoute, 0, 'ogni tratta dei residenti ha un percorso (' + legs + ' tratte)');
  equal(illegal, 0, 'nessun tratto dei residenti attraversa un ostacolo (controllo ogni 0,5 px)');
  notes.push('residenti con la dimostrazione: ' + samples + ' campioni, ' + legs + ' tratte, 0 fermi, 0 senza percorso, 0 tratti illegali');
}

// ---------- 6. Mappe sbagliate: rifiutate con un messaggio chiaro, la zona resta procedurale ----------
{
  const rejected = (label, mutate, expect) => {
    const map = active(template); mutate(map);
    const G = game(normalize(map)), ext = G.UrbanExterior.create(19425);
    const text = JSON.stringify(G.TiledMaps.problems);
    ok(new RegExp(expect).test(text), label + ': segnalato («' + expect + '») — ' + text.slice(0, 160));
    equal(snapshot(ext), snapshot(base), label + ': la zona resta quella procedurale');
    ok(G.__warnings.some(w => w.includes('non applicata')), label + ': avviso in console');
  };
  const edifici = m => layer(m, 'edifici').objects, find = (m, id) => edifici(m).find(o => prop(o, 'id') === id);
  rejected('edificio sovrapposto', m => { const a = find(m, 'annesso-5-3'), b = find(m, 'annesso-5-2'); a.x = b.x + 30; }, 'si sovrappone');
  rejected('porta bloccata', m => { const o = find(m, 'annesso-3-0'), pdx = prop(o, 'portaDx'); layer(m, 'collisioni').objects.push({ id: 900, name: 'muro', x: o.x + 14 + pdx - 10, y: o.y - 8, width: 20, height: 12, rotation: 0, visible: true }); }, 'porta');
  rejected('id copiato due volte', m => { const o = find(m, 'annesso-5-0'); edifici(m).push({ ...JSON.parse(JSON.stringify(o)), id: 901, x: o.x + 400 }); }, 'duplicato');
  rejected('serra spostata', m => { find(m, 'greenhouse').x += 16; }, 'bloccat');
  rejected('porta della serra spostata', m => { layer(m, 'ingressi').objects.find(o => prop(o, 'id') === 'greenhouse').x += 8; }, 'porta di un interno');
  rejected('serra cancellata', m => { layer(m, 'edifici').objects = edifici(m).filter(o => prop(o, 'id') !== 'greenhouse'); }, 'non si possono eliminare');
  rejected('id sconosciuto', m => { find(m, 'annesso-5-1').properties.find(p => p.name === 'id').value = 'annesso-9-9'; }, 'non presente');
  rejected('edificio ruotato', m => { find(m, 'annesso-5-1').rotation = 15; }, 'rotazione');
  rejected('oggetto fuori dalla mappa', m => { layer(m, 'oggetti').objects[0].x = -500; }, 'fuori dalla mappa');
  rejected('stile sconosciuto', m => { find(m, 'annesso-5-4').properties.push({ name: 'stile', type: 'string', value: 'castello' }); }, 'stile');
  rejected('regione sbagliata', m => { setProp(m, 'regione', 'valley'); }, 'Regione non supportata');
  // due mappe attive per la stessa regione: nessuna applicata
  const G = game(normalize(active(template), readMap(DEMO))), ext = G.UrbanExterior.create(19425);
  ok(/Più mappe attive/.test(JSON.stringify(G.TiledMaps.problems)) && JSON.stringify(snapshot(ext)) === JSON.stringify(snapshot(base)), 'due mappe attive per la stessa regione: nessuna viene applicata');
  // tileset mancante: la build si ferma con un messaggio in italiano
  const broken = active(template); broken.tilesets[0].source = 'tileset/non-esiste.tsj';
  const dir = path.join(tmp, 'rotta'); fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, 'm.tmj'), JSON.stringify(broken));
  const run = cp.spawnSync(python, [path.join(root, 'build.py'), path.join(tmp, 'x.html'), '--mappe', dir], { encoding: 'utf8' });
  ok(run.status !== 0 && /tileset non trovato/.test(run.stderr), 'tileset mancante: la build si ferma e lo spiega');
  // livello del terreno salvato in base64 compresso: stesso risultato del CSV
  const zlib = require('node:zlib'), packed = readMap(DEMO), t = layer(packed, 'terreno');
  const buf = Buffer.alloc(t.data.length * 4); t.data.forEach((v, i) => buf.writeUInt32LE(v, i * 4));
  t.data = zlib.deflateSync(buf).toString('base64'); t.encoding = 'base64'; t.compression = 'zlib';
  equal(normalize(packed)[0].layers.find(l => l.name === 'terreno').data, demoMaps[0].layers.find(l => l.name === 'terreno').data, 'terreno in base64+zlib letto come in CSV');
}

// ---------- 7. Salvataggi ----------
{
  const enterCity = G => {
    for (const id of ['ancient-valley', 'verdant-canopy', 'city-velaris']) {
      const gate = G.World.route(G.Game.s.region, id, G.Game.s.campaign.stage);
      Object.assign(G.Game.s.player, gate); assert(G.Game.action('interact'));
    }
    assert.equal(G.Game.s.region, 'city-velaris');
  };
  const seedRandom = G => vm.runInContext('Math.random=(()=>{let n=0;return()=>n++===0?19425/4294967296:.24})()', G);
  // salvataggio fatto senza mappe, con il giocatore dove ora c'è un albero nuovo
  const plain = game(); seedRandom(plain); assert(plain.Game.newGame()); enterCity(plain);
  ok(plain.World.canWalk(2172, 1172, 6), 'nel mondo procedurale quel punto è libero');
  Object.assign(plain.Game.s.player, { x: 2172, y: 1172 });
  const oldSave = plain.Game.exportSave();
  const edited = game(demoMaps); seedRandom(edited); assert(edited.Game.newGame());
  ok(edited.Game.importSave(oldSave), 'un salvataggio precedente si carica con la mappa attiva');
  const p = edited.Game.s.player;
  ok(edited.World.canWalk(p.x, p.y, 6), 'il giocatore non resta incastrato: il motore lo riporta all’ingresso (' + Math.round(p.x) + ',' + Math.round(p.y) + ')');
  // nessun dato nuovo nei salvataggi
  equal(Object.keys(JSON.parse(edited.Game.exportSave())).sort(), Object.keys(JSON.parse(oldSave)).sort(), 'il formato del salvataggio non cambia');
  ok(edited.Game.save() && edited.Game.load(), 'salva e ricarica con la mappa attiva');
  // un salvataggio fatto con la mappa si apre anche senza mappa (la zona torna procedurale)
  enterCity(edited); Object.assign(edited.Game.s.player, { x: 2516, y: 1230 });
  ok(plain.Game.importSave(edited.Game.exportSave()), 'un salvataggio fatto con la mappa si apre anche nella build senza mappe');
}

// ---------- 8. Giro completo con Tiled vero (se installato): la mappa salvata da Tiled dà le stesse modifiche ----------
{
  const exe = process.env.TILED || ['C:\\Program Files\\Tiled\\tiled.exe', '/usr/bin/tiled', '/Applications/Tiled.app/Contents/MacOS/Tiled'].find(p => fs.existsSync(p));
  if (!exe) notes.push('Tiled non installato: giro completo con l’editor non eseguito');
  else {
    const dir = path.join(tmp, 'tiled'); fs.mkdirSync(dir);
    const out = path.join(dir, 'salvata.tmj');
    const run = cp.spawnSync(exe, ['--export-map', 'json', DEMO, out], { encoding: 'utf8', timeout: 60000 });
    ok(run.status === 0 && fs.existsSync(out), 'Tiled apre e salva la mappa di dimostrazione');
    const saved = JSON.parse(fs.readFileSync(out, 'utf8'));
    for (const t of saved.tilesets) if (t.source) t.source = path.resolve(dir, t.source);
    fs.writeFileSync(out, JSON.stringify(saved));
    const strip = G => { const e = G.TiledMaps.edits('city-velaris'); return JSON.stringify({ ...e, file: '', terrain: { ...e.terrain, cells: [...e.terrain.cells] } }); };
    const again = JSON.parse(cp.execFileSync(python, [path.join(root, 'build.py'), '--mappe-json', '--mappe', dir], { encoding: 'utf8' }));
    equal(strip(game(again)), strip(game(demoMaps)), 'la mappa salvata da Tiled ' + saved.tiledversion + ' produce le stesse modifiche');
    notes.push('giro completo con Tiled ' + saved.tiledversion + ': stesse modifiche dopo il salvataggio');
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('OK: mappe di Tiled — ' + checks + ' controlli.');
for (const n of notes) console.log('  · ' + n);
