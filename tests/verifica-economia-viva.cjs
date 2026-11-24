// PERF-005 (in ombra): economia viva `living-economy.js`, provata da sola in Node, senza dipendenze.
// Uso:   node tests/verifica-economia-viva.cjs        (ONLY=2,5 per eseguire solo alcune prove; LE_FILE=percorso per provare
//        una copia modificata del modulo, per esempio per vedere fallire una prova nuova)
// Il modulo non è nella build né collegato al motore: le prove lo caricano in un contesto `vm` (window = contesto) con mondi
// sintetici e uno stub della popolazione che rispetta il contratto (ricchezza mai negativa, importi applicati, somme esatte).
// Contratto verificato: determinismo; conservazione esatta di denaro (famiglie comprese) e merci per 520 settimane; risultato
// indipendente dalla suddivisione del tempo (passo settimanale, WorldSim.resolveAll, WorldSim.tick a budget minimo);
// salvataggio → ripristino → continuazione identica; prezzi, salari, tasse, carovane, banche, attività, crisi, stagioni,
// guerre e calamità; ripristino che non lancia; prestazioni indicative; mutazioni del codice rilevate.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const FILE = process.env.LE_FILE ? path.resolve(process.env.LE_FILE) : path.join(ROOT, 'living-economy.js');
const WEEK = 10080;
const START = 3 * WEEK + 1234; // non allineato alla settimana
const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e && e.message || e).replace(/\s+/g, ' ').slice(0, 300)); }
};
function load(mutate = null, extra = []) {
  const scope = { console };
  scope.window = scope;
  vm.createContext(scope);
  for (const f of extra) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), scope, { filename: f });
  let source = fs.readFileSync(FILE, 'utf8');
  if (mutate) source = mutate(source);
  vm.runInContext(source, scope, { filename: 'living-economy.js' });
  if (!scope.LivingEconomy) throw new Error('window.LivingEconomy non esportato');
  return { LE: scope.LivingEconomy, scope };
}
const minB = (a, b) => (a < b ? a : b);
const sumB = o => Object.values(o).reduce((s, v) => s + BigInt(v), 0n);

/* Mondo sintetico: `continents` continenti di `per` luoghi (capitale, città, borgo, villaggi), collegati a catena e alla
   capitale; le capitali sono porti collegati fra continenti (rotte intercontinentali). Facoltativa una landa disabitata. */
function world({ continents = 3, per = 4, pop = [3000, 1500, 700, 250], wild = true } = {}) {
  const places = [];
  for (let c = 0; c < continents; c++) for (let i = 0; i < per; i++) {
    const kind = i === 0 ? 'capital' : i === 1 ? 'city' : i === 2 ? 'town' : 'village';
    places.push({ id: `c${c}p${i}`, continent: `continente-${c}`, kind, population: pop[Math.min(i, pop.length - 1)], links: [] });
  }
  const byId = Object.fromEntries(places.map(p => [p.id, p]));
  const link = (a, b) => { if (!byId[a].links.includes(b)) byId[a].links.push(b); if (!byId[b].links.includes(a)) byId[b].links.push(a); };
  for (let c = 0; c < continents; c++) for (let i = 1; i < per; i++) { link(`c${c}p${i}`, `c${c}p${i - 1}`); if (i > 1) link(`c${c}p${i}`, `c${c}p0`); }
  if (continents > 1) for (let c = 0; c < continents; c++) link(`c${c}p0`, `c${(c + 1) % continents}p0`);
  if (wild && per > 1) { places.push({ id: 'landa', continent: 'continente-0', kind: 'wild', population: 0, links: ['c0p1'] }); byId.c0p1.links.push('landa'); }
  return places;
}
/* Stub della popolazione conforme al contratto: lavoratori dalle quote di `params.workforce`, ricchezza iniziale 60 Scintille a
   testa. `transfer` applica salari (solo alle professioni presenti), poi spesa e tasse limitate dalla ricchezza. */
