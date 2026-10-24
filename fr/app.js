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


// ---------- Som curto de acerto/erro (feedback por exercício) ----------
// Sintetizado via Web Audio API -- sem arquivo de áudio externo pra baixar/
// hospedar, e sem disputar com o player de pronúncia acima (Audio/Speech
// Synthesis são players diferentes; um "ding" de ~200ms não precisa de
// stopExerciseAudio()). Silenciável em Preferências (Seu progresso).
const FEEDBACK_SOUND_KEY = 'frances_feedback_sound';

let feedbackAudioCtx = null;


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
  onApplied: () => { refreshStudyCardTexts(); if (typeof applyProfilePlaceholders === 'function') applyProfilePlaceholders(); if (typeof repaintTrailForUiLanguage === 'function') repaintTrailForUiLanguage(); }
});
window.addEventListener('i18n:change', () => { CONTENT_I18N.sync(); });
CONTENT_I18N.sync();

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


// Login (Google/e-mail/convidado), menu do usuário e logout agora vêm de
// shared/auth.js -- os botões/formulários abaixo continuam no HTML de cada
// idioma, só a lógica de wiring foi extraída.

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

document.getElementById('user-settings-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  switchTab('settings');
});

document.getElementById('admin-badges-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  switchTab('admin-badges');
});

// Prop 3 (ver CLAUDE.md, "7 propostas") -- "Meus Cartões" saiu do menu do
// avatar (ninguém clicava lá, autora pediu remoção explícita) e ganhou um
// botão de verdade no topo da tela de Revisão (#review-my-flashcards-btn,
// wired mais abaixo, perto de renderReviewModeSelect).


// Entrada geral da bandeira ⚑ (menu "Mais"/usuário) -- sem contexto de
// exercício específico, captureReportContext() ainda pega unidade/lição
// atual se o clique acontecer em modo foco.
document.getElementById('report-menu-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  openReportModal({ source: 'menu' });
});

// saveState/loadState/notifySaveFailure (Supabase, tabela progress) agora
// vêm de shared/auth.js -- dependem de APP_KEY (acima) e das duas funções
// abaixo, específicas do formato de STATE deste idioma.


// registerExerciseCorrect, cardsDueNow, newCards, XP_PER_GRADE, todayStr e
// dateStrDaysAgo vêm de shared/srs.js; scheduleReview/applyMemoryGrade/
// migrateCardToFSRS (o motor de memória de verdade, desde a Fase 3 da
// reestruturação) vêm de shared/fsrs.js; getStudyQueue de
// shared/study-queue.js -- mesmo motor, mesmo formato de STATE.cards nos
// dois idiomas. Ver ARCHITECTURE.md na raiz do repo.


document.getElementById('streak-modal-continue-btn').addEventListener('click', () => {
  document.getElementById('streak-modal-overlay').style.display = 'none';
});

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


// ---------- Lembrete de revisão acumulada (estilo Busuu) ----------
// Pop-up não bloqueante no rodapé, avisando que há palavras vistas em lições
// mas nunca revisadas se acumulando. Aparece no máximo uma vez por dia, só
// quando o total de cartões pendentes passa de um limiar — pra não incomodar
// quem já revisa em dia.
const REVIEW_REMINDER_THRESHOLD = 15;


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


// Contadores da Conjugação (registerDailyConjugation*) e as 3 missões dela (CONJ_DAILY_MISSIONS): shared/conjugacao.js.

