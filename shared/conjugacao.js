// ---------- Conjugação: motor comum a qualquer idioma que conjuga verbo ----------
// Etapa 5a da paridade (docs/historico/27-paridade-conjugacao.md, pedido da dona de 2026-10-23): a tela da
// Conjugação, que morava só no fr/app.js, em código comum. Escolha de verbos e tempos, busca, prática, correção
// (certa / "quase" / errada, com as letras erradas marcadas), teclado de letras, dica, resultado com "Praticar só os
// que errei", abas Praticar | Jogos (motor dos jogos: shared/conj-games.js), selo/paywall dos Jogos e os contadores
// das missões do dia.
//
// O site liga a Conjugação assim (molde: fr/conj-config.js):
//   1. carrega os DADOS do idioma (fr/conjugation-data.js: CONJUGATION_VERBS, CONJUGATION_GROUPS, VERB_TRANSLATIONS,
//      CONJ_TENSE_EXAMPLES; e, se tiver Jogos, fr/conj-games.js: CONJ_GAMES);
//   2. carrega este arquivo e depois chama registerConjugation({...}) com dados + regras do idioma;
//   3. tem a seção <div class="view" id="view-conjugaison"> no index.html (vazia serve: wireConjugationScreen() monta
//      a marcação com conjScreenHTML()), carrega shared/conjugacao.css depois do <style> e chama
//      wireConjugationScreen() uma vez no app.js; a aba chama renderConjSelectScreen().
//
// Configuração (registerConjugation). Obrigatórios: verbs, groups, tenses, persons. O resto tem padrão.
//   lang                 código do idioma estudado (atributo lang="" no verbo e nas frases; padrão 'fr')
//   verbs                { infinitivo: { g: grupo, f: { tempo: [6 formas] } } }, do mais comum para o mais raro
//   groups               { grupo: { label, desc } } (rótulos vêm da camada do curso)
//   translations         { infinitivo: 'tradução / outra' } (busca pela tradução e linha sob o verbo)
//   tenseExamples        { tempo: { <lang>: 'frase com [verbo]', t: 'tradução' } } (opcional)
//   exampleTranslationLang  idioma do site em que a tradução do exemplo aparece (padrão 'pt-BR')
//   tenses               [{ key, label }] na ordem da tela
//   persons              rótulos das pessoas (o número de campos de cada tempo)
//   personLabel(i, formaEsperada, tempo)   rótulo da pessoa (fr: je -> j' antes de vogal, "que" no subjonctif)
//   activeMask(tempo)    quais pessoas o tempo tem (fr: impératif só tu/nous/vous); padrão: todas
//   pronounlessTenses    tempos sem pronome no áudio e na revisão do fim (fr: ['imperatif'])
//   forms(verbo, tempo)  as formas (fr: futur proche montado na hora); padrão verbs[verbo].f[tempo]
//   expectedInfo(verbo, tempo, i, simples)  formas aceitas além da do banco (fr: concordância com être)
//   regularGroups / irregularGroups        grupos dos filtros "Somente regulares/irregulares" (e do XP em dobro)
//   topNOptions, sessionSizes, sessionSize, pickMax   números dos filtros (padrão: os do fr)
//   fold(s)              dobra para a busca (padrão FamiliaLatina.dobrarBusca)
//   looseNormalize(s)    comparação "quase" (padrão FamiliaLatina.normalizarFrouxo: acento/maiúscula)
//   searchStrip          RegExp tirada do começo na busca (fr: /^(se |s')/, verbo pronominal)
//   searchLangs          { target, translation } códigos das bandeiras da busca (padrão { target: lang, translation: 'pt' })
//   flags                { código: emoji da bandeira em SCENARIO_FLAG_SVG }; flagLabelKeys { código: chave t() }
//   accentGroups()       grupos do teclado de letras (padrão LANG_HOOKS.familiaLatina.gruposDeAcentos)
//   speak(texto, botão)  voz dos Jogos; games: dados dos Jogos (CONJ_GAMES) ou null (sem a aba de jogos)
//   keys                 chaves de texto da tela que citam o idioma (searchLabel, searchPh), ver CONJ_DEFAULT_KEYS
//
// Grátis x Premium (igual ao fr de antes): a prática é grátis; os Jogos são Premium com o bloqueio DESLIGADO
// (CONJ_GAMES_PAYWALL_ENABLED = false: só o selo ⭐ aparece e todo mundo joga). Permissão: conj_games (Admin > Planos).
// XP (vale para todos os sites, .claude/rules/xp.md): forma certa = 1, verbo irregular = 2; "quase" não dá XP.

let CONJ_CONFIG = null;
let _conjDerived = null;     // ranking, total, opções do "Número de verbos" (calculados uma vez por configuração)
let _conjAccentLetters = null;

const CONJ_DEFAULT_KEYS = {
  searchLabel: 'fr.conj.sel.searchLabel',
  searchPh: 'fr.conj.sel.searchPh',
};

function conjCfg(){
  if (!CONJ_CONFIG) throw new Error('Conjugação sem configuração: chame registerConjugation({...}) (ver shared/conjugacao.js)');
  return CONJ_CONFIG;
}
function conjHasConfig(){ return !!CONJ_CONFIG; }

function registerConjugation(cfg){
  CONJ_CONFIG = cfg;
  _conjDerived = null;
  _conjAccentLetters = null;
  const d = conjDerived();
  CONJ_STATE.selectedTenses = [(cfg.defaultTense || (cfg.tenses[0] || {}).key)].filter(Boolean);
  CONJ_STATE.selectedGroups = Object.keys(cfg.groups);
  CONJ_STATE.topN = d.total;
  CONJ_STATE.regularity = null;
  CONJ_STATE.pickedVerbs = [];
  CONJ_STATE.searchHits = [];
  CONJ_STATE.searchActive = -1;
  CONJ_STATE.sessionSize = conjSessionSize();
  return cfg;
}

// Ranking de frequência dos verbos: a ordem em que aparecem no dataset já é do mais comum para o mais raro, usada
// pelo filtro "Número de verbos", sem precisar de uma fonte de frequência separada.
function conjDerived(){
  if (_conjDerived) return _conjDerived;
  const names = Object.keys(conjCfg().verbs);
  const rank = Object.fromEntries(names.map((name, i) => [name, i + 1]));
  const total = names.length;
  const topN = (conjCfg().topNOptions || [10, 25, 50, 100, 150]).filter(n => n < total);
  topN.push(total); // "Todos"
  _conjDerived = { rank, total, topN };
  return _conjDerived;
}
const conjRegularGroups = () => conjCfg().regularGroups || [];
const conjIrregularGroups = () => conjCfg().irregularGroups || [];
// Verbos por sessão (cada página cobre todos os tempos escolhidos de uma vez).
const conjSessionSizes = () => conjCfg().sessionSizes || [3, 5, 8, 12];
const conjSessionSize = () => conjCfg().sessionSize || 8;
// Verbos escolhidos pela busca: quando há algum, a sessão usa só eles e os filtros ficam de lado.
const conjPickMax = () => conjCfg().pickMax || 12;
const conjTenses = () => conjCfg().tenses;
const conjTenseLabel = (k) => conjTenses().find(x => x.key === k).label;
const conjLang = () => conjCfg().lang || 'fr';
const conjKey = (k) => (conjCfg().keys && conjCfg().keys[k]) || CONJ_DEFAULT_KEYS[k];
const conjPronounless = (tenseKey) => (conjCfg().pronounlessTenses || []).includes(tenseKey);

