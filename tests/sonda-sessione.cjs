// Sonda di sessione lunga nel browser: costo per fotogramma nel tempo, memoria, salvataggi e cambi di regione.
// Uso:   node tests/sonda-sessione.cjs <build.html> [altra-build.html ...] [--minutes 12] [--out file.json]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per Edge visibile (GPU).
// Ogni build gira in un contesto nuovo (salvataggi isolati, nessuna partita reale toccata). requestAnimationFrame è un orologio
// manuale: ogni fotogramma esegue davvero simulazione, mondo, effetti e interfaccia (1/60 s di gioco), con presentazione reale
// fra un fotogramma e l'altro. La partita (seme 19425, Demone) alterna esplorazione, combattimento con più nemici, tecniche,
// schivate e passaggi Valle → Vaelthoria → Valle; ogni minuto di gioco registra mediana/p95/massimo del fotogramma, la memoria
// JS (performance.memory) e la durata di un salvataggio completo. Così si vedono picchi in attacco, perdite di prestazioni nel
// tempo, crescita della memoria e costo dei salvataggi. Numeri casuali con seme: le build ricevono la stessa partita.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const minutes = Number(opt('minutes', 12));
const outFile = opt('out', '');
const builds = args.map(a => path.resolve(a));
if (!builds.length) { console.log('Uso: node tests/sonda-sessione.cjs <build.html> [altra.html] [--minutes 12] [--out file.json]'); process.exit(2); }

const INIT = () => {
  let queue = [], id = 0; window.__now = 1000; window.__realRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(window.__now); } };
  let seed = 7; window.__rng = v => { seed = v >>> 0; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
  window.__rng(7);
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};

async function run(file) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED, args: ['--enable-precise-memory-info'] });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('file:///' + file.split(path.sep).join('/'));
    await page.evaluate(() => __tick(5));
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    await page.evaluate(() => {
      let cum = 0; for (const r of Game.races) { if (r.id === 'demon') break; cum += r.weight; }
      const w = Game.races.find(r => r.id === 'demon').weight, v = (cum + w / 2) / 100;
      let n = 0; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : .24; };
      Game.newGame(); __rng(4242); if (UI.panel) UI.close(); Game.s.campaign.stage = Math.max(Game.s.campaign.stage, 1);
      // Movimento della sonda: il ciclo del gioco chiama Game.step con i tasti; qui si aggiunge la direzione scelta dalla sonda.
      const step0 = Game.step; Game.step = (d, input = {}, el) => step0(d, { ...input, ...(window.__input || {}) }, el);
      __tick(30);
    });
    const perMinute = [];
    for (let minute = 0; minute < minutes; minute++) {
      const r = await page.evaluate(async minute => {
        const s = Game.s, p = s.player, frames = [], t0all = performance.now();
        // Ogni minuto pari: combattimento nella valle con tre creature vicine; ogni minuto dispari: esplorazione con passaggio di regione.
        if (minute % 2 === 0) {
          if (s.region !== 'valley') { const g = World.route(s.region, 'valley', s.campaign.stage); if (g) { Object.assign(p, { x: g.x, y: g.y }); Game.action('interact'); } }
          if (UI.panel) UI.close();
          Object.assign(p, { x: 860, y: 700 });
          let k = 0; for (const m of s.monsters) if (m.hp > 0 && !Game.codex[m.type].boss && k < 3) { Object.assign(m, { x: p.x + 30 * Math.cos(k * 2.1), y: p.y + 30 * Math.sin(k * 2.1), homeX: p.x, homeY: p.y, engaged: true }); k++; }
        } else {
          const target = s.region === 'ancient-valley' ? 'valley' : 'ancient-valley', g = World.route(s.region, target, s.campaign.stage);
          if (g) { Object.assign(p, { x: g.x, y: g.y }); const t0 = performance.now(); Game.action('interact'); __tick(1); window.__enter = performance.now() - t0; }
          if (UI.panel) UI.close();
        }
        for (let i = 0; i < 3600; i++) {
          p.hp = Math.max(p.hp, 40); p.mp = Math.max(p.mp, 30);
          if (minute % 2 === 0) {
            if (i % 25 === 0) Game.action('attack');
            if (i % 90 === 40) Game.action('skill1');
            if (i % 150 === 75) Game.action('dash');
            if (i % 200 === 120) Game.action('innate');
            for (const m of s.monsters) if (m.hp <= 0 && Math.hypot(m.x - p.x, m.y - p.y) < 200) { m.hp = m.maxHp; m.dead = 0; }
          }
          const a = (i / 180) % (Math.PI * 2);
          window.__input = { x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) };
          if (i % 30 === 0) await new Promise(r => __realRAF(r));
          const t0 = performance.now(); __tick(1); frames.push(performance.now() - t0);
        }
        const t1 = performance.now(); const ok = Game.save(); const saveMs = performance.now() - t1;
        frames.sort((x, y) => x - y);
        const q = f => +frames[Math.min(frames.length - 1, Math.floor(frames.length * f))].toFixed(2);
        const mem = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
        return { minute, region: s.region, med: q(.5), p95: q(.95), p99: q(.99), max: +frames.at(-1).toFixed(1), over33: frames.filter(x => x > 33).length,
          heapMB: mem, saveMs: +saveMs.toFixed(1), saveKB: Math.round((localStorage.getItem('reincarnation.lumora.save.v7') || '').length / 1024), saved: ok,
          enterMs: window.__enter ? +window.__enter.toFixed(1) : null, wallS: +((performance.now() - t0all) / 1000).toFixed(1) };
      }, minute);
      perMinute.push(r);
      console.log(`${path.basename(file)} min ${String(minute + 1).padStart(2)} ${r.region.padEnd(15)} fotogramma ${r.med}/${r.p95}/${r.p99}/${r.max} ms, >33 ms: ${r.over33}, memoria ${r.heapMB} MB, salvataggio ${r.saveMs} ms (${r.saveKB} KB)${r.enterMs !== null && minute % 2 ? ', ingresso ' + r.enterMs + ' ms' : ''}`);
    }
    return { file, perMinute, errors };
  } finally { await browser.close(); }
}

(async () => {
  const all = [];
  for (const file of builds) all.push(await run(file));
  for (const r of all) if (r.errors.length) console.log('errori ' + path.basename(r.file) + ': ' + r.errors.slice(0, 3).join(' | '));
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(all, null, 1));
  process.exit(all.some(r => r.errors.length) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
