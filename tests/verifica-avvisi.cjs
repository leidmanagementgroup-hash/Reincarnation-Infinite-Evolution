// Avvisi dei mostri coerenti con i colpi (RPG Evolution, incremento 2). Motore reale in Node, nessun browser.
// Uso:   node tests/verifica-avvisi.cjs
// Per pestone (Germoglio spinoso, Orveth in fase I e II), maglio e contrattacco: l'area disegnata da Game.drawFX durante il
// preavviso viene letta dalle istruzioni di disegno (non ricalcolata) e confrontata, su una griglia di punti, con chi viene
// davvero colpito: colpito ⇒ dentro l'avviso, e dentro l'avviso (con 1 px di margine) ⇒ colpito.
// Per la carica (Lupo delle fronde, Orveth): la corsia disegnata (lunghezza e raggio) contiene ogni punto colpito durante la corsa.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
function surface() {
  const px = { createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }, getImageData(a, b, w, h) { return px.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } };
  return { width: 1, height: 1, getContext: () => new Proxy(px, { get(t, k) { return k in t ? t[k] : () => undefined; } }) };
}
const store = new Map();
const scope = { console: { warn() {}, log() {} }, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
scope.window = scope; vm.createContext(scope);
for (const f of modules) { if (f === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), scope, { filename: f }); }
const { Game } = scope;

const results = [];
const check = (name, fn) => {
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 300)); }
};
function fresh() {
  vm.runInContext('Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return 19425 / 4294967296; if (k === 1) return .24; z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()', scope);
  assert(Game.newGame()); const s = Game.s; s.quest = Math.max(s.quest, 2);
  for (const m of s.monsters) Object.assign(m, { x: m.homeX, y: m.homeY, engaged: false, wind: 0, dash: 0 });
  return s;
}
// Contesto di disegno che registra le chiamate (solo il motore: gli effetti decorativi sono spenti durante la registrazione).
function record(fn) {
  const calls = [], state = { tx: 0, ty: 0, rot: 0 };
  const ctx = new Proxy({}, { get(_, k) {
    if (k === 'translate') return (x, y) => { state.tx += x; state.ty += y; };
    if (k === 'rotate') return a => { state.rot += a; };
    if (k === 'save') return () => calls.push(['save']);
    if (k === 'restore') return () => { calls.push(['restore']); state.tx = 0; state.ty = 0; state.rot = 0; };
    return (...a) => calls.push([k, ...a, { ...state }]);
  }, set() { return true; } });
  const art = scope.CombatFX; scope.CombatFX = undefined;
  try { fn(ctx); } finally { scope.CombatFX = art; }
  return calls;
}
// Arma un attacco del mostro con preavviso quasi finito, legge l'avviso disegnato, poi lo lascia partire contro il giocatore.
function trial(setup, dx, dy) {
  const s = fresh(), p = s.player, m = setup(s);
  // Vitalità sotto il massimo: un valore oltre il massimo verrebbe riportato giù dal gioco e sembrerebbe un colpo.
  Object.assign(p, { x: m.x + dx, y: m.y + dy, invul: 0, dash: 0 }); p.hp = Game.view({ detailed: false }).hpMax - 20;
  const calls = record(ctx => Game.drawFX(ctx));
  const hp = p.hp; for (let i = 0; i < 40 && (m.wind > 0 || m.dash > 0); i++) Game.step(1 / 60, {});
  return { hit: p.hp < hp - 1, calls, m };
}
// Raggio massimo dei cerchi pieni disegnati attorno al mostro (warnCircle → arc centrato sul mostro).
const circleRadius = (calls, m) => Math.max(...calls.filter(c => c[0] === 'arc' && Math.abs(c[1] - m.x) < .01 && Math.abs(c[2] - m.y) < .01).map(c => c[3]));
function areaCheck(name, setup, extent) {
  let hits = 0, misses = 0, bad = [], R = null;
  for (let dy = -extent; dy <= extent; dy += 4) for (let dx = -extent; dx <= extent; dx += 4) {
    if (dx === 0 && dy === 0) continue;
    const t = trial(setup, dx, dy), d = Math.hypot(dx, dy), r = circleRadius(t.calls, t.m);
    R = r;
    if (t.hit) hits++; else misses++;
    if (t.hit && d > r) bad.push(`colpito fuori (${dx},${dy}) d=${d.toFixed(1)} r=${r}`);
    if (!t.hit && d < r - 1) bad.push(`non colpito dentro (${dx},${dy}) d=${d.toFixed(1)} r=${r}`);
  }
  assert.equal(bad.length, 0, bad.slice(0, 4).join('; '));
  assert(hits > 4 && misses > 4, 'griglia poco significativa');
  return `${name}: avviso ${R} px, ${hits} punti colpiti tutti dentro, ${misses} fuori`;
}
const arm = (type, pattern, extra = {}) => s => {
  const m = s.monsters.find(x => x.type === type);
  Object.assign(m, { engaged: true, cd: 99, pattern, wind: 1 / 60, windDuration: .6, aimX: 1, aimY: 0, grace: 0, ...extra });
  return m;
};

