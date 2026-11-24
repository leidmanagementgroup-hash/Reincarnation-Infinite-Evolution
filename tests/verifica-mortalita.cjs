// RISK-013: mortalità degli abitanti nei conflitti ordinari, col motore reale in Node, per molti semi. Soglie fissate PRIMA della
// correzione (2026-11-24), per i 32 abitanti coinvolti nei conflitti e senza rimpiazzi:
//   30 giorni: in media al massimo 1,5 morti e mai più di 4;   365 giorni: in media al massimo 10 (31 %) e mai più di 14;
//   la morte resta possibile (almeno un morto fra tutti i semi in un anno) e le ferite restano frequenti;
//   dormire, vivere e ricaricare un salvataggio danno conseguenze coerenti; nessuno è immortale: un colpo devastante senza soccorso uccide.
// Prima della correzione: 17 morti in 8 giorni (critico = morte al 100 %, tutti colpiti mentre si ritiravano già feriti).
// Uso:   node tests/verifica-mortalita.cjs        (ONLY=1,3; SEEDS=19425,7 per altri semi)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const SEEDS = (process.env.SEEDS || '19425,7,555,2024,77').split(',').map(Number);
const results = [], only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push('OK'); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push('FAIL'); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 400)); }
};
const surface = () => { const p = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), getImageData(_x, _y, w, h) { return p.createImageData(w, h); }, createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; } }; const c = new Proxy(p, { get: (t, k) => k in t ? t[k] : () => undefined }); return { width: 1, height: 1, getContext: () => c }; };
const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
function load(mutate = null) {
  const store = new Map(), x = { console: { warn() {}, log() {} }, performance, document: { createElement: surface }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  x.window = x; vm.createContext(x);
  for (const f of files) { if (f === 'audio.js') break; let src = fs.readFileSync(path.join(root, f), 'utf8'); if (mutate && f === 'npc-conflicts.js') src = mutate(src); vm.runInContext(src, x, { filename: f }); }
  return x;
}
function atInn(seed, mutate = null) {
  const x = load(mutate);
  vm.runInContext(`Math.random=(()=>{let n=0,z=4242;return()=>{const k=n++;if(k===0)return ${seed}/4294967296;if(k===1)return .24;z=(Math.imul(z,1664525)+1013904223)>>>0;return z/4294967296;};})()`, x);
  assert(x.Game.newGame());
  x.frames = n => { for (let i = 0; i < n; i++) x.Game.step(1 / 60, {}); };
  for (let i = 0; i < 12 && x.Game.s.region !== 'valley'; i++) { const g = x.World.route(x.Game.s.region, 'valley', x.Game.s.campaign.stage); Object.assign(x.Game.s.player, { x: g.x, y: g.y }); x.frames(2); x.Game.action('interact'); x.frames(2); }
  const inn = x.Tradecraft.inn; Object.assign(x.Game.s.player, { x: inn.x, y: inn.y + 14 }); x.frames(2);
  return x;
}
const sleepDays = (x, n, each) => { for (let d = 0; d < n; d++) { assert(x.Game.command('sleep'), 'sonno rifiutato'); x.frames(2); each?.(d + 1); } };
const people = x => Object.values(x.Game.s.conflicts.people);
const dead = x => people(x).filter(p => p.status === 'dead').length;
const avg = a => a.reduce((s, v) => s + v, 0) / a.length;

const year = [];
check('1. Trenta giorni di conflitti ordinari non sono una strage (media ≤ 1,5 morti, mai più di 4)', () => {
  const n = SEEDS.map(seed => { const x = atInn(seed); sleepDays(x, 30); return dead(x); });
  assert(avg(n) <= 1.5 && Math.max(...n) <= 4, 'morti per seme: ' + n.join(', '));
  return 'morti per seme: ' + n.join(', ');
});
check('2. Un anno reale di gioco (365 giorni): media ≤ 10 morti su 32, mai più di 14, ma la morte e le ferite restano', () => {
  const rows = SEEDS.map(seed => { const x = atInn(seed); let hurt = 0; sleepDays(x, 365, () => { hurt += people(x).filter(p => p.status === 'injured' || p.status === 'critical').length; });
    const rounds = Object.values(x.Game.s.conflicts.regions).reduce((s, r) => s + r.round, 0); return { seed, dead: dead(x), hurt, rounds, near: people(x).reduce((s, p) => s + p.nearDeath, 0) }; });
  year.push(...rows);
  const n = rows.map(r => r.dead);
  assert(avg(n) <= 10 && Math.max(...n) <= 14, 'morti per seme: ' + n.join(', '));
  assert(n.some(v => v > 0), 'nessuno muore più in nessun seme: la morte permanente è sparita');
  assert(rows.every(r => r.hurt > 30), 'ferite troppo rare: ' + rows.map(r => r.hurt).join(', '));
  assert(rows.every(r => r.rounds > 365), 'scontri quasi spariti: ' + rows.map(r => r.rounds).join(', '));
  return rows.map(r => `seme ${r.seed}: ${r.dead} morti, ${r.near} in fin di vita, ${r.rounds} scontri, ${r.hurt} giorni-persona feriti`).join(' · ');
});
check('3. Chi cade in fin di vita può sopravvivere grazie ai vicini, ma non sempre (letalità fra 10 e 60 %)', () => {
  const rows = year.length ? year : [];
  const near = rows.reduce((s, r) => s + r.near, 0), d = rows.reduce((s, r) => s + r.dead, 0);
  assert(near >= 10, 'troppo pochi casi: ' + near);
  assert(d / near >= .1 && d / near <= .6, `letalità ${(100 * d / near).toFixed(0)} % (${d} su ${near})`);
  return `${d} morti su ${near} in fin di vita`;
});
check('4. Dormire e vivere otto giorni hanno conseguenze coerenti (differenza ≤ 2 morti; regioni lontane identiche)', () => {
  const notes = [];
  for (const seed of SEEDS.slice(0, 3)) {
    const a = atInn(seed), b = atInn(seed);
    for (const x of [a, b]) x.frames(Math.round((((6 * 60 - x.Calendar.view(x.Game.s.calendar, x.Game.s.time, x.Game.s.region).minutes) + 1440) % 1440) / x.Calendar.minutesPerSecond * 60));
    a.frames(8 * 108000); for (let d = 0; d < 8; d++) assert(b.Game.command('sleep'));
    assert(Math.abs(a.Game.s.time - b.Game.s.time) < 1, `secondi diversi: ${a.Game.s.time} e ${b.Game.s.time}`);
    assert(Math.abs(dead(a) - dead(b)) <= 2, `seme ${seed}: vissuti ${dead(a)}, dormiti ${dead(b)}`);
    notes.push(`${seed}: ${dead(a)}/${dead(b)}`);
  }
  return 'morti vissuti/dormiti ' + notes.join(' · ');
});
check('5. Salvare e ricaricare a metà non cambia le conseguenze demografiche', () => {
  for (const seed of SEEDS.slice(0, 2)) {
    const a = atInn(seed), b = atInn(seed);
    sleepDays(a, 40);
    sleepDays(b, 17); assert(b.Game.importSave(b.Game.exportSave()), 'salvataggio rifiutato'); sleepDays(b, 23);
    const sig = x => JSON.stringify(Object.entries(x.Game.s.conflicts.people).map(([id, p]) => [id, p.status, p.hp, p.nearDeath, p.kills]).sort());
    assert.equal(sig(b), sig(a), 'seme ' + seed);
  }
});
check('6. Nessuno è immortale: un colpo devastante senza soccorso uccide anche i personaggi importanti', () => {
  for (const id of ['elder', 'merchant', 'smith', 'guard-valley']) {
    const x = atInn(SEEDS[0]); x.Conflicts.damageNpc(x.Game.s, id, 9999, { cause: 'Prova', point: { region: 'valley', x: 700, y: 600 } });
    assert.equal(x.Conflicts.condition(x.Game.s, id).status, 'critical'); x.Game.s.time += 200; x.Conflicts.tick(x.Game.s, 1 / 60, {});
    assert.equal(x.Conflicts.condition(x.Game.s, id).status, 'dead', id + ' è sopravvissuto a un colpo devastante senza soccorso');
  }
});
check('7. I compagni di gilda in stato critico dipendono ancora dal giocatore (decisione del 2026-11-21)', () => {
  let tried = 0;
  for (const seed of SEEDS) {
    const x = atInn(seed), s = x.Game.s, id = Object.keys(s.society.people)[0];
    s.guild.team = [id]; x.Conflicts.damageNpc(s, id, 1, { point: { region: 'valley', x: 700, y: 600 }, cause: 'Prova' });
    const p = s.conflicts.people[id]; p.hp = 5; x.Conflicts.damageNpc(s, id, 9, { point: { region: 'valley', x: 700, y: 600 }, cause: 'Prova' });
    assert.equal(p.status, 'critical'); s.time += 200; x.Conflicts.tick(s, 1 / 60, {});
    assert.equal(p.status, 'dead', 'un compagno è stato salvato dai vicini'); tried++;
  }
  return tried + ' semi';
});
check('8. Conta chi combatte: un soldato addestrato vince e si ritira meglio di un civile; il rischio cresce col pericolo', () => {
  const x = atInn(SEEDS[0]), o = x.Conflicts.odds;
  assert.equal(typeof o, 'function', 'manca Conflicts.odds');
  const soldier = { role: 'Soldato', race: 'orc', hp: 87, attack: 13 }, civil = { role: 'Residente', race: 'human', hp: 78, attack: 8 }, old = { role: 'Custode', race: 'elder', hp: 68, attack: 9 }, dwarf = { role: 'Soldato', race: 'dwarf', hp: 87, attack: 13 }, elf = { role: 'Soldato', race: 'elf', hp: 87, attack: 13 };
  const low = 'moth', high = 'crystalguard';
  assert(o(soldier, { experience: 0 }, low).win > o(civil, { experience: 0 }, low).win, 'professione ed equipaggiamento');
  assert(o(soldier, { experience: 40 }, low).win > o(soldier, { experience: 0 }, low).win, 'esperienza');
  assert(o(civil, { experience: 0 }, low).win > o(old, { experience: 0 }, low).win, 'età');
  assert(o(soldier, { experience: 0 }, low).win > o(soldier, { experience: 0 }, high).win, 'pericolo');
  assert(o(elf, { experience: 0 }, low).escape > o(dwarf, { experience: 0 }, low).escape, 'specie e fuga');
  const all = [soldier, civil, old, dwarf, elf].flatMap(n => [low, high].map(t => o(n, { experience: 0 }, t)));
  assert(all.every(v => v.win > 0 && v.win < 1 && v.escape > 0 && v.escape < 1), 'nessun esito certo');
});
check('9. Mutazione: ritirata a piena forza e nessun soccorso dei vicini → la strage viene rilevata', () => {
  const src = fs.readFileSync(path.join(root, 'npc-conflicts.js'), 'utf8');
  assert(src.includes('/*SOCCORSO*/') && src.includes('/*RITIRATA*/'), 'punti da mutare assenti');
  // Criterio: la mutazione deve violare le stesse soglie delle prove 1 e 3 (morti in 30 giorni e letalità), non un numero scelto a parte.
  const rows = SEEDS.slice(0, 3).map(seed => { const x = atInn(seed, t => t.replace('/*SOCCORSO*/', 'false&&').replace('/*RITIRATA*/', 'true||')); sleepDays(x, 60); return [dead(x), people(x).reduce((n, p) => n + p.nearDeath, 0)]; });
  const d = rows.reduce((n, r) => n + r[0], 0), near = rows.reduce((n, r) => n + r[1], 0);
  assert(d / rows.length / 2 > 1.5 || d / near > .6, `mutazione non rilevata: ${d} morti su ${near}`);
  return `${d} morti su ${near} in fin di vita in 60 giorni con la mutazione (3 semi)`;
});
const fails = results.filter(r => r === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
