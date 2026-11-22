/* Sprite dedicati delle stirpi continentali: Scheletro errante, Orso dei larici e Viverna di brina.
   Prima queste stirpi prendevano in prestito il disegno di altre specie (fuoco fatuo, lupo, drago) con qualche
   rettangolo sopra. Qui ognuna ha un piano corporeo proprio (bipede d'ossa, quadrupede massiccio, rettile alato),
   un volto leggibile, fronte/retro/lato, passo a due tempi, posa d'attacco, lampo del colpo e forme evolutive che
   cambiano la sagoma oltre ai colori. Coordinate intere relative ai piedi; asse di simmetria fra le colonne -1 e 0.
   Metodo riutilizzabile (vedi GAME_DESIGN.md, «Sprite delle stirpi»): piano corporeo per vista → forma (ramo A
   offensivo, accento caldo; ramo B di sostegno, accento freddo; secondo stadio con sagoma più grande e un elemento
   nuovo) → pose (passo, attesa, attacco) → contorno d'inchiostro e lampo del colpo comuni, fotogrammi in memoria. */
(() => {
  'use strict';
  const base = window.ActorArt;
  const SIZE = 96, AX = 48, AY = 88;
  const R = Math.round;
  let C = null;
  function px(col, x, y, w = 1, h = 1) { C.fillStyle = col; C.fillRect(R(x), R(y), w, h); }
  // Ovale di larghezza pari, simmetrico rispetto alla linea cx.
  function ov(col, cx, cy, rx, ry) {
    for (let j = -ry; j <= ry; j++) {
      const dx = Math.max(1, R(rx * Math.sqrt(Math.max(0, 1 - (j / (ry + .5)) ** 2))));
      px(col, cx - dx, cy + j, dx * 2, 1);
    }
  }
  function ln(col, pts, w = 1) {
    for (let k = 2; k < pts.length; k += 2) {
      const x0 = pts[k - 2], y0 = pts[k - 1], dx = pts[k] - x0, dy = pts[k + 1] - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
      for (let i = 0; i <= n; i++) px(col, Math.floor(x0 + dx * i / n), Math.floor(y0 + dy * i / n), w, w);
    }
  }
  function poly(col, pts) {
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < pts.length; i += 2) { minY = Math.min(minY, pts[i]); maxY = Math.max(maxY, pts[i]); }
    for (let y = Math.ceil(minY); y <= maxY; y++) {
      const xs = [];
      for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const ay = pts[j + 1], by = pts[i + 1];
        if ((ay > y + .01) !== (by > y + .01)) xs.push(pts[j] + (y + .01 - ay) * (pts[i] - pts[j]) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) px(col, Math.ceil(xs[i]), y, Math.max(1, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1), 1);
    }
    ln(col, [...pts, pts[0], pts[1]]);
  }
  // Disegna una parte e la sua immagine speculare (vista di fronte o di spalle).
  function sym(fn) { fn(1); C.save(); C.scale(-1, 1); fn(-1); C.restore(); }

  /* ---------------------------------------------------------------- Scheletro errante */
  const BONE = { d: '#7d7264', m: '#b8ad94', l: '#e2d8bd', h: '#fbf3da' }, HOLE = '#241d2c';
  const RAG = ['#463b4f', '#62566c'];
  const STEEL = { d: '#4f5866', m: '#7d8895', l: '#aab5bd', h: '#d8e0e3' }, RUST = '#a5603e', WOOD = '#5b3e2e';
  const HOOD = { d: '#2f2a40', m: '#4a4362', l: '#6c6488' }, ROPE = '#b59a62', BRONZE = '#8a6a3a';
  const KNIGHT = { d: '#8a8375', m: '#cfc7b1', l: '#efe8d4', h: '#fffaea' }, GOLD = '#d6a548', GOLDL = '#ffe08a', CAPE = ['#5f2b39', '#843f4e'];
  const VIGIL = { d: '#28243e', m: '#433d66', l: '#665d92' }, TRIM = '#d9c58a', WAX = '#ebe0c6';
  function skull(view, glow, small) {
    const B = BONE;
    if (view === 'side') {
      ov(B.m, 1, -22, small ? 4 : 5, small ? 3 : 4); ov(B.l, 1, -23, small ? 3 : 4, small ? 2 : 3);
      px(B.d, small ? -3 : -4, -24, 1, 4); px(HOLE, 2, -22, 3, 2); px(glow, 3, -22);
      px(HOLE, 5, -20); px(B.d, 1, -20, 2, 1); px(B.l, 1, -18, 5, 1); px(HOLE, 3, -18); px(B.m, 1, -17, 4, 1);
      return;
    }
    if (small) { ov(B.l, 0, -21, 4, 3); px(B.m, -3, -19, 6, 1); }
    else { ov(B.m, 0, -22, 5, 4); ov(B.l, 0, -23, 4, 3); px(B.h, -3, -25, 3, 1); }
    if (view === 'back') {
      px(B.d, 1, -25, 1, 2); px(B.d, 2, -23, 1, 2); px(B.d, 1, -21); px(B.d, -2, -19, 4, 1);
      return;
    }
    if (small) { px(HOLE, -3, -22, 2, 2); px(HOLE, 1, -22, 2, 2); px(glow, -2, -22); px(glow, 1, -22); px(HOLE, -1, -20, 2, 1); px(B.m, -2, -18, 4, 1); return; }
    px(HOLE, -4, -22, 3, 2); px(HOLE, 1, -22, 3, 2); px(glow, -3, -22); px(glow, 2, -22);
    px(HOLE, -1, -20, 2, 1);
    px(B.l, -3, -18, 6, 1); px(HOLE, -2, -18); px(HOLE, 1, -18); px(B.m, -2, -17, 4, 1);
  }
  function skeleton(view, form, step, attack, flick) {
    const B = BONE, warm = form === 1 || form === 3;
    const glow = flick ? (warm ? '#fff0b8' : '#e4fff6') : (warm ? '#ffb54f' : '#6fe8cf');
    const walk = step < 2, lA = walk && step === 0 ? 1 : 0, rA = walk && step === 1 ? 1 : 0, sw = walk ? (step ? 1 : -1) : 0;
    const robe = form === 2 || form === 4, knight = form === 3;
    if (view === 'side') {
      const nf = walk ? (step === 0 ? 2 : -2) : 1, ff = walk ? -nf : -1;
      if (knight) poly(CAPE[0], [-3, -16, 0, -16, -2, -4, -6, -3]);
      if (form === 4) {
        for (const [x, y] of [[-8, -22], [-7, -27], [-3, -30], [2, -31]]) { px(WAX, x, y, 1, 2); px(flick ? '#fff1bf' : '#ffcf6a', x, y - 1); }
        ln('#6b5038', [6, -1, 6, -30]); px(GOLD, 4, -35, 4, 1); px(GOLD, 4, -32, 4, 1); px(GOLD, 4, -34, 1, 2); px(GOLD, 7, -34, 1, 2); px(glow, 5, -34, 2, 2);
      }
      if (robe) {
        const P = form === 2 ? HOOD : VIGIL;
        poly(P.m, form === 2 ? [-3, -17, 2, -17, 4, -3, -4, -2] : [-3, -17, 2, -17, 5, -1, -5, -1]);
        px(P.d, -2, -12, 1, 10); px(P.l, 1, -16, 1, 13);
        px(B.m, nf, -1, 2, 1);
        if (form === 2) { px(ROPE, -3, -11, 6, 1); px(ROPE, -3, -10, 1, 3); }
        else { px(TRIM, 2, -16, 1, 14); px(TRIM, -4, -3, 2, 1); px(TRIM, 0, -3, 2, 1); px(VIGIL.d, -5, -2, 10, 1); }
      } else {
        const L = knight ? KNIGHT : B;
        ln(knight ? KNIGHT.d : B.d, [0, -9, ff, -2], 2); px(knight ? KNIGHT.d : B.d, ff, -1, 3, 1);
        ln(L.l, [0, -9, nf, -2], 2); px(knight ? GOLD : B.h, R(nf / 2), -5, 2, 1); px(L.m, nf, -1, 3, 1);
        if (knight) { px(KNIGHT.d, -2, -11, 5, 3); px(GOLD, -2, -11, 5, 1); }
        else { px(B.m, -2, -10, 4, 2); px(RAG[0], -2, -10, 4, 3); px(RAG[1], -1, -10, 2, 2); px(RAG[0], 1, -7); }
      }
      if (!robe) {
        if (form === 1) { poly(STEEL.m, [-2, -16, 3, -16, 4, -12, 2, -10, -2, -10]); px(STEEL.l, 1, -15, 2, 2); px(RUST, 0, -12); }
        else if (knight) { poly(KNIGHT.m, [-2, -17, 3, -17, 4, -13, 2, -10, -2, -10]); px(GOLD, 2, -16, 1, 6); px(KNIGHT.l, -1, -16, 2, 2); }
        else { px(B.d, -2, -16, 1, 7); px(B.l, -1, -15, 4, 1); px(B.l, -1, -13, 4, 1); px(B.m, -1, -11, 3, 1); px(B.m, 3, -15, 1, 3); }
      }
      const ax = attack ? 7 : walk ? -sw * 2 : 0;
      if (knight) {
        // Scudo sul braccio lontano, spada nel braccio vicino.
        poly(KNIGHT.l, [-5, -16, -1, -16, -1, -9, -3, -6, -5, -9]); px(GOLD, -4, -13, 2, 2); ln(GOLD, [-5, -16, -1, -16]);
      }
      if (attack) {
        ln(robe ? (form === 2 ? HOOD.m : VIGIL.m) : B.l, [0, -15, 4, -16, 6, -18], robe ? 2 : 1); px(B.m, 6, -20, 2, 2);
        if (form === 1) { poly(STEEL.l, [7, -21, 12, -26, 14, -24, 9, -19]); ln(STEEL.h, [12, -26, 14, -24]); px(WOOD, 6, -20, 2, 2); }
        else if (knight) { ln('#dfe8ec', [8, -20, 15, -27], 2); ln(GOLD, [6, -22, 9, -19]); }
        else if (form === 2) { px(BRONZE, 7, -23, 3, 4); px(flick ? '#fff3c4' : '#ffd27a', 8, -22, 1, 2); px('#ffe9a8', 10, -24); px('#ffe9a8', 11, -21); }
        else if (form === 4) { px(TRIM, 7, -22, 3, 3); px(glow, 8, -21); px(glow, 10, -24); px(glow, 11, -20); }
        else { px(B.h, 8, -21); px(B.h, 9, -20); px(B.h, 8, -19); }
      } else {
        if (robe) { const P = form === 2 ? HOOD : VIGIL; px(P.m, 0, -16, 2, 5); px(B.m, ax, -11, 2, 2); }
        else { ln(B.l, [0, -15, ax, -10]); px(B.m, ax, -9, 2, 2); }
        if (form === 1) { poly(STEEL.l, [ax + 1, -9, ax + 3, -9, ax + 4, -2, ax + 1, -1]); px(STEEL.h, ax + 3, -8, 1, 5); px(WOOD, ax, -11, 2, 2); }
        else if (knight) { px('#dfe8ec', ax + 1, -25, 2, 14); px('#9fb0b8', ax + 2, -25, 1, 14); px(GOLD, ax - 1, -11, 6, 1); px(GOLDL, ax + 1, -9, 2, 1); }
        else if (form === 2) { px('#6b5a40', ax + 1, -9, 1, 2); px(BRONZE, ax, -7, 3, 4); px(flick ? '#fff3c4' : '#ffd27a', ax + 1, -6, 1, 2); }
      }
      if (knight) {
        ov(KNIGHT.m, 1, -22, 5, 5); px(KNIGHT.l, -1, -26, 5, 2); px(HOLE, 2, -22, 5, 1); px(glow, 4, -22);
        px(KNIGHT.d, -4, -24, 1, 5); poly(BONE.l, [-3, -27, -7, -30, -4, -32, 0, -33, 3, -27]); px(BONE.h, -1, -31, 2, 1); px(BONE.m, -5, -29, 2, 1); px(GOLD, -2, -27, 5, 1);
      } else if (robe) {
        const P = form === 2 ? HOOD : VIGIL;
        ov(P.m, 0, -22, 6, 5); if (form === 4) poly(P.m, [-4, -25, -2, -31, 2, -25]); else px(P.m, -5, -27, 3, 2);
        ov(BONE.l, 2, -21, 3, 3); px(HOLE, 3, -22, 2, 2); px(glow, 4, -22); px(BONE.m, 2, -18, 3, 1);
        px(P.l, 0, -26, 6, 1); px(P.d, 1, -25, 5, 1);
      } else {
        skull('side', glow);
        if (form === 1) { px(STEEL.d, -5, -24, 13, 1); px(STEEL.m, -4, -25, 11, 1); ov(STEEL.m, 1, -27, 4, 2); px(STEEL.l, -1, -28, 3, 1); px(RUST, 4, -25); }
      }
      if (form === 2) { const b = step % 2; px('#ffcf6a', -8, -26 + b, 3, 2); px('#fff3c4', -7, -27 + b); px('#e9dcc0', -8, -24 + b, 3, 1); }
      return;
    }
    const back = view === 'back';
    // Dietro il corpo: mantello del cavaliere, aureola di candele e bastone della veglia.
    if (knight) { poly(CAPE[0], [-6, -16, 5, -16, 7, -3, -7, -3]); if (back) { px(CAPE[1], -4, -15, 1, 11); px(CAPE[1], 2, -14, 1, 10); } }
    if (form === 4) {
      for (const [x, y] of [[-9, -21], [-8, -26], [-4, -30], [3, -30], [7, -26], [8, -21]]) { px(WAX, x, y, 1, 2); px(flick ? '#fff1bf' : '#ffcf6a', x, y - 1); }
      const sx = back ? 8 : -9;
      ln('#6b5038', [sx, -1, sx, -30]);
      px(GOLD, sx - 2, -35, 4, 1); px(GOLD, sx - 2, -32, 4, 1); px(GOLD, sx - 2, -34, 1, 2); px(GOLD, sx + 1, -34, 1, 2); px(glow, sx - 1, -34, 2, 2);
    }
    // Gambe e bacino.
    if (robe) {
      const P = form === 2 ? HOOD : VIGIL;
      if (form === 2) sym(() => poly(P.m, [0, -17, 4, -17, 5, -11, 6, -3, 4, -2, 2, -3, 0, -2]));
      else sym(() => poly(P.m, [0, -17, 4, -17, 6, -6, 7, -1, 0, -1]));
      px(P.d, -3, -10, 1, 7); px(P.d, 2, -10, 1, 7); px(P.l, -1, -16, 2, back ? 4 : 13);
      px(B.m, -4, -1 - lA, 2, 1); px(B.m, 2, -1 - rA, 2, 1);
      if (form === 2) { px(ROPE, -5, -11, 10, 1); if (!back) px(ROPE, 2, -10, 1, 3); }
      else { sym(() => px(TRIM, 2, -16, 1, 12)); px(VIGIL.d, -7, -2, 14, 1); for (const [x, w] of [[-6, 2], [-3, 1], [0, 2], [4, 1]]) px(TRIM, x, -3, w, 1); }
    } else {
      const L = knight ? KNIGHT : B;
      for (const [x, l] of [[-3, lA], [1, rA]]) { px(L.d, x, -8 - l, 2, 7); px(L.l, x, -8 - l, 1, 7); px(knight ? GOLD : B.h, x, -5 - l, 2, 1); }
      px(knight ? KNIGHT.d : B.m, -4, -1 - lA, 3, 1); px(knight ? KNIGHT.d : B.m, 1, -1 - rA, 3, 1);
      if (knight) { px(KNIGHT.d, -4, -10, 8, 2); px(KNIGHT.m, -4, -10, 8, 1); px(GOLD, -1, -10, 2, 2); }
      else {
        px(B.m, -3, -10, 6, 2); px(B.l, -3, -10, 6, 1); px(HOLE, -1, -9, 2, 1);
        px(RAG[0], -3, -9, 6, 2); px(RAG[1], -2, -9, 4, 1); px(RAG[0], -2, -7); px(RAG[0], 1, -7);
      }
    }
    // Busto.
    if (form === 1) {
      sym(() => poly(STEEL.m, [0, -16, 4, -16, 5, -13, 3, -10, 0, -10]));
      if (!back) { px(STEEL.l, -3, -15, 2, 2); px(STEEL.d, 1, -13, 2, 1); px(RUST, -3, -12); px(RUST, 2, -11); }
      else { px(STEEL.d, -1, -15, 2, 5); px(RUST, 2, -13); }
      ov(STEEL.m, back ? 6 : -6, -16, 3, 2); px(STEEL.l, back ? 5 : -7, -17, 3, 1);
    } else if (knight) {
      sym(() => poly(KNIGHT.m, [0, -17, 5, -17, 5, -13, 3, -10, 0, -10]));
      if (!back) { px(KNIGHT.l, -4, -16, 3, 2); px(GOLD, -1, -16, 2, 6); px(GOLDL, -1, -14, 2, 1); }
      sym(() => { ov(KNIGHT.l, 6, -16, 3, 2); px(GOLD, 4, -15, 5, 1); });
    } else if (!robe) {
      px(B.d, -1, -16, 2, 6);
      if (back) { px(B.l, -1, -16, 2, 7); for (const y of [-15, -13, -11]) px(B.d, -1, y, 2, 1); sym(() => { px(B.m, 1, -15, 3, 2); px(B.d, 1, -12, 3, 1); }); }
      else {
        sym(() => { px(B.l, 0, -15, 4, 1); px(B.m, 3, -14); px(B.l, 0, -13, 4, 1); px(B.m, 3, -12); px(B.m, 0, -11, 3, 1); });
        px(B.m, -1, -15, 2, 5); px(B.h, -1, -15, 2, 1);
      }
      sym(() => { px(B.l, 0, -16, 5, 1); px(B.h, 5, -16); });
    }
    px(B.d, -1, -17, 2, 1);
    // Braccia: a sinistra dello schermo il braccio libero (o lo scudo), a destra quello armato; di spalle si scambiano.
    const free = back ? 5 : -6, arm = back ? -6 : 5, dirA = back ? -1 : 1;
    const sleeve = robe ? (form === 2 ? HOOD : VIGIL) : null;
    if (sleeve) { px(sleeve.m, free - (back ? 0 : 1), -16, 2, 5); if (form !== 4) px(B.m, free - (back ? 0 : 1), -11 + sw, 2, 2); }
    else { px(knight ? KNIGHT.m : B.l, free, -15, 1, 3); px(B.d, free, -12); px(knight ? KNIGHT.m : B.l, free, -11, 1, 3 + sw); px(knight ? KNIGHT.d : B.m, free - (back ? 0 : 1), -8 + sw, 2, 2); }
    if (form === 4) { px(B.m, back ? 7 : -10, -13, 2, 2); }
    if (knight && !back) {
      poly(KNIGHT.l, [-12, -16, -7, -16, -7, -9, -9, -6, -10, -6, -12, -9]); ln(GOLD, [-12, -16, -7, -16]);
      px(GOLDL, -10, -13, 2, 2); px(GOLD, -10, -15, 2, 1); px(GOLD, -10, -10, 2, 1);
    }
    if (attack) {
      C.save(); if (back) C.scale(-1, 1);
      if (sleeve) { ln(sleeve.m, [5, -15, 7, -18], 2); px(B.m, 8, -20, 2, 2); }
      else { ln(knight ? KNIGHT.m : B.l, [5, -15, 7, -17, 8, -19]); px(knight ? KNIGHT.d : B.m, 8, -21, 2, 2); }
      if (form === 1) { poly(STEEL.l, [9, -22, 14, -27, 16, -25, 11, -20]); ln(STEEL.h, [14, -27, 16, -25]); px(WOOD, 8, -22, 2, 2); }
      else if (knight) { ln('#dfe8ec', [10, -22, 17, -29], 2); ln('#9fb0b8', [11, -21, 17, -27]); ln(GOLD, [8, -24, 11, -20]); }
      else if (form === 2) { px(BRONZE, 8, -25, 3, 4); px(flick ? '#fff3c4' : '#ffd27a', 9, -24, 1, 2); px('#ffe9a8', 12, -26); px('#ffe9a8', 12, -22); px('#ffe9a8', 7, -27); }
      else if (form === 4) { px(TRIM, 8, -24, 3, 3); px(glow, 9, -23); px(glow, 11, -27); px(glow, 13, -22); px(glow, 7, -27); }
      else { px(B.h, 10, -22); px(B.h, 10, -20); px(B.h, 9, -23); }
      C.restore();
    } else {
      C.save(); if (back) C.scale(-1, 1);
      if (sleeve) { px(sleeve.m, 5, -16, 2, 5); px(B.m, 5, -11 - sw, 2, 2); }
      else { px(knight ? KNIGHT.m : B.l, 5, -15, 1, 3); px(B.d, 5, -12); px(knight ? KNIGHT.m : B.l, 5, -11, 1, 3 - sw); px(knight ? KNIGHT.d : B.m, 5, -8 - sw, 2, 2); }
      const hy = -8 - sw;
      if (form === 1) { poly(STEEL.l, [6, hy - 1, 9, hy - 1, 10, hy + 6, 7, hy + 7, 6, hy + 4]); px(STEEL.h, 9, hy, 1, 6); px(STEEL.d, 10, hy + 3); px(WOOD, 5, hy - 3, 2, 3); }
      else if (knight) { px('#dfe8ec', 7, -25, 2, 14); px('#9fb0b8', 8, -25, 1, 14); px('#dfe8ec', 7, -26); px(GOLD, 5, -11, 6, 1); px('#4a3328', 7, -10, 2, 2); px(GOLDL, 7, -8, 2, 1); }
      else if (form === 2) { px('#6b5a40', 6, hy + 2, 1, 2); px(BRONZE, 5, hy + 4, 3, 4); px(BRONZE, 5, hy + 3, 3, 1); px(flick ? '#fff3c4' : '#ffd27a', 6, hy + 5, 1, 2); }
      else if (form === 4) { px(TRIM, 6, -11, 3, 3); px(VIGIL.d, 7, -10); }
      C.restore();
    }
    // Testa e copricapo.
    if (robe) {
      const P = form === 2 ? HOOD : VIGIL;
      ov(P.m, 0, -22, 6, 5);
      if (form === 4) poly(P.m, [-3, -26, 0, -31, 2, -26]); else px(P.m, -1, -28, 2, 1);
      if (back) { px(P.l, -1, -26, 2, 6); px(P.d, -4, -18, 8, 1); }
      else { skull('front', glow, true); px(P.l, -4, -26, 8, 1); px(P.d, -4, -25, 8, 1); sym(() => px(P.m, 4, -19, 3, 3)); }
    } else if (knight) {
      ov(KNIGHT.m, 0, -22, 5, 5); px(KNIGHT.l, -3, -26, 6, 2);
      if (!back) { px(HOLE, -4, -22, 8, 1); px(glow, -3, -22); px(glow, 2, -22); px(HOLE, -2, -19); px(HOLE, 1, -19); }
      else px(KNIGHT.d, -1, -24, 2, 6);
      poly(BONE.l, [-1, -27, 0, -33, 1, -27]); sym(() => poly(BONE.l, [2, -26, 5, -31, 4, -25])); px(GOLD, -2, -27, 4, 1);
    } else {
      skull(back ? 'back' : 'front', glow);
      if (form === 1) { px(STEEL.d, -7, -24, 14, 1); px(STEEL.m, -6, -25, 12, 1); ov(STEEL.m, 0, -27, 4, 2); px(STEEL.l, -2, -28, 3, 1); px(RUST, -3, -25); px(RUST, 3, -25); }
    }
    if (form === 2) { const b = step % 2, lx = back ? 8 : -10; px('#ffcf6a', lx, -26 + b, 3, 2); px('#fff3c4', lx + 1, -27 + b); px('#e9dcc0', lx, -24 + b, 3, 1); }
  }

  /* ---------------------------------------------------------------- Orso dei larici */
  const BEAR = [
    { d: '#3b2a24', m: '#5e4130', l: '#8a6346', h: '#b38a62' },
    { d: '#2f2628', m: '#4f3d38', l: '#765a4a', h: '#9d7b61' },
    { d: '#3f3a2c', m: '#6a5d3f', l: '#94845a', h: '#bcaa78' },
    { d: '#3d4a5e', m: '#7d90a8', l: '#b8c9d8', h: '#e8f1f6' },
    { d: '#3a3328', m: '#5f5236', l: '#877450', h: '#ae9a6c' }
  ];
  const MUZZLE = ['#d9c099', '#a88e6c'], NOSE = '#231c22', CLAW = '#efe2c4', LARCH = ['#c9a04a', '#e7c36a'];
  const STONE = ['#5d5f6b', '#8a8c96', '#b8bac2'], MOSS = ['#4f7a43', '#7aa65a'], WATER = ['#5fb6d6', '#a9e6f2'];
  const ICE = ['#7fc8e8', '#c5f0ff', '#ffffff'], REED = ['#5f8a45', '#93b85f'], BLOOM = ['#f0a8b8', '#f5d36a'];
  function bear(view, form, step, attack, flick) {
    const F = BEAR[form] || BEAR[0], big = form >= 3 ? 1 : 0;
    const walk = step < 2, lA = walk && step === 0 ? 1 : 0, rA = walk && step === 1 ? 1 : 0;
    const claw = form === 1 || form === 3 ? 2 : 1;
    if (view === 'side') {
      const fo = walk ? (step ? 1 : -1) : 0;
      // Zampe lontane, corpo, zampe vicine.
      px(F.d, 3 - fo, -6, 3, 6); px(F.d, -9 + fo, -6, 3, 6);
      poly(F.m, [-10 - big, -5, -10 - big, -11, -7, -13 - big, -2, -14 - big, 1, -16 - big * 2, 4, -15 - big, 6, -12, 7, -6, 4, -4, -8, -4]);
      poly(F.l, [-7, -12 - big, -2, -13 - big, 1, -15 - big * 2, 3, -14 - big, -1, -12, -6, -11]); px(F.d, -8, -4, 13, 1); px(F.d, -10 - big, -8, 1, 3);
      px(F.m, 4 + fo, -6, 3, 6); px(F.d, 4 + fo, -1, 4, 1); px(CLAW, 7 + fo, -1, claw, 1);
      px(F.m, -8 - fo, -6, 3, 6); px(F.d, -8 - fo, -1, 4, 1); px(CLAW, -5 - fo, -1);
      px(F.l, -12 - big, -11, 2, 2);
      // Testa di profilo.
      const hx = 8 + big;
      ov(F.m, hx, -11, 4, 4); ov(F.l, hx - 1, -13, 3, 2);
      ov(F.m, hx - 2, -15, 2, 1); px(F.d, hx - 2, -15, 1, 1);
      if (attack) { poly(MUZZLE[0], [hx + 2, -13, hx + 6, -12, hx + 6, -11, hx + 2, -11]); px(NOSE, hx + 3, -10, 4, 1); px(MUZZLE[1], hx + 2, -9, 4, 1); px('#f0e6d0', hx + 5, -10); px(NOSE, hx + 6, -13, 2, 1); }
      else { poly(MUZZLE[0], [hx + 2, -12, hx + 6, -11, hx + 6, -9, hx + 2, -8]); px(NOSE, hx + 6, -12, 2, 2); px(MUZZLE[1], hx + 3, -8, 3, 1); }
      px(NOSE, hx + 1, -13, 1, 1); px('#fff5d4', hx + 1, -13);
      if (form === 0) { ln(LARCH[0], [hx - 3, -16, hx - 6, -19]); px(LARCH[1], hx - 6, -20); px(LARCH[1], hx - 4, -19); }
      if (attack) { px(F.m, hx + 1, -8, 3, 3); for (let i = 0; i < 3; i++) px(CLAW, hx + 4, -9 + i, claw, 1); }
      // Forme: creste, sorgenti, boreale, alvei.
      if (form === 1) for (const x of [-7, -3, 1]) { poly(STONE[1], [x - 2, -14, x, -20, x + 2, -14]); px(STONE[2], x, -18, 1, 3); px(STONE[0], x + 1, -15); }
      if (form === 2) { ov(MOSS[0], 0, -14, 7, 2); px(MOSS[1], -5, -16, 3, 1); px(MOSS[1], 1, -16, 3, 1); px(WATER[0], -6, -12, 1, 4); px(WATER[1], -6, -12); px(WATER[0], 3, -12, 1, 3); px(WATER[1], flick ? -11 : 11, -18); }
      if (form === 3) { for (const [x, h] of [[-6, 8], [-2, 11], [2, 7]]) { poly(ICE[0], [x - 2, -15, x, -15 - h, x + 2, -15]); px(ICE[1], x, -13 - h, 1, h - 3); } px(ICE[2], -2, -25); if (flick) { px(ICE[1], hx + 8, -13); px(ICE[2], hx + 9, -14); } }
      if (form === 4) {
        for (const [x, h] of [[-7, 6], [-4, 9], [-1, 7], [2, 5]]) { ln(REED[0], [x, -14, x + 1, -14 - h]); px(REED[1], x + 1, -14 - h, 1, 2); }
        px(BLOOM[0], -4, -24, 2, 2); px(BLOOM[1], 2, -20, 2, 1); ov(STONE[1], -5, -13, 2, 1); px(WATER[0], -9, -6, 12, 1); px(WATER[1], flick ? -6 : -2, -6, 3, 1);
      }
      return;
    }
    const back = view === 'back';
    // Corpo massiccio con la gobba delle spalle.
    ov(F.m, 0, -9, 9 + big, 6 + big); ov(F.l, 0, -12 - big, 7 + big, 2);
    if (back) {
      px(F.h, -1, -7, 2, 2); px(F.l, -1, -14, 2, 4);
    } else {
      // Mezzaluna chiara sul petto.
      px(F.h, -3, -8, 6, 1); px(F.h, -2, -7, 4, 1);
    }
    for (const [x, l] of [[-6, lA], [2, rA]]) {
      px(F.m, x, -6 - l, 4, 6); px(F.l, x, -6 - l, 1, 5); px(F.d, x, -1 - l, 4, 1);
      if (!back) { px(CLAW, x, -1 - l, 1, claw); px(CLAW, x + 2, -1 - l, 1, claw); }
    }
    // Testa, orecchie tonde, muso chiaro.
    ov(F.m, 0, -15 - big, 6, 5); ov(F.l, 0, -17 - big, 4, 2);
    sym(() => { ov(F.m, 5, -20 - big, 2, 2); px(back ? F.m : F.h, 4, -20 - big, 1, 1); });
    if (back) { px(F.l, -2, -18 - big, 4, 2); }
    else {
      const hy = -big;
      ov(MUZZLE[0], 0, -12 + hy, 3, 2); px(NOSE, -1, -14 + hy, 2, 1);
      if (attack) { px(NOSE, -2, -11 + hy, 4, 2); px('#f0e6d0', -2, -11 + hy, 1, 1); px('#f0e6d0', 1, -11 + hy, 1, 1); }
      else px(MUZZLE[1], -1, -11 + hy, 2, 1);
      sym(() => { px(NOSE, 2, -17 + hy, 1, 2); px('#fff5d4', 2, -17 + hy); });
    }
    if (form === 0) { ln(LARCH[0], [4, -21, 7, -23]); px(LARCH[1], 7, -24); px(LARCH[1], 6, -22); }
    if (attack && !back) {
      // Zampata: la zampa destra si alza con gli artigli tesi.
      ov(F.m, 8, -13, 2, 3); px(F.l, 7, -15, 2, 1);
      for (let i = 0; i < 3; i++) px(CLAW, 9 + i, -17 - (i === 1 ? 1 : 0), 1, claw + 1);
    }
    if (form === 1) {
      sym(() => { poly(STONE[1], [5, -14, 8, -21, 10, -13]); px(STONE[2], 7, -19, 1, 4); });
      poly(STONE[1], [-2, -21, 0, -26, 2, -21]); px(STONE[2], 0, -24, 1, 3);
      if (!back) { px('#c9b7a0', -4, -16, 1, 3); }
    }
    if (form === 2) {
      ov(MOSS[0], 0, -12, 8, 2); sym(() => { px(MOSS[1], 3, -14, 4, 1); px(WATER[0], 7, -11, 1, 4); px(WATER[1], 7, -11); });
      px(WATER[1], flick ? -11 : 10, flick ? -18 : -20); px(WATER[0], flick ? 10 : -11, -16);
    }
    if (form === 3) {
      sym(() => { poly(ICE[0], [5, -15, 7, -24, 9, -15]); px(ICE[1], 7, -22, 1, 6); poly(ICE[0], [9, -13, 12, -19, 12, -11]); px(ICE[2], 11, -17); });
      if (!back) { px(ICE[1], -4, -11, 8, 1); }
      if (flick && !back) { px(ICE[1], -1, -9); px(ICE[2], 0, -8); }
    }
    if (form === 4) {
      sym(() => { ln(REED[0], [4, -15, 5, -24]); px(REED[1], 5, -25, 1, 2); ln(REED[0], [7, -14, 9, -21]); px(REED[1], 9, -22, 1, 2); px(BLOOM[0], 5, -26, 2, 1); });
      px(BLOOM[1], 8, -23, 2, 2); px(BLOOM[0], -1, -23, 2, 2); ov(STONE[1], -7, -14, 2, 1); ov(STONE[2], 7, -14, 2, 1);
      px(WATER[0], -9, -4, 18, 1); px(WATER[1], flick ? -6 : 3, -4, 3, 1);
    }
  }

  /* ---------------------------------------------------------------- Viverna di brina */
  const WYV = [
    { d: '#2f4766', m: '#4f79a3', l: '#86b5d6', h: '#cfe9f4', w: '#6d93bd', wl: '#a7cbe4', wd: '#3d5b82' },
    { d: '#243550', m: '#3d5c86', l: '#6b98c0', h: '#bfe0ef', w: '#567aa6', wl: '#8db3d6', wd: '#2c4366' },
    { d: '#4f6377', m: '#7f97ad', l: '#b3c7d6', h: '#e6f0f5', w: '#9bb1c4', wl: '#d4e2ec', wd: '#61778d' },
    { d: '#22325a', m: '#3a5c95', l: '#6f9fd0', h: '#cde6f7', w: '#4f76b0', wl: '#8fb8e3', wd: '#2a4275' },
    { d: '#3b4f74', m: '#6b88b8', l: '#a5c2e3', h: '#eef6ff', w: '#a9c3e8', wl: '#e9f1ff', wd: '#7590bd' }
  ];
  const BELLY = ['#dfe9e2', '#a9bfc0'], HORN = '#efe6cf', EYE = '#c9fbff', MIST = '#e8f2f6', AURORA = ['#b8f0d8', '#e3c6f5'];
  function wyvern(view, form, step, attack, flick) {
    const W = WYV[form] || WYV[0], walk = step < 2, lA = walk && step === 0 ? 1 : 0, rA = walk && step === 1 ? 1 : 0;
    const flap = walk ? step : (flick ? 1 : 0), big = form >= 3 ? 1 : 0, span = form === 0 ? 0 : form >= 3 ? 4 : 2;
    const wing = dark => {
      // Ala destra (specchiata per la sinistra): braccio fino al polso, tre dita, membrana smerlata fra le dita.
      const up = flap ? -2 : 0, k = 1 + span / 8;
      const P = (x, y) => [2 + R((x - 2) * k), -13 + R((y + 13) * k)];
      const wr = P(6, -19 + up), f1 = P(10, -21 + up), m1 = P(9, -17 + up / 2), f2 = P(11, -14), m2 = P(8, -12);
      const f3 = form === 4 ? P(9, -3) : form === 2 ? P(7, -8) : P(6, -9);
      f3[1] = Math.min(f3[1], -2);
      poly(dark ? W.wd : W.w, [2, -13, ...wr, ...f1, ...m1, ...f2, ...m2, ...f3, 3, -10]);
      if (!dark) { poly(W.wl, [3, -13, ...wr, ...P(8, -17), 4, -11]); }
      ln(dark ? W.d : W.l, [2, -13, ...wr, ...f1]); ln(W.d, [...wr, ...f2]); ln(W.d, [...wr, ...f3]);
      px(W.h, f1[0], f1[1]);
      if (form === 1) { px(HORN, f1[0] + 1, f1[1] - 1); px(HORN, wr[0], wr[1] - 1); }
      if (form === 2 && !dark) { ov(MIST, f2[0] - 1, f2[1] + 2, 2, 1); px(MIST, f3[0] + 1, f3[1] + 1, 2, 1); }
      if (form === 4 && !dark) { ln(AURORA[0], [...f2, ...f3]); px(AURORA[1], f1[0], f1[1] + 1, 1, 2); }
    };
    if (view === 'side') {
      const fo = walk ? (step ? 1 : -1) : 0;
      // Ala lontana e coda.
      C.save(); C.translate(1, -2); C.scale(-1, 1); wing(true); C.restore();
      const tl = form === 4 ? 17 : 14;
      ln(W.m, [-5, -7, -10, -5, -tl, -7, -tl - 2, -10], 2); px(W.l, -10, -6, 4, 1);
      if (form === 1) poly(HORN, [-tl - 2, -10, -tl - 5, -13, -tl - 1, -12]);
      else if (form === 3) ov(W.d, -tl - 2, -11, 2, 2);
      else poly(W.l, [-tl - 2, -11, -tl - 4, -12, -tl - 3, -9]);
      px(W.d, -2 - fo, -5, 2, 5); px(HORN, -2 - fo, -1, 3, 1);
      ov(W.m, -1, -8, 6 + big, 4 + big); px(BELLY[0], -3, -6, 7, 2); px(BELLY[1], -3, -5, 7, 1);
      px(W.m, 1 + fo, -5, 2, 5); px(HORN, 1 + fo, -1, 3, 1);
      // Collo e testa di profilo.
      ln(W.m, [3, -10, 5, -14], 3); px(BELLY[0], 5, -12, 1, 2);
      const hx = 7, hy = -17 - big;
      ov(W.m, hx, hy, 3, 2); ov(W.l, hx, hy - 1, 2, 1);
      if (attack) { px(W.m, hx + 2, hy - 1, 4, 2); px(HOLE, hx + 3, hy + 1, 3, 1); px(W.m, hx + 2, hy + 2, 3, 1); px(MIST, hx + 6, hy, 2, 2); px('#ffffff', hx + 8, hy + 1); px(MIST, hx + 9, hy - 1); }
      else { px(W.m, hx + 2, hy - 1, 4, 2); px(W.l, hx + 2, hy - 1, 4, 1); px(W.d, hx + 5, hy); }
      px(HOLE, hx, hy - 1); px(EYE, hx + 1, hy - 1);
      ln(HORN, form === 3 ? [hx - 2, hy - 2, hx - 5, hy - 6, hx - 6, hy - 6] : [hx - 2, hy - 2, hx - 4, hy - 5]);
      if (form === 3) { px(GOLD, hx - 1, hy - 4, 3, 1); px(GOLDL, hx, hy - 5); }
      if (form === 1) for (const [x, y] of [[4, -16], [1, -13], [-2, -12], [-5, -11]]) poly(HORN, [x - 1, y, x, y - 3, x + 1, y]);
      else px(W.h, 2, -12, 3, 1);
      C.save(); C.translate(-1, 0); C.scale(-1, 1); wing(); C.restore();
      if (form === 2) { ov(MIST, -3, -1, 4, 1); ov(MIST, 4, -1, 2, 1); }
      if (form === 3) { px(HORN, -2, -9, 5, 1); px(HORN, -1, -7, 4, 1); }
      if (form === 4 && flick) { px(AURORA[1], -9, -18); px(AURORA[0], 13, -22); }
      return;
    }
    const back = view === 'back';
    // Coda dietro il corpo, ali, zampe.
    if (!back) { ln(W.m, [2, -3, 7, -2, 10, -5], 2); px(W.l, 10, -7, 2, 2); }
    sym(() => wing());
    for (const [x, l] of [[-4, lA], [1, rA]]) { px(W.d, x, -5 - l, 3, 4); px(HORN, x, -1 - l, 3, 1); }
    ov(W.m, 0, -8, 5 + big, 5 + big);
    if (back) {
      for (let y = -12; y <= -4; y += 2) px(W.h, -1, y, 2, 1);
      ln(W.m, [0, -5, 0, -2, -4, -1], 2); px(W.l, -6, -1, 2, 1);
      if (form === 1) for (const y of [-13, -10, -7]) poly(HORN, [-1, y, 0, y - 3, 1, y]);
    } else {
      ov(BELLY[0], 0, -7, 3, 4); for (const y of [-9, -7, -5]) px(BELLY[1], -2, y, 4, 1);
      if (form === 3) { px(HORN, -3, -10, 6, 1); px(HORN, -2, -8, 4, 1); px(GOLD, -1, -11, 2, 1); }
    }
    px(W.m, -2, -15 - big, 4, 3);
    // Testa.
    const hy = -18 - big;
    ov(W.m, 0, hy, 4, 3); ov(W.l, 0, hy - 1, 3, 2);
    if (back) { px(W.d, -1, hy - 1, 2, 3); }
    else {
      if (attack) { px(W.l, -2, hy + 2, 4, 1); px(HOLE, -2, hy + 3, 4, 1); px(W.m, -2, hy + 4, 4, 1); px(MIST, -3, hy + 5, 6, 2); px('#ffffff', -1, hy + 6, 2, 1); }
      else { px(W.l, -2, hy + 2, 4, 2); px(W.d, -2, hy + 2); px(W.d, 1, hy + 2); }
      sym(() => { px(HOLE, 2, hy - 1, 2, 2); px(EYE, 2, hy - 1); });
    }
    sym(() => {
      if (form === 3) { ln(HORN, [2, hy - 2, 4, hy - 6, 5, hy - 8]); px(GOLD, 3, hy - 3); }
      else if (form === 1) ln(HORN, [2, hy - 2, 5, hy - 5, 7, hy - 6]);
      else ln(HORN, [2, hy - 2, 4, hy - 5]);
    });
    if (form === 3) { poly(HORN, [-1, hy - 3, 0, hy - 8, 1, hy - 3]); px(GOLDL, -1, hy - 4, 2, 1); }
    else px(W.h, -1, hy - 3, 2, 1);
    if (form === 2) { ov(MIST, -5, -1, 3, 1); ov(MIST, 5, -1, 3, 1); px(MIST, flick ? -9 : 8, -14, 2, 1); }
    if (form === 4) { px(flick ? AURORA[0] : AURORA[1], -12, -20); px(flick ? AURORA[1] : AURORA[0], 11, -24); px(MIST, -1, hy - 5, 2, 1); }
  }

  const plans = {
    skeleton: { paint: skeleton, shadow: f => f === 3 || f === 4 ? 8 : 6 },
    bear: { paint: bear, shadow: f => f >= 3 ? 12 : 10 },
    wyvern: { paint: wyvern, shadow: f => f >= 3 ? 9 : 7 }
  };
  const frames = new Map();
  function outline(data, hit) {
    const opaque = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < opaque.length; i++) opaque[i] = data[i * 4 + 3] > 128 ? 1 : 0;
    for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x, k = i * 4;
      if (opaque[i]) {
        if (hit) { data[k] = Math.min(255, data[k] + 130); data[k + 1] = (data[k + 1] + 232) >> 1; data[k + 2] = (data[k + 2] + 216) >> 1; }
      } else if (opaque[i - 1] || opaque[i + 1] || opaque[i - SIZE] || opaque[i + SIZE]) {
        data[k] = 31; data[k + 1] = 31; data[k + 2] = 47; data[k + 3] = 255;
      }
    }
  }
  function frame(kind, dir, form, step, hit, attack) {
    const key = [kind, dir, form, step, hit, attack].join('/');
    if (frames.has(key)) return frames.get(key);
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.save(); c.translate(AX, AY); if (dir === 'left') c.scale(-1, 1);
    const view = dir === 'up' ? 'back' : dir === 'left' || dir === 'right' ? 'side' : 'front';
    C = c; plans[kind].paint(view, form, step, attack, step % 2 === 1); C = null;
    c.restore();
    const pixels = c.getImageData(0, 0, SIZE, SIZE);
    outline(pixels.data, hit);
    c.putImageData(pixels, 0, 0);
    let l = SIZE, r = 0, t = SIZE, b = 0;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (pixels.data[(y * SIZE + x) * 4 + 3] > 32) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
    const sprite = { cv, x: l, y: t, w: r - l + 1, h: b - t + 1 };
    frames.set(key, sprite);
    return sprite;
  }
  const formOf = opts => Math.max(0, Math.min(4, Number(opts.evolution) || 0));
  function shadow(c, x, y, rx) {
    c.fillStyle = 'rgba(20,18,35,.27)';
    for (let j = -2; j <= 2; j++) { const dx = R(rx * Math.sqrt(Math.max(0, 1 - (j / 2.5) ** 2))); c.fillRect(R(x) - dx, R(y) - 1 + j, dx * 2 + 1, 1); }
  }
  function draw(c, kind, x, y, opts = {}) {
    const plan = plans[kind];
    if (!plan) return base.draw(c, kind, x, y, opts);
    const form = formOf(opts), t = opts.t || 0, moving = !!opts.moving;
    // Passo a due tempi in movimento; in attesa due tempi lenti (occhi, fiammelle, ali) con le zampe ferme.
    const step = moving ? Math.floor(t * 7) % 2 : 2 + Math.floor(t * 2.4) % 2;
    const sprite = frame(kind, opts.dir || 'down', form, step, !!opts.hit, !!opts.attack);
    c.save(); c.imageSmoothingEnabled = false;
    shadow(c, x, y, plan.shadow(form));
    c.drawImage(sprite.cv, sprite.x, sprite.y, sprite.w, sprite.h, R(x) - AX + sprite.x, R(y) - AY + sprite.y - (moving ? step : 0), sprite.w, sprite.h);
    c.restore();
  }
  function portrait(c, kind, x, y, sz, opts = {}) {
    if (!plans[kind]) return base.portrait(c, kind, x, y, sz, opts);
    const sprite = frame(kind, 'down', formOf(opts), 2, false, false);
    const zoom = sz * .91 / Math.max(sprite.w, sprite.h);
    const sw = Math.max(1, R(sprite.w * zoom)), sh = Math.max(1, R(sprite.h * zoom));
    c.save(); c.imageSmoothingEnabled = false;
    c.drawImage(sprite.cv, sprite.x, sprite.y, sprite.w, sprite.h, R(x + (sz - sw) / 2), R(y + (sz - sh) / 2), sw, sh);
    c.restore();
  }
  window.ActorArt = { ...base, draw, portrait, dedicated: Object.keys(plans) };
})();