function population(LE, places, tweak = {}) {
  const state = {};
  for (const p of places) {
    const t = tweak[p.id] || {};
    const alive = t.alive !== undefined ? t.alive : p.population;
    const adults = Math.floor(alive * 0.6), children = Math.floor(alive * 0.25), elders = alive - adults - children;
    const workers = {};
    for (const [job, share] of Object.entries(LE.params.workforce)) { const n = Math.floor(p.population * share / 1000); if (n > 0) workers[job] = n; }
    Object.assign(workers, t.workers || {});
    const used = Object.values(workers).reduce((s, n) => s + n, 0);
    state[p.id] = { alive, adults, children, elders, households: Math.ceil(alive / 4), workers, unemployed: Math.max(0, adults - used),
      adventurers: 0, wealth: t.wealth !== undefined ? BigInt(t.wealth) : BigInt(alive) * 60n };
  }
  const log = { wages: 0n, spend: 0n, tax: 0n, calls: 0 };
  return {
    state, log,
    summary(id) {
      const x = state[id];
      if (!x) return null;
      return { alive: x.alive, children: x.children, adults: x.adults, elders: x.elders, households: x.households, workers: { ...x.workers },
        unemployed: x.unemployed, adventurers: x.adventurers, wealth: String(x.wealth) };
    },
    transfer(id, f) {
      const x = state[id];
      log.calls++;
      if (!x) return { wages: 0n, spend: 0n, tax: 0n };
      let w = 0n;
      for (const [job, a] of Object.entries(f.wages || {})) if ((x.workers[job] || 0) > 0 && typeof a === 'bigint' && a > 0n) w += a;
      x.wealth += w;
      const sp = minB(typeof f.spend === 'bigint' && f.spend > 0n ? f.spend : 0n, x.wealth); x.wealth -= sp;
      const tx = minB(typeof f.tax === 'bigint' && f.tax > 0n ? f.tax : 0n, x.wealth); x.wealth -= tx;
      log.wages += w; log.spend += sp; log.tax += tx;
      return { wages: w, spend: sp, tax: tx };
    },
    total() { return Object.values(state).reduce((s, x) => s + x.wealth, 0n); },
    dump() { return JSON.stringify(state, (k, v) => (typeof v === 'bigint' ? String(v) : v)); },
    load(text) { const raw = JSON.parse(text); for (const [id, x] of Object.entries(raw)) state[id] = { ...x, wealth: BigInt(x.wealth) }; }
  };
}
const envOf = (pop, worldHooks) => ({ population: { summary: id => pop.summary(id), transfer: (id, f) => pop.transfer(id, f) }, world: worldHooks });
function run(LE, eco, env, weeks, each) {
  for (let k = 0; k < weeks; k++) { const w = eco.week; LE.step(eco, w, typeof env === 'function' ? env(w) : env); if (each) each(w); }
}
const snapshot = (LE, eco, pop) => LE.serialize(eco) + '|' + pop.dump();
const price = (LE, eco, id, g) => LE.report(eco, id).prices.find(x => x.id === g);
const biz = (LE, eco, id, type) => LE.report(eco, id).businesses.find(x => x.id === type);

check('0. API esposta e parametri provvisori dichiarati', () => {
  const { LE } = load();
  for (const f of ['create', 'restore', 'serialize', 'step', 'system', 'signals', 'audit', 'report', 'events', 'stats', 'caravans', 'wallet'])
    assert.equal(typeof LE[f], 'function', 'manca ' + f);
  assert.equal(LE.WEEK, WEEK);
  assert(LE.params && LE.params.provisional === true, 'parametri non dichiarati provvisori');
  for (const k of ['goods', 'types', 'wages', 'workforce', 'publicJobs', 'tax', 'bank', 'events', 'calamities', 'prices', 'caravans', 'business'])
    assert(LE.params[k] && typeof LE.params[k] === 'object', 'manca la tabella ' + k);
  assert.deepEqual([...LE.GOODS].sort(), ['bread', 'essence', 'grain', 'herb', 'ore', 'potion', 'seeds', 'water', 'wool', 'work']);
});

check('1. Determinismo: stesso seme → stesso mondo; seme diverso → mondo diverso', () => {
  const go = seed => { const { LE } = load(); const places = world(); const pop = population(LE, places); const eco = LE.create(seed, places, START); run(LE, eco, envOf(pop), 104); return snapshot(LE, eco, pop); };
  const a = go(7), b = go(7), c = go(8);
  assert.equal(b, a, 'due esecuzioni con lo stesso seme divergono');
  assert.notEqual(c, a, 'il seme non influisce sul mondo');
  return `${a.length} caratteri identici dopo 104 settimane`;
});

check('2. Conservazione esatta di denaro (famiglie comprese) e merci per 520 settimane', () => {
  const { LE } = load();
  const places = world(), pop = population(LE, places), eco = LE.create(11, places, START);
  const a0 = LE.audit(eco);
  assert(a0.ok, 'verifica iniziale: ' + a0.problems.join('; '));
  const start = pop.total() + a0.money.accounts;
  let checks = 0;
  run(LE, eco, envOf(pop), 520, () => {
    const a = LE.audit(eco);
    assert(a.ok, 'settimana ' + eco.week + ': ' + a.problems.slice(0, 3).join('; '));
    assert.equal(pop.total() + a.money.accounts, start + a.money.minted - a.money.burned, 'denaro creato o perso fra economia e famiglie alla settimana ' + eco.week);
    checks++;
  });
  const st = LE.stats(eco), a = LE.audit(eco);
  const lost = Object.values(a.goods).reduce((s, g) => s + g.lost, 0n);
  assert(st.counts.war >= 1, 'nessuna guerra in 520 settimane');
  assert(st.counts.calamity >= 1, 'nessuna calamità in 520 settimane');
  assert(a.money.burned > 0n, 'nessuna distruzione di denaro registrata');
  assert(lost > 0n, 'nessuna merce perduta registrata');
  return `${checks} verifiche esatte; emesse ${a.money.minted}, distrutte ${a.money.burned} Scintille; merci perdute ${lost} millesimi; ` +
    `${st.counts.war} guerre, ${st.counts.calamity} calamità, ${st.counts.caravanLost || 0} carovane perdute, ${st.counts.closure || 0} chiusure, ${st.counts.opening || 0} aperture`;
});

