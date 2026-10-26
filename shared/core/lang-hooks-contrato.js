// CONTRATO ÚNICO dos LANG_HOOKS (melhoria 1 da revisão de arquitetura, docs/revisao-codigo-compartilhado-arquitetura.md
// seção 5; aprovada pela dona em 2026-10-26). LANG_HOOKS é o objeto que cada site declara em <site>/lang-hooks.js com o
// que muda de um idioma estudado para outro; o código comum (shared/) só lê LANG_HOOKS.<gancho>.
//
// Este arquivo é a LISTA de todos os ganchos, num lugar só: tipo, se é obrigatório (sempre, ou só quando o site tem
// módulos, Teste de Nível ou é de uma família), o padrão NEUTRO quando existe (vazio, identidade, nada; nunca texto de um
// idioma) e para que serve. Um site novo (pt) preenche esta lista; nada mais.
//
// Uso (carregado ANTES de <site>/lang-hooks.js, depois de content.js e languages/registry.js):
//   const LANG_HOOKS = defineLangHooks({ ...ganchos do site... });
// defineLangHooks aplica os padrões neutros que faltarem e, no navegador, avisa no console (console.error) o gancho
// obrigatório que faltar e o gancho que não está aqui; o app continua (o erro de verdade aparece no teste).
// Guarda: tests/paridade-sites/test_contrato_lang_hooks.js (descobre os sites sozinho; falha se faltar gancho obrigatório,
// se uma chave de texto não existir em pt-BR/en, ou se o código comum ler um gancho que não está documentado aqui).
//
// Tipos: 'function', 'string', 'number', 'object' e 'textKey' (string que é chave de texto do catálogo shared/i18n:
// tem de existir em pt-BR e em en). Em 'object': `chaves` = subchaves obrigatórias (fechado: o código comum só pode ler
// essas), `chavesOpcionais` = subchaves que podem faltar, `textos: true` = os valores são chaves de texto,
// `aberto: true` = objeto documentado em outro arquivo (ex.: família latina).
// Obrigatoriedade: `obrigatorio: true` (todo site), `obrigatorioSe: 'modulos' | 'testeDeNivel' | 'familia:<id>'`,
// ou nada (opcional; o código comum confere antes de usar).
//
// Grátis x Premium: infraestrutura, nada muda para a aluna.

