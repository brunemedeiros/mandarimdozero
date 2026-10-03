// Harness dos testes da Fase G (Teacher Decks). Carrega os arquivos REAIS de
// shared/ num sandbox `vm` (nunca cópias) com um supabaseClient em memória
// que replica o CONTRATO de decks/teacher_flashcards/ensure_teacher_decks
// (regras de RLS/trigger verdadeiras são testadas contra o Postgres real em
// test_supabase_real.sql).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const { extractFunction } = require('../fase-e/harness');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const FILES = ['shared/srs.js', 'shared/fsrs.js', 'shared/study-queue.js', 'shared/flashcard-model.js', 'shared/study-trail-model.js', 'shared/analytics-metrics.js', 'shared/deck-engine.js',
  'shared/flashcard-editor-state.js', 'shared/flashcard-field-editor.js', 'shared/flashcard-native-persistence.js',
  'shared/own-flashcards.js', 'shared/teacher-flashcards.js', 'shared/deck-data.js', 'shared/my-flashcards.js'];

function makeFakeSupabase(db, userId){
  const nextId = () => (db.seq = (db.seq || 100) + 1);
  const teacherDeckOk = (r) => {
    if (r.deck_id == null) return true;
    const d = db.decks.find(x => x.id === r.deck_id);
    return !!d && ['teacher_root', 'teacher'].includes(d.kind) && d.owner_id === r.student_id && d.teacher_id === r.teacher_id && d.language_app_key === r.language_app_key;
  };
  const q = (table) => {
    const st = { table, filters: [], op: null, payload: null, single: false, head: false };
    const run = () => {
      const rows = db[table];
      if (st.op === 'insert'){
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        if (table === 'teacher_flashcards'){
          for (const r of list) if (!teacherDeckOk(r)) return { data: null, error: { message: 'trigger: deck invalido' } };
          if (db.failStudent && list.some(r => r.student_id === db.failStudent)) return { data: null, error: { message: 'falha simulada' } };
        }
        if (table === 'decks'){
          for (const r of list){
            const parent = db.decks.find(x => x.id === r.parent_deck_id);
            if (!parent || !['teacher_root', 'teacher'].includes(parent.kind) || parent.owner_id !== r.owner_id || parent.teacher_id !== r.teacher_id || parent.language_app_key !== r.language_app_key || r.teacher_id !== userId)
              return { data: null, error: { message: 'trigger/rls: deck invalido' } };
          }
        }
        const created = list.map(r => Object.assign({ id: nextId(), status: 'active', revision: 0, created_at: new Date().toISOString() }, r));
        created.forEach(c => rows.push(c));
        return { data: st.single ? created[0] : created, error: null };
      }
      const match = r => st.filters.every(([k, v]) => r[k] === v);
      if (st.op === 'update'){
        const hit = rows.filter(match); hit.forEach(r => Object.assign(r, st.payload));
        return { data: hit, error: null };
      }
      if (st.op === 'delete'){
        db[table] = rows.filter(r => !match(r));
        return { data: null, error: null };
      }
      const out = rows.filter(match);
      if (st.head) return { data: null, count: out.length, error: null };
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'update') return (pl) => { st.op = 'update'; st.payload = pl; return b; };
      if (p === 'delete') return () => { st.op = 'delete'; return b; };
      if (p === 'select') return (_c, o) => { if (o && o.head) st.head = true; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    } });
    return b;
  };
  return {
    from: q,
    rpc: async (name, args) => {
      if (name === 'ensure_user_decks'){
        if (args.p_owner_id !== userId) return { data: null, error: { message: 'not_authorized' } };
        return { data: null, error: null };
      }
      if (name !== 'ensure_teacher_decks') return { data: null, error: { message: 'rpc desconhecida' } };
      db.rpcCalls = (db.rpcCalls || 0) + 1;
      const sid = args.p_student_id, lang = args.p_language_app_key;
      const linked = db.teacher_students.some(l => l.teacher_id === userId && l.student_id === sid && l.language_app_key === lang && l.status === 'active');
      if (!linked || sid === userId) return { data: null, error: { message: 'not_authorized' } };
      let root = db.decks.find(d => d.kind === 'root' && d.owner_id === sid && d.language_app_key === lang);
      if (!root){ root = { id: nextId(), kind: 'root', owner_id: sid, parent_deck_id: null, language_app_key: lang, name: 'root' }; db.decks.push(root); }
      let tr = db.decks.find(d => d.kind === 'teacher_root' && d.owner_id === sid && d.teacher_id === userId && d.language_app_key === lang);
      if (!tr){ tr = { id: nextId(), kind: 'teacher_root', owner_id: sid, teacher_id: userId, parent_deck_id: root.id, language_app_key: lang, name: 'Cartões da professora' }; db.decks.push(tr); }
      return { data: [{ root_deck_id: root.id, teacher_root_deck_id: tr.id }], error: null };
    },
  };
}

function load(appKey, userId){
  const db = { decks: [], own_flashcards: [], teacher_flashcards: [], teacher_students: [] };
  const ctx = vm.createContext({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number, Error, RegExp });
  ctx.window = ctx; ctx.APP_KEY = appKey; ctx.CURRENT_USER = { id: userId };
  ctx.supabaseClient = makeFakeSupabase(db, userId);
  ctx.escapeHTML = s => String(s);
  ctx.STATE = { cards: [] };
  const noop = () => {}; const el = { addEventListener: noop, style: {}, classList: { add: noop, remove: noop, toggle: noop }, querySelector: () => null, querySelectorAll: () => [] };
  ctx.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: el };
  FILES.forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
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
module.exports = { ROOT, read, load, check, summary, makeFakeSupabase, FILES };
