// Prova di prestazioni di Velaris con Edge a finestra visibile (GPU attiva se disponibile), rAF reale, senza letture di pixel.
// Uso (PowerShell/Bash): node tests/prova-prestazioni.mjs <gpuinfo|bench|profile|shot> <file.html> [scena]
//   variabili: SECS (durata per scena, default 30), K (disegni per fotogramma; 16 = stress), OUT (cartella di lavoro),
//   SCENES (elenco, es. piazza12,portici21,orti@tramonto; luoghi: piazza ponte mercato giardini portici orti serra).
// Per confrontare due build alternale: costruisci main in un'altra cartella (git worktree) e passa i due HTML.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = process.env.OUT || path.join(process.env.TEMP || '.', 'prova-prestazioni');
fs.mkdirSync(path.join(S, 'shots'), { recursive: true });
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const mode = process.argv[2];            // gpuinfo | bench | profile
const build = process.argv[3];           // base2 | new4
const port = 9300 + Math.floor(Math.random() * 500);
const profile = path.join(S, 'cdpprof-' + Date.now());
const seconds = Number(process.env.SECS || 30);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const edge = spawn(EDGE, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,760',
  '--window-position=40,40', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
async function json(p) { for (let i = 0; i < 60; i++) { try { return await (await fetch(`http://127.0.0.1:${port}${p}`)).json(); } catch { await sleep(250); } } throw new Error('no cdp'); }
function connect(url) {
  return new Promise(res => {
    const ws = new WebSocket(url); let id = 0; const pend = new Map();
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
    ws.onopen = () => res({ ws, send: (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }) });
  });
}
const BENCH = fs.readFileSync(path.join(HERE, 'prova-prestazioni-pagina.js'), 'utf8');
try {
  const ver = await json('/json/version');
  const browser = await connect(ver.webSocketDebuggerUrl);
  if (mode === 'gpuinfo') {
    const info = await browser.send('SystemInfo.getInfo');
    const r = info.result;
    console.log(JSON.stringify({ gpu: r.gpu.devices.map(d => d.deviceString), driver: r.gpu.driverVendor, featureStatus: r.gpu.featureStatus, aux: r.gpu.auxAttributes && { glRenderer: r.gpu.auxAttributes.glRenderer, glVendor: r.gpu.auxAttributes.glVersion } }, null, 1));
  } else {
    const list = await json('/json');
    const page = list.find(t => t.type === 'page');
    const tab = await connect(page.webSocketDebuggerUrl);
    await tab.send('Page.enable'); await tab.send('Runtime.enable');
    await tab.send('Page.navigate', { url: 'file:///' + path.resolve(build).replace(/\\/g, '/') });
    await sleep(4000);
    const ev = async expr => { const r = await tab.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 600000 }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
    await ev(BENCH); if (process.env.OFF) await ev(`window.__off='${process.env.OFF}'`);
    if (mode === 'bench') {
      const out = [];
      for (const sc of (process.env.SCENES || 'piazza12,ponte21,mercato21,giardini21').split(',')) out.push(await ev(`__bench('${sc}',${seconds},${Number(process.env.K||1)})`));
      console.log(JSON.stringify({ build, out }));
    } else if (mode === 'profile') {
      const sc = process.argv[4] || 'ponte21';
      await tab.send('Profiler.enable'); await tab.send('Profiler.setSamplingInterval', { interval: 100 });
      await tab.send('Profiler.start');
      await ev(`__bench('${sc}',${seconds},${Number(process.env.K||1)})`);
      const prof = (await tab.send('Profiler.stop')).result.profile;
      const self = new Map(); const byId = new Map(prof.nodes.map(n => [n.id, n]));
      prof.samples.forEach((sid, i) => { const n = byId.get(sid); const k = n.callFrame.functionName || '(anonymous)'; self.set(k, (self.get(k) || 0) + (prof.timeDeltas[i] || 0)); });
      const parent = new Map(); prof.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
      const incl = new Map();
      prof.samples.forEach((sid, i) => { const seen = new Set(); let id = sid; while (id) { const k = byId.get(id).callFrame.functionName; if (k && !seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + (prof.timeDeltas[i] || 0)); } id = parent.get(id); } });
      const inclusive = {}; for (const k of ['drawGround','drawFront','drawShadows','drawMood','drawLight','drawReflections','drawMotes','paintProp','actors','frame']) inclusive[k] = +((incl.get(k) || 0) / 1000).toFixed(0);
      const total = [...self.values()].reduce((a, b) => a + b, 0);
      const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([k, v]) => [k, +(v / 1000).toFixed(0), +(100 * v / total).toFixed(1)]);
      console.log(JSON.stringify({ build, scene: sc, totalMs: +(total / 1000).toFixed(0), inclusive, top }));
    } else if (mode === 'shot') {
      for (const sc of (process.env.SCENES || 'piazza12,ponte21,mercato21,giardini21').split(',')) {
        await ev(`__still('${sc}')`); await sleep(400);
        const shot = await tab.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 960, height: 540, scale: 1 } });
        fs.writeFileSync(path.join(S, 'shots', path.basename(build, '.html') + '-' + sc + '.png'), Buffer.from(shot.result.data, 'base64'));
      }
      console.log('shots ok');
    }
  }
} catch (e) { console.log('ERR ' + e.message); }
finally {
  // Chiude Edge con tutti i processi figli (edge.kill() chiudeva solo il principale e lasciava istanze aperte).
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' });
    // Edge può riaprirsi in processi staccati dal lanciatore: chiude tutti quelli che usano il profilo temporaneo di questa prova.
    const tag = path.basename(profile).replace(/'/g, '');
    spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${tag}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore' });
  } else edge.kill();
  await sleep(800); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(0); }