const LANG_HOOKS_CONTRATO = {
  // ---------- Voz do idioma estudado (shared/core/voz.js, audio-fala.js) ----------
  speak:               { tipo: 'function', obrigatorio: true, desc: 'toca o texto (mp3 pré-gerado ou voz do navegador) e registra o áudio tocado: (texto, botão, autoplay)' },
  speakAudioOnly:      { tipo: 'function', obrigatorio: true, desc: 'só toca, sem registrar (prévia do editor)' },
  loadVoice:           { tipo: 'function', obrigatorio: true, desc: 'recarrega a voz do navegador do idioma' },
  canSpeak:            { tipo: 'function', obrigatorio: true, desc: 'dá para tocar este texto? (autoplay)' },
  ttsLang:             { tipo: 'string',   obrigatorio: true, desc: "idioma da voz do navegador ('fr-FR', 'zh-CN')" },
  ttsRate:             { tipo: 'number',   obrigatorio: true, desc: 'velocidade da voz do navegador' },
  ttsText:             { tipo: 'function', padrao: (s) => s, desc: 'texto que vai para a voz (o fr lê "brésilien·ne" como as duas formas)' },
  pregenRate:          { tipo: 'function', obrigatorio: true, desc: 'velocidade do mp3 pré-gerado' },
  voiceMissingKey:     { tipo: 'textKey',  obrigatorio: true, desc: 'aviso "voz do idioma não encontrada"' },
  audioRetryFailedKey: { tipo: 'textKey',  obrigatorio: true, desc: 'aviso quando a 2ª tentativa da voz também falha' },
  audioListenKey:      { tipo: 'textKey',  obrigatorio: true, desc: 'rótulo do botão de ouvir' },

  // ---------- Identidade do site ----------
  appKey:              { tipo: 'string',   obrigatorio: true, desc: 'appKey do registro de idiomas (frances, mandarim, portugues)' },
  studyNotifKey:       { tipo: 'string',   obrigatorio: true, desc: 'chave do localStorage do último lembrete de estudo' },
  uiKey:               { tipo: 'function', obrigatorio: true, desc: "chave de texto do site a partir do sufixo (fr: 'fr.' + k); os sufixos usados pelo código comum precisam existir" },

  // ---------- Texto do item (palavra, frase, fala) ----------
  textOf:              { tipo: 'function', obrigatorio: true, desc: 'texto no idioma estudado de um item (fr: x.f; zh: x.c)' },
  recapText:           { tipo: 'function', obrigatorio: true, desc: 'texto do item na recapitulação da lição' },
  recapExtra:          { tipo: 'function', padrao: () => '', desc: 'HTML extra da recapitulação (zh: pinyin)' },
  foldCase:            { tipo: 'function', padrao: (s) => s, desc: 'forma de comparar sem maiúscula (fr: minúsculas; zh: igual)' },
  dlgLineText:         { tipo: 'function', obrigatorio: true, desc: 'texto falado de uma fala do diálogo' },
  phraseSpoken:        { tipo: 'function', obrigatorio: true, desc: 'texto falado de uma frase' },
  clozeSpoken:         { tipo: 'function', obrigatorio: true, desc: 'texto falado do exercício de lacuna' },
  phraseHasWord:       { tipo: 'function', obrigatorio: true, desc: '(palavra) => (frase) => a frase contém a palavra?' },
  setFlyContent:       { tipo: 'function', obrigatorio: true, desc: 'põe o conteúdo do bloco que "voa" no exercício de ordenar' },
  flySource:           { tipo: 'function', obrigatorio: true, desc: 'conteúdo do botão de origem do bloco que voa' },
  reorderAttemptSep:   { tipo: 'string',   obrigatorio: true, desc: "separador dos blocos na resposta montada (fr: ' '; zh: '')" },

  // ---------- Marcação (HTML) das telas ----------
  conceptExampleHTML:      { tipo: 'function', obrigatorio: true, desc: 'exemplo do passo de conceito' },
  tfPinyinHTML:            { tipo: 'function', padrao: () => '', desc: 'transcrição no Verdadeiro ou Falso (zh)' },
  promptClass:             { tipo: 'string',   obrigatorio: true, desc: 'classe CSS do enunciado do cartão' },
  promptPinyinHTML:        { tipo: 'function', padrao: () => '', desc: 'transcrição abaixo do enunciado (zh)' },
  scenarioOptionHTML:      { tipo: 'function', obrigatorio: true, desc: 'opção do exercício de cenário' },
  phraseAnswerHTML:        { tipo: 'function', obrigatorio: true, desc: 'resposta certa do exercício de cenário' },
  speedPromptHTML:         { tipo: 'function', obrigatorio: true, desc: 'enunciado da Revisão rápida (texto escapado)' },
  clozeCorrectHTML:        { tipo: 'function', obrigatorio: true, desc: 'linha "resposta certa" da lacuna' },
  phraseFeedbackHTML:      { tipo: 'function', obrigatorio: true, desc: 'devolutiva de frase (frase, tradução, linha certa)' },
  dlgLineHTML:             { tipo: 'function', obrigatorio: true, desc: 'fala do diálogo com destaque do vocabulário' },
  dlgBubbleHTML:           { tipo: 'function', obrigatorio: true, desc: 'balão do diálogo (com lacuna)' },
  dlgOptionHTML:           { tipo: 'function', obrigatorio: true, desc: 'opção do exercício do diálogo' },
  dlgSide:                 { tipo: 'function', obrigatorio: true, desc: 'lado do balão de quem fala' },
  dlgWordToast:            { tipo: 'function', obrigatorio: true, desc: 'aviso ao tocar numa palavra do diálogo' },
  itemPromptHTML:          { tipo: 'function', obrigatorio: true, desc: 'enunciado de item na lição' },
  itemAnswerHTML:          { tipo: 'function', obrigatorio: true, desc: 'resposta certa de item na lição' },
  originPhraseHTML:        { tipo: 'function', obrigatorio: true, desc: 'frase de origem do cartão' },
  clozeSentenceHTML:       { tipo: 'function', obrigatorio: true, desc: 'frase com lacuna' },
  clozeOptionsHTML:        { tipo: 'function', obrigatorio: true, desc: 'opções da lacuna' },
  reorderBlockHTML:        { tipo: 'function', obrigatorio: true, desc: 'bloco do exercício de ordenar' },
  reorderSlotHTML:         { tipo: 'function', obrigatorio: true, desc: 'bloco já colocado' },
  reorderDoneHTML:         { tipo: 'function', obrigatorio: true, desc: 'frase montada no fim do exercício' },
  introWordHTML:           { tipo: 'function', obrigatorio: true, desc: 'palavra no cartão de apresentação' },
  introPhraseHTML:         { tipo: 'function', obrigatorio: true, desc: 'frase no cartão de apresentação' },
  wireIntroCard:           { tipo: 'function', padrao: () => {}, desc: 'liga botões extras do cartão de apresentação (zh: traços)' },
  reviewTargetHTML:        { tipo: 'function', obrigatorio: true, desc: 'lado do idioma estudado no cartão da Revisão (texto escapado; URL por safeMediaUrl)' },
  reviewPromptHTML:        { tipo: 'function', obrigatorio: true, desc: 'enunciado do cartão da Revisão' },
  reviewClozeSentenceHTML: { tipo: 'function', padrao: (s) => s, desc: 'frase de lacuna da Revisão' },
  chartEmptyHTML:          { tipo: 'function', obrigatorio: true, desc: 'gráfico de progresso vazio' },
  reviewEmptyEmoji:        { tipo: 'string',   obrigatorio: true, desc: 'emoji da Revisão sem cartões' },

  // ---------- Correção ----------
  typedAttemptForm:     { tipo: 'function', padrao: (s) => s, desc: '"Sua resposta" (typedAttemptHTML): forma de comparar o que foi digitado' },
  grammarAnswerVerdict: { tipo: 'function', obrigatorio: true, desc: "digitar da gramática: (digitado, formas) => 'ok' | 'almost' | 'wrong'" },
  typedAnswer:          { tipo: 'object', obrigatorio: true, chaves: ['verdict', 'expected', 'inputExtraHTML', 'wireInputExtra'], desc: 'digitar na lição: veredito, resposta esperada, teclado extra' },
  reviewTyped:          { tipo: 'object', obrigatorio: true, chaves: ['check', 'hintHTML', 'wrongGrade', 'inputExtraHTML', 'wireInputExtra'], desc: 'digitar na Revisão' },
  grammarInputExtraHTML: { tipo: 'function', desc: 'teclado extra no campo da gramática (zh: tons do pinyin); opcional' },
  wireGrammarInputExtra: { tipo: 'function', desc: 'liga o teclado extra da gramática; opcional' },

  // ---------- Chaves de texto ----------
  lessonKeys: { tipo: 'object', obrigatorio: true, textos: true, desc: 'textos da lição que citam o idioma',
    chaves: ['counter', 'whatMeans', 'listenChoose', 'tapAgain', 'typeHeard', 'typePlaceholder', 'clozePlaceholder', 'translateTo',
      'orderSentence', 'reorderTapHint', 'hintThinkWhen', 'hintListenAgain', 'hintThinkContext', 'hintReorderTranslate', 'hintReorderOrder',
      'hintCloze', 'hintFullSentence', 'expandLessons', 'unitDone', 'reviewClozePlaceholder', 'reviewTypePlaceholder'] },
  trueFalseHintKeys: { tipo: 'object', obrigatorio: true, textos: true, chaves: ['seen', 'generic'], desc: 'dica do Verdadeiro ou Falso' },

  // ---------- Trilha, dados e progresso ----------
  unitEyebrow:           { tipo: 'function', obrigatorio: true, desc: 'rótulo "Unidade N de M · nível"' },
  afterOpenUnit:         { tipo: 'function', padrao: () => {}, desc: 'depois de abrir a unidade (zh: botão do Manual)' },
  trailAfterUnit:        { tipo: 'function', padrao: () => null, desc: 'elemento extra depois da unidade na trilha (zh: histórias)' },
  trailMap:              { tipo: 'function', obrigatorio: true, desc: 'desenha o Mapa da trilha' },
  fullSentenceExercises: { tipo: 'function', padrao: () => [], desc: 'exercícios de frase inteira (zh)' },
  chartLearnedDates:     { tipo: 'function', obrigatorio: true, desc: 'datas de "aprendida" para o gráfico' },
  revisaoPool:           { tipo: 'function', obrigatorio: true, desc: 'missões da categoria Revisão' },
  revisaoFallbackId:     { tipo: 'string',   obrigatorio: true, desc: 'missão de reserva da Revisão' },
  dailyExtra:            { tipo: 'function', obrigatorio: true, desc: 'contadores do dia próprios do site' },
  badgeLevel:            { tipo: 'object',   obrigatorio: true, chaves: ['id', 'label'], desc: 'nível das conquistas' },
  vocabCardSwap:         { tipo: 'function', obrigatorio: true, desc: 'troca o texto do cartão de vocabulário no idioma do site' },
  refreshExtraCards:     { tipo: 'function', padrao: () => {}, desc: 'cartões próprios do site no idioma do site (zh: hanzi)' },
  cardOriginTitle:       { tipo: 'function', obrigatorio: true, desc: 'título da origem do cartão (o fr e o zh passam a função comum)' },

  // ---------- Módulos, Ponto de verificação e Teste de Nível (shared/core/modulos-niveis.js, shared/checkpoint-exam.js) ----------
  checkpointExam:   { tipo: 'object', /* obrigatorioSe: 'modulos' (melhoria 2) */ chaves: ['keys'], chavesOpcionais: ['word', 'phrase'],
    desc: 'prova do Ponto de verificação/Teste de Nível: keys = { word, phrase, listen } (chaves de texto que citam o idioma); word(v)/phrase(p) para outra escrita (zh)' },
  checkpointScore:  { tipo: 'function', desc: 'nota de uma resposta da prova (zh: pinyin e tom); opcional' },
  levelTestKeys:    { tipo: 'object', /* obrigatorioSe: 'testeDeNivel' (melhoria 2) */ textos: true, chaves: ['sub', 'intro'], desc: 'textos do Teste de Nível que citam o idioma' },
  examScreenOpened: { tipo: 'function', desc: 'a prova abriu na tela da lição (zh: esconde o Manual); opcional' },

  // ---------- Família ----------
  familiaLatina:    { tipo: 'object', obrigatorioSe: 'familia:latin', aberto: true, desc: 'configuração da família latina (contrato em shared/core/familias/latina.js)' },
};

