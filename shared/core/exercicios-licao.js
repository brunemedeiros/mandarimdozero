// E4 lote 3: exercícios de lição (reconhecimento, jogo de pares, velocidade, conceitos, foco da lição, feedback).
// Extraído de fr/app.js e zh/app.js, onde o texto era IDÊNTICO nos dois (levantamento: docs/i18n/e4-levantamento-funcoes.md).
// Sem renomear: continuam funções globais (os <script> clássicos compartilham o escopo, então STATE, UNITS etc. do app.js
// são achados na hora da chamada). Editar AQUI vale para os dois idiomas; se um idioma precisar de comportamento próprio,
// declare a função no app.js dele com o mesmo nome e um comentário explicando (a declaração do app.js, carregada depois, vence).
// Carregado antes do app.js em fr/index.html e zh/index.html.

function stopExerciseAudio(){
  if (exerciseAudioEl){
    exerciseAudioEl.pause();
    exerciseAudioEl.currentTime = 0;
    exerciseAudioEl = null;
  }
  if (TTS.supported && window.speechSynthesis.speaking){
    window.speechSynthesis.cancel();
  }
  document.querySelectorAll('.audio-btn.speaking').forEach(b => b.classList.remove('speaking'));
}

function getClozeMode(){
  return localStorageSafeGet(CLOZE_MODE_KEY) === 'type' ? 'type' : 'choice';
}

function updateClozeModeSwitch(){
  const btn = document.getElementById('cloze-mode-switch');
  if (btn) btn.checked = getClozeMode() === 'type';
}

// Meta diária (plano de estudo) conta separado dos Desafios de hoje -- é uma
// régua mais exigente (ver artefato, §4): só lições com conteúdo real
// (`qualifies` filtra atalho degenerado, ex. lição minúscula demais) e nunca
// a mesma lição 2x no mesmo dia (replay não soma -- `key` identifica a lição
// de forma estável, ex. "A1-1:2" ou "A1-1:checkpoint").
function registerDailyLessonForGoal(key, qualifies){
  ensureDailyBucket();
  if (!qualifies || STATE.daily.goalCountedLessonKeys.includes(key)) return;
  STATE.daily.goalCountedLessonKeys.push(key);
  STATE.daily.lessonsForGoal += 1;
  STATE.dailyLessonsLog[todayStr()] = STATE.daily.lessonsForGoal;
}

function registerDailyMatchGame(){
  ensureDailyBucket();
  STATE.daily.matchGamesPlayed += 1;
  STATE.everUsedMatchGame = true;
}

// Formatos de exercício distintos respondidos corretamente hoje -- só pro
// badge "Multitarefa" (artefato §8: engajamento com a variedade do motor,
// não só o formato mais fácil). Chamado de dentro de exerciseXP(), que já é
// o único ponto por onde passam TODOS os formatos de exercício ao acertar.
function registerDailyExerciseFormat(format){
  ensureDailyBucket();
  if (!format) return;
  if (!STATE.daily.exerciseFormatsSeen.includes(format)) STATE.daily.exerciseFormatsSeen.push(format);
  // Contagem por formato -- alimenta desafios ligados a um formato
  // específico (ex. "Traduza a frase" = reorder), não só a checagem de
  // diversidade do badge "Multitarefa".
  STATE.daily.exerciseFormatCounts[format] = (STATE.daily.exerciseFormatCounts[format] || 0) + 1;
}

function missionMatchGameFeasible(){
  // Mesmo teto que desabilita o card "Combinar" na tela de Revisão.
  return eligibleReviewPool().length >= 10;
}

// ---------- Lições (Modelo B) ----------
// Unidades migradas (ver "Redesenho da Granularidade") têm `unit.lessons`:
// cada lição é autocontida (intro -> checagem -> prática, SEM misturar com
// lições anteriores dentro da mesma sessão -- causa-raiz nº1 do redesenho).
// Unidades ainda não migradas continuam com o motor antigo de blocos
// mecânicos (buildAcquisitionBlocks), inalterado.
function isLessonUnit(u){
  return !!(u && Array.isArray(u.lessons) && u.lessons.length);
}

function currentLessonIdx(unitId){
  if (STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === unitId){
    return STEP_STATE.lessonReview.reviewIdx;
  }
  return STATE.unitProgress[unitId]?.lessonIdx || 0;
}

