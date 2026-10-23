// ---------- Ditados: motor comum a qualquer idioma que tenha ditado ----------
// Etapa 5b da paridade (docs/historico/28-paridade-ditados.md, pedido da dona de 2026-10-23): os Ditados, que moravam
// só no fr/app.js, em código comum. Lista (com o filtro do módulo e a unidade "Revisão do A1" da trilha), player do
// áudio guiado (tocar, voltar 15 s, velocidade, volume, barra arrastável), correção palavra a palavra (a comparação em
// si mora na família do idioma: shared/core/familias/latina.js), resultado com os erros marcados, as notas, a nota
// por frase com o áudio de cada frase, e o registro da tentativa (STATE.dictations, STATE.dictationsAced).
// Não fica em shared/core/ porque tudo de lá é carregado por todos os sites, e o zh não tem Ditados (decisão da dona
// pendente, categoria B de docs/auditoria-paridade-fr-zh.md).
//
// O site liga os Ditados assim (molde: fr/ditados-config.js):
//   1. carrega os DADOS (fr/dictations.js: DICTATIONS, com { id, moduleId, level, text, free }; a tarefa traduzida
//      vem da camada do curso) e os mp3 em audio/ (o caminho é da configuração);
//   2. carrega este arquivo e depois chama registerDictations({...}) com dados + regras do idioma;
//   3. tem a seção <div class="view" id="view-dictation"> no index.html (vazia serve: wireDictationScreen() monta a
//      marcação com dictationScreenHTML()), carrega shared/ditados.css depois do <style> e chama wireDictationScreen()
//      uma vez no app.js; a aba 'dictation' chama renderDictationList(); a trilha pode pôr buildLevelReviewRow(nível);
//      o estado tem STATE.dictations ({}) e STATE.dictationsAced (0), como no fr (sanitizeDictationRecord ao juntar).
//
// Configuração (registerDictations). Obrigatórios: dictations, familia. O resto tem padrão.
//   lang                   código do idioma estudado (atributo lang="" do campo de texto; padrão 'fr')
//   dictations()           a lista de ditados (fr: () => DICTATIONS)
//   taskTranslations()     { idioma do site: { id: { task } } } (fr: window.DICTATIONS_I18N, da camada do curso)
//   familia()              a instância da família do idioma (fr: latinaFr(), FamiliaLatina.criar(LANG_HOOKS.familiaLatina)):
//                          normalização, erro leve, números por extenso, pontuação falada, homófonos, explicações
//   audioPath(d)           mp3 guiado (padrão audio/dictation-<id>-guided.mp3)
//   sentenceAudioPath(d,n) mp3 da frase n (padrão audio/dictation-<id>-s<n>.mp3)
//   sentenceAbbreviations  abreviações que NÃO fecham frase (fr: M., Mme., etc.), iguais às do gerador dos mp3
//   canSpeak(t), speak(t, botão)   voz do idioma para a frase sem mp3 (fr: canSpeakFrench / speakFrench)
//   accentPickerHTML(), wireAccentPicker(conteúdo, campo)   teclado de letras do idioma (padrão: sem teclado)
//   paywallEnabled(), premiumUnlocked()   trava Premium dos ditados com free === false (padrão: desligada)
//   tierBadgeHTML(tier), progressHTML(feitos, total)   selo Free/Premium e barra "X de Y" (fr: os dos Desafios)
//   openPremium()          janela Premium (fr: a dos Desafios)
//   backToChallenges(filtro), clearChallengesFilter()   o "voltar" da lista quando os ditados vivem dentro de outra
//                          aba (fr: Desafios); padrão: volta para a trilha
//   staticI18n             true (padrão): traduz os textos fixos da seção com dictT. O fr usa false (applyChallengeI18n
//                          dos Desafios já faz isso, com o mesmo texto).
//
// Grátis x Premium (igual ao fr de antes): 1 ditado Free por módulo (e o Free da "Revisão do A1"); os outros são
// Premium, só com o selo, porque a trava está desligada (CHALLENGE_PAYWALL_ENABLED = false no fr).
// XP: o ditado não dá XP (como sempre); conta para as conquistas (trilha Ditado: nota 90 ou mais).

let DICT_CONFIG = null;
let _dictAbbrev = null;

function dictCfg(){
  if (!DICT_CONFIG) throw new Error('Ditados sem configuração: chame registerDictations({...}) (ver shared/ditados.js)');
  return DICT_CONFIG;
}
function dictHasConfig(){ return !!DICT_CONFIG; }

function registerDictations(cfg){
  const noop = () => {};
  DICT_CONFIG = Object.assign({
    lang: 'fr',
    taskTranslations: () => window.DICTATIONS_I18N,
    audioPath: (d) => `audio/dictation-${d.id}-guided.mp3`,
    sentenceAudioPath: (d, n) => `audio/dictation-${d.id}-s${n}.mp3`,
    sentenceAbbreviations: [],
    canSpeak: () => false,
    speak: noop,
    accentPickerHTML: () => '',
    wireAccentPicker: noop,
    paywallEnabled: () => false,
    premiumUnlocked: () => true,
    tierBadgeHTML: () => '',
    progressHTML: () => '',
    openPremium: noop,
    backToChallenges: () => { switchTab('path'); },
    clearChallengesFilter: noop,
    staticI18n: true,
  }, cfg);
  _dictAbbrev = null;
  return DICT_CONFIG;
}

// A família do idioma (comparação, números, explicações): ver familia() acima.
function dictLatina(){ return dictCfg().familia(); }
function dictSentAbbreviations(){
  return _dictAbbrev || (_dictAbbrev = new Set(dictCfg().sentenceAbbreviations || []));
}
// Plural com contagem zero (o tpZero do fr/app.js, dos Desafios, quando o site tem; senão o mesmo cálculo).
function dictTpZero(key, n, params){
  if (typeof tpZero === 'function') return tpZero(key, n, params);
  return tp(key, n === 0 ? 2 : n, Object.assign({ n: 0 === n ? 0 : n }, params || {}));
}