const CONJ_STATE = {
  selectedTenses: [],
  selectedGroups: [],
  topN: 0,
  regularity: null, // null | 'regular' | 'irregular'
  pickedVerbs: [],     // verbos escolhidos na busca (a sessão usa só eles)
  searchHits: [],
  searchActive: -1,
  sessionSize: 8,
  sessionTenses: [],   // tempos desta sessão (na ordem de conjTenses()); "só os que errei" usa um subconjunto
  mistakes: [],        // formas erradas/quase da sessão, para a revisão no fim
  verbQueue: [],
  verbIndex: 0,
  score: 0,
  totalFields: 0,
  checked: null,       // Set<string> — verbos já verificados nesta sessão
  answers: null,       // verbo -> { [tenseKey]: string[] } — respostas dadas, pra re-render ao navegar de volta
  hintLevel: 0          // 0/1/2 — nível de dica na página do verbo atual (não persiste entre verbos)
};

// ---------- Missões do dia e contadores (STATE.daily: conjugationSessions, conjugationCorrect, conjugationTenses;
// o site declara os campos no LANG_HOOKS.dailyExtra, como o fr/lang-hooks.js)
function registerDailyConjugationSession(){
  ensureDailyBucket();
  STATE.daily.conjugationSessions += 1;
  STATE.modesUsed.conjugation = true; // conquistas: trilha Explorar
}
function registerDailyConjugationCorrect(count){
  ensureDailyBucket();
  STATE.daily.conjugationCorrect += count;
}
function registerDailyConjugationTense(tenseKey){
  ensureDailyBucket();
  if (!STATE.daily.conjugationTenses.includes(tenseKey)){
    STATE.daily.conjugationTenses.push(tenseKey);
  }
}
// As 3 missões de Conjugação do sorteio "Revisão ou Conjugação" (o fr as põe no REVISAO_CONJ_CHALLENGES).
const CONJ_DAILY_MISSIONS = [
  { id:'conj1', icon:'🗣️', get label(){ return t('fr.mission.conj1'); }, target:1, get: d => d.conjugationSessions },
  { id:'conjCorrect10', icon:'✅', get label(){ return t('fr.mission.conjCorrect10'); }, target:10, get: d => d.conjugationCorrect },
  { id:'conjTenses2', icon:'🔤', get label(){ return t('fr.mission.conjTenses2'); }, target:2, get: d => d.conjugationTenses.length },
];

// ---------- Formas e correção
// Rótulo da pessoa (o idioma decide: no fr "je" vira "j'" antes de vogal e o subjonctif leva "que").
function conjPersonLabel(personIdx, expectedForm, tenseKey){
  const c = conjCfg();
  return c.personLabel ? c.personLabel(personIdx, expectedForm, tenseKey) : c.persons[personIdx];
}

// Quais pessoas o tempo tem (fr: impératif só tu / nous / vous).
function conjActiveMask(tenseKey){
  const c = conjCfg();
  return c.activeMask ? c.activeMask(tenseKey) : c.persons.map(() => true);
}

// As formas de um combo verbo+tempo (o idioma pode montar tempo que não está no banco, como o futur proche).
function getConjForms(verb, tense){
  const c = conjCfg();
  return c.forms ? c.forms(verb, tense) : c.verbs[verb].f[tense];
}

function conjExpectedInfo(verb, tenseKey, idx){
  const expected = (getConjForms(verb, tenseKey) || [])[idx] || '';
  const plain = { display: expected, accepted: acceptedForms(expected) };
  const c = conjCfg();
  return c.expectedInfo ? c.expectedInfo(verb, tenseKey, idx, plain) : plain;
}

function conjLoose(s){
  const c = conjCfg();
  return c.looseNormalize ? c.looseNormalize(s) : FamiliaLatina.normalizarFrouxo(s);
}

// Status de uma forma digitada: certa, só acento/maiúscula diferente, ou errada.
function conjEvaluate(verb, tenseKey, idx, given){
  const info = conjExpectedInfo(verb, tenseKey, idx);
  const g = (given || '').trim();
  let status = 'wrong', otherForm = null;
  if (info.accepted.includes(g)) status = 'ok';
  else if (info.accepted.some(f => conjLoose(g) === conjLoose(f))){
    // "Quase" é só acento/maiúscula. Se a palavra digitada é outra forma do
    // mesmo verbo (a parle x a parlé: "parle" é do présent), o aluno trocou
    // de tempo, e isso é erro (decisão da autora, 2026-10-13).
    otherForm = conjOtherFormOf(verb, tenseKey, g, info.accepted);
    status = otherForm ? 'wrong' : 'almost';
  }
  // Português de Portugal (site com LANG_HOOKS.typedAnswerLang = 'pt-BR'; regra da dona, 2026-10-29): "estou a falar"
  // por "estou falando" = Quase, com a forma do Brasil na devolutiva. fr: typedPtBrAdjust devolve null sem olhar.
  const ptBr = typeof typedPtBrAdjust === 'function'
    ? typedPtBrAdjust(g, (texto) => info.accepted.includes(texto.trim()) || info.accepted.some(f => conjLoose(texto) === conjLoose(f)))
    : null;
  if (ptBr){ status = 'almost'; otherForm = null; }
  // Forma mais parecida com o que foi digitado, para marcar as letras.
  const target = info.accepted.slice().sort((a, b) => conjAlign(g, a).cost - conjAlign(g, b).cost)[0] || '';
  return Object.assign({ status, target, otherForm }, ptBr ? { ptBr } : {}, info);
}

// Palavra digitada que é, letra por letra, outra forma do mesmo verbo:
// devolve { word, tenseKey } do primeiro tempo (na ordem de conjTenses())
// em que ela aparece, ou null.
function conjOtherFormOf(verb, tenseKey, given, accepted){
  const gw = given.toLowerCase().split(/\s+/);
  const tw = (accepted.find(f => conjLoose(f) === conjLoose(given)) || '').toLowerCase().split(/\s+/);
  const diff = gw.filter((w, i) => w !== tw[i]);
  if (!diff.length) return null;
  for (const t of conjTenses()){
    const forms = (conjCfg().verbs[verb].f[t.key] || []).filter(Boolean)
      .flatMap(f => f.split('/')).flatMap(f => f.trim().toLowerCase().split(/\s+/));
    const word = diff.find(w => forms.includes(w));
    if (word && !(t.key === tenseKey && tw.includes(word))) return { word, tenseKey: t.key };
  }
  return null;
}

