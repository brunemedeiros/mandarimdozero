/* ============================================================
   Francês do Zero — lógica do app
   Adaptado do motor do app de chinês: SRS (SM-2), TTS via Web Speech API,
   gamificação, persistência via Supabase, exportação para Anki (.apkg).
   Diferenças principais em relação ao original:
   - Sem par pinyin/hanzi: cada item de conteúdo é só { f: francês, t: português }.
   - Sem trilha de caracteres (não existe no francês) — no lugar, aba de
     Conjugação (seleção livre de tempos + categoria de verbo, sempre as 6 pessoas).
   - Aba Manual removida. Não consta em docs/PARIDADE.md como pendência --
     se for pra voltar, é uma feature nova, não uma restauração.
   - Exportar deixou de ser aba própria, virou botão/modal na Trilha e agora
     mora numa aba interna de Configurações ("📦 Exportar").
   ============================================================ */

// Voz do idioma estudado: shared/core/voz.js (comum aos sites, paridade 5d). Os nomes de sempre ficam como repasses.
function loadFrenchVoice(){ return loadStudyVoice(); }
function canSpeakFrench(text){ return canSpeakStudy(text); }
function speakFrenchAudioOnly(text, btnEl, isAutoplay){ return speakStudyAudioOnly(text, btnEl, isAutoplay); }
function speakFrench(text, btnEl, isAutoplay){ return speakStudy(text, btnEl, isAutoplay); }

initStudyVoice();


// ---------- Som curto de acerto/erro (feedback por exercício) ----------
// Sintetizado via Web Audio API -- sem arquivo de áudio externo pra baixar/
// hospedar, e sem disputar com o player de pronúncia acima (Audio/Speech
// Synthesis são players diferentes; um "ding" de ~200ms não precisa de
// stopExerciseAudio()). Silenciável em Preferências (Seu progresso).
const FEEDBACK_SOUND_KEY = 'frances_feedback_sound';


// Reports reais de alunos ("o audio está muito rápido") em cima do áudio
// pré-gerado (voz neural fr-FR-Chirp3-HD-Achernar), que toca na velocidade
// nativa (playbackRate 1.0, sem ajuste nenhum) diferente do fallback de
// Web Speech API logo abaixo, que já usa u.rate = 0.9 há muito tempo --
// aparentemente por essa mesma razão de compreensão pro aluno. Reaproveita
// o mesmo valor 0.9 já calibrado nesta função pro pregenerated também, em
// vez de inventar um número novo. Não mexe no botão "🐢 Lentement"
// (SLOW_AUDIO_RATE = 0.65) -- esse continua sendo o modo "bem mais devagar"
// à parte, isto aqui só normaliza o ritmo padrão.
const PREGEN_AUDIO_RATE = 0.9;


keepStudyVoiceAwake(); // shared/core/voz.js


// 3 eixos de "profundidade" aprovados no grilling, por nível -- só o
// eixo 1 (explanationDepth) está de fato em uso hoje, porque só A1 existe.
// Os outros 2 (testableInExercise, categoriesAllowed) ficam aqui como
// parâmetros PRONTOS pra quando A2+ existir -- não aplicados por nenhum
// código ainda (não há nenhuma nota de realidade escrita), só a decisão
// travada de o que cada nível vai permitir. A2/B1/B2 são hipotéticos --
// ajustar se o currículo real desviar disso.
//
// Um 4º eixo, `densityPerUnit` (faixa numérica min/max de notas por
// unidade), existiu aqui até 2026-09-17 e foi REMOVIDO por decisão
// explícita da autora num 2º grilling: ela não quer nenhum limite -- nem
// mínimo nem máximo -- por unidade ou nível. A regra que vale agora é
// só qualitativa: uma nota entra se e somente se houver uma relação
// pedagógica real com uma palavra/expressão que a lição está ensinando
// naquele momento (mesmo princípio de "Coerência pedagógica entre
// funcionalidades" no topo do CLAUDE.md), podendo haver mais de uma nota
// na mesma lição quando cada uma responder a um ponto genuinamente
// diferente. Motivação dela, verbatim: "o aluno A1 quer aprender o
// conteúdo REAL das situações simples do dia a dia, e não apenas o
// conteúdo mais fácil" -- ver CLAUDE.md pra o resto da decisão (inclusive
// o fluxo de revisão manual que substitui o limite numérico como o
// verdadeiro controle de qualidade/volume).
const REALITY_NOTE_LEVEL_GUIDANCE = {
  A1: {
    // Eixo 1 -- guia de quanto escrever por nota (decisão editorial, não
    // enforçada em código: não há linter de tamanho de texto neste repo).
    explanationDepth: 'curta',       // 1 frase, sem contexto social extra
    // Eixo 2 -- se a nota pode virar pergunta de exercício (feature ainda
    // não construída, ver Q2 do grilling: card passivo é o MVP, exercício
    // de reconhecimento é fase 2 explicitamente adiada).
    testableInExercise: false,
    // Eixo 3 -- quais categorias este nível já pode usar.
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial'],
  },
  A2: {
    explanationDepth: 'media',       // pode incluir contexto social (quem usa, quando)
    testableInExercise: false,
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial', 'familiar-giria'],
  },
  B1: {
    explanationDepth: 'media',
    testableInExercise: true,        // "usar adequadamente" -- primeiro nível onde testar faz sentido
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial', 'familiar-giria'],
  },
  B2: {
    explanationDepth: 'alta',        // pragmática/ironia/marcadores sociais -- ainda sem categoria própria
    testableInExercise: true,
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial', 'familiar-giria'],
  },
};


