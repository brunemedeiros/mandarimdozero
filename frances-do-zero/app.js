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

function speakFrench(text, btnEl){
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
  }
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

let CURRENT_USER = null;
const GUEST_MODE_FLAG = 'frances_zero_guest_mode';

async function initAuth(){
  const { data: { session } } = await supabaseClient.auth.getSession();

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

function sessionStorageSafeGet(key){
  try{ return window.sessionStorage.getItem(key); }catch(e){ return null; }
}
function sessionStorageSafeSet(key, val){
  try{ window.sessionStorage.setItem(key, val); }catch(e){ /* ignore */ }
}
function localStorageSafeGet(key){
  try{ return window.localStorage.getItem(key); }catch(e){ return null; }
}
function localStorageSafeSet(key, val){
  try{ window.localStorage.setItem(key, val); }catch(e){ /* ignore */ }
}

// ---------- Tema claro/escuro ----------
// data-theme ausente = segue o sistema (ver @media prefers-color-scheme no CSS).
// 'light'/'dark' explícito no localStorage força o tema independente do SO.
const THEME_STORAGE_KEY = 'frances_theme';

function isDarkThemeActive(){
  const saved = localStorageSafeGet(THEME_STORAGE_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeToggleIcon(){
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = isDarkThemeActive() ? '☀️' : '🌙';
}

function toggleTheme(){
  const next = isDarkThemeActive() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorageSafeSet(THEME_STORAGE_KEY, next);
  updateThemeToggleIcon();
}

document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
updateThemeToggleIcon();

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
}

document.getElementById('google-login-btn').addEventListener('click', async () => {
  const noteEl = document.getElementById('login-note');
  noteEl.textContent = 'Redirecionando para o Google...';
  noteEl.className = 'login-note';
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error){
    noteEl.textContent = 'Não foi possível iniciar o login. Tente novamente.';
    noteEl.className = 'login-note err';
  }
});

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
    if (fetchError) console.error('Erro ao ler progresso antes de salvar:', fetchError);

    const merged = Object.assign({}, existing && existing.data, { [APP_KEY]: payload });
    const { error } = await supabaseClient
      .from('progress')
      .upsert({ user_id: CURRENT_USER.id, data: merged }, { onConflict: 'user_id' });
    if (error) console.error('Erro ao salvar progresso:', error);
  }catch(e){
    console.error('Erro ao salvar progresso:', e);
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
    totalReviews: STATE.totalReviews,
    daily: STATE.daily,
    checkpointProgress: STATE.checkpointProgress,
    levelTestProgress: STATE.levelTestProgress
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
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.daily) Object.assign(STATE.daily, data.daily);
  if (data.checkpointProgress) Object.assign(STATE.checkpointProgress, data.checkpointProgress);
  if (data.levelTestProgress) Object.assign(STATE.levelTestProgress, data.levelTestProgress);
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

function showToast(msg){
  const layer = document.getElementById('toast-layer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

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

const STEP_STATE = {
  currentStep: 0,
  vocabIndex: 0,
  vocabUnitId: null,
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
function findMatchingPhrase(word, unit){
  return unit.phrases.find(p => p.f.includes(word.f)) || null;
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

  if (TTS.voice){
    const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
    speakFrench(v.f, mainAudioBtn);
  }

  nextBtn.style.display = 'flex';
  nextBtn.textContent = idx < total - 1 ? 'Próxima palavra →' : 'Continuar →';
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
    }
    renderVocabCardStep(u, contentEl, nextBtn);

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
  const pool = unit.vocab;

  const vocabExercises = pool.map((item, i) => {
    const format = vocabFormats[i % vocabFormats.length];
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

  return shuffle([...vocabExercises, ...reorderExercises, ...scenarioExercises, ...trueFalseExercises, ...clozeExercises]);
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
  } else {
    renderMultipleChoiceExercise(ex, contentEl, nextBtn, total);
  }
}

function goToNextExercise(){
  setTimeout(() => {
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  }, 900);
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
  if (ex.format === 'listen' && TTS.voice){
    speakFrench(ex.item.f, contentEl.querySelector('.audio-btn-lg'));
  }

  nextBtn.style.display = 'none';

  function revealAnswer(chosenIdx){
    STEP_STATE.exerciseAnswered = true;
    contentEl.querySelectorAll('.exercise-option').forEach((b, i) => {
      b.classList.add('disabled');
      if (ex.options[i] === ex.item) b.classList.add('correct');
      else if (i === chosenIdx) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    goToNextExercise();
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
      revealAnswer(chosenIdx);
    });
  });

  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    revealAnswer(-1);
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
      <div class="scenario-scene">${ex.phrase.scenarioEmoji}</div>
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
      }
      goToNextExercise();
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
      }
      goToNextExercise();
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
      <div class="cloze-audio-row">${audioBtnHTML(ex.phrase.f)}</div>
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
    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(4);
    }
    goToNextExercise();
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
    }
    goToNextExercise();
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
    goToNextExercise();
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
        <p>O jogo de Combinar precisa de pelo menos algumas palavras já estudadas com sucesso na Trilha.</p>
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
  if (TTS.voice){
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
        <div class="tempo">${CONJ_REGULAR_GROUPS.includes(verbInfo.g) ? 'Regular' : 'Irregular'}</div>
      </div>
      ${nextVerb ? `
        <div class="conj-verb-header next">
          <div class="conj-verb-label">Próximo verbo</div>
          <div class="infinitif">${nextVerb}</div>
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
              ${CONJ_PERSON_LABELS.map((label, i) => {
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
                  if (given.trim() === expected.trim()){ statusClass = 'ok'; }
                  else if (normalizeLoose(given) === normalizeLoose(expected)){ statusClass = 'almost'; expectedText = `Quase! → ${expected}`; }
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
        const given = inputEl.value;
        tenseGiven[i] = given;

        inputEl.disabled = true;
        fieldEl.classList.remove('ok','almost','wrong');

        if (given.trim() === expected.trim()){
          fieldEl.classList.add('ok');
          correctCount++; tenseCorrect++;
        } else if (normalizeLoose(given) === normalizeLoose(expected)){
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
    registerStudyToday();

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
// Inicialização
// ============================================================
initAuth();