check('3. Risoluzione a blocchi: passo settimanale = WorldSim.resolveAll = WorldSim.tick a budget minimo', () => {
  const WEEKS = 156;
  const go = mode => {
    const { LE, scope } = load(null, ['world-sim.js']);
    const W = scope.WorldSim, places = world(), pop = population(LE, places), env = envOf(pop);
    const s = { world: W.create(START), eco: LE.create(5, places, START) };
    W.register('living-economy', LE.system(st => st.eco, () => env));
    const end = (s.eco.week + WEEKS) * WEEK + 77;
    if (mode === 'manual') for (let k = 0; k < WEEKS; k++) LE.step(s.eco, s.eco.week, env);
    else if (mode === 'all') W.resolveAll(s, end);
    else {
      let t = 0; const clock = () => (t += 1);
      for (let now = START; now <= end; now += 2333) W.tick(s, now, { budgetMs: 1, clock });
      let guard = 0;
      while (W.lag(s, end) > 0 && guard++ < 1e5) W.tick(s, end, { budgetMs: 1, clock });
    }
    assert.equal(W.failures().length, 0, 'sistema guasto in WorldSim: ' + JSON.stringify(W.failures()));
    return snapshot(LE, s.eco, pop);
  };
  const a = go('manual'), b = go('all'), c = go('tick');
  assert.equal(b, a, 'WorldSim.resolveAll diverso dal passo settimanale');
  assert.equal(c, a, 'WorldSim.tick a budget minimo diverso dal passo settimanale');
  return `${WEEKS} settimane identiche nei tre modi`;
});

check('4. Salvataggio → ripristino (nuovo caricamento del modulo) → continuazione identica', () => {
  const places = world();
  const { LE } = load(), pop = population(LE, places), eco = LE.create(9, places, START);
  run(LE, eco, envOf(pop), 120);
  const ref = snapshot(LE, eco, pop);
  const { LE: L1 } = load(), p1 = population(L1, places), e1 = L1.create(9, places, START);
  run(L1, e1, envOf(p1), 60);
  const saved = L1.serialize(e1), savedPop = p1.dump();
  const { LE: L2 } = load(), p2 = population(L2, places);
  p2.load(savedPop);
  const e2 = L2.restore(saved, places, e1.week * WEEK);
  assert.equal(L2.serialize(e2), saved, 'il ripristino non riproduce il salvataggio');
  const e3 = L2.restore(JSON.parse(saved), places, e1.week * WEEK);
  assert.equal(L2.serialize(e3), saved, 'il ripristino da oggetto non riproduce il salvataggio');
  run(L2, e2, envOf(p2), 60);
  assert.equal(snapshot(L2, e2, p2), ref, 'la continuazione dopo il ripristino diverge');
  return `salvataggio di ${saved.length} byte (13 luoghi, 60 settimane)`;
});

check('21. Salvataggio in settimane diverse: nessuno stato del mondo resta fuori dal salvataggio', () => {
  // Mondo con carovane: le partenze comprano da fattorie, miniere e pascoli già regolati nella settimana, e l'incasso resta in sospeso.
  const { LE: L1 } = load(), world1 = caravanWorld(L1), live = L1.create(21, world1.places, 0);
  let compared = 0, inFlight = 0;
  run(L1, live, envOf(world1.pop), 20);
  for (let w = 20; w < 70; w++) {
    for (const pl of Object.values(live.places)) if (pl.b.some(b => b.wp !== 0n)) { inFlight++; break; }
    const saved = L1.serialize(live), dumped = world1.pop.dump();
    const { LE: L2 } = load(), world2 = caravanWorld(L2); world2.pop.load(dumped);
    const copy = L2.restore(saved, world2.places, live.week * WEEK);
    run(L2, copy, envOf(world2.pop), 1);
    run(L1, live, envOf(world1.pop), 1);
    assert.equal(snapshot(L2, copy, world2.pop), snapshot(L1, live, world1.pop), `settimana ${w}: dopo il ripristino la continuazione diverge dalla partita in corso`);
    compared++;
  }
  // La prova deve incontrare incassi in sospeso, altrimenti non dimostra nulla.
  assert(inFlight > 5, 'settimane con incassi in sospeso incontrate: ' + inFlight);
  return `${compared} settimane salvate e confrontate con la partita in corso, ${inFlight} con incassi in sospeso`;
});

check('5. Prezzi: salgono con la scarsità e scendono con l’abbondanza', () => {
  const { LE } = load();
  const places = [{ id: 'arida', continent: 'a', kind: 'town', population: 1200, links: [] }, { id: 'fertile', continent: 'b', kind: 'town', population: 1200, links: [] }];
  const farmers = Math.floor(1200 * LE.params.workforce.farmer / 1000);
  // «arida»: nessun contadino; «fertile»: le fattorie lavorano per 1200 abitanti ma ne restano 400 a comprare (abbondanza).
  const pop = population(LE, places, { arida: { workers: { farmer: 0 } }, fertile: { alive: 400 } });
  const eco = LE.create(3, places, 0);
  const series = [];
  run(LE, eco, envOf(pop), 16, () => series.push(price(LE, eco, 'arida', 'grain').index));
  const dry = price(LE, eco, 'arida', 'grain').index, rich = price(LE, eco, 'fertile', 'grain').index;
  assert(dry >= 1400, 'grano senza contadini a indice ' + dry);
  assert(series.at(-1) > series[0], 'il prezzo non sale con la scarsità: ' + series.join(','));
  assert(rich <= 850, 'grano in abbondanza a indice ' + rich);
  assert(LE.signals(eco, 'arida').priceIndex > LE.signals(eco, 'fertile').priceIndex, 'indice dei prezzi non coerente');
  pop.state.arida.workers.farmer = farmers * 3;
  run(LE, eco, envOf(pop), 20);
  const after = price(LE, eco, 'arida', 'grain').index;
  assert(after < dry, `il prezzo non scende quando torna l’abbondanza (${dry} → ${after})`);
  return `grano: scarsità ${series[0]}→${dry}, abbondanza ${rich}, ritorno dei contadini ${dry}→${after}`;
});

