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
const warnings = [];
const scope = {
  console: { warn: message => warnings.push(String(message)) },
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
const { Game, World, Inventory, Gear, UrbanWorld, UrbanLife, Life, Conflicts, Calendar, Economy } = scope;

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
assert.equal(city.districts.length, 6);
const tier = UrbanWorld.settlementTypes[World.regions[city.region.id].settlementType];
assert(city.buildings.length >= 130 && city.buildings.length <= tier.maxBuildings);
assert(UrbanLife.view(Game.s).city.population >= 40);
assert.equal(city.services.length, 8);
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

const grainAtMarket = () => Economy.view(Game.s).market.rows.find(row => row.id === 'grain');
const velaBeforeSupply = JSON.stringify(Game.s.economy.markets.vela);
const grainBeforeSupply = Game.s.urban.city.stock.grain;
const emptyMarket = Game.s.economy.markets.velaris;
delete emptyMarket.stock.grain;
const shortagePrice = grainAtMarket().buy;
UrbanLife.tick(Game.s, 0);
Calendar.advance(Game.s.calendar, Calendar.secondsPerDay);
Game.s.time += 4;
UrbanLife.tick(Game.s, 4);
assert.equal(grainAtMarket().stock, '7');
assert(grainAtMarket().buy < shortagePrice);
assert.equal(Game.s.urban.city.stock.grain, grainBeforeSupply);
assert.equal(JSON.stringify(Game.s.economy.markets.vela), velaBeforeSupply);

const shop = city.services.find(site => site.id === 'shop');
position(shop.point);
assert(Game.action('interact'));
position(UrbanWorld.site(Game.s, 'shop').point);
const goldBeforeTrade = Game.s.player.gold;
const priceBeforeTrade = grainAtMarket().buy;
assert(Game.command('economy', { op: 'buy', id: 'grain', amount: '1' }));
assert.equal(Game.s.player.gold, goldBeforeTrade - priceBeforeTrade);
assert(Game.save() && Game.load());
assert.equal(grainAtMarket().stock, '6');
assert.equal(Game.s.urban.city.stock.grain, grainBeforeSupply);

position(UrbanWorld.site(Game.s, 'exit').point);
assert(Game.action('interact'));
position(city.services.find(site => site.id === 'guild').point);
assert(Game.action('interact'));
Calendar.advance(Game.s.calendar, 225);
position(UrbanWorld.interior('guild', Game.s.seed).npcLocations[0].point);
const clerk = UrbanLife.sites(Game.s).find(site => site.id === 'velaris-staff-guild');
assert(clerk, 'Cancelliera presente al turno del mattino');
position(clerk.point);
assert(Game.command('urban', { op: 'accept', id: clerk.id }));
const order = UrbanLife.view(Game.s, clerk.id).commission;
delete Game.s.economy.markets.velaris.stock[order.item];
const reserveBeforeOrder = Game.s.urban.city.stock[order.item];
Inventory.add(Game.s, order.item, order.amount);
const carriedBeforeOrder = Inventory.quantity(Game.s, order.item);
assert(Game.command('urban', { op: 'deliver', id: clerk.id }));
assert.equal(Game.s.economy.markets.velaris.stock[order.item], String(order.amount));
assert.equal(Game.s.urban.city.stock[order.item], reserveBeforeOrder);
assert.equal(Inventory.quantity(Game.s, order.item), carriedBeforeOrder - BigInt(order.amount));
assert(!Game.command('urban', { op: 'deliver', id: clerk.id }));
assert(Game.save() && Game.load());
assert.equal(Game.s.economy.markets.velaris.stock[order.item], String(order.amount));
assert.equal(Game.s.urban.mission.completed, 1);

// A v7 archive written before the greenhouse has an empty bed on its first visit.
const oldCity = JSON.parse(Game.exportSave());
delete oldCity.cityWorks.seedbedAt;
assert(Game.importSave(JSON.stringify(oldCity)));
assert.equal(Game.s.cityWorks.seedbedAt, -1);
position(UrbanWorld.site(Game.s, 'exit').point);
assert(Game.action('interact'));
const greenhouse = city.services.find(venue => venue.id === 'greenhouse');
const cultivate = op => Game.command('city-service', {id:'greenhouse-bed', op});
assert(!cultivate('sow'));
position(greenhouse.point);
assert(Game.action('interact'));
assert.equal(UrbanWorld.kind(Game.s.region), 'greenhouse');
position(UrbanWorld.site(Game.s, 'greenhouse-bed').point);
Inventory.add(Game.s, 'seeds', 1);
const seeds = Inventory.quantity(Game.s, 'seeds'), herbs = Inventory.quantity(Game.s, 'herb');
assert(cultivate('sow') && !cultivate('sow'));
assert.equal(Inventory.quantity(Game.s, 'seeds'), seeds - 1n);
assert(cultivate('water') && !cultivate('reap'));
assert(Game.save() && Game.load());
assert.equal(UrbanWorld.kind(Game.s.region), 'greenhouse');
Game.s.time += 81 / Calendar.minutesPerSecond;
assert(cultivate('reap') && !cultivate('reap'));
assert.equal(Inventory.quantity(Game.s, 'herb'), herbs + 2n);
position(UrbanWorld.site(Game.s, 'exit').point);
assert(Game.action('interact'));
assert.equal(Game.s.region, city.region.id);
assert.equal(Game.s.player.x, greenhouse.x);

// Uno stato incoerente del Santuario non deve far perdere la partita: avviso, non rifiuto.
const inconsistent = JSON.parse(Game.exportSave());
inconsistent.defeated = { ...inconsistent.defeated, nadir: 1 };
assert(Game.importSave(JSON.stringify(inconsistent)), 'Il salvataggio con Santuario incoerente deve restare caricabile');
assert(warnings.some(text => text.includes('Santuario')));
// Le sezioni strutturali mancanti restano motivo di rifiuto.
const incomplete = JSON.parse(Game.exportSave());
delete incomplete.urban;
assert.equal(Game.importSave(JSON.stringify(incomplete)), false);

// Residenti: a mezzogiorno, di sera e di notte nessuno resta sovrapposto a un altro mentre è fermo.
Game.s.region = city.region.id;
const waypoints = Object.values(city.waypoints);
for (const hour of [12, 19.5, 23]) {
  const now = ((Calendar.timestamp(Game.s.calendar, Game.s.time) % 1440) + 1440) % 1440;
  Game.s.time += ((hour * 60 - now + 1440) % 1440) / Calendar.minutesPerSecond;
  for (const spot of waypoints.filter((_, i) => i % 6 === 0)) {
    position(spot);
    const crowd = UrbanLife.actors(Game.s, 0);
    assert(crowd.length < 140, 'Numero di residenti visibili plausibile');
    crowd.forEach(actor => {
      scope.ActorArt.draw = (_c, _k, _x, _y, o) => { actor.moving = !!o.moving; };
      actor.draw(null);
    });
    for (let i = 0; i < crowd.length; i++) for (let j = i + 1; j < crowd.length; j++) {
      if (crowd[i].moving || crowd[j].moving) continue;
      assert(Math.hypot(crowd[i].x - crowd[j].x, crowd[i].y - crowd[j].y) >= 10,
        'Residenti fermi sovrapposti alle ' + hour + ' presso ' + spot.id);
    }
  }
}

// BUG-011: i percorsi dei residenti (raggio 5) esistono e nessun tratto entra nel raggio di un ostacolo,
// verificato in modo indipendente a passi di 0,25 px (prima i tratti sfioravano ponti e spigoli e venivano scartati).
{
  const legal = (points, r) => points.every((p, i) => {
    if (!i) return true;
    const q = points[i - 1], n = Math.max(1, Math.ceil(Math.hypot(p.x - q.x, p.y - q.y) / 0.25));
    for (let k = 0; k <= n; k++) if (!city.canWalk(q.x + (p.x - q.x) * k / n, q.y + (p.y - q.y) * k / n, r)) return false;
    return true;
  });
  const goals = [city.plaza, ...city.services.map(v => v.point)];
  for (const home of city.residences.slice(0, 12)) for (const goal of goals) {
    const road = city.path(home, goal, 5);
    assert(road.length >= 2, 'Percorso del residente da ' + home.id + ' a ' + (goal.id || goal.name || 'piazza'));
    assert(legal(road, 5), 'Tratto illegale da ' + home.id + ' a ' + (goal.id || goal.name || 'piazza'));
  }
  // Caso diagnosticato: ingresso in diagonale sul ponte principale (seme 555).
  const bridgeRoad = city.path({ x: 888, y: 768 }, { x: 1128, y: 744 }, 5);
  assert(bridgeRoad.length >= 2 && legal(bridgeRoad, 5), 'Attraversamento del ponte principale');
}

// Luce e vegetazione di Velaris: disegno di giorno e di notte, con e senza movimento ridotto, al massimo otto luci.
const drawn = { glows: 0, calls: 0 };
const counting = new Proxy({
  drawImage(image) { drawn.calls++; if (image && image.width === 88 && image.height === 62) drawn.glows++; },
  createLinearGradient() { return { addColorStop() {} }; },
  createRadialGradient() { return { addColorStop() {} }; },
}, { get(target, key) { return key in target ? target[key] : () => undefined; }, set() { return true; } });
function paintCity(hour, spot) {
  const now = ((Calendar.timestamp(Game.s.calendar, Game.s.time) % 1440) + 1440) % 1440;
  Game.s.time += ((hour * 60 - now + 1440) % 1440) / Calendar.minutesPerSecond;
  const cam = { x: spot.x - 240, y: spot.y - 135, w: 480, h: 270 };
  drawn.glows = 0; drawn.calls = 0;
  city.drawGround(counting, cam, 3.3);
  city.drawFront(counting, cam, 3.3, [{ x: spot.x, y: spot.y, draw() {} }]);
  return { ...drawn };
}
for (const spot of [city.plaza, { x: 1040, y: 726 }, { x: 1860, y: 1070 }, { x: 1540, y: 820 }]) {
  const night = paintCity(22, spot);
  assert(night.glows <= 8, 'Al massimo otto luci attive: ' + night.glows);
  paintCity(12, spot);
}
assert(paintCity(22, { x: 1040, y: 726 }).glows >= 4, 'Di notte le lanterne e i cristalli del ponte sono accesi');
const eastLights = [city.districts.find(d => d.id === 'arcades'), city.districts.find(d => d.id === 'orchards')];
for (const spot of eastLights) {
  const night = paintCity(22, spot);
  assert(night.glows >= 4 && night.glows <= 8, spot.name + ': luci stradali attive entro il limite');
  assert.equal(paintCity(12, spot).glows, 0, spot.name + ': aloni spenti a mezzogiorno');
}
scope.UI = { effects: false };
paintCity(22, { x: 1040, y: 726 });
assert(paintCity(22, eastLights[1]).glows >= 4, 'Le lanterne degli Orti restano accese con effetti ridotti');
delete scope.UI;
scope.matchMedia = () => ({ matches: true });
paintCity(22, { x: 1860, y: 1070 });
delete scope.matchMedia;
const crystals = city.buildings.length && UrbanWorld.exterior(Game.s.seed) === city;
assert(crystals, 'La città resta la stessa istanza deterministica');

console.log('OK: migrazioni, equipaggiamento, soccorso, sei quartieri, otto interni, serra, rifornimenti, routine e avviso del Santuario.');
