// E4 lote paridade 5d-6: cartões da Revisão e texto dos cartões da trilha (paridade 5d, parte 6).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

// Cartões da trilha guardam cópia do texto exibido; só o texto muda (id/FSRS
// intactos). Também roda depois de carregar o progresso salvo, que traz o texto
// do idioma em que foi salvo.
function refreshStudyCardTexts(){
  STATE.cards.forEach((c) => {
    if (c.origin !== 'study') return;
    const u = UNITS.find((x) => x.id === c.unitId);
    // Cartão "Na frase": só a etiqueta muda com o idioma do site.
    if (u && c.vocabIdx == null && c.gateVocabIdx != null){ c.unitTitle = studyPhraseCardTitle(u.title); return; }
    if (!u || !u.vocab || !u.vocab[c.vocabIdx]) return;
    // Palavra diferente no slot (país do aluno etc.): o progresso segue a palavra,
    // não a posição (shared/card-variants.js).
    LANG_HOOKS.vocabCardSwap(c, u.vocab[c.vocabIdx]); // o overlay `src` pode localizar a palavra estudada
    c.back_trans = u.vocab[c.vocabIdx].t;
    c.unitTitle = u.title;
  });
  LANG_HOOKS.refreshExtraCards(); // zh: cartões de hanzi
}

// Fase 6C.3 (ver CLAUDE.md) -- renderer de "Cloze" (completar a frase),
// extraído pro contrato aprovado na Fase 6C: (mountEl, card, localState,
// callbacks). Mesmo espírito de todas as extrações anteriores desta fase
// (Normal 6C.1, Múltipla escolha/Digite a resposta 6C.2) -- reutilizável
// tal e qual pelo Preview do editor (Fase 6D, ainda não construída).
//
// localState: {kind:'cloze', markId, typedAnswer, answered, wasCorrect}.
// `markId` -- AJUSTE em relação ao shape que a auditoria da Fase 6C tinha
// esboçado pra Cloze (idêntico, campo a campo, ao de Type Answer) --
// identifica explicitamente A QUAL CardInstance/marca este estado
// pertence, mesmo sabendo que hoje só existe 1 markId por exibição (cada
// {{cN::...}} de uma Note vira sua PRÓPRIA CardInstance/posição de fila
// desde a Fase 5 -- nunca 2 marcas mostradas juntas na mesma tela). Sem
// isso, o shape ficaria estruturalmente idêntico ao de Type Answer de
// novo -- exatamente o "boolean genérico compartilhado" que esta subfase
// foi instruída a evitar, mesmo já sendo 2 objetos/campos `STATE.
// reviewCardState.kind` DISTINTOS desde a criação (nunca a mesma
// referência) -- ver relatório da Fase 6C.3 pra detalhe desta decisão.
//
// Fase 4b -- lê Note/CardInstance via resolveCardContentView(), nunca
// `card.clozeSentence`/`card.clozeAnswer`/`card.back_trans`/`card.audioUrl`
// (não existem mais no card nativo). `view.rawSentenceText` ainda tem
// {{cN::...}} embutido -- é este renderer que decide ocultar/revelar via
// renderClozeText(), não o resolver (comportamento intocado, o resolver
// já só devolve a marca que pertence a ESTA CardInstance -- markId --
// nunca todas de uma Note com múltiplas lacunas).
function renderClozeCard(mountEl, card, localState, callbacks){
  const view = resolveCardContentView(card);
  const answered = localState.answered;
  const blankHTML = answered
    ? `<span class="cloze-blank ${localState.wasCorrect ? 'correct' : 'incorrect'}" id="cloze-blank">${escapeHTML(view.displayAnswerText)}</span>`
    : `<span class="cloze-blank" id="cloze-blank">___</span>`;
  const hiddenSentence = renderClozeText(view.rawSentenceText, view.markId, { reveal: false });
  // Texto autorado: escapado ANTES de inserir o HTML da lacuna (escapeHTML
  // não altera '___').
  const sentenceHTML = escapeHTML(hiddenSentence).replace('___', () => blankHTML);
  // Fase 7a (ver CLAUDE.md) -- imagem/áudio agora resolvidos via o MESMO
  // Field de texto que carrega a frase inteira (`resolveClozeCardView()`
  // usa resolveCardField() por baixo agora, nunca mais lia `.audio.url`
  // direto do Field cru) -- todas as CardInstance (c1/c2/...) de uma
  // mesma Note compartilham esse Field, então nunca há mídia diferente
  // por lacuna (comportamento já garantido pela estrutura, não por
  // código especial aqui). Sem gate de revelação -- é a frase inteira
  // (lacuna incluída) que fica visível o tempo todo, nunca a resposta
  // isolada, então mostrar sempre não vaza nada (mesma conclusão da
  // auditoria da Fase 7).
  const clozeImageUrl = card.imageUrl || view.imageUrl || null;

  mountEl.innerHTML = `
    ${reviewProgressBarHTML(card)}
    <div class="flashcard" id="flashcard">
      <div class="flashcard-tag">${escapeHTML(reviewCardTagLabel(card))}</div>
      ${clozeImageUrl ? `<img src="${clozeImageUrl}" class="flashcard-image" alt="">` : ''}
      <div class="cloze-sentence">${LANG_HOOKS.reviewClozeSentenceHTML(sentenceHTML, view, answered)}</div>
      ${view.audioUrl ? customAudioBtnHTML(view.audioUrl) : ''}
      ${(answered || card.origin === 'teacher') && view.translation.text ? `<div class="cloze-trans">${escapeHTML(view.translation.text)}</div>` : ''}
    </div>
    ${!answered ? `
      <div class="cloze-type-wrap">
        <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t(LANG_HOOKS.lessonKeys.reviewClozePlaceholder)}">
        ${LANG_HOOKS.reviewTyped.inputExtraHTML(view.compareAnswerText)}
        <button class="btn btn-primary btn-block" id="cloze-review-verify-btn">${t('common.verify')}</button>
      </div>
    ` : `${LANG_HOOKS.reviewTyped.hintHTML(localState)}${reviewObservationHTML(card)}${typedResultActionsHTML(card, localState)}`}
  `;

  wireCustomAudioButtons(mountEl);

  if (!answered){
    const inputEl = mountEl.querySelector('#cloze-review-input');
    inputEl.focus();
    LANG_HOOKS.reviewTyped.wireInputExtra(mountEl, inputEl);
    function verify(){
      if (inputEl.disabled) return;
      inputEl.disabled = true;
      mountEl.querySelector('#cloze-review-verify-btn').disabled = true;
      // Interação intermediária (verificar) -- muta localState e o
      // renderer se autochama, sem envolver a sessão.
      localState.typedAnswer = inputEl.value;
      localState.answered = true;
      LANG_HOOKS.reviewTyped.check(inputEl.value, view.compareAnswerText, localState); // wasCorrect + quase (fr) ou tom (zh)
      renderClozeCard(mountEl, card, localState, callbacks);
    }
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    mountEl.querySelector('#cloze-review-verify-btn').addEventListener('click', verify);
  } else {
    // Errei (e o Difícil do "quase", no fr) são automáticos; acerto em cheio escolhe Bom ou Fácil (typedResultActionsHTML).
    wireTypedResultActions(mountEl, callbacks, localState, LANG_HOOKS.reviewTyped.wrongGrade(localState));
  }
}

