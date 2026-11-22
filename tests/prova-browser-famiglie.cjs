// Prova nel browser delle famiglie architettoniche per continente (city-families.js, fase 4 D).
// Uso:   node tests/prova-browser-famiglie.cjs [Reincarnation.html]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Controlla: cinque famiglie descritte con materiali, regole e componenti, e tutte le tavolozze continentali assegnate;
// contratto dei componenti (pixel visibili, appoggio alla base, porta sulla soglia, vetri sopra pixel dipinti, impronta
// richiesta, larghezze parametriche crescenti, fiammella animata dentro la lanterna); stessi pixel a ogni richiesta; nei borghi delle otto regioni il gioco
// disegna gli sprite delle famiglie e accende di notte proprio i loro vetri; si cammina nella piazza; salvataggio,
// ricarica e "Continua il viaggio" dentro un borgo; nessun errore JavaScript.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = path.resolve(process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html'));
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).split('\n')[0]); }
};
const INIT = () => {
  let queue = [], id = 0, now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(now); } };
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};
const REGIONS = ['ancient-valley', 'frost-pass', 'winter-citadel', 'moon-grove', 'golden-savanna', 'root-sanctuary', 'dune-port', 'sunken-dunes'];

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(INIT);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.goto(fileUrl(html));
    await page.evaluate(() => __tick(5));
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => {
      const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
      try { Game.newGame(); } finally { Math.random = r0; }
      Game.s.campaign.stage = 5; if (UI.panel) UI.close(); __tick(3);
    });

    await step('1. Cinque famiglie con materiali, regole e componenti; tutte le tavolozze continentali assegnate', async () => {
      const r = await page.evaluate(() => {
        const F = CityFamilies.families, ids = Object.keys(F), bad = [];
        for (const f of Object.values(F)) {
          if (!f.continent || !f.name || !f.description || !f.rules?.walls || !f.rules?.roofs || f.signature.length !== 3) bad.push(f.id + ': descrizione incompleta');
          for (const m of ['stone', 'wood', 'roof', 'plaster', 'glass', 'cloth', 'metal', 'plant']) if (!f.materials[m]) bad.push(f.id + ': manca ' + m);
        }
        for (const pal of ['ruin', 'pine', 'snow', 'star', 'fae', 'grass', 'root', 'shore', 'canyon']) { const x = CityFamilies.familyOf(pal); if (!x || !F[x[0]] || !F[x[0]].variants.includes(x[1])) bad.push('tavolozza ' + pal); }
        return { ids, bad, continents: ids.map(i => F[i].continent) };
      });
      assert.deepEqual(r.bad, []);
      assert.deepEqual(r.continents, ['Vaelthoria', 'Nordharyn', 'Myrathen', 'Voryndhal', 'Azheryon']);
      return r.ids.join(', ');
    });

    await step('2. Contratto dei componenti: pixel, appoggio, porta, vetri, impronta e larghezze parametriche', async () => {
      const r = await page.evaluate(() => {
        const bad = [], subs = { vaelthoria: ['valle'], nordharyn: ['filoni', 'rocca'], myrathen: ['siderea'], voryndhal: ['fronde', 'savana'], azheryon: ['deserto', 'costa'] };
        let n = 0;
        for (const [fid, list] of Object.entries(subs)) for (const sub of list) for (const it of CityFamilies.catalog(fid)) {
          const r = CityFamilies.render(fid, sub, it.kind, it.spec), id = fid + '/' + sub + '/' + it.kind + JSON.stringify(it.spec);
          const g = r.image.getContext('2d'), d = g.getImageData(0, 0, r.image.width, r.image.height).data, W = r.image.width;
          const op = (x, y) => d[((r.ay + y) * W + r.ax + x) * 4 + 3] > 200;
          let count = 0, bottom = -1e9, left = 1e9, right = -1e9, top = 1e9;
          for (let y = 0; y < r.image.height; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 200) { count++; bottom = Math.max(bottom, y - r.ay); top = Math.min(top, y - r.ay); left = Math.min(left, x - r.ax); right = Math.max(right, x - r.ax); }
          if (count < 80) bad.push(id + ': ' + count + ' pixel');
          if (bottom > 6 || bottom < -1) bad.push(id + ': base a ' + bottom);
          if (left <= -r.ax || right >= W - r.ax - 1 || top <= -r.ay) bad.push(id + ': tocca il bordo della tela');
          if (['house', 'workshop', 'hall'].includes(it.kind)) {
            if (r.footprint.w !== (it.spec.w || (it.kind === 'hall' ? 50 : 40))) bad.push(id + ': impronta ' + r.footprint.w);
            if (!r.door || r.door.y !== 0 || Math.abs(r.door.x) > r.footprint.w / 2 - 4) bad.push(id + ': porta ' + JSON.stringify(r.door));
            else if (!op(r.door.x, -3)) bad.push(id + ': porta senza pixel');
            if (!r.windows.length) bad.push(id + ': nessun vetro');
          }
          for (const w of r.windows) if (!op(w.x + (w.w >> 1), w.y + (w.h >> 1))) bad.push(id + ': vetro su pixel vuoto ' + JSON.stringify(w));
          if (it.kind === 'lamp' && (!r.flame || !op(r.flame[0] + 1, r.flame[1] + 1))) bad.push(id + ': fiammella animata fuori dalla lanterna ' + JSON.stringify(r.flame));
          n++;
        }
        // Larghezze parametriche: la casa cresce con l'impronta richiesta.
        for (const fid of Object.keys(CityFamilies.families)) {
          let prev = 0;
          for (let w = 28; w <= 64; w += 4) {
            const r = CityFamilies.render(fid, CityFamilies.families[fid].variants[0], 'house', { w, stories: 2 }), d = r.image.getContext('2d').getImageData(0, 0, r.image.width, r.image.height).data;
            let l = 1e9, rr = -1;
            for (let y = 0; y < r.image.height; y++) for (let x = 0; x < r.image.width; x++) if (d[(y * r.image.width + x) * 4 + 3] > 200) { l = Math.min(l, x); rr = Math.max(rr, x); }
            if (rr - l < prev) bad.push(fid + ': larghezza ' + w + ' più stretta della precedente');
            prev = rr - l;
          }
        }
        return { n, bad };
      });
      assert.deepEqual(r.bad, [], r.bad.slice(0, 6).join(' | '));
      return r.n + ' componenti';
    });

    await step('3. Stessa richiesta, stessi pixel', async () => {
      const r = await page.evaluate(() => {
        const sig = () => Object.keys(CityFamilies.families).map(fid => {
          const im = CityFamilies.render(fid, CityFamilies.families[fid].variants[0], 'hall', { w: 56, variant: 3 }).image, d = im.getContext('2d').getImageData(0, 0, im.width, im.height).data;
          let h = 2166136261; for (let i = 0; i < d.length; i += 3) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0;
        }).join(',');
        const a = sig(); CityFamilies.clear(); const b = sig();
        return { a, b };
      });
      assert.equal(r.a, r.b);
      return r.a.split(',').length + ' sale ridisegnate da capo';
    });

    await step('4. Borghi di otto regioni: sprite delle famiglie e vetri accesi di notte dalle loro finestre', async () => {
      const notes = [];
      for (const id of REGIONS) {
        const r = await page.evaluate(id => {
          const s = Game.s;
          for (let k = 0; k < 8 && s.region !== id; k++) {
            const gate = World.route(s.region, id, s.campaign.stage);
            if (!gate) return { error: 'nessun percorso verso ' + id };
            Object.assign(s.player, { x: gate.x, y: gate.y });
            if (!Game.action('interact')) return { error: 'passaggio rifiutato' };
            __tick(1);
          }
          if (UI.panel) UI.close();
          Object.assign(s.player, { x: 454, y: 404 });
          const before = CityFamilies.stats().built;
          __tick(4);
          const pal = World.regions?.[id]?.palette || null;
          // Vetri attesi: case e sala del borgo con le stesse richieste di continents.js.
          const fam = CityFamilies.familyOf(pal);
          const expect = [];
          for (const [x, y, t, v] of [[385, 362, 'house', 0], [447, 348, 'hall', 1], [523, 368, 'house', 2]]) {
            const r = CityFamilies.render(fam[0], fam[1], t === 'house' && v === 2 ? 'workshop' : t, t === 'hall' ? { w: 50, variant: v } : { w: 40, stories: v === 2 ? 1 : 2, variant: v });
            for (const w of r.windows) expect.push([x + w.x, y + w.y, w.w, w.h].join(','));
          }
          const real = document.createElement('canvas').getContext('2d'), lit = [];
          const ctx = new Proxy(real, { get(t, k) { const v = t[k]; return typeof v === 'function' ? (...a) => { if (k === 'fillRect' && t.fillStyle === '#ffd882') lit.push(a.join(',')); return v.apply(t, a); } : v; }, set(t, k, v) { t[k] = v; return true; } });
          WorldLight.draw(ctx, { x: 300, y: 260, w: 340, h: 240 }, 1, id, { night: 1, dusk: 0, minutes: 1200 });
          const foreign = lit.filter(x => !expect.includes(x));
          return { pal, fam: fam.join('/'), built: CityFamilies.stats().built - before, lit: lit.length, expect: expect.length, foreign };
        }, id);
        assert.ok(!r.error, id + ': ' + r.error);
        assert.ok(r.lit >= Math.ceil(r.expect / 2), id + ': ' + r.lit + ' vetri accesi su ' + r.expect);
        assert.deepEqual(r.foreign, [], id + ': vetri accesi fuori dagli sprite delle famiglie');
        notes.push(`${id} ${r.fam} ${r.lit}/${r.expect}`);
      }
      assert.deepEqual(errors, [], errors.join(' | '));
      return notes.join('; ');
    });

    await step('5. Si cammina nella piazza del borgo fra case, banchi e pozzo', async () => {
      const r = await page.evaluate(() => {
        const p = Game.s.player; Object.assign(p, { x: 454, y: 404 }); let walked = 0;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [-1, 0], [0, -1], [1, 0]]) for (let i = 0; i < 40; i++) { p.invul = 9; const x0 = p.x, y0 = p.y; Game.step(1 / 60, { x: dx, y: dy }); walked += Math.hypot(p.x - x0, p.y - y0); }
        return { walked: Math.round(walked), region: Game.s.region };
      });
      assert.ok(r.walked > 150, 'bloccato: ' + r.walked);
      return r.region + ', ' + r.walked + ' px';
    });

    await step('6. Salvataggio in un borgo, ricarica e "Continua il viaggio"', async () => {
      // Partita nuova non manipolata: si raggiunge il primo borgo aperto dallo stadio reale della campagna.
      const region = await page.evaluate(regions => {
        const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
        try { Game.newGame(); } finally { Math.random = r0; }
        if (UI.panel) UI.close();
        const s = Game.s, target = regions.find(id => World.route(s.region, id, s.campaign.stage));
        for (let k = 0; target && k < 8 && s.region !== target; k++) {
          const gate = World.route(s.region, target, s.campaign.stage);
          Object.assign(s.player, { x: gate.x, y: gate.y });
          if (!Game.action('interact')) break;
          __tick(1);
        }
        if (UI.panel) UI.close();
        for (let i = 0; i < 30; i++) Game.step(1 / 60, { x: 1, y: 0 });
        __tick(5);
        return Game.save() && regions.includes(s.region) ? s.region : 'non raggiunto: ' + s.region;
      }, REGIONS);
      assert.ok(REGIONS.includes(region), region);
      await page.reload(); await page.evaluate(() => __tick(5));
      assert.match(await page.locator('#playBtn').innerText(), /Continua il viaggio/);
      await page.click('#playBtn'); await page.evaluate(() => __tick(30));
      const after = await page.evaluate(() => ({ region: Game.s.region, built: CityFamilies.stats().built }));
      assert.equal(after.region, region);
      assert.ok(after.built > 0, 'borgo non ridisegnato dopo la ricarica');
      assert.deepEqual(errors, [], errors.join(' | '));
      return 'regione ' + after.region + ', ' + after.built + ' sprite';
    });
    await context.close();
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