function currentLesson(u){
  const idx = Math.min(currentLessonIdx(u.id), u.lessons.length - 1);
  return u.lessons[idx];
}

// ---------- Modo foco de lição (estilo Busuu) ----------
// Esconde topbar/tabs enquanto o aluno está numa lição, checkpoint ou teste
// de nível — só a barra de progresso e o X ficam visíveis por cima do
// exercício em si.
function setLessonFocusMode(active){
  document.getElementById('app').classList.toggle('lesson-focus', active);
  // #review-reminder-banner é fixed e vive FORA de #app (irmão dele no
  // documento, não descendente) -- a classe no <body> é o que dá pra essa
  // regra de CSS (ver index.html) esconder o banner sem também precisar
  // mover o elemento de lugar no HTML.
  document.body.classList.toggle('lesson-focus', active);
  // Saiu da lição: se o lembrete de revisão do dia ainda não foi visto, é a hora.
  if (!active && typeof maybeShowReviewReminder === 'function') maybeShowReviewReminder();
}

// XP de um acerto (valores em shared/srs.js: EXERCISE_XP_RECOGNIZE/PRODUCE/ALMOST, decisão de 2026-10-15): um pouco menor quando o aluno pediu "Não sei" (e por
// tabela recebeu a dica) nesse exercício -- preserva a distinção acerto
// independente > acerto com ajuda sem criar um sistema de pontuação
// complexo.
function exerciseXP(ex, fullXP){
  // Revisão de uma lição JÁ CONCLUÍDA (ver STEP_STATE.lessonReview, aberta
  // clicando numa lição "done" na Trilha -- qualquer aluno pode, não só
  // admin): o comentário original em finishCurrentLesson já dizia que
  // "nenhum XP de lição/desafio/meta diária deve contar de novo" nesse
  // modo, mas só o fechamento da lição (finishCurrentLesson) checava isso
  // -- cada exercício respondido DENTRO da revisão continuava pagando XP
  // normalmente (achado de auditoria: fonte de XP infinita, sem limite).
  // Único ponto por onde passam TODOS os formatos de exercício ao acertar
  // (ver os 6 chamadores de addXP(exerciseXP(...))) -- aproveita pra
  // fechar a brecha aqui, de uma vez, em vez de repetir a checagem em cada
  // um dos 6 lugares.
  if (STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === STATE.currentUnitId) return 0;
  registerDailyExerciseFormat(ex.format);
  return ex.askedDontKnow ? Math.max(1, fullXP - 1) : fullXP;
}

// ---------- Construção das filas de exercício da sessão de aquisição ----------
// Um exercício "de palavra" (múltipla escolha/digitar/ouvir), reaproveitado
// tanto na prática de bloco quanto na mistura -- extraído do antigo
// buildExerciseSet pra poder gerar UM item de cada vez, não só a unidade
// inteira de uma tacada. `vocabIdx` fica anexado ao próprio exercício pra
// permitir rastrear erro por palavra (ver showCorrectFeedbackPanel/showAnswerPanel).
// Escolhe o formato do exercício pelo OBJETIVO PEDAGÓGICO do momento e pelo
// estado real da palavra (exposição no SRS + erros nesta sessão) -- não mais
// por posição no array (round-robin arbitrário, `idx % formats.length`, não
// tinha nenhuma relação com o que a palavra precisava agora).
//   - 'practice' (primeira prática, logo após a checagem do bloco): ainda é
//     cedo pra cobrar produção de uma palavra genuinamente nova -- só entra
//     "type" (digitar de ouvido) se a palavra já vinha exposta de fora desta
//     sessão (SRS prévio ou "Já sei?").
//   - 'mixed'/'consolidation' (a palavra já passou por checagem + prática
//     nesta sessão): quem foi bem (sem erro na sessão) e já tem alguma
//     exposição sobe pra produção; quem errou continua em reconhecimento --
//     não empurra produção pra cima de quem ainda está com dificuldade.
// Sem `intent` (chamada avulsa), mantém o comportamento mais conservador de
// reconhecimento, igual ao de 'practice'.
function pickVocabFormat(unit, idx, intent){
  const cardId = studyWordCardId(unit, idx); // chave estável do item (shared/study-trail-model.js)
  const card = STATE.cards.find(c => c.id === cardId);
  const exposed = studyWordHasEvidence(studyWordCardsFor(STATE.cards, unit.id, idx)); // K2-E: nível de palavra
  const misses = (STEP_STATE.acq && STEP_STATE.acq.wordMisses[idx]) || 0;

  if (intent === 'mixed' || intent === 'consolidation'){
    if (exposed && misses === 0) return shuffle(['type', 'listen', 'meaning'])[0];
    return shuffle(['meaning', 'listen'])[0];
  }
  if (exposed) return shuffle(['meaning', 'type', 'listen'])[0];
  return shuffle(['meaning', 'listen'])[0];
}

