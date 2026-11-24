// PERF-005 (qualità): come prosegue il mondo quando passa il tempo. Motore reale in Node, seme fisso, nessuna modifica al gioco.
// Uso:   node tests/verifica-tempo-mondo.cjs            (tutte le prove brevi; ONLY=1,4 per alcune)
//        ONLY=12 node tests/verifica-tempo-mondo.cjs    (90 sonni consecutivi, lunga)
//        ONLY=13 node tests/verifica-tempo-mondo.cjs    (365 sonni consecutivi e ritorno dopo un anno, molto lunga)
// Scenari: sonno (una notte, più notti, sonno lungo), inattività e deriva fra i due orologi (`s.time` e calendario),
// dungeon (Cripta di Ardel, Santuario della Marea Muta), città e continenti, salvataggio e ricaricamento a metà scenario,
// ritorno in una regione dopo mesi e anni. Le prove falliscono solo per violazioni reali (NaN, quantità negative, BigInt non
// valide, registro dei flussi non in pari, calendario incoerente, sistemi fermi, registri oltre il tetto, salvataggio
// rifiutato o non identico); i comportamenti attesi ma imperfetti (deriva fra gli orologi, RISK-012) sono «OSSERVAZIONI».
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const SEED = 19425;
const results = [];
const notes = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const DEFAULT = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '14'];
const wanted = name => { const n = name.split('.')[0]; return only.length ? only.includes(n) : DEFAULT.includes(n); };
const check = (name, fn) => {
  if (!wanted(name)) return;
  const t0 = performance.now();
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '') + ` [${((performance.now() - t0) / 1000).toFixed(1)} s]`); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 600)); }
};
const observe = text => { notes.push(text); console.log('     OSSERVAZIONE: ' + text); };

