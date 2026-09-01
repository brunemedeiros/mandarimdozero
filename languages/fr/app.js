/* ============================================================
   Francês do Zero — lógica do app
   Adaptado do motor do Mandarim do Zero: SRS (SM-2), TTS via Web Speech API,
   gamificação, persistência via Supabase, exportação para Anki (.apkg).
   Diferenças principais em relação ao original:
   - Sem par pinyin/hanzi: cada item de conteúdo é só { f: francês, t: português }.
   - Sem trilha de caracteres (não existe no francês) — no lugar, aba de
     Conjugação (seleção livre de tempos + categoria de verbo, sempre as 6 pessoas).
   - Aba Manual removida por enquanto (pendente, ver task do projeto).
   - Exportar deixou de ser aba e virou botão/modal dentro da Trilha.
   ============================================================ */

// Registro do service worker agora vem de shared/pwa.js.

// ---------- Text-to-Speech (francês) ----------
// Mesmas cautelas de navegador do app original (Chromium/Opera: getVoices()
// pode demorar, onvoiceschanged pode não disparar, primeira fala pode
// "engasgar" sem warm-up) — só trocando o idioma de zh-CN para fr-FR.
const TTS = {
  supported: 'speechSynthesis' in window,
  voice: null,
  voicesLoaded: false,
  warmedUp: false,
  pollAttempts: 0
};

// Nem toda voz do mesmo idioma soa igual: o SO costuma expor tanto vozes
// "neurais"/online (Google, Microsoft Natural/Online) quanto vozes locais
// robóticas mais antigas, e a ordem que o navegador retorna é arbitrária.
// Pontua pelo nome pra preferir a melhor voz disponível, não só a primeira.
function voiceQualityScore(v){
  const name = (v.name || '').toLowerCase();
  if (/natural|neural/.test(name)) return 3;
  if (/online/.test(name)) return 2;
  if (/google/.test(name)) return 1;
  return 0;
}

function loadFrenchVoice(){
  if (!TTS.supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return false;
  // Prioriza vozes fr-FR, depois qualquer fr-*; dentro de cada grupo, a de melhor qualidade.
  const exact = voices.filter(v => v.lang === 'fr-FR').sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  const anyFr = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr')).sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  TTS.voice = exact[0] || anyFr[0] || null;
  TTS.voicesLoaded = true;
  return !!TTS.voice;
}

function pollForVoices(){
  if (!TTS.supported || TTS.voice) return;
  TTS.pollAttempts++;
  loadFrenchVoice();
  if (!TTS.voice && TTS.pollAttempts < 20){
    setTimeout(pollForVoices, 300);
  }
}

if (TTS.supported){
  loadFrenchVoice();
  window.speechSynthesis.onvoiceschanged = loadFrenchVoice;
  pollForVoices();
}

function warmUpTTSOnce(){
  if (TTS.warmedUp || !TTS.supported) return;
  TTS.warmedUp = true;
  try{
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    window.speechSynthesis.speak(warm);
  }catch(e){ /* silencioso: warm-up é best-effort */ }
  document.removeEventListener('click', warmUpTTSOnce);
  document.removeEventListener('touchstart', warmUpTTSOnce);
}
document.addEventListener('click', warmUpTTSOnce, { once:true });
document.addEventListener('touchstart', warmUpTTSOnce, { once:true });

// Verdadeiro se dá pra tocar esse texto — seja por mp3 pré-gerado, seja pela
// Web Speech API do navegador. Usado nos autoplay antes de chamar
// speakFrench(), pra não depender só de TTS.voice (agora quase sempre
// desnecessário, já que a maioria do conteúdo tem áudio pré-gerado).
function canSpeakFrench(text){
  return (typeof AUDIO_MANIFEST !== 'undefined' && !!AUDIO_MANIFEST[text]) || !!TTS.voice;
}

// Toca um mp3 pré-gerado (Google Cloud TTS, voz neural) em vez da Web Speech
// API do navegador — qualidade consistente pra todo aluno, independente do
// SO/navegador. Ver audio-manifest.js (texto -> arquivo) e speakFrench().
function playPregeneratedAudio(file, btnEl){
  const audio = new Audio('audio/' + file);
  if (btnEl) btnEl.classList.add('speaking');
  const clear = () => { if (btnEl) btnEl.classList.remove('speaking'); };
  audio.addEventListener('ended', clear);
  audio.addEventListener('error', () => { clear(); showToast('Não foi possível reproduzir o áudio'); });
  audio.play().catch(clear);
}

function speakFrench(text, btnEl){
  const pregenFile = typeof AUDIO_MANIFEST !== 'undefined' && AUDIO_MANIFEST[text];
  if (pregenFile){
    playPregeneratedAudio(pregenFile, btnEl);
    return;
  }

  if (!TTS.supported){
    showToast('Áudio não suportado neste navegador');
    return;
  }

  if (!TTS.voice){
    loadFrenchVoice();
  }
  if (!TTS.voice){
    showToast('🔇 Voz em francês não encontrada neste navegador/SO');
    return;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const buildUtterance = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.voice = TTS.voice;
    u.rate = 0.9;
    u.pitch = 1;
    u.volume = 1;
    return u;
  };

  const utter = buildUtterance();
  if (btnEl) btnEl.classList.add('speaking');

  let didStart = false;
  utter.onstart = () => { didStart = true; };
  utter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
  utter.onerror = () => {
    if (btnEl) btnEl.classList.remove('speaking');
    showToast('Não foi possível reproduzir o áudio');
  };

  window.speechSynthesis.speak(utter);

  setTimeout(() => {
    if (!didStart){
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const retryUtter = buildUtterance();
      let retryStarted = false;
      retryUtter.onstart = () => { retryStarted = true; };
      retryUtter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
      retryUtter.onerror = () => { if (btnEl) btnEl.classList.remove('speaking'); };
      window.speechSynthesis.speak(retryUtter);
      setTimeout(() => {
        if (!retryStarted){
          if (btnEl) btnEl.classList.remove('speaking');
          showToast('🔇 Não foi possível reproduzir este áudio');
        }
      }, 800);
    }
  }, 800);
}

if (TTS.supported){
  setInterval(() => {
    if (!window.speechSynthesis.speaking){
      window.speechSynthesis.resume();
    }
  }, 10000);
}

function audioBtnHTML(text, extraClass){
  const safe = text.replace(/"/g, '&quot;');
  return `<button class="audio-btn ${extraClass||''}" data-speak="${safe}" aria-label="Ouvir pronúncia" title="Ouvir pronúncia">🔊</button>`;
}

// Emoji de bandeira (🇧🇷 🇫🇷 🇵🇹 etc.) não renderiza em todo sistema — no
// Windows, por exemplo, vira as duas letras do código do país ("BR") em
// vez do desenho da bandeira. Pros cenários que usam bandeira como ícone,
// desenhamos um SVG simples em vez de confiar no emoji (mesma razão do
// flag-badge usado no link cruzado entre os sites).
const SCENARIO_FLAG_SVG = {
  '🇫🇷': '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" x="0" fill="#0055A4"/><rect width="1" height="2" x="1" fill="#FFFFFF"/><rect width="1" height="2" x="2" fill="#EF4135"/></svg>',
  '🇧🇷': '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="2" fill="#009739"/><polygon points="1.5,0.15 2.85,1 1.5,1.85 0.15,1" fill="#FEDD00"/><circle cx="1.5" cy="1" r="0.55" fill="#002776"/></svg>',
  '🇵🇹': '<svg viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1.2" height="2" x="0" fill="#046A38"/><rect width="1.8" height="2" x="1.2" fill="#DA291C"/><circle cx="1.2" cy="1" r="0.4" fill="#FFCC00"/><circle cx="1.2" cy="1" r="0.24" fill="#FFFFFF"/></svg>'
};

function scenarioSceneHTML(emoji){
  const svg = SCENARIO_FLAG_SVG[emoji];
  return svg ? `<span class="scenario-flag">${svg}</span>` : emoji;
}

function wireAudioButtons(container){
  container.querySelectorAll('.audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakFrench(btn.dataset.speak, btn);
    });
  });
}

// ---------- "Já sei?" — marca um cartão de vocabulário como já dominado ----------
function wireKnowButtons(container){
  container.querySelectorAll('.know-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardId = btn.dataset.cardId;
      const card = STATE.cards.find(c => c.id === cardId);
      if (!card) return;

      if (card.reps > 0){
        card.reps = 0;
        card.interval = 0;
        card.due = 0;
        card.ef = 2.5;
        card.firstLearnedDate = null;
        btn.classList.remove('known');
        btn.textContent = 'Já sei?';
      } else {
        applySM2(card, 3); // grade 3 = "Fácil"
        btn.classList.add('known');
        btn.textContent = '✓ Já sei';
        showToast('Marcado como já sabido ⭐');
      }

      saveState();
      checkUnitCompletion(STATE.currentUnitId);
      renderUnitsGrid();
    });
  });
}

// ---------- Construção do banco de cartões a partir do content.js ----------
// Cada cartão SRS = 1 item de vocabulário (frente: francês, com áudio; verso: tradução)
function buildCardsFromUnits(units){
  const cards = [];
  units.forEach(u => {
    if (u.type === 'grammar') return; // unidades de gramática não têm vocabulário/flashcards
    u.vocab.forEach((v, idx) => {
      cards.push({
        id: `u${u.id}-v${idx}`,
        unitId: u.id,
        unitTitle: u.title,
        type: 'vocab',
        front: v.f,
        back_trans: v.t,
        ef: 2.5,
        interval: 0,
        reps: 0,
        due: 0,
        lapses: 0
      });
    });
  });
  return cards;
}

// ---------- Estado global ----------
const STATE = {
  units: UNITS,
  cards: buildCardsFromUnits(UNITS),
  unitProgress: {},
  xp: 0,
  streak: 0,
  lastStudyDay: null,
  lastReviewReminderDay: null,
  activityLog: {},
  studyGoal: {
    objective: null, levels: [],
    days: { mon:true, tue:true, wed:true, thu:true, fri:true, sat:true, sun:true },
    hour: 8, minute: 0, notifications: false, dailyMinutes: 0 // dailyMinutes 0 = meta ainda não definida
  },
  dailyMinutesLog: {}, // 'YYYY-MM-DD' -> minutos estimados de estudo naquele dia
  totalReviews: 0,
  currentUnitId: null,
  reviewQueue: [],
  reviewIndex: 0,
  reviewShowingAnswer: false,
  reviewSessionUnitFilter: null,
  currentLevel: LEVELS[0].id,
  checkpointProgress: {},
  levelTestProgress: {},
  daily: {
    date: null, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
    grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0,
    conjugationTenses: [], reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0
  },
  completedChallenges: {} // challengeId -> true -- "Desafios" concluídos, ver challenges_do_aluno
};

// Cada nível é acessível livremente (o aluno escolhe o nível quando quiser);
// dentro de um nível, o desbloqueio continua sequencial unidade por unidade —
// então só a PRIMEIRA unidade de cada nível já nasce destravada.
function isFirstOfLevel(u){
  return UNITS.find(x => x.level === u.level) === u;
}

UNITS.forEach((u) => {
  STATE.unitProgress[u.id] = { started:false, completed:false, unlocked: isFirstOfLevel(u) };
});

MODULES.forEach((m) => {
  STATE.checkpointProgress[m.id] = { completed: false, bestScore: 0 };
});

LEVEL_TESTS.forEach((t) => {
  STATE.levelTestProgress[t.id] = { completed: false, bestScore: 0 };
});

// ---------- Supabase: conexão, autenticação e persistência na nuvem ----------
// Este projeto Supabase é compartilhado com o Mandarim do Zero (mesma tabela
// `progress`, chaveada por user_id). Para não misturar streak/XP/progresso
// dos dois cursos, cada app guarda seu estado sob sua própria chave dentro
// da coluna `data` (ver APP_KEY, saveState() e loadState() abaixo).
const SUPABASE_URL = 'https://eigjocalzwamisgqilhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZ2pvY2FsendhbWlzZ3FpbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjYzNjksImV4cCI6MjEwMjUwMjM2OX0.EyW4vyQcFL2vrBoo-rpLD5J8LNBT3aSEJREZTSqzHVU';
const APP_KEY = 'frances';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL "limpa" (sem #access_token nem outros fragmentos) pra usar como
// redirectTo do OAuth/reset de senha. Usar window.location.href direto é
// perigoso: se a URL já tiver um #access_token sobrando de uma tentativa
// anterior que falhou, o Google devolve um token novo em cima do antigo em
// vez de substituir, quebrando o parsing — e piora a cada nova tentativa.
function cleanRedirectURL(){
  return window.location.origin + window.location.pathname;
}

let CURRENT_USER = null;
const GUEST_MODE_FLAG = 'frances_zero_guest_mode';

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

// sessionStorageSafeGet/Set, localStorageSafeGet/Set e o tema claro/escuro
// (isDarkThemeActive, toggleTheme etc.) agora vêm de shared/utils.js e
// shared/theme.js, carregados antes deste arquivo (ver index.html) --
// compartilhados entre todos os idiomas, não duplicados por app.

// ---------- Preferência: modo do exercício de completar frase (cloze) ----------
// 'choice' (múltipla escolha, padrão) ou 'type' (digitar a palavra que falta),
// estilo o toggle "sempre digitar" do Duolingo — vale pra todos os exercícios
// de cloze, não é escolhido por exercício.
const CLOZE_MODE_KEY = 'frances_cloze_mode';

function getClozeMode(){
  return localStorageSafeGet(CLOZE_MODE_KEY) === 'type' ? 'type' : 'choice';
}

function updateClozeModeSwitch(){
  const btn = document.getElementById('cloze-mode-switch');
  if (btn) btn.setAttribute('aria-checked', getClozeMode() === 'type' ? 'true' : 'false');
}

document.getElementById('cloze-mode-switch').addEventListener('click', () => {
  const next = getClozeMode() === 'type' ? 'choice' : 'type';
  localStorageSafeSet(CLOZE_MODE_KEY, next);
  updateClozeModeSwitch();
});
updateClozeModeSwitch();

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
  await loadStateAndRender();
}

async function loadStateAndRender(){
  await loadState();
  renderTopbarStats();
  renderUnitsGrid();
  renderExportDeckSelect();
  maybeShowReviewReminder();
  maybeSendStudyReminder();
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

// "Meu perfil" reaproveita a mesma tela de Progresso de sempre — só mudou
// de lugar (estava na barra de abas, agora fica dentro do menu do usuário,
// igual ao Busuu).
document.getElementById('user-profile-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  switchTab('progress');
});

document.getElementById('user-settings-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  document.getElementById('settings-email').textContent = CURRENT_USER?.email || 'Modo convidado';
  document.getElementById('settings-provider').textContent = CURRENT_USER?.app_metadata?.provider === 'google' ? 'Google' : (CURRENT_USER ? 'E-mail e senha' : '—');
  switchTab('settings');
});

// ---------- Persistência: Supabase (usuário logado) ou memória local (convidado) ----------
let saveInFlight = false;
let savePending = false;

// Se uma tentativa de salvar falhar (rede caiu, Supabase fora do ar), o
// aluno precisa saber -- antes disso era só um console.error, e quem
// estivesse jogando não tinha nenhum jeito de perceber que o progresso
// não estava sendo salvo. Um cooldown evita alertar de novo a cada
// chamada de saveState() enquanto o problema persiste (ela é chamada com
// bastante frequência -- XP, conclusão de unidade etc.).
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
    // A linha do usuário é compartilhada com outros apps (mesma tabela `progress`).
    // Lê o que já está salvo e só substitui o namespace deste app, preservando
    // o progresso salvo pelos outros apps sob suas próprias chaves.
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
    }
  }catch(e){
    console.error('Erro ao carregar progresso:', e);
  }
}

function serializeState(){
  return {
    cards: STATE.cards,
    unitProgress: STATE.unitProgress,
    xp: STATE.xp,
    streak: STATE.streak,
    lastStudyDay: STATE.lastStudyDay,
    lastReviewReminderDay: STATE.lastReviewReminderDay,
    activityLog: STATE.activityLog,
    studyGoal: STATE.studyGoal,
    dailyMinutesLog: STATE.dailyMinutesLog,
    totalReviews: STATE.totalReviews,
    daily: STATE.daily,
    checkpointProgress: STATE.checkpointProgress,
    levelTestProgress: STATE.levelTestProgress,
    completedChallenges: STATE.completedChallenges
  };
}

function applySerializedState(data){
  if (!data) return;
  if (data.cards) {
    const byId = {};
    data.cards.forEach(c => byId[c.id] = c);
    STATE.cards.forEach(c => { if (byId[c.id]) Object.assign(c, byId[c.id]); });
  }
  if (data.unitProgress) Object.assign(STATE.unitProgress, data.unitProgress);
  if (typeof data.xp === 'number') STATE.xp = data.xp;
  if (typeof data.streak === 'number') STATE.streak = data.streak;
  if (data.lastStudyDay) STATE.lastStudyDay = data.lastStudyDay;
  if (data.lastReviewReminderDay) STATE.lastReviewReminderDay = data.lastReviewReminderDay;
  if (data.studyGoal) Object.assign(STATE.studyGoal, data.studyGoal);
  if (data.dailyMinutesLog) Object.assign(STATE.dailyMinutesLog, data.dailyMinutesLog);
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.daily) Object.assign(STATE.daily, data.daily);
  if (data.checkpointProgress) Object.assign(STATE.checkpointProgress, data.checkpointProgress);
  if (data.levelTestProgress) Object.assign(STATE.levelTestProgress, data.levelTestProgress);
  if (data.completedChallenges) Object.assign(STATE.completedChallenges, data.completedChallenges);
}

// ---------- SM-2 algorithm (idêntico em espírito ao Anki) ----------
// grade: 0=Errei, 1=Difícil, 2=Bom, 3=Fácil
// Conecta o resultado de um exercício de vocabulário ao mesmo sistema SM-2
// usado pelo Flashcard — sem isso, "palavras aprendidas" (usado no card da
// trilha e na conclusão de unidade) só contava revisões feitas no Flashcard,
// deixando a contagem baixa mesmo depois de completar 100% dos exercícios.
// Cada acerto em exercício conta como um grade "Bom" (equivalente a acertar
// no Flashcard) — não tão generoso quanto "Fácil", mas já efetivamente
// marca a palavra como aprendida (reps > 0).
function registerExerciseCorrect(unit, vocabItem){
  const idx = unit.vocab.indexOf(vocabItem);
  if (idx === -1) return;
  const cardId = `u${unit.id}-v${idx}`;
  const card = STATE.cards.find(c => c.id === cardId);
  if (card && card.reps === 0){
    applySM2(card, 2); // grade 2 = "Bom"
  }
}

function applySM2(card, grade){
  const now = Date.now();
  const DAY = 24*60*60*1000;

  if (grade === 0){
    card.reps = 0;
    card.interval = 0;
    card.lapses += 1;
    card.ef = Math.max(1.3, card.ef - 0.2);
    card.due = now + (10*60*1000);
    return;
  }

  const qMap = { 1: 3, 2: 4, 3: 5 };
  const q = qMap[grade];
  card.ef = Math.max(1.3, card.ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02)));

  card.reps += 1;

  if (card.reps === 1 && !card.firstLearnedDate){
    card.firstLearnedDate = todayStr();
  }

  if (card.reps === 1){
    card.interval = grade === 1 ? 1 : (grade === 2 ? 1 : 3);
  } else if (card.reps === 2){
    card.interval = grade === 1 ? 3 : (grade === 2 ? 6 : 8);
  } else {
    let base = card.interval * card.ef;
    if (grade === 1) base = card.interval * 1.2;
    if (grade === 3) base = card.interval * card.ef * 1.3;
    card.interval = Math.round(base);
  }

  card.due = now + card.interval * DAY;
}

function cardsDueNow(pool){
  const now = Date.now();
  return pool.filter(c => c.due <= now);
}

function newCards(pool){
  return pool.filter(c => c.reps === 0 && c.due === 0);
}

// ---------- Gamificação ----------
const XP_PER_GRADE = { 0: 1, 1: 4, 2: 8, 3: 10 };

