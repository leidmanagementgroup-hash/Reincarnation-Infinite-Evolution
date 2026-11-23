// Identità della stirpe (Living World 2.0, incremento 4), motore reale in Node senza browser.
// Uso:   node tests/verifica-stirpi.cjs        (ONLY=2,5 per eseguire solo alcuni passi)
// Controlla che ciò che il profilo della stirpe mostra coincida con ciò che il gioco fa davvero (doni numerici, bisogni,
// attacco naturale e guardia dei boss, maturità per il corteggiamento), che Slime, Goblin e Viverna abbiano opportunità e
// difficoltà collegate allo stato reale, e che sorteggio, regole e salvataggi restino invariati.
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
const { Game, World, Inventory, Lineage, Daily, Growth, Adaptive, Society } = scope;
const toasts = [];
Game.onEvent = (type, data) => { if (type === 'toast') toasts.push(String(data)); };

const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 320)); }
};
function newGame(raceValue = .24, seed = 19425) {
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${seed} / 4294967296; if (k === 1) return ${raceValue};
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, scope);
  assert(Game.newGame());
  return Game.s;
}
function newGameAs(race) {
  let cum = 0; for (const r of Game.races) { if (r.id === race) break; cum += r.weight; }
  const total = Game.races.reduce((a, r) => a + r.weight, 0), w = Game.races.find(r => r.id === race).weight;
  const s = newGame((cum + w / 2) / total); assert.equal(s.player.race, race); return s;
}
const steps = (n, input = {}) => { for (let i = 0; i < n; i++) Game.step(1 / 60, input); };
const hpMax = () => Game.view({ detailed: false }).hpMax;
const near = (s, dx = 18) => {
  const p = s.player, m = s.monsters.find(x => x.hp > 0 && !Game.codex[x.type].boss);
  Object.assign(m, { x: p.x + dx, y: p.y, homeX: p.x + dx, homeY: p.y, hp: 1, wind: 0, dash: 0, grace: 0, engaged: false, cd: 9 });
  return m;
};

check('1. Sorteggio invariato: 44 stirpi, probabilità uguali a prima (Slime 14,41%, Goblin 12,01%, Viverna 0,32%)', () => {
  newGame();
  assert.equal(Game.races.length, 44);
  const pct = id => Math.round(Game.races.find(r => r.id === id).weight * 100) / 100;
  assert.equal(pct('slime'), 14.41); assert.equal(pct('goblin'), 12.01); assert.equal(pct('wyvern'), 0.32);
  assert.equal(Lineage.view(newGameAs('slime')).chance, '14,41%');
  return 'somma dei pesi ' + Math.round(Game.races.reduce((a, r) => a + r.weight, 0));
});

check('2. Dono dello Slime: la pozione cura davvero il 67% (le altre stirpi il 48%), come dice il profilo', () => {
  const heal = race => { const s = newGameAs(race); s.player.hp = 1; s.player.potions = 1; s.player.cooldowns.potion = 0; Game.action('potion'); return (s.player.hp - 1) / hpMax(); };
  const slime = heal('slime'), goblin = heal('goblin');
  assert(Math.abs(slime - .67) < .01, 'Slime ' + slime); assert(Math.abs(goblin - .48) < .01, 'Goblin ' + goblin);
  assert.match(Lineage.view(newGameAs('slime')).gift, /67%.*48%/);
  return `Slime ${Math.round(slime * 100)}%, Goblin ${Math.round(goblin * 100)}%`;
});

check('3. Dono del Goblin: una Scintilla in più per ogni creatura vinta', () => {
  const loot = race => { const s = newGameAs(race), m = near(s), gold = s.player.gold; s.player.dir = 'right'; s.player.facing = [1, 0];
    Game.action('attack', { x: 1, y: 0 }); steps(20); assert(m.hp <= 0, race + ': creatura non vinta'); return s.player.gold - gold - Game.codex[m.type].gold; };
  const goblin = loot('goblin'), slime = loot('slime');
  assert.equal(goblin, 1); assert.equal(slime, 0);
  return 'Goblin +' + goblin + ', Slime +' + slime + ' oltre al bottino della creatura';
});

check('4. Doni del Lupo e dell’Elfo: schivata in 0,95 s e mana 2,5 al secondo', () => {
  let s = newGameAs('wolf'); Game.action('dash'); assert.equal(s.player.cooldowns.dash, .95);
  s = newGameAs('elf'); s.player.mp = 0; steps(60); assert(Math.abs(s.player.mp - 2.5) < .05, 'mana ' + s.player.mp);
  assert.match(Lineage.view(s).gift, /2,5 mana/);
});