// ---------- caricatore del motore reale (come tests/verifica-continuita.cjs)
function surface() {
  const pixels = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData(_x, _y, w, h) { return pixels.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (t, k) => k in t ? t[k] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}
const MODULES = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
const SOURCES = new Map(MODULES.map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
// Mutazioni per verificare che le prove rilevino violazioni vere: si applicano SOLO in memoria al sorgente caricato nel
// contesto vm (i file del gioco non cambiano). Uso: MUTATE=borghi ONLY=3 node tests/verifica-tempo-mondo.cjs
const MUTATIONS = {
  borghi: ['society.js', 'const steps=Math.min(30,now-soc.pulse);soc.pulse=now;', 'const steps=Math.min(30,now-soc.pulse);soc.pulse=Math.min(now,soc.pulse+12);'],
  economia: ['trade-economy.js', 'for(const profile of profiles)s.economy.markets[profile.id].day=Math.max(s.economy.markets[profile.id].day,day);', ''],
  registro: ['market-flows.js', 'if(row&&amount)row[field]=String(big(row[field])+big(amount));', "if(row&&amount&&field!=='eaten')row[field]=String(big(row[field])+big(amount));"],
  fame: ['daily-life.js', 'd.hunger=clamp(d.hunger-elapsed*.022*race.hunger*weight,0,100);', 'd.hunger=d.hunger-elapsed*.022*race.hunger*weight;'],
  conflitti: ['npc-conflicts.js', 'MAX_PULSES=2400;', 'MAX_PULSES=3;'],
  ricarica: ['engine.js', "function exportSave(){if(!s)return '';Inventory.sync(s);return JSON.stringify(s);}",
    "function exportSave(){if(!s)return '';Inventory.sync(s);return JSON.stringify({...s,conflicts:{...s.conflicts,pulse:s.conflicts.pulse+1.05}});}"],
};
if (process.env.MUTATE) {
  const [file, from, to] = MUTATIONS[process.env.MUTATE] || [];
  if (!file || !SOURCES.get(file).includes(from)) throw new Error('mutazione sconosciuta o non applicabile: ' + process.env.MUTATE);
  SOURCES.set(file, SOURCES.get(file).replace(from, to));
  console.log(`MUTAZIONE ATTIVA (solo in memoria): ${process.env.MUTATE} in ${file}`);
}
function load() {
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, performance, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of MODULES) { if (file === 'audio.js') break; vm.runInContext(SOURCES.get(file), scope, { filename: file }); }
  helpers(scope);
  return scope;
}
// Generatore deterministico per Math.random (il mondo non lo usa; il motore sì per il seme della partita e per effetti).
const seedRandom = (x, seed, salt = 4242) => vm.runInContext(`Math.random = (() => { let n = 0, z = ${salt}; return () => { const k = n++;
  if (k === 0 && ${seed} !== null) return ${seed} / 4294967296; if (k === 1 && ${seed} !== null) return .24;
  z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, x);
function helpers(x) {
  x.stamp = () => x.Calendar.timestamp(x.Game.s.calendar, x.Game.s.time);            // minuti di calendario assoluti
  x.minute = () => x.Calendar.minuteAt(x.Game.s.calendar, x.Game.s.time);
  x.day = () => x.Calendar.absoluteDays(x.Game.s.calendar, x.Game.s.time);
  x.frames = (n, elapsed) => { for (let i = 0; i < n; i++) x.Game.step(1 / 60, {}, elapsed ?? 1 / 60); };
  x.liveMinutes = m => x.frames(Math.round(m / x.Calendar.minutesPerSecond * 60));
  x.travel = target => {
    for (let i = 0; i < 16 && x.Game.s.region !== target; i++) {
      const g = x.World.route(x.Game.s.region, target, x.Game.s.campaign.stage);
      if (!g) throw new Error(`nessuna rotta da ${x.Game.s.region} a ${target}`);
      Object.assign(x.Game.s.player, { x: g.x, y: g.y }); x.frames(2); x.Game.action('interact'); x.frames(2);
    }
    if (x.Game.s.region !== target) throw new Error('viaggio non riuscito verso ' + target + ' (fermo a ' + x.Game.s.region + ')');
  };
  x.toInn = () => { x.travel('valley'); const inn = x.Tradecraft.inn; Object.assign(x.Game.s.player, { x: inn.x, y: inn.y + 14 }); x.frames(2); };
  x.sleep = () => x.Game.command('sleep');
}
function begin(seed = SEED) {
  const x = load();
  seedRandom(x, seed);
  assert(x.Game.newGame(), 'nuova partita rifiutata');
  return x;
}
// Partita alla locanda di Vela all'ora indicata (minuti del giorno), arrivando all'ora vivendo il tempo.
function atInn(minute, seed = SEED) {
  const x = begin(seed);
  x.toInn();
  if (minute !== null) x.liveMinutes(((minute - x.minute()) + 1440) % 1440);
  return x;
}
const json = x => JSON.stringify(x, (k, v) => typeof v === 'bigint' ? String(v) : v);
function diffs(a, b, at = '', out = [], limit = 6) {
  if (out.length >= limit) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], at + '.' + k, out, limit);
  } else if (json(a) !== json(b)) out.push(`${at}: ${json(a)?.slice(0, 60)} contro ${json(b)?.slice(0, 60)}`);
  return out;
}
const countDiffs = (a, b) => diffs(a, b, '', [], 1e9).length;

// ---------- invarianti
const DECIMAL = /^(0|[1-9][0-9]*)$/, SIGNED = /^-?(0|[1-9][0-9]*)$/;
// Restituisce l'elenco delle violazioni dello stato vivo `s`.
function invariants(x) {
  const s = x.Game.s, bad = [];
  const walk = (v, at) => {
    if (bad.length > 12) return;
    if (typeof v === 'number') { if (!Number.isFinite(v)) bad.push(`${at} non finito (${v})`); }
    else if (typeof v === 'bigint') bad.push(`${at} è una BigInt viva nello stato (il salvataggio JSON fallirebbe)`);
    else if (v && typeof v === 'object') for (const [k, w] of Object.entries(v)) walk(w, at + '.' + k);
  };
  walk(s, 's');
  const nonNeg = (v, at) => { if (typeof v === 'number' && v < 0) bad.push(`${at} negativo (${v})`); };
  const dec = (v, at, signed = false) => {
    if (typeof v === 'number') { if (!Number.isSafeInteger(v) || (!signed && v < 0)) bad.push(`${at} quantità non valida (${v})`); return; }
    if (typeof v !== 'string' || !(signed ? SIGNED : DECIMAL).test(v)) bad.push(`${at} BigInt decimale non valida (${json(v)})`);
  };
  const p = s.player;
  for (const k of ['gold', 'potions', 'kills', 'xp', 'hp', 'mp', 'level']) nonNeg(p[k], 'player.' + k);
  for (const [k, v] of Object.entries(p.inventory || {})) nonNeg(v, 'player.inventory.' + k);
  for (const [k, v] of Object.entries(s.bag?.stock || {})) dec(v, 'bag.stock.' + k);
  for (const [k, v] of Object.entries(s.bag?.deposit || {})) dec(v, 'bag.deposit.' + k);
  if (s.economy) dec(s.economy.balance, 'economy.balance');            // saldo in banca: canonico e non negativo (restore lo esige)
  for (const [m, market] of Object.entries(s.economy?.markets || {})) for (const [g, v] of Object.entries(market.stock || {})) dec(v, `economy.markets.${m}.stock.${g}`);
  const f = s.economy?.flows;
  if (f) {
    for (const [m, row] of Object.entries(f.opening || {})) for (const [g, v] of Object.entries(row)) dec(v, `flows.opening.${m}.${g}`);
    for (const [m, row] of Object.entries(f.ledger || {})) for (const [g, l] of Object.entries(row)) for (const [k, v] of Object.entries(l)) dec(v, `flows.ledger.${m}.${g}.${k}`, k === 'external');
    for (const [kind, rows] of Object.entries(f.carry || {})) for (const [m, row] of Object.entries(rows)) for (const [g, v] of Object.entries(row)) nonNeg(v, `flows.carry.${kind}.${m}.${g}`);
    for (const [i, ship] of (f.shipments || []).entries()) if (!(Number.isSafeInteger(ship.qty) && ship.qty >= 1)) bad.push(`flows.shipments[${i}].qty non valida (${ship.qty})`);
    const problems = x.MarketFlows.audit(f, x.Economy.profiles, s.economy.markets);
    if (problems.length) bad.push('registro dei flussi non in pari: ' + json(problems.slice(0, 2)));
  }
  for (const k of ['hunger', 'thirst', 'energy']) { const v = s.daily?.[k]; if (!(v >= 0 && v <= 100)) bad.push(`daily.${k} fuori da 0..100 (${v})`); }
  for (const [id, q] of Object.entries(s.conflicts?.people || {})) if (!(q.hp >= 0 && q.hp <= q.maxHp)) bad.push(`conflicts.people.${id}.hp fuori intervallo (${q.hp}/${q.maxHp})`);
  // Registri con tetto (valori letti nei moduli: world-memory MAX_EPISODES 60, world-renown MAX_DEEDS 40, conflitti 32 eventi,
  // world-life 8 notizie e 260 visite, ricordi dei residenti ≤ 8).
  const caps = [['memory.episodes', s.memory?.episodes, 60], ['renown.deeds', s.renown?.deeds, 40], ['conflicts.events', s.conflicts?.events, 32],
    ['life.news', s.life?.news, 8], ['life.visits', s.life?.visits && Object.keys(s.life.visits), 260]];
  for (const [id, list, cap] of caps) if (list && list.length > cap) bad.push(`${id}: ${list.length} voci oltre il tetto ${cap}`);
  for (const [id, q] of Object.entries(s.urban?.people || {})) if (Array.isArray(q?.memories) && q.memories.length > 8) bad.push(`urban.people.${id}.memories oltre 8`);
  try { JSON.parse(x.Game.exportSave()); } catch (e) { bad.push('salvataggio non serializzabile: ' + e.message); }
  return bad;
}
const healthy = (x, where) => { const bad = invariants(x); assert.equal(bad.length, 0, `${where}: ` + bad.slice(0, 6).join(' | ')); };

// Istantanea dei «battiti» dei sistemi del mondo: serve a verificare che avanzino.
function pulses(x) {
  const s = x.Game.s;
  return {
    stamp: x.stamp(), day: x.day(), minute: x.minute(), time: s.time, offset: s.calendar.offset,
    economyDay: s.economy?.flows?.day, marketDays: Object.values(s.economy?.markets || {}).map(m => m.day),
    shipments: s.economy?.flows?.shipments?.length ?? 0,
    lifePulse: s.life?.nextPulse, societyPulse: s.society?.pulse, conflictsPulse: s.conflicts?.pulse,
    conflictRounds: Object.values(s.conflicts?.regions || {}).reduce((n, r) => n + (r.round || 0), 0),
    urbanPulse: s.urban?.pulse, build: json(s.build).length, dailyLast: s.daily?.last,
  };
}
const saveBytes = x => Buffer.byteLength(x.Game.exportSave());

// ======================================================================================================================
function main() {
// 1–3. Sonno
check('1. Sonno di una notte (21:00 → 06:00): calendario esatto, sistemi avanzati, nessuna violazione', () => {
  const x = atInn(21 * 60);
  const a = pulses(x);
  assert(x.sleep(), 'sonno rifiutato');
  const b = pulses(x);
  assert.equal(b.minute, 360, 'risveglio non alle 06:00: ' + b.minute);
  assert.equal(b.day, a.day + 1, 'giorni avanzati: ' + (b.day - a.day));
  assert(Math.abs((b.stamp - a.stamp) - 9 * 60) < 1.5, 'minuti di calendario avanzati: ' + (b.stamp - a.stamp));
  assert.equal(b.offset, a.offset, 'il sonno non deve spostare la deriva del calendario');
  worldAtToday(x, a, b, 'dopo una notte');
  assert(b.societyPulse > a.societyPulse, `borghi fermi: ${a.societyPulse} → ${b.societyPulse}`);
  assert(b.conflictRounds > a.conflictRounds, 'nessun turno di conflitto durante la notte');
  healthy(x, 'dopo il sonno');
  return `+${(b.stamp - a.stamp).toFixed(1)} min, s.time +${(b.time - a.time).toFixed(1)} s, turni +${b.conflictRounds - a.conflictRounds}, economia giorno ${b.economyDay}`;
});

check('2. Sette notti consecutive (sonno alle 06:00 di ogni risveglio): 24 h esatte per sonno, sistemi al giorno corrente', () => {
  const x = atInn(21 * 60);
  assert(x.sleep(), 'primo sonno rifiutato');
  const rows = [];
  for (let n = 0; n < 7; n++) {
    x.frames(2);                                  // l'interfaccia disegna almeno un fotogramma fra due comandi
    const a = pulses(x);
    assert(x.sleep(), 'sonno rifiutato alla notte ' + (n + 2));
    const b = pulses(x);
    assert.equal(b.day, a.day + 1, `notte ${n + 2}: giorni avanzati ${b.day - a.day}`);
    assert.equal(b.minute, 360, `notte ${n + 2}: risveglio alle ${b.minute}`);
    assert(Math.abs(b.stamp - a.stamp - 1440) < 0.05, `notte ${n + 2}: ${b.stamp - a.stamp} minuti invece di 1440`);
    worldAtToday(x, a, b, 'notte ' + (n + 2));
    rows.push(b.conflictRounds - a.conflictRounds);
  }
  healthy(x, 'dopo sette notti');
  return `turni di conflitto per notte: ${rows.join(', ')}; Velaris scorte al giorno ${x.Game.s.urban.city.lastDay}`;
});

check('3. Sonno lungo dalle 07:00 (23 ore): calendario esatto, borghi e conflitti non congelati', () => {
  const x = atInn(7 * 60);
  const a = pulses(x);
  assert(x.sleep(), 'sonno rifiutato');
  const b = pulses(x);
  assert.equal(b.minute, 360); assert.equal(b.day, a.day + 1);
  assert(Math.abs(b.stamp - a.stamp - 23 * 60) < 1.5, 'minuti: ' + (b.stamp - a.stamp));
  worldAtToday(x, a, b, 'sonno lungo');
  healthy(x, 'dopo il sonno lungo');
  return `+${((b.stamp - a.stamp) / 60).toFixed(2)} h, s.time +${(b.time - a.time).toFixed(0)} s (tetto dei borghi 30 blocchi = 1950 s), turni +${b.conflictRounds - a.conflictRounds}`;
});

// 4–6. Inattività e i due orologi
check('4. Inattività: 6 ore di gioco di fotogrammi senza input alla locanda, nessuna deriva con fotogrammi regolari', () => {
  const x = atInn(9 * 60);
  const a = pulses(x);
  const t0 = performance.now();
  x.liveMinutes(6 * 60);                         // 27 000 fotogrammi da 1/60 s
  const ms = performance.now() - t0;
  const b = pulses(x);
  assert(Math.abs(b.stamp - a.stamp - 360) < 0.05, 'minuti di calendario: ' + (b.stamp - a.stamp));
  assert.equal(b.offset, a.offset, 'con elapsed = dt la deriva non deve cambiare');
  assert(b.conflictsPulse > a.conflictsPulse && b.conflictsPulse <= x.Game.s.time + 1.06, 'impulso dei conflitti congelato');
  assert(b.lifePulse > a.lifePulse, 'impulso di world-life fermo');
  assert(b.societyPulse > a.societyPulse, 'borghi fermi');
  assert.equal(b.economyDay, x.Calendar.view(x.Game.s.calendar, x.Game.s.time).day, 'economia non al giorno corrente');
  healthy(x, 'dopo 6 ore di inattività');
  return `27 000 fotogrammi in ${(ms / 1000).toFixed(1)} s (${(ms / 27000 * 1000).toFixed(0)} µs per fotogramma), giocatore ${x.Game.s.player.hp.toFixed(0)} PV`;
});

check('5. Deriva fra s.time e calendario con fotogrammi lenti (10 fps: dt 0,05 s, elapsed 0,1 s): misura e sistemi che la vedono', () => {
  // A vive 2 ore di calendario a 60 fps; B le stesse 2 ore a 10 fps come farebbe interface.js (dt = min(0,05, elapsed),
  // Calendar.advance(elapsed − dt)). Stesso minuto di calendario alla fine; in B s.time avanza la metà.
  const A = atInn(10 * 60), B = atInn(10 * 60);
  const a0 = pulses(B);
  A.liveMinutes(120);
  const frames = Math.round(120 / B.Calendar.minutesPerSecond / 0.1);
  for (let i = 0; i < frames; i++) B.Game.step(0.05, {}, 0.1);
  const a = pulses(A), b = pulses(B);
  assert(Math.abs(a.stamp - b.stamp) < 0.05, `calendari diversi alla fine: ${a.stamp} contro ${b.stamp}`);
  const drift = (b.offset - a0.offset);           // minuti di calendario non coperti da s.time
  assert(Math.abs(drift - 60) < 0.5, 'deriva attesa 60 minuti, misurata ' + drift);
  healthy(B, 'con fotogrammi lenti');
  const systems = {
    'economia (giorno di calendario)': x => [x.Game.s.economy.flows.day, x.Game.s.economy.markets],
    'Velaris, scorte': x => x.Game.s.urban.city,
    'bisogni (Daily, calendario)': x => [Math.round(x.Game.s.daily.hunger * 1e6), Math.round(x.Game.s.daily.thirst * 1e6), x.Game.s.daily.last],
    'borghi (blocchi di 65 s di s.time)': x => [x.Game.s.society.pulse, x.Game.s.society.towns],
    'conflitti (griglia 1,05 s di s.time)': x => [x.Game.s.conflicts.pulse, x.Game.s.conflicts.regions],
    'world-life (impulso su s.time)': x => x.Game.s.life.nextPulse,
    'risorse della regione (s.time)': x => x.Game.s.resourceTimes,
  };
  const seen = Object.entries(systems).map(([name, pick]) => `${name}: ${countDiffs(pick(A), pick(B)) ? 'VEDE la deriva' : 'uguale'}`);
  observe(`deriva a 10 fps: +${drift.toFixed(1)} min di calendario in 2 h (${(drift / 120 * 100).toFixed(0)} %); s.time ${(b.time - a0.time).toFixed(1)} s contro ${(a.time - a0.time).toFixed(1)} s. ` + seen.join('; '));
  return `deriva ${drift.toFixed(1)} min in 2 h di calendario`;
});

check('6. Fotogramma bloccato (elapsed 3 600 s con dt 1/60, come dopo una sospensione senza blur/visibilitychange)', () => {
  const x = atInn(10 * 60);
  const a = pulses(x), hunger = x.Game.s.daily.hunger;
  x.Game.step(1 / 60, {}, 3600);
  const jump = pulses(x);                         // subito dopo il fotogramma bloccato
  // L'economia si aggiorna all'impulso di world-life (orologio s.time) o alla prima lettura di un mercato: entro pochi secondi.
  let wait = 0;
  while (x.Game.s.economy.flows.day < x.Calendar.view(x.Game.s.calendar, x.Game.s.time).day && wait < 600) { x.frames(1); wait++; }
  x.frames(150 - wait);                          // almeno un impulso di world-life (circa 1,15 s di s.time) per i bisogni
  const b = pulses(x);
  healthy(x, 'dopo il fotogramma bloccato');
  assert.equal(b.economyDay, x.Calendar.view(x.Game.s.calendar, x.Game.s.time).day, `economia non recuperata dopo ${wait} fotogrammi`);
  observe(`dopo il fotogramma bloccato l'economia resta al giorno ${a.economyDay} per ${wait} fotogrammi (${(wait / 60).toFixed(2)} s), fino al prossimo impulso su s.time`);
  observe(`un fotogramma con elapsed 3 600 s sposta il calendario di ${(jump.stamp - a.stamp).toFixed(0)} min (${((jump.stamp - a.stamp) / 1440).toFixed(2)} giorni) e s.time di ${(jump.time - a.time).toFixed(4)} s; dopo altri 150 fotogrammi: ` +
    `economia +${b.economyDay - a.economyDay} giorni, fame ${hunger.toFixed(1)} → ${x.Game.s.daily.hunger.toFixed(1)}, critico ${x.Game.s.daily.critical.toFixed(0)}; ` +
    `borghi ${b.societyPulse - a.societyPulse} blocchi, impulsi dei conflitti +${(b.conflictsPulse - a.conflictsPulse).toFixed(2)} s: nessun tetto su elapsed in Game.step né in frame() di interface.js`);
  return `calendario +${(b.stamp - a.stamp).toFixed(0)} min in un fotogramma`;
});

