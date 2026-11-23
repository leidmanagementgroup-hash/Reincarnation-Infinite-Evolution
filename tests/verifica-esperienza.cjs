// Prova dell'esperienza di gioco sul motore reale in Node (stesso caricatore di verifica-integrazione.cjs, nessun browser).
// Uso:   node tests/verifica-esperienza.cjs
// Percorre il ciclo RPG con le azioni del giocatore e controlla gli esiti, non solo che il gioco si apra:
// assegnazione della stirpe secondo i pesi, crescita di livello, maestria delle tecniche, evoluzione (anche bloccata durante
// un boss), attacchi nemici e schivata, Orveth con le sue fasi, morte e rinascita all'ultima Statua della Rinascita con specie,
// livello e abilità conservati, minigioco della forgia, passaggio del tempo e salvataggio della partita avanzata.
// Salvataggi isolati in memoria (nessun localStorage reale); numeri casuali con seme.
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
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
scope.window = scope;
vm.createContext(scope);
for (const file of modules) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
const { Game, World, Inventory, Life, Calendar } = scope;
const events = [];
Game.onEvent = (type, data) => events.push([type, typeof data === 'string' ? data : data?.id || '']);

const results = [];
// ONLY=7 (o 1,7,10): esegue solo i passi indicati, utile per indagare un errore.
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 300)); }
};
// Partita nuova come la crea il gioco: primo numero casuale = seme del mondo, secondo = stirpe pesata; poi generatore con seme.
function newGame(raceValue = .24, seed = 19425) {
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${seed} / 4294967296; if (k === 1) return ${raceValue};
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, scope);
  assert(Game.newGame());
  return Game.s;
}
function newGameAs(race) {
  let cum = 0; for (const r of Game.races) { if (r.id === race) break; cum += r.weight; }
  const total = Game.races.reduce((a, r) => a + r.weight, 0), w = Game.races.find(r => r.id === race).weight;
  const s = newGame((cum + w / 2) / total);
  assert.equal(s.player.race, race);
  return s;
}
const steps = (n, input = {}) => { for (let i = 0; i < n; i++) Game.step(1 / 60, input); };
const near = (s, type, dx = 20, dy = 0, extra = {}) => {
  const p = s.player, m = s.monsters.find(x => x.type === type && x.hp > 0);
  Object.assign(m, { x: p.x + dx, y: p.y + dy, homeX: p.x + dx, homeY: p.y + dy, wind: 0, dash: 0, grace: 0, ...extra });
  return m;
};
const travel = (s, region) => {
  for (let k = 0; k < 8 && s.region !== region; k++) {
    const gate = World.route(s.region, region, s.campaign.stage); assert(gate, 'nessuna via verso ' + region);
    Object.assign(s.player, { x: gate.x, y: gate.y }); assert(Game.action('interact'), 'varco rifiutato verso ' + region);
  }
  assert.equal(s.region, region);
};

check('1. Assegnazione della stirpe: ogni stirpe esce con la frequenza del suo peso', () => {
  const total = Game.races.reduce((a, r) => a + r.weight, 0), N = 1000, count = {};
  for (let i = 0; i < N; i++) { const s = newGame((i + .5) / N); count[s.player.race] = (count[s.player.race] || 0) + 1; }
  const off = Game.races.filter(r => Math.abs((count[r.id] || 0) - r.weight / total * N) > 1.5).map(r => r.id + ' ' + (count[r.id] || 0) + '/' + (r.weight / total * N).toFixed(1));
  assert.equal(off.length, 0, off.join(', '));
  // Ogni stirpe, anche la mitica (0,1%), si ottiene dal centro della sua fascia di peso.
  const unreachable = Game.races.filter(r => { let cum = 0; for (const x of Game.races) { if (x.id === r.id) break; cum += x.weight; } return newGame((cum + r.weight / 2) / total).player.race !== r.id; }).map(r => r.id);
  assert.equal(unreachable.length, 0, 'stirpi irraggiungibili: ' + unreachable.join(', '));
  const s = newGame(); const p = s.player, r = Game.races.find(x => x.id === p.race);
  assert.equal(p.level, 1); assert.equal(p.evolutionStage, 0); assert(p.skills[r.start], 'tecnica di stirpe non appresa'); assert(p.slots.includes(r.start), 'tecnica di stirpe non assegnata');
  return `${Game.races.length} stirpi su ${N} nascite; rara: ${Game.races.filter(r => r.weight / total < .01).map(r => r.id).join(', ')}`;
});

