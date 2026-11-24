// Prova in Edge (BUG-012): un fotogramma che arriva dopo una lunga sospensione (senza blur né visibilitychange, es. il computer
// in sospensione) non deve far saltare il calendario; con fotogrammi normali e lenti il tempo scorre come prima.
// Uso:   node tests/prova-browser-tempo.cjs [percorso/Reincarnation.html]     (PW_CORE come in tests/prova-browser.cjs)
// Il ciclo di gioco riceve i tempi da requestAnimationFrame: la prova sostituisce solo quella funzione (nessuna modifica al gioco)
// per decidere il tempo di ogni fotogramma.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = path.resolve(process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html'));
const url = 'file:///' + html.replace(/\\/g, '/');
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).split('\n')[0]); }
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: process.env.PW_HEADED ? false : true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.addInitScript(() => {
      window.__manual = false; window.__queue = [];
      const real = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = f => window.__manual ? (window.__queue.push(f), window.__queue.length) : real(f);
      // Un fotogramma: tutte le chiamate in coda con lo stesso istante (millisecondi), come il browser.
      window.__tick = ts => { const q = window.__queue.splice(0); for (const f of q) f(ts); };
      window.__minutes = () => Calendar.timestamp(Game.s.calendar, Game.s.time);
      window.__clock = () => ({ minutes: window.__minutes(), time: Game.s.time });
    });
    await page.goto(url); await page.waitForTimeout(800);
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]'); await page.waitForTimeout(600);
    // Da qui i fotogrammi li decide la prova.
    const base = await page.evaluate(() => { window.__manual = true; return performance.now(); });
    await page.waitForTimeout(150);
    let now = base + 200;
    const frames = (n, stepMs) => page.evaluate(([from, count, ms]) => { let t = from; for (let i = 0; i < count; i++) { t += ms; window.__tick(t); } return t; }, [now, n, stepMs]).then(t => { now = t; });
    const clock = () => page.evaluate(() => window.__clock());

    await step('1. Fotogrammi normali (60 fps): il calendario avanza con il tempo reale (0,8 minuti al secondo)', async () => {
      await frames(30, 16.667); const a = await clock();
      await frames(300, 16.667); const b = await clock();
      const gained = b.minutes - a.minutes;
      assert(Math.abs(gained - 5 * .8) < .2, '5 secondi = 4 minuti di calendario; misurati ' + gained.toFixed(2));
      return gained.toFixed(2) + ' minuti in 5 s';
    });
    await step('2. Fotogrammi lenti (10 fps): il comportamento attuale resta (il calendario segue il tempo reale)', async () => {
      const a = await clock(); await frames(20, 100); const b = await clock();
      const gained = b.minutes - a.minutes;
      assert(gained > 1.4 && gained < 1.8, '2 secondi reali = 1,6 minuti; misurati ' + gained.toFixed(2));
      return gained.toFixed(2) + ' minuti in 2 s';
    });
    await step('3. Un fotogramma dopo un’ora di sospensione non fa saltare il calendario (meno di 5 minuti)', async () => {
      const a = await clock();
      await page.evaluate(t => window.__tick(t), now + 3600 * 1000); now += 3600 * 1000;
      const b = await clock();
      const jump = b.minutes - a.minutes;
      assert(jump < 5, 'il calendario è saltato di ' + jump.toFixed(0) + ' minuti');
      await frames(30, 16.667);
      const c = await clock();
      assert(c.minutes - b.minutes < 2, 'dopo la sospensione il calendario continua a saltare');
      return `salto di ${jump.toFixed(2)} minuti invece di 2880`;
    });
    await step('4. Nessun errore in console', async () => { assert.deepEqual(errors, []); });
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} prove fallite su ${results.length}` : `Tutte le ${results.length} prove superate`);
  process.exit(fails ? 1 : 0);
})();
