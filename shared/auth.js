// ---------- Autenticação e persistência (compartilhado entre idiomas) ----------
// Depende de shared/supabase-client.js (supabaseClient, cleanRedirectURL) e
// shared/toast.js (showToast), carregados antes deste arquivo.
//
// Cada languages/<lang>/app.js precisa definir, antes de initAuth() ser
// chamado no fim do arquivo:
//   - APP_KEY               (string -- namespace deste idioma na tabela progress)
//   - serializeState()      (monta o objeto a salvar, formato específico do idioma)
//   - applySerializedState(data)  (aplica de volta no STATE do idioma)
//   - loadStateAndRender()  (carrega o estado e desenha a tela inicial do idioma)
// Só são efetivamente chamados depois que o app.js inteiro já rodou (login,
// clique em convidado etc.), então a ordem de carregamento dos <script> não
// importa aqui -- funciona por hoisting normal de function declaration.

let CURRENT_USER = null;
// Sessão atual: null enquanto não resolvido, false = "sem conta" (modo
// convidado), objeto = usuário logado.

// Bug real de perda de dados (relatado pela autora, 2026-09-15 -- print de
// "meu progresso de francês foi resetado e zerado"): confirmado no banco
// real que aconteceu de verdade (weekly_xp mostrava 867 XP numa semana
// anterior, progress.data.frances zerado por completo -- xp:0,
// totalReviews:0, nenhum cartão com reps>0). Causa raiz: onUserLoggedIn()
// marca CURRENT_USER e deixa a tela interativa ANTES de loadStateAndRender()
// terminar de buscar o progresso real do servidor (await só vem depois);
// se QUALQUER coisa disparar saveState() nesse intervalo -- ou se o fetch
// dentro de loadState() falhar/atrasar de forma transitória e alguém
// simplesmente continuar jogando -- serializeState() lê o STATE ainda nos
// valores de fábrica (tudo zerado) e escreve isso por cima do progresso
// real no Supabase. progressLoadedOk vira o cadeado: nasce false a cada
// login, só vira true depois que loadState() confirma ter LIDO com sucesso
// o que já existia lá -- saveState() se recusa a gravar antes disso, custe
// o que custar (um save adiado é infinitamente mais barato que um
// progresso apagado).
let progressLoadedOk = false;

// Segunda camada de proteção (grilling pós-incidente, 2026-09-16): o guard
// acima fecha a causa raiz específica encontrada, mas não cobre QUALQUER
// outro motivo que faça uma sessão local gravar um progresso menor do que
// o que já está salvo -- inclusive a corrida entre duas abas/dispositivos
// da MESMA conta abertos ao mesmo tempo (saveState() faz um read-merge-
// -write que não é atômico; ver PR #224 e a discussão que motivou este
// bloco). Campos vitalícios (nunca diminuem numa sessão legítima -- não
// existe hoje nenhuma feature, de aluna ou de admin, que reduza XP,
// revisões ou reproduções de áudio de propósito) funcionam como um
// invariante barato de checar bem no momento do save, contra a leitura
// MAIS FRESCA possível do servidor (a mesma que já é buscada logo abaixo
// pra fazer o merge por idioma) -- reduz a janela da corrida ao tempo
// entre essa leitura e o upsert, em vez do tempo desde o carregamento da
// página inteira.
const MONOTONIC_PROGRESS_FIELDS = ['xp', 'totalReviews', 'totalAudioPlays'];

// Chave do bloco deste curso dentro de progress.data (E3/C1, ver shared/course-storage.js). Com os cursos por idioma do
// site desligados é sempre APP_KEY ('frances', 'mandarim'), igual a antes. `progressData` = a linha lida do servidor.
// C5: com os cursos por idioma do site ligados, o curso desta página é FIXADO no primeiro carregamento (idioma do site da conta, ou o da
// URL ?ui=) e nunca muda enquanto a página viver: trocar de curso recarrega a página. Assim uma aba antiga não grava o progresso de um
// curso na chave de outro quando a conta muda de idioma em outra aba.
let pageCourseSiteLang = null;
function pageSiteLanguage(progressData){
  if (!pageCourseSiteLang){
    const live = typeof getUiLang === 'function' ? getUiLang() : 'pt-BR';
    const acct = (typeof uiLanguageFromProgressData === 'function') ? uiLanguageFromProgressData(progressData) : null;
    pageCourseSiteLang = (!accountUiLangFromQuery() && acct) ? acct : live;
  }
  return pageCourseSiteLang;
}
function progressBlockKey(progressData){
  if (CourseStorage.isPerSiteLanguage()) return CourseStorage.courseStorageKeyFor(APP_KEY, pageSiteLanguage(progressData), progressData);
  return CourseStorage.courseStorageKeyFor(APP_KEY, typeof getUiLang === 'function' ? getUiLang() : 'pt-BR', progressData);
}

// E3/C2: o que o bloco deste idioma tinha ao carregar (só dias estudados neste idioma) x a união da conta; ver saveState.
let progressAccountBase = null;

const GUEST_MODE_FLAG = 'guest_mode';
// (antes cada site tinha sua própria chave -- 'frances_zero_guest_mode' /
// 'mandarim_guest_mode'; sessionStorage é por aba E por origem, então
// unificar agora não perde nada, mesma lógica do app_theme em shared/theme.js.)