// Textos de INTERFACE do Ditado (vieram do CHALLENGE_I18N do fr/app.js, mesmos textos e mesma ordem). dictT() lê o
// idioma do site (getUiLang, shared/i18n), cai em pt-BR e, por fim, na própria chave (igual ao chT dos Desafios,
// que também procura aqui). O CONTEÚDO do ditado (texto no idioma estudado) NÃO passa por aqui.
const DICTATION_I18N = {
  'pt-BR': {
    'dict.back.trail': '← Voltar à trilha',
    'dict.back.challenges': '← Voltar aos desafios',
    'dict.bestAttempts': 'Melhor nota: {best} · {n} {unit}',
    'dict.attempt.one': 'tentativa',
    'dict.attempt.many': 'tentativas',
    'dict.play': '▶️ Ouvir o ditado',
    'dict.pause': '⏸ Pausar',
    'dict.restart': 'Reiniciar',
    'dict.back15': 'Voltar 15s',
    'dict.fwd15': 'Avançar 15s',
    'dict.mute': 'Mudo',
    'dict.unmute': 'Ativar som',
    'dict.placeholder': 'Digite aqui o que você ouviu...',
    'dict.textAria': 'Texto do ditado',
    'dict.check': 'Verificar',
    'dict.retry': 'Tentar novamente',
    'dict.audioFail': 'Não foi possível reproduzir o áudio',
    'dict.audioUnavailable': '⚠️ Áudio indisponível',
    'dict.noAudio': '🔇 sem áudio',
    'dict.noAudioAria': 'Áudio da frase {n} indisponível neste dispositivo',
    'dict.noAudioTitle': 'Áudio indisponível neste dispositivo',
    'dict.writeFirst': 'Escreva o que você ouviu antes de verificar.',
    'dict.nearPrefix': 'Quase: ',
    'dict.note.digits': 'Por extenso: {digits} → <strong>{words}</strong>. Numa escrita de ditado, o número vai por extenso (sem desconto).',
    'dict.note.spoken': 'Você escreveu «{said}» por extenso. No ditado, escreva o sinal ({symbol}). Pequeno desconto.',
    'dict.note.punct': 'Pontuação: faltou em {n} {places} (sublinhado acima). Não desconta pontos.',
    'dict.place.one': 'lugar',
    'dict.place.many': 'lugares',
    'dict.sent.title': 'Ouça frase por frase',
    'dict.sent.flagHint': ' · as marcadas com ⚠ têm erro seu',
    'dict.sent.listenN': 'Ouvir a frase {n}',
    'dict.sent.errorAria': ' (você errou nesta frase)',
    'dict.sent.listen': '▶ ouvir frase',
    'dict.sent.flag': '⚠ você errou aqui:',
    'dict.score': 'Você escreveu <strong>{hit} de {total}</strong> palavras corretamente{light}. Você atingiu uma pontuação de {score} pontos ({score}%).',
    'dict.scoreLight': ' ({n} com pequeno desvio de grafia, valem meio ponto)',
    'dict.record': 'Melhor nota: <strong>{best}</strong> · {n} {unit}',
    'dict.reviewWords': 'Palavras para revisar:',
    'dict.static.title': 'Ditados',
    'dict.static.sub': 'Treine sua compreensão auditiva e sua ortografia com ditados baseados em tarefas reais de cada módulo.',
    'dict.static.how': '🎧 Como funciona o ditado?',
    'dict.static.s1': 'Ouça o áudio — na velocidade normal ou devagar, quantas vezes quiser.',
    'dict.static.s2': 'Digite exatamente o que você ouviu, com acentos e pontuação.',
    'dict.static.s3': 'Clique em "Verificar" para comparar sua resposta com o texto original.',
    'dict.static.s4': 'Veja o que acertou e o que precisa revisar, palavra por palavra.',
    'dict.static.backList': '← Voltar aos ditados',
    'dict.lockedTitle': 'Premium',
  },
  'en': {
    'dict.back.trail': "← Back to the Study Path",
    'dict.back.challenges': "← Back to challenges",
    'dict.bestAttempts': "Best score: {best} · {n} {unit}",
    'dict.attempt.one': "attempt",
    'dict.attempt.many': "attempts",
    'dict.play': "▶️ Listen to the dictation",
    'dict.pause': "⏸ Pause",
    'dict.restart': "Restart",
    'dict.back15': "Back 15s",
    'dict.fwd15': "Forward 15s",
    'dict.mute': "Mute",
    'dict.unmute': "Unmute",
    'dict.placeholder': "Type what you heard here...",
    'dict.textAria': "Dictation text",
    'dict.check': "Check",
    'dict.retry': "Try again",
    'dict.audioFail': "Couldn't play the audio",
    'dict.audioUnavailable': "⚠️ Audio unavailable",
    'dict.writeFirst': "Write what you heard before checking.",
    'dict.nearPrefix': "Almost: ",
    'dict.note.digits': "Spelled out: {digits} → <strong>{words}</strong>. In a dictation, write the number as words (no penalty).",
    'dict.note.spoken': "You wrote “{said}” as a word. In a dictation, write the sign ({symbol}). Small penalty.",
    'dict.note.punct': "Punctuation: missing in {n} {places} (underlined above). It doesn't cost points.",
    'dict.place.one': "place",
    'dict.place.many': "places",
    'dict.sent.title': "Listen sentence by sentence",
    'dict.sent.flagHint': " · the ones marked with ⚠ have a mistake of yours",
    'dict.sent.listenN': "Listen to sentence {n}",
    'dict.sent.errorAria': " (you made a mistake in this sentence)",
    'dict.sent.listen': "▶ listen to sentence",
    'dict.sent.flag': "⚠ you made a mistake here:",
    'dict.score': "You wrote <strong>{hit} of {total}</strong> words correctly{light}. You scored {score} points ({score}%).",
    'dict.scoreLight': " ({n} with a small spelling slip, worth half a point)",
    'dict.record': "Best score: <strong>{best}</strong> · {n} {unit}",
    'dict.reviewWords': "Words to review:",
    'dict.noAudio': "🔇 no audio", // ALTA
    'dict.noAudioAria': "Audio for sentence {n} isn't available on this device", // ALTA
    'dict.noAudioTitle': "Audio isn't available on this device", // ALTA
    'dict.static.title': "Dictations",
    'dict.static.sub': "Train your listening and spelling with dictations based on real tasks from each module.",
    'dict.static.how': "🎧 How does the dictation work?",
    'dict.static.s1': "Listen to the audio, at normal speed or slowly, as many times as you like.",
    'dict.static.s2': "Type exactly what you heard, with accents and punctuation.",
    'dict.static.s3': "Click \"Verificar\" to compare your answer with the original text.",
    'dict.static.s4': "See what you got right and what needs review, word by word.",
    'dict.static.backList': "← Back to dictations",
    'dict.lockedTitle': "Premium",
  }
};
function dictT(key, vars){
  const lang = (typeof getUiLang === 'function' && getUiLang()) || 'pt-BR';
  let str = (DICTATION_I18N[lang] && DICTATION_I18N[lang][key]);
  if (str == null) str = DICTATION_I18N['pt-BR'][key];
  if (str == null) return key;
  if (vars) str = str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] != null ? vars[name] : m));
  return str;
}

