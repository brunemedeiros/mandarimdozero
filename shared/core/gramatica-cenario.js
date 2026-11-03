// Paridade fr x zh, item C6 de docs/auditoria-paridade-fr-zh.md (2026-10-23): o motor da UNIDADE DE GRAMÁTICA
// (type: "grammar": passos "Explicação" paginada bloco a bloco + "Exercícios", tabela de conjugação) e o do EXERCÍCIO
// DE CENÁRIO ("o que você diria nesta situação?") eram só do fr/app.js. Agora valem para todos os sites (fr, zh, pt e
// os próximos). O CSS está em shared/gramatica-cenario.css. O que muda por idioma vem de LANG_HOOKS:
//   conceptExampleHTML(ex)        exemplo do bloco (fr: frase + som; zh: hanzi + som + pinyin) -- o mesmo dos conceitos
//   grammarAnswerVerdict(g, forms) 'ok' | 'almost' | 'wrong' do exercício de digitar (fr: família latina com
//                                 separadores; zh: pinyin, tom errado = quase)
//   grammarInputExtraHTML()       opcional: teclado de letras/tons logo depois do campo (zh: tons do pinyin)
//   wireGrammarInputExtra(el, in) opcional: liga esse teclado ao campo
//   scenarioOptionHTML(p)         texto da opção do cenário (fr: p.f; zh: pinyin + hanzi)
//   phraseAnswerHTML(p)           "Resposta certa: ..." do painel (frase em negrito + som; zh: + pinyin)
//   uiKey('exercise.counter')     contador "Exercício X de Y" de cada site
// Precisa do app.js (na hora do uso): STEP_STATE, STATE, UNITS, currentStepDefs, renderStep, renderStepProgress, t.

// ---------------------------------------------------------------- Unidade de gramática

function isGrammarUnit(u){
  return !!(u && u.type === 'grammar');
}

// Unidades de gramática (type: "grammar") seguem um fluxo próprio, no estilo
// Busuu: uma sequência de telas de explicação (paginadas bloco por bloco,
// como o vocabulário palavra-por-palavra) e depois os exercícios de uso.
function getStepDefsGrammar(){
  return [
    { key: 'explanation', label: t('fr.step.explanation') },
    { key: 'gramExercises', label: t('fr.step.exercises') }
  ];
}

// Fração andada DENTRO do passo de gramática atual, para a barra de progresso; null fora desses passos.
function grammarStepFraction(u, stepKey){
  if (stepKey === 'explanation' && u && u.grammar){
    return u.grammar.blocks.length ? STEP_STATE.explanationIndex / u.grammar.blocks.length : 0;
  }
  if (stepKey === 'gramExercises' && u && u.grammar){
    return u.grammar.exercises.length ? STEP_STATE.gramExerciseIndex / u.grammar.exercises.length : 0;
  }
  return null;
}

// Nota final da unidade: as de gramática pontuam por u.grammar.exercises/gramExerciseScore (lista fixa, não
// gerada por buildExerciseSet); as outras, pela lista de exercícios da consolidação.
function unitFinalScore(u){
  if (isGrammarUnit(u)) return { total: u.grammar.exercises.length, correct: STEP_STATE.gramExerciseScore };
  return { total: STEP_STATE.exerciseList.length, correct: STEP_STATE.exerciseScore };
}

// "Voltar" aparece na explicação a partir do 2º bloco.
function grammarShowBack(stepKey){
  return stepKey === 'explanation' && STEP_STATE.explanationIndex > 0;
}

// Botão "Voltar" na explicação: volta um bloco. true = tratado.
function grammarStepBack(stepKey){
  if (stepKey === 'explanation' && STEP_STATE.explanationIndex > 0){
    STEP_STATE.explanationIndex -= 1;
    renderStep();
    return true;
  }
  return false;
}

// Botão "Continuar" na explicação: avança um bloco (no último, segue para os exercícios). true = tratado.
function grammarStepNext(u, stepKey){
  if (stepKey === 'explanation' && u && u.grammar){
    if (STEP_STATE.explanationIndex < u.grammar.blocks.length - 1){
      STEP_STATE.explanationIndex += 1;
      renderStep();
      return true;
    }
  }
  return false;
}