check('6. Salari alle famiglie e tasse alle tesorerie con gli importi applicati', () => {
  const { LE } = load();
  const places = world({ continents: 1, per: 3, wild: false }), pop = population(LE, places), eco = LE.create(4, places, 0);
  const t0 = LE.stats(eco).treasuries, w0 = pop.total();
  LE.step(eco, eco.week, envOf(pop));
  const st = LE.stats(eco), last = st.lastWeek, t1 = st.treasuries;
  assert(pop.log.wages > 0n, 'nessun salario alle famiglie');
  assert(pop.log.tax > 0n, 'nessuna tassa dalle famiglie');
  assert.equal(BigInt(last.wages), pop.log.wages, 'salari registrati diversi da quelli applicati');
  assert.equal(BigInt(last.spend), pop.log.spend, 'spesa registrata diversa da quella applicata');
  assert.equal(BigInt(last.tax), pop.log.tax, 'tasse registrate diverse da quelle applicate');
  assert(BigInt(last.publicWages) > 0n, 'nessun salario pagato dalla tesoreria');
  const explained = BigInt(last.tax) + BigInt(last.businessTax) + BigInt(last.licenses) + BigInt(last.bankToTreasury) + BigInt(last.tariffs) + BigInt(last.minted) - BigInt(last.publicWages);
  assert.equal(sumB(t1) - sumB(t0), explained, 'variazione della tesoreria non spiegata dai flussi');
  assert.equal(pop.total() - w0, pop.log.wages - pop.log.spend - pop.log.tax, 'ricchezza delle famiglie non spiegata');
  const sig = LE.signals(eco, 'c0p0');
  assert(Number.isInteger(sig.wageIndex) && sig.wageIndex > 0, 'indice dei salari assente');
  return `salari ${pop.log.wages} (pubblici ${last.publicWages}), spesa ${pop.log.spend}, tasse ${pop.log.tax} Scintille`;
});

function caravanWorld(LE) {
  const places = [{ id: 'miniera', continent: 'nord', kind: 'city', population: 2000, links: ['porto'] }, { id: 'porto', continent: 'sud', kind: 'city', population: 2000, links: ['miniera'] }];
  const miners = Math.floor(2000 * LE.params.workforce.miner / 1000);
  const pop = population(LE, places, { miniera: { workers: { miner: miners * 5 } }, porto: { workers: { miner: 0 } } });
  return { places, pop };
}
check('7. Carovane intercontinentali: merci conservate per settimane, arrivo, perdite registrate', () => {
  const { LE } = load();
  const { places, pop } = caravanWorld(LE);
  const eco = LE.create(21, places, 0);
  let longest = 0, transit = 0, oreBought = 0;
  run(LE, eco, envOf(pop), 40, () => {
    oreBought += price(LE, eco, 'porto', 'ore').consumed;
    const a = LE.audit(eco);
    assert(a.ok, 'settimana ' + eco.week + ': ' + a.problems.slice(0, 3).join('; '));
    for (const c of LE.caravans(eco)) { longest = Math.max(longest, c.weeks); transit = Math.max(transit, c.cargo.ore || 0); }
  });
  const t = LE.stats(eco).totals;
  assert(t.shipped > 0, 'nessuna carovana partita');
  assert(longest >= 2, 'viaggio intercontinentale di ' + longest + ' settimane');
  assert(transit > 0, 'nessun minerale in viaggio osservato');
  assert(t.delivered > 0, 'nessuna merce consegnata');
  const inTransit = Object.values(LE.stats(eco).transit).reduce((s, n) => s + n, 0);
  assert.equal(t.shipped, t.delivered + t.returned + t.lostCargo + inTransit, 'merci delle carovane non conservate');
  // Confronto causale: lo stesso mondo senza la rotta (nessuna carovana possibile).
  const { LE: L0 } = load(), w0 = caravanWorld(L0);
  for (const p of w0.places) p.links = [];
  const e0 = L0.create(21, w0.places, 0);
  let oreAlone = 0;
  run(L0, e0, envOf(w0.pop), 40, () => { oreAlone += price(L0, e0, 'porto', 'ore').consumed; });
  assert(oreBought > oreAlone, `le carovane non portano minerale alle famiglie del porto (${oreBought} contro ${oreAlone} senza rotta)`);
  // Perdite: guerra imposta dopo la prima partenza e rischio di guerra certo.
  const { LE: L2 } = load();
  L2.params.events.caravanLossWar = 1000;
  const w2 = caravanWorld(L2), e2 = L2.create(21, w2.places, 0);
  let warFrom = Infinity;
  run(L2, e2, w => envOf(w2.pop, { war: (c, week) => week >= warFrom }), 40, () => { if (warFrom === Infinity && L2.caravans(e2).length) warFrom = e2.week; assert(L2.audit(e2).ok, 'verifica fallita con perdite'); });
  const lostEvents = L2.events(e2).filter(e => e.kind === 'caravanLost');
  assert(lostEvents.length >= 1, 'nessuna carovana perduta registrata');
  assert(lostEvents.every(e => typeof e.text === 'string' && /carovana/i.test(e.text)), 'testo dell’evento non in italiano');
  const a2 = L2.audit(e2), byCause = Object.values(a2.goods).reduce((s, g) => s + (g.lostBy.carovana || 0n), 0n);
  const fromEvents = lostEvents.reduce((s, e) => s + BigInt(e.quantity), 0n);
  assert.equal(byCause, fromEvents, 'merci perdute nel registro diverse da quelle degli eventi');
  return `${t.shipped} millesimi spediti, ${t.delivered} venduti a destinazione; minerale comprato dalle famiglie del porto ${oreBought} contro ${oreAlone} senza rotta; viaggio fino a ${longest} settimane; con la guerra ${lostEvents.length} carovane perdute (${fromEvents} millesimi)`;
});

