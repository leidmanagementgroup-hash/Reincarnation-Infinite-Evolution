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
  assert(a.money.minted > 0n, 'nessuna emissione: la conservazione con emissioni non è provata');
  assert((st.counts.caravanLost || 0) + (st.counts.caravanRaided || 0) > 0, 'nessuna carovana colpita: la conservazione con perdite di carovane non è provata');
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
  assert(inFlight >= 20, 'la prova non incontra abbastanza incassi in sospeso (non è una divergenza): ' + inFlight);
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
  const p2 = population(L2, two), e2 = L2.create(2, two, 0);
  run(L2, e2, envOf(p2), 30);
  // Metà delle miniere resta senza clienti con un debito da rimborsare, poi una guerra lunghissima svuota la banca.
  { const bz = e2.places.vuota.b[L2.TYPES.indexOf('mine')], bank = e2.banks.unico, a = 3000n; bank.r -= a; bank.loans += a; bz.debt += a; e2.ledger.burn.prova = bz.cash; e2.ledger.burn.prova += a; bz.cash = 0n; p2.state.vuota.workers.miner = 0; const g = L2.GOODS.indexOf('ore'), row = e2.ledger.gLost.prova = L2.GOODS.map(() => 0n); for (const b of e2.places.vuota.b) { row[g] += BigInt(b.s[g]); b.s[g] = 0; } }
  run(L2, e2, envOf(p2, { war: () => true }), 150, () => { const a = L2.audit(e2); assert(a.ok, 'settimana ' + e2.week + ': ' + a.problems.slice(0, 3).join('; ')); });
  const t2 = L2.stats(e2).totals, ev = L2.events(e2);
  const c2 = L2.stats(e2).counts; assert(c2.bankrupt >= 1, 'nessun fallimento registrato');
  assert(t2.writtenOff > 0n, 'nessun prestito svalutato');
  assert(c2.insolvency >= 1 && ev.length > 0, 'nessuna insolvenza bancaria registrata');
  assert(t2.haircut > 0n, 'nessuna riduzione dei depositi registrata');
  return `prestiti ${t.loansIssued}, depositi ${t.deposited}, interessi ${t.loanInterestPaid}/${t.depositInterest}; insolvenza: svalutati ${t2.writtenOff}, depositi ridotti di ${t2.haircut}`;
});

check('9. Attività: chiudono dopo perdite prolungate, aprono dove c’è domanda', () => {
  const { LE } = load();
  const places = [{ id: 'calo', continent: 'a', kind: 'city', population: 3000, links: [] }, { id: 'fame', continent: 'b', kind: 'city', population: 3000, links: [] }];
  const bakers = Math.floor(3000 * LE.params.workforce.baker / 1000), farmers = Math.floor(3000 * LE.params.workforce.farmer / 1000);
  // «calo»: le miniere producono per 3000 abitanti ma ne restano 60 a comprare; «fame»: la popolazione è raddoppiata, ci sono
  // fornai e contadini senza lavoro ma i forni sono quelli di prima.
  const pop = population(LE, places);
  const eco = LE.create(6, places, 0);
  run(LE, eco, envOf(pop), 2);
  Object.assign(pop.state.calo, { alive: 60, adults: 36 }); Object.assign(pop.state.fame, { alive: 6000, adults: 3600 }); Object.assign(pop.state.fame.workers, { baker: bakers * 3, farmer: farmers * 2 }); pop.state.fame.wealth *= 2n;
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
  assert.equal(JSON.stringify(n), JSON.stringify({ foodScarcity: 0, priceIndex: 1000, wageIndex: 1000, unemployment: 0, prosperity: 1000, crisis: 0, war: 0, disaster: 0, season: 0, labor: {} }));
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
  const dry = produced({ disaster: (id, w) => (w === 4 ? 'drought' : null) }, 8), d5 = dry.rows.find(r => r.w === 5);
  assert(d5.grain < b5.grain * 0.7, `la siccità non riduce il grano (${d5.grain} contro ${b5.grain})`);
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
  assert((a2.money.mintedBy.nuovo_luogo || 0n) > 0n, 'denaro del luogo nuovo non registrato come emissione');
  assert((a2.money.burnedBy.luogo_scomparso || 0n) > 0n, 'denaro del luogo scomparso non registrato come distruzione');
  assert(Object.values(a2.goods).some(g => (g.addedBy.nuovo_luogo || 0n) > 0n), 'merci del luogo nuovo non registrate');
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

check('20. Anche un intervallo compresso da WorldSim si risolve settimana per settimana: nessuna pausa', () => {
  const { LE, scope } = load(null, ['world-sim.js']);
  const W = scope.WorldSim, places = world({ continents: 2, per: 3 }), pop = population(LE, places), env = envOf(pop);
  const s = { world: W.create(0), eco: LE.create(5, places, 0) };
  W.register('living-economy', LE.system(st => st.eco, () => env, { maxChunks: 10 }));
  const spec = LE.system(() => null, () => env);
  assert.equal(spec.level, 3); assert.equal(spec.step, WEEK); assert(spec.maxChunks >= 100000, 'con il valore normale WorldSim comprime: ' + spec.maxChunks);
  W.resolveAll(s, 30 * WEEK);
  assert.equal(s.eco.week, 30, 'settimana finale ' + s.eco.week);
  assert.equal(LE.stats(s.eco).totals.pausedWeeks, 0, 'settimane in pausa');
  assert.equal(pop.log.calls, 30 * places.filter(p => p.population > 0).length, 'trasferimenti: ' + pop.log.calls);
  const ref = population(LE, places), eco = LE.create(5, places, 0); run(LE, eco, envOf(ref), 30);
  assert.equal(snapshot(LE, s.eco, pop), snapshot(LE, eco, ref), 'diverso dal passo settimanale');
  assert.equal(LE.step(s.eco, 3, env), false, 'una settimana già passata viene rielaborata');
  return '30 settimane, 20 in un intervallo compresso';
});

/* ---------- seconda fase: ogni prova nasce da un difetto dimostrato dalla revisione (viste fallire sul modulo precedente) ---------- */
const typeIndex = (LE, t) => LE.TYPES.indexOf(t);
const quiet = LE => { LE.params.events.warStart = 0; LE.params.events.calamity = 0; LE.params.events.harvestSpread = 0; return LE; };
const show = v => JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? String(x) : x));
// Interventi della prova sullo stato, sempre registrati (causa «prova»), così i conti restano in pari.
const dropStock = (LE, eco, id, good) => { const g = LE.GOODS.indexOf(good), row = eco.ledger.gLost.prova || (eco.ledger.gLost.prova = LE.GOODS.map(() => 0n)); for (const b of eco.places[id].b) { row[g] += BigInt(b.s[g]); b.s[g] = 0; } };
const giveStock = (LE, eco, id, type, good, q) => { const g = LE.GOODS.indexOf(good), row = eco.ledger.gAdd.prova || (eco.ledger.gAdd.prova = LE.GOODS.map(() => 0n)); row[g] += BigInt(q); eco.places[id].b[typeIndex(LE, type)].s[g] += q; };
const giveMoney = (eco, a) => { const box = a >= 0n ? eco.ledger.mint : eco.ledger.burn, v = a >= 0n ? a : -a; box.prova = (box.prova || 0n) + v; };
const settleLedger = (LE, eco) => { const a = LE.audit(eco).money; eco.ledger.open += a.accounts - a.expected; };
const spy = (pop, hooks, seen) => { const env = envOf(pop, hooks); env.population.transfer = (id, f) => { seen(id, f); return pop.transfer(id, f); }; return env; };

