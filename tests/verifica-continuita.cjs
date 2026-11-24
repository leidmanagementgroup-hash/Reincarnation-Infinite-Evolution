// PERF-005 fase 2: continuità di borghi e conflitti fra tempo vissuto e tempo dormito. Motore reale in Node, seme fisso.
// Uso:   node tests/verifica-continuita.cjs        (ONLY=1,3 per eseguire solo alcuni passi)
// Due partite identiche alla locanda di Vela; A vive le ore fotogramma per fotogramma (1/60 s), B dorme fino alle 06:00
// (Game.command('sleep'), l'unico salto di tempo del gioco). Contratto:
//   - borghi (Society): stesso stato dopo una notte e dopo un sonno lungo (23 ore);
//   - conflitti delle regioni lontane: stesse persone, stessi nodi, stessi turni (gli impulsi stanno su una griglia assoluta
//     e durante il sonno si risolvono tutti, non uno solo);
//   - conflitto vicino al giocatore durante il sonno: risolto in forma astratta (non resta bloccato fino al risveglio); non può
//     essere identico allo scontro vissuto fotogramma per fotogramma con mostri che si muovono, e la prova non lo pretende;
//   - stesso seme, stesso risultato; salvataggi vecchi (impulso non allineato) accettati.
//   - regione del giocatore, regola prudente: chi diventa critico durante il sonno non muore dormendo e al risveglio ha di nuovo
//     il tempo pieno per il soccorso; avvisi del sonno riassunti in poche righe; un guasto a metà recupero non fa ripetere
//     l'impulso già applicato; un impulso futuro nel salvataggio non congela i conflitti (prove 8–11).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const SEED = 19425;
const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 360)); }
};
function surface() {
  const pixels = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData(_x, _y, w, h) { return pixels.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (t, k) => k in t ? t[k] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}
function load() {
  const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, performance, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
  return scope;
}
// Partita alla locanda di Vela all'ora indicata (minuti del giorno).
function atInn(minute, seed = SEED) {
  // seed: semi diversi per cercare casi rari (prova 9).
  const x = load();
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${seed} / 4294967296; if (k === 1) return .24;
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, x);
  assert(x.Game.newGame());
  x.minute = () => x.Calendar.view(x.Game.s.calendar, x.Game.s.time, x.Game.s.region).minutes;
  x.frames = n => { for (let i = 0; i < n; i++) x.Game.step(1 / 60, {}); };
  for (let i = 0; i < 12 && x.Game.s.region !== 'valley'; i++) {
    const g = x.World.route(x.Game.s.region, 'valley', x.Game.s.campaign.stage); Object.assign(x.Game.s.player, { x: g.x, y: g.y }); x.frames(2); x.Game.action('interact'); x.frames(2);
  }
  const inn = x.Tradecraft.inn; Object.assign(x.Game.s.player, { x: inn.x, y: inn.y + 14 }); x.frames(2);
  // Si arriva all'ora voluta vivendo il tempo (gli impulsi del mondo restano veri); minute null: subito, a inizio partita.
  const target = minute === null ? 0 : ((minute - x.minute()) + 1440) % 1440;
  x.frames(Math.round(target / x.Calendar.minutesPerSecond * 60));
  return x;
}
// Una partita vive fino alle 06:00, l'altra dorme: stesso punto di partenza (stesso seme, stesse azioni).
function pair(minute) {
  const a = atInn(minute), b = atInn(minute);
  const toSix = ((6 * 60 - a.minute()) + 1440) % 1440;
  a.frames(Math.round(toSix / a.Calendar.minutesPerSecond * 60));
  assert(b.Game.command('sleep'), 'sonno rifiutato');
  return { a, b, hours: toSix / 60 };
}
const json = x => JSON.stringify(x, (k, v) => typeof v === 'bigint' ? String(v) : v);
function remote(x) {
  const c = x.Game.s.conflicts, here = x.Game.s.region;
  // Record completi: stato, punti vita, esperienza, posizione, scadenze, e per ogni nodo turno, prossima scadenza e scontro attivo.
  const people = Object.fromEntries(Object.entries(c.people).filter(([, p]) => p.point?.region !== here));
  const nodes = Object.fromEntries(Object.entries(c.regions).filter(([r]) => r !== here));
  return { people, nodes };
}
// Prime differenze fra due strutture, come percorsi leggibili (per i messaggi di errore).
function diffs(a, b, at = '', out = []) {
  if (out.length >= 6) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], at + '.' + k, out);
  } else if (json(a) !== json(b)) out.push(`${at}: ${json(a)} contro ${json(b)}`);
  return out;
}
const sameSeconds = (a, b) => assert(Math.abs(a.Game.s.time - b.Game.s.time) < .05, `secondi diversi: ${a.Game.s.time} contro ${b.Game.s.time}`);

