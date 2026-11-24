// PERF-005 (in ombra): residenti autonomi `world-population.js`, provati da soli in Node.
// Uso:   node tests/verifica-popolazione.cjs        (ONLY=3,9 per eseguire solo alcune prove)
// Il modulo non è nella build né collegato al motore: le prove lo caricano in un contesto `vm` insieme a `world-sim.js`
// con mondi sintetici e uno stub dell'economia (segnali e trasferimenti calcolati solo dai riassunti della popolazione).
// Contratto verificato: determinismo; equivalenza coorti/record (materializzare alla settimana 0, 30 o mai dà gli stessi
// conteggi per cella e la stessa ricchezza per luogo); conservazione delle persone e delle Scintille; salvataggio →
// ripristino → continuazione identica; risoluzione a blocchi diversi identica (passo per passo, WorldSim settimana per
// settimana, un'unica resolveAll); nessun immortale (notabili compresi); autonomia misurabile; avventurieri con esiti;
// ripristino che non lancia mai; tetti di memoria e relazioni; prestazioni indicative misurate; mutazioni rilevate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const popFile = path.join(root, 'world-population.js');
const simFile = path.join(root, 'world-sim.js');
const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  const t0 = process.hrtime.bigint();
  try {
    const note = fn();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    results.push(['OK', name]);
    console.log('OK   ' + name + (note ? ' — ' + note : '') + ` [${ms.toFixed(0)} ms]`);
  } catch (e) {
    results.push(['FAIL', name]);
    console.log('FAIL ' + name + ' — ' + String(e && e.message).replace(/\s+/g, ' ').slice(0, 400));
  }
};
function fresh(mutate = null, extra = {}) {
  const scope = { console, ...extra };
  scope.window = scope;
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(simFile, 'utf8'), scope, { filename: 'world-sim.js' });
  let source = fs.readFileSync(popFile, 'utf8');
  if (mutate) source = mutate(source);
  vm.runInContext(source, scope, { filename: 'world-population.js' });
  return { P: scope.WorldPopulation, W: scope.WorldSim };
}
const same = (a, b, label) => assert.equal(JSON.stringify(b), JSON.stringify(a), label);
const WEEK = 10080, START = 3 * WEEK + 517, W0 = Math.ceil(START / WEEK);

// Mondo sintetico: due continenti, insediamenti di tipo diverso, un dungeon e un luogo selvaggio collegati.
function world(scale = 1) {
  return [
    { id: 'borgo', continent: 'c1', kind: 'village', population: 180 * scale, links: ['citta', 'grotta', 'bosco'] },
    { id: 'citta', continent: 'c1', kind: 'city', population: 420 * scale, links: ['borgo', 'paese', 'porto'] },
    { id: 'paese', continent: 'c1', kind: 'town', population: 240 * scale, links: ['citta', 'grotta'] },
    { id: 'porto', continent: 'c2', kind: 'town', population: 200 * scale, links: ['citta'] },
    { id: 'grotta', continent: 'c1', kind: 'dungeon', population: 0, links: ['borgo', 'paese'] },
    { id: 'bosco', continent: 'c1', kind: 'wild', population: 0, links: ['borgo'] }
  ];
}
// Stub dell'economia: segnali deterministici per luogo e settimana (crisi, guerra, calamità, carestia).
function signals(id, w) {
  const r = w - W0;
  return {
    foodScarcity: id === 'paese' && r % 20 < 6 ? 450 : 60, priceIndex: 1000,
    wageIndex: id === 'citta' ? 1150 : id === 'borgo' && r >= 10 && r < 20 ? 700 : 950, unemployment: 80,
    prosperity: id === 'citta' ? 1200 : id === 'borgo' && r >= 10 && r < 20 ? 650 : 1000,
    crisis: id === 'borgo' && r >= 10 && r < 20 ? 1 : 0, war: id === 'porto' && r >= 30 && r < 40 ? 1 : 0,
    disaster: id === 'paese' && r === 25 ? 1 : 0, season: Math.floor((w * 7) / 12) % 4
  };
}
const env = w => ({ economy: { signals: id => signals(id, w) } });
// Economia di prova: salari per lavoratore, spesa per abitante e tassa sulla ricchezza, calcolati solo dai riassunti.
function economyWeek(P, pop, list, ledger) {
  for (const pl of list) {
    const s = P.summary(pop, pl.id);
    const wages = {};
    for (const [k, n] of Object.entries(s.workers)) wages[k] = BigInt(n) * 25n;
    const got = P.transfer(pop, pl.id, { wages, spend: BigInt(s.alive) * 6n, tax: BigInt(s.wealth) / 150n });
    if (ledger) { ledger.wages += got.wages; ledger.spend += got.spend; ledger.tax += got.tax; }
  }
}
function run(P, pop, list, from, to, plan = {}, hook = null, ledger = null) {
  for (let w = from; w < to; w++) {
    for (const id of plan[w] || []) P.materialize(pop, id);
    economyWeek(P, pop, list, ledger);
    P.step(pop, w, env(w));
    if (hook) hook(w, pop);
  }
}
const snapshot = (P, pop, list) => JSON.stringify({
  cells: list.map(p => P.cells(pop, p.id)), sums: list.map(p => P.summary(pop, p.id)), totals: P.stats(pop).totals
});
const totalWealth = (P, pop, list) => list.reduce((a, p) => a + BigInt(P.summary(pop, p.id).wealth), 0n);
const allResidents = (P, pop, list) => list.flatMap(p => P.residents(pop, p.id));