check('22. Luogo aggiunto o tolto, poi DUE salvataggi e caricamenti: il mondo non si ricrea e resta identico', () => {
  const { LE } = load();
  const places = world({ continents: 2, per: 3 }), pop = population(LE, places), eco = LE.create(5, places, 0);
  run(LE, eco, envOf(pop), 30);
  const added = places.concat([{ id: 'nuova', continent: 'continente-2', kind: 'town', population: 800, links: [] }]), removed = places.filter(p => p.id !== 'c1p2');
  for (const list of [added, removed]) {
    const first = LE.restore(LE.serialize(eco), list, 30 * WEEK), text = LE.serialize(first);
    const second = LE.restore(text, list, 30 * WEEK);
    assert.equal(LE.serialize(second), text, 'il secondo caricamento cambia il mondo');
    assert(!LE.events(second).some(e => e.kind === 'repair'), 'riparazione dichiarata senza danni');
    assert.equal(second.ledger.toHH, eco.ledger.toHH, 'storia del denaro azzerata');
    run(LE, second, envOf(population(LE, list)), 3); assert(LE.audit(second).ok);
  }
  // Un salvataggio già scritto con le vecchie cause («nuovo luogo», con lo spazio) si legge ancora.
  const old = JSON.parse(LE.serialize(LE.restore(LE.serialize(eco), added, 30 * WEEK)));
  for (const box of [old.ledger.mint, old.ledger.burn, old.ledger.lost, old.ledger.added]) for (const k of Object.keys(box)) if (/_luogo|luogo_/.test(k)) { box[k.replace('_', ' ')] = box[k]; delete box[k]; }
  const e = LE.restore(old, added, 30 * WEEK);
  assert.equal(e.ledger.toHH, eco.ledger.toHH, 'un salvataggio con le vecchie cause viene buttato via');
  assert(LE.audit(e).ok);
});

check('23. Un solo dato danneggiato non butta via il mondo: ogni foglia del salvataggio rovinata, una alla volta', () => {
  const { LE } = load();
  const w = caravanWorld(LE), eco = LE.create(21, w.places, 0);
  run(LE, eco, envOf(w.pop, { war: (c, k) => k > 20 && k < 24 && c === 'nord', disaster: (id, k) => (k === 29 ? 'fire' : null) }), 30);
  const good = JSON.parse(LE.serialize(eco)), leaves = [];
  const walk = (node, at) => { if (node && typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], at.concat(k)); else leaves.push(at); };
  walk(good, []);
  const values = [null, 'abc', '-5', -1, 1e300, 0.5, {}, []];
  let n = 0, worst = 0n;
  const total = LE.audit(eco).money.accounts, other = id => JSON.stringify(good.places[id]);
  for (let k = 0; k < leaves.length; k++) {
    const at = leaves[k];
    if (at[0] === 'schema' || at[0] === 'events') continue;
    const value = values[k % values.length], c = JSON.parse(JSON.stringify(good)), tag = at.join('.') + ' = ' + JSON.stringify(value);
    let box = c; for (const key of at.slice(0, -1)) box = box[key];
    box[at.at(-1)] = value;
    let e; assert.doesNotThrow(() => { e = LE.restore(c, w.places, 30 * WEEK); }, 'lancia per ' + tag);
    assert(LE.audit(e).ok, tag + ': ' + LE.audit(e).problems.slice(0, 2).join('; '));
    if (at[0] !== 'week') assert.equal(e.week, eco.week, 'settimana persa per ' + tag);
    if (at[0] !== 'seed') assert.equal(e.seed, eco.seed, 'seme perso per ' + tag);
    assert(e.events.length >= good.events.length, 'mondo ricreato per ' + tag);
    const here = at[0] === 'places' ? at[1] : null, out = JSON.parse(LE.serialize(e));
    for (const id of Object.keys(good.places)) if (id !== here) assert.equal(JSON.stringify(out.places[id]), other(id), 'altro luogo toccato da ' + tag);
    const d = LE.audit(e).money.accounts - total, abs = d < 0n ? -d : d; if (abs > worst) worst = abs;
    n++;
  }
  assert(worst <= total / 5n, 'un solo dato rovinato sposta ' + worst + ' Scintille su ' + total);
  // Danni strutturali recuperabili: le casse dei luoghi restano.
  for (const f of [c => { delete c.banks; }, c => { c.banks = []; }, c => { c.treasuries = 7; }, c => { c.ledger = null; }, c => { c.caravans = 'x'; }, c => { c.counts = null; c.totals = null; }, c => { c.continents = {}; }, c => { c.events = 'no'; }, c => { c.tx = 4; }]) {
    const c = JSON.parse(JSON.stringify(good)); f(c);
    const e = LE.restore(c, w.places, 30 * WEEK), out = JSON.parse(LE.serialize(e));
    assert(LE.audit(e).ok, String(f) + LE.audit(e).problems.slice(0, 2).join('; ')); assert.equal(e.week, eco.week, 'settimana persa: ' + f);
    for (const id of Object.keys(good.places)) assert.equal(JSON.stringify(out.places[id][3].map(b => b[1])), JSON.stringify(good.places[id][3].map(b => b[1])), 'casse perse: ' + f);
  }
  return `${n} foglie rovinate una alla volta, mondo sempre conservato; scarto massimo ${worst} Scintille su ${total}`;
});

check('24. Nessun vantaggio alfabetico: luoghi identici con tesoreria scarsa finiscono alla pari; le carovane vanno dove rende di più', () => {
  const totals = {};
  for (let seed = 1; seed <= 6; seed++) {
    const { LE } = load(); quiet(LE); LE.params.tax.treasuryPerCapita = 1;
    const places = ['aloco', 'mloco', 'zloco'].map(id => ({ id, continent: 'c', kind: 'town', population: 800, links: [] }));
    const none = Object.fromEntries(Object.values(LE.params.types).map(t => [t.job, 0]));
    const pop = population(LE, places, Object.fromEntries(places.map(p => [p.id, { workers: none }]))), eco = LE.create(seed, places, 0);
    run(LE, eco, envOf(pop), 60);
    for (const p of places) totals[p.id] = (totals[p.id] || 0) + Number(pop.state[p.id].wealth) + 1;
  }
  const v = Object.values(totals), spread = (Math.max(...v) - Math.min(...v)) / Math.max(...v);
  assert(spread < 0.005, 'famiglie diverse solo per il nome: ' + JSON.stringify(totals));
  // Capacità per un solo carico e due destinazioni: vince quella che paga di più, non la prima in ordine alfabetico.
  const { LE } = load(); quiet(LE);
  const city = (id, links) => ({ id, continent: 'c', kind: 'city', population: 2000, links });
  const places = [city('origine', ['apaga', 'zpaga']), city('apaga', []), city('zpaga', [])];
  const pop = population(LE, places), eco = LE.create(3, places, 0), gi = LE.GOODS.indexOf('ore');
  LE.params.caravans.perMerchant = 400;
  run(LE, eco, envOf(pop), 1);
  for (const id of ['apaga', 'zpaga']) dropStock(LE, eco, id, 'ore');
  eco.places.apaga.i[gi] = 1800; eco.places.zpaga.i[gi] = 2500;
  const th = eco.places.origine.b[typeIndex(LE, 'trade')]; th.n = Math.max(1, th.n); th.cash += 5000n; giveMoney(eco, 5000n);
  giveStock(LE, eco, 'origine', 'mine', 'ore', 5e6);
  run(LE, eco, envOf(pop), 1);
  const ore = LE.caravans(eco).filter(c => c.from === 'origine' && c.cargo.ore), to = id => ore.filter(c => c.to === id).reduce((s, c) => s + c.cargo.ore, 0);
  assert(ore.length >= 1, 'nessuna carovana di minerale');
  assert(to('zpaga') > to('apaga'), `carico al primo in ordine alfabetico: apaga ${to('apaga')}, zpaga ${to('zpaga')}`);
  assert(LE.audit(eco).ok, LE.audit(eco).problems.join('; '));
  return `scarto ${(spread * 100).toFixed(2)}%; apaga ${to('apaga')}, zpaga ${to('zpaga')}`;
});

