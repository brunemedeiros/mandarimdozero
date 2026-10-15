// ---------- Histórico de Aula -- Fase 7 do sistema de alunas particulares
// (ver CLAUDE.md) ----------
// Diário de bordo da professora sobre suas próprias aulas com uma aluna
// específica -- diferente de teacher_flashcards/own_flashcards, isto
// NUNCA entra em STATE.cards nem no motor de revisão (FSRS/getStudyQueue).
// Só a professora tem acesso (RLS: auth.uid() = teacher_id, sem policy
// nenhuma pro lado da aluna, ver migration 031) -- por isso, diferente de
// fetchFlashcardsForStudent/fetchFlashcardsForCurrentStudent, só existe
// UMA função de leitura aqui (sempre do lado da professora).
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- antes de
// app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

async function fetchClassLogs(studentId, languageAppKey){
  if (!CURRENT_USER || !studentId) return [];
  const { data, error } = await supabaseClient
    .from('teacher_class_logs')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .eq('student_id', studentId)
    .eq('language_app_key', languageAppKey)
    .order('class_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar histórico de aula:', error); return []; }
  return data || [];
}

// 094 (2026-10-14): Presença (rótulo colorido da professora) e Competências. Uma aula
// pode ser de UM aluno (studentId) ou de uma TURMA (classroomId, sem aluno: todos os
// membros com vínculo ativo veem). Os campos continuam opcionais um a um; basta 1
// preenchido, e Presença ou Competência também contam (ex.: "Faltou" sozinho).
const CLASS_LOG_SKILLS = ['conversacao', 'gramatica', 'escrita', 'leitura', 'vocabulario', 'escuta', 'pronuncia'];
const CLASS_ATTENDANCE_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']; // as cores do Notion, na mesma ordem

// 101: horário (opcional), duração e fuso da professora. Aula futura só com data e horário é
// válida (agendamento); sem horário, a aula vale para o dia inteiro.
function classLogTimeZone(){
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; }
}

function cleanClassLogPayload({ classDate, topic, homework, observations, notes, attendanceLabelId, skills, startTime, durationMinutes }){
  const out = {
    class_date: classDate || todayStr(),
    topic: (topic || '').trim() || null,
    homework: (homework || '').trim() || null,
    observations: (observations || '').trim() || null,
    notes: (notes || '').trim() || null,
    attendance_label_id: attendanceLabelId ? Number(attendanceLabelId) : null,
    skills: (skills || []).filter(k => CLASS_LOG_SKILLS.includes(k)),
  };
  if (startTime !== undefined){
    const tm = /^(\d{2}):(\d{2})/.exec(String(startTime || ''));
    out.start_time = tm ? `${tm[1]}:${tm[2]}` : null;
    const dur = Number(durationMinutes);
    out.duration_minutes = out.start_time && dur >= 5 && dur <= 600 ? Math.round(dur) : null;
    out.time_zone = out.start_time ? classLogTimeZone() : null;
  }
  // Horário já vem preenchido (7h): sozinho ele só vale como agendamento de hoje em diante, nunca para aula passada.
  const future = out.class_date > todayStr();
  const scheduled = !!out.start_time && out.class_date >= todayStr();
  const empty = !out.topic && !out.homework && !out.observations && !out.notes && !out.attendance_label_id && !out.skills.length
    && !scheduled && !future;
  return { out, empty };
}

async function createClassLog({ studentId, classroomId, languageAppKey, ...fields }){
  const { out, empty } = cleanClassLogPayload(fields);
  if (empty) return { ok: false, error: t('teacherLogs.err.needOneField') };
  const { data, error } = await supabaseClient
    .from('teacher_class_logs')
    .insert(Object.assign({
      teacher_id: CURRENT_USER.id,
      student_id: classroomId ? null : studentId,
      classroom_id: classroomId || null,
      language_app_key: languageAppKey,
    }, out))
    .select()
    .single();
  if (error){ console.error('Erro ao criar registro de aula:', error); return { ok: false, error: t('teacherLogs.err.saveFailed') }; }
  return { ok: true, log: data };
}

