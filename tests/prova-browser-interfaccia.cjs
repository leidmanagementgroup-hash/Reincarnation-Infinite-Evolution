// Prova nel browser di interfaccia, accessibilità ed esplorazione (RPG Evolution, incremento 5).
// Uso:   node tests/prova-browser-interfaccia.cjs [Reincarnation.html]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Controlla: bisogni nell'HUD solo quando penalizzano (con la gravità) e barra PE con etichetta accessibile; consigli «prima
// volta» mostrati una sola volta, solo con la Guida attiva, memorizzati fuori dal salvataggio; fuoco dei pannelli che non salta
// i <summary>; scheda attiva annunciata (aria-current); rombo della missione fermo con il movimento ridotto e mobile senza.
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
const INIT = guidance => {
  let queue = [], id = 0, now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(now); } };
  window.__toasts = [];
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('toast');
    new MutationObserver(() => { const t = el.textContent; if (t && window.__toasts.at(-1) !== t) window.__toasts.push(t); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  try { localStorage.setItem('lumora-guidance', guidance ? 'on' : 'off'); } catch {}
};
async function start(browser, guidance, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options });
  await context.addInitScript(INIT, guidance);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto(fileUrl(html));
  await page.evaluate(() => __tick(5));
  await page.click('#playBtn');
  await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
  await page.click('#dialog button[data-do="resume"]');
  await page.evaluate(() => { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; try { Game.newGame(); } finally { Math.random = r0; } if (UI.panel) UI.close(); __tick(12); });
  return { context, page, errors };
}
// Pixel di un piccolo riquadro della tela (coordinate del mondo) per confrontare due fotogrammi.
const CROP = ([x, y, w, h]) => {
  const f = document.getElementById('field'), p = Game.s.player;
  const camX = Math.round(Math.max(0, Math.min(World.width - f.width, p.x - f.width * .5))), camY = Math.round(Math.max(0, Math.min(World.height - f.height, p.y - f.height * .52)));
  const d = f.getContext('2d').getImageData(x - camX, y - camY, w, h).data; let h1 = 0; for (let i = 0; i < d.length; i++) h1 = (h1 * 31 + d[i]) >>> 0; return h1;
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  try {
    let run = await start(browser, false);
    let { page } = run;
    await step('1. Bisogni nell’HUD solo quando penalizzano, con la gravità; barra PE con etichetta', async () => {
      const r = await page.evaluate(() => {
        const d = Game.s.daily, read = () => { __tick(12); return [...document.querySelectorAll('#needs span')].map(e => e.textContent + (e.className ? '!' : '')).join(','); };
        const calm = read(); d.thirst = 20; const thirsty = read(); d.thirst = 5; d.energy = 25; const worse = read(); d.thirst = 90; d.energy = 90; const back = read();
        return { calm, thirsty, worse, back, xp: document.querySelector('.xp').getAttribute('aria-label') };
      });
      assert.equal(r.calm, ''); assert.equal(r.thirsty, 'Sete'); assert.equal(r.worse, 'Sete!,Stanchezza'); assert.equal(r.back, '');
      assert.match(r.xp, /^Esperienza \d+ su \d+$/);
      return `${r.thirsty} → ${r.worse} → (vuoto); ${r.xp}`;
    });
    await step('2. Consigli spenti quando la Guida è disattivata', async () => {
      const r = await page.evaluate(() => { __toasts.length = 0; Game.s.daily.thirst = 20; __tick(30); Game.s.daily.thirst = 90; return { toasts: __toasts.slice(), stored: localStorage.getItem('lumora-hints') }; });
      assert.ok(!r.toasts.some(t => /^Consiglio/.test(t)), r.toasts.join(' | ')); assert.equal(r.stored, null);
    });
    await step('3. Fuoco dei pannelli: Maiusc+Tab da un <summary> va all’elemento precedente, non salta in fondo', async () => {
      await page.evaluate(() => { UI.open('help'); const b = document.getElementById('panelBody'); b.insertAdjacentHTML('beforeend', '<button id="t1">A</button><details><summary id="t2">B</summary>x</details><button id="t3">C</button>'); document.getElementById('t2').focus(); });
      await page.keyboard.press('Shift+Tab');
      const id = await page.evaluate(() => document.activeElement?.id);
      await page.evaluate(() => UI.close());
      assert.equal(id, 't1');
      return 'fuoco su #' + id;
    });
    await step('4. Scheda attiva annunciata con aria-current', async () => {
      const r = await page.evaluate(() => { UI.open('evolution'); const a = [...document.querySelectorAll('#tabs button[aria-current="page"]')].map(b => b.textContent); UI.close(); return a; });
      assert.deepEqual(r, ['Evoluzioni']);
    });
    await run.context.close();

    run = await start(browser, true); page = run.page;
    await step('5. Consigli «prima volta» con la Guida attiva: una sola volta, fuori dal salvataggio', async () => {
      // Il registro non si azzera: la partita nasce accanto a Nerea e il consiglio «premi E» compare già alla prima schermata.
      const r = await page.evaluate(() => {
        Game.s.daily.thirst = 20; __tick(30); Game.s.daily.thirst = 90; __tick(30); Game.s.daily.thirst = 20; __tick(30); Game.s.daily.thirst = 90;
        const elder = World.points.elder; Object.assign(Game.s.player, { x: elder.x + 10, y: elder.y + 6 }); __tick(30);
        return { save: Game.exportSave() };
      });
      await page.waitForTimeout(6500);
      // Il consiglio conta come visto solo quando compare (incremento 6): il registro si legge dopo la fila dei messaggi.
      const toasts = await page.evaluate(() => __toasts.slice());
      r.stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lumora-hints') || '[]'));
      const needs = toasts.filter(t => /^Consiglio · fame, sete/.test(t)).length, interact = toasts.filter(t => /^Consiglio · premi E/.test(t)).length;
      assert.equal(needs, 1, 'consiglio dei bisogni ' + needs + ' volte'); assert.equal(interact, 1, 'consiglio di interazione ' + interact + ' volte: ' + toasts.join(' | '));
      assert.ok(r.stored.includes('needs') && r.stored.includes('interact'));
      assert.ok(!/lumora-hints|Consiglio/.test(r.save), 'consigli nel salvataggio');
      return r.stored.join(', ');
    });
    await step('5b. Consiglio scartato dalla fila piena: non segnato come visto, torna alla prossima occasione', async () => {
      const r = await page.evaluate(() => {
        // Fila piena: dietro al consiglio sul mana arrivano tre messaggi di livello (protetti), che lo fanno scartare.
        __toasts.length = 0; Game.onEvent('toast', 'Uno'); Game.onEvent('toast', 'Mana insufficiente: 3 su 10.');
        Game.onEvent('toast', 'Livello 2'); Game.onEvent('toast', 'Livello 3'); Game.onEvent('toast', 'Livello 4');
        return JSON.parse(localStorage.getItem('lumora-hints') || '[]');
      });
      assert.ok(!r.includes('mana'), 'consiglio sul mana segnato come visto senza comparire');
      await page.waitForTimeout(9000);
      const lost = await page.evaluate(() => ({ toasts: __toasts.slice(), stored: JSON.parse(localStorage.getItem('lumora-hints') || '[]') }));
      assert.ok(!lost.toasts.some(t => /^Consiglio · il mana/.test(t)), 'il consiglio doveva essere scartato: ' + lost.toasts.join(' | '));
      assert.ok(!lost.stored.includes('mana'), 'consiglio scartato ma registrato come visto');
      await page.evaluate(() => { __toasts.length = 0; Game.onEvent('toast', 'Mana insufficiente: 2 su 10.'); });
      await page.waitForTimeout(3600); // il messaggio sul mana resta 2,6 s, poi compare il consiglio
      const again = await page.evaluate(() => ({ toasts: __toasts.slice(), stored: JSON.parse(localStorage.getItem('lumora-hints') || '[]') }));
      assert.ok(again.toasts.some(t => /^Consiglio · il mana/.test(t)), again.toasts.join(' | '));
      assert.ok(again.stored.includes('mana'));
      return 'mostrato alla volta successiva e poi registrato';
    });
    await step('6. Nessun errore JavaScript', async () => { assert.deepEqual([...run.errors], [], run.errors.join(' | ')); });
    await run.context.close();

    // Rombo sopra Nerea: fermo con il movimento ridotto, mobile senza.
    const bob = async options => {
      const r = await start(browser, false, options);
      const v = await r.page.evaluate(CROP => {
        const crop = eval(CROP), elder = World.points.elder; Object.assign(Game.s.player, { x: elder.x, y: elder.y + 40 }); __tick(40);
        const box = [Math.round(elder.x) - 4, Math.round(elder.y) - 36, 9, 12], a = crop(box); __tick(23); const b = crop(box); __tick(23); const c = crop(box);
        return [a, b, c];
      }, CROP.toString());
      await r.context.close();
      return new Set(v).size;
    };
    await step('7. Rombo della missione fermo con il movimento ridotto, mobile senza', async () => {
      const still = await bob({ reducedMotion: 'reduce' }), moving = await bob({});
      assert.equal(still, 1, 'il rombo si muove con il movimento ridotto'); assert.ok(moving > 1, 'il rombo non si muove senza movimento ridotto');
      return 'fermo con reduce, ' + moving + ' posizioni senza';
    });
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
