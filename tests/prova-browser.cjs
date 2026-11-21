// Prova nel browser con Playwright (Microsoft) e Edge installato: nessuna dipendenza nel progetto.
// Uso:   node tests/prova-browser.cjs [percorso/Reincarnation.html]
// Serve `playwright-core` installato FUORI dal progetto, ad esempio:
//   mkdir %TEMP%\pw && cd %TEMP%\pw && npm init -y && npm install playwright-core
//   set PW_CORE=%TEMP%\pw\node_modules\playwright-core && node tests/prova-browser.cjs
// Il browser viene sempre chiuso alla fine (anche in caso di errore); salvataggi di prova in un contesto isolato.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = path.resolve(process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html'));
const url = 'file:///' + html.replace(/\\/g, '/');
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(['OK', name]); console.log('OK   ' + name); }
  catch (e) { results.push(['FAIL', name + ' — ' + String(e.message).split('\n')[0]]); console.log('FAIL ' + name + ' — ' + String(e.message).split('\n')[0]); }
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: process.env.PW_HEADED ? false : true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    const visible = sel => page.locator(sel).first();
    const wait = ms => page.waitForTimeout(ms);
    const panelTitle = async () => (await page.locator('#panelTitle').innerText().catch(() => '')).trim();
    const openHelp = async () => { await page.keyboard.press('KeyH'); await wait(300); };

    await step('1. Avvio del gioco: pagina e titolo', async () => {
      await page.goto(url); await wait(800);
      assert.match(await page.title(), /Reincarnation/);
      assert(await visible('#playBtn').isVisible(), 'pulsante principale visibile');
    });
    await step('1b. Nuova incarnazione e ingresso nella valle', async () => {
      await page.click('#playBtn');
      await visible('#dialog button[data-do="resume"]').waitFor({ state: 'visible', timeout: 8000 });
      await page.click('#dialog button[data-do="resume"]'); await wait(800);
      assert(await visible('button[data-do="map"]').isVisible(), 'HUD di gioco visibile');
      const state = await page.evaluate(() => ({ region: Game.s.region, playing: !!Game.s }));
      assert.equal(state.region, 'valley');
    });
    await step('1c. Movimento con la tastiera', async () => {
      const x0 = await page.evaluate(() => Game.s.player.x);
      await page.keyboard.down('KeyD'); await wait(700); await page.keyboard.up('KeyD'); await wait(100);
      const x1 = await page.evaluate(() => Game.s.player.x);
      assert(Math.abs(x1 - x0) > 5, 'il personaggio si è mosso (' + x0.toFixed(1) + ' → ' + x1.toFixed(1) + ')');
    });
    await step('2. Apertura dell\'Atlante', async () => {
      await openHelp();
      await page.locator('button[data-do="atlas"]').first().click(); await wait(400);
      assert.match(await panelTitle(), /Atlante dei cinque continenti/);
      await page.keyboard.press('Escape'); await wait(300);
    });
    await step('3. Presenza e funzione del comando "Segna Velaris"', async () => {
      await openHelp();
      const cmd = page.locator('button[data-do="trackCity"]').first();
      assert(await cmd.isVisible(), 'comando visibile');
      assert.match(await cmd.innerText(), /Segna Velaris/);
      await cmd.click(); await wait(500);
      const tracked = await page.evaluate(() => ({ name: UI.trackedSite && UI.trackedSite.name, region: UI.trackedSite && UI.trackedSite.region }));
      assert.match(tracked.name || '', /Velaris/);
      assert.equal(tracked.region, 'city-velaris');
    });
    await step('4. Percorso e ingresso nella città', async () => {
      const entered = await page.evaluate(() => {
        const s = Game.s;
        for (const id of ['ancient-valley', 'verdant-canopy', 'city-velaris']) {
          const gate = World.route(s.region, id, s.campaign.stage);
          if (!gate || !World.canWalk(gate.x, gate.y, 6)) return 'passaggio non percorribile verso ' + id;
          Object.assign(s.player, { x: gate.x, y: gate.y });
          if (!Game.action('interact')) return 'interazione rifiutata per ' + id;
          if (s.region !== id) return 'regione attesa ' + id + ' trovata ' + s.region;
        }
        return s.region;
      });
      assert.equal(entered, 'city-velaris');
      await wait(500);
      assert((await page.locator('#zoneBanner').innerText()).length > 0, 'banner di zona mostrato');
    });
    await step('5a. Menu: pausa, opzioni, mappa e diario', async () => {
      await page.keyboard.press('Escape'); await wait(300);
      assert(await page.evaluate(() => UI.panel === 'pause'), 'pausa aperta');
      await page.keyboard.press('Escape'); await wait(200);
      for (const [key, re] of [['KeyM', /Carta|mappa/i], ['KeyC', /./], ['KeyI', /./], ['KeyL', /./], ['KeyU', /./]]) {
        await page.keyboard.press(key); await wait(250);
        const open = await page.evaluate(() => !!UI.panel);
        assert(open, 'pannello ' + key + ' aperto');
        assert(re.test(await panelTitle()), 'titolo del pannello ' + key);
        await page.keyboard.press('Escape'); await wait(200);
      }
    });
    await step('5b. Salvataggi: salva, ricarica pagina, continua dalla stessa posizione', async () => {
      const before = await page.evaluate(() => { Game.save(); return { region: Game.s.region, gold: String(Game.s.player.gold), x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y) }; });
      await page.reload(); await wait(1000);
      assert.match(await page.locator('#playBtn').innerText(), /Continua il viaggio/);
      await page.click('#playBtn'); await wait(1200);
      const after = await page.evaluate(() => ({ region: Game.s.region, gold: String(Game.s.player.gold), x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y) }));
      assert.deepEqual(after, before);
    });
    await step('5c. Salvataggi: esportazione e importazione JSON', async () => {
      const ok = await page.evaluate(() => {
        const json = Game.exportSave(); const parsed = JSON.parse(json);
        return parsed.version === 7 && Game.importSave(json) && Game.s.region === parsed.region;
      });
      assert(ok, 'esporta/importa coerente');
    });
    await step('6. Assenza di errori JavaScript (console e pageerror)', async () => {
      assert.deepEqual(errors, [], 'errori: ' + errors.join(' | '));
    });
    await context.close();
  } catch (e) {
    results.push(['FAIL', 'errore imprevisto — ' + e.message]);
  } finally {
    await browser.close();
  }
  const failed = results.filter(r => r[0] === 'FAIL');
  console.log('\n' + (failed.length ? failed.length + ' prove fallite su ' + results.length : 'Tutte le ' + results.length + ' prove superate'));
  process.exitCode = failed.length ? 1 : 0;
})();
