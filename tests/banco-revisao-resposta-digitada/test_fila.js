// Etapa 2 (migration 143): a fila do estudo em casa leva o que a aluna digitou, só no erro de cartão de digitar.
// Rodar: node tests/banco-revisao-resposta-digitada/test_fila.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const root = path.join(__dirname, '../..');
function boot(rpcImpl){
  const calls = [];
  const ctx = vm.createContext({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number });
  const store = {}; ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  ctx.window = ctx; ctx.APP_KEY = 'frances'; ctx.CURRENT_USER = { id: 'u1' }; ctx.progressLoadedOk = true; ctx.STATE = { cards: [] };
  ctx.document = { addEventListener(){}, visibilityState: 'visible' };
  ctx.supabaseClient = { rpc: async (name, args) => { calls.push({ name, args: JSON.parse(JSON.stringify(args)) }); return rpcImpl(name, args); } };
  ['shared/srs.js', 'shared/fsrs.js', 'shared/review-bank-student.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return { ctx, calls, store };
}
const card = { id: 't10', rowId: 10, origin: 'teacher', reps: 1 };
const ok = () => ({ data: true, error: null });
const tick = () => new Promise(r => setTimeout(r, 30));
(async () => {
  let b = boot(ok);
  b.ctx.logBankHomeStudy(card, 0, true, { typedText: '  Je n’ai besoin de payer.  ' }); await tick();
  check('Errei digitado: envia o texto (sem espaços nas pontas)', b.calls.length === 1 && b.calls[0].name === 'log_my_bank_review' && b.calls[0].args.p_typed_text === 'Je n’ai besoin de payer.', b.calls);

  b = boot(ok);
  b.ctx.logBankHomeStudy(card, 0, false, { typedText: 'cartão de virar' }); await tick();
  check('Errei em cartão que não é de digitar: sem texto', b.calls.length === 1 && !('p_typed_text' in b.calls[0].args), b.calls);

  b = boot(ok);
  b.ctx.logBankHomeStudy(card, 2, true, { typedText: 'acertei' }); b.ctx.logBankHomeStudy(card, 1, true, { typedText: 'quase' }); await tick();
  check('acerto e "quase" (Difícil): sem texto', b.calls.length === 2 && b.calls.every(c => !('p_typed_text' in c.args)), b.calls);

  b = boot(ok);
  b.ctx.logBankHomeStudy(card, 0, true, { typedText: 'x'.repeat(400) }); await tick();
  check('texto longo: cortado em 300', b.calls[0] && b.calls[0].args.p_typed_text.length === 300, b.calls[0] && b.calls[0].args.p_typed_text.length);

  b = boot(ok);
  b.ctx.logBankHomeStudy(card, 0, true, { typedText: '   ' }); b.ctx.logBankHomeStudy(card, 0, true); await tick();
  check('texto vazio ou ausente: sem texto', b.calls.length === 2 && b.calls.every(c => !('p_typed_text' in c.args)), b.calls);

  // Banco sem a 143 (site publicado antes da migration): reenvia sem o texto e a fila anda.
  b = boot((name, args) => ('p_typed_text' in args) ? { data: null, error: { code: 'PGRST202', message: 'not found' } } : ok());
  b.ctx.logBankHomeStudy(card, 0, true, { typedText: 'errei' }); await tick();
  b.ctx.logBankHomeStudy({ id: 't11', rowId: 11, origin: 'teacher' }, 2, true); await tick();
  check('banco sem a 143: reenvia a mesma nota sem o texto e a fila anda',
    b.calls.map(c => c.name + ':' + ('p_typed_text' in c.args)).join() === 'log_my_bank_review:true,log_my_bank_review:false,log_my_bank_review:false' && b.calls[1].args.p_grade === 0, b.calls);

  // Correção ainda na fila (sem rede): Bom -> Errei leva o texto; Errei -> Bom tira.
  let off = true;
  b = boot(() => off ? { data: null, error: { message: 'offline' } } : ok());
  b.ctx.logBankHomeStudy(card, 2, true, { typedText: 'resposta' }); await tick();
  b.ctx.logBankHomeStudy(card, 0, true, { correction: true, typedText: 'resposta' }); await tick();
  off = false; await b.ctx.flushBankHomeLog(); await tick();
  let sent = b.calls.filter(c => !c.args.__x && c.name === 'log_my_bank_review' && c.args.p_grade === 0);
  check('correção na fila Bom -> Errei: envia a nota nova com o texto', sent.length >= 1 && sent[sent.length - 1].args.p_typed_text === 'resposta', b.calls);
  off = true;
  b = boot(() => off ? { data: null, error: { message: 'offline' } } : ok());
  b.ctx.logBankHomeStudy(card, 0, true, { typedText: 'errado' }); await tick();
  b.ctx.logBankHomeStudy(card, 2, true, { correction: true, typedText: 'errado' }); await tick();
  off = false; await b.ctx.flushBankHomeLog(); await tick();
  const last = b.calls[b.calls.length - 1];
  check('correção na fila Errei -> Bom: a nota nova vai sem texto', last && last.args.p_grade === 2 && !('p_typed_text' in last.args), b.calls);

  // Correção já enviada: correct_my_bank_review leva o texto; banco sem a 143 reenvia sem ele.
  b = boot(ok);
  b.ctx.logBankHomeStudy(card, 2, true); await tick();
  b.ctx.logBankHomeStudy(card, 0, true, { correction: true, typedText: 'na verdade errei' }); await tick();
  check('correção já enviada: correct_my_bank_review leva o texto', b.calls[1] && b.calls[1].name === 'correct_my_bank_review' && b.calls[1].args.p_typed_text === 'na verdade errei', b.calls);
  b = boot((name, args) => ('p_typed_text' in args) ? { data: null, error: { code: '42883', message: 'no function' } } : ok());
  b.ctx.logBankHomeStudy(card, 2, true); await tick();
  b.ctx.logBankHomeStudy(card, 0, true, { correction: true, typedText: 'na verdade errei' }); await tick();
  check('correção sem a 143 no banco: correct_my_bank_review de novo, sem texto',
    b.calls.map(c => c.name + ':' + ('p_typed_text' in c.args)).join() === 'log_my_bank_review:false,correct_my_bank_review:true,correct_my_bank_review:false', b.calls);
  check('a fila local fica vazia depois de enviar', JSON.parse(Object.values(b.store)[0] || '[]').length === 0, b.store);
  summary('Banco: resposta digitada na fila do estudo em casa');
})();