function buildVocabWordExercise(unit, idx, intent){
  const item = unit.vocab[idx];
  const format = pickVocabFormat(unit, idx, intent);
  const pool = unit.vocab;
  const distractors = shuffle(pool.filter(v => v !== item)).slice(0, 3);
  const options = shuffle([item, ...distractors]);
  return { format, item, options, vocabIdx: idx };
}

// Conceitos cujo gatilho é "depois deste bloco de vocabulário" (o mais comum
// -- a palavra que motiva a explicação acabou de ser apresentada).
function pendingConceptsForBlock(u, blockIdx){
  if (!u.concepts || !u.concepts.length) return [];
  const idxInBlock = new Set(STEP_STATE.acq.blocks[blockIdx]);
  return u.concepts.filter(c =>
    typeof c.trigger.afterVocabIdx === 'number' &&
    idxInBlock.has(c.trigger.afterVocabIdx) &&
    !STEP_STATE.conceptsShown.has(c.id)
  );
}

// Conceitos cujo gatilho só existe em contexto (diálogo) -- a palavra em si
// não é vocabulário novo da unidade, só aparece dentro da fala.
function pendingConceptsAfterDialogue(u){
  if (!u.concepts || !u.concepts.length) return [];
  return u.concepts.filter(c => c.trigger.after === 'dialogue' && !STEP_STATE.conceptsShown.has(c.id));
}

// Mostra `list` (pode ser vazia) um cartão de cada vez e só chama `afterFn`
// quando o aluno tiver passado por todos -- se `list` já vier vazia, chama
// `afterFn` na hora, então quem chama isso não precisa checar antes.
function runConceptQueueThen(list, afterFn){
  if (!list.length){ afterFn(); return; }
  STEP_STATE.conceptQueue = list;
  STEP_STATE.conceptIdx = 0;
  STEP_STATE.conceptBlockIdx = 0;
  STEP_STATE.conceptAfterFn = afterFn;
  renderConceptStep();
}

function advanceConceptStep(){
  const concept = STEP_STATE.conceptQueue[STEP_STATE.conceptIdx];
  if (STEP_STATE.conceptBlockIdx < concept.blocks.length - 1){
    STEP_STATE.conceptBlockIdx += 1;
    renderConceptStep();
    return;
  }
  STEP_STATE.conceptsShown.add(concept.id);
  if (STEP_STATE.conceptIdx < STEP_STATE.conceptQueue.length - 1){
    STEP_STATE.conceptIdx += 1;
    STEP_STATE.conceptBlockIdx = 0;
    renderConceptStep();
    return;
  }
  hideAcqPhaseBanner();
  const afterFn = STEP_STATE.conceptAfterFn;
  STEP_STATE.conceptQueue = [];
  STEP_STATE.conceptAfterFn = null;
  afterFn();
}