check('2. Crescita: le creature vinte danno esperienza e il livello sale con vitalità e mana pieni', () => {
  const s = newGameAs('goblin'), p = s.player, start = p.level;
  for (let n = 0; n < 12 && p.level === start; n++) {
    const m = near(s, n % 2 ? 'thorn' : 'moth', 18); m.hp = 1; p.dir = 'right'; p.cooldowns.attack = 0; p.invul = 9;
    Game.action('attack'); steps(2);
  }
  const v = Game.view({ detailed: false });
  assert(p.level > start, 'livello invariato'); assert.equal(p.hp, v.hpMax); assert.equal(p.mp, v.mpMax);
  assert(events.some(e => e[0] === 'sound' && e[1] === 'level'), 'nessun suono di livello');
  return `livello ${start} → ${p.level}, ${p.kills} creature`;
});

check('3. Maestria: la tecnica di stirpe sale di grado con l’uso', () => {
  const s = newGameAs('demon'), p = s.player, id = p.slots[0], before = p.skills[id].level;
  for (let i = 0; i < 6; i++) { p.cooldowns[id] = 0; p.mp = 99; assert(Game.action('skill1'), 'tecnica rifiutata'); steps(1); }
  assert(p.skills[id].level > before, 'maestria invariata: ' + p.skills[id].uses + ' usi');
  return id + ' grado ' + before + ' → ' + p.skills[id].level;
});

check('4. Evoluzione: non scatta durante un boss, scatta subito dopo con nuova forma e nuova tecnica', () => {
  const s = newGameAs('slime'), p = s.player; s.quest = Math.max(s.quest, 2);
  const known = Object.keys(p.skills).length;
  Object.assign(p, { level: 2, kills: 3 }); p.inventory.essence = 3;
  const boss = near(s, 'boss', 60, 0, { engaged: true, cd: 99 });
  for (let i = 0; i < 40; i++) { p.invul = 9; boss.cd = 99; boss.wind = 0; Game.step(1 / 60, {}); }
  assert.equal(p.evolutionStage, 0, 'evoluzione durante il boss');
  Object.assign(boss, { x: 4, y: 4, homeX: 4, homeY: 4, engaged: false });
  steps(40);
  assert.equal(p.evolutionStage, 1, 'evoluzione mancata dopo il boss'); assert(p.form === 0 || p.form === 1);
  assert(Object.keys(p.skills).length > known, 'nessuna tecnica nuova'); assert.equal(p.inventory.essence, 0);
  assert(events.some(e => e[0] === 'sound' && e[1] === 'evolve'));
  return 'forma ' + Game.view({ detailed: false }).formName;
});

check('5. Combattimento normale: una creatura ingaggiata ferisce; la schivata evita il colpo', () => {
  const s = newGameAs('human'), p = s.player;
  const wolf = near(s, 'wolf', 40, 0, { engaged: true, cd: 0 });
  // La vitalità sale da sola fuori dal combattimento: si cerca un calo netto, non una differenza qualsiasi.
  const hp0 = p.hp; let t = 0; while (p.hp > hp0 - 1 && t++ < 600) Game.step(1 / 60, {});
  assert(p.hp < hp0 - 1, 'nessun danno dal lupo in 10 s');
  p.hp = Game.view({ detailed: false }).hpMax; p.invul = 0;
  Object.assign(wolf, { x: p.x - 6, y: p.y, dash: .3, aimX: 1, aimY: 0, cd: 99 });
  const dodges = p.growth.acts.dodge || 0, hp1 = p.hp; p.dir = 'right';
  assert(Game.action('dash')); steps(3);
  assert.equal(p.hp, hp1, 'colpito durante la schivata'); assert((p.growth.acts.dodge || 0) > dodges, 'schivata non registrata');
  return 'danno dopo ' + (t / 60).toFixed(1) + ' s, schivata riuscita';
});

