// E4 lote 5a: quase iguais mais simples (áudio, voz, rótulos, passos, saída para a trilha, abertura de sessão de revisão).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

// Fase 7d (ver CLAUDE.md) -- porta de reprodução ISOLADA pro Preview do
// editor de flashcards (Fase 6D.7): toca o áudio de verdade (mesmo
// mecanismo de sempre -- mp3 pré-gerado ou Web Speech API, via
// speakFrenchAudioOnly acima), mas NUNCA chama registerAudioPlay() --
// nunca incrementa STATE.totalAudioPlays/daily.audioPlaysToday, nunca
// dispara checkAndCelebrateBadges(). Preview é uma simulação visual/
// interativa de Review, não Review de verdade -- nenhuma reprodução de
// áudio dentro dele deveria contar como estudo real. Sempre isAutoplay:
// false (um clique manual, nunca um autoplay automático).
function playAudioPreview(text, btnEl){
  LANG_HOOKS.speakAudioOnly(text, btnEl, false);
}

// Fase 7d (ver CLAUDE.md) -- `isPreview` (booleano, opcional -- default
// falso/ausente preserva 100% o comportamento de sempre) é o ÚNICO ponto
// que decide se um clique MANUAL em `.audio-btn` conta como reprodução
// real (speakFrench, com registerAudioPlay) ou isolada (playAudioPreview,
// sem nenhum efeito colateral) -- nunca espalhado em `if(isPreview)` pelos
// 4 renderers/pontos de chamada; cada um só passa `card.__isPreviewCard`
// (Fase 6D.7) como 2º argumento, a decisão em si mora só aqui.
function wireAudioButtons(container, isPreview){
  container.querySelectorAll('.audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPreview) playAudioPreview(btn.dataset.speak, btn);
      else LANG_HOOKS.speak(btn.dataset.speak, btn);
    });
  });
}

function pollForVoices(){
  if (!TTS.supported || TTS.voice) return;
  TTS.pollAttempts++;
  LANG_HOOKS.loadVoice();
  if (!TTS.voice && TTS.pollAttempts < 20){
    setTimeout(pollForVoices, 300);
  }
}

// Fase 8a (ver CLAUDE.md) -- áudio PRÓPRIO enviado pela professora
// (teacher_flashcards.audio_url), diferente do botão acima (TTS
// automático da pronúncia). Classe própria (não "audio-btn") de propósito
// -- wireAudioButtons() casa por `.audio-btn` e chamaria speakFrench()
// com data-speak indefinido se este botão compartilhasse a classe.
// C1 (revisão de 2026-10-24): a URL passa por safeMediaUrl (shared/core/midia-segura.js); recusada = sem botão.
function customAudioBtnHTML(url){
  const safe = safeMediaUrl(url);
  if (!safe) return '';
  return `<button class="custom-audio-btn" data-audio-url="${safe}" aria-label="${t(LANG_HOOKS.audioListenKey)}" title="${t(LANG_HOOKS.audioListenKey)}">🎧</button>`;
}

// Volta da sessão (Flashcard/Speed Review/Palavras difíceis/Combinar) pra
// tela de escolha -- usada pelo link "← Voltar aos modos" e pelos botões
// "Praticar mais" das telas de conclusão (Fase 6 do projeto: terminar uma
// revisão leva pra PRATICAR, nunca repete a mesma bateria sozinha).
// Rótulo do cartão: cartões próprios/da professora mostram o nome do Deck.
function reviewCardTagLabel(card){
  if (card && card.deckId != null && Array.isArray(STATE.decks)){
    const d = STATE.decks.find(x => x.id === card.deckId);
    if (d && d.name) return d.name;
  }
  return LANG_HOOKS.cardOriginTitle(card);
}

// ---------- Dica pedagógica por exercício ----------
// A dica NÃO é mais uma ação independente no topo da tela -- ela pertence
// ao estado de "Não sei" (ver wireDontKnowButton). buildExerciseHint só
// gera o TEXTO, a partir do CONTEÚDO do próprio exercício (a frase de
// exemplo já usada no card de vocabulário via findMatchingPhrase, o tema da
// unidade, o primeiro bloco de uma frase de ordenar...) -- nunca a resposta
// pronta, e nunca um texto genérico igual pra tudo.
function maskWordInText(text, word){
  const idx = LANG_HOOKS.foldCase(text).indexOf(LANG_HOOKS.foldCase(word));
  if (idx === -1) return null;
  return text.slice(0, idx) + '_____' + text.slice(idx + word.length);
}

