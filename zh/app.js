/* ============================================================
   Chinês com Prof. Brune — lógica do app
   - Estado persistido em memória (sessão) + localStorage indisponível
     em artifacts, então usamos window.storage se existir, senão
     memória pura (variável global) para a sessão atual.
   - SRS: algoritmo SM-2 (o mesmo usado pelo Anki clássico)
   - Exportação: gera .apkg real via sql.js + JSZip
   - Áudio: Text-to-Speech via Web Speech API (voz zh-CN do navegador)
   ============================================================ */

// Voz do idioma estudado: shared/core/voz.js (comum aos sites, paridade 5d). Os nomes de sempre ficam como repasses.
function loadChineseVoice(){ return loadStudyVoice(); }
function canSpeakChinese(text){ return canSpeakStudy(text); }
function speakChineseAudioOnly(text, btnEl, isAutoplay){ return speakStudyAudioOnly(text, btnEl, isAutoplay); }
function speakChinese(text, btnEl, isAutoplay){ return speakStudy(text, btnEl, isAutoplay); }

initStudyVoice();


// ---------- Som curto de acerto/erro (feedback por exercício) ----------
// Sintetizado via Web Audio API -- sem arquivo de áudio externo pra baixar/
// hospedar, e sem disputar com o player de pronúncia acima (Audio/Speech
// Synthesis são players diferentes; um "ding" de ~200ms não precisa de
// stopExerciseAudio()). Silenciável em Preferências (Seu progresso).
const FEEDBACK_SOUND_KEY = 'mandarim_feedback_sound';


// Bug conhecido do Chromium/Opera: o speechSynthesis pode "adormecer" se
// ficar muitos segundos sem uso, mesmo fora de uma fala ativa. Um resume()
// periódico e leve evita que o próximo clique de áudio saia mudo.
keepStudyVoiceAwake(); // shared/core/voz.js


// ---------- Ordem dos traços (Hanzi Writer) — modo animação ----------
const HANZI_WRITER_SUPPORTED = typeof HanziWriter !== 'undefined';

function strokeBtnHTML(hanziText){
  const safe = hanziText.replace(/"/g, '&quot;');
  return `<button class="stroke-btn" data-hanzi="${safe}" aria-label="${t('zh.stroke.view')}" title="${t('zh.stroke.view')}">✍️</button>`;
}

function wireStrokeButtons(container){
  container.querySelectorAll('.stroke-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openStrokeModal(btn.dataset.hanzi);
    });
  });
}


// Só considera caracteres CJK reais (ignora pontuação e letras latinas que às
// vezes aparecem misturadas, como em "Brune" ou "！") — Hanzi Writer só sabe
// desenhar hanzi de fato.
function extractHanziChars(text){
  return Array.from(text).filter(ch => /[\u4e00-\u9fff]/.test(ch));
}

let strokeWriterInstances = [];

function openStrokeModal(hanziText){
  const chars = extractHanziChars(hanziText);
  const modal = document.getElementById('stroke-modal');
  const titleEl = document.getElementById('stroke-modal-title');
  const bodyEl = document.getElementById('stroke-modal-body');

  titleEl.textContent = t('zh.stroke.title', { hanzi: hanziText });

  if (!HANZI_WRITER_SUPPORTED){
    bodyEl.innerHTML = `<p class="stroke-unavailable">${t('zh.stroke.loadFailed')}</p>`;
    modal.style.display = 'flex';
    return;
  }

  if (!chars.length){
    bodyEl.innerHTML = `<p class="stroke-unavailable">${t('zh.stroke.noChars')}</p>`;
    modal.style.display = 'flex';
    return;
  }

  // Limpa instâncias anteriores (evita acúmulo de listeners/memória entre aberturas)
  strokeWriterInstances = [];
  bodyEl.innerHTML = chars.map((ch, i) => `
    <div class="stroke-char-block">
      <div class="stroke-char-target" id="stroke-target-${i}"></div>
      <button class="btn btn-secondary stroke-replay-btn" data-idx="${i}">${t('zh.stroke.replay')}</button>
    </div>
  `).join('');

  chars.forEach((ch, i) => {
    try{
      const writer = HanziWriter.create(`stroke-target-${i}`, ch, {
        width: 160,
        height: 160,
        padding: 12,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 300,
        showOutline: true,
        strokeColor: '#8E1915',
        outlineColor: '#E2CFA6',
        radicalColor: '#D4A017'
      });
      strokeWriterInstances.push(writer);
      writer.animateCharacter();
    }catch(e){
      document.getElementById(`stroke-target-${i}`).innerHTML =
        `<p class="stroke-unavailable">${t('zh.stroke.drawFailed', { ch })}</p>`;
    }
  });

  bodyEl.querySelectorAll('.stroke-replay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      strokeWriterInstances[idx]?.animateCharacter();
    });
  });

  modal.style.display = 'flex';
}

document.getElementById('stroke-modal-close').addEventListener('click', () => {
  document.getElementById('stroke-modal').style.display = 'none';
});
document.getElementById('stroke-modal').addEventListener('click', (e) => {
  if (e.target.id === 'stroke-modal'){
    document.getElementById('stroke-modal').style.display = 'none';
  }
});


// Um cartão SRS por caractere (do banco completo de hanzi), reaproveitando a mesma estrutura de
// estado SM-2 do vocabulário — fila separada, mas mesmo motor de repetição.
function buildHanziCards(lessons){
  const cards = [];
  lessons.forEach((lesson, lessonIdx) => {
    lesson.forEach((char, charIdx) => {
      cards.push({
        id: `h${lessonIdx}-c${charIdx}`,
        lessonIndex: lessonIdx,
        type: 'hanzi',
        char: char.char,
        pinyin: char.pinyin,
        meaning: char.meaning,
        radicals: char.radicals,
        // SRS state (SM-2) — mesmos campos, mesmo algoritmo do vocabulário
        ef: 2.5,
        interval: 0,
        reps: 0,
        due: 0,
        lapses: 0,
        // Estado FSRS (Fase 3) -- ver buildCardsFromUnits()
        stability: 0,
        difficulty: 0,
        state: 'new',
        lastReview: null,
        fsrsReps: 0,
        fsrsLapses: 0
        // (sem fsrsMigrated aqui de propósito -- ver comentário em
        // migrateCardToFSRS() no shared/fsrs.js: setar isso já no
        // nascimento do cartão faria o merge de um save antigo, que roda
        // DEPOIS deste construtor, ser ignorado pelo guard da migração.)
      });
    });
  });
  return cards;
}


// 3 eixos de "profundidade" aprovados no grilling, por nível -- só o
// eixo 1 (explanationDepth) está de fato em uso hoje, porque só o nível
// inicial existe. Os outros 2 (testableInExercise, categoriesAllowed)
// ficam aqui como parâmetros PRONTOS pra quando os níveis seguintes
// existirem -- não aplicados por nenhum código ainda (não há nenhuma nota
// de realidade escrita nesses níveis), só a decisão travada de o que cada
// nível vai permitir. HSK2/HSK3/HSK4 são hipotéticos -- ajustar se o
// currículo real desviar disso. Mesma lógica exata do francês (fr/app.js),
// só as chaves são HSK1-4 em vez de A1/A2/B1/B2 (ver nota acima).
//
// Um 4º eixo, `densityPerUnit`, existiu aqui até 2026-09-17 e foi
// REMOVIDO por decisão explícita da autora (mesmo grilling espelhado em
// fr/app.js -- ver o comentário lá pra a justificativa completa e o
// CLAUDE.md pra a decisão registrada). Sem limite numérico min/max por
// unidade ou nível; a regra agora é só qualitativa (relação pedagógica
// real com a palavra/expressão ensinada naquele momento), e o controle de
// qualidade/volume passou a ser a revisão manual da autora, não um teto.
const REALITY_NOTE_LEVEL_GUIDANCE = {
  HSK1: {
    explanationDepth: 'curta',       // 1 frase, sem contexto social extra
    testableInExercise: false,       // card passivo é o MVP, exercício de reconhecimento é fase 2 adiada
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial'],
  },
  HSK2: {
    explanationDepth: 'media',       // pode incluir contexto social (quem usa, quando)
    testableInExercise: false,
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial', 'familiar-giria'],
  },
  HSK3: {
    explanationDepth: 'media',
    testableInExercise: true,        // "usar adequadamente" -- primeiro nível onde testar faz sentido
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial', 'familiar-giria'],
  },
  HSK4: {
    explanationDepth: 'alta',        // pragmática/ironia/marcadores sociais -- ainda sem categoria própria
    testableInExercise: true,
    categoriesAllowed: ['informal', 'regional', 'gramatica-coloquial', 'familiar-giria'],
  },
};


