// Richieste del mondo (Living World 2.0, incremento 3), motore reale in Node senza browser.
// Uso:   node tests/verifica-richieste.cjs        (ONLY=2,7 per eseguire solo alcuni passi)
// Tre eventi contestuali: «Lana per le mantelle» (Ivo, carenza di lana a Vela o stagione fredda), «Gli attrezzi della squadra»
// (gilda, fabbro Praticante, due lavori alla forgia), «Erbe per la cambusa» (Calis, carenza reale di erbe, 3 erbe consegnate al Registro dei Carichi).
// Controlla: condizioni verificabili, offerta stabile per tutta la giornata, accettazione e riscossione solo presso la fonte,
// nessun doppio pagamento, pausa prima di ripresentarsi, scadenza con conseguenza, merci al mercato con il registro in pari,
// memoria di Ivo e dei testimoni, reputazione, salvataggio e ripristino, salvataggi senza `requests` o danneggiati,
// determinismo. Viaggi veri da varco a varco. Preparazioni dichiarate: lana, erbe ed esperienza di mestiere aggiunte,
// durabilità consumata prima della riparazione, scorte prelevate da altri compratori (Economy.procure) per creare la carenza.
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
const { Game, World, Inventory, Economy, Calendar, Requests, WorldMemory, Conflicts } = scope;
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
const audit = () => Economy.flowReport(Game.s)?.audit || [];
const standing = id => Game.s.reputation?.standings?.[id] ?? 0;

check('1. Partita nuova: stato valido, tre richieste con le loro condizioni', () => {
  const s = newGame();
  assert.equal(s.requests.schema, 1);
  const list = Requests.view(s);
  assert.equal(JSON.stringify(list.map(r => r.id)), JSON.stringify(['wool-cloaks', 'guild-tools', 'galley-herbs']));
  const wool = list[0], tools = list[1];
  assert.equal(wool.state, 'open', 'la lana manca a Vela: ' + wool.why); assert.equal(tools.state, 'closed'); assert.match(tools.why, /gilda/);
  return `lana a Vela ${Economy.quote(s, 'vela', 'wool').stock}/${Economy.quote(s, 'vela', 'wool').target} → «${wool.name}» ${wool.reward} Scintille; cambusa: ${list[2].state}`;
});

check('2. Offerta stabile per tutta la giornata, poi di nuovo legata alle condizioni', () => {
  const s = newGame(); assert.equal(view('wool-cloaks').state, 'open');
  Economy.deliver(s, 'vela', 'wool', 6); // la lana non manca più
  assert.equal(view('wool-cloaks').state, 'open', 'l’offerta del giorno è sparita');
  nextDay(); assert.equal(view('wool-cloaks').state, 'closed', 'offerta ancora aperta senza carenza né freddo');
  return view('wool-cloaks').why;
});

check('3. Lana per le mantelle: accettazione e riscossione solo da Ivo; merce al mercato, memoria, reputazione, nessun doppio pagamento', () => {
  const s = newGame(); away();
  assert.equal(req('accept', 'wool-cloaks'), false, 'accettata lontano da Ivo');
  nearIvo(); assert.equal(req('accept', 'wool-cloaks'), true, toasts.at(-1));
  assert.equal(req('accept', 'wool-cloaks'), false, 'accettata due volte');
  assert.equal(view('wool-cloaks').state, 'active');
  Inventory.add(s, 'wool', 3); assert.equal(view('wool-cloaks').state, 'ready');
  away(); assert.equal(req('claim', 'wool-cloaks'), false, 'riscossa lontano da Ivo');
  nearIvo();
  const gold = s.player.gold, stock = BigInt(Economy.quote(s, 'vela', 'wool').stock), reward = view('wool-cloaks').reward, rep = standing('town:valley');
  assert(reward >= 15 && reward <= 40);
  assert.equal(req('claim', 'wool-cloaks'), true, toasts.at(-1));
  assert.equal(s.player.gold, gold + reward); assert.equal(Inventory.quantity(s, 'wool'), 1n);
  assert.equal(BigInt(Economy.quote(s, 'vela', 'wool').stock), stock + 2n, 'la lana non è arrivata al mercato');
  assert(s.memory.episodes.some(e => e.npc === 'smith' && e.kind === 'request-kept'), 'Ivo non ricorda');
  assert(standing('town:valley') > rep, 'reputazione del borgo invariata');
  assert.equal(req('claim', 'wool-cloaks'), false, 'pagata due volte');
  assert.equal(view('wool-cloaks').state, 'rest');
  assert.deepEqual([...audit()], []);
  const seen = s.memory.episodes.filter(e => e.kind === 'saw-request').map(e => e.npc);
  return `+${reward} Scintille, lana a Vela ${stock}→${stock + 2n}, testimoni: ${seen.join(', ') || 'nessuno'}`;
});