// Subchave "keys" de checkpointExam: também chaves de texto.
const LANG_HOOKS_CHAVES_DE_TEXTO_ANINHADAS = { checkpointExam: { keys: ['word', 'phrase', 'listen'] } };

// Contexto do site (para obrigatorioSe): { familia, modulos, testeDeNivel }. No navegador sai do content.js e do registro.
function langHooksContextoDoSite(hooks){
  const ctx = { familia: null, modulos: false, testeDeNivel: false };
  try { ctx.modulos = typeof MODULES !== 'undefined' && Array.isArray(MODULES) && MODULES.length > 0; } catch (e) {}
  try { ctx.testeDeNivel = typeof LEVEL_TESTS !== 'undefined' && Array.isArray(LEVEL_TESTS) && LEVEL_TESTS.length > 0; } catch (e) {}
  try {
    const reg = typeof LanguageRegistry !== 'undefined' ? LanguageRegistry : (typeof window !== 'undefined' && window.LanguageRegistry);
    const lang = reg && hooks && reg.all().find(l => l.appKey === hooks.appKey);
    if (lang) ctx.familia = lang.family || null;
  } catch (e) {}
  return ctx;
}

function langHookObrigatorio(entrada, ctx){
  if (entrada.obrigatorio) return true;
  const c = entrada.obrigatorioSe;
  if (!c) return false;
  if (c === 'modulos') return !!(ctx.modulos || ctx.testeDeNivel);
  if (c === 'testeDeNivel') return !!ctx.testeDeNivel;
  if (c.startsWith('familia:')) return ctx.familia === c.slice('familia:'.length);
  return false;
}

