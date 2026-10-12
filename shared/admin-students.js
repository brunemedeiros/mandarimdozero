// ---------- Alunos (painel da professora) ----------
// Tela da aba "Alunos" no Design System do painel (shared/painel/, classes p-*): quadro geral da turma
// (indicadores, alerta, busca, tabela com situação) e ficha de cada aluno em página própria.
// As peças de HTML ficam em shared/teacher-students-ui.js (dado -> string, testadas em Node); este arquivo
// busca os dados, liga os eventos e abre os diálogos. Vincular aluno (criar vínculo direto) é só da admin;
// remover vínculo nunca apaga progresso. Desenho aprovado: docs/fase-2-professora/desenho.html.
//
// Depende de (antes de app.js, depois de shared/teacher-students-ui.js):
//   - shared/roles.js            (fetchMyStudents, assignStudentToTeacher, removeStudentLink)
//   - shared/admin-badges.js     (fetchAllProfiles -- reaproveitado)
//   - shared/student-metrics.js  (fetchTeacherStudentOverview, fetchTeacherStudentMetrics)
//   - shared/teacher-class-logs.js (fetchClassLogs), shared/teacher-panel.js (switchTeacherPanelSection)
//   - shared/painel/painel-ui.js (PainelUI.confirmar), shared/toast.js (showToast)
//   - languages/<lang>/app.js    (isAdminUser)

// Cache de sessão por vínculo: { overview, metrics }. Evita refazer as RPCs ao voltar para o quadro geral ou
// ao reabrir uma ficha. "Atualizar dados" e remover vínculo limpam. Só guarda respostas que deram certo.
const STUDENT_METRICS_CACHE = {};

// 'portugues' de propósito NÃO está em AVAILABLE_LANGUAGES (languages/
// index.js) -- decisão explícita (CLAUDE.md): só o schema já aceita o
// valor, sem nenhuma mudança visual no site até o curso existir de
// verdade. Esta tela de admin é código NOVO, então pode listar o idioma
// como opção de atribuição sem violar essa decisão -- é justamente o
// "anexar a possibilidade" que a autora pediu.
const STUDENT_LANGUAGE_LABELS = {
  get frances(){ return t('fieldEditor.lang.fr'); },
  get mandarim(){ return t('admin.students.lang.mandarim'); },
  get portugues(){ return t('admin.students.lang.portugues'); },
};

// CONSOLIDAÇÃO i18n (Fase 6, Admin A) -- helpers de texto compartilhados
// pelas telas de admin (flashcards/aulas/material). Funções (nunca
// constantes de módulo) pra t()/tp() ser avaliado no idioma ATUAL.
function adminSelectionCountLabel(n){
  return n === 0 ? t('admin.common.noneSelected') : tp('admin.common.selectedCount', n);
}
function adminForStudentsSuffix(n){
  return n > 1 ? t('admin.common.forNStudents', { n }) : '';
}
function adminEmptyForSuffix(n){
  return n > 1 ? t('admin.common.forTheseStudents') : n === 1 ? t('admin.common.forThisStudent') : t('admin.common.forNoStudent');
}

// Grillado explicitamente com a autora (ver CLAUDE.md, "rótulo do
// seletor de direção do cartão") -- pareamento idioma estudado/idioma
// nativo usado só pelo texto do radio "Idioma de cada lado" (shared/
// admin-flashcards.js + shared/my-flashcards.js). `mandarim`
// deliberadamente FORA deste mapa -- o seletor de direção já não se
// aplica a ele (par hanzi/pinyin inseparável, sem "back_pinyin" pra
// completar a inversão), então nunca precisa de um rótulo. `portugues`
// pareado com "inglês" foi uma decisão EXPLÍCITA da autora no grilling
// (não uma suposição minha) mesmo sem existir site/interface de
// português ainda -- se isso mudar quando o site de português for
// construído de verdade, é só atualizar esta entrada.
const FLASHCARD_DIRECTION_LANGUAGE_LABELS = {
  frances: { target: 'francês', native: 'português' },
  portugues: { target: 'português', native: 'inglês' },
};