check('4. Pausa: la stessa richiesta non si ripresenta per sei giorni anche se la lana manca', () => {
  const s = newGame(); nearIvo(); req('accept', 'wool-cloaks'); Inventory.add(s, 'wool', 2); req('claim', 'wool-cloaks');
  const states = [];
  for (let d = 0; d < 7; d++) { nextDay(); const q = Economy.quote(s, 'vela', 'wool'); if (BigInt(q.stock) >= 3n) Economy.procure(s, 'vela', 'wool', BigInt(q.stock) - 2n); states.push(view('wool-cloaks').state); }
  assert.deepEqual(states.slice(0, 5), ['rest', 'rest', 'rest', 'rest', 'rest']); assert.equal(states.at(-1), 'open');
  return states.join(' → ');
});

check('5. Scadenza: niente compenso, Ivo se ne ricorda, la richiesta va in pausa', () => {
  const s = newGame(); nearIvo(); assert.equal(req('accept', 'wool-cloaks'), true);
  const gold = s.player.gold; nextDay(); nextDay(); nextDay();
  assert(toasts.some(t => /Richiesta scaduta · Lana per le mantelle/.test(t)), toasts.slice(-3).join(' | '));
  assert.equal(s.player.gold, gold); assert(s.memory.episodes.some(e => e.npc === 'smith' && e.kind === 'request-failed'));
  assert.equal(view('wool-cloaks').state, 'rest');
  return 'opinione di Ivo ' + WorldMemory.opinion(s, 'smith');
});

check('6. Ivo morto: la richiesta non si apre più', () => {
  const s = newGame();
  Conflicts.damageNpc(s, 'smith', 9999, { cause: 'Prova', point: { region: 'valley', x: World.points.smith.x, y: World.points.smith.y } });
  away(); for (let i = 0; i < 8 && Conflicts.condition(s, 'smith').status !== 'dead'; i++) steps(60 * 20);
  assert.equal(Conflicts.condition(s, 'smith').status, 'dead'); nextDay();
  assert.equal(view('wool-cloaks').state, 'closed'); assert.match(view('wool-cloaks').why, /Ivo non c’è più/);
});

check('7. Gli attrezzi della squadra: iscrizione alla gilda e fabbro Praticante; due riparazioni vere alla forgia; riscossione al Registro', () => {
  const s = newGame(); const board = Game.actors ? null : null;
  const boardPoint = scope.Guild.sites(s).find(x => x.id === 'board').point;
  Object.assign(s.player, { x: boardPoint.x, y: boardPoint.y + 6 }); steps(2);
  assert(Game.command('guild', { op: 'join' }), toasts.at(-1));
  assert.equal(view('guild-tools').state, 'closed'); s.life.xp.smith = 20;
  assert.equal(view('guild-tools').state, 'open', view('guild-tools').why);
  assert.equal(req('accept', 'guild-tools'), true, toasts.at(-1));
  // Due lavori veri alla forgia: riparazione di un pezzo consumato (durabilità ridotta come preparazione).
  const forge = World.points.smith; Object.assign(s.player, { x: forge.x - 14, y: forge.y + 16 }); steps(2);
  const piece = Object.keys(s.gear.items)[0]; assert(piece, 'nessun pezzo di equipaggiamento');
  let done = 0;
  for (let i = 0; i < 2; i++) {
    s.gear.items[piece].current = 1; Inventory.add(s, 'ore', 4); s.player.gold += 40;
    if (Game.command('gear', { op: 'repair', id: piece })) done++;
  }
  assert.equal(done, 2, 'riparazioni non riuscite: ' + toasts.slice(-2).join(' | '));
  assert.equal(view('guild-tools').state, 'ready');
  assert.equal(req('claim', 'guild-tools'), false, 'riscossa lontano dal Registro');
  Object.assign(s.player, { x: boardPoint.x, y: boardPoint.y + 6 }); steps(2);
  const gold = s.player.gold; assert.equal(req('claim', 'guild-tools'), true, toasts.at(-1)); assert.equal(s.player.gold, gold + 24);
  assert.equal(req('claim', 'guild-tools'), false);
  return 'riparazioni 2/2, +24 Scintille';
});

