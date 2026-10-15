// O idioma do site vai para user_metadata.ui_language (lido pelos e-mails do Supabase Auth) ao trocar e uma vez ao carregar.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../shared/auth.js'), 'utf8');
const i = src.indexOf('function syncAuthUiLanguageMetadata'), j = src.indexOf('\n}\n', i) + 3;
let ok = 0, bad = 0; const check = (c, m) => { if (c) ok++; else { bad++; console.log('FALHOU:', m); } };
check(i > 0, 'função existe');
check(/syncAuthUiLanguageMetadata\(saved \|\| lang\)/.test(src), 'chamada depois de salvar a troca');
check(/if \(acct\) syncAuthUiLanguageMetadata\(acct\)/.test(src), 'chamada ao carregar (conta antiga)');
async function run(meta, lang, hasClient = true) {
  const calls = [];
  const ctx = { CURRENT_USER: { user_metadata: meta }, calls };
  if (hasClient) ctx.supabaseClient = { auth: { updateUser: (a) => { calls.push(a); return Promise.resolve({ error: null }); } } };
  vm.createContext(ctx); vm.runInContext(src.slice(i, j), ctx);
  vm.runInContext(`syncAuthUiLanguageMetadata(${JSON.stringify(lang)})`, ctx);
  await new Promise(r => setTimeout(r, 5));
  return { calls, user: ctx.CURRENT_USER };
}
(async () => {
  let r = await run({}, 'en');
  check(r.calls.length === 1 && r.calls[0].data.ui_language === 'en' && r.user.user_metadata.ui_language === 'en', 'grava en quando não havia');
  r = await run({ ui_language: 'en' }, 'pt-BR');
  check(r.calls.length === 1 && r.calls[0].data.ui_language === 'pt-BR', 'regrava ao trocar para pt-BR');
  r = await run({ ui_language: 'en' }, 'en');
  check(r.calls.length === 0, 'não regrava quando já é igual');
  r = await run({ nome: 'x' }, 'en');
  check(r.calls.length === 1, 'preserva outros campos (updateUser mescla data)');
  r = await run({}, 'en', false);
  check(r.calls.length === 0, 'sem cliente do Supabase não quebra');
  console.log(`user_metadata.ui_language: ${ok} passaram, ${bad} falharam`); process.exit(bad ? 1 : 0);
})();