const STUDENT_VIEW = {
  links: [],                       // vínculos ativos da professora (fetchMyStudents)
  rows: [],                        // linhas do quadro geral
  filtros: { busca: '', curso: '', soAtencao: false },
  linkId: null, fichaLang: null,   // ficha aberta
  token: 0,                        // descarta resposta atrasada de uma tela que já saiu de cena
  ligado: false,                   // eventos delegados ligados uma vez só
};

function studentViewWrap(){ return document.getElementById('admin-students-content'); }

// 'portugues' de propósito NÃO está em AVAILABLE_LANGUAGES (languages/index.js) -- só o schema aceita o valor; esta tela
// pode listá-lo como opção de vínculo porque é a "possibilidade" que a autora pediu, sem site de português ainda.
function studentLinkAccountsHTML(profiles, links){
  const linkedByLang = {};
  links.forEach(s => { if (s.username){ (linkedByLang[s.language_app_key] = linkedByLang[s.language_app_key] || new Set()).add(s.username); } });
  const optionsFor = (lang) => {
    const linked = linkedByLang[lang] || new Set();
    return profiles.filter(p => !linked.has(p.username))
      .map(p => `<option value="${escapeHTML(p.username)}">@${escapeHTML(p.username)}${p.display_name ? ` — ${escapeHTML(p.display_name)}` : ''}</option>`).join('');
  };
  const languages = Object.entries(STUDENT_LANGUAGE_LABELS).map(([key, label]) => `<option value="${key}">${escapeHTML(label)}</option>`).join('');
  return { optionsFor, options: optionsFor(Object.keys(STUDENT_LANGUAGE_LABELS)[0]), languages };
}

// Consultas em andamento por vínculo: duas renderizações seguidas (abrir a aba + trocar de seção) não repetem a RPC.
const STUDENT_OVERVIEW_INFLIGHT = {};
function studentFetchOverview(l){
  const c = STUDENT_METRICS_CACHE[l.id];
  if (c && c.overview) return Promise.resolve(c.overview);
  if (!STUDENT_OVERVIEW_INFLIGHT[l.id]){
    STUDENT_OVERVIEW_INFLIGHT[l.id] = fetchTeacherStudentOverview(l.student_id, l.language_app_key).then(ov => {
      delete STUDENT_OVERVIEW_INFLIGHT[l.id];
      if (ov && Array.isArray(ov.languages)){ STUDENT_METRICS_CACHE[l.id] = Object.assign(STUDENT_METRICS_CACHE[l.id] || {}, { overview: ov }); return ov; }
      return null;
    });
  }
  return STUDENT_OVERVIEW_INFLIGHT[l.id];
}

// Busca o overview de cada aluno com no máximo 5 consultas ao mesmo tempo; usa o cache da sessão.
async function studentLoadRows(links, onProgress){
  const out = new Array(links.length); let done = 0; const fila = links.map((_, i) => i);
  const worker = async () => {
    while (fila.length){
      const i = fila.shift(), l = links[i];
      out[i] = tsuRowData(l, await studentFetchOverview(l));
      done++; if (onProgress) onProgress(done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, links.length) }, worker));
  return out;
}

