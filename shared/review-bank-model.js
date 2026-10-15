// Banco de Revisão da professora -- modelo PURO (sem DOM, sem rede). Testado em tests/banco-revisao/test_model.js.
// Item -> cartão nativo (Note/Fields) reaproveitando o editor de estado do motor; regras de geração automática;
// agendamento e seleção do Récap; estatísticas; markdown do Manual.
// Depende (globais, carregados antes): createNativeNoteEditorState, addFieldToEditorState,
// validateNoteEditorStateForSave, nativeContentColumnsFromEditorState (motor de flashcards) e escapeHTML.

const RB_ITEM_TYPES = ['vocabulario', 'estrutura', 'verbo', 'erro', 'pronuncia'];
const RB_STATUSES = ['pendente', 'aprovado', 'cortado'];
const RB_OUTCOMES = ['acertou', 'ajuda', 'errou'];
const RB_LANG_SHORT = { frances: 'fr', mandarim: 'zh', portugues: 'pt' };
const RB_LANG_LABEL_KEY = { frances: 'rb.lang.frances', mandarim: 'rb.lang.mandarim', portugues: 'rb.lang.portugues' };
// Motivos do erro, por tipo de item (os mesmos do Banco antigo, que os dados importados já usam).
const RB_REASONS_BY_TYPE = {
  vocabulario: ['nao_lembrou', 'em_parte', 'confundiu', 'genero'],
  verbo: ['nao_lembrou', 'conjugacao', 'tempo', 'auxiliar'],
  estrutura: ['nao_lembrou', 'ordem', 'preposicao', 'concordancia'],
  erro: ['repetiu', 'corrigiu_parte'],
  pronuncia: ['som', 'tonico'],
};
const RB_REASONS = [...new Set(Object.values(RB_REASONS_BY_TYPE).flat())];
// Dias até a próxima vez, por nível do item (0..9). Errou volta ao nível 0 (amanhã).
const RB_INTERVALS = [1, 3, 7, 14, 30, 60, 90, 120, 180, 270];
const RB_RECAP_SIZE = 8;
// Instrução do cartão "Corrija a frase" na língua de referência do aluno.
const RB_FIX_PROMPT = { pt: 'Corrija:', en: 'Fix it:', fr: 'Corrigez :' };

function rbStr(v){ return String(v == null ? '' : v).trim(); }

function rbNormalizeItem(raw){
  const r = raw || {};
  return {
    item_type: RB_ITEM_TYPES.includes(r.item_type) ? r.item_type : 'vocabulario',
    question: rbStr(r.question),
    answer: rbStr(r.answer),
    wrong_form: rbStr(r.wrong_form),
    gap_word: rbStr(r.gap_word),
    explanation: rbStr(r.explanation),
    check_note: rbStr(r.check_note),
    class_date: /^\d{4}-\d{2}-\d{2}$/.test(rbStr(r.class_date)) ? rbStr(r.class_date) : null,
    sensitive: r.sensitive === true,
  };
}

// Campos que faltam para o item virar cartão (códigos, a tela traduz).
function rbItemIssues(item){
  const i = rbNormalizeItem(item), out = [];
  if (!i.question) out.push('question');
  if (!i.answer) out.push('answer');
  if (i.item_type === 'erro' && !i.wrong_form) out.push('wrong_form');
  return out;
}

function rbHasPendingProposal(item){
  return !!(item && item.proposal && typeof item.proposal === 'object' && Object.keys(item.proposal).length);
}

// Geração automática: o item vira cartão direto quando não tem "Para conferir", tem os campos completos
// e o aluno está vinculado a uma conta. Mandarim fica de fora (precisa de pinyin: o cartão é criado à mão).
function rbReadyForAuto(item, student, settings){
  if (settings && settings.auto_generate === false) return { ok: false, reason: 'auto_off' };
  if (!student || !student.linked_student_id) return { ok: false, reason: 'not_linked' };
  if (student.status === 'arquivado') return { ok: false, reason: 'archived' };
  if (student.language_app_key === 'mandarim') return { ok: false, reason: 'needs_pinyin' };
  if (!item || item.status !== 'pendente') return { ok: false, reason: 'not_pending' };
  if (item.sensitive) return { ok: false, reason: 'sensitive' };
  if (rbStr(item.check_note)) return { ok: false, reason: 'has_doubt' };
  if (rbHasPendingProposal(item)) return { ok: false, reason: 'has_proposal' };
  if (rbItemIssues(item).length) return { ok: false, reason: 'incomplete' };
  return { ok: true, reason: null };
}

// Item que deve virar cartão agora (usado pela tela "Gerar cartões" e pela rotina da madrugada): pendente que passa
// na geração automática, ou aprovado sem cartão ainda (aluno vinculado, não sensível, campos completos, não mandarim).
function rbReadyToDeliver(item, student, settings){
  if (!item || !student) return false;
  if (item.status === 'pendente') return rbReadyForAuto(item, student, settings).ok;
  return item.status === 'aprovado' && !item.teacher_flashcard_id && !item.sensitive && !!student.linked_student_id
    && !rbItemIssues(item).length && student.language_app_key !== 'mandarim';
}

