// Sistema de report de bugs/sugestões (bandeira ⚑). Depende de:
//   - shared/supabase-client.js (supabaseClient)
//   - shared/utils.js (localStorageSafeGet/Set)
//   - shared/toast.js (showToast) -- opcional
//   - shared/analytics.js (ANALYTICS_DEVICE, trackEvent) -- opcional
//   - CURRENT_USER (shared/auth.js), APP_KEY/STATE/STEP_STATE/UNITS/MODULES/
//     currentLessonIdx() (definidos em cada <lang>/app.js) -- este arquivo
//     carrega ANTES desses scripts, então tudo isso só existe quando as
//     funções abaixo são de fato CHAMADAS (após interação do usuário), nunca
//     no momento em que este arquivo é parseado -- por isso todo acesso é
//     protegido com `typeof x !== 'undefined'`.
//
// Ver a auditoria completa na conversa que motivou este arquivo, e os
// comentários em shared/supabase_migrations/020_create_reports_table.sql /
// 021_create_report_screenshots_bucket.sql pro desenho de schema/RLS que
// este arquivo grava.

const REPORT_CATEGORIES = [
  { id: 'bug_tecnico', label: 'Bug / erro técnico', kind: 'problema' },
  { id: 'erro_conteudo', label: 'Erro de conteúdo', kind: 'problema' },
  { id: 'traducao', label: 'Tradução incorreta', kind: 'problema' },
  { id: 'audio', label: 'Áudio / pronúncia incorreta', kind: 'problema' },
  { id: 'visual', label: 'Problema visual', kind: 'problema' },
  { id: 'comportamento_inesperado', label: 'Algo não funciona como deveria', kind: 'problema' },
  { id: 'sugestao_melhoria', label: 'Sugestão de melhoria', kind: 'sugestao' },
  { id: 'outro', label: 'Outro', kind: 'problema' },
];

// Gravidade PERCEBIDA pelo usuário -- nunca a prioridade técnica final (essa
// só a admin define no Painel de Admin, depois de analisar). Opcional: exigir
// isso quebraria o fluxo rápido pedido na auditoria ("clicar → escolher
// categoria → descrever → enviar").
const REPORT_SEVERITIES = [
  { id: 'impede', label: 'Impede continuar' },
  { id: 'dificulta', label: 'Dificulta a atividade' },
  { id: 'pequeno', label: 'Problema pequeno' },
  { id: 'sugestao', label: 'Apenas sugestão' },
];

const REPORT_SCREENSHOT_MAX_BYTES = 8 * 1024 * 1024;

// ---------- Identificador de convidado ----------
// Só pra limitar spam de quem não tem conta (rate-limit best-effort) --
// NUNCA usado como identidade/rastreamento. Diferente de tudo mais no app,
// não existia nenhum id persistente de convidado antes disso.
const REPORT_GUEST_ID_KEY = 'report_guest_id';
function getReportGuestId(){
  let id = localStorageSafeGet(REPORT_GUEST_ID_KEY);
  if (!id){
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `g${Date.now()}${Math.random().toString(16).slice(2)}`;
    localStorageSafeSet(REPORT_GUEST_ID_KEY, id);
  }
  return id;
}

// Proxy de "versão do app": não existe nenhum campo de versão/build no
// projeto (sem package.json versionado, sem manifest version) -- o nome do
// cache do service worker (ex. 'frances-avec-prof-brune-v11') é o que mais
// se aproxima disso, então lê ele uma vez, best-effort, sem bloquear nada se
// falhar.
let REPORT_APP_VERSION = null;
if (window.caches && caches.keys){
  caches.keys().then(keys => { if (keys && keys[0]) REPORT_APP_VERSION = keys[0]; }).catch(() => {});
}

// ---------- Captura automática de contexto ----------
// Tudo que o app JÁ SABE sobre onde o usuário está -- pra nunca pedir de
// volta o que o sistema já tem. Não existe id estável de exercício
// (buildExerciseSet() embaralha em tempo real, sem persistir id), então o
// melhor identificador disponível é formato + posição na sessão + um trecho
// curto do texto da pergunta (reportExerciseTextSnippet).
function reportExerciseTextSnippet(ex){
  try {
    const src = ex.item || ex.phrase || ex;
    const text = src.f || src.claim || src.subject || src.t || null;
    return text ? String(text).slice(0, 140) : null;
  } catch (e) { return null; }
}

