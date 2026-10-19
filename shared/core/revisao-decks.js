// E4 lote 2: revisão e decks (fila, sessão, resumo, humor de cartão, missões de revisão, filtros).
// Extraído de fr/app.js e zh/app.js, onde o texto era IDÊNTICO nos dois (levantamento: docs/i18n/e4-levantamento-funcoes.md).
// Sem renomear: continuam funções globais (os <script> clássicos compartilham o escopo, então STATE, UNITS etc. do app.js
// são achados na hora da chamada). Editar AQUI vale para os dois idiomas; se um idioma precisar de comportamento próprio,
// declare a função no app.js dele com o mesmo nome e um comentário explicando (a declaração do app.js, carregada depois, vence).
// Carregado antes do app.js em fr/index.html e zh/index.html.

// Fase 3 do sistema de alunas particulares (ver CLAUDE.md) -- cartão
// autorado por uma professora (shared/teacher-flashcards.js, tabela
// teacher_flashcards), atribuído a ESTA aluna. Mesmo shape de card que
// buildCardsFromUnits() produz (mesmo motor de memória/FSRS, mesma
// getStudyQueue()) -- só ORIGEM diferente. id `t${row.id}` -- namespace
// separado de `u${unitId}-v${idx}`, nunca colide. `unitId`/`vocabIdx`
// ficam `null` de propósito -- isCardLessonCompleted() trata
// `origin==='teacher'` como caso à parte, sem o gate de lição.
// `flashcardStatus` espelha `status` da linha (ativo/arquivado).
//
// Diferente do fr (um único campo `front`), o cartão de revisão do zh
// exige hanzi e pinyin em campos SEPARADOS (front_pinyin/back_hanzi --
// ver renderReviewView, sempre mostra os dois juntos, nunca um sozinho).
// `row.front` (o que a professora digitou como "frente") mapeia pra
// `back_hanzi`; `row.front_pinyin` (campo extra só pra mandarim, migration
// 027) mapeia pra `front_pinyin` -- `|| ''` pra nunca renderizar a string
// literal "undefined" se a professora deixou o pinyin em branco.
// Prompt-mestre "flashcards -- 7 propostas" (ver CLAUDE.md) -- id ganha um
// sufixo de revisão quando o cartão já foi editado (revision>0). Mesmo
// mecanismo de fr/app.js -- ver comentário lá pra detalhe completo do
// "reset via id novo". Prop 1+2 (seletor de direção idioma estudado/
// nativo) NÃO se aplica ao zh -- ver nota em buildCardFromTeacherFlashcard
// abaixo -- então frontIsTargetLanguage não é lido aqui de propósito.
function flashcardIdForRow(prefix, row){
  return row.revision > 0 ? `${prefix}${row.id}-r${row.revision}` : `${prefix}${row.id}`;
}

// Prop 1+2 (ver CLAUDE.md, "7 propostas") -- o seletor "qual lado é o
// idioma estudado" NÃO se aplica ao zh: fr tem 2 campos simétricos (front/
// back_trans, cada um uma string simples, qualquer um pode ser o idioma
// estudado); zh tem 3 campos ASSIMÉTRICOS (front_pinyin+back_hanzi formam
// um PAR fixo -- hanzi sempre vem com pinyin do lado, nunca sozinho --
// enquanto back_trans é uma string solta). Não existe um "back_pinyin"
// pra completar o par se a direção fosse invertida, então o zh continua
// sempre back_hanzi=idioma estudado/back_trans=tradução, como já era --
// front_is_target_language é gravado na tabela (mesma coluna que o fr
// usa) mas nunca lido no client zh. shared/admin-flashcards.js esconde o
// seletor da UI quando a aluna selecionada é de mandarim (ver lá).
// Fase 4b do prompt-mestre "reestruturação inspirada no Anki" (ver
// CLAUDE.md): esta função NÃO usa mais a ponte -- delega pra
// buildEngineCardsFromRow() (shared/flashcard-model.js), que devolve o(s)
// card(s) já no shape NATIVO (`note`+`cardInstance`, sem campo de
// conteúdo legado solto).
// Fase 5, fechamento (ver CLAUDE.md) -- ANTES desta correção, esta
// função devolvia só `[0]` do array (correto até então, quando nenhuma
// linha produzia mais de 1 CardInstance). O motor da Fase 5 passou a
// produzir 2+ CardInstances por linha (normal_reversed, Cloze
// multi-marca) -- `[0]` truncava silenciosamente as demais. Contrato
// agora é `buildCardFromTeacherFlashcard(row) -> Card[]` (sempre um
// array, 1 elemento pra todo dado legado -- zero mudança de
// comportamento pra eles); quem chama espalha o array em STATE.cards.
function buildCardFromTeacherFlashcard(row){
  return buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' });
}

// Fase 5 do sistema de alunas particulares (ver CLAUDE.md) -- cartão
// autorado pela PRÓPRIA aluna (shared/own-flashcards.js, tabela
// own_flashcards). Irmão de buildCardFromTeacherFlashcard() -- mesmo
// shape de card (mesmo motor de memória/FSRS, mesma getStudyQueue()), só
// ORIGEM diferente. id `s${row.id}` -- terceiro namespace, nunca colide com
// `u${unitId}-v${idx}` (trilha) nem `t${row.id}` (professora, tabela
// DIFERENTE -- ids podem coincidir numericamente entre as duas tabelas sem
// problema, o prefixo já resolve). `unitId`/`vocabIdx` ficam `null` pelo
// mesmo motivo do cartão de professora -- isCardLessonCompleted() trata
// `origin==='self'` igual a `origin==='teacher'` (mesmo gate por
// `flashcardStatus`, sem o gate de lição).
// Prompt-mestre "reformulação gratuito x premium" (ver CLAUDE.md) --
// imageUrl/audioUrl/choices/clozeSentence/clozeAnswer: mesmos 4 campos
// opcionais já usados por buildCardFromTeacherFlashcard() acima (Fase
// 8a/8c), agora também presentes em cartão próprio (migration 040). Gate
// de "é premium?" fica só na UI de criação (shared/my-flashcards.js) --
// renderReviewView()/buildSpeedOptions() já são origin-agnósticos (checam
// card.choices/card.clozeSentence direto, nunca card.origin), então um
// cartão próprio com esses campos populados já funciona sem nenhuma
// mudança no motor de revisão.
// Fase 4b (ver comentário de buildCardFromTeacherFlashcard acima, mesmo
// princípio) -- irmã gêmea, só troca origin/idPrefix.
// Fase 5, fechamento -- mesmo contrato `-> Card[]` da irmã (ver comentário
// completo em buildCardFromTeacherFlashcard acima).
function buildCardFromSelfFlashcard(row){
  return buildEngineCardsFromRow(row, { origin: 'self', appKey: APP_KEY, idPrefix: 's' });
}