// Mesma validação da criação; permite editar qualquer campo (data inclusive).
async function updateClassLog(id, fields){
  const { out, empty } = cleanClassLogPayload(fields);
  if (empty) return { ok: false, error: t('teacherLogs.err.needOneField') };
  const { error } = await supabaseClient
    .from('teacher_class_logs')
    .update(Object.assign(out, { updated_at: new Date().toISOString() }))
    .eq('id', id);
  if (error){ console.error('Erro ao editar registro de aula:', error); return { ok: false, error: t('ownFlashcards.err.saveEditFailed') }; }
  return { ok: true };
}

// Todas as aulas da professora num intervalo de datas (calendário: alunos e turmas juntos).
async function fetchTeacherClassLogsRange(fromDate, toDate){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('teacher_class_logs')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .gte('class_date', fromDate)
    .lte('class_date', toDate)
    .order('class_date', { ascending: true });
  if (error){ console.error('Erro ao carregar o calendário de aulas:', error); return []; }
  return (data || []).filter(l => l.class_date >= fromDate && l.class_date <= toDate);
}

// Aulas de uma turma (lado da professora; RLS: teacher_id = ela).
async function fetchClassroomLogs(classroomId){
  if (!CURRENT_USER || !classroomId) return [];
  const { data, error } = await supabaseClient
    .from('teacher_class_logs')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .eq('classroom_id', classroomId)
    .order('class_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar aulas da turma:', error); return []; }
  return data || [];
}

// ---------- Rótulos de Presença (094) ----------
// A primeira chamada cria "Presente" (verde) e "Faltou" (vermelho); a professora
// renomeia, muda a cor, cria outros e arquiva (nunca apaga: aulas antigas mantêm o rótulo).
let CLASS_ATTENDANCE_LABELS = null;
async function fetchAttendanceLabels(force){
  if (CLASS_ATTENDANCE_LABELS && !force) return CLASS_ATTENDANCE_LABELS;
  const { data, error } = await supabaseClient.rpc('ensure_class_attendance_labels');
  if (error){ console.error('Erro ao carregar rótulos de presença:', error); return CLASS_ATTENDANCE_LABELS || []; }
  CLASS_ATTENDANCE_LABELS = Array.isArray(data) ? data : [];
  return CLASS_ATTENDANCE_LABELS;
}

async function saveAttendanceLabel({ id, name, color, countsAs, archived, sortOrder }){
  const clean = (name || '').trim();
  if (!clean) return { ok: false, error: t('panel.classLog.labels.needName') };
  if (!CLASS_ATTENDANCE_COLORS.includes(color)) color = 'gray';
  const row = { name: clean.slice(0, 40), color, counts_as: ['present', 'absent', 'other'].includes(countsAs) ? countsAs : 'other' };
  if (archived != null) row.archived = !!archived;
  const q = id
    ? supabaseClient.from('class_attendance_labels').update(row).eq('id', id)
    : supabaseClient.from('class_attendance_labels').insert(Object.assign({ teacher_id: CURRENT_USER.id, sort_order: sortOrder || 99 }, row));
  const { error } = await q;
  if (error){
    console.error('Erro ao salvar rótulo de presença:', error);
    return { ok: false, error: error.code === '23505' ? t('panel.classLog.labels.duplicate') : t('teacherLogs.err.saveFailed') };
  }
  await fetchAttendanceLabels(true);
  return { ok: true };
}

// DELETE físico de propósito -- diferente de teacher_flashcards/
// own_flashcards (status:'archived', nunca apagado, pra preservar
// progresso de memória FSRS), um registro de aula não tem nenhum estado
// de memória dependente dele (ver comentário na migration 031).
async function deleteClassLog(id){
  const { error } = await supabaseClient.from('teacher_class_logs').delete().eq('id', id);
  if (error){ console.error('Erro ao apagar registro de aula:', error); return { ok: false }; }
  return { ok: true };
}

