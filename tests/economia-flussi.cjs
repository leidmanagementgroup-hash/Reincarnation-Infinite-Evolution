/* Test dei flussi economici (market-flows.js e il loro collegamento in trade-economy.js).
   Uso: node tests/economia-flussi.cjs
   Parte 1: moduli economici isolati (determinismo, conservazione, prezzi, rotte, salvataggio, compatibilità).
   Parte 2: gioco completo in un contesto simulato (acquisti, vendite, rifornimento di Velaris, salvataggio e caricamento). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const modules = read('build.py').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
let checks = 0;
const ok = (value, message) => { assert(value, message); checks++; };
// I valori vengono da contesti vm diversi: si confrontano con una forma canonica (chiavi ordinate), non con i prototipi.
const canon = value => JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x < y ? -1 : 1)) : v);
const same = (a, b, message) => { assert.equal(canon(a), canon(b), message); checks++; };

function isolated(files) {
  const scope = { console };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) vm.runInContext(read(file), scope, { filename: file });
  return scope;
}
const light = isolated(['inventory.js', 'market-flows.js', 'trade-economy.js']);
const { Economy, MarketFlows } = light;
const profiles = Economy.profiles;
const clone = value => JSON.parse(JSON.stringify(value));
const run = (seed, from, to, eco = Economy.create(seed)) => {
  for (let day = from; day <= to; day++) MarketFlows.advance(eco.flows, profiles, eco.markets, day);
  return eco;
};
const stockOf = (eco, market, good) => BigInt(eco.markets[market].stock[good] || 0);
const price = (eco, market, good) => {
  const profile = profiles.find(p => p.id === market);
  return MarketFlows.multiplier(eco.flows, profile, good, stockOf(eco, market, good));
};
const goods = [...new Set(profiles.flatMap(p => Object.keys(p.goods)))];

/* ---- 1. Determinismo ---- */
{
  const a = run(19425, 2, 200), b = run(19425, 2, 200);
  same(a, b, 'stesso seme e stessi giorni → stesso stato');
  const jump = Economy.create(19425);
  MarketFlows.advance(jump.flows, profiles, jump.markets, 100);          // un solo salto di 99 giorni
  same(jump, run(19425, 2, 100), 'un salto di molti giorni equivale a passi giornalieri');
  const other = run(777, 2, 200);
  ok(JSON.stringify(other.markets) !== JSON.stringify(a.markets), 'semi diversi → raccolti diversi');
  const before = JSON.stringify(a);
  MarketFlows.advance(a.flows, profiles, a.markets, 200);
  MarketFlows.advance(a.flows, profiles, a.markets, 150);
  ok(JSON.stringify(a) === before, 'ripetere o tornare indietro non cambia nulla');
}

/* ---- 2. Conservazione delle merci ---- */
{
  const eco = Economy.create(19425);
  same(MarketFlows.audit(eco.flows, profiles, eco.markets), [], 'registro in pari all\'inizio');
  let seq = 0;
  for (let day = 2; day <= 365; day++) {
    MarketFlows.advance(eco.flows, profiles, eco.markets, day);
    if (day % 7 === 0) {              // il giocatore vende o compra, e Velaris riceve forniture: tutto dichiarato come esterno
      const p = profiles[seq++ % profiles.length], g = Object.keys(p.goods)[seq % Object.keys(p.goods).length];
      const take = BigInt(seq % 3), put = BigInt(1 + seq % 4);
      const have = stockOf(eco, p.id, g);
      const out = take < have ? take : have;
      if (out) { eco.markets[p.id].stock[g] = String(have - out); MarketFlows.external(eco.flows, p.id, g, -out); }
      eco.markets[p.id].stock[g] = String(stockOf(eco, p.id, g) + put); MarketFlows.external(eco.flows, p.id, g, put);
    }
  }
  same(MarketFlows.audit(eco.flows, profiles, eco.markets), [], 'nessuna merce nasce o sparisce in un anno');
  for (const g of goods) {
    let imported = 0n, exported = 0n, lost = 0n;
    for (const p of profiles) if (p.goods[g]) { const l = eco.flows.ledger[p.id][g]; imported += BigInt(l.imported); exported += BigInt(l.exported); lost += BigInt(l.lost); }
    let moving = 0n;
    for (const ship of eco.flows.shipments) if (ship.id === g) moving += BigInt(ship.qty);
    ok(imported + moving === exported - lost, 'merci in viaggio: partite = arrivate + in transito + perdite (' + g + ')');
  }
  for (const p of profiles) for (const g of Object.keys(p.goods)) ok(BigInt(eco.markets[p.id].stock[g] || 0) >= 0n, 'scorte mai negative');
  // Una scorta manomessa senza dichiararla viene individuata.
  eco.markets.vela.stock.herb = String(stockOf(eco, 'vela', 'herb') + 5n);
  ok(MarketFlows.audit(eco.flows, profiles, eco.markets).some(x => x.market === 'vela' && x.good === 'herb'), 'una merce comparsa dal nulla viene segnalata');
}

