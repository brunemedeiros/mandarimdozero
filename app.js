/* ============================================================
   Mandarim do Zero — lógica do app
   - Estado persistido em memória (sessão) + localStorage indisponível
     em artifacts, então usamos window.storage se existir, senão
     memória pura (variável global) para a sessão atual.
   - SRS: algoritmo SM-2 (o mesmo usado pelo Anki clássico)
   - Exportação: gera .apkg real via sql.js + JSZip
   - Áudio: Text-to-Speech via Web Speech API (voz zh-CN do navegador)
   ============================================================ */

// ---------- Text-to-Speech (mandarim) ----------
// Navegadores baseados em Chromium (incluindo Opera) têm alguns bugs conhecidos
// com a Web Speech API: getVoices() pode retornar vazio por mais tempo do que
// no Chrome puro, o evento onvoiceschanged nem sempre dispara, e o synthesis
// engine pode "engasgar" sem warm-up na primeira chamada. As estratégias abaixo
// cobrem esses casos.
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

function loadChineseVoice(){
  if (!TTS.supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return false;
  // Prioriza vozes zh-CN, depois qualquer zh-*; dentro de cada grupo, a de melhor qualidade.
  const exact = voices.filter(v => v.lang === 'zh-CN').sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  const anyZh = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('zh')).sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  TTS.voice = exact[0] || anyZh[0] || null;
  TTS.voicesLoaded = true;
  return !!TTS.voice;
}

// Polling ativo: alguns navegadores (Opera entre eles) não disparam
// onvoiceschanged de forma confiável, então tentamos por conta própria
// por alguns segundos após o carregamento da página.
function pollForVoices(){
  if (!TTS.supported || TTS.voice) return;
  TTS.pollAttempts++;
  loadChineseVoice();
  if (!TTS.voice && TTS.pollAttempts < 20){
    setTimeout(pollForVoices, 300);
  }
}

if (TTS.supported){
  loadChineseVoice();
  window.speechSynthesis.onvoiceschanged = loadChineseVoice;
  pollForVoices();
}

// "Aquece" o synthesis engine com uma fala silenciosa disparada pela primeira
// interação real do usuário na página. Em alguns navegadores Chromium, a
// primeira chamada de speak() após o carregamento simplesmente não soa se não
// tiver sido precedida de uma interação — isso resolve preventivamente.
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

function speakChinese(text, btnEl){
  if (!TTS.supported){
    showToast('Áudio não suportado neste navegador');
    return;
  }

  // Tenta recarregar a voz na hora, caso o polling ainda não tenha pego
  // (cobre o caso de clique muito rápido após o carregamento da página).
  if (!TTS.voice){
    loadChineseVoice();
  }

  if (!TTS.voice){
    showToast('🔇 Voz em chinês não encontrada — veja o guia de configuração');
    return;
  }

  // Bug conhecido em navegadores Chromium: o synthesis engine às vezes fica
  // "pausado" internamente sem motivo aparente. Forçar resume() antes de
  // falar evita boa parte dos casos de "clica mas não sai som".
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const buildUtterance = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.voice = TTS.voice;
    u.rate = 0.85; // um pouco mais devagar, melhor pra quem está aprendendo
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

  // Watchdog: se depois de 800ms o evento "onstart" nunca disparou, é sinal
  // de que o engine engasgou silenciosamente (padrão visto no Opera). Tenta
  // uma segunda vez com um utterance novo antes de desistir — reutilizar o
  // mesmo objeto numa nova chamada de speak() é ignorado por alguns engines.
  setTimeout(() => {
    if (!didStart){
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const retryUtter = buildUtterance();
      let retryStarted = false;
      retryUtter.onstart = () => { retryStarted = true; };
      retryUtter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
      retryUtter.onerror = () => {
        if (btnEl) btnEl.classList.remove('speaking');
      };

      window.speechSynthesis.speak(retryUtter);

      // Se nem a retentativa funcionar, aí sim avisamos e paramos de tentar.
      setTimeout(() => {
        if (!retryStarted){
          if (btnEl) btnEl.classList.remove('speaking');
          showToast('🔇 O Opera não conseguiu reproduzir este áudio');
        }
      }, 800);
    }
  }, 800);
}

// Bug conhecido do Chromium/Opera: o speechSynthesis pode "adormecer" se
// ficar muitos segundos sem uso, mesmo fora de uma fala ativa. Um resume()
// periódico e leve evita que o próximo clique de áudio saia mudo.
if (TTS.supported){
  setInterval(() => {
    if (!window.speechSynthesis.speaking){
      window.speechSynthesis.resume();
    }
  }, 10000);
}

// Gera o HTML de um botão de áudio; texto chinês vai em data-speak (evita
// problemas de aspas dentro do atributo onclick ao usar addEventListener depois)
function audioBtnHTML(hanziText, extraClass){
  const safe = hanziText.replace(/"/g, '&quot;');
  return `<button class="audio-btn ${extraClass||''}" data-speak="${safe}" aria-label="Ouvir pronúncia" title="Ouvir pronúncia">🔊</button>`;
}

// Ativa todos os .audio-btn dentro de um container (delegação simples por escopo)
function wireAudioButtons(container){
  container.querySelectorAll('.audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakChinese(btn.dataset.speak, btn);
    });
  });
}

// ---------- Ordem dos traços (Hanzi Writer) — modo animação ----------
const HANZI_WRITER_SUPPORTED = typeof HanziWriter !== 'undefined';

function strokeBtnHTML(hanziText){
  const safe = hanziText.replace(/"/g, '&quot;');
  return `<button class="stroke-btn" data-hanzi="${safe}" aria-label="Ver ordem dos traços" title="Ver ordem dos traços">✍️</button>`;
}

function wireStrokeButtons(container){
  container.querySelectorAll('.stroke-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openStrokeModal(btn.dataset.hanzi);
    });
  });
}

// ---------- "Já sei?" — marca um cartão de vocabulário como já dominado ----------
// Aplica o mesmo efeito de responder "Fácil" no SM-2 (empurra o intervalo bem pra
// frente), sem precisar passar pelos exercícios da unidade. Conforme decidido,
// isso também conta para fins de conclusão da unidade (soma-se aos cartões que
// já foram estudados via exercícios normais).
function wireKnowButtons(container){
  container.querySelectorAll('.know-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardId = btn.dataset.cardId;
      const card = STATE.cards.find(c => c.id === cardId);
      if (!card) return;

      if (card.reps > 0){
        // já estava marcado — permite desmarcar caso tenha sido engano
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
      renderUnitsGrid(); // atualiza contadores de progresso na trilha (se visitada depois)
    });
  });
}

// Só considera caracteres CJK reais (ignora pontuação e letras latinas que às
// vezes aparecem misturadas, como em "Brune" ou "！") — Hanzi Writer só sabe
// desenhar hanzi de fato.
function extractHanziChars(text){
  return Array.from(text).filter(ch => /[\u4e00-\u9fff]/.test(ch));
}

let strokeWriterInstances = [];

function openStrokeModal(hanziText){
  const chars = extractHanziChars(hanziText);
  const modal = document.getElementById('stroke-modal');
  const titleEl = document.getElementById('stroke-modal-title');
  const bodyEl = document.getElementById('stroke-modal-body');

  titleEl.textContent = `Ordem dos traços — ${hanziText}`;

  if (!HANZI_WRITER_SUPPORTED){
    bodyEl.innerHTML = `<p class="stroke-unavailable">Não foi possível carregar o recurso de traços agora. Verifique sua conexão e tente novamente.</p>`;
    modal.style.display = 'flex';
    return;
  }

  if (!chars.length){
    bodyEl.innerHTML = `<p class="stroke-unavailable">Esta palavra não tem caracteres chineses para desenhar.</p>`;
    modal.style.display = 'flex';
    return;
  }

  // Limpa instâncias anteriores (evita acúmulo de listeners/memória entre aberturas)
  strokeWriterInstances = [];
  bodyEl.innerHTML = chars.map((ch, i) => `
    <div class="stroke-char-block">
      <div class="stroke-char-target" id="stroke-target-${i}"></div>
      <button class="btn btn-secondary stroke-replay-btn" data-idx="${i}">🔄 Repetir animação</button>
    </div>
  `).join('');

  chars.forEach((ch, i) => {
    try{
      const writer = HanziWriter.create(`stroke-target-${i}`, ch, {
        width: 160,
        height: 160,
        padding: 12,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        showOutline: true,
        strokeColor: '#8E1915',
        outlineColor: '#E2CFA6',
        radicalColor: '#D4A017'
      });
      strokeWriterInstances.push(writer);
      writer.animateCharacter();
    }catch(e){
      document.getElementById(`stroke-target-${i}`).innerHTML =
        `<p class="stroke-unavailable">Não foi possível desenhar "${ch}".</p>`;
    }
  });

  bodyEl.querySelectorAll('.stroke-replay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      strokeWriterInstances[idx]?.animateCharacter();
    });
  });

  modal.style.display = 'flex';
}

document.getElementById('stroke-modal-close').addEventListener('click', () => {
  document.getElementById('stroke-modal').style.display = 'none';
});
document.getElementById('stroke-modal').addEventListener('click', (e) => {
  if (e.target.id === 'stroke-modal'){
    document.getElementById('stroke-modal').style.display = 'none';
  }
});

