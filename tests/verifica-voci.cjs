// Voci e fama regionale (Living World 2.0, incremento 5), motore reale in Node senza browser.
// Uso:   node tests/verifica-voci.cjs        (ONLY=2,4 per eseguire solo alcuni passi)
// Controlla: le notizie viaggiano lungo le rotte commerciali con i loro giorni (nessuno le conosce prima che arrivino), ogni
// continente le pesa con le proprie regole, la fama decade, una notizia nata lontano arriva a Vela e Ivo o Tessa la
// ricordano «per sentito dire» (e l'opinione cambia), la parola mancata rende malvisti, salvataggio e ripristino, salvataggi
// senza `renown` o danneggiati, determinismo. Azioni vere (consegna a Tessa, ordine dell'armeria, contratto di Calis, viaggi
// da varco a varco); preparazioni dichiarate: merci ed esperienza di mestiere aggiunte, giorni fatti passare dal motore.
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
const { Game, World, Inventory, Economy, Calendar, Renown, WorldMemory, Careers } = scope;
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
    const gate = World.route(Game.s.region, region, Game.s.campaign.stage); assert(gate, 'nessuna rotta verso ' + region);
    Object.assign(Game.s.player, { x: gate.x, y: gate.y }); steps(2); assert(Game.action('interact'), 'varco: ' + gate.label); steps(2);
  }
  assert.equal(Game.s.region, region);
}
function toMarket(id) {
  const m = Economy.profiles.find(p => p.id === id); travelTo(m.region); Object.assign(Game.s.player, { x: m.x, y: m.y + 4 }); steps(2);
  if (!Calendar.view(Game.s.calendar, Game.s.time, Game.s.region).shopOpen) { atHour(10); Object.assign(Game.s.player, { x: m.x, y: m.y + 4 }); steps(2); }
}
const realm = id => Renown.view(Game.s).find(r => r.market === id);
function helpTessa() { // consegna vera durante la carenza (preparazione: erbe nel borsello, carenza creata da altri compratori)
  const s = Game.s, t = World.points.merchant; if (s.region !== 'valley') travelTo('valley');
  Object.assign(s.player, { x: t.x + 14, y: t.y + 20 }); steps(2);
  const q = Economy.quote(s, 'vela', 'herb'); if (BigInt(q.stock) >= BigInt(q.target) - 2n) Economy.procure(s, 'vela', 'herb', BigInt(q.stock) - BigInt(q.target) + 4n);
  Inventory.add(s, 'herb', 3); assert(Game.command('tieGive'), toasts.at(-1));
}

check('1. Tempi di viaggio delle notizie dalle rotte commerciali (giorni delle carovane)', () => {
  newGame(); const d = { id: 0, day: 0, market: 'vela' }, f = { day: 0, market: 'filoni' };
  const vela = ['vela', 'filoni', 'velaris', 'namar', 'calis'].map(m => Renown.arrival(d, m)), from = Renown.arrival(f, 'calis');
  assert.deepEqual([...vela], [0, 2, 3, 2, 3]); assert.equal(from, 5);
  return 'da Vela: ' + vela.join('/') + ' giorni · Filoni→Calis ' + from;
});

check('2. Un aiuto a Vela è noto subito in Vaelthoria e arriva negli altri continenti solo dopo il viaggio', () => {
  const s = newGame(); helpTessa();
  assert.equal(realm('vela').level, 'Se ne parla'); assert.equal(realm('filoni').level, 'Sconosciuto'); assert.equal(realm('filoni').known.length, 0);
  assert.match(realm('filoni').coming[0].text, /erbe/); assert.equal(realm('filoni').coming[0].day, day() + 3);
  nextDay(); assert.equal(realm('filoni').known.length, 0, 'notizia arrivata in anticipo');
  nextDay(); assert.equal(realm('filoni').known.length, 1); assert.equal(realm('calis').known.length, 0);
  nextDay(); assert.equal(realm('calis').known.length, 1);
  return `Vaelthoria ${realm('vela').score}, Nordharyn ${realm('filoni').score}, Azheryon ${realm('calis').score}`;
});

check('3. Regole regionali: la stessa impresa da fabbro vale di più a Nordharyn che a Vaelthoria e ad Azheryon', () => {
  const s = newGame(); toMarket('filoni'); s.life.xp.smith = 20; Inventory.add(s, 'blade-1', 2);
  const r = Economy.command(s, { op: 'armoryOrder' }); assert(r.ok, r.text);
  for (let i = 0; i < 5; i++) nextDay();
  const nord = realm('filoni').score, vael = realm('vela').score, azh = realm('calis').score;
  // Pesi: forgia 3 a Nordharyn, 1 altrove; la notizia arriva in giorni diversi, quindi il decadimento differisce di poco.
  assert(nord > 2 * vael && nord > 2 * azh && vael > 0 && azh > 0, `${nord} / ${vael} / ${azh}`);
  return `Nordharyn ${nord} (${realm('filoni').level}), Vaelthoria ${vael}, Azheryon ${azh}`;
});