function captureReportContext(extra){
  const ctx = {};
  try { ctx.url = window.location.href; } catch (e) {}
  try { ctx.viewport = { width: window.innerWidth, height: window.innerHeight }; } catch (e) {}
  try {
    if (typeof ANALYTICS_DEVICE !== 'undefined' && ANALYTICS_DEVICE){
      ctx.browser = ANALYTICS_DEVICE.browser;
      ctx.os = ANALYTICS_DEVICE.os;
      ctx.device_type = ANALYTICS_DEVICE.deviceType;
    }
  } catch (e) {}
  try {
    if (typeof STATE !== 'undefined' && STATE){
      ctx.level = STATE.currentLevel || null;
      const unitId = STATE.currentUnitId;
      if (unitId != null && typeof UNITS !== 'undefined'){
        const unit = UNITS.find(u => u.id === unitId);
        if (unit){
          ctx.unit_id = unit.id;
          ctx.unit_title = unit.title || null;
          if (typeof MODULES !== 'undefined'){
            const mod = MODULES.find(m => m.unitIds && m.unitIds.includes(unit.id));
            if (mod){ ctx.module_id = mod.id; ctx.module_title = mod.title || null; }
          }
          if (typeof currentLessonIdx === 'function' && unit.lessons){
            const lesson = unit.lessons[currentLessonIdx(unit.id)];
            if (lesson){ ctx.lesson_id = lesson.id; ctx.lesson_title = lesson.title || null; }
          }
        }
      }
    }
  } catch (e) {}
  try {
    if (typeof STEP_STATE !== 'undefined' && STEP_STATE && Array.isArray(STEP_STATE.exerciseList)){
      const ex = STEP_STATE.exerciseList[STEP_STATE.exerciseIndex];
      if (ex){
        ctx.exercise_format = ex.format || null;
        ctx.exercise_position = `${STEP_STATE.exerciseIndex + 1}/${STEP_STATE.exerciseList.length}`;
        const snippet = reportExerciseTextSnippet(ex);
        if (snippet) ctx.exercise_snippet = snippet;
      }
    }
  } catch (e) {}
  if (extra && typeof extra === 'object') Object.assign(ctx, extra);
  return ctx;
}

