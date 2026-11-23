// Prova end-to-end in Edge del ciclo del fabbro (Living World 2.0, incremento 2), con azioni reali dell'interfaccia.
// Uso:   node tests/prova-browser-mestieri.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Sequenza (seme 19425, contesto del browser isolato: nessuna partita reale toccata):
//   mercato di Vela: «Vendi 1» Cappa usata e «Compra 1» minerale ×4 → Ivo: «Forgia al banco di Ivo» → «Lavora alla forgia» e
//   minigioco giocato con mouse e clic (tenere premuto per scaldare, colpire nel ritmo, temprare) per due lame → viaggio fino al
//   Borgo dei Filoni da varco a varco (tasto E) → mercato dei Filoni: «Consegna la lama» all'Armeria del Passo (borsello, banco
//   e fama cambiano; taccuino con i prezzi di Vela) → ricarica della pagina: tutto resta → ordine già consegnato oggi.
// Gli spostamenti fino ai varchi e ai banchi sono teletrasporti dichiarati; tutte le azioni passano da tasti, mouse e pulsanti.
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
  const press = async () => { await page.keyboard.press('e'); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' }); };
  const button = text => page.locator('#dialog button', { hasText: text }).first();
  const at = (x, y) => page.evaluate(([x, y]) => { Object.assign(Game.s.player, { x, y }); __tick(4); }, [x, y]);
  const toMarket = async id => { const m = await page.evaluate(id => { const p = Economy.profiles.find(p => p.id === id); return { x: p.x, y: p.y }; }, id); await at(m.x, m.y + 4); await press(); };
  const toNpc = async id => { const p = await page.evaluate(id => World.points[id], id); await at(p.x + 12, p.y + 16); await press(); };
  const toast = async re => { await page.waitForFunction(src => new RegExp(src).test(__toasts.join('|')), re.source, { timeout: 9000 }).catch(() => {}); return page.evaluate(() => __toasts.join(' | ')); };
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };
  // Giocatore automatico della forgia: legge i misuratori e usa gli stessi pulsanti del giocatore (mouse premuto per scaldare).
  async function forge() {
    await button('Lavora alla forgia').click(); await tick(2);
    let holding = false, last = -99, frame = 0, view;
    const heatBox = async () => page.locator('#dialog button[data-practice="heat"]').boundingBox();
    for (; frame < 3600; frame++) {
      view = await page.evaluate(() => { __tick(1); const v = Game.practiceView(); if (!v) return null; const m = Object.fromEntries((v.meters || []).map(x => [x.id, x.value])); return { phase: v.phase, result: v.result, heat: m.heat, rhythm: m.rhythm }; });
      if (!view || view.result) break;
      if (view.phase === 'temper') {
        if (!holding && view.heat < .6) { const b = await heatBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); holding = true; }
        else if (holding && view.heat > .72) { await page.mouse.up(); holding = false; }
        else if (!holding && view.heat >= .58 && view.heat <= .79 && view.rhythm >= .76 && view.rhythm <= .96 && frame - last >= 18) { await page.locator('#dialog button[data-practice="strike"]').click(); last = frame; }
      } else if (view.phase === 'quench') {
        if (holding) { await page.mouse.up(); holding = false; }
        if (view.heat <= .44 && view.heat >= .28) await page.locator('#dialog button[data-practice="quench"]').click();
      }
    }
    if (holding) await page.mouse.up();
    return view?.result;
  }
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });

    await step('1. Mercato di Vela: «Vendi 1» Cappa usata e «Compra 1» minerale quattro volte', async () => {
      await toMarket('vela');
      await page.locator('#dialog button[aria-label="Vendi 1 Cappa usata"]').click(); await tick(3);
      for (let i = 0; i < 4; i++) { await page.locator('#dialog button[aria-label="Compra 1 Minerale lucente"]').click(); await tick(3); }
      const ore = await page.evaluate(() => String(Inventory.quantity(Game.s, 'ore')));
      assert(BigInt(ore) >= 4n, 'minerale ' + ore);
      await close();
      return 'minerale nel borsello ' + ore;
    });
    const blades = [];
    await step('2. Forgia reale al banco di Ivo: due lame con il minigioco giocato con mouse e clic', async () => {
      for (let i = 0; i < 2; i++) {
        // Fra Ivo e il Banco di Ivo (il banco va raggiunto entro 35 px): tasto E, poi «Forgia al banco di Ivo» se si apre il dialogo.
        // Vicino al Banco di Ivo il tasto E apre «Attività e mestieri»: poi «Pesca, forgia, orto e allevamento» e la scheda della forgia.
        await at(503, 674); await press();
        if (await button('Forgia al banco di Ivo').count()) { await button('Forgia al banco di Ivo').click(); await tick(3); }
        else {
          await button('Pesca, forgia, orto e allevamento').click(); await tick(3);
          if (!(await button('Lavora alla forgia').count())) { await page.locator('#dialog .workshopTabs button', { hasText: /Forgia/ }).first().click(); await tick(3); }
        }
        const result = await forge();
        assert(result?.success, 'forgiatura non riuscita: ' + JSON.stringify(result));
        blades.push(result.quality + ' ' + result.score);
        if (i === 0) await shot('forgia-risultato');
        await close();
      }
      const r = await page.evaluate(() => ({ level: Life.level(Game.s, 'smith'), bag: ['blade-0', 'blade-1', 'blade-2', 'blade-3'].map(id => String(Inventory.quantity(Game.s, id))) }));
      assert(r.level >= 4, 'livello del fabbro ' + r.level);
      return 'lame ' + blades.join(', ') + ' · fabbro livello ' + r.level + ' · borsello ' + r.bag.join('/');
    });
    await step('3. Viaggio fino al Borgo dei Filoni, varco dopo varco con il tasto E', async () => {
      const hops = [];
      for (let i = 0; i < 12; i++) {
        const gate = await page.evaluate(() => Game.s.region === 'frost-pass' ? null : World.route(Game.s.region, 'frost-pass', Game.s.campaign.stage));
        if (!gate) break;
        await at(gate.x, gate.y); await page.keyboard.press('e'); await tick(4);
        hops.push(await page.evaluate(() => Game.s.region));
      }
      assert.equal(await page.evaluate(() => Game.s.region), 'frost-pass');
      await page.evaluate(() => { const v = Calendar.view(Game.s.calendar, Game.s.time, Game.s.region); if (!v.shopOpen) Game.step(1 / 60, {}, ((600 - v.minutes + 1440) % 1440) * 1800 / 1440); __tick(4); });
      return hops.join(' → ');
    });
    await step('4. Mercato dei Filoni: «Consegna la lama» all’Armeria del Passo; borsello, banco e fama cambiano; taccuino con i prezzi di Vela', async () => {
      await toMarket('filoni');
      const text = await page.locator('#dialog').innerText();
      assert.match(text, /Armeria del Passo/); assert.match(text, /Taccuino del mercante/);
      const before = await page.evaluate(() => ({ gold: Game.s.player.gold, bench: ['blade-1', 'blade-2', 'blade-3'].reduce((n, id) => n + Number(Economy.quote(Game.s, 'filoni', id)?.stock || 0), 0) }));
      await shot('armeria-prima');
      await button('Consegna la lama').click(); await tick(3);
      const log = await toast(/Ordine dell’armeria consegnato/);
      const after = await page.evaluate(() => ({ gold: Game.s.player.gold, orders: Game.s.careers.smith.orders, bench: ['blade-1', 'blade-2', 'blade-3'].reduce((n, id) => n + Number(Economy.quote(Game.s, 'filoni', id)?.stock || 0), 0) }));
      assert.match(log, /Ordine dell’armeria consegnato/);
      assert(after.gold > before.gold); assert.equal(after.orders, 1); assert.equal(after.bench, before.bench + 1);
      const panel = await page.locator('#dialog').innerText();
      assert.match(panel, /Fabbro conosciuto ai Filoni/); assert.match(panel, /Hai già consegnato l’ordine di oggi/);
      await shot('armeria-dopo');
      await close();
      return `+${after.gold - before.gold} Scintille, lame sul banco ${before.bench}→${after.bench}`;
    });
    await step('5. Ricarica della pagina e «Continua il viaggio»: fama, banco e taccuino restano', async () => {
      const before = await page.evaluate(() => JSON.stringify(Game.s.careers));
      await page.reload(); await tick(5);
      await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]');
      if (await resume.count()) { await resume.first().click(); await tick(3); }
      await close();
      assert.equal(await page.evaluate(() => JSON.stringify(Game.s.careers)), before);
      await toMarket('filoni');
      assert.match(await page.locator('#dialog').innerText(), /Fabbro conosciuto ai Filoni/);
      await close();
    });
    await step('6. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 6 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