const EASY_CHALLENGES = [
  { id:'streak', icon:'🔥', get label(){ return t('fr.mission.streak'); }, target:1, get: () => STATE.lastStudyDay === todayStr() ? 1 : 0 },
  { id:'firstLesson', icon:'🌅', get label(){ return t('fr.mission.firstLesson'); }, target:1, get: d => d.lessons }
];
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
  { id:'xp50', icon:'⚡', get label(){ return t('fr.mission.xp50'); }, target:50, get: d => d.xp },
  { id:'highscore2', icon:'📈', get label(){ return t('fr.mission.highscore2'); }, target:2, get: d => d.highScoreLessons },
  { id:'perfect1', icon:'🎯', get label(){ return t('fr.mission.perfect1'); }, target:1, get: d => d.perfectLessons },
  { id:'grammar1', icon:'🧠', get label(){ return t('fr.mission.grammar1'); }, target:1, get: d => d.grammarLessons },
  // Fase 4 (artefato §3): ligados a recursos reais do produto (ouvir,
  // traduzir por blocos), não só contadores genéricos de progresso.
  { id:'listen10', icon:'🎧', get label(){ return t('fr.mission.listen10'); }, target:10, get: d => d.audioPlaysToday },
  { id:'translateBlocks2', icon:'🧱', get label(){ return t('fr.mission.translateBlocks2'); }, target:2, get: d => d.exerciseFormatCounts?.reorder || 0 }
];


// ---------- Feasibility das missões de estoque limitado (grilling "missões
// do dia") ----------
// Só reviews15/overdue3/matchGame1/speedReview1 dependem de um estoque real
// (cartas pra revisar) que pode não existir -- as demais (lições, XP,
// conjugação...) não têm teto real no dia de hoje, ficam de fora desta
// checagem.
const MISSION_QUANTITY_FLOOR = 3; // abaixo disso, trata como inviável (rodada 2)


const ALL_CHALLENGE_POOLS = [EASY_CHALLENGES, REVISAO_CONJ_CHALLENGES, GENERAL_CHALLENGES];


// showToast agora vem de shared/toast.js.

// Conquistas com níveis (docs/conquistas-proposta-niveis.md): BADGES é preenchido por rebuildTrackBadges()
// (shared/badge-tracks-app.js) a partir do catálogo shared/badge-tracks.js e das métricas abaixo.
const BADGES = [];

// Modos de estudo que contam para a trilha Explorar.
const BADGE_MODES = ['review', 'speed', 'match', 'conjugation', 'challenges', 'dictation'];

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


const CONFETTI_COLORS = ['#d64545', '#e3b341', '#2f8f6e', '#3498d6', '#a15fc9'];


// lessonStars e a tela de módulo/nível concluído (renderModuleCompleteScreen): shared/core/modulos-niveis.js (paridade B2).


// ============================================================
// RENDER: Diálogo da lição (balões, áudio em sequência, vocabulário
// destacado e micro-checagem "Você entendeu?")
// ============================================================
// Dados extras de cada diálogo (content.js): `scene` (contexto), `speakers`
// ({A:{n,e}, B:{n,e}} -- nome e emoji de cada falante) e `check` (3 perguntas
// de compreensão). Tudo opcional: sem `speakers` cai em "A"/"B", sem `check`
// o botão Continuar aparece direto.


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



document.getElementById('review-back-to-modes').addEventListener('click', backToReviewModeSelect);

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

// [data-tab] exclui #mais-btn (barra inferior, Fase 6) -- ele reaproveita a
// classe .tab-btn só pelo visual, mas não é uma aba de verdade (abre o
// menu "Mais" via listener próprio em shared/auth.js, não troca de view).
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Toggle manual da sidebar (desktop, ≥900px) -- "Mostrar/Ocultar barra
// lateral", inspirado no do Claude. Independe do modo foco automático da
// lição (.lesson-focus), que sempre esconde tudo de qualquer jeito. Estado
// persistido por dispositivo, mesmo padrão de CHALLENGES_STRIP_COLLAPSE_KEY.
const SIDEBAR_COLLAPSE_KEY = 'sidebar_collapsed';
if (localStorageSafeGet(SIDEBAR_COLLAPSE_KEY) === '1'){
  document.getElementById('app').classList.add('sidebar-collapsed');
}
syncSidebarToggleLabel();
document.getElementById('sidebar-toggle-btn').addEventListener('click', () => {
  const collapsed = document.getElementById('app').classList.toggle('sidebar-collapsed');
  localStorageSafeSet(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
  syncSidebarToggleLabel();
});


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
