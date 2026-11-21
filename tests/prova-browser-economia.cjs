// Prova nel browser (Edge, senza finestra) dei flussi economici: partita nuova, mercato di Vela, giorni che passano,
// salvataggio con ricarica della pagina e caricamento di un salvataggio creato con la build precedente.
// Uso:   node tests/prova-browser-economia.cjs [Reincarnation.html] [build-precedente.html]
//        PW_CORE = percorso di playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs).
// Senza la build precedente la prova del vecchio salvataggio viene saltata.
const path = require('path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const url = f => 'file:///' + path.resolve(f).split(path.sep).join('/');
const nuova = process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html');
const vecchia = process.argv[3] || null;
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  let failed = 0;
  const ok = (cond, text) => { console.log((cond ? 'OK   ' : 'FAIL ') + text); if (!cond) failed++; };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    if (vecchia) {
      await page.goto(url(vecchia));
      await page.evaluate(() => { localStorage.clear(); Game.newGame(); Game.save(); });
      const oldEconomy = await page.evaluate(() => JSON.stringify(Game.s.economy));
      ok(!JSON.parse(oldEconomy).flows, 'la build precedente non ha i flussi');
      await page.goto(url(nuova));
      const loaded = await page.evaluate(() => { const r = Game.load(); const f = Game.s.economy.flows; return { r, flows: !!f, day: f && f.day, audit: Economy.flowReport(Game.s).audit.length }; });
      ok(loaded.r && loaded.flows && loaded.audit === 0, 'il salvataggio precedente si carica e riceve i flussi (giorno ' + loaded.day + ')');
      const sameStock = await page.evaluate(old => JSON.stringify(Game.s.economy.markets) === JSON.stringify(JSON.parse(old).markets), oldEconomy);
      ok(sameStock, 'le scorte del vecchio salvataggio restano identiche');
    } else await page.goto(url(nuova));
    const state = await page.evaluate(() => {
      Game.newGame();
      const s = Game.s; s.region = 'valley'; Object.assign(s.player, { x: 445, y: 627, gold: 5000 });
      const now = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440;
      s.time += ((12 * 60 - now + 1440) % 1440) / (Calendar.minutesPerSecond || .8);
      const rows = Economy.view(s).market.rows;
      const herb = rows.find(r => r.id === 'herb');
      const bought = Economy.command(s, { op: 'buy', id: 'herb', amount: '2' });
      return { rows: rows.length, herb: herb && [herb.buy, herb.sell, herb.stock], bought: bought.ok, audit: Economy.flowReport(s).audit.length };
    });
    ok(state.rows >= 9 && state.herb && state.herb[0] > state.herb[1] && state.bought && state.audit === 0,
      'mercato di Vela: ' + state.rows + ' righe, erba (compra, vende, scorta) ' + state.herb + ', acquisto riuscito, registro in pari');
    const days = await page.evaluate(() => {
      const s = Game.s, before = JSON.stringify(s.economy.markets);
      for (let i = 0; i < 30; i++) { s.time += 1440 / (Calendar.minutesPerSecond || .8); Economy.tick(s); }
      const report = Economy.flowReport(s);
      return { changed: before !== JSON.stringify(s.economy.markets), audit: report.audit.length, transit: Object.keys(report.transit).length,
        wealth: report.markets.map(m => m.id + ':' + m.wealth).join(' ') };
    });
    ok(days.changed && days.audit === 0 && days.transit > 0, '30 giorni: scorte cambiate, merci in viaggio, registro in pari (ricchezza ' + days.wealth + ')');
    const before = await page.evaluate(() => { Game.save(); return JSON.stringify(Game.s.economy); });
    await page.reload();
    const after = await page.evaluate(() => { Game.load(); return JSON.stringify(Game.s.economy); });
    ok(before === after, 'dopo salvataggio e ricarica della pagina l\'economia è identica');
    ok(errors.length === 0, 'nessun errore JavaScript' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(failed ? failed + ' prove fallite' : 'Tutte le prove superate');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