// 7–8. Dungeon
check('7. Cripta di Ardel: entrata, un\'ora dentro, uscita, tre notti fuori, ritorno (istantanea congelata e tempo coerente)', () => {
  const x = atInn(10 * 60), G = x.Game;
  const p0 = pulses(x);
  x.travel('ardel-crypt');
  const p1 = pulses(x);
  assert(p1.stamp - p0.stamp < 5, 'il viaggio ha spostato il calendario di ' + (p1.stamp - p0.stamp) + ' minuti');
  assert.equal(x.World.regions[G.s.region].continent, 'continent-1');
  // Nel dungeon non si dorme: il comando è rifiutato e non tocca né il tempo né il calendario.
  const t = G.s.time, st = x.stamp();
  assert.equal(x.sleep(), false, 'sonno accettato nella cripta');
  assert.equal(G.s.time, t); assert.equal(x.stamp(), st);
  // Il giocatore raccoglie una risorsa (ricomparsa a s.time + 65 s), poi resta un'ora.
  const res = x.World.points.resources[0];
  Object.assign(G.s.player, { x: res.x, y: res.y }); x.frames(2);
  assert(G.action('interact'), 'raccolta rifiutata');
  const regrow = G.s.resourceTimes[0];
  assert(regrow > G.s.time, 'tempo di ricomparsa non impostato');
  const inside0 = pulses(x);
  x.liveMinutes(60);
  const inside1 = pulses(x);
  assert(inside1.conflictRounds > inside0.conflictRounds, 'conflitti del resto del mondo fermi mentre si è nella cripta');
  assert(inside1.conflictsPulse <= G.s.time + 1.06, 'impulso dei conflitti congelato nella cripta');
  assert(inside1.societyPulse > inside0.societyPulse, 'borghi fermi mentre si è nella cripta');
  assert.equal(inside1.economyDay, x.Calendar.view(G.s.calendar, G.s.time).day);
  healthy(x, 'nella cripta');
  x.travel('ancient-valley');
  const frozen = json(G.s.regions['ardel-crypt']);
  assert(frozen, 'istantanea della cripta non conservata');
  x.toInn();
  for (let n = 0; n < 3; n++) { assert(x.sleep(), 'sonno rifiutato'); x.frames(2); }
  assert.equal(json(G.s.regions['ardel-crypt']), frozen, 'l\'istantanea della cripta è cambiata durante l\'assenza');
  const away = pulses(x);
  x.travel('ardel-crypt');
  const back = JSON.parse(frozen);
  assert.equal(G.s.monsters.length, back.monsters.length);
  for (const [i, m] of G.s.monsters.entries()) assert(m.type === back.monsters[i].type && m.hp === back.monsters[i].hp, 'mostro ' + i + ' diverso al ritorno');
  assert.equal(G.s.resourceTimes[0], regrow, 'tempo di ricomparsa della risorsa cambiato');
  assert(G.s.resourceTimes[0] <= G.s.time, 'dopo tre giorni la risorsa non è di nuovo disponibile');
  healthy(x, 'al ritorno nella cripta');
  return `viaggio +${(p1.stamp - p0.stamp).toFixed(1)} min; nella cripta turni +${inside1.conflictRounds - inside0.conflictRounds}; ritorno dopo ${away.day - inside1.day} giorni, risorsa disponibile (ricomparsa a ${regrow.toFixed(0)} s, ora ${G.s.time.toFixed(0)} s)`;
});