// Fase 6C.2 (ver CLAUDE.md) -- renderer de "Digite a resposta", extraído
// pro contrato aprovado na Fase 6C: (mountEl, card, localState, callbacks).
// Antes (Fase 4) reaproveitava STATE.reviewClozeAnswered -- a MESMA
// variável global que o Cloze usava, só por convenção ("os dois nunca
// coexistem no mesmo cartão", nunca por desenho estrutural). Agora tem seu
// PRÓPRIO localState, estruturalmente independente -- Cloze (renderClozeCard,
// acima) também migrou pro próprio localState desde a Fase 6C.3, com
// `kind:'cloze'` distinto (nunca mais o mesmo campo global compartilhado
// entre os dois). Mesma lógica de comparação/compareAnswer/pinyin/
// revelação/confirmar de sempre, só a leitura/escrita de "já respondeu?"
// muda de STATE pra localState.
//
// localState: {kind:'type_answer', typedAnswer, answered, wasCorrect}.
function renderTypeAnswerCard(mountEl, card, localState, callbacks){
  const view = resolveCardContentView(card);
  const answered = localState.answered;
  const promptSpeakable = isStudyLanguageField(view.prompt, APP_KEY);
  // Fase 7a (ver CLAUDE.md) -- imagem do prompt vem do Field certo agora
  // (`view.prompt.imageUrl`, com o fallback legado de `card.imageUrl` só
  // pra Note-level histórico -- os dois nunca coexistem de verdade, ver
  // shared/flashcard-model.js). `view.answer` (Field resolvido inteiro,
  // achado #2 da auditoria da Fase 7 -- antes só o texto sobrevivia) só é
  // usado DEPOIS de `answered`, nunca antes -- mostrar o áudio/imagem da
  // resposta antes da revelação seria vazar a resposta.
  const promptImageUrl = card.imageUrl || view.prompt.imageUrl || null;
  const answerAudioUrl = (answered && view.answer && view.answer.audioUrl) || null;
  const answerImageUrl = (answered && view.answer && view.answer.imageUrl) || null;

  mountEl.innerHTML = `
    ${reviewProgressBarHTML(card)}
    <div class="flashcard" id="flashcard">
      <div class="flashcard-tag">${escapeHTML(reviewCardTagLabel(card))}</div>
      ${promptImageUrl ? `<img src="${promptImageUrl}" class="flashcard-image" alt="">` : ''}
      ${LANG_HOOKS.reviewPromptHTML(view, `${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${view.prompt.audioUrl ? customAudioBtnHTML(view.prompt.audioUrl) : ''}`)}
      ${answered ? `
        <div class="divider-line"></div>
        <span class="cloze-blank ${localState.wasCorrect ? 'correct' : 'incorrect'}">${escapeHTML(view.displayAnswerText)}</span>
        ${answerImageUrl ? `<img src="${answerImageUrl}" class="flashcard-image" alt="">` : ''}
        ${answerAudioUrl ? customAudioBtnHTML(answerAudioUrl) : ''}
      ` : ''}
    </div>
    ${!answered ? `
      <div class="cloze-type-wrap">
        <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t(LANG_HOOKS.lessonKeys.reviewTypePlaceholder)}">
        ${LANG_HOOKS.reviewTyped.inputExtraHTML(view.compareAnswerText)}
        <button class="btn btn-primary btn-block" id="cloze-review-verify-btn">${t('common.verify')}</button>
      </div>
    ` : `${LANG_HOOKS.reviewTyped.hintHTML(localState)}${reviewObservationHTML(card)}${typedResultActionsHTML(card, localState)}`}
  `;

  wireAudioButtons(mountEl, card.__isPreviewCard);
  wireCustomAudioButtons(mountEl);
  // Fase 7a -- `card.__isPreviewCard` suprime o AUTOPLAY; Fase 7d -- o
  // MESMO flag agora também isola o clique MANUAL (wireAudioButtons acima
  // já passa pra playAudioPreview() em vez de speakFrench() quando em
  // Preview) -- ver mesmo comentário em renderNormalCard().
  if (!card.__isPreviewCard && promptSpeakable && LANG_HOOKS.canSpeak(view.prompt.text)) LANG_HOOKS.speak(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);

  if (!answered){
    const inputEl = mountEl.querySelector('#cloze-review-input');
    inputEl.focus();
    LANG_HOOKS.reviewTyped.wireInputExtra(mountEl, inputEl);
    function verify(){
      if (inputEl.disabled) return;
      inputEl.disabled = true;
      mountEl.querySelector('#cloze-review-verify-btn').disabled = true;
      // Interação intermediária (verificar) -- muta localState e o
      // renderer se autochama, sem envolver a sessão.
      localState.typedAnswer = inputEl.value;
      localState.answered = true;
      LANG_HOOKS.reviewTyped.check(inputEl.value, view.compareAnswerText, localState); // wasCorrect + quase (fr) ou tom (zh)
      renderTypeAnswerCard(mountEl, card, localState, callbacks);
    }
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    mountEl.querySelector('#cloze-review-verify-btn').addEventListener('click', verify);
  } else {
    // Errei (e o Difícil do "quase", no fr) são automáticos; acerto em cheio escolhe Bom ou Fácil (typedResultActionsHTML).
    wireTypedResultActions(mountEl, callbacks, localState, LANG_HOOKS.reviewTyped.wrongGrade(localState));
  }
}

