// Prova nel browser degli effetti di combattimento (combat-fx.js, fase 4 C).
// Uso:   node tests/prova-browser-combattimento.cjs [Reincarnation.html]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs); PW_HEADED=1 per vedere la finestra.
// Controlla: tabelle degli elementi complete (44 stirpi, tutti i mostri); ogni elemento produce il proprio impatto con le
// vere azioni del gioco; cambio di fase di un boss, sconfitta, schivata ed evoluzione; logica identica con e senza effetti
// (stesse posizioni, vitalità, ricariche e stessa quantità di numeri casuali consumati); ordine di disegno (decorazioni sotto
// gli avvisi di pericolo, numeri sopra a tutto); effetti ridotti (prefers-reduced-motion e opzione del gioco); salvataggio
// senza dati degli effetti, ricarica e "Continua il viaggio"; nessun errore JavaScript.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const html = path.resolve(process.argv[2] || path.join(__dirname, '..', 'Reincarnation.html'));
const fileUrl = p => 'file:///' + p.split(path.sep).join('/');
const results = [];
const step = async (name, fn) => {
  try { const note = await fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).split('\n')[0]); }
};
// Strumenti nella pagina: orologio manuale (la simulazione avanza solo quando lo chiede la prova) e generatore con seme.
const INIT = () => {
  let queue = [], id = 0, now = 1000;
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(now); } };
  let seed = 1; window.__rngCalls = 0;
  const lcg = () => { window.__rngCalls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  window.__rng = v => { seed = v >>> 0; window.__rngCalls = 0; Math.random = lcg; };
  window.__rng(7);
  // Partita nuova con seme fisso e stirpe scelta come fa il motore (secondo numero casuale pesato sulle stirpi).
  window.__newGame = (race, clean = false) => {
    let cum = 0; for (const r of Game.races) { if (r.id === race) break; cum += r.weight; }
    const w = Game.races.find(r => r.id === race).weight, v = (cum + w / 2) / 100;
    let n = 0; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : .24; };
    Game.newGame(); window.__rng(4242);
    if (UI.panel) UI.close();
    const s = Game.s, p = s.player;
    if (clean) return p.race === race;
    s.campaign.stage = Math.max(s.campaign.stage || 0, 5); s.quest = Math.max(s.quest, 2);
    Object.assign(p, { x: 860, y: 700, dir: 'right', moving: false });
    for (const m of s.monsters) Object.assign(m, { x: 4, y: 4, homeX: 4, homeY: 4, engaged: false, wind: 0, dash: 0 });
    return p.race === race;
  };
  // Mette un mostro del tipo dato accanto al personaggio (dx, dy) e lo tiene fermo e inoffensivo se `calm`.
  window.__foe = (type, dx, dy, calm = true) => {
    const s = Game.s, p = s.player, m = s.monsters.find(x => x.type === type);
    if (!m) return null;
    Object.assign(m, { x: p.x + dx, y: p.y + dy, homeX: p.x + dx, homeY: p.y + dy, wind: 0, dash: 0, cd: calm ? 99 : 0, grace: 0, engaged: true });
    if (!Game.codex[type].boss) Object.assign(m, { hp: 9999, maxHp: 9999 });
    return m;
  };
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};