// ---------- Construção do banco de cartões a partir do content.js ----------
// Cada cartão SRS = 1 item de vocabulário (frente: pinyin, verso: caractere + tradução)
function buildCardsFromUnits(units){
  const cards = [];
  units.forEach(u => {
    u.vocab.forEach((v, idx) => {
      cards.push({
        id: `u${u.id}-v${idx}`,
        unitId: u.id,
        unitTitle: u.title,
        type: 'vocab',
        front_pinyin: v.p,
        back_hanzi: v.c,
        back_trans: v.t,
        // SRS state (SM-2)
        ef: 2.5,
        interval: 0,
        reps: 0,
        due: 0, // timestamp; 0 = never studied, due immediately
        lapses: 0
      });
    });
  });
  return cards;
}

// Um cartão SRS por caractere (do banco completo de hanzi), reaproveitando a mesma estrutura de
// estado SM-2 do vocabulário — fila separada, mas mesmo motor de repetição.
function buildHanziCards(lessons){
  const cards = [];
  lessons.forEach((lesson, lessonIdx) => {
    lesson.forEach((char, charIdx) => {
      cards.push({
        id: `h${lessonIdx}-c${charIdx}`,
        lessonIndex: lessonIdx,
        type: 'hanzi',
        char: char.char,
        pinyin: char.pinyin,
        meaning: char.meaning,
        radicals: char.radicals,
        // SRS state (SM-2) — mesmos campos, mesmo algoritmo do vocabulário
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
  hanziCards: buildHanziCards(HANZI_LESSONS),
  unitProgress: {}, // unitId -> { started:bool, completed:bool }
  xp: 0,
  streak: 0,
  lastStudyDay: null, // 'YYYY-MM-DD'
  lastReviewReminderDay: null, // 'YYYY-MM-DD'
  activityLog: {}, // 'YYYY-MM-DD' -> contagem de respostas naquele dia (para o heatmap)
  hanziLessonProgress: {}, // lessonIndex -> { completed: bool }
  totalReviews: 0,
  currentUnitId: null,
  reviewQueue: [],
  reviewIndex: 0,
  reviewShowingAnswer: false,
  reviewSessionUnitFilter: null, // if set, review only this unit's cards
  hanziReviewQueue: [],
  hanziReviewIndex: 0,
  hanziReviewShowingAnswer: false,
  daily: {
    date: null, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
    hanziLessons: 0, reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0
  }
};

UNITS.forEach((u,i) => {
  STATE.unitProgress[u.id] = { started:false, completed:false, unlocked: i===0 };
});

HANZI_LESSONS.forEach((lesson, i) => {
  STATE.hanziLessonProgress[i] = { completed:false, unlocked: i===0 };
});

// ---------- Supabase: conexão, autenticação e persistência na nuvem ----------
const SUPABASE_URL = 'https://eigjocalzwamisgqilhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZ2pvY2FsendhbWlzZ3FpbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjYzNjksImV4cCI6MjEwMjUwMjM2OX0.EyW4vyQcFL2vrBoo-rpLD5J8LNBT3aSEJREZTSqzHVU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sessão atual: null enquanto não resolvido, false = "sem conta" (modo convidado), objeto = usuário logado
let CURRENT_USER = null;
const GUEST_MODE_FLAG = 'mandarim_guest_mode';

// ---------- Toggle global de pinyin (forçar leitura só em hanzi) ----------
const PINYIN_TOGGLE_KEY = 'mandarim_hide_pinyin';

function applyPinyinVisibility(hidden){
  document.body.classList.toggle('hide-pinyin', hidden);
  document.getElementById('pinyin-toggle-btn').classList.toggle('active', hidden);
}

function loadPinyinPreference(){
  let hidden = false;
  try{
    hidden = window.localStorage.getItem(PINYIN_TOGGLE_KEY) === '1';
  }catch(e){ /* localStorage indisponível: mantém padrão visível */ }
  applyPinyinVisibility(hidden);
}

document.getElementById('pinyin-toggle-btn').addEventListener('click', () => {
  const nowHidden = !document.body.classList.contains('hide-pinyin');
  applyPinyinVisibility(nowHidden);
  try{
    window.localStorage.setItem(PINYIN_TOGGLE_KEY, nowHidden ? '1' : '0');
  }catch(e){ /* silencioso: preferência só não persiste entre sessões */ }
});

loadPinyinPreference();

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

// sessionStorage pode não existir em todo ambiente de artifact; helper seguro
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
const THEME_STORAGE_KEY = 'mandarim_theme';

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
    // modo convidado: só volta pra tela de login
    sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
    CURRENT_USER = null;
    showLoginScreen();
  }
});

// ---------- Persistência: Supabase (usuário logado) ou memória local (convidado) ----------
const STORAGE_KEY = 'mandarim_zero_state_v1';
// Esta tabela `progress` passou a ser compartilhada com o Francês do Zero (mesmo
// Supabase, mesma linha por user_id). Cada app guarda seu estado sob sua própria
// chave dentro da coluna `data` para não sobrescrever o progresso do outro app.
const APP_KEY = 'mandarim';
let saveInFlight = false;
let savePending = false;

async function saveState(){
  // Modo convidado: não há onde persistir além da memória da aba atual (avisado na UI).
  if (!CURRENT_USER) return;

  if (saveInFlight){ savePending = true; return; }
  saveInFlight = true;

  try{
    const payload = serializeState();
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
  if (!CURRENT_USER) return; // convidado: fica só com o estado inicial em memória

  try{
    const { data, error } = await supabaseClient
      .from('progress')
      .select('data')
      .eq('user_id', CURRENT_USER.id)
      .maybeSingle();

    if (error){ console.error('Erro ao carregar progresso:', error); return; }
    if (data && data.data && data.data[APP_KEY]){
      applySerializedState(data.data[APP_KEY]);
    }else if (data && data.data && (data.data.hanziCards || data.data.cards)){
      // Formato antigo (salvo antes de existir o namespacing por app): é o
      // próprio estado do Mandarim do Zero, salvo direto na raiz do JSON.
      applySerializedState(data.data);
    }
  }catch(e){
    console.error('Erro ao carregar progresso:', e);
  }
}

function serializeState(){
  return {
    cards: STATE.cards,
    hanziCards: STATE.hanziCards,
    unitProgress: STATE.unitProgress,
    xp: STATE.xp,
    streak: STATE.streak,
    lastStudyDay: STATE.lastStudyDay,
    lastReviewReminderDay: STATE.lastReviewReminderDay,
    activityLog: STATE.activityLog,
    hanziLessonProgress: STATE.hanziLessonProgress,
    totalReviews: STATE.totalReviews,
    daily: STATE.daily
  };
}

function applySerializedState(data){
  if (!data) return;
  if (data.cards) {
    // merge by id to survive content updates
    const byId = {};
    data.cards.forEach(c => byId[c.id] = c);
    STATE.cards.forEach(c => { if (byId[c.id]) Object.assign(c, byId[c.id]); });
  }
  if (data.hanziCards) {
    const byId = {};
    data.hanziCards.forEach(c => byId[c.id] = c);
    STATE.hanziCards.forEach(c => { if (byId[c.id]) Object.assign(c, byId[c.id]); });
  }
  if (data.unitProgress) Object.assign(STATE.unitProgress, data.unitProgress);
  if (typeof data.xp === 'number') STATE.xp = data.xp;
  if (typeof data.streak === 'number') STATE.streak = data.streak;
  if (data.lastStudyDay) STATE.lastStudyDay = data.lastStudyDay;
  if (data.lastReviewReminderDay) STATE.lastReviewReminderDay = data.lastReviewReminderDay;
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (data.hanziLessonProgress) Object.assign(STATE.hanziLessonProgress, data.hanziLessonProgress);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.daily) Object.assign(STATE.daily, data.daily);
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
    // Errou: reseta repetições, intervalo curto, aumenta lapses
    card.reps = 0;
    card.interval = 0;
    card.lapses += 1;
    card.ef = Math.max(1.3, card.ef - 0.2);
    card.due = now + (10*60*1000); // reaparece em 10 min (mesma sessão)
    return;
  }

  // Ajuste do EF conforme qualidade da resposta (mapeando 1/2/3 -> escala 0-5 do SM-2 original)
  const qMap = { 1: 3, 2: 4, 3: 5 }; // difícil~3, bom~4, fácil~5
  const q = qMap[grade];
  card.ef = Math.max(1.3, card.ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02)));

  card.reps += 1;

  // Registra a data da primeira vez que essa palavra foi efetivamente
  // aprendida (reps saindo de 0) — usado no gráfico de progresso acumulado.
  if (card.reps === 1 && !card.firstLearnedDate){
    card.firstLearnedDate = todayStr();
  }

  if (card.reps === 1){
    card.interval = grade === 1 ? 1 : (grade === 2 ? 1 : 3);
  } else if (card.reps === 2){
    card.interval = grade === 1 ? 3 : (grade === 2 ? 6 : 8);
  } else {
    let base = card.interval * card.ef;
    if (grade === 1) base = card.interval * 1.2; // difícil: cresce pouco
    if (grade === 3) base = card.interval * card.ef * 1.3; // fácil: bônus
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

  // Histórico de atividade por dia (para o heatmap de progresso) — conta
  // quantas respostas de exercício/revisão aconteceram em cada dia.
  STATE.activityLog[today] = (STATE.activityLog[today] || 0) + 1;

  if (STATE.lastStudyDay === today) return; // streak já contabilizada hoje
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
// Aparece uma única vez por dia, na primeira atividade que ativa o streak —
// registerStudyToday() só chega até aqui na primeira chamada depois da
// virada do dia, então essa função nunca dispara duas vezes no mesmo dia.
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
// 3 desafios por dia, sorteados de 3 grupos fixos (mesma semente todo dia,
// pra não trocar sozinho se a tela for recarregada):
//   1. Fácil (EASY_CHALLENGES) — uma vitória rápida, garantida todo dia.
//   2. Revisão/Hanzi (REVISAO_HANZI_CHALLENGES) — sempre puxa o aluno pra
//      uma dessas abas, que ele não necessariamente abriria sozinho.
//   3. Geral (GENERAL_CHALLENGES) — mais variado, ligado à Trilha em geral.
function ensureDailyBucket(){
  const today = todayStr();
  if (STATE.daily.date !== today){
    STATE.daily = {
      date: today, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
      hanziLessons: 0, reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0
    };
  }
}

function registerDailyStars(amount){
  ensureDailyBucket();
  STATE.daily.stars += amount;
}
function registerDailyLessonCompleted(scorePct){
  ensureDailyBucket();
  STATE.daily.lessons += 1;
  if (scorePct >= 80) STATE.daily.highScoreLessons += 1;
  if (scorePct >= 100) STATE.daily.perfectLessons += 1;
}
function registerDailyHanziLesson(){
  ensureDailyBucket();
  STATE.daily.hanziLessons += 1;
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
const REVISAO_HANZI_CHALLENGES = [
  { id:'hanzi1', icon:'🈺', label:'Estude 1 lição de Hanzi', target:1, get: d => d.hanziLessons },
  { id:'reviews15', icon:'🔁', label:'Revise 15 cartões', target:15, get: d => d.reviewsDone },
  { id:'speedReview1', icon:'⚡', label:'Complete uma sessão de Revisão Rápida', target:1, get: d => d.speedReviewSessions },
  { id:'matchGame1', icon:'🧩', label:'Jogue o jogo de Combinar 1 vez', target:1, get: d => d.matchGamesPlayed }
];
const GENERAL_CHALLENGES = [
  { id:'stars40', icon:'⭐', label:'Ganhe 40 estrelas', target:40, get: d => d.stars },
  { id:'highscore2', icon:'📈', label:'Pontue mais de 80% em 2 lições', target:2, get: d => d.highScoreLessons },
  { id:'perfect1', icon:'🎯', label:'Complete uma lição sem errar', target:1, get: d => d.perfectLessons },
  { id:'lessons5', icon:'📚', label:'Complete 5 lições', target:5, get: d => d.lessons },
  { id:'hanzi2', icon:'🈺', label:'Estude 2 lições de Hanzi', target:2, get: d => d.hanziLessons }
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
    pickDailyFromPool(REVISAO_HANZI_CHALLENGES, 'revcon'),
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
  { id:'streak_7', name:'Uma Semana!', icon:'⛩️', check: s => s.streak >= 7 },
  { id:'unit_1', name:'Unidade 1 Completa', icon:'📖', check: s => s.unitProgress[1]?.completed },
  { id:'unit_7', name:'Metade do Caminho', icon:'🏮', check: s => Object.values(s.unitProgress).filter(u=>u.completed).length >= Math.ceil(UNITS.length/2) },
  { id:'unit_14', name:'HSK 1 Completo', icon:'🐉', check: s => Object.values(s.unitProgress).filter(u=>u.completed).length >= UNITS.length },
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

function recalculateUnlockedUnits(){
  UNITS.forEach((u, i) => {
    const prog = STATE.unitProgress[u.id];
    prog.unlocked = i === 0 || STATE.unitProgress[UNITS[i-1].id]?.completed || prog.unlocked;
  });
}

// Ícones temáticos por unidade — substituem o número na trilha, dando
// reconhecimento visual imediato do assunto de cada unidade.
const UNIT_ICONS = {
  1: '👋', 2: '🙋', 3: '🔢', 4: '👨‍👩‍👧', 5: '🍜',
  6: '⏰', 7: '🗺️', 8: '🛍️', 9: '⛅', 10: '🚇',
  11: '🩺', 12: '🎨', 13: '🗓️', 14: '⚖️', 15: '🎬',
  16: '📅', 17: '✅', 18: '❓'
};

function renderUnitsGrid(){
  recalculateUnlockedUnits();
  const grid = document.getElementById('units-grid');
  grid.innerHTML = '';
  UNITS.forEach((u, i) => {
    const prog = STATE.unitProgress[u.id];
    const unlocked = prog.unlocked;
    const { total, learned, dueForReview } = unitCardCounts(u.id);
    const pct = total ? Math.round((learned/total)*100) : 0;
    const reviewLabel = dueForReview > 0 ? `🔁 ${dueForReview} a revisar` : '';

    const card = document.createElement('button');
    card.className = 'unit-card' + (!unlocked ? ' locked' : '') + (prog.completed ? ' done' : '') + (unlocked && !prog.completed && learned>0 ? ' current' : '');
    card.innerHTML = `
      <div class="unit-icon-wrap">
        <div class="unit-icon">${UNIT_ICONS[u.id] || '📖'}</div>
        <div class="unit-badge">${prog.completed ? '✓' : u.id}</div>
      </div>
      <div class="unit-title">${u.title}</div>
      <div class="unit-progress-bar"><div class="unit-progress-fill" style="width:${pct}%"></div></div>
      <div class="unit-meta"><span>${reviewLabel}</span><span>${pct}%</span></div>
    `;
    if (unlocked){
      card.addEventListener('click', () => openUnitDetail(u.id));
    }
    grid.appendChild(card);
  });
}

// ============================================================
// LIÇÃO EM PASSOS (Vocabulário → Exercícios → Frases → Diálogo)
// ============================================================
const STEP_DEFS = [
  { key: 'vocab', label: 'Vocabulário' },
  { key: 'dialogue', label: 'Diálogo' },
  { key: 'usage', label: 'Dica de uso' },
  { key: 'exercises', label: 'Exercícios' }
];

const STEP_STATE = {
  currentStep: 0,
  vocabIndex: 0,
  vocabUnitId: null,
  exerciseList: [],
  exerciseIndex: 0,
  exerciseScore: 0,
  exerciseAnswered: false,
  onChallengesScreen: false
};

function openUnitDetail(unitId){
  STATE.currentUnitId = unitId;
  STATE.unitProgress[unitId].started = true;
  STEP_STATE.onChallengesScreen = false;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';

  const u = UNITS.find(x => x.id === unitId);
  document.getElementById('ud-eyebrow').textContent = `Unidade ${u.id} de ${UNITS.length}`;
  document.getElementById('ud-title').textContent = u.title;
  document.getElementById('ud-goal').textContent = u.goal;

  const notesBtn = document.getElementById('unit-notes-btn');
  const hasNotes = GRAMMAR_NOTES[unitId] && GRAMMAR_NOTES[unitId].length > 0;
  notesBtn.style.display = hasNotes ? 'inline-flex' : 'none';

  STEP_STATE.currentStep = 0;
  renderStep();

  saveState();
  renderTopbarStats();
}

document.getElementById('back-to-path').addEventListener('click', () => {
  STEP_STATE.onChallengesScreen = false;
  setLessonFocusMode(false);
  document.getElementById('path-list-wrap').style.display = 'block';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  renderUnitsGrid();
});

// ============================================================
// MANUAL DE APOIO (resumo por unidade + aba geral)
// ============================================================

// Gera o HTML de resumo de uma unidade (vocabulário + frases + diálogo,
// sem exercícios) — usado no modal "Manual da unidade" (📖 dentro do painel
// de dicas de cada lição).
function renderUnitSummaryHTML(u){
  const vocabHTML = u.vocab.map(v => `
    <div class="vocab-row vocab-row-readonly">
      <div class="pinyin">${v.p}</div>
      <div class="hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>
      <div class="trans">${v.t}</div>
    </div>
  `).join('');

  const phrasesHTML = u.phrases.map(p => `
    <div class="phrase-item">
      <div class="pinyin">${p.p}</div>
      <div class="hanzi">${p.c} ${audioBtnHTML(p.c)}</div>
      <div class="trans">${p.t}</div>
    </div>
  `).join('');

  const dialogueHTML = `<div class="dialogue-title">${u.dialogue.title}</div>` +
    u.dialogue.lines.map(l => `
      <div class="dialogue-line">
        <div class="dialogue-spk">${l.spk}</div>
        <div class="dialogue-content">
          <div class="hanzi">${l.c} ${audioBtnHTML(l.c)}</div>
          <div class="pinyin">${l.p}</div>
          <div class="trans">${l.t}</div>
        </div>
      </div>
    `).join('');

  return `
    <div class="section-label">Vocabulário</div>
    <div class="vocab-table">${vocabHTML}</div>
    <div class="section-label">Frases-modelo</div>
    <div class="phrase-list">${phrasesHTML}</div>
    <div class="section-label">Diálogo</div>
    <div class="dialogue-box">${dialogueHTML}</div>
  `;
}

// ---------- Modal: manual da unidade atual ----------
document.getElementById('unit-manual-btn').addEventListener('click', () => {
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  document.getElementById('unit-manual-title').textContent = `Manual — Unidade ${u.id}: ${u.title}`;
  const bodyEl = document.getElementById('unit-manual-body');
  bodyEl.innerHTML = renderUnitSummaryHTML(u);
  wireAudioButtons(bodyEl);
  wireStrokeButtons(bodyEl);
  document.getElementById('unit-manual-modal').style.display = 'flex';
});

document.getElementById('unit-manual-close').addEventListener('click', () => {
  document.getElementById('unit-manual-modal').style.display = 'none';
});
document.getElementById('unit-manual-modal').addEventListener('click', (e) => {
  if (e.target.id === 'unit-manual-modal'){
    document.getElementById('unit-manual-modal').style.display = 'none';
  }
});

// ---------- Modal: Dicas e Notas (explicações gramaticais) ----------
function renderNotesListHTML(unitId){
  const notes = GRAMMAR_NOTES[unitId] || [];
  return `
    <div class="notes-list">
      ${notes.map((note, i) => `
        <button class="notes-list-item" data-note-idx="${i}">
          <span class="note-title">${note.title}</span>
          <span class="note-arrow">→</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderNoteDetailHTML(note){
  const tableRows = note.table.map(row => {
    if (row.label){
      // Linha de tabela de contraste (com rótulo extra, ex: "Presente/futuro (不)")
      return `<tr><td class="label-cell">${row.label}</td><td>${row.pt}<br><span style="color:var(--seal-red-dark); font-weight:700;">${row.cn}</span></td></tr>`;
    }
    return `<tr><td>${row.pt}</td><td>${row.cn}</td></tr>`;
  }).join('');

  const hasLabels = note.table.some(r => r.label);

  return `
    <button class="back-link" id="notes-back-to-list">← Voltar às notas</button>
    <h3 style="margin:12px 0 14px; font-size:19px;">${note.title}</h3>
    <div class="note-detail-explanation">${note.explanation}</div>
    <table class="note-detail-table">
      <thead><tr>${hasLabels ? '<th></th>' : ''}<th>Português</th><th>Chinês</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="note-detail-example">
      <div class="note-detail-example-label">Exemplo do seu curso</div>
      <div class="hanzi">${note.courseExample.c} ${audioBtnHTML(note.courseExample.c)}</div>
      <div class="pinyin">${note.courseExample.p}</div>
      <div class="trans">${note.courseExample.t}</div>
    </div>
  `;
}

function openNotesModal(){
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  document.getElementById('notes-modal-title').textContent = `Dicas e Notas — Unidade ${u.id}`;
  const bodyEl = document.getElementById('notes-modal-body');
  bodyEl.innerHTML = renderNotesListHTML(u.id);
  wireNotesListItems(bodyEl, u.id);
  document.getElementById('notes-modal').style.display = 'flex';
}

function wireNotesListItems(bodyEl, unitId){
  bodyEl.querySelectorAll('.notes-list-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.noteIdx);
      const note = GRAMMAR_NOTES[unitId][idx];
      bodyEl.innerHTML = renderNoteDetailHTML(note);
      wireAudioButtons(bodyEl);
      document.getElementById('notes-back-to-list').addEventListener('click', () => {
        bodyEl.innerHTML = renderNotesListHTML(unitId);
        wireNotesListItems(bodyEl, unitId);
      });
    });
  });
}

document.getElementById('unit-notes-btn').addEventListener('click', openNotesModal);

document.getElementById('notes-modal-close').addEventListener('click', () => {
  document.getElementById('notes-modal').style.display = 'none';
});
document.getElementById('notes-modal').addEventListener('click', (e) => {
  if (e.target.id === 'notes-modal'){
    document.getElementById('notes-modal').style.display = 'none';
  }
});


function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const pct = (STEP_STATE.currentStep / (STEP_DEFS.length - 1)) * 100;
  fillEl.style.width = `${pct}%`;
}

// ---------- Modo foco de lição (estilo Busuu) ----------
// Esconde topbar/tabs enquanto o aluno está numa lição — só a barra de
// progresso, o ícone de dicas e o X ficam visíveis por cima do exercício.
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
// Mostra uma palavra de cada vez, junto da frase-modelo que a usa (quando
// existe uma correspondência direta no banco de conteúdo) — em vez da lista
// completa de uma vez, e sem depender de um passo "Frases" separado.
function findMatchingPhrase(word, unit){
  return unit.phrases.find(p => p.c.includes(word.c)) || null;
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
      <div class="vocab-phrase-pinyin">${matchingPhrase.p}</div>
      <div class="vocab-phrase-hanzi">${matchingPhrase.c} ${audioBtnHTML(matchingPhrase.c)}</div>
      <div class="vocab-phrase-trans">${matchingPhrase.t}</div>
    </div>
  ` : '';

  contentEl.innerHTML = `
    <div class="vocab-card-counter">Palavra ${idx + 1} de ${total}</div>
    <div class="vocab-card">
      <div class="vocab-card-pinyin">${v.p}</div>
      <div class="vocab-card-hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>
      <div class="vocab-card-trans">${v.t}</div>
      <button class="know-btn ${alreadyKnown ? 'known' : ''}" data-card-id="${cardId}" title="Marcar como já sei">
        ${alreadyKnown ? '✓ Já sei' : 'Já sei?'}
      </button>
    </div>
    ${phraseHTML}
  `;

  wireAudioButtons(contentEl);
  wireStrokeButtons(contentEl);
  wireKnowButtons(contentEl);

  // Áudio automático da palavra principal — toca ao entrar na tela e também
  // toda vez que avança pra próxima palavra (não toca o áudio da frase-exemplo,
  // só o da palavra em foco).
  if (TTS.voice){
    const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
    speakChinese(v.c, mainAudioBtn);
  }

  nextBtn.style.display = 'flex';
  nextBtn.textContent = idx < total - 1 ? 'Próxima palavra →' : 'Continuar →';
}

function renderStep(){
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepKey = STEP_DEFS[STEP_STATE.currentStep].key;
  const contentEl = document.getElementById('step-content');
  const backBtn = document.getElementById('step-back-btn');
  const nextBtn = document.getElementById('step-next-btn');

  renderStepProgress();
  const showBack = STEP_STATE.currentStep > 0 || (stepKey === 'vocab' && STEP_STATE.vocabIndex > 0);
  backBtn.style.display = showBack ? 'inline-flex' : 'none';

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
    nextBtn.style.display = 'none'; // navegação própria do exercício controla o avanço

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
            <div class="hanzi">${l.c} ${audioBtnHTML(l.c)}</div>
            <div class="pinyin">${l.p}</div>
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
  const stepKey = STEP_DEFS[STEP_STATE.currentStep].key;

  // No passo de vocabulário, "Voltar" recua palavra a palavra antes de sair
  // do passo — só volta para o passo anterior da unidade quando já está na
  // primeira palavra.
  if (stepKey === 'vocab' && STEP_STATE.vocabIndex > 0){
    STEP_STATE.vocabIndex -= 1;
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

  const stepKey = STEP_DEFS[STEP_STATE.currentStep].key;

  // No passo de vocabulário, o botão "Continuar" navega palavra a palavra
  // antes de avançar para o próximo passo da unidade — delega para a função
  // dedicada em vez de pular direto de passo.
  if (stepKey === 'vocab'){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    if (STEP_STATE.vocabIndex < u.vocab.length - 1){
      STEP_STATE.vocabIndex += 1;
      renderStep();
      return;
    }
    // última palavra vista: cai para a lógica normal de avanço de passo, abaixo
  }

  if (STEP_STATE.currentStep < STEP_DEFS.length - 1){
    STEP_STATE.currentStep += 1;
    renderStep();
  } else {
    // último passo concluído: marca a unidade e mostra os desafios de hoje
    // antes de voltar pra trilha (mesmo fluxo do Francês do Zero).
    const total = STEP_STATE.exerciseList.length;
    const scorePct = total ? Math.round((STEP_STATE.exerciseScore / total) * 100) : 100;
    markUnitCompleted(STATE.currentUnitId, scorePct);
    STEP_STATE.onChallengesScreen = true;
    renderDailyChallengesScreen();
  }
});

// ---------- Geração dos exercícios (múltipla escolha + ordenar, estilo Memrise) ----------
// Pensado para iniciante absoluto: a pergunta SEMPRE mostra pinyin + hanzi juntos
// (apoio total de leitura), e pede a tradução em português como resposta — nunca
// o inverso. Isso evita pedir reconhecimento de hanzi de memória, o que é cedo
// demais nesta fase, e evita repetir o mesmo pinyin na pergunta e nas opções
// (o que tornava a resposta óbvia sem precisar saber o significado).
//
// Exercícios de vocabulário (meaning/listen) e de ordenar frase (reorder) são
// gerados separadamente e depois embaralhados juntos numa única sequência.
function buildExerciseSet(unit){
  const vocabFormats = ['meaning', 'meaning', 'listen'];
  const pool = unit.vocab;

  const vocabExercises = pool.map((item, i) => {
    const format = vocabFormats[i % vocabFormats.length];
    const distractors = shuffle(pool.filter(v => v !== item)).slice(0, 3);
    const options = shuffle([item, ...distractors]);
    return { format, item, options };
  });

  // Só frases com blocks definidos entram como exercício de ordenar — proteção
  // defensiva caso alguma frase futura seja adicionada sem essa segmentação.
  const reorderExercises = (unit.phrases || [])
    .filter(p => p.blocks && p.blocks.length >= 2)
    .map(p => ({ format: 'reorder', phrase: p, shuffledBlocks: shuffle(p.blocks) }));

  const trueFalseExercises = (unit.trueFalseExercises || []).map(tf => ({ format: 'trueFalse', ...tf }));

  return shuffle([...vocabExercises, ...reorderExercises, ...trueFalseExercises]);
}

// ---------- Tela final "Parabéns" (estilo Busuu) ----------
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
              <div class="lesson-recap-french">${audioBtnHTML(item.c)}<span>${item.c}</span><span class="lesson-recap-pinyin">${item.p}</span></div>
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

  if (ex.format === 'reorder'){
    renderReorderExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'trueFalse'){
    renderTrueFalseExercise(ex, contentEl, nextBtn, total);
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
        <div class="prompt-hanzi">${ex.item.c}</div>
        <div class="prompt-pinyin">${ex.item.p}</div>
        ${audioBtnHTML(ex.item.c)}
      </div>
    `;
  } else if (ex.format === 'listen'){
    promptHTML = `
      <div class="exercise-prompt-label">Ouça e escolha o significado certo</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(ex.item.c, 'audio-btn-lg')}
        <div class="prompt-audio-hint">toque para ouvir de novo</div>
      </div>
    `;
  }

  // Opções sempre em português — nunca pedimos reconhecer hanzi ou pinyin
  // sozinhos nesta fase, só o significado, que é o que dá pra saber de fato
  // enquanto o vocabulário ainda está sendo formado.
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

  // auto-toca o áudio no formato "listen"
  wireAudioButtons(contentEl);
  if (ex.format === 'listen' && TTS.voice){
    speakChinese(ex.item.c, contentEl.querySelector('.audio-btn-lg'));
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

  // "Não sei": pula sem chutar, sempre conta como não acertado, mas sem o
  // desgaste de marcar uma opção errada — igual ao comportamento do Memrise.
  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    revealAnswer(-1);
  });
}