// O desvio do renderStep: unidade de gramática desenha os próprios passos. true = era de gramática (já desenhou).
function renderGrammarUnitStep(u, stepKey, contentEl, nextBtn){
  if (!isGrammarUnit(u)) return false;
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
  return true;
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
          ${LANG_HOOKS.conceptExampleHTML(ex)}
          <div class="trans">${ex.t}</div>
        </div>
      `).join('')}
    </div>` : '';

  contentEl.innerHTML = `
    <div class="gram-block-counter">${t('fr.grammar.stepCounter', { i: idx + 1, n: blocks.length })}</div>
    <div class="gram-block ${block.wrapup ? 'wrapup' : ''}">
      <h3 class="gram-block-title">${block.title}</h3>
      <p class="gram-block-body">${block.body}</p>
      ${examplesHTML}
      ${block.table ? renderGramTableHTML(block.table) : ''}
    </div>
  `;
  wireAudioButtons(contentEl);
  nextBtn.style.display = 'flex';
  nextBtn.textContent = isLast ? t('fr.grammar.goToExercises') : t('common.continueArrow');
}

function renderGrammarExerciseStep(u, contentEl, nextBtn){
  const list = u.grammar.exercises;
  const total = list.length;
  renderStepProgress();

  if (STEP_STATE.gramExerciseIndex >= total){
    const scorePct = total ? Math.round((STEP_STATE.gramExerciseScore / total) * 100) : 0;
    // Unidades de gramática nunca tiraram um snapshot de XP (não passam por
    // 'exercises'/'checkpointExercises', ver getStepDefsGrammar) -- 0 é o valor
    // seguro em vez de expor STATE.xp inteiro por engano.
    const xpEarned = STEP_STATE.checkpointXpAtStart == null ? 0 : STATE.xp - STEP_STATE.checkpointXpAtStart;
    renderLessonCompleteScreen(u, null, { challengesBefore: null, xpEarned, scorePct, trackHistory: false });
    return;
  }

  const ex = list[STEP_STATE.gramExerciseIndex];
  nextBtn.style.display = 'none';
  const extraHTML = typeof LANG_HOOKS.grammarInputExtraHTML === 'function' ? LANG_HOOKS.grammarInputExtraHTML() : '';

  contentEl.innerHTML = `
    <div class="conj-progress">${t('fr.grammar.sentenceCounter', { i: STEP_STATE.gramExerciseIndex + 1, n: total })}</div>
    <div class="gram-exercise">
      <div class="gram-exercise-prompt">${ex.prompt}</div>
      ${ex.hint ? `<div class="gram-exercise-hint">${ex.hint}</div>` : ''}
      <input type="text" id="gram-exercise-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('fr.grammar.typeCorrectForm')}">${extraHTML}
      <div class="expected" id="gram-exercise-expected"></div>
    </div>
    <button class="btn btn-primary btn-block" id="gram-exercise-verify-btn">${t('common.verify')}</button>
  `;

  const inputEl = document.getElementById('gram-exercise-input');
  inputEl.focus();
  if (extraHTML && typeof LANG_HOOKS.wireGrammarInputExtra === 'function') LANG_HOOKS.wireGrammarInputExtra(contentEl.querySelector('.gram-exercise'), inputEl);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('gram-exercise-verify-btn').click();
  });

  document.getElementById('gram-exercise-verify-btn').addEventListener('click', () => {
    const given = inputEl.value;
    const expected = ex.answer;
    const wrapEl = contentEl.querySelector('.gram-exercise');
    const expectedEl = document.getElementById('gram-exercise-expected');
    inputEl.disabled = true;

    // Formas aceitas: a resposta principal + `alt` opcional (variantes reais,
    // ex.: septante/nonante na Bélgica e Suíça). Como cada idioma compara
    // (separadores, acento, tom) vem de LANG_HOOKS.grammarAnswerVerdict.
    // "Quase" (acento/tom) vale meio ponto.
    const forms = [expected, ...(ex.alt || [])];
    // Português de Portugal (site com LANG_HOOKS.typedAnswerLang = 'pt-BR'): Quase, com a forma do Brasil.
    const ptBr = typeof typedPtBrAdjust === 'function' ? typedPtBrAdjust(given, (texto) => LANG_HOOKS.grammarAnswerVerdict(texto, forms) !== 'wrong') : null;
    const verdict = ptBr ? 'almost' : LANG_HOOKS.grammarAnswerVerdict(given, forms);
    if (verdict === 'ok'){
      wrapEl.classList.add('ok');
      STEP_STATE.gramExerciseScore += 1;
    } else if (verdict === 'almost'){
      wrapEl.classList.add('almost');
      expectedEl.textContent = t('feedback.almostArrow', { expected });
      if (ptBr) expectedEl.insertAdjacentHTML('afterend', typedPtBrNoteHTML(ptBr));
      STEP_STATE.gramExerciseScore += 0.5;
    } else {
      wrapEl.classList.add('wrong');
      expectedEl.textContent = `→ ${expected}`;
    }
    // "almost" já dá 0.5 ponto -- toca o mesmo som de acerto do "ok", só "wrong" de verdade toca o de erro.
    playFeedbackSound(!wrapEl.classList.contains('wrong'));

    document.getElementById('gram-exercise-verify-btn').style.display = 'none';
    const goNextBtn = document.createElement('button');
    goNextBtn.className = 'btn btn-secondary btn-block';
    goNextBtn.textContent = STEP_STATE.gramExerciseIndex < total - 1 ? t('fr.grammar.nextSentenceArrow') : t('common.seeResultArrow');
    goNextBtn.addEventListener('click', () => {
      STEP_STATE.gramExerciseIndex += 1;
      renderGrammarExerciseStep(u, contentEl, nextBtn);
    });
    contentEl.appendChild(goNextBtn);
  });
}

