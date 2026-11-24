// PERF-005 fase 1 (in ombra): orchestratore della simulazione a livelli `world-sim.js`, provato da solo in Node.
// Uso:   node tests/verifica-world-sim.cjs        (ONLY=2,5 per eseguire solo alcuni passi)
// Il modulo non è ancora nella build né collegato al motore: le prove lo caricano direttamente con sistemi di prova.
// Contratto verificato: intervalli allineati a una griglia assoluta (ogni minuto risolto una volta, senza buchi né
// sovrapposizioni); tempo vissuto a piccoli passi = tempo saltato; ordine globale nel tempo fra sistemi, quindi risultato
// indipendente dal budget per fotogramma; budget rispettato; recupero lungo compresso; nessuna storia retroattiva alla prima
// registrazione; ripristino che non rifiuta mai; registrazioni non valide rifiutate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.resolve(__dirname, '..', 'world-sim.js');
const results = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const check = (name, fn) => {
  if (only.length && !only.includes(name.split('.')[0])) return;
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 300)); }
};
function fresh(mutate = null) {
  const scope = { console };
  scope.window = scope;
  vm.createContext(scope);
  let source = fs.readFileSync(file, 'utf8');
  if (mutate) source = mutate(source);
  vm.runInContext(source, scope, { filename: 'world-sim.js' });
  return scope.WorldSim;
}
const same = (a, b, label) => assert.equal(JSON.stringify(b), JSON.stringify(a), label);
// Sistema di prova: registra gli intervalli e tiene un contatore che cresce di (a − da).
function recorder(W, id, level, step, extra = {}) {
  const log = [];
  W.register(id, { level, step, resolve: (s, from, to, info) => { log.push([from, to, !!info?.compressed]); s.counters[id] = (s.counters[id] || 0) + (to - from); extra.onResolve?.(s, from, to); }, maxChunks: 1e6, ...extra.spec });
  return log;
}
const START = 3 * 1440 + 21 * 60 + 7; // giorno 3, 21:07 (non allineato)

check('1. Intervalli allineati: ogni minuto risolto una volta, senza buchi né sovrapposizioni', () => {
  const W = fresh(), s = { world: W.create(START), counters: {} };
  const log = recorder(W, 'ore', 3, 60);
  let now = START;
  for (const jump of [1, 5, 59, 61, 120, 7, 300, 1440, 3]) { now += jump; W.tick(s, now, { budgetMs: Infinity }); }
  assert(log.length > 0, 'nessun intervallo risolto');
  for (const [from, to] of log) { assert.equal(from % 60, 0, 'inizio non allineato ' + from); assert.equal(to - from, 60, 'passo diverso ' + (to - from)); }
  for (let i = 1; i < log.length; i++) assert.equal(log[i][0], log[i - 1][1], 'buco o sovrapposizione fra ' + log[i - 1] + ' e ' + log[i]);
  assert.equal(log[0][0], Math.ceil(START / 60) * 60, 'la prima ora risolta non è quella dopo la registrazione');
  assert(log.at(-1)[1] <= now && now - log.at(-1)[1] < 60, 'resta indietro più di un passo');
  return `${log.length} ore risolte da ${log[0][0]} a ${log.at(-1)[1]}`;
});

check('2. Tempo vissuto a piccoli passi = tempo saltato (tre giorni)', () => {
  const run = live => {
    const W = fresh(), s = { world: W.create(START), counters: {} };
    const log = recorder(W, 'ore', 3, 60), days = recorder(W, 'giorni', 5, 1440);
    if (live) for (let m = START + 1; m <= START + 3 * 1440; m++) W.tick(s, m, { budgetMs: Infinity });
    else W.resolveAll(s, START + 3 * 1440);
    return { log, days, counters: s.counters, world: s.world };
  };
  const a = run(true), b = run(false);
  same(a, b, 'stato diverso fra tempo vissuto e saltato');
  return `${a.log.length} ore e ${a.days.length} giorni identici`;
});