// ---------- Exercício de verdadeiro ou falso (uso real, não tradução) ----------
// Mostra uma palavra/frase já ensinada e uma afirmação em português sobre
// QUANDO/COMO ela é usada na vida real; o aluno julga se é verdadeira ou falsa.
function renderTrueFalseExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="tf-scene">
        <div class="tf-scene-emoji">${ex.emoji || '💬'}</div>
        <div class="tf-subject">${ex.subject}</div>
        <div class="tf-pinyin">${ex.pinyin || ''}</div>
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

// ---------- Exercício de ordenar palavras (reorder) ----------
// A frase-modelo aparece embaralhada em blocos de pinyin (com hanzi como apoio
// visual abaixo de cada bloco). Toca nos blocos na ordem certa para reconstruir
// a frase. Foco na ordem gramatical, não em reconhecer hanzi isolado.
function renderReorderExercise(ex, contentEl, nextBtn, total){
  const correctOrder = ex.phrase.blocks;
  const chosenSequence = []; // índices (no array shuffledBlocks) já escolhidos, em ordem

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
      return `<div class="reorder-slot filled" data-seq-pos="${i}"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`;
    }).join('');

    // Clicar num slot preenchido remove ele (e todos depois dele), permitindo corrigir
    slotsEl.querySelectorAll('.reorder-slot.filled').forEach(slot => {
      slot.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        const pos = parseInt(slot.dataset.seqPos);
        chosenSequence.splice(pos); // remove esse e tudo depois
        renderSlots();
        renderBlocks();
      });
    });
  }

  function renderBlocks(){
    blocksEl.innerHTML = ex.shuffledBlocks.map((block, i) => {
      const alreadyChosen = chosenSequence.includes(i);
      return `<button class="reorder-block ${alreadyChosen ? 'used' : ''}" data-block-idx="${i}" ${alreadyChosen ? 'disabled' : ''}>
        <div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div>
      </button>`;
    }).join('');

    blocksEl.querySelectorAll('.reorder-block:not(.used)').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        const blockIdx = parseInt(btn.dataset.blockIdx);
        chosenSequence.push(blockIdx);
        renderSlots();
        renderBlocks();

        // Frase completa: verifica automaticamente
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
      addXP(4); // ordenar frase vale um pouco mais que múltipla escolha simples
    }
    goToNextExercise();
  }

  renderSlots();
  renderBlocks();
  nextBtn.style.display = 'none';

  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    STEP_STATE.exerciseAnswered = true;
    // Mostra a ordem certa nos slots, sem contar como tentativa errada visível
    slotsEl.innerHTML = correctOrder.map(block =>
      `<div class="reorder-slot filled correct"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`
    ).join('');
    blocksEl.querySelectorAll('.reorder-block').forEach(b => b.classList.add('disabled'));
    document.getElementById('exercise-dontknow-btn').classList.add('disabled');
    goToNextExercise();
  });
}

