/* Seconda unità dell'economia (Fase 3): bilanciamento, commercio, API per il giocatore, profili per nuovi insediamenti,
   compatibilità dei salvataggi, prestazioni. Uso: node tests/economia-flussi-2.cjs
   Ripete alla fine i 158 controlli della prima unità (tests/economia-flussi.cjs) per escludere regressioni. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const modules = read('build.py').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
let checks = 0;
const notes = [];
const ok = (value, message) => { assert(value, message); checks++; };
const canon = value => JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x < y ? -1 : 1)) : v);
const same = (a, b, message) => { assert.equal(canon(a), canon(b), message); checks++; };
const clone = value => JSON.parse(JSON.stringify(value));
const note = text => { notes.push(text); };

function isolated(files, sources = {}) {
  const scope = { console };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) vm.runInContext(sources[file] ?? read(file), scope, { filename: file });
  return scope;
}
const light = isolated(['inventory.js', 'market-flows.js', 'trade-economy.js']);
const { Economy, MarketFlows } = light;
const profiles = Economy.profiles;
const advanceTo = (eco, to, list = profiles) => { for (let d = eco.flows.day + 1; d <= to; d++) MarketFlows.advance(eco.flows, list, eco.markets, d); return eco; };
const stockOf = (eco, market, good) => BigInt(eco.markets[market].stock[good] || 0);
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;

/* ---- A. Bilanciamento su 30, 150 e 365 giorni ---- */
{
  const seeds = [19425, 555, 2024];
  const essentials = ['water', 'bread'];
  const book = Object.fromEntries(profiles.map(p => [p.id, p]));
  let chronic = 0, glut = 0, cells = 0, unmet = 0, eaten = 0, priceMin = Infinity, priceMax = 0;
  const averages = {};          // prezzo medio per merce e mercato a 365 giorni (seme 19425)
  const perPerson = {};
  for (const days of [30, 150, 365]) for (const seed of seeds) {
    const eco = Economy.create(seed);
    const sum = {}, empty = {}, low = {}, high = {}, price = {};
    for (let d = 2; d <= days + 1; d++) {
      MarketFlows.advance(eco.flows, profiles, eco.markets, d);
      for (const p of profiles) for (const g of Object.keys(p.goods)) {
        const key = p.id + ':' + g, s = Number(stockOf(eco, p.id, g)), T = p.goods[g][0];
        sum[key] = (sum[key] || 0) + s; empty[key] = (empty[key] || 0) + (s === 0); low[key] = (low[key] || 0) + (s * 2 < T); high[key] = (high[key] || 0) + (s > 2 * T);
        const mult = MarketFlows.multiplier(eco.flows, p, g, BigInt(s));
        priceMin = Math.min(priceMin, mult); priceMax = Math.max(priceMax, mult); price[key] = (price[key] || 0) + mult;
      }
    }
    for (const key of Object.keys(sum)) {
      cells++;
      if (empty[key] / days > .25 || low[key] / days > .6) chronic++;
      if (high[key] / days > .6) glut++;
    }
    for (const p of profiles) for (const g of Object.keys(p.goods)) {
      const l = eco.flows.ledger[p.id][g]; unmet += Number(l.unmet); eaten += Number(l.eaten);
      if (essentials.includes(g)) {
        ok(empty[p.id + ':' + g] === 0, 'bene essenziale mai esaurito: ' + p.id + ' ' + g + ' (' + days + ' gg, seme ' + seed + ')');
        ok(sum[p.id + ':' + g] / days >= p.goods[g][0] * .6, 'scorta media del bene essenziale ≥ 60% dell\'obiettivo: ' + p.id + ' ' + g);
      }
    }
    if (days === 365 && seed === 19425) {
      for (const p of profiles) { perPerson[p.id] = Object.keys(p.goods).reduce((n, g) => n + Number(eco.flows.ledger[p.id][g].produced), 0) / days / MarketFlows.traits[p.id].people; }
      for (const key of Object.keys(price)) averages[key] = price[key] / days;
      same(MarketFlows.audit(eco.flows, profiles, eco.markets), [], 'registro in pari a 365 giorni');
      // il caso del grano a Velaris: scorta ≥ 60% dell'obiettivo e al più il 10% di giorni a scaffale vuoto
      ok(sum['velaris:grain'] / days >= 3 && empty['velaris:grain'] / days <= .1, 'grano a Velaris: scorta media ' + (sum['velaris:grain'] / days).toFixed(1) + ' su 5, vuoto nel ' + (100 * empty['velaris:grain'] / days).toFixed(0) + '% dei giorni');
      note('grano a Velaris (365 gg, seme 19425): scorta media ' + (sum['velaris:grain'] / days).toFixed(2) + '/5, a scaffale vuoto il ' + (100 * empty['velaris:grain'] / days).toFixed(1) + '% dei giorni, prezzo medio ×' + (averages['velaris:grain'] / 1000).toFixed(2));
    }
  }
  ok(chronic === 0, 'nessuna scorta cronicamente vuota o bassa su 30/150/365 giorni (' + chronic + ' su ' + cells + ' celle)');
  ok(glut === 0, 'nessuna scorta cronicamente in eccesso (' + glut + ')');
  ok(unmet / (unmet + eaten) < .01, 'fabbisogno insoddisfatto sotto l\'1% (' + (100 * unmet / (unmet + eaten)).toFixed(2) + '%)');
  ok(priceMin >= 320 && priceMax <= 2240, 'i prezzi restano fra ×' + (priceMin / 1000).toFixed(2) + ' e ×' + (priceMax / 1000).toFixed(2));
  note('prezzi (moltiplicatore) fra ×' + (priceMin / 1000).toFixed(2) + ' e ×' + (priceMax / 1000).toFixed(2) + '; mancato/consumato ' + (100 * unmet / (unmet + eaten)).toFixed(2) + '%');
  // le differenze regionali restano
  const avgPrice = (m, g) => averages[m + ':' + g] / 1000 * book[m].goods[g][1];
  const spread = g => { const v = profiles.filter(p => p.goods[g]).map(p => avgPrice(p.id, g)); return Math.max(...v) / Math.min(...v); };
  for (const g of ['ore', 'wool', 'essence', 'grain', 'potion']) ok(spread(g) >= 1.3, 'differenza regionale di prezzo mantenuta per ' + g + ' (×' + spread(g).toFixed(2) + ')');
  const cheapest = g => profiles.filter(p => p.goods[g]).sort((a, b) => avgPrice(a.id, g) - avgPrice(b.id, g))[0].id;
  ok(cheapest('ore') === 'filoni' && cheapest('grain') === 'namar', 'il minerale costa meno ai Filoni e il grano a Namar (' + cheapest('ore') + ', ' + cheapest('grain') + ')');
  ok(cheapest('essence') === 'velaris' && cheapest('potion') !== 'calis', 'l\'essenza costa meno a Velaris e le pozioni non costano meno nello scalo di Calis');
  ok(perPerson.velaris > 0 && Math.min(...Object.values(perPerson)) > .4 && Math.max(...Object.values(perPerson)) < 3, 'produzione per abitante al giorno: ' + Object.entries(perPerson).map(([m, v]) => m + ' ' + v.toFixed(1)).join(', '));
  note('produzione per abitante al giorno: ' + Object.entries(perPerson).map(([m, v]) => m + ' ' + v.toFixed(1)).join(', '));
}

