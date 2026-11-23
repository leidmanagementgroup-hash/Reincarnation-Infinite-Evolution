// Economia e professioni (Living World 2.0, incremento 2), motore reale in Node senza browser.
// Uso:   node tests/verifica-mestieri.cjs        (ONLY=2,6 per eseguire solo alcuni passi)
// Controlla: LW-ECO-01 (nessun guadagno vendendo e ricomprando un lotto, per ogni merce dei mercati visitati e ogni
// dimensione di lotto), prezzo di una unità invariato, quantità enormi rifiutate subito, LW-ECO-02 (tetto di magazzino),
// LW-ECO-04 (qualità della lama nel prezzo), LW-ECO-03 (le lame vendute trovano compratori, una al giorno); fabbro: ordini
// dell'Armeria del Passo ai Filoni (solo quando le lame mancano, una consegna al giorno, fama che alza le richieste);
// mercante: taccuino dei soli prezzi visti di persona e contratti del Registro dei Carichi di Calis; registro dei flussi in
// pari, salvataggio e ripristino, determinismo, salvataggi senza `careers` o con dati danneggiati.
// Viaggi veri da varco a varco (World.route + interazione). Preparazioni dichiarate: esperienza di mestiere impostata, lame e
// merci aggiunte al borsello (la forgia reale è provata in Edge da prova-browser-mestieri.cjs).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
function surface() {
  const pixels = {
    createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
    getImageData(_x, _y, width, height) { return pixels.createImageData(width, height); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get(target, key) { return key in target ? target[key] : () => undefined; } });
  return { width: 1, height: 1, getContext: () => context };
}
const store = new Map();
const scope = { console: { warn() {}, log() {} }, document: { createElement: surface },
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
scope.window = scope;
vm.createContext(scope);
for (const file of modules) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
const { Game, World, Inventory, Economy, Calendar, Careers } = scope;
const toasts = [];
Game.onEvent = (type, data) => { if (type === 'toast') toasts.push(String(data)); };

const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 320)); }
};
function newGame(seed = 19425) {
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${seed} / 4294967296; if (k === 1) return .24;
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, scope);
  assert(Game.newGame());
  return Game.s;
}
const steps = (n, input = {}) => { for (let i = 0; i < n; i++) Game.step(1 / 60, input); };
const day = () => Calendar.absoluteDays(Game.s.calendar, Game.s.time);
// Porta il calendario all'ora indicata, misurata sui minuti del calendario (1440 minuti = 1800 secondi): oggi se non è
// ancora passata, altrimenti domani. nextDay porta sempre all'ora indicata del giorno dopo.
const minutesNow = () => Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).minutes;
const advanceMinutes = m => { Game.step(1 / 60, {}, m * 1800 / 1440); steps(90); };
function atHour(hour) { advanceMinutes((hour * 60 - minutesNow() + 1440) % 1440); }
function nextDay(hour = 10) { advanceMinutes(1440 - minutesNow() + hour * 60); }
function travelTo(region) {
  for (let i = 0; i < 14 && Game.s.region !== region; i++) {
    const gate = World.route(Game.s.region, region, Game.s.campaign.stage);
    assert(gate, 'nessuna rotta verso ' + region);
    Object.assign(Game.s.player, { x: gate.x, y: gate.y }); steps(2);
    assert(Game.action('interact'), 'varco non usato: ' + gate.label);
    steps(2);
  }
  assert.equal(Game.s.region, region);
}
function toMarket(id) {
  const m = Economy.profiles.find(p => p.id === id);
  travelTo(m.region); Object.assign(Game.s.player, { x: m.x, y: m.y + 4 }); steps(2);
  if (!Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).shopOpen) atHour(10);
  const opened = Game.action('interact'); // apre il mercato e annota i prezzi
  assert(opened && Game.s.careers.seen[id]?.day === day(), 'banco del mercato non raggiunto a ' + id + ': ' + toasts.at(-1) + ' · ' + JSON.stringify(Calendar.view(Game.s.calendar, Game.s.time, Game.s.region)).slice(0, 220) + ' · giorno ' + day() + ' visto ' + JSON.stringify(Game.s.careers.seen[id]?.day));
}
const trade = (op, id, amount) => Economy.command(Game.s, { op, id, amount: String(amount) });
const stockOf = (market, id) => BigInt(Economy.quote(Game.s, market, id)?.stock ?? 0);
const gold = () => Game.s.player.gold;
const audit = () => Economy.flowReport(Game.s)?.audit || [];

