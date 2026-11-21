// Scatti ripetibili delle regioni del mondo, con la tela di gioco reale (terreno, oggetti, attori, effetti, atmosfera).
// Uso:  node tests/scatti-mondo.cjs <prima.html> [dopo.html] [--out cartella] [--scenes a,b,c] [--hours 12.25,22]
// Serve `playwright-core` FUORI dal progetto (vedi tests/prova-browser.cjs): PW_CORE=...\node_modules\playwright-core.
// Stesso seme (19425), stessa ora, stesso meteo (deriva da seme, regione e ora), stessa camera e stesso numero di
// fotogrammi per ogni build: requestAnimationFrame è sostituito da un orologio manuale e la simulazione è ferma
// (Game.step non fa nulla durante gli scatti). Con due build salva anche il confronto PRIMA (sopra) / DOPO (sotto).
// Non modifica i salvataggi: ogni build usa un contesto del browser nuovo e vuoto.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const out = path.resolve(opt('out', path.join(process.env.TEMP || '.', 'scatti-mondo')));
const sceneFilter = opt('scenes', '');
const hours = opt('hours', '12.25,22').split(',').map(Number);
const builds = args.map(a => path.resolve(a));
if (!builds.length) { console.log('Uso: node tests/scatti-mondo.cjs <prima.html> [dopo.html] [--out dir] [--scenes a,b] [--hours 12.25,22]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

// Luoghi: regione e punto del personaggio (la camera lo segue come nel gioco).
const SPOTS = {
  'valle-borgo': ['valley', 420, 612], 'valle-bosco': ['valley', 1040, 392],
  'vaelthoria-borgo': ['ancient-valley', 454, 404], 'vaelthoria-statua': ['ancient-valley', 600, 412],
  'nordharyn-borgo': ['frost-pass', 454, 404], 'nordharyn-larici': ['frost-pass', 300, 318],
  'nordharyn-rocca': ['winter-citadel', 850, 300],
  'myrathen-selva': ['verdant-canopy', 454, 404], 'myrathen-pozze': ['verdant-canopy', 790, 610],
  'myrathen-conca': ['moon-grove', 850, 300],
  'voryndhal-namar': ['golden-savanna', 454, 404], 'voryndhal-radici': ['root-sanctuary', 850, 300],
  'azheryon-calis': ['dune-port', 454, 404], 'azheryon-damar': ['sunken-dunes', 850, 300],
  'cava': ['quarry', 558, 540], 'fenditura': ['rift', 731, 470], 'cripta': ['ardel-crypt', 694, 500],
  'velaris-piazza': ['city-velaris', 940, 740]
};
const scenes = (sceneFilter ? sceneFilter.split(',') : Object.keys(SPOTS)).filter(k => SPOTS[k]);

const INIT = () => {
  // Orologio manuale: la pagina disegna solo quando lo strumento chiama __tick.
  let queue = [], id = 0; window.__now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.cancelAnimationFrame = () => {};
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(window.__now); } };
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};

async function shoot(file) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const errors = [], shots = {};
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.goto('file:///' + file.replace(/\\/g, '/'));
    await page.evaluate(() => __tick(5));
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => {
      const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
      try { Game.newGame(); } finally { Math.random = r0; }
      Game.s.campaign.stage = Math.max(Game.s.campaign.stage || 0, 5);
      __tick(3);
    });
    for (const label of scenes) {
      const [region, x, y] = SPOTS[label];
      const reached = await page.evaluate(id => {
        const s = Game.s;
        for (let n = 0; n < 8 && s.region !== id; n++) {
          const gate = World.route(s.region, id, s.campaign.stage);
          if (!gate) return 'nessun percorso ' + s.region + ' → ' + id;
          Object.assign(s.player, { x: gate.x, y: gate.y });
          if (!Game.action('interact')) return 'passaggio rifiutato in ' + s.region;
        }
        return s.region;
      }, region);
      if (reached !== region) { errors.push(label + ': ' + reached); continue; }
      for (const hour of hours) {
        const data = await page.evaluate(([px, py, hour]) => {
          const s = Game.s;
          if (UI.panel) UI.close();
          if (!window.__step) { window.__step = Game.step; Game.step = () => {}; }
          Object.assign(s.player, { x: px, y: py, dir: 'down', moving: false });
          const cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440;
          s.time += ((hour * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond;
          __tick(24);
          return document.getElementById('field').toDataURL('image/png');
        }, [x, y, hour]);
        shots[label + '-' + String(hour).replace('.', '_')] = data;
      }
    }
  } finally { await browser.close(); }
  return { shots, errors };
}

async function compose(pairs, labels) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const result = {};
    for (const [key, a, b] of pairs) {
      result[key] = await page.evaluate(async ([a, b, labels]) => {
        const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
        const [A, B] = await Promise.all([load(a), load(b)]);
        const s = 2, gap = 6, c = document.createElement('canvas');
        c.width = A.width * s; c.height = (A.height + B.height) * s + gap;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        g.fillStyle = '#10151a'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(A, 0, 0, A.width * s, A.height * s); g.drawImage(B, 0, A.height * s + gap, B.width * s, B.height * s);
        g.font = 'bold 18px sans-serif';
        for (const [text, y] of [[labels[0], 8], [labels[1], A.height * s + gap + 8]]) {
          const w = g.measureText(text).width + 16; g.fillStyle = '#000000b0'; g.fillRect(8, y, w, 28);
          g.fillStyle = '#ffe9b0'; g.fillText(text, 16, y + 20);
        }
        return c.toDataURL('image/png');
      }, [a, b, labels]);
    }
    return result;
  } finally { await browser.close(); }
}

const save = (name, data) => fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));

(async () => {
  const runs = [];
  for (const file of builds) {
    const t0 = Date.now(), r = await shoot(file); runs.push(r);
    const tag = builds.length > 1 ? (runs.length === 1 ? 'prima' : 'dopo') : path.basename(file, '.html');
    for (const [k, v] of Object.entries(r.shots)) save(tag + '-' + k, v);
    console.log(`${tag}: ${Object.keys(r.shots).length} scatti in ${((Date.now() - t0) / 1000).toFixed(1)} s, errori: ${r.errors.length}`);
    for (const e of r.errors) console.log('  ' + e);
  }
  if (runs.length === 2) {
    const pairs = Object.keys(runs[0].shots).filter(k => runs[1].shots[k]).map(k => [k, runs[0].shots[k], runs[1].shots[k]]);
    const same = pairs.filter(([, a, b]) => a === b).map(([k]) => k);
    const labels = (process.env.LABELS || 'PRIMA,DOPO').split(',');
    const composed = await compose(pairs, labels);
    for (const [k, v] of Object.entries(composed)) save('confronto-' + k, v);
    console.log(`confronti: ${pairs.length}; identici byte per byte: ${same.length ? same.join(', ') : 'nessuno'}`);
  }
  console.log('cartella: ' + out);
  process.exit(runs.some(r => r.errors.length) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
