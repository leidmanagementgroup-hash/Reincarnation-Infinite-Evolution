// PERF-005 (in ombra): prova d'insieme dei quattro moduli della simulazione a livelli — orchestratore `world-sim.js`, livelli dei
// luoghi `world-lod.js`, economia viva `living-economy.js`, residenti autonomi `world-population.js` — collegati come prevede
// il contratto (economia registrata prima della popolazione, passo settimanale, env condiviso). Nessun modulo è nel gioco.
// Uso:   node tests/verifica-mondo-livelli.cjs        (ONLY=2,5 per eseguire solo alcuni passi)
// Contratto verificato: conti esatti fra i due moduli (famiglie + conti dell'economia = iniziale + emesso − distrutto + bottino
// delle spedizioni); viaggi con transizioni fra i cinque livelli e materializzazione dei luoghi vicini che NON cambiano il mondo
// (stessi riassunti per luogo e stessa economia di chi non viaggia); stesso mondo a passo settimanale e con una sola risoluzione;
// salvataggio → ripristino in un contesto nuovo → continuazione identica; ritorno dopo cinque anni; determinismo; giro dei cinque
// continenti sui luoghi reali del gioco con identità uniche e popolazione conservata.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const WEEK = 10080, SEED = 19425;
const SHADOW = ['world-sim.js', 'world-lod.js', 'living-economy.js', 'world-population.js'];
const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  const t0 = performance.now();
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '') + ` [${Math.round(performance.now() - t0)} ms]`); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 400)); }
};
const big = (k, v) => typeof v === 'bigint' ? String(v) : v;
const json = v => JSON.stringify(v, big);
// Contesto con i soli moduli in ombra (mondo sintetico) oppure con il motore fino ad audio.js (luoghi reali).
function context(withGame = false) {
  const scope = { console: { warn() {}, log() {} }, performance };
  if (withGame) {
    const surface = () => { const p = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return p.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(p, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
    const store = new Map();
    Object.assign(scope, { document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } });
  }
  scope.window = scope;
  vm.createContext(scope);
  if (withGame) {
    const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
    for (const file of files) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
  }
  for (const file of SHADOW) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file });
  const { WorldSim: W, LivingEconomy: E, WorldPopulation: P } = scope;
  const env = st => ({ population: { summary: id => P.summary(st.pop, id), transfer: (id, f) => P.transfer(st.pop, id, f) },
    economy: { signals: id => E.signals(st.eco, id) } });
  W.register('living-economy', E.system(st => st.eco, env));
  W.register('population', P.system(st => st.pop, env));
  scope.newWorld = (places, seed = SEED, now = 0) => ({ world: W.create(now), eco: E.create(seed, places, now), pop: P.create(seed, places, now) });
  return scope;
}
// Mondo sintetico: tre continenti a stella, sei luoghi abitati più un dungeon disabitato.
const PLACES = [
  { id: 'vela', continent: 'c1', kind: 'town', population: 260, links: ['serralba', 'cripta'] },
  { id: 'serralba', continent: 'c1', kind: 'city', population: 520, links: ['vela', 'filoni', 'calis'] },
  { id: 'cripta', continent: 'c1', kind: 'dungeon', population: 0, links: ['vela'] },
  { id: 'filoni', continent: 'c2', kind: 'town', population: 240, links: ['serralba', 'hadrin'] },
  { id: 'hadrin', continent: 'c2', kind: 'village', population: 120, links: ['filoni'] },
  { id: 'calis', continent: 'c3', kind: 'city', population: 380, links: ['serralba', 'damar'] },
  { id: 'damar', continent: 'c3', kind: 'village', population: 110, links: ['calis'] },
];
const lodPlaces = list => list.map(p => ({ id: p.id, continent: p.continent, kind: p.kind, parent: null, links: p.links.slice() }));
const fingerprint = (x, s, list = PLACES) => json({ week: [s.pop.week, s.eco.week],
  summaries: list.map(p => [p.id, x.WorldPopulation.summary(s.pop, p.id)]), cells: list.map(p => x.WorldPopulation.cells?.(s.pop, p.id) ?? null),
  economy: x.LivingEconomy.serialize(s.eco) });
const householdWealth = (x, s, list = PLACES) => list.reduce((sum, p) => sum + BigInt(x.WorldPopulation.summary(s.pop, p.id).wealth || '0'), 0n);
const accounts = (x, s) => BigInt(x.LivingEconomy.stats(s.eco).money.accounts);

const X = context();

