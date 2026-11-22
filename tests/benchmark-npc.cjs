// PERF-002: VM da riga di comando, calendario e simulatore reali, Canvas fittizio.
// node --expose-gc tests/benchmark-npc.cjs --before <checkout> --after <checkout> --json <report>
// --cold misura anche un salto al mattino senza preriscaldamento; --no-routes salta il controllo delle singole tratte.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const exportMarker = 'window.UrbanLife={';

// Riutilizzato dalla prova in Edge. Cambia solo il catalogo dei profili dentro il processo di prova.
function instrumentPopulation(source) {
  const marker = 'function profiles(seed){';
  assert(source.includes(marker), 'Catalogo dei residenti assente');
  return source.replace(marker, `let perfPopulation = null;
    window.__npcPopulation = (count, seed) => {
      if (count == null) { perfPopulation = null; return; }
      const native = nativeProfiles(seed), staff = native.list.filter(p => p.staff);
      const adults = native.list.filter(p => !p.staff), size = count - staff.length;
      const people = Array.from({ length: size }, (_, i) => {
        if (size <= adults.length) return adults[Math.floor(i * adults.length / size)];
        if (i < adults.length) return adults[i];
        const exemplar = adults[i % adults.length], id = 'perf-test-resident-' + i;
        const n = hash(seed, id), job = tracks[hash(seed, id + 'job') % tracks.length];
        return { ...exemplar, id, name: exemplar.name + ' ' + i, profession: job[0],
          workKind: job[1], pauseKind: job[2], homeKey: hash(seed, id + 'home'),
          timetable: hash(seed, id + 'when'), tempo: 42 + Math.floor(n / 117) % 17,
          planBias: n, age: 21 + Math.floor(n / 701) % 36 };
      }).concat(staff);
      perfPopulation = { list: people, lookup: Object.fromEntries(people.map(p => [p.id, p])), races: native.races };
    };
    function profiles(seed) { return perfPopulation || nativeProfiles(seed); }
    function nativeProfiles(seed){`);
}

function instrumentPlanner(source) {
  assert(source.includes(exportMarker) && source.includes('function spread('), 'API del pianificatore assente');
  const scheduler = source.includes('function prepareNextDay(');
  const methods = scheduler ? ['spread', 'prepareNextDay'] : ['spread'];
  for (const name of methods) source = source.replace(`function ${name}(`, `function timed_${name}(`);
  const wrappers = methods.map(name => `
    function ${name}(...args) {
      if (perf.active) return timed_${name}(...args);
      perf.active = true;
      const start = performance.now();
      try { return timed_${name}(...args); }
      finally { perf.planner += performance.now() - start; perf.active = false; }
    }`).join('');
  return source.replace(exportMarker, `
    const perf = { active: false, planner: 0, path: 0, plannerPath: 0, pathCalls: 0 };
    ${wrappers}
    window.__npcBench = { perf, scheduler: ${scheduler}, profiles, useRuntime, dailyPlan, samplePlan, sampleStreet,
      route, checkPathPoint: (runtime, point) => checkPathPoint.length === 3
        ? checkPathPoint(runtime, point.x, point.y) : checkPathPoint(runtime, point) };
    ${exportMarker}`);
}

function surface() {
  const pixels = {
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    getImageData(_x, _y, w, h) { return this.createImageData(w, h); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; }
  };
  const ctx = new Proxy(pixels, { get: (target, prop) => target[prop] ?? (() => {}) });
  return { width: 1, height: 1, getContext: () => ctx };
}

function load(project) {
  const modules = fs.readFileSync(path.join(project, 'build.py'), 'utf8')
    .match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const storage = new Map();
  const scope = { performance, console, document: { createElement: surface }, localStorage: {
    getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v)
  } };
  scope.window = scope;
  vm.createContext(scope);
  for (const name of modules) {
    if (name === 'audio.js') break;
    let source = fs.readFileSync(path.join(project, name), 'utf8');
    if (name === 'urban-life.js') source = instrumentPlanner(instrumentPopulation(source));
    vm.runInContext(source, scope, { filename: name });
  }
  return scope;
}

