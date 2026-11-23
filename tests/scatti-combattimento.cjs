// Scatti ripetibili degli effetti di combattimento (combat-fx.js) con la tela di gioco reale.
// Uso:  node tests/scatti-combattimento.cjs <prima.html> [dopo.html] [--out cartella] [--scenes a,b] [--zoom 3]
//   PW_CORE = playwright-core installato fuori dal progetto (vedi tests/prova-browser.cjs). REDUCED=1: prefers-reduced-motion.
//   BENCH=1: invece degli scatti misura il costo per fotogramma in combattimento (mischia con tecniche e boss in fase II
//   con aura), FRAMES fotogrammi (default 600), alternando le build ROUNDS volte (default 2); PW_HEADED=1 per la GPU.
// Ogni scena parte da una partita nuova con lo stesso seme (19425) e la stessa stirpe, nello stesso punto, alla stessa ora;
// requestAnimationFrame è sostituito da un orologio manuale (1/60 s per fotogramma) e Math.random da un generatore con seme
// che riparte a ogni scena: le due build ricevono gli stessi input e gli stessi numeri casuali.
// Per ogni scena salva una striscia di fotogrammi (ritagliati intorno al personaggio) e, con due build, il confronto
// PRIMA (sopra) / DOPO (sotto). Registra anche lo stato di gioco dopo la scena (vitalità, posizioni, ricariche, fasi):
// deve essere identico fra le build, perché gli effetti non toccano la logica.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const out = path.resolve(opt('out', path.join(process.env.TEMP || '.', 'scatti-combattimento')));
const only = opt('scenes', '');
const zoom = Number(opt('zoom', 3));
const builds = args.map(a => path.resolve(a));
if (!builds.length) { console.log('Uso: node tests/scatti-combattimento.cjs <prima.html> [dopo.html] [--out dir] [--scenes a,b] [--zoom 3]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

// Scene: stirpe, regione, mostro (tipo e posizione rispetto al personaggio), azioni e fotogrammi da salvare.
// act: elenco di [azione, fotogrammi da attendere dopo]; frames: fotogrammi (dopo l'ultima azione) da fotografare.
const SCENES = {
  fisico: { race: 'goblin', monster: ['thorn', 22, 0], act: [['attack', 0]], frames: [2, 5, 8, 13], what: 'Colpo base fisico (Goblin, fendente)' },
  'colpo-forte': { race: 'goblin', monster: ['thorn', 22, 0], act: [['attack', 26], ['attack', 26], ['attack', 0]], frames: [2, 5, 9, 14], what: 'Terzo colpo della combo (colpo forte, x1,25 già nel motore)' },
  fuoco: { race: 'demon', monster: ['thorn', 30, 0], act: [['skill1', 0]], frames: [3, 7, 12, 18], what: 'Fuoco · Cerchio di braci (Demone)' },
  acqua: { race: 'slime', monster: ['thorn', 50, 0], act: [['skill1', 0]], frames: [6, 13, 17, 23], what: 'Acqua · Bolla di rugiada (Slime)' },
  ghiaccio: { race: 'wolf', monster: ['thorn', 22, 0], act: [['skill1', 0]], frames: [2, 5, 8, 13], what: 'Ghiaccio · Artiglio di bora (Lupo runico)' },
  fulmine: { race: 'gnome', monster: ['thorn', 50, 0], act: [['skill1', 0]], frames: [6, 13, 17, 23], what: 'Fulmine · tecnica dello Gnomo cartografo' },
  oscurita: { race: 'vampire', monster: ['thorn', 50, 0], act: [['skill1', 0]], frames: [6, 13, 17, 23], what: 'Oscurità · Sorso del vespro (Vampiro)' },
  luce: { race: 'elf', monster: ['thorn', 30, 0], act: [['skill1', 0]], frames: [3, 7, 12, 18], what: 'Luce · Sigillo di salice (Elfo)' },
  schivata: { race: 'human', monster: ['wolf', -6, 0], pin: false, dodge: true, act: [['dash', 0]], frames: [2, 5, 9, 15], what: 'Schivata riuscita durante la carica di un lupo' },
  'proiettili-nemici': { race: 'human', monster: ['moth', 70, -6], pin: 'pos', act: [['wait', 0]], frames: [20, 40, 52, 62], what: 'Avviso e proiettile della Falena di lume (luce, nemico)' },
  'boss-fase': { race: 'goblin', monster: ['boss', 26, 0], boss: 'phase', act: [['attack', 0]], frames: [3, 14, 34, 62], what: 'Orveth passa alla fase II (trasformazione)' },
  'boss-pericolo': { race: 'goblin', region: 'quarry', spot: [840, 430], monster: ['kharun', 34, 0], boss: 'hammer', act: [['attack', 26], ['attack', 0]], frames: [2, 6, 10, 16], what: 'Kharun in fase II: aura e avviso del maglio sopra gli impatti' },
  evoluzione: { race: 'human', monster: null, evolve: true, act: [], frames: [4, 20, 45, 80], what: 'Evoluzione del personaggio (trasformazione)' },
  // RPG Evolution, incremento 2: preavvisi tenuti fermi a metà per confrontare l'area disegnata.
  'avviso-pestone': { race: 'goblin', monster: ['thorn', 24, 0], warn: 'stomp', act: [['attack', 0]], frames: [2, 6, 10, 16], what: 'Pestone del Germoglio spinoso: avviso e colpo del giocatore' },
  'avviso-carica': { race: 'human', monster: ['wolf', 50, 0], warn: 'dash', act: [['wait', 0]], frames: [2, 8, 14, 20], what: 'Carica del Lupo delle fronde: avviso' },
  'avviso-orveth': { race: 'goblin', monster: ['boss', 38, 0], boss: 'phase1', warn: 'stomp', act: [['attack', 0]], frames: [2, 6, 10, 16], what: 'Pestone di Orveth (fase I): avviso' },
  // RPG Evolution, incremento 4: raffiche e ventagli con le corsie dei proiettili, guardia adattiva visibile.
  'avviso-radici': { race: 'goblin', monster: ['boss', 44, 0], phase: 2, warn: 'roots', act: [['wait', 0]], frames: [2, 6, 10, 16], what: 'Radici di Orveth (fase II): una corsia per proiettile' },
  'avviso-forgia': { race: 'goblin', region: 'quarry', spot: [840, 430], monster: ['kharun', 44, 0], phase: 2, warn: 'forge', act: [['wait', 0]], frames: [2, 6, 10, 16], what: 'Forgia di Kharun (fase II): ventaglio di sette proiettili' },
  'guardia': { race: 'goblin', monster: ['boss', 26, 0], guard: true, act: [['attack', 0]], frames: [2, 8, 16, 30], what: 'Guardia adattiva di Orveth (colpi ravvicinati ridotti)' }
};
const scenes = (only ? only.split(',') : Object.keys(SCENES)).filter(k => SCENES[k]);
// SPOT=x,y: punto alternativo per le scene nella valle (per cercare uno sfondo sgombro).
if (process.env.SPOT) for (const k of scenes) if (!SCENES[k].region) SCENES[k].spot = process.env.SPOT.split(',').map(Number);

const INIT = () => {
  let queue = [], id = 0; window.__now = 1000; window.__realRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { queue.push(cb); return ++id; };
  window.cancelAnimationFrame = () => {};
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 60; const q = queue; queue = []; for (const f of q) f(window.__now); } };
  let seed = 1; const lcg = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  window.__rng = v => { seed = v >>> 0; Math.random = lcg; };
  window.__rng(7);
  try { localStorage.setItem('lumora-guidance', 'off'); } catch {}
};

