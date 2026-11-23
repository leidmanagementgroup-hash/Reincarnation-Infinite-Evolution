// Prova nel browser del feedback di progressione (RPG Evolution, incremento 3).
// Uso:   node tests/prova-browser-progressione.cjs [Reincarnation.html]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Controlla: coda dei messaggi (più messaggi nello stesso istante si vedono tutti, in ordine, senza doppioni); evoluzione per
// la via reale con il messaggio della nuova tecnica e del suo tasto e l'avviso «Nuova forma · nome · V»; pannello V con
// l'avanzamento per ogni via della condizione e «Pronta: avverrà alla fine dello scontro» quando un boss è ingaggiato;
// soglie dell'innata nel pannello K; barra rapida aggiornata quando una tecnica evolve alla maestria 4; nessun errore JS.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = path.resolve(process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html'));
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 260)); }
};
const INIT = () => {
  let queue = [], id = 0, now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(now); } };
  window.__newGame = race => {
    let cum = 0; for (const r of Game.races) { if (r.id === race) break; cum += r.weight; }
    const total = Game.races.reduce((a, r) => a + r.weight, 0), w = Game.races.find(r => r.id === race).weight, v = (cum + w / 2) / total;
    let n = 0; const r0 = Math.random; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : r0(); };
    try { Game.newGame(); } finally { Math.random = r0; }
    if (UI.panel) UI.close();
    return Game.s;
  };
  // Registro dei testi mostrati nel riquadro dei messaggi.
  window.__toasts = [];
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('toast');
    new MutationObserver(() => { const t = el.textContent; if (t && window.__toasts.at(-1) !== t) window.__toasts.push(t); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(INIT);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.goto(fileUrl(html));
    await page.evaluate(() => __tick(5));
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');

    await step('1. Coda dei messaggi: quattro messaggi nello stesso istante si vedono tutti, in ordine e senza doppioni', async () => {
      await page.evaluate(() => { __newGame('human'); __toasts.length = 0; for (const t of ['Primo', 'Secondo', 'Secondo', 'Terzo', 'Livello 2']) Game.onEvent('toast', t); });
      await page.waitForTimeout(9000);
      const seen = await page.evaluate(() => __toasts.slice());
      assert.deepEqual(seen, ['Primo', 'Secondo', 'Terzo', 'Livello 2']);
      return seen.join(' → ');
    });

    await step('2. Pannello V: avanzamento per ogni via della condizione', async () => {
      const text = await page.evaluate(() => { __newGame('slime'); UI.open('evolution'); const t = document.getElementById('panelBody').innerText; UI.close(); return t; });
      assert.match(text, /Basta una di queste vie/);
      assert.match(text, /Scontri vinti 0 \/ 3/); assert.match(text, /Pratiche di mestiere 0 \/ 5/); assert.match(text, /dal livello 3/);
      return 'Scontri 0/3 · Pratiche 0/5 · le due vie insieme';
    });

    await step('3. Evoluzione pronta durante un boss: il pannello dice che avverrà a fine scontro', async () => {
      const r = await page.evaluate(() => {
        const s = __newGame('slime'), p = s.player; s.quest = Math.max(s.quest, 2);
        Object.assign(p, { level: 2, kills: 3 }); p.inventory.essence = 3;
        const boss = s.monsters.find(m => m.type === 'boss'); Object.assign(boss, { x: p.x + 60, y: p.y, engaged: true, cd: 99 });
        UI.open('evolution'); const t = document.getElementById('panelBody').innerText; UI.close();
        return { t, stage: p.evolutionStage };
      });
      assert.equal(r.stage, 0); assert.match(r.t, /Pronta: avverrà alla fine dello scontro/);
    });

    await step('4. Evoluzione per la via reale: tecnica nuova con il suo tasto e avviso con il nome della forma', async () => {
      const r = await page.evaluate(() => {
        const s = Game.s, p = s.player, boss = s.monsters.find(m => m.type === 'boss');
        Object.assign(boss, { x: 4, y: 4, homeX: 4, homeY: 4, engaged: false });
        __toasts.length = 0;
        for (let i = 0; i < 60 && p.evolutionStage === 0; i++) __tick(1);
        __tick(10);
        return { stage: p.evolutionStage, form: Game.view({ detailed: false }).formName, alert: document.getElementById('evoAlert').textContent, hidden: document.getElementById('evoAlert').hidden };
      });
      await page.waitForTimeout(400);
      const toasts = await page.evaluate(() => __toasts.slice());
      assert.equal(r.stage, 1);
      assert.ok(toasts.some(t => /^Evoluzione · /.test(t) && /Nuova tecnica · .+ · (tasto \d|assegnala con K)/.test(t)), 'messaggio: ' + toasts.join(' | '));
      assert.equal(r.hidden, false); assert.equal(r.alert, 'Nuova forma · ' + r.form + ' · V');
      return toasts.find(t => /^Evoluzione/.test(t));
    });

    await step('5. Pannello K: soglie dell’innata (ramo, maestria, risonanza)', async () => {
      const text = await page.evaluate(() => { __newGame('human'); UI.open('skills'); const t = document.getElementById('panelBody').innerText; UI.close(); return t; });
      assert.match(text, /ramo a 5 utilizzi \(0 \/ 5\)/); assert.match(text, /maestria 2 a 4 utilizzi/); assert.match(text, /risonanza dopo il ramo/);
    });

    await step('6. Barra rapida aggiornata quando una tecnica evolve alla maestria 4', async () => {
      const r = await page.evaluate(() => {
        const s = __newGame('human'), p = s.player;
        p.skills['weave-storm'] = { ...(p.skills['weave-storm'] || {}), level: 1, uses: 0 }; p.slots[0] = 'weave-storm'; __tick(12);
        const before = document.querySelector('#hotbar button[data-action="skill1"]').title;
        p.skills['weave-storm'].level = 4; p.skills['weave-storm'].uses = 15; __tick(12);
        return { before, after: document.querySelector('#hotbar button[data-action="skill1"]').title, name: Game.activeSkill(p, 'weave-storm').name };
      });
      assert.notEqual(r.before, r.after); assert.equal(r.after, r.name + ' (1)');
      return r.before + ' → ' + r.after;
    });

    await step('7. Nessun errore JavaScript', async () => { assert.deepEqual(errors, [], errors.join(' | ')); });
    await context.close();
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