check('1. API e forma del riassunto (contratto popolazione ↔ economia)', () => {
  const { P } = fresh(), list = world();
  for (const f of ['create', 'restore', 'serialize', 'step', 'system', 'summary', 'transfer', 'materialize', 'residents', 'person', 'events', 'stats', 'cells', 'decisions', 'influence'])
    assert.equal(typeof P[f], 'function', 'manca ' + f);
  const pop = P.create(19425, list, START);
  let alive = 0;
  for (const pl of list) {
    const s = P.summary(pop, pl.id);
    for (const k of ['alive', 'children', 'adults', 'elders', 'households', 'unemployed', 'adventurers']) assert(Number.isInteger(s[k]) && s[k] >= 0, k + ' non intero');
    assert.equal(s.children + s.adults + s.elders, s.alive, 'stadi che non sommano ai vivi a ' + pl.id);
    assert.equal(typeof s.wealth, 'string'); assert(/^(0|[1-9][0-9]*)$/.test(s.wealth), 'ricchezza non decimale');
    assert.equal(typeof s.workers, 'object');
    const employed = Object.values(s.workers).reduce((a, b) => a + b, 0);
    assert.equal(employed + s.unemployed + s.adventurers, s.adults, 'lavoratori + disoccupati + avventurieri ≠ adulti a ' + pl.id);
    assert.equal(s.alive, pl.population, 'popolazione iniziale diversa a ' + pl.id);
    alive += s.alive;
  }
  same(P.summary(pop, 'ignoto'), P.summary(pop, 'ignoto2'), 'luogo sconosciuto non neutro');
  assert.equal(P.summary(pop, 'ignoto').alive, 0);
  const spec = P.system(s => s.pop);
  assert.equal(spec.level, 3); assert.equal(spec.step, WEEK); assert(Number.isInteger(spec.maxChunks) && spec.maxChunks >= 1);
  assert.equal(P.biology.human.adultDays, 6570, 'età adulta umana diversa dalla regola di society.js');
  assert.equal(P.biology.dwarf.adultDays, 8400, 'età adulta dei nani diversa da ContinentalBiology');
  return `${alive} residenti in ${list.length} luoghi`;
});

check('2. Determinismo: stesso seme → stesso mondo; seme diverso → mondo diverso', () => {
  const go = seed => {
    const { P } = fresh(), list = world(), pop = P.create(seed, list, START);
    run(P, pop, list, W0, W0 + 40, { [W0 + 10]: ['borgo'] });
    return JSON.stringify(P.serialize(pop));
  };
  const a = go(7), b = go(7), c = go(8);
  assert.equal(a, b, 'stesso seme, stato diverso');
  assert.notEqual(a, c, 'semi diversi, stesso stato');
  return `${a.length} caratteri identici`;
});

function equivalence(P, variants, weeks = 60, list = world()) {
  const outs = variants.map(plan => {
    const pop = P.create(19425, list, START), marks = [];
    run(P, pop, list, W0, W0 + weeks, plan, (w, p) => { if ((w - W0) % 15 === 14) marks.push(snapshot(P, p, list)); });
    return { marks, end: snapshot(P, pop, list), pop };
  });
  return outs;
}
check('3. Equivalenza coorti/record: materializzare alla settimana 0, 30 o mai dà gli stessi conteggi e la stessa ricchezza', () => {
  const { P } = fresh();
  const outs = equivalence(P, [{}, { [W0]: ['borgo'] }, { [W0 + 30]: ['borgo'] }, { [W0]: ['borgo', 'citta', 'paese', 'porto'] }, { [W0 + 17]: ['citta'], [W0 + 44]: ['porto', 'borgo'] }]);
  for (let i = 1; i < outs.length; i++) {
    outs[i].marks.forEach((m, k) => assert.equal(m, outs[0].marks[k], `variante ${i}: differenza alla verifica ${k}`));
    assert.equal(outs[i].end, outs[0].end, `variante ${i}: stato finale diverso`);
  }
  const t = P.stats(outs[0].pop).totals;
  assert(t.births > 0 && t.deaths > 0 && t.marriages > 0 && t.migrations > 0 && t.careers > 0 && t.departures > 0, 'mondo troppo statico: ' + JSON.stringify(t));
  return `5 varianti identiche · nascite ${t.births}, morti ${t.deaths}, matrimoni ${t.marriages}, migrazioni ${t.migrations}, mestieri ${t.careers}, spedizioni ${t.departures}`;
});