check('1. LW-ECO-01: vendere e ricomprare (o comprare e rivendere) un lotto non rende mai, per ogni merce e ogni dimensione', () => {
  const s = newGame(); toMarket('vela'); s.player.gold = 5000;
  const profile = Economy.profiles.find(p => p.id === 'vela');
  let cycles = 0, oldWins = 0;
  for (const id of Object.keys(profile.goods)) {
    Inventory.add(s, id, 200);
    for (const k of [1, 2, 3, 5, 8, 12, 20, 40]) {
      const q = Economy.quote(s, 'vela', id), stock = BigInt(q.stock), room = BigInt(q.capacity) - stock;
      if (BigInt(k) <= room) {
        // Il vecchio calcolo (prezzo della scorta di partenza per tutto il lotto) avrebbe reso: k×(vendita a stock − acquisto a stock+k).
        const old = k * (q.sell - Economy.quote(s, 'vela', id, stock + BigInt(k)).buy); if (old > 0) oldWins++;
        const g0 = gold(); assert(trade('sell', id, k).ok); assert(trade('buy', id, k).ok);
        assert(gold() <= g0, `${id} ×${k}: vendita e riacquisto rendono ${gold() - g0}`); assert.equal(stockOf('vela', id), stock); cycles++;
      }
      if (BigInt(k) <= stock) {
        const g0 = gold(); assert(trade('buy', id, k).ok); assert(trade('sell', id, k).ok);
        assert(gold() <= g0, `${id} ×${k}: acquisto e rivendita rendono ${gold() - g0}`); cycles++;
      }
    }
  }
  assert.deepEqual([...audit()], []);
  return `${cycles} cicli senza guadagno; con il vecchio calcolo ${oldWins} lotti avrebbero reso`;
});

check('2. Prezzo di una unità invariato; un lotto paga ogni unità alla sua scorta', () => {
  const s = newGame(); toMarket('vela'); s.player.gold = 500;
  const q = Economy.quote(s, 'vela', 'herb'), g0 = gold();
  assert(trade('buy', 'herb', 1).ok); assert.equal(g0 - gold(), q.buy, 'una unità costa il prezzo indicato');
  const stock = stockOf('vela', 'herb'); let expected = 0;
  for (let i = 0n; i < 4n; i++) expected += Economy.quote(s, 'vela', 'herb', stock - i).buy;
  const g1 = gold(), lot = trade('buy', 'herb', 4); assert(lot.ok, lot.text); assert.equal(g1 - gold(), expected);
  return `1 unità ${q.buy}; 4 unità ${expected} (${lot.text.replace(/.*· /, '')})`;
});

check('3. Quantità enormi (oltre 2^53) rifiutate subito, senza calcoli lunghi', () => {
  const s = newGame(); toMarket('vela'); const huge = '1' + '0'.repeat(30);
  Inventory.add(s, 'herb', huge); assert.equal(Inventory.quantity(s, 'herb'), BigInt(huge));
  const t0 = Date.now(), sell = trade('sell', 'herb', huge), buy = trade('buy', 'herb', huge);
  assert.equal(sell.ok, false); assert.match(sell.text, /può accogliere ancora|pieno/); assert.equal(buy.ok, false);
  assert(Date.now() - t0 < 200, 'troppo lento');
  assert.equal(Inventory.quantity(s, 'herb'), BigInt(huge), 'quantità esatta alterata');
  return sell.text;
});

check('4. LW-ECO-02: il mercato accoglie merce solo fino al tetto del magazzino', () => {
  const s = newGame(); toMarket('vela'); Inventory.add(s, 'herb', 100);
  const q = Economy.quote(s, 'vela', 'herb'), room = BigInt(q.capacity) - BigInt(q.stock);
  const over = trade('sell', 'herb', room + 1n); assert.equal(over.ok, false); assert.match(over.text, new RegExp('ancora ' + room));
  assert(trade('sell', 'herb', room).ok); assert.equal(stockOf('vela', 'herb'), BigInt(q.capacity));
  assert.equal(trade('sell', 'herb', 1).ok, false);
  return `capacità ${q.capacity}: venduti ${room}, oltre rifiutato`;
});