/* ---- 3. Produzione, consumo e differenze fra mercati ---- */
{
  const eco = run(19425, 2, 120);
  const total = f => profiles.reduce((sum, p) => sum + Object.keys(p.goods).reduce((n, g) => n + BigInt(eco.flows.ledger[p.id][g][f]), 0n), 0n);
  ok(total('produced') > 5000n && total('eaten') > 2000n, 'le professioni producono e gli abitanti consumano');
  ok(total('unmet') * 20n < total('eaten'), 'il fabbisogno insoddisfatto resta sotto il 5% dei consumi');
  const made = (m, g) => BigInt(eco.flows.ledger[m][g].produced);
  ok(made('filoni', 'ore') > made('vela', 'ore') && made('filoni', 'ore') > 100n, 'Filoni (miniera) estrae più minerale della valle');
  ok(made('namar', 'grain') > made('velaris', 'grain'), 'Namar (savana) produce più grano della città alchemica');
  ok(made('velaris', 'potion') > made('namar', 'potion'), 'Velaris (alchimisti) produce più pozioni di Namar');
  ok(made('calis', 'essence') > 0n && made('vela', 'essence' in profiles[0].goods ? 'essence' : 'herb') >= 0n, 'professioni collegate ai beni del mercato');
  // Trasformazione: pozioni e pane consumano materie prime.
  ok(BigInt(eco.flows.ledger.velaris.herb.used) > 0n && BigInt(eco.flows.ledger.vela.grain.used) > 0n, 'i trasformatori consumano le materie prime');
  const baked = profiles.reduce((n, p) => n + BigInt(eco.flows.ledger[p.id].bread.produced), 0n);
  const flour = profiles.reduce((n, p) => n + BigInt(eco.flows.ledger[p.id].grain.used), 0n);
  ok(baked === flour, 'ogni pane prodotto consuma esattamente un grano');
  const potions = profiles.reduce((n, p) => n + (p.goods.potion ? BigInt(eco.flows.ledger[p.id].potion.produced) : 0n), 0n);
  const herbs = profiles.reduce((n, p) => n + BigInt(eco.flows.ledger[p.id].herb.used), 0n);
  ok(herbs === potions * 2n, 'ogni pozione consuma esattamente due erbe');
  const work = MarketFlows.activity(profiles[1], eco.markets.filoni.stock);
  ok(work.find(row => row.job === 'miner' && row.workers === 3 && row.effort > 0), 'attività dei lavoratori leggibile per le routine degli NPC');
}

