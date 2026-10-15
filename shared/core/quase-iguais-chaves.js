// E4 lote 5c: quase iguais em que só muda a chave de texto, um valor fixo do idioma ou o conteúdo montado por idioma.
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function audioBtnHTML(text, extraClass){
  const safe = text.replace(/"/g, '&quot;');
  return `<button class="audio-btn ${extraClass||''}" data-speak="${safe}" aria-label="${t(LANG_HOOKS.uiKey('audio.listenPronunciation'))}" title="${t(LANG_HOOKS.uiKey('audio.listenPronunciation'))}">🔊</button>`;
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
          <div class="inline-hint-label">${t(LANG_HOOKS.uiKey('hint.label'))}</div>
          <p class="inline-hint-text">${hintText}</p>
        ` : ''}
        <div class="inline-hint-actions">
          <button class="btn btn-secondary inline-hint-retry-btn" id="inline-hint-retry-btn">${t(LANG_HOOKS.uiKey('hint.retry'))}</button>
          <button class="btn btn-secondary exercise-reveal-btn" id="exercise-reveal-btn">${t(LANG_HOOKS.uiKey('hint.reveal'))}</button>
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

  if (localStorageSafeGet(LANG_HOOKS.studyNotifKey) === todayStr()) return;
  new Notification(t(LANG_HOOKS.uiKey('reminder.title')), {
    body: tp('zh.reminder.body', goal.dailyLessonsGoal),
    icon: 'icons/icon-192.png'
  });
  localStorageSafeSet(LANG_HOOKS.studyNotifKey, todayStr());
}

function renderMatchGame(){
  const el = document.getElementById('match-review-content');

  if (MATCH_STATE.pairs.length < 4){
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🧩</div>
        <h3>${t('review.insufficientTitle')}</h3>
        <p>${t('review.match.insufficientSome')}</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="match-header">
      <span class="match-pairs">${t('zh.review.match.pairs', { done: MATCH_STATE.matchedCount, total: MATCH_STATE.pairs.length })}</span>
      <span class="match-attempts">${t('zh.review.match.attempts', { n: MATCH_STATE.attempts })}</span>
    </div>
    <div class="match-grid" id="match-grid"></div>
  `;
  renderMatchTiles();
}

// ---------- Gráfico de linha: palavras aprendidas ao longo do tempo ----------
function renderProgressLineChart(){
  const wrap = document.getElementById('progress-line-chart-wrap');
  if (!wrap) return;

  // K2-E: uma data por PALAVRA (A+B = 1; vale a mais antiga das irmãs).
  const learnedDates = LANG_HOOKS.chartLearnedDates();

  if (!learnedDates.length){
    wrap.innerHTML = LANG_HOOKS.chartEmptyHTML(t('zh.progress.chartEmpty'));
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
      ${points.map((p,i) => `<circle cx="${(PAD + i*xStep).toFixed(1)}" cy="${yScale(p.total).toFixed(1)}" r="3" class="chart-dot"><title>${t('zh.progress.chartPoint', { date: p.date, n: p.total })}</title></circle>`).join('')}
      ${dateLabels.map(l => `<text x="${l.x.toFixed(1)}" y="${H-10}" class="chart-label" text-anchor="middle">${l.text}</text>`).join('')}
    </svg>
    <div class="chart-total">${t('zh.progress.chartTotal')} <strong>${maxVal}</strong> ${t(LANG_HOOKS.uiKey('progress.chartTotalSuffix'))}</div>
  `;
}

// ---------- Construção do banco de cartões a partir do content.js ----------
// Cada cartão SRS = 1 item de vocabulário (frente: francês, com áudio; verso: tradução)
function buildCardsFromUnits(units, appKey = LANG_HOOKS.appKey){
  // K2-C: cada palavra vira uma Note nativa `normal_reversed` com dois
  // CardInstances (A = id legado, B = `-b`), montados por
  // shared/study-trail-model.js sobre o motor existente. appKey tem default
  // literal: este construtor roda no init de STATE, antes de `const APP_KEY`.
  const cards = [];
  units.forEach(u => {
    if (u.type === 'grammar') return; // unidades de gramática não têm vocabulário/flashcards
    u.vocab.forEach((v, idx) => {
      buildStudyWordCards(u, v, idx, appKey).forEach(c => cards.push(c));
    });
  });
  // Cartões "Na frase": 1 por frase de exemplo do curso (shared/study-trail-model.js).
  buildStudyPhraseCards(units, appKey).forEach(c => cards.push(c));
  return cards;
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
      introduced: {},
      // Acerto/total acumulado das fases realmente avaliadas desta lição
      // (checkpoint + practice/mixed -- NUNCA a ponte com a lição anterior,
      // que testa recall de conteúdo já ensinado antes, não desta lição).
      // Usado em finishCurrentLesson pra dar uma nota de verdade a uma
      // lição intermediária, que antes nunca contava pra desafios de nota
      // (ex: "Pontue mais de 80% em N lições") -- só o Ponto de verificação
      // do fim da unidade contava, o que na prática deixava esses desafios
      // quase impossíveis de bater num dia normal de estudo por lições.
      lessonScore: { correct: 0, total: 0 },
      // XP real da tela "Lição concluída" (Fase 1/3 da tarefa de conclusão
      // de lição/unidade): STATE.xp só cresce dentro de addXP() (nenhum
      // outro lugar escreve nele durante uma sessão, conferido), então o
      // delta contra este valor no momento em que a lição termina é
      // exatamente o XP concedido NESTA lição -- sem duplicar nenhum
      // cálculo paralelo, só lendo o que o motor já concedeu de verdade.
      xpAtLessonStart: STATE.xp
    };
  }
  return {
    unitId,
    blocks: buildAcquisitionBlocks(unit),
    blockIdx: 0,
    phase: 'intro', // 'intro' | 'checkpoint' | 'practice' | 'mixed'
    introIdx: 0,
    wordMisses: {},
    introduced: {},
    xpAtLessonStart: STATE.xp
  };
}

// Toca um mp3 pré-gerado (Google Cloud TTS, voz neural) em vez da Web Speech
// API do navegador — qualidade consistente pra todo aluno, independente do
// SO/navegador. Ver audio-manifest.js (texto -> arquivo) e speakFrench().
// rate (opcional): playbackRate do <audio> -- usado pelo botão "🐢 devagar"
// (ver SLOW_AUDIO_RATE) em qualquer tela de Écouter manual (o Ditado já tem
// seu próprio seletor 0.75x/1x/1.5x, não precisa deste botão extra).
function playPregeneratedAudio(file, btnEl, isAutoplay, rate){
  stopExerciseAudio();
  const audio = new Audio('audio/' + file);
  if (rate) audio.playbackRate = rate;
  exerciseAudioEl = audio;
  if (btnEl){ btnEl.classList.add('speaking'); LAST_AUDIO_BTN = btnEl; }
  const clear = () => {
    if (btnEl) btnEl.classList.remove('speaking');
    if (exerciseAudioEl === audio) exerciseAudioEl = null;
  };
  audio.addEventListener('ended', clear);
  audio.addEventListener('error', () => {
    clear();
    showToast(t('toast.audioPlayFailed'));
    trackTechnicalError('audio_load_failed', { file });
  });
  audio.play().catch(() => {
    clear();
    // Autoplay bloqueado pelo navegador (comum em mobile -- o clique em
    // "Continuar" que dispara o próximo exercício quebra a "janela" de
    // gesto do usuário que o play() automático depende) -- diferente de um erro real de arquivo/rede, por
    // isso um aviso mais brando em vez do toast de erro acima: basta tocar
    // manualmente no botão pra funcionar. Só conta como falha TÉCNICA
    // quando NÃO é autoplay -- um clique manual que falha é sempre
    // inesperado; autoplay bloqueado é comportamento normal do navegador,
    // não um bug, e contá-lo inflaria "erros" com algo que acontece toda
    // sessão em boa parte dos celulares.
    if (isAutoplay) showToast(t('toast.audioTapSpeaker'));
    else trackTechnicalError('audio_play_failed', { file });
  });
}

// Anima um clone do bloco escolhido "voando" da posição de origem
// (sourceRect, medido ANTES do slot existir) até o slot de destino recém
// criado -- estilo Duolingo. Sem isso o bloco só sumia do banco e o texto
// aparecia pronto no slot, sem nenhuma transição visual entre os dois.
function flyBlockToSlot(sourceRect, text, targetSlotEl){
  if (!targetSlotEl || prefersReducedMotion()) return;
  const endRect = targetSlotEl.getBoundingClientRect();
  const clone = document.createElement('div');
  clone.className = 'reorder-fly-clone';
  LANG_HOOKS.setFlyContent(clone, text);
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  document.body.appendChild(clone);
  // Esconde o slot real enquanto o clone "voa" por cima -- revelado de novo
  // logo abaixo, cross-fade com o clone sumindo, não um corte seco.
  targetSlotEl.style.visibility = 'hidden';

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${endRect.left - sourceRect.left}px, ${endRect.top - sourceRect.top}px)`;
    clone.style.width = `${endRect.width}px`;
    clone.style.height = `${endRect.height}px`;
  });
  setTimeout(() => {
    targetSlotEl.style.visibility = '';
    clone.style.opacity = '0';
  }, 200);
  setTimeout(() => clone.remove(), 350);
}

