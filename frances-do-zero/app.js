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

function loadFrenchVoice(){
  if (!TTS.supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return false;
  TTS.voice = voices.find(v => v.lang === 'fr-FR')
    || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('fr'))
    || null;
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
  activityLog: {},
  totalReviews: 0,
  currentUnitId: null,
  reviewQueue: [],
  reviewIndex: 0,
  reviewShowingAnswer: false,
  reviewSessionUnitFilter: null
};

UNITS.forEach((u,i) => {
  STATE.unitProgress[u.id] = { started:false, completed:false, unlocked: i===0 };
});

// ---------- Supabase: conexão, autenticação e persistência na nuvem ----------
// IMPORTANTE: estas credenciais ainda apontam para o projeto Supabase do
// Mandarim do Zero — antes de publicar para os alunos, troque por um projeto
// (ou ao menos uma tabela) dedicado ao Francês do Zero, para não misturar
// progresso dos dois cursos.
const SUPABASE_URL = 'https://eigjocalzwamisgqilhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZ2pvY2FsendhbWlzZ3FpbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjYzNjksImV4cCI6MjEwMjUwMjM2OX0.EyW4vyQcFL2vrBoo-rpLD5J8LNBT3aSEJREZTSqzHVU';

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
    const { error } = await supabaseClient
      .from('progress')
      .upsert({ user_id: CURRENT_USER.id, data: payload }, { onConflict: 'user_id' });
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
    if (data && data.data){
      applySerializedState(data.data);
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
    activityLog: STATE.activityLog,
    totalReviews: STATE.totalReviews
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
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
}

// ---------- SM-2 algorithm (idêntico em espírito ao Anki) ----------
// grade: 0=Errei, 1=Difícil, 2=Bom, 3=Fácil
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
  { id:'unit_1', name:'Unidade 1 Completa', icon:'📖', check: s => s.unitProgress[1]?.completed },
  { id:'unit_half', name:'Metade do Caminho', icon:'🗼', check: s => Object.values(s.unitProgress).filter(u=>u.completed).length >= Math.ceil(UNITS.length/2) },
  { id:'unit_all', name:'Nível A1 Completo', icon:'🇫🇷', check: s => Object.values(s.unitProgress).filter(u=>u.completed).length >= UNITS.length },
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
  return { total: pool.length, learned };
}

function recalculateUnlockedUnits(){
  UNITS.forEach((u, i) => {
    const prog = STATE.unitProgress[u.id];
    prog.unlocked = i === 0 || STATE.unitProgress[UNITS[i-1].id]?.completed || prog.unlocked;
  });
}

const UNIT_ICONS = {
  1: '👋', 2: '🙋', 3: '🔢', 4: '👨‍👩‍👧', 5: '🥐',
  6: '⏰', 7: '🗺️', 8: '🛍️', 9: '⛅', 10: '🚇',
  11: '🩺', 12: '🎨', 13: '🗓️', 14: '⚖️', 15: '🎬'
};

function renderUnitsGrid(){
  recalculateUnlockedUnits();
  const grid = document.getElementById('units-grid');
  grid.innerHTML = '';
  UNITS.forEach((u, i) => {
    const prog = STATE.unitProgress[u.id];
    const unlocked = prog.unlocked;
    const { total, learned } = unitCardCounts(u.id);
    const pct = total ? Math.round((learned/total)*100) : 0;

    const card = document.createElement('button');
    card.className = 'unit-card' + (!unlocked ? ' locked' : '') + (prog.completed ? ' done' : '') + (unlocked && !prog.completed && learned>0 ? ' current' : '');
    card.innerHTML = `
      <div class="unit-icon-wrap">
        <div class="unit-icon">${UNIT_ICONS[u.id] || '📖'}</div>
        <div class="unit-badge">${prog.completed ? '✓' : u.id}</div>
      </div>
      <div class="unit-title">${u.title}</div>
      <div class="unit-progress-bar"><div class="unit-progress-fill" style="width:${pct}%"></div></div>
      <div class="unit-meta"><span>${learned}/${total} palavras</span><span>${pct}%</span></div>
    `;
    if (unlocked){
      card.addEventListener('click', () => openUnitDetail(u.id));
    }
    grid.appendChild(card);
  });
}

