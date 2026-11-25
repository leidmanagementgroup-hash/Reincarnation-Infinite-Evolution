// PERF-005: simulazioni a lungo termine dei MODULI ISOLATI (economia viva e residenti autonomi sotto WorldSim), NON del gioco.
// Orizzonti: 30 e 90 giorni; 1, 5, 10, 50 e 100 anni di calendario (48 giorni l'anno; un mondo di 100 anni = 686 settimane).
// Uso:   node tests/simulazione-lunga.cjs [--seeds 19425,7,555,2024,77] [--scale 1] [--scenarios base,piccolo,duro] [--out misure.json]
// Scenari: base (12 luoghi, 5 continenti, 3 080 abitanti, come il gioco), piccolo (4 villaggi da 60–120), duro (base con guerre,
// carestie e calamità imposte). Soglie di sostenibilità fissate PRIMA di misurare (2026-11-24), da 100 anni di calendario:
//   popolazione del mondo fra 60 % e 250 % dell'iniziale (base, piccolo) e mai estinta (duro: almeno 25 %);
//   al massimo un quarto dei luoghi abitati si spopola del tutto (base); mortalità annua media fra 0,5 % e 6 %;
//   moneta totale fra 50 % e 400 % dell'iniziale e indice dei prezzi medio fra 500 e 2 000 ‰ (inflazione limitata);
//   luoghi con carestia (scarsità ≥ 300 ‰) al massimo nel 15 % delle settimane-luogo (base); famiglie con almeno il 10 % della moneta;
//   conti esatti a ogni orizzonte; stesso seme → stesso mondo.
// Soglie aggiunte il 2026-11-25, prima di misurare i residenti nuovi, perché con l'economia nuova carestie e crisi quasi sparivano:
//   duro: a 100 anni almeno il 10 % di morti in più del base con lo stesso seme e scarsità ≥ 300 ‰ in almeno lo 0,5 % delle settimane-luogo.
// Esce con codice 1 se una soglia è violata: il rapporto va letto per intero.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const seeds = opt('seeds', '19425,7,555,2024,77').split(',').map(Number), scale = Number(opt('scale', '1')), outFile = opt('out', '');
const scenarios = opt('scenarios', 'base,piccolo,duro').split(',');
const root = path.resolve(__dirname, '..'), WEEK = 10080, DAY = 1440, YEAR = 48 * DAY;
const HORIZONS = [['30 giorni', 30 * DAY], ['90 giorni', 90 * DAY], ['1 anno', YEAR], ['5 anni', 5 * YEAR], ['10 anni', 10 * YEAR], ['50 anni', 50 * YEAR], ['100 anni', 100 * YEAR]];
const big = v => BigInt(v || 0);