// ---------- Estado global ----------
const STATE = {
  units: UNITS,
  cards: buildCardsFromUnits(UNITS),
  unitProgress: {},
  xp: 0,
  streak: 0,
  lastStudyDay: null,
  lastReviewReminderDay: null,
  pendingStreakCelebration: false, // true = streak de hoje já contou, falta mostrar a tela (só ao fim da atividade atual). Nunca persistido -- é sempre por sessão.
  hadStreakComeback: false, // true = já retomou o streak em até 3 dias após perdê-lo (badge "De volta ao jogo") -- uma vez true, fica true pra sempre
  totalAudioPlays: 0, // vitalício, nunca zera (badge "Ouvido treinado")
  everUsedSpeedReview: false, // vitalício (badge "Exploradora")
  everUsedMatchGame: false, // vitalício (badge "Exploradora")
  modesUsed: {}, // conquistas: modos de estudo já usados (trilha Explorar), ex.: { conjugation: true }
  dictationsAced: 0, // conquistas: ditados com 90% ou mais, contando repetições (trilha Ditado)
  // XP da semana corrente -- preparação pra leaderboard futura (artefato
  // §9), NÃO implementa leaderboard nenhuma. Separado do XP vitalício
  // (acima) porque uma leaderboard semanal precisa de um número que reseta;
  // resetado por leitura (ensurePeriodXp), sem job/cron.
  periodXp: { weekStart: null, amount: 0 },
  activityLog: {},
  reviewRecords: { speedBestScore: 0, speedBestStreak: 0, matchBestMs: null, hardSeenIds: [] }, // recordes dos modos (shared/review-extras.js)
  reviewTimeStats: { cards: 0, ms: 0 }, // tempo por cartão (estimativa de minutos e sessão de 5 min)
  studyGoal: {
    objective: null, levels: [],
    days: { mon:true, tue:true, wed:true, thu:true, fri:true, sat:true, sun:true },
    hour: 8, minute: 0, notifications: false,
    dailyMinutes: 0, // legado (era a unidade da meta antes da Fase 3 -- não lido mais pra nada, só preservado se já existir salvo)
    dailyLessonsGoal: 0 // 0 = meta ainda não definida; 1/2/3 = Casual/Regular/Intenso
  },
  // Fase 10 (configurações simplificadas do motor de memória) -- só 3
  // controles simples, nenhum parâmetro do FSRS exposto diretamente. Ver
  // reviewFrequencyToRetention/sessionIntensityToLimit mais abaixo, que
  // traduzem essas 3 opções pra valores reais do motor.
  studySettings: {
    reviewFrequency: 'balanced', // 'frequent' | 'balanced' (padrão) | 'spaced'
    newCardsPerDay: 10,
    sessionIntensity: 'normal', // 'light' | 'normal' (padrão) | 'intense'
    reviewFilter: 'oldest', // 'all' | 'hard' | 'oldest' (padrão) -- ver reviewFilterQueue()
    // Fase 4 do sistema de alunas particulares (ver CLAUDE.md): filtro por
    // origem do cartão -- ver matchesReviewOriginFilter/eligibleReviewPool.
    reviewOriginFilter: 'all', // 'all' (padrão) | 'study' | 'teacher'
    // Fase I (Tags): filtro por Tag, OR entre as selecionadas ([] = sem filtro).
    reviewTagFilter: []
  },
  dailyMinutesLog: {}, // legado -- não lido mais pra nada, só continua sendo escrito (addStudyMinutes) pra não perder histórico já salvo
  dailyLessonsLog: {}, // 'YYYY-MM-DD' -> lições (que contam pra meta) concluídas naquele dia
  totalReviews: 0,
  currentUnitId: null,
  reviewQueue: [],
  reviewIndex: 0,
  // Fase 6C.1/6C.2/6C.3 (ver CLAUDE.md) -- estado efêmero da exibição
  // ATUAL do renderer em uso (shape varia por `kind`: {kind:'normal',
  // revealed} | {kind:'multiple_choice', shuffledOptions, selectedIndex,
  // answered, wasCorrect} | {kind:'type_answer', typedAnswer, answered,
  // wasCorrect} | {kind:'cloze', markId, typedAnswer, answered,
  // wasCorrect}). Dono é a SESSÃO (renderReviewView cria, gradeCurrentCard/
  // reviewMoreCurrentCard descartam) -- o renderer nunca lê/escreve isto
  // por nome, só recebe a referência como parâmetro `localState`.
  // Substitui o antigo `reviewShowingAnswer` (Fase 6C.1),
  // `reviewMCPicked`/`reviewMCCorrect` (Fase 6C.2) e `reviewClozeAnswered`
  // (Fase 6C.3) -- cada um era usado exclusivamente dentro de um único
  // renderer, confirmado por grep antes de remover. Nenhum campo solto de
  // tipo restante -- os 4 Card Types hoje suportados (normal/
  // multiple_choice/type_answer/cloze) usam exclusivamente este slot.
  reviewCardState: null,
  reviewSessionUnitFilter: null,
  // Fase 5 da trilha: sessão do marco de Revisão do módulo ({moduleId, unitIds}).
  // Nunca serializado; nulado nos mesmos pontos que reviewSessionDeckId.
  reviewSessionMilestone: null,
  // Fase D ("Decks, Tags e Painel" -- Deck Engine, ver CLAUDE.md) -- mesmo
  // papel/ciclo de vida de reviewSessionUnitFilter acima, só que pra Deck em
  // vez de unidade: setado só por startDeckReviewSession(), lido só por
  // renderReviewView() (texto do estado vazio), nulado nos MESMOS pontos que
  // já nulam reviewSessionUnitFilter -- nunca os dois setados ao mesmo tempo.
  // Nunca serializado (ver serializeState() -- mesmo motivo de reviewQueue/
  // reviewIndex/reviewCardState: é estado de SESSÃO, não progresso salvo).
  reviewSessionDeckId: null,
  // Aba Revisão do painel Aluno (2026-10-14): true só durante a sessão aberta
  // por startClassReviewSession() -- o pool passa a ser SÓ os cartões da
  // professora. switchTab() zera ao trocar de aba. Nunca serializado.
  reviewSessionClassReview: false,
  cardVariants: {}, // progresso das palavras que trocam por idioma do site (shared/card-variants.js)
  // Etapa 0 do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.3 item 7): arquivo do progresso de
  // cartão da trilha que não existe mais (excluído, fundido ou órfão). { id: {...progresso, retiredAt, mergedInto?} }.
  // Salvo no bloco; volta para o cartão se a chave voltar. Não conta em métrica, fila, notificação nem painel.
  retiredStudyCards: {},
  // Fase D -- cache em memória da árvore de Decks do idioma atual, carregada
  // sob demanda por ensureDecksLoadedForReview() (só quando uma sessão
  // Deck-scoped é de fato solicitada -- nenhum boot automático, nenhum
  // backfill). Nunca serializado -- fonte de verdade é sempre o Supabase
  // (shared/deck-data.js), este array é só uma leitura recente, nunca uma
  // contagem materializada (ver CLAUDE.md, seção "Performance" da Fase D).
  decks: [],
  courseDecksLoaded: false,
  currentLevel: LEVELS[0].id,
  checkpointProgress: {},
  // Fase 5: marco de Revisão por módulo -> { lastDate:'AAAA-MM-DD', lastCount } (opcional, só informativo).
  reviewMilestones: {},
  levelTestProgress: {},
  daily: {
    date: null, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
    grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0,
    conjugationTenses: [], reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0
  },
  completedChallenges: {}, // challengeId -> true -- "Desafios" concluídos, ver challenges_do_aluno
  // Ditados (Fatia 2): dictationId -> { bestScore, attempts, lastScore, lastAt, wrongWords }.
  // Atualizado só por updateDictationRecord() (bloco dictation-answer-logic).
  dictations: {},
  // Fase 6: revisão espaçada dos desafios errados (fail/partial). challengeId ->
  // { id, lastErrorAt, lastSeenAt, box } -- caixas Leitner 1/3/7/14 dias.
  // Atualizado só por updateChallengeReviewEntry() (bloco challenge-review-logic).
  challengeReviews: {}
};