check('25. Attività senza più lavoratori: chiude e la cassa passa alla tesoreria (nessun fantasma)', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'borgo', continent: 'a', kind: 'village', population: 100, links: [] }], pop = population(LE, places), eco = LE.create(1, places, 0);
  run(LE, eco, envOf(pop), 30);
  for (const job of ['miner', 'mystic', 'smith']) pop.state.borgo.workers[job] = 0;
  run(LE, eco, envOf(pop), 60);
  for (const t of ['mine', 'sanctum', 'smithy']) { const b = eco.places.borgo.b[typeIndex(LE, t)]; assert.equal(b.n, 0, t + ' ancora aperta'); assert.equal(b.cash, 0n, t + ' con cassa'); assert.equal(b.dep, 0n); assert.equal(b.debt, 0n); }
  assert(LE.audit(eco).ok);
});

check('26. Niente dividendi con debiti, rimborsi prima dei dividendi, deposito compensato col debito alla chiusura', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'borgo', continent: 'a', kind: 'town', population: 1000, links: [] }], pop = population(LE, places), eco = LE.create(1, places, 0);
  run(LE, eco, envOf(pop), 4);
  const b = eco.places.borgo.b[typeIndex(LE, 'mine')], bank = eco.banks.a, lend = 800n;
  bank.r += 5000n; giveMoney(eco, 5000n);
  bank.r -= lend; bank.loans += lend; b.debt += lend; b.cash += lend;
  let asked = 0n; const before = b.debt;
  run(LE, eco, spy(pop, undefined, (id, f) => { asked = f.wages.miner || 0n; }), 1);
  const wages = BigInt(b.e) * BigInt(Math.ceil(LE.params.wages.miner * 1.4));
  assert(asked <= wages, `${asked} Scintille a ${b.e} minatori con un debito: i dividendi escono dal prestito`);
  assert(b.debt < before, 'debito non rimborsato con la cassa disponibile');
  assert(LE.audit(eco).ok, LE.audit(eco).problems.join('; '));
  // Chiusura con deposito pari al debito: il deposito paga la banca, quasi nulla si svaluta.
  const { LE: L2 } = load(); quiet(L2);
  const p2 = population(L2, places), e2 = L2.create(1, places, 0); run(L2, e2, envOf(p2), 4);
  const m = e2.places.borgo.b[typeIndex(L2, 'smithy')], k2 = e2.banks.a;
  p2.state.borgo.workers.smith = 0;
  k2.dep -= m.dep; k2.loans -= m.debt; m.cash = 0n; m.dep = 500n; m.debt = 500n; k2.dep += 500n; k2.loans += 500n; k2.r += 5000n; settleLedger(L2, e2);
  m.n = 1; m.loss = 50; m.pr = -1000n;
  const off = e2.totals.writtenOff;
  run(L2, e2, envOf(p2), 1);
  assert.equal(m.n, 0, 'non ha chiuso'); assert.equal(m.dep, 0n, 'deposito rimasto dopo la chiusura');
  assert(e2.totals.writtenOff - off <= 10n, 'svalutato con un deposito pari al debito: ' + (e2.totals.writtenOff - off));
  assert(L2.audit(e2).ok, L2.audit(e2).problems.join('; '));
});

check('27. Credito con controllo del margine: non si apre dove si lavora in perdita, si apre dove conviene', () => {
  const go = oreIndex => {
    const { LE } = load(); quiet(LE);
    const places = [{ id: 'borgo', continent: 'a', kind: 'town', population: 1500, links: [] }], pop = population(LE, places), eco = LE.create(1, places, 0);
    run(LE, eco, envOf(pop), 2);
    pop.state.borgo.workers.smith = 40; pop.state.borgo.workers.carpenter = 0;
    const pl = eco.places.borgo, gw = LE.GOODS.indexOf('work'), gr = LE.GOODS.indexOf('ore');
    for (const t of ['smithy', 'workshop']) pl.b[typeIndex(LE, t)].n = 0;
    eco.banks.a.r += 20000n; giveMoney(eco, 20000n);
    dropStock(LE, eco, 'borgo', 'work');
    let opened = 0;
    for (let k = 0; k < 6; k++) { pl.i[gw] = 1250; pl.i[gr] = oreIndex; run(LE, eco, envOf(pop), 1); opened = Math.max(opened, pl.b[typeIndex(LE, 'smithy')].n); }
    assert(LE.audit(eco).ok);
    return opened;
  };
  const bad = go(6000), good = go(700);
  assert.equal(bad, 0, 'fucine aperte col minerale carissimo: ' + bad);
  assert(good > 0, 'nessuna fucina aperta col minerale a buon prezzo e manufatti esauriti');
  return `minerale carissimo ${bad} fucine, a buon prezzo ${good}`;
});

check('28. Ricapitalizzazione regolata: una banca sotto il capitale richiesto si ricostituisce con fondi pubblici, conti esatti', () => {
  const { LE } = load(); quiet(LE);
  const places = world({ continents: 1, per: 4, wild: false }), pop = population(LE, places), eco = LE.create(4, places, 0);
  run(LE, eco, envOf(pop), 20);
  const bank = eco.banks['continente-0'], k = bank.r + bank.loans - bank.dep, lost = minB(bank.r, k - 500n);
  bank.r -= lost; giveMoney(eco, -lost);
  eco.treasuries['continente-0'] += 200000n; giveMoney(eco, 200000n);
  const series = [];
  run(LE, eco, envOf(pop), 60, () => { const a = LE.audit(eco); assert(a.ok, a.problems.join('; ')); series.push(Number(bank.r + bank.loans - bank.dep)); });
  assert(series.at(-1) > 10000, 'patrimonio non ricostituito: ' + series.at(-1));
  assert(series[0] < series.at(-1) / 2, 'ricostituito in un colpo solo, senza regola: ' + series[0]);
  assert(BigInt(LE.stats(eco).totals.recapitalized) > 0n, 'ricapitalizzazione non registrata');
  return `patrimonio ${series[0]} → ${series.at(-1)}`;
});

check('29. Segnale labor: carenza oltre 1000, eccedenza sotto 1000, tutti i mestieri contati (locandieri e addetti pubblici compresi)', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'borgo', continent: 'a', kind: 'city', population: 2000, links: [] }, { id: 'pari', continent: 'b', kind: 'city', population: 2000, links: [] }];
  const wf = LE.params.workforce, n = j => Math.floor(2000 * (wf[j] || 20) / 1000);
  const pop = population(LE, places, { borgo: { workers: { baker: Math.floor(n('baker') / 4), smith: n('smith') * 6, guard: n('guard') * 5, innkeeper: n('innkeeper') * 6 } } }), eco = LE.create(2, places, 0);
  pop.state.borgo.unemployed = pop.state.pari.unemployed; // a parità di disoccupati dichiarati contano solo le eccedenze
  run(LE, eco, envOf(pop), 24);
  const s = LE.signals(eco, 'borgo').labor, q = LE.signals(eco, 'pari').labor;
  assert(s && typeof s === 'object', 'labor assente');
  for (const j of Object.keys(LE.params.wages)) assert(Number.isInteger(s[j]) && s[j] >= 0, 'labor.' + j + ' = ' + s[j]);
  assert(s.baker > 1300, 'fornai mancanti: ' + s.baker); assert(s.smith < 800, 'fabbri in eccedenza: ' + s.smith);
  assert(s.guard < 500, 'guardie in eccedenza: ' + s.guard); assert(s.innkeeper < 500, 'locandieri in eccedenza: ' + s.innkeeper);
  for (const j of Object.keys(wf)) assert(q[j] >= 600 && q[j] <= 1600, `mestieri in equilibrio: ${j} = ${q[j]}`);
  // I locandieri in numero giusto sono pagati; chi non ha posto conta come inattivo.
  let inn = 0n;
  run(LE, eco, spy(pop, undefined, (id, f) => { if (id === 'pari') inn += f.wages.innkeeper || 0n; }), 4);
  assert(inn > 0n, 'locandieri mai pagati');
  assert(LE.signals(eco, 'borgo').unemployment > LE.signals(eco, 'pari').unemployment + 60, 'eccedenze non contate nella disoccupazione');
  assert.equal(show(LE.signals(LE.restore(LE.serialize(eco), places, eco.week * WEEK), 'borgo')), show(LE.signals(eco, 'borgo')), 'segnali diversi dopo il ripristino');
  assert.equal(show(LE.signals(eco, 'nessuno').labor), '{}');
  return `fornai ${s.baker}, fabbri ${s.smith}, guardie ${s.guard}, locandieri ${s.innkeeper}`;
});