// Fase 6C.1 (ver CLAUDE.md) -- renderer de "Normal", extraído do bloco
// que antes vivia inline dentro de renderReviewView(). Contrato aprovado
// na Fase 6C: (mountEl, card, localState, callbacks) -- reutilizável tal
// e qual pelo Preview do editor (Fase 6D, ainda não construída), sem
// nenhuma segunda implementação paralela: o Preview vai chamar esta
// MESMA função, só trocando localState (variável local do editor, nunca
// STATE) e callbacks (onAnswered vira um no-op visual, nunca
// gradeCurrentCard). O renderer não sabe -- nem precisa saber -- se está
// em Review ou Preview.
//
// localState: {kind:'normal', revealed}. Único campo -- substitui
// STATE.reviewShowingAnswer (removido, era usado exclusivamente aqui).
// Nenhum acesso a STATE pra saber "revelado?" -- só localState.revealed.
//
// callbacks.onAnswered(wasCorrect, grade): chamado quando um botão de
// grau é clicado -- pra Normal não existe veredito certo/errado
// calculado pelo renderer (a aluna autorrelata via o grau escolhido),
// então `wasCorrect` é sempre null aqui; `grade` é o que importa.
// callbacks.onReviewMore(): chamado pelo link "Rever mais" -- extensão
// necessária além do onAnswered único esboçado na auditoria (Fase 6C),
// porque "Rever mais" é uma 3ª transição que não grada nada (não é
// "resposta", é só pedido de mais exposição) -- sinalizado aqui, não
// decidido em silêncio.
//
// Direção (K2-G): sempre estrutural -- resolveNormalCardView() devolve
// front/back na ordem certa (frontFieldIndex/backFieldIndex do CardInstance);
// nenhuma variável de sessão escolhe ou alterna A/B. Todo card chega aqui com
// CardInstance (Study Trail, Teacher e Self são todos nativos).
//
// Progresso (STATE.reviewIndex/reviewQueue.length): continua lido direto
// de STATE aqui, igual aos outros 3 renderers (MC/Cloze/TypeAnswer,
// ainda não extraídos nesta subfase) -- é contabilidade de SESSÃO, não
// estado efêmero de interação (a proibição da Fase 6C é especificamente
// sobre não ler STATE pra saber "revelado?"/"respondido?", não uma
// proibição geral de qualquer leitura). Uniformizar isso (ex: passar
// como parâmetro de contexto) fica pra quando os 4 renderers forem
// extraídos juntos -- não resolvido isoladamente só pro Normal, pra não
// introduzir um mecanismo que os outros 3 ainda não teriam.
function renderNormalCard(mountEl, card, localState, callbacks){
  let targetText, nativeText, frontAudioUrl, backAudioUrl, frontImageUrl, backImageUrl, targetIsSpeakable, frontPinyin;
  {
    const view = resolveCardContentView(card); // kind: 'normal'
    targetText = view.front.text;
    nativeText = view.back.text;
    frontPinyin = view.front.pinyinText; // zh mostra o pinyin embaixo do hanzi
    // Fase 7a (ver CLAUDE.md) -- áudio/imagem customizados resolvidos POR
    // LADO, nunca mais por fallback entre os dois (`front.audioUrl ||
    // back.audioUrl`, como era antes desta fase). Esse fallback era o
    // vazamento identificado na auditoria da Fase 7: se só o VERSO tinha
    // áudio/imagem próprio, ele aparecia junto do front, antes da
    // revelação -- entregando a resposta pelo ouvido/pela imagem mesmo com
    // o texto ainda escondido. Cada lado só expõe sua PRÓPRIA mídia agora;
    // o template abaixo já garante que a mídia do back só é desenhada
    // dentro do bloco `localState.revealed`, nunca antes.
    frontAudioUrl = view.front.audioUrl;
    backAudioUrl = view.back.audioUrl;
    frontImageUrl = view.front.imageUrl;
    backImageUrl = view.back.imageUrl;
    // isStudyLanguageField() aqui é o uso que a Fase 2 sempre permitiu:
    // direção já decidida (view.front já é o campo certo) -- isto só
    // decide se o motor de pronúncia (que só fala UM idioma real) pode
    // tentar esse campo específico.
    targetIsSpeakable = isStudyLanguageField(view.front, APP_KEY);
  }
  // Fase 7a/K2-G -- frontAudioUrl/frontImageUrl correspondem sempre ao que
  // `frenchSideHTML` mostra e backAudioUrl/backImageUrl ao que `transSideHTML`
  // mostra (a troca de lados de B é tratada abaixo, pela estrutura do CardInstance).
  //
  // Imagem LEGADA (`card.imageUrl`, nível de Note, populada só pelo
  // caminho `image_url` legado) nunca é duplicada no lado do verso --
  // continua aparecendo uma vez só, junto do front, exatamente como antes
  // desta fase. Pra cartão nativo, `card.imageUrl` é sempre `null`
  // (`Note.image` nunca é populado no caminho nativo, ver
  // shared/flashcard-model.js) -- o fallback abaixo nunca ativa os dois
  // ao mesmo tempo.
  const resolvedFrontImageUrl = card.imageUrl || frontImageUrl || null;
  const resolvedBackImageUrl = backImageUrl || null;
  const frenchSideHTML = LANG_HOOKS.reviewTargetHTML(targetText, frontAudioUrl, frontPinyin, false);
  const transSideHTML = `<div class="flashcard-trans">${escapeHTML(nativeText)}${backAudioUrl ? customAudioBtnHTML(backAudioUrl) : ''}</div>`;
  let frontHTML = frenchSideHTML;
  let backHTML = transSideHTML;
  // Áudio automático só quando o idioma estudado está do lado JÁ visível --
  // no modo padrão isso é o front (toca ao entrar no cartão), no modo
  // invertido é o back (toca só ao revelar a resposta).
  let frenchVisibleNow = true;
  let speakText = targetText;
  // K2-D: CardInstance nativo cuja FRENTE é a tradução e cujo VERSO é o
  // idioma estudado (ex.: Study Trail B): o botão de áudio/pronúncia acompanha
  // o campo do idioma estudado (verso), nunca a tradução. Direção continua
  // 100% do CardInstance; isto só decide de que lado fica o áudio.
  {
    const v = resolveCardContentView(card);
    if (!isStudyLanguageField(v.front, APP_KEY) && isStudyLanguageField(v.back, APP_KEY)){
      frontHTML = `<div class="flashcard-trans">${escapeHTML(v.front.text)}${frontAudioUrl ? customAudioBtnHTML(frontAudioUrl) : ''}</div>`;
      backHTML = LANG_HOOKS.reviewTargetHTML(v.back.text, backAudioUrl, v.back.pinyinText, true);
      frenchVisibleNow = localState.revealed;
      targetIsSpeakable = true;
      speakText = v.back.text;
    }
  }

  mountEl.innerHTML = `
    ${reviewProgressBarHTML(card)}
    <div class="flashcard" id="flashcard">
      <div class="flashcard-tag">${escapeHTML(reviewCardTagLabel(card))}</div>
      ${resolvedFrontImageUrl ? `<img src="${resolvedFrontImageUrl}" class="flashcard-image" alt="">` : ''}
      ${frontHTML}
      ${localState.revealed ? `
        <div class="divider-line"></div>
        ${resolvedBackImageUrl ? `<img src="${resolvedBackImageUrl}" class="flashcard-image" alt="">` : ''}
        ${backHTML}
      ` : `<div class="flashcard-hint">${t('review.tapToReveal')}</div>`}
    </div>
    ${localState.revealed ? `
      ${reviewObservationHTML(card)}
      ${gradeButtonsHTML(card)}
    ` : ''}
  `;

  mountEl.querySelector('#flashcard').addEventListener('click', () => {
    if (!localState.revealed){
      // Interação intermediária (revelar) -- o PRÓPRIO renderer se chama
      // de novo com os mesmos 4 parâmetros, sem envolver a sessão. Só a
      // transição FINAL (grau escolhido / Rever mais) sobe via callbacks.
      localState.revealed = true;
      renderNormalCard(mountEl, card, localState, callbacks);
    }
  });

  // Áudio disponível (e tocado automaticamente) sempre que o francês está
  // visível no cartão.
  // Fase 7d (ver CLAUDE.md) -- `card.__isPreviewCard` (Fase 6D.7) agora
  // isola TANTO o autoplay QUANTO o clique manual: `wireAudioButtons`
  // recebe o flag e decide, num único lugar, se um clique em `.audio-btn`
  // chama `speakFrench()` (registra `registerAudioPlay()` de verdade) ou
  // `playAudioPreview()` (mesma reprodução, sem nenhum efeito colateral de
  // analytics -- nunca STATE.totalAudioPlays/XP/badge/FSRS/histórico). O
  // autoplay abaixo continua suprimido por completo dentro do Preview
  // (mesmo comportamento já validado na Fase 7a -- nenhuma mudança aqui),
  // nunca redirecionado pra playAudioPreview() (não pedido, e "Preview sem
  // autoplay" já era o comportamento correto).
  wireAudioButtons(mountEl, card.__isPreviewCard);
  wireCustomAudioButtons(mountEl);
  if (!card.__isPreviewCard && frenchVisibleNow && targetIsSpeakable && LANG_HOOKS.canSpeak(speakText)){
    LANG_HOOKS.speak(speakText, mountEl.querySelector('.audio-btn-lg'), true);
  }

  if (localState.revealed){
    mountEl.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onAnswered(null, parseInt(btn.dataset.grade));
      });
    });
  }
}

// Título (tag) do cartão na Revisão: cartão de professora/aluna traz `unitTitleKey` (catálogo, shared/flashcard-model.js);
// cartão de trilha usa o título da unidade (conteúdo). Era flashcardUnitTitleText no fr e cardOriginTitle no zh, iguais.
function cardOriginTitle(card){
  return card.unitTitleKey ? t(card.unitTitleKey) : card.unitTitle;
}

// Combinar: o jogo não usa mais timer; a função vazia fica para as chamadas que já existiam (troca de aba, voltar aos modos).
function stopMatchTimer(){}