function showWrongAnswerPanel(contentEl, ex, opts = {}){
  showAnswerPanel(contentEl, ex, { revealed: false, toneOnly: opts.toneOnly || false, attemptHTML: opts.attemptHTML });
}

// Avança pro próximo passo da unidade (currentStepDefs), ou -- se já era o
// último -- fecha a LIÇÃO atual (não necessariamente a unidade inteira,
// ver finishCurrentLesson). Centraliza os 3 pontos que antes incrementavam
// STEP_STATE.currentStep "cegamente": em unidades de lições (Modelo B) uma
// lição pode ter só 1-2 passos, então incrementar sem checar limite
// estourava o array (currentStepDefs(u)[N] undefined).
function advanceUnitStep(u){
  const stepDefs = currentStepDefs(u);
  if (STEP_STATE.currentStep < stepDefs.length - 1){
    STEP_STATE.currentStep += 1;
    renderStep();
  } else {
    finishCurrentLesson(u);
  }
}

function backToReviewModeSelect(){
  // A3: sair da sessão encerra a Revisão rápida (também no caminho da aba Aluno > Revisão, que retorna mais abaixo).
  if (typeof stopSpeedSession === 'function') stopSpeedSession();
  releaseBadgeCelebrations();
  if (STATE.reviewSessionClassReview){
    STATE.reviewSessionStartedAt = null;
    backToClassReviewTab();
    return;
  }
  const returnDeckId = STATE.reviewSessionDeckId;
  stopSpeedTimer();
  if (typeof stopMatchTimer === 'function') stopMatchTimer();
  SPEED_STATE.active = false;
  document.getElementById('review-mode-select-wrap').style.display = 'block';
  document.getElementById('review-session-wrap').style.display = 'none';
  const deckWrap = document.getElementById('review-deck-wrap');
  if (deckWrap) deckWrap.style.display = 'none';
  STATE.reviewSessionDeckId = null; // K2-H: sair da sessão não deixa escopo de Deck stale
  STATE.reviewSessionStartedAt = null; // sessão abandonada não entra na média de tempo
  syncReviewBackLink();
  renderReviewModeSelect();

  if (returnDeckId != null && typeof openDeckDetail === 'function'){
    openDeckDetail(returnDeckId);
    return;
  }
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'tab', tab: 'review' });
}

// D1/D7 -- "forma explícita de iniciar Review com deckId". Espelha
// byte-a-byte o padrão já usado por STATE.reviewSessionUnitFilter (a única
// diferença de composição é a origem do pool: getStudyScopeForDeck() em vez
// de um filtro de unitId solto) -- reviewFilterQueue('oldest', pool) é a
// MESMA função que startReviewSession()/buildSpeedQueue() já usam pro fluxo
// normal REVISAR, então newCardsPerDay/sessionIntensity/"mais antigas
// primeiro" continuam valendo sem nenhum código de limite novo (D6). Direção
// (K2-G): estrutural do CardInstance -- a sessão de Deck só escolhe quais entram.
async function startDeckReviewSession(deckId, opts){
  holdBadgeCelebrations();
  const restore = !!(opts && opts.restore);
  trackEvent('lesson_start', 'flashcard_review', null);
  const decks = await ensureDecksLoadedForReview();
  // Fase I (Tags): Deck scope AND Tag filter -- o Deck decide o universo, a tag só reduz.
  const pool = getStudyScopeForDeck(decks, deckId, eligibleDeckReviewPool()).filter(matchesReviewTagFilter);
  const queue = reviewFilterQueue('oldest', pool);

  STATE.reviewSessionUnitFilter = null;
  if ('reviewSessionMilestone' in STATE) STATE.reviewSessionMilestone = null;
  STATE.reviewSessionDeckId = deckId;
  STATE.reviewActiveMode = 'flashcard';
  STATE.reviewQueue = queue;
  STATE.reviewIndex = 0;
  STATE.reviewCardState = null;

  // K2-H: o botão vive fora da aba Review (ex.: "Meus Cartões"); sem trocar
  // a view ativa a fila era montada numa tela invisível. switchTab('review')
  // vem ANTES de mostrar a sessão (ele reseta os wrappers para o seletor de
  // modos); reviewSessionUnitFilter já está nulo, então não dispara a sessão
  // de unidade. A rota carrega o deckId para voltar/recarregar não perder o escopo.
  // restore=true (Voltar/recarregar): a parte pós-await roda depois do fim de
  // renderRoute(), então suprime o router aqui para não empilhar histórico.
  const wasRestoring = (typeof ROUTER !== 'undefined') ? ROUTER.restoring : false;
  if (restore && typeof ROUTER !== 'undefined') ROUTER.restoring = true;
  try {
  if (typeof switchTab === 'function') switchTab('review');
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = 'block';
  document.getElementById('speed-review-content').style.display = 'none';
  document.getElementById('match-review-content').style.display = 'none';

  STATE.reviewSessionStartedAt = Date.now();
  renderReviewView();
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'reviewSession', mode: 'flashcard', deckId });
  } finally {
    if (restore && typeof ROUTER !== 'undefined') ROUTER.restoring = wasRestoring;
  }
}