async function renderAdminStudentsView(){
  const wrap = studentViewWrap();
  if (!wrap) return;
  if (!isTeacherUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  studentViewBind(wrap);
  const token = ++STUDENT_VIEW.token;
  STUDENT_VIEW.linkId = null;
  const canLink = typeof isAdminUser === 'function' && isAdminUser();
  wrap.innerHTML = tsuLoadingHTML(0, 0);
  const [links, profiles] = await Promise.all([fetchMyStudents(), canLink ? fetchAllProfiles() : Promise.resolve([])]);
  if (token !== STUDENT_VIEW.token) return;
  STUDENT_VIEW.links = links;
  if (links.length){
    wrap.innerHTML = tsuLoadingHTML(0, links.length);
    STUDENT_VIEW.rows = await studentLoadRows(links, (n) => {
      const el = wrap.querySelector('[data-tsu-progresso]');
      if (el && token === STUDENT_VIEW.token) el.textContent = t('students.loading.count', { done: n, total: links.length });
    });
    if (token !== STUDENT_VIEW.token) return;
  } else {
    STUDENT_VIEW.rows = [];
  }
  const accounts = canLink ? studentLinkAccountsHTML(profiles, links) : null;
  STUDENT_VIEW.accounts = accounts;
  wrap.innerHTML = tsuGeralHTML(STUDENT_VIEW.rows, STUDENT_VIEW.filtros, canLink, accounts);
}

function studentRefreshTable(){
  const wrap = studentViewWrap(), box = wrap && wrap.querySelector('[data-tabela-alunos]');
  if (!box) return;
  box.innerHTML = tsuTableHTML(tsuFilterRows(STUDENT_VIEW.rows, STUDENT_VIEW.filtros), STUDENT_VIEW.filtros);
}

async function openStudentFicha(linkId){
  const wrap = studentViewWrap();
  const link = STUDENT_VIEW.links.find(l => String(l.id) === String(linkId));
  if (!wrap || !link) return;
  const token = ++STUDENT_VIEW.token;
  STUDENT_VIEW.linkId = link.id; STUDENT_VIEW.fichaLang = null;
  const c = STUDENT_METRICS_CACHE[link.id] = STUDENT_METRICS_CACHE[link.id] || {};
  if (!c.overview){
    wrap.innerHTML = tsuLoadingHTML(0, 1);
    await studentFetchOverview(link);
    if (token !== STUDENT_VIEW.token) return;
  }
  studentRenderFicha();
  const h = wrap.querySelector('[data-tsu="ficha"] h2'); if (h){ h.tabIndex = -1; h.focus({ preventScroll: true }); }
  const top = wrap.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: Math.max(0, top) });
  // Cartões criados e aulas chegam depois, sem refazer a página inteira.
  const fill = (sel, html) => { const w = studentViewWrap(), el = w && w.querySelector(sel); if (el && token === STUDENT_VIEW.token) el.innerHTML = html; };
  const name = tsuName(link);
  if (c.metrics === undefined){
    const m = await fetchTeacherStudentMetrics(link.student_id, link.language_app_key);
    c.metrics = m || null;
    fill('[data-bloco-criados]', `<header><h3>${escapeHTML(t('students.block.created'))}</h3></header>${tsuCreatedHTML(c.metrics, name)}`);
  }
  if (c.logs === undefined){
    const logs = await fetchClassLogs(link.student_id, link.language_app_key);
    c.logs = logs || [];
    fill('[data-bloco-aulas]', `<header><h3>${escapeHTML(t('students.block.classes'))}</h3></header>${tsuClassesHTML(c.logs)}`);
  }
}

function studentRenderFicha(){
  const wrap = studentViewWrap();
  const link = STUDENT_VIEW.links.find(l => String(l.id) === String(STUDENT_VIEW.linkId));
  if (!wrap || !link) return;
  const c = STUDENT_METRICS_CACHE[link.id] || {};
  wrap.innerHTML = tsuFichaHTML({ link, overview: c.overview || null, metrics: c.metrics, logs: c.logs, langKey: STUDENT_VIEW.fichaLang }, true);
}

async function removeStudentFromFicha(linkId){
  const link = STUDENT_VIEW.links.find(l => String(l.id) === String(linkId));
  if (!link) return;
  const opts = { titulo: t('students.remove.title', { name: tsuName(link) }), descricao: t('students.remove.text'), confirmar: t('students.remove.confirm'), cancelar: t('students.dialog.cancel'), perigo: true };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(opts.descricao);
  if (!ok) return;
  await removeStudentLink(link.id);
  delete STUDENT_METRICS_CACHE[link.id];
  showToast(t('students.removed'));
  renderAdminStudentsView();
}