// ---------- Estado global ----------
const STATE = {
  units: UNITS,
  cards: buildCardsFromUnits(UNITS),
  hanziCards: buildHanziCards(HANZI_LESSONS),
  unitProgress: {}, // unitId -> { started:bool, completed:bool }
  xp: 0,
  streak: 0,
  lastStudyDay: null, // 'YYYY-MM-DD'
  lastReviewReminderDay: null, // 'YYYY-MM-DD'
  pendingStreakCelebration: false, // true = streak de hoje já contou, falta mostrar a tela (só ao fim da atividade atual). Nunca persistido -- é sempre por sessão.
  hadStreakComeback: false, // true = já retomou o streak em até 3 dias após perdê-lo (badge "De volta ao jogo") -- uma vez true, fica true pra sempre
  totalAudioPlays: 0, // vitalício, nunca zera (badge "Ouvido treinado")
  everUsedSpeedReview: false, // vitalício (badge "Exploradora")
  everUsedMatchGame: false, // vitalício (badge "Exploradora")
  modesUsed: {}, // conquistas: modos de estudo já usados (trilha Explorar)
  // XP da semana corrente -- preparação pra leaderboard futura (artefato
  // §9), NÃO implementa leaderboard nenhuma. Separado do XP vitalício
  // (acima) porque uma leaderboard semanal precisa de um número que reseta;
  // resetado por leitura (ensurePeriodXp), sem job/cron.
  periodXp: { weekStart: null, amount: 0 },
  activityLog: {}, // 'YYYY-MM-DD' -> contagem de respostas naquele dia (para o heatmap)
  reviewRecords: { speedBestScore: 0, speedBestStreak: 0, matchBestMs: null, hardSeenIds: [] }, // recordes dos modos (shared/review-extras.js)
  reviewTimeStats: { cards: 0, ms: 0 }, // tempo por cartão (estimativa de minutos e sessão de 5 min)
  // sem trilha de níveis no Mandarim — a meta é sempre o curso completo (dailyMinutes 0 = ainda não definida)
  studyGoal: {
    objective: null,
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
  hanziLessonProgress: {}, // lessonIndex -> { completed: bool }
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
  // `hanziReviewShowingAnswer` (abaixo) é de OUTRA feature (revisão de
  // hanzi), não tocado aqui.
  reviewCardState: null,
  reviewSessionUnitFilter: null, // if set, review only this unit's cards
  // Sessão do marco de Revisão do módulo ({moduleId, unitIds}; shared/core/modulos-niveis.js). Hoje o zh não tem
  // módulos e isto fica sempre null. Nunca serializado.
  reviewSessionMilestone: null,
  // Fase D ("Decks, Tags e Painel" -- Deck Engine, ver CLAUDE.md) -- mesmo
  // papel/ciclo de vida de reviewSessionUnitFilter acima, só que pra Deck em
  // vez de unidade: setado só por startDeckReviewSession(), lido só por
  // renderReviewView() (texto do estado vazio), nulado nos MESMOS pontos que
  // já nulam reviewSessionUnitFilter -- nunca os dois setados ao mesmo tempo.
  // Nunca serializado -- estado de SESSÃO, não progresso salvo.
  reviewSessionDeckId: null,
  // Aba Revisão do painel Aluno (2026-10-14): true só durante a sessão aberta
  // por startClassReviewSession() -- o pool passa a ser SÓ os cartões da
  // professora. switchTab() zera ao trocar de aba. Nunca serializado.
  reviewSessionClassReview: false,
  cardVariants: {}, // progresso das palavras que trocam por idioma do site (shared/card-variants.js)
  // Mudanças de currículo (shared/core/curriculo-progresso.js): arquivo do progresso de cartão da trilha que não existe
  // mais (excluído, fundido ou órfão). { id: {...progresso, retiredAt, mergedInto?} }. Salvo no bloco; volta para o
  // cartão se a chave voltar. Não conta em métrica, fila, notificação nem painel.
  retiredStudyCards: {},
  // Fase D -- cache em memória da árvore de Decks do idioma atual, carregada
  // sob demanda por ensureDecksLoadedForReview() (só quando uma sessão
  // Deck-scoped é de fato solicitada). Nunca serializado, nunca uma
  // contagem materializada.
  decks: [],
  courseDecksLoaded: false,
  hanziReviewQueue: [],
  hanziReviewIndex: 0,
  hanziReviewShowingAnswer: false,
  storyProgress: {}, // storyId -> { completed: bool }
  daily: {
    date: null, stars: 0, lessons: 0, highScoreLessons: 0, perfectLessons: 0,
    hanziLessons: 0, reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0
  }
};

UNITS.forEach((u,i) => {
  STATE.unitProgress[u.id] = {
    started:false, completed:false, unlocked: i===0,
    // Lições (Modelo B): em que lição da unidade o aluno está agora (só
    // avança quando uma lição é concluída de verdade -- sair no meio via
    // "Sair da lição" mantém o índice, então reabrir retoma a MESMA lição
    // do zero, nunca a unidade inteira). lessonMisses acumula erros ao
    // longo de todas as lições da unidade, pra alimentar a Revisão dos
    // Erros dimensionada no Ponto de verificação -- resetado só quando a
    // unidade é concluída.
    lessonIdx: 0, lessonMisses: {}
  };
});

HANZI_LESSONS.forEach((lesson, i) => {
  STATE.hanziLessonProgress[i] = { completed:false, unlocked: i===0 };
});

// Ponto de verificação do módulo, Revisão do módulo e Teste de Nível (shared/core/modulos-niveis.js, paridade B2):
// sem MODULES/LEVEL_TESTS (o zh hoje) só cria os objetos vazios, que não vão para o save (moduleSaveFields).
initModuleProgressState();

// Fase 10 (i18n): conteúdo do curso no idioma do site (unidades, histórias e
// banco de hanzi). Overlay em zh/content.<lang>.js (carregado sob demanda); o
// português continua sendo a fonte e unidade sem tradução aparece em português
// com aviso na lição.
const CONTENT_I18N = ContentI18n.create({
  units: UNITS, levels: LEVELS, stories: STORIES, hanzi: HANZI_LESSONS,
  overlayUrl: (lang) => `content.${lang}.js`,
  getLang: () => (typeof getUiLang === 'function' ? getUiLang() : 'pt-BR'),
  onApplied: () => { refreshStudyCardTexts(); if (typeof applyProfilePlaceholders === 'function') applyProfilePlaceholders(); if (typeof repaintTrailForUiLanguage === 'function') repaintTrailForUiLanguage(); }
});
wireContentI18nSync(); // shared/core/app-comum.js

// Conexão com o Supabase (supabaseClient, cleanRedirectURL) agora vem de
// shared/supabase-client.js -- mesmo projeto/tabela `progress` de sempre,
// compartilhado com os outros idiomas da plataforma.

// CURRENT_USER, GUEST_MODE_FLAG, initAuth/goToNeutralGate/enterGuestMode/
// onUserLoggedIn (login de verdade vive só no portão neutro, index.html da
// raiz -- este app só decide sessão/convidado/redirecionar) agora vêm de
// shared/auth.js, junto com saveState/loadState/notifySaveFailure.

// ---------- Toggle global de pinyin (forçar leitura só em hanzi) ----------
const PINYIN_TOGGLE_KEY = 'mandarim_hide_pinyin';

function applyPinyinVisibility(hidden){
  document.body.classList.toggle('hide-pinyin', hidden);
  document.getElementById('pinyin-toggle-btn').classList.toggle('active', hidden);
  document.getElementById('pinyin-state-label').textContent = hidden ? 'OFF' : 'ON';
  // Duplicata dentro da barra de foco da lição (ver .lesson-focus-bar) --
  // mesma preferência global, só precisa de um segundo botão porque a
  // topbar inteira some durante a lição.
  document.getElementById('pinyin-toggle-btn-lesson').classList.toggle('active', hidden);
}

function loadPinyinPreference(){
  applyPinyinVisibility(localStorageSafeGet(PINYIN_TOGGLE_KEY) === '1');
}

function togglePinyinVisibility(){
  const nowHidden = !document.body.classList.contains('hide-pinyin');
  applyPinyinVisibility(nowHidden);
  localStorageSafeSet(PINYIN_TOGGLE_KEY, nowHidden ? '1' : '0');
}

document.getElementById('pinyin-toggle-btn').addEventListener('click', togglePinyinVisibility);
document.getElementById('pinyin-toggle-btn-lesson').addEventListener('click', togglePinyinVisibility);

loadPinyinPreference();

// sessionStorageSafeGet/Set, localStorageSafeGet/Set e o tema claro/escuro
// (isDarkThemeActive, toggleTheme etc.) agora vêm de shared/utils.js e
// shared/theme.js, carregados antes deste arquivo (ver index.html) --
// compartilhados entre todos os idiomas, não duplicados por app.

// ---------- Preferência: modo do exercício de completar frase (cloze) ----------
// 'choice' (múltipla escolha, padrão) ou 'type' (digitar o pinyin que falta),
// estilo o toggle "sempre digitar" do Duolingo — vale pra todos os exercícios
// de cloze, não é escolhido por exercício.
const CLOZE_MODE_KEY = 'mandarim_cloze_mode';


wireStudyPreferenceSwitches(); // shared/core/app-comum.js


// Login (Google/e-mail/convidado), menu do usuário e logout agora vêm de
// shared/auth.js -- os botões/formulários abaixo continuam no HTML de cada
// idioma, só a lógica de wiring foi extraída.

wireAppMenuButtons(); // shared/core/app-comum.js


// Item extra do menu "Mais" (só mobile, ver .mais-extra-tab) -- 汉字 não
// cabe nos 4 botões fixos da barra inferior, então vive aqui.
document.getElementById('mais-hanzi-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  switchTab('hanzi');
});


// Prop 3 (ver CLAUDE.md, "7 propostas") -- "Meus Cartões" saiu do menu do
// avatar e ganhou um botão de verdade no topo da tela de Revisão
// (#review-my-flashcards-btn, wired mais abaixo).


// Esta tabela `progress` é compartilhada com os outros idiomas da
// plataforma (mesmo Supabase, mesma linha por user_id). Cada idioma guarda
// seu estado sob sua própria chave dentro da coluna `data` para não
// sobrescrever o progresso dos outros. saveState/loadState agora vêm de
// shared/auth.js.
const APP_KEY = 'mandarim';
// Usado por shared/wizard.js na pergunta do objetivo ("aprender ${...}?").
const LANGUAGE_STUDY_NAME = 'mandarim';
// Id deste idioma em languages/index.js (AVAILABLE_LANGUAGES) -- usado pelo
// seletor de idioma no topbar (shared/language-switcher.js) pra saber qual
// card marcar como ativo e qual chave gravar em currentLearningLanguage.
const LANG_ID = 'zh';

// Hook chamado por loadState() (shared/auth.js) quando não encontra
// data.data[APP_KEY] -- reconhece o formato salvo ANTES do namespacing por
// idioma existir (estado do app de chinês direto na raiz do JSON), pra
// quem já tinha conta antes disso não perder o progresso.
function loadLegacyState(data){
  if (data.hanziCards || data.cards) applySerializedState(data);
}


// registerExerciseCorrect, cardsDueNow, newCards, XP_PER_GRADE, todayStr e
// dateStrDaysAgo vêm de shared/srs.js; scheduleReview/applyMemoryGrade/
// migrateCardToFSRS (o motor de memória de verdade, desde a Fase 3 da
// reestruturação) vêm de shared/fsrs.js; getStudyQueue de
// shared/study-queue.js -- mesmo motor, mesmo formato de STATE.cards nos
// dois idiomas. Ver ARCHITECTURE.md na raiz do repo.


// ---------- Plano de estudo com meta diária (assistente estilo Busuu) ----------
// Meta diária em LIÇÕES (ver "A Gramática da Recompensa", §4). OBJECTIVE_OPTIONS,
// DAY_DEFS, DAY_KEY_BY_JS_INDEX, PT_MONTHS, formatDatePt, estimateCompletionDate,
// buildLessonsWeekData, renderStudyPlanCard e todo o wizard vêm de
// shared/wizard.js -- inclusive a etapa de nível, que este idioma ganhou
// agora (LEVELS em content.js, hoje só com HSK1, mas já preparado pra quando
// os outros níveis do HSK forem adicionados).
// LEVEL_DESCRIPTIONS continua aqui (dado específico deste idioma, exigido
// como hook por shared/wizard.js).
const LEVEL_DESCRIPTIONS = {
  // Getters: resolvem no idioma do site NO MOMENTO do uso (i18n fase 9).
  HSK1: { get tier(){ return t('level.tier.beginner'); }, get text(){ return t('zh.level.HSK1.text'); } }
};


wireReviewReminderButtons(); // shared/core/app-comum.js


function registerDailyHanziLesson(){
  ensureDailyBucket();
  STATE.daily.hanziLessons += 1;
}

const REVISAO_HANZI_CHALLENGES = [
  { id:'hanzi1', icon:'🀄', get label(){ return t('zh.mission.hanzi1'); }, target:1, get: d => d.hanziLessons },
  // labelForTarget: usado só quando resolveRevisaoMission() escala a meta
  // pra baixo (estoque real menor que o alvo original) -- sem isso o texto
  // continuaria dizendo "15"/"3" enquanto a barra de progresso mostra um
  // teto diferente (ver grilling "missões do dia").
  { id:'reviews15', icon:'🔁', get label(){ return tp('fr.mission.reviews', 15); }, labelForTarget: n => tp('fr.mission.reviews', n), target:15, get: d => d.reviewsDone },
  { id:'speedReview1', icon:'⚡', get label(){ return t('fr.mission.speedReview1'); }, target:1, get: d => d.speedReviewSessions },
  { id:'matchGame1', icon:'🧩', get label(){ return t('zh.mission.matchGame1'); }, target:1, get: d => d.matchGamesPlayed },
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
  // (estrelas -- sistema paralelo de pontuação retirado, ver lessonStars/
  // registerDailyStars removidos) por um desafio ligado ao XP real, a
  // única moeda que o app de fato usa em todo o resto da interface.
  { id:'xp50', icon:'⚡', get label(){ return t('fr.mission.xp50'); }, target:50, get: d => d.xp },
  { id:'highscore2', icon:'📈', get label(){ return t('fr.mission.highscore2'); }, target:2, get: d => d.highScoreLessons },
  { id:'perfect1', icon:'🎯', get label(){ return t('fr.mission.perfect1'); }, target:1, get: d => d.perfectLessons },
  { id:'hanzi2', icon:'🀄', get label(){ return t('zh.mission.hanzi2'); }, target:2, get: d => d.hanziLessons },
  // Fase 4 (artefato §3): ligados a recursos reais do produto (ouvir,
  // traduzir por blocos), não só contadores genéricos de progresso.
  { id:'listen10', icon:'🎧', get label(){ return t('fr.mission.listen10'); }, target:10, get: d => d.audioPlaysToday },
  { id:'translateBlocks2', icon:'🧱', get label(){ return t('fr.mission.translateBlocks2'); }, target:2, get: d => d.exerciseFormatCounts?.reorder || 0 }
];


const ALL_CHALLENGE_POOLS = [EASY_CHALLENGES, REVISAO_HANZI_CHALLENGES, GENERAL_CHALLENGES];


// showToast agora vem de shared/toast.js.


// Modos de estudo que contam para a trilha Explorar (chinês não tem Ditado nem Desafios).
const BADGE_MODES = ['review', 'speed', 'match', 'hanzi', 'stories'];


// Ícones temáticos por unidade — substituem o número na trilha, dando
// reconhecimento visual imediato do assunto de cada unidade.
const UNIT_ICONS = {
  1: '👋', 2: '🙋', 3: '🔢', 4: '👨‍👩‍👧', 5: '🍜',
  6: '⏰', 7: '🗺️', 8: '🛍️', 9: '⛅', 10: '🚇',
  11: '🩺', 12: '🎨', 13: '🗓️', 14: '⚖️', 15: '🎬',
  16: '📅', 17: '✅', 18: '❓'
};

// Cartões de hanzi no idioma do site (refreshStudyCardTexts comum chama por LANG_HOOKS.refreshExtraCards). Por posição
// (id h<lição>-c<índice>): o overlay pode trocar o caractere do slot (巴 -> 美 no inglês), então casar por caractere não serve.
function refreshHanziCardTexts(){
  STATE.hanziCards.forEach((c) => {
    const m = /^h(\d+)-c(\d+)$/.exec(c.id);
    const h = m && HANZI_LESSONS[+m[1]] && HANZI_LESSONS[+m[1]][+m[2]];
    if (h){ CardVariants.swapCardWordProgress(c, c.char, h.char, STATE.cardVariants); c.char = h.char; c.pinyin = h.pinyin; c.meaning = h.meaning; c.radicals = h.radicals; }
  });
}