check('8. Santuario della Marea Muta (seme 128, ingresso a winter-citadel): entrata, mezz\'ora, uscita, continente coerente', () => {
  const x = begin(128), G = x.Game;
  const e = G.s.legendary.entrance;
  assert(e, 'il seme 128 non ha un ingresso al santuario');
  x.travel(e.region);
  const before = pulses(x);
  Object.assign(G.s.player, { x: e.x, y: e.y }); x.frames(3);
  assert(G.action('interact'), 'ingresso rifiutato');
  assert.equal(G.s.region, 'nadir-vault');
  assert.equal(x.World.regions['nadir-vault'].continent, x.World.regions[e.region].continent, 'continente del santuario diverso da quello dell\'ingresso');
  assert.equal(x.sleep(), false, 'sonno accettato nel santuario');
  x.liveMinutes(30);
  const inside = pulses(x);
  assert(inside.conflictRounds > before.conflictRounds, 'conflitti fermi nel santuario');
  healthy(x, 'nel santuario');
  Object.assign(G.s.player, { x: x.LegendaryLand.exit.x, y: x.LegendaryLand.exit.y }); x.frames(3);
  assert(G.action('interact'), 'uscita rifiutata');
  assert.equal(G.s.region, e.region);
  assert(G.s.regions['nadir-vault'], 'istantanea del santuario non conservata');
  assert.equal(G.s.legendary.visits, 1);
  // Il salvataggio con il santuario visitato resta valido (validateRegions del modulo leggendario).
  assert(G.importSave(G.exportSave()), 'salvataggio con il santuario visitato rifiutato');
  healthy(x, 'dopo l\'uscita');
  return `continente ${x.World.regions['nadir-vault'].continent}; +${(inside.stamp - before.stamp).toFixed(0)} min, turni +${inside.conflictRounds - before.conflictRounds}`;
});

