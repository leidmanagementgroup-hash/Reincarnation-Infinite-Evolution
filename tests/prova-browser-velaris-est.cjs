// Prova nel browser dei quartieri orientali di Velaris e della Serra delle Talee (Playwright + Edge, nessuna dipendenza nel progetto).
// Uso:   node tests/prova-browser-velaris-est.cjs [Reincarnation.html] [vecchia-build.html]
//   La seconda build (facoltativa) serve a creare un salvataggio con la versione precedente e caricarlo in quella nuova.
//   PW_CORE = percorso di playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Il personaggio cammina con i comandi di movimento del motore (Game.step), lungo il percorso calcolato dalla città: niente teletrasporto
// dentro Velaris. Fra la valle e la città si usano i varchi come nelle altre prove.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const fileUrl = p => 'file:///' + path.resolve(p).replace(/\\/g, '/');
const html = process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html');
const older = process.argv[3] || null;
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).split('\n')[0]); }
};

// Funzioni eseguite nella pagina.
const pageHelpers = () => {
  window.__toCity = () => {
    const s = Game.s;
    for (const id of ['ancient-valley', 'verdant-canopy', 'city-velaris']) {
      const gate = World.route(s.region, id, s.campaign.stage);
      Object.assign(s.player, { x: gate.x, y: gate.y });
      if (!Game.action('interact') || s.region !== id) return false;
    }
    return true;
  };
  // Cammina verso la meta seguendo il percorso della città; restituisce passi, distanza finale e blocchi.
  window.__walk = (goal, limit = 40000) => {
    const s = Game.s, map = UrbanWorld.exterior(s.seed);
    let route = map.path(s.player, goal, 6), index = 1, steps = 0, stuck = 0, last = { x: s.player.x, y: s.player.y };
    if (!route.length) return { ok: false, why: 'nessun percorso' };
    while (steps < limit) {
      const target = route[Math.min(index, route.length - 1)];
      const dx = target.x - s.player.x, dy = target.y - s.player.y, d = Math.hypot(dx, dy);
      if (d < 4) { if (index >= route.length - 1) break; index++; continue; }
      Game.step(1 / 60, { x: dx / d, y: dy / d, attack: false }, 1 / 60); steps++;
      if (steps % 60 === 0) {
        if (Math.hypot(s.player.x - last.x, s.player.y - last.y) < 2) { stuck++; route = map.path(s.player, goal, 6); index = 1; if (stuck > 5) break; }
        last = { x: s.player.x, y: s.player.y };
      }
      if (s.region !== UrbanWorld.cityId) return { ok: false, why: 'regione cambiata in ' + s.region };
    }
    const left = Math.hypot(goal.x - s.player.x, goal.y - s.player.y);
    return { ok: left < 8, steps, seconds: +(steps / 60).toFixed(1), left: +left.toFixed(1), stuck, district: map.districtAt(s.player.x, s.player.y).name };
  };
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    const wait = ms => page.waitForTimeout(ms);
    const start = async () => {
      await page.goto(fileUrl(html)); await wait(300);
      await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(600);   // contesto di prova isolato
      await page.click('#playBtn');
      const resume = page.locator('#dialog button[data-do="resume"]').first();
      if (await resume.isVisible().catch(() => false) || await resume.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false)) await resume.click();
      await wait(500); await page.evaluate(pageHelpers);
    };

    if (older) await step('Vecchio salvataggio: creato con la build precedente', async () => {
      await page.goto(fileUrl(older)); await wait(600);
      await page.click('#playBtn'); await wait(600);
      await page.evaluate(() => { Game.newGame(); });
      await page.evaluate(pageHelpers);
      const saved = await page.evaluate(() => {
        if (!__toCity()) return null;
        const map = UrbanWorld.exterior(Game.s.seed), guild = map.services.find(v => v.id === 'guild');
        Object.assign(Game.s.player, { x: 2080, y: 726 });                      // vicino al vecchio confine orientale
        Inventory.add(Game.s, 'ore', 7);
        return { json: Game.exportSave(), x: Game.s.player.x, y: Game.s.player.y, region: Game.s.region, ore: String(Inventory.quantity(Game.s, 'ore')), guild: !!guild };
      });
      assert(saved && saved.region === 'city-velaris', 'salvataggio vecchio in città');
      global.__oldSave = saved;
      return 'v' + JSON.parse(saved.json).version + ', posizione ' + saved.x + ',' + saved.y;
    });

    await step('Avvio, nuova partita e ingresso a Velaris', async () => {
      await start();
      assert(await page.evaluate(() => __toCity()), 'ingresso in città');
      return await page.evaluate(() => UrbanWorld.exterior(Game.s.seed).districts.length + ' quartieri, ' + UrbanWorld.exterior(Game.s.seed).buildings.length + ' edifici');
    });
    await step('Carta della città: tipo di insediamento e nuovi quartieri', async () => {
      await page.keyboard.press('KeyM'); await wait(400);
      const text = await page.locator('#panelBody').innerText();
      await page.keyboard.press('Escape'); await wait(200);
      assert.match(text, /Cittadina di Velaris/); assert.match(text, /Portici del Vetro/); assert.match(text, /Orti dell.Alambicco/);
    });
    await step('A piedi fino ai Portici del Vetro (Corte dei Soffiatori)', async () => {
      const r = await page.evaluate(() => __walk({ x: 2460, y: 520 }));
      assert(r.ok, JSON.stringify(r)); assert.equal(r.district, 'Portici del Vetro'); return r.seconds + ' s di cammino, blocchi ' + r.stuck;
    });
    await step('A piedi fino agli Orti dell\'Alambicco (Piazzetta delle Radici)', async () => {
      const r = await page.evaluate(() => __walk({ x: 2516, y: 1260 }));
      assert(r.ok, JSON.stringify(r)); assert.equal(r.district, 'Orti dell’Alambicco'); return r.seconds + ' s di cammino, blocchi ' + r.stuck;
    });
    await step('A piedi fino alla porta della Serra e ingresso', async () => {
      const door = await page.evaluate(() => UrbanWorld.exterior(Game.s.seed).services.find(v => v.id === 'greenhouse').point);
      const r = await page.evaluate(goal => __walk(goal), door);
      assert(r.ok, JSON.stringify(r));
      assert(await page.evaluate(() => Game.action('interact')), 'interazione con la porta');
      assert.equal(await page.evaluate(() => UrbanWorld.kind(Game.s.region)), 'greenhouse');
      return 'regione ' + await page.evaluate(() => Game.s.region);
    });
    await step('Serra: semina, irrigazione, salvataggio e ricarica della pagina', async () => {
      const r = await page.evaluate(() => {
        const s = Game.s, bed = UrbanWorld.site(s, 'greenhouse-bed').point;
        Object.assign(s.player, { x: bed.x, y: bed.y });
        Inventory.add(s, 'seeds', 1);
        const seeds = Inventory.quantity(s, 'seeds');
        const sow = Game.command('city-service', { id: 'greenhouse-bed', op: 'sow' });
        const water = Game.command('city-service', { id: 'greenhouse-bed', op: 'water' });
        return { sow, water, seedsSpent: String(seeds - Inventory.quantity(s, 'seeds')), ready: s.cityWorks.seedbedAt,
          now: Calendar.timestamp(s.calendar, s.time), saved: Game.save() };
      });
      assert(r.sow && r.water && r.saved, JSON.stringify(r)); assert.equal(r.seedsSpent, '1');
      assert(Math.abs(r.ready - r.now - 80) < 1e-6, 'maturazione dopo 80 minuti');
      global.__bed = r;
      await page.reload(); await wait(800);
      assert.match(await page.locator('#playBtn').innerText(), /Continua il viaggio/);
      await page.click('#playBtn'); await wait(1200); await page.evaluate(pageHelpers);
      const after = await page.evaluate(() => ({ kind: UrbanWorld.kind(Game.s.region), ready: Game.s.cityWorks.seedbedAt }));
      assert.equal(after.kind, 'greenhouse'); assert.equal(after.ready, r.ready);
      return 'matura al minuto ' + r.ready.toFixed(0);
    });
    await step('Serra: nessun raccolto a 79 minuti, raccolto a 80+ con due erbe', async () => {
      const r = await page.evaluate(() => {
        const s = Game.s, mps = Calendar.minutesPerSecond, bed = UrbanWorld.site(s, 'greenhouse-bed').point;
        Object.assign(s.player, { x: bed.x, y: bed.y });
        const herbs = Inventory.quantity(s, 'herb'), left = s.cityWorks.seedbedAt - Calendar.timestamp(s.calendar, s.time);
        s.time += (left - 1) / mps;
        const early = Game.command('city-service', { id: 'greenhouse-bed', op: 'reap' });
        s.time += 1.5 / mps;
        const reap = Game.command('city-service', { id: 'greenhouse-bed', op: 'reap' });
        return { early, reap, herbs: String(Inventory.quantity(s, 'herb') - herbs), empty: s.cityWorks.seedbedAt, saved: Game.save() && Game.load() };
      });
      assert(!r.early && r.reap && r.saved, JSON.stringify(r)); assert.equal(r.herbs, '2'); assert.equal(r.empty, -1);
    });
    await step('Uscita dalla Serra verso la porta in città', async () => {
      const r = await page.evaluate(() => {
        const exit = UrbanWorld.site(Game.s, 'exit').point; Object.assign(Game.s.player, { x: exit.x, y: exit.y });
        const ok = Game.action('interact'), door = UrbanWorld.exterior(Game.s.seed).services.find(v => v.id === 'greenhouse');
        return { ok, region: Game.s.region, dx: Math.round(Game.s.player.x - door.x), dy: Math.round(Game.s.player.y - door.y) };
      });
      assert(r.ok); assert.equal(r.region, 'city-velaris'); assert(Math.abs(r.dx) < 30 && Math.abs(r.dy) < 30, JSON.stringify(r));
    });
    await step('Ritorno a piedi dalla Serra alla Piazza delle Quattro Lenti', async () => {
      const r = await page.evaluate(() => __walk(UrbanWorld.exterior(Game.s.seed).plaza));
      assert(r.ok, JSON.stringify(r)); return r.seconds + ' s di cammino';
    });
    if (older) await step('Vecchio salvataggio caricato nella nuova build', async () => {
      const r = await page.evaluate(json => {
        const ok = Game.importSave(json);
        return { ok, region: Game.s.region, x: Game.s.player.x, y: Game.s.player.y, ore: String(Inventory.quantity(Game.s, 'ore')),
          seedbed: Game.s.cityWorks.seedbedAt, walkable: World.canWalk(Game.s.player.x, Game.s.player.y, 6) };
      }, global.__oldSave.json);
      assert(r.ok, 'importazione'); assert.equal(r.region, global.__oldSave.region);
      assert.equal(r.x, global.__oldSave.x); assert.equal(r.y, global.__oldSave.y); assert.equal(r.ore, global.__oldSave.ore);
      assert.equal(r.seedbed, -1, 'aiuola vuota per i salvataggi precedenti'); assert(r.walkable, 'posizione ancora percorribile');
      const after = await page.evaluate(() => __walk({ x: 2460, y: 520 }));
      assert(after.ok, 'dal vecchio confine ai Portici: ' + JSON.stringify(after));
      return 'posizione, inventario e regione conservati';
    });
    await step('Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
    await context.close();
  } catch (e) { results.push(['FAIL', 'errore imprevisto — ' + e.message]); console.log('FAIL errore imprevisto — ' + e.message); }
  finally { await browser.close(); }
  const failed = results.filter(r => r[0] === 'FAIL').length;
  console.log('\n' + (failed ? failed + ' prove fallite su ' + results.length : 'Tutte le ' + results.length + ' prove superate'));
  process.exitCode = failed ? 1 : 0;
})();
