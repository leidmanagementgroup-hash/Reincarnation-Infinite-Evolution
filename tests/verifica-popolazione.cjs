// PERF-005 (in ombra): residenti autonomi `world-population.js`, provati da soli in Node.
// Uso:   node tests/verifica-popolazione.cjs        (ONLY=3,9 per alcune prove; ONLY=M per le sole mutazioni; SKIP=M per escluderle)
// Il modulo non è nella build né collegato al motore: le prove lo caricano in un contesto `vm` insieme a `world-sim.js` con mondi
// sintetici e uno stub dell'economia calcolato solo dai riassunti della popolazione.
// Le soglie (S1–S8) sono state fissate prima di scrivere il codice e di misurare: vedi la nota di progetto del modulo.
// Ogni proprietà è una funzione riusata dalle mutazioni: la mutazione deve far fallire proprio quella proprietà, che senza
// mutazione passa (è la prova con lo stesso nome).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const popFile = path.join(root, 'world-population.js');
const simFile = path.join(root, 'world-sim.js');
const results = [];
const list_ = v => (process.env[v] || '').split(',').filter(Boolean);
const only = list_('ONLY'), skip = list_('SKIP');
const check = (name, fn) => {
  const tag = name.split('.')[0];
  if (only.length && !only.includes(tag) || skip.includes(tag)) return;
  const t0 = process.hrtime.bigint();
  try {
    const note = fn();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    results.push(['OK', name]);
    console.log('OK   ' + name + (note ? ' — ' + note : '') + ` [${ms.toFixed(0)} ms]`);
  } catch (e) {
    results.push(['FAIL', name]);
    console.log('FAIL ' + name + ' — ' + String(e && e.message).replace(/\s+/g, ' ').slice(0, 400) + (process.env.STACK ? '\n' + e.stack : ''));
  }
};
const source = fs.readFileSync(popFile, 'utf8');
function fresh(mutate = null, extra = {}) {
  const scope = { console, ...extra };
  scope.window = scope;
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(simFile, 'utf8'), scope, { filename: 'world-sim.js' });
  vm.runInContext(mutate ? mutate(source) : source, scope, { filename: 'world-population.js' });
  return { P: scope.WorldPopulation, W: scope.WorldSim };
}
const same = (a, b, label) => assert.equal(JSON.stringify(b), JSON.stringify(a), label);
const WEEK = 10080, YW = 48 / 7, START = 3 * WEEK + 517, W0 = Math.ceil(START / WEEK), CENTURY = 686;
const mix = h => { h |= 0; h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16; return h >>> 0; };
const rng = seed => { let s = seed; return n => { s = mix(s + 0x9e3779b9); return s % n; }; };
const median = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const quant = (a, f) => { a = a.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * f))]; };

// Mondo sintetico: due continenti, insediamenti di tipo diverso, un dungeon, un luogo selvaggio e uno disabitato fondabile.
function world(scale = 1) {
  return [
    { id: 'borgo', continent: 'c1', kind: 'village', population: 180 * scale, links: ['citta', 'grotta', 'bosco'] },
    { id: 'citta', continent: 'c1', kind: 'city', population: 420 * scale, links: ['borgo', 'paese', 'porto', 'radura'] },
    { id: 'paese', continent: 'c1', kind: 'town', population: 240 * scale, links: ['citta', 'grotta'] },
    { id: 'porto', continent: 'c2', kind: 'town', population: 200 * scale, links: ['citta'] },
    { id: 'grotta', continent: 'c1', kind: 'dungeon', population: 0, links: ['borgo', 'paese'] },
    { id: 'bosco', continent: 'c1', kind: 'wild', population: 0, links: ['borgo'] },
    { id: 'radura', continent: 'c1', kind: 'village', population: 0, links: ['citta'] }
  ];
}
const solo = (id, population, lineages, kind = 'city', links = []) => [{ id, continent: 'c1', kind, population, links, lineages: typeof lineages === 'string' ? { [lineages]: 1 } : lineages }];
// Stub dell'economia: segnali deterministici per luogo e settimana (crisi, guerra, calamità, carestia).
function signals(id, w) {
  const r = w - W0;
  return {
    foodScarcity: id === 'paese' && r % 20 < 6 ? 450 : 60, priceIndex: 1000,
    wageIndex: id === 'citta' ? 1150 : id === 'borgo' && r >= 10 && r < 20 ? 700 : 950, unemployment: 80,
    prosperity: id === 'citta' ? 1200 : id === 'borgo' && r >= 10 && r < 20 ? 650 : 1000,
    crisis: id === 'borgo' && r >= 10 && r < 20 ? 1 : 0, war: id === 'porto' && r >= 30 && r < 36 ? 1 : 0,
    disaster: id === 'paese' && r === 25 ? 1 : 0, season: Math.floor((w * 7) / 12) % 4, labor: { smith: 1000 + (w % 5) * 100 }
  };
}
const env = w => ({ economy: { signals: id => signals(id, w) } });
const calm = () => ({});
// Economia di prova: salari per lavoratore, spesa per abitante e tassa sulla ricchezza, calcolati solo dai riassunti.
function economyWeek(P, pop, list, ledger) {
  for (const pl of list) {
    const s = P.summary(pop, pl.id), wages = {};
    for (const [k, n] of Object.entries(s.workers)) wages[k] = BigInt(n) * 25n;
    const got = P.transfer(pop, pl.id, { wages, spend: BigInt(s.alive) * 6n, tax: BigInt(s.wealth) / 150n });
    if (ledger) { ledger.wages += got.wages; ledger.spend += got.spend; ledger.tax += got.tax; }
  }
}
function run(P, pop, list, from, to, plan = {}, hook = null, ledger = null, sig = env) {
  for (let w = from; w < to; w++) {
    for (const id of plan[w] || []) P.materialize(pop, id);
    economyWeek(P, pop, list, ledger);
    P.step(pop, w, sig(w));
    if (hook) hook(w, pop);
  }
}
const quiet = (P, pop, weeks, sig = calm, hook = null) => {
  const from = pop.week;
  for (let w = from; w < from + weeks; w++) { P.step(pop, w, { economy: { signals: id => sig(id, w) } }); if (hook) hook(w, pop); }
};
const snapshot = (P, pop, list) => JSON.stringify({
  cells: list.map(p => P.cells(pop, p.id)), sums: list.map(p => P.summary(pop, p.id)), totals: P.stats(pop).totals
});
const totalWealth = (P, pop, list) => list.reduce((a, p) => a + BigInt(P.summary(pop, p.id).wealth), 0n);
const alive = (P, pop, list) => list.reduce((a, p) => a + P.summary(pop, p.id).alive, 0);
const allResidents = (P, pop, list) => list.flatMap(p => P.residents(pop, p.id));
const clean = (P, pop, label) => assert.equal(P.audit(pop).join('; '), '', 'record e margini discordi ' + label);

/* Raffinamento: in un luogo materializzato i record, contati da fuori con le sole viste pubbliche, danno esattamente i margini
   aggregati (stirpe × stadio × stato civile × stadio del coniuge, mestieri degli adulti, bambini). */
function projection(P, pop, id) {
  const rs = P.residents(pop, id), by = new Map(rs.map(r => [r.id, r])), n = {};
  const add = k => { n[k] = (n[k] || 0) + 1; };
  for (const r of rs) {
    if (r.stage === 'bambino') { add(r.lineage + '/bambini'); assert.equal(r.profession, 'none'); assert.equal(r.married, 'single'); continue; }
    let cls = r.married;
    if (cls === 'married') {
      const q = by.get(r.spouse);
      assert(q, r.id + ' sposato con chi non vive nel luogo: ' + r.spouse);
      assert.equal(q.spouse, r.id, 'coniugi non reciproci');
      cls += '-' + q.stage;
    }
    add(r.lineage + '/' + r.stage + '/' + cls);
    if (r.stage === 'adulto') add('mestiere/' + r.profession); else assert.equal(r.profession, 'none');
  }
  const want = Object.entries(P.cells(pop, id)).filter(([k]) => !k.startsWith('eta/'));
  const sort = e => JSON.stringify(e.sort((a, b) => a[0] < b[0] ? -1 : 1));
  assert.equal(sort(Object.entries(n)), sort(want), 'record ≠ margini a ' + id);
}

