/* ============================================================
   Mandarim do Zero — lógica do app
   - Estado persistido em memória (sessão) + localStorage indisponível
     em artifacts, então usamos window.storage se existir, senão
     memória pura (variável global) para a sessão atual.
   - SRS: algoritmo SM-2 (o mesmo usado pelo Anki clássico)
   - Exportação: gera .apkg real via sql.js + JSZip
   - Áudio: Text-to-Speech via Web Speech API (voz zh-CN do navegador)
   ============================================================ */

// Registro do service worker agora vem de shared/pwa.js.

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

// Verdadeiro se dá pra tocar esse texto — seja por mp3 pré-gerado, seja pela
// Web Speech API do navegador. Usado nos autoplay antes de chamar
// speakChinese(), pra não depender só de TTS.voice (agora quase sempre
// desnecessário, já que a maioria do conteúdo tem áudio pré-gerado).
function canSpeakChinese(text){
  return (typeof AUDIO_MANIFEST !== 'undefined' && !!AUDIO_MANIFEST[text]) || !!TTS.voice;
}

// Toca um mp3 pré-gerado (Google Cloud TTS, voz neural) em vez da Web Speech
// API do navegador — qualidade consistente pra todo aluno, independente do
// SO/navegador. Ver audio-manifest.js (texto -> arquivo) e speakChinese().
function playPregeneratedAudio(file, btnEl){
  const audio = new Audio('audio/' + file);
  if (btnEl) btnEl.classList.add('speaking');
  const clear = () => { if (btnEl) btnEl.classList.remove('speaking'); };
  audio.addEventListener('ended', clear);
  audio.addEventListener('error', () => { clear(); showToast('Não foi possível reproduzir o áudio'); });
  audio.play().catch(clear);
}

