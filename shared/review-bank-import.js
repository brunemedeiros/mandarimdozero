// Importação dos dados do Banco de Revisão antigo (artifact) para o banco do site. A professora escolhe um arquivo
// .json (formato abaixo) em Banco de Revisão > Alunos > "Importar dados do Banco antigo". Grava como ela mesma (RLS):
// alunos do Banco, itens, recaps, respostas e (opcional) o manual. Idempotente: alunos e itens têm `import_key`
// (insere só o que falta, sem sobrescrever o que já existe); respostas importadas são apagadas e regravadas por aluno.
// Nada é entregue a ninguém: itens aprovados de alunos vinculados só viram cartão pelo botão "Gerar cartões".
//
// Formato (version 1), sem e-mails nem códigos de acesso:
// { "version": 1, "manual": "markdown", "students": [ { "key", "name", "language": "frances|portugues|mandarim",
//   "reference": "pt|en|fr", "status": "ativo|arquivado", "notebookId", "agenda": [], "lessonDates": ["AAAA-MM-DD"],
//   "lastEntryRead", "since", "items": [ { "key", "type", "q", "a", "wrong", "gap", "note", "doubt", "status",
//   "date", "level", "due", "last", "lastResult", "proposal", "sensitive" } ], "recaps": [ { "date", "items": ["key"] } ],
//   "reviews": [ { "item", "outcome", "reason", "mode", "date", "ts" } ] } ] }
// Depende de shared/review-bank-model.js (RB_ITEM_TYPES, RB_STATUSES, RB_OUTCOMES, RB_REASONS) e de shared/review-bank.js (RB, rbFetchAll).

const RBI_LANGS = ['frances', 'portugues', 'mandarim'];
const RBI_REFS = ['pt', 'en', 'fr'];
const RBI_MODES = ['recap', 'ultima', 'erros'];
const RBI_MAX_TEXT = 4000;
const RBI_DATE = /^\d{4}-\d{2}-\d{2}$/;

function rbiText(v){ const s = String(v == null ? '' : v).replace(/\r/g, '').trim(); return s.length > RBI_MAX_TEXT ? s.slice(0, RBI_MAX_TEXT) : s; }
function rbiDate(v){ const s = rbiText(v); return RBI_DATE.test(s) ? s : null; }

// Valida e normaliza o arquivo. Devolve { ok, error?, data?, summary?, warnings }.
function rbiParse(text){
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: 'json' }; }
  if (!raw || raw.version !== 1 || !Array.isArray(raw.students)) return { ok: false, error: 'format' };
  const warnings = [];
  const students = [];
  const seenStudents = new Set();
  raw.students.forEach((s, si) => {
    const key = rbiText(s && s.key), name = rbiText(s && s.name);
    if (!key || !name){ warnings.push({ code: 'student_skipped', n: si + 1 }); return; }
    if (seenStudents.has(key)){ warnings.push({ code: 'student_dup', key }); return; }
    seenStudents.add(key);
    const language = RBI_LANGS.includes(s.language) ? s.language : null;
    if (!language){ warnings.push({ code: 'student_lang', key }); return; }
    const items = [], itemKeys = new Set();
    (Array.isArray(s.items) ? s.items : []).forEach(it => {
      const ik = rbiText(it && it.key), q = rbiText(it && it.q), a = rbiText(it && it.a);
      if (!ik || !q || !a || itemKeys.has(ik)){ warnings.push({ code: 'item_skipped', key, item: ik || '?' }); return; }
      itemKeys.add(ik);
      const type = RB_ITEM_TYPES.includes(it.type) ? it.type : 'vocabulario';
      const level = Number.isInteger(it.level) ? Math.max(0, Math.min(9, it.level)) : 0;
      const proposal = it.proposal && typeof it.proposal === 'object' && !Array.isArray(it.proposal) && Object.keys(it.proposal).length ? it.proposal : null;
      items.push({
        import_key: ik, item_type: type, question: q, answer: a, wrong_form: type === 'erro' ? (rbiText(it.wrong) || null) : null,
        gap_word: rbiText(it.gap) || null, explanation: rbiText(it.note) || null, check_note: rbiText(it.doubt) || null,
        status: RB_STATUSES.includes(it.status) ? it.status : 'pendente', class_date: rbiDate(it.date), level,
        due_date: rbiDate(it.due), last_review_date: rbiDate(it.last), last_result: RB_OUTCOMES.includes(it.lastResult) ? it.lastResult : null, proposal, sensitive: it.sensitive === true,
      });
    });
    const recaps = [];
    (Array.isArray(s.recaps) ? s.recaps : []).forEach(r => {
      const d = rbiDate(r && r.date); if (!d) return;
      recaps.push({ class_date: d, keys: (Array.isArray(r.items) ? r.items : []).map(rbiText).filter(k => itemKeys.has(k)) });
    });
    const reviews = [];
    (Array.isArray(s.reviews) ? s.reviews : []).forEach(r => {
      const k = rbiText(r && r.item), d = rbiDate(r && r.date);
      if (!itemKeys.has(k) || !d || !RB_OUTCOMES.includes(r.outcome)) return;
      const ts = r.ts ? new Date(r.ts) : null;
      reviews.push({ item_key: k, outcome: r.outcome, reason: RB_REASONS.includes(rbiText(r.reason)) ? rbiText(r.reason) : (rbiText(r.reason) || null), mode: RBI_MODES.includes(r.mode) ? r.mode : null, review_date: d, created_at: ts && !isNaN(ts) ? ts.toISOString() : d + 'T12:00:00Z' });
    });
    students.push({
      import_key: key, name, language_app_key: language, reference_language: RBI_REFS.includes(s.reference) ? s.reference : 'pt', status: s.status === 'arquivado' ? 'arquivado' : 'ativo',
      notebook_id: rbiText(s.notebookId) || null, agenda_names: (Array.isArray(s.agenda) ? s.agenda : []).map(rbiText).filter(Boolean),
      lesson_dates: (Array.isArray(s.lessonDates) ? s.lessonDates : []).map(rbiDate).filter(Boolean), last_entry_read: rbiDate(s.lastEntryRead), started_on: rbiDate(s.since),
      items, recaps, reviews,
    });
  });
  if (!students.length) return { ok: false, error: 'empty' };
  const sum = (f) => students.reduce((a, s) => a + f(s), 0);
  return {
    ok: true, warnings, data: { students, manual: rbiText(raw.manual) },
    summary: { students: students.length, items: sum(s => s.items.length), pending: sum(s => s.items.filter(i => i.status === 'pendente').length), approved: sum(s => s.items.filter(i => i.status === 'aprovado').length), cut: sum(s => s.items.filter(i => i.status === 'cortado').length), recaps: sum(s => s.recaps.length), reviews: sum(s => s.reviews.length), manual: !!rbiText(raw.manual) },
  };
}