// Só a PRIMEIRA unidade de cada nível já nasce destravada (isFirstOfLevel, shared/core/modulos-niveis.js).
UNITS.forEach((u) => {
  STATE.unitProgress[u.id] = {
    started:false, completed:false, unlocked: isFirstOfLevel(u),
    lessonIdx: 0, lessonMisses: {}
  };
});

// Progresso do Ponto de verificação e do Teste de Nível (um registro por módulo/teste): shared/core/modulos-niveis.js.
initModuleProgressState();

// Fase 8 (i18n): conteúdo do curso no idioma do site. Overlay em
// fr/content.<lang>.js (carregado sob demanda). O português continua sendo a
// fonte; unidade sem tradução aparece em português com aviso na lição.
const CONTENT_I18N = ContentI18n.create({
  units: UNITS, modules: MODULES, levels: LEVELS, levelTests: LEVEL_TESTS,
  overlayUrl: (lang) => `content.${lang}.js`,
  extraUrls: (lang) => [`challenges.${lang}.js`],
  getLang: () => (typeof getUiLang === 'function' ? getUiLang() : 'pt-BR'),
  onApplied: () => { refreshStudyCardTexts(); if (typeof applyProfilePlaceholders === 'function') applyProfilePlaceholders(); if (typeof repaintTrailForUiLanguage === 'function') repaintTrailForUiLanguage(); if (typeof repaintChallengesForUiLanguage === 'function') repaintChallengesForUiLanguage(); }
});
wireContentI18nSync(); // shared/core/app-comum.js

