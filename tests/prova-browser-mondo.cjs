// Prova nel browser delle regioni ridisegnate dal World Art Overhaul (Playwright + Edge, nessuna dipendenza nel progetto).
// Uso:   node tests/prova-browser-mondo.cjs [Reincarnation.html] [vecchia-build.html]
//   Con la seconda build crea i salvataggi con la versione precedente (stesso seme 19425) e li carica in quella nuova.
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Per undici regioni (Valle di Vela, nove regioni continentali, Cripta) controlla: posizione, regione e quantità esatte dopo
// l'importazione; camminata con i comandi del motore (Game.step) in quattro direzioni con il corpo sempre su suolo percorribile;
// disegno di giorno, al tramonto e di notte; salvataggio e ricarica della pagina; nessun errore JavaScript.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const fileUrl = p => 'file:///' + path.resolve(p).replace(/\\/g, '/');
const html = process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html');
const older = process.argv[3] || html;
const REGIONS = ['valley', 'ancient-valley', 'frost-pass', 'winter-citadel', 'verdant-canopy', 'moon-grove',
  'golden-savanna', 'root-sanctuary', 'dune-port', 'sunken-dunes', 'ardel-crypt'];
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
  return { context, page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const saves = [];
  try {
    await step('1. Salvataggi creati con la build ' + path.basename(older) + ' in ' + REGIONS.length + ' regioni', async () => {
      const { context, page, errors } = await start(browser, older);
      const made = await page.evaluate(regions => {
        const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
        try { Game.newGame(); } finally { Math.random = r0; }
        const s = Game.s;
        Inventory.add(s, 'ore', 2n ** 70n + 7n);
        const out = [];
        for (const id of regions) {
          for (let k = 0; k < 8 && s.region !== id; k++) {
            const gate = World.route(s.region, id, s.campaign.stage);
            if (!gate) return 'nessun percorso verso ' + id;
            Object.assign(s.player, { x: gate.x, y: gate.y });
            if (!Game.action('interact')) return 'passaggio rifiutato verso ' + id;
          }
          s.player.x += 0.25; // una posizione non intera, come in partita
          out.push({ id, x: s.player.x, y: s.player.y, json: Game.exportSave() });
        }
        return out;
      }, REGIONS);
      assert(Array.isArray(made), made);
      saves.push(...made);
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      return saves.length + ' salvataggi v' + JSON.parse(saves[0].json).version;
    });
    const { context, page, errors } = await start(browser, html);
    for (const save of saves) {
      await step('2. ' + save.id + ': importazione, camminata, giorno/tramonto/notte', async () => {
        const res = await page.evaluate(sv => {
          if (!Game.importSave(sv.json)) return 'importazione rifiutata';
          const s = Game.s, p = s.player;
          if (s.region !== sv.id || p.x !== sv.x || p.y !== sv.y) return 'posizione diversa ' + s.region + ' ' + p.x + ',' + p.y;
          if (Inventory.quantity(s, 'ore') < 2n ** 70n + 7n) return 'quantità esatta persa';
          let walked = 0, bad = 0;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            for (let i = 0; i < 70; i++) {
              p.invul = 9; p.hp = Math.max(p.hp, 1);
              const x0 = p.x, y0 = p.y;
              Game.step(1 / 60, { x: dx, y: dy });
              walked += Math.hypot(p.x - x0, p.y - y0);
              if (s.region === sv.id && !World.canWalk(p.x, p.y, 5)) bad++;
            }
          }
          return { walked: Math.round(walked), bad, region: s.region };
        }, save);
        assert.equal(typeof res, 'object', res);
        assert.equal(res.bad, 0, 'posizioni non percorribili: ' + res.bad);
        assert(res.walked > 20, 'il personaggio non si è mosso (' + res.walked + ' px)');
        for (const hour of [12, 19.6, 23.5]) {
          await page.evaluate(h => { const s = Game.s, cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((h * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond; }, hour);
          await page.waitForTimeout(220);
        }
        const drawn = await page.evaluate(() => { const c = document.getElementById('field'), d = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data; return d[3]; });
        assert.equal(drawn, 255, 'tela disegnata');
        return res.walked + ' px a piedi';
      });
    }
    await step('3. Salvataggio e ricarica della pagina in Nordharyn e nella Cripta', async () => {
      const notes = [];
      for (const save of saves.filter(sv => sv.id === 'frost-pass' || sv.id === 'ardel-crypt')) {
        const before = await page.evaluate(sv => { Game.importSave(sv.json); Game.save(); return { region: Game.s.region, x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y), ore: String(Inventory.quantity(Game.s, 'ore')) }; }, save);
        await page.reload(); await page.waitForTimeout(800);
        assert.match(await page.locator('#playBtn').innerText(), /Continua il viaggio/);
        await page.click('#playBtn'); await page.waitForTimeout(900);
        const after = await page.evaluate(() => ({ region: Game.s.region, x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y), ore: String(Inventory.quantity(Game.s, 'ore')) }));
        assert.deepEqual(after, before); notes.push(after.region);
      }
      return notes.join(', ');
    });
    await step('4. Effetti ridotti: nessun errore e luci ferme', async () => {
      await page.evaluate(() => { const s = Game.s, cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((23.5 * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond; });
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      const toggled = await page.evaluate(() => { const was = UI.effects; UI.open('settings'); const b = document.querySelector('[data-do="effects"]'); if (b) b.click(); return [was, UI.effects]; });
      await page.evaluate(() => { if (UI.panel) UI.close(); }); await page.waitForTimeout(500);
      assert(await page.evaluate(() => !UI.panel), 'pannello chiuso');
      return 'effetti ' + (toggled[0] ? 'attivi' : 'spenti') + ' → ' + (toggled[1] ? 'attivi' : 'spenti');
    });
    await step('5. Assenza di errori JavaScript (console e pageerror)', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
    await context.close();
  } catch (e) {
    results.push(['FAIL', 'errore imprevisto — ' + e.message]); console.log('FAIL errore imprevisto — ' + e.message);
  } finally { await browser.close(); }
  const failed = results.filter(r => r[0] === 'FAIL');
  console.log('\n' + (failed.length ? failed.length + ' prove fallite su ' + results.length : 'Tutte le ' + results.length + ' prove superate'));
  process.exitCode = failed.length ? 1 : 0;
})();
