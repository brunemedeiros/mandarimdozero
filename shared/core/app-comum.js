// Paridade 5d, parte 8 (docs/historico/30-paridade-quase-iguais.md): o que o fr/app.js e o zh/app.js tinham IGUAL no nível de
// cima do arquivo (estado da lição e da Revisão rápida, filas de elogio, constantes das notas de realidade e culturais, e as
// ligações de botões/teclas da casca do app). As declarações ficam aqui (carregado antes do app.js; nenhuma delas depende do
// que o app.js declara na hora de carregar). As ligações viraram funções que o app.js chama no MESMO ponto de antes, para a
// ordem de carregamento não mudar.

// ---------- Ciclo de vida do áudio de exercício ----------
// Cada chamada de playPregeneratedAudio/speakFrench criava um novo player
// (Audio ou SpeechSynthesisUtterance) sem nunca parar o anterior -- ao
// avançar de exercício rápido, o áudio antigo continuava tocando em
// segundo plano ao mesmo tempo que o novo, sobrepondo os dois. Rastreia o
// player de áudio pré-gerado atualmente ativo (mesmo padrão já usado nos
// ditados, ver dictationAudioEl/stopDictationAudio) e para ele -- e
// qualquer fala em andamento via Web Speech API -- sempre que um novo
// áudio de exercício vai começar OU o exercício/tela que o iniciou deixa
// de estar ativo (trocar de exercício, responder, avançar, sair da lição,
// trocar de aba etc.).
let exerciseAudioEl = null;
// Último botão de áudio que de fato tocou algo (clique manual OU autoplay --
// ambos passam por playPregeneratedAudio/speakFrench com btnEl) -- é o que o
// atalho "r" repete. Não precisa de lógica própria de "expiração": ao trocar
// de tela, o botão antigo é removido do DOM (innerHTML novo), então
// LAST_AUDIO_BTN.isConnected já vira false sozinho.
let LAST_AUDIO_BTN = null;
let feedbackAudioCtx = null;
// ---------- Taxonomia de "notas de realidade" (sociolinguística) ----------
// Grilling 2026-09-17: proposta de mostrar contraste "forma ensinada vs
// forma real" (registro, gíria, variação regional, desvio gramatical
// coloquial). NENHUMA nota de realidade foi escrita ainda e este bloco não
// está wireado em lugar nenhum do motor -- é só a taxonomia + as regras de
// nível travadas em código agora, pra não precisar redescobrir esse
// raciocínio quando o conteúdo A2/B1/B2 existir. Hoje só A1 tem conteúdo
// real (20 unidades, 6 módulos) -- os níveis A2/B1/B2 abaixo são
// propositalmente hipotéticos, sem nenhuma unidade pra validar contra.
//
// Quatro categorias fechadas (não usar string livre -- consistência de
// badge/cor na UI quando isso for implementado):
const REALITY_NOTE_CATEGORY = {
  // Registro cotidiano "ainda reconhecível como a mesma forma, só mais casual"
  // -- ex: "Comment allez-vous ?" ensinado, "Ça va ?" no dia a dia.
  INFORMAL: 'informal',
  // Registro marcado/familiar -- ex: meuf/mec no lugar de femme/homme. Exige
  // mais cuidado social que "informal" simples (CLAUDE.md: par cor/fundo é
  // o tipo de coisa que precisa de token certo -- aqui o equivalente é
  // badge/cor DIFERENTE de "informal", nunca a mesma).
  FAMILIAR_GIRIA: 'familiar-giria',
  // Variação lexical por lugar, SEM forma "oficial" -- ex: pain au
  // chocolat/chocolatine. Shape de dado diferente das outras 3 categorias:
  // usa `variants: [{region, form}, ...]` (2+ opções igualmente corretas,
  // cada uma com o lugar onde é ouvida), nunca um par learned/everyday --
  // nenhuma das formas é "a ensinada" e a outra "a real".
  REGIONAL: 'regional',
  // Desvio GRAMATICAL real (não só léxico/registro) que já é aceito como
  // correto na fala -- ex: queda do "ne" ("Je sais pas" por "Je ne sais
  // pas"). Diferença importante das outras 3: esta categoria pode
  // eventualmente ATRAVESSAR pra dentro da correção de exercícios comuns
  // (não só um card passivo) -- se o aluno digitar a forma coloquial num
  // exercício normal de digitar, o ideal é aceitar como correta MAS
  // mostrar a forma padrão ao lado (mesmo espírito do statusClass
  // 'almost'/"Quase!" que já existe na correção de conjugação, ver
  // normalizeLoose() acima -- só que aqui o tom é "correto, mas isto é a
  // forma padrão", não "quase errado"). NÃO IMPLEMENTADO AINDA -- exige
  // decidir onde a nota mora por item (provavelmente um campo novo tipo
  // `colloquialGrammarNote` no próprio item de conjugação/frase) e alterar
  // as funções de finish()/painel de feedback dos exercícios digitados.
  // Fica registrado aqui como o próximo ponto de decisão explícito antes
  // de tocar em qualquer lógica de correção de verdade.
  GRAMATICA_COLOQUIAL: 'gramatica-coloquial',
};
// Texto do banner (topo do cartão) quando um concept é uma nota de
// realidade (concept.kind === 'reality') em vez de gramática comum --
// renderConceptStep() escolhe entre isto e o banner padrão de gramática.
// Sem cor/badge própria por categoria ainda (piloto usa só texto+emoji pra
// diferenciar -- ver CLAUDE.md, seção da camada de notas de realidade, "MVP
// = card passivo"); se familiar-giria vira conteúdo de verdade algum dia,
// dar a ela uma cor própria vira obrigatório (mesma regra já registrada
// sobre --on-vivid vs --on-seal-red -- não reaproveitar o badge de
// 'informal' pra um registro mais marcado).
// Getters (não valores fixos): o texto precisa seguir o idioma do site no
// momento do render, não o do load do script.
const REALITY_NOTE_BANNER_TEXT = {
  get [REALITY_NOTE_CATEGORY.INFORMAL]() { return t('concept.banner.reality.informal'); },
  get [REALITY_NOTE_CATEGORY.FAMILIAR_GIRIA]() { return t('concept.banner.reality.familiar'); },
  get [REALITY_NOTE_CATEGORY.REGIONAL]() { return t('concept.banner.reality.regional'); },
  get [REALITY_NOTE_CATEGORY.GRAMATICA_COLOQUIAL]() { return t('concept.banner.reality.colloquialGrammar'); },
};
// ---------- Taxonomia de "notas culturais" (grilling 2026-09-17) ----------
// Camada IRMÃ das notas de realidade acima, não a mesma coisa: `reality` é
// especificamente um CONTRASTE DE FORMA (ensinado vs. real, mesma ideia dita
// diferente). `culture` é um FATO ISOLADO -- história de palavra, costume,
// festividade -- sem nenhum contraste de forma envolvido. As duas usam o
// mesmo mecanismo de `concepts`/trigger (kind diferente), nunca a mesma nota
// tentando fazer as duas coisas. Mesmas regras de densidade/revisão já
// travadas pras notas de realidade (ver CLAUDE.md): sem teto numérico, só
// entra se a relação pedagógica com a palavra/frase ensinada for genuína,
// toda nota reportada no chat com nível de confiança pra revisão manual.
const CULTURE_NOTE_CATEGORY = {
  // Origem/etimologia de uma palavra ou expressão -- ex: os dias da semana
  // vêm dos deuses/planetas romanos.
  HISTORIA: 'historia',
  // Etiqueta ou tradição social do dia a dia -- ex: como funciona uma
  // saudação, um hábito à mesa, uma regra social não escrita.
  COSTUME: 'costume',
  // Feriado, celebração, data especial -- ex: como funciona o Ano Novo
  // Chinês, uma tradição de Natal específica da França.
  FESTIVIDADE: 'festividade',
};
// Texto do banner quando concept.kind === 'culture' -- tom mais leve/
// "curiosidade" que o de `reality` (que soa mais "cuidado, isso pode te
// confundir"), já que aqui não há nenhum contraste de forma pra alertar.
const CULTURE_NOTE_BANNER_TEXT = {
  get [CULTURE_NOTE_CATEGORY.HISTORIA]() { return t('concept.banner.culture.history'); },
  get [CULTURE_NOTE_CATEGORY.COSTUME]() { return t('concept.banner.culture.custom'); },
  get [CULTURE_NOTE_CATEGORY.FESTIVIDADE]() { return t('concept.banner.culture.festivity'); },
};
// ---------- Lembrete de revisão acumulada (estilo Busuu) ----------
// Pop-up não bloqueante no rodapé, avisando que há palavras vistas em lições
// mas nunca revisadas se acumulando. Aparece no máximo uma vez por dia, só
// quando o total de cartões pendentes passa de um limiar — pra não incomodar
// quem já revisa em dia.
const REVIEW_REMINDER_THRESHOLD = 15;
const EASY_CHALLENGES = [
  { id:'streak', icon:'🔥', get label(){ return t('fr.mission.streak'); }, target:1, get: () => STATE.lastStudyDay === todayStr() ? 1 : 0 },
  { id:'firstLesson', icon:'🌅', get label(){ return t('fr.mission.firstLesson'); }, target:1, get: d => d.lessons }
];
// ---------- Feasibility das missões de estoque limitado (grilling "missões
// do dia") ----------
// Só reviews15/overdue3/matchGame1/speedReview1 dependem de um estoque real
// (cartas pra revisar) que pode não existir -- as demais (lições, XP,
// conjugação...) não têm teto real no dia de hoje, ficam de fora desta
// checagem.
const MISSION_QUANTITY_FLOOR = 3; // abaixo disso, trata como inviável (rodada 2)
// Conquistas com níveis (docs/conquistas-proposta-niveis.md): BADGES é preenchido por rebuildTrackBadges()
// (shared/badge-tracks-app.js) a partir do catálogo shared/badge-tracks.js e das métricas abaixo.
const BADGES = [];
// ---------- Detecção + celebração de nova conquista ----------
// earnedBadgeIds é semeado uma vez, logo depois do estado carregar
// (seedEarnedBadges, chamada em loadStateAndRender) -- reflete os badges já
// ganhos em sessões anteriores, pra só celebrar o que for GENUÍNO desta
// sessão em diante. checkAndCelebrateBadges roda dentro de addXP(): todo
// badge hoje depende de streak/unidade/XP/revisões, e todos esses caminhos
// já passam por addXP -- não precisa espalhar a checagem por unit/streak/
// revisão separadamente.
let earnedBadgeIds = new Set();
let badgeCelebrationQueue = [];
let badgeCelebrationShowing = false;
// Durante uma sessão de revisão (Flashcard/Palavras difíceis/Speed Review/
// Deck), a conquista fica guardada e aparece só na tela de fim ("Revisão
// concluída"), para não cobrir o cartão. Fora da sessão, aparece na hora.
let badgeCelebrationHeld = false;
// Modo admin: só a conta da autora do curso -- deixa REVISAR qualquer lição
// de qualquer unidade (mesmo travada pros demais usuários), sem nunca
// desbloquear nada de verdade nem mexer no progresso real. Reaproveita o
// mesmo modo revisão não-destrutivo de openLessonReview (ver
// STEP_STATE.lessonReview): a lição abre pra estudo/conferência, mas
// terminar ela não avança lessonIdx nem concede XP/desafio.
//
// Isto é sempre a IDENTIDADE (isAdminUser -- calculada por e-mail, nunca
// muda) -- o bypass de navegação abaixo em buildUnitBlock() só se aplica
// quando isAdminModeOn() (shared/profile.js) também for true. Com Admin
// Mode OFF, a conta continua sendo reconhecida como admin (Painel de
// Admin, ferramentas etc. -- ver Fase 10), só a navegação/conclusão de
// lição passa a seguir exatamente a mesma regra de um aluno comum.
const ADMIN_EMAIL = 'brunemed1310@gmail.com';
// Lembra se o aluno abriu/fechou manualmente o bloco de uma unidade nesta
// sessão (não é salvo -- é só estado de UI). Sem entrada aqui, o bloco usa o
// padrão: concluída/bloqueada começam compactas, a unidade atual começa
// expandida.
const UNIT_BLOCK_EXPAND_OVERRIDE = {};
// ---------- Sessão de aquisição de vocabulário (introdução + prática intercalada) ----------
// Substitui o antigo fluxo linear "Palavra 1 de N ... Palavra N de N" seguido
// de um bag único de exercícios no final. Em vez disso, a unidade é dividida
// em pequenos blocos de palavras novas; cada bloco passa por
// introdução -> checagem imediata -> prática, e a partir do segundo bloco
// os exercícios de prática misturam o bloco atual com todos os anteriores
// (recuperação ativa, não repetição na ordem em que acabou de ver). O passo
// final da unidade ("exercises") vira uma consolidação curta, priorizando
// as palavras que o aluno errou mais durante a sessão em vez de repetir a
// unidade inteira de novo -- ver buildExerciseSet(). Só se aplica a
// unidades de vocabulário (u.type !== 'grammar' já sai mais cedo em
// renderStep, antes de qualquer código daqui). Referência conceitual: a
// separação do Memrise entre "aquisição" e "prática/revisão intercalada"
// dentro da mesma sessão -- não uma cópia de interface, só do princípio.
const ACQ_BLOCK_SIZE = 3;
const STEP_STATE = {
  currentStep: 0,
  acq: { unitId: null, blocks: [], blockIdx: 0, phase: 'intro', introIdx: 0, wordMisses: {}, introduced: {}, lessonScore: { correct: 0, total: 0 }, xpAtLessonStart: 0 },
  exerciseList: [],
  exerciseIndex: 0,
  exerciseScore: 0,
  // XP real desta lição/checkpoint (Fase 1/3 da tarefa de conclusão de
  // lição/unidade) -- snapshot de STATE.xp tirado no início da sessão de
  // consolidação do checkpoint (ver renderStep, stepKey 'exercises'/
  // 'checkpointExercises'); null fora dessa sessão.
  checkpointXpAtStart: null,
  // Erros DESTE Ponto de verificação (Revisão dos erros + consolidação
  // principal juntas) -- vocabIdx -> contagem. Independente de
  // STEP_STATE.acq.wordMisses/STATE.unitProgress[u.id].lessonMisses (que
  // acumulam por LIÇÃO/UNIDADE ao longo do tempo, resetam só quando a
  // unidade termina): aquele objeto só é inicializado quando o passo
  // 'vocab' roda (ver freshAcquisitionState em renderStep), e o Ponto de
  // verificação nunca tem passo 'vocab' (currentStepDefs devolve só
  // 'checkpointExercises') -- reabrir a unidade direto na última lição e ir
  // pro checkpoint sem passar pela introdução de nenhuma lição nesta sessão
  // deixava STEP_STATE.acq.unitId nulo, e o card do resultado do checkpoint
  // ("Palavras que você errou no Ponto de verificação") caía pra um
  // lessonMisses desatualizado/vazio -- uma lista que não correspondia ao
  // erro real que o aluno acabou de cometer (bug relatado, 2026-09-15).
  // Resetado só ao entrar no checkpoint (ver renderStep, stepKey
  // 'checkpointExercises'), nunca em openUnitDetail (mesmo padrão de
  // checkpointXpAtStart).
  checkpointMisses: {},
  // Respostas CERTAS seguidas na lição atual (zera em qualquer erro ou
  // "Não sei" -- ver showAnswerPanel) -- alimenta o modo combo do painel de
  // acerto (ver showCorrectFeedbackPanel).
  comboCount: 0,
  exerciseAnswered: false,
  explanationIndex: 0,
  explanationUnitId: null,
  gramExerciseUnitId: null,
  gramExerciseIndex: 0,
  gramExerciseScore: 0,
  onChallengesScreen: false,
  onCheckpoint: null,
  onLevelTest: null,
  // Fila de cartões de conceito (explicação contextual) tocando AGORA, por
  // cima do passo normal (vocab/diálogo) -- ver runConceptQueueThen. Vazia
  // na maior parte do tempo; só existe entre o momento em que um conceito é
  // disparado e o aluno terminar de ler todos os cartões pendentes daquele
  // ponto da lição.
  conceptQueue: [],
  conceptIdx: 0,
  conceptBlockIdx: 0,
  conceptAfterFn: null,
  conceptsShown: new Set(),
  // Tela de "lição concluída" (Modelo B, entre lições da mesma unidade,
  // nunca no fim da unidade inteira -- essa continua usando
  // onChallengesScreen). Guarda quantos cartões estão devidos AGORA pra
  // decidir, no clique de "Continuar", se leva direto pro Flashcard.
  onLessonBoundaryScreen: null,
  // Tela "Unidade concluída!" (Fase 4 da tarefa de conclusão de
  // lição/unidade) -- true só enquanto ela está na tela, entre o fim do
  // Ponto de verificação e a tela de Desafios de hoje. "Continuar" aqui
  // NUNCA revisita lógica de conclusão (markUnitCompleted já rodou) -- só
  // avança pra renderDailyChallengesScreen, exatamente o que já acontecia
  // antes desta tela existir.
  onUnitCompleteScreen: false,
  // Cache pra restaurar esta tela via Voltar/Avançar do navegador (mesmo
  // padrão de lastUnitResultCache) -- nunca reexecuta markUnitCompleted.
  lastUnitCompleteCache: null,
  // Revisão de uma lição JÁ CONCLUÍDA (ou, pra conta admin, QUALQUER lição
  // de QUALQUER unidade -- ver isAdminUser), clicada direto na lista
  // expandida da Trilha (ver buildUnitBlock) -- { unitId, reviewIdx }, null
  // fora de revisão. NUNCA mexe em STATE.unitProgress[unitId].lessonIdx (o
  // ponteiro de progresso real fica intocado o tempo todo) --
  // currentLessonIdx() devolve reviewIdx no lugar dele enquanto isto existe,
  // só pra essa unidade. Por construção não há nada pra "corromper" mesmo se
  // o aluno fechar a aba no meio da revisão. exitToPath() (único jeito de sair
  // durante o modo foco) e finishCurrentLesson() zeram isto de volta pra
  // null antes de voltar pra Trilha.
  lessonReview: null
};
const CONFETTI_COLORS = ['#d64545', '#e3b341', '#2f8f6e', '#3498d6', '#a15fc9'];
// ---------- Geração dos exercícios (múltipla escolha + ordenar, estilo Memrise) ----------
// A pergunta sempre mostra a palavra/frase em francês (com áudio) e pede a
// tradução em português como resposta.
// ---------- Consolidação final da unidade (ETAPA 7) ----------
// Depois que a aquisição por blocos já deu a cada palavra checagem + prática
// (+ mistura, a partir do 2º bloco), repetir a unidade inteira de novo aqui
// seria só reexpor conteúdo já praticado à toa. Em vez disso, prioriza quem
// errou durante a sessão e pega só uma amostra do resto -- consolidação como
// recuperação e aplicação, não como "mostrar tudo de novo". Se o estado de
// aquisição não corresponder a esta unidade (estado inconsistente), cai de
// volta pra cobrir todas as palavras.
// CONSOLIDATION_CAP existe pra a consolidação continuar CURTA mesmo numa
// sessão onde o aluno errou muitas palavras -- sem teto, "priorizar quem
// errou" vira o oposto do pedido (uma sessão que só cresce quanto mais o
// aluno erra). Cobre cada palavra errada 1x primeiro; só dá uma 2ª rodada
// pra elas se ainda sobrar espaço dentro do teto.
const CONSOLIDATION_CAP = 10;
// ---------- Atalho de teclado 1-4 pras alternativas selecionáveis ----------
// Um ÚNICO listener global (registrado uma vez, no fim deste arquivo -- ver
// abaixo), nunca um novo por exercício renderizado. Cada tela de exercício
// só chama wireKeyboardOptions (que atualiza KEYBOARD_OPTION_MAP) ou deixa
// de chamar (digitação, ordenar frase) -- o mapa fica null nesses casos e o
// listener não faz nada.
let KEYBOARD_OPTION_MAP = null;
// Estimativa de minutos estudados: cada exercício respondido (certo ou errado)
// conta como ESTIMATED_SECONDS_PER_EXERCISE segundos, acumulado por dia — usado
// pelo anel de meta diária. Não é cronômetro real (a pessoa pode demorar mais
// ou menos), é uma aproximação, igual optamos ao invés de medir tempo de tela.
const ESTIMATED_SECONDS_PER_EXERCISE = 20;
// Painel de acerto (estilo Duolingo): toda resposta certa PÁRA aqui em vez
// de avançar sozinha -- só segue pro próximo exercício quando o aluno toca
// "Continuar". A frase de elogio varia a cada vez (nunca repete a mesma
// duas vezes seguidas dentro da mesma lição, ver nextCorrectFeedbackPhrase).
// A partir de COMBO_MIN acertos seguidos entra em "modo combo" (badge ⚡ +
// frase de incentivo própria, ver COMBO_PHRASES/nextComboPhrase acima).
// `detail`, quando informado, é o HTML extra que vale a pena reforçar mesmo
// já tendo acertado -- ex: a frase inteira (montar a ordem certa não
// garante que o aluno entendeu o SENTIDO). Pra formatos onde a resposta
// certa já fica visível na própria tela do exercício antes do painel abrir
// (múltipla escolha destaca a opção certa, cloze já revela a tradução),
// repetir a mesma informação de novo dentro do painel não ajuda em nada --
// passa null.
// Chaves do catálogo (i18n fase 9): o texto é resolvido no momento do uso.
const CORRECT_FEEDBACK_PHRASES = Array.from({ length: 16 }, (_, i) => 'feedback.praise.' + (i + 1));
let correctFeedbackQueue = [];
// ---------- Combo de acertos seguidos (estilo Duolingo) ----------
// A partir de COMBO_MIN acertos seguidos (ver STEP_STATE.comboCount, zerado
// em showAnswerPanel a cada erro/"Não sei"), o painel troca a frase de
// elogio genérica por uma de incentivo de combo -- e a cada múltiplo de
// COMBO_MILESTONE_STEP mostra o número explícito ("Uau, 5 seguidas!") em
// vez de uma frase genérica, pra marcar só os marcos redondos, não toda
// resposta certa da sequência.
const COMBO_PHRASES = ['feedback.combo.1', 'feedback.combo.2', 'feedback.combo.3'];
let comboPhraseQueue = [];
const COMBO_MIN = 3;
const COMBO_MILESTONE_STEP = 5;
// ============================================================
// RENDER: Revisão (SRS)
// ============================================================
const SPEED_TIME_LIMIT = 6000;
// XP real por resposta certa no Speed Review -- mesmo patamar do Combinar
// (addXP(2) por par, ver startMatchGame) já que os dois são jogos de
// reconhecimento rápido, não revisão espaçada de verdade (não mexem no
// SM2 -- ver comentário de renderReviewModeSelect). O "score" em pts
// mostrado na tela É SEPARADO disso: é só a pontuação do minijogo
// (velocidade de resposta), nunca foi XP de verdade nem contava pro
// Ranking -- daí o relato "ganhei pontos demais mas não foram pro
// Ranking". Mantido propositalmente bem menor que o score em pts pra não
// inflar XP artificialmente num modo sem o "custo" de uma revisão SM2 real.
const SPEED_REVIEW_XP_PER_CORRECT = 2;
const SPEED_STATE = {
  active: false,
  queue: [],
  index: 0,
  hearts: 3,
  score: 0,
  correctCount: 0,
  streak: 0,
  bestStreak: 0, // maior sequência de acertos da rodada (recorde do Speed Review)
  timerStart: 0,
  timerHandle: null,
  // A3 (revisão de 2026-10-24): passagem para a próxima pergunta (700 ms depois da resposta) e número da sessão, para
  // que nada da sessão anterior rode depois de a aluna sair (Voltar, outra aba) ou começar outra.
  advanceHandle: null,
  session: 0,
  answered: false,
  dailyCounted: false
};
// Rótulos curtos reaproveitados em 2 lugares: as opções do <select> no
// painel ⚙️ (com contagem entre parênteses) e o indicador discreto no
// hero (sem contagem, só o nome do filtro ativo) -- texto-fonte único
// pra nunca dessincronizar entre os dois.
const REVIEW_FILTER_LABELS = {
  get all(){ return t('review.origin.all'); },
  get hard(){ return t('review.filter.hard'); },
  get oldest(){ return t('review.filter.oldest'); }
};
// ---------- Combinar: jogo de pares (francês <-> tradução) ----------
// Pool: TODA palavra de uma lição já concluída (eligibleReviewPool), sem
// exigir reps>0 nem respeitar data de vencimento do SM2 -- é jogo, não
// ferramenta de revisão espaçada (decisão da autora, ver auditoria do
// sistema de XP). Tamanho da sessão é escolha do aluno (ver
// renderMatchSizePicker/MATCH_SIZE_OPTIONS), não fixo.
const MATCH_SIZE_OPTIONS = [5, 8, 10]; // pares -- 10/16/20 cartas
const MATCH_STATE = {
  pairSize: 8,     // pares por sessão, escolhido em renderMatchSizePicker
  pairs: [],       // [{cardId, front, back}]
  tiles: [],       // [{cardId, side:'front'|'back', text}]
  selected: null,  // tile element selecionado aguardando o par
  matchedCount: 0,
  attempts: 0,     // quantas vezes o aluno tentou um par (acertou ou não)
  busy: false      // trava cliques durante a animação de erro
};
// Toggle manual da sidebar (desktop, ≥900px) -- "Mostrar/Ocultar barra
// lateral", inspirado no do Claude. Independe do modo foco automático da
// lição (.lesson-focus), que sempre esconde tudo de qualquer jeito. Estado
// persistido por dispositivo, mesmo padrão de CHALLENGES_STRIP_COLLAPSE_KEY.
const SIDEBAR_COLLAPSE_KEY = 'sidebar_collapsed';
// Alterna entre as duas seções internas de Configurações (Geral/Exportar) --
// mesmo padrão de switchAdminPanelSection (shared/admin-analytics.js).
// Lembra a última seção aberta (SETTINGS_SECTION), mesmo espírito de
// ADMIN_PANEL_STATE.section: reabrir sempre na mesma aba entre visitas.
let SETTINGS_SECTION = 'geral';
// Fase 10, movido pra Revisão na 2ª sessão de grilling, ícone de acesso
// trocado na 3ª (ver #review-header-settings-btn/#review-settings-panel):
// sincroniza os 3 controles de sessão com STATE.studySettings -- roda toda vez que o
// painel "⚙️ Configurar sessão" é aberto.
// Lista fixa de opções de "Novas palavras por dia" (4ª rodada de
// grilling -- era um stepper -/+ livre de 0 a 50). 9999 é o sentinela de
// "sem limite": não existe pool de conteúdo remotamente perto desse
// tamanho (fr/content.js ~940 blocos, zh/content.js ~608), então
// slice(0, 9999) em getStudyQueue já devolve a lista inteira sem precisar
// de nenhum caso especial no motor -- e ao contrário de usar Infinity,
// sobrevive normalmente a JSON.stringify (Supabase/localStorage).
const NEW_CARDS_PER_DAY_OPTIONS = [0, 5, 10, 15, 20, 9999];