// Vocabulário/frases da tela "Lição concluída!" -- SÓ o que ESTA lição
// especificamente ensinou (lesson.vocabIdx), nunca a unidade inteira (ver
// CLAUDE.md, "Coerência pedagógica entre funcionalidades": reaproveitar
// conteúdo só porque está "por perto" no código, sem responder à pergunta
// certa, é exatamente o erro que gerou aquela regra). O Ponto de
// verificação não ensina vocabulário próprio (vocabIdx sempre []) -- em vez
// de forjar uma lista ou reaproveitar a unidade toda, mostra as palavras que
// o aluno ERROU NESTE PRÓPRIO Ponto de verificação (STEP_STATE.checkpointMisses,
// contagem real por palavra desta sessão -- ver comentário em
// STEP_STATE.checkpointMisses sobre por que NÃO é lessonMisses/lessonIdx:
// aquele acumula por lição/unidade ao longo do tempo e ficava desatualizado
// quando o checkpoint era aberto sem passar pelo passo 'vocab' antes na
// mesma sessão, mostrando uma lista que não correspondia ao erro que o
// aluno acabou de cometer -- bug relatado, 2026-09-15). Sem vocabIdx e sem
// erro nenhum registrado nesta sessão (sessão perfeita), devolve lista
// vazia -- honesto, não inventa.
function lessonRecapItems(u, lesson){
  if (lesson && lesson.vocabIdx && lesson.vocabIdx.length){
    return lesson.vocabIdx.map(i => u.vocab[i]).filter(Boolean);
  }
  const misses = STEP_STATE.checkpointMisses || {};
  return Object.keys(misses)
    .map(Number)
    .filter(i => misses[i] >= 1)
    .sort((a, b) => misses[b] - misses[a])
    .slice(0, 8)
    // Unidade sem vocabulário (gramática): os erros guardados são de OUTRA unidade (Ponto de verificação anterior na mesma
    // sessão); sem esta guarda, u.vocab undefined quebrava a tela e o "Ver resultado" da gramática não fazia nada (paridade 5d).
    .map(i => (u.vocab || [])[i])
    .filter(Boolean);
}

function dlgAutoplayOn(){
  try { return localStorage.getItem(DLG_AUTOPLAY_KEY) !== '0'; } catch(e){ return true; }
}

function dlgSetAutoplay(on){
  try { localStorage.setItem(DLG_AUTOPLAY_KEY, on ? '1' : '0'); } catch(e){}
}

function dlgSleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function dlgShuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildConsolidationVocabExercises(unit){
  const acq = STEP_STATE.acq;
  const total = unit.vocab.length;
  if (!acq || acq.unitId !== unit.id || !acq.blocks.length){
    return unit.vocab.map((_, i) => buildVocabWordExercise(unit, i, 'consolidation'));
  }

  const cap = Math.min(total, CONSOLIDATION_CAP);
  const allIdx = Array.from({ length: total }, (_, i) => i);
  const missedIdx = shuffle(allIdx.filter(i => (acq.wordMisses[i] || 0) >= 1));
  const otherIdx = shuffle(allIdx.filter(i => !missedIdx.includes(i)));

  const picks = [];
  missedIdx.forEach(i => { if (picks.length < cap) picks.push(i); });
  otherIdx.forEach(i => { if (picks.length < cap) picks.push(i); });
  missedIdx.forEach(i => { if (picks.length < cap) picks.push(i); }); // reforço extra, só se sobrar espaço

  return picks.map(i => buildVocabWordExercise(unit, i, 'consolidation'));
}

// ---------- Distratores do exercício "Ordene a frase" ----------
// Quantos blocos-isca entram: cresce com a complexidade da frase (mais
// blocos na frase certa = mais espaço pra isca sem virar uma sopa de
// botões) e com o nível da unidade no currículo -- capado em 4. O chinês só
// tem o nível HSK1 hoje (LEVELS.length === 1), então levelIdx fica sempre 0
// -- a fórmula já fica pronta pra quando houver mais níveis, sem precisar
// mexer aqui de novo.
function reorderDistractorCount(unit, correctBlocks){
  const levelIdx = Math.max(0, LEVELS.findIndex(l => l.id === unit.level));
  const base = Math.max(1, Math.floor((correctBlocks.length - 1) / 2));
  return Math.min(4, base + levelIdx);
}

function clearKeyboardOptions(){ KEYBOARD_OPTION_MAP = null; }

