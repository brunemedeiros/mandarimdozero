// E4 lote 5b: os textos que o zh escrevia direto (toast de XP/pontos, tentativas) saem iguais pelas chaves do catálogo,
// e a recapitulação usa os ganchos de cada idioma.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '../..');
let ok = 0, bad = 0; const check = (c, m) => { if (c) ok++; else { bad++; console.log('FALHOU:', m); } };
for (const [lang, file] of [['pt-BR', 'shared/i18n/pt-BR.js'], ['en', 'shared/i18n/en.js']]) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const get = (k) => (src.match(new RegExp("'" + k.replace(/\./g, '\\.') + "':\\s*'([^']*)'")) || [])[1];
  check(get('toast.xpGain').replace('{amount}', '7') === '+7 XP', lang + ' toast.xpGain');
  check(get('toast.pointsGain').replace('{n}', '3') === '+3 pts', lang + ' toast.pointsGain');
  check(!/\.one'|\.other'/.test(get('review.match.attempts') || '') && /\{n\}/.test(get('review.match.attempts')), lang + ' review.match.attempts é texto simples com {n}');
}
const core = fs.readFileSync(path.join(root, 'shared/core/quase-iguais-textos.js'), 'utf8');
for (const [l, expect] of [['fr', ["i.f", "''"]], ['zh', ['i.c', 'lesson-recap-pinyin']]]) {
  const h = fs.readFileSync(path.join(root, l, 'lang-hooks.js'), 'utf8');
  check(h.includes('recapText: (i) => ' + expect[0]) && h.includes('recapExtra') && h.includes(expect[1]), l + ' ganchos da recapitulação');
}
check((core.match(/LANG_HOOKS\.recapText\(item\)/g) || []).length === 4 && (core.match(/LANG_HOOKS\.recapExtra\(item\)/g) || []).length === 2, 'recapitulação de lição e de unidade usam os ganchos');
for (const f of ['fr/app.js', 'zh/app.js']) { const s = fs.readFileSync(path.join(root, f), 'utf8'); check(!/function (addXP|answerSpeedQuestion|onMatchTileClick|renderLessonCompleteScreen|renderUnitCompleteScreen)\(/.test(s), f + ' não declara mais as 5 funções'); }
console.log(`lote 5b textos: ${ok} passaram, ${bad} falharam`); process.exit(bad ? 1 : 0);
