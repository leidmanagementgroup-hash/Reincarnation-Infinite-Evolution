/* ECO-003: la sezione «Tendenze e rotte» del pannello dei mercati. Uso: node tests/verifica-economia-tendenze.cjs */
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
vm.runInContext(fs.readFileSync(path.join(root, 'economy-panel.js'), 'utf8'), scope, { filename: 'economy-panel.js' });
const { Game, Economy, EconomyPanel } = scope;
assert(Game.newGame(), 'nuova partita');
const s = Game.s;
const html = EconomyPanel.render(s);
assert(html.includes('Tendenze e rotte del mercato'), 'sezione presente');
assert(/economyTrend/.test(html) && /economyRoutes/.test(html), 'tendenze e rotte');
const rep = Economy.flowReport(s);
assert(rep.markets.length >= 5, 'cinque mercati');
// spedizione fittizia: compare come «in arrivo»
const dest = rep.markets[0].id, good = rep.markets[0].goods[0].id;
s.economy.flows.shipments.push({ from: 'x', to: dest, id: good, qty: 3, due: s.economy.flows.day + 2 });
s.economy.market = dest; // se il campo esiste
assert(!/NaN|undefined/.test(EconomyPanel.render(s)), 'nessun NaN o undefined');
console.log('OK: sezione tendenze e rotte (' + rep.markets.length + ' mercati).');
if (process.argv.includes('--mostra')) console.log(EconomyPanel.render(s).match(/<details class="economyMore economyFlows">[\s\S]*?<\/details>/)[0].replace(/></g, '>\n<'));