// ---------- Busca: todo o vocabulário do app, com indicação de unidade concluída ----------
// Mostra tudo -- inclusive vocabulário de unidades ainda não estudadas --
// com uma tag indicando o status, pra poder ir direto estudar o que falta.
function buildSearchIndex(){
  recalculateUnlockedUnits();
  const index = [];
  UNITS.forEach(u => {
    (u.vocab || []).forEach(v => {
      index.push({
        pinyin: v.p, hanzi: v.c, trans: v.t,
        unitId: u.id, unitTitle: u.title, source: 'vocab',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
    });
    // Frases-modelo e diálogo também entram no índice -- algumas palavras
    // (principalmente gramaticais, como 很/吗/了) só aparecem em frases,
    // nunca como entrada isolada de vocabulário.
    (u.phrases || []).forEach(p => {
      index.push({
        pinyin: p.p, hanzi: p.c, trans: p.t,
        unitId: u.id, unitTitle: u.title, source: 'phrase',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
      (p.blocks || []).forEach(b => {
        const cleanHanzi = b.c.replace(/[，。！？]/g, '').trim();
        const cleanPinyin = b.p.replace(/[,.!?]/g, '').trim();
        if (cleanHanzi && cleanHanzi.length <= 2){
          index.push({
            pinyin: cleanPinyin, hanzi: cleanHanzi, trans: t('zh.hanzi.inPhrase', { phrase: p.t }),
            unitId: u.id, unitTitle: u.title, source: 'block',
            completed: !!STATE.unitProgress[u.id]?.completed
          });
        }
      });
    });
    u.dialogue.lines.forEach(l => {
      index.push({
        pinyin: l.p, hanzi: l.c, trans: l.t,
        unitId: u.id, unitTitle: u.title, source: 'dialogue',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
    });
  });
  return index;
}

// Remove marcações de tom (acentos) pra permitir buscar "hen" e encontrar
// "hěn" -- sem isso, a busca por pinyin sem tom nunca bateria com o pinyin
// real do banco, que sempre tem tom marcado.
function stripTones(str){
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SEARCH_PAGE_SIZE = 40;
let searchVisibleCount = SEARCH_PAGE_SIZE;
let lastSearchQuery = null;

function renderSearchResults(query){
  const resultsEl = document.getElementById('search-results');
  const index = buildSearchIndex();
  const q = stripTones(query.trim().toLowerCase());

  if (query !== lastSearchQuery){
    searchVisibleCount = SEARCH_PAGE_SIZE;
    lastSearchQuery = query;
  }

  const filtered = q
    ? index.filter(item =>
        stripTones(item.pinyin.toLowerCase()).includes(q) ||
        item.hanzi.includes(query.trim()) ||
        item.trans.toLowerCase().includes(q)
      )
    : index;

  if (!filtered.length){
    resultsEl.innerHTML = `<div class="search-empty">${t('zh.search.noResults', { q: query })}</div>`;
    return;
  }

  const toShow = filtered.slice(0, searchVisibleCount);
  const hasMore = filtered.length > toShow.length;

  resultsEl.innerHTML = toShow.map(item => {
    const unlocked = STATE.unitProgress[item.unitId]?.unlocked;
    let tagHTML;
    if (item.completed){
      tagHTML = `<span class="search-unit-tag done">${t('zh.search.unitDone', { id: item.unitId })}</span>`;
    } else if (unlocked){
      tagHTML = `<button class="search-unit-tag pending" data-unit-id="${item.unitId}">${t('zh.search.studyUnit', { id: item.unitId })}</button>`;
    } else {
      tagHTML = `<span class="search-unit-tag locked">${t('zh.search.unitLocked', { id: item.unitId, title: item.unitTitle })}</span>`;
    }
    return `
      <div class="search-result-row">
        <div class="pinyin">${item.pinyin}</div>
        <div class="hanzi">${item.hanzi}</div>
        <div class="trans">${item.trans}</div>
        ${tagHTML}
      </div>
    `;
  }).join('') + (hasMore ? `
    <button class="search-load-more-btn" id="search-load-more-btn">
      ${t('zh.search.loadMore', { shown: toShow.length, total: filtered.length })}
    </button>
  ` : '');

  resultsEl.querySelectorAll('.search-unit-tag.pending').forEach(btn => {
    btn.addEventListener('click', () => {
      const unitId = parseInt(btn.dataset.unitId);
      document.getElementById('search-modal').style.display = 'none';
      switchTab('path');
      openUnitDetail(unitId);
    });
  });

  document.getElementById('search-load-more-btn')?.addEventListener('click', () => {
    searchVisibleCount += SEARCH_PAGE_SIZE;
    renderSearchResults(query);
  });
}

document.getElementById('search-open-btn').addEventListener('click', () => {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-input').value = '';
  document.getElementById('search-input').focus();
  renderSearchResults('');
});

document.getElementById('search-modal-close').addEventListener('click', () => {
  document.getElementById('search-modal').style.display = 'none';
});

document.getElementById('search-input').addEventListener('input', (e) => {
  renderSearchResults(e.target.value);
});


// Estado (recolhida/expandida) da faixa de Desafios de hoje -- lembrado
// entre sessões, mesmo padrão de STATE.dailyMinutesLog etc: preferência de
// interface, não progresso, então localStorage puro (nunca precisa
// sincronizar entre dispositivos).
const CHALLENGES_STRIP_COLLAPSE_KEY = 'mandarim_challenges_collapsed';


// ---------- Fase 7 da trilha: modo Mapa ----------
// DOM/seleção/painel em shared/trail-map.js; aqui só o modelo (estados reais) e o que cada botão faz.
const TRAIL_VIEW_KEY = 'mandarim_trail_view';

// mapUnitDescribe (o que o painel do Mapa diz e oferece para uma unidade, com o pulo pelo Ponto de verificação
// quando há módulos): shared/core/modulos-niveis.js (paridade B2).

// Nó do Mapa da história-checkpoint que vem logo depois da unidade (vazio se não houver).
function storyMapNodes(u){
  const story = STORIES.find(s => s.afterUnit === u.id);
  if (!story) return [];
  const unlocked = !!STATE.unitProgress[u.id]?.completed;
  const done = !!STATE.storyProgress?.[story.id]?.completed;
  const sst = done ? 'done' : (unlocked ? 'available' : 'locked');
  return [{ key: 's:' + story.id, kind: 'story', icon: story.icon, label: story.title, state: sst,
    aria: t('trail.map.aria.story', { title: story.title, state: TRAIL_MAP_STATE_LABEL[sst] }) }];
}
// Painel do Mapa de uma história (null se a chave não for de história).
function storyMapDescribe(key){
  if (!key.startsWith('s:')) return null;
  const story = STORIES.find(s => String(s.id) === key.slice(2));
  const unlocked = !!STATE.unitProgress[story.afterUnit]?.completed;
  const done = !!STATE.storyProgress?.[story.id]?.completed;
  return { eyebrow: t('trail.map.story.eyebrow'), title: story.title, status: TRAIL_MAP_STATE_LABEL[done ? 'done' : (unlocked ? 'available' : 'locked')], goal: story.subtitle || '',
    lines: unlocked ? [] : [t('trail.map.story.lockedHint')],
    actions: unlocked ? [{ label: done ? t('trail.map.story.readAgain') : t('trail.map.story.read'), primary: !done, onClick: () => openStory(story.id) }] : [] };
}

function renderTrailMapView(container){
  // Com módulos (shared/core/modulos-niveis.js): uma seção por módulo, com Revisão do módulo e Ponto de verificação,
  // e as histórias no mesmo lugar de sempre (logo depois da unidade). Hoje o zh não tem módulos.
  if (trailHasModules()){
    renderModulesTrailMap(container, modulesOfLevel(LEVELS[0].id), { afterUnitNodes: storyMapNodes, describeExtra: storyMapDescribe });
    return;
  }
  const nodes = [];
  UNITS.forEach(u => {
    const st = unitBlockState(u);
    nodes.push({ key: 'u:' + u.id, kind: 'unit', icon: UNIT_ICONS[u.id] || '📖', label: u.title, state: st, current: st === 'current',
      aria: `${u.title}, ${TRAIL_MAP_STATE_LABEL[st]}` });
    // Histórias-checkpoint: mesmo marco que a Trilha mostra logo após a unidade.
    storyMapNodes(u).forEach(n => nodes.push(n));
  });
  const describe = (key) => {
    const storyInfo = storyMapDescribe(key);
    if (storyInfo) return storyInfo;
    return mapUnitDescribe(UNITS.find(u => String(u.id) === key.slice(2)), null);
  };
  renderTrailMap(container, { sections: [{ title: t('trail.map.unitsSection'), nodes }] }, describe);
}


// Cartão da história-checkpoint que vem logo depois da unidade (null se não houver).
function buildStoryCheckpointCard(u){
  const prog = STATE.unitProgress[u.id];
  const story = STORIES.find(s => s.afterUnit === u.id);
  if (!story) return null;
  const storyUnlocked = prog.completed;
  const storyDone = STATE.storyProgress?.[story.id]?.completed;
  const storyCard = document.createElement('button');
  storyCard.className = 'story-checkpoint-card' + (!storyUnlocked ? ' locked' : '') + (storyDone ? ' done' : '');
  storyCard.innerHTML = `
        <div class="story-checkpoint-icon">${story.icon}</div>
        <div class="story-checkpoint-text">
          <div class="story-checkpoint-label">${storyDone ? t('zh.path.story.done') : (storyUnlocked ? t('zh.path.story.unlocked') : t('zh.path.story.locked'))}</div>
          <div class="story-checkpoint-title">${story.title}</div>
          <div class="story-checkpoint-subtitle">${story.subtitle}</div>
        </div>
      `;
  if (storyUnlocked){
    storyCard.addEventListener('click', () => openStory(story.id));
  }
  return storyCard;
}

// ============================================================
// HISTÓRIAS-CHECKPOINT — recombinam vocabulário de várias unidades já
// concluídas numa situação nova, com pergunta de compreensão intercalada
// ao longo da leitura (não só no final). Dados em stories.js.
// ============================================================
const STORY_STATE = {
  storyId: null,
  beatIndex: 0,
  questionAnswered: false
};

function openStory(storyId){
  const story = STORIES.find(s => s.id === storyId);
  if (!story) return;

  STORY_STATE.storyId = storyId;
  STORY_STATE.beatIndex = 0;
  STORY_STATE.questionAnswered = false;

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'none';
  document.getElementById('story-wrap').style.display = 'block';

  document.getElementById('story-header-icon').textContent = story.icon;
  document.getElementById('story-header-title').textContent = story.title;
  document.getElementById('story-header-subtitle').textContent = story.subtitle;

  document.getElementById('story-content').innerHTML = '';
  renderNextStoryBeat();
}

function currentStory(){
  return STORIES.find(s => s.id === STORY_STATE.storyId);
}

function renderStoryProgress(){
  const story = currentStory();
  const pct = Math.round((STORY_STATE.beatIndex / story.beats.length) * 100);
  document.getElementById('story-progress-fill').style.width = `${pct}%`;
}

// Renderiza o próximo "beat" (grupo de falas + pergunta opcional), sempre
// ANEXANDO ao conteúdo já lido (não substituindo) -- assim a história cresce
// na tela como uma conversa real acontecendo, e dá pra rolar pra rever
// falas anteriores a qualquer momento.
function renderNextStoryBeat(){
  stopExerciseAudio();
  const story = currentStory();
  const contentEl = document.getElementById('story-content');
  renderStoryProgress();

  if (STORY_STATE.beatIndex >= story.beats.length){
    // Streak conta aqui -- fim da HISTÓRIA inteira, não a cada pergunta de
    // compreensão respondida (mesmo raciocínio do Flashcard/Speed Review:
    // uma seção de estudo completa, não uma interação isolada).
    registerStudyToday();
    maybeShowStreakCelebration();
    contentEl.insertAdjacentHTML('beforeend', `
      <div class="story-complete">
        <div class="big-emoji">🎉</div>
        <h3>${t('zh.story.doneTitle')}</h3>
        <p>${t('zh.story.doneBody', { from: story.coversUnits[0], to: story.coversUnits[story.coversUnits.length-1] })}</p>
        <button class="btn btn-primary" id="story-finish-btn">${t('zh.story.backToPath')}</button>
      </div>
    `);
    document.getElementById('story-finish-btn').addEventListener('click', () => {
      finishStory();
    });
    return;
  }

  const beat = story.beats[STORY_STATE.beatIndex];
  const beatEl = document.createElement('div');
  beatEl.className = 'story-beat';
  beatEl.innerHTML = beat.lines.map(line => `
    <div class="story-line">
      <div class="story-line-speaker">${line.spk}</div>
      <div class="story-line-pinyin pinyin">${line.p}</div>
      <div class="story-line-hanzi">${line.c} ${audioBtnHTML(line.c)}</div>
      <div class="story-line-trans">${line.t}</div>
    </div>
  `).join('');
  contentEl.appendChild(beatEl);
  wireAudioButtons(beatEl);

  if (beat.question){
    STORY_STATE.questionAnswered = false;
    const q = beat.question;
    const qEl = document.createElement('div');
    qEl.className = 'story-question';
    qEl.innerHTML = `
      <div class="story-question-prompt">${q.prompt}</div>
      <div class="story-question-options">
        ${q.options.map((opt, i) => `<button class="story-question-option" data-idx="${i}">${opt}</button>`).join('')}
      </div>
    `;
    contentEl.appendChild(qEl);

    qEl.querySelectorAll('.story-question-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STORY_STATE.questionAnswered) return;
        STORY_STATE.questionAnswered = true;
        const chosenIdx = parseInt(btn.dataset.idx);
        const isCorrect = chosenIdx === q.correctIndex;
        qEl.querySelectorAll('.story-question-option').forEach((b, i) => {
          b.classList.add('disabled');
          if (i === q.correctIndex) b.classList.add('correct');
          else if (i === chosenIdx) b.classList.add('incorrect');
        });
        // História já concluída não paga XP de novo (decisão de 2026-10-15).
        if (isCorrect && !STATE.storyProgress[STORY_STATE.storyId]?.completed) addXP(STORY_QUESTION_XP);

        const continueBtn = document.createElement('button');
        continueBtn.className = 'story-continue-btn';
        continueBtn.textContent = t('zh.path.continueStoryArrow');
        continueBtn.addEventListener('click', () => {
          STORY_STATE.beatIndex += 1;
          renderNextStoryBeat();
        }, { once: true });
        qEl.appendChild(continueBtn);
        continueBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  } else {
    // Beat sem pergunta: botão simples pra continuar lendo
    const continueBtn = document.createElement('button');
    continueBtn.className = 'story-continue-btn';
    continueBtn.textContent = t('common.continueArrow');
    continueBtn.addEventListener('click', () => {
      STORY_STATE.beatIndex += 1;
      renderNextStoryBeat();
    }, { once: true });
    contentEl.appendChild(continueBtn);
    continueBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function finishStory(){
  const storyId = STORY_STATE.storyId;
  if (!STATE.storyProgress[storyId]?.completed){
    STATE.storyProgress[storyId] = { completed: true };
    addXP(STORY_DONE_XP);
    showToast(t('zh.toast.storyDone'));
  }
  saveState();
  renderTopbarStats();
  document.getElementById('story-wrap').style.display = 'none';
  document.getElementById('path-list-wrap').style.display = 'block';
  renderUnitsGrid();
}

document.getElementById('story-back-to-path').addEventListener('click', () => {
  stopExerciseAudio();
  document.getElementById('story-wrap').style.display = 'none';
  document.getElementById('path-list-wrap').style.display = 'block';
  renderUnitsGrid();
});

// ============================================================
// LIÇÃO EM PASSOS (Vocabulário → Exercícios → Frases → Diálogo)
// ============================================================


wireLessonChromeButtons(); // shared/core/app-comum.js


// ============================================================
// MANUAL DE APOIO (resumo por unidade + aba geral)
// ============================================================

// Gera o HTML de resumo de uma unidade (vocabulário + frases + diálogo,
// sem exercícios) — usado no modal "Manual da unidade" (📖 dentro do painel
// de dicas de cada lição).
function renderUnitSummaryHTML(u){
  // Unidade de gramática (shared/core/gramatica-cenario.js) não tem vocabulário, frases nem diálogo: o manual dela é a própria explicação.
  if (isGrammarUnit(u)) return '';
  const vocabHTML = u.vocab.map(v => `
    <div class="vocab-row vocab-row-readonly">
      <div class="pinyin">${v.p}</div>
      <div class="hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>
      <div class="trans">${v.t}</div>
    </div>
  `).join('');

  const phrasesHTML = u.phrases.map(p => `
    <div class="phrase-item">
      <div class="pinyin">${p.p}</div>
      <div class="hanzi">${p.c} ${audioBtnHTML(p.c)}</div>
      <div class="trans">${p.t}</div>
    </div>
  `).join('');

  const dialogueHTML = `<div class="dialogue-title">${u.dialogue.title}</div>` +
    u.dialogue.lines.map(l => `
      <div class="dialogue-line">
        <div class="dialogue-spk">${l.spk}</div>
        <div class="dialogue-content">
          <div class="hanzi">${l.c} ${audioBtnHTML(l.c)}</div>
          <div class="pinyin">${l.p}</div>
          <div class="trans">${l.t}</div>
        </div>
      </div>
    `).join('');

  return `
    <div class="section-label">${t('zh.path.summary.vocabulary')}</div>
    <div class="vocab-table">${vocabHTML}</div>
    <div class="section-label">${t('zh.path.summary.phrases')}</div>
    <div class="phrase-list">${phrasesHTML}</div>
    <div class="section-label">${t('zh.path.summary.dialogue')}</div>
    <div class="dialogue-box">${dialogueHTML}</div>
  `;
}

// ---------- Modal: manual da unidade atual ----------
document.getElementById('unit-manual-btn').addEventListener('click', () => {
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  document.getElementById('unit-manual-title').textContent = t('zh.manual.title', { id: u.id, title: u.title });
  const bodyEl = document.getElementById('unit-manual-body');
  bodyEl.innerHTML = renderUnitSummaryHTML(u);
  wireAudioButtons(bodyEl);
  wireStrokeButtons(bodyEl);
  document.getElementById('unit-manual-modal').style.display = 'flex';
});

document.getElementById('unit-manual-close').addEventListener('click', () => {
  document.getElementById('unit-manual-modal').style.display = 'none';
});
document.getElementById('unit-manual-modal').addEventListener('click', (e) => {
  if (e.target.id === 'unit-manual-modal'){
    document.getElementById('unit-manual-modal').style.display = 'none';
  }
});


// ---------- Explicação contextual (cartões de conceito) ----------
// Substitui a lógica de "Dicas e Notas"/"Manual da unidade" como mecanismo
// PRINCIPAL de ensino de gramática: em vez de um banco à parte que o aluno
// precisa abrir por conta própria, cada conceito de `unit.concepts` dispara
// no ponto exato da lição em que passa a ser relevante -- contato (o aluno
// acabou de ver/usar a palavra) -> percepção -> explicação curta -> volta
// direto pra prática, sem sair da lição. Reaproveita o mesmo formato
// title/body/examples/wrapup que as unidades de gramática do Français do
// Zero já usam (u.grammar.blocks) -- não é um segundo sistema paralelo, só
// uma forma de disparar o mesmo tipo de cartão NO MEIO de uma lição de
// vocabulário, em vez de só numa unidade de gramática inteira.


// ============================================================
// RENDER: Diálogo da lição (balões, áudio em sequência, vocabulário
// destacado e micro-checagem "Você entendeu?") -- mesma experiência do
// francês, com hanzi + pinyin em cada fala.
// ============================================================
// Dados extras de cada diálogo (content.js): `scene` (contexto), `speakers`
// ({<spk>:{n,e}} -- nome e emoji de cada falante) e `check` (3 perguntas).
// Tudo opcional: sem `speakers` cai no próprio `spk`, sem `check` o botão
// Continuar aparece direto. O 1º falante fica à esquerda, o 2º à direita.


// Termos do vocabulário da unidade que valem destaque nas falas (hanzi).
function dlgVocabTerms(u){
  const terms = [];
  (u.vocab || []).forEach(v => { if (v.c) terms.push({ t: v.c, tr: v.t, py: v.p }); });
  terms.sort((a, b) => b.t.length - a.t.length);
  return terms;
}

// HTML da fala com as palavras da unidade em cor de destaque (data-tr = significado,
// mostrado num toast ao tocar). Tudo que não casa é escapado.
function dlgHighlight(text, terms){
  if (!terms.length) return escapeHTML(text);
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(' + terms.map(x => esc(x.t)).join('|') + ')', 'g');
  const map = new Map(terms.map(x => [x.t, x]));
  let out = '', last = 0, m;
  while ((m = re.exec(text))){
    out += escapeHTML(text.slice(last, m.index));
    const t = map.get(m[1]) || {};
    out += `<span class="dlg-new" data-tr="${escapeHTML(t.tr || '')}" data-w="${escapeHTML(m[1])}" data-py="${escapeHTML(t.py || '')}">${escapeHTML(m[1])}</span>`;
    last = m.index + m[1].length;
  }
  return out + escapeHTML(text.slice(last));
}

// Pinyin da fala com as palavras da unidade em destaque. O pinyin das falas vem
// agrupado por palavra (não sílaba a sílaba), então não dá para alinhar por
// posição: procura o pinyin do vocabulário (sem espaços/maiúsculas) dentro do
// pinyin da fala, só para as palavras que casaram no hanzi e no máximo tantas
// vezes quantas apareceram nele.
function dlgHighlightPinyin(c, p, terms){
  if (!terms.length || !p) return escapeHTML(p || '');
  const used = terms.filter(x => x.py && c.includes(x.t));
  if (!used.length) return escapeHTML(p);
  const keep = [], idx = []; // keep[j] = caractere normalizado; idx[j] = posição em p
  for (let i = 0; i < p.length; i++){
    if (/[\s'’·]/.test(p[i])) continue;
    keep.push(p[i].toLowerCase()); idx.push(i);
  }
  const hay = keep.join('');
  const norm = x => x.toLowerCase().replace(/[\s'’·]/g, '');
  const ranges = [];
  const taken = new Array(hay.length).fill(false);
  used.sort((a, b) => norm(b.py).length - norm(a.py).length).forEach(x => {
    const needle = norm(x.py); if (!needle) return;
    let max = c.split(x.t).length - 1, from = 0;
    while (max > 0){
      const at = hay.indexOf(needle, from); if (at < 0) break;
      from = at + needle.length;
      if (taken.slice(at, at + needle.length).some(Boolean)) continue;
      for (let k = at; k < at + needle.length; k++) taken[k] = true;
      ranges.push([idx[at], idx[at + needle.length - 1] + 1]); max--;
    }
  });
  ranges.sort((a, b) => a[0] - b[0]);
  let out = '', last = 0;
  ranges.forEach(([a, b]) => {
    out += escapeHTML(p.slice(last, a)) + `<span class="dlg-new-py">${escapeHTML(p.slice(a, b))}</span>`; last = b;
  });
  return out + escapeHTML(p.slice(last));
}


wireStepNavButtons(); // shared/core/app-comum.js (Voltar e Continuar da lição)


// ---------- Exercício "Frase completa" — PT → escolher entre 4 frases em hanzi ----------
// Gera distratores de duas formas: (1) trocando uma palavra de conteúdo por
// outra do vocabulário cumulativo (unidade atual + todas anteriores já
// desbloqueadas), e (2) invertendo a posição de uma negação (不/没), um erro
// gramatical plausível e comum de iniciante. Usa os `blocks` que as frases já
// têm, evitando qualquer manipulação frágil de string solta.
function buildCumulativeVocabPool(unit){
  const idx = UNITS.findIndex(u => u.id === unit.id);
  const priorUnits = UNITS.slice(0, idx + 1); // unidade atual + todas anteriores
  const pool = [];
  priorUnits.forEach(u => (u.vocab || []).forEach(v => pool.push(v))); // unidade de gramática não tem vocab
  return pool;
}

function buildFullSentenceExercises(unit){
  const cumulativeVocab = buildCumulativeVocabPool(unit);

  const candidates = (unit.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  // Limita a 2 por unidade pra não sobrecarregar a sessão de exercícios com
  // um formato mais denso de ler do que os outros.
  const selected = shuffle(candidates).slice(0, 2);

  return selected.map(phrase => {
    const distractors = [];

    // Blocos "de conteúdo": uma palavra isolada, sem pontuação misturada
    // (blocos com pontuação, como "什么名字？", costumam ser a cauda de toda
    // a frase -- trocar ou remover esses gera um distrator sem sentido
    // gramatical, fácil demais de descartar).
    const contentBlockIndices = phrase.blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => {
        const clean = b.c.replace(/[，。！？]/g, '');
        return clean.length >= 2 && clean === b.c;
      });

    function pickReplacement(targetBlock){
      const sameLength = cumulativeVocab.filter(v =>
        v.c !== targetBlock.c && Math.abs(v.c.length - targetBlock.c.length) <= 1
      );
      return shuffle(sameLength.length ? sameLength : cumulativeVocab.filter(v => v.c !== targetBlock.c))[0];
    }

    // Estratégia 1: troca de palavra -- substitui um bloco de conteúdo por
    // outra palavra do vocabulário cumulativo, priorizando tamanho parecido
    // pra manter o mesmo "papel" gramatical.
    let swapTargetIdx = -1;
    if (contentBlockIndices.length){
      swapTargetIdx = contentBlockIndices[Math.floor(Math.random() * contentBlockIndices.length)].i;
      const replacement = pickReplacement(phrase.blocks[swapTargetIdx]);
      if (replacement){
        const newBlocks = phrase.blocks.map((b, i) => i === swapTargetIdx ? { p: replacement.p, c: replacement.c } : b);
        distractors.push(newBlocks);
      }
    }

    // Estratégia 2: erro de posição gramatical -- se a frase tem negação
    // (不/没) em algum bloco, gera uma variante trocando a posição dela com
    // o bloco seguinte (erro comum: "是不" em vez de "不是").
    const negIdx = phrase.blocks.findIndex(b => b.c.includes('不') || b.c.includes('没'));
    const hasNegationSwap = negIdx >= 0 && negIdx < phrase.blocks.length - 1;
    if (hasNegationSwap){
      const swapped = phrase.blocks.slice();
      [swapped[negIdx], swapped[negIdx + 1]] = [swapped[negIdx + 1], swapped[negIdx]];
      distractors.push(swapped);
    }

    // Estratégia 3: combinação -- troca de palavra E inversão de posição na
    // MESMA opção (uma das 4 alternativas junta os dois erros, ficando ainda
    // mais parecida com a correta e mais desafiadora de descartar).
    if (swapTargetIdx >= 0 && hasNegationSwap){
      const replacement2 = pickReplacement(phrase.blocks[swapTargetIdx]);
      if (replacement2){
        const combined = phrase.blocks.map((b, i) => i === swapTargetIdx ? { p: replacement2.p, c: replacement2.c } : b);
        [combined[negIdx], combined[negIdx + 1]] = [combined[negIdx + 1], combined[negIdx]];
        distractors.push(combined);
      }
    }

    // Estratégia 4: omissão de palavra-chave -- remove um bloco de conteúdo
    // inteiro, gerando uma frase incompleta/agramatical.
    if (contentBlockIndices.length > 1){
      const omitCandidates = contentBlockIndices.filter(({ i }) => i !== swapTargetIdx);
      const pool = omitCandidates.length ? omitCandidates : contentBlockIndices;
      const omitIdx = pool[Math.floor(Math.random() * pool.length)].i;
      const withOmission = phrase.blocks.filter((b, i) => i !== omitIdx);
      if (withOmission.length >= 2){
        distractors.push(withOmission);
      }
    }

    // Fallback: embaralha os próprios blocos da frase -- sempre gramaticalmente
    // "errado" o bastante pra servir de distrator, sem nunca coincidir por
    // acaso com a ordem correta. Tentativas limitadas: frases muito curtas
    // (2-3 blocos) têm poucas permutações possíveis.
    let fallbackAttempts = 0;
    while (distractors.length < 3 && phrase.blocks.length >= 2 && fallbackAttempts < 20){
      fallbackAttempts++;
      const shuffledBlocks = shuffle(phrase.blocks);
      const isSameOrder = shuffledBlocks.every((b, i) => b === phrase.blocks[i]);
      const isDuplicate = distractors.some(d => JSON.stringify(d) === JSON.stringify(shuffledBlocks));
      if (!isSameOrder && !isDuplicate){
        distractors.push(shuffledBlocks);
      }
    }

    // Uma frase errada continua com cara de frase: a pontuação final só no
    // fim (nunca "一个姐姐。有我") e a maiúscula do pinyin só na primeira
    // palavra. Nomes próprios (maiúscula fora do 1º bloco) ficam como estão.
    const endPunctC = (phrase.blocks[phrase.blocks.length - 1].c.match(/[。！？]+$/) || [''])[0];
    const endPunctP = (phrase.blocks[phrase.blocks.length - 1].p.match(/[.!?]+$/) || [''])[0];
    const firstBlock = phrase.blocks[0];
    const tidyDistractor = (blocks) => {
      const out = blocks.map(b => ({
        c: b.c.replace(/[。！？]+$/, ''),
        p: (b === firstBlock ? b.p.charAt(0).toLowerCase() + b.p.slice(1) : b.p).replace(/[.!?]+$/, '')
      })).filter(b => b.c);
      if (!out.length) return out;
      out[out.length - 1] = { c: out[out.length - 1].c + endPunctC, p: out[out.length - 1].p + endPunctP };
      out[0] = { c: out[0].c, p: out[0].p.charAt(0).toUpperCase() + out[0].p.slice(1) };
      return out;
    };

    const distractorSentences = distractors
      .map(tidyDistractor)
      .filter(blocks => blocks.map(b => b.c).join('') !== phrase.blocks.map(b => b.c).join('')) // nunca deixa um distrator coincidir com a frase correta
      .reduce((unique, blocks) => { // deduplica por texto final (hanzi), não por referência de array
        const text = blocks.map(b => b.c).join('');
        if (!unique.some(u => u.text === text)) unique.push({ text, blocks });
        return unique;
      }, [])
      .slice(0, 3)
      .map(({ blocks }) => ({
        p: blocks.map(b => b.p).join(' '),
        c: blocks.map(b => b.c).join('')
      }));

    // Frase com duas formas alternativas ("/"): as opções só testam a primeira
    // (é o que `blocks` cobre) -- nunca a frase inteira com as duas perguntas.
    const correctSentence = phrase.c.includes('/')
      ? { p: phrase.blocks.map(b => b.p).join(' '), c: phrase.blocks.map(b => b.c).join('') }
      : { p: phrase.p, c: phrase.c };
    const options = shuffle([correctSentence, ...distractorSentences]);

    // phrase (com .t) reaproveita o mesmo painel de acerto/erro já usado
    // pelo reorder e pelo cloze (showCorrectReorderPanel/answerExplanationParts
    // leem ex.phrase, não um campo próprio deste formato).
    return { format: 'fullsentence', phrase: { c: correctSentence.c, p: correctSentence.p, t: phrase.t }, correct: correctSentence, options };
  });
}


wireLessonKeyboardShortcuts(); // shared/core/app-comum.js


// Explicação usada no painel de erro/revelação, sempre mostrada
// AUTOMATICAMENTE junto da resposta -- pra exercícios baseados numa frase
// (ordenar, completar), mostra o significado da própria frase certa. Pros
// de vocabulário, mostra a tradução + a frase de origem quando existir
// (findMatchingPhrase, mesma busca do card de vocabulário). Pro
// verdadeiro/falso, usa o `whyNote` autorado por item (explica especificamente
// a afirmação testada -- ver PRs #74/#75); só cai na nota gramatical genérica
// da unidade se algum item antigo não tiver `whyNote`. A retomada de conteúdo
// vem junto da explicação, não atrás de um botão "Rever conteúdo" separado --
// "Por que não foi essa" já cumpre sozinho o papel de reconectar o aluno ao
// conteúdo.
// Detalhe do painel de acerto/erro do "Complete a frase": SEMPRE a frase
// completa certa (hanzi + pinyin + áudio) e a tradução -- igual no acerto e
// no erro. No erro/"Não sei", `withCorrect` acrescenta a resposta certa.
// Frase falada/mostrada no "Complete a frase": quando a frase tem duas formas
// alternativas separadas por "/" (ex.: "你几岁？/ 你多大？"), o exercício só
// testa a primeira (é o que `blocks` cobre) -- áudio e painel usam só essa,
// nunca a frase inteira com as duas perguntas.
function phraseForExercise(phrase){
  if (!phrase.c.includes('/') || !phrase.blocks) return { c: phrase.c, p: phrase.p };
  return { c: phrase.blocks.map(b => b.c).join(''), p: phrase.blocks.map(b => b.p).join(' ') };
}
function clozeExercisePhrase(ex){ return phraseForExercise(ex.phrase); }

// Padrão dos painéis de acerto/erro de exercícios baseados numa frase: a
// frase em chinês (hanzi + áudio + pinyin) num bloco e a tradução logo abaixo,
// visualmente diferenciada (linha separadora, texto em português mais claro).
// `correctLine` (opcional) vai antes, ex.: "Resposta certa: 我叫".
function phraseFeedbackDetailHTML(phrase, translation, correctLine){
  const f = phraseForExercise(phrase);
  return `${correctLine ? `<div class="feedback-correct-line">${correctLine}</div>` : ''}
    <div class="feedback-phrase-zh"><strong>${f.c}</strong> ${audioBtnHTML(f.c)}<br><span class="pinyin">${f.p}</span></div>
    <div class="feedback-phrase-trans">${translation}</div>`;
}


// Aviso "Quase! ..." na revisão, quando o erro foi só de tom (ver
// isToneOnlyMiss) -- só aparece depois de responder, nunca antes.
function toneHintHTML(localState){
  if (!localState.answered || localState.wasCorrect || !localState.toneOnly) return '';
  return `<div class="wrong-feedback-header tone-hint">${localState.toneOnly === 'wrong' ? t('feedback.tone.wrong') : t('feedback.tone.missing')}</div>`;
}

// Pinyin sem marcas de tom (mantém o trema do ü) -- usado só pra distinguir
// "errou a sílaba" de "acertou a sílaba, faltou/errou só o tom".
function pinyinWithoutTones(str){
  return String(str || '').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').normalize('NFC');
}
// true quando a resposta digitada só difere de UMA das formas aceitas pelo tom.
// Devolve false (não é só o tom), 'missing' (digitou sem nenhum tom) ou
// 'wrong' (digitou um tom, mas não o certo).
function isToneOnlyMiss(typed, expectedForms, strip){
  const t = pinyinWithoutTones(typed);
  if (!expectedForms.some(f => pinyinWithoutTones(strip(f)) === t)) return false;
  return pinyinWithoutTones(typed) === String(typed).normalize('NFC') ? 'missing' : 'wrong';
}


// Forma em que os exercícios de digitar do zh comparam o pinyin: numerado vira marca de tom, minúsculas, sem
// pontuação. A marcação de "Sua resposta" (typedAttemptHTML, via LANG_HOOKS.typedAttemptForm) usa a mesma forma,
// para as letras em vermelho concordarem com o veredito.
function pinyinAnswerCompareForm(s){
  return normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
}
// O que "Sua resposta" mostra: a mesma forma, mas mantendo maiúsculas como a aluna digitou (o alinhamento das letras
// já ignora maiúscula, como o veredito). Pinyin numerado aparece convertido ("ni3" -> "nǐ") e a pontuação sai,
// porque o veredito também a ignora: assim nada fica vermelho sem ter contado como erro.
function pinyinAttemptDisplayForm(s){
  return convertNumberedPinyin(String(s || '')).normalize('NFC').replace(/[.,!?;:'"，。！？；：]/g, '').trim();
}

// BEGIN pinyin-answer-logic (extraído literalmente por zh/scripts/test_answer_validation.js -- não mover/renomear estes marcadores sem atualizar o teste)
// ---------- Comparação de pinyin digitado (preserva tom) ----------
// Auditoria 2026-09-16 (grilling): esta função ERA uma cópia quase literal
// da normalizeLoose() do francês (fr/app.js) -- removia diacríticos antes de
// comparar, o que faz sentido pro francês (acento é opcional/decorativo pra
// efeito de correção lá) mas é ERRADO pro pinyin: o tom é parte da
// identidade fonológica da sílaba, não decoração. mā/má/mǎ/mà/ma são
// palavras DIFERENTES, não variações toleráveis da mesma resposta -- essa
// versão antiga tratava as 5 como equivalentes, o que apagava o propósito
// da teclinha de tom (wirePinyinTonePicker/PINYIN_TONE_GROUPS logo abaixo):
// o esforço de digitar o tom certo nunca era premiado nem cobrado.
// NÃO reaproveitar a lógica de acento do francês aqui de novo -- são
// fenômenos linguísticos diferentes, mesmo que o código pareça "parecido".
//
// Ainda tolera maiúscula/minúscula e espaço (como sempre tolerou) e agora
// também aceita pinyin NUMERADO (ma1-ma5, convenção universal de IME sem
// tecla de acento -- ver convertNumberedPinyin) como forma alternativa do
// MESMO tom que o diacrítico correspondente: "ma3" e "mǎ" comparam iguais,
// "ma3" e "má" não. Ver testes em zh/scripts/test_answer_validation.js.
function normalizePinyinAnswer(str){
  return convertNumberedPinyin(String(str || ''))
    .normalize('NFC')
    .toLowerCase()
    .trim();
}

// ---------- Conversão de pinyin numerado (ma1-ma5) -> diacrítico ----------
// "v" é aceito no lugar de "ü" -- convenção universal de todo IME de pinyin
// (teclado padrão não tem tecla ü). Tom 5 (ou pinyin sem número no final)
// é tom neutro -- corretamente SEM marca, não "tom não informado".
const PINYIN_TONE_MARKS = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  'ü': ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

// Acha o índice da vogal que recebe a marca de tom numa sílaba, seguindo a
// regra oficial de pinyin: "a"/"e" tem prioridade sobre qualquer outra
// vogal; senão, em "ou" a marca vai no "o"; senão vai na última vogal da
// sequência (cobre "i"/"u"/"ü" isolados ou em ditongo tipo "ui"/"iu").
function pinyinToneVowelIndex(letters){
  const lower = letters.toLowerCase();
  if (lower.includes('a')) return lower.indexOf('a');
  if (lower.includes('e')) return lower.indexOf('e');
  if (lower.includes('ou')) return lower.indexOf('o');
  for (let i = lower.length - 1; i >= 0; i--){
    if ('iuü'.includes(lower[i])) return i;
  }
  return -1;
}

// Converte UMA sílaba numerada ("ma3", "nv3", "xian1", "ma5"/"ma") pra
// forma diacrítica ("mǎ", "nǚ", "xiān", "ma"). Uma sílaba que não termina
// em dígito 1-5 (já diacrítica, ou não é pinyin) volta inalterada.
function convertNumberedPinyinSyllable(syllable){
  const m = syllable.match(/^([a-zA-Zü]+)([1-5])$/);
  if (!m) return syllable;
  let [, letters] = m;
  const tone = parseInt(m[2], 10);
  letters = letters.replace(/v/g, 'ü').replace(/V/g, 'Ü');
  if (tone === 5) return letters; // tom neutro -- sem marca, de propósito
  const idx = pinyinToneVowelIndex(letters);
  if (idx === -1) return letters; // sem vogal reconhecida -- devolve sem marcar em vez de travar
  const vowelLower = letters[idx].toLowerCase();
  const marks = PINYIN_TONE_MARKS[vowelLower];
  if (!marks) return letters;
  const isUpper = letters[idx] !== letters[idx].toLowerCase();
  const mark = isUpper ? marks[tone].toUpperCase() : marks[tone];
  return letters.slice(0, idx) + mark + letters.slice(idx + 1);
}

// Converte uma resposta inteira (pode ter várias sílabas, separadas por
// espaço e/ou apóstrofo de separação silábica tipo "xi1'an1") de pinyin
// numerado pra diacrítico. Texto que já não tem sílabas numeradas passa
// direto sem alteração -- seguro de chamar em qualquer string.
function convertNumberedPinyin(str){
  return str.replace(/[a-zA-Zü]+[1-5]\b/g, convertNumberedPinyinSyllable);
}

// END pinyin-answer-logic

// ---------- Teclinha de tons do pinyin (exercícios digitados) ----------
// Ninguém tem um teclado chinês pra digitar vogais com tom -- isso dá um
// jeito de inserir o caractere certo sem precisar de IME. Importante: o
// tom É exigido pra acertar -- a comparação (normalizePinyinAnswer) mantém
// os diacríticos dos dois lados, então "ba" NÃO é aceito no lugar de "bā".
const PINYIN_TONE_GROUPS = [
  ['ā', 'á', 'ǎ', 'à'],
  ['ē', 'é', 'ě', 'è'],
  ['ī', 'í', 'ǐ', 'ì'],
  ['ō', 'ó', 'ǒ', 'ò'],
  ['ū', 'ú', 'ǔ', 'ù'],
  ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
];

function pinyinTonePickerHTML(){
  return `<div class="pinyin-tone-picker">${PINYIN_TONE_GROUPS.map(group => `
    <div class="pinyin-tone-group">${group.map(ch => `<button type="button" class="pinyin-tone-key">${ch}</button>`).join('')}</div>
  `).join('')}</div>`;
}

// Insere no CURSOR (não sempre no final) -- dá pra corrigir só a vogal que
// falta o tom no meio da palavra sem apagar o resto e redigitar.
function wirePinyinTonePicker(pickerEl, inputEl){
  if (!pickerEl || !inputEl) return;
  pickerEl.querySelectorAll('.pinyin-tone-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const start = inputEl.selectionStart ?? inputEl.value.length;
      const end = inputEl.selectionEnd ?? inputEl.value.length;
      const ch = btn.textContent;
      inputEl.value = inputEl.value.slice(0, start) + ch + inputEl.value.slice(end);
      inputEl.focus();
      inputEl.setSelectionRange(start + ch.length, start + ch.length);
    });
  });
}


// ---------- Exercício de ordenar palavras (reorder) ----------
// A frase-modelo aparece embaralhada em blocos de pinyin (com hanzi como apoio
// visual abaixo de cada bloco). Toca nos blocos na ordem certa para reconstruir
// a frase. Foco na ordem gramatical, não em reconhecer hanzi isolado.
// ---------- Exercício de frase completa (PT -> escolher entre 4 frases) ----------
// Sem botão de áudio nas opções (2026-10-07): as frases erradas são montadas na
// hora e não têm mp3 gravado, então tocavam com a voz do navegador (bem pior) e a
// diferença entregava a certa. O áudio da frase certa vem no painel de resultado.
function renderFullSentenceExercise(ex, contentEl, nextBtn, total){
  const optionsHTML = ex.options.map((opt, i) => `
    <div class="exercise-option exercise-option-sentence" role="button" tabindex="0" data-idx="${i}">
      <div class="opt-sentence-text">
        <div class="pinyin opt-pinyin-sentence">${opt.p}</div>
        <div class="opt-hanzi-sentence">${opt.c}</div>
      </div>
    </div>
  `).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${t('zh.exercise.selectSentence')}</div>
      <div class="exercise-prompt">
        <div class="prompt-trans-sentence">${ex.phrase.t}</div>
      </div>
      <div class="exercise-options exercise-options-sentence">${optionsHTML}</div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  nextBtn.style.display = 'none';
  wireAudioButtons(contentEl);
  contentEl.querySelectorAll('.exercise-option-sentence').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.click(); }
    });
  });

  function revealCorrectVisual(chosenIdx){
    contentEl.querySelectorAll('.exercise-option-sentence').forEach((b, i) => {
      b.classList.add('disabled');
      if (ex.options[i] === ex.correct) b.classList.add('correct');
      else if (i === chosenIdx) b.classList.add('incorrect');
    });
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  contentEl.querySelectorAll('.exercise-option-sentence').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = ex.options[chosenIdx] === ex.correct;
      STEP_STATE.exerciseAnswered = true;
      playFeedbackSound(isCorrect);
      revealCorrectVisual(chosenIdx);
      addStudyMinutes();
      if (isCorrect){
        STEP_STATE.exerciseScore += 1;
        addXP(exerciseXP(ex, EXERCISE_XP_PRODUCE)); // vale um pouco mais que múltipla escolha simples, mesmo critério do reorder
        setTimeout(() => showCorrectFeedbackPanel(contentEl, phraseFeedbackDetailHTML(ex.phrase, ex.phrase.t)), 500);
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(-1);
    addStudyMinutes();
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}


function cardPromptPinyinText(cardOrPseudo){
  const view = resolveCardContentView(cardOrPseudo);
  const field = view.kind === 'multiple_choice' ? view.prompt : view.front;
  return (field && field.pinyinText) || '';
}


// Fase 4 do sistema de alunas particulares (ver CLAUDE.md): rótulos do
// filtro de ORIGEM -- diferente de REVIEW_FILTER_LABELS (que decide COMO
// consumir a fila), este decide DE ONDE vêm os cartões.
// getters: resolvem no idioma do site na hora do uso (o idioma da conta chega depois do load).
const REVIEW_ORIGIN_LABELS = {
  get all(){ return t('review.origin.all'); },
  get study(){ return t('review.origin.study'); },
  get teacher(){ return t('review.origin.teacher'); },
  get self(){ return t('flashcards.origin.selfTitle'); }
};


wireReviewBackToModes(); // shared/core/app-comum.js


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


// renderTopbarStats() agora vem de shared/topbar-stats.js (idêntico nos dois idiomas).

// ============================================================
// TABS / navegação
// ============================================================
// switchTab() vem de shared/tabs.js -- só as partes específicas do chinês
// (parar áudio/timer, o que renderizar em cada aba própria) ficam aqui.
const switchTab = createTabSwitcher({
  onBeforeSwitch(tab){
    stopExerciseAudio();
    if (tab !== 'review'){
      stopSpeedTimer(); // evita timer do Speed Review rodando em background fora da aba
    }
  },
  tabHandlers: {
    hanzi: renderHanziLessonsGrid,
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
  }
});

wireTabsAndSidebar(); // shared/core/app-comum.js


wireReviewSettingsControls(); // shared/core/app-comum.js

// ============================================================
// EXPORTAÇÃO .apkg (motor comum em shared/anki-export.js) — só o que é
// específico do chinês (campos, template, nome do baralho/arquivo) fica aqui.
// Vive na aba "📦 Exportar" de Configurações.
// ============================================================
// modelName/deckDesc/deckName vêm de APP_IDENTITY.apps.zh.name (shared/app-identity.js,
// carregado antes deste arquivo -- ver script tag em index.html) em vez de string fixa,
// pra nunca ficar pra trás se a marca mudar (ver Bloco 6/Fase B6 da tarefa de rebranding).
// guidPrefix NÃO muda: é o identificador de GUID que o Anki usa pra casar notas num
// reimport -- trocar agora faria o Anki tratar decks já exportados por usuários
// existentes como notas novas/duplicadas em vez de atualizar as existentes.
// Fase 7i (ver CLAUDE.md) -- só pro export Anki de "Digite a resposta" em
// zh. Diferente de Normal/Múltipla Escolha (onde zh NUNCA inverte --
// hanzi sempre é o "front"/prompt, checado em várias fases anteriores),
// Digite a resposta não tem essa garantia: o editor nativo (Fase 6D.4b)
// deixa a professora criar prompt/resposta livremente, cada um com seu
// próprio idioma -- então o lado chinês (com pinyin) pode ser QUALQUER
// um dos 2. Detecta isso olhando qual Field resolvido tem `pinyinText`
// (nunca por posição/`role` -- role não decide direção, restrição já
// travada desde a Fase 6B) e monta as 3 colunas (Pinyin/Caractere/
// Tradução) do modelo Básico do zh de acordo, mais qual "lado" (front/
// back, ver resolveCardExportMedia()) carrega a mídia de cada coluna.
function zhTypeAnswerExportColumns(view){
  if (view.prompt && view.prompt.pinyinText){
    return { pinyin: view.prompt.pinyinText, hanzi: view.prompt.text, translation: view.displayAnswerText, hanziSide: 'front', translationSide: 'back' };
  }
  const answerPinyin = (view.answer && view.answer.pinyinText) || '';
  const pinyin = (view.compareAnswerText && view.compareAnswerText !== view.displayAnswerText) ? view.compareAnswerText : answerPinyin;
  return { pinyin, hanzi: view.displayAnswerText, translation: view.prompt.text, hanziSide: 'back', translationSide: 'front' };
}

// Etapa 3 (decisão da dona, 2026-10-19): mesmo esquema de fr/app.js -- nomes
// de campo, do modelo e do arquivo no idioma do site (pt-BR igual a antes).
const ANKI_EXPORT_CONFIG = {
  // nomes dos campos no idioma do site (em pt-BR, os de sempre)
  fieldNames(){
    return { py: 'Pinyin', ch: ankiExportText('ankiExport.field.character', 'Caractere'), tr: ankiExportText('ankiExport.field.translation', 'Tradução') };
  },
  get modelName(){ return ankiExportText('ankiExport.appName.zh', APP_IDENTITY.apps.zh.name, { app: APP_IDENTITY.apps.zh.name }); },
  get fields(){
    const n = this.fieldNames();
    return [
      { name:n.py, ord:0, font:"Arial", size:20 },
      { name:n.ch, ord:1, font:"Arial", size:20 },
      { name:n.tr, ord:2, font:"Arial", size:18 }
    ];
  },
  get qfmt(){ return `<div style='text-align:center;font-size:22px;color:#8E1915;font-weight:bold;'>{{${this.fieldNames().py}}}</div>`; },
  get afmt(){ const n = this.fieldNames(); return `{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:36px;'>{{${n.ch}}}</div><div style='text-align:center;font-size:18px;color:#5C4A3F;'>{{${n.tr}}}</div>`; },
  css: ".card { font-family: 'Nunito', Arial, sans-serif; text-align: center; background-color: #FBF4E8; color:#211714; }",
  get deckDesc(){ return ankiExportText('ankiExport.deckDesc', `Exportado do app ${APP_IDENTITY.apps.zh.name}`, { app: this.modelName }); },
  // K2-F: template do modelo "Reverso" (B da trilha): frente = Tradução,
  // verso = Pinyin + Caractere. Mesmos campos semânticos do Básico.
  get reverseQfmt(){ return `<div style='text-align:center;font-size:22px;color:#5C4A3F;font-weight:bold;'>{{${this.fieldNames().tr}}}</div>`; },
  get reverseAfmt(){ const n = this.fieldNames(); return `{{FrontSide}}<hr id='answer'><div style='text-align:center;font-size:22px;color:#8E1915;font-weight:bold;'>{{${n.py}}}</div><div style='text-align:center;font-size:36px;'>{{${n.ch}}}</div>`; },
  guidPrefix: "mzc_",
  unitOptions(){
    return UNITS.map(u => ({ id: String(u.id), label: `${u.id}. ${u.title}` }));
  },
  deckName(sel){
    return sel === 'all'
      ? `${this.modelName} - HSK 1`
      : `${this.modelName} - ${UNITS.find(u=>String(u.id)===sel).title}`;
  },
  cards(sel){
    // Fase 7i (ver CLAUDE.md) -- `.filter(hasPlainFrontBack)` removido,
    // mesmo raciocínio de fr/app.js: aquele filtro só existia porque
    // `cardPromptText()`/`cardAnswerText()` (compartilhadas com Speed
    // Review/Combinar, nunca tocadas nesta fase) quebram pra cloze/
    // type_answer -- o export ganhou seu próprio caminho de extração de
    // texto pra esses 2 tipos (ver noteFields()/clozeFields() abaixo),
    // então todo tipo já é exportável agora.
    return (sel === 'all' ? STATE.cards : STATE.cards.filter(c => String(c.unitId) === sel));
  },
  // Fase 7i -- `media` já vem resolvido em `[sound:]`/`<img>` prontos
  // (ver collectExportMediaAssets(), shared/anki-export.js). `type_answer`
  // usa zhTypeAnswerExportColumns() (acima) pra decidir dinamicamente
  // qual lado é o chinês (com pinyin) -- diferente de Normal/Múltipla
  // Escolha, aqui não há garantia de direção fixa.
  noteFields(card, media){
    if (card.cardInstance.cardTypeId === 'type_answer'){
      const view = resolveCardContentView(card);
      const cols = zhTypeAnswerExportColumns(view);
      return [
        cols.pinyin,
        ankiFieldHTML(cols.hanzi, media && media[cols.hanziSide]),
        ankiFieldHTML(cols.translation, media && media[cols.translationSide]),
      ];
    }
    return [
      cardPromptPinyinText(card),
      ankiFieldHTML(cardPromptText(card), media && media.front),
      ankiFieldHTML(cardAnswerText(card), media && media.back),
    ];
  },
  // Fase 7i -- cards Cloze (mesmo caminho de fr/app.js -- estrutura
  // genérica, sem coluna de pinyin separada: quando o texto tem um Field
  // de pinyin embutido via `|`, buildAnkiClozeFieldText() já converte
  // isso pro hint nativo do Anki `{{c1::hanzi::pinyin}}`, mostrado no
  // lugar da lacuna antes de revelar).
  // K2-F: B da trilha -- campos SEMÂNTICOS (Pinyin/Caractere/Tradução); a
  // direção vem do template do modelo Reverso. O pinyin acompanha o hanzi
  // (lado "back" do CardInstance); mídia: front = tradução, back = hanzi.
  reverseFields(card, media){
    const v = ankiExportSides(card);
    return [
      v.back.pinyinText || '',
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
    if (ankiExportCardKind(card) === 'reverse'){ const b = ankiExportSides(card).back; return b.pinyinText || b.text; }
    if (card.cardInstance.cardTypeId === 'cloze'){
      const view = resolveCardContentView(card);
      return renderClozeText(view.rawSentenceText, view.markId, { reveal: true });
    }
    if (card.cardInstance.cardTypeId === 'type_answer'){
      const cols = zhTypeAnswerExportColumns(resolveCardContentView(card));
      return cols.pinyin || cols.hanzi;
    }
    return cardPromptPinyinText(card);
  },
  filename(sel){
    return sel === 'all'
      ? ankiExportText('ankiExport.filename.zh.all', 'chines-com-prof-brune-completo.apkg')
      : ankiExportText('ankiExport.filename.zh.unit', `chines-com-prof-brune-unidade-${sel}.apkg`, { n: sel });
  },
};

wireAnkiExport(ANKI_EXPORT_CONFIG);

// ============================================================
// HANZI — trilha de caracteres, estudo (ver→escrever) e teste final
// ============================================================
const HANZI_STUDY_STATE = {
  lessonIndex: null,
  phase: null, // 'char' (ver/escrever intercalado) ou 'test' (teste final misturado)
  charIndex: 0, // dentro da fase 'char': 0-4, cada um passa por 'view' e 'write'
  charSubPhase: 'view', // 'view' ou 'write'
  testQueue: [], // fase 'test': array embaralhado dos 5 (ou menos) caracteres
  testIndex: 0,
  testScore: 0,
  writerInstance: null
};

// ---------- Revisão SRS dedicada de Hanzi (mesmo motor SM-2, fila separada) ----------
// Só considera caracteres de lições já iniciadas (mesma regra usada para
// vocabulário: não traz caracteres de lições nunca abertas).
function startHanziReviewSession(){
  trackEvent('lesson_start', 'hanzi_review', null);
  const pool = STATE.hanziCards.filter(c => {
    const lp = STATE.hanziLessonProgress[c.lessonIndex];
    return lp && (lp.unlocked || lp.completed);
  });

  const due = cardsDueNow(pool);
  let queue = due.slice();
  const fresh = newCards(pool).slice(0, 10);
  fresh.forEach(c => { if (!queue.includes(c)) queue.push(c); });

  STATE.hanziReviewQueue = shuffle(queue);
  STATE.hanziReviewIndex = 0;
  STATE.hanziReviewShowingAnswer = false;
  renderHanziReviewView();
}

function renderHanziReviewView(){
  const el = document.getElementById('hanzi-review-content');

  if (!STATE.hanziReviewQueue.length){
    const pool = STATE.hanziCards.filter(c => {
      const lp = STATE.hanziLessonProgress[c.lessonIndex];
      return lp && (lp.unlocked || lp.completed);
    });
    const allDue = cardsDueNow(pool).length;
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🀄</div>
        <h3>${t('zh.hanzi.allCaughtUp')}</h3>
        <p>${allDue > 0 ? tp('zh.hanzi.pendingChars', allDue === 1 ? 1 : 2, { n: allDue }) : t('zh.hanzi.comeBackLater')}</p>
      </div>
    `;
    return;
  }

  if (STATE.hanziReviewIndex >= STATE.hanziReviewQueue.length){
    registerStudyToday();
    maybeShowStreakCelebration();
    trackEvent('lesson_complete', 'hanzi_review', { count: STATE.hanziReviewQueue.length });
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🎉</div>
        <h3>${t('zh.hanzi.sessionDone')}</h3>
        <p>${tp('zh.hanzi.sessionReviewed', STATE.hanziReviewQueue.length === 1 ? 1 : 2, { n: STATE.hanziReviewQueue.length })}</p>
        <button class="btn btn-primary" id="hanzi-review-again">${t('zh.hanzi.backToLessons')}</button>
      </div>
    `;
    document.getElementById('hanzi-review-again').addEventListener('click', () => {
      renderHanziLessonsGrid();
    });
    renderProgressView();
    return;
  }

  const card = STATE.hanziReviewQueue[STATE.hanziReviewIndex];
  const pct = Math.round((STATE.hanziReviewIndex / STATE.hanziReviewQueue.length) * 100);

  const radicalsHTML = (card.radicals && card.radicals.length)
    ? `<div class="hanzi-radicals">${card.radicals.map(r => `
        <div class="hanzi-radical-chip"><span class="r">${r.r}</span><span class="m">${r.m}</span></div>
      `).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="review-progress">
      <div class="review-progress-bar"><div class="review-progress-fill" style="width:${pct}%"></div></div>
      <div class="review-progress-count">${STATE.hanziReviewIndex+1} / ${STATE.hanziReviewQueue.length}</div>
    </div>
    <div class="flashcard" id="hanzi-flashcard">
      <div class="flashcard-tag">${t('zh.hanzi.lessonTag', { n: card.lessonIndex + 1 })}</div>
      <div class="flashcard-hanzi">${card.char} ${audioBtnHTML(card.char, 'audio-btn-lg')}</div>
      ${STATE.hanziReviewShowingAnswer ? `
        <div class="divider-line"></div>
        <div class="flashcard-pinyin">${card.pinyin}</div>
        <div class="flashcard-trans">${card.meaning}</div>
        ${radicalsHTML}
      ` : `<div class="flashcard-hint">${t('zh.hanzi.tapToReveal')}</div>`}
    </div>
    ${STATE.hanziReviewShowingAnswer ? gradeButtonsHTML(card) : ''}
  `;

  wireAudioButtons(el);
  // No hanzi, o caractere já está visível na frente (diferente do vocabulário,
  // onde o hanzi só aparece no verso) — então tocamos o áudio desde o início,
  // não só ao revelar a resposta.
  if (canSpeakChinese(card.char)){
    speakChinese(card.char, el.querySelector('.audio-btn-lg'), true);
  }

  document.getElementById('hanzi-flashcard').addEventListener('click', () => {
    if (!STATE.hanziReviewShowingAnswer){
      STATE.hanziReviewShowingAnswer = true;
      renderHanziReviewView();
    }
  });

  if (STATE.hanziReviewShowingAnswer){
    el.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        gradeHanziCard(parseInt(btn.dataset.grade));
      });
    });
  }
}

function gradeHanziCard(grade){
  const card = STATE.hanziReviewQueue[STATE.hanziReviewIndex];
  const wasOverdue = card.due > 0 && card.due < new Date().setHours(0, 0, 0, 0);
  const intervalBefore = card.interval;
  // Fase 5: mesmo motor novo do Flashcard de vocabulário.
  applyMemoryGrade(card, grade);
  trackReviewAnswer('hanzi', card, grade);
  STATE.totalReviews += 1;
  // Streak só conta no fim da SESSÃO inteira (ver renderHanziReviewView),
  // mesmo raciocínio do Flashcard de vocabulário.
  if (wasOverdue) registerDailyOverdueReviewCard();
  addXP(reviewXP(intervalBefore, grade));

  if (grade === 0){
    STATE.hanziReviewQueue.push(card);
  }

  STATE.hanziReviewIndex += 1;
  STATE.hanziReviewShowingAnswer = false;
  saveState();
  renderTopbarStats();
  renderHanziReviewView();
}

document.getElementById('hanzi-review-all-btn').addEventListener('click', () => {
  document.getElementById('hanzi-lessons-wrap').style.display = 'none';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'none';
  document.getElementById('hanzi-review-wrap').style.display = 'block';
  startHanziReviewSession();
});

document.getElementById('hanzi-review-back-btn').addEventListener('click', () => {
  document.getElementById('hanzi-review-wrap').style.display = 'none';
  renderHanziLessonsGrid();
});

function recalculateHanziLocks(){
  HANZI_LESSONS.forEach((lesson, i) => {
    const prog = STATE.hanziLessonProgress[i];
    prog.unlocked = i === 0 || STATE.hanziLessonProgress[i-1]?.completed || prog.unlocked;
  });
}

// ---------- Radicais (tela dedicada, consolidando dados já existentes) ----------
// Não é conteúdo novo -- reaproveita os radicais já catalogados em cada
// caractere do hanzi-data.js, só reorganiza numa visão própria por radical,
// ordenada por quantos caracteres já estudados usam cada um.
function buildRadicalsIndex(){
  const radicalMap = {};
  HANZI_ALL.forEach(h => {
    (h.radicals || []).forEach(r => {
      if (!radicalMap[r.r]){
        radicalMap[r.r] = { radical: r.r, meaning: r.m, chars: [] };
      }
      radicalMap[r.r].chars.push(h);
    });
  });
  return Object.values(radicalMap).sort((a, b) => b.chars.length - a.chars.length);
}

function renderRadicalsGrid(){
  const radicals = buildRadicalsIndex();
  const contentEl = document.getElementById('hanzi-radicals-content');

  contentEl.innerHTML = `
    <div class="radicals-grid">
      ${radicals.map((r, i) => `
        <button class="radical-card" data-radical-idx="${i}">
          <div class="r">${r.radical}</div>
          <div class="m">${r.meaning}</div>
          <div class="count-badge">${r.chars.length}</div>
        </button>
      `).join('')}
    </div>
  `;

  contentEl.querySelectorAll('.radical-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.radicalIdx);
      openRadicalDetail(radicals[idx]);
    });
  });
}

function openRadicalDetail(radicalData){
  const contentEl = document.getElementById('hanzi-radicals-content');
  contentEl.innerHTML = `
    <button class="back-link" id="radical-detail-back-btn">${t('zh.hanzi.backToRadicals')}</button>
    <div class="radical-detail-header">
      <div class="r">${radicalData.radical}</div>
      <div class="m">${radicalData.meaning}</div>
    </div>
    <div class="section-label">${tp('zh.hanzi.appearsInCount', radicalData.chars.length === 1 ? 1 : 2, { n: radicalData.chars.length })}</div>
    <div class="radical-chars-grid">
      ${radicalData.chars.map(h => `
        <div class="radical-char-item">
          <div class="char">${h.char}</div>
          <div class="pinyin">${h.pinyin}</div>
          <div class="meaning">${h.meaning}</div>
        </div>
      `).join('')}
    </div>
  `;
  document.getElementById('radical-detail-back-btn').addEventListener('click', renderRadicalsGrid);
}

document.getElementById('hanzi-radicals-btn').addEventListener('click', () => {
  document.getElementById('hanzi-lessons-wrap').style.display = 'none';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'none';
  document.getElementById('hanzi-review-wrap').style.display = 'none';
  document.getElementById('hanzi-radicals-wrap').style.display = 'block';
  renderRadicalsGrid();
});

document.getElementById('hanzi-radicals-back-btn').addEventListener('click', () => {
  document.getElementById('hanzi-radicals-wrap').style.display = 'none';
  renderHanziLessonsGrid();
});

function renderHanziLessonsGrid(){
  recalculateHanziLocks();
  document.getElementById('hanzi-lessons-wrap').style.display = 'block';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'none';

  const countLabel = document.getElementById('hanzi-count-label');
  if (countLabel){
    countLabel.textContent = t('zh.hanzi.countLabel', { chars: HANZI_ALL.length, lessons: HANZI_LESSONS.length });
  }

  const grid = document.getElementById('hanzi-lessons-grid');
  grid.innerHTML = '';

  HANZI_LESSONS.forEach((lesson, i) => {
    const prog = STATE.hanziLessonProgress[i];
    const card = document.createElement('button');
    card.className = 'hanzi-lesson-card' + (!prog.unlocked ? ' locked' : '') + (prog.completed ? ' done' : '');
    const preview = lesson.map(h => h.char).join('');
    card.innerHTML = `
      <div class="hanzi-lesson-num">${prog.completed ? '✓' : i+1}</div>
      <div class="hanzi-lesson-preview">${preview}</div>
      <div class="hanzi-lesson-status">${prog.completed ? t('zh.hanzi.lessonCompleted') : (prog.unlocked ? tp('zh.hanzi.charCount', lesson.length === 1 ? 1 : 2, { n: lesson.length }) : '🔒')}</div>
    `;
    if (prog.unlocked){
      card.addEventListener('click', () => openHanziLesson(i));
    }
    grid.appendChild(card);
  });
}

document.getElementById('hanzi-back-to-lessons').addEventListener('click', () => {
  stopExerciseAudio();
  renderHanziLessonsGrid();
});

function openHanziLesson(lessonIndex){
  trackEvent('lesson_start', 'hanzi_lesson', { lessonIndex });
  HANZI_STUDY_STATE.lessonIndex = lessonIndex;
  HANZI_STUDY_STATE.phase = 'char';
  HANZI_STUDY_STATE.charIndex = 0;
  HANZI_STUDY_STATE.charSubPhase = 'view';
  HANZI_STUDY_STATE.testQueue = [];
  HANZI_STUDY_STATE.testIndex = 0;
  HANZI_STUDY_STATE.testScore = 0;

  document.getElementById('hanzi-lessons-wrap').style.display = 'none';
  document.getElementById('hanzi-lesson-study-wrap').style.display = 'block';

  renderHanziStudyStep();
}

function currentHanziLesson(){
  return HANZI_LESSONS[HANZI_STUDY_STATE.lessonIndex];
}

// Busca automática: em quais palavras/frases do banco de conteúdo (todas as
// 14 unidades) esse caractere aparece. Não exige nenhum conteúdo novo — só
// varre o que já existe em UNITS.
function findHanziAppearances(char, limit){
  const results = [];
  UNITS.forEach(u => {
    (u.vocab || []).forEach(v => {
      if (v.c.includes(char) && !results.some(r => r.c === v.c)){
        results.push({ p: v.p, c: v.c, t: v.t });
      }
    });
    (u.phrases || []).forEach(p => {
      if (p.c.includes(char) && !results.some(r => r.c === p.c)){
        results.push({ p: p.p, c: p.c, t: p.t });
      }
    });
  });
  return results.slice(0, limit || 4);
}

function renderHanziProgress(){
  const lesson = currentHanziLesson();
  const fillEl = document.getElementById('hanzi-progress-fill');
  const labelEl = document.getElementById('hanzi-progress-label');

  if (HANZI_STUDY_STATE.phase === 'char'){
    const pct = (HANZI_STUDY_STATE.charIndex / lesson.length) * 60; // fase 'char' ocupa até 60% da barra
    fillEl.style.width = `${pct}%`;
    labelEl.textContent = t('zh.hanzi.charOf', { i: HANZI_STUDY_STATE.charIndex + 1, n: lesson.length });
  } else {
    const pct = 60 + (HANZI_STUDY_STATE.testIndex / HANZI_STUDY_STATE.testQueue.length) * 40;
    fillEl.style.width = `${pct}%`;
    labelEl.textContent = t('zh.hanzi.finalTest', { i: HANZI_STUDY_STATE.testIndex + 1, n: HANZI_STUDY_STATE.testQueue.length });
  }
}

function renderHanziStudyStep(){
  stopExerciseAudio();
  const lesson = currentHanziLesson();
  const contentEl = document.getElementById('hanzi-study-content');
  const nextBtn = document.getElementById('hanzi-next-btn');

  renderHanziProgress();

  if (HANZI_STUDY_STATE.phase === 'char'){
    const char = lesson[HANZI_STUDY_STATE.charIndex];
    if (HANZI_STUDY_STATE.charSubPhase === 'view'){
      renderHanziViewCard(char, contentEl, nextBtn);
    } else {
      renderHanziWriteCard(char, contentEl, nextBtn);
    }
  } else {
    renderHanziTestStep(contentEl, nextBtn);
  }
}

// ---------- Sub-fase: Ver o caractere ----------
function renderHanziViewCard(char, contentEl, nextBtn){
  const appearances = findHanziAppearances(char.char);
  const radicalsHTML = char.radicals.length
    ? `<div class="hanzi-radicals">${char.radicals.map(r => `
        <div class="hanzi-radical-chip"><span class="r">${r.r}</span><span class="m">${r.m}</span></div>
      `).join('')}</div>`
    : '';

  const appearancesHTML = appearances.length
    ? `<div class="hanzi-appears-in">
        <div class="hanzi-appears-in-label">${t('zh.hanzi.appearsIn')}</div>
        ${appearances.map(a => `
          <div class="hanzi-appears-item">
            <span class="hanzi">${a.c}</span>
            <span class="pinyin">${a.p}</span>
            <span class="trans">— ${a.t}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  contentEl.innerHTML = `
    <div class="hanzi-study-card">
      <div class="hanzi-study-phase-label">${t('zh.hanzi.seeChar')}</div>
      <div class="hanzi-big-char">${char.char} ${audioBtnHTML(char.char)}</div>
      <div class="hanzi-big-pinyin">${char.pinyin}</div>
      <div class="hanzi-big-meaning">${char.meaning}</div>
      ${radicalsHTML}
      ${appearancesHTML}
    </div>
  `;
  wireAudioButtons(contentEl);

  // Áudio automático do caractere ao entrar na tela — só no passo "Ver",
  // não se repete no passo "Escrever" (decisão explícita: evitar repetição
  // desnecessária durante o desenho, que já tem seu próprio foco).
  if (canSpeakChinese(char.char)){
    speakChinese(char.char, contentEl.querySelector('.audio-btn'), true);
  }

  nextBtn.textContent = t('zh.hanzi.nowWriteArrow');
  nextBtn.style.display = 'flex';
  nextBtn.onclick = () => {
    HANZI_STUDY_STATE.charSubPhase = 'write';
    renderHanziStudyStep();
  };
}

// ---------- Sub-fase: Escrever o caractere (Hanzi Writer, modo quiz) ----------
function renderHanziWriteCard(char, contentEl, nextBtn){
  contentEl.innerHTML = `
    <div class="hanzi-study-card">
      <div class="hanzi-study-phase-label">${t('zh.hanzi.write', { pinyin: char.pinyin, meaning: char.meaning })}</div>
      <div class="hanzi-write-target" id="hanzi-write-target"></div>
      <div class="hanzi-write-feedback" id="hanzi-write-feedback"></div>
      <div class="hanzi-write-actions">
        <button class="btn btn-secondary" id="hanzi-write-reset-btn">${t('zh.hanzi.restart')}</button>
      </div>
      <p class="hanzi-write-hint-note">${t('zh.hanzi.writeHintNote')}</p>
    </div>
  `;
  nextBtn.style.display = 'none'; // avança automaticamente ao completar o desenho

  if (typeof HanziWriter === 'undefined'){
    document.getElementById('hanzi-write-target').innerHTML =
      `<p class="stroke-unavailable">${t('zh.hanzi.writerNotLoaded')}</p>`;
    // Sem o recurso, permite seguir em frente mesmo assim pra não travar o app.
    nextBtn.style.display = 'flex';
    nextBtn.textContent = t('common.continueArrow');
    nextBtn.onclick = () => advanceHanziAfterWrite();
    return;
  }

  const feedbackEl = document.getElementById('hanzi-write-feedback');

  const writer = HanziWriter.create('hanzi-write-target', char.char, {
    width: 220,
    height: 220,
    padding: 14,
    showOutline: true,
    strokeColor: '#8E1915',
    outlineColor: '#E2CFA6',
    drawingWidth: 26,
    drawingColor: '#3A7359',
    highlightColor: '#D4A017'
  });
  HANZI_STUDY_STATE.writerInstance = writer;

  // showHintAfterMisses: comportamento NATIVO do Hanzi Writer — depois de
  // errar o mesmo traço esse número de vezes, ele mesmo destaca o traço
  // certo automaticamente. Não existe um método público para acionar isso
  // manualmente sob demanda, então essa é a forma correta de dar "dica".
  function startQuiz(){
    writer.quiz({
      showHintAfterMisses: 2,
      onCorrectStroke: () => {
        feedbackEl.textContent = '';
        feedbackEl.className = 'hanzi-write-feedback';
      },
      onMistake: (strokeData) => {
        feedbackEl.textContent = strokeData.mistakesOnStroke >= 2
          ? t('zh.hanzi.strokeHighlighted')
          : t('zh.hanzi.strokeWrong');
        feedbackEl.className = 'hanzi-write-feedback retry';
      },
      onComplete: () => {
        feedbackEl.textContent = t('zh.hanzi.writeDone');
        feedbackEl.className = 'hanzi-write-feedback ok';
        if (!hanziLessonAlreadyCompleted()) addXP(HANZI_WRITE_XP); // lição já concluída não paga de novo
        setTimeout(() => advanceHanziAfterWrite(), 900);
      }
    });
  }

  startQuiz();

  document.getElementById('hanzi-write-reset-btn').addEventListener('click', () => {
    feedbackEl.textContent = '';
    feedbackEl.className = 'hanzi-write-feedback';
    writer.cancelQuiz();
    writer.hideCharacter();
    startQuiz();
  });
}

function advanceHanziAfterWrite(){
  const lesson = currentHanziLesson();
  if (HANZI_STUDY_STATE.charIndex < lesson.length - 1){
    HANZI_STUDY_STATE.charIndex += 1;
    HANZI_STUDY_STATE.charSubPhase = 'view';
    renderHanziStudyStep();
  } else {
    // todos os caracteres vistos+escritos: monta o teste final embaralhado
    HANZI_STUDY_STATE.phase = 'test';
    HANZI_STUDY_STATE.testQueue = shuffle(lesson.map((c, i) => ({ char: c, options: buildHanziTestOptions(c, lesson) })));
    HANZI_STUDY_STATE.testIndex = 0;
    HANZI_STUDY_STATE.testScore = 0;
    renderHanziStudyStep();
  }
}

function buildHanziTestOptions(char, lesson){
  // Distratores: prioriza os outros caracteres da própria lição; se não houver
  // suficientes (lições menores que 5), completa com caracteres aleatórios do
  // banco geral de Hanzi.
  let pool = lesson.filter(c => c !== char);
  if (pool.length < 3){
    const extra = shuffle(HANZI_ALL.filter(c => c !== char && !pool.includes(c))).slice(0, 3 - pool.length);
    pool = pool.concat(extra);
  }
  const distractors = shuffle(pool).slice(0, 3);
  return shuffle([char, ...distractors]);
}

function renderHanziTestStep(contentEl, nextBtn){
  const total = HANZI_STUDY_STATE.testQueue.length;

  if (HANZI_STUDY_STATE.testIndex >= total){
    maybeShowStreakCelebration();
    const pct = Math.round((HANZI_STUDY_STATE.testScore / total) * 100);
    contentEl.innerHTML = `
      <div class="exercise-result">
        <div class="big-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
        <h3>${t('zh.path.lessonDone.lessonTitle')}</h3>
        <div class="score-num">${HANZI_STUDY_STATE.testScore}/${total}</div>
        <p>${pct >= 70 ? t('zh.hanzi.retentionGood') : t('zh.hanzi.retentionReview')}</p>
      </div>
    `;
    nextBtn.textContent = t('zh.hanzi.backToLessons');
    nextBtn.style.display = 'flex';
    nextBtn.onclick = () => {
      markHanziLessonCompleted(HANZI_STUDY_STATE.lessonIndex);
      renderHanziLessonsGrid();
    };
    return;
  }

  const item = HANZI_STUDY_STATE.testQueue[HANZI_STUDY_STATE.testIndex];
  nextBtn.style.display = 'none';

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="hanzi-test-counter">${t('zh.hanzi.lessonTest', { i: HANZI_STUDY_STATE.testIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${t('zh.exercise.whatMeans')}</div>
      <div class="exercise-prompt">
        <div class="prompt-hanzi">${item.char.char}</div>
        <div class="prompt-pinyin">${item.char.pinyin}</div>
      </div>
      <div class="exercise-options">
        ${item.options.map((opt, i) => `<button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.meaning}</div></button>`).join('')}
      </div>
    </div>
  `;

  contentEl.querySelectorAll('.exercise-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenIdx = parseInt(btn.dataset.idx);
      const isCorrect = item.options[chosenIdx] === item.char;
      contentEl.querySelectorAll('.exercise-option').forEach((b, i) => {
        b.classList.add('disabled');
        if (item.options[i] === item.char) b.classList.add('correct');
        else if (i === chosenIdx) b.classList.add('incorrect');
      });
      if (isCorrect){
        HANZI_STUDY_STATE.testScore += 1;
        if (!hanziLessonAlreadyCompleted()) addXP(HANZI_TEST_XP); // lição já concluída não paga de novo
      }
      // Streak conta só ao terminar a LIÇÃO de Hanzi inteira (ver
      // markHanziLessonCompleted), não a cada pergunta isolada do teste.
      setTimeout(() => {
        HANZI_STUDY_STATE.testIndex += 1;
        renderHanziStudyStep();
      }, 900);
    });
  });
}

// Refazer uma lição de hanzi já concluída é permitido, mas não paga XP (escrita e teste).
function hanziLessonAlreadyCompleted(){
  return !!STATE.hanziLessonProgress[HANZI_STUDY_STATE.lessonIndex]?.completed;
}

function markHanziLessonCompleted(lessonIndex){
  if (STATE.hanziLessonProgress[lessonIndex].completed) return;
  STATE.hanziLessonProgress[lessonIndex].completed = true;
  trackEvent('lesson_complete', 'hanzi_lesson', { lessonIndex });
  if (lessonIndex + 1 < HANZI_LESSONS.length){
    STATE.hanziLessonProgress[lessonIndex + 1].unlocked = true;
  }
  addXP(LESSON_CLOSE_XP);
  registerStudyToday();
  registerDailyHanziLesson();
  showToast(t('zh.toast.hanziLessonDone'));
  saveState();
  renderTopbarStats();
}

// ============================================================
// INIT
// ============================================================
initAuth();