// Único ponto de checagem "esta categoria pode aparecer neste nível" --
// qualquer código futuro que filtre notas de realidade por nível deve
// chamar isto em vez de reimplementar a lógica. Hoje só é chamável com
// level='HSK1' de verdade (os outros níveis não têm unidade nenhuma), mas
// já existe pronta pra quando isso deixar de ser verdade.
function isRealityNoteCategoryAllowedAtLevel(category, level){
  const guidance = REALITY_NOTE_LEVEL_GUIDANCE[level];
  return !!guidance && guidance.categoriesAllowed.includes(category);
}

function maybeShowReviewReminder(){
  const today = todayStr();
  if (STATE.lastReviewReminderDay === today) return;

  // K.7: Devido = não-New com due<=agora (structuralCounts). O antigo
  // cardsDueNow() contava New (due=0) como pendente.
  const dueCount = structuralCounts(eligibleReviewPool()).due;
  if (dueCount < REVIEW_REMINDER_THRESHOLD) return;

  STATE.lastReviewReminderDay = today;
  saveState();

  document.getElementById('review-reminder-count').textContent = dueCount;
  document.getElementById('review-reminder-banner').style.display = 'flex';
}

function registerDailyReviewCard(){
  ensureDailyBucket();
  STATE.daily.reviewsDone += 1;
}

// Cartas que já estavam atrasadas (venceram antes de hoje, não só "due
// agora") -- desafio "Revise cartas em atraso" (artefato §3), prioriza SRS
// vencido de verdade em vez de qualquer revisão dentro do prazo normal.
function registerDailyOverdueReviewCard(){
  ensureDailyBucket();
  STATE.daily.overdueReviewsDone += 1;
}

function registerDailySpeedReview(){
  ensureDailyBucket();
  STATE.daily.speedReviewSessions += 1;
  STATE.everUsedSpeedReview = true;
}

function missionReviewSupply(){
  // Mesmo teto que gradeCurrentCard() consegue de fato tocar via
  // Flashcard/Palavras Difíceis -- Speed Review grada os mesmos cartões
  // (applyMemoryGrade), então não é um estoque à parte.
  return trueDueReviewCount(eligibleReviewPool());
}

function missionOverdueSupply(){
  // Mesmo critério de wasOverdue em gradeCurrentCard() (due < hoje 00:00).
  const todayMidnight = new Date().setHours(0, 0, 0, 0);
  return eligibleReviewPool().filter(c => c.due > 0 && c.due < todayMidnight).length;
}

function missionSpeedReviewFeasible(){
  // Mesmo teto que esconde o card "Speed Review" na tela de Revisão.
  return missionReviewSupply() >= 1;
}

// ============================================================
// RENDER: Trilha (path)
// ============================================================
function unitCardCounts(unitId){
  // K2-E: total/learned em PALAVRAS (Note = A+B contam 1); dueForReview
  // continua por CardInstance (é fila de Review, A e B independentes).
  const pool = STATE.cards.filter(c => c.unitId === unitId);
  const { total, learned } = studyTrailWordProgress(pool); // mesma semântica de Progresso (Note, só trilha)
  const dueForReview = structuralCounts(pool).due; // K.7: mesma definição de Devido (não-New vencido)
  return { total, learned, dueForReview, totalCards: pool.length };
}

// Fase 2 da trilha: cartão "Continuar" no topo. Fonte única = nextTrailItem
// (shared/trail-state-model.js); aqui só desenha. A métrica mostrada é a
// oficial: lições concluídas.
function buildTrailContinueCard(){
  const groups = trailGroups();
  const next = nextTrailItem(groups, STATE.unitProgress);
  const { done, total } = trailLessonCounts(groups, STATE.unitProgress);
  const card = document.createElement('div');
  card.className = 'trail-continue';
  const metric = t('trail.lessonsCompleted', { done, total });
  if (!next){
    card.classList.add('complete');
    card.innerHTML = `<div class="tc-info"><div class="tc-eyebrow">${t('trail.continue.eyebrowDone')}</div><div class="tc-title">${t('trail.continue.allDone')}</div><div class="tc-sub">${metric}</div></div>`;
    return card;
  }
  const u = UNITS.find(x => x.id === next.unitId);
  const lessonLabel = next.lessonCount ? ` · ${t('trail.continue.lessonOf', { i: next.lessonIdx + 1, n: next.lessonCount })}` : '';
  const started = done > 0 || !!(STATE.unitProgress[u.id] && STATE.unitProgress[u.id].started);
  card.innerHTML = `
    <div class="tc-info">
      <div class="tc-eyebrow">${started ? t('trail.continue.eyebrowResume') : t('trail.continue.eyebrowStart')}</div>
      <div class="tc-title">${u.title}${lessonLabel}</div>
      <div class="tc-sub">${metric}</div>
    </div>
    <button type="button" class="btn btn-primary tc-cta">${started ? t('common.continue') : t('common.start')}</button>
  `;
  card.querySelector('.tc-cta').addEventListener('click', () => openUnitDetail(u.id));
  setTimeout(() => watchTrailContinueCard(card), 0);
  return card;
}

// Abre uma lição JÁ CONCLUÍDA em modo revisão, sem mexer no ponteiro de
// progresso real da unidade (ver comentário de STEP_STATE.lessonReview).
function openLessonReview(unitId, lessonIdx){
  STEP_STATE.lessonReview = { unitId, reviewIdx: lessonIdx };
  openUnitDetail(unitId);
}

// Fase 4b -- únicos pontos que Speed Review/Combinar/export Anki usam pra
// extrair texto de um card, trilha OU nativo (Note/CardInstance). Nunca
// leem `card.front`/`card.back_trans` soltos -- esses campos não existem
// mais num card nativo (ver buildEngineCardsFromRow, shared/flashcard-model.js).
// `cardOrPseudo` porque buildSpeedOptions() também gera pseudo-objetos só
// com `displayAnswerText` pras opções erradas de múltipla escolha (ver
// abaixo) -- cardAnswerText() aceita os dois sem o chamador precisar saber
// qual é qual.
function cardPromptText(cardOrPseudo){
  const view = resolveCardContentView(cardOrPseudo);
  return (view.kind === 'multiple_choice' ? view.prompt : view.front).text;
}

function cardAnswerText(cardOrPseudo){
  if ('displayAnswerText' in cardOrPseudo) return cardOrPseudo.displayAnswerText;
  const view = resolveCardContentView(cardOrPseudo);
  return view.kind === 'multiple_choice' ? view.correctText : view.back.text;
}

