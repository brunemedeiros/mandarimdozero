// E4 lote 5d: quase iguais em que o mandarim mostra o pinyin e o francês não.
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function renderConceptStep(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const backBtn = document.getElementById('step-back-btn');
  backBtn.style.display = 'none'; // sem "voltar" no meio de uma explicação, igual ao checkpoint/prática

  const concept = STEP_STATE.conceptQueue[STEP_STATE.conceptIdx];
  const block = concept.blocks[STEP_STATE.conceptBlockIdx];
  const isReality = concept.kind === 'reality';
  const isCulture = concept.kind === 'culture';
  setAcqPhaseBanner(
    isReality ? (REALITY_NOTE_BANNER_TEXT[concept.category] || t('concept.banner.reality.default')) :
    isCulture ? (CULTURE_NOTE_BANNER_TEXT[concept.category] || t('concept.banner.culture.default')) :
    t('concept.banner.understand')
  );
  const isLastBlockOfConcept = STEP_STATE.conceptBlockIdx === concept.blocks.length - 1;
  const isLastConcept = STEP_STATE.conceptIdx === STEP_STATE.conceptQueue.length - 1;

  const examplesHTML = (block.examples && block.examples.length) ? `
    <div class="gram-block-examples">
      ${block.examples.map(ex => `
        <div class="gram-block-example">
          ${LANG_HOOKS.conceptExampleHTML(ex)}
          <div class="trans">${ex.t}</div>
        </div>
      `).join('')}
    </div>` : '';

  // `variants` é exclusivo da categoria 'regional' -- ao contrário de
  // `examples` (par forma/tradução), aqui não há forma "oficial": cada item
  // é só {region, form}, uma das variações igualmente válidas. Reaproveita
  // a lista comum em vez de um componente de badge/cor novo (ver CLAUDE.md,
  // "MVP = card passivo").
  const variantsHTML = (block.variants && block.variants.length) ? `
    <ul class="gram-block-variants">
      ${block.variants.map(v => `<li><strong>${v.region}:</strong> ${v.form}</li>`).join('')}
    </ul>` : '';

  contentEl.innerHTML = `
    ${concept.blocks.length > 1 ? `<div class="gram-block-counter">${t('concept.counter.of', { i: STEP_STATE.conceptBlockIdx + 1, n: concept.blocks.length })}</div>` : ''}
    <div class="gram-block ${block.wrapup ? 'wrapup' : ''}">
      <h3 class="gram-block-title">${block.title}</h3>
      <p class="gram-block-body">${block.body}</p>
      ${examplesHTML}
      ${variantsHTML}
    </div>
  `;
  wireAudioButtons(contentEl);
  nextBtn.style.display = 'flex';
  nextBtn.textContent = (isLastBlockOfConcept && isLastConcept) ? t('common.continueArrow') : t('zh.path.gotItArrow');
}

// ---------- Exercício de verdadeiro ou falso (uso real, não tradução) ----------
// Mostra uma frase/palavra já ensinada e uma afirmação em português sobre
// QUANDO/COMO ela é usada na vida real; o aluno julga se é verdadeira ou falsa.
function renderTrueFalseExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t(LANG_HOOKS.uiKey('exercise.counter'), { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="tf-scene">
        <div class="tf-scene-emoji">${ex.emoji || '💬'}</div>
        <div class="tf-subject">${ex.subject}</div>
        ${LANG_HOOKS.tfPinyinHTML(ex)}
        ${audioBtnHTML(ex.subject)}
      </div>
      <div class="tf-claim">${ex.claim}</div>
      <div class="tf-options">
        <button class="tf-option" data-val="true">${t(LANG_HOOKS.uiKey('exercise.true'))}</button>
        <button class="tf-option" data-val="false">${t(LANG_HOOKS.uiKey('exercise.false'))}</button>
      </div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
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
        addStudyMinutes();
        // Sem detalhe extra -- a resposta certa já ficou marcada em verde na
        // tela (revealCorrectVisual), repetir o texto no painel seria redundante.
        setTimeout(() => showCorrectFeedbackPanel(contentEl, null), 500);
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });
}