function todayStr(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dateStrDaysAgo(days){
  const d = new Date(Date.now() - days*86400000);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function registerStudyToday(){
  const today = todayStr();
  STATE.activityLog[today] = (STATE.activityLog[today] || 0) + 1;

  if (STATE.lastStudyDay === today) return;
  const yStr = dateStrDaysAgo(1);
  if (STATE.lastStudyDay === yStr){
    STATE.streak += 1;
  } else {
    STATE.streak = 1;
  }
  STATE.lastStudyDay = today;
  showStreakCelebration();
}

// ---------- Tela de sequência de streak (estilo Duolingo) ----------
// Aparece uma única vez por dia, na primeira atividade que ativa o streak
// (lição, checkpoint, revisão, jogo de combinar, conjugação...) — nunca de
// novo no mesmo dia, já que registerStudyToday() só chega até aqui na
// primeira chamada depois da virada do dia.
const STREAK_DAY_LABELS = ['dom','seg','ter','qua','qui','sex','sáb'];

function buildStreakWeekData(){
  const days = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days.push({ label: STREAK_DAY_LABELS[d.getDay()], done: !!STATE.activityLog[key], isToday: i === 0 });
  }
  return days;
}

function showStreakCelebration(){
  document.getElementById('streak-days-num').textContent = STATE.streak;
  document.getElementById('streak-week-row').innerHTML = buildStreakWeekData().map(d => `
    <div class="streak-day-item ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}">
      <div class="streak-day-circle">${d.done ? '✓' : ''}</div>
      <div class="streak-day-label">${d.label}</div>
    </div>
  `).join('');
  document.getElementById('streak-modal-overlay').style.display = 'flex';
}

document.getElementById('streak-modal-continue-btn').addEventListener('click', () => {
  document.getElementById('streak-modal-overlay').style.display = 'none';
});

// ---------- Plano de estudo com meta diária (assistente estilo Busuu) ----------
// Estima quantos exercícios faltam pro nível-alvo e, com a meta de minutos/dia
// e os dias da semana escolhidos, calcula uma DATA estimada de conclusão —
// tudo em cima do mesmo modelo de estimativa por exercício usado em
// addStudyMinutes() (não é cronômetro real).
const OBJECTIVE_OPTIONS = [
  { id: 'fun', icon: '🎭', label: 'Diversão e cultura' },
  { id: 'travel', icon: '🌍', label: 'Viagem' },
  { id: 'friends', icon: '💬', label: 'Amigos e familiares' },
  { id: 'work', icon: '💼', label: 'Trabalho' },
  { id: 'education', icon: '🎓', label: 'Educação' }
];

const LEVEL_DESCRIPTIONS = {
  A1: { tier: 'Iniciante', text: 'Fazer e responder a perguntas simples e se apresentar a outras pessoas' },
  A2: { tier: 'Básico', text: 'Participar de conversas simples do dia a dia e falar sobre seus estudos' }
};

const DAY_DEFS = [
  { key: 'mon', label: 'seg' }, { key: 'tue', label: 'ter' }, { key: 'wed', label: 'qua' },
  { key: 'thu', label: 'qui' }, { key: 'fri', label: 'sex' }, { key: 'sat', label: 'sáb' }, { key: 'sun', label: 'dom' }
];
const DAY_KEY_BY_JS_INDEX = ['sun','mon','tue','wed','thu','fri','sat'];
const PT_MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function formatDatePt(date){
  return `${date.getDate()} ${PT_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

function estimateUnitExerciseCount(u){
  if (u.type === 'grammar'){
    return u.grammar?.exercises?.length || 0;
  }
  const phrasesWithBlocks = (u.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  return (u.vocab?.length || 0) + phrasesWithBlocks.length + Math.min(2, phrasesWithBlocks.length) + (u.trueFalseExercises ? 1 : 0);
}

function remainingUnitsForLevels(levels){
  if (!levels || !levels.length) return [];
  return UNITS.filter(u => levels.includes(u.level) && !STATE.unitProgress[u.id]?.completed);
}

function estimateMinutesRemainingForLevels(levels){
  const totalExercises = remainingUnitsForLevels(levels).reduce((sum, u) => sum + estimateUnitExerciseCount(u), 0);
  return Math.round(totalExercises * ESTIMATED_SECONDS_PER_EXERCISE / 60);
}

// Conta pra frente a partir de amanhã, só nos dias da semana marcados, até
// acumular minutos suficientes — devolve a data (não só "em X dias"), igual
// o resumo final do Busuu.
function estimateCompletionDate(minutesRemaining, days, dailyMinutes){
  if (!dailyMinutes) return null;
  if (minutesRemaining === 0) return new Date();
  const sessionsNeeded = Math.ceil(minutesRemaining / dailyMinutes);
  let count = 0;
  for (let i = 0; i < 3650; i++){
    const d = new Date(Date.now() + (i + 1) * 86400000);
    if (days[DAY_KEY_BY_JS_INDEX[d.getDay()]]){
      count++;
      if (count >= sessionsNeeded) return d;
    }
  }
  return null; // nenhum dia da semana selecionado — nunca chega lá
}

function buildMinutesWeekData(){
  const days = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const minutes = STATE.dailyMinutesLog[key] || 0;
    days.push({ label: STREAK_DAY_LABELS[d.getDay()], minutes, done: minutes >= STATE.studyGoal.dailyMinutes && STATE.studyGoal.dailyMinutes > 0, isToday: i === 0 });
  }
  return days;
}

function renderStudyPlanCard(){
  const subEl = document.getElementById('study-plan-sub');
  const bodyEl = document.getElementById('study-plan-body');
  const goal = STATE.studyGoal;

  if (!goal.dailyMinutes || !goal.objective){
    subEl.textContent = 'Defina quanto tempo por dia você quer estudar';
    bodyEl.innerHTML = `<button class="btn btn-primary btn-block" id="study-plan-cta-btn">Definir minha meta</button>`;
    document.getElementById('study-plan-cta-btn').addEventListener('click', openStudyPlanModal);
    return;
  }

  const minutesRemaining = estimateMinutesRemainingForLevels(goal.levels);
  const completionDate = estimateCompletionDate(minutesRemaining, goal.days, goal.dailyMinutes);
  const dateLabel = completionDate ? formatDatePt(completionDate) : null;
  const objLabel = OBJECTIVE_OPTIONS.find(o => o.id === goal.objective)?.label || '';
  const goalText = LEVEL_DESCRIPTIONS[goal.levels[goal.levels.length - 1]]?.text || objLabel;

  const week = buildMinutesWeekData();
  const weekTotal = Math.round(week.reduce((sum, d) => sum + d.minutes, 0));
  const weekGoal = goal.dailyMinutes * 7;
  const pct = weekGoal ? Math.min(100, Math.round((weekTotal / weekGoal) * 100)) : 0;
  const todayMinutes = Math.round(week[6].minutes);

  subEl.textContent = dateLabel ? `Meta até ${dateLabel}` : 'Meta definida';
  bodyEl.innerHTML = `
    <div class="wizard-summary-goal-box">
      <span class="wizard-summary-goal-icon">⏱️</span>
      <div>
        <div class="wizard-summary-goal-label">Sua meta</div>
        <div class="wizard-summary-goal-text">${goalText}</div>
      </div>
    </div>
    <div class="study-plan-ring-row">
      <div class="study-ring" style="--pct:${pct}">
        <div class="study-ring-inner">
          <div class="study-ring-num">${weekTotal}/${weekGoal}</div>
          <div class="study-ring-label">min esta semana</div>
        </div>
      </div>
      <div class="study-plan-today">
        <div class="study-plan-today-label">Meta diária</div>
        <div class="study-plan-today-num">${todayMinutes} / ${goal.dailyMinutes} min</div>
        <div class="study-plan-estimate">${
          dateLabel ? `Nesse ritmo, você alcança sua meta até <strong>${dateLabel}</strong>.` : 'Selecione ao menos um dia da semana pra calcularmos sua meta.'
        }</div>
      </div>
    </div>
    <div class="streak-week-row study-week-row">
      ${week.map(d => `
        <div class="streak-day-item ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}">
          <div class="streak-day-circle">${d.done ? '✓' : ''}</div>
          <div class="streak-day-label">${d.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------- Assistente (wizard) de configuração da meta ----------
const STUDY_WIZARD_STEPS = ['objective', 'level', 'schedule', 'minutes', 'summary'];
let STUDY_WIZARD = null;

function openStudyPlanModal(){
  const goal = STATE.studyGoal;
  STUDY_WIZARD = {
    step: 0,
    objective: goal.objective,
    targetLevel: goal.levels?.length ? goal.levels[goal.levels.length - 1] : LEVELS[0].id,
    days: { ...goal.days },
    hour: goal.hour, minute: goal.minute,
    notifications: goal.notifications,
    dailyMinutes: goal.dailyMinutes || 10
  };
  document.getElementById('study-plan-modal').style.display = 'flex';
  renderStudyWizardStep();
}

function renderStudyWizardStep(){
  const stepName = STUDY_WIZARD_STEPS[STUDY_WIZARD.step];
  if (stepName === 'objective') renderWizardObjectiveStep();
  else if (stepName === 'level') renderWizardLevelStep();
  else if (stepName === 'schedule') renderWizardScheduleStep();
  else if (stepName === 'minutes') renderWizardMinutesStep();
  else if (stepName === 'summary') renderWizardSummaryStep();
}

function advanceWizard(){
  STUDY_WIZARD.step += 1;
  renderStudyWizardStep();
}

function renderWizardObjectiveStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">Qual é o seu principal objetivo ao aprender francês?</div>
    <div class="wizard-option-list">
      ${OBJECTIVE_OPTIONS.map(o => `
        <button class="wizard-option-row ${STUDY_WIZARD.objective === o.id ? 'active' : ''}" data-objective="${o.id}">
          <span class="wizard-option-icon">${o.icon}</span>
          <span class="wizard-option-label">${o.label}</span>
        </button>
      `).join('')}
    </div>
  `;
  bodyEl.querySelectorAll('.wizard-option-row').forEach(btn => {
    btn.addEventListener('click', () => {
      STUDY_WIZARD.objective = btn.dataset.objective;
      advanceWizard();
    });
  });
}

function renderWizardLevelStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">Que nível você quer alcançar?</div>
    <div class="wizard-level-list">
      ${LEVELS.map(l => {
        const desc = LEVEL_DESCRIPTIONS[l.id] || {};
        const active = STUDY_WIZARD.targetLevel === l.id;
        return `
          <button class="wizard-level-row ${active ? 'active' : ''}" data-level="${l.id}">
            <span class="wizard-level-circle">${l.id}</span>
            <span class="wizard-level-text">
              <span class="wizard-level-tier">${desc.tier || ''}</span>
              <span class="wizard-level-desc">${desc.text || ''}</span>
            </span>
          </button>
        `;
      }).join('')}
    </div>
  `;
  bodyEl.querySelectorAll('.wizard-level-row').forEach(btn => {
    btn.addEventListener('click', () => {
      STUDY_WIZARD.targetLevel = btn.dataset.level;
      advanceWizard();
    });
  });
}

function renderWizardScheduleStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">Em quais dias da semana você deseja estudar?</div>
    <div class="wizard-day-row">
      ${DAY_DEFS.map(d => `
        <button class="wizard-day-chip ${STUDY_WIZARD.days[d.key] ? 'active' : ''}" data-day="${d.key}">
          <span class="wizard-day-check">${STUDY_WIZARD.days[d.key] ? '✓' : ''}</span>
          <span class="wizard-day-label">${d.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="wizard-question" style="margin-top:26px;">Que hora do dia você deseja estudar?</div>
    <div class="wizard-time-row">
      <input type="number" min="0" max="23" id="wizard-hour-input" value="${STUDY_WIZARD.hour}">
      <span class="wizard-time-sep">:</span>
      <input type="number" min="0" max="59" step="5" id="wizard-minute-input" value="${String(STUDY_WIZARD.minute).padStart(2,'0')}">
    </div>
    <div class="wizard-notif-row">
      <div class="wizard-notif-text">
        <div class="wizard-notif-title">Notificações</div>
        <div class="wizard-notif-sub">Receber lembretes de quando você deve estudar — só funciona com o navegador aberto (não temos servidor de notificação push).</div>
      </div>
      <button class="pref-switch" id="wizard-notif-switch" role="switch" aria-checked="${STUDY_WIZARD.notifications}"><span class="pref-switch-knob"></span></button>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-continue-btn">Continuar</button>
  `;

  bodyEl.querySelectorAll('.wizard-day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.day;
      STUDY_WIZARD.days[key] = !STUDY_WIZARD.days[key];
      chip.classList.toggle('active', STUDY_WIZARD.days[key]);
      chip.querySelector('.wizard-day-check').textContent = STUDY_WIZARD.days[key] ? '✓' : '';
    });
  });

  document.getElementById('wizard-hour-input').addEventListener('change', (e) => {
    STUDY_WIZARD.hour = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
  });
  document.getElementById('wizard-minute-input').addEventListener('change', (e) => {
    STUDY_WIZARD.minute = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
  });

  const notifSwitch = document.getElementById('wizard-notif-switch');
  notifSwitch.addEventListener('click', () => {
    STUDY_WIZARD.notifications = !STUDY_WIZARD.notifications;
    notifSwitch.setAttribute('aria-checked', STUDY_WIZARD.notifications);
    if (STUDY_WIZARD.notifications && 'Notification' in window && Notification.permission === 'default'){
      Notification.requestPermission();
    }
  });

  document.getElementById('wizard-continue-btn').addEventListener('click', advanceWizard);
}

function renderWizardMinutesStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">Por quanto tempo você deseja estudar?</div>
    <div class="wizard-minutes-sub">Recomendamos 10 minutos por dia.</div>
    <div class="wizard-stepper">
      <button class="wizard-stepper-btn" id="wizard-minutes-minus">−</button>
      <div class="wizard-stepper-value">
        <div class="wizard-stepper-num" id="wizard-minutes-num">${STUDY_WIZARD.dailyMinutes}</div>
        <div class="wizard-stepper-label">minutos por dia</div>
      </div>
      <button class="wizard-stepper-btn" id="wizard-minutes-plus">+</button>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-continue-btn">Continuar</button>
  `;

  document.getElementById('wizard-minutes-minus').addEventListener('click', () => {
    STUDY_WIZARD.dailyMinutes = Math.max(5, STUDY_WIZARD.dailyMinutes - 5);
    document.getElementById('wizard-minutes-num').textContent = STUDY_WIZARD.dailyMinutes;
  });
  document.getElementById('wizard-minutes-plus').addEventListener('click', () => {
    STUDY_WIZARD.dailyMinutes = Math.min(60, STUDY_WIZARD.dailyMinutes + 5);
    document.getElementById('wizard-minutes-num').textContent = STUDY_WIZARD.dailyMinutes;
  });
  document.getElementById('wizard-continue-btn').addEventListener('click', advanceWizard);
}

function renderWizardSummaryStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  const levels = LEVELS.filter((l, i) => i <= LEVELS.findIndex(x => x.id === STUDY_WIZARD.targetLevel)).map(l => l.id);
  const minutesRemaining = estimateMinutesRemainingForLevels(levels);
  const completionDate = estimateCompletionDate(minutesRemaining, STUDY_WIZARD.days, STUDY_WIZARD.dailyMinutes);
  const dateLabel = completionDate ? formatDatePt(completionDate) : 'defina ao menos 1 dia da semana';
  const goalText = LEVEL_DESCRIPTIONS[STUDY_WIZARD.targetLevel]?.text || '';

  bodyEl.innerHTML = `
    <div class="wizard-summary-title">Você alcançará sua meta até <strong>${dateLabel}</strong></div>
    <div class="wizard-summary-goal-box">
      <span class="wizard-summary-goal-icon">⏱️</span>
      <div>
        <div class="wizard-summary-goal-label">Sua meta</div>
        <div class="wizard-summary-goal-text">${goalText}</div>
      </div>
    </div>
    <div class="wizard-summary-plan-header">
      <div class="wizard-summary-plan-title">Seu Plano de Estudo personalizado</div>
      <button class="wizard-summary-edit-btn" id="wizard-edit-btn">Editar</button>
    </div>
    <div class="wizard-day-row wizard-summary-days">
      ${DAY_DEFS.map(d => `
        <div class="wizard-day-chip ${STUDY_WIZARD.days[d.key] ? 'active' : ''}" style="pointer-events:none;">
          <span class="wizard-day-check">${STUDY_WIZARD.days[d.key] ? '✓' : ''}</span>
          <span class="wizard-day-label">${d.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="wizard-summary-stats">
      <div>
        <div class="wizard-summary-stat-label">Duração</div>
        <div class="wizard-summary-stat-value">🕐 ${STUDY_WIZARD.dailyMinutes} minutos por dia</div>
      </div>
      <div>
        <div class="wizard-summary-stat-label">Horário</div>
        <div class="wizard-summary-stat-value">🌅 ${String(STUDY_WIZARD.hour).padStart(2,'0')}:${String(STUDY_WIZARD.minute).padStart(2,'0')}</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-save-btn">Salvar Plano de Estudo</button>
  `;

  document.getElementById('wizard-edit-btn').addEventListener('click', () => {
    STUDY_WIZARD.step = 0;
    renderStudyWizardStep();
  });
  document.getElementById('wizard-save-btn').addEventListener('click', saveStudyWizard);
}

function saveStudyWizard(){
  const goal = STATE.studyGoal;
  goal.objective = STUDY_WIZARD.objective;
  goal.levels = LEVELS.filter((l, i) => i <= LEVELS.findIndex(x => x.id === STUDY_WIZARD.targetLevel)).map(l => l.id);
  goal.days = { ...STUDY_WIZARD.days };
  goal.hour = STUDY_WIZARD.hour;
  goal.minute = STUDY_WIZARD.minute;
  goal.notifications = STUDY_WIZARD.notifications;
  goal.dailyMinutes = STUDY_WIZARD.dailyMinutes;
  saveState();
  document.getElementById('study-plan-modal').style.display = 'none';
  renderStudyPlanCard();
}

document.getElementById('study-plan-edit-btn').addEventListener('click', openStudyPlanModal);
document.getElementById('study-plan-modal-close').addEventListener('click', () => {
  document.getElementById('study-plan-modal').style.display = 'none';
});
document.getElementById('study-plan-modal').addEventListener('click', (e) => {
  if (e.target.id === 'study-plan-modal') document.getElementById('study-plan-modal').style.display = 'none';
});

// Lembrete local best-effort: só dispara se a pessoa tiver o app aberto numa
// janela de ~30min depois do horário escolhido, com permissão já concedida —
// não existe servidor de push aqui, então não há aviso quando o app está
// fechado ou o navegador nem está aberto.
function maybeSendStudyReminder(){
  const goal = STATE.studyGoal;
  if (!goal.notifications || !goal.dailyMinutes) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  if (!goal.days[DAY_KEY_BY_JS_INDEX[now.getDay()]]) return;

  const scheduled = new Date(now);
  scheduled.setHours(goal.hour, goal.minute, 0, 0);
  const diffMin = (now - scheduled) / 60000;
  if (diffMin < 0 || diffMin > 30) return;

  if (localStorageSafeGet('frances_last_study_notif') === todayStr()) return;
  new Notification('Hora de estudar francês! 🇫🇷', {
    body: `Sua meta de hoje: ${goal.dailyMinutes} minutos.`,
    icon: 'icons/icon-192.png'
  });
  localStorageSafeSet('frances_last_study_notif', todayStr());
}

// ---------- Lembrete de revisão acumulada (estilo Busuu) ----------
// Pop-up não bloqueante no rodapé, avisando que há palavras vistas em lições
// mas nunca revisadas se acumulando. Aparece no máximo uma vez por dia, só
// quando o total de cartões pendentes passa de um limiar — pra não incomodar
// quem já revisa em dia.
const REVIEW_REMINDER_THRESHOLD = 15;

function maybeShowReviewReminder(){
  const today = todayStr();
  if (STATE.lastReviewReminderDay === today) return;

  const dueCount = cardsDueNow(eligibleReviewPool()).length;
  if (dueCount < REVIEW_REMINDER_THRESHOLD) return;

  STATE.lastReviewReminderDay = today;
  saveState();

  document.getElementById('review-reminder-count').textContent = dueCount;
  document.getElementById('review-reminder-banner').style.display = 'flex';
}

document.getElementById('review-reminder-dismiss-btn').addEventListener('click', () => {
  document.getElementById('review-reminder-banner').style.display = 'none';
});

document.getElementById('review-reminder-cta-btn').addEventListener('click', () => {
  document.getElementById('review-reminder-banner').style.display = 'none';
  switchTab('review');
  openReviewSession('flashcard');
});

// ---------- Desafios de hoje (estilo Busuu) ----------
// Contadores do dia (zeram sozinhos quando a data muda). Todo dia mostra
// exatamente 3 desafios, um de cada categoria — sorteados de forma
// determinística a partir da data (mudam de dia pra dia, mas são sempre os
// mesmos dentro do mesmo dia):
//   1. Fácil (EASY_CHALLENGES) — uma vitória rápida, garantida todo dia.
//   2. Revisão OU Conjugação (REVISAO_CONJ_CHALLENGES) — sempre puxa o aluno
//      pra uma dessas duas abas, que ele não necessariamente abriria sozinho.
//   3. Geral (GENERAL_CHALLENGES) — mais variado, ligado à Trilha em geral.
function ensureDailyBucket(){
  const today = todayStr();
  if (STATE.daily.date !== today){
    STATE.daily = {
      date: today, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
      grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0,
      conjugationTenses: [], reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0
    };
  }
}

function registerDailyStars(amount){
  ensureDailyBucket();
  STATE.daily.stars += amount;
}
function registerDailyLessonCompleted(scorePct, isGrammar){
  ensureDailyBucket();
  STATE.daily.lessons += 1;
  if (scorePct >= 80) STATE.daily.highScoreLessons += 1;
  if (scorePct >= 100) STATE.daily.perfectLessons += 1;
  if (isGrammar) STATE.daily.grammarLessons += 1;
}
function registerDailyConjugationSession(){
  ensureDailyBucket();
  STATE.daily.conjugationSessions += 1;
}
function registerDailyConjugationCorrect(count){
  ensureDailyBucket();
  STATE.daily.conjugationCorrect += count;
}
function registerDailyConjugationTense(tenseKey){
  ensureDailyBucket();
  if (!STATE.daily.conjugationTenses.includes(tenseKey)){
    STATE.daily.conjugationTenses.push(tenseKey);
  }
}
function registerDailyReviewCard(){
  ensureDailyBucket();
  STATE.daily.reviewsDone += 1;
}
function registerDailySpeedReview(){
  ensureDailyBucket();
  STATE.daily.speedReviewSessions += 1;
}
function registerDailyMatchGame(){
  ensureDailyBucket();
  STATE.daily.matchGamesPlayed += 1;
}

const EASY_CHALLENGES = [
  { id:'streak', icon:'🔥', label:'Mantenha sua sequência de dias viva hoje', target:1, get: () => STATE.lastStudyDay === todayStr() ? 1 : 0 },
  { id:'firstLesson', icon:'🌅', label:'Complete sua primeira lição do dia', target:1, get: d => d.lessons }
];
const REVISAO_CONJ_CHALLENGES = [
  { id:'conj1', icon:'🗣️', label:'Pratique conjugação 1 vez', target:1, get: d => d.conjugationSessions },
  { id:'conjCorrect10', icon:'✅', label:'Acerte 10 formas verbais numa sessão de conjugação', target:10, get: d => d.conjugationCorrect },
  { id:'conjTenses2', icon:'🔤', label:'Pratique conjugação em 2 tempos verbais diferentes', target:2, get: d => d.conjugationTenses.length },
  { id:'reviews15', icon:'🔁', label:'Revise 15 cartões', target:15, get: d => d.reviewsDone },
  { id:'speedReview1', icon:'⚡', label:'Complete uma sessão de Revisão Rápida', target:1, get: d => d.speedReviewSessions },
  { id:'matchGame1', icon:'🎴', label:'Jogue o jogo da memória 1 vez', target:1, get: d => d.matchGamesPlayed }
];
const GENERAL_CHALLENGES = [
  { id:'stars40', icon:'⭐', label:'Ganhe 40 estrelas', target:40, get: d => d.stars },
  { id:'highscore2', icon:'📈', label:'Pontue mais de 80% em 2 lições', target:2, get: d => d.highScoreLessons },
  { id:'perfect1', icon:'🎯', label:'Complete uma lição sem errar', target:1, get: d => d.perfectLessons },
  { id:'lessons5', icon:'📚', label:'Complete 5 lições', target:5, get: d => d.lessons },
  { id:'grammar1', icon:'🧠', label:'Complete 1 unidade de gramática', target:1, get: d => d.grammarLessons }
];

function dailySeed(str){
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function pickDailyFromPool(pool, salt){
  return pool[dailySeed(STATE.daily.date + ':' + salt) % pool.length];
}

function todaysChallenges(){
  ensureDailyBucket();
  return [
    pickDailyFromPool(EASY_CHALLENGES, 'easy'),
    pickDailyFromPool(REVISAO_CONJ_CHALLENGES, 'revcon'),
    pickDailyFromPool(GENERAL_CHALLENGES, 'general')
  ];
}

function renderDailyChallengesScreen(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  document.getElementById('step-back-btn').style.display = 'none';
  document.getElementById('step-progress-fill').style.width = '100%';

  contentEl.innerHTML = `
    <div class="challenges-screen">
      <h2>Desafios de hoje</h2>
      ${todaysChallenges().map(c => {
        const current = Math.min(c.get(STATE.daily), c.target);
        const pct = Math.round((current / c.target) * 100);
        const done = current >= c.target;
        return `
          <div class="challenge-card">
            <div class="challenge-icon">${c.icon}${done ? '<span class="challenge-check">✓</span>' : ''}</div>
            <div class="challenge-body">
              <div class="challenge-label">${c.label}</div>
              <div class="challenge-progress-track"><div class="challenge-progress-fill" style="width:${pct}%"></div></div>
            </div>
            ${done ? '' : `<div class="challenge-count">${current}/${c.target}</div>`}
          </div>
        `;
      }).join('')}
    </div>
  `;
  nextBtn.textContent = 'Continuar →';
  nextBtn.style.display = 'flex';
}

function addXP(amount){
  STATE.xp += amount;
  showToast(`+${amount} XP`);
}

// showToast agora vem de shared/toast.js.

const BADGES = [
  { id:'first_step', name:'Primeiro Passo', icon:'🌱', check: s => s.totalReviews >= 1 },
  { id:'streak_3', name:'3 Dias Seguidos', icon:'🔥', check: s => s.streak >= 3 },
  { id:'streak_7', name:'Uma Semana!', icon:'🥐', check: s => s.streak >= 7 },
  { id:'unit_1', name:'Unidade 1 Completa', icon:'📖', check: s => s.unitProgress['A1-1']?.completed },
  { id:'unit_half', name:'Metade do Caminho', icon:'🗼', check: s => {
      const a1 = UNITS.filter(u => u.level === 'A1');
      return a1.filter(u => s.unitProgress[u.id]?.completed).length >= Math.ceil(a1.length/2);
    } },
  { id:'unit_all', name:'Nível A1 Completo', icon:'🇫🇷', check: s => {
      const a1 = UNITS.filter(u => u.level === 'A1');
      return a1.every(u => s.unitProgress[u.id]?.completed);
    } },
  { id:'xp_100', name:'100 XP', icon:'⭐', check: s => s.xp >= 100 },
  { id:'xp_500', name:'500 XP', icon:'🌟', check: s => s.xp >= 500 },
  { id:'reviews_100', name:'100 Revisões', icon:'💪', check: s => s.totalReviews >= 100 },
];

// ============================================================
// RENDER: Trilha (path)
// ============================================================
function unitCardCounts(unitId){
  const pool = STATE.cards.filter(c => c.unitId === unitId);
  const learned = pool.filter(c => c.reps > 0).length;
  const dueForReview = cardsDueNow(pool.filter(c => c.reps > 0)).length;
  return { total: pool.length, learned, dueForReview };
}

// Unidades de um nível, na ordem — usado tanto pro desbloqueio sequencial
// quanto pra numeração relativa exibida ("Unidade 2 de 16" dentro do nível).
function unitsOfLevel(level){
  return UNITS.filter(u => u.level === level);
}

// Unidades de gramática têm sua própria numeração, separada da sequência
// comunicacional — "Unidade 4" (comunicativa) e "Unidade de gramática 1" não
// competem pelo mesmo número. Retorna a posição de "u" dentro do seu próprio
// tipo (comunicativa ou gramática) e o total desse tipo no nível.
function unitOrdinalInfo(u, levelUnits){
  const isGrammar = u.type === 'grammar';
  const sameType = levelUnits.filter(x => (x.type === 'grammar') === isGrammar);
  const num = sameType.findIndex(x => x.id === u.id) + 1;
  return { num, total: sameType.length };
}

function recalculateUnlockedUnits(){
  LEVELS.forEach(lvl => {
    unitsOfLevel(lvl.id).forEach((u, i) => {
      const prog = STATE.unitProgress[u.id];
      if (i === 0){ prog.unlocked = true; return; }
      const prevId = unitsOfLevel(lvl.id)[i-1].id;
      prog.unlocked = STATE.unitProgress[prevId]?.completed || prog.unlocked;
    });
  });
}

const UNIT_ICONS = {
  'A1-1': '👋', 'A1-2': '🙋', 'A1-3': '🔢', 'A1-g1': '🧠', 'A1-4': '👨‍👩‍👧',
  'A1-g2': '👪', 'A1-5': '🥐', 'A1-6': '⏰', 'A1-g3': '🔄', 'A1-7': '🗓️',
  'A1-8': '🗺️', 'A1-g4': '🌍', 'A1-9': '🌐', 'A1-10': '🛍️', 'A1-11': '🍗',
  'A1-12': '⚖️', 'A1-13': '⛅', 'A1-14': '🚇', 'A1-g5': '🏃', 'A1-15': '🩺',
  'A1-g6': '🙏', 'A1-16': '🎨', 'A1-g7': '📏', 'A1-17': '🏠', 'A1-18': '🛋️',
  'A1-19': '🎬', 'A1-g8': '🔁', 'A1-20': '🕰️', 'A1-g9': '✅'
};

// ---------- Seletor de nível (toggle + modal, estilo Busuu) ----------
function renderLevelSelect(){
  const currentLevelInfo = LEVELS.find(l => l.id === STATE.currentLevel);
  document.getElementById('path-level-title').innerHTML =
    `${currentLevelInfo.label} <span style="color:var(--ink-soft); font-weight:600; font-size:14px;">(${currentLevelInfo.id})</span>`;
}

function renderLevelModalList(){
  const wrap = document.getElementById('level-modal-list');
  wrap.innerHTML = LEVELS.map(lvl => {
    const moduleCount = modulesOfLevel(lvl.id).length;
    const sub = moduleCount ? `${moduleCount} módulo${moduleCount === 1 ? '' : 's'}` : 'Em breve';
    // Se existe um teste de nível que credita ESTE nível ao ser aprovado
    // (ex: o Teste de Nível A1 libera o A2), mostra um chip de atalho embutido
    // na própria linha do nível, pra quem quer pular direto sem passar pelo
    // nível anterior.
    const skipTest = LEVEL_TESTS.find(t => t.nextLevel === lvl.id);
    const skipHTML = skipTest ? `
      <button class="level-skip-chip" data-test="${skipTest.id}" title="${skipTest.title}">🎓 Pular</button>
    ` : '';
    return `
      <div class="level-list-row">
        <button class="level-list-item ${STATE.currentLevel === lvl.id ? 'active' : ''}" data-level="${lvl.id}">
          <div class="level-list-badge">${lvl.id}</div>
          <div>
            <div class="level-list-title">${lvl.label}</div>
            <div class="level-list-sub">${sub}</div>
          </div>
        </button>
        ${skipHTML}
      </div>
    `;
  }).join('');
  wrap.querySelectorAll('.level-list-item').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.currentLevel = btn.dataset.level;
      document.getElementById('level-modal').style.display = 'none';
      renderUnitsGrid();
    });
  });
  wrap.querySelectorAll('.level-skip-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('level-modal').style.display = 'none';
      openLevelTest(btn.dataset.test);
    });
  });
}

document.getElementById('level-toggle-btn').addEventListener('click', () => {
  renderLevelModalList();
  document.getElementById('level-modal').style.display = 'flex';
});
document.getElementById('level-modal-close').addEventListener('click', () => {
  document.getElementById('level-modal').style.display = 'none';
});
document.getElementById('level-modal').addEventListener('click', (e) => {
  if (e.target.id === 'level-modal'){
    document.getElementById('level-modal').style.display = 'none';
  }
});

// ---------- Módulos (estilo Busuu): agrupam unidades em blocos menores ----------
function modulesOfLevel(level){
  return MODULES.filter(m => m.level === level);
}
function moduleUnlocked(module){
  return !!STATE.unitProgress[module.unitIds[0]]?.unlocked;
}
function moduleProgressPct(module){
  const done = module.unitIds.filter(id => STATE.unitProgress[id]?.completed).length;
  return Math.round((done / module.unitIds.length) * 100);
}

function levelTestsOfLevel(level){
  return LEVEL_TESTS.filter(t => t.level === level);
}

function buildLevelTestCard(test){
  const lt = STATE.levelTestProgress[test.id];
  const card = document.createElement('button');
  card.className = 'level-test-card' + (lt.completed ? ' done' : '');
  card.innerHTML = `
    <div class="level-test-icon">🎓</div>
    <div class="level-test-body">
      <div class="level-test-title">${test.title}${lt.completed ? ' <span class="level-test-done-pill">Concluído ✓</span>' : ''}</div>
      <div class="level-test-sub">Já sabe francês nível ${test.level}? Faça esse teste e avance direto pro ${test.nextLevel} — não precisa completar as unidades antes.</div>
    </div>
    <div class="level-test-cta">${lt.completed ? 'Refazer' : 'Começar'} →</div>
  `;
  card.addEventListener('click', () => openLevelTest(test.id));
  return card;
}

function buildUnitCard(u){
  const levelUnits = unitsOfLevel(u.level);
  const prog = STATE.unitProgress[u.id];
  const unlocked = prog.unlocked;
  const { total, learned, dueForReview } = unitCardCounts(u.id);
  const pct = total ? Math.round((learned/total)*100) : 0;
  const reviewLabel = dueForReview > 0 ? `🔁 ${dueForReview} a revisar` : '';

  const isGrammar = u.type === 'grammar';
  const card = document.createElement('button');
  card.className = 'unit-card' + (isGrammar ? ' grammar' : '') + (!unlocked ? ' locked' : '') + (prog.completed ? ' done' : '') + (unlocked && !prog.completed && learned>0 ? ' current' : '');
  const metaHTML = isGrammar
    ? `<div class="unit-meta"><span class="gram-pill">Gramática</span><span>${prog.completed ? 'Concluído' : ''}</span></div>`
    : `<div class="unit-progress-bar"><div class="unit-progress-fill" style="width:${pct}%"></div></div>
       <div class="unit-meta"><span>${reviewLabel}</span><span>${pct}%</span></div>`;
  // Unidades de gramática não mostram um número visível (fica só internamente,
  // via unitOrdinalInfo, pra cálculos como "Gramática X de Y" no cabeçalho —
  // que também não é mais exibido — e pro rótulo de exportação).
  const badgeHTML = prog.completed
    ? `<div class="unit-badge">✓</div>`
    : (isGrammar ? '' : `<div class="unit-badge">${unitOrdinalInfo(u, levelUnits).num}</div>`);
  card.innerHTML = `
    <div class="unit-icon-wrap">
      <div class="unit-icon">${UNIT_ICONS[u.id] || '📖'}</div>
      ${badgeHTML}
    </div>
    <div class="unit-title">${u.title}</div>
    ${metaHTML}
  `;
  if (unlocked){
    card.addEventListener('click', () => openUnitDetail(u.id));
  }
  return card;
}

function buildCheckpointCard(module, unlocked){
  const cp = STATE.checkpointProgress[module.id];
  const card = document.createElement('button');
  card.className = 'unit-card checkpoint' + (!unlocked ? ' locked' : '') + (cp.completed ? ' done' : '');
  card.innerHTML = `
    <div class="unit-icon-wrap">
      <div class="unit-icon">🏆</div>
      ${cp.completed ? `<div class="unit-badge">✓</div>` : ''}
    </div>
    <div class="unit-title">Ponto de verificação</div>
    <div class="unit-meta"><span>${cp.completed ? 'Concluído' : 'Teste seus conhecimentos'}</span></div>
  `;
  if (unlocked){
    card.addEventListener('click', () => openCheckpoint(module.id));
  }
  return card;
}

function renderUnitsGrid(){
  recalculateUnlockedUnits();
  renderLevelSelect();

  const grid = document.getElementById('units-grid');
  const levelModules = modulesOfLevel(STATE.currentLevel);

  if (!levelModules.length){
    grid.innerHTML = `
      <div class="level-empty" style="grid-column: 1 / -1;">
        <div class="big-emoji">🚧</div>
        <h3>Em breve</h3>
        <p>O conteúdo do nível ${STATE.currentLevel} ainda está sendo preparado.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  levelModules.forEach((module, mIdx) => {
    const unlocked = moduleUnlocked(module);
    const pct = moduleProgressPct(module);

    const section = document.createElement('div');
    section.className = 'module-section' + (unlocked ? '' : ' locked');
    section.innerHTML = `
      <div class="module-header">
        <h3>Módulo ${mIdx + 1}: ${module.title}</h3>
        <div class="module-progress-track"><div class="module-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="module-units-grid"></div>
    `;
    const subGrid = section.querySelector('.module-units-grid');
    module.unitIds.forEach(id => {
      subGrid.appendChild(buildUnitCard(UNITS.find(u => u.id === id)));
    });
    subGrid.appendChild(buildCheckpointCard(module, unlocked));

    grid.appendChild(section);
  });

  levelTestsOfLevel(STATE.currentLevel).forEach(test => {
    grid.appendChild(buildLevelTestCard(test));
  });
}

// ============================================================
// LIÇÃO EM PASSOS (Vocabulário → Diálogo → Exercícios)
// ============================================================
const STEP_DEFS = [
  { key: 'vocab', label: 'Vocabulário' },
  { key: 'dialogue', label: 'Diálogo' },
  { key: 'usage', label: 'Dica de uso' },
  { key: 'exercises', label: 'Exercícios' }
];

// Unidades de gramática (type: "grammar") seguem um fluxo próprio, no estilo
// Busuu: uma sequência de telas de explicação (paginadas bloco por bloco,
// como o vocabulário palavra-por-palavra) e depois os exercícios de uso.
const STEP_DEFS_GRAMMAR = [
  { key: 'explanation', label: 'Explicação' },
  { key: 'gramExercises', label: 'Exercícios' }
];

function currentStepDefs(){
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  return (u && u.type === 'grammar') ? STEP_DEFS_GRAMMAR : STEP_DEFS;
}

// A cada 3 palavras novas, intercala uma checagem rápida de reconhecimento
// das palavras já mostradas — quebra a sequência pura de cards novos, que
// ficava cansativa com muito vocabulário seguido sem nenhuma interação.
const VOCAB_QUIZ_INTERVAL = 3;

const STEP_STATE = {
  currentStep: 0,
  vocabIndex: 0,
  vocabUnitId: null,
  vocabQuizActive: false,
  exerciseList: [],
  exerciseIndex: 0,
  exerciseScore: 0,
  exerciseAnswered: false,
  explanationIndex: 0,
  explanationUnitId: null,
  gramExerciseUnitId: null,
  gramExerciseIndex: 0,
  gramExerciseScore: 0,
  onChallengesScreen: false,
  onCheckpoint: null,
  onLevelTest: null
};

function openUnitDetail(unitId){
  STATE.currentUnitId = unitId;
  STATE.unitProgress[unitId].started = true;
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = null;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';
  document.getElementById('step-progress-wrap').style.display = '';
  document.getElementById('step-back-btn').style.display = '';

  const u = UNITS.find(x => x.id === unitId);
  const levelUnits = unitsOfLevel(u.level);
  // Unidades de gramática não mostram numeração ao aluno — só "Gramática",
  // sem "X de Y" (o cálculo interno via unitOrdinalInfo continua existindo,
  // só não é mais renderizado aqui).
  const eyebrowLabel = u.type === 'grammar'
    ? 'Gramática'
    : `Unidade ${unitOrdinalInfo(u, levelUnits).num} de ${unitOrdinalInfo(u, levelUnits).total}`;
  document.getElementById('ud-eyebrow').textContent = `${eyebrowLabel} · ${u.level}`;
  document.getElementById('ud-title').textContent = u.title;
  document.getElementById('ud-goal').textContent = u.goal;

  STEP_STATE.currentStep = 0;
  renderStep();

  saveState();
  renderTopbarStats();
}

document.getElementById('back-to-path').addEventListener('click', () => {
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = null;
  setLessonFocusMode(false);
  document.getElementById('path-list-wrap').style.display = 'block';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  renderUnitsGrid();
});

function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const defs = currentStepDefs();
  const pct = (STEP_STATE.currentStep / (defs.length - 1)) * 100;
  fillEl.style.width = `${pct}%`;
}

// ---------- Modo foco de lição (estilo Busuu) ----------
// Esconde topbar/tabs enquanto o aluno está numa lição, checkpoint ou teste
// de nível — só a barra de progresso, o ícone de dicas e o X ficam visíveis
// por cima do exercício em si.
function setLessonFocusMode(active){
  document.getElementById('app').classList.toggle('lesson-focus', active);
  if (!active){
    document.getElementById('lesson-hint-panel').style.display = 'none';
    document.getElementById('lesson-hint-btn').classList.remove('active');
  }
}

document.getElementById('lesson-hint-btn').addEventListener('click', () => {
  const panel = document.getElementById('lesson-hint-panel');
  const btn = document.getElementById('lesson-hint-btn');
  const showing = panel.style.display !== 'none';
  panel.style.display = showing ? 'none' : 'block';
  btn.classList.toggle('active', !showing);
});

// ---------- Vocabulário palavra-por-palavra (estilo Memrise) ----------
// Procura um exemplo real de uso da palavra — nas frases da unidade, depois
// nas falas do diálogo (mesmo formato {f, t}) e, se ainda não achar, nas
// unidades anteriores já vistas. Aumenta bastante a cobertura sem inventar
// frase nova nenhuma, só reaproveitando conteúdo que já existe no curso, e
// nunca usa vocabulário que o aluno ainda não viu.
function findMatchingPhrase(word, unit){
  const sourcesOf = u2 => [...(u2.phrases || []), ...((u2.dialogue && u2.dialogue.lines) || [])];
  // Case-insensitive: uma frase que começa com a palavra ("Bonjour !") tem
  // maiúscula inicial e não batia com o vocabulário ("bonjour") sem isso.
  const needle = word.f.toLowerCase();

  const inUnit = sourcesOf(unit).find(p => p.f.toLowerCase().includes(needle));
  if (inUnit) return inUnit;

  const unitIdx = UNITS.findIndex(u2 => u2.id === unit.id);
  for (let i = 0; i < unitIdx; i++){
    const match = sourcesOf(UNITS[i]).find(p => p.f.toLowerCase().includes(needle));
    if (match) return match;
  }
  return null;
}

function renderVocabCardStep(u, contentEl, nextBtn){
  const total = u.vocab.length;
  const idx = STEP_STATE.vocabIndex;
  const v = u.vocab[idx];
  const cardId = `u${u.id}-v${idx}`;
  const card = STATE.cards.find(c => c.id === cardId);
  const alreadyKnown = card && card.reps > 0;
  const matchingPhrase = findMatchingPhrase(v, u);

  const phraseHTML = matchingPhrase ? `
    <div class="vocab-phrase-example">
      <div class="vocab-phrase-label">Na frase</div>
      <div class="vocab-phrase-french">${matchingPhrase.f} ${audioBtnHTML(matchingPhrase.f)}</div>
      <div class="vocab-phrase-trans">${matchingPhrase.t}</div>
    </div>
  ` : '';

  contentEl.innerHTML = `
    <div class="vocab-card-counter">Palavra ${idx + 1} de ${total}</div>
    <div class="vocab-card">
      <div class="vocab-card-word">${v.f} ${audioBtnHTML(v.f)}</div>
      <div class="vocab-card-trans">${v.t}</div>
      <button class="know-btn ${alreadyKnown ? 'known' : ''}" data-card-id="${cardId}" title="Marcar como já sei">
        ${alreadyKnown ? '✓ Já sei' : 'Já sei?'}
      </button>
    </div>
    ${phraseHTML}
  `;

  wireAudioButtons(contentEl);
  wireKnowButtons(contentEl);

  if (canSpeakFrench(v.f)){
    const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
    speakFrench(v.f, mainAudioBtn);
  }

  nextBtn.style.display = 'flex';
  nextBtn.textContent = idx < total - 1 ? 'Próxima palavra →' : 'Continuar →';
}

// Checagem rápida entre cards de vocabulário: testa o reconhecimento de uma
// das últimas palavras mostradas (nunca uma ainda não vista) com múltipla
// escolha, igual ao formato "meaning" dos exercícios normais — só que com
// seu próprio botão de continuar, já que o step-next-btn global fica
// escondido enquanto essa tela estiver ativa.
function renderVocabQuizStep(u, contentEl, nextBtn){
  const idx = STEP_STATE.vocabIndex;
  const groupStart = Math.max(0, idx + 1 - VOCAB_QUIZ_INTERVAL);
  const seenWords = u.vocab.slice(groupStart, idx + 1);
  const target = seenWords[Math.floor(Math.random() * seenWords.length)];
  const distractorPool = u.vocab.filter(v => v !== target);
  const distractors = shuffle(distractorPool).slice(0, 3);
  const options = shuffle([target, ...distractors]);

  contentEl.innerHTML = `
    <div class="vocab-quiz-label">🧠 Checagem rápida</div>
    <div class="exercise-prompt-label">O que significa?</div>
    <div class="exercise-prompt">
      <div class="prompt-french">${target.f}</div>
      ${audioBtnHTML(target.f)}
    </div>
    <div class="exercise-options">${options.map((opt, i) => `
      <button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.t}</div></button>
    `).join('')}</div>
    <button class="btn btn-primary btn-block vocab-quiz-continue" id="vocab-quiz-continue-btn" style="display:none;">Continuar →</button>
  `;

  wireAudioButtons(contentEl);
  if (canSpeakFrench(target.f)) speakFrench(target.f, contentEl.querySelector('.audio-btn'));
  nextBtn.style.display = 'none';

  let answered = false;
  contentEl.querySelectorAll('.exercise-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const chosenIdx = parseInt(btn.dataset.idx);
      contentEl.querySelectorAll('.exercise-option').forEach((b, i) => {
        b.classList.add('disabled');
        if (options[i] === target) b.classList.add('correct');
        else if (i === chosenIdx) b.classList.add('incorrect');
      });
      document.getElementById('vocab-quiz-continue-btn').style.display = 'flex';
    });
  });

  document.getElementById('vocab-quiz-continue-btn').addEventListener('click', () => {
    STEP_STATE.vocabQuizActive = false;
    if (STEP_STATE.vocabIndex < u.vocab.length - 1){
      STEP_STATE.vocabIndex += 1;
    }
    renderStep();
  });
}