check('30. Prosperità significativa: sale col benessere e scende con la miseria, per famiglie povere e ricche', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'ricca', continent: 'a', kind: 'city', population: 2000, links: [] }, { id: 'media', continent: 'b', kind: 'city', population: 2000, links: [] }];
  const pop = population(LE, places, { ricca: { wealth: 2000 * 2500 } }), eco = LE.create(2, places, 0);
  run(LE, eco, envOf(pop), 40);
  const a = LE.signals(eco, 'ricca').prosperity, b = LE.signals(eco, 'media').prosperity;
  assert(a < 2500 && a > 600, 'ricchezza in Scintille da residenti veri: prosperità ' + a); assert(b > 500 && b < 2000, 'famiglie modeste ma occupate: ' + b);
  pop.state.ricca.wealth /= 8n; // saccheggio: perde sette ottavi
  run(LE, eco, envOf(pop), 4); const poor = LE.signals(eco, 'ricca').prosperity;
  assert(poor < a - 100, `la miseria improvvisa non si vede: ${a} → ${poor}`);
  pop.state.media.workers = {}; run(LE, eco, envOf(pop), 30);
  assert(LE.signals(eco, 'media').prosperity < b - 250, 'senza lavoro la prosperità resta ' + LE.signals(eco, 'media').prosperity);
  return `ricca ${a}, modesta ${b}, impoverita ${poor}`;
});

check('31. Spesa legata alla ricchezza: a parità di prezzi e redditi chi si è arricchito spende di più, chi si è impoverito risparmia', () => {
  const go = factor => {
    const { LE } = load(); quiet(LE);
    const places = [{ id: 'x', continent: 'a', kind: 'city', population: 2000, links: [] }], pop = population(LE, places, { x: { wealth: 2000 * 800 } }), eco = LE.create(2, places, 0);
    run(LE, eco, envOf(pop), 20);
    pop.state.x.wealth = pop.state.x.wealth * BigInt(factor) / 4n;
    LE.step(eco, eco.week, envOf(pop)); return Number(LE.stats(eco).lastWeek.spend);
  };
  const low = go(1), same = go(4), high = go(12);
  assert(high > same * 1.03, `arricchiti ${high} contro ${same}`); assert(low < same * 0.97, `impoveriti ${low} contro ${same}`);
  return `${low} < ${same} < ${high}`;
});

check('32. Acqua e pane di base: senza pozzaioli e fornai le case si arrangiano (acqua attinta, pane di casa dal grano), con registro esatto; senza grano è carestia', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'borgo', continent: 'a', kind: 'village', population: 200, links: [] }];
  const pop = population(LE, places, { borgo: { workers: { wellkeeper: 0, baker: 0, farmer: 40 } } }), eco = LE.create(3, places, 0);
  run(LE, eco, envOf(pop), 40, () => { const a = LE.audit(eco); assert(a.ok, a.problems.join('; ')); });
  assert(LE.signals(eco, 'borgo').foodScarcity < 300, 'scarsità ' + LE.signals(eco, 'borgo').foodScarcity);
  const g = LE.audit(eco).goods; assert(g.water.produced > 0n && g.bread.produced > 0n, 'produzione domestica non registrata'); assert(g.grain.used > 0n, 'il pane di casa non consuma grano');
  dropStock(LE, eco, 'borgo', 'grain'); pop.state.borgo.workers.farmer = 0;
  run(LE, eco, envOf(pop), 4);
  assert(LE.signals(eco, 'borgo').foodScarcity >= 600, 'senza grano non è carestia: ' + LE.signals(eco, 'borgo').foodScarcity);
});

check('33. Cambio di continente: i crediti si spostano con le riserve, senza insolvenze né riparazioni', () => {
  const { LE } = load(); quiet(LE);
  const places = world({ continents: 2, per: 3, wild: false }), pop = population(LE, places), eco = LE.create(5, places, 0);
  run(LE, eco, envOf(pop), 40);
  const raw = LE.serialize(eco), total = LE.audit(eco).money.accounts;
  for (const to of ['continente-1', 'continente-9']) {
    const list = places.map(p => (p.id === 'c0p0' ? { ...p, continent: to } : p)), e = LE.restore(raw, list, 40 * WEEK);
    const a = LE.audit(e); assert(a.ok, a.problems.join('; '));
    assert(!LE.events(e).some(x => x.kind === 'repair'), 'riparazione per un semplice cambio di continente');
    assert.equal(a.money.accounts, total + (a.money.mintedBy.nuovo_luogo || 0n) - (a.money.burnedBy.luogo_scomparso || 0n));
    run(LE, e, envOf(population(LE, list)), 2);
    assert(!LE.events(e).some(x => x.kind === 'insolvency' && x.week >= 40), 'insolvenza causata dal trasferimento verso ' + to);
  }
});

/* Residenti plausibili (quote per tipo di luogo vicine a world-population.js, ricchezza 800–2500 a testa), indipendenti dalle quote
   di `params.workforce`: servono a vedere se l'economia regge senza una popolazione fatta su misura. */
const SHARES = {
  village: { farmer: 300, herbalist: 80, miner: 40, carpenter: 60, shepherd: 110, mystic: 10, wellkeeper: 40, baker: 60, alchemist: 10, smith: 30, merchant: 30, innkeeper: 20, guard: 40, scholar: 10, healer: 20, laborer: 90 },
  town: { farmer: 150, herbalist: 60, miner: 50, carpenter: 80, shepherd: 50, mystic: 20, wellkeeper: 40, baker: 80, alchemist: 30, smith: 60, merchant: 90, innkeeper: 50, guard: 60, scholar: 30, healer: 40, laborer: 110 },
  city: { farmer: 60, herbalist: 50, miner: 30, carpenter: 90, shepherd: 20, mystic: 30, wellkeeper: 40, baker: 90, alchemist: 50, smith: 80, merchant: 140, innkeeper: 70, guard: 90, scholar: 60, healer: 50, laborer: 50 } };
function residents(LE, places, respond = false) {
  const tweak = {};
  for (const p of places) {
    const adults = Math.floor(p.population * 0.6), sh = SHARES[p.kind === 'capital' ? 'city' : p.kind] || SHARES.village, workers = {};
    for (const [j, v] of Object.entries(sh)) workers[j] = Math.round(adults * v * 0.94 / 1000);
    tweak[p.id] = { workers, wealth: p.population * ({ village: 800, town: 1500, city: 2500, capital: 4000 }[p.kind] || 800) };
  }
  const pop = population(LE, places, tweak);
  // Con `respond` i mestieri seguono lentamente labor (come farà la popolazione): al più un cambio ogni 100 lavoratori a settimana.
  pop.react = eco => {
    if (!respond) return;
    for (const p of places) {
      const x = pop.state[p.id], lab = LE.signals(eco, p.id).labor || {}, jobs = Object.keys(x.workers), of = j => lab[j] ?? 1000;
      const total = jobs.reduce((s, j) => s + x.workers[j], 0);
      for (let k = 0; k < Math.ceil(total / 100); k++) {
        let from = null, to = null;
        for (const j of jobs) { if (x.workers[j] > 0 && (from === null || of(j) < of(from))) from = j; if (to === null || of(j) > of(to)) to = j; }
        if (from && to && of(from) < 900 && of(to) > 1050) { x.workers[from]--; x.workers[to]++; }
      }
    }
  };
  return pop;
}
const DEMO = [['borgoa', 'c1', 'town', 260, ['cittaa']], ['cittaa', 'c1', 'city', 600, ['borgoa', 'borgob', 'cittab']], ['borgob', 'c1', 'village', 120, ['cittaa']],
  ['cittab', 'c2', 'city', 500, ['villac']], ['villac', 'c2', 'village', 110, []], ['borgoc', 'c2', 'town', 240, ['cittab']]].map(([id, continent, kind, population, links]) => ({ id, continent, kind, population, links }));