// ---------- Anti-spam / dedup ----------
// Hash simples (não-criptográfico -- não precisa ser, só precisa detectar
// "é o mesmo report de novo") de categoria+descrição+URL, pra bloquear um
// duplo-clique/duplo-submit no mesmo lugar sem impedir reports genuinamente
// diferentes enviados em sequência.
function reportDedupHash(category, description, url){
  const raw = `${category}|${description.trim()}|${url || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return String(hash);
}

const REPORT_DEDUP_KEY = 'report_last_submit';
const REPORT_DEDUP_COOLDOWN_MS = 30 * 1000;
function reportIsDuplicate(hash){
  try {
    const raw = localStorageSafeGet(REPORT_DEDUP_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.hash === hash && (Date.now() - parsed.at) < REPORT_DEDUP_COOLDOWN_MS;
  } catch (e) { return false; }
}
function reportRememberSubmit(hash){
  localStorageSafeSet(REPORT_DEDUP_KEY, JSON.stringify({ hash, at: Date.now() }));
}

// Limite de reports por janela de tempo. Quem está logada é checada contra o
// banco (reports_owner_read cobre essa leitura); convidado não tem
// auth.uid() pra consultar, então o limite dele é só localStorage -- mais
// fraco (dá pra contornar limpando o storage), risco aceito e já documentado
// na auditoria: o objetivo é frear spam acidental/casual, não um atacante.
const REPORT_GUEST_RATE_KEY = 'report_guest_submits';
const REPORT_RATE_WINDOW_MS = 10 * 60 * 1000;
const REPORT_RATE_MAX_LOGGED = 5;
const REPORT_RATE_MAX_GUEST = 3;

async function reportCheckRateLimit(){
  if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof supabaseClient !== 'undefined'){
    try {
      const since = new Date(Date.now() - REPORT_RATE_WINDOW_MS).toISOString();
      const { count, error } = await supabaseClient
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', CURRENT_USER.id)
        .gte('created_at', since);
      if (error) return { ok: true }; // falha na checagem não deve travar o envio
      if ((count || 0) >= REPORT_RATE_MAX_LOGGED){
        return { ok: false, error: 'Você já enviou vários reports recentemente. Aguarde alguns minutos antes de enviar outro.' };
      }
      return { ok: true };
    } catch (e) { return { ok: true }; }
  }
  try {
    const raw = localStorageSafeGet(REPORT_GUEST_RATE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = list.filter(t => now - t < REPORT_RATE_WINDOW_MS);
    if (recent.length >= REPORT_RATE_MAX_GUEST){
      return { ok: false, error: 'Você já enviou vários reports recentemente. Aguarde alguns minutos ou crie uma conta.' };
    }
    return { ok: true };
  } catch (e) { return { ok: true }; }
}
function reportRecordGuestSubmit(){
  try {
    const raw = localStorageSafeGet(REPORT_GUEST_RATE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = list.filter(t => now - t < REPORT_RATE_WINDOW_MS);
    recent.push(now);
    localStorageSafeSet(REPORT_GUEST_RATE_KEY, JSON.stringify(recent));
  } catch (e) {}
}

// ---------- Upload de screenshot (opcional) ----------
// Adaptado de uploadAvatar() (shared/profile.js), com duas diferenças
// deliberadas: sem recorte quadrado (mantém a proporção original -- é uma
// captura de tela, não uma foto de perfil) e sem upsert/path fixo (cada
// report acumula seu próprio arquivo, nunca sobrescreve o anterior).
function reportScreenshotExt(mime){
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}
function reportScreenshotPath(file){
  const owner = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER.id : getReportGuestId();
  const rand = Math.random().toString(16).slice(2);
  return `${owner}/${Date.now()}-${rand}.${reportScreenshotExt(file.type)}`;
}
async function uploadReportScreenshot(file){
  if (!file.type || !file.type.startsWith('image/')){
    return { ok: false, error: 'O anexo precisa ser uma imagem.' };
  }
  if (file.size > REPORT_SCREENSHOT_MAX_BYTES){
    return { ok: false, error: 'Imagem muito grande (máx. 8MB).' };
  }
  try {
    const path = reportScreenshotPath(file);
    const { error } = await supabaseClient.storage
      .from('report-screenshots')
      .upload(path, file, { contentType: file.type, cacheControl: '3600' });
    if (error) return { ok: false, error: 'Não foi possível enviar a imagem.' };
    const { data } = supabaseClient.storage.from('report-screenshots').getPublicUrl(path);
    return { ok: true, url: data?.publicUrl || null };
  } catch (e) {
    return { ok: false, error: 'Não foi possível enviar a imagem.' };
  }
}

// ---------- Modal ----------
let REPORT_MODAL_CONTEXT = null;
let REPORT_MODAL_SCREENSHOT_FILE = null;
let REPORT_SELECTED_CATEGORY = null;
let REPORT_SELECTED_SEVERITY = null;

function populateReportOptionButtons(){
  const catWrap = document.getElementById('report-category-options');
  if (catWrap && !catWrap.dataset.built){
    catWrap.innerHTML = REPORT_CATEGORIES.map((c, i) =>
      `<button type="button" class="report-option-btn" data-category="${c.id}">${i + 1}. ${c.label}</button>`
    ).join('');
    catWrap.dataset.built = '1';
    catWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.report-option-btn');
      if (!btn) return;
      REPORT_SELECTED_CATEGORY = btn.dataset.category;
      catWrap.querySelectorAll('.report-option-btn').forEach(b => b.classList.toggle('selected', b === btn));
      const errEl = document.getElementById('report-error');
      if (errEl) errEl.textContent = '';
    });
  }
  const sevWrap = document.getElementById('report-severity-options');
  if (sevWrap && !sevWrap.dataset.built){
    sevWrap.innerHTML = REPORT_SEVERITIES.map(s =>
      `<button type="button" class="report-severity-btn" data-severity="${s.id}">${s.label}</button>`
    ).join('');
    sevWrap.dataset.built = '1';
    sevWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.report-severity-btn');
      if (!btn) return;
      const wasSelected = btn.classList.contains('selected');
      sevWrap.querySelectorAll('.report-severity-btn').forEach(b => b.classList.remove('selected'));
      REPORT_SELECTED_SEVERITY = wasSelected ? null : btn.dataset.severity;
      if (!wasSelected) btn.classList.add('selected');
    });
  }
}

function resetReportForm(){
  REPORT_SELECTED_CATEGORY = null;
  REPORT_SELECTED_SEVERITY = null;
  REPORT_MODAL_SCREENSHOT_FILE = null;
  document.getElementById('report-category-options')?.querySelectorAll('.report-option-btn')
    .forEach(b => b.classList.remove('selected'));
  document.getElementById('report-severity-options')?.querySelectorAll('.report-severity-btn')
    .forEach(b => b.classList.remove('selected'));
  const desc = document.getElementById('report-description');
  if (desc) desc.value = '';
  const exp = document.getElementById('report-expected');
  if (exp) exp.value = '';
  // Só convidado vê/preenche este campo -- conta logada já tem e-mail
  // associado via auth.users, perguntar de novo seria redundante (ver
  // openReportModal, que decide a visibilidade a cada abertura).
  const guestEmail = document.getElementById('report-guest-email');
  if (guestEmail) guestEmail.value = '';
  const screenshotInput = document.getElementById('report-screenshot-input');
  if (screenshotInput) screenshotInput.value = '';
  const nameEl = document.getElementById('report-screenshot-name');
  if (nameEl) nameEl.textContent = '';
  const errEl = document.getElementById('report-error');
  if (errEl) errEl.textContent = '';
  const submitBtn = document.getElementById('report-submit-btn');
  if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Enviar'; }
  const formView = document.getElementById('report-form-view');
  const successView = document.getElementById('report-success-view');
  if (formView) formView.style.display = '';
  if (successView) successView.style.display = 'none';
}

// `extraContext` deixa o CHAMADOR marcar de onde o report partiu (ex.
// {source:'exercise'} vs {source:'menu'}) -- o resto do contexto (unidade,
// lição, exercício atual) já é capturado automaticamente por
// captureReportContext() a partir do estado global, sem o chamador precisar
// saber nada sobre isso.
function openReportModal(extraContext){
  const modal = document.getElementById('report-modal');
  if (!modal) return;
  REPORT_MODAL_CONTEXT = captureReportContext(extraContext || null);
  resetReportForm();
  // Campo de e-mail só faz sentido pra convidado -- é a ÚNICA forma da
  // admin conseguir responder um report de quem não tem conta (ver Painel
  // de Admin > Reports, shared/admin-reports.js). Conta logada já tem
  // e-mail associado via auth.users, resolvido sob demanda quando a admin
  // responde -- perguntar de novo aqui seria redundante.
  const isLoggedIn = typeof CURRENT_USER !== 'undefined' && !!CURRENT_USER;
  const guestEmailWrap = document.getElementById('report-guest-email-wrap');
  if (guestEmailWrap) guestEmailWrap.style.display = isLoggedIn ? 'none' : '';
  modal.style.display = 'flex';
}

function closeReportModal(){
  const modal = document.getElementById('report-modal');
  if (modal) modal.style.display = 'none';
}

function wireReportModal(){
  const modal = document.getElementById('report-modal');
  if (!modal) return;
  populateReportOptionButtons();
  document.getElementById('report-modal-close')?.addEventListener('click', closeReportModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeReportModal(); });
  document.getElementById('report-success-close-btn')?.addEventListener('click', closeReportModal);

  const screenshotInput = document.getElementById('report-screenshot-input');
  document.getElementById('report-screenshot-btn')?.addEventListener('click', () => screenshotInput?.click());
  screenshotInput?.addEventListener('change', () => {
    const file = screenshotInput.files[0] || null;
    REPORT_MODAL_SCREENSHOT_FILE = file;
    const nameEl = document.getElementById('report-screenshot-name');
    if (nameEl) nameEl.textContent = file ? file.name : '';
  });

  document.getElementById('report-submit-btn')?.addEventListener('click', submitReport);
}

async function submitReport(){
  const errEl = document.getElementById('report-error');
  const submitBtn = document.getElementById('report-submit-btn');
  if (errEl) errEl.textContent = '';

  if (!REPORT_SELECTED_CATEGORY){
    if (errEl) errEl.textContent = 'Escolha uma categoria.';
    return;
  }
  const descEl = document.getElementById('report-description');
  const description = (descEl?.value || '').trim();
  if (!description){
    if (errEl) errEl.textContent = 'Descreva o que aconteceu.';
    return;
  }

  const categoryDef = REPORT_CATEGORIES.find(c => c.id === REPORT_SELECTED_CATEGORY);
  const hash = reportDedupHash(REPORT_SELECTED_CATEGORY, description, REPORT_MODAL_CONTEXT?.url);
  if (reportIsDuplicate(hash)){
    if (errEl) errEl.textContent = 'Você já enviou isso agora há pouco -- obrigada!';
    return;
  }

  if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }

  const rateCheck = await reportCheckRateLimit();
  if (!rateCheck.ok){
    if (errEl) errEl.textContent = rateCheck.error;
    if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Enviar'; }
    return;
  }

  let screenshotUrl = null;
  if (REPORT_MODAL_SCREENSHOT_FILE){
    const upload = await uploadReportScreenshot(REPORT_MODAL_SCREENSHOT_FILE);
    if (!upload.ok){
      if (errEl) errEl.textContent = upload.error;
      if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Enviar'; }
      return;
    }
    screenshotUrl = upload.url;
  }

  const expEl = document.getElementById('report-expected');
  const isLoggedIn = typeof CURRENT_USER !== 'undefined' && !!CURRENT_USER;
  const guestEmailEl = document.getElementById('report-guest-email');
  const guestEmail = (!isLoggedIn && guestEmailEl?.value || '').trim() || null;
  const row = {
    user_id: isLoggedIn ? CURRENT_USER.id : null,
    guest_id: isLoggedIn ? null : getReportGuestId(),
    // Conta logada: fica null aqui -- resolvido sob demanda pela Edge
    // Function report-reply-send via auth.admin.getUserById() quando a
    // admin responder (ver migration 022). Convidado: só o que a própria
    // pessoa digitou, opcionalmente, pra poder ser contatada de volta.
    reporter_email: isLoggedIn ? null : guestEmail,
    language_app_key: (typeof APP_KEY !== 'undefined') ? APP_KEY : null,
    category: REPORT_SELECTED_CATEGORY,
    kind: categoryDef ? categoryDef.kind : 'problema',
    description,
    expected_behavior: (expEl?.value || '').trim() || null,
    severity_reported: REPORT_SELECTED_SEVERITY,
    screenshot_url: screenshotUrl,
    context: REPORT_MODAL_CONTEXT || {},
    browser: (typeof ANALYTICS_DEVICE !== 'undefined') ? ANALYTICS_DEVICE.browser : null,
    os: (typeof ANALYTICS_DEVICE !== 'undefined') ? ANALYTICS_DEVICE.os : null,
    device_type: (typeof ANALYTICS_DEVICE !== 'undefined') ? ANALYTICS_DEVICE.deviceType : null,
    app_version: REPORT_APP_VERSION,
    dedup_hash: hash,
  };

  try {
    const { error } = await supabaseClient.from('reports').insert([row]);
    if (error) throw error;
  } catch (e) {
    if (errEl) errEl.textContent = 'Não foi possível enviar. Verifique sua conexão e tente de novo.';
    if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Enviar'; }
    return;
  }

  reportRememberSubmit(hash);
  if (!isLoggedIn) reportRecordGuestSubmit();
  if (typeof trackEvent === 'function'){
    try { trackEvent('report_submitted', REPORT_SELECTED_CATEGORY, { kind: row.kind }); } catch (e) {}
  }

  const formView = document.getElementById('report-form-view');
  const successView = document.getElementById('report-success-view');
  if (formView) formView.style.display = 'none';
  if (successView) successView.style.display = '';
  if (typeof showToast === 'function') showToast('✓ Report enviado. Obrigada por ajudar!');
}

wireReportModal();

// Delegado: a bandeira contextual [data-report-flag] fica fixa na barra de
// foco da lição (#report-flag-lesson-btn, ao lado dos outros pills --
// atalhos/fechar), ao invés de reaparecer em cada exercício individual --
// um único listener no document cobre o clique sem precisar re-wire nada.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-report-flag]')) openReportModal({ source: 'exercise' });
});