check('3. Ordine globale nel tempo: il risultato non dipende dal budget per fotogramma', () => {
  const run = budget => {
    const W = fresh(), s = { world: W.create(START), counters: {}, seen: [] };
    // «città» (orario) legge il contatore del «continente» (giornaliero) alla fine di ogni ora: dipende dall'ordine.
    recorder(W, 'continente', 5, 1440);
    recorder(W, 'citta', 3, 60, { onResolve: (st, from, to) => st.seen.push([to, st.counters.continente || 0]) });
    const end = START + 5 * 1440;
    if (budget === null) W.resolveAll(s, end);
    else { let guard = 0; while (W.lag(s, end) > 0 && guard++ < 1e5) W.tick(s, end, { budgetMs: budget, clock: (() => { let t = 0; return () => (t += 1); })() }); }
    return { seen: s.seen, counters: s.counters };
  };
  const all = run(null), slow = run(2), slower = run(1);
  // Ordine cronologico: alla fine dell'ora «to» la città vede esattamente i giorni del continente già conclusi (a parità di
  // confine, prima il livello più alto).
  const dayStart = Math.ceil(START / 1440) * 1440;
  for (const [to, c] of all.seen) assert.equal(c, Math.max(0, Math.floor((to - dayStart) / 1440)) * 1440, 'ordine non cronologico all’ora ' + to);
  same(all, slow, 'risultato diverso con budget di 2'); same(all, slower, 'risultato diverso con budget di 1');
  return `${all.seen.length} ore lette nello stesso ordine con tre budget diversi`;
});

check('4. Budget per fotogramma rispettato, poi il ritardo si recupera', () => {
  const W = fresh(), s = { world: W.create(START), counters: {} };
  const log = recorder(W, 'ore', 3, 60);
  let t = 0; const clock = () => t; // ogni intervallo «costa» 1 unità di tempo
  W.register('lento', { level: 4, step: 60, resolve: () => { t += 1; }, maxChunks: 1e6 });
  const end = START + 3 * 1440, perTick = [];
  for (let i = 0; i < 200 && W.lag(s, end) > 0; i++) { const before = log.length; W.tick(s, end, { budgetMs: 3, clock }); perTick.push(log.length - before); }
  assert.equal(W.lag(s, end), 0, 'ritardo non recuperato');
  assert(Math.max(...perTick) <= 4, 'un fotogramma ha superato il budget: ' + Math.max(...perTick) + ' intervalli');
  return `${perTick.length} fotogrammi, al massimo ${Math.max(...perTick)} intervalli per fotogramma`;
});

check('5. Recupero lungo compresso: oltre il tetto un solo intervallo «compresso», poi passi normali', () => {
  const W = fresh(), s = { world: W.create(START), counters: {} };
  const log = recorder(W, 'giorni', 4, 1440, { spec: { maxChunks: 30 } });
  W.tick(s, START, { budgetMs: Infinity });
  const end = START + 400 * 1440;
  W.resolveAll(s, end);
  const compressed = log.filter(x => x[2]);
  assert.equal(compressed.length, 1, 'intervalli compressi: ' + compressed.length);
  assert.equal(log.filter(x => !x[2]).length, 30, 'passi normali dopo la compressione');
  assert.equal(s.counters.giorni, log.at(-1)[1] - log[0][0], 'minuti persi o duplicati');
  for (let i = 1; i < log.length; i++) assert.equal(log[i][0], log[i - 1][1]);
  return `1 intervallo compresso di ${(compressed[0][1] - compressed[0][0]) / 1440} giorni + 30 giorni normali`;
});

check('6. Nessuna storia retroattiva: un sistema parte dal primo confine dopo l’origine del mondo', () => {
  const W = fresh(), s = { world: W.create(10 * 1440), counters: {} };
  const log = recorder(W, 'ore', 3, 60);
  W.tick(s, 10 * 1440 + 30, { budgetMs: Infinity });
  assert.equal(log.length, 0, 'risolti intervalli prima della registrazione');
  W.tick(s, 10 * 1440 + 61, { budgetMs: Infinity });
  same([[10 * 1440, 10 * 1440 + 60, false]], log, 'prima ora sbagliata');
});

check('7. Ripristino: salvataggi mancanti o danneggiati non vengono mai rifiutati', () => {
  const W = fresh(), now = 5 * 1440;
  for (const raw of [undefined, null, 'x', 7, [], { schema: 2 }, { schema: 1, resolved: 'x' }, { schema: 1, resolved: { a: -5, b: 'x', c: now + 10, d: 1.5, ['__proto__']: 3 } }]) {
    const w = W.restore(raw, now);
    assert.equal(w.schema, 1); assert.equal(typeof w.resolved, 'object');
    for (const v of Object.values(w.resolved)) assert(Number.isInteger(v) && v >= 0 && v <= now, 'valore non valido conservato: ' + v);
  }
  const ok = W.restore({ schema: 1, origin: 2 * 1440, resolved: { ore: 4 * 1440 + 60 } }, now);
  // L'origine diventa il momento del caricamento: un sistema nuovo non rielabora la storia precedente.
  same({ schema: 1, origin: now, resolved: { ore: 4 * 1440 + 60 } }, ok, 'valore valido perso o origine non aggiornata');
});

