// Regressioni della revisione incrociata (Living World 2.0, incremento 6), motore reale in Node senza browser.
// Uso:   node tests/verifica-revisione-lw.cjs        (ONLY=1,5 per eseguire solo alcuni passi)
// Un controllo per ogni difetto confermato dai revisori e corretto (codici rev-LW6-* nei sorgenti e in LIVING_WORLD.md):
// E1 lama equipaggiata consegnata all'armeria (salvataggio non più caricabile), E4 richiesta scaduta ancora riscuotibile,
// E5 merce distrutta all'annullamento di un contratto, M1 NPC morto che sente le voci, M2 colpa al giocatore se chi ha
// chiesto muore, M3 ricordi di una persona che cancellano quelli delle altre, M5 promessa rotta mentre Tessa è in stato
// critico, M6 voce falsa da un salvataggio modificato. Preparazioni dichiarate: esperienza di mestiere, merci e lame aggiunte,
// salvataggi modificati con importSave, ferite inflitte con Conflicts.damageNpc, un magazzino quasi pieno simulato.
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
const { Game, World, Inventory, Economy, Calendar, Requests, WorldMemory, Conflicts, Renown, Careers } = scope;
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
const minutesNow = () => Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).minutes;
const advanceMinutes = m => { Game.step(1 / 60, {}, m * 1800 / 1440); steps(90); };
const atHour = hour => advanceMinutes((hour * 60 - minutesNow() + 1440) % 1440);
const nextDay = (hour = 10) => advanceMinutes(1440 - minutesNow() + hour * 60);
function travelTo(region) {
  for (let i = 0; i < 14 && Game.s.region !== region; i++) {
    const gate = World.route(Game.s.region, region, Game.s.campaign.stage);
    assert(gate, 'nessuna rotta verso ' + region);
    Object.assign(Game.s.player, { x: gate.x, y: gate.y }); steps(2);
    assert(Game.action('interact'), 'varco non usato: ' + gate.label); steps(2);
  }
  assert.equal(Game.s.region, region);
}
const view = id => Requests.view(Game.s).find(r => r.id === id);
const req = (op, id) => Game.command('requests', { op, id });
const nearIvo = () => { const t = World.points.smith; Object.assign(Game.s.player, { x: t.x + 12, y: t.y + 16 }); steps(2); };
const away = () => { Object.assign(Game.s.player, { x: World.spawn.x - 160, y: World.spawn.y }); steps(2); };
const toMarket = id => {
  const m = Economy.profiles.find(p => p.id === id);
  travelTo(m.region); Object.assign(Game.s.player, { x: m.x, y: m.y + 4 }); steps(2);
  if (!Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).shopOpen) { atHour(10); Object.assign(Game.s.player, { x: m.x, y: m.y + 4 }); steps(2); }
};
const kill = id => {
  Conflicts.damageNpc(Game.s, id, 9999, { cause: 'Prova', point: { region: 'valley', x: World.points[id].x, y: World.points[id].y } });
  away(); for (let i = 0; i < 8 && Conflicts.condition(Game.s, id).status !== 'dead'; i++) steps(60 * 20);
  assert.equal(Conflicts.condition(Game.s, id).status, 'dead');
};
const reload = mutate => { const save = JSON.parse(Game.exportSave()); mutate(save); assert(Game.importSave(JSON.stringify(save)), 'salvataggio rifiutato'); return Game.s; };

check('1. E1 · Armeria: la lama equipaggiata non si consegna e il salvataggio resta caricabile', () => {
  const s = newGame(); toMarket('filoni'); s.life.xp.smith = 20;
  Inventory.add(s, 'blade-1', 1); s.workshop.weapon = 'blade-1';
  const r = Economy.command(s, { op: 'armoryOrder' });
  assert.equal(r.ok, false, 'consegnata la lama equipaggiata'); assert.match(r.text, /equipaggiata/);
  assert.equal(Inventory.quantity(s, 'blade-1'), 1n);
  assert(Game.save() && Game.load(), 'salvataggio non più caricabile');
  Game.s.workshop.weapon = null;
  const ok = Economy.command(Game.s, { op: 'armoryOrder' }); assert(ok.ok, ok.text);
  assert(Game.save() && Game.load());
  return r.text + ' · tolta la lama: ' + ok.text;
});

check('2. E4 · Una richiesta già scaduta (salvataggio caricato prima dell’impulso) non si riscuote', () => {
  newGame(); nextDay(); nextDay(); nextDay();
  const s = reload(save => { save.requests = { schema: 1, offered: {}, claimed: {}, done: {}, active: { 'wool-cloaks': { day: 0, until: 2, progress: 0 } } }; });
  assert.equal(day(), 3); assert.deepEqual(Object.keys(s.requests.active), ['wool-cloaks']);
  Inventory.add(s, 'wool', 2); nearIvo();
  assert.equal(view('wool-cloaks').state, 'expired');
  const gold = s.player.gold;
  assert.equal(Requests.command(s, { op: 'claim', id: 'wool-cloaks' }).ok, false);
  assert.equal(s.player.gold, gold); assert.equal(Inventory.quantity(s, 'wool'), 2n);
  steps(60 * 8); // l'impulso chiude la richiesta
  assert.deepEqual(Object.keys(s.requests.active), []);
  return 'stato «Scaduta», nessun compenso, chiusa dall’impulso';
});