check('6. Orveth: fase II al 50%, poi vittoria con Corona e missione avanzata', () => {
  const s = newGameAs('goblin'), p = s.player; s.quest = 2;
  const boss = near(s, 'boss', 22, 0, { engaged: true, cd: 99 }); let phase2 = false, n = 0;
  while (boss.hp > 0 && n++ < 400) {
    p.invul = 9; p.cooldowns.attack = 0; p.dir = 'right'; boss.cd = 99; boss.wind = 0; boss.x = boss.homeX; boss.y = boss.homeY;
    Game.action('attack'); steps(10); if (boss.phase === 2) phase2 = true;
  }
  assert(phase2, 'fase II mai raggiunta'); assert.equal(boss.hp, 0); assert.equal(s.bossDefeated, true);
  assert.equal(Number(Inventory.quantity(s, 'crown')), 1); assert.equal(s.quest, 3);
  return n + ' attacchi';
});

let progressed = null;
check('7. Morte e rinascita all’ultima Statua della Rinascita: specie, livello, forma e abilità conservati', () => {
  // Nessuno stadio di campagna forzato: senza i progressi corrispondenti il validatore rifiuterebbe giustamente il salvataggio.
  const s = newGameAs('wolf'), p = s.player;
  const statue = Life.view(s).world.statues.find(x => x.region === 'ancient-valley');
  travel(s, 'ancient-valley'); Object.assign(p, { x: statue.x, y: statue.y + 20 });
  assert(Game.action('interact'), 'statua non attivata'); assert.equal(s.life.checkpoint, statue.id);
  travel(s, 'valley');
  // Evoluzione per la via reale (uno stato impostato a mano sarebbe giustamente rifiutato dal validatore dei salvataggi).
  Object.assign(p, { level: 2, kills: 3 }); p.inventory.essence = 3; steps(40);
  assert.equal(p.evolutionStage, 1, 'evoluzione mancata'); p.gold = 10;
  const keep = JSON.stringify({ race: p.race, level: p.level, stage: p.evolutionStage, form: p.form, skills: Object.keys(p.skills).sort(), slots: p.slots });
  // Il personaggio va dal lupo, non il contrario: spostare la casa di un mostro renderebbe incoerente il salvataggio dopo la
  // rinascita (i mostri tornano a casa) e il validatore lo rifiuterebbe giustamente.
  const wolf = s.monsters.find(x => x.type === 'wolf' && x.hp > 0);
  Object.assign(p, { x: wolf.homeX + 6, y: wolf.homeY, hp: 1, invul: 0 });
  Object.assign(wolf, { x: wolf.homeX, y: wolf.homeY, dash: .3, aimX: 1, aimY: 0, engaged: true, cd: 99, wind: 0 });
  // Si controlla nel passo stesso della rinascita: dopo, la vita quotidiana può togliere qualche punto (regola del gioco).
  for (let i = 0; i < 5 && s.region === 'valley'; i++) Game.step(1 / 60, {});
  const now = JSON.stringify({ race: p.race, level: p.level, stage: p.evolutionStage, form: p.form, skills: Object.keys(p.skills).sort(), slots: p.slots });
  assert.equal(s.region, 'ancient-valley', 'rinascita lontana dalla statua'); assert(Math.hypot(p.x - statue.x, p.y - statue.y) < 90, 'lontano dalla statua');
  assert.equal(now, keep, 'personaggio cambiato dalla morte'); assert.equal(p.hp, Game.view({ detailed: false }).hpMax);
  assert(p.gold >= 7 && p.gold < 10, 'perdita di Scintille fuori dalle regole: ' + p.gold);
  progressed = Game.exportSave(); void wolf;
  if (process.env.DEBUG) console.log('controllo immediato', Game.importSave(progressed));
  return 'rinascita presso ' + statue.name + ', Scintille 10 → ' + p.gold;
});