check('34. Circolazione sostenibile per 100 anni di calendario (686 settimane) con residenti plausibili: nessun prosciugamento, accumulo morto, carestia o crisi cronica', () => {
  const notes = [];
  for (const respond of [false, true]) for (const seed of [1, 2]) {
    const { LE } = load(), pop = residents(LE, DEMO, respond), eco = LE.create(seed, DEMO, 0), start = pop.total() + LE.audit(eco).money.accounts;
    const st = Object.fromEntries(DEMO.map(p => [p.id, { food: 0, run: 0, max: 0, cr: 0, crRun: 0, crMax: 0, pi: 0, n: 0, sat: 0 }]));
    let acc52 = 0;
    run(LE, eco, envOf(pop), 686, w => {
      pop.react(eco);
      if (w === 52) acc52 = Number(LE.audit(eco).money.accounts);
      if (w < 26) return;
      for (const p of DEMO) {
        const s = LE.signals(eco, p.id), x = st[p.id], f = s.foodScarcity >= 300;
        x.n++; x.pi += s.priceIndex; x.food += f; x.run = f ? x.run + 1 : 0; x.max = Math.max(x.max, x.run);
        x.cr += s.crisis; x.crRun = s.crisis ? x.crRun + 1 : 0; x.crMax = Math.max(x.crMax, x.crRun); x.sat += s.prosperity <= 10 || s.prosperity >= 2900;
      }
    });
    const a = LE.audit(eco); assert(a.ok, a.problems.join('; '));
    const M = Number(pop.total() + a.money.accounts) / Number(start);
    assert(M > 0.9 && M < 1.1, `seme ${seed}: moneta ${M.toFixed(3)} volte l’iniziale`);
    const acc = Number(a.money.accounts) / acc52; assert(acc > 0.4 && acc < 2.5, `conti dell’economia ${acc.toFixed(2)} volte la settimana 52`);
    for (const [id, x] of Object.entries(st)) {
      const tag = `risposta ${respond} seme ${seed} ${id}: `;
      assert(x.food <= x.n * 0.1 && x.max <= 20, tag + `scarsità ${x.food} settimane su ${x.n}, di fila ${x.max}`);
      assert(x.cr <= x.n * 0.2 && x.crMax <= 40, tag + `crisi ${x.cr} settimane su ${x.n}, di fila ${x.crMax}`);
      assert(x.pi / x.n >= 750 && x.pi / x.n <= 1350, tag + 'prezzi medi ' + Math.round(x.pi / x.n));
      assert(x.sat <= x.n * 0.05, tag + 'prosperità satura ' + x.sat);
    }
    notes.push(`moneta ×${M.toFixed(2)}`);
  }
  return notes.join(', ');
});

check('35. Le distruzioni di denaro sono riconiate e le emissioni di guerra ritirate: la moneta torna al suo livello', () => {
  const { LE } = load(); quiet(LE);
  const places = world({ continents: 1, per: 4, wild: false }), pop = population(LE, places), eco = LE.create(4, places, 0);
  const all = () => pop.total() + LE.audit(eco).money.accounts, start = all();
  run(LE, eco, envOf(pop, { war: (c, w) => w >= 5 && w < 20, disaster: (id, w) => (w >= 5 && w < 40 ? 'fire' : null) }), 45);
  const low = all(); assert(low < start, 'nessuna distruzione');
  run(LE, eco, envOf(pop), 150);
  const back = all(), a = LE.audit(eco); assert(a.ok);
  assert((start - back) * 10n < start - low, `perdite ${start - low}, dopo 150 settimane ancora ${start - back}`);
  assert((a.money.mintedBy.riconio || 0n) > 0n, 'riconio non registrato');
  // Emissione oltre il livello: si ritira dalle tesorerie in eccedenza.
  eco.treasuries['continente-0'] += 300000n; eco.ledger.mint.zecca = (eco.ledger.mint.zecca || 0n) + 300000n;
  const high = all(); run(LE, eco, envOf(pop), 150);
  assert((LE.audit(eco).money.burnedBy.ritiro || 0n) > 0n, 'nessun ritiro'); assert(all() < high - 150000n, `eccesso non riassorbito: ${high} → ${all()}`); assert(LE.audit(eco).ok);
});

check('36. Passo divisibile: stesso mondo a qualunque budget, conti in pari a ogni parte, salvataggio a metà rifiutato con un errore chiaro, settle completa', () => {
  const places = world(), end = 60 * WEEK;
  const go = budget => {
    const { LE, scope } = load(null, ['world-sim.js']); LE.params.events.warStart = 40; LE.params.events.calamity = 30;
    const W = scope.WorldSim, pop = population(LE, places), env = envOf(pop), s = { world: W.create(0), eco: LE.create(5, places, 0) };
    W.register('living-economy', LE.system(x => x.eco, () => env));
    let t = 0, frames = 0, mid = 0, refused = 0; const clock = () => (t += 1);
    if (budget === 'all') W.resolveAll(s, end);
    else while (W.lag(s, end) > 0 && frames++ < 1e5) {
      W.tick(s, end, { budgetMs: budget, clock });
      if (!W.partial(s)) continue;
      mid++;
      const a = LE.audit(s.eco); assert(a.ok, 'a metà settimana: ' + a.problems.slice(0, 2).join('; '));
      if (mid > 50) continue;
      try { LE.serialize(s.eco); } catch (e) { assert(/settimana a metà/i.test(e.message), e.message); refused++; }
      assert.doesNotThrow(() => { LE.stats(s.eco); LE.report(s.eco, 'c0p0'); LE.signals(s.eco, 'c0p0'); });
    }
    assert.equal(W.failures(s).length, 0, JSON.stringify(W.failures(s)));
    return { text: snapshot(LE, s.eco, pop), frames, mid, refused };
  };
  const a = go('all'), b = go(1), c = go(7);
  assert.equal(b.text, a.text, 'budget minimo diverso'); assert.equal(c.text, a.text, 'budget 7 diverso');
  assert(b.mid > 60 * 5, 'settimana non divisa: ' + b.mid + ' interruzioni'); assert(b.refused >= 49, 'salvataggio a metà accettato');
  const { LE, scope } = load(null, ['world-sim.js']), W = scope.WorldSim, pop = population(LE, places), env = envOf(pop), s = { world: W.create(0), eco: LE.create(5, places, 0) };
  W.register('living-economy', LE.system(x => x.eco, () => env));
  let t = 0; const clock = () => (t += 1);
  W.tick(s, 3 * WEEK, { budgetMs: 4, clock }); assert(W.partial(s), 'nessuna parte aperta'); W.settle(s);
  assert.equal(W.partial(s), null); assert.doesNotThrow(() => LE.serialize(s.eco)); assert.equal(s.eco.week, 1);
  W.tick(s, 3 * WEEK, { budgetMs: 4, clock }); LE.step(s.eco, 4, env); assert.equal(s.eco.week, 5);
  const ref = population(LE, places), e2 = LE.create(5, places, 0); run(LE, e2, envOf(ref), 5); assert.equal(snapshot(LE, s.eco, pop), snapshot(LE, e2, ref), 'step durante una settimana a metà: risultato diverso');
  return `${b.mid} interruzioni in 60 settimane, identico`;
});