// Alinhamento letra a letra (distância de edição), como no Jogo de Conjugações.
// A conta é comum a todos os sites: alinharLetras em shared/core/licao-feedback.js.
function conjAlign(a, b){
  return alinharLetras(a, b);
}

// O que a pessoa digitou, com só as letras erradas em vermelho; o traço
// marca uma letra que faltou.
function conjAnswerViewHTML(given, target, status){
  const icon = status ? `<span class="conj-ic" aria-hidden="true">${status === 'ok' ? '✓' : status === 'almost' ? '~' : '✕'}</span>` : '';
  const cls = 'conj-answer-view' + (status ? ' is-' + status : '');
  if (!(given || '').trim()) return `<div class="${cls} is-empty" role="img" aria-label="—">—${icon}</div>`;
  const html = status === 'ok' ? escapeHTML(given.trim()) : conjAlign(given, target).ops.map(o =>
    o.t === 'same' ? escapeHTML(o.a)
    : o.t === 'missing' ? '<span class="conj-gap"></span>'
    : `<span class="conj-x">${escapeHTML(o.a)}</span>`).join('');
  return `<div class="${cls}" role="img" aria-label="${escapeHTML(t('feedback.label.yourAnswer') + ': ' + given)}"><span class="conj-answer-text">${html}</span>${icon}</div>`;
}

// Texto falado de uma forma: pronome + forma (sem pronome nos tempos sem pronome, como o impératif).
// Pronome que termina em apóstrofo (j') cola na forma.
function conjSpeakText(idx, tenseKey, form){
  const c = conjCfg();
  if (c.speakText) return c.speakText(idx, tenseKey, form);
  if (conjPronounless(tenseKey)) return form;
  const pron = conjPersonLabel(idx, form, tenseKey).split(' / ')[0];
  return pron.endsWith("'") ? pron + form : `${pron} ${form}`;
}

// Dica progressiva: nível 1 mostra só o tamanho da palavra + a terminação
// (últimas 2 letras); nível 2 revela a maior parte das letras, escondendo
// só ~1 em cada 3 posições. Espaços (formas com mais de uma palavra, como
// o futur proche) ficam sempre visíveis.
function conjHintPlaceholder(expected, level){
  if (!expected || !level) return '';
  const chars = expected.split('');
  if (level === 1){
    const revealFrom = Math.max(0, expected.length - 2);
    return chars.map((c, i) => c === ' ' ? ' ' : (i >= revealFrom ? c : '_')).join('');
  }
  return chars.map((c, i) => c === ' ' ? ' ' : (i % 3 === 2 ? '_' : c)).join('');
}

// ---------- Teclado de letras
// Só as letras que aparecem nas formas dos verbos da lista (decisão da autora, 2026-10-16), na ordem do teclado das
// lições e numa fileira só. Calculado da própria lista: verbo novo com outra letra (ex.: "haïr") já entra sozinho.
// As lições continuam com o teclado completo.
function conjAccentLetters(){
  if (_conjAccentLetters) return _conjAccentLetters;
  const used = new Set();
  Object.values(conjCfg().verbs).forEach(v => Object.values(v.f || {}).forEach(forms => (forms || []).forEach(x => {
    for (const ch of String(x || '')) used.add(ch);
  })));
  const groups = conjCfg().accentGroups ? conjCfg().accentGroups() : LANG_HOOKS.familiaLatina.gruposDeAcentos;
  const all = [].concat(...groups);
  _conjAccentLetters = all.filter(ch => used.has(ch));
  return _conjAccentLetters;
}
function conjAccentPickerHTML(){
  return FamiliaLatina.htmlTecladoDeAcentos([conjAccentLetters()]);
}
// Escreve a tecla no campo, no CURSOR (o fr usa o insertAccentAtCursor das lições, que faz o mesmo).
function conjInsertAtCursor(inputEl, ch){
  if (typeof insertAccentAtCursor === 'function') return insertAccentAtCursor(inputEl, ch);
  const r = FamiliaLatina.inserirNoCursor(inputEl.value, inputEl.selectionStart, inputEl.selectionEnd, ch);
  inputEl.value = r.value;
  inputEl.focus();
  inputEl.setSelectionRange(r.cursor, r.cursor);
}

// ---------- Tela de escolha
function updateConjSizeHint(){
  const el = document.getElementById('conj-size-hint');
  if (!el) return;
  const perVerb = CONJ_STATE.selectedTenses.reduce((n, k) => n + conjActiveMask(k).filter(Boolean).length, 0);
  const verbs = CONJ_STATE.pickedVerbs.length || CONJ_STATE.sessionSize;
  el.textContent = perVerb ? t('fr.conj.sessionForms', { n: perVerb * verbs }) : '';
}

// Frase de exemplo do tempo: [ ] marca o verbo, que vai em cor + negrito (mesma convenção do diálogo).
function conjExampleHTML(tenseKey){
  const all = conjCfg().tenseExamples;
  const ex = all && all[tenseKey];
  const lang = conjLang();
  if (!ex || !ex[lang]) return '';
  const txt = escapeHTML(ex[lang]).replace(/\[([^\]]+)\]/g, '<b class="conj-ex-verb">$1</b>');
  // A tradução é da camada do curso (fr: pt-BR): fora do site nesse idioma ela não aparece (o curso em inglês não mostra português).
  const trLang = conjCfg().exampleTranslationLang || 'pt-BR';
  const trSite = typeof getUiLang !== 'function' || getUiLang() === trLang;
  return `<span class="conj-ex" lang="${lang}">${txt}</span>${ex.t && trSite ? `<span class="conj-ex-tr">${escapeHTML(ex.t)}</span>` : ''}`;
}

const conjFold = s => FamiliaLatina.dobrarBusca(s); // família latina (shared/core/familias/latina.js)
function conjSearchFold(s){
  const c = conjCfg();
  return c.fold ? c.fold(s) : conjFold(s);
}
function conjSearchLangs(){
  return conjCfg().searchLangs || { target: conjLang(), translation: 'pt' };
}

// Busca pelo infinitivo (idioma estudado) ou pela tradução, sem acento: "etre" acha être, "comer" acha manger.
// Ordem: igual > começa com > contém; empate pelo verbo mais comum.
function conjSearchVerbs(query, limit){
  const strip = conjCfg().searchStrip;
  const cut = s => strip ? s.replace(strip, '') : s;
  const L = conjSearchLangs();
  const q = cut(conjSearchFold(query));
  if (!q) return [];
  const out = [];
  const rank = conjDerived().rank;
  const translations = conjCfg().translations || {};
  Object.keys(conjCfg().verbs).forEach(verb => {
    if (CONJ_STATE.pickedVerbs.includes(verb)) return;
    const bare = cut(conjSearchFold(verb));
    const score = w => w === q ? 0 : w.startsWith(q) ? 1 : (q.length >= 3 && w.includes(q)) ? 2 : 9;
    let best = { score: score(bare), lang: L.target, word: verb };
    String(translations[verb] || '').split('/').map(x => x.trim()).filter(Boolean).forEach(tr => {
      const sc = score(conjSearchFold(tr));
      if (sc < best.score) best = { score: sc, lang: L.translation, word: tr };
    });
    if (best.score < 9) out.push(Object.assign({ verb, rank: rank[verb] }, best));
  });
  out.sort((x, y) => x.score - y.score || x.rank - y.rank);
  return out.slice(0, limit || 8);
}