check('8. Banche: depositi, prestiti e interessi coerenti; insolvenza registrata, nessun saldo negativo', () => {
  const { LE } = load();
  const places = world(), pop = population(LE, places), eco = LE.create(13, places, START);
  run(LE, eco, envOf(pop), 156, () => { const a = LE.audit(eco); assert(a.ok, 'settimana ' + eco.week + ': ' + a.problems.slice(0, 3).join('; ')); });
  const t = LE.stats(eco).totals;
  assert(t.loansIssued > 0n, 'nessun prestito concesso');
  assert(t.deposited > 0n, 'nessun deposito');
  assert(t.loanInterestPaid > 0n, 'nessun interesse sui prestiti incassato');
  assert(t.depositInterest > 0n, 'nessun interesse sui depositi accreditato');
  // Insolvenza: banca senza capitale proprio, un luogo ricco che deposita e uno che ha perso quasi tutti i consumatori.
  const { LE: L2 } = load();
  L2.params.bank.capitalPerCapita = 0;
  const two = [{ id: 'ricca', continent: 'unico', kind: 'capital', population: 4000, links: ['vuota'] }, { id: 'vuota', continent: 'unico', kind: 'city', population: 3000, links: ['ricca'] }];
  const p2 = population(L2, two, { vuota: { alive: 40, wealth: 0 } }), e2 = L2.create(2, two, 0);
  run(L2, e2, envOf(p2), 260, () => { const a = L2.audit(e2); assert(a.ok, 'settimana ' + e2.week + ': ' + a.problems.slice(0, 3).join('; ')); });
  const t2 = L2.stats(e2).totals, ev = L2.events(e2);
  assert(ev.some(e => e.kind === 'bankrupt'), 'nessun fallimento registrato');
  assert(t2.writtenOff > 0n, 'nessun prestito svalutato');
  assert(ev.some(e => e.kind === 'insolvency'), 'nessuna insolvenza bancaria registrata');
  assert(t2.haircut > 0n, 'nessuna riduzione dei depositi registrata');
  return `prestiti ${t.loansIssued}, depositi ${t.deposited}, interessi ${t.loanInterestPaid}/${t.depositInterest}; insolvenza: svalutati ${t2.writtenOff}, depositi ridotti di ${t2.haircut}`;
});

check('9. Attività: chiudono dopo perdite prolungate, aprono dove c’è domanda', () => {
  const { LE } = load();
  const places = [{ id: 'calo', continent: 'a', kind: 'city', population: 3000, links: [] }, { id: 'fame', continent: 'b', kind: 'city', population: 3000, links: [] }];
  const bakers = Math.floor(3000 * LE.params.workforce.baker / 1000), farmers = Math.floor(3000 * LE.params.workforce.farmer / 1000);
  // «calo»: le miniere producono per 3000 abitanti ma ne restano 60 a comprare; «fame»: la popolazione è raddoppiata, ci sono
  // fornai e contadini senza lavoro ma i forni sono quelli di prima.
  const pop = population(LE, places, { calo: { alive: 60 }, fame: { alive: 6000, workers: { baker: bakers * 3, farmer: farmers * 2 } } });
  const eco = LE.create(6, places, 0);
  const mines0 = biz(LE, eco, 'calo', 'mine').open, ovens0 = biz(LE, eco, 'fame', 'bakery').open;
  run(LE, eco, envOf(pop), 80);
  const mines = biz(LE, eco, 'calo', 'mine').open, ovens = biz(LE, eco, 'fame', 'bakery').open;
  const ev = LE.events(eco);
  assert(mines < mines0, `miniere in perdita non chiuse (${mines0} → ${mines})`);
  assert(ev.some(e => e.kind === 'closure' && e.place === 'calo'), 'chiusura non registrata');
  assert(ovens > ovens0, `nessun forno aperto dove c’è domanda (${ovens0} → ${ovens})`);
  assert(ev.some(e => e.kind === 'opening' && e.place === 'fame'), 'apertura non registrata');
  return `miniere ${mines0} → ${mines}, forni ${ovens0} → ${ovens}`;
});