async function initAuth(){
  const { data: { session } } = await supabaseClient.auth.getSession();

  // Limpa o fragmento de TOKEN do OAuth da URL depois que o Supabase já
  // teve a chance de processá-lo (getSession acima) — evita que ele
  // contamine um redirectTo futuro se o usuário tentar entrar de novo.
  // Restrito ao formato real desse fragmento (#access_token=.../#error=...)
  // -- não QUALQUER hash: shared/router.js (rotas internas de navegação,
  // ver tarefa "Voltar/Avançar do navegador") também usa # pra telas como
  // #/unit/3, que precisa sobreviver até applyInitialRoute() conseguir
  // restaurar a tela certa depois do login/modo convidado resolver.
  if (/^#(access_token|error)=/.test(window.location.hash)){
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (session && session.user){
    await onUserLoggedIn(session.user);
  } else if (sessionStorageSafeGet(GUEST_MODE_FLAG) === '1'){
    enterGuestMode();
  } else {
    // Fase 1 do perfil público (ver CLAUDE.md) -- primeira vez que uma tela
    // deste app precisa funcionar pra um visitante SEM sessão e SEM modo
    // convidado: alguém que recebeu um link de perfil (#/user/username)
    // compartilhado por outra pessoa, sem conta aqui ainda. Sem este
    // desvio, goToNeutralGate() redirecionaria pro portão antes que
    // qualquer coisa renderizasse -- o link nunca mostraria o perfil.
    // Só cobre ESTE formato de hash específico -- qualquer outra rota
    // interna (#/unit/3 etc.) continua exigindo login/convidado como
    // sempre, comportamento inalterado.
    const publicProfileUsername = (typeof publicProfileUsernameFromHash === 'function')
      ? publicProfileUsernameFromHash()
      : null;
    // Public Deck (#/deck/<public_id>) também abre sem sessão: metadado público.
    const publicDeckId = (typeof publicDeckIdFromHash === 'function') ? publicDeckIdFromHash() : null;
    if (publicDeckId && typeof renderStandalonePublicDeck === 'function'){
      await renderStandalonePublicDeck(publicDeckId);
    } else if (publicProfileUsername && typeof renderStandalonePublicProfile === 'function'){
      await renderStandalonePublicProfile(publicProfileUsername);
    } else if (typeof teacherInviteGateIfPending === 'function' && await teacherInviteGateIfPending()){
      // Link de convite da professora (?convite=): o cartão aparece antes do login (077).
    } else if (typeof muralClassroomGateIfPending === 'function' && await muralClassroomGateIfPending()){
      // Link da turma (?turma=): o cartão aparece antes do login (087).
    } else {
      goToNeutralGate();
    }
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user){
      await onUserLoggedIn(session.user);
    } else if (event === 'SIGNED_OUT'){
      CURRENT_USER = null;
      if (typeof clearMyPermissions === 'function') clearMyPermissions();
      pendingAccountUiLanguage = null;
      progressAccountUiLanguage = null;
      goToNeutralGate();
    }
  });
}

// Sem sessão nem modo convidado ativo: este app (fr/zh) não tem sua própria
// tela de login -- a única tela de login da plataforma é o portão neutro na
// raiz (index.html), sem marca de idioma. #login-screen aqui é só um overlay
// de "carregando/redirecionando" (ver markup), nunca um formulário de verdade.
function goToNeutralGate(){
  // replace() (não href=) -- mesmo raciocínio de goToLanguageApp() em
  // index.html: esta tela nunca tem nada útil pra mostrar por si só (é só
  // "sem sessão, redirecionando pro portão"), então não deveria ficar
  // empilhada no histórico pra criar um loop de Voltar com o portão.
  window.location.replace('../');
}

// ---------- Oferta do Teste de Nível na primeira entrada ----------
// Portão (index.html da raiz) manda ?level_test_offer=1 na URL quando a
// pessoa respondeu "já sei o básico" na pergunta de primeira entrada (ver
// askExperienceThenProceed lá). Mesmo padrão de "capturar da URL, só aplicar
// depois que o carregamento normal terminar" que PENDING_NOTIFICATION_TAB já
// usa em shared/push.js, pelo mesmo motivo -- sobreviver a um reload de
// service worker antes de conseguir aplicar.
let PENDING_LEVEL_TEST_OFFER = new URLSearchParams(window.location.search).get('level_test_offer') === '1';

function applyPendingLevelTestOffer(){
  if (!PENDING_LEVEL_TEST_OFFER) return;
  PENDING_LEVEL_TEST_OFFER = false;
  // Preserva o hash (ver shared/router.js) -- só o ?level_test_offer=1 some.
  window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  // Idioma sem Teste de Nível ainda (Mandarim, só HSK1 por enquanto): não
  // tem o que oferecer -- ignora silenciosamente (ver hasLevelTest em
  // languages/index.js, é o que impede o portão de nem oferecer essa opção
  // pra esse idioma).
  if (typeof LEVEL_TESTS === 'undefined' || !LEVEL_TESTS.length) return;
  if (typeof switchTab === 'function') switchTab('path');
  const test = LEVEL_TESTS[0];
  // Espera o próximo frame -- a troca de aba acima acabou de rerenderizar a
  // Trilha, o card do teste só existe no DOM depois disso.
  requestAnimationFrame(() => {
    const card = document.querySelector('.level-test-card');
    if (card){
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('level-test-highlight');
      setTimeout(() => card.classList.remove('level-test-highlight'), 3000);
    }
    if (typeof showToast === 'function' && test){
      showToast(t('auth.levelTestHint', { title: test.title }));
    }
  });
}

function enterGuestMode(){
  sessionStorageSafeSet(GUEST_MODE_FLAG, '1');
  CURRENT_USER = false;
  document.getElementById('login-screen').style.display = 'none';
  // removeProperty (não = 'block'): um valor inline sempre vence a cascata,
  // e a partir de 900px o #app precisa virar display:grid (shell com
  // sidebar/cards, Fase 3) -- setar 'block' aqui travaria isso pra sempre,
  // em qualquer largura de tela.
  document.getElementById('app').style.removeProperty('display');
  document.getElementById('user-label').textContent = t('auth.guestLabel');
  // .then() (não await -- enterGuestMode não é async) garante que o
  // redirecionamento de notificação (se houver) só rode DEPOIS do
  // render padrão terminar, senão a aba padrão do carregamento sobrescreve
  // a aba que a notificação pediu.
  loadStateAndRender().then(() => {
    applyPendingLevelTestOffer();
    if (typeof applyPendingNotificationTab === 'function') applyPendingNotificationTab();
    // Restaura a tela certa se a página carregou direto numa rota interna
    // (F5, link salvo/compartilhado) -- ver shared/router.js. Depois dos
    // dois de cima de propósito: se a notificação/teste de nível pediu uma
    // aba específica, isso vence; senão, a rota da URL manda.
    if (typeof applyInitialRoute === 'function') applyInitialRoute();
  });
}

