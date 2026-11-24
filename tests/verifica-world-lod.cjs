// PERF-005 (in ombra): livelli di dettaglio dei luoghi e transizioni fra i cinque livelli (`world-lod.js`), con i dati
// reali del mondo (34 regioni, 5 continenti) caricati dal motore in Node. Il modulo non è nella build né collegato al motore.
// Uso:   node tests/verifica-world-lod.cjs        (ONLY=2,5 per eseguire solo alcuni passi)
// Contratto verificato: ogni luogo ha un solo livello (1 luogo corrente, 2 luoghi collegati e stanze della stessa città,
// 3 stesso continente, 4 continenti confinanti, 5 continenti lontani); un viaggio produce esattamente le transizioni dei luoghi
// che cambiano livello, prima le promozioni e poi i declassamenti; prima di promuovere si risolve il tempo mancante (una volta
// sola, nessun intervallo perso o ripetuto lungo un giro dei cinque continenti); isteresi delle entità vicine (480/560 px);
// caricamento progressivo a quote con ripiego sincrono; errori dei gestori isolati; costo trascurabile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 360)); }
};
function surface() {
  const pixels = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData(_x, _y, w, h) { return pixels.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (t, k) => k in t ? t[k] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}
// Motore fino ad `audio.js` (come le altre prove in Node), poi i due moduli in ombra.
function load(mutate = null) {
  const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, performance, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
  for (const file of ['world-sim.js', 'world-lod.js']) {
    let source = fs.readFileSync(path.join(root, file), 'utf8');
    if (mutate && file === 'world-lod.js') source = mutate(source);
    vm.runInContext(source, scope, { filename: file });
  }
  return scope;
}
// Confronto per contenuto (i valori creati nel contesto vm hanno prototipi diversi da quelli della prova).
const canon = v => JSON.stringify(v, (k, val) => val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort()) : val);
const eq = (a, b, message) => assert.equal(canon(a), canon(b), message);
const x = load(), L = x.WorldLod, places = L.places(x.World);
const byId = Object.fromEntries(places.map(p => [p.id, p]));
const levelsAt = id => L.levels(places, id);
const count = lv => [1, 2, 3, 4, 5].map(k => Object.values(lv).filter(v => v === k).length);

check('1. Luoghi dal mondo reale: 34 regioni, stanze con città madre, collegamenti simmetrici, dungeon riconosciuti', () => {
  assert.equal(places.length, Object.keys(x.World.regions).length);
  assert.equal(places.length, 34);
  for (const p of places) {
    assert.match(p.continent, /^continent-[1-5]$/, p.id + ' senza continente');
    for (const q of p.links) assert(byId[q]?.links.includes(p.id), `collegamento non simmetrico ${p.id} → ${q}`);
  }
  assert.equal(byId['city-velaris-inn'].kind, 'interior'); assert.equal(byId['city-velaris-inn'].parent, 'city-velaris');
  assert.equal(byId['city-filoni-larch-inn'].parent, 'city-filoni'); assert.equal(byId['city-calis-captain-home'].parent, 'city-calis');
  assert.equal(byId['ardel-crypt'].kind, 'dungeon'); assert.equal(byId['nadir-vault'].kind, 'dungeon');
  assert.equal(byId['city-velaris'].kind, 'city'); assert.equal(byId['frost-pass'].kind, 'town'); assert.equal(byId.valley.kind, 'wild');
  eq(byId['ancient-valley'].links, ['ardel-crypt', 'dune-port', 'frost-pass', 'golden-savanna', 'valley', 'verdant-canopy']);
  return `${places.length} luoghi, ${places.filter(p => p.kind === 'interior').length} stanze, ${places.filter(p => p.kind === 'dungeon').length} dungeon`;
});

