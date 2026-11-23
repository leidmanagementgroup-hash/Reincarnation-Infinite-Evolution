// Memoria del mondo e conseguenze (Living World 2.0, incremento 1), motore reale in Node senza browser.
// Uso:   node tests/verifica-memoria.cjs        (ONLY=3,5 per eseguire solo alcuni passi)
// Catena: carenza reale di erbe al mercato di Vela → consegna di persona a Tessa (mercato e borsello cambiano) → Tessa e i
// testimoni presenti ricordano → l'opinione apre la pozione messa da parte → salvataggio e ripristino. Più: promessa mantenuta
// e mancata, recupero con azioni coerenti, nessun NPC che sa ciò che non ha visto, ripetizioni che non gonfiano l'opinione,
// NPC morto, determinismo, salvataggi senza memoria o con memoria danneggiata.
// Le preparazioni (erbe nel borsello, scorte prelevate da altri compratori con Economy.procure, ferite con Conflicts.damageNpc)
// sono dichiarate: le azioni del giocatore passano dai comandi reali del gioco (Game.command).
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
const { Game, World, Inventory, Economy, Conflicts, Calendar, WorldMemory } = scope;
const toasts = [];
Game.onEvent = (type, data) => { if (type === 'toast') toasts.push(String(data)); };

const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 300)); }
};
function newGame(seed = 19425) {
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${seed} / 4294967296; if (k === 1) return .24;
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, scope);
  assert(Game.newGame());
  return Game.s;
}
const steps = (n, input = {}) => { for (let i = 0; i < n; i++) Game.step(1 / 60, input); };
const day = s => Calendar.absoluteDays(s.calendar, s.time);
// Il tempo del calendario avanza come quando il gioco resta aperto (secondi reali passati al motore), poi qualche impulso.
function advanceDays(n) { for (let i = 0; i < n; i++) { Game.step(1 / 60, {}, 1800); steps(90); } }
function atHour(hour) { const s = Game.s; const v = Calendar.view(s.calendar, s.time, 'valley'); let h = v.hour ?? +String(v.clock || '').slice(0, 2);
  const now = Calendar.timestamp(s.calendar, s.time), start = now - (now % 1800); Game.step(1 / 60, {}, Math.max(0, start + hour * 75 - now)); steps(5); }
function nearTessa() { const s = Game.s, t = World.points.merchant; Object.assign(s.player, { x: t.x + 14, y: t.y + 20 }); steps(2); }
const herb = () => BigInt(Economy.quote(Game.s, 'vela', 'herb').stock);
const give = () => Game.command('tieGive');
const mem = () => Game.s.memory;
const episodes = (npc, kind) => mem().episodes.filter(e => e.npc === npc && (!kind || e.kind === kind));
function makeShort() { // altri compratori svuotano il banco delle erbe (preparazione dichiarata)
  const s = Game.s, q = Economy.quote(s, 'vela', 'herb'), target = BigInt(q.target), stock = BigInt(q.stock);
  if (stock >= target - 2n) Economy.procure(s, 'vela', 'herb', stock - target + 4n);
  assert(Economy.shortage(s, 'vela', 'herb') > 0, 'carenza non creata');
}

check('1. Partita nuova: memoria vuota e valida, Tessa «ti conosce appena»', () => {
  const s = newGame();
  assert.equal(s.memory.schema, 1); assert.equal(JSON.stringify(s.memory.episodes), '[]');
  const v = WorldMemory.merchantView(s);
  assert.equal(v.level, 'Ti conosce appena'); assert.equal(v.reserve.open, false);
  return `carenza di erbe a Vela: ${v.stock} su ${v.target}`;
});

check('2. Catena completa: consegna durante la carenza → mercato e borsello cambiano → Tessa e i testimoni presenti ricordano', () => {
  const s = newGame(); nearTessa(); makeShort();
  assert.equal(give(), false, 'consegna senza erbe accettata');
  Inventory.add(s, 'herb', 5);
  const stock = herb(), gold = s.player.gold, quote = WorldMemory.merchantView(s).give;
  const seen = ['elder', 'smith'].filter(id => { const at = Conflicts.point(s, id, scope.Life.npcPoint(s, id, World.points[id])); return at && Math.hypot(at.x - World.points.merchant.x, at.y - World.points.merchant.y) <= WorldMemory.rules.HEARING; });
  assert.equal(give(), true, toasts.at(-1));
  assert.equal(herb(), stock + 3n, 'scorta del mercato non aumentata di 3');
  assert.equal(Inventory.quantity(s, 'herb'), 2n);
  assert.equal(s.player.gold, gold + quote.pay, 'pagamento diverso dal prezzo di vendita del mercato');
  assert.equal(episodes('merchant', 'shortage-help').length, 1);
  assert.equal(JSON.stringify(mem().episodes.filter(e => e.kind === 'saw-help').map(e => e.npc).sort()), JSON.stringify(seen.sort()));
  assert(/Tessa ricorderà il tuo aiuto/.test(toasts.at(-1)));
  return `+${quote.pay} Scintille, scorta ${stock}→${herb()}, testimoni: ${seen.join(', ') || 'nessuno'}`;
});

