// Prova nel browser degli otto interni di Velaris (Playwright + Edge, nessuna dipendenza nel progetto).
// Uso:   node tests/prova-browser-interni.cjs [Reincarnation.html] [vecchia-build.html]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Per ogni interno: ingresso dalla porta della città con i comandi del motore, camminata con il corpo sempre su suolo
// percorribile, uso del primo servizio della stanza (pannello aperto e chiuso), giorno e notte, uscita in città.
// Con la build vecchia si creano salvataggi dentro la locanda e la forgia, poi caricati nella build nuova.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html');
const older = process.argv[3] || html;
const ROOMS = ['inn', 'shop', 'forge', 'guild', 'archive', 'academy', 'house', 'greenhouse'].map(k => 'city-velaris-' + k);
const fileUrl = p => 'file:///' + path.resolve(p).split(path.sep).join('/');
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).split('\n')[0]); }
};
async function start(browser, file) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto(fileUrl(file)); await page.waitForTimeout(600);
  await page.click('#playBtn');
  await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
  await page.click('#dialog button[data-do="resume"]'); await page.waitForTimeout(400);
  await page.evaluate(() => {
    const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
    try { Game.newGame(); } finally { Math.random = r0; }
    window.__go = id => {
      for (let k = 0; k < 8 && Game.s.region !== id; k++) {
        const g = World.route(Game.s.region, id, Game.s.campaign.stage);
        if (!g) return 'nessun percorso verso ' + id;
        Object.assign(Game.s.player, { x: g.x, y: g.y });
        if (!Game.action('interact')) return 'passaggio rifiutato verso ' + id + ' da ' + Game.s.region;
      }
      return Game.s.region;
    };
    window.__hour = h => { const s = Game.s, cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((h * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond; };
  });
  return { context, page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const saves = [];
  try {
    await step('1. Salvataggi dentro locanda e forgia con la build ' + path.basename(older), async () => {
      const { context, page, errors } = await start(browser, older);
      const made = await page.evaluate(rooms => rooms.map(id => {
        if (__go(id) !== id) return null;
        Game.s.player.x += .25;
        return { id, x: Game.s.player.x, y: Game.s.player.y, json: Game.exportSave() };
      }), ['city-velaris-inn', 'city-velaris-forge']);
      assert(made.every(Boolean), 'ingresso non riuscito');
      saves.push(...made);
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      return saves.map(s => s.id).join(', ');
    });
    const { context, page, errors } = await start(browser, html);
    for (const id of ROOMS) {
      await step('2. ' + id + ': ingresso, camminata, servizio, giorno/notte, uscita', async () => {
        const r = await page.evaluate(id => {
          if (__go(id) !== id) return 'ingresso non riuscito';
          const s = Game.s, p = s.player;
          let walked = 0, bad = 0;
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]]) for (let i = 0; i < 50; i++) {
            const x0 = p.x, y0 = p.y; Game.step(1 / 60, { x: dx, y: dy });
            walked += Math.hypot(p.x - x0, p.y - y0);
            if (s.region === id && !World.canWalk(p.x, p.y, 5)) bad++;
          }
          return { walked: Math.round(walked), bad };
        }, id);
        assert.equal(typeof r, 'object', r);
        assert.equal(r.bad, 0, 'posizioni non percorribili: ' + r.bad);
        assert(r.walked > 20, 'il personaggio non si è mosso');
        for (const h of [12, 22.5]) { await page.evaluate(h => __hour(h), h); await page.waitForTimeout(160); }
        const used = await page.evaluate(id => {
          const site = UrbanWorld.sites(Game.s).find(x => x.point && x.id !== 'exit') || null;
          if (!site) return 'nessun servizio';
          Object.assign(Game.s.player, { x: site.point.x, y: site.point.y + 4 });
          const ok = Game.action('interact'); const panel = UI.panel; if (UI.panel) UI.close();
          return ok ? 'servizio ' + site.id + (panel ? ' (' + panel + ')' : '') : 'servizio rifiutato';
        }, id);
        const back = await page.evaluate(() => __go('city-velaris'));
        assert.equal(back, 'city-velaris');
        return r.walked + ' px, ' + used;
      });
    }
    for (const sv of saves) {
      await step('3. Salvataggio di ' + sv.id + ' caricato nella build nuova', async () => {
        const r = await page.evaluate(sv => Game.importSave(sv.json) && Game.s.region === sv.id && Game.s.player.x === sv.x && Game.s.player.y === sv.y, sv);
        assert(r, 'regione o posizione diversa');
        await page.waitForTimeout(200);
      });
    }
    await step('4. Assenza di errori JavaScript (console e pageerror)', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
    await context.close();
  } catch (e) {
    results.push(['FAIL', 'errore imprevisto — ' + e.message]); console.log('FAIL errore imprevisto — ' + e.message);
  } finally { await browser.close(); }
  const failed = results.filter(r => r[0] === 'FAIL');
  console.log('\n' + (failed.length ? failed.length + ' prove fallite su ' + results.length : 'Tutte le ' + results.length + ' prove superate'));
  process.exitCode = failed.length ? 1 : 0;
})();