// Conexão com o Supabase (supabaseClient, cleanRedirectURL) agora vem de
// shared/supabase-client.js -- mesmo projeto/tabela `progress` de sempre,
// compartilhado com os outros idiomas da plataforma.
const APP_KEY = 'frances';
// Usado por shared/wizard.js na pergunta do objetivo ("aprender ${...}?").
const LANGUAGE_STUDY_NAME = 'francês';
// Id deste idioma em languages/index.js (AVAILABLE_LANGUAGES) -- usado pelo
// seletor de idioma no topbar (shared/language-switcher.js) pra saber qual
// card marcar como ativo e qual chave gravar em currentLearningLanguage.
const LANG_ID = 'fr';

// CURRENT_USER, GUEST_MODE_FLAG, initAuth/goToNeutralGate/enterGuestMode/
// onUserLoggedIn (login de verdade vive só no portão neutro, index.html da
// raiz -- este app só decide sessão/convidado/redirecionar) agora vêm de
// shared/auth.js, junto com saveState/loadState/notifySaveFailure.

// sessionStorageSafeGet/Set, localStorageSafeGet/Set e o tema claro/escuro
// (isDarkThemeActive, toggleTheme etc.) agora vêm de shared/utils.js e
// shared/theme.js, carregados antes deste arquivo (ver index.html) --
// compartilhados entre todos os idiomas, não duplicados por app.

// ---------- Preferência: modo do exercício de completar frase (cloze) ----------
// 'choice' (múltipla escolha, padrão) ou 'type' (digitar a palavra que falta),
// estilo o toggle "sempre digitar" do Duolingo — vale pra todos os exercícios
// de cloze, não é escolhido por exercício.
const CLOZE_MODE_KEY = 'frances_cloze_mode';


wireStudyPreferenceSwitches(); // shared/core/app-comum.js


// Login (Google/e-mail/convidado), menu do usuário e logout agora vêm de
// shared/auth.js -- os botões/formulários abaixo continuam no HTML de cada
// idioma, só a lógica de wiring foi extraída.

wireAppMenuButtons(); // shared/core/app-comum.js


// Itens extras do menu "Mais" (só mobile, ver .mais-extra-tab) -- Conjugação/
// Desafios não cabem nos 4 botões fixos da barra inferior, então vivem
// aqui (Ditados não tem mais entrada própria, vive dentro de Desafios).
['mais-conjugaison-btn', 'mais-challenges-btn'].forEach(id => {
  const btn = document.getElementById(id);
  btn.addEventListener('click', () => {
    document.getElementById('user-menu-dropdown').classList.remove('open');
    switchTab(btn.dataset.tab);
  });
});


// Prop 3 (ver CLAUDE.md, "7 propostas") -- "Meus Cartões" saiu do menu do
// avatar (ninguém clicava lá, autora pediu remoção explícita) e ganhou um
// botão de verdade no topo da tela de Revisão (#review-my-flashcards-btn,
// wired mais abaixo, perto de renderReviewModeSelect).


// saveState/loadState/notifySaveFailure (Supabase, tabela progress) agora
// vêm de shared/auth.js -- dependem de APP_KEY (acima) e das duas funções
// abaixo, específicas do formato de STATE deste idioma.


// registerExerciseCorrect, cardsDueNow, newCards, XP_PER_GRADE, todayStr e
// dateStrDaysAgo vêm de shared/srs.js; scheduleReview/applyMemoryGrade/
// migrateCardToFSRS (o motor de memória de verdade, desde a Fase 3 da
// reestruturação) vêm de shared/fsrs.js; getStudyQueue de
// shared/study-queue.js -- mesmo motor, mesmo formato de STATE.cards nos
// dois idiomas. Ver ARCHITECTURE.md na raiz do repo.


// ---------- Plano de estudo com meta diária (assistente estilo Busuu) ----------
// Meta diária em LIÇÕES (ver "A Gramática da Recompensa", §4): com os dias
// da semana escolhidos, calcula uma DATA estimada de conclusão do nível-alvo.
// OBJECTIVE_OPTIONS, DAY_DEFS, DAY_KEY_BY_JS_INDEX, PT_MONTHS, formatDatePt e
// todo o wizard agora vêm de shared/wizard.js. LEVEL_DESCRIPTIONS continua
// aqui -- é dado específico deste idioma (LEVELS igual, ver content.js),
// exigido como hook por shared/wizard.js.
const LEVEL_DESCRIPTIONS = {
  // Getters: resolvem no idioma do site NO MOMENTO do uso (i18n fase 9).
  A1: { get tier(){ return t('level.tier.beginner'); }, get text(){ return t('fr.level.A1.text'); } },
  A2: { get tier(){ return t('level.tier.basic'); }, get text(){ return t('fr.level.A2.text'); } }
};

// estimateCompletionDate, buildLessonsWeekData, remainingUnitsForLevels/
// estimateLessonsRemainingForLevels, renderStudyPlanCard e o wizard inteiro
// (STUDY_WIZARD_STEPS até saveStudyWizard) e o wiring do modal vêm de
// shared/wizard.js.


wireReviewReminderButtons(); // shared/core/app-comum.js


// Contadores da Conjugação (registerDailyConjugation*) e as 3 missões dela (CONJ_DAILY_MISSIONS): shared/conjugacao.js.

