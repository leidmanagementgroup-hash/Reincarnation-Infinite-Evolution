// Uso: node tests/verifica-perf-002.cjs [worktree prima di PERF-002] [worktree da verificare]
// Confronta il comportamento pubblico dei residenti usando il motore reale e un Canvas senza disegno.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const before = path.resolve(process.argv[2] || root);
const after = path.resolve(process.argv[3] || root);
const cityId = 'city-velaris';
const registrar = 'velaris-staff-guild';
let observations = 0;
let positions = 0;
let movingPositions = 0;

function surface() {
  const pixels = {
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    getImageData(_x, _y, width, height) { return pixels.createImageData(width, height); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get: (target, key) => key in target ? target[key] : () => undefined });
  return { width: 1, height: 1, getContext: () => context };
}

function load(directory) {
  const files = fs.readFileSync(path.join(directory, 'build.py'), 'utf8')
    .match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {} }, document: { createElement: surface }, performance,
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, data) => store.set(key, data) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of files) {
    if (file === 'audio.js') break;
    vm.runInContext(fs.readFileSync(path.join(directory, file), 'utf8'), scope, { filename: file });
  }
  return scope;
}

function begin(scope, seed) {
  vm.runInContext(`Math.random = (() => { let calls = 0; return () => calls++ === 0 ? ${seed} / 4294967296 : .24; })()`, scope);
  assert(scope.Game.newGame());
  assert.equal(scope.Game.s.seed, seed);
}

function position(scope, { x, y }) {
  Object.assign(scope.Game.s.player, { x, y });
}

function travel(scope, destination) {
  const { Game, World } = scope;
  for (let steps = 0; Game.s.region !== destination && steps < 16; steps++) {
    const gate = World.route(Game.s.region, destination, Game.s.campaign.stage);
    assert(gate && World.canWalk(gate.x, gate.y, 6), `Passaggio percorribile verso ${destination}`);
    position(scope, gate);
    assert(Game.action('interact'), `Interazione con ${gate.id}`);
  }
  assert.equal(Game.s.region, destination);
}

function atTime(scope, timestamp) {
  const { Game, Calendar } = scope;
  const now = Calendar.timestamp(Game.s.calendar, Game.s.time);
  assert(timestamp >= now - 1e-6, `Il tempo deve avanzare da ${now} a ${timestamp}`);
  Calendar.advance(Game.s.calendar, (timestamp - now) / Calendar.minutesPerSecond);
}

function step(scope, seconds = .05, elapsed = seconds) {
  assert.equal(scope.Game.s.region, scope.World.region);
  scope.Game.step(seconds, {}, elapsed);
}

function snapshot(scope, id = registrar) {
  const { Game, UrbanLife, ActorArt, World } = scope;
  const state = Game.s, drawn = [];
  const draw = ActorArt.draw;
  try {
    ActorArt.draw = (_context, skin, x, y, options) => {
      assert(World.canWalk(x, y, 5), `Residente fuori dal suolo percorribile in ${state.region} (${x}, ${y})`);
      drawn.push({ skin, x, y, moving: options.moving, direction: options.dir });
    };
    for (const actor of UrbanLife.actors(state)) actor.draw(null);
  } finally {
    ActorArt.draw = draw;
  }
  const view = UrbanLife.view(state, id);
  return { drawn, view, sites: UrbanLife.sites(state) };
}

function same(expected, result, label) {
  // La conversione elimina le differenze di prototipo tra i due contesti VM.
  assert.deepEqual(JSON.parse(JSON.stringify(result)), JSON.parse(JSON.stringify(expected)), label);
}

function observe(a, b, label) {
  const expected = snapshot(a), result = snapshot(b);
  same(expected, result, label);
  observations++;
  positions += result.drawn.length;
  movingPositions += result.drawn.filter(actor => actor.moving).length;
}

function comparePersistent(a, b, label) {
  for (const key of ['urban', 'economy', 'reputation', 'calendar']) {
    same(a.Game.s[key] ?? null, b.Game.s[key] ?? null, `${label}: ${key}`);
  }
}

function sampleStreet(a, b, timestamps) {
  const ext = a.UrbanWorld.exterior(a.Game.s.seed);
  const markers = ['plaza', 'district-wind', 'district-kilns', 'arcades-court', 'orchards-court'];
  const points = ext.waypoints.filter(point => markers.includes(point.id));
  assert.equal(points.length, markers.length, 'Tutti gli osservatori di strada sono presenti');
  for (const now of timestamps) {
    atTime(a, now);
    atTime(b, now);
    for (const point of points) {
      position(a, point);
      position(b, point);
      observe(a, b, `Seme ${a.Game.s.seed}, minuto ${now}, ${point.id}`);
    }
  }
}