check('2. Livelli dalla Valle di Vela (continente centrale): 1 qui, 2 collegati, 3 stesso continente, 4 gli altri quattro', () => {
  const lv = levelsAt('valley');
  assert.equal(lv.valley, 1);
  assert.equal(lv.quarry, 2); assert.equal(lv['ancient-valley'], 2);
  for (const id of ['rift', 'ardel-crypt', 'nadir-vault']) assert.equal(lv[id], 3, id);
  for (const id of ['frost-pass', 'city-velaris', 'city-calis-tide-market', 'root-sanctuary']) assert.equal(lv[id], 4, id);
  assert.equal(count(lv)[4], 0, 'dal continente centrale nessun luogo è lontano due continenti');
  assert.equal(Object.keys(lv).length, places.length);
  return 'per livello: ' + count(lv).join(' / ');
});

check('3. Livelli da Filoni (continente esterno): compaiono tutti e cinque i livelli', () => {
  const lv = levelsAt('city-filoni');
  assert.equal(lv['city-filoni'], 1);
  for (const id of ['frost-pass', 'city-filoni-ore-shop', 'city-filoni-wool-shop']) assert.equal(lv[id], 2, id);
  assert.equal(lv['winter-citadel'], 3);
  for (const id of ['valley', 'ancient-valley', 'ardel-crypt']) assert.equal(lv[id], 4, id);
  for (const id of ['city-velaris', 'dune-port', 'golden-savanna']) assert.equal(lv[id], 5, id);
  assert(count(lv).every(n => n > 0), 'manca un livello: ' + count(lv).join('/'));
  return 'per livello: ' + count(lv).join(' / ');
});

check('4. Dentro una stanza: città madre e stanze sorelle a livello 2, i varchi della città a livello 3', () => {
  const lv = levelsAt('city-velaris-inn');
  assert.equal(lv['city-velaris-inn'], 1);
  for (const id of ['city-velaris', 'city-velaris-forge', 'city-velaris-greenhouse']) assert.equal(lv[id], 2, id);
  assert.equal(lv['verdant-canopy'], 3); assert.equal(lv['moon-grove'], 3);
  assert.equal(lv.valley, 4); assert.equal(lv['city-calis'], 5);
});

const tour = ['valley', 'ancient-valley', 'ardel-crypt', 'ancient-valley', 'frost-pass', 'city-filoni', 'city-filoni-larch-inn', 'city-filoni',
  'frost-pass', 'ancient-valley', 'verdant-canopy', 'city-velaris', 'city-velaris-guild', 'city-velaris', 'verdant-canopy', 'ancient-valley',
  'dune-port', 'city-calis', 'city-calis-tide-market', 'city-calis', 'dune-port', 'ancient-valley', 'golden-savanna', 'root-sanctuary', 'golden-savanna', 'ancient-valley', 'valley'];

check('5. Giro dei cinque continenti: transizioni esatte, prima le promozioni, stato sempre uguale al calcolo diretto', () => {
  const state = L.create(places, tour[0]);
  const seen = new Set(), visited = new Map(places.map(p => [p.id, new Set([state.levels[p.id]])]));
  let promotions = 0, demotions = 0;
  for (const to of tour.slice(1)) {
    const before = { ...state.levels }, order = [];
    const r = L.travel(state, places, to, { promote: (id, a, b) => order.push(['p', id, a, b]), demote: (id, a, b) => order.push(['d', id, a, b]) });
    const after = levelsAt(to);
    eq(state.levels, after, 'stato diverso dal calcolo diretto dopo ' + to);
    assert.equal(state.current, to);
    const changed = places.filter(p => before[p.id] !== after[p.id]).map(p => p.id).sort();
    eq([...r.promotions, ...r.demotions].map(t => t.id).sort(), changed, 'transizioni non esatte verso ' + to);
    for (const t of r.promotions) assert(t.to < t.from); for (const t of r.demotions) assert(t.to > t.from);
    const firstDemotion = order.findIndex(o => o[0] === 'd'), lastPromotion = order.map(o => o[0]).lastIndexOf('p');
    assert(firstDemotion < 0 || lastPromotion < firstDemotion, 'declassamento prima di una promozione verso ' + to);
    promotions += r.promotions.length; demotions += r.demotions.length;
    for (const t of [...r.promotions, ...r.demotions]) seen.add(t.from + '→' + t.to);
    for (const p of places) visited.get(p.id).add(state.levels[p.id]);
  }
  assert.equal(L.travel(state, places, 'valley').promotions.length + L.travel(state, places, 'valley').demotions.length, 0, 'restare fermi produce transizioni');
  const full = [...visited.values()].filter(v => v.size === 5).length;
  assert(full > 0, 'nessun luogo è passato per tutti e cinque i livelli');
  return `${tour.length - 1} viaggi, ${promotions} promozioni, ${demotions} declassamenti, ${seen.size} tipi di transizione, ${full} luoghi passati per tutti e cinque i livelli`;
});

