// Harness dos testes da Fase F (Add Card + destino em Deck).
// Carrega os arquivos REAIS de shared/ num sandbox `vm` (nunca cópias) e
// pluga um supabaseClient em memória que respeita o contrato de
// decks/own_flashcards (incl. as regras do trigger own_flashcards_validate_deck
// -- a versão real dessas regras é testada contra o Postgres em test_supabase_real.sql).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const { extractFunction } = require('../fase-e/harness');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const FILES = ['shared/srs.js', 'shared/fsrs.js', 'shared/study-queue.js', 'shared/flashcard-model.js', 'shared/study-trail-model.js', 'shared/analytics-metrics.js', 'shared/deck-engine.js',
  'shared/flashcard-editor-state.js', 'shared/flashcard-field-editor.js', 'shared/flashcard-native-persistence.js',
  'shared/own-flashcards.js', 'shared/deck-data.js', 'shared/anki-import.js'];

function makeFakeSupabase(db, userId){
  let seq = 100;
  const q = (table) => {
    const st = { table, filters: [], op: null, payload: null, single: false, sel: false };
    const run = () => {
      const rows = db[table];
      if (st.op === 'insert'){
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        for (const r of list){
          if (table === 'own_flashcards'){
            const d = r.deck_id != null ? db.decks.find(x => x.id === r.deck_id) : null;
            if (r.deck_id != null && (!d || !['personal_root', 'personal'].includes(d.kind) || d.owner_id !== r.owner_id || d.language_app_key !== r.language_app_key))
              return { data: null, error: { message: 'trigger: deck inválido' } };
          }
        }
        if (db.failNextInsert){ db.failNextInsert = false; return { data: null, error: { message: 'falha simulada' } }; }
        const created = list.map(r => Object.assign({ id: ++seq, status: 'active', revision: 0, created_at: new Date().toISOString() }, r));
        created.forEach(c => rows.push(c));
        return { data: st.single ? created[0] : created, error: null };
      }
      let out = rows.filter(r => st.filters.every(([k, v]) => r[k] === v));
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b; // select/order/etc.
    } });
    return b;
  };
  return {
    from: q,
    rpc: async (name, args) => {
      if (name !== 'ensure_user_decks') return { data: null, error: { message: 'rpc desconhecida' } };
      if (args.p_owner_id !== userId) return { data: null, error: { message: 'not_authorized' } };
      let root = db.decks.find(d => d.kind === 'root' && d.owner_id === userId && d.language_app_key === args.p_language_app_key);
      if (!root){ root = { id: ++seq, kind: 'root', owner_id: userId, parent_deck_id: null, language_app_key: args.p_language_app_key, name: 'root' }; db.decks.push(root); }
      let pr = db.decks.find(d => d.kind === 'personal_root' && d.owner_id === userId && d.language_app_key === args.p_language_app_key);
      if (!pr){ pr = { id: ++seq, kind: 'personal_root', owner_id: userId, parent_deck_id: root.id, language_app_key: args.p_language_app_key, name: 'Meus Decks' }; db.decks.push(pr); }
      db.rpcCalls = (db.rpcCalls || 0) + 1;
      return { data: [{ root_deck_id: root.id, personal_root_deck_id: pr.id }], error: null };
    },
  };
}

function load(appKey, userId){
  const db = { decks: [], own_flashcards: [] };
  const ctx = vm.createContext({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number, Error, RegExp });
  ctx.window = ctx; ctx.APP_KEY = appKey; ctx.CURRENT_USER = { id: userId };
  ctx.supabaseClient = makeFakeSupabase(db, userId);
  ctx.escapeHTML = s => String(s);
  FILES.forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  // flashcardIdForRow vive em <lang>/app.js (app.js inteiro depende de DOM): extração da função REAL.
  vm.runInContext(extractFunction(read((appKey === 'frances' ? 'fr' : 'zh') + '/app.js'), 'flashcardIdForRow'), ctx);
  return { ctx, db };
}

let passed = 0, failed = 0;
function check(name, cond, extra){
  if (cond) passed++; else { failed++; console.log('  FALHOU:', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
function summary(label){
  console.log(`${label}: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
}
module.exports = { ROOT, read, load, check, summary };