// RENDER: Revisão (SRS)
// ============================================================
// ---------- Speed Review (estilo Memrise) ----------
// Múltipla escolha contra o relógio, 3 corações, pontuação maior quanto mais
// rápido. Usa o mesmo pool de cartões "due" da revisão normal (vocabulário),
// mas sem aplicar SM-2 — é um modo de prática/jogo, não substitui o SRS.
const SPEED_TIME_LIMIT = 6000; // ms por pergunta
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
  // Usa vocabulário já estudado (mesma regra da revisão geral: só unidades
  // iniciadas), priorizando os que já têm alguma repetição — não faz sentido
  // testar em velocidade uma palavra nunca vista.
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

// ---------- Tela de seleção de modo de revisão (cards com contagem, estilo Memrise) ----------
function eligibleReviewPool(){
  // Mesma regra já usada: só cartões de unidades já iniciadas.
  return STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started);
}

function hardWordsPool(){
  // "Palavras difíceis": já estudadas ao menos uma vez e com histórico de erro
  // (lapses >= 2) — não é sobre estar "devido" agora, é sobre ser
  // historicamente complicada pra você.
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
  SPEED_STATE.active = false;
  document.getElementById('review-mode-select-wrap').style.display = 'block';
  document.getElementById('review-session-wrap').style.display = 'none';
  renderReviewModeSelect();
});