check('4. materialize è idempotente; i record non tornano mai coorti; le identità restano stabili', () => {
  const { P } = fresh(), list = world(), pop = P.create(3, list, START);
  run(P, pop, list, W0, W0 + 5);
  const n = P.materialize(pop, 'borgo');
  assert.equal(n, P.summary(pop, 'borgo').alive, 'record creati ≠ vivi del luogo');
  const before = JSON.stringify(P.serialize(pop));
  assert.equal(P.materialize(pop, 'borgo'), 0, 'seconda materializzazione non nulla');
  assert.equal(JSON.stringify(P.serialize(pop)), before, 'la seconda materializzazione cambia lo stato');
  assert.equal(P.materialize(pop, 'ignoto'), 0);
  const ids0 = new Map(P.residents(pop, 'borgo').map(r => [r.id, r]));
  for (const id of ids0.keys()) assert(/^borgo:\d+$/.test(id), 'identità non nel formato luogo:n ' + id);
  run(P, pop, list, W0 + 5, W0 + 40, {}, (w, p) => {
    assert.equal(P.stats(p).places.borgo.anonymous, 0, 'persone anonime ricomparse nel luogo materializzato alla settimana ' + w);
    assert.equal(P.residents(p, 'borgo').length, P.summary(p, 'borgo').alive, 'record ≠ vivi alla settimana ' + w);
  });
  for (const [id, r0] of ids0) {
    const r = P.person(pop, id);
    assert(r, 'identità persa: ' + id);
    assert.equal(r.name, r0.name, 'nome cambiato'); assert.equal(r.lineage, r0.lineage, 'stirpe cambiata');
  }
  return `${n} record a borgo, identità stabili per 35 settimane`;
});

check('5. Conservazione: vivi = iniziali + nascite − morti; migrazioni a somma zero; id unici; nessuna resurrezione; Scintille esatte', () => {
  const { P } = fresh(), list = world(), pop = P.create(11, list, START);
  const initial = list.reduce((a, p) => a + p.population, 0), dead = new Set(), ledger = { wages: 0n, spend: 0n, tax: 0n };
  const w0 = totalWealth(P, pop, list);
  run(P, pop, list, W0, W0 + 70, { [W0]: ['borgo', 'paese'], [W0 + 33]: ['citta'] }, (w, p) => {
    const t = P.stats(p).totals, alive = list.reduce((a, pl) => a + P.summary(p, pl.id).alive, 0);
    assert.equal(alive, initial + t.births - t.deaths, 'vivi ≠ iniziali + nascite − morti alla settimana ' + w);
    assert.equal(t.arrivals, t.migrations, 'migrazioni non a somma zero');
    const recs = allResidents(P, p, list), ids = recs.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length, 'id duplicati alla settimana ' + w);
    for (const r of recs) { assert(r.alive, 'morto fra i residenti'); assert(!dead.has(r.id), 'resurrezione di ' + r.id); }
    for (const d of P.decisions(p).deaths) dead.add(d.id);
    for (const pl of list) assert.equal(P.residents(p, pl.id).every(r => r.place === pl.id), true, 'residente in un altro luogo');
    assert.equal(P.stats(p).records.alive, recs.length, 'record vivi fuori da ogni luogo');
  }, ledger);
  const t = P.stats(pop).totals, w1 = totalWealth(P, pop, list);
  assert.equal(String(w1 - w0), String(ledger.wages + BigInt(t.loot) - ledger.spend - ledger.tax), 'Scintille create o perse');
  for (const pl of list) assert(BigInt(P.summary(pop, pl.id).wealth) >= 0n, 'ricchezza negativa');
  return `${initial} → ${initial + t.births - t.deaths} vivi, ${dead.size} morti fra i record, bottino ${t.loot}`;
});

check('6. Salvataggio → ripristino → continuazione identica alla continuazione senza salvataggio', () => {
  const { P } = fresh(), list = world();
  const a = P.create(5, list, START);
  run(P, a, list, W0, W0 + 25, { [W0 + 3]: ['borgo'], [W0 + 12]: ['porto'] });
  const raw = JSON.parse(JSON.stringify(P.serialize(a)));
  const b = P.restore(raw, list, (W0 + 25) * WEEK);
  assert.equal(b.note || '', '', 'ripristino con nota: ' + b.note);
  assert.equal(JSON.stringify(P.serialize(b)), JSON.stringify(raw), 'ripristino non fedele');
  run(P, a, list, W0 + 25, W0 + 50, { [W0 + 30]: ['citta'] });
  run(P, b, list, W0 + 25, W0 + 50, { [W0 + 30]: ['citta'] });
  assert.equal(JSON.stringify(P.serialize(b)), JSON.stringify(P.serialize(a)), 'continuazione diversa dopo il ripristino');
  same(P.events(a), P.events(b), 'registro diverso');
  return `${JSON.stringify(raw).length} caratteri salvati`;
});

check('7. Risoluzione a blocchi diversi: passo per passo = WorldSim settimana per settimana = un’unica resolveAll', () => {
  const list = world(), end = (W0 + 30) * WEEK + 77;
  const direct = (() => {
    const { P } = fresh(), pop = P.create(9, list, START);
    P.materialize(pop, 'borgo');
    for (let w = W0; w < W0 + 30; w++) P.step(pop, w, env(w));
    return JSON.stringify(P.serialize(pop));
  })();
  const viaSim = all => {
    const { P, W } = fresh(), s = { pop: P.create(9, list, START) };
    P.materialize(s.pop, 'borgo');
    W.register('population', P.system(st => st.pop, (st, w) => env(w)));
    s.world = W.create(START);
    if (all) W.resolveAll(s, end); else for (let m = START; m <= end; m += 4 * 1440 + 13) W.tick(s, m, { budgetMs: Infinity });
    W.tick(s, end, { budgetMs: Infinity });
    assert.equal(W.failures().length, 0, 'sistema guasto: ' + JSON.stringify(W.failures()));
    return JSON.stringify(P.serialize(s.pop));
  };
  assert.equal(viaSim(false), direct, 'WorldSim a piccoli passi diverso dal passo diretto');
  assert.equal(viaSim(true), direct, 'resolveAll diverso dal passo diretto');
  // Recupero lungo oltre il tetto: l'intervallo compresso si risolve comunque settimana per settimana.
  const { P, W } = fresh(), s = { pop: P.create(9, list, START) };
  const spec = P.system(st => st.pop, (st, w) => env(w));
  W.register('population', { ...spec, maxChunks: 3 });
  s.world = W.create(START); W.resolveAll(s, end);
  assert.equal(JSON.stringify(P.serialize(s.pop)), (() => { const { P: Q } = fresh(), p = Q.create(9, list, START); for (let w = W0; w < W0 + 30; w++) Q.step(p, w, env(w)); return JSON.stringify(Q.serialize(p)); })(), 'intervallo compresso diverso');
  return '30 settimane identiche in tre modi, anche con intervallo compresso';
});