check('4. Una voce da Nordharyn arriva a Vela dopo due giorni: Ivo la ricorda «per sentito dire», non prima', () => {
  const s = newGame(); toMarket('filoni'); s.life.xp.smith = 20; Inventory.add(s, 'blade-1', 2);
  const start = day(); assert(Economy.command(s, { op: 'armoryOrder' }).ok);
  const heard = () => s.memory.episodes.filter(e => e.npc === 'smith' && e.kind === 'heard-praise');
  nextDay(); assert.equal(heard().length, 0, 'Ivo lo sa prima che la notizia arrivi');
  nextDay(); assert.equal(heard().length, 1); assert.equal(heard()[0].source, 'rumor'); assert.equal(heard()[0].day, start + 2);
  assert(toasts.some(t => /A Vela arriva una voce da Nordharyn · Ivo ne ha sentito parlare/.test(t)));
  assert(s.memory.episodes.every(e => !(e.npc === 'merchant' && e.kind === 'heard-praise')), 'Tessa non si interessa delle notizie di forgia');
  return 'voce arrivata il giorno ' + (heard()[0].day + 1) + ', opinione di Ivo ' + WorldMemory.opinion(s, 'smith');
});

check('5. Un contratto a Calis cambia, tre giorni dopo, ciò che Tessa pensa di te a Vela', () => {
  const s = newGame(); toMarket('calis'); s.life.xp.merchant = 20;
  for (let d = 0; d < 8 && !Careers.view(s, 'calis').cargo.good; d++) nextDay();
  const v = Careers.view(s, 'calis').cargo; Inventory.add(s, v.good, 6);
  const before = WorldMemory.opinion(s, 'merchant'); assert(Economy.command(s, { op: 'cargoContract' }).ok);
  nextDay(); nextDay(); assert.equal(WorldMemory.opinion(s, 'merchant'), before);
  nextDay(); assert(WorldMemory.opinion(s, 'merchant') > before);
  return `opinione di Tessa ${before} → ${WorldMemory.opinion(s, 'merchant')}`;
});

check('6. La parola mancata rende malvisti, prima a Vaelthoria e poi altrove; la fama decade col tempo', () => {
  const s = newGame(); travelTo('valley'); const t = World.points.merchant; Object.assign(s.player, { x: t.x + 14, y: t.y + 20 }); steps(2);
  const q = Economy.quote(s, 'vela', 'herb'); Economy.procure(s, 'vela', 'herb', BigInt(q.stock));
  assert(Game.command('tiePromise')); nextDay(); nextDay(); nextDay();
  assert.equal(realm('vela').level, 'Malvisto'); const first = realm('vela').score;
  for (let i = 0; i < 20; i++) nextDay();
  const later = realm('vela').score; assert(later > first && Math.abs(later / first - .5) < .1, `${first} → ${later}`);
  assert(s.memory.episodes.some(e => e.npc === 'elder' && e.kind === 'heard-blame') === false, 'la parola mancata a Vela non è una voce per Vela');
  return `Vaelthoria ${first} → ${later} dopo 20 giorni; Azheryon ${realm('calis').level}`;
});

check('7. Una sola impresa per tipo e luogo nello stesso giorno; al massimo 40 notizie conservate', () => {
  const s = newGame();
  for (let i = 0; i < 3; i++) Renown.deed(s, { kind: 'craft', market: 'filoni', text: 'Prova' });
  assert.equal(s.renown.deeds.length, 1);
  for (let i = 0; i < 50; i++) { Renown.deed(s, { kind: 'commerce', market: 'calis', text: 'Carico ' + i }); nextDay(); }
  assert.equal(s.renown.deeds.length, 40);
});

check('8. Salvataggio, ripristino e salvataggi senza `renown` o danneggiati', () => {
  const s = newGame(); helpTessa(); nextDay();
  const before = JSON.stringify(s.renown);
  assert(Game.save() && Game.load()); assert.equal(JSON.stringify(Game.s.renown), before);
  const save = JSON.parse(Game.exportSave());
  delete save.renown; assert(Game.importSave(JSON.stringify(save))); assert.equal(Game.s.renown.deeds.length, 0);
  save.renown = { schema: 1, seq: 3, deeds: [{ id: 1, kind: 'craft', sign: 1, market: 'filoni', day: 0, text: 'ok', heard: false }, { id: 2, kind: 'magia', sign: 1, market: 'atlantide', day: 0, text: 'no', heard: false }, { id: 3, kind: 'craft', sign: 5, market: 'vela', day: 0, text: 'no', heard: true }] };
  assert(Game.importSave(JSON.stringify(save))); assert.equal(Game.s.renown.deeds.length, 1);
  return before.length + ' byte; voci non valide scartate';
});

check('9. Determinismo: stesse azioni, stesso seme → stesse voci e stessi ricordi', () => {
  const run = () => { const s = newGame(555); helpTessa(); toMarket('filoni'); s.life.xp.smith = 20; Inventory.add(s, 'blade-1', 2); Economy.command(s, { op: 'armoryOrder' });
    for (let i = 0; i < 4; i++) nextDay(); return JSON.stringify(s.renown) + '|' + JSON.stringify(s.memory.episodes) + '|' + JSON.stringify(Renown.view(s).map(r => r.score)); };
  const a = run(), b = run(); assert.equal(a, b);
  return a.length + ' caratteri identici';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