// ---------- Unidades de gramática (Explicação em blocos, estilo Busuu → Exercícios) ----------
function renderGramTableHTML(table){
  return `<div class="gram-tables">${Object.entries(table || {}).map(([verb, rows]) => `
    <div class="gram-table">
      <div class="gram-table-title">${verb}</div>
      ${rows.map(r => `
        <div class="gram-table-row">
          <span class="gram-table-pronoun">${r.pronoun}</span>
          <span class="gram-table-form">${r.form}</span>
        </div>
      `).join('')}
    </div>
  `).join('')}</div>`;
}

// Cada bloco é sua própria tela (como uma palavra do vocabulário): título,
// explicação curta e uma caixa de exemplos com divisória entre eles.
function renderGrammarExplanationStep(u, contentEl, nextBtn){
  const blocks = u.grammar.blocks;
  const idx = STEP_STATE.explanationIndex;
  const block = blocks[idx];
  const isLast = idx === blocks.length - 1;

  const examplesHTML = (block.examples && block.examples.length) ? `
    <div class="gram-block-examples">
      ${block.examples.map(ex => `
        <div class="gram-block-example">
          <div class="french">${ex.f} ${audioBtnHTML(ex.f)}</div>
          <div class="trans">${ex.t}</div>
        </div>
      `).join('')}
    </div>` : '';

  contentEl.innerHTML = `
    <div class="gram-block-counter">Passo ${idx + 1} de ${blocks.length}</div>
    <div class="gram-block ${block.wrapup ? 'wrapup' : ''}">
      <h3 class="gram-block-title">${block.title}</h3>
      <p class="gram-block-body">${block.body}</p>
      ${examplesHTML}
      ${block.table ? renderGramTableHTML(block.table) : ''}
    </div>
  `;
  wireAudioButtons(contentEl);
  nextBtn.style.display = 'flex';
  nextBtn.textContent = isLast ? 'Ir para os exercícios →' : 'Continuar →';
}

// ---------- Tela final "Parabéns" (estilo Busuu): estrelas, pontuação e
// recapitulação do vocabulário/frases vistos pela primeira vez na lição ----------
function currentStudentName(){
  if (!CURRENT_USER) return 'Convidado';
  const full = CURRENT_USER.user_metadata?.full_name || CURRENT_USER.email || 'Convidado';
  return full.split(' ')[0].split('@')[0];
}

function lessonStars(pct){
  return Math.max(1, Math.round((pct / 100) * 5));
}

function renderLessonCompleteScreen(contentEl, nextBtn, { correct, total, recapItems, nextLabel }){
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const stars = lessonStars(pct);

  contentEl.innerHTML = `
    <div class="lesson-complete">
      <div class="lesson-complete-icon">👍</div>
      <h2>Parabéns, ${currentStudentName()}!</h2>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">Estrelas</div><div class="lc-stat-value">+${stars} ⭐</div></div>
        <div class="lc-stat"><div class="lc-stat-label">Pontuação</div><div class="lc-stat-value">${pct}%</div></div>
      </div>
      ${recapItems.length ? `
        <div class="lesson-recap">
          <div class="lesson-recap-label">Vocabulário e frases desta lição</div>
          ${recapItems.map(item => `
            <div class="lesson-recap-item">
              <div class="lesson-recap-french">${audioBtnHTML(item.f)}<span>${item.f}</span></div>
              <div class="lesson-recap-trans">${item.t}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  wireAudioButtons(contentEl);
  nextBtn.textContent = nextLabel || 'Concluir unidade ✓';
  nextBtn.style.display = 'flex';
}

// ---------- Tela de conclusão de módulo/nível (checkpoint e teste de nível) ----------
// Diferente da tela de fim de lição normal: não repete vocabulário isolado,
// foca no que o aluno já é capaz de fazer na vida real com o que aprendeu
// (usa o campo `goal` de cada unidade do módulo/nível).
function renderModuleCompleteScreen(contentEl, nextBtn, { passed, title, subtitle, units, scorePct, passThreshold, nextLabel }){
  if (!passed){
    contentEl.innerHTML = `
      <div class="lesson-complete">
        <div class="lesson-complete-icon">💪</div>
        <h2>Quase lá!</h2>
        <p class="module-complete-sub">${subtitle}</p>
        <div class="lesson-complete-stats">
          <div class="lc-stat"><div class="lc-stat-label">Pontuação</div><div class="lc-stat-value">${scorePct}%</div></div>
        </div>
        <p class="module-retry-note">Você precisa de pelo menos ${passThreshold}% pra ser aprovado. Continue estudando as unidades desta seção e tente de novo quando quiser — sem pressa.</p>
      </div>
    `;
    nextBtn.textContent = nextLabel || 'Voltar à trilha';
    nextBtn.style.display = 'flex';
    return;
  }

  const stars = lessonStars(scorePct);
  const goals = units.map(u => u.goal).filter(Boolean);

  contentEl.innerHTML = `
    <div class="module-complete">
      <div class="module-complete-icon">🏆</div>
      <h2>${title}</h2>
      <p class="module-complete-sub">${subtitle}</p>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">Estrelas</div><div class="lc-stat-value">+${stars} ⭐</div></div>
        <div class="lc-stat"><div class="lc-stat-label">Pontuação</div><div class="lc-stat-value">${scorePct}%</div></div>
      </div>
      <div class="module-skills">
        <div class="module-skills-label">Agora você já sabe, na vida real:</div>
        ${goals.map(g => `
          <div class="module-skill-item"><span class="module-skill-check">✓</span><span>${g}</span></div>
        `).join('')}
      </div>
    </div>
  `;
  nextBtn.textContent = nextLabel || 'Continuar →';
  nextBtn.style.display = 'flex';
}

function renderGrammarExerciseStep(u, contentEl, nextBtn){
  const list = u.grammar.exercises;
  const total = list.length;

  if (STEP_STATE.gramExerciseIndex >= total){
    const seen = new Set();
    const recapItems = u.grammar.blocks.flatMap(b => b.examples || [])
      .filter(ex => seen.has(ex.f) ? false : (seen.add(ex.f), true));
    renderLessonCompleteScreen(contentEl, nextBtn, {
      correct: STEP_STATE.gramExerciseScore, total, recapItems
    });
    return;
  }

  const ex = list[STEP_STATE.gramExerciseIndex];
  nextBtn.style.display = 'none';

  contentEl.innerHTML = `
    <div class="conj-progress">Frase ${STEP_STATE.gramExerciseIndex + 1} de ${total}</div>
    <div class="gram-exercise">
      <div class="gram-exercise-prompt">${ex.prompt}</div>
      ${ex.hint ? `<div class="gram-exercise-hint">${ex.hint}</div>` : ''}
      <input type="text" id="gram-exercise-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a forma correta">
      <div class="expected" id="gram-exercise-expected"></div>
    </div>
    <button class="btn btn-primary btn-block" id="gram-exercise-verify-btn">Verificar</button>
  `;

  const inputEl = document.getElementById('gram-exercise-input');
  inputEl.focus();
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('gram-exercise-verify-btn').click();
  });

  document.getElementById('gram-exercise-verify-btn').addEventListener('click', () => {
    const given = inputEl.value;
    const expected = ex.answer;
    const wrapEl = contentEl.querySelector('.gram-exercise');
    const expectedEl = document.getElementById('gram-exercise-expected');
    inputEl.disabled = true;

    if (given.trim() === expected.trim()){
      wrapEl.classList.add('ok');
      STEP_STATE.gramExerciseScore += 1;
    } else if (normalizeLoose(given) === normalizeLoose(expected)){
      wrapEl.classList.add('almost');
      expectedEl.textContent = `Quase! → ${expected}`;
      STEP_STATE.gramExerciseScore += 0.5;
    } else {
      wrapEl.classList.add('wrong');
      expectedEl.textContent = `→ ${expected}`;
    }

    document.getElementById('gram-exercise-verify-btn').style.display = 'none';
    const goNextBtn = document.createElement('button');
    goNextBtn.className = 'btn btn-secondary btn-block';
    goNextBtn.textContent = STEP_STATE.gramExerciseIndex < total - 1 ? 'Próxima frase →' : 'Ver resultado →';
    goNextBtn.addEventListener('click', () => {
      STEP_STATE.gramExerciseIndex += 1;
      renderGrammarExerciseStep(u, contentEl, nextBtn);
    });
    contentEl.appendChild(goNextBtn);
  });
}

function renderStep(){
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;
  const contentEl = document.getElementById('step-content');
  const backBtn = document.getElementById('step-back-btn');
  const nextBtn = document.getElementById('step-next-btn');

  renderStepProgress();
  const showBack = STEP_STATE.currentStep > 0
    || (stepKey === 'vocab' && STEP_STATE.vocabIndex > 0)
    || (stepKey === 'explanation' && STEP_STATE.explanationIndex > 0);
  backBtn.style.display = showBack ? 'inline-flex' : 'none';

  if (u.type === 'grammar'){
    if (stepKey === 'explanation'){
      if (STEP_STATE.explanationUnitId !== u.id){
        STEP_STATE.explanationIndex = 0;
        STEP_STATE.explanationUnitId = u.id;
      }
      renderGrammarExplanationStep(u, contentEl, nextBtn);
    } else if (stepKey === 'gramExercises'){
      if (STEP_STATE.gramExerciseUnitId !== u.id){
        STEP_STATE.gramExerciseUnitId = u.id;
        STEP_STATE.gramExerciseIndex = 0;
        STEP_STATE.gramExerciseScore = 0;
      }
      renderGrammarExerciseStep(u, contentEl, nextBtn);
    }
    return;
  }

  if (stepKey === 'vocab'){
    if (STEP_STATE.vocabUnitId !== u.id){
      STEP_STATE.vocabIndex = 0;
      STEP_STATE.vocabUnitId = u.id;
      STEP_STATE.vocabQuizActive = false;
    }
    if (STEP_STATE.vocabQuizActive){
      renderVocabQuizStep(u, contentEl, nextBtn);
    } else {
      renderVocabCardStep(u, contentEl, nextBtn);
    }

  } else if (stepKey === 'exercises'){
    if (!STEP_STATE.exerciseList.length || STEP_STATE.exerciseUnitId !== u.id){
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseUnitId = u.id;
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
    }
    renderExerciseStep();

  } else if (stepKey === 'dialogue'){
    contentEl.innerHTML = `
      <div class="section-label">Diálogo</div>
      <div class="dialogue-box" id="ud-dialogue"></div>
    `;
    const dialogueEl = document.getElementById('ud-dialogue');
    dialogueEl.innerHTML = `<div class="dialogue-title">${u.dialogue.title}</div>` +
      u.dialogue.lines.map(l => `
        <div class="dialogue-line">
          <div class="dialogue-spk">${l.spk}</div>
          <div class="dialogue-content">
            <div class="french">${l.f} ${audioBtnHTML(l.f)}</div>
            <div class="trans">${l.t}</div>
          </div>
        </div>
      `).join('');
    wireAudioButtons(dialogueEl);
    nextBtn.textContent = 'Continuar →';
    nextBtn.style.display = 'flex';

  } else if (stepKey === 'usage'){
    const note = u.usageNote;
    contentEl.innerHTML = `
      <div class="usage-note">
        <div class="usage-note-title">${note.title} 🤔</div>
        <p class="usage-note-body">${note.body}</p>
      </div>
    `;
    nextBtn.textContent = 'Continuar →';
    nextBtn.style.display = 'flex';
  }
}

document.getElementById('step-back-btn').addEventListener('click', () => {
  const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;

  if (stepKey === 'vocab' && STEP_STATE.vocabQuizActive){
    STEP_STATE.vocabQuizActive = false;
    renderStep();
    return;
  }

  if (stepKey === 'vocab' && STEP_STATE.vocabIndex > 0){
    STEP_STATE.vocabIndex -= 1;
    renderStep();
    return;
  }

  if (stepKey === 'explanation' && STEP_STATE.explanationIndex > 0){
    STEP_STATE.explanationIndex -= 1;
    renderStep();
    return;
  }

  if (STEP_STATE.currentStep > 0){
    STEP_STATE.currentStep -= 1;
    renderStep();
  }
});
document.getElementById('step-next-btn').addEventListener('click', () => {
  if (STEP_STATE.onChallengesScreen){
    STEP_STATE.onChallengesScreen = false;
    setLessonFocusMode(false);
    document.getElementById('path-list-wrap').style.display = 'block';
    document.getElementById('unit-detail-wrap').style.display = 'none';
    renderUnitsGrid();
    return;
  }

  if (STEP_STATE.onCheckpoint){
    const module = MODULES.find(m => m.id === STEP_STATE.onCheckpoint);
    if (CHECKPOINT_STATE.lastPct >= CHECKPOINT_PASS_THRESHOLD){
      completeModuleUnits(module, CHECKPOINT_STATE.lastPct);
    }
    STEP_STATE.onCheckpoint = null;
    setLessonFocusMode(false);
    document.getElementById('path-list-wrap').style.display = 'block';
    document.getElementById('unit-detail-wrap').style.display = 'none';
    renderUnitsGrid();
    return;
  }

  if (STEP_STATE.onLevelTest){
    const test = LEVEL_TESTS.find(t => t.id === STEP_STATE.onLevelTest);
    if (LEVEL_TEST_STATE.lastPct >= LEVEL_TEST_PASS_THRESHOLD){
      completeLevelTest(test, LEVEL_TEST_STATE.lastPct);
    }
    STEP_STATE.onLevelTest = null;
    setLessonFocusMode(false);
    document.getElementById('path-list-wrap').style.display = 'block';
    document.getElementById('unit-detail-wrap').style.display = 'none';
    renderUnitsGrid();
    return;
  }

  const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;

  if (stepKey === 'vocab'){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    const isQuizPoint = (STEP_STATE.vocabIndex + 1) % VOCAB_QUIZ_INTERVAL === 0
      && STEP_STATE.vocabIndex < u.vocab.length - 1;
    if (isQuizPoint){
      STEP_STATE.vocabQuizActive = true;
      renderStep();
      return;
    }
    if (STEP_STATE.vocabIndex < u.vocab.length - 1){
      STEP_STATE.vocabIndex += 1;
      renderStep();
      return;
    }
  }

  if (stepKey === 'explanation'){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    if (STEP_STATE.explanationIndex < u.grammar.blocks.length - 1){
      STEP_STATE.explanationIndex += 1;
      renderStep();
      return;
    }
  }

  if (STEP_STATE.currentStep < currentStepDefs().length - 1){
    STEP_STATE.currentStep += 1;
    renderStep();
  } else {
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    const total = u.type === 'grammar' ? u.grammar.exercises.length : STEP_STATE.exerciseList.length;
    const correct = u.type === 'grammar' ? STEP_STATE.gramExerciseScore : STEP_STATE.exerciseScore;
    const scorePct = total ? Math.round((correct / total) * 100) : 100;

    markUnitCompleted(STATE.currentUnitId, scorePct);
    STEP_STATE.onChallengesScreen = true;
    renderDailyChallengesScreen();
  }
});

// ---------- Geração dos exercícios (múltipla escolha + ordenar, estilo Memrise) ----------
// A pergunta sempre mostra a palavra/frase em francês (com áudio) e pede a
// tradução em português como resposta.
function buildExerciseSet(unit){
  const vocabFormats = ['meaning', 'meaning', 'listen'];
  // "Digite o que ouviu" só entra na rotação depois que a palavra já foi
  // vista pelo menos uma vez em múltipla escolha (reps>0 no card de SRS) —
  // igual ao Memrise, nunca pede pra digitar uma palavra ainda não exposta.
  const vocabFormatsExposed = ['meaning', 'type', 'listen'];
  const pool = unit.vocab;

  const vocabExercises = pool.map((item, i) => {
    const cardId = `u${unit.id}-v${i}`;
    const card = STATE.cards.find(c => c.id === cardId);
    const alreadyExposed = card && card.reps > 0;
    const formats = alreadyExposed ? vocabFormatsExposed : vocabFormats;
    const format = formats[i % formats.length];
    const distractors = shuffle(pool.filter(v => v !== item)).slice(0, 3);
    const options = shuffle([item, ...distractors]);
    return { format, item, options };
  });

  // Frases da unidade viram exercício de "ordenar" ou de "cenário" (index par/ímpar),
  // pra variar o formato sem dobrar o total de exercícios por lição.
  const phrasesWithBlocks = (unit.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  const phrasesWithScenario = (unit.phrases || []).filter(p => p.scenario);

  const reorderExercises = [];
  const scenarioExercises = [];
  phrasesWithBlocks.forEach((p, i) => {
    if (p.scenario && i % 2 === 1 && phrasesWithScenario.length >= 3){
      const distractors = shuffle(phrasesWithScenario.filter(x => x !== p)).slice(0, 2);
      scenarioExercises.push({ format: 'scenario', phrase: p, options: shuffle([p, ...distractors]) });
    } else {
      reorderExercises.push({ format: 'reorder', phrase: p, shuffledBlocks: shuffle(p.blocks) });
    }
  });

  const trueFalseExercises = (unit.trueFalseExercises || []).map(tf => ({ format: 'trueFalse', ...tf }));

  // Cloze ("complete a frase"): esconde uma palavra de uma frase já ensinada.
  // Reaproveita as mesmas frases com blocks do reorder/cenário (uma frase pode
  // virar mais de um tipo de exercício ao longo da lição, cada uma numa
  // ocorrência diferente — igual Clozemaster reaproveita frases do corpus).
  const clozeExercises = shuffle(phrasesWithBlocks).slice(0, 2).map(p => {
    const blocks = p.blocks;
    const blankIdx = blocks.length >= 3
      ? 1 + Math.floor(Math.random() * (blocks.length - 1))
      : Math.floor(Math.random() * blocks.length);
    const correctBlock = blocks[blankIdx];

    const unitBlockPool = (unit.phrases || []).flatMap(ph => ph.blocks || []).filter(b => b.f !== correctBlock.f);
    let distractors = shuffle(unitBlockPool).slice(0, 3);
    if (distractors.length < 3){
      const globalPool = UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || []))
        .filter(b => b.f !== correctBlock.f && !distractors.includes(b));
      distractors = distractors.concat(shuffle(globalPool).slice(0, 3 - distractors.length));
    }

    return { format: 'cloze', phrase: p, blankIdx, correctBlock, options: shuffle([correctBlock, ...distractors]) };
  });

  // Limita quantas frases viram exercício de "ordenar" — sem isso, toda frase
  // nova de exemplo (usadas também só pra dar contexto no card de vocabulário)
  // engordava a lição, chegando a 20-30 exercícios numa unidade "simples".
  const REORDER_EXERCISE_CAP = 4;
  const cappedReorderExercises = shuffle(reorderExercises).slice(0, REORDER_EXERCISE_CAP);

  return shuffle([...vocabExercises, ...cappedReorderExercises, ...scenarioExercises, ...trueFalseExercises, ...clozeExercises]);
}

function renderExerciseStep(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const total = STEP_STATE.exerciseList.length;

  if (STEP_STATE.exerciseIndex >= total){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    renderLessonCompleteScreen(contentEl, nextBtn, {
      correct: STEP_STATE.exerciseScore, total,
      recapItems: [...u.vocab, ...(u.phrases || [])]
    });
    return;
  }

  const ex = STEP_STATE.exerciseList[STEP_STATE.exerciseIndex];
  STEP_STATE.exerciseAnswered = false;
  nextBtn.style.display = 'none';

  if (ex.format === 'reorder'){
    renderReorderExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'scenario'){
    renderScenarioExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'trueFalse'){
    renderTrueFalseExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'cloze'){
    renderClozeExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'type'){
    renderVocabTypeExercise(ex, contentEl, nextBtn, total);
  } else {
    renderMultipleChoiceExercise(ex, contentEl, nextBtn, total);
  }
}

// Estimativa de minutos estudados: cada exercício respondido (certo ou errado)
// conta como ESTIMATED_SECONDS_PER_EXERCISE segundos, acumulado por dia — usado
// pelo anel de meta diária. Não é cronômetro real (a pessoa pode demorar mais
// ou menos), é uma aproximação, igual optamos ao invés de medir tempo de tela.
const ESTIMATED_SECONDS_PER_EXERCISE = 20;

function addStudyMinutes(){
  const today = todayStr();
  STATE.dailyMinutesLog[today] = (STATE.dailyMinutesLog[today] || 0) + ESTIMATED_SECONDS_PER_EXERCISE / 60;
  saveState();
}

function goToNextExercise(){
  addStudyMinutes();
  setTimeout(() => {
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  }, 900);
}

// Explicação usada no painel "Por que errei?". Pra exercícios baseados numa
// frase (ordenar, completar, cenário), a dica de uso genérica da unidade
// quase nunca explica o erro específico (ex: ordem das palavras) — o mais
// útil ali é mostrar o significado da própria frase certa. Pros demais
// formatos (vocabulário, verdadeiro/falso), a dica de uso da unidade ainda
// serve de contexto gramatical, já que não temos explicação por item.
function wrongAnswerExplanationHTML(ex){
  if (ex && ex.phrase){
    return `<div class="usage-note-title">O que a frase significa</div><p class="usage-note-body"><strong>${ex.phrase.f}</strong><br>${ex.phrase.t}</p>`;
  }
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const note = u && u.usageNote;
  if (!note) return '';
  return `<div class="usage-note-title">${note.title}</div><p class="usage-note-body">${note.body}</p>`;
}

// Painel de resposta errada (estilo Duolingo): pausa antes de avançar pra
// mostrar a resposta certa e, se o aluno quiser, o porquê — só aparece
// quando ela erra; acertando o fluxo continua rápido como antes.
function showWrongAnswerPanel(contentEl, ex){
  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const explanationHTML = wrongAnswerExplanationHTML(ex);
  const panel = document.createElement('div');
  panel.className = 'wrong-feedback';
  panel.innerHTML = `
    <div class="wrong-feedback-header">❌ Não foi dessa vez</div>
    ${explanationHTML ? `
      <button class="wrong-feedback-toggle" id="why-wrong-btn">Por que errei? 🤔</button>
      <div class="wrong-feedback-explanation" id="wrong-explanation" style="display:none;">${explanationHTML}</div>
    ` : ''}
    <button class="btn btn-primary btn-block wrong-feedback-continue" id="wrong-continue-btn">Continuar →</button>
  `;
  wrap.appendChild(panel);

  panel.querySelector('#why-wrong-btn')?.addEventListener('click', () => {
    const exp = panel.querySelector('#wrong-explanation');
    const btn = panel.querySelector('#why-wrong-btn');
    const isOpen = exp.style.display !== 'none';
    exp.style.display = isOpen ? 'none' : 'block';
    btn.textContent = isOpen ? 'Por que errei? 🤔' : 'Esconder explicação';
  });
  panel.querySelector('#wrong-continue-btn').addEventListener('click', () => {
    addStudyMinutes();
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------- Exercício de múltipla escolha (meaning / listen) ----------
function renderMultipleChoiceExercise(ex, contentEl, nextBtn, total){
  let promptHTML = '';
  if (ex.format === 'meaning'){
    promptHTML = `
      <div class="exercise-prompt-label">O que significa?</div>
      <div class="exercise-prompt">
        <div class="prompt-french">${ex.item.f}</div>
        ${audioBtnHTML(ex.item.f)}
      </div>
    `;
  } else if (ex.format === 'listen'){
    promptHTML = `
      <div class="exercise-prompt-label">Ouça e escolha o significado certo</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(ex.item.f, 'audio-btn-lg')}
        <div class="prompt-audio-hint">toque para ouvir de novo</div>
      </div>
    `;
  }

  const optionsHTML = ex.options.map((opt, i) =>
    `<button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.t}</div></button>`
  ).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      ${promptHTML}
      <div class="exercise-options">${optionsHTML}</div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  if (ex.format === 'listen' && canSpeakFrench(ex.item.f)){
    speakFrench(ex.item.f, contentEl.querySelector('.audio-btn-lg'));
  }

  nextBtn.style.display = 'none';

  function revealAnswer(chosenIdx, isCorrect){
    STEP_STATE.exerciseAnswered = true;
    contentEl.querySelectorAll('.exercise-option').forEach((b, i) => {
      b.classList.add('disabled');
      if (ex.options[i] === ex.item) b.classList.add('correct');
      else if (i === chosenIdx) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    if (isCorrect){
      goToNextExercise();
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  contentEl.querySelectorAll('.exercise-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = ex.options[chosenIdx] === ex.item;
      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(3);
        registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
      }
      revealAnswer(chosenIdx, isCorrect);
    });
  });

  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    revealAnswer(-1, false);
  });
}

// ---------- Exercício de vocabulário "Digite o que ouviu" (ditado) ----------
// Só entra na rotação depois que a palavra já foi vista em múltipla escolha
// pelo menos uma vez (gating em buildExerciseSet) — igual ao Memrise, nunca
// pede pra digitar de ouvido uma palavra ainda não exposta.
function renderVocabTypeExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">Digite o que ouviu</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(ex.item.f, 'audio-btn-lg')}
        <div class="prompt-audio-hint">toque para ouvir de novo</div>
      </div>
      <div class="cloze-type-wrap">
        <input type="text" id="vocab-type-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite em francês">
        <button class="btn btn-primary btn-block" id="vocab-type-verify-btn">Verificar</button>
      </div>
      <div class="vocab-type-answer" id="vocab-type-answer" style="display:none;"></div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  if (canSpeakFrench(ex.item.f)) speakFrench(ex.item.f, contentEl.querySelector('.audio-btn-lg'));
  nextBtn.style.display = 'none';

  const inputEl = document.getElementById('vocab-type-input');
  inputEl.focus();
  const strip = s => normalizeLoose(s).replace(/[.,!?;:'"’]/g, '').trim();

  function finish(isCorrect){
    STEP_STATE.exerciseAnswered = true;
    inputEl.disabled = true;
    document.getElementById('vocab-type-verify-btn').disabled = true;
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(4); // digitar de ouvido vale um pouco mais que só reconhecer em múltipla escolha
      registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
      goToNextExercise();
    } else {
      const answerEl = document.getElementById('vocab-type-answer');
      answerEl.textContent = `Resposta certa: ${ex.item.f}`;
      answerEl.style.display = 'block';
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('vocab-type-verify-btn').click();
  });
  document.getElementById('vocab-type-verify-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    finish(strip(inputEl.value) === strip(ex.item.f));
  });

  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    finish(false);
  });
}

// ---------- Exercício de cenário ("O que você diria...?") ----------
// Testa uso pragmático de uma frase já ensinada: dado um contexto em
// português, escolher entre 3 frases em francês (já vistas na unidade)
// qual é a resposta certa pra situação — não só reconhecer o significado.
function renderScenarioExercise(ex, contentEl, nextBtn, total){
  const optionsHTML = ex.options.map((opt, i) => `
    <button class="scenario-option" data-idx="${i}">
      <span class="scenario-option-num">${i + 1}</span>
      <span class="scenario-option-text">${opt.f}</span>
    </button>
  `).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="scenario-question">${ex.phrase.scenario}</div>
      <div class="scenario-scene">${scenarioSceneHTML(ex.phrase.scenarioEmoji)}</div>
      <div class="scenario-options">${optionsHTML}</div>
    </div>
  `;

  nextBtn.style.display = 'none';

  contentEl.querySelectorAll('.scenario-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      STEP_STATE.exerciseAnswered = true;
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = ex.options[chosenIdx] === ex.phrase;

      contentEl.querySelectorAll('.scenario-option').forEach((b, i) => {
        b.classList.add('disabled');
        if (ex.options[i] === ex.phrase) b.classList.add('correct');
        else if (i === chosenIdx) b.classList.add('incorrect');
      });

      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(4);
        goToNextExercise();
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });
}

// ---------- Exercício de verdadeiro ou falso (uso real, não tradução) ----------
// Mostra uma frase/palavra já ensinada e uma afirmação em português sobre
// QUANDO/COMO ela é usada na vida real; o aluno julga se é verdadeira ou falsa.
function renderTrueFalseExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="tf-scene">
        <div class="tf-scene-emoji">${ex.emoji || '💬'}</div>
        <div class="tf-subject">${ex.subject}</div>
        ${audioBtnHTML(ex.subject)}
      </div>
      <div class="tf-claim">${ex.claim}</div>
      <div class="tf-options">
        <button class="tf-option" data-val="true">✅ Verdadeiro</button>
        <button class="tf-option" data-val="false">❌ Falso</button>
      </div>
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  contentEl.querySelectorAll('.tf-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      STEP_STATE.exerciseAnswered = true;
      const chosen = btn.dataset.val === 'true';
      const isCorrect = chosen === ex.answer;

      contentEl.querySelectorAll('.tf-option').forEach(b => {
        b.classList.add('disabled');
        const val = b.dataset.val === 'true';
        if (val === ex.answer) b.classList.add('correct');
        else if (b === btn) b.classList.add('incorrect');
      });

      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(4);
        goToNextExercise();
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });
}

// ---------- Exercício de completar frase (cloze, estilo Clozemaster) ----------
// Esconde uma palavra de uma frase já ensinada e pede pra completar — múltipla
// escolha ou digitado, de acordo com a preferência salva em getClozeMode().
function renderClozeExercise(ex, contentEl, nextBtn, total){
  const sentenceHTML = ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '<span class="cloze-blank" id="cloze-blank">___</span>' : b.f
  ).join(' ');
  const mode = getClozeMode();

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">Complete a frase</div>
      <div class="cloze-sentence">${sentenceHTML}</div>
      <div class="cloze-audio-row" id="cloze-audio-row"></div>
      <div class="cloze-trans">${ex.phrase.t}</div>
      ${mode === 'type' ? `
        <div class="cloze-type-wrap">
          <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a palavra que falta">
          <button class="btn btn-primary btn-block" id="cloze-verify-btn">Verificar</button>
        </div>
      ` : `
        <div class="cloze-options">${ex.options.map((opt, i) => `<button class="cloze-option" data-idx="${i}">${opt.f}</button>`).join('')}</div>
      `}
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  function finish(isCorrect){
    STEP_STATE.exerciseAnswered = true;
    document.getElementById('cloze-blank').textContent = ex.correctBlock.f;
    document.getElementById('cloze-blank').classList.add(isCorrect ? 'correct' : 'incorrect');

    // O áudio só aparece (e toca sozinho) depois de responder — antes disso
    // ele entregaria a resposta de graça, sem precisar completar a frase.
    const audioRow = document.getElementById('cloze-audio-row');
    audioRow.innerHTML = audioBtnHTML(ex.phrase.f);
    wireAudioButtons(audioRow);
    if (canSpeakFrench(ex.phrase.f)) speakFrench(ex.phrase.f, audioRow.querySelector('.audio-btn'));

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(4);
      goToNextExercise();
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  if (mode === 'type'){
    const inputEl = document.getElementById('cloze-input');
    inputEl.focus();
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('cloze-verify-btn').click();
    });
    document.getElementById('cloze-verify-btn').addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      inputEl.disabled = true;
      const strip = s => normalizeLoose(s).replace(/[.,!?;:'"]/g, '').trim();
      finish(strip(inputEl.value) === strip(ex.correctBlock.f));
    });
  } else {
    contentEl.querySelectorAll('.cloze-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        const chosenIdx = parseInt(btn.dataset.idx);
        const isCorrect = ex.options[chosenIdx] === ex.correctBlock;
        contentEl.querySelectorAll('.cloze-option').forEach((b, i) => {
          b.classList.add('disabled');
          if (ex.options[i] === ex.correctBlock) b.classList.add('correct');
          else if (i === chosenIdx) b.classList.add('incorrect');
        });
        finish(isCorrect);
      });
    });
  }
}