const digest = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sum = values => values.reduce((a, b) => a + b, 0);
const round = n => +n.toFixed(3);
const quantile = (values, q) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)] ?? 0;
};
const kib = n => +(n / 1024).toFixed(1);

function inspectPlans(bench, state, runtime, people, validateRoutes) {
  const plans = people.map(person => ({ person, plan: bench.dailyPlan(state, person, runtime) }));
  const location = ({ x, y, id, kind, name }) => [x, y, id, kind, name];
  const scheduleHash = digest(plans.map(({ person, plan }) => [person.id, location(plan.home), location(plan.work),
    plan.schedule.map(stop => [stop.at, stop.label, stop.inside, location(stop.point)])]));
  if (!validateRoutes) return { scheduleHash };
  const examined = new Map();
  let departures = 0;
  let stuck = 0;
  let offRoad = 0;
  let badStops = 0;
  let worstArrivalMinutes = 0;
  let arrivalsAfterNextStop = 0;
  for (const { person, plan } of plans) {
    for (const [i, stop] of plan.schedule.entries()) {
      const to = stop.point;
      if (!bench.checkPathPoint(runtime, to)) badStops++;
      if (!i) continue;
      const from = plan.schedule[i - 1].point;
      if (Math.hypot(to.x - from.x, to.y - from.y) < 1) continue;
      departures++;
      const key = `${from.x},${from.y}/${to.x},${to.y}`;
      if (!examined.has(key)) examined.set(key, bench.route(runtime, from, to));
      const route = examined.get(key);
      if (!route) { stuck++; continue; }
      const travelMinutes = route.sum / person.tempo * 0.8;
      worstArrivalMinutes = Math.max(worstArrivalMinutes, travelMinutes);
      const deadline = plan.schedule[i + 1]?.at ?? 1440;
      if (stop.at + travelMinutes > deadline) arrivalsAfterNextStop++;
      for (const portion of [.1, .5, .9]) {
        const target = route.sum * portion;
        const index = route.lengths.findIndex(value => value >= target);
        const lo = route.points[index - 1], hi = route.points[index];
        const progress = (target - route.lengths[index - 1]) / (route.lengths[index] - route.lengths[index - 1]);
        if (!bench.checkPathPoint(runtime, { x: lo.x + (hi.x - lo.x) * progress, y: lo.y + (hi.y - lo.y) * progress })) offRoad++;
      }
    }
  }
  const routeHash = digest([...examined].map(([key, route]) =>
    [key, route && [route.sum, route.lengths, route.points.map(p => [p.x, p.y])]]));
  return { scheduleHash, routeHash, departures, distinctRoutes: examined.size, stuck, offRoad, badStops,
    worstArrivalMinutes: round(worstArrivalMinutes), arrivalsAfterNextStop };
}