// buttons: os elementos já renderizados na tela.
// mode 'grid2x2': só ativa com exatamente 4 opções E confirma, pela posição
//   REAL na tela (getBoundingClientRect, não a ordem do array), que formam
//   duas linhas de duas colunas -- se o layout não bater com isso (ex.: uma
//   coluna só), desativa em vez de forçar uma correspondência errada. A
//   numeração segue a ordem de leitura (1=superior esquerda, 2=superior
//   direita, 3=inferior esquerda, 4=inferior direita).
// mode 'sequential': 1 = primeira opção na ordem de leitura, 2 = segunda...
// badgeSelector: elemento QUE JÁ EXISTE dentro do botão pra escrever o
//   número (ex. ".scenario-option-num", que já aparece na tela) -- evita
//   duplicar um indicador onde a interface já mostra a posição.
function wireKeyboardOptions(buttons, { mode = 'sequential', badgeSelector = null } = {}){
  const list = Array.from(buttons);
  if (!list.length || list.length > 4){ clearKeyboardOptions(); return; }

  let ordered;
  if (mode === 'grid2x2' && list.length === 4){
    const withRect = list.map(el => ({ el, r: el.getBoundingClientRect() }));
    withRect.sort((a, b) => (a.r.top - b.r.top) || (a.r.left - b.r.left));
    const sameRow = (a, b) => Math.abs(a.r.top - b.r.top) < 4;
    const isTwoByTwo = sameRow(withRect[0], withRect[1]) && sameRow(withRect[2], withRect[3])
      && !sameRow(withRect[0], withRect[2])
      && withRect[0].r.left < withRect[1].r.left && withRect[2].r.left < withRect[3].r.left;
    if (!isTwoByTwo){ clearKeyboardOptions(); return; } // layout reorganizado (ex. mobile) -- não força
    // withRect já está ordenado por posição real (linha, depois coluna) --
    // é exatamente a ordem de leitura que queremos: 1=sup.esq, 2=sup.dir,
    // 3=inf.esq, 4=inf.dir.
    ordered = withRect.map((x, i) => ({ key: String(i + 1), el: x.el }));
  } else {
    ordered = list.map((el, i) => ({ key: String(i + 1), el }));
  }

  KEYBOARD_OPTION_MAP = ordered;
  ordered.forEach(({ key, el }) => {
    const existingBadge = badgeSelector ? el.querySelector(badgeSelector) : null;
    if (existingBadge){
      existingBadge.textContent = key;
    } else if (!el.querySelector('.kbd-hint')){
      const hint = document.createElement('span');
      hint.className = 'kbd-hint';
      hint.textContent = key;
      el.appendChild(hint);
    }
  });
}

function nextCorrectFeedbackPhrase(){
  if (!correctFeedbackQueue.length) correctFeedbackQueue = shuffle([...CORRECT_FEEDBACK_PHRASES]);
  return t(correctFeedbackQueue.pop());
}

function nextComboPhrase(){
  if (!comboPhraseQueue.length) comboPhraseQueue = shuffle([...COMBO_PHRASES]);
  return t(comboPhraseQueue.pop());
}

function buildSpeedQueue(){
  // Prop 5 (ver CLAUDE.md, "7 propostas") -- "Filtro de fila" removido da
  // UI (Todas/Mais difíceis primeiro/Mais antigas primeiro deixaram de ser
  // escolha da aluna); comportamento travado em 'oldest' -- era o padrão
  // de sempre, o único dos 3 que continua respeitando "Intensidade da
  // sessão" (ver reviewFilterQueue), diferente de 'all' (que ignoraria
  // esse teto e tornaria o controle de Intensidade sem efeito nenhum).
  // Valor salvo em STATE.studySettings.reviewFilter não é apagado (só
  // deixou de ser lido) -- ver reviewFilterQueue().
  // K2-F: Speed é exercício de vocabulário -> projeção da palavra (A) para a
  // trilha; B continua existindo para Review/FSRS/Deck, só não vira 2ª palavra.
  return reviewFilterQueue('oldest', projectStudyWordsToA(eligibleReviewPool().filter(hasPlainFrontBack)));
}