// ---------- Exercício de ordenar palavras (reorder) ----------
function renderReorderExercise(ex, contentEl, nextBtn, total){
  const correctOrder = ex.phrase.blocks;
  const chosenSequence = [];

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">Ordene a frase</div>
      <div class="reorder-answer-slots" id="reorder-answer-slots"></div>
      <div class="reorder-blocks" id="reorder-blocks"></div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  const slotsEl = document.getElementById('reorder-answer-slots');
  const blocksEl = document.getElementById('reorder-blocks');

  function renderSlots(){
    slotsEl.innerHTML = correctOrder.map((_, i) => {
      const chosenBlockIdx = chosenSequence[i];
      if (chosenBlockIdx === undefined){
        return `<div class="reorder-slot empty"></div>`;
      }
      const block = ex.shuffledBlocks[chosenBlockIdx];
      return `<div class="reorder-slot filled" data-seq-pos="${i}"><div class="french">${block.f}</div></div>`;
    }).join('');

    slotsEl.querySelectorAll('.reorder-slot.filled').forEach(slot => {
      slot.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        const pos = parseInt(slot.dataset.seqPos);
        chosenSequence.splice(pos);
        renderSlots();
        renderBlocks();
      });
    });
  }

  function renderBlocks(){
    blocksEl.innerHTML = ex.shuffledBlocks.map((block, i) => {
      const alreadyChosen = chosenSequence.includes(i);
      return `<button class="reorder-block ${alreadyChosen ? 'used' : ''}" data-block-idx="${i}" ${alreadyChosen ? 'disabled' : ''}>
        ${block.f}
      </button>`;
    }).join('');

    blocksEl.querySelectorAll('.reorder-block:not(.used)').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        const blockIdx = parseInt(btn.dataset.blockIdx);
        chosenSequence.push(blockIdx);
        renderSlots();
        renderBlocks();

        if (chosenSequence.length === correctOrder.length){
          checkReorderAnswer();
        }
      });
    });
  }

  function checkReorderAnswer(){
    STEP_STATE.exerciseAnswered = true;
    const isCorrect = chosenSequence.every((blockIdx, pos) =>
      ex.shuffledBlocks[blockIdx] === correctOrder[pos]
    );

    slotsEl.querySelectorAll('.reorder-slot').forEach(slot => {
      slot.classList.add(isCorrect ? 'correct' : 'incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(4);
      addStudyMinutes();
      setTimeout(() => showCorrectReorderPanel(contentEl, ex), 500);
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  renderSlots();
  renderBlocks();
  nextBtn.style.display = 'none';

  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    STEP_STATE.exerciseAnswered = true;
    slotsEl.innerHTML = correctOrder.map(block =>
      `<div class="reorder-slot filled correct"><div class="french">${block.f}</div></div>`
    ).join('');
    blocksEl.querySelectorAll('.reorder-block').forEach(b => b.classList.add('disabled'));
    document.getElementById('exercise-dontknow-btn').classList.add('disabled');
    setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
  });
}

// Painel de acerto do exercício de "ordene a frase" (estilo Duolingo): ao
// contrário dos outros formatos (que avançam rápido acertando), aqui vale a
// pena parar um instante pra mostrar a tradução — montar a ordem certa não
// garante que o aluno entendeu o SENTIDO da frase inteira.
function showCorrectReorderPanel(contentEl, ex){
  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const panel = document.createElement('div');
  panel.className = 'correct-feedback';
  panel.innerHTML = `
    <div class="correct-feedback-header">✅ Muito bem!</div>
    <p class="correct-feedback-trans">${ex.phrase.t}</p>
    <button class="btn btn-primary btn-block correct-feedback-continue" id="correct-continue-btn">Continuar →</button>
  `;
  wrap.appendChild(panel);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  document.getElementById('correct-continue-btn').addEventListener('click', () => {
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  });
}

// ============================================================
// RENDER: Revisão (SRS)
// ============================================================
const SPEED_TIME_LIMIT = 6000;
const SPEED_STATE = {
  active: false,
  queue: [],
  index: 0,
  hearts: 3,
  score: 0,
  streak: 0,
  timerStart: 0,
  timerHandle: null,
  answered: false,
  dailyCounted: false
};

function buildSpeedQueue(){
  const pool = STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started && c.reps > 0);
  return shuffle(pool);
}

function buildSpeedOptions(card){
  const pool = STATE.cards.filter(c => c !== card && c.unitId === card.unitId);
  let distractors = shuffle(pool).slice(0, 3);
  if (distractors.length < 3){
    const extra = shuffle(STATE.cards.filter(c => c !== card && !distractors.includes(c))).slice(0, 3 - distractors.length);
    distractors = distractors.concat(extra);
  }
  return shuffle([card, ...distractors]);
}

function eligibleReviewPool(){
  return STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started);
}

function hardWordsPool(){
  return eligibleReviewPool().filter(c => c.reps > 0 && c.lapses >= 2);
}

function renderReviewModeSelect(){
  const pool = eligibleReviewPool();
  const dueCount = cardsDueNow(pool).length;
  const hardCount = hardWordsPool().length;

  const cardsEl = document.getElementById('review-mode-cards');
  cardsEl.innerHTML = `
    <button class="review-mode-card" id="mode-card-flashcard" ${dueCount === 0 ? 'disabled' : ''}>
      <div class="icon">📇</div>
      <div class="count">${dueCount}</div>
      <div class="name">Flashcard</div>
      <div class="desc">Revisão espaçada clássica</div>
    </button>
    <button class="review-mode-card" id="mode-card-speed" ${pool.filter(c=>c.reps>0).length < 4 ? 'disabled' : ''}>
      <div class="icon">⚡</div>
      <div class="count">${pool.filter(c=>c.reps>0).length}</div>
      <div class="name">Speed Review</div>
      <div class="desc">Contra o relógio</div>
    </button>
    <button class="review-mode-card" id="mode-card-hard" ${hardCount === 0 ? 'disabled' : ''}>
      <div class="icon">🔥</div>
      <div class="count">${hardCount}</div>
      <div class="name">Palavras difíceis</div>
      <div class="desc">As que você mais erra</div>
    </button>
    <button class="review-mode-card" id="mode-card-match" ${pool.filter(c=>c.reps>0).length < 4 ? 'disabled' : ''}>
      <div class="icon">🧩</div>
      <div class="count">${pool.filter(c=>c.reps>0).length}</div>
      <div class="name">Combinar</div>
      <div class="desc">Jogo de pares</div>
    </button>
  `;

  document.getElementById('mode-card-flashcard').addEventListener('click', () => openReviewSession('flashcard'));
  document.getElementById('mode-card-speed').addEventListener('click', () => openReviewSession('speed'));
  document.getElementById('mode-card-hard').addEventListener('click', () => openReviewSession('hard'));
  document.getElementById('mode-card-match').addEventListener('click', () => openReviewSession('match'));
}

function openReviewSession(mode){
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = mode === 'speed' || mode === 'match' ? 'none' : 'block';
  document.getElementById('speed-review-content').style.display = mode === 'speed' ? 'block' : 'none';
  document.getElementById('match-review-content').style.display = mode === 'match' ? 'block' : 'none';

  if (mode === 'flashcard'){
    STATE.reviewSessionUnitFilter = null;
    startReviewSession();
  } else if (mode === 'hard'){
    STATE.reviewSessionUnitFilter = null;
    STATE.reviewQueue = shuffle(hardWordsPool());
    STATE.reviewIndex = 0;
    STATE.reviewShowingAnswer = false;
    renderReviewView();
  } else if (mode === 'match'){
    startMatchGame();
  } else {
    startSpeedReview();
  }
}

document.getElementById('review-back-to-modes').addEventListener('click', () => {
  stopSpeedTimer();
  stopMatchTimer();
  SPEED_STATE.active = false;
  document.getElementById('review-mode-select-wrap').style.display = 'block';
  document.getElementById('review-session-wrap').style.display = 'none';
  renderReviewModeSelect();
});

// ---------- Combinar: jogo de pares (francês <-> tradução) ----------
// Pool: vocabulário já estudado ao menos uma vez (mesma regra do Speed
// Review) — não faz sentido pedir pra combinar uma palavra nunca vista.
const MATCH_STATE = {
  pairs: [],       // [{cardId, front, back}]
  tiles: [],       // [{cardId, side:'front'|'back', text}]
  selected: null,  // tile element selecionado aguardando o par
  matchedCount: 0,
  attempts: 0,     // quantas vezes o aluno tentou um par (acertou ou não)
  busy: false      // trava cliques durante a animação de erro
};

// Placeholder mantido só pra não quebrar as chamadas já existentes
// (review-back-to-modes, switchTab) — o jogo não usa mais timer.
function stopMatchTimer(){}

function startMatchGame(){
  const pool = shuffle(STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started && c.reps > 0));
  const pairCount = Math.min(6, pool.length);
  MATCH_STATE.pairs = pool.slice(0, pairCount);
  MATCH_STATE.tiles = shuffle([
    ...MATCH_STATE.pairs.map(c => ({ cardId: c.id, side: 'front', text: c.front })),
    ...MATCH_STATE.pairs.map(c => ({ cardId: c.id, side: 'back', text: c.back_trans }))
  ]);
  MATCH_STATE.selected = null;
  MATCH_STATE.matchedCount = 0;
  MATCH_STATE.attempts = 0;
  MATCH_STATE.busy = false;

  renderMatchGame();
}

function renderMatchGame(){
  const el = document.getElementById('match-review-content');

  if (MATCH_STATE.pairs.length < 4){
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🧩</div>
        <h3>Vocabulário insuficiente ainda</h3>
        <p>O jogo de Combinar precisa de pelo menos algumas palavras já estudadas com sucesso no Estudo.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="match-header">
      <span class="match-pairs">Pares: ${MATCH_STATE.matchedCount}/${MATCH_STATE.pairs.length}</span>
      <span class="match-attempts">Tentativas: ${MATCH_STATE.attempts}</span>
    </div>
    <div class="match-grid" id="match-grid"></div>
  `;
  renderMatchTiles();
}

function renderMatchTiles(){
  const gridEl = document.getElementById('match-grid');
  gridEl.innerHTML = MATCH_STATE.tiles.map((t, i) => `
    <button class="match-tile" data-idx="${i}" data-card-id="${t.cardId}" data-side="${t.side}">
      <div class="match-tile-inner">
        <div class="match-tile-face match-tile-back"><span>?</span></div>
        <div class="match-tile-face match-tile-front">${t.text}</div>
      </div>
    </button>
  `).join('');

  gridEl.querySelectorAll('.match-tile').forEach(btn => {
    btn.addEventListener('click', () => onMatchTileClick(btn));
  });
}

function onMatchTileClick(btn){
  if (MATCH_STATE.busy) return;
  if (btn.classList.contains('matched') || btn.classList.contains('flipped')) return;

  btn.classList.add('flipped');

  if (!MATCH_STATE.selected){
    MATCH_STATE.selected = btn;
    return;
  }

  const first = MATCH_STATE.selected;
  const second = btn;
  MATCH_STATE.selected = null;
  MATCH_STATE.busy = true;

  const isMatch = first.dataset.cardId === second.dataset.cardId && first.dataset.side !== second.dataset.side;
  MATCH_STATE.attempts += 1;
  document.querySelector('.match-attempts').textContent = `Tentativas: ${MATCH_STATE.attempts}`;

  if (isMatch){
    first.classList.add('match-ok');
    second.classList.add('match-ok');
    MATCH_STATE.matchedCount += 1;
    document.querySelector('.match-pairs').textContent = `Pares: ${MATCH_STATE.matchedCount}/${MATCH_STATE.pairs.length}`;
    addXP(2);

    setTimeout(() => {
      first.classList.add('matched');
      second.classList.add('matched');
      MATCH_STATE.busy = false;

      if (MATCH_STATE.matchedCount === MATCH_STATE.pairs.length){
        registerStudyToday();
        STATE.totalReviews += MATCH_STATE.pairs.length;
        registerDailyMatchGame();
        saveState();
        renderTopbarStats();
        setTimeout(() => {
          document.getElementById('match-review-content').innerHTML = `
            <div class="match-complete">
              <div class="big-emoji">🎉</div>
              <h3>Todos os pares combinados!</h3>
              <div class="score-num">${MATCH_STATE.attempts} tentativa(s)</div>
              <button class="btn btn-primary" id="match-restart-btn">Jogar de novo</button>
            </div>
          `;
          document.getElementById('match-restart-btn').addEventListener('click', startMatchGame);
        }, 300);
      }
    }, 550);
  } else {
    setTimeout(() => {
      first.classList.add('wrong');
      second.classList.add('wrong');
    }, 400);
    setTimeout(() => {
      first.classList.remove('flipped', 'wrong');
      second.classList.remove('flipped', 'wrong');
      MATCH_STATE.busy = false;
    }, 1100);
  }
}

function startSpeedReview(){
  SPEED_STATE.queue = buildSpeedQueue();
  SPEED_STATE.index = 0;
  SPEED_STATE.hearts = 3;
  SPEED_STATE.score = 0;
  SPEED_STATE.streak = 0;
  SPEED_STATE.active = true;
  SPEED_STATE.dailyCounted = false;
  renderSpeedReview();
}

function stopSpeedTimer(){
  if (SPEED_STATE.timerHandle){
    clearInterval(SPEED_STATE.timerHandle);
    SPEED_STATE.timerHandle = null;
  }
}

function renderSpeedReview(){
  const el = document.getElementById('speed-review-content');

  if (SPEED_STATE.queue.length < 4){
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">⚡</div>
        <h3>Vocabulário insuficiente ainda</h3>
        <p>O Speed Review precisa de pelo menos algumas palavras já estudadas com sucesso pelo menos uma vez. Continue estudando unidades e revisando no modo Flashcard.</p>
      </div>
    `;
    return;
  }

  if (SPEED_STATE.hearts <= 0){
    stopSpeedTimer();
    if (!SPEED_STATE.dailyCounted){ SPEED_STATE.dailyCounted = true; registerDailySpeedReview(); }
    el.innerHTML = `
      <div class="speed-gameover">
        <div class="big-emoji">💔</div>
        <h3>Fim de jogo!</h3>
        <div class="score-num">${SPEED_STATE.score} pts</div>
        <p>Você respondeu ${SPEED_STATE.index} palavra(s) nesta rodada.</p>
        <button class="btn btn-primary" id="speed-restart-btn">Jogar de novo</button>
      </div>
    `;
    document.getElementById('speed-restart-btn').addEventListener('click', startSpeedReview);
    return;
  }

  if (SPEED_STATE.index >= SPEED_STATE.queue.length){
    stopSpeedTimer();
    if (!SPEED_STATE.dailyCounted){ SPEED_STATE.dailyCounted = true; registerDailySpeedReview(); }
    el.innerHTML = `
      <div class="speed-gameover">
        <div class="big-emoji">🏆</div>
        <h3>Você revisou tudo disponível!</h3>
        <div class="score-num">${SPEED_STATE.score} pts</div>
        <button class="btn btn-primary" id="speed-restart-btn">Jogar de novo</button>
      </div>
    `;
    document.getElementById('speed-restart-btn').addEventListener('click', startSpeedReview);
    return;
  }

  const card = SPEED_STATE.queue[SPEED_STATE.index];
  const options = buildSpeedOptions(card);
  SPEED_STATE.answered = false;

  const heartsHTML = [0,1,2].map(i => `<span class="${i < SPEED_STATE.hearts ? '' : 'heart-lost'}">❤️</span>`).join('');

  el.innerHTML = `
    <div class="speed-header">
      <div class="speed-hearts">${heartsHTML}</div>
      <div class="speed-score">${SPEED_STATE.score} pts</div>
    </div>
    <div class="speed-timer-track"><div class="speed-timer-fill" id="speed-timer-fill" style="width:100%"></div></div>
    <div class="speed-prompt">
      <div class="french">${card.front}</div>
    </div>
    <div class="speed-options">
      ${options.map((opt, i) => `<button class="speed-option" data-idx="${i}">${opt.back_trans}</button>`).join('')}
    </div>
  `;

  el.querySelectorAll('.speed-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenIdx = parseInt(btn.dataset.idx);
      answerSpeedQuestion(options[chosenIdx] === card, el, chosenIdx);
    });
  });

  runSpeedTimer(el, () => answerSpeedQuestion(false, el));
}

function runSpeedTimer(el, onTimeout){
  stopSpeedTimer();
  SPEED_STATE.timerStart = Date.now();
  const fillEl = document.getElementById('speed-timer-fill');

  SPEED_STATE.timerHandle = setInterval(() => {
    const elapsed = Date.now() - SPEED_STATE.timerStart;
    const pct = Math.max(0, 100 - (elapsed / SPEED_TIME_LIMIT) * 100);
    if (fillEl){
      fillEl.style.width = `${pct}%`;
      fillEl.classList.toggle('urgent', pct < 30);
    }
    if (elapsed >= SPEED_TIME_LIMIT){
      stopSpeedTimer();
      if (!SPEED_STATE.answered) onTimeout();
    }
  }, 80);
}

function answerSpeedQuestion(isCorrect, el, chosenIdx){
  if (SPEED_STATE.answered) return;
  SPEED_STATE.answered = true;
  stopSpeedTimer();

  const elapsed = Date.now() - SPEED_STATE.timerStart;
  const card = SPEED_STATE.queue[SPEED_STATE.index];
  const options = Array.from(el.querySelectorAll('.speed-option'));

  options.forEach((btn, i) => {
    btn.classList.add('disabled');
    if (btn.textContent === card.back_trans) btn.classList.add('correct');
    else if (i === chosenIdx) btn.classList.add('incorrect');
  });

  if (isCorrect){
    const speedBonus = Math.max(10, Math.round(100 * (1 - elapsed / SPEED_TIME_LIMIT)));
    SPEED_STATE.score += speedBonus;
    SPEED_STATE.streak += 1;
    if (SPEED_STATE.streak > 0 && SPEED_STATE.streak % 15 === 0 && SPEED_STATE.hearts < 3){
      SPEED_STATE.hearts += 1;
      showToast('❤️ Vida extra!');
    }
    showToast(`+${speedBonus} pts`);
  } else {
    SPEED_STATE.hearts -= 1;
    SPEED_STATE.streak = 0;
  }

  registerStudyToday();
  SPEED_STATE.index += 1;

  setTimeout(() => renderSpeedReview(), 700);
}

function startReviewSession(){
  const pool = STATE.reviewSessionUnitFilter
    ? STATE.cards.filter(c => c.unitId === STATE.reviewSessionUnitFilter)
    : STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started);

  const due = cardsDueNow(pool);
  let queue = due.slice();
  if (!STATE.reviewSessionUnitFilter){
    const fresh = newCards(pool).slice(0, 10);
    fresh.forEach(c => { if (!queue.includes(c)) queue.push(c); });
  } else {
    const rest = pool.filter(c => !queue.includes(c));
    queue = queue.concat(rest);
  }

  STATE.reviewQueue = shuffle(queue);
  STATE.reviewIndex = 0;
  STATE.reviewShowingAnswer = false;
  renderReviewView();
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function renderReviewView(){
  const el = document.getElementById('review-content');

  if (!STATE.reviewQueue.length){
    const allDue = cardsDueNow(STATE.cards).length;
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">☕</div>
        <h3>${STATE.reviewSessionUnitFilter ? 'Nenhum cartão nesta unidade ainda' : 'Tudo em dia!'}</h3>
        <p>${allDue > 0 ? `Você ainda tem ${allDue} cartão(s) pendente(s) no geral.` : 'Volte mais tarde para sua próxima revisão, ou comece uma nova unidade na trilha.'}</p>
        <button class="btn btn-primary" id="review-start-all">Revisar tudo disponível</button>
      </div>
    `;
    document.getElementById('review-start-all').addEventListener('click', () => {
      STATE.reviewSessionUnitFilter = null;
      startReviewSession();
    });
    return;
  }

  if (STATE.reviewIndex >= STATE.reviewQueue.length){
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🎉</div>
        <h3>Sessão concluída!</h3>
        <p>Você revisou ${STATE.reviewQueue.length} cartão(s) nesta sessão.</p>
        <button class="btn btn-primary" id="review-again">Voltar à trilha</button>
      </div>
    `;
    checkUnitCompletion();
    document.getElementById('review-again').addEventListener('click', () => {
      STATE.reviewSessionUnitFilter = null;
      switchTab('path');
    });
    renderProgressView();
    return;
  }

  const card = STATE.reviewQueue[STATE.reviewIndex];
  const pct = Math.round((STATE.reviewIndex / STATE.reviewQueue.length) * 100);

  el.innerHTML = `
    <div class="review-progress">
      <div class="review-progress-bar"><div class="review-progress-fill" style="width:${pct}%"></div></div>
      <div class="review-progress-count">${STATE.reviewIndex+1} / ${STATE.reviewQueue.length}</div>
    </div>
    <div class="flashcard" id="flashcard">
      <div class="flashcard-tag">${card.unitTitle}</div>
      <div class="flashcard-french">${card.front} ${audioBtnHTML(card.front, 'audio-btn-lg')}</div>
      ${STATE.reviewShowingAnswer ? `
        <div class="divider-line"></div>
        <div class="flashcard-trans">${card.back_trans}</div>
      ` : `<div class="flashcard-hint">toque para ver a resposta</div>`}
    </div>
    ${STATE.reviewShowingAnswer ? `
      <div class="grade-buttons">
        <button class="grade-btn grade-again" data-grade="0">Errei<small>&lt;10min</small></button>
        <button class="grade-btn grade-hard" data-grade="1">Difícil<small>1-3d</small></button>
        <button class="grade-btn grade-good" data-grade="2">Bom<small>6-8d</small></button>
        <button class="grade-btn grade-easy" data-grade="3">Fácil<small>8d+</small></button>
      </div>
    ` : ''}
  `;

  document.getElementById('flashcard').addEventListener('click', () => {
    if (!STATE.reviewShowingAnswer){
      STATE.reviewShowingAnswer = true;
      renderReviewView();
    }
  });

  // Áudio disponível (e tocado automaticamente) em ambos os lados do cartão —
  // frente (francês) e, ao virar, de novo caso o aluno queira reouvir.
  wireAudioButtons(el);
  if (canSpeakFrench(card.front)){
    speakFrench(card.front, el.querySelector('.audio-btn-lg'));
  }

  if (STATE.reviewShowingAnswer){
    el.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gradeCurrentCard(parseInt(btn.dataset.grade));
      });
    });
  }
}

function gradeCurrentCard(grade){
  const card = STATE.reviewQueue[STATE.reviewIndex];
  applySM2(card, grade);
  STATE.totalReviews += 1;
  registerStudyToday();
  registerDailyReviewCard();
  addXP(XP_PER_GRADE[grade]);

  if (grade === 0){
    STATE.reviewQueue.push(card);
  }

  STATE.reviewIndex += 1;
  STATE.reviewShowingAnswer = false;
  saveState();
  renderTopbarStats();
  renderReviewView();
}

function markUnitCompleted(unitId, scorePct){
  if (STATE.unitProgress[unitId].completed) return;
  STATE.unitProgress[unitId].completed = true;
  const u = UNITS.find(x => x.id === unitId);
  const levelUnits = unitsOfLevel(u.level);
  const idx = levelUnits.findIndex(x => x.id === unitId);
  if (idx >= 0 && idx+1 < levelUnits.length){
    STATE.unitProgress[levelUnits[idx+1].id].unlocked = true;
  }
  addXP(25);
  registerStudyToday();
  if (typeof scorePct === 'number'){
    registerDailyStars(lessonStars(scorePct));
    registerDailyLessonCompleted(scorePct, u.type === 'grammar');
  }
  showToast(`Unidade concluída! 🥐`);
  saveState();
}

// ---------- Ponto de verificação (checkpoint) de cada módulo ----------
// Pode ser feito a qualquer momento, mesmo sem ter aberto nenhuma unidade do
// módulo ainda. Se aprovado (nota >= CHECKPOINT_PASS_THRESHOLD), marca todas
// as unidades do módulo como concluídas de uma vez — um jeito do aluno que já
// sabe o conteúdo "pular" o módulo sem precisar abrir unidade por unidade.
const CHECKPOINT_PASS_THRESHOLD = 70;

const CHECKPOINT_STATE = {
  moduleId: null,
  queue: [],
  index: 0,
  score: 0,
  lastPct: 0
};

function buildCheckpointQueue(module){
  const moduleUnits = module.unitIds.map(id => UNITS.find(u => u.id === id));
  let queue = [];
  moduleUnits.forEach(u => {
    if (u.type === 'grammar'){
      u.grammar.exercises.forEach(ex => {
        queue.push({ prompt: ex.prompt, hint: ex.hint, answer: ex.answer });
      });
    } else {
      // Ignora entradas com forma dupla (ex: "français / française") — não
      // dá pra cobrar digitação exata de uma tradução com duas respostas.
      u.vocab.filter(v => !v.f.includes(' / ')).forEach(v => {
        queue.push({ prompt: `Como se diz "${v.t}" em francês?`, hint: null, answer: v.f });
      });
    }
  });
  return shuffle(queue).slice(0, Math.min(12, queue.length));
}

function recordCheckpointAttempt(module, scorePct){
  const cp = STATE.checkpointProgress[module.id];
  cp.bestScore = Math.max(cp.bestScore || 0, scorePct);
  saveState();
}

function completeModuleUnits(module, scorePct){
  module.unitIds.forEach(id => {
    STATE.unitProgress[id].started = true;
    STATE.unitProgress[id].completed = true;
    // Passar no checkpoint/teste de nível é prova de que o aluno já sabe o
    // vocabulário — sem isso, as unidades ficavam marcadas como concluídas
    // mas o contador de palavras aprendidas (baseado no SRS) continuava zerado.
    const u = UNITS.find(x => x.id === id);
    if (u.type !== 'grammar'){
      u.vocab.forEach(v => registerExerciseCorrect(u, v));
    }
  });
  STATE.checkpointProgress[module.id].completed = true;
  STATE.checkpointProgress[module.id].bestScore = Math.max(STATE.checkpointProgress[module.id].bestScore || 0, scorePct);
  addXP(50);
  registerStudyToday();
  registerDailyStars(lessonStars(scorePct));
  registerDailyLessonCompleted(scorePct, false);
  recalculateUnlockedUnits();
  showToast('Ponto de verificação aprovado! 🏆');
  saveState();
}

function openCheckpoint(moduleId){
  const module = MODULES.find(m => m.id === moduleId);
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = moduleId;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';
  document.getElementById('step-back-btn').style.display = 'none';

  document.getElementById('ud-eyebrow').textContent = 'Ponto de verificação';
  document.getElementById('ud-title').textContent = module.title;
  document.getElementById('ud-goal').textContent = 'Teste o que você já sabe desta seção. Se for bem, todas as unidades dela são marcadas como concluídas — não precisa fazer uma por uma.';

  CHECKPOINT_STATE.moduleId = moduleId;
  CHECKPOINT_STATE.queue = buildCheckpointQueue(module);
  CHECKPOINT_STATE.index = 0;
  CHECKPOINT_STATE.score = 0;
  CHECKPOINT_STATE.lastPct = 0;
  renderCheckpointQuizStep();

  renderTopbarStats();
}

function renderCheckpointQuizStep(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const module = MODULES.find(m => m.id === CHECKPOINT_STATE.moduleId);
  const total = CHECKPOINT_STATE.queue.length;
  document.getElementById('step-progress-fill').style.width = `${total ? Math.round((CHECKPOINT_STATE.index / total) * 100) : 0}%`;

  if (CHECKPOINT_STATE.index >= total){
    const pct = total ? Math.round((CHECKPOINT_STATE.score / total) * 100) : 0;
    CHECKPOINT_STATE.lastPct = pct;
    recordCheckpointAttempt(module, pct);
    const passed = pct >= CHECKPOINT_PASS_THRESHOLD;
    const moduleUnits = module.unitIds.map(id => UNITS.find(u => u.id === id));
    renderModuleCompleteScreen(contentEl, nextBtn, {
      passed,
      title: 'Módulo concluído! 🏆',
      subtitle: module.title,
      units: moduleUnits,
      scorePct: pct,
      passThreshold: CHECKPOINT_PASS_THRESHOLD,
      nextLabel: passed ? 'Concluir seção ✓' : 'Voltar à trilha'
    });
    return;
  }

  const ex = CHECKPOINT_STATE.queue[CHECKPOINT_STATE.index];
  nextBtn.style.display = 'none';

  contentEl.innerHTML = `
    <div class="conj-progress">Pergunta ${CHECKPOINT_STATE.index + 1} de ${total}</div>
    <div class="gram-exercise">
      <div class="gram-exercise-prompt">${ex.prompt}</div>
      ${ex.hint ? `<div class="gram-exercise-hint">${ex.hint}</div>` : ''}
      <input type="text" id="checkpoint-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a resposta">
      <div class="expected" id="checkpoint-expected"></div>
    </div>
    <button class="btn btn-primary btn-block" id="checkpoint-verify-btn">Verificar</button>
  `;

  const inputEl = document.getElementById('checkpoint-input');
  inputEl.focus();
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('checkpoint-verify-btn').click();
  });

  document.getElementById('checkpoint-verify-btn').addEventListener('click', () => {
    const given = inputEl.value;
    const expected = ex.answer;
    const wrapEl = contentEl.querySelector('.gram-exercise');
    const expectedEl = document.getElementById('checkpoint-expected');
    inputEl.disabled = true;

    if (given.trim() === expected.trim()){
      wrapEl.classList.add('ok');
      CHECKPOINT_STATE.score += 1;
    } else if (normalizeLoose(given) === normalizeLoose(expected)){
      wrapEl.classList.add('almost');
      expectedEl.textContent = `Quase! → ${expected}`;
      CHECKPOINT_STATE.score += 0.5;
    } else {
      wrapEl.classList.add('wrong');
      expectedEl.textContent = `→ ${expected}`;
    }

    document.getElementById('checkpoint-verify-btn').style.display = 'none';
    const goNextBtn = document.createElement('button');
    goNextBtn.className = 'btn btn-secondary btn-block';
    goNextBtn.textContent = CHECKPOINT_STATE.index < total - 1 ? 'Próxima →' : 'Ver resultado →';
    goNextBtn.addEventListener('click', () => {
      CHECKPOINT_STATE.index += 1;
      renderCheckpointQuizStep();
    });
    contentEl.appendChild(goNextBtn);
  });
}

// ---------- Teste de Nível (prova final, cobre o nível inteiro) ----------
// Diferente do checkpoint de módulo (que cobre só um bloco temático), o
// teste de nível amostra de TODOS os módulos do nível — sempre desbloqueado,
// desde o primeiro acesso, pra quem já sabe o conteúdo pular direto pro
// próximo nível sem passar por nenhuma unidade.
const LEVEL_TEST_PASS_THRESHOLD = 75;
const LEVEL_TEST_QUESTIONS_PER_MODULE = 5;

const LEVEL_TEST_STATE = {
  testId: null,
  queue: [],
  index: 0,
  score: 0,
  lastPct: 0
};

function buildLevelTestQueue(test){
  const levelModules = modulesOfLevel(test.level);
  let queue = [];
  levelModules.forEach(module => {
    const modulePool = buildCheckpointQueue(module); // já embaralhado e limitado a 12
    queue = queue.concat(modulePool.slice(0, LEVEL_TEST_QUESTIONS_PER_MODULE));
  });
  return shuffle(queue);
}

function recordLevelTestAttempt(test, scorePct){
  const lt = STATE.levelTestProgress[test.id];
  lt.bestScore = Math.max(lt.bestScore || 0, scorePct);
  saveState();
}

function completeLevelTest(test, scorePct){
  const levelModules = modulesOfLevel(test.level);
  levelModules.forEach(module => completeModuleUnits(module, scorePct));
  STATE.levelTestProgress[test.id].completed = true;
  STATE.levelTestProgress[test.id].bestScore = Math.max(STATE.levelTestProgress[test.id].bestScore || 0, scorePct);
  addXP(150);
  showToast(`Nível ${test.level} concluído! 🎓`);
  saveState();
}

function openLevelTest(testId){
  const test = LEVEL_TESTS.find(t => t.id === testId);
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = testId;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';
  document.getElementById('step-back-btn').style.display = 'none';

  document.getElementById('ud-eyebrow').textContent = 'Teste de nível';
  document.getElementById('ud-title').textContent = test.title;
  document.getElementById('ud-goal').textContent = `Já sabe francês nível ${test.level}? Faça esse teste — se for bem, todo o nível é marcado como concluído e você já pode seguir direto pro ${test.nextLevel}.`;

  LEVEL_TEST_STATE.testId = testId;
  LEVEL_TEST_STATE.queue = buildLevelTestQueue(test);
  LEVEL_TEST_STATE.index = 0;
  LEVEL_TEST_STATE.score = 0;
  LEVEL_TEST_STATE.lastPct = 0;
  renderLevelTestQuizStep();

  renderTopbarStats();
}

