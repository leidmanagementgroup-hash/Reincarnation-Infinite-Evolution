// PERF-003: pianificazione dei residenti di Velaris più rapida e identica. Motore reale in Node, Canvas senza disegno.
// Uso:   node tests/verifica-perf-003.cjs [cartella-di-riferimento] [cartella-da-verificare] [--seeds 19425,555,2024]
//          [--sizes native,50,250,500] [--days 3]
//   Riferimento predefinito: ../Reincarnation (main). Da verificare: questa cartella.
// Per ogni seme, popolazione (sintetica di PERF-002, tests/benchmark-npc.cjs) e giorno si costruisce da zero il piano di tutti
// i residenti in entrambe le versioni e si confrontano byte per byte: casa, lavoro e ogni sosta (orario, punto, nome, attività,
// interno). Si misura il tempo di pianificazione (stessa macchina, stesso processo, versioni alternate). Una mutazione (vicino
// più prossimo che salta la colonna destra degli anelli) deve far fallire il confronto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const seeds = opt('seeds', '19425,555,2024').split(',').map(Number);
const sizes = opt('sizes', 'native,50,250,500').split(',').map(s => s === 'native' ? null : Number(s));
const days = Number(opt('days', '3'));
const here = path.resolve(__dirname, '..');
const reference = path.resolve(args[0] || path.join(here, '..', 'Reincarnation'));
const target = path.resolve(args[1] || here);

function surface() {
  const pixels = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData(_x, _y, w, h) { return pixels.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (t, k) => k in t ? t[k] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}
function load(root, mutate = null) {
  const { instrumentPopulation, instrumentPlanner } = require(path.join(root, 'tests', 'benchmark-npc.cjs'));
  const files = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, performance, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) {
    if (file === 'audio.js') break;
    let source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file === 'urban-life.js') { source = instrumentPlanner(instrumentPopulation(source)); if (mutate) source = mutate(source); }
    vm.runInContext(source, scope, { filename: file });
  }
  return scope;
}
function game(scope, seed, population) {
  vm.runInContext(`Math.random = (() => { let n = 0; return () => n++ === 0 ? ${seed} / 4294967296 : .24; })()`, scope);
  assert(scope.Game.newGame());
  scope.__npcPopulation(population, seed);
  return scope.Game.s;
}
// Piano di un giorno, costruito da zero (niente piani già pronti), come JSON confrontabile.
function plan(scope, s, day) {
  const B = scope.__npcBench, rt = B.useRuntime(s);
  Object.assign(rt, { plans: null, plansDay: null, nextPlans: null, preparing: null });
  s.calendar.offset += (day - Math.floor(scope.Calendar.timestamp(s.calendar, s.time) / 1440)) * 1440;
  const list = B.profiles(s.seed).list;
  const t = performance.now();
  B.dailyPlan(s, list[0], rt);
  const ms = performance.now() - t;
  const point = q => [q.x, q.y, q.name ?? null];
  const json = JSON.stringify(list.map(p => { const x = B.dailyPlan(s, p, rt);
    return [p.id, point(x.home), point(x.work), x.schedule.map(e => [e.at, point(e.point), e.label, e.inside ?? null])]; }));
  return { json, ms };
}