// Primeira forma de `gap_word` (aceita "a / b") que aparece na frase; devolve a frase com {{c1::...}} ou null.
function rbMakeCloze(sentence, gapWord){
  const s = rbStr(sentence), alts = rbStr(gapWord).split('/').map(x => x.trim()).filter(Boolean);
  for (const alt of alts){
    const idx = s.toLowerCase().indexOf(alt.toLowerCase());
    if (idx >= 0) return s.slice(0, idx) + '{{c1::' + s.slice(idx, idx + alt.length) + '}}' + s.slice(idx + alt.length);
  }
  return null;
}

// Tipo de cartão do item: erro = digitar a forma certa; frase com lacuna (estrutura/verbo) = completar; resto = ver resposta.
function rbCardMode(item){
  const i = rbNormalizeItem(item);
  if (i.item_type === 'erro') return 'type_answer';
  if ((i.item_type === 'estrutura' || i.item_type === 'verbo') && i.gap_word){
    const first = i.answer.split(' / ')[0];
    if (first.split(/\s+/).length >= 3 && rbMakeCloze(first, i.gap_word)) return 'cloze';
  }
  return 'normal';
}

function rbItemTags(item){
  const i = rbNormalizeItem(item), tags = ['banco-de-revisao', 'tipo-' + i.item_type];
  if (i.class_date) tags.push('aula-' + i.class_date);
  return tags;
}

// Item + aluno do Banco -> colunas nativas para a RPC approve_review_bank_item. Nunca grava: só monta e valida.
function rbBuildCard(item, student){
  const i = rbNormalizeItem(item);
  const issues = rbItemIssues(i);
  if (issues.length) return { ok: false, error: 'Faltam campos: ' + issues.join(', ') };
  if (student.language_app_key === 'mandarim') return { ok: false, error: 'Cartão de mandarim precisa de pinyin: crie pelo formulário de cartões.' };
  const target = RB_LANG_SHORT[student.language_app_key], ref = student.reference_language || 'pt';
  const mode = rbCardMode(i);
  const st = createNativeNoteEditorState({ cardGenerationMode: mode, languageAppKey: student.language_app_key, origin: 'teacher', tags: rbItemTags(i) });
  st.privateNote = i.explanation || null;
  const add = (value, lang, role) => addFieldToEditorState(st, { content: { value }, lang, role: role || null });
  if (mode === 'type_answer'){
    add(RB_FIX_PROMPT[ref] + ' ' + i.wrong_form + (i.question ? '\n(' + i.question + ')' : ''), ref, 'prompt');
    add(i.answer, target, 'answer');
  } else if (mode === 'cloze'){
    add(rbMakeCloze(i.answer.split(' / ')[0], i.gap_word), target);
    add(i.question, ref);
  } else {
    add(i.question, ref);
    add(i.answer, target);
  }
  const check = validateNoteEditorStateForSave(st);
  if (!check.ok) return { ok: false, error: check.error };
  const cols = nativeContentColumnsFromEditorState(st);
  return { ok: true, mode, front: cols.front, back_trans: cols.back_trans, fields: cols.fields, tags: cols.tags, note: cols.note };
}