function renderLevelTestQuizStep(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const test = LEVEL_TESTS.find(t => t.id === LEVEL_TEST_STATE.testId);
  const total = LEVEL_TEST_STATE.queue.length;
  document.getElementById('step-progress-fill').style.width = `${total ? Math.round((LEVEL_TEST_STATE.index / total) * 100) : 0}%`;

  if (LEVEL_TEST_STATE.index >= total){
    const pct = total ? Math.round((LEVEL_TEST_STATE.score / total) * 100) : 0;
    LEVEL_TEST_STATE.lastPct = pct;
    recordLevelTestAttempt(test, pct);
    const passed = pct >= LEVEL_TEST_PASS_THRESHOLD;
    const levelUnits = modulesOfLevel(test.level)
      .flatMap(m => m.unitIds)
      .map(id => UNITS.find(u => u.id === id));
    renderModuleCompleteScreen(contentEl, nextBtn, {
      passed,
      title: `Nível ${test.level} concluído! 🎓`,
      subtitle: `Você já pode seguir direto pro ${test.nextLevel}`,
      units: levelUnits,
      scorePct: pct,
      passThreshold: LEVEL_TEST_PASS_THRESHOLD,
      nextLabel: passed ? `Concluir nível ${test.level} ✓` : 'Voltar à trilha'
    });
    return;
  }

  const ex = LEVEL_TEST_STATE.queue[LEVEL_TEST_STATE.index];
  nextBtn.style.display = 'none';

  contentEl.innerHTML = `
    <div class="conj-progress">Pergunta ${LEVEL_TEST_STATE.index + 1} de ${total}</div>
    <div class="gram-exercise">
      <div class="gram-exercise-prompt">${ex.prompt}</div>
      ${ex.hint ? `<div class="gram-exercise-hint">${ex.hint}</div>` : ''}
      <input type="text" id="leveltest-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a resposta">
      <div class="expected" id="leveltest-expected"></div>
    </div>
    <button class="btn btn-primary btn-block" id="leveltest-verify-btn">Verificar</button>
  `;

  const inputEl = document.getElementById('leveltest-input');
  inputEl.focus();
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('leveltest-verify-btn').click();
  });

  document.getElementById('leveltest-verify-btn').addEventListener('click', () => {
    const given = inputEl.value;
    const expected = ex.answer;
    const wrapEl = contentEl.querySelector('.gram-exercise');
    const expectedEl = document.getElementById('leveltest-expected');
    inputEl.disabled = true;

    if (given.trim() === expected.trim()){
      wrapEl.classList.add('ok');
      LEVEL_TEST_STATE.score += 1;
    } else if (normalizeLoose(given) === normalizeLoose(expected)){
      wrapEl.classList.add('almost');
      expectedEl.textContent = `Quase! → ${expected}`;
      LEVEL_TEST_STATE.score += 0.5;
    } else {
      wrapEl.classList.add('wrong');
      expectedEl.textContent = `→ ${expected}`;
    }

    document.getElementById('leveltest-verify-btn').style.display = 'none';
    const goNextBtn = document.createElement('button');
    goNextBtn.className = 'btn btn-secondary btn-block';
    goNextBtn.textContent = LEVEL_TEST_STATE.index < total - 1 ? 'Próxima →' : 'Ver resultado →';
    goNextBtn.addEventListener('click', () => {
      LEVEL_TEST_STATE.index += 1;
      renderLevelTestQuizStep();
    });
    contentEl.appendChild(goNextBtn);
  });
}

function checkUnitCompletion(explicitUnitId){
  const unitId = explicitUnitId || STATE.reviewSessionUnitFilter;
  if (!unitId) return;
  const pool = STATE.cards.filter(c => c.unitId === unitId);
  const allLearned = pool.every(c => c.reps > 0);
  if (allLearned){
    markUnitCompleted(unitId);
  }
}

// ============================================================
// RENDER: Progresso / gamificação
// ============================================================
function renderProgressView(){
  renderStudyPlanCard();

  const completedUnits = Object.values(STATE.unitProgress).filter(u=>u.completed).length;
  const totalCards = STATE.cards.length;
  const learnedCards = STATE.cards.filter(c => c.reps > 0).length;
  const dueCount = cardsDueNow(STATE.cards).length;

  const guestWarning = !CURRENT_USER ? `
    <div class="guest-warning">
      ⚠️ Você está no modo convidado — seu progresso <strong>não</strong> será salvo ao fechar a aba.
      <button class="guest-warning-link" id="guest-login-prompt">Entrar com Google para salvar</button>
    </div>
  ` : '';

  document.getElementById('stat-cards').innerHTML = guestWarning + `
    <div class="stat-card"><div class="num">${completedUnits}/${UNITS.length}</div><div class="label">Unidades completas</div></div>
    <div class="stat-card"><div class="num">${learnedCards}/${totalCards}</div><div class="label">Palavras aprendidas</div></div>
    <div class="stat-card"><div class="num">${STATE.streak}</div><div class="label">Dias seguidos</div></div>
    <div class="stat-card"><div class="num">${STATE.totalReviews}</div><div class="label">Revisões totais</div></div>
    <div class="stat-card"><div class="num">${dueCount}</div><div class="label">Pendentes agora</div></div>
    <div class="stat-card"><div class="num">${STATE.xp}</div><div class="label">XP acumulado</div></div>
  `;

  if (!CURRENT_USER){
    document.getElementById('guest-login-prompt')?.addEventListener('click', () => {
      sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
      CURRENT_USER = null;
      showLoginScreen();
    });
  }

  renderActivityHeatmap();
  renderProgressLineChart();

  document.getElementById('badge-grid').innerHTML = BADGES.map(b => {
    const earned = b.check(STATE);
    return `<div class="badge ${earned?'earned':''}"><div class="icon">${b.icon}</div><div class="name">${b.name}</div></div>`;
  }).join('');
}

// ---------- Gráfico de linha: palavras aprendidas ao longo do tempo ----------
function renderProgressLineChart(){
  const wrap = document.getElementById('progress-line-chart-wrap');
  if (!wrap) return;

  const learnedDates = STATE.cards.filter(c => c.firstLearnedDate).map(c => c.firstLearnedDate);

  if (!learnedDates.length){
    wrap.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--ink-soft);"><p>Comece a estudar para ver seu progresso ao longo do tempo aqui.</p></div>`;
    return;
  }

  const countByDate = {};
  learnedDates.forEach(d => { countByDate[d] = (countByDate[d] || 0) + 1; });
  const sortedDates = Object.keys(countByDate).sort();

  let running = 0;
  const points = sortedDates.map(d => {
    running += countByDate[d];
    return { date: d, total: running };
  });

  const W = 600, H = 220, PAD = 36;
  const maxVal = points[points.length - 1].total;
  const minVal = 0;

  const xStep = points.length > 1 ? (W - PAD*2) / (points.length - 1) : 0;
  const yScale = (val) => H - PAD - ((val - minVal) / (maxVal - minVal || 1)) * (H - PAD*2);

  const pathD = points.map((p, i) => {
    const x = PAD + i * xStep;
    const y = yScale(p.total);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const areaD = pathD + ` L ${(PAD + (points.length-1)*xStep).toFixed(1)} ${H-PAD} L ${PAD} ${H-PAD} Z`;

  const labelIndices = points.length > 1 ? [0, Math.floor((points.length-1)/2), points.length-1] : [0];
  const dateLabels = labelIndices.map(i => {
    const [y,m,d] = points[i].date.split('-');
    return { x: PAD + i * xStep, text: `${d}/${m}` };
  });

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="progress-line-svg">
      <line x1="${PAD}" y1="${H-PAD}" x2="${W-PAD}" y2="${H-PAD}" class="chart-axis"/>
      <path d="${areaD}" class="chart-area"/>
      <path d="${pathD}" class="chart-line"/>
      ${points.map((p,i) => `<circle cx="${(PAD + i*xStep).toFixed(1)}" cy="${yScale(p.total).toFixed(1)}" r="3" class="chart-dot"><title>${p.date}: ${p.total} palavras</title></circle>`).join('')}
      ${dateLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H-10}" class="chart-label" text-anchor="middle">${l.text}</text>`).join('')}
    </svg>
    <div class="chart-total">Total acumulado: <strong>${maxVal}</strong> palavras aprendidas</div>
  `;
}

// ---------- Heatmap de atividade diária (estilo GitHub) ----------
function renderActivityHeatmap(){
  const wrap = document.getElementById('heatmap-wrap');
  const WEEKS = 18;
  const totalDays = WEEKS * 7;

  const realDays = [];
  for (let i = totalDays - 1; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const key = `${d.getFullYear()}-${mm}-${dd}`;
    realDays.push({ key, count: STATE.activityLog[key] || 0, date: d, dow: d.getDay() });
  }

  const firstDow = realDays[0].dow;
  const lastDow = realDays[realDays.length-1].dow;
  const startPadding = Array.from({length: firstDow}, () => null);
  const endPadding = Array.from({length: 6 - lastDow}, () => null);
  const days = [...startPadding, ...realDays, ...endPadding];

  const weeks = [];
  for (let i = 0; i < days.length; i += 7){
    weeks.push(days.slice(i, i+7));
  }

  function intensityClass(count){
    if (count === 0) return 'lvl-0';
    if (count <= 3) return 'lvl-1';
    if (count <= 8) return 'lvl-2';
    if (count <= 15) return 'lvl-3';
    return 'lvl-4';
  }

  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    const firstRealDay = week.find(d => d !== null);
    if (firstRealDay){
      const m = firstRealDay.date.getMonth();
      if (m !== lastMonth){
        monthLabels.push({ weekIndex: wi, label: firstRealDay.date.toLocaleDateString('pt-BR', { month:'short' }) });
        lastMonth = m;
      }
    }
  });

  const gridHTML = weeks.map(week => `
    <div class="heatmap-col">
      ${week.map(day => day === null
        ? `<div class="heatmap-cell lvl-0 empty"></div>`
        : `<div class="heatmap-cell ${intensityClass(day.count)}" title="${day.count} atividade(s) em ${day.date.toLocaleDateString('pt-BR')}"></div>`
      ).join('')}
    </div>
  `).join('');

  const labelsHTML = monthLabels.map(m =>
    `<span style="grid-column-start:${m.weekIndex + 1};">${m.label}</span>`
  ).join('');

  wrap.innerHTML = `
    <div class="heatmap-months" style="grid-template-columns: repeat(${weeks.length}, 1fr);">${labelsHTML}</div>
    <div class="heatmap-grid">${gridHTML}</div>
    <div class="heatmap-legend">
      <span>Menos</span>
      <div class="heatmap-cell lvl-0"></div>
      <div class="heatmap-cell lvl-1"></div>
      <div class="heatmap-cell lvl-2"></div>
      <div class="heatmap-cell lvl-3"></div>
      <div class="heatmap-cell lvl-4"></div>
      <span>Mais</span>
    </div>
  `;
}

function renderTopbarStats(){
  document.getElementById('streak-count').textContent = STATE.streak;
  document.getElementById('xp-count').textContent = STATE.xp;
}

// ============================================================
// TABS / navegação
// ============================================================
function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${tab}`).classList.add('active');

  if (tab !== 'review'){
    stopSpeedTimer();
    stopMatchTimer();
  }
  if (tab !== 'dictation'){
    stopDictationAudio();
  }

  if (tab === 'review'){
    if (STATE.reviewSessionUnitFilter){
      document.getElementById('review-mode-select-wrap').style.display = 'none';
      document.getElementById('review-session-wrap').style.display = 'block';
      document.getElementById('review-content').style.display = 'block';
      document.getElementById('speed-review-content').style.display = 'none';
      startReviewSession();
    } else {
      document.getElementById('review-mode-select-wrap').style.display = 'block';
      document.getElementById('review-session-wrap').style.display = 'none';
      renderReviewModeSelect();
    }
  }
  if (tab === 'conjugaison'){ renderConjSelectScreen(); }
  if (tab === 'progress'){ renderProgressView(); }
  if (tab === 'path'){ renderUnitsGrid(); }
  if (tab === 'dictation'){ renderDictationList(); }
  if (tab === 'challenges'){ renderChallengeCategories(); }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================================
// EXPORTAÇÃO .apkg (formato real do Anki via sql.js + JSZip)
// Acessível por um botão na Trilha (não é mais aba própria).
// ============================================================
let exportSelectedUnit = 'all';

document.getElementById('export-open-btn').addEventListener('click', () => {
  renderExportDeckSelect();
  document.getElementById('export-modal').style.display = 'flex';
});
document.getElementById('export-modal-close').addEventListener('click', () => {
  document.getElementById('export-modal').style.display = 'none';
});
document.getElementById('export-modal').addEventListener('click', (e) => {
  if (e.target.id === 'export-modal'){
    document.getElementById('export-modal').style.display = 'none';
  }
});

function renderExportDeckSelect(){
  const wrap = document.getElementById('export-deck-select');
  const options = [{id:'all', label:'Todas as unidades'}].concat(
    UNITS.filter(u => u.type !== 'grammar').map(u => {
      const { num } = unitOrdinalInfo(u, unitsOfLevel(u.level));
      return { id: String(u.id), label: `${u.level} · ${num}. ${u.title}` };
    })
  );
  wrap.innerHTML = options.map(o => `<button class="deck-chip ${exportSelectedUnit===o.id?'active':''}" data-id="${o.id}">${o.label}</button>`).join('');
  wrap.querySelectorAll('.deck-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      exportSelectedUnit = chip.dataset.id;
      renderExportDeckSelect();
    });
  });
}

function randId(){
  return Date.now() + Math.floor(Math.random()*100000);
}