// ---------- Tela de seleção de modo de revisão (cards com contagem, estilo Memrise) ----------
// Fase 4 do sistema de alunas particulares (ver CLAUDE.md): filtro por
// ORIGEM do cartão ('all'/'study'/'teacher'), aplicado aqui -- o único
// pool base que TODA tela de revisão/prática já usa (Flashcard, Palavras
// Difíceis, Speed Review, Combinar, hero widget, mode-select). Um só
// ponto de checagem, mesmo padrão de isCardLessonCompleted() -- nunca
// reimplementar este filtro solto em outro lugar.
// Aba Revisão do painel Aluno (2026-10-14, pedido da autora): cartões da
// professora (origin 'teacher', Banco de Revisão) são revisão das AULAS, não
// da trilha -- saem da Revisão geral (Estudar tudo, modos, contagens, opção
// de origem) e só aparecem na aba Aluno > Revisão, cuja sessão liga
// STATE.reviewSessionClassReview. O progresso FSRS é o mesmo (nada apagado).
function isClassReviewCard(card){
  return !!card && card.origin === 'teacher';
}
// Sem vínculo ativo com a professora do cartão, ele some da aba Aluno > Revisão (e o item Aluno some se não sobrar nada),
// mas continua em STATE.cards e no save: o progresso volta junto com o vínculo (decisão da autora, 2026-10-15).
// undefined = ainda não se sabe (antes do boot ou offline): não esconde.
let CLASS_ACTIVE_TEACHER_ID;
function isActiveClassReviewCard(card){
  if (!isClassReviewCard(card)) return false;
  if (CLASS_ACTIVE_TEACHER_ID === undefined || !card.teacherId) return true;
  return card.teacherId === CLASS_ACTIVE_TEACHER_ID;
}
// Valor salvo 'teacher' (de antes da aba) vale como 'all'.
function effectiveReviewOriginFilter(){
  const filter = STATE.studySettings.reviewOriginFilter || 'all';
  return filter === 'teacher' ? 'all' : filter;
}
function matchesReviewOriginFilter(card){
  if (STATE.reviewSessionClassReview) return isActiveClassReviewCard(card);
  if (isClassReviewCard(card)) return false;
  const filter = effectiveReviewOriginFilter();
  return filter === 'all' || card.origin === filter;
}

// Pool da aba Aluno > Revisão (mesma elegibilidade, só cartões da professora).
function classReviewPool(){
  return STATE.cards.filter(c => isActiveClassReviewCard(c) && isCardLessonCompleted(c));
}
// +N da aba Revisão do Aluno: o que a sessão entregaria hoje (mesma fila do "Estudar tudo").
function classReviewTodayCount(){
  return getStudyQueue(classReviewPool(), { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay }).length;
}

// Abre a sessão de Flashcard com o escopo "cartões da professora". Mesmo motor
// (startReviewSession/renderReviewView, modos de resposta do Banco), só o pool muda.
function startClassReviewSession(){
  if (typeof switchTab === 'function') switchTab('review'); // zera escopos e mostra a Revisão
  STATE.reviewSessionUnitFilter = null;
  STATE.reviewSessionDeckId = null;
  STATE.reviewSessionMilestone = null;
  STATE.reviewSessionClassReview = true;
  STATE.reviewActiveMode = 'flashcard';
  document.getElementById('review-mode-select-wrap').style.display = 'none';
  document.getElementById('review-session-wrap').style.display = 'block';
  document.getElementById('review-content').style.display = 'block';
  document.getElementById('speed-review-content').style.display = 'none';
  document.getElementById('match-review-content').style.display = 'none';
  syncReviewBackLink();
  startReviewSession();
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'reviewSession', mode: 'class' });
}

// Sai da sessão de cartões da professora e volta ao Aluno > Revisão.
function backToClassReviewTab(){
  STATE.reviewSessionClassReview = false;
  if (typeof STUDENT_PANEL_STATE !== 'undefined') STUDENT_PANEL_STATE.section = 'revisao';
  if (typeof switchTab === 'function') switchTab('student-panel');
}

// Fase I (Tags): filtro de Review por Tag -- estado PRÓPRIO
// (STATE.studySettings.reviewTagFilter, lista de slugs), independente de
// reviewOriginFilter. Semântica: vazio = sem restrição; 1+ tags = OR (o
// card entra se a NOTE tiver pelo menos uma). A tag é da Note, então
// CardInstances irmãos (reverso, Cloze) passam/ficam juntos. Só SELECIONA
// cards elegíveis: nunca toca FSRS, Deck nem origem. cardMatchesTagFilter()
// vive em shared/flashcard-model.js (fonte única).
// 2026-10-06 (pedido da autora): o filtro de tags saiu de "Configurar" e
// fica só no Painel. Sem tela para mudar o valor, um filtro salvo antes
// restringiria a revisão sem a pessoa ver -- por isso a sessão não aplica
// mais nenhum filtro de tag (o valor salvo é ignorado).
function activeReviewTagFilter(){
  return [];
}

function matchesReviewTagFilter(card){
  return cardMatchesTagFilter(card, activeReviewTagFilter());
}

function eligibleReviewPool(){
  return STATE.cards.filter(isCardLessonCompleted).filter(matchesReviewOriginFilter).filter(matchesReviewTagFilter);
}

// Universo de onde a UI tira as tags disponíveis: o pool do Review geral
// SEM o próprio filtro de tag (senão selecionar uma tag esconderia as outras).
function reviewTagUniverse(){
  return STATE.cards.filter(isCardLessonCompleted).filter(matchesReviewOriginFilter);
}

// Fase H (hardening) -- precedência do Deck sobre reviewOriginFilter. Uma
// sessão iniciada EXPLICITAMENTE por um Deck tem o Deck como escopo
// autoritativo: elegibilidade normal (lição concluída / não arquivado, via
// isCardLessonCompleted) SEM a exclusão adicional por origem. O filtro de
// origem é preferência do Review GERAL (eligibleReviewPool acima, inalterada);
// aqui ele nunca é lido nem alterado, então STATE.studySettings.reviewOriginFilter
// continua persistido como estava ao entrar/sair de um Deck. Não é
// autorização -- quem decide o que a conta pode ver é o Deck Engine/RLS.
function eligibleDeckReviewPool(){
  return STATE.cards.filter(isCardLessonCompleted);
}