async function shoot(file) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const errors = [], result = {};
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await page.goto('file:///' + file.replace(/\\/g, '/'));
    await page.evaluate(() => __tick(5));
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    for (const name of scenes) {
      const sc = SCENES[name];
      const setup = await page.evaluate(sc => {
        // Partita nuova con seme e stirpe fissi (la stirpe si sceglie come fa il motore: secondo numero casuale pesato).
        window.__target = null;
        let cum = 0; for (const r of Game.races) { if (r.id === sc.race) break; cum += r.weight; }
        const w = Game.races.find(r => r.id === sc.race).weight, v = (cum + w / 2) / 100;
        let n = 0; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : .24; };
        Game.newGame(); __rng(4242);
        const s = Game.s, p = s.player;
        if (p.race !== sc.race) return 'stirpe ' + p.race + ' invece di ' + sc.race;
        s.campaign.stage = Math.max(s.campaign.stage || 0, 5); s.quest = Math.max(s.quest, 2);
        if (UI.panel) UI.close();
        for (let k = 0; k < 8 && sc.region && s.region !== sc.region; k++) {
          const gate = World.route(s.region, sc.region, s.campaign.stage);
          if (!gate) return 'nessun percorso verso ' + sc.region;
          Object.assign(p, { x: gate.x, y: gate.y });
          if (!Game.action('interact')) return 'passaggio rifiutato in ' + s.region;
          __tick(1);
        }
        if (UI.panel) UI.close();
        const [sx, sy] = sc.spot || [860, 700]; // prato aperto della valle, senza edifici né abitanti
        Object.assign(p, { x: sx, y: sy, dir: 'right', moving: false, hp: 999, invul: 0, hit: 0, dash: 0 });
        // Il calendario non cambia fra le build: stessa ora (mezzogiorno) per ogni scena.
        const cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440;
        s.time += ((12.25 * 60 - cur + 1440) % 1440) / Calendar.minutesPerSecond;
        let target = null;
        for (const m of s.monsters) {
          if (!target && sc.monster && m.type === sc.monster[0] && m.hp > 0) { target = m; continue; }
          Object.assign(m, { x: 4, y: 4, homeX: 4, homeY: 4, engaged: false, wind: 0, dash: 0 });
        }
        if (sc.monster && !target) return 'mostro ' + sc.monster[0] + ' assente in ' + s.region;
        if (target) {
          const big = !Game.codex[target.type].boss;
          Object.assign(target, { x: p.x + sc.monster[1], y: p.y + sc.monster[2], homeX: p.x + sc.monster[1], homeY: p.y + sc.monster[2], wind: 0, dash: 0, cd: 99, grace: 0, slow: 0 });
          if (big) Object.assign(target, { hp: 9999, maxHp: 9999 });
          if (sc.boss === 'phase') { target.phase = 1; target.hp = Math.round(target.maxHp * .5) + 1; }
          if (sc.boss === 'hammer') Object.assign(target, { phase: 2, hp: Math.round(target.maxHp * .3), engaged: true });
          window.__target = target;
        }
        // La simulazione continua; il bersaglio resta fermo e non attacca (salvo le scene che lo chiedono).
        if (!window.__step0) window.__step0 = Game.step;
        Game.step = (...a) => {
          window.__step0(...a);
          const m = window.__target; if (!m || sc.pin === false) return;
          m.x = m.homeX; m.y = m.homeY;
          if (sc.pin === 'pos') return;
          m.cd = 99; m.dash = 0;
          if (sc.boss === 'hammer') { Object.assign(m, { wind: .45, windDuration: .72, pattern: 'hammer', engaged: true }); }
          else if (sc.warn) { Object.assign(m, { wind: .3, windDuration: .6, pattern: sc.warn, engaged: true, aimX: -1, aimY: 0 }); if (sc.phase) m.phase = sc.phase; } else m.wind = 0;
        };
        __tick(70);
        Game.s.player.hp = 999;
        return 'ok';
      }, sc);
      if (setup !== 'ok') { errors.push(name + ': ' + setup); continue; }
      const res = await page.evaluate(async ([sc, zoom]) => {
        const s = Game.s, p = s.player, f = document.getElementById('field');
        if (sc.dodge) { const m = window.__target; Object.assign(m, { dash: .3, aimX: 1, aimY: 0, engaged: true }); }
        if (sc.pin === 'pos') Object.assign(window.__target, { cd: 0, engaged: true });
        if (sc.guard) { window.__target.engaged = true; Adaptive.guard(s, window.__target, 9); }
        if (sc.evolve) {
          Object.assign(p, { level: 2, kills: 3 }); p.inventory.essence = 3;
          let k = 0; while (p.evolutionStage === 0 && k++ < 90) __tick(1);
          if (p.evolutionStage === 0) return { error: 'evoluzione non avvenuta' };
        }
        for (const [action, wait] of sc.act) {
          if (action !== 'wait') { p.mp = 999; Game.action(action); }
          if (wait) __tick(wait);
        }
        const camX = Math.round(Math.max(0, Math.min(World.width - f.width, p.x - f.width * .5)));
        const camY = Math.round(Math.max(0, Math.min(World.height - f.height, p.y - f.height * .52)));
        const W = 150, H = 96, cx = Math.round(p.x - camX + 18 - W / 2), cy = Math.round(p.y - camY - 14 - H / 2);
        const frames = []; let done = 0;
        for (const at of sc.frames) {
          __tick(at - done); done = at;
          const c = document.createElement('canvas'); c.width = W * zoom; c.height = H * zoom;
          const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
          g.drawImage(f, cx, cy, W, H, 0, 0, W * zoom, H * zoom);
          frames.push(c.toDataURL('image/png'));
        }
        __tick(90);
        const r1 = x => Math.round(x * 1000) / 1000;
        const state = {
          player: [r1(p.x), r1(p.y), p.hp, r1(p.mp), p.evolutionStage, p.form, Object.entries(p.cooldowns).map(([k, v]) => k + ':' + r1(v)).join(',')],
          monsters: s.monsters.filter(m => Math.hypot(m.x - p.x, m.y - p.y) < 300).map(m => [m.type, r1(m.x), r1(m.y), m.hp, m.phase || 0]),
          xp: p.xp, kills: p.kills
        };
        return { frames, state, fx: window.CombatFX ? CombatFX.debug() : null };
      }, [sc, zoom]);
      if (res.error) { errors.push(name + ': ' + res.error); continue; }
      result[name] = res;
    }
  } finally { await browser.close(); }
  return { result, errors };
}