let night = null;
check('1. Borghi: stessa notte vissuta e dormita (dalle 21:00)', () => {
  night = pair(21 * 60);
  sameSeconds(night.a, night.b);
  assert.equal(json(night.b.Game.s.society.towns), json(night.a.Game.s.society.towns), 'borghi diversi');
  assert.equal(json(night.b.Game.s.society.people), json(night.a.Game.s.society.people), 'abitanti dei borghi diversi');
  return `${night.hours.toFixed(1)} ore`;
});
check('2. Borghi: sonno lungo (dalle 07:00, 23 ore) uguale al tempo vissuto', () => {
  const { a, b, hours } = pair(7 * 60);
  sameSeconds(a, b);
  assert.equal(json(b.Game.s.society.towns), json(a.Game.s.society.towns), 'borghi diversi dopo un sonno lungo');
  assert.equal(json(b.Game.s.society.people), json(a.Game.s.society.people), 'abitanti diversi dopo un sonno lungo');
  return `${hours.toFixed(1)} ore`;
});
check('3. Conflitti delle regioni lontane: stessa notte vissuta e dormita', () => {
  const { a, b } = night || pair(21 * 60);
  const ra = remote(a), rb = remote(b);
  assert(Object.keys(ra.nodes).length >= 3, 'troppe poche regioni lontane con conflitti: ' + Object.keys(ra.nodes).length);
  const rounds = Object.values(ra.nodes).reduce((n, x) => n + x.round, 0);
  assert(Object.values(ra.nodes).some(n => n.active) || rounds > 0, 'nessuno scontro da confrontare');
  assert(rounds > Object.keys(ra.nodes).length, 'nella notte vissuta non è successo quasi nulla: ' + rounds + ' turni');
  assert.equal(json(rb), json(ra), 'conflitti lontani diversi (vissuta contro dormita): ' + diffs(ra, rb).join(' | '));
  return `${Object.keys(ra.nodes).length} regioni lontane, ${rounds} turni, ${Object.keys(ra.people).length} persone coinvolte`;
});
check('4. Conflitto vicino al giocatore: durante il sonno si risolve in forma astratta e non resta bloccato', () => {
  const b = atInn(21 * 60), here = b.Game.s.region;
  const before = b.Game.s.conflicts.regions[here]?.round ?? 0;
  assert(b.Game.command('sleep'), 'sonno rifiutato');
  const node = b.Game.s.conflicts.regions[here];
  assert(node, 'nessun nodo nella regione corrente');
  assert(!node.active || node.active.until > b.Game.s.time, 'conflitto della regione corrente scaduto ma ancora attivo al risveglio');
  assert(node.round >= before + 2, `turni nella regione corrente durante il sonno: ${node.round - before}`);
  return `turni durante il sonno nella regione corrente: ${node.round - before}`;
});
check('7. Borghi a inizio partita: livelli che superano la soglia durante il sonno, accordo indipendente dall’ordine', () => {
  const { a, b, hours } = pair(null);
  sameSeconds(a, b);
  const levels = Object.values(b.Game.s.society.towns).map(t => t.level).join('');
  assert.equal(json(b.Game.s.society.towns), json(a.Game.s.society.towns), 'borghi diversi a inizio partita');
  return `${hours.toFixed(1)} ore, livelli finali ${levels}`;
});
check('8. Avvisi del sonno riassunti: poche righe, nessuna richiesta di soccorso per chi è già morto', () => {
  const x = atInn(21 * 60);
  x.Game.s.time += 1800; // un giorno intero di sonno, come nel caso peggiore
  const notices = x.Conflicts.tick(x.Game.s, 0, {});
  const text = notices.join(' · ');
  assert(notices.length <= 4, notices.length + ' avvisi: ' + text.slice(0, 200));
  assert(text.length <= 360, 'avviso di ' + text.length + ' caratteri');
  const dead = x.Conflicts.view(x.Game.s).entries.filter(e => e.status === 'dead').map(e => e.name);
  for (const name of dead) assert(!new RegExp(name + '[^·]*pozione').test(text), 'soccorso chiesto per ' + name + ', già morto');
  return text || '(nessun evento)';
});

