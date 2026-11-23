// Compatibilità dei salvataggi fra due versioni del gioco (RPG Evolution, incremento 6), in Node senza browser.
// Uso:   node tests/verifica-salvataggi-incrociati.cjs <cartella-A> <cartella-B> [...altre cartelle]
//   es.  node tests/verifica-salvataggi-incrociati.cjs ../Reincarnation-base-f2febd1 .
// Per ogni coppia (A→B e B→A): partita giocata in A con il seme fisso (movimento, attacchi, schivate, tempo che passa),
// esportata, importata in B, riesportata e confrontata campo per campo; poi B continua a giocare e salva di nuovo.
// Salvataggi isolati in memoria (nessun localStorage reale, nessuna partita del giocatore toccata).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dirs = process.argv.slice(2).map(d => path.resolve(d));
if (dirs.length < 2) { console.log('Uso: node tests/verifica-salvataggi-incrociati.cjs <cartella-A> <cartella-B> [...]'); process.exit(2); }

function surface() {
  const pixels = {
    createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
    getImageData(_x, _y, width, height) { return pixels.createImageData(width, height); },
    createLinearGradient() { return { addColorStop() {} }; }, createRadialGradient() { return { addColorStop() {} }; },
  };
  const context = new Proxy(pixels, { get(target, key) { return key in target ? target[key] : () => undefined; } });
  return { width: 1, height: 1, getContext: () => context };
}
// Un gioco completo per cartella, ciascuno nel proprio contesto e con il proprio localStorage in memoria.
function load(root) {
  const modules = fs.readFileSync(path.join(root, 'build.py'), 'utf8').match(/MODULES\s*=\s*\(([\s\S]+?)\)/)[1].match(/"[^"]+\.js"/g).map(JSON.parse);
  const store = new Map();
  const scope = { console: { warn() {}, log() {} }, document: { createElement: surface },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) } };
  scope.window = scope;
  vm.createContext(scope);
  for (const file of modules) { if (file === 'audio.js') break; vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scope, { filename: file }); }
  scope.Game.onEvent = () => {};
  return { root, name: path.basename(root) === '.' ? root : path.basename(root), scope, Game: scope.Game };
}
function seed(g, worldSeed = 19425) {
  vm.runInContext(`Math.random = (() => { let n = 0, z = 4242; return () => { const k = n++; if (k === 0) return ${worldSeed} / 4294967296; if (k === 1) return .24;
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; }; })()`, g.scope);
}
// Gioco reale: tre minuti di movimento, attacchi e schivate; nessuno stato forzato (il validatore rifiuta gli stati impossibili).
function play(g, frames) {
  for (let i = 0; i < frames; i++) {
    const t = i % 480, input = { x: t < 120 ? 1 : t < 240 ? 0 : t < 360 ? -1 : 0, y: t >= 120 && t < 240 ? 1 : t >= 360 ? -1 : 0 };
    if (i % 23 === 0) input.attack = true;
    if (i % 157 === 0) input.dash = true;
    g.Game.step(1 / 60, input);
  }
}
// Confronto campo per campo; i campi che dipendono dall'ora reale del salvataggio sono ignorati.
const VOLATILE = /(^|\.)(savedAt|saved|timestamp|exportedAt)$/;
function diff(a, b, at = '', out = []) {
  if (out.length > 12) return out;
  if (a === b || VOLATILE.test(at)) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') { out.push(at + ': ' + JSON.stringify(a)?.slice(0, 60) + ' ≠ ' + JSON.stringify(b)?.slice(0, 60)); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], at ? at + '.' + k : k, out);
  return out;
}

const games = dirs.map(load);
const results = [];
const check = (name, fn) => {
  try { const note = fn(); results.push(['OK', name]); console.log('OK   ' + name + (note ? ' — ' + note : '')); }
  catch (e) { results.push(['FAIL', name]); console.log('FAIL ' + name + ' — ' + String(e.message).replace(/\s+/g, ' ').slice(0, 400)); }
};
for (const a of games) for (const b of games) {
  if (a === b) continue;
  check(`${a.name} → ${b.name}`, () => {
    seed(a); assert(a.Game.newGame(), 'newGame in A'); play(a, 3 * 60 * 60);
    const raw = a.Game.exportSave(), saved = JSON.parse(raw);
    assert(b.Game.importSave(raw), 'B rifiuta il salvataggio di A');
    const again = JSON.parse(b.Game.exportSave());
    // Un campo nuovo di primo livello che A non conosce viene creato da B con il suo valore predefinito (migrazione prevista):
    // si segnala nella nota; ogni altra differenza resta un errore.
    const added = Object.keys(again).filter(k => !(k in saved));
    for (const k of added) delete again[k];
    const d = diff(saved, again);
    assert.equal(d.length, 0, 'campi diversi dopo l\'importazione: ' + d.join(' | '));
    play(b, 60 * 60);
    assert(b.Game.save() && b.Game.load(), 'B non salva o non ricarica dopo aver giocato');
    const later = JSON.parse(b.Game.exportSave());
    assert(a.Game.importSave(JSON.stringify(later)), 'A rifiuta il salvataggio continuato in B');
    const p = saved.player || {};
    return `${Math.round(raw.length / 1024)} KB, livello ${p.level}, ${saved.version ? 'versione ' + saved.version : ''}; ripreso in A dopo un altro minuto in B` + (added.length ? '; campi aggiunti da B: ' + added.join(', ') : '');
  });
}
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} prove fallite su ${results.length}` : `\nTutte le ${results.length} prove superate`);
process.exit(fails ? 1 : 0);
