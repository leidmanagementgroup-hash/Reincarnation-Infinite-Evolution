// Scenario finale end-to-end in Edge (Living World 2.0, incremento 6), con azioni reali dell'interfaccia e un seme fisso.
// Uso:   node tests/prova-browser-scenario.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Catena (seme 19425, contesto del browser isolato: nessuna partita reale toccata):
//   nuova partita → mestiere: minerale comprato al mercato di Vela e due lame forgiate al banco di Ivo con il minigioco (mouse
//   e clic) → fabbro Praticante → viaggio ai Filoni varco dopo varco → mercato: «Consegna la lama» all'Armeria del Passo →
//   il mondo registra (ordine, banco, notizia che parte da Nordharyn) → ritorno a Vela: Ivo NON lo sa ancora → nuova
//   opportunità: Ivo chiede lana (richiesta del mondo) → incarico accettato, lana comprata, «Riscuoti» → reputazione e
//   relazione con Ivo cambiano → notti alla locanda: la voce da Nordharyn arriva a Ivo il giorno giusto → «Salva partita» dal
//   menu → ricarica della pagina e «Continua il viaggio»: tutto resta → dieci giorni dopo: i ricordi si attenuano, nulla si
//   ripete, nessun doppio pagamento.
// Gli spostamenti fino ai varchi, ai banchi e agli NPC sono teletrasporti dichiarati; tutte le azioni passano da tasti, mouse
// e pulsanti. Il passare del tempo usa il sonno alla locanda e, per i dieci giorni finali, il passo reale del motore.
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
  const toMarket = async id => { const m = await page.evaluate(id => { const p = Economy.profiles.find(p => p.id === id); return { x: p.x, y: p.y }; }, id); await at(m.x, m.y + 4); return press(); };
  const toIvo = async () => { const p = await page.evaluate(() => World.points.smith); await at(p.x + 12, p.y + 16); return press(); };
  const toast = async re => { await page.waitForFunction(src => new RegExp(src).test(__toasts.join('|')), re.source, { timeout: 9000 }).catch(() => {}); return page.evaluate(() => __toasts.join(' | ')); };
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };
  const day = () => page.evaluate(() => Calendar.absoluteDays(Game.s.calendar, Game.s.time) + 1);
  const ivoMemory = () => page.evaluate(() => Game.s.memory.episodes.filter(e => e.npc === 'smith').map(e => e.kind + ':' + e.source));
  const ivoOpinion = () => page.evaluate(() => Math.round(WorldMemory.opinion(Game.s, 'smith') * 100) / 100);
  const snapshot = () => page.evaluate(() => JSON.stringify({ gold: Game.s.player.gold, memory: Game.s.memory, careers: Game.s.careers, requests: Game.s.requests,
    renown: Game.s.renown, reputation: Game.s.reputation, bag: ['ore', 'wool', 'herb', 'blade-0', 'blade-1', 'blade-2', 'blade-3'].map(id => String(Inventory.quantity(Game.s, id))).join('/'), region: Game.s.region }));
  async function travel(target) {
    const hops = [];
    for (let i = 0; i < 14; i++) {
      const gate = await page.evaluate(t => Game.s.region === t ? null : World.route(Game.s.region, t, Game.s.campaign.stage), target);
      if (!gate) break;
      await at(gate.x, gate.y); await page.keyboard.press('e'); await tick(4);
      hops.push(await page.evaluate(() => Game.s.region));
    }
    assert.equal(await page.evaluate(() => Game.s.region), target);
    return hops.join(' → ');
  }
  async function sleepAtInn() {
    await page.evaluate(() => { const inn = Tradecraft.inn; Object.assign(Game.s.player, { x: inn.x, y: inn.y + 14 }); __tick(4); });
    await press('n'); await button('Dormi fino alle 06:00').click(); await tick(5); await close();
    await page.evaluate(() => { Game.step(1 / 60, {}, 600); for (let i = 0; i < 90; i++) __tick(1); }); // la mattina passa: il giorno è avviato
  }
  // Giocatore automatico della forgia (come tests/prova-browser-mestieri.cjs): legge i misuratori e usa gli stessi pulsanti.
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
  const facts = {};
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });

    await step('1. Nuova partita: nessun ricordo, nessuna voce, fabbro alle prime armi', async () => {
      const r = await page.evaluate(() => ({ episodes: Game.s.memory.episodes.length, deeds: Game.s.renown.deeds.length, smith: Life.level(Game.s, 'smith'), day: Calendar.absoluteDays(Game.s.calendar, Game.s.time) + 1 }));
      assert.equal(r.episodes, 0); assert.equal(r.deeds, 0); assert(r.smith < 4, 'fabbro ' + r.smith);
      facts.opinion0 = await ivoOpinion();
      return `giorno ${r.day}, fabbro livello ${r.smith}, opinione di Ivo ${facts.opinion0}`;
    });
    await step('2. Mestiere: minerale al mercato di Vela e due lame forgiate al banco di Ivo (minigioco con mouse e clic)', async () => {
      await toMarket('vela');
      await page.locator('#dialog button[aria-label="Vendi 1 Cappa usata"]').click(); await tick(3);
      for (let i = 0; i < 4; i++) { await page.locator('#dialog button[aria-label="Compra 1 Minerale lucente"]').click(); await tick(3); }
      await close();
      const blades = [];
      for (let i = 0; i < 2; i++) {
        await at(503, 674); await press();
        if (await button('Forgia al banco di Ivo').count()) { await button('Forgia al banco di Ivo').click(); await tick(3); }
        else {
          await button('Pesca, forgia, orto e allevamento').click(); await tick(3);
          if (!(await button('Lavora alla forgia').count())) { await page.locator('#dialog .workshopTabs button', { hasText: /Forgia/ }).first().click(); await tick(3); }
        }
        const result = await forge();
        assert(result?.success, 'forgiatura non riuscita: ' + JSON.stringify(result));
        blades.push(result.quality); await close();
      }
      const level = await page.evaluate(() => Life.level(Game.s, 'smith'));
      assert(level >= 4, 'livello del fabbro ' + level);
      await shot('scenario-1-forgia');
      return 'lame ' + blades.join(', ') + ' · fabbro livello ' + level;
    });
    await step('3. Viaggio ai Filoni e «Consegna la lama» all’Armeria del Passo: il mondo registra', async () => {
      const hops = await travel('frost-pass');
      await page.evaluate(() => { const v = Calendar.view(Game.s.calendar, Game.s.time, Game.s.region); if (!v.shopOpen) Game.step(1 / 60, {}, ((600 - v.minutes + 1440) % 1440) * 1800 / 1440); __tick(4); });
      await toMarket('filoni');
      const before = await page.evaluate(() => ({ gold: Game.s.player.gold, bench: ['blade-1', 'blade-2', 'blade-3'].reduce((n, id) => n + Number(Economy.quote(Game.s, 'filoni', id)?.stock || 0), 0) }));
      await button('Consegna la lama').click(); await tick(3);
      const log = await toast(/Ordine dell’armeria consegnato/);
      const after = await page.evaluate(() => ({ gold: Game.s.player.gold, orders: Game.s.careers.smith.orders, deeds: Game.s.renown.deeds.map(d => d.kind + '@' + d.market),
        bench: ['blade-1', 'blade-2', 'blade-3'].reduce((n, id) => n + Number(Economy.quote(Game.s, 'filoni', id)?.stock || 0), 0) }));
      assert.match(log, /Ordine dell’armeria consegnato/);
      assert(after.gold > before.gold); assert.equal(after.orders, 1); assert.equal(after.bench, before.bench + 1);
      assert.deepEqual(after.deeds, ['craft@filoni']);
      // Secondo clic nello stesso giorno: nessun doppio pagamento.
      const again = await button('Consegna la lama').count() ? await button('Consegna la lama').isDisabled() : true;
      assert.equal(again, true, 'seconda consegna possibile nello stesso giorno');
      await shot('scenario-2-armeria'); await close();
      facts.deliveryDay = await day(); facts.armoryPay = after.gold - before.gold;
      return `${hops} · +${facts.armoryPay} Scintille · lame sul banco ${before.bench}→${after.bench} · giorno ${facts.deliveryDay}`;
    });
    await step('4. Ritorno a Vela: Ivo non sa ancora nulla della lama (la voce è in viaggio)', async () => {
      const hops = await travel('valley');
      assert.deepEqual(await ivoMemory(), []);
      const text = await press('l'); await close();
      const voices = text.slice(text.indexOf('Voci dai continenti'));
      assert.match(voices, /Nordharyn · Se ne parla/);
      assert.match(voices, new RegExp('In viaggio: «Ha rifornito l’Armeria del Passo con una lama[^»]*» arriverà il giorno ' + (facts.deliveryDay + 2)));
      return hops + ' · voce attesa a Vela il giorno ' + (facts.deliveryDay + 2);
    });
    await step('5. Nuova opportunità: Ivo chiede lana; incarico accettato, lana comprata e consegnata con «Riscuoti»', async () => {
      let text = await toIvo();
      assert.match(text, /Lana per le mantelle d’inverno/);
      await rowOf('Lana per le mantelle').locator('button', { hasText: 'Accetta' }).click(); await tick(3);
      assert.match(await toast(/Richiesta accettata/), /Richiesta accettata · Lana per le mantelle/); await close();
      await toMarket('vela');
      for (let i = 0; i < 2; i++) { await page.locator('#dialog button[aria-label="Compra 1 Lana"]').click(); await tick(3); }
      await close();
      const before = await page.evaluate(() => ({ gold: Game.s.player.gold, rep: Game.s.reputation.standings['faction:lanterns'] || 0, stock: Economy.quote(Game.s, 'vela', 'wool').stock }));
      text = await toIvo();
      await rowOf('Lana per le mantelle').locator('button', { hasText: 'Riscuoti' }).click(); await tick(3);
      const log = await toast(/Richiesta completata/);
      const after = await page.evaluate(() => ({ gold: Game.s.player.gold, rep: Game.s.reputation.standings['faction:lanterns'] || 0, stock: Economy.quote(Game.s, 'vela', 'wool').stock, wool: String(Inventory.quantity(Game.s, 'wool')) }));
      assert.match(log, /Richiesta completata · Lana per le mantelle d’inverno · \+\d+ Scintille/);
      assert(after.gold > before.gold); assert.equal(after.wool, '0'); assert.equal(BigInt(after.stock), BigInt(before.stock) + 2n);
      assert.equal(after.rep, before.rep + 2, 'reputazione delle Lanterne');
      // Nessun doppio pagamento: il pulsante non c'è più.
      assert.equal(await rowOf('Lana per le mantelle').locator('button', { hasText: 'Riscuoti' }).count(), 0);
      assert.deepEqual((await ivoMemory()).filter(k => k.startsWith('heard')), []);
      facts.opinionAfterRequest = await ivoOpinion(); facts.requestPay = after.gold - before.gold;
      await shot('scenario-3-ivo'); await close();
      return `+${facts.requestPay} Scintille · Lanterne ${before.rep}→${after.rep} · lana a Vela ${before.stock}→${after.stock} · opinione di Ivo ${facts.opinion0}→${facts.opinionAfterRequest}`;
    });
    await step('6. Notti alla locanda: la voce da Nordharyn arriva a Ivo il giorno giusto, non prima', async () => {
      const arrive = facts.deliveryDay + 2, seen = [];
      for (let i = 0; i < 4 && (await day()) < arrive; i++) {
        await sleepAtInn();
        const d = await day(), heard = (await ivoMemory()).includes('heard-praise:rumor');
        seen.push(d + (heard ? ' sì' : ' no'));
        if (d < arrive) assert.equal(heard, false, 'Ivo sa della lama prima che arrivi la voce (giorno ' + d + ')');
      }
      assert.equal(await day(), arrive);
      assert((await ivoMemory()).includes('heard-praise:rumor'), 'voce non arrivata');
      facts.opinionAfterRumor = await ivoOpinion();
      assert(facts.opinionAfterRumor > facts.opinionAfterRequest - .2, 'opinione dopo la voce');
      const text = await toIvo();
      assert.match(text, /per sentito dire/);
      await page.locator('#dialog .row', { hasText: 'per sentito dire' }).first().scrollIntoViewIfNeeded();
      await shot('scenario-4-voce'); await close();
      return 'giorni ' + seen.join(', ') + ' · opinione di Ivo ' + facts.opinionAfterRumor;
    });
    await step('7. «Salva partita» dal menu, ricarica della pagina e «Continua il viaggio»: tutto resta', async () => {
      await page.keyboard.press('Escape'); await tick(3);
      await button('Salva partita').click(); await tick(3);
      assert.match(await toast(/Partita salvata/), /Partita salvata/);
      await close();
      const before = await snapshot();
      await page.reload(); await tick(5);
      await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]');
      if (await resume.count()) { await resume.first().click(); await tick(3); }
      await close();
      assert.equal(await snapshot(), before);
      const text = await toIvo(); assert.match(text, /per sentito dire/); await close();
      return 'salvataggio ' + (await page.evaluate(() => Math.round((localStorage.getItem('reincarnation.lumora.save.v7') || '').length / 1024))) + ' KB';
    });
    await step('8. Dieci giorni dopo: i ricordi si attenuano, la voce resta una sola, niente si paga due volte', async () => {
      const before = await page.evaluate(() => ({ gold: Game.s.player.gold, episodes: Game.s.memory.episodes.length, claimed: JSON.stringify(Game.s.requests.claimed), orders: Game.s.careers.smith.orders, nord: Renown.view(Game.s).find(v => v.market === 'filoni').score }));
      for (let i = 0; i < 10; i++) await sleepAtInn();
      const after = await page.evaluate(() => ({ gold: Game.s.player.gold, episodes: Game.s.memory.episodes.length, heard: Game.s.memory.episodes.filter(e => e.kind === 'heard-praise').length, claimed: JSON.stringify(Game.s.requests.claimed), orders: Game.s.careers.smith.orders, nord: Renown.view(Game.s).find(v => v.market === 'filoni').score }));
      const opinion = await ivoOpinion();
      assert.equal(after.heard, 1); assert.equal(after.orders, before.orders); assert.equal(after.claimed, before.claimed);
      assert(after.gold <= before.gold, 'Scintille comparse dal nulla: ' + before.gold + '→' + after.gold);
      assert(opinion < facts.opinionAfterRumor, 'l’opinione non si attenua'); assert(opinion > 0, 'l’opinione è sparita');
      assert(after.nord < before.nord, 'la fama non si attenua');
      return `giorno ${await day()} · opinione di Ivo ${facts.opinionAfterRumor}→${opinion} · fama a Nordharyn ${before.nord}→${after.nord} · Scintille ${before.gold}→${after.gold}`;
    });
    await step('9. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 9 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