function openReviewSession(mode, opts){
  // A3: abrir qualquer modo encerra uma Revisão rápida que ainda estivesse viva (a do modo 'speed' recomeça logo abaixo).
  if (typeof stopSpeedSession === 'function') stopSpeedSession();
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = mode === 'speed' || mode === 'match' ? 'none' : 'block';
  document.getElementById('speed-review-content').style.display = mode === 'speed' ? 'block' : 'none';
  document.getElementById('match-review-content').style.display = mode === 'match' ? 'block' : 'none';
  // Só pra diagnóstico de report (ver captureReportContext em
  // shared/reports.js) -- Flashcard e Palavras difíceis usam a mesma tela
  // #review-content, sem isso não dava pra distinguir qual delas gerou o
  // report. Não afeta nenhuma lógica de revisão/memória.
  STATE.reviewActiveMode = mode;
  STATE.reviewSessionClassReview = false; // modos da Revisão geral nunca herdam a sessão do Aluno

  if (mode === 'flashcard'){
    STATE.reviewSessionUnitFilter = null;
    STATE.reviewSessionDeckId = null; // Fase D -- entrada normal (sem Deck) nunca herda escopo de uma sessão anterior
    if ('reviewSessionMilestone' in STATE) STATE.reviewSessionMilestone = null;
    startReviewSession(opts);
  } else if (mode === 'hard'){
    holdBadgeCelebrations();
    STATE.reviewSessionUnitFilter = null;
    STATE.reviewSessionDeckId = null; // Fase D -- idem
    if ('reviewSessionMilestone' in STATE) STATE.reviewSessionMilestone = null;
    // Fase 4: getStudyQueue(scope:'hard') -- mesmo critério de hardWordsPool()
    STATE.reviewQueue = shuffle(getStudyQueue(eligibleReviewPool(), { scope: 'hard' }));
    STATE.reviewIndex = 0;
    STATE.reviewCardState = null;
    STATE.reviewSessionStartedAt = Date.now(); // nunca herda o início de uma sessão anterior abandonada
    renderReviewView();
  } else if (mode === 'match'){
    renderMatchSizePicker();
  } else {
    startSpeedReview();
  }

  if (typeof routerNavigate === 'function') routerNavigate({ type: 'reviewSession', mode });
}

// Único jeito de sair de dentro de uma unidade -- topbar/tabs ficam
// escondidas em modo foco (ver .lesson-focus), então isto SEMPRE roda antes
// de voltar pra Trilha, o que garante que uma revisão de lição em
// andamento nunca sobrevive de volta pra lá.
function exitToPath(){
  stopExerciseAudio();
  STEP_STATE.onChallengesScreen = false;
  if ('onCheckpoint' in STEP_STATE) STEP_STATE.onCheckpoint = null;
  if ('onLevelTest' in STEP_STATE) STEP_STATE.onLevelTest = null;
  STEP_STATE.lessonReview = null;
  setLessonFocusMode(false);
  document.getElementById('path-list-wrap').style.display = 'block';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  renderUnitsGrid();

  if (typeof routerNavigate === 'function') routerNavigate({ type: 'tab', tab: 'path' });
}
