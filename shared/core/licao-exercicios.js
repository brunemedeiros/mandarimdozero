// E4 lote paridade 5d-3: exercícios da lição, explicação e dica do erro (paridade 5d, parte 3).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

// Painel "por que não foi essa" caindo de volta pra uma explicação da
// unidade quando não há frase de origem específica pra mostrar. Usa só os
// conceitos que o aluno JÁ VIU nesta sessão (`STEP_STATE.conceptsShown`) --
// nunca antecipa um conceito que ainda não apareceu na lição -- e prioriza
// o que combina com a palavra errada (`vocabIdx`), quando dá pra saber qual foi.
// `requireVocabMatch`: quando true, só retorna algo se o conceito realmente
// bater com `vocabIdx` -- sem isso, cai pra "qualquer conceito já visto"
// (shown[0]), que é aceitável quando não há uma palavra específica em jogo
// (frase/fallback genérico), mas não quando o painel afirma explicar o erro
// de UMA palavra puntual (ver caso motivador em CLAUDE.md).
function noteOrConceptReviewHTML(u, vocabIdx, requireVocabMatch){
  if (!u.concepts || !u.concepts.length) return null;
  const shown = u.concepts.filter(c => STEP_STATE.conceptsShown.has(c.id));
  if (!shown.length) return null;
  const vocabMatch = typeof vocabIdx === 'number' && shown.find(c => c.trigger.afterVocabIdx === vocabIdx);
  if (requireVocabMatch && !vocabMatch) return null;
  const match = vocabMatch || shown[0];
  const block = match.blocks[match.blocks.length - 1]; // versão mais completa (wrapup) do conceito, se houver mais de um cartão
  return `<div class="usage-note-title">${block.title}</div><p class="usage-note-body">${block.body}</p>`;
}