check('8. Nessun immortale: su un orizzonte lungo muoiono tutti i residenti iniziali, notabili compresi', () => {
  const { P } = fresh();
  const list = [
    { id: 'tana', continent: 'c1', kind: 'village', population: 90, links: ['rifugio'], lineages: { bear: 1 } },
    { id: 'rifugio', continent: 'c1', kind: 'village', population: 30, links: ['tana'], lineages: { human: 1 } }
  ];
  const pop = P.create(77, list, START);
  P.materialize(pop, 'tana'); P.materialize(pop, 'rifugio');
  const initial = allResidents(P, pop, list), notable = initial.filter(r => r.notable);
  assert(notable.length >= 1, 'nessun notabile fra i residenti iniziali');
  let w = W0;
  const alive = () => initial.filter(r => P.person(pop, r.id).alive).length;
  for (; w < W0 + 12000 && alive() > 0; w += 52) for (let k = 0; k < 52; k++) P.step(pop, w + k, { economy: { signals: () => ({}) } });
  assert.equal(alive(), 0, `${alive()} residenti iniziali ancora vivi dopo ${(w - W0) / 52} anni`);
  for (const r of notable) assert.equal(P.person(pop, r.id).alive, false, 'notabile immortale ' + r.id);
  return `${initial.length} iniziali (${notable.length} notabili) tutti morti in ${((w - W0) / 52).toFixed(0)} anni`;
});

