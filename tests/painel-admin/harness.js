// Harness do Painel de Admin: reaproveita o navegador e o login de teste de tests/painel-alunos/harness.js e troca o cliente do
// Supabase por um banco em memória (window.__T) com o suficiente do PostgREST: select/eq/neq/in/ilike/or/order/limit/range,
// insert/update/delete/single. RPCs e Edge Functions são registradas em window.__rpcLog / window.__fnLog e respondem por
// window.__RPC[nome](args) / window.__FN[nome](body). window.__falha = { tabela, op } faz a PRÓXIMA operação dar erro.
const { abrir } = require('../painel-alunos/harness.js');

function instalarBanco(seed){
  window.__T = JSON.parse(JSON.stringify(seed || {}));
  window.__rpcLog = []; window.__fnLog = []; window.__RPC = window.__RPC || {}; window.__FN = window.__FN || {};
  let nid = 9000;
  const tabela = (n) => window.__T[n] || (window.__T[n] = []);
  const cmp = (a, b) => (a == null ? -1 : b == null ? 1 : a < b ? -1 : a > b ? 1 : 0);
  const like = (v, pat) => new RegExp('^' + String(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(v == null ? '' : v));
  supabaseClient.from = (nome) => {
    const st = { op: 'select', payload: null, filtros: [], ordem: [], limite: null, faixa: null, unico: false, contar: false };
    const run = () => {
      const f = window.__falha;
      if (f && f.tabela === nome && f.op === st.op){ window.__falha = null; return { data: null, error: { message: 'falha simulada', code: f.code } }; }
      const T = tabela(nome);
      const ok = (r) => st.filtros.every(fn => fn(r));
      if (st.op === 'insert'){
        const lista = (Array.isArray(st.payload) ? st.payload : [st.payload]).map(r => Object.assign({ id: ++nid, created_at: new Date().toISOString(), granted_at: new Date().toISOString() }, r));
        lista.forEach(r => T.push(r));
        return { data: st.unico ? lista[0] : lista, error: null };
      }
      if (st.op === 'update'){ const hit = T.filter(ok); hit.forEach(r => Object.assign(r, st.payload)); return { data: st.unico ? (hit[0] || null) : hit, error: null }; }
      if (st.op === 'delete'){ const hit = T.filter(ok); window.__T[nome] = T.filter(r => !hit.includes(r)); return { data: hit, error: null }; }
      let out = T.filter(ok);
      st.ordem.slice().reverse().forEach(([c, asc]) => { out = out.slice().sort((a, b) => (asc ? 1 : -1) * cmp(a[c], b[c])); });
      if (st.faixa) out = out.slice(st.faixa[0], st.faixa[1] + 1);
      if (st.limite != null) out = out.slice(0, st.limite);
      out = JSON.parse(JSON.stringify(out));
      return { data: st.unico ? (out[0] || null) : out, count: out.length, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      const add = (fn) => { st.filtros.push(fn); return b; };
      switch (p){
        case 'then': return (res, rej) => Promise.resolve(run()).then(res, rej);
        case 'select': return () => b;
        case 'insert': return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
        case 'update': return (pl) => { st.op = 'update'; st.payload = pl; return b; };
        case 'delete': return () => { st.op = 'delete'; return b; };
        case 'upsert': return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
        case 'eq': return (c, v) => add(r => String(r[c]) === String(v));   // PostgREST compara texto: id numérico casa com "3"
        case 'neq': return (c, v) => add(r => String(r[c]) !== String(v));
        case 'in': return (c, vs) => add(r => vs.includes(r[c]));
        case 'gte': return (c, v) => add(r => r[c] >= v);
        case 'lte': return (c, v) => add(r => r[c] <= v);
        case 'is': return (c, v) => add(r => (r[c] == null) === (v === null));
        case 'ilike': return (c, pat) => add(r => like(r[c], pat));
        case 'or': return (txt) => add(r => String(txt).split(',').some(par => { const m = /^([a-z_]+)\.ilike\.(.*)$/.exec(par); return m ? like(r[m[1]], m[2]) : false; }));
        case 'order': return (c, o) => { st.ordem.push([c, !o || o.ascending !== false]); return b; };
        case 'limit': return (n) => { st.limite = n; return b; };
        case 'range': return (a, z) => { st.faixa = [a, z]; return b; };
        case 'single': case 'maybeSingle': return () => { st.unico = true; return b; };
        default: return () => b;
      }
    } });
    return b;
  };
  // o harness da professora troca fetchAllProfiles por uma lista fixa; aqui volta a ler do banco em memória (como o código real)
  fetchAllProfiles = async () => (await supabaseClient.from('profiles').select('user_id, username, display_name').order('username', { ascending: true })).data || [];
  supabaseClient.rpc = async (nome, args) => {
    window.__rpcLog.push([nome, args]);
    const f = window.__falha; if (f && f.rpc === nome){ window.__falha = null; return { data: null, error: { message: 'falha simulada' } }; }
    const h = window.__RPC[nome]; return h ? { data: await h(args), error: null } : { data: null, error: null };
  };
  supabaseClient.functions = { invoke: async (nome, o) => {
    window.__fnLog.push([nome, o && o.body]);
    const f = window.__falha; if (f && f.fn === nome){ window.__falha = null; return { data: null, error: { message: 'falha simulada' } }; }
    const h = window.__FN[nome]; return h ? { data: await h(o && o.body), error: null } : { data: { ok: true }, error: null };
  } };
}

// Abre o app como admin e já na aba pedida do Painel de Admin ('premium', 'notifications', 'badges', 'reports', 'analytics').
async function abrirAdmin({ lang = 'fr', scheme = 'light', width = 1280, height = 1000, aba = 'premium', seed = {}, antes } = {}){
  const h = await abrir({ lang, scheme, width, height });
  const p = h.page;
  await p.evaluate(instalarBanco, seed);
  if (antes) await p.evaluate(antes);
  await p.evaluate((a) => { isAdminUser = () => true; try { isTeacherUser = () => true; } catch (e) {} switchTab('admin-badges'); switchAdminPanelSection(a); }, aba);
  return h;
}
module.exports = { abrirAdmin, instalarBanco };
