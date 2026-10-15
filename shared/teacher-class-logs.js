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

function cleanClassLogPayload({ classDate, topic, homework, observations, notes, attendanceLabelId, skills }){
  const out = {
    class_date: classDate || todayStr(),
    topic: (topic || '').trim() || null,
    homework: (homework || '').trim() || null,
    observations: (observations || '').trim() || null,
    notes: (notes || '').trim() || null,
    attendance_label_id: attendanceLabelId ? Number(attendanceLabelId) : null,
    skills: (skills || []).filter(k => CLASS_LOG_SKILLS.includes(k)),
  };
  const empty = !out.topic && !out.homework && !out.observations && !out.notes && !out.attendance_label_id && !out.skills.length;
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