// Eventos delegados no contêiner da aba: ligados uma única vez, valem para toda renderização.
function studentViewBind(wrap){
  if (STUDENT_VIEW.ligado) return;
  STUDENT_VIEW.ligado = true;
  wrap.addEventListener('click', (e) => {
    const q = (sel) => e.target.closest(sel);
    let el;
    if ((el = q('[data-abrir-aluno]'))) return openStudentFicha(el.dataset.abrirAluno);
    if (q('[data-voltar-alunos]')){ e.preventDefault(); return renderAdminStudentsView(); }
    if ((el = q('[data-ir-secao]'))){ e.preventDefault(); return switchTeacherPanelSection(el.dataset.irSecao); }
    if ((el = q('[data-remover-vinculo]'))) return removeStudentFromFicha(el.dataset.removerVinculo);
    if ((el = q('[data-ficha-idioma]'))){ STUDENT_VIEW.fichaLang = el.dataset.fichaIdioma; return studentRenderFicha(); }
    if (q('[data-atualizar-alunos]')){ Object.keys(STUDENT_METRICS_CACHE).forEach(k => delete STUDENT_METRICS_CACHE[k]); return renderAdminStudentsView(); }
    if (q('[data-ver-parados]')){
      STUDENT_VIEW.filtros.soAtencao = true;
      const sw = wrap.querySelector('[data-so-atencao]'); if (sw) sw.checked = true;
      studentRefreshTable(); const tb = wrap.querySelector('[data-tabela-alunos]'); if (tb) tb.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  // Filtros mexem só na tabela (nunca refazem o campo em que a pessoa está digitando).
  wrap.addEventListener('input', (e) => {
    if (e.target.matches('[data-busca-aluno]')){ STUDENT_VIEW.filtros.busca = e.target.value; studentRefreshTable(); }
  });
  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-filtro-curso]')){ STUDENT_VIEW.filtros.curso = e.target.value; studentRefreshTable(); }
    else if (e.target.matches('[data-so-atencao]')){ STUDENT_VIEW.filtros.soAtencao = e.target.checked; studentRefreshTable(); }
    else if (e.target.id === 'admin-student-language' && STUDENT_VIEW.accounts){
      // A mesma conta pode ser vinculada de novo para outro idioma: a lista de contas depende do idioma escolhido.
      document.getElementById('admin-student-username').innerHTML = `<option value="" disabled selected>${t('admin.students.selectAccount')}</option>${STUDENT_VIEW.accounts.optionsFor(e.target.value)}`;
    }
  });
  wrap.addEventListener('submit', async (e) => {
    if (e.target.id !== 'admin-assign-student-form') return;
    e.preventDefault();
    const btn = document.getElementById('admin-assign-student-btn'), errorEl = document.getElementById('admin-assign-student-error');
    errorEl.textContent = ''; btn.disabled = true;
    const result = await assignStudentToTeacher(document.getElementById('admin-student-username').value, document.getElementById('admin-student-language').value);
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast(t('admin.students.linkedToast', { username: result.target.username }));
    const dlg = document.getElementById('dlg-vincular-aluno'); if (dlg && dlg.open) dlg.close();
    renderAdminStudentsView();
  });
}

// ---------- Helpers puros da ficha (070): rótulos de eventos, títulos de unidade e módulo ----------
// Tudo aqui é string -> string (sem DOM, sem rede), usado por shared/teacher-students-ui.js e testado em
// tests/painel-alunos/test_students_ui_unit.js. Todo texto vindo do banco passa por escapeHTML (shared/profile.js).

// Rótulo do histórico de acertos antes de existir dado: o evento
// 'review_answer' só começa a ser gravado quando esta versão for publicada.
// Data ESTIMADA de publicação -- ajustar se o deploy acontecer em outro dia.
const ANSWER_HISTORY_START_LABEL = '05/10/2026';