check('3. E5 · Contratto del Registro annullato per magazzino pieno: tutta la merce torna nello zaino', () => {
  const s = newGame(); toMarket('calis'); s.life.xp.merchant = 20;
  for (let d = 0; d < 8 && !Careers.view(s, 'calis').cargo.good; d++) { nextDay(); toMarket('calis'); }
  const v = Careers.view(s, 'calis').cargo; assert(v.good, 'a Calis non manca nulla');
  Inventory.add(s, v.good, 6);
  const bag = Inventory.quantity(s, v.good), stock = BigInt(Economy.quote(s, 'calis', v.good).stock);
  const deliver = Economy.deliver;
  Economy.deliver = (st, m, g, n) => deliver(st, m, g, n > 1n ? 1n : n); // magazzino che accoglie una sola unità
  let r; try { r = Economy.command(s, { op: 'cargoContract' }); } finally { Economy.deliver = deliver; }
  assert.equal(r.ok, false);
  assert.equal(Inventory.quantity(s, v.good), bag, 'merce distrutta'); assert.equal(BigInt(Economy.quote(s, 'calis', v.good).stock), stock);
  return `${v.goodName}: zaino ${bag}→${Inventory.quantity(s, v.good)}, magazzino ${stock}→${Economy.quote(s, 'calis', v.good).stock}`;
});

check('4. M1 · Nerea morta non sente più le voci dagli altri continenti', () => {
  const s = newGame(); kill('elder');
  Renown.deed(s, { kind: 'community', market: 'namar', text: 'Prova di voce lontana' });
  for (let i = 0; i < 4; i++) nextDay();
  assert.equal(s.memory.episodes.filter(e => e.npc === 'elder').length, 0);
  assert(s.renown.deeds[0].heard, 'la voce non è arrivata a Vela');
  assert.equal(WorldMemory.note(s, 'elder', 'heard-praise'), false);
  return 'voce arrivata a Vela, nessun ricordo per Nerea';
});

check('5. M2 · Ivo muore durante «Lana per le mantelle»: la richiesta si scioglie senza colpa né cattiva fama', () => {
  const s = newGame(); nearIvo();
  assert.equal(req('accept', 'wool-cloaks'), true, toasts.at(-1));
  kill('smith');
  for (let i = 0; i < 4; i++) nextDay();
  assert.deepEqual(Object.keys(s.requests.active), []);
  assert.equal(s.memory.episodes.some(e => e.kind === 'request-failed'), false);
  assert.equal(s.renown.deeds.some(d => d.sign < 0), false);
  assert(toasts.some(t => /Richiesta annullata · Lana per le mantelle/.test(t)), toasts.slice(-4).join(' | '));
  return toasts.find(t => /Richiesta annullata/.test(t));
});

check('6. M3 · I ricordi di una persona non cancellano quelli delle altre (20 a testa, 60 in tutto)', () => {
  const s = newGame(); for (let i = 0; i < 9; i++) nextDay();
  WorldMemory.note(s, 'elder', 'heard-praise', { day: 0 });
  const kinds = ['shortage-help', 'promise-kept', 'saw-help', 'heard-praise', 'heard-blame'];
  for (let d = 1; d <= day(); d++) for (const k of kinds) WorldMemory.note(s, 'merchant', k, { day: d });
  const count = id => s.memory.episodes.filter(e => e.npc === id).length;
  assert.equal(count('elder'), 1); assert.equal(count('merchant'), 20);
  const r = reload(save => { save.memory.episodes = [...save.memory.episodes, ...Array.from({ length: 70 }, (_, i) => ({ npc: 'smith', kind: ['request-kept', 'saw-request', 'heard-praise', 'heard-blame'][i % 4], day: Math.floor(i / 4) % 10, source: 'self' }))]; });
  assert.equal(r.memory.episodes.filter(e => e.npc === 'elder').length, 1, 'il ripristino cancella i ricordi di Nerea');
  assert(r.memory.episodes.length <= 60);
  return `Tessa ${count('merchant')}, Nerea ${count('elder')}; dopo il ripristino ${r.memory.episodes.length} ricordi, Nerea ancora presente`;
});

check('7. M5 · Promessa che scade mentre Tessa è in stato critico: sciolta senza colpa', () => {
  newGame(); nextDay(); nextDay();
  const s = reload(save => { save.memory.promise = { npc: 'merchant', item: 'herb', need: 3, given: 0, day: 0, due: 1 }; });
  Conflicts.damageNpc(s, 'merchant', 9999, { cause: 'Prova', point: { region: 'valley', x: World.points.merchant.x, y: World.points.merchant.y } });
  assert.equal(Conflicts.condition(s, 'merchant').status, 'critical');
  const news = WorldMemory.tick(s);
  assert.match(news.join(' '), /sciolta/); assert.equal(s.memory.promise, null);
  assert.equal(s.memory.episodes.some(e => e.kind === 'promise-broken'), false);
  assert.equal(s.renown.deeds.some(d => d.sign < 0), false);
  return news.join(' ');
});

check('8. M6 · Un’impresa di Vela non torna a Vela come «voce», anche da un salvataggio modificato', () => {
  newGame(); nextDay();
  const s = reload(save => { save.renown = { schema: 1, seq: 1, deeds: [{ id: 1, kind: 'community', sign: 1, market: 'vela', day: 0, text: 'Prova', heard: false }] }; });
  assert.equal(s.renown.deeds[0].heard, true);
  nextDay(); assert.equal(s.memory.episodes.some(e => e.kind === 'heard-praise'), false);
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