check('37. Un guasto a metà settimana non fa pagare due volte: conti in pari, settimana chiusa, salvataggio possibile', () => {
  const { LE } = load(), places = world({ continents: 1, per: 4, wild: false }), pop = population(LE, places), eco = LE.create(5, places, 0);
  run(LE, eco, envOf(pop), 3);
  const a0 = LE.audit(eco).money, start = pop.total() + a0.accounts - a0.minted + a0.burned;
  const broken = eco.places.c0p3.i; let n = 0;
  const env = spy(pop, undefined, () => { if (++n === 2) for (const id of Object.keys(eco.places)) eco.places[id].i = null; });
  const prices = Object.fromEntries(Object.keys(eco.places).map(id => [id, eco.places[id].i]));
  assert.throws(() => LE.step(eco, 3, env), 'il guasto non si vede');
  for (const id of Object.keys(prices)) eco.places[id].i = prices[id];
  assert(broken && eco.week === 4, 'settimana rimasta aperta: si ripagherebbe da capo (' + eco.week + ')');
  const a = LE.audit(eco); assert(a.ok, a.problems.join('; ')); assert.equal(pop.total() + a.money.accounts, start + a.money.minted - a.money.burned, 'denaro creato o perso dal guasto');
  assert.doesNotThrow(() => LE.serialize(eco)); run(LE, eco, envOf(pop), 3); assert(LE.audit(eco).ok);
});

check('38. exchange: merci e denaro con l’esterno, tutto o niente, causa registrata, idempotente anche dopo un salvataggio', () => {
  const { LE } = load(); quiet(LE);
  assert.equal(typeof LE.exchange, 'function', 'exchange assente');
  const places = world({ continents: 1, per: 3, wild: false }), pop = population(LE, places), eco = LE.create(4, places, 0); run(LE, eco, envOf(pop), 5);
  const m0 = LE.audit(eco).money.accounts, stock = g => Number(LE.audit(eco).goods[g].stock), s0 = stock('ore');
  // Il giocatore vende 10 unità di minerale e il mercato gli paga 50 Scintille.
  const r = LE.exchange(eco, 'c0p0', 'ore', 10000, -50n, 'giocatore', 'g:1'); assert(r.ok && !r.duplicate, show(r));
  assert.equal(stock('ore'), s0 + 10000); assert.equal(LE.audit(eco).money.accounts, m0 - 50n); assert(LE.audit(eco).ok, LE.audit(eco).problems.join('; '));
  const again = LE.exchange(eco, 'c0p0', 'ore', 10000, -50n, 'giocatore', 'g:1'); assert(again.ok && again.duplicate); assert.equal(stock('ore'), s0 + 10000, 'applicata due volte');
  const e2 = LE.restore(LE.serialize(eco), places, 5 * WEEK), dup = LE.exchange(e2, 'c0p0', 'ore', 10000, -50n, 'giocatore', 'g:1'); assert(dup.ok && dup.duplicate, 'dopo il caricamento si applica di nuovo');
  assert.equal(LE.exchange(eco, 'c0p0', 'ore', 999, -50n, 'giocatore', 'g:1').ok, false, 'stesso id con contenuto diverso accettato');
  // Acquisto: merci fuori, denaro dentro a chi le deteneva.
  const g0 = stock('grain'), buy = LE.exchange(eco, 'c0p1', 'grain', -4000, 25n, 'giocatore', 'g:2'); assert(buy.ok, show(buy)); assert.equal(stock('grain'), g0 - 4000); assert.equal(LE.audit(eco).money.accounts, m0 - 25n); assert(LE.audit(eco).ok);
  const a = LE.audit(eco).money; assert.equal(a.externalIn.giocatore, 25n); assert.equal(a.externalOut.giocatore, 50n);
  // Rifiuti senza effetti.
  const before = LE.serialize(eco);
  for (const bad of [['nessuno', 'ore', 1, 0n, 'giocatore', 'g:3'], ['c0p0', 'spada', 1, 0n, 'giocatore', 'g:3'], ['c0p0', 'ore', 0.5, 0n, 'giocatore', 'g:3'], ['c0p0', 'ore', -1e12, 5n, 'giocatore', 'g:3'], ['c0p0', 'ore', 1000, -(10n ** 12n), 'giocatore', 'g:3'], ['c0p0', 'ore', 1, 0n, 'causa strana!', 'g:3'], ['c0p0', 'ore', 1, 0n, 'giocatore', ''], ['c0p0', 'ore', 0, 0n, 'giocatore', 'g:3'], ['__proto__', 'ore', 1, 0n, 'giocatore', 'g:3']]) {
    const x = LE.exchange(eco, ...bad); assert(x && x.ok === false && typeof x.reason === 'string', show(bad)); assert.equal(LE.serialize(eco), before, 'un rifiuto ha cambiato lo stato: ' + show(bad));
  }
  for (let k = 0; k < 600; k++) LE.exchange(eco, 'c0p0', 'ore', 1, 0n, 'giocatore', 'm:' + k);
  assert(JSON.parse(LE.serialize(eco)).tx.length <= LE.params.limits.tx, 'registro delle transazioni senza tetto');
  // Non durante una settimana a metà.
  const spec = LE.system(() => eco, () => envOf(pop)), from = eco.week * WEEK;
  assert.equal(spec.resolve(null, from, from + WEEK, { due: () => true }), false, 'la settimana non si è fermata');
  assert.equal(LE.exchange(eco, 'c0p0', 'ore', 1, 0n, 'giocatore', 'meta').ok, false, 'scambio accettato a metà settimana');
  let guard = 0; while (spec.resolve(null, from, from + WEEK, { due: () => true }) === false && guard++ < 1000);
  assert.equal(LE.exchange(eco, 'c0p0', 'ore', 1, 0n, 'giocatore', 'meta').ok, true);
  // Il riconio non insegue il denaro del giocatore.
  const minted = LE.audit(eco).money.mintedBy.riconio || 0n; run(LE, eco, envOf(pop), 20); assert.equal(LE.audit(eco).money.mintedBy.riconio || 0n, minted, 'il riconio insegue il denaro del giocatore'); assert(LE.audit(eco).ok);
});

/* ---------- comportamenti che le prove precedenti non vedevano (mutazioni sopravvissute alla revisione) ---------- */
check('39. Zecca di guerra: emette solo per i salari pubblici mancanti, registrata; guardie raddoppiate e pagate una volta e mezza', () => {
  const places = [{ id: 'x', continent: 'a', kind: 'city', population: 2000, links: [] }];
  const go = (war, rich) => {
    const { LE } = load(); quiet(LE); LE.params.tax.treasuryPerCapita = rich ? 25 : 0;
    const pop = population(LE, places, { x: { workers: { guard: 300 } } }), eco = LE.create(4, places, 0); let guards = 0n;
    const start = pop.total() + LE.audit(eco).money.accounts;
    LE.step(eco, 0, spy(pop, { war: () => war }, (id, f) => { guards = f.wages.guard || 0n; }));
    const a = LE.audit(eco); assert(a.ok, a.problems.join('; ')); assert.equal(pop.total() + a.money.accounts, start + a.money.minted - a.money.burned, 'denaro della zecca non registrato');
    return { minted: a.money.mintedBy.zecca || 0n, guards: Number(guards), cap: 2000n * BigInt(LE.params.events.mintCapPerCapita) };
  };
  const war = go(true, false), peace = go(false, false);
  assert(war.minted > 0n, 'nessuna emissione di guerra'); assert(war.minted <= war.cap, 'oltre il tetto'); assert.equal(peace.minted, 0n, 'zecca in tempo di pace');
  const full = go(true, true), calm = go(false, true); assert.equal(full.minted, 0n, 'zecca a tesoreria piena');
  const ratio = full.guards / calm.guards; assert(ratio > 2.8 && ratio < 3.2, 'salari delle guardie in guerra ×' + ratio.toFixed(2));
  return `emesse ${war.minted}; guardie ×${ratio.toFixed(2)}`;
});

