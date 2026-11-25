/* I mestieri dei residenti di Velaris leggono l'attività economica del mercato. Uso: node tests/verifica-mestieri-mercato.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const lines = fs.readFileSync(path.join(root, 'tests/economia-integrazione.cjs'), 'utf8').split('\n');
const head = lines.slice(0, lines.findIndex(l => l.startsWith('const { Game'))).join('\n').replace(/\.\.\/|__dirname/g, m => m === '__dirname' ? '__dirname' : m);
eval(head + `
const { Game, UrbanLife, Economy } = scope;
assert(Game.newGame());
const s = Game.s;
const jobs = ['Cuoca','Birraio','Orticoltrice','Erborista','Carpentiere','Maestra d’acqua'];
const mapped = new Set(jobs); let linked = 0, checked = 0; const bad = [];
for (let n = 0; n < 6; n++) {
  s.seed = (n * 7919 + 13) >>> 0;
  for (const race of Game.races) for (const i of [0, 1]) {
    const v = UrbanLife.view(s, 'velaris-' + race.id + '-' + i).selected;
    if (!v) continue; checked++;
    if (mapped.has(v.profession)) { if (!v.trade) bad.push(v.profession); else { linked++; assert(!/NaN|undefined/.test(v.trade.text)); } }
    else assert(!v.trade, 'senza mestiere mappato nessun collegamento');
  }
}
assert(checked > 0 && linked > 0, 'residenti esaminati ' + checked + ', collegati ' + linked);
assert.equal(bad.length, 0, 'mestieri mappati senza collegamento: ' + bad);
console.log('OK: mestieri e mercato, residenti collegati ' + linked + ' su ' + checked);
`);