check('1. Conti esatti fra popolazione ed economia per due anni (famiglie + conti = iniziale + emesso − distrutto + bottino)', () => {
  const s = X.newWorld(PLACES), E = X.LivingEconomy, P = X.WorldPopulation;
  const start = householdWealth(X, s) + accounts(X, s), alive0 = P.stats(s.pop).totals.alive;
  for (let w = 1; w <= 104; w++) {
    X.WorldSim.tick(s, w * WEEK, { budgetMs: Infinity });
    const m = E.stats(s.eco).money, t = P.stats(s.pop).totals;
    const expected = start + BigInt(m.minted) - BigInt(m.burned) + BigInt(t.loot) - BigInt(t.upkeep); // contratto 2: spese delle spedizioni
    assert.equal(String(householdWealth(X, s) + accounts(X, s)), String(expected), `settimana ${w}: Scintille create o perse fra i due moduli`);
    assert.equal(t.alive, alive0 + t.births - t.deaths, `settimana ${w}: vivi ≠ iniziali + nascite − morti`);
    assert(E.audit(s.eco).ok, `settimana ${w}: registro dell'economia non in pari: ` + E.audit(s.eco).problems.slice(0, 2).join('; '));
  }
  const t = P.stats(s.pop).totals, m = E.stats(s.eco).money;
  return `104 settimane: vivi ${alive0} → ${t.alive} (nascite ${t.births}, morti ${t.deaths}, migrazioni ${t.migrations}), salari ${t.wages}, spesa ${t.spend}, tasse ${t.tax}, bottino ${t.loot}, emesse ${m.minted}, distrutte ${m.burned}`;
});

check('2. Viaggi fra i cinque livelli con materializzazione dei luoghi vicini: il mondo è identico a quello di chi non viaggia', () => {
  const L = X.WorldLod, P = X.WorldPopulation, lp = lodPlaces(PLACES);
  const still = X.newWorld(PLACES), moving = X.newWorld(PLACES);
  const lod = L.create(lp, 'vela'), route = ['serralba', 'filoni', 'hadrin', 'filoni', 'serralba', 'calis', 'damar', 'calis', 'serralba', 'vela', 'cripta', 'vela'];
  let materialized = 0, levelsSeen = new Set();
  const promote = s => (id, from, to) => { levelsSeen.add(from).add(to); if (to <= 2) { P.materialize(s.pop, id); materialized++; } };
  for (const id of ['vela', ...lp.find(p => p.id === 'vela').links]) P.materialize(moving.pop, id);
  for (let i = 0; i < route.length; i++) {
    const now = (i + 1) * 9 * WEEK + 777;
    L.travel(lod, lp, route[i], { resolve: () => X.WorldSim.tick(moving, now, { budgetMs: Infinity }), promote: promote(moving) });
    X.WorldSim.tick(moving, now, { budgetMs: Infinity });
    X.WorldSim.tick(still, now, { budgetMs: Infinity });
  }
  assert.equal(fingerprint(X, moving), fingerprint(X, still), 'materializzare durante i viaggi ha cambiato il mondo');
  const records = PLACES.reduce((n, p) => n + P.stats(moving.pop).places[p.id].records, 0);
  assert(records > 1000, 'troppo pochi record materializzati: ' + records);
  return `${route.length} viaggi, livelli attraversati ${[...levelsSeen].sort().join(',')}, ${materialized} promozioni a livello ≤ 2, ${records} record vivi; riassunti ed economia identici`;
});

check('3. Stesso mondo a passo settimanale, a budget minimo nei fotogrammi e con una sola risoluzione (due anni)', () => {
  const a = X.newWorld(PLACES), b = X.newWorld(PLACES), c = X.newWorld(PLACES), end = 104 * WEEK;
  for (let w = 1; w <= 104; w++) X.WorldSim.tick(a, w * WEEK, { budgetMs: Infinity });
  let frames = 0; while (X.WorldSim.lag(b, end) > 0 && frames < 1e5) { X.WorldSim.tick(b, end, { budgetMs: 0 }); frames++; }
  X.WorldSim.resolveAll(c, end);
  assert.equal(fingerprint(X, b), fingerprint(X, a), 'budget minimo diverso dal passo settimanale');
  assert.equal(fingerprint(X, c), fingerprint(X, a), 'una sola risoluzione diversa dal passo settimanale');
  return `identici; a budget minimo ${frames} fotogrammi per due anni`;
});

check('4. Salvataggio a metà → ripristino in un contesto nuovo → continuazione identica', () => {
  const a = X.newWorld(PLACES);
  for (const id of ['vela', 'serralba']) X.WorldPopulation.materialize(a.pop, id);
  X.WorldSim.resolveAll(a, 30 * WEEK + 99);
  const saved = json({ world: a.world, eco: X.LivingEconomy.serialize(a.eco), pop: X.WorldPopulation.serialize(a.pop) });
  X.WorldSim.resolveAll(a, 80 * WEEK);
  const Y = context(), raw = JSON.parse(saved);
  const b = { world: Y.WorldSim.restore(raw.world, 30 * WEEK + 99), eco: Y.LivingEconomy.restore(raw.eco, PLACES, 30 * WEEK + 99), pop: Y.WorldPopulation.restore(raw.pop, PLACES, 30 * WEEK + 99) };
  assert(!b.pop.note, 'ripristino della popolazione con una nota: ' + b.pop.note);
  Y.WorldSim.resolveAll(b, 80 * WEEK);
  assert.equal(fingerprint(Y, b), fingerprint(X, a), 'continuazione diversa dopo il ripristino');
  return `salvataggio di ${(saved.length / 1024).toFixed(1)} KB alla settimana 30, identico alla settimana 80`;
});