const rbiChunks = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

// Grava tudo. `onProgress(texto)` mostra o andamento. Devolve { ok, counts } ou { ok:false, error }.
async function rbiRun(data, opts, onProgress){
  const say = (m) => { if (typeof onProgress === 'function') onProgress(m); };
  const counts = { students: 0, items: 0, recaps: 0, reviews: 0 };
  try {
    for (const s of data.students){
      say(rbt('imp.progress', { name: s.name }));
      const base = { teacher_id: CURRENT_USER.id, name: s.name, language_app_key: s.language_app_key, reference_language: s.reference_language, status: s.status, notebook_id: s.notebook_id, agenda_names: s.agenda_names, lesson_dates: s.lesson_dates, last_entry_read: s.last_entry_read, started_on: s.started_on, import_key: s.import_key, updated_at: new Date().toISOString() };
      // `ignoreDuplicates`: quem já existe no site NÃO é sobrescrito (importar de novo nunca desfaz o que você mexeu aqui).
      const { error: e1 } = await supabaseClient.from('review_bank_students').upsert(base, { onConflict: 'teacher_id,import_key', ignoreDuplicates: true });
      if (e1) throw e1;
      const { data: found, error: e1b } = await supabaseClient.from('review_bank_students').select('*').eq('import_key', s.import_key);
      if (e1b) throw e1b;
      const stu = (found || [])[0];
      if (!stu) throw new Error('student');
      counts.students++;
      for (const part of rbiChunks(s.items, 150)){
        const rows = part.map(i => Object.assign({ teacher_id: CURRENT_USER.id, bank_student_id: stu.id, language_app_key: stu.language_app_key, student_id: stu.linked_student_id || null }, i));
        const { error: e2 } = await supabaseClient.from('review_bank_items').upsert(rows, { onConflict: 'bank_student_id,import_key', ignoreDuplicates: true });
        if (e2) throw e2;
        counts.items += part.length;
      }
      const idByKey = {};
      (await rbFetchAll(() => supabaseClient.from('review_bank_items').select('id,import_key').eq('bank_student_id', stu.id).order('id'))).forEach(r => { if (r.import_key) idByKey[r.import_key] = r.id; });
      for (const r of s.recaps){
        const { error } = await supabaseClient.from('review_bank_recaps').upsert({ teacher_id: CURRENT_USER.id, bank_student_id: stu.id, language_app_key: stu.language_app_key, class_date: r.class_date, item_ids: r.keys.map(k => idByKey[k]).filter(Boolean), student_id: stu.linked_student_id || null }, { onConflict: 'bank_student_id,class_date', ignoreDuplicates: true });
        if (error) throw error;
        counts.recaps++;
      }
      // respostas importadas são regravadas (idempotente); nunca mexe nas respostas do Modo aula do site
      const { error: eDel } = await supabaseClient.from('review_bank_reviews').delete().eq('bank_student_id', stu.id).eq('source', 'importado');
      if (eDel) throw eDel;
      for (const part of rbiChunks(s.reviews, 300)){
        const rows = part.filter(r => idByKey[r.item_key]).map(r => ({ item_id: idByKey[r.item_key], teacher_id: CURRENT_USER.id, bank_student_id: stu.id, student_id: null, language_app_key: stu.language_app_key, outcome: r.outcome, reason: r.reason, source: 'importado', mode: r.mode, review_date: r.review_date, created_at: r.created_at, applied_at: r.created_at }));
        if (!rows.length) continue;
        const { error } = await supabaseClient.from('review_bank_reviews').insert(rows);
        if (error) throw error;
        counts.reviews += rows.length;
      }
    }
    if (data.manual && opts && opts.replaceManual){
      const { error } = await supabaseClient.from('review_bank_settings').upsert({ teacher_id: CURRENT_USER.id, auto_generate: RB.settings.auto_generate !== false, manual_markdown: data.manual, updated_at: new Date().toISOString() }, { onConflict: 'teacher_id' });
      if (error) throw error;
      RB.settings.manual_markdown = data.manual;
    }
    return { ok: true, counts };
  } catch (e){
    return { ok: false, error: (e && e.message) || String(e), counts };
  }
}