// ---------- Lista, filtro do módulo e Free x Premium ----------
let dictationModuleFilter = null;
let pendingDictationModuleFilter = null;
// Free x Premium: ditado é Free só quando d.free !== false (1 por módulo); os outros são Premium.
function dictationTier(d){ return d.free === false ? 'premium' : 'free'; }
// Ditados Premium só existem dentro da unidade do módulo -- nunca na lista
// geral de Desafios > Ditados (nem na trilha).
function dictationsVisible(moduleId){
  return moduleId ? dictCfg().dictations().filter(d => d.moduleId === moduleId) : dictCfg().dictations().filter(d => d.free !== false);
}
function isDictationLocked(d){
  return dictCfg().paywallEnabled() && d.free === false && !dictCfg().premiumUnlocked();
}
function isDictationDone(id){
  const rec = STATE.dictations && STATE.dictations[id];
  return !!(rec && rec.attempts);
}
function dictationTask(d){
  const lang = typeof getUiLang === 'function' ? getUiLang() : 'pt-BR';
  const all = dictCfg().taskTranslations();
  const ov = lang !== 'pt-BR' && all && all[lang] && all[lang][d.id];
  return (ov && ov.task) ? ov.task : d.task;
}

// Unidade "Revisão do A1" no fim do nível: ditados que juntam o conteúdo de
// 2 módulos (1 Free + 2 Premium, só rotulados por enquanto). Não depende do
// banco: os ditados vivem nos dados do site (fr: dictations.js).
function buildLevelReviewRow(level){
  const moduleId = `${level}-revisao`;
  const items = dictationsVisible(moduleId);
  if (!items.length) return null;
  const mods = modulesOfLevel(level);
  const lastModule = mods[mods.length - 1];
  const open = !dictCfg().paywallEnabled() || dictCfg().premiumUnlocked();
  const reachable = lastModule && moduleUnlocked(lastModule);
  const free = items.filter(d => d.free !== false).length;
  const premium = items.length - free;
  const block = document.createElement('div');
  block.className = 'unit-block module-challenges level-review' + (open && reachable ? '' : ' locked');
  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">✍️</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">${t('trail.levelReview.title', { level })}</span></div>
        <div class="ub-goal">${t('trail.levelReview.goal')}</div>
        <div class="ub-goal">${tp('fr.trail.freeDictation', free)}${premium ? ` · ${dictTpZero('fr.trail.premiumDictationsOnly', premium)}` : ''}</div>
      </div>
    </div>
  `;
  if (open && reachable){
    wireHeaderActivation(block.querySelector('.ub-header'), () => {
      pendingDictationModuleFilter = moduleId;
      dictCfg().clearChallengesFilter();
      switchTab('dictation');
    });
  }
  return block;
}

// ============================================================
// DITADOS
// Um ditado por módulo, ligado à tarefa comunicativa do módulo (ver
// dictations.js). Cada ditado tem um único áudio guiado pré-gerado
// (locução de abertura + leitura de reconhecimento + ditado por cláusula
// com pontuação falada e repetição + releitura final), reproduzindo a
// estrutura real de um ditado DELF A1. Scoring por alinhamento
// palavra-a-palavra (LCS) entre o texto certo e o que o aluno digitou.
// ============================================================
// Ditados de revisão do nível usam moduleId "<nível>-revisao" (não é um módulo).
function isLevelReviewId(id){ return typeof id === 'string' && id.endsWith('-revisao'); }
function moduleTitleFor(moduleId){
  if (isLevelReviewId(moduleId)) return t('fr.dictation.levelReviewTitle', { level: moduleId.split('-')[0] });
  const mod = MODULES.find(m => m.id === moduleId);
  return mod ? mod.title : '';
}

// Caminho do áudio guiado: vem da configuração do site (fr: com o site em inglês, a versão com as instruções em
// inglês, só depois que os mp3 existirem; ver fr/ditados-config.js).
function dictationAudioPath(d){
  return dictCfg().audioPath(d);
}

// Áudio do ditado em reprodução no momento (só um por vez).
let dictationAudioEl = null;

// ---- Fatia 3: áudio por frase (tela de resultado) ----
// mp3 por frase gerado pelo workflow "ditados-frases"; enquanto não existir
// (ou se der 404), cai para a voz do idioma (fr: speakFrench, voz do navegador / manifest).
function dictationSentenceAudioPath(d, n){
  return dictCfg().sentenceAudioPath(d, n);
}
let dictationSentenceAudioEl = null;
let dictationSentenceBtn = null;
const dictationSentenceMissing = new Set(); // caminhos que já deram erro nesta sessão

function stopDictationSentenceAudio(){
  if (dictationSentenceAudioEl){
    dictationSentenceAudioEl.pause();
    dictationSentenceAudioEl = null;
  }
  if (dictationSentenceBtn){ dictationSentenceBtn.classList.remove('speaking'); dictationSentenceBtn = null; }
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch(e){}
}

function playDictationSentence(d, n, sentence, btn){
  // Para o áudio guiado (sem desmontar o player, que continua na tela),
  // outros áudios de exercício/voz do navegador e a frase anterior.
  if (dictationAudioEl) dictationAudioEl.pause();
  stopExerciseAudio();
  stopDictationSentenceAudio();

  const fallback = () => {
    if (dictCfg().canSpeak(sentence)){
      dictCfg().speak(sentence, btn);
      return;
    }
    btn.disabled = true;
    btn.classList.remove('speaking');
    btn.textContent = dictT('dict.noAudio');
    btn.setAttribute('aria-label', dictT('dict.noAudioAria', { n }));
    btn.title = dictT('dict.noAudioTitle');
  };
  const path = dictationSentenceAudioPath(d, n);
  if (dictationSentenceMissing.has(path)) return fallback();

  const audio = new Audio(path);
  dictationSentenceAudioEl = audio;
  dictationSentenceBtn = btn;
  btn.classList.add('speaking');
  let failedOnce = false;
  const fail = () => {
    if (failedOnce || dictationSentenceAudioEl !== audio) return;
    failedOnce = true;
    dictationSentenceMissing.add(path);
    dictationSentenceAudioEl = null;
    dictationSentenceBtn = null;
    btn.classList.remove('speaking');
    if (btn.isConnected) fallback();
  };
  const done = () => { if (dictationSentenceAudioEl === audio){ btn.classList.remove('speaking'); dictationSentenceAudioEl = null; dictationSentenceBtn = null; } };
  audio.addEventListener('error', fail);
  audio.addEventListener('ended', done);
  audio.play().catch(err => { if (err && err.name === 'NotAllowedError') done(); else fail(); });
}

function stopDictationAudio(){
  stopDictationSentenceAudio();
  if (dictationAudioEl){
    dictationAudioEl.pause();
    dictationAudioEl = null;
  }
  isDictationScrubbing = false;
  dictationScrubHandler = null;
}

// Estado de "arrastar a barra de progresso" fica em nível de módulo, com um
// único par de listeners em window (registrado uma vez, em wireDictationScreen) — evita
// acumular listeners de window a cada vez que o player é reaberto.
let isDictationScrubbing = false;
let dictationScrubHandler = null;

function escapeHtmlDictation(str){
  return str.replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

// Linha discreta no card: melhor nota e nº de tentativas (só se já tentou).
function dictationCardProgressHTML(id){
  const rec = STATE.dictations && STATE.dictations[id];
  if (!rec || !rec.attempts) return '';
  return `<div class="dictation-card-progress">${dictT('dict.bestAttempts', { best: rec.bestScore, n: rec.attempts, unit: dictT(rec.attempts === 1 ? 'dict.attempt.one' : 'dict.attempt.many') })}</div>`;
}

function renderDictationList(){
  stopDictationAudio();
  document.getElementById('dictation-list-wrap').style.display = 'block';
  document.getElementById('dictation-player-wrap').style.display = 'none';

  const cardsWrap = document.getElementById('dictation-cards');
  const dictationsShown = dictationsVisible(dictationModuleFilter);
  // Vindo da unidade "Revisão do A1" da trilha, o "voltar" leva de volta pra trilha.
  document.getElementById('dictation-back-to-challenges').textContent = isLevelReviewId(dictationModuleFilter) ? dictT('dict.back.trail') : dictT('dict.back.challenges');
  const dictProgressEl = document.getElementById('dictation-list-progress');
  if (dictProgressEl) dictProgressEl.innerHTML = dictCfg().progressHTML(dictationsShown.filter(d => isDictationDone(d.id)).length, dictationsShown.length);
  cardsWrap.innerHTML = dictationsShown.map(d => `
    <button class="dictation-card ${isDictationLocked(d) ? 'locked' : ''}" data-dict-id="${d.id}">
      ${isDictationLocked(d) ? `<span class="challenge-card-check" title="${dictT('dict.lockedTitle')}">🔒</span>` : ''}
      <div class="dictation-card-level">${d.level}</div>
      <div class="dictation-card-task">${escapeHtmlDictation(dictationTask(d))}</div>
      <div class="dictation-card-module">${escapeHtmlDictation(moduleTitleFor(d.moduleId))}</div>
      ${dictationCardProgressHTML(d.id)}
      ${dictCfg().tierBadgeHTML(dictationTier(d))}
    </button>
  `).join('');

  cardsWrap.querySelectorAll('.dictation-card').forEach(card => {
    card.addEventListener('click', () => {
      const d = dictCfg().dictations().find(x => x.id === card.dataset.dictId);
      if (d && isDictationLocked(d)) return dictCfg().openPremium();
      openDictationPlayer(card.dataset.dictId);
    });
  });
}

function openDictationPlayer(id){
  const d = dictCfg().dictations().find(x => x.id === id);
  if (!d) return;

  trackEvent('lesson_start', 'dictation', { dictationId: d.id });
  stopDictationAudio();
  document.getElementById('dictation-list-wrap').style.display = 'none';
  document.getElementById('dictation-player-wrap').style.display = 'block';

  const content = document.getElementById('dictation-player-content');
  content.innerHTML = `
    <div class="dictation-player-task">${escapeHtmlDictation(dictationTask(d))}</div>
    <p class="dictation-player-module">${d.level} · ${escapeHtmlDictation(moduleTitleFor(d.moduleId))}</p>
    <div class="dictation-audio-player">
      <div class="dictation-transport">
        <button class="dictation-play-btn" id="dictation-play-btn">${dictT('dict.play')}</button>
        <button class="dictation-icon-btn" id="dictation-restart-btn" aria-label="${dictT('dict.restart')}" title="${dictT('dict.restart')}">↺</button>
      </div>
      <div class="dictation-scrub-row">
        <span class="dictation-time" id="dictation-time-current">00:00</span>
        <div class="dictation-progress-track" id="dictation-progress-track">
          <div class="dictation-progress-fill" id="dictation-progress-fill"></div>
          <div class="dictation-progress-handle" id="dictation-progress-handle"></div>
        </div>
        <span class="dictation-time" id="dictation-time-total">00:00</span>
      </div>
      <div class="dictation-secondary-controls">
        <div class="dictation-skip-controls">
          <button class="dictation-skip-btn" id="dictation-skip-back" title="${dictT('dict.back15')}">-15s</button>
          <button class="dictation-skip-btn" id="dictation-skip-fwd" title="${dictT('dict.fwd15')}">+15s</button>
        </div>
        <div class="dictation-volume-control">
          <button class="dictation-icon-btn" id="dictation-mute-btn" aria-label="${dictT('dict.mute')}" title="${dictT('dict.mute')}">🔊</button>
          <input type="range" class="dictation-volume-slider" id="dictation-volume-slider" min="0" max="100" value="100">
        </div>
        <div class="dictation-speed-controls">
          <button class="dictation-speed-btn" data-speed="0.75">0.75x</button>
          <button class="dictation-speed-btn active" data-speed="1">1x</button>
          <button class="dictation-speed-btn" data-speed="1.5">1.5x</button>
        </div>
      </div>
    </div>
    <textarea class="dictation-textarea" id="dictation-input" placeholder="${dictT('dict.placeholder')}" aria-label="${dictT('dict.textAria')}" lang="${dictCfg().lang}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="${Math.max(400, d.text.length * 3)}"></textarea>
    ${dictCfg().accentPickerHTML()}
    <div class="dictation-actions">
      <button class="btn btn-primary" id="dictation-check-btn">${dictT('dict.check')}</button>
      <button class="btn btn-secondary" id="dictation-retry-btn" style="display:none;">${dictT('dict.retry')}</button>
    </div>
    <div id="dictation-result-wrap"></div>
  `;

  dictationAudioEl = new Audio(dictationAudioPath(d));
  dictCfg().wireAccentPicker(content, document.getElementById('dictation-input'));
  const playBtn = document.getElementById('dictation-play-btn');
  const progressFill = document.getElementById('dictation-progress-fill');
  const progressHandle = document.getElementById('dictation-progress-handle');
  const progressTrack = document.getElementById('dictation-progress-track');
  const timeCurrentEl = document.getElementById('dictation-time-current');
  const timeTotalEl = document.getElementById('dictation-time-total');
  const muteBtn = document.getElementById('dictation-mute-btn');
  const volumeSlider = document.getElementById('dictation-volume-slider');

  playBtn.addEventListener('click', () => {
    if (dictationAudioEl.paused){
      stopDictationSentenceAudio();
      dictationAudioEl.play().catch(() => showToast(dictT('dict.audioFail')));
    } else {
      dictationAudioEl.pause();
    }
  });
  document.getElementById('dictation-restart-btn').addEventListener('click', () => {
    dictationAudioEl.currentTime = 0;
  });
  document.getElementById('dictation-skip-back').addEventListener('click', () => {
    dictationAudioEl.currentTime = Math.max(0, dictationAudioEl.currentTime - 15);
  });
  document.getElementById('dictation-skip-fwd').addEventListener('click', () => {
    dictationAudioEl.currentTime = Math.min(dictationAudioEl.duration || Infinity, dictationAudioEl.currentTime + 15);
  });
  content.querySelectorAll('.dictation-speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.dictation-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dictationAudioEl.playbackRate = parseFloat(btn.dataset.speed);
    });
  });

  // Volume: slider controla o volume; botão de mudo alterna com o volume
  // anterior salvo, igual ao padrão de qualquer player de áudio.
  let volumeBeforeMute = 1;
  volumeSlider.addEventListener('input', () => {
    const v = parseInt(volumeSlider.value, 10) / 100;
    dictationAudioEl.volume = v;
    dictationAudioEl.muted = false;
    muteBtn.textContent = v === 0 ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', v === 0 ? dictT('dict.unmute') : dictT('dict.mute'));
    muteBtn.title = v === 0 ? dictT('dict.unmute') : dictT('dict.mute');
  });
  muteBtn.addEventListener('click', () => {
    if (dictationAudioEl.muted || dictationAudioEl.volume === 0){
      dictationAudioEl.muted = false;
      dictationAudioEl.volume = volumeBeforeMute || 1;
      volumeSlider.value = Math.round(dictationAudioEl.volume * 100);
      muteBtn.textContent = '🔊';
      muteBtn.setAttribute('aria-label', dictT('dict.mute'));
      muteBtn.title = dictT('dict.mute');
    } else {
      volumeBeforeMute = dictationAudioEl.volume;
      dictationAudioEl.muted = true;
      volumeSlider.value = 0;
      muteBtn.textContent = '🔇';
      muteBtn.setAttribute('aria-label', dictT('dict.unmute'));
      muteBtn.title = dictT('dict.unmute');
    }
  });

  // Barra de progresso arrastável: clique ou arraste em qualquer ponto da
  // faixa pula o áudio pra aquele instante (igual ao player do lingua.com).
  function seekToClientX(clientX){
    if (!dictationAudioEl.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    dictationAudioEl.currentTime = ratio * dictationAudioEl.duration;
  }
  dictationScrubHandler = seekToClientX;
  progressTrack.addEventListener('pointerdown', (e) => {
    isDictationScrubbing = true;
    seekToClientX(e.clientX);
  });

  function formatDictationTime(seconds){
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  dictationAudioEl.addEventListener('play', () => {
    playBtn.textContent = dictT('dict.pause');
    playBtn.classList.add('speaking');
  });
  dictationAudioEl.addEventListener('pause', () => {
    playBtn.textContent = dictT('dict.play');
    playBtn.classList.remove('speaking');
  });
  dictationAudioEl.addEventListener('ended', () => {
    playBtn.textContent = dictT('dict.play');
    playBtn.classList.remove('speaking');
  });
  // Usa o próprio elemento do evento (e.target), não a variável global: ao
  // sair do ditado, stopDictationAudio() faz pause() e zera a global, mas o
  // navegador ainda dispara 'timeupdate' depois do pause -- ler a global
  // aí dava "Cannot read properties of null (reading 'duration')".
  dictationAudioEl.addEventListener('loadedmetadata', (e) => {
    timeTotalEl.textContent = formatDictationTime(e.target.duration);
  });
  dictationAudioEl.addEventListener('timeupdate', (e) => {
    const a = e.target;
    if (a.duration){
      const pct = (a.currentTime / a.duration) * 100;
      progressFill.style.width = `${pct}%`;
      progressHandle.style.left = `${pct}%`;
    }
    timeCurrentEl.textContent = formatDictationTime(a.currentTime);
  });
  dictationAudioEl.addEventListener('error', () => {
    showToast(dictT('dict.audioFail'));
    playBtn.disabled = true;
    playBtn.textContent = dictT('dict.audioUnavailable');
  });

  document.getElementById('dictation-check-btn').addEventListener('click', () => {
    const userText = document.getElementById('dictation-input').value;
    if (!userText.trim()){ showToast(dictT('dict.writeFirst')); return; }
    renderDictationResult(d, userText);
  });

  document.getElementById('dictation-retry-btn').addEventListener('click', () => {
    stopDictationSentenceAudio();
    document.getElementById('dictation-input').value = '';
    document.getElementById('dictation-result-wrap').innerHTML = '';
    document.getElementById('dictation-retry-btn').style.display = 'none';
    document.getElementById('dictation-check-btn').style.display = 'inline-flex';
  });
}

// BEGIN dictation-answer-logic (extraído literalmente por fr/scripts/test_answer_validation.js -- não mover/renomear estes marcadores sem atualizar o teste)
// Correção do ditado, em 2 níveis de comparação:
//  - ESTRITA (normalizeDictationWord): exige a grafia exata -- acento, hífen e
//    apóstrofo contam. Só ignora maiúscula, pontuação e variantes tipográficas
//    (aspas curvas, hífen especial do celular).
//  - FROUXA (dictLooseNorm): tira acento, hífen, apóstrofo e œ->oe. Serve pra
//    ALINHAR as palavras. Se alinham só pela forma frouxa, é "erro leve":
//    vale meio ponto e a tela explica o que faltou.
// Pontuação não desconta ponto (só é marcada); número em dígito é aceito e a
// tela mostra a escrita por extenso.
// Família latina, fase 2 (docs/i18n/familia-latina-modulo.md): a correção mora em
// shared/core/familias/latina.js; os dados do idioma (fr: pontuação falada, números,
// homófonos, concordância) e as explicações (catálogo de tradução, t()) estão na
// configuração da família (fr: LANG_HOOKS.familiaLatina, fr/lang-hooks.js), que chega aqui
// por dictLatina() (registerDictations({ familia })). Os nomes abaixo continuam os mesmos.
// Mudanças autorizadas pela dona (2026-10-15): número em dígito que o próprio texto
// escreve em dígito fica como está; dois erros leves na mesma palavra (reason
// 'multiple', com a lista em `reasons`) citam os dois; a explicação sai no idioma do site.
function normalizeDictationWord(w){
  return dictLatina().normalizarPalavraDitado(w);
}
function dictLooseNorm(w){
  return dictLatina().palavraFrouxaDitado(w);
}
function dictLightReason(cs, us){
  return dictLatina().motivoErroLeve(cs, us);
}
// Número por extenso no idioma do ditado (o nome antigo ficou: os testes e o histórico citam frenchNumberWords).
function frenchNumberWords(n){
  return dictLatina().cfg.numeroPorExtenso(n);
}

// Limpa o que o teclado do celular costuma bagunçar, antes de comparar.
function prepareDictationUserText(text, refText){
  return dictLatina().prepararTextoDitado(text, refText);
}

// Separa as palavras reais da pontuação "solta" (ex: "!" ou "?" digitados
// com espaço antes, como manda a tipografia francesa). A pontuação solta
// não participa do alinhamento: fica anexada à palavra anterior.
function tokenizeDictationText(text){
  return dictLatina().tokenizarDitado(text);
}

// "vingt cinq" digitado no lugar de "vingt-cinq": junta as palavras do aluno
// (sem hífen, então conta como erro leve de hífen e não como 2 erros).
function mergeSplitCompoundWords(userTok, refTok){
  return dictLatina().juntarCompostos(userTok, refTok);
}

// Alinha as palavras do texto certo com as que o aluno digitou via LCS
// (mesma ideia de um diff de texto), pra marcar acertos/erros mesmo quando
// o aluno pula ou adianta uma palavra, sem desalinhar o resto da frase.
function diffDictationWords(correctText, userText){
  return dictLatina().diffDitado(correctText, userText);
}

// Junta um "miss" (palavra certa que faltou) adjacente a um "extra" (palavra
// errada que o aluno digitou) numa única substituição.
function mergeDictationDiff(diff){
  return dictLatina().juntarDiff(diff);
}

// Corrige um ditado inteiro. Nota: acerto exato = 1 ponto; erro leve = 0,5;
// palavra a mais (que não é troca) e pontuação escrita por extenso = -0,5.
// Pontuação faltando e número em dígito não descontam nada.
function evaluateDictation(refText, userText){
  return dictLatina().avaliarDitado(refText, userText);
}

// ---- Fatia 2: explicar o tipo de erro (só explicativo, NÃO muda a nota) ----
// Conservador de propósito: só nomeia o erro quando há alta confiança.
// Devolve { kind: 'homophone'|'agreement'|'other', noteText } para uma troca
// (token "sub"): refWord = palavra do texto, userWord = o que o aluno digitou.
function classifyDictationError(refWord, userWord){
  const r = dictLatina().classificarErroDitado(refWord, userWord);
  return { kind: r.kind, noteText: r.noteText };
}

// ---- Fatia 2: progresso por ditado (puro, sem STATE) ----
const DICT_WRONG_WORDS_MAX = 30;
function dictDisplayWord(w){
  return String(w || '').replace(/^[«"(\s]+|[.,!?;:…»")\s]+$/g, '').trim();
}
// Palavras do TEXTO que o aluno errou, faltou ou escreveu com desvio leve
// nesta tentativa (deduplicadas sem diferenciar maiúscula, no máx. 30).
function dictationWrongWords(evaluation){
  const out = [], seen = new Set();
  for (const x of (evaluation && evaluation.merged) || []){
    let w = null;
    if (x.type === 'sub') w = x.correct;
    else if (x.type === 'miss') w = x.word;
    else if (x.type === 'match' && x.light) w = x.word;
    w = dictDisplayWord(w);
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(w);
    if (out.length >= DICT_WRONG_WORDS_MAX) break;
  }
  return out;
}
function sanitizeDictationRecord(rec){
  const r = rec && typeof rec === 'object' ? rec : {};
  const num = v => (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  return {
    bestScore: num(r.bestScore),
    attempts: (typeof r.attempts === 'number' && isFinite(r.attempts) && r.attempts > 0) ? Math.floor(r.attempts) : 0,
    lastScore: num(r.lastScore),
    lastAt: typeof r.lastAt === 'string' ? r.lastAt : null,
    wrongWords: Array.isArray(r.wrongWords) ? r.wrongWords.filter(w => typeof w === 'string' && w).slice(0, DICT_WRONG_WORDS_MAX) : []
  };
}
// Registro novo depois de uma correção. bestScore nunca diminui.
function updateDictationRecord(prev, evaluation, now){
  const p = sanitizeDictationRecord(prev);
  const score = (evaluation && typeof evaluation.score === 'number') ? Math.max(0, Math.min(100, Math.round(evaluation.score))) : 0;
  const when = now instanceof Date ? now : new Date(now === undefined ? Date.now() : now);
  return {
    bestScore: Math.max(p.bestScore, score),
    attempts: p.attempts + 1,
    lastScore: score,
    lastAt: isNaN(when.getTime()) ? null : when.toISOString(),
    wrongWords: dictationWrongWords(evaluation)
  };
}

// ---- Fatia 3: divisão em frases (áudio por frase) ----
// MESMA regra de fr/scripts/dictation_sentences.py (o gerador dos mp3
// audio/dictation-<id>-s<N>.mp3). Se mudar uma, mude a outra: o N do mp3 é a
// posição da frase nesta lista (começa em 1). As abreviações (fr: M., Mme., etc.) vêm da
// configuração do site (sentenceAbbreviations), porque são do idioma.
const DICT_SENT_END_RE = /[.!?…]+["'»”)\]]*$/;
const DICT_SENT_CLOSERS_RE = /["'»”)\]]+$/;
const DICT_SENT_ONLY_CLOSERS_RE = /^["'»”)\]]+$/;
const DICT_SENT_INITIAL_RE = /^[A-Z]\.$/;
function dictIsAbbreviation(token){
  const core = token.replace(DICT_SENT_CLOSERS_RE, '');
  return dictSentAbbreviations().has(core) || DICT_SENT_INITIAL_RE.test(core);
}
function splitDictationSentences(text){
  const sentences = [];
  let current = [];
  for (const tok of String(text || '').split(/\s+/)){
    if (!tok) continue;
    if (!current.length && sentences.length && DICT_SENT_ONLY_CLOSERS_RE.test(tok)){
      sentences[sentences.length - 1] += ' ' + tok;
      continue;
    }
    current.push(tok);
    if (DICT_SENT_END_RE.test(tok) && !dictIsAbbreviation(tok)){
      sentences.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) sentences.push(current.join(' '));
  return sentences.filter(s => s.trim());
}
// Para cada frase do texto, true se o aluno errou alguma palavra dela
// (troca, palavra faltando, erro leve) ou digitou palavra a mais ali.
// Só explicativo: NÃO muda a nota.
function dictationSentenceErrorFlags(refText, evaluation){
  const sentences = splitDictationSentences(refText);
  const sentenceOfWord = [];
  sentences.forEach((s, si) => {
    const n = tokenizeDictationText(s).words.length;
    for (let k = 0; k < n; k++) sentenceOfWord.push(si);
  });
  const flags = sentences.map(() => false);
  if (!sentences.length) return flags;
  const at = c => sentenceOfWord[Math.max(0, Math.min(c, sentenceOfWord.length - 1))];
  let c = 0;
  for (const x of (evaluation && evaluation.merged) || []){
    if (x.type === 'extra'){ const s = at(c - 1); if (s !== undefined) flags[s] = true; continue; }
    const s = sentenceOfWord[c];
    if (s !== undefined && (x.type === 'miss' || x.type === 'sub' || (x.type === 'match' && x.light))) flags[s] = true;
    c++;
  }
  return flags;
}
// END dictation-answer-logic

function dictationScoreColorVar(score){
  if (score >= 80) return 'var(--jade)';
  if (score >= 60) return 'var(--imperial-gold)';
  return 'var(--seal-red-dark)';
}

function dictationWordHtml(word, punctAfter, missingMarks, cls, title){
  const esc = escapeHtmlDictation;
  const titleAttr = title ? ` title="${esc(title)}"` : '';
  if (!missingMarks){
    return `<span class="${cls}"${titleAttr}>${esc(word)}</span>${punctAfter ? ' ' + esc(punctAfter) : ''}`;
  }
  const m = word.match(/^(.*?)([.,!?;:…]+)$/);
  const core = m ? m[1] : word, trail = m ? m[2] : '';
  return `<span class="${cls}"${titleAttr}>${esc(core)}</span><span class="dictation-punct-missing" title="${esc(t('fr.dict.punctMissing'))}">${esc(trail)}${punctAfter ? ' ' + esc(punctAfter) : ''}</span>`;
}

// Explicação do erro leve (hífen, apóstrofo, ligadura, acento, ou mais de um na
// mesma palavra), no idioma do site: shared/core/familias/latina.js + t().
function dictationLightNoteText(x){
  return dictLatina().textoErroLeve(x);
}

function renderDictationResult(d, userText){
  const ev = evaluateDictation(d.text, userText);
  const { merged, total, score } = ev;
  trackEvent('lesson_complete', 'dictation', { dictationId: d.id, score });
  // Fatia 2: grava a tentativa (melhor nota nunca diminui).
  const rec = updateDictationRecord(STATE.dictations[d.id], ev, new Date());
  STATE.dictations[d.id] = rec;
  if (score >= 90) STATE.dictationsAced = (STATE.dictationsAced || 0) + 1; // conquistas: trilha Ditado
  saveState();

  const wordsHtml = merged.map(x => {
    if (x.type === 'match'){
      return x.light
        ? dictationWordHtml(x.word, x.punctAfter, x.missingMarks, 'dictation-word-near', dictT('dict.nearPrefix') + dictationLightNoteText(x))
        : dictationWordHtml(x.word, x.punctAfter, x.missingMarks, 'dictation-word', '');
    }
    const punct = x.punctAfter ? ` ${escapeHtmlDictation(x.punctAfter)}` : '';
    if (x.type === 'sub') return `<span class="dictation-word-wrong" title="${escapeHtmlDictation(classifyDictationError(x.correct, x.wrong).noteText)}">${escapeHtmlDictation(x.wrong)}</span> <span class="dictation-word-correct">${escapeHtmlDictation(x.correct)}</span>${punct}`;
    if (x.type === 'miss') return `<span class="dictation-word-correct">${escapeHtmlDictation(x.word)}</span>${punct}`;
    return `<span class="dictation-word-wrong">${escapeHtmlDictation(x.word)}</span>`;
  }).join(' ');

  const notes = [];
  merged.filter(x => x.type === 'match' && x.light).forEach(x => notes.push(dictationLightNoteText(x)));
  merged.filter(x => x.type === 'sub').forEach(x => notes.push(classifyDictationError(x.correct, x.wrong).noteText));
  ev.digitNotes.forEach(n => notes.push({ html: dictT('dict.note.digits', { digits: n.digits, words: escapeHtmlDictation(n.words) }) }));
  ev.spokenPunct.forEach(p => notes.push({ html: dictT('dict.note.spoken', { said: escapeHtmlDictation(p.said), symbol: escapeHtmlDictation(p.symbol) }) }));
  if (ev.missingMarks > 0) notes.push({ html: dictT('dict.note.punct', { n: ev.missingMarks, places: dictT(ev.missingMarks === 1 ? 'dict.place.one' : 'dict.place.many') }) });
  const notesHtml = notes.length
    ? `<ul class="dictation-notes">${notes.map(n => `<li>${n && n.html ? n.html : escapeHtmlDictation(n)}</li>`).join('')}</ul>`
    : '';
  const hit = ev.exact + ev.light;

  // Fatia 3: o texto certo frase por frase, cada uma com seu áudio; as frases
  // em que o aluno errou ficam marcadas (texto + borda, não só cor).
  stopDictationSentenceAudio();
  const sentences = splitDictationSentences(d.text);
  const sentenceFlags = dictationSentenceErrorFlags(d.text, ev);
  const sentencesHtml = sentences.length ? `
      <div class="dictation-sentences">
        <p class="dictation-sentences-title"><strong>${dictT('dict.sent.title')}</strong>${sentenceFlags.some(Boolean) ? dictT('dict.sent.flagHint') : ''}</p>
        <ol class="dictation-sentence-list">
          ${sentences.map((s, i) => `
          <li class="dictation-sentence${sentenceFlags[i] ? ' has-error' : ''}">
            <button type="button" class="dictation-sentence-play" data-sentence="${i + 1}" aria-label="${dictT('dict.sent.listenN', { n: i + 1 })}${sentenceFlags[i] ? dictT('dict.sent.errorAria') : ''}">${dictT('dict.sent.listen')}</button>
            <span class="dictation-sentence-text">${sentenceFlags[i] ? `<span class="dictation-sentence-flag">${dictT('dict.sent.flag')}</span> ` : ''}${escapeHtmlDictation(s)}</span>
          </li>`).join('')}
        </ol>
      </div>` : '';

  const wrap = document.getElementById('dictation-result-wrap');
  wrap.innerHTML = `
    <div class="dictation-result" tabindex="-1">
      <div class="dictation-result-text">${wordsHtml}</div>
      <div class="dictation-result-summary">
        <div class="dictation-score-badge" style="background:${dictationScoreColorVar(score)};">${score}</div>
        <p class="dictation-score-text">${dictT('dict.score', { hit, total, light: ev.light ? dictT('dict.scoreLight', { n: ev.light }) : '', score })}</p>
      </div>
      <p class="dictation-record-line">${dictT('dict.record', { best: rec.bestScore, n: rec.attempts, unit: dictT(rec.attempts === 1 ? 'dict.attempt.one' : 'dict.attempt.many') })}</p>
      ${notesHtml}
      ${rec.wrongWords.length ? `<p class="dictation-review-words"><strong>${dictT('dict.reviewWords')}</strong> ${rec.wrongWords.map(escapeHtmlDictation).join(', ')}</p>` : ''}
      ${sentencesHtml}
    </div>
  `;
  wrap.querySelectorAll('.dictation-sentence-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.sentence, 10);
      playDictationSentence(d, n, sentences[n - 1], btn);
    });
  });

  document.getElementById('dictation-check-btn').style.display = 'none';
  document.getElementById('dictation-retry-btn').style.display = 'inline-flex';
  const box = wrap.firstElementChild;
  if (box){ box.scrollIntoView({ behavior: 'smooth', block: 'start' }); try { box.focus({ preventScroll: true }); } catch(e){} }
}

// ---------- Marcação da seção e ligação dos botões ----------
// A seção do Ditado (igual à do fr/index.html; tests/paridade-sites/test_ditados_motor.js confere). Um site novo
// pode deixar <div class="view" id="view-dictation"></div> vazia: wireDictationScreen() põe esta marcação.
function dictationScreenHTML(){
  return `
    <div id="dictation-list-wrap">
      <button class="back-link" id="dictation-back-to-challenges">${dictT('dict.back.challenges')}</button>
      <div class="path-header">
        <h2 data-ch-i18n="dict.static.title">${dictT('dict.static.title')}</h2>
        <p data-ch-i18n="dict.static.sub">${dictT('dict.static.sub')}</p>
      </div>

      <div class="dictation-explainer" id="dictation-explainer">
        <button class="dictation-explainer-toggle" id="dictation-explainer-toggle" data-ch-i18n="dict.static.how">${dictT('dict.static.how')}</button>
        <ol class="dictation-explainer-steps" id="dictation-explainer-steps">
          <li data-ch-i18n="dict.static.s1">${dictT('dict.static.s1')}</li>
          <li data-ch-i18n="dict.static.s2">${dictT('dict.static.s2')}</li>
          <li data-ch-i18n="dict.static.s3">${dictT('dict.static.s3')}</li>
          <li data-ch-i18n="dict.static.s4">${dictT('dict.static.s4')}</li>
        </ol>
      </div>

      <div id="dictation-list-progress"></div>
      <div class="dictation-cards" id="dictation-cards"></div>
    </div>

    <div id="dictation-player-wrap" style="display:none;">
      <button class="back-link" id="dictation-back-to-list" data-ch-i18n="dict.static.backList">${dictT('dict.static.backList')}</button>
      <div id="dictation-player-content"></div>
    </div>
  `;
}

// Textos fixos da seção no idioma do site (só quando o site não tem o applyChallengeI18n dos Desafios: staticI18n).
function applyDictationI18n(){
  document.querySelectorAll('#view-dictation [data-ch-i18n]').forEach(el => { el.innerHTML = dictT(el.dataset.chI18n); });
}

// Liga a tela uma vez (o fr chama no mesmo ponto do carregamento em que estes listeners eram registrados).
function wireDictationScreen(){
  const view = document.getElementById('view-dictation');
  if (view && !view.children.length) view.innerHTML = dictationScreenHTML();
  window.addEventListener('pointermove', (e) => {
    if (isDictationScrubbing && dictationScrubHandler) dictationScrubHandler(e.clientX);
  });
  window.addEventListener('pointerup', () => { isDictationScrubbing = false; });

  document.getElementById('dictation-explainer-toggle').addEventListener('click', () => {
    document.getElementById('dictation-explainer-toggle').classList.toggle('collapsed');
    document.getElementById('dictation-explainer-steps').classList.toggle('collapsed');
  });

  document.getElementById('dictation-back-to-list').addEventListener('click', renderDictationList);
  document.getElementById('dictation-back-to-challenges').addEventListener('click', () => {
    if (isLevelReviewId(dictationModuleFilter)){ dictationModuleFilter = null; switchTab('path'); return; }
    // Veio da unidade "Desafios do Módulo N"? Volta pro mesmo recorte (fr: aba Desafios; ver backToChallenges).
    dictCfg().backToChallenges(dictationModuleFilter);
  });
  if (dictCfg().staticI18n){
    applyDictationI18n();
    window.addEventListener('i18n:change', applyDictationI18n);
  }
}