async function sheet(rowsByBuild, labels, title) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    return await page.evaluate(async ([rowsByBuild, labels, title]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const rows = await Promise.all(rowsByBuild.map(list => Promise.all(list.map(load))));
      const fw = rows[0][0].width, fh = rows[0][0].height, gap = 6, head = 30, side = 0;
      const c = document.createElement('canvas');
      c.width = side + rows[0].length * (fw + gap) - gap; c.height = head + rows.length * (fh + gap) - gap;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.fillStyle = '#10151a'; g.fillRect(0, 0, c.width, c.height);
      g.font = 'bold 16px sans-serif'; g.fillStyle = '#ffe9b0'; g.fillText(title, 8, 21);
      rows.forEach((list, r) => list.forEach((img, i) => {
        const x = side + i * (fw + gap), y = head + r * (fh + gap);
        g.drawImage(img, x, y);
        if (i === 0) { const t = labels[r], w = g.measureText(t).width + 12; g.fillStyle = '#000000b0'; g.fillRect(x + 6, y + 6, w, 24); g.fillStyle = '#ffe9b0'; g.fillText(t, x + 12, y + 23); }
      }));
      return c.toDataURL('image/png');
    }, [rowsByBuild, labels, title]);
  } finally { await browser.close(); }
}
// Misura: fotogramma intero (simulazione, mondo, effetti, interfaccia) e solo Game.drawFX, con presentazione reale fra i fotogrammi.
const BENCH_SCENES = {
  mischia: { race: 'demon', foes: [['thorn', 26, 0], ['wolf', -30, 14], ['moth', 40, -26]] },
  'boss-aura': { race: 'goblin', foes: [['boss', 30, 0]], boss: true }
};
async function benchOnce(file, frames) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: !process.env.PW_HEADED });
  const out = {}, errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file:///' + file.replace(/\\/g, '/'));
    await page.evaluate(() => __tick(5));
    await page.click('#playBtn');
    await page.locator('#dialog button[data-do="resume"]').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.click('#dialog button[data-do="resume"]');
    for (const [name, sc] of Object.entries(BENCH_SCENES)) {
      out[name] = await page.evaluate(async ([sc, frames]) => {
        let cum = 0; for (const r of Game.races) { if (r.id === sc.race) break; cum += r.weight; }
        const w = Game.races.find(r => r.id === sc.race).weight, v = (cum + w / 2) / 100;
        let n = 0; Math.random = () => { const k = n++; return k === 0 ? 19425 / 4294967296 : k === 1 ? v : .24; };
        Game.newGame(); __rng(4242); if (UI.panel) UI.close();
        const s = Game.s, p = s.player; s.campaign.stage = 5; s.quest = Math.max(s.quest, 2);
        Object.assign(p, { x: 860, y: 700, dir: 'right' });
        const pinned = [];
        for (const m of s.monsters) Object.assign(m, { x: 4, y: 4, homeX: 4, homeY: 4, engaged: false });
        for (const [type, dx, dy] of sc.foes) {
          const m = s.monsters.find(x => x.type === type && !pinned.includes(x)); if (!m) continue;
          Object.assign(m, { x: p.x + dx, y: p.y + dy, homeX: p.x + dx, homeY: p.y + dy, engaged: true, cd: 0 });
          if (Game.codex[type].boss) Object.assign(m, { phase: 2, hp: Math.round(m.maxHp * .4) }); else Object.assign(m, { hp: 99999, maxHp: 99999 });
          pinned.push(m);
        }
        if (!window.__step0) window.__step0 = Game.step;
        Game.step = (...a) => { window.__step0(...a); const q = Game.s.player; q.hp = Math.max(q.hp, 60); for (const m of pinned) { m.x = m.homeX; m.y = m.homeY; if (Game.codex[m.type].boss) { m.hp = Math.max(m.hp, Math.round(m.maxHp * .3)); m.cd = 99; m.wind = 0; } } };
        if (!window.__fxWrapped) { window.__fxWrapped = true; const d = Game.drawFX; window.__fx = 0; Game.drawFX = (...a) => { const t0 = performance.now(); try { return d(...a); } finally { window.__fx += performance.now() - t0; } }; }
        __tick(30);
        const times = [], fx = [];
        for (let i = 0; i < frames; i++) {
          if (i % 25 === 0) Game.action('attack');
          if (i % 60 === 10) { p.mp = 999; Game.action('skill1'); }
          if (i % 100 === 50) Game.action('dash');
          if (i % 150 === 75) { p.mp = 999; Game.action('innate'); }
          await new Promise(r => __realRAF(r)); window.__fx = 0;
          const t0 = performance.now(); __tick(1); times.push(performance.now() - t0); fx.push(window.__fx);
        }
        Game.step = window.__step0;
        const q = a => { const mean = a.reduce((x, y) => x + y, 0) / a.length; a.sort((x, y) => x - y); return [a[a.length >> 1], a[Math.floor(a.length * .95)], a[a.length - 1], mean]; };
        return { frame: q(times), fx: q(fx), live: window.CombatFX ? CombatFX.debug().live.length : 0 };
      }, [sc, frames]);
    }
  } finally { await browser.close(); }
  return { out, errors };
}
async function bench() {
  const rounds = Number(process.env.ROUNDS || 2), frames = Number(process.env.FRAMES || 600), table = {};
  for (let r = 0; r < rounds; r++) for (const [i, file] of builds.entries()) {
    const res = await benchOnce(file, frames);
    if (res.errors.length) console.log('errori ' + path.basename(file) + ': ' + res.errors.join('; '));
    for (const [k, v] of Object.entries(res.out)) ((table[k] ||= {})[i] ||= []).push(v);
  }
  const med = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  console.log(['scena', ...builds.map(b => path.basename(b))].join(' | '));
  for (const [k, byBuild] of Object.entries(table)) console.log([k, ...builds.map((_, i) => {
    const l = byBuild[i] || [];
    const f = j => med(l.map(x => x.frame[j])).toFixed(2), d = j => med(l.map(x => x.fx[j])).toFixed(3);
    return `fotogramma media ${f(3)} · ${f(0)}/${f(1)}/${f(2)} ms · drawFX media ${d(3)} · ${d(0)}/${d(1)}/${d(2)} ms`;
  })].join(' | '));
  console.log('(media, poi mediana/p95/massimo; mediana fra ' + rounds + ' giri per build, ' + frames + ' fotogrammi per scena)');
  fs.writeFileSync(path.join(out, 'bench-combattimento.json'), JSON.stringify({ builds, table }, null, 1));
  process.exit(0);
}