// Fase 12: REVISÕES DE HOJE (o que o motor decidiu que é hora de revisar
// agora) e SUAS PALAVRAS (estado geral do vocabulário, widget abaixo) são
// duas perguntas diferentes -- um aluno pode ter várias palavras "medianas"
// sem ter nenhuma revisão devida hoje, e isso não é um erro do app. Por
// isso ficam em blocos visualmente separados, cada um com sua própria
// legenda curta, em vez de um único número ambíguo.
//
// Fase 14 (teste de experiência real): "Revisões de hoje" precisa ser
// exatamente o que uma sessão de Flashcard vai de fato entregar -- usar
// cardsDueNow() aqui (sem teto) mostrava, por exemplo, "47 prontas" pra um
// aluno com 47 palavras nunca estudadas, mas startReviewSession() só serve
// até STATE.studySettings.newCardsPerDay novas por vez. O número que o
// aluno vê ANTES de entrar precisa bater com o que ele recebe ao entrar
// (mesmas opções de getStudyQueue que startReviewSession() usa).
// Projeto "Reorganização da experiência de revisão e prática": fonte ÚNICA
// da fila "devida agora" -- Flashcard (startReviewSession) e Speed Review
// (buildSpeedQueue) chamam a MESMA função, com as MESMAS opções. Nenhuma
// tela decide sozinha quem entra numa sessão de revisão (Fase 8 do
// projeto: "não pode haver getDueCards() e outra função independente como
// getMediumWords() pra determinar o Speed Review").
function dueReviewQueueOptions(){
  return {
    scope: 'due',
    newCardsLimit: STATE.studySettings.newCardsPerDay,
    limit: sessionIntensityToLimit(STATE.studySettings.sessionIntensity)
  };
}

function buildDueReviewQueue(pool){
  return getStudyQueue(pool, dueReviewQueueOptions());
}

// Contagem HONESTA (Fase 8 do projeto): quantas revisões existem de
// verdade (sem o teto de "Intensidade da sessão") vs quantas cabem nesta
// sessão. Quando os dois números divergem, a interface precisa mostrar os
// dois -- nunca esconder revisões reais atrás do teto de sessão como se
// elas não existissem (ver renderReviewTodayWidget).
function trueDueReviewCount(pool){
  return getStudyQueue(pool, { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay }).length;
}

function todaysReviewCount(pool){
  return buildDueReviewQueue(pool).length;
}

// ---------- Filtro de fila (2ª sessão de grilling) ----------
// A primeira reformulação (acima: dueCount escondido atrás do teto de
// sessão) resolveu a repetição mas escondeu demais -- a autora achou o
// número "muito escondido" e pediu pra sempre mostrar o total REAL
// (trueCount) em destaque, com um jeito explícito de escolher COMO
// consumir essa fila, em vez de aceitar o corte da Intensidade da sessão
// em silêncio.
//
// 'all'    -- ignora o teto de Intensidade da sessão (scope:'due' sem
//             `limit`) -- ainda respeita newCardsPerDay, que é ritmo de
//             aprendizado de palavra NOVA, não tamanho de sessão de
//             revisão (não faz sentido "Todas" empurrar 50 palavras nunca
//             vistas de uma vez só).
// 'hard'   -- alias direto de getStudyQueue(scope:'hard') -- MESMA fila
//             que "Palavras difíceis" em PRATICAR usa (Regra 6: nunca dois
//             critérios diferentes disputando o nome "difícil"). Sem teto
//             de sessão de propósito, igual ao modo dedicado já era.
// 'oldest' (padrão) -- exatamente a seleção de sempre (devida + novas,
//             capada pela Intensidade da sessão), só REORDENADA: entre as
//             já estudadas, due mais antigo primeiro (novas, due
//             irrelevante pra "atraso", continuam depois, na ordem que já
//             tinham). Ver startReviewSession/buildSpeedQueue -- shuffle
//             precisa ser pulado só pra este filtro, senão a ordem não
//             sobrevive até a tela.
function reviewFilterQueue(filter, pool){
  // Prop 5 (ver CLAUDE.md, "7 propostas") -- não lê mais
  // STATE.studySettings.reviewFilter como fallback (o controle que
  // escrevia esse valor foi removido da UI); todo call site que não passa
  // `filter` explícito recebe 'oldest' sempre, mesmo se a conta tiver um
  // valor diferente salvo de antes da remoção (nunca apagado do banco, só
  // parou de ser aplicado).
  filter = filter || 'oldest';
  if (filter === 'hard') return getStudyQueue(pool, { scope: 'hard' });
  if (filter === 'all') return getStudyQueue(pool, { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay });
  const queue = getStudyQueue(pool, { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay });
  queue.sort((a, b) => (cardStudyBucket(a) !== 'new' ? a.due : Infinity) - (cardStudyBucket(b) !== 'new' ? b.due : Infinity));
  return queue.slice(0, sessionIntensityToLimit(STATE.studySettings.sessionIntensity));
}

// Bloco hero (topo da Revisão): número grande = trueCount, sempre o total
// real pendente, nunca o cortado pela sessão -- fixo, não muda com nenhum
// filtro. Prop 5 (ver CLAUDE.md, "7 propostas") -- "Filtro de fila" (e o
// indicador "Filtro: X" que ficava aqui embaixo do número) foi removido
// da UI de propósito; REVIEW_FILTER_LABELS continua existindo só porque
// reviewFilterQueue()/getStudyQueue() ainda usam os 3 valores
// internamente (o que mudou é que a aluna não escolhe mais entre eles).
// Filtros de sessão (origem/tag, em "Configurar") valem para "Estudar
// tudo", mas não para a tabela de Decks. Resumo para avisar quando estão ativos.
function reviewSessionFilterSummary(){
  const parts = [];
  const origin = effectiveReviewOriginFilter();
  if (origin !== 'all') parts.push(REVIEW_ORIGIN_LABELS[origin] || origin);
  const tags = activeReviewTagFilter();
  if (tags.length) parts.push(tags.map(t => friendlyTagLabel(t)).join(', '));
  return parts.join(' · ');
}

