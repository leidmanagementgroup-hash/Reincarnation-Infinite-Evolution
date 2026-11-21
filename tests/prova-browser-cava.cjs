// Prova nel browser di Cava delle Braci e Fenditura Astrale (Playwright + Edge, nessuna dipendenza nel progetto).
// Uso:   node tests/prova-browser-cava.cjs [Reincarnation.html] [vecchia-build.html] [--out cartella]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// La campagna avanza solo con i comandi del motore (missione da Nerea, tre creature, Orveth, ricompensa, Kharun): i
// salvataggi nella Cava e nella Fenditura sono quindi legittimi e passano la validazione. Con la build vecchia si creano
// i salvataggi; nella build nuova si controllano importazione (regione, posizione, quantità esatte), camminata con il
// corpo sempre su suolo percorribile, giorno/tramonto/notte, combattimento notturno contro Syrava fino alla vittoria
// (avvisi e colpi disegnati), salvataggio con ricarica della pagina e assenza di errori JavaScript.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const outAt = args.indexOf('--out'), out = outAt >= 0 ? args.splice(outAt, 2)[1] : null;
const html = args[0] || path.join(__dirname, '..', 'Reincarnation.html');
const older = args[1] || html;
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
    // Aiuti della prova: lo stato si rilegge sempre da Game.s (l'importazione lo sostituisce).
    window.__defeat = (type, rounds = 900) => {
      const s = Game.s, m = s.monsters.find(q => q.type === type && q.hp > 0);
      if (!m) return 'manca ' + type + ' in ' + s.region;
      for (let i = 0; i < rounds && m.hp > 0; i++) {
        m.hp = Math.min(m.hp, 1); Object.assign(s.player, { x: m.x, y: m.y + 16, dir: 'up' });
        s.player.invul = 9; s.player.hp = Math.max(s.player.hp, 30); Game.step(1 / 30, { x: 0, y: 0, attack: true });
      }
      return m.hp === 0 ? 'ok' : type + ' hp ' + m.hp;
    };
    window.__go = id => {
      const s = Game.s;
      for (let k = 0; k < 6 && s.region !== id; k++) {
        const g = World.route(s.region, id, s.campaign.stage);
        if (!g) return 'nessun percorso verso ' + id;
        Object.assign(s.player, { x: g.x, y: g.y });
        if (!Game.action('interact')) return 'passaggio rifiutato verso ' + id;
      }
      return Game.s.region;
    };
    window.__talk = cmd => { const s = Game.s; Object.assign(s.player, { x: World.points.elder.x, y: World.points.elder.y + 18 }); return Game.command(cmd); };
    window.__hour = h => { const s = Game.s, cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((h * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond; };
  });
  return { context, page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const saves = {};
  try {
    await step('1. Campagna con i comandi del motore e salvataggi nella build ' + path.basename(older), async () => {
      const { context, page, errors } = await start(browser, older);
      const log = await page.evaluate(() => {
        const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24;
        try { Game.newGame(); } finally { Math.random = r0; }
        Inventory.add(Game.s, 'ore', 2n ** 70n + 7n);
        const steps = [];
        steps.push(__talk('accept') ? 'missione' : 'missione rifiutata');
        for (const t of ['moth', 'thorn', 'wolf']) steps.push(__defeat(t));
        steps.push(__defeat('boss'));
        steps.push(__talk('reward') ? 'ricompensa' : 'ricompensa rifiutata');
        if (Game.s.campaign.stage !== 1) return 'stadio ' + Game.s.campaign.stage;
        if (__go('quarry') !== 'quarry') return 'Cava non raggiunta';
        Game.s.player.x += .25;
        const quarry = { x: Game.s.player.x, y: Game.s.player.y, json: Game.exportSave() };
        steps.push(__defeat('kharun'));
        if (Game.s.campaign.stage !== 2) return 'stadio dopo Kharun ' + Game.s.campaign.stage;
        if (__go('rift') !== 'rift') return 'Fenditura non raggiunta';
        Game.s.player.x += .25;
        const rift = { x: Game.s.player.x, y: Game.s.player.y, json: Game.exportSave() };
        return { steps, quarry, rift };
      });
      assert.equal(typeof log, 'object', log);
      assert(log.steps.every(x => x !== 'missione rifiutata' && x !== 'ricompensa rifiutata' && !/^manca|hp /.test(x)), log.steps.join(', '));
      saves.quarry = log.quarry; saves.rift = log.rift;
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      return 'stadio 1 nella Cava, stadio 2 nella Fenditura';
    });
    const { context, page, errors } = await start(browser, html);
    for (const id of ['quarry', 'rift']) {
      await step('2. ' + id + ': importazione, camminata, giorno/tramonto/notte', async () => {
        const save = saves[id]; assert(save, 'salvataggio mancante');
        const res = await page.evaluate(([sv, id]) => {
          if (!Game.importSave(sv.json)) return 'importazione rifiutata';
          const s = Game.s, p = s.player;
          if (s.region !== id || p.x !== sv.x || p.y !== sv.y) return 'posizione diversa ' + s.region + ' ' + p.x + ',' + p.y;
          if (Inventory.quantity(s, 'ore') < 2n ** 70n + 7n) return 'quantità esatta persa';
          let walked = 0, bad = 0;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, -1]]) for (let i = 0; i < 70; i++) {
            p.invul = 9; p.hp = Math.max(p.hp, 1); const x0 = p.x, y0 = p.y;
            Game.step(1 / 60, { x: dx, y: dy });
            walked += Math.hypot(p.x - x0, p.y - y0);
            if (s.region === id && !World.canWalk(p.x, p.y, 5)) bad++;
          }
          return { walked: Math.round(walked), bad };
        }, [save, id]);
        assert.equal(typeof res, 'object', res);
        assert.equal(res.bad, 0, 'posizioni non percorribili: ' + res.bad);
        assert(res.walked > 20, 'il personaggio non si è mosso');
        for (const h of [12, 19.2, 23.5]) { await page.evaluate(h => __hour(h), h); await page.waitForTimeout(200); }
        return res.walked + ' px a piedi';
      });
    }
    await step('3. Combattimento notturno contro Syrava nella Fenditura fino alla vittoria', async () => {
      await page.evaluate(sv => { Game.importSave(sv.json); __hour(23.5); }, saves.rift);
      let shot = null, fx = 0;
      for (let round = 0; round < 40; round++) {
        const r = await page.evaluate(() => {
          const s = Game.s, m = s.monsters.find(q => q.type === 'syrava');
          if (!m || m.hp === 0) return { done: true, stage: s.campaign.stage };
          if (m.hp > 40) m.hp = 40;
          Object.assign(s.player, { x: m.x, y: m.y + 18, dir: 'up' });
          for (let i = 0; i < 12; i++) { s.player.invul = 9; s.player.hp = Math.max(s.player.hp, 40); Game.step(1 / 30, { x: 0, y: 0, attack: true }); }
          return { done: false, hp: m.hp };
        });
        await page.waitForTimeout(60);
        if (!shot && round === 1) shot = await page.evaluate(() => document.getElementById('field').toDataURL('image/png'));
        fx++;
        if (r.done) { assert(r.stage >= 3, 'stadio dopo Syrava ' + r.stage); break; }
        if (round === 39) throw new Error('Syrava non sconfitta (hp ' + r.hp + ')');
      }
      if (out && shot) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'combattimento-syrava-notte.png'), Buffer.from(shot.split(',')[1], 'base64')); }
      return fx + ' turni con disegno reale fra i colpi';
    });
    await step('4. Salvataggio e ricarica della pagina nella Fenditura', async () => {
      const before = await page.evaluate(() => { Game.save(); return { region: Game.s.region, x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y), stage: Game.s.campaign.stage }; });
      await page.reload(); await page.waitForTimeout(800);
      await page.click('#playBtn'); await page.waitForTimeout(900);
      const after = await page.evaluate(() => ({ region: Game.s.region, x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y), stage: Game.s.campaign.stage }));
      assert.deepEqual(after, before);
      return after.region + ' stadio ' + after.stage;
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