// Conteúdo do curso no idioma do site: ressincroniza quando o idioma muda e uma vez no carregamento.
function wireContentI18nSync(){
  window.addEventListener('i18n:change', () => { CONTENT_I18N.sync(); });
  CONTENT_I18N.sync();
}

// Preferências da lição (lacuna digitada x múltipla escolha, som de acerto/erro): chaves e estado inicial.
function wireStudyPreferenceSwitches(){
  document.getElementById('cloze-mode-switch').addEventListener('change', () => {
    const next = getClozeMode() === 'type' ? 'choice' : 'type';
    localStorageSafeSet(CLOZE_MODE_KEY, next);
    updateClozeModeSwitch();
  });
  updateClozeModeSwitch();
  document.getElementById('feedback-sound-switch').addEventListener('change', () => {
    localStorageSafeSet(FEEDBACK_SOUND_KEY, isFeedbackSoundEnabled() ? '0' : '1');
    updateFeedbackSoundSwitch();
  });
  updateFeedbackSoundSwitch();
}

// Botões do menu do app (perfil, ranking, configurações, admin, reportar) e o Continuar da janela de sequência.
function wireAppMenuButtons(){
  // "Meu perfil" abre a tela de identidade própria (shared/profile.js) --
  // deixou de ser um alias de "Seu progresso" (ver arquitetura aprovada:
  // Perfil != painel de estatísticas). "Seu progresso" continua existindo,
  // só passou a ser alcançado a partir de dentro do Perfil ("Ver
  // estatísticas completas").
  document.getElementById('user-profile-btn').addEventListener('click', () => {
    document.getElementById('user-menu-dropdown').classList.remove('open');
    switchTab('profile');
  });
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    document.getElementById('user-menu-dropdown').classList.remove('open');
    switchTab('leaderboard');
  });
  document.getElementById('user-settings-btn').addEventListener('click', () => {
    document.getElementById('user-menu-dropdown').classList.remove('open');
    switchTab('settings');
  });
  document.getElementById('admin-badges-btn').addEventListener('click', () => {
    document.getElementById('user-menu-dropdown').classList.remove('open');
    switchTab('admin-badges');
  });
  // Entrada geral da bandeira ⚑ (menu "Mais"/usuário) -- sem contexto de
  // exercício específico, captureReportContext() ainda pega unidade/lição
  // atual se o clique acontecer em modo foco.
  document.getElementById('report-menu-btn').addEventListener('click', () => {
    document.getElementById('user-menu-dropdown').classList.remove('open');
    openReportModal({ source: 'menu' });
  });
  document.getElementById('streak-modal-continue-btn').addEventListener('click', () => {
    document.getElementById('streak-modal-overlay').style.display = 'none';
  });
}

