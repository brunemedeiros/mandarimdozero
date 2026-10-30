// API comum do português de Portugal x Brasil (shared/core/familias/portugues-variantes.js), sem navegador.
// Rodar: node tests/respostas-ptbr/test_api.js
const path = require('path');
const PV = require(path.join(__dirname, '..', '..', 'shared', 'core', 'familias', 'portugues-variantes.js'));
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

const a = PV.ptBrVerdictAdjust('estou a comer', ['estou comendo']);
check('"estou a comer" x ["estou comendo"] -> almost + par', a && a.verdict === 'almost' && JSON.stringify(a.pairs) === JSON.stringify([{ pt: 'estou a comer', br: 'estou comendo' }]) && a.text === 'estou comendo', a);
check('"estou comendo" -> null (sem marca: o exercício julga como sempre)', PV.ptBrVerdictAdjust('estou comendo', ['estou comendo']) === null);
check('"Estou a comer." (maiúscula e ponto) -> almost', (PV.ptBrVerdictAdjust('Estou a comer.', ['Estou comendo']) || {}).verdict === 'almost');
check('marca de Portugal sem relação -> null', PV.ptBrVerdictAdjust('estou a dormir', ['estou comendo']) === null);
check('aceita própria do exercício é usada', (PV.ptBrVerdictAdjust('apanho o autocarro', [], { aceita: (t) => t === 'pego o ônibus' }) || {}).verdict === 'almost');
check('forma de Portugal digitada igual a uma aceita (lote antigo) -> almost mesmo assim', (PV.ptBrVerdictAdjust('estou a comer', ['estou a comer']) || {}).verdict === 'almost');
check('"tu comes" não é marca', PV.paraBrasil('tu comes').marks.length === 0);
check('"eu sumo daqui" (verbo sumir) não é marca', PV.paraBrasil('eu sumo daqui').marks.length === 0);
check('ptEuropeanToBrazilian = paraBrasil', PV.ptEuropeanToBrazilian === PV.paraBrasil);

const T = { 'answer.ptpt.line': 'No Brasil se diz: {forms}.', 'answer.ptpt.pair': '<strong>{br}</strong> (em vez de "{pt}")' };
const t = (k, v) => T[k].replace(/\{(\w+)\}/g, (_, n) => v[n]);
const html = PV.ptBrFeedbackHTML(a.pairs, { t, lead: 'Quase! Essa forma é de Portugal.' });
check('HTML da devolutiva (padrão: div.review-almost)', html === '<div class="review-almost">Quase! Essa forma é de Portugal. No Brasil se diz: <strong>estou comendo</strong> (em vez de "estou a comer").</div>', html);
const esc = PV.ptBrFeedbackHTML([{ pt: '<b>', br: 'x' }], { t });
check('texto da pessoa escapado', esc.includes('&lt;b&gt;') && !esc.includes('<b>'), esc);
check('sem pares ou sem t -> vazio', PV.ptBrFeedbackHTML([], { t }) === '' && PV.ptBrFeedbackHTML(a.pairs, {}) === '');

console.log(`API português de Portugal x Brasil: ${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