function runSample(scope, seed, count, validateRoutes, testColdJump) {
  const { Game, Calendar, World, UrbanLife, __npcBench: bench } = scope;
  vm.runInContext(`Math.random = (() => { let calls = 0; return () => calls++ === 0 ? ${seed} / 4294967296 : .24; })();`, scope);
  assert(Game.newGame(), 'Nuova partita');
  const s = Game.s;
  s.region = 'city-velaris';
  const runtime = bench.useRuntime(s);
  Object.assign(s.player, runtime.ext.plaza);
  World.setRegion(s.region, seed);
  const people = bench.profiles(seed).list;
  assert.equal(people.length, count ?? people.length);

  // Non accumulare involucri quando i test ripetono lo stesso seme sulla stessa mappa.
  const pathfinder = runtime.ext.path;
  runtime.ext.path = (...args) => {
    const start = performance.now();
    try { return pathfinder(...args); }
    finally {
      const duration = performance.now() - start;
      bench.perf.path += duration;
      bench.perf.pathCalls++;
      if (bench.perf.active) bench.perf.plannerPath += duration;
    }
  };

  const rates = {
    delta: 1 / 60, calendar: Calendar.minutesPerSecond, from: Calendar.timestamp(s.calendar, 0)
  };
  const setClock = minute => { s.time = (minute - rates.from) / rates.calendar; };
  const metrics = [];
  const frame = () => {
    Object.assign(bench.perf, { planner: 0, path: 0, plannerPath: 0, pathCalls: 0 });
    const start = performance.now();
    UrbanLife.tick(s, rates.delta);
    UrbanLife.actors(s, s.time);
    const cpu = performance.now() - start;
    metrics.push({ cpu, planner: bench.perf.planner, path: bench.perf.path,
      plannerPath: bench.perf.plannerPath, pathCalls: bench.perf.pathCalls });
  };

  try {
    setClock(1319.5);
    UrbanLife.tick(s, rates.delta);
    UrbanLife.actors(s, s.time);
    assert.equal(runtime.plansDay, 0, 'Il giorno di partenza deve essere già pianificato');

    if (global.gc) global.gc();
    const heapStart = process.memoryUsage().heapUsed;
    let heapHigh = heapStart;
    let readyHeap = null;
    let preparationFrames = 0;
    let readyMinute = null;
    for (let i = 0; i < (bench.scheduler ? 9000 : 1); i++) {
      setClock(1320 + i * rates.delta * rates.calendar + 1e-6);
      frame();
      preparationFrames++;
      heapHigh = Math.max(heapHigh, process.memoryUsage().heapUsed);
      if (runtime.nextPlans?.day === 1) {
        readyMinute = Calendar.timestamp(s.calendar, s.time);
        if (global.gc) {
          global.gc();
          readyHeap = process.memoryUsage().heapUsed;
        }
        break;
      }
    }
    const midnight = metrics.length;
    setClock(1440.000001);
    frame();
    heapHigh = Math.max(heapHigh, process.memoryUsage().heapUsed);
    const readyAtMidnight = runtime.plansDay === 1;
    assert(readyAtMidnight, 'Giorno nuovo non reso disponibile al primo frame');
    if (global.gc) global.gc();
    const heapEnd = process.memoryUsage().heapUsed;
    const planning = metrics.map(r => Math.max(0, r.planner - r.plannerPath));
    const result = {
      seed, population: people.length, variant: count || 'native', scheduler: bench.scheduler,
      preparationFrames, readyMinute: readyMinute === null ? null : round(readyMinute), readyAtMidnight,
      planningMs: round(sum(planning)), maxPlanningFrameMs: round(Math.max(...planning)),
      midnightPlanningMs: round(planning[midnight]), plannerPathMs: round(sum(metrics.map(r => r.plannerPath))),
      otherPathMs: round(sum(metrics.map(r => r.path - r.plannerPath))), pathCalls: sum(metrics.map(r => r.pathCalls)),
      maxLogicFrameMs: round(Math.max(...metrics.map(r => r.cpu))),
      midnightLogicMs: round(metrics[midnight].cpu), framesOver16_67Ms: metrics.filter(r => r.cpu > 1000 / 60).length,
      heap: global.gc ? { retainedKiB: kib(heapEnd - heapStart), heapBeforeKiB: kib(heapStart),
        preparedKiB: readyHeap === null ? null : kib(readyHeap - heapStart), sampledHighWaterKiB: kib(heapHigh - heapStart) } : null,
      ...inspectPlans(bench, s, runtime, people, validateRoutes)
    };
    if (testColdJump) {
      setClock(3 * 1440 + 360);
      frame();
      const cold = metrics.at(-1);
      assert.equal(runtime.plansDay, 3, 'Giorno corretto dopo il salto del calendario');
      result.jumpPlanningMs = round(Math.max(0, cold.planner - cold.plannerPath));
      result.jumpLogicMs = round(cold.cpu);
    }
    return result;
  } finally {
    runtime.ext.path = pathfinder;
  }
}