function midnight(a, b, seed) {
  for (const scope of [a, b]) {
    begin(scope, seed);
    travel(scope, cityId);
  }
  sampleStreet(a, b, [760.12, 785.4, 836.36, 1096.42, 1212.08, 1320]);

  const ext = a.UrbanWorld.exterior(seed);
  // Sosta in una zona con residenti: la cache di prossimità è calda al cambio di giorno.
  const camera = ext.waypoints.find(point => point.id === 'plaza');
  const other = ext.waypoints.find(point => Math.hypot(point.x - camera.x, point.y - camera.y) > 98);
  assert(camera && other, 'Due osservatori distinti per la prova della mezzanotte');
  for (const scope of [a, b]) {
    atTime(scope, 1370);
    position(scope, camera);
  }
  for (let frame = 0; frame < 160; frame++) {
    step(a);
    step(b);
    if ([0, 19, 159].includes(frame)) observe(a, b, `Seme ${seed}, preparazione serale, quadro ${frame + 1}`);
  }
  for (const scope of [a, b]) {
    atTime(scope, 1439.84);
    snapshot(scope);
    step(scope, .05, .35);
    assert.equal(scope.Calendar.absoluteDays(scope.Game.s.calendar, scope.Game.s.time), 1);
  }
  // Prima della correzione la cache del campo visivo poteva sopravvivere brevemente al giorno precedente.
  // Forziamo solo il riferimento a interrogare il piano del nuovo giorno, senza alterare tempo e posizione finale.
  position(a, other);
  snapshot(a);
  position(a, camera);
  observe(a, b, `Seme ${seed}, prima interrogazione dopo mezzanotte`);

  sampleStreet(a, b, [1440.75, 1440 + 391.25, 1440 + 418.5, 1440 + 780.4, 1440 + 1192.11]);
  comparePersistent(a, b, `Seme ${seed}, cambiamento di giorno`);
}

function workHours(scope, kind, expected) {
  const { UrbanLife, UrbanWorld, Game } = scope;
  assert.equal(UrbanWorld.kind(Game.s.region), kind);
  assert.equal(UrbanLife.serviceAvailable(Game.s, kind), expected, `Apertura del servizio ${kind}`);
  const id = `velaris-staff-${kind}`;
  assert.equal(UrbanLife.view(Game.s, id).selected.point !== null, expected, `Presenza del residente ${id}`);
}

function guildService(scope) {
  const { Game, UrbanLife, Inventory } = scope;
  const s = Game.s;
  const selected = UrbanLife.view(s, registrar).selected;
  assert(selected.point, 'Cancelliera al lavoro');
  position(scope, selected.point);
  assert(UrbanLife.use(s, registrar).ok, 'La conversazione apre il pannello della residente');
  Inventory.add(s, 'herb', 1n);
  assert(Game.command('urban', { op: 'chat', id: registrar }));
  assert(Game.command('urban', { op: 'gift', id: registrar }));
  assert(Game.command('urban', { op: 'accept', id: registrar }));
  const commission = UrbanLife.view(s, registrar).commission;
  Inventory.add(s, commission.item, BigInt(commission.amount));
  assert(Game.command('urban', { op: 'deliver', id: registrar }));
  assert(!Game.command('urban', { op: 'deliver', id: registrar }), 'Consegna duplicata respinta');
  assert.equal(UrbanLife.view(s, registrar).selected.trust, 3);
  assert.equal(s.urban.mission.completed, 1);
}

function coldSaveAndSleep() {
  const source = load(before);
  begin(source, 19425);
  travel(source, `${cityId}-guild`);
  atTime(source, 750);
  guildService(source);
  const oldSave = source.Game.exportSave();

  const a = load(before), b = load(after);
  for (const scope of [a, b]) {
    assert(scope.Game.importSave(oldSave), 'Salvataggio precedente dentro la gilda');
    workHours(scope, 'guild', true);
  }
  observe(a, b, 'Caricamento a freddo durante il turno in gilda');
  for (const scope of [a, b]) {
    atTime(scope, 1201);
    workHours(scope, 'guild', false);
    travel(scope, `${cityId}-inn`);
    atTime(scope, 1270);
    position(scope, scope.UrbanWorld.site(scope.Game.s, 'inn-bed').point);
    assert(scope.Game.command('sleep'), 'Riposo tramite il letto della locanda');
    assert.equal(scope.Calendar.view(scope.Game.s.calendar, scope.Game.s.time, scope.Game.s.region).clock, '06:00');
    workHours(scope, 'inn', false);
  }
  observe(a, b, 'Dopo il sonno, prima dell’apertura della locanda');
  for (const scope of [a, b]) {
    atTime(scope, 1440 + 600);
    workHours(scope, 'inn', true);
    assert(scope.Game.save() && scope.Game.load(), 'Salvataggio e ricarica nella locanda');
  }
  observe(a, b, 'Locanda di nuovo aperta dopo salvataggio e ricarica');
  comparePersistent(a, b, 'Riposo e commissione');

  for (const scope of [a, b]) {
    travel(scope, 'verdant-canopy');
    const s = scope.Game.s;
    scope.UrbanLife.tick(s, 0);
    scope.Calendar.advance(s.calendar, scope.Calendar.secondsPerDay * 3);
    s.time += 4;
    scope.UrbanLife.tick(s, 4);
    scope.Economy.tick(s);
    assert.equal(scope.UrbanLife.actors(s).length, 0, 'I residenti di Velaris non compaiono nella Selva');
    travel(scope, cityId);
  }
  observe(a, b, 'Ingresso in città dopo tre giorni fuori regione');
  comparePersistent(a, b, 'Salto di tre giorni e rifornimenti');
}

const a = load(before), b = load(after);
for (const seed of [19425, 555, 2024]) midnight(a, b, seed);
coldSaveAndSleep();
assert(positions > 0 && movingPositions > 0, 'La prova deve includere residenti fermi e in movimento');
console.log(`OK: ${observations} scene equivalenti, ${positions} posizioni percorribili (${movingPositions} in movimento), orari, sonno, salvataggi, commissioni, reputazione ed economia.`);