// 9. Città, interni e continenti
check('9. Città e continenti: Velaris (e locanda), Filoni, Calis e i loro interni; sonno nel letto di Velaris; cambi ripetuti nello stesso giorno', () => {
  const x = atInn(8 * 60), G = x.Game;
  const tour = [['city-velaris', 'continent-3'], ['city-velaris-inn', 'continent-3'], ['city-velaris', 'continent-3'],
    ['city-filoni', 'continent-2'], ['city-filoni-larch-inn', 'continent-2'], ['city-calis', 'continent-5'],
    ['city-calis-saffron-inn', 'continent-5'], ['valley', 'continent-1']];
  const hops = [];
  let last = pulses(x);
  for (const [id, continent] of tour) {
    x.travel(id);
    const now = pulses(x);
    assert.equal(x.World.regions[id].continent, continent, `${id}: continente ${x.World.regions[id].continent}`);
    assert(now.stamp >= last.stamp && now.stamp - last.stamp < 10, `${id}: calendario ${last.stamp} → ${now.stamp}`);
    assert(now.conflictsPulse <= G.s.time + 1.06, `${id}: impulso dei conflitti congelato`);
    healthy(x, 'a ' + id);
    // Mezz'ora di gioco in ogni luogo: il resto del mondo prosegue.
    x.liveMinutes(30);
    const after = pulses(x);
    // (30 minuti = 37,5 s di s.time: meno di un blocco dei borghi, 65 s; si controllano gli impulsi più fitti)
    assert(after.conflictsPulse > now.conflictsPulse && after.lifePulse > now.lifePulse && Math.floor(G.s.time / 65) - after.societyPulse <= 1,
      `${id}: mondo fermo durante la sosta (${json([now.conflictsPulse, after.conflictsPulse, now.lifePulse, after.lifePulse, after.societyPulse])})`);
    assert.equal(after.economyDay, x.Calendar.view(G.s.calendar, G.s.time).day, `${id}: economia non al giorno corrente`);
    hops.push(id.replace('city-', ''));
    last = after;
  }
  // Nella città all'aperto non si dorme; nel letto della locanda di Velaris sì.
  x.travel('city-velaris');
  assert.equal(x.sleep(), false, 'sonno accettato in strada a Velaris');
  x.travel('city-velaris-inn');
  const bed = x.UrbanWorld.site(G.s, 'inn-bed');
  assert(bed, 'letto della locanda di Velaris non trovato');
  Object.assign(G.s.player, bed.point || bed); x.frames(2);
  const a = pulses(x);
  assert(x.sleep(), 'sonno rifiutato nel letto della locanda di Velaris');
  const b = pulses(x);
  assert.equal(b.minute, 360); assert.equal(b.day, a.day + 1);
  worldAtToday(x, a, b, 'sonno a Velaris');
  // Cambi di regione ripetuti nello stesso giorno: nessuna crescita di stato né duplicati.
  x.frames(2); x.travel('city-velaris');
  const size0 = saveBytes(x), regions0 = Object.keys(G.s.regions).length;
  for (let i = 0; i < 12; i++) { x.travel(i % 2 ? 'city-velaris' : 'verdant-canopy'); }
  x.travel('city-velaris');
  assert.equal(Object.keys(G.s.regions).length, regions0, 'numero di regioni salvate cambiato con i cambi ripetuti');
  assert(Math.abs(saveBytes(x) - size0) < 2048, `salvataggio cresciuto di ${saveBytes(x) - size0} byte con 12 cambi di regione`);
  healthy(x, 'dopo i cambi ripetuti');
  return `${hops.join(' → ')}; regioni salvate ${regions0}; salvataggio ${(saveBytes(x) / 1024).toFixed(1)} KB`;
});

