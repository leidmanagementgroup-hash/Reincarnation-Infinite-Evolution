// Prova nel browser del Santuario della Marea Muta (Playwright + Edge, nessuna dipendenza nel progetto).
// Uso:   node tests/prova-browser-santuario.cjs [Reincarnation.html] [vecchia-build.html] [--out cartella]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Il Santuario esiste solo in alcuni mondi: si usa il seme 1116 (ingresso nel Passo dei Larici, raggiungibile allo stadio 0).
// Con la build vecchia: scoperta e ingresso con i comandi del motore, lettura della prima lapide, salvataggio nel Santuario.
// Nella build nuova: importazione (regione, posizione, lapide letta), camminata fra sale e colonne con il corpo sempre su
// suolo percorribile, notte, lettura della seconda lapide (pannello), combattimento contro Nadir fino alla vittoria con
// disegno reale fra i colpi, trono disponibile, uscita dal portale verso la superficie e ritorno, salvataggio con
// ricarica della pagina, assenza di errori JavaScript.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const outAt = args.indexOf('--out'), out = outAt >= 0 ? args.splice(outAt, 2)[1] : null;
const html = args[0] || path.join(__dirname, '..', 'Reincarnation.html');
const older = args[1] || html;
const SEED = 1116;
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
    window.__at = (x, y) => { Object.assign(Game.s.player, { x, y }); return Game.action('interact'); };
    window.__hour = h => { const s = Game.s, cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440; s.time += ((h * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond; };
  });
  return { context, page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  let save = null;
  try {
    await step('1. Scoperta, ingresso e lapide nella build ' + path.basename(older) + ' (seme ' + SEED + ')', async () => {
      const { context, page, errors } = await start(browser, older);
      const r = await page.evaluate(seed => {
        const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? seed / 4294967296 : .24;
        try { Game.newGame(); } finally { Math.random = r0; }
        const s = Game.s, e = s.legendary.entrance;
        if (!e) return 'nessun Santuario in questo mondo';
        if (__go(e.region) !== e.region) return 'ingresso non raggiunto';
        if (!__at(e.x, e.y) || Game.s.region !== 'nadir-vault') return 'ingresso rifiutato';
        __at(190, 545);
        if (UI.panel) UI.close();
        const l = Game.s.legendary;
        if (!l.read.includes('threshold-lore')) return 'lapide non letta';
        Game.s.player.x += .25;
        return { x: Game.s.player.x, y: Game.s.player.y, json: Game.exportSave(), visits: l.visits };
      }, SEED);
      assert.equal(typeof r, 'object', r);
      save = r;
      assert.deepEqual(errors, [], errors.join(' | '));
      await context.close();
      return 'visite ' + r.visits + ', lapide della Soglia letta';
    });
    const { context, page, errors } = await start(browser, html);
    await step('2. Importazione nel Santuario e camminata fra sale e colonne', async () => {
      const r = await page.evaluate(sv => {
        if (!Game.importSave(sv.json)) return 'importazione rifiutata';
        const s = Game.s, p = s.player;
        if (s.region !== 'nadir-vault' || p.x !== sv.x || p.y !== sv.y) return 'posizione diversa';
        if (!s.legendary.read.includes('threshold-lore')) return 'lettura persa';
        let walked = 0, bad = 0;
        for (const [dx, dy] of [[1, 0], [0, -1], [1, 0], [0, 1], [-1, 0], [1, -1]]) for (let i = 0; i < 80; i++) {
          p.invul = 9; p.hp = Math.max(p.hp, 1); const x0 = p.x, y0 = p.y;
          Game.step(1 / 60, { x: dx, y: dy });
          walked += Math.hypot(p.x - x0, p.y - y0);
          if (s.region === 'nadir-vault' && !World.canWalk(p.x, p.y, 5)) bad++;
        }
        return { walked: Math.round(walked), bad };
      }, save);
      assert.equal(typeof r, 'object', r);
      assert.equal(r.bad, 0, 'posizioni non percorribili: ' + r.bad);
      assert(r.walked > 30, 'il personaggio non si è mosso');
      for (const h of [12, 19.2, 23.5]) { await page.evaluate(h => __hour(h), h); await page.waitForTimeout(200); }
      return r.walked + ' px a piedi';
    });
    await step('3. Lettura della Tavola dei flutti (pannello leggendario)', async () => {
      const r = await page.evaluate(() => { const ok = __at(560, 222); const panel = UI.panel; if (UI.panel) UI.close(); return { ok, panel, read: Game.s.legendary.read.includes('cloister-lore') }; });
      assert(r.ok && r.read, JSON.stringify(r));
      return 'pannello ' + r.panel;
    });
    await step('4. Combattimento notturno contro Nadir fino alla vittoria', async () => {
      await page.evaluate(() => __hour(23.5));
      let shot = null, rounds = 0, last = null;
      for (; rounds < 60; rounds++) {
        last = await page.evaluate(() => {
          const s = Game.s, m = s.monsters.find(q => q.type === 'nadir');
          if (!m) return { missing: true };
          if (m.hp === 0) return { done: true, fell: s.legendary.originalDefeatedAt !== null };
          if (m.hp > 30) m.hp = 30;
          Object.assign(s.player, { x: m.x, y: m.y + 20, dir: 'up' });
          for (let i = 0; i < 12; i++) { s.player.invul = 9; s.player.hp = Math.max(s.player.hp, 40); Game.step(1 / 30, { x: 0, y: 0, attack: true }); }
          return { hp: m.hp };
        });
        if (last.missing || last.done) break;
        await page.waitForTimeout(60);
        if (!shot && rounds === 1) shot = await page.evaluate(() => document.getElementById('field').toDataURL('image/png'));
      }
      assert(!last.missing, 'Nadir assente');
      assert(last.done, 'Nadir non sconfitto (hp ' + last.hp + ')');
      assert(last.fell, 'sconfitta non registrata nel Santuario');
      if (out && shot) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'combattimento-nadir-notte.png'), Buffer.from(shot.split(',')[1], 'base64')); }
      const throne = await page.evaluate(() => Legendary.sites(Game.s).some(x => x.id === 'legendary-throne'));
      assert(throne, 'trono non disponibile dopo la vittoria');
      return rounds + ' turni, trono disponibile';
    });
    await step('5. Uscita dal portale verso il Passo dei Larici e ritorno', async () => {
      const r = await page.evaluate(() => {
        if (!__at(104, 554)) return 'uscita rifiutata';
        const s = Game.s, e = s.legendary.entrance;
        if (s.region !== e.region) return 'regione ' + s.region;
        if (!__at(e.x, e.y) || Game.s.region !== 'nadir-vault') return 'rientro rifiutato';
        return 'ok';
      });
      assert.equal(r, 'ok');
    });
    await step('6. Salvataggio e ricarica della pagina nel Santuario', async () => {
      const before = await page.evaluate(() => { Game.save(); const l = Game.s.legendary; return { region: Game.s.region, x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y), read: l.read.length, fell: l.originalDefeatedAt !== null, visits: l.visits }; });
      await page.reload(); await page.waitForTimeout(800);
      await page.click('#playBtn'); await page.waitForTimeout(900);
      const after = await page.evaluate(() => { const l = Game.s.legendary; return { region: Game.s.region, x: Math.round(Game.s.player.x), y: Math.round(Game.s.player.y), read: l.read.length, fell: l.originalDefeatedAt !== null, visits: l.visits }; });
      assert.deepEqual(after, before);
      return after.region + ', visite ' + after.visits;
    });
    await step('7. Assenza di errori JavaScript (console e pageerror)', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
    await context.close();
  } catch (e) {
    results.push(['FAIL', 'errore imprevisto — ' + e.message]); console.log('FAIL errore imprevisto — ' + e.message);
  } finally { await browser.close(); }
  const failed = results.filter(r => r[0] === 'FAIL');
  console.log('\n' + (failed.length ? failed.length + ' prove fallite su ' + results.length : 'Tutte le ' + results.length + ' prove superate'));
  process.exitCode = failed.length ? 1 : 0;
})();
