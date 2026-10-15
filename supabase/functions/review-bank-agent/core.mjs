// Lógica pura da rotina automática do Banco de Revisão (sem rede, sem Deno): recebe um `db` (adaptador) e o `engine`
// (engine.generated.mjs, o MESMO código do navegador). Testada em tests/banco-revisao/test_agent_core.js com um db falso.
//
// Fronteiras de segurança (a tarefa agendada nunca recebe a chave-mestra do banco):
//  - só mexe em alunos do Banco da professora fixada no secret (teacherId) E com agent_managed = true;
//  - só INSERE itens novos e recaps; nunca edita, apaga, aprova nem corta item que já existe, nem toca em progresso (FSRS);
//  - cartão só nasce pela mesma regra da tela (rbReadyToDeliver) e pelo mesmo motor (rbBuildCard).

const MAX_ITEMS_PER_STUDENT = 400;
const MAX_STUDENTS = 80;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const clean = (s, max = 4000) => String(s == null ? '' : s).replace(/\r/g, '').trim().slice(0, max);

// Hash curto e determinístico (FNV-1a) para a chave do item: repetir a mesma entrega nunca duplica.
export function itemKey(it) {
  const str = [norm(it.type), norm(it.q), norm(it.a)].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'ag-' + h.toString(36);
}

const contentSig = (type, q, a) => [norm(type), norm(q), norm(a)].join('|');
const isDate = (d) => typeof d === 'string' && DATE.test(d);
const isUuid = (u) => typeof u === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u);
const bad = (status, error, detail) => ({ status, json: { ok: false, error, ...(detail ? { detail } : {}) } });