// Toca UMA fala e resolve quando ela termina: true = terminou, false =
// interrompida/erro, 'blocked' = o navegador bloqueou o autoplay.
function dlgPlayLine(text){
  return new Promise(resolve => {
    registerAudioPlay();
    stopExerciseAudio();
    const file = typeof AUDIO_MANIFEST !== 'undefined' && AUDIO_MANIFEST[text];
    if (file){
      const a = new Audio('audio/' + file);
      if (LANG_HOOKS.pregenRate()) a.playbackRate = LANG_HOOKS.pregenRate();
      exerciseAudioEl = a;
      let done = false;
      const fin = v => { if (done) return; done = true; if (exerciseAudioEl === a) exerciseAudioEl = null; resolve(v); };
      a.addEventListener('ended', () => fin(true));
      a.addEventListener('pause', () => fin(a.ended));
      a.addEventListener('error', () => fin(false));
      a.play().catch(() => fin('blocked'));
      return;
    }
    if (!TTS.supported) return resolve(false);
    if (!TTS.voice) LANG_HOOKS.loadVoice();
    if (!TTS.voice) return resolve(false);
    window.speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_HOOKS.ttsLang; u.voice = TTS.voice; u.rate = LANG_HOOKS.ttsRate;
    let started = false, done = false;
    const fin = v => { if (done) return; done = true; resolve(v); };
    u.onstart = () => { started = true; };
    u.onend = () => fin(true);
    u.onerror = () => fin(false);
    window.speechSynthesis.speak(u);
    setTimeout(() => { if (!started){ window.speechSynthesis.cancel(); fin(false); } }, 1800);
  });
}