function context() {
  const x = { console: { warn() {}, log() {} }, performance }; x.window = x; vm.createContext(x);
  for (const f of ['world-sim.js', 'world-lod.js', 'living-economy.js', 'world-population.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), x, { filename: f });
  const { WorldSim: W, LivingEconomy: E, WorldPopulation: P } = x;
  x.hooks = null;
  const env = s => ({ population: { summary: id => P.summary(s.pop, id), transfer: (id, f) => P.transfer(s.pop, id, f) }, economy: { signals: id => E.signals(s.eco, id) }, ...(x.hooks ? { world: x.hooks } : {}) });
  W.register('living-economy', E.system(s => s.eco, env)); W.register('population', P.system(s => s.pop, env));
  return x;
}
function places(kind) {
  const P = (id, c, k, n, links) => ({ id, continent: c, kind: k, population: Math.round(n * scale), links });
  if (kind === 'piccolo') return [P('a', 'c1', 'village', 120, ['b']), P('b', 'c1', 'village', 60, ['a', 'c']), P('c', 'c1', 'village', 80, ['b', 'd']), P('d', 'c2', 'village', 100, ['c'])];
  return [P('serralba', 'c1', 'town', 140, ['filoni-borgo', 'velaris-borgo', 'namar', 'calis-porto', 'vela']), P('vela', 'c1', 'village', 90, ['serralba']),
    P('filoni-borgo', 'c2', 'town', 140, ['serralba', 'hadrin', 'filoni']), P('hadrin', 'c2', 'town', 140, ['filoni-borgo']), P('filoni', 'c2', 'city', 600, ['filoni-borgo']),
    P('velaris-borgo', 'c3', 'town', 140, ['serralba', 'siderea', 'velaris']), P('siderea', 'c3', 'town', 140, ['velaris-borgo']), P('velaris', 'c3', 'city', 600, ['velaris-borgo']),
    P('namar', 'c4', 'town', 140, ['serralba', 'fronde']), P('fronde', 'c4', 'town', 140, ['namar']),
    P('calis-porto', 'c5', 'town', 140, ['serralba', 'damar', 'calis']), P('damar', 'c5', 'town', 140, ['calis-porto']), P('calis', 'c5', 'city', 530, ['calis-porto']),
    P('landa', 'c4', 'wild', 0, ['namar']), P('cripta', 'c1', 'dungeon', 0, ['serralba'])];
}
// Scenario duro: guerra per 12 settimane ogni 5 anni in un continente a turno; una calamità ogni 2 anni in un luogo a turno.
const hard = list => { const inhabited = list.filter(p => p.population), conts = [...new Set(list.map(p => p.continent))]; return {
  war: (c, w) => w % 34 < 12 && conts[Math.floor(w / 34) % conts.length] === c ? true : undefined,
  disaster: (id, w) => w % 14 === 3 && inhabited[Math.floor(w / 14) % inhabited.length].id === id ? ['siccita', 'epidemia', 'alluvione'][Math.floor(w / 14) % 3] : undefined }; };
const gini = v => { const a = v.map(Number).sort((x, y) => x - y), n = a.length, sum = a.reduce((x, y) => x + y, 0); return n && sum ? a.reduce((g, x, i) => g + (2 * (i + 1) - n - 1) * x, 0) / (n * sum) : 0; };

const report = { seeds, scale, rows: [], problems: [] };
for (const kind of scenarios) for (const seed of seeds) {
  const x = context(), { WorldSim: W, LivingEconomy: E, WorldPopulation: P } = x, list = places(kind), inhabited = list.filter(p => p.population);
  if (kind === 'duro') x.hooks = hard(list);
  const s = { world: W.create(0), eco: E.create(seed, list, 0), pop: P.create(seed, list, 0) };
  const inhab = () => list.map(p => P.summary(s.pop, p.id));
  const wealth = () => inhab().reduce((a, v) => a + big(v.wealth), 0n), accounts = () => big(E.stats(s.eco).money.accounts);
  const money0 = wealth() + accounts(), alive0 = inhab().reduce((a, v) => a + v.alive, 0);
  let week = 0, famine = 0, placeWeeks = 0, priceSum = 0, priceN = 0, warWeeks = 0, crisisWeeks = 0, lastDeaths = 0, lastMinutes = 0; const t0 = performance.now();
  for (const [label, minutes] of HORIZONS) {
    for (; (week + 1) * WEEK <= minutes; week++) {
      W.resolveAll(s, (week + 1) * WEEK);
      for (const p of inhabited) { const g = E.signals(s.eco, p.id), alive = P.summary(s.pop, p.id).alive; if (!alive) continue; placeWeeks++; if (g.foodScarcity >= 300) famine++; if (g.war) warWeeks++; if (g.crisis) crisisWeeks++; priceSum += g.priceIndex; priceN++; }
    }
    const sums = inhab(), alive = sums.reduce((a, v) => a + v.alive, 0), t = P.stats(s.pop).totals, m = E.stats(s.eco).money, hh = wealth(), tot = hh + accounts(), years = week * WEEK / YEAR;
    const expected = money0 + big(m.minted) - big(m.burned) + big(t.loot) - big(t.upkeep);
    const perHead = sums.filter(v => v.alive).map(v => big(v.wealth) / BigInt(v.alive)), st = E.stats(s.eco);
    const row = { scenario: kind, seed, horizon: label, weeks: week, alive0, alive, births: t.births, deaths: t.deaths, mortalityPerYear: years ? +(100 * t.deaths / years / ((alive + alive0) / 2)).toFixed(2) : 0, birthPerYear: years ? +(100 * t.births / years / ((alive + alive0) / 2)).toFixed(2) : 0,
      migrations: t.migrations, expeditionDeaths: t.expeditionDeaths, emptied: inhabited.filter(p => !P.summary(s.pop, p.id).alive).length, settled: list.filter(p => !p.population && P.summary(s.pop, p.id).alive).length,
      moneyPct: Number(tot * 1000n / money0) / 10, householdPct: tot ? Number(hh * 1000n / tot) / 10 : 0, giniPlaces: +gini(perHead).toFixed(2), priceIndex: priceN ? Math.round(priceSum / priceN) : 1000,
      faminePct: placeWeeks ? +(100 * famine / placeWeeks).toFixed(1) : 0, warPct: placeWeeks ? +(100 * warWeeks / placeWeeks).toFixed(1) : 0, crisisPct: placeWeeks ? +(100 * crisisWeeks / placeWeeks).toFixed(1) : 0,
      businesses: st.businesses, insolvencies: st.counts.insolvency || 0, wars: st.counts.war || 0, caravansLost: st.counts.caravanLost || 0, exact: String(tot) === String(expected), audit: E.audit(s.eco).ok, failures: W.failures(s).length,
      saveKB: +(Buffer.byteLength(JSON.stringify([E.serialize(s.eco), P.serialize(s.pop)], (k, v) => typeof v === 'bigint' ? String(v) : v)) / 1024).toFixed(0), ms: Math.round(performance.now() - t0) };
    report.rows.push(row);
    const bad = (ok, what) => { if (!ok) report.problems.push(`${kind} seme ${seed} a ${label}: ${what}`); };
    bad(row.exact && row.audit && !row.failures, `conti non esatti o sistema guasto (esatti ${row.exact}, registro ${row.audit}, guasti ${row.failures})`);
    if (label === '100 anni') {
      const pct = 100 * alive / alive0;
      bad(pct >= (kind === 'duro' ? 25 : 60) && pct <= 250, `popolazione al ${pct.toFixed(0)} % dell'iniziale`);
      if (kind === 'base') { bad(row.emptied <= inhabited.length / 4, `${row.emptied} luoghi spopolati su ${inhabited.length}`); bad(row.faminePct <= 15, `carestia nel ${row.faminePct} % delle settimane-luogo`); }
      if (kind !== 'duro') bad(row.mortalityPerYear >= .5 && row.mortalityPerYear <= 6, `mortalità annua ${row.mortalityPerYear} %`);
      if (kind === 'duro') {
        const twin = report.rows.find(r => r.scenario === 'base' && r.seed === seed && r.horizon === label);
        if (twin) bad(row.deaths >= twin.deaths * 1.1, `guerre e calamità non pericolose: ${row.deaths} morti contro ${twin.deaths} del base`);
        bad(row.faminePct >= .5, `nessuna carestia nello scenario duro (${row.faminePct} %)`);
      }
      bad(row.moneyPct >= 50&& row.moneyPct <= 400, `moneta al ${row.moneyPct} %`); bad(row.priceIndex >= 500 && row.priceIndex <= 2000, `indice dei prezzi ${row.priceIndex}`); bad(row.householdPct >= 10, `famiglie col ${row.householdPct} % della moneta`);
    }
  }
  const last = report.rows.slice(-HORIZONS.length);
  console.log(`== ${kind}, seme ${seed}`); for (const r of last) console.log(`${r.horizon.padEnd(9)} vivi ${r.alive0}→${r.alive} · nati ${r.births} morti ${r.deaths} (${r.mortalityPerYear} %/anno) · migrati ${r.migrations} · spopolati ${r.emptied} nuovi ${r.settled} · moneta ${r.moneyPct} % famiglie ${r.householdPct} % gini ${r.giniPlaces} · prezzi ${r.priceIndex} carestia ${r.faminePct} % guerra ${r.warPct} % crisi ${r.crisisPct} % · attività ${r.businesses} insolvenze ${r.insolvencies} · ${r.saveKB} KB · ${r.exact && r.audit ? 'conti esatti' : 'CONTI ERRATI'}`);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
}
console.log(report.problems.length ? `\n${report.problems.length} soglie violate:\n- ` + report.problems.join('\n- ') : '\nTutte le soglie di sostenibilità rispettate');
process.exit(report.problems.length ? 1 : 0);