const REVISAO_CONJ_CHALLENGES = [
  ...CONJ_DAILY_MISSIONS, // conj1, conjCorrect10, conjTenses2 (shared/conjugacao.js)
  // labelForTarget: usado só quando resolveRevisaoMission() escala a meta
  // pra baixo (estoque real menor que o alvo original) -- sem isso o texto
  // continuaria dizendo "15"/"3" enquanto a barra de progresso mostra um
  // teto diferente (ver grilling "missões do dia").
  { id:'reviews15', icon:'🔁', get label(){ return tp('fr.mission.reviews', 15); }, labelForTarget: n => tp('fr.mission.reviews', n), target:15, get: d => d.reviewsDone },
  { id:'speedReview1', icon:'⚡', get label(){ return t('fr.mission.speedReview1'); }, target:1, get: d => d.speedReviewSessions },
  { id:'matchGame1', icon:'🎴', get label(){ return t('fr.mission.matchGame1'); }, target:1, get: d => d.matchGamesPlayed },
  // Fase 4 (artefato §3): prioriza SRS de verdade atrasado, não qualquer
  // revisão dentro do prazo normal -- puxa quem tem cartas acumuladas.
  { id:'overdue3', icon:'⏰', get label(){ return tp('fr.mission.overdue', 3); }, labelForTarget: n => tp('fr.mission.overdue', n), target:3, get: d => d.overdueReviewsDone }
];
// "Complete N lições" saiu daqui na Fase 3 -- virou redundante depois que a
// meta diária (plano de estudo) passou a ser medida em lições também: as
// duas telas mostrando a mesma contagem como se fossem coisas diferentes é
// exatamente o "progresso duplicado" que o artefato pediu pra evitar (§4).
const GENERAL_CHALLENGES = [
  // Fase 6 da tarefa de conclusão de lição/unidade: substitui 'stars40'
  // (estrelas -- sistema paralelo de pontuação retirado do fluxo de unidade,
  // ver registerDailyStars) por um desafio ligado ao XP real, a única
  // moeda que o app de fato usa em todo o resto da interface.
  { id:'xp50', icon:'⭐', get label(){ return t('fr.mission.xp50'); }, target:50, get: d => d.xp },
  { id:'highscore2', icon:'📈', get label(){ return t('fr.mission.highscore2'); }, target:2, get: d => d.highScoreLessons },
  { id:'perfect1', icon:'🎯', get label(){ return t('fr.mission.perfect1'); }, target:1, get: d => d.perfectLessons },
  { id:'grammar1', icon:'🧠', get label(){ return t('fr.mission.grammar1'); }, target:1, get: d => d.grammarLessons },
  // Fase 4 (artefato §3): ligados a recursos reais do produto (ouvir,
  // traduzir por blocos), não só contadores genéricos de progresso.
  { id:'listen10', icon:'🎧', get label(){ return t('fr.mission.listen10'); }, target:10, get: d => d.audioPlaysToday },
  { id:'translateBlocks2', icon:'🧱', get label(){ return t('fr.mission.translateBlocks2'); }, target:2, get: d => d.exerciseFormatCounts?.reorder || 0 }
];


const ALL_CHALLENGE_POOLS = [EASY_CHALLENGES, REVISAO_CONJ_CHALLENGES, GENERAL_CHALLENGES];


// showToast agora vem de shared/toast.js.


// Modos de estudo que contam para a trilha Explorar.
const BADGE_MODES = ['review', 'speed', 'match', 'conjugation', 'challenges', 'dictation'];


// (Paridade B2: unitsOfLevel e unitOrdinalInfo estão em shared/core/modulos-niveis.js, comum a todos os sites.)


const UNIT_ICONS = {
  'A1-1': '👋', 'A1-2': '🙋', 'A1-3': '🔢', 'A1-g1': '🧠', 'A1-4': '👨‍👩‍👧',
  'A1-g2': '👪', 'A1-5': '🥐', 'A1-6': '⏰', 'A1-g3': '🔄', 'A1-7': '🗓️',
  'A1-8': '🗺️', 'A1-g4': '🌍', 'A1-9': '🌐', 'A1-10': '🛍️', 'A1-11': '🍗',
  'A1-12': '⚖️', 'A1-13': '⛅', 'A1-14': '🚇', 'A1-g5': '🏃', 'A1-15': '🩺',
  'A1-g6': '🙏', 'A1-16': '🎨', 'A1-g7': '📏', 'A1-17': '🏠', 'A1-18': '🛋️',
  'A1-19': '🎬', 'A1-g8': '🔁', 'A1-20': '🕰️', 'A1-g9': '✅'
};

// ---------- Seletor de nível e módulos ----------
// renderLevelSelect, renderLevelModalList, modulesOfLevel, moduleUnlocked, moduleProgressPct, moduleCompleted e
// levelCompleted: shared/core/modulos-niveis.js (paridade B2). Aqui só liga o botão e a janela do seletor.
wireLevelSelector();


// (Paridade B2: levelTestsOfLevel está em shared/core/modulos-niveis.js, comum a todos os sites.)


// ---------- Fase 7 da trilha: modo Mapa ----------
// DOM/seleção/painel em shared/trail-map.js; aqui só o modelo (estados reais) e o que cada botão faz.
const TRAIL_VIEW_KEY = 'frances_trail_view';