async function generateApkg(){
  const statusEl = document.getElementById('export-status');
  statusEl.textContent = 'Gerando arquivo...';
  statusEl.className = 'export-status';

  try{
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
    const db = new SQL.Database();

    db.run(`
      CREATE TABLE col (
        id integer primary key, crt integer, mod integer, scm integer, ver integer,
        dty integer, usn integer, ls integer, conf text, models text, decks text,
        dconf text, tags text
      );
      CREATE TABLE notes (
        id integer primary key, guid text, mid integer, mod integer, usn integer,
        tags text, flds text, sfld text, csum integer, flags integer, data text
      );
      CREATE TABLE cards (
        id integer primary key, nid integer, did integer, ord integer, mod integer,
        usn integer, type integer, queue integer, due integer, ivl integer,
        factor integer, reps integer, lapses integer, left integer, odue integer,
        odid integer, flags integer, data text
      );
      CREATE TABLE revlog (
        id integer primary key, cid integer, usn integer, ease integer, ivl integer,
        lastIvl integer, factor integer, time integer, type integer
      );
      CREATE TABLE graves (usn integer, oid integer, type integer);
      CREATE INDEX ix_notes_usn ON notes (usn);
      CREATE INDEX ix_cards_usn ON cards (usn);
      CREATE INDEX ix_revlog_usn ON revlog (usn);
      CREATE INDEX ix_cards_nid ON cards (nid);
      CREATE INDEX ix_cards_sched ON cards (did, queue, due);
      CREATE INDEX ix_notes_csum ON notes (csum);
    `);

    const now = Math.floor(Date.now()/1000);
    const modelId = randId();
    const deckId = randId();

    const deckName = exportSelectedUnit === 'all'
      ? 'Francês do Zero - A1'
      : `Francês do Zero - ${UNITS.find(u=>String(u.id)===exportSelectedUnit).title}`;

    const model = {
      [modelId]: {
        id: modelId, name: "Francês do Zero", type: 0, mod: now, usn: -1,
        sortf: 0, did: deckId,
        flds: [
          { name:"Francês", ord:0, font:"Arial", size:22 },
          { name:"Tradução", ord:1, font:"Arial", size:18 }
        ],
        tmpls: [
          {
            name: "Cartão 1", ord:0,
            qfmt: "<div style='text-align:center;font-size:26px;color:#1D5A82;font-weight:bold;'>{{Francês}}</div>",
            afmt: "{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:18px;color:#5C4E73;'>{{Tradução}}</div>",
            bqfmt:"", bafmt:"", did: null
          }
        ],
        css: ".card { font-family: 'Nunito', Arial, sans-serif; text-align: center; background-color: #FAF5EA; color:#201335; }",
        latexPre: "", latexPost: "", latexsvg:false, req: [[0,"any",[0]]]
      }
    };

    const decks = {
      "1": { id:1, name:"Default", extendRev:50, usn:0, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], conf:1, desc:"", dyn:0 },
      [deckId]: { id:deckId, name: deckName, extendRev:50, usn:-1, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], conf:1, desc:"Exportado do app Francês do Zero", dyn:0 }
    };

    const dconf = {
      "1": { id:1, name:"Default", new:{delays:[1,10],ints:[1,4,7],initialFactor:2500,perDay:20,order:1}, rev:{perDay:200,ease4:1.3,fuzz:0.05,ivlFct:1,maxIvl:36500}, lapse:{delays:[10],mult:0,minInt:1,leechFails:8,leechAction:0}, timer:0, misc:{} }
    };

    const conf = { curDeck: deckId, curModel: String(modelId), nextPos:1, sortType:"noteFld", sortBackwards:false, activeDecks:[deckId] };

    db.run(`INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, ?)`, [
      now, now*1000, now*1000,
      JSON.stringify(conf), JSON.stringify(model), JSON.stringify(decks),
      JSON.stringify(dconf), JSON.stringify({})
    ]);

    const exportCards = exportSelectedUnit === 'all'
      ? STATE.cards
      : STATE.cards.filter(c => String(c.unitId) === exportSelectedUnit);

    if (!exportCards.length){
      statusEl.textContent = 'Nenhum cartão para exportar nessa seleção.';
      statusEl.className = 'export-status err';
      return;
    }

    let usnCounter = -1;
    const baseId = Date.now();
    exportCards.forEach((card, i) => {
      const noteId = baseId + (i * 2);
      const cardId = baseId + (i * 2) + 1;
      const flds = [card.front, card.back_trans].join('\x1f');
      const sfld = card.front;
      const csum = simpleChecksum(sfld);
      const guid = `fzc_${card.id}`;

      db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
        noteId, guid, modelId, now, usnCounter, `unidade${card.unitId} `, flds, sfld, csum, 0, ""
      ]);

      db.run(`INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        cardId, noteId, deckId, 0, now, usnCounter,
        0, 0, i, 0, 2500, 0, 0, 0, 0, 0, 0, ""
      ]);
    });

    db.run(`INSERT INTO graves SELECT -1, 0, 0 WHERE 0`);

    const dbBytes = db.export();

    const zip = new JSZip();
    zip.file("collection.anki2", dbBytes);
    zip.file("media", JSON.stringify({}));

    const blob = await zip.generateAsync({ type:"blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frances-do-zero-${exportSelectedUnit === 'all' ? 'completo' : 'unidade-'+exportSelectedUnit}.apkg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    statusEl.textContent = `Exportado! ${exportCards.length} cartão(ões) no arquivo .apkg — importe direto no Anki.`;
    statusEl.className = 'export-status ok';

  }catch(err){
    console.error(err);
    statusEl.textContent = 'Não foi possível gerar o arquivo agora. Tente novamente.';
    statusEl.className = 'export-status err';
  }
}

function simpleChecksum(str){
  let hash = 0;
  for (let i=0;i<str.length;i++){
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100000000;
}

document.getElementById('export-btn').addEventListener('click', generateApkg);

// ============================================================
// CONJUGAÇÃO — seleção livre de tempos + categoria de verbo, sempre as 6 pessoas
// Dados: CONJUGATION_VERBS / CONJUGATION_GROUPS (conjugation-data.js), gerados
// offline a partir do dataset Verbiste (via conjugation-fr) — ver comentário
// no topo desse arquivo de dados. Sem SRS aqui: é sessão livre de prática,
// pontuação de fim de sessão, sem fila de repetição espaçada.
// ============================================================
const CONJ_TENSES = [
  { key: 'presente',       label: 'Présent' },
  { key: 'futurProche',    label: 'Futur proche' }, // construído em runtime (aller + infinitif)
  { key: 'passeCompose',   label: 'Passé composé' },
  { key: 'imperatif',      label: 'Impératif' },     // só tu / nous / vous
  { key: 'imparfait',      label: 'Imparfait' },
  { key: 'futurSimple',    label: 'Futur simple' },
  { key: 'condPresente',   label: 'Conditionnel présent' },
  { key: 'subjPresente',   label: 'Subjonctif présent' },
  { key: 'plusQueParfait', label: 'Plus-que-parfait' }
];

const CONJ_PERSON_LABELS = ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'];

// "je" vira "j'" antes de forma que começa com vogal ou h mudo (j'ai, j'habite) —
// depende do tempo/verbo, não é fixo, então é calculado a partir da forma esperada.
function conjPersonLabel(personIdx, expectedForm){
  if (personIdx !== 0) return CONJ_PERSON_LABELS[personIdx];
  return /^[aeiouâàäéèêëîïôöûüh]/i.test(expectedForm || '') ? "j'" : 'je';
}
// impératif não tem 1ª/3ª pessoa do singular nem 3ª do plural — só tu/nous/vous
const CONJ_IMPERATIF_ACTIVE = [false, true, false, true, true, false];

// Ranking de frequência dos verbos: a ordem em que aparecem no dataset
// (conjugation-data.js) já é do mais comum pro mais raro — usada pelo filtro
// "Número de verbos" abaixo, sem precisar de uma fonte de frequência separada.
const CONJ_VERB_RANK = Object.fromEntries(Object.keys(CONJUGATION_VERBS).map((name, i) => [name, i + 1]));
const CONJ_TOTAL_VERBS = Object.keys(CONJUGATION_VERBS).length;
const CONJ_TOPN_OPTIONS = [10, 25, 50, 100, 150].filter(n => n < CONJ_TOTAL_VERBS);
CONJ_TOPN_OPTIONS.push(CONJ_TOTAL_VERBS); // "Todos"

const CONJ_REGULAR_GROUPS = ['g1', 'g2'];
const CONJ_IRREGULAR_GROUPS = ['core', 'g3ir', 'g3re', 'g3oir'];

const CONJ_SESSION_SIZE = 8; // verbos por sessão — cada página agora cobre todos os tempos escolhidos de uma vez

const CONJ_STATE = {
  selectedTenses: ['presente'],
  selectedGroups: Object.keys(CONJUGATION_GROUPS),
  topN: CONJ_TOTAL_VERBS,
  regularity: null, // null | 'regular' | 'irregular'
  verbQueue: [],
  verbIndex: 0,
  score: 0,
  totalFields: 0,
  checked: null,       // Set<string> — verbos já verificados nesta sessão
  answers: null,       // verbo -> { [tenseKey]: string[] } — respostas dadas, pra re-render ao navegar de volta
  hintLevel: 0          // 0/1/2 — nível de dica na página do verbo atual (não persiste entre verbos)
};

function renderConjSelectScreen(){
  const tenseListEl = document.getElementById('conj-tense-list');
  tenseListEl.innerHTML = CONJ_TENSES.map(t => `
    <label class="conj-check-item">
      <input type="checkbox" data-tense="${t.key}" ${CONJ_STATE.selectedTenses.includes(t.key) ? 'checked' : ''}>
      <span>${t.label}</span>
    </label>
  `).join('');

  const topnSelectEl = document.getElementById('conj-topn-select');
  topnSelectEl.innerHTML = CONJ_TOPN_OPTIONS.map(n =>
    `<option value="${n}" ${CONJ_STATE.topN === n ? 'selected' : ''}>${n === CONJ_TOTAL_VERBS ? `Todos (${n})` : `Top ${n}`}</option>`
  ).join('');

  const regularToggleEl = document.getElementById('conj-toggle-regular');
  const irregularToggleEl = document.getElementById('conj-toggle-irregular');
  regularToggleEl.classList.toggle('active', CONJ_STATE.regularity === 'regular');
  irregularToggleEl.classList.toggle('active', CONJ_STATE.regularity === 'irregular');

  const verbListEl = document.getElementById('conj-verb-list');
  verbListEl.innerHTML = Object.entries(CONJUGATION_GROUPS).map(([key, info]) => `
    <label class="conj-check-item">
      <input type="checkbox" data-group="${key}" ${CONJ_STATE.selectedGroups.includes(key) ? 'checked' : ''}>
      <span>${info.label}<span class="desc">${info.desc}</span></span>
    </label>
  `).join('');

  tenseListEl.querySelectorAll('input[data-tense]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.tense;
      if (cb.checked){
        if (!CONJ_STATE.selectedTenses.includes(key)) CONJ_STATE.selectedTenses.push(key);
      } else {
        CONJ_STATE.selectedTenses = CONJ_STATE.selectedTenses.filter(t => t !== key);
      }
    });
  });

  verbListEl.querySelectorAll('input[data-group]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.group;
      if (cb.checked){
        if (!CONJ_STATE.selectedGroups.includes(key)) CONJ_STATE.selectedGroups.push(key);
      } else {
        CONJ_STATE.selectedGroups = CONJ_STATE.selectedGroups.filter(g => g !== key);
      }
    });
  });
}

// Estes elementos são fixos no HTML (renderConjSelectScreen só atualiza seu
// conteúdo/estado visual, nunca os recria) — por isso os listeners são
// conectados uma única vez aqui fora, e não a cada render. Conectá-los
// dentro de renderConjSelectScreen() empilhava um listener novo a cada
// clique, e como cada um deles também chama renderConjSelectScreen(), o
// número de listeners dobrava a cada clique até travar a aba.
document.getElementById('conj-topn-select').addEventListener('change', function(){
  CONJ_STATE.topN = parseInt(this.value);
});

document.getElementById('conj-toggle-regular').addEventListener('click', () => {
  CONJ_STATE.regularity = CONJ_STATE.regularity === 'regular' ? null : 'regular';
  renderConjSelectScreen();
});

document.getElementById('conj-toggle-irregular').addEventListener('click', () => {
  CONJ_STATE.regularity = CONJ_STATE.regularity === 'irregular' ? null : 'irregular';
  renderConjSelectScreen();
});

document.getElementById('conj-start-btn').addEventListener('click', () => {
  if (!CONJ_STATE.selectedTenses.length || !CONJ_STATE.selectedGroups.length){
    showToast('Escolha ao menos 1 tempo e 1 categoria de verbo');
    return;
  }

  const eligibleVerbs = Object.entries(CONJUGATION_VERBS)
    .filter(([name, v]) => CONJ_STATE.selectedGroups.includes(v.g))
    .filter(([name]) => CONJ_VERB_RANK[name] <= CONJ_STATE.topN)
    .filter(([name, v]) => {
      if (CONJ_STATE.regularity === 'regular') return CONJ_REGULAR_GROUPS.includes(v.g);
      if (CONJ_STATE.regularity === 'irregular') return CONJ_IRREGULAR_GROUPS.includes(v.g);
      return true;
    })
    .map(([name]) => name);

  if (!eligibleVerbs.length){
    showToast('Nenhum verbo nessa seleção');
    return;
  }

  // Fila de prática: um verbo por página, com todos os tempos escolhidos
  // juntos (estilo Verbugata) — embaralhada, limitada por sessão.
  CONJ_STATE.verbQueue = shuffle(eligibleVerbs).slice(0, CONJ_SESSION_SIZE);
  CONJ_STATE.verbIndex = 0;
  CONJ_STATE.score = 0;
  CONJ_STATE.totalFields = 0;
  CONJ_STATE.checked = new Set();
  CONJ_STATE.answers = {};
  CONJ_STATE.hintLevel = 0;

  document.getElementById('conj-select-wrap').style.display = 'none';
  document.getElementById('conj-practice-wrap').style.display = 'block';
  renderConjPracticeStep();
});

document.getElementById('conj-back-to-select').addEventListener('click', () => {
  document.getElementById('conj-select-wrap').style.display = 'block';
  document.getElementById('conj-practice-wrap').style.display = 'none';
  renderConjSelectScreen();
});

// Constrói as 6 formas de um combo verbo+tempo. "futur proche" não vem do
// banco de dados — é montado em runtime (aller no présent + infinitivo do verbo).
function getConjForms(verb, tense){
  if (tense === 'futurProche'){
    const allerPresente = CONJUGATION_VERBS['aller'].f.presente;
    return allerPresente.map(form => form ? `${form} ${verb}` : null);
  }
  return CONJUGATION_VERBS[verb].f[tense];
}

// Normaliza pra comparação "quase certo": remove acentos e ignora maiúsculas.
// Erro de terminal (ex: "prennons" por "prenons") continua contando como errado.
function normalizeLoose(str){
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Algumas formas têm mais de uma grafia aceita, armazenadas juntas separadas
// por "/" (ex: "paie/paye") -- dar só UMA das formas é uma resposta completa,
// não deve ser tratado como diferente da string inteira "paie/paye".
function conjAcceptedForms(expected){
  return (expected || '').split('/').map(s => s.trim()).filter(Boolean);
}

function conjActiveMask(tenseKey){
  return tenseKey === 'imperatif' ? CONJ_IMPERATIF_ACTIVE : [true,true,true,true,true,true];
}

// Dica progressiva: nível 1 mostra só o tamanho da palavra + a terminação
// (últimas 2 letras); nível 2 revela a maior parte das letras, escondendo
// só ~1 em cada 3 posições. Espaços (formas com mais de uma palavra, como
// o futur proche) ficam sempre visíveis.
function conjHintPlaceholder(expected, level){
  if (!expected || !level) return '';
  const chars = expected.split('');
  if (level === 1){
    const revealFrom = Math.max(0, expected.length - 2);
    return chars.map((c, i) => c === ' ' ? ' ' : (i >= revealFrom ? c : '_')).join('');
  }
  return chars.map((c, i) => c === ' ' ? ' ' : (i % 3 === 2 ? '_' : c)).join('');
}

function renderConjPracticeStep(){
  const contentEl = document.getElementById('conj-practice-content');

  if (CONJ_STATE.verbIndex >= CONJ_STATE.verbQueue.length){
    const pct = CONJ_STATE.totalFields ? Math.round((CONJ_STATE.score / CONJ_STATE.totalFields) * 100) : 0;
    registerDailyConjugationSession();
    registerStudyToday();
    contentEl.innerHTML = `
      <div class="conj-session-result">
        <div class="big-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
        <h3>Sessão concluída!</h3>
        <div class="score-num">${Math.round(CONJ_STATE.score)}/${CONJ_STATE.totalFields}</div>
        <p>${pct >= 70 ? 'Muito bem!' : 'Continue praticando essas conjugações.'}</p>
        <button class="btn btn-primary" id="conj-restart-btn">Nova sessão</button>
      </div>
    `;
    document.getElementById('conj-restart-btn').addEventListener('click', () => {
      document.getElementById('conj-select-wrap').style.display = 'block';
      document.getElementById('conj-practice-wrap').style.display = 'none';
      renderConjSelectScreen();
    });
    return;
  }

  const verb = CONJ_STATE.verbQueue[CONJ_STATE.verbIndex];
  const nextVerb = CONJ_STATE.verbQueue[CONJ_STATE.verbIndex + 1];
  const verbInfo = CONJUGATION_VERBS[verb];
  const alreadyChecked = CONJ_STATE.checked.has(verb);
  const savedAnswers = CONJ_STATE.answers[verb] || {};
  CONJ_STATE.hintLevel = 0;

  contentEl.innerHTML = `
    <div class="conj-progress">Verbo ${CONJ_STATE.verbIndex + 1} de ${CONJ_STATE.verbQueue.length}</div>
    <div class="conj-verb-nav">
      <div class="conj-verb-header">
        <div class="conj-verb-label">Verbo atual</div>
        <div class="infinitif">${verb} ${audioBtnHTML(verb)}</div>
        <div class="conj-verb-translation">${VERB_TRANSLATIONS[verb] || ''}</div>
        <div class="tempo">${CONJ_REGULAR_GROUPS.includes(verbInfo.g) ? 'Regular' : 'Irregular'}</div>
      </div>
      ${nextVerb ? `
        <div class="conj-verb-header next">
          <div class="conj-verb-label">Próximo verbo</div>
          <div class="infinitif">${nextVerb}</div>
          <div class="conj-verb-translation">${VERB_TRANSLATIONS[nextVerb] || ''}</div>
        </div>
      ` : ''}
    </div>
    <div class="conj-tense-grid">
      ${CONJ_STATE.selectedTenses.map(tenseKey => {
        const tenseInfo = CONJ_TENSES.find(t => t.key === tenseKey);
        const activeMask = conjActiveMask(tenseKey);
        const expectedForms = getConjForms(verb, tenseKey);
        const savedForTense = savedAnswers[tenseKey] || [];
        return `
          <div class="conj-tense-box" data-tense="${tenseKey}">
            <div class="conj-tense-title">${tenseInfo.label}</div>
            <div class="conj-grid">
              ${CONJ_PERSON_LABELS.map((_, i) => {
                const label = conjPersonLabel(i, expectedForms[i]);
                if (!activeMask[i]) return `
                  <div class="conj-field" data-tense="${tenseKey}" data-idx="${i}">
                    <label>${label}</label>
                    <input type="text" disabled placeholder="—">
                    <div class="expected"></div>
                  </div>
                `;
                const given = savedForTense[i] || '';
                let statusClass = '';
                let expectedText = '';
                if (alreadyChecked){
                  const expected = expectedForms[i] || '';
                  const accepted = conjAcceptedForms(expected);
                  if (accepted.includes(given.trim())){ statusClass = 'ok'; }
                  else if (accepted.some(f => normalizeLoose(given) === normalizeLoose(f))){ statusClass = 'almost'; expectedText = `Quase! → ${expected}`; }
                  else { statusClass = 'wrong'; expectedText = `→ ${expected}`; }
                }
                return `
                  <div class="conj-field ${statusClass}" data-tense="${tenseKey}" data-idx="${i}">
                    <label>${label}</label>
                    <input type="text" data-tense="${tenseKey}" data-idx="${i}" value="${given.replace(/"/g,'&quot;')}"
                      ${alreadyChecked ? 'disabled' : ''} autocomplete="off" autocapitalize="off" spellcheck="false">
                    <div class="expected">${expectedText}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${alreadyChecked ? '' : `
      <div class="conj-actions">
        <button class="btn btn-primary btn-block" id="conj-verify-btn">Verificar respostas</button>
        <button class="btn btn-secondary" id="conj-hint-btn" title="Mostrar contagem de letras e terminação">💡 Mostrar dica</button>
      </div>
    `}
    <div class="conj-verb-pager">
      <button class="btn btn-secondary" id="conj-prev-verb-btn" ${CONJ_STATE.verbIndex === 0 ? 'disabled' : ''}>← Verbo anterior</button>
      <button class="btn btn-secondary" id="conj-next-verb-btn">${CONJ_STATE.verbIndex < CONJ_STATE.verbQueue.length - 1 ? 'Próximo verbo →' : 'Ver resultado →'}</button>
    </div>
  `;

  wireAudioButtons(contentEl);

  document.getElementById('conj-hint-btn')?.addEventListener('click', function(){
    CONJ_STATE.hintLevel = Math.min(2, CONJ_STATE.hintLevel + 1);
    CONJ_STATE.selectedTenses.forEach(tenseKey => {
      const expectedForms = getConjForms(verb, tenseKey);
      conjActiveMask(tenseKey).forEach((active, i) => {
        if (!active) return;
        const inputEl = contentEl.querySelector(`input[data-tense="${tenseKey}"][data-idx="${i}"]`);
        if (inputEl && !inputEl.value){
          inputEl.placeholder = conjHintPlaceholder(expectedForms[i] || '', CONJ_STATE.hintLevel);
        }
      });
    });
    if (CONJ_STATE.hintLevel === 1){
      this.textContent = '💡 Mais ajuda';
      this.title = 'Revelar a maior parte das letras';
    } else {
      this.disabled = true;
      this.textContent = '💡 Dica máxima';
    }
  });

  document.getElementById('conj-verify-btn')?.addEventListener('click', () => {
    let correctCount = 0;
    let activeCount = 0;
    const answersForVerb = {};

    CONJ_STATE.selectedTenses.forEach(tenseKey => {
      const expectedForms = getConjForms(verb, tenseKey);
      const tenseGiven = [];
      let tenseCorrect = 0;
      let tenseActive = 0;

      conjActiveMask(tenseKey).forEach((active, i) => {
        if (!active) return;
        tenseActive++;
        activeCount++;
        const fieldEl = contentEl.querySelector(`.conj-field[data-tense="${tenseKey}"][data-idx="${i}"]`);
        const inputEl = fieldEl.querySelector('input');
        const expectedEl = fieldEl.querySelector('.expected');
        const expected = expectedForms[i] || '';
        const accepted = conjAcceptedForms(expected);
        const given = inputEl.value;
        tenseGiven[i] = given;

        inputEl.disabled = true;
        fieldEl.classList.remove('ok','almost','wrong');

        if (accepted.includes(given.trim())){
          fieldEl.classList.add('ok');
          correctCount++; tenseCorrect++;
        } else if (accepted.some(f => normalizeLoose(given) === normalizeLoose(f))){
          fieldEl.classList.add('almost');
          expectedEl.textContent = `Quase! → ${expected}`;
          correctCount += 0.5; tenseCorrect += 0.5;
        } else {
          fieldEl.classList.add('wrong');
          expectedEl.textContent = `→ ${expected}`;
        }
      });

      answersForVerb[tenseKey] = tenseGiven;
      registerDailyConjugationCorrect(Math.round(tenseCorrect));
      registerDailyConjugationTense(tenseKey);
    });

    CONJ_STATE.answers[verb] = answersForVerb;
    CONJ_STATE.checked.add(verb);
    CONJ_STATE.score += correctCount;
    CONJ_STATE.totalFields += activeCount;

    document.getElementById('conj-verify-btn').style.display = 'none';
    document.getElementById('conj-hint-btn').style.display = 'none';
  });

  document.getElementById('conj-prev-verb-btn').addEventListener('click', () => {
    if (CONJ_STATE.verbIndex > 0){
      CONJ_STATE.verbIndex -= 1;
      renderConjPracticeStep();
    }
  });

  document.getElementById('conj-next-verb-btn').addEventListener('click', () => {
    CONJ_STATE.verbIndex += 1;
    renderConjPracticeStep();
  });

  // Foca o primeiro campo ativo e vazio, pra já poder digitar direto.
  const firstActive = contentEl.querySelector('.conj-field input:not(:disabled)');
  if (firstActive) firstActive.focus();
}

// ============================================================
// DITADOS
// Um ditado por módulo, ligado à tarefa comunicativa do módulo (ver
// dictations.js). Cada ditado tem um único áudio guiado pré-gerado
// (locução de abertura + leitura de reconhecimento + ditado por cláusula
// com pontuação falada e repetição + releitura final), reproduzindo a
// estrutura real de um ditado DELF A1. Scoring por alinhamento
// palavra-a-palavra (LCS) entre o texto certo e o que o aluno digitou.
// ============================================================
function moduleTitleFor(moduleId){
  const mod = MODULES.find(m => m.id === moduleId);
  return mod ? mod.title : '';
}

function dictationAudioPath(d){
  return `audio/dictation-${d.id}-guided.mp3`;
}

// Áudio do ditado em reprodução no momento (só um por vez).
let dictationAudioEl = null;

function stopDictationAudio(){
  if (dictationAudioEl){
    dictationAudioEl.pause();
    dictationAudioEl = null;
  }
  isDictationScrubbing = false;
  dictationScrubHandler = null;
}

// Estado de "arrastar a barra de progresso" fica em nível de módulo, com um
// único par de listeners em window (registrado uma vez abaixo) — evita
// acumular listeners de window a cada vez que o player é reaberto.
let isDictationScrubbing = false;
let dictationScrubHandler = null;
window.addEventListener('pointermove', (e) => {
  if (isDictationScrubbing && dictationScrubHandler) dictationScrubHandler(e.clientX);
});
window.addEventListener('pointerup', () => { isDictationScrubbing = false; });

function escapeHtmlDictation(str){
  return str.replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function renderDictationList(){
  stopDictationAudio();
  document.getElementById('dictation-list-wrap').style.display = 'block';
  document.getElementById('dictation-player-wrap').style.display = 'none';

  const cardsWrap = document.getElementById('dictation-cards');
  cardsWrap.innerHTML = DICTATIONS.map(d => `
    <button class="dictation-card" data-dict-id="${d.id}">
      <div class="dictation-card-level">${d.level}</div>
      <div class="dictation-card-task">${escapeHtmlDictation(d.task)}</div>
      <div class="dictation-card-module">${escapeHtmlDictation(moduleTitleFor(d.moduleId))}</div>
    </button>
  `).join('');

  cardsWrap.querySelectorAll('.dictation-card').forEach(card => {
    card.addEventListener('click', () => openDictationPlayer(card.dataset.dictId));
  });
}

document.getElementById('dictation-explainer-toggle').addEventListener('click', () => {
  document.getElementById('dictation-explainer-toggle').classList.toggle('collapsed');
  document.getElementById('dictation-explainer-steps').classList.toggle('collapsed');
});

document.getElementById('dictation-back-to-list').addEventListener('click', renderDictationList);

function openDictationPlayer(id){
  const d = DICTATIONS.find(x => x.id === id);
  if (!d) return;

  stopDictationAudio();
  document.getElementById('dictation-list-wrap').style.display = 'none';
  document.getElementById('dictation-player-wrap').style.display = 'block';

  const content = document.getElementById('dictation-player-content');
  content.innerHTML = `
    <div class="dictation-player-task">${escapeHtmlDictation(d.task)}</div>
    <p class="dictation-player-module">${d.level} · ${escapeHtmlDictation(moduleTitleFor(d.moduleId))}</p>
    <div class="dictation-audio-player">
      <div class="dictation-transport">
        <button class="dictation-play-btn" id="dictation-play-btn">▶️ Ouvir o ditado</button>
        <button class="dictation-icon-btn" id="dictation-restart-btn" title="Reiniciar">↺</button>
      </div>
      <div class="dictation-scrub-row">
        <span class="dictation-time" id="dictation-time-current">00:00</span>
        <div class="dictation-progress-track" id="dictation-progress-track">
          <div class="dictation-progress-fill" id="dictation-progress-fill"></div>
          <div class="dictation-progress-handle" id="dictation-progress-handle"></div>
        </div>
        <span class="dictation-time" id="dictation-time-total">00:00</span>
      </div>
      <div class="dictation-secondary-controls">
        <div class="dictation-skip-controls">
          <button class="dictation-skip-btn" id="dictation-skip-back" title="Voltar 15s">-15s</button>
          <button class="dictation-skip-btn" id="dictation-skip-fwd" title="Avançar 15s">+15s</button>
        </div>
        <div class="dictation-volume-control">
          <button class="dictation-icon-btn" id="dictation-mute-btn" title="Mudo">🔊</button>
          <input type="range" class="dictation-volume-slider" id="dictation-volume-slider" min="0" max="100" value="100">
        </div>
        <div class="dictation-speed-controls">
          <button class="dictation-speed-btn" data-speed="0.75">0.75x</button>
          <button class="dictation-speed-btn active" data-speed="1">1x</button>
          <button class="dictation-speed-btn" data-speed="1.5">1.5x</button>
        </div>
      </div>
    </div>
    <textarea class="dictation-textarea" id="dictation-input" placeholder="Digite aqui o que você ouviu..."></textarea>
    <div class="dictation-actions">
      <button class="btn btn-primary" id="dictation-check-btn">Verificar</button>
      <button class="btn btn-secondary" id="dictation-retry-btn" style="display:none;">Tentar novamente</button>
    </div>
    <div id="dictation-result-wrap"></div>
  `;

  dictationAudioEl = new Audio(dictationAudioPath(d));
  const playBtn = document.getElementById('dictation-play-btn');
  const progressFill = document.getElementById('dictation-progress-fill');
  const progressHandle = document.getElementById('dictation-progress-handle');
  const progressTrack = document.getElementById('dictation-progress-track');
  const timeCurrentEl = document.getElementById('dictation-time-current');
  const timeTotalEl = document.getElementById('dictation-time-total');
  const muteBtn = document.getElementById('dictation-mute-btn');
  const volumeSlider = document.getElementById('dictation-volume-slider');

  playBtn.addEventListener('click', () => {
    if (dictationAudioEl.paused){
      dictationAudioEl.play().catch(() => showToast('Não foi possível reproduzir o áudio'));
    } else {
      dictationAudioEl.pause();
    }
  });
  document.getElementById('dictation-restart-btn').addEventListener('click', () => {
    dictationAudioEl.currentTime = 0;
  });
  document.getElementById('dictation-skip-back').addEventListener('click', () => {
    dictationAudioEl.currentTime = Math.max(0, dictationAudioEl.currentTime - 15);
  });
  document.getElementById('dictation-skip-fwd').addEventListener('click', () => {
    dictationAudioEl.currentTime = Math.min(dictationAudioEl.duration || Infinity, dictationAudioEl.currentTime + 15);
  });
  content.querySelectorAll('.dictation-speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.dictation-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dictationAudioEl.playbackRate = parseFloat(btn.dataset.speed);
    });
  });

  // Volume: slider controla o volume; botão de mudo alterna com o volume
  // anterior salvo, igual ao padrão de qualquer player de áudio.
  let volumeBeforeMute = 1;
  volumeSlider.addEventListener('input', () => {
    const v = parseInt(volumeSlider.value, 10) / 100;
    dictationAudioEl.volume = v;
    dictationAudioEl.muted = false;
    muteBtn.textContent = v === 0 ? '🔇' : '🔊';
  });
  muteBtn.addEventListener('click', () => {
    if (dictationAudioEl.muted || dictationAudioEl.volume === 0){
      dictationAudioEl.muted = false;
      dictationAudioEl.volume = volumeBeforeMute || 1;
      volumeSlider.value = Math.round(dictationAudioEl.volume * 100);
      muteBtn.textContent = '🔊';
    } else {
      volumeBeforeMute = dictationAudioEl.volume;
      dictationAudioEl.muted = true;
      volumeSlider.value = 0;
      muteBtn.textContent = '🔇';
    }
  });

  // Barra de progresso arrastável: clique ou arraste em qualquer ponto da
  // faixa pula o áudio pra aquele instante (igual ao player do lingua.com).
  function seekToClientX(clientX){
    if (!dictationAudioEl.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    dictationAudioEl.currentTime = ratio * dictationAudioEl.duration;
  }
  dictationScrubHandler = seekToClientX;
  progressTrack.addEventListener('pointerdown', (e) => {
    isDictationScrubbing = true;
    seekToClientX(e.clientX);
  });

  function formatDictationTime(seconds){
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  dictationAudioEl.addEventListener('play', () => {
    playBtn.textContent = '⏸ Pausar';
    playBtn.classList.add('speaking');
  });
  dictationAudioEl.addEventListener('pause', () => {
    playBtn.textContent = '▶️ Ouvir o ditado';
    playBtn.classList.remove('speaking');
  });
  dictationAudioEl.addEventListener('ended', () => {
    playBtn.textContent = '▶️ Ouvir o ditado';
    playBtn.classList.remove('speaking');
  });
  dictationAudioEl.addEventListener('loadedmetadata', () => {
    timeTotalEl.textContent = formatDictationTime(dictationAudioEl.duration);
  });
  dictationAudioEl.addEventListener('timeupdate', () => {
    if (dictationAudioEl.duration){
      const pct = (dictationAudioEl.currentTime / dictationAudioEl.duration) * 100;
      progressFill.style.width = `${pct}%`;
      progressHandle.style.left = `${pct}%`;
    }
    timeCurrentEl.textContent = formatDictationTime(dictationAudioEl.currentTime);
  });
  dictationAudioEl.addEventListener('error', () => showToast('Não foi possível reproduzir o áudio'));

  document.getElementById('dictation-check-btn').addEventListener('click', () => {
    const userText = document.getElementById('dictation-input').value;
    renderDictationResult(d, userText);
  });

  document.getElementById('dictation-retry-btn').addEventListener('click', () => {
    document.getElementById('dictation-input').value = '';
    document.getElementById('dictation-result-wrap').innerHTML = '';
    document.getElementById('dictation-retry-btn').style.display = 'none';
    document.getElementById('dictation-check-btn').style.display = 'inline-flex';
  });
}

function normalizeDictationWord(w){
  return w
    .toLowerCase()
    .normalize('NFC') // acentos digitados como sequência decomposta (a + ` )
                       // via alguns teclados/IMEs viram a mesma forma que os
                       // do texto original, em vez de "diferentes" por baixo.
    .replace(/[‘’]/g, "'") // aspas curvas do autocorretor do celular
    .replace(/[.,!?;:'"()«»]/g, '');
}

// Separa as palavras reais da pontuação "solta" (ex: "!" ou "?" digitados
// com espaço antes, como manda a tipografia francesa). A pontuação continua
// fazendo parte do texto exibido — igual ao original, como palavra própria
// — mas não entra no alinhamento/pontuação do ditado: quase nenhum aluno
// digita um "!" sozinho como token separado, e contar isso como erro
// garantido podia empurrar o resto da comparação pro lugar errado.
function tokenizeDictationText(text){
  const rawWords = text.trim().split(/\s+/).filter(w => w.length);
  const words = [];       // só as palavras com conteúdo real, na ordem
  const normWords = [];   // normalizadas, mesmo índice de `words`
  const punctAfter = [];  // pontuação solta que vem logo depois de cada palavra (ou '')
  for (const w of rawWords){
    const norm = normalizeDictationWord(w);
    if (norm === ''){
      if (words.length > 0){
        punctAfter[words.length - 1] = (punctAfter[words.length - 1] ? punctAfter[words.length - 1] + ' ' : '') + w;
      }
      continue;
    }
    words.push(w);
    normWords.push(norm);
    punctAfter.push('');
  }
  return { words, normWords, punctAfter };
}

// Alinha as palavras do texto certo com as que o aluno digitou via LCS
// (mesma ideia de um diff de texto), pra marcar acertos/erros mesmo quando
// o aluno pula ou adianta uma palavra, sem desalinhar o resto da frase.
// Pontuação solta (ver tokenizeDictationText) não participa do alinhamento,
// mas é reanexada a cada palavra certa no resultado, pra manter o texto
// exibido idêntico ao original.
function diffDictationWords(correctText, userText){
  const correctTok = tokenizeDictationText(correctText);
  const userTok = tokenizeDictationText(userText);
  const correctWords = correctTok.words, cn = correctTok.normWords;
  const userWords = userTok.words, un = userTok.normWords;
  const n = cn.length, m = un.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--){
    for (let j = m - 1; j >= 0; j--){
      dp[i][j] = cn[i] === un[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  let i = 0, j = 0;
  const result = [];
  while (i < n && j < m){
    if (cn[i] === un[j]){ result.push({ type: 'match', word: correctWords[i], punctAfter: correctTok.punctAfter[i] }); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]){ result.push({ type: 'miss', word: correctWords[i], punctAfter: correctTok.punctAfter[i] }); i++; }
    else { result.push({ type: 'extra', word: userWords[j] }); j++; }
  }
  while (i < n){ result.push({ type: 'miss', word: correctWords[i], punctAfter: correctTok.punctAfter[i] }); i++; }
  while (j < m){ result.push({ type: 'extra', word: userWords[j] }); j++; }
  return result;
}

// Junta um "miss" (palavra certa que faltou) adjacente a um "extra" (palavra
// errada que o aluno digitou) numa única substituição — pra mostrar a
// palavra errada riscada seguida da palavra certa destacada, como no
// lingua.com, em vez de duas entradas soltas em ordens variáveis.
function mergeDictationDiff(diff){
  const merged = [];
  let i = 0;
  while (i < diff.length){
    const cur = diff[i];
    const next = diff[i + 1];
    if (next && ((cur.type === 'miss' && next.type === 'extra') || (cur.type === 'extra' && next.type === 'miss'))){
      const wrong = cur.type === 'extra' ? cur.word : next.word;
      const correct = cur.type === 'miss' ? cur.word : next.word;
      const punctAfter = cur.type === 'miss' ? cur.punctAfter : next.punctAfter;
      merged.push({ type: 'sub', wrong, correct, punctAfter });
      i += 2;
      continue;
    }
    merged.push(cur);
    i++;
  }
  return merged;
}

function dictationScoreColorVar(score){
  if (score >= 80) return 'var(--jade)';
  if (score >= 60) return 'var(--imperial-gold)';
  return 'var(--seal-red-dark)';
}

function renderDictationResult(d, userText){
  const diff = diffDictationWords(d.text, userText);
  const merged = mergeDictationDiff(diff);
  const totalCorrectWords = tokenizeDictationText(d.text).words.length;
  const matches = diff.filter(x => x.type === 'match').length;
  const score = Math.round((matches / totalCorrectWords) * 100);

  const wordsHtml = merged.map(x => {
    const punct = x.punctAfter ? ` ${escapeHtmlDictation(x.punctAfter)}` : '';
    if (x.type === 'match') return `<span class="dictation-word">${escapeHtmlDictation(x.word)}</span>${punct}`;
    if (x.type === 'sub') return `<span class="dictation-word-wrong">${escapeHtmlDictation(x.wrong)}</span> <span class="dictation-word-correct">${escapeHtmlDictation(x.correct)}</span>${punct}`;
    if (x.type === 'miss') return `<span class="dictation-word-correct">${escapeHtmlDictation(x.word)}</span>${punct}`;
    return `<span class="dictation-word-wrong">${escapeHtmlDictation(x.word)}</span>`;
  }).join(' ');

  document.getElementById('dictation-result-wrap').innerHTML = `
    <div class="dictation-result">
      <div class="dictation-result-text">${wordsHtml}</div>
      <div class="dictation-result-summary">
        <div class="dictation-score-badge" style="background:${dictationScoreColorVar(score)};">${score}</div>
        <p class="dictation-score-text">Você escreveu <strong>${matches} de ${totalCorrectWords}</strong> palavras corretamente. Você atingiu uma pontuação de ${score} pontos (${score}%).</p>
      </div>
    </div>
  `;

  document.getElementById('dictation-check-btn').style.display = 'none';
  document.getElementById('dictation-retry-btn').style.display = 'inline-flex';
}

// ============================================================
// DESAFIOS: três categorias compartilhando a mesma infraestrutura
// (níveis, geração automática, TTS, fila de revisão, aprovação,
// publicação) — só a lógica específica de cada tipo muda:
//
//   expression        — expressão -> exemplo em contexto (TTS) -> hipótese
//                        -> alternativas -> feedback -> segundo exemplo
//                        (TTS) -> microatividade -> "pour aller plus loin"
//   listen_translate  — frase em francês (só áudio) -> tradução do aluno
//                        -> avaliação semântica (não exige match literal)
//                        -> feedback com frase original revelada
//   accent            — palavra/expressão curta (só áudio) -> grafia do
//                        aluno -> correção sensível a acentos
//
// Curadoria e geração dos desafios feita fora do site (scripts/
// challenges_pipeline/); aqui só a experiência do aluno e a tela de
// revisão do admin. Ver challenges.js pro shape de cada tipo.
// ============================================================
const CHALLENGES_ADMIN_EMAIL = 'brunemed1310@gmail.com';

// Os desafios são persistidos na tabela "challenges" do Supabase (não mais
// num array estático carregado de challenges.js) -- ver
// scripts/supabase_migrations/001_create_challenges_table.sql. A RLS da
// tabela já faz o trabalho de só devolver desafios publicados pra
// aluno/anônimo e devolver tudo pra admin (auth.jwt() email), então o
// front não precisa filtrar por permissão -- só usa o que voltou.
let CHALLENGES = [];

// Colunas "de verdade" da tabela (fora da coluna jsonb `data`). Tudo que
// não está nesta lista quando um objeto de desafio é montado no front
// (canonicalExpression, example, sentenceFr, targetText,
// externalResources, etc.) é o conteúdo específico do tipo e vai inteiro
// dentro de `data` ao persistir -- ver challengeDataPayload().
const CHALLENGE_DB_COLUMNS = [
  'id', 'type', 'level', 'status',
  'created_at', 'updated_at',
  'published_at', 'published_by',
  'rejected_at', 'rejected_by',
  'unpublished_at', 'unpublished_by',
];

function challengeDataPayload(c){
  const data = {};
  Object.keys(c).forEach(k => {
    if (!CHALLENGE_DB_COLUMNS.includes(k)) data[k] = c[k];
  });
  return data;
}

const CHALLENGE_VALID_TYPES = ['expression', 'listen_translate', 'accent'];
const CHALLENGE_VALID_STATUSES = ['needs_review', 'approved', 'published', 'rejected'];

// Aceita tanto um array de desafios quanto a saída direta do pipeline
// (`{accepted: [...], rejected: [...]}`, ver generate_challenges.py) --
// assim o JSON gerado localmente pode ser colado sem edição nenhuma.
function parseChallengesImportInput(rawText){
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('JSON inválido: ' + err.message);
  }
  const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.accepted) ? parsed.accepted : null);
  if (!items) throw new Error('Esperava um array de desafios, ou um objeto com "accepted" (saída direta do pipeline).');
  return items;
}

// Importa desafios direto pro Supabase via a mesma sessão autenticada de
// admin já usada pro resto do painel (sujeita à mesma RLS de escrita) --
// substitui o passo manual de rodar SQL no SQL Editor do Supabase.
// Sempre entra como needs_review (a menos que o item já traga um status
// válido) -- nunca pula a fila de revisão.
async function importChallengesFromJSON(rawText){
  const items = parseChallengesImportInput(rawText);
  const existingIds = new Set(CHALLENGES.map(c => c.id));
  const seenInBatch = new Set();
  const rows = [];
  const skipped = [];

  items.forEach((item, idx) => {
    const label = (item && item.id) ? item.id : `item #${idx + 1}`;
    if (!item || !item.id || !item.type || !item.level){
      skipped.push(`${label}: faltando id/type/level`);
      return;
    }
    if (!CHALLENGE_VALID_TYPES.includes(item.type)){
      skipped.push(`${item.id}: type inválido ("${item.type}")`);
      return;
    }
    if (!CHALLENGE_LEVELS_ORDER.includes(item.level)){
      skipped.push(`${item.id}: level inválido ("${item.level}")`);
      return;
    }
    if (existingIds.has(item.id) || seenInBatch.has(item.id)){
      skipped.push(`${item.id}: id já existe (duplicado)`);
      return;
    }
    seenInBatch.add(item.id);
    const status = CHALLENGE_VALID_STATUSES.includes(item.status) ? item.status : 'needs_review';
    rows.push({ id: item.id, type: item.type, level: item.level, status, data: challengeDataPayload({ ...item, status }) });
  });

  if (rows.length === 0) return { insertedCount: 0, skipped, error: null };

  const { error } = await supabaseClient.from('challenges').insert(rows);
  if (error) return { insertedCount: 0, skipped, error: error.message };
  return { insertedCount: rows.length, skipped, error: null };
}

// Busca os desafios do banco de dados e repõe CHALLENGES. Chamado sempre
// que a aba Desafios é aberta (e de novo dentro do painel admin), pra
// nunca depender de cache/estado de sessão -- uma publicação feita em
// outra aba/navegador aparece assim que o site é reaberto ou a lista é
// recarregada, sem precisar de nenhuma ação do Claude Code.
async function loadChallengesFromDB(){
  try {
    const { data, error } = await supabaseClient.from('challenges').select('*');
    if (error) throw error;
    CHALLENGES = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      level: row.level,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      published_at: row.published_at,
      published_by: row.published_by,
      rejected_at: row.rejected_at,
      rejected_by: row.rejected_by,
      unpublished_at: row.unpublished_at,
      unpublished_by: row.unpublished_by,
      ...(row.data || {}),
    }));
    return true;
  } catch (err){
    console.error('Falha ao carregar desafios do Supabase:', err);
    return false;
  }
}

// Grava status + todo o conteúdo específico do tipo (colunas extras via
// `extraColumns`, ex: published_at/published_by) numa única chamada.
// `c` já deve estar atualizado localmente (otimista) antes de chamar --
// em caso de erro, quem chamou é responsável por reverter `c`.
async function persistChallenge(c, extraColumns = {}){
  const payload = { status: c.status, data: challengeDataPayload(c), ...extraColumns };
  const { error } = await supabaseClient.from('challenges').update(payload).eq('id', c.id);
  if (error){
    console.error('Falha ao salvar desafio no Supabase:', error);
    alert('Não foi possível salvar no banco de dados: ' + error.message);
    return false;
  }
  return true;
}

const CHALLENGE_CATEGORIES = [
  { type: 'expression', emoji: '🧩', title: 'Expressões', subtitle: 'Descubra o sentido' },
  { type: 'listen_translate', emoji: '🎧', title: 'Ouça e traduza', subtitle: 'Escute e traduza' },
  { type: 'accent', emoji: '✍️', title: 'Acentuação', subtitle: 'Escreva corretamente' },
];

let currentChallengesCategory = 'expression';

function isChallengesAdmin(){
  return !!(CURRENT_USER && CURRENT_USER.email === CHALLENGES_ADMIN_EMAIL);
}

function escapeHtmlChallenge(str){
  return String(str).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function publishedChallenges(){
  return CHALLENGES.filter(c => c.status === 'published');
}
function pendingChallenges(){
  return CHALLENGES.filter(c => c.status === 'needs_review');
}
// "Prontos, mas fora do ar" -- desafios que já foram aprovados/publicados
// alguma vez mas não estão visíveis pro aluno agora (despublicados). Só a
// admin enxerga essas linhas (a RLS de leitura pública só devolve
// status = 'published').
function unpublishedButApprovedChallenges(){
  return CHALLENGES.filter(c => c.status === 'approved');
}

function isChallengeCompleted(id){
  return !!STATE.completedChallenges[id];
}
function markChallengeCompleted(id){
  STATE.completedChallenges[id] = true;
  saveState();
}
// Wrapper compartilhado pelas 3 telas de feedback (Expressões, Ouça e
// traduza, Acentuação): mesmo invólucro (classe correct/incorrect + header)
// e mesmo botão de concluir ao final -- só o corpo (bodyHTML) muda por tipo.
function challengeFeedbackWrapperHTML(typeClass, isCorrect, headerText, bodyHTML){
  return `
    <div class="${typeClass}-feedback ${isCorrect ? 'correct' : 'incorrect'}">
      <div class="${typeClass}-feedback-header">${headerText}</div>
      ${bodyHTML}
      ${challengeCompleteButtonHTML()}
    </div>
  `;
}

function challengeCompleteButtonHTML(){
  return `<button class="btn btn-primary challenge-complete-btn" id="challenge-complete-btn" style="margin-top:16px;width:100%;">✅ Concluir</button>`;
}
function wireChallengeCompleteButton(c){
  const btn = document.getElementById('challenge-complete-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    markChallengeCompleted(c.id);
    if (challengeQueueContext && challengeQueueContext.type === c.type && challengeQueueContext.level === c.level){
      const next = nextQueueChallenge(c.type, c.level);
      if (next) renderChallengeQueueContinueScreen(c, next);
      else renderChallengeQueueLevelDoneScreen(c);
      return;
    }
    renderChallengesList(currentChallengesCategory);
  });
}

const CHALLENGE_RESOURCE_ICON = { dictionary: '📖', article: '📰', youtube: '▶', youglish: '🎧' };

function challengeResourceCardHTML(r){
  const icon = CHALLENGE_RESOURCE_ICON[r.type] || '🔗';
  return `
    <a class="challenge-external-link" href="${escapeHtmlChallenge(r.url)}" target="_blank" rel="noopener">
      <span class="challenge-external-link-icon">${icon}</span>
      <span class="challenge-external-link-text">
        <span class="challenge-external-link-label">${escapeHtmlChallenge(r.buttonLabel || 'En savoir plus')}</span>
        <span class="challenge-external-link-source">${escapeHtmlChallenge(r.sourceName || r.title)}</span>
      </span>
    </a>
  `;
}

function challengeExternalResourcesHTML(c){
  const shown = (c.externalResources || []).filter(r => r.approved !== false);
  if (!shown.length) return '';
  return `
    <div class="challenge-external-resources">
      <div class="challenge-external-resources-label">Pour aller plus loin</div>
      ${shown.map(challengeResourceCardHTML).join('')}
    </div>
  `;
}

async function renderChallengeCategories(){
  document.getElementById('challenges-categories-wrap').style.display = 'block';
  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'none';
  document.getElementById('challenges-admin-wrap').style.display = 'none';

  const wrap = document.getElementById('challenges-categories');
  wrap.innerHTML = `<p class="challenges-empty">Carregando desafios…</p>`;

  const ok = await loadChallengesFromDB();
  if (!ok){
    wrap.innerHTML = `<p class="challenges-empty">Não foi possível carregar os desafios agora. Verifique sua conexão e tente novamente.</p>`;
    return;
  }

  const adminBar = document.getElementById('challenges-admin-bar');
  adminBar.style.display = isChallengesAdmin() ? 'flex' : 'none';
  if (isChallengesAdmin()){
    document.getElementById('challenges-pending-count').textContent = pendingChallenges().length;
  }

  wrap.innerHTML = CHALLENGE_CATEGORIES.map(cat => `
    <button class="challenge-category-card" data-category="${cat.type}">
      <div class="challenge-category-emoji">${cat.emoji}</div>
      <div class="challenge-category-title">${cat.title}</div>
      <div class="challenge-category-subtitle">${cat.subtitle}</div>
    </button>
  `).join('');
  wrap.querySelectorAll('.challenge-category-card').forEach(card => {
    card.addEventListener('click', () => renderChallengesList(card.dataset.category));
  });
}

function challengeCardLabelHTML(c){
  if (c.type === 'expression') return `<div class="challenge-card-expr">${escapeHtmlChallenge(c.canonicalExpression)}</div>`;
  if (c.type === 'listen_translate') return `<div class="challenge-card-expr">🎧 Ouça e traduza</div>`;
  if (c.type === 'accent') return `<div class="challenge-card-expr">✍️ Acentuação</div>`;
  return '';
}

// Só Expressões tem conteúdo em mais de um nível hoje -- Ouça e
// traduza/Acentuação mostram tudo junto, como antes.
const CHALLENGE_LEVELS_ORDER = ['A1', 'A2', 'B1', 'B2'];

// Níveis recolhidos (estilo lingua.com: todos os níveis numa página só,
// cada um com um cabeçalho clicável pra esconder/mostrar) -- guarda só os
// que o aluno já fechou, tudo aberto por padrão.
const collapsedChallengeLevels = new Set();

function challengeCardHTML(c){
  const done = isChallengeCompleted(c.id);
  return `
    <button class="challenge-card ${done ? 'completed' : ''}" data-challenge-id="${c.id}">
      ${done ? '<span class="challenge-card-check">✅</span>' : ''}
      <div class="challenge-card-level">${c.level}</div>
      ${challengeCardLabelHTML(c)}
    </button>
  `;
}