// Lembrete de revisão do rodapé: dispensar e ir revisar.
function wireReviewReminderButtons(){
  document.getElementById('review-reminder-dismiss-btn').addEventListener('click', () => {
    document.getElementById('review-reminder-banner').style.display = 'none';
    markReviewReminderSeen(); // fechou = viu: grava o dia agora
  });
  document.getElementById('review-reminder-cta-btn').addEventListener('click', () => {
    document.getElementById('review-reminder-banner').style.display = 'none';
    markReviewReminderSeen(); // clicou = viu: grava o dia antes de sair da tela
    switchTab('review');
    openReviewSession('flashcard');
  });
}

// Casca da lição: voltar para a trilha e a janela de atalhos de teclado.
function wireLessonChromeButtons(){
  document.getElementById('back-to-path').addEventListener('click', exitToPath);
  document.getElementById('lesson-kbd-btn').addEventListener('click', () => {
    document.getElementById('kbd-shortcuts-modal').style.display = 'flex';
  });
  document.getElementById('kbd-shortcuts-modal-close').addEventListener('click', () => {
    document.getElementById('kbd-shortcuts-modal').style.display = 'none';
  });
  document.getElementById('kbd-shortcuts-modal').addEventListener('click', (e) => {
    if (e.target.id === 'kbd-shortcuts-modal'){
      document.getElementById('kbd-shortcuts-modal').style.display = 'none';
    }
  });
}