// ---------- Agendamento (da professora, para montar o Récap; o FSRS do aluno é outro) ----------
function rbAddDays(dateStr, n){
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
function rbNextSchedule(level, outcome, today){
  const lv = Math.max(0, Math.min(9, Number(level) || 0));
  if (outcome === 'acertou'){ const nl = Math.min(9, lv + 1); return { level: nl, due_date: rbAddDays(today, RB_INTERVALS[nl]) }; }
  if (outcome === 'ajuda') return { level: lv, due_date: rbAddDays(today, RB_INTERVALS[lv]) };
  return { level: 0, due_date: rbAddDays(today, RB_INTERVALS[0]) };
}

// Récap: até `size` itens aprovados vencidos até `lessonDate` (ou nunca revistos). Errados por último resultado primeiro,
// depois os mais atrasados, depois os de nível mais baixo e os mais recentes.
function rbSelectRecap(items, lessonDate, size){
  const n = size || RB_RECAP_SIZE;
  const due = (items || []).filter(i => i.status === 'aprovado' && (!i.due_date || i.due_date <= lessonDate));
  due.sort((a, b) =>
    ((b.last_result === 'errou') - (a.last_result === 'errou')) ||
    String(a.due_date || '0000').localeCompare(String(b.due_date || '0000')) ||
    ((a.level || 0) - (b.level || 0)) ||
    String(b.class_date || '').localeCompare(String(a.class_date || '')));
  return due.slice(0, n);
}

// Texto da pergunta no Modo aula/PDF. `labels` = { say, fix, pronounce } já traduzidos pela tela.
function rbPromptText(item, labels){
  const i = rbNormalizeItem(item), L = labels || {};
  if (i.item_type === 'erro') return { prefix: L.fix || 'Corrija:', text: i.wrong_form, wrong: true, hint: i.question };
  if (i.item_type === 'pronuncia') return { prefix: '', text: i.question, wrong: false, hint: '' };
  return { prefix: L.say || 'Como se diz:', text: i.question, wrong: false, hint: '' };
}

// ---------- Estatísticas ----------
function rbPercent(a, b){ return b ? Math.round(a * 100 / b) : null; }
function rbStatsFromReviews(reviews){
  const list = reviews || [];
  const total = list.length, ok = list.filter(r => r.outcome === 'acertou').length, help = list.filter(r => r.outcome === 'ajuda').length;
  const wrong = list.filter(r => r.outcome === 'errou');
  const days = [...new Set(list.map(r => r.review_date))].sort();
  const count = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const byDay = days.slice(-10).map(d => {
    const rs = list.filter(r => r.review_date === d), a = rs.filter(r => r.outcome === 'acertou').length, h = rs.filter(r => r.outcome === 'ajuda').length;
    return { date: d, pct: rbPercent(a, rs.length) || 0, ok: a, help: h, wrong: rs.length - a - h };
  });
  return { total, days: days.length, okPct: rbPercent(ok, total), helpPct: rbPercent(help, total), wrongPct: rbPercent(wrong.length, total), byDay, byReason: count(wrong, r => r.reason) };
}

// Uma linha da Visão geral por aluno do Banco.
function rbOverviewRow(student, items, reviews, recap, today){
  const lim = rbAddDays(today, -30);
  const r30 = (reviews || []).filter(r => r.review_date >= lim);
  const ok = r30.filter(r => r.outcome === 'acertou').length, wrong = r30.filter(r => r.outcome === 'errou');
  const reasons = {}; wrong.forEach(r => { if (r.reason) reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  const last = student.last_entry_read || '';
  const days = last ? Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(last + 'T12:00:00Z')) / 864e5) : null;
  const lessons = (student.lesson_dates || []).filter(d => d >= today).sort();
  const lastRecapUsed = (reviews || []).filter(r => r.mode === 'recap').map(r => r.review_date).sort().pop() || '';
  return {
    id: student.id, name: student.name, language: student.language_app_key, archived: student.status === 'arquivado', linked: !!student.linked_student_id,
    nextLesson: lessons[0] || '', hasAgenda: (student.lesson_dates || []).length > 0,
    pending: (items || []).filter(i => i.status === 'pendente').length, approved: (items || []).filter(i => i.status === 'aprovado').length,
    lastEntry: last, daysSinceEntry: days, recapGenerated: recap ? recap.class_date : '', recapUsed: lastRecapUsed,
    n30: r30.length, accuracy: rbPercent(ok, r30.length), errors30: wrong.length, topReason: topReason ? topReason[0] : '',
  };
}

// ---------- Markdown mínimo do Manual (tudo escapado; sem HTML cru) ----------
function rbInlineMd(s){
  let h = escapeHTML(s);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return h;
}
function rbMarkdownToHTML(md){
  const lines = String(md || '').replace(/\r/g, '').split('\n'), out = [];
  let i = 0;
  while (i < lines.length){
    const ln = lines[i];
    if (/^```/.test(ln)){ const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push('<pre><code>' + escapeHTML(buf.join('\n')) + '</code></pre>'); continue; }
    const hd = /^(#{1,3})\s+(.*)$/.exec(ln);
    if (hd){ out.push(`<h${hd[1].length + 1}>${rbInlineMd(hd[2])}</h${hd[1].length + 1}>`); i++; continue; }
    if (/^\s*([-*])\s+/.test(ln)){ const buf = []; while (i < lines.length && /^\s*([-*])\s+/.test(lines[i])) buf.push('<li>' + rbInlineMd(lines[i++].replace(/^\s*[-*]\s+/, '')) + '</li>'); out.push('<ul>' + buf.join('') + '</ul>'); continue; }
    if (/^\s*\d+\.\s+/.test(ln)){ const buf = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) buf.push('<li>' + rbInlineMd(lines[i++].replace(/^\s*\d+\.\s+/, '')) + '</li>'); out.push('<ol>' + buf.join('') + '</ol>'); continue; }
    if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])){
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(ln); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push('<div class="rb-md-table"><table><thead><tr>' + head.map(c => '<th>' + rbInlineMd(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + rbInlineMd(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^\s*---+\s*$/.test(ln)){ out.push('<hr>'); i++; continue; }
    if (!ln.trim()){ i++; continue; }
    const buf = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + buf.map(rbInlineMd).join('<br>') + '</p>');
  }
  return out.join('\n');
}
