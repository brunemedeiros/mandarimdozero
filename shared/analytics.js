// ---------- Métricas de uso (compartilhado entre idiomas) ----------
// Registra eventos de navegação/conclusão em `usage_events` (Supabase,
// migration 007+008) -- só pra você (auth.jwt().email = admin, ver policy
// de leitura da tabela) enxergar o que os alunos mais usam. Nunca trava
// nem mostra erro pro aluno se falhar (offline, RLS etc.) -- mesmo padrão
// best-effort do upsert de weekly_xp em shared/auth.js:saveState().
//
// Depende de shared/supabase-client.js (supabaseClient) e de cada
// languages/<lang>/app.js já ter definido APP_KEY, CURRENT_USER e
// isAdminUser() antes de qualquer chamada real (não no load do script --
// só quando um evento de verdade acontece, o que já é depois do app
// inteiro ter rodado). Depende também de PROFILE_CACHE/ensureProfileLoaded
// (shared/profile.js, carregado antes deste arquivo).
//
// Só grava pra contas de verdade: convidados (CURRENT_USER === false) não
// têm user_id no Supabase pra satisfazer a foreign key/RLS, e ficam de
// fora desta primeira versão -- mesma exclusão que Ranking/badges já
// fazem pra modo convidado.
//
// ---------- Separação aluno/admin (arquitetural, não um filtro visual) ----------
// actor_type é calculado AQUI, no momento da gravação, a partir do e-mail
// autenticado (isAdminUser()) -- nunca confia em nada vindo de fora sobre
// "quem eu digo que sou". Por padrão, atividade de admin nem chega a ser
// gravada (ver checagem de PROFILE_CACHE.exclude_own_activity abaixo,
// default true): é o controle "Excluir minha atividade dos Analytics" no
// Painel de Admin > Analytics (shared/admin-analytics.js). Se essa
// preferência for desligada, o evento AINDA assim é marcado
// actor_type='admin' -- só deixa de ser descartado -- então o dashboard
// (que só lê actor_type='student') continua sem contar essa atividade.
// Um id por carregamento de página -- agrupa os eventos da mesma "visita"
// (ver comentário da migration 008). Gerado uma vez no load do script, não
// por chamada de trackEvent().
const ANALYTICS_SESSION_ID = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ---------- Dispositivo (Fase 4, item 6) ----------
// Heurística simples sobre navigator.userAgent -- sem biblioteca (mesma
// filosofia de zero-dependência do resto do app). Não é infalível (UA
// sniffing nunca é 100%), mas é o padrão aceitável pra "mobile/tablet/
// desktop" + navegador/SO num app sem telemetria de terceiros. Calculado
// uma vez, igual ANALYTICS_SESSION_ID -- não muda durante a sessão.
function analyticsDetectDevice(){
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';

  const isTablet = /iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const isMobile = !isTablet && /Mobi|iPhone|Android/i.test(ua);
  const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');

  let browser = 'outro';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/CriOS\//.test(ua) || (/Chrome\//.test(ua) && !/Chromium/.test(ua))) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari';

  let os = 'outro';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return { deviceType, browser, os };
}
const ANALYTICS_DEVICE = analyticsDetectDevice();

function trackEvent(eventType, eventName, meta){
  // typeof (não "!CURRENT_USER" direto) porque os listeners globais de
  // erro (window.addEventListener('error'/'unhandledrejection'), abaixo)
  // podem disparar ANTES do script que declara CURRENT_USER (shared/
  // auth.js) ter rodado -- ex: um erro de carregamento bem no início da
  // página. Acessar uma variável "let" ainda não declarada lança
  // ReferenceError, não só é falsy; "!CURRENT_USER" sozinho quebraria
  // exatamente no cenário que o tracking de erro técnico deveria cobrir.
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;

  const actorType = (typeof isAdminUser === 'function' && isAdminUser()) ? 'admin' : 'student';
  if (actorType === 'admin'){
    // PROFILE_CACHE só existe depois de ensureProfileLoaded() (chamado no
    // login, ver onUserLoggedIn em shared/auth.js). Se por algum motivo
    // ainda não carregou, assume o padrão (excluir) em vez de arriscar
    // contaminar as métricas de aluno.
    const exclude = PROFILE_CACHE ? PROFILE_CACHE.exclude_own_activity !== false : true;
    if (exclude) return;
  }

  supabaseClient.from('usage_events').insert({
    user_id: CURRENT_USER.id,
    language_app_key: APP_KEY,
    event_type: eventType,
    event_name: eventName,
    actor_type: actorType,
    session_id: ANALYTICS_SESSION_ID,
    device_type: ANALYTICS_DEVICE.deviceType,
    browser: ANALYTICS_DEVICE.browser,
    os: ANALYTICS_DEVICE.os,
    meta: meta || null,
  }).then(({ error }) => {
    if (error) console.error('Erro ao registrar evento de uso:', error);
  });

  maybeTrackPageLoadPerf();
}

// ---------- Technical Analytics (Fase 4, item 7) ----------
// Conceitualmente separado do Learning/Product Analytics acima: mesmo
// pipeline de gravação (mesma tabela, mesma exclusão de admin, mesmo
// actor_type) -- "separado" aqui quer dizer que event_type começa com
// "technical_" e o Painel de Admin nunca mistura essas linhas nas métricas
// de aprendizagem (nota média, taxa de conclusão etc.), só numa aba
// própria ("Tecnologia"). Ver shared/admin-analytics.js.
//
// Dedup por sessão: um erro que se repete (ex: um bug num loop de render)
// não deve virar centenas de inserts -- só a primeira ocorrência de cada
// mensagem por carregamento de página é gravada.
const ANALYTICS_SEEN_ERRORS = new Set();
function trackTechnicalError(eventName, meta){
  const key = eventName + '|' + (meta?.message || '');
  if (ANALYTICS_SEEN_ERRORS.has(key)) return;
  ANALYTICS_SEEN_ERRORS.add(key);
  trackEvent('technical_error', eventName, meta || null);
}

if (typeof window !== 'undefined'){
  window.addEventListener('error', (e) => {
    trackTechnicalError('js_error', { message: String(e.message || '').slice(0, 300), source: e.filename ? String(e.filename).slice(0, 200) : null, line: e.lineno || null });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message = (reason && reason.message) ? reason.message : String(reason);
    trackTechnicalError('unhandled_rejection', { message: String(message).slice(0, 300) });
  });
}

// Performance (Fase 4, item 7): um único evento por sessão com o tempo de
// carregamento da página, usando a Navigation Timing API (não precisa ser
// capturado exatamente no load -- a entrada continua disponível depois).
// Disparado de dentro de trackEvent() (não em window.onload) porque
// CURRENT_USER normalmente só existe depois do login, que acontece bem
// depois do load da página -- capturar antes disso só resultaria no
// guard `if (!CURRENT_USER) return` descartando o evento sempre.
let ANALYTICS_PERF_SENT = false;
function maybeTrackPageLoadPerf(){
  if (ANALYTICS_PERF_SENT) return;
  if (typeof performance === 'undefined') return;
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const loadMs = nav ? Math.round(nav.loadEventEnd - nav.startTime) : null;
  if (!loadMs || loadMs <= 0) return; // página ainda carregando, ou API indisponível -- tenta de novo na próxima chamada
  ANALYTICS_PERF_SENT = true;
  trackEvent('technical_perf', 'page_load', { loadMs });
}