function trace(P, pop, list, from, to, plan = {}) {
  const log = { migrations: [], departures: [], careers: [], marriages: [], births: [] };
  run(P, pop, list, from, to, plan, (w, p) => { const d = P.decisions(p); for (const k of Object.keys(log)) for (const x of d[k]) log[k].push({ ...x, week: w }); });
  return log;
}
// Storia con fotografia delle celle all'inizio di ogni settimana (luogo|stirpe|fascia|mestiere|coniugato) e decisioni dei record.
function history(P, pop, list, from, to) {
  const log = { migrations: [], departures: [], careers: [], marriages: [], births: [] }, cellsAt = new Map();
  for (let w = from; w < to; w++) {
    const snap = new Map();
    for (const r of allResidents(P, pop, list)) snap.set(r.id, { sig: [r.place, r.lineage, r.band, r.profession, r.married === 'single' ? 0 : 1].join('|'), r });
    cellsAt.set(w, snap);
    economyWeek(P, pop, list); P.step(pop, w, env(w));
    const d = P.decisions(pop); for (const k of Object.keys(log)) for (const x of d[k]) log[k].push({ ...x, week: w });
  }
  return { log, cellsAt };
}
function autonomy(P) {
  const list = world();
  const base = () => { const pop = P.create(21, list, START); P.materialize(pop, 'borgo'); P.materialize(pop, 'citta'); P.materialize(pop, 'paese'); return pop; };
  const A = base(), people0 = new Map(allResidents(P, A, list).map(r => [r.id, r]));
  const H = history(P, A, list, W0, W0 + 80), la = H.log;
  // Esperimento «a parità di contesto»: si rifà la stessa storia fino alla settimana di un evento, si cambia la personalità di
  // un «pari» (stessa cella all'inizio di quella settimana, che in A non ha agito) e si guarda chi agisce quella settimana.
  const peersOf = (kind, e) => {
    const snap = H.cellsAt.get(e.week), sig = snap.get(e.id)?.sig;
    return [...snap].filter(([id, x]) => id !== e.id && x.sig === sig && !la[kind].some(y => y.id === id && y.week === e.week)).map(([, x]) => x.r);
  };
  const experiment = (kind, pickPeer, patch, filter = () => true) => {
    const e = la[kind].find(x => filter(x) && peersOf(kind, x).length);
    assert(e, 'nessun evento utilizzabile: ' + kind);
    const X = pickPeer(peersOf(kind, e)), B = base();
    run(P, B, list, W0, e.week);
    assert(P.influence(B, X.id, patch), 'influence rifiutata');
    economyWeek(P, B, list); P.step(B, e.week, env(e.week));
    const d = P.decisions(B)[kind];
    assert.equal(d.length, la[kind].filter(y => y.week === e.week).length, 'la personalità ha cambiato quanti agiscono');
    const ref = base(); run(P, ref, list, W0, e.week + 1);
    same(list.map(p => P.cells(ref, p.id)), list.map(p => P.cells(B, p.id)), 'la personalità ha cambiato i conteggi');
    return { e, X, d };
  };
  // (a) Migrazione: un pari con voglia di viaggiare e obiettivo «viaggio» parte al posto di chi era partito.
  const a = experiment('migrations', ps => ps.sort((x, y) => P.person(A, x.id).relations.length - P.person(A, y.id).relations.length)[0],
    { traits: { wanderlust: 100 }, goals: { long: 'journey' }, needs: { wealth: 100, safety: 100, food: 100 } });
  assert(a.d.some(y => y.id === a.X.id), 'la personalità non ha cambiato chi migra');
  // (b) Spedizioni: un pari audace con obiettivo «gloria» parte al posto di un altro.
  const b = experiment('departures', ps => ps.sort((x, y) => x.wounds - y.wounds)[0],
    { traits: { bravery: 100, ambition: 100 }, goals: { long: 'glory' }, needs: { wealth: 100 } });
  assert(b.d.some(y => y.id === b.X.id), 'l’audacia non ha cambiato chi parte all’avventura');
  // (c) Mestieri: chi cambia mestiere, se diventa dedito al proprio (obiettivo «maestria»), resta; cambia un collega.
  const c = experiment('careers', ps => ps[0], {}, x => x.from !== 'none');
  const D = base(); run(P, D, list, W0, c.e.week);
  P.influence(D, c.e.id, { traits: { diligence: 100, ambition: 0 }, goals: { long: 'mastery' }, needs: { wealth: 0 } });
  economyWeek(P, D, list); P.step(D, c.e.week, env(c.e.week));
  const dd = P.decisions(D).careers;
  assert(!dd.some(y => y.id === c.e.id), 'la dedizione non ha cambiato chi cambia mestiere');
  assert.equal(dd.length, la.careers.filter(y => y.week === c.e.week).length, 'quanti cambiano mestiere è cambiato');
  const X = a.X, adv = b.X, ch = c.e;
  // (d) Statistica dentro la cella: chi migra ha più voglia di viaggiare dei pari rimasti; chi parte all'avventura è più audace
  // dei pari rimasti (solo eventi con almeno un pari: nelle celle di una persona la regola decide già chi).
  const mean = xs => xs.reduce((q, v) => q + v, 0) / Math.max(1, xs.length);
  const gap = (kind, trait) => {
    const d = la[kind].map(e => { const ps = peersOf(kind, e); return ps.length ? H.cellsAt.get(e.week).get(e.id).r.traits[trait] - mean(ps.map(p => p.traits[trait])) : null; }).filter(v => v !== null);
    return [mean(d), d.length];
  };
  const [mig, nm] = gap('migrations', 'wanderlust'), [bra, nb] = gap('departures', 'bravery');
  assert(nm >= 3 && mig > 10, `migranti non più inclini al viaggio dei pari (${mig.toFixed(1)} su ${nm} eventi)`);
  assert(nb >= 2 && bra > 10, `avventurieri partiti non più audaci dei pari (${bra.toFixed(1)} su ${nb} eventi)`);
  // (e) Famiglie da relazioni: i matrimoni fra persone che si conoscevano superano nettamente il caso. Base casuale: probabilità
  // che due single della stessa stirpe e dello stesso luogo, presi a caso, abbiano un legame (densità dei legami fra single).
  const r = P.stats(A).records;
  assert(r.marriages >= 5, 'troppi pochi matrimoni fra i record: ' + r.marriages);
  let linked = 0, possible = 0;
  for (const pl of list) {
    const groups = new Map();
    for (const q of P.residents(A, pl.id)) if (q.stage === 'adulto' && q.married === 'single') { if (!groups.has(q.lineage)) groups.set(q.lineage, []); groups.get(q.lineage).push(q.id); }
    for (const ids of groups.values()) {
      const set = new Set(ids);
      possible += ids.length * (ids.length - 1);
      for (const id of ids) linked += P.person(A, id).relations.filter(x => set.has(x.id)).length;
    }
  }
  const chance = linked / Math.max(1, possible), ratio = r.bondMarriages / r.marriages;
  assert(ratio >= 0.3 && ratio >= 3 * chance, `matrimoni da relazioni ${r.bondMarriages}/${r.marriages} contro una base casuale del ${(100 * chance).toFixed(1)}%`);
  for (const b of la.births) {
    const kid = P.person(A, b.id); assert(kid.parents.length >= 1, 'nato senza genitori');
    if (kid.parents.length === 2) { const p0 = P.person(A, kid.parents[0]); assert(p0.spouse === kid.parents[1] || p0.formerSpouse === kid.parents[1], 'genitori non sposati fra loro'); }
  }
  return `migrante ${X.id} (sett. ${a.e.week - W0}), avventuriero ${adv.id} (sett. ${b.e.week - W0}), mestiere ${ch.id} (sett. ${ch.week - W0}); scarto nella cella: voglia di viaggiare +${mig.toFixed(1)} (${nm} migrazioni), audacia +${bra.toFixed(1)} (${nb} partenze); matrimoni da relazioni ${r.bondMarriages}/${r.marriages} (base casuale ${(100 * chance).toFixed(1)}%); ${la.births.length} nascite`;
}
check('9. Autonomia: personalità, bisogni e obiettivi cambiano chi agisce (non quanti); le famiglie nascono da relazioni', () => autonomy(fresh().P));