// ============================================================
// LIÇÃO EM PASSOS (Vocabulário → Diálogo → Exercícios)
// ============================================================
const STEP_DEFS = [
  { key: 'vocab', label: 'Vocabulário' },
  { key: 'dialogue', label: 'Diálogo' },
  { key: 'exercises', label: 'Exercícios' }
];

const STEP_STATE = {
  currentStep: 0,
  vocabIndex: 0,
  vocabUnitId: null,
  exerciseList: [],
  exerciseIndex: 0,
  exerciseScore: 0,
  exerciseAnswered: false
};

function openUnitDetail(unitId){
  STATE.currentUnitId = unitId;
  STATE.unitProgress[unitId].started = true;

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';

  const u = UNITS.find(x => x.id === unitId);
  document.getElementById('ud-eyebrow').textContent = `Unidade ${u.id} de ${UNITS.length}`;
  document.getElementById('ud-title').textContent = u.title;
  document.getElementById('ud-goal').textContent = u.goal;

  STEP_STATE.currentStep = 0;
  renderStep();

  saveState();
  renderTopbarStats();
}

document.getElementById('back-to-path').addEventListener('click', () => {
  document.getElementById('path-list-wrap').style.display = 'block';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  renderUnitsGrid();
});

function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const labelsEl = document.getElementById('step-progress-labels');
  const pct = (STEP_STATE.currentStep / (STEP_DEFS.length - 1)) * 100;
  fillEl.style.width = `${pct}%`;
  labelsEl.innerHTML = STEP_DEFS.map((s, i) =>
    `<span class="${i === STEP_STATE.currentStep ? 'current' : ''}">${s.label}</span>`
  ).join('');
}

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
    nextBtn.style.display = 'none';

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
  const stepKey = STEP_DEFS[STEP_STATE.currentStep].key;

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
  const stepKey = STEP_DEFS[STEP_STATE.currentStep].key;

  if (stepKey === 'vocab'){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    if (STEP_STATE.vocabIndex < u.vocab.length - 1){
      STEP_STATE.vocabIndex += 1;
      renderStep();
      return;
    }
  }

  if (STEP_STATE.currentStep < STEP_DEFS.length - 1){
    STEP_STATE.currentStep += 1;
    renderStep();
  } else {
    markUnitCompleted(STATE.currentUnitId);
    document.getElementById('path-list-wrap').style.display = 'block';
    document.getElementById('unit-detail-wrap').style.display = 'none';
    renderUnitsGrid();
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

  const reorderExercises = (unit.phrases || [])
    .filter(p => p.blocks && p.blocks.length >= 2)
    .map(p => ({ format: 'reorder', phrase: p, shuffledBlocks: shuffle(p.blocks) }));

  return shuffle([...vocabExercises, ...reorderExercises]);
}

