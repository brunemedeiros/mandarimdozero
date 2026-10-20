// i18n Etapa 2 -- testes Node/vm: t/tp/fallback/interpolação/PluralRules,
// t nunca lança, paridade de chaves, e REGRESSÃO: cada string pt-BR existe
// byte a byte no texto ORIGINAL (git show <baseline>:<arquivo>).
// Baseline padrão = e88fabb (último commit antes da Etapa 2); I18N_BASELINE
// sobrescreve. Passo "modais pequenos + seletor": I18N_PREV (padrão 96558b7,
// último commit antes desse passo) é a referência byte a byte do HTML/JS.
// Espanhol CONGELADO: só exigimos que es não tenha órfãs; en == pt-BR.
// Rodar: node tests/i18n/test_i18n_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const I18N = path.join(ROOT, 'shared', 'i18n');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

function makeEnv({ search = '', stored = null, debug = false } = {}){
  const store = {}; if (stored) store['ui-language'] = stored;
  const warns = [];
  const htmlAttrs = {};
  const sandbox = {
    console: { warn: (m) => warns.push(m), log(){} },
    URLSearchParams, Intl, Promise, Object, String, Number, CustomEvent: function(n, o){ this.type = n; this.detail = o && o.detail; },
  };
  sandbox.window = sandbox;
  sandbox.location = { search };
  sandbox.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const events = [];
  sandbox.dispatchEvent = (e) => events.push(e);
  sandbox.document = {
    currentScript: { src: 'http://x/shared/i18n/i18n.js' },
    readyState: 'complete',
    documentElement: { setAttribute: (k, v) => { htmlAttrs[k] = v; } },
    head: { appendChild: (s) => {
      const lang = s.src.match(/([\w-]+)\.js$/)[1];
      vm.runInContext(fs.readFileSync(path.join(I18N, lang + '.js'), 'utf8'), sandbox);
      setTimeout(() => s.onload && s.onload(), 0);
    } },
    createElement: () => ({}),
    querySelectorAll: () => [],
    addEventListener(){},
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(I18N, 'i18n.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(I18N, 'pt-BR.js'), 'utf8'), sandbox);
  return { w: sandbox, store, warns, htmlAttrs, events };
}

(async () => {
  // ---- detecção de idioma ----
  let e = makeEnv();
  check('padrão pt-BR', e.w.getUiLang() === 'pt-BR');
  check('html lang pt-BR', e.htmlAttrs.lang === 'pt-BR');
  e = makeEnv({ search: '?ui=en' });
  check('?ui=en -> en', e.w.getUiLang() === 'en');
  check('?ui=en salvo em localStorage', e.store['ui-language'] === 'en');
  check('html lang en', e.htmlAttrs.lang === 'en');
  await e.w.i18nReady;
  check('en.js carregado sob demanda', !!e.w.I18N_CATALOG.en);
  check('t em en', e.w.t('common.close') === 'Close');
  check('evento i18n:change disparado', e.events.some(x => x.type === 'i18n:change' && x.detail.lang === 'en'));
  e = makeEnv({ stored: 'es' });
  check('localStorage es -> es', e.w.getUiLang() === 'es');
  e = makeEnv({ search: '?ui=xx', stored: 'es' });
  check('?ui inválido cai no localStorage', e.w.getUiLang() === 'es');
  e = makeEnv({ stored: 'klingon' });
  check('localStorage inválido -> pt-BR', e.w.getUiLang() === 'pt-BR');
  e = makeEnv({ search: '?ui=pt-br' });
  check('?ui=pt-br normalizado', e.w.getUiLang() === 'pt-BR');
  check('pt-BR não injeta catálogo', !e.w.I18N_CATALOG.en && !e.w.I18N_CATALOG.es);

  // ---- t / fallback / interpolação ----
  e = makeEnv();
  const W = e.w;
  check('t pt-BR', W.t('report.modal.submit') === 'Enviar');
  check('t chave inexistente devolve a própria chave', W.t('nao.existe') === 'nao.existe');
  check('t nunca vazio com chave vazia', W.t('') === '' ? false : true, W.t(''));
  let threw = false;
  try { [undefined, null, 42, {}, [], 'a.b'].forEach(k => { const r = W.t(k); if (typeof r !== 'string') throw new Error('nao string'); }); } catch (x) { threw = true; }
  check('t nunca lança, sempre string', !threw);
  W.I18N_CATALOG['pt-BR']['test.hello'] = 'Olá, {nome}! Você tem {n} itens. {faltando}';
  check('interpolação', W.t('test.hello', { nome: 'Ana', n: 3 }) === 'Olá, Ana! Você tem 3 itens. {faltando}');
  check('interpolação sem params mantém placeholders', W.t('test.hello') === 'Olá, {nome}! Você tem {n} itens. {faltando}');
  await W.setUiLang('en');
  check('setUiLang en', W.getUiLang() === 'en' && e.store['ui-language'] === 'en' && e.htmlAttrs.lang === 'en');
  check('fallback en -> pt-BR (chave só em pt-BR)', W.t('test.hello', { nome: 'X', n: 1 }) === 'Olá, X! Você tem 1 itens. {faltando}');
  W.I18N_CATALOG.en['test.empty'] = '';
  W.I18N_CATALOG['pt-BR']['test.empty'] = 'vazio pt';
  check('valor vazio em en cai em pt-BR', W.t('test.empty') === 'vazio pt');
  check('chave inexistente em en devolve a chave', W.t('nada.aqui') === 'nada.aqui');
  e.warns.length = 0; W.t('nada.aqui');
  const ed = makeEnv({ debug: true }); ed.w.t('nada.aqui');

  // ---- tp / Intl.PluralRules ----
  const PL = { one: '{n} cartão', other: '{n} cartões' };
  const PLen = { one: '{n} card', other: '{n} cards' };
  const PLes = { one: '{n} tarjeta', other: '{n} tarjetas' };
  for (const [lang, obj, cases] of [
    ['pt-BR', PL, [[0, '0 cartão'], [1, '1 cartão'], [2, '2 cartões'], [5, '5 cartões']]],
    ['en', PLen, [[0, '0 cards'], [1, '1 card'], [2, '2 cards']]],
    ['es', PLes, [[0, '0 tarjetas'], [1, '1 tarjeta'], [2, '2 tarjetas']]],
  ]){
    const env = makeEnv();
    if (lang !== 'pt-BR'){ await env.w.setUiLang(lang); }
    env.w.I18N_CATALOG[lang]['test.cards'] = obj;
    for (const [n, exp] of cases){
      const got = env.w.tp('test.cards', n);
      check(`tp ${lang} n=${n}`, got === exp, got);
    }
    check(`PluralRules ${lang} 1=one`, new Intl.PluralRules(lang).select(1) === 'one');
  }
  check('tp chave inexistente', W.tp('nada', 3) === 'nada');
  check('tp em string simples', W.tp('report.modal.submit', 2) === 'Send');
  check('t em objeto plural usa other', (() => { W.I18N_CATALOG.en['test.p'] = { one: 'a', other: 'b' }; return W.t('test.p') === 'b'; })());
  check('fmtNumber en', W.fmtNumber(1234.5) === '1,234.5');
  await W.setUiLang('pt-BR');
  check('fmtNumber pt-BR', W.fmtNumber(1234.5) === '1.234,5');
  check('fmtDate pt-BR', W.fmtDate(new Date(Date.UTC(2026, 0, 15, 12)), { timeZone: 'UTC' }) === '15/01/2026');
  check('fmtDate nunca lança', typeof W.fmtDate('lixo') === 'string');

  // ---- paridade de chaves ----
  const cat = (lang) => { const s = { window: {} }; vm.createContext(s); vm.runInContext(fs.readFileSync(path.join(I18N, lang + '.js'), 'utf8'), s); return s.window.I18N_CATALOG[lang]; };
  const pt = cat('pt-BR'), en = cat('en'), es = cat('es');
  const ptKeys = Object.keys(pt).sort();
  check('en tem as mesmas chaves de pt-BR', JSON.stringify(Object.keys(en).sort()) === JSON.stringify(ptKeys), ptKeys.filter(k => !(k in en)));
  check('es (congelado) não tem chaves órfãs', Object.keys(es).every(k => k in pt), Object.keys(es).filter(k => !(k in pt)));
  const nonEmpty = (v) => typeof v === 'string' ? v.trim() !== '' : (v && typeof v === 'object' && Object.values(v).length > 0 && Object.values(v).every(x => typeof x === 'string' && x.trim() !== ''));
  check('nenhum valor vazio', [pt, en, es].every(c => Object.values(c).every(nonEmpty)));
  // Valores legitimamente iguais nos dois idiomas (nomes próprios, abreviações, números).
  const EN_SAME_AS_PT_OK = ['tagManager.note.one' /* Etapa 4: "item" nos dois idiomas */, 'analytics.title', 'badges.grants.colBadge', 'badges.title', 'reports.col.report', 'reports.col.status', 'reports.filter.status.aria', 'reports.title', 'cards.col.deck', 'cards.col.tags', 'students.ev.tab.hanzi', 'myFlashcards.badge.premium', 'badge.beta_tester.name', 'badge.xp_100.name', 'badge.xp_500.name', 'myFlashcards.edit.pinyin', 'myFlashcards.native.cardType', 'notif.pref.matrix.app', 'notif.pref.matrix.push', 'notif.pref.titleMatrixPush', 'notif.time.day', 'notif.time.hour', 'notif.time.min', 'review.mode.flashcard.name', 'review.mode.speed.name', 'review.speed.points', 'toast.pointsGain', 'toast.xpGain', 'trail.premiumBadge', 'preview.err.detail', 'review.interval.min', 'review.interval.hour', 'leaderboard.rowBadge', 'publicProfile.labelPinyin', 'publicProfile.sectionFlashcards', 'fieldEditor.lang.zhPinyin', 'fieldEditor.audio.rate.normal', 'taEditor.pinyinLabel', 'admin.analytics.tech.perf', 'admin.badges.create.icon', 'admin.badges.grant.badge', 'admin.badges.grant.usernamePh', 'admin.modal.report.status', 'admin.modal.report.title', 'admin.mode.off', 'admin.mode.on', 'admin.mode.pillLabel', 'admin.mode.title', 'admin.panel.tab.analytics', 'admin.panel.tab.tags', 'admin.panel.tab.flashcards', 'admin.panel.tab.premium', 'admin.panel.tab.badges', 'admin.panel.tab.reports', 'adminChallenges.import.itemN', 'admin.flashcards.cardType.normal', 'admin.flashcards.dest.countSubdecks', 'admin.flashcards.dest.deckFallback', 'admin.flashcards.dest.newSub', 'admin.materials.badgeLink', 'review.deck.decks', 'review.deck.colDeck', 'review.panel.tags', 'review.deck.subdeckWord.one', 'review.deck.subdeckWord.other', 'panel.tab.analytics', 'panel.tab.badges', 'panel.tab.reports', 'plans.chip.premium', 'plans.role.admin', 'plans.role.premium_basic', 'plans.role.premium_pro', 'studentDecks.deck', 'mural.join.title', 'badge.track.xp.title', 'rb.none' /* Banco de Revisão: só um traço "–" */, 'games.premium', 'friends.duo.theirs' /* "{name}: {n} XP" */, 'trail.moduleReview.reason.itemWord.one' /* "item" é igual nos dois idiomas */, 'publicDeck.notesCount' /* "{n} Notes": "Note" é o termo do app nos dois idiomas */];
  const sameKeys = ptKeys.filter(k => !EN_SAME_AS_PT_OK.includes(k) && JSON.stringify(en[k]) === JSON.stringify(pt[k]));
  check('en difere de pt-BR (traduzido)', sameKeys.length === 0, sameKeys);
  // comentário de confiança em cada linha de chave de en/es
  for (const lang of ['en', 'es']){
    const lines = fs.readFileSync(path.join(I18N, lang + '.js'), 'utf8').split('\n').filter(l => /^\s*'[\w.-]+':/.test(l));
    const expected = lang === 'en' ? ptKeys.length : Object.keys(es).length;
    check(`${lang}: toda chave tem comentário de confiança`, lines.length === expected && lines.every(l => /\/\/ (ALTA|MÉDIA|BAIXA)/.test(l)), [lines.length, expected]);
  }
  check('seletor oferece só pt-BR e en (es congelado)', JSON.stringify(W.I18N_SELECTABLE_UI_LANGS) === JSON.stringify(['pt-BR', 'en']));
  // es congelado: chave nova cai em pt-BR
  { const ee = makeEnv(); await ee.w.setUiLang('es');
    check('es: chave sem tradução cai em pt-BR', ee.w.t('flashcardReset.modal.confirm') === 'Sim' && ee.w.t('common.close') === 'Cerrar'); }
  // plural real em en; pt-BR idêntico ao template original com n cru
  { const pe = makeEnv();
    check('pt-BR wouldGenerate plural (Etapa 4: antes "cartão(ões)")', pe.w.tp('flashcardLimit.wouldGenerate', 1234, { n: 1234, remaining: 2 }) === 'Este cartão geraria 1234 cartões de estudo, mas restam só 2 no plano grátis.');
    check('pt-BR wouldGenerate n=1 (singular)', pe.w.tp('flashcardLimit.wouldGenerate', 1, { n: 1, remaining: 0 }) === 'Este cartão geraria 1 cartão de estudo, mas restam só 0 no plano grátis.');
    await pe.w.setUiLang('en');
    check('en wouldGenerate n=1 (singular)', pe.w.tp('flashcardLimit.wouldGenerate', 1, { n: 1, remaining: 0 }) === 'This card would create 1 study card, but you only have 0 left on the free plan.');
    check('en wouldGenerate n=3 (plural)', pe.w.tp('flashcardLimit.wouldGenerate', 3, { n: 3, remaining: 2 }) === 'This card would create 3 study cards, but you only have 2 left on the free plan.'); }

  // ---- REGRESSÃO contra o texto original ----
  const BASE = process.env.I18N_BASELINE || 'e88fabb';
  const orig = (f) => execSync(`git show ${BASE}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const origFr = orig('fr/index.html'), origZh = orig('zh/index.html'), origRep = orig('shared/reports.js');
  // ce8c3b1 = ponta da branch da Revisão antes do merge com o i18n (2026-10-07): o HTML
  // e os textos em pt-BR daquela branch passam a ser a referência.
  const PREV = process.env.I18N_PREV || 'ce8c3b1';
  // 9969e3c = main antes da tradução da Revisão nova (tabela de Decks, Painel,
  // semana, recordes; 2026-10-07). Os arquivos convertidos nesse passo e o HTML
  // são comparados também contra ele (em ce8c3b1 parte desses textos ainda não existia).
  const PREV2 = process.env.I18N_PREV2 || '9969e3c';
  // Mudanças DELIBERADAS de texto em português (aprovadas pela dona do projeto) desde o
  // commit PREV: aplicadas ao texto antigo antes de comparar. Qualquer outra diferença falha.
  // Etapa 4 do plano "Voz da Prof. Brune" (parte mecânica, aprovada pela dona em 2026-10-19; relatório
  // docs/i18n/etapa4-auditoria-escrita.md, seções 4.2, 4.3 e 7): sem "--", "pra" vira "para", plural de verdade
  // ({ one, other } escolhido por n === 1) e jargão técnico cru trocado por frase amigável. Um par por chave (texto
  // inteiro ou o trecho entre placeholders). Nas chaves de plural o par é só registro (o teste confere one/other).
  const ETAPA4_MECANICO = [
    ["{total} cartões · {new} novos · {learning} aprendendo · {review} para revisar · {due} devidos","one: {total} cartão · Novos: {new} · Aprendendo: {learning} · Para revisar: {review} · Devidos: {due} | other: {total} cartões · Novos: {new} · Aprendendo: {learning} · Para revisar: {review} · Devidos: {due}"], // deck.countsFull: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} cartões","one: {n} cartão | other: {n} cartões"], // publicDeck.plan.instances: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{date}: {n} palavras","one: {date}: {n} palavra | other: {date}: {n} palavras"], // zh.progress.chartPoint: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    [": <b>{n} de {goal}</b> dias de estudo","one: : <b>{n} de {goal}</b> dia de estudo | other: : <b>{n} de {goal}</b> dias de estudo"], // review.week.goalCount: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{done} de {total} lições","one: {done} de {total} lição | other: {done} de {total} lições"], // trail.unit.lessonsProgress: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{done} de {total} lições concluídas","one: {done} de {total} lição concluída | other: {done} de {total} lições concluídas"], // trail.lessonsCompleted: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} caracteres","one: {n} caractere | other: {n} caracteres"], // zh.hanzi.charCount: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} dias atrás","one: {n} dia atrás | other: {n} dias atrás"], // admin.students.metrics.daysAgo: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    [" · {n} cartões","one:  · {n} cartão | other:  · {n} cartões"], // students.ev.score.cards: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    // zh.path.unitDone.learnedWords: Etapa 4: achado 6: frase fixa em português no código, plural à mão (chave nova {one, other}; antes "O que você aprendeu: ${n} ${n > 1 ? 'palavras novas' : 'palavra nova'}")
    ["Você já enviou isso agora há pouco -- obrigada!","Você já enviou isso agora há pouco. Obrigada!"], // report.error.duplicate: Etapa 4: --
    ["Você atingiu o limite de <strong>20 cartões próprios ativos</strong> do plano grátis. Pra criar mais, apague algum cartão, ou peça pra sua professora te vincular -- alunos vinculados a uma professora têm cartões próprios ilimitados.","Você atingiu o limite de <strong>20 cartões próprios ativos</strong> do plano grátis. Para criar mais, apague algum cartão, ou peça para sua professora te vincular. Alunos vinculados a uma professora têm cartões próprios ilimitados."], // flashcardLimit.modal.bodyHtml: Etapa 4: -- / pra
    ["Este cartão geraria {n} cartão(ões) de estudo, mas restam só {remaining} no plano grátis.","one: Este cartão geraria {n} cartão de estudo, mas restam só {remaining} no plano grátis. | other: Este cartão geraria {n} cartões de estudo, mas restam só {remaining} no plano grátis."], // flashcardLimit.wouldGenerate: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Digite a resposta certa pro espaço em branco.","Digite a resposta certa para o espaço em branco."], // ownFlashcards.err.clozeAnswerRequired: Etapa 4: pra
    ["Adicione pelo menos 1 campo em \"Campos nativos\" pra pré-visualizar.","Adicione pelo menos 1 campo em \"Campos nativos\" para pré-visualizar."], // preview.err.noFields: Etapa 4: pra
    ["👁️ Pré-visualização -- nada foi salvo ou avaliado.","👁️ Pré-visualização: nada foi salvo ou avaliado."], // preview.toast.noEffect: Etapa 4: --
    ["👁️ Pré-visualização -- \"Rever mais\" não tem efeito aqui.","👁️ Pré-visualização: \"Rever mais\" não tem efeito aqui."], // preview.toast.reviewMore: Etapa 4: --
    ["Não iniciada = ainda sem nenhum estudo; Fraca = ainda não firmou; Forte = já sabe bem há tempos; Mediana = no meio do caminho. Isso é o vocabulário TODO, não as revisões de hoje (acima) -- por isso pode ter palavras medianas aqui mesmo sem nenhuma revisão pendente agora.","Não iniciada = ainda sem nenhum estudo; Fraca = ainda não firmou; Forte = já sabe bem há tempos; Mediana = no meio do caminho. Isso é o vocabulário TODO, não as revisões de hoje (acima). Por isso pode ter palavras medianas aqui mesmo sem nenhuma revisão pendente agora."], // review.strength.hint: Etapa 4: --
    ["{n} tentativa(s)","one: {n} tentativa | other: {n} tentativas"], // review.match.attempts: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Você respondeu {n} palavra(s) nesta rodada.","one: Você respondeu {n} palavra nesta rodada. | other: Você respondeu {n} palavras nesta rodada."], // review.speed.answered: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Você revisou {n} cartão(s) nesta sessão.","one: Você revisou {n} cartão nesta sessão. | other: Você revisou {n} cartões nesta sessão."], // review.complete.reviewed: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Você ainda tem {n} cartão(s) pendente(s) no geral.","one: Você ainda tem {n} cartão pendente no geral. | other: Você ainda tem {n} cartões pendentes no geral."], // review.session.pendingOverall: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["? Faça esse teste e avance direto pro ","? Faça esse teste e avance direto para o "], // trail.levelTest.sub: Etapa 4: pra
    ["? Faça esse teste — se for bem, todo o nível é marcado como concluído e você já pode seguir direto pro ","? Faça esse teste — se for bem, todo o nível é marcado como concluído e você já pode seguir direto para o "], // trail.levelTest.intro: Etapa 4: pra
    ["{n} cartão(ões) de Completar a frase ficaram de fora: este formato só leva frente e verso.","one: {n} cartão de Completar a frase ficou de fora: este formato só leva frente e verso. | other: {n} cartões de Completar a frase ficaram de fora: este formato só leva frente e verso."], // myFlashcards.export.leftOut: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["O arquivo tem {total} cartão(ões), mas só os primeiros {kept} cabem no plano grátis. Importar esses {kept}?","one: O arquivo tem {total} cartão, mas só os primeiros {kept} cabem no plano grátis. Importar esses {kept}? | other: O arquivo tem {total} cartões, mas só os primeiros {kept} cabem no plano grátis. Importar esses {kept}?"], // myFlashcards.import.confirmCut: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Arquivo/link não tem nenhum cartão pra importar.","Arquivo/link não tem nenhum cartão para importar."], // myFlashcards.import.errEmpty: Etapa 4: pra
    ["Importar {n} cartão(ões) pra sua conta?","one: Importar {n} cartão para sua conta? | other: Importar {n} cartões para sua conta?"], // myFlashcards.import.confirm: Etapa 4: pra / plural (plural {one, other}: registro; o teste confere one/other)
    ["✓ {n} cartão(ões) importado(s).","one: ✓ {n} cartão importado. | other: ✓ {n} cartões importados."], // myFlashcards.import.done: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Digite um nome pro Deck.","Digite um nome para o Deck."], // deck.err.nameRequired: Etapa 4: pra
    ["% pra ser aprovado. Continue estudando as unidades desta seção e tente de novo quando quiser — sem pressa.","% para ser aprovado. Continue estudando as unidades desta seção e tente de novo quando quiser — sem pressa."], // fr.moduleDone.retryNote: Etapa 4: pra
    ["Você já pode seguir direto pro ","Você já pode seguir direto para o "], // fr.levelTest.goStraightTo: Etapa 4: pra
    ["Ouça de novo com atenção aos sons -- é uma expressão do tema desta unidade.","Ouça de novo com atenção aos sons. É uma expressão do tema desta unidade."], // zh.hint.listenAgain: Etapa 4: --
    ["Identifique primeiro quem realiza a ação e depois a ação em si -- monte a frase seguindo essa ordem de raciocínio, ignorando os blocos que não pertencem a ela.","Identifique primeiro quem realiza a ação e depois a ação em si. Monte a frase seguindo essa ordem de raciocínio, ignorando os blocos que não pertencem a ela."], // zh.hint.reorder: Etapa 4: --
    ["{n} atividade(s) em {date}","one: {n} atividade em {date} | other: {n} atividades em {date}"], // zh.progress.heatCell: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Você ainda tem {n} caractere(s) pendente(s).","one: Você ainda tem {n} caractere pendente. | other: Você ainda tem {n} caracteres pendentes."], // zh.hanzi.pendingChars: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Você revisou {n} caractere(s) nesta sessão.","one: Você revisou {n} caractere nesta sessão. | other: Você revisou {n} caracteres nesta sessão."], // zh.hanzi.sessionReviewed: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Aparece em {n} caractere(s) que você já estudou","one: Aparece em {n} caractere que você já estudou | other: Aparece em {n} caracteres que você já estudou"], // zh.hanzi.appearsInCount: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Ouça de novo com atenção aos sons -- é uma expressão do tema desta unidade.","Ouça de novo com atenção aos sons. É uma expressão do tema desta unidade."], // fr.hint.listenAgain: Etapa 4: --
    ["Primeiro descarte os blocos que não pertencem a esta frase -- só depois pense na ordem das palavras que sobraram.","Primeiro descarte os blocos que não pertencem a esta frase. Só depois pense na ordem das palavras que sobraram."], // fr.hint.reorderTranslate: Etapa 4: --
    ["Identifique primeiro quem realiza a ação e depois a ação em si -- monte a frase seguindo essa ordem de raciocínio, ignorando os blocos que não pertencem a ela.","Identifique primeiro quem realiza a ação e depois a ação em si. Monte a frase seguindo essa ordem de raciocínio, ignorando os blocos que não pertencem a ela."], // fr.hint.reorderOrder: Etapa 4: --
    ["⚠ Não deu pra salvar a troca de idioma agora, mas você já vai entrar em ","⚠ Não deu para salvar a troca de idioma agora, mas você já vai entrar em "], // langSwitcher.saveFailed: Etapa 4: pra
    ["Selecione ao menos um dia da semana pra calcularmos sua meta.","Selecione ao menos um dia da semana para calcularmos sua meta."], // wizard.card.estimateNone: Etapa 4: pra
    ["\" aqui embaixo pra pular pro próximo nível.","\" aqui embaixo para pular para o próximo nível."], // auth.levelTestHint: Etapa 4: pra
    ["⚠ Seu progresso aqui parece desatualizado em relação ao que já foi salvo -- recarregue a página se isto persistir.","⚠ Seu progresso aqui parece desatualizado em relação ao que já foi salvo. Recarregue a página se isto persistir."], // auth.staleLocal: Etapa 4: --
    ["⚠️ Modo convidado — crie uma conta pra ter um perfil salvo (username, bio) e visível entre sessões.","⚠️ Modo convidado — crie uma conta para ter um perfil salvo (username, bio) e visível entre sessões."], // profile.guestNote: Etapa 4: pra
    ["{n} cartão(ões) selecionado(s)","one: {n} cartão selecionado | other: {n} cartões selecionados"], // publicProfile.counter: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["✓ {n} cartão(ões) adicionado(s) à sua conta.","one: ✓ {n} cartão adicionado à sua conta. | other: ✓ {n} cartões adicionados à sua conta."], // publicProfile.imported: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["As tags serão salvas em cada cartão (Note) exatamente como no Anki (normalizadas -- minúsculas, sem acento, espaços viram \"-\") e ficarão disponíveis pra filtro quando o Painel existir.","As tags serão salvas em cada cartão (Note) exatamente como no Anki (normalizadas: minúsculas, sem acento, espaços viram \"-\") e ficarão disponíveis para filtro quando o Painel existir."], // ankiImport.tags.note: Etapa 4: -- / pra
    ["<strong>{n}</strong> cartão(ões) encontrado(s) no arquivo --","one: <strong>{n}</strong> cartão encontrado no arquivo: | other: <strong>{n}</strong> cartões encontrados no arquivo:"], // ankiImport.summary.found: Etapa 4: -- / plural (plural {one, other}: registro; o teste confere one/other)
    [" têm áudio/imagem -- só é baixado/enviado dos cartões que você de fato confirmar."," têm áudio/imagem. Isso só é baixado/enviado dos cartões que você de fato confirmar."], // ankiImport.summary.media: Etapa 4: --
    ["{n} cartão(ões) selecionado(s)","one: {n} cartão selecionado | other: {n} cartões selecionados"], // ankiImport.counter: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["+ {n} outro(s) cartão(ões) não mostrados aqui (a seleção \"Selecionar todos\" inclui todos mesmo assim).","one: + {n} outro cartão não mostrado aqui (a seleção \"Selecionar todos\" inclui todos mesmo assim). | other: + {n} outros cartões não mostrados aqui (a seleção \"Selecionar todos\" inclui todos mesmo assim)."], // ankiImport.truncated: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Salvando... ({n} lote(s) ok)","one: Salvando... ({n} lote ok) | other: Salvando... ({n} lotes ok)"], // ankiImport.savingBatches: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["✓ <strong>{imported}</strong> de {n} cartão(ões) selecionados foram importados com sucesso.","one: ✓ <strong>{imported}</strong> de {n} cartão selecionado foi importado com sucesso. | other: ✓ <strong>{imported}</strong> de {n} cartões selecionados foram importados com sucesso."], // ankiImport.result.ok: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["⚠️ A importação parou no meio -- <strong>","⚠️ A importação parou no meio. <strong>"], // ankiImport.result.partial: Etapa 4: --
    ["⚠️ {n} mídia(s) não puderam ser incluídas (o texto do cartão foi importado normalmente): {list}{more}","one: ⚠️ {n} mídia não pôde ser incluída (o texto do cartão foi importado normalmente): {list}{more} | other: ⚠️ {n} mídias não puderam ser incluídas (o texto do cartão foi importado normalmente): {list}{more}"], // ankiImport.result.mediaWarn: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} Deck(s) criado(s) a partir das pastas do Anki.","one: {n} Deck criado a partir das pastas do Anki. | other: {n} Decks criados a partir das pastas do Anki."], // ankiImport.result.decksCreated: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["({n} cartão(ões) do Anki ficaram de fora.)","one: ({n} cartão do Anki ficou de fora.) | other: ({n} cartões do Anki ficaram de fora.)"], // ankiImport.result.cutTail: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["({n} cartão(ões) não importados.)","one: ({n} cartão não importado.) | other: ({n} cartões não importados.)"], // ankiImport.result.deckFailed: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    [" ({n} arquivo(s) de mídia não puderam ser incluídos -- os cartões foram exportados mesmo assim, só sem esse áudio/imagem específico.)","one:  ({n} arquivo de mídia não pôde ser incluído. Os cartões foram exportados mesmo assim, só sem esse áudio/imagem específico.) | other:  ({n} arquivos de mídia não puderam ser incluídos. Os cartões foram exportados mesmo assim, só sem esses áudios/imagens específicos.)"], // ankiExport.mediaNote: Etapa 4: -- / plural (plural {one, other}: registro; o teste confere one/other)
    ["Exportado! {n} cartão(ões) no arquivo .apkg — importe direto no Anki.{mediaNote}","one: Exportado! {n} cartão no arquivo .apkg — importe direto no Anki.{mediaNote} | other: Exportado! {n} cartões no arquivo .apkg — importe direto no Anki.{mediaNote}"], // ankiExport.done: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["-- escolha o idioma --","Escolha o idioma"], // fieldEditor.audio.ttsLang.choose: Etapa 4: --
    ["Múltipla escolha não aceita Field sem papel definido ({n} campo(s) sem prompt/resposta/distrator) -- atribua um papel ou remova.","one: Múltipla escolha não aceita Field sem papel definido ({n} campo sem prompt/resposta/distrator). Atribua um papel ou remova. | other: Múltipla escolha não aceita Field sem papel definido ({n} campos sem prompt/resposta/distrator). Atribua um papel ou remova."], // mcEditor.err.unrecognized: Etapa 4: -- / plural (plural {one, other}: registro; o teste confere one/other)
    ["Nenhum distrator ainda -- adicione pelo menos 1.","Nenhum distrator ainda. Adicione pelo menos 1."], // mcEditor.noDistractors: Etapa 4: --
    ["Estes campos vieram de outro modo e ainda não têm função aqui -- remova-os ou atribua um papel pra estrutura ficar válida.","Estes campos vieram de outro modo e ainda não têm função aqui. Remova-os ou atribua um papel para a estrutura ficar válida."], // mcEditor.othersHint: Etapa 4: -- / pra
    ["Um campo não pode apontar pra si mesmo como pinyin.","Um campo não pode apontar para si mesmo como pinyin."], // taEditor.err.selfPinyin: Etapa 4: pra
    ["Digite a resposta não aceita Field sem papel definido ({n} campo(s) sem prompt/resposta) -- atribua um papel ou remova.","one: Digite a resposta não aceita Field sem papel definido ({n} campo sem prompt/resposta). Atribua um papel ou remova. | other: Digite a resposta não aceita Field sem papel definido ({n} campos sem prompt/resposta). Atribua um papel ou remova."], // taEditor.err.unrecognized: Etapa 4: -- / plural (plural {one, other}: registro; o teste confere one/other)
    ["Associado a outro campo via pinyinFieldId -- editável normalmente, nunca conta como um 3º campo de pergunta/resposta.","Ligado a outro campo como pinyin. Editável normalmente, nunca conta como um 3º campo de pergunta/resposta."], // taEditor.pinyinHint: Etapa 4: --
    ["Estes campos vieram de outro modo e ainda não têm função aqui -- remova-os ou atribua um papel pra estrutura ficar válida.","Estes campos vieram de outro modo e ainda não têm função aqui. Remova-os ou atribua um papel para a estrutura ficar válida."], // taEditor.othersHint: Etapa 4: -- / pra
    ["Permissão de microfone negada -- não foi possível gravar. Você pode permitir o acesso ao microfone nas configurações do navegador e tentar de novo.","Permissão de microfone negada. Não foi possível gravar. Você pode permitir o acesso ao microfone nas configurações do navegador e tentar de novo."], // recorder.err.permissionDenied: Etapa 4: --
    ["Ocorreu um erro durante a gravação -- tente de novo.","Ocorreu um erro durante a gravação. Tente de novo."], // recorder.err.recordingError: Etapa 4: --
    ["Gravação concluída, mas não foi possível salvá-la -- tente de novo.","Gravação concluída, mas não foi possível salvá-la. Tente de novo."], // recorder.err.uploadError: Etapa 4: --
    ["A frase tem uma marcação de lacuna malformada -- remova e marque de novo.","A frase tem uma marcação de lacuna malformada. Remova e marque de novo."], // clozeEditor.err.malformed: Etapa 4: --
    ["IDs de lacuna duplicados -- estado inconsistente.","Duas lacunas ficaram com a mesma marca. Remova uma delas e marque de novo."], // clozeEditor.err.duplicateIds: Etapa 4: --
    ["\" (obrigatório pra mandarim) -- clique nela pra completar.","\" (obrigatório para mandarim). Clique nela para completar."], // clozeEditor.err.missingPinyin: Etapa 4: -- / pra
    ["Estes campos vieram de outro modo e ainda não têm função aqui -- remova-os.","Estes campos vieram de outro modo e ainda não têm função aqui. Remova-os."], // clozeEditor.othersHint: Etapa 4: --
    ["Selecione uma palavra ou trecho da frase e clique em \"Marcar seleção como lacuna\" -- pode marcar mais de um trecho.","Selecione uma palavra ou trecho da frase e clique em \"Marcar seleção como lacuna\". Pode marcar mais de um trecho."], // clozeEditor.sentenceHint: Etapa 4: --
    ["Essa seleção já inclui (total ou parcialmente) uma lacuna existente -- marque um trecho fora das lacunas já criadas.","Essa seleção já inclui (total ou parcialmente) uma lacuna existente. Marque um trecho fora das lacunas já criadas."], // clozeEditor.sel.overlaps: Etapa 4: --
    ["O serviço de voz não conseguiu gerar o áudio agora -- tente de novo em instantes.","O serviço de voz não conseguiu gerar o áudio agora. Tente de novo em instantes."], // flashcardModel.tts.providerError: Etapa 4: --
    ["O serviço de voz está sobrecarregado -- tente de novo em alguns minutos.","O serviço de voz está sobrecarregado. Tente de novo em alguns minutos."], // flashcardModel.tts.providerRateLimited: Etapa 4: --
    ["Não foi possível conferir seu limite de áudios agora -- tente de novo em instantes.","Não foi possível conferir seu limite de áudios agora. Tente de novo em instantes."], // flashcardModel.tts.quotaCheckFailed: Etapa 4: --
    ["Voz inválida para este idioma -- deixe o campo \"Voz\" em branco para usar a voz padrão.","Voz inválida para este idioma. Deixe o campo \"Voz\" em branco para usar a voz padrão."], // flashcardModel.tts.invalidVoice: Etapa 4: --
    ["Muitas gerações de áudio em pouco tempo -- espere alguns minutos e tente de novo.","Muitas gerações de áudio em pouco tempo. Espere alguns minutos e tente de novo."], // flashcardModel.tts.rateLimited: Etapa 4: --
    ["Sessão expirada -- faça login de novo.","Sessão expirada. Faça login de novo."], // flashcardModel.tts.invalidSession: Etapa 4: --
    ["Áudio gerado, mas não foi possível salvá-lo -- tente de novo.","Áudio gerado, mas não foi possível salvá-lo. Tente de novo."], // flashcardModel.tts.uploadFailed: Etapa 4: --
    ["Isto é só uma pré-visualização de como o cartão vai aparecer na Revisão -- nada é salvo ou avaliado aqui.","Isto é só uma pré-visualização de como o cartão vai aparecer na Revisão. Nada é salvo ou avaliado aqui."], // flashcardPreview.modal.hint: Etapa 4: --
    ["Crie seus próprios flashcards -- palavras e frases que você quer memorizar, mesmo que não estejam na trilha.","Crie seus próprios flashcards: palavras e frases que você quer memorizar, mesmo que não estejam na trilha."], // ui.myCards.sub: Etapa 4: --
    ["Confirmar uma resposta digitada e avançar pra próxima","Confirmar uma resposta digitada e avançar para a próxima"], // ui.kbd.confirm: Etapa 4: pra
    ["Os números só aparecem quando um exercício tem alternativas pra escolher -- nunca durante digitação ou o exercício de ordenar frase. \"r\" repete o último áudio que tocou na tela.","Os números só aparecem quando um exercício tem alternativas para escolher, nunca durante digitação ou o exercício de ordenar frase. \"r\" repete o último áudio que tocou na tela."], // ui.kbd.note: Etapa 4: -- / pra
    ["Arquivo maior que 5 MB -- escolha um arquivo de áudio menor.","Arquivo maior que 5 MB. Escolha um arquivo de áudio menor."], // media.audioTooBig: Etapa 4: --
    ["Entre com sua conta pra salvar uma foto.","Entre com sua conta para salvar uma foto."], // profile.err.photoLoginRequired: Etapa 4: pra
    [", {n} unificada(s)","one: , {n} unificada | other: , {n} unificadas"], // tagManager.done.merged: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Esta frase de completar não tem nenhum \"___\" marcando a lacuna -- não dá pra saber onde a resposta entra. Corrija a frase pelo formulário de sempre antes de usar o editor novo.","Esta frase de completar não tem nenhum \"___\" marcando a lacuna, então não dá para saber onde a resposta entra. Corrija a frase pelo formulário de sempre antes de usar o editor novo."], // noteConvert.err.noBlank: Etapa 4: -- / pra
    ["Esta frase de completar tem mais de um \"___\" -- o formulário legado só suporta 1 lacuna por cartão, então não dá pra determinar automaticamente qual delas vira a marca nativa. Corrija a frase pelo formulário de sempre antes de usar o editor novo.","Esta frase de completar tem mais de um \"___\". O formulário legado só suporta 1 lacuna por cartão, então não dá para determinar automaticamente qual delas vira a marca nativa. Corrija a frase pelo formulário de sempre antes de usar o editor novo."], // noteConvert.err.manyBlanks: Etapa 4: -- / pra
    ["Este cartão de múltipla escolha não tem uma resposta certa definida (verso vazio) -- não dá pra determinar qual é a resposta certa. Preencha o verso pelo formulário de sempre antes de usar o editor novo.","Este cartão de múltipla escolha não tem uma resposta certa definida (verso vazio), então não dá para determinar qual é a resposta certa. Preencha o verso pelo formulário de sempre antes de usar o editor novo."], // noteConvert.err.mcNoAnswer: Etapa 4: -- / pra
    ["{n} tag(s) foram ignoradas por passar do limite ({max} tags por cartão, {len} caracteres por tag).","one: {n} tag foi ignorada por passar do limite ({max} tags por cartão, {len} caracteres por tag). | other: {n} tags foram ignoradas por passar do limite ({max} tags por cartão, {len} caracteres por tag)."], // import.tagsDropped.limit: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} tag(s) de sistema (atribuição de autoria) não são importadas por arquivo/link: só uma cópia feita pelo app a cria.","one: {n} tag de sistema (atribuição de autoria) não é importada por arquivo/link: só uma cópia feita pelo app a cria. | other: {n} tags de sistema (atribuição de autoria) não são importadas por arquivo/link: só uma cópia feita pelo app a cria."], // import.tagsDropped.system: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Não foi possível carregar o leitor de banco de dados agora. Tente novamente em instantes.","Não foi possível carregar o leitor de arquivos do Anki agora. Tente novamente em instantes."], // ankiImport.err.loadDb: Etapa 4: jargão técnico
    ["Este .apkg não contém um banco de coleção reconhecível (collection.anki2/anki21).","Este .apkg não contém uma coleção de cartões reconhecível."], // ankiImport.parse.missing_collection: Etapa 4: jargão técnico
    ["Não foi possível ler o banco de dados da coleção dentro do .apkg.","Não foi possível ler a coleção de cartões dentro do .apkg."], // ankiImport.parse.unreadable_collection: Etapa 4: jargão técnico
    ["O banco de dados da coleção está corrompido ou num formato SQLite não reconhecido.","A coleção de cartões deste .apkg está corrompida ou num formato não reconhecido."], // ankiImport.parse.invalid_sqlite: Etapa 4: jargão técnico
    ["Este .apkg usa o formato mais novo do Anki (compactação zstd, collection.anki21b), ainda não suportado por este importador. No Anki, ao exportar, marque a opção \"Suporte a versões legadas do Anki\" (ou \"Support older Anki versions\") pra gerar um pacote compatível, e tente de novo.","Este .apkg usa o formato mais novo do Anki, ainda não suportado por este importador. No Anki, ao exportar, marque a opção \"Suporte a versões legadas do Anki\" (ou \"Support older Anki versions\") para gerar um pacote compatível, e tente de novo."], // ankiImport.parse.unsupported_format_zstd: Etapa 4: pra
    ["Este .apkg foi exportado num formato mais novo do Anki, cujos modelos de cartão ficam guardados em protobuf binário (não suportado por este importador -- decodificar isso à mão arriscaria corromper o conteúdo). No Anki, ao exportar, marque a opção \"Suporte a versões legadas do Anki\" (ou \"Support older Anki versions\") pra gerar um pacote compatível, e tente de novo.","Este .apkg foi exportado num formato mais novo do Anki, ainda não suportado por este importador. No Anki, ao exportar, marque a opção \"Suporte a versões legadas do Anki\" (ou \"Support older Anki versions\") para gerar um pacote compatível, e tente de novo."], // ankiImport.parse.unsupported_format_protobuf: Etapa 4: -- / pra
    ["Frente ou verso ficou vazio depois de limpar HTML/mídia -- Note pulada.","Frente ou verso ficou vazio depois de tirar a formatação e a mídia. Note pulada."], // ankiImport.warn.emptyFrontBack: Etapa 4: --
    ["Pinyin, caractere ou tradução ficou vazio depois de limpar HTML/mídia -- Note pulada.","Pinyin, caractere ou tradução ficou vazio depois de tirar a formatação e a mídia. Note pulada."], // ankiImport.warn.emptyZh: Etapa 4: --
    ["Pergunta ou resposta ficou vazia depois de limpar HTML/mídia -- Note pulada.","Pergunta ou resposta ficou vazia depois de tirar a formatação e a mídia. Note pulada."], // ankiImport.warn.emptyQA: Etapa 4: --
    ["Este cartão Cloze não tem um 2º campo de tradução preenchido no Anki -- o app exige uma tradução pra este formato, então a Note foi pulada. Pode ser criada manualmente depois.","Este cartão Cloze não tem um 2º campo de tradução preenchido no Anki. O app exige uma tradução para este formato, então a Note foi pulada. Pode ser criada manualmente depois."], // ankiImport.warn.clozeNoTranslation: Etapa 4: -- / pra
    ["Nenhuma lacuna Cloze válida encontrada no texto -- Note pulada.","Nenhuma lacuna Cloze válida encontrada no texto. Note pulada."], // ankiImport.warn.noClozeMarks: Etapa 4: --
    ["{n} dica(s) de lacuna do Anki não foram preservadas (sem equivalente seguro neste app) -- a resposta em si foi mantida.","one: {n} dica de lacuna do Anki não foi preservada (sem equivalente seguro neste app). A resposta em si foi mantida. | other: {n} dicas de lacuna do Anki não foram preservadas (sem equivalente seguro neste app). A resposta em si foi mantida."], // ankiImport.warn.hintsDropped: Etapa 4: -- / plural (plural {one, other}: registro; o teste confere one/other)
    ["Formato de cartão não reconhecido (não é um Básico/Básico invertido/Cloze/Digite a resposta reconhecível) -- Note pulada.","Formato de cartão não reconhecido (não é um Básico/Básico invertido/Cloze/Digite a resposta reconhecível). Note pulada."], // ankiImport.warn.unrecognized: Etapa 4: --
    ["Modelo de cartão referenciado por esta Note não existe na coleção -- Note pulada.","Modelo de cartão referenciado por esta Note não existe na coleção. Note pulada."], // ankiImport.warn.missingModel: Etapa 4: --
    ["Tipo de cartão do Anki não reconhecido de forma segura (não é Básico/Básico invertido/Cloze/Digite a resposta claro) -- Note pulada.","Tipo de cartão do Anki não reconhecido de forma segura (não é Básico/Básico invertido/Cloze/Digite a resposta claro). Note pulada."], // ankiImport.warn.unrecognizedType: Etapa 4: --
    ["{n} tag(s) de sistema ({tags}) não podem ser importadas: a atribuição de autoria só é criada pelo próprio app.","one: {n} tag de sistema ({tags}) não pode ser importada: a atribuição de autoria só é criada pelo próprio app. | other: {n} tags de sistema ({tags}) não podem ser importadas: a atribuição de autoria só é criada pelo próprio app."], // ankiImport.warn.systemTags: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} tag(s) acima de {max} caracteres não foram importadas: {tags}.","one: {n} tag acima de {max} caracteres não foi importada: {tags}. | other: {n} tags acima de {max} caracteres não foram importadas: {tags}."], // ankiImport.warn.tagsTooLong: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Limite de {max} tags por cartão: {n} tag(s) não foram importadas: {tags}.","one: Limite de {max} tags por cartão: {n} tag não foi importada: {tags}. | other: Limite de {max} tags por cartão: {n} tags não foram importadas: {tags}."], // ankiImport.warn.tagsOverLimit: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} template(s) extra deste tipo de cartão não foram preservados (só o 1º foi importado).","one: {n} template extra deste tipo de cartão não foi preservado (só o 1º foi importado). | other: {n} templates extras deste tipo de cartão não foram preservados (só o 1º foi importado)."], // ankiImport.warn.extraTemplates: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["+ {n} outro(s)","one: + {n} outro | other: + {n} outros"], // ankiImport.conflict.more: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} conteúdo(s) têm o mesmo par em outro tipo de cartão na sua coleção. Não são importados.","one: {n} conteúdo tem o mesmo par em outro tipo de cartão na sua coleção. Não é importado. | other: {n} conteúdos têm o mesmo par em outro tipo de cartão na sua coleção. Não são importados."], // publicDeck.plan.relatedHint: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} repetida(s) dentro do próprio Deck: importada(s) uma única vez.","one: {n} repetida dentro do próprio Deck: importada uma única vez. | other: {n} repetidas dentro do próprio Deck: importadas uma única vez."], // publicDeck.plan.sourceDup: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} Note(s) não puderam ser importadas (formato incompatível).","one: {n} Note não pôde ser importada (formato incompatível). | other: {n} Notes não puderam ser importadas (formato incompatível)."], // publicDeck.plan.incompatible: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["{n} cartão(ões) a estudar.","one: {n} cartão a estudar. | other: {n} cartões a estudar."], // publicDeck.plan.toStudy: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Este cartão usa o novo modelo de campos — editando aqui, o conteúdo é gravado em fields/card_generation_mode, nunca nas colunas antigas.","Este cartão usa o novo modelo de campos — editando aqui, o conteúdo é gravado só nesse modelo, nunca no formato antigo."], // myFlashcards.native.hint: Etapa 4: jargão técnico
    ["Você ainda não criou nenhum cartão pra este aluno, na aba \"📇 Flashcards\".","Você ainda não criou nenhum cartão para este aluno, na aba \"📇 Flashcards\"."], // admin.students.metrics.noCards: Etapa 4: pra
    ["Busque uma conta por @username e ative o plano Premium pra ela -- funciona pra QUALQUER conta registrada, vinculada a você como aluno ou não. Sem cobrança real ainda (sem checkout configurado) -- é uma concessão manual, reversível a qualquer momento.","Busque uma conta por @username e ative o plano Premium para ela. Funciona para QUALQUER conta registrada, vinculada a você como aluno ou não. Sem cobrança real ainda (sem checkout configurado): é uma concessão manual, reversível a qualquer momento."], // admin.premium.hint: Etapa 4: -- / pra
    ["Digite um título pro material.","Digite um título para o material."], // teacherMaterials.err.titleRequired: Etapa 4: pra
    ["({n} cartão(ões)","one: ({n} cartão | other: ({n} cartões"], // admin.flashcards.dest.countCards: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    [", {n} subdeck(s)","one: , {n} subdeck | other: , {n} subdecks"], // admin.flashcards.dest.countSubdecks: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["✓ {ok} cartão(ões) criado(s); falhou para: {failed}.","one: ✓ {ok} cartão criado; falhou para: {failed}. | other: ✓ {ok} cartões criados; falhou para: {failed}."], // admin.flashcards.createdPartial: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Dê um nome pro badge.","Dê um nome para o badge."], // admin.badges.err.name: Etapa 4: pra
    ["Escolha um emoji pro badge.","Escolha um emoji para o badge."], // admin.badges.err.icon: Etapa 4: pra
    ["A taxa de conclusão só usa os exercícios que têm um \"começo\" registrado (flashcards, revisão rápida, jogo da memória, hanzi, ditado, conjugação). Lições de vocabulário e checkpoints de unidade não entram nessa conta porque só sabemos quando terminam, não quando começam — por isso \"Exercícios concluídos\" (acima) é maior que \"Exercícios iniciados\": ele soma TODOS os tipos, os com início e os sem. Pra ver cada tipo separado, veja a aba Exercícios.","A taxa de conclusão só usa os exercícios que têm um \"começo\" registrado (flashcards, revisão rápida, jogo da memória, hanzi, ditado, conjugação). Lições de vocabulário e checkpoints de unidade não entram nessa conta porque só sabemos quando terminam, não quando começam — por isso \"Exercícios concluídos\" (acima) é maior que \"Exercícios iniciados\": ele soma TODOS os tipos, os com início e os sem. Para ver cada tipo separado, veja a aba Exercícios."], // admin.analytics.resumo.rateNote: Etapa 4: pra
    ["✅ {n} desafio(s) importado(s) como pendente(s) de revisão.","one: ✅ {n} desafio importado como pendente de revisão. | other: ✅ {n} desafios importados como pendentes de revisão."], // adminChallenges.import.ok: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["⚠ {n} pulado(s):","one: ⚠ {n} pulado: | other: ⚠ {n} pulados:"], // adminChallenges.import.skipped: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["Dica (cloze, com ______ pra parte oculta)","Dica (cloze, com ______ para a parte oculta)"], // adminChallenges.edit.hint: Etapa 4: pra
    ["Desafio publicado — já está visível pro aluno.","Desafio publicado — já está visível para o aluno."], // adminChallenges.toast.published: Etapa 4: pra
    ["Desafio despublicado — não aparece mais pro aluno.","Desafio despublicado — não aparece mais para o aluno."], // adminChallenges.toast.unpublished: Etapa 4: pra
    ["Selecionar pra aprovação em lote","Selecionar para aprovação em lote"], // adminChallenges.bulk.checkboxAria: Etapa 4: pra
    ["⚠ Não foi possível carregar os desafios agora. Verifique sua conexão e tente novamente -- isto NÃO significa que a fila está vazia.","⚠ Não foi possível carregar os desafios agora. Verifique sua conexão e tente novamente. Isto NÃO significa que a fila está vazia."], // adminChallenges.loadFailed: Etapa 4: --
    ["Aprovar e publicar {n} desafio(s) selecionado(s)? Só quem não tiver nenhum problema no checklist de qualidade é publicado automaticamente -- o resto continua pendente pra revisão individual.","one: Aprovar e publicar {n} desafio selecionado? Só quem não tiver nenhum problema no checklist de qualidade é publicado automaticamente. O resto continua pendente para revisão individual. | other: Aprovar e publicar {n} desafios selecionados? Só quem não tiver nenhum problema no checklist de qualidade é publicado automaticamente. O resto continua pendente para revisão individual."], // adminChallenges.bulk.confirm: Etapa 4: -- / pra / plural (plural {one, other}: registro; o teste confere one/other)
    ["{published} desafio(s) publicado(s).","one: {published} desafio publicado. | other: {published} desafios publicados."], // adminChallenges.bulk.published: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ["`${published} publicado(s). ${skipped.length} pulado(s) por ter algum problema no checklist -- revise um por um: ${skipped.join(', ')}`", "`Publicados: ${published}. Pulados por ter algum problema no checklist: ${skipped.length}. Revise um por um: ${skipped.join(', ')}`"], // adminChallenges.bulk.publishedSkipped: Etapa 4: -- / plural (dois números: viraram rótulos; par no formato do código original)
    ["Despublicar este desafio? Ele deixa de aparecer pro aluno imediatamente.","Despublicar este desafio? Ele deixa de aparecer para o aluno imediatamente."], // adminChallenges.confirm.unpublish: Etapa 4: pra
    ["Sem e-mail associado a este report (convidado que não informou e-mail) -- não é possível responder.","Sem e-mail associado a este report (convidado que não informou e-mail). Não é possível responder."], // admin.modal.report.noEmail: Etapa 4: --
    ["O badge some do perfil de {n} pessoa(s) que já o recebeu. Não dá para desfazer.","one: O badge some do perfil de {n} pessoa que já o recebeu. Não dá para desfazer. | other: O badge some do perfil de {n} pessoas que já o receberam. Não dá para desfazer."], // badges.delete.textWith: Etapa 4: plural (plural {one, other}: registro; o teste confere one/other)
    ['<code>accepted</code>) -- vai direto pro banco', '<code>accepted</code>). Vai direto para o banco'], // fr/index.html (importar Desafios, admin): Etapa 4: -- / pra
  ];
  // Etapa 4, decisões da dona (2026-10-19; docs/i18n/etapa4-auditoria-escrita.md, seções 3.3 e 3.4): tom dos textos da
  // interface, gênero (convite, badge de turma, sino da professora) e "Note" virou "item" na tela. Um par por chave
  // (nas chaves de plural o par é só registro: o teste confere one/other). Pares de palavra curta vão entre aspas para
  // não trocar a mesma palavra em outros textos de referência.
  const ETAPA4_DONA = [
    ["Sem aparecer há alguns dias: {list}. Talvez seja hora de mandar um alô 👋","Uns dias sem prática por aí: {list}. Um recado seu pode ajudar a retomar o ritmo."], // panel.tbell.ev.inactive (mesmo tom do modelo da 114): Etapa 4: aprovado pela dona
    // badge.catalog.teacherClass.name / .desc: chaves novas ("Turma de {name}", "Estuda com esta professora.", iguais ao banco da 115): Etapa 4: aprovado pela dona
    ["👋 Reengajamento","👋 Lembretes para voltar"], // notif.cat.reengajamento: Etapa 4: aprovado pela dona
    ["Palavras que você errou no Ponto de verificação","Palavras para rever do Ponto de verificação"], // zh.path.lessonDone.recapMissed: Etapa 4: aprovado pela dona
    ["Buscar cartões e notas","Buscar cartões"], // review.panel.searchPlaceholder: Etapa 4: aprovado pela dona
    ["não estudou","sem estudo"], // review.week.notStudied: Etapa 4: aprovado pela dona
    ["Sessão curta: primeiro os cartões que você mais erra e os mais atrasados","Sessão curta: primeiro os cartões que você mais erra e os que esperam há mais tempo"], // review.today.shortTitle: Etapa 4: aprovado pela dona
    ["Receber lembretes de quando você deve estudar — só funciona com o navegador aberto (não temos servidor de notificação push).","Receber um lembrete no horário que você escolher. Este lembrete só aparece com o site aberto."], // wizard.notif.sub: Etapa 4: aprovado pela dona
    ["As tags serão salvas em cada cartão (Note) exatamente como no Anki (normalizadas: minúsculas, sem acento, espaços viram \"-\") e ficarão disponíveis para filtro quando o Painel existir.","As tags serão salvas em cada item exatamente como no Anki (normalizadas: minúsculas, sem acento, espaços viram \"-\") e ficarão disponíveis para filtro quando o Painel existir."], // ankiImport.tags.note: Etapa 4: aprovado pela dona
    ["Este Note não é nativo.","Este item foi criado no formato antigo e não pode ser editado aqui."], // mcEditor.err.notNative: Etapa 4: aprovado pela dona
    ["Este Note não está no modo Múltipla escolha.","Este item não é de Múltipla escolha."], // mcEditor.err.notMcMode: Etapa 4: aprovado pela dona
    ["Este Note não é nativo.","Este item foi criado no formato antigo e não pode ser editado aqui."], // taEditor.err.notNative: Etapa 4: aprovado pela dona
    ["Este Note não está no modo Digite a resposta.","Este item não é de Digite a resposta."], // taEditor.err.notTaMode: Etapa 4: aprovado pela dona
    ["Este Note não é nativo.","Este item foi criado no formato antigo e não pode ser editado aqui."], // clozeEditor.err.notNative: Etapa 4: aprovado pela dona
    ["Este Note não está no modo Completar a frase.","Este item não é de Completar a frase."], // clozeEditor.err.notClozeMode: Etapa 4: aprovado pela dona
    ["Ei, você esqueceu de mim? 🥺","Que tal 5 minutinhos de estudo hoje? 🙂"], // admin.notifications.new.bodyPh: Etapa 4: aprovado pela dona
    ["Encerrar o vínculo com este aluno? O progresso e o histórico dele continuam guardados; ele sai da sua lista e perde o seu badge de aluno/a.","Encerrar o vínculo com este aluno? O progresso e o histórico dele continuam guardados; ele sai da sua lista e perde o badge de turma."], // admin.students.removeConfirm: Etapa 4: sem aluno/a
    ["Embaixador/a","Embaixador(a)"], // badge.catalog.ambassador.name: Etapa 4: aprovado pela dona
    // badge.catalog.ambassador.name.f: chave nova (forma pelo gênero), texto novo "Embaixadora": Etapa 4: aprovado pela dona
    // badge.catalog.ambassador.name.m: chave nova (forma pelo gênero), texto novo "Embaixador": Etapa 4: aprovado pela dona
    ["Pioneiro/a","Pioneiro(a)"], // badge.catalog.pioneer.name: Etapa 4: aprovado pela dona
    // badge.catalog.pioneer.name.f: chave nova (forma pelo gênero), texto novo "Pioneira": Etapa 4: aprovado pela dona
    // badge.catalog.pioneer.name.m: chave nova (forma pelo gênero), texto novo "Pioneiro": Etapa 4: aprovado pela dona
    ["Aluno/a da Prof. Brune","Turma da Prof. Brune"], // badge.catalog.student.name: Etapa 4: aprovado pela dona
    ["Aluno/a da Prof. Brune","Estuda com a Prof. Brune"], // badge.catalog.student.desc: Etapa 4: aprovado pela dona
    ["A sequência de vocês acaba se {name} não estudar hoje","Uma lição de {name} hoje mantém a sequência de vocês"], // friends.nudge.atRisk: Etapa 4: aprovado pela dona
    ["{name} aceitou seu convite e agora é seu aluno/a de {lang} 🎉","{name} aceitou seu convite e agora estuda {lang} com você 🎉"], // panel.tbell.ev.accepted: Etapa 4: aprovado pela dona
    ["{name} entrou pelo seu link e agora é seu aluno/a de {lang} 🎉","{name} entrou pelo seu link e agora estuda {lang} com você 🎉"], // panel.tbell.ev.joinedLink: Etapa 4: aprovado pela dona
    ["{name} entrou pelo link na turma {classroom} e agora é seu aluno/a de {lang} 🎉","{name} entrou pelo link na turma {classroom} e agora estuda {lang} com você 🎉"], // panel.tbell.ev.joinClassNew: Etapa 4: aprovado pela dona
    ["Você já tem professor/a nesse idioma (é um/a por idioma).","Você já tem uma pessoa como professora nesse idioma. Dá para ter só uma por idioma."], // mural.err.student_has_teacher: Etapa 4: aprovado pela dona
    ["{name} te convidou para ser aluno/a de {lang}","{name} te convidou para as aulas de {lang}"], // tinvite.card.title: Etapa 4: aprovado pela dona
    ["Badge de aluno/a no seu perfil","Um badge de turma no seu perfil"], // tinvite.card.perkBadge: Etapa 4: aprovado pela dona
    ["Pronto! Agora você é aluno/a de {name} em {lang} 🎓","Pronto! Agora você estuda {lang} com {name} 🎓"], // tinvite.acceptedToast: Etapa 4: aprovado pela dona
    ["Essa conta já tem professor/a nesse idioma (é um/a por idioma).","Essa conta já tem uma pessoa como professora nesse idioma. Dá para ter só uma por idioma."], // tinvite.err.student_has_teacher: Etapa 4: aprovado pela dona
    ["Essa conta já é seu aluno/a nesse idioma.","Essa conta já estuda esse idioma com você."], // tinvite.err.already_student: Etapa 4: aprovado pela dona
    ["one: , {n} unificada | other: , {n} unificadas","one: , {n} unificado | other: , {n} unificados"], // tagManager.done.merged: Etapa 4: aprovado pela dona
    ["Não foi possível ler as tabelas de notas/cartões desta coleção.","Não foi possível ler os itens e cartões desta coleção."], // ankiImport.parse.malformed_notes_cards: Etapa 4: aprovado pela dona
    ["Frente ou verso ficou vazio depois de tirar a formatação e a mídia. Note pulada.","Frente ou verso ficou vazio depois de tirar a formatação e a mídia. Item pulado."], // ankiImport.warn.emptyFrontBack: Etapa 4: aprovado pela dona
    ["Pinyin, caractere ou tradução ficou vazio depois de tirar a formatação e a mídia. Note pulada.","Pinyin, caractere ou tradução ficou vazio depois de tirar a formatação e a mídia. Item pulado."], // ankiImport.warn.emptyZh: Etapa 4: aprovado pela dona
    ["Pergunta ou resposta ficou vazia depois de tirar a formatação e a mídia. Note pulada.","Pergunta ou resposta ficou vazia depois de tirar a formatação e a mídia. Item pulado."], // ankiImport.warn.emptyQA: Etapa 4: aprovado pela dona
    ["Este cartão Cloze não tem um 2º campo de tradução preenchido no Anki. O app exige uma tradução para este formato, então a Note foi pulada. Pode ser criada manualmente depois.","Este cartão Cloze não tem um 2º campo de tradução preenchido no Anki. O app exige uma tradução para este formato, então o item foi pulado. Pode ser criado manualmente depois."], // ankiImport.warn.clozeNoTranslation: Etapa 4: aprovado pela dona
    ["Nenhuma lacuna Cloze válida encontrada no texto. Note pulada.","Nenhuma lacuna Cloze válida encontrada no texto. Item pulado."], // ankiImport.warn.noClozeMarks: Etapa 4: aprovado pela dona
    ["Formato de cartão não reconhecido (não é um Básico/Básico invertido/Cloze/Digite a resposta reconhecível). Note pulada.","Formato de cartão não reconhecido (não é um Básico/Básico invertido/Cloze/Digite a resposta reconhecível). Item pulado."], // ankiImport.warn.unrecognized: Etapa 4: aprovado pela dona
    ["Modelo de cartão referenciado por esta Note não existe na coleção. Note pulada.","Modelo de cartão referenciado por este item não existe na coleção. Item pulado."], // ankiImport.warn.missingModel: Etapa 4: aprovado pela dona
    ["Tipo de cartão do Anki não reconhecido de forma segura (não é Básico/Básico invertido/Cloze/Digite a resposta claro). Note pulada.","Tipo de cartão do Anki não reconhecido de forma segura (não é Básico/Básico invertido/Cloze/Digite a resposta claro). Item pulado."], // ankiImport.warn.unrecognizedType: Etapa 4: aprovado pela dona
    ["{n} Notes","one: {n} item | other: {n} itens"], // publicDeck.notesCount: Etapa 4: aprovado pela dona
    ["Este Deck contém {n} Notes.","one: Este Deck contém {n} item. | other: Este Deck contém {n} itens."], // publicDeck.plan.contains: Etapa 4: aprovado pela dona
    ["Têm o mesmo início de uma Note sua, mas conteúdo diferente. Marque só as que quiser como Notes novas e independentes; as suas não são alteradas.","Têm o mesmo início de um item seu, mas conteúdo diferente. Marque só os que quiser como itens novos e independentes; os seus não são alterados."], // publicDeck.plan.variantsHint: Etapa 4: aprovado pela dona
    ["one: {n} Note não pôde ser importada (formato incompatível). | other: {n} Notes não puderam ser importadas (formato incompatível).","one: {n} item não pôde ser importado (formato incompatível). | other: {n} itens não puderam ser importados (formato incompatível)."], // publicDeck.plan.incompatible: Etapa 4: aprovado pela dona
    ["({n} sem Notes novas, omitidos)","({n} sem itens novos, omitidos)"], // publicDeck.plan.omitted: Etapa 4: aprovado pela dona
    ["Importar {n} Note","Importar {n} item"], // publicDeck.plan.importN.one: Etapa 4: aprovado pela dona
    ["Importar {n} Notes","Importar {n} itens"], // publicDeck.plan.importN.other: Etapa 4: aprovado pela dona
    ["✅ {n} Notes importadas","one: ✅ {n} item importado | other: ✅ {n} itens importados"], // publicDeck.done.imported: Etapa 4: aprovado pela dona
    ["{n} Notes ficarão públicas.","one: {n} item vai ficar público. | other: {n} itens vão ficar públicos."], // publicDeck.publish.notesWillBePublic: Etapa 4: aprovado pela dona
    ['} Note${st.create > 1 ?', '} item${st.create > 1 ?'], // publicDeck.plan.importN.one (no original: `Importar ${st.create} Note${st.create > 1 ? 's' : ''}`): Etapa 4: aprovado pela dona
    [' sem Notes novas, omitidos)', ' sem itens novos, omitidos)'], // publicDeck.plan.omitted (no original: `(${st.decksOmitted} sem Notes novas, omitidos)`): Etapa 4: aprovado pela dona
    ["'nota será alterada'","'item será alterado'"], // tagManager.rename.affected.one: Etapa 4: aprovado pela dona
    ["'notas serão alteradas'","'itens serão alterados'"], // tagManager.rename.affected.other: Etapa 4: aprovado pela dona
    ["'nota já usa'","'item já usa'"], // tagManager.rename.collision.one: Etapa 4: aprovado pela dona
    ["'notas já usam'","'itens já usam'"], // tagManager.rename.collision.other: Etapa 4: aprovado pela dona
    ["'nota'","'item'"], // tagManager.note.one: Etapa 4: aprovado pela dona
    ["'notas'","'itens'"], // tagManager.note.other: Etapa 4: aprovado pela dona
  ];
  const DELIBERATE_PT_CHANGES = [['arquive algum cartão que já não usa, ou peça', 'apague algum cartão, ou peça'], ['exportado de lá Você confere', 'exportado de lá. Você confere'], ['Sino na topbar + central de notificações. Desligar aqui silencia tudo de uma vez -- ajuste fino por categoria em "Personalizar por categoria" abaixo.', 'Sino no topo da tela e central de notificações. Desligar aqui silencia tudo de uma vez. Para ajustar cada categoria, use "Personalizar por categoria" abaixo.'], ['Avisa mesmo com o app fechado. Liga por categoria em "Personalizar" abaixo -- este interruptor cuida da permissão do navegador e liga tudo de uma vez.', 'Avisa mesmo com o app fechado. Este interruptor cuida da permissão do navegador e liga tudo de uma vez. Para escolher por categoria, use "Personalizar por categoria" abaixo.'], ['Manda pro e-mail da sua conta em alguns casos (ex: quando você some por um tempo). Liga por categoria em "Personalizar" abaixo -- este interruptor liga tudo de uma vez.', 'Manda para o e-mail da sua conta em alguns casos (por exemplo, quando você some por um tempo). Este interruptor liga tudo de uma vez. Para escolher por categoria, use "Personalizar por categoria" abaixo.'], ['Vale pras notificações calculadas automaticamente (revisão, sequência...) -- as que acontecem na hora (XP, badge) continuam aparecendo. Horário aproximado (ainda não ajustado ao seu fuso).', 'Vale para as notificações calculadas automaticamente (revisão, sequência...). As que acontecem na hora (XP, conquista) continuam aparecendo. Horário aproximado (ainda não ajustado ao seu fuso).'], ['🔇 Toque no alto-falante pra ouvir', '🔇 Toque no alto-falante para ouvir'], ['Escolha os tempos verbais e as categorias de verbo. Você sempre pratica as 6 pessoas.', 'Escolha os verbos e os tempos verbais.'], ['A captura, se anexada, fica visível só para a equipe -- nada é enviado automaticamente.', 'A captura, se anexada, fica visível só para a equipe. Nada é enviado automaticamente.'] /* aprovado pela autora em 2026-10-18 */, ['Continue assim: sua série será zerada se você não estudar amanhã.', 'Volte amanhã para manter sua sequência.'] /* janela da sequência sem cobrança, aprovado pela autora em 2026-10-19 */ /* Conjugação fase 2: verbos agora vêm antes; a autora tirou as 6 pessoas */ /* regra do projeto: sem "--" e sem "pra" */ /* 2026-10-19, aprovado pela dona: a Expressão respondida não acrescenta o ponto do modelo quando o texto já termina em ! ? … ou "..." ("Bom fim de semana!." -> "Bom fim de semana!"); não é troca de texto do catálogo (regra em expressionMeaningLineHTML, fr/app.js), por isso não há par aqui */, ...ETAPA4_MECANICO /* Etapa 4: -- / pra / plural */, ...ETAPA4_DONA /* Etapa 4: aprovado pela dona */];
  const prev = (f) => DELIBERATE_PT_CHANGES.reduce((acc, [o, n]) => acc.split(o).join(n), execSync(`git show ${PREV}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }));
  const prevFr = prev('fr/index.html'), prevZh = prev('zh/index.html');
  const prevJs = ['shared/my-flashcards.js', 'shared/public-profile.js', 'shared/anki-import-ui.js', 'fr/app.js', 'zh/app.js', 'shared/flashcard-model.js', 'shared/own-flashcards.js', 'shared/flashcard-preview.js', 'shared/notifications.js', 'shared/notification-preferences.js', 'shared/deck-data.js', 'shared/admin-students.js', 'shared/profile.js', 'shared/leaderboard.js', 'shared/auth.js', 'shared/support-materials-view.js', 'shared/anki-export.js', 'shared/flashcard-field-editor.js', 'shared/flashcard-mc-editor.js', 'shared/flashcard-typeanswer-editor.js', 'shared/flashcard-cloze-editor.js', 'shared/admin-flashcards.js', 'shared/admin-class-logs.js', 'shared/admin-support-materials.js', 'shared/admin-premium.js', 'shared/teacher-flashcards.js', 'shared/teacher-class-logs.js', 'shared/teacher-support-materials.js', 'shared/admin-analytics.js', 'shared/admin-badges.js', 'shared/admin-notifications.js', 'shared/admin-reports.js', 'shared/flashcard-field-audio-recorder.js', 'shared/wizard.js', 'shared/language-switcher.js', 'shared/fsrs.js', 'shared/deck-engine.js', 'shared/checkpoint-exam.js', 'shared/deck-browser.js', 'shared/review-extras.js', 'shared/study-trail-model.js'].map(prev).join('\n');
  const prev2 = (f) => execSync(`git show ${PREV2}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const prev2Fr = prev2('fr/index.html'), prev2Zh = prev2('zh/index.html');
  const prev2Js = ['shared/deck-browser.js', 'shared/review-extras.js', 'shared/study-trail-model.js', 'shared/flashcard-tags-editor.js', 'shared/flashcard-field-editor.js', 'fr/app.js', 'zh/app.js'].map(prev2).join('\n');
  // 8631db5 = ponta da branch do redesenho das lições (Ondas 0-6) antes do merge com o
  // i18n (2026-10-07): textos e HTML daquela branch também são referência.
  const PREV3 = process.env.I18N_PREV3 || '8631db5';
  // MAIN3 = main no momento desse merge (lado "theirs" do merge de 3 vias abaixo).
  const MAIN3 = process.env.I18N_MAIN3 || 'a88d0d3';
  const prev3 = (f) => execSync(`git show ${PREV3}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const prev3Js = ['fr/app.js', 'zh/app.js', 'fr/index.html', 'zh/index.html'].map(prev3).join('\n');
  // 81810d3 = branch da Etapa 3 antes do lote A (2026-10-19): trilha, cartão Continuar, Revisão do módulo e mapa
  // da trilha tinham o português escrito direto nestes arquivos (mapa e marco de Revisão nasceram depois das
  // referências acima). O texto pt-BR das chaves novas do lote A tem que existir byte a byte aqui.
  const PREV4 = process.env.I18N_PREV4 || '81810d3';
  // Lote B (mesmo commit 81810d3): frases de carregamento (utils.js), foto do perfil (profile.js), janela de sequência
  // (gamificacao.js + index.html) e o resto do HTML fixo do fr.
  // Lote C (mesmo commit 81810d3): gerenciador de Tags, excluir Deck, Meus cartões, validação de tags, novo editor,
  // importação .apkg e Decks públicos (o português estava escrito direto nestes arquivos).
  const prev4Js = ['shared/trail-map.js', 'shared/review-milestone.js', 'shared/core/revisao-decks.js', 'shared/core/estado-trilha-desafios.js', 'fr/app.js', 'zh/app.js', 'zh/index.html', 'fr/index.html', 'shared/utils.js', 'shared/profile.js', 'shared/core/gamificacao.js', 'shared/tag-manager.js', 'shared/deck-data.js', 'shared/my-flashcards.js', 'shared/flashcard-model.js', 'shared/flashcard-native-persistence.js', 'shared/own-flashcards.js', 'shared/study-trail-model.js', 'shared/anki-parser.js', 'shared/anki-import.js', 'shared/anki-import-ui.js', 'shared/public-deck.js', 'shared/public-profile.js']
    .map(f => execSync(`git show ${PREV4}:${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })).join('\n');
  // Etapa 4: as mudanças deliberadas valem para TODAS as referências (o texto de lote C, por exemplo, só existe em PREV4).
  const all = DELIBERATE_PT_CHANGES.reduce((acc, [o, n]) => acc.split(o).join(n), origFr + origZh + origRep + prevFr + prevZh + prevJs + prev2Fr + prev2Zh + prev2Js + prev3Js + prev4Js);
  // Textos NOVOS (não existiam antes): só o seletor de idioma.
  const NEW_KEYS = ['badge.catalog.teacherClass.name', 'badge.catalog.teacherClass.desc' /* Etapa 4: badge de cada professora (115) */, 'fr.conj.sessionSize', 'fr.conj.sessionForms', 'fr.conj.reviewTitle', 'fr.conj.practiceMistakes', 'fr.conj.almost', 'fr.conj.otherForm' /* Conjugação fase 1 (2026-10-13) */, 'fr.conj.sel.verbs', 'fr.conj.sel.searchLabel', 'fr.conj.sel.searchPh', 'fr.conj.sel.noMatch', 'fr.conj.sel.pickedNote', 'fr.conj.sel.removeVerb', 'fr.conj.sel.pickLimit', 'fr.conj.sel.orFilters', 'fr.conj.sel.onlyRegular', 'fr.conj.sel.onlyIrregular', 'fr.conj.sel.tenses', 'fr.conj.sel.langFr', 'fr.conj.sel.langPt' /* Conjugação fase 2: tela de escolha */, 'ui.profileEdit.country', 'ui.profileEdit.countryHint', 'ui.profileEdit.countryNone', 'ui.profileEdit.gender', 'ui.profileEdit.genderHint', 'ui.profileEdit.genderNone', 'ui.profileEdit.gender.masculine', 'ui.profileEdit.gender.feminine', 'ui.profileEdit.gender.other', 'ui.profileEdit.gender.undisclosed' /* País de origem e Gênero (placeholders de perfil) */, 'settings.uiLanguage.title', 'settings.uiLanguage.sub', 'settings.uiLanguage.confirm.title', 'settings.uiLanguage.confirm.toEn', 'settings.uiLanguage.confirm.toPt' /* aviso novo ao trocar o idioma do site */, 'content.untranslatedNotice', 'fr.challenge.inEnglish', 'nav.study', 'nav.challenges', 'nav.profile', 'adminChallenges.import.badRegister' /* regra de 12/10/2026: expressão importada sem registro é pulada */, 'fr.dict.light.multiple', 'fr.dict.part.hyphen', 'fr.dict.part.apostrophe', 'fr.dict.part.ligature', 'fr.dict.part.accent', 'fr.dict.part.and' /* família latina, fase 2 (2026-10-15): dois erros leves na mesma palavra do ditado citam os dois (decisão da dona) */, 'fr.dict.hom.ces' /* família latina, fase 2: mesmo texto do DICT_HOMOPHONE_GROUPS; só o escape \' do código antigo some */, 'notif.group.today', 'notif.group.yesterday', 'notif.group.earlier', 'notif.unread', 'notif.markAll', 'notif.markOne', 'notif.new' /* painel de Notificações (2026-10-15) */, 'settings.export.unit', 'settings.export.allUnits' /* Configurações no Pico (2026-10-17): campo de escolha da unidade */, 'profile.err.saveFailed', 'ui.profileEdit.bio', 'ui.profileEdit.bioPh', 'ui.profileEdit.changePhotoAria', 'ui.profileEdit.nameHint', 'ui.profileEdit.save', 'ui.profileEdit.shareHelper', 'ui.profileEdit.sharePrivate', 'ui.profileEdit.sharePublic', 'ui.profileEdit.shareTitle', 'ui.profileEdit.subtitle', 'ui.profileEdit.title', 'ui.profileEdit.usernameHint', 'ui.profileEdit.usernamePh', 'ui.profileEdit.changePhoto', 'ui.profileEdit.removePhoto', 'ui.profileEdit.name' /* Editar perfil (2026-10-18): textos novos aprovados pela autora (JSON edit_profile_modal) */, 'flashcardReset.modal.explain', 'flashcardReset.modal.headline', 'flashcardReset.modal.keepTip', 'flashcardReset.modal.yes', 'report.category.audio.desc', 'report.category.bug_tecnico.desc', 'report.category.comportamento_inesperado.desc', 'report.category.erro_conteudo.desc', 'report.category.outro.desc', 'report.category.sugestao_melhoria.desc', 'report.category.traducao.desc', 'report.category.visual.desc', 'report.modal.describeHint', 'report.modal.intro', 'report.modal.sendReport', 'ui.profileEdit.identityText', 'ui.profileEdit.identityTitle' /* Confirmar edição, Reportar e Editar perfil no estilo das imagens da autora (2026-10-18) */, 'fr.challenge.lt.placeholder' /* Fase 9: "{lang}" parametriza o idioma da tradução; com lang=português o texto final é idêntico ao original "Sua tradução em português..." */]; // Fase 8: aviso novo (só aparece fora do pt-BR)
  // Passada de design dos painéis Admin/Professora (2026-10-12, pedido da autora): sem "--" nem "pra" no texto
  // visível dos painéis, avisos que citavam a aba antiga "🎓 Alunos" e as notas privadas da professora nas Aulas.
  const DESIGN_PASS_KEYS = ["myFlashcards.fields.hint", "myFlashcards.edit.useNative", "myFlashcards.native.hint", "myFlashcards.err.previewLoad", "supportMaterials.loginRequired", "admin.common.adminOnly", "admin.common.forNStudents", "admin.students.removeConfirm", "admin.classLogs.fieldNotes", "admin.classLogs.notesOpt", "admin.classLogs.emptyFor", "admin.classLogs.needStudent", "admin.classLogs.linkFirst", "admin.classLogs.notesPlaceholder", "admin.classLogs.registeredN", "admin.materials.emptyFor", "admin.materials.needStudent", "admin.materials.linkFirst", "admin.materials.sentN", "admin.flashcards.hint.flip", "admin.flashcards.hint.mc", "admin.flashcards.hint.cloze", "admin.flashcards.edit.mc1", "admin.flashcards.edit.clozeSentence", "admin.flashcards.edit.hasOne", "admin.flashcards.edit.hasOneAudio", "admin.flashcards.native.privateNote", "admin.flashcards.list.emptyFor", "admin.flashcards.linkFirst", "admin.flashcards.needStudent", "admin.flashcards.createdPartial", "admin.reports.hint", "admin.reports.reply.err.forbidden", "admin.notifications.event.user_inactive_1", "admin.notifications.event.user_inactive_3", "admin.notifications.event.user_inactive_5", "admin.notifications.event.user_inactive_7", "admin.notifications.event.user_inactive_9", "admin.notifications.event.user_inactive_15", "admin.notifications.event.user_inactive_20", "admin.notifications.event.user_inactive_30", "admin.notifications.rule.hint", "admin.notifications.rule.minXp", "admin.notifications.new.hint", "admin.badges.catalog.clickManage", "admin.badges.grant.note", "admin.mode.sub", "admin.analytics.resumo.rateNote", "admin.analytics.kpi.timeNote", "admin.analytics.resumo.timeNote", "admin.analytics.ex.note", "admin.analytics.funnel.note", "admin.analytics.lang.filterActive", "admin.analytics.lang.note", "admin.analytics.prog.levelNote", "admin.analytics.prog.unitsNote", "admin.analytics.prog.lessonsNote", "admin.analytics.dev.noData", "admin.analytics.dev.osNote", "admin.analytics.eng.freqNote", "admin.analytics.eng.xpNote1", "admin.analytics.tech.note", "admin.analytics.tech.separateNote", "admin.analytics.ret.empty", "admin.analytics.ret.note"];
  // Cara de jogo, passo 4 (2026-10-12): textos de Configurações > Notificações sem "--" nem "pra" (regra do projeto).
  const GAME_PASS_KEYS = ['zh.toast.hanziLessonDone' /* troca de ícones 2026-10-14: 🈺 (japonês) virou 🀄 */, /* conquistas com níveis (2026-10-14): textos novos */ ...Object.keys(pt).filter(k => k.startsWith('badge.track.') || k.startsWith('badge.ui.')), 'notif.pref.guest', 'notif.pref.inApp.sub', 'notif.pref.push.sub', 'notif.pref.email.sub', 'notif.pref.quiet.sub', 'notif.pref.push.blocked'];
  // Design System do painel (PR 319): chaves novas cujo prefixo também tem chaves antigas (por isso não entram na regex acima).
  const PAINEL_DS_KEYS = ["notif.group.earlier", "notif.group.today", "notif.group.yesterday", "notif.markAll", "notif.markOne", "notif.new", "notif.unread", "teacherMaterials.err.badLink"];
  const NESTED_TEMPLATE_KEYS = ['review.deck.createdCount.other' /* original: criado${n === 1 ? '' : 's'} */, 'limitCut.main', 'limitCut.already', 'admin.reports.reply.lastSent', 'admin.reports.reply.lastSentTo', 'trail.moduleReview.doneOn', 'trail.moduleReview.doneOnAgain' /* lote A: original `Revisada em ${d}${why ? ' · de novo agora: ' + why : ''} (opcional)` */, 'ankiImport.err.deckCreateNamed' /* lote C: original `…Deck "${c.name}"${res && res.error ? ` (${res.error})` : ''}. Os cartões…` */, 'publicDeck.plan.importN.other' /* lote C: original `Importar ${st.create} Note${st.create > 1 ? 's' : ''}` */];
  const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const k of ptKeys){
    if (NEW_KEYS.includes(k) || DESIGN_PASS_KEYS.includes(k) || GAME_PASS_KEYS.includes(k) || PAINEL_DS_KEYS.includes(k) || /^(gate|panel|plans|perm|myClassLogs|tinvite|studentDecks|studentAnalytics|publicDeckCopies|rb|mural|studentPanel|games|sidebar|notifications|badges|reports|analytics|students|classlogs|materials|cards|dlgCheck|dlg)\./.test(k) /* painéis Admin/Professora, aba Planos, Minhas aulas e convite de aluno (2026-10-12): textos novos */ || k.startsWith('badge.catalog.') || k.startsWith('friends.') || k.startsWith('uchoice.') /* 111: escolher o @ uma vez (2026-10-17), textos novos */ || k.startsWith('courses.') || k.startsWith('courseMenu.') || k === 'profile.tabFriends' || k === 'notif.cat.amigos' || k === 'notif.pref.inAppOnly' || k === 'notif.pref.noEmail' /* 102: push de Amigos */ || k === 'publicProfile.loginToSee' || k === 'publicProfile.loginCta' || k === 'deck.publish' || k === 'review.deck.publish' || k === 'ui.profileEdit.publicProfileSub' || k === 'review.observation' || k === 'review.backToStudent' || k === 'review.session.classEmptyTitle' /* aba Aluno > Revisão (2026-10-14) */ || k === 'teacherLogs.err.needOneField' /* 094: Presença e Competências também contam */ /* Banco de Revisão (2026-10-13): rb.* e a observação da professora são textos novos */) /* perfil privado (Etapa 3b, 2026-10-12) */ continue; // badge.catalog.*: texto vem do banco (badge_catalog), não do código
    const v = pt[k];
    // Plural por categoria ({one, other}): no original o plural era montado por código (módulo${n===1?'':'s'}).
    if (v && typeof v === 'object'){ check(`regressão: pt-BR '${k}' (plural) tem one e other`, typeof v.one === 'string' && typeof v.other === 'string'); continue; }
    // Mustache literal ({{amount}}) é texto, não placeholder: byte a byte. Templates com
    // expressão aninhada no original (`${a}${b ? `...${c}` : ''}`) checam cada fragmento.
    if (/\{\{\w+\}\}/.test(v)){ check(`regressão: pt-BR '${k}' (mustache literal) existe byte a byte no original`, all.includes(v), v); continue; }
    // Lote B: o título da janela de sequência era HTML com o número e a palavra "dia"/"dias" em <span>s
    // (`Você está em uma sequência de <span…>0</span> <span…>dias</span>!` + `STATE.streak === 1 ? 'dia' : 'dias'`).
    if (k === 'streak.modal.headline.one' || k === 'streak.modal.headline.other'){
      const word = k.endsWith('.one') ? 'dia' : 'dias';
      check(`regressão: pt-BR '${k}' (janela de sequência) igual ao texto montado no original`, v === `Você está em uma sequência de {n} ${word}!` && all.includes('Você está em uma sequência de <span id="streak-days-num">0</span> <span id="streak-days-unit">dias</span>!') && all.includes("STATE.streak === 1 ? 'dia' : 'dias'"), v);
      continue;
    }
    // Lote C: a etiqueta da tag da unidade era '#' + slug, e o slug começa com 'unidade-' (studyTrailUnitTag).
    if (k === 'review.tagLabel.unitPrefix'){
      check(`regressão: pt-BR '${k}' (prefixo da etiqueta da tag da unidade) igual ao montado no original`, v === '#unidade-' && all.includes("return '#' + s;") && all.includes("const byTitle = 'unidade-' + normalizeTagSlug(unit.title);"), v);
      continue;
    }
    // Etapa 3 (a46, 2026-10-19): o nome do arquivo .apkg era um template com ternário
    // (`frances-com-prof-brune-${sel === 'all' ? 'completo' : 'unidade-'+sel}.apkg`): cada chave é um dos dois ramos.
    const APKG_FILE = { 'ankiExport.filename.fr.all': ['frances', 'completo'], 'ankiExport.filename.fr.unit': ['frances', 'unidade-{n}'],
      'ankiExport.filename.zh.all': ['chines', 'completo'], 'ankiExport.filename.zh.unit': ['chines', 'unidade-{n}'] };
    if (APKG_FILE[k]){
      const [p, ramo] = APKG_FILE[k];
      check(`regressão: pt-BR '${k}' (nome do .apkg) igual a um ramo do template original`, v === `${p}-com-prof-brune-${ramo}.apkg`
        && all.includes(`return \`${p}-com-prof-brune-\${sel === 'all' ? 'completo' : 'unidade-'+sel}.apkg\`;`), v);
      continue;
    }
    if (NESTED_TEMPLATE_KEYS.includes(k)){ check(`regressão: pt-BR '${k}' (template aninhado) fragmentos existem no original`, v.split(/\{\w+\}/).map(x => x.trim()).filter(Boolean).every(x => all.includes(x)), v); continue; }
    if (/\{\w+\}/.test(v)){
      // placeholder {x} <-> ${...} do template literal original
      const re = new RegExp(v.split(/\{\w+\}/).map(escRe).join('\\$\\{[^}]+\\}'));
      check(`regressão: pt-BR '${k}' (template) existe no original`, re.test(all), v);
    } else {
      check(`regressão: pt-BR '${k}' existe byte a byte no original`, all.includes(v), v);
    }
  }
  // HTML atual: o texto padrão continua escrito (data-i18n não removeu texto)
  for (const lang of ['fr', 'zh']){
    const cur = fs.readFileSync(path.join(ROOT, lang, 'index.html'), 'utf8');
    const o = lang === 'fr' ? origFr : origZh;
    // Fase 8: linhas novas deliberadas (aviso de lição sem tradução + script do overlay).
    // Banco de Revisão (2026-10-13): CSS e scripts novos, fora do escopo da comparação de i18n.
    const strip = (s) => s.replace(/<link rel="stylesheet" href="..\/shared\/review-bank.css">\n/, '').replace(/<script src="..\/shared\/review-(answer-extras|bank[\w-]*)\.js"><\/script>\n/g, '').replace(/\/\* Observação da professora \(depois de responder\) e "Quase lá" \(digitar\) -- Banco de Revisão \*\/\n\.review-observation\{[^\n]*\n\.review-observation strong\{[^\n]*\n\.review-almost\{[^\n]*\n/, '').replace(/\n\/\* ---------- Janelas da Revisão \(Adicionar[\s\S]*?(?=\n<\/style>\n<\/head>)/, '').replace(/\n\/\* ---------- Desafios: passada de design[\s\S]*?@media \(prefers-reduced-motion: reduce\)\{\n[^\n]*\n\}\n/, '').replace(/ data-i18n(-attr|-html)?="[^"]*"/g, '').replace(/\n[ ]*<p class="lesson-unit-goal" id="ud-lang-notice"[^\n]*<\/p>/, '').replace(/<script src="..\/shared\/content-i18n.js"><\/script>\n/, '').replace(/<script src="..\/shared\/card-variants.js"><\/script>\n/, '').replace(/<script src="..\/shared\/translation-compare.js"><\/script>\n/, '').replace(/<script src="..\/shared\/i18n\/i18n.js"><\/script>\n/, '').replace(/<script src="..\/shared\/i18n\/pt-BR.js"><\/script>\n/, '').replace(/<script src="..\/shared\/profile-placeholders.js"><\/script>\n/, '').replace(/\n[ ]*<label class="profile-edit-label" for="profile-edit-country">[\s\S]*?<\/p>\n/, '').replace(/<script src="..\/languages\/registry.js"><\/script>\n/, '').replace(/<script src="..\/shared\/course-layer.js"><\/script>\n/, '').replace(/<script src="..\/shared\/course-storage.js"><\/script>\n/, '').replace(/<script src="..\/shared\/account-progress.js"><\/script>\n/, '').replace(/<script src="..\/shared\/core\/[^"]+"><\/script>\n/g, '').replace(/<script src="lang-hooks.js"><\/script>\n/g, '').replace(/<script src="..\/shared\/my-courses.js"><\/script>\n/, '').replace(/\n[ ]*<div id="my-courses"[^\n]*<\/div>/, '').replace(/\n[ ]*<div id="ui-language-first-courses"[^\n]*<\/div>/, '').replace(/\.my-courses-list\{[^\n]*\n\.my-courses-group-title\{[^\n]*\n\.my-course\{[^\n]*\n\.my-course-tag\{[^\n]*\n/, '').replace(/<script src="..\/courses\/(fr|zh)-pt-BR\/layer.js"><\/script>\n/, '');
    const modal = (s) => s.slice(s.indexOf('<!-- ===== MODAL: REPORTAR'), s.indexOf('<div id="streak-modal-overlay"'));
    check(`${lang}: modal atual sem data-i18n == modal original`, strip(modal(cur)).split('<div class="app-modal painel janela-painel">').join('<div class="app-modal">').replace(/<div class="janela-titulo">\s*(<h3[^>]*>[^<]*<\/h3>)\s*<p class="janela-sub"[^>]*>[^<]*<\/p>\s*<\/div>/, '$1').replace(/\n\s*<div class="jp-contador"[^>]*>[^<]*<\/div>\n\s*<p class="profile-edit-hint" id="report-description-hint"[^>]*>[^<]*<\/p>/, '').replace(' aria-describedby="report-description-hint"', '').replace(' role="alert"', '').replace('>Enviar relato</button>', '>Enviar</button>') /* Reportar no estilo aprovado (2026-10-18): subtítulo, contador, texto de apoio e "Enviar relato" são acréscimos */ /* janelas pequenas no painel (2026-10-18): só classe nova */ === DELIBERATE_PT_CHANGES.reduce((acc, [a, b]) => acc.split(a).join(b), modal(o))); // mudanças de texto aprovadas valem também aqui
    // Passo "modais pequenos + seletor": contra o commit anterior (PREV), a
    // única diferença além dos atributos data-i18n* é o bloco do seletor.
    const p0 = lang === 'fr' ? prev2Fr : prev2Zh;
    // Acha o bloco do seletor com qualquer recuo (Configurações no Pico, 2026-10-17, ganhou um nível a mais).
    const selBlock = (h) => {
      const k = h.indexOf('data-i18n="settings.uiLanguage.title">');
      if (k < 0) return [-1, -1];
      const a = h.lastIndexOf('\n', h.lastIndexOf('<div class="pref-row', k)) + 1;
      const c = h.indexOf('</select>', k);
      return [a, h.indexOf('</div>\n', c) + '</div>\n'.length];
    };
    const [selStart, selEnd] = selBlock(cur);
    check(`${lang}: bloco do seletor encontrado`, selStart > 0 && selEnd > selStart);
    const curNoSel = cur.slice(0, selStart) + cur.slice(selEnd);
    // Aviso novo ao trocar o idioma do site (modal inteiro, texto novo deliberado).
    const cmS = curNoSel.indexOf('<div id="ui-language-confirm-modal"'), cmE = curNoSel.indexOf('<div id="flashcard-reset-confirm-modal"');
    check(`${lang}: modal de confirmação do idioma encontrado`, cmS > 0 && cmE > cmS);
    // Campo Gênero (profile_private, migration 073): bloco novo e deliberado do perfil.
    const gS = curNoSel.indexOf('        <label data-i18n="ui.profileEdit.gender"'), gE = curNoSel.indexOf('</p>\n', curNoSel.indexOf('data-i18n="ui.profileEdit.genderHint"')) + 5;
    check(`${lang}: bloco novo do campo Gênero encontrado`, gS > 0 && gE > gS);
    const curNoGender = curNoSel.slice(0, gS) + curNoSel.slice(gE).replace(/^\n/, '');
    const cmS2 = curNoGender.indexOf('<div id="ui-language-confirm-modal"'), cmE2 = curNoGender.indexOf('<div id="flashcard-reset-confirm-modal"');
    let curClean = curNoGender.slice(0, cmS2) + curNoGender.slice(cmE2);
    // Amigos + Ranking de Amigos (migration 073/074): CSS, tela e aba novos e deliberados.
    const noFriends = (h) => {
      const a = h.indexOf('/* ---------- Amigos (Perfil > Amigos)'), b = h.indexOf('/* ---------- Ranking (Leaderboard)', a);
      if (a > 0 && b > a) h = h.slice(0, a) + h.slice(b);
      h = h.replace(/  <!-- ===== AMIGOS \(Perfil > Amigos\) ===== -->\n  <div class="view" id="view-friends">\n    <div id="friends-content"><\/div>\n  <\/div>\n\n/, '');
      h = h.replace(/      <button[^>]*data-tab="friends">Amigos<\/button>\n/g, '');
      return h.replace(/<script src="..\/shared\/friends.js"><\/script>\n/, '');
    };
    const fcS = curClean.indexOf('/* ---------- Amigos (Perfil > Amigos)'), fcE = curClean.indexOf('/* ---------- Ranking (Leaderboard)', fcS);
    check(`${lang}: bloco CSS de Amigos encontrado`, fcS > 0 && fcE > fcS);
    curClean = curClean.slice(0, fcS) + curClean.slice(fcE);
    curClean = curClean.replace(/  <!-- ===== AMIGOS \(Perfil > Amigos\) ===== -->\n  <div class="view" id="view-friends">\n    <div id="friends-content"><\/div>\n  <\/div>\n\n/, '');
    curClean = curClean.replace(/      <button[^>]*data-tab="friends">Amigos<\/button>\n/g, '');
    curClean = curClean.replace(/<script src="..\/shared\/friends.js"><\/script>\n/, '');
    // O commit de referência (PREV) já tem seletor, campo Gênero e aviso de idioma:
    // tira os mesmos blocos dele antes de comparar.
    const cleanBlocks = (h) => {
      const [a, b] = selBlock(h);
      if (a > 0 && b > a) h = h.slice(0, a) + h.slice(b);
      const g = h.indexOf('        <label data-i18n="ui.profileEdit.gender"');
      if (g > 0){ const ge = h.indexOf('</p>\n', h.indexOf('data-i18n="ui.profileEdit.genderHint"')) + 5; h = h.slice(0, g) + h.slice(ge).replace(/^\n/, ''); }
      const m1 = h.indexOf('<div id="ui-language-confirm-modal"'), m2 = h.indexOf('<div id="flashcard-reset-confirm-modal"');
      if (m1 > 0 && m2 > m1) h = h.slice(0, m1) + h.slice(m2);
      return h;
    };
    // Painéis Admin/Professora + Minhas aulas (2026-10-12): views, CSS, itens de menu e scripts novos e deliberados.
    const panelBlocks = (h) => {
      const css = h.indexOf('\n/* ---------- Painéis (Admin, Professora, Minhas aulas)');
      if (css > 0) h = h.slice(0, css) + h.slice(h.indexOf('</style>', css));
      let a = h.indexOf('  <div class="view panel-view" id="view-admin-badges">'), b;
      if (a > 0) b = h.indexOf('<div id="my-class-logs-content"></div>\n  </div>', a) + '<div id="my-class-logs-content"></div>\n  </div>'.length;
      else { a = h.indexOf('  <div class="view" id="view-admin-badges">'); b = h.indexOf('<div id="admin-tags-content" style="display:none;"></div>\n  </div>', a) + '<div id="admin-tags-content" style="display:none;"></div>\n  </div>'.length; }
      if (a > 0 && b > a) h = h.slice(0, a) + '<!--PAINEIS-->' + h.slice(b);
      // Conjugação fase 2 (2026-10-13): tela de escolha nova (busca, filtros, cartões dos tempos), mudança deliberada.
      const cs = h.indexOf('    <div id="conj-select-wrap">'), ce = h.indexOf('    <div id="conj-practice-wrap"', cs);
      if (cs > 0 && ce > cs) h = h.slice(0, cs) + '<!--CONJSEL-->' + h.slice(ce);
      return h.replace(/      <button class="tab-btn teacher-only-nav"[\s\S]*?<\/button>\n/, '')
        .replace(/  <button class="user-dropdown-item (student-teacher-nav|teacher-only-nav mais-extra-tab)" id="(my-class-logs-btn|teacher-panel-btn)"[^\n]*\n/g, '')
        .replace(' class="user-dropdown-item student-teacher-nav" id="support-materials-btn" style="display:none;"', ' class="user-dropdown-item" id="support-materials-btn"')
        .replace(/<script src="..\/shared\/(permissions|teacher-panel|teacher-invites)\.js"><\/script>\n/g, '')
        .replace(/<script src="..\/shared\/activity-focus\.js"><\/script>\n/, '') /* modo foco na Conjugação/Revisão/Desafios (2026-10-14) */
        .replace(/<script src="(..\/shared\/)?conj-games\.js"><\/script>\n/g, '') /* Jogos da Conjugação (2026-10-14) */
        // perfil privado (2026-10-12): texto novo da chave "Perfil público", mudança deliberada
        .replace('Ligado: quem tem conta vê sua foto, seu progresso e seus Decks públicos. Desligado: só amigos e sua professora veem; os outros veem só nome, @ e badges, e só te acham pelo @ exato.', 'Deixa seu nome, badges, progresso e cartões próprios visíveis a quem tiver o link do seu perfil.');
    };
    // Mural e painel Aluno (087, 2026-10-13/14): CSS, views, abas e itens de menu novos, mudança deliberada.
    // Volta o HTML atual para a forma de antes (Minhas aulas e Material de apoio como telas próprias).
    const muralBlocks = (h) => {
      const c1 = h.indexOf('/* Mural da professora (087, shared/mural.js) */\n');
      if (c1 > 0) h = h.slice(0, c1) + h.slice(h.indexOf('/* K.10:', c1));
      h = h.replace(/      <button class="tab-btn student-only-nav"[\s\S]*?<\/button>\n/, '')
        .replace(/      <button class="deck-topbar-btn"[^\n]*data-teacher-section="mural"[^\n]*\n/, '')
        .replace('    <div id="admin-mural-content" style="display:none;"></div>\n', '')
        .replace(/<script src="..\/shared\/mural\.js"><\/script>\n/, '')
        .replace('/* Aluno > Revisão (cartões da professora): mesma faixa de contagens da Revisão */\n.class-review{ display:grid; gap:10px; }\n.class-review .profile-edit-hint{ margin:0; }\n', '')
        .replace(/\/\* Registro de aula \(094\)[^\n]*\n[\s\S]*?(?=\/\* Mural da professora)/, '');
      const s1 = h.indexOf('  <!-- ===== ALUNO (vínculo ativo com professora)');
      if (s1 > 0){
        // Aba Aluno > Revisão (2026-10-14) fecha o bloco depois do Material de apoio.
        const endNew = '<div id="my-class-review-content" style="display:none;"></div>\n  </div>\n';
        const end = h.indexOf(endNew, s1) > 0 ? endNew : '<div id="support-materials-content" style="display:none;"></div>\n  </div>\n';
        const s2 = h.indexOf(end, s1) + end.length;
        h = h.slice(0, s1) + '  <!-- ===== MINHAS AULAS (aluno com vínculo ativo; só leitura, get_my_class_logs) ===== -->\n  <div class="view panel-view" id="view-my-class-logs">\n    <div class="path-header">\n      <h2 data-i18n="myClassLogs.title">Minhas aulas</h2>\n      <p data-i18n="myClassLogs.sub">O que você trabalhou em cada aula com sua professora.</p>\n    </div>\n    <div id="my-class-logs-content"></div>\n  </div>\n' + h.slice(s2);
        const before = lang === 'zh' ? '  <!-- ===== HANZI (trilha de caracteres) ===== -->' : '  <!-- ===== DITADOS ===== -->';
        h = h.replace(before, '  <!-- ===== MATERIAL DE APOIO (Fase 8b, aberta pra qualquer conta -- só\n       leitura: quem envia é a professora, ver Painel de Admin) ===== -->\n  <div class="view" id="view-support-materials">\n    <div class="path-header">\n      <h2 data-i18n="menu.supportMaterials">📚 Material de apoio</h2>\n      <p data-i18n="ui.materials.sub">Resumos, links e arquivos que sua professora compartilhou com você.</p>\n    </div>\n    <div id="support-materials-content"></div>\n  </div>\n\n' + before);
        h = h.replace(/  <button class="user-dropdown-item student-teacher-nav mais-extra-tab" id="student-panel-btn"[^\n]*\n/, '  <button class="user-dropdown-item student-teacher-nav" id="my-class-logs-btn" style="display:none;" data-i18n="myClassLogs.menu">📝 Minhas aulas</button>\n  <button class="user-dropdown-item student-teacher-nav" id="support-materials-btn" style="display:none;" data-i18n="menu.supportMaterials">📚 Material de apoio</button>\n');
        h = h.replace(/\n\n\n(  <!-- ===== (MEUS CARTÕES|MATERIAL DE APOIO|HANZI))/g, '\n\n$1');
      }
      return h;
    };
    curClean = muralBlocks(curClean);
    curClean = panelBlocks(curClean);
    // Cara de jogo (docs/historico/15, 2026-10-12, pedido da autora): Nunito via Google Fonts, botões com volume,
    // títulos de seção sem caixa alta e tokens de medalha. Mudança só de CSS/<head>, sem texto: sai dos dois lados.
    const gameLook = (h) => h
      .replace(/<!-- Nunito de verdade[\s\S]*?display=swap">\n/, '')
      .replace(/@font-face\{\n  font-family:'Nunito';\n  src: local\('Nunito'\);\n\}\n\n?/, '')
      .replace(/<script src="..\/shared\/badge-tracks(-app)?\.js"><\/script>\n/g, '') // conquistas com níveis (2026-10-14)
      // troca geral de ícones (2026-10-14, docs/icones-fluent.md): ícone do menu (desenho antigo ou Fluent) e o script novo saem dos dois lados
      .replace(/<svg class="tab-icon[^"]*"[^>]*>[\s\S]*?<\/svg>|<img class="tab-icon[^"]*" src="..\/shared\/icons\/fluent\/[^"]+" alt="" aria-hidden="true">/g, '')
      .replace(/<script src="..\/shared\/emoji-icons\.js"><\/script>\n/g, '')
      .replace(/<script src="curriculum-changes\.js"><\/script>\n/g, '') // Etapa 0 do currículo (2026-10-18): só um <script> de dados novo
      .replace(/[ ]*\/\* (Título de seção: antes|Botões com volume|Profundidade dos botões|Mesmo peso dos outros títulos|Medalhas do pódio)[\s\S]*?\*\/\n/g, '')
      .replace(/^[ ]*--(btn-depth|btn-depth-sm|medal-gold|medal-silver|medal-bronze|on-medal|error-red):[^\n]*\n/gm, '')
      .replace(/^[ ]*(\.btn[^{\n]*|\.section-label|\.side-card-title|#side-missions-body \.dcs-caption|\.module-label \.ml-text)\{[^}]*\}\n/gm, '')
      // Design System do painel (PR 319, 2026-10-15): só CSS/<head>/scripts/estrutura, sem texto novo na tela do aluno: sai dos dois lados.
      .replace(/<link rel="preload" href="..\/shared\/fonts\/nunito-latin\.woff2"[^>]*>\n|<link rel="stylesheet" href="..\/shared\/fonts\/nunito\.css">\n|<!-- Design System do painel[^\n]*-->\n|<link rel="stylesheet" href="..\/shared\/painel\/[^"]+">\n/g, '')
      .replace(/\/\* Nunito de verdade[^\n]*\*\/\n(@font-face\{ font-family:'Nunito'; font-weight:\d+;[^\n]*\n)+/g, '')
      .replace(/<script src="..\/shared\/(painel\/painel-ui|admin-panel|admin-analytics-calc|admin-analytics-ui|admin-(badges|plans|notifications|reports)-ui|teacher-(students|cards|materials)-ui)\.js"><\/script>\n/g, '')
      .replace(/<div id="(admin-manage-badge-modal|admin-edit-badge-modal|admin-edit-template-modal|admin-report-detail-modal)" class="app-modal-overlay"[\s\S]*?\n<\/div>\n\n?/g, '') // modais antigos do Admin viraram janelas montadas pela tela
      .replace(/^[ ]*#app(\.sidebar-collapsed)?:is\(\[data-active-tab="teacher-panel"\][^\n]*\n/gm, '')
      .replace(/^[ ]*\/\* Painéis da professora e do Admin ocupam a largura toda[^\n]*\*\/\n/gm, '')
      // Menu lateral e topbar (commit ab22a6e, 2026-10-15): "Sair da conta" no fim da sidebar, card Status removido, topbar sem caixinhas,
      // botão de recolher só com ícone. Só estrutura/CSS (os textos novos já estão nas listas acima): sai dos dois lados.
      .replace(/  #user-menu-btn\{ display:flex; \}\n  \/\* XP some do topbar aqui[\s\S]*?\.stats-pills \.pill\.xp\{ display:none; \}\n/, '')
      .replace(/  \/\* Conta\/Sair: o pill com o nome saiu[\s\S]*?\.stats-pills \.lang-switcher-btn:hover\{[^}]*\}\n/, '')
      .replace(/(  \/\* Recolher menu[^\n]*\n)?  \.sidebar-toggle-btn\{[^}]*\}\n  \.sidebar-toggle-btn:hover\{[^}]*\}\n/, '')
      .replace(/^[ ]*(#app\.sidebar-collapsed \.sidebar-toggle-btn\{|\.sidebar-toggle-icon\{|#app\.sidebar-collapsed \.sidebar-toggle-icon\{|@media \(prefers-reduced-motion: reduce\)\{ \.sidebar-toggle-icon)[^\n]*\n/gm, '')
      .replace(/\n\n\n(  \/\* Modo foco de lição)/, '\n\n$1')
      .replace(/^[ ]*\.side-status-row(?: \+ \.side-status-row)?\{[^\n]*\n/gm, '')
      .replace(/^[ ]*#side-card-missions\{ padding-top:10px; \}\n/m, '')
      .replace(/^[ ]*\/\* Ranking e Missões do dia sem moldura[^\n]*\n[ ]*#side-card-missions, #side-card-ranking\{[^\n]*\n/m, '')
      .replace(/    <button class="sidebar-toggle-btn" id="sidebar-toggle-btn"[^>]*>[\s\S]*?<\/button>\n/, '')
      .replace(/      <button class="tab-btn sidebar-logout-btn"[\s\S]*?<\/button>\n/, '')
      // Menu "Mais" da sidebar (Configurações e Sair da conta saem da lista fixa): volta ao botão Configurações solto.
      .replace(/  \/\* Menu "Mais" \(Configurações e Sair da conta\)[\s\S]*?\.sidebar-mais:has\([^\n]*\n/, '')
      .replace(/      <div class="sidebar-mais" id="sidebar-mais">[\s\S]*?\n      <\/div>\n/, '      <button class="tab-btn" data-tab="settings">\n        \n        <span data-i18n="settings.title" class="sidebar-label">Configurações</span>\n      </button>\n')
      .replace('"Sair da conta" fica no menu\n     "Mais" da sidebar (#sidebar-logout-btn)', '"Sair da conta" fica no fim da\n     sidebar (#sidebar-logout-btn)')
      .replace(/    <div class="side-card" id="side-card-status">\n(      <div[^\n]*<\/div>\n)+    <\/div>\n/, '')
      .replace(' notifications-dropdown painel"', ' notifications-dropdown"')
      .replace('<button type="button" class="outline p-pequeno notifications-mark-all-btn"', '<button class="notifications-mark-all-btn"');
    curClean = gameLook(curClean);
    const p = gameLook(panelBlocks(cleanBlocks(p0)));
    // Com a branch do redesenho (PREV3) mesclada, a referência é o merge de 3 vias
    // (base comum, PREV2 e PREV3) dos HTMLs já limpos: só passa se o HTML atual for
    // exatamente a união das duas pontas.
    const mergeBase = execSync(`git merge-base ${MAIN3} ${PREV3}`, { cwd: ROOT, encoding: 'utf8' }).trim();
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'i18n-merge-'));
    const wr = (n, h) => { const fp = path.join(tmp, n); fs.writeFileSync(fp, strip(gameLook(panelBlocks(noFriends(cleanBlocks(h)))))); return fp; };
    const showAt = (c) => execSync(`git show ${c}:${lang}/index.html`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    let merged = null;
    try { merged = execSync(`git merge-file -p "${wr('ours', showAt(PREV3))}" "${wr('base', showAt(mergeBase))}" "${wr('theirs', showAt(MAIN3))}"`, { encoding: 'utf8', maxBuffer: 64 << 20 }); }
    catch (e) { merged = e.stdout || null; }
    // Conflito do merge: aceita cada trecho resolvido como "nosso", "deles" ou os dois juntos
    // (nunca texto novo inventado na resolução).
    const matchesResolution = (m, target) => {
      if (m === null) return false;
      const parts = m.split(/^<<<<<<< [^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n/m);
      const go = (i, pos) => {
        if (i >= parts.length) return pos === target.length;
        if (i % 3 === 0) return target.startsWith(parts[i], pos) && go(i + 1, pos + parts[i].length);
        const ours = parts[i], theirs = parts[i + 1];
        return [theirs, ours, ours + theirs, theirs + ours].some(opt => target.startsWith(opt, pos) && go(i + 2, pos + opt.length));
      };
      return go(0, 0);
    };
    const okMerged = matchesResolution(merged, strip(curClean));
    // Decisão de 2026-10-18 (autora): o teste de HTML inteiro travava QUALQUER mudança visual (cada PR de CSS/estrutura
    // exigia uma exceção aqui). Por padrão, a checagem agora é só de TEXTO: cada elemento com data-i18n mostra, no HTML,
    // exatamente o texto pt-BR do catálogo. Para voltar à comparação do HTML inteiro: I18N_HTML_EXATO=1 node tests/i18n/test_i18n_unit.js
    // (o visual travado por captura de tela é outro teste, ver docs/historico/15-design-system-painel-fase-1.md).
    if (process.env.I18N_HTML_EXATO){
      check(`${lang}: HTML inteiro sem data-i18n* e sem o seletor == commit anterior (${PREV2}) ou merge ${MAIN3}+${PREV3}`, strip(curClean) === strip(p) || okMerged);
    } else {
      const decode = (x) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, '\u00a0');
      const bad = [];
      for (const m of cur.matchAll(/<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)){
        const k = m[2]; if (!(k in pt) || typeof pt[k] !== 'string' || /<|&/.test(pt[k]) || /\($/.test(pt[k])) continue; // valor com HTML, ou prefixo montado em tempo de execução ("... (" + número + ")")
        const txt = decode(m[3].replace(/<(\w+)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
        if (txt !== pt[k].replace(/\s+/g, ' ').trim()) bad.push([k, txt.slice(0, 50), pt[k].slice(0, 50)]);
      }
      check(`${lang}: texto de cada elemento com data-i18n == pt-BR do catálogo (visual livre)`, bad.length === 0, bad.slice(0, 5));
    }
    check(`${lang}: seletor só oferece pt-BR e English`, /<option value="pt-BR" lang="pt-BR">Português \(Brasil\)<\/option>\s*<option value="en" lang="en">English<\/option>\s*<\/select>/.test(cur.slice(selStart, selEnd)));
    const usedHtml = [...cur.matchAll(/data-i18n-html="([^"]+)"/g)].map(m => m[1]);
    check(`${lang}: todo data-i18n-html existe em pt-BR`, usedHtml.every(k => k in pt));
    // o innerHTML original do elemento == valor pt-BR (byte a byte)
    for (const k of usedHtml){
      const m = cur.match(new RegExp('data-i18n-html="' + escRe(k) + '">([\\s\\S]*?)</p>'));
      check(`${lang}: innerHTML de ${k} == pt-BR`, m && m[1] === pt[k]);
    }
    const used = [...cur.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
    check(`${lang}: todo data-i18n existe em pt-BR`, used.every(k => k in pt), used.filter(k => !(k in pt)));
  }
  // reports.js: rótulos literais preservados (admin-reports.js lê c.label)
  const sb = { window: {}, document: { getElementById: () => null, addEventListener(){}, querySelectorAll: () => [] }, localStorageSafeGet: () => null, localStorageSafeSet(){}, fetch: () => Promise.reject(), addEventListener(){} };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', 'reports.js'), 'utf8') + '\n;window.__C = REPORT_CATEGORIES; window.__S = REPORT_SEVERITIES; window.__RT = reportT;', sb);
  check('categorias: ids e ordem iguais', sb.__C.map(c => c.id).join() === 'bug_tecnico,erro_conteudo,traducao,audio,visual,comportamento_inesperado,sugestao_melhoria,outro');
  check('categorias: label pt-BR == catálogo', sb.__C.every(c => pt[c.labelKey] === c.label));
  check('gravidades: label pt-BR == catálogo', sb.__S.every(s => pt[s.labelKey] === s.label));
  check('reportT sem núcleo i18n cai no texto original', sb.__RT('report.modal.submit', 'Enviar') === 'Enviar');

  console.log(`\n${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();