// Bandeira do idioma da palavra encontrada (como no Reverso; fr: a do Brasil para o português).
function conjFlagHTML(lang){
  const c = conjCfg();
  const flags = c.flags || { fr: '🇫🇷', pt: '🇧🇷' };
  const keys = c.flagLabelKeys || { fr: 'fr.conj.sel.langFr', pt: 'fr.conj.sel.langPt' };
  // Bandeira desenhada (SCENARIO_FLAG_SVG) quando existe; senão, o próprio emoji (vira desenho do Fluent, se houver).
  const svg = (typeof SCENARIO_FLAG_SVG !== 'undefined' && SCENARIO_FLAG_SVG[flags[lang]]) || escapeHTML(flags[lang] || '');
  return `<span class="conj-flag" role="img" aria-label="${t(keys[lang])}">${svg}</span>`;
}

function renderConjSearchList(){
  const input = document.getElementById('conj-search-input');
  const list = document.getElementById('conj-search-list');
  const q = input.value;
  const hits = conjSearchVerbs(q);
  const L = conjSearchLangs(), translations = conjCfg().translations || {};
  CONJ_STATE.searchHits = hits;
  CONJ_STATE.searchActive = hits.length ? 0 : -1;
  if (!conjSearchFold(q)){
    list.hidden = true; list.innerHTML = '';
    input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
    return;
  }
  list.innerHTML = hits.length ? hits.map((h, i) => {
    const other = h.lang === L.target ? (translations[h.verb] || '') : h.verb;
    return `<li role="option" id="conj-opt-${i}" class="conj-search-opt" data-verb="${escapeHTML(h.verb)}" aria-selected="${i === 0}">
      ${conjFlagHTML(h.lang)}<span class="conj-opt-word" ${h.lang === L.target ? `lang="${L.target}"` : ''}>${escapeHTML(h.word)}${other ? ` <span class="conj-opt-other" ${h.lang === L.translation ? `lang="${L.target}"` : ''}>(${escapeHTML(other)})</span>` : ''}</span></li>`;
  }).join('') : `<li class="conj-search-empty" role="presentation">${t('fr.conj.sel.noMatch')}</li>`;
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (hits.length) input.setAttribute('aria-activedescendant', 'conj-opt-0'); else input.removeAttribute('aria-activedescendant');
}

function setConjSearchActive(i){
  const list = document.getElementById('conj-search-list');
  const opts = list.querySelectorAll('.conj-search-opt');
  if (!opts.length) return;
  CONJ_STATE.searchActive = (i + opts.length) % opts.length;
  opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === CONJ_STATE.searchActive)));
  document.getElementById('conj-search-input').setAttribute('aria-activedescendant', 'conj-opt-' + CONJ_STATE.searchActive);
  opts[CONJ_STATE.searchActive].scrollIntoView({ block: 'nearest' });
}

function pickConjVerb(verb){
  if (!verb || CONJ_STATE.pickedVerbs.includes(verb)) return;
  if (CONJ_STATE.pickedVerbs.length >= conjPickMax()){ showToast(t('fr.conj.sel.pickLimit', { n: conjPickMax() })); return; }
  CONJ_STATE.pickedVerbs.push(verb);
  const input = document.getElementById('conj-search-input');
  input.value = '';
  renderConjSearchList();
  renderConjPicked();
  input.focus();
}

// Só o pedaço dependente muda (chips + estado dos filtros); o resto do formulário fica como está.
function renderConjPicked(){
  const el = document.getElementById('conj-picked');
  const picked = CONJ_STATE.pickedVerbs;
  el.innerHTML = picked.length ? `<ul class="conj-chips">${picked.map(v => `<li class="conj-chip">
      <span lang="${conjLang()}">${escapeHTML(v)}</span><button type="button" class="conj-chip-x" data-verb="${escapeHTML(v)}" aria-label="${escapeHTML(t('fr.conj.sel.removeVerb', { verb: v }))}">×</button></li>`).join('')}</ul>
    <p class="conj-picked-note">${t('fr.conj.sel.pickedNote')}</p>` : '';
  const filters = document.getElementById('conj-filters');
  filters.classList.toggle('is-off', picked.length > 0);
  filters.querySelectorAll('select, input').forEach(x => { x.disabled = picked.length > 0; });
  filters.querySelectorAll('.conj-toggle-item').forEach(x => { x.setAttribute('aria-disabled', String(picked.length > 0)); x.tabIndex = picked.length ? -1 : 0; });
  updateConjSizeHint();
}

function renderConjSelectScreen(){
  if (!Array.isArray(CONJ_STATE.pickedVerbs)) CONJ_STATE.pickedVerbs = [];
  const total = conjDerived().total;
  const tenseListEl = document.getElementById('conj-tense-list');
  tenseListEl.innerHTML = conjTenses().map(x => `
    <label class="conj-check-item conj-tense-card">
      <input type="checkbox" data-tense="${x.key}" ${CONJ_STATE.selectedTenses.includes(x.key) ? 'checked' : ''}>
      <span class="conj-tense-name">${x.label}</span>
      ${conjExampleHTML(x.key)}
    </label>
  `).join('');

  document.getElementById('conj-size-select').innerHTML = conjSessionSizes().map(n =>
    `<option value="${n}" ${CONJ_STATE.sessionSize === n ? 'selected' : ''}>${n}</option>`).join('');

  const topnSelectEl = document.getElementById('conj-topn-select');
  topnSelectEl.innerHTML = conjDerived().topN.map(n =>
    `<option value="${n}" ${CONJ_STATE.topN === n ? 'selected' : ''}>${n === total ? t('fr.conj.topAll', { n }) : `Top ${n}`}</option>`
  ).join('');

  [['conj-toggle-regular', 'regular'], ['conj-toggle-irregular', 'irregular']].forEach(([id, val]) => {
    const el = document.getElementById(id);
    el.classList.toggle('active', CONJ_STATE.regularity === val);
    el.setAttribute('aria-checked', String(CONJ_STATE.regularity === val));
  });

  const verbListEl = document.getElementById('conj-verb-list');
  verbListEl.innerHTML = Object.entries(conjCfg().groups).map(([key, info]) => `
    <label class="conj-check-item">
      <input type="checkbox" data-group="${key}" ${CONJ_STATE.selectedGroups.includes(key) ? 'checked' : ''}>
      <span>${info.label}<span class="desc">${info.desc}</span></span>
    </label>
  `).join('');

  tenseListEl.querySelectorAll('input[data-tense]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.tense;
      if (cb.checked){
        if (!CONJ_STATE.selectedTenses.includes(key)) CONJ_STATE.selectedTenses.push(key);
      } else {
        CONJ_STATE.selectedTenses = CONJ_STATE.selectedTenses.filter(t => t !== key);
      }
      updateConjSizeHint();
    });
  });

  verbListEl.querySelectorAll('input[data-group]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.group;
      if (cb.checked){
        if (!CONJ_STATE.selectedGroups.includes(key)) CONJ_STATE.selectedGroups.push(key);
      } else {
        CONJ_STATE.selectedGroups = CONJ_STATE.selectedGroups.filter(g => g !== key);
      }
    });
  });
  renderConjPicked();
}