// Confere os ganchos de um site contra o contrato. Devolve a lista de problemas (vazia = ok). Não confere chave de texto no
// catálogo (isso é do teste, que lê shared/i18n/pt-BR.js e en.js).
function verificarLangHooks(hooks, ctx){
  const problemas = [];
  const tipoDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  Object.keys(LANG_HOOKS_CONTRATO).forEach(nome => {
    const e = LANG_HOOKS_CONTRATO[nome];
    const v = hooks[nome];
    if (v === undefined){
      if (langHookObrigatorio(e, ctx)) problemas.push(`falta o gancho obrigatório ${nome} (${e.desc})`);
      return;
    }
    const esperado = e.tipo === 'textKey' ? 'string' : e.tipo;
    if (tipoDe(v) !== esperado) { problemas.push(`${nome}: esperado ${e.tipo}, veio ${tipoDe(v)}`); return; }
    if (e.tipo === 'object' && !e.aberto){
      (e.chaves || []).forEach(k => { if (v[k] === undefined) problemas.push(`${nome}.${k}: falta`); });
      const permitidas = new Set([...(e.chaves || []), ...(e.chavesOpcionais || [])]);
      Object.keys(v).forEach(k => { if (!permitidas.has(k)) problemas.push(`${nome}.${k}: subchave fora do contrato`); });
    }
  });
  Object.keys(hooks).forEach(nome => { if (!LANG_HOOKS_CONTRATO[nome]) problemas.push(`gancho ${nome} não está no contrato (shared/core/lang-hooks-contrato.js)`); });
  return problemas;
}