// Atalhos de teclado da lição (1-4, Enter, r): um único listener global.
function wireLessonKeyboardShortcuts(){
  // Registrado uma única vez, no carregamento do script -- nunca por render.
  document.addEventListener('keydown', (e) => {
    if (anyAppModalOpen()) return;

    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey){
      // Enter digitado DENTRO de um campo de resposta é do próprio campo (ele
      // chama Verificar). Sem isto, o mesmo Enter que mostra o painel de erro
      // também clicava "Continuar" dele na hora, e o aluno nunca via o
      // resultado (relato de 2026-10-07: "haizi" no ditado de pinyin).
      const tgt = e.target;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      const target = findEnterAdvanceTarget();
      if (target){
        e.preventDefault();
        target.click();
      }
      return;
    }

    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

    // "r" repete o último áudio que de fato tocou (clique manual ou autoplay)
    // -- reaproveita o mesmo botão/clique de sempre, não uma lógica própria.
    // Sem modificador: Ctrl/Cmd+R continua sendo "recarregar página" do navegador.
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey){
      if (LAST_AUDIO_BTN && LAST_AUDIO_BTN.isConnected && !LAST_AUDIO_BTN.disabled && !LAST_AUDIO_BTN.classList.contains('disabled')){
        e.preventDefault();
        LAST_AUDIO_BTN.click();
      }
      return;
    }

    if (!KEYBOARD_OPTION_MAP) return;
    const entry = KEYBOARD_OPTION_MAP.find(x => x.key === e.key);
    if (!entry) return;
    if (!entry.el.isConnected || entry.el.disabled || entry.el.classList.contains('disabled')) return;
    e.preventDefault();
    entry.el.click();
  });
}

