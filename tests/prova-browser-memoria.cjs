// Prova end-to-end in Edge della memoria del mondo (Living World 2.0, incremento 1), con azioni reali dell'interfaccia.
// Uso:   node tests/prova-browser-memoria.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Sequenza (seme 19425, contesto del browser isolato: nessuna partita reale toccata):
//   tasto E da Tessa → al banco del mercato «Vendi 1» Cappa usata e «Compra 5» erbe (la carenza di Vela si aggrava) → di nuovo da Tessa: «Consegna 3»
//   (scorta e borsello cambiano, Tessa ricorda, Nerea e Ivo l'hanno visto) → Ivo racconta di averlo visto → ricarica della
//   pagina e «Continua il viaggio» (i ricordi restano) → «Dormi fino alle 06:00» alla locanda → a emporio chiuso Tessa
//   consegna la pozione messa da parte, una sola volta.
// Gli spostamenti fra i luoghi sono teletrasporti dichiarati (coordinate del giocatore); tutte le azioni passano da tasti e pulsanti.
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
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 300)); throw e; }
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
  const goTo = (id, dx = 12, dy = 16) => page.evaluate(([id, dx, dy]) => { const t = World.points[id] || Tradecraft.inn; Object.assign(Game.s.player, { x: t.x + dx, y: t.y + dy }); __tick(4); }, [id, dx, dy]);
  const talk = async () => { await page.keyboard.press('e'); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' }); return page.locator('#dialog').innerText(); };
  const close = async () => { await page.evaluate(() => { if (UI.panel) UI.close(); __tick(2); }); };
  const click = async text => { await page.locator('#dialog button', { hasText: text }).first().click(); await tick(3); };
  const market = () => page.evaluate(() => Economy.quote(Game.s, 'vela', 'herb').stock);
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });

    let stockStart;
    await step('1. Tasto E da Tessa: il dialogo mostra che non ti conosce e che l’emporio è a corto di erbe', async () => {
      await goTo('merchant'); const text = await talk();
      assert.match(text, /Tessa ti ricorda/); assert.match(text, /Ti conosce appena/); assert.match(text, /a corto di erbe di rugiada/);
      assert.match(text, /Non hai erbe di rugiada con te/);
      stockStart = await market();
      return 'scorta di Vela ' + stockStart;
    });
    await step('2. Al banco del mercato (tasto E): «Vendi 1» Cappa usata, poi «Compra 5» erbe di rugiada (la scorta di Vela scende)', async () => {
      await close();
      await page.evaluate(() => { const m = Economy.sites(Game.s).find(x => /mercato|banco/i.test(x.text || x.name || '')) || Economy.sites(Game.s)[0]; Object.assign(Game.s.player, { x: m.point.x, y: m.point.y + 18 }); __tick(4); });
      await page.keyboard.press('e'); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' });
      await page.locator('#dialog button[aria-label="Vendi 1 Cappa usata"]').click(); await tick(3);
      await page.locator('#dialog button[aria-label="Compra 5 Erba di rugiada"]').click(); await tick(3);
      const r = await page.evaluate(() => ({ herbs: String(Inventory.quantity(Game.s, 'herb')), stock: Economy.quote(Game.s, 'vela', 'herb').stock }));
      assert.equal(r.herbs, '5'); assert.equal(BigInt(r.stock), BigInt(stockStart) - 5n);
      await close();
      return `erbe nel borsello 5, scorta ${stockStart}→${r.stock}`;
    });
    let gold0;
    await step('3. «Consegna 3» a Tessa: scorta e borsello cambiano, Tessa ricorda, Nerea e Ivo l’hanno visto', async () => {
      await goTo('merchant'); await talk();
      const before = await market(); gold0 = await page.evaluate(() => Game.s.player.gold);
      await click('Consegna 3');
      // I messaggi si mettono in fila (RPG Evolution): si aspetta che compaia, senza ripetere l'azione.
      await page.waitForFunction(() => __toasts.some(t => /Tessa ricorderà/.test(t)), null, { timeout: 9000 }).catch(() => {});
      const r = await page.evaluate(() => ({ gold: Game.s.player.gold, toasts: __toasts.slice(), memory: Game.s.memory.episodes.map(e => e.npc + ':' + e.kind + ':' + e.source) }));
      assert.equal(BigInt(await market()), BigInt(before) + 3n);
      assert(r.gold > gold0, 'borsello invariato');
      assert(r.toasts.some(t => /Tessa ricorderà il tuo aiuto · l’hanno visto (Nerea e Ivo|Ivo e Nerea)/.test(t)), r.toasts.join(' | '));
      assert.deepEqual(r.memory.sort(), ['elder:saw-help:witness', 'merchant:shortage-help:self', 'smith:saw-help:witness']);
      const text = await page.locator('#dialog').innerText();
      assert.match(text, /Giorno 1/); assert.match(text, /hai portato erbe di rugiada all’emporio durante la carenza/); assert.match(text, /Ti stima/);
      await shot('memoria-tessa');
      await close();
      return `+${r.gold - gold0} Scintille, ${r.memory.length} ricordi`;
    });
    await step('4. Ivo racconta ciò che ha visto di persona', async () => {
      await goTo('smith'); const text = await talk();
      assert.match(text, /Ivo ricorda/); assert.match(text, /l’ha visto di persona/);
      await shot('memoria-ivo');
      await close();
    });
    await step('5. Ricarica della pagina e «Continua il viaggio»: i ricordi e l’opinione restano', async () => {
      const before = await page.evaluate(() => JSON.stringify(Game.s.memory));
      await page.reload(); await tick(5);
      await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]');
      if (await resume.count()) { await resume.first().click(); await tick(3); }
      await page.evaluate(() => { if (UI.panel) UI.close(); __tick(4); });
      const after = await page.evaluate(() => JSON.stringify(Game.s?.memory));
      assert.equal(after, before);
      await goTo('merchant'); const text = await talk();
      assert.match(text, /Ti stima/); assert.match(text, /Giorno 1/);
      await close();
      return after.length + ' byte ripristinati';
    });
    await step('6. Il tempo passa: «Dormi fino alle 06:00» alla locanda; a emporio chiuso Tessa consegna la pozione messa da parte, una volta', async () => {
      await page.evaluate(() => { const inn = Tradecraft.inn; Object.assign(Game.s.player, { x: inn.x, y: inn.y + 14 }); __tick(4); });
      await page.keyboard.press('n'); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' });
      await page.locator('#dialog button', { hasText: 'Dormi fino alle 06:00' }).first().click(); await tick(5);
      const time = await page.evaluate(() => { const v = Calendar.view(Game.s.calendar, Game.s.time, 'valley'); return { day: Calendar.absoluteDays(Game.s.calendar, Game.s.time), open: v.shopOpen }; });
      assert.equal(time.day, 1); assert.equal(time.open, false);
      await close();
      await goTo('merchant'); await talk();
      const potions = await page.evaluate(() => Game.s.player.potions);
      await click('Ritira');
      await page.waitForFunction(() => /pozione che aveva messo da parte/.test(__toasts.join('|')), null, { timeout: 9000 }).catch(() => {});
      const r = await page.evaluate(() => ({ potions: Game.s.player.potions, toast: __toasts.join(' | ') }));
      assert.equal(r.potions, potions + 1); assert.match(r.toast, /pozione che aveva messo da parte/);
      const text = await page.locator('#dialog').innerText();
      assert.match(text, /Già ritirata oggi/);
      await shot('memoria-riserva');
      await close();
      return 'giorno 2, emporio chiuso, pozioni ' + potions + '→' + r.potions;
    });
    await step('7. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 7 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
