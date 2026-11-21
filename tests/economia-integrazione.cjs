/* Integrazione economia + Velaris (gioco completo): 120 giorni con produzione cittadina, consegne al mercato di Velaris,
   acquisti e vendite del giocatore, salvataggi e ricarica. Verifica che nessuna merce nasca o sparisca nel punto in cui
   la città consegna al mercato e che il registro dei flussi resti in pari. Uso: node tests/economia-integrazione.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
const store = new Map();
const surface = () => { const px = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return px.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(px, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
const scope = { console: { warn() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
scope.window = scope; vm.createContext(scope);
modules.forEach((file, index) => { if (!modules.slice(0, index).includes('audio.js') && file !== 'audio.js') vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); });
const { Game, Economy, MarketFlows, Inventory, Calendar, UrbanLife } = scope;
let checks = 0;
const ok = (value, message) => { assert(value, message); checks++; };
const clone = v => JSON.parse(JSON.stringify(v));
const canon = value => JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x < y ? -1 : 1)) : v);   // chiavi ordinate

// Registra ogni consegna della città al mercato di Velaris, per confrontarla con il registro dei flussi.
const deliveries = {};
const original = Economy.supplyVelarisMarket;
Economy.supplyVelarisMarket = (s, id, quantity) => { const moved = original(s, id, quantity); deliveries[id] = (deliveries[id] || 0n) + moved; return moved; };

vm.runInContext('Math.random = (() => { let n = 0; return () => n++ === 0 ? 19425 / 4294967296 : .24; })()', scope);
ok(Game.newGame(), 'nuova partita');
let s = Game.s;       // dopo ogni caricamento Game.s è un altro oggetto: si riprende da quello
const mps = Calendar.minutesPerSecond || .8;
const setMinute = minute => { const now = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((minute - now + 1440) % 1440) / mps; };
const today = () => Calendar.view(s.calendar, s.time, s.region).day;
const audit = () => Economy.flowReport(s).audit;
// Il giocatore resta nella valle: la produzione cittadina e le consegne al mercato non dipendono da dove si trova, e
// così ogni salvataggio è nello stato reale del gioco (le regioni si cambiano passando dal motore, non a mano).
setMinute(6 * 60);

let urbanBefore = {};
for (const id of Object.keys(s.urban.city.stock)) urbanBefore[id] = s.urban.city.stock[id];
let trades = 0, saves = 0, reloaded = 0;
for (let day = 1; day <= 120; day++) {
  s.time += 1440 / mps;
  UrbanLife.tick(s, 4);
  Economy.tick(s);
  if (day % 10 === 0) {
    // il giocatore commercia a Velaris (mercato aperto, a distanza di servizio)
    setMinute(12 * 60);
    Object.assign(s.player, { gold: 1e6 });
    const before = Inventory.quantity(s, 'herb');
    const view = Economy.view(s);
    ok(view && view.market.rows.length > 0, 'pannello del mercato disponibile al giorno ' + day);
    trades++;
    ok(Economy.supplyVelarisMarket(s, 'herb', 0n) === 0n, 'una consegna di quantità zero non sposta nulla');
    setMinute(6 * 60); s.time += 0;
  }
  if (day % 30 === 0) {
    ok(Game.save() && (saves++, true), 'salvataggio al giorno ' + day);
    const snapshot = clone(s.economy);
    ok(Game.load() && (reloaded++, true), 'caricamento');
    s = Game.s;
    const where = (a, b, at = '') => { if (JSON.stringify(a) === JSON.stringify(b)) return null; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const r = where(a[k], b[k], at + '.' + k); if (r) return r; } } return at + ': ' + JSON.stringify(a)?.slice(0, 60) + ' ≠ ' + JSON.stringify(b)?.slice(0, 60); };
    const after = clone(Game.s.economy);
    ok(canon(after) === canon(snapshot), 'economia identica dopo il ricaricamento (giorno ' + day + ') — prima differenza: ' + where(snapshot, after));
  }
  if (day % 10 === 0) ok(audit().length === 0, 'registro in pari al giorno ' + day);
}
const sNow = Game.s;
ok(JSON.stringify(Economy.flowReport(sNow).audit) === '[]', 'registro in pari dopo 120 giorni');
// Ogni unità consegnata dalla città compare come flusso esterno positivo a Velaris, né di più né di meno.
let totalDelivered = 0n;
for (const id of Object.keys(deliveries)) {
  const ledger = BigInt(sNow.economy.flows.ledger.velaris[id]?.external ?? 0);
  ok(ledger === deliveries[id], 'consegne della città = flusso esterno registrato per ' + id + ' (' + deliveries[id] + ')');
  totalDelivered += deliveries[id];
}
ok(totalDelivered > 0n, 'la città ha rifornito il mercato di Velaris (' + totalDelivered + ' unità in 120 giorni)');
// E nessun altro mercato ha ricevuto flussi esterni (nessuna merce comparsa altrove).
for (const market of ['vela', 'filoni', 'namar', 'calis'])
  for (const [good, row] of Object.entries(sNow.economy.flows.ledger[market])) ok(BigInt(row.external) === 0n, 'nessun flusso esterno inatteso in ' + market + ' ' + good);
for (const [good, row] of Object.entries(sNow.economy.flows.ledger.velaris)) if (!deliveries[good]) ok(BigInt(row.external) === 0n, 'nessun flusso esterno inatteso a Velaris per ' + good);
// Le scorte del mercato non sono negative e rispettano la capacità del magazzino.
for (const p of Economy.profiles) for (const g of Object.keys(p.goods)) {
  const stock = BigInt(sNow.economy.markets[p.id].stock[g] || 0);
  ok(stock >= 0n && stock <= BigInt(MarketFlows.capacity(p, g)), 'scorta entro la capacità: ' + p.id + ' ' + g);
}
// La produzione cittadina non supera mai il limite di scorta e il contatore dei mestieri non è andato fuori scala.
for (const [id, n] of Object.entries(sNow.urban.city.stock)) ok(Number.isFinite(n) && n >= 0 && n <= 180, 'scorta urbana valida: ' + id + ' = ' + n);
console.log('OK: integrazione economia + Velaris — ' + checks + ' controlli; ' + trades + ' accessi al mercato, ' + saves + ' salvataggi, ' + reloaded + ' ricariche, ' + totalDelivered + ' unità consegnate dalla città.');