function speakChinese(text, btnEl){
  const pregenFile = typeof AUDIO_MANIFEST !== 'undefined' && AUDIO_MANIFEST[text];
  if (pregenFile){
    playPregeneratedAudio(pregenFile, btnEl);
    return;
  }

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
  pendingStreakCelebration: false, // true = streak de hoje já contou, falta mostrar a tela (só ao fim da atividade atual). Nunca persistido -- é sempre por sessão.
  activityLog: {}, // 'YYYY-MM-DD' -> contagem de respostas naquele dia (para o heatmap)
  // sem trilha de níveis no Mandarim — a meta é sempre o curso completo (dailyMinutes 0 = ainda não definida)
  studyGoal: {
    objective: null,
    days: { mon:true, tue:true, wed:true, thu:true, fri:true, sat:true, sun:true },
    hour: 8, minute: 0, notifications: false, dailyMinutes: 0
  },
  dailyMinutesLog: {}, // 'YYYY-MM-DD' -> minutos estimados de estudo naquele dia
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
  storyProgress: {}, // storyId -> { completed: bool }
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

// Conexão com o Supabase (supabaseClient, cleanRedirectURL) agora vem de
// shared/supabase-client.js -- mesmo projeto/tabela `progress` de sempre,
// compartilhado com os outros idiomas da plataforma.

// CURRENT_USER, GUEST_MODE_FLAG, initAuth/showLoginScreen/enterGuestMode/
// onUserLoggedIn e toda a autenticação (Google/e-mail/convidado) agora vêm
// de shared/auth.js, junto com saveState/loadState/notifySaveFailure.

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

// sessionStorageSafeGet/Set, localStorageSafeGet/Set e o tema claro/escuro
// (isDarkThemeActive, toggleTheme etc.) agora vêm de shared/utils.js e
// shared/theme.js, carregados antes deste arquivo (ver index.html) --
// compartilhados entre todos os idiomas, não duplicados por app.

// ---------- Preferência: modo do exercício de completar frase (cloze) ----------
// 'choice' (múltipla escolha, padrão) ou 'type' (digitar o pinyin que falta),
// estilo o toggle "sempre digitar" do Duolingo — vale pra todos os exercícios
// de cloze, não é escolhido por exercício.
const CLOZE_MODE_KEY = 'mandarim_cloze_mode';

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

async function loadStateAndRender(){
  await loadState();
  renderTopbarStats();
  renderUnitsGrid();
  renderExportDeckSelect();
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

// Esta tabela `progress` é compartilhada com os outros idiomas da
// plataforma (mesmo Supabase, mesma linha por user_id). Cada idioma guarda
// seu estado sob sua própria chave dentro da coluna `data` para não
// sobrescrever o progresso dos outros. saveState/loadState agora vêm de
// shared/auth.js.
const APP_KEY = 'mandarim';
// Usado por shared/wizard.js na pergunta do objetivo ("aprender ${...}?").
const LANGUAGE_STUDY_NAME = 'mandarim';
// Id deste idioma em languages/index.js (AVAILABLE_LANGUAGES) -- usado pelo
// seletor de idioma no topbar (shared/language-switcher.js) pra saber qual
// card marcar como ativo e qual chave gravar em currentLearningLanguage.
const LANG_ID = 'zh';

// Hook chamado por loadState() (shared/auth.js) quando não encontra
// data.data[APP_KEY] -- reconhece o formato salvo ANTES do namespacing por
// idioma existir (estado do Mandarim do Zero direto na raiz do JSON), pra
// quem já tinha conta antes disso não perder o progresso.
function loadLegacyState(data){
  if (data.hanziCards || data.cards) applySerializedState(data);
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
    studyGoal: STATE.studyGoal,
    dailyMinutesLog: STATE.dailyMinutesLog,
    hanziLessonProgress: STATE.hanziLessonProgress,
    totalReviews: STATE.totalReviews,
    daily: STATE.daily,
    storyProgress: STATE.storyProgress
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
  if (data.studyGoal) Object.assign(STATE.studyGoal, data.studyGoal);
  if (data.dailyMinutesLog) Object.assign(STATE.dailyMinutesLog, data.dailyMinutesLog);
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (data.hanziLessonProgress) Object.assign(STATE.hanziLessonProgress, data.hanziLessonProgress);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.daily) Object.assign(STATE.daily, data.daily);
  if (data.storyProgress) Object.assign(STATE.storyProgress, data.storyProgress);
}

// SM-2 (registerExerciseCorrect, applySM2, cardsDueNow, newCards),
// XP_PER_GRADE, todayStr e dateStrDaysAgo agora vêm de shared/srs.js --
// mesmo algoritmo, mesmo formato de STATE.cards nos dois idiomas.


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
// Aparece uma única vez por dia, na primeira atividade que ativa o streak —
// registerStudyToday() só chega até aqui na primeira chamada depois da
// virada do dia, então essa função nunca dispara duas vezes no mesmo dia.
// STREAK_DAY_LABELS agora vem de shared/wizard.js.
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
// OBJECTIVE_OPTIONS, DAY_DEFS, DAY_KEY_BY_JS_INDEX, PT_MONTHS, formatDatePt,
// estimateCompletionDate, buildMinutesWeekData, renderStudyPlanCard e todo o
// wizard agora vêm de shared/wizard.js -- inclusive a etapa de nível, que
// este idioma ganhou agora (LEVELS em content.js, hoje só com HSK1, mas já
// preparado pra quando os outros níveis do HSK forem adicionados).
// LEVEL_DESCRIPTIONS e estimateUnitExerciseCount continuam aqui (dados/regra
// específicos deste idioma, exigidos como hook por shared/wizard.js).
const LEVEL_DESCRIPTIONS = {
  HSK1: { tier: 'Iniciante', text: 'Cumprimentar, apresentar-se e ter conversas básicas do dia a dia em mandarim' }
};

function estimateUnitExerciseCount(u){
  const phrasesWithBlocks = (u.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  return (u.vocab?.length || 0) + phrasesWithBlocks.length + Math.min(2, phrasesWithBlocks.length) + (u.trueFalseExercises ? 1 : 0);
}


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

  if (localStorageSafeGet('mandarim_last_study_notif') === todayStr()) return;
  new Notification('Hora de estudar mandarim! 🇨🇳', {
    body: `Sua meta de hoje: ${goal.dailyMinutes} minutos.`,
    icon: 'icons/icon-192.png'
  });
  localStorageSafeSet('mandarim_last_study_notif', todayStr());
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

// showToast agora vem de shared/toast.js.

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

// ---------- Busca: todo o vocabulário do app, com indicação de unidade concluída ----------
// Mostra tudo -- inclusive vocabulário de unidades ainda não estudadas --
// com uma tag indicando o status, pra poder ir direto estudar o que falta.
function buildSearchIndex(){
  recalculateUnlockedUnits();
  const index = [];
  UNITS.forEach(u => {
    u.vocab.forEach(v => {
      index.push({
        pinyin: v.p, hanzi: v.c, trans: v.t,
        unitId: u.id, unitTitle: u.title, source: 'vocab',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
    });
    // Frases-modelo e diálogo também entram no índice -- algumas palavras
    // (principalmente gramaticais, como 很/吗/了) só aparecem em frases,
    // nunca como entrada isolada de vocabulário.
    u.phrases.forEach(p => {
      index.push({
        pinyin: p.p, hanzi: p.c, trans: p.t,
        unitId: u.id, unitTitle: u.title, source: 'phrase',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
      (p.blocks || []).forEach(b => {
        const cleanHanzi = b.c.replace(/[，。！？]/g, '').trim();
        const cleanPinyin = b.p.replace(/[,.!?]/g, '').trim();
        if (cleanHanzi && cleanHanzi.length <= 2){
          index.push({
            pinyin: cleanPinyin, hanzi: cleanHanzi, trans: `(na frase: "${p.t}")`,
            unitId: u.id, unitTitle: u.title, source: 'block',
            completed: !!STATE.unitProgress[u.id]?.completed
          });
        }
      });
    });
    u.dialogue.lines.forEach(l => {
      index.push({
        pinyin: l.p, hanzi: l.c, trans: l.t,
        unitId: u.id, unitTitle: u.title, source: 'dialogue',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
    });
  });
  return index;
}

// Remove marcações de tom (acentos) pra permitir buscar "hen" e encontrar
// "hěn" -- sem isso, a busca por pinyin sem tom nunca bateria com o pinyin
// real do banco, que sempre tem tom marcado.
function stripTones(str){
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SEARCH_PAGE_SIZE = 40;
let searchVisibleCount = SEARCH_PAGE_SIZE;
let lastSearchQuery = null;

function renderSearchResults(query){
  const resultsEl = document.getElementById('search-results');
  const index = buildSearchIndex();
  const q = stripTones(query.trim().toLowerCase());

  if (query !== lastSearchQuery){
    searchVisibleCount = SEARCH_PAGE_SIZE;
    lastSearchQuery = query;
  }

  const filtered = q
    ? index.filter(item =>
        stripTones(item.pinyin.toLowerCase()).includes(q) ||
        item.hanzi.includes(query.trim()) ||
        item.trans.toLowerCase().includes(q)
      )
    : index;

  if (!filtered.length){
    resultsEl.innerHTML = `<div class="search-empty">Nenhum resultado para "${query}".</div>`;
    return;
  }

  const toShow = filtered.slice(0, searchVisibleCount);
  const hasMore = filtered.length > toShow.length;

  resultsEl.innerHTML = toShow.map(item => {
    const unlocked = STATE.unitProgress[item.unitId]?.unlocked;
    let tagHTML;
    if (item.completed){
      tagHTML = `<span class="search-unit-tag done">✓ Unidade ${item.unitId}</span>`;
    } else if (unlocked){
      tagHTML = `<button class="search-unit-tag pending" data-unit-id="${item.unitId}">Estudar Unidade ${item.unitId}</button>`;
    } else {
      tagHTML = `<span class="search-unit-tag locked">🔒 Unidade ${item.unitId}: ${item.unitTitle}</span>`;
    }
    return `
      <div class="search-result-row">
        <div class="pinyin">${item.pinyin}</div>
        <div class="hanzi">${item.hanzi}</div>
        <div class="trans">${item.trans}</div>
        ${tagHTML}
      </div>
    `;
  }).join('') + (hasMore ? `
    <button class="search-load-more-btn" id="search-load-more-btn">
      Carregar mais (${toShow.length} de ${filtered.length})
    </button>
  ` : '');

  resultsEl.querySelectorAll('.search-unit-tag.pending').forEach(btn => {
    btn.addEventListener('click', () => {
      const unitId = parseInt(btn.dataset.unitId);
      document.getElementById('search-modal').style.display = 'none';
      switchTab('path');
      openUnitDetail(unitId);
    });
  });

  document.getElementById('search-load-more-btn')?.addEventListener('click', () => {
    searchVisibleCount += SEARCH_PAGE_SIZE;
    renderSearchResults(query);
  });
}

document.getElementById('search-open-btn').addEventListener('click', () => {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-input').value = '';
  document.getElementById('search-input').focus();
  renderSearchResults('');
});

document.getElementById('search-modal-close').addEventListener('click', () => {
  document.getElementById('search-modal').style.display = 'none';
});

document.getElementById('search-input').addEventListener('input', (e) => {
  renderSearchResults(e.target.value);
});

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

    // Checkpoint de história: aparece logo após a unidade que a desbloqueia,
    // ocupando a linha inteira do grid pra se destacar como um marco na
    // trilha, não mais uma unidade comum.
    const story = STORIES.find(s => s.afterUnit === u.id);
    if (story){
      const storyUnlocked = prog.completed;
      const storyDone = STATE.storyProgress?.[story.id]?.completed;
      const storyCard = document.createElement('button');
      storyCard.className = 'story-checkpoint-card' + (!storyUnlocked ? ' locked' : '') + (storyDone ? ' done' : '');
      storyCard.innerHTML = `
        <div class="story-checkpoint-icon">${story.icon}</div>
        <div class="story-checkpoint-text">
          <div class="story-checkpoint-label">${storyDone ? '✓ Concluída' : (storyUnlocked ? 'Checkpoint desbloqueado' : '🔒 Complete a unidade acima')}</div>
          <div class="story-checkpoint-title">${story.title}</div>
          <div class="story-checkpoint-subtitle">${story.subtitle}</div>
        </div>
      `;
      if (storyUnlocked){
        storyCard.addEventListener('click', () => openStory(story.id));
      }
      grid.appendChild(storyCard);
    }
  });
}

// ============================================================
// HISTÓRIAS-CHECKPOINT — recombinam vocabulário de várias unidades já
// concluídas numa situação nova, com pergunta de compreensão intercalada
// ao longo da leitura (não só no final). Dados em stories.js.
// ============================================================
const STORY_STATE = {
  storyId: null,
  beatIndex: 0,
  questionAnswered: false
};

function openStory(storyId){
  const story = STORIES.find(s => s.id === storyId);
  if (!story) return;

  STORY_STATE.storyId = storyId;
  STORY_STATE.beatIndex = 0;
  STORY_STATE.questionAnswered = false;

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  document.getElementById('story-wrap').style.display = 'block';

  document.getElementById('story-header-icon').textContent = story.icon;
  document.getElementById('story-header-title').textContent = story.title;
  document.getElementById('story-header-subtitle').textContent = story.subtitle;

  document.getElementById('story-content').innerHTML = '';
  renderNextStoryBeat();
}

function currentStory(){
  return STORIES.find(s => s.id === STORY_STATE.storyId);
}

function renderStoryProgress(){
  const story = currentStory();
  const pct = Math.round((STORY_STATE.beatIndex / story.beats.length) * 100);
  document.getElementById('story-progress-fill').style.width = `${pct}%`;
}

// Renderiza o próximo "beat" (grupo de falas + pergunta opcional), sempre
// ANEXANDO ao conteúdo já lido (não substituindo) -- assim a história cresce
// na tela como uma conversa real acontecendo, e dá pra rolar pra rever
// falas anteriores a qualquer momento.
function renderNextStoryBeat(){
  const story = currentStory();
  const contentEl = document.getElementById('story-content');
  renderStoryProgress();

  if (STORY_STATE.beatIndex >= story.beats.length){
    maybeShowStreakCelebration();
    contentEl.insertAdjacentHTML('beforeend', `
      <div class="story-complete">
        <div class="big-emoji">🎉</div>
        <h3>História concluída!</h3>
        <p>Você revisou o vocabulário das Unidades ${story.coversUnits[0]}–${story.coversUnits[story.coversUnits.length-1]} numa situação nova.</p>
        <button class="btn btn-primary" id="story-finish-btn">Voltar à trilha</button>
      </div>
    `);
    document.getElementById('story-finish-btn').addEventListener('click', () => {
      finishStory();
    });
    return;
  }

  const beat = story.beats[STORY_STATE.beatIndex];
  const beatEl = document.createElement('div');
  beatEl.className = 'story-beat';
  beatEl.innerHTML = beat.lines.map(line => `
    <div class="story-line">
      <div class="story-line-speaker">${line.spk}</div>
      <div class="story-line-pinyin pinyin">${line.p}</div>
      <div class="story-line-hanzi">${line.c} ${audioBtnHTML(line.c)}</div>
      <div class="story-line-trans">${line.t}</div>
    </div>
  `).join('');
  contentEl.appendChild(beatEl);
  wireAudioButtons(beatEl);

  if (beat.question){
    STORY_STATE.questionAnswered = false;
    const q = beat.question;
    const qEl = document.createElement('div');
    qEl.className = 'story-question';
    qEl.innerHTML = `
      <div class="story-question-prompt">${q.prompt}</div>
      <div class="story-question-options">
        ${q.options.map((opt, i) => `<button class="story-question-option" data-idx="${i}">${opt}</button>`).join('')}
      </div>
    `;
    contentEl.appendChild(qEl);

    qEl.querySelectorAll('.story-question-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STORY_STATE.questionAnswered) return;
        STORY_STATE.questionAnswered = true;
        const chosenIdx = parseInt(btn.dataset.idx);
        const isCorrect = chosenIdx === q.correctIndex;
        qEl.querySelectorAll('.story-question-option').forEach((b, i) => {
          b.classList.add('disabled');
          if (i === q.correctIndex) b.classList.add('correct');
          else if (i === chosenIdx) b.classList.add('incorrect');
        });
        if (isCorrect) addXP(5);
        registerStudyToday();

        const continueBtn = document.createElement('button');
        continueBtn.className = 'story-continue-btn';
        continueBtn.textContent = 'Continuar história →';
        continueBtn.addEventListener('click', () => {
          STORY_STATE.beatIndex += 1;
          renderNextStoryBeat();
        }, { once: true });
        qEl.appendChild(continueBtn);
        continueBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  } else {
    // Beat sem pergunta: botão simples pra continuar lendo
    const continueBtn = document.createElement('button');
    continueBtn.className = 'story-continue-btn';
    continueBtn.textContent = 'Continuar →';
    continueBtn.addEventListener('click', () => {
      STORY_STATE.beatIndex += 1;
      renderNextStoryBeat();
    }, { once: true });
    contentEl.appendChild(continueBtn);
    continueBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function finishStory(){
  const storyId = STORY_STATE.storyId;
  if (!STATE.storyProgress[storyId]?.completed){
    STATE.storyProgress[storyId] = { completed: true };
    addXP(20);
    showToast('História concluída! 🎉');
  }
  saveState();
  renderTopbarStats();
  document.getElementById('story-wrap').style.display = 'none';
  document.getElementById('path-list-wrap').style.display = 'block';
  renderUnitsGrid();
}

document.getElementById('story-back-to-path').addEventListener('click', () => {
  document.getElementById('story-wrap').style.display = 'none';
  document.getElementById('path-list-wrap').style.display = 'block';
  renderUnitsGrid();
});

// ============================================================
// LIÇÃO EM PASSOS (Vocabulário → Exercícios → Frases → Diálogo)
// ============================================================
const STEP_DEFS = [
  { key: 'vocab', label: 'Vocabulário' },
  { key: 'dialogue', label: 'Diálogo' },
  { key: 'usage', label: 'Dica de uso' },
  { key: 'exercises', label: 'Exercícios' }
];

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


// Progresso real dentro da lição: cada etapa (vocabulário/diálogo/dica de
// uso/exercícios) vale uma fatia igual da barra -- mas dentro da etapa
// atual soma a fração já percorrida (carta de vocabulário atual, exercício
// atual), em vez de pular direto pro fim da fatia assim que a etapa começa.
// Sem isso, a barra aparecia quase toda preenchida logo no 1º exercício, só
// porque "Exercícios" é a última das 4 etapas -- media a POSIÇÃO da etapa,
// não o que já foi de fato feito dentro dela.
function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const stepCount = STEP_DEFS.length;
  const stepKey = STEP_DEFS[STEP_STATE.currentStep].key;
  const u = UNITS.find(x => x.id === STATE.currentUnitId);

  let intraStepFraction = 0;
  if (stepKey === 'vocab' && u){
    intraStepFraction = u.vocab.length ? STEP_STATE.vocabIndex / u.vocab.length : 0;
  } else if (stepKey === 'exercises'){
    intraStepFraction = STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0;
  }

  const pct = ((STEP_STATE.currentStep + intraStepFraction) / stepCount) * 100;
  fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

// ---------- Modo foco de lição (estilo Busuu) ----------
// Esconde topbar/tabs enquanto o aluno está numa lição — só a barra de
// progresso e o X ficam visíveis por cima do exercício.
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
  const idx = text.indexOf(word);
  if (idx === -1) return null;
  return text.slice(0, idx) + '_____' + text.slice(idx + word.length);
}

// Regra pedagógica: a dica ajuda a PENSAR (contexto, estratégia, função
// comunicativa), nunca entrega uma característica formal da resposta (letra
// inicial, número de letras/palavras, posição, terminação...) que permita
// deduzi-la mecanicamente -- por isso nenhum ramo abaixo usa .length, index
// de caractere ou "começa com".
function buildExerciseHint(ex, unit){
  if (ex.format === 'meaning' || ex.format === 'listen' || ex.format === 'type'){
    const item = ex.item;
    const phrase = findMatchingPhrase(item, unit);
    if (phrase){
      const masked = maskWordInText(phrase.c, item.c) || phrase.c;
      return `Pense em quando você usaria essa expressão. Ela aparece nesta frase que você já estudou: "${masked}"`;
    }
    if (ex.format === 'type'){
      return 'Ouça de novo com atenção aos sons -- é uma expressão do tema desta unidade.';
    }
    return `Pense no contexto do tema desta unidade ("${unit.title}"): em que situação você usaria essa palavra?`;
  }
  if (ex.format === 'reorder'){
    return 'Identifique primeiro quem realiza a ação e depois a ação em si -- monte a frase seguindo essa ordem de raciocínio.';
  }
  if (ex.format === 'fullsentence'){
    return 'Releia a frase em português e pense em como cada parte dela normalmente é dita em chinês, antes de comparar as opções.';
  }
  if (ex.format === 'cloze'){
    return 'Releia a frase inteira, junto da tradução, e pense em qual palavra dá sentido gramatical e comunicativo ao espaço.';
  }
  if (ex.format === 'trueFalse'){
    return unit.usageNote
      ? `Pense na explicação: "${unit.usageNote.title}"`
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
          <button class="exercise-reveal-btn" id="exercise-reveal-btn">Ver resposta</button>
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
  return ex.askedDontKnow ? Math.max(1, fullXP - 1) : fullXP;
}

// ---------- Vocabulário palavra-por-palavra (estilo Memrise) ----------
// Mostra uma palavra de cada vez, junto da frase-modelo que a usa (quando
// existe uma correspondência direta no banco de conteúdo) — em vez da lista
// completa de uma vez, e sem depender de um passo "Frases" separado.
// Procura um exemplo real de uso da palavra — nas frases da unidade, depois
// nas falas do diálogo (mesmo formato {p, c, t}) e, se ainda não achar, nas
// unidades anteriores já vistas. Aumenta bastante a cobertura sem inventar
// frase nova nenhuma, só reaproveitando conteúdo que já existe no curso, e
// nunca usa vocabulário que o aluno ainda não viu.
function findMatchingPhrase(word, unit){
  const sourcesOf = u2 => [...(u2.phrases || []), ...((u2.dialogue && u2.dialogue.lines) || [])];

  const inUnit = sourcesOf(unit).find(p => p.c.includes(word.c));
  if (inUnit) return inUnit;

  const unitIdx = UNITS.findIndex(u2 => u2.id === unit.id);
  for (let i = 0; i < unitIdx; i++){
    const match = sourcesOf(UNITS[i]).find(p => p.c.includes(word.c));
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
  if (canSpeakChinese(v.c)){
    const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
    speakChinese(v.c, mainAudioBtn);
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
      <div class="prompt-hanzi">${target.c}</div>
      <div class="prompt-pinyin">${target.p}</div>
      ${audioBtnHTML(target.c)}
    </div>
    <div class="exercise-options">${options.map((opt, i) => `
      <button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.t}</div></button>
    `).join('')}</div>
    <button class="btn btn-primary btn-block vocab-quiz-continue" id="vocab-quiz-continue-btn" style="display:none;">Continuar →</button>
  `;

  wireAudioButtons(contentEl);
  if (canSpeakChinese(target.c)) speakChinese(target.c, contentEl.querySelector('.audio-btn'));
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

  if (stepKey === 'vocab' && STEP_STATE.vocabQuizActive){
    STEP_STATE.vocabQuizActive = false;
    renderStep();
    return;
  }

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

  // Só frases com blocks definidos entram como exercício de ordenar — proteção
  // defensiva caso alguma frase futura seja adicionada sem essa segmentação.
  const phrasesWithBlocks = (unit.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  const reorderExercises = phrasesWithBlocks
    .map(p => ({ format: 'reorder', phrase: p, shuffledBlocks: shuffle(p.blocks) }));

  const trueFalseExercises = (unit.trueFalseExercises || []).map(tf => ({ format: 'trueFalse', ...tf }));

  // Cloze ("complete a frase"): esconde uma palavra de uma frase já ensinada.
  // Reaproveita as mesmas frases com blocks do reorder — uma frase pode virar
  // mais de um tipo de exercício ao longo da lição, cada uma numa ocorrência
  // diferente.
  const clozeExercises = shuffle(phrasesWithBlocks).slice(0, 2).map(p => {
    const blocks = p.blocks;
    const blankIdx = blocks.length >= 3
      ? 1 + Math.floor(Math.random() * (blocks.length - 1))
      : Math.floor(Math.random() * blocks.length);
    const correctBlock = blocks[blankIdx];

    const unitBlockPool = (unit.phrases || []).flatMap(ph => ph.blocks || []).filter(b => b.c !== correctBlock.c);
    let distractors = shuffle(unitBlockPool).slice(0, 3);
    if (distractors.length < 3){
      const globalPool = UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || []))
        .filter(b => b.c !== correctBlock.c && !distractors.includes(b));
      distractors = distractors.concat(shuffle(globalPool).slice(0, 3 - distractors.length));
    }

    return { format: 'cloze', phrase: p, blankIdx, correctBlock, options: shuffle([correctBlock, ...distractors]) };
  });

  // Limita quantas frases viram exercício de "ordenar" — protege contra uma
  // lição engordar demais se a unidade ganhar muitas frases de exemplo no
  // futuro (mesmo ajuste já feito no Français).
  const REORDER_EXERCISE_CAP = 4;
  const cappedReorderExercises = shuffle(reorderExercises).slice(0, REORDER_EXERCISE_CAP);

  const fullSentenceExercises = buildFullSentenceExercises(unit);

  return shuffle([...vocabExercises, ...cappedReorderExercises, ...trueFalseExercises, ...clozeExercises, ...fullSentenceExercises]);
}

// ---------- Exercício "Frase completa" — PT → escolher entre 4 frases em hanzi ----------
// Gera distratores de duas formas: (1) trocando uma palavra de conteúdo por
// outra do vocabulário cumulativo (unidade atual + todas anteriores já
// desbloqueadas), e (2) invertendo a posição de uma negação (不/没), um erro
// gramatical plausível e comum de iniciante. Usa os `blocks` que as frases já
// têm, evitando qualquer manipulação frágil de string solta.
function buildCumulativeVocabPool(unit){
  const idx = UNITS.findIndex(u => u.id === unit.id);
  const priorUnits = UNITS.slice(0, idx + 1); // unidade atual + todas anteriores
  const pool = [];
  priorUnits.forEach(u => u.vocab.forEach(v => pool.push(v)));
  return pool;
}

function buildFullSentenceExercises(unit){
  const cumulativeVocab = buildCumulativeVocabPool(unit);

  const candidates = (unit.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  // Limita a 2 por unidade pra não sobrecarregar a sessão de exercícios com
  // um formato mais denso de ler do que os outros.
  const selected = shuffle(candidates).slice(0, 2);

  return selected.map(phrase => {
    const distractors = [];

    // Blocos "de conteúdo": uma palavra isolada, sem pontuação misturada
    // (blocos com pontuação, como "什么名字？", costumam ser a cauda de toda
    // a frase -- trocar ou remover esses gera um distrator sem sentido
    // gramatical, fácil demais de descartar).
    const contentBlockIndices = phrase.blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => {
        const clean = b.c.replace(/[，。！？]/g, '');
        return clean.length >= 2 && clean === b.c;
      });

    function pickReplacement(targetBlock){
      const sameLength = cumulativeVocab.filter(v =>
        v.c !== targetBlock.c && Math.abs(v.c.length - targetBlock.c.length) <= 1
      );
      return shuffle(sameLength.length ? sameLength : cumulativeVocab.filter(v => v.c !== targetBlock.c))[0];
    }

    // Estratégia 1: troca de palavra -- substitui um bloco de conteúdo por
    // outra palavra do vocabulário cumulativo, priorizando tamanho parecido
    // pra manter o mesmo "papel" gramatical.
    let swapTargetIdx = -1;
    if (contentBlockIndices.length){
      swapTargetIdx = contentBlockIndices[Math.floor(Math.random() * contentBlockIndices.length)].i;
      const replacement = pickReplacement(phrase.blocks[swapTargetIdx]);
      if (replacement){
        const newBlocks = phrase.blocks.map((b, i) => i === swapTargetIdx ? { p: replacement.p, c: replacement.c } : b);
        distractors.push(newBlocks);
      }
    }

    // Estratégia 2: erro de posição gramatical -- se a frase tem negação
    // (不/没) em algum bloco, gera uma variante trocando a posição dela com
    // o bloco seguinte (erro comum: "是不" em vez de "不是").
    const negIdx = phrase.blocks.findIndex(b => b.c.includes('不') || b.c.includes('没'));
    const hasNegationSwap = negIdx >= 0 && negIdx < phrase.blocks.length - 1;
    if (hasNegationSwap){
      const swapped = phrase.blocks.slice();
      [swapped[negIdx], swapped[negIdx + 1]] = [swapped[negIdx + 1], swapped[negIdx]];
      distractors.push(swapped);
    }

    // Estratégia 3: combinação -- troca de palavra E inversão de posição na
    // MESMA opção (uma das 4 alternativas junta os dois erros, ficando ainda
    // mais parecida com a correta e mais desafiadora de descartar).
    if (swapTargetIdx >= 0 && hasNegationSwap){
      const replacement2 = pickReplacement(phrase.blocks[swapTargetIdx]);
      if (replacement2){
        const combined = phrase.blocks.map((b, i) => i === swapTargetIdx ? { p: replacement2.p, c: replacement2.c } : b);
        [combined[negIdx], combined[negIdx + 1]] = [combined[negIdx + 1], combined[negIdx]];
        distractors.push(combined);
      }
    }

    // Estratégia 4: omissão de palavra-chave -- remove um bloco de conteúdo
    // inteiro, gerando uma frase incompleta/agramatical.
    if (contentBlockIndices.length > 1){
      const omitCandidates = contentBlockIndices.filter(({ i }) => i !== swapTargetIdx);
      const pool = omitCandidates.length ? omitCandidates : contentBlockIndices;
      const omitIdx = pool[Math.floor(Math.random() * pool.length)].i;
      const withOmission = phrase.blocks.filter((b, i) => i !== omitIdx);
      if (withOmission.length >= 2){
        distractors.push(withOmission);
      }
    }

    // Fallback: embaralha os próprios blocos da frase -- sempre gramaticalmente
    // "errado" o bastante pra servir de distrator, sem nunca coincidir por
    // acaso com a ordem correta. Tentativas limitadas: frases muito curtas
    // (2-3 blocos) têm poucas permutações possíveis.
    let fallbackAttempts = 0;
    while (distractors.length < 3 && phrase.blocks.length >= 2 && fallbackAttempts < 20){
      fallbackAttempts++;
      const shuffledBlocks = shuffle(phrase.blocks);
      const isSameOrder = shuffledBlocks.every((b, i) => b === phrase.blocks[i]);
      const isDuplicate = distractors.some(d => JSON.stringify(d) === JSON.stringify(shuffledBlocks));
      if (!isSameOrder && !isDuplicate){
        distractors.push(shuffledBlocks);
      }
    }

    const distractorSentences = distractors
      .filter(blocks => blocks.map(b => b.c).join('') !== phrase.c) // nunca deixa um distrator coincidir com a frase correta
      .reduce((unique, blocks) => { // deduplica por texto final (hanzi), não por referência de array
        const text = blocks.map(b => b.c).join('');
        if (!unique.some(u => u.text === text)) unique.push({ text, blocks });
        return unique;
      }, [])
      .slice(0, 3)
      .map(({ blocks }) => ({
        p: blocks.map(b => b.p).join(' '),
        c: blocks.map(b => b.c).join('')
      }));

    const correctSentence = { p: phrase.p, c: phrase.c };
    const options = shuffle([correctSentence, ...distractorSentences]);

    // phrase (com .t) reaproveita o mesmo painel de acerto/erro já usado
    // pelo reorder e pelo cloze (showCorrectReorderPanel/answerExplanationParts
    // leem ex.phrase, não um campo próprio deste formato).
    return { format: 'fullsentence', phrase: { c: phrase.c, t: phrase.t }, correct: correctSentence, options };
  });
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
  maybeShowStreakCelebration();
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

  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  renderStepProgress();

  if (STEP_STATE.exerciseIndex >= total){
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
  } else if (ex.format === 'fullsentence'){
    renderFullSentenceExercise(ex, contentEl, nextBtn, total);
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
// pelo anel de meta diária. Não é cronômetro real, é uma aproximação.
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
// frase (ordenar, completar), a nota gramatical genérica da unidade quase
// nunca explica o erro específico (ex: ordem das palavras) — o mais útil
// ali é mostrar o significado da própria frase certa. Pros demais formatos
// (vocabulário, verdadeiro/falso), reaproveita a primeira nota gramatical
// da unidade (mesma fonte do modal "Dicas e Notas"), já que não temos
// explicação por item individual.
// Feedback do painel de erro/revelação, dividido em duas partes bem
// diferentes (ver seção 14 do pedido: "Por que errei?" != "Rever
// conteúdo"):
//   short  -- explica O ERRO ESPECÍFICO desta questão (a resposta certa em
//             si) -- sempre curto, sempre mostrado automaticamente, sem
//             exigir clique.
//   review -- RECONECTA o aluno ao conteúdo de origem daquele conhecimento
//             (a frase onde a palavra foi ensinada, ou a nota gramatical da
//             unidade) -- mais longo, só some se de fato não houver nada
//             pra reaproveitar, fica atrás do botão "Rever conteúdo".
function answerExplanationParts(ex){
  if (ex && ex.phrase){
    const short = `<p class="usage-note-body"><strong>${ex.phrase.c}</strong><br>${ex.phrase.t}</p>`;
    return { short, review: grammarNoteReviewHTML() };
  }
  if (ex && ex.item){
    const short = `<p class="usage-note-body"><strong>${ex.item.c}</strong> (${ex.item.p}) = ${ex.item.t}</p>`;
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    const origin = findMatchingPhrase(ex.item, u);
    const review = origin
      ? `<div class="usage-note-title">Onde você já viu isso</div><p class="usage-note-body"><strong>${origin.c}</strong><br>${origin.t}</p>`
      : grammarNoteReviewHTML();
    return { short, review };
  }
  return { short: null, review: grammarNoteReviewHTML() };
}

function grammarNoteReviewHTML(){
  const notes = GRAMMAR_NOTES[STATE.currentUnitId];
  if (!notes || !notes.length) return null;
  const note = notes[0];
  const tableRows = note.table.map(row => {
    if (row.label){
      return `<tr><td class="label-cell">${row.label}</td><td>${row.pt}<br><span style="color:var(--seal-red-dark); font-weight:700;">${row.cn}</span></td></tr>`;
    }
    return `<tr><td>${row.pt}</td><td>${row.cn}</td></tr>`;
  }).join('');
  const hasLabels = note.table.some(r => r.label);
  return `
    <div class="usage-note-title">${note.title}</div>
    <p class="usage-note-body">${note.explanation}</p>
    <table class="note-detail-table">
      <thead><tr>${hasLabels ? '<th></th>' : ''}<th>Português</th><th>Chinês</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

// Painel de resposta errada/revelada (estilo Duolingo): a explicação curta
// ("por que não foi essa") aparece AUTOMATICAMENTE -- não depende do aluno
// clicar em nada pra ver o porquê. "Rever conteúdo" (quando existe algo pra
// reaproveitar) fica ao lado de "Continuar", com peso visual equivalente,
// nunca como nota pequena e secundária. `revealed` distingue "errei
// tentando" de "pedi pra ver a resposta" (via Não sei) -- nenhum dos dois
// conta como acerto normal, mas o rótulo comunica ao aluno qual foi o caso.
function showAnswerPanel(contentEl, ex, opts = {}){
  const revealed = !!opts.revealed;
  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const { short, review } = answerExplanationParts(ex);
  const panel = document.createElement('div');
  panel.className = 'wrong-feedback';
  panel.innerHTML = `
    <div class="wrong-feedback-header">${revealed ? '👀 Resposta revelada' : '❌ Não foi dessa vez'}</div>
    ${short ? `
      <div class="wrong-feedback-why">
        <div class="wrong-feedback-why-label">${revealed ? 'Resposta' : 'Por que não foi essa'}</div>
        ${short}
      </div>
    ` : ''}
    <div class="wrong-feedback-actions">
      ${review ? `<button class="btn btn-secondary wrong-feedback-review-btn" id="review-content-btn">Rever conteúdo 📖</button>` : ''}
      <button class="btn btn-primary wrong-feedback-continue" id="wrong-continue-btn">Continuar →</button>
    </div>
    ${review ? `<div class="wrong-feedback-review" id="wrong-review" style="display:none;">${review}</div>` : ''}
  `;
  wrap.appendChild(panel);

  panel.querySelector('#review-content-btn')?.addEventListener('click', () => {
    const box = panel.querySelector('#wrong-review');
    const btn = panel.querySelector('#review-content-btn');
    const isOpen = box.style.display !== 'none';
    box.style.display = isOpen ? 'none' : 'block';
    btn.textContent = isOpen ? 'Esconder ⌃' : 'Rever conteúdo 📖';
    if (!isOpen) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
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
  if (ex.format === 'listen' && canSpeakChinese(ex.item.c)){
    speakChinese(ex.item.c, contentEl.querySelector('.audio-btn-lg'));
  }

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

  // "Não sei": disponível desde o início, sem ter que errar de propósito --
  // abre a dica e permite tentar de novo, não finaliza o exercício sozinho.
  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(-1);
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}

// ---------- Exercício de vocabulário "Digite o que ouviu" (ditado) ----------
// Só entra na rotação depois que a palavra já foi vista em múltipla escolha
// pelo menos uma vez (gating em buildExerciseSet) — igual ao Memrise, nunca
// pede pra digitar de ouvido uma palavra ainda não exposta. Compara contra o
// pinyin, não o hanzi — digitar hanzi não é realista sem IME chinês.
function renderVocabTypeExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">Digite o pinyin do que ouviu</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(ex.item.c, 'audio-btn-lg')}
        <div class="prompt-audio-hint">toque para ouvir de novo</div>
      </div>
      <div class="cloze-type-wrap">
        <input type="text" id="vocab-type-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite o pinyin">
        <button class="btn btn-primary btn-block" id="vocab-type-verify-btn">Verificar</button>
      </div>
      <div class="vocab-type-answer" id="vocab-type-answer" style="display:none;"></div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  if (canSpeakChinese(ex.item.c)) speakChinese(ex.item.c, contentEl.querySelector('.audio-btn-lg'));
  nextBtn.style.display = 'none';

  const inputEl = document.getElementById('vocab-type-input');
  inputEl.focus();
  const strip = s => normalizeLoose(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();

  function lockInputs(){
    inputEl.disabled = true;
    document.getElementById('vocab-type-verify-btn').disabled = true;
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  function finish(isCorrect){
    STEP_STATE.exerciseAnswered = true;
    lockInputs();

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4)); // digitar de ouvido vale um pouco mais que só reconhecer em múltipla escolha
      registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
      goToNextExercise();
    } else {
      const answerEl = document.getElementById('vocab-type-answer');
      answerEl.textContent = `Resposta certa: ${ex.item.p}`;
      answerEl.style.display = 'block';
      setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
    }
  }

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('vocab-type-verify-btn').click();
  });
  document.getElementById('vocab-type-verify-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    finish(strip(inputEl.value) === strip(ex.item.p));
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    lockInputs();
    const answerEl = document.getElementById('vocab-type-answer');
    answerEl.textContent = `Resposta certa: ${ex.item.p}`;
    answerEl.style.display = 'block';
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
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

// Tolerante a tom (remove os diacríticos do pinyin), caixa e espaços extras —
// usado só na comparação do modo digitado do cloze (não afeta pinyin exibido).
function normalizeLoose(str){
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// ---------- Exercício de completar frase (cloze, estilo Clozemaster) ----------
// Esconde uma palavra (bloco) de uma frase já ensinada e pede pra completar —
// múltipla escolha (hanzi+pinyin) ou digitado (pinyin), de acordo com a
// preferência salva em getClozeMode(). Digitar hanzi não é realista sem IME
// chinês, então o modo digitado sempre compara contra o pinyin.
function renderClozeExercise(ex, contentEl, nextBtn, total){
  const hanziHTML = ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '<span class="cloze-blank" id="cloze-blank">___</span>' : b.c
  ).join('');
  const pinyinHTML = ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '___' : b.p
  ).join(' ');
  const mode = getClozeMode();

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">Complete a frase</div>
      <div class="cloze-sentence">
        <div class="cloze-hanzi">${hanziHTML}</div>
        <div class="cloze-pinyin">${pinyinHTML}</div>
      </div>
      <div class="cloze-audio-row" id="cloze-audio-row"></div>
      <div class="cloze-trans">${ex.phrase.t}</div>
      ${mode === 'type' ? `
        <div class="cloze-type-wrap">
          <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite o pinyin que falta">
          <button class="btn btn-primary btn-block" id="cloze-verify-btn">Verificar</button>
        </div>
      ` : `
        <div class="cloze-options">${ex.options.map((opt, i) => `
          <button class="cloze-option" data-idx="${i}">
            <span class="cloze-option-pinyin">${opt.p}</span>
            <span class="cloze-option-hanzi">${opt.c}</span>
          </button>
        `).join('')}</div>
      `}
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  function revealBlank(state){
    document.getElementById('cloze-blank').textContent = ex.correctBlock.c;
    document.getElementById('cloze-blank').classList.add(state === 'wrong' ? 'incorrect' : 'correct');

    // O áudio só aparece (e toca sozinho) depois de responder — antes disso
    // ele entregaria a resposta de graça, sem precisar completar a frase.
    const audioRow = document.getElementById('cloze-audio-row');
    audioRow.innerHTML = audioBtnHTML(ex.phrase.c);
    wireAudioButtons(audioRow);
    if (canSpeakChinese(ex.phrase.c)) speakChinese(ex.phrase.c, audioRow.querySelector('.audio-btn'));
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  function finish(isCorrect){
    STEP_STATE.exerciseAnswered = true;
    revealBlank(isCorrect ? 'ok' : 'wrong');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4));
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
      const strip = s => normalizeLoose(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
      finish(strip(inputEl.value) === strip(ex.correctBlock.p));
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
// A frase-modelo aparece embaralhada em blocos de pinyin (com hanzi como apoio
// visual abaixo de cada bloco). Toca nos blocos na ordem certa para reconstruir
// a frase. Foco na ordem gramatical, não em reconhecer hanzi isolado.
// ---------- Exercício de frase completa (PT -> escolher entre 4 frases) ----------
function renderFullSentenceExercise(ex, contentEl, nextBtn, total){
  const optionsHTML = ex.options.map((opt, i) => `
    <button class="exercise-option exercise-option-sentence" data-idx="${i}">
      <div class="pinyin opt-pinyin-sentence">${opt.p}</div>
      <div class="opt-hanzi-sentence">${opt.c}</div>
    </button>
  `).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">Exercício ${STEP_STATE.exerciseIndex + 1} de ${total}</div>
      <div class="exercise-prompt-label">Selecione a frase correta</div>
      <div class="exercise-prompt">
        <div class="prompt-trans-sentence">${ex.phrase.t}</div>
      </div>
      <div class="exercise-options exercise-options-sentence">${optionsHTML}</div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">Não sei</button>
    </div>
  `;

  nextBtn.style.display = 'none';

  function revealCorrectVisual(chosenIdx){
    contentEl.querySelectorAll('.exercise-option-sentence').forEach((b, i) => {
      b.classList.add('disabled');
      if (ex.options[i] === ex.correct) b.classList.add('correct');
      else if (i === chosenIdx) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  contentEl.querySelectorAll('.exercise-option-sentence').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = ex.options[chosenIdx] === ex.correct;
      STEP_STATE.exerciseAnswered = true;
      revealCorrectVisual(chosenIdx);
      addStudyMinutes();
      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(exerciseXP(ex, 4)); // vale um pouco mais que múltipla escolha simples, mesmo critério do reorder
        setTimeout(() => showCorrectReorderPanel(contentEl, ex), 500);
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(-1);
    addStudyMinutes();
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}

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
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4)); // ordenar frase vale um pouco mais que múltipla escolha simples
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
    // Mostra a ordem certa nos slots -- não conta como tentativa errada, é
    // uma revelação pedida pelo aluno via "Não sei".
    slotsEl.innerHTML = correctOrder.map(block =>
      `<div class="reorder-slot filled correct"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`
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

  // Direção estilo Anki: frente->verso (padrão, reconhecimento: vê hanzi,
  // lembra o significado) ou verso->frente (mais difícil, produção ativa:
  // vê a tradução, precisa lembrar o hanzi). O pinyin sempre acompanha o
  // hanzi, nunca aparece sozinho -- então o toggle de pinyin nunca deixa
  // um lado do cartão vazio. Decidido 1x por sessão em startReviewSession,
  // não recalculado a cada render (senão viraria a cada re-render).
  const isReverse = card.reviewDirection === 'back-to-front';
  const hanziSideHTML = `
    <div class="flashcard-hanzi">${card.back_hanzi} ${audioBtnHTML(card.back_hanzi, 'audio-btn-lg')}</div>
    <div class="flashcard-pinyin pinyin">${card.front_pinyin}</div>
  `;
  const transSideHTML = `<div class="flashcard-trans">${card.back_trans}</div>`;
  const frontHTML = isReverse ? transSideHTML : hanziSideHTML;
  const backHTML = isReverse ? hanziSideHTML : transSideHTML;
  // Áudio automático só quando o hanzi está do lado JÁ visível nesse
  // instante -- no modo padrão isso é o front (toca ao entrar no cartão),
  // no modo invertido é o back (toca só ao revelar a resposta).
  const hanziVisibleNow = isReverse ? STATE.reviewShowingAnswer : true;

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

  wireAudioButtons(el);
  // Toca automaticamente quando o hanzi aparece -- reforço auditivo
  // imediato. Só dispara se já houver voz chinesa disponível, pra não
  // repetir o aviso de "instale a voz" a cada cartão de uma sessão inteira.
  if (hanziVisibleNow && canSpeakChinese(card.back_hanzi)){
    speakChinese(card.back_hanzi, el.querySelector('.audio-btn-lg'));
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
  // Grava a direção mostrada nesta revisão -- da próxima vez que essa carta
  // ficar due, nextCardDirection() (shared/srs.js) alterna pra outra.
  card.lastDirection = card.reviewDirection;
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
    maybeShowStreakCelebration();
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
  if (canSpeakChinese(card.char)){
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

// ---------- Radicais (tela dedicada, consolidando dados já existentes) ----------
// Não é conteúdo novo -- reaproveita os radicais já catalogados em cada
// caractere do hanzi-data.js, só reorganiza numa visão própria por radical,
// ordenada por quantos caracteres já estudados usam cada um.
function buildRadicalsIndex(){
  const radicalMap = {};
  HANZI_ALL.forEach(h => {
    (h.radicals || []).forEach(r => {
      if (!radicalMap[r.r]){
        radicalMap[r.r] = { radical: r.r, meaning: r.m, chars: [] };
      }
      radicalMap[r.r].chars.push(h);
    });
  });
  return Object.values(radicalMap).sort((a, b) => b.chars.length - a.chars.length);
}

function renderRadicalsGrid(){
  const radicals = buildRadicalsIndex();
  const contentEl = document.getElementById('hanzi-radicals-content');

  contentEl.innerHTML = `
    <div class="radicals-grid">
      ${radicals.map((r, i) => `
        <button class="radical-card" data-radical-idx="${i}">
          <div class="r">${r.radical}</div>
          <div class="m">${r.meaning}</div>
          <div class="count-badge">${r.chars.length}</div>
        </button>
      `).join('')}
    </div>
  `;

  contentEl.querySelectorAll('.radical-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.radicalIdx);
      openRadicalDetail(radicals[idx]);
    });
  });
}

function openRadicalDetail(radicalData){
  const contentEl = document.getElementById('hanzi-radicals-content');
  contentEl.innerHTML = `
    <button class="back-link" id="radical-detail-back-btn">← Voltar aos radicais</button>
    <div class="radical-detail-header">
      <div class="r">${radicalData.radical}</div>
      <div class="m">${radicalData.meaning}</div>
    </div>
    <div class="section-label">Aparece em ${radicalData.chars.length} caractere(s) que você já estudou</div>
    <div class="radical-chars-grid">
      ${radicalData.chars.map(h => `
        <div class="radical-char-item">
          <div class="char">${h.char}</div>
          <div class="pinyin">${h.pinyin}</div>
          <div class="meaning">${h.meaning}</div>
        </div>
      `).join('')}
    </div>
  `;
  document.getElementById('radical-detail-back-btn').addEventListener('click', renderRadicalsGrid);
}

document.getElementById('hanzi-radicals-btn').addEventListener('click', () => {
  document.getElementById('hanzi-lessons-wrap').style.display = 'none';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'none';
  document.getElementById('hanzi-review-wrap').style.display = 'none';
  document.getElementById('hanzi-radicals-wrap').style.display = 'block';
  renderRadicalsGrid();
});

document.getElementById('hanzi-radicals-back-btn').addEventListener('click', () => {
  document.getElementById('hanzi-radicals-wrap').style.display = 'none';
  renderHanziLessonsGrid();
});

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
  if (canSpeakChinese(char.char)){
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
    maybeShowStreakCelebration();
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
