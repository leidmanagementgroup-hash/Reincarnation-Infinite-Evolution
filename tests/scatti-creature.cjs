// Tavole ripetibili degli sprite delle stirpi (ActorArt), per confrontare build diverse: per ogni stirpe e forma evolutiva
// (0 base, 1-2 primo stadio, 3-4 secondo stadio) disegna fronte, retro, lato destro e sinistro nei due passi, la posa
// d'attacco, il lampo del colpo e il ritratto, su un fondo d'erba neutro e con ingrandimento intero (pixel nitidi).
// Uso:  node tests/scatti-creature.cjs <prima.html> [dopo.html] [--out cartella] [--kinds skeleton,bear,wyvern] [--zoom 4] [--forms 0,3]
// Serve `playwright-core` FUORI dal progetto (vedi tests/prova-browser.cjs): PW_CORE=...\node_modules\playwright-core.
// Con due build salva anche il confronto PRIMA (sopra) / DOPO (sotto) per ogni stirpe. Non tocca i salvataggi.
// Controlla inoltre che ogni sprite resti dentro un riquadro ragionevole (proporzioni originali) e che non ci siano errori.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const out = path.resolve(opt('out', path.join(process.env.TEMP || '.', 'scatti-creature')));
const kinds = opt('kinds', 'skeleton,bear,wyvern').split(',').filter(Boolean);
const zoom = Number(opt('zoom', '4')) || 4;
const forms = opt('forms', '0,1,2,3,4').split(',').map(Number);
const builds = args.map(a => path.resolve(a));
if (!builds.length) { console.log('Uso: node tests/scatti-creature.cjs <prima.html> [dopo.html] [--out dir] [--kinds a,b] [--zoom 4]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');

// Disegna nella pagina la tavola di una stirpe e restituisce PNG e misure dei riquadri opachi.
const SHEET = ({ kind, zoom, forms }) => {
  const cell = 48, cols = 12, rows = forms.length, pad = 2;
  const cv = document.createElement('canvas');
  cv.width = cols * cell * zoom; cv.height = rows * cell * zoom;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const tile = document.createElement('canvas'); tile.width = tile.height = cell;
  const tc = tile.getContext('2d', { willReadFrequently: true });
  const boxes = [];
  const shots = [['down', 0], ['down', 1], ['up', 0], ['up', 1], ['right', 0], ['right', 1], ['left', 0], ['left', 1], ['down', 'attack'], ['right', 'attack'], ['down', 'hit']];
  forms.forEach((form, row) => {
    shots.forEach(([dir, st], col) => {
      tc.clearRect(0, 0, cell, cell);
      const opts = { dir, evolution: form, t: st === 1 ? 1 / 7 + .001 : 0, moving: st === 0 || st === 1, attack: st === 'attack', hit: st === 'hit' };
      if (st === 'attack' || st === 'hit') opts.moving = false;
      ActorArt.draw(tc, kind, cell / 2, cell - 4, opts);
      const d = tc.getImageData(0, 0, cell, cell).data;
      let l = cell, r = -1, t = cell, b = -1;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (d[(y * cell + x) * 4 + 3] > 200) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
      boxes.push({ form, dir, st: String(st), w: r - l + 1, h: b - t + 1, clipped: l <= 0 || t <= 0 || r >= cell - 1 });
      c.fillStyle = (row + col) % 2 ? '#5f7f4c' : '#668753';
      c.fillRect(col * cell * zoom, row * cell * zoom, cell * zoom, cell * zoom);
      c.drawImage(tile, 0, 0, cell, cell, col * cell * zoom, row * cell * zoom, cell * zoom, cell * zoom);
    });
    // Ritratto (pannello del personaggio).
    tc.clearRect(0, 0, cell, cell);
    ActorArt.portrait(tc, kind, pad, pad, cell - pad * 2, { evolution: form });
    c.fillStyle = '#2c2a3a'; c.fillRect(11 * cell * zoom, row * cell * zoom, cell * zoom, cell * zoom);
    c.drawImage(tile, 0, 0, cell, cell, 11 * cell * zoom, row * cell * zoom, cell * zoom, cell * zoom);
  });
  return { png: cv.toDataURL('image/png'), boxes, w: cv.width, h: cv.height };
};

const COMPOSE = async ({ a, b }) => {
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const cv = document.createElement('canvas'); cv.width = Math.max(ia.width, ib.width); cv.height = ia.height + ib.height + 8;
  const c = cv.getContext('2d'); c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(ia, 0, 0); c.drawImage(ib, 0, ia.height + 8);
  return cv.toDataURL('image/png');
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const result = {}, used = {};
  let errors = 0;
  for (const [n, build] of builds.entries()) {
    const label = builds.length > 1 ? (n ? 'dopo' : 'prima') : 'build';
    used[label] = { file: build, sha256: crypto.createHash('sha256').update(fs.readFileSync(build)).digest('hex') };
    const context = await browser.newContext({ viewport: { width: 900, height: 600 } });
    const page = await context.newPage(), errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(fileUrl(build));
    await page.waitForFunction(() => window.ActorArt && window.Game);
    result[label] = {};
    for (const kind of kinds) {
      const s = await page.evaluate(SHEET, { kind, zoom, forms });
      result[label][kind] = s;
      fs.writeFileSync(path.join(out, `${kind}-${label}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
      const big = s.boxes.filter(b => b.w > 44 || b.h > 44 || b.clipped);
      console.log(`${label} ${kind}: ${s.boxes.length} pose, riquadro max ${Math.max(...s.boxes.map(b => b.w))}x${Math.max(...s.boxes.map(b => b.h))}` + (big.length ? `, fuori misura ${big.length}` : ''));
    }
    if (errs.length) { errors += errs.length; console.log(`${label}: errori JavaScript ${errs.length}: ${errs.slice(0, 3).join(' | ')}`); }
    if (builds.length > 1 && n === builds.length - 1) {
      for (const kind of kinds) {
        const png = await page.evaluate(COMPOSE, { a: result.prima[kind].png, b: result.dopo[kind].png });
        fs.writeFileSync(path.join(out, `${kind}-prima-dopo.png`), Buffer.from(png.split(',')[1], 'base64'));
      }
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'build-usate.json'), JSON.stringify(used, null, 2));
  const sizes = {};
  for (const [label, r] of Object.entries(result)) for (const [kind, s] of Object.entries(r)) sizes[`${label}/${kind}`] = s.boxes.map(b => `${b.form}:${b.dir}:${b.st}=${b.w}x${b.h}`).join(' ');
  fs.writeFileSync(path.join(out, 'misure.json'), JSON.stringify(sizes, null, 2));
  console.log(`cartella: ${out}\nerrori: ${errors}`);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