// Revisão: voltar para a escolha de modo.
function wireReviewBackToModes(){
  document.getElementById('review-back-to-modes').addEventListener('click', backToReviewModeSelect);
}

// Abas do menu lateral e a barra lateral recolhida (preferência salva).
function wireTabsAndSidebar(){
  // [data-tab] exclui #mais-btn (barra inferior, Fase 6) -- ele reaproveita a
  // classe .tab-btn só pelo visual, mas não é uma aba de verdade (abre o
  // menu "Mais" via listener próprio em shared/auth.js, não troca de view).
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  if (localStorageSafeGet(SIDEBAR_COLLAPSE_KEY) === '1'){
    document.getElementById('app').classList.add('sidebar-collapsed');
  }
  syncSidebarToggleLabel();
  document.getElementById('sidebar-toggle-btn').addEventListener('click', () => {
    const collapsed = document.getElementById('app').classList.toggle('sidebar-collapsed');
    localStorageSafeSet(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
    syncSidebarToggleLabel();
  });
}

// Configurações da Revisão (frequência, novas por dia, intensidade, origem, tags) e as seções de Configurações.
function wireReviewSettingsControls(){
  document.getElementById('review-frequency-select').addEventListener('change', (e) => {
    updateStudySetting({ reviewFrequency: e.target.value });
  });
  document.getElementById('review-newcards-select').addEventListener('change', (e) => {
    updateStudySetting({ newCardsPerDay: Number(e.target.value) });
  });
  document.getElementById('review-intensity-select').addEventListener('change', (e) => {
    updateStudySetting({ sessionIntensity: e.target.value });
  });
  // Fase 4 do sistema de alunas particulares (ver CLAUDE.md) -- elemento só
  // existe no HTML se o app tiver a seção nova (index.html); no-op seguro
  // se por algum motivo não existir (mesmo padrão defensivo de outros
  // selects opcionais desta tela).
  document.getElementById('review-origin-select')?.addEventListener('change', (e) => {
    updateStudySetting({ reviewOriginFilter: e.target.value });
  });
  // Fase I (Tags): alterna uma tag no filtro (OR); "Limpar" volta a [].
  document.getElementById('review-tag-chips')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-review-tag]');
    if (!btn) return;
    const tag = btn.dataset.reviewTag;
    const cur = activeReviewTagFilter();
    updateStudySetting({ reviewTagFilter: cur.includes(tag) ? cur.filter(t => t !== tag) : cur.concat(tag) });
  });
  document.getElementById('review-tag-clear')?.addEventListener('click', () => {
    updateStudySetting({ reviewTagFilter: [] });
  });
  document.querySelectorAll('[data-settings-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSettingsSection(btn.dataset.settingsSection));
  });
}