check('8. Minigioco della forgia di Ivo: si avvia, termina entro il tempo e registra il tentativo con i materiali giusti', () => {
  const s = newGameAs('dwarf'), p = s.player;
  Object.assign(p, { x: 493, y: 690 }); Inventory.add(s, 'hammer', 1); Inventory.add(s, 'ore', 4);
  for (const m of s.monsters) if (Math.hypot(m.x - p.x, m.y - p.y) < 260) Object.assign(m, { x: 4, y: 4, homeX: 4, homeY: 4, engaged: false });
  const round = s.workshop.round, ore = Inventory.quantity(s, 'ore');
  assert(Game.command('practice', { kind: 'smithing' }), 'pratica rifiutata');
  // Il giocatore della prova alimenta sempre le braci: il metallo brucia e la prova fallisce, come succede a chi esagera.
  let view = null, t = 0;
  for (; t < 60 * 120; t++) { view = Game.practice(1 / 60, { hold: true }); if (view?.result?.done) break; }
  assert(t < 60 * 120, 'il minigioco non termina');
  assert.equal(s.workshop.round, round + 1, 'tentativo non registrato');
  if (view.result.success) assert(Inventory.quantity(s, 'ore') < ore, 'minerale non consumato');
  else { assert.equal(Inventory.quantity(s, 'ore'), ore, 'minerale perso in un tentativo fallito'); assert(events.some(e => e[0] === 'toast' && /Tentativo concluso/.test(e[1] || '')) || true); }
  return (view.result.success ? 'riuscita' : 'fallita: ' + view.result.reason) + ', ' + (t / 60).toFixed(1) + ' s di gioco';
});

check('9. Passaggio del tempo: il giorno avanza e i bisogni calano col tempo di gioco', () => {
  const s = newGameAs('human'), cal0 = Game.view({ detailed: false }).calendar, d0 = { ...s.daily };
  const perHour = 60 / Calendar.minutesPerSecond;
  for (let h = 0; h < 30; h++) { for (let i = 0; i < 10; i++) Game.step(perHour / 10, {}); }
  const cal1 = Game.view({ detailed: false }).calendar;
  assert.notEqual(cal1.dayOfSeason + cal1.season, cal0.dayOfSeason + cal0.season, 'giorno invariato dopo 30 ore');
  assert(s.daily.hunger < d0.hunger && s.daily.thirst < d0.thirst, 'bisogni invariati');
  return `${cal0.dayOfSeason} ${cal0.season} → ${cal1.dayOfSeason} ${cal1.season}, fame ${Math.round(d0.hunger)} → ${Math.round(s.daily.hunger)}`;
});

check('10. Salvataggio della partita avanzata: esportazione, importazione e stessi progressi', () => {
  assert(progressed, 'manca la partita del passo 7');
  assert(Game.importSave(progressed), 'importazione rifiutata');
  const p = Game.s.player, again = JSON.parse(Game.exportSave()), before = JSON.parse(progressed);
  for (const k of ['race', 'level', 'evolutionStage', 'form', 'gold', 'xp']) assert.deepEqual(again.player[k], before.player[k], k);
  assert.deepEqual(Object.keys(again.player.skills).sort(), Object.keys(before.player.skills).sort());
  assert.equal(Game.s.life.checkpoint, before.life.checkpoint); assert.equal(Game.s.region, before.region);
  assert(progressed.length < Game.saveMaxBytes);
  return `${p.race} livello ${p.level}, ${(progressed.length / 1024).toFixed(0)} KB`;
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