function renderExerciseStep(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const total = STEP_STATE.exerciseList.length;

  if (STEP_STATE.exerciseIndex >= total){
    const pct = Math.round((STEP_STATE.exerciseScore / total) * 100);
    contentEl.innerHTML = `
      <div class="exercise-result">
        <div class="big-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
        <h3>Exercícios concluídos!</h3>
        <div class="score-num">${STEP_STATE.exerciseScore}/${total}</div>
        <p>${pct >= 70 ? 'Muito bem! Você já domina esse vocabulário.' : 'Vale revisar essas palavras de novo mais tarde na aba Revisão.'}</p>
      </div>
    `;
    nextBtn.textContent = 'Concluir unidade ✓';
    nextBtn.style.display = 'flex';
    return;
  }

  const ex = STEP_STATE.exerciseList[STEP_STATE.exerciseIndex];
  STEP_STATE.exerciseAnswered = false;

  if (ex.format === 'reorder'){
    renderReorderExercise(ex, contentEl, nextBtn, total);
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
      }
      revealAnswer(chosenIdx);
    });
  });

  document.getElementById('exercise-dontknow-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    revealAnswer(-1);
  });
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
  answered: false
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
  `;

  document.getElementById('mode-card-flashcard').addEventListener('click', () => openReviewSession('flashcard'));
  document.getElementById('mode-card-speed').addEventListener('click', () => openReviewSession('speed'));
  document.getElementById('mode-card-hard').addEventListener('click', () => openReviewSession('hard'));
}

function openReviewSession(mode){
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = mode === 'speed' ? 'none' : 'block';
  document.getElementById('speed-review-content').style.display = mode === 'speed' ? 'block' : 'none';

  if (mode === 'flashcard'){
    STATE.reviewSessionUnitFilter = null;
    startReviewSession();
  } else if (mode === 'hard'){
    STATE.reviewSessionUnitFilter = null;
    STATE.reviewQueue = shuffle(hardWordsPool());
    STATE.reviewIndex = 0;
    STATE.reviewShowingAnswer = false;
    renderReviewView();
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

function startSpeedReview(){
  SPEED_STATE.queue = buildSpeedQueue();
  SPEED_STATE.index = 0;
  SPEED_STATE.hearts = 3;
  SPEED_STATE.score = 0;
  SPEED_STATE.streak = 0;
  SPEED_STATE.active = true;
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
      <div class="flashcard-french">${card.front} ${STATE.reviewShowingAnswer ? audioBtnHTML(card.front, 'audio-btn-lg') : ''}</div>
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

  if (STATE.reviewShowingAnswer){
    el.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gradeCurrentCard(parseInt(btn.dataset.grade));
      });
    });
    wireAudioButtons(el);
    if (TTS.voice){
      speakFrench(card.front, el.querySelector('.audio-btn-lg'));
    }
  }
}

function gradeCurrentCard(grade){
  const card = STATE.reviewQueue[STATE.reviewIndex];
  applySM2(card, grade);
  STATE.totalReviews += 1;
  registerStudyToday();
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

function markUnitCompleted(unitId){
  if (STATE.unitProgress[unitId].completed) return;
  STATE.unitProgress[unitId].completed = true;
  const idx = UNITS.findIndex(u => u.id === unitId);
  if (idx >= 0 && idx+1 < UNITS.length){
    STATE.unitProgress[UNITS[idx+1].id].unlocked = true;
  }
  addXP(25);
  showToast(`Unidade concluída! 🥐`);
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

const CONJ_STATE = {
  selectedTenses: ['presente'],
  selectedGroups: Object.keys(CONJUGATION_GROUPS),
  queue: [],
  index: 0,
  score: 0,
  total: 0
};

function renderConjSelectScreen(){
  const tenseListEl = document.getElementById('conj-tense-list');
  tenseListEl.innerHTML = CONJ_TENSES.map(t => `
    <label class="conj-check-item">
      <input type="checkbox" data-tense="${t.key}" ${CONJ_STATE.selectedTenses.includes(t.key) ? 'checked' : ''}>
      <span>${t.label}</span>
    </label>
  `).join('');

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

document.getElementById('conj-start-btn').addEventListener('click', () => {
  if (!CONJ_STATE.selectedTenses.length || !CONJ_STATE.selectedGroups.length){
    showToast('Escolha ao menos 1 tempo e 1 categoria de verbo');
    return;
  }

  const eligibleVerbs = Object.entries(CONJUGATION_VERBS)
    .filter(([name, v]) => CONJ_STATE.selectedGroups.includes(v.g))
    .map(([name]) => name);

  if (!eligibleVerbs.length){
    showToast('Nenhum verbo nessa seleção');
    return;
  }

  // Fila de prática: combinações verbo × tempo, embaralhadas, limitada a 12
  // por sessão para não ficar cansativo demais numa rodada só.
  const combos = [];
  shuffle(eligibleVerbs).forEach(verb => {
    CONJ_STATE.selectedTenses.forEach(tense => combos.push({ verb, tense }));
  });

  CONJ_STATE.queue = shuffle(combos).slice(0, 12);
  CONJ_STATE.index = 0;
  CONJ_STATE.score = 0;
  CONJ_STATE.total = CONJ_STATE.queue.length;

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

function renderConjPracticeStep(){
  const contentEl = document.getElementById('conj-practice-content');

  if (CONJ_STATE.index >= CONJ_STATE.queue.length){
    const pct = CONJ_STATE.total ? Math.round((CONJ_STATE.score / CONJ_STATE.total) * 100) : 0;
    contentEl.innerHTML = `
      <div class="conj-session-result">
        <div class="big-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
        <h3>Sessão concluída!</h3>
        <div class="score-num">${CONJ_STATE.score}/${CONJ_STATE.total}</div>
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

  const combo = CONJ_STATE.queue[CONJ_STATE.index];
  const tenseInfo = CONJ_TENSES.find(t => t.key === combo.tense);
  const expectedForms = getConjForms(combo.verb, combo.tense);
  const isImperatif = combo.tense === 'imperatif';
  const activeMask = isImperatif ? CONJ_IMPERATIF_ACTIVE : [true,true,true,true,true,true];

  contentEl.innerHTML = `
    <div class="conj-progress">Verbo ${CONJ_STATE.index + 1} de ${CONJ_STATE.queue.length}</div>
    <div class="conj-verb-header">
      <div class="infinitif">${combo.verb}</div>
      <div class="tempo">${tenseInfo.label}</div>
    </div>
    <div class="conj-grid">
      ${CONJ_PERSON_LABELS.map((label, i) => `
        <div class="conj-field" data-idx="${i}">
          <label>${label}</label>
          <input type="text" ${activeMask[i] ? '' : 'disabled placeholder="—"'} data-idx="${i}" autocomplete="off" autocapitalize="off" spellcheck="false">
          <div class="expected" data-idx="${i}"></div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary btn-block" id="conj-verify-btn">Vérifier</button>
  `;

  document.getElementById('conj-verify-btn').addEventListener('click', () => {
    let correctCount = 0;
    let activeCount = 0;

    activeMask.forEach((active, i) => {
      if (!active) return;
      activeCount++;
      const fieldEl = contentEl.querySelector(`.conj-field[data-idx="${i}"]`);
      const inputEl = fieldEl.querySelector('input');
      const expectedEl = fieldEl.querySelector('.expected');
      const expected = expectedForms[i] || '';
      const given = inputEl.value;

      inputEl.disabled = true;
      fieldEl.classList.remove('ok','almost','wrong');

      if (given.trim() === expected.trim()){
        fieldEl.classList.add('ok');
        correctCount++;
      } else if (normalizeLoose(given) === normalizeLoose(expected)){
        fieldEl.classList.add('almost');
        expectedEl.textContent = `Quase! → ${expected}`;
        correctCount += 0.5; // conta parcialmente: acentuação/maiúscula, não é erro de fato
      } else {
        fieldEl.classList.add('wrong');
        expectedEl.textContent = `→ ${expected}`;
      }
    });

    CONJ_STATE.score += activeCount ? correctCount / activeCount : 0;
    document.getElementById('conj-verify-btn').style.display = 'none';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-block';
    nextBtn.textContent = CONJ_STATE.index < CONJ_STATE.queue.length - 1 ? 'Próximo verbo →' : 'Ver resultado →';
    nextBtn.addEventListener('click', () => {
      CONJ_STATE.index += 1;
      registerStudyToday();
      renderConjPracticeStep();
    });
    contentEl.appendChild(nextBtn);
  });

  // Foca o primeiro campo ativo, pra já poder digitar direto.
  const firstActive = contentEl.querySelector('.conj-field input:not(:disabled)');
  if (firstActive) firstActive.focus();
}

// ============================================================
// Inicialização
// ============================================================
initAuth();