async function onUserLoggedIn(user){
  CURRENT_USER = user;
  // Recomeça travado a cada login -- mesmo numa troca de conta dentro da
  // mesma aba (SIGNED_OUT nunca limpa isto sozinho), nenhum saveState()
  // pode escrever com o progresso da conta ANTERIOR (ou com os valores de
  // fábrica) até loadState() confirmar o que existe pra ESTA conta.
  progressLoadedOk = false;
  sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
  document.getElementById('login-screen').style.display = 'none';
  // removeProperty (não = 'block'): um valor inline sempre vence a cascata,
  // e a partir de 900px o #app precisa virar display:grid (shell com
  // sidebar/cards, Fase 3) -- setar 'block' aqui travaria isso pra sempre,
  // em qualquer largura de tela.
  document.getElementById('app').style.removeProperty('display');
  const label = user.user_metadata?.full_name || user.email || t('auth.myAccount');
  document.getElementById('user-label').textContent = label;
  document.getElementById('user-dropdown-email').textContent = user.email || '';
  // isAdminUser()/isAdminModeOn() vêm de languages/<lang>/app.js e
  // shared/profile.js -- só existem depois que os dois já rodaram, o que
  // sempre já aconteceu quando um login de verdade dispara este fluxo
  // (onAuthStateChange só é registrado no fim de initAuth, chamada depois
  // de app.js inteiro). applyAdminModeUI() cuida de .admin-only-nav (menu
  // do avatar + sidebar desktop) E do pill de Admin Mode na topbar --
  // única função, pra não duplicar a checagem em vários lugares (ver
  // Fase 2/9 da spec de Admin Mode).
  await applyAdminModeUI();
  // Papéis (075): menu da professora e Aulas/Material do aluno não dependem
  // do Admin Mode, só do papel/vínculo. Não segura o carregamento.
  if (typeof applyRoleNavUI === 'function') applyRoleNavUI().catch(() => {});
  // Garante que já exista uma linha em `profiles` assim que a pessoa loga --
  // antes, só era criada na primeira vez que ela abria "Meu perfil" (lazy),
  // então quem nunca tinha visitado a aba aparecia como "Aluno(a)" genérico
  // no Ranking. Best-effort: nunca atrasa nem quebra o carregamento do app
  // por causa disso (mesmo padrão do upsert de weekly_xp em saveState()).
  if (typeof ensureProfileLoaded === 'function') ensureProfileLoaded().catch(() => {});
  if (typeof refreshNotificationUnreadCount === 'function') refreshNotificationUnreadCount();
  if (typeof refreshFriendRequestCount === 'function') refreshFriendRequestCount();
  if (typeof ensureNotificationPreferencesLoaded === 'function') ensureNotificationPreferencesLoaded();
  progressAccountUiLanguage = null;
  await loadStateAndRender();
  // Idioma do site da conta (data._meta.uiLanguage): só depois de o
  // progresso estar carregado (reaproveita a leitura de loadState(), sem
  // ida extra à rede) e grava qualquer escolha pendente feita antes disso.
  await applyAccountUiLanguage();
  askUiLanguageOnFirstAccess();
  // Escolher o @ uma vez (111): só para quem tem o @ aleatório e ainda não escolheu; espera outras janelas.
  if (typeof maybeAskUsernameChoice === 'function') maybeAskUsernameChoice().catch(() => {});
  // Depois do render padrão (ver comentário equivalente em enterGuestMode)
  // -- só assim a navegação forçada por uma notificação clicada vence a
  // aba default do carregamento normal.
  applyPendingLevelTestOffer();
  if (typeof applyPendingNotificationTab === 'function') applyPendingNotificationTab();
  // Link de perfil/Deck aberto antes do login: volta para ele (shared/router.js).
  if (typeof consumePendingRouteAfterLogin === 'function') consumePendingRouteAfterLogin();
  if (typeof applyInitialRoute === 'function') applyInitialRoute();
  // Convite por link (?amigo=usuario): abre Amigos já buscando a pessoa.
  if (typeof friendsConsumePendingInvite === 'function') friendsConsumePendingInvite();
  // Convite da professora (link guardado ou convite pendente na Trilha).
  if (typeof teacherInvitesAfterLogin === 'function') teacherInvitesAfterLogin();
  // Mural (087): link da turma guardado e o "+N" no Perfil.
  if (typeof muralAfterLogin === 'function') muralAfterLogin();
  // Recomeçar o curso (123): aviso depois de recomeçar/desfazer e a retomada guiada de quem volta depois de 60 dias.
  if (typeof RecomecarCurso !== 'undefined') RecomecarCurso.afterLogin();
}

// ---------- Admin Mode ON/OFF (topbar) ----------
// Única função que decide a visibilidade de tudo que depende do Admin
// Mode: .admin-only-nav (Painel de Admin no menu do avatar + sidebar
// desktop) e o pill #admin-mode-toggle-btn. Chamada no login (acima) e no
// clique do próprio pill -- nunca duas implementações da mesma checagem
// (ver Fase 2/9/12 da spec de Admin Mode). isAdminUser() é a IDENTIDADE
// (nunca muda) -- só controla se o pill/menu aparecem pra essa conta.
// isAdminModeOn() é o MODO (ON/OFF) -- só controla, pra quem já é admin,
// se a navegação atual está em "admin de verdade" ou "simulando aluna".
// Com Admin Mode OFF, .admin-only-nav some da navegação normal, mas a
// conta continua sendo admin de fato (Painel de Admin continua acessível
// por quem souber chegar lá por fora do menu -- Fase 10: nenhuma
// revogação real de privilégio, só da navegação visível).
async function applyAdminModeUI(){
  const admin = typeof isAdminUser === 'function' && isAdminUser();
  const pill = document.getElementById('admin-mode-toggle-btn');
  if (!admin){
    document.querySelectorAll('.admin-only-nav').forEach(el => { el.style.display = 'none'; });
    if (pill) pill.style.display = 'none';
    return;
  }
  // ensureProfileLoaded() é idempotente (devolve PROFILE_CACHE se já
  // carregado) -- garante que isAdminModeOn() nunca leia um cache vazio
  // só porque este fluxo rodou antes do profile ainda ter chegado.
  if (typeof ensureProfileLoaded === 'function') await ensureProfileLoaded();
  const on = typeof isAdminModeOn === 'function' && isAdminModeOn();
  document.querySelectorAll('.admin-only-nav').forEach(el => { el.style.display = on ? '' : 'none'; });
  if (pill){
    pill.style.display = '';
    pill.classList.toggle('active', !on);
    const label = document.getElementById('admin-mode-state-label');
    if (label) label.textContent = on ? t('admin.mode.on') : t('admin.mode.off');
  }
}