check('6. Continuità del tempo lungo il giro: si risolve prima di promuovere, una sola volta, senza intervalli persi o ripetuti', () => {
  const W = x.WorldSim, s = { world: W.create(0), minutes: 0, log: [] };
  try { W.register('lod-prova', { level: 3, step: 60, maxChunks: 1e6, resolve: (st, from, to) => { st.log.push([from, to]); st.minutes += to - from; } }); } catch (e) { if (!/già registrato/.test(e.message)) throw e; }
  const state = L.create(places, tour[0]);
  let now = 0, resolves = 0;
  for (const to of tour.slice(1)) {
    now += 7 * 1440 + 333; // una settimana e qualcosa fra un viaggio e l'altro
    let resolvedHere = 0;
    L.travel(state, places, to, {
      resolve: () => { resolves++; resolvedHere++; W.resolveAll(s, now); },
      promote: () => assert.equal(W.lag(s, now), 0, 'promozione con tempo ancora da risolvere'),
    });
    assert(resolvedHere <= 1, 'tempo risolto più volte nello stesso viaggio');
  }
  W.resolveAll(s, now);
  for (let i = 1; i < s.log.length; i++) assert.equal(s.log[i][0], s.log[i - 1][1], 'buco o sovrapposizione al minuto ' + s.log[i][0]);
  assert.equal(s.minutes, Math.floor(now / 60) * 60, 'minuti risolti diversi dal tempo trascorso');
  return `${resolves} risoluzioni prima delle promozioni, ${s.log.length} ore risolte senza buchi`;
});

check('7. Isteresi delle entità vicine: si entra nel dettaglio pieno entro 480 px e se ne esce oltre 560 px', () => {
  const e = L.entityLevel;
  assert.equal(e(2, 470), 1); assert.equal(e(2, 520), 2); assert.equal(e(1, 520), 1); assert.equal(e(1, 570), 2);
  assert.equal(e(undefined, 470), 1); assert.equal(e(undefined, 600), 2); assert.equal(e(1, NaN), 2);
  let lv = 2, flips = 0;
  for (let i = 0; i < 200; i++) { const next = e(lv, 520 + Math.sin(i) * 30); if (next !== lv) flips++; lv = next; }
  assert.equal(flips, 0, 'oscillazioni intorno al bordo: ' + flips);
});

check('8. Caricamento progressivo: luoghi preparati a quote, ingresso senza lavoro sincrono, nessun doppio caricamento', () => {
  const made = [], ld = L.loader();
  L.prepare(ld, ['frost-pass', 'city-filoni', 'frost-pass']);
  assert.equal(ld.queue.length, 2, 'coda con doppioni');
  let t = 0; const clock = () => t;
  const did = L.work(ld, id => { made.push(id); t += 5; }, 4, clock);
  assert.equal(did, 1, 'la quota non è stata rispettata');
  assert.equal(L.ensure(ld, 'frost-pass', id => made.push(id)), false, 'lavoro sincrono per un luogo già pronto');
  assert.equal(L.ensure(ld, 'city-filoni', id => made.push(id)), true, 'luogo non pronto senza ripiego sincrono');
  assert.equal(ld.queue.length, 0, 'il luogo caricato in modo sincrono è rimasto in coda');
  L.work(ld, id => made.push(id), 4, clock); L.prepare(ld, ['frost-pass']); L.work(ld, id => made.push(id), 4, clock);
  eq(made, ['frost-pass', 'city-filoni'], 'caricamenti ripetuti: ' + made.join(','));
  const bad = L.loader(); L.prepare(bad, ['a', 'b']);
  L.work(bad, id => { if (id === 'a') throw new Error('guasto'); made.push(id); }, Infinity, clock);
  assert(bad.done.has('b') && bad.errors.length === 1, 'un guasto blocca la coda');
  return `sincroni: ${ld.sync}`;
});

