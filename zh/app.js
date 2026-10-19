/* ============================================================
   Chinês com Prof. Brune — lógica do app
   - Estado persistido em memória (sessão) + localStorage indisponível
     em artifacts, então usamos window.storage se existir, senão
     memória pura (variável global) para a sessão atual.
   - SRS: algoritmo SM-2 (o mesmo usado pelo Anki clássico)
   - Exportação: gera .apkg real via sql.js + JSZip
   - Áudio: Text-to-Speech via Web Speech API (voz zh-CN do navegador)
   ============================================================ */

// Registro do service worker agora vem de shared/pwa.js.

// ---------- Text-to-Speech (mandarim) ----------
// Navegadores baseados em Chromium (incluindo Opera) têm alguns bugs conhecidos
// com a Web Speech API: getVoices() pode retornar vazio por mais tempo do que
// no Chrome puro, o evento onvoiceschanged nem sempre dispara, e o synthesis
// engine pode "engasgar" sem warm-up na primeira chamada. As estratégias abaixo
// cobrem esses casos.
const TTS = {
  supported: 'speechSynthesis' in window,
  voice: null,
  voicesLoaded: false,
  warmedUp: false,
  pollAttempts: 0
};


function loadChineseVoice(){
  if (!TTS.supported) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return false;
  // Prioriza vozes zh-CN, depois qualquer zh-*; dentro de cada grupo, a de melhor qualidade.
  const exact = voices.filter(v => v.lang === 'zh-CN').sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  const anyZh = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('zh')).sort((a,b) => voiceQualityScore(b) - voiceQualityScore(a));
  TTS.voice = exact[0] || anyZh[0] || null;
  TTS.voicesLoaded = true;
  return !!TTS.voice;
}


if (TTS.supported){
  loadChineseVoice();
  window.speechSynthesis.onvoiceschanged = loadChineseVoice;
  pollForVoices();
}

document.addEventListener('click', warmUpTTSOnce, { once:true });
document.addEventListener('touchstart', warmUpTTSOnce, { once:true });

// Verdadeiro se dá pra tocar esse texto — seja por mp3 pré-gerado, seja pela
// Web Speech API do navegador. Usado nos autoplay antes de chamar
// speakChinese(), pra não depender só de TTS.voice (agora quase sempre
// desnecessário, já que a maioria do conteúdo tem áudio pré-gerado).
function canSpeakChinese(text){
  return (typeof AUDIO_MANIFEST !== 'undefined' && !!AUDIO_MANIFEST[text]) || !!TTS.voice;
}

// ---------- Ciclo de vida do áudio de exercício ----------
// Cada chamada de playPregeneratedAudio/speakChinese criava um novo player
// (Audio ou SpeechSynthesisUtterance) sem nunca parar o anterior -- ao
// avançar de exercício rápido, o áudio antigo continuava tocando em
// segundo plano ao mesmo tempo que o novo, sobrepondo os dois. Rastreia o
// player de áudio pré-gerado atualmente ativo (mesmo padrão já usado nos
// ditados do francês) e para ele -- e qualquer fala em andamento via Web
// Speech API -- sempre que um novo áudio de exercício vai começar OU o
// exercício/tela que o iniciou deixa de estar ativo (trocar de exercício,
// responder, avançar, sair da lição, trocar de aba etc.).
let exerciseAudioEl = null;

// Último botão de áudio que de fato tocou algo (clique manual OU autoplay --
// ambos passam por playPregeneratedAudio/speakChinese com btnEl) -- é o que
// o atalho "r" repete. Não precisa de lógica própria de "expiração": ao
// trocar de tela, o botão antigo é removido do DOM (innerHTML novo), então
// LAST_AUDIO_BTN.isConnected já vira false sozinho.
let LAST_AUDIO_BTN = null;


// ---------- Som curto de acerto/erro (feedback por exercício) ----------
// Sintetizado via Web Audio API -- sem arquivo de áudio externo pra baixar/
// hospedar, e sem disputar com o player de pronúncia acima (Audio/Speech
// Synthesis são players diferentes; um "ding" de ~200ms não precisa de
// stopExerciseAudio()). Silenciável em Preferências (Seu progresso).
const FEEDBACK_SOUND_KEY = 'mandarim_feedback_sound';

let feedbackAudioCtx = null;


// Fase 7d (ver CLAUDE.md) -- reprodução PURA de áudio (mp3 pré-gerado ou
// Web Speech API), sem o efeito colateral de analytics (registerAudioPlay).
// Extraída de dentro do que era o corpo de speakChinese() -- byte a byte o
// mesmo código de sempre, só sem a chamada a registerAudioPlay() no topo.
// speakChinese() (Review real, qualquer tela) chama registerAudioPlay() e
// delega pra cá; playAudioPreview() (Preview do editor, Fase 6D.7) chama só
// isto, nunca registerAudioPlay() -- ver os dois logo abaixo.
function speakChineseAudioOnly(text, btnEl, isAutoplay){
  const pregenFile = typeof AUDIO_MANIFEST !== 'undefined' && AUDIO_MANIFEST[text];
  if (pregenFile){
    playPregeneratedAudio(pregenFile, btnEl, isAutoplay);
    return;
  }

  if (!TTS.supported){
    showToast(t('toast.audioUnsupported'));
    return;
  }

  // Tenta recarregar a voz na hora, caso o polling ainda não tenha pego
  // (cobre o caso de clique muito rápido após o carregamento da página).
  if (!TTS.voice){
    loadChineseVoice();
  }

  if (!TTS.voice){
    showToast(t('zh.toast.chineseVoiceMissing'));
    return;
  }

  // Bug conhecido em navegadores Chromium: o synthesis engine às vezes fica
  // "pausado" internamente sem motivo aparente. Forçar resume() antes de
  // falar evita boa parte dos casos de "clica mas não sai som".
  stopExerciseAudio();
  window.speechSynthesis.resume();

  const buildUtterance = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.voice = TTS.voice;
    u.rate = 0.85; // um pouco mais devagar, melhor pra quem está aprendendo
    u.pitch = 1;
    u.volume = 1;
    return u;
  };

  const utter = buildUtterance();

  if (btnEl){ btnEl.classList.add('speaking'); LAST_AUDIO_BTN = btnEl; }

  let didStart = false;
  utter.onstart = () => { didStart = true; };
  utter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
  utter.onerror = () => {
    if (btnEl) btnEl.classList.remove('speaking');
    showToast(t('toast.audioPlayFailed'));
  };

  window.speechSynthesis.speak(utter);

  // Watchdog: se depois de 800ms o evento "onstart" nunca disparou, é sinal
  // de que o engine engasgou silenciosamente (padrão visto no Opera). Tenta
  // uma segunda vez com um utterance novo antes de desistir — reutilizar o
  // mesmo objeto numa nova chamada de speak() é ignorado por alguns engines.
  setTimeout(() => {
    if (!didStart){
      stopExerciseAudio();
      window.speechSynthesis.resume();

      const retryUtter = buildUtterance();
      let retryStarted = false;
      retryUtter.onstart = () => { retryStarted = true; };
      retryUtter.onend = () => { if (btnEl) btnEl.classList.remove('speaking'); };
      retryUtter.onerror = () => {
        if (btnEl) btnEl.classList.remove('speaking');
      };

      window.speechSynthesis.speak(retryUtter);

      // Se nem a retentativa funcionar, aí sim avisamos e paramos de tentar.
      setTimeout(() => {
        if (!retryStarted){
          if (btnEl) btnEl.classList.remove('speaking');
          showToast(t('zh.toast.operaAudioFailed'));
        }
      }, 800);
    }
  }, 800);
}

function speakChinese(text, btnEl, isAutoplay){
  registerAudioPlay();
  speakChineseAudioOnly(text, btnEl, isAutoplay);
}


// Bug conhecido do Chromium/Opera: o speechSynthesis pode "adormecer" se
// ficar muitos segundos sem uso, mesmo fora de uma fala ativa. Um resume()
// periódico e leve evita que o próximo clique de áudio saia mudo.
if (TTS.supported){
  setInterval(() => {
    if (!window.speechSynthesis.speaking){
      window.speechSynthesis.resume();
    }
  }, 10000);
}


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

// ---------- Taxonomia de "notas de realidade" (sociolinguística) ----------
// Grilling 2026-09-17 (mesma decisão espelhada de fr/app.js): proposta de
// mostrar contraste "forma ensinada vs forma real" (registro, gíria,
// variação regional, desvio gramatical coloquial). NENHUMA nota de
// realidade foi escrita ainda e este bloco não está wireado em lugar
// nenhum do motor -- é só a taxonomia + as regras de nível travadas em
// código agora, pra não precisar redescobrir esse raciocínio quando o
// conteúdo além de HSK1 existir. Hoje só o nível inicial (HSK1) tem
// conteúdo real (`level: "HSK1"` é o valor de verdade usado em
// zh/content.js, confirmado antes de escrever isto -- as chaves abaixo
// usam a MESMA nomenclatura HSK, não A1/A2/B1/B2 do francês, porque
// copiar a chave "A1" aqui sem checar seria exatamente o tipo de erro que
// motivou esta sessão de grilling no primeiro lugar, ver bug de tom do
// pinyin corrigido mais cedo). HSK2/HSK3/HSK4 abaixo são propositalmente
// hipotéticos, sem nenhuma unidade pra validar contra.
//
// Quatro categorias fechadas (não usar string livre -- consistência de
// badge/cor na UI quando isso for implementado). Mesmas 4 categorias do
// francês -- a taxonomia é a mesma nos dois idiomas, só os exemplos mudam:
const REALITY_NOTE_CATEGORY = {
  // Registro cotidiano "ainda reconhecível como a mesma forma, só mais
  // casual" -- ex: 早上好 (zǎoshang hǎo) ensinado, 早 (zǎo) sozinho no dia a
  // dia entre pessoas que já se conhecem.
  INFORMAL: 'informal',
  // Registro marcado/familiar -- termos de tratamento afetivos/de gíria
  // entre amigos próximos, mais marcados socialmente que "informal" simples.
  // Exige mais cuidado que a categoria acima (CLAUDE.md: badge/cor
  // DIFERENTE de "informal", nunca a mesma).
  FAMILIAR_GIRIA: 'familiar-giria',
  // Variação lexical por lugar/comunidade, SEM forma "oficial" -- China
  // continental vs. Taiwan vs. Singapura têm vocabulário cotidiano
  // diferente pra vários conceitos comuns. Shape de dado diferente das
  // outras 3 categorias: usa `variants: [{region, form, pinyin}, ...]`
  // (2+ opções igualmente corretas, cada uma com o lugar onde é ouvida),
  // nunca um par learned/everyday -- nenhuma forma é "a ensinada" e a
  // outra "a real".
  REGIONAL: 'regional',
  // Desvio GRAMATICAL real (não só léxico/registro) que já é aceito como
  // correto na fala. Mesmo espírito do francês ("Je sais pas" por "Je ne
  // sais pas") -- ainda sem um exemplo confirmado em mandarim padrão
  // levantado nesta sessão (não inventar um sem confirmar antes de usar
  // em conteúdo de verdade). Diferença importante das outras 3: esta
  // categoria pode eventualmente ATRAVESSAR pra dentro da correção de
  // exercícios comuns (não só um card passivo) -- se o aluno digitar a
  // forma coloquial num exercício normal de digitar, o ideal é aceitar
  // como correta MAS mostrar a forma padrão ao lado (mesmo espírito do
  // status "quase"/"almost" já usado na correção do francês). NÃO
  // IMPLEMENTADO AINDA -- exige decidir onde a nota mora por item e
  // alterar as funções de finish()/painel de feedback dos exercícios
  // digitados. Fica registrado aqui como o próximo ponto de decisão
  // explícito antes de tocar em qualquer lógica de correção de verdade.
  GRAMATICA_COLOQUIAL: 'gramatica-coloquial',
};

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


