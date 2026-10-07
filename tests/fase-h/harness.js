// Harness da Fase H: reaproveita o da Fase G (fake supabase em memória) e
// acrescenta shared/admin-flashcards.js ao sandbox. O fake ganha as regras de
// vínculo ativo da migration 055 (o Postgres real é testado em
// test_supabase_real.sql -- aqui só o CONTRATO usado pelo cliente).
const vm = require('vm');
const g = require('../fase-g/harness');
const { read, check, summary, makeFakeSupabase, FILES } = g;
const { extractFunction } = require('../fase-e/harness');

function load(appKey, userId, sharedDb){
  const db = sharedDb || { decks: [], own_flashcards: [], teacher_flashcards: [], teacher_students: [] };
  const ctx = vm.createContext(require('../i18n/vm-t').installT({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number, Error, RegExp }));
  ctx.window = ctx; ctx.APP_KEY = appKey; ctx.CURRENT_USER = { id: userId };
  ctx.supabaseClient = makeFakeSupabase(db, userId);
  ctx.escapeHTML = s => String(s);
  ctx.STATE = { cards: [] };
  ctx.STUDENT_LANGUAGE_LABELS = { frances: 'Francês', mandarim: 'Mandarim', portugues: 'Português' };
  ctx.flashcardStudentLabel = s => s.username;
  const noop = () => {}; const el = { addEventListener: noop, style: {}, classList: { add: noop, remove: noop, toggle: noop }, querySelector: () => null, querySelectorAll: () => [] };
  ctx.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => el, body: el };
  [...FILES, 'shared/admin-flashcards.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  vm.runInContext(extractFunction(read((appKey === 'frances' ? 'fr' : 'zh') + '/app.js'), 'flashcardIdForRow'), ctx);
  return { ctx, db };
}
module.exports = { load, check, summary, read };
