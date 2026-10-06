// Fase 5: shared/review-milestone.js (seleção do marco de Revisão).
const fs = require('fs'), vm = require('vm'), path = require('path');
const c = {}; vm.createContext(c);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../shared/review-milestone.js'), 'utf8'), c);
let ok = 0, bad = 0; const t = (n, x, d) => x ? ok++ : (bad++, console.log('FALHOU', n, d !== undefined ? JSON.stringify(d) : ''));
const NOW = 1_000_000_000_000, DAY = 86400000;
const card = (id, unitId, o) => Object.assign({ id, unitId, state: 'new', reps: 0, due: 0, lapses: 0, stability: 0 }, o || {});

// pool: só unidades do módulo e só elegíveis; deckId nunca é usado
const all = [card('a', 'U1'), card('b', 'U2'), card('c', 'U9'), card('d', null), card('e', 'U1', { deckId: 7 })];
const eligible = x => x.id !== 'b';
t('pool filtra por unitId do módulo e elegibilidade', c.milestonePool(all, ['U1', 'U2'], eligible).map(x => x.id).join() === 'a,e');
t('pool aceita Set', c.milestonePool(all, new Set(['U9']), null).length === 1);
t('unidade sem cartões (gramática) não contribui', c.milestonePool(all, ['G1'], null).length === 0);

// prioridade: learning > due > weak > fresh
const mix = [
  card('f1', 'U1'),
  card('w1', 'U1', { state: 'review', reps: 3, due: NOW + 5 * DAY, stability: 10 }),
  card('w2', 'U1', { state: 'review', reps: 3, due: NOW + 9 * DAY, stability: 2 }),
  card('d1', 'U1', { state: 'review', reps: 3, due: NOW - 2 * DAY, stability: 6 }),
  card('d2', 'U1', { state: 'review', reps: 3, due: NOW - 5 * DAY, stability: 6 }),
  card('l1', 'U1', { state: 'learning', reps: 1, due: NOW - 1 * DAY, lapses: 1 }),
  card('l2', 'U1', { state: 'relearning', reps: 4, due: NOW + DAY, lapses: 3 }),
  card('l3', 'U1', { state: 'new', reps: 2, due: NOW, lapses: 0 }) // save antigo: reps>0 com state new = learning
];
const sel = c.selectMilestoneCards(mix, { now: NOW });
t('ordem: erros recentes, vencidos, fracos, novos', sel.cards.map(x => x.id).join() === 'l2,l1,l3,d2,d1,w2,w1,f1', sel.cards.map(x => x.id));
t('motivos contados por faixa', JSON.stringify(sel.reasons) === JSON.stringify({ learning: 3, due: 2, weak: 2, fresh: 1 }), sel.reasons);
t('available = tamanho do pool', sel.available === 8);
t('texto do porquê', c.milestoneReasonText(sel) === '8 itens: 3 com erros recentes, 2 vencendo hoje, 2 com memória mais fraca, 1 novo', c.milestoneReasonText(sel));

// teto de 20 (e cap configurável); sempre priorizando necessidade
const many = Array.from({ length: 50 }, (_, i) => card('n' + i, 'U1'))
  .concat(Array.from({ length: 5 }, (_, i) => card('L' + i, 'U1', { state: 'learning', reps: 1, due: NOW })));
const s2 = c.selectMilestoneCards(many, { now: NOW });
t('teto de 20', s2.cards.length === 20 && vm.runInContext('MILESTONE_CAP', c) === 20);
t('com teto, os erros recentes entram primeiro', s2.cards.slice(0, 5).every(x => x.id.startsWith('L')) && s2.reasons.learning === 5 && s2.reasons.fresh === 15, s2.reasons);
t('cap customizado', c.selectMilestoneCards(many, { now: NOW, cap: 3 }).cards.length === 3);
t('sem duplicar cartão', new Set(s2.cards.map(x => x.id)).size === 20);

// vazio
const e = c.selectMilestoneCards([], { now: NOW });
t('pool vazio: nada selecionado, texto vazio', e.cards.length === 0 && e.available === 0 && c.milestoneReasonText(e) === '');
t('estado empty/ready/done', c.milestoneState(0, null) === 'empty' && c.milestoneState(5, null) === 'ready' && c.milestoneState(5, { lastDate: '2026-10-06' }) === 'done' && c.milestoneState(0, { lastDate: 'x' }) === 'empty');
t('singular', c.milestoneReasonText({ cards: [1], reasons: { learning: 0, due: 1, weak: 0, fresh: 0 } }) === '1 item: 1 vencendo hoje');
console.log(`Fase 5 marco de Revisão: ${ok}/${ok + bad} verificações — ${bad ? 'FALHOU' : 'OK'}`); process.exit(bad ? 1 : 0);