function toggleConjRegularity(val){
  if (CONJ_STATE.pickedVerbs.length) return;
  CONJ_STATE.regularity = CONJ_STATE.regularity === val ? null : val;
  renderConjSelectScreen();
}

// Botão "Começar prática": monta a fila pelos verbos escolhidos ou pelos filtros.
function startConjFromSelection(){
  const picked = CONJ_STATE.pickedVerbs;
  if (!CONJ_STATE.selectedTenses.length || (!picked.length && !CONJ_STATE.selectedGroups.length)){
    showToast(t('toast.conjPickOne'));
    return;
  }

  const rank = conjDerived().rank;
  const eligibleVerbs = picked.length ? picked.slice() : Object.entries(conjCfg().verbs)
    .filter(([name, v]) => CONJ_STATE.selectedGroups.includes(v.g))
    .filter(([name]) => rank[name] <= CONJ_STATE.topN)
    .filter(([name, v]) => {
      if (CONJ_STATE.regularity === 'regular') return conjRegularGroups().includes(v.g);
      if (CONJ_STATE.regularity === 'irregular') return conjIrregularGroups().includes(v.g);
      return true;
    })
    .map(([name]) => name);

  if (!eligibleVerbs.length){
    showToast(t('toast.conjNoVerbs'));
    return;
  }

  trackEvent('lesson_start', 'conjugation_session', null);

  // Fila de prática: um verbo por página, com todos os tempos escolhidos
  // juntos (estilo Verbugata). Verbos escolhidos na busca vêm na ordem em que
  // foram escolhidos; sorteio pelos filtros é embaralhado e limitado por sessão.
  startConjSession(picked.length ? eligibleVerbs : shuffle(eligibleVerbs).slice(0, CONJ_STATE.sessionSize),
    conjTenses().map(x => x.key).filter(k => CONJ_STATE.selectedTenses.includes(k)));
}

function startConjSession(verbs, tenses){
  CONJ_STATE.verbQueue = verbs;
  CONJ_STATE.sessionTenses = tenses;
  CONJ_STATE.verbIndex = 0;
  CONJ_STATE.score = 0;
  CONJ_STATE.totalFields = 0;
  CONJ_STATE.checked = new Set();
  CONJ_STATE.answers = {};
  CONJ_STATE.mistakes = [];
  CONJ_STATE.hintLevel = 0;
  document.getElementById('conj-select-wrap').style.display = 'none';
  document.getElementById('conj-practice-wrap').style.display = 'block';
  renderConjPracticeStep();
}

