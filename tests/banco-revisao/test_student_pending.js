// Banco de Revisão (lado do aluno): eventos do Modo aula viram nota no FSRS do aluno e são confirmados.
// Rodar: node tests/banco-revisao/test_student_pending.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const root = path.join(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function boot(events, cards){
  const calls = { acks: [], saves: 0, tracked: [] };
  const ctx = vm.createContext({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number });
  ctx.window = ctx; ctx.APP_KEY = 'frances'; ctx.CURRENT_USER = { id: 'u1' }; ctx.progressLoadedOk = true;
  ctx.STATE = { cards };
  ctx.document = { addEventListener(){}, visibilityState: 'visible' };
  ctx.saveState = async () => { calls.saves++; };
  ctx.trackReviewAnswer = (mode, card, grade) => calls.tracked.push([mode, card.id, grade]);
  ctx.supabaseClient = { rpc: async (name, args) => {
    if (name === 'get_my_pending_bank_reviews') return { data: events, error: null };
    if (name === 'ack_my_bank_reviews'){ calls.acks.push(...args.p_ids); return { data: args.p_ids.length, error: null }; }
    return { data: null, error: { message: 'rpc inesperada' } };
  } };
  ['shared/srs.js', 'shared/fsrs.js', 'shared/review-bank-student.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return { ctx, calls };
}
const mkCard = (id, rowId, status = 'active') => ({ id, rowId, origin: 'teacher', flashcardStatus: status, reps: 0, lapses: 0, interval: 0, ef: 2.5, due: 0 });

(async () => {
  // 3 eventos: acertou (cartão 10), errou (cartão 11), ajuda (cartão 12 arquivado)
  let cards = [mkCard('t10', 10), mkCard('t11', 11), mkCard('t12', 12, 'archived'), mkCard('t10-b', 10)];
  let ev = [
    { id: 'e1', teacher_flashcard_id: 10, outcome: 'acertou', created_at: '2026-10-12T10:00:00Z' },
    { id: 'e2', teacher_flashcard_id: 11, outcome: 'errou', created_at: '2026-10-12T10:01:00Z' },
    { id: 'e3', teacher_flashcard_id: 12, outcome: 'ajuda', created_at: '2026-10-12T10:02:00Z' },
    { id: 'e4', teacher_flashcard_id: 99, outcome: 'acertou', created_at: '2026-10-12T10:03:00Z' },
  ];
  let { ctx, calls } = boot(ev, cards);
  const n = await ctx.applyPendingBankReviews();
  const c10 = cards[0], c11 = cards[1], c10b = cards[3];
  check('aplicou 2 notas (acertou e errou)', n === 2, n);
  check('acertou aplica no FSRS do cartão (reps 1)', c10.reps >= 1, c10.reps);
  check('errou aplica Errei (cartão passa a aprender)', c11.lapses >= 0 && c11.reps >= 0 && c11.due > 0, JSON.stringify({ r: c11.reps, d: c11.due }));
  check('nota vai só para a direção A, nunca para o -b', c10b.reps === 0, c10b.reps);
  check('cartão arquivado não recebe nota mas o evento é confirmado', cards[2].reps === 0 && calls.acks.includes('e3'));
  check('evento de cartão que ainda não chegou fica pendente (sem ack)', !calls.acks.includes('e4'));
  check('confirma e1, e2, e3', ['e1', 'e2', 'e3'].every(i => calls.acks.includes(i)) && calls.acks.length === 3, calls.acks);
  check('salva o progresso uma vez antes de confirmar', calls.saves === 1, calls.saves);
  check('registra analytics (class_mode) só para os aplicados', calls.tracked.length === 2 && calls.tracked.every(t => t[0] === 'class_mode'), JSON.stringify(calls.tracked));

  // sem eventos / sem login / progresso não carregado
  ({ ctx, calls } = boot([], [mkCard('t1', 1)]));
  check('sem eventos não faz nada', (await ctx.applyPendingBankReviews()) === 0 && calls.acks.length === 0 && calls.saves === 0);
  ({ ctx, calls } = boot(ev, cards)); ctx.progressLoadedOk = false;
  check('progresso não confirmado como carregado: não aplica nem confirma', (await ctx.applyPendingBankReviews()) === 0 && calls.acks.length === 0);
  ({ ctx, calls } = boot(ev, cards)); ctx.CURRENT_USER = null;
  check('sem login não faz nada', (await ctx.applyPendingBankReviews()) === 0 && calls.acks.length === 0);
  // 2ª rodada com o mesmo evento já aplicado: quem confirma é o banco; aqui garante que ajuda = Difícil (1)
  cards = [mkCard('t20', 20)];
  ({ ctx, calls } = boot([{ id: 'x1', teacher_flashcard_id: 20, outcome: 'ajuda', created_at: '2026-10-12T10:00:00Z' }], cards));
  await ctx.applyPendingBankReviews();
  check('ajuda vira Difícil (nota 1) no analytics', calls.tracked.length === 1 && calls.tracked[0][2] === 1, JSON.stringify(calls.tracked));
  summary();
})();
