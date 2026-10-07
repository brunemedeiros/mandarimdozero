// Fase 4: o validador curricular de gramática (fr/scripts/check_grammar_input.js).
const fs = require('fs'), path = require('path');
const { analyze, loadContent } = require('../../fr/scripts/check_grammar_input.js');
const content = loadContent();
const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../fr/scripts/grammar_input_map.json'), 'utf8'));
let ok = 0, bad = 0; const t = (n, x, d) => x ? ok++ : (bad++, console.log('FALHOU', n, d !== undefined ? JSON.stringify(d) : ''));
const rows = analyze(content, map); const by = Object.fromEntries(rows.map(r => [r.unitId, r]));
const grammar = content.UNITS.filter(u => u.type === 'grammar');
t('uma linha por unidade de gramática', rows.length === grammar.length && grammar.length === 10);
t('toda unidade de gramática tem entrada no mapa', grammar.every(g => map.units[g.id]));
t('g1 tem bastante input antes e nenhum aviso', by['A1-g1'].before >= 3 && by['A1-g1'].warnings.length === 0, by['A1-g1']);
t('g4: input só depois da unidade (achado da auditoria)', by['A1-g4'].before === 0 && by['A1-g4'].after > 0 && by['A1-g4'].warnings.some(w => /DEPOIS/.test(w)), by['A1-g4']);
t('g7: comparativo sem input antes (achado da auditoria)', by['A1-g7'].before < 3 && by['A1-g7'].warnings.length > 0, by['A1-g7']);
t('g6: savoir/il faut sem input antes é sinalizado', by['A1-g6'].warnings.some(w => /0 ocorrências/.test(w)), by['A1-g6']);
t('nunca lança para unidade sem entrada', analyze(content, { minInputBefore: 3, units: {} }).every(r => r.warnings[0] === 'sem entrada em grammar_input_map.json'));
t('mapa não tem forma que não compila', Object.values(map.units).every(u => (u.forms || []).concat(Object.values(u.extraForms || {})).every(f => { try { new RegExp(f, 'gi'); return true; } catch (e) { return false; } })));
console.log(`Fase 4 validador: ${ok}/${ok + bad} verificações — ${bad ? 'FALHOU' : 'OK'}`); process.exit(bad ? 1 : 0);