document.getElementById('admin-mode-toggle-btn')?.addEventListener('click', async () => {
  const wasOn = typeof isAdminModeOn === 'function' && isAdminModeOn();
  const ok = typeof setAdminMode === 'function' && await setAdminMode(!wasOn);
  if (!ok) return;
  await applyAdminModeUI();
  // Reflete na hora na Trilha -- sem isto, a linha de uma lição já
  // clicável (ou já não-clicável) continuaria mostrando o estado antigo
  // até a próxima renderização natural (Fase 3: a troca precisa ser
  // imediata, não só na próxima navegação).
  if (typeof renderUnitsGrid === 'function') renderUnitsGrid();
  showToast(wasOn
    ? t('admin.mode.toastOff')
    : t('admin.mode.toastOn'));
});

// #mais-btn é o botão "Mais" da barra inferior mobile (Fase 6) -- abre o
// mesmo dropdown do pill de conta (que no mobile vira bottom sheet via
// CSS, ver .user-dropdown dentro de @media(max-width:899px) em cada
// index.html), só que também precisa acender/apagar o backdrop atrás
// dela. #mais-btn não existe em toda página antiga, daí o ?. -- nada
// quebra se faltar.
function toggleUserMenuDropdown(e){
  if (e) e.stopPropagation();
  const isOpen = document.getElementById('user-menu-dropdown').classList.toggle('open');
  document.getElementById('mais-backdrop')?.classList.toggle('open', isOpen);
}
document.getElementById('user-menu-btn').addEventListener('click', toggleUserMenuDropdown);
// O rótulo "Convidado"/"Minha conta" é gravado por t() na entrada; se o catálogo do
// idioma do site chegar depois (site em inglês), repinta para não ficar em português.
if (typeof window.addEventListener === 'function') window.addEventListener('i18n:change', () => {
  const el = document.getElementById('user-label');
  if (!el) return;
  if (CURRENT_USER === false) el.textContent = t('auth.guestLabel');
  else if (CURRENT_USER && !CURRENT_USER.user_metadata?.full_name && !CURRENT_USER.email) el.textContent = t('auth.myAccount');
});
document.getElementById('mais-btn')?.addEventListener('click', toggleUserMenuDropdown);
document.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  document.getElementById('mais-backdrop')?.classList.remove('open');
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (CURRENT_USER){
    // Logout explícito (de verdade, com conta) limpa o idioma lembrado --
    // sem isso, a próxima visita ao portão (index.html da raiz) reconhecia
    // este navegador como "já estudou aqui antes" e entrava direto em modo
    // convidado, pulando a tela de login mesmo pra quem saiu de propósito.
    localStorageSafeRemove(LAST_LANGUAGE_KEY);
    await supabaseClient.auth.signOut();
  } else {
    // Mesma lógica do logout com conta acima: sair de propósito do modo
    // convidado também limpa o idioma lembrado, pra voltar ao portão neutro
    // em vez de reentrar direto como convidado na próxima visita.
    localStorageSafeRemove(LAST_LANGUAGE_KEY);
    sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
    CURRENT_USER = null;
    goToNeutralGate();
  }
});

// Sair da conta também na sidebar do desktop (o pill com o nome não existe lá).
document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => document.getElementById('logout-btn').click());

// ---------- Persistência: Supabase (usuário logado) ou memória local (convidado) ----------
let saveInFlight = false;
let savePending = false;

// ---------- Idioma do site na conta (data._meta.uiLanguage) ----------
// Nunca dentro de serializeState() (que é por idioma estudado). Ordem de
// leitura: conta > navegador (localStorage 'ui-language') > pt-BR.
// progressAccountUiLanguage: valor lido por loadState() (mesma leitura do
// progresso). pendingAccountUiLanguage: escolha feita no seletor que ainda
// não foi confirmada no servidor -- saveState() também a inclui no _meta
// que grava, então nenhuma das duas escritas apaga a outra (corrida).
let progressAccountUiLanguage = null;
let pendingAccountUiLanguage = null;
// Conta sem nenhum progresso salvo ainda (primeiro acesso): só então o site pergunta o idioma.
let progressAccountIsNew = false;

function accountUiLangFromQuery(){
  try { return !!new URLSearchParams(window.location.search).get('ui'); } catch (e) { return false; }
}

async function applyAccountUiLanguage(){
  if (!CURRENT_USER || !progressLoadedOk) return;
  if (pendingAccountUiLanguage){ await flushAccountUiLanguage(); return; }
  const acct = progressAccountUiLanguage;
  if (acct) syncAuthUiLanguageMetadata(acct); // conta antiga: grava o idioma no cadastro de e-mails uma vez
  // ?ui= na URL (ferramenta de teste) vence a conta nesta aba.
  if (!acct || accountUiLangFromQuery()) return;
  if (typeof getUiLang === 'function' && typeof setUiLang === 'function' && getUiLang() !== acct){
    await setUiLang(acct);
  }
}

