/* Analisi del bilanciamento economico: simula i cinque mercati per 30, 150 e 365 giorni e riassume, per ogni merce,
   scorte, giorni a scaffale vuoto, giorni di eccesso, prezzi minimi e massimi, fabbisogno insoddisfatto, produzione e
   scambi. Strumento di diagnosi (non è un test): uso `node tests/analisi-economia.cjs [semi separati da virgola] [orizzonti]`.
   Con `--json` stampa i dati grezzi. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const seeds = (args[0] || '19425,555,2024').split(',').map(Number);
const horizons = (args[1] || '30,150,365').split(',').map(Number);
const scope = { console };
scope.window = scope;
vm.createContext(scope);
for (const file of ['inventory.js', 'market-flows.js', 'trade-economy.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file });
const { Economy, MarketFlows } = scope;
const profiles = Economy.profiles;

function simulate(seed, days) {
  const eco = Economy.create(seed);
  const rows = {};
  for (const p of profiles) for (const g of Object.keys(p.goods)) rows[p.id + ':' + g] = { market: p.id, good: g, target: p.goods[g][0], native: p.goods[g][1],
    empty: 0, low: 0, high: 0, sum: 0, min: Infinity, max: 0, pmin: Infinity, pmax: 0, psum: 0 };
  for (let day = 2; day <= days + 1; day++) {
    MarketFlows.advance(eco.flows, profiles, eco.markets, day);
    for (const p of profiles) for (const g of Object.keys(p.goods)) {
      const r = rows[p.id + ':' + g], stock = BigInt(eco.markets[p.id].stock[g] || 0), n = Number(stock);
      const price = MarketFlows.multiplier(eco.flows, p, g, stock);
      r.sum += n; r.min = Math.min(r.min, n); r.max = Math.max(r.max, n);
      if (n === 0) r.empty++;
      if (n * 2 < r.target) r.low++;
      if (n > r.target * 2) r.high++;
      r.pmin = Math.min(r.pmin, price); r.pmax = Math.max(r.pmax, price); r.psum += price;
    }
  }
  for (const key in rows) {
    const r = rows[key], l = eco.flows.ledger[r.market][r.good];
    Object.assign(r, { days, mean: r.sum / days, pmean: r.psum / days,
      produced: Number(l.produced), used: Number(l.used), eaten: Number(l.eaten), unmet: Number(l.unmet), spoiled: Number(l.spoiled),
      imported: Number(l.imported), exported: Number(l.exported), lost: Number(l.lost) });
  }
  return { eco, rows };
}

const all = {};
for (const days of horizons) for (const seed of seeds) all[days + '/' + seed] = simulate(seed, days);
if (process.argv.includes('--json')) { console.log(JSON.stringify(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.rows])))); process.exit(0); }

const pad = (v, n) => String(v).padEnd(n), num = (v, d = 1) => (+v).toFixed(d);
for (const days of horizons) {
  const seed = seeds[0], { eco, rows } = all[days + '/' + seed];
  console.log('\n=== ' + days + ' giorni, seme ' + seed + ' ===');
  console.log(pad('mercato:merce', 18), pad('obiettivo', 9), pad('media', 6), pad('min-max', 8), pad('vuoto%', 7), pad('<50%', 6), pad('>200%', 6), pad('prezzo min/med/max (permille)', 30), pad('mancato/giorno', 14), 'prod/cons/in/out');
  for (const r of Object.values(rows)) {
    console.log(pad(r.market + ':' + r.good, 18), pad(r.target, 9), pad(num(r.mean), 6), pad(r.min + '-' + r.max, 8), pad(num(100 * r.empty / r.days, 0), 7),
      pad(num(100 * r.low / r.days, 0), 6), pad(num(100 * r.high / r.days, 0), 6), pad(r.pmin + '/' + Math.round(r.pmean) + '/' + r.pmax, 30), pad(num(r.unmet / r.days, 2), 14),
      [r.produced, r.eaten + r.used, r.imported, r.exported].join('/'));
  }
  console.log('ricchezza:', profiles.map(p => p.id + ' ' + eco.flows.wealth[p.id]).join(' · '), '· in viaggio:', eco.flows.shipments.length);
}
// Sintesi su tutti i semi.
console.log('\n=== Sintesi (tutti i semi) ===');
for (const days of horizons) {
  const rows = seeds.flatMap(seed => Object.values(all[days + '/' + seed].rows));
  const cell = rows.length;
  const chronic = rows.filter(r => r.empty / r.days > .25 || r.low / r.days > .6);
  const glut = rows.filter(r => r.high / r.days > .6);
  const unmet = rows.reduce((n, r) => n + r.unmet, 0), eaten = rows.reduce((n, r) => n + r.eaten, 0);
  console.log(days + ' giorni: ' + cell + ' celle · croniche (vuote >25% o <50% per >60% dei giorni): ' + chronic.length + ' [' + [...new Set(chronic.map(r => r.market + ':' + r.good))].join(', ') + '] · eccesso (>200% per >60%): ' + glut.length +
    ' [' + [...new Set(glut.map(r => r.market + ':' + r.good))].join(', ') + '] · mancato/consumato ' + num(100 * unmet / Math.max(1, eaten + unmet), 1) + '%');
}