check('10. Avventurieri indipendenti dal giocatore: spedizioni con guadagno, ferite, morte ed esperienza', () => {
  const { P } = fresh(), list = world(2), pop = P.create(31, list, START);
  for (const p of list) P.materialize(pop, p.id);
  const outcomes = {}, wild = new Set(list.filter(p => p.kind === 'dungeon' || p.kind === 'wild').map(p => p.id));
  let gained = 0n, xp = 0;
  run(P, pop, list, W0, W0 + 150, {}, (w, p) => {
    for (const d of P.decisions(p).departures) {
      outcomes[d.outcome] = (outcomes[d.outcome] || 0) + 1;
      assert(wild.has(d.to) || d.to === 'terre selvagge', 'destinazione non selvaggia: ' + d.to);
      gained += BigInt(d.loot);
      if (d.outcome !== 'death') { const q = P.person(p, d.id); assert(q.xp > 0, 'nessuna esperienza'); xp = Math.max(xp, q.xp); }
      else assert.equal(P.person(p, d.id).cause, 'spedizione', 'causa di morte sbagliata');
    }
  });
  for (const k of ['success', 'wounded', 'death']) assert(outcomes[k] > 0, 'nessun esito ' + k + ': ' + JSON.stringify(outcomes));
  assert(gained > 0n, 'nessun guadagno');
  assert.equal(String(gained), String(P.stats(pop).totals.loot), 'bottino dei record ≠ bottino registrato');
  const t = P.stats(pop).totals;
  assert(t.expeditionDeaths >= outcomes.death, 'morti in spedizione non contate');
  return `esiti ${JSON.stringify(outcomes)}, bottino ${gained} Scintille, esperienza massima ${xp}`;
});

check('11. Ripristino: dati mancanti o danneggiati non lanciano mai e ricreano la popolazione dal seme con una nota', () => {
  const { P } = fresh(), list = world();
  const good = P.create(4, list, START); P.materialize(good, 'borgo');
  run(P, good, list, W0, W0 + 3);
  const raw = P.serialize(good);
  const bad = [undefined, null, 'x', 7, [], { schema: 9 }, { ...raw, seed: 'x' }, { ...raw, week: -1 },
    { ...raw, places: 'x' }, { ...raw, places: raw.places.map((p, i) => i ? p : { ...p, anon: [[5, -3]] }) },
    { ...raw, places: raw.places.map((p, i) => i ? p : { ...p, pool: '-5' }) }, { ...raw, places: raw.places.map((p, i) => i ? p : { ...p, pool: 12 }) },
    { ...raw, records: { ...raw.records, wealth: raw.records.wealth.slice(1) } }, { ...raw, records: { ...raw.records, serial: raw.records.serial.map(() => 0) } },
    { ...raw, records: { ...raw.records, spouse: raw.records.spouse.map(() => 999999) } }, { ...raw, records: { ...raw.records, wealth: raw.records.wealth.map(() => '-1') } },
    { ...raw, records: { ...raw.records, alive: raw.records.alive.map(() => 2) } }, { ...raw, mem: [[0, 'x']] }, { ...raw, rel: [[0, [[0, 5]]]] },
    JSON.parse(JSON.stringify(raw).replace('"schema":1', '"schema":1,"__proto__":{"x":1}')), { ...raw, carry: null, places: [{ id: '__proto__' }] }];
  for (const [i, r] of bad.entries()) {
    let p;
    assert.doesNotThrow(() => { p = P.restore(r, list, (W0 + 3) * WEEK); }, 'lancia sul caso ' + i);
    assert(p && typeof p === 'object', 'nessuna popolazione al caso ' + i);
    assert(p.note && p.note.length > 0, 'nessuna nota al caso ' + i);
    assert.equal(P.summary(p, 'borgo').alive, 180, 'popolazione non ricreata dal seme al caso ' + i);
    assert.doesNotThrow(() => P.step(p, W0 + 3, env(W0 + 3)), 'la popolazione ricreata non avanza al caso ' + i);
  }
  const ok = P.restore(JSON.parse(JSON.stringify(raw)), list, (W0 + 3) * WEEK);
  assert.equal(ok.note || '', '', 'salvataggio valido rifiutato: ' + ok.note);
  // Luoghi nuovi nel mondo: si aggiungono dal seme senza rifiutare il salvataggio.
  const more = world().concat([{ id: 'nuovo', continent: 'c2', kind: 'village', population: 50, links: ['porto'] }]);
  const grown = P.restore(JSON.parse(JSON.stringify(raw)), more, (W0 + 3) * WEEK);
  assert.equal(P.summary(grown, 'nuovo').alive, 50, 'luogo nuovo non aggiunto');
  assert.equal(P.summary(grown, 'borgo').alive, P.summary(good, 'borgo').alive, 'luogo esistente perso');
  return `${bad.length} casi danneggiati gestiti senza eccezioni`;
});