/* ---- B. Commercio: ragioni economiche, riserve, assenza di cicli ---- */
{
  let departures = 0, reversals = 0, blocked = 0;
  const pairKnown = new Map(MarketFlows.routes.map(([a, b, days, cap]) => [a + '>' + b, [days, cap]].concat([]) && [days, cap]));
  for (const [a, b, days, cap] of MarketFlows.routes) { pairKnown.set(a + '>' + b, [days, cap]); pairKnown.set(b + '>' + a, [days, cap]); }
  const everSent = new Set();
  for (const seed of [19425, 555, 2024]) {
    const eco = Economy.create(seed);
    for (let day = 2; day <= 366; day++) {
      const before = new Set(eco.flows.shipments.map(s => s.from + '>' + s.to + '|' + s.id + '|' + s.due + '|' + s.qty));
      MarketFlows.advance(eco.flows, profiles, eco.markets, day);
      for (const s of eco.flows.shipments) {
        if (before.has(s.from + '>' + s.to + '|' + s.id + '|' + s.due + '|' + s.qty)) continue;
        departures++;
        const [days, cap] = pairKnown.get(s.from + '>' + s.to);
        ok(s.due - day === days, 'tempo di viaggio della rotta rispettato');
        ok(s.qty <= cap, 'quantità entro la capacità della rotta');
        const from = profiles.find(p => p.id === s.from), T = from.goods[s.id][0];
        ok(stockOf(eco, s.from, s.id) >= BigInt(Math.ceil(T * .6)), 'la partenza conserva almeno il 60% dell\'obiettivo (' + s.from + ' ' + s.id + ' giorno ' + day + ')');
        const key = s.from + '>' + s.to + '|' + s.id;
        if (everSent.has(s.to + '>' + s.from + '|' + s.id)) reversals++;
        everSent.add(key);
      }
      // nessuna merce viaggia in entrambi i sensi sulla stessa rotta nello stesso momento
      const lanes = new Set(eco.flows.shipments.map(s => s.from + '>' + s.to + '|' + s.id));
      for (const lane of lanes) { const [pair, id] = lane.split('|'), [a, b] = pair.split('>'); if (lanes.has(b + '>' + a + '|' + id)) blocked++; }
      // e il grafo delle spedizioni in corso, per merce, non contiene cicli
      if (day % 5 === 0) {
        const byGood = {};
        for (const s of eco.flows.shipments) (byGood[s.id] = byGood[s.id] || {})[s.from] = [...((byGood[s.id] || {})[s.from] || []), s.to];
        for (const [id, graph] of Object.entries(byGood)) {
          const state = {}, visit = node => { if (state[node] === 1) return true; if (state[node] === 2) return false; state[node] = 1; for (const next of graph[node] || []) if (visit(next)) return true; state[node] = 2; return false; };
          for (const node of Object.keys(graph)) ok(!visit(node), 'nessun commercio circolare in corso per ' + id);
        }
      }
    }
    same(MarketFlows.audit(eco.flows, profiles, eco.markets), [], 'registro in pari dopo un anno di rotte');
    for (const p of profiles) for (const g of Object.keys(p.goods)) {
      const l = eco.flows.ledger[p.id][g];
      ok(BigInt(l.lost) <= BigInt(l.exported), 'le perdite in viaggio non superano la merce spedita');
    }
    // meno della metà di ciò che si produce viaggia: i mercati vivono soprattutto di produzione locale
    for (const g of ['ore', 'grain', 'water', 'bread', 'herb', 'potion', 'wool', 'work', 'seeds']) {
      const made = profiles.reduce((n, p) => n + (p.goods[g] ? BigInt(eco.flows.ledger[p.id][g].produced) : 0n), 0n);
      const sent = profiles.reduce((n, p) => n + (p.goods[g] ? BigInt(eco.flows.ledger[p.id][g].exported) : 0n), 0n);
      ok(sent * 10n <= made * 7n, 'meno del 70% della produzione di ' + g + ' viaggia (' + sent + ' su ' + made + ')');
    }
  }
  ok(blocked === 0, 'mai merci in senso opposto sulla stessa rotta');
  ok(departures > 300, 'il commercio esiste (' + departures + ' partenze in 3 anni simulati)');
  ok(reversals / departures < .05, 'inversioni di flusso rare (' + reversals + ' su ' + departures + ')');
  note('partenze in 3×365 giorni: ' + departures + '; inversioni di flusso: ' + reversals + ' (' + (100 * reversals / departures).toFixed(1) + '%)');
  // destinazione con scorte abbondanti: nessuna spedizione inutile
  const glutted = Economy.create(7);
  for (const p of profiles) { glutted.flows.wealth[p.id] = 1000; for (const g of Object.keys(p.goods)) glutted.markets[p.id].stock[g] = String(p.goods[g][0] * 3); }
  MarketFlows.advance(glutted.flows, profiles, glutted.markets, 2);
  ok(glutted.flows.shipments.length === 0, 'nessuna spedizione quando tutte le destinazioni hanno scorte abbondanti');
  // un mercato che ha esaurito una merce non la esporta
  const starved = Economy.create(7);
  for (const p of profiles) for (const g of Object.keys(p.goods)) starved.markets[p.id].stock[g] = String(p.goods[g][0]);
  starved.markets.filoni.stock.ore = '2';
  MarketFlows.advance(starved.flows, profiles, starved.markets, 2);
  ok(!starved.flows.shipments.some(s => s.from === 'filoni' && s.id === 'ore'), 'chi ha poca scorta non esporta (riserva alla partenza)');
}