function answerExplanationHTML(ex){
  if (ex && ex.format === 'cloze') return clozeFeedbackDetailHTML(ex, true);
  if (ex && ex.format === 'fullsentence') return LANG_HOOKS.phraseFeedbackHTML(ex.phrase, ex.phrase.t, ''); // Frase completa (zh)
  if (ex && ex.format === 'scenario' && ex.phrase) return scenarioExplanationHTML(ex); // shared/core/gramatica-cenario.js
  if (ex && ex.phrase){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    return LANG_HOOKS.phraseFeedbackHTML(ex.phrase, ex.phrase.t, '') + (noteOrConceptReviewHTML(u) || '');
  }
  if (ex && ex.item){
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    const origin = findMatchingPhrase(ex.item, u);
    // Sem frase de origem: só cai pra nota de conceito quando ela REALMENTE
    // foi desenhada pra essa palavra específica (afterVocabIdx bate com
    // ex.vocabIdx) -- nunca reaproveita qualquer conceito já visto só
    // porque está na mesma unidade (ex: nota sobre "avoir"/idade não
    // explica um erro em "un/une"). Ver CLAUDE.md, coerência pedagógica.
    const originHTML = origin
      ? `<div class="usage-note-title">${t('feedback.whereSeen')}</div><p class="usage-note-body">${LANG_HOOKS.originPhraseHTML(origin)}</p>`
      : (noteOrConceptReviewHTML(u, ex.vocabIdx, true) || '');
    return LANG_HOOKS.itemAnswerHTML(ex.item) + originHTML;
  }
  if (ex && ex.format === 'trueFalse' && ex.whyNote){
    return `<p class="usage-note-body">${ex.whyNote}</p>`;
  }
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  return noteOrConceptReviewHTML(u, ex && ex.vocabIdx) || '';
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
      const masked = maskWordInText(LANG_HOOKS.textOf(phrase), LANG_HOOKS.textOf(item)) || LANG_HOOKS.textOf(phrase);
      return t(LANG_HOOKS.lessonKeys.hintThinkWhen, { masked });
    }
    if (ex.format === 'type'){
      return t(LANG_HOOKS.lessonKeys.hintListenAgain);
    }
    return t(LANG_HOOKS.lessonKeys.hintThinkContext, { title: unit.title });
  }
  if (ex.format === 'reorder'){
    // "traduzir": o desafio principal é lembrar o vocabulário certo em meio
    // aos blocos-isca -- a dica de ordem das palavras (útil no modo
    // "ordenar", que já mostra a frase certa embaralhada) viria em segundo
    // lugar aqui.
    return ex.mode === 'translate'
      ? t(LANG_HOOKS.lessonKeys.hintReorderTranslate)
      : t(LANG_HOOKS.lessonKeys.hintReorderOrder);
  }
  if (ex.format === 'fullsentence'){
    return t(LANG_HOOKS.lessonKeys.hintFullSentence); // Frase completa (zh)
  }
  if (ex.format === 'scenario'){
    return scenarioHint(); // shared/core/gramatica-cenario.js
  }
  if (ex.format === 'cloze'){
    return t(LANG_HOOKS.lessonKeys.hintCloze);
  }
  if (ex.format === 'trueFalse'){
    return trueFalseHint(unit); // shared/core/licao-feedback.js
  }
  return null;
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
  const correctTexts = new Set(correctBlocks.map(LANG_HOOKS.textOf));
  const dedupeAndExclude = (blocks, excludeTexts) => {
    const seen = new Set(excludeTexts);
    return blocks.filter(b => {
      const k = LANG_HOOKS.textOf(b);
      if (correctTexts.has(k) || seen.has(k)) return false;
      seen.add(k);
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
      picked.map(LANG_HOOKS.textOf)
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
    const scenarioEx = buildScenarioExercise(p, i, phrasesWithScenario); // shared/core/gramatica-cenario.js
    if (scenarioEx){
      scenarioExercises.push(scenarioEx);
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

    const unitBlockPool = (unit.phrases || []).flatMap(ph => ph.blocks || []).filter(b => LANG_HOOKS.textOf(b) !== LANG_HOOKS.textOf(correctBlock));
    let distractors = shuffle(unitBlockPool).slice(0, 3);
    if (distractors.length < 3){
      const globalPool = UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || []))
        .filter(b => LANG_HOOKS.textOf(b) !== LANG_HOOKS.textOf(correctBlock) && !distractors.includes(b));
      distractors = distractors.concat(shuffle(globalPool).slice(0, 3 - distractors.length));
    }

    return { format: 'cloze', phrase: p, blankIdx, correctBlock, options: shuffle([correctBlock, ...distractors]) };
  });

  // Limita quantas frases viram exercício de "ordenar" — sem isso, toda frase
  // nova de exemplo (usadas também só pra dar contexto no card de vocabulário)
  // engordava a lição, chegando a 20-30 exercícios numa unidade "simples".
  const REORDER_EXERCISE_CAP = 4;
  const cappedReorderExercises = shuffle(reorderExercises).slice(0, REORDER_EXERCISE_CAP);

  // "Frase completa" (escolher a frase certa entre 4): só o zh tem; no fr a lista vem vazia, sem sortear nada.
  const fullSentenceExercises = LANG_HOOKS.fullSentenceExercises(unit);
  return shuffle([...vocabExercises, ...cappedReorderExercises, ...scenarioExercises, ...trueFalseExercises, ...clozeExercises, ...fullSentenceExercises]);
}