const results = [];
const check = (name, fn) => {
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 300)); }
};
for (const population of sizes) {
  const label = population ?? 'nativa (95)';
  check(`${label}: piani identici a main (${seeds.length} semi × ${days} giorni) e tempo di pianificazione`, () => {
    const timesA = [], timesB = [];
    let stops = 0;
    for (const seed of seeds) {
      const a = load(reference), b = load(target);
      const sa = game(a, seed, population), sb = game(b, seed, population);
      const d0 = Math.floor(a.Calendar.timestamp(sa.calendar, sa.time) / 1440);
      for (let k = 0; k < days; k++) {
        const order = k % 2 ? [[b, sb, timesB], [a, sa, timesA]] : [[a, sa, timesA], [b, sb, timesB]];
        const out = new Map();
        for (const [scope, s, times] of order) { const r = plan(scope, s, d0 + k + 1); times.push(r.ms); out.set(scope, r.json); }
        assert.equal(out.get(b), out.get(a), `piano diverso: seme ${seed}, giorno ${d0 + k + 1}`);
        stops += JSON.parse(out.get(b)).reduce((n, r) => n + r[3].length, 0);
      }
    }
    const median = v => v.slice().sort((x, y) => x - y)[Math.floor(v.length / 2)].toFixed(1);
    return `${seeds.length * days} piani identici (${stops} soste); pianificazione mediana main ${median(timesA)} ms → ${median(timesB)} ms`;
  });
}
// Scenari del gioco vero, fotogramma per fotogramma contro main: rientro in città il giorno dopo, sonno prima delle 22:00,
// caricamento della partita. Per ogni scena critica si confrontano i residenti disegnati e si misura il pianificatore eseguito
// in quel fotogramma (spread o prepareNextDay sincroni, cronometrati dalla strumentazione di PERF-002).
function scene(scope) {
  const { Game, UrbanLife, ActorArt, World } = scope, drawn = [], draw = ActorArt.draw;
  const bench = scope.__npcBench; bench.perf.planner = 0;
  try {
    ActorArt.draw = (_c, skin, x, y, o) => { assert(World.canWalk(x, y, 5), `Residente fuori dal suolo percorribile (${x}, ${y})`); drawn.push([skin, x, y, o.moving, o.dir]); };
    for (const actor of UrbanLife.actors(Game.s)) actor.draw(null);
  } finally { ActorArt.draw = draw; }
  return { json: JSON.stringify({ drawn, view: UrbanLife.view(Game.s, 'velaris-staff-guild'), sites: UrbanLife.sites(Game.s) }), planner: bench.perf.planner, count: drawn.length };
}
function situation(seed, population) {
  const pair = [load(reference), load(target)];
  for (const scope of pair) {
    const s = game(scope, seed, population), { World, Calendar, UrbanWorld } = scope;
    scope.travel = target => {
      for (let i = 0; i < 10 && scope.Game.s.region !== target; i++) {
        const gate = World.route(scope.Game.s.region, target, scope.Game.s.campaign.stage);
        Object.assign(scope.Game.s.player, { x: gate.x, y: gate.y }); assert(scope.Game.action('interact'));
      }
      assert.equal(scope.Game.s.region, target);
    };
    scope.travel('city-velaris');
    const plaza = UrbanWorld.exterior(s.seed).plaza; scope.plaza = plaza.point || plaza;
    Object.assign(s.player, scope.plaza);
    const time = () => Calendar.timestamp(scope.Game.s.calendar, scope.Game.s.time);
    let base = Math.floor(time() / 1440) * 1440; if (time() > base + 590) base += 1440;
    scope.base = base;
    scope.jump = minute => { const c = base + minute - time(); assert(c >= 0); scope.Game.s.calendar.offset += c; };
    scope.frames = n => { for (let i = 0; i < n; i++) scope.Game.step(1 / 60, {}); };
    scope.ready = () => { const rt = scope.__npcBench.useRuntime(scope.Game.s), d = Math.floor(time() / 1440); return rt.nextPlans?.day === d + 1; };
  }
  return pair;
}
const both = (pair, fn) => pair.forEach(fn);
function compareScene(pair, label) {
  const [x, y] = pair.map(scene);
  assert.equal(y.json, x.json, 'Scene diverse: ' + label);
  return { before: x.planner, after: y.planner, count: y.count };
}
function untilReady(pair, max = 8000) {
  let i = 0;
  for (; i < max && !pair[1].ready(); i++) both(pair, x => x.frames(1));
  assert(pair[1].ready(), 'piano di domani mai pronto');
  return i;
}
const fmt = r => `${r.before.toFixed(1)} → ${r.after.toFixed(1)} ms`;
for (const population of sizes.includes(500) ? [null, 500] : [sizes[0]]) {
  const label = population ?? 'nativa (95)';
  check(`${label}: rientro in città il giorno dopo, sonno prima delle 22:00 e caricamento identici a main; pianificatore nel fotogramma critico`, () => {
    // Rientro: mattino in città, uscita, ore che passano fuori fino al giorno dopo, ritorno.
    let pair = situation(seeds[0], population);
    both(pair, x => x.jump(10 * 60)); compareScene(pair, 'mattino');
    const warm = untilReady(pair);
    both(pair, x => x.travel(x.World.route('city-velaris', 'valley', x.Game.s.campaign.stage)?.to || 'valley'));
    both(pair, x => x.jump(1440 + 9 * 60)); both(pair, x => x.frames(600));
    both(pair, x => { x.travel('city-velaris'); Object.assign(x.Game.s.player, x.plaza); });
    const reenter = compareScene(pair, 'rientro il giorno dopo');
    both(pair, x => x.frames(120)); compareScene(pair, 'dopo il rientro');
    // Sonno prima delle 22:00: alle 15:00 in città, poi il tempo salta alle 06:00 del giorno dopo.
    both(pair, x => x.jump(1440 + 15 * 60)); compareScene(pair, '15:00');
    untilReady(pair);
    both(pair, x => x.jump(2 * 1440 + 6 * 60));
    const sleep = compareScene(pair, 'risveglio alle 06:00');
    both(pair, x => x.frames(120)); compareScene(pair, 'dopo il risveglio');
    // Caricamento della partita salvata.
    both(pair, x => { assert(x.Game.save() && x.Game.load()); Object.assign(x.Game.s.player, x.plaza); });
    const loaded = compareScene(pair, 'dopo il caricamento');
    both(pair, x => x.frames(120)); compareScene(pair, 'dopo il caricamento, 2 s');
    for (const key of ['urban', 'economy', 'reputation', 'calendar'])
      assert.equal(JSON.stringify(pair[1].Game.s[key]), JSON.stringify(pair[0].Game.s[key]), 'Stato salvato diverso: ' + key);
    assert(reenter.after < reenter.before * .2 + 1, 'il rientro pianifica ancora tutto: ' + fmt(reenter));
    assert(sleep.after < sleep.before * .2 + 1, 'il risveglio pianifica ancora tutto: ' + fmt(sleep));
    return `piano di domani pronto dopo ${warm} fotogrammi; pianificatore nel fotogramma: rientro ${fmt(reenter)}, risveglio ${fmt(sleep)}, caricamento ${fmt(loaded)} (Node)`;
  });
}
check('Mutazione: la ricerca salta la colonna destra degli anelli → piani diversi da main', () => {
  const a = load(reference), b = load(target, src => src.replace('x+=edge?1:2*k', 'x+=edge?1:4*k'));
  let differ = false;
  for (const seed of seeds) {
    const sa = game(a, seed, 250), sb = game(b, seed, 250);
    const d = Math.floor(a.Calendar.timestamp(sa.calendar, sa.time) / 1440) + 1;
    if (plan(a, sa, d).json !== plan(b, sb, d).json) { differ = true; break; }
  }
  assert(differ, 'la mutazione non è stata rilevata');
  return 'rilevata';
});

const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
