// Conta sem linha em profiles (produção, 2026-10-16): o site precisa criar o perfil (ensure_my_profile) e nunca
// depender da leitura direta da tabela (fechada pela 080: 403). Carrega shared/profile.js de verdade num VM.
// Rodar: node tests/perfil-faltando/test_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'profile.js'), 'utf8');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

function makeCtx(rpcProfile, tableResult){
  const calls = [];
  const table = () => { const q = { select(){ return q; }, eq(){ return q; }, maybeSingle: async () => { calls.push('table'); return tableResult; },
    update(){ return q; }, upsert: async () => ({ error: null }), in: async () => ({ data: [] }) }; return q; };
  const ctx = {
    console: { error(){}, log(){}, warn(){} }, CURRENT_USER: { id: 'u1' }, PROFILE_CACHE: null,
    document: { getElementById: () => null, addEventListener(){}, querySelectorAll: () => [] }, window: {}, localStorage: { getItem(){ return null; }, setItem(){} },
    supabaseClient: {
      rpc: async (name) => { calls.push(name);
        if (name === 'get_my_profile') return rpcProfile;
        if (name === 'ensure_my_profile') return { data: { user_id: 'u1', username: 'u1abc', display_name: null }, error: null };
        return { data: null, error: null }; },
      from: (t) => { if (t === 'profile_private') { const q = { select(){ return q; }, eq(){ return q; }, maybeSingle: async () => ({ data: null, error: null }) }; return q; } return table(); },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\n;globalThis.__ensure = ensureProfileLoaded; globalThis.__getCache = () => PROFILE_CACHE;', ctx);
  return { ctx, calls };
}

(async () => {
  // 1. RPC responde sem linha (conta sem perfil): cria pelo ensure_my_profile, sem ler a tabela
  let { ctx, calls } = makeCtx({ data: null, error: null }, { data: null, error: { code: '42501', message: 'permission denied' } });
  let p = await ctx.__ensure();
  check('sem perfil: chama ensure_my_profile', calls.includes('ensure_my_profile'), calls);
  check('sem perfil: não lê a tabela profiles', !calls.includes('table'), calls);
  check('sem perfil: cache com o perfil criado', p && p.username === 'u1abc', p);

  // 2. RPC com erro e leitura da tabela com 403: ainda assim cria o perfil (antes parava aqui)
  ({ ctx, calls } = makeCtx({ data: null, error: { message: 'rpc fora do ar' } }, { data: null, error: { code: '42501', message: 'permission denied' } }));
  p = await ctx.__ensure();
  check('rpc com erro + 403: chama ensure_my_profile', calls.includes('ensure_my_profile'), calls);
  check('rpc com erro + 403: perfil no cache', p && p.user_id === 'u1', p);

  // 3. Perfil existe: usa o da RPC, não cria nada
  ({ ctx, calls } = makeCtx({ data: { user_id: 'u1', username: 'ana' }, error: null }, { data: null, error: null }));
  p = await ctx.__ensure();
  check('com perfil: não chama ensure_my_profile', !calls.includes('ensure_my_profile'), calls);
  check('com perfil: usa a linha da RPC', p && p.username === 'ana', p);

  console.log(`Perfil faltando (unidade): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
