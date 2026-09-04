/* ============================================================
   Francês do Zero — lógica do app
   Adaptado do motor do Mandarim do Zero: SRS (SM-2), TTS via Web Speech API,
   gamificação, persistência via Supabase, exportação para Anki (.apkg).
   Diferenças principais em relação ao original:
   - Sem par pinyin/hanzi: cada item de conteúdo é só { f: francês, t: português }.
   - Sem trilha de caracteres (não existe no francês) — no lugar, aba de
     Conjugação (seleção livre de tempos + categoria de verbo, sempre as 6 pessoas).
   - Aba Manual removida. Não consta em docs/PARIDADE.md como pendência --
     se for pra voltar, é uma feature nova, não uma restauração.
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

// ---------- Ciclo de vida do áudio de exercício ----------
// Cada chamada de playPregeneratedAudio/speakFrench criava um novo player
// (Audio ou SpeechSynthesisUtterance) sem nunca parar o anterior -- ao
// avançar de exercício rápido, o áudio antigo continuava tocando em
// segundo plano ao mesmo tempo que o novo, sobrepondo os dois. Rastreia o
// player de áudio pré-gerado atualmente ativo (mesmo padrão já usado nos
// ditados, ver dictationAudioEl/stopDictationAudio) e para ele -- e
// qualquer fala em andamento via Web Speech API -- sempre que um novo
// áudio de exercício vai começar OU o exercício/tela que o iniciou deixa
// de estar ativo (trocar de exercício, responder, avançar, sair da lição,
// trocar de aba etc.).
let exerciseAudioEl = null;

// Último botão de áudio que de fato tocou algo (clique manual OU autoplay --
// ambos passam por playPregeneratedAudio/speakFrench com btnEl) -- é o que o
// atalho "r" repete. Não precisa de lógica própria de "expiração": ao trocar
// de tela, o botão antigo é removido do DOM (innerHTML novo), então
// LAST_AUDIO_BTN.isConnected já vira false sozinho.
let LAST_AUDIO_BTN = null;

// Contagem vitalícia de reproduções de áudio (clique manual ou atalho "r")
// -- só pro badge "Ouvido Treinado" (artefato §8). Tocar áudio nunca passa
// perto de nenhum addXP() sozinho, então dispara a checagem de badge aqui
// mesmo em vez de confiar no próximo XP ganho (que pode demorar).
function registerAudioPlay(){
  STATE.totalAudioPlays = (STATE.totalAudioPlays || 0) + 1;
  ensureDailyBucket();
  STATE.daily.audioPlaysToday += 1;
  checkAndCelebrateBadges();
}

function stopExerciseAudio(){
  if (exerciseAudioEl){
    exerciseAudioEl.pause();
    exerciseAudioEl.currentTime = 0;
    exerciseAudioEl = null;
  }
  if (TTS.supported && window.speechSynthesis.speaking){
    window.speechSynthesis.cancel();
  }
  document.querySelectorAll('.audio-btn.speaking').forEach(b => b.classList.remove('speaking'));
}

// ---------- Som curto de acerto/erro (feedback por exercício) ----------
// Sintetizado via Web Audio API -- sem arquivo de áudio externo pra baixar/
// hospedar, e sem disputar com o player de pronúncia acima (Audio/Speech
// Synthesis são players diferentes; um "ding" de ~200ms não precisa de
// stopExerciseAudio()). Silenciável em Preferências (Seu progresso).
const FEEDBACK_SOUND_KEY = 'frances_feedback_sound';
function isFeedbackSoundEnabled(){
  return localStorageSafeGet(FEEDBACK_SOUND_KEY) !== '0';
}

let feedbackAudioCtx = null;
function getFeedbackAudioCtx(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!feedbackAudioCtx) feedbackAudioCtx = new Ctx();
  if (feedbackAudioCtx.state === 'suspended') feedbackAudioCtx.resume();
  return feedbackAudioCtx;
}

function playFeedbackTone(ctx, freq, startTime, duration, peakGain){
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// isCorrect === true: "ding" ascendente curto (2 notas). false: um tom só,
// mais grave e mais curto -- neutro, não punitivo (a explicação do erro já
// fica a cargo do painel de texto, o som só confirma o resultado).
function playFeedbackSound(isCorrect){
  if (!isFeedbackSoundEnabled()) return;
  const ctx = getFeedbackAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (isCorrect){
    playFeedbackTone(ctx, 587.33, now, 0.09, 0.16);
    playFeedbackTone(ctx, 880.00, now + 0.08, 0.16, 0.16);
  } else {
    playFeedbackTone(ctx, 233.08, now, 0.18, 0.13);
  }
}

// Toca um mp3 pré-gerado (Google Cloud TTS, voz neural) em vez da Web Speech
// API do navegador — qualidade consistente pra todo aluno, independente do
// SO/navegador. Ver audio-manifest.js (texto -> arquivo) e speakFrench().
function playPregeneratedAudio(file, btnEl){
  stopExerciseAudio();
  const audio = new Audio('audio/' + file);
  exerciseAudioEl = audio;
  if (btnEl){ btnEl.classList.add('speaking'); LAST_AUDIO_BTN = btnEl; }
  const clear = () => {
    if (btnEl) btnEl.classList.remove('speaking');
    if (exerciseAudioEl === audio) exerciseAudioEl = null;
  };
  audio.addEventListener('ended', clear);
  audio.addEventListener('error', () => { clear(); showToast('Não foi possível reproduzir o áudio'); });
  audio.play().catch(clear);
}

function speakFrench(text, btnEl){
  registerAudioPlay();
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

  stopExerciseAudio();
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
  if (btnEl){ btnEl.classList.add('speaking'); LAST_AUDIO_BTN = btnEl; }

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
      stopExerciseAudio();
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
  pendingStreakCelebration: false, // true = streak de hoje já contou, falta mostrar a tela (só ao fim da atividade atual). Nunca persistido -- é sempre por sessão.
  hadStreakComeback: false, // true = já retomou o streak em até 3 dias após perdê-lo (badge "De volta ao jogo") -- uma vez true, fica true pra sempre
  totalAudioPlays: 0, // vitalício, nunca zera (badge "Ouvido treinado")
  everUsedSpeedReview: false, // vitalício (badge "Exploradora")
  everUsedMatchGame: false, // vitalício (badge "Exploradora")
  // XP da semana corrente -- preparação pra leaderboard futura (artefato
  // §9), NÃO implementa leaderboard nenhuma. Separado do XP vitalício
  // (acima) porque uma leaderboard semanal precisa de um número que reseta;
  // resetado por leitura (ensurePeriodXp), sem job/cron.
  periodXp: { weekStart: null, amount: 0 },
  activityLog: {},
  studyGoal: {
    objective: null, levels: [],
    days: { mon:true, tue:true, wed:true, thu:true, fri:true, sat:true, sun:true },
    hour: 8, minute: 0, notifications: false,
    dailyMinutes: 0, // legado (era a unidade da meta antes da Fase 3 -- não lido mais pra nada, só preservado se já existir salvo)
    dailyLessonsGoal: 0 // 0 = meta ainda não definida; 1/2/3 = Casual/Regular/Intenso
  },
  dailyMinutesLog: {}, // legado -- não lido mais pra nada, só continua sendo escrito (addStudyMinutes) pra não perder histórico já salvo
  dailyLessonsLog: {}, // 'YYYY-MM-DD' -> lições (que contam pra meta) concluídas naquele dia
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
  STATE.unitProgress[u.id] = {
    started:false, completed:false, unlocked: isFirstOfLevel(u),
    lessonIdx: 0, lessonMisses: {}
  };
});

MODULES.forEach((m) => {
  STATE.checkpointProgress[m.id] = { completed: false, bestScore: 0 };
});

LEVEL_TESTS.forEach((t) => {
  STATE.levelTestProgress[t.id] = { completed: false, bestScore: 0 };
});

// Conexão com o Supabase (supabaseClient, cleanRedirectURL) agora vem de
// shared/supabase-client.js -- mesmo projeto/tabela `progress` de sempre,
// compartilhado com os outros idiomas da plataforma.
const APP_KEY = 'frances';
// Usado por shared/wizard.js na pergunta do objetivo ("aprender ${...}?").
const LANGUAGE_STUDY_NAME = 'francês';
// Id deste idioma em languages/index.js (AVAILABLE_LANGUAGES) -- usado pelo
// seletor de idioma no topbar (shared/language-switcher.js) pra saber qual
// card marcar como ativo e qual chave gravar em currentLearningLanguage.
const LANG_ID = 'fr';

// CURRENT_USER, GUEST_MODE_FLAG, initAuth/showLoginScreen/enterGuestMode/
// onUserLoggedIn e toda a autenticação (Google/e-mail/convidado) agora vêm
// de shared/auth.js, junto com saveState/loadState/notifySaveFailure.

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

function updateFeedbackSoundSwitch(){
  const btn = document.getElementById('feedback-sound-switch');
  if (btn) btn.setAttribute('aria-checked', isFeedbackSoundEnabled() ? 'true' : 'false');
}
document.getElementById('feedback-sound-switch').addEventListener('click', () => {
  localStorageSafeSet(FEEDBACK_SOUND_KEY, isFeedbackSoundEnabled() ? '0' : '1');
  updateFeedbackSoundSwitch();
});
updateFeedbackSoundSwitch();

async function loadStateAndRender(){
  await loadState();
  seedEarnedBadges();
  renderTopbarStats();
  renderUnitsGrid();
  renderExportDeckSelect(ANKI_EXPORT_CONFIG);
  maybeShowReviewReminder();
  maybeSendStudyReminder();
}

// Login (Google/e-mail/convidado), menu do usuário e logout agora vêm de
// shared/auth.js -- os botões/formulários abaixo continuam no HTML de cada
// idioma, só a lógica de wiring foi extraída.

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

// saveState/loadState/notifySaveFailure (Supabase, tabela progress) agora
// vêm de shared/auth.js -- dependem de APP_KEY (acima) e das duas funções
// abaixo, específicas do formato de STATE deste idioma.

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
    dailyLessonsLog: STATE.dailyLessonsLog,
    totalReviews: STATE.totalReviews,
    hadStreakComeback: STATE.hadStreakComeback,
    totalAudioPlays: STATE.totalAudioPlays,
    everUsedSpeedReview: STATE.everUsedSpeedReview,
    everUsedMatchGame: STATE.everUsedMatchGame,
    periodXp: STATE.periodXp,
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
  if (data.unitProgress) {
    Object.assign(STATE.unitProgress, data.unitProgress);
    // Saves de antes das lições (Modelo B) não têm lessonIdx/lessonMisses.
    Object.values(STATE.unitProgress).forEach(p => {
      if (typeof p.lessonIdx !== 'number') p.lessonIdx = 0;
      if (!p.lessonMisses) p.lessonMisses = {};
    });
  }
  if (typeof data.xp === 'number') STATE.xp = data.xp;
  if (typeof data.streak === 'number') STATE.streak = data.streak;
  if (data.lastStudyDay) STATE.lastStudyDay = data.lastStudyDay;
  if (data.lastReviewReminderDay) STATE.lastReviewReminderDay = data.lastReviewReminderDay;
  if (data.studyGoal) Object.assign(STATE.studyGoal, data.studyGoal);
  if (data.dailyMinutesLog) Object.assign(STATE.dailyMinutesLog, data.dailyMinutesLog);
  if (data.dailyLessonsLog) Object.assign(STATE.dailyLessonsLog, data.dailyLessonsLog);
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.hadStreakComeback) STATE.hadStreakComeback = true;
  if (typeof data.totalAudioPlays === 'number') STATE.totalAudioPlays = data.totalAudioPlays;
  if (data.everUsedSpeedReview) STATE.everUsedSpeedReview = true;
  if (data.everUsedMatchGame) STATE.everUsedMatchGame = true;
  if (data.periodXp) Object.assign(STATE.periodXp, data.periodXp);
  if (data.daily) Object.assign(STATE.daily, data.daily);
  if (data.checkpointProgress) Object.assign(STATE.checkpointProgress, data.checkpointProgress);
  if (data.levelTestProgress) Object.assign(STATE.levelTestProgress, data.levelTestProgress);
  if (data.completedChallenges) Object.assign(STATE.completedChallenges, data.completedChallenges);
}

// SM-2 (registerExerciseCorrect, applySM2, cardsDueNow, newCards),
// XP_PER_GRADE, todayStr e dateStrDaysAgo agora vêm de shared/srs.js --
// mesmo algoritmo, mesmo formato de STATE.cards nos dois idiomas.

function registerStudyToday(){
  const today = todayStr();
  STATE.activityLog[today] = (STATE.activityLog[today] || 0) + 1;

  if (STATE.lastStudyDay === today) return;
  const yStr = dateStrDaysAgo(1);
  if (STATE.lastStudyDay === yStr){
    STATE.streak += 1;
  } else {
    // Perdeu o streak (não é a primeira vez estudando nem um dia normal de
    // continuação) -- se voltou depois de um hiato curto (perdeu 1 a 3 dias),
    // registra pro badge "De volta ao jogo" (artefato §8): recompensa
    // retomada rápida em vez de só punir a quebra.
    if (STATE.lastStudyDay){
      const gapDays = Math.round((new Date(today) - new Date(STATE.lastStudyDay)) / 86400000);
      if (gapDays >= 2 && gapDays <= 4) STATE.hadStreakComeback = true;
    }
    STATE.streak = 1;
  }
  STATE.lastStudyDay = today;
  // Não mostra a tela de sequência AGORA -- isso interromperia no meio de
  // uma atividade (ex: no meio de uma sessão de revisão, competindo até com
  // o áudio automático da próxima carta). Só marca que tem uma comemoração
  // pendente; maybeShowStreakCelebration() é quem decide o momento certo
  // (fim da atividade), chamada nas telas de "sessão concluída".
  STATE.pendingStreakCelebration = true;
}

function maybeShowStreakCelebration(){
  if (!STATE.pendingStreakCelebration) return;
  STATE.pendingStreakCelebration = false;
  showStreakCelebration();
}

// ---------- Tela de sequência de streak (estilo Duolingo) ----------
// Aparece uma única vez por dia, na primeira atividade que ativa o streak
// (lição, checkpoint, revisão, jogo de combinar, conjugação...) — nunca de
// novo no mesmo dia, já que registerStudyToday() só chega até aqui na
// primeira chamada depois da virada do dia.
// STREAK_DAY_LABELS agora vem de shared/wizard.js (também usada por
// buildMinutesWeekData lá).
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
// Meta diária em LIÇÕES (ver "A Gramática da Recompensa", §4): com os dias
// da semana escolhidos, calcula uma DATA estimada de conclusão do nível-alvo.
// OBJECTIVE_OPTIONS, DAY_DEFS, DAY_KEY_BY_JS_INDEX, PT_MONTHS, formatDatePt e
// todo o wizard agora vêm de shared/wizard.js. LEVEL_DESCRIPTIONS continua
// aqui -- é dado específico deste idioma (LEVELS igual, ver content.js),
// exigido como hook por shared/wizard.js.
const LEVEL_DESCRIPTIONS = {
  A1: { tier: 'Iniciante', text: 'Fazer e responder a perguntas simples e se apresentar a outras pessoas' },
  A2: { tier: 'Básico', text: 'Participar de conversas simples do dia a dia e falar sobre seus estudos' }
};

// estimateCompletionDate, buildLessonsWeekData, remainingUnitsForLevels/
// estimateLessonsRemainingForLevels, renderStudyPlanCard e o wizard inteiro
// (STUDY_WIZARD_STEPS até saveStudyWizard) e o wiring do modal vêm de
// shared/wizard.js.

// Lembrete local best-effort: só dispara se a pessoa tiver o app aberto numa
// janela de ~30min depois do horário escolhido, com permissão já concedida —
// não existe servidor de push aqui, então não há aviso quando o app está
// fechado ou o navegador nem está aberto.
function maybeSendStudyReminder(){
  const goal = STATE.studyGoal;
  if (!goal.notifications || !goal.dailyLessonsGoal) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  if (!goal.days[DAY_KEY_BY_JS_INDEX[now.getDay()]]) return;

  const scheduled = new Date(now);
  scheduled.setHours(goal.hour, goal.minute, 0, 0);
  const diffMin = (now - scheduled) / 60000;
  if (diffMin < 0 || diffMin > 30) return;

  if (localStorageSafeGet('frances_last_study_notif') === todayStr()) return;
  new Notification('Hora de estudar francês! 🇫🇷', {
    body: `Sua meta de hoje: ${goal.dailyLessonsGoal} lição${goal.dailyLessonsGoal > 1 ? 'ões' : ''}.`,
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
// Balde-padrão construído do zero a cada chamada -- nunca reaproveita
// arrays/objetos entre chamadas (um array compartilhado entre dois "dias"
// diferentes viraria um vazamento de estado sutil).
function freshDailyBucket(today){
  return {
    date: today, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
    grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0,
    conjugationTenses: [], reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0,
    lessonsForGoal: 0, goalCountedLessonKeys: [], exerciseFormatsSeen: [],
    exerciseFormatCounts: {}, audioPlaysToday: 0, overdueReviewsDone: 0
  };
}

function ensureDailyBucket(){
  const today = todayStr();
  if (STATE.daily.date !== today){
    STATE.daily = freshDailyBucket(today);
  } else {
    // Reconcilia: preenche só os campos que ainda NÃO existem no balde de
    // hoje -- cobre a conta que já tinha usado o app hoje antes de um
    // deploy adicionar um campo novo (ver auditoria "O problema dos 100%").
    // Nunca sobrescreve um campo que já tem valor real.
    const fresh = freshDailyBucket(today);
    Object.keys(fresh).forEach(key => {
      if (!(key in STATE.daily)) STATE.daily[key] = fresh[key];
    });
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

// Meta diária (plano de estudo) conta separado dos Desafios de hoje -- é uma
// régua mais exigente (ver artefato, §4): só lições com conteúdo real
// (`qualifies` filtra atalho degenerado, ex. lição minúscula demais) e nunca
// a mesma lição 2x no mesmo dia (replay não soma -- `key` identifica a lição
// de forma estável, ex. "A1-1:2" ou "A1-1:checkpoint").
function registerDailyLessonForGoal(key, qualifies){
  ensureDailyBucket();
  if (!qualifies || STATE.daily.goalCountedLessonKeys.includes(key)) return;
  STATE.daily.goalCountedLessonKeys.push(key);
  STATE.daily.lessonsForGoal += 1;
  STATE.dailyLessonsLog[todayStr()] = STATE.daily.lessonsForGoal;
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
// Cartas que já estavam atrasadas (venceram antes de hoje, não só "due
// agora") -- desafio "Revise cartas em atraso" (artefato §3), prioriza SRS
// vencido de verdade em vez de qualquer revisão dentro do prazo normal.
function registerDailyOverdueReviewCard(){
  ensureDailyBucket();
  STATE.daily.overdueReviewsDone += 1;
}
function registerDailySpeedReview(){
  ensureDailyBucket();
  STATE.daily.speedReviewSessions += 1;
  STATE.everUsedSpeedReview = true;
}
function registerDailyMatchGame(){
  ensureDailyBucket();
  STATE.daily.matchGamesPlayed += 1;
  STATE.everUsedMatchGame = true;
}
// Formatos de exercício distintos respondidos corretamente hoje -- só pro
// badge "Multitarefa" (artefato §8: engajamento com a variedade do motor,
// não só o formato mais fácil). Chamado de dentro de exerciseXP(), que já é
// o único ponto por onde passam TODOS os formatos de exercício ao acertar.
function registerDailyExerciseFormat(format){
  ensureDailyBucket();
  if (!format) return;
  if (!STATE.daily.exerciseFormatsSeen.includes(format)) STATE.daily.exerciseFormatsSeen.push(format);
  // Contagem por formato -- alimenta desafios ligados a um formato
  // específico (ex. "Traduza a frase" = reorder), não só a checagem de
  // diversidade do badge "Multitarefa".
  STATE.daily.exerciseFormatCounts[format] = (STATE.daily.exerciseFormatCounts[format] || 0) + 1;
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
  { id:'matchGame1', icon:'🎴', label:'Jogue o jogo da memória 1 vez', target:1, get: d => d.matchGamesPlayed },
  // Fase 4 (artefato §3): prioriza SRS de verdade atrasado, não qualquer
  // revisão dentro do prazo normal -- puxa quem tem cartas acumuladas.
  { id:'overdue3', icon:'⏰', label:'Revise 3 cartas em atraso', target:3, get: d => d.overdueReviewsDone }
];
// "Complete N lições" saiu daqui na Fase 3 -- virou redundante depois que a
// meta diária (plano de estudo) passou a ser medida em lições também: as
// duas telas mostrando a mesma contagem como se fossem coisas diferentes é
// exatamente o "progresso duplicado" que o artefato pediu pra evitar (§4).
const GENERAL_CHALLENGES = [
  { id:'stars40', icon:'⭐', label:'Ganhe 40 estrelas', target:40, get: d => d.stars },
  { id:'highscore2', icon:'📈', label:'Pontue mais de 80% em 2 lições', target:2, get: d => d.highScoreLessons },
  { id:'perfect1', icon:'🎯', label:'Complete uma lição sem errar', target:1, get: d => d.perfectLessons },
  { id:'grammar1', icon:'🧠', label:'Complete 1 unidade de gramática', target:1, get: d => d.grammarLessons },
  // Fase 4 (artefato §3): ligados a recursos reais do produto (ouvir,
  // traduzir por blocos), não só contadores genéricos de progresso.
  { id:'listen10', icon:'🎧', label:'Toque o áudio 10 vezes', target:10, get: d => d.audioPlaysToday },
  { id:'translateBlocks2', icon:'🧱', label:'Complete 2 exercícios de "Traduza a frase"', target:2, get: d => d.exerciseFormatCounts?.reorder || 0 }
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
      ${todaysChallenges().map((c, i) => {
        // Number(...)||0: um campo ausente nunca mais vira NaN silencioso
        // (ver auditoria "O problema dos 100%") -- current fica sempre um
        // número válido entre 0 e c.target.
        const current = Math.min(Number(c.get(STATE.daily)) || 0, c.target);
        const pct = Math.round((current / c.target) * 100);
        return `
          <div class="daily-challenge-card">
            <div class="daily-challenge-icon-sq slot-${i}">${c.icon}</div>
            <div class="daily-challenge-body">
              <div class="daily-challenge-label">${c.label}</div>
              <div class="daily-challenge-progress-row">
                <div class="daily-challenge-progress-track"><div class="daily-challenge-progress-fill" style="width:${pct}%"></div></div>
                <div class="daily-challenge-fraction">${current}/${c.target}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  nextBtn.textContent = 'Continuar →';
  nextBtn.style.display = 'flex';
}

// Segunda-feira da semana corrente, formato 'YYYY-MM-DD' -- mesmo padrão de
// chave usado no resto do app (activityLog, dailyLessonsLog etc.).
function currentWeekStart(){
  const d = new Date();
  const diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
}
function ensurePeriodXp(){
  const weekStart = currentWeekStart();
  if (STATE.periodXp.weekStart !== weekStart) STATE.periodXp = { weekStart, amount: 0 };
}

function addXP(amount){
  STATE.xp += amount;
  ensurePeriodXp();
  STATE.periodXp.amount += amount;
  showToast(`+${amount} XP`);
  // Quase todo badge depende de streak, unidade, XP ou revisões -- e todos
  // esses caminhos já chamam addXP() em algum ponto (mesmo os de streak, via
  // registerStudyToday() logo antes/depois). Centralizar a checagem aqui
  // evita espalhar "será que ganhei um badge?" em cada função separada.
  // Exceção: "Ouvido Treinado" depende só de tocar áudio, que nunca passa
  // perto de addXP() sozinho -- registerAudioPlay() dispara a checagem
  // direto, sem esperar o próximo XP ganho.
  checkAndCelebrateBadges();
}

// showToast agora vem de shared/toast.js.

const BADGES = [
  { id:'first_step', name:'Primeiro Passo', icon:'🌱', desc:'Fez sua primeira revisão', check: s => s.totalReviews >= 1 },
  { id:'streak_3', name:'3 Dias Seguidos', icon:'🔥', desc:'Estudou 3 dias seguidos', check: s => s.streak >= 3 },
  { id:'streak_7', name:'Uma Semana!', icon:'🥐', desc:'Estudou 7 dias seguidos', check: s => s.streak >= 7 },
  { id:'unit_1', name:'Unidade 1 Completa', icon:'📖', desc:'Completou a primeira unidade', check: s => s.unitProgress['A1-1']?.completed },
  { id:'unit_half', name:'Metade do Caminho', icon:'🗼', desc:'Completou metade do nível A1', check: s => {
      const a1 = UNITS.filter(u => u.level === 'A1');
      return a1.filter(u => s.unitProgress[u.id]?.completed).length >= Math.ceil(a1.length/2);
    } },
  { id:'unit_all', name:'Nível A1 Completo', icon:'🇫🇷', desc:'Completou o nível A1 inteiro', check: s => {
      const a1 = UNITS.filter(u => u.level === 'A1');
      return a1.every(u => s.unitProgress[u.id]?.completed);
    } },
  { id:'xp_100', name:'100 XP', icon:'⭐', desc:'Acumulou 100 XP', check: s => s.xp >= 100 },
  { id:'xp_500', name:'500 XP', icon:'🌟', desc:'Acumulou 500 XP', check: s => s.xp >= 500 },
  { id:'reviews_100', name:'100 Revisões', icon:'💪', desc:'Fez 100 revisões', check: s => s.totalReviews >= 100 },
  // ---- Fase 4 (artefato §8): badges novos, cada um ligado a um
  // comportamento específico -- não "badge por badge" genérico. ----
  { id:'explorer', name:'Exploradora', icon:'🧭', desc:'Usou revisão, revisão rápida e jogo da memória', check: s => s.totalReviews >= 1 && s.everUsedSpeedReview && s.everUsedMatchGame },
  { id:'trained_ear', name:'Ouvido Treinado', icon:'🎧', desc:'Tocou o áudio 100 vezes', check: s => (s.totalAudioPlays || 0) >= 100 },
  { id:'comeback', name:'De Volta ao Jogo', icon:'🔄', desc:'Retomou a sequência em até 3 dias', check: s => !!s.hadStreakComeback },
  { id:'multitasker', name:'Multitarefa', icon:'🧩', desc:'Praticou 5 formatos de exercício diferentes no mesmo dia', check: s => (s.daily?.exerciseFormatsSeen?.length || 0) >= 5 },
  { id:'weekend', name:'Fim de Semana', icon:'🌙', desc:'Estudou sábado e domingo na mesma semana', check: s => {
      for (let i = 0; i < 14; i++){
        const d = new Date(Date.now() - i*86400000);
        if (d.getDay() !== 6) continue;
        const key = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        if (s.activityLog[key(d)] && s.activityLog[key(new Date(d.getTime() + 86400000))]) return true;
      }
      return false;
    } },
];

// ---------- Detecção + celebração de nova conquista ----------
// earnedBadgeIds é semeado uma vez, logo depois do estado carregar
// (seedEarnedBadges, chamada em loadStateAndRender) -- reflete os badges já
// ganhos em sessões anteriores, pra só celebrar o que for GENUÍNO desta
// sessão em diante. checkAndCelebrateBadges roda dentro de addXP(): todo
// badge hoje depende de streak/unidade/XP/revisões, e todos esses caminhos
// já passam por addXP -- não precisa espalhar a checagem por unit/streak/
// revisão separadamente.
let earnedBadgeIds = new Set();
function seedEarnedBadges(){
  earnedBadgeIds = new Set(BADGES.filter(b => b.check(STATE)).map(b => b.id));
}

let badgeCelebrationQueue = [];
let badgeCelebrationShowing = false;

function checkAndCelebrateBadges(){
  const newlyEarned = [];
  BADGES.forEach(b => {
    if (earnedBadgeIds.has(b.id)) return;
    if (b.check(STATE)){
      earnedBadgeIds.add(b.id);
      newlyEarned.push(b);
    }
  });
  if (newlyEarned.length){
    badgeCelebrationQueue.push(...newlyEarned);
    processBadgeCelebrationQueue();
  }
}

// Fila (não pilha): se dois badges forem ganhos no mesmo instante (ex.: XP
// cruza 500 no mesmo golpe que termina o nível), mostra um de cada vez --
// nunca dois cartões sobrepostos brigando pela mesma área da tela.
function processBadgeCelebrationQueue(){
  if (badgeCelebrationShowing || !badgeCelebrationQueue.length) return;
  badgeCelebrationShowing = true;
  const badge = badgeCelebrationQueue.shift();
  showBadgeUnlockCelebration(badge, () => {
    badgeCelebrationShowing = false;
    processBadgeCelebrationQueue();
  });
}

function showBadgeUnlockCelebration(badge, onDone){
  const layer = document.getElementById('badge-unlock-layer');
  if (!layer){ onDone?.(); return; }
  const el = document.createElement('div');
  el.className = 'badge-unlock-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="badge-unlock-icon">${badge.icon}</div>
    <div class="badge-unlock-text">
      <div class="badge-unlock-label">🏅 Nova conquista!</div>
      <div class="badge-unlock-name">${badge.name}</div>
      <div class="badge-unlock-desc">${badge.desc}</div>
    </div>
  `;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.remove();
    onDone?.();
  };
  el.addEventListener('click', () => {
    finish();
    switchTab('progress');
  });
  layer.appendChild(el);
  setTimeout(finish, 4000);
}

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
  // "Tratamento de honra" (Opção D): nível concluído reaproveita o mesmo
  // selo de check, só que dourado -- é a camada mais rara, não precisa de
  // um símbolo novo, só de um sinal de que é excepcional.
  const doneBadge = levelCompleted(STATE.currentLevel)
    ? ` <span style="color:var(--imperial-gold);">✓</span>` : '';
  document.getElementById('path-level-title').innerHTML =
    `${currentLevelInfo.label} <span style="color:var(--ink-soft); font-weight:600; font-size:14px;">(${currentLevelInfo.id})</span>${doneBadge}`;
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
// Progresso fracionário de 0 a 1: concluída conta 1 mesmo depois do reset de
// lessonIdx no fim da unidade (ver finishCurrentLesson); unidades com lições
// usam lessonIdx/lessons.length; as demais (motor antigo) usam a fração de
// palavras já aprendidas no SRS, como sempre foi.
function unitProgressFraction(u){
  const prog = STATE.unitProgress[u.id];
  if (prog.completed) return 1;
  if (isLessonUnit(u)){
    return u.lessons.length ? currentLessonIdx(u.id) / u.lessons.length : 0;
  }
  const { total, learned } = unitCardCounts(u.id);
  return total ? learned / total : 0;
}

function moduleProgressPct(module){
  const sum = module.unitIds.reduce((acc, id) => acc + unitProgressFraction(UNITS.find(u => u.id === id)), 0);
  return Math.round((sum / module.unitIds.length) * 100);
}
function moduleCompleted(module){
  return module.unitIds.every(id => STATE.unitProgress[id]?.completed);
}
function levelCompleted(levelId){
  const mods = modulesOfLevel(levelId);
  return mods.length > 0 && mods.every(moduleCompleted);
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

// Estado da Unidade na trilha: "done" (concluída), "current" (desbloqueada,
// a próxima da fila) ou "locked". Note que precisa checar completed ANTES de
// olhar lessonIdx -- finishCurrentLesson zera lessonIdx ao fechar a unidade
// (pra permitir reabrir do início como revisão), então lessonIdx sozinho
// mentiria "0 de 4" numa unidade que na verdade já terminou.
function unitBlockState(u){
  const prog = STATE.unitProgress[u.id];
  if (prog.completed) return 'done';
  if (prog.unlocked) return 'current';
  return 'locked';
}

// Modo admin: só a conta da autora do curso -- deixa REVISAR qualquer lição
// de qualquer unidade (mesmo travada pros demais usuários), sem nunca
// desbloquear nada de verdade nem mexer no progresso real. Reaproveita o
// mesmo modo revisão não-destrutivo de openLessonReview (ver
// STEP_STATE.lessonReview): a lição abre pra estudo/conferência, mas
// terminar ela não avança lessonIdx nem concede XP/desafio.
const ADMIN_EMAIL = 'brunemed1310@gmail.com';
function isAdminUser(){
  return !!(typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.email === ADMIN_EMAIL);
}

// Estado de UMA lição dentro do bloco expandido da unidade.
function lessonRowState(u, idx){
  if (STATE.unitProgress[u.id].completed) return 'done';
  const cur = currentLessonIdx(u.id);
  if (idx < cur) return 'done';
  if (idx === cur) return 'current';
  return 'locked';
}

// Lembra se o aluno abriu/fechou manualmente o bloco de uma unidade nesta
// sessão (não é salvo -- é só estado de UI). Sem entrada aqui, o bloco usa o
// padrão: concluída/bloqueada começam compactas, a unidade atual começa
// expandida.
const UNIT_BLOCK_EXPAND_OVERRIDE = {};

// .ub-header é uma div (não um <button>, porque contém a seta que é seu
// próprio botão -- button dentro de button é inválido) -- isto devolve a
// ela a ativação por teclado que um <button> teria de graça.
function wireHeaderActivation(el, handler){
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('click', handler);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); handler(e); }
  });
}

function buildUnitBlock(u){
  const state = unitBlockState(u);
  const unlocked = state !== 'locked';
  const isGrammar = u.type === 'grammar';
  // Só unidades com 2+ lições (Modelo B) ganham a lista expansível -- uma
  // unidade do motor antigo não tem lições reais pra mostrar (ver "Hierarquia
  // da Trilha", seção 11), então vira uma linha só, sem seta.
  const hasLessons = isLessonUnit(u) && u.lessons.length > 1;
  const { dueForReview } = unitCardCounts(u.id);

  const defaultExpanded = state === 'current';
  const expanded = hasLessons && (
    UNIT_BLOCK_EXPAND_OVERRIDE[u.id] !== undefined ? UNIT_BLOCK_EXPAND_OVERRIDE[u.id] : defaultExpanded
  );

  const pct = Math.round(unitProgressFraction(u) * 100);
  let fracLabel;
  if (isGrammar) fracLabel = state === 'done' ? 'Concluído' : '';
  else if (hasLessons){
    const doneLessons = state === 'done' ? u.lessons.length : currentLessonIdx(u.id);
    fracLabel = `${doneLessons} de ${u.lessons.length} lições`;
  }
  else fracLabel = `${pct}%`;
  if (dueForReview > 0) fracLabel += ` · 🔁 ${dueForReview}`;

  const block = document.createElement('div');
  block.className = 'unit-block'
    + (isGrammar ? ' grammar' : '')
    + (state === 'locked' ? ' locked' : '')
    + (state === 'done' ? ' done' : '')
    + (state === 'current' ? ' current' : '')
    + (expanded ? ' expanded' : '');

  const badgeHTML = state === 'done' ? `<span class="ub-badge">✓</span>` : '';
  const chevronHTML = hasLessons ? `<button class="ub-chevron" type="button" aria-label="Expandir lições">▾</button>` : '';
  // Só lições JÁ concluídas (e que não são o Ponto de verificação, cujo
  // reteste tem efeitos colaterais bem mais pesados -- desbloqueio de
  // módulo/nível -- fora do escopo desta revisão leve) ficam clicáveis pra
  // reabrir em modo revisão (ver openLessonReview). "current" já abre
  // normal pelo cabeçalho da unidade; "locked" fica inerte.
  const lessonsHTML = hasLessons ? `
    <div class="ub-lessons" style="${expanded ? '' : 'display:none;'}">
      ${u.lessons.map((l, i) => {
        const st = lessonRowState(u, i);
        const clickable = isAdminUser() || (unlocked && st === 'done' && !l.isCheckpoint);
        return `
          <div class="ub-lesson-row ${st}${clickable ? ' clickable' : ''}" ${clickable ? `data-lesson-idx="${i}"` : ''}>
            <div class="ub-lesson-dot ${st}">${st === 'done' ? '✓' : i + 1}</div>
            <div class="ub-lesson-title">${l.title}</div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">${UNIT_ICONS[u.id] || '📖'}</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">${u.title}</span>${badgeHTML}</div>
        ${u.goal ? `<div class="ub-goal">${u.goal}</div>` : ''}
      </div>
      <div class="ub-frac">${fracLabel}</div>
      ${chevronHTML}
    </div>
    ${lessonsHTML}
  `;

  wireHeaderActivation(block.querySelector('.ub-header'), (e) => {
    if (e.target.closest('.ub-chevron')) return;
    if (unlocked) openUnitDetail(u.id);
  });
  const chevron = block.querySelector('.ub-chevron');
  if (chevron){
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      UNIT_BLOCK_EXPAND_OVERRIDE[u.id] = !expanded;
      renderUnitsGrid();
    });
  }
  block.querySelectorAll('.ub-lesson-row.clickable').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(row.dataset.lessonIdx, 10);
      openLessonReview(u.id, idx);
    });
  });
  return block;
}

function buildCheckpointRow(module, unlocked){
  const cp = STATE.checkpointProgress[module.id];
  const block = document.createElement('div');
  block.className = 'unit-block checkpoint' + (!unlocked ? ' locked' : '') + (cp.completed ? ' done' : '');
  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">🏆</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">Ponto de verificação</span>${cp.completed ? `<span class="ub-badge">✓</span>` : ''}</div>
        <div class="ub-goal">Teste o módulo inteiro de uma vez e pule as unidades que já souber.</div>
      </div>
    </div>
  `;
  if (unlocked){
    wireHeaderActivation(block.querySelector('.ub-header'), () => openCheckpoint(module.id));
  }
  return block;
}

// Estado (recolhida/expandida) da faixa de Desafios de hoje -- lembrado
// entre sessões, mesmo padrão de STATE.dailyMinutesLog etc: preferência de
// interface, não progresso, então localStorage puro (nunca precisa
// sincronizar entre dispositivos).
const CHALLENGES_STRIP_COLLAPSE_KEY = 'frances_challenges_collapsed';
function isDailyChallengesStripCollapsed(){
  return localStorageSafeGet(CHALLENGES_STRIP_COLLAPSE_KEY) === '1';
}

// Faixa compacta e SEMPRE visível na Trilha com os 3 Desafios de hoje --
// diferente de renderDailyChallengesScreen (tela cheia, só aparece ao
// terminar uma unidade), essa dá visibilidade contínua sem exigir terminar
// nada primeiro. Reaproveita a mesma fonte de dados (todaysChallenges()) --
// não duplica lógica, só um resumo visual mais compacto dela. O título
// funciona como botão de recolher/expandir.
function renderDailyChallengesStrip(){
  const strip = document.getElementById('daily-challenges-strip');
  if (!strip) return;
  ensureDailyBucket();
  const collapsed = isDailyChallengesStripCollapsed();
  const cardsHTML = todaysChallenges().map((c, i) => {
    // Number(...)||0: um campo ausente nunca mais vira NaN silencioso (ver
    // auditoria "O problema dos 100%") -- current fica sempre um número
    // válido entre 0 e c.target.
    const current = Math.min(Number(c.get(STATE.daily)) || 0, c.target);
    const pct = Math.round((current / c.target) * 100);
    const done = current >= c.target;
    return `
      <div class="dcs-card ${done ? 'done' : ''}">
        <div class="dcs-icon-sq slot-${i}">${c.icon}</div>
        <div class="dcs-body">
          <div class="dcs-card-label">${c.label}</div>
          <div class="dcs-progress-row">
            <div class="dcs-track"><div class="dcs-fill" style="width:${pct}%"></div></div>
            <div class="dcs-fraction">${current}/${c.target}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  strip.innerHTML = `
    <button class="dcs-caption-btn" type="button" aria-expanded="${collapsed ? 'false' : 'true'}">
      <span class="dcs-caption">Desafios de hoje</span>
      <span class="dcs-caption-chevron">▾</span>
    </button>
    <div class="dcs-cards" ${collapsed ? 'style="display:none;"' : ''}>${cardsHTML}</div>
  `;
  strip.querySelector('.dcs-caption-btn').addEventListener('click', () => {
    localStorageSafeSet(CHALLENGES_STRIP_COLLAPSE_KEY, isDailyChallengesStripCollapsed() ? '0' : '1');
    renderDailyChallengesStrip();
  });
}

function renderUnitsGrid(){
  recalculateUnlockedUnits();
  renderLevelSelect();
  renderDailyGoalChip();
  renderDailyChallengesStrip();

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

    // O Módulo vira um rótulo fino de seção -- organiza a trilha em
    // capítulos sem competir visualmente com a Unidade, que é quem carrega
    // o peso real da decisão do aluno ("Hierarquia da Trilha", seção 6). O
    // check quando concluído (Opção D) é só isso -- um selo, sem tom de
    // fundo: o rótulo é fino demais pra um "wash" parecer uma linha, não um
    // banner colorido brigando com o resto da trilha.
    const doneBadge = moduleCompleted(module) ? `<span class="ml-badge">✓</span>` : '';
    const label = document.createElement('div');
    label.className = 'module-label';
    label.innerHTML = `
      <span class="ml-text">Módulo ${mIdx + 1} · ${module.title}</span>
      ${doneBadge}
      <div class="ml-track"><div class="ml-fill" style="width:${pct}%"></div></div>
    `;
    grid.appendChild(label);

    const list = document.createElement('div');
    list.className = 'module-units-list' + (unlocked ? '' : ' locked');
    module.unitIds.forEach(id => {
      list.appendChild(buildUnitBlock(UNITS.find(u => u.id === id)));
    });
    list.appendChild(buildCheckpointRow(module, unlocked));
    grid.appendChild(list);
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

// Unidades migradas pra explicação contextual (`unit.concepts`, ver
// content.js) não têm mais `usageNote` -- a teoria dele já foi incorporada
// como cartões de conceito dentro do próprio ciclo de aquisição/diálogo, não
// como um passo à parte no fim. Sem esse filtro, essas unidades mostrariam
// um passo "Dica de uso" vazio.
function currentStepDefs(){
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  if (u && u.type === 'grammar') return STEP_DEFS_GRAMMAR;
  if (isLessonUnit(u)){
    const lesson = currentLesson(u);
    if (lesson.isCheckpoint) return [{ key: 'checkpointExercises', label: 'Ponto de verificação' }];
    const steps = [];
    if (lesson.vocabIdx && lesson.vocabIdx.length) steps.push({ key: 'vocab', label: 'Vocabulário' });
    if (lesson.includesDialogue) steps.push({ key: 'dialogue', label: 'Diálogo' });
    return steps;
  }
  return STEP_DEFS.filter(s => s.key !== 'usage' || (u && u.usageNote));
}

// ---------- Lições (Modelo B) ----------
// Ver zh/app.js pro mesmo motor, comentado em detalhe -- idêntico em
// espírito, só adaptado à assinatura sem parâmetro de currentStepDefs()
// que o francês já usava (lê STATE.currentUnitId internamente) e ao fato
// de que unidades de gramática (u.type==='grammar') nunca são lesson-mode.
function isLessonUnit(u){
  return !!(u && Array.isArray(u.lessons) && u.lessons.length);
}

function currentLessonIdx(unitId){
  if (STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === unitId){
    return STEP_STATE.lessonReview.reviewIdx;
  }
  return STATE.unitProgress[unitId]?.lessonIdx || 0;
}

function currentLesson(u){
  const idx = Math.min(currentLessonIdx(u.id), u.lessons.length - 1);
  return u.lessons[idx];
}

// ---------- Sessão de aquisição de vocabulário (introdução + prática intercalada) ----------
// Substitui o antigo fluxo linear "Palavra 1 de N ... Palavra N de N" seguido
// de um bag único de exercícios no final. Em vez disso, a unidade é dividida
// em pequenos blocos de palavras novas; cada bloco passa por
// introdução -> checagem imediata -> prática, e a partir do segundo bloco
// os exercícios de prática misturam o bloco atual com todos os anteriores
// (recuperação ativa, não repetição na ordem em que acabou de ver). O passo
// final da unidade ("exercises") vira uma consolidação curta, priorizando
// as palavras que o aluno errou mais durante a sessão em vez de repetir a
// unidade inteira de novo -- ver buildExerciseSet(). Só se aplica a
// unidades de vocabulário (u.type !== 'grammar' já sai mais cedo em
// renderStep, antes de qualquer código daqui). Referência conceitual: a
// separação do Memrise entre "aquisição" e "prática/revisão intercalada"
// dentro da mesma sessão -- não uma cópia de interface, só do princípio.
const ACQ_BLOCK_SIZE = 3;

function buildAcquisitionBlocks(unit){
  const n = unit.vocab.length;
  const blocks = [];
  let i = 0;
  while (i < n){
    let size = Math.min(ACQ_BLOCK_SIZE, n - i);
    if (n - (i + size) === 1) size += 1;
    blocks.push(Array.from({ length: size }, (_, k) => i + k));
    i += size;
  }
  return blocks;
}

function freshAcquisitionState(unitId, unit){
  if (isLessonUnit(unit)){
    const lesson = currentLesson(unit);
    if (!STATE.unitProgress[unitId].lessonMisses) STATE.unitProgress[unitId].lessonMisses = {};
    return {
      unitId,
      lessonIdx: currentLessonIdx(unitId),
      blocks: (lesson.vocabIdx && lesson.vocabIdx.length) ? [lesson.vocabIdx] : [],
      blockIdx: 0,
      phase: currentLessonIdx(unitId) > 0 ? 'bridge' : 'intro',
      introIdx: 0,
      wordMisses: STATE.unitProgress[unitId].lessonMisses,
      introduced: {}
    };
  }
  return {
    unitId,
    blocks: buildAcquisitionBlocks(unit),
    blockIdx: 0,
    phase: 'intro', // 'intro' | 'checkpoint' | 'practice' | 'mixed'
    introIdx: 0,
    wordMisses: {},
    introduced: {}
  };
}

const STEP_STATE = {
  currentStep: 0,
  acq: { unitId: null, blocks: [], blockIdx: 0, phase: 'intro', introIdx: 0, wordMisses: {}, introduced: {} },
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
  onLevelTest: null,
  // Fila de cartões de conceito (explicação contextual) tocando AGORA, por
  // cima do passo normal (vocab/diálogo) -- ver runConceptQueueThen. Vazia
  // na maior parte do tempo; só existe entre o momento em que um conceito é
  // disparado e o aluno terminar de ler todos os cartões pendentes daquele
  // ponto da lição.
  conceptQueue: [],
  conceptIdx: 0,
  conceptBlockIdx: 0,
  conceptAfterFn: null,
  conceptsShown: new Set(),
  // Tela de "lição concluída" (Modelo B, entre lições da mesma unidade,
  // nunca no fim da unidade inteira -- essa continua usando
  // onChallengesScreen). Guarda quantos cartões estão devidos AGORA pra
  // decidir, no clique de "Continuar", se leva direto pro Flashcard.
  onLessonBoundaryScreen: null,
  // Revisão de uma lição JÁ CONCLUÍDA (ou, pra conta admin, QUALQUER lição
  // de QUALQUER unidade -- ver isAdminUser), clicada direto na lista
  // expandida da Trilha (ver buildUnitBlock) -- { unitId, reviewIdx }, null
  // fora de revisão. NUNCA mexe em STATE.unitProgress[unitId].lessonIdx (o
  // ponteiro de progresso real fica intocado o tempo todo) --
  // currentLessonIdx() devolve reviewIdx no lugar dele enquanto isto existe,
  // só pra essa unidade. Por construção não há nada pra "corromper" mesmo se
  // o aluno fechar a aba no meio da revisão. exitToPath() (único jeito de sair
  // durante o modo foco) e finishCurrentLesson() zeram isto de volta pra
  // null antes de voltar pra Trilha.
  lessonReview: null
};

function openUnitDetail(unitId){
  STATE.currentUnitId = unitId;
  STATE.unitProgress[unitId].started = true;
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = null;
  STEP_STATE.onLessonBoundaryScreen = null;
  STEP_STATE.conceptQueue = [];
  STEP_STATE.conceptsShown = new Set();
  // Invalida o estado de aquisição antigo -- sem isso, reabrir a MESMA
  // unidade numa lição diferente da última vez reaproveitaria os blocos da
  // lição errada.
  STEP_STATE.acq = { unitId: null, blocks: [], blockIdx: 0, phase: 'intro', introIdx: 0, wordMisses: {}, introduced: {} };
  STEP_STATE.exerciseUnitId = null;
  STEP_STATE.checkpointUnitId = null;
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

// Abre uma lição JÁ CONCLUÍDA em modo revisão, sem mexer no ponteiro de
// progresso real da unidade (ver comentário de STEP_STATE.lessonReview).
function openLessonReview(unitId, lessonIdx){
  STEP_STATE.lessonReview = { unitId, reviewIdx: lessonIdx };
  openUnitDetail(unitId);
}

// Único jeito de sair de dentro de uma unidade -- topbar/tabs ficam
// escondidas em modo foco (ver .lesson-focus), então isto SEMPRE roda antes
// de voltar pra Trilha, o que garante que uma revisão de lição em
// andamento nunca sobrevive de volta pra lá.
function exitToPath(){
  stopExerciseAudio();
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = null;
  STEP_STATE.lessonReview = null;
  setLessonFocusMode(false);
  document.getElementById('path-list-wrap').style.display = 'block';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  renderUnitsGrid();
}

document.getElementById('back-to-path').addEventListener('click', exitToPath);

document.getElementById('lesson-kbd-btn').addEventListener('click', () => {
  document.getElementById('kbd-shortcuts-modal').style.display = 'flex';
});
document.getElementById('kbd-shortcuts-modal-close').addEventListener('click', () => {
  document.getElementById('kbd-shortcuts-modal').style.display = 'none';
});
document.getElementById('kbd-shortcuts-modal').addEventListener('click', (e) => {
  if (e.target.id === 'kbd-shortcuts-modal'){
    document.getElementById('kbd-shortcuts-modal').style.display = 'none';
  }
});

// Progresso real dentro da lição: cada etapa (vocabulário/diálogo/dica de
// uso/exercícios, ou explicação/exercícios na gramática) vale uma fatia
// igual da barra -- mas dentro da etapa atual soma a fração já percorrida
// (carta de vocabulário atual, exercício atual), em vez de pular direto pra
// o fim da fatia assim que a etapa começa. Sem isso, a barra aparecia quase
// toda preenchida logo no 1º exercício, só porque "Exercícios" é a última
// das 4 etapas -- media a POSIÇÃO da etapa, não o que já foi de fato feito
// dentro dela.
// Fases que a sessão de aquisição do bloco ATUAL vai percorrer, na ordem --
// determinístico a partir do estado (não precisa adivinhar o futuro):
// "bridge" só existe pra unidades com lições, a partir da 2ª; "mixed" só
// entra quando este não é o primeiro bloco da unidade (mesma condição de
// advanceAcquisitionPhase). Cada fase recebe uma fatia igual da barra --
// simples e previsível, sem precisar conhecer de antemão quantos exercícios
// cada fase vai ter.
function acqPhaseSequence(u, acq){
  const seq = [];
  if (isLessonUnit(u) && currentLessonIdx(u.id) > 0) seq.push('bridge');
  seq.push('intro', 'checkpoint', 'practice');
  if (acq.blockIdx > 0) seq.push('mixed');
  return seq;
}

function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const defs = currentStepDefs();
  const stepCount = defs.length;
  const stepKey = defs[STEP_STATE.currentStep].key;
  const u = UNITS.find(x => x.id === STATE.currentUnitId);

  let intraStepFraction = 0;
  if (stepKey === 'vocab' && u && STEP_STATE.acq.unitId === u.id){
    // Progresso pelo NÚMERO DE PALAVRAS já cobertas (blocos inteiros já
    // concluídos + posição dentro do bloco/fase atual) -- mas, dentro da
    // fase atual, evolui exercício a exercício (mesmo dado do contador
    // "Exercício X de Y"), não pula direto pro fim da fase ao entrar nela.
    const acq = STEP_STATE.acq;
    const totalWords = (isLessonUnit(u) ? (acq.blocks[0] || []).length : u.vocab.length) || 1;
    const wordsBeforeBlock = acq.blocks.slice(0, acq.blockIdx).flat().length;
    const curBlockSize = (acq.blocks[acq.blockIdx] || []).length;

    const seq = acqPhaseSequence(u, acq);
    const phaseIdx = seq.indexOf(acq.phase);
    const [rangeStart, rangeEnd] = phaseIdx >= 0 ? [phaseIdx / seq.length, (phaseIdx + 1) / seq.length] : [0, 1];
    const phaseFraction = acq.phase === 'intro'
      ? (curBlockSize ? acq.introIdx / curBlockSize : 0)
      : (STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0);
    const withinBlock = rangeStart + (rangeEnd - rangeStart) * phaseFraction;

    intraStepFraction = Math.min(1, (wordsBeforeBlock + curBlockSize * withinBlock) / totalWords);
  } else if (stepKey === 'exercises' || stepKey === 'checkpointExercises'){
    intraStepFraction = STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0;
  } else if (stepKey === 'explanation' && u && u.grammar){
    intraStepFraction = u.grammar.blocks.length ? STEP_STATE.explanationIndex / u.grammar.blocks.length : 0;
  } else if (stepKey === 'gramExercises' && u && u.grammar){
    intraStepFraction = u.grammar.exercises.length ? STEP_STATE.gramExerciseIndex / u.grammar.exercises.length : 0;
  }

  const pct = ((STEP_STATE.currentStep + intraStepFraction) / stepCount) * 100;
  fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

// ---------- Modo foco de lição (estilo Busuu) ----------
// Esconde topbar/tabs enquanto o aluno está numa lição, checkpoint ou teste
// de nível — só a barra de progresso e o X ficam visíveis por cima do
// exercício em si.
function setLessonFocusMode(active){
  document.getElementById('app').classList.toggle('lesson-focus', active);
}

// ---------- Dica pedagógica por exercício ----------
// A dica NÃO é mais uma ação independente no topo da tela -- ela pertence
// ao estado de "Não sei" (ver wireDontKnowButton). buildExerciseHint só
// gera o TEXTO, a partir do CONTEÚDO do próprio exercício (a frase de
// exemplo já usada no card de vocabulário via findMatchingPhrase, o tema da
// unidade, o primeiro bloco de uma frase de ordenar...) -- nunca a resposta
// pronta, e nunca um texto genérico igual pra tudo.
function maskWordInText(text, word){
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return null;
  return text.slice(0, idx) + '_____' + text.slice(idx + word.length);
}

// Regra pedagógica: a dica ajuda a PENSAR (contexto, estratégia, função
// comunicativa), nunca entrega uma característica formal da resposta (letra
// inicial, número de letras/palavras, posição, terminação...) que permita
// deduzi-la mecanicamente -- por isso nenhum ramo abaixo usa .length, index
// de letra ou "começa com".
function buildExerciseHint(ex, unit){
  if (ex.format === 'meaning' || ex.format === 'listen' || ex.format === 'type'){
    const item = ex.item;
    const phrase = findMatchingPhrase(item, unit);
    if (phrase){
      const masked = maskWordInText(phrase.f, item.f) || phrase.f;
      return `Pense em quando você usaria essa expressão. Ela aparece nesta frase que você já estudou: "${masked}"`;
    }
    if (ex.format === 'type'){
      return 'Ouça de novo com atenção aos sons -- é uma expressão do tema desta unidade.';
    }
    return `Pense no contexto do tema desta unidade ("${unit.title}"): em que situação você usaria essa palavra?`;
  }
  if (ex.format === 'reorder'){
    // "traduzir": o desafio principal é lembrar o vocabulário certo em meio
    // aos blocos-isca -- a dica de ordem das palavras (útil no modo
    // "ordenar", que já mostra a frase certa embaralhada) viria em segundo
    // lugar aqui.
    return ex.mode === 'translate'
      ? 'Primeiro descarte os blocos que não pertencem a esta frase -- só depois pense na ordem das palavras que sobraram.'
      : 'Identifique primeiro quem realiza a ação e depois a ação em si -- monte a frase seguindo essa ordem de raciocínio, ignorando os blocos que não pertencem a ela.';
  }
  if (ex.format === 'scenario'){
    return 'Releia a situação com atenção: pense no que você diria nesse momento, não apenas no significado de cada frase.';
  }
  if (ex.format === 'cloze'){
    return 'Releia a frase inteira, junto da tradução, e pense em qual palavra dá sentido gramatical e comunicativo ao espaço.';
  }
  if (ex.format === 'trueFalse'){
    const shown = unit.concepts && unit.concepts.find(c => STEP_STATE.conceptsShown.has(c.id));
    return shown
      ? `Pense na explicação: "${shown.blocks[0].title}"`
      : 'Releia a afirmação com atenção: ela descreve exatamente a situação em que essa expressão é usada?';
  }
  return null;
}

// ---------- "Não sei" / dica / ver resposta (mecânica compartilhada) ----------
// "Não sei" preserva o esforço de recuperação: existe desde o início do
// exercício (não só depois de um erro), mas NUNCA é tratado como resposta
// errada -- não conta erro, não conta acerto. Ao clicar, o próprio botão
// "Não sei" é SUBSTITUÍDO (não fica ao lado de outro controle) pelo bloco da
// dica, no mesmo lugar em que o aluno pediu ajuda -- sem pular pro topo da
// tela, sem exigir que ele procure a dica em outro lugar. Desse bloco saem
// duas ações: "Tentar novamente" (fecha a dica, a pergunta continua ali,
// intacta) ou "Ver resposta" (única forma de finalizar sem ter acertado
// sozinho -- sem XP, sem contar como acerto, com a mesma explicação/retomada
// de conteúdo usada quando o aluno erra de verdade).
function wireDontKnowButton(contentEl, ex, onRevealAnswer){
  const btn = contentEl.querySelector('#exercise-dontknow-btn');
  if (!btn) return;
  const row = btn.parentElement;
  btn.addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered || ex.askedDontKnow) return;
    ex.askedDontKnow = true;
    const unit = UNITS.find(u => u.id === STATE.currentUnitId);
    const hintText = buildExerciseHint(ex, unit);
    btn.outerHTML = `
      <div class="inline-hint-block" id="inline-hint-block">
        ${hintText ? `
          <div class="inline-hint-label">💡 Dica</div>
          <p class="inline-hint-text">${hintText}</p>
        ` : ''}
        <div class="inline-hint-actions">
          <button class="btn btn-secondary inline-hint-retry-btn" id="inline-hint-retry-btn">Tentar novamente</button>
          <button class="btn btn-secondary exercise-reveal-btn" id="exercise-reveal-btn">Ver resposta</button>
        </div>
      </div>
    `;
    const block = row.querySelector('#inline-hint-block');
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    block.querySelector('#inline-hint-retry-btn').addEventListener('click', () => {
      block.remove();
    });
    block.querySelector('#exercise-reveal-btn').addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      ex.revealed = true;
      // O painel "Resposta revelada" (via onRevealAnswer) já cumpre a função
      // de "tentar de novo" ou "ver resposta" -- remove as duas ações daqui
      // pra não deixar "Tentar novamente" como um controle sem sentido
      // depois que a resposta já foi revelada.
      block.querySelector('.inline-hint-actions')?.remove();
      onRevealAnswer();
    });
  });
}

// XP de um acerto: um pouco menor quando o aluno pediu "Não sei" (e por
// tabela recebeu a dica) nesse exercício -- preserva a distinção acerto
// independente > acerto com ajuda sem criar um sistema de pontuação
// complexo.
function exerciseXP(ex, fullXP){
  // Único ponto por onde passam TODOS os formatos de exercício ao acertar
  // (ver os 6 chamadores de addXP(exerciseXP(...))) -- aproveita pra
  // registrar o formato pro badge "Multitarefa", sem precisar duplicar essa
  // chamada em cada um dos 6 lugares.
  registerDailyExerciseFormat(ex.format);
  return ex.askedDontKnow ? Math.max(1, fullXP - 1) : fullXP;
}

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

// Cartão de introdução de UMA palavra do bloco atual (ETAPA 1). Mesmo
// conteúdo/recursos de antes (palavra, áudio, tradução, "Já sei?", frase de
// exemplo) -- só a posição mudou: em vez de "Palavra X de N" (a unidade
// inteira), mostra a posição dentro do pequeno bloco atual.
function renderBlockIntroCard(u, contentEl, nextBtn){
  const acq = STEP_STATE.acq;
  const block = acq.blocks[acq.blockIdx];
  const posInBlock = acq.introIdx;
  const idx = block[posInBlock];
  const v = u.vocab[idx];
  const cardId = `u${u.id}-v${idx}`;
  const card = STATE.cards.find(c => c.id === cardId);
  const alreadyKnown = card && card.reps > 0;
  const matchingPhrase = findMatchingPhrase(v, u);
  acq.introduced[idx] = true;

  const phraseHTML = matchingPhrase ? `
    <div class="vocab-phrase-example">
      <div class="vocab-phrase-label">Na frase</div>
      <div class="vocab-phrase-french">${matchingPhrase.f} ${audioBtnHTML(matchingPhrase.f)}</div>
      <div class="vocab-phrase-trans">${matchingPhrase.t}</div>
    </div>
  ` : '';

  contentEl.innerHTML = `
    <div class="vocab-card-counter">Bloco ${acq.blockIdx + 1} de ${acq.blocks.length} · Palavra ${posInBlock + 1} de ${block.length}</div>
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
  nextBtn.textContent = posInBlock < block.length - 1 ? 'Próxima palavra →' : 'Ver o que você aprendeu →';
}

// ---------- Construção das filas de exercício da sessão de aquisição ----------
// Escolhe o formato do exercício pelo OBJETIVO PEDAGÓGICO do momento e pelo
// estado real da palavra (exposição no SRS + erros nesta sessão) -- não mais
// por posição no array (round-robin arbitrário, `idx % formats.length`, não
// tinha nenhuma relação com o que a palavra precisava agora).
//   - 'practice' (primeira prática, logo após a checagem do bloco): ainda é
//     cedo pra cobrar produção de uma palavra genuinamente nova -- só entra
//     "type" (digitar de ouvido) se a palavra já vinha exposta de fora desta
//     sessão (SRS prévio ou "Já sei?").
//   - 'mixed'/'consolidation' (a palavra já passou por checagem + prática
//     nesta sessão): quem foi bem (sem erro na sessão) e já tem alguma
//     exposição sobe pra produção; quem errou continua em reconhecimento --
//     não empurra produção pra cima de quem ainda está com dificuldade.
// Sem `intent` (chamada avulsa), mantém o comportamento mais conservador de
// reconhecimento, igual ao de 'practice'.
function pickVocabFormat(unit, idx, intent){
  const cardId = `u${unit.id}-v${idx}`;
  const card = STATE.cards.find(c => c.id === cardId);
  const exposed = card && card.reps > 0;
  const misses = (STEP_STATE.acq && STEP_STATE.acq.wordMisses[idx]) || 0;

  if (intent === 'mixed' || intent === 'consolidation'){
    if (exposed && misses === 0) return shuffle(['type', 'listen', 'meaning'])[0];
    return shuffle(['meaning', 'listen'])[0];
  }
  if (exposed) return shuffle(['meaning', 'type', 'listen'])[0];
  return shuffle(['meaning', 'listen'])[0];
}

function buildVocabWordExercise(unit, idx, intent){
  const item = unit.vocab[idx];
  const format = pickVocabFormat(unit, idx, intent);
  const pool = unit.vocab;
  const distractors = shuffle(pool.filter(v => v !== item)).slice(0, 3);
  const options = shuffle([item, ...distractors]);
  return { format, item, options, vocabIdx: idx };
}

// Checagem imediata do bloco (ETAPA 2): recuperação ativa de reconhecimento
// (formato "meaning") pra CADA palavra recém-introduzida no bloco.
function buildBlockCheckpointQueue(unit, blockIndices){
  return blockIndices.map(idx => {
    const item = unit.vocab[idx];
    const distractors = shuffle(unit.vocab.filter(v => v !== item)).slice(0, 3);
    return { format: 'meaning', item, options: shuffle([item, ...distractors]), vocabIdx: idx };
  });
}

// Prática mista (ETAPA 5): uma rodada por palavra já introduzida (bloco atual
// + todos os anteriores), embaralhada. Palavras com erro nesta sessão ganham
// uma repetição extra.
function buildMixedQueue(unit, introducedIndices){
  const acq = STEP_STATE.acq;
  const base = introducedIndices.map(idx => buildVocabWordExercise(unit, idx, 'mixed'));
  const extra = introducedIndices
    .filter(idx => (acq.wordMisses[idx] || 0) >= 1)
    .map(idx => buildVocabWordExercise(unit, idx, 'mixed'));
  return shuffle([...base, ...extra]);
}

function buildPracticeQueue(unit, blockIndices){
  return blockIndices.map(idx => buildVocabWordExercise(unit, idx, 'practice'));
}

// ---------- Explicação contextual (cartões de conceito) ----------
// Substitui o antigo `usageNote` mostrado só no fim, depois de todo o
// vocabulário + diálogo -- cada conceito de `unit.concepts` dispara no ponto
// exato da lição em que passa a ser relevante -- contato (o aluno acabou de
// ver/usar a palavra) -> percepção -> explicação curta -> volta direto pra
// prática, sem sair da lição. Reaproveita o mesmo formato title/body/
// examples/wrapup que as unidades de gramática já usam (u.grammar.blocks) --
// não é um segundo sistema paralelo, só uma forma de disparar o mesmo tipo
// de cartão NO MEIO de uma lição de vocabulário, em vez de só numa unidade
// de gramática inteira.

// Conceitos cujo gatilho é "depois deste bloco de vocabulário" (o mais comum
// -- a palavra que motiva a explicação acabou de ser apresentada).
function pendingConceptsForBlock(u, blockIdx){
  if (!u.concepts || !u.concepts.length) return [];
  const idxInBlock = new Set(STEP_STATE.acq.blocks[blockIdx]);
  return u.concepts.filter(c =>
    typeof c.trigger.afterVocabIdx === 'number' &&
    idxInBlock.has(c.trigger.afterVocabIdx) &&
    !STEP_STATE.conceptsShown.has(c.id)
  );
}

// Conceitos cujo gatilho só existe em contexto (diálogo) -- o padrão em si
// não é vocabulário novo da unidade, só aparece dentro da fala.
function pendingConceptsAfterDialogue(u){
  if (!u.concepts || !u.concepts.length) return [];
  return u.concepts.filter(c => c.trigger.after === 'dialogue' && !STEP_STATE.conceptsShown.has(c.id));
}

// Mostra `list` (pode ser vazia) um cartão de cada vez e só chama `afterFn`
// quando o aluno tiver passado por todos -- se `list` já vier vazia, chama
// `afterFn` na hora, então quem chama isso não precisa checar antes.
function runConceptQueueThen(list, afterFn){
  if (!list.length){ afterFn(); return; }
  STEP_STATE.conceptQueue = list;
  STEP_STATE.conceptIdx = 0;
  STEP_STATE.conceptBlockIdx = 0;
  STEP_STATE.conceptAfterFn = afterFn;
  renderConceptStep();
}

function renderConceptStep(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const backBtn = document.getElementById('step-back-btn');
  backBtn.style.display = 'none'; // sem "voltar" no meio de uma explicação, igual ao checkpoint/prática
  setAcqPhaseBanner('💡 Vale entender isso');

  const concept = STEP_STATE.conceptQueue[STEP_STATE.conceptIdx];
  const block = concept.blocks[STEP_STATE.conceptBlockIdx];
  const isLastBlockOfConcept = STEP_STATE.conceptBlockIdx === concept.blocks.length - 1;
  const isLastConcept = STEP_STATE.conceptIdx === STEP_STATE.conceptQueue.length - 1;

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
    <div class="gram-block-counter">${concept.blocks.length > 1 ? `${STEP_STATE.conceptBlockIdx + 1} de ${concept.blocks.length}` : 'Vale entender'}</div>
    <div class="gram-block ${block.wrapup ? 'wrapup' : ''}">
      <h3 class="gram-block-title">${block.title}</h3>
      <p class="gram-block-body">${block.body}</p>
      ${examplesHTML}
    </div>
  `;
  wireAudioButtons(contentEl);
  nextBtn.style.display = 'flex';
  nextBtn.textContent = (isLastBlockOfConcept && isLastConcept) ? 'Continuar →' : 'Entendi →';
}

function advanceConceptStep(){
  const concept = STEP_STATE.conceptQueue[STEP_STATE.conceptIdx];
  if (STEP_STATE.conceptBlockIdx < concept.blocks.length - 1){
    STEP_STATE.conceptBlockIdx += 1;
    renderConceptStep();
    return;
  }
  STEP_STATE.conceptsShown.add(concept.id);
  if (STEP_STATE.conceptIdx < STEP_STATE.conceptQueue.length - 1){
    STEP_STATE.conceptIdx += 1;
    STEP_STATE.conceptBlockIdx = 0;
    renderConceptStep();
    return;
  }
  hideAcqPhaseBanner();
  const afterFn = STEP_STATE.conceptAfterFn;
  STEP_STATE.conceptQueue = [];
  STEP_STATE.conceptAfterFn = null;
  afterFn();
}

// Fim da introdução do bloco atual -> mostra os conceitos que esse bloco
// libera (se houver) e só DEPOIS começa a checagem imediata (ETAPA 2). Sem
// conceito pendente, comporta-se exatamente como antes (checagem na hora).
function finishBlockIntro(){
  const acq = STEP_STATE.acq;
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  runConceptQueueThen(pendingConceptsForBlock(u, acq.blockIdx), () => startBlockCheckpoint(u, acq));
}

// Ponte com a lição anterior (†, Modelo B): reconhece rapidamente 1-2
// itens da lição imediatamente anterior antes de entrar na introdução da
// lição atual -- substitui a mistura cumulativa antiga, com escopo bem
// menor (só entre lições consecutivas).
function startBridgeQueue(u){
  const idx = currentLessonIdx(u.id);
  const prevLesson = idx > 0 ? u.lessons[idx - 1] : null;
  const bridgeVocab = (prevLesson && prevLesson.vocabIdx || []).slice(0, 2);
  if (!bridgeVocab.length){
    STEP_STATE.acq.phase = 'intro';
    renderStep();
    return;
  }
  STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, bridgeVocab);
  STEP_STATE.exerciseIndex = 0;
  STEP_STATE.exerciseScore = 0;
  setAcqPhaseBanner('👋 Lembrando da lição anterior');
  renderExerciseStep();
}

function startBlockCheckpoint(u, acq){
  acq.phase = 'checkpoint';
  STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, acq.blocks[acq.blockIdx]);
  STEP_STATE.exerciseIndex = 0;
  STEP_STATE.exerciseScore = 0;
  setAcqPhaseBanner(acqPhaseBannerText('checkpoint'));
  renderExerciseStep();
}

// Chamado quando a fila de exercícios da fase atual (checkpoint/practice/
// mixed) se esgota -- decide a PRÓXIMA fase da sessão de aquisição.
function advanceAcquisitionPhase(){
  const acq = STEP_STATE.acq;
  const u = UNITS.find(x => x.id === STATE.currentUnitId);

  if (acq.phase === 'bridge'){
    acq.phase = 'intro';
    renderStep();
    return;
  }

  if (acq.phase === 'checkpoint'){
    acq.phase = 'practice';
    STEP_STATE.exerciseList = buildPracticeQueue(u, acq.blocks[acq.blockIdx]);
    STEP_STATE.exerciseIndex = 0;
    STEP_STATE.exerciseScore = 0;
    setAcqPhaseBanner(acqPhaseBannerText('practice'));
    renderExerciseStep();
    return;
  }

  if (acq.phase === 'practice'){
    if (acq.blockIdx > 0){
      acq.phase = 'mixed';
      const introducedIdx = acq.blocks.slice(0, acq.blockIdx + 1).flat();
      STEP_STATE.exerciseList = buildMixedQueue(u, introducedIdx);
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      setAcqPhaseBanner(acqPhaseBannerText('mixed'));
      renderExerciseStep();
      return;
    }
    advanceToNextBlockOrConsolidation();
    return;
  }

  if (acq.phase === 'mixed'){
    advanceToNextBlockOrConsolidation();
  }
}

// Acabou o ciclo do bloco atual: introduz o próximo bloco (ETAPA 4/6), ou,
// se não houver mais blocos, segue o fluxo normal da unidade.
function advanceToNextBlockOrConsolidation(){
  const acq = STEP_STATE.acq;
  if (acq.blockIdx < acq.blocks.length - 1){
    acq.blockIdx += 1;
    acq.phase = 'intro';
    acq.introIdx = 0;
    renderStep();
  } else {
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    advanceUnitStep(u);
  }
}

// Avança pro próximo passo da unidade (currentStepDefs), ou -- se já era o
// último -- fecha a LIÇÃO atual (não necessariamente a unidade inteira,
// ver finishCurrentLesson). Só entra em jogo pra unidades de vocabulário
// (grammar continua no fluxo antigo, que nunca chama isto).
function advanceUnitStep(u){
  const stepDefs = currentStepDefs();
  if (STEP_STATE.currentStep < stepDefs.length - 1){
    STEP_STATE.currentStep += 1;
    renderStep();
  } else {
    finishCurrentLesson(u);
  }
}

// Fecha a lição/unidade atual. Unidades sem `lessons` (gramática, ou
// vocabulário ainda não migrado) e a última lição (isCheckpoint) de uma
// unidade migrada caem no fluxo de SEMPRE: marca a unidade concluída e
// mostra os desafios de hoje. Uma lição intermediária, em vez disso, só
// avança lessonIdx, persiste, e mostra a tela leve de "Lição concluída".
function finishCurrentLesson(u){
  // Revisão de uma lição já concluída: nenhum XP de lição/desafio/meta
  // diária deve contar de novo -- só sai de volta pra Trilha, limpando a
  // flag de revisão (ver STEP_STATE.lessonReview).
  if (STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === u.id){
    STEP_STATE.lessonReview = null;
    exitToPath();
    return;
  }
  if (isLessonUnit(u) && !currentLesson(u).isCheckpoint){
    const finished = currentLesson(u);
    // Congela o progresso dos desafios de hoje ANTES das atualizações abaixo,
    // pra depois (renderLessonBoundaryScreen) conseguir mostrar um chip
    // contextual só quando ESSA lição específica fez algum desafio avançar
    // -- não uma lista genérica dos 3 desafios do dia (essa já tem tela
    // própria, acessível pela aba "Desafios").
    const challengesBefore = todaysChallenges().map(c => Math.min(c.get(STATE.daily), c.target));
    const lessonKey = `${u.id}:${currentLessonIdx(u.id)}`;
    STATE.unitProgress[u.id].lessonIdx = currentLessonIdx(u.id) + 1;
    addXP(8);
    // Sem pontuação própria pra avaliar aqui (a lição intermediária não é um
    // exame com nota) -- passa scorePct indefinido de propósito, pra contar
    // pra "Complete N lições"/streak sem inflar highScoreLessons/perfectLessons
    // (esses ficam reservados pra lições que de fato têm uma nota, como o
    // Ponto de verificação). Antes disso, os desafios do dia só avançavam ao
    // fim da UNIDADE inteira -- a rotina diária real é por lição.
    registerDailyLessonCompleted(undefined, false);
    // Meta diária (§4 do artefato): só conta se a lição tinha conteúdo real
    // (>=3 palavras ou incluía diálogo) -- filtra o atalho degenerado de uma
    // lição minúscula "sobrando" no fim de uma unidade.
    registerDailyLessonForGoal(lessonKey, (finished.vocabIdx?.length || 0) >= 3 || !!finished.includesDialogue);
    saveState();
    renderTopbarStats();
    renderLessonBoundaryScreen(u, finished, challengesBefore);
    return;
  }

  // Unidades de gramática pontuam por u.grammar.exercises/gramExerciseScore
  // (lista fixa, não gerada por buildExerciseSet) -- mesma distinção que já
  // existia no fluxo antigo, só centralizada aqui agora.
  const total = u.type === 'grammar' ? u.grammar.exercises.length : STEP_STATE.exerciseList.length;
  const correct = u.type === 'grammar' ? STEP_STATE.gramExerciseScore : STEP_STATE.exerciseScore;
  const scorePct = total ? Math.round((correct / total) * 100) : 100;
  markUnitCompleted(STATE.currentUnitId, scorePct);
  // Meta diária (§4 do artefato): mesma régua de "conteúdo real" (>=3 itens)
  // usada na lição intermediária -- o Ponto de verificação/consolidação da
  // unidade sempre qualifica na prática, mas o filtro evita contar uma
  // unidade de gramática ou legado com uma lista de exercícios minúscula.
  registerDailyLessonForGoal(`${u.id}:checkpoint`, total >= 3);
  if (isLessonUnit(u)){
    STATE.unitProgress[u.id].lessonIdx = 0;
    STATE.unitProgress[u.id].lessonMisses = {};
  }
  STEP_STATE.onChallengesScreen = true;
  renderDailyChallengesScreen();
}

// ---------- Celebração visual (confete + contador animado) ----------
// Sistema compartilhado pelos tiers 2/3/4/6 da hierarquia de celebração (ver
// artefato "A Gramática da Recompensa"): peças de papel coloridas caindo em
// CSS puro (sem biblioteca externa), com intensidade (quantidade/duração)
// parametrizável por tier, e um contador que sobe de 0 até o valor final em
// vez de aparecer pronto -- dá peso ao número sem precisar de confete.
// Ambos respeitam prefers-reduced-motion: o confete nem chega a ser criado
// e o contador mostra o valor final direto, sem pular quadros.
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const CONFETTI_COLORS = ['#d64545', '#e3b341', '#2f8f6e', '#3498d6', '#a15fc9'];

function spawnConfetti(count, durationMs){
  if (prefersReducedMotion() || !count) return;
  const layer = document.getElementById('confetti-layer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < count; i++){
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDuration = `${durationMs + Math.random() * 400}ms`;
    piece.style.animationDelay = `${Math.random() * 200}ms`;
    piece.style.setProperty('--rot', `${Math.random() * 360}deg`);
    layer.appendChild(piece);
  }
  setTimeout(() => { layer.innerHTML = ''; }, durationMs + 700);
}

// Conta de 0 até `to` dentro de `el`, com easing de desaceleração.
function animateCount(el, to, { duration = 650, suffix = '', prefix = '' } = {}){
  if (!el) return;
  if (prefersReducedMotion() || !to){
    el.textContent = `${prefix}${to}${suffix}`;
    return;
  }
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${prefix}${Math.round(to * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Chip contextual dos Desafios de hoje (tier 2) -- só aparece quando ESSA
// lição fez de fato algum desafio avançar (comparando com `before`, tirado
// antes das atualizações em finishCurrentLesson). Mostra só o primeiro que
// avançou, nunca os 3: isso é um lembrete pontual e ligado ao que acabou de
// acontecer, não um resumo genérico -- esse já existe na tela/aba própria
// "Desafios de hoje".
function renderChallengeChipHTML(before){
  if (!before) return '';
  const challenges = todaysChallenges();
  for (let i = 0; i < challenges.length; i++){
    const c = challenges[i];
    const beforeVal = before[i] || 0;
    const afterVal = Math.min(c.get(STATE.daily), c.target);
    if (afterVal <= beforeVal) continue;
    const justCompleted = afterVal >= c.target && beforeVal < c.target;
    return `
      <div class="lesson-boundary-challenge-chip ${justCompleted ? 'done' : ''}">
        <span class="lbc-chip-icon">${c.icon}</span>
        <span class="lbc-chip-label">${justCompleted ? 'Desafio concluído: ' : 'Desafio de hoje: '}${c.label}</span>
        ${justCompleted ? '<span class="lbc-chip-check">✓</span>' : `<span class="lbc-chip-count">${afterVal}/${c.target}</span>`}
      </div>
    `;
  }
  return '';
}

// Tela leve entre lições da mesma unidade (Modelo B) -- mais enxuta que
// renderLessonCompleteScreen (reservada pro fim da unidade inteira). Mostra
// quantos cartões já estão devidos pra revisão AGORA; se houver algum, o
// botão "Continuar" leva direto pro Flashcard em vez de só voltar à trilha.
function renderLessonBoundaryScreen(u, lesson, challengesBefore){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const backBtn = document.getElementById('step-back-btn');
  hideAcqPhaseBanner();
  backBtn.style.display = 'none';
  document.getElementById('step-progress-fill').style.width = '100%';
  maybeShowStreakCelebration();

  const dueCount = cardsDueNow(eligibleReviewPool()).length;
  contentEl.innerHTML = `
    <div class="lesson-complete">
      <div class="lesson-complete-icon tier-pop">✅</div>
      <h2>Lição concluída!</h2>
      <p class="lesson-boundary-title">${lesson.title}</p>
      ${dueCount > 0 ? `<p class="lesson-boundary-due">📇 ${dueCount} ${dueCount > 1 ? 'cartões' : 'cartão'} esperando por revisão</p>` : ''}
      ${renderChallengeChipHTML(challengesBefore)}
    </div>
  `;
  STEP_STATE.onLessonBoundaryScreen = { dueCount };
  nextBtn.textContent = dueCount > 0 ? `Revisar agora (${dueCount}) →` : 'Continuar →';
  nextBtn.style.display = 'flex';
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

// Comunica em que fase da sessão de aquisição o aluno está agora -- pra que
// a experiência pareça uma sessão contínua ("estou aprendendo -> agora
// consigo usar -> agora misturando") em vez de uma sequência de telas soltas
// sem relação entre si. Escondido por padrão a cada renderStep(); cada fase
// que precisa dele liga explicitamente.
// Some fases (checkpoint/practice/mixed/consolidação) são iniciadas por
// funções que chamam renderExerciseStep() diretamente (não renderStep()),
// pra não reconstruir a fila à toa -- então também escondem aqui o botão
// "Voltar" global, que só tem sentido na introdução do bloco.
function setAcqPhaseBanner(text){
  const el = document.getElementById('acq-phase-banner');
  if (el){
    el.textContent = text;
    el.style.display = 'block';
  }
  const backBtn = document.getElementById('step-back-btn');
  if (backBtn) backBtn.style.display = 'none';
}
function hideAcqPhaseBanner(){
  const el = document.getElementById('acq-phase-banner');
  if (el) el.style.display = 'none';
}
function acqPhaseBannerText(phase){
  return {
    checkpoint: '🧠 Checagem rápida',
    practice: '✏️ Praticando o que você acabou de ver',
    mixed: '🔀 Misturando com o que você já viu'
  }[phase] || null;
}

function renderLessonCompleteScreen(contentEl, nextBtn, { correct, total, recapItems, nextLabel }){
  hideAcqPhaseBanner();
  maybeShowStreakCelebration();
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const stars = lessonStars(pct);

  contentEl.innerHTML = `
    <div class="lesson-complete tier-bounce">
      <div class="lesson-complete-icon">👍</div>
      <h2>Parabéns, ${currentStudentName()}!</h2>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">Estrelas</div><div class="lc-stat-value" id="lc-stat-stars">0 ⭐</div></div>
        <div class="lc-stat"><div class="lc-stat-label">Pontuação</div><div class="lc-stat-value" id="lc-stat-pct">0%</div></div>
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
  // Marco de fim de UNIDADE (tier 3 da hierarquia de celebração) -- confete
  // curto + contador subindo em vez de aparecer pronto, mais peso que a
  // simples transição de lição pra lição (tier 2, só o ícone salta).
  spawnConfetti(16, 1400);
  animateCount(document.getElementById('lc-stat-stars'), stars, { prefix: '+', suffix: ' ⭐' });
  animateCount(document.getElementById('lc-stat-pct'), pct, { suffix: '%' });
  nextBtn.textContent = nextLabel || 'Concluir unidade ✓';
  nextBtn.style.display = 'flex';
}

// ---------- Tela de conclusão de módulo/nível (checkpoint e teste de nível) ----------
// Diferente da tela de fim de lição normal: não repete vocabulário isolado,
// foca no que o aluno já é capaz de fazer na vida real com o que aprendeu
// (usa o campo `goal` de cada unidade do módulo/nível).
function renderModuleCompleteScreen(contentEl, nextBtn, { passed, title, subtitle, units, scorePct, passThreshold, nextLabel, tier = 'module' }){
  maybeShowStreakCelebration();
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
    <div class="module-complete tier-bounce">
      <div class="module-complete-icon tier-stamp">🏆</div>
      <h2>${title}</h2>
      <p class="module-complete-sub">${subtitle}</p>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">Estrelas</div><div class="lc-stat-value" id="lc-stat-stars">0 ⭐</div></div>
        <div class="lc-stat"><div class="lc-stat-label">Pontuação</div><div class="lc-stat-value" id="lc-stat-pct">0%</div></div>
      </div>
      <div class="module-skills">
        <div class="module-skills-label">Agora você já sabe, na vida real:</div>
        ${goals.map(g => `
          <div class="module-skill-item"><span class="module-skill-check">✓</span><span>${g}</span></div>
        `).join('')}
      </div>
    </div>
  `;
  // Tier 4 (módulo) vs tier 6 (nível): mesma tela, mas o nível -- o marco
  // mais raro da hierarquia -- ganha confete mais denso e sustentado, sem
  // precisar de uma tela totalmente diferente pra isso.
  const isLevel = tier === 'level';
  spawnConfetti(isLevel ? 34 : 24, isLevel ? 2600 : 2000);
  animateCount(document.getElementById('lc-stat-stars'), stars, { prefix: '+', suffix: ' ⭐', duration: isLevel ? 900 : 750 });
  animateCount(document.getElementById('lc-stat-pct'), scorePct, { suffix: '%', duration: isLevel ? 900 : 750 });
  nextBtn.textContent = nextLabel || 'Continuar →';
  nextBtn.style.display = 'flex';
}

function renderGrammarExerciseStep(u, contentEl, nextBtn){
  const list = u.grammar.exercises;
  const total = list.length;
  renderStepProgress();

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
    // "almost" (grafia quase certa, sem acento etc.) já dá 0.5 ponto -- toca
    // o mesmo som de acerto do "ok", só "wrong" de verdade toca o de erro.
    playFeedbackSound(!wrapEl.classList.contains('wrong'));

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
  stopExerciseAudio();
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;
  const contentEl = document.getElementById('step-content');
  const backBtn = document.getElementById('step-back-btn');
  const nextBtn = document.getElementById('step-next-btn');
  hideAcqPhaseBanner();

  renderStepProgress();
  // Durante checkpoint/practice/mixed, o "Voltar" não faz sentido (a
  // navegação é do próprio motor de exercícios, sem histórico pra desfazer)
  // -- só aparece na introdução do bloco.
  const showBack = STEP_STATE.currentStep > 0
    || (stepKey === 'vocab' && STEP_STATE.acq.phase === 'intro' && (STEP_STATE.acq.blockIdx > 0 || STEP_STATE.acq.introIdx > 0))
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
    if (STEP_STATE.acq.unitId !== u.id || (isLessonUnit(u) && STEP_STATE.acq.lessonIdx !== currentLessonIdx(u.id))){
      STEP_STATE.acq = freshAcquisitionState(u.id, u);
    }
    if (STEP_STATE.acq.phase === 'bridge'){
      startBridgeQueue(u);
    } else if (STEP_STATE.acq.phase === 'intro'){
      renderBlockIntroCard(u, contentEl, nextBtn);
    } else {
      // checkpoint / practice / mixed reaproveitam o motor de exercícios
      // (STEP_STATE.exerciseList/exerciseIndex) -- a navegação própria dele
      // controla o avanço, sem o botão global "Continuar".
      const bannerText = acqPhaseBannerText(STEP_STATE.acq.phase);
      if (bannerText) setAcqPhaseBanner(bannerText);
      renderExerciseStep();
      nextBtn.style.display = 'none';
    }

  } else if (stepKey === 'exercises'){
    if (!STEP_STATE.exerciseList.length || STEP_STATE.exerciseUnitId !== u.id){
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseUnitId = u.id;
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
    }
    setAcqPhaseBanner('🧩 Consolidação da unidade');
    renderExerciseStep();

  } else if (stepKey === 'checkpointExercises'){
    // Lição final de uma unidade migrada (Modelo B) -- "Ponto de
    // verificação". Se o aluno acumulou 3+ palavras erradas ao longo das
    // lições anteriores DESTA unidade, roda primeiro uma "Revisão dos
    // Erros" isolada (✱); só depois entra na consolidação normal
    // (buildExerciseSet, já prioriza quem errou, mas cobre a unidade
    // inteira).
    if (STEP_STATE.checkpointUnitId !== u.id){
      STEP_STATE.checkpointUnitId = u.id;
      const misses = STATE.unitProgress[u.id].lessonMisses || {};
      const missedIdx = Object.keys(misses).map(Number).filter(i => misses[i] >= 1);
      if (missedIdx.length >= 3){
        STEP_STATE.checkpointPhase = 'errors';
        STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, missedIdx);
      } else {
        STEP_STATE.checkpointPhase = 'main';
        STEP_STATE.exerciseList = buildExerciseSet(u);
      }
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
    }
    setAcqPhaseBanner(STEP_STATE.checkpointPhase === 'errors' ? '🔁 Revisão dos erros' : '🧩 Ponto de verificação');
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

  }
}

document.getElementById('step-back-btn').addEventListener('click', () => {
  const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;

  // No passo de vocabulário, "Voltar" recua palavra a palavra dentro do
  // bloco atual (e entre blocos) antes de sair do passo -- não existe
  // "voltar" dentro de checkpoint/practice/mixed (o botão fica escondido
  // nessas fases, ver renderStep).
  if (stepKey === 'vocab' && STEP_STATE.acq.phase === 'intro'){
    const acq = STEP_STATE.acq;
    if (acq.introIdx > 0){
      acq.introIdx -= 1;
      renderStep();
      return;
    }
    if (acq.blockIdx > 0){
      acq.blockIdx -= 1;
      acq.introIdx = acq.blocks[acq.blockIdx].length - 1;
      renderStep();
      return;
    }
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

  // Tela de "Lição concluída" (Modelo B, entre lições da mesma unidade) --
  // se havia cartões devidos no momento em que a lição terminou, leva
  // direto pro Flashcard em vez de voltar pra trilha.
  if (STEP_STATE.onLessonBoundaryScreen){
    const { dueCount } = STEP_STATE.onLessonBoundaryScreen;
    STEP_STATE.onLessonBoundaryScreen = null;
    setLessonFocusMode(false);
    document.getElementById('unit-detail-wrap').style.display = 'none';
    document.getElementById('path-list-wrap').style.display = 'block';
    renderUnitsGrid();
    if (dueCount > 0){
      switchTab('review');
      openReviewSession('flashcard');
    }
    return;
  }

  // Um cartão de explicação contextual está tocando por cima do passo normal
  // -- "Continuar"/"Entendi" aqui avança DENTRO da fila de conceitos, não do
  // passo da unidade (ver runConceptQueueThen). Tem prioridade sobre tudo
  // abaixo, igual checkpoint/practice/mixed já tinham sobre o vocab normal.
  if (STEP_STATE.conceptQueue.length){
    advanceConceptStep();
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

  // No passo de vocabulário, o botão "Continuar" só existe na fase de
  // introdução (checkpoint/practice/mixed escondem o botão global e avançam
  // pela navegação própria dos exercícios).
  if (stepKey === 'vocab'){
    const acq = STEP_STATE.acq;
    if (acq.phase === 'intro'){
      const block = acq.blocks[acq.blockIdx];
      if (acq.introIdx < block.length - 1){
        acq.introIdx += 1;
        renderStep();
      } else {
        finishBlockIntro();
      }
    }
    return;
  }

  if (stepKey === 'explanation'){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    if (STEP_STATE.explanationIndex < u.grammar.blocks.length - 1){
      STEP_STATE.explanationIndex += 1;
      renderStep();
      return;
    }
  }

  // Saindo do diálogo: mostra os conceitos cujo gatilho só existe em
  // contexto (o padrão em si não é vocabulário novo, só aparece na fala)
  // antes de seguir pro próximo passo da unidade.
  if (stepKey === 'dialogue'){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    runConceptQueueThen(pendingConceptsAfterDialogue(u), () => advanceUnitStep(u));
    return;
  }

  advanceUnitStep(UNITS.find(x => x.id === STATE.currentUnitId));
});

// ---------- Geração dos exercícios (múltipla escolha + ordenar, estilo Memrise) ----------
// A pergunta sempre mostra a palavra/frase em francês (com áudio) e pede a
// tradução em português como resposta.
// ---------- Consolidação final da unidade (ETAPA 7) ----------
// Depois que a aquisição por blocos já deu a cada palavra checagem + prática
// (+ mistura, a partir do 2º bloco), repetir a unidade inteira de novo aqui
// seria só reexpor conteúdo já praticado à toa. Em vez disso, prioriza quem
// errou durante a sessão e pega só uma amostra do resto -- consolidação como
// recuperação e aplicação, não como "mostrar tudo de novo". Se o estado de
// aquisição não corresponder a esta unidade (estado inconsistente), cai de
// volta pra cobrir todas as palavras.
// CONSOLIDATION_CAP existe pra a consolidação continuar CURTA mesmo numa
// sessão onde o aluno errou muitas palavras -- sem teto, "priorizar quem
// errou" vira o oposto do pedido (uma sessão que só cresce quanto mais o
// aluno erra). Cobre cada palavra errada 1x primeiro; só dá uma 2ª rodada
// pra elas se ainda sobrar espaço dentro do teto.
const CONSOLIDATION_CAP = 10;
function buildConsolidationVocabExercises(unit){
  const acq = STEP_STATE.acq;
  const total = unit.vocab.length;
  if (!acq || acq.unitId !== unit.id || !acq.blocks.length){
    return unit.vocab.map((_, i) => buildVocabWordExercise(unit, i, 'consolidation'));
  }

  const cap = Math.min(total, CONSOLIDATION_CAP);
  const allIdx = Array.from({ length: total }, (_, i) => i);
  const missedIdx = shuffle(allIdx.filter(i => (acq.wordMisses[i] || 0) >= 1));
  const otherIdx = shuffle(allIdx.filter(i => !missedIdx.includes(i)));

  const picks = [];
  missedIdx.forEach(i => { if (picks.length < cap) picks.push(i); });
  otherIdx.forEach(i => { if (picks.length < cap) picks.push(i); });
  missedIdx.forEach(i => { if (picks.length < cap) picks.push(i); }); // reforço extra, só se sobrar espaço

  return picks.map(i => buildVocabWordExercise(unit, i, 'consolidation'));
}

// ---------- Distratores dos exercícios de blocos ("ordenar"/"traduzir") ----------
// Quantos blocos-isca entram no exercício: cresce com a complexidade da
// frase (mais blocos na frase certa = "espaço" pra mais isca sem virar uma
// sopa de botões) e com o nível da unidade no currículo (A1 mais raso, B2
// mais denso) -- capado em 4 pra nunca sobrecarregar a grade visualmente.
function reorderDistractorCount(unit, correctBlocks){
  const levelIdx = Math.max(0, LEVELS.findIndex(l => l.id === unit.level));
  const base = Math.max(1, Math.floor((correctBlocks.length - 1) / 2));
  return Math.min(4, base + levelIdx);
}

// Escolhe os blocos-isca em duas camadas de "confundibilidade": blocos da
// MESMA unidade (tema/vocabulário já visto nesta lição -- mais parecidos,
// mais difíceis de descartar de cara) e blocos de QUALQUER unidade (podem
// ser de um assunto totalmente diferente -- mais fáceis de eliminar por
// eliminação). Reaproveita o mesmo padrão de pool em duas camadas já usado
// nos distratores do cloze (ver clozeExercises abaixo), só decidindo a
// PROPORÇÃO entre elas pelo nível: quanto mais avançado, maior a fatia
// "difícil" (mesma unidade) em vez da fatia "fácil" (qualquer unidade).
function buildReorderDistractors(unit, correctBlocks, count){
  if (count <= 0) return [];
  const correctTexts = new Set(correctBlocks.map(b => b.f));
  const dedupeAndExclude = (blocks, excludeTexts) => {
    const seen = new Set(excludeTexts);
    return blocks.filter(b => {
      if (correctTexts.has(b.f) || seen.has(b.f)) return false;
      seen.add(b.f);
      return true;
    });
  };

  const unitPool = shuffle(dedupeAndExclude((unit.phrases || []).flatMap(ph => ph.blocks || []), []));
  const levelIdx = Math.max(0, LEVELS.findIndex(l => l.id === unit.level));
  const hardFraction = Math.min(0.75, 0.25 + levelIdx * 0.25);
  const hardCount = Math.min(unitPool.length, Math.round(count * hardFraction));

  const picked = unitPool.slice(0, hardCount);
  if (picked.length < count){
    const globalPool = shuffle(dedupeAndExclude(
      UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || [])),
      picked.map(b => b.f)
    ));
    picked.push(...globalPool.slice(0, count - picked.length));
  }
  return picked;
}

function buildExerciseSet(unit){
  const vocabExercises = buildConsolidationVocabExercises(unit);

  // Frases da unidade viram exercício de "ordenar"/"traduzir" ou de "cenário"
  // (index par/ímpar), pra variar o formato sem dobrar o total de
  // exercícios por lição. Entre as que viram exercício de blocos, metade
  // pede só reordenar (frase já em francês, sem tradução exibida) e metade
  // pede traduzir (parte do português, monta o francês do zero) -- os dois
  // reaproveitam o MESMO motor de blocos/slots, só o prompt muda (ver
  // renderReorderExercise). Ambos agora incluem blocos-isca.
  const phrasesWithBlocks = (unit.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  const phrasesWithScenario = (unit.phrases || []).filter(p => p.scenario);

  const reorderExercises = [];
  const scenarioExercises = [];
  phrasesWithBlocks.forEach((p, i) => {
    if (p.scenario && i % 2 === 1 && phrasesWithScenario.length >= 3){
      const distractors = shuffle(phrasesWithScenario.filter(x => x !== p)).slice(0, 2);
      scenarioExercises.push({ format: 'scenario', phrase: p, options: shuffle([p, ...distractors]) });
    } else {
      const mode = reorderExercises.length % 2 === 0 ? 'translate' : 'order';
      const distractorCount = reorderDistractorCount(unit, p.blocks);
      const distractorBlocks = buildReorderDistractors(unit, p.blocks, distractorCount);
      reorderExercises.push({ format: 'reorder', phrase: p, mode, shuffledBlocks: shuffle([...p.blocks, ...distractorBlocks]) });
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

// ---------- Atalho de teclado 1-4 pras alternativas selecionáveis ----------
// Um ÚNICO listener global (registrado uma vez, no fim deste arquivo -- ver
// abaixo), nunca um novo por exercício renderizado. Cada tela de exercício
// só chama wireKeyboardOptions (que atualiza KEYBOARD_OPTION_MAP) ou deixa
// de chamar (digitação, ordenar frase) -- o mapa fica null nesses casos e o
// listener não faz nada.
let KEYBOARD_OPTION_MAP = null;

function clearKeyboardOptions(){ KEYBOARD_OPTION_MAP = null; }

// buttons: os elementos já renderizados na tela.
// mode 'grid2x2': só ativa com exatamente 4 opções E confirma, pela posição
//   REAL na tela (getBoundingClientRect, não a ordem do array), que formam
//   duas linhas de duas colunas -- se o layout não bater com isso (ex.: uma
//   coluna só), desativa em vez de forçar uma correspondência errada. A
//   numeração segue a ordem de leitura (1=superior esquerda, 2=superior
//   direita, 3=inferior esquerda, 4=inferior direita).
// mode 'sequential': 1 = primeira opção na ordem de leitura, 2 = segunda...
// badgeSelector: elemento QUE JÁ EXISTE dentro do botão pra escrever o
//   número (ex. ".scenario-option-num", que já aparece na tela) -- evita
//   duplicar um indicador onde a interface já mostra a posição.
function wireKeyboardOptions(buttons, { mode = 'sequential', badgeSelector = null } = {}){
  const list = Array.from(buttons);
  if (!list.length || list.length > 4){ clearKeyboardOptions(); return; }

  let ordered;
  if (mode === 'grid2x2' && list.length === 4){
    const withRect = list.map(el => ({ el, r: el.getBoundingClientRect() }));
    withRect.sort((a, b) => (a.r.top - b.r.top) || (a.r.left - b.r.left));
    const sameRow = (a, b) => Math.abs(a.r.top - b.r.top) < 4;
    const isTwoByTwo = sameRow(withRect[0], withRect[1]) && sameRow(withRect[2], withRect[3])
      && !sameRow(withRect[0], withRect[2])
      && withRect[0].r.left < withRect[1].r.left && withRect[2].r.left < withRect[3].r.left;
    if (!isTwoByTwo){ clearKeyboardOptions(); return; } // layout reorganizado (ex. mobile) -- não força
    // withRect já está ordenado por posição real (linha, depois coluna) --
    // é exatamente a ordem de leitura que queremos: 1=sup.esq, 2=sup.dir,
    // 3=inf.esq, 4=inf.dir.
    ordered = withRect.map((x, i) => ({ key: String(i + 1), el: x.el }));
  } else {
    ordered = list.map((el, i) => ({ key: String(i + 1), el }));
  }

  KEYBOARD_OPTION_MAP = ordered;
  ordered.forEach(({ key, el }) => {
    const existingBadge = badgeSelector ? el.querySelector(badgeSelector) : null;
    if (existingBadge){
      existingBadge.textContent = key;
    } else if (!el.querySelector('.kbd-hint')){
      const hint = document.createElement('span');
      hint.className = 'kbd-hint';
      hint.textContent = key;
      el.appendChild(hint);
    }
  });
}

// Enter = avançar (estilo Memrise): sempre tenta clicar o botão de
// continuar que estiver na tela agora, em ordem de prioridade -- painel de
// erro/resposta revelada > painel de acerto do "ordenar frase" > fila de
// desafios > botão global "Continuar"/"Próxima palavra" (reaproveitado em
// vocabulário, diálogo, checkpoint etc.). Roda ANTES do guard de
// INPUT/TEXTAREA (abaixo) porque precisa funcionar mesmo com o campo de
// digitação ainda focado: o próprio input já tem seu handler de Enter
// (submete a resposta, ver ex. #cloze-input) que roda primeiro; se a
// resposta for CERTA o exercício já avança sozinho antes deste handler
// chegar a rodar (nada fica visível pra clicar); se for ERRADA, o painel só
// aparece depois de 500ms, então este Enter (o mesmo que respondeu) não
// acha nada ainda -- só um 2º Enter, já com o campo desabilitado (perdeu o
// foco sozinho), cai aqui e avança de verdade. Em múltipla escolha/cloze/
// cenário/V-ou-F ainda não respondidos, nenhum desses botões existe --
// Enter não faz nada, de propósito (não existe "resposta padrão" pra
// confirmar só com Enter).
function findEnterAdvanceTarget(){
  const wrongContinueBtn = document.getElementById('wrong-continue-btn');
  if (wrongContinueBtn) return wrongContinueBtn;
  const correctContinueBtn = document.getElementById('correct-continue-btn');
  if (correctContinueBtn) return correctContinueBtn;
  const queueContinueBtn = document.getElementById('queue-continue-btn');
  if (queueContinueBtn) return queueContinueBtn;
  const stepNextBtn = document.getElementById('step-next-btn');
  if (stepNextBtn && stepNextBtn.offsetParent !== null) return stepNextBtn;
  return null;
}

// Nenhum atalho (1-4, "r", Enter) deve agir se um modal (ex.: "Atalhos do
// teclado", seletor de nível) estiver aberto por cima do exercício -- sem
// isso, um Enter ou número pressionado ali clicaria/selecionaria algo na
// tela de trás, escondida atrás do modal, sem o aluno perceber.
function anyAppModalOpen(){
  return Array.from(document.querySelectorAll('.app-modal-overlay')).some(m => m.style.display === 'flex');
}

// Registrado uma única vez, no carregamento do script -- nunca por render.
document.addEventListener('keydown', (e) => {
  if (anyAppModalOpen()) return;

  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey){
    const target = findEnterAdvanceTarget();
    if (target){
      e.preventDefault();
      target.click();
    }
    return;
  }

  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

  // "r" repete o último áudio que de fato tocou (clique manual ou autoplay)
  // -- reaproveita o mesmo botão/clique de sempre, não uma lógica própria.
  // Sem modificador: Ctrl/Cmd+R continua sendo "recarregar página" do navegador.
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey){
    if (LAST_AUDIO_BTN && LAST_AUDIO_BTN.isConnected && !LAST_AUDIO_BTN.disabled && !LAST_AUDIO_BTN.classList.contains('disabled')){
      e.preventDefault();
      LAST_AUDIO_BTN.click();
    }
    return;
  }

  if (!KEYBOARD_OPTION_MAP) return;
  const entry = KEYBOARD_OPTION_MAP.find(x => x.key === e.key);
  if (!entry) return;
  if (!entry.el.isConnected || entry.el.disabled || entry.el.classList.contains('disabled')) return;
  e.preventDefault();
  entry.el.click();
});

function renderExerciseStep(){
  stopExerciseAudio();
  clearKeyboardOptions();
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const total = STEP_STATE.exerciseList.length;

  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  renderStepProgress();

  if (STEP_STATE.exerciseIndex >= total){
    // Dentro do passo "vocab", este motor de exercícios também roda as
    // fases de checkpoint/practice/mixed da sessão de aquisição -- esgotar
    // a fila aqui significa "avance de fase", não "termine a unidade". Só
    // vira tela de conclusão de verdade na consolidação final (passo
    // "exercises").
    const exhaustedKey = currentStepDefs()[STEP_STATE.currentStep].key;
    if (exhaustedKey === 'vocab'){
      advanceAcquisitionPhase();
      return;
    }
    if (exhaustedKey === 'checkpointExercises' && STEP_STATE.checkpointPhase === 'errors'){
      // Revisão dos Erros (✱) terminada -> consolidação normal da unidade.
      STEP_STATE.checkpointPhase = 'main';
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      setAcqPhaseBanner('🧩 Ponto de verificação');
      renderExerciseStep();
      return;
    }
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

// Feedback do painel de erro/revelação, dividido em duas partes bem
// diferentes (ver seção 14 do pedido: "Por que errei?" != "Rever
// conteúdo"). A retomada de conteúdo (frase de origem/explicação da
// unidade) vem JUNTO da explicação, não atrás de um botão separado --
// "Por que não foi essa" já cumpre sozinho o papel de reconectar o aluno
// ao conteúdo, então um "Rever conteúdo" à parte só duplicava a função.
function answerExplanationHTML(ex){
  if (ex && (ex.format === 'cloze' || ex.format === 'fullsentence')){
    // tradução completa já aparece no prompt e na frase preenchida — repeti-la aqui é redundante
    return '';
  }
  if (ex && ex.format === 'scenario' && ex.phrase){
    // a frase em francês já aparece destacada entre as opções — só a tradução é informação nova
    return `<p class="usage-note-body">${ex.phrase.t}</p>`;
  }
  if (ex && ex.phrase){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    return `<p class="usage-note-body"><strong>${ex.phrase.f}</strong><br>${ex.phrase.t}</p>${noteOrConceptReviewHTML(u) || ''}`;
  }
  if (ex && ex.item){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    const origin = findMatchingPhrase(ex.item, u);
    const originHTML = origin
      ? `<div class="usage-note-title">Onde você já viu isso</div><p class="usage-note-body"><strong>${origin.f}</strong><br>${origin.t}</p>`
      : (noteOrConceptReviewHTML(u, ex.vocabIdx) || '');
    return `<p class="usage-note-body"><strong>${ex.item.f}</strong> = ${ex.item.t}</p>${originHTML}`;
  }
  if (ex && ex.format === 'trueFalse' && ex.whyNote){
    return `<p class="usage-note-body">${ex.whyNote}</p>`;
  }
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  return noteOrConceptReviewHTML(u) || '';
}

// Painel "por que não foi essa" caindo de volta pra uma explicação da
// unidade quando não há frase de origem específica pra mostrar. Usa só os
// conceitos que o aluno JÁ VIU nesta sessão (`STEP_STATE.conceptsShown`) --
// nunca antecipa um conceito que ainda não apareceu na lição -- e prioriza
// o que combina com a palavra errada (`vocabIdx`), quando dá pra saber qual foi.
function noteOrConceptReviewHTML(u, vocabIdx){
  if (!u.concepts || !u.concepts.length) return null;
  const shown = u.concepts.filter(c => STEP_STATE.conceptsShown.has(c.id));
  if (!shown.length) return null;
  const match = (typeof vocabIdx === 'number' && shown.find(c => c.trigger.afterVocabIdx === vocabIdx)) || shown[0];
  const block = match.blocks[match.blocks.length - 1]; // versão mais completa (wrapup) do conceito, se houver mais de um cartão
  return `<div class="usage-note-title">${block.title}</div><p class="usage-note-body">${block.body}</p>`;
}

// Painel de resposta errada/revelada (estilo Duolingo): a explicação
// ("por que não foi essa") aparece AUTOMATICAMENTE -- não depende do aluno
// clicar em nada pra ver o porquê. `revealed` distingue "errei tentando"
// de "pedi pra ver a resposta" (via Não sei) -- nenhum dos dois conta como
// acerto normal, mas o rótulo comunica ao aluno qual foi o caso.
function showAnswerPanel(contentEl, ex, opts = {}){
  const revealed = !!opts.revealed;
  // Erro de verdade (não "Não sei", que não conta como erro) numa palavra
  // com vocabIdx marcado: soma na contagem LOCAL DESTA SESSÃO, usada pra
  // decidir reforço extra na prática mista e prioridade na consolidação
  // final (ETAPA 7) -- não mexe no lapses/SM-2 persistente.
  if (!revealed && ex && typeof ex.vocabIdx === 'number' && STEP_STATE.acq.unitId === STATE.currentUnitId){
    STEP_STATE.acq.wordMisses[ex.vocabIdx] = (STEP_STATE.acq.wordMisses[ex.vocabIdx] || 0) + 1;
  }
  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const explanation = answerExplanationHTML(ex);
  const panel = document.createElement('div');
  panel.className = 'wrong-feedback';
  panel.innerHTML = `
    <div class="wrong-feedback-header">${revealed ? '👀 Resposta revelada' : '❌ Não foi dessa vez'}</div>
    ${explanation ? `
      <div class="wrong-feedback-why">
        <div class="wrong-feedback-why-label">${revealed ? 'Resposta' : 'Por que não foi essa'}</div>
        ${explanation}
      </div>
    ` : ''}
    <button class="btn btn-primary btn-block wrong-feedback-continue" id="wrong-continue-btn">Continuar →</button>
  `;
  wrap.appendChild(panel);

  panel.querySelector('#wrong-continue-btn').addEventListener('click', () => {
    addStudyMinutes();
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showWrongAnswerPanel(contentEl, ex){
  showAnswerPanel(contentEl, ex, { revealed: false });
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
  // "meaning" também toca sozinho agora: ouvir a pronúncia aqui não entrega
  // a resposta (as opções são traduções, não a grafia/leitura), então só
  // reforça positivamente -- ao contrário do cloze, onde tocar cedo demais
  // entregaria a palavra que falta.
  if ((ex.format === 'listen' || ex.format === 'meaning') && canSpeakFrench(ex.item.f)){
    const audioEl = contentEl.querySelector(ex.format === 'listen' ? '.audio-btn-lg' : '.audio-btn');
    speakFrench(ex.item.f, audioEl);
  }
  wireKeyboardOptions(contentEl.querySelectorAll('.exercise-option'), { mode: 'grid2x2' });

  nextBtn.style.display = 'none';

  function revealCorrectVisual(chosenIdx){
    contentEl.querySelectorAll('.exercise-option').forEach((b, i) => {
      b.classList.add('disabled');
      if (ex.options[i] === ex.item) b.classList.add('correct');
      else if (i === chosenIdx) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  contentEl.querySelectorAll('.exercise-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = ex.options[chosenIdx] === ex.item;
      STEP_STATE.exerciseAnswered = true;
      playFeedbackSound(isCorrect);
      revealCorrectVisual(chosenIdx);
      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(exerciseXP(ex, 3));
        registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
        goToNextExercise();
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(-1);
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
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
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  if (canSpeakFrench(ex.item.f)) speakFrench(ex.item.f, contentEl.querySelector('.audio-btn-lg'));
  nextBtn.style.display = 'none';

  const inputEl = document.getElementById('vocab-type-input');
  inputEl.focus();
  const strip = s => normalizeLoose(s).replace(/[.,!?;:'"’]/g, '').trim();

  function lockInputs(){
    inputEl.disabled = true;
    document.getElementById('vocab-type-verify-btn').disabled = true;
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  function finish(isCorrect){
    STEP_STATE.exerciseAnswered = true;
    playFeedbackSound(isCorrect);
    lockInputs();

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4)); // digitar de ouvido vale um pouco mais que só reconhecer em múltipla escolha
      registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
      goToNextExercise();
    } else {
      // A resposta certa já aparece dentro do próprio painel de resultado
      // (answerExplanationHTML mostra ex.item.f) -- sem repetir aqui como um
      // texto solto antes do painel, num estilo diferente.
      showWrongAnswerPanel(contentEl, ex);
    }
  }

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('vocab-type-verify-btn').click();
  });
  document.getElementById('vocab-type-verify-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    finish(strip(inputEl.value) === strip(ex.item.f));
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    lockInputs();
    showAnswerPanel(contentEl, ex, { revealed: true });
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
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  nextBtn.style.display = 'none';
  // A numeração já aparece na tela (.scenario-option-num) -- só liga o
  // atalho a ela, sem duplicar indicador.
  wireKeyboardOptions(contentEl.querySelectorAll('.scenario-option'), { badgeSelector: '.scenario-option-num' });

  function revealCorrectVisual(chosenIdx){
    contentEl.querySelectorAll('.scenario-option').forEach((b, i) => {
      b.classList.add('disabled');
      if (ex.options[i] === ex.phrase) b.classList.add('correct');
      else if (i === chosenIdx) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(-1);
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });

  contentEl.querySelectorAll('.scenario-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      STEP_STATE.exerciseAnswered = true;
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = ex.options[chosenIdx] === ex.phrase;
      playFeedbackSound(isCorrect);

      revealCorrectVisual(chosenIdx);

      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(exerciseXP(ex, 4));
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
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  function revealCorrectVisual(chosenBtn){
    contentEl.querySelectorAll('.tf-option').forEach(b => {
      b.classList.add('disabled');
      const val = b.dataset.val === 'true';
      if (val === ex.answer) b.classList.add('correct');
      else if (b === chosenBtn) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(null);
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });

  contentEl.querySelectorAll('.tf-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      STEP_STATE.exerciseAnswered = true;
      const chosen = btn.dataset.val === 'true';
      const isCorrect = chosen === ex.answer;
      playFeedbackSound(isCorrect);

      revealCorrectVisual(btn);

      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(exerciseXP(ex, 4));
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
      <div class="cloze-trans" id="cloze-trans"></div>
      ${mode === 'type' ? `
        <div class="cloze-type-wrap">
          <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a palavra que falta">
          <button class="btn btn-primary btn-block" id="cloze-verify-btn">Verificar</button>
        </div>
      ` : `
        <div class="cloze-options">${ex.options.map((opt, i) => `<button class="cloze-option" data-idx="${i}">${opt.f}</button>`).join('')}</div>
      `}
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  function revealBlank(state){
    document.getElementById('cloze-blank').textContent = ex.correctBlock.f;
    document.getElementById('cloze-blank').classList.add(state === 'wrong' ? 'incorrect' : 'correct');

    // A tradução da frase só aparece depois de responder -- do mesmo jeito
    // que o áudio abaixo, ela entregaria a resposta de graça se aparecesse
    // antes (a palavra que falta costuma estar literalmente na tradução).
    document.getElementById('cloze-trans').textContent = ex.phrase.t;

    // O áudio só aparece (e toca sozinho) depois de responder — antes disso
    // ele entregaria a resposta de graça, sem precisar completar a frase.
    const audioRow = document.getElementById('cloze-audio-row');
    audioRow.innerHTML = audioBtnHTML(ex.phrase.f);
    wireAudioButtons(audioRow);
    if (canSpeakFrench(ex.phrase.f)) speakFrench(ex.phrase.f, audioRow.querySelector('.audio-btn'));
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  function finish(isCorrect){
    STEP_STATE.exerciseAnswered = true;
    playFeedbackSound(isCorrect);
    revealBlank(isCorrect ? 'ok' : 'wrong');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4));
      goToNextExercise();
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  if (mode !== 'type'){
    wireKeyboardOptions(contentEl.querySelectorAll('.cloze-option'));
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

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    if (mode === 'type'){
      document.getElementById('cloze-input').disabled = true;
      document.getElementById('cloze-verify-btn').disabled = true;
    } else {
      contentEl.querySelectorAll('.cloze-option').forEach((b, i) => {
        b.classList.add('disabled');
        if (ex.options[i] === ex.correctBlock) b.classList.add('correct');
      });
    }
    revealBlank('revealed');
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}

// ---------- Exercício de ordenar palavras (reorder) ----------
function renderReorderExercise(ex, contentEl, nextBtn, total){
  const correctOrder = ex.phrase.blocks;
  const chosenSequence = [];
  // mode 'translate': parte do português (nunca mostra a frase em francês
  // antes de responder) e monta o francês do zero, com blocos-isca no meio.
  // mode 'order' (default, retrocompatível com exercícios antigos sem
  // "mode"): a frase já em francês, só embaralhada -- sem tradução exibida.
  const isTranslate = ex.mode === 'translate';

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">${isTranslate ? 'Traduza para o francês' : 'Ordene a frase'}</div>
      ${isTranslate ? `
        <div class="exercise-prompt">
          <div class="prompt-translation">${ex.phrase.t}</div>
        </div>
      ` : ''}
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
    playFeedbackSound(isCorrect);

    slotsEl.querySelectorAll('.reorder-slot').forEach(slot => {
      slot.classList.add(isCorrect ? 'correct' : 'incorrect');
    });
    // Com a frase completa, todo bloco já foi usado (visibility:hidden --
    // preserva a posição pra "desfazer" clicando num slot) -- mas essa
    // desfeita não existe mais depois de respondido, então a fileira de
    // blocos invisíveis só reservava um vão vazio até o painel de
    // resultado. Some com a fileira inteira.
    blocksEl.style.display = 'none';
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4));
      addStudyMinutes();
      setTimeout(() => showCorrectReorderPanel(contentEl, ex), 500);
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  renderSlots();
  renderBlocks();
  nextBtn.style.display = 'none';

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    slotsEl.innerHTML = correctOrder.map(block =>
      `<div class="reorder-slot filled correct"><div class="french">${block.f}</div></div>`
    ).join('');
    blocksEl.querySelectorAll('.reorder-block').forEach(b => b.classList.add('disabled'));
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
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
  // No modo "traduzir", o português já apareceu como pergunta -- repeti-lo
  // aqui seria redundante; mostra a frase francesa completa (o aluno só viu
  // ela em pedaços separados até agora) como confirmação nova de verdade.
  const secondaryLine = ex.mode === 'translate' ? ex.phrase.f : ex.phrase.t;
  panel.innerHTML = `
    <div class="correct-feedback-header">✅ Muito bem!</div>
    <p class="correct-feedback-trans">${secondaryLine}</p>
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
          maybeShowStreakCelebration();
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
    maybeShowStreakCelebration();
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
    maybeShowStreakCelebration();
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

  // Decide a direção de cada carta ANTES de embaralhar/mostrar -- alterna a
  // partir da última vez que essa carta foi revisada (ver nextCardDirection
  // em shared/srs.js). Calculado 1x aqui, não a cada render.
  queue.forEach(c => { c.reviewDirection = nextCardDirection(c); });

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
  stopExerciseAudio();
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
    maybeShowStreakCelebration();
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

  // Direção estilo Anki: frente->verso (padrão, reconhecimento: vê a
  // palavra em francês, lembra o significado) ou verso->frente (mais
  // difícil, produção ativa: vê a tradução, precisa lembrar o francês).
  // Decidido 1x por sessão em startReviewSession, não a cada render.
  const isReverse = card.reviewDirection === 'back-to-front';
  const frenchSideHTML = `<div class="flashcard-french">${card.front} ${audioBtnHTML(card.front, 'audio-btn-lg')}</div>`;
  const transSideHTML = `<div class="flashcard-trans">${card.back_trans}</div>`;
  const frontHTML = isReverse ? transSideHTML : frenchSideHTML;
  const backHTML = isReverse ? frenchSideHTML : transSideHTML;
  // Áudio automático só quando o francês está do lado JÁ visível -- no modo
  // padrão isso é o front (toca ao entrar no cartão), no modo invertido é
  // o back (toca só ao revelar a resposta).
  const frenchVisibleNow = isReverse ? STATE.reviewShowingAnswer : true;

  el.innerHTML = `
    <div class="review-progress">
      <div class="review-progress-bar"><div class="review-progress-fill" style="width:${pct}%"></div></div>
      <div class="review-progress-count">${STATE.reviewIndex+1} / ${STATE.reviewQueue.length}</div>
    </div>
    <div class="flashcard" id="flashcard">
      <div class="flashcard-tag">${card.unitTitle}</div>
      ${frontHTML}
      ${STATE.reviewShowingAnswer ? `
        <div class="divider-line"></div>
        ${backHTML}
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

  // Áudio disponível (e tocado automaticamente) sempre que o francês está
  // visível no cartão.
  wireAudioButtons(el);
  if (frenchVisibleNow && canSpeakFrench(card.front)){
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

// Rendimento decrescente de XP pra cartas maduras (artefato §5): uma carta
// já dominada (intervalo alto) avaliada repetidamente não deve valer o
// mesmo XP que uma carta ainda instável -- sem tirar XP de revisão nenhuma
// (piso de 1), só reduzir o ganho marginal. `intervalBefore` é o intervalo
// ANTES desta revisão (maturidade já acumulada), não o recalculado por ela.
function reviewXP(intervalBefore, grade){
  const base = XP_PER_GRADE[grade];
  if (intervalBefore >= 60) return Math.max(1, Math.round(base * 0.4));
  if (intervalBefore >= 21) return Math.max(1, Math.round(base * 0.7));
  return base;
}

function gradeCurrentCard(grade){
  const card = STATE.reviewQueue[STATE.reviewIndex];
  // Atrasada de verdade = venceu ANTES de hoje, não só "due agora" (toda
  // carta na fila já é due por definição -- ver eligibleReviewPool). Precisa
  // ser lido antes de applySM2 mutar card.due pra reavaliação.
  const wasOverdue = card.due > 0 && card.due < new Date().setHours(0, 0, 0, 0);
  const intervalBefore = card.interval;
  // Grava a direção mostrada nesta revisão -- da próxima vez que essa carta
  // ficar due, nextCardDirection() (shared/srs.js) alterna pra outra.
  card.lastDirection = card.reviewDirection;
  applySM2(card, grade);
  STATE.totalReviews += 1;
  registerStudyToday();
  registerDailyReviewCard();
  if (wasOverdue) registerDailyOverdueReviewCard();
  addXP(reviewXP(intervalBefore, grade));

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
  // Pequeno atraso pra ler como sequência ("+25 XP" ... "Unidade concluída!")
  // em vez de dois toasts aparecendo ao mesmo tempo, empilhados sem ordem.
  setTimeout(() => showToast(`Unidade concluída! 🥐`), 450);
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
  stopExerciseAudio();
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
      nextLabel: passed ? 'Concluir seção ✓' : 'Voltar à trilha',
      tier: 'module'
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
    // "almost" (grafia quase certa, sem acento etc.) já dá 0.5 ponto -- toca
    // o mesmo som de acerto do "ok", só "wrong" de verdade toca o de erro.
    playFeedbackSound(!wrapEl.classList.contains('wrong'));

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
  stopExerciseAudio();
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
      nextLabel: passed ? `Concluir nível ${test.level} ✓` : 'Voltar à trilha',
      tier: 'level'
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
    // "almost" (grafia quase certa, sem acento etc.) já dá 0.5 ponto -- toca
    // o mesmo som de acerto do "ok", só "wrong" de verdade toca o de erro.
    playFeedbackSound(!wrapEl.classList.contains('wrong'));

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

  const earnedCount = BADGES.filter(b => b.check(STATE)).length;
  document.getElementById('badge-grid-count').textContent = `${earnedCount}/${BADGES.length}`;
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

// renderTopbarStats() agora vem de shared/topbar-stats.js (idêntico nos dois idiomas).

// ============================================================
// TABS / navegação
// ============================================================
// switchTab() vem de shared/tabs.js -- só as partes específicas do francês
// (parar áudio/timers, o que renderizar em cada aba própria) ficam aqui.
const switchTab = createTabSwitcher({
  onBeforeSwitch(tab){
    stopExerciseAudio();
    if (tab !== 'review'){
      stopSpeedTimer();
      stopMatchTimer();
    }
    if (tab !== 'dictation'){
      stopDictationAudio();
    }
  },
  tabHandlers: {
    conjugaison: renderConjSelectScreen,
    progress: renderProgressView,
    path: renderUnitsGrid,
    dictation: renderDictationList,
    challenges: renderChallengeCategories,
  }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============================================================
// EXPORTAÇÃO .apkg (motor comum em shared/anki-export.js) — só o que é
// específico do francês (campos, template, nome do baralho/arquivo, filtro
// de unidades) fica aqui. Acessível por um botão na Trilha (não é mais aba própria).
// ============================================================
const ANKI_EXPORT_CONFIG = {
  modelName: "Francês do Zero",
  fields: [
    { name:"Francês", ord:0, font:"Arial", size:22 },
    { name:"Tradução", ord:1, font:"Arial", size:18 }
  ],
  qfmt: "<div style='text-align:center;font-size:26px;color:#1D5A82;font-weight:bold;'>{{Francês}}</div>",
  afmt: "{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:18px;color:#5C4E73;'>{{Tradução}}</div>",
  css: ".card { font-family: 'Nunito', Arial, sans-serif; text-align: center; background-color: #FAF5EA; color:#201335; }",
  deckDesc: "Exportado do app Francês do Zero",
  guidPrefix: "fzc_",
  unitOptions(){
    return UNITS.filter(u => u.type !== 'grammar').map(u => {
      const { num } = unitOrdinalInfo(u, unitsOfLevel(u.level));
      return { id: String(u.id), label: `${u.level} · ${num}. ${u.title}` };
    });
  },
  deckName(sel){
    return sel === 'all'
      ? 'Francês do Zero - A1'
      : `Francês do Zero - ${UNITS.find(u=>String(u.id)===sel).title}`;
  },
  cards(sel){
    return sel === 'all' ? STATE.cards : STATE.cards.filter(c => String(c.unitId) === sel);
  },
  noteFields(card){
    return [card.front, card.back_trans];
  },
  sortField(card){
    return card.front;
  },
  filename(sel){
    return `frances-do-zero-${sel === 'all' ? 'completo' : 'unidade-'+sel}.apkg`;
  },
};

wireAnkiExportModal(ANKI_EXPORT_CONFIG);

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
    maybeShowStreakCelebration();
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
        <button class="dictation-icon-btn" id="dictation-restart-btn" aria-label="Reiniciar" title="Reiniciar">↺</button>
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
          <button class="dictation-icon-btn" id="dictation-mute-btn" aria-label="Mudo" title="Mudo">🔊</button>
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
    muteBtn.setAttribute('aria-label', v === 0 ? 'Ativar som' : 'Mudo');
    muteBtn.title = v === 0 ? 'Ativar som' : 'Mudo';
  });
  muteBtn.addEventListener('click', () => {
    if (dictationAudioEl.muted || dictationAudioEl.volume === 0){
      dictationAudioEl.muted = false;
      dictationAudioEl.volume = volumeBeforeMute || 1;
      volumeSlider.value = Math.round(dictationAudioEl.volume * 100);
      muteBtn.textContent = '🔊';
      muteBtn.setAttribute('aria-label', 'Mudo');
      muteBtn.title = 'Mudo';
    } else {
      volumeBeforeMute = dictationAudioEl.volume;
      dictationAudioEl.muted = true;
      volumeSlider.value = 0;
      muteBtn.textContent = '🔇';
      muteBtn.setAttribute('aria-label', 'Ativar som');
      muteBtn.title = 'Ativar som';
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
  stopExerciseAudio();
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
  // Só terminações que são um sinal razoavelmente seguro de VERBO conjugado
  // -- de propósito SEM as terminações genéricas -o (1ª pess. sing. do
  // presente) e -a/-e (3ª pess. sing. do presente), que colidem com a
  // imensa maioria dos substantivos/adjetivos/advérbios do português
  // (livro, filme, já, noite...) e geravam falsos positivos constantes:
  // qualquer palavra comum terminada em -a/-e/-o virava "erro de
  // concordância" mesmo quando a resposta do aluno estava certa. Mesmo
  // princípio já usado no dicionário de irregulares acima (comentário
  // "preferimos omitir a forma a arriscar falso positivo").
  const rules = [
    [/amos$|emos$|imos$/, '1p'],
    [/astes$|estes$|istes$/, '2p'],
    [/aram$|eram$|iram$/, '3p'],
    [/am$|em$/, '3p'],
    [/ou$|eu$|iu$/, '3s'],
    [/aste$|este$|iste$/, '2s'],
    [/ei$/, '1s'],
    [/as$|es$/, '2s'],
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
  // Mesmo padrão de estado de edição do card de pendentes
  // (challengeAdminPendingCardHTML) -- "Editar" só troca challengesAdminEditingId,
  // então o card precisa reagir a isso pra realmente mostrar o formulário
  // (senão o botão fica sem efeito visível nenhum, como ficava antes).
  const editing = challengesAdminEditingId === c.id;
  return `
    <div class="challenges-admin-card" data-challenge-id="${c.id}">
      <div class="challenges-admin-card-header">
        <span class="challenge-card-level">${c.level}</span>
        <strong>${challengeAdminCardTitle(c)}</strong>
      </div>
      ${editing ? `<div class="challenges-admin-card-body">${challengeAdminEditView(c)}</div>` : ''}
      <div class="challenges-admin-actions">
        ${editing
          ? `<button class="btn btn-primary" data-action="save">💾 Salvar</button>
             <button class="btn btn-secondary" data-action="cancel-edit">Cancelar</button>`
          : `<button class="btn btn-secondary" data-action="preview">👁️ Ver versão do aluno</button>
             <button class="btn btn-secondary" data-action="edit">✏️ Editar</button>
             <button class="btn btn-secondary" data-action="unpublish">🚫 Despublicar</button>`
        }
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