function buildSpeedOptions(card){
  // Fase 8a (ver CLAUDE.md) -- cartão de múltipla escolha autorado usa as
  // opções ERRADAS que a professora escreveu, nunca os distratores
  // automáticos abaixo (mais preciso/intencional pro que ela quis testar
  // especificamente nesse cartão). Objetos pseudo-carta (`displayAnswerText`,
  // lido por cardAnswerText() acima) -- o resto do fluxo (answerSpeedQuestion)
  // compara identidade com `card` pra saber se ACERTOU, e só usa o texto
  // pra exibição, então funciona sem mudança nenhuma lá.
  if (card.cardInstance.cardTypeId === 'multiple_choice'){
    const view = resolveCardContentView(card);
    return shuffle([card, ...view.distractorTexts.map(text => ({ displayAnswerText: text }))]);
  }
  // hasPlainFrontBack() nos dois filtros abaixo -- achado no smoke test da
  // Fase 4: cartões nativos (teacher/self) sempre compartilham `unitId:
  // null`, então o agrupamento por unidade tratava TODOS os cartões
  // nativos como "mesma unidade" entre si, inclusive um cloze/"digite a
  // resposta" ao lado de um card 'normal'. Antes da Fase 4 isso nunca
  // quebrava (o bridge legado sempre populava back_trans plano em
  // qualquer tipo); agora resolveClozeCardView()/resolveTypeAnswerCardView()
  // não têm `.back`, e cardAnswerText() quebraria ao tentar ler
  // view.back.text de um distrator desse tipo. Nunca oferecer um cloze/
  // "digite a resposta" como opção de múltipla escolha de qualquer forma
  // (não são pares prompt/resposta curtos, mesmo critério de sempre).
  // K2-F: distratores = 1 por palavra (projeção A); B nunca é distrator.
  const pool = projectStudyWordsToA(STATE.cards.filter(c => c !== card && c.unitId === card.unitId && hasPlainFrontBack(c)));
  let distractors = shuffle(pool).slice(0, 3);
  if (distractors.length < 3){
    // Fallback só quando a unidade não tem 3 outras cartas -- puxa de
    // eligibleReviewPool() (não STATE.cards puro) pra não arriscar mostrar,
    // mesmo como alternativa errada, uma palavra de uma unidade nunca aberta.
    const extra = shuffle(projectStudyWordsToA(eligibleReviewPool()).filter(c => c !== card && hasPlainFrontBack(c) && !distractors.includes(c))).slice(0, 3 - distractors.length);
    distractors = distractors.concat(extra);
  }
  return shuffle([card, ...distractors]);
}

// ---------- Resumo "Suas palavras" (fracas/medianas/fortes) ----------
// SOMENTE uma contagem visual do vocabulário já revisável (eligibleReviewPool,
// a mesma base do Flashcard/Speed Review/Combinar/Palavras difíceis) -- não é
// um SRS novo, não abre carta nenhuma, não é modo de revisão. Critérios
// reaproveitados do que já existe:
//   Fracas  = reps === 0 (nunca lembrada com sucesso) OU lapses >= 2 (regra
//             independente da que define "Palavras difíceis" desde a Fase
//             7 -- hardWordsPool() passou a usar difficulty do FSRS, sem
//             filtro de due; este widget é escopo da Fase 12, não mudou).
//   Fortes  = reps > 0 && lapses < 2 && interval >= 60 -- o mesmo corte de
//             "revisão madura" (cartão que o aluno já domina).
//   Medianas = o resto do pool.
function vocabStrengthBuckets(){
  const pool = eligibleReviewPool();
  // K.3: força é por NOTE (conteúdo) -- A+B da trilha, reverso e Cloze contam
  // uma vez. Nenhuma irmã estudada = notStarted (nunca "fraca"); com estudadas
  // = a mais fraca entre elas. Fonte: shared/analytics-metrics.js.
  // Cartões "Na frase" não são palavras: ficam fora de "Suas palavras".
  const st = contentMetrics(pool.filter(c => !isStudyTrailPhraseCard(c))).strength;
  return { notStarted: st.not_started, weak: st.weak, medium: st.medium, strong: st.strong };
}

// Altura do "pote" proporcional à maior das 3 categorias (não à contagem
// absoluta) -- é isso que deixa claro de relance qual predomina, com um piso
// de 10% pra uma categoria pequena continuar visível em vez de sumir.
function renderVocabStrengthWidget(){
  const wrap = document.getElementById('vocab-strength-widget');
  if (!wrap) return;
  const { notStarted, weak, medium, strong } = vocabStrengthBuckets();
  if (notStarted + weak + medium + strong === 0){ wrap.innerHTML = ''; return; }
  const max = Math.max(notStarted, weak, medium, strong, 1);
  const h = n => Math.max(10, Math.round(n / max * 100));
  const item = (tier, count, label) => `
    <div class="vs-item">
      <div class="vs-jar"><div class="vs-fill" data-tier="${tier}" style="height:${h(count)}%;"></div></div>
      <div class="vs-text"><div class="vs-count">${count}</div><div class="vs-label">${label}</div></div>
    </div>
  `;
  wrap.innerHTML = `
    <div class="section-label">${t('review.strength.title')}</div>
    <div class="vocab-strength-row">
      ${item('none', notStarted, t('review.strength.notStarted'))}
      ${item('weak', weak, t('review.strength.weak'))}
      ${item('mid', medium, t('review.strength.medium'))}
      ${item('strong', strong, t('review.strength.strong'))}
    </div>
    <p class="profile-edit-hint">${t('review.strength.hint')}</p>
  `;
}