// Rótulos da linha do tempo: nomes das abas do app e das atividades (chaves students.ev.*).
const STUDENT_PANEL_TAB_NAMES = ['path', 'review', 'profile', 'challenges', 'conjugaison', 'leaderboard', 'progress', 'dictation', 'my-flashcards', 'settings', 'goals', 'support-materials', 'admin-badges', 'hanzi'];
const STUDENT_PANEL_ACTIVITY_NAMES = ['vocab_lesson', 'unit_checkpoint', 'flashcard_review', 'match_game', 'speed_review', 'dictation', 'conjugation_session', 'challenge', 'hanzi_lesson', 'hanzi_review'];
function studentPanelTabLabel(name){ return STUDENT_PANEL_TAB_NAMES.includes(name) ? t('students.ev.tab.' + name) : name; }
function studentPanelActivityLabel(name){ return STUDENT_PANEL_ACTIVITY_NAMES.includes(name) ? t('students.ev.act.' + name) : name; }

function studentPanelEsc(v){
  return escapeHTML(v == null ? '' : String(v));
}
function studentPanelNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Lista das últimas N datas locais ('YYYY-MM-DD'), da mais antiga pra hoje.
function studentPanelLastDays(n){
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dateStrDaysAgo(i));
  return out;
}

// Título de unidade/módulo do SITE ATUAL (UNITS/MODULES de content.js), só
// quando o idioma do progresso é o mesmo do site aberto; senão mostra o id.
function studentPanelUnitTitle(langKey, unitId){
  const sameSite = typeof APP_KEY !== 'undefined' && APP_KEY === langKey;
  if (sameSite && typeof UNITS !== 'undefined' && Array.isArray(UNITS)){
    const u = UNITS.find(x => String(x.id) === String(unitId));
    if (u && u.title) return `${studentPanelEsc(u.id)} · ${studentPanelEsc(u.title)}`;
  }
  return studentPanelEsc(unitId);
}
function studentPanelModuleTitle(langKey, moduleId){
  const sameSite = typeof APP_KEY !== 'undefined' && APP_KEY === langKey;
  if (sameSite && typeof MODULES !== 'undefined' && Array.isArray(MODULES)){
    const m = MODULES.find(x => String(x.id) === String(moduleId));
    if (m && m.title) return `${studentPanelEsc(m.title)}`;
  }
  return studentPanelEsc(moduleId);
}

function studentPanelLangLabel(key){
  return STUDENT_LANGUAGE_LABELS[key] ? STUDENT_LANGUAGE_LABELS[key].replace(' (em breve)', '') : studentPanelEsc(key);
}

// Texto humano de um evento da linha do tempo (HTML seguro: tudo que vem do banco passa por escapeHTML).
function studentPanelEventLabel(ev){
  const meta = ev && ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
  const name = ev ? ev.name : '';
  if (ev && ev.type === 'tab_switch') return t('students.ev.openedTab', { tab: studentPanelEsc(studentPanelTabLabel(name)) });
  if (ev && ev.type === 'report_submitted') return t('students.ev.report');
  const what = studentPanelEsc(studentPanelActivityLabel(name));
  const unit = meta.unitId != null ? ` (${studentPanelUnitTitle(ev.lang, meta.unitId)})` : '';
  if (ev && ev.type === 'lesson_start') return t('students.ev.started', { what, unit });
  if (ev && ev.type === 'lesson_complete'){
    let score = '';
    if (meta.scorePct != null) score = t('students.ev.score.pct', { n: studentPanelNum(meta.scorePct) });
    else if (meta.pct != null) score = t('students.ev.score.pct', { n: studentPanelNum(meta.pct) });
    else if (meta.score != null && name === 'dictation') score = t('students.ev.score.dictation', { n: studentPanelNum(meta.score) });
    else if (meta.count != null) score = t('students.ev.score.cards', { n: studentPanelNum(meta.count) });
    return t('students.ev.completed', { what, unit, score });
  }
  return `${studentPanelEsc(ev && ev.type)} · ${studentPanelEsc(name)}`;
}

function studentPanelEventTime(at){
  const d = new Date(at);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function studentPanelPct(correct, total){
  const t = studentPanelNum(total);
  return t > 0 ? Math.round(studentPanelNum(correct) * 100 / t) : null;
}