check('9. Nella regione del giocatore chi diventa critico durante il sonno si può ancora soccorrere al risveglio', () => {
  let cases = 0; const notes = [];
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]) {
    const x = atInn(null, seed), here = x.Game.s.region;
    const before = new Map(Object.entries(x.Game.s.conflicts.people).map(([id, p]) => [id, p.status]));
    assert(x.Game.command('sleep'), 'sonno rifiutato');
    const now = x.Game.s.time;
    for (const [id, p] of Object.entries(x.Game.s.conflicts.people)) {
      if (p.point?.region !== here || before.get(id) === 'critical') continue;
      assert.notEqual(p.status, 'dead', `seme ${seed}: ${id} è morto durante il sonno nella regione del giocatore senza possibilità di soccorso`);
      if (p.status === 'critical') { cases++; assert(p.deadline >= now + 100, `seme ${seed}: ${id} critico con ${Math.round(p.deadline - now)} s al risveglio`); notes.push(seed + ':' + id); }
    }
  }
  assert(cases > 0, 'nessun caso di stato critico durante il sonno nei semi provati: prova non conclusiva');
  return `${cases} casi (${notes.slice(0, 4).join(', ')})`;
});

check('10. Un errore a metà del recupero non fa ripetere gli impulsi già applicati', () => {
  const counted = x => { const original = x.Society.entry; let calls = 0; x.Society.entry = (...a) => { calls++; return original(...a); }; return () => calls; };
  const dry = atInn(21 * 60), calls = counted(dry);
  dry.Game.s.time += 600; dry.Conflicts.tick(dry.Game.s, 0, {});
  const total = calls();
  assert(total > 4, 'troppe poche chiamate per un guasto a metà: ' + total);
  const x = atInn(21 * 60), st = x.Game.s.conflicts, start = st.pulse, original = x.Society.entry;
  x.Game.s.time += 600;
  let n = 0, thrown = false, at = null;
  x.Society.entry = (...a) => { if (++n === Math.ceil(total / 2)) { at = x.Game.s.time; throw new Error('guasto di prova'); } return original(...a); };
  const real = x.Game.s.time;
  try { x.Conflicts.tick(x.Game.s, 0, {}); } catch { thrown = true; } finally { x.Society.entry = original; }
  assert(thrown, 'il guasto di prova non è stato raggiunto');
  assert.equal(x.Game.s.time, real, 'dopo il guasto il tempo non è tornato al valore reale');
  assert(st.pulse > start + 1.05, 'impulsi applicati ma non registrati: ' + start + ' → ' + st.pulse);
  // Anche l'impulso guasto, già applicato in parte, non si ripete: il registro è oltre il suo istante.
  assert(st.pulse > at + 1e-6, `l'impulso guasto (${at}) si ripeterebbe: registro a ${st.pulse}`);
  return `guasto alla chiamata ${Math.ceil(total / 2)} di ${total}; impulso registrato ${Math.round(st.pulse - start)} s dopo l’inizio`;
});

check('11. Salvataggio con un impulso dei conflitti nel futuro: i conflitti non restano congelati', () => {
  const x = atInn(21 * 60);
  const save = JSON.parse(x.Game.exportSave());
  save.conflicts.pulse = save.time + 1e6;
  assert(x.Game.importSave(JSON.stringify(save)), 'salvataggio rifiutato');
  x.frames(120);
  assert(x.Game.s.conflicts.pulse <= x.Game.s.time + 1.06, 'impulso ancora nel futuro: ' + (x.Game.s.conflicts.pulse - x.Game.s.time));
});

check('5. Stesso seme e stesse azioni: due sonni identici', () => {
  const x = atInn(21 * 60), y = atInn(21 * 60);
  assert(x.Game.command('sleep') && y.Game.command('sleep'));
  assert.equal(json([y.Game.s.conflicts, y.Game.s.society]), json([x.Game.s.conflicts, x.Game.s.society]));
});
check('6. Salvataggi vecchi: impulso dei conflitti non allineato accettato e riallineato', () => {
  const x = atInn(21 * 60);
  const save = JSON.parse(x.Game.exportSave());
  save.conflicts.pulse = save.time + .3337;
  assert(x.Game.importSave(JSON.stringify(save)), 'salvataggio rifiutato');
  x.frames(600);
  assert(x.Game.command('sleep'), 'sonno rifiutato dopo il caricamento');
  const p = x.Game.s.conflicts.pulse;
  assert(Math.abs(p / 1.05 - Math.round(p / 1.05)) < 1e-6, 'impulso non allineato alla griglia: ' + p);
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
