// Prova end-to-end in Edge di «Gli attrezzi della squadra» (Living World 2.0, richiesta della gilda), con azioni reali
// dell'interfaccia. Colma la verifica che mancava in Edge (prima solo Node: verifica-richieste 7).
// Uso:   node tests/prova-browser-gilda-lw.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Sequenza (seme 19425, contesto isolato: nessuna partita reale toccata): bacheca del Registro degli avventurieri a Vela
// (tasto E, «Iscriviti») → diario: la richiesta non compare ancora (serve un fabbro Praticante) → mercato di Vela e due lame forgiate al
// banco di Ivo con il minigioco (mouse e clic; il minerale si compra vendendo pozioni e travi) → di nuovo alla bacheca, diario (L): «Accetta» → da Ivo «Ripara o incanta»,
// dettaglio del pezzo e «Ripara» due volte → bacheca, diario: «Riscuoti» (+24 Scintille, voce della forgia) → nessun doppio
// pagamento → ricarica della pagina. Preparazione dichiarata: prima di ogni riparazione la durabilità del pezzo viene
// consumata e arrivano il minerale e le Scintille della riparazione (l'usura vera richiederebbe molti combattimenti).
// Spostamenti fino alla bacheca, al banco e a Ivo: teletrasporti dichiarati.
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
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 400)); throw e; }
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
  const press = async (key = 'e') => { await page.keyboard.press(key); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' }); return page.locator('#dialog').innerText(); };
  const button = text => page.locator('#dialog button', { hasText: text }).first();
  const rowOf = name => page.locator('#dialog .row', { hasText: name }).first();
  const at = (x, y) => page.evaluate(([x, y]) => { Object.assign(Game.s.player, { x, y }); __tick(4); }, [x, y]);
  const toast = async re => { await page.waitForFunction(src => new RegExp(src).test(__toasts.join('|')), re.source, { timeout: 9000 }).catch(() => {}); return page.evaluate(() => __toasts.join(' | ')); };
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };
  const view = () => page.evaluate(() => Requests.view(Game.s).find(r => r.id === 'guild-tools'));
  const toBoard = async () => { const b = await page.evaluate(() => Guild.sites(Game.s).find(x => x.id === 'board').point); await at(b.x, b.y + 6); };
  const toIvo = async () => { const p = await page.evaluate(() => World.points.smith); await at(p.x + 12, p.y + 16); return press(); };
  async function forge() {
    await button('Lavora alla forgia').click(); await tick(2);
    let holding = false, last = -99, view;
    const heatBox = async () => page.locator('#dialog button[data-practice="heat"]').boundingBox();
    for (let frame = 0; frame < 3600; frame++) {
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

    await step('1. Bacheca del Registro degli avventurieri a Vela: tasto E, «Iscriviti»; la richiesta non c’è ancora: serve un fabbro Praticante', async () => {
      await toBoard(); await press();
      await button('Iscriviti').click(); await tick(3);
      assert.match(await toast(/Iscrizione ufficiale/), /Iscrizione ufficiale/); await close();
      const text = await press('l'); await close();
      assert.doesNotMatch(text, /Gli attrezzi della squadra/, 'una richiesta non disponibile compare nel diario'); // il diario elenca solo ciò che si può fare
      const v = await view(); assert.equal(v.state, 'closed'); assert.match(v.why, /fabbro almeno Praticante/);
      return v.why;
    });
    await step('2. Mestiere: minerale al mercato di Vela e due lame forgiate al banco di Ivo', async () => {
      const m = await page.evaluate(() => { const p = Economy.profiles.find(p => p.id === 'vela'); return { x: p.x, y: p.y }; });
      await at(m.x, m.y + 4); await press();
      // La Cappa usata resta nello zaino (servirà da riparare): per il minerale si vendono pozioni e travi di legno.
      for (const label of ['Vendi 1 Pozione di linfa', 'Vendi 1 Pozione di linfa', 'Vendi 1 Pozione di linfa', 'Vendi 1 Trave di legno', 'Vendi 1 Trave di legno']) {
        await page.locator(`#dialog button[aria-label="${label}"]`).click(); await tick(3);
      }
      for (let i = 0; i < 4; i++) { await page.locator('#dialog button[aria-label="Compra 1 Minerale lucente"]').click(); await tick(3); }
      assert(await page.evaluate(() => Inventory.quantity(Game.s, 'ore') >= 4n && Inventory.quantity(Game.s, 'gear-cloth') === 1n), 'minerale o Cappa mancanti');
      await close();
      for (let i = 0; i < 2; i++) {
        await at(503, 674); await press();
        if (await button('Forgia al banco di Ivo').count()) { await button('Forgia al banco di Ivo').click(); await tick(3); }
        else {
          await button('Pesca, forgia, orto e allevamento').click(); await tick(3);
          if (!(await button('Lavora alla forgia').count())) { await page.locator('#dialog .workshopTabs button', { hasText: /Forgia/ }).first().click(); await tick(3); }
        }
        const result = await forge(); assert(result?.success, 'forgiatura non riuscita: ' + JSON.stringify(result)); await close();
      }
      const level = await page.evaluate(() => Life.level(Game.s, 'smith')); assert(level >= 4, 'fabbro ' + level);
      return 'fabbro livello ' + level;
    });
    await step('3. Di nuovo alla bacheca: diario (L), «Accetta»', async () => {
      await toBoard();
      await press('l');
      await rowOf('Gli attrezzi della squadra').locator('button', { hasText: 'Accetta' }).click(); await tick(3);
      assert.match(await toast(/Richiesta accettata/), /Richiesta accettata · Gli attrezzi della squadra/);
      await close();
      assert.equal((await view()).state, 'active');
    });
    await step('4. Da Ivo: «Ripara o incanta», dettaglio del pezzo e «Ripara» due volte (lavori veri alla forgia)', async () => {
      const piece = await page.evaluate(() => Object.keys(Game.s.gear.items)[0]);
      assert(piece, 'nessun pezzo di equipaggiamento');
      const notes = [];
      // La Cappa usata è stata venduta per il minerale: al mercato di Vela si vende una lama forgiata e la si ricompra.
      if (await page.evaluate(id => Inventory.quantity(Game.s, id) === 0n, piece)) {
        const m = await page.evaluate(() => { const p = Economy.profiles.find(p => p.id === 'vela'); return { x: p.x, y: p.y }; });
        await at(m.x, m.y + 4); await press();
        await page.locator('#dialog button[aria-label^="Vendi 1 Lama"]:not([disabled])').first().click(); await tick(3);
        const name = await page.evaluate(id => Inventory.definition(Game.s, id).name, piece);
        await page.locator(`#dialog button[aria-label="Compra 1 ${name}"]`).click(); await tick(3);
        await close();
        assert.equal(await page.evaluate(id => String(Inventory.quantity(Game.s, id)), piece), '1', 'pezzo non ricomprato');
        notes.push('una lama venduta e la ' + name + ' ricomprata');
      }
      for (let i = 0; i < 2; i++) {
        // Preparazione dichiarata: usura del pezzo e materiali della riparazione.
        await page.evaluate(id => { Game.s.gear.items[id].current = 1; Inventory.add(Game.s, 'ore', 4); Game.s.player.gold += 40; __tick(2); }, piece);
        await toIvo();
        await button('Ripara o incanta').click(); await tick(3);
        await page.locator(`#dialog button[data-do="gear"][data-value="${piece}"]`).first().click(); await tick(3);
        const repair = page.locator('#dialog button[data-cmd="gear"]', { hasText: /^Ripara$/ }).first();
        assert.equal(await repair.isDisabled(), false, 'riparazione non disponibile: ' + (await page.locator('#dialog').innerText()).slice(0, 400));
        const before = await page.evaluate(id => Game.s.gear.items[id].current, piece);
        await repair.click(); await tick(3);
        const after = await page.evaluate(id => Game.s.gear.items[id].current, piece);
        assert(after > before, 'durabilità ' + before + '→' + after);
        notes.push('durabilità ' + before + '→' + after);
        if (i === 0) await shot('gilda-riparazione');
        await close();
      }
      const v = await view(); assert.equal(v.state, 'ready', JSON.stringify(v));
      return notes.join(' · ') + ' · richiesta pronta';
    });
    await step('5. Alla bacheca: diario, «Riscuoti» (+24 Scintille, voce della forgia); nessun doppio pagamento', async () => {
      await toBoard();
      await press('l');
      const g0 = await page.evaluate(() => Game.s.player.gold);
      await rowOf('Gli attrezzi della squadra').locator('button', { hasText: 'Riscuoti' }).click(); await tick(3);
      assert.match(await toast(/Richiesta completata/), /Richiesta completata · Gli attrezzi della squadra · \+24 Scintille/);
      const r = await page.evaluate(() => ({ gold: Game.s.player.gold, deeds: Game.s.renown.deeds.map(d => d.kind + '@' + d.market) }));
      assert.equal(r.gold, g0 + 24); assert(r.deeds.includes('craft@vela'), r.deeds.join(','));
      assert.equal(await rowOf('Gli attrezzi della squadra').locator('button', { hasText: 'Riscuoti' }).count(), 0);
      assert.equal((await view()).state, 'rest');
      await rowOf('Gli attrezzi della squadra').scrollIntoViewIfNeeded(); await shot('gilda-riscossa'); await close();
      return '+24 Scintille · imprese ' + r.deeds.join(', ');
    });
    await step('6. Ricarica della pagina: iscrizione, richiesta completata e voce restano', async () => {
      const snap = () => page.evaluate(() => JSON.stringify([Game.s.guild.joined, Game.s.requests, Game.s.renown, Game.s.player.gold]));
      const before = await snap();
      await page.evaluate(() => Game.save());
      await page.reload(); await tick(5);
      await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]');
      if (await resume.count()) { await resume.first().click(); await tick(3); }
      await close();
      assert.equal(await snap(), before);
    });
    await step('7. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 7 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