export function createAgent({ engine, db, teacherId, now }) {
  // data de hoje no fuso da professora (a rotina roda de madrugada; em UTC a data viraria às 21h de Brasília)
  const today = () => (now ? now() : new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));

  async function managedStudent(id) {
    const list = await db.listManagedStudents(teacherId);
    return list.find((s) => s.id === id) || null;
  }

  async function ping() {
    const list = await db.listManagedStudents(teacherId);
    return { status: 200, json: { ok: true, teacher_configured: true, managed_students: list.length } };
  }

  async function state(body) {
    const students = await db.listManagedStudents(teacherId);
    const settings = await db.getSettings(teacherId);
    const out = [];
    for (const s of students) {
      if (s.status !== 'ativo') continue;
      const items = await db.listItems(s.id);
      out.push({
        id: s.id, name: s.name, language_app_key: s.language_app_key, reference_language: s.reference_language,
        notebook_id: s.notebook_id, agenda_names: s.agenda_names || [], lesson_dates: s.lesson_dates || [],
        last_entry_read: s.last_entry_read, started_on: s.started_on,
        linked_email: s.linked_student_id ? await db.getUserEmail(s.linked_student_id) : null,
        items: items.map((i) => ({ key: i.import_key, id: i.id, type: i.item_type, q: i.question, a: i.answer, status: i.status, class_date: i.class_date, has_card: !!i.teacher_flashcard_id })),
      });
    }
    return { status: 200, json: { ok: true, today: today(), manual_markdown: (settings && settings.manual_markdown) || '', auto_generate: !settings || settings.auto_generate !== false, students: out } };
  }

  async function registerStudent(body) {
    const name = clean(body.name, 120);
    const language = body.language;
    if (!name || !['frances', 'portugues', 'mandarim'].includes(language)) return bad(400, 'invalid_student');
    const ref = ['pt', 'en', 'fr'].includes(body.reference) ? body.reference : 'pt';
    const existing = await db.findStudentByName(teacherId, name, language);
    if (existing) return { status: 200, json: { ok: true, created: false, id: existing.id, agent_managed: !!existing.agent_managed } };
    const row = {
      teacher_id: teacherId, name, language_app_key: language, reference_language: ref, status: 'ativo', agent_managed: true,
      notebook_id: clean(body.notebook_id, 200) || null,
      agenda_names: (Array.isArray(body.agenda_names) ? body.agenda_names : []).map((x) => clean(x, 120)).filter(Boolean).slice(0, 10),
      lesson_dates: [], last_entry_read: isDate(body.last_entry_read) ? body.last_entry_read : null, started_on: isDate(body.started_on) ? body.started_on : today(),
      import_key: 'agent:' + norm(name).replace(/[^a-z0-9]+/g, '-') + ':' + language,
    };
    const created = await db.insertStudent(row);
    return { status: 200, json: { ok: true, created: true, id: created.id, agent_managed: true } };
  }

  async function ingestStudent(entry, settings, summary) {
    const s = await managedStudent(entry && entry.student_id);
    if (!s) { summary.rejected.push({ student_id: entry && entry.student_id, reason: 'not_managed' }); return; }
    const res = { student_id: s.id, name: s.name, new_items: 0, pending: 0, sensitive: 0, skipped_duplicates: 0, skipped_invalid: 0, recap_items: 0, recap_created: false, cards_created: 0, card_errors: [] };
    summary.students.push(res);
    const t = today();
    const existing = await db.listItems(s.id);
    const seenKeys = new Set(existing.map((i) => i.import_key).filter(Boolean));
    const seenSigs = new Set(existing.map((i) => contentSig(i.item_type, i.question, i.answer)));

    // itens novos: mesma validação e normalização do arquivo de importação (rbiParse), sem sobrescrever nada
    const incoming = (Array.isArray(entry.items) ? entry.items : []).slice(0, MAX_ITEMS_PER_STUDENT);
    const prepared = [];
    for (const raw of incoming) {
      // linha [pessoal] do caderno: entra como PENDENTE e sensível (nunca vira cartão sozinha); a marca é tirada do texto
      const PERSONAL = /^\s*\[pessoal\]\s*/i;
      const personal = !!raw && (raw.personal === true || PERSONAL.test(String(raw.q || '')) || PERSONAL.test(String(raw.a || '')) || PERSONAL.test(String(raw.note || '')));
      const it = raw && typeof raw === 'object' ? Object.assign({}, raw, { q: String(raw.q == null ? '' : raw.q).replace(PERSONAL, ''), a: String(raw.a == null ? '' : raw.a).replace(PERSONAL, ''), note: String(raw.note == null ? '' : raw.note).replace(PERSONAL, '') }) : raw;
      const key = clean(it && it.key, 80) || itemKey({ type: it && it.type, q: it && it.q, a: it && it.a });
      const sig = contentSig(it && it.type, it && it.q, it && it.a);
      if (seenKeys.has(key) || seenSigs.has(sig)) { res.skipped_duplicates++; continue; }
      seenKeys.add(key); seenSigs.add(sig);
      // dúvida, conteúdo sensível, [pessoal], sugestão ou pedido de "cortado" => "pendente" (quem corta é a professora, nunca a rotina);
      // só entra "aprovado" o item limpo, sem nenhuma dessas marcas
      const sensitive = !!(it && it.sensitive === true) || personal;
      // geração automática desligada: item limpo de aluno vinculado nunca entra aprovado (a professora aprova um a um, como na tela)
      const autoOff = !!(settings && settings.auto_generate === false && s.linked_student_id);
      const hold = !!(autoOff || clean(it && it.doubt) || sensitive || (it && it.status === 'cortado') || (it && it.proposal && typeof it.proposal === 'object' && Object.keys(it.proposal).length));
      // "cortado"/[pessoal] viram pendente COM dúvida preenchida: sem ela a geração automática entregaria o cartão na hora
      const doubt = clean(it && it.doubt) || (personal ? 'Linha marcada [pessoal] no caderno. Decida se entra na revisão.' : (it && it.status === 'cortado' ? 'A rotina marcou este item como cortado. Decida se entra na revisão.' : ''));
      prepared.push(Object.assign({}, it, { key, date: isDate(it && it.date) ? it.date : t, doubt, sensitive, status: hold ? 'pendente' : 'aprovado' }));
    }
    if (prepared.length) {
      const parsed = engine.rbiParse(JSON.stringify({ version: 1, students: [{ key: 'x', name: 'x', language: s.language_app_key, items: prepared }] }));
      if (!parsed.ok) { res.skipped_invalid += prepared.length; }
      else {
        const rows = parsed.data.students[0].items.map((i) => Object.assign({ teacher_id: teacherId, bank_student_id: s.id, language_app_key: s.language_app_key, student_id: s.linked_student_id || null }, i, { level: 0, due_date: t, last_review_date: null, last_result: null }));
        res.skipped_invalid += prepared.length - rows.length;
        if (rows.length) {
          await db.insertItems(rows);
          res.new_items = rows.length;
          res.pending = rows.filter((r) => r.status === 'pendente').length;
          res.sensitive = rows.filter((r) => r.sensitive).length;
        }
      }
    }

    // datas de aula e última entrada lida
    const upd = {};
    if (Array.isArray(entry.lesson_dates)) {
      const keep = (s.lesson_dates || []).filter((d) => isDate(d) && d < t);
      upd.lesson_dates = [...new Set([...keep, ...entry.lesson_dates.filter(isDate)])].sort().slice(-60);
    }
    if (isDate(entry.last_entry_read) && (!s.last_entry_read || entry.last_entry_read > s.last_entry_read)) upd.last_entry_read = entry.last_entry_read;
    if (Object.keys(upd).length) await db.updateStudent(s.id, Object.assign(upd, { updated_at: new Date().toISOString() }));

    const all = await db.listItems(s.id);

    // Récap da aula (a tela faz o mesmo com rbSelectRecap); se já existe um para a data, não mexe
    if (isDate(entry.recap_date)) {
      const prior = await db.getRecap(s.id, entry.recap_date);
      if (!prior) {
        const pick = engine.rbSelectRecap(all, entry.recap_date, engine.RB_RECAP_SIZE);
        await db.insertRecap({ teacher_id: teacherId, bank_student_id: s.id, language_app_key: s.language_app_key, class_date: entry.recap_date, item_ids: pick.map((i) => i.id), student_id: s.linked_student_id || null });
        res.recap_created = true; res.recap_items = pick.length;
      }
    }

    // cartões (só aluno vinculado; mesma regra e mesmo motor da tela "Gerar cartões")
    if (s.linked_student_id) {
      for (const it of all.filter((i) => engine.rbReadyToDeliver(i, s, settings))) {
        const card = engine.rbBuildCard(it, s);
        if (!card.ok) { res.card_errors.push({ item: it.id, error: card.error }); continue; }
        try { await db.approveCard(teacherId, it.id, card); res.cards_created++; }
        catch (e) { res.card_errors.push({ item: it.id, error: String((e && e.message) || e).slice(0, 200) }); }
      }
    }
  }

  async function runIngest(entries, settings) {
    const summary = { students: [], rejected: [] };
    for (const e of entries) {
      try { await ingestStudent(e, settings, summary); }
      catch (err) { summary.rejected.push({ student_id: e && e.student_id, reason: 'error', detail: String((err && err.message) || err).slice(0, 200) }); }
    }
    try { await db.insertRun({ teacher_id: teacherId, summary }); } catch (_) { /* registro é auditoria: não derruba a rodada */ }
    return summary;
  }

  async function ingest(body) {
    const entries = Array.isArray(body.students) ? body.students : null;
    if (!entries) return bad(400, 'invalid_payload');
    if (entries.length > MAX_STUDENTS) return bad(413, 'too_many_students');
    const settings = await db.getSettings(teacherId);
    const summary = await runIngest(entries, settings);
    return { status: 200, json: { ok: true, today: today(), summary } };
  }

  // Caixa de entrada (plano B): a tarefa agendada grava o payload no banco pelo conector e esta ação o processa por dentro do Supabase.
  // Payload: { register_students?: [{name, language, reference, agenda_names, notebook_id, last_entry_read, started_on}], students: [ {student_id | student_key: "nome|idioma", ...mesmo formato do ingest} ] }
  async function processOne(row, settings) {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    if (!Array.isArray(payload.students) && !Array.isArray(payload.register_students)) throw new Error('invalid_payload');
    const entries = Array.isArray(payload.students) ? payload.students : [];
    if (entries.length > MAX_STUDENTS) throw new Error('too_many_students');
    const keyToId = {};
    const registered = [];
    for (const r of (Array.isArray(payload.register_students) ? payload.register_students : []).slice(0, 20)) {
      const out = await registerStudent(r || {});
      if (out.status !== 200) { registered.push({ name: r && r.name, error: out.json.error }); continue; }
      keyToId[norm(r.name) + '|' + r.language] = out.json.id;
      registered.push({ name: clean(r.name, 120), id: out.json.id, created: out.json.created, agent_managed: out.json.agent_managed });
    }
    const managed = await db.listManagedStudents(teacherId);
    managed.forEach((s) => { keyToId[norm(s.name) + '|' + s.language_app_key] = s.id; });
    const resolved = entries.map((e) => {
      if (e && !e.student_id && typeof e.student_key === 'string') {
        const [name, lang] = e.student_key.split('|');
        return Object.assign({}, e, { student_id: keyToId[norm(name) + '|' + (lang || '').trim()] || null });
      }
      return e;
    });
    const summary = await runIngest(resolved, settings);
    return { registered, summary };
  }

  async function processInbox(body) {
    const settings = await db.getSettings(teacherId);
    const rows = await db.claimInbox(teacherId, isUuid(body.inbox_id) ? body.inbox_id : null);
    const results = [];
    for (const row of rows) {
      try {
        const result = await processOne(row, settings);
        await db.finishInbox(row.id, 'feito', result, null);
        results.push({ id: row.id, status: 'feito' });
      } catch (err) {
        const msg = String((err && err.message) || err).slice(0, 300);
        await db.finishInbox(row.id, 'erro', null, msg);
        results.push({ id: row.id, status: 'erro', error: msg });
      }
    }
    return { status: 200, json: { ok: true, processed: results.length, results } };
  }

  // Rodada noturna sem a tarefa: recap das aulas de hoje e cartões dos itens prontos (nada de itens novos).
  async function nightly() {
    const settings = await db.getSettings(teacherId);
    const t = today();
    const students = (await db.listManagedStudents(teacherId)).filter((s) => s.status === 'ativo');
    const entries = students.map((s) => ({ student_id: s.id, recap_date: (s.lesson_dates || []).includes(t) ? t : undefined }));
    const summary = await runIngest(entries, settings);
    return { status: 200, json: { ok: true, today: t, summary } };
  }

  async function handle(body) {
    if (!body || typeof body !== 'object') return bad(400, 'invalid_payload');
    switch (body.action) {
      case 'ping': return ping();
      case 'state': return state(body);
      case 'register_student': return registerStudent(body);
      case 'ingest': return ingest(body);
      case 'process_inbox': return processInbox(body);
      case 'nightly': return nightly();
      default: return bad(400, 'unknown_action');
    }
  }
  return { handle };
}
