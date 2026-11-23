// Prova in Edge dell'identità della stirpe (Living World 2.0, incremento 4), con azioni reali dell'interfaccia.
// Uso:   node tests/prova-browser-stirpi.cjs [Reincarnation.html] [cartella-scatti]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Per Slime, Goblin e Viverna (nuova partita con seme 19425 e la stirpe scelta dal sorteggio con un numero dato): tasto C →
// sezione «Identità della stirpe» con dono, attacco naturale, bisogni, verso l'evoluzione e «Che cosa ti offre la tua stirpe»;
// per lo Slime anche il dialogo di Tessa (tasto E) con la pozione al 67%. Contesto isolato: nessuna partita reale toccata.
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
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 320)); }
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
  const panelText = async key => { await page.keyboard.press(key); await tick(3); await page.locator('#dialog').waitFor({ state: 'visible' }); return page.locator('#dialog').innerText(); };
  try {
    await page.goto(fileUrl(html)); await tick(5);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    const as = race => page.evaluate(race => {
      let cum = 0; for (const r of Game.races) { if (r.id === race) break; cum += r.weight; }
      const total = Game.races.reduce((a, r) => a + r.weight, 0), w = Game.races.find(r => r.id === race).weight, v = (cum + w / 2) / total;
      const r0 = Math.random; let n = 0; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : .24; };
      try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); return Game.s.player.race;
    }, race);
    const expect = {
      slime: [/Una pozione ti cura il 67%/, /Fame ×0,46 \(54% in meno\)/, /Pozioni più efficaci/, /Viaggi con poche provviste/, /Sete e sbalzi di temperatura/, /non è ancora adulta/],
      goblin: [/1 Scintilla in più/, /Fendente dei rovi · portata 34 px/, /Mani svelte nella caccia/, /Destrezza e mestieri/, /Nessun vantaggio sui bisogni/, /Hobgoblin/],
      wyvern: [/\+5 velocità/, /Soffio di nevischio · portata 65 px/, /non riduce i tuoi/, /Soffio a distanza contro i boss/, /A tuo agio nel caldo/, /Il freddo ti colpisce di più/, /Freddo ×1,24/]
    };
    for (const race of ['slime', 'goblin', 'wyvern']) {
      await step(`${race}: tasto C, «Identità della stirpe» e «Che cosa ti offre la tua stirpe»`, async () => {
        assert.equal(await as(race), race);
        const text = await panelText('c');
        assert.match(text, /Identità della stirpe/); assert.match(text, /Che cosa ti offre la tua stirpe/);
        for (const re of expect[race]) assert.match(text, re);
        await page.locator('#dialog .sectionTitle', { hasText: 'Che cosa ti offre la tua stirpe' }).scrollIntoViewIfNeeded();
        if (shots) await page.screenshot({ path: path.join(shots, 'stirpe-' + race + '.png') });
        await close();
      });
    }
    await step('slime: dialogo di Tessa (tasto E) con la pozione al 67%', async () => {
      await as('slime');
      await page.evaluate(() => { const t = World.points.merchant; Object.assign(Game.s.player, { x: t.x + 12, y: t.y + 16 }); __tick(4); });
      const text = await panelText('e'); assert.match(text, /Per uno Slime cura il 67% della vitalità/); await close();
    });
    await step('Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails || results.length < 5 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