/* ---- 4. Prezzi: scarsità, ricchezza, disponibilità ---- */
{
  const eco = run(19425, 2, 150);
  const probe = clone(eco);
  const vela = profiles.find(p => p.id === 'vela');
  const curve = [0n, 2n, 4n, 8n, 16n, 40n].map(n => MarketFlows.multiplier(probe.flows, vela, 'herb', n));
  for (let i = 1; i < curve.length; i++) ok(curve[i] <= curve[i - 1], 'il prezzo non cresce con l\'abbondanza');
  ok(curve[0] > curve[3] && curve[3] > curve[5], 'scarsità = prezzo alto, abbondanza = prezzo basso');
  ok(curve[0] <= 1600 * 1.4 && curve[5] >= 400 * .8 * .9, 'i prezzi restano entro limiti ragionevoli');
  const rich = clone(eco); rich.flows.wealth.vela = 1400;
  const poor = clone(eco); poor.flows.wealth.vela = 800;
  for (const g of ['potion', 'essence', 'wool']) if (vela.goods[g]) ok(MarketFlows.multiplier(rich.flows, vela, g, 5n) > MarketFlows.multiplier(poor.flows, vela, g, 5n), 'la ricchezza alza i prezzi dei beni di lusso (' + g + ')');
  ok(MarketFlows.multiplier(rich.flows, vela, 'water', 5n) > MarketFlows.multiplier(poor.flows, vela, 'water', 5n), 'e, meno, quelli dei beni di prima necessità');
  const lux = MarketFlows.multiplier(rich.flows, vela, 'potion', 6n) / MarketFlows.multiplier(poor.flows, vela, 'potion', 6n);
  const nec = MarketFlows.multiplier(rich.flows, vela, 'water', 8n) / MarketFlows.multiplier(poor.flows, vela, 'water', 8n);
  ok(lux > nec, 'il lusso reagisce alla ricchezza più della necessità');
  // Differenze regionali dopo 150 giorni.
  ok(price(eco, 'filoni', 'ore') < price(eco, 'velaris', 'ore') && price(eco, 'filoni', 'ore') < price(eco, 'vela', 'ore'), 'il minerale costa meno dove si estrae');
  ok(price(eco, 'namar', 'wool') < price(eco, 'calis', 'wool'), 'la lana costa meno nella terra dei pastori');
  ok(price(eco, 'calis', 'essence') > price(eco, 'velaris', 'essence'), 'l\'essenza costa di più nello scalo di Calis che a Velaris');
  // Il giocatore compra tutta una merce: il prezzo sale; la inonda di merce: scende.
  const squeezed = clone(eco); squeezed.markets.vela.stock.herb = '0';
  const flooded = clone(eco); flooded.markets.vela.stock.herb = '5000';
  ok(price(squeezed, 'vela', 'herb') > price(eco, 'vela', 'herb') && price(flooded, 'vela', 'herb') < price(eco, 'vela', 'herb'), 'scarsità e abbondanza provocate dal giocatore spostano il prezzo');
  // Con le scorte esaurite le professioni accelerano e le scorte tornano verso l'obiettivo.
  run(19425, 151, 190, squeezed);
  ok(stockOf(squeezed, 'vela', 'herb') >= 6n, 'dopo un esaurimento le scorte si ricostituiscono da produzione e rotte');
}

/* ---- 5. Rotte commerciali ---- */
{
  const eco = run(19425, 2, 60);
  const inbound = (m, g) => BigInt(eco.flows.ledger[m][g].imported), outbound = (m, g) => BigInt(eco.flows.ledger[m][g].exported);
  ok(outbound('filoni', 'ore') > 0n && inbound('velaris', 'ore') + inbound('calis', 'ore') + inbound('vela', 'ore') > 0n, 'il minerale dei Filoni raggiunge gli altri mercati');
  ok(outbound('velaris', 'potion') > 0n, 'Velaris esporta pozioni');
  const transit = MarketFlows.inTransit(eco.flows);
  ok(Object.keys(transit).length > 0, 'esistono merci in viaggio');
  const days = new Set(eco.flows.shipments.map(s => s.due - eco.flows.day));
  ok([...days].every(d => d >= 0 && d <= 6), 'i tempi di viaggio rispettano le rotte');
  ok(eco.flows.shipments.length <= 300, 'le spedizioni sono limitate');
  // Le merci viaggiano solo lungo le rotte esistenti.
  const known = new Set(MarketFlows.routes.flatMap(([a, b]) => [a + '>' + b, b + '>' + a]));
  ok(eco.flows.shipments.every(ship => known.has(ship.from + '>' + ship.to)), 'ogni spedizione segue una rotta commerciale');
  // Senza differenza di prezzo (stessa ricchezza, scorte identiche) non parte nulla: i produttori non spediscono per spedire.
  const level = Economy.create(1);
  for (const p of profiles) { level.flows.wealth[p.id] = 1000; for (const g of Object.keys(p.goods)) level.markets[p.id].stock[g] = String(p.goods[g][0] * 3); }
  const before = JSON.stringify(level.flows.shipments);
  const noGap = clone(level);
  MarketFlows.advance(noGap.flows, profiles, noGap.markets, 2);
  ok(noGap.flows.shipments.length === 0 && before === '[]', 'scorte abbondanti ovunque: nessuna spedizione');
  // Ricchezza: chi esporta valore supera la base, chi importa scende, sempre entro i limiti.
  for (const p of profiles) {
    const base = MarketFlows.traits[p.id].wealth, w = eco.flows.wealth[p.id];
    ok(w >= base * .8 && w <= base * 1.4, 'la ricchezza resta entro i limiti (' + p.id + ')');
  }
  ok(eco.flows.wealth.vela > MarketFlows.traits.vela.wealth || eco.flows.wealth.filoni > MarketFlows.traits.filoni.wealth, 'un mercato esportatore si arricchisce');
}