// 10. Salvataggio e ricaricamento a metà scenario
check('10. Salva e ricarica a metà scenario: stessa continuazione senza ricaricare, ricaricando nella stessa pagina e in una pagina nuova', () => {
  // Continuazione comune: inattività, sonno, tre notti, cripta, Velaris, ritorno alla locanda.
  const steps = [
    x => x.liveMinutes(90), x => { assert(x.sleep(), 'sonno rifiutato'); x.frames(2); },
    x => { for (let n = 0; n < 3; n++) { assert(x.sleep()); x.frames(2); } },
    x => x.travel('ardel-crypt'), x => x.liveMinutes(10),
    /* secondo punto di salvataggio: dentro la cripta */
    x => x.liveMinutes(10), x => x.travel('ancient-valley'), x => x.travel('city-velaris'), x => x.liveMinutes(30),
    x => x.toInn(), x => x.liveMinutes(10)];
  // Stessa sequenza di Math.random dal punto di salvataggio in poi in tutte le partite (il mondo non la usa; il motore sì
  // per alcuni effetti), così una differenza può venire solo dal ricaricamento.
  const run = (x, from, to, salt) => { if (salt) seedRandom(x, null, salt); for (let i = from; i < to; i++) steps[i](x); return x; };
  const end = x => JSON.parse(x.Game.exportSave());
  const A = atInn(21 * 60), B = atInn(21 * 60);
  A.liveMinutes(30); B.liveMinutes(30);
  const raw = B.Game.exportSave();
  assert.equal(raw, A.Game.exportSave(), 'le due partite divergono già prima del salvataggio');
  assert(B.Game.importSave(raw), 'salvataggio rifiutato (stessa pagina)');
  const C = load();
  assert(C.Game.importSave(raw), 'salvataggio rifiutato (pagina nuova)');
  const ra = end(run(A, 0, steps.length, 777)), rb = end(run(B, 0, steps.length, 777)), rc = end(run(C, 0, steps.length, 777));
  assert.equal(countDiffs(ra, rb), 0, 'continuazione diversa dopo il ricaricamento nella stessa pagina: ' + diffs(ra, rb).join(' | '));
  assert.equal(countDiffs(ra, rc), 0, 'continuazione diversa dopo il ricaricamento in una pagina nuova: ' + diffs(ra, rc).join(' | '));
  healthy(C, 'dopo la continuazione ricaricata');
  // Secondo punto: salvataggio dentro la cripta, dopo quattro notti, ricaricato in una pagina nuova.
  const D = load(), E = load();
  assert(D.Game.importSave(raw) && E.Game.importSave(raw));
  run(D, 0, 5, 777); run(E, 0, 5, 777);
  const mid = E.Game.exportSave(), F = load();
  assert.equal(E.Game.s.region, 'ardel-crypt');
  assert(F.Game.importSave(mid), 'salvataggio nella cripta rifiutato');
  const rd = end(run(D, 5, steps.length, 778)), rf = end(run(F, 5, steps.length, 778));
  assert.equal(countDiffs(rd, rf), 0, 'continuazione diversa dopo il ricaricamento nella cripta: ' + diffs(rd, rf).join(' | '));
  return `salvataggio di ${(raw.length / 1024).toFixed(1)} KB; continuazioni identiche senza ricaricare, nella stessa pagina, in una pagina nuova e dalla cripta (${(JSON.stringify(ra).length / 1024).toFixed(1)} KB alla fine, giorno ${C.day()})`;
});

// 11. Living World nel tempo: una voce lontana arriva a Vela lo stesso giorno vivendo o dormendo, poi la memoria decade
check('11. Living World: voce da Filoni (2 giorni di viaggio) uguale vivendo 33 ore o dormendo due notti; decadimento dopo 20 giorni', () => {
  const A = atInn(21 * 60), B = atInn(21 * 60);
  // Renown.deed è l'API pubblica usata da careers.js, world-requests.js e world-memory.js per registrare un'impresa.
  const text = 'Ha consegnato un carico di prova al mercato dei filoni';
  for (const x of [A, B]) assert(x.Renown.deed(x.Game.s, { kind: 'commerce', market: 'filoni', text }), 'impresa rifiutata');
  const arrival = A.Renown.arrival(A.Game.s.renown.deeds.at(-1), 'vela');
  A.liveMinutes(((6 * 60 - A.minute()) + 1440) % 1440 + 1440);
  assert(B.sleep()); B.frames(2); assert(B.sleep());
  for (const x of [A, B]) x.frames(120);       // almeno un impulso di world-life, che chiama Renown.tick
  assert(Math.abs(A.stamp() - B.stamp()) < 0.1, `calendari diversi: ${A.stamp()} contro ${B.stamp()}`);
  assert.equal(A.day(), arrival, 'giorno di arrivo atteso ' + arrival + ', calendario ' + A.day());
  const lw = x => [x.Game.s.renown, x.Game.s.memory, x.Game.s.requests];
  assert.equal(countDiffs(lw(A), lw(B)), 0, 'Living World diverso fra tempo vissuto e sonno: ' + diffs(lw(A), lw(B)).join(' | '));
  const heard = B.Game.s.memory.episodes.find(e => e.npc === 'merchant' && e.kind === 'heard-praise');
  assert(heard, 'la voce non è diventata un ricordo di Tessa: ' + json(B.Game.s.memory.episodes));
  assert.equal(heard.day, arrival, 'ricordo datato al giorno ' + heard.day + ' invece del giorno di arrivo ' + arrival);
  const o0 = B.WorldMemory.opinion(B.Game.s, 'merchant');
  for (let n = 0; n < 20; n++) { assert(B.sleep()); B.frames(2); }
  const o20 = B.WorldMemory.opinion(B.Game.s, 'merchant');
  assert(Number.isFinite(o0) && Number.isFinite(o20) && Math.abs(o20) < Math.abs(o0), `opinione di Tessa non decaduta: ${o0} → ${o20}`);
  assert(B.Game.s.memory.episodes.includes(heard) || B.Game.s.memory.episodes.some(e => e.npc === 'merchant' && e.day === arrival), 'ricordo perso dopo 20 giorni');
  healthy(B, 'dopo 20 giorni');
  return `voce arrivata il giorno ${arrival} in entrambe; opinione di Tessa ${o0.toFixed(3)} → ${o20.toFixed(3)} dopo 20 giorni (emivita 10)`;
});