// "Estudar tudo" (todos os Decks juntos) fica embaixo da tabela de Decks; as
// contagens por Deck já estão na tabela, então aqui não há números. Aviso
// quando um filtro de sessão (origem/tag, em "Configurar") está ativo.
function renderReviewTodayWidget(){
  const wrap = document.getElementById('review-today-widget');
  if (!wrap) return;
  const pool = eligibleReviewPool();
  const queue = getStudyQueue(pool, { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay });
  const split = { new: 0, learning: 0, review: 0 };
  queue.forEach(c => { split[cardStudyBucket(c)]++; });
  const trueCount = queue.length;
  const filterSummary = reviewSessionFilterSummary();
  const filterNote = filterSummary
    ? `<div class="review-today-filter">${t('review.today.filter', { filter: escapeHTML(filterSummary) })} · <button type="button" class="admin-select-link review-today-filter-clear" id="review-today-filter-clear">${escapeHTML(t('review.today.clearFilter'))}</button></div>`
    : '';
  const num = (n, cls, label) => `<div class="review-today-col"><div class="review-today-count ${n ? cls : 'is-zero'}">${n}</div><div class="review-today-col-label">${label}</div></div>`;
  wrap.innerHTML = `
    <div class="review-today-strip">
      <div class="review-today-split" aria-label="${escapeHTML(t('review.today.aria', { new: split.new, learning: split.learning, review: split.review }))}">
        ${num(split.new, 'is-new', escapeHTML(t('review.count.new')))}${num(split.learning, 'is-learning', escapeHTML(t('review.count.learning')))}${num(split.review, 'is-review', escapeHTML(t('review.count.review')))}
      </div>
      <div class="review-today-go">
        ${trueCount ? `<button class="btn btn-secondary review-short-btn" id="review-short-btn" title="${escapeHTML(t('review.today.shortTitle'))}">${escapeHTML(t('review.today.short'))}</button>
        <button class="btn btn-primary review-study-all-btn" id="review-study-all-btn">${escapeHTML(t('review.today.studyAll', { n: trueCount }))}</button>`
        : `<span class="review-today-done">${escapeHTML(t('review.today.upToDate'))}</span>`}
      </div>
    </div>
    ${filterNote}
  `;
  document.getElementById('review-study-all-btn')?.addEventListener('click', () => openReviewSession('flashcard'));
  document.getElementById('review-short-btn')?.addEventListener('click', () => openReviewSession('flashcard', { short: true }));
  document.getElementById('review-today-filter-clear')?.addEventListener('click', () => {
    updateStudySetting({ reviewOriginFilter: 'all', reviewTagFilter: [] });
    renderReviewModeSelect();
  });
}

// Projeto "Reorganização da experiência de revisão e prática": a tela de
// Revisão deixou de ser 4 blocos equivalentes. Agora responde só 2
// perguntas: "o que eu preciso revisar agora?" (REVISAR -- Flashcard e
// Speed Review, a MESMA fila devida, só apresentações diferentes) e "o que
// eu posso praticar quando quiser, vencido ou não?" (PRATICAR -- Palavras
// difíceis e Combinar, sempre disponíveis, nunca criam um 2º agendamento).
function renderReviewModeSelect(){
  const pool = eligibleReviewPool();
  // trueCount (total real, sem teto de sessão) decide se há revisão --
  // dueCount é só um subconjunto capado dele (2ª sessão de grilling: nunca
  // usar o número cortado pra decidir "tem ou não tem revisão").
  const trueCount = trueDueReviewCount(pool);
  // Speed Review mostra a mesma divisão da tabela de Decks (Novo/Aprendendo/
  // Revisar) em vez de um número só -- o total inclui as palavras novas do
  // dia, e um número único parecia contradizer o "Revisar 0" da tabela.
  const speedSplit = { new: 0, learning: 0, review: 0 };
  getStudyQueue(pool, { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay })
    .forEach(c => { speedSplit[cardStudyBucket(c)]++; });
  // Fase 7 (projeto anterior): Palavras Difíceis NÃO depende de estar due
  // -- "precisa revisar agora" (REVISAR) e "é uma palavra difícil"
  // (PRATICAR) são perguntas diferentes. getStudyQueue(scope:'hard') usa
  // o difficulty do FSRS, nunca due.
  const hardCards = getStudyQueue(pool, { scope: 'hard' });
  const hardCount = hardCards.length;
  // Recordes (shared/review-extras.js). Ja saíram da lista = palavras que já
  // estiveram em Palavras difíceis e hoje não estão mais.
  if (updateHardSeen(hardCards)) saveState();
  const hardLeft = hardLeftCount(pool, hardCards);
  const rec = reviewRecords();

  renderReviewTodayWidget();
  // Navegador de Decks (shared/deck-browser.js): tabela Deck | Novo | Aprendendo | Revisar.
  if (typeof renderReviewDeckTable === 'function') renderReviewDeckTable();

  // K2-F: Combinar é vocabulário -> conta palavras (projeção A na trilha), não CardInstances.
  const matchWordCount = projectStudyWordsToA(pool).length;
  const praticarEl = document.getElementById('review-mode-cards-praticar');
  praticarEl.innerHTML = `
    <button class="review-mode-card" id="mode-card-speed" ${trueCount === 0 ? 'disabled' : ''}>
      <div class="icon">⚡</div>
      <div class="name">${t('review.mode.speed.name')}</div>
      <div class="count speed-split" aria-label="${escapeHTML(t('review.today.speedSplitAria', { new: speedSplit.new, learning: speedSplit.learning, review: speedSplit.review }))}">
        <span class="${speedSplit.new ? 'is-new' : 'is-zero'}">${speedSplit.new}</span>
        <span class="${speedSplit.learning ? 'is-learning' : 'is-zero'}">${speedSplit.learning}</span>
        <span class="${speedSplit.review ? 'is-review' : 'is-zero'}">${speedSplit.review}</span>
      </div>
      <div class="desc">${rec.speedBestScore ? t('review.records.yourRecord', { record: speedRecordText(rec) }) : t('review.records.againstClock')}</div>
    </button>
    <button class="review-mode-card" id="mode-card-hard" ${hardCount === 0 ? 'disabled' : ''}>
      <div class="icon">🔥</div>
      <div class="name">${t('review.mode.hard.name')}</div>
      <div class="count">${hardCount}</div>
      <div class="desc">${hardLeft ? t('review.records.leftList', { n: hardLeft }) : t('review.mode.hard.desc')}</div>
    </button>
    <button class="review-mode-card" id="mode-card-match" ${matchWordCount < 10 ? 'disabled' : ''}>
      <div class="icon">🧩</div>
      <div class="name">${t('review.mode.match.name')}</div>
      <div class="count">${matchWordCount}</div>
      <div class="desc">${rec.matchBestMs ? t('review.records.yourRecord', { record: formatRecordSeconds(rec.matchBestMs) }) : t('review.mode.match.desc')}</div>
    </button>
  `;
  const weekEl = document.getElementById('review-week');
  if (weekEl) weekEl.innerHTML = reviewWeekHTML(pool);
  document.getElementById('mode-card-speed').addEventListener('click', () => openReviewSession('speed'));
  document.getElementById('mode-card-hard').addEventListener('click', () => openReviewSession('hard'));
  document.getElementById('mode-card-match').addEventListener('click', () => openReviewSession('match'));
}

// Link de voltar da sessão: "Voltar ao Deck" quando a sessão veio de um Deck.
function syncReviewBackLink(){
  const el = document.getElementById('review-back-to-modes');
  if (el) el.textContent = t(STATE.reviewSessionClassReview ? 'review.backToStudent' : STATE.reviewSessionDeckId != null ? 'review.backToDeck' : 'review.backToModes');
}