check('1. Pestone del Germoglio spinoso: avviso = area colpita', () => areaCheck('germoglio', arm('thorn', 'stomp'), 40));
check('2. Pestone di Orveth in fase I e II: avviso = area colpita (prima ellisse più piccola)', () =>
  areaCheck('fase I', arm('boss', 'stomp', { phase: 1 }), 64) + '; ' + areaCheck('fase II', arm('boss', 'stomp', { phase: 2 }), 72));
check('3. Contrattacco adattivo: avviso = area colpita', () => areaCheck('contrattacco', arm('thorn', 'counter'), 56));
check('4. Carica del lupo e di Orveth: ogni punto colpito sta nella corsia disegnata', () => {
  const notes = [];
  for (const [type, extra] of [['wolf', {}], ['boss', { phase: 1 }]]) {
    let hits = 0; const bad = [];
    for (let dy = -28; dy <= 28; dy += 4) for (let dx = -8; dx <= 110; dx += 6) {
      const t = trial(arm(type, 'dash', extra), dx, dy);
      const lane = t.calls.find(c => c[0] === 'fillRect' && c.at(-1).tx !== 0);
      assert(lane, 'corsia della carica non disegnata');
      const len = lane[3], r = -lane[2];
      if (!t.hit) continue; hits++;
      // Distanza del punto dal segmento [0, len] lungo la direzione di mira (1,0).
      const ex = Math.max(0, Math.min(len, dx)), d = Math.hypot(dx - ex, dy);
      if (d > r + 1) bad.push(`(${dx},${dy}) fuori di ${(d - r).toFixed(1)} px (corsia ${len}×${r})`);
    }
    assert.equal(bad.length, 0, type + ': ' + bad.slice(0, 3).join('; '));
    assert(hits > 3, type + ': nessun colpo');
    notes.push(type + ' ' + hits + ' colpi dentro la corsia');
  }
  return notes.join(', ');
});

