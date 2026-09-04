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
    showLoginScreen();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user){
      await onUserLoggedIn(session.user);
    } else if (event === 'SIGNED_OUT'){
      CURRENT_USER = null;
      showLoginScreen();
    }
  });
}

function showLoginScreen(){
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function enterGuestMode(){
  sessionStorageSafeSet(GUEST_MODE_FLAG, '1');
  CURRENT_USER = false;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-label').textContent = 'Convidado';
  loadStateAndRender();
}

async function onUserLoggedIn(user){
  CURRENT_USER = user;
  sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const label = user.user_metadata?.full_name || user.email || 'Minha conta';
  document.getElementById('user-label').textContent = label;
  document.getElementById('user-dropdown-email').textContent = user.email || '';
  // isAdminUser() vem de languages/<lang>/app.js -- só existe função pra
  // essa checagem depois que app.js já rodou, o que sempre já aconteceu
  // quando um login de verdade dispara este fluxo (onAuthStateChange só
  // é registrado no fim de initAuth, chamada depois de app.js inteiro).
  const adminBtn = document.getElementById('admin-badges-btn');
  if (adminBtn) adminBtn.style.display = (typeof isAdminUser === 'function' && isAdminUser()) ? '' : 'none';
  await loadStateAndRender();
}

document.getElementById('google-login-btn').addEventListener('click', async () => {
  const noteEl = document.getElementById('login-note');
  noteEl.textContent = 'Redirecionando para o Google...';
  noteEl.className = 'login-note';
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: cleanRedirectURL() }
  });
  if (error){
    noteEl.textContent = 'Não foi possível iniciar o login. Tente novamente.';
    noteEl.className = 'login-note err';
  }
});

// ---------- Login com e-mail e senha (alternativa ao Google/Convidado) ----------
let emailLoginMode = 'signin'; // 'signin' | 'signup'

function updateEmailLoginModeUI(){
  document.getElementById('email-login-submit-btn').textContent = emailLoginMode === 'signup' ? 'Criar conta' : 'Entrar';
  document.getElementById('login-signup-question').textContent = emailLoginMode === 'signup' ? 'Já tem conta?' : 'Não tem conta?';
  document.getElementById('email-login-toggle-mode-btn').textContent = emailLoginMode === 'signup' ? 'Entrar' : 'Cadastre-se';
}

document.getElementById('email-login-toggle-mode-btn').addEventListener('click', () => {
  emailLoginMode = emailLoginMode === 'signup' ? 'signin' : 'signup';
  updateEmailLoginModeUI();
});

document.getElementById('email-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const noteEl = document.getElementById('login-note');
  const email = document.getElementById('email-login-email').value.trim();
  const password = document.getElementById('email-login-password').value;
  const submitBtn = document.getElementById('email-login-submit-btn');

  submitBtn.disabled = true;
  noteEl.className = 'login-note';
  noteEl.textContent = emailLoginMode === 'signup' ? 'Criando conta...' : 'Entrando...';

  try{
    if (emailLoginMode === 'signup'){
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error){
        noteEl.textContent = error.message;
        noteEl.className = 'login-note err';
      } else if (!data.session){
        // confirmação de e-mail exigida pelo projeto Supabase — sem sessão ainda
        noteEl.textContent = 'Conta criada! Verifique seu e-mail para confirmar e depois entre normalmente.';
        noteEl.className = 'login-note';
      }
      // se já veio sessão (confirmação de e-mail desligada), onAuthStateChange cuida do resto
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error){
        noteEl.textContent = 'E-mail ou senha incorretos.';
        noteEl.className = 'login-note err';
      }
    }
  }catch(err){
    noteEl.textContent = 'Não foi possível conectar. Tente novamente.';
    noteEl.className = 'login-note err';
  }finally{
    submitBtn.disabled = false;
  }
});

document.getElementById('email-login-forgot-btn').addEventListener('click', async () => {
  const noteEl = document.getElementById('login-note');
  const email = document.getElementById('email-login-email').value.trim();
  if (!email){
    noteEl.textContent = 'Digite seu e-mail no campo acima primeiro.';
    noteEl.className = 'login-note err';
    return;
  }
  noteEl.textContent = 'Enviando e-mail de redefinição...';
  noteEl.className = 'login-note';
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: cleanRedirectURL() });
  if (error){
    noteEl.textContent = 'Não foi possível enviar o e-mail. Tente novamente.';
    noteEl.className = 'login-note err';
  } else {
    noteEl.textContent = 'E-mail de redefinição enviado! Confira sua caixa de entrada.';
    noteEl.className = 'login-note';
  }
});

updateEmailLoginModeUI();

document.getElementById('guest-btn').addEventListener('click', () => {
  enterGuestMode();
});

document.getElementById('user-menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('user-menu-dropdown').classList.toggle('open');
});
document.addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (CURRENT_USER){
    await supabaseClient.auth.signOut();
  } else {
    sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
    CURRENT_USER = null;
    showLoginScreen();
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