check('14. Un giorno intero di inattività (108 000 fotogrammi) contro 24 ore di sonno, sistema per sistema', () => {
  const A = atInn(6 * 60), B = atInn(6 * 60);
  const t0 = performance.now();
  A.liveMinutes(1440);
  const liveMs = performance.now() - t0;
  assert(B.sleep(), 'sonno rifiutato');
  for (const x of [A, B]) x.frames(2);
  assert(Math.abs(A.Game.s.time - B.Game.s.time) < 0.05, `secondi diversi: ${A.Game.s.time} contro ${B.Game.s.time}`);
  assert(Math.abs(A.stamp() - B.stamp()) < 0.05, 'calendari diversi');
  for (const x of [A, B]) healthy(x, x === A ? 'giorno vissuto' : 'giorno dormito');
  const here = A.Game.s.region;
  const remote = x => ({ people: Object.fromEntries(Object.entries(x.Game.s.conflicts.people).filter(([, p]) => p.point?.region !== here)),
    regions: Object.fromEntries(Object.entries(x.Game.s.conflicts.regions).filter(([r]) => r !== here)) });
  const local = x => ({ people: Object.fromEntries(Object.entries(x.Game.s.conflicts.people).filter(([, p]) => p.point?.region === here)), region: x.Game.s.conflicts.regions[here] });
  // Contratto (SIMULATION_LOD §1 e §6 fase 2): uguali; il conflitto della regione del giocatore è diverso per scelta.
  const contract = {
    'economia (mercati, flussi, carovane)': x => x.Game.s.economy, 'Velaris, scorte': x => x.Game.s.urban.city,
    'borghi (Society)': x => x.Game.s.society, 'costruzioni': x => x.Game.s.build,
    'Living World': x => [x.Game.s.memory, x.Game.s.requests, x.Game.s.renown],
    'mostri congelati delle altre regioni': x => Object.fromEntries(Object.entries(x.Game.s.regions).filter(([id]) => id !== x.Game.s.region)),
  };
  const broken = [];
  for (const [name, pick] of Object.entries(contract)) { const n = countDiffs(pick(A), pick(B)); if (n) broken.push(`${name}: ${n} differenze (${diffs(pick(A), pick(B), '', [], 2).join(' | ')})`); }
  assert.equal(broken.length, 0, broken.join(' · '));
  // Conflitti lontani: il sonno deve risolvere (quasi) tutti gli impulsi; piccole differenze di partecipanti sono il limite
  // noto RISK-012 e restano un'osservazione, un sonno che salta gli impulsi è una violazione.
  const rounds = x => Object.values(remote(x).regions).reduce((n, r) => n + (r.round || 0), 0);
  assert(rounds(B) >= rounds(A) * 0.9, `turni dei conflitti lontani: ${rounds(A)} vissuti contro ${rounds(B)} dormiti`);
  const nr = countDiffs(remote(A), remote(B)), nl = countDiffs(local(A), local(B));
  if (nr) observe(`conflitti delle regioni lontane dopo 24 h: ${nr} differenze fra giorno vissuto e dormito (limite noto RISK-012 o altro), es. ${diffs(remote(A), remote(B), '', [], 3).join(' | ')}`);
  observe(`conflitto della regione del giocatore dopo 24 h: ${nl} differenze (atteso: scontro vissuto contro forma astratta). Giorno vissuto in ${(liveMs / 1000).toFixed(1)} s (${(liveMs / 108000 * 1000).toFixed(0)} µs per fotogramma)`);
  return `contratto rispettato per economia, Velaris, borghi, costruzioni, Living World e mostri congelati; conflitti lontani ${nr ? nr + ' differenze (osservazione)' : 'uguali'}`;
});