// Os e-mails do Supabase Auth (confirmar conta, link mágico, senha, trocar e-mail) escolhem o idioma por
// user_metadata.ui_language. Decisão da dona: vale o idioma do site que a pessoa está usando NO MOMENTO, então
// regrava ao trocar (e uma vez ao carregar, para contas antigas). Falha aqui nunca atrapalha o estudo.
function syncAuthUiLanguageMetadata(lang){
  try{
    if (!CURRENT_USER || !lang || typeof supabaseClient === 'undefined' || !supabaseClient.auth || !supabaseClient.auth.updateUser) return;
    const current = CURRENT_USER.user_metadata && CURRENT_USER.user_metadata.ui_language;
    if (current === lang) return;
    supabaseClient.auth.updateUser({ data: { ui_language: lang } }).then(function(res){
      if (!res || res.error) return;
      CURRENT_USER.user_metadata = Object.assign({}, CURRENT_USER.user_metadata, { ui_language: lang });
    }).catch(function(){});
  }catch(e){}
}

async function flushAccountUiLanguage(){
  if (!CURRENT_USER || !pendingAccountUiLanguage || !progressLoadedOk) return false;
  // Espera um saveState() em andamento terminar (ele também carrega o
  // pendente no _meta, mas evitar duas escritas simultâneas é mais limpo).
  for (let i = 0; i < 100 && saveInFlight; i++) await sleepMs(50);
  const lang = pendingAccountUiLanguage;
  try{
    const saved = await setAccountUiLanguage(CURRENT_USER.id, lang);
    progressAccountUiLanguage = saved;
    if (pendingAccountUiLanguage === lang) pendingAccountUiLanguage = null;
    syncAuthUiLanguageMetadata(saved || lang);
    return true;
  }catch(e){
    console.error('Erro ao salvar idioma do site na conta:', e);
    return false;
  }
}

// Primeiro acesso de uma conta nova: pergunta o idioma do site (menus, explicações
// e traduções), com o idioma do navegador como sugestão. Conta que já tem
// progresso ou idioma salvo, ?ui= na URL e navegador que já guardou uma escolha
// nunca veem o aviso. Não trava o carregamento: a escolha é um toque.
function uiLanguageSuggestionFromBrowser(){
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    return String(langs[0] || '').toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
  } catch (e) { return 'pt-BR'; }
}

// A entrada (index.html da raiz) já perguntou "Eu falo..." ao escolher o curso: guarda a resposta em 'ui-language-gate'.
// Conta nova sem idioma salvo grava essa resposta e não pergunta de novo.
function takeGateUiLanguage(){
  try {
    const v = window.localStorage.getItem('ui-language-gate');
    if (v) window.localStorage.removeItem('ui-language-gate');
    return v === 'en' || v === 'pt-BR' ? v : null;
  } catch (e) { return null; }
}

function askUiLanguageOnFirstAccess(){
  if (!CURRENT_USER || !progressLoadedOk) return;
  const fromGate = takeGateUiLanguage();
  if (!progressAccountIsNew) return;
  if (progressAccountUiLanguage || pendingAccountUiLanguage || accountUiLangFromQuery()) return;
  if (fromGate){ persistUiLanguageToAccount(fromGate); return; }
  try { if (window.localStorage.getItem('ui-language')) return; } catch (e) {}
  const modal = document.getElementById('ui-language-first-modal');
  if (!modal || typeof setUiLang !== 'function') return;
  const suggested = uiLanguageSuggestionFromBrowser();
  const btns = modal.querySelectorAll('button[data-lang]');
  btns.forEach(btn => {
    const isSuggested = btn.getAttribute('data-lang') === suggested;
    btn.classList.toggle('btn-primary', isSuggested);
    btn.classList.toggle('btn-secondary', !isSuggested);
    btn.onclick = async () => {
      const lang = btn.getAttribute('data-lang');
      persistUiLanguageToAccount(lang);
      try { await setUiLang(lang); } catch (e) {}
      // C6: com cursos por idioma do site, segue para "Qual curso você quer começar?" (só quando há mais de um para escolher).
      if (CourseStorage.isPerSiteLanguage() && typeof showFirstCoursePick === 'function' && showFirstCoursePick(lang, modal)) return;
      modal.style.display = 'none';
    };
  });
  modal.style.display = 'flex';
}

// Chamado pelo seletor "Idioma da interface" (shared/i18n/i18n.js) depois
// de uma troca EXPLÍCITA. Convidado: só localStorage (já feito por
// setUiLang). Conta: grava em _meta.uiLanguage assim que o progresso
// estiver carregado (antes disso fica pendente e applyAccountUiLanguage()
// grava logo após loadState()).
function persistUiLanguageToAccount(lang){
  if (!CURRENT_USER || typeof normalizeAccountUiLanguage !== 'function') return Promise.resolve(false);
  const norm = normalizeAccountUiLanguage(lang);
  if (!norm) return Promise.resolve(false);
  pendingAccountUiLanguage = norm;
  return flushAccountUiLanguage();
}

// Se uma tentativa de salvar falhar (rede caiu, Supabase fora do ar), quem
// está estudando precisa saber -- antes só era um console.error, sem
// nenhum jeito de perceber que o progresso não estava sendo salvo. Um
// cooldown evita alertar de novo a cada chamada de saveState() enquanto o
// problema persiste (ela é chamada com bastante frequência -- XP,
// conclusão de unidade etc.).
let lastSaveErrorToastAt = 0;
const SAVE_ERROR_TOAST_COOLDOWN_MS = 30000;

function notifySaveFailure(){
  if (typeof trackTechnicalError === 'function') trackTechnicalError('save_failed', null);
  const now = Date.now();
  if (now - lastSaveErrorToastAt < SAVE_ERROR_TOAST_COOLDOWN_MS) return;
  lastSaveErrorToastAt = now;
  showToast(t('auth.saveFailed'));
}