// ---------- Abas Praticar | Jogos (shared/conj-games.js)
// Jogos da Conjugação são PREMIUM (decisão da autora, 2026-10-14); a Conjugação normal é grátis.
// Paywall DESLIGADO como o dos Desafios (CHALLENGE_PAYWALL_ENABLED): hoje só o cadeado aparece e
// todo mundo joga. Ao ligar o paywall, trocar para true (lista em docs/historico/14-pendencias-...md).
// Quem joga com o bloqueio ligado: célula "Jogos da Conjugação" (conj_games, 116) da tabela Admin > Planos.
// O selo segue a regra 7 da dona: desligado = "⭐ Premium" sem cadeado; ligado = "⭐ Premium" + cadeado para quem não tem.
let CONJ_GAMES_PAYWALL_ENABLED = false; // let: os testes ligam a flag
function conjGamesUnlocked(){ return (typeof planCan === 'function' && planCan('conj_games')) || (typeof isChallengesAdmin === 'function' && isChallengesAdmin()); }
function isConjGameLocked(){ return CONJ_GAMES_PAYWALL_ENABLED && !conjGamesUnlocked(); }
// Janela Premium própria dos Jogos (não a dos Desafios do Módulo), com o botão "Fale com a Prof. Brune".
function openPremiumGamesModal(){
  const modal = document.getElementById('premium-games-modal');
  if (!modal) return;
  if (typeof applyDomI18n === 'function') applyDomI18n(modal);
  const box = document.getElementById('premium-games-contact');
  if (box) box.innerHTML = typeof premiumContactButtonHTML === 'function' ? premiumContactButtonHTML() : '';
  modal.style.display = 'flex';
}
let CONJ_GAMES_UI = null; // criado por wireConjugationScreen() quando o site tem Jogos (conjCfg().games)
// Selo da aba Jogos (regra 7): "⭐" com o bloqueio desligado ou para quem tem a permissão; "⭐🔒" quando trava de verdade.
function refreshConjGamesSeal(){
  const seal = document.querySelector('[data-conj-games-seal]');
  if (seal) seal.textContent = isConjGameLocked() ? '⭐🔒' : '⭐';
}
function setConjMode(mode){
  refreshConjGamesSeal();
  const games = mode === 'games';
  document.getElementById('conj-practice-pane').hidden = games;
  document.getElementById('conj-games-pane').hidden = !games;
  const sub = document.querySelector('#conj-select-wrap .path-header p');
  if (sub) sub.hidden = games; // "Escolha os verbos e os tempos" só vale para Praticar
  [['conj-mode-practice', !games], ['conj-mode-games', games]].forEach(([id, on]) => {
    const b = document.getElementById(id);
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  if (games && CONJ_GAMES_UI) CONJ_GAMES_UI.renderList();
}

// ---------- Prática
function renderConjPracticeStep(){
  const contentEl = document.getElementById('conj-practice-content');
  const tenses = CONJ_STATE.sessionTenses;
  // Barra do topo (progresso, ⚑, ⌨️, X; shared/activity-focus.js) vive dentro do conteúdo: pega antes de reescrever, recoloca depois.
  const lessonBar = typeof activityBarGrab === 'function' ? activityBarGrab('conj-practice-wrap') : null;
  const mountLessonBar = pct => {
    if (typeof activityBarMount === 'function') activityBarMount('conj-practice-wrap', lessonBar, null);
    if (typeof activityBarProgress === 'function') activityBarProgress('conj-practice-wrap', pct);
  };

  if (CONJ_STATE.verbIndex >= CONJ_STATE.verbQueue.length){
    renderConjSessionResult(contentEl);
    mountLessonBar(100);
    return;
  }

  const verb = CONJ_STATE.verbQueue[CONJ_STATE.verbIndex];
  const verbInfo = conjCfg().verbs[verb];
  const alreadyChecked = CONJ_STATE.checked.has(verb);
  const savedAnswers = CONJ_STATE.answers[verb] || {};
  const total = CONJ_STATE.verbQueue.length;
  CONJ_STATE.hintLevel = 0;

  const fieldHTML = (tenseKey, i) => {
    const expectedForms = getConjForms(verb, tenseKey);
    const label = conjPersonLabel(i, expectedForms[i], tenseKey);
    if (!conjActiveMask(tenseKey)[i]) return `
      <div class="conj-field" data-tense="${tenseKey}" data-idx="${i}">
        <label>${label}</label>
        <input type="text" disabled placeholder="—">
        <div class="conj-side"></div>
      </div>`;
    const given = (savedAnswers[tenseKey] || [])[i] || '';
    const id = `conj-in-${tenseKey}-${i}`;
    if (!alreadyChecked) return `
      <div class="conj-field" data-tense="${tenseKey}" data-idx="${i}">
        <label for="${id}">${label}</label>
        <input type="text" id="${id}" data-tense="${tenseKey}" data-idx="${i}" value="${escapeHTML(given)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="conj-side"></div>
      </div>`;
    const ev = conjEvaluate(verb, tenseKey, i, given);
    const speak = audioBtnHTML(conjSpeakText(i, tenseKey, ev.accepted[0] || ''));
    const note = (ev.otherForm ? `<span class="conj-other-form">${escapeHTML(t('fr.conj.otherForm', { form: ev.otherForm.word, tense: conjTenseLabel(ev.otherForm.tenseKey) }))}</span>` : '')
      + (ev.ptBr ? typedPtBrNoteHTML(ev.ptBr) : '');
    // Certa: caixa verde + ✓, áudio ao lado. Quase/errada: caixa amarela ou
    // vermelha com as letras marcadas; embaixo, a forma certa com o áudio.
    return `
      <div class="conj-field ${ev.status}" data-tense="${tenseKey}" data-idx="${i}">
        <label>${label}</label>
        ${conjAnswerViewHTML(given, ev.target, ev.status)}
        <div class="conj-side">${ev.status === 'ok' ? speak : ''}</div>
        ${ev.status === 'ok' ? '' : `<div class="expected">${ev.status === 'almost' ? `<span class="conj-tag">${escapeHTML(t('fr.conj.almost'))}</span>` : ''}<span>→ ${escapeHTML(ev.display)}</span>${speak}${note}</div>`}
      </div>`;
  };

  contentEl.innerHTML = `
    <div class="conj-progress">
      <span>${t('fr.conj.verbCounter', { i: CONJ_STATE.verbIndex + 1, n: total })}</span>
    </div>
    <div class="conj-verb-nav">
      <div class="conj-verb-header">
        <div class="conj-verb-label">${t('fr.conj.currentVerb')}</div>
        <div class="infinitif">${verb} ${audioBtnHTML(verb)}</div>
        <div class="conj-verb-translation">${(conjCfg().translations || {})[verb] || ''}</div>
        <div class="tempo">${conjRegularGroups().includes(verbInfo.g) ? t('fr.conj.regular') : t('fr.conj.irregular')}</div>
      </div>
    </div>
    <div class="conj-tense-grid">
      ${tenses.map(tenseKey => `
        <div class="conj-tense-box" data-tense="${tenseKey}">
          <div class="conj-tense-title">${conjTenseLabel(tenseKey)}</div>
          <div class="conj-grid">${conjCfg().persons.map((_, i) => fieldHTML(tenseKey, i)).join('')}</div>
        </div>`).join('')}
    </div>
    ${alreadyChecked ? '' : `
      <div class="conj-accents">${conjAccentPickerHTML()}</div>
      <div class="conj-actions">
        <button class="btn btn-primary btn-block" id="conj-verify-btn">${t('fr.conj.checkAnswers')}</button>
        <button class="btn btn-secondary" id="conj-hint-btn" title="${t('fr.conj.hintTitle')}">${t('fr.conj.hintShow')}</button>
      </div>
    `}
    <div class="conj-verb-pager">
      <button class="btn btn-secondary" id="conj-prev-verb-btn" ${CONJ_STATE.verbIndex === 0 ? 'disabled' : ''}>${t('fr.conj.prevVerb')}</button>
      <button class="btn btn-secondary" id="conj-next-verb-btn">${CONJ_STATE.verbIndex < total - 1 ? t('fr.conj.nextVerbArrow') : t('common.seeResultArrow')}</button>
    </div>
  `;

  mountLessonBar(Math.round((CONJ_STATE.checked.size / total) * 100));
  wireAudioButtons(contentEl);
  const inputs = Array.from(contentEl.querySelectorAll('.conj-field input[data-idx]:not(:disabled)'));

  // Acentos: escrevem no último campo que teve o cursor.
  let lastInput = inputs[0] || null;
  inputs.forEach(inp => inp.addEventListener('focus', () => { lastInput = inp; }));
  contentEl.querySelectorAll('.conj-accents .fr-accent-key').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => {
      if (!lastInput) return;
      conjInsertAtCursor(lastInput, btn.textContent);
    });
  });

  // Enter passa para o próximo campo; no último, corrige.
  inputs.forEach((inp, k) => inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (inputs[k + 1]) inputs[k + 1].focus();
    else document.getElementById('conj-verify-btn')?.click();
  }));

  document.getElementById('conj-hint-btn')?.addEventListener('click', function(){
    CONJ_STATE.hintLevel = Math.min(2, CONJ_STATE.hintLevel + 1);
    inputs.forEach(inputEl => {
      if (inputEl.value) return;
      const expected = (getConjForms(verb, inputEl.dataset.tense) || [])[Number(inputEl.dataset.idx)] || '';
      inputEl.placeholder = conjHintPlaceholder(expected, CONJ_STATE.hintLevel);
    });
    if (CONJ_STATE.hintLevel === 1){
      this.textContent = t('fr.conj.hintMore');
      this.title = t('fr.conj.hintMoreTitle');
    } else {
      this.disabled = true;
      this.textContent = t('fr.conj.hintMax');
    }
  });

  document.getElementById('conj-verify-btn')?.addEventListener('click', () => {
    // XP por forma verbal certa: irregulares valem o dobro (mais difícil
    // de decorar do que aplicar uma regra) -- "quase" (erro de acento/
    // grafia solto) não conta pra XP, só pro score exibido.
    const isIrregular = !conjRegularGroups().includes(verbInfo.g);
    let correctCount = 0, activeCount = 0, earnedXP = 0;
    const answersForVerb = {};
    tenses.forEach(tenseKey => {
      const tenseGiven = [];
      let tenseCorrect = 0;
      conjActiveMask(tenseKey).forEach((active, i) => {
        if (!active) return;
        activeCount++;
        const given = (contentEl.querySelector(`input[data-tense="${tenseKey}"][data-idx="${i}"]`) || {}).value || '';
        tenseGiven[i] = given;
        const ev = conjEvaluate(verb, tenseKey, i, given);
        if (ev.status === 'ok'){
          correctCount++; tenseCorrect++;
          earnedXP += isIrregular ? 2 : 1;
        } else {
          if (ev.status === 'almost'){ correctCount += 0.5; tenseCorrect += 0.5; }
          CONJ_STATE.mistakes.push({ verb, tenseKey, idx: i, given, target: ev.target, display: ev.display });
        }
      });
      answersForVerb[tenseKey] = tenseGiven;
      registerDailyConjugationCorrect(Math.round(tenseCorrect));
      registerDailyConjugationTense(tenseKey);
    });
    CONJ_STATE.answers[verb] = answersForVerb;
    CONJ_STATE.checked.add(verb);
    CONJ_STATE.score += correctCount;
    CONJ_STATE.totalFields += activeCount;
    if (earnedXP > 0) addXP(earnedXP);
    renderConjPracticeStep();
    document.getElementById('conj-next-verb-btn')?.focus();
  });

  document.getElementById('conj-prev-verb-btn').addEventListener('click', () => {
    if (CONJ_STATE.verbIndex > 0){
      CONJ_STATE.verbIndex -= 1;
      renderConjPracticeStep();
    }
  });

  document.getElementById('conj-next-verb-btn').addEventListener('click', () => {
    CONJ_STATE.verbIndex += 1;
    renderConjPracticeStep();
  });

  // Foca o primeiro campo ativo e vazio, pra já poder digitar direto.
  if (inputs[0]) inputs[0].focus();
}