// ——— Proprietà riusate dalle mutazioni ———
const prop = {};
prop.equivalence = (P, weeks = 160, seed = 19425) => {
  const list = world();
  const variants = [{}, { [W0]: ['borgo'] }, { [W0 + 30]: ['borgo'] }, { [W0]: ['borgo', 'citta', 'paese', 'porto', 'radura', 'bosco'] }, { [W0 + 17]: ['citta'], [W0 + 44]: ['porto', 'borgo'] }];
  const outs = variants.map(plan => {
    const pop = P.create(seed, list, START), marks = [];
    run(P, pop, list, W0, W0 + weeks, plan, (w, p) => {
      if ((w - W0) % 10 !== 9) return;
      marks.push(snapshot(P, p, list)); clean(P, p, 'alla settimana ' + (w - W0));
      for (const x of list) if (P.stats(p).places[x.id].materialized) projection(P, p, x.id);
    });
    return { marks, end: snapshot(P, pop, list), pop };
  });
  for (let i = 1; i < outs.length; i++) {
    outs[i].marks.forEach((m, k) => assert.equal(m, outs[0].marks[k], `variante ${i}: differenza alla verifica ${k}`));
    assert.equal(outs[i].end, outs[0].end, `variante ${i}: stato finale diverso`);
  }
  const t = P.stats(outs[0].pop).totals;
  for (const k of ['births', 'deaths', 'marriages', 'migrations', 'families', 'careers', 'departures', 'matured', 'mourned']) assert(t[k] > 0, 'mondo troppo statico: ' + k + ' = ' + t[k]);
  return t;
};
prop.conservation = (P, seed = 11) => {
  const list = world(), pop = P.create(seed, list, START), initial = alive(P, pop, list), dead = new Set(), ledger = { wages: 0n, spend: 0n, tax: 0n };
  const w0 = totalWealth(P, pop, list);
  run(P, pop, list, W0, W0 + 90, { [W0]: ['borgo', 'paese'], [W0 + 33]: ['citta', 'radura'] }, (w, p) => {
    const t = P.stats(p).totals;
    assert.equal(alive(P, p, list), initial + t.births - t.deaths, 'vivi ≠ iniziali + nascite − morti alla settimana ' + w);
    assert.equal(t.arrivals, t.migrations, 'migrazioni non a somma zero');
    const recs = allResidents(P, p, list), ids = recs.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length, 'id duplicati alla settimana ' + w);
    for (const r of recs) { assert(r.alive, 'morto fra i residenti'); assert(!dead.has(r.id), 'resurrezione di ' + r.id); }
    for (const d of P.decisions(p).deaths) dead.add(d.id);
    assert.equal(P.stats(p).records.alive, recs.length, 'record vivi fuori da ogni luogo');
    for (const pl of list) {
      const s = P.summary(p, pl.id), sum = P.residents(p, pl.id).reduce((a, r) => { assert(BigInt(r.wealth) >= 0n, 'ricchezza individuale negativa'); return a + BigInt(r.wealth); }, 0n);
      assert(sum <= BigInt(s.wealth), 'i record possiedono più del luogo a ' + pl.id);
    }
  }, ledger);
  const t = P.stats(pop).totals, w1 = totalWealth(P, pop, list);
  assert.equal(String(w1 - w0), String(ledger.wages + BigInt(t.loot) - BigInt(t.upkeep) - ledger.spend - ledger.tax), 'Scintille create o perse');
  assert(BigInt(t.loot) > 0n && BigInt(t.upkeep) > 0n, 'spedizioni senza bottino o senza costi');
  return { initial, t, dead: dead.size };
};
// Salvataggio in OGNI settimana (prima e dopo il passo), con luoghi materializzati in momenti diversi; spesso si prosegue dal ripristino.
prop.save = (P, weeks = 60, seed = 5) => {
  const list = world(), a = P.create(seed, list, START);
  let b = P.create(seed, list, START), size = 0;
  const plan = { [W0 + 3]: ['borgo'], [W0 + 12]: ['porto'], [W0 + 30]: ['citta'], [W0 + 41]: ['radura', 'paese'] };
  for (let w = W0; w < W0 + weeks; w++) {
    for (const p of [a, b]) { for (const id of plan[w] || []) P.materialize(p, id); economyWeek(P, p, list); }
    if (w === W0 + 20) for (const p of [a, b]) { const r = P.residents(p, 'borgo').find(x => x.stage === 'adulto'); P.influence(p, r.id, { traits: { bravery: 99 }, needs: { safety: 88 } }); }
    for (const phase of ['prima', 'dopo']) {
      if (phase === 'dopo') { P.step(a, w, env(w)); P.step(b, w, env(w)); }
      const raw = JSON.parse(JSON.stringify(P.serialize(b))), c = P.restore(raw, list, (w + 1) * WEEK);
      assert.equal(c.note || '', '', `nota ${phase} del passo ${w}: ${c.note}`);
      assert.equal(JSON.stringify(P.serialize(c)), JSON.stringify(raw), `ripristino non fedele ${phase} del passo ${w}`);
      for (const x of list) same(P.residents(b, x.id), P.residents(c, x.id), `residenti diversi ${phase} del passo ${w}`);
      size = JSON.stringify(raw).length;
      if (w % 3 === (phase === 'prima' ? 0 : 1)) b = c;
    }
  }
  assert.equal(JSON.stringify(P.serialize(b)), JSON.stringify(P.serialize(a)), 'continuazione diversa dopo i ripristini');
  same(P.events(a), P.events(b), 'registro diverso');
  clean(P, b, 'dopo i ripristini');
  return size;
};
prop.noImmortals = P => {
  const list = [...solo('tana', 120, 'bear', 'village', ['rifugio']), ...solo('rifugio', 60, 'human', 'village', ['tana'])], pop = P.create(77, list, START);
  P.materialize(pop, 'tana'); P.materialize(pop, 'rifugio');
  const initial = allResidents(P, pop, list), notable = initial.filter(r => r.notable);
  assert(notable.length >= 1, 'nessun notabile fra i residenti iniziali');
  for (const r of notable.slice(0, 2)) P.know(pop, r.id);
  const living = () => initial.filter(r => { const q = P.person(pop, r.id); return q && q.alive; });
  let y = 0;
  for (; y < 130 && living().length; y++) quiet(P, pop, 7);
  assert.equal(living().length, 0, `${living().length} residenti iniziali immortali dopo ${y} anni`);
  for (const r of notable.slice(0, 2)) assert.equal(P.person(pop, r.id).alive, false, 'lapide mancante per un notabile conosciuto');
  return `${initial.length} iniziali (${notable.length} notabili) tutti morti entro ${y} anni`;
};
// Minori: nessuno lavora, combatte, si sposa o migra da solo; nessuno diventa adulto prima dell'età della propria stirpe.
prop.minors = (P, weeks = 500, lineages = { human: 4, bear: 2, hare: 1, dwarf: 1 }) => {
  const list = [...solo('a', 1200, lineages, 'city', ['b', 'd']), ...solo('b', 700, lineages, 'town', ['a', 'd']), { id: 'd', continent: 'c1', kind: 'dungeon', population: 0, links: ['a', 'b'] }];
  const pop = P.create(9, list, START);
  for (const p of list) P.materialize(pop, p.id);
  const ages = {};
  let migr = 0, alone = 0, split = 0;
  quiet(P, pop, weeks, (id, w) => ({ crisis: w % 40 < 5 && id === 'b' ? 1 : 0 }), (w, p) => {
    const d = P.decisions(p);
    for (const r of allResidents(P, p, list)) {
      if (r.stage === 'bambino') { assert.equal(r.profession, 'none'); assert.equal(r.married, 'single'); }
      else assert(r.ageYears >= P.biology[r.lineage].adult, `${r.id} (${r.lineage}) ${r.stage} a ${r.ageYears} anni`);
    }
    for (const id of d.matured) { const r = P.person(p, id); if (r) (ages[r.lineage] = ages[r.lineage] || []).push(r.ageYears); }
    for (const kind of ['departures', 'careers']) for (const e of d[kind]) { const r = P.person(p, e.id); if (r && r.alive) assert(r.stage !== 'bambino', 'minore in ' + kind); }
    for (const m of d.migrations) { const r = P.person(p, m.id); if (!r || r.stage !== 'bambino') continue; migr++; if (!m.family) alone++; if (m.parted) split++; }
  });
  const want = P.biology.human.adult;
  assert(ages.human && ages.human.length > 20, 'troppo pochi nuovi adulti umani: ' + (ages.human || []).length);
  assert(Math.min(...ages.human) >= want && Math.max(...ages.human) <= want + 2, `età adulta umana ${Math.min(...ages.human)}–${Math.max(...ages.human)}, attesa ${want}–${want + 2}`);
  assert.equal(alone, 0, alone + ' minori migrati da soli');
  assert(migr >= 10, 'troppo pochi minori migrati con la famiglia: ' + migr);
  assert(split / migr <= 0.15, `minori separati dai genitori: ${split}/${migr}`);
  return `umani adulti a ${Math.min(...ages.human).toFixed(1)}–${Math.max(...ages.human).toFixed(1)} anni (${ages.human.length}), minori migrati ${migr}, separati dai genitori ${split}`;
};
// Parentela e famiglie: nessun consanguineo sposato, coniugi reciproci e vicini d'età, genitori più vecchi dei figli, vedovi risposati.
prop.families = (P, n = 150, years = 100) => {
  let marriages = 0, adopted = 0, remarried = 0, early = 0;
  const gaps = [];
  for (const [lin, seed] of [['human', 1], ['human', 2], ['bear', 3], ['goblin', 4]]) {
    const list = solo('s', n, lin, 'village'), pop = P.create(seed, list, 0);
    P.materialize(pop, 's');
    const first = P.residents(pop, 's'), by = new Map(first.map(r => [r.id, r])), adult = P.biology[lin].adult;
    let kids = 0;
    for (const r of first) {
      for (const q of r.parents) { kids++; assert(by.get(q).ageYears - r.ageYears >= adult, `genitore troppo giovane: ${by.get(q).ageYears} − ${r.ageYears}`); }
      if (r.spouse) { assert.equal(by.get(r.spouse).spouse, r.id, 'coniugi non reciproci'); gaps.push(Math.abs(by.get(r.spouse).ageYears - r.ageYears) / P.biology[lin].life); }
    }
    assert(kids > 10, 'nessun legame genitore-figlio iniziale: ' + kids);
    const widowAt = new Map();
    quiet(P, pop, Math.round(years * YW), calm, (w, p) => {
      const d = P.decisions(p);
      for (const b of d.births) {
        assert.equal(b.parents.length, 2, 'nato senza due genitori');
        for (const q of b.parents) { const x = P.person(p, q); assert(x && x.alive, 'genitore morto alla nascita'); assert(x.ageYears >= adult, 'genitore minore'); }
      }
      for (const id of d.widowed) widowAt.set(id, w);
      for (const m of d.marriages) {
        marriages++; if (m.adopted) adopted++;
        const A = P.person(p, m.a), B = P.person(p, m.b);
        if (!A || !B || !A.alive || !B.alive) continue; // morto nella stessa settimana: nessun record da interrogare
        assert(!A.parents.some(x => B.parents.includes(x)), `fratelli sposati: ${m.a} e ${m.b}`);
        assert(!A.parents.includes(m.b) && !B.parents.includes(m.a), `genitore e figlio sposati: ${m.a} e ${m.b}`);
        for (const x of [m.a, m.b]) if (widowAt.has(x)) { remarried++; if (w - widowAt.get(x) < 2) early++; }
      }
      for (const r of P.residents(p, 's')) if (r.spouse) assert.equal(P.person(p, r.spouse).spouse, r.id, 'coniugi non reciproci');
    });
  }
  assert(quant(gaps, 0.5) <= 0.12 && quant(gaps, 0.95) <= 0.3, `coniugi iniziali troppo distanti: mediana ${quant(gaps, 0.5).toFixed(2)} della vita, p95 ${quant(gaps, 0.95).toFixed(2)}`);
  assert(marriages > 200, 'troppo pochi matrimoni: ' + marriages);
  assert(adopted / marriages <= 0.01, `ripiego «adozione» ${adopted}/${marriages}`);
  assert(remarried > 0, 'nessun vedovo risposato');
  assert.equal(early, 0, 'risposato senza lutto');
  return `${marriages} matrimoni senza consanguinei (ripiego ${adopted}), ${remarried} di vedovi`;
};
// Luoghi misti (non materializzati con residenti noti): i record agiscono, si sposano con persone vere e hanno figli veri.
prop.mixed = P => {
  const n = { spouses: 0, births: 0, deaths: 0, moves: 0 };
  for (let seed = 1; seed <= 4; seed++) {
    const list = [...solo('a', 400, { human: 2, bear: 1 }, 'city', ['b']), ...solo('b', 400, { human: 2, bear: 1 }, 'city', ['a'])], pop = P.create(seed, list, 0);
    P.materialize(pop, 'a');
    quiet(P, pop, 300, id => id === 'a' ? { crisis: 1, prosperity: 700 } : {}, (w, p) => {
      for (const r of P.residents(p, 'b')) if (r.married === 'married') { const q = P.person(p, r.spouse); assert(q && q.alive && q.spouse === r.id && q.place === 'b', 'sposato con nessuno in un luogo misto'); }
      const d = P.decisions(p);
      n.deaths += d.deaths.filter(x => x.place === 'b').length;
      n.births += d.births.filter(x => x.place === 'b').length;
      n.moves += d.migrations.filter(x => x.from === 'b').length;
      n.spouses += d.marriages.filter(x => x.place === 'b').length;
    });
    clean(P, pop, 'luogo misto'); P.materialize(pop, 'b'); clean(P, pop, 'dopo la materializzazione'); projection(P, pop, 'b');
  }
  assert(n.spouses > 10 && n.births > 10 && n.deaths > 10 && n.moves > 5, 'record inattivi nei luoghi misti: ' + JSON.stringify(n));
  return JSON.stringify(n) + ' di record in luoghi non materializzati';
};
prop.inheritance = P => {
  const list = solo('s', 300, 'human', 'town'), pop = P.create(3, list, 0);
  P.materialize(pop, 's');
  let spouse = 0, child = 0;
  quiet(P, pop, 300, calm, (w, p) => {
    for (const d of P.decisions(p).deaths) {
      const h = d.heirs || [];
      if (h.length && h[0].as === 'coniuge') spouse++; else if (h.length && h[0].as === 'figlio') child++;
      for (const x of h) assert(BigInt(x.amount) >= 0n && P.person(p, x.id), 'erede inesistente');
    }
  });
  assert(spouse >= 3, 'eredità al coniuge mai avvenuta: ' + spouse);
  assert(child >= 3, 'eredità ai figli mai avvenuta: ' + child);
  return `eredità a ${spouse} coniugi e ${child} volte ai figli`;
};
// Crisi: pericolose ma superabili (S3).
prop.crises = P => {
  const out = [];
  const one = (name, sig, weeks, lo, hi) => {
    const list = solo('a', 5000, 'human'), base = P.create(3, list, 0), pop = P.create(3, list, 0);
    quiet(P, base, weeks); quiet(P, pop, weeks, () => sig);
    const extra = (P.stats(pop).totals.deaths - P.stats(base).totals.deaths) / 5000;
    assert(extra >= lo && extra <= hi, `${name}: morti in più ${(extra * 100).toFixed(1)} %, attesi ${lo * 100}–${hi * 100} %`);
    const before = P.summary(base, 'a').alive;
    quiet(P, pop, 14);
    assert(P.summary(pop, 'a').alive < 0.97 * before, name + ': rimpiazzo istantaneo');
    quiet(P, pop, Math.round(50 * YW));
    const end = P.summary(pop, 'a').alive / 5000;
    assert(end >= 0.8, `${name}: dopo 50 anni ${(end * 100).toFixed(0)} % della capienza`);
    out.push(`${name} −${(extra * 100).toFixed(1)} % → ${(end * 100).toFixed(0)} %`);
  };
  one('carestia', { foodScarcity: 1000 }, 7, 0.08, 0.25);
  one('guerra', { war: 1 }, 7, 0.02, 0.12);
  one('epidemia', { disaster: 1 }, 4, 0.03, 0.15);
  const births = s => { const p = P.create(8, solo('a', 8000, 'human'), 0); quiet(P, p, 7, () => s); return P.stats(p).totals.births; };
  const b0 = births({}), b1 = births({ foodScarcity: 600 });
  assert(b1 < 0.75 * b0, `la carestia non riduce le nascite: ${b1} contro ${b0}`);
  out.push(`nascite con fame ${b1}/${b0}`);
  return out.join(', ');
};
// Capienza: senza tetto di affollamento la popolazione esplode.
prop.capacity = P => {
  const pop = P.create(4, solo('a', 1000, { human: 1, goblin: 1 }), 0);
  let peak = 0;
  quiet(P, pop, CENTURY, () => ({ prosperity: 3000 }), (w, p) => { peak = Math.max(peak, P.summary(p, 'a').alive); });
  assert(peak <= 1250, 'oltre la capienza: ' + peak);
  assert(P.summary(pop, 'a').alive >= 700, 'spopolato: ' + P.summary(pop, 'a').alive);
  return `picco ${peak} su 1000 con prosperità tripla`;
};
// Le destinazioni seguono i segnali: il luogo prospero attira nettamente più del luogo in guerra.
prop.destinations = P => {
  const list = [...solo('a', 600, 'human', 'city', ['b', 'c']), ...solo('b', 600, 'human', 'city', ['a']), ...solo('c', 600, 'human', 'city', ['a'])], pop = P.create(6, list, 0);
  P.materialize(pop, 'a');
  let b = 0, c = 0;
  quiet(P, pop, 120, id => id === 'b' ? { prosperity: 1600, wageIndex: 1400 } : id === 'c' ? { prosperity: 600, war: 1 } : { prosperity: 900 }, (w, p) => {
    for (const m of P.decisions(p).migrations) if (m.from === 'a') { if (m.to === 'b') b++; else c++; }
  });
  assert(b > 20 && b > 4 * c, `destinazioni indifferenti ai segnali: ${b} verso il prospero, ${c} verso la guerra`);
  return `${b} verso il luogo prospero, ${c} verso la guerra`;
};
// Gli esiti migliori delle spedizioni vanno a chi ha più esperienza (stesso luogo e settimana; chi muore lo decide la regola di luogo).
prop.expeditions = P => {
  const list = world(8), pop = P.create(31, list, START); // abbastanza grande da avere più partenze dallo stesso luogo nella stessa settimana
  for (const p of list) P.materialize(pop, p.id);
  const outcomes = {}, wild = new Set(['grotta', 'bosco']), rank = { success: 3, empty: 2, wounded: 1 };
  let gained = 0n, good = 0, bad = 0;
  run(P, pop, list, W0, W0 + 160, {}, (w, p) => {
    const groups = new Map();
    for (const d of P.decisions(p).departures) {
      outcomes[d.outcome] = (outcomes[d.outcome] || 0) + 1;
      assert(wild.has(d.to) || d.to === 'terre selvagge', 'destinazione non selvaggia: ' + d.to);
      gained += BigInt(d.loot);
      const q = P.person(p, d.id);
      if (d.outcome === 'death') { assert(!q || q.cause === 'spedizione', 'causa di morte sbagliata'); continue; }
      assert(Number.isInteger(d.skill), 'manca l’esperienza alla partenza'); assert(!q || !q.alive || q.xp > 0, 'nessuna esperienza');
      if (!groups.has(d.from)) groups.set(d.from, []);
      groups.get(d.from).push(d);
    }
    for (const g of groups.values()) for (const x of g) for (const y of g) if (x.skill > y.skill && x.outcome !== y.outcome) { if (rank[x.outcome] > rank[y.outcome]) good++; else bad++; }
  });
  for (const k of ['success', 'wounded', 'death']) assert(outcomes[k] > 0, 'nessun esito ' + k + ': ' + JSON.stringify(outcomes));
  assert(gained > 0n, 'nessun guadagno');
  assert.equal(String(gained), String(P.stats(pop).totals.loot), 'bottino dei record ≠ bottino registrato');
  assert(good >= 20 && bad === 0, `esiti migliori ai più esperti: ${good} sì, ${bad} no`);
  return `esiti ${JSON.stringify(outcomes)}, bottino ${gained}; ordine per esperienza ${good}/${good + bad}`;
};
// Guasti di un singolo dato: si ripara o si isola, il mondo non si perde mai.
prop.restore = P => {
  const list = world(), good = P.create(4, list, START);
  P.materialize(good, 'borgo'); P.materialize(good, 'paese'); run(P, good, list, W0, W0 + 12);
  const raw = JSON.parse(JSON.stringify(P.serialize(good))), ids = list.map(p => p.id), n0 = ids.map(id => P.summary(good, id).alive), clone = () => JSON.parse(JSON.stringify(raw));
  const bi = raw.places.findIndex(p => p.id === 'borgo'), ci = raw.places.findIndex(p => p.id === 'citta'), now = (W0 + 12) * WEEK;
  const go = (label, r) => {
    let p;
    assert.doesNotThrow(() => { p = P.restore(r, list, now); }, 'lancia: ' + label);
    assert(p && typeof p === 'object', label); clean(P, p, label);
    assert.doesNotThrow(() => quiet(P, p, 3), 'non avanza: ' + label); clean(P, p, label + ', dopo tre settimane');
    return P.restore(r, list, now);
  };
  const lin = Object.keys(raw.places[ci].lin)[0];
  // a) Recuperabili: il resto del mondo resta identico, con una nota. Il terzo elemento elenca i luoghi che possono cambiare.
  const recover = [
    ['conteggio negativo in una coorte', r => { r.places[ci].lin[lin].c[0] = -3; }, ['citta']],
    ['età negativa in una coorte', r => { r.places[ci].lin[lin].h[0] = -3; }, ['citta']],
    ['conteggio non intero', r => { r.places[ci].lin[lin].c[0] = 1.5; }, ['citta']],
    ['classi incoerenti con le età', r => { r.places[ci].lin[lin].c[0] += 5; }, ['citta']],
    ['riporto non valido', r => { r.places[ci].carry.death = -4; }, []],
    ['riporto sconosciuto', r => { r.places[ci].carry['x y'] = 4; }, []],
    ['mestieri che non sommano', r => { r.places[ci].jobs[1] += 7; }, []],
    ['cassa non valida', r => { r.places[ci].wealth = '-5'; }, []],
    ['cassa numerica', r => { r.places[ci].wealth = 12; }, []],
    ['sospesi non validi', r => { r.places[ci].due = { wages: 3 }; }, []],
    ['record corrotti', r => { const s = r.places[bi].recs; r.places[bi].recs = s.slice(0, 40) + (s[40] === 'A' ? 'B' : 'A') + s.slice(41); }, []],
    ['record troncati', r => { r.places[bi].recs = r.places[bi].recs.slice(0, 100); }, []],
    ['record di tipo sbagliato', r => { r.places[bi].recs = 7; }, []],
    ['totali mancanti', r => { r.totals = null; }, []],
    ['totale non valido', r => { r.totals.births = -1; }, []],
    ['registro non valido', r => { r.log = [{ week: 'x' }, 3]; }, []],
    ['lapidi non valide', r => { r.tombs = [[1, 2], 'x']; }, []],
    ['luogo illeggibile', r => { r.places[ci] = 'x'; }, ['citta']],
    ['identificatore pericoloso', r => { r.places[ci].id = '__proto__'; }, ['citta']],
    ['tipo sconosciuto', r => { r.places[ci].kind = 'boh'; }, []]
  ];
  for (const [label, edit, hit] of recover) {
    const r = clone(); edit(r);
    const p = go(label, r);
    assert(p.note && p.note.length > 0, 'nessuna nota: ' + label);
    assert.equal(p.week, good.week, 'mondo ricreato per: ' + label);
    ids.forEach((id, i) => {
      if (!hit.includes(id)) assert.equal(P.summary(p, id).alive, n0[i], `${label}: cambiata la popolazione di ${id}`);
      else assert(P.summary(p, id).alive > 0.5 * n0[i], label + ': luogo svuotato');
    });
    if (/^record/.test(label)) {
      assert.equal(P.summary(p, 'borgo').wealth, P.summary(good, 'borgo').wealth); same(P.cells(good, 'borgo'), P.cells(p, 'borgo'), label);
      same(P.residents(good, 'paese').map(x => x.id), P.residents(p, 'paese').map(x => x.id), label + ': identità di un altro luogo perdute');
    } else same(P.residents(good, 'borgo').map(x => x.id + x.name + x.wealth), P.residents(p, 'borgo').map(x => x.id + x.name + x.wealth), label + ': identità di borgo perdute');
  }
  // b) Irrecuperabili: ricreata dal seme, con una nota, senza eccezioni.
  const hopeless = [undefined, null, 'x', 7, [], {}, { schema: 99 }, { ...raw, week: -1 }, { ...raw, seed: 'x' }, { ...raw, places: 'x' }, JSON.parse('{"schema":2,"__proto__":{"x":1}}')];
  for (const r of hopeless) {
    let p;
    assert.doesNotThrow(() => { p = P.restore(r, list, now); });
    assert(p.note && p.note.length > 0, 'nessuna nota'); assert.equal(P.summary(p, 'borgo').alive, 180); assert.doesNotThrow(() => quiet(P, p, 2));
  }
  // c) Valido: nessuna nota; luoghi nuovi aggiunti dal seme.
  assert.equal(P.restore(clone(), list, now).note || '', '');
  const grown = P.restore(clone(), world().concat([{ id: 'nuovo', continent: 'c2', kind: 'village', population: 50, links: ['porto'] }]), now);
  assert.equal(P.summary(grown, 'nuovo').alive, 50, 'luogo nuovo non aggiunto'); assert.equal(P.summary(grown, 'borgo').alive, P.summary(good, 'borgo').alive);
  return `${recover.length} guasti isolati senza perdere il mondo, ${hopeless.length} casi irrecuperabili ricreati`;
};
// A parità di storia si cambia la personalità di un pari che non aveva agito: agisce lui, e i conteggi restano identici.
prop.autonomy = P => {
  const list = world(2), out = [];
  const base = () => { const pop = P.create(21, list, START); for (const id of ['borgo', 'citta', 'paese']) P.materialize(pop, id); return pop; };
  const A = base(), hist = [];
  for (let w = W0; w < W0 + 90; w++) { const people = new Map(allResidents(P, A, list).map(r => [r.id, r])); economyWeek(P, A, list); P.step(A, w, env(w)); hist.push({ w, people, d: P.decisions(A) }); }
  const experiment = (kind, peers, patch, filter = () => true) => {
    for (const h of hist) for (const e of h.d[kind]) {
      const me = h.people.get(e.id || e.a);
      if (!me || !filter(e, me)) continue;
      const acted = x => h.d[kind].some(y => y.id === x || y.a === x || y.b === x) || h.d.deaths.some(y => y.id === x) || h.d.migrations.some(y => y.id === x);
      const X = peers(h, me).find(r => r.id !== me.id && !acted(r.id));
      if (!X) continue;
      const B = base(), R = base();
      run(P, B, list, W0, h.w); run(P, R, list, W0, h.w + 1);
      assert(P.influence(B, X.id, patch), 'influence rifiutata');
      economyWeek(P, B, list); P.step(B, h.w, env(h.w));
      same(list.map(x => P.cells(R, x.id)), list.map(x => P.cells(B, x.id)), 'la personalità ha cambiato i conteggi');
      assert(P.decisions(B)[kind].some(y => y.id === X.id || y.a === X.id || y.b === X.id), `la personalità non ha cambiato chi agisce (${kind})`);
      out.push(kind + ' ' + X.id);
      return;
    }
    assert.fail('nessun evento utilizzabile: ' + kind);
  };
  const single = (h, me) => [...h.people.values()].filter(r => r.place === me.place && r.lineage === me.lineage && r.stage === 'adulto' && r.married === 'single');
  const hunters = (h, me) => [...h.people.values()].filter(r => r.place === me.place && r.profession === 'adventurer' && r.wounds < 10);
  experiment('migrations', single, { traits: { wanderlust: 100 }, goals: { long: 'journey' }, needs: { wealth: 100, safety: 100, food: 100 } }, (e, me) => me.stage === 'adulto' && me.married === 'single' && !e.family);
  experiment('departures', hunters, { traits: { bravery: 100, ambition: 100 }, goals: { long: 'glory' }, needs: { wealth: 100 } }, e => e.outcome !== 'death');
  experiment('careers', (h, me) => [...h.people.values()].filter(r => r.place === me.place && r.profession === me.profession && r.stage === 'adulto'), { traits: { diligence: 0, ambition: 100, bravery: 100 }, goals: { long: 'fortune' }, needs: { wealth: 100 } }, (e, me) => me.profession !== 'none');
  experiment('marriages', single, { traits: { sociability: 100 }, goals: { long: 'family' }, needs: { belonging: 100 } });
  // Statistica: chi migra da solo ha più voglia di viaggiare dei pari rimasti; chi parte è più audace degli avventurieri rimasti.
  const mean = xs => xs.reduce((q, v) => q + v, 0) / Math.max(1, xs.length);
  const gap = (kind, trait, peers, filter) => {
    const g = [];
    for (const h of hist) for (const e of h.d[kind]) { const me = h.people.get(e.id); if (!me || !filter(e, me)) continue; const ps = peers(h, me).filter(r => r.id !== me.id); if (ps.length) g.push(me.traits[trait] - mean(ps.map(r => r.traits[trait]))); }
    return [mean(g), g.length];
  };
  const [m, nm] = gap('migrations', 'wanderlust', single, (e, me) => me.married === 'single' && me.stage === 'adulto' && !e.family);
  const [v, nv] = gap('departures', 'bravery', hunters, (e, me) => me.profession === 'adventurer' && e.outcome !== 'death');
  assert(nm >= 5 && m > 10, `migranti non più inclini al viaggio (${m.toFixed(1)} su ${nm})`);
  assert(nv >= 5 && v > 8, `avventurieri non più audaci (${v.toFixed(1)} su ${nv})`);
  return out.join(', ') + `; voglia di viaggiare +${m.toFixed(1)} (${nm}), audacia +${v.toFixed(1)} (${nv})`;
};
// Scelte forzate (S4): candidati ≤ posti da assegnare.
prop.forced = P => {
  const tot = {};
  let F = 0, N = 0;
  for (const seed of [2, 5, 9]) {
    const list = [{ id: 'a', continent: 'c', kind: 'town', population: 500, links: ['b', 'd'] }, { id: 'b', continent: 'c', kind: 'town', population: 500, links: ['a'] }, { id: 'd', continent: 'c', kind: 'dungeon', population: 0, links: ['a'] }], pop = P.create(seed, list, 0);
    P.materialize(pop, 'a'); P.materialize(pop, 'b'); quiet(P, pop, 520);
    for (const [k, v] of Object.entries(P.stats(pop).choices)) { const x = tot[k] = tot[k] || { forced: 0, free: 0 }; x.forced += v.forced; x.free += v.free; F += v.forced; N += v.forced + v.free; }
  }
  const pct = x => x.forced / (x.forced + x.free), text = Object.entries(tot).map(([k, x]) => `${k} ${Math.round(100 * pct(x))}% di ${x.forced + x.free}`).join(', ');
  for (const k of ['migrazione', 'famiglia', 'spedizione', 'mestiere', 'matrimonio', 'genitori']) assert(tot[k] && tot[k].forced + tot[k].free > 20, 'scelta mai avvenuta: ' + k + ' — ' + text);
  for (const [k, x] of Object.entries(tot)) assert(pct(x) <= 0.6, `${k} troppo forzata — ${text}`);
  assert(F / N <= 0.35, `scelte forzate ${F}/${N} — ${text}`);
  return `forzate ${(100 * F / N).toFixed(1)} % (${text})`;
};
// Azioni senza effetto di cella che contano nelle decisioni.
prop.actions = P => {
  const list = world(2), pop = P.create(17, list, START);
  for (const id of ['borgo', 'citta', 'paese']) P.materialize(pop, id);
  const n = {};
  let bonded = 0, mar = 0, neg = 0;
  run(P, pop, list, W0, W0 + 150, {}, (w, p) => {
    const d = P.decisions(p);
    for (const a of d.actions) n[a.kind] = (n[a.kind] || 0) + 1;
    for (const m of d.marriages) { mar++; if (m.bond > 0) bonded++; assert(m.bond >= 0, 'rivali sposati'); }
  });
  for (const k of ['amicizia', 'corteggiamento', 'rivalità', 'aiuto', 'riconciliazione', 'progetto']) assert(n[k] > 0, 'azione mai avvenuta: ' + k + ' ' + JSON.stringify(n));
  for (const r of allResidents(P, pop, list)) for (const x of P.person(pop, r.id).relations) if (x.strength < 0) neg++;
  assert(neg > 0, 'nessuna rivalità in corso');
  assert(mar >= 15 && bonded / mar >= 0.5, `matrimoni da legami ${bonded}/${mar}`);
  return `${JSON.stringify(n)}; matrimoni da legami ${bonded}/${mar}; rivalità in corso ${neg}`;
};
// Difetti 1 e 2 della revisione: salvataggi validi che venivano rifiutati.
prop.smallSave = P => {
  for (const popN of [4, 8, 12]) for (let seed = 1; seed <= 12; seed++) {
    const list = [{ id: 'capanna', continent: 'c', kind: 'village', population: popN, links: [] }, { id: 'citta', continent: 'c', kind: 'city', population: 3000, links: [] }], pop = P.create(seed, list, 0);
    P.materialize(pop, 'capanna');
    for (let w = 0; w < 150; w++) {
      P.step(pop, w, null);
      if (w % 10 !== 9) continue;
      const b = P.restore(JSON.parse(JSON.stringify(P.serialize(pop))), list, (w + 1) * WEEK);
      assert.equal(b.note || '', '', `capanna da ${popN}, seme ${seed}, settimana ${w}: ${b.note}`);
      assert.equal(P.summary(b, 'citta').alive, P.summary(pop, 'citta').alive);
    }
  }
  const list = world(), pop = P.create(1, list, START);
  P.materialize(pop, 'borgo');
  for (const digits of [20n, 41n, 300n]) for (const id of ['citta', 'borgo']) P.transfer(pop, id, { wages: { [Object.keys(P.summary(pop, id).workers)[0]]: 10n ** digits } });
  P.step(pop, W0, null);
  const b = P.restore(JSON.parse(JSON.stringify(P.serialize(pop))), list, WEEK);
  assert.equal(b.note || '', '', 'cassa enorme rifiutata: ' + b.note);
  for (const id of ['citta', 'borgo']) assert.equal(P.summary(b, id).wealth, P.summary(pop, id).wealth);
  assert(P.summary(b, 'citta').wealth.length > 300);
};
prop.lineageMix = P => {
  for (let i = 0; i < 200; i++) {
    const pop = P.create(1, [{ id: 'luogo' + i, continent: 'c1', kind: 'village', population: 1000, links: [] }], 0);
    let h = 0;
    for (const [k, v] of Object.entries(P.cells(pop, 'luogo' + i))) if (/^human\//.test(k)) h += v;
    assert(h === 430, `luogo${i}: ${h} umani su 1000`);
  }
};
prop.visits = P => {
  const list = world(), go = order => { const p = P.create(3, list, START); for (const id of order) P.materialize(p, id); run(P, p, list, W0, W0 + 150); return allResidents(P, p, list).map(r => JSON.stringify(P.person(p, r.id))).sort(); };
  const a = go(['borgo', 'citta', 'paese', 'porto']), b = go(['porto', 'paese', 'citta', 'borgo']), set = new Set(b);
  const diff = a.filter(x => !set.has(x)).length;
  assert.equal(diff, 0, `${diff}/${a.length} persone diverse cambiando l’ordine delle visite`);
  return `${a.length} persone identiche`;
};
prop.neutral = (P, ids) => {
  const bad = [];
  let lo = 9, hi = 0;
  for (const id of ids || Object.keys(P.biology)) for (const seed of [1, 2]) {
    const pop = P.create(seed, solo('a', 400, id), 0);
    let peak = 0;
    quiet(P, pop, CENTURY, calm, (w, p) => { peak = Math.max(peak, P.summary(p, 'a').alive); });
    const end = P.summary(pop, 'a').alive / 400;
    lo = Math.min(lo, end); hi = Math.max(hi, end);
    if (end < 0.7 || end > 1.15 || peak > 500) bad.push(`${id}: ${(end * 100).toFixed(0)} % (picco ${(peak / 4).toFixed(0)} %)`);
  }
  assert.equal(bad.join(', '), '', 'stirpi insostenibili: ' + bad.join(', '));
  return `finali fra ${(lo * 100).toFixed(0)} % e ${(hi * 100).toFixed(0)} % della capienza`;
};
prop.foundings = P => {
  const list = [...solo('madre', 500, 'human', 'city', ['valle', 'grotta', 'stanza', 'prato']), { id: 'valle', continent: 'c1', kind: 'village', population: 0, links: ['madre'] },
    { id: 'prato', continent: 'c1', kind: 'wild', population: 0, links: ['madre'] }, { id: 'grotta', continent: 'c1', kind: 'dungeon', population: 0, links: ['madre'] }, { id: 'stanza', continent: 'c1', kind: 'interior', population: 0, links: ['madre'] }];
  const pop = P.create(5, list, 0), rec = P.create(5, list, 0);
  for (const p of list) P.materialize(rec, p.id);
  let seen = 0;
  for (let w = 0; w < CENTURY; w++) {
    P.step(pop, w, null); P.step(rec, w, null); seen += P.decisions(rec).foundings.length;
    if (w % 49 === 0) assert.equal(snapshot(P, rec, list), snapshot(P, pop, list), 'fondazione non equivalente alla settimana ' + w);
  }
  const n = id => P.summary(pop, id).alive;
  assert(n('valle') >= 20 && n('prato') >= 10, `valle ${n('valle')}, prato ${n('prato')}`);
  assert.equal(n('grotta') + n('stanza'), 0, 'insediamento in un dungeon o in un interno');
  assert(P.stats(pop).totals.foundings >= 2 && seen >= 2);
  projection(P, rec, 'valle'); clean(P, rec, 'fondazioni');
  const dead = P.create(6, [...solo('m', 600, 'human', 'city', ['v']), ...solo('v', 80, 'human', 'village', ['m'])], 0);
  quiet(P, dead, 60, id => id === 'v' ? { war: 1, disaster: 1, foodScarcity: 1000 } : {});
  const low = P.summary(dead, 'v').alive;
  quiet(P, dead, 400);
  const back = P.summary(dead, 'v').alive;
  assert(low < 20 && back > 30, `ripopolamento: ${low} → ${back}`);
  return `valle ${n('valle')}, prato ${n('prato')}; ripopolato ${low} → ${back}`;
};
prop.labor = P => {
  const go = labor => { const pop = P.create(3, solo('a', 1000, 'human'), 0), tr = []; quiet(P, pop, 60, () => labor ? { labor } : {}, (w, p) => tr.push(P.summary(p, 'a').workers.smith || 0)); return tr; };
  const n = go(null), hi = go({ smith: 2000 }), lo = go({ smith: 200 });
  assert(hi.at(-1) > 1.2 * n.at(-1) && lo.at(-1) < 0.85 * n.at(-1), `fabbri ${lo.at(-1)} / ${n.at(-1)} / ${hi.at(-1)}`);
  for (const t of [hi, lo]) for (let k = 1; k < t.length; k++) assert(Math.abs(t[k] - t[k - 1]) <= 8, 'salto di mestiere non graduale');
  same(n, go({ smith: 1000, boh: 5, guard: 'x' }), 'labor neutro o non valido');
  return `fabbri dopo 60 settimane: ${lo.at(-1)} (eccedenza), ${n.at(-1)} (equilibrio), ${hi.at(-1)} (posti vacanti)`;
};

// ——— Prove ———
check('1. API e forma del riassunto (contratto popolazione ↔ economia)', () => {
  const { P } = fresh(), list = world();
  for (const f of ['create', 'restore', 'serialize', 'step', 'system', 'settle', 'partial', 'summary', 'transfer', 'materialize', 'residents', 'person', 'events', 'stats', 'cells', 'decisions', 'influence', 'know', 'audit', 'configureBiology'])
    assert.equal(typeof P[f], 'function', 'manca ' + f);
  const pop = P.create(19425, list, START);
  let n = 0;
  for (const pl of list) {
    const s = P.summary(pop, pl.id);
    for (const k of ['alive', 'children', 'adults', 'elders', 'households', 'unemployed', 'adventurers']) assert(Number.isInteger(s[k]) && s[k] >= 0, k + ' non intero');
    assert.equal(s.children + s.adults + s.elders, s.alive);
    assert.equal(typeof s.wealth, 'string'); assert(/^(0|[1-9][0-9]*)$/.test(s.wealth));
    assert.equal(Object.values(s.workers).reduce((a, b) => a + b, 0) + s.unemployed + s.adventurers, s.adults, 'lavoratori + disoccupati + avventurieri ≠ adulti a ' + pl.id);
    assert.equal(s.alive, pl.population, 'popolazione iniziale diversa a ' + pl.id);
    n += s.alive;
  }
  same(P.summary(pop, 'ignoto'), P.summary(pop, 'ignoto2')); assert.equal(P.summary(pop, 'ignoto').alive, 0);
  const spec = P.system(s => s.pop);
  assert.equal(spec.level, 3); assert.equal(spec.step, WEEK); assert(Number.isInteger(spec.maxChunks) && spec.maxChunks >= 1);
  return `${n} residenti in ${list.length} luoghi`;
});
check('2. Determinismo: stesso seme → stesso mondo; seme diverso → mondo diverso', () => {
  const go = seed => { const { P } = fresh(), list = world(), pop = P.create(seed, list, START); run(P, pop, list, W0, W0 + 40, { [W0 + 10]: ['borgo'] }); return JSON.stringify(P.serialize(pop)); };
  const a = go(7);
  assert.equal(a, go(7), 'stesso seme, stato diverso'); assert.notEqual(a, go(8), 'semi diversi, stesso stato');
  return `${a.length} caratteri identici`;
});
check('3. Equivalenza aggregato/record: materializzare alla settimana 0, 17, 30, 44 o mai dà gli stessi margini e la stessa ricchezza (160 settimane)', () => {
  const t = prop.equivalence(fresh().P);
  return `5 varianti identiche · nascite ${t.births}, morti ${t.deaths}, matrimoni ${t.marriages}, migrazioni ${t.migrations} (famiglie ${t.families}), fondazioni ${t.foundings}, maturati ${t.matured}`;
});
check('3b. Equivalenza su mondi casuali con segnali avversi, trasferimenti casuali e ripristini (12 mondi × 200 settimane × 4 piani)', () => {
  const { P } = fresh();
  let found = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const r = rng(seed * 101), n = 3 + r(4), list = [], kinds = ['village', 'town', 'city', 'capital', 'dungeon', 'wild', 'interior'], ids = Object.keys(P.biology);
    for (let i = 0; i < n; i++) {
      const kind = kinds[i < 2 ? r(4) : r(7)], lin = {};
      for (let k = 0; k < 1 + r(4); k++) lin[ids[r(ids.length)]] = 1 + r(5);
      list.push({ id: 'p' + i, continent: 'c' + r(2), kind, population: r(4) === 0 && i > 1 ? 0 : r(5) === 0 ? r(16) : 30 + r(260), links: [], lineages: r(3) ? lin : undefined });
    }
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) if (j === i - 1 || r(3) === 0) { list[i].links.push('p' + j); list[j].links.push('p' + i); }
    const sig = w => ({ economy: { signals: id => {
      const h = mix(seed * 31 + id.charCodeAt(1) * 977 + (w >> 3) * 7919), g = mix(h + 1);
      return { foodScarcity: h % 4 === 0 ? g % 1001 : g % 100, prosperity: 300 + g % 1500, wageIndex: 500 + (g >>> 8) % 1000, unemployment: (g >>> 3) % 300, crisis: h % 7 === 0, war: (h >>> 4) % 6 === 0, disaster: (h >>> 9) % 12 === 0, labor: { smith: 500 + g % 1500, guard: (h >>> 7) % 3000 } };
    } } });
    const plans = [{}];
    for (let v = 0; v < 3; v++) { const pl = {}; for (const p of list) if (r(3)) (pl[v ? r(200) : 0] ??= []).push(p.id); plans.push(pl); }
    const pops = plans.map(() => P.create(seed * 7919, list, 0));
    for (let w = 0; w < 200; w++) {
      pops.forEach((pop, v) => {
        for (const id of plans[v][w] || []) P.materialize(pop, id);
        for (const p of list) {
          const s = P.summary(pop, p.id), g = mix(seed + w * 13), wages = {};
          for (const [k, c] of Object.entries(s.workers)) wages[k] = BigInt(c) * BigInt(10 + g % 60);
          P.transfer(pop, p.id, { wages, spend: BigInt(s.alive) * BigInt(g % 40), tax: BigInt(s.wealth) / BigInt(50 + g % 100) });
        }
        P.step(pop, w, sig(w));
      });
      if (w % 4 === 3) { const a = snapshot(P, pops[0], list); for (let v = 1; v < 4; v++) assert.equal(snapshot(P, pops[v], list), a, `seme ${seed}, piano ${v}, settimana ${w}`); }
      if (w % 20 === 19) pops.forEach((p, v) => {
        clean(P, p, `seme ${seed} piano ${v} settimana ${w}`);
        if (!v || w % 40 !== 39) return;
        const raw = JSON.parse(JSON.stringify(P.serialize(p))), b = P.restore(raw, list, (w + 1) * WEEK);
        assert.equal(b.note || '', ''); pops[v] = b;
      });
    }
    found += P.stats(pops[0]).totals.foundings;
  }
  assert(found > 0, 'nessuna fondazione in dodici mondi');
  return `identici; fondazioni ${found}`;
});
check('4. materialize è idempotente; i record non tornano mai coorti; le identità restano stabili', () => {
  const { P } = fresh(), list = world(), pop = P.create(3, list, START);
  run(P, pop, list, W0, W0 + 5);
  const n = P.materialize(pop, 'borgo');
  assert.equal(n, P.summary(pop, 'borgo').alive); projection(P, pop, 'borgo');
  const before = JSON.stringify(P.serialize(pop));
  assert.equal(P.materialize(pop, 'borgo'), 0); assert.equal(JSON.stringify(P.serialize(pop)), before); assert.equal(P.materialize(pop, 'ignoto'), 0);
  const ids0 = new Map(P.residents(pop, 'borgo').map(r => [r.id, r])), gone = new Set();
  run(P, pop, list, W0 + 5, W0 + 60, {}, (w, p) => {
    for (const d of P.decisions(p).deaths) gone.add(d.id);
    assert.equal(P.stats(p).places.borgo.anonymous, 0); assert.equal(P.residents(p, 'borgo').length, P.summary(p, 'borgo').alive);
  });
  let kept = 0;
  for (const [id, r0] of ids0) {
    assert(/^borgo:\d+$/.test(id));
    const r = P.person(pop, id);
    if (gone.has(id)) { assert(!r || !r.alive); continue; }
    assert(r && r.alive, 'identità persa: ' + id); assert.equal(r.name, r0.name); assert.equal(r.lineage, r0.lineage); same(r0.traits, r.traits); kept++;
  }
  return `${n} record a borgo, ${kept} identità vive e stabili, ${gone.size} morti registrate`;
});
check('5. Conservazione: persone, migrazioni a somma zero, id unici, nessuna resurrezione, Scintille esatte (bottino e viveri compresi)', () => {
  const { initial, t, dead } = prop.conservation(fresh().P);
  return `${initial} → ${initial + t.births - t.deaths} vivi, ${dead} morti fra i record, bottino ${t.loot}, viveri ${t.upkeep}`;
});
check('6. Salvataggio in ogni settimana → ripristino fedele → continuazione identica (luoghi materializzati in momenti diversi)', () => `${prop.save(fresh().P)} caratteri`);
check('7. Passo divisibile: a passi interi = a budget zero = resolveAll = intervallo compresso; salvare a metà non perde nulla', () => {
  const list = world(), end = (W0 + 30) * WEEK + 77;
  const direct = (() => { const { P } = fresh(), pop = P.create(9, list, START); P.materialize(pop, 'borgo'); P.materialize(pop, 'citta'); for (let w = W0; w < W0 + 30; w++) P.step(pop, w, env(w)); return JSON.stringify(P.serialize(pop)); })();
  let frames = 0, mid = 0;
  const via = mode => {
    const { P, W } = fresh(), s = { pop: P.create(9, list, START) };
    P.materialize(s.pop, 'borgo'); P.materialize(s.pop, 'citta');
    const spec = P.system(st => st.pop, (st, w) => env(w));
    W.register('population', mode === 'compress' ? { ...spec, maxChunks: 3 } : spec);
    s.world = W.create(START);
    if (mode === 'budget') while (W.lag(s, end) > 0 && frames < 1e6) {
      W.tick(s, end, { budgetMs: 0 }); frames++;
      if (!P.partial(s.pop)) continue;
      mid++;
      if (mid !== 40 && mid !== 400) continue;
      const raw = JSON.parse(JSON.stringify(P.serialize(s.pop))), b = P.restore(raw, list, end);
      assert.equal(b.note || '', ''); assert.equal(P.partial(s.pop), false, 'serialize non ha completato la settimana'); assert.equal(b.week, s.pop.week);
    } else if (mode === 'ticks') for (let m = START; m <= end; m += 4 * 1440 + 13) W.tick(s, m, { budgetMs: Infinity });
    else W.resolveAll(s, end);
    W.tick(s, end, { budgetMs: Infinity }); W.settle(s);
    assert.equal(W.failures(s).length, 0, 'sistema guasto: ' + JSON.stringify(W.failures(s)));
    return JSON.stringify(P.serialize(s.pop));
  };
  for (const m of ['ticks', 'all', 'compress', 'budget']) assert.equal(via(m), direct, 'diverso: ' + m);
  assert(frames > 30 * 10, 'la settimana non è divisa: ' + frames + ' fotogrammi'); assert(mid > 100);
  // Chi agisce da fuori a settimana aperta (materializzare, trasferire, influenzare) la trova completata.
  const { P } = fresh(), a = P.create(9, list, START), b = P.create(9, list, START), spec = P.system(s => s.pop, (s, w) => env(w));
  for (const p of [a, b]) P.materialize(p, 'borgo');
  assert.equal(spec.resolve({ pop: a }, W0 * WEEK, (W0 + 1) * WEEK, { due: () => true }), false); assert.equal(P.partial(a), true);
  P.materialize(a, 'citta'); assert.equal(P.partial(a), false);
  P.step(b, W0, env(W0)); P.materialize(b, 'citta');
  assert.equal(JSON.stringify(P.serialize(a)), JSON.stringify(P.serialize(b)), 'materializzare a metà settimana cambia il mondo');
  assert.notEqual(spec.resolve({ pop: a }, W0 * WEEK, (W0 + 1) * WEEK, { due: () => true }), false);
  return `identici in quattro modi; a budget zero ${frames} fotogrammi per 30 settimane`;
});
prop.arrears = P => {
  const list = world(), cat = w => ({ economy: { signals: () => w === W0 + 9 ? { war: 1, disaster: 1, foodScarcity: 1000 } : {} } });
  const a = P.create(1, list, START), b = P.create(1, list, START), c = P.create(1, list, START);
  for (let w = W0; w < W0 + 10; w++) P.step(a, w, cat(w));
  P.step(b, W0 + 9, cat(W0 + 9)); P.system(s => s.pop, (s, w) => cat(w)).resolve({ pop: c }, (W0 + 9) * WEEK, (W0 + 10) * WEEK);
  assert.equal(snapshot(P, b, list), snapshot(P, a, list), 'step con arretrati diverso'); assert.equal(snapshot(P, c, list), snapshot(P, a, list), 'system con cursore avanti diverso');
};
check('7b. Recupero: le settimane arretrate non ricevono i segnali di oggi (né con step né con un cursore avanti)', () => prop.arrears(fresh().P));
check('8. Nessun immortale: muoiono tutti i residenti iniziali, notabili e conosciuti compresi', () => prop.noImmortals(fresh().P));
check('9. Autonomia: personalità, bisogni e obiettivi cambiano chi migra, parte, cambia mestiere, si sposa (non quanti)', () => prop.autonomy(fresh().P));
check('9b. Scelte forzate ≤ 35 % in un luogo da 500 abitanti (S4)', () => prop.forced(fresh().P));
check('9c. Azioni personali: amicizie, corteggiamenti, rivalità, aiuti, riconciliazioni, progetti; contano nei matrimoni', () => prop.actions(fresh().P));
check('10. Avventurieri: spedizioni con guadagno, ferite, morte ed esperienza; gli esiti migliori ai più esperti', () => prop.expeditions(fresh().P));
check('11. Ripristino: un dato guasto si isola o si ripara, il mondo non si perde; l’irrecuperabile si ricrea con una nota', () => prop.restore(fresh().P));
check('11b. Salvataggi validi mai rifiutati: luoghi minuscoli con mestieri nuovi e importi oltre 40 cifre', () => prop.smallSave(fresh().P));
check('12. Registro narrativo in italiano con tetto; memoria individuale e relazioni con tetto', () => {
  const { P } = fresh(), list = world(), pop = P.create(13, list, START);
  for (const p of list) P.materialize(pop, p.id);
  let text = '';
  run(P, pop, list, W0, W0 + 160, {}, (w, p) => { text += P.events(p).filter(e => e.week === w).map(e => e.text).join('\n') + '\n'; });
  const ev = P.events(pop);
  assert(ev.length > 0 && ev.length <= P.limits.events);
  for (const re of [/Nasce /, /Muore /, /si sposano/, /lascia /, /spedizione|torna da|non torna/, /diventa /]) assert(re.test(text), 'manca nel registro: ' + re);
  let maxMem = 0, maxRel = 0;
  for (const r of allResidents(P, pop, list)) {
    const q = P.person(pop, r.id);
    maxMem = Math.max(maxMem, q.memories.length); maxRel = Math.max(maxRel, q.relations.length);
    for (const m of q.memories) { assert.equal(typeof m.text, 'string'); assert(m.text.length > 3 && !/undefined|\?/.test(m.text), 'ricordo illeggibile: ' + m.text); }
  }
  assert(maxMem > 0 && maxMem <= P.limits.memories); assert(maxRel > 0 && maxRel <= P.limits.relations);
  return `${ev.length} voci (tetto ${P.limits.events}); memoria ≤ ${maxMem}, relazioni ≤ ${maxRel}; es. «${ev.at(-1).text}»`;
});
check('13. Trasferimenti esatti: salari ai lavoratori, spesa e tasse limitate, mai ricchezza negativa, saturazione senza perdite', () => {
  const { P } = fresh(), list = world(), pop = P.create(2, list, START), ref = P.create(2, list, START);
  P.materialize(pop, 'borgo'); P.materialize(ref, 'borgo');
  const wealth = id => BigInt(P.summary(pop, id).wealth), job0 = Object.entries(P.summary(pop, 'borgo').workers).sort((a, b) => b[1] - a[1])[0][0];
  // Salario a una sola professione: dopo il passo lo hanno ricevuto i suoi lavoratori.
  const before = P.residents(pop, 'borgo'), got0 = P.transfer(pop, 'borgo', { wages: { [job0]: 100000n } });
  assert.equal(String(got0.wages), '100000');
  P.step(pop, W0, null); P.step(ref, W0, null);
  let up = 0, upN = 0, other = 0, otherN = 0;
  for (const r of before) {
    const x = P.person(pop, r.id), y = P.person(ref, r.id);
    if (!x || !y || !x.alive || !y.alive) continue;
    const d = Number(BigInt(x.wealth) - BigInt(y.wealth));
    if (r.profession === job0) { up += d; upN++; } else { other += d; otherN++; }
  }
  assert(up / upN > 10 * Math.max(1, Math.abs(other / otherN)), `salari non ai lavoratori: ${(up / upN).toFixed(1)} contro ${(other / otherN).toFixed(1)}`);
  for (const id of ['borgo', 'citta']) {
    const w0 = wealth(id), job = Object.keys(P.summary(pop, id).workers)[0], got = P.transfer(pop, id, { wages: { [job]: 1001n, nessuno: 50n, none: 9n }, spend: w0 * 10n, tax: 5n });
    assert.equal(String(got.wages), '1001', 'salari applicati ≠ richiesti'); assert.equal(String(got.spend), String(w0 + 1001n), 'spesa non limitata'); assert.equal(String(got.tax), '0'); assert.equal(P.summary(pop, id).wealth, '0');
  }
  P.step(pop, W0 + 1, null);
  if (wealth('borgo') === 0n) for (const r of P.residents(pop, 'borgo')) assert.equal(r.wealth, '0', 'ricchezza individuale residua');
  clean(P, pop, 'dopo l’azzeramento');
  const job = Object.entries(P.summary(pop, 'borgo').workers).sort((a, b) => a[1] - b[1])[0][0], huge = (1n << 66n) + 12345n, got = P.transfer(pop, 'borgo', { wages: { [job]: huge } });
  assert.equal(String(got.wages), String(huge));
  P.step(pop, W0 + 2, null);
  assert(wealth('borgo') > huge - 100000n, 'Scintille perse nella saturazione');
  for (const r of P.residents(pop, 'borgo')) assert(BigInt(r.wealth) <= (1n << 63n) - 1n);
  clean(P, pop, 'saturazione');
  const all = wealth('borgo'), spent = P.transfer(pop, 'borgo', { spend: all });
  assert.equal(String(spent.spend), String(all)); assert.equal(P.summary(pop, 'borgo').wealth, '0');
  for (const bad of [null, 'x', { wages: 'x' }, { wages: { farmer: -5n } }, { spend: -1n }, { tax: 1.5 }]) { const g = P.transfer(pop, 'borgo', bad); assert(g.wages >= 0n && g.spend >= 0n && g.tax >= 0n); }
  return 'salari, spesa, tasse e saturazione esatti';
});
check('14. Prestazioni indicative e assenza di costi quadratici (una città di 4 000 e una di 16 000 record)', () => {
  const { P } = fresh(), time = (pop, n) => { const ms = []; for (let k = 0; k < n; k++) { const t0 = process.hrtime.bigint(); P.step(pop, pop.week, null); ms.push(Number(process.hrtime.bigint() - t0) / 1e6); } return median(ms); };
  const t = [4000, 16000].map(n => { const pop = P.create(1, solo('a', n, 'human', 'capital'), 0); P.materialize(pop, 'a'); return time(pop, 15); });
  assert(t[1] < 8 * t[0] + 10, `costo più che lineare: ${t[0].toFixed(1)} → ${t[1].toFixed(1)} ms`);
  const big = [];
  for (let i = 0; i < 200; i++) big.push({ id: 'l' + i, continent: 'c' + (i % 5), kind: ['village', 'town', 'city', 'capital'][i % 4], population: 500, links: ['l' + ((i + 1) % 200), 'l' + ((i + 199) % 200)] });
  const tc = time(P.create(1, big, START), 9);
  assert(tc < 200, `100 000 in coorti: ${tc.toFixed(1)} ms`);
  return `4 000 record ${t[0].toFixed(1)} ms, 16 000 ${t[1].toFixed(1)} ms; 100 000 in coorti ${tc.toFixed(1)} ms`;
});
check('15. Biologia: tutte le stirpi del gioco in una tabella unica e configurabile, in anni di calendario', () => {
  const { P } = fresh(), ids = new Set(), txt = f => fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of txt('engine.js').matchAll(/^\s*lineage\('([a-z]+)'/gm)) ids.add(m[1]);
  for (const f of ['expansion-species.js', 'continental-species.js']) for (const m of txt(f).matchAll(/\[\s*'([a-z]+)',\s*'[^']+',\s*'(?:Comune|Rara|Epica|Leggendaria|Mitica)'/g)) ids.add(m[1]);
  assert.equal(ids.size, 44, 'stirpi trovate nei sorgenti: ' + ids.size);
  for (const id of ids) {
    const b = P.biology[id];
    assert(b, 'manca ' + id); assert.equal(b.provisional, true); assert.equal(typeof b.origin, 'string');
    assert(b.adult > 0 && b.elder > b.adult && b.life > b.elder && b.fertility > 0 && b.childSurvival > 0 && b.childSurvival <= 1, id);
  }
  assert.equal(P.biology.human.adult, 18); assert.equal(P.yearWeeks, YW);
  const shape = new Set([...ids].map(id => [P.biology[id].adult, P.biology[id].elder, P.biology[id].life].join()));
  assert(shape.size >= 30, 'durate copiate: ' + shape.size + ' profili');
  assert.notEqual(P.biology.skeleton.origin, 'nascita'); assert.notEqual(P.biology.elemental.origin, 'nascita');
  // Stirpe sconosciuta in un luogo, tabella riconfigurata, salvataggio con la vecchia tabella caricato con la nuova.
  const pop = P.create(1, solo('a', 200, { sconosciuta: 1, elf: 1 }), 0);
  assert(Object.keys(P.cells(pop, 'a')).some(k => k.startsWith('sconosciuta/')));
  P.materialize(pop, 'a'); quiet(P, pop, 20); clean(P, pop, 'stirpe sconosciuta'); projection(P, pop, 'a');
  const { P: Q } = fresh();
  assert.equal(Q.configureBiology({ human: { adult: 20, elder: 50, life: 60, fertility: 6, childSurvival: 0.9 } }), 1); assert.equal(Q.biology.human.adult, 20); assert.equal(Q.configureBiology({ human: { adult: 50, elder: 20 } }), 0);
  const list = solo('a', 300, 'human'), old = P.create(2, list, 0);
  P.materialize(old, 'a'); quiet(P, old, 30);
  const b = Q.restore(JSON.parse(JSON.stringify(P.serialize(old))), list, 30 * WEEK);
  assert.equal(Q.summary(b, 'a').alive, P.summary(old, 'a').alive); clean(Q, b, 'dopo il cambio di tabella');
  quiet(Q, b, 200); clean(Q, b, 'dopo il cambio di tabella, 200 settimane');
  return `${ids.size} stirpi, ${shape.size} profili diversi`;
});
check('16. Minori: nessuno lavora, combatte, si sposa o migra da solo; adulti mai prima del tempo', () => prop.minors(fresh().P));
check('17. Famiglie: nessun consanguineo sposato, coniugi reciproci, genitori più vecchi dei figli, vedovi risposati dopo il lutto', () => prop.families(fresh().P));
check('17b. Luoghi misti: i residenti noti si sposano con persone vere, hanno figli, partono e muoiono', () => prop.mixed(fresh().P));
check('17c. Eredità al coniuge e poi ai figli', () => prop.inheritance(fresh().P));
check('17d. Miscuglio di stirpi predefinito: nessuna quota persa (430 umani su 1000 in ogni luogo)', () => prop.lineageMix(fresh().P));
check('17e. L’ordine in cui si materializzano i luoghi nella stessa settimana non cambia nessuna persona', () => prop.visits(fresh().P));
check('18. Demografia neutra: ogni stirpe resta fra il 70 e il 115 % della capienza per 100 anni (S1)', () => prop.neutral(fresh().P));
check('18b. Villaggi isolati da 60 abitanti: nessuna estinzione in 100 anni (S2)', () => {
  const { P } = fresh(), out = [];
  for (const id of ['human', 'dwarf', 'skeleton', 'bear', 'fairy', 'elemental', 'wyvern', 'griffin']) {
    const pop = P.create(4, solo('a', 60, id, 'village'), 0);
    let low = 99;
    quiet(P, pop, CENTURY, calm, (w, p) => { low = Math.min(low, P.summary(p, 'a').alive); });
    assert(low >= 20, `${id}: minimo ${low}`); out.push(id + ' ' + low);
  }
  return 'minimi ' + out.join(', ');
});
check('18c. Nessuna stirpe minoritaria soppiantata: luogo misto da 600 abitanti, 100 anni', () => {
  const { P } = fresh(), pop = P.create(3, solo('a', 600, { human: 4, goblin: 2, elf: 2, hare: 1, skeleton: 1 }), 0);
  const count = () => { const c = {}; for (const [k, v] of Object.entries(P.cells(pop, 'a'))) if (!/^(eta|mestiere)\//.test(k)) { const l = k.split('/')[0]; c[l] = (c[l] || 0) + v; } return c; };
  const a = count();
  quiet(P, pop, CENTURY);
  const b = count();
  for (const l of Object.keys(a)) assert(b[l] >= 0.5 * a[l] && b[l] <= 2 * a[l], `${l}: ${a[l]} → ${b[l]}`);
  return JSON.stringify(a) + ' → ' + JSON.stringify(b);
});
check('19. Crisi: guerra, carestia ed epidemia sono pericolose, il luogo si riprende senza rimpiazzo istantaneo (S3)', () => prop.crises(fresh().P));
check('19b. Affollamento: anche nella prosperità la capienza tiene', () => prop.capacity(fresh().P));
check('19c. I migranti scelgono il luogo prospero, non la guerra', () => prop.destinations(fresh().P));
check('20. Nuovi insediamenti: un luogo disabitato adatto viene fondato e cresce; dungeon e interni mai', () => prop.foundings(fresh().P));
check('21. Compattazione: nessuna riga di morto, lapidi limitate, memorie e relazioni solo dei vivi; i conosciuti restano', () => {
  const { P } = fresh(), list = solo('a', 400, { bear: 1, hare: 1 }), pop = P.create(1, list, 0);
  P.materialize(pop, 'a');
  const me = P.residents(pop, 'a').find(r => r.stage === 'adulto' && r.spouse);
  P.know(pop, me.id);
  const bytes = () => { const raw = P.serialize(pop); raw.log = []; return JSON.stringify(raw).length; }; // il registro ha già il suo tetto (300 voci)
  const sp = me.spouse, size0 = bytes();
  let size1 = 0;
  for (let y = 0; y < 100; y++) { quiet(P, pop, 7); if (y === 30) size1 = bytes(); }
  const st = P.stats(pop), size2 = bytes();
  assert.equal(st.records.dead, 0); assert(st.totals.deaths > 1500, 'troppo poche morti: ' + st.totals.deaths); assert(st.records.tombs <= P.limits.tombs);
  const q = P.person(pop, me.id), s = P.person(pop, sp);
  assert(q && !q.alive && q.name === me.name, 'conosciuto perduto'); assert(s && !s.alive, 'coniuge di un conosciuto perduto');
  assert(size2 < 1.35 * size1, `il salvataggio cresce: ${size1} → ${size2}`); assert(size2 < 2.5 * size0, `${size0} → ${size2}`);
  return `${st.totals.deaths} morti, ${st.records.tombs} lapidi; salvataggio ${size0} → ${size1} (30 anni) → ${size2} (100 anni)`;
});
check('21b. Salvataggio di 55 000 record vivi ≤ 2,5 MB, appena materializzati e dopo 100 anni (S5; LONG=1 per i 100 anni)', () => {
  const { P } = fresh(), list = [];
  for (let i = 0; i < 110; i++) list.push({ id: 'l' + i, continent: 'c' + (i % 5), kind: ['village', 'town', 'city'][i % 3], population: 500, links: ['l' + ((i + 1) % 110), 'l' + ((i + 109) % 110)] });
  const pop = P.create(1, list, 0);
  for (const p of list) P.materialize(pop, p.id);
  const mb = () => Buffer.byteLength(JSON.stringify(P.serialize(pop))) / 1e6, a = mb();
  assert(P.stats(pop).records.alive >= 55000); assert(a <= 2.5, `appena materializzati ${a.toFixed(2)} MB`);
  if (!process.env.LONG) return `${a.toFixed(2)} MB`;
  quiet(P, pop, CENTURY);
  const b = mb();
  assert(b / P.stats(pop).records.alive * 55000 <= 2.5, `dopo 100 anni ${b.toFixed(2)} MB per ${P.stats(pop).records.alive} record`);
  return `${a.toFixed(2)} MB → ${b.toFixed(2)} MB per ${P.stats(pop).records.alive} record dopo 100 anni`;
});
check('22. Segnale labor: i mestieri seguono i posti vacanti, gradualmente; assente = equilibrio', () => prop.labor(fresh().P));
check('23. Bottino e viveri: afflusso netto piccolo nel lungo periodo (S8)', () => {
  const { P } = fresh();
  let worst = 0;
  for (const seed of [1, 2, 3]) {
    const list = world(2), pop = P.create(seed, list, 0), w0 = totalWealth(P, pop, list);
    quiet(P, pop, CENTURY);
    const t = P.stats(pop).totals, net = Number(BigInt(t.loot) - BigInt(t.upkeep)) / Number(w0);
    worst = Math.max(worst, Math.abs(net));
    assert.equal(String(totalWealth(P, pop, list)), String(w0 + BigInt(t.loot) - BigInt(t.upkeep)));
  }
  assert(worst <= 0.05, `afflusso netto ${(worst * 100).toFixed(1)} % > 5 %`);
  return `massimo |netto| in 100 anni ${(worst * 100).toFixed(2)} % della moneta`;
});

// ——— Mutazioni: il punto mutato deve esistere, la proprietà (che senza mutazione passa) deve fallire. ———
function mutation(name, from, to, test) {
  check('M. Mutazione: ' + name + ' → rilevata', () => {
    assert(source.includes(from), 'punto da mutare assente: ' + from);
    const { P } = fresh(src => src.replace(from, () => to));
    let caught = null;
    try { test(P); } catch (e) { if (e.name !== 'AssertionError') throw e; caught = e.message; }
    assert(caught, 'mutazione non rilevata');
    return caught.replace(/\s+/g, ' ').slice(0, 90);
  });
}
const eq = P => prop.equivalence(P, 160);
// Le dieci sopravvissute alla revisione precedente.
mutation('eredità mai al coniuge', 'if(amt>0n){give(pop,s,amt);', 'if(false){give(pop,s,amt);', prop.inheritance);
mutation('figli mai eredi', '}else if(amt>0n&&R.kids[i]){', '}else if(false){', prop.inheritance);
mutation('la guerra non uccide', 'war=s.war,dis=s.disaster*12000', 'war=0,dis=s.disaster*12000', prop.crises);
mutation('la carestia non riduce le nascite', '*(1-hunger(s)*.5-Math.min(1,s.foodScarcity/1000)*.45)', '', prop.crises);
mutation('coorti negative accettate', 'if(intIn(x,0,hi))return x;', 'if(Number.isInteger(x))return x;', prop.restore);
mutation('tutti adulti in poche settimane', 'const cw=Math.max(1,Math.ceil(b.adult*YW-1e-9))', 'const cw=3', prop.minors);
mutation('record mai attivi nei luoghi misti', 'return Math.floor(u01(rr(pop,P,code))*total)<recN;', 'return false;', prop.mixed);
mutation('tetto di affollamento assente', '/*CAPIENZA*/clamp((1.25-crowdOf(P,G))/.5,0,1)', '1', prop.capacity);
mutation('vedovanza assente fra i record', 'setClass(pop,s,R.stage[s],3);R.since[s]=w;', '', eq);
mutation('destinazioni che ignorano i segnali', '/*DESTINAZIONI*/dests.map(j=>{', '/*DESTINAZIONI*/dests.map(j=>{return 100;', prop.destinations);
mutation('esiti migliori ai meno esperti', '/*ESITI*/skill(b)-skill(a)', 'skill(a)-skill(b)', prop.expeditions);
// Altre.
mutation('notabili esentati dalla morte', 'const [i]=choose(pop,recs,1,i=>{', 'const spared=recs.filter(j=>!(R.flags[j]&NOTABLE));const [i]=choose(pop,spared.length?spared:recs,1,i=>{', prop.noImmortals);
mutation('scelta senza utilità individuale', 'const u=util(i);', 'const u=0;', prop.autonomy);
mutation('riporto non salvato', '/*RIPORTO*/', 'carry:{},', prop.save);
mutation('trasferimenti in sospeso non salvati', 'if(due)o.due=due;', '', prop.save);
mutation('nascita (settimana) salvata male', 'v(cur-R.born[i]);big(R.wealth[i]);', 'v(cur-R.born[i]+1);big(R.wealth[i]);', prop.save);
mutation('consanguinei ammessi', 'function kin(R,i,j){', 'function kin(R,i,j){return false;', prop.families);
mutation('borsa del migrante persa all’arrivo', 'D.alive+=n;D.wealth+=m.purse;', 'D.alive+=n;', prop.conservation);
mutation('viveri delle spedizioni non pagati', 'P.wealth+=loot-cost;', 'P.wealth+=loot;', prop.conservation);
mutation('lo strato aggregato legge i record', 'n*g.marry*mod/2,n>>1)', 'n*g.marry*mod/2*(P.list.length?1.1:1),n>>1)', eq);
mutation('i bambini noti non diventano adulti', 'if(bucketOf(l,R.born[i],w)<g.nK)continue;', 'continue;', eq);
mutation('mestieri dei record mai riallineati', 'if(P.list.length)yield* reconcile(pop,P,w);', '', eq);
mutation('ordine delle persone per riga invece che canonico', 'const before=(R,i,j)=>', 'const before=(R,i,j)=>true?i<j:', prop.visits);
mutation('importi oltre 40 cifre rifiutati', 'v.length<=100000', 'v.length<=40', prop.smallSave);
mutation('miscuglio di stirpi con segno', "^P.h)>>>0,ws=", "^P.h)|0,ws=", prop.lineageMix);
mutation('segnale labor ignorato', 'lab=s.labor,we=', 'lab=null,we=', prop.labor);
mutation('segnali di oggi alle settimane arretrate', 'w===weekTo?env:null', 'env', prop.arrears);
mutation('figli che partono senza la propria famiglia', "if(mine.length===sorted.length){", "if(false){", P => prop.minors(P, 500, { human: 4, bear: 2 }));

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