check('12. Registro narrativo in italiano con tetto; memoria individuale e relazioni con tetto', () => {
  const { P } = fresh(), list = world(), pop = P.create(13, list, START);
  for (const p of list) P.materialize(pop, p.id);
  run(P, pop, list, W0, W0 + 120);
  const ev = P.events(pop);
  assert(ev.length > 0 && ev.length <= P.limits.events, 'registro vuoto o oltre il tetto: ' + ev.length);
  const text = ev.map(e => e.text).join('\n');
  for (const re of [/Nasce /, /Muore /, /si sposano/, /lascia /, /spedizione|torna da|non torna/]) assert(re.test(text), 'manca nel registro: ' + re);
  for (const e of ev) { assert(Number.isInteger(e.week)); assert.equal(typeof e.text, 'string'); }
  let maxMem = 0, maxRel = 0;
  for (const r of allResidents(P, pop, list)) {
    const q = P.person(pop, r.id);
    maxMem = Math.max(maxMem, q.memories.length); maxRel = Math.max(maxRel, q.relations.length);
    for (const m of q.memories) assert.equal(typeof m.text, 'string');
  }
  assert(maxMem > 0 && maxMem <= P.limits.memories, 'memoria oltre il tetto: ' + maxMem);
  assert(maxRel > 0 && maxRel <= P.limits.relations, 'relazioni oltre il tetto: ' + maxRel);
  return `${ev.length} voci (tetto ${P.limits.events}); memoria ≤ ${maxMem}, relazioni ≤ ${maxRel}; es. «${ev.at(-1).text}»`;
});

check('13. Trasferimenti esatti: salari ai lavoratori, spesa e tasse limitate, mai ricchezza negativa, saturazione senza perdite', () => {
  const { P } = fresh(), list = world(), pop = P.create(2, list, START);
  P.materialize(pop, 'borgo');
  for (const id of ['borgo', 'citta']) {
    const s0 = P.summary(pop, id), w0 = BigInt(s0.wealth), job = Object.keys(s0.workers)[0];
    const got = P.transfer(pop, id, { wages: { [job]: 1001n, nessuno: 50n }, spend: w0 * 10n, tax: 5n });
    assert.equal(String(got.wages), '1001', 'salari applicati ≠ richiesti (o pagati a una professione inesistente)');
    assert.equal(String(got.spend), String(w0 + 1001n), 'spesa non limitata alla ricchezza');
    assert.equal(String(got.tax), '0', 'tassa pagata senza ricchezza');
    assert.equal(P.summary(pop, id).wealth, '0', 'ricchezza non azzerata');
    if (id === 'borgo') for (const r of P.residents(pop, id)) assert.equal(r.wealth, '0', 'ricchezza individuale residua');
  }
  // Saturazione di BigInt64Array: un salario enorme a pochi lavoratori resta esatto (l'eccedenza va alla cassa comune).
  const s = P.summary(pop, 'borgo'), job = Object.entries(s.workers).sort((a, b) => a[1] - b[1])[0][0];
  const huge = (1n << 66n) + 12345n, got = P.transfer(pop, 'borgo', { wages: { [job]: huge } });
  assert.equal(String(got.wages), String(huge));
  assert.equal(P.summary(pop, 'borgo').wealth, String(huge), 'Scintille perse nella saturazione');
  for (const r of P.residents(pop, 'borgo')) assert(BigInt(r.wealth) <= (1n << 63n) - 1n, 'ricchezza individuale oltre il limite');
  const spent = P.transfer(pop, 'borgo', { spend: huge });
  assert.equal(String(spent.spend), String(huge)); assert.equal(P.summary(pop, 'borgo').wealth, '0');
  for (const bad of [null, 'x', { wages: 'x' }, { wages: { farmer: -5n } }, { spend: -1n }, { tax: 1.5 }]) {
    const g = P.transfer(pop, 'borgo', bad);
    assert(g.wages >= 0n && g.spend >= 0n && g.tax >= 0n, 'importi negativi applicati');
  }
  assert(BigInt(P.summary(pop, 'borgo').wealth) >= 0n);
  return 'salari, spesa, tasse e saturazione esatti';
});

check('14. Prestazioni indicative: una settimana con 100 000 residenti in coorti e con 10 000 record', () => {
  const { P } = fresh();
  const big = [];
  for (let i = 0; i < 200; i++) big.push({ id: 'l' + i, continent: 'c' + (i % 5), kind: ['village', 'town', 'city', 'capital'][i % 4], population: 500, links: ['l' + ((i + 1) % 200), 'l' + ((i + 199) % 200), 'l' + ((i + 37) % 200)] });
  big.push({ id: 'd0', continent: 'c0', kind: 'dungeon', population: 0, links: ['l0', 'l5'] });
  big[0].links.push('d0'); big[5].links.push('d0');
  const time = (pop, from, n) => { const ms = []; for (let w = from; w < from + n; w++) { const t0 = process.hrtime.bigint(); P.step(pop, w, env(w)); ms.push(Number(process.hrtime.bigint() - t0) / 1e6); } ms.sort((a, b) => a - b); return ms[Math.floor(ms.length / 2)]; };
  const coh = P.create(1, big, START);
  const tc = time(coh, W0, 6), sizeC = JSON.stringify(P.serialize(coh)).length;
  const recList = big.slice(0, 20).map((p, i) => ({ ...p, links: ['l' + ((i + 1) % 20), 'l' + ((i + 19) % 20)] }));
  const rec = P.create(1, recList, START);
  const t0 = process.hrtime.bigint(); for (const p of recList) P.materialize(rec, p.id); const tm = Number(process.hrtime.bigint() - t0) / 1e6;
  const tr = time(rec, W0, 6), st = P.stats(rec), sizeR = JSON.stringify(P.serialize(rec)).length;
  const stC = P.stats(coh);
  assert.equal(stC.totals.alive, coh && big.reduce((a, p) => a + p.population, 0) + stC.totals.births - stC.totals.deaths);
  assert(st.records.alive >= 9000, 'record vivi: ' + st.records.alive);
  assert(tc < 1500 && tr < 1500, `settimana troppo lenta: coorti ${tc.toFixed(1)} ms, record ${tr.toFixed(1)} ms`);
  return `coorti: 100 000 residenti, ${stC.cohorts.cells} celle, settimana ${tc.toFixed(1)} ms (mediana di 6), salvataggio ${(sizeC / 1024).toFixed(0)} KB · record: ${st.records.alive} vivi, materializzazione ${tm.toFixed(0)} ms, settimana ${tr.toFixed(1)} ms, memoria stimata ${(st.memoryBytes / 1048576).toFixed(1)} MB, salvataggio ${(sizeR / 1024).toFixed(0)} KB`;
});