// Chaves de texto que o site declara (para conferir no catálogo): [{ onde, chave }].
function chavesDeTextoDosLangHooks(hooks){
  const out = [];
  Object.keys(LANG_HOOKS_CONTRATO).forEach(nome => {
    const e = LANG_HOOKS_CONTRATO[nome], v = hooks[nome];
    if (v === undefined) return;
    if (e.tipo === 'textKey') out.push({ onde: nome, chave: v });
    if (e.tipo === 'object' && e.textos && v) Object.keys(v).forEach(k => out.push({ onde: nome + '.' + k, chave: v[k] }));
  });
  Object.keys(LANG_HOOKS_CHAVES_DE_TEXTO_ANINHADAS).forEach(nome => {
    const v = hooks[nome];
    if (!v) return;
    Object.keys(LANG_HOOKS_CHAVES_DE_TEXTO_ANINHADAS[nome]).forEach(sub => {
      const o = v[sub];
      if (o) Object.keys(o).forEach(k => out.push({ onde: `${nome}.${sub}.${k}`, chave: o[k] }));
    });
  });
  return out;
}

// O site escreve: const LANG_HOOKS = defineLangHooks({ ... }). Aplica os padrões neutros que faltarem, avisa no console o
// que estiver fora do contrato e devolve o MESMO objeto (sem congelar: nada muda para quem já usa LANG_HOOKS).
function defineLangHooks(hooks){
  Object.keys(LANG_HOOKS_CONTRATO).forEach(nome => {
    const e = LANG_HOOKS_CONTRATO[nome];
    if (hooks[nome] === undefined && e.padrao !== undefined) hooks[nome] = e.padrao;
  });
  try {
    const problemas = verificarLangHooks(hooks, langHooksContextoDoSite(hooks));
    if (problemas.length && typeof console !== 'undefined') problemas.forEach(p => console.error('[LANG_HOOKS] ' + p));
  } catch (e) { /* conferência nunca derruba o app */ }
  return hooks;
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { LANG_HOOKS_CONTRATO, LANG_HOOKS_CHAVES_DE_TEXTO_ANINHADAS, verificarLangHooks, chavesDeTextoDosLangHooks, langHookObrigatorio, langHooksContextoDoSite, defineLangHooks };
}