check('3. Nessun NPC sa ciò che non ha visto: Ivo lontano (in cura, critico) non ricorda, gli abitanti degli altri borghi nemmeno', () => {
  const s = newGame(); nearTessa(); makeShort(); Inventory.add(s, 'herb', 3);
  Conflicts.damageNpc(s, 'smith', 9999, { cause: 'Prova', point: { region: 'valley', x: World.points.smith.x, y: World.points.smith.y } });
  assert.notEqual(Conflicts.condition(s, 'smith').status, 'healthy');
  assert.equal(give(), true, toasts.at(-1));
  assert.equal(episodes('smith').length, 0, 'Ivo ricorda senza esserci');
  assert(episodes('merchant').length === 1);
  assert(Object.values(s.society.people).every(p => !(p.memories || []).some(m => /herb|tessa/i.test(JSON.stringify(m)))), 'memorie di Society toccate');
  return 'Ivo ' + Conflicts.condition(s, 'smith').status + ': nessun ricordo';
});

check('4. Ripetere la stessa azione non gonfia l’opinione: un episodio per tipo e giorno, al massimo tre per tipo', () => {
  const s = newGame(); nearTessa(); Inventory.add(s, 'herb', 60);
  const values = [];
  for (let d = 0; d < 6; d++) {
    makeShort(); assert.equal(give(), true); makeShort(); give(); // due consegne lo stesso giorno
    values.push(WorldMemory.opinion(s, 'merchant'));
    advanceDays(1);
  }
  assert.equal(new Set(episodes('merchant', 'shortage-help').map(e => e.day)).size, episodes('merchant', 'shortage-help').length);
  const max = 3 * 2; // tre episodi da 2
  assert(values.every(v => v <= max + 1e-9), values.join(','));
  return 'opinione per giorno: ' + values.join(' → ');
});

check('5. L’opinione apre la pozione messa da parte, solo a emporio chiuso e una al giorno', () => {
  const s = newGame(); nearTessa(); makeShort(); Inventory.add(s, 'herb', 3);
  assert.equal(give(), true);
  assert(WorldMemory.opinion(s, 'merchant') >= WorldMemory.rules.TRUST);
  atHour(9); nearTessa();
  assert.equal(Calendar.view(s.calendar, s.time, 'valley').shopOpen, true);
  assert.equal(Game.command('tieReserve'), false, 'riserva usata a emporio aperto');
  atHour(22); nearTessa(); s.player.gold = 40;
  assert.equal(Calendar.view(s.calendar, s.time, 'valley').shopOpen, false);
  const potions = s.player.potions;
  assert.equal(Game.command('tieReserve'), true, toasts.at(-1));
  assert.equal(s.player.potions, potions + 1); assert.equal(s.player.gold, 40 - Game.rules.potionPrice);
  assert.equal(Game.command('tieReserve'), false, 'seconda pozione nello stesso giorno');
  return 'a emporio chiuso: 1 pozione a ' + Game.rules.potionPrice + ' Scintille';
});

check('6. Promessa mantenuta: ricordo positivo e promessa chiusa', () => {
  const s = newGame(); nearTessa(); makeShort();
  assert.equal(Game.command('tiePromise'), true, toasts.at(-1));
  assert.equal(Game.command('tiePromise'), false, 'seconda promessa');
  Inventory.add(s, 'herb', 3); assert.equal(give(), true);
  assert.equal(s.memory.promise, null); assert.equal(episodes('merchant', 'promise-kept').length, 1);
  return 'opinione ' + WorldMemory.opinion(s, 'merchant') + ' · ' + WorldMemory.level(WorldMemory.opinion(s, 'merchant'));
});

check('7. Promessa mancata: Tessa se ne ricorda, la fiducia scende, la riserva si chiude, nuove promesse rifiutate; poi si recupera', () => {
  const s = newGame(); nearTessa(); makeShort(); Inventory.add(s, 'herb', 3); give(); // prima un aiuto: riserva aperta
  assert.equal(WorldMemory.merchantView(s).reserve.open, true);
  advanceDays(1); nearTessa(); makeShort();
  assert.equal(Game.command('tiePromise'), true);
  advanceDays(2);
  assert.equal(s.memory.promise, null); assert.equal(episodes('merchant', 'promise-broken').length, 1);
  assert(toasts.some(t => /ha atteso invano/.test(t)));
  const after = WorldMemory.merchantView(s);
  assert.equal(after.reserve.open, false, 'riserva ancora aperta'); assert.equal(after.distrust, true);
  nearTessa(); makeShort(); assert.equal(Game.command('tiePromise'), false, 'promessa accettata da chi diffida');
  // Recupero: aiuti in giorni diversi durante carenze reali.
  Inventory.add(s, 'herb', 30); const path = [WorldMemory.opinion(s, 'merchant')];
  for (let d = 0; d < 12 && !WorldMemory.merchantView(s).reserve.open; d++) { advanceDays(1); nearTessa(); makeShort(); give(); path.push(WorldMemory.opinion(s, 'merchant')); }
  assert.equal(WorldMemory.merchantView(s).reserve.open, true, 'fiducia non recuperata: ' + path.join(','));
  return 'opinione ' + path.join(' → ');
});