// ---------- Exercício de múltipla escolha (meaning / listen) ----------
function renderMultipleChoiceExercise(ex, contentEl, nextBtn, total){
  let promptHTML = '';
  if (ex.format === 'meaning'){
    promptHTML = `
      <div class="exercise-prompt-label">${t(LANG_HOOKS.lessonKeys.whatMeans)}</div>
      <div class="exercise-prompt">
        ${LANG_HOOKS.itemPromptHTML(ex.item)}
        ${audioBtnHTML(LANG_HOOKS.textOf(ex.item))}
      </div>
    `;
  } else if (ex.format === 'listen'){
    promptHTML = `
      <div class="exercise-prompt-label">${t(LANG_HOOKS.lessonKeys.listenChoose)}</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(LANG_HOOKS.textOf(ex.item), 'audio-btn-lg')}
        <div class="prompt-audio-hint">${t(LANG_HOOKS.lessonKeys.tapAgain)}</div>
      </div>
    `;
  }

  const optionsHTML = ex.options.map((opt, i) =>
    `<button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.t}</div></button>`
  ).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t(LANG_HOOKS.lessonKeys.counter, { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      ${promptHTML}
      <div class="exercise-options">${optionsHTML}</div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  // "meaning" também toca sozinho agora: ouvir a pronúncia aqui não entrega
  // a resposta (as opções são traduções, não a grafia/leitura), então só
  // reforça positivamente -- ao contrário do cloze, onde tocar cedo demais
  // entregaria a palavra que falta.
  if ((ex.format === 'listen' || ex.format === 'meaning') && LANG_HOOKS.canSpeak(LANG_HOOKS.textOf(ex.item))){
    const audioEl = contentEl.querySelector(ex.format === 'listen' ? '.audio-btn-lg' : '.audio-btn');
    LANG_HOOKS.speak(LANG_HOOKS.textOf(ex.item), audioEl, true);
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
        addXP(exerciseXP(ex, EXERCISE_XP_RECOGNIZE));
        registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
        addStudyMinutes();
        setTimeout(() => showCorrectFeedbackPanel(contentEl, null), 500);
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

function renderVocabTypeExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t(LANG_HOOKS.lessonKeys.counter, { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${t(LANG_HOOKS.lessonKeys.typeHeard)}</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(LANG_HOOKS.textOf(ex.item), 'audio-btn-lg')}
        <div class="prompt-audio-hint">${t(LANG_HOOKS.lessonKeys.tapAgain)}</div>
      </div>
      <div class="cloze-type-wrap">
        <input type="text" id="vocab-type-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t(LANG_HOOKS.lessonKeys.typePlaceholder)}">
        ${LANG_HOOKS.typedAnswer.inputExtraHTML(ex.item)}
        <button class="btn btn-primary btn-block" id="vocab-type-verify-btn">${t('common.verify')}</button>
      </div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  if (LANG_HOOKS.canSpeak(LANG_HOOKS.textOf(ex.item))) LANG_HOOKS.speak(LANG_HOOKS.textOf(ex.item), contentEl.querySelector('.audio-btn-lg'), true);
  nextBtn.style.display = 'none';

  const inputEl = document.getElementById('vocab-type-input');
  inputEl.focus();
  LANG_HOOKS.typedAnswer.wireInputExtra(contentEl, inputEl);

  function lockInputs(){
    inputEl.disabled = true;
    document.getElementById('vocab-type-verify-btn').disabled = true;
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  // v = { ok, almost, toneOnly } (LANG_HOOKS.typedAnswer.verdict). almost: "quase" do fr ("oe" no lugar de "œ": meio
  // ponto, mostra a forma certa); toneOnly: erro só de tom do zh (é erro, com o aviso do tom).
  function finish(v, typed){
    const almost = !!v.almost;
    STEP_STATE.exerciseAnswered = true;
    playFeedbackSound(!!v.ok);
    lockInputs();

    if (v.ok){
      STEP_STATE.exerciseScore += almost ? 0.5 : 1;
      addXP(exerciseXP(ex, almost ? EXERCISE_XP_ALMOST : EXERCISE_XP_PRODUCE)); // digitar de ouvido vale um pouco mais que só reconhecer em múltipla escolha
      registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
      addStudyMinutes();
      // Detalhe extra vale a pena aqui -- o exercício testou só o som da
      // palavra, a forma escrita em francês nunca apareceu na tela antes.
      setTimeout(() => showCorrectFeedbackPanel(contentEl, `${almost ? `<div class="review-almost">${escapeHTML(t('review.almost'))}</div>` : ''}<strong>${LANG_HOOKS.textOf(ex.item)}</strong> ${audioBtnHTML(LANG_HOOKS.textOf(ex.item))}`), 500);
    } else {
      // A resposta certa já aparece dentro do próprio painel de resultado
      // (answerExplanationHTML mostra a palavra) -- sem repetir aqui como um
      // texto solto antes do painel, num estilo diferente.
      showWrongAnswerPanel(contentEl, ex, { toneOnly: v.toneOnly, attemptHTML: typedAttemptHTML(typed, LANG_HOOKS.typedAnswer.expected(ex.item)) });
    }
  }

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('vocab-type-verify-btn').click();
  });
  document.getElementById('vocab-type-verify-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    // Vocabulário com forma dupla (ex: "un / une") -- qualquer uma das duas
    // conta como resposta completa, não só a string inteira com a barra.
    finish(LANG_HOOKS.typedAnswer.verdict(inputEl.value, ex.item), inputEl.value);
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    lockInputs();
    showAnswerPanel(contentEl, ex, { revealed: true });
  });
}

// ---------- Exercício de completar frase (cloze, estilo Clozemaster) ----------
// Esconde uma palavra de uma frase já ensinada e pede pra completar — múltipla
// escolha ou digitado, de acordo com a preferência salva em getClozeMode().
function renderClozeExercise(ex, contentEl, nextBtn, total){
  const sentenceHTML = LANG_HOOKS.clozeSentenceHTML(ex);
  const mode = getClozeMode();

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t(LANG_HOOKS.lessonKeys.counter, { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${t('exercise.completeSentence')}</div>
      <div class="cloze-sentence">${sentenceHTML}</div>
      <div class="cloze-audio-row" id="cloze-audio-row"></div>
      <div class="cloze-trans" id="cloze-trans"></div>
      ${mode === 'type' ? `
        <div class="cloze-type-wrap">
          <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t(LANG_HOOKS.lessonKeys.clozePlaceholder)}">
          ${LANG_HOOKS.typedAnswer.inputExtraHTML(ex.correctBlock)}
          <button class="btn btn-primary btn-block" id="cloze-verify-btn">${t('common.verify')}</button>
        </div>
      ` : `
        <div class="cloze-options">${LANG_HOOKS.clozeOptionsHTML(ex.options)}</div>
      `}
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  function revealBlank(state){
    document.getElementById('cloze-blank').textContent = LANG_HOOKS.textOf(ex.correctBlock);
    document.getElementById('cloze-blank').classList.add(state === 'wrong' ? 'incorrect' : 'correct');

    // A tradução da frase só aparece depois de responder -- do mesmo jeito
    // que o áudio abaixo, ela entregaria a resposta de graça se aparecesse
    // antes (a palavra que falta costuma estar literalmente na tradução).
    document.getElementById('cloze-trans').textContent = ex.phrase.t;

    // O áudio só aparece (e toca sozinho) depois de responder — antes disso
    // ele entregaria a resposta de graça, sem precisar completar a frase.
    const audioRow = document.getElementById('cloze-audio-row');
    const spoken = LANG_HOOKS.clozeSpoken(ex);
    audioRow.innerHTML = audioBtnHTML(spoken);
    wireAudioButtons(audioRow);
    if (LANG_HOOKS.canSpeak(spoken)) LANG_HOOKS.speak(spoken, audioRow.querySelector('.audio-btn'), true);
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  // v = { ok, almost, toneOnly } (LANG_HOOKS.typedAnswer.verdict; na múltipla escolha só `ok`). almost: lacuna digitada
  // com "oe" no lugar de "œ" (fr): meio ponto, mostra a forma certa. toneOnly: erro só de tom (zh).
  function finish(v, typed){
    const almost = !!v.almost;
    STEP_STATE.exerciseAnswered = true;
    playFeedbackSound(!!v.ok);
    revealBlank(v.ok ? 'ok' : 'wrong');

    if (v.ok){
      STEP_STATE.exerciseScore += almost ? 0.5 : 1;
      addXP(exerciseXP(ex, almost ? EXERCISE_XP_ALMOST : EXERCISE_XP_PRODUCE));
      addStudyMinutes();
      setTimeout(() => showCorrectFeedbackPanel(contentEl, almost
        ? `<div class="review-almost">${escapeHTML(t('review.almost'))}</div>${clozeFeedbackDetailHTML(ex, true)}`
        : clozeFeedbackDetailHTML(ex, false)), 500);
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex, { toneOnly: v.toneOnly, attemptHTML: typedAttemptHTML(typed, LANG_HOOKS.typedAnswer.expected(ex.correctBlock)) }), 500);
    }
  }

  if (mode !== 'type'){
    wireKeyboardOptions(contentEl.querySelectorAll('.cloze-option'));
  }

  if (mode === 'type'){
    const inputEl = document.getElementById('cloze-input');
    inputEl.focus();
    LANG_HOOKS.typedAnswer.wireInputExtra(contentEl, inputEl);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('cloze-verify-btn').click();
    });
    document.getElementById('cloze-verify-btn').addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      inputEl.disabled = true;
      finish(LANG_HOOKS.typedAnswer.verdict(inputEl.value, ex.correctBlock), inputEl.value);
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
        finish({ ok: isCorrect, almost: false, toneOnly: undefined });
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
      <div class="exercise-counter">${t(LANG_HOOKS.lessonKeys.counter, { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${isTranslate ? t(LANG_HOOKS.lessonKeys.translateTo) : t(LANG_HOOKS.lessonKeys.orderSentence)}</div>
      ${isTranslate ? `
        <div class="exercise-prompt">
          <div class="prompt-translation">${ex.phrase.t}</div>
        </div>
      ` : `
        <div class="exercise-prompt reorder-target">
          <div class="prompt-translation">${ex.phrase.t}</div>
          ${audioBtnHTML(LANG_HOOKS.phraseSpoken(ex.phrase), 'audio-btn-lg')}
        </div>
        <div class="reorder-wrap-hint">${t(LANG_HOOKS.lessonKeys.reorderTapHint)}</div>
      `}
      <div class="reorder-answer-slots" id="reorder-answer-slots"></div>
      <div class="reorder-blocks" id="reorder-blocks"></div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  const slotsEl = document.getElementById('reorder-answer-slots');
  const blocksEl = document.getElementById('reorder-blocks');

  function renderSlots(){
    slotsEl.innerHTML = correctOrder.map((_, i) => {
      const chosenBlockIdx = chosenSequence[i];
      if (chosenBlockIdx === undefined){
        return `<div class="reorder-slot empty"></div>`;
      }
      const block = ex.shuffledBlocks[chosenBlockIdx];
      return `<div class="reorder-slot filled" data-seq-pos="${i}">${LANG_HOOKS.reorderSlotHTML(block)}</div>`;
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
        ${LANG_HOOKS.reorderBlockHTML(block)}
      </button>`;
    }).join('');

    blocksEl.querySelectorAll('.reorder-block:not(.used)').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        // Captura a posição do bloco ANTES do rebuild (renderSlots/renderBlocks
        // substituem o innerHTML inteiro -- depois disso não dá mais pra medir
        // de onde ele "partiu"), pra animar um clone voando até o slot certo
        // em vez do bloco só sumir e o texto aparecer pronto no slot.
        const sourceRect = btn.getBoundingClientRect();
        const sourceText = LANG_HOOKS.flySource(btn);
        const blockIdx = parseInt(btn.dataset.blockIdx);
        const seqPos = chosenSequence.length;
        chosenSequence.push(blockIdx);
        renderSlots();
        renderBlocks();

        const targetSlot = slotsEl.querySelector(`.reorder-slot[data-seq-pos="${seqPos}"]`);
        flyBlockToSlot(sourceRect, sourceText, targetSlot);

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

    // Acerto: tudo verde. Erro: só os blocos fora do lugar ficam vermelhos,
    // os que já estavam na posição certa ficam verdes (dica de onde errou).
    markReorderSlots(slotsEl, chosenSequence, ex.shuffledBlocks, correctOrder, isCorrect); // shared/core/licao-feedback.js
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
      addXP(exerciseXP(ex, EXERCISE_XP_PRODUCE));
      addStudyMinutes();
      // No modo "traduzir", o português já apareceu como pergunta --
      // repeti-lo aqui seria redundante; mostra a frase francesa completa
      // (o aluno só viu ela em pedaços separados até agora) como
      // confirmação nova de verdade.
      // A frase montada, inteira e em tamanho de leitura, com áudio e tradução:
      // é a recompensa pedagógica de quem acabou de montá-la.
      const detail = LANG_HOOKS.reorderDoneHTML(ex.phrase);
      setTimeout(() => showCorrectFeedbackPanel(contentEl, detail), 500);
    } else {
      // "Sua resposta" com cada bloco marcado: vermelho = não pertence à
      // frase (isca) ; amarelo sublinhado = palavra certa no lugar errado.
      const attemptHTML = `<div class="reorder-attempt">${chosenSequence.map((blockIdx, pos) => {
        const block = ex.shuffledBlocks[blockIdx];
        return `<span class="reorder-attempt-w ${reorderBlockStatus(block, pos, correctOrder)}">${LANG_HOOKS.reorderBlockHTML(block)}</span>`;
      }).join(LANG_HOOKS.reorderAttemptSep)}</div>`;
      setTimeout(() => showWrongAnswerPanel(contentEl, ex, { attemptHTML }), 500);
    }
  }

  renderSlots();
  renderBlocks();
  nextBtn.style.display = 'none';

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    slotsEl.innerHTML = correctOrder.map(block =>
      `<div class="reorder-slot filled correct">${LANG_HOOKS.reorderSlotHTML(block)}</div>`
    ).join('');
    blocksEl.querySelectorAll('.reorder-block').forEach(b => b.classList.add('disabled'));
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}