/* ---- 6. Persistenza e compatibilità dei salvataggi ---- */
{
  const eco = run(19425, 2, 80);
  const saved = JSON.parse(JSON.stringify(eco));
  const restored = Economy.restore(saved, 19425);
  ok(restored, 'un salvataggio con flussi si ricarica');
  same(restored.flows, eco.flows, 'i flussi sopravvivono a salvataggio e caricamento senza perdite');
  same(restored.markets, JSON.parse(JSON.stringify(eco.markets)), 'le scorte restano identiche');
  run(19425, 81, 160, restored); run(19425, 81, 160, eco);
  same(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(eco)), 'dopo il ricaricamento la simulazione continua come senza interruzioni');
  same(MarketFlows.audit(restored.flows, profiles, restored.markets), [], 'registro in pari dopo il ricaricamento');

  // Salvataggio precedente senza flussi: nessun recupero retroattivo, stesse scorte.
  const legacy = clone(saved); delete legacy.flows;
  const migrated = Economy.restore(legacy, 19425);
  ok(migrated && migrated.flows && migrated.flows.day === 1, 'senza flussi se ne crea uno nuovo');
  same(migrated.markets, JSON.parse(JSON.stringify(saved.markets)), 'la migrazione non tocca le scorte');
  same(MarketFlows.audit(migrated.flows, profiles, migrated.markets), [], 'e parte con il registro in pari');

  // Dati manomessi: i flussi vengono ricreati, il salvataggio non viene rifiutato.
  for (const damage of [f => { f.day = -3; }, f => { f.wealth.vela = 'ricco'; }, f => { f.ledger.vela.herb.eaten = '-4'; },
      f => { f.shipments.push({ from: 'vela', to: 'vela', id: 'herb', qty: 3, due: 5 }); }, f => { f.shipments.push({ from: 'x', to: 'vela', id: 'herb', qty: 3, due: 5 }); },
      f => { f.carry.eat.vela.herb = 1.5; }, f => { f.opening.vela.herb = 'a'; }, f => { f.schema = 2; }, f => { f.seed = -1; }]) {
    const broken = clone(saved); damage(broken.flows);
    const result = Economy.restore(broken, 19425);
    ok(result && result.flows && MarketFlows.audit(result.flows, profiles, result.markets).length === 0, 'flussi non validi ricreati senza rifiutare il salvataggio');
  }
  // Il registro contiene flussi esterni negativi (acquisti del giocatore): devono sopravvivere al salvataggio.
  const traded = run(19425, 2, 30);
  traded.markets.vela.stock.herb = String(stockOf(traded, 'vela', 'herb') - 2n); MarketFlows.external(traded.flows, 'vela', 'herb', -2n);
  ok(BigInt(traded.flows.ledger.vela.herb.external) === -2n, 'flusso esterno negativo registrato');
  const tradedBack = Economy.restore(clone(traded), 19425);
  same(tradedBack.flows, traded.flows, 'flussi esterni negativi sopravvivono al caricamento (nessun azzeramento)');
  const huge = clone(saved); huge.markets.vela.stock.herb = '123456789012345678901234567890';
  const hugeRestored = Economy.restore(huge, 19425);
  ok(hugeRestored, 'scorte enormi (BigInt) restano valide');
  same(MarketFlows.audit(hugeRestored.flows, profiles, hugeRestored.markets), [], 'scorte modificate fuori dal registro: il registro riparte dal presente');
  same(hugeRestored.flows.wealth, saved.flows.wealth, 'senza perdere la ricchezza');
  same(hugeRestored.flows.shipments, saved.flows.shipments, 'né le merci in viaggio');
  run(19425, hugeRestored.flows.day + 1, hugeRestored.flows.day + 20, hugeRestored);
  same(MarketFlows.audit(hugeRestored.flows, profiles, hugeRestored.markets), [], 'una scorta di 30 cifre si smaltisce senza perdere esattezza');
  ok(BigInt(hugeRestored.markets.vela.stock.herb) < 123456789012345678901234567890n, 'e viene smaltita oltre la capacità del magazzino');

  // Senza il modulo dei flussi l'economia resta quella di prima (compatibilità con build vecchie o parziali).
  const old = isolated(['inventory.js', 'trade-economy.js']).Economy;
  const plain = old.create(19425);
  ok(plain.flows === undefined && old.restore(JSON.parse(JSON.stringify(saved)), 19425).flows === undefined, 'senza MarketFlows il vecchio riassortimento resta valido');
}