// Mesmo cooldown do aviso acima, contador PRÓPRIO -- este dispara num
// momento bem mais cedo do fluxo (antes de qualquer tentativa de rede) e
// por um motivo diferente (guarda de segurança, não falha de conexão), não
// deve competir pelo mesmo cooldown nem ser confundido com ele nos logs.
let lastLoadGuardToastAt = 0;
function notifyProgressNotLoadedYet(){
  if (typeof trackTechnicalError === 'function') trackTechnicalError('save_blocked_not_loaded', null);
  const now = Date.now();
  if (now - lastLoadGuardToastAt < SAVE_ERROR_TOAST_COOLDOWN_MS) return;
  lastLoadGuardToastAt = now;
  showToast(t('auth.notLoadedYet'));
}

// Cooldown/contador PRÓPRIO de novo -- mensagem diferente de propósito das
// duas acima: ali "espere um pouco" é literalmente a solução (o carrega-
// mento só está atrasado); aqui a sessão local está genuinamente pra trás
// do que já está salvo -- esperar sozinho não resolve nada, só recarregar
// (ou, na prática, o loadState() em segundo plano disparado logo abaixo)
// resolve.
let lastStaleLocalToastAt = 0;
function notifyStaleLocalProgress(){
  if (typeof trackTechnicalError === 'function') trackTechnicalError('save_blocked_stale_local', null);
  const now = Date.now();
  if (now - lastStaleLocalToastAt < SAVE_ERROR_TOAST_COOLDOWN_MS) return;
  lastStaleLocalToastAt = now;
  showToast(t('auth.staleLocal'));
}

