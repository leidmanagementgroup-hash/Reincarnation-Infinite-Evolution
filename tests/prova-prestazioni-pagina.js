// Iniettato da prova-prestazioni.mjs nella pagina del gioco. Espone __bench(scena, secondi, K) e __still(scena).
// Scene: "<luogo><ora>" (es. piazza12, portici21) oppure "<luogo>@tramonto" (ora del tramonto del calendario).
window.__places = { piazza: { x: 940, y: 726 }, ponte: { x: 1040, y: 726 }, mercato: { x: 1540, y: 820 }, giardini: { x: 1860, y: 1070 },
  portici: { x: 2460, y: 520 }, orti: { x: 2516, y: 1150 }, serra: { x: 2570, y: 1135 } };
window.__scene = label => {
  const m = /^([a-z]+)(?:@(tramonto)|(\d+(?:\.\d+)?))$/.exec(label);
  if (!m || !__places[m[1]]) throw new Error('scena sconosciuta ' + label);
  let hour = Number(m[3]);
  if (m[2]) { const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; Game.newGame(); Math.random = r0;
    hour = Calendar.view(Game.s.calendar, Game.s.time, 'city-velaris').sunsetMinutes / 60; }
  return [hour, __places[m[1]]];
};
window.__bench = (label, seconds, K = 1) => new Promise(resolve => {
  const [hour, spot] = __scene(label);
  const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; Game.newGame(); Math.random = r0;
  const s = Game.s; s.region = 'city-velaris';
  const ext = UrbanWorld.exterior(s.seed);
  const cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440;
  s.time += ((hour * 60 - cur + 1440) % 1440) / (Calendar.minutesPerSecond || .8);
  const old = document.getElementById('__b'); if (old) old.remove();
  const W = 480, H = 270, cv = document.createElement('canvas'); cv.id = '__b'; cv.width = W; cv.height = H;
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;image-rendering:pixelated;background:#000';
  document.body.append(cv);
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const cpu = [], gap = [], hit = []; let prev = 0, i = 0, start = 0; const warm = 90;
  const frame = ts => {
    if (!start) start = ts;
    const t = (ts - start) / 1000;
    const px = spot.x + Math.sin(t * .5) * 60, cam = { x: Math.round(px - W / 2), y: spot.y - H / 2, w: W, h: H };
    s.player.x = px;
    const t0 = performance.now();
    const actors = [{ x: px, y: spot.y, draw() {} }].concat(UrbanLife.actors(s, t));
    for (let k = 0; k < K; k++) {
      c.save(); c.translate(-cam.x, -cam.y);
      ext.drawGround(c, cam, t); ext.drawFront(c, cam, t, actors);
      c.restore();
    }
    const dt = performance.now() - t0;
    if (i++ > warm) { cpu.push(dt); if (prev) { gap.push(ts - prev); if (ts - prev > 20 && hit.length < 14) hit.push([+t.toFixed(2), +(ts - prev).toFixed(1), +dt.toFixed(2)]); } }
    prev = ts;
    if (t < seconds) requestAnimationFrame(frame);
    else {
      const q = a => { const b = [...a].sort((x, y) => x - y); return { med: +b[b.length >> 1].toFixed(3), p95: +b[Math.floor(b.length * .95)].toFixed(3), p99: +b[Math.floor(b.length * .99)].toFixed(3) }; };
      resolve({ label, K, frames: cpu.length, visible: document.visibilityState, cpu: q(cpu), gap: q(gap), over20: gap.filter(g => g > 20).length, over33: gap.filter(g => g > 33).length, hit });
    }
  };
  requestAnimationFrame(frame);
});
window.__still = (label, t = 3.3) => {
  const [hour, spot] = __scene(label);
  const r0 = Math.random; let n = 0; Math.random = () => n++ === 0 ? 19425 / 4294967296 : .24; Game.newGame(); Math.random = r0;
  const s = Game.s; s.region = 'city-velaris'; const ext = UrbanWorld.exterior(s.seed);
  const cur = ((Calendar.timestamp(s.calendar, s.time) % 1440) + 1440) % 1440;
  s.time += ((hour * 60 - cur + 1440) % 1440) / (Calendar.minutesPerSecond || .8);
  Object.assign(s.player, spot);
  const old = document.getElementById('__b'); if (old) old.remove();
  const W = 480, H = 270, cv = document.createElement('canvas'); cv.id = '__b'; cv.width = W; cv.height = H;
  cv.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;z-index:99999;image-rendering:pixelated;background:#000';
  document.body.append(cv); const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const cam = { x: spot.x - W / 2, y: spot.y - H / 2, w: W, h: H };
  c.translate(-cam.x, -cam.y);
  ext.drawGround(c, cam, t); ext.drawFront(c, cam, t, [{ x: spot.x, y: spot.y, draw() {} }].concat(UrbanLife.actors(s, t)));
  return 'drawn';
};
'ok'