check('40. Carovane: razzia e perdita totale registrano merci E borsa; capacità limitata dai mercanti', () => {
  let raided = 0, lostPurse = 0, shipped = 0, full = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const { LE } = load(); quiet(LE); LE.params.events.caravanLossOcean = 120; LE.params.events.caravanLoss = 120; LE.params.caravans.perMerchant = 3000;
    const w = caravanWorld(LE), eco = LE.create(seed, w.places, 0), start = w.pop.total() + LE.audit(eco).money.accounts, gi = typeIndex(LE, 'trade');
    run(LE, eco, envOf(w.pop), 60, () => {
      const a = LE.audit(eco); assert(a.ok, `seme ${seed} settimana ${eco.week}: ` + a.problems.slice(0, 2).join('; '));
      assert.equal(w.pop.total() + a.money.accounts, start + a.money.minted - a.money.burned, 'denaro perso con una carovana');
      for (const c of LE.caravans(eco)) {
        if (c.back || c.departed !== eco.week - 1) continue;
        const q = Object.values(c.cargo).reduce((x, y) => x + y, 0), cap = eco.places[c.from].b[gi].e * 3000;
        shipped++; assert(q <= cap, `carico ${q} oltre la capacità ${cap}`); if (q > cap * 0.95) full++;
      }
    });
    raided += LE.stats(eco).counts.caravanRaided || 0;
    lostPurse += LE.audit(eco).money.burnedBy.carovana ? 1 : 0;
  }
  assert(shipped > 20, 'partenze ' + shipped); assert(full > 0, 'mai a piena capacità: il limite non è provato'); assert(raided >= 3, 'razzie incontrate: ' + raided); assert(lostPurse >= 3, 'borse perse incontrate: ' + lostPurse);
  return `${shipped} partenze (${full} a piena capacità), ${raided} razzie, ${lostPurse} semi con borse perse`;
});

check('41. Calamità: produzione ridotta, epidemia che alza la domanda di pozioni, stagioni nella domanda', () => {
  const go = (kind, weeks = 8) => {
    const { LE } = load(); quiet(LE);
    const places = [{ id: 'x', continent: 'a', kind: 'town', population: 2000, links: [] }], pop = population(LE, places, { x: { workers: { farmer: 30, miner: 20, alchemist: 200, herbalist: 400 } } }), eco = LE.create(1, places, 0), rows = [];
    run(LE, eco, envOf(pop, kind ? { disaster: (id, w) => (w === 3 ? kind : null) } : undefined), weeks, w => rows.push({ w, made: LE.stats(eco).lastWeek.produced, want: Object.fromEntries(LE.report(eco, 'x').prices.map(p => [p.id, p.wanted])) }));
    return rows;
  };
  const base = go(null), dry = go('drought'), plague = go('plague'), quake = go('quake');
  assert.equal(dry[2].made.grain, base[2].made.grain, 'differenza prima della calamità');
  assert(dry[4].made.grain < base[4].made.grain * 0.7, `siccità: grano ${dry[4].made.grain} contro ${base[4].made.grain}`);
  assert(quake[4].made.ore < base[4].made.ore * 0.8, `terremoto: minerale ${quake[4].made.ore} contro ${base[4].made.ore}`);
  assert(plague[3].want.potion > base[3].want.potion * 1.6, `epidemia: pozioni ${plague[3].want.potion} contro ${base[3].want.potion}`);
  const wool = go(null, 28).map(r => r.want.wool).slice(7), top = Math.max(...wool), low = Math.min(...wool); assert(top > low * 1.5, `lana: domanda fra ${low} e ${top}`);
  return `siccità ${dry[4].made.grain}/${base[4].made.grain}, terremoto ${quake[4].made.ore}/${base[4].made.ore}, pozioni ${plague[3].want.potion}/${base[3].want.potion}, lana ${low}–${top}`;
});

check('42. Credito: riserva obbligatoria, stretta dopo un’insolvenza e limite alle aperture', () => {
  const make = () => {
    const { LE } = load(); quiet(LE);
    const places = [{ id: 'x', continent: 'a', kind: 'city', population: 2000, links: [] }, { id: 'y', continent: 'a', kind: 'city', population: 2000, links: [] }];
    const pop = population(LE, places), eco = LE.create(4, places, 0); run(LE, eco, envOf(pop), 6);
    // Le casse di x si svuotano: servono prestiti per i salari. Il luogo y ha solo depositi.
    let got = 0n; for (const b of eco.places.x.b) { got += b.cash; b.cash = 0n; eco.banks.a.dep -= b.dep; b.dep = 0n; b.loss = 0; b.pr = 100n; }
    giveMoney(eco, -got);
    return { LE, places, pop, eco, bank: eco.banks.a, setReserve(v) { giveMoney(eco, v - eco.banks.a.r); eco.banks.a.r = v; } };
  };
  const lent = (m, w) => { const v = m.eco.totals.loansIssued; run(m.LE, m.eco, envOf(m.pop), w); assert(m.LE.audit(m.eco).ok, m.LE.audit(m.eco).problems.join('; ')); return m.eco.totals.loansIssued - v; };
  const free = make(); const easy = lent(free, 1); assert(easy > 0n, 'senza vincoli nessun prestito: la prova non dimostra nulla');
  // Alla riserva esatta non si presta nulla; poco sopra, al massimo l'eccedenza.
  const tight = make(), t = tight.bank; tight.setReserve(t.dep * BigInt(tight.LE.params.bank.reserveRatio) / 1000n);
  assert.equal(lent(tight, 1), 0n, 'prestiti sotto la riserva obbligatoria');
  const some = make(), s = some.bank; some.setReserve(s.dep * BigInt(some.LE.params.bank.reserveRatio) / 1000n + 300n);
  const little = lent(some, 1); assert(little > 0n && little <= 300n, 'con 300 Scintille oltre la riserva ne presta ' + little);
  const crunch = make(); crunch.bank.cr = crunch.eco.week + 10; assert.equal(lent(crunch, 3), 0n, 'prestiti durante la stretta');
  // Aperture: con riserve abbondanti sì, alla riserva obbligatoria no, durante la stretta no.
  const open = mode => {
    const { LE } = load(); quiet(LE);
    const places = [{ id: 'x', continent: 'a', kind: 'city', population: 2000, links: [] }], pop = population(LE, places), eco = LE.create(4, places, 0); run(LE, eco, envOf(pop), 6);
    const b = eco.banks.a; pop.state.x.workers.baker *= 3; pop.state.x.workers.farmer *= 3; pop.state.x.alive = 4000; pop.state.x.wealth = 4000n * 60n;
    let n = 0;
    for (let k = 0; k < 8; k++) {
      const v = mode === 'rich' ? b.dep + 100000n : b.dep * BigInt(LE.params.bank.reserveRatio) / 1000n;
      if (mode !== 'crunch') { giveMoney(eco, v - b.r); b.r = v; } else { giveMoney(eco, b.dep + 100000n - b.r); b.r = b.dep + 100000n; b.cr = eco.week + 5; }
      const was = LE.stats(eco).counts.opening || 0; run(LE, eco, envOf(pop), 1); n += (LE.stats(eco).counts.opening || 0) - was;
    }
    return n;
  };
  const rich = open('rich'), poor = open('poor'), stopped = open('crunch');
  assert(rich > 0, 'nessuna apertura con riserve abbondanti'); assert.equal(poor, 0, 'aperture oltre la riserva obbligatoria: ' + poor); assert.equal(stopped, 0, 'aperture durante la stretta: ' + stopped);
  return `prestiti liberi ${easy}, con margine 300: ${little}; aperture ${rich}, alla riserva ${poor}, nella stretta ${stopped}`;
});