check('5. Bisogni della stirpe: i fattori mostrati sono quelli applicati (fame dello Slime ×0,46 rispetto al Goblin)', () => {
  const run = race => { const s = newGameAs(race); for (let i = 0; i < 4; i++) { Game.step(1 / 60, {}, 120); steps(80); } return 100 - s.daily.hunger; };
  const slime = run('slime'), goblin = run('goblin');
  assert(goblin > 0, 'nessun consumo');
  const ratio = slime / goblin; assert(Math.abs(ratio - .46) < .05, 'rapporto ' + ratio);
  const shown = Lineage.view(newGameAs('slime')).needs.find(n => n.key === 'hunger');
  assert.equal(shown.factor, Daily.racial('slime').hunger); assert.match(shown.text, /×0,46 \(54% in meno\)/);
  return `fame consumata: Slime ${slime.toFixed(2)}, Goblin ${goblin.toFixed(2)} (rapporto ${ratio.toFixed(2)})`;
});

check('6. Attacco naturale: il Soffio della Viverna è a distanza (65 px) e la guardia adattiva riduce solo i colpi ravvicinati', () => {
  const s = newGameAs('wyvern'), a = Lineage.view(s).attack;
  assert.equal(a.ranged, true); assert.equal(a.reach, 65); assert.match(a.boss, /non riduce i tuoi/);
  const g = newGameAs('goblin'), b = Lineage.view(g).attack; assert.equal(b.ranged, false); assert.match(b.boss, /perdono il 16%/);
  const boss = g.monsters.find(m => Game.codex[m.type].boss); Adaptive.guard(g, boss, 5);
  assert.equal(Adaptive.damageFactor(g, boss, 'melee'), .84); assert.equal(Adaptive.damageFactor(g, boss, 'projectile'), 1);
  return a.text + ' · ' + b.text;
});

check('7. Corteggiamento: regola invariata, ma ora il motivo si vede (Slime giovane bloccato, Nano adulto no)', () => {
  const tryCourt = race => {
    // Viaggio vero fino al Borgo dei Filoni; preparazione dichiarata: un abitante del borgo già amico e interessato.
    const s = newGameAs(race);
    for (let i = 0; i < 8 && s.region !== 'frost-pass'; i++) { const g = World.route(s.region, 'frost-pass', s.campaign.stage); Object.assign(s.player, { x: g.x, y: g.y }); steps(2); assert(Game.action('interact')); steps(2); }
    const site = Society.sites(s)[0]; assert(site, 'nessun abitante ai Filoni'); const id = site.id, person = s.society.people[id];
    person.bond = 'friend'; person.interest = person.interest || 'herb';
    Object.assign(s.player, { x: site.point.x, y: site.point.y + 6 }); steps(2);
    toasts.length = 0; const ok = Game.command('society', { op: 'court', id }); return { ok, text: toasts.at(-1) || '', mature: Society.mature(s) };
  };
  const slime = tryCourt('slime'), dwarf = tryCourt('dwarf');
  assert.equal(slime.ok, false); assert.match(slime.text, /non è ancora adulta/); assert.equal(slime.mature.ready, false);
  assert.equal(dwarf.mature.ready, true); assert.doesNotMatch(dwarf.text, /non è ancora adulta/);
  assert.match(Lineage.view(newGameAs('slime')).courtship, /secondo stadio/);
  return slime.text;
});

check('8. Slime, Goblin e Viverna: opportunità e difficoltà con lo stato reale del personaggio', () => {
  let s = newGameAs('slime'), l = Lineage.view(s);
  assert.equal(l.prototype.length, 3); assert.match(l.prototype[0].status, new RegExp('Pozioni con te: ' + s.player.potions));
  s = newGameAs('goblin'); s.player.kills = 7; l = Lineage.view(s); assert.match(l.prototype[0].status, /Creature vinte 7 · Scintille in più ricevute 7/);
  s = newGameAs('wyvern'); l = Lineage.view(s); const cold = l.prototype.find(o => o.kind === 'Difficoltà');
  assert.match(cold.text, /×1,24/); assert.match(cold.status, /Mantella no/);
  Inventory.add(s, 'woolcloak', 1); assert.match(Lineage.view(s).prototype.find(o => o.kind === 'Difficoltà').status, /Mantella sì/);
  assert.match(cold.status, /richiesta di Ivo/);
  const other = Lineage.view(newGameAs('wolf')); assert.equal(other.prototype.length, 0); assert(other.gift && other.needs.length === 5);
  return 'Viverna: ' + cold.title + ' · ' + cold.status;
});

check('9. Nessun nuovo dato nel salvataggio e salvataggi invariati', () => {
  const s = newGameAs('wyvern'); Lineage.view(s);
  const save = JSON.parse(Game.exportSave());
  assert(!('lineage' in save)); assert(Game.importSave(JSON.stringify(save)));
  return Object.keys(save).length + ' campi di primo livello';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