// mapUnitDescribe, o mapa por módulos (renderModulesTrailMap) e buildLevelTestCard: shared/core/modulos-niveis.js (paridade B2).


// (Paridade B2: buildCheckpointRow está em shared/core/modulos-niveis.js, comum a todos os sites.)

// Unidade opcional "Desafios do Módulo N" (fillModuleChallengeRows, buildModuleChallengesRow): shared/desafios-telas.js.

// Unidade "Revisão do A1" no fim do nível (buildLevelReviewRow): shared/ditados.js.

// Estado (recolhida/expandida) da faixa de Desafios de hoje -- lembrado
// entre sessões, mesmo padrão de STATE.dailyMinutesLog etc: preferência de
// interface, não progresso, então localStorage puro (nunca precisa
// sincronizar entre dispositivos).
const CHALLENGES_STRIP_COLLAPSE_KEY = 'frances_challenges_collapsed';


// ============================================================
// LIÇÃO EM PASSOS (Vocabulário → Diálogo → Exercícios)
// ============================================================


wireLessonChromeButtons(); // shared/core/app-comum.js


// ---------- Explicação contextual (cartões de conceito) ----------
// Substitui o antigo `usageNote` mostrado só no fim, depois de todo o
// vocabulário + diálogo -- cada conceito de `unit.concepts` dispara no ponto
// exato da lição em que passa a ser relevante -- contato (o aluno acabou de
// ver/usar a palavra) -> percepção -> explicação curta -> volta direto pra
// prática, sem sair da lição. Reaproveita o mesmo formato title/body/
// examples/wrapup que as unidades de gramática já usam (u.grammar.blocks) --
// não é um segundo sistema paralelo, só uma forma de disparar o mesmo tipo
// de cartão NO MEIO de uma lição de vocabulário, em vez de só numa unidade
// de gramática inteira.


// lessonStars e a tela de módulo/nível concluído (renderModuleCompleteScreen): shared/core/modulos-niveis.js (paridade B2).


// ============================================================
// RENDER: Diálogo da lição (balões, áudio em sequência, vocabulário
// destacado e micro-checagem "Você entendeu?")
// ============================================================
// Dados extras de cada diálogo (content.js): `scene` (contexto), `speakers`
// ({A:{n,e}, B:{n,e}} -- nome e emoji de cada falante) e `check` (3 perguntas
// de compreensão). Tudo opcional: sem `speakers` cai em "A"/"B", sem `check`
// o botão Continuar aparece direto.


wireStepNavButtons(); // shared/core/app-comum.js (Voltar e Continuar da lição)


wireLessonKeyboardShortcuts(); // shared/core/app-comum.js


// Fase 4 do sistema de alunas particulares (ver CLAUDE.md): rótulos do
// filtro de ORIGEM -- diferente de REVIEW_FILTER_LABELS (que decide COMO
// consumir a fila), este decide DE ONDE vêm os cartões.
// Getters: resolvem no idioma do site NO MOMENTO do uso (i18n fase 6).
const REVIEW_ORIGIN_LABELS = {
  get all(){ return t('review.origin.all'); },
  get study(){ return t('review.origin.study'); },
  get teacher(){ return t('review.origin.teacher'); },
  get self(){ return t('review.origin.self'); }
};


wireReviewBackToModes(); // shared/core/app-comum.js


// Marco de Revisão do módulo (moduleReviewSelection, recordModuleReviewDone, startModuleReviewSession,
// buildModuleReviewRow): shared/core/modulos-niveis.js (paridade B2).


// ============================================================
// Fase D ("Decks, Tags e Painel" -- Integração Deck <-> FSRS/Review, ver
// CLAUDE.md) -- ponto de integração de domínio, NUNCA uma fila/motor de
// revisão paralelo. As 3 funções abaixo só COMPÕEM peças já existentes:
//   getStudyScopeForDeck()/getDeckCounts() (shared/deck-engine.js, Fase C,
//   NENHUMA linha alterada nesta fase) + eligibleReviewPool()/
//   reviewFilterQueue()/getStudyQueue() (já existentes, NENHUMA linha
//   alterada). O Deck só decide QUEM entra no pool -- devido/estado/grade/
//   limite de novas por dia/intensidade da sessão continuam 100%
//   responsabilidade do motor de Review já existente (regra central da
//   Fase D: "Deck define o ESCOPO, Review define quem do escopo entra").
// ============================================================


// ---------- Ponto de verificação do módulo e Teste de Nível ----------
// Pular pelo Ponto de verificação (trailSkipAllowed, TRAIL_SKIP_PAYWALL_ENABLED), a prova, a nota, o pulo das unidades
// (completeModuleUnits) e o Teste de Nível: shared/core/modulos-niveis.js (paridade B2, comum a todos os sites).


// renderTopbarStats() agora vem de shared/topbar-stats.js (idêntico nos dois idiomas).

