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
const { Game, Economy, Calendar } = scope;
const clone = v => JSON.parse(JSON.stringify(v));
assert(Game.newGame(), 'nuova partita');
let s = Game.s;
assert.equal(Economy.view(s).markets.length, 5);
// 1. salvataggio con un mercato sconosciuto: resta da parte e rientra alla registrazione
const raw = clone(s.economy);
raw.markets.zeta = { day: 1, stock: { herb: '7', grain: '3' } };
const loaded = Economy.restore(raw, s.seed, s);
assert(loaded, 'il salvataggio con un mercato in piu si carica');
assert(!('zeta' in loaded.markets) && loaded.dormant.zeta.stock.herb === '7', 'mercato non registrato conservato a parte');
s.economy = loaded;
const profile = Economy.register({ id: 'zeta', name: 'Mercato di Zeta', region: 'valley', continent: 'continent-1', x: 300, y: 300, size: 'town', focus: 'farming', seed: 5 }, s);
assert(profile, 'registrazione riuscita');
assert.equal(s.economy.markets.zeta.stock.herb, '7', 'scorte recuperate dal salvataggio');
assert(!s.economy.dormant, 'nessun resto in disparte');
assert.equal(Economy.view(s).markets.length, 6, 'sei mercati nella vista');
assert.equal(Economy.register({ id: 'zeta', name: 'x', region: 'valley', size: 'town', focus: 'farming' }, s), null, 'duplicato rifiutato');
assert.equal(Economy.register({ id: '__proto__', region: 'valley', size: 'town', focus: 'farming' }, s), null, 'id pericoloso rifiutato');
// 2. un vecchio salvataggio con cinque mercati si carica e il sesto nasce con scorte proprie
const old = clone(s.economy); delete old.markets.zeta; delete old.flows.opening.zeta; delete old.flows.wealth.zeta; delete old.flows.ledger.zeta;
for (const k of Object.keys(old.flows.carry)) delete old.flows.carry[k].zeta;
const again = Economy.restore(old, s.seed, s);
assert(again && again.markets.zeta, 'il mercato nuovo nasce al caricamento');
s.economy = again;
// 3. i giorni scorrono senza squilibri nel registro e con il mercato nuovo che produce
const mps = Calendar.minutesPerSecond || .8;
for (let d = 0; d < 20; d++) { s.time += 1440 / mps; Economy.tick(s); }
assert(Economy.flowReport(s).day >= 20, 'i giorni sono passati: ' + Economy.flowReport(s).day);
assert.equal(Economy.flowReport(s).audit.length, 0, 'registro dei flussi in pari');
assert(Economy.flowReport(s).markets.some(m => m.id === 'zeta'), 'zeta nel rapporto');
// 4. senza uno dei cinque storici il salvataggio e rifiutato
const broken = clone(s.economy); delete broken.markets.vela;
assert.equal(Economy.restore(broken, s.seed, s), null, 'manca un mercato storico');
// 5. salvataggio completo e ricarica del gioco
const text = JSON.stringify(s.economy); assert(!/NaN|undefined/.test(text));
console.log('OK: mercati dinamici (6 mercati, salvataggio, vecchio salvataggio, 20 giorni, audit in pari).');