const save = (name, data) => fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));

(async () => {
  const manifest = builds.map(f => ({ file: f, bytes: fs.statSync(f).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') }));
  fs.writeFileSync(path.join(out, 'build-usate.json'), JSON.stringify(manifest, null, 1));
  for (const m of manifest) console.log('build ' + path.basename(m.file) + ' sha256 ' + m.sha256.slice(0, 16));
  if (process.env.BENCH) return bench();
  const runs = [];
  for (const file of builds) {
    const t0 = Date.now(), r = await shoot(file); runs.push(r);
    console.log(`${path.basename(file)}: ${Object.keys(r.result).length} scene in ${((Date.now() - t0) / 1000).toFixed(1)} s, errori: ${r.errors.length}${r.errors.length ? ' — ' + r.errors.join(' | ') : ''}`);
  }
  const tags = builds.length === 2 ? ['PRIMA', 'DOPO'] : builds.map(b => path.basename(b, '.html'));
  const report = {};
  let same = 0, diff = 0;
  for (const name of scenes) {
    const per = runs.map(r => r.result[name]).filter(Boolean);
    if (per.length !== runs.length) continue;
    const img = await sheet(per.map(x => x.frames), tags, SCENES[name].what + (process.env.REDUCED ? ' · movimento ridotto' : ''));
    save(name, img);
    const states = per.map(x => JSON.stringify(x.state));
    const equal = states.every(x => x === states[0]);
    equal ? same++ : diff++;
    report[name] = { stateEqual: equal, states: per.map(x => x.state), fx: per.map(x => x.fx) };
    console.log(`${name}: stato di gioco ${equal ? 'identico' : 'DIVERSO'}${per.at(-1).fx ? ' · effetti ' + per.at(-1).fx.tags + ' etichette' : ''}`);
  }
  fs.writeFileSync(path.join(out, 'stato-scene.json'), JSON.stringify(report, null, 1));
  if (runs.length > 1) console.log(diff ? `\n${diff} scene con stato diverso su ${same + diff}` : `\nStato di gioco identico fra le build in tutte le ${same} scene`);
  const errs = runs.reduce((n, r) => n + r.errors.length, 0);
  process.exit(diff || errs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
