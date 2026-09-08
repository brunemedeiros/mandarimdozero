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
const GUEST_MODE_FLAG = 'guest_mode';
// (antes cada site tinha sua própria chave -- 'frances_zero_guest_mode' /
// 'mandarim_guest_mode'; sessionStorage é por aba E por origem, então
// unificar agora não perde nada, mesma lógica do app_theme em shared/theme.js.)

async function initAuth(){
  const { data: { session } } = await supabaseClient.auth.getSession();

  // Limpa qualquer fragmento de token da URL depois que o Supabase já teve
  // a chance de processá-lo (getSession acima) — evita que ele contamine um
  // redirectTo futuro se o usuário tentar entrar de novo.
  if (window.location.hash){
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (session && session.user){
    await onUserLoggedIn(session.user);
  } else if (sessionStorageSafeGet(GUEST_MODE_FLAG) === '1'){
    enterGuestMode();
  } else {
    goToNeutralGate();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user){
      await onUserLoggedIn(session.user);
    } else if (event === 'SIGNED_OUT'){
      CURRENT_USER = null;
      goToNeutralGate();
    }
  });
}

// Sem sessão nem modo convidado ativo: este app (fr/zh) não tem sua própria
// tela de login -- a única tela de login da plataforma é o portão neutro na
// raiz (index.html), sem marca de idioma. #login-screen aqui é só um overlay
// de "carregando/redirecionando" (ver markup), nunca um formulário de verdade.
function goToNeutralGate(){
  window.location.href = '../index.html';
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
  document.getElementById('user-label').textContent = 'Convidado';
  // .then() (não await -- enterGuestMode não é async) garante que o
  // redirecionamento de notificação (se houver) só rode DEPOIS do
  // render padrão terminar, senão a aba padrão do carregamento sobrescreve
  // a aba que a notificação pediu.
  loadStateAndRender().then(() => {
    if (typeof applyPendingNotificationTab === 'function') applyPendingNotificationTab();
  });
}

async function onUserLoggedIn(user){
  CURRENT_USER = user;
  sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
  document.getElementById('login-screen').style.display = 'none';
  // removeProperty (não = 'block'): um valor inline sempre vence a cascata,
  // e a partir de 900px o #app precisa virar display:grid (shell com
  // sidebar/cards, Fase 3) -- setar 'block' aqui travaria isso pra sempre,
  // em qualquer largura de tela.
  document.getElementById('app').style.removeProperty('display');
  const label = user.user_metadata?.full_name || user.email || 'Minha conta';
  document.getElementById('user-label').textContent = label;
  document.getElementById('user-dropdown-email').textContent = user.email || '';
  // isAdminUser() vem de languages/<lang>/app.js -- só existe função pra
  // essa checagem depois que app.js já rodou, o que sempre já aconteceu
  // quando um login de verdade dispara este fluxo (onAuthStateChange só
  // é registrado no fim de initAuth, chamada depois de app.js inteiro).
  // .admin-only-nav cobre o item do menu do avatar E o da sidebar desktop
  // (Fase 3 da reestruturação de navegação) -- os dois só existem/aparecem
  // pra quem é admin, sem duplicar essa checagem em dois lugares.
  const isAdmin = typeof isAdminUser === 'function' && isAdminUser();
  document.querySelectorAll('.admin-only-nav').forEach(btn => { btn.style.display = isAdmin ? '' : 'none'; });
  // Garante que já exista uma linha em `profiles` assim que a pessoa loga --
  // antes, só era criada na primeira vez que ela abria "Meu perfil" (lazy),
  // então quem nunca tinha visitado a aba aparecia como "Aluno(a)" genérico
  // no Ranking. Best-effort: nunca atrasa nem quebra o carregamento do app
  // por causa disso (mesmo padrão do upsert de weekly_xp em saveState()).
  if (typeof ensureProfileLoaded === 'function') ensureProfileLoaded().catch(() => {});
  if (typeof refreshNotificationUnreadCount === 'function') refreshNotificationUnreadCount();
  if (typeof ensureNotificationPreferencesLoaded === 'function') ensureNotificationPreferencesLoaded();
  await loadStateAndRender();
  // Depois do render padrão (ver comentário equivalente em enterGuestMode)
  // -- só assim a navegação forçada por uma notificação clicada vence a
  // aba default do carregamento normal.
  if (typeof applyPendingNotificationTab === 'function') applyPendingNotificationTab();
}

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

// ---------- Persistência: Supabase (usuário logado) ou memória local (convidado) ----------
let saveInFlight = false;
let savePending = false;

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
  showToast('⚠ Não foi possível salvar seu progresso agora. Verifique sua conexão.');
}

async function saveState(){
  if (!CURRENT_USER) return;
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

    const merged = Object.assign({}, existing && existing.data, { [APP_KEY]: payload });
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
          amount: STATE.periodXp.amount,
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

async function loadState(){
  if (!CURRENT_USER) return;
  try{
    const { data, error } = await supabaseClient
      .from('progress')
      .select('data')
      .eq('user_id', CURRENT_USER.id)
      .maybeSingle();

    if (error){ console.error('Erro ao carregar progresso:', error); return; }
    if (data && data.data && data.data[APP_KEY]){
      applySerializedState(data.data[APP_KEY]);
    } else if (typeof loadLegacyState === 'function' && data && data.data){
      // Hook opcional: um idioma que já persistia progresso ANTES do
      // namespacing por APP_KEY existir pode definir loadLegacyState(data)
      // pra reconhecer o formato antigo (salvo direto na raiz do JSON) e
      // não perder o progresso de quem já tinha conta. Sem essa função
      // definida, este ramo simplesmente não faz nada (caso comum: idioma
      // novo, nunca teve formato antigo pra migrar).
      loadLegacyState(data.data);
    }
  }catch(e){
    console.error('Erro ao carregar progresso:', e);
  }
}