function summarize(records, counts) {
  return counts.map(count => {
    const samples = records.filter(record => record.variant === (count || 'native'));
    const values = key => samples.map(sample => sample[key]);
    return { population: samples[0].population, scenario: samples[0].variant, samples: samples.length,
      planningMedianMs: round(quantile(values('planningMs'), .5)),
      planningWorstFrameMs: round(Math.max(...values('maxPlanningFrameMs'))),
      midnightWorstPlanningMs: round(Math.max(...values('midnightPlanningMs'))),
      midnightWorstLogicMs: round(Math.max(...values('midnightLogicMs'))),
      logicWorstFrameMs: round(Math.max(...values('maxLogicFrameMs'))),
      jumpWorstLogicMs: samples[0].jumpLogicMs === undefined ? null : Math.max(...values('jumpLogicMs')),
      plannerPathMedianMs: round(quantile(values('plannerPathMs'), .5)),
      overBudgetFrames: sum(values('framesOver16_67Ms')),
      warmFramesMax: Math.max(...values('preparationFrames')),
      retainedKiB: samples[0].heap ? quantile(samples.map(record => record.heap.retainedKiB), .5) : null,
      preparedKiB: samples[0].heap?.preparedKiB == null ? null : quantile(samples.map(record => record.heap.preparedKiB), .5),
      sampledHighWaterKiB: samples[0].heap ? quantile(samples.map(record => record.heap.sampledHighWaterKiB), .5) : null,
      stuck: samples[0].stuck === undefined ? null : sum(values('stuck').filter(Number.isFinite)),
      offRoad: samples[0].offRoad === undefined ? null : sum(values('offRoad').filter(Number.isFinite)),
      badStops: samples[0].badStops === undefined ? null : sum(values('badStops').filter(Number.isFinite)),
      lateArrivals: samples[0].arrivalsAfterNextStop === undefined ? null : sum(values('arrivalsAfterNextStop').filter(Number.isFinite)) };
  });
}

function main(args) {
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    if (index === -1) return fallback;
    assert(args[index + 1] && !args[index + 1].startsWith('--'), `Manca il valore di ${name}`);
    return args[index + 1];
  };
  const before = option('--before', null);
  const after = option('--after', root);
  const seeds = option('--seeds', '19425,555').split(',').map(Number);
  const counts = option('--counts', '20,50,native,100,250,500').split(',').map(s => s === 'native' ? null : Number(s));
  const repetitions = Number(option('--reps', '2'));
  assert(seeds.every(s => Number.isInteger(s) && s >= 0 && s <= 0xffffffff), 'Semi non validi');
  assert(counts.every(n => n === null || Number.isInteger(n) && n >= 7), 'Popolazioni non valide');
  assert(Number.isInteger(repetitions) && repetitions >= 1, 'Numero di ripetizioni non valido');

  const versions = Object.fromEntries(Object.entries({ before, after }).filter(([, dir]) => dir).map(([label, dir]) =>
    [label, { directory: path.resolve(dir), scope: load(path.resolve(dir)), records: [] }]));
  for (const count of counts) for (const seed of seeds) for (let i = 0; i < repetitions; i++) {
    const entries = Object.values(versions);
    if (i % 2) entries.reverse();
    const results = entries.map(version => {
      version.scope.__npcPopulation(count, seed);
      const measurement = runSample(version.scope, seed, count, i === 0 && !args.includes('--no-routes'), args.includes('--cold'));
      version.records.push(measurement);
      return measurement;
    });
    if (results.length === 2) {
      assert.equal(results[0].scheduleHash, results[1].scheduleHash, `Routine diverse (${seed}/${count})`);
      assert.equal(results[0].routeHash, results[1].routeHash, `Percorsi diversi (${seed}/${count})`);
    }
  }
  const report = { machine: { cpu: os.cpus()[0]?.model, node: process.version }, seeds, repetitions,
    routeValidation: !args.includes('--no-routes'), syntheticTime: '60 fotogrammi/s, nessun rendering',
    versions: Object.fromEntries(Object.entries(versions).map(([label, v]) => [label, {
      directory: v.directory, summary: summarize(v.records, counts), records: v.records
    }])) };
  for (const [label, version] of Object.entries(report.versions)) {
    console.log(label, version.directory);
    console.table(version.summary);
  }
  const output = option('--json', null);
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { instrumentPopulation, instrumentPlanner };