function startSpeedReview(){
  holdBadgeCelebrations();
  trackEvent('lesson_start', 'speed_review', null);
  SPEED_STATE.queue = buildSpeedQueue();
  SPEED_STATE.index = 0;
  SPEED_STATE.hearts = 3;
  SPEED_STATE.score = 0;
  SPEED_STATE.correctCount = 0;
  SPEED_STATE.streak = 0;
  SPEED_STATE.bestStreak = 0;
  SPEED_STATE.active = true;
  SPEED_STATE.dailyCounted = false;
  renderSpeedReview();
}

// Um cartão só entra na revisão depois que a LIÇÃO que ensina aquela
// palavra foi realmente concluída -- "unidade começada" sozinho não basta:
// abrir a unidade e terminar só a lição 1 já marcava started=true pra
// unidade inteira, e como todo cartão novo nasce com due=0 (sempre "vencido"
// pra cardsDueNow), o vocabulário de lições 2+ nunca vistas entrava na fila
// de revisão junto.
function isCardLessonCompleted(card){
  // Fase 3 do sistema de alunas particulares (ver CLAUDE.md): cartão de
  // professora não pertence a nenhuma unidade/lição -- o gate aqui não se
  // aplica a ele. Elegibilidade própria: só entra na fila de revisão
  // enquanto a professora não arquivou o cartão (flashcardStatus, espelha
  // `teacher_flashcards.status`, atualizado a cada mergeTeacherFlashcardsIntoState()).
  // Fase 5: cartão autorado pela própria aluna (origin==='self',
  // own_flashcards) segue exatamente o mesmo caso -- também não
  // pertence a unidade nenhuma, também usa `flashcardStatus` (espelha
  // `own_flashcards.status`) como único critério de elegibilidade.
  if (card.origin === 'teacher' || card.origin === 'self') return card.flashcardStatus === 'active';
  // Etapa 0 do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 item 8): cartão que já passou pelo
  // portão uma vez passa sempre (mover a palavra para uma unidade ainda não feita não a tira da Revisão).
  // A marca só é gravada em item com chave estável (`studyKey`, fr); o zh continua só com a regra abaixo.
  if (card.released) return true;
  // O portão de lição de sempre (função interna: os testes extraem isCardLessonCompleted inteira do texto).
  const passesGate = () => {
    const prog = STATE.unitProgress[card.unitId];
    // A0 (Fase 0 da trilha, 06/10/2026): unidade CONCLUÍDA libera todos os
    // cartões dela. Antes só `lessonIdx < prog.lessonIdx` decidia, mas
    // `lessonIdx` volta a 0 ao concluir a unidade -- o cartão saía da Revisão.
    if (prog?.completed) return true;
    if (!prog?.started) return false;
    const unit = UNITS.find(u => u.id === card.unitId);
    // Cartão "Na frase": entra com a lição da palavra que o apresenta (gateVocabIdx).
    const gateIdx = card.vocabIdx != null ? card.vocabIdx : card.gateVocabIdx;
    const lessonIdx = unit ? lessonIndexForVocabIdx(unit, gateIdx) : -1;
    // Sem lição conhecida pra esse vocabIdx: só libera se a unidade inteira
    // já foi concluída (mais seguro que arriscar mostrar algo nunca ensinado).
    if (lessonIdx === -1) return !!prog.completed;
    return lessonIdx < prog.lessonIdx;
  };
  const passed = passesGate();
  if (passed && card.studyKey) card.released = true;
  return passed;
}

function startReviewSession(opts){
  holdBadgeCelebrations();
  trackEvent('lesson_start', 'flashcard_review', null);
  // eligibleReviewPool() (não STATE.cards.filter(isCardLessonCompleted)
  // solto): mesma função que a tela de modo/hero widget já usa pra contar
  // -- Fase 4 do sistema de alunas particulares (ver CLAUDE.md) adicionou
  // o filtro por origem lá dentro, então a sessão de verdade precisa
  // consumir a MESMA fonte, senão a prévia da tela de config mentiria
  // sobre o que a sessão realmente inclui. Estudar uma unidade específica
  // (STATE.reviewSessionUnitFilter) continua fora do filtro de origem --
  // é uma ação deliberada vinda da trilha, e cartão de professora nunca
  // pertence a uma unidade (`unitId: null`) mesmo, então nunca entraria
  // aqui de qualquer forma.
  const pool = STATE.reviewSessionUnitFilter
    ? STATE.cards.filter(c => c.unitId === STATE.reviewSessionUnitFilter && isCardLessonCompleted(c))
    // Revisão geral: só cartões de lições que você já concluiu de verdade.
    : eligibleReviewPool();

  // Fase 4 (projeto anterior): seleção centralizada em getStudyQueue()
  // (shared/study-queue.js) -- due primeiro, mais um lote limitado de
  // cartões novos (scope 'due'), ou due primeiro seguido do resto do pool
  // ao estudar uma unidade específica (scope 'unit'). Estudar uma unidade
  // específica mostra ela inteira, sem corte artificial de intensidade.
  // Revisão geral usa reviewFilterQueue() (2ª sessão de grilling) -- a
  // MESMA função que Speed Review chama (ver buildSpeedQueue) -- fonte
  // única da fila REVISAR, agora sensível ao filtro escolhido na tela
  // (Todas/Mais difíceis primeiro/Mais antigas primeiro).
  // Prop 5 (ver CLAUDE.md, "7 propostas") -- "Filtro de fila" removido da
  // UI, comportamento travado em 'oldest' (ver buildSpeedQueue()).
  const queue = STATE.reviewSessionUnitFilter
    ? getStudyQueue(pool, { scope: 'unit', newCardsLimit: STATE.studySettings.newCardsPerDay })
    : reviewFilterQueue('oldest', pool);

  // K2-G: a sessão só decide QUAL CardInstance é estudado; a direção (A/B) é
  // estrutural do próprio CardInstance (frontFieldIndex/backFieldIndex).

  // "Mais antigas primeiro" só cumpre o que promete se a ordem sobreviver
  // até a tela -- embaralhar (como sempre foi) destruiria exatamente essa
  // ordem. Unidade específica continua embaralhada, como sempre.
  const shouldShuffle = !!STATE.reviewSessionUnitFilter;
  STATE.reviewQueue = shouldShuffle ? shuffle(queue) : queue;
  // Sessão de 5 minutos (shared/review-extras.js): mesma fila, mais curta.
  if (opts && opts.short && !STATE.reviewSessionUnitFilter) STATE.reviewQueue = shortReviewQueue(STATE.reviewQueue);
  STATE.reviewIndex = 0;
  // Fase 6C.1/6C.2/6C.3 -- descarta o localState (Normal/Múltipla escolha/
  // Digite a resposta/Cloze) da sessão anterior, se houver; renderReviewView()
  // cria um novo, tipado pro card atual, na primeira renderização. Fase
  // 6C.2 eliminou STATE.reviewMCPicked/STATE.reviewMCCorrect; Fase 6C.3
  // eliminou STATE.reviewClozeAnswered (Cloze migrou 100% pra este slot
  // único, mesmo padrão dos outros 3 tipos) -- não há mais nenhum campo
  // solto de tipo pra zerar aqui.
  STATE.reviewSessionStartedAt = Date.now();
  STATE.reviewCardState = null;
  renderReviewView();
}

