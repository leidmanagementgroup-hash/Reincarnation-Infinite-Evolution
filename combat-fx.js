// Effetti di combattimento (World Art Overhaul, fase 4 C).
// Sette elementi visivi (fisico, fuoco, acqua, ghiaccio, fulmine, oscurità, luce) per colpi, tecniche, proiettili,
// anelli d'urto, schivate, cambi di fase dei boss, sconfitte ed evoluzioni. Solo disegno: il motore gli passa
// un'etichetta (tag) e la posizione degli eventi; danni, tempi, ingombri, velocità e numeri casuali non cambiano
// (qui non si usa Math.random: le variazioni vengono da un contatore e da una funzione hash).
// Leggibilità: Game.drawFX disegna queste decorazioni PRIMA degli avvisi di pericolo, dei proiettili e dei numeri;
// le particelle che cadono sulla figura del personaggio vengono attenuate. Con gli effetti ridotti o con
// prefers-reduced-motion restano solo forme statiche che sfumano (niente particelle, scie, aure o tremolii).
(() => {
  'use strict';
  const TAU = Math.PI * 2, R = Math.round;
  const PAL = Object.freeze({
    physical: {name: 'Fisico', hi: '#fffbea', mid: '#f3d6a0', lo: '#a77b4f', smoke: '#8c7b6b', ink: '#2b2230'},
    fire: {name: 'Fuoco', hi: '#fff4b0', mid: '#ff9f3a', lo: '#d8462a', smoke: '#5e5557', ink: '#3a1414'},
    water: {name: 'Acqua', hi: '#f2fdff', mid: '#6cd0f5', lo: '#2e7fc4', smoke: '#9fd8ee', ink: '#14304e'},
    ice: {name: 'Ghiaccio', hi: '#ffffff', mid: '#bdf0ff', lo: '#6aaee0', smoke: '#dff6ff', ink: '#1e3a5c'},
    lightning: {name: 'Fulmine', hi: '#ffffff', mid: '#fff27a', lo: '#9a8cff', smoke: '#c9c2ff', ink: '#26224f'},
    dark: {name: 'Oscurità', hi: '#f2dcff', mid: '#b07ce8', lo: '#5a2f91', smoke: '#3a2452', ink: '#160b26'},
    light: {name: 'Luce', hi: '#ffffff', mid: '#fff1a8', lo: '#f0bf55', smoke: '#fff8d8', ink: '#5a3d12'}
  });
  // Elemento delle 44 stirpi (tecniche della stirpe; il colpo base resta fisico con un accento dell'elemento).
  const RACE = Object.freeze({
    slime: 'water', goblin: 'physical', wolf: 'ice', elf: 'light', spirit: 'light', vampire: 'dark', demon: 'fire',
    drake: 'fire', secret: 'dark',
    kobold: 'physical', orc: 'physical', gnome: 'lightning', satyr: 'physical', hare: 'light', fungus: 'physical',
    fox: 'fire', terrapin: 'water', dryad: 'physical', triton: 'water', raven: 'dark', salamander: 'fire',
    scarabkin: 'physical', spider: 'physical', mimic: 'physical', troll: 'physical', harpy: 'lightning',
    golem: 'physical', frostkin: 'ice', sylph: 'lightning', naga: 'water', mantis: 'physical', minotaur: 'physical',
    djinn: 'fire', chimera: 'physical', phoenix: 'fire', leviathan: 'water',
    human: 'physical', dwarf: 'physical', skeleton: 'dark', bear: 'physical', fairy: 'light', elemental: 'fire',
    wyvern: 'ice', griffin: 'light'
  });
  const MONSTER = Object.freeze({
    moth: 'light', thorn: 'physical', wolf: 'physical', boss: 'light', ember: 'fire', sentinel: 'fire',
    scarab: 'physical', shardling: 'ice', shade: 'dark', crystalguard: 'ice', kharun: 'fire', syrava: 'ice',
    asterion: 'dark', nadir: 'water', 'dungeon-heir': 'lightning', 'nadir-echo': 'water', 'dungeon-retainer': 'physical'
  });
  const SKILL = Object.freeze({spark: 'lightning', aurora: 'light', 'weave-storm': 'lightning', 'weave-guard': 'light', 'weave-fracture': 'dark'});
  const INNATE = Object.freeze({insight: 'light', adaptation: 'physical', shade: 'dark', absorb: 'dark'});
  const LIFE = {hit: .34, hurt: .3, dodge: .36, phase: 1.3, defeat: .7, evolve: 1.5};
  const GHOST = '#a6eced';

  // Etichette immutabili e condivise (una per combinazione): il motore le copia su effetti e proiettili.
  const tags = new Map();
  function make(el, accent, strong, hostile, kind) {
    const key = el + '|' + (accent || '') + '|' + (strong ? 1 : 0) + '|' + (hostile ? 1 : 0) + '|' + kind;
    let t = tags.get(key);
    if (!t) { t = Object.freeze({el, accent: accent && accent !== el ? accent : null, strong: !!strong, hostile: !!hostile, kind}); tags.set(key, t); }
    return t;
  }
  function tag(src) {
    if (!src) return null;
    if (src.monster) return make(MONSTER[src.monster] || 'physical', null, false, true, 'monster');
    const race = RACE[src.race] || 'physical';
    if (src.strike) {
      const spit = src.strike === 'spit';
      return make(spit ? race : 'physical', spit ? null : race, src.strong, false, 'strike');
    }
    if (src.style === 'heal') return null;
    let el = race;
    if (src.innate) el = src.innate === 'element' ? (race === 'physical' ? 'lightning' : race) : INNATE[src.innate] || race;
    else if (Object.hasOwn(SKILL, src.skill)) el = SKILL[src.skill];
    return make(el, null, false, false, 'skill');
  }

  // Variazioni ripetibili senza Math.random.
  function hash(a, b) {
    let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  let mask = null, still = false, mq;
  function calm() {
    try { if (mq === undefined) mq = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null; } catch { mq = null; }
    return window.UI?.effects === false || !!mq?.matches;
  }
  // Rettangolo con attenuazione sulla figura del personaggio (le parti sovrapposte restano al 25%).
  function fill(ctx, x, y, w, h, color, alpha) {
    if (alpha <= .02) return;
    x = R(x); y = R(y);
    ctx.fillStyle = color;
    if (mask && x < mask.r && x + w > mask.l && y < mask.b && y + h > mask.t) {
      const l = Math.max(x, mask.l), r = Math.min(x + w, mask.r), t = Math.max(y, mask.t), b = Math.min(y + h, mask.b);
      ctx.globalAlpha = alpha;
      if (t > y) ctx.fillRect(x, y, w, t - y);
      if (y + h > b) ctx.fillRect(x, b, w, y + h - b);
      if (l > x) ctx.fillRect(x, t, l - x, b - t);
      if (x + w > r) ctx.fillRect(r, t, x + w - r, b - t);
      ctx.globalAlpha = alpha * .25; ctx.fillRect(l, t, r - l, b - t);
      return;
    }
    ctx.globalAlpha = alpha; ctx.fillRect(x, y, w, h);
  }
  const dot = (ctx, x, y, color, alpha) => fill(ctx, x, y, 1, 1, color, alpha);
  function oval(ctx, x, y, rx, ry, color, alpha, width = 1) {
    if (alpha <= .02 || rx < .5) return;
    ry = Math.max(.5, ry); alpha = Math.min(1, alpha);
    const stroke = a => { ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke(); };
    const m = mask, pad = width + 1;
    if (!m || x - rx - pad >= m.r || x + rx + pad <= m.l || y - ry - pad >= m.b || y + ry + pad <= m.t) { stroke(alpha); ctx.lineWidth = 1; return; }
    ctx.save(); ctx.beginPath(); ctx.rect(x - rx - 8, y - ry - 8, 2 * rx + 16, 2 * ry + 16); ctx.rect(m.l, m.t, m.r - m.l, m.b - m.t); ctx.clip('evenodd'); stroke(alpha); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, m.r - m.l, m.b - m.t); ctx.clip(); stroke(alpha * .25); ctx.restore();
    ctx.lineWidth = 1;
  }
  // Scintilla a quattro punte; con `ink` ha un contorno scuro che la stacca da ogni terreno.
  function star(ctx, x, y, r, hi, mid, alpha, ink) {
    x = R(x); y = R(y);
    if (r < 1) { dot(ctx, x, y, hi, alpha); return; }
    if (ink) { fill(ctx, x - r - 1, y - 1, 2 * r + 3, 3, ink, alpha * .5); fill(ctx, x - 1, y - r - 1, 3, 2 * r + 3, ink, alpha * .5); }
    fill(ctx, x - r, y, 2 * r + 1, 1, mid, alpha); fill(ctx, x, y - r, 1, 2 * r + 1, mid, alpha);
    for (let i = 1, d = R(r * .4); i <= d; i++) {
      dot(ctx, x - i, y - i, mid, alpha * .8); dot(ctx, x + i, y - i, mid, alpha * .8);
      dot(ctx, x - i, y + i, mid, alpha * .8); dot(ctx, x + i, y + i, mid, alpha * .8);
    }
    fill(ctx, x - 1, y - 1, 3, 3, hi, alpha);
    if (r >= 4) { fill(ctx, x - 2, y, 5, 1, hi, alpha); fill(ctx, x, y - 2, 1, 5, hi, alpha); }
  }
  function streak(ctx, x, y, ang, r0, len, hi, mid, alpha, w = 1) {
    const c = Math.cos(ang), s = Math.sin(ang) * .8;
    for (let j = 0; j < len; j++) fill(ctx, x + c * (r0 + j), y + s * (r0 + j), w, w, j < len / 2 ? hi : mid, alpha);
  }
  // Saetta spezzata in quattro tratti (la forma cambia 15 volte al secondo, la luminosità resta costante).
  function zigzag(ctx, x, y, ang, len, seed, P, alpha, w = 1) {
    let px = x, py = y;
    const c = Math.cos(ang), s = Math.sin(ang), steps = 4;
    for (let i = 1; i <= steps; i++) {
      const off = i < steps ? (hash(seed, i) - .5) * 7 : 0;
      const nx = x + c * len * i / steps - s * off, ny = y + s * len * i / steps * .8 + c * off * .8;
      const n = Math.max(1, R(Math.hypot(nx - px, ny - py)));
      for (let j = 0; j < n; j++) {
        const qx = px + (nx - px) * j / n, qy = py + (ny - py) * j / n;
        fill(ctx, qx + 1, qy + 1, w, w, P.lo, alpha * .8); fill(ctx, qx, qy, w, w, P.hi, alpha);
      }
      px = nx; py = ny;
    }
  }
  // Rombo di ghiaccio 5x5 (scheggia o cristallo).
  function shard(ctx, x, y, P, alpha) {
    x = R(x); y = R(y);
    fill(ctx, x, y - 2, 1, 5, P.mid, alpha); fill(ctx, x - 2, y, 5, 1, P.mid, alpha);
    fill(ctx, x - 1, y - 1, 3, 3, P.lo, alpha); dot(ctx, x, y, P.hi, alpha); dot(ctx, x, y - 1, P.hi, alpha);
  }
  // Una particella con la forma del suo elemento (2 pixel come le scintille originali del gioco); a = età 0..1.
  function mote(ctx, el, P, x, y, a, seed, alpha, z = 2) {
    x = R(x); y = R(y);
    switch (el) {
      case 'fire': {
        const c = a < .3 ? P.hi : a < .6 ? P.mid : a < .85 ? P.lo : P.smoke, s = a < .6 ? z : 1;
        fill(ctx, x, y, s, s, c, a > .85 ? alpha * .6 : alpha);
        if (z > 1 && a < .55) dot(ctx, x, y - 1, a < .3 ? P.mid : P.lo, alpha * .8);
        break;
      }
      case 'water': fill(ctx, x, y, z, z + 1, P.mid, alpha); dot(ctx, x, y, P.hi, alpha); break;
      case 'ice':
        fill(ctx, x, y, z, z, P.mid, alpha); dot(ctx, x, y, P.hi, alpha);
        if (!still && ((a * 10 + seed * 4) | 0) % 2 === 0) { fill(ctx, x - 1, y + (z >> 1), z + 2, 1, P.hi, alpha * .7); fill(ctx, x + (z >> 1), y - 1, 1, z + 2, P.hi, alpha * .7); }
        break;
      case 'lightning': fill(ctx, x, y, z, z, P.hi, alpha); dot(ctx, x + z, y - 1, P.mid, alpha); dot(ctx, x - 1, y + z, P.lo, alpha * .8); break;
      case 'dark': fill(ctx, x - 1, y, z + 2, z, P.lo, alpha * .85); fill(ctx, x, y, z, Math.max(1, z - 1), P.mid, alpha); break;
      case 'light':
        if (a < .6) { fill(ctx, x - z, y, 2 * z + 1, 1, P.mid, alpha); fill(ctx, x, y - z, 1, 2 * z + 1, P.mid, alpha); }
        dot(ctx, x, y, P.hi, alpha); break;
      default: fill(ctx, x, y, z, z, a < .5 ? P.mid : P.lo, alpha); if (z > 1) dot(ctx, x, y, P.hi, alpha * (1 - a));
    }
  }
  // Traiettoria di una particella per elemento (KX, KY: spostamento dopo tt secondi).
  let KX = 0, KY = 0;
  function kin(el, ang, v, tt, i) {
    const c = Math.cos(ang), s = Math.sin(ang);
    switch (el) {
      case 'fire': KX = c * v * .55 * tt + Math.sin(tt * 18 + i) * 1.5; KY = s * v * .3 * tt - 30 * tt - 45 * tt * tt; break;
      case 'water': KX = c * v * tt; KY = (s * .5 - .9) * v * .8 * tt + 260 * tt * tt; break;
      case 'ice': { const r = v * .2 * (1 - Math.exp(-7 * tt)); KX = c * r; KY = s * r * .8; break; }
      case 'lightning': KX = c * v * 1.6 * tt; KY = s * v * 1.2 * tt; break;
      case 'light': KX = c * v * .55 * tt; KY = s * v * .4 * tt - 24 * tt; break;
      default: KX = c * v * tt; KY = s * v * .8 * tt + 100 * tt * tt;
    }
  }
  function burst(ctx, f, el, n, k, a, from = 0, cx = f.x, cy = f.y - 7) {
    const P = PAL[el], tt = a * f.life, alpha = 1 - a * a;
    for (let i = 0; i < n; i++) {
      const h = hash(f.id, i + from), ang = (i + h) / n * TAU, v = (34 + 44 * hash(f.id, i + from + 50)) * k;
      if (el === 'dark') {
        const r = (14 + 8 * h) * k * Math.max(0, 1 - a * 1.5), sw = ang + a * 2.4;
        KX = Math.cos(sw) * r; KY = Math.sin(sw) * r * .75;
      } else kin(el, ang, v, tt, i);
      mote(ctx, el, P, cx + KX, cy + KY, a, h, alpha);
    }
  }

  // Impatto di un colpo: lampo di contatto, firma dell'elemento e particelle. k = scala (1 normale, 1.5 colpo forte).
  function impact(ctx, f, el, a, k) {
    const P = PAL[el], x = R(f.x), y = R(f.y - 7), tt = a * f.life, fade = 1 - a;
    if (still) {
      // Effetti ridotti: un simbolo fermo dell'elemento che sfuma.
      if (el === 'fire' || el === 'water' || el === 'dark') {
        fill(ctx, x - 3, y - 3, 7, 7, P.ink, fade * .45); fill(ctx, x - 2, y - 2, 5, 5, P.lo, fade);
        fill(ctx, x - 1, y - 1, 3, 3, P.mid, fade); dot(ctx, x, y, P.hi, fade);
      } else if (el === 'ice') { shard(ctx, x, y, P, fade); star(ctx, x, y, 5, P.hi, P.mid, fade * .6); }
      else star(ctx, x, y, k > 1 ? 6 : 4, P.hi, P.mid, fade, P.ink);
      if (k > 1) oval(ctx, x, y, 12, 7, P.hi, fade * .8, 2);
      return;
    }
    if (a < .22 && el !== 'dark') star(ctx, x, y, R((4 + 3 * k) * (1 - a * 2.2)), P.hi, P.mid, 1, P.ink);
    switch (el) {
      case 'physical': {
        const n = k > 1 ? 8 : 6;
        for (let i = 0; i < n; i++) streak(ctx, x, y, (i + .5 * hash(f.id, i)) / n * TAU, 4 + a * 14 * k, Math.max(1, R(fade * 5 * k)), P.hi, P.mid, fade, 2);
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI * (.1 + .8 * hash(f.id, i + 7)), v = 30 + 34 * hash(f.id, i + 3);
          fill(ctx, x + Math.cos(ang) * v * tt, y + Math.sin(ang) * v * tt + 130 * tt * tt, 2, 2, P.lo, fade);
        }
        break;
      }
      case 'fire': {
        for (let i = 0; i < 3; i++) {
          const h = R((1 - a) * (i === 1 ? 12 : 8) * k), ox = x + (i - 1) * 4 + R(Math.sin(tt * 30 + i * 2)), base = y + 3 - R(a * 10);
          for (let j = 0; j < h; j++) {
            const w = j < h * .4 ? 3 : j < h * .75 ? 2 : 1;
            fill(ctx, ox - (w >> 1), base - j, w, 1, j < h * .3 ? P.hi : j < h * .65 ? P.mid : P.lo, fade);
          }
        }
        burst(ctx, f, 'fire', 10, k, a);
        break;
      }
      case 'water': {
        const rx = (5 + 16 * a) * k;
        oval(ctx, x, R(f.y), rx, rx * .4, P.mid, fade * .9, 1.5);
        if (a > .2) oval(ctx, x, R(f.y), rx * .6, rx * .24, P.lo, fade * .7);
        for (let i = 0; i < 6; i++) {
          const ang = -Math.PI * (.12 + .76 * i / 5), v = (48 + 16 * hash(f.id, i)) * k;
          const sx = x + Math.cos(ang) * v * tt, sy = y + Math.sin(ang) * v * tt + 250 * tt * tt;
          fill(ctx, sx, sy, 2, 3, P.mid, fade); dot(ctx, sx, sy, P.hi, fade);
        }
        burst(ctx, f, 'water', 6, k, a, 60);
        break;
      }
      case 'ice': {
        if (a < .3) for (let i = 0; i < 6; i++) streak(ctx, x, y, i / 6 * TAU, 2, R(6 * k * (1 - a * 3)) + 1, P.hi, P.mid, 1);
        for (let i = 0; i < 6; i++) {
          const ang = (i + hash(f.id, i)) / 6 * TAU, r = (8 + 18 * k) * (1 - Math.exp(-6 * tt));
          shard(ctx, x + Math.cos(ang) * r, y + Math.sin(ang) * r * .8, P, fade);
        }
        burst(ctx, f, 'ice', 6, k, a, 20);
        break;
      }
      case 'lightning': {
        if (a < .6) {
          const frame = (tt * 15) | 0;
          for (let i = 0; i < 4; i++) zigzag(ctx, x, y, (i + hash(f.id, i)) / 4 * TAU, (12 + 6 * hash(f.id, i + 9)) * k, f.id * 31 + i * 7 + frame, P, 1 - a / .6);
        }
        burst(ctx, f, 'lightning', 8, k, a, 30);
        break;
      }
      case 'dark': {
        burst(ctx, f, 'dark', 12, k, a);
        if (a < .55) {
          fill(ctx, x - 3, y - 2, 7, 5, P.ink, .7); fill(ctx, x - 2, y - 3, 5, 7, P.ink, .7);
          fill(ctx, x - 2, y - 1, 5, 3, P.lo, 1); fill(ctx, x - 1, y - 2, 3, 5, P.lo, 1);
          fill(ctx, x - 1, y - 1, 3, 3, P.mid, 1); dot(ctx, x, y, P.hi, 1);
        }
        if (a > .4) {
          const u = (a - .4) / .6, rr = (4 + 16 * u) * k;
          oval(ctx, x, y, rr, rr * .7, P.mid, 1 - u, 2); oval(ctx, x, y, rr * .7, rr * .49, P.lo, (1 - u) * .7);
        }
        break;
      }
      case 'light': {
        const grow = a < .3 ? a / .3 : 1 - (a - .3) / .7;
        for (let i = 0; i < 8; i++) {
          const len = R(grow * (i % 2 ? 7 : 12) * k);
          if (len > 0) streak(ctx, x, y, i / 8 * TAU, 3, len, i % 2 ? P.mid : P.hi, P.lo, fade, i % 2 ? 1 : 2);
        }
        burst(ctx, f, 'light', 6, k, a, 40);
        break;
      }
    }
    if (k > 1) {
      // Colpo forte (terzo colpo della combo): onda d'urto e linee di impatto.
      const rr = 5 + 22 * a;
      oval(ctx, x, y, rr, rr * .55, P.hi, (1 - a) * .95, 2);
      for (let i = 0; i < 4; i++) streak(ctx, x, y, i / 4 * TAU + .4, 9 + 12 * a, R(7 * fade) + 1, '#ffffff', P.mid, fade, 2);
    }
  }

  // Stato degli effetti propri (si azzerano col cambio di regione e con resetTransient del motore).
  const live = [];
  let serial = 1, ghosts = [], dashUntil = -1, lastGhost = -1;
  const ghostCache = new Map();
  function emit(type, d, s) {
    if (!s || !d || !Number.isFinite(d.x) || !Number.isFinite(d.y)) return;
    const t = s.time;
    if (type === 'dash') { dashUntil = t + .2; lastGhost = -1; return; }
    if (!Object.hasOwn(LIFE, type)) return;
    const el = d.tag ? d.tag.el : d.type ? MONSTER[d.type] || 'physical' : d.race ? RACE[d.race] || 'physical' : 'physical';
    const strong = !!d.tag?.strong;
    live.push({type, t0: t, life: LIFE[type] * (strong ? 1.35 : 1) * (type === 'defeat' && d.boss ? 2.4 : 1), x: d.x, y: d.y,
      el, accent: d.tag?.accent || null, strong, id: serial++, region: s.region, boss: !!d.boss, legendary: !!d.legendary,
      shield: !!d.shield, phase: d.phase || 0});
    if (live.length > 48) live.splice(0, live.length - 48);
  }
  function reset() { live.length = 0; ghosts = []; dashUntil = -1; }

  function ghostImage(p) {
    const form = p.form === null || p.form === undefined ? 0 : (p.evolutionStage - 1) * 2 + p.form + 1;
    const key = p.race + '|' + p.dir + '|' + form;
    let c = ghostCache.get(key);
    if (!c && window.ActorArt?.draw) {
      if (ghostCache.size > 12) ghostCache.clear();
      c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      window.ActorArt.draw(g, p.race, 32, 56, {dir: p.dir, evolution: form, moving: true, t: 0});
      g.globalCompositeOperation = 'source-in'; g.fillStyle = GHOST; g.fillRect(0, 0, 64, 64);
      ghostCache.set(key, c);
    }
    return c;
  }
  function drawGhosts(ctx, p, t) {
    if (t < dashUntil && (lastGhost < 0 || t - lastGhost >= .035)) {
      lastGhost = t;
      ghosts.push({x: p.x, y: p.y, t, img: ghostImage(p)});
      if (ghosts.length > 8) ghosts.shift();
    }
    ghosts = ghosts.filter(g => t - g.t < .24 && t >= g.t);
    for (const g of ghosts) {
      if (!g.img || Math.hypot(g.x - p.x, g.y - p.y) < 7) continue;
      ctx.globalAlpha = .42 * (1 - (t - g.t) / .24);
      ctx.drawImage(g.img, R(g.x) - 32, R(g.y) - 56);
    }
  }

  // Decorazioni dell'elemento lungo un'ellisse (anelli d'urto, aure): n punti, rotazione rot, fase k (0..1).
  function rim(ctx, el, P, x, y, rx, ry, n, rot, k, alpha) {
    for (let i = 0; i < n; i++) {
      const ang = i / n * TAU + rot, px = x + Math.cos(ang) * rx, py = y + Math.sin(ang) * ry;
      switch (el) {
        case 'fire': {
          const h = 4 + ((i + ((k * 14) | 0)) % 3);
          fill(ctx, px - 1, py - h, 2, h, P.mid, alpha); fill(ctx, px - 1, py - 2, 2, 2, P.hi, alpha); fill(ctx, px - 1, py - h - 1, 1, 2, P.lo, alpha * .85);
          break;
        }
        case 'ice': shard(ctx, px, py, P, alpha); break;
        case 'lightning':
          if (i % 2 === 0) {
            const a2 = (i + 1) / n * TAU + rot;
            zigzag(ctx, px, py, Math.atan2(Math.sin(a2) * ry - Math.sin(ang) * ry, Math.cos(a2) * rx - Math.cos(ang) * rx), Math.max(3, rx * TAU / n * .8), i * 13 + ((k * 12) | 0), P, alpha);
          }
          break;
        case 'dark': fill(ctx, px - Math.cos(ang) * 4 - 1, py - Math.sin(ang) * 3, 4, 2, P.lo, alpha * .85); fill(ctx, px, py, 2, 2, P.mid, alpha); break;
        case 'light': streak(ctx, px, py, ang, 1, 5, P.hi, P.mid, alpha, i % 2 ? 1 : 2); break;
        case 'water': fill(ctx, px - 2, py, 4, 1, P.mid, alpha); fill(ctx, px, py - 2 - R(k * 4), 2, 2, P.mid, alpha * .9); dot(ctx, px, py - 2 - R(k * 4), P.hi, alpha); break;
        default: fill(ctx, px - 1, py - 1, 3, 2, P.lo, alpha * .85); dot(ctx, px, py - 1, P.hi, alpha * .7);
      }
    }
  }
  // Aura dei boss impegnati: cresce con la fase (II: sigillo a terra, III: più particelle).
  function aura(ctx, m, el, phase, legendary, t) {
    const P = PAL[el], x = R(m.x), y = R(m.y);
    if (phase >= 2) {
      const rx = 26 + (phase - 2) * 6;
      oval(ctx, x, y, rx, rx * .4, P.ink, .3, 3);
      oval(ctx, x, y, rx, rx * .4, P.mid, .6, 1.5);
      if (phase >= 3) oval(ctx, x, y, rx * .72, rx * .29, P.lo, .5);
      if (!still) rim(ctx, el, P, x, y, rx, rx * .4, phase >= 3 ? 10 : 8, t * .5, (t * .9) % 1, .9);
    }
    if (still) return;
    const n = 4 + 4 * (phase - 1) + (legendary ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const h = hash(m.id * 7 + i, 3), period = 1.3 + .6 * h, u = ((t / period) + h) % 1;
      let ang = h * TAU, rr = 16 + 12 * hash(m.id, i + 11);
      if (el === 'ice') ang += t * .8;
      if (el === 'dark') rr *= 1 - u * .7;
      let px = x + Math.cos(ang) * rr, py = y - 4 + Math.sin(ang) * rr * .4;
      if (el === 'fire' || el === 'light') py -= u * 30;
      else if (el === 'water') { py -= u * 20; px += Math.sin(u * 9 + i) * 1.5; }
      else if (el !== 'ice' && el !== 'dark') py -= u * 14;
      if (el === 'lightning') { if (u < .25) zigzag(ctx, px, py - 14, h * TAU, 9, (t * 12 | 0) + i, P, 1 - u / .25); continue; }
      if (el === 'ice' && i % 3 === 0) { shard(ctx, px, py - 10, P, Math.sin(u * Math.PI)); continue; }
      mote(ctx, el, P, px, py, u, h, Math.sin(u * Math.PI));
    }
    if (legendary) for (let i = 0; i < 3; i++) {
      const u = ((t * .6) + i / 3) % 1;
      star(ctx, x + Math.cos(i / 3 * TAU + t) * 20, y - 30 - u * 12, 2, '#ffffff', '#ffe08a', Math.sin(u * Math.PI));
    }
  }
  function sigil(ctx, x, y, rx, ry, P, alpha, rot) {
    oval(ctx, x, y, rx, ry, P.ink, alpha * .35, 3);
    oval(ctx, x, y, rx, ry, P.mid, alpha * .95, 1.5); oval(ctx, x, y, rx * .72, ry * .72, P.lo, alpha * .75);
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * TAU + rot, gx = x + Math.cos(ang) * rx * .86, gy = y + Math.sin(ang) * ry * .86;
      if (i % 2) { fill(ctx, gx - 1, gy - 2, 3, 5, P.ink, alpha * .4); fill(ctx, gx, gy - 1, 1, 3, P.hi, alpha); }
      else { fill(ctx, gx - 2, gy - 1, 5, 3, P.ink, alpha * .4); fill(ctx, gx - 1, gy, 3, 1, P.hi, alpha); }
    }
  }
  function pillar(ctx, x, y, w, h, P, alpha) {
    if (alpha <= .02 || w < 1) return;
    fill(ctx, x - w, y - h, 2 * w + 1, h, P.mid, alpha * .3);
    fill(ctx, x - R(w / 2), y - h, w + 1, h, P.mid, alpha * .35);
    fill(ctx, x - 1, y - h, 3, h, P.hi, alpha * .7);
  }

  function drawLive(ctx, f, t) {
    const a = Math.min(1, Math.max(0, (t - f.t0) / f.life)), P = PAL[f.el];
    switch (f.type) {
      case 'hit':
        impact(ctx, f, f.el, a, f.strong ? 1.5 : 1);
        if (f.accent && !still) burst(ctx, f, f.accent, 5, 1, a, 100);
        break;
      case 'hurt': {
        if (f.shield) {
          ctx.setLineDash([3, 2]); oval(ctx, R(f.x), R(f.y - 12), 13, 15, '#91dbff', (1 - a) * .95, 2); ctx.setLineDash([]);
          break;
        }
        if (still) break;
        const tt = a * f.life;
        for (let i = 0; i < 7; i++) {
          const ang = -Math.PI * (.05 + .9 * (i + hash(f.id, i)) / 7), r = 11 + (44 + 22 * hash(f.id, i + 5)) * tt;
          mote(ctx, f.el, P, f.x + Math.cos(ang) * r, f.y - 12 + Math.sin(ang) * r * .9, a, hash(f.id, i), 1 - a);
        }
        break;
      }
      case 'dodge': {
        const fade = 1 - a;
        star(ctx, R(f.x + 10), R(f.y - 26), still ? 3 : R(4 * fade) + 1, '#ffffff', GHOST, fade, '#1d3a40');
        if (still) break;
        ctx.globalAlpha = fade; ctx.lineWidth = 2;
        for (const [color, grow] of [[GHOST, 0], ['#ffffff', -2]]) {
          ctx.strokeStyle = color;
          for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.ellipse(R(f.x), R(f.y - 11), 14 + 5 * a + grow, 16 + 5 * a + grow, 0, side < 0 ? Math.PI * .65 : -Math.PI * .35, side < 0 ? Math.PI * 1.35 : Math.PI * .35); ctx.stroke();
          }
          ctx.lineWidth = 1;
        }
        break;
      }
      case 'phase': {
        // Trasformazione del boss: sigillo che si apre, colonna di luce, onda d'urto e particelle dell'elemento.
        const x = R(f.x), y = R(f.y), grow = Math.min(1, a / .22), fade = a < .75 ? 1 : (1 - a) / .25, rx = 12 + 30 * grow;
        sigil(ctx, x, y, rx, rx * .42, P, fade, still ? 0 : a * 1.6);
        if (still) break;
        if (a < .7) pillar(ctx, x, y, R(14 * (1 - a / .7)) + 1, 90, P, 1 - a / .7);
        if (a < .6) { const r = 10 + 80 * a; oval(ctx, x, y, r, r * .45, P.hi, (1 - a / .6) * .9, 2); }
        burst(ctx, f, f.el, 24, 2, a);
        if (f.legendary) for (let i = 0; i < 10; i++) {
          const ang = i / 10 * TAU + a * 2;
          star(ctx, x + Math.cos(ang) * 32, y - 14 + Math.sin(ang) * 12 - a * 24, 2, '#ffffff', '#ffe08a', 1 - a);
        }
        break;
      }
      case 'defeat': {
        const x = R(f.x), y = R(f.y), fade = 1 - a;
        if (still) { oval(ctx, x, y - 7, 10, 6, P.mid, fade, 2); break; }
        const n = f.boss ? 30 : 12, tt = a * f.life;
        for (let i = 0; i < n; i++) {
          const h = hash(f.id, i), ang = h * TAU, r = (f.boss ? 26 : 10) * hash(f.id, i + 30);
          mote(ctx, f.el, P, x + Math.cos(ang) * r + Math.sin(tt * 4 + i) * 2, y - 8 + Math.sin(ang) * r * .5 - (26 + 22 * h) * tt, a, h, fade);
        }
        const rr = f.boss ? 12 + 64 * a : 4 + 14 * a;
        oval(ctx, x, y - (f.boss ? 0 : 7), rr, rr * .5, P.hi, fade * .85, 1.5);
        if (f.boss) {
          if (a < .6) pillar(ctx, x, y, R(16 * (1 - a / .6)) + 1, 100, P, 1 - a / .6);
          if (a > .2) { const r2 = 12 + 54 * (a - .2); oval(ctx, x, y, r2, r2 * .45, P.mid, fade * .75, 2); }
        }
        break;
      }
      case 'evolve': {
        // Trasformazione del personaggio: cerchio, colonne e scintille intorno alla figura, mai sopra.
        const x = R(f.x), y = R(f.y), fade = a < .8 ? 1 : (1 - a) / .2;
        sigil(ctx, x, y, 18, 7, P, fade, still ? 0 : a * 2.2);
        if (still) break;
        const h = R(44 * Math.min(1, a / .3));
        for (const side of [-1, 1]) {
          fill(ctx, x + side * 11 - (side < 0 ? 1 : 0), y - h, 2, h, P.hi, fade * .75);
          fill(ctx, x + side * 14, y - R(h * .7), 1, R(h * .7), P.mid, fade * .55);
        }
        for (let i = 0; i < 14; i++) {
          const hh = hash(f.id, i), side = i % 2 ? 1 : -1, u = (a * 1.6 + hh) % 1;
          mote(ctx, f.el, P, x + side * (11 + 9 * hh), y - 2 - u * 40, u, hh, fade * Math.sin(u * Math.PI));
        }
        if (a > .35 && a < .8) { const u = (a - .35) / .45, r = 14 + 44 * u; oval(ctx, x, y, r, r * .45, P.hi, 1 - u, 2); }
        if (a > .45) for (let i = 0; i < 3; i++) star(ctx, x - 9 + i * 9, y - 34 - (i % 2) * 4, 2, '#ffffff', P.mid, fade * Math.sin((a * 3 + i) * Math.PI) ** 2);
        break;
      }
    }
  }

  function begin(scene) {
    still = calm();
    const p = scene?.player;
    mask = p ? {l: R(p.x) - 8, r: R(p.x) + 9, t: R(p.y) - 26, b: R(p.y) + 1} : null;
    placed = [];
  }
  function draw(ctx, layer, scene) {
    if (!scene || layer !== 'under') return;
    begin(scene);
    const t = scene.t, region = scene.region;
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i];
      if (f.region !== region || t < f.t0 || t - f.t0 > f.life) live.splice(i, 1);
    }
    ctx.save();
    for (const m of scene.monsters || []) {
      const def = scene.codex?.[m.type];
      if (!def?.boss || m.hp <= 0 || !m.engaged) continue;
      aura(ctx, m, MONSTER[m.type] || 'physical', m.phase || 1, !!def.legendary, t);
    }
    if (!still) for (const h of scene.hazards || []) {
      if (!h.tag) continue;
      const P = PAL[h.tag.el] || PAL.physical, n = 3 + R(h.r / 6);
      for (let i = 0; i < n; i++) {
        const hh = hash(R(h.x) * 13 + i, R(h.y)), u = (t * (.8 + .4 * hh) + hh) % 1, ang = hh * TAU, r = h.r * .75 * hash(i, R(h.x));
        mote(ctx, h.tag.el, P, h.x + Math.cos(ang) * r, h.y + Math.sin(ang) * r * .7 - (h.tag.el === 'fire' || h.tag.el === 'light' ? u * 8 : 0), u, hh, Math.sin(u * Math.PI) * .9);
      }
    }
    if (!still && scene.player) drawGhosts(ctx, scene.player, t); else ghosts = [];
    if (scene.player) { const m0 = mask; mask = null; comboPips(ctx, scene.player, scene.combo, t); mask = m0; }
    for (const f of live) drawLive(ctx, f, t);
    ctx.restore();
  }

  // Effetti del motore con etichetta: arco del colpo, anello d'urto e scintille.
  function effect(ctx, f, scene) {
    const tg = f.tag, P = PAL[tg.el] || PAL.physical, alpha = Math.min(1, f.ttl * 5), x = Math.round(f.x), y = Math.round(f.y);
    switch (f.kind) {
      case 'arc': {
        const k = 1 - f.ttl / f.duration, r = f.r * (.77 + .23 * k), a0 = f.angle - 1.1 + k * .7, a1 = f.angle + .8 + k * .45;
        const strong = tg.strong;
        if (f.reach) reachSector(ctx, f, P, k);
        ctx.globalAlpha = alpha * .55; ctx.strokeStyle = P.lo; ctx.lineWidth = strong ? 4.5 : 3.5;
        ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
        ctx.globalAlpha = alpha; ctx.strokeStyle = tg.el === 'physical' ? f.color : P.mid; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
        ctx.strokeStyle = P.hi; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r - .5, a0 + .25, a1); ctx.stroke();
        if (strong) { ctx.globalAlpha = alpha * .7; ctx.beginPath(); ctx.arc(x, y, r + 4, a0 + .4, a1 - .1); ctx.stroke(); }
        ctx.lineWidth = 1;
        if (!still) {
          const el = tg.el === 'physical' && tg.accent ? tg.accent : tg.el, PP = PAL[el];
          for (let i = 0; i < 5; i++) {
            const ang = a0 + (a1 - a0) * (i + .5) / 5, rr = r + 2 + k * 6 * (i % 2 ? 1 : .5);
            mote(ctx, el, PP, x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, k, i / 5, alpha * (i + 1) / 5);
          }
        }
        break;
      }
      case 'ring': {
        const k = 1 - f.ttl / f.duration, r = Math.max(.2, f.r * k), sp = scene?.player;
        if (sp && Math.abs(f.x - sp.x) < 2 && Math.abs(f.y - sp.y) < 2 && r < 10) break;
        oval(ctx, x, y, r, r * .7, P.ink, alpha * (tg.hostile ? .6 : .35), 4);
        oval(ctx, x, y, r, r * .7, P.mid, alpha, 2);
        oval(ctx, x, y, r * .86, r * .6, P.lo, alpha * .6);
        if (still) break;
        rim(ctx, tg.el, P, x, y, r, r * .7, Math.max(6, Math.min(16, R(r / 5))), k * .6, k, alpha);
        break;
      }
      case 'dust': {
        const a = 1 - Math.min(1, f.ttl / .5);
        if (still) break; // effetti ridotti: niente particelle in volo (resta il simbolo fermo dell'impatto)
        mote(ctx, tg.el, P, x, y, a, (x * 7 + y) % 5 / 5, alpha);
        break;
      }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  // Settore reale del colpo (RPG Evolution, incremento 2): la portata e il cono che il motore usa davvero
  // (`dx*vx+dy*vy > cone`, distanza ≤ portata, sempre a segno entro 15 px), tenue e solo nel primo istante.
  function reachSector(ctx, f, P, k) {
    if (k > .55) return;
    const x = Math.round(f.x), y = Math.round(f.y + 7), half = f.cone <= -1 ? Math.PI : Math.acos(Math.max(-1, Math.min(1, f.cone)));
    const a = (1 - k / .55) * (still ? .7 : 1), path = () => {
      ctx.beginPath();
      if (half >= Math.PI) ctx.arc(x, y, f.reach, 0, TAU);
      else { ctx.moveTo(x, y); ctx.arc(x, y, f.reach, f.angle - half, f.angle + half); ctx.closePath(); }
    };
    ctx.save();
    if (mask) { ctx.beginPath(); ctx.rect(x - f.reach - 4, y - f.reach - 4, f.reach * 2 + 8, f.reach * 2 + 8); ctx.rect(mask.l, mask.t, mask.r - mask.l, mask.b - mask.t); ctx.clip('evenodd'); }
    path(); ctx.globalAlpha = a * .13; ctx.fillStyle = P.mid; ctx.fill();
    ctx.globalAlpha = a * .45; ctx.strokeStyle = P.hi; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  // Tacche della combo: tre punti ai piedi del personaggio; pieni i colpi già messi a segno, il terzo pulsa quando è il colpo forte.
  function comboPips(ctx, p, combo, t) {
    if (!combo || combo.stage <= 0 || combo.left <= 0) return;
    const fade = Math.min(1, combo.left / .35), x0 = Math.round(p.x) - 7, y = Math.round(p.y) + 4;
    for (let i = 0; i < 3; i++) {
      const on = i < combo.stage, next = i === combo.stage && combo.stage === 2, x = x0 + i * 6;
      fill(ctx, x - 1, y - 1, 4, 4, '#1d2129', fade * .7);
      fill(ctx, x, y, 2, 2, on ? '#ffd88d' : next ? (still || Math.sin(t * 12) > 0 ? '#fff3c4' : '#a8844a') : '#4a4236', fade);
    }
  }

  // Proiettile con la forma del suo elemento. I proiettili nemici hanno un bordo scuro: restano leggibili.
  function shot(ctx, b, scene) {
    const el = b.tag.el, P = PAL[el] || PAL.physical, x = Math.round(b.x), y = Math.round(b.y - 7), t = scene?.t || 0;
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    mask = null;
    if (!still) for (let i = 1; i <= 3; i++) {
      const tx = x - ux * i * 3, ty = y - uy * i * 3, a = 1 - i / 4;
      if (el === 'fire') fill(ctx, tx, ty, 2, 2, i < 2 ? P.mid : i < 3 ? P.lo : P.smoke, a);
      else if (el === 'dark') fill(ctx, tx, ty, 2, 1, P.lo, a);
      else if (el === 'physical') fill(ctx, tx - 1, ty - 1, 3, 2, b.color, a * .5);
      else dot(ctx, tx, ty, i < 2 ? P.mid : P.lo, a);
    }
    if (b.hostile) { fill(ctx, x - 4, y - 2, 9, 5, P.ink, .85); fill(ctx, x - 2, y - 4, 5, 9, P.ink, .85); }
    switch (el) {
      case 'fire': {
        const fl = still ? 0 : ((t * 20) | 0) % 2;
        fill(ctx, x - 3, y - 1, 7, 3, P.mid, 1); fill(ctx, x - 1, y - 3, 3, 7, P.mid, 1);
        fill(ctx, x - 1, y - 1, 3, 3, P.hi, 1); dot(ctx, x - fl, y - 3 - fl, P.lo, 1);
        break;
      }
      case 'water':
        fill(ctx, x - 2, y - 3, 5, 1, P.mid, 1); fill(ctx, x - 2, y + 3, 5, 1, P.mid, 1); fill(ctx, x - 3, y - 2, 1, 5, P.mid, 1); fill(ctx, x + 3, y - 2, 1, 5, P.mid, 1);
        fill(ctx, x - 2, y - 2, 5, 5, P.lo, .55); dot(ctx, x - 1, y - 1, P.hi, 1); dot(ctx, x, y - 1, P.hi, 1);
        break;
      case 'ice':
        for (let i = -3; i <= 3; i++) {
          const w = Math.abs(i) <= 1 ? 1 : 0;
          dot(ctx, x + ux * i, y + uy * i, Math.abs(i) <= 1 ? P.hi : P.mid, 1);
          if (w) { dot(ctx, x + ux * i - uy, y + uy * i + ux, P.lo, 1); dot(ctx, x + ux * i + uy, y + uy * i - ux, P.lo, 1); }
        }
        break;
      case 'lightning': {
        fill(ctx, x - 1, y - 1, 3, 3, P.hi, 1); fill(ctx, x - 2, y, 5, 1, P.mid, 1); fill(ctx, x, y - 2, 1, 5, P.mid, 1);
        const j = still ? 0 : ((t * 15) | 0) % 4, dx = [3, -3, 2, -2][j], dy = [-2, 2, 3, -3][j];
        dot(ctx, x + dx, y + dy, P.mid, 1); dot(ctx, x + dx - Math.sign(dx), y + dy, P.lo, 1); dot(ctx, x - dx, y - dy, P.lo, 1);
        break;
      }
      case 'dark':
        fill(ctx, x - 2, y - 3, 5, 7, P.lo, 1); fill(ctx, x - 3, y - 2, 7, 5, P.lo, 1);
        fill(ctx, x - 1, y - 1, 3, 3, P.mid, 1); dot(ctx, x, y, P.hi, 1);
        break;
      case 'light':
        fill(ctx, x - 3, y, 7, 1, P.mid, 1); fill(ctx, x, y - 3, 1, 7, P.mid, 1);
        dot(ctx, x - 2, y - 2, P.lo, 1); dot(ctx, x + 2, y - 2, P.lo, 1); dot(ctx, x - 2, y + 2, P.lo, 1); dot(ctx, x + 2, y + 2, P.lo, 1);
        fill(ctx, x - 1, y - 1, 3, 3, P.hi, 1);
        break;
      default:
        fill(ctx, x - 3, y - 1, 7, 3, b.color, 1); fill(ctx, x - 1, y - 3, 3, 7, b.color, 1); fill(ctx, x - 1, y - 1, 3, 3, '#fff8dc', 1);
    }
    ctx.globalAlpha = 1;
  }

  // Numeri e scritte: contorno scuro su tutti i lati; il colpo forte è più grande e dorato.
  const lift = new WeakMap();
  let placed = [];
  function label(ctx, f) {
    const strong = !!f.tag?.strong && typeof f.text === 'number', x = Math.round(f.x);
    const w = String(f.text).length * (strong ? 7 : 5) + 2, h = strong ? 11 : 9;
    let dy = lift.get(f);
    if (dy === undefined) {
      dy = 0;
      for (let k = 0; k < 4 && placed.some(r => Math.abs(r.x - x) * 2 < r.w + w && Math.abs(r.y - (Math.round(f.y) - dy)) * 2 < r.h + h); k++) dy += h;
      lift.set(f, dy);
    }
    const y = Math.round(f.y) - dy;
    placed.push({x, y, w, h});
    ctx.globalAlpha = Math.min(1, f.ttl * 5); ctx.textAlign = 'center';
    ctx.font = strong ? 'bold 11px monospace' : 'bold 8px monospace';
    ctx.fillStyle = '#1d2129';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.fillText(f.text, x + dx, y + dy);
    ctx.fillStyle = strong ? '#fff0b8' : f.color; ctx.fillText(f.text, x, y);
    ctx.font = 'bold 8px monospace'; ctx.globalAlpha = 1;
  }

  const elementOf = src => tag(src)?.el || null;
  window.CombatFX = Object.freeze({
    palette: PAL, races: RACE, monsters: MONSTER, tag, emit, reset, draw, effect, shot, label, elementOf, calm,
    debug: () => ({live: live.map(f => f.type + ':' + f.el), ghosts: ghosts.length, tags: tags.size})
  });
})();