function renderChallengesList(type){
  currentChallengesCategory = type;
  document.getElementById('challenges-categories-wrap').style.display = 'none';
  document.getElementById('challenges-list-wrap').style.display = 'block';
  document.getElementById('challenge-player-wrap').style.display = 'none';
  document.getElementById('challenges-admin-wrap').style.display = 'none';

  const cat = CHALLENGE_CATEGORIES.find(c => c.type === type);
  document.getElementById('challenges-list-title').textContent = cat ? cat.title : 'Desafios';
  document.getElementById('challenges-level-tabs').style.display = 'none';

  const cardsWrap = document.getElementById('challenges-cards');
  const published = publishedChallenges().filter(c => c.type === type);
  const groupByLevel = type === 'expression';

  if (published.length === 0){
    cardsWrap.className = 'challenges-cards';
    cardsWrap.innerHTML = `
      <div class="challenges-empty">
        <div class="big-emoji">${cat ? cat.emoji : '🧩'}</div>
        <h3>Nenhum desafio publicado ainda</h3>
        <p>Em breve, novos desafios nesta categoria.</p>
      </div>
    `;
    return;
  }

  if (!groupByLevel){
    // Ouça e traduza/Acentuação: sem título próprio pra cada exercício (ao
    // contrário de Expressões, que mostra a expressão em si) -- uma grade
    // de cards ficava toda igual, impossível de distinguir um exercício do
    // outro. Em vez de listar, mostra o progresso por nível e entra direto
    // no próximo exercício não concluído (fila, "Continuar" pro próximo).
    cardsWrap.className = 'challenges-queue-levels';
    const levelsPresent = CHALLENGE_LEVELS_ORDER.filter(lvl => published.some(c => c.level === lvl));
    cardsWrap.innerHTML = levelsPresent.map(level => {
      const levelChallenges = published.filter(c => c.level === level);
      const doneCount = levelChallenges.filter(c => isChallengeCompleted(c.id)).length;
      const allDone = doneCount === levelChallenges.length;
      return `
        <div class="challenge-queue-level-card">
          <div class="challenge-queue-level-info">
            <div class="challenge-queue-level-name">Nível ${level}</div>
            <div class="challenge-queue-level-progress">${doneCount}/${levelChallenges.length} concluído${levelChallenges.length === 1 ? '' : 's'}</div>
          </div>
          <button class="btn ${allDone ? 'btn-secondary' : 'btn-primary'}" data-level="${level}">
            ${allDone ? '🎉 Revisar' : (doneCount > 0 ? 'Continuar' : 'Começar')}
          </button>
        </div>
      `;
    }).join('');
    cardsWrap.querySelectorAll('[data-level]').forEach(btn => {
      btn.addEventListener('click', () => openChallengeQueueLevel(type, btn.dataset.level));
    });
    return;
  }

  // Todos os níveis numa página só (estilo lingua.com), cada um com seus
  // próprios cards -- em vez de abas que escondem os outros níveis.
  cardsWrap.className = 'challenges-level-sections';
  const levelsPresent = CHALLENGE_LEVELS_ORDER.filter(lvl => published.some(c => c.level === lvl));
  cardsWrap.innerHTML = levelsPresent.map(level => {
    const levelCards = published.filter(c => c.level === level);
    const collapsed = collapsedChallengeLevels.has(level);
    return `
      <div class="challenges-level-section">
        <button class="challenges-level-heading" data-level="${level}">
          <span class="challenges-level-chevron ${collapsed ? 'collapsed' : ''}">▾</span>
          Nível ${level}
          <span class="challenges-level-count">${levelCards.length}</span>
        </button>
        <div class="challenges-cards" ${collapsed ? 'style="display:none;"' : ''}>
          ${levelCards.map(challengeCardHTML).join('')}
        </div>
      </div>
    `;
  }).join('');

  cardsWrap.querySelectorAll('.challenge-card').forEach(card => {
    card.addEventListener('click', () => openChallengePlayer(card.dataset.challengeId));
  });
  cardsWrap.querySelectorAll('.challenges-level-heading').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      if (collapsedChallengeLevels.has(level)) collapsedChallengeLevels.delete(level);
      else collapsedChallengeLevels.add(level);
      renderChallengesList(type);
    });
  });
}

// ---------- Fila de exercícios (Ouça e traduza / Acentuação) ----------
// Só ativa enquanto o aluno está dentro de um nível acessado pela tela de
// progresso (openChallengeQueueLevel) -- concluir um exercício encadeia
// direto pro próximo não concluído do mesmo nível, em vez de voltar pra
// uma lista. null fora desse fluxo (Expressões, preview do admin etc.).
let challengeQueueContext = null;

function nextQueueChallenge(type, level){
  return publishedChallenges().find(c => c.type === type && c.level === level && !isChallengeCompleted(c.id)) || null;
}

function openChallengeQueueLevel(type, level){
  challengeQueueContext = { type, level };
  const next = nextQueueChallenge(type, level) || publishedChallenges().find(c => c.type === type && c.level === level);
  if (next) openChallengePlayer(next.id);
}

function queueLevelProgressLabel(type, level){
  const all = publishedChallenges().filter(c => c.type === type && c.level === level);
  const done = all.filter(c => isChallengeCompleted(c.id)).length;
  return `${done}/${all.length} concluído${all.length === 1 ? '' : 's'}`;
}

function renderChallengeQueueContinueScreen(c, next){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-queue-interstitial">
      <div class="big-emoji">✅</div>
      <h3>Exercício concluído!</h3>
      <p>Nível ${escapeHtmlChallenge(c.level)} — ${queueLevelProgressLabel(c.type, c.level)}</p>
      <button class="btn btn-primary btn-block" id="queue-continue-btn">Continuar →</button>
    </div>
  `;
  document.getElementById('queue-continue-btn').addEventListener('click', () => openChallengePlayer(next.id));
}

function renderChallengeQueueLevelDoneScreen(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-queue-interstitial">
      <div class="big-emoji">🎉</div>
      <h3>Nível ${escapeHtmlChallenge(c.level)} concluído!</h3>
      <p>Você terminou todos os exercícios desse nível.</p>
      <button class="btn btn-primary btn-block" id="queue-back-btn">Voltar aos níveis</button>
    </div>
  `;
  document.getElementById('queue-back-btn').addEventListener('click', () => {
    challengeQueueContext = null;
    renderChallengesList(currentChallengesCategory);
  });
}

let challengePreviewMode = false;

document.getElementById('challenges-list-back-btn').addEventListener('click', () => {
  challengeQueueContext = null;
  renderChallengeCategories();
});
document.getElementById('challenge-back-to-list').addEventListener('click', () => {
  if (challengePreviewMode){
    challengePreviewMode = false;
    document.getElementById('challenge-preview-banner').style.display = 'none';
    removePreviewWarningEl();
    renderChallengesAdmin();
  } else {
    challengeQueueContext = null;
    renderChallengesList(currentChallengesCategory);
  }
});
document.getElementById('challenges-admin-back-btn').addEventListener('click', renderChallengeCategories);
document.getElementById('challenges-admin-review-btn').addEventListener('click', () => renderChallengesAdmin());

document.getElementById('challenges-admin-import-btn').addEventListener('click', () => {
  document.getElementById('challenges-import-textarea').value = '';
  const statusEl = document.getElementById('challenges-import-status');
  statusEl.className = 'challenges-import-status';
  statusEl.textContent = '';
  document.getElementById('challenges-import-modal').style.display = 'flex';
});
document.getElementById('challenges-import-modal-close').addEventListener('click', () => {
  document.getElementById('challenges-import-modal').style.display = 'none';
});
document.getElementById('challenges-import-modal').addEventListener('click', (e) => {
  if (e.target.id === 'challenges-import-modal') document.getElementById('challenges-import-modal').style.display = 'none';
});
document.getElementById('challenges-import-submit-btn').addEventListener('click', async () => {
  const textarea = document.getElementById('challenges-import-textarea');
  const statusEl = document.getElementById('challenges-import-status');
  const btn = document.getElementById('challenges-import-submit-btn');
  statusEl.className = 'challenges-import-status';
  statusEl.textContent = '';

  let result;
  try {
    btn.disabled = true;
    btn.textContent = 'Importando…';
    result = await importChallengesFromJSON(textarea.value);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Importar';
    statusEl.className = 'challenges-import-status err';
    statusEl.textContent = '❌ ' + err.message;
    return;
  }
  btn.disabled = false;
  btn.textContent = 'Importar';

  if (result.error){
    statusEl.className = 'challenges-import-status err';
    statusEl.textContent = `❌ Falha ao gravar no banco: ${result.error}`;
    return;
  }
  const lines = [];
  if (result.insertedCount > 0) lines.push(`✅ ${result.insertedCount} desafio(s) importado(s) como pendente(s) de revisão.`);
  if (result.skipped.length > 0) lines.push(`⚠ ${result.skipped.length} pulado(s):\n` + result.skipped.map(s => '  • ' + s).join('\n'));
  statusEl.className = result.insertedCount > 0 ? 'challenges-import-status ok' : 'challenges-import-status err';
  statusEl.textContent = lines.join('\n\n');
  if (result.insertedCount > 0){
    textarea.value = '';
    renderChallengesAdmin();
  }
});

function openChallengePlayer(id){
  const c = CHALLENGES.find(x => x.id === id);
  if (!c) return;

  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'block';
  document.getElementById('challenge-preview-banner').style.display = 'none';

  if (c.type === 'listen_translate') return openListenTranslatePlayer(c);
  if (c.type === 'accent') return openAccentPlayer(c);
  return openExpressionPlayer(c);
}

// A pergunta e o feedback (Bonne réponse / exemplos / à vous de jouer) são
// duas telas distintas dentro do mesmo #challenge-player-content -- a
// segunda SUBSTITUI a primeira (innerHTML novo), não empilha por baixo.
// A frase de exemplo (c.example) não aparece mais na tela da pergunta --
// ela já entregava a resposta antes mesmo da hipótese -- só depois de
// responder, junto com o segundo exemplo (Exemplo 1 / Exemplo 2).
function openExpressionPlayer(c){
  renderExpressionQuestionScreen(c);
}

function renderExpressionQuestionScreen(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-expression">
      ${escapeHtmlChallenge(c.canonicalExpression)}
      <button class="audio-btn audio-btn-lg" id="challenge-expression-play-btn" aria-label="Ouvir pronúncia" title="Ouvir pronúncia">🔊</button>
    </div>
    <div class="challenge-hypothesis">
      <p class="challenge-question">${escapeHtmlChallenge(c.question)}</p>
      <div class="challenge-choices-wrap">
        <div class="challenge-choices blurred" id="challenge-choices"></div>
        <button class="btn btn-secondary challenge-reveal-overlay-btn" id="challenge-reveal-btn">Voir les réponses</button>
      </div>
    </div>
  `;

  if (c.expressionAudioFile){
    document.getElementById('challenge-expression-play-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.expressionAudioFile}`, e.currentTarget);
    });
  }

  const choicesEl = document.getElementById('challenge-choices');
  const shuffled = shuffle(c.options.map((text, i) => ({ text, origIdx: i })));
  choicesEl.innerHTML = shuffled.map(o =>
    `<button class="challenge-choice-btn" data-orig-idx="${o.origIdx}">${escapeHtmlChallenge(o.text)}</button>`
  ).join('');

  document.getElementById('challenge-reveal-btn').addEventListener('click', (e) => {
    choicesEl.classList.remove('blurred');
    e.currentTarget.style.display = 'none';
    choicesEl.querySelectorAll('.challenge-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        answerChallenge(c, parseInt(btn.dataset.origIdx, 10));
      });
    });
  });
}

function answerChallenge(c, chosenIdx){
  const isCorrect = c.options[chosenIdx] === c.correctAnswer;
  if (isCorrect) addXP(5);
  renderExpressionFeedbackScreen(c, chosenIdx, isCorrect);
}

function renderExpressionFeedbackScreen(c, chosenIdx, isCorrect){
  const content = document.getElementById('challenge-player-content');
  const bodyHTML = `
      ${isCorrect ? '' : `<p class="challenge-feedback-chosen">Sua resposta: ${escapeHtmlChallenge(c.options[chosenIdx])}<br>Resposta certa: <strong>${escapeHtmlChallenge(c.correctAnswer)}</strong></p>`}
      <p class="challenge-feedback-meaning"><strong>${escapeHtmlChallenge(c.canonicalExpression)}</strong><br>
      signifie <strong>${escapeHtmlChallenge(c.meaning.fr)}</strong>.<br>
      Em português: <strong>${escapeHtmlChallenge(c.meaning.pt)}</strong>.</p>
      <p class="challenge-explanation">${escapeHtmlChallenge(c.explanation)}</p>

      <div class="challenge-second-example">
        <div class="challenge-second-example-label">Exemple 1</div>
        <p class="challenge-second-example-text">${escapeHtmlChallenge(c.example.text)}</p>
        ${c.example.audioFile ? '<button class="dictation-play-btn" id="challenge-example-play-btn">▶ Écouter</button>' : ''}
      </div>

      <div class="challenge-second-example">
        <div class="challenge-second-example-label">Exemple 2</div>
        <p class="challenge-second-example-text">${escapeHtmlChallenge(c.secondExample.text)}</p>
        ${c.secondExample.audioFile ? '<button class="dictation-play-btn" id="challenge-second-example-play-btn">▶ Écouter</button>' : ''}
      </div>

      <div class="challenge-microactivity">
        <div class="challenge-microactivity-label">À vous de jouer</div>
        <p class="challenge-microactivity-prompt">${escapeHtmlChallenge(c.microActivity.prompt)}</p>
        <button class="btn btn-secondary" id="challenge-reveal-answer-btn">Voir la réponse</button>
        <p class="challenge-microactivity-answer" id="challenge-microactivity-answer" style="display:none;">${escapeHtmlChallenge(c.microActivity.answer)}</p>
      </div>

      ${challengeExternalResourcesHTML(c)}
  `;
  content.innerHTML = challengeFeedbackWrapperHTML('challenge', isCorrect, isCorrect ? '✅ Bonne réponse.' : '❌ Pas tout à fait.', bodyHTML);

  if (c.example.audioFile){
    document.getElementById('challenge-example-play-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.example.audioFile}`, e.currentTarget);
    });
  }
  if (c.secondExample.audioFile){
    document.getElementById('challenge-second-example-play-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.secondExample.audioFile}`, e.currentTarget);
    });
  }
  document.getElementById('challenge-reveal-answer-btn').addEventListener('click', () => {
    document.getElementById('challenge-reveal-answer-btn').style.display = 'none';
    document.getElementById('challenge-microactivity-answer').style.display = 'block';
  });
  wireChallengeCompleteButton(c);
}