// ============================================================
// TABS / navegação
// ============================================================
// switchTab() vem de shared/tabs.js -- só as partes específicas do francês
// (parar áudio/timers, o que renderizar em cada aba própria) ficam aqui.
const switchTab = createTabSwitcher({
  onBeforeSwitch(tab){
    stopExerciseAudio();
    if (tab !== 'review'){
      stopSpeedTimer();
      stopMatchTimer();
    }
    if (tab !== 'dictation'){
      stopDictationAudio();
    }
  },
  tabHandlers: {
    conjugaison: renderConjSelectScreen,
    progress: renderProgressView,
    goals: renderGoalsView,
    profile: renderProfileView,
    settings: renderSettingsView,
    'admin-badges': renderAdminPanelView,
    'my-flashcards': renderMyFlashcardsView,
    'teacher-panel': renderTeacherPanelView,
    'student-panel': renderStudentPanelView,
    leaderboard: openLeaderboardView,
    friends: renderFriendsView,
    path: renderUnitsGrid,
    dictation: () => {
      applyChallengeI18n();
      dictationModuleFilter = pendingDictationModuleFilter;
      pendingDictationModuleFilter = null;
      renderDictationList();
    },
    challenges: () => {
      applyChallengeI18n();
      challengesModuleFilter = pendingChallengesModuleFilter;
      pendingChallengesModuleFilter = null;
      return renderChallengeCategories();
    },
  }
});

wireTabsAndSidebar(); // shared/core/app-comum.js


wireReviewSettingsControls(); // shared/core/app-comum.js

// ============================================================
// EXPORTAÇÃO .apkg (motor comum em shared/anki-export.js) — só o que é
// específico do francês (campos, template, nome do baralho/arquivo, filtro
// de unidades) fica aqui. Vive na aba "📦 Exportar" de Configurações.
// ============================================================
// modelName/deckDesc/deckName vêm de APP_IDENTITY.apps.fr.name (shared/app-identity.js,
// carregado antes deste arquivo -- ver script tag em index.html) em vez de string fixa,
// pra nunca ficar pra trás se a marca mudar (ver Bloco 6/Fase B6 da tarefa de rebranding).
// guidPrefix NÃO muda: é o identificador de GUID que o Anki usa pra casar notas num
// reimport -- trocar agora faria o Anki tratar decks já exportados por usuários
// existentes como notas novas/duplicadas em vez de atualizar as existentes.
// Etapa 3 (decisão da dona, 2026-10-19): com o site em inglês, nomes de campo,
// do modelo e do arquivo saem em inglês; em pt-BR as chaves devolvem o texto de
// antes. Por isso são getters (lidos na hora de exportar, no idioma atual).
// O id do modelo é aleatório por exportação (ankiRandId) e o GUID da nota vem
// de guidPrefix + id do cartão: nada disso depende do nome.
const ANKI_EXPORT_CONFIG = {
  // nomes dos campos no idioma do site (em pt-BR, os de sempre)
  fieldNames(){
    return { fr: ankiExportText('ankiExport.field.french', 'Francês'), tr: ankiExportText('ankiExport.field.translation', 'Tradução') };
  },
  get modelName(){ return ankiExportText('ankiExport.appName.fr', APP_IDENTITY.apps.fr.name, { app: APP_IDENTITY.apps.fr.name }); },
  get fields(){
    const n = this.fieldNames();
    return [
      { name:n.fr, ord:0, font:"Arial", size:22 },
      { name:n.tr, ord:1, font:"Arial", size:18 }
    ];
  },
  get qfmt(){ return `<div style='text-align:center;font-size:26px;color:#1D5A82;font-weight:bold;'>{{${this.fieldNames().fr}}}</div>`; },
  get afmt(){ return `{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:18px;color:#5C4E73;'>{{${this.fieldNames().tr}}}</div>`; },
  css: ".card { font-family: 'Nunito', Arial, sans-serif; text-align: center; background-color: #FAF5EA; color:#201335; }",
  get deckDesc(){ return ankiExportText('ankiExport.deckDesc', `Exportado do app ${APP_IDENTITY.apps.fr.name}`, { app: this.modelName }); },
  // K2-F: template do modelo "Reverso" (B da trilha): frente = Tradução,
  // verso = Francês. Mesmos campos semânticos do Básico.
  get reverseQfmt(){ return `<div style='text-align:center;font-size:22px;color:#5C4E73;font-weight:bold;'>{{${this.fieldNames().tr}}}</div>`; },
  get reverseAfmt(){ return `{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:26px;color:#1D5A82;font-weight:bold;'>{{${this.fieldNames().fr}}}</div>`; },
  guidPrefix: "fzc_",
  unitOptions(){
    return UNITS.filter(u => u.type !== 'grammar').map(u => {
      const { num } = unitOrdinalInfo(u, unitsOfLevel(u.level));
      return { id: String(u.id), label: `${u.level} · ${num}. ${u.title}` };
    });
  },
  deckName(sel){
    return sel === 'all'
      ? `${this.modelName} - A1`
      : `${this.modelName} - ${UNITS.find(u=>String(u.id)===sel).title}`;
  },
  cards(sel){
    // Fase 7i (ver CLAUDE.md) -- `.filter(hasPlainFrontBack)` removido.
    // Aquele filtro (Fase 4b) existia só porque `cardPromptText()`/
    // `cardAnswerText()` (compartilhadas com Speed Review/Combinar, NUNCA
    // tocadas nesta fase) quebram pra cloze/type_answer -- o export
    // ganhou seu PRÓPRIO caminho de extração de texto pra esses 2 tipos
    // (ver noteFields()/clozeFields() abaixo, que nunca chamam
    // cardPromptText/cardAnswerText pra eles), então todo tipo (normal,
    // múltipla escolha, digite a resposta, cloze, trilha) já é
    // exportável agora -- nenhum filtro por tipo precisa mais existir
    // aqui.
    return (sel === 'all' ? STATE.cards : STATE.cards.filter(c => String(c.unitId) === sel));
  },
  // Fase 7i -- `media` vem de collectExportMediaAssets() (shared/anki-export.js),
  // já resolvido em `[sound:]`/`<img>` prontos pra concatenar (nunca URLs
  // cruas aqui) -- ver resolveCardExportMedia() (shared/flashcard-model.js)
  // pra saber QUAL mídia cada lado carrega. `type_answer` precisou de um
  // caminho próprio (não `cardPromptText`/`cardAnswerText`, que quebram
  // pra esse tipo -- só sabem "front"/"back", e a view de type_answer não
  // tem esses campos) -- lê resolveCardContentView() direto.
  noteFields(card, media){
    if (card.cardInstance.cardTypeId === 'type_answer'){
      const view = resolveCardContentView(card);
      return [
        ankiFieldHTML(view.prompt.text, media && media.front),
        ankiFieldHTML(view.displayAnswerText, media && media.back),
      ];
    }
    return [
      ankiFieldHTML(cardPromptText(card), media && media.front),
      ankiFieldHTML(cardAnswerText(card), media && media.back),
    ];
  },
  // Fase 7i -- cards Cloze vão pro modelo "Cloze" nativo do Anki (ver
  // shared/anki-export.js), não pro modelo Básico -- 2 campos genéricos
  // (Text/Tradução), a sintaxe {{c1::...}} já convertida por
  // buildAnkiClozeFieldText() (shared/flashcard-model.js, nunca
  // reimplementada aqui). Mídia da frase (áudio/imagem) vai junto do
  // campo Text -- a tradução nunca tem mídia própria (mesmo critério do
  // renderer de Revisão, Fase 7a).
  // K2-F: B da trilha -- campos SEMÂNTICOS (Francês/Tradução), não a ordem
  // frente/verso; a direção vem do template do modelo Reverso. Mídia: o lado
  // "front" do CardInstance é a tradução, o "back" é o francês.
  reverseFields(card, media){
    const v = ankiExportSides(card);
    return [
      ankiFieldHTML(v.back.text, media && media.back),
      ankiFieldHTML(v.front.text, media && media.front),
    ];
  },
  clozeFields(card, media){
    const view = resolveCardContentView(card);
    return [
      ankiFieldHTML(buildAnkiClozeFieldText(view.rawSentenceText, view.markId), media && media.front),
      view.translation ? view.translation.text : '',
    ];
  },
  sortField(card){
    if (ankiExportCardKind(card) === 'reverse') return ankiExportSides(card).back.text;
    if (card.cardInstance.cardTypeId === 'cloze'){
      const view = resolveCardContentView(card);
      return renderClozeText(view.rawSentenceText, view.markId, { reveal: true });
    }
    if (card.cardInstance.cardTypeId === 'type_answer'){
      return resolveCardContentView(card).prompt.text;
    }
    return cardPromptText(card);
  },
  filename(sel){
    return sel === 'all'
      ? ankiExportText('ankiExport.filename.fr.all', 'frances-com-prof-brune-completo.apkg')
      : ankiExportText('ankiExport.filename.fr.unit', `frances-com-prof-brune-unidade-${sel}.apkg`, { n: sel });
  },
};

