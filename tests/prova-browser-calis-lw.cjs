// Prova end-to-end in Edge dei contratti del Registro dei Carichi e di «Erbe per la cambusa» (Living World 2.0), con azioni
// reali dell'interfaccia. Colma la verifica che mancava in Edge (prima solo Node: verifica-mestieri 8, verifica-richieste 8).
// Uso:   node tests/prova-browser-calis-lw.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Sequenza (seme 19425, contesto isolato: nessuna partita reale toccata): mercato di Vela, tre scambi veri («Vendi 1» Cappa,
// «Compra 5» e «Compra 1» erbe) → mercante Praticante → viaggio fino al Porto di Calis varco dopo varco → mercato di Calis:
// «Registro dei Carichi», merce che manca comprata con «Compra 1» se serve, «Consegna il carico» (borsello, scorta, fama; il
// compenso resta sotto il costo d'acquisto) → se al porto le erbe non scarseggiano abbastanza, il giocatore le compra fino a
// creare la carenza → Registro dei Carichi nel quartiere del porto (tasto E, diario): «Erbe per la cambusa», «Accetta» e
// «Riscuoti» con 3 erbe → ricarica della pagina: contratto, richiesta e voce restano.
// Spostamenti fino ai varchi e ai banchi: teletrasporti dichiarati. Passare dei giorni: passo reale del motore (Game.step).
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
  const openShop = () => page.evaluate(() => { const v = Calendar.view(Game.s.calendar, Game.s.time, Game.s.region); if (!v.shopOpen) Game.step(1 / 60, {}, ((600 - v.minutes + 1440) % 1440) * 1800 / 1440); __tick(4); });
  const toMarket = async id => { const m = await page.evaluate(id => { const p = Economy.profiles.find(p => p.id === id); return { x: p.x, y: p.y }; }, id); await openShop(); await at(m.x, m.y + 4); return press(); };
  const gold = () => page.evaluate(() => Game.s.player.gold);
  const qty = id => page.evaluate(id => BigInt(Inventory.quantity(Game.s, id)).toString(), id).then(BigInt);
  const stock = id => page.evaluate(id => String(Economy.quote(Game.s, 'calis', id).stock), id).then(BigInt);
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
  const facts = {};
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });

    await step('1. Mercato di Vela: tre scambi veri, il mercante diventa Praticante', async () => {
      await toMarket('vela');
      await page.locator('#dialog button[aria-label="Vendi 1 Cappa usata"]').click(); await tick(3);
      await page.locator('#dialog button[aria-label="Compra 5 Erba di rugiada"]').click(); await tick(3);
      await page.locator('#dialog button[aria-label="Compra 1 Erba di rugiada"]').click(); await tick(3);
      await close();
      const level = await page.evaluate(() => Life.level(Game.s, 'merchant'));
      assert(level >= 4, 'mercante livello ' + level);
      return 'mercante livello ' + level + ', erbe ' + await qty('herb');
    });
    await step('2. Porto di Calis: «Consegna il carico» al Registro dei Carichi; il compenso resta sotto il costo d’acquisto', async () => {
      facts.hops = await travel('dune-port');
      let v = null;
      for (let d = 0; d < 8; d++) {
        v = await page.evaluate(() => Careers.view(Game.s, 'calis').cargo);
        if (v.good) break;
        await page.evaluate(() => { Game.step(1 / 60, {}, 1800); for (let i = 0; i < 90; i++) __tick(1); }); // un giorno con il passo del motore
      }
      assert(v?.good, 'a Calis non manca nulla');
      let text = await toMarket('calis');
      assert.match(text, /Registro dei Carichi/);
      const need = BigInt(v.size) - await qty(v.good);
      let spent = 0, prepared = 0n;
      if (need > 0n) {
        const name = await page.evaluate(id => Inventory.definition(Game.s, id).name, v.good);
        const buy = page.locator(`#dialog button[aria-label="Compra 1 ${name}"]`);
        for (let i = 0n; i < need && await buy.count() && !(await buy.isDisabled()); i++) { const g = await gold(); await buy.click(); await tick(3); spent += g - await gold(); }
        // Se il borsello non basta a comprarla qui, la merce arriva come preparazione dichiarata («raccolta altrove»).
        prepared = BigInt(v.size) - await qty(v.good);
        if (prepared > 0n) await page.evaluate(([id, n]) => { Inventory.add(Game.s, id, BigInt(n)); __tick(2); }, [v.good, String(prepared)]);
        await close(); await toMarket('calis');
      }
      text = await page.locator('#dialog').innerText();
      v = await page.evaluate(() => Careers.view(Game.s, 'calis').cargo);
      assert.equal(v.available, true, v.why);
      const g0 = await gold(), s0 = await stock(v.good);
      await shot('calis-registro-prima');
      await button('Consegna il carico').click(); await tick(3);
      const log = await toast(/Contratto consegnato/);
      assert.match(log, /Contratto consegnato · \d+ /);
      const g1 = await gold(), s1 = await stock(v.good);
      assert.equal(g1 - g0, v.pay); assert.equal(s1, s0 + BigInt(v.size));
      if (spent && !prepared) assert(v.pay < spent, `compenso ${v.pay} contro ${spent} spese per comprare la merce qui`);
      assert.equal(await page.evaluate(() => Game.s.careers.merchant.contracts), 1);
      assert.deepEqual(await page.evaluate(() => Game.s.renown.deeds.map(d => d.kind + '@' + d.market)), ['commerce@calis']);
      assert.equal(await button('Consegna il carico').isDisabled(), true, 'secondo contratto nello stesso giorno');
      await shot('calis-registro-dopo'); await close();
      return `${facts.hops} · ${v.size} ${v.goodName} · +${v.pay} Scintille${spent ? ' (merce comprata qui per ' + spent + ')' : ''}${prepared ? ' (' + prepared + ' unità aggiunte come preparazione dichiarata)' : ''} · scorta ${s0}→${s1}`;
    });
    await step('3. Erbe per la cambusa: carenza reale di erbe al porto (creata dagli acquisti del giocatore se serve)', async () => {
      let short = await page.evaluate(() => Economy.shortage(Game.s, 'calis', 'herb')), bought = 0, spent = 0;
      if (short < .4) {
        await toMarket('calis');
        for (let i = 0; i < 12 && short < .4; i++) {
          const g = await gold(); await page.locator('#dialog button[aria-label="Compra 1 Erba di rugiada"]').click(); await tick(3);
          spent += g - await gold(); bought++;
          short = await page.evaluate(() => Economy.shortage(Game.s, 'calis', 'herb'));
        }
        await close();
      }
      assert(short >= .4, 'carenza ' + short);
      facts.herbSpent = spent; facts.herbBought = bought;
      return `carenza ${Math.round(short * 100)}%` + (bought ? `, ${bought} erbe comprate al porto per ${spent} Scintille` : '');
    });
    await step('4. Registro dei Carichi nel quartiere del porto (tasto E): «Accetta» e «Riscuoti» con 3 erbe', async () => {
      await travel('city-calis');
      const desk = await page.evaluate(() => UrbanWorld.site(Game.s, 'cargo-board').point);
      await at(desk.x, desk.y + 4);
      let text = await press();
      assert.match(text, /Erbe per la cambusa/);
      await rowOf('Erbe per la cambusa').locator('button', { hasText: 'Accetta' }).click(); await tick(3);
      assert.match(await toast(/Richiesta accettata/), /Richiesta accettata · Erbe per la cambusa/);
      text = await page.locator('#dialog').innerText();
      const herbs0 = await qty('herb'), s0 = await stock('herb'), g0 = await gold();
      assert(herbs0 >= 3n, 'erbe ' + herbs0);
      const pay = await page.evaluate(() => Requests.view(Game.s).find(r => r.id === 'galley-herbs').reward);
      await rowOf('Erbe per la cambusa').locator('button', { hasText: 'Riscuoti' }).click(); await tick(3);
      assert.match(await toast(/Richiesta completata/), /Richiesta completata · Erbe per la cambusa · \+\d+ Scintille · Le navi partono con la cambusa piena/);
      assert.equal(await gold(), g0 + pay); assert.equal(await qty('herb'), herbs0 - 3n); assert.equal(await stock('herb'), s0 + 3n);
      assert(pay <= 16, 'compenso ' + pay);
      if (facts.herbBought >= 3) assert(pay < facts.herbSpent, `compenso ${pay} contro ${facts.herbSpent} spese per le erbe del porto`);
      assert.equal(await rowOf('Erbe per la cambusa').locator('button', { hasText: 'Riscuoti' }).count(), 0, 'riscuotibile due volte');
      await rowOf('Erbe per la cambusa').scrollIntoViewIfNeeded(); await shot('calis-cambusa'); await close();
      return `+${pay} Scintille · erbe ${herbs0}→${herbs0 - 3n} · scorta del porto ${s0}→${s0 + 3n}`;
    });
    await step('5. Ricarica della pagina: contratto, richiesta e voce restano', async () => {
      const snap = () => page.evaluate(() => JSON.stringify([Game.s.careers, Game.s.requests, Game.s.renown, Game.s.player.gold]));
      const before = await snap();
      await page.evaluate(() => Game.save());
      await page.reload(); await tick(5);
      await page.click('#playBtn'); await tick(5);
      const resume = page.locator('#dialog button[data-do="resume"]');
      if (await resume.count()) { await resume.first().click(); await tick(3); }
      await close();
      assert.equal(await snap(), before);
    });
    await step('6. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } catch { /* già registrato */ } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 6 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
