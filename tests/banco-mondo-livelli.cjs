// PERF-005: banco su larga scala dei MODULI ISOLATI della simulazione a livelli (orchestratore, livelli dei luoghi, economia viva,
// residenti autonomi). Misura i moduli in ombra, NON il gioco: nessun modulo è collegato al motore e nessun residente di questo
// banco esiste in partita. Le prestazioni del gioco reale si misurano con tests/banco-lod.cjs (95–10 000 residenti nel motore
// vero) e con le prove in Edge. Residenti «prevalentemente aggregati»: il luogo corrente (e, sotto i 1 000, tutti) è a record
// individuali, il resto a coorti.
// Uso:   node --expose-gc tests/banco-mondo-livelli.cjs [--sizes 95,500,1000,5000,10000,50000,100000] [--years 1] [--out misure.json]
// Misure per dimensione: creazione (ms, memoria), materializzazione, una settimana (mediana e massimo di 12), un anno
// di recupero (ms e CPU), frame a budget di 1 ms (fotogrammi e fotogramma più lungo), viaggi con cambio di livello e
// materializzazione, salvataggio (dimensione, tempo di serializzazione e ripristino, ricostruzione identica), memoria dopo un anno.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const sizes = opt('sizes', '95,500,1000,5000,10000,50000,100000').split(',').map(Number);
const years = Number(opt('years', '1'));
const outFile = opt('out', '');
const root = path.resolve(__dirname, '..');
const WEEK = 10080, SEED = 19425;
const gc = () => { if (global.gc) global.gc(); };
const heap = () => { gc(); gc(); return process.memoryUsage().heapUsed / 1048576; };
const med = a => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const json = v => JSON.stringify(v, (k, x) => typeof x === 'bigint' ? String(x) : x);