/* ---- 7. Limiti e prestazioni ---- */
{
  const eco = Economy.create(19425);
  const t0 = process.hrtime.bigint();
  const steps = MarketFlows.advance(eco.flows, profiles, eco.markets, 100000);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  ok(steps === MarketFlows.maxCatchUp && eco.flows.day === 100000, 'una lunga assenza simula al massimo ' + MarketFlows.maxCatchUp + ' giorni');
  ok(ms < 250, 'recupero di 120 giorni in ' + ms.toFixed(0) + ' ms');
  same(MarketFlows.audit(eco.flows, profiles, eco.markets), [], 'registro in pari anche dopo un salto di 100 000 giorni');
  const t1 = process.hrtime.bigint();
  run(19425, 2, 366);
  const perDay = Number(process.hrtime.bigint() - t1) / 1e6 / 365;
  ok(perDay < 2, 'un giorno di simulazione costa ' + perDay.toFixed(2) + ' ms');
  const size = JSON.stringify(eco.flows).length;
  ok(size < 40000, 'stato dei flussi nel salvataggio: ' + size + ' caratteri');
}

/* ---- 8. Gioco completo: acquisti, vendite, rifornimento di Velaris, salvataggio ---- */
{
  const store = new Map();
  const surface = () => { const px = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return px.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(px, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
  const scope = { console: { warn() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  scope.window = scope; vm.createContext(scope);
  for (const file of modules) { if (file === 'audio.js') break; vm.runInContext(read(file), scope, { filename: file }); }
  const { Game, Economy: FullEconomy, Inventory, Calendar, MarketFlows: Flows } = scope;
  vm.runInContext('Math.random = (() => { let n = 0; return () => n++ === 0 ? 19425 / 4294967296 : .24; })()', scope);
  ok(Game.newGame(), 'nuova partita');
  const s = Game.s;
  ok(s.economy.flows && s.economy.flows.schema === 1, 'la partita nuova contiene i flussi');
  const setMinute = minute => { const now = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((minute - now + 1440) % 1440) / (Calendar.minutesPerSecond || .8); };
  const day = () => Calendar.view(s.calendar, s.time, s.region).day;
  setMinute(12 * 60);
  s.region = 'valley'; Object.assign(s.player, { x: 445, y: 627 });      // Mercato di Vela
  const panel = () => FullEconomy.view(s).market.rows;
  const row = id => panel().find(r => r.id === id);
  const herb0 = row('herb');
  ok(herb0 && BigInt(herb0.stock) > 0n && herb0.buy > herb0.sell, 'il pannello del mercato mostra prezzi coerenti');
  s.player.gold = 100000;
  const before = Inventory.quantity(s, 'herb');
  const bought = FullEconomy.command(s, { op: 'buy', id: 'herb', amount: '3' });
  ok(bought.ok && Inventory.quantity(s, 'herb') === before + 3n, 'acquisto riuscito');
  same(FullEconomy.flowReport(s).audit, [], 'l\'acquisto è registrato come flusso esterno');
  ok(BigInt(row('herb').stock) === BigInt(herb0.stock) - 3n, 'la scorta cala esattamente della merce acquistata');
  const sold = FullEconomy.command(s, { op: 'sell', id: 'herb', amount: '2' });
  ok(sold.ok && Inventory.quantity(s, 'herb') === before + 1n, 'vendita riuscita');
  same(FullEconomy.flowReport(s).audit, [], 'anche la vendita');
  const refused = FullEconomy.command(s, { op: 'buy', id: 'herb', amount: '99999' });
  ok(!refused.ok, 'un acquisto oltre le scorte viene rifiutato');
  same(FullEconomy.flowReport(s).audit, [], 'e non altera il registro');

  // Rifornimento di Velaris dai mestieri della città: merce nuova, dichiarata.
  const delivered = FullEconomy.supplyVelarisMarket(s, 'herb', 4n);
  ok(delivered >= 0n && delivered <= 4n, 'Velaris riceve al più la merce offerta');
  same(FullEconomy.flowReport(s).audit, [], 'le forniture urbane sono registrate come flusso esterno');

  // Il tempo passa: dormire e giocare per giorni fa muovere produzione, rotte e prezzi.
  const start = clone(s.economy.markets), startDay = day();
  s.time += 20 * 1440 / (Calendar.minutesPerSecond || .8);
  FullEconomy.tick(s);
  ok(day() >= startDay + 19 && s.economy.flows.day === day(), 'dopo 20 giorni i flussi sono al giorno corrente');
  ok(JSON.stringify(s.economy.markets) !== JSON.stringify(start), 'le scorte sono cambiate per produzione, consumo e rotte');
  same(FullEconomy.flowReport(s).audit, [], 'registro in pari dopo 20 giorni');
  const report = FullEconomy.flowReport(s);
  ok(report.markets.length === 5 && report.work.vela.length > 0, 'rapporto per mercati e lavoratori');

  // Salvataggio e caricamento: i cambiamenti economici persistono.
  ok(Game.save(), 'salvataggio');
  const snapshot = clone(s.economy);
  const file = Game.exportSave();
  Game.s.economy = FullEconomy.create(1);                             // stato economico diverso in memoria
  ok(Game.load(), 'caricamento');
  same(clone(Game.s.economy), snapshot, 'scorte, prezzi, ricchezza e spedizioni tornano identici');
  same(FullEconomy.flowReport(Game.s).audit, [], 'registro in pari dopo il caricamento');
  Game.newGame();                                                     // un'altra partita sostituisce quella in memoria
  ok(Game.importSave(file), 'importazione del file esportato');
  same(clone(Game.s.economy), snapshot, 'anche l\'esportazione conserva tutto');
  const exported = JSON.parse(Game.exportSave());
  ok(exported.economy.flows.schema === 1 && Object.keys(exported.economy.flows.ledger).length === 5, 'esportazione JSON con i flussi');
  const noFlows = clone(exported); delete noFlows.economy.flows;
  ok(Game.importSave(JSON.stringify(noFlows)) && Game.s.economy.flows.day === Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).day, 'un salvataggio precedente si importa e parte dal giorno corrente');
  same(FullEconomy.flowReport(Game.s).audit, [], 'registro in pari dopo l\'importazione');
}

console.log('OK: flussi economici — ' + checks + ' controlli (determinismo, conservazione, prezzi, rotte, salvataggi, compatibilità, gioco completo).');
