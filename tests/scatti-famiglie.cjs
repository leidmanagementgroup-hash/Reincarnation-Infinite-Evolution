// Tavole del catalogo delle famiglie architettoniche per continente (city-families.js, fase 4 D).
// Uso:  node tests/scatti-famiglie.cjs <Reincarnation.html> [--out cartella] [--zoom 3]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs).
// Per ogni famiglia disegna tutti i componenti del catalogo (case a più larghezze e piani, bottega, sala, banco, pozzo,
// lampione e i tre elementi caratteristici) su un terreno del suo continente, con il punto d'appoggio, la soglia della
// porta (in rosso) e i vetri accesi di notte (in giallo) segnati sotto ogni cella. Salva anche le misure in misure.json.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const out = path.resolve(opt('out', path.join(process.env.TEMP || '.', 'scatti-famiglie')));
const zoom = Number(opt('zoom', 3));
const html = path.resolve(args[0] || path.join(__dirname, '..', 'Reincarnation.html'));
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file:///' + html.replace(/\\/g, '/'));
    const res = await page.evaluate(zoom => {
      const ground = {vaelthoria: ['#819866', '#778e60'], nordharyn: ['#97aca8', '#76928c'], myrathen: ['#7c8198', '#73748c'], voryndhal: ['#658c66', '#527d5c'], azheryon: ['#cbb880', '#bda773']};
      const sub = {vaelthoria: 'valle', nordharyn: 'filoni', myrathen: 'siderea', voryndhal: 'fronde', azheryon: 'deserto'};
      const extra = {nordharyn: ['rocca', ['house', 'hall', 'stall']], voryndhal: ['savana', ['house', 'workshop']], azheryon: ['costa', ['house', 'workshop', 'hall']]};
      const sheets = {}, sizes = {};
      for (const fid of Object.keys(CityFamilies.families)) {
        const items = CityFamilies.catalog(fid).map(x => ({...x, sub: sub[fid]}));
        if (extra[fid]) for (const kind of extra[fid][1]) items.push({kind, sub: extra[fid][0], spec: kind === 'hall' ? {w: 50} : {w: 40, stories: 2}});
        const cellW = 124, cellH = 132, per = 7, rows = Math.ceil(items.length / per);
        const c = document.createElement('canvas'); c.width = cellW * per * zoom; c.height = (cellH * rows + 22) * zoom;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        g.fillStyle = '#10151a'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#ffe9b0'; g.font = 'bold ' + (6 * zoom) + 'px sans-serif';
        g.fillText(CityFamilies.families[fid].continent + ' · ' + CityFamilies.families[fid].name, 4 * zoom, 15 * zoom);
        items.forEach((it, i) => {
          const r = CityFamilies.render(fid, it.sub, it.kind, it.spec), cx = (i % per) * cellW, cy = 22 + Math.floor(i / per) * cellH;
          const cell = document.createElement('canvas'); cell.width = cellW; cell.height = cellH;
          const q = cell.getContext('2d'); q.imageSmoothingEnabled = false;
          for (let y = 0; y < cellH; y += 4) for (let x = 0; x < cellW; x += 4) { q.fillStyle = ground[fid][((x + y) / 4) % 2 ? 0 : 1]; q.fillRect(x, y, 4, 4); }
          const ox = cellW / 2, oy = cellH - 18;
          q.drawImage(r.image, ox - r.ax, oy - r.ay);
          // Misure: riquadro dei pixel opachi rispetto all'appoggio.
          const d = r.image.getContext('2d').getImageData(0, 0, r.image.width, r.image.height).data;
          let l = 1e9, rr = -1e9, t = 1e9, b = -1e9;
          for (let y = 0; y < r.image.height; y++) for (let x = 0; x < r.image.width; x++) if (d[(y * r.image.width + x) * 4 + 3] > 40) { l = Math.min(l, x); rr = Math.max(rr, x); t = Math.min(t, y); b = Math.max(b, y); }
          const box = {left: l - r.ax, right: rr - r.ax, top: t - r.ay, bottom: b - r.ay};
          sizes[fid + '/' + it.sub + '/' + it.kind + '/' + JSON.stringify(it.spec)] = {box, footprint: r.footprint, door: r.door, windows: r.windows.length, flame: r.flame};
          q.fillStyle = '#ff3b3b'; if (r.door) q.fillRect(ox + r.door.x - 1, oy + r.door.y, 3, 1);
          q.fillStyle = '#ffffff'; q.fillRect(ox, oy + 2, 1, 2);
          q.fillStyle = '#10151a'; q.fillRect(0, cellH - 12, cellW, 12);
          q.fillStyle = '#ffe9b0'; q.font = '7px sans-serif';
          q.fillText(it.kind + (it.spec.w ? ' ' + it.spec.w : '') + (it.spec.stories ? '×' + it.spec.stories : '') + (it.sub !== sub[fid] ? ' · ' + it.sub : '') + (r.windows.length ? ' · ' + r.windows.length + ' vetri' : ''), 3, cellH - 3);
          g.drawImage(cell, cx * zoom, cy * zoom, cellW * zoom, cellH * zoom);
        });
        sheets[fid] = c.toDataURL('image/png');
      }
      return {sheets, sizes, stats: CityFamilies.stats()};
    }, zoom);
    for (const [fid, data] of Object.entries(res.sheets)) fs.writeFileSync(path.join(out, 'famiglia-' + fid + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(out, 'misure.json'), JSON.stringify(res.sizes, null, 1));
    console.log(`${Object.keys(res.sheets).length} famiglie, ${Object.keys(res.sizes).length} componenti, ${res.stats.built} disegni, errori: ${errors.length}${errors.length ? ' — ' + errors.join(' | ') : ''}`);
  } finally { await browser.close(); }
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
