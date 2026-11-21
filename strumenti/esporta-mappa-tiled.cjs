// Esporta un'area del gioco come progetto modificabile in Tiled Map Editor (mappa .tmj, tileset .tsj, immagini .png).
// Gli sprite sono disegnati dal gioco stesso (nessuna grafica nuova): edifici, oggetti, terreno e immagine del suolo.
//
// Uso:  node strumenti/esporta-mappa-tiled.cjs [opzioni]
//   --html <file>       build da cui disegnare (predefinita: Reincarnation.html)
//   --uscita <cartella> cartella del progetto Tiled (predefinita: mappe)
//   --seme <n>          seme della città (predefinito 19425)
//   --sovrascrivi       sostituisce una mappa già esistente (altrimenti lo strumento si ferma per non perdere modifiche)
// Richiede playwright-core installato fuori dal progetto: variabile PW_CORE (come tests/prova-browser.cjs) e Microsoft Edge.
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const root = path.resolve(__dirname, '..');
const html = path.resolve(opt('--html') || path.join(root, 'Reincarnation.html'));
const out = path.resolve(opt('--uscita') || path.join(root, 'mappe'));
const seed = Number(opt('--seme') || 19425);
const AREA = { file: 'orti-dell-alambicco.tmj', name: 'Orti dell’Alambicco', area: { x: 2114, y: 752, w: 736, h: 736 } };

(async () => {
  const target = path.join(out, AREA.file);
  if (fs.existsSync(target) && !args.includes('--sovrascrivi')) {
    console.error('La mappa ' + target + ' esiste già: usa --sovrascrivi per sostituirla (le modifiche fatte in Tiled andrebbero perse).');
    process.exit(2);
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file:///' + html.split(path.sep).join('/'));
    const result = await page.evaluate(({ seed, AREA }) => {
      const ext = UrbanExterior.create(seed);
      const t = TiledMaps.template(ext, { area: AREA.area, file: AREA.file, name: AREA.name, attiva: false });
      return { ...t, report: TiledMaps.verify(ext, AREA.area), problems: TiledMaps.problems };
    }, { seed, AREA });
    if (errors.length) throw new Error('Errori nella pagina: ' + errors.join(' | '));
    const write = (rel, content) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
    write(AREA.file, JSON.stringify(result.map, null, 1));
    for (const [rel, data] of Object.entries(result.tilesets)) write(rel, JSON.stringify(data, null, 1));
    for (const [rel, url] of Object.entries(result.images)) write(rel, Buffer.from(url.split(',')[1], 'base64'));
    const project = { automappingRulesFile: '', commands: [], compatibilityVersion: 1100, extensionsPath: 'estensioni', folders: ['.'], properties: [], propertyTypes: [] };
    if (!fs.existsSync(path.join(out, 'velaris.tiled-project'))) write('velaris.tiled-project', JSON.stringify(project, null, 1));
    console.log('Esportata ' + target);
    console.log('  edifici ' + result.report.buildings + ', soste ' + result.report.stops + ', immagini ' + Object.keys(result.images).length);
    if (result.report.errors.length) console.log('  Attenzione, problemi già presenti nell’area: ' + result.report.errors.join('; '));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