// Fim da sessão: placar, a lista das formas que precisam de revisão e
// "Praticar só os que errei" (só esses verbos, só esses tempos).
function renderConjSessionResult(contentEl){
  const pct = CONJ_STATE.totalFields ? Math.round((CONJ_STATE.score / CONJ_STATE.totalFields) * 100) : 0;
  registerDailyConjugationSession();
  registerStudyToday();
  maybeShowStreakCelebration();
  trackEvent('lesson_complete', 'conjugation_session', { score: CONJ_STATE.score, total: CONJ_STATE.totalFields, pct });
  const mistakes = CONJ_STATE.mistakes;
  const tenseLabel = k => conjTenseLabel(k);
  contentEl.innerHTML = `
    <div class="conj-session-result">
      <div class="big-emoji">${pct >= 70 ? '🎉' : '💪'}</div>
      <h3>${t('fr.conj.sessionDone')}</h3>
      <div class="score-num">${Math.round(CONJ_STATE.score)}/${CONJ_STATE.totalFields}</div>
      <p>${pct >= 70 ? t('fr.conj.wellDone') : t('fr.conj.keepPracticing')}</p>
      ${mistakes.length ? `
        <div class="conj-review">
          <div class="conj-review-title">${t('fr.conj.reviewTitle', { n: mistakes.length })}</div>
          <ul class="conj-review-list">${mistakes.map(m => {
            const pron = conjPronounless(m.tenseKey) ? '' : conjPersonLabel(m.idx, m.target, m.tenseKey).split(' / ')[0];
            return `<li>
              <span class="conj-review-where">${escapeHTML(m.verb)}, ${escapeHTML(tenseLabel(m.tenseKey))}</span>
              <span class="conj-review-form">${pron ? `<i>${escapeHTML(pron)}</i> ` : ''}${m.given.trim() ? conjAnswerViewHTML(m.given, m.target) : '<span class="conj-review-empty">—</span>'} <span class="conj-review-arrow">→</span> <b>${escapeHTML(m.display)}</b></span>
            </li>`;
          }).join('')}</ul>
        </div>` : ''}
      <div class="conj-result-actions">
        ${mistakes.length ? `<button class="btn btn-primary" id="conj-practice-mistakes-btn">${t('fr.conj.practiceMistakes')}</button>` : ''}
        <button class="btn ${mistakes.length ? 'btn-secondary' : 'btn-primary'}" id="conj-restart-btn">${t('fr.conj.newSession')}</button>
      </div>
    </div>
  `;
  document.getElementById('conj-restart-btn').addEventListener('click', () => {
    document.getElementById('conj-select-wrap').style.display = 'block';
    document.getElementById('conj-practice-wrap').style.display = 'none';
    renderConjSelectScreen();
  });
  document.getElementById('conj-practice-mistakes-btn')?.addEventListener('click', () => {
    const verbs = [...new Set(mistakes.map(m => m.verb))];
    const tenses = conjTenses().map(x => x.key).filter(k => mistakes.some(m => m.tenseKey === k));
    startConjSession(verbs, tenses);
  });
}

// ---------- Marcação da tela (#view-conjugaison)
// O fr já tem a marcação no index.html (igual a esta: tests/paridade-sites/test_conjugacao_motor.js confere). Site novo
// pode deixar a seção vazia: wireConjugationScreen() põe esta marcação e traduz (applyDomI18n).
function conjScreenHTML(){
  return `
    <div id="conj-select-wrap">
      <div class="path-header">
        <h2 data-i18n="admin.reports.screen.conjugaison">Conjugação</h2>
        <p data-i18n="ui.conj.sub">Escolha os verbos e os tempos verbais.</p>
      </div>
      <div class="conj-modes" role="tablist" data-i18n-attr="aria-label:admin.reports.screen.conjugaison" aria-label="Conjugação">
        <button type="button" role="tab" class="conj-mode active" id="conj-mode-practice" aria-selected="true" aria-controls="conj-practice-pane" data-i18n="games.tabPractice">Praticar</button>
        <button type="button" role="tab" class="conj-mode" id="conj-mode-games" aria-selected="false" aria-controls="conj-games-pane"><span data-i18n="games.tabGames">Jogos</span> <span class="conj-mode-lock" data-conj-games-seal aria-hidden="true">⭐</span></button>
      </div>
      <div id="conj-games-pane" role="tabpanel" aria-labelledby="conj-mode-games" hidden>
        <div class="cg-list" id="conj-games-list"></div>
      </div>
      <div id="conj-practice-pane" role="tabpanel" aria-labelledby="conj-mode-practice">
      <section class="conj-sel-block" aria-labelledby="conj-verbs-h">
        <h3 id="conj-verbs-h" data-i18n="fr.conj.sel.verbs">Verbos</h3>
        <div class="conj-search">
          <label class="conj-search-label" for="conj-search-input" data-i18n="${conjKey('searchLabel')}">${escapeHTML(t(conjKey('searchLabel')))}</label>
          <input id="conj-search-input" type="text" role="combobox" aria-expanded="false" aria-controls="conj-search-list" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false"
            data-i18n-attr="placeholder:${conjKey('searchPh')}" placeholder="${escapeHTML(t(conjKey('searchPh')))}">
          <ul class="conj-search-list" id="conj-search-list" role="listbox" hidden></ul>
        </div>
        <div class="conj-picked" id="conj-picked" aria-live="polite"></div>
        <div class="conj-filters" id="conj-filters">
          <p class="conj-filters-title" id="conj-filters-title" data-i18n="fr.conj.sel.orFilters">Ou sorteie pelos filtros</p>
          <div class="conj-filter-pair">
            <div class="conj-filter-row" id="conj-size-row">
              <label for="conj-size-select" data-i18n="fr.conj.sessionSize">Verbos por sessão</label>
              <select id="conj-size-select"></select>
            </div>
            <div class="conj-filter-row">
              <label data-i18n="ui.conj.topN" for="conj-topn-select">Número de verbos (mais comuns primeiro)</label>
              <select id="conj-topn-select"></select>
            </div>
          </div>
          <div class="conj-toggle-pair">
            <div class="conj-toggle-item" id="conj-toggle-regular" role="switch" tabindex="0" aria-checked="false">
              <span data-i18n="fr.conj.sel.onlyRegular">Somente verbos regulares</span>
              <div class="conj-toggle-switch"></div>
            </div>
            <div class="conj-toggle-item" id="conj-toggle-irregular" role="switch" tabindex="0" aria-checked="false">
              <span data-i18n="fr.conj.sel.onlyIrregular">Somente verbos irregulares</span>
              <div class="conj-toggle-switch"></div>
            </div>
          </div>
          <div class="conj-check-list" id="conj-verb-list"></div>
        </div>
      </section>
      <section class="conj-sel-block conj-sel-tenses" aria-labelledby="conj-tenses-h">
        <h3 id="conj-tenses-h" data-i18n="fr.conj.sel.tenses">Tempos verbais</h3>
        <div class="conj-tense-cards" id="conj-tense-list"></div>
      </section>
      <p class="conj-size-hint" id="conj-size-hint" aria-live="polite"></p>
      <button data-i18n="ui.conj.start" class="btn btn-primary btn-block" id="conj-start-btn" style="max-width:320px; margin:0 auto; display:flex;">Começar prática</button>
      </div>
    </div>

    <div id="conj-game-wrap" style="display:none;">
      <button class="back-link" id="conj-game-back" data-i18n="games.backToGames">← Voltar aos jogos</button>
      <div id="conj-game-content"></div>
    </div>

    <div id="conj-practice-wrap" style="display:none;">
      <button data-i18n="ui.conj.backToSelect" class="back-link" id="conj-back-to-select">← Voltar à seleção</button>
      <div id="conj-practice-content"></div>
    </div>
  `;
}