check('8. Registrazioni non valide rifiutate', () => {
  const W = fresh(), bad = spec => { try { W.register('x' + Math.random(), spec); return false; } catch { return true; } };
  assert(bad({ level: 0, step: 60, resolve() {}, maxChunks: 10 }), 'livello 0 accettato');
  assert(bad({ level: 6, step: 60, resolve() {}, maxChunks: 10 }), 'livello 6 accettato');
  assert(bad({ level: 3, step: 0, resolve() {}, maxChunks: 10 }), 'passo 0 accettato');
  assert(bad({ level: 3, step: 60, maxChunks: 10 }), 'manca resolve');
  assert(bad({ level: 3, step: 60, resolve() {} }), 'manca maxChunks (tetto obbligatorio al recupero)');
  assert(bad({ level: 3, step: 60, resolve() {}, maxChunks: Infinity }), 'maxChunks infinito accettato');
  assert.throws(() => W.register('__proto__', { level: 3, step: 60, resolve() {}, maxChunks: 10 }), 'id __proto__ accettato');
  W.register('unico', { level: 3, step: 60, resolve() {}, maxChunks: 10 });
  assert.throws(() => W.register('unico', { level: 3, step: 60, resolve() {}, maxChunks: 10 }), 'id duplicato accettato');
});

check('10. Nel normale aggiornamento per fotogramma non si comprime mai: risultato identico con ogni budget', () => {
  const run = budget => {
    const W = fresh(), s = { world: W.create(0), counters: {} };
    const a = recorder(W, 'a', 3, 60, { spec: { maxChunks: 2 } }), b = recorder(W, 'b', 3, 60, { spec: { maxChunks: 2 } });
    let t = 0; const clock = () => (t += 1);
    for (let now = 0; now <= 1440; now += 120) W.tick(s, now, { budgetMs: budget, clock });
    while (W.lag(s, 1440) > 0) W.tick(s, 1440, { budgetMs: budget, clock });
    return { a, b };
  };
  const free = run(Infinity), tight = run(1);
  assert.equal([...free.a, ...free.b, ...tight.a, ...tight.b].filter(x => x[2]).length, 0, 'intervalli compressi durante il gioco');
  same(free, tight, 'risultato diverso con budget 1');
  return `${free.a.length + free.b.length} intervalli, nessuno compresso, identici con budget 1 e illimitato`;
});

check('11. Un sistema che lancia un errore viene isolato: gli altri continuano e l’errore resta registrato', () => {
  const W = fresh(), s = { world: W.create(0), counters: {} };
  let calls = 0;
  W.register('rotto', { level: 4, step: 60, resolve: () => { calls++; throw new Error('guasto di prova'); }, maxChunks: 100 });
  const log = recorder(W, 'sano', 3, 60);
  for (let now = 60; now <= 600; now += 60) W.tick(s, now, { budgetMs: Infinity });
  assert.equal(log.length, 10, 'il sistema sano non è avanzato: ' + log.length);
  assert.equal(calls, 1, 'il sistema guasto è stato richiamato ' + calls + ' volte');
  const failures = W.failures(s);
  assert.equal(failures.length, 1); assert.equal(failures[0].id, 'rotto'); assert.match(failures[0].message, /guasto di prova/);
  return '10 ore del sistema sano, 1 sola chiamata al sistema guasto';
});

check('12. Salvare e caricare non perde intervalli dei sistemi già noti', () => {
  const W = fresh();
  const log = recorder(W, 'b', 3, 60); // registrato prima della creazione del mondo, come i moduli del gioco
  const s = { world: W.create(120), counters: {} };
  const saved = JSON.parse(JSON.stringify(s.world)); // nessun aggiornamento prima del salvataggio
  const t = { world: W.restore(saved, 240), counters: {} };
  W.resolveAll(t, 240);
  same([[120, 180, false], [180, 240, false]], log, 'intervalli persi dopo il caricamento');
});

check('13. Orologio non valido: nessuna storia retroattiva, l’origine si fissa al primo aggiornamento', () => {
  for (const make of [W => W.create(undefined), W => W.restore({ schema: 1, resolved: { x: 5 } }, NaN)]) {
    const W = fresh(), s = { world: make(W), counters: {} };
    const log = recorder(W, 'ore', 3, 60);
    W.tick(s, 10 * 1440 + 30, { budgetMs: Infinity });
    W.tick(s, 10 * 1440 + 125, { budgetMs: Infinity });
    assert(log.length <= 2 && log.every(([from]) => from >= 10 * 1440), 'storia retroattiva: ' + JSON.stringify(log.slice(0, 2)));
  }
});