// D4 -- "integre getDeckCounts() ao domínio de Review": a única mudança
// real é QUAL pool passar -- eligibleReviewPool() (lição concluída + não
// arquivado + filtro de origem já aplicados), nunca STATE.cards cru. Zero
// código de contagem novo -- getDeckCounts()/bucketCardState()/
// countReviewCards() (shared/deck-engine.js) já fazem tudo, inclusive
// separar ESTADO (New/Learning, via card.state) de DISPONIBILIDADE (Review
// due-agora, via cardsDueNow()) -- ver comentário completo lá.
function deckCountsForReview(deckId){
  return getDeckCounts(STATE.decks, deckId, eligibleDeckReviewPool());
}

// D15 (estados vazios) -- domínio precisa diferenciar "Deck vazio" de
// "Deck tem cards mas nada due" de "tem cards não elegíveis/arquivados",
// sem inventar nenhuma UX nova (nenhuma tela consome isto ainda). Um único
// objeto, computado 2x com o MESMO getStudyScopeForDeck() (nunca uma 2ª
// implementação de filtro por subtree) -- 1x sobre STATE.cards cru (pra
// enxergar arquivado/não-elegível também) e 1x sobre o pool elegível (pra
// contar o que a Revisão de fato usaria). totalCards/eligibleCards/
// archivedCards já bastam pra uma UI futura distinguir os 7 casos da seção
// 15 sem recalcular nada por conta própria.
function deckReviewSummary(deckId){
  const decks = STATE.decks || [];
  const allScoped = getStudyScopeForDeck(decks, deckId, STATE.cards);
  const eligiblePool = eligibleDeckReviewPool();
  const eligibleScoped = getStudyScopeForDeck(decks, deckId, eligiblePool);
  const counts = getDeckCounts(decks, deckId, eligiblePool);
  return {
    deckId,
    totalCards: allScoped.length,
    eligibleCards: eligibleScoped.length,
    archivedCards: allScoped.filter(c => c.flashcardStatus === 'archived').length,
    new: counts.new,
    learning: counts.learning,
    review: counts.review,
    due: counts.due,
  };
}

// Fase 6D.7 (ver CLAUDE.md) -- único ponto de acoplamento residual dos 4
// renderers extraídos na Fase 6C a STATE.reviewQueue/reviewIndex (posição
// na fila real de Review -- contabilidade de SESSÃO, nunca estado
// efêmero de interação; a proibição da Fase 6C nunca foi sobre isto, ver
// comentário original de renderNormalCard mais abaixo). Preview (Fase
// 6D.7, shared/flashcard-preview.js) nunca tem uma fila real de Review --
// `card.__isPreviewCard` (setado SÓ por aquele arquivo, nunca por nenhum
// card real de STATE.cards) troca a barra de progresso por um rótulo
// "Pré-visualização" em vez de ler STATE.reviewQueue (que valeria 0/NaN
// fora de uma sessão de Review de verdade). Esta é a alteração MÍNIMA
// necessária pra permitir o contrato compartilhado renderer(mountEl,
// card, localState, callbacks) sem alterar o comportamento real de
// Review -- quando `card.__isPreviewCard` é falso/ausente (SEMPRE o caso
// pra cartão real), o HTML produzido é byte a byte idêntico ao de antes
// desta fase.
function reviewProgressBarHTML(card){
  if (card.__isPreviewCard){
    return `<div class="review-progress"><div class="review-progress-count">${t('review.previewLabel')}</div></div>`;
  }
  const pct = Math.round((STATE.reviewIndex / STATE.reviewQueue.length) * 100);
  return `
    <div class="review-progress">
      <div class="review-progress-bar"><div class="review-progress-fill" style="width:${pct}%"></div></div>
      <div class="review-progress-count">${STATE.reviewIndex+1} / ${STATE.reviewQueue.length}</div>
    </div>
  `;
}

// Rendimento decrescente de XP pra cartas maduras (artefato §5): uma carta
// já dominada (intervalo alto) avaliada repetidamente não deve valer o
// mesmo XP que uma carta ainda instável -- sem tirar XP de revisão nenhuma
// (piso de 1), só reduzir o ganho marginal. `intervalBefore` é o intervalo
// ANTES desta revisão (maturidade já acumulada), não o recalculado por ela.
function reviewXP(intervalBefore, grade){
  const base = XP_PER_GRADE[grade];
  if (intervalBefore >= 60) return Math.max(1, Math.round(base * 0.4));
  if (intervalBefore >= 21) return Math.max(1, Math.round(base * 0.7));
  return base;
}

function gradeCurrentCard(grade){
  const card = STATE.reviewQueue[STATE.reviewIndex];
  // Atrasada de verdade = venceu ANTES de hoje, não só "due agora" (toda
  // carta na fila já é due por definição -- ver eligibleReviewPool). Precisa
  // ser lido antes de applyMemoryGrade/scheduleReview mutar card.due pra reavaliação.
  const wasOverdue = card.due > 0 && card.due < new Date().setHours(0, 0, 0, 0);
  const intervalBefore = card.interval;
  // K2-G: nenhuma direção é gravada aqui -- A/B são CardInstances independentes
  // e a direção é estrutural; a revisão só aplica o grau (FSRS) ao CardInstance mostrado.
  // Fase 5: Flashcard agora usa o motor FSRS (shared/fsrs.js) -- due deixa
  // de ser calculado por regras SM-2 fixas.
  applyMemoryGrade(card, grade);
  trackReviewAnswer('flashcard', card, grade);
  STATE.totalReviews += 1;
  // Streak só conta quando a SESSÃO inteira termina (ver renderReviewView),
  // não a cada cartão avaliado -- senão avaliar 1 carta isolada já bastava
  // pra "estudar hoje", regra boa demais até pra quem só está conferindo o
  // app sem de fato revisar nada.
  registerDailyReviewCard();
  if (wasOverdue) registerDailyOverdueReviewCard();
  addXP(reviewXP(intervalBefore, grade));

  if (grade === 0){
    // "Errei" só volta nesta MESMA sessão se sobrar separação real até o
    // fim da fila -- empurrar pro fim sempre (comportamento antigo) fazia a
    // carta reaparecer como a carta SEGUINTE (ou quase) sempre que o erro
    // acontecia perto do fim da fila, sem nenhum valor pedagógico repetir
    // uma palavra que acabou de ser errada segundos atrás. due (acima, via
    // applyMemoryGrade) já agenda a revisão real pra pelo menos amanhã
    // (fsrsIntervalFromStability nunca agenda em horas) -- este requeue é só
    // reforço extra quando ainda cabe hoje com distância de verdade.
    const remaining = STATE.reviewQueue.length - STATE.reviewIndex - 1;
    if (remaining >= 3) STATE.reviewQueue.push(card);
  }

  STATE.reviewIndex += 1;
  // Fase 6C.1 -- avançou a posição da fila, descarta o localState de
  // Normal desta exibição (renderReviewView cria um novo pro próximo card).
  STATE.reviewCardState = null;
  saveState();
  renderTopbarStats();
  renderReviewView();
}