// ---------- Ligações da tela (uma vez só, no carregamento do app.js)
// Os elementos da escolha são fixos (renderConjSelectScreen só atualiza o conteúdo/estado visual, nunca os recria),
// por isso os listeners são conectados uma única vez aqui, e não a cada render. Conectá-los dentro de
// renderConjSelectScreen() empilhava um listener novo a cada clique, e como cada um deles também chama
// renderConjSelectScreen(), o número de listeners dobrava a cada clique até travar a aba.
function wireConjugationScreen(){
  const view = document.getElementById('view-conjugaison');
  if (!view) return;
  if (!view.querySelector('#conj-select-wrap')){
    view.innerHTML = conjScreenHTML();
    if (typeof applyDomI18n === 'function') applyDomI18n(view);
  }

  document.getElementById('conj-topn-select').addEventListener('change', function(){
    CONJ_STATE.topN = parseInt(this.value);
  });

  document.getElementById('conj-size-select').addEventListener('change', function(){
    CONJ_STATE.sessionSize = parseInt(this.value);
    updateConjSizeHint();
  });

  [['conj-toggle-regular', 'regular'], ['conj-toggle-irregular', 'irregular']].forEach(([id, val]) => {
    const el = document.getElementById(id);
    el.addEventListener('click', () => toggleConjRegularity(val));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleConjRegularity(val); document.getElementById(id).focus(); }
    });
  });

  (function wireConjSearch(){
    const input = document.getElementById('conj-search-input');
    const list = document.getElementById('conj-search-list');
    input.addEventListener('input', renderConjSearchList);
    input.addEventListener('focus', () => { if (input.value) renderConjSearchList(); });
    input.addEventListener('keydown', e => {
      const open = !list.hidden && (CONJ_STATE.searchHits || []).length;
      if (e.key === 'ArrowDown' && open){ e.preventDefault(); setConjSearchActive(CONJ_STATE.searchActive + 1); }
      else if (e.key === 'ArrowUp' && open){ e.preventDefault(); setConjSearchActive(CONJ_STATE.searchActive - 1); }
      else if (e.key === 'Enter'){
        e.preventDefault(); e.stopPropagation();
        if (open && CONJ_STATE.searchActive >= 0) pickConjVerb(CONJ_STATE.searchHits[CONJ_STATE.searchActive].verb);
      }
      else if (e.key === 'Escape' && !list.hidden){ e.preventDefault(); input.value = ''; renderConjSearchList(); }
      else if (e.key === 'Backspace' && !input.value && CONJ_STATE.pickedVerbs.length){
        CONJ_STATE.pickedVerbs.pop(); renderConjPicked();
      }
    });
    // mousedown (não click): escolhe antes do blur fechar a lista.
    list.addEventListener('mousedown', e => {
      const opt = e.target.closest('.conj-search-opt');
      if (!opt) return;
      e.preventDefault();
      pickConjVerb(opt.dataset.verb);
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (document.activeElement !== input){ list.hidden = true; input.setAttribute('aria-expanded', 'false'); }
    }, 120));
    document.getElementById('conj-picked').addEventListener('click', e => {
      const x = e.target.closest('.conj-chip-x');
      if (!x) return;
      CONJ_STATE.pickedVerbs = CONJ_STATE.pickedVerbs.filter(v => v !== x.dataset.verb);
      renderConjPicked();
      input.focus();
    });
  })();

  document.getElementById('conj-start-btn').addEventListener('click', startConjFromSelection);

  document.getElementById('premium-games-modal-close')?.addEventListener('click', () => {
    document.getElementById('premium-games-modal').style.display = 'none';
  });
  document.getElementById('premium-games-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'premium-games-modal') e.target.style.display = 'none';
  });
  const games = conjCfg().games;
  CONJ_GAMES_UI = (typeof createConjGames === 'function' && games)
    ? createConjGames({ games, lang: conjLang(), speak: (text, btn) => conjCfg().speak(text, btn),
        isLocked: g => isConjGameLocked(g), onLocked: () => openPremiumGamesModal(),
        ids: { select: 'conj-select-wrap', wrap: 'conj-game-wrap', content: 'conj-game-content', list: 'conj-games-list', back: 'conj-game-back' } })
    : null;

  document.getElementById('conj-mode-practice').addEventListener('click', () => setConjMode('practice'));
  document.getElementById('conj-mode-games').addEventListener('click', () => setConjMode('games'));
  document.querySelector('#view-conjugaison .conj-modes').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const toGames = !document.getElementById('conj-mode-games').classList.contains('active');
    setConjMode(toGames ? 'games' : 'practice');
    document.getElementById(toGames ? 'conj-mode-games' : 'conj-mode-practice').focus();
  });

  document.getElementById('conj-back-to-select').addEventListener('click', () => {
    document.getElementById('conj-select-wrap').style.display = 'block';
    document.getElementById('conj-practice-wrap').style.display = 'none';
    renderConjSelectScreen();
  });
}