check('10. Crisi e scarsità rilevabili nei segnali; segnali neutri per un luogo sconosciuto', () => {
  const { LE } = load();
  const places = [{ id: 'assedio', continent: 'a', kind: 'town', population: 1500, links: [] }, { id: 'quiete', continent: 'b', kind: 'town', population: 1500, links: [] }];
  const pop = population(LE, places, { assedio: { workers: { farmer: 0, baker: 0, wellkeeper: 0 } } });
  const eco = LE.create(8, places, 0);
  run(LE, eco, envOf(pop), 10);
  const s = LE.signals(eco, 'assedio'), q = LE.signals(eco, 'quiete');
  assert(s.foodScarcity >= 300, 'scarsità di cibo ' + s.foodScarcity);
  assert.equal(s.crisis, 1, 'crisi non segnalata');
  assert(q.foodScarcity < s.foodScarcity, 'scarsità anche dove il cibo c’è');
  assert(LE.events(eco).some(e => e.kind === 'crisis' && e.place === 'assedio'), 'crisi non registrata fra gli eventi');
  for (const k of ['foodScarcity', 'priceIndex', 'wageIndex', 'unemployment', 'prosperity', 'crisis', 'war', 'disaster', 'season']) assert(Number.isInteger(s[k]), 'segnale non intero: ' + k);
  const n = LE.signals(eco, 'nessuno');
  assert.equal(JSON.stringify(n), JSON.stringify({ foodScarcity: 0, priceIndex: 1000, wageIndex: 1000, unemployment: 0, prosperity: 1000, crisis: 0, war: 0, disaster: 0, season: 0 }));
  assert.equal(JSON.stringify(LE.signals(null, 'x')), JSON.stringify(n), 'segnali senza economia non neutri');
  return `assedio: scarsità ${s.foodScarcity}‰, prezzi ${s.priceIndex}; quiete: scarsità ${q.foodScarcity}‰`;
});

check('11. Stagioni, guerre e calamità cambiano produzione, segnali e registro', () => {
  const { LE } = load();
  const places = [{ id: 'campi', continent: 'a', kind: 'town', population: 2000, links: [] }];
  const farmersFew = Math.floor(2000 * LE.params.workforce.farmer / 1000 / 2); // pochi contadini: la produzione resta al massimo
  const produced = (hooks, weeks) => {
    const { LE: L } = load();
    L.params.events.warStart = 0; L.params.events.calamity = 0; // solo gli eventi imposti: l'effetto si confronta a parità di tutto il resto
    const pop = population(L, places, { campi: { workers: { farmer: farmersFew } } }); const eco = L.create(1, places, 0);
    const rows = [];
    run(L, eco, envOf(pop, hooks), weeks, w => { rows.push({ w, grain: L.stats(eco).lastWeek.produced.grain, sig: L.signals(eco, 'campi') }); });
    return { rows, eco, L };
  };
  const base = produced(undefined, 16);
  const summer = base.rows.filter(r => r.sig.season === 1), winter = base.rows.filter(r => r.sig.season === 3);
  assert(summer.length && winter.length, 'stagioni non osservate');
  const avg = rs => rs.reduce((s, r) => s + r.grain, 0) / rs.length;
  assert(avg(summer) > avg(winter) * 1.6, `estate ${avg(summer)} contro inverno ${avg(winter)}`);
  const war = produced({ war: (c, w) => w >= 4 && w < 8 }, 10);
  const r5 = war.rows.find(r => r.w === 5), b5 = base.rows.find(r => r.w === 5);
  assert.equal(r5.sig.war, 1, 'segnale di guerra assente');
  assert(r5.grain < b5.grain, `la guerra non riduce la produzione (${r5.grain} contro ${b5.grain})`);
  assert(war.L.events(war.eco).some(e => e.kind === 'war'), 'guerra non registrata');
  assert(war.L.events(war.eco).some(e => e.kind === 'peace'), 'pace non registrata');
  const fire = produced({ disaster: (id, w) => (w === 3 ? 'fire' : null) }, 6);
  const f3 = fire.rows.find(r => r.w === 3);
  assert.equal(f3.sig.disaster, 1, 'segnale di calamità assente');
  const a = fire.L.audit(fire.eco), ev = fire.L.events(fire.eco).filter(e => e.kind === 'calamity');
  assert(ev.length >= 1 && /incendio/i.test(ev[0].text), 'incendio non registrato in italiano');
  assert(Object.values(a.goods).some(g => (g.lostBy.calamita || 0n) > 0n), 'merci distrutte dall’incendio non registrate');
  assert((a.money.burnedBy.calamita || 0n) > 0n, 'denaro distrutto dall’incendio non registrato');
  assert(a.ok, a.problems.join('; '));
  return `grano estate ${Math.round(avg(summer))} / inverno ${Math.round(avg(winter))}; guerra ${r5.grain} contro ${b5.grain}; incendio registrato`;
});

