// Prova end-to-end in Edge delle Richieste del mondo (Living World 2.0, incremento 3), con azioni reali dell'interfaccia.
// Uso:   node tests/prova-browser-richieste.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Sequenza (seme 19425, contesto isolato): diario (tasto L) con «Lana per le mantelle d’inverno» disponibile ma da accettare
// presso Ivo → tasto E da Ivo: «Accetta» → mercato di Vela: «Vendi 1» Cappa usata, «Compra 1» lana ×2 → di nuovo da Ivo:
// «Riscuoti» (borsello, lana al mercato, memoria di Ivo e testimoni) → ricarica della pagina: richiesta completata e ricordo restano.
// Gli spostamenti fra i luoghi sono teletrasporti dichiarati; tutte le azioni passano da tasti e pulsanti.
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
  window.__toasts = [];
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('toast');
    new MutationObserver(() => { const t = el.textContent; if (t && window.__toasts.at(-1) !== t) window.__toasts.push(t); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
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
  const ivo = async () => { const p = await page.evaluate(() => World.points.smith); await at(p.x + 12, p.y + 16); return press('e'); };
  const rowOf = name => page.locator('#dialog .row', { hasText: name }).first();
  const toast = async re => { await page.waitForFunction(src => new RegExp(src).test(__toasts.join('|')), re.source, { timeout: 9000 }).catch(() => {}); return page.evaluate(() => __toasts.join(' | ')); };
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });

    await step('1. Diario (L): «Lana per le mantelle d’inverno» disponibile, da accettare presso Ivo', async () => {
      const text = await press('l');
      assert.match(text, /Richieste del mondo/); assert.match(text, /Lana per le mantelle d’inverno/); assert.match(text, /Disponibile oggi/);
      assert.match(text, /Avvicinati a Ivo/);
      assert.equal(await rowOf('Lana per le mantelle').locator('button', { hasText: 'Accetta' }).isDisabled(), true, 'accettabile lontano da Ivo');
      await rowOf('Lana per le mantelle').scrollIntoViewIfNeeded(); await shot('richieste-diario'); await close();
    });
    await step('2. Tasto E da Ivo: «Accetta»', async () => {
      await ivo(); await rowOf('Lana per le mantelle').locator('button', { hasText: 'Accetta' }).click(); await tick(3);
      const log = await toast(/Richiesta accettata/);
      assert.match(log, /Richiesta accettata · Lana per le mantelle/);
      assert.match(await page.locator('#dialog').innerText(), /In corso/);
      await close();
    });
    await step('3. Mercato di Vela: «Vendi 1» Cappa usata, «Compra 1» lana due volte', async () => {
      const m = await page.evaluate(() => { const p = Economy.profiles.find(p => p.id === 'vela'); return { x: p.x, y: p.y }; });
      await at(m.x, m.y + 4); await press('e');
      await page.locator('#dialog button[aria-label="Vendi 1 Cappa usata"]').click(); await tick(3);
      for (let i = 0; i < 2; i++) { await page.locator('#dialog button[aria-label="Compra 1 Lana"]').click(); await tick(3); }
      assert.equal(await page.evaluate(() => String(Inventory.quantity(Game.s, 'wool'))), '2');
      await close();
    });
    await step('4. Di nuovo da Ivo: «Riscuoti»; borsello, lana al mercato, memoria di Ivo e testimoni', async () => {
      await ivo();
      const before = await page.evaluate(() => ({ gold: Game.s.player.gold, stock: Economy.quote(Game.s, 'vela', 'wool').stock }));
      await rowOf('Lana per le mantelle').locator('button', { hasText: 'Riscuoti' }).click(); await tick(3);
      const log = await toast(/Richiesta completata/);
      const after = await page.evaluate(() => ({ gold: Game.s.player.gold, stock: Economy.quote(Game.s, 'vela', 'wool').stock, wool: String(Inventory.quantity(Game.s, 'wool')),
        memory: Game.s.memory.episodes.map(e => e.npc + ':' + e.kind) }));
      assert.match(log, /Richiesta completata · Lana per le mantelle d’inverno · \+\d+ Scintille · Ivo ricorderà il tuo aiuto/);
      assert(after.gold > before.gold); assert.equal(after.wool, '0'); assert.equal(BigInt(after.stock), BigInt(before.stock) + 2n);
      assert(after.memory.includes('smith:request-kept'));
      const text = await page.locator('#dialog').innerText();
      assert.match(text, /Ivo ricorda/); assert.match(text, /hai portato ciò che serviva alla bottega/); assert.match(text, /Completata di recente/);
      await shot('richieste-ivo');
      await close();
      return `+${after.gold - before.gold} Scintille, lana a Vela ${before.stock}→${after.stock}, ricordi: ${after.memory.join(', ')}`;
    });
    await step('5. Ricarica della pagina: richiesta completata e ricordo di Ivo restano', async () => {
      const before = await page.evaluate(() => JSON.stringify([Game.s.requests, Game.s.memory]));
      await page.reload(); await tick(5);
      await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]');
      if (await resume.count()) { await resume.first().click(); await tick(3); }
      await close();
      assert.equal(await page.evaluate(() => JSON.stringify([Game.s.requests, Game.s.memory])), before);
      const text = await press('l'); assert.match(text, /Completata di recente/); await close();
    });
    await step('6. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 6 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