async function saveState(){
  if (!CURRENT_USER) return;
  if (!progressLoadedOk){
    // Nunca escreve por cima do progresso remoto sem antes ter CONFIRMADO
    // que conseguimos ler o que já existia lá -- ver bug real (autora,
    // 2026-09-15, "meu progresso de francês foi resetado e zerado";
    // confirmado no banco: weekly_xp tinha 867 XP numa semana anterior,
    // progress.data.frances zerado por completo). Historicamente
    // loadState() podia falhar/atrasar em silêncio e QUALQUER saveState()
    // seguinte (mesmo um clique inocente, mesmo minutos/horas depois)
    // gravava o STATE ainda nos valores de fábrica por cima do progresso
    // real. Este guard é estritamente mais seguro que arriscar -- o save
    // simplesmente não acontece agora; a próxima ação que chamar
    // saveState() depois de loadState() confirmar tenta de novo.
    console.error('saveState: recusado -- progresso ainda não confirmado como carregado do servidor.');
    notifyProgressNotLoadedYet();
    return;
  }
  if (saveInFlight){ savePending = true; return; }
  saveInFlight = true;

  try{
    const payload = serializeState();
    // A linha do usuário é compartilhada entre todos os idiomas (mesma
    // tabela `progress`). Lê o que já está salvo e só substitui o
    // namespace deste idioma, preservando o progresso dos outros.
    const { data: existing, error: fetchError } = await supabaseClient
      .from('progress')
      .select('data')
      .eq('user_id', CURRENT_USER.id)
      .maybeSingle();
    if (fetchError){
      console.error('Erro ao ler progresso antes de salvar:', fetchError);
      notifySaveFailure();
      return;
    }

    // Guard-rail contra QUALQUER escrita que reduziria um campo vitalício
    // (ver MONOTONIC_PROGRESS_FIELDS acima) -- comparado contra a leitura
    // que acabou de vir do servidor, não contra um cache antigo, então a
    // janela de corrida vira só "entre esta leitura e o upsert logo
    // abaixo". Cobre tanto uma sessão local que nasceu nos valores de
    // fábrica (defesa em profundidade -- a causa raiz específica já tem
    // progressLoadedOk acima) quanto duas abas/dispositivos da mesma conta
    // salvando ao mesmo tempo (a mais antiga tende a ter um valor
    // vitalício menor que o que a mais nova já gravou).
    const blockKey = progressBlockKey(existing && existing.data);
    const existingPayload = existing && existing.data && existing.data[blockKey];
    // Recomeçar o curso (migration 123, shared/recomecar-curso.js): o servidor tem um recomeço ou desfazer MAIS NOVO que o
    // carregado nesta aba (época maior). Nunca grava por cima: avisa e recarrega. Vem antes do guarda-corpo de campos
    // vitalícios porque, depois de um recomeço, a aba velha tem XP MAIOR e passaria por ele.
    if (typeof RecomecarCurso !== 'undefined' && RecomecarCurso.blocksSave(existingPayload)) return;
    if (existingPayload){
      const regressed = MONOTONIC_PROGRESS_FIELDS.find(field => Number(payload[field]) < Number(existingPayload[field] || 0));
      if (regressed){
        console.error(`saveState: recusado -- campo vitalício "${regressed}" do STATE local (${payload[regressed]}) é menor que o já salvo no servidor (${existingPayload[regressed]}). Sessão local desatualizada.`);
        notifyStaleLocalProgress();
        // Best-effort, não aguardado -- tenta resincronizar o STATE local
        // sozinho em segundo plano. Se der certo, a PRÓXIMA chamada de
        // saveState() já vai com dado atualizado, sem a pessoa precisar
        // fazer nada; se não der (rede genuinamente fora do ar), a mensagem
        // acima já disse o que fazer.
        loadState();
        return;
      }
    }

    // E3/C2: sequência de dias e afins são da CONTA (união de todos os blocos); o bloco continua com o espelho, mas só com
    // os dias estudados NESTE idioma (a união fica em _account).
    let blockPayload = payload;
    let accountMerged = null;
    if (typeof AccountProgress !== 'undefined'){
      // Recorde de dias seguidos (janela da sequência do topo, 2026-10-30): guardado, sequência e histórico de dias. Só sobe
      // (mergeAccount fica com o maior). Fora do serializeState de propósito: os testes de paridade comparam aquele objeto.
      payload.bestStreak = AccountProgress.bestStreakOf(STATE);
      accountMerged = AccountProgress.mergeAccount(AccountProgress.deriveAccountFromRow(existing && existing.data), AccountProgress.pickAccount(payload));
      if (progressAccountBase) blockPayload = Object.assign({}, payload, AccountProgress.mirrorForBlock(payload, progressAccountBase));
    }
    // Época do recomeço vai junto com o bloco (sem recomeço, o mesmo objeto: nada muda para quem nunca recomeçou).
    if (typeof RecomecarCurso !== 'undefined') blockPayload = RecomecarCurso.stampForSave(blockPayload);
    const merged = Object.assign({}, existing && existing.data, { [blockKey]: blockPayload });
    // P1 (docs/p1-memoria-por-idioma.md): memória dos cartões da professora e próprios é do IDIOMA ESTUDADO. Junta com a
    // leitura fresca (fica a cópia de mais histórico), grava em _lang[APP_KEY] e sobe o espelho dos outros cursos do idioma.
    if (typeof LangCardMemory !== 'undefined'){
      const mem = LangCardMemory.prepareSave(existing && existing.data, APP_KEY, blockKey, blockPayload, new Date().toISOString());
      merged[blockKey] = mem.payload;
      Object.assign(merged, mem.otherBlocks);
      if (mem.lang) merged[LangCardMemory.KEY] = mem.lang;
    }
    if (accountMerged) merged._account = accountMerged;
    if (pendingAccountUiLanguage){
      merged._meta = Object.assign({}, merged._meta, { uiLanguage: pendingAccountUiLanguage });
    }
    // Retomada guiada (60 dias): o dia para o qual a janela já apareceu (uma vez por retorno).
    if (typeof RecomecarCurso !== 'undefined') merged._meta = RecomecarCurso.metaForSave(merged._meta);
    if (CourseStorage.isPerSiteLanguage()){
      // C5: registra o curso iniciado e qual é o atual (só acrescenta; nunca muda registro existente).
      const courseId = CourseStorage.activeCourseId(APP_KEY, pageSiteLanguage(existing && existing.data));
      const hadBlock = !!(existing && existing.data && existing.data[blockKey]);
      const meta = Object.assign({}, merged._meta);
      meta.courses = CourseStorage.registerCourse(meta.courses, courseId, blockKey, hadBlock, new Date().toISOString());
      meta.currentCourse = courseId;
      merged._meta = meta;
    }
    const { error } = await supabaseClient
      .from('progress')
      .upsert({ user_id: CURRENT_USER.id, data: merged }, { onConflict: 'user_id' });
    if (error){
      console.error('Erro ao salvar progresso:', error);
      notifySaveFailure();
    }

    // Ranking semanal (Leaderboard, ver shared/leaderboard.js) -- acessório,
    // não crítico como o progresso em si: um erro aqui não bloqueia nem
    // reporta falha de save pra quem está estudando. ensurePeriodXp()
    // garante que STATE.periodXp reflete a semana ATUAL antes de gravar --
    // sem isso, um STATE.periodXp restaurado de uma sessão anterior podia
    // ficar preso na semana passada até a próxima vez que addXP() rodasse.
    if (typeof ensurePeriodXp === 'function') ensurePeriodXp();
    if (STATE.periodXp?.weekStart){
      const { error: weeklyError } = await supabaseClient
        .from('weekly_xp')
        .upsert({
          user_id: CURRENT_USER.id,
          week_start: STATE.periodXp.weekStart,
          language_app_key: APP_KEY,
          // C5: soma dos cursos do idioma na semana (frances@pt-BR + frances@en), senão um sobrescreve o outro.
          amount: CourseStorage.isPerSiteLanguage()
            ? CourseStorage.weeklyXpForLanguage(merged, APP_KEY, blockKey, STATE.periodXp)
            : STATE.periodXp.amount,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,week_start,language_app_key' });
      if (weeklyError) console.error('Erro ao atualizar XP semanal (ranking):', weeklyError);
    }
  }catch(e){
    console.error('Erro ao salvar progresso:', e);
    notifySaveFailure();
  }finally{
    saveInFlight = false;
    if (savePending){ savePending = false; saveState(); }
  }
}

// Sincroniza badges de GAMEPLAY (BADGES em cada app.js) já ganhos com a
// tabela pública earned_badges (ver shared/supabase_migrations/017) -- é o
// que permite o perfil público de OUTRA pessoa (a partir de um clique no
// Ranking) mostrar a vitrine de conquistas dela, sem abrir leitura pública
// de `progress` inteira (que tem dados demais pra ser um risco aceitável,
// ver o comentário da migration). Chamada de dois lugares em cada app.js:
// seedEarnedBadges() (sincroniza/faz backfill de tudo que já era verdade
// ao carregar a sessão) e checkAndCelebrateBadges() (grava só o que acabou
// de ser conquistado). Upsert é idempotente (onConflict na chave composta),
// então repetir o backfill a cada load não duplica nem tem custo de leitura
// -- só grava.
// backfill: níveis que a pessoa já tinha ao abrir a página (conquistas com níveis, shared/badge-tracks-app.js) entram
// com data no passado e sem sobrescrever linha existente, para não aparecerem como novidade na Atividade dos amigos.
async function upsertEarnedBadges(badgeIds, opts){
  if (!CURRENT_USER || !badgeIds || !badgeIds.length) return;
  const backfill = !!(opts && opts.backfill) && typeof BADGE_BACKFILL_EARNED_AT !== 'undefined';
  const rows = badgeIds.map(id => backfill
    ? { user_id: CURRENT_USER.id, language_app_key: APP_KEY, badge_id: id, earned_at: BADGE_BACKFILL_EARNED_AT }
    : { user_id: CURRENT_USER.id, language_app_key: APP_KEY, badge_id: id });
  const { error } = await supabaseClient
    .from('earned_badges')
    .upsert(rows, backfill ? { onConflict: 'user_id,language_app_key,badge_id', ignoreDuplicates: true } : { onConflict: 'user_id,language_app_key,badge_id' });
  if (error) console.error('Erro ao sincronizar badges públicos:', error);
}

// C4: conquistas da CONTA ganhas em qualquer idioma (earned_badges de todos os idiomas, só os ids de conta). Falha de rede = lista vazia
// (o idioma atual continua mostrando o que ele mesmo calcula). Nunca remove conquista.
let accountEarnedBadgeRows = [];
async function loadAccountEarnedBadges(){
  if (!CURRENT_USER) { accountEarnedBadgeRows = []; return accountEarnedBadgeRows; }
  const { data, error } = await supabaseClient
    .from('earned_badges')
    .select('badge_id, language_app_key')
    .eq('user_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao carregar conquistas da conta:', error); return accountEarnedBadgeRows; }
  accountEarnedBadgeRows = data || [];
  return accountEarnedBadgeRows;
}
function badgeEarnedNow(b, s){
  return !!b.check(s) || accountEarnedBadgeRows.some(r => r.badge_id === b.id && AccountProgress.isAccountBadge(b.id));
}

// Tenta de novo (rede instável é comum logo no carregamento da página,
// ainda competindo por banda com o resto dos assets) antes de desistir --
// cada tentativa falha deixa progressLoadedOk em false, então desistir
// cedo demais só trocaria "perde dado" por "nunca mais salva nada nesta
// sessão". 3 tentativas, backoff curto (não é um retry indefinido -- se a
// rede está mesmo fora do ar, a pessoa vai perceber por outros sinais).
const LOAD_STATE_MAX_ATTEMPTS = 3;
function sleepMs(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function loadState(){
  if (!CURRENT_USER) return;
  for (let attempt = 1; attempt <= LOAD_STATE_MAX_ATTEMPTS; attempt++){
    try{
      const { data, error } = await supabaseClient
        .from('progress')
        .select('data')
        .eq('user_id', CURRENT_USER.id)
        .maybeSingle();

      if (error){
        console.error('Erro ao carregar progresso:', error, `(tentativa ${attempt}/${LOAD_STATE_MAX_ATTEMPTS})`);
        if (attempt < LOAD_STATE_MAX_ATTEMPTS){ await sleepMs(attempt * 800); continue; }
        return; // progressLoadedOk continua false -- saveState() se recusa a gravar até a próxima tentativa de load
      }

      progressAccountUiLanguage = (typeof uiLanguageFromProgressData === 'function' && data)
        ? uiLanguageFromProgressData(data.data) : null;
      progressAccountIsNew = !(data && data.data && Object.keys(data.data).some(k => k !== '_meta' && k !== '_account' && k !== '_lang'));
      const blockKey = progressBlockKey(data && data.data);
      const langMemory = typeof LangCardMemory !== 'undefined' ? LangCardMemory : null;
      if (data && data.data && data.data[blockKey]){
        // P1: o bloco do curso com a memória do idioma (cartões da professora e próprios) por cima; ver shared/lang-card-memory.js.
        applySerializedState(langMemory ? langMemory.blockForLoad(data.data, APP_KEY, blockKey) : data.data[blockKey]);
      } else if (typeof loadLegacyState === 'function' && data && data.data
        && (!CourseStorage.isPerSiteLanguage() || CourseStorage.isLegacyCourse(APP_KEY, pageSiteLanguage(data.data)))){
        // Hook opcional: um idioma que já persistia progresso ANTES do
        // namespacing por APP_KEY existir pode definir loadLegacyState(data)
        // pra reconhecer o formato antigo (salvo direto na raiz do JSON) e
        // não perder o progresso de quem já tinha conta. Sem essa função
        // definida, este ramo simplesmente não faz nada (caso comum: idioma
        // novo, nunca teve formato antigo pra migrar).
        loadLegacyState(data.data);
      }
      // P1: curso sem bloco ainda (curso novo de um idioma que a conta já estuda): a memória dos cartões da professora e
      // próprios vem do idioma (antes começava do zero). Só sobe progresso (nunca troca por uma cópia com menos histórico).
      if (langMemory && data && data.data && !data.data[blockKey] && typeof applyLanguageCardMemory === 'function'){
        applyLanguageCardMemory(langMemory.memoryEntriesForLoad(data.data, APP_KEY));
      }
      // E3/C2: sequência de dias, lições do dia e afins vêm da CONTA (soma dos blocos), por cima do que o bloco trouxe.
      // Guarda antes o que é só DESTE idioma, para o espelho do bloco não receber dias estudados no outro (ver saveState).
      if (data && data.data && typeof AccountProgress !== 'undefined'){
        try {
          const ownSnapshot = { activityLog: Object.assign({}, STATE.activityLog), dailyLessonsLog: Object.assign({}, STATE.dailyLessonsLog), lastStudyDay: STATE.lastStudyDay };
          AccountProgress.applyAccountToState(STATE, AccountProgress.deriveAccountFromRow(data.data));
          progressAccountBase = AccountProgress.snapshotBase(ownSnapshot, STATE);
        }
        catch (e) { console.error('Erro ao aplicar progresso da conta:', e); }
      }
      // Recomeçar o curso: lembra a época carregada; se mudou desde o último carregamento desta página, recarrega.
      if (typeof RecomecarCurso !== 'undefined' && data && data.data){
        const courseId = CourseStorage.activeCourseId(APP_KEY, pageSiteLanguage(data.data));
        if (!RecomecarCurso.onLoaded(data.data, blockKey, courseId)) return;
      }
      // Só chega aqui depois de uma leitura bem-sucedida (com ou sem dado
      // pra essa conta -- as duas são um resultado válido, "conta nova"
      // não é diferente de "falha" pra este guard). Ver comentário de
      // progressLoadedOk no topo do arquivo.
      progressLoadedOk = true;
      return;
    }catch(e){
      console.error('Erro ao carregar progresso:', e, `(tentativa ${attempt}/${LOAD_STATE_MAX_ATTEMPTS})`);
      if (attempt < LOAD_STATE_MAX_ATTEMPTS){ await sleepMs(attempt * 800); continue; }
    }
  }
}