check('8. Erbe per la cambusa: carenza reale a Calis, 3 erbe consegnate al Registro dei Carichi (non basta rivendere all’Emporio)', () => {
  const s = newGame();
  travelTo('city-calis'); // quartiere del porto: il Registro dei Carichi è all'aperto, l'Emporio è un interno
  const short = Economy.shortage(s, 'calis', 'herb');
  if (short < .4) { const q = Economy.quote(s, 'calis', 'herb'); Economy.procure(s, 'calis', 'herb', BigInt(q.stock)); } // altri compratori
  const board = scope.UrbanWorld.site(s, 'cargo-board'); assert(board, 'Registro dei Carichi non trovato');
  Object.assign(s.player, { x: board.point.x, y: board.point.y + 4 }); steps(2);
  assert.equal(view('galley-herbs').state, 'open', view('galley-herbs').why);
  assert.equal(req('accept', 'galley-herbs'), true, toasts.at(-1));
  // Una vendita all'Emporio non basta più (rev-LW6-E2: si potevano rivendere erbe appena comprate allo stesso banco).
  travelTo('city-calis-tide-market');
  const shop = scope.UrbanWorld.site(s, 'shop'); assert(shop, 'banco dell’Emporio non trovato');
  Object.assign(s.player, { x: shop.point.x, y: shop.point.y + 4 }); steps(2);
  if (!Calendar.view(s.calendar, s.time, s.region).shopOpen) { atHour(10); Object.assign(s.player, { x: shop.point.x, y: shop.point.y + 4 }); steps(2); }
  Inventory.add(s, 'herb', 3);
  assert(Game.command('economy', { op: 'sell', id: 'herb', amount: '3' }), 'vendita non riuscita: ' + toasts.at(-1));
  assert.equal(view('galley-herbs').state, 'active', 'una vendita all’Emporio completa ancora la richiesta');
  // Consegna vera: 3 erbe portate al Registro (preparazione dichiarata: erbe aggiunte, raccolte altrove).
  Inventory.add(s, 'herb', 3);
  travelTo('city-calis'); Object.assign(s.player, { x: board.point.x, y: board.point.y + 4 }); steps(2);
  assert.equal(view('galley-herbs').state, 'ready');
  const before = BigInt(Economy.quote(s, 'calis', 'herb').stock), pay = view('galley-herbs').reward, buy = Economy.quote(s, 'calis', 'herb').buy;
  const gold = s.player.gold; assert.equal(req('claim', 'galley-herbs'), true, toasts.at(-1)); assert.equal(s.player.gold, gold + pay);
  assert(pay <= 16 && pay < 3 * buy, `compenso ${pay} contro acquisto ${3 * buy}`);
  assert.equal(String(Inventory.quantity(s, 'herb')), '0'); assert.equal(BigInt(Economy.quote(s, 'calis', 'herb').stock), before + 3n);
  assert.deepEqual([...audit()], []);
  return 'carenza ' + Math.round(short * 100) + '%, vendita all’Emporio ignorata, consegna al Registro +' + pay + ' Scintille, scorta ' + before + '→' + (before + 3n);
});

check('11. Nessun guadagno «compra al banco e consegna»: lana di Vela e erbe di Calis comprate costano più del compenso', () => {
  const out = [];
  for (const [id, market, n] of [['wool-cloaks', 'vela', 2], ['galley-herbs', 'calis', 3]]) {
    for (const seed of [19425, 7, 555]) {
      const s = newGame(seed), item = id === 'wool-cloaks' ? 'wool' : 'herb';
      if (market === 'calis') { const k = BigInt(Economy.quote(s, 'calis', 'herb').stock) - 2n; if (k > 0n) Economy.procure(s, 'calis', 'herb', k); }
      const q = Economy.quote(s, market, item), pay = view(id).reward;
      assert(pay < n * q.buy, `${id} seme ${seed}: compenso ${pay} contro ${n}×${q.buy}`);
      out.push(`${id} ${pay}<${n * q.buy}`);
    }
  }
  return out.join(', ');
});

check('9. Salvataggio e ripristino; salvataggi senza `requests` o danneggiati', () => {
  const s = newGame(); nearIvo(); req('accept', 'wool-cloaks');
  const before = JSON.stringify(s.requests);
  assert(Game.save() && Game.load()); assert.equal(JSON.stringify(Game.s.requests), before);
  const save = JSON.parse(Game.exportSave());
  delete save.requests; assert(Game.importSave(JSON.stringify(save))); assert.equal(JSON.stringify(Game.s.requests.active), '{}');
  save.requests = { schema: 1, active: { 'wool-cloaks': { day: 0, until: 2, progress: 0 }, ignota: { day: 0, until: 1, progress: 0 } }, claimed: { 'wool-cloaks': 99999 }, offered: 'x', done: { 'guild-tools': -1 } };
  assert(Game.importSave(JSON.stringify(save)), 'salvataggio rifiutato');
  assert.deepEqual(Object.keys(Game.s.requests.active), ['wool-cloaks']); assert.equal(JSON.stringify(Game.s.requests.claimed), '{}');
  return before.length + ' byte; voci non valide scartate';
});

check('10. Determinismo: stesse azioni, stesso seme → stesso stato', () => {
  const run = () => { const s = newGame(555); nearIvo(); req('accept', 'wool-cloaks'); Inventory.add(s, 'wool', 2); req('claim', 'wool-cloaks'); nextDay(); nextDay();
    return JSON.stringify(s.requests) + '|' + s.player.gold + '|' + JSON.stringify(s.memory.episodes); };
  const a = run(), b = run(); assert.equal(a, b);
  return a.length + ' caratteri identici';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