function context() {
  const scope = { console: { warn() {}, log() {} }, performance };
  scope.window = scope; vm.createContext(scope);
  for (const file of ['world-sim.js', 'world-lod.js', 'living-economy.js', 'world-population.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file });
  const { WorldSim: W, LivingEconomy: E, WorldPopulation: P } = scope;
  const env = st => ({ population: { summary: id => P.summary(st.pop, id), transfer: (id, f) => P.transfer(st.pop, id, f) }, economy: { signals: id => E.signals(st.eco, id) } });
  W.register('living-economy', E.system(st => st.eco, env));
  W.register('population', P.system(st => st.pop, env));
  return scope;
}
// Cinque continenti a stella (come nel gioco); luoghi collegati a catena dentro ciascun continente, il primo al centro.
function worldOf(n) {
  const count = Math.max(1, Math.min(200, Math.round(n / 500))), places = [], perContinent = [0, 0, 0, 0, 0];
  for (let i = 0; i < count; i++) { const c = i % 5; perContinent[c]++; places.push({ id: `c${c + 1}-${perContinent[c]}`, continent: 'c' + (c + 1), kind: ['village', 'town', 'city'][i % 3], population: 0, links: [] }); }
  let rest = n; places.forEach((p, i) => { const take = i === places.length - 1 ? rest : Math.floor(n / count); p.population = take; rest -= take; });
  const by = Object.fromEntries(places.map(p => [p.id, p]));
  const link = (a, b) => { if (by[a] && by[b] && a !== b) { if (!by[a].links.includes(b)) by[a].links.push(b); if (!by[b].links.includes(a)) by[b].links.push(a); } };
  for (let c = 1; c <= 5; c++) for (let i = 2; i <= perContinent[c - 1]; i++) link(`c${c}-${i}`, `c${c}-${i - 1}`);
  for (let c = 2; c <= 5; c++) link('c1-1', `c${c}-1`);
  return { places, lod: places.map(p => ({ id: p.id, continent: p.continent, kind: p.kind, parent: null, links: p.links })) };
}
const report = { machine: process.version, years, sizes: [] };

for (const n of sizes) {
  const { places, lod } = worldOf(n);
  const S = context(), { WorldSim: W, LivingEconomy: E, WorldPopulation: P, WorldLod: L } = S;
  const h0 = heap();
  let t = performance.now();
  const s = { world: W.create(0), eco: E.create(SEED, places, 0), pop: P.create(SEED, places, 0) };
  const createMs = performance.now() - t, h1 = heap();
  // Luogo corrente a record (sotto i 1 000 tutti i luoghi).
  const here = places[0].id;
  t = performance.now();
  const all = n < 1000 ? places.map(p => p.id) : [here];
  for (const id of all) P.materialize(s.pop, id);
  const materializeMs = performance.now() - t;
  const st = P.stats(s.pop), records = st.records.total;
  const weeks = [];
  for (let w = 1; w <= 12; w++) { t = performance.now(); W.tick(s, w * WEEK, { budgetMs: Infinity }); weeks.push(performance.now() - t); }
  const h2 = heap();
  // Recupero di un anno (dopo l'anno di assenza) con CPU e tempo.
  const cpu0 = process.cpuUsage(); t = performance.now();
  const yearStart = 12, yearEnd = 12 + 52 * years;
  W.resolveAll(s, yearEnd * WEEK);
  const yearMs = performance.now() - t, cpu = process.cpuUsage(cpu0);
  const h3 = heap();
  // Budget di 1 ms per fotogramma: quante chiamate e quanto dura la più lunga (un intervallo è un blocco indivisibile).
  // Dodici settimane, una alla volta: si conservano la mediana e il massimo della chiamata più lunga di ogni settimana.
  let frames = 0; const longestCalls = [], lastWeek = yearEnd + 12;
  for (let w = yearEnd + 1; w <= lastWeek; w++) {
    let longest = 0;
    while (W.lag(s, w * WEEK) > 0 && frames < 1e6) { t = performance.now(); W.tick(s, w * WEEK, { budgetMs: 1 }); longest = Math.max(longest, performance.now() - t); frames++; }
    longestCalls.push(longest);
  }
  // Salvataggio di un mondo prevalentemente aggregato (solo il luogo corrente a record), PRIMA dei viaggi.
  const savedBefore = { eco: E.serialize(s.eco), pop: P.serialize(s.pop) };
  const beforeKB = Buffer.byteLength(json(savedBefore)) / 1024, beforeRecords = P.stats(s.pop).records.total;
  // Viaggi: cambio di livello e materializzazione dei luoghi raggiunti (livello ≤ 2), tempo mancante risolto prima.
  const state = L.create(lod, here), trips = [];
  const route = []; { let prev = here; for (let k = 0; k < Math.min(40, places.length - 1); k++) { const next = places[(k * 7 + 3) % places.length].id; if (next !== prev) { route.push(next); prev = next; } } }
  let now = lastWeek * WEEK, materialized = 0, tripRecords = 0;
  for (const to of route) {
    now += 600; t = performance.now();
    L.travel(state, lod, to, { resolve: () => W.tick(s, now, { budgetMs: Infinity }), promote: (id, a, b) => { if (b <= 2) { const before = P.stats(s.pop).records.total; P.materialize(s.pop, id); materialized++; tripRecords += P.stats(s.pop).records.total - before; } } });
    trips.push(performance.now() - t);
  }
  // Salvataggio: dimensione, tempo, ripristino in un contesto nuovo, stato ricostruito identico, dimensione dopo l'anno.
  t = performance.now();
  const saved = { eco: E.serialize(s.eco), pop: P.serialize(s.pop), world: s.world }, text = json(saved), serializeMs = performance.now() - t;
  const ecoKB = Buffer.byteLength(json(saved.eco)) / 1024, popKB = Buffer.byteLength(json(saved.pop)) / 1024;
  const T = context(); t = performance.now();
  const back = { eco: T.LivingEconomy.restore(JSON.parse(text).eco, places, now), pop: T.WorldPopulation.restore(JSON.parse(text).pop, places, now) }, restoreMs = performance.now() - t;
  const stable = json(T.LivingEconomy.serialize(back.eco)) === json(saved.eco) && json(T.WorldPopulation.serialize(back.pop)) === json(saved.pop);
  // Dimensione iniziale (senza anni di storia) per misurare la crescita.
  const F = context(), f = { world: F.WorldSim.create(0), eco: F.LivingEconomy.create(SEED, places, 0), pop: F.WorldPopulation.create(SEED, places, 0) };
  const initialKB = Buffer.byteLength(json({ eco: F.LivingEconomy.serialize(f.eco), pop: F.WorldPopulation.serialize(f.pop) })) / 1024;
  const row = { residents: n, places: places.length, records, anonymous: st.cohorts.anonymous,
    createMs: round(createMs), createMB: round(h1 - h0, 2), materializeMs: round(materializeMs),
    weekMedian: round(med(weeks)), weekMax: round(Math.max(...weeks)), yearWeeks: 52 * years, yearMs: round(yearMs), cpuMs: round((cpu.user + cpu.system) / 1000),
    heapMB: round(h2, 1), heapAfterYearMB: round(h3, 1), frames, frameMedianMs: round(med(longestCalls)), frameMaxMs: round(Math.max(...longestCalls)),
    beforeTripsKB: round(beforeKB), beforeTripsRecords: beforeRecords, recordsAfterTrips: P.stats(s.pop).records.total,
    trips: trips.length, tripMedianMs: trips.length ? round(med(trips), 2) : null, tripMaxMs: trips.length ? round(Math.max(...trips), 2) : null, materializedPlaces: materialized, tripRecords,
    saveKB: round(ecoKB + popKB), ecoKB: round(ecoKB), popKB: round(popKB), initialKB: round(initialKB), serializeMs: round(serializeMs), restoreMs: round(restoreMs), stable,
    failures: W.failures(s).length, alive: P.stats(s.pop).totals.alive };
  report.sizes.push(row);
  console.log(json(row));
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
}
console.log('FINE');