check('5. LW-ECO-04 e LW-ECO-03: la qualità della lama alza il prezzo; le lame vendute ai Filoni trovano compratori, una al giorno', () => {
  const s = newGame(); toMarket('filoni');
  for (const id of ['blade-0', 'blade-1', 'blade-2', 'blade-3']) Inventory.add(s, id, 3);
  const sells = ['blade-0', 'blade-1', 'blade-2', 'blade-3'].map(id => Economy.quote(s, 'filoni', id).sell);
  assert(sells[3] > sells[0] && sells.every((v, i) => !i || v >= sells[i - 1]), 'prezzi per qualità: ' + sells.join(','));
  assert(trade('sell', 'blade-0', 3).ok); assert.equal(stockOf('filoni', 'blade-0'), 3n);
  const path = [3];
  for (let d = 0; d < 4; d++) { nextDay(); path.push(Number(stockOf('filoni', 'blade-0'))); }
  assert.deepEqual(path, [3, 2, 1, 0, 0]);
  return 'vendita per qualità ' + sells.join(' / ') + ' · lame sul banco ' + path.join('→');
});

check('6. Fabbro: ordine dell’Armeria del Passo solo con le lame che mancano davvero, una consegna al giorno, fama che alza richieste e paga', () => {
  const s = newGame(); toMarket('filoni');
  Inventory.add(s, 'blade-1', 6); Inventory.add(s, 'blade-2', 4);
  let v = Careers.view(s, 'filoni').armory; assert.equal(v.available, false); assert.match(v.why, /Praticanti/);
  s.life.xp.smith = 20; // preparazione: due o tre forgiature
  v = Careers.view(s, 'filoni').armory; assert.equal(v.available, true, v.why); assert.equal(v.blade, 'blade-1');
  const q = Economy.quote(s, 'filoni', 'blade-1'), expect = Math.max(1, Math.min(Math.round(q.sell * 1.25), q.buy - 1));
  assert.equal(v.pay, expect);
  const g0 = gold(), bench = stockOf('filoni', 'blade-1');
  assert.equal(Economy.command(s, { op: 'armoryOrder' }).ok, true);
  assert.equal(gold() - g0, expect); assert.equal(stockOf('filoni', 'blade-1'), bench + 1n); assert.equal(Inventory.quantity(s, 'blade-1'), 5n);
  assert.equal(Economy.command(s, { op: 'armoryOrder' }).ok, false, 'secondo ordine nello stesso giorno');
  // Le lame sul banco bastano: niente ordini finché gli abitanti non le comprano.
  const pays = [gold() - g0];
  trade('sell', 'blade-1', 1); assert.equal(Careers.view(s, 'filoni').armory.available, false);
  for (let d = 0; d < 6 && s.careers.smith.orders < 3; d++) {
    nextDay(); toMarket('filoni');
    const now = Careers.view(s, 'filoni').armory;
    if (!now.available) continue;
    const before = gold(), r = Economy.command(s, { op: 'armoryOrder' }); assert(r.ok, r.text); pays.push(gold() - before);
  }
  assert.equal(s.careers.smith.orders, 3);
  for (let d = 0; d < 4 && !Careers.view(s, 'filoni').armory.available; d++) { nextDay(); toMarket('filoni'); }
  v = Careers.view(s, 'filoni').armory;
  assert.equal(v.tier, 2); assert.equal(v.blade, 'blade-2', 'una lama buona non basta più'); assert.match(v.standing, /fiducia/);
  const q2 = Economy.quote(s, 'filoni', 'blade-2'); assert.equal(v.pay, Math.max(1, Math.min(Math.round(q2.sell * 1.4), q2.buy - 1)));
  assert.deepEqual([...audit()], []);
  return 'compensi ' + pays.join(', ') + ' → poi lama ottima a ' + v.pay;
});

check('7. Mercante: il taccuino conosce solo i prezzi visti di persona', () => {
  const s = newGame(); toMarket('vela');
  assert.deepEqual(Object.keys(s.careers.seen), ['vela']);
  assert.equal(Careers.view(s, 'vela').notebook.length, 0);
  toMarket('filoni');
  assert.deepEqual(Object.keys(s.careers.seen).sort(), ['filoni', 'vela']);
  const book = Careers.view(s, 'filoni').notebook;
  assert(book.every(r => r.market === Economy.profiles.find(p => p.id === 'vela').name), 'prezzi di mercati mai visti');
  assert(book.every(r => r.sell > r.buy));
  assert(!('calis' in s.careers.seen) && !('namar' in s.careers.seen));
  return book.length ? book.map(r => `${r.name}: ${r.buy}→${r.sell}`).join('; ') : 'nessuna merce più cara a Vela';
});

