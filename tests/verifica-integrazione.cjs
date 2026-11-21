const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8')
  .match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1]
  .match(/"[^"]+\.js"/g)
  .map(JSON.parse);

function surface() {
  const pixels = {
    createImageData(width, height) {
      return { width, height, data: new Uint8ClampedArray(width * height * 4) };
    },
    getImageData(_x, _y, width, height) { return pixels.createImageData(width, height); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, {
    get(target, key) { return key in target ? target[key] : () => undefined; },
  });
  return { width: 1, height: 1, getContext: () => context };
}

const store = new Map();
const scope = {
  document: { createElement: surface },
  localStorage: {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  },
};
scope.window = scope;
vm.createContext(scope);
for (const file of modules) {
  if (file === 'audio.js') break;
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file });
}
const { Game, World, Inventory, Gear, UrbanWorld, UrbanLife, Life, Conflicts } = scope;

vm.runInContext('Math.random = (() => { let n = 0; return () => n++ === 0 ? 19425 / 4294967296 : .24; })()', scope);
assert(Game.newGame());
const position = point => Object.assign(Game.s.player, point);
assert.equal(Game.s.version, 7);
assert.equal(Life.view(Game.s).world.statues.length, 5);

Inventory.add(Game.s, 'ore', 2n ** 100n);
const v6 = JSON.parse(Game.exportSave());
v6.version = 6;
delete v6.urban;
delete v6.cityWorks;
assert(Game.importSave(JSON.stringify(v6)));
assert.equal(Inventory.quantity(Game.s, 'ore'), 2n ** 100n);
assert.equal(Game.s.cityWorks.restored, false);
assert(Game.save() && Game.load());

assert(Game.command('gear', { op: 'equip', id: 'gear-cloth' }));
Gear.defend(Game.s, { hit: true, damage: 24 });
const durability = Game.s.gear.items['gear-cloth'].current;
const v5 = JSON.parse(Game.exportSave());
v5.version = 5;
delete v5.urban;
delete v5.cityWorks;
assert(Game.importSave(JSON.stringify(v5)));
assert.equal(Game.s.gear.slots.armor, 'gear-cloth');
assert.equal(Game.s.gear.items['gear-cloth'].current, durability);

const elder = World.points.elder;
position(elder);
Conflicts.damageNpc(Game.s, 'elder', 999, { point: elder, cause: 'Prova di soccorso' });
assert.equal(Conflicts.condition(Game.s, 'elder').status, 'critical');
assert(Game.action('skill3'));
assert.equal(Conflicts.condition(Game.s, 'elder').status, 'healthy');

for (const id of ['ancient-valley', 'verdant-canopy', 'city-velaris']) {
  const gate = World.route(Game.s.region, id, Game.s.campaign.stage);
  assert(gate && World.canWalk(gate.x, gate.y, 6), 'Passaggio percorribile per ' + id);
  position(gate);
  assert(Game.action('interact'));
  assert.equal(Game.s.region, id);
}
const city = UrbanWorld.exterior(Game.s.seed);
assert.equal(city.districts.length, 4);
assert(city.buildings.length >= 60);
assert(UrbanLife.view(Game.s).city.population >= 40);
assert.equal(city.services.length, 7);
const start = World.spawn;
for (const venue of city.services) {
  assert(city.path(start, venue.point, 6)?.length, 'Percorso per ' + venue.id);
  position(venue.point);
  assert(Game.action('interact'));
  assert.equal(UrbanWorld.kind(Game.s.region), venue.id);
  assert(Game.save() && Game.load());
  position(UrbanWorld.site(Game.s, 'exit').point);
  assert(Game.action('interact'));
  assert.equal(Game.s.region, city.region.id);
}
position(city.plaza);
Inventory.add(Game.s, 'work', 2);
assert(Game.command('city-service', { id: 'civic-fountain' }));
assert(Game.save() && Game.load());
assert(Game.s.cityWorks.restored);
assert.equal(Inventory.quantity(Game.s, 'ore'), 2n ** 100n - 2n);

console.log('OK: compatibilità v5/v6→v7, inventario, equipaggiamento, soccorso, sette interni di Velaris e restauro persistente.');
