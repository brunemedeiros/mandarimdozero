// Banco de Revisão: toda chave rbt('...') usada existe em pt-BR e en, e os dois catálogos têm o mesmo conjunto rb.*.
// Rodar: node tests/banco-revisao/test_i18n_keys.js
const fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const root = path.join(__dirname, '../..');
const cat = (f) => { global.window = {}; eval(fs.readFileSync(path.join(root, 'shared/i18n', f + '.js'), 'utf8')); return window.I18N_CATALOG[f]; };
const pt = cat('pt-BR'), en = cat('en');
const src = ['shared/review-bank.js', 'shared/review-bank-class.js', 'shared/review-bank-import.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const used = new Set([...src.matchAll(/rbt\('([A-Za-z0-9_.]+)'(?!\s*\+)/g)].map(m => m[1]).filter(k => !k.endsWith('.')));
// chaves montadas por prefixo ou lista (ver os arrays em review-bank.js/review-bank-model.js)
const dyn = [];
['frances', 'portugues', 'mandarim'].forEach(k => dyn.push('lang.' + k));
['vocabulario', 'estrutura', 'verbo', 'erro', 'pronuncia'].forEach(k => dyn.push('type.' + k));
['pendente', 'aprovado', 'cortado', 'todos'].forEach(k => dyn.push('f.' + k));
['pendente', 'cortado'].forEach(k => dyn.push('st.' + k));
['nao_lembrou', 'em_parte', 'confundiu', 'genero', 'conjugacao', 'tempo', 'auxiliar', 'ordem', 'preposicao', 'concordancia', 'repetiu', 'corrigiu_parte', 'som', 'tonico'].forEach(k => dyn.push('reason.' + k));
['question', 'answer', 'wrong_form'].forEach(k => dyn.push('field.' + k));
['pt', 'en', 'fr'].forEach(k => dyn.push('ref.' + k));
['recap', 'ultima', 'erros'].forEach(k => { dyn.push('mode.' + k); dyn.push('classEmpty.' + k); });
[0, 1, 2, 3, 4].forEach(n => dyn.push('oAttOpt' + n)); [0, 1, 2].forEach(n => dyn.push('oLessonOpt' + n));
['tabStudents', 'tabOverview', 'tabManual', 'cItems', 'cApproved', 'cToCheck', 'cCut', 'oStudents', 'oPending', 'oStale', 'oAccuracy', 'colName', 'colNext', 'colPending', 'colApproved', 'colEntry', 'colRecap', 'colAccuracy', 'colErrors', 'colReason', 'sub.cards', 'sub.bank'].forEach(k => dyn.push(k));
['json', 'format', 'empty'].forEach(k => dyn.push('imp.err.' + k));
['cStudents', 'cItems', 'cPending', 'cRecaps', 'cReviews'].forEach(k => dyn.push('imp.' + k));
const all = [...new Set([...used, ...dyn])];
const missPt = all.filter(k => !pt['rb.' + k]), missEn = all.filter(k => !en['rb.' + k]);
check(`todas as ${all.length} chaves usadas existem em pt-BR`, !missPt.length, missPt);
check('todas as chaves usadas existem em en', !missEn.length, missEn);
const ptKeys = Object.keys(pt).filter(k => k.startsWith('rb.')).sort().join(), enKeys = Object.keys(en).filter(k => k.startsWith('rb.')).sort().join();
check('pt-BR e en têm o mesmo conjunto rb.*', ptKeys === enKeys);
const unused = Object.keys(pt).filter(k => k.startsWith('rb.')).map(k => k.slice(3)).filter(k => !all.includes(k));
check('nenhuma chave rb.* sobrando sem uso', !unused.length, unused);
const bad = Object.entries(pt).filter(([k, v]) => k.startsWith('rb.') && (/--/.test(v) || /\bpra\b/i.test(v)));
check('texto visível sem "--" e sem "pra"', !bad.length, bad);
summary();