wireAnkiExport(ANKI_EXPORT_CONFIG);

// ============================================================
// CONJUGAÇÃO — motor comum em shared/conjugacao.js (etapa 5a da paridade, docs/historico/27-paridade-conjugacao.md);
// o que é do francês (tempos, pronomes e elisão, impératif, futur proche, concordância com être, busca e bandeiras)
// está em fr/conj-config.js. Aqui só se ligam os botões da tela, no mesmo ponto do carregamento de antes.
// ============================================================
wireConjugationScreen();

// Teclado de acentos e correção do digitar (accent-answer-logic): shared/core/familias/latina-licao.js (paridade 5d).

// ============================================================
// DITADOS: motor comum em shared/ditados.js (etapa 5b da paridade, docs/historico/28-paridade-ditados.md);
// o que é do francês (dados, voz, teclado, caminho do áudio, abreviações) está em fr/ditados-config.js.
// ============================================================
wireDictationScreen();


// ============================================================
// DESAFIOS: motor comum em shared/desafios.js (dados, catálogo, textos, revisão espaçada, correção de cada tipo) e
// shared/desafios-telas.js (telas do aluno, linha da trilha, áudio lento) e shared/desafios-admin.js (admin e
// importação); etapa 5c da paridade,
// docs/historico/29-paridade-desafios.md. O que é do francês (família latina, teclado, textos que citam o francês)
// está em fr/desafios-config.js. Aqui só se ligam os listeners, no mesmo ponto do carregamento de antes.
// ============================================================
wireChallengesScreen();

// ============================================================
// Inicialização
// ============================================================
initAuth();