check('14. Rientro protetto e budget non valido trattato come predefinito', () => {
  const W = fresh(), s = { world: W.create(0), counters: {} };
  let inner = null;
  W.register('rientrante', { level: 3, step: 60, maxChunks: 100, resolve: (st, from, to) => { if (to === 120) { try { W.resolveAll(st, 600); } catch (e) { inner = e.message; } } } });
  const log = recorder(W, 'altro', 3, 60);
  W.resolveAll(s, 600);
  assert(inner && /rientr/i.test(inner), 'chiamata rientrante non rifiutata');
  assert.equal(log.length, 10, 'intervalli ripetuti o persi: ' + log.length);
  const V = fresh(), v = { world: V.create(0), counters: {} };
  recorder(V, 'x', 3, 60);
  let t = 0; const done = V.tick(v, 100 * 60, { budgetMs: NaN, clock: () => (t += 1) });
  assert(done <= 3, 'budget NaN senza limite: ' + done + ' intervalli');
});

check('15. Costo: 200 sistemi per 3 giorni e aggiornamento a vuoto', () => {
  const W = fresh(), s = { world: W.create(0) };
  for (let i = 0; i < 200; i++) W.register('s' + i, { level: 1 + i % 5, step: 60, resolve() {}, maxChunks: 1e6 });
  let t0 = process.hrtime.bigint();
  W.resolveAll(s, 3 * 1440);
  const fullMs = Number(process.hrtime.bigint() - t0) / 1e6;
  t0 = process.hrtime.bigint();
  for (let i = 0; i < 1000; i++) W.tick(s, 3 * 1440 + 30, { budgetMs: 2 });
  const idleUs = Number(process.hrtime.bigint() - t0) / 1e3 / 1000;
  assert(fullMs < 400, '14 400 intervalli in ' + fullMs.toFixed(0) + ' ms');
  assert(idleUs < 5, 'aggiornamento a vuoto ' + idleUs.toFixed(1) + ' µs');
  return `14 400 intervalli in ${fullMs.toFixed(0)} ms, aggiornamento a vuoto ${idleUs.toFixed(2)} µs`;
});

check('16. Un guasto resta confinato alla partita in cui avviene: le altre partite (nuova partita, altro salvataggio) continuano', () => {
  const W = fresh(), a = { world: W.create(0), counters: {}, bad: true }, b = { world: W.create(0), counters: {}, bad: false };
  let calls = 0;
  W.register('dati', { level: 3, step: 60, resolve: s => { calls++; if (s.bad) throw new Error('dati non validi'); s.counters.dati = (s.counters.dati || 0) + 1; }, maxChunks: 100 });
  for (let now = 60; now <= 600; now += 60) { W.tick(a, now, { budgetMs: Infinity }); W.tick(b, now, { budgetMs: Infinity }); }
  assert.equal(b.counters.dati, 10, 'il sistema si è fermato anche nella partita sana: ' + b.counters.dati);
  assert.equal(W.failures(a).length, 1, 'il guasto della partita A non è registrato');
  assert.equal(W.failures(b).length, 0, 'la partita B eredita il guasto della partita A');
  assert.equal(W.lag(b, 600), 0, 'ritardo nella partita sana');
  return `partita sana: 10 ore; chiamate totali ${calls}`;
});

check('9. Mutazione: risolvere fino all’istante corrente invece che fino al confine di griglia → il tempo vissuto diverge da quello saltato', () => {
  const run = live => {
    const W = fresh(src => src.replace('/*ALLINEA*/', '/*ALLINEA*/now>from?now:')), s = { world: W.create(START), counters: {} };
    const log = recorder(W, 'ore', 3, 60);
    if (live) for (let m = START + 1; m <= START + 9 * 60; m += 7) W.tick(s, m, { budgetMs: Infinity }); else W.resolveAll(s, START + 9 * 60);
    return log;
  };
  assert(fs.readFileSync(file, 'utf8').includes('/*ALLINEA*/'), 'punto da mutare assente nel modulo');
  let detected = false;
  try { same(run(true), run(false)); } catch (e) { if (e.name !== 'AssertionError') throw e; detected = true; }
  assert(detected, 'la mutazione non è stata rilevata');
  return 'rilevata';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