// Fase 10, movido pra Revisão na 2ª sessão de grilling, ícone de acesso
// trocado na 3ª. Prop 5 (ver CLAUDE.md, "7 propostas") -- "Filtro de
// fila" (que entrou aqui na 4ª rodada de grilling anterior) foi removido
// de vez, e "Origem" (Fase 4 do sistema de alunas particulares) subiu
// pro TOPO do painel -- sincroniza os 3 controles restantes + Origem com
// STATE.studySettings, roda toda vez que o painel "⚙️ Configurar sessão"
// é aberto ou qualquer um deles muda.
// Fase I (Tags): chips de seleção múltipla (OR) + "Limpar". Mostra as tags do
// universo do Review geral E as já selecionadas (mesmo que não existam mais),
// pra nunca prender o usuário num filtro que ele não consegue desfazer.
function renderReviewTagFilter(){
  const wrap = document.getElementById('review-tag-filter-wrap');
  const chipsEl = document.getElementById('review-tag-chips');
  if (!wrap || !chipsEl) return;
  const selected = activeReviewTagFilter();
  const universe = reviewTagUniverse();
  // Tags finas da trilha (unidade/lição/palavra) ficam fora dos chips.
  const available = reviewFilterVisibleTags(universe);
  const all = Array.from(new Set(available.concat(selected))).sort();
  wrap.hidden = all.length === 0;
  chipsEl.innerHTML = all.map(t => {
    const n = universe.filter(c => (c.tags || []).includes(t)).length;
    const on = selected.includes(t);
    return `<button type="button" class="leaderboard-tab ${on ? 'active' : ''}" data-review-tag="${escapeHTML(t)}" aria-pressed="${on}" title="#${escapeHTML(t)}">${escapeHTML(friendlyTagLabel(t))} (${n})</button>`;
  }).join(' ');
  const clearBtn = document.getElementById('review-tag-clear');
  if (clearBtn) clearBtn.hidden = selected.length === 0;
}

function renderReviewSettingsView(){
  const s = STATE.studySettings;

  // Fase 4 do sistema de alunas particulares (ver CLAUDE.md): o filtro de
  // origem só aparece pra quem TEM pelo menos um cartão de professora ou
  // (Fase 5) autorado por ela mesma -- pra maioria das alunas (só cartão de
  // trilha) esse controle seria ruído puro, oferecendo uma escolha sem
  // efeito nenhum. 'teacher'/'self' só entram nas <option>s quando aquela
  // origem específica tem pelo menos 1 cartão -- diferente da Fase 4
  // original (só 2 origens possíveis, sempre as duas juntas), agora com 3
  // origens possíveis mostrar uma opção sempre-zero seria confuso.
  const originWrap = document.getElementById('review-origin-select-wrap');
  const originSelect = document.getElementById('review-origin-select');
  // Cartões da professora ficam na aba Aluno > Revisão, fora desta opção.
  const hasTeacherCards = false;
  const hasSelfCards = STATE.cards.some(c => c.origin === 'self');
  if (originWrap) originWrap.hidden = !hasTeacherCards && !hasSelfCards;
  if (originSelect && (hasTeacherCards || hasSelfCards)){
    const basePool = STATE.cards.filter(isCardLessonCompleted).filter(c => !isClassReviewCard(c));
    const originCounts = {
      all: basePool.length,
      study: basePool.filter(c => c.origin === 'study').length,
      teacher: basePool.filter(c => c.origin === 'teacher').length,
      self: basePool.filter(c => c.origin === 'self').length
    };
    const currentOrigin = effectiveReviewOriginFilter();
    originSelect.innerHTML = `
      <option value="all" ${currentOrigin === 'all' ? 'selected' : ''}>${REVIEW_ORIGIN_LABELS.all} (${originCounts.all})</option>
      <option value="study" ${currentOrigin === 'study' ? 'selected' : ''}>${REVIEW_ORIGIN_LABELS.study} (${originCounts.study})</option>
      ${hasTeacherCards ? `<option value="teacher" ${currentOrigin === 'teacher' ? 'selected' : ''}>${REVIEW_ORIGIN_LABELS.teacher} (${originCounts.teacher})</option>` : ''}
      ${hasSelfCards ? `<option value="self" ${currentOrigin === 'self' ? 'selected' : ''}>${REVIEW_ORIGIN_LABELS.self} (${originCounts.self})</option>` : ''}
    `;
  }

  renderReviewTagFilter();

  const freqSelect = document.getElementById('review-frequency-select');
  if (freqSelect) freqSelect.value = s.reviewFrequency;
  const newCardsSelect = document.getElementById('review-newcards-select');
  if (newCardsSelect) newCardsSelect.value = String(normalizeNewCardsPerDay(s.newCardsPerDay));
  const intensitySelect = document.getElementById('review-intensity-select');
  if (intensitySelect) intensitySelect.value = s.sessionIntensity;
}

// Ícone "⚙️" no cabeçalho da tela de Revisão (3ª sessão de grilling --
// antes era um botão de texto solto entre o dropdown e REVISAR, a autora
// não gostou) -- recolhido por padrão, sincroniza ao abrir (4 controles
// de sessão, ver renderReviewSettingsView).
// "Configurar" (barra Decks/Adicionar/Painel/Configurar, shared/deck-browser.js):
// abre/fecha o painel de ajustes da sessão na tela inicial da Revisão.
// Abre os ajustes numa janela por cima da tela atual (inclusive dentro
// de um Deck), como Adicionar e Painel -- ver openReviewSettingsModal.
function toggleReviewSettingsPanel(){
  if (typeof openReviewSettingsModal === 'function'){ openReviewSettingsModal(); return; }
  const panel = document.getElementById('review-settings-panel');
  if (!panel) return;
  panel.removeAttribute('hidden');
  renderReviewSettingsView();
}
