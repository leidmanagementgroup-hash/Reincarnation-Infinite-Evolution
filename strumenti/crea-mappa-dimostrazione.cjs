// Crea mappe/esempi/orti-dimostrazione.tmj a partire dal modello mappe/orti-dell-alambicco.tmj, con le stesse modifiche
// che si farebbero a mano in Tiled. Serve per la build di prova e per i test; documenta in modo ripetibile cosa cambia.
// Uso: node strumenti/crea-mappa-dimostrazione.cjs
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), src = path.join(root, 'mappe', 'orti-dell-alambicco.tmj');
const dst = path.join(root, 'mappe', 'esempi', 'orti-dimostrazione.tmj');
const map = JSON.parse(fs.readFileSync(src, 'utf8'));
const P = Object.fromEntries(map.properties.map(p => [p.name, p])), ox = P.origineX.value, oy = P.origineY.value;
P.attiva.value = true; P.nome.value = 'Orti dell’Alambicco · dimostrazione';
const layer = name => map.layers.find(l => l.name === name);
const prop = o => Object.fromEntries((o.properties || []).map(p => [p.name, p.value]));
const firstgid = name => map.tilesets.find(t => t.source.includes(name)).firstgid;
const objects = firstgid('oggetti-velaris'), buildings = firstgid('edifici-orti');
const types = ['fruitTree', 'tree', 'lamp', 'prismLamp', 'fountain', 'pond', 'planter', 'crate', 'stall', 'sign', 'banner', 'anvil', 'crystal', 'lensSpire'];
const thing = (type, x, y, name = type) => ({ id: map.nextobjectid++, gid: objects + types.indexOf(type), name, type: '', rotation: 0, visible: true, x: x - 32 - ox, y: y + 8 - oy, width: 64, height: 64, properties: [] });
// I percorsi relativi passano dalla cartella esempi/ a quella principale.
for (const t of map.tilesets) t.source = '../' + t.source;
for (const l of map.layers) if (l.image) l.image = '../' + l.image;

// 1. La Casa Vetro si sposta di 20 pixel verso ovest (la porta la segue).
const edifici = layer('edifici');
edifici.objects.find(o => prop(o).id === 'annesso-5-3').x -= 20;
// 2. La Casa Selce viene demolita, con la sua fioriera.
edifici.objects = edifici.objects.filter(o => prop(o).id !== 'annesso-4-1');
const deco = layer('decorazioni');
deco.objects = deco.objects.filter(o => prop(o).id !== 'planter@annesso-4-1');
// 3. Al suo posto una casa nuova dal modello «cottage» color 1 (72×52), senza id: per il gioco è un edificio nuovo.
edifici.objects.push({ id: map.nextobjectid++, gid: buildings + 15 + 2 * 3 + 1, name: 'Casa del Frutteto', type: '', rotation: 0, visible: true,
  x: 2275 - 14 - ox, y: 1154 - oy, width: 100, height: 119, properties: [{ name: 'nome', type: 'string', value: 'Casa del Frutteto' }] });
// 4. Un piccolo frutteto davanti all'Essiccatoio Faro, che lascia libero il viottolo della porta.
for (const [x, y] of [[2172, 1172], [2246, 1172], [2172, 1200], [2246, 1200]]) deco.objects.push(thing('fruitTree', x, y, 'albero da frutto'));
// 5. Due lanterne lungo il vialetto nuovo e una bancarella nella Piazzetta delle Radici.
const ogg = layer('oggetti');
ogg.objects.push(thing('lamp', 2290, 1188, 'lanterna'), thing('lamp', 2340, 1188, 'lanterna'), thing('stall', 2484, 1246, 'bancarella'));
// 6. Terreno: vialetto di selciato dalla casa nuova alla strada e un prato fiorito sotto il frutteto.
const terreno = layer('terreno'), cols = terreno.width, set = (col, row, gid) => { terreno.data[row * cols + col] = gid; };
const gidOf = tipo => firstgid('terreno-velaris') + ['erba', 'erba-scura', 'prato-fiorito', 'strada', 'bordo-strada', 'selciato', 'aiuola', 'terra'].indexOf(tipo);
for (let row = 25; row <= 28; row++) { set(12, row, gidOf('selciato')); set(11, row, gidOf('bordo-strada')); set(13, row, gidOf('bordo-strada')); }
for (let row = 26; row <= 28; row++) for (let col = 3; col <= 8; col++) set(col, row, gidOf('prato-fiorito'));
// 7. L'aiuola accanto all'Orto delle spezie non si calpesta più: rettangolo nel livello delle collisioni.
layer('collisioni').objects.push({ id: map.nextobjectid++, name: 'aiuola da non calpestare', type: '', rotation: 0, visible: true, x: 2600 - ox, y: 1124 - oy, width: 56, height: 29 });

fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, JSON.stringify(map, null, 1));
console.log('Creata ' + dst);
