// Famiglie architettoniche per continente (World Art Overhaul, fase 4 D).
// Catalogo separato di componenti urbani in pixel art, pensato per il Generatore Procedurale Urbano 2.0
// (MEGA_CITY_OVERHAUL.md): il generatore sceglie lotti e impronte in dati, questo modulo li disegna. Non genera
// città, non decide collisioni e non tocca percorsi, residenti o salvataggi.
// Contratto: ogni componente restituisce una tela in memoria con il punto d'appoggio (ax, ay) al centro della base
// del fronte, l'impronta {w, d}, la soglia della porta {x, y} e i vetri da accendere di notte, tutti relativi
// all'appoggio. Stessa richiesta, stessi pixel (nessun Math.random: generatore con seme).
// Oggi lo usano i borghi dei continenti (`continents.js`) con le loro impronte di sempre.
(() => {
  'use strict';
  const INK = '#1d232a', SHADE = '#14222660';
  function random(seed) { seed >>>= 0; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
  // Pennello in pixel interi con origine (ox, oy): rettangoli, ellissi e poligoni pieni senza sfumature.
  function kit(g, ox, oy) {
    const px = (c, x, y, w = 1, h = 1) => { w = Math.round(w); h = Math.round(h); if (w > 0 && h > 0) { g.fillStyle = c; g.fillRect(ox + Math.round(x), oy + Math.round(y), w, h); } };
    const oval = (c, x, y, rx, ry) => {
      rx = Math.max(0, Math.round(rx)); ry = Math.max(1, Math.round(ry));
      for (let j = -ry; j <= ry; j++) { const d = Math.floor(rx * Math.sqrt(Math.max(0, 1 - j * j / (ry * ry)))); px(c, x - d, y + j, 2 * d + 1, 1); }
    };
    const poly = (c, pts) => {
      const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      for (let y = y0; y < y1; y++) {
        const cy = y + .5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + (cy - ay) / (by - ay) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) px(c, a, y, b - a, 1); }
      }
    };
    const half = (c, x, y, rx, ry) => {
      rx = Math.max(0, Math.round(rx)); ry = Math.max(1, Math.round(ry));
      for (let j = -ry; j <= 0; j++) { const d = Math.floor(rx * Math.sqrt(Math.max(0, 1 - j * j / (ry * ry)))); px(c, x - d, y + j, 2 * d + 1, 1); }
    };
    const line = (c, x0, y0, x1, y1, w = 1) => {
      const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let i = 0; i <= n; i++) px(c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, w, w);
    };
    return {px, oval, half, poly, line};
  }

  // ------------------------------------------------------------------ famiglie
  // M: materiali (rampe dal più scuro al più chiaro). subs: varianti regionali che sostituiscono alcuni materiali.
  const FAMILIES = {
    vaelthoria: {
      continent: 'Vaelthoria', name: 'Pietra chiara e legno caldo',
      description: 'Borghi classici del Cuore del Mondo: travertino squadrato, piani alti a graticcio, coppi in cotto, persiane verde salvia, colonnati e pergolati.',
      M: {stone: ['#6f6756', '#a99f86', '#cbc1a6', '#e2d9bf', '#f3ecd9'], wood: ['#43301f', '#6e4b31', '#94673f', '#ba8752'],
        roof: ['#552a20', '#7e3a2a', '#a24e34', '#c46a44', '#df8d5f'], plaster: ['#b6a786', '#ddd2b6', '#f0e8d4'], glass: '#f1c879',
        shutter: ['#2f4a40', '#5d7a6a'], cloth: ['#b9553b', '#efe2c2'], metal: ['#38352f', '#6b6658', '#a39a7f'], plant: ['#33502f', '#55753f', '#7f9f52'], bloom: ['#d9765f', '#f0d27a']},
      subs: {valle: {}},
      rules: {walls: 'pianterreno in pietra squadrata, piani alti a graticcio intonacato', roofs: 'coppi a due falde poco inclinate, frontone classico per le sale',
        openings: 'finestre ad arco con persiane, porte ad arco con cornice', stories: [1, 3], widths: [28, 72]},
      signature: ['colonnade', 'pergola', 'fountain']
    },
    nordharyn: {
      continent: 'Nordharyn', name: 'Pietra robusta e tetti ripidi',
      description: 'Villaggi di montagna e di miniera: granito a blocchi irregolari, legno scuro, tetti d’ardesia ripidissimi con neve, torri fortificate e castelletti di estrazione.',
      M: {stone: ['#33383f', '#535b65', '#747e88', '#9aa3ab', '#c2c9ce'], wood: ['#271d17', '#45322a', '#664a36', '#8a6a4b'],
        roof: ['#1b2029', '#28303c', '#374252', '#4c5a6a', '#6b7a89'], plaster: ['#7d7466', '#a39886', '#c4baa6'], glass: '#f0c070',
        shutter: ['#5a2c26', '#8c4436'], cloth: ['#7a2f2a', '#c9b58a'], metal: ['#24262b', '#4c5058', '#7d838c'], plant: ['#263e3c', '#3d5d55', '#5d8070'], bloom: ['#c9a25a', '#e8d3a0'],
        snow: ['#a9bcc6', '#d4e1e6', '#f2f7f8']},
      subs: {filoni: {snowy: false}, rocca: {snowy: true}},
      rules: {walls: 'zoccolo alto in granito, piano superiore in tavole scure', roofs: 'ardesia ripida a capanna verso la strada, neve sulle falde',
        openings: 'finestre piccole con imposte rosse, porte di tavole con fasce di ferro', stories: [1, 3], widths: [28, 64]},
      signature: ['headframe', 'watchtower', 'orecart']
    },
    myrathen: {
      continent: 'Myrathen', name: 'Legno scuro, vetro e rame ossidato',
      description: 'Città degli arcani: facciate di legno quasi nero, vetrate a piombo, coperture e cupole di rame verderame, rampicanti, serre e alambicchi.',
      M: {stone: ['#2c2c36', '#45465a', '#626479', '#8a8ca0', '#b6b8c8'], wood: ['#1a1519', '#2e2428', '#46363a', '#5f4b4a'],
        roof: ['#173d38', '#24594f', '#3b7d6c', '#5fa38c', '#94cdb6'], plaster: ['#4a4f5c', '#6a7080', '#8e95a5'], glass: '#e3bb79',
        pane: ['#22394a', '#4f8aa3', '#94d3e3', '#e2fbff'], copper: ['#6d3a22', '#a8653a', '#d79a62'], shutter: ['#24594f', '#3b7d6c'],
        cloth: ['#487775', '#bcd0ab'], metal: ['#2a2a30', '#5a5a66', '#a6a8b6'], plant: ['#21402f', '#336447', '#57905f', '#8bbf72'], bloom: ['#c96ad9', '#6ad9b4'],
        potion: ['#c96ad9', '#6ad9b4', '#e8c050', '#e06a5a']},
      subs: {siderea: {}, velaris: {}},
      rules: {walls: 'zoccolo di pietra scura, tavole verticali di legno nero con coprifili chiari', roofs: 'rame verderame a giunti rilevati, cupole e lanterne di vetro',
        openings: 'vetrate a piombo alte, porte a due ante con lunetta', stories: [1, 3], widths: [28, 72]},
      signature: ['greenhouse', 'alembic', 'vinearch']
    },
    voryndhal: {
      continent: 'Voryndhal', name: 'Architettura naturale fra le radici',
      description: 'Case cresciute fra radici monumentali: pareti di corteccia e graticcio, porte e finestre tonde, tetti di foglie o di paglia, piattaforme e passerelle di corda.',
      M: {stone: ['#3e4636', '#5d6650', '#7f8869', '#a3a986', '#c6c8a6'], wood: ['#2a1f17', '#46362a', '#65503b', '#86704f', '#a68e66'],
        root: ['#33271e', '#54402f', '#775c41', '#9b7c56', '#bea07a'], roof: ['#1c3524', '#294a30', '#386139', '#4d7a48', '#6c9659'],
        plaster: ['#7a6a4a', '#a08c62', '#c2ad7c'], glass: '#f2cf86', shutter: ['#46362a', '#65503b'], cloth: ['#3c6a43', '#c9b27a'],
        metal: ['#3a3328', '#6a5c44', '#a08c62'], plant: ['#21402a', '#36603a', '#5a8a4a', '#86b35c'], bloom: ['#e0b04a', '#d9765f'], rope: ['#7a6440', '#b8a072'], moss: '#6f8f48', glow: '#c9ee9a'},
      subs: {fronde: {}, savana: {roof: ['#4e3d1e', '#735d2c', '#98803d', '#bba152', '#d8c071']}},
      rules: {walls: 'corteccia e graticcio fra radici vive, su palafitte nelle zone umide', roofs: 'foglie a strati o paglia a cono',
        openings: 'porte e finestre tonde con cornice di legno', stories: [1, 2], widths: [28, 64]},
      signature: ['rootarch', 'walkway', 'platform']
    },
    azheryon: {
      continent: 'Azheryon', name: 'Pietra calda, portici e tende',
      description: 'Città carovaniere e di costa: muri di pietra calda o calce bianca, tetti a terrazza con parapetto, cupole, portici ad archi, grate di legno, tende a strisce e moli.',
      M: {stone: ['#7a5038', '#a5714f', '#c28c60', '#d9aa7b', '#edc99c'], wood: ['#3e2a1d', '#5c4130', '#7e5c40', '#a07c55'],
        roof: ['#5e3b28', '#86543a', '#a96f4b', '#c68c62', '#e0ad80'], plaster: ['#b68a62', '#d2a87a', '#e9c99c'], glass: '#f5d38a',
        shutter: ['#2f6f8e', '#4f93ad'], cloth: ['#a9472f', '#eab36d', '#2f6f8e', '#f4efe2'], metal: ['#4a3a2a', '#8a6a3a', '#d6a64e'],
        plant: ['#2f4f33', '#4b6f43', '#7a9455'], bloom: ['#e06a4a', '#f0c050'], tile: ['#1f6f7e', '#3fa0ae', '#e8e2cf']},
      subs: {deserto: {}, costa: {stone: ['#8f877a', '#c9c2b2', '#e4ddcc', '#f3efe4', '#ffffff'], roof: ['#1d475c', '#29607a', '#3b7c96', '#5c9cb3', '#93c4d1'],
        plaster: ['#c9c2b2', '#e8e2d2', '#f8f5ec']}},
      rules: {walls: 'pietra calda intonacata a calce, bianca sulla costa', roofs: 'terrazze con parapetto, cupole, travi sporgenti',
        openings: 'archi, grate di legno, imposte azzurre sulla costa', stories: [1, 3], widths: [28, 72]},
      signature: ['portico', 'tent', 'pier']
    }
  };
  // Tavolozze delle regioni continentali → famiglia e variante.
  const REGIONS = {ruin: ['vaelthoria', 'valle'], pine: ['nordharyn', 'filoni'], snow: ['nordharyn', 'rocca'], star: ['myrathen', 'siderea'],
    fae: ['myrathen', 'velaris'], grass: ['voryndhal', 'savana'], root: ['voryndhal', 'fronde'], shore: ['azheryon', 'costa'], canyon: ['azheryon', 'deserto']};
  const paletteOf = (fid, sub) => ({...FAMILIES[fid].M, ...(FAMILIES[fid].subs[sub] || {})});

  // ------------------------------------------------------------------ materiali comuni
  function ashlar(k, x, y, w, h, S, rnd, row = 4) {
    k.px(S[2], x, y, w, h);
    for (let r = 0, yy = y; yy < y + h; yy += row, r++) {
      const rh = Math.min(row, y + h - yy);
      for (let xx = x - (r % 2 ? 4 : 0); xx < x + w;) {
        const bw = 6 + Math.floor(rnd() * 4), x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw);
        if (x1 - x0 > 1) {
          const t = rnd();
          if (t < .18) k.px(S[1], x0, yy, x1 - x0 - 1, rh - 1); else if (t > .82) k.px(S[3], x0, yy, x1 - x0 - 1, rh - 1);
          k.px(S[3], x0, yy, x1 - x0 - 1, 1);
        }
        if (xx + bw < x + w) k.px(S[0], xx + bw - 1, yy, 1, rh);
        xx += bw;
      }
      if (rh === row) k.px(S[1], x, yy + rh - 1, w, 1);
    }
  }
  function rubble(k, x, y, w, h, S, rnd) {
    k.px(S[0], x, y, w, h);
    for (let yy = y, r = 0; yy < y + h; yy += 5, r++) {
      for (let xx = x - (r % 2 ? 3 : 0); xx < x + w;) {
        const bw = 5 + Math.floor(rnd() * 6), bh = Math.min(4, y + h - yy), x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1);
        if (x1 - x0 > 0 && bh > 0) {
          const tone = 1 + Math.floor(rnd() * 3);
          k.px(S[tone], x0, yy, x1 - x0, bh); k.px(S[Math.min(4, tone + 1)], x0, yy, x1 - x0, 1);
          if (x1 - x0 > 3) k.px(S[Math.max(0, tone - 1)], x0 + 1, yy + bh - 1, x1 - x0 - 1, 1);
        }
        xx += bw;
      }
    }
  }
  function planks(k, x, y, w, h, W, rnd, vertical = false, step = 3) {
    k.px(W[1], x, y, w, h);
    if (vertical) for (let xx = x; xx < x + w; xx += step) { k.px(W[0], xx, y, 1, h); k.px(W[2], xx + 1, y, 1, h); if (rnd() < .3) k.px(W[0], xx + 1, y + Math.floor(rnd() * h), 1, 1); }
    else for (let yy = y; yy < y + h; yy += step) { k.px(W[0], x, yy + step - 1, w, 1); k.px(W[2], x, yy, w, 1); if (rnd() < .4) k.px(W[0], x + Math.floor(rnd() * w), yy + 1, 1, 1); }
  }
  function frame(k, x, y, w, h, P, rnd) {
    // Graticcio: intonaco chiaro fra travi di legno caldo, con controventi alternati.
    k.px(P.plaster[1], x, y, w, h); k.px(P.plaster[2], x + 1, y + 1, w - 2, 2);
    k.px(P.wood[1], x, y, w, 2); k.px(P.wood[1], x, y + h - 2, w, 2);
    const n = Math.max(2, Math.round(w / 10));
    for (let i = 0; i <= n; i++) { const xx = Math.round(x + i * (w - 2) / n); k.px(P.wood[1], xx, y, 2, h); k.px(P.wood[2], xx, y, 1, h); }
    for (let i = 0; i < n; i++) {
      const a = Math.round(x + i * (w - 2) / n) + 2, b = Math.round(x + (i + 1) * (w - 2) / n);
      if ((i + Math.floor(rnd() * 2)) % 2) k.line(P.wood[1], a, y + h - 3, b - 1, y + 2); else k.line(P.wood[1], a, y + 2, b - 1, y + h - 3);
    }
  }
  function bark(k, x, y, w, h, B, rnd) {
    k.px(B[2], x, y, w, h);
    for (let xx = x + 1; xx < x + w - 1; xx += 3 + Math.floor(rnd() * 2)) {
      let off = 0;
      for (let yy = y; yy < y + h; yy++) { if (rnd() < .2) off += rnd() < .5 ? -1 : 1; off = Math.max(-1, Math.min(1, off)); k.px(B[1], xx + off, yy, 1, 1); if (rnd() < .3) k.px(B[3], xx + off + 1, yy, 1, 1); }
    }
    k.px(B[3], x, y, w, 1);
  }
  function lime(k, x, y, w, h, P, rnd) {
    // Calce o pietra intonacata: superficie liscia con macchie e base sporca.
    k.px(P.plaster[1], x, y, w, h); k.px(P.plaster[2], x + 1, y + 1, w - 2, Math.max(1, h - 4));
    for (let i = 0; i < Math.round(w * h / 60); i++) k.px(P.plaster[0] + '99', x + 1 + Math.floor(rnd() * (w - 3)), y + 2 + Math.floor(rnd() * (h - 4)), 1 + Math.floor(rnd() * 3), 1);
    k.px(P.plaster[0], x, y + h - 2, w, 2);
  }
  function wallShadow(k, x, y, w) { k.px('#00000033', x, y, w, 2); k.px('#00000018', x, y + 2, w, 1); }

  // Finestre e porte (ogni vetro entra nella lista delle luci notturne).
  function win(k, wins, x, y, w, h, style, P) {
    const glass = style === 'leaded' || style === 'tall' ? P.pane : null;
    k.px(INK, x - 1, y - 1, w + 2, h + 2);
    if (glass) {
      k.px(glass[1], x, y, w, h); k.px(glass[2], x, y, Math.max(1, w - 2), Math.max(1, Math.floor(h / 2)));
      for (let xx = x + 2; xx < x + w; xx += 3) k.px(glass[0], xx, y, 1, h);
      for (let yy = y + 2; yy < y + h; yy += 3) k.px(glass[0], x, yy, w, 1);
      k.px(glass[3], x, y, 1, 1);
    } else { k.px(P.glass, x, y, w, h); k.px('#ffffff55', x, y, w, 1); k.px(P.wood[0], x + Math.floor(w / 2), y, 1, h); }
    wins.push({x, y, w, h});
    if (style === 'arch' || style === 'tall') { k.px(INK, x, y - 2, w, 1); k.px(glass ? glass[2] : P.glass, x + 1, y - 1, w - 2, 1); }
    if (style === 'arch' || style === 'shutters') {
      for (const sx of [x - 3, x + w + 1]) { k.px(INK, sx - 1 + (sx < x ? 1 : 0), y - 1, 3, h + 2); k.px(P.shutter[1], sx + (sx < x ? 1 : 0), y, 2, h); k.px(P.shutter[0], sx + (sx < x ? 1 : 0), y + Math.floor(h / 2), 2, 1); }
    }
    if (style === 'round') { k.px(INK, x, y - 2, w, 1); k.px(INK, x, y + h + 1, w, 1); k.px(P.wood[2], x - 1, y - 1, 1, 1); k.px(P.wood[2], x + w, y + h, 1, 1); }
    if (style === 'lattice') { for (let yy = y + 1; yy < y + h; yy += 2) k.px(P.wood[1], x, yy, w, 1); for (let xx = x + 1; xx < x + w; xx += 2) k.px(P.wood[1], xx, y, 1, h); }
    k.px(P.stone ? P.stone[3] : P.wood[2], x - 1, y + h + 1, w + 2, 1);
  }
  function door(k, x, w, h, style, P, opts = {}) {
    const x0 = x - Math.floor(w / 2);
    if (style === 'round') { k.oval(INK, x, -h + Math.floor(w / 2), Math.floor(w / 2) + 1, Math.floor(w / 2) + 1); }
    k.px(INK, x0 - 1, -h - 1, w + 2, h + 1);
    k.px(P.wood[0], x0, -h, w, h); k.px(P.wood[1], x0 + 1, -h + 1, w - 2, h - 1);
    if (style === 'arch' || style === 'round') { k.px(INK, x0, -h - 2, w, 1); k.px(P.wood[1], x0 + 1, -h - 1, w - 2, 1); }
    if (style === 'round') { const r = Math.floor(w / 2); k.oval(P.wood[1], x, -h + r, r, r); k.px(P.wood[0], x, -h - r + 2, 1, h + r - 2); }
    if (style === 'double') { k.px(P.wood[0], x, -h + 1, 1, h - 1); k.px(opts.glass || P.glass, x0 + 1, -h + 1, w - 2, 2); }
    if (style === 'iron') { for (const yy of [-h + 2, -Math.floor(h / 2), -3]) k.px(P.metal[1], x0, yy, w, 1); }
    if (style !== 'double') k.px(P.metal ? P.metal[2] : '#e3c27a', x0 + w - 3, -Math.round(h / 2), 1, 1);
    k.px(opts.step || P.stone[1], x0 - 2, 0, w + 4, 1);
  }
  // Tetto a falde visto di fronte (gronda verso la strada): trapezio con file di coppi, ardesia, rame, foglie o paglia.
  function slope(k, x0, x1, eave, ridge, inset, R, tex, rnd, over = 3) {
    const pts = [[x0 - over, eave], [x1 + over, eave], [x1 - inset, ridge], [x0 + inset, ridge]];
    k.poly(INK, [[x0 - over - 1, eave + 1], [x1 + over + 1, eave + 1], [x1 - inset + 1, ridge - 1], [x0 + inset - 1, ridge - 1]]);
    k.poly(R[2], pts);
    if (inset > 2) { k.poly(R[1], [[x0 - over, eave], [x0 + inset, ridge], [x0 + inset + 2, ridge], [x0 - over + 4, eave]]); k.poly(R[3], [[x1 + over - 4, eave], [x1 - inset - 2, ridge], [x1 - inset, ridge], [x1 + over, eave]]); }
    const rows = eave - ridge;
    for (let y = ridge + 2; y < eave; y++) {
      const t = (y - ridge) / rows, l = Math.round(x0 + inset - (inset + over) * t), r = Math.round(x1 - inset + (inset + over) * t);
      if (tex === 'tiles' && (y - ridge) % 3 === 0) { k.px(R[1], l + 1, y, r - l - 1, 1); for (let x = l + 2 + ((y / 3) % 2 ? 2 : 0); x < r - 1; x += 4) k.px(R[3], x, y - 1, 2, 1); }
      if (tex === 'slate' && (y - ridge) % 2 === 0) { k.px(R[1], l + 1, y, r - l - 1, 1); for (let x = l + 1 + ((y / 2) % 2 ? 2 : 0); x < r - 1; x += 4) k.px(R[0], x, y - 1, 1, 1); }
      if (tex === 'copper' && y === ridge + 2) for (let x = Math.round(x0) + 1; x < x1; x += 4) k.line(R[3], x, ridge + 1, Math.round(x + (x - (x0 + x1) / 2) * .12), eave - 1);
      if (tex === 'leaf' && (y - ridge) % 3 === 1) for (let x = l + ((y / 3) % 2 ? 0 : 2); x < r; x += 4) { k.px(R[1], x, y + 1, 3, 1); k.px(R[3], x + 1, y - 1, 2, 1); k.px(R[4], x + 1, y - 1, 1, 1); }
      if (tex === 'thatch' && (y - ridge) % 2 === 0) for (let x = l + 1; x < r; x += 2 + Math.floor(rnd() * 2)) k.px(rnd() < .5 ? R[1] : R[3], x, y, 1, 2);
    }
    k.px(R[0], x0 - over, eave - 1, x1 - x0 + 2 * over, 2);
    k.px(R[4], x0 + inset, ridge, x1 - x0 - 2 * inset, 1); k.px(R[1], x0 + inset, ridge + 1, x1 - x0 - 2 * inset, 1);
  }
  function dome(k, cx, base, r, ry, R, ribs = 3) {
    k.half(INK, cx, base, r + 1, ry + 1); k.px(INK, cx - r - 1, base, 2 * r + 3, 2);
    k.half(R[2], cx, base, r, ry);
    k.half(R[1], cx + Math.round(r * .45), base, Math.round(r * .55), Math.round(ry * .8));
    k.oval(R[3], cx - Math.round(r * .35), base - Math.round(ry * .5), Math.max(1, Math.round(r * .35)), Math.max(1, Math.round(ry * .3)));
    k.oval(R[4], cx - Math.round(r * .45), base - Math.round(ry * .65), Math.max(1, Math.round(r * .15)), Math.max(1, Math.round(ry * .12)));
    for (let i = 1; i <= ribs; i++) { const dx = Math.round(r * (i / (ribs + 1) * 2 - 1)); k.line(R[0], cx + dx, base - 1, cx + Math.round(dx * .25), base - ry + 1); }
    k.px(R[0], cx - r, base - 1, 2 * r + 1, 2);
  }
  function chimney(k, x, top, h, S, smoke = false) {
    k.px(INK, x - 1, top - 1, 6, h + 1); k.px(S[2], x, top, 4, h); k.px(S[3], x, top, 1, h); k.px(S[1], x, top, 4, 1);
    k.px(INK, x - 2, top - 2, 8, 2); k.px(S[1], x - 1, top - 2, 6, 1);
    if (smoke) { k.oval('#c8c8c870', x + 2, top - 6, 3, 2); k.oval('#d8d8d855', x + 4, top - 11, 4, 2); }
  }
  function planter(k, x, P, wide = 6) {
    k.px(INK, x - 1, -5, wide + 2, 5); k.px(P.wood[1], x, -4, wide, 4); k.px(P.wood[2], x, -4, wide, 1);
    for (let i = 0; i < wide; i += 2) { k.px(P.plant[1], x + i, -8, 2, 4); k.px(P.plant[2], x + i, -9, 1, 2); }
    if (P.bloom) { k.px(P.bloom[0], x + 1, -9, 1, 1); k.px(P.bloom[1], x + wide - 2, -8, 1, 1); }
  }
  function vines(k, x, y0, h, P, rnd) {
    let xx = x;
    for (let y = y0; y > y0 - h; y--) { if (rnd() < .3) xx += rnd() < .5 ? -1 : 1; k.px(P.plant[1], xx, y, 1, 1); if (rnd() < .35) { k.px(P.plant[2], xx + 1, y, 2, 1); k.px(P.plant[3] || P.plant[2], xx + 1, y - 1, 1, 1); } }
  }

  // ------------------------------------------------------------------ Vaelthoria
  const vaelthoria = {
    house(k, P, s, rnd, wins) {
      const hw = s.w / 2, st = s.stories, H = 12 + (st - 1) * 10;
      k.oval(SHADE, 3, 1, hw + 5, 5);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1);
      ashlar(k, -hw, -12, s.w, 12, P.stone, rnd);
      if (st > 1) frame(k, -hw, -H, s.w, H - 12, P, rnd);
      for (const qx of [-hw, hw - 3]) for (let y = -12; y < 0; y += 4) k.px(y % 8 ? P.stone[3] : P.stone[4], qx + (y % 8 ? 0 : 0), y, 3, 3);
      k.px(P.stone[1], -hw, -2, s.w, 2);
      if (st > 1) { k.px(P.wood[0], -hw - 1, -13, s.w + 2, 2); k.px(P.wood[3], -hw, -13, s.w, 1); }
      door(k, s.door || 0, 8, 11, 'arch', P);
      const gx = [-hw + 4, hw - 10].filter(x => Math.abs(x + 3 - (s.door || 0)) > 7);
      for (const x of gx) win(k, wins, x, -9, 6, 5, 'arch', P);
      if (st > 1) for (let i = 0; i < Math.max(2, Math.round(s.w / 18)); i++) {
        const n = Math.max(2, Math.round(s.w / 18)), x = Math.round(-hw + 6 + i * (s.w - 18) / (n - 1));
        win(k, wins, x, -H + 3, 6, 6, 'shutters', P);
        if (s.v % 2 === 0) { k.px(INK, x - 1, -H + 10, 8, 2); k.px(P.wood[2], x, -H + 10, 6, 1); k.px(P.bloom[0], x, -H + 9, 2, 1); k.px(P.plant[2], x + 2, -H + 9, 2, 1); k.px(P.bloom[1], x + 4, -H + 9, 2, 1); }
      }
      wallShadow(k, -hw, -H, s.w);
      slope(k, -hw, hw, -H, -H - Math.round(8 + s.w / 6), Math.round(s.w / 8), P.roof, 'tiles', rnd);
      if (s.v % 3 !== 1) chimney(k, hw - 10, -H - Math.round(8 + s.w / 6) - 2, 7, P.stone, s.v % 3 === 2);
      return {door: {x: s.door || 0, y: 0}};
    },
    workshop(k, P, s, rnd, wins) {
      // Bottega del fornaio: pergolato di vite davanti al banco, forno a cupola sul fianco, insegna.
      const meta = vaelthoria.house(k, P, {...s, stories: 1, door: -Math.round(s.w / 4)}, rnd, wins), hw = s.w / 2;
      const ox = hw - 8;
      k.oval(INK, ox, -4, 7, 6); k.oval(P.stone[2], ox, -4, 6, 5); k.oval(P.stone[3], ox - 2, -6, 3, 2); k.px(INK, ox - 3, -4, 6, 4); k.px('#e0782e', ox - 2, -3, 4, 3); k.px('#f7c35a', ox - 1, -2, 2, 2);
      const ax0 = -Math.round(hw / 4) + 5, ax1 = hw - 16;
      k.poly(INK, [[ax0 - 1, -12], [ax1 + 1, -12], [ax1 + 3, -6], [ax0 - 3, -6]]);
      for (let x = ax0, i = 0; x < ax1; x += 3, i++) k.poly(i % 2 ? P.cloth[1] : P.cloth[0], [[x, -11], [x + 3, -11], [x + 3 + (x + 3 > (ax0 + ax1) / 2 ? 1 : 0), -7], [x - (x < (ax0 + ax1) / 2 ? 1 : 0), -7]]);
      k.px(INK, ax0 - 1, -5, ax1 - ax0 + 2, 5); k.px(P.wood[2], ax0, -5, ax1 - ax0, 2); k.px(P.wood[1], ax0, -3, ax1 - ax0, 3);
      for (let x = ax0 + 1; x < ax1 - 1; x += 3) { k.oval(INK, x + 1, -6, 2, 1); k.oval('#c98a3a', x + 1, -6, 1, 1); }
      k.px(INK, -hw - 3, -11, 5, 1); k.px(INK, -hw - 4, -10, 7, 6); k.px(P.wood[3], -hw - 3, -9, 5, 4); k.oval('#9a5a2a', -hw - 1, -7, 1, 1);
      return meta;
    },
    hall(k, P, s, rnd, wins) {
      // Sala civica classica: stilobate a gradini, colonne con capitello, frontone con fregio, coppi dietro.
      const hw = s.w / 2, H = 24;
      k.oval(SHADE, 3, 1, hw + 7, 6);
      k.px(INK, -hw - 3, -3, s.w + 6, 4); k.px(P.stone[2], -hw - 2, -3, s.w + 4, 3); k.px(P.stone[4], -hw - 2, -3, s.w + 4, 1);
      k.px(INK, -hw - 1, -5, s.w + 2, 2); k.px(P.stone[3], -hw, -5, s.w, 1);
      k.px(INK, -hw + 2, -H, s.w - 4, H - 5); ashlar(k, -hw + 3, -H + 1, s.w - 6, H - 6, [P.stone[1], P.stone[1], P.stone[2], P.stone[3], P.stone[4]], rnd, 3);
      door(k, 0, 10, 14, 'double', P, {step: P.stone[3], glass: P.metal[2]});
      k.px(P.metal[2], -3, -12, 1, 6); k.px(P.metal[2], 2, -12, 1, 6);
      const cols = Math.max(4, Math.round(s.w / 12));
      for (let i = 0; i < cols; i++) {
        const x = Math.round(-hw + 2 + i * (s.w - 7) / (cols - 1));
        if (Math.abs(x + 2) < 8) continue;
        k.px(INK, x - 1, -H - 1, 6, H - 3); k.px(P.stone[3], x, -H, 4, H - 5); k.px(P.stone[4], x, -H, 1, H - 5); k.px(P.stone[1], x + 3, -H, 1, H - 5);
        k.px(INK, x - 2, -H - 2, 8, 2); k.px(P.stone[4], x - 1, -H - 2, 6, 1); k.px(P.stone[2], x - 1, -7, 6, 2);
      }
      for (const x of [-hw + 8, hw - 14]) win(k, wins, x + (x < 0 ? 0 : 0), -H + 6, 5, 7, 'arch', {...P, shutter: [P.stone[1], P.stone[2]]});
      k.px(INK, -hw - 3, -H - 6, s.w + 6, 5); k.px(P.stone[3], -hw - 2, -H - 6, s.w + 4, 3); k.px(P.stone[1], -hw - 2, -H - 3, s.w + 4, 1);
      for (let x = -hw; x < hw; x += 4) k.px(P.stone[1], x, -H - 5, 2, 1);
      const peak = Math.round(9 + s.w / 10);
      k.poly(INK, [[-hw - 4, -H - 5], [0, -H - 6 - peak - 1], [hw + 4, -H - 5]]);
      k.poly(P.stone[3], [[-hw - 2, -H - 6], [0, -H - 6 - peak + 1], [hw + 2, -H - 6]]);
      k.poly(P.stone[2], [[-hw + 6, -H - 7], [0, -H - 6 - peak + 5], [hw - 6, -H - 7]]);
      k.oval(P.metal[2], 0, -H - 9, 2, 1); k.px(P.metal[1], -1, -H - 9, 3, 1);
      for (const x of [-hw - 4, hw + 2]) { k.px(INK, x, -H - 9, 3, 3); k.px(P.stone[4], x + 1, -H - 8, 1, 1); }
      k.px(INK, -2, -H - 9 - peak, 5, 3); k.px(P.stone[4], -1, -H - 8 - peak, 3, 1);
      k.px(P.roof[2], -hw - 2, -H - 5, s.w + 4, 1);
      return {door: {x: 0, y: 0}};
    },
    stall(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 19, 4);
      for (const x of [-17, 14]) { k.px(INK, x, -24, 3, 24); k.px(P.wood[2], x + 1, -23, 1, 23); }
      k.px(INK, -18, -10, 36, 7); k.px(P.wood[1], -17, -10, 34, 6); k.px(P.wood[3], -17, -10, 34, 2);
      const goods = ['#e0a050', '#c8553a', '#7f9f52', '#f0d27a'];
      for (let i = 0; i < 6; i++) { const x = -15 + i * 5; k.oval(INK, x + 2, -12, 2, 2); k.oval(goods[(i + s.v) % 4], x + 2, -12, 1, 1); }
      k.poly(INK, [[-21, -20], [-18, -31], [18, -31], [21, -20]]);
      for (let x = -19, i = 0; x < 19; x += 6, i++) k.poly(i % 2 ? P.cloth[1] : P.cloth[0], [[x, -21], [x + 1, -30], [x + 7, -30], [x + 6, -21]]);
      for (let x = -20, i = 0; x < 20; x += 6, i++) { k.px(i % 2 ? P.cloth[1] : P.cloth[0], x, -21, 6, 3); k.oval(i % 2 ? P.cloth[1] : P.cloth[0], x + 3, -18, 2, 1); }
      return {};
    },
    well(k, P) {
      // Fontana: vasca ottagonale, colonnina con mascherone e getto.
      k.oval(SHADE, 2, 1, 14, 4);
      k.oval(INK, 0, -3, 13, 6); k.oval(P.stone[2], 0, -4, 12, 5); k.oval(P.stone[3], 0, -5, 11, 3); k.oval('#3f7f8f', 0, -5, 9, 2); k.oval('#7fc0c8', -2, -6, 4, 1);
      k.px(INK, -3, -20, 6, 16); k.px(P.stone[3], -2, -19, 4, 14); k.px(P.stone[4], -2, -19, 1, 14);
      k.px(INK, -4, -22, 8, 3); k.px(P.stone[4], -3, -22, 6, 2); k.oval(P.metal[2], 0, -15, 1, 1);
      k.px('#9fd8e0', 2, -14, 1, 1); k.px('#9fd8e0', 3, -12, 1, 2); k.px('#9fd8e0', 4, -9, 1, 3);
      return {};
    },
    lamp(k, P) {
      k.oval(SHADE, 1, 1, 5, 2);
      k.px(INK, -3, -4, 7, 4); k.px(P.stone[3], -2, -4, 5, 3);
      k.px(INK, -1, -18, 3, 15); k.px(P.metal[1], 0, -18, 1, 15);
      k.px(INK, -3, -24, 7, 7); k.px(P.metal[0], -2, -23, 5, 5); k.px(P.metal[2], -2, -24, 5, 1); k.px(INK, -1, -26, 3, 2);
      return {flame: [-1, -22, 3, 3]};
    },
    colonnade(k, P, s, rnd) {
      // Portico a colonne con trabeazione: segmento ripetibile lungo le vie.
      const hw = s.w / 2;
      k.oval(SHADE, 2, 1, hw + 3, 4);
      k.px(INK, -hw - 1, -2, s.w + 2, 3); k.px(P.stone[3], -hw, -2, s.w, 2);
      const n = Math.max(2, Math.round(s.w / 12) + 1);
      for (let i = 0; i < n; i++) { const x = Math.round(-hw + 1 + i * (s.w - 6) / (n - 1)); k.px(INK, x - 1, -22, 6, 21); k.px(P.stone[3], x, -21, 4, 19); k.px(P.stone[4], x, -21, 1, 19); k.px(P.stone[1], x + 3, -21, 1, 19); k.px(INK, x - 2, -23, 8, 2); k.px(P.stone[4], x - 1, -23, 6, 1); }
      k.px(INK, -hw - 2, -28, s.w + 4, 6); k.px(P.stone[3], -hw - 1, -28, s.w + 2, 4); k.px(P.stone[1], -hw - 1, -24, s.w + 2, 1);
      for (let x = -hw; x < hw; x += 5) k.px(P.stone[2], x, -27, 3, 2);
      k.px(P.roof[2], -hw - 1, -31, s.w + 2, 3); k.px(P.roof[3], -hw - 1, -31, s.w + 2, 1); k.px(INK, -hw - 2, -32, s.w + 4, 1);
      return {};
    },
    pergola(k, P, s, rnd) {
      const hw = s.w / 2;
      k.oval(SHADE, 2, 1, hw + 2, 4);
      for (const x of [-hw + 1, hw - 3]) { k.px(INK, x - 1, -21, 4, 21); k.px(P.wood[2], x, -20, 2, 20); }
      k.px(INK, -hw - 2, -23, s.w + 4, 3); k.px(P.wood[2], -hw - 1, -23, s.w + 2, 1);
      for (let x = -hw; x < hw; x += 4) { k.px(INK, x, -25, 2, 5); k.px(P.wood[3], x, -25, 1, 4); }
      for (let x = -hw - 1; x < hw + 1; x += 2) { k.px(P.plant[1], x, -27 + (x % 4 ? 0 : 1), 3, 3); k.px(P.plant[2], x + 1, -28, 1, 1); if (rnd() < .3) { k.px('#5a2f4a', x, -22, 1, 2); k.px('#7a4a6a', x + 1, -22, 1, 1); } }
      vines(k, -hw + 1, -1, 20, P, rnd); vines(k, hw - 2, -1, 20, P, rnd);
      k.px(INK, -6, -8, 12, 4); k.px(P.wood[2], -5, -8, 10, 2); k.px(P.wood[1], -4, -6, 1, 6); k.px(P.wood[1], 3, -6, 1, 6);
      return {};
    },
    fountain(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 20, 5);
      k.oval(INK, 0, -3, 19, 8); k.oval(P.stone[2], 0, -4, 18, 7); k.oval(P.stone[3], 0, -5, 17, 5); k.oval('#3f7f8f', 0, -5, 15, 4); k.oval('#5fa0ab', -3, -6, 8, 2);
      k.oval(INK, 0, -14, 7, 3); k.oval(P.stone[3], 0, -15, 6, 2); k.oval('#5fa0ab', 0, -15, 4, 1);
      k.px(INK, -2, -14, 4, 10); k.px(P.stone[3], -1, -13, 2, 9);
      k.px(INK, -3, -26, 6, 12); k.px(P.stone[4], -2, -25, 4, 10); k.oval(INK, 0, -28, 3, 3); k.oval(P.stone[4], 0, -28, 2, 2);
      for (const [x, y] of [[-4, -17], [4, -17], [-6, -10], [6, -10]]) k.px('#a8e0e8', x, y, 1, 2);
      return {};
    }
  };

  // ------------------------------------------------------------------ Nordharyn
  const snowCap = (k, P, pts, lit = 1) => { k.poly(P.snow[lit ? 1 : 0], pts); };
  const nordharyn = {
    house(k, P, s, rnd, wins) {
      // Zoccolo alto di granito, piano di tavole scure, frontone ripido verso la strada con neve sulle falde.
      const hw = s.w / 2, st = s.stories, H = 11 + (st - 1) * 9, peak = Math.round(hw * 1.05 + 6);
      k.oval(SHADE, 3, 1, hw + 5, 5);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1);
      rubble(k, -hw, -Math.min(H, 13), s.w, Math.min(H, 13), P.stone, rnd);
      if (H > 13) planks(k, -hw, -H, s.w, H - 13, P.wood, rnd, true);
      k.px(P.wood[0], -hw, -13, s.w, 1);
      // Frontone in tavole e falde d'ardesia spesse
      k.poly(INK, [[-hw - 1, -H], [0, -H - peak - 1], [hw + 1, -H]]);
      const gableTop = -H - peak;
      k.poly(P.wood[1], [[-hw + 3, -H], [0, gableTop + 4], [hw - 3, -H]]);
      for (let x = -hw + 4; x < hw - 3; x += 3) k.px(P.wood[0], x, Math.round(-H - (hw - Math.abs(x)) * peak / hw) + 5, 1, Math.round((hw - Math.abs(x)) * peak / hw) - 5);
      for (const side of [-1, 1]) {
        const band = [[side * (hw + 4), -H + 1], [0, gableTop - 2], [0, gableTop + 3], [side * (hw - 2), -H + 1]];
        k.poly(INK, band.map(([x, y]) => [x + side, y + 1]));
        k.poly(side < 0 ? P.roof[2] : P.roof[1], band);
        for (let i = 1; i < 6; i++) { const t = i / 6; k.px(P.roof[side < 0 ? 3 : 0], Math.round(side * (hw + 1) * (1 - t)), Math.round(-H + 1 + (gableTop - 1 + H - 1) * t), 2, 1); }
        if (P.snowy) {
          snowCap(k, P, [[side * (hw + 4), -H + 1], [0, gableTop - 3], [0, gableTop + 3], [side * (hw - 1), -H + 1]], side < 0 ? 1 : 0);
          k.line(P.snow[2], side * (hw + 3), -H, 0, gableTop - 2);
        }
      }
      if (P.snowy) { k.px(P.snow[2], -2, gableTop - 3, 4, 2); for (let x = -hw - 3; x < hw + 3; x += 3) k.px(P.snow[2], x, -H + 2, 1, 2 + ((x / 3) & 1)); }
      win(k, wins, -2, gableTop + Math.round(peak * .45), 4, 4, 'plain', P);
      door(k, s.door || 0, 8, 11, 'iron', P, {step: P.stone[1]});
      k.px(INK, (s.door || 0) - 7, -14, 14, 2); k.px(P.wood[2], (s.door || 0) - 6, -14, 12, 1);
      for (const x of [-hw + 3, hw - 9].filter(x => Math.abs(x + 3 - (s.door || 0)) > 8)) win(k, wins, x, H > 13 ? -H + 3 : -10, 5, 5, 'shutters', P);
      if (s.v % 2 === 0) chimney(k, hw - 8, gableTop + Math.round(peak * .35), 9, P.stone, true);
      for (let y = -2; y > -8; y -= 2) for (let x = -hw - 6; x < -hw; x += 3) { k.px(INK, x, y - 1, 3, 2); k.px(P.wood[2], x, y - 1, 2, 1); }
      return {door: {x: s.door || 0, y: 0}};
    },
    workshop(k, P, s, rnd, wins) {
      // Imbocco di miniera: castelletto di legno con ruota sopra un capanno di pietra, binario e carrello di minerale.
      const hw = s.w / 2;
      k.oval(SHADE, 3, 1, hw + 5, 5);
      for (const x of [-hw + 2, hw - 4]) k.line(INK, x, -2, 0, -54, 3);
      for (const x of [-hw + 2, hw - 4]) k.line(P.wood[2], x + 1, -2, 0, -53, 1);
      for (const y of [-20, -34]) { const half = Math.round((hw - 2) * (1 - (-y) / 54)); k.px(INK, -half - 1, y - 1, half * 2 + 2, 3); k.px(P.wood[2], -half, y, half * 2, 1); }
      k.oval(INK, 0, -54, 7, 7); k.oval(P.metal[1], 0, -54, 6, 6); k.oval(INK, 0, -54, 4, 4); k.oval(P.metal[2], 0, -54, 1, 1);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.line(P.metal[2], Math.round(Math.cos(a) * 2), -54 + Math.round(Math.sin(a) * 2), Math.round(Math.cos(a) * 5), -54 + Math.round(Math.sin(a) * 5)); }
      k.line(P.cloth[1], 4, -54, 4, -18);
      k.px(INK, -hw - 1, -15, s.w + 2, 16); rubble(k, -hw, -14, s.w, 14, P.stone, rnd);
      k.px(INK, -hw - 3, -18, s.w + 6, 4); k.px(P.roof[2], -hw - 2, -18, s.w + 4, 3); k.px(P.roof[3], -hw - 2, -18, s.w + 4, 1);
      if (P.snowy) { k.px(P.snow[1], -hw - 2, -20, s.w + 4, 3); k.px(P.snow[2], -hw - 2, -20, s.w + 4, 1); }
      k.px(INK, -6, -12, 12, 12); k.px('#141416', -5, -11, 10, 11); k.px(P.wood[2], -6, -12, 1, 12); k.px(P.wood[2], 5, -12, 1, 12); k.px(P.wood[2], -6, -12, 12, 1);
      k.px('#e0a050', -2, -6, 2, 2); wins.push({x: -2, y: -6, w: 2, h: 2});
      k.px(P.metal[1], -8, -1, 16, 1); k.px(P.metal[1], -8, 1, 16, 1); for (let x = -7; x < 8; x += 3) k.px(P.wood[1], x, -1, 1, 3);
      nordharyn.orecart(k, P, {x: hw - 6}, rnd);
      win(k, wins, -hw + 3, -10, 4, 4, 'plain', P);
      return {door: {x: 0, y: 0}};
    },
    hall(k, P, s, rnd, wins) {
      // Casaforte: torre quadrata con merli, feritoie, ballatoio di legno, stendardo e tetto a piramide.
      const hw = s.w / 2, tw = Math.round(hw * .62), H = 40;
      k.oval(SHADE, 3, 1, hw + 6, 6);
      k.px(INK, -hw - 1, -15, s.w + 2, 16); rubble(k, -hw, -14, s.w, 14, P.stone, rnd);
      k.px(INK, -tw - 1, -H - 1, tw * 2 + 2, H - 13); rubble(k, -tw, -H, tw * 2, H - 14, P.stone, rnd);
      for (let x = -tw - 1; x < tw; x += 5) { k.px(INK, x, -H - 5, 4, 5); k.px(P.stone[3], x + 1, -H - 4, 2, 4); if (P.snowy) k.px(P.snow[2], x, -H - 5, 4, 1); }
      k.px(INK, -tw - 3, -H + 12, tw * 2 + 6, 3); k.px(P.wood[2], -tw - 2, -H + 12, tw * 2 + 4, 1); for (let x = -tw - 2; x < tw + 2; x += 3) k.px(P.wood[1], x, -H + 14, 1, 3);
      for (const x of [-tw + 3, tw - 5]) { k.px(INK, x, -H + 3, 2, 6); win(k, wins, x, -H + 4, 1, 4, 'plain', P); }
      win(k, wins, -2, -H + 18, 4, 5, 'arch', {...P, shutter: P.wood});
      k.px(INK, -tw - 3, -H - 12, 1, 9); k.px(P.cloth[0], -tw - 2, -H - 12, 5, 4); k.px(P.cloth[1], -tw - 1, -H - 11, 2, 2);
      const r = tw + 3;
      k.poly(INK, [[-r - 1, -H - 4], [0, -H - 4 - r - 3], [r + 1, -H - 4]]); k.poly(P.roof[2], [[-r, -H - 5], [0, -H - 4 - r - 1], [r, -H - 5]]); k.poly(P.roof[1], [[0, -H - 4 - r - 1], [r, -H - 5], [2, -H - 5]]);
      if (P.snowy) { k.poly(P.snow[1], [[-r, -H - 5], [0, -H - 4 - r - 1], [1, -H - 5]]); k.poly(P.snow[0], [[0, -H - 4 - r - 1], [r, -H - 5], [Math.round(r * .4), -H - 5]]); k.line(P.snow[2], -r, -H - 5, 0, -H - 4 - r); }
      k.px(P.metal[2], 0, -H - 4 - r - 5, 1, 4);
      door(k, 0, 10, 13, 'iron', P, {step: P.stone[1]});
      k.px(INK, -hw - 3, -18, s.w + 6, 4); k.px(P.roof[2], -hw - 2, -18, Math.round(hw - tw), 3); k.px(P.roof[2], tw + 2, -18, Math.round(hw - tw), 3);
      if (P.snowy) { k.px(P.snow[1], -hw - 2, -19, Math.round(hw - tw), 3); k.px(P.snow[1], tw + 2, -19, Math.round(hw - tw), 3); k.px(P.snow[2], -hw - 2, -19, Math.round(hw - tw), 1); k.px(P.snow[2], tw + 2, -19, Math.round(hw - tw), 1); }
      for (const x of [-hw + 3, hw - 8]) win(k, wins, x, -11, 4, 4, 'shutters', P);
      return {door: {x: 0, y: 0}};
    },
    stall(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 19, 4);
      for (const x of [-17, 14]) { k.px(INK, x, -26, 3, 26); k.px(P.wood[2], x + 1, -25, 1, 25); }
      k.px(INK, -18, -10, 36, 7); planks(k, -17, -10, 34, 6, P.wood, rnd);
      for (let i = 0; i < 5; i++) { const x = -15 + i * 6; k.px(INK, x, -15, 5, 5); k.px(i % 2 ? '#c9a25a' : '#8a7a6a', x + 1, -14, 3, 3); k.px('#ffffff55', x + 1, -14, 1, 1); }
      k.px('#b8a080', -14, -22, 8, 6); k.px('#8a7050', -13, -22, 6, 1); k.px('#d8c8a8', 6, -21, 7, 5);
      k.poly(INK, [[-22, -24], [0, -36], [22, -24]]); k.poly(P.roof[2], [[-20, -25], [0, -35], [20, -25]]); k.poly(P.roof[1], [[0, -35], [20, -25], [2, -25]]);
      if (P.snowy) { k.poly(P.snow[1], [[-20, -25], [0, -35], [1, -25]]); k.poly(P.snow[0], [[0, -35], [20, -25], [8, -25]]); }
      return {};
    },
    well(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 13, 4);
      k.oval(INK, 0, -4, 11, 6); k.oval(P.stone[2], 0, -5, 10, 5); k.oval('#1f2a33', 0, -7, 7, 2);
      for (let x = -9; x < 10; x += 4) k.px(P.stone[1], x, -6, 1, 4);
      for (const x of [-10, 8]) { k.px(INK, x - 1, -24, 4, 19); k.px(P.wood[2], x, -23, 2, 17); }
      k.px(INK, -11, -18, 23, 3); k.px(P.wood[2], -10, -18, 21, 1); k.oval(INK, 0, -17, 3, 3); k.oval(P.wood[1], 0, -17, 2, 2);
      k.px(P.cloth[1], 0, -14, 1, 6); k.px(INK, -2, -9, 5, 3); k.px(P.wood[1], -1, -9, 3, 2);
      k.poly(INK, [[-14, -22], [0, -32], [14, -22]]); k.poly(P.roof[2], [[-13, -23], [0, -31], [13, -23]]);
      if (P.snowy) { k.poly(P.snow[1], [[-13, -23], [0, -31], [1, -23]]); k.poly(P.snow[0], [[0, -31], [13, -23], [6, -23]]); }
      return {};
    },
    lamp(k, P) {
      k.oval(SHADE, 1, 1, 6, 2);
      k.px(INK, -3, -6, 7, 6); rubble(k, -2, -5, 5, 5, P.stone, random(3));
      k.px(INK, -1, -22, 3, 17); k.px(P.wood[2], 0, -22, 1, 17);
      k.px(INK, -1, -23, 8, 2); k.px(P.wood[2], 0, -23, 6, 1);
      k.px(INK, 3, -21, 6, 6); k.px(P.metal[0], 4, -20, 4, 4); k.px(P.metal[2], 4, -21, 4, 1);
      return {flame: [4, -19, 3, 3]};
    },
    orecart(k, P, s) {
      const x = s.x || 0;
      k.px(INK, x - 6, -8, 12, 6); k.px(P.metal[1], x - 5, -7, 10, 4); k.px(P.metal[2], x - 5, -7, 10, 1);
      for (let i = 0; i < 4; i++) k.oval(i % 2 ? '#c9a25a' : P.stone[2], x - 3 + i * 2, -9, 1, 1);
      for (const dx of [-4, 3]) { k.oval(INK, x + dx, -1, 2, 2); k.oval(P.metal[0], x + dx, -1, 1, 1); }
      return {};
    },
    headframe(k, P, s, rnd) { return nordharyn.workshop(k, P, {...s, w: 40}, rnd, []); },
    watchtower(k, P, s, rnd) {
      // Torre di guardia di tronchi su zoccolo di pietra, con piattaforma, parapetto e tettuccio ripido.
      k.oval(SHADE, 2, 1, 12, 4);
      k.px(INK, -9, -9, 18, 9); rubble(k, -8, -8, 16, 8, P.stone, rnd);
      for (const x of [-7, 5]) { k.px(INK, x - 1, -40, 4, 32); k.px(P.wood[2], x, -39, 2, 31); }
      k.line(P.wood[1], -6, -12, 5, -28); k.line(P.wood[1], 5, -12, -6, -28);
      k.px(INK, -11, -42, 22, 3); planks(k, -10, -42, 20, 2, P.wood, rnd);
      k.px(INK, -10, -48, 20, 6); planks(k, -9, -47, 18, 5, P.wood, rnd, true);
      k.poly(INK, [[-13, -48], [0, -60], [13, -48]]); k.poly(P.roof[2], [[-12, -49], [0, -59], [12, -49]]); k.poly(P.roof[1], [[0, -59], [12, -49], [2, -49]]);
      if (P.snowy) k.poly(P.snow[1], [[-12, -49], [0, -59], [-8, -51]]);
      k.px(P.cloth[0], 1, -66, 5, 3); k.px(INK, 0, -67, 1, 8);
      return {};
    }
  };

  // ------------------------------------------------------------------ Myrathen
  const myrathen = {
    house(k, P, s, rnd, wins) {
      // Zoccolo scuro, tavole verticali nere con coprifili, vetrate a piombo, tetto di rame con lucernario e rampicante.
      const hw = s.w / 2, st = s.stories, H = 12 + (st - 1) * 10;
      k.oval(SHADE, 3, 1, hw + 5, 5);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1);
      planks(k, -hw, -H, s.w, H, P.wood, rnd, true, 4);
      for (let x = -hw + 3; x < hw; x += 8) k.px(P.wood[3], x, -H, 1, H);
      ashlar(k, -hw, -4, s.w, 4, P.stone, rnd, 4);
      if (st > 1) { k.px(P.copper[0], -hw - 1, -13, s.w + 2, 2); k.px(P.copper[2], -hw, -13, s.w, 1); }
      door(k, s.door || 0, 8, 12, 'double', P, {glass: P.pane[2], step: P.stone[2]});
      k.oval(INK, s.door || 0, -13, 4, 2); k.oval(P.pane[2], s.door || 0, -13, 3, 1);
      for (const x of [-hw + 3, hw - 10].filter(x => Math.abs(x + 3 - (s.door || 0)) > 8)) win(k, wins, x, -11, 7, 8, 'leaded', P);
      if (st > 1) for (let i = 0, n = Math.max(2, Math.round(s.w / 16)); i < n; i++) win(k, wins, Math.round(-hw + 4 + i * (s.w - 14) / (n - 1)), -H + 3, 6, 7, 'tall', P);
      wallShadow(k, -hw, -H, s.w);
      const ridge = -H - Math.round(7 + s.w / 7);
      slope(k, -hw, hw, -H, ridge, Math.round(s.w / 10), P.roof, 'copper', rnd);
      // Lucernario a cupoletta di rame e vetro
      const cx = Math.round(-hw / 3) * (s.v % 2 ? -1 : 1);
      k.px(INK, cx - 4, ridge - 4, 9, 6); k.px(P.pane[1], cx - 3, ridge - 3, 7, 4); k.px(P.pane[2], cx - 3, ridge - 3, 3, 2); wins.push({x: cx - 3, y: ridge - 3, w: 7, h: 4});
      dome(k, cx, ridge - 4, 4, 3, P.roof, 1);
      k.px(P.copper[2], cx, ridge - 10, 1, 3);
      vines(k, -hw - 1, -1, Math.round(H * .9), P, rnd); if (s.v % 2) vines(k, hw, -1, Math.round(H * .7), P, rnd);
      planter(k, (s.door || 0) + 6, P, 4);
      return {door: {x: s.door || 0, y: 0}};
    },
    workshop(k, P, s, rnd, wins) {
      // Laboratorio alchemico: serra di vetro sul fianco, alambicco di rame con serpentina, fiale colorate, fumo tinto.
      const meta = myrathen.house(k, P, {...s, stories: 1, door: -Math.round(s.w / 5)}, rnd, wins), hw = s.w / 2;
      const gx = Math.round(hw - 9);
      k.px(INK, gx - 7, -15, 16, 15); k.px(P.pane[0], gx - 6, -14, 14, 13);
      for (let x = gx - 6; x < gx + 8; x += 3) k.px(P.pane[2], x, -14, 1, 13);
      k.px(P.pane[3], gx - 6, -14, 14, 1); k.px(P.plant[2], gx - 5, -6, 4, 5); k.px(P.plant[3], gx - 4, -7, 2, 2); k.px(P.plant[1], gx + 2, -5, 4, 4);
      k.poly(INK, [[gx - 8, -15], [gx + 1, -22], [gx + 10, -15]]); k.poly(P.pane[1], [[gx - 6, -16], [gx + 1, -21], [gx + 8, -16]]); k.line(P.pane[3], gx - 4, -17, gx + 1, -20);
      wins.push({x: gx - 6, y: -14, w: 14, h: 13});
      myrathen.alembic(k, P, {x: -hw + 6}, rnd);
      k.oval('#c96ad955', -hw + 10, -H(s) - 22, 3, 2); k.oval('#6ad9b444', -hw + 13, -H(s) - 27, 4, 2);
      return meta;
    },
    hall(k, P, s, rnd, wins) {
      // Accademia: facciata nera con alte vetrate, cupola costolonata di rame con lanterna di vetro e cannocchiale.
      const hw = s.w / 2, H = 24;
      k.oval(SHADE, 3, 1, hw + 6, 6);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1);
      planks(k, -hw, -H, s.w, H, P.wood, rnd, true, 4);
      ashlar(k, -hw, -5, s.w, 5, P.stone, rnd, 5);
      for (const x of [-hw, hw - 4]) { k.px(P.stone[2], x, -H, 4, H); k.px(P.stone[3], x, -H, 1, H); }
      const n = Math.max(3, Math.round(s.w / 14));
      for (let i = 0; i < n; i++) { const x = Math.round(-hw + 6 + i * (s.w - 18) / (n - 1)); if (Math.abs(x + 3) < 7) continue; win(k, wins, x, -H + 4, 6, 12, 'tall', P); }
      door(k, 0, 10, 15, 'double', P, {glass: P.pane[2], step: P.stone[2]});
      k.oval(INK, 0, -16, 5, 3); k.oval(P.pane[2], 0, -16, 4, 2); k.px(P.pane[0], 0, -18, 1, 3);
      k.px(INK, -hw - 3, -H - 3, s.w + 6, 3); k.px(P.copper[1], -hw - 2, -H - 3, s.w + 4, 2); k.px(P.copper[2], -hw - 2, -H - 3, s.w + 4, 1);
      const r = Math.round(hw * .7);
      dome(k, 0, -H - 3, r, Math.round(r * .8), P.roof, 4);
      k.px(INK, -4, -H - 3 - Math.round(r * .8) - 7, 9, 8); k.px(P.pane[1], -3, -H - 3 - Math.round(r * .8) - 6, 7, 6); k.px(P.pane[2], -3, -H - 3 - Math.round(r * .8) - 6, 3, 3);
      wins.push({x: -3, y: -H - 3 - Math.round(r * .8) - 6, w: 7, h: 6});
      dome(k, 0, -H - 3 - Math.round(r * .8) - 7, 4, 3, P.roof, 1); k.px(P.copper[2], 0, -H - 3 - Math.round(r * .8) - 13, 1, 3);
      k.line(INK, Math.round(r * .5), -H - 6, Math.round(r * .5) + 9, -H - 15, 3); k.line(P.copper[2], Math.round(r * .5), -H - 6, Math.round(r * .5) + 9, -H - 15, 1);
      vines(k, -hw - 1, -1, 18, P, rnd); vines(k, hw, -1, 14, P, rnd);
      return {door: {x: 0, y: 0}};
    },
    stall(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 19, 4);
      for (const x of [-17, 14]) { k.px(INK, x, -25, 3, 25); k.px(P.copper[1], x + 1, -24, 1, 24); }
      k.px(INK, -18, -10, 36, 7); planks(k, -17, -10, 34, 6, P.wood, rnd, true);
      for (let i = 0; i < 7; i++) { const x = -15 + i * 4, c = P.potion[(i + s.v) % 4]; k.px(INK, x, -16, 3, 6); k.px(c, x + 1, -14, 1, 3); k.px(P.pane[3], x + 1, -15, 1, 1); }
      k.px(INK, -20, -28, 40, 5); k.px(P.pane[1], -19, -27, 38, 3); for (let x = -19; x < 19; x += 4) k.px(P.pane[3], x, -27, 1, 3);
      k.px(P.roof[2], -21, -29, 42, 2); k.px(P.roof[3], -21, -29, 42, 1);
      return {};
    },
    well(k, P, s, rnd) {
      // Fontanella di rame: vasca di pietra scura, pompa a leva verderame, lume di vetro.
      k.oval(SHADE, 2, 1, 13, 4);
      k.oval(INK, 0, -3, 12, 5); k.oval(P.stone[2], 0, -4, 11, 4); k.oval('#2f6f7f', 0, -5, 8, 2); k.oval('#6fc0c8', -2, -5, 3, 1);
      k.px(INK, -3, -22, 6, 18); k.px(P.roof[2], -2, -21, 4, 16); k.px(P.roof[4], -2, -21, 1, 16);
      k.px(INK, 1, -17, 7, 3); k.px(P.roof[3], 2, -16, 5, 1); k.px(P.roof[2], 6, -15, 1, 3);
      k.line(INK, -2, -21, -9, -25, 2); k.oval(INK, -10, -26, 2, 2); k.oval(P.copper[2], -10, -26, 1, 1);
      k.oval(INK, 0, -24, 3, 3); k.oval(P.pane[2], 0, -24, 2, 2);
      return {};
    },
    lamp(k, P) {
      k.oval(SHADE, 1, 1, 5, 2);
      k.px(INK, -3, -3, 7, 3); k.px(P.stone[2], -2, -3, 5, 2);
      k.px(INK, -1, -18, 3, 16); k.px(P.roof[2], 0, -18, 1, 16); k.px(P.roof[4], 0, -12, 1, 2);
      k.oval(INK, 0, -21, 4, 4); k.oval(P.pane[1], 0, -21, 3, 3); k.oval(P.pane[2], -1, -22, 1, 1);
      k.px(INK, -2, -26, 5, 2); k.px(P.roof[3], -1, -26, 3, 1);
      return {flame: [-1, -22, 3, 3], glow: 'crystal'};
    },
    greenhouse(k, P, s, rnd) {
      const hw = s.w / 2;
      k.oval(SHADE, 2, 1, hw + 3, 4);
      k.px(INK, -hw - 1, -5, s.w + 2, 6); ashlar(k, -hw, -4, s.w, 4, P.stone, rnd, 4);
      k.px(INK, -hw - 1, -20, s.w + 2, 16); k.px(P.pane[0], -hw, -19, s.w, 15);
      for (let x = -hw; x < hw; x += 4) { k.px(P.roof[2], x, -19, 1, 15); k.px(P.pane[2], x + 1, -19, 1, 3); }
      for (let i = 0; i < s.w; i += 5) { k.px(P.plant[1 + (i % 3)], -hw + i + 1, -10, 3, 6); k.px(P.plant[3], -hw + i + 2, -11, 1, 2); if (i % 2) k.px(P.bloom[i % 2], -hw + i + 1, -12, 1, 1); }
      k.poly(INK, [[-hw - 2, -20], [-hw + 6, -32], [hw - 6, -32], [hw + 2, -20]]); k.poly(P.pane[1], [[-hw, -21], [-hw + 7, -31], [hw - 7, -31], [hw, -21]]);
      for (let x = -hw + 4; x < hw - 2; x += 5) k.line(P.roof[3], x, -21, Math.round(x * .75), -31);
      k.line(P.pane[3], -hw + 3, -22, -hw + 8, -30); k.px(P.roof[3], -hw + 7, -32, s.w - 14, 1);
      return {};
    },
    alembic(k, P, s, rnd) {
      const x = s.x || 0;
      k.oval(SHADE, x + 2, 1, 9, 3);
      k.px(INK, x - 6, -6, 12, 6); k.px(P.stone[2], x - 5, -5, 10, 5); k.px('#e0782e', x - 2, -4, 4, 2);
      k.oval(INK, x, -12, 6, 6); k.oval(P.copper[1], x, -12, 5, 5); k.oval(P.copper[2], x - 2, -14, 2, 2);
      k.px(INK, x - 2, -21, 4, 5); k.px(P.copper[1], x - 1, -20, 2, 4);
      k.line(INK, x + 1, -20, x + 9, -16, 2); k.line(P.copper[2], x + 1, -20, x + 9, -16, 1);
      for (let y = -15; y < -5; y += 3) { k.px(INK, x + 7, y, 5, 2); k.px(P.copper[1], x + 8, y, 3, 1); }
      k.px(INK, x + 8, -5, 4, 5); k.px(P.potion[1], x + 9, -4, 2, 3); k.px(P.pane[3], x + 9, -5, 1, 1);
      return {};
    },
    vinearch(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 16, 4);
      for (const x of [-13, 11]) { k.px(INK, x - 1, -24, 4, 24); k.px(P.wood[2], x, -23, 2, 23); }
      for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12, x = Math.round(-12 * Math.cos(a)), y = Math.round(-24 - 8 * Math.sin(a)); k.px(INK, x - 1, y - 1, 3, 3); k.px(P.copper[1], x, y, 1, 1); }
      for (let i = 0; i < 26; i++) { const a = Math.PI * rnd(), r = 11 + rnd() * 3, x = Math.round(-r * Math.cos(a)), y = Math.round(-24 - (r - 4) * Math.sin(a)); k.px(P.plant[1 + Math.floor(rnd() * 3)], x, y, 2, 2); if (rnd() < .2) k.px(P.bloom[Math.floor(rnd() * 2)], x, y, 1, 1); }
      vines(k, -12, -1, 22, P, rnd); vines(k, 12, -1, 22, P, rnd);
      return {};
    }
  };
  const H = s => 12 + (s.stories - 1) * 10;

  // ------------------------------------------------------------------ Voryndhal
  const rootArc = (k, P, x0, x1, base, top, thick) => {
    // Radice ad arco: tronco curvo con lato in luce e lato in ombra.
    const pts = [];
    for (let i = 0, n = Math.max(24, Math.round(Math.abs(x1 - x0) + Math.abs(base - top) * 1.5)); i <= n; i++) {
      const t = i / n, w = Math.max(2, thick * (1 - Math.abs(t - .5) * .7) * (t < .08 || t > .92 ? 1.5 : 1));
      pts.push([x0 + (x1 - x0) * t, base - (base - top) * Math.sin(Math.PI * t), w / 2]);
    }
    for (const [x, y, r] of pts) k.oval(INK, x, y, r + 1, r + 1);
    for (const [x, y, r] of pts) k.oval(P.root[2], x, y, r, r);
    for (const [x, y, r] of pts) { k.px(P.root[3], x - Math.floor(r) + 1, y - Math.round(r), Math.max(1, Math.round(r)), 1); if (r > 1.5) k.px(P.root[1], x - Math.floor(r) + 1, y + Math.round(r), Math.max(1, Math.round(r * 1.5)), 1); }
    for (let i = 3; i < pts.length - 3; i += 7) { const [x, y, r] = pts[i]; if (r > 2) k.px(P.root[1], x, y - 1, 1, 2); }
  };
  const voryndhal = {
    house(k, P, s, rnd, wins) {
      // Casa fra le radici: muro di corteccia arrotondato, porta e finestre tonde, tetto di foglie o di paglia a cupola.
      const hw = s.w / 2, st = s.stories, H = 11 + (st - 1) * 9;
      k.oval(SHADE, 3, 1, hw + 6, 5);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1); bark(k, -hw, -H, s.w, H, P.wood, rnd);
      k.px(P.wood[0], -hw, -H, 2, H); k.px(P.wood[3], hw - 2, -H, 2, H);
      k.px(P.moss, -hw, -3, s.w, 2); for (let x = -hw; x < hw; x += 3) k.px(P.plant[2], x, -4, 2, 1);
      door(k, s.door || 0, 8, 12, 'round', P, {step: P.root[2]});
      for (const x of [-hw + 4, hw - 9].filter(x => Math.abs(x + 2 - (s.door || 0)) > 8)) { k.oval(INK, x + 2, -H + 6, 3, 3); k.oval(P.glass, x + 2, -H + 6, 2, 2); k.px(P.wood[1], x + 2, -H + 4, 1, 5); wins.push({x: x, y: -H + 4, w: 5, h: 5}); }
      wallShadow(k, -hw, -H, s.w);
      const R = P.roof, ry = Math.round(hw * .75) + 4, base = -H + 3, top = base - ry;
      k.half(INK, 0, base, hw + 6, ry + 1); k.half(R[1], 0, base, hw + 5, ry);
      for (let row = 0; row < 6; row++) {
        const y = base - Math.round(row * ry / 6), half = Math.round((hw + 5) * Math.sqrt(Math.max(0, 1 - (row / 6) ** 2)));
        for (let x = -half + (row % 2) * 2; x < half - 1; x += 4) { k.px(R[row > 3 ? 3 : 2], x, y - 3, 4, 3); k.px(R[4], x + 1, y - 4, 2, 1); k.px(R[0], x, y, 4, 1); }
      }
      for (let x = -hw - 5; x < hw + 5; x += 3) k.px(R[1], x, base, 2, 1 + ((x / 3) & 1));
      k.px(R[4], -1, top - 1, 3, 2);
      rootArc(k, P, -hw - 5, -hw + 6, 0, -H - 6, 3);
      if (s.v % 2 === 0) rootArc(k, P, hw - 4, hw + 6, 0, -H + 2, 3);
      k.oval(P.glow, -hw - 2, -2, 1, 1); k.oval(P.glow, hw + 3, -1, 1, 1);
      return {door: {x: s.door || 0, y: 0}};
    },
    workshop(k, P, s, rnd, wins) {
      // Capanna su piattaforma con scaletta e passerella di corda.
      const hw = s.w / 2, lift = 9;
      k.oval(SHADE, 3, 1, hw + 6, 5);
      for (const x of [-hw + 2, -2, hw - 5]) { k.px(INK, x - 1, -lift - 1, 4, lift + 1); k.px(P.root[2], x, -lift, 2, lift); k.px(P.root[3], x, -lift, 1, lift); }
      k.px(INK, -hw - 3, -lift - 3, s.w + 6, 4); planks(k, -hw - 2, -lift - 3, s.w + 4, 3, P.wood, rnd);
      const H = 14;
      k.px(INK, -hw + 1, -lift - H - 3, s.w - 2, H); bark(k, -hw + 2, -lift - H - 2, s.w - 4, H - 1, P.wood, rnd);
      k.oval(INK, 0, -lift - 9, 4, 5); k.oval('#1a1410', 0, -lift - 9, 3, 4);
      k.oval(INK, -hw + 7, -lift - 11, 3, 3); k.oval(P.glass, -hw + 7, -lift - 11, 2, 2); wins.push({x: -hw + 5, y: -lift - 13, w: 5, h: 5});
      for (let y = -lift; y < 0; y += 3) { k.px(INK, -3, y, 7, 1); k.px(P.wood[3], -2, y, 5, 1); } k.px(P.wood[2], -3, -lift, 1, lift); k.px(P.wood[2], 3, -lift, 1, lift);
      const top = -lift - H - 3;
      k.poly(INK, [[-hw - 4, top + 1], [0, top - 15], [hw + 4, top + 1]]); k.poly(P.roof[2], [[-hw - 3, top], [0, top - 14], [hw + 3, top]]); k.poly(P.roof[1], [[0, top - 14], [hw + 3, top], [1, top]]);
      for (let i = 1; i < 4; i++) { const y = top - 14 + i * 4, half = Math.round((hw + 3) * i * 4 / 14); for (let x = -half; x < half; x += 3) k.px(P.roof[3], x, y, 2, 1); }
      k.px(INK, hw + 1, -lift - 4, 1, 4); k.line(P.rope[1], hw + 2, -lift - 4, hw + 12, -lift + 1); k.line(P.rope[1], hw + 2, -lift - 1, hw + 12, -lift + 4);
      for (let x = hw + 3; x < hw + 12; x += 2) k.px(P.wood[2], x, Math.round(-lift - 1 + (x - hw - 2) * .5), 2, 1);
      k.px(P.cloth[0], -hw, -lift - 6, 6, 3); k.px(P.cloth[1], -hw + 2, -lift - 6, 2, 3);
      return {door: {x: 0, y: 0}};
    },
    hall(k, P, s, rnd, wins) {
      // Loggia sotto la grande radice: due radici monumentali si incontrano sopra una sala di corteccia con lanterne.
      const hw = s.w / 2, H = 18;
      k.oval(SHADE, 3, 1, hw + 9, 6);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1); bark(k, -hw, -H, s.w, H, P.wood, rnd); k.px(P.moss, -hw, -3, s.w, 2);
      k.oval(INK, 0, -10, 6, 8); k.oval('#1a1410', 0, -10, 5, 7); k.px('#1a1410', -5, -10, 11, 10); k.px(P.root[2], -6, -1, 13, 1);
      for (const x of [-hw + 5, hw - 10]) { k.oval(INK, x + 2, -11, 3, 3); k.oval(P.glass, x + 2, -11, 2, 2); wins.push({x, y: -13, w: 5, h: 5}); }
      const top = -H - 3;
      k.px(INK, -hw - 4, top, s.w + 8, 4); for (let x = -hw - 3; x < hw + 3; x += 4) { k.px(P.roof[2], x, top - 1, 4, 4); k.px(P.roof[4], x + 1, top - 2, 2, 1); }
      rootArc(k, P, -hw - 8, hw + 8, 1, top - 24, 6);
      rootArc(k, P, -hw - 2, hw + 2, 0, top - 14, 3);
      for (const x of [-Math.round(hw / 2), Math.round(hw / 2)]) { k.px(P.rope[0], x, top - 16 + Math.round(Math.abs(x) / 3), 1, 6); k.px(INK, x - 2, top - 10 + Math.round(Math.abs(x) / 3), 5, 5); k.px(P.glass, x - 1, top - 9 + Math.round(Math.abs(x) / 3), 3, 3); wins.push({x: x - 1, y: top - 9 + Math.round(Math.abs(x) / 3), w: 3, h: 3}); }
      for (let i = 0; i < 18; i++) { const a = Math.PI * (.15 + .7 * rnd()), x = Math.round(-(hw + 6) * Math.cos(a)), y = Math.round(top - 22 * Math.sin(a)); k.px(P.plant[1 + Math.floor(rnd() * 3)], x, y - 3, 3, 2); }
      return {door: {x: 0, y: 0}};
    },
    stall(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 19, 4);
      for (const x of [-16, 14]) { k.px(INK, x - 1, -24, 4, 24); k.px(P.root[2], x, -23, 2, 23); }
      k.px(INK, -18, -10, 36, 7); bark(k, -17, -10, 34, 6, P.wood, rnd);
      for (let i = 0; i < 6; i++) { const x = -15 + i * 5; k.oval(INK, x + 2, -12, 2, 2); k.oval(i % 2 ? '#e0b04a' : '#8fb35a', x + 2, -12, 1, 1); }
      k.oval(INK, 0, -26, 23, 6); k.oval(P.roof[2], 0, -27, 22, 5); for (let x = -20; x < 20; x += 4) { k.px(P.roof[3], x, -29, 3, 2); k.px(P.roof[1], x + 1, -24, 3, 1); }
      return {};
    },
    well(k, P, s, rnd) {
      // Sorgente fra le radici: pozza tonda, sassi, radici che la cingono e una zucca per attingere.
      k.oval(SHADE, 2, 1, 14, 4);
      k.oval(INK, 0, -3, 13, 6); k.oval(P.stone[2], 0, -4, 12, 5); k.oval('#2f6f6a', 0, -5, 10, 3); k.oval('#7fc0b0', -3, -6, 4, 1);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; k.oval(P.stone[3], Math.round(Math.cos(a) * 11), -4 + Math.round(Math.sin(a) * 4), 2, 1); }
      rootArc(k, P, -14, 4, -2, -20, 3); rootArc(k, P, -2, 14, -2, -16, 2);
      k.oval(INK, 9, -8, 3, 3); k.oval('#c9a24a', 9, -8, 2, 2);
      return {};
    },
    lamp(k, P) {
      k.oval(SHADE, 1, 1, 5, 2);
      k.px(INK, -1, -24, 3, 24); k.px(P.root[2], 0, -24, 1, 24);
      k.line(INK, 0, -24, 5, -28, 2); k.px(P.rope[1], 5, -27, 1, 3);
      k.px(INK, 3, -24, 5, 6); k.px(P.glass, 4, -23, 3, 4); k.px(P.wood[1], 3, -25, 5, 1);
      return {flame: [4, -23, 3, 3], glow: 'fire'};
    },
    rootarch(k, P, s, rnd) {
      const hw = s.w / 2;
      k.oval(SHADE, 2, 1, hw + 4, 5);
      rootArc(k, P, -hw, hw, 0, -40, 7); rootArc(k, P, -hw + 6, hw - 4, 0, -28, 3);
      for (let i = 0; i < 14; i++) { const x = Math.round(-hw + 4 + rnd() * (s.w - 8)); k.px(P.moss, x, -Math.round(30 + rnd() * 8), 3, 1); }
      for (const x of [-hw - 2, hw - 3]) { k.oval(INK, x + 2, -1, 4, 2); k.oval(P.root[1], x + 2, -1, 3, 1); }
      k.px(P.rope[0], -4, -34, 1, 8); k.px(INK, -6, -27, 5, 5); k.px(P.glass, -5, -26, 3, 3);
      return {};
    },
    walkway(k, P, s, rnd) {
      // Passerella sospesa fra due pali: assi, corrimano di corda e lanterna.
      const hw = s.w / 2;
      k.oval(SHADE, 2, 1, hw + 2, 3);
      for (const x of [-hw, hw - 3]) { k.px(INK, x - 1, -26, 5, 26); k.px(P.root[2], x, -25, 3, 25); k.px(P.root[3], x, -25, 1, 25); }
      for (let x = -hw + 3; x < hw - 3; x += 2) { const sag = Math.round(4 * Math.sin(Math.PI * (x + hw) / s.w)); k.px(INK, x, -16 + sag, 2, 3); k.px(P.wood[3], x, -16 + sag, 1, 2); }
      for (const yo of [-23, -20]) for (let x = -hw + 3; x < hw - 3; x++) k.px(P.rope[1], x, yo + Math.round(3 * Math.sin(Math.PI * (x + hw) / s.w)), 1, 1);
      k.px(INK, -1, -16, 3, 3); k.px(P.glass, 0, -15, 1, 1);
      return {};
    },
    platform(k, P, s, rnd) {
      k.oval(SHADE, 2, 1, 14, 4);
      for (const x of [-10, 8]) { k.px(INK, x - 1, -30, 4, 30); k.px(P.root[2], x, -29, 2, 29); }
      k.px(INK, -14, -32, 28, 4); planks(k, -13, -32, 26, 3, P.wood, rnd);
      for (let x = -13; x < 14; x += 4) k.px(P.rope[1], x, -37, 1, 5); k.px(P.rope[0], -13, -37, 27, 1);
      for (let y = -29; y < 0; y += 3) { k.px(INK, -4, y, 8, 1); k.px(P.wood[3], -3, y, 6, 1); }
      k.oval(INK, 0, -42, 12, 5); k.oval(P.roof[2], 0, -43, 11, 4); k.oval(P.roof[3], -3, -44, 5, 2);
      return {};
    }
  };

  // ------------------------------------------------------------------ Azheryon
  const azheryon = {
    house(k, P, s, rnd, wins) {
      // Casa a terrazza: muro di pietra calda o calce, travi sporgenti, grate di legno, parapetto e cupoletta.
      const hw = s.w / 2, st = s.stories, H = 12 + (st - 1) * 10, coast = P.stone[4] === '#ffffff';
      k.oval(SHADE, 3, 1, hw + 5, 5);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1);
      lime(k, -hw, -H, s.w, H, P, rnd);
      if (!coast) for (let x = -hw + 3; x < hw - 2; x += 6) { k.px(INK, x - 1, -H + 1, 3, 3); k.px(P.wood[2], x, -H + 2, 2, 1); }
      door(k, s.door || 0, 8, 12, 'arch', {...P, wood: coast ? [P.shutter[0], P.shutter[1], P.shutter[1], P.shutter[1]] : P.wood}, {step: P.stone[1]});
      k.px(INK, (s.door || 0) - 6, -15, 12, 1); k.px(P.stone[3], (s.door || 0) - 5, -16, 10, 1);
      for (const x of [-hw + 4, hw - 10].filter(x => Math.abs(x + 3 - (s.door || 0)) > 8)) {
        if (coast) win(k, wins, x, -10, 6, 6, 'shutters', P); else win(k, wins, x, -10, 6, 6, 'lattice', P);
      }
      if (st > 1) { for (let i = 0, n = Math.max(2, Math.round(s.w / 18)); i < n; i++) win(k, wins, Math.round(-hw + 5 + i * (s.w - 16) / (n - 1)), -H + 4, 5, 6, coast ? 'shutters' : 'lattice', P); k.px(P.tile[0], -hw, -13, s.w, 1); for (let x = -hw; x < hw; x += 3) k.px(P.tile[1], x, -13, 1, 1); }
      // Terrazza: parapetto, cuscini di tetto e cupoletta in un angolo
      k.px(INK, -hw - 2, -H - 4, s.w + 4, 4); k.px(P.plaster[2], -hw - 1, -H - 4, s.w + 2, 2); k.px(P.plaster[0], -hw - 1, -H - 2, s.w + 2, 1);
      const cx = s.v % 2 ? Math.round(hw / 2) : -Math.round(hw / 2);
      if (s.v % 3 !== 2) dome(k, cx, -H - 4, Math.round(hw / 2.6), Math.round(hw / 3), P.roof, 2);
      else { k.px(INK, cx - 8, -H - 14, 1, 10); k.px(INK, cx + 8, -H - 14, 1, 10); k.poly(P.cloth[0], [[cx - 9, -H - 15], [cx + 9, -H - 15], [cx + 7, -H - 11], [cx - 7, -H - 11]]); for (let x = cx - 7; x < cx + 8; x += 4) k.px(P.cloth[1], x, -H - 14, 2, 3); }
      if (s.v % 2 === 0) { k.px(P.cloth[2], -hw + 1, -H - 6, 6, 1); k.px(P.cloth[3], -hw + 2, -H - 6, 3, 1); }
      return {door: {x: s.door || 0, y: 0}};
    },
    workshop(k, P, s, rnd, wins) {
      // Bottega del tintore: portico a due archi sul fronte, matasse colorate stese ad asciugare.
      const meta = azheryon.house(k, P, {...s, stories: 2}, rnd, wins), hw = s.w / 2;
      azheryon.portico(k, P, {w: s.w - 4, arches: 2, h: 13, front: true}, rnd);
      k.px(INK, -hw - 4, -34, s.w + 8, 1);
      for (let i = 0; i < 6; i++) { const x = -hw - 2 + i * Math.round((s.w + 4) / 6); k.px(P.cloth[i % 4], x, -33, 3, 6 + (i % 2) * 2); }
      return meta;
    },
    hall(k, P, s, rnd, wins) {
      // Caravanserraglio: portico a tre archi, cupola centrale su tamburo, fregio di piastrelle smaltate.
      const hw = s.w / 2, H = 24;
      k.oval(SHADE, 3, 1, hw + 6, 6);
      k.px(INK, -hw - 1, -H - 1, s.w + 2, H + 1); lime(k, -hw, -H, s.w, H, P, rnd);
      k.px(P.tile[0], -hw, -H + 2, s.w, 3); for (let x = -hw; x < hw; x += 4) { k.px(P.tile[1], x, -H + 2, 2, 1); k.px(P.tile[2], x + 1, -H + 3, 1, 1); }
      azheryon.portico(k, P, {w: s.w, arches: 3, h: 16, front: true}, rnd);
      for (const x of [-hw + 4, hw - 9]) win(k, wins, x, -H + 7, 5, 5, 'lattice', P);
      wins.push({x: -3, y: -12, w: 6, h: 8});
      k.px(INK, -hw - 2, -H - 3, s.w + 4, 3); k.px(P.plaster[2], -hw - 1, -H - 3, s.w + 2, 2);
      const r = Math.round(hw * .55);
      k.px(INK, -r - 1, -H - 9, r * 2 + 3, 7); lime(k, -r, -H - 8, r * 2 + 1, 6, P, rnd); for (let x = -r + 2; x < r; x += 4) { k.px(INK, x, -H - 7, 2, 3); k.px(P.glass, x, -H - 7, 2, 2); }
      dome(k, 0, -H - 9, r, Math.round(r * .9), P.roof, 3);
      k.px(P.metal[2], 0, -H - 9 - Math.round(r * .9) - 5, 1, 5); k.oval(P.metal[2], 0, -H - 9 - Math.round(r * .9) - 6, 1, 1);
      for (const x of [-hw - 1, hw - 3]) { k.px(INK, x - 1, -H - 10, 5, 10); k.px(P.plaster[2], x, -H - 9, 3, 9); k.oval(P.roof[3], x + 1, -H - 10, 2, 2); }
      return {door: {x: 0, y: 0}};
    },
    stall(k, P, s, rnd) {
      // Banco carovaniero: tenda a strisce su pali, tappeti arrotolati, spezie in ceste.
      k.oval(SHADE, 2, 1, 20, 4);
      for (const x of [-18, 16]) { k.px(INK, x - 1, -26, 3, 26); k.px(P.wood[2], x, -25, 1, 25); }
      k.px(INK, -19, -9, 38, 6); k.px(P.wood[1], -18, -9, 36, 5); k.px(P.wood[3], -18, -9, 36, 1);
      const sp = ['#d9a24e', '#a84b3a', '#e7c88a', '#7a9455'];
      for (let i = 0; i < 5; i++) { const x = -15 + i * 7; k.oval(INK, x + 2, -11, 3, 2); k.oval(P.wood[2], x + 2, -11, 2, 1); k.oval(sp[(i + s.v) % 4], x + 2, -13, 2, 1); }
      for (let i = 0; i < 3; i++) { k.px(INK, -16 + i * 4, -17, 4, 4); k.px(P.cloth[i % 4], -15 + i * 4, -16, 2, 2); }
      k.poly(INK, [[-23, -20], [-14, -33], [14, -33], [23, -20]]);
      for (let x = -22, i = 0; x < 22; x += 5, i++) k.poly(i % 2 ? P.cloth[1] : P.cloth[0], [[x, -21], [Math.round(x * .62), -32], [Math.round((x + 5) * .62), -32], [x + 5, -21]]);
      for (let x = -22, i = 0; x < 22; x += 5, i++) k.px(i % 2 ? P.cloth[1] : P.cloth[0], x, -21, 5, 3);
      return {};
    },
    well(k, P, s, rnd) {
      // Pozzo della cisterna: parapetto quadrato, arco di pietra con carrucola, giara.
      k.oval(SHADE, 2, 1, 13, 4);
      k.px(INK, -11, -9, 22, 9); lime(k, -10, -8, 20, 8, P, rnd); k.px('#1f2a33', -8, -9, 16, 2);
      k.px(INK, -10, -26, 4, 18); k.px(P.plaster[2], -9, -25, 2, 16); k.px(INK, 6, -26, 4, 18); k.px(P.plaster[2], 7, -25, 2, 16);
      for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10, x = Math.round(-8 * Math.cos(a)), y = Math.round(-25 - 5 * Math.sin(a)); k.px(INK, x - 1, y - 1, 3, 3); k.px(P.plaster[2], x, y, 1, 1); }
      k.oval(INK, 0, -27, 2, 2); k.oval(P.metal[2], 0, -27, 1, 1); k.px(P.cloth[3], 0, -25, 1, 12);
      k.oval(INK, 13, -4, 4, 4); k.oval(P.roof[2], 13, -4, 3, 3); k.px(INK, 12, -9, 3, 2);
      return {};
    },
    lamp(k, P) {
      k.oval(SHADE, 1, 1, 5, 2);
      k.px(INK, -2, -4, 5, 4); k.px(P.stone[2], -1, -4, 3, 3);
      k.px(INK, -1, -20, 3, 17); k.px(P.wood[2], 0, -20, 1, 17);
      k.oval(INK, 0, -23, 3, 4); k.oval(P.metal[2], 0, -23, 2, 3); k.px(INK, -1, -24, 3, 3); k.px(INK, 0, -28, 1, 2);
      return {flame: [-1, -24, 3, 3]};
    },
    portico(k, P, s, rnd) {
      // Arcata: pilastri e archi a tutto sesto, ripetibile in serie; con `front` copre il piano terra di un edificio.
      const w = s.w, hw = w / 2, n = s.arches || Math.max(2, Math.round(w / 14)), h = s.h || 18, span = w / n;
      if (!s.front) { k.oval(SHADE, 2, 1, hw + 3, 4); }
      k.px(INK, -hw - 1, -h - 4, w + 2, 5); lime(k, -hw, -h - 3, w, 4, P, rnd);
      k.px(INK, -hw - 1, -h, w + 2, h); lime(k, -hw, -h, w, h, P, rnd);
      for (let i = 0; i < n; i++) {
        const cx = Math.round(-hw + span * (i + .5)), r = Math.max(3, Math.floor(span / 2) - 3), spring = -h + r + 2;
        k.half(INK, cx, spring, r + 1, r + 1); k.px(INK, cx - r - 1, spring, 2 * r + 3, -spring);
        k.half('#3a2a22', cx, spring, r, r); k.px('#3a2a22', cx - r, spring, 2 * r + 1, -spring);
        k.half('#5a4334', cx, spring, r - 1, r - 1); k.px('#5a4334', cx - r + 1, spring, 2 * r - 1, 2);
        k.px(P.stone[1], cx - r, -1, 2 * r + 1, 1);
        k.px(P.plaster[2], cx - r - 1, spring - 1, 1, 1); k.px(P.plaster[2], cx + r + 1, spring - 1, 1, 1);
      }
      k.px(P.stone[1], -hw, -1, w, 1);
      return {};
    },
    tent(k, P, s, rnd) {
      const hw = s.w / 2;
      k.oval(SHADE, 2, 1, hw + 3, 5);
      k.poly(INK, [[-hw - 1, 0], [0, -30], [hw + 1, 0]]);
      for (let i = 0; i < 6; i++) { const x0 = -hw + i * s.w / 6, x1 = -hw + (i + 1) * s.w / 6; k.poly(P.cloth[i % 2 ? 1 : 0], [[x0, 0], [x0 * .1, -29], [x1 * .1, -29], [x1, 0]]); }
      k.poly('#1a1410', [[-5, 0], [0, -13], [5, 0]]); k.poly(P.cloth[2], [[-6, 0], [-1, -13], [-3, 0]]);
      k.px(INK, 0, -35, 1, 6); k.px(P.cloth[2], 1, -35, 5, 3);
      for (const x of [-hw - 4, hw + 3]) { k.line(P.cloth[3], x, 0, Math.round(x * .5), -18); k.px(INK, x, -1, 2, 2); }
      return {};
    },
    pier(k, P, s, rnd) {
      // Molo di legno: assi su pali piantati nell'acqua, bitte, cima arrotolata e lanterna.
      const hw = s.w / 2;
      k.px('#2f5f7a', -hw - 4, -2, s.w + 8, 6); for (let x = -hw - 3; x < hw + 3; x += 5) k.px('#7fb0c0', x, 0, 3, 1);
      for (let x = -hw; x < hw; x += 8) { k.px(INK, x - 1, -6, 4, 9); k.px(P.wood[1], x, -5, 2, 8); }
      k.px(INK, -hw - 1, -9, s.w + 2, 5); planks(k, -hw, -8, s.w, 4, P.wood, rnd, true, 3);
      for (const x of [-hw + 2, hw - 4]) { k.px(INK, x - 1, -15, 4, 7); k.px(P.wood[3], x, -14, 2, 6); }
      k.oval(INK, -hw + 10, -11, 3, 2); k.oval(P.cloth[3], -hw + 10, -11, 2, 1);
      k.px(INK, hw - 4, -24, 1, 10); k.px(INK, hw - 6, -27, 5, 4); k.px(P.glass, hw - 5, -26, 3, 2);
      return {};
    }
  };

  const PAINT = {vaelthoria, nordharyn, myrathen, voryndhal, azheryon};
  const BUILDINGS = ['house', 'workshop', 'hall'], PROPS = ['stall', 'well', 'lamp'];

  // ------------------------------------------------------------------ API
  const cache = new Map();
  let built = 0;
  const clampW = (f, w) => { const [a, b] = FAMILIES[f].rules.widths; return Math.max(a, Math.min(b, Math.round((w || 40) / 2) * 2)); };
  function render(fid, sub, kind, spec = {}) {
    if (!PAINT[fid]?.[kind]) return null;
    const F = FAMILIES[fid], building = BUILDINGS.includes(kind);
    const s = {w: clampW(fid, spec.w || (kind === 'hall' ? 50 : 40)), stories: Math.max(F.rules.stories[0], Math.min(F.rules.stories[1], spec.stories || (kind === 'house' ? 2 : 1))),
      v: (spec.variant | 0) >>> 0, door: spec.door || 0};
    const key = [fid, sub, kind, s.w, s.stories, s.v, s.door].join('/');
    let out = cache.get(key);
    if (out) return out;
    const cw = s.w + 48, ch = 120, ax = cw >> 1, ay = ch - 10;
    const image = document.createElement('canvas'); image.width = cw; image.height = ch;
    const g = image.getContext('2d'), k = kit(g, ax, ay), wins = [], P = paletteOf(fid, sub);
    const meta = PAINT[fid][kind](k, P, s, random(9001 + s.v * 7919 + s.w * 31 + kind.length * 131 + fid.length * 17), wins) || {};
    out = {image, ax, ay, kind, family: fid, sub, footprint: {w: building ? s.w : 0, d: building ? Math.round(s.w * .45) : 0}, door: meta.door || null, windows: wins,
      flame: meta.flame || null, glow: meta.glow || null, spec: s};
    image.ax = ax; image.ay = ay; image.windows = wins;
    cache.set(key, out); built++;
    if (cache.size > 400) cache.delete(cache.keys().next().value);
    return out;
  }
  const familyOf = palette => REGIONS[palette] || null;
  // Catalogo: ogni componente con la richiesta di esempio, per le tavole di prova e per il generatore.
  function catalog(fid) {
    const out = [];
    for (const kind of BUILDINGS) for (const spec of kind === 'house' ? [{w: 32, stories: 1}, {w: 40, stories: 2}, {w: 52, stories: 2, variant: 1}] : kind === 'hall' ? [{w: 50}, {w: 64, variant: 1}] : [{w: 40}])
      out.push({kind, spec});
    for (const kind of PROPS) out.push({kind, spec: {}});
    for (const kind of FAMILIES[fid].signature) out.push({kind, spec: {w: kind === 'walkway' || kind === 'colonnade' || kind === 'portico' || kind === 'pergola' || kind === 'greenhouse' ? 44 : 36}});
    return out;
  }
  // Descrizioni senza funzioni (per il generatore e per i pannelli): materiali, regole, componenti.
  const describe = () => Object.fromEntries(Object.entries(FAMILIES).map(([id, F]) => [id, {id, continent: F.continent, name: F.name, description: F.description,
    rules: F.rules, variants: Object.keys(F.subs), buildings: BUILDINGS.slice(), props: PROPS.slice(), signature: F.signature.slice(),
    materials: Object.fromEntries(Object.entries(F.M).map(([k2, v]) => [k2, Array.isArray(v) ? v.slice() : v]))}]));

  window.CityFamilies = Object.freeze({
    families: Object.freeze(describe()), regions: Object.freeze({...REGIONS}), familyOf, catalog,
    // Richiesta per il generatore: CityFamilies.render('nordharyn', 'filoni', 'house', {w: 36, stories: 2, variant: 3, door: -6}).
    render, stats: () => ({built, cached: cache.size}), clear: () => { cache.clear(); }
  });
})();