async function start(browser, options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options });
  await context.addInitScript(INIT);
  if (init) await context.addInitScript(init);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto(fileUrl(html));
  await page.evaluate(() => __tick(5));
  await page.click('#playBtn');
  await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
  await page.click('#dialog button[data-do="resume"]');
  return { context, page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  try {
    const { context, page, errors } = await start(browser);

    await step('1. Tabelle degli elementi complete per stirpi e mostri', async () => {
      const r = await page.evaluate(() => {
        const els = Object.keys(CombatFX.palette), missing = [];
        for (const race of Game.races) if (!els.includes(CombatFX.races[race.id])) missing.push('stirpe ' + race.id);
        for (const type of Object.keys(Game.codex)) if (!els.includes(CombatFX.monsters[type])) missing.push('mostro ' + type);
        const used = new Set(Game.races.map(r => CombatFX.races[r.id]));
        return { missing, races: Game.races.length, monsters: Object.keys(Game.codex).length, els, unused: els.filter(e => !used.has(e)) };
      });
      assert.deepEqual(r.missing, []);
      assert.equal(r.els.length, 7);
      assert.deepEqual(r.unused, [], 'elementi senza stirpi: ' + r.unused);
      return `${r.races} stirpi, ${r.monsters} mostri, elementi ${r.els.join('/')}`;
    });

    await step('2. Ogni elemento produce il proprio impatto con le vere azioni del gioco', async () => {
      const cases = [['goblin', 'attack', 'physical'], ['demon', 'skill1', 'fire'], ['slime', 'skill1', 'water'], ['wolf', 'skill1', 'ice'],
        ['gnome', 'skill1', 'lightning'], ['vampire', 'skill1', 'dark'], ['elf', 'skill1', 'light']];
      const out = [];
      for (const [race, action, el] of cases) {
        const r = await page.evaluate(([race, action, el]) => {
          if (!__newGame(race)) return 'stirpe non creata';
          __foe('thorn', 24, 0); __tick(20);
          const p = Game.s.player; p.mp = 999;
          if (!Game.action(action)) return 'azione rifiutata';
          for (let i = 0; i < 40; i++) { __tick(1); if (CombatFX.debug().live.includes('hit:' + el)) return 'ok'; }
          return 'nessun impatto ' + el + ': ' + CombatFX.debug().live.join(',');
        }, [race, action, el]);
        assert.equal(r, 'ok', race + ' → ' + r);
        out.push(race + ':' + el);
      }
      assert.deepEqual(errors, [], errors.join(' | '));
      return out.join(' ');
    });

    await step('3. Cambio di fase di un boss, sconfitta, schivata ed evoluzione', async () => {
      const r = await page.evaluate(() => {
        const seen = new Set(), watch = n => { for (let i = 0; i < n; i++) { __tick(1); for (const e of CombatFX.debug().live) seen.add(e.split(':')[0]); } };
        __newGame('goblin');
        const boss = __foe('boss', 26, 0); boss.phase = 1; boss.hp = Math.round(boss.maxHp * .5) + 1; __tick(10);
        Game.action('attack'); watch(10);
        const phase = boss.phase;
        __newGame('goblin');
        const thorn = __foe('thorn', 22, 0); thorn.hp = 1; __tick(10);
        Game.action('attack'); watch(10);
        __newGame('human');
        const wolf = __foe('wolf', -6, 0); Object.assign(wolf, { dash: .3, aimX: 1, aimY: 0 });
        Game.action('dash'); watch(12);
        const ghosts = CombatFX.debug().ghosts;
        __newGame('human');
        const p = Game.s.player; Object.assign(p, { level: 2, kills: 3 }); p.inventory.essence = 3;
        watch(60);
        return { seen: [...seen].sort(), phase, killed: thorn.hp <= 0, stage: p.evolutionStage, ghosts };
      });
      for (const kind of ['phase', 'defeat', 'dodge', 'evolve']) assert.ok(r.seen.includes(kind), 'manca ' + kind + ' in ' + r.seen);
      assert.equal(r.phase, 2); assert.ok(r.killed); assert.equal(r.stage, 1);
      assert.ok(r.ghosts > 0, 'nessuna scia della schivata');
      return r.seen.join(', ') + `, scia ${r.ghosts} sagome`;
    });

    await step('4. Logica identica con e senza effetti (posizioni, vitalità, ricariche, numeri casuali)', async () => {
      const out = [];
      for (const race of ['demon', 'vampire', 'spirit', 'slime']) {
        const r = await page.evaluate(race => {
          const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
          const g = cv.getContext('2d');
          // Ogni giro riparte da una partita nuova con lo stesso seme e la stessa disposizione dei mostri.
          const run = () => {
            __newGame(race);
            __foe('thorn', 40, 10, false); __foe('wolf', -50, 20, false); __foe('moth', 60, -30, false);
            __rng(99);
            const s = Game.s, p = s.player;
            for (let i = 0; i < 720; i++) {
              const a = i / 50;
              Game.step(1 / 60, { x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) });
              if (i % 25 === 0) Game.action('attack');
              if (i % 90 === 30) { p.mp = Math.max(p.mp, 40); Game.action('skill1'); }
              if (i % 140 === 70) Game.action('dash');
              if (i % 200 === 100) Game.action('innate');
              g.save(); g.translate(-(p.x - 320), -(p.y - 180)); Game.drawFX(g); g.restore();
            }
            const r3 = x => Math.round(x * 1000) / 1000;
            return JSON.stringify({ t: r3(s.time), rng: window.__rngCalls, p: [r3(p.x), r3(p.y), r3(p.hp), r3(p.mp), p.xp, p.kills, Object.values(p.cooldowns).map(r3)],
              m: s.monsters.filter(m => m.engaged || m.hp < m.maxHp).map(m => [m.type, r3(m.x), r3(m.y), m.hp, m.phase || 0, r3(m.cd), r3(m.wind || 0)]) });
          };
          const art = window.CombatFX;
          const withFx = run();
          window.CombatFX = undefined;
          let withoutFx; try { withoutFx = run(); } finally { window.CombatFX = art; }
          return { same: withFx === withoutFx, a: withFx.slice(0, 160), b: withoutFx.slice(0, 160), rng: JSON.parse(withFx).rng };
        }, race);
        assert.ok(r.same, race + ': con ' + r.a + ' / senza ' + r.b);
        out.push(`${race} (${r.rng} numeri casuali)`);
      }
      assert.deepEqual(errors, [], errors.join(' | '));
      return out.join(', ');
    });

    await step('5. Ordine di disegno: decorazioni sotto gli avvisi di pericolo, numeri sopra a tutto', async () => {
      const r = await page.evaluate(() => {
        __newGame('demon');
        const thorn = __foe('thorn', 24, 0); __tick(10);
        Game.s.player.mp = 999; Game.action('skill1'); Game.action('attack'); __tick(3);
        Object.assign(thorn, { wind: .3, windDuration: .6, pattern: 'stomp' });
        const real = document.createElement('canvas').getContext('2d'), log = [];
        let inside = null;
        const ctx = new Proxy(real, {
          get(t, k) { const v = t[k]; return typeof v === 'function' ? (...a) => { if (['fill', 'stroke', 'fillRect', 'fillText', 'strokeRect'].includes(k)) log.push(inside || 'motore:' + k); return v.apply(t, a); } : v; },
          set(t, k, v) { t[k] = v; return true; }
        });
        const art = window.CombatFX, wrap = name => (...a) => { const before = inside; inside = name; try { return art[name](...a); } finally { inside = before; } };
        window.CombatFX = { ...art, draw: wrap('draw'), effect: wrap('effect'), shot: wrap('shot'), label: wrap('label') };
        try { Game.drawFX(ctx); } finally { window.CombatFX = art; }
        const idx = test => log.map((x, i) => test(x) ? i : -1).filter(i => i >= 0);
        const decor = idx(x => x === 'draw' || x === 'effect'), engine = idx(x => x.startsWith('motore:')), labels = idx(x => x === 'label');
        return { decor: decor.length, engine: engine.length, labels: labels.length,
          decorFirst: decor.length > 0 && engine.length > 0 && Math.max(...decor) < Math.min(...engine),
          labelsLast: labels.length > 0 && Math.min(...labels) > Math.max(...engine) };
      });
      assert.ok(r.decor > 0 && r.engine > 0 && r.labels > 0, JSON.stringify(r));
      assert.ok(r.decorFirst, 'decorazioni disegnate dopo gli avvisi: ' + JSON.stringify(r));
      assert.ok(r.labelsLast, 'numeri coperti: ' + JSON.stringify(r));
      return `${r.decor} disegni di decorazione, ${r.engine} di avvisi, ${r.labels} di numeri`;
    });

    let json = null;
    await step('6. Salvataggio senza dati degli effetti, ricarica e "Continua il viaggio"', async () => {
      json = await page.evaluate(() => {
        // Partita non manipolata (i mostri restano dove li mette il gioco): combattimento con gli effetti attivi.
        __newGame('demon', true); __tick(10);
        const p = Game.s.player; p.mp = 999; Game.action('skill1'); Game.action('attack'); Game.action('dash'); __tick(5);
        if (!CombatFX.debug().tags) return null;
        return Game.exportSave();
      });
      assert.ok(json, 'nessun effetto creato prima del salvataggio');
      assert.ok(!/"tag"|CombatFX|"el":/.test(json), 'il salvataggio contiene dati degli effetti');
      assert.ok(await page.evaluate(j => Game.importSave(j), json), 'importazione rifiutata');
      await page.evaluate(() => Game.save());
      await page.reload(); await page.evaluate(() => __tick(5));
      assert.match(await page.locator('#playBtn').innerText(), /Continua il viaggio/);
      await page.click('#playBtn'); await page.evaluate(() => __tick(30));
      const race = await page.evaluate(() => Game.s.player.race);
      assert.equal(race, 'demon');
      await page.evaluate(() => { Game.s.player.mp = 999; Game.action('skill1'); __tick(20); });
      assert.deepEqual(errors, [], errors.join(' | '));
      return 'stirpe ' + race + ', ' + json.length + ' byte';
    });
    await context.close();

    await step('7. Effetti ridotti: prefers-reduced-motion e opzione del gioco fermano scie e particelle', async () => {
      const notes = [];
      for (const [label, options, init] of [['prefers-reduced-motion', { reducedMotion: 'reduce' }, null],
        ['opzione Effetti', {}, () => { try { localStorage.setItem('lumora-effects', 'off'); } catch {} }]]) {
        const run = await start(browser, options, init);
        const r = await run.page.evaluate(() => {
          __newGame('human');
          const wolf = __foe('wolf', -6, 0); Object.assign(wolf, { dash: .3, aimX: 1, aimY: 0 });
          Game.action('dash'); __tick(8);
          return { calm: CombatFX.calm(), ghosts: CombatFX.debug().ghosts, live: CombatFX.debug().live };
        });
        assert.ok(r.calm, label + ': modalità ridotta non riconosciuta');
        assert.equal(r.ghosts, 0, label + ': scia disegnata');
        assert.ok(r.live.includes('dodge:physical'), label + ': schivata non segnalata (' + r.live + ')');
        assert.deepEqual(run.errors, [], run.errors.join(' | '));
        notes.push(label);
        await run.context.close();
      }
      return notes.join(', ');
    });
  } finally { await browser.close(); }
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
