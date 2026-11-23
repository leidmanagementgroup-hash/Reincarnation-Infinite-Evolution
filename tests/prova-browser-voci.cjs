// Prova end-to-end in Edge delle voci fra continenti (Living World 2.0, incremento 5), con azioni reali dell'interfaccia.
// Uso:   node tests/prova-browser-voci.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Sequenza (seme 19425, contesto isolato): mercato di Vela «Vendi 1» Cappa usata e «Compra 5» erbe (la carenza si aggrava) →
// Tessa «Consegna 3» → diario (L): «Voci dai continenti» con Vaelthoria che ne parla e la notizia in viaggio verso Nordharyn
// e Azheryon → «Dormi fino alle 06:00» alla locanda per due notti → diario: la notizia è arrivata a Nordharyn, non ancora
// (o appena) ad Azheryon → ricarica della pagina: le voci restano. Gli spostamenti fra i luoghi sono teletrasporti dichiarati.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = path.resolve(process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html'));
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 320)); throw e; }
};
const INIT = () => {
  let queue = [], id = 0, now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(now); } };
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(INIT);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const tick = n => page.evaluate(n => __tick(n), n);
  const close = () => page.evaluate(() => { if (UI.panel) UI.close(); __tick(2); });
  const press = async key => { await page.keyboard.press(key); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' }); return page.locator('#dialog').innerText(); };
  const at = (x, y) => page.evaluate(([x, y]) => { Object.assign(Game.s.player, { x, y }); __tick(4); }, [x, y]);
  const voices = async () => { const text = await press('l'); await close(); const i = text.indexOf('Voci dai continenti'); return i < 0 ? '' : text.slice(i); };
  const sleep = async () => {
    await page.evaluate(() => { const inn = Tradecraft.inn; Object.assign(Game.s.player, { x: inn.x, y: inn.y + 14 }); __tick(4); });
    await press('n'); await page.locator('#dialog button', { hasText: 'Dormi fino alle 06:00' }).first().click(); await tick(5); await close();
    await page.evaluate(() => { Game.step(1 / 60, {}, 600); for (let i = 0; i < 90; i++) __tick(1); }); // la mattina passa: il giorno è avviato
  };
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });

    await step('1. Mercato di Vela e consegna di 3 erbe a Tessa con i pulsanti', async () => {
      const m = await page.evaluate(() => { const p = Economy.profiles.find(p => p.id === 'vela'); return { x: p.x, y: p.y }; });
      await at(m.x, m.y + 4); await press('e');
      await page.locator('#dialog button[aria-label="Vendi 1 Cappa usata"]').click(); await tick(3);
      await page.locator('#dialog button[aria-label="Compra 5 Erba di rugiada"]').click(); await tick(3); await close();
      const t = await page.evaluate(() => World.points.merchant); await at(t.x + 12, t.y + 16); await press('e');
      await page.locator('#dialog button', { hasText: 'Consegna 3' }).first().click(); await tick(3); await close();
      assert.equal(await page.evaluate(() => Game.s.renown.deeds.length), 1);
    });
    await step('2. Diario: Vaelthoria ne parla subito; verso Nordharyn e Azheryon la notizia è in viaggio', async () => {
      const text = await voices();
      assert.match(text, /Vaelthoria · Se ne parla/); assert.match(text, /Nordharyn · Sconosciuto/);
      assert.match(text, /In viaggio: «Ha portato erbe all’emporio di Vela durante una carenza» arriverà il giorno 3/);
      if (shots) { await press('l'); await page.locator('#dialog .sectionTitle', { hasText: 'Voci dai continenti' }).scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(shots, 'voci-in-viaggio.png') }); await close(); }
    });
    await step('3. Due notti alla locanda: la notizia arriva a Nordharyn il giorno 3', async () => {
      await sleep(); assert.match(await voices(), /Nordharyn · Sconosciuto/);
      await sleep();
      const text = await voices(), dayNow = await page.evaluate(() => Calendar.absoluteDays(Game.s.calendar, Game.s.time) + 1);
      assert.equal(dayNow, 3); assert.match(text, /Nordharyn · Se ne parla/); assert.match(text, /Giorno 3: Ha portato erbe all’emporio di Vela durante una carenza \(voce da Vaelthoria\)/);
      if (shots) { await press('l'); await page.locator('#dialog .sectionTitle', { hasText: 'Voci dai continenti' }).scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(shots, 'voci-arrivate.png') }); await close(); }
      return 'giorno ' + dayNow;
    });
    await step('4. Ricarica della pagina: le voci restano', async () => {
      const before = await page.evaluate(() => JSON.stringify(Game.s.renown));
      await page.reload(); await tick(5); await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]'); if (await resume.count()) { await resume.first().click(); await tick(3); }
      await close();
      assert.equal(await page.evaluate(() => JSON.stringify(Game.s.renown)), before);
      assert.match(await voices(), /Nordharyn · Se ne parla/);
    });
    await step('5. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 5 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
