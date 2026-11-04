// Voltar (cartões da professora): a nota corrigida troca a resposta anterior em vez de somar outra.
// Rodar: node tests/banco-revisao-voltar/test_correcao_fila.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const { check, summary } = require('../fase-g/harness');
const root = path.join(__dirname, '../..');
function boot(rpcImpl){
  const calls = [];
  const ctx = vm.createContext({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number });
  const store = {}; ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  ctx.window = ctx; ctx.APP_KEY = 'frances'; ctx.CURRENT_USER = { id: 'u1' }; ctx.progressLoadedOk = true; ctx.STATE = { cards: [] };
  ctx.document = { addEventListener(){}, visibilityState: 'visible' };
  ctx.supabaseClient = { rpc: async (name, args) => { calls.push([name, args.p_grade]); return rpcImpl(name, args); } };
  ['shared/srs.js', 'shared/fsrs.js', 'shared/review-bank-student.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
  return { ctx, calls, store };
}
const card = { id: 't10', rowId: 10, origin: 'teacher', reps: 1 };
const tick = () => new Promise(r => setTimeout(r, 30));
(async () => {
  // 1) sem rede: a resposta ainda está na fila, a correção a troca (1 só envio, com a nota nova)
  let off = true;
  let { ctx, calls } = boot(() => off ? { data: null, error: { message: 'offline' } } : { data: true, error: null });
  ctx.logBankHomeStudy(card, 2, false); await tick();
  ctx.logBankHomeStudy(card, 0, false, { correction: true }); await tick();
  off = false; await ctx.flushBankHomeLog(); await tick();
  const sent = calls.filter(c => c[0] === 'log_my_bank_review' && c[1] === 0);
  check('sem rede: a correção troca a resposta na fila (envia só a nota nova, uma vez, pela função comum)', sent.length >= 1 && !calls.some(c => c[0] === 'correct_my_bank_review') && calls.filter(c => c[1] === 0 && c[0] === 'log_my_bank_review').length === sent.length, calls);
  // 2) já enviada: a correção vai pela função que troca
  ({ ctx, calls } = boot(() => ({ data: true, error: null })));
  ctx.logBankHomeStudy(card, 2, false); await tick();
  ctx.logBankHomeStudy(card, 0, false, { correction: true }); await tick();
  check('já enviada: a correção usa correct_my_bank_review', calls.length === 2 && calls[0][0] === 'log_my_bank_review' && calls[1][0] === 'correct_my_bank_review' && calls[1][1] === 0, calls);
  // 3) banco sem a 127: cai na função comum e não trava a fila
  ({ ctx, calls } = boot((name) => name === 'correct_my_bank_review' ? { data: null, error: { code: 'PGRST202', message: 'not found' } } : { data: true, error: null }));
  ctx.logBankHomeStudy(card, 2, false); await tick();
  ctx.logBankHomeStudy(card, 3, false, { correction: true }); await tick();
  ctx.logBankHomeStudy({ id: 't11', rowId: 11, origin: 'teacher' }, 2, false); await tick();
  check('sem a 127 no banco: cai em log_my_bank_review e a fila anda', calls.map(c => c[0]).join() === 'log_my_bank_review,correct_my_bank_review,log_my_bank_review,log_my_bank_review', calls);
  summary('Voltar: correção da nota na fila de envio');
})();