// ---------------------------------------------------------------- Exercício de cenário

// Windows, por exemplo, vira as duas letras do código do país ("BR") em
// vez do desenho da bandeira. Para os cenários que usam bandeira como ícone,
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

// Montagem (dentro de buildExerciseSet): a frase de índice ímpar (entre as que têm blocos) que tem `scenario`
// vira exercício de cenário, se a unidade tem pelo menos 3 frases com cenário (a certa + 2 distratores).
// null = a frase segue para os outros exercícios (ordenar/traduzir). Sem cenário, não sorteia nada.
function buildScenarioExercise(p, i, phrasesWithScenario){
  if (p.scenario && i % 2 === 1 && phrasesWithScenario.length >= 3){
    const distractors = shuffle(phrasesWithScenario.filter(x => x !== p)).slice(0, 2);
    return { format: 'scenario', phrase: p, options: shuffle([p, ...distractors]) };
  }
  return null;
}

// Dica (botão de dica do exercício).
function scenarioHint(){
  return t('fr.hint.scenario');
}

// Explicação do painel de erro/revelação: mesmo padrão do "Complete a frase": resposta certa (com áudio) +
// tradução. A frase vem da própria unidade, então ela mesma já é o "onde você viu".
function scenarioExplanationHTML(ex){
  return `<div class="feedback-correct-line">${t('feedback.correctAnswerColon')} ${LANG_HOOKS.phraseAnswerHTML(ex.phrase)}</div><div class="feedback-phrase-trans">${ex.phrase.t}</div>`;
}

// ---------- Exercício de cenário ("O que você diria...?") ----------
// Testa uso pragmático de uma frase já ensinada: dado um contexto no idioma do
// site, escolher entre 3 frases do idioma estudado (já vistas na unidade)
// qual é a resposta certa para a situação, não só reconhecer o significado.
function renderScenarioExercise(ex, contentEl, nextBtn, total){
  const optionsHTML = ex.options.map((opt, i) => `
    <button class="scenario-option" data-idx="${i}">
      <span class="scenario-option-num">${i + 1}</span>
      <span class="scenario-option-text">${LANG_HOOKS.scenarioOptionHTML(opt)}</span>
    </button>
  `).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t(LANG_HOOKS.uiKey('exercise.counter'), { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="scenario-question">${ex.phrase.scenario}</div>
      <div class="scenario-scene">${scenarioSceneHTML(ex.phrase.scenarioEmoji)}</div>
      <div class="scenario-options">${optionsHTML}</div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
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
        addXP(exerciseXP(ex, EXERCISE_XP_PRODUCE));
        addStudyMinutes();
        // Sem detalhe extra -- a opção certa já ficou marcada em verde na
        // tela (revealCorrectVisual), repetir o texto no painel seria redundante.
        setTimeout(() => showCorrectFeedbackPanel(contentEl, null), 500);
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });
}