// ---------- Ouça e traduza ----------
// Correção não exige match literal com a tradução de referência: compara
// por sobreposição de palavras de conteúdo (ignorando artigos/preposições
// comuns em português) contra qualquer uma das traduções aceitas geradas
// na curadoria. É uma aproximação, não uma avaliação semântica de verdade
// (não há chamada de IA em tempo de execução do aluno) — por isso o
// feedback sempre mostra a resposta do aluno ao lado da esperada, pra ele
// mesmo julgar nuances que o comparador não capta.
function normalizeForTranslationCompare(s){
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TRANSLATION_STOPWORDS_PT = new Set([
  'o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas',
  'que','e','é','ele','ela','eles','elas','eu','tu','voce','você','nos','nós','voces','vocês',
  'para','por','com','se','ao','aos','a','as','à','às','sao','são','esta','está','isso','isto'
]);

function translationTokenSet(s){
  return normalizeForTranslationCompare(s).split(' ').filter(w => w && !TRANSLATION_STOPWORDS_PT.has(w));
}

function translationSimilarity(a, b){
  const ta = translationTokenSet(a);
  const tb = translationTokenSet(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  const overlap = ta.filter(w => setB.has(w)).length;
  return overlap / Math.max(ta.length, tb.length);
}

function isTranslationAcceptable(studentAnswer, referenceTranslations){
  if (!studentAnswer || !studentAnswer.trim()) return false;
  return (referenceTranslations || []).some(ref => translationSimilarity(studentAnswer, ref) >= 0.55);
}

// A sobreposição de palavras acima não pega troca de sujeito ("eu comprou"
// em vez de "eu comprei") -- "comprou" e "comprei" contam como palavras
// completamente diferentes pro comparador, então em geral esse erro já
// reduz a sobreposição sozinho, mas quando o resto da frase é longo o
// score ainda passa do limiar. Esta checagem olha só o par PRONOME +
// VERBO SEGUINTE dentro da própria resposta do aluno (não compara com a
// referência) -- não é um parser gramatical completo (não cobre sujeito
// oculto, verbos compostos, oração relativa etc.), só pega o par mais
// comum de erro: um pronome-sujeito explícito seguido de um verbo
// conjugado numa pessoa incompatível.
const PT_SUBJECT_PRONOUN_PERSON = {
  'eu': '1s', 'tu': '2s', 'voce': '3s', 'ele': '3s', 'ela': '3s',
  'nos': '1p', 'a gente': '1s', 'voces': '3p', 'eles': '3p', 'elas': '3p'
};

// Formas dos verbos irregulares mais comuns -- chaves já sem acento
// (mesma normalização usada pra comparar a resposta, ver
// normalizeForTranslationCompare) nos tempos presente/pretérito perfeito/
// imperfeito. Onde a forma sem acento colide entre pessoas diferentes
// (ex: "tem"/"têm", "vimos" de ver/vir), listamos as duas -- e onde colide
// com outra palavra comum não-verbal (ex: "da" de "dá" vs. a contração
// "da"), preferimos omitir a forma a arriscar falso positivo.
const PT_IRREGULAR_VERB_FORMS = {
  sou:'1s', es:'2s', e:'3s', somos:'1p', sao:'3p',
  era:['1s','3s'], eras:'2s', eramos:'1p', eram:'3p',
  fui:'1s', foi:'3s', fomos:'1p', foram:'3p',
  estou:'1s', estas:'2s', esta:'3s', estamos:'1p', estao:'3p',
  estava:['1s','3s'], estavas:'2s', estavamos:'1p', estavam:'3p',
  estive:'1s', esteve:'3s', estivemos:'1p', estiveram:'3p',
  tenho:'1s', tens:'2s', tem:['3s','3p'], temos:'1p',
  tinha:['1s','3s'], tinhas:'2s', tinhamos:'1p', tinham:'3p',
  tive:'1s', teve:'3s', tivemos:'1p', tiveram:'3p',
  vou:'1s', vais:'2s', vai:'3s', vamos:'1p', vao:'3p',
  faco:'1s', fazes:'2s', faz:'3s', fazemos:'1p', fazem:'3p',
  fiz:'1s', fez:'3s', fizemos:'1p', fizeram:'3p',
  posso:'1s', podes:'2s', pode:'3s', podemos:'1p', podem:'3p',
  pude:'1s', pudemos:'1p', puderam:'3p',
  quero:'1s', queres:'2s', quer:'3s', queremos:'1p', querem:'3p',
  quis:['1s','3s'], quisemos:'1p', quiseram:'3p',
  digo:'1s', dizes:'2s', diz:'3s', dizemos:'1p', dizem:'3p',
  disse:['1s','3s'], dissemos:'1p', disseram:'3p',
  vejo:'1s', ves:'2s', ve:'3s', vemos:'1p', veem:'3p',
  vi:'1s', viu:'3s', vimos:'1p', viram:'3p',
  dou:'1s', damos:'1p',
  dei:'1s', deu:'3s', demos:'1p', deram:'3p',
  venho:'1s', vens:'2s', vem:'3s', vim:'1s', veio:'3s', viemos:'1p', vieram:'3p',
  sei:'1s', sabes:'2s', sabe:'3s', sabemos:'1p', sabem:'3p',
  soube:['1s','3s'], soubemos:'1p', souberam:'3p',
  ponho:'1s', poes:'2s', poe:'3s', pomos:'1p', poem:'3p',
  pus:'1s', pos:'3s', pusemos:'1p', puseram:'3p',
};

function ptVerbPersonTags(word){
  if (PT_IRREGULAR_VERB_FORMS[word]){
    const v = PT_IRREGULAR_VERB_FORMS[word];
    return Array.isArray(v) ? v : [v];
  }
  const rules = [
    [/amos$|emos$|imos$/, '1p'],
    [/astes$|estes$|istes$/, '2p'],
    [/aram$|eram$|iram$/, '3p'],
    [/am$|em$/, '3p'],
    [/ou$|eu$|iu$/, '3s'],
    [/aste$|este$|iste$/, '2s'],
    [/ei$/, '1s'],
    [/as$|es$/, '2s'],
    [/o$/, '1s'],
    [/a$|e$/, '3s'],
  ];
  for (const [re, tag] of rules){
    if (re.test(word)) return [tag];
  }
  return [];
}

// Procura pronome-sujeito seguido (até 2 palavras de distância, pra
// tolerar advérbios como "já"/"não" no meio) de um verbo conjugado numa
// pessoa incompatível. Para de procurar ao encontrar outro pronome antes
// de achar um verbo reconhecível (não atribui o erro à oração seguinte).
function translationHasPersonMismatch(text){
  const words = normalizeForTranslationCompare(text).split(' ').filter(Boolean);
  for (let i = 0; i < words.length; i++){
    let pronoun = words[i];
    let j = i + 1;
    if (pronoun === 'a' && words[i + 1] === 'gente'){ pronoun = 'a gente'; j = i + 2; }
    const expected = PT_SUBJECT_PRONOUN_PERSON[pronoun];
    if (!expected) continue;
    for (let lookahead = 0; lookahead < 3 && j + lookahead < words.length; lookahead++){
      const candidate = words[j + lookahead];
      if (PT_SUBJECT_PRONOUN_PERSON[candidate]) break;
      const tags = ptVerbPersonTags(candidate);
      if (tags.length){
        if (!tags.includes(expected)) return { pronoun, verb: candidate, expected, got: tags };
        break;
      }
    }
  }
  return null;
}

function openListenTranslatePlayer(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-expression">🎧 Ouça e traduza</div>
    <div class="listen-translate-audio-wrap">
      <button class="dictation-play-btn" id="lt-play-btn">▶ Écouter</button>
    </div>
    <div class="listen-translate-hint-wrap">
      <button class="btn btn-secondary" id="lt-hint-btn">Montrer un indice</button>
      <p class="listen-translate-hint-text" id="lt-hint-text" style="display:none;"></p>
    </div>
    <label class="listen-translate-answer-label" for="lt-answer-input">Digite sua tradução:</label>
    <textarea class="listen-translate-answer-input" id="lt-answer-input" rows="2" placeholder="Sua tradução em português..."></textarea>
    <div class="listen-translate-actions">
      <button class="btn btn-primary" id="lt-verify-btn">Vérifier</button>
    </div>
    <div id="lt-feedback-wrap" aria-live="polite" aria-atomic="true"></div>
  `;

  document.getElementById('lt-play-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  document.getElementById('lt-hint-btn').addEventListener('click', (e) => {
    document.getElementById('lt-hint-text').textContent = c.hintText;
    document.getElementById('lt-hint-text').style.display = 'block';
    e.currentTarget.style.display = 'none';
  });
  document.getElementById('lt-verify-btn').addEventListener('click', () => checkListenTranslateAnswer(c));
}

function checkListenTranslateAnswer(c){
  const input = document.getElementById('lt-answer-input');
  const studentAnswer = input.value.trim();
  const personMismatch = translationHasPersonMismatch(studentAnswer);
  const isCorrect = !personMismatch && isTranslationAcceptable(studentAnswer, c.referenceTranslations);
  if (isCorrect) addXP(5);

  const ltBodyHTML = `
      ${personMismatch ? `<p class="listen-translate-feedback-warning">⚠ Repare na concordância: depois de "${escapeHtmlChallenge(personMismatch.pronoun)}", "${escapeHtmlChallenge(personMismatch.verb)}" não é a conjugação certa.</p>` : ''}
      <p class="listen-translate-feedback-row"><strong>Sua resposta</strong>${escapeHtmlChallenge(studentAnswer || '—')}</p>
      <p class="listen-translate-feedback-row"><strong>Resposta esperada</strong>${escapeHtmlChallenge(c.referenceTranslations[0])}</p>
      <p class="listen-translate-feedback-row"><strong>Frase original</strong>${escapeHtmlChallenge(c.sentenceFr)}</p>
      ${c.explanation ? `<p class="listen-translate-feedback-row"><strong>Explicação</strong>${escapeHtmlChallenge(c.explanation)}</p>` : ''}
      <button class="dictation-play-btn" id="lt-replay-btn">▶ Écouter encore</button>
  `;
  document.getElementById('lt-feedback-wrap').innerHTML = challengeFeedbackWrapperHTML('listen-translate', isCorrect, isCorrect ? '✅ Bonne traduction.' : '❌ Pas tout à fait.', ltBodyHTML);
  document.getElementById('lt-verify-btn').style.display = 'none';
  document.getElementById('lt-replay-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  wireChallengeCompleteButton(c);
}

// ---------- Acentuação ----------
// Correção sensível a acentos/cedilha/trema -- nunca remove diacríticos
// antes de comparar (só normaliza espaço/maiúsculas, que não são o alvo
// da atividade).
function normalizeForAccentCompare(s){
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isAccentAnswerCorrect(studentAnswer, targetText){
  return normalizeForAccentCompare(studentAnswer) === normalizeForAccentCompare(targetText);
}

function openAccentPlayer(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-expression">✍️ Acentuação</div>
    <div class="accent-audio-wrap">
      <button class="dictation-play-btn" id="accent-play-btn">▶ Écouter</button>
    </div>
    <label class="listen-translate-answer-label" for="accent-answer-input">Digite o que você ouviu:</label>
    <input type="text" class="accent-answer-input" id="accent-answer-input" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="listen-translate-actions">
      <button class="btn btn-primary" id="accent-verify-btn">Vérifier</button>
    </div>
    <div id="accent-feedback-wrap" aria-live="polite" aria-atomic="true"></div>
  `;

  document.getElementById('accent-play-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  document.getElementById('accent-answer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAccentAnswer(c);
  });
  document.getElementById('accent-verify-btn').addEventListener('click', () => checkAccentAnswer(c));
}

function checkAccentAnswer(c){
  const input = document.getElementById('accent-answer-input');
  const studentAnswer = input.value.trim();
  const isCorrect = isAccentAnswerCorrect(studentAnswer, c.targetText);
  if (isCorrect) addXP(5);

  const accentBodyHTML = `
      ${!isCorrect ? `<p class="accent-feedback-answer">Sua resposta: <strong>${escapeHtmlChallenge(studentAnswer || '—')}</strong></p>` : ''}
      <div class="accent-feedback-correct-word">${escapeHtmlChallenge(c.targetText)}</div>
      <button class="dictation-play-btn" id="accent-replay-btn">▶ Écouter</button>
      ${c.explanation ? `<p class="accent-feedback-explanation">${escapeHtmlChallenge(c.explanation)}</p>` : ''}
  `;
  document.getElementById('accent-feedback-wrap').innerHTML = challengeFeedbackWrapperHTML('accent', isCorrect, isCorrect ? '✅ Correct.' : '❌ Incorrect.', accentBodyHTML);
  document.getElementById('accent-verify-btn').style.display = 'none';
  document.getElementById('accent-replay-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  wireChallengeCompleteButton(c);
}

// ---------- Revisão do admin ----------
// Aprovar/Editar/Rejeitar/Publicar/Despublicar gravam de verdade na
// tabela `challenges` do Supabase (protegida por RLS) -- ver
// loadChallengesFromDB()/persistChallenge() no início da seção de
// Desafios. Não é mais uma simulação de sessão do navegador.
let challengesAdminEditingId = null;
// Seleção pra aprovação em lote (só usada na seção Pendentes) -- guarda
// os ids marcados, sobrevive a um re-render normal (busca/paginação),
// mas é limpa depois de aprovar o lote ou ao trocar de aba admin.
const challengesAdminSelectedIds = new Set();

// MD5 (RFC 1321) puro em JS -- só usado aqui, pra conferir se um áudio já
// gerado ainda corresponde ao texto atual. O pipeline Python nomeia cada
// arquivo de áudio como md5(texto)[:12] + '.mp3' (ver scripts/
// challenges_pipeline/tts.py) -- então basta recalcular o mesmo hash no
// texto salvo agora e comparar com o nome do arquivo: se bater, o áudio
// é da versão atual do texto; se não bater, o texto foi editado depois
// que o áudio foi gerado ("áudio desatualizado").
function md5Hex(str){
  function rotl(x, c){ return (x << c) | (x >>> (32 - c)); }
  const K = new Uint32Array([
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391
  ]);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
             5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
             4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
             6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];

  const msg = new TextEncoder().encode(str);
  const origLenBits = msg.length * 8;
  const withOne = new Uint8Array(((msg.length + 8) >> 6 << 6) + 64);
  withOne.set(msg);
  withOne[msg.length] = 0x80;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length - 8, origLenBits >>> 0, true);
  dv.setUint32(withOne.length - 4, Math.floor(origLenBits / 4294967296), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < withOne.length; chunkStart += 64){
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(chunkStart + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++){
      let F, g;
      if (i < 16){ F = (B & C) | (~B & D); g = i; }
      else if (i < 32){ F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48){ F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  function toHexLE(n){
    let bytes = [];
    for (let i = 0; i < 4; i++){ bytes.push((n & 0xff).toString(16).padStart(2, '0')); n >>>= 8; }
    return bytes.join('');
  }
  return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
}

function challengeAudioIsFresh(text, audioFile){
  if (!audioFile) return null; // sem áudio nenhum -- não é "desatualizado", é "ausente"
  return md5Hex(text).slice(0, 12) + '.mp3' === audioFile;
}

// Lista os campos de áudio de um desafio (texto de origem + arquivo),
// independente do tipo -- usado tanto pro checklist quanto pra prévia.
function challengeAudioFields(c){
  if (c.type === 'expression'){
    return [
      { label: 'Áudio da expressão-alvo', text: c.canonicalExpression, audioFile: c.expressionAudioFile },
      { label: 'Áudio do Exemple 1', text: c.example.text, audioFile: c.example.audioFile },
      { label: 'Áudio do Exemple 2', text: c.secondExample.text, audioFile: c.secondExample.audioFile },
    ];
  }
  if (c.type === 'listen_translate'){
    return [{ label: 'Áudio da frase', text: c.sentenceFr, audioFile: c.audioFile }];
  }
  if (c.type === 'accent'){
    return [{ label: 'Áudio da palavra', text: c.targetText, audioFile: c.audioFile }];
  }
  return [];
}

// Checklist de qualidade -- cada item tem { label, ok, blocking }.
// `blocking` = true significa que o desafio realmente não funciona sem
// isso (nunca deve ser publicado assim); os outros são avisos.
function challengeQualityChecklist(c){
  const items = [];

  challengeAudioFields(c).forEach(f => {
    if (!f.audioFile){
      items.push({ label: `${f.label}: ausente`, ok: false, blocking: true });
    } else if (challengeAudioIsFresh(f.text, f.audioFile) === false){
      items.push({ label: `${f.label}: desatualizado (texto mudou depois do áudio ser gerado)`, ok: false, blocking: false, audioFile: f.audioFile });
    } else {
      items.push({ label: `${f.label}: disponível e atualizado`, ok: true, blocking: false, audioFile: f.audioFile });
    }
  });

  if (c.type === 'expression'){
    items.push({ label: 'Resposta correta definida', ok: !!c.correctAnswer && c.options.includes(c.correctAnswer), blocking: true });
    items.push({ label: '4 alternativas', ok: c.options.length === 4, blocking: true });
    items.push({ label: 'Explicação preenchida', ok: !!c.explanation, blocking: false });
    items.push({ label: 'Microatividade válida', ok: !!(c.microActivity.prompt && c.microActivity.answer), blocking: false });
  } else if (c.type === 'listen_translate'){
    items.push({ label: 'Frase preenchida', ok: !!c.sentenceFr, blocking: true });
    items.push({ label: 'Dica preenchida', ok: !!c.hintText, blocking: false });
    items.push({ label: 'Ao menos 1 tradução aceita', ok: (c.referenceTranslations || []).length > 0, blocking: true });
  } else if (c.type === 'accent'){
    items.push({ label: 'Palavra/expressão preenchida', ok: !!c.targetText, blocking: true });
    items.push({ label: 'Explicação preenchida', ok: !!c.explanation, blocking: false });
  }

  return items;
}

function challengeQualityChecklistHTML(c){
  const items = challengeQualityChecklist(c);
  return `
    <div class="challenges-admin-checklist">
      <strong style="font-size:12px;">Controle de qualidade</strong>
      ${items.map(it => `
        <div class="challenges-admin-checklist-item ${it.ok ? 'ok' : 'warn'}">
          ${it.ok ? '✓' : '⚠'} ${escapeHtmlChallenge(it.label)}
          ${it.audioFile ? `<span class="challenges-admin-audio-duration" data-audio-file="${escapeHtmlChallenge(it.audioFile)}">carregando duração…</span>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// Preenche a duração real de cada áudio referenciado no checklist (só
// carrega os metadados, não baixa o arquivo inteiro).
function wireChallengeAudioDurations(container){
  container.querySelectorAll('[data-audio-file]').forEach(el => {
    const audio = new Audio(`audio/challenges/${el.dataset.audioFile}`);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      el.textContent = `· ${audio.duration.toFixed(1).replace('.', ',')} s`;
    });
    audio.addEventListener('error', () => {
      el.textContent = '· não foi possível carregar';
    });
  });
}

const CHALLENGE_RESOURCE_TYPE_LABEL = {
  dictionary: 'Dicionário', article: 'Artigo linguístico', youtube: 'Vídeo', youglish: 'Exemplos autênticos'
};
const CHALLENGE_RESOURCE_QUALITY_LABEL = { high: 'Alta', medium: 'Média', low: 'Baixa' };

function challengeAdminResourceHTML(r, idx){
  return `
    <div class="challenges-admin-resource ${r.approved === false ? 'rejected' : ''}" data-resource-idx="${idx}">
      <div class="challenges-admin-resource-info">
        <strong>${escapeHtmlChallenge(r.sourceName || r.title)}</strong>
        <span class="challenges-admin-hint">Tipo: ${escapeHtmlChallenge(CHALLENGE_RESOURCE_TYPE_LABEL[r.type] || r.type)}${r.quality ? ` · Qualidade: ${CHALLENGE_RESOURCE_QUALITY_LABEL[r.quality] || r.quality}` : ''}</span>
        <span class="challenges-admin-hint">${escapeHtmlChallenge(r.description || '')}</span>
        <span class="challenges-admin-hint">${r.lastChecked ? `Link verificado em ${escapeHtmlChallenge(r.lastChecked)}` : 'Link não verificado automaticamente — confira antes de aprovar'}</span>
      </div>
      <div class="challenges-admin-resource-actions">
        <a class="btn btn-secondary btn-sm" href="${escapeHtmlChallenge(r.url)}" target="_blank" rel="noopener">Abrir</a>
        <button class="btn btn-sm ${r.approved !== false ? 'btn-primary' : 'btn-secondary'}" data-resource-action="approve">✅ Aprovar</button>
        <button class="btn btn-sm ${r.approved === false ? 'btn-primary' : 'btn-secondary'}" data-resource-action="reject">❌ Rejeitar</button>
      </div>
    </div>
  `;
}

function challengeAdminReadViewExpression(c){
  const resourcesHTML = (c.externalResources && c.externalResources.length)
    ? c.externalResources.map((r, idx) => challengeAdminResourceHTML(r, idx)).join('')
    : `<p class="challenges-admin-hint">Nenhum recurso externo encontrado</p>`;

  return `
    <p class="challenges-admin-field"><strong>Áudio da expressão-alvo:</strong> ${c.expressionAudioFile ? `🔊 disponível — <span class="challenges-admin-hint">este é o áudio tocado no início do desafio, não o exemplo contextual</span>` : '<span class="challenges-admin-hint">ausente</span>'}</p>
    <p class="challenges-admin-field"><strong>Exemplo (contexto escrito, sem áudio automático):</strong> ${escapeHtmlChallenge(c.example.text)}</p>
    <p class="challenges-admin-field"><strong>Pergunta:</strong> ${escapeHtmlChallenge(c.question)}</p>
    <ul class="challenges-admin-choices">
      ${c.options.map(opt => `<li class="${opt === c.correctAnswer ? 'correct' : ''}">${escapeHtmlChallenge(opt)}</li>`).join('')}
    </ul>
    <p class="challenges-admin-field"><strong>Explicação:</strong> ${escapeHtmlChallenge(c.explanation)}</p>
    <p class="challenges-admin-field"><strong>2º exemplo:</strong> ${escapeHtmlChallenge(c.secondExample.text)} ${c.secondExample.audioFile ? '🔊' : '<span class="challenges-admin-hint">(sem áudio)</span>'}</p>
    <p class="challenges-admin-field"><strong>Microatividade:</strong> ${escapeHtmlChallenge(c.microActivity.prompt)} → ${escapeHtmlChallenge(c.microActivity.answer)}</p>
    <p class="challenges-admin-field"><strong>Recursos encontrados (Pour aller plus loin):</strong></p>
    <div class="challenges-admin-resources">${resourcesHTML}</div>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewExpression(c){
  const optionsText = c.options.map(o => (o === c.correctAnswer ? '*' : '') + o).join('\n');
  return `
    <label class="challenges-admin-edit-label">Exemplo
      <textarea class="challenges-admin-edit-input" data-field="example.text" rows="2">${escapeHtmlChallenge(c.example.text)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Pergunta
      <input class="challenges-admin-edit-input" data-field="question" value="${escapeHtmlChallenge(c.question)}">
    </label>
    <label class="challenges-admin-edit-label">Alternativas (uma por linha — marque a correta com * no início)
      <textarea class="challenges-admin-edit-input" data-field="options" rows="4">${escapeHtmlChallenge(optionsText)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Explicação
      <textarea class="challenges-admin-edit-input" data-field="explanation" rows="2">${escapeHtmlChallenge(c.explanation)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">2º exemplo
      <textarea class="challenges-admin-edit-input" data-field="secondExample.text" rows="2">${escapeHtmlChallenge(c.secondExample.text)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Microatividade — frase
      <input class="challenges-admin-edit-input" data-field="microActivity.prompt" value="${escapeHtmlChallenge(c.microActivity.prompt)}">
    </label>
    <label class="challenges-admin-edit-label">Microatividade — resposta
      <input class="challenges-admin-edit-input" data-field="microActivity.answer" value="${escapeHtmlChallenge(c.microActivity.answer)}">
    </label>
    <p class="challenges-admin-hint">Editar o texto de um exemplo não regenera o áudio automaticamente — me avise se algum áudio precisar ser refeito.</p>
  `;
}

function challengeAdminReadViewListenTranslate(c){
  return `
    <p class="challenges-admin-field"><strong>Áudio:</strong> ${c.audioFile ? '🔊 disponível' : '<span class="challenges-admin-hint">ausente</span>'}</p>
    <p class="challenges-admin-field"><strong>Frase (francês):</strong> ${escapeHtmlChallenge(c.sentenceFr)}</p>
    <p class="challenges-admin-field"><strong>Dica (cloze):</strong> ${escapeHtmlChallenge(c.hintText)}</p>
    <p class="challenges-admin-field"><strong>Traduções aceitas:</strong></p>
    <ul class="challenges-admin-choices">
      ${(c.referenceTranslations || []).map(t => `<li>${escapeHtmlChallenge(t)}</li>`).join('')}
    </ul>
    <p class="challenges-admin-field"><strong>Explicação:</strong> ${escapeHtmlChallenge(c.explanation || '—')}</p>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewListenTranslate(c){
  return `
    <label class="challenges-admin-edit-label">Frase (francês)
      <textarea class="challenges-admin-edit-input" data-field="sentenceFr" rows="2">${escapeHtmlChallenge(c.sentenceFr)}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Dica (cloze, com ______ pra parte oculta)
      <input class="challenges-admin-edit-input" data-field="hintText" value="${escapeHtmlChallenge(c.hintText)}">
    </label>
    <label class="challenges-admin-edit-label">Traduções aceitas (uma por linha, a primeira é a "resposta esperada" mostrada no feedback)
      <textarea class="challenges-admin-edit-input" data-field="referenceTranslations" rows="4">${escapeHtmlChallenge((c.referenceTranslations || []).join('\n'))}</textarea>
    </label>
    <label class="challenges-admin-edit-label">Explicação
      <input class="challenges-admin-edit-input" data-field="explanation" value="${escapeHtmlChallenge(c.explanation || '')}">
    </label>
    <p class="challenges-admin-hint">Editar a frase não regenera o áudio automaticamente — me avise se precisar ser refeito.</p>
  `;
}

function challengeAdminReadViewAccent(c){
  return `
    <p class="challenges-admin-field"><strong>Áudio:</strong> ${c.audioFile ? '🔊 disponível' : '<span class="challenges-admin-hint">ausente</span>'}</p>
    <p class="challenges-admin-field"><strong>Palavra/expressão:</strong> ${escapeHtmlChallenge(c.targetText)}</p>
    <p class="challenges-admin-field"><strong>Explicação:</strong> ${escapeHtmlChallenge(c.explanation || '—')}</p>
    ${challengeQualityChecklistHTML(c)}
  `;
}

function challengeAdminEditViewAccent(c){
  return `
    <label class="challenges-admin-edit-label">Palavra/expressão (com acentos corretos)
      <input class="challenges-admin-edit-input" data-field="targetText" value="${escapeHtmlChallenge(c.targetText)}">
    </label>
    <label class="challenges-admin-edit-label">Explicação
      <input class="challenges-admin-edit-input" data-field="explanation" value="${escapeHtmlChallenge(c.explanation || '')}">
    </label>
    <p class="challenges-admin-hint">Editar a palavra não regenera o áudio automaticamente — me avise se precisar ser refeito.</p>
  `;
}

function challengeAdminReadView(c){
  if (c.type === 'listen_translate') return challengeAdminReadViewListenTranslate(c);
  if (c.type === 'accent') return challengeAdminReadViewAccent(c);
  return challengeAdminReadViewExpression(c);
}

function challengeAdminEditView(c){
  if (c.type === 'listen_translate') return challengeAdminEditViewListenTranslate(c);
  if (c.type === 'accent') return challengeAdminEditViewAccent(c);
  return challengeAdminEditViewExpression(c);
}

// Mostra um trecho do conteúdo de verdade, não só o rótulo genérico da
// categoria -- com vários "Ouça e traduza" pendentes ao mesmo tempo, o
// admin não tinha como distinguir um card do outro sem abrir cada um.
function challengeAdminCardTitle(c){
  if (c.type === 'expression') return escapeHtmlChallenge(c.canonicalExpression);
  if (c.type === 'listen_translate'){
    const snippet = (c.sentenceFr || '').length > 60 ? c.sentenceFr.slice(0, 57) + '…' : (c.sentenceFr || '');
    return `🎧 ${escapeHtmlChallenge(snippet)}`;
  }
  if (c.type === 'accent') return `✍️ Acentuação — ${escapeHtmlChallenge(c.targetText)}`;
  return '';
}

// Aprova só se não houver problema bloqueante (áudio ausente, resposta
// correta não definida, etc.) -- com problema não-bloqueante (ex: áudio
// desatualizado), pede confirmação explícita em vez de aprovar direto.
// Grava a publicação de verdade no Supabase (status/published_at/
// published_by) -- não é mais uma simulação de sessão, então continua
// publicado depois de fechar/reabrir o navegador.
async function approveChallengeWithGate(c){
  const items = challengeQualityChecklist(c);
  const blocking = items.filter(it => !it.ok && it.blocking);
  const warnings = items.filter(it => !it.ok && !it.blocking);
  if (blocking.length){
    alert('Não é possível aprovar — corrija antes:\n\n' + blocking.map(b => '• ' + b.label).join('\n'));
    return false;
  }
  if (warnings.length){
    const proceed = confirm('Atenção, encontrei possíveis problemas:\n\n' + warnings.map(w => '• ' + w.label).join('\n') + '\n\nAprovar mesmo assim?');
    if (!proceed) return false;
  }
  const previousStatus = c.status;
  c.status = 'published';
  const ok = await persistChallenge(c, {
    published_at: new Date().toISOString(),
    published_by: CURRENT_USER.email,
  });
  if (!ok){
    c.status = previousStatus;
    return false;
  }
  showToast('Desafio publicado — já está visível pro aluno.');
  return true;
}

// Aprovação em lote: só publica automaticamente quem não tem NENHUM item
// pendente no checklist de qualidade (nem bloqueante, nem aviso) -- ao
// contrário de approveChallengeWithGate (que pergunta um por um via
// confirm()), aqui isso viraria uma sequência de alertas irritante pra
// várias dezenas de itens. Quem tem qualquer problema fica de fora do
// lote e continua pendente, listado no resumo pra revisão individual.
async function approveChallengeSilent(c){
  const items = challengeQualityChecklist(c);
  if (items.some(it => !it.ok)) return { ok: false, skipped: true };
  const previousStatus = c.status;
  c.status = 'published';
  const ok = await persistChallenge(c, {
    published_at: new Date().toISOString(),
    published_by: CURRENT_USER.email,
  });
  if (!ok){ c.status = previousStatus; return { ok: false, skipped: false }; }
  return { ok: true, skipped: false };
}

// Tira um desafio publicado do ar sem descartar o conteúdo (volta pra
// "approved": pronto, mas não visível pro aluno até ser publicado de
// novo). Persistido de verdade, mesma lógica de approveChallengeWithGate.
async function unpublishChallenge(c){
  const previousStatus = c.status;
  c.status = 'approved';
  const ok = await persistChallenge(c, {
    unpublished_at: new Date().toISOString(),
    unpublished_by: CURRENT_USER.email,
  });
  if (!ok){
    c.status = previousStatus;
    return false;
  }
  showToast('Desafio despublicado — não aparece mais pro aluno.');
  return true;
}

// ---------- Ver versão do aluno (prévia administrativa) ----------
// Reaproveita o MESMO player que o aluno usa (openChallengePlayer /
// openExpressionPlayer / openListenTranslatePlayer / openAccentPlayer) --
// nunca uma versão separada só pra exibição. O único acréscimo é a faixa
// de aviso "modo administrador" com os controles de aprovar/voltar.
function openChallengePreview(c){
  challengePreviewMode = true;
  challengeQueueContext = null;
  document.getElementById('challenges-admin-wrap').style.display = 'none';
  document.getElementById('challenges-categories-wrap').style.display = 'none';
  document.getElementById('challenges-list-wrap').style.display = 'none';

  openChallengePlayer(c.id);
  renderChallengePreviewBanner(c);
}

function renderChallengePreviewBanner(c){
  const banner = document.getElementById('challenge-preview-banner');
  const items = challengeQualityChecklist(c);
  const blocking = items.filter(it => !it.ok && it.blocking);

  banner.className = 'challenge-preview-banner';
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div class="challenge-preview-banner-label">🔍 Pré-visualização — versão do aluno</div>
    <div class="challenge-preview-banner-actions">
      ${c.type !== 'expression' ? '<button class="btn btn-secondary btn-sm" id="preview-show-answer-btn">Mostrar resposta esperada</button>' : ''}
      <button class="btn btn-secondary" id="preview-back-to-edit-btn">← Voltar para edição</button>
      <button class="btn btn-primary" id="preview-approve-btn"${blocking.length ? ' disabled' : ''}>✅ Aprovar desafio</button>
    </div>
  `;
  if (blocking.length){
    const warn = document.createElement('div');
    warn.className = 'challenge-preview-warning';
    warn.textContent = '⚠ ' + blocking.map(b => b.label).join(' · ');
    banner.after(warn);
    banner.dataset.hasWarningEl = '1';
  }

  document.getElementById('preview-back-to-edit-btn').addEventListener('click', () => {
    challengePreviewMode = false;
    challengesAdminEditingId = c.id;
    removePreviewWarningEl();
    renderChallengesAdmin();
  });
  document.getElementById('preview-approve-btn').addEventListener('click', async () => {
    if (await approveChallengeWithGate(c)){
      challengePreviewMode = false;
      removePreviewWarningEl();
      renderChallengesAdmin();
    }
  });
  const showAnswerBtn = document.getElementById('preview-show-answer-btn');
  if (showAnswerBtn){
    showAnswerBtn.addEventListener('click', () => {
      const answer = c.type === 'listen_translate' ? (c.referenceTranslations || [])[0] : c.targetText;
      alert('Resposta esperada: ' + answer);
    });
  }
}

function removePreviewWarningEl(){
  const banner = document.getElementById('challenge-preview-banner');
  if (banner && banner.dataset.hasWarningEl){
    const next = banner.nextElementSibling;
    if (next && next.classList.contains('challenge-preview-warning')) next.remove();
    delete banner.dataset.hasWarningEl;
  }
}

function challengeAdminPublishedCardHTML(c){
  return `
    <div class="challenges-admin-card" data-challenge-id="${c.id}">
      <div class="challenges-admin-card-header">
        <span class="challenge-card-level">${c.level}</span>
        <strong>${challengeAdminCardTitle(c)}</strong>
      </div>
      <div class="challenges-admin-actions">
        <button class="btn btn-secondary" data-action="preview">👁️ Ver versão do aluno</button>
        <button class="btn btn-secondary" data-action="edit">✏️ Editar</button>
        <button class="btn btn-secondary" data-action="unpublish">🚫 Despublicar</button>
      </div>
    </div>
  `;
}

// Recarrega do Supabase antes de renderizar -- garante que a fila de
// revisão e a lista de publicados refletem o estado real do banco (ex:
// uma publicação feita em outra sessão/navegador), não um cache antigo.
// ---------- Busca/filtro/paginação do painel admin ----------
// Com dezenas de desafios, uma lista única sem busca vira inviável. Busca
// e filtros re-renderizam só a lista (renderChallengesAdminList, sem
// buscar do banco de novo -- senão cada tecla digitada dispararia uma
// consulta); só ações que mudam dado de verdade (aprovar/editar/etc.)
// chamam renderChallengesAdmin(), que recarrega.
const challengesAdminFilterState = { search: '', type: 'all', level: 'all' };
const CHALLENGES_ADMIN_PAGE_SIZE = 15;
const challengesAdminVisibleCount = { pending: CHALLENGES_ADMIN_PAGE_SIZE, published: CHALLENGES_ADMIN_PAGE_SIZE, unpublished: CHALLENGES_ADMIN_PAGE_SIZE };
const CHALLENGE_TYPE_LABELS = { expression: 'Expressões', listen_translate: 'Ouça e traduza', accent: 'Acentuação' };

function challengeSearchableText(c){
  return [c.canonicalExpression, c.sentenceFr, c.targetText, c.question, c.explanation]
    .filter(Boolean).join(' ').toLowerCase();
}

function applyChallengesAdminFilters(list){
  const { search, type, level } = challengesAdminFilterState;
  return list.filter(c => {
    if (type !== 'all' && c.type !== type) return false;
    if (level !== 'all' && c.level !== level) return false;
    if (search && !challengeSearchableText(c).includes(search)) return false;
    return true;
  });
}

function challengesAdminFilterBarHTML(){
  const levelOptions = CHALLENGE_LEVELS_ORDER.map(l => `<option value="${l}" ${challengesAdminFilterState.level === l ? 'selected' : ''}>${l}</option>`).join('');
  const typeOptions = Object.entries(CHALLENGE_TYPE_LABELS).map(([val, label]) =>
    `<option value="${val}" ${challengesAdminFilterState.type === val ? 'selected' : ''}>${label}</option>`).join('');
  return `
    <div class="challenges-admin-filters">
      <input type="text" id="challenges-admin-search" placeholder="Buscar por expressão, frase, palavra..." value="${escapeHtmlChallenge(challengesAdminFilterState.search)}">
      <select id="challenges-admin-filter-type">
        <option value="all" ${challengesAdminFilterState.type === 'all' ? 'selected' : ''}>Todas as categorias</option>
        ${typeOptions}
      </select>
      <select id="challenges-admin-filter-level">
        <option value="all" ${challengesAdminFilterState.level === 'all' ? 'selected' : ''}>Todos os níveis</option>
        ${levelOptions}
      </select>
    </div>
  `;
}

function wireChallengesAdminFilterBar(content){
  const searchInput = content.querySelector('#challenges-admin-search');
  const typeSelect = content.querySelector('#challenges-admin-filter-type');
  const levelSelect = content.querySelector('#challenges-admin-filter-level');
  searchInput.addEventListener('input', () => {
    challengesAdminFilterState.search = searchInput.value.trim().toLowerCase();
    challengesAdminVisibleCount.pending = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.published = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.unpublished = CHALLENGES_ADMIN_PAGE_SIZE;
    renderChallengesAdminList();
  });
  typeSelect.addEventListener('change', () => {
    challengesAdminFilterState.type = typeSelect.value;
    challengesAdminVisibleCount.pending = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.published = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.unpublished = CHALLENGES_ADMIN_PAGE_SIZE;
    renderChallengesAdminList();
  });
  levelSelect.addEventListener('change', () => {
    challengesAdminFilterState.level = levelSelect.value;
    challengesAdminVisibleCount.pending = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.published = CHALLENGES_ADMIN_PAGE_SIZE;
    challengesAdminVisibleCount.unpublished = CHALLENGES_ADMIN_PAGE_SIZE;
    renderChallengesAdminList();
  });
  // Foca de novo depois de re-renderizar (o innerHTML novo perde o foco).
  searchInput.focus();
  const val = searchInput.value;
  searchInput.value = '';
  searchInput.value = val;
}

// Uma seção (pendentes/publicados/despublicados) com paginação por
// "Carregar mais" -- mostra só challengesAdminVisibleCount[sectionKey]
// itens do total já filtrado, sem limitar o que existe no banco.
function challengesAdminSectionHTML(sectionKey, title, filteredList, cardHTMLFn, emptyMsg, toolbarHTML = ''){
  if (filteredList.length === 0){
    return emptyMsg ? `<h3 class="challenges-admin-section-title">${title} (0)</h3><p class="challenges-admin-empty">${emptyMsg}</p>` : '';
  }
  const visibleCount = challengesAdminVisibleCount[sectionKey];
  const visible = filteredList.slice(0, visibleCount);
  const remaining = filteredList.length - visible.length;
  return `
    <h3 class="challenges-admin-section-title">${title} (${filteredList.length})</h3>
    ${toolbarHTML}
    ${visible.map(cardHTMLFn).join('')}
    ${remaining > 0 ? `<button class="btn btn-secondary challenges-admin-load-more" data-section="${sectionKey}">Carregar mais ${Math.min(remaining, CHALLENGES_ADMIN_PAGE_SIZE)} (${remaining} restantes)</button>` : ''}
  `;
}

// Barra de aprovação em lote na seção Pendentes -- ação de sempre continua
// sendo aprovar um por um; o lote é um atalho pra vários itens "óbvios"
// acumulados. `filteredPending` é a lista inteira já filtrada (não só a
// página visível), pra "selecionar todos" e a contagem baterem mesmo com
// "Carregar mais" ainda não clicado, e pra descartar seleção de itens que
// saíram da fila (aprovados/rejeitados em outra aba) num refresh.
function challengesAdminBulkToolbarHTML(filteredPending){
  const filteredIds = new Set(filteredPending.map(c => c.id));
  [...challengesAdminSelectedIds].forEach(id => { if (!filteredIds.has(id)) challengesAdminSelectedIds.delete(id); });
  const selectedCount = challengesAdminSelectedIds.size;
  const allSelected = filteredPending.length > 0 && selectedCount === filteredPending.length;
  return `
    <div class="challenges-admin-bulk-toolbar">
      <label class="challenges-admin-select-all">
        <input type="checkbox" id="challenges-admin-select-all" ${allSelected ? 'checked' : ''}>
        Selecionar todos (${filteredPending.length})
      </label>
      <button class="btn btn-primary btn-sm" id="challenges-admin-bulk-approve-btn" ${selectedCount === 0 ? 'disabled' : ''}>
        ✅ Aprovar selecionados (${selectedCount})
      </button>
    </div>
  `;
}

function challengeAdminPendingCardHTML(c){
  const editing = challengesAdminEditingId === c.id;
  return `
    <div class="challenges-admin-card" data-challenge-id="${c.id}">
      <div class="challenges-admin-card-header">
        ${editing ? '' : `<input type="checkbox" class="challenges-admin-select-checkbox" data-id="${c.id}" ${challengesAdminSelectedIds.has(c.id) ? 'checked' : ''} aria-label="Selecionar pra aprovação em lote">`}
        <span class="challenge-card-level">${c.level}</span>
        <strong>${challengeAdminCardTitle(c)}</strong>
      </div>
      <div class="challenges-admin-card-body">
        ${editing ? challengeAdminEditView(c) : challengeAdminReadView(c)}
      </div>
      <div class="challenges-admin-actions">
        ${editing
          ? `<button class="btn btn-primary" data-action="save">💾 Salvar</button>
             <button class="btn btn-secondary" data-action="cancel-edit">Cancelar</button>`
          : `<button class="btn btn-primary" data-action="approve">✅ Aprovar e publicar</button>
             <button class="btn btn-secondary" data-action="preview">👁️ Ver versão do aluno</button>
             <button class="btn btn-secondary" data-action="edit">✏️ Editar</button>
             <button class="btn btn-secondary" data-action="reject">❌ Rejeitar</button>`
        }
      </div>
    </div>
  `;
}

async function renderChallengesAdmin(){
  if (!isChallengesAdmin()) return;
  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'none';
  document.getElementById('challenges-admin-wrap').style.display = 'block';

  const content = document.getElementById('challenges-admin-content');
  content.innerHTML = `<p class="challenges-admin-empty">Carregando…</p>`;
  const ok = await loadChallengesFromDB();
  if (!ok){
    content.innerHTML = `<p class="challenges-admin-empty">⚠ Não foi possível carregar os desafios agora. Verifique sua conexão e tente novamente -- isto NÃO significa que a fila está vazia.</p>`;
    return;
  }

  renderChallengesAdminList();
}

// Renderiza a partir do que já está em CHALLENGES, sem consultar o banco
// de novo -- usada pela busca/filtros/paginação (renderChallengesAdmin
// chama esta depois de carregar).
function renderChallengesAdminList(){
  const content = document.getElementById('challenges-admin-content');

  const pendingUnfiltered = pendingChallenges();
  const publishedUnfiltered = publishedChallenges();
  const unpublishedUnfiltered = unpublishedButApprovedChallenges();
  const pending = applyChallengesAdminFilters(pendingUnfiltered);
  const published = applyChallengesAdminFilters(publishedUnfiltered);
  const unpublished = applyChallengesAdminFilters(unpublishedUnfiltered);

  // Uma seção vazia por causa do filtro atual não é a mesma coisa que uma
  // seção genuinamente vazia -- a mensagem diz qual é qual, em vez de
  // sempre "nenhum desafio [status]" mesmo quando na verdade existem,
  // só não bateram com a busca/filtro.
  const sectionEmptyMsg = (filtered, unfiltered, genuineMsg) =>
    filtered.length === 0 && unfiltered.length > 0 ? 'Nenhum resultado nesta seção com o filtro atual.' : genuineMsg;

  const pendingHTML = challengesAdminSectionHTML('pending', 'Pendentes de revisão', pending, challengeAdminPendingCardHTML,
    sectionEmptyMsg(pending, pendingUnfiltered, 'Nenhum desafio pendente de revisão.'),
    pending.length > 0 ? challengesAdminBulkToolbarHTML(pending) : '');
  const publishedHTML = challengesAdminSectionHTML('published', 'Publicados', published, challengeAdminPublishedCardHTML,
    sectionEmptyMsg(published, publishedUnfiltered, 'Nenhum desafio publicado ainda.'));
  const unpublishedHTML = challengesAdminSectionHTML('unpublished', 'Despublicados', unpublished, challengeAdminPublishedCardHTML,
    sectionEmptyMsg(unpublished, unpublishedUnfiltered, 'Nenhum desafio despublicado.'));

  // Cada seção já mostra sua própria mensagem contextual quando vazia
  // (genuinamente vazia vs. vazia só por causa do filtro atual) --
  // nenhuma mensagem redundante no topo.
  content.innerHTML = challengesAdminFilterBarHTML() + pendingHTML + publishedHTML + unpublishedHTML;
  wireChallengesAdminFilterBar(content);

  content.querySelectorAll('.challenges-admin-load-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      challengesAdminVisibleCount[section] += CHALLENGES_ADMIN_PAGE_SIZE;
      renderChallengesAdminList();
    });
  });

  content.querySelectorAll('.challenges-admin-select-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) challengesAdminSelectedIds.add(cb.dataset.id);
      else challengesAdminSelectedIds.delete(cb.dataset.id);
      renderChallengesAdminList();
    });
  });
  const selectAllCb = content.querySelector('#challenges-admin-select-all');
  if (selectAllCb) selectAllCb.addEventListener('change', () => {
    if (selectAllCb.checked) pending.forEach(c => challengesAdminSelectedIds.add(c.id));
    else pending.forEach(c => challengesAdminSelectedIds.delete(c.id));
    renderChallengesAdminList();
  });
  const bulkApproveBtn = content.querySelector('#challenges-admin-bulk-approve-btn');
  if (bulkApproveBtn) bulkApproveBtn.addEventListener('click', async () => {
    const targets = pending.filter(c => challengesAdminSelectedIds.has(c.id));
    if (targets.length === 0) return;
    if (!confirm(`Aprovar e publicar ${targets.length} desafio(s) selecionado(s)? Só quem não tiver nenhum problema no checklist de qualidade é publicado automaticamente -- o resto continua pendente pra revisão individual.`)) return;
    bulkApproveBtn.disabled = true;
    bulkApproveBtn.textContent = 'Aprovando…';
    let published = 0;
    const skipped = [];
    for (const c of targets){
      const result = await approveChallengeSilent(c);
      if (result.ok){ published++; challengesAdminSelectedIds.delete(c.id); }
      else if (result.skipped) skipped.push(challengeAdminCardTitle(c));
    }
    showToast(skipped.length === 0
      ? `${published} desafio(s) publicado(s).`
      : `${published} publicado(s). ${skipped.length} pulado(s) por ter algum problema no checklist -- revise um por um: ${skipped.join(', ')}`);
    renderChallengesAdmin();
  });

  wireChallengeAudioDurations(content);

  content.querySelectorAll('.challenges-admin-card').forEach(card => {
    const id = card.dataset.challengeId;
    const approveBtn = card.querySelector('[data-action="approve"]');
    const previewBtn = card.querySelector('[data-action="preview"]');
    const rejectBtn = card.querySelector('[data-action="reject"]');
    const editBtn = card.querySelector('[data-action="edit"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    const cancelBtn = card.querySelector('[data-action="cancel-edit"]');
    const unpublishBtn = card.querySelector('[data-action="unpublish"]');

    if (approveBtn) approveBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      if (await approveChallengeWithGate(c)) renderChallengesAdmin();
    });
    if (previewBtn) previewBtn.addEventListener('click', () => {
      const c = CHALLENGES.find(x => x.id === id);
      openChallengePreview(c);
    });
    if (unpublishBtn) unpublishBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      if (!confirm('Despublicar este desafio? Ele deixa de aparecer pro aluno imediatamente.')) return;
      if (await unpublishChallenge(c)) renderChallengesAdmin();
    });
    if (rejectBtn) rejectBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      const previousStatus = c.status;
      c.status = 'rejected';
      const ok = await persistChallenge(c, {
        rejected_at: new Date().toISOString(),
        rejected_by: CURRENT_USER.email,
      });
      if (!ok){ c.status = previousStatus; return; }
      showToast('Desafio rejeitado.');
      renderChallengesAdmin();
    });
    if (editBtn) editBtn.addEventListener('click', () => {
      challengesAdminEditingId = id;
      renderChallengesAdminList();
    });
    card.querySelectorAll('.challenges-admin-resource').forEach(resEl => {
      const idx = parseInt(resEl.dataset.resourceIdx, 10);
      resEl.querySelectorAll('[data-resource-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const c = CHALLENGES.find(x => x.id === id);
          const previousApproved = c.externalResources[idx].approved;
          c.externalResources[idx].approved = btn.dataset.resourceAction === 'approve';
          const ok = await persistChallenge(c);
          if (!ok){ c.externalResources[idx].approved = previousApproved; return; }
          renderChallengesAdmin();
        });
      });
    });
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      challengesAdminEditingId = null;
      renderChallengesAdminList();
    });
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const c = CHALLENGES.find(x => x.id === id);
      card.querySelectorAll('[data-field]').forEach(input => {
        const field = input.dataset.field;
        const value = input.value;
        if (field === 'options'){
          const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
          c.options = lines.map(l => l.replace(/^\*/, '').trim());
          const starred = lines.find(l => l.startsWith('*'));
          if (starred) c.correctAnswer = starred.replace(/^\*/, '').trim();
        } else if (field === 'referenceTranslations'){
          c.referenceTranslations = value.split('\n').map(l => l.trim()).filter(Boolean);
        } else if (field.includes('.')){
          const [obj, key] = field.split('.');
          c[obj][key] = value;
        } else {
          c[field] = value;
        }
      });
      // Editar um desafio já publicado/aprovado não deve deixar uma edição
      // incompleta no ar imediatamente -- volta pra needs_review até ser
      // revisado e aprovado de novo (mesmo padrão da opção de fallback
      // combinada: reverter status em vez de manter uma versão "shadow").
      const wasLive = c.status === 'published' || c.status === 'approved';
      if (wasLive) c.status = 'needs_review';
      const ok = await persistChallenge(c);
      if (!ok) return;
      challengesAdminEditingId = null;
      showToast(wasLive
        ? 'Edição salva — desafio voltou para revisão (estava publicado/aprovado, precisa ser aprovado de novo).'
        : 'Edição salva.');
      renderChallengesAdmin();
    });
  });
}

// ============================================================
// Inicialização
// ============================================================
initAuth();