check('12. Ripristino con dati mancanti o danneggiati: non lancia mai e restituisce un’economia valida', () => {
  const { LE } = load();
  const places = world({ continents: 2, per: 3 }), pop = population(LE, places), eco = LE.create(5, places, 0);
  run(LE, eco, envOf(pop), 30);
  const good = JSON.parse(LE.serialize(eco));
  const variants = [undefined, null, 7, 'x', '{', '[]', { schema: 1 }, { ...good, schema: 2 }, { ...good, seed: -1 }, { ...good, week: 'x' }];
  const deep = f => { const c = JSON.parse(JSON.stringify(good)); f(c); return c; };
  const firstPlace = Object.keys(good.places)[0];
  variants.push(deep(c => { c.places[firstPlace][3][0][1] = '-5'; }));
  variants.push(deep(c => { c.places[firstPlace][3][0][1] = 'abc'; }));
  variants.push(deep(c => { c.places[firstPlace][3] = 'rotto'; }));
  variants.push(deep(c => { c.places.__proto__ = { x: 1 }; c.places.fantasma = c.places[firstPlace]; }));
  variants.push(deep(c => { c.caravans = [[1, 'nessuno', firstPlace, [5], '0', '0', 3, 0, 1]]; }));
  variants.push(deep(c => { c.ledger.open = String(BigInt(c.ledger.open) + 1n); }));
  variants.push(deep(c => { c.banks = { x: 'y' }; }));
  variants.push(deep(c => { c.events = 'no'; c.counts = null; }));
  variants.push(deep(c => { c.places[firstPlace][1] = new Array(10).fill(1e300); }));
  variants.push(JSON.stringify(good).replace(/"places"/, '"__proto__"'));
  let n = 0;
  for (const raw of variants) {
    let e;
    assert.doesNotThrow(() => { e = LE.restore(raw, places, 30 * WEEK); }, 'il ripristino ha lanciato con la variante ' + n);
    const a = LE.audit(e);
    assert(a.ok, 'variante ' + n + ': ' + a.problems.slice(0, 2).join('; '));
    assert.doesNotThrow(() => run(LE, e, envOf(population(LE, places)), 3), 'passo dopo la variante ' + n);
    assert(LE.audit(e).ok, 'variante ' + n + ' dopo tre settimane');
    n++;
  }
  // Luoghi cambiati fra salvataggio e caricamento: uno nuovo e uno scomparso, con conti esatti.
  const changed = places.filter(p => p.id !== 'c1p2').concat([{ id: 'nuova', continent: 'continente-2', kind: 'town', population: 800, links: [] }]);
  const e2 = LE.restore(good, changed, 30 * WEEK), a2 = LE.audit(e2);
  assert(a2.ok, 'luoghi cambiati: ' + a2.problems.slice(0, 2).join('; '));
  assert(LE.report(e2, 'nuova') && !LE.report(e2, 'c1p2'), 'luoghi non riallineati');
  assert((a2.money.mintedBy['nuovo luogo'] || 0n) > 0n, 'denaro del luogo nuovo non registrato come emissione');
  assert((a2.money.burnedBy['luogo scomparso'] || 0n) > 0n, 'denaro del luogo scomparso non registrato come distruzione');
  assert(Object.values(a2.goods).some(g => (g.addedBy['nuovo luogo'] || 0n) > 0n), 'merci del luogo nuovo non registrate');
  return `${n} varianti danneggiate ripristinate senza errori; luoghi cambiati riallineati`;
});

check('13. Prestazioni indicative: una settimana con 50 e con 500 luoghi', () => {
  const notes = [];
  for (const [continents, per] of [[5, 10], [10, 50]]) {
    const { LE } = load();
    const places = world({ continents, per, wild: false }), pop = population(LE, places), eco = LE.create(1, places, 0), env = envOf(pop);
    run(LE, eco, env, 3);
    const times = [];
    for (let k = 0; k < 5; k++) { const t0 = process.hrtime.bigint(); LE.step(eco, eco.week, env); times.push(Number(process.hrtime.bigint() - t0) / 1e6); }
    times.sort((a, b) => a - b);
    const bytes = Buffer.byteLength(LE.serialize(eco));
    notes.push(`${places.length} luoghi: mediana ${times[2].toFixed(2)} ms, massimo ${times[4].toFixed(2)} ms, salvataggio ${(bytes / 1024).toFixed(1)} KB`);
    assert(times[2] < 2000, 'settimana troppo lenta: ' + times[2]);
  }
  return notes.join('; ');
});

check('14. Rapporto in italiano, registro con tetto, moneta universale identica a trade-economy', () => {
  const { LE, scope } = load(null, ['trade-economy.js']);
  for (const n of [0n, 1n, 99n, 100n, 12345n, 1000000n, 1234567890123n]) assert.equal(LE.wallet(n).label, scope.Economy.wallet(n).label, 'moneta diversa per ' + n);
  const places = world(), pop = population(LE, places), eco = LE.create(17, places, START);
  run(LE, eco, envOf(pop), 520);
  const r = LE.report(eco, 'c0p0');
  assert(r && Array.isArray(r.lines) && r.lines.length >= 5, 'rapporto vuoto');
  assert(r.lines.some(l => /Scintill|Lunar|Solar|Astral/.test(l)), 'importi non nella moneta universale');
  assert(r.lines.some(l => /Banca|Tesoreria/.test(l)), 'banca o tesoreria assenti dal rapporto');
  assert.equal(LE.report(eco, 'nessuno'), null);
  const ev = LE.events(eco);
  assert(ev.length > 0 && ev.length <= LE.params.limits.events, 'registro senza tetto: ' + ev.length);
  assert(ev.every(e => Number.isInteger(e.week) && typeof e.kind === 'string' && typeof e.text === 'string' && e.text.length > 5), 'evento malformato');
  const total = Object.values(LE.stats(eco).counts).reduce((s, n) => s + n, 0);
  assert(total >= ev.length, 'contatori degli eventi incoerenti');
  return `${r.lines.length} righe; ${ev.length} eventi conservati su ${total}; es. «${r.lines[1]}»`;
});