check('9. Un gestore che lancia un errore non ferma il viaggio né gli altri gestori', () => {
  const state = L.create(places, 'valley'), seen = [];
  const r = L.travel(state, places, 'city-filoni', { resolve: () => { throw new Error('risoluzione'); }, promote: id => { if (id === 'frost-pass') throw new Error('promozione'); seen.push(id); } });
  assert.equal(state.current, 'city-filoni');
  eq(state.levels, levelsAt('city-filoni'));
  assert.equal(r.errors.length, 2, 'errori non raccolti: ' + r.errors.length);
  assert(seen.includes('city-filoni'), 'gli altri gestori non sono stati chiamati');
});

check('10. Livelli indipendenti dall’ordine dei dati e luogo sconosciuto gestito senza errori', () => {
  const shuffled = places.slice().reverse().map(p => ({ ...p, links: p.links.slice().reverse() }));
  for (const id of ['valley', 'city-filoni', 'city-velaris-inn', 'nadir-vault']) eq(L.levels(shuffled, id), levelsAt(id), id);
  const lv = L.levels(places, 'luogo-inesistente');
  assert(Object.values(lv).every(v => v === 5), 'luogo sconosciuto: livelli non tutti lontani');
  const state = L.create(places, 'luogo-inesistente');
  const r = L.travel(state, places, 'valley');
  assert.equal(r.promotions.length, places.length, 'dal luogo sconosciuto tutti i luoghi devono essere promossi');
});

check('11. Costo: 34 luoghi e un mondo sintetico di 5 000 luoghi', () => {
  const state = L.create(places, 'valley');
  let t = performance.now();
  for (let i = 0; i < 200; i++) L.travel(state, places, tour[i % tour.length]);
  const small = (performance.now() - t) / 200;
  const big = [];
  for (let c = 1; c <= 5; c++) for (let i = 0; i < 1000; i++) {
    const id = `c${c}-${i}`, links = [];
    if (i > 0) links.push(`c${c}-${i - 1}`); if (i < 999) links.push(`c${c}-${i + 1}`);
    if (i === 0 && c > 1) links.push('c1-0');
    if (c === 1 && i === 0) for (let k = 2; k <= 5; k++) links.push(`c${k}-0`);
    big.push({ id, continent: 'continent-' + c, kind: 'town', parent: null, links });
  }
  const s2 = L.create(big, 'c1-0');
  t = performance.now();
  for (let i = 0; i < 20; i++) L.travel(s2, big, i % 2 ? 'c2-5' : 'c1-0');
  const large = (performance.now() - t) / 20;
  assert(small < 2, 'viaggio troppo costoso nel mondo reale: ' + small.toFixed(3) + ' ms');
  assert(large < 50, 'viaggio troppo costoso con 5 000 luoghi: ' + large.toFixed(1) + ' ms');
  return `viaggio nel mondo reale ${small.toFixed(3)} ms; con 5 000 luoghi ${large.toFixed(2)} ms`;
});

check('12. Mutazione: transizioni calcolate prima di risolvere il tempo mancante → rilevata dalla prova 6', () => {
  const src = fs.readFileSync(path.join(root, 'world-lod.js'), 'utf8');
  assert(src.includes('/*RISOLVI*/'), 'punto da mutare assente nel modulo');
  const y = load(s => s.replace('/*RISOLVI*/', '/*RISOLVI*/false&&'));
  const W = y.WorldSim, s = { world: W.create(0), minutes: 0 };
  W.register('lod-mut', { level: 3, step: 60, maxChunks: 1e6, resolve: (st, from, to) => { st.minutes += to - from; } });
  const state = y.WorldLod.create(y.WorldLod.places(y.World), 'valley');
  let detected = false;
  y.WorldLod.travel(state, y.WorldLod.places(y.World), 'city-filoni', {
    resolve: () => W.resolveAll(s, 7 * 1440), promote: () => { if (W.lag(s, 7 * 1440) > 0) detected = true; } });
  assert(detected, 'la mutazione non è stata rilevata');
  return 'rilevata';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