check('8. Salvataggio e ripristino: ricordi, promessa e riserva identici; opinione uguale dopo il caricamento', () => {
  const s = newGame(); nearTessa(); makeShort(); Inventory.add(s, 'herb', 3); give(); makeShort(); Game.command('tiePromise');
  const before = JSON.stringify(s.memory), opinion = WorldMemory.opinion(s, 'merchant');
  assert(Game.save() && Game.load());
  assert.equal(JSON.stringify(Game.s.memory), before); assert.equal(WorldMemory.opinion(Game.s, 'merchant'), opinion);
  const raw = Game.exportSave(); assert(Game.importSave(raw)); assert.equal(JSON.stringify(Game.s.memory), before);
  return before.length + ' byte di memoria';
});

check('9. Salvataggi senza memoria o con memoria danneggiata si caricano lo stesso (LW-SAV-01)', () => {
  const s = newGame(); nearTessa(); makeShort(); Inventory.add(s, 'herb', 3); give();
  const save = JSON.parse(Game.exportSave());
  delete save.memory; assert(Game.importSave(JSON.stringify(save)), 'salvataggio senza memoria rifiutato'); assert.equal(JSON.stringify(Game.s.memory.episodes), '[]');
  for (const broken of [42, 'x', { schema: 9 }, { schema: 1, episodes: [{ npc: 'ignoto', kind: 'x', day: -1, source: 'self' }, { npc: 'merchant', kind: 'shortage-help', day: 0, source: 'self' }], promise: { need: 99 }, reserveDay: 'ieri' }]) {
    save.memory = broken; assert(Game.importSave(JSON.stringify(save)), 'salvataggio rifiutato con memoria ' + JSON.stringify(broken).slice(0, 40));
  }
  assert.equal(JSON.stringify(Game.s.memory.episodes), JSON.stringify([{ npc: 'merchant', kind: 'shortage-help', day: 0, source: 'self' }]));
  assert.equal(Game.s.memory.promise, null);
  return 'voci non valide scartate, voce valida conservata';
});

check('10. NPC morto: niente consegne né riserva, la promessa decade senza colpa, i ricordi restano; non torna in vita da solo', () => {
  const s = newGame(); nearTessa(); makeShort(); Inventory.add(s, 'herb', 6); give(); makeShort(); Game.command('tiePromise');
  Conflicts.damageNpc(s, 'merchant', 9999, { cause: 'Prova', point: { region: 'valley', x: World.points.merchant.x, y: World.points.merchant.y } });
  Object.assign(s.player, { x: World.spawn.x - 200, y: World.spawn.y }); // lontano: nessun soccorso
  // La scadenza del critico si misura sul tempo di gioco (s.time): servono passi veri, ~105 s.
  for (let i = 0; i < 8 && Conflicts.condition(s, 'merchant').status !== 'dead'; i++) steps(60 * 20);
  assert.equal(Conflicts.condition(s, 'merchant').status, 'dead', 'Tessa non è morta: ' + Conflicts.condition(s, 'merchant').status);
  steps(90);
  assert.equal(s.memory.promise, null); assert.equal(episodes('merchant', 'promise-broken').length, 0);
  assert(episodes('merchant').length >= 1, 'ricordi persi');
  nearTessa(); assert.equal(give(), false); assert.equal(WorldMemory.merchantView(s).reserve.open, false);
  advanceDays(3); assert.equal(Conflicts.condition(s, 'merchant').status, 'dead');
  assert(Game.save() && Game.load()); assert.equal(Conflicts.condition(Game.s, 'merchant').status, 'dead');
  return 'Tessa resta morta dopo 3 giorni e dopo il caricamento';
});

check('11. Determinismo: stesso seme e stesse azioni → stessa memoria e stessa opinione', () => {
  const run = () => { const s = newGame(555); nearTessa(); makeShort(); Inventory.add(s, 'herb', 9); give(); advanceDays(1); nearTessa(); makeShort(); Game.command('tiePromise'); give(); advanceDays(2);
    return JSON.stringify(s.memory) + '|' + WorldMemory.opinion(s, 'merchant') + '|' + s.player.gold + '|' + herb(); };
  const a = run(), b = run();
  assert.equal(a, b);
  return a.length + ' caratteri identici';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