// 12–13. Ritorno dopo mesi e anni
check('12. Ritorno dopo 90 giorni di sonni consecutivi (Velaris, cripta, salvataggio dopo tre mesi)', () => longRun(90));
check('13. Ritorno dopo 365 giorni di sonni consecutivi (un anno: Velaris, cripta, salvataggio, crescita, memoria)', () => longRun(365));

}
// Arrays più lunghi del salvataggio (percorsi generalizzati), per vedere quali registri crescono.
function arrays(save) {
  const out = new Map();
  const walk = (v, at) => {
    if (Array.isArray(v)) { const k = at.replace(/\.\d+/g, '[]'); out.set(k, Math.max(out.get(k) || 0, v.length)); v.forEach((w, i) => walk(w, at + '.' + i)); }
    else if (v && typeof v === 'object') for (const [k, w] of Object.entries(v)) walk(w, at + '.' + k);
  };
  walk(save, '');
  return out;
}
function heapMB() { if (global.gc) global.gc(); return process.memoryUsage().heapUsed / 1048576; }
function longRun(days) {
  const heap0 = heapMB();
  const x = atInn(10 * 60), G = x.Game;
  // Prima dell'assenza: visita a Velaris e alla cripta (raccolta di una risorsa), poi ritorno alla locanda.
  x.travel('city-velaris'); x.liveMinutes(20);
  x.travel('ardel-crypt');
  const res = x.World.points.resources[1];
  Object.assign(G.s.player, { x: res.x, y: res.y }); x.frames(2);
  assert(G.action('interact'), 'raccolta rifiutata nella cripta');
  x.travel('ancient-valley');
  const crypt = json(G.s.regions['ardel-crypt']);
  x.toInn();
  const start = pulses(x), sizes = { 0: saveBytes(x) }, lens = {};
  const perDay = [], marks = new Set([30, 90, 180, 365]);
  let worst = 0;
  const deadAt = {}, curve = [];                  // giorno della morte di ogni NPC dei conflitti (osservazione)
  for (let d = 1; d <= days; d++) {
    const t0 = performance.now(), a = pulses(x);
    assert(x.sleep(), 'sonno rifiutato al giorno ' + d);
    x.frames(2);
    const ms = performance.now() - t0, b = pulses(x);
    perDay.push(ms); worst = Math.max(worst, ms);
    for (const [id, q] of Object.entries(G.s.conflicts.people)) if (q.status === 'dead' && !(id in deadAt)) deadAt[id] = d;
    if ([7, 30, 90, 365].includes(d)) curve.push(`g${d} ${Object.keys(deadAt).length}`);
    assert.equal(b.day, a.day + 1, `giorno ${d}: calendario +${b.day - a.day}`);
    assert.equal(b.minute, 360, `giorno ${d}: risveglio alle ${b.minute}`);
    worldAtToday(x, a, b, 'giorno ' + d);
    if (d % 10 === 0 || d === days) healthy(x, 'giorno ' + d);
    if (marks.has(d)) { sizes[d] = saveBytes(x); lens[d] = arrays(JSON.parse(G.exportSave())); }
  }
  const end = pulses(x);
  const date = x.Calendar.view(G.s.calendar, G.s.time).date, needs = G.s.daily;
  const statuses = {};
  for (const q of Object.values(G.s.conflicts.people)) statuses[q.status] = (statuses[q.status] || 0) + 1;
  const condition = `bisogni al risveglio: fame ${needs.hunger.toFixed(0)}, sete ${needs.thirst.toFixed(0)}, energia ${needs.energy.toFixed(0)}; ` +
    `conflitti: ${end.conflictRounds - start.conflictRounds} turni, persone ${json(statuses)} su ${Object.keys(G.s.conflicts.people).length}, morti cumulati ${curve.join(', ')}, ` +
    `Nerea morta il giorno ${deadAt.elder ?? '—'}, Tessa ${deadAt.merchant ?? '—'}, Ivo ${deadAt.smith ?? '—'} (nessun rimpiazzo dei morti)`;
  // Ritorno a Velaris: residenti presenti, economia e scorte al giorno corrente.
  x.travel('city-velaris');
  const residents = x.UrbanLife.actors(G.s).length;
  x.liveMinutes(20);
  assert(residents > 0, 'nessun residente a Velaris al ritorno');
  assert.equal(G.s.economy.flows.day, x.Calendar.view(G.s.calendar, G.s.time).day);
  assert.equal(G.s.urban.city.lastDay, x.day());
  healthy(x, 'a Velaris dopo ' + days + ' giorni');
  // Ritorno nella cripta: istantanea congelata ripristinata, risorsa ricomparsa (orologio s.time coerente col sonno).
  x.travel('ardel-crypt');
  const back = JSON.parse(crypt);
  assert(G.s.monsters.every((m, i) => m.type === back.monsters[i].type && m.hp === back.monsters[i].hp), 'mostri della cripta diversi al ritorno');
  assert(G.s.resourceTimes[1] <= G.s.time, 'risorsa della cripta non ricomparsa dopo ' + days + ' giorni');
  healthy(x, 'nella cripta dopo ' + days + ' giorni');
  // Salvataggio dopo l'assenza: accettato e con la stessa continuazione in una pagina nuova.
  x.toInn();
  const raw = G.exportSave(), y = load();
  assert(y.Game.importSave(raw), `salvataggio rifiutato dopo ${days} giorni (${(raw.length / 1024).toFixed(1)} KB, s.time ${G.s.time.toFixed(0)})`);
  for (const z of [x, y]) { seedRandom(z, null, 999); z.liveMinutes(30); assert(z.sleep()); z.frames(2); }
  const ra = JSON.parse(G.exportSave()), rb = JSON.parse(y.Game.exportSave());
  assert.equal(countDiffs(ra, rb), 0, 'continuazione diversa dopo il ricaricamento: ' + diffs(ra, rb).join(' | '));
  // Crescita del salvataggio e registri.
  const last = Math.max(...Object.keys(sizes).map(Number));
  const ref = sizes[90] ?? sizes[30];
  const top = [...lens[last]].sort((p, q) => q[1] - p[1]).slice(0, 6).map(([k, n]) => `${k}=${n}`).join(', ');
  const growing = [...lens[last]].filter(([k, n]) => lens[30]?.get(k) !== undefined && n > lens[30].get(k)).map(([k, n]) => `${k} ${lens[30].get(k)}→${n}`);
  if (last > 90) assert(sizes[last] <= ref * 1.25 + 8192, `salvataggio cresciuto da ${ref} a ${sizes[last]} byte fra il giorno 90 e il giorno ${last}`);
  const avg = list => list.reduce((n, v) => n + v, 0) / list.length;
  const early = avg(perDay.slice(0, 30)), late = avg(perDay.slice(-30));
  assert(late < early * 3 + 5, `il costo per giorno cresce: ${early.toFixed(1)} ms all'inizio, ${late.toFixed(1)} ms alla fine`);
  const heap1 = heapMB();
  observe(`${days} giorni: ${avg(perDay).toFixed(1)} ms per giorno simulato (primi 30: ${early.toFixed(1)}, ultimi 30: ${late.toFixed(1)}, massimo ${worst.toFixed(0)}); ` +
    `salvataggio ${Object.entries(sizes).map(([d, n]) => `g${d} ${(n / 1024).toFixed(1)} KB`).join(', ')}; heap ${heap0.toFixed(0)} → ${heap1.toFixed(0)} MB${global.gc ? ' (dopo gc)' : ' (senza gc esplicito)'}; ` +
    `array più lunghi: ${top}; registri cresciuti dal giorno 30: ${growing.slice(0, 8).join(', ') || 'nessuno'}; ${condition}; PV dopo il ritorno ${G.s.player.hp.toFixed(0)}`);
  return `giorno ${end.day} (${date}), s.time ${G.s.time.toFixed(0)} s, ${residents} residenti a Velaris al ritorno, salvataggio ${(sizes[last] / 1024).toFixed(1)} KB`;
}
// Il mondo è al giorno corrente dopo un salto: economia, scorte di Velaris, impulso dei conflitti, borghi.
function worldAtToday(x, a, b, where) {
  const s = x.Game.s, today = x.Calendar.view(s.calendar, s.time).day;
  assert.equal(b.economyDay, today, `${where}: economia al giorno ${b.economyDay}, calendario ${today}`);
  assert(b.marketDays.every(d => d === today), `${where}: mercati non al giorno corrente: ${b.marketDays}`);
  assert.equal(s.urban.city.lastDay, x.day(), `${where}: scorte di Velaris al giorno ${s.urban.city.lastDay}, calendario ${x.day()}`);
  assert(b.conflictsPulse > a.conflictsPulse && b.conflictsPulse <= s.time + 1.06, `${where}: impulso dei conflitti congelato (${a.conflictsPulse} → ${b.conflictsPulse}, s.time ${s.time})`);
  // I borghi si aggiornano nel sonno e poi all'impulso di world-life (ogni ~1,15 s di s.time): al più un blocco indietro.
  const block = Math.floor(s.time / 65);
  assert(b.societyPulse <= block && block - b.societyPulse <= 1, `${where}: borghi al blocco ${b.societyPulse}, atteso ${block}`);
  assert(b.lifePulse <= s.time + 1e-9 || b.lifePulse > a.lifePulse, `${where}: impulso di world-life nel futuro senza avanzare`);
}

module.exports = { load, begin, atInn, invariants, pulses, diffs, countDiffs, json, saveBytes, seedRandom };
if (require.main !== module) return;
main();
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
if (notes.length) console.log(`${notes.length} osservazioni riportate (non sono fallimenti).`);
process.exit(fails ? 1 : 0);