// Voltar e Continuar da lição (texto do fr; o do zh calculava a unidade antes e passava para currentStepDefs(u), que dá o
// mesmo: currentStepDefs() sem argumento usa a unidade atual).
function wireStepNavButtons(){
  document.getElementById('step-back-btn').addEventListener('click', () => {
    const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;

    // No passo de vocabulário, "Voltar" recua palavra a palavra dentro do
    // bloco atual (e entre blocos) antes de sair do passo -- não existe
    // "voltar" dentro de checkpoint/practice/mixed (o botão fica escondido
    // nessas fases, ver renderStep).
    if (stepKey === 'vocab' && STEP_STATE.acq.phase === 'intro'){
      const acq = STEP_STATE.acq;
      if (acq.introIdx > 0){
        acq.introIdx -= 1;
        renderStep();
        return;
      }
      if (acq.blockIdx > 0){
        acq.blockIdx -= 1;
        acq.introIdx = acq.blocks[acq.blockIdx].length - 1;
        renderStep();
        return;
      }
    }

    if (grammarStepBack(stepKey)) return; // explicação da unidade de gramática: volta um bloco

    if (STEP_STATE.currentStep > 0){
      STEP_STATE.currentStep -= 1;
      renderStep();
    }
  });
  document.getElementById('step-next-btn').addEventListener('click', () => {
    // Tela "Unidade concluída!" (Fase 4) -- markUnitCompleted já rodou
    // (concedeu XP, desbloqueou a próxima unidade etc.) antes desta tela
    // aparecer; "Continuar" aqui só avança pra Desafios de hoje, nunca
    // reexecuta lógica de conclusão.
    if (STEP_STATE.onUnitCompleteScreen){
      STEP_STATE.onUnitCompleteScreen = false;
      STEP_STATE.onChallengesScreen = true;
      renderDailyChallengesScreen();
      return;
    }
    if (STEP_STATE.onChallengesScreen){
      STEP_STATE.onChallengesScreen = false;
      setLessonFocusMode(false);
      document.getElementById('path-list-wrap').style.display = 'block';
      document.getElementById('unit-detail-wrap').style.display = 'none';
      renderUnitsGrid();
      return;
    }

    // Tela de "Lição concluída" (Modelo B, entre lições da mesma unidade) --
    // se havia cartões devidos no momento em que a lição terminou, leva
    // direto pro Flashcard em vez de voltar pra trilha.
    if (STEP_STATE.onLessonBoundaryScreen){
      const { dueCount } = STEP_STATE.onLessonBoundaryScreen;
      STEP_STATE.onLessonBoundaryScreen = null;
      setLessonFocusMode(false);
      document.getElementById('unit-detail-wrap').style.display = 'none';
      document.getElementById('path-list-wrap').style.display = 'block';
      renderUnitsGrid();
      if (dueCount > 0){
        switchTab('review');
        openReviewSession('flashcard');
      }
      return;
    }

    // Um cartão de explicação contextual está tocando por cima do passo normal
    // -- "Continuar"/"Entendi" aqui avança DENTRO da fila de conceitos, não do
    // passo da unidade (ver runConceptQueueThen). Tem prioridade sobre tudo
    // abaixo, igual checkpoint/practice/mixed já tinham sobre o vocab normal.
    if (STEP_STATE.conceptQueue.length){
      advanceConceptStep();
      return;
    }

    // Fim do Ponto de verificação / Teste de Nível (shared/core/modulos-niveis.js): aplica a aprovação e volta à trilha.
    if (handleModuleStepNext()) return;

    const stepKey = currentStepDefs()[STEP_STATE.currentStep].key;

    // No passo de vocabulário, o botão "Continuar" só existe na fase de
    // introdução (checkpoint/practice/mixed escondem o botão global e avançam
    // pela navegação própria dos exercícios).
    if (stepKey === 'vocab'){
      const acq = STEP_STATE.acq;
      if (acq.phase === 'intro'){
        const block = acq.blocks[acq.blockIdx];
        if (acq.introIdx < block.length - 1){
          acq.introIdx += 1;
          renderStep();
        } else {
          finishBlockIntro();
        }
      }
      return;
    }

    // Explicação da unidade de gramática: avança um bloco (shared/core/gramatica-cenario.js).
    if (grammarStepNext(UNITS.find(x => x.id === STATE.currentUnitId), stepKey)) return;

    // Saindo do diálogo: mostra os conceitos cujo gatilho só existe em
    // contexto (o padrão em si não é vocabulário novo, só aparece na fala)
    // antes de seguir pro próximo passo da unidade.
    if (stepKey === 'dialogue'){
      const u = UNITS.find(x => x.id === STATE.currentUnitId);
      runConceptQueueThen(pendingConceptsAfterDialogue(u), () => advanceUnitStep(u));
      return;
    }

    advanceUnitStep(UNITS.find(x => x.id === STATE.currentUnitId));
  });
}