// Tela de escolha do tamanho da sessão -- aparece ao entrar no Combinar
// (não ao clicar "Jogar de novo", que reaproveita o último tamanho
// escolhido direto via startMatchGame).
function renderMatchSizePicker(){
  const el = document.getElementById('match-review-content');
  const poolLen = projectStudyWordsToA(eligibleReviewPool()).length; // K2-F: palavras, não CardInstances da trilha
  const minPairs = Math.min(...MATCH_SIZE_OPTIONS);
  if (poolLen < minPairs * 2){
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🧩</div>
        <h3>${t('review.insufficientTitle')}</h3>
        <p>${t('review.match.insufficientMin', { n: minPairs * 2 })}</p>
      </div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="match-size-picker">
      <div class="big-emoji">🧩</div>
      <h3>${t('review.match.pickTitle')}</h3>
      <div class="match-size-options">
        ${MATCH_SIZE_OPTIONS.map(n => `
          <button class="match-size-btn ${MATCH_STATE.pairSize === n ? 'selected' : ''}" data-pairs="${n}" ${poolLen < n * 2 ? 'disabled' : ''}>
            <div class="match-size-num">${n}</div>
            <div class="match-size-label">${t('review.match.pairsLabel', { cards: n * 2 })}</div>
          </button>
        `).join('')}
      </div>
      <button class="btn btn-primary" id="match-size-start-btn">${t('review.match.start')}</button>
    </div>
  `;
  el.querySelectorAll('.match-size-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      MATCH_STATE.pairSize = parseInt(btn.dataset.pairs, 10);
      renderMatchSizePicker();
    });
  });
  document.getElementById('match-size-start-btn').addEventListener('click', startMatchGame);
}

function startMatchGame(){
  trackEvent('lesson_start', 'match_game', null);
  // Fase 4: seleção via getStudyQueue(scope:'all') -- mesmo pool de antes,
  // Combinar é prática de reconhecimento, não revisão SRS.
  // K2-F: Combinar = vocabulário -> 1 par por palavra (projeção A na trilha).
  const pool = shuffle(getStudyQueue(projectStudyWordsToA(eligibleReviewPool().filter(hasPlainFrontBack)), { scope: 'all' }));
  const pairCount = Math.min(MATCH_STATE.pairSize, pool.length);
  MATCH_STATE.pairs = pool.slice(0, pairCount);
  MATCH_STATE.tiles = shuffle([
    ...MATCH_STATE.pairs.map(c => ({ cardId: c.id, side: 'front', text: cardPromptText(c) })),
    ...MATCH_STATE.pairs.map(c => ({ cardId: c.id, side: 'back', text: cardAnswerText(c) }))
  ]);
  MATCH_STATE.selected = null;
  MATCH_STATE.matchedCount = 0;
  MATCH_STATE.attempts = 0;
  MATCH_STATE.busy = false;
  MATCH_STATE.startedAt = Date.now();

  renderMatchGame();
}

function renderMatchTiles(){
  const gridEl = document.getElementById('match-grid');
  gridEl.innerHTML = MATCH_STATE.tiles.map((t, i) => `
    <button class="match-tile" data-idx="${i}" data-card-id="${t.cardId}" data-side="${t.side}">
      <div class="match-tile-inner">
        <div class="match-tile-face match-tile-back"><span>?</span></div>
        <div class="match-tile-face match-tile-front">${escapeHTML(t.text)}</div>
      </div>
    </button>
  `).join('');

  gridEl.querySelectorAll('.match-tile').forEach(btn => {
    btn.addEventListener('click', () => onMatchTileClick(btn));
  });
}

function stopSpeedTimer(){
  if (SPEED_STATE.timerHandle){
    clearInterval(SPEED_STATE.timerHandle);
    SPEED_STATE.timerHandle = null;
  }
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

// Em que lição da unidade (posição em u.lessons) um vocabIdx foi ensinado --
// -1 se nenhuma lição declarar esse índice (unidades de gramática, que não
// têm lessons, nunca chegam aqui -- buildCardsFromUnits já pula esse tipo
// de unidade inteiramente; serve só de guarda defensiva).
function lessonIndexForVocabIdx(unit, vocabIdx){
  return (unit.lessons || []).findIndex(l => (l.vocabIdx || []).includes(vocabIdx));
}