// ---------- Combinar: jogo de pares (hanzi <-> tradução) ----------
// Pool: vocabulário já estudado ao menos uma vez (mesma regra do Speed
// Review) — não faz sentido pedir pra combinar uma palavra nunca vista.
const MATCH_STATE = {
  pairs: [],
  tiles: [],
  selected: null,
  matchedCount: 0,
  attempts: 0,
  busy: false
};

function startMatchGame(){
  const pool = shuffle(STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started && c.reps > 0));
  const pairCount = Math.min(6, pool.length);
  MATCH_STATE.pairs = pool.slice(0, pairCount);
  MATCH_STATE.tiles = shuffle([
    ...MATCH_STATE.pairs.map(c => ({ cardId: c.id, side: 'front', text: c.back_hanzi })),
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
      <div class="hanzi">${card.back_hanzi}</div>
      <div class="pinyin">${card.front_pinyin}</div>
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

  runSpeedTimer(el, () => answerSpeedQuestion(false, el)); // tempo esgotado = errou
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
    // Pontuação recompensa velocidade: quanto menos tempo passou, mais pontos.
    const speedBonus = Math.max(10, Math.round(100 * (1 - elapsed / SPEED_TIME_LIMIT)));
    SPEED_STATE.score += speedBonus;
    SPEED_STATE.streak += 1;
    if (SPEED_STATE.streak > 0 && SPEED_STATE.streak % 15 === 0 && SPEED_STATE.hearts < 3){
      SPEED_STATE.hearts += 1; // vida extra a cada 15 acertos seguidos
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
    // Revisão geral: só cartões de unidades que você já começou a estudar.
    // Sem esse filtro, cartões de unidades nunca vistas entravam na fila
    // (todo cartão novo tem due=0, que sempre conta como "vencido"), fazendo
    // você errar por nunca ter visto a palavra, não por dificuldade real.
    : STATE.cards.filter(c => STATE.unitProgress[c.unitId]?.started);

  const due = cardsDueNow(pool);
  // Prioriza: due for review first, then new cards (limited batch of 10 new to avoid overload)
  let queue = due.slice();
  if (!STATE.reviewSessionUnitFilter){
    const fresh = newCards(pool).slice(0, 10);
    fresh.forEach(c => { if (!queue.includes(c)) queue.push(c); });
  } else {
    // studying a specific unit: include all its cards not yet due-separated
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
        <div class="big-emoji">🍵</div>
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
      <div class="flashcard-pinyin">${card.front_pinyin}</div>
      ${STATE.reviewShowingAnswer ? `
        <div class="divider-line"></div>
        <div class="flashcard-hanzi">${card.back_hanzi} ${audioBtnHTML(card.back_hanzi, 'audio-btn-lg')}</div>
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

  if (STATE.reviewShowingAnswer){
    el.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gradeCurrentCard(parseInt(btn.dataset.grade));
      });
    });
    wireAudioButtons(el);
    // Toca automaticamente ao revelar a resposta — reforço auditivo imediato.
    // Só dispara se já houver voz chinesa disponível, pra não repetir o aviso
    // de "instale a voz" a cada cartão de uma sessão inteira.
    if (TTS.voice){
      speakChinese(card.back_hanzi, el.querySelector('.audio-btn-lg'));
    }
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
    // "Errei" volta pro fim da fila da sessão atual em vez de sumir
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
  const idx = UNITS.findIndex(u => u.id === unitId);
  if (idx >= 0 && idx+1 < UNITS.length){
    STATE.unitProgress[UNITS[idx+1].id].unlocked = true;
  }
  addXP(25);
  registerStudyToday();
  if (typeof scorePct === 'number'){
    registerDailyStars(lessonStars(scorePct));
    registerDailyLessonCompleted(scorePct);
  }
  showToast(`Unidade concluída! 🏮`);
  saveState();
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
// Soma vocabulário + hanzi por data de "primeira vez aprendida" (firstLearnedDate),
// acumulando dia a dia, para mostrar a curva de crescimento do vocabulário total.
function renderProgressLineChart(){
  const wrap = document.getElementById('progress-line-chart-wrap');
  if (!wrap) return;

  const allCards = [...STATE.cards, ...STATE.hanziCards];
  const learnedDates = allCards.filter(c => c.firstLearnedDate).map(c => c.firstLearnedDate);

  if (!learnedDates.length){
    wrap.innerHTML = `<div class="manual-empty" style="padding:30px 20px;"><p>Comece a estudar para ver seu progresso ao longo do tempo aqui.</p></div>`;
    return;
  }

  // Conta quantas palavras foram aprendidas em cada dia, depois ordena por data
  const countByDate = {};
  learnedDates.forEach(d => { countByDate[d] = (countByDate[d] || 0) + 1; });
  const sortedDates = Object.keys(countByDate).sort();

  // Constrói a curva acumulada
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

  // Área preenchida sob a linha
  const areaD = pathD + ` L ${(PAD + (points.length-1)*xStep).toFixed(1)} ${H-PAD} L ${PAD} ${H-PAD} Z`;

  // Labels de data: mostra só início, meio e fim para não poluir
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
    <div class="chart-total">Total acumulado: <strong>${maxVal}</strong> palavras e caracteres aprendidos</div>
  `;
}

// ---------- Heatmap de atividade diária (estilo GitHub) ----------
// Mostra as últimas ~18 semanas em grade: colunas = semanas, linhas = dias da
// semana (dom-sáb). Intensidade da cor reflete quantas respostas você deu
// naquele dia (STATE.activityLog), igual ao gráfico de contribuições do GitHub.
function renderActivityHeatmap(){
  const wrap = document.getElementById('heatmap-wrap');
  const WEEKS = 18;
  const totalDays = WEEKS * 7;

  // Gera os últimos totalDays dias reais, terminando hoje.
  const realDays = [];
  for (let i = totalDays - 1; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const key = `${d.getFullYear()}-${mm}-${dd}`;
    realDays.push({ key, count: STATE.activityLog[key] || 0, date: d, dow: d.getDay() });
  }

  // Preenche com null nas duas pontas até alinhar em semanas completas de
  // domingo a sábado — sem isso, a última coluna ficaria torta (menos de 7
  // dias) sempre que "hoje" não caísse num sábado.
  const firstDow = realDays[0].dow;
  const lastDow = realDays[realDays.length-1].dow;
  const startPadding = Array.from({length: firstDow}, () => null);
  const endPadding = Array.from({length: 6 - lastDow}, () => null);
  const days = [...startPadding, ...realDays, ...endPadding];

  // Agrupa em semanas (colunas) de 7 dias cada
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
    stopSpeedTimer(); // evita timer do Speed Review rodando em background fora da aba
  }

  if (tab === 'review'){
    if (STATE.reviewSessionUnitFilter){
      // Veio de "Estudar esta unidade" na trilha — pula a tela de escolha,
      // vai direto pra sessão de flashcard filtrada por unidade.
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
  if (tab === 'hanzi'){ renderHanziLessonsGrid(); }
  if (tab === 'progress'){ renderProgressView(); }
  if (tab === 'path'){ renderUnitsGrid(); }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

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

// ============================================================
// EXPORTAÇÃO .apkg (formato real do Anki via sql.js + JSZip)
// ============================================================
let exportSelectedUnit = 'all';

function renderExportDeckSelect(){
  const wrap = document.getElementById('export-deck-select');
  const options = [{id:'all', label:'Todas as unidades'}].concat(
    UNITS.map(u => ({ id: String(u.id), label: `${u.id}. ${u.title}` }))
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
  // gera IDs no estilo epoch-ms usado pelo Anki
  return Date.now() + Math.floor(Math.random()*100000);
}

async function generateApkg(){
  const statusEl = document.getElementById('export-status');
  statusEl.textContent = 'Gerando arquivo...';
  statusEl.className = 'export-status';

  try{
    const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
    const db = new SQL.Database();

    // ---- Schema mínimo do Anki (col, notes, cards, graves, revlog) ----
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
      ? 'Mandarim do Zero - HSK 1'
      : `Mandarim do Zero - ${UNITS.find(u=>String(u.id)===exportSelectedUnit).title}`;

    const model = {
      [modelId]: {
        id: modelId, name: "Mandarim do Zero", type: 0, mod: now, usn: -1,
        sortf: 0, did: deckId,
        flds: [
          { name:"Pinyin", ord:0, font:"Arial", size:20 },
          { name:"Caractere", ord:1, font:"Arial", size:20 },
          { name:"Tradução", ord:2, font:"Arial", size:18 }
        ],
        tmpls: [
          {
            name: "Cartão 1", ord:0,
            qfmt: "<div style='text-align:center;font-size:22px;color:#8E1915;font-weight:bold;'>{{Pinyin}}</div>",
            afmt: "{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:36px;'>{{Caractere}}</div><div style='text-align:center;font-size:18px;color:#5C4A3F;'>{{Tradução}}</div>",
            bqfmt:"", bafmt:"", did: null
          }
        ],
        css: ".card { font-family: 'Nunito', Arial, sans-serif; text-align: center; background-color: #FBF4E8; color:#211714; }",
        latexPre: "", latexPost: "", latexsvg:false, req: [[0,"any",[0]]]
      }
    };

    const decks = {
      "1": { id:1, name:"Default", extendRev:50, usn:0, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], conf:1, desc:"", dyn:0 },
      [deckId]: { id:deckId, name: deckName, extendRev:50, usn:-1, collapsed:false, newToday:[0,0], revToday:[0,0], lrnToday:[0,0], timeToday:[0,0], conf:1, desc:"Exportado do app Mandarim do Zero", dyn:0 }
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

    // ---- Popula notes + cards a partir dos cartões do app ----
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
      // IDs únicos e crescentes: baseId + índice garante que nunca colidem,
      // mesmo exportando centenas de cartões na mesma chamada.
      const noteId = baseId + (i * 2);
      const cardId = baseId + (i * 2) + 1;
      const flds = [card.front_pinyin, card.back_hanzi, card.back_trans].join('\x1f');
      const sfld = card.front_pinyin;
      const csum = simpleChecksum(sfld);
      const guid = `mzc_${card.id}`;

      db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
        noteId, guid, modelId, now, usnCounter, `unidade${card.unitId} `, flds, sfld, csum, 0, ""
      ]);

      db.run(`INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        cardId, noteId, deckId, 0, now, usnCounter,
        0, 0, i, 0, 2500, 0, 0, 0, 0, 0, 0, ""
      ]);
    });

    db.run(`INSERT INTO graves SELECT -1, 0, 0 WHERE 0`); // no-op, keeps table valid

    const dbBytes = db.export();

    // ---- Empacota em .apkg (é um zip contendo collection.anki2 + media) ----
    const zip = new JSZip();
    zip.file("collection.anki2", dbBytes);
    zip.file("media", JSON.stringify({}));

    const blob = await zip.generateAsync({ type:"blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mandarim-do-zero-${exportSelectedUnit === 'all' ? 'completo' : 'unidade-'+exportSelectedUnit}.apkg`;
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
  // Anki usa os primeiros 8 dígitos do sha1 do campo — aqui usamos um hash simples
  // suficiente para não colidir dentro de um mesmo baralho pequeno.
  let hash = 0;
  for (let i=0;i<str.length;i++){
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100000000;
}

document.getElementById('export-btn').addEventListener('click', generateApkg);

// ============================================================
// HANZI — trilha de caracteres, estudo (ver→escrever) e teste final
// ============================================================
const HANZI_STUDY_STATE = {
  lessonIndex: null,
  phase: null, // 'char' (ver/escrever intercalado) ou 'test' (teste final misturado)
  charIndex: 0, // dentro da fase 'char': 0-4, cada um passa por 'view' e 'write'
  charSubPhase: 'view', // 'view' ou 'write'
  testQueue: [], // fase 'test': array embaralhado dos 5 (ou menos) caracteres
  testIndex: 0,
  testScore: 0,
  writerInstance: null
};

// ---------- Revisão SRS dedicada de Hanzi (mesmo motor SM-2, fila separada) ----------
// Só considera caracteres de lições já iniciadas (mesma regra usada para
// vocabulário: não traz caracteres de lições nunca abertas).
function startHanziReviewSession(){
  const pool = STATE.hanziCards.filter(c => {
    const lp = STATE.hanziLessonProgress[c.lessonIndex];
    return lp && (lp.unlocked || lp.completed);
  });

  const due = cardsDueNow(pool);
  let queue = due.slice();
  const fresh = newCards(pool).slice(0, 10);
  fresh.forEach(c => { if (!queue.includes(c)) queue.push(c); });

  STATE.hanziReviewQueue = shuffle(queue);
  STATE.hanziReviewIndex = 0;
  STATE.hanziReviewShowingAnswer = false;
  renderHanziReviewView();
}

function renderHanziReviewView(){
  const el = document.getElementById('hanzi-review-content');

  if (!STATE.hanziReviewQueue.length){
    const pool = STATE.hanziCards.filter(c => {
      const lp = STATE.hanziLessonProgress[c.lessonIndex];
      return lp && (lp.unlocked || lp.completed);
    });
    const allDue = cardsDueNow(pool).length;
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🈺</div>
        <h3>Tudo em dia!</h3>
        <p>${allDue > 0 ? `Você ainda tem ${allDue} caractere(s) pendente(s).` : 'Volte mais tarde para sua próxima revisão, ou avance para uma nova lição.'}</p>
      </div>
    `;
    return;
  }

  if (STATE.hanziReviewIndex >= STATE.hanziReviewQueue.length){
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🎉</div>
        <h3>Sessão concluída!</h3>
        <p>Você revisou ${STATE.hanziReviewQueue.length} caractere(s) nesta sessão.</p>
        <button class="btn btn-primary" id="hanzi-review-again">Voltar às lições</button>
      </div>
    `;
    document.getElementById('hanzi-review-again').addEventListener('click', () => {
      renderHanziLessonsGrid();
    });
    renderProgressView();
    return;
  }

  const card = STATE.hanziReviewQueue[STATE.hanziReviewIndex];
  const pct = Math.round((STATE.hanziReviewIndex / STATE.hanziReviewQueue.length) * 100);

  const radicalsHTML = (card.radicals && card.radicals.length)
    ? `<div class="hanzi-radicals">${card.radicals.map(r => `
        <div class="hanzi-radical-chip"><span class="r">${r.r}</span><span class="m">${r.m}</span></div>
      `).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="review-progress">
      <div class="review-progress-bar"><div class="review-progress-fill" style="width:${pct}%"></div></div>
      <div class="review-progress-count">${STATE.hanziReviewIndex+1} / ${STATE.hanziReviewQueue.length}</div>
    </div>
    <div class="flashcard" id="hanzi-flashcard">
      <div class="flashcard-tag">Lição ${card.lessonIndex + 1}</div>
      <div class="flashcard-hanzi">${card.char} ${audioBtnHTML(card.char, 'audio-btn-lg')}</div>
      ${STATE.hanziReviewShowingAnswer ? `
        <div class="divider-line"></div>
        <div class="flashcard-pinyin">${card.pinyin}</div>
        <div class="flashcard-trans">${card.meaning}</div>
        ${radicalsHTML}
      ` : `<div class="flashcard-hint">toque para ver pinyin e significado</div>`}
    </div>
    ${STATE.hanziReviewShowingAnswer ? `
      <div class="grade-buttons">
        <button class="grade-btn grade-again" data-grade="0">Errei<small>&lt;10min</small></button>
        <button class="grade-btn grade-hard" data-grade="1">Difícil<small>1-3d</small></button>
        <button class="grade-btn grade-good" data-grade="2">Bom<small>6-8d</small></button>
        <button class="grade-btn grade-easy" data-grade="3">Fácil<small>8d+</small></button>
      </div>
    ` : ''}
  `;

  wireAudioButtons(el);
  // No hanzi, o caractere já está visível na frente (diferente do vocabulário,
  // onde o hanzi só aparece no verso) — então tocamos o áudio desde o início,
  // não só ao revelar a resposta.
  if (TTS.voice){
    speakChinese(card.char, el.querySelector('.audio-btn-lg'));
  }

  document.getElementById('hanzi-flashcard').addEventListener('click', () => {
    if (!STATE.hanziReviewShowingAnswer){
      STATE.hanziReviewShowingAnswer = true;
      renderHanziReviewView();
    }
  });

  if (STATE.hanziReviewShowingAnswer){
    el.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gradeHanziCard(parseInt(btn.dataset.grade));
      });
    });
  }
}

function gradeHanziCard(grade){
  const card = STATE.hanziReviewQueue[STATE.hanziReviewIndex];
  applySM2(card, grade);
  STATE.totalReviews += 1;
  registerStudyToday();
  addXP(XP_PER_GRADE[grade]);

  if (grade === 0){
    STATE.hanziReviewQueue.push(card);
  }

  STATE.hanziReviewIndex += 1;
  STATE.hanziReviewShowingAnswer = false;
  saveState();
  renderTopbarStats();
  renderHanziReviewView();
}

document.getElementById('hanzi-review-all-btn').addEventListener('click', () => {
  document.getElementById('hanzi-lessons-wrap').style.display = 'none';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'none';
  document.getElementById('hanzi-review-wrap').style.display = 'block';
  startHanziReviewSession();
});

document.getElementById('hanzi-review-back-btn').addEventListener('click', () => {
  document.getElementById('hanzi-review-wrap').style.display = 'none';
  renderHanziLessonsGrid();
});

function recalculateHanziLocks(){
  HANZI_LESSONS.forEach((lesson, i) => {
    const prog = STATE.hanziLessonProgress[i];
    prog.unlocked = i === 0 || STATE.hanziLessonProgress[i-1]?.completed || prog.unlocked;
  });
}

function renderHanziLessonsGrid(){
  recalculateHanziLocks();
  document.getElementById('hanzi-lessons-wrap').style.display = 'block';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'none';

  const countLabel = document.getElementById('hanzi-count-label');
  if (countLabel){
    countLabel.textContent = `${HANZI_ALL.length} caracteres em ${HANZI_LESSONS.length} lições. Veja, escreva e teste sua memória.`;
  }

  const grid = document.getElementById('hanzi-lessons-grid');
  grid.innerHTML = '';

  HANZI_LESSONS.forEach((lesson, i) => {
    const prog = STATE.hanziLessonProgress[i];
    const card = document.createElement('button');
    card.className = 'hanzi-lesson-card' + (!prog.unlocked ? ' locked' : '') + (prog.completed ? ' done' : '');
    const preview = lesson.map(h => h.char).join('');
    card.innerHTML = `
      <div class="hanzi-lesson-num">${prog.completed ? '✓' : i+1}</div>
      <div class="hanzi-lesson-preview">${preview}</div>
      <div class="hanzi-lesson-status">${prog.completed ? 'Concluída' : (prog.unlocked ? `${lesson.length} caracteres` : '🔒')}</div>
    `;
    if (prog.unlocked){
      card.addEventListener('click', () => openHanziLesson(i));
    }
    grid.appendChild(card);
  });
}

document.getElementById('hanzi-back-to-lessons').addEventListener('click', () => {
  renderHanziLessonsGrid();
});

function openHanziLesson(lessonIndex){
  HANZI_STUDY_STATE.lessonIndex = lessonIndex;
  HANZI_STUDY_STATE.phase = 'char';
  HANZI_STUDY_STATE.charIndex = 0;
  HANZI_STUDY_STATE.charSubPhase = 'view';
  HANZI_STUDY_STATE.testQueue = [];
  HANZI_STUDY_STATE.testIndex = 0;
  HANZI_STUDY_STATE.testScore = 0;

  document.getElementById('hanzi-lessons-wrap').style.display = 'none';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'block';

  renderHanziStudyStep();
}

function currentHanziLesson(){
  return HANZI_LESSONS[HANZI_STUDY_STATE.lessonIndex];
}

// Busca automática: em quais palavras/frases do banco de conteúdo (todas as
// 14 unidades) esse caractere aparece. Não exige nenhum conteúdo novo — só
// varre o que já existe em UNITS.
function findHanziAppearances(char, limit){
  const results = [];
  UNITS.forEach(u => {
    u.vocab.forEach(v => {
      if (v.c.includes(char) && !results.some(r => r.c === v.c)){
        results.push({ p: v.p, c: v.c, t: v.t });
      }
    });
    u.phrases.forEach(p => {
      if (p.c.includes(char) && !results.some(r => r.c === p.c)){
        results.push({ p: p.p, c: p.c, t: p.t });
      }
    });
  });
  return results.slice(0, limit || 4);
}

function renderHanziProgress(){
  const lesson = currentHanziLesson();
  const fillEl = document.getElementById('hanzi-progress-fill');
  const labelEl = document.getElementById('hanzi-progress-label');

  if (HANZI_STUDY_STATE.phase === 'char'){
    const pct = (HANZI_STUDY_STATE.charIndex / lesson.length) * 60; // fase 'char' ocupa até 60% da barra
    fillEl.style.width = `${pct}%`;
    labelEl.textContent = `Caractere ${HANZI_STUDY_STATE.charIndex + 1} de ${lesson.length}`;
  } else {
    const pct = 60 + (HANZI_STUDY_STATE.testIndex / HANZI_STUDY_STATE.testQueue.length) * 40;
    fillEl.style.width = `${pct}%`;
    labelEl.textContent = `Teste final: ${HANZI_STUDY_STATE.testIndex + 1} de ${HANZI_STUDY_STATE.testQueue.length}`;
  }
}

function renderHanziStudyStep(){
  const lesson = currentHanziLesson();
  const contentEl = document.getElementById('hanzi-study-content');
  const nextBtn = document.getElementById('hanzi-next-btn');

  renderHanziProgress();

  if (HANZI_STUDY_STATE.phase === 'char'){
    const char = lesson[HANZI_STUDY_STATE.charIndex];
    if (HANZI_STUDY_STATE.charSubPhase === 'view'){
      renderHanziViewCard(char, contentEl, nextBtn);
    } else {
      renderHanziWriteCard(char, contentEl, nextBtn);
    }
  } else {
    renderHanziTestStep(contentEl, nextBtn);
  }
}

// ---------- Sub-fase: Ver o caractere ----------
function renderHanziViewCard(char, contentEl, nextBtn){
  const appearances = findHanziAppearances(char.char);
  const radicalsHTML = char.radicals.length
    ? `<div class="hanzi-radicals">${char.radicals.map(r => `
        <div class="hanzi-radical-chip"><span class="r">${r.r}</span><span class="m">${r.m}</span></div>
      `).join('')}</div>`
    : '';

  const appearancesHTML = appearances.length
    ? `<div class="hanzi-appears-in">
        <div class="hanzi-appears-in-label">Aparece em</div>
        ${appearances.map(a => `
          <div class="hanzi-appears-item">
            <span class="hanzi">${a.c}</span>
            <span class="pinyin">${a.p}</span>
            <span class="trans">— ${a.t}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  contentEl.innerHTML = `
    <div class="hanzi-study-card">
      <div class="hanzi-study-phase-label">Veja o caractere</div>
      <div class="hanzi-big-char">${char.char} ${audioBtnHTML(char.char)}</div>
      <div class="hanzi-big-pinyin">${char.pinyin}</div>
      <div class="hanzi-big-meaning">${char.meaning}</div>
      ${radicalsHTML}
      ${appearancesHTML}
    </div>
  `;
  wireAudioButtons(contentEl);

  // Áudio automático do caractere ao entrar na tela — só no passo "Ver",
  // não se repete no passo "Escrever" (decisão explícita: evitar repetição
  // desnecessária durante o desenho, que já tem seu próprio foco).
  if (TTS.voice){
    speakChinese(char.char, contentEl.querySelector('.audio-btn'));
  }

  nextBtn.textContent = 'Agora escreva →';
  nextBtn.style.display = 'flex';
  nextBtn.onclick = () => {
    HANZI_STUDY_STATE.charSubPhase = 'write';
    renderHanziStudyStep();
  };
}

// ---------- Sub-fase: Escrever o caractere (Hanzi Writer, modo quiz) ----------
function renderHanziWriteCard(char, contentEl, nextBtn){
  contentEl.innerHTML = `
    <div class="hanzi-study-card">
      <div class="hanzi-study-phase-label">Escreva: ${char.pinyin} (${char.meaning})</div>
      <div class="hanzi-write-target" id="hanzi-write-target"></div>
      <div class="hanzi-write-feedback" id="hanzi-write-feedback"></div>
      <div class="hanzi-write-actions">
        <button class="btn btn-secondary" id="hanzi-write-reset-btn">🔄 Recomeçar</button>
      </div>
      <p class="hanzi-write-hint-note">Errar o mesmo traço 2 vezes revela automaticamente o traço certo.</p>
    </div>
  `;
  nextBtn.style.display = 'none'; // avança automaticamente ao completar o desenho

  if (typeof HanziWriter === 'undefined'){
    document.getElementById('hanzi-write-target').innerHTML =
      `<p class="stroke-unavailable">Recurso de escrita não carregou. Verifique sua conexão.</p>`;
    // Sem o recurso, permite seguir em frente mesmo assim pra não travar o app.
    nextBtn.style.display = 'flex';
    nextBtn.textContent = 'Continuar →';
    nextBtn.onclick = () => advanceHanziAfterWrite();
    return;
  }

  const feedbackEl = document.getElementById('hanzi-write-feedback');

  const writer = HanziWriter.create('hanzi-write-target', char.char, {
    width: 220,
    height: 220,
    padding: 14,
    showOutline: true,
    strokeColor: '#8E1915',
    outlineColor: '#E2CFA6',
    drawingWidth: 26,
    drawingColor: '#3A7359',
    highlightColor: '#D4A017'
  });
  HANZI_STUDY_STATE.writerInstance = writer;

  // showHintAfterMisses: comportamento NATIVO do Hanzi Writer — depois de
  // errar o mesmo traço esse número de vezes, ele mesmo destaca o traço
  // certo automaticamente. Não existe um método público para acionar isso
  // manualmente sob demanda, então essa é a forma correta de dar "dica".
  function startQuiz(){
    writer.quiz({
      showHintAfterMisses: 2,
      onCorrectStroke: () => {
        feedbackEl.textContent = '';
        feedbackEl.className = 'hanzi-write-feedback';
      },
      onMistake: (strokeData) => {
        feedbackEl.textContent = strokeData.mistakesOnStroke >= 2
          ? 'Traço certo destacado — siga o guia 👆'
          : 'Traço incorreto — tente de novo';
        feedbackEl.className = 'hanzi-write-feedback retry';
      },
      onComplete: () => {
        feedbackEl.textContent = '✓ Muito bem!';
        feedbackEl.className = 'hanzi-write-feedback ok';
        addXP(3);
        setTimeout(() => advanceHanziAfterWrite(), 900);
      }
    });
  }

  startQuiz();

  document.getElementById('hanzi-write-reset-btn').addEventListener('click', () => {
    feedbackEl.textContent = '';
    feedbackEl.className = 'hanzi-write-feedback';
    writer.cancelQuiz();
    writer.hideCharacter();
    startQuiz();
  });
}

function advanceHanziAfterWrite(){
  const lesson = currentHanziLesson();
  if (HANZI_STUDY_STATE.charIndex < lesson.length - 1){
    HANZI_STUDY_STATE.charIndex += 1;
    HANZI_STUDY_STATE.charSubPhase = 'view';
    renderHanziStudyStep();
  } else {
    // todos os caracteres vistos+escritos: monta o teste final embaralhado
    HANZI_STUDY_STATE.phase = 'test';
    HANZI_STUDY_STATE.testQueue = shuffle(lesson.map((c, i) => ({ char: c, options: buildHanziTestOptions(c, lesson) })));
    HANZI_STUDY_STATE.testIndex = 0;
    HANZI_STUDY_STATE.testScore = 0;
    renderHanziStudyStep();
  }
}

function buildHanziTestOptions(char, lesson){
  // Distratores: prioriza os outros caracteres da própria lição; se não houver
  // suficientes (lições menores que 5), completa com caracteres aleatórios do
  // banco geral de Hanzi.
  let pool = lesson.filter(c => c !== char);
  if (pool.length < 3){
    const extra = shuffle(HANZI_ALL.filter(c => c !== char && !pool.includes(c))).slice(0, 3 - pool.length);
    pool = pool.concat(extra);
  }
  const distractors = shuffle(pool).slice(0, 3);
  return shuffle([char, ...distractors]);
}

function renderHanziTestStep(contentEl, nextBtn){
  const total = HANZI_STUDY_STATE.testQueue.length;

  if (HANZI_STUDY_STATE.testIndex >= total){
    const pct = Math.round((HANZI_STUDY_STATE.testScore / total) * 100);
    contentEl.innerHTML = `
      <div class="exercise-result">
        <div class="big-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
        <h3>Lição concluída!</h3>
        <div class="score-num">${HANZI_STUDY_STATE.testScore}/${total}</div>
        <p>${pct >= 70 ? 'Ótima retenção!' : 'Vale revisar esses caracteres de novo em breve.'}</p>
      </div>
    `;
    nextBtn.textContent = 'Voltar às lições';
    nextBtn.style.display = 'flex';
    nextBtn.onclick = () => {
      markHanziLessonCompleted(HANZI_STUDY_STATE.lessonIndex);
      renderHanziLessonsGrid();
    };
    return;
  }

  const item = HANZI_STUDY_STATE.testQueue[HANZI_STUDY_STATE.testIndex];
  nextBtn.style.display = 'none';

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="hanzi-test-counter">Teste da lição — ${HANZI_STUDY_STATE.testIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">O que significa?</div>
      <div class="exercise-prompt">
        <div class="prompt-hanzi">${item.char.char}</div>
        <div class="prompt-pinyin">${item.char.pinyin}</div>
      </div>
      <div class="exercise-options">
        ${item.options.map((opt, i) => `<button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.meaning}</div></button>`).join('')}
      </div>
    </div>
  `;

  contentEl.querySelectorAll('.exercise-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = item.options[chosenIdx] === item.char;
      contentEl.querySelectorAll('.exercise-option').forEach((b, i) => {
        b.classList.add('disabled');
        if (item.options[i] === item.char) b.classList.add('correct');
        else if (i === chosenIdx) b.classList.add('incorrect');
      });
      if (isCorrect){
        HANZI_STUDY_STATE.testScore += 1;
        addXP(3);
      }
      registerStudyToday();
      setTimeout(() => {
        HANZI_STUDY_STATE.testIndex += 1;
        renderHanziStudyStep();
      }, 900);
    });
  });
}

function markHanziLessonCompleted(lessonIndex){
  if (STATE.hanziLessonProgress[lessonIndex].completed) return;
  STATE.hanziLessonProgress[lessonIndex].completed = true;
  if (lessonIndex + 1 < HANZI_LESSONS.length){
    STATE.hanziLessonProgress[lessonIndex + 1].unlocked = true;
  }
  addXP(20);
  registerStudyToday();
  registerDailyHanziLesson();
  showToast('Lição de Hanzi concluída! 🈺');
  saveState();
  renderTopbarStats();
}

// ============================================================
// INIT
// ============================================================
initAuth();