// ---------------------------------------------------------------- incremento 4: boss
const events = [];
Game.onEvent = (type, data) => events.push([type, typeof data === 'string' ? data : '']);
const angleOf = (x, y, m) => Math.atan2(y - (m.y - 7), x - m.x);
const norm = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
function lanesVsShots(type, pattern, phase) {
  const s = fresh(); s.campaign.stage = 5;
  const m = s.monsters.find(x => x.type === 'boss');
  Object.assign(m, { type, engaged: true, cd: 99, pattern, wind: 1 / 60, windDuration: .7, aimX: .6, aimY: .8, grace: 0, phase, x: m.homeX, y: m.homeY });
  Object.assign(s.player, { x: m.x - 120, y: m.y, invul: 99 });
  // Corsie: tratti tratteggiati disegnati dal motore durante il preavviso (punta finale di ogni corsia).
  const calls = record(ctx => Game.drawFX(ctx));
  // Una punta di freccia per corsia: è l'unico moveTo lontano dal mostro (le corsie partono a 14 px).
  const tips = calls.filter(c => c[0] === 'moveTo' && Math.hypot(c[1] - m.x, c[2] - (m.y - 7)) > 25).map(c => norm(angleOf(c[1], c[2], m)));
  const origin = { x: m.x, y: m.y }; // il boss si muove dopo il lancio: le direzioni si misurano dal punto di partenza
  for (let i = 0; i < 20; i++) Game.step(1 / 60, {}); // ~30 px: l arrotondamento al pixel non falsa più la direzione
  // Proiettili: il motore li disegna come croce 7×3 (effetti decorativi spenti); il centro dà la direzione.
  const shots = record(ctx => Game.drawFX(ctx)).filter(c => c[0] === 'fillRect' && c[3] === 7 && c[4] === 3).map(c => norm(angleOf(c[1] + 3, c[2] + 1, origin)));
  const uniq = a => [...new Set(a.map(x => x.toFixed(2)))].map(Number).sort((x, y) => x - y);
  return { lanes: uniq(tips), shots: uniq(shots) };
}
check('5. Raffiche e ventagli dei boss: una corsia per ogni proiettile, nelle stesse direzioni', () => {
  const notes = [];
  for (const [type, pattern, phase] of [['boss', 'roots', 1], ['boss', 'roots', 2], ['kharun', 'forge', 2], ['syrava', 'shards', 2], ['syrava', 'shatter', 2]]) {
    const r = lanesVsShots(type, pattern, phase);
    assert(r.shots.length > 2, `${type}/${pattern}: proiettili non visti`);
    assert.equal(r.lanes.length, r.shots.length, `${type}/${pattern} fase ${phase}: ${r.lanes.length} corsie, ${r.shots.length} proiettili`);
    if (process.env.DEBUG) console.log(type, pattern, JSON.stringify(r));
    const off = r.shots.filter(a => !r.lanes.some(b => Math.min(Math.abs(a - b), 2 * Math.PI - Math.abs(a - b)) < .06));
    assert.equal(off.length, 0, `${type}/${pattern}: proiettili fuori dalle corsie`);
    notes.push(`${type} ${pattern} ${r.shots.length}`);
  }
  return notes.join(', ');
});
check('6. Guardia adattiva visibile finché dura', () => {
  const s = fresh(), m = s.monsters.find(x => x.type === 'boss'); Object.assign(m, { engaged: true, cd: 99 });
  scope.Adaptive.guard(s, m, 1.9);
  const shown = record(ctx => Game.drawFX(ctx)).some(c => c[0] === 'ellipse' && c[3] === 20 && c[4] === 24 && Math.abs(c[1] - m.x) < .01);
  s.time += 2;
  const gone = !record(ctx => Game.drawFX(ctx)).some(c => c[0] === 'ellipse' && c[3] === 20 && c[4] === 24);
  assert(shown, 'guardia non disegnata'); assert(gone, 'guardia ancora disegnata dopo la scadenza');
  return 'visibile per 1,9 s';
});
check('7. Reazione adattiva spiegata: causa e consiglio nel messaggio', () => {
  const s = fresh(), p = s.player, m = s.monsters.find(x => x.type === 'boss');
  Object.assign(m, { engaged: true, cd: 0, x: m.homeX, y: m.homeY }); Object.assign(p, { x: m.x - 30, y: m.y, invul: 99 });
  for (let i = 0; i < 6; i++) scope.Adaptive.seeHit(s, m, 'melee');
  events.length = 0; Game.step(1 / 60, {});
  const t = events.find(e => e[0] === 'toast' && /ha letto i tuoi colpi ravvicinati/.test(e[1]));
  assert(t, 'messaggio mancante: ' + JSON.stringify(events.slice(0, 4)));
  assert.equal(m.pattern, 'counter');
  return t[1];
});
check('8. Disimpegno del boss segnalato quando ci si allontana', () => {
  const s = fresh(), p = s.player, m = s.monsters.find(x => x.type === 'boss');
  Object.assign(m, { engaged: true, cd: 99, x: m.homeX, y: m.homeY }); m.hp = m.maxHp - 30; Object.assign(p, { x: m.homeX - 260, y: m.homeY, invul: 99 });
  events.length = 0; Game.step(1 / 60, {});
  const t = events.find(e => e[0] === 'toast' && /torna al suo posto/.test(e[1]));
  assert(t, 'nessun messaggio'); assert.equal(m.hp, m.maxHp); assert.equal(m.engaged, false);
  return t[1];
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