check('20. Intervallo compresso di WorldSim (oltre maxChunks): pausa dichiarata, nessuna storia inventata, conti esatti', () => {
  const { LE, scope } = load(null, ['world-sim.js']);
  const W = scope.WorldSim, places = world({ continents: 2, per: 3 }), pop = population(LE, places), env = envOf(pop);
  const s = { world: W.create(0), eco: LE.create(5, places, 0) };
  W.register('living-economy', LE.system(st => st.eco, () => env, { maxChunks: 10 }));
  const spec = LE.system(() => null, () => env, { maxChunks: 10 });
  assert.equal(spec.level, 3); assert.equal(spec.step, WEEK); assert.equal(spec.maxChunks, 10);
  W.resolveAll(s, 30 * WEEK);
  assert.equal(s.eco.week, 30, 'settimana finale ' + s.eco.week);
  assert.equal(LE.stats(s.eco).totals.pausedWeeks, 20, 'settimane in pausa: ' + LE.stats(s.eco).totals.pausedWeeks);
  assert.equal(pop.log.calls, 10 * places.filter(p => p.population > 0).length, 'trasferimenti per settimane non simulate: ' + pop.log.calls);
  const a = LE.audit(s.eco);
  assert(a.ok, a.problems.join('; '));
  assert.equal(LE.step(s.eco, 3, env), false, 'una settimana già passata viene rielaborata');
  return '20 settimane in pausa dichiarata + 10 simulate';
});

/* ---------- mutazioni: ogni modifica del codice deve far fallire una prova ---------- */
function detects(marker, replacement, property) {
  const src = fs.readFileSync(FILE, 'utf8');
  assert(src.includes(marker), 'punto da mutare assente nel modulo: ' + marker);
  try { property(load(s => s.replace(marker, replacement)).LE); }
  catch (e) { if (e && e.name === 'AssertionError') return 'rilevata'; throw e; }
  throw new Error('la mutazione non è stata rilevata');
}
check('15. Mutazione: merci di una carovana perduta non registrate → conservazione delle merci violata', () => detects('/*M:perdita*/', '/*mutato*/0&&', LE => {
  LE.params.events.caravanLossWar = 1000;
  const w = caravanWorld(LE), eco = LE.create(21, w.places, 0);
  let warFrom = Infinity;
  run(LE, eco, () => envOf(w.pop, { war: (c, week) => week >= warFrom }), 30, () => { if (warFrom === Infinity && LE.caravans(eco).length) warFrom = eco.week; assert(LE.audit(eco).ok, 'verifica fallita'); });
}));
check('16. Mutazione: interessi sui prestiti non versati alla banca → conservazione del denaro violata', () => detects('/*M:interesse*/', '/*mutato*/0&&', LE => {
  const places = world(), pop = population(LE, places), eco = LE.create(13, places, START);
  run(LE, eco, envOf(pop), 156, () => assert(LE.audit(eco).ok, 'verifica fallita'));
}));
check('17. Mutazione: indice di scarsità invertito → i prezzi non seguono la scarsità', () => detects('/*M:scarsita*/', '/*mutato*/-', LE => {
  const places = [{ id: 'arida', continent: 'a', kind: 'town', population: 1200, links: [] }];
  const pop = population(LE, places, { arida: { workers: { farmer: 0 } } }), eco = LE.create(3, places, 0);
  run(LE, eco, envOf(pop), 16);
  assert(price(LE, eco, 'arida', 'grain').index >= 1400, 'grano non rincarato');
}));
check('18. Mutazione: spesa richiesta usata al posto di quella applicata → denaro creato con famiglie povere', () => detects('/*M:applicati*/', '/*mutato*/spendReq||', LE => {
  const places = world({ continents: 1, per: 3, wild: false }), pop = population(LE, places, { c0p0: { wealth: 0 }, c0p1: { wealth: 0 }, c0p2: { wealth: 0 } });
  const eco = LE.create(4, places, 0), start = pop.total() + LE.audit(eco).money.accounts;
  run(LE, eco, envOf(pop), 8, () => { const a = LE.audit(eco); assert.equal(pop.total() + a.money.accounts, start + a.money.minted - a.money.burned, 'denaro creato'); });
}));
check('19. Mutazione: raccolto legato al numero di chiamate e non alla settimana → ripristino non identico', () => detects('/*M:settimana*/week', '/*mutato*/(globalThis.__n=(globalThis.__n||0)+1)', LE => {
  const places = world({ continents: 1, per: 3, wild: false });
  const pop = population(LE, places), eco = LE.create(9, places, 0);
  run(LE, eco, envOf(pop), 40);
  const ref = snapshot(LE, eco, pop);
  const { LE: L1 } = load(s => s.replace('/*M:settimana*/week', '/*mutato*/(globalThis.__n=(globalThis.__n||0)+1)'));
  const p1 = population(L1, places), e1 = L1.create(9, places, 0);
  run(L1, e1, envOf(p1), 20);
  const { LE: L2 } = load(s => s.replace('/*M:settimana*/week', '/*mutato*/(globalThis.__n=(globalThis.__n||0)+1)'));
  const p2 = population(L2, places); p2.load(p1.dump());
  const e2 = L2.restore(L1.serialize(e1), places, 20 * WEEK);
  run(L2, e2, envOf(p2), 20);
  assert.equal(snapshot(L2, e2, p2), ref, 'continuazione diversa');
}));

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