check('5. Ritorno dopo cinque anni: una sola risoluzione, conti in pari, nessun errore', () => {
  const s = X.newWorld(PLACES), start = householdWealth(X, s) + accounts(X, s);
  const t0 = performance.now();
  X.WorldSim.resolveAll(s, 260 * WEEK);
  const ms = performance.now() - t0, m = X.LivingEconomy.stats(s.eco).money, t = X.WorldPopulation.stats(s.pop).totals;
  assert.equal(X.WorldSim.failures(s).length, 0, 'sistemi guasti: ' + json(X.WorldSim.failures(s)));
  assert.equal(String(householdWealth(X, s) + accounts(X, s)), String(start + BigInt(m.minted) - BigInt(m.burned) + BigInt(t.loot) - BigInt(t.upkeep)), 'conti non in pari');
  assert.equal(s.pop.week, 260); assert(X.LivingEconomy.audit(s.eco).ok);
  return `260 settimane in ${Math.round(ms)} ms; vivi ${t.alive}, nascite ${t.births}, morti ${t.deaths}, spedizioni concluse con la morte ${t.expeditionDeaths}`;
});

check('6. Determinismo: stesso seme → stesso mondo, seme diverso → mondo diverso', () => {
  const run = seed => { const s = X.newWorld(PLACES, seed); X.WorldSim.resolveAll(s, 40 * WEEK); return fingerprint(X, s); };
  assert.equal(run(SEED), run(SEED)); assert.notEqual(run(SEED), run(SEED + 1));
});

check('7. Luoghi reali del gioco: giro dei cinque continenti con materializzazione, identità uniche e popolazione conservata', () => {
  const G = context(true), L = G.WorldLod, P = G.WorldPopulation;
  const lp = L.places(G.World);
  const pop = p => p.kind === 'city' ? 600 : p.kind === 'town' ? 140 : 0;
  const places = lp.map(p => ({ id: p.id, continent: p.continent, kind: p.kind, population: pop(p), links: p.links }));
  const s = G.newWorld(places), still = G.newWorld(places), lod = L.create(lp, 'valley');
  const tour = ['ancient-valley', 'ardel-crypt', 'ancient-valley', 'frost-pass', 'city-filoni', 'city-filoni-larch-inn', 'city-filoni', 'frost-pass',
    'ancient-valley', 'verdant-canopy', 'city-velaris', 'city-velaris-guild', 'city-velaris', 'verdant-canopy', 'ancient-valley', 'dune-port', 'city-calis',
    'dune-port', 'ancient-valley', 'golden-savanna', 'root-sanctuary', 'golden-savanna', 'ancient-valley', 'valley'];
  let now = 0, promotions = 0;
  for (const to of tour) {
    now += 3 * WEEK + 500;
    const r = L.travel(lod, lp, to, { resolve: () => G.WorldSim.tick(s, now, { budgetMs: Infinity }), promote: (id, a, b) => { if (b <= 2) P.materialize(s.pop, id); } });
    promotions += r.promotions.length;
    assert.equal(r.errors.length, 0, 'errori nei gestori: ' + r.errors.join('; '));
    G.WorldSim.tick(s, now, { budgetMs: Infinity }); G.WorldSim.tick(still, now, { budgetMs: Infinity });
  }
  assert.equal(fingerprint(G, s, places), fingerprint(G, still, places), 'il giro ha cambiato il mondo');
  const ids = places.flatMap(p => P.residents(s.pop, p.id).map(r => r.id));
  assert.equal(new Set(ids).size, ids.length, 'identità duplicate');
  const st = P.stats(s.pop);
  assert.equal(st.totals.alive, places.reduce((n, p) => n + p.population, 0) + st.totals.births - st.totals.deaths);
  return `${places.length} luoghi (${places.filter(p => p.population).length} abitati), ${tour.length} viaggi in ${Math.round(now / WEEK)} settimane, ${promotions} promozioni, ${ids.length} identità uniche, vivi ${st.totals.alive}`;
});

check('8. Assenza oltre dieci anni (600 settimane): una sola risoluzione uguale al passo settimanale, i due moduli sempre alternati', () => {
  const small = PLACES.filter(p => ['filoni', 'hadrin'].includes(p.id)).map(p => ({ ...p, links: p.links.filter(l => ['filoni', 'hadrin'].includes(l)) }));
  const a = X.newWorld(small), b = X.newWorld(small);
  for (let w = 1; w <= 600; w++) X.WorldSim.tick(a, w * WEEK, { budgetMs: Infinity });
  X.WorldSim.resolveAll(b, 600 * WEEK);
  assert.equal(fingerprint(X, b, small), fingerprint(X, a, small), 'il recupero lungo dà un mondo diverso');
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