check('43. Crisi: comincia, finisce, e il conteggio delle chiusure recenti si salva', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'x', continent: 'a', kind: 'town', population: 1200, links: [] }], pop = population(LE, places), eco = LE.create(8, places, 0), farmers = pop.state.x.workers.farmer;
  run(LE, eco, envOf(pop), 10); assert.equal(LE.signals(eco, 'x').crisis, 0, 'crisi in tempi normali');
  pop.state.x.workers.farmer = 0; run(LE, eco, envOf(pop), 12); assert.equal(LE.signals(eco, 'x').crisis, 1, 'carestia senza crisi');
  pop.state.x.workers.farmer = farmers * 2; run(LE, eco, envOf(pop), 60); assert.equal(LE.signals(eco, 'x').crisis, 0, 'la crisi non finisce'); assert(LE.events(eco).some(e => e.kind === 'recovery'), 'fine della crisi non registrata');
  eco.places.x.cl = 9000; const e2 = LE.restore(LE.serialize(eco), places, eco.week * WEEK); assert.equal(e2.places.x.cl, 9000, 'chiusure recenti non salvate');
});

check('44. Sforzo dei produttori: con i magazzini pieni si produce molto meno', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'x', continent: 'a', kind: 'town', population: 1500, links: [] }], pop = population(LE, places), eco = LE.create(3, places, 0);
  run(LE, eco, envOf(pop), 4); const made = LE.stats(eco).lastWeek.produced.ore;
  giveStock(LE, eco, 'x', 'mine', 'ore', 5e7);
  run(LE, eco, envOf(pop), 1); const now = LE.stats(eco).lastWeek.produced.ore;
  assert(made > 0 && now < made / 20, `si produce a magazzini pieni: ${made} → ${now}`);
  assert(LE.audit(eco).ok); return `minerale ${made} → ${now}`;
});

check('45. Cento anni di calendario in un colpo solo: nessuna pausa, stesso mondo di chi li vive settimana per settimana, popolazione compresa', () => {
  const go = live => {
    const { LE, scope } = load(null, ['world-sim.js']), W = scope.WorldSim, pop = residents(LE, DEMO, true), env = envOf(pop), s = { world: W.create(0), eco: LE.create(5, DEMO, 0), n: 0 };
    W.register('living-economy', LE.system(x => x.eco, () => env));
    W.register('gente', { level: 3, step: WEEK, maxChunks: LE.system(() => null).maxChunks, resolve: (st, from, to) => { assert.equal(to - from, WEEK, 'settimane compresse'); pop.react(st.eco); st.n++; } });
    if (live) for (let w = 1; w <= 686; w++) W.tick(s, w * WEEK, { budgetMs: Infinity }); else W.resolveAll(s, 686 * WEEK);
    assert.equal(W.failures(s).length, 0, JSON.stringify(W.failures(s)));
    assert.equal(s.eco.week, 686); assert.equal(LE.stats(s.eco).totals.pausedWeeks, 0); assert.equal(s.n, 686);
    return snapshot(LE, s.eco, pop);
  };
  assert.equal(go(false), go(true), 'saltare il tempo cambia il mondo');
});

check('47. Stati rari salvati (stretta e crisi bancaria, disoccupazione abituale), vecchie cause lette senza riparazioni, deperimento, salari che seguono il lavoro, utile medio che si spegne', () => {
  const { LE } = load(); quiet(LE);
  const places = [{ id: 'x', continent: 'a', kind: 'town', population: 1200, links: [] }, { id: 'y', continent: 'a', kind: 'town', population: 1200, links: [] }], pop = population(LE, places), eco = LE.create(8, places, 0);
  run(LE, eco, envOf(pop), 10);
  eco.banks.a.cr = 14; eco.banks.a.cs = 13; eco.places.x.ur = 137;
  const back = LE.restore(LE.serialize(eco), places, 10 * WEEK);
  assert.equal(back.banks.a.cr, 14, 'stretta del credito non salvata'); assert.equal(back.banks.a.cs, 13, 'crisi bancaria non salvata'); assert.equal(back.places.x.ur, 137, 'disoccupazione abituale non salvata');
  run(LE, back, envOf(pop), 1); assert.equal(LE.signals(back, 'x').crisis, 1, 'la crisi bancaria non si vede dopo il ripristino');
  const added = places.concat([{ id: 'nuova', continent: 'a', kind: 'town', population: 500, links: [] }]), old = JSON.parse(LE.serialize(LE.restore(LE.serialize(eco), added, 10 * WEEK)));
  const was = old.ledger.mint.nuovo_luogo; delete old.ledger.mint.nuovo_luogo; old.ledger.mint['nuovo luogo'] = was; old.ledger.added['nuovo luogo'] = old.ledger.added.nuovo_luogo; delete old.ledger.added.nuovo_luogo;
  const e = LE.restore(old, added, 10 * WEEK); assert.equal(String(LE.audit(e).money.mintedBy.nuovo_luogo), was, 'emissione con la vecchia causa perduta'); assert(!LE.events(e).some(v => v.kind === 'repair'), 'vecchia causa trattata come un danno');
  // Deperimento: registrato e presente.
  const { LE: L2 } = load(); quiet(L2); const p2 = population(L2, places), e2 = L2.create(8, places, 0); run(L2, e2, envOf(p2), 5);
  const g = L2.audit(e2).goods; assert(g.bread.spoiled > 0n && g.grain.spoiled > 0n, 'nessun deperimento'); assert.equal(g.ore.spoiled, 0n);
  // Salari: salgono dove il lavoro manca, scendono dove abbonda.
  const jobs = Object.keys(L2.params.workforce); for (const j of jobs) { p2.state.x.workers[j] = Math.ceil(p2.state.x.workers[j] / 3); p2.state.y.workers[j] *= 3; }
  run(L2, e2, envOf(p2), 12); assert(L2.signals(e2, 'x').wageIndex > L2.signals(e2, 'y').wageIndex + 100, `salari ${L2.signals(e2, 'x').wageIndex} dove manca lavoro, ${L2.signals(e2, 'y').wageIndex} dove abbonda`);
  // Utile medio: a incassi nulli si spegne a zero da entrambi i lati, senza resti fermi.
  const bz = e2.places.x.b[typeIndex(L2, 'sanctum')]; p2.state.x.workers.mystic = 0; bz.n = 0;
  for (const v of [7n, -7n]) { for (const t of ['essence']) dropStock(L2, e2, 'x', t); bz.pr = v; run(L2, e2, envOf(p2), 12); assert.equal(bz.pr, 0n, 'utile medio fermo a ' + bz.pr); }
});

check('46. Perequazione dentro il regno: il tributo dei luoghi più ricchi sostiene i più poveri, conti esatti, nessun effetto fra regni diversi', () => {
  const go = (rate, realms) => {
    const { LE } = load(); quiet(LE); if (rate !== null) LE.params.tax.levy = rate;
    const places = ['ricco', 'povero'].map(id => ({ id, continent: 'c', realm: realms ? id : 'uno', kind: 'town', population: 1000, links: [] }));
    const pop = population(LE, places, { ricco: { wealth: 1000 * 4000 }, povero: { wealth: 1000 * 200 } }), eco = LE.create(3, places, 0), start = pop.total() + LE.audit(eco).money.accounts;
    run(LE, eco, envOf(pop), 300, () => { const a = LE.audit(eco); assert(a.ok, a.problems.join('; ')); });
    const a = LE.audit(eco).money; assert.equal(pop.total() + a.accounts, start + a.minted - a.burned, 'denaro creato o perso');
    return Number(pop.state.ricco.wealth - pop.state.povero.wealth) / 1000;
  };
  const off = go(0, false), on = go(null, false), apart = go(null, true), apartOff = go(0, true);
  assert(on < off * 0.75, `divario dopo 300 settimane: ${Math.round(on)} con la perequazione, ${Math.round(off)} senza`);
  assert(on > 0, 'i ricchi diventano poveri'); assert.equal(apart, apartOff, 'tributo fra regni diversi');
  return `divario a testa ${Math.round(off)} → ${Math.round(on)}`;
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