// Texto do banner (topo do cartão) quando um concept é uma nota de
// realidade (concept.kind === 'reality') em vez de gramática comum --
// renderConceptStep() escolhe entre isto e o banner padrão de gramática.
// Sem cor/badge própria por categoria ainda (piloto usa só texto+emoji pra
// diferenciar -- ver CLAUDE.md, seção da camada de notas de realidade, "MVP
// = card passivo"); se familiar-giria vira conteúdo de verdade algum dia,
// dar a ela uma cor própria vira obrigatório (mesma regra já registrada
// sobre --on-vivid vs --on-seal-red -- não reaproveitar o badge de
// 'informal' pra um registro mais marcado).
const REALITY_NOTE_BANNER_TEXT = {
  // Getters (i18n): avaliados a cada leitura, não congelados no load.
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
// Cartões guardam cópia do texto exibido; só o texto muda (id/FSRS intactos).
// Também roda depois de carregar o progresso salvo (traz o texto do idioma em
// que foi salvo).
function refreshStudyCardTexts(){
  STATE.cards.forEach((c) => {
    if (c.origin !== 'study') return;
    const u = UNITS.find((x) => x.id === c.unitId);
    // Cartão "Na frase": só a etiqueta muda com o idioma do site.
    if (u && c.vocabIdx == null && c.gateVocabIdx != null){ c.unitTitle = studyPhraseCardTitle(u.title); return; }
    if (!u || !u.vocab || !u.vocab[c.vocabIdx]) return;
    // Palavra diferente no slot (país do aluno etc.): o progresso segue a palavra,
    // não a posição (shared/card-variants.js).
    CardVariants.swapCardWordProgress(c, c.back_hanzi, u.vocab[c.vocabIdx].c, STATE.cardVariants);
    c.front_pinyin = u.vocab[c.vocabIdx].p; c.back_hanzi = u.vocab[c.vocabIdx].c; // o overlay `src` pode localizar a palavra estudada
    c.back_trans = u.vocab[c.vocabIdx].t;
    c.unitTitle = u.title;
  });
  // Por posição (id h<lição>-c<índice>): o overlay pode trocar o caractere do
  // slot (巴 -> 美 no inglês), então casar por caractere não serve.
  STATE.hanziCards.forEach((c) => {
    const m = /^h(\d+)-c(\d+)$/.exec(c.id);
    const h = m && HANZI_LESSONS[+m[1]] && HANZI_LESSONS[+m[1]][+m[2]];
    if (h){ CardVariants.swapCardWordProgress(c, c.char, h.char, STATE.cardVariants); c.char = h.char; c.pinyin = h.pinyin; c.meaning = h.meaning; c.radicals = h.radicals; }
  });
}
window.addEventListener('i18n:change', () => { CONTENT_I18N.sync(); });
CONTENT_I18N.sync();

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

// Item extra do menu "Mais" (só mobile, ver .mais-extra-tab) -- 汉字 não
// cabe nos 4 botões fixos da barra inferior, então vive aqui.
document.getElementById('mais-hanzi-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  switchTab('hanzi');
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
// avatar e ganhou um botão de verdade no topo da tela de Revisão
// (#review-my-flashcards-btn, wired mais abaixo).


// Entrada geral da bandeira ⚑ (menu "Mais"/usuário) -- sem contexto de
// exercício específico, captureReportContext() ainda pega unidade/lição
// atual se o clique acontecer em modo foco.
document.getElementById('report-menu-btn').addEventListener('click', () => {
  document.getElementById('user-menu-dropdown').classList.remove('open');
  openReportModal({ source: 'menu' });
});

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

// Resumo de progresso pro Perfil (shared/profile.js). Diferente do
// francês, o chinês ainda não tem levelCompleted/unitsOfLevel (só existe 1
// nível, HSK1, então nunca precisou de seletor de nível) -- calcula direto
// contra UNITS filtrado por level. Mesmo formato de retorno em ambos os
// idiomas ({ levelId, levelLabel, pct }), só a implementação muda. Também
// é gravado dentro de serializeState() pra o Perfil mostrar este idioma
// enquanto a pessoa está no site do francês, sem carregar este content.js.
function computeProgressSummary(){
  const level = LEVELS[0];
  const units = UNITS.filter(u => u.level === level.id);
  const done = units.filter(u => STATE.unitProgress[u.id]?.completed).length;
  const pct = units.length ? Math.round((done / units.length) * 100) : 0;
  return { levelId: level.id, levelLabel: level.label, pct };
}

function serializeState(){
  return {
    cards: serializeCardsForSave(STATE.cards),
    hanziCards: STATE.hanziCards,
    cardVariants: STATE.cardVariants,
    unitProgress: STATE.unitProgress,
    xp: STATE.xp,
    streak: STATE.streak,
    lastStudyDay: STATE.lastStudyDay,
    lastReviewReminderDay: STATE.lastReviewReminderDay,
    activityLog: STATE.activityLog,
    reviewRecords: STATE.reviewRecords,
    reviewTimeStats: STATE.reviewTimeStats,
    studyGoal: STATE.studyGoal,
    studySettings: STATE.studySettings,
    dailyMinutesLog: STATE.dailyMinutesLog,
    dailyLessonsLog: STATE.dailyLessonsLog,
    hanziLessonProgress: STATE.hanziLessonProgress,
    totalReviews: STATE.totalReviews,
    hadStreakComeback: STATE.hadStreakComeback,
    totalAudioPlays: STATE.totalAudioPlays,
    everUsedSpeedReview: STATE.everUsedSpeedReview,
    everUsedMatchGame: STATE.everUsedMatchGame,
    modesUsed: STATE.modesUsed,
    periodXp: STATE.periodXp,
    daily: STATE.daily,
    storyProgress: STATE.storyProgress,
    // Só leitura pro Perfil (ver computeProgressSummary) -- nunca restaurado
    // de volta em applySerializedState, é recalculado a cada save.
    progressSummary: computeProgressSummary()
  };
}

function applySerializedState(data){
  if (!data) return;
  if (data.cards) {
    // K2-C: cards da trilha só recebem a whitelist de progresso; ver
    // mergeSavedCards (shared/study-trail-model.js).
    mergeSavedCards(STATE.cards, data.cards);
  }
  // Hanzi: só o progresso volta (o texto vem da camada do curso); ver mergeSavedHanziCards.
  if (Array.isArray(data.hanziCards)) mergeSavedHanziCards(STATE.hanziCards, data.hanziCards);
  if (data.cardVariants) STATE.cardVariants = CardVariants.normalizeCardVariants(data.cardVariants);
  // Fase 3 (reestruturação do motor de memória): migração SM2->FSRS,
  // idempotente (migrateCardToFSRS só age se `stability` ainda não existe).
  // Roda pra TODO cartão, vindo de save antigo ou recém-criado, garantindo
  // que os campos FSRS sempre existam a partir daqui.
  STATE.cards.forEach(migrateCardToFSRS);
  STATE.hanziCards.forEach(migrateCardToFSRS);
  if (typeof refreshStudyCardTexts === 'function') refreshStudyCardTexts();
  if (data.unitProgress) {
    Object.assign(STATE.unitProgress, data.unitProgress);
    // Saves de antes das lições (Modelo B) não têm lessonIdx/lessonMisses --
    // sem isso, um progresso salvo antigo sobrescreveria os defaults com
    // `undefined`, quebrando freshAcquisitionState pra quem já tinha conta.
    Object.values(STATE.unitProgress).forEach(p => {
      if (typeof p.lessonIdx !== 'number') p.lessonIdx = 0;
      if (!p.lessonMisses) p.lessonMisses = {};
    });
  }
  if (typeof data.xp === 'number') STATE.xp = data.xp;
  if (typeof data.streak === 'number') STATE.streak = data.streak;
  if (data.lastStudyDay) STATE.lastStudyDay = data.lastStudyDay;
  if (data.lastReviewReminderDay) STATE.lastReviewReminderDay = data.lastReviewReminderDay;
  if (data.studyGoal) Object.assign(STATE.studyGoal, data.studyGoal);
  if (data.studySettings) Object.assign(STATE.studySettings, data.studySettings);
  if (data.dailyMinutesLog) Object.assign(STATE.dailyMinutesLog, data.dailyMinutesLog);
  if (data.dailyLessonsLog) Object.assign(STATE.dailyLessonsLog, data.dailyLessonsLog);
  if (data.activityLog) Object.assign(STATE.activityLog, data.activityLog);
  if (data.reviewRecords && typeof data.reviewRecords === 'object') STATE.reviewRecords = Object.assign({ speedBestScore: 0, speedBestStreak: 0, matchBestMs: null, hardSeenIds: [] }, data.reviewRecords);
  if (data.reviewTimeStats && typeof data.reviewTimeStats === 'object') STATE.reviewTimeStats = { cards: Number(data.reviewTimeStats.cards) || 0, ms: Number(data.reviewTimeStats.ms) || 0 };
  if (data.hanziLessonProgress) Object.assign(STATE.hanziLessonProgress, data.hanziLessonProgress);
  if (typeof data.totalReviews === 'number') STATE.totalReviews = data.totalReviews;
  if (data.hadStreakComeback) STATE.hadStreakComeback = true;
  if (typeof data.totalAudioPlays === 'number') STATE.totalAudioPlays = data.totalAudioPlays;
  if (data.everUsedSpeedReview) STATE.everUsedSpeedReview = true;
  if (data.everUsedMatchGame) STATE.everUsedMatchGame = true;
  if (data.modesUsed && typeof data.modesUsed === 'object') Object.assign(STATE.modesUsed, data.modesUsed);
  if (data.periodXp) Object.assign(STATE.periodXp, data.periodXp);
  if (data.daily) Object.assign(STATE.daily, data.daily);
  if (data.storyProgress) Object.assign(STATE.storyProgress, data.storyProgress);
}

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


// ---------- Lembrete de revisão acumulada (estilo Busuu) ----------
// Pop-up não bloqueante no rodapé, avisando que há palavras vistas em lições
// mas nunca revisadas se acumulando. Aparece no máximo uma vez por dia, só
// quando o total de cartões pendentes passa de um limiar — pra não incomodar
// quem já revisa em dia.
const REVIEW_REMINDER_THRESHOLD = 15;


document.getElementById('review-reminder-dismiss-btn').addEventListener('click', () => {
  document.getElementById('review-reminder-banner').style.display = 'none';
});

document.getElementById('review-reminder-cta-btn').addEventListener('click', () => {
  document.getElementById('review-reminder-banner').style.display = 'none';
  switchTab('review');
  openReviewSession('flashcard');
});


function registerDailyLessonCompleted(scorePct){
  ensureDailyBucket();
  STATE.daily.lessons += 1;
  if (scorePct >= 80) STATE.daily.highScoreLessons += 1;
  if (scorePct >= 100) STATE.daily.perfectLessons += 1;
}

function registerDailyHanziLesson(){
  ensureDailyBucket();
  STATE.daily.hanziLessons += 1;
}

const EASY_CHALLENGES = [
  { id:'streak', icon:'🔥', get label(){ return t('fr.mission.streak'); }, target:1, get: () => STATE.lastStudyDay === todayStr() ? 1 : 0 },
  { id:'firstLesson', icon:'🌅', get label(){ return t('fr.mission.firstLesson'); }, target:1, get: d => d.lessons }
];
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


// ---------- Feasibility das missões de estoque limitado (grilling "missões
// do dia") ----------
// Só reviews15/overdue3/matchGame1/speedReview1 dependem de um estoque real
// (cartas pra revisar) que pode não existir -- as demais (lições, XP,
// hanzi...) não têm teto real no dia de hoje, ficam de fora desta checagem.
const MISSION_QUANTITY_FLOOR = 3; // abaixo disso, trata como inviável (rodada 2)


const ALL_CHALLENGE_POOLS = [EASY_CHALLENGES, REVISAO_HANZI_CHALLENGES, GENERAL_CHALLENGES];


// showToast agora vem de shared/toast.js.

// Conquistas com níveis (docs/conquistas-proposta-niveis.md): BADGES é preenchido por rebuildTrackBadges()
// (shared/badge-tracks-app.js) a partir do catálogo shared/badge-tracks.js e das métricas abaixo.
const BADGES = [];

// Modos de estudo que contam para a trilha Explorar (chinês não tem Ditado nem Desafios).
const BADGE_MODES = ['review', 'speed', 'match', 'hanzi', 'stories'];
function badgeModesUsedCount(s){
  const used = Object.assign({}, s.modesUsed || {});
  if (s.totalReviews > 0) used.review = true;
  if (s.everUsedSpeedReview) used.speed = true;
  if (s.everUsedMatchGame) used.match = true;
  if (Object.values(s.hanziLessonProgress || {}).some(p => p && p.completed)) used.hanzi = true;
  if (Object.values(s.storyProgress || {}).some(p => p && p.completed)) used.stories = true;
  return BADGE_MODES.filter(k => used[k]).length;
}
// Métricas das trilhas neste site (chinês). Unidade concluída de qualquer jeito conta para o nível.
function collectBadgeMetrics(s){
  const level = 'HSK1';
  const units = UNITS.filter(u => u.level === level);
  const cpUnits = units.filter(u => (u.lessons || []).some(l => l.isCheckpoint));
  const checkpointsAced = cpUnits.filter(u => s.unitProgress[u.id]?.checkpointAced).length;
  const words = studyTrailWordProgress(s.cards);
  return {
    studyDays: Object.keys(s.activityLog || {}).filter(k => s.activityLog[k] > 0).length,
    reviews: s.totalReviews || 0, streak: s.streak || 0, xp: s.xp || 0,
    courseDone: units.filter(u => s.unitProgress[u.id]?.completed).length, courseTotal: units.length,
    courseAced: cpUnits.length > 0 && checkpointsAced >= cpUnits.length,
    audioPlays: s.totalAudioPlays || 0, modesUsed: badgeModesUsedCount(s), modesTotal: BADGE_MODES.length,
    weekends: countStudyWeekends(s.activityLog), wordsLearned: words.learned, wordsTotal: words.total,
    checkpointsAced, checkpointsTotal: cpUnits.length,
    dictationsAced: null, challengesDone: null, challengesTotal: 0,
    comeback: !!s.hadStreakComeback, levelLabel: 'HSK 1'
  };
}

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


// Trilha de um grupo só (sem níveis/módulos visíveis ainda).
function trailGroups(){
  return [UNITS];
}


// Ícones temáticos por unidade — substituem o número na trilha, dando
// reconhecimento visual imediato do assunto de cada unidade.
const UNIT_ICONS = {
  1: '👋', 2: '🙋', 3: '🔢', 4: '👨‍👩‍👧', 5: '🍜',
  6: '⏰', 7: '🗺️', 8: '🛍️', 9: '⛅', 10: '🚇',
  11: '🩺', 12: '🎨', 13: '🗓️', 14: '⚖️', 15: '🎬',
  16: '📅', 17: '✅', 18: '❓'
};

// ---------- Busca: todo o vocabulário do app, com indicação de unidade concluída ----------
// Mostra tudo -- inclusive vocabulário de unidades ainda não estudadas --
// com uma tag indicando o status, pra poder ir direto estudar o que falta.
function buildSearchIndex(){
  recalculateUnlockedUnits();
  const index = [];
  UNITS.forEach(u => {
    u.vocab.forEach(v => {
      index.push({
        pinyin: v.p, hanzi: v.c, trans: v.t,
        unitId: u.id, unitTitle: u.title, source: 'vocab',
        completed: !!STATE.unitProgress[u.id]?.completed
      });
    });
    // Frases-modelo e diálogo também entram no índice -- algumas palavras
    // (principalmente gramaticais, como 很/吗/了) só aparecem em frases,
    // nunca como entrada isolada de vocabulário.
    u.phrases.forEach(p => {
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
function isAdminUser(){
  return !!(typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.email === ADMIN_EMAIL);
}


// Lembra se o aluno abriu/fechou manualmente o bloco de uma unidade nesta
// sessão (não é salvo -- é só estado de UI). Sem entrada aqui, o bloco usa o
// padrão: concluída/bloqueada começam compactas, a unidade atual começa
// expandida.
const UNIT_BLOCK_EXPAND_OVERRIDE = {};


function buildUnitBlock(u){
  const state = unitBlockState(u);
  const unlocked = state !== 'locked';
  const isFinished = state === 'done' || state === 'skipped';
  // Só unidades com 2+ lições (Modelo B) ganham a lista expansível -- uma
  // unidade do motor antigo não tem lições reais pra mostrar (ver "Hierarquia
  // da Trilha", seção 11), então vira uma linha só, sem seta.
  const hasLessons = isLessonUnit(u) && u.lessons.length > 1;
  const { dueForReview } = unitCardCounts(u.id);

  const defaultExpanded = state === 'current';
  const expanded = hasLessons && (
    UNIT_BLOCK_EXPAND_OVERRIDE[u.id] !== undefined ? UNIT_BLOCK_EXPAND_OVERRIDE[u.id] : defaultExpanded
  );

  const pct = Math.round(unitProgressFraction(u) * 100);
  let fracLabel;
  if (hasLessons){
    const doneLessons = isFinished ? u.lessons.length : currentLessonIdx(u.id);
    fracLabel = tp('trail.unit.lessonsProgress', u.lessons.length === 1 ? 1 : 2, { done: doneLessons, total: u.lessons.length });
  } else fracLabel = `${pct}%`;
  if (dueForReview > 0) fracLabel += ` · 🔁 ${dueForReview}`;

  const block = document.createElement('div');
  block.className = 'unit-block'
    + (state === 'locked' ? ' locked' : '')
    + (state === 'done' ? ' done' : '')
    + (state === 'skipped' ? ' skipped' : '')
    + (state === 'current' ? ' current' : '')
    + (state === 'available' ? ' available' : '')
    + (expanded ? ' expanded' : '');
  if (state === 'current') block.setAttribute('aria-current', 'step');

  const badgeHTML = state === 'done' ? `<span class="ub-badge">✓</span>`
    : state === 'skipped' ? `<span class="ub-badge ub-badge-skipped" title="${t('trail.unit.skippedTitle')}">⏭ 跳过</span>` : '';
  const chevronHTML = hasLessons ? `<button class="ub-chevron" type="button" aria-label="${t('zh.path.unit.expandLessons')}">▾</button>` : '';
  // Só lições JÁ concluídas (e que não são o Ponto de verificação, cujo
  // reteste tem efeitos colaterais bem mais pesados -- desbloqueio de
  // módulo/nível -- fora do escopo desta revisão leve) ficam clicáveis pra
  // reabrir em modo revisão (ver openLessonReview). "current" já abre
  // normal pelo cabeçalho da unidade; "locked" fica inerte.
  const lessonsHTML = hasLessons ? `
    <div class="ub-lessons" style="${expanded ? '' : 'display:none;'}">
      ${u.lessons.map((l, i) => {
        const st = lessonRowState(u, i);
        // Bypass de admin (ver comentário de isAdminUser acima) só se
        // aplica com Admin Mode ON -- OFF cai exatamente na mesma regra
        // usada por qualquer aluno (unlocked && já concluída), sem
        // segunda implementação (Fase 11 da spec de Admin Mode).
        // A lição atual (a próxima a fazer) abre de verdade pelo próprio título e
        // conta progresso, igual a clicar no cabeçalho da unidade (2026-10-07).
        const opensForReal = unlocked && st === 'current';
        const clickable = opensForReal || (isAdminUser() && isAdminModeOn()) || (unlocked && (st === 'done' || st === 'skipped') && !l.isCheckpoint);
        return `
          <div class="ub-lesson-row ${st}${clickable ? ' clickable' : ''}" ${clickable ? `data-lesson-idx="${i}"${opensForReal ? ' data-lesson-open="1"' : ''} role="button" tabindex="0"` : ''}>
            <div class="ub-lesson-dot ${st}">${st === 'done' ? '✓' : (st === 'skipped' ? '•' : i + 1)}</div>
            <div class="ub-lesson-title">${l.title}</div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">${UNIT_ICONS[u.id] || '📖'}</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">${u.title}</span>${badgeHTML}</div>
        ${u.goal ? `<div class="ub-goal">${u.goal}</div>` : ''}
      </div>
      <div class="ub-frac">${fracLabel}</div>
      ${chevronHTML}
    </div>
    ${lessonsHTML}
  `;

  wireHeaderActivation(block.querySelector('.ub-header'), (e) => {
    if (e.target.closest('.ub-chevron')) return;
    if (unlocked) openUnitDetail(u.id);
  });
  const chevron = block.querySelector('.ub-chevron');
  if (chevron){
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      UNIT_BLOCK_EXPAND_OVERRIDE[u.id] = !expanded;
      renderUnitsGrid();
    });
  }
  block.querySelectorAll('.ub-lesson-row.clickable').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(row.dataset.lessonIdx, 10);
      if (row.dataset.lessonOpen) openUnitDetail(u.id);
      else openLessonReview(u.id, idx);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); row.click(); }
    });
  });
  return block;
}

// Estado (recolhida/expandida) da faixa de Desafios de hoje -- lembrado
// entre sessões, mesmo padrão de STATE.dailyMinutesLog etc: preferência de
// interface, não progresso, então localStorage puro (nunca precisa
// sincronizar entre dispositivos).
const CHALLENGES_STRIP_COLLAPSE_KEY = 'mandarim_challenges_collapsed';


// ---------- Fase 7 da trilha: modo Mapa ----------
// DOM/seleção/painel em shared/trail-map.js; aqui só o modelo (estados reais) e o que cada botão faz.
const TRAIL_VIEW_KEY = 'mandarim_trail_view';

function mapUnitDescribe(u, moduleId){
  const st = unitBlockState(u);
  const hasLessons = isLessonUnit(u) && u.lessons.length > 0;
  const lines = [];
  if (hasLessons){
    const done = (st === 'done' || st === 'skipped') ? u.lessons.length : currentLessonIdx(u.id);
    lines.push(tp('trail.lessonsCompleted', u.lessons.length === 1 ? 1 : 2, { done, total: u.lessons.length }));
  }
  const { dueForReview } = unitCardCounts(u.id);
  if (dueForReview > 0) lines.push(t('trail.map.unit.toReview', { n: dueForReview }));
  const actions = [];
  if (st === 'locked'){
    lines.push(t('trail.map.unit.lockedHint'));
    if (moduleId && trailSkipAllowed()) actions.push({ label: t('trail.map.unit.skipCta'), primary: false, onClick: () => openCheckpoint(moduleId) });
    else if (moduleId) lines.push(t('trail.checkpoint.skipLocked'));
  } else if (st === 'done' || st === 'skipped'){
    actions.push({ label: t('trail.map.unit.openAgain'), primary: false, onClick: () => openUnitDetail(u.id) });
  } else {
    const started = !!(STATE.unitProgress[u.id] && STATE.unitProgress[u.id].started);
    actions.push({ label: started ? t('common.continue') : t('common.start'), primary: true, onClick: () => openUnitDetail(u.id) });
  }
  return { eyebrow: unitTypeOf(u) === 'grammar' ? t('trail.eyebrow.grammar') : t('trail.map.unit.eyebrow'), title: u.title, status: TRAIL_MAP_STATE_LABEL[st], goal: u.goal || '', lines, actions };
}

function renderTrailMapView(container){
  const nodes = [];
  UNITS.forEach(u => {
    const st = unitBlockState(u);
    nodes.push({ key: 'u:' + u.id, kind: 'unit', icon: UNIT_ICONS[u.id] || '📖', label: u.title, state: st, current: st === 'current',
      aria: `${u.title}, ${TRAIL_MAP_STATE_LABEL[st]}` });
    // Histórias-checkpoint: mesmo marco que a Trilha mostra logo após a unidade.
    const story = STORIES.find(s => s.afterUnit === u.id);
    if (story){
      const unlocked = !!STATE.unitProgress[u.id]?.completed;
      const done = !!STATE.storyProgress?.[story.id]?.completed;
      const sst = done ? 'done' : (unlocked ? 'available' : 'locked');
      nodes.push({ key: 's:' + story.id, kind: 'story', icon: story.icon, label: story.title, state: sst,
        aria: t('trail.map.aria.story', { title: story.title, state: TRAIL_MAP_STATE_LABEL[sst] }) });
    }
  });
  const describe = (key) => {
    if (key.startsWith('s:')){
      const story = STORIES.find(s => String(s.id) === key.slice(2));
      const unlocked = !!STATE.unitProgress[story.afterUnit]?.completed;
      const done = !!STATE.storyProgress?.[story.id]?.completed;
      return { eyebrow: t('trail.map.story.eyebrow'), title: story.title, status: TRAIL_MAP_STATE_LABEL[done ? 'done' : (unlocked ? 'available' : 'locked')], goal: story.subtitle || '',
        lines: unlocked ? [] : [t('trail.map.story.lockedHint')],
        actions: unlocked ? [{ label: done ? t('trail.map.story.readAgain') : t('trail.map.story.read'), primary: !done, onClick: () => openStory(story.id) }] : [] };
    }
    return mapUnitDescribe(UNITS.find(u => String(u.id) === key.slice(2)), null);
  };
  renderTrailMap(container, { sections: [{ title: t('trail.map.unitsSection'), nodes }] }, describe);
}


function renderUnitsGrid(){
  recalculateUnlockedUnits();
  renderDailyGoalChip();
  renderDailyChallengesStrip();
  renderSideRankingCard();
  // "Tratamento de honra" (Opção D): nível concluído reaproveita o mesmo
  // selo de check, só que dourado -- ZH não tem seletor de nível (só existe
  // HSK1 hoje), então o selo mora fixo no <h2> estático da trilha.
  const levelBadge = document.getElementById('level-done-badge');
  if (levelBadge) levelBadge.style.display = UNITS.every(u => STATE.unitProgress[u.id]?.completed) ? '' : 'none';
  const grid = document.getElementById('units-grid');
  grid.innerHTML = '';
  grid.appendChild(buildTrailViewToggle(TRAIL_VIEW_KEY, () => renderUnitsGrid()));
  grid.appendChild(buildTrailContinueCard());
  if (trailViewPref(TRAIL_VIEW_KEY) === 'map'){
    const mapRoot = document.createElement('div');
    mapRoot.style.gridColumn = '1 / -1';
    grid.appendChild(mapRoot);
    renderTrailMapView(mapRoot);
    return;
  }
  UNITS.forEach((u) => {
    const prog = STATE.unitProgress[u.id];
    grid.appendChild(buildUnitBlock(u));

    // Checkpoint de história: aparece logo após a unidade que a desbloqueia,
    // como um marco na trilha, não mais uma unidade comum.
    const story = STORIES.find(s => s.afterUnit === u.id);
    if (story){
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
      grid.appendChild(storyCard);
    }
  });
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
        if (isCorrect) addXP(5);

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
    addXP(20);
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
// Getters (i18n): o rótulo é resolvido a cada leitura, não congelado no load.
const STEP_DEFS = [
  { key: 'vocab', get label() { return t('fr.step.vocab'); } },
  { key: 'dialogue', get label() { return t('fr.step.dialogue'); } },
  { key: 'dialogueCheck', get label() { return t('lesson.step.dialogueCheck'); } },
  { key: 'usage', get label() { return t('fr.step.usage'); } },
  { key: 'exercises', get label() { return t('fr.step.exercises'); } }
];

// Unidades migradas pra explicação contextual (`unit.concepts`, ver
// content.js) não têm mais `usageNote` -- a teoria dele já foi incorporada
// como cartões de conceito dentro do próprio ciclo de aquisição/diálogo, não
// como um passo à parte no fim. Sem esse filtro, essas unidades mostrariam
// um passo "Dica de uso" vazio. Unidades ainda não migradas continuam com o
// passo normalmente (mesmo comportamento de antes).
function currentStepDefs(u){
  if (isLessonUnit(u)){
    const lesson = currentLesson(u);
    if (lesson.isCheckpoint) return [{ key: 'checkpointExercises', label: t('trail.checkpoint.title') }];
    const steps = [];
    if (lesson.vocabIdx && lesson.vocabIdx.length) steps.push({ key: 'vocab', label: t('fr.step.vocab') });
    if (lesson.includesDialogue){
      steps.push({ key: 'dialogue', label: t('fr.step.dialogue') });
      if (u.dialogue && Array.isArray(u.dialogue.check) && u.dialogue.check.length) steps.push({ key: 'dialogueCheck', label: t('lesson.step.dialogueCheck') });
    }
    return steps;
  }
  return STEP_DEFS.filter(s => (s.key !== 'usage' || (u && u.usageNote)) && (s.key !== 'dialogueCheck' || (u && u.dialogue && Array.isArray(u.dialogue.check) && u.dialogue.check.length)));
}

// ---------- Sessão de aquisição de vocabulário (introdução + prática intercalada) ----------
// Substitui o antigo fluxo linear "Palavra 1 de N ... Palavra N de N" seguido
// de um bag único de exercícios no final. Em vez disso, a unidade é dividida
// em pequenos blocos de palavras novas; cada bloco passa por
// introdução -> checagem imediata -> prática, e a partir do segundo bloco
// os exercícios de prática misturam o bloco atual com todos os anteriores
// (recuperação ativa, não repetição na ordem em que acabou de ver). O passo
// final da unidade ("exercises") vira uma consolidação curta, priorizando
// as palavras que o aluno errou mais durante a sessão em vez de repetir a
// unidade inteira de novo -- ver buildExerciseSet(). Referência conceitual:
// a separação do Memrise entre "aquisição" e "prática/revisão intercalada"
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
  onChallengesScreen: false,
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

function openUnitDetail(unitId){
  STATE.currentUnitId = unitId;
  STATE.unitProgress[unitId].started = true;
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onLessonBoundaryScreen = null;
  STEP_STATE.onUnitCompleteScreen = false;
  STEP_STATE.conceptQueue = [];
  STEP_STATE.conceptsShown = new Set();
  STEP_STATE.comboCount = 0;
  // Invalida o estado de aquisição antigo -- sem isso, reabrir a MESMA
  // unidade numa lição diferente da última vez reaproveitaria os blocos da
  // lição errada (a checagem em renderStep só recalcula quando unitId ou
  // lessonIdx mudam; abrir de novo do zero é o gatilho mais simples e seguro).
  STEP_STATE.acq = { unitId: null, blocks: [], blockIdx: 0, phase: 'intro', introIdx: 0, wordMisses: {}, introduced: {}, lessonScore: { correct: 0, total: 0 }, xpAtLessonStart: STATE.xp };
  STEP_STATE.exerciseUnitId = null;
  STEP_STATE.checkpointUnitId = null;
  STEP_STATE.checkpointXpAtStart = null;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';

  const u = UNITS.find(x => x.id === unitId);
  document.getElementById('ud-eyebrow').textContent = t('zh.path.unit.eyebrow', { id: u.id, total: UNITS.length });
  document.getElementById('ud-title').textContent = u.title;
  document.getElementById('ud-goal').textContent = u.goal;
  const langNotice = document.getElementById('ud-lang-notice');
  if (langNotice){
    const untranslated = !CONTENT_I18N.isUnitTranslated(u.id);
    langNotice.hidden = !untranslated;
    langNotice.textContent = untranslated ? t('content.untranslatedNotice') : '';
  }

  STEP_STATE.currentStep = 0;
  renderStep();

  saveState();
  renderTopbarStats();

  if (typeof routerNavigate === 'function') routerNavigate({ type: 'unit', unitId });
}


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

// ============================================================
// MANUAL DE APOIO (resumo por unidade + aba geral)
// ============================================================

// Gera o HTML de resumo de uma unidade (vocabulário + frases + diálogo,
// sem exercícios) — usado no modal "Manual da unidade" (📖 dentro do painel
// de dicas de cada lição).
function renderUnitSummaryHTML(u){
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


function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepDefs = currentStepDefs(u);
  const stepCount = stepDefs.length;
  const stepKey = stepDefs[STEP_STATE.currentStep].key;

  let intraStepFraction = 0;
  if (stepKey === 'vocab' && u && STEP_STATE.acq.unitId === u.id){
    // Progresso pelo NÚMERO DE PALAVRAS já cobertas (blocos inteiros já
    // concluídos + posição dentro do bloco/fase atual) -- mas, dentro da
    // fase atual, evolui exercício a exercício (mesmo dado do contador
    // "Exercício X de Y"), não pula direto pro fim da fase ao entrar nela.
    const acq = STEP_STATE.acq;
    // Em unidades com lições (Modelo B), a barra reflete o progresso DENTRO
    // da lição atual (cada lição já é sua própria mini-sessão, com sua
    // própria tela de conclusão) -- não da unidade inteira, que é como o
    // motor antigo de blocos calculava.
    const totalWords = (isLessonUnit(u) ? (acq.blocks[0] || []).length : u.vocab.length) || 1;
    const wordsBeforeBlock = acq.blocks.slice(0, acq.blockIdx).flat().length;
    const curBlockSize = (acq.blocks[acq.blockIdx] || []).length;

    const seq = acqPhaseSequence(u, acq);
    const phaseIdx = seq.indexOf(acq.phase);
    const [rangeStart, rangeEnd] = phaseIdx >= 0 ? [phaseIdx / seq.length, (phaseIdx + 1) / seq.length] : [0, 1];
    const phaseFraction = acq.phase === 'intro'
      ? (curBlockSize ? acq.introIdx / curBlockSize : 0)
      : (STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0);
    const withinBlock = rangeStart + (rangeEnd - rangeStart) * phaseFraction;

    intraStepFraction = Math.min(1, (wordsBeforeBlock + curBlockSize * withinBlock) / totalWords);
  } else if (stepKey === 'exercises' || stepKey === 'checkpointExercises'){
    intraStepFraction = STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0;
  }

  const pct = ((STEP_STATE.currentStep + intraStepFraction) / stepCount) * 100;
  fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}


// Regra pedagógica: a dica ajuda a PENSAR (contexto, estratégia, função
// comunicativa), nunca entrega uma característica formal da resposta (letra
// inicial, número de letras/palavras, posição, terminação...) que permita
// deduzi-la mecanicamente -- por isso nenhum ramo abaixo usa .length, index
// de caractere ou "começa com".
function buildExerciseHint(ex, unit){
  if (ex.format === 'meaning' || ex.format === 'listen' || ex.format === 'type'){
    const item = ex.item;
    const phrase = findMatchingPhrase(item, unit);
    if (phrase){
      const masked = maskWordInText(phrase.c, item.c) || phrase.c;
      return t('zh.hint.thinkWhenUse', { masked });
    }
    if (ex.format === 'type'){
      return t('zh.hint.listenAgain');
    }
    return t('zh.hint.thinkContext', { title: unit.title });
  }
  if (ex.format === 'reorder'){
    if (ex.mode === 'translate') return t('fr.hint.reorderTranslate');
    return t('zh.hint.reorder');
  }
  if (ex.format === 'fullsentence'){
    return t('zh.hint.fullsentence');
  }
  if (ex.format === 'cloze'){
    return t('zh.hint.cloze');
  }
  if (ex.format === 'trueFalse'){
    return unit.usageNote
      ? t('zh.hint.trueFalseUsage', { title: unit.usageNote.title })
      : t('zh.hint.trueFalseDefault');
  }
  return null;
}


// ---------- Vocabulário palavra-por-palavra (estilo Memrise) ----------
// Mostra uma palavra de cada vez, junto da frase-modelo que a usa (quando
// existe uma correspondência direta no banco de conteúdo) — em vez da lista
// completa de uma vez, e sem depender de um passo "Frases" separado.
// Procura um exemplo real de uso da palavra — nas frases da unidade, depois
// nas falas do diálogo (mesmo formato {p, c, t}) e, se ainda não achar, nas
// unidades anteriores já vistas. Aumenta bastante a cobertura sem inventar
// frase nova nenhuma, só reaproveitando conteúdo que já existe no curso, e
// nunca usa vocabulário que o aluno ainda não viu.
function findMatchingPhrase(word, unit){
  const sourcesOf = u2 => [...(u2.phrases || []), ...((u2.dialogue && u2.dialogue.lines) || [])];

  const inUnit = sourcesOf(unit).find(p => p.c.includes(word.c));
  if (inUnit) return inUnit;

  const unitIdx = UNITS.findIndex(u2 => u2.id === unit.id);
  for (let i = 0; i < unitIdx; i++){
    const match = sourcesOf(UNITS[i]).find(p => p.c.includes(word.c));
    if (match) return match;
  }
  return null;
}

// Cartão de introdução de UMA palavra do bloco atual (ETAPA 1). Mesmo
// conteúdo/recursos de antes (pinyin, hanzi, áudio, tradução, "Já sei?",
// frase de exemplo) -- só a posição mudou: em vez de "Palavra X de N" (a
// unidade inteira), mostra a posição dentro do pequeno bloco atual, pra não
// virar a narrativa principal da experiência ("estou vendo uma sequência
// enorme") e comunicar em vez disso "estou aprendendo este grupinho agora".
function renderBlockIntroCard(u, contentEl, nextBtn){
  const acq = STEP_STATE.acq;
  const block = acq.blocks[acq.blockIdx];
  const posInBlock = acq.introIdx;
  const idx = block[posInBlock];
  const v = u.vocab[idx];
  const cardId = studyWordCardId(u, idx); // chave estável do item (shared/study-trail-model.js)
  const card = STATE.cards.find(c => c.id === cardId);
  const alreadyKnown = studyWordHasEvidence(studyWordCardsFor(STATE.cards, u.id, idx)); // K2-E: nível de palavra
  const matchingPhrase = findMatchingPhrase(v, u);
  acq.introduced[idx] = true;

  const phraseHTML = matchingPhrase ? `
    <div class="vocab-phrase-example">
      <div class="vocab-phrase-label">${t('fr.blockIntro.inPhrase')}</div>
      <div class="vocab-phrase-pinyin">${matchingPhrase.p}</div>
      <div class="vocab-phrase-hanzi">${matchingPhrase.c} ${audioBtnHTML(matchingPhrase.c)}</div>
      <div class="vocab-phrase-trans">${matchingPhrase.t}</div>
    </div>
  ` : '';

  contentEl.innerHTML = `
    <div class="vocab-card-counter" role="img" aria-label="${t('lesson.vocabDots.aria', { pos: posInBlock + 1, total: block.length })}">${block.map((_, i) => `<span class="vc-dot${i <= posInBlock ? ' on' : ''}"></span>`).join('')}</div>
    <div class="vocab-card">
      <div class="vocab-card-pinyin">${v.p}</div>
      <div class="vocab-card-hanzi">${v.c} ${audioBtnHTML(v.c)} ${strokeBtnHTML(v.c)}</div>
      <div class="vocab-card-trans">${v.t}</div>
      <button class="know-btn ${alreadyKnown ? 'known' : ''}" data-card-id="${cardId}" title="${t('fr.blockIntro.markKnownTitle')}">
        ${alreadyKnown ? t('zh.path.knownDone') : t('zh.path.knownAsk')}
      </button>
    </div>
    ${phraseHTML}
  `;

  wireAudioButtons(contentEl);
  wireStrokeButtons(contentEl);
  wireKnowButtons(contentEl);

  // Áudio automático da palavra principal — toca ao entrar na tela e também
  // toda vez que avança pra próxima palavra (não toca o áudio da frase-exemplo,
  // só o da palavra em foco).
  if (canSpeakChinese(v.c)){
    const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
    speakChinese(v.c, mainAudioBtn, true);
  }

  nextBtn.style.display = 'flex';
  nextBtn.textContent = posInBlock < block.length - 1 ? t('zh.path.nextWordArrow') : t('zh.path.seeWhatLearnedArrow');
}


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


// Fecha a lição/unidade atual. Unidades sem `lessons` (motor antigo) e a
// última lição (isCheckpoint) de uma unidade migrada caem no fluxo de
// SEMPRE: marca a unidade concluída e mostra os desafios de hoje. Uma
// lição intermediária de uma unidade migrada, em vez disso, só avança
// lessonIdx, persiste, e mostra a tela leve de "Lição concluída" (que
// decide, com base em cardsDueNow, se leva direto pro Flashcard).
function finishCurrentLesson(u){
  // Revisão de uma lição já concluída: nenhum XP de lição/desafio/meta
  // diária deve contar de novo -- só sai de volta pra Trilha, limpando a
  // flag de revisão (ver STEP_STATE.lessonReview).
  if (STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === u.id){
    STEP_STATE.lessonReview = null;
    exitToPath();
    return;
  }
  if (isLessonUnit(u) && !currentLesson(u).isCheckpoint){
    const finished = currentLesson(u);
    // Congela o progresso dos desafios de hoje ANTES das atualizações abaixo,
    // pra depois (renderLessonCompleteScreen) conseguir mostrar um chip
    // contextual só quando ESSA lição específica fez algum desafio avançar
    // -- não uma lista genérica dos 3 desafios do dia (essa já tem tela
    // própria, acessível pela aba "Desafios").
    const challengesBefore = todaysChallenges().map(c => Math.min(c.get(STATE.daily), c.target));
    const lessonKey = `${u.id}:${currentLessonIdx(u.id)}`;
    STATE.unitProgress[u.id].lessonIdx = currentLessonIdx(u.id) + 1;
    addXP(8);
    // Terminar esta lição intermediária já conta como "estudei hoje" pro
    // streak -- antes só o Ponto de verificação (fim da unidade inteira)
    // contava, deixando quem completa 1-2 lições de uma unidade grande sem
    // crédito nenhum no dia.
    registerStudyToday();
    // Nota real da lição: acerto/total acumulado das fases avaliadas
    // (checkpoint + practice/mixed, ver advanceAcquisitionPhase) -- antes
    // isso vinha sempre undefined ("lição intermediária não tem nota"), o
    // que deixava desafios como "Pontue mais de 80% em N lições" quase
    // impossíveis de bater num dia normal (só um Ponto de verificação de
    // fim de unidade contava). Sem exercício avaliado nesta lição
    // (raríssimo, mas por garantia) cai pra undefined, mesmo comportamento
    // de antes.
    const ls = STEP_STATE.acq.lessonScore;
    const lessonScorePct = ls && ls.total ? Math.round((ls.correct / ls.total) * 100) : undefined;
    registerDailyLessonCompleted(lessonScorePct);
    trackEvent('lesson_complete', 'vocab_lesson', { unitId: u.id, lessonIdx: currentLessonIdx(u.id) - 1, scorePct: lessonScorePct });
    // Meta diária (§4 do artefato): só conta se a lição tinha conteúdo real
    // (>=3 palavras ou incluía diálogo) -- filtra o atalho degenerado de uma
    // lição minúscula "sobrando" no fim de uma unidade.
    registerDailyLessonForGoal(lessonKey, (finished.vocabIdx?.length || 0) >= 3 || !!finished.includesDialogue);
    saveState();
    renderTopbarStats();
    // XP real da lição (não hardcoded, não estrelas): delta entre o XP
    // atual e o snapshot tirado quando a lição começou (xpAtLessonStart),
    // cobrindo tanto o XP dos exercícios respondidos quanto o +8 de
    // conclusão logo acima -- STATE.xp só muda dentro de addXP() (ver
    // Fase 1), então esse delta é exatamente o que esta lição concedeu.
    const xpEarned = STATE.xp - STEP_STATE.acq.xpAtLessonStart;
    renderLessonCompleteScreen(u, finished, { challengesBefore, xpEarned, scorePct: lessonScorePct });
    return;
  }

  const total = STEP_STATE.exerciseList.length;
  const scorePct = total ? Math.round((STEP_STATE.exerciseScore / total) * 100) : 100;
  // XP real da UNIDADE (Fase 4): snapshot ANTES de markUnitCompleted (que
  // concede os +25 de bônus) -- skipToast:true porque quem chega aqui vai
  // ver a tela própria de "Unidade concluída!" logo abaixo, não o toast
  // genérico (esse continua existindo pra outros caminhos de conclusão que
  // não passam por uma tela, ex. checkUnitCompletion via Flashcard/"Já sei").
  const xpBeforeUnitBonus = STATE.xp;
  // Conquistas (trilha Gabaritou): 100% no ponto de verificação da unidade fica gravado, mesmo refazendo depois.
  if (scorePct >= 100 && STATE.unitProgress[STATE.currentUnitId]) STATE.unitProgress[STATE.currentUnitId].checkpointAced = true;
  markUnitCompleted(STATE.currentUnitId, scorePct, { skipToast: true });
  const unitXpEarned = STATE.xp - xpBeforeUnitBonus;
  // Meta diária (§4 do artefato): mesma régua de "conteúdo real" (>=3 itens)
  // usada na lição intermediária -- o Ponto de verificação/consolidação da
  // unidade sempre qualifica na prática, mas o filtro evita contar uma
  // unidade legado com uma lista de exercícios minúscula.
  registerDailyLessonForGoal(`${u.id}:checkpoint`, total >= 3);
  if (isLessonUnit(u)){
    STATE.unitProgress[u.id].lessonIdx = 0;
    STATE.unitProgress[u.id].lessonMisses = {};
  }
  renderUnitCompleteScreen(u, unitXpEarned);
}


const CONFETTI_COLORS = ['#d64545', '#e3b341', '#2f8f6e', '#3498d6', '#a15fc9'];


function renderStep(){
  stopExerciseAudio();
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepKey = currentStepDefs(u)[STEP_STATE.currentStep].key;
  const contentEl = document.getElementById('step-content');
  const backBtn = document.getElementById('step-back-btn');
  const nextBtn = document.getElementById('step-next-btn');
  hideAcqPhaseBanner();

  renderStepProgress();
  // Durante checkpoint/practice/mixed, o "Voltar" não faz sentido (a
  // navegação é do próprio motor de exercícios, sem histórico pra desfazer)
  // -- só aparece na introdução do bloco, igual ao antigo "recuar palavra a
  // palavra".
  // Na micro-checagem do diálogo não há "Voltar": voltar ao diálogo
  // deixaria copiar as respostas.
  const showBack = stepKey !== 'dialogueCheck' && (STEP_STATE.currentStep > 0
    || (stepKey === 'vocab' && STEP_STATE.acq.phase === 'intro' && (STEP_STATE.acq.blockIdx > 0 || STEP_STATE.acq.introIdx > 0)));
  backBtn.style.display = showBack ? 'inline-flex' : 'none';

  if (stepKey === 'vocab'){
    if (STEP_STATE.acq.unitId !== u.id || (isLessonUnit(u) && STEP_STATE.acq.lessonIdx !== currentLessonIdx(u.id))){
      STEP_STATE.acq = freshAcquisitionState(u.id, u);
    }
    if (STEP_STATE.acq.phase === 'bridge'){
      startBridgeQueue(u);
    } else if (STEP_STATE.acq.phase === 'intro'){
      renderBlockIntroCard(u, contentEl, nextBtn);
    } else {
      // checkpoint / practice / mixed reaproveitam o motor de exercícios
      // (STEP_STATE.exerciseList/exerciseIndex) -- a navegação própria dele
      // controla o avanço, sem o botão global "Continuar".
      const bannerText = acqPhaseBannerText(STEP_STATE.acq.phase);
      if (bannerText) setAcqPhaseBanner(bannerText);
      renderExerciseStep();
      nextBtn.style.display = 'none';
    }

  } else if (stepKey === 'exercises'){
    if (!STEP_STATE.exerciseList.length || STEP_STATE.exerciseUnitId !== u.id){
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseUnitId = u.id;
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      // XP real da tela de conclusão (mesmo raciocínio de xpAtLessonStart
      // em freshAcquisitionState) -- captura antes de qualquer addXP() desta
      // sessão de consolidação.
      STEP_STATE.checkpointXpAtStart = STATE.xp;
    }
    setAcqPhaseBanner(t('zh.path.banner.consolidation'));
    renderExerciseStep();
    nextBtn.style.display = 'none'; // navegação própria do exercício controla o avanço

  } else if (stepKey === 'checkpointExercises'){
    // Lição final de uma unidade migrada (Modelo B) -- "Ponto de
    // verificação". Se o aluno acumulou 3+ palavras erradas ao longo das
    // lições anteriores DESTA unidade, roda primeiro uma "Revisão dos
    // Erros" isolada (✱, ver Redesenho da Granularidade); só depois entra
    // na consolidação normal (que já prioriza quem errou, mas cobre a
    // unidade inteira) -- reaproveita buildExerciseSet sem alteração.
    if (STEP_STATE.checkpointUnitId !== u.id){
      STEP_STATE.checkpointUnitId = u.id;
      STEP_STATE.checkpointMisses = {};
      // XP real da tela de conclusão do checkpoint (mesmo raciocínio de
      // xpAtLessonStart em freshAcquisitionState) -- captura antes da
      // eventual Revisão dos Erros e da consolidação principal, já que as
      // duas juntas compõem a sessão desta "lição" (o Ponto de verificação).
      STEP_STATE.checkpointXpAtStart = STATE.xp;
      const misses = STATE.unitProgress[u.id].lessonMisses || {};
      const missedIdx = Object.keys(misses).map(Number).filter(i => misses[i] >= 1);
      if (missedIdx.length >= 3){
        STEP_STATE.checkpointPhase = 'errors';
        STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, missedIdx);
      } else {
        STEP_STATE.checkpointPhase = 'main';
        STEP_STATE.exerciseList = buildExerciseSet(u);
      }
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
    }
    setAcqPhaseBanner(STEP_STATE.checkpointPhase === 'errors' ? t('zh.path.banner.errorsReview') : t('zh.path.banner.checkpoint'));
    renderExerciseStep();
    nextBtn.style.display = 'none';

  } else if (stepKey === 'dialogue'){
    renderDialogueStep(u, contentEl, nextBtn);

  } else if (stepKey === 'dialogueCheck'){
    renderDialogueCheckStep(u, contentEl, nextBtn);

  } else if (stepKey === 'usage'){
    const note = u.usageNote;
    contentEl.innerHTML = `
      <div class="usage-note">
        <div class="usage-note-title">${note.title} 🤔</div>
        <p class="usage-note-body">${note.body}</p>
      </div>
    `;
    nextBtn.textContent = t('common.continueArrow');
    nextBtn.style.display = 'flex';
  }
}

// ============================================================
// RENDER: Diálogo da lição (balões, áudio em sequência, vocabulário
// destacado e micro-checagem "Você entendeu?") -- mesma experiência do
// francês, com hanzi + pinyin em cada fala.
// ============================================================
// Dados extras de cada diálogo (content.js): `scene` (contexto), `speakers`
// ({<spk>:{n,e}} -- nome e emoji de cada falante) e `check` (3 perguntas).
// Tudo opcional: sem `speakers` cai no próprio `spk`, sem `check` o botão
// Continuar aparece direto. O 1º falante fica à esquerda, o 2º à direita.
const DLG = { run: 0, check: null };
const DLG_AUTOPLAY_KEY = 'dlg_autoplay';


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


function dlgSpeakerSide(dlg, spk){
  const first = dlg.lines[0].spk;
  return spk === first ? 'a' : 'b';
}

function renderDialogueStep(u, contentEl, nextBtn){
  const dlg = u.dialogue;
  const token = ++DLG.run;
  const sp = dlg.speakers || {};
  const who = k => sp[k] || { n: k, e: '' };
  const terms = dlgVocabTerms(u);
  const checks = Array.isArray(dlg.check) ? dlg.check : [];
  DLG.check = { qi: 0, correct: 0 };

  const rowsHTML = dlg.lines.map((l, i) => {
    const side = dlgSpeakerSide(dlg, l.spk);
    const w = who(l.spk);
    return `
      <div class="dlg-row ${side}" data-i="${i}" role="button" tabindex="0" aria-label="${escapeHTML(t('dlg.playFromAria', { name: w.n }))}">
        <div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span></div>
        <div class="dlg-bubble">
          <div class="dlg-py">${dlgHighlightPinyin(l.c, l.p, terms)}</div>
          <div class="dlg-hz">${dlgHighlight(l.c, terms)}<span class="dlg-wave" aria-hidden="true"><i></i><i></i><i></i></span></div>
          <div class="dlg-tr">${escapeHTML(l.t)}</div>
          <button type="button" class="dlg-trbtn" aria-label="${escapeHTML(t('dlg.lineTrAria'))}" aria-pressed="false">🌐</button>
        </div>
      </div>`;
  }).join('');

  contentEl.innerHTML = `
    <div class="section-label">${t('dlg.label')}</div>
    <div class="dlg-title">${escapeHTML(dlg.title)}</div>
    ${dlg.scene ? `<div class="dlg-scene">📍 ${escapeHTML(dlg.scene)}</div>` : ''}
    <div class="dlg-tools">
      <button class="btn btn-secondary dlg-play-btn" id="dlg-play-btn">${t('dlg.playAll')}</button>
      <button class="dlg-chip" id="dlg-auto-btn" aria-pressed="${dlgAutoplayOn()}">${dlgAutoplayOn() ? t('dlg.autoOn') : t('dlg.autoOff')}</button>
    </div>
    <div class="dlg-chat" id="ud-dialogue">${rowsHTML}</div>
    <div class="dlg-float"><button class="dlg-chip dlg-chip-float" id="dlg-trans-btn" aria-pressed="false">${t('dlg.showTr')}</button></div>
    ${terms.length ? `<div class="dlg-legend">${t('dlg.legend')}</div>` : ''}
  `;

  const chat = document.getElementById('ud-dialogue');
  const playBtn = document.getElementById('dlg-play-btn');
  const transBtn = document.getElementById('dlg-trans-btn');
  const autoBtn = document.getElementById('dlg-auto-btn');
  const rows = [...chat.querySelectorAll('.dlg-row')];

  function setPlaying(on){
    chat.classList.toggle('playing', on);
    playBtn.textContent = on ? t('dlg.stop') : t('dlg.playAll');
    if (!on) rows.forEach(r => r.classList.remove('speaking'));
  }
  function setTranslations(on){
    chat.classList.toggle('show-trans', on);
    transBtn.setAttribute('aria-pressed', String(on));
    transBtn.textContent = on ? t('dlg.hideTr') : t('dlg.showTr');
    rows.forEach(r => { r.classList.remove('show-tr'); r.querySelector('.dlg-trbtn')?.setAttribute('aria-pressed', 'false'); });
  }
  function stillHere(){ return token === DLG.run && document.body.contains(chat); }

  async function playFrom(start, viaAutoplay){
    const myRun = ++DLG.run;
    const alive = () => myRun === DLG.run && document.body.contains(chat);
    setPlaying(true);
    for (let i = start; i < dlg.lines.length; i++){
      if (!alive()) return;
      rows.forEach(r => r.classList.toggle('speaking', Number(r.dataset.i) === i));
      rows[i].scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      const res = await dlgPlayLine(dlg.lines[i].c);
      if (!alive()) return;
      if (res === 'blocked'){
        setPlaying(false);
        if (viaAutoplay) showToast(t('dlg.tapToPlayToast'));
        return;
      }
      if (!res){ setPlaying(false); return; }
      if (i < dlg.lines.length - 1) await dlgSleep(380);
    }
    if (!alive()) return;
    setPlaying(false);
    setTranslations(true); // ao fim da conversa completa, as traduções aparecem
  }

  playBtn.addEventListener('click', () => {
    if (chat.classList.contains('playing')){ DLG.run++; stopExerciseAudio(); setPlaying(false); }
    else playFrom(0, false);
  });
  transBtn.addEventListener('click', () => setTranslations(!chat.classList.contains('show-trans')));
  autoBtn.addEventListener('click', () => {
    const on = !dlgAutoplayOn();
    dlgSetAutoplay(on);
    autoBtn.setAttribute('aria-pressed', String(on));
    autoBtn.textContent = on ? t('dlg.autoOn') : t('dlg.autoOff');
  });
  rows.forEach(r => {
    const tb = r.querySelector('.dlg-trbtn');
    if (tb) tb.addEventListener('click', e => {
      e.stopPropagation();   // não toca o áudio: só mostra/esconde a tradução desta fala
      const on = !r.classList.contains('show-tr');
      r.classList.toggle('show-tr', on);
      tb.setAttribute('aria-pressed', String(on));
    });
    const go = () => playFrom(Number(r.dataset.i), false);
    r.addEventListener('click', go);
    r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); } });
  });
  chat.querySelectorAll('.dlg-new').forEach(w => w.addEventListener('click', e => {
    e.stopPropagation();
    if (w.dataset.tr) showToast(`${w.dataset.w}${w.dataset.py ? ' (' + w.dataset.py + ')' : ''} = ${w.dataset.tr}`);
  }));

  // A micro-checagem é um passo à parte (dialogueCheck), depois deste:
  // na mesma tela daria para rolar e copiar a resposta do próprio diálogo.
  nextBtn.textContent = t('common.continueArrow');
  nextBtn.style.display = 'flex';

  const canHear = dlg.lines.some(l => canSpeakChinese(l.c));
  if (!canHear) playBtn.disabled = true;
  else if (dlgAutoplayOn()) setTimeout(() => { if (stillHere()) playFrom(0, true); }, 350);
}

// Passo "Você entendeu?" -- só as perguntas, SEM o diálogo na tela (quem quiser
// conferir precisa lembrar). Não dá para pular: o Continuar só aparece no fim.
function renderDialogueCheckStep(u, contentEl, nextBtn){
  const dlg = u.dialogue;
  DLG.run++; stopExerciseAudio();
  const sp = dlg.speakers || {};
  const who = k => sp[k] || { n: k, e: '' };
  const checks = Array.isArray(dlg.check) ? dlg.check : [];
  DLG.check = { qi: 0, correct: 0 };
  contentEl.innerHTML = `
    <div class="section-label">${t('dlg.label')}</div>
    <div class="dlg-title">${escapeHTML(dlg.title)}</div>
    <div class="dlg-scene">${t('dlg.checkScene')}</div>
    <div class="dlg-check" id="dlg-check"></div>
  `;
  nextBtn.style.display = 'none';
  renderDialogueCheck(u, dlg, who, checks, nextBtn, []);
}


// Micro-checagem "Você entendeu?" -- 3 perguntas, uma de cada vez. Não dá
// para pular (o Continuar só aparece no fim); errar não reprova, mostra a
// resposta certa e acende a fala correspondente no diálogo.
function renderDialogueCheck(u, dlg, who, checks, nextBtn, rows){
  const box = document.getElementById('dlg-check');
  const st = DLG.check;
  const L = dlg.lines;
  const zhOpt = o => `<span class="dlg-py">${escapeHTML(o.p)}</span><span class="dlg-hz">${escapeHTML(o.c)}</span>`;
  const bubble = (idx, blank) => {
    const l = L[idx];
    const side = dlgSpeakerSide(dlg, l.spk);
    const w = who(l.spk);
    return `<div class="dlg-row ${side} static"><div class="dlg-avatar"><span class="dlg-emoji" aria-hidden="true">${w.e || escapeHTML(l.spk.slice(0, 1))}</span><span class="dlg-name">${escapeHTML(w.n)}</span></div>
      <div class="dlg-bubble">${blank ? '<div class="dlg-hz"><span class="dlg-blank">· · · · ·</span></div>' : `<div class="dlg-py">${escapeHTML(l.p)}</div><div class="dlg-hz">${escapeHTML(l.c)}</div>`}</div></div>`;
  };

  function showQuestion(){
    const q = checks[st.qi];
    let label = '', ctx = '', opts = [], flashIdx = -1;
    if (q.k === 'fill'){
      label = t('dlgCheck.fill');
      ctx = `<div class="dlg-q-ctx">${bubble(q.line - 1, false)}${bubble(q.line, true)}</div>`;
      opts = dlgShuffle([{ o: L[q.line], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);
      flashIdx = q.line;
    } else if (q.k === 'listen'){
      label = t('dlgCheck.listen');
      ctx = `<div class="dlg-q-listen"><button class="audio-btn audio-btn-lg" id="dlg-q-audio" aria-label="${escapeHTML(t('dlgCheck.listenAria'))}">🔊</button><div class="prompt-audio-hint">${t('dlgCheck.tapAgain')}</div></div>`;
      opts = dlgShuffle([{ o: L[q.line + 1], ok: true }, ...q.bad.map(o => ({ o, ok: false }))]);
      flashIdx = q.line + 1;
    } else {
      label = t('dlgCheck.comprehension');
      ctx = `<div class="dlg-q-text">${escapeHTML(q.q)}</div>`;
      opts = q.opts.map((t, i) => ({ t, ok: i === q.ok }));
      flashIdx = -1;
    }
    const optHTML = o => o.o ? zhOpt(o.o) : escapeHTML(o.t);
    const dots = checks.map((_, i) => `<span class="dlg-dot${i < st.qi ? ' done' : (i === st.qi ? ' on' : '')}"></span>`).join('');
    box.innerHTML = `
      <div class="dlg-check-head"><span>${t('lesson.step.dialogueCheck')}</span><span class="dlg-dots" role="img" aria-label="${escapeHTML(t('dlgCheck.progressAria', { n: st.qi + 1, total: checks.length }))}">${dots}</span></div>
      <div class="exercise-prompt-label">${label}</div>
      ${ctx}
      <div class="dlg-opts">${opts.map((o, i) => `<button class="dlg-opt" data-i="${i}">${optHTML(o)}</button>`).join('')}</div>
      <div class="dlg-fb-slot"></div>`;
    if (q.k === 'listen'){
      const a = document.getElementById('dlg-q-audio');
      const line = L[q.line].c;
      a.addEventListener('click', () => speakChinese(line, a));
      if (canSpeakChinese(line)) speakChinese(line, a, true);
    }
    box.querySelectorAll('.dlg-opt').forEach(btn => btn.addEventListener('click', () => {
      const o = opts[Number(btn.dataset.i)];
      box.querySelectorAll('.dlg-opt').forEach((b, i) => {
        b.disabled = true;
        b.classList.add('locked');
        if (opts[i].ok) b.classList.add('correct');
      });
      if (!o.ok) btn.classList.add('incorrect');
      playFeedbackSound(o.ok);
      if (o.ok) st.correct += 1;
      if (flashIdx >= 0 && rows[flashIdx]){
        rows[flashIdx].classList.add('flash');
        setTimeout(() => rows[flashIdx] && rows[flashIdx].classList.remove('flash'), 2400);
      }
      const right = optHTML(opts.find(x => x.ok));
      const last = st.qi === checks.length - 1;
      box.querySelector('.dlg-fb-slot').innerHTML = `
        <div class="dlg-fb ${o.ok ? 'ok' : 'no'}">
          <div class="dlg-fb-title">${o.ok ? t('dlgCheck.right') : t('dlgCheck.almost')}</div>
          ${o.ok ? '' : `<div class="dlg-fb-right">${right}</div>`}
          <button class="btn btn-primary btn-block" id="dlg-q-next">${last ? t('dlgCheck.finish') : t('dlgCheck.next')}</button>
        </div>`;
      document.getElementById('dlg-q-next').addEventListener('click', () => {
        if (last) finish(); else { st.qi += 1; showQuestion(); }
      });
      document.getElementById('dlg-q-next').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
  }

  function finish(){
    stopExerciseAudio();
    box.innerHTML = `
      <div class="dlg-check-head"><span>${t('lesson.step.dialogueCheck')}</span></div>
      <div class="dlg-sum">${t('dlgCheck.summary', { n: st.correct, total: checks.length })} ${st.correct === checks.length ? t('dlgCheck.allRight') : t('dlgCheck.tryAgain')}</div>
      <button class="dlg-chip" id="dlg-redo">${t('dlgCheck.redo')}</button>`;
    document.getElementById('dlg-redo').addEventListener('click', () => { st.qi = 0; st.correct = 0; showQuestion(); nextBtn.style.display = 'none'; });
    nextBtn.textContent = t('common.continueArrow');
    nextBtn.style.display = 'flex';
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showQuestion();
}

document.getElementById('step-back-btn').addEventListener('click', () => {
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepKey = currentStepDefs(u)[STEP_STATE.currentStep].key;

  // No passo de vocabulário, "Voltar" recua palavra a palavra dentro do
  // bloco atual (e entre blocos) antes de sair do passo -- só volta para o
  // passo anterior da unidade quando já está na primeira palavra do
  // primeiro bloco. Não existe "voltar" dentro de checkpoint/practice/mixed
  // (o botão fica escondido nessas fases, ver renderStep).
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
  // direto pro Flashcard em vez de voltar pra trilha (opção (a) do
  // redesenho: mostra quantos cartões estão pendentes e já entra na
  // revisão, sem depender do aluno abrir a aba por conta própria).
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

  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepDefs = currentStepDefs(u);
  const stepKey = stepDefs[STEP_STATE.currentStep].key;

  // No passo de vocabulário, o botão "Continuar" só existe na fase de
  // introdução (checkpoint/practice/mixed escondem o botão global e avançam
  // pela navegação própria dos exercícios) -- navega palavra a palavra
  // dentro do bloco atual e, no fim do bloco, dispara a checagem imediata.
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

  // Saindo do diálogo: mostra os conceitos cujo gatilho só existe em
  // contexto (a palavra em si não é vocabulário novo, só aparece na fala)
  // antes de seguir pro próximo passo da unidade.
  if (stepKey === 'dialogue'){
    runConceptQueueThen(pendingConceptsAfterDialogue(u), () => advanceUnitStep(u));
    return;
  }

  advanceUnitStep(u);
});

// ---------- Geração dos exercícios (múltipla escolha + ordenar, estilo Memrise) ----------
// Pensado para iniciante absoluto: a pergunta SEMPRE mostra pinyin + hanzi juntos
// (apoio total de leitura), e pede a tradução em português como resposta — nunca
// o inverso. Isso evita pedir reconhecimento de hanzi de memória, o que é cedo
// demais nesta fase, e evita repetir o mesmo pinyin na pergunta e nas opções
// (o que tornava a resposta óbvia sem precisar saber o significado).
//
// Exercícios de vocabulário (meaning/listen) e de ordenar frase (reorder) são
// gerados separadamente e depois embaralhados juntos numa única sequência.
// ---------- Consolidação final da unidade (ETAPA 7) ----------
// Depois que a aquisição por blocos já deu a cada palavra checagem + prática
// (+ mistura, a partir do 2º bloco), repetir a unidade inteira de novo aqui
// seria só reexpor conteúdo já praticado à toa. Em vez disso, prioriza quem
// errou durante a sessão e pega só uma amostra do resto -- consolidação como
// recuperação e aplicação, não como "mostrar tudo de novo". Se por algum
// motivo a sessão de aquisição não corresponder a esta unidade (ex: estado
// inconsistente), cai de volta pra cobrir todas as palavras, sem quebrar a
// tela.
// CONSOLIDATION_CAP existe pra a consolidação continuar CURTA mesmo numa
// sessão onde o aluno errou muitas palavras -- sem teto, "priorizar quem
// errou" vira o oposto do pedido (uma sessão que só cresce quanto mais o
// aluno erra, em vez de ficar objetiva). Cobre cada palavra errada 1x
// primeiro; só dá uma 2ª rodada pra elas se ainda sobrar espaço dentro do
// teto depois de cobrir as demais palavras da unidade pelo menos uma vez.
const CONSOLIDATION_CAP = 10;


// Duas camadas de "confundibilidade": blocos da MESMA unidade (tema já
// visto nesta lição -- mais parecidos, mais difíceis de descartar de cara)
// e blocos de QUALQUER unidade (podem ser de um assunto totalmente
// diferente -- mais fáceis de eliminar por eliminação). Mesmo padrão de
// pool em duas camadas já usado nos distratores do cloze (ver
// clozeExercises abaixo) e no "Frase completa" (buildCumulativeVocabPool);
// aqui a PROPORÇÃO entre as duas camadas varia pelo nível.
function buildReorderDistractors(unit, correctBlocks, count){
  if (count <= 0) return [];
  const correctTexts = new Set(correctBlocks.map(b => b.c));
  const dedupeAndExclude = (blocks, excludeTexts) => {
    const seen = new Set(excludeTexts);
    return blocks.filter(b => {
      if (correctTexts.has(b.c) || seen.has(b.c)) return false;
      seen.add(b.c);
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
      picked.map(b => b.c)
    ));
    picked.push(...globalPool.slice(0, count - picked.length));
  }
  return picked;
}

function buildExerciseSet(unit){
  const vocabExercises = buildConsolidationVocabExercises(unit);

  // Só frases com blocks definidos entram como exercício de ordenar — proteção
  // defensiva caso alguma frase futura seja adicionada sem essa segmentação.
  const phrasesWithBlocks = (unit.phrases || []).filter(p => p.blocks && p.blocks.length >= 2);
  const reorderExercises = phrasesWithBlocks.map(p => {
    const distractorCount = reorderDistractorCount(unit, p.blocks);
    const distractorBlocks = buildReorderDistractors(unit, p.blocks, distractorCount);
    return { format: 'reorder', phrase: p, shuffledBlocks: shuffle([...p.blocks, ...distractorBlocks]) };
  }).map((e, i) => ({ ...e, mode: i % 2 === 0 ? 'translate' : 'order' }));
  // mode 'translate': parte do português e monta o chinês do zero (nunca mostra
  // a frase em chinês antes de responder); 'order': mostra tradução + áudio e
  // pede só a ordem. Mesma divisão do Français.

  const trueFalseExercises = (unit.trueFalseExercises || []).map(tf => ({ format: 'trueFalse', ...tf }));

  // Cloze ("complete a frase"): esconde uma palavra de uma frase já ensinada.
  // Reaproveita as mesmas frases com blocks do reorder — uma frase pode virar
  // mais de um tipo de exercício ao longo da lição, cada uma numa ocorrência
  // diferente.
  const clozeExercises = shuffle(phrasesWithBlocks).slice(0, 2).map(p => {
    const blocks = p.blocks;
    const blankIdx = blocks.length >= 3
      ? 1 + Math.floor(Math.random() * (blocks.length - 1))
      : Math.floor(Math.random() * blocks.length);
    const correctBlock = blocks[blankIdx];

    const unitBlockPool = (unit.phrases || []).flatMap(ph => ph.blocks || []).filter(b => b.c !== correctBlock.c);
    let distractors = shuffle(unitBlockPool).slice(0, 3);
    if (distractors.length < 3){
      const globalPool = UNITS.flatMap(u2 => (u2.phrases || []).flatMap(ph => ph.blocks || []))
        .filter(b => b.c !== correctBlock.c && !distractors.includes(b));
      distractors = distractors.concat(shuffle(globalPool).slice(0, 3 - distractors.length));
    }

    return { format: 'cloze', phrase: p, blankIdx, correctBlock, options: shuffle([correctBlock, ...distractors]) };
  });

  // Limita quantas frases viram exercício de "ordenar" — protege contra uma
  // lição engordar demais se a unidade ganhar muitas frases de exemplo no
  // futuro (mesmo ajuste já feito no Français).
  const REORDER_EXERCISE_CAP = 4;
  const cappedReorderExercises = shuffle(reorderExercises).slice(0, REORDER_EXERCISE_CAP);

  const fullSentenceExercises = buildFullSentenceExercises(unit);

  return shuffle([...vocabExercises, ...cappedReorderExercises, ...trueFalseExercises, ...clozeExercises, ...fullSentenceExercises]);
}

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
  priorUnits.forEach(u => u.vocab.forEach(v => pool.push(v)));
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

// ---------- Tela final "Parabéns" (estilo Busuu) ----------
function currentStudentName(){
  if (!CURRENT_USER) return t('common.guest');
  const full = CURRENT_USER.user_metadata?.full_name || CURRENT_USER.email || t('common.guest');
  return full.split(' ')[0].split('@')[0];
}

// ---------- Atalho de teclado 1-4 pras alternativas selecionáveis ----------
// Um ÚNICO listener global (registrado uma vez, logo abaixo), nunca um novo
// por exercício renderizado. Cada tela de exercício só chama
// wireKeyboardOptions (que atualiza KEYBOARD_OPTION_MAP) ou deixa de chamar
// (digitação, ordenar frase) -- o mapa fica null nesses casos e o listener
// não faz nada.
let KEYBOARD_OPTION_MAP = null;


// Enter = avançar (estilo Memrise): sempre tenta clicar o botão de
// continuar que estiver na tela agora, em ordem de prioridade -- painel de
// erro/resposta revelada > painel de acerto do "ordenar frase" > botão
// global "Continuar"/"Próxima palavra" (reaproveitado em vocabulário,
// diálogo, checkpoint etc.). Roda ANTES do guard de INPUT/TEXTAREA (abaixo)
// porque precisa funcionar mesmo com o campo de digitação ainda focado: o
// próprio input já tem seu handler de Enter (submete a resposta, ver ex.
// #cloze-input) que roda primeiro; se a resposta for CERTA o exercício já
// avança sozinho antes deste handler chegar a rodar (nada fica visível pra
// clicar); se for ERRADA, o painel só aparece depois de 500ms, então este
// Enter (o mesmo que respondeu) não acha nada ainda -- só um 2º Enter, já
// com o campo desabilitado (perdeu o foco sozinho), cai aqui e avança de
// verdade. Em múltipla escolha/cloze/V-ou-F ainda não respondidos, nenhum
// desses botões existe -- Enter não faz nada, de propósito (não existe
// "resposta padrão" pra confirmar só com Enter).
function findEnterAdvanceTarget(){
  const wrongContinueBtn = document.getElementById('wrong-continue-btn');
  if (wrongContinueBtn) return wrongContinueBtn;
  const correctContinueBtn = document.getElementById('correct-continue-btn');
  if (correctContinueBtn) return correctContinueBtn;
  const stepNextBtn = document.getElementById('step-next-btn');
  if (stepNextBtn && stepNextBtn.offsetParent !== null) return stepNextBtn;
  return null;
}


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

function renderExerciseStep(){
  stopExerciseAudio();
  clearKeyboardOptions();
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const total = STEP_STATE.exerciseList.length;

  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  renderStepProgress();

  if (STEP_STATE.exerciseIndex >= total){
    // Dentro do passo "vocab", este motor de exercícios também roda as
    // fases de checkpoint/practice/mixed da sessão de aquisição -- esgotar
    // a fila aqui significa "avance de fase", não "termine a unidade". Só
    // vira tela de conclusão de verdade na consolidação final (passo
    // "exercises", ver advanceToNextBlockOrConsolidation).
    const exhaustedKey = currentStepDefs(u)[STEP_STATE.currentStep].key;
    if (exhaustedKey === 'vocab'){
      advanceAcquisitionPhase();
      return;
    }
    if (exhaustedKey === 'checkpointExercises' && STEP_STATE.checkpointPhase === 'errors'){
      // Revisão dos Erros (✱) terminada -> entra na consolidação normal da
      // unidade (que já prioriza quem errou, mas cobre tudo).
      STEP_STATE.checkpointPhase = 'main';
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      setAcqPhaseBanner(t('zh.path.banner.checkpoint'));
      renderExerciseStep();
      return;
    }
    // XP real do checkpoint: delta contra o snapshot tirado ao entrar em
    // 'exercises'/'checkpointExercises' (ver Fase 1) -- cobre tanto a
    // eventual Revisão dos Erros quanto a consolidação principal, as duas
    // juntas compõem esta "lição". O +25 de markUnitCompleted (bônus por
    // concluir a UNIDADE) só é concedido depois, quando "Continuar" for
    // clicado (ver finishCurrentLesson) -- não pertence a este XP.
    const xpEarned = STATE.xp - STEP_STATE.checkpointXpAtStart;
    const scorePct = total ? Math.round((STEP_STATE.exerciseScore / total) * 100) : 0;
    renderLessonCompleteScreen(u, isLessonUnit(u) ? currentLesson(u) : null, {
      challengesBefore: null, xpEarned, scorePct, trackHistory: false
    });
    return;
  }

  const ex = STEP_STATE.exerciseList[STEP_STATE.exerciseIndex];
  STEP_STATE.exerciseAnswered = false;

  if (ex.format === 'reorder'){
    renderReorderExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'fullsentence'){
    renderFullSentenceExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'trueFalse'){
    renderTrueFalseExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'cloze'){
    renderClozeExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'type'){
    renderVocabTypeExercise(ex, contentEl, nextBtn, total);
  } else {
    renderMultipleChoiceExercise(ex, contentEl, nextBtn, total);
  }
}

// Estimativa de minutos estudados: cada exercício respondido (certo ou errado)
// conta como ESTIMATED_SECONDS_PER_EXERCISE segundos, acumulado por dia — usado
// pelo anel de meta diária. Não é cronômetro real, é uma aproximação.
const ESTIMATED_SECONDS_PER_EXERCISE = 20;


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

function clozeFeedbackDetailHTML(ex, withCorrect){
  const correct = withCorrect
    ? `${t('feedback.correctAnswerColon')} <strong>${ex.correctBlock.c}</strong> <span class="pinyin">(${ex.correctBlock.p})</span>`
    : '';
  return phraseFeedbackDetailHTML(ex.phrase, ex.phrase.t, correct);
}

function answerExplanationHTML(ex){
  if (ex && ex.format === 'cloze') return clozeFeedbackDetailHTML(ex, true);
  if (ex && ex.format === 'fullsentence') return phraseFeedbackDetailHTML(ex.phrase, ex.phrase.t);
  if (ex && ex.phrase){
    const phraseHTML = phraseFeedbackDetailHTML(ex.phrase, ex.phrase.t);
    return phraseHTML + (noteOrConceptReviewHTML() || '');
  }
  if (ex && ex.item){
    const itemHTML = `<div class="feedback-correct-line">${t('feedback.correctAnswerColon')} <strong>${ex.item.c}</strong> ${audioBtnHTML(ex.item.c)} <span class="pinyin">(${ex.item.p})</span></div><div class="feedback-phrase-trans">${ex.item.t}</div>`;
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    const origin = findMatchingPhrase(ex.item, u);
    // Sem frase de origem: só cai pra nota de conceito quando ela REALMENTE
    // foi desenhada pra essa palavra específica (afterVocabIdx bate com
    // ex.vocabIdx) -- nunca reaproveita qualquer conceito já visto só
    // porque está na mesma unidade. Ver CLAUDE.md, coerência pedagógica.
    // .pinyin já está na lista de classes escondidas por body.hide-pinyin
    // (index.html) -- a preferência de esconder pinyin continua respeitada
    // aqui sem precisar de nenhuma regra de CSS nova.
    const originHTML = origin
      ? `<div class="usage-note-title">${t('feedback.whereSeen')}</div><p class="usage-note-body"><strong>${origin.c}</strong><br><span class="pinyin">${origin.p}</span><br>${origin.t}</p>`
      : (noteOrConceptReviewHTML(ex.vocabIdx, true) || '');
    return itemHTML + originHTML;
  }
  if (ex && ex.format === 'trueFalse' && ex.whyNote){
    return `<p class="usage-note-body">${ex.whyNote}</p>`;
  }
  return noteOrConceptReviewHTML(ex && ex.vocabIdx) || '';
}

// Painel "por que não foi essa" caindo de volta pra uma explicação da
// unidade quando não há frase de origem específica pra mostrar (ex.: erro
// de reconhecimento puro, sem frase-exemplo). Usa só os conceitos que o
// aluno JÁ VIU nesta sessão (`STEP_STATE.conceptsShown`) -- nunca antecipa
// um conceito que ainda não apareceu na lição -- e prioriza o que combina
// com a palavra errada (`vocabIdx`), quando dá pra saber qual foi.
// `requireVocabMatch`: quando true, só retorna algo se o conceito realmente
// bater com `vocabIdx` -- sem isso, cai pra "qualquer conceito já visto"
// (shown[0]), que é aceitável quando não há uma palavra específica em jogo
// (frase/fallback genérico), mas não quando o painel afirma explicar o erro
// de UMA palavra puntual (ver caso motivador em CLAUDE.md).
function noteOrConceptReviewHTML(vocabIdx, requireVocabMatch){
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  if (!u.concepts || !u.concepts.length) return null;
  const shown = u.concepts.filter(c => STEP_STATE.conceptsShown.has(c.id));
  if (!shown.length) return null;
  const vocabMatch = typeof vocabIdx === 'number' && shown.find(c => c.trigger.afterVocabIdx === vocabIdx);
  if (requireVocabMatch && !vocabMatch) return null;
  const match = vocabMatch || shown[0];
  const block = match.blocks[match.blocks.length - 1]; // versão mais completa (wrapup) do conceito, se houver mais de um cartão
  return `<div class="usage-note-title">${block.title}</div><p class="usage-note-body">${block.body}</p>`;
}

// Painel de resposta errada/revelada (estilo Duolingo): a explicação
// ("por que não foi essa") aparece AUTOMATICAMENTE -- não depende do aluno
// clicar em nada pra ver o porquê. `revealed` distingue "errei tentando"
// de "pedi pra ver a resposta" (via Não sei) -- nenhum dos dois conta como
// acerto normal, mas o rótulo comunica ao aluno qual foi o caso.
function showAnswerPanel(contentEl, ex, opts = {}){
  const revealed = !!opts.revealed;
  // Único funil compartilhado por TODO erro de verdade e todo "Não sei" de
  // TODO tipo de exercício -- ponto certo pra zerar o combo de acertos
  // seguidos (ver STEP_STATE.comboCount / showCorrectFeedbackPanel).
  STEP_STATE.comboCount = 0;
  // Erro de verdade (não "Não sei", que não conta como erro) numa palavra
  // com vocabIdx marcado: soma na contagem LOCAL DESTA SESSÃO, usada pra
  // decidir reforço extra na prática mista e prioridade na consolidação
  // final (ETAPA 7) -- não mexe no lapses/SM-2 persistente.
  if (!revealed && ex && typeof ex.vocabIdx === 'number' && STEP_STATE.acq.unitId === STATE.currentUnitId){
    STEP_STATE.acq.wordMisses[ex.vocabIdx] = (STEP_STATE.acq.wordMisses[ex.vocabIdx] || 0) + 1;
  }
  // Erro no Ponto de verificação: contagem PRÓPRIA (checkpointMisses), não
  // a de cima -- ver comentário em STEP_STATE.checkpointMisses sobre por
  // que reaproveitar acq.wordMisses aqui gerava a lista errada no card de
  // resultado do checkpoint. checkpointUnitId (diferente de acq.unitId) é
  // setado de forma confiável sempre que o checkpoint está em andamento
  // (ver renderStep, stepKey 'checkpointExercises'), então este sinal não
  // depende de o passo 'vocab' ter rodado antes na mesma sessão.
  if (!revealed && ex && typeof ex.vocabIdx === 'number' && STEP_STATE.checkpointUnitId === STATE.currentUnitId){
    STEP_STATE.checkpointMisses[ex.vocabIdx] = (STEP_STATE.checkpointMisses[ex.vocabIdx] || 0) + 1;
  }
  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const explanation = answerExplanationHTML(ex);
  const panel = document.createElement('div');
  panel.className = 'wrong-feedback';
  panel.innerHTML = `
    <div class="feedback-card-body">
      <div class="wrong-feedback-header">${revealed ? t('feedback.header.revealed') : (opts.toneOnly ? (opts.toneOnly === 'wrong' ? t('feedback.tone.wrong') : t('feedback.tone.missing')) : t('feedback.header.notThisTime'))}</div>
      ${opts.attemptHTML ? `
        <div class="wrong-feedback-why">
          <div class="wrong-feedback-why-label">${t('feedback.label.yourAnswer')}</div>
          <div class="feedback-inner-box">${opts.attemptHTML}</div>
        </div>
      ` : ''}
      ${explanation ? `
        <div class="wrong-feedback-why">
          <div class="wrong-feedback-why-label">${ex && (ex.format === 'cloze' || ex.format === 'fullsentence') ? (ex.format === 'cloze' ? t('feedback.label.fullSentence') : t('feedback.label.correctAnswer')) : (revealed ? t('feedback.label.answer') : t('feedback.label.whyNot'))}</div>
          <div class="feedback-inner-box">${explanation}</div>
        </div>
      ` : ''}
      <button class="btn btn-primary btn-block wrong-feedback-continue" id="wrong-continue-btn">${t('common.continueArrow')}</button>
    </div>
  `;
  wrap.appendChild(panel);
  wireAudioButtons(panel);

  panel.querySelector('#wrong-continue-btn').addEventListener('click', () => {
    addStudyMinutes();
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// ---------- Exercício de múltipla escolha (meaning / listen) ----------
function renderMultipleChoiceExercise(ex, contentEl, nextBtn, total){
  let promptHTML = '';
  if (ex.format === 'meaning'){
    promptHTML = `
      <div class="exercise-prompt-label">${t('zh.exercise.whatMeans')}</div>
      <div class="exercise-prompt">
        <div class="prompt-hanzi">${ex.item.c}</div>
        <div class="prompt-pinyin">${ex.item.p}</div>
        ${audioBtnHTML(ex.item.c)}
      </div>
    `;
  } else if (ex.format === 'listen'){
    promptHTML = `
      <div class="exercise-prompt-label">${t('zh.exercise.listenChoose')}</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(ex.item.c, 'audio-btn-lg')}
        <div class="prompt-audio-hint">${t('zh.exercise.tapToListenAgain')}</div>
      </div>
    `;
  }

  // Opções sempre em português — nunca pedimos reconhecer hanzi ou pinyin
  // sozinhos nesta fase, só o significado, que é o que dá pra saber de fato
  // enquanto o vocabulário ainda está sendo formado.
  const optionsHTML = ex.options.map((opt, i) =>
    `<button class="exercise-option" data-idx="${i}"><div class="opt-text">${opt.t}</div></button>`
  ).join('');

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      ${promptHTML}
      <div class="exercise-options">${optionsHTML}</div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  // auto-toca o áudio -- em "meaning" também: ouvir a pronúncia aqui não
  // entrega a resposta (as opções são traduções, não o hanzi/pinyin), então
  // só reforça positivamente, ao contrário do cloze, onde tocar cedo demais
  // entregaria a palavra que falta.
  wireAudioButtons(contentEl);
  if ((ex.format === 'listen' || ex.format === 'meaning') && canSpeakChinese(ex.item.c)){
    const audioEl = contentEl.querySelector(ex.format === 'listen' ? '.audio-btn-lg' : '.audio-btn');
    speakChinese(ex.item.c, audioEl, true);
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
        addXP(exerciseXP(ex, 3));
        registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
        addStudyMinutes();
        setTimeout(() => showCorrectFeedbackPanel(contentEl, null), 500);
      } else {
        setTimeout(() => showWrongAnswerPanel(contentEl, ex), 500);
      }
    });
  });

  // "Não sei": disponível desde o início, sem ter que errar de propósito --
  // abre a dica e permite tentar de novo, não finaliza o exercício sozinho.
  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    revealCorrectVisual(-1);
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}

// ---------- Exercício de vocabulário "Digite o que ouviu" (ditado) ----------
// Só entra na rotação depois que a palavra já foi vista em múltipla escolha
// pelo menos uma vez (gating em buildExerciseSet) — igual ao Memrise, nunca
// pede pra digitar de ouvido uma palavra ainda não exposta. Compara contra o
// pinyin, não o hanzi — digitar hanzi não é realista sem IME chinês.
function renderVocabTypeExercise(ex, contentEl, nextBtn, total){
  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${t('zh.exercise.typePinyinHeard')}</div>
      <div class="exercise-prompt">
        ${audioBtnHTML(ex.item.c, 'audio-btn-lg')}
        <div class="prompt-audio-hint">${t('zh.exercise.tapToListenAgain')}</div>
      </div>
      <div class="cloze-type-wrap">
        <input type="text" id="vocab-type-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.exercise.typePinyinPlaceholder')}">
        ${pinyinTonePickerHTML()}
        <button class="btn btn-primary btn-block" id="vocab-type-verify-btn">${t('common.verify')}</button>
      </div>
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  if (canSpeakChinese(ex.item.c)) speakChinese(ex.item.c, contentEl.querySelector('.audio-btn-lg'), true);
  nextBtn.style.display = 'none';

  const inputEl = document.getElementById('vocab-type-input');
  inputEl.focus();
  wirePinyinTonePicker(contentEl.querySelector('.pinyin-tone-picker'), inputEl);
  const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();

  function lockInputs(){
    inputEl.disabled = true;
    document.getElementById('vocab-type-verify-btn').disabled = true;
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  function finish(isCorrect, toneOnly){
    STEP_STATE.exerciseAnswered = true;
    playFeedbackSound(isCorrect);
    lockInputs();

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4)); // digitar de ouvido vale um pouco mais que só reconhecer em múltipla escolha
      registerExerciseCorrect(UNITS.find(u => u.id === STATE.currentUnitId), ex.item);
      addStudyMinutes();
      // Detalhe extra vale a pena aqui (diferente da múltipla escolha): o
      // exercício testou só o pinyin de ouvido, o hanzi nunca apareceu na
      // tela antes de responder.
      setTimeout(() => showCorrectFeedbackPanel(contentEl, `<strong>${ex.item.c}</strong> ${audioBtnHTML(ex.item.c)}`), 500);
    } else {
      // A resposta certa já aparece dentro do próprio painel de resultado
      // (answerExplanationHTML mostra ex.item.p) -- sem repetir aqui como um
      // texto solto antes do painel, num estilo diferente.
      showWrongAnswerPanel(contentEl, ex, { toneOnly });
    }
  }

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('vocab-type-verify-btn').click();
  });
  document.getElementById('vocab-type-verify-btn').addEventListener('click', () => {
    if (STEP_STATE.exerciseAnswered) return;
    // Vocabulário/pinyin com forma dupla (ex: "X / Y") -- qualquer uma das
    // duas conta como resposta completa, não só a string inteira com a barra.
    const typedAll = typedVariants(inputEl.value, ex.item.p).map(strip), typed = typedAll[0];
    const forms = acceptedFormsTyped(ex.item.p);
    const ok = forms.some(form => typedAll.includes(strip(form)));
    finish(ok, !ok && isToneOnlyMiss(typed, forms, strip));
  });

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    lockInputs();
    showAnswerPanel(contentEl, ex, { revealed: true });
  });
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

// ---------- Exercício de completar frase (cloze, estilo Clozemaster) ----------
// Esconde uma palavra (bloco) de uma frase já ensinada e pede pra completar —
// múltipla escolha (hanzi+pinyin) ou digitado (pinyin), de acordo com a
// preferência salva em getClozeMode(). Digitar hanzi não é realista sem IME
// chinês, então o modo digitado sempre compara contra o pinyin.
function renderClozeExercise(ex, contentEl, nextBtn, total){
  const hanziHTML = ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '<span class="cloze-blank" id="cloze-blank">___</span>' : b.c
  ).join('');
  const pinyinHTML = ex.phrase.blocks.map((b, i) =>
    i === ex.blankIdx ? '___' : b.p
  ).join(' ');
  const mode = getClozeMode();

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${t('exercise.completeSentence')}</div>
      <div class="cloze-sentence">
        <div class="cloze-hanzi">${hanziHTML}</div>
        <div class="cloze-pinyin">${pinyinHTML}</div>
      </div>
      <div class="cloze-audio-row" id="cloze-audio-row"></div>
      <div class="cloze-trans" id="cloze-trans"></div>
      ${mode === 'type' ? `
        <div class="cloze-type-wrap">
          <input type="text" id="cloze-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.review.cloze.placeholder')}">
          ${pinyinTonePickerHTML()}
          <button class="btn btn-primary btn-block" id="cloze-verify-btn">${t('common.verify')}</button>
        </div>
      ` : `
        <div class="cloze-options">${ex.options.map((opt, i) => `
          <button class="cloze-option" data-idx="${i}">
            <span class="cloze-option-pinyin">${opt.p}</span>
            <span class="cloze-option-hanzi">${opt.c}</span>
          </button>
        `).join('')}</div>
      `}
      <button class="exercise-dontknow" id="exercise-dontknow-btn">${t('common.dontKnow')}</button>
    </div>
  `;

  wireAudioButtons(contentEl);
  nextBtn.style.display = 'none';

  function revealBlank(state){
    document.getElementById('cloze-blank').textContent = ex.correctBlock.c;
    document.getElementById('cloze-blank').classList.add(state === 'wrong' ? 'incorrect' : 'correct');

    // A tradução da frase só aparece depois de responder -- do mesmo jeito
    // que o áudio abaixo, ela entregaria a resposta de graça se aparecesse
    // antes (a palavra que falta costuma estar literalmente na tradução).
    document.getElementById('cloze-trans').textContent = ex.phrase.t;

    // O áudio só aparece (e toca sozinho) depois de responder — antes disso
    // ele entregaria a resposta de graça, sem precisar completar a frase.
    const audioRow = document.getElementById('cloze-audio-row');
    const spokenC = clozeExercisePhrase(ex).c;
    audioRow.innerHTML = audioBtnHTML(spokenC);
    wireAudioButtons(audioRow);
    if (canSpeakChinese(spokenC)) speakChinese(spokenC, audioRow.querySelector('.audio-btn'), true);
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');
  }

  function finish(isCorrect, toneOnly){
    STEP_STATE.exerciseAnswered = true;
    playFeedbackSound(isCorrect);
    revealBlank(isCorrect ? 'ok' : 'wrong');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4));
      addStudyMinutes();
      setTimeout(() => showCorrectFeedbackPanel(contentEl, clozeFeedbackDetailHTML(ex, false)), 500);
    } else {
      setTimeout(() => showWrongAnswerPanel(contentEl, ex, { toneOnly }), 500);
    }
  }

  if (mode !== 'type'){
    wireKeyboardOptions(contentEl.querySelectorAll('.cloze-option'));
  }

  if (mode === 'type'){
    const inputEl = document.getElementById('cloze-input');
    inputEl.focus();
    wirePinyinTonePicker(contentEl.querySelector('.pinyin-tone-picker'), inputEl);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('cloze-verify-btn').click();
    });
    document.getElementById('cloze-verify-btn').addEventListener('click', () => {
      if (STEP_STATE.exerciseAnswered) return;
      inputEl.disabled = true;
      const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
      const typedAll = typedVariants(inputEl.value, ex.correctBlock.p).map(strip), typed = typedAll[0];
      const forms = acceptedFormsTyped(ex.correctBlock.p);
      const ok = forms.some(form => typedAll.includes(strip(form)));
      finish(ok, !ok && isToneOnlyMiss(typed, forms, strip));
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
        finish(isCorrect);
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
        addXP(exerciseXP(ex, 4)); // vale um pouco mais que múltipla escolha simples, mesmo critério do reorder
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


function renderReorderExercise(ex, contentEl, nextBtn, total){
  const correctOrder = ex.phrase.blocks;
  const chosenSequence = []; // índices (no array shuffledBlocks) já escolhidos, em ordem

  const isTranslate = ex.mode === 'translate';
  const phraseZh = phraseForExercise(ex.phrase);

  contentEl.innerHTML = `
    <div class="exercise-wrap">
      <div class="exercise-counter">${t('zh.exercise.counter', { i: STEP_STATE.exerciseIndex + 1, n: total })}</div>
      <div class="exercise-prompt-label">${isTranslate ? t('zh.exercise.translateToChinese') : t('zh.exercise.orderSentence')}</div>
      ${isTranslate ? `
        <div class="exercise-prompt">
          <div class="prompt-translation">${ex.phrase.t}</div>
        </div>
      ` : `
        <div class="exercise-prompt reorder-target">
          <div class="prompt-translation">${ex.phrase.t}</div>
          ${audioBtnHTML(phraseZh.c, 'audio-btn-lg')}
        </div>
        <div class="reorder-wrap-hint">${t('zh.reorder.tapHint')}</div>
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
      return `<div class="reorder-slot filled" data-seq-pos="${i}"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`;
    }).join('');

    // Clicar num slot preenchido remove ele (e todos depois dele), permitindo corrigir
    slotsEl.querySelectorAll('.reorder-slot.filled').forEach(slot => {
      slot.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        const pos = parseInt(slot.dataset.seqPos);
        chosenSequence.splice(pos); // remove esse e tudo depois
        renderSlots();
        renderBlocks();
      });
    });
  }

  function renderBlocks(){
    blocksEl.innerHTML = ex.shuffledBlocks.map((block, i) => {
      const alreadyChosen = chosenSequence.includes(i);
      return `<button class="reorder-block ${alreadyChosen ? 'used' : ''}" data-block-idx="${i}" ${alreadyChosen ? 'disabled' : ''}>
        <div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div>
      </button>`;
    }).join('');

    blocksEl.querySelectorAll('.reorder-block:not(.used)').forEach(btn => {
      btn.addEventListener('click', () => {
        if (STEP_STATE.exerciseAnswered) return;
        // Captura a posição/conteúdo do bloco ANTES do rebuild (renderSlots/
        // renderBlocks substituem o innerHTML inteiro -- depois disso não dá
        // mais pra medir de onde ele "partiu"), pra animar um clone voando
        // até o slot certo em vez do bloco só sumir e o texto aparecer pronto.
        const sourceRect = btn.getBoundingClientRect();
        const sourceHTML = btn.innerHTML;
        const blockIdx = parseInt(btn.dataset.blockIdx);
        const seqPos = chosenSequence.length;
        chosenSequence.push(blockIdx);
        renderSlots();
        renderBlocks();

        const targetSlot = slotsEl.querySelector(`.reorder-slot[data-seq-pos="${seqPos}"]`);
        flyBlockToSlot(sourceRect, sourceHTML, targetSlot);

        // Frase completa: verifica automaticamente
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

    slotsEl.querySelectorAll('.reorder-slot').forEach(slot => {
      slot.classList.add(isCorrect ? 'correct' : 'incorrect');
    });
    // Com a frase completa, todo bloco já foi usado (visibility:hidden --
    // preserva a posição pra "desfazer" clicando num slot, ver renderSlots
    // acima) -- mas essa desfeita não existe mais depois de respondido, então
    // a fileira de blocos invisíveis só reservava um vão vazio até o painel
    // de resultado. Some com a fileira inteira, igual ao tratamento já dado
    // a outros controles que perdem a função ao responder.
    blocksEl.style.display = 'none';
    document.getElementById('exercise-dontknow-btn')?.classList.add('disabled');
    contentEl.querySelector('.exercise-reveal-btn')?.classList.add('disabled');

    if (isCorrect){
      STEP_STATE.exerciseScore += 1;
      addXP(exerciseXP(ex, 4)); // ordenar frase vale um pouco mais que múltipla escolha simples
      addStudyMinutes();
      setTimeout(() => showCorrectFeedbackPanel(contentEl, phraseFeedbackDetailHTML(ex.phrase, ex.phrase.t)), 500);
    } else {
      // "Sua resposta" com cada bloco marcado: vermelho = não pertence à
      // frase (isca); amarelo sublinhado = bloco certo no lugar errado.
      const attemptHTML = `<div class="reorder-attempt">${chosenSequence.map((blockIdx, pos) => {
        const block = ex.shuffledBlocks[blockIdx];
        const cls = block === correctOrder[pos] ? 'ok' : (correctOrder.includes(block) ? 'near' : 'bad');
        return `<span class="reorder-attempt-w ${cls}"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></span>`;
      }).join('')}</div>`;
      setTimeout(() => showWrongAnswerPanel(contentEl, ex, { attemptHTML }), 500);
    }
  }

  renderSlots();
  renderBlocks();
  nextBtn.style.display = 'none';

  wireDontKnowButton(contentEl, ex, () => {
    STEP_STATE.exerciseAnswered = true;
    // Mostra a ordem certa nos slots -- não conta como tentativa errada, é
    // uma revelação pedida pelo aluno via "Não sei".
    slotsEl.innerHTML = correctOrder.map(block =>
      `<div class="reorder-slot filled correct"><div class="pinyin">${block.p}</div><div class="hanzi">${block.c}</div></div>`
    ).join('');
    blocksEl.querySelectorAll('.reorder-block').forEach(b => b.classList.add('disabled'));
    setTimeout(() => showAnswerPanel(contentEl, ex, { revealed: true }), 300);
  });
}

// Painel de acerto (estilo Duolingo): toda resposta certa PÁRA aqui em vez
// de avançar sozinha -- só segue pro próximo exercício quando o aluno toca
// "Continuar". A frase de elogio varia a cada vez (nunca repete a mesma
// duas vezes seguidas dentro da mesma lição, ver nextCorrectFeedbackPhrase).
// A partir de COMBO_MIN acertos seguidos entra em "modo combo" (badge ⚡ +
// frase de incentivo própria, ver COMBO_PHRASES/nextComboPhrase abaixo).
// `detail`, quando informado, é o HTML extra que vale a pena reforçar mesmo
// já tendo acertado -- ex: a tradução da frase inteira num "ordene a frase"
// (montar a ordem certa não garante que o aluno entendeu o SENTIDO). Pra
// formatos onde a resposta certa já fica visível na própria tela do
// exercício antes do painel abrir (múltipla escolha destaca a opção certa,
// cloze já revela a tradução, digitar de ouvido nunca mostrou o hanzi antes
// então esse sim ganha detail), repetir a mesma informação de novo dentro
// do painel não ajuda em nada -- passa null.
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


// RENDER: Revisão (SRS)
// ============================================================
// ---------- Speed Review (estilo Memrise) ----------
// Múltipla escolha contra o relógio, 3 corações, pontuação maior quanto mais
// rápido. Usa o mesmo pool de cartões "due" da revisão normal (vocabulário),
// mas sem aplicar SM-2 — é um modo de prática/jogo, não substitui o SRS.
const SPEED_TIME_LIMIT = 6000; // ms por pergunta
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


function cardPromptPinyinText(cardOrPseudo){
  const view = resolveCardContentView(cardOrPseudo);
  const field = view.kind === 'multiple_choice' ? view.prompt : view.front;
  return (field && field.pinyinText) || '';
}


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
// getters: resolvem no idioma do site na hora do uso (o idioma da conta chega depois do load).
const REVIEW_ORIGIN_LABELS = {
  get all(){ return t('review.origin.all'); },
  get study(){ return t('review.origin.study'); },
  get teacher(){ return t('review.origin.teacher'); },
  get self(){ return t('flashcards.origin.selfTitle'); }
};


document.getElementById('review-back-to-modes').addEventListener('click', backToReviewModeSelect);

// ---------- Combinar: jogo de pares (hanzi <-> tradução) ----------
// Pool: TODA palavra de uma lição já concluída (eligibleReviewPool), sem
// exigir reps>0 nem respeitar data de vencimento do SM2 -- é jogo, não
// ferramenta de revisão espaçada (decisão da autora, ver auditoria do
// sistema de XP). Tamanho da sessão é escolha do aluno (ver
// renderMatchSizePicker/MATCH_SIZE_OPTIONS), não fixo.
const MATCH_SIZE_OPTIONS = [5, 8, 10]; // pares -- 10/16/20 cartas
const MATCH_STATE = {
  pairSize: 8,     // pares por sessão, escolhido em renderMatchSizePicker
  pairs: [],
  tiles: [],
  selected: null,
  matchedCount: 0,
  attempts: 0,
  busy: false
};


function renderSpeedReview(){
  const el = document.getElementById('speed-review-content');

  // Projeto "Reorganização da experiência de revisão e prática": Speed
  // Review agora usa a fila DEVIDA (ver buildSpeedQueue), então fila vazia
  // é o caso normal e esperado de "você está em dia" -- bem diferente de
  // "ainda não tem vocabulário suficiente" (conta muito pouca palavra
  // aprendida no total). As duas mensagens não podem ser a mesma.
  if (SPEED_STATE.queue.length === 0){
    const pool = eligibleReviewPool();
    el.innerHTML = projectStudyWordsToA(pool).length < 4 ? `
      <div class="review-empty">
        <div class="big-emoji">⚡</div>
        <h3>${t('review.insufficientTitle')}</h3>
        <p>${t('review.speed.insufficientBody')}</p>
      </div>
    ` : `
      <div class="review-empty">
        <div class="big-emoji">🍵</div>
        <h3>${t('review.empty.upToDateTitle')}</h3>
        <p>${t('review.speed.upToDateBody')}</p>
        <button class="btn btn-primary" id="speed-go-practice">${t('review.practice')}</button>
      </div>
    `;
    document.getElementById('speed-go-practice')?.addEventListener('click', backToReviewModeSelect);
    return;
  }

  if (SPEED_STATE.hearts <= 0){
    stopSpeedTimer();
    if (!SPEED_STATE.dailyCounted){
      SPEED_STATE.dailyCounted = true;
      // Só a 1a sessão de Speed Review do dia rende XP real -- sem isso,
      // "Jogar de novo" (mesmo pool de palavras, sem gasto nenhum) virava
      // fonte infinita de XP depois que o modo passou a dar XP de verdade
      // (achado da autora: "logo após fazer o exercício ele já ficou
      // disponível de novo com as mesmas palavras"). Sessões seguintes no
      // mesmo dia continuam funcionando normalmente como prática (hearts,
      // pts, streak do minijogo) -- só não empilham XP de novo.
      ensureDailyBucket();
      const firstSpeedSessionToday = !STATE.daily.speedReviewSessions;
      registerDailySpeedReview();
      registerStudyToday();
      // 1x por sessão (não por resposta) -- evita um toast "+2 XP" a cada
      // pergunta num jogo rápido, e usa o mesmo guard de dailyCounted pra
      // nunca dobrar em caso de re-render desta tela.
      if (firstSpeedSessionToday && SPEED_STATE.correctCount > 0) addXP(SPEED_STATE.correctCount * SPEED_REVIEW_XP_PER_CORRECT);
    }
    maybeShowStreakCelebration();
    trackEvent('lesson_complete', 'speed_review', { score: SPEED_STATE.score });
    const speedScoreRecord = recordSpeedReviewScore(SPEED_STATE.score);
    const speedStreakRecord = recordSpeedReviewStreak(SPEED_STATE.bestStreak || 0);
    const speedIsRecord = speedScoreRecord || speedStreakRecord;
    if (speedIsRecord) saveState();
    // Fase 6 do projeto: nunca oferecer "Jogar de novo" repetindo a mesma
    // bateria de revisão -- Voltar/Praticar mais, igual à conclusão do
    // Flashcard (ver renderReviewView).
    releaseBadgeCelebrations();
    el.innerHTML = `
      <div class="speed-gameover">
        <div class="big-emoji">💔</div>
        <h3>${t('review.speed.gameOver')}</h3>
        <div class="score-num">${SPEED_STATE.score} pts</div>
        <p>${tp('review.speed.answered', SPEED_STATE.index === 1 ? 1 : 2, { n: SPEED_STATE.index })}</p>
        <p class="review-record-line">${speedIsRecord ? `${t('review.records.newRecord')} ${speedRecordText(reviewRecords())}` : t('review.records.yourRecord', { record: speedRecordText(reviewRecords()) })}</p>
        <div class="review-complete-actions">
          <button class="btn btn-secondary" id="speed-back-btn">${t('review.back')}</button>
          <button class="btn btn-primary" id="speed-practice-btn">${t('review.practiceMore')}</button>
        </div>
      </div>
    `;
    document.getElementById('speed-back-btn').addEventListener('click', () => switchTab('path'));
    document.getElementById('speed-practice-btn').addEventListener('click', backToReviewModeSelect);
    return;
  }

  if (SPEED_STATE.index >= SPEED_STATE.queue.length){
    stopSpeedTimer();
    if (!SPEED_STATE.dailyCounted){
      SPEED_STATE.dailyCounted = true;
      // Só a 1a sessão de Speed Review do dia rende XP real -- sem isso,
      // "Jogar de novo" (mesmo pool de palavras, sem gasto nenhum) virava
      // fonte infinita de XP depois que o modo passou a dar XP de verdade
      // (achado da autora: "logo após fazer o exercício ele já ficou
      // disponível de novo com as mesmas palavras"). Sessões seguintes no
      // mesmo dia continuam funcionando normalmente como prática (hearts,
      // pts, streak do minijogo) -- só não empilham XP de novo.
      ensureDailyBucket();
      const firstSpeedSessionToday = !STATE.daily.speedReviewSessions;
      registerDailySpeedReview();
      registerStudyToday();
      // 1x por sessão (não por resposta) -- evita um toast "+2 XP" a cada
      // pergunta num jogo rápido, e usa o mesmo guard de dailyCounted pra
      // nunca dobrar em caso de re-render desta tela.
      if (firstSpeedSessionToday && SPEED_STATE.correctCount > 0) addXP(SPEED_STATE.correctCount * SPEED_REVIEW_XP_PER_CORRECT);
    }
    maybeShowStreakCelebration();
    // Fase 6 do projeto: idem -- sem "Jogar de novo" (a fila devida já foi
    // zerada de verdade nesta sessão; "de novo" mostraria vazio ou
    // reaproveitaria cartões que acabaram de ser respondidos).
    const speedIsRecord2 = recordSpeedReviewScore(SPEED_STATE.score);
    const speedStreakRecord2 = recordSpeedReviewStreak(SPEED_STATE.bestStreak || 0);
    if (speedIsRecord2 || speedStreakRecord2) saveState();
    releaseBadgeCelebrations();
    el.innerHTML = `
      <div class="speed-gameover">
        <div class="big-emoji">🏆</div>
        <h3>${t('review.complete.title')}</h3>
        <div class="score-num">${SPEED_STATE.score} pts</div>
        <p class="review-record-line">${speedIsRecord2 || speedStreakRecord2 ? `${t('review.records.newRecord')} ${speedRecordText(reviewRecords())}` : t('review.records.yourRecord', { record: speedRecordText(reviewRecords()) })}</p>
        <div class="review-complete-actions">
          <button class="btn btn-secondary" id="speed-back-btn">${t('review.back')}</button>
          <button class="btn btn-primary" id="speed-practice-btn">${t('review.practiceMore')}</button>
        </div>
      </div>
    `;
    document.getElementById('speed-back-btn').addEventListener('click', () => switchTab('path'));
    document.getElementById('speed-practice-btn').addEventListener('click', backToReviewModeSelect);
    return;
  }

  const card = SPEED_STATE.queue[SPEED_STATE.index];
  const options = buildSpeedOptions(card);
  SPEED_STATE.answered = false;

  const heartsHTML = [0,1,2].map(i => `<span class="${i < SPEED_STATE.hearts ? '' : 'heart-lost'}">❤️</span>`).join('');

  el.innerHTML = `
    <div class="speed-header">
      <div class="speed-hearts">${heartsHTML}</div>
      <div class="speed-score">${SPEED_STATE.score} pts</div>
    </div>
    <div class="speed-timer-track"><div class="speed-timer-fill" id="speed-timer-fill" style="width:100%"></div></div>
    <div class="speed-prompt">
      <div class="hanzi">${cardPromptText(card)}</div>
      <div class="pinyin">${cardPromptPinyinText(card)}</div>
    </div>
    <div class="speed-options">
      ${options.map((opt, i) => `<button class="speed-option" data-idx="${i}">${cardAnswerText(opt)}</button>`).join('')}
    </div>
  `;

  el.querySelectorAll('.speed-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenIdx = parseInt(btn.dataset.idx);
      answerSpeedQuestion(options[chosenIdx] === card, el, chosenIdx);
    });
  });

  runSpeedTimer(el, () => answerSpeedQuestion(false, el)); // tempo esgotado = errou
}


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


// Projeto "Aprimoramento do Flashcard": os 4 botões de resposta mostram o
// intervalo REAL que o motor agendaria (previewNextIntervalDays, mesma
// função que scheduleReview usa de verdade -- shared/fsrs.js), nunca texto
// estático. Usada tanto pelo Flashcard de vocabulário quanto pela revisão
// de hanzi (mesmo cartão-base, mesmo motor).
// i18n Fase 6 lote 2: cartão de professora/aluna traz unitTitleKey (catálogo);
// cartão de trilha continua com unitTitle (título da unidade, conteúdo).
function cardOriginTitle(card){
  return card.unitTitleKey ? t(card.unitTitleKey) : card.unitTitle;
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
// `card.clozeSentence`/`card.clozeAnswer`/`card.clozeAnswerPinyin`/
// `card.back_trans`/`card.audioUrl` (não existem mais no card nativo).
// view.displayAnswerText = hanzi (revelado); view.compareAnswerText =
// pinyin (o que a aluna digita) -- exatamente o mesmo par
// clozeAnswer/clozeAnswerPinyin de antes, só vindo do resolver agora,
// comportamento intocado.
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
      <div class="cloze-sentence">
        <div class="cloze-hanzi">${sentenceHTML}</div>
        ${answered ? `<div class="cloze-pinyin pinyin">${escapeHTML(view.compareAnswerText)}</div>` : ''}
      </div>
      ${view.audioUrl ? customAudioBtnHTML(view.audioUrl) : ''}
      ${answered ? `<div class="cloze-trans">${escapeHTML(view.translation.text)}</div>` : ''}
    </div>
    ${!answered ? `
      <div class="cloze-type-wrap">
        <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.review.cloze.placeholder')}">
        ${pinyinTonePickerHTML()}
        <button class="btn btn-primary btn-block" id="cloze-review-verify-btn">${t('common.verify')}</button>
      </div>
    ` : `${toneHintHTML(localState)}${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${t('common.continue')}</button>`}
  `;

  wireCustomAudioButtons(mountEl);

  if (!answered){
    const inputEl = mountEl.querySelector('#cloze-review-input');
    inputEl.focus();
    wirePinyinTonePicker(mountEl.querySelector('.pinyin-tone-picker'), inputEl);
    const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
    function verify(){
      if (inputEl.disabled) return;
      inputEl.disabled = true;
      mountEl.querySelector('#cloze-review-verify-btn').disabled = true;
      const typedAll = typedVariants(inputEl.value, view.compareAnswerText).map(strip), typed = typedAll[0];
      // Interação intermediária (verificar) -- muta localState e o
      // renderer se autochama, sem envolver a sessão.
      localState.typedAnswer = inputEl.value;
      localState.answered = true;
      const forms = acceptedFormsTyped(view.compareAnswerText);
      localState.wasCorrect = forms.some(form => typedAll.includes(strip(form)));
      localState.toneOnly = localState.wasCorrect ? false : isToneOnlyMiss(typed, forms, strip);
      renderClozeCard(mountEl, card, localState, callbacks);
    }
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    mountEl.querySelector('#cloze-review-verify-btn').addEventListener('click', verify);
  } else {
    mountEl.querySelector('#cloze-continue-btn').addEventListener('click', () => {
      // Transição FINAL -- sobe pra sessão via callback, mesmo ciclo de
      // vida de STATE.reviewCardState já estabelecido na Fase 6C.1.
      callbacks.onAnswered(localState.wasCorrect, localState.wasCorrect ? 2 : 0);
    });
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
// entre os dois). Mesma distinção hanzi revelado/pinyin comparado de
// sempre, só a leitura/escrita de "já respondeu?" muda de STATE pra
// localState.
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
      <div class="flashcard-hanzi">${escapeHTML(view.prompt.text)}${promptSpeakable ? ` ${audioBtnHTML(view.prompt.text, 'audio-btn-lg')}` : ''}${view.prompt.audioUrl ? customAudioBtnHTML(view.prompt.audioUrl) : ''}</div>
      <div class="flashcard-pinyin pinyin">${escapeHTML(view.prompt.pinyinText || '')}</div>
      ${answered ? `
        <div class="divider-line"></div>
        <span class="cloze-blank ${localState.wasCorrect ? 'correct' : 'incorrect'}">${escapeHTML(view.displayAnswerText)}</span>
        ${answerImageUrl ? `<img src="${answerImageUrl}" class="flashcard-image" alt="">` : ''}
        ${answerAudioUrl ? customAudioBtnHTML(answerAudioUrl) : ''}
      ` : ''}
    </div>
    ${!answered ? `
      <div class="cloze-type-wrap">
        <input type="text" id="cloze-review-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('zh.review.typeAnswer.placeholder')}">
        ${pinyinTonePickerHTML()}
        <button class="btn btn-primary btn-block" id="cloze-review-verify-btn">${t('common.verify')}</button>
      </div>
    ` : `${toneHintHTML(localState)}${reviewObservationHTML(card)}<button class="btn btn-primary btn-block mc-continue-btn" id="cloze-continue-btn">${t('common.continue')}</button>`}
  `;

  wireAudioButtons(mountEl, card.__isPreviewCard);
  wireCustomAudioButtons(mountEl);
  // Fase 7a -- `card.__isPreviewCard` suprime o AUTOPLAY; Fase 7d -- o
  // MESMO flag agora também isola o clique MANUAL (wireAudioButtons acima
  // já passa pra playAudioPreview() em vez de speakChinese() quando em
  // Preview) -- ver mesmo comentário em renderNormalCard().
  if (!card.__isPreviewCard && promptSpeakable && canSpeakChinese(view.prompt.text)) speakChinese(view.prompt.text, mountEl.querySelector('.audio-btn-lg'), true);

  if (!answered){
    const inputEl = mountEl.querySelector('#cloze-review-input');
    inputEl.focus();
    wirePinyinTonePicker(mountEl.querySelector('.pinyin-tone-picker'), inputEl);
    const strip = s => normalizePinyinAnswer(s).replace(/[.,!?;:'"，。！？；：]/g, '').trim();
    function verify(){
      if (inputEl.disabled) return;
      inputEl.disabled = true;
      mountEl.querySelector('#cloze-review-verify-btn').disabled = true;
      const typedAll = typedVariants(inputEl.value, view.compareAnswerText).map(strip), typed = typedAll[0];
      // Interação intermediária (verificar) -- muta localState e o
      // renderer se autochama, sem envolver a sessão.
      localState.typedAnswer = inputEl.value;
      localState.answered = true;
      const forms = acceptedFormsTyped(view.compareAnswerText);
      localState.wasCorrect = forms.some(form => typedAll.includes(strip(form)));
      localState.toneOnly = localState.wasCorrect ? false : isToneOnlyMiss(typed, forms, strip);
      renderTypeAnswerCard(mountEl, card, localState, callbacks);
    }
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });
    mountEl.querySelector('#cloze-review-verify-btn').addEventListener('click', verify);
  } else {
    mountEl.querySelector('#cloze-continue-btn').addEventListener('click', () => {
      // Transição FINAL -- sobe pra sessão via callback, mesmo ciclo de
      // vida de STATE.reviewCardState já estabelecido na Fase 6C.1.
      callbacks.onAnswered(localState.wasCorrect, localState.wasCorrect ? 2 : 0);
    });
  }
}

function renderReviewView(){
  syncReviewBackLink();
  stopExerciseAudio();
  const el = document.getElementById('review-content');

  if (!STATE.reviewQueue.length){
    releaseBadgeCelebrations();
    // Mesma fonte que startReviewSession()/Speed Review usam de verdade
    // (todaysReviewCount, com os mesmos tetos de novas/dia e intensidade)
    // -- senão esse número prometeria mais do que "Revisar tudo disponível"
    // realmente consegue puxar (o botão clicava e caía de volta nesta
    // mesma tela vazia).
    const allDue = STATE.reviewSessionClassReview ? 0 : todaysReviewCount(STATE.cards.filter(isCardLessonCompleted).filter(c => !isClassReviewCard(c)));
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🍵</div>
        <h3>${STATE.reviewSessionClassReview ? t('review.session.classEmptyTitle') : activeReviewTagFilter().length ? t('review.session.tagsEmptyTitle') : STATE.reviewSessionDeckId ? t('review.session.deckEmptyTitle') : (STATE.reviewSessionUnitFilter ? t('review.session.unitEmptyTitle') : t('review.session.allDoneTitle'))}</h3>
        <p>${allDue > 0 ? tp('review.session.pendingOverall', allDue === 1 ? 1 : 2, { n: allDue }) : t('review.session.comeBackLater')}</p>
        ${allDue > 0 ? `<button class="btn btn-primary" id="review-start-all">${t('review.session.reviewAllAvailable')}</button>` : ''}
        ${STATE.reviewSessionClassReview ? `<button class="btn btn-secondary" id="review-class-back">${t('review.backToStudent')}</button>` : ''}
      </div>
    `;
    document.getElementById('review-class-back')?.addEventListener('click', backToClassReviewTab);
    if (allDue > 0){
      document.getElementById('review-start-all').addEventListener('click', () => {
        STATE.reviewSessionUnitFilter = null;
        STATE.reviewSessionDeckId = null; // Fase D -- mesmo fallback de "abandona o escopo estreito" já usado pra unidade
        startReviewSession();
      });
    }
    return;
  }

  if (STATE.reviewIndex >= STATE.reviewQueue.length){
    releaseBadgeCelebrations();
    // Streak conta aqui -- fim da SESSÃO inteira de Flashcard/Palavras
    // difíceis (os dois usam esta mesma tela, ver openReviewSession) -- não
    // a cada cartão avaliado (ver gradeCurrentCard).
    registerStudyToday();
    if (STATE.reviewSessionStartedAt){
      recordReviewSessionTime(STATE.reviewQueue.length, Date.now() - STATE.reviewSessionStartedAt);
      STATE.reviewSessionStartedAt = null;
      saveState();
    }
    maybeShowStreakCelebration();
    trackEvent('lesson_complete', 'flashcard_review', { count: STATE.reviewQueue.length });
    // Fase 6 do projeto de reorganização: terminar a revisão nunca deve
    // convidar a repetir a mesma bateria -- "Voltar" leva pra trilha,
    // "Praticar mais" leva pra PRATICAR (Combinar/Palavras difíceis), não
    // reinicia esta mesma sessão de revisão.
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🎉</div>
        <h3>${t('review.complete.title')}</h3>
        <p>${tp('review.complete.reviewed', STATE.reviewQueue.length === 1 ? 1 : 2, { n: STATE.reviewQueue.length })}</p>
        <div class="review-complete-actions">
          ${STATE.reviewSessionClassReview
            ? `<button class="btn btn-primary" id="review-class-back">${t('review.backToStudent')}</button>`
            : `<button class="btn btn-secondary" id="review-again">${t('review.back')}</button>
          <button class="btn btn-primary" id="review-go-practice">${t('review.practiceMore')}</button>`}
        </div>
      </div>
    `;
    checkUnitCompletion();
    document.getElementById('review-class-back')?.addEventListener('click', backToClassReviewTab);
    document.getElementById('review-again')?.addEventListener('click', () => {
      STATE.reviewSessionUnitFilter = null;
      STATE.reviewSessionDeckId = null; // Fase D
      switchTab('path');
    });
    document.getElementById('review-go-practice')?.addEventListener('click', () => {
      STATE.reviewSessionUnitFilter = null;
      STATE.reviewSessionDeckId = null; // Fase D
      backToReviewModeSelect();
    });
    renderProgressView();
    return;
  }

  const card = STATE.reviewQueue[STATE.reviewIndex];

  // Fase 4 (motor de tipos/templates, ver CLAUDE.md) -- despacho por
  // cardTypeId. Cartão nativo (Note/CardInstance, origin teacher/self)
  // K2-J: todo card da fila tem `card.cardInstance` (study/teacher/self nascem de
  // buildStudyWordCards/buildEngineCardsFromRow); normal cai no flip abaixo.
  {
    const cardTypeId = card.cardInstance.cardTypeId;
    // Fase 6C.2 -- Múltipla escolha/Digite a resposta seguem o mesmo
    // padrão de criação preguiçosa de STATE.reviewCardState já
    // estabelecido pra Normal na Fase 6C.1: só criado quando ausente
    // (cartão novo, gradeCurrentCard/reviewMoreCurrentCard já zeraram ao
    // avançar a fila), tipado (`kind`) pro card atual; re-renderizações
    // do MESMO cartão reaproveitam a mesma referência.
    if (cardTypeId === 'multiple_choice'){
      if (!STATE.reviewCardState){
        STATE.reviewCardState = { kind: 'multiple_choice', shuffledOptions: null, selectedIndex: null, answered: false, wasCorrect: null };
      }
      renderMultipleChoiceCard(el, card, STATE.reviewCardState, {
        onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
      });
      return;
    }
    if (cardTypeId === 'type_answer'){
      if (!STATE.reviewCardState){
        STATE.reviewCardState = { kind: 'type_answer', typedAnswer: '', answered: false, wasCorrect: null };
      }
      renderTypeAnswerCard(el, card, STATE.reviewCardState, {
        onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
      });
      return;
    }
    if (cardTypeId === 'cloze'){
      if (!STATE.reviewCardState){
        // markId identifica explicitamente a marca desta CardInstance --
        // ver comentário completo em renderClozeCard() pra motivo.
        STATE.reviewCardState = { kind: 'cloze', markId: card.cardInstance.markId, typedAnswer: '', answered: false, wasCorrect: null };
      }
      renderClozeCard(el, card, STATE.reviewCardState, {
        onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
      });
      return;
    }
    // cardTypeId === 'normal' (inclusive uma das 2 metades de "Normal com
    // reverso", Fase 4a) cai no flip padrão abaixo.
  }

  // Fase 6C.1 (ver CLAUDE.md) -- "normal" (inclusive uma das 2 metades de
  // "Normal com reverso") extraído pro renderer renderNormalCard(),
  // seguindo o contrato aprovado na Fase 6C: (mountEl, card, localState,
  // callbacks). A SESSÃO (aqui) é quem cria/descarta STATE.reviewCardState
  // -- o renderer nunca lê/escreve STATE por nome, só recebe a referência
  // como parâmetro. Criação é preguiçosa (só quando ainda não existe --
  // gradeCurrentCard() já o zera ao avançar a
  // fila, então "ausente" aqui sempre significa "cartão novo, começar do
  // zero"; re-renderizações do MESMO cartão -- ex: depois de revelar --
  // reaproveitam a mesma referência, nunca recriam).
  if (!STATE.reviewCardState){
    STATE.reviewCardState = { kind: 'normal', revealed: false };
  }
  renderNormalCard(el, card, STATE.reviewCardState, {
    onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
  });
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
  let hanziSideHTML, transSideHTML, frontImageUrl, backImageUrl, hanziIsSpeakable, hanziTextForSpeech;
  {
    const view = resolveCardContentView(card); // kind: 'normal'
    // Fase 7a (ver CLAUDE.md) -- áudio/imagem customizados resolvidos POR
    // LADO, nunca mais por fallback entre os dois (`front.audioUrl ||
    // back.audioUrl`, como era antes desta fase). Esse fallback era o
    // vazamento identificado na auditoria da Fase 7: se só o VERSO tinha
    // áudio/imagem próprio, ele aparecia junto do front, antes da
    // revelação -- entregando a resposta pelo ouvido/pela imagem mesmo com
    // o texto ainda escondido. Cada lado só expõe sua PRÓPRIA mídia agora;
    // o template abaixo já garante que a mídia do back só é desenhada
    // dentro do bloco `localState.revealed`, nunca antes.
    hanziSideHTML = `
      <div class="flashcard-hanzi">${escapeHTML(view.front.text)} ${audioBtnHTML(view.front.text, 'audio-btn-lg')}${view.front.audioUrl ? customAudioBtnHTML(view.front.audioUrl) : ''}</div>
      <div class="flashcard-pinyin pinyin">${escapeHTML(view.front.pinyinText || '')}</div>
    `;
    transSideHTML = `<div class="flashcard-trans">${escapeHTML(view.back.text)}${view.back.audioUrl ? customAudioBtnHTML(view.back.audioUrl) : ''}</div>`;
    frontImageUrl = view.front.imageUrl;
    backImageUrl = view.back.imageUrl;
    hanziIsSpeakable = isStudyLanguageField(view.front, APP_KEY);
    hanziTextForSpeech = view.front.text;
  }
  let frontHTML = hanziSideHTML;
  let backHTML = transSideHTML;
  // Áudio automático só quando o hanzi está do lado JÁ visível nesse
  // instante -- no modo padrão isso é o front (toca ao entrar no cartão),
  // no modo invertido é o back (toca só ao revelar a resposta).
  let hanziVisibleNow = true;
  // K2-D: CardInstance nativo cuja FRENTE é a tradução e cujo VERSO é o hanzi
  // (ex.: Study Trail B): hanzi + pinyin + áudio acompanham o campo do idioma
  // estudado (verso). Direção continua 100% do CardInstance.
  {
    const v = resolveCardContentView(card);
    if (!isStudyLanguageField(v.front, APP_KEY) && isStudyLanguageField(v.back, APP_KEY)){
      frontHTML = `<div class="flashcard-trans">${escapeHTML(v.front.text)}${v.front.audioUrl ? customAudioBtnHTML(v.front.audioUrl) : ''}</div>`;
      backHTML = `
      <div class="flashcard-hanzi">${escapeHTML(v.back.text)} ${audioBtnHTML(v.back.text, 'audio-btn-lg')}${v.back.audioUrl ? customAudioBtnHTML(v.back.audioUrl) : ''}</div>
      <div class="flashcard-pinyin pinyin">${escapeHTML(v.back.pinyinText || '')}</div>`;
      hanziVisibleNow = localState.revealed;
      hanziIsSpeakable = true;
      hanziTextForSpeech = v.back.text;
    }
  }
  // Fase 7a/K2-G -- frontImageUrl corresponde sempre a hanziSideHTML e backImageUrl a
  // transSideHTML (a troca de lados de B é tratada acima, pela estrutura do CardInstance).
  // Imagem LEGADA (`card.imageUrl`, nível de Note) nunca é duplicada no lado do verso;
  // pra cartão nativo `card.imageUrl` é sempre null.
  const resolvedFrontImageUrl = card.imageUrl || frontImageUrl || null;
  const resolvedBackImageUrl = backImageUrl || null;

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

  // Toca automaticamente quando o hanzi aparece -- reforço auditivo
  // imediato. Só dispara se já houver voz chinesa disponível, pra não
  // repetir o aviso de "instale a voz" a cada cartão de uma sessão inteira.
  // Fase 7d (ver CLAUDE.md) -- `card.__isPreviewCard` (Fase 6D.7) agora
  // isola TANTO o autoplay QUANTO o clique manual: `wireAudioButtons`
  // recebe o flag e decide, num único lugar, se um clique em `.audio-btn`
  // chama `speakChinese()` (registra `registerAudioPlay()` de verdade) ou
  // `playAudioPreview()` (mesma reprodução, sem nenhum efeito colateral de
  // analytics -- nunca STATE.totalAudioPlays/XP/badge/FSRS/histórico). O
  // autoplay abaixo continua suprimido por completo dentro do Preview
  // (mesmo comportamento já validado na Fase 7a -- nenhuma mudança aqui),
  // nunca redirecionado pra playAudioPreview() (não pedido, e "Preview sem
  // autoplay" já era o comportamento correto).
  wireAudioButtons(mountEl, card.__isPreviewCard);
  wireCustomAudioButtons(mountEl);
  if (!card.__isPreviewCard && hanziVisibleNow && hanziIsSpeakable && canSpeakChinese(hanziTextForSpeech)){
    speakChinese(hanziTextForSpeech, mountEl.querySelector('.audio-btn-lg'), true);
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


function markUnitCompleted(unitId, scorePct, { skipToast = false } = {}){
  if (STATE.unitProgress[unitId].completed) return;
  STATE.unitProgress[unitId].completed = true;
  stampUnitCompletion(STATE.unitProgress[unitId], 'lessons', todayStr());
  const idx = UNITS.findIndex(u => u.id === unitId);
  if (idx >= 0 && idx+1 < UNITS.length){
    STATE.unitProgress[UNITS[idx+1].id].unlocked = true;
  }
  addXP(25);
  registerStudyToday();
  // Faltava aqui: quem completa um Ponto de verificação como a primeira
  // atividade do dia nunca via nem a tela de sequência nem o pill do
  // topbar atualizado -- o fluxo seguinte (Missões do dia -> Trilha) não
  // chamava maybeShowStreakCelebration() em nenhum ponto.
  maybeShowStreakCelebration();
  if (typeof scorePct === 'number'){
    // Fase 6: estrelas retiradas -- STATE.daily.xp (alimentado dentro de
    // addXP()) já cobre o desafio diário equivalente ('xp50').
    registerDailyLessonCompleted(scorePct);
  }
  trackEvent('lesson_complete', 'unit_checkpoint', { unitId, scorePct });
  // skipToast: quem conclui pelo fluxo normal do checkpoint (finishCurrentLesson)
  // já vê a tela própria de "Unidade concluída!" (Fase 4) -- o toast aqui é
  // só o fallback genérico pros outros caminhos que chegam a completar uma
  // unidade sem essa tela (checkUnitCompletion via Flashcard/"Já sei?").
  if (!skipToast){
    // Pequeno atraso pra ler como sequência ("+25 XP" ... "Unidade concluída!")
    // em vez de dois toasts aparecendo ao mesmo tempo, empilhados sem ordem.
    setTimeout(() => showToast(t('zh.toast.unitDone')), 450);
  }
  saveState();
}


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
function syncSidebarToggleLabel(){
  const btn = document.getElementById('sidebar-toggle-btn');
  const txt = t(document.getElementById('app').classList.contains('sidebar-collapsed') ? 'sidebar.expand' : 'sidebar.collapse');
  btn.title = txt; btn.setAttribute('aria-label', txt);
}
syncSidebarToggleLabel();
document.getElementById('sidebar-toggle-btn').addEventListener('click', () => {
  const collapsed = document.getElementById('app').classList.toggle('sidebar-collapsed');
  localStorageSafeSet(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
  syncSidebarToggleLabel();
});

// Popula os campos de Configurações -- roda em QUALQUER entrada na aba
// (sidebar desktop ou o item "Configurações" do menu do avatar), não só
// quando o menu era o único caminho até aqui.
function renderSettingsView(){
  document.getElementById('settings-email').textContent = CURRENT_USER?.email || t('settings.account.guest');
  document.getElementById('settings-provider').textContent = CURRENT_USER?.app_metadata?.provider === 'google' ? 'Google' : (CURRENT_USER ? t('settings.account.emailPassword') : '—');
  switchSettingsSection(SETTINGS_SECTION);
}

// Alterna entre as duas seções internas de Configurações (Geral/Exportar) --
// mesmo padrão de switchAdminPanelSection (shared/admin-analytics.js).
// Lembra a última seção aberta (SETTINGS_SECTION), mesmo espírito de
// ADMIN_PANEL_STATE.section: reabrir sempre na mesma aba entre visitas.
let SETTINGS_SECTION = 'geral';
function switchSettingsSection(section){
  SETTINGS_SECTION = section;
  document.querySelectorAll('[data-settings-section]').forEach(btn => {
    const on = btn.dataset.settingsSection === section;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  document.getElementById('settings-geral-content').style.display = section === 'geral' ? '' : 'none';
  document.getElementById('settings-notifications-content').style.display = section === 'notifications' ? '' : 'none';
  document.getElementById('settings-export-content').style.display = section === 'export' ? '' : 'none';
  if (section === 'notifications' && typeof renderNotificationPreferencesView === 'function') renderNotificationPreferencesView();
}

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
    u.vocab.forEach(v => {
      if (v.c.includes(char) && !results.some(r => r.c === v.c)){
        results.push({ p: v.p, c: v.c, t: v.t });
      }
    });
    u.phrases.forEach(p => {
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
        addXP(3);
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
        addXP(3);
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

function markHanziLessonCompleted(lessonIndex){
  if (STATE.hanziLessonProgress[lessonIndex].completed) return;
  STATE.hanziLessonProgress[lessonIndex].completed = true;
  trackEvent('lesson_complete', 'hanzi_lesson', { lessonIndex });
  if (lessonIndex + 1 < HANZI_LESSONS.length){
    STATE.hanziLessonProgress[lessonIndex + 1].unlocked = true;
  }
  addXP(20);
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