// ---------- Visual comum (professora e aluno): Presença colorida + Competências ----------
function classLogSkillLabel(key){ return t('panel.classLog.skill.' + key); }
function attendancePillHTML(name, color){
  if (!name) return '';
  const c = CLASS_ATTENDANCE_COLORS.includes(color) ? color : 'gray';
  return `<span class="att-pill" data-color="${c}">${escapeHTML(name)}</span>`;
}
function classLogBadgesHTML({ attendanceName, attendanceColor, skills, classroomName }){
  const parts = [];
  if (classroomName) parts.push(`<span class="skill-chip class-log-classroom">👥 ${escapeHTML(classroomName)}</span>`);
  if (attendanceName) parts.push(attendancePillHTML(attendanceName, attendanceColor));
  (skills || []).filter(k => CLASS_LOG_SKILLS.includes(k)).forEach(k => parts.push(`<span class="skill-chip">${escapeHTML(classLogSkillLabel(k))}</span>`));
  return parts.length ? `<div class="class-log-badges">${parts.join('')}</div>` : '';
}

// ---------- Calendário (101): grade do mês, igual para professora e aluno ----------
// Horário: guardado no fuso de quem registrou (time_zone); mostrado no fuso de quem vê.
function classLogZonedDate(dateStr, timeStr, tz){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '')), h = /^(\d{2}):(\d{2})/.exec(String(timeStr || ''));
  if (!m || !h) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +h[1], +h[2]);
  if (!tz) return new Date(+m[1], +m[2] - 1, +m[3], +h[1], +h[2]);
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(guess)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    return new Date(guess - (asIfUtc - guess));
  } catch (e) { return new Date(+m[1], +m[2] - 1, +m[3], +h[1], +h[2]); }
}
function classLogLocalYMD(d){
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// { date, time } no fuso de quem vê (aula sem horário fica no dia dela, sem hora).
function classLogViewerSlot(log){
  const at = log.start_time ? classLogZonedDate(log.class_date, log.start_time, log.time_zone) : null;
  if (!at) return { date: String(log.class_date), time: '' };
  return { date: classLogLocalYMD(at), time: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`, at };
}

// entries: [{ id, date, time, label, color }] (color = cor do rótulo de Presença ou vazio = agendada).
function classCalendarHTML(year, month, entries, opts){
  const o = opts || {};
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // semana começa no domingo, como no calendário brasileiro
  const days = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const byDay = {};
  entries.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  Object.values(byDay).forEach(list => list.sort((a, b) => (a.time || '99').localeCompare(b.time || '99')));
  const weekdays = [...Array(7)].map((_, i) => fmtDate(new Date(2026, 1, 1 + i), { weekday: 'short' }).replace('.', ''));
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push('<div class="cal-cell is-pad" aria-hidden="true"></div>');
  for (let d = 1; d <= days; d++){
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const list = byDay[key] || [];
    const shown = list.slice(0, 3);
    cells.push(`<button type="button" class="cal-cell${key === today ? ' is-today' : ''}${key === o.selected ? ' is-selected' : ''}${list.length ? ' has-items' : ''}" data-cal-day="${key}" aria-label="${escapeHTML(fmtDate(new Date(year, month, d), { day: 'numeric', month: 'long' }))}${list.length ? ` · ${escapeHTML(tp('panel.classLog.cal.count', list.length))}` : ''}">
      <span class="cal-num">${d}</span>
      ${shown.map(e => `<span class="cal-chip" data-color="${escapeHTML(e.color || '')}">${e.time ? `<b>${escapeHTML(e.time)}</b> ` : ''}${escapeHTML(e.label)}</span>`).join('')}
      ${list.length > 3 ? `<span class="cal-more">+${list.length - 3}</span>` : ''}
    </button>`);
  }
  return `
    <div class="cal" data-cal="${year}-${month}">
      <div class="cal-head">
        <button type="button" class="cal-nav" data-cal-nav="-1" aria-label="${escapeHTML(t('panel.classLog.cal.prev'))}">‹</button>
        <div class="cal-title">${escapeHTML((m => m.charAt(0).toUpperCase() + m.slice(1))(fmtDate(first, { month: 'long', year: 'numeric' })))}</div>
        <button type="button" class="cal-nav" data-cal-nav="1" aria-label="${escapeHTML(t('panel.classLog.cal.next'))}">›</button>
        <button type="button" class="cal-today-btn" data-cal-nav="0">${escapeHTML(t('panel.classLog.cal.today'))}</button>
      </div>
      <div class="cal-grid">
        ${weekdays.map(w => `<div class="cal-wd">${escapeHTML(w)}</div>`).join('')}
        ${cells.join('')}
      </div>
    </div>`;
}
function classCalendarMonthRange(year, month){
  const pad = (n) => String(n).padStart(2, '0');
  // Um dia a mais em cada ponta: o fuso de quem vê pode empurrar a aula para o dia vizinho.
  const from = new Date(year, month, 0), to = new Date(year, month + 1, 1);
  return { from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`, to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}` };
}

// ---------- Link de agenda (103): assinatura ICS no Google Agenda / Apple / Outlook ----------
// 1 link por conta (my_calendar_feed_token); a Edge Function class-calendar-feed devolve o .ics. Professora vê as aulas
// que deu; aluno, as dele e as das turmas. Grátis para quem tem aulas (não há Premium aqui).
function calendarFeedURL(token){
  const en = typeof getUiLang === 'function' && String(getUiLang() || '').toLowerCase().startsWith('en');
  return `${SUPABASE_URL}/functions/v1/class-calendar-feed?t=${encodeURIComponent(token)}${en ? '&lang=en' : ''}`;
}
async function fetchCalendarFeedToken(regenerate){
  const { data, error } = await supabaseClient.rpc('my_calendar_feed_token', { p_regenerate: !!regenerate });
  if (error){ console.error('my_calendar_feed_token falhou:', error.message); return null; }
  return data || null;
}
function calendarFeedBoxHTML(){
  return `<details class="profile-section calendar-feed-box" data-calendar-feed>
    <summary class="section-label">📅 ${t('myClassLogs.feed.title')}</summary>
    <div class="calendar-feed-body" data-calendar-feed-body></div>
  </details>`;
}
function calendarFeedBodyHTML(token){
  if (!token) return `<p class="profile-empty-note">${t('myClassLogs.feed.error')}</p>`;
  const url = calendarFeedURL(token);
  const webcal = url.replace(/^https:/, 'webcal:');
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
  return `<p class="profile-edit-hint">${t('myClassLogs.feed.intro')}</p>
    <div class="calendar-feed-actions">
      <a class="btn btn-primary mural-small-btn" href="${escapeHTML(google)}" target="_blank" rel="noopener" data-calendar-feed-google>${t('myClassLogs.feed.google')}</a>
      <a class="btn tinv-ghost mural-small-btn" href="${escapeHTML(webcal)}" data-calendar-feed-webcal>${t('myClassLogs.feed.apple')}</a>
    </div>
    <label class="profile-edit-label">${t('myClassLogs.feed.linkLabel')}</label>
    <div class="calendar-feed-copy">
      <input type="text" class="profile-edit-input" readonly value="${escapeHTML(url)}" data-calendar-feed-url>
      <button type="button" class="btn btn-secondary mural-small-btn" data-calendar-feed-copy>${t('myClassLogs.feed.copy')}</button>
    </div>
    <p class="profile-edit-hint">${t('myClassLogs.feed.delayHint')}</p>
    <p class="profile-edit-hint">${t('myClassLogs.feed.privacyHint')} <a href="#" class="admin-select-link" data-calendar-feed-reset>${t('myClassLogs.feed.reset')}</a></p>`;
}
function wireCalendarFeedBox(root){
  const box = root && root.querySelector('[data-calendar-feed]');
  if (!box) return;
  const body = box.querySelector('[data-calendar-feed-body]');
  const load = async (regenerate) => {
    body.innerHTML = typeof loadingHTML === 'function' ? loadingHTML() : '…';
    body.innerHTML = calendarFeedBodyHTML(await fetchCalendarFeedToken(regenerate));
    box.dataset.loaded = '1';
  };
  box.addEventListener('toggle', () => { if (box.open && !box.dataset.loaded) load(false); });
  body.addEventListener('click', async (e) => {
    if (e.target.closest('[data-calendar-feed-copy]')){
      const input = body.querySelector('[data-calendar-feed-url]');
      try { await navigator.clipboard.writeText(input.value); showToast(t('myClassLogs.feed.copied')); }
      catch { input.select(); }
    } else if (e.target.closest('[data-calendar-feed-reset]')){
      e.preventDefault();
      if (!confirm(t('myClassLogs.feed.resetConfirm'))) return;
      await load(true);
      showToast(t('myClassLogs.feed.resetDone'));
    }
  });
}