// Fase 6C.2 (ver CLAUDE.md) -- renderer de "Múltipla escolha", extraído
// pro contrato aprovado na Fase 6C: (mountEl, card, localState, callbacks)
// -- mesmo espírito da extração de Normal (Fase 6C.1). Reutilizável tal e
// qual pelo Preview do editor (Fase 6D.7, ver reviewProgressBarHTML
// acima): o Preview chama esta MESMA função, só trocando localState
// (variável local do Preview, nunca STATE) e callbacks (onAnswered vira
// um no-op visual, nunca gradeCurrentCard). O renderer não sabe -- nem
// precisa saber -- se está em Review ou Preview.
//
// localState: {kind:'multiple_choice', shuffledOptions, selectedIndex,
// answered, wasCorrect}. `shuffledOptions` substitui `card.mcOptions`
// (Fase 8a) -- antes era mutação direta de uma entrada REAL de
// STATE.cards (objeto durável, potencialmente serializado se alguém
// esquecesse de limpar); agora é gerado 1x na 1ª renderização desta
// EXIBIÇÃO e vive só no localState, que nunca é persistido. `view.
// correctText`/`view.distractorTexts` (resolveCardContentView, Fase 4b,
// intocado) sempre vêm do MESMO CardInstance -- a mesma pergunta sempre
// produz as mesmas alternativas e a mesma resposta certa; só a ORDEM do
// shuffle muda entre exibições.
//
// Interação intermediária (marcar uma opção): o PRÓPRIO renderer se
// chama de novo com os mesmos 4 parâmetros -- sem envolver a sessão. Só
// a transição FINAL (clicar "Continuar") chama callbacks.onAnswered.
function renderMultipleChoiceCard(mountEl, card, localState, callbacks){
  // Fase 4b -- lê Note/CardInstance via resolveCardContentView(), nunca
  // `card.front`/`card.back_trans`/`card.choices` (não existem mais no
  // card nativo). `view.prompt`/`view.correct` são Fields já resolvidos
  // (texto+lang+áudio), `view.correctText`/`view.distractorTexts` são as
  // strings prontas pros botões.
  const view = resolveCardContentView(card);

  if (!localState.shuffledOptions){
    localState.shuffledOptions = shuffle([
      { text: view.correctText, correct: true },
      ...view.distractorTexts.map(text => ({ text, correct: false })),
    ]);
  }
  const answered = localState.answered;
  // isStudyLanguageField() aqui é exatamente o uso que a ressalva da Fase 2
  // sempre permitiu ("helper pra regras que genuinamente dependem do idioma
  // do app") -- a DIREÇÃO já foi decidida pelo CardInstance antes deste
  // ponto (view.prompt já é o campo certo); isto só decide se o motor de
  // pronúncia (que só sabe falar UM idioma real) pode tentar esse campo
  // específico, nunca qual campo é o prompt.
  const promptSpeakable = isStudyLanguageField(view.prompt, APP_KEY);
  // Fase 7a (ver CLAUDE.md) -- áudio/imagem customizados vêm SÓ do Field
  // do prompt agora, nunca mais com fallback pro `correct` (achado da
  // auditoria da Fase 7: o fallback antigo, `prompt.audioUrl ||
  // correct.audioUrl`, podia tocar a pronúncia da RESPOSTA CERTA antes da
  // aluna sequer ver as opções, se só o Field de resposta tivesse áudio/
  // imagem próprio -- um vazamento real). O prompt é sempre visível desde
  // o início (não há "revelação" nele), então usar só sua própria mídia é
  // seguro em qualquer direção do cartão. `view.correct`/os distratores
  // continuam sem exibir mídia própria nesta subfase (nenhum slot de UI
  // pra isso hoje, e distratores nem carregam Field/mídia -- ver
  // CLAUDE.md, achado #3 da Fase 7).
  const customAudioUrl = view.prompt.audioUrl || null;
  const promptImageUrl = card.imageUrl || view.prompt.imageUrl || null;

  mountEl.innerHTML = `
    ${reviewProgressBarHTML(card)}
    <div class="flashcard" id="flashcard">
      <div class="flashcard-tag">${escapeHTML(reviewCardTagLabel(card))}</div>
      ${promptImageUrl ? `<img src="${promptImageUrl}" class="flashcard-image" alt="">` : ''}
      <div class="${LANG_HOOKS.promptClass}">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${customAudioUrl ? customAudioBtnHTML(customAudioUrl) : ''}</div>
      ${LANG_HOOKS.promptPinyinHTML(view)}
    </div>
    <div class="mc-options">
      ${localState.shuffledOptions.map((opt, i) => {
        let cls = 'mc-option';
        if (answered){
          cls += ' disabled';
          if (opt.correct) cls += ' correct';
          else if (i === localState.selectedIndex) cls += ' incorrect';
        }
        const mark = answered ? (opt.correct ? '<span class="mc-mark" aria-hidden="true">✓ </span>' : (i === localState.selectedIndex ? '<span class="mc-mark" aria-hidden="true">✗ </span>' : '')) : '';
        return `<button class="${cls}" data-idx="${i}"${answered ? ' disabled' : ''}>${mark}${escapeHTML(opt.text)}</button>`;
      }).join('')}
    </div>
    ${answered ? `${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="mc-continue-btn">${t('common.continue')}</button>` : ''}
  `;

  wireAudioButtons(mountEl, card.__isPreviewCard);
  wireCustomAudioButtons(mountEl);
  // Prop 1+2 (ver CLAUDE.md, "7 propostas") -- só tenta pronunciar
  // automaticamente quando o prompt é de fato o idioma estudado. Quando
  // invertido (prompt=tradução, opções no idioma estudado), NÃO existe
  // pronúncia automática de opção nenhuma -- tocar a opção certa antes da
  // aluna responder entregaria a resposta.
  // Fase 7a -- `card.__isPreviewCard` suprime só o AUTOPLAY (registerAudioPlay()
  // real não deveria disparar por abrir um Preview) -- ver mesmo comentário
  // em renderNormalCard().
  if (!card.__isPreviewCard && promptSpeakable && LANG_HOOKS.canSpeak(view.prompt.text)) LANG_HOOKS.speak(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);

  if (!answered){
    mountEl.querySelectorAll('.mc-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        // Interação intermediária -- muta localState e o renderer se
        // autochama, sem envolver a sessão (nunca STATE.reviewMCPicked/
        // reviewMCCorrect, eliminados nesta fase).
        localState.selectedIndex = idx;
        localState.answered = true;
        localState.wasCorrect = localState.shuffledOptions[idx].correct;
        renderMultipleChoiceCard(mountEl, card, localState, callbacks);
      });
    });
  } else {
    mountEl.querySelector('#mc-continue-btn').addEventListener('click', () => {
      // Transição FINAL -- sobe pra sessão via callback. A sessão (não
      // este renderer) é quem descarta STATE.reviewCardState ao avançar
      // STATE.reviewIndex (gradeCurrentCard), mesmo ciclo de vida já
      // estabelecido pra Normal na Fase 6C.1.
      callbacks.onAnswered(localState.wasCorrect, localState.wasCorrect ? 2 : 0);
    });
  }
}