check('8. Mercante: contratti del Registro dei Carichi a Calis sulla merce che manca; una consegna al giorno; carichi più grandi da socio', () => {
  const s = newGame(); toMarket('calis');
  let v = Careers.view(s, 'calis').cargo; assert.equal(v.available, false);
  s.life.xp.merchant = 20; // preparazione: alcuni scambi
  for (let d = 0; d < 8 && !Careers.view(s, 'calis').cargo.good; d++) nextDay();
  v = Careers.view(s, 'calis').cargo; assert(v.good, 'a Calis non manca nulla');
  Inventory.add(s, v.good, 30);
  v = Careers.view(s, 'calis').cargo; assert.equal(v.available, true, v.why); assert.equal(v.size, 3);
  const g0 = gold(), stock = stockOf('calis', v.good);
  const first = Economy.command(s, { op: 'cargoContract' }); assert(first.ok, first.text);
  assert.equal(gold() - g0, v.pay); assert.equal(stockOf('calis', v.good), stock + 3n);
  assert.equal(Economy.command(s, { op: 'cargoContract' }).ok, false, 'secondo contratto nello stesso giorno');
  for (let d = 0; d < 10 && s.careers.merchant.contracts < 3; d++) {
    nextDay(); toMarket('calis'); const now = Careers.view(s, 'calis').cargo;
    if (!now.good) continue; Inventory.add(s, now.good, 10);
    if (Careers.view(s, 'calis').cargo.available) { const r = Economy.command(s, { op: 'cargoContract' }); assert(r.ok, r.text); }
  }
  assert.equal(s.careers.merchant.contracts, 3);
  assert.equal(Careers.view(s, 'calis').cargo.size, 6); assert.match(Careers.view(s, 'calis').cargo.standing, /Socio/);
  assert.deepEqual([...audit()], []);
  return `primo contratto ${v.size} ${v.goodName} per ${v.pay} Scintille; da socio carichi da 6`;
});

check('9. Salvataggio, ripristino e salvataggi senza `careers` o danneggiati', () => {
  const s = newGame(); toMarket('vela'); toMarket('filoni'); s.life.xp.smith = 20; Inventory.add(s, 'blade-1', 2); Economy.command(s, { op: 'armoryOrder' });
  const before = JSON.stringify(s.careers);
  assert(Game.save() && Game.load()); assert.equal(JSON.stringify(Game.s.careers), before);
  const save = JSON.parse(Game.exportSave());
  delete save.careers; assert(Game.importSave(JSON.stringify(save))); assert.equal(Game.s.careers.smith.orders, 0);
  for (const broken of [7, { schema: 1, smith: { orders: -3 }, seen: { atlantide: { day: 0, prices: {} }, vela: { day: 0, prices: { herb: [3, 2], x: 'no' } } } }]) {
    save.careers = broken; assert(Game.importSave(JSON.stringify(save)), 'salvataggio rifiutato');
  }
  assert.equal(Game.s.careers.smith.orders, 0); assert.deepEqual(Object.keys(Game.s.careers.seen), ['vela']); assert.equal(JSON.stringify(Game.s.careers.seen.vela.prices), '{"herb":[3,2]}');
  return before.length + ' byte; voci non valide scartate';
});

check('10. Determinismo: stesse azioni, stesso seme → stesso stato dei mestieri, del mercato e del borsello', () => {
  const run = () => { const s = newGame(555); toMarket('filoni'); s.life.xp.smith = 20; Inventory.add(s, 'blade-1', 3); Economy.command(s, { op: 'armoryOrder' });
    trade('sell', 'blade-1', 1); nextDay(); toMarket('filoni'); Economy.command(s, { op: 'armoryOrder' });
    return JSON.stringify(s.careers) + '|' + gold() + '|' + JSON.stringify(s.economy.markets.filoni.stock); };
  const a = run(), b = run(); assert.equal(a, b);
  return a.length + ' caratteri identici';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