check('15. Dati biologici del gioco: età adulta da ContinentalBiology quando presente, parametri provvisori in una sola tabella', () => {
  const { P } = fresh(null, { ContinentalBiology: { human: ['x', 6570], dwarf: ['x', 9000] } });
  assert.equal(P.biology.dwarf.adultDays, 9000, 'non legge ContinentalBiology');
  const { P: Q } = fresh();
  for (const [id, b] of Object.entries(Q.biology)) {
    for (const k of ['adultDays', 'adultYears', 'elderYears', 'fertility']) assert(Number.isFinite(b[k]) && b[k] >= 0, id + '.' + k);
    assert.equal(b.provisional, true, id + ' non dichiarato provvisorio');
  }
  assert.equal(Object.keys(Q.biology).length, 8, 'stirpi diverse da ContinentalBiology');
  return Object.entries(Q.biology).map(([k, b]) => `${k} ${b.adultDays}g`).join(', ');
});

// Mutazioni: ciascuna deve far fallire almeno una proprietà.
function detected(fn) { try { fn(); } catch (e) { if (e.name === 'AssertionError' || /diverso|differenza|immortale/.test(e.message)) return true; throw e; } return false; }
const marker = m => assert(fs.readFileSync(popFile, 'utf8').includes(m), 'punto da mutare assente: ' + m);

check('16. Mutazione: i notabili esentati dalla morte → rilevata (immortali o conteggi diversi)', () => {
  marker('/*MORTE*/');
  const { P } = fresh(src => src.replace('/*MORTE*/', '/*MORTE*/.filter(i=>!R.notable[i])'));
  const list = [{ id: 'tana', continent: 'c1', kind: 'village', population: 90, links: [], lineages: { bear: 1 } }];
  const ok = detected(() => {
    const pop = P.create(77, list, START); P.materialize(pop, 'tana');
    const notable = P.residents(pop, 'tana').filter(r => r.notable);
    const ref = fresh().P, q = ref.create(77, list, START);
    for (let w = W0; w < W0 + 3000; w++) { P.step(pop, w, env(w)); ref.step(q, w, env(w)); }
    for (const r of notable) assert.equal(P.person(pop, r.id).alive, false, 'notabile immortale');
    same(ref.cells(q, 'tana'), P.cells(pop, 'tana'), 'conteggi diversi');
  });
  assert(ok, 'mutazione non rilevata'); return 'rilevata';
});

check('17. Mutazione: borsa del migrante dalla ricchezza personale invece che dalla quota del luogo → rilevata (equivalenza)', () => {
  marker('/*BORSA*/');
  const { P } = fresh(src => src.replace('/*BORSA*/', '/*BORSA*/purse=R.wealth[i]<0n?0n:R.wealth[i];'));
  assert(detected(() => { const o = equivalence(P, [{}, { [W0]: ['borgo', 'citta', 'paese', 'porto'] }], 40); assert.equal(o[1].end, o[0].end, 'stato finale diverso'); }), 'mutazione non rilevata');
  return 'rilevata';
});

check('18. Mutazione: resto della ricchezza perso alla materializzazione → rilevata (equivalenza)', () => {
  marker('/*RESTO*/');
  const { P } = fresh(src => src.replace('/*RESTO*/', '/*RESTO*/rest=0n;'));
  assert(detected(() => { const o = equivalence(P, [{}, { [W0 + 7]: ['borgo', 'citta'] }], 20); assert.equal(o[1].end, o[0].end, 'stato finale diverso'); }), 'mutazione non rilevata');
  return 'rilevata';
});

check('19. Mutazione: scelta per indice invece che per utilità individuale → rilevata (autonomia)', () => {
  marker('/*SCELTA*/');
  const { P } = fresh(src => src.replace('/*SCELTA*/', '/*SCELTA*/return a-b;'));
  assert(detected(() => autonomy(P)), 'mutazione non rilevata');
  return 'rilevata';
});

check('20. Mutazione: riporto non salvato → rilevata (salvataggio e continuazione)', () => {
  marker('/*RIPORTO*/');
  const { P } = fresh(src => src.replace('/*RIPORTO*/', '/*RIPORTO*/carry:{},'));
  const list = world();
  assert(detected(() => {
    const a = P.create(5, list, START); run(P, a, list, W0, W0 + 25, { [W0 + 3]: ['borgo'] });
    const b = P.restore(JSON.parse(JSON.stringify(P.serialize(a))), list, (W0 + 25) * WEEK);
    run(P, a, list, W0 + 25, W0 + 45); run(P, b, list, W0 + 25, W0 + 45);
    assert.equal(JSON.stringify(P.serialize(b)), JSON.stringify(P.serialize(a)), 'continuazione diversa');
  }), 'mutazione non rilevata');
  return 'rilevata';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
