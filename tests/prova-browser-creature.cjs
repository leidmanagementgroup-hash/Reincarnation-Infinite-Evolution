// Prova nel browser degli sprite dedicati delle stirpi (creature-art.js): Scheletro errante, Orso dei larici, Viverna di brina.
// Uso:   node tests/prova-browser-creature.cjs [Reincarnation.html]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Per ogni stirpe dedicata e ogni forma (0 base, 1-2 primo stadio, 3-4 secondo): il personaggio cammina nelle quattro
// direzioni con il motore (Game.step), attacca, usa la tecnica innata e viene colpito, mentre il gioco disegna davvero;
// ogni posa produce pixel visibili dentro un riquadro con proporzioni originali; il ritratto dell'HUD si aggiorna.
// Poi: salvataggio con la stirpe dedicata, ricarica della pagina e importazione; assenza di errori JavaScript.
// La logica non cambia: lo stesso percorso a piedi deve dare le stesse posizioni con e senza i nuovi sprite.
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
async function start(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('lumora-guidance', 'off'); } catch {} });
  await page.goto(fileUrl(html));
  await page.click('#playBtn');
  await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
  await page.click('#dialog button[data-do="resume"]'); await page.waitForTimeout(300);
  await page.evaluate(() => {
    const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
    try { Game.newGame(); } finally { Math.random = r0; }
  });
  return { context, page, errors };
}
const SET_FORM = ([race, form]) => {
  const p = Game.s.player; p.race = race;
  if (form > 0) { p.evolutionStage = form <= 2 ? 1 : 2; p.form = (form - 1) % 2; } else { p.form = null; p.evolutionStage = 0; }
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  try {
    const { context, page, errors } = await start(browser);
    const kinds = await page.evaluate(() => ActorArt.dedicated || []);
    await step('1. Stirpi con sprite dedicato registrate', async () => {
      assert.deepEqual(kinds, ['skeleton', 'bear', 'wyvern']);
      return kinds.join(', ');
    });
    await step('2. Ogni posa disegna pixel visibili in un riquadro con proporzioni originali', async () => {
      const res = await page.evaluate(kinds => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 64;
        const c = cv.getContext('2d', { willReadFrequently: true }); let n = 0;
        for (const kind of kinds) for (let form = 0; form <= 4; form++) for (const dir of ['down', 'up', 'left', 'right'])
          for (const o of [{ moving: true, t: 0 }, { moving: true, t: .15 }, { t: 0 }, { t: .5 }, { attack: true }, { hit: true }]) {
            c.clearRect(0, 0, 64, 64);
            ActorArt.draw(c, kind, 32, 56, { dir, evolution: form, ...o });
            const d = c.getImageData(0, 0, 64, 64).data;
            let l = 64, r = -1, t = 64, b = -1, px = 0;
            for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (d[(y * 64 + x) * 4 + 3] > 200) { px++; l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
            const w = r - l + 1, h = b - t + 1;
            if (px < 60 || w > 44 || h > 42 || b > 58) return `${kind}/${form}/${dir}/${JSON.stringify(o)}: ${px} pixel, ${w}x${h}, base ${b}`;
            n++;
          }
        return n;
      }, kinds);
      assert.equal(typeof res, 'number', res);
      return res + ' pose';
    });
    for (const kind of kinds) {
      await step(`3. ${kind}: cammino, attacco, tecnica innata e colpo subito nelle cinque forme, con il disegno del gioco`, async () => {
        const notes = [];
        for (let form = 0; form <= 4; form++) {
          await page.evaluate(SET_FORM, [kind, form]);
          const r = await page.evaluate(() => {
            const s = Game.s, p = s.player; let walked = 0;
            for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) for (let i = 0; i < 25; i++) {
              p.invul = 9; p.hp = Math.max(p.hp, 1); const x0 = p.x, y0 = p.y;
              Game.step(1 / 60, { x: dx, y: dy }); walked += Math.hypot(p.x - x0, p.y - y0);
            }
            p.cooldowns.attack = 0; Game.action('attack'); p.mp = Math.max(p.mp, 99); Game.action('innate'); p.hit = .2;
            return { walked: Math.round(walked), swing: p.swing > 0 };
          });
          await page.waitForTimeout(120);
          assert.ok(r.walked > 50, 'non cammina: ' + r.walked);
          notes.push(`${form}:${r.walked}px`);
        }
        const avatar = await page.evaluate(() => {
          const c = document.querySelector('#avatar canvas'); if (!c) return -1;
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
          return n;
        });
        assert.ok(avatar > 100, 'ritratto HUD vuoto: ' + avatar);
        assert.deepEqual(errors, [], errors.join(' | '));
        return notes.join(' ') + `, ritratto ${avatar} pixel`;
      });
    }
    let json = null;
    await step('4. Partita nuova da Scheletro, salvataggio, ricarica della pagina e importazione', async () => {
      // La stirpe si sceglie come fa il motore (secondo numero casuale pesato sulle stirpi), così il salvataggio è coerente.
      json = await page.evaluate(() => {
        let cum = 0; for (const r of Game.races) { if (r.id === 'skeleton') break; cum += r.weight; }
        const w = Game.races.find(r => r.id === 'skeleton').weight, v = (cum + w / 2) / 100;
        const r0 = Math.random; let n = 0; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : .24; };
        try { Game.newGame(); } finally { Math.random = r0; }
        if (Game.s.player.race !== 'skeleton') return null;
        for (let i = 0; i < 30; i++) Game.step(1 / 60, { x: 1, y: 0 });
        return Game.exportSave();
      });
      assert.ok(json, 'partita da Scheletro non creata');
      assert.ok(await page.evaluate(j => Game.importSave(j), json), 'importazione rifiutata');
      await page.reload(); await page.waitForTimeout(800);
      assert.match(await page.locator('#playBtn').innerText(), /Continua il viaggio/);
      await page.click('#playBtn'); await page.waitForTimeout(900);
      const r = await page.evaluate(() => Game.s.player.race);
      assert.equal(r, 'skeleton');
      for (let k = 0; k < 3; k++) await page.evaluate(() => { for (let i = 0; i < 20; i++) Game.step(1 / 60, { x: 0, y: 1 }); });
      await page.waitForTimeout(200);
      assert.deepEqual(errors, [], errors.join(' | '));
      return 'stirpe ' + r;
    });
    await step('5. Gli sprite non toccano la logica: stesso percorso, stesse posizioni', async () => {
      const r = await page.evaluate(() => {
        const s = Game.s, p = s.player, run = () => {
          Object.assign(p, { x: World.spawn.x, y: World.spawn.y });
          const out = [];
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) for (let i = 0; i < 30; i++) { p.invul = 9; Game.step(1 / 60, { x: dx, y: dy }); }
          out.push(p.x.toFixed(4), p.y.toFixed(4)); return out.join(',');
        };
        const a = run(); const art = window.ActorArt; window.ActorArt = { ...art, draw() {}, portrait() {} };
        try { return [a, run()]; } finally { window.ActorArt = art; }
      });
      assert.equal(r[0], r[1]);
      return r[0];
    });
    await context.close();
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