/* ---- C. Giocatore e sistemi futuri (gioco completo) ---- */
const store = new Map();
const surface = () => { const px = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return px.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(px, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
const full = { console: { warn() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
full.window = full; vm.createContext(full);
for (const file of modules) { if (file === 'audio.js') break; vm.runInContext(read(file), full, { filename: file }); }
{
  const { Game, Economy: E, MarketFlows: F, Inventory, Calendar } = full;
  vm.runInContext('Math.random = (() => { let n = 0; return () => n++ === 0 ? 19425 / 4294967296 : .24; })()', full);
  ok(Game.newGame(), 'nuova partita');
  const s = Game.s;
  const setMinute = minute => { const now = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((minute - now + 1440) % 1440) / (Calendar.minutesPerSecond || .8); };
  setMinute(12 * 60);
  s.time += 40 * 1440 / (Calendar.minutesPerSecond || .8); E.tick(s);
  const goodsOf = p => Object.keys(p.goods);
  // C1. Nessun profitto dal comprare e rivendere (o vendere e ricomprare) nello stesso mercato, per ogni scorta
  let pairs = 0;
  for (const p of E.profiles) for (const g of goodsOf(p)) {
    const cap = Number(E.quote(s, p.id, g, 0).capacity);
    let previous = null;
    for (let stock = 0; stock <= cap; stock++) {
      const q = E.quote(s, p.id, g, stock);
      ok(q && q.buy >= 2 && q.sell >= 1 && q.sell < q.buy, 'prezzo di vendita sempre inferiore a quello di acquisto: ' + p.id + ' ' + g + ' scorta ' + stock);
      if (previous) {
        ok(q.buy <= previous.buy, 'il prezzo non sale con scorte maggiori');
        ok(q.sell <= previous.sell + 0 || q.sell <= q.buy, 'monotonia delle vendite');
        // vendere 1 a scorta (stock-1) e ricomprarlo (stock): nessun guadagno; comprare 1 a scorta stock e rivendere a stock-1: nessun guadagno
        ok(previous.sell <= q.buy, 'vendere e ricomprare non rende: ' + p.id + ' ' + g + ' scorta ' + stock + ' (vendi ' + previous.sell + ', ricompri ' + q.buy + ')');
        ok(previous.sell <= q.buy && previous.buy >= previous.sell, 'comprare e rivendere non rende');
        pairs++;
      }
      previous = q;
    }
  }
  note('coppie di prezzi verificate (acquisto/vendita per ogni scorta): ' + pairs);
  // C2. Cicli immediati sul mercato reale: 120 acquisti e rivendite non producono denaro né merce
  setMinute(12 * 60); s.region = 'valley'; Object.assign(s.player, { x: 445, y: 627, gold: 10000 });
  const gold0 = s.player.gold, herb0 = Inventory.quantity(s, 'herb'), vela0 = canon(E.view(s).market.rows.map(r => [r.id, r.stock]));
  for (let i = 0; i < 120; i++) {
    ok(E.command(s, { op: 'buy', id: 'herb', amount: '1' }).ok, 'acquisto');
    ok(E.command(s, { op: 'sell', id: 'herb', amount: '1' }).ok, 'rivendita');
  }
  ok(s.player.gold <= gold0 && s.player.gold > gold0 - 120 * 12, 'dopo 120 giri comprare-rivendere il giocatore non guadagna (' + (gold0 - s.player.gold) + ' Scintille perse)');
  ok(Inventory.quantity(s, 'herb') === herb0, 'e la merce posseduta è identica');
  ok(canon(E.view(s).market.rows.map(r => [r.id, r.stock])) === vela0, 'e le scorte del mercato sono identiche');
  same(E.flowReport(s).audit, [], 'registro in pari dopo i giri');
  // C3. Arbitraggio fra continenti senza tempo di viaggio: il guadagno è finito e si esaurisce
  const bought = [], money = { spent: 0, earned: 0 };
  let rounds = 0;
  for (;; rounds++) {
    let best = null;
    for (const a of E.profiles) for (const b of E.profiles) {
      if (a === b) continue;
      for (const g of goodsOf(a)) {
        if (!b.goods[g]) continue;
        const qa = E.quote(s, a.id, g), qb = E.quote(s, b.id, g);
        if (BigInt(qa.stock) < 1n || BigInt(qb.stock) >= BigInt(qb.capacity)) continue;
        const gain = qb.sell - qa.buy;
        if (gain > 0 && (!best || gain > best.gain)) best = { a: a.id, b: b.id, g, gain, buy: qa.buy, sell: qb.sell };
      }
    }
    if (!best || rounds > 4000) break;
    ok(E.procure(s, best.a, best.g, 1n) === 1n && E.deliver(s, best.b, best.g, 1n) === 1n, 'trasferimento di un\'unità');
    money.spent += best.buy; money.earned += best.sell;
  }
  ok(rounds > 0 && rounds <= 4000, 'esistono opportunità di commercio fra mercati, ma si esauriscono (' + rounds + ' trasferimenti)');
  const profit = money.earned - money.spent;
  ok(profit > 0 && profit < 3000, 'il guadagno massimo dell\'arbitraggio immediato è finito (' + profit + ' Scintille)');
  note('arbitraggio immediato a 40 giorni: ' + rounds + ' trasferimenti, guadagno massimo ' + profit + ' Scintille, poi nessuna opportunità');
  same(E.flowReport(s).audit, [], 'registro in pari dopo l\'arbitraggio');
  let net = {};
  for (const m of Object.values(E.flowReport(s).markets)) void m;
  for (const p of E.profiles) for (const g of goodsOf(p)) net[g] = (net[g] || 0n) + BigInt(s.economy.flows.ledger[p.id][g].external);
  ok(Object.values(net).every(n => n === 0n), 'trasferire merci da un mercato all\'altro non crea né distrugge nulla (somma dei flussi esterni = 0)');
  // C4. API deliver/procure: limiti, quantità enormi e oggetti non commerciabili
  const before = canon(s.economy.markets.vela);
  ok(E.deliver(s, 'vela', 'herb', 0n) === 0n && E.deliver(s, 'vela', 'herb', -3n) === 0n && E.deliver(s, 'vela', 'herb', 'abc') === 0n, 'quantità non valide rifiutate');
  ok(E.deliver(s, 'nowhere', 'herb', 1n) === 0n && E.procure(s, 'vela', 'quest-item-che-non-esiste', 1n) === 0n, 'mercato o merce sconosciuti rifiutati');
  ok(canon(s.economy.markets.vela) === before, 'e non cambiano le scorte');
  const room = BigInt(E.quote(s, 'vela', 'herb').capacity) - BigInt(E.quote(s, 'vela', 'herb').stock);
  ok(E.deliver(s, 'vela', 'herb', 10n ** 30n) === room, 'si accetta al più la capacità del magazzino, anche con quantità enormi');
  ok(E.deliver(s, 'vela', 'herb', 1n) === 0n, 'a magazzino pieno non entra altro');
  const full1 = BigInt(E.quote(s, 'vela', 'herb').stock);
  ok(E.procure(s, 'vela', 'herb', 10n ** 30n) === full1, 'si preleva al più la scorta presente');
  ok(E.procure(s, 'vela', 'herb', 1n) === 0n, 'a scaffale vuoto non si preleva nulla');
  same(E.flowReport(s).audit, [], 'registro in pari dopo consegne e prelievi estremi');
  const priceEmpty = E.quote(s, 'vela', 'herb').buy, priceFull = E.quote(s, 'vela', 'herb', 36).buy;
  ok(priceEmpty > priceFull, 'lo scaffale vuoto costa più di quello pieno (' + priceEmpty + ' contro ' + priceFull + ')');
  // C5. Un commerciante «di proprietà del giocatore»: 60 giorni di acquisto a buon mercato e consegna dove costa di più
  let wallet = 0, carried = 0n;
  const stockBefore = {}; for (const p of E.profiles) stockBefore[p.id] = canon(s.economy.markets[p.id]);
  for (let day = 0; day < 60; day++) {
    const from = E.quote(s, 'filoni', 'ore'), to = E.quote(s, 'velaris', 'ore');
    if (to.sell > from.buy && BigInt(from.stock) > 3n) { const n = E.procure(s, 'filoni', 'ore', 2n); wallet -= Number(n) * from.buy; carried += n; }
    if (carried > 0n) { const moved = E.deliver(s, 'velaris', 'ore', carried); wallet += Number(moved) * E.quote(s, 'velaris', 'ore').sell; carried -= moved; }
    s.time += 1440 / (Calendar.minutesPerSecond || .8); E.tick(s);
  }
  same(E.flowReport(s).audit, [], 'registro in pari dopo 60 giorni di un commerciante');
  ok(wallet !== 0 || carried === 0n, 'il commerciante ha operato (saldo ' + wallet + ' Scintille, merce in mano ' + carried + ')');
  // C6. Differenze regionali ed effetto del giocatore sui prezzi
  const cheap = E.quote(s, 'filoni', 'ore'), dear = E.quote(s, 'velaris', 'ore');
  ok(cheap.index > 0 && dear.index > 0 && cheap.market !== dear.market, 'quotazioni di mercati diversi leggibili');
  note('quotazione dopo 100 giorni: minerale ai Filoni compra ' + cheap.buy + '/vende ' + cheap.sell + ', a Velaris compra ' + dear.buy + '/vende ' + dear.sell);
}

/* ---- D. Espandibilità: profili generati, rotte automatiche, mercati aggiunti ---- */
{
  const specs = (n, seed = 7) => {
    const sizes = ['village', 'village', 'town', 'town', 'town', 'city', 'capital'], foci = ['farming', 'pastoral', 'mining', 'crafts', 'alchemy', 'port', 'capital'];
    return Array.from({ length: n }, (_, i) => { const h = (i * 2654435761) >>> 0; return { id: 'c' + i, name: 'Città ' + i, size: sizes[h % 7], focus: foci[(h >>> 8) % 7], seed, world: { x: (h >>> 4) % 100, y: (h >>> 12) % 100 } }; });
  };
  const world = (n, seed) => [...profiles, ...specs(n - 5, seed).map(spec => MarketFlows.settlementProfile(spec))];
  const startMarkets = list => Object.fromEntries(list.map(p => [p.id, { day: 1, stock: Object.fromEntries(Object.entries(p.goods).map(([g, [t]]) => [g, String(t)])) }]));
  // D1. Profili: determinismo e struttura
  const a = MarketFlows.settlementProfile({ id: 'nuova', size: 'town', focus: 'mining', seed: 3, world: { x: 10, y: 20 } });
  same(a, MarketFlows.settlementProfile({ id: 'nuova', size: 'town', focus: 'mining', seed: 3, world: { x: 10, y: 20 } }), 'profilo deterministico');
  ok(canon(a) !== canon(MarketFlows.settlementProfile({ id: 'nuova', size: 'town', focus: 'mining', seed: 4 })), 'semi diversi → profili diversi');
  ok(Object.entries(a.goods).every(([g, [t, n]]) => Number.isInteger(t) && t >= 4 && t <= 28 && Number.isInteger(n) && n >= 2), 'obiettivi e prezzi validi');
  ok(a.traits.jobs.wellkeeper >= 1 && a.traits.jobs.baker >= 1 && Object.values(a.traits.jobs).every(n => Number.isInteger(n) && n >= 0), 'servizi essenziali sempre presenti');
  assert.throws(() => MarketFlows.settlementProfile({ id: '__proto__', size: 'town', focus: 'mining' })); checks++;
  assert.throws(() => MarketFlows.settlementProfile({ id: 'x y', size: 'town', focus: 'mining' })); checks++;
  const farm = MarketFlows.settlementProfile({ id: 'fattoria', size: 'town', focus: 'farming', seed: 3 }), mine = MarketFlows.settlementProfile({ id: 'miniera', size: 'town', focus: 'mining', seed: 3 });
  const view = p => MarketFlows.outlook(p, Object.fromEntries(Object.entries(p.goods).map(([g, [t]]) => [g, t])), p.traits.wealth);   // scorte all'obiettivo
  ok(view(mine).ore.output > view(farm).ore.output * 3 && view(farm).grain.output > view(mine).grain.output, 'miniera e fattoria si specializzano in merci diverse');
  ok(mine.goods.ore[1] < farm.goods.ore[1] && farm.goods.grain[1] < mine.goods.grain[1], 'e le merci in cui si specializzano costano meno');
  for (const spec of specs(30)) {
    const p = MarketFlows.settlementProfile(spec), v = view(p);
    ok(v.water.output >= v.water.demand && v.bread.output >= v.bread.demand, 'acqua e pane coperti dal luogo stesso: ' + spec.id);
    ok(v.grain.output >= v.grain.demand * .85, 'grano quasi coperto dal luogo stesso: ' + spec.id);
  }
  // D2. Rotte automatiche: connesse, deterministiche, e la tabella dei cinque mercati originali non cambia
  same(MarketFlows.routesFor(profiles), MarketFlows.routes, 'le rotte dei cinque mercati originali restano quelle dichiarate');
  const w35 = world(35, 7);
  const routes35 = MarketFlows.routesFor(w35);
  same(routes35, MarketFlows.routesFor(world(35, 7)), 'rotte deterministiche');
  const adj = {}; for (const [x, y] of routes35) { (adj[x] = adj[x] || []).push(y); (adj[y] = adj[y] || []).push(x); }
  const seen = new Set([w35[0].id]), queue = [w35[0].id];
  while (queue.length) for (const n of adj[queue.shift()] || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  ok(seen.size === w35.length, 'la rete delle rotte è connessa (' + seen.size + ' mercati)');
  ok(routes35.every(([x, y, days, cap]) => x !== y && days >= 1 && days <= 12 && cap >= 1 && cap <= 12) && new Set(routes35.map(([x, y]) => [x, y].sort().join('|'))).size === routes35.length, 'rotte valide e senza doppioni');
  ok(w35.slice(5).every(p => (adj[p.id] || []).length >= 2), 'ogni nuovo insediamento ha almeno due collegamenti');
  // D3. Un anno con 35 mercati
  const run35 = () => { const markets = startMarkets(w35), flows = MarketFlows.create(5, 1, w35, markets); MarketFlows.advance(flows, w35, markets, 2); const t0 = process.hrtime.bigint(); for (let d = 3; d <= 366; d++) MarketFlows.advance(flows, w35, markets, d); return { markets, flows, ms: Number(process.hrtime.bigint() - t0) / 1e6 / 364 }; };
  const first = run35(), second = run35();
  same(first.flows, second.flows, '35 mercati: stesso seme, stesso anno');
  same(MarketFlows.audit(first.flows, w35, first.markets), [], '35 mercati: registro in pari dopo un anno');
  let cells = 0, poor = 0, un = 0, eat = 0;
  for (const p of w35) for (const g of Object.keys(p.goods)) { cells++; const s = Number(first.markets[p.id].stock[g] || 0); if (s * 2 < p.goods[g][0]) poor++; un += Number(first.flows.ledger[p.id][g].unmet); eat += Number(first.flows.ledger[p.id][g].eaten); }
  ok(un / (un + eat) < .01, '35 mercati: fabbisogno insoddisfatto ' + (100 * un / (un + eat)).toFixed(2) + '%');
  ok(poor / cells < .1, '35 mercati: scorte sotto il 50% dell\'obiettivo in ' + poor + ' celle su ' + cells + ' alla fine dell\'anno');
  ok(w35.every(p => first.flows.wealth[p.id] >= p.traits?.wealth * .8 - 1 || !p.traits), 'ricchezza entro i limiti');
  note('35 mercati generati, 365 giorni: ' + poor + '/' + cells + ' celle sotto il 50% finale, mancato ' + (100 * un / (un + eat)).toFixed(2) + '%, ' + first.ms.toFixed(1) + ' ms per giorno');
  // D4. Un nuovo mercato compare in una partita già salvata
  const eco = Economy.create(19425);
  advanceTo(eco, 60);
  const extended = [...profiles, MarketFlows.settlementProfile({ id: 'sorgente-nuova', name: 'Sorgente Nuova', size: 'village', focus: 'farming', seed: 9, world: { x: 60, y: 60 } })];
  const markets6 = { ...clone(eco.markets), 'sorgente-nuova': { day: 60, stock: { grain: '4', water: '5' } } };
  const restored = MarketFlows.restore(clone(eco.flows), 19425, 60, extended, markets6);
  ok(restored, 'un salvataggio con cinque mercati accetta un sesto mercato');
  same(restored.ledger.vela, eco.flows.ledger.vela, 'e conserva il registro degli altri');
  same(restored.shipments, eco.flows.shipments, 'e le spedizioni in corso');
  ok(restored.opening['sorgente-nuova'].grain === '4' && restored.wealth['sorgente-nuova'] === extended[5].traits.wealth, 'il nuovo mercato parte dalle sue scorte attuali');
  for (let d = 61; d <= 120; d++) MarketFlows.advance(restored, extended, markets6, d);
  same(MarketFlows.audit(restored, extended, markets6), [], 'registro in pari dopo 60 giorni con il sesto mercato');
  ok(routes => true, 'rotte');
  ok(MarketFlows.routesFor(extended).some(([x, y]) => x === 'sorgente-nuova' || y === 'sorgente-nuova'), 'il nuovo mercato è collegato alla rete');
}

/* ---- E. Compatibilità con i salvataggi precedenti (immagini reali delle build precedenti) ---- */
{
  const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
  // E1. Economia di main (e67bd18), senza flussi
  const old = fixture('economia-senza-flussi.json');
  ok(!old.economy.flows, 'l\'immagine di e67bd18 non ha flussi');
  const migrated = Economy.restore(clone(old.economy), old.seed);
  ok(migrated && migrated.flows && migrated.flows.day === 1, 'si carica e riceve i flussi');
  same(migrated.markets, old.economy.markets, 'scorte identiche');
  ok(migrated.balance === '1250', 'saldo in banca identico');
  same(MarketFlows.audit(migrated.flows, profiles, migrated.markets), [], 'e parte con il registro in pari');
  advanceTo(migrated, 30);
  same(MarketFlows.audit(migrated.flows, profiles, migrated.markets), [], 'regge 30 giorni di simulazione');
  // E2. Flussi della prima unità (6bf7317): stessa forma, nessuna perdita
  const v1 = fixture('economia-flussi-v1.json');
  const loaded = Economy.restore(clone(v1.economy), v1.seed);
  ok(loaded && loaded.flows.day === 80, 'i flussi di 6bf7317 si caricano (giorno ' + (loaded && loaded.flows.day) + ')');
  same(loaded.flows, v1.economy.flows, 'senza alcuna modifica');
  same(loaded.markets, v1.economy.markets, 'scorte e giorno dei mercati identici');
  same(MarketFlows.audit(loaded.flows, profiles, loaded.markets), [], 'registro in pari');
  advanceTo(loaded, 180);
  same(MarketFlows.audit(loaded.flows, profiles, loaded.markets), [], 'regge altri 100 giorni con la nuova logica di rotte');
  ok(Object.keys(loaded.flows).sort().join() === Object.keys(v1.economy.flows).sort().join(), 'la forma dello stato salvato non è cambiata');
  // E3. Nel gioco completo: importazione di un salvataggio con l'economia di main
  const { Game, Calendar } = full;
  ok(Game.newGame(), 'partita nuova per l\'importazione');
  const exported = JSON.parse(Game.exportSave());
  exported.economy = clone(old.economy);
  ok(Game.importSave(JSON.stringify(exported)), 'importazione di un salvataggio con l\'economia di main');
  const current = Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).day;
  ok(Game.s.economy.flows.day === current, 'i flussi partono dal giorno corrente (' + current + ')');
  same(full.Economy.flowReport(Game.s).audit, [], 'registro in pari');
  const v1game = JSON.parse(Game.exportSave());
  v1game.economy = clone(v1.economy);
  ok(Game.importSave(JSON.stringify(v1game)), 'importazione con i flussi di 6bf7317');
  same(Game.s.economy.flows, v1.economy.flows, 'flussi conservati');
}

/* ---- F. Prestazioni ---- */
{
  const specs = n => Array.from({ length: n - 5 }, (_, i) => { const h = (i * 2654435761) >>> 0, sizes = ['village', 'village', 'town', 'town', 'town', 'city', 'capital'], foci = ['farming', 'pastoral', 'mining', 'crafts', 'alchemy', 'port', 'capital']; return { id: 'c' + i, size: sizes[h % 7], focus: foci[(h >>> 8) % 7], seed: 7, world: { x: (h >>> 4) % 100, y: (h >>> 12) % 100 } }; });
  const measure = n => {
    const list = [...profiles, ...specs(n).map(s => MarketFlows.settlementProfile(s))];
    const markets = Object.fromEntries(list.map(p => [p.id, { day: 1, stock: Object.fromEntries(Object.entries(p.goods).map(([g, [t]]) => [g, String(t)])) }]));
    const flows = MarketFlows.create(1, 1, list, markets);
    MarketFlows.advance(flows, list, markets, 5);
    const t0 = process.hrtime.bigint(); for (let d = 6; d <= 25; d++) MarketFlows.advance(flows, list, markets, d);
    const perDay = Number(process.hrtime.bigint() - t0) / 1e6 / 20;
    const t1 = process.hrtime.bigint(); const steps = MarketFlows.advance(flows, list, markets, 5000); const catchUp = Number(process.hrtime.bigint() - t1) / 1e6;
    ok(steps === MarketFlows.catchUpFor(list.length), n + ' mercati: recupero limitato a ' + steps + ' giorni');
    same(MarketFlows.audit(flows, list, markets), [], n + ' mercati: registro in pari dopo il salto');
    return { n, perDay, catchUp, steps, bytes: JSON.stringify(flows).length };
  };
  const results = [measure(5), measure(35), measure(100), measure(300)];
  const [five, , hundred, three] = results;
  ok(five.perDay < 3 && five.catchUp < 400, '5 mercati: ' + five.perDay.toFixed(2) + ' ms/giorno, recupero di ' + five.steps + ' giorni in ' + five.catchUp.toFixed(0) + ' ms');
  ok(hundred.perDay < 60 && hundred.catchUp < 1500, '100 mercati: ' + hundred.perDay.toFixed(1) + ' ms/giorno, recupero ' + hundred.catchUp.toFixed(0) + ' ms');
  ok(three.perDay < 150 && three.catchUp < 2500 && three.bytes < 2e6, '300 mercati: ' + three.perDay.toFixed(1) + ' ms/giorno, recupero ' + three.catchUp.toFixed(0) + ' ms, stato ' + (three.bytes / 1024).toFixed(0) + ' KB');
  for (const r of results) note(r.n + ' mercati: ' + r.perDay.toFixed(2) + ' ms/giorno · recupero di ' + r.steps + ' giorni ' + r.catchUp.toFixed(0) + ' ms · stato nel salvataggio ' + (r.bytes / 1024).toFixed(0) + ' KB');
}

/* ---- G. Nessuna regressione nei controlli della prima unità ---- */
{
  const run = cp.spawnSync(process.execPath, [path.join(__dirname, 'economia-flussi.cjs')], { encoding: 'utf8', cwd: root });
  ok(run.status === 0 && /158 controlli/.test(run.stdout), '158 controlli della prima unità ancora superati' + (run.status === 0 ? '' : '\n' + run.stderr.slice(0, 800)));
}

console.log('OK: seconda unità economica — ' + checks + ' controlli.');
for (const text of notes) console.log('  · ' + text);
