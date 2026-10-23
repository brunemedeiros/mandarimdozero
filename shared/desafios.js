// ---------- Desafios: motor comum a qualquer idioma que tenha Desafios ----------
// Etapa 5c da paridade (docs/historico/29-paridade-desafios.md, pedido da dona de 2026-10-23): os Desafios, que moravam
// só no fr/app.js, em código comum. Três arquivos, carregados nesta ordem antes do app.js:
//   shared/desafios.js        (este) dados e catálogo (tabela challenges do Supabase), Free x Premium, textos (chT),
//                             revisão espaçada, correção de cada tipo (Ouça e traduza, Acentuação, Complete a frase),
//                             Expressão do dia;
//   shared/desafios-telas.js  telas do aluno: categorias, lista e álbum de Expressões, fila por nível, player e devolutiva
//                             de cada tipo, revisão dos erros, linha "Desafios do Módulo N" da trilha, janela Premium;
//   shared/desafios-admin.js  revisão do admin (checklist, aprovar/publicar, editar, prévia) e a importação de JSON.
// CSS: shared/desafios.css (depois do <style> do site). Não fica em shared/core/ porque tudo de lá é carregado por
// todos os sites, e o zh não tem Desafios (decisão da dona pendente, categoria B de docs/auditoria-paridade-fr-zh.md).
//
// O site liga os Desafios assim (molde: fr/desafios-config.js):
//   1. tem os desafios na tabela do Supabase (padrão 'challenges'; cada linha { id, type, level, status, data }, ver
//      challengeDataPayload) e os mp3 em audio/challenges/; a tradução do conteúdo para o idioma do site vem da camada
//      do curso em window.CHALLENGES_I18N (fr: fr/challenges.en.js);
//   2. carrega os 3 arquivos e depois chama registerChallenges({...}) com as regras do idioma;
//   3. tem a seção <div class="view" id="view-challenges"> no index.html (vazia serve: wireChallengesScreen() monta a
//      marcação com challengesScreenHTML() e as janelas com challengesModalsHTML()), carrega shared/desafios.css depois
//      do <style> e chama wireChallengesScreen() uma vez no app.js; a aba 'challenges' chama applyChallengeI18n(),
//      challengesModuleFilter = pendingChallengesModuleFilter; pendingChallengesModuleFilter = null e
//      renderChallengeCategories(); a trilha pode pôr appendModuleChallengesSlot(módulo, lista) no afterModule do
//      renderModuleTrailList (shared/core/modulos-niveis.js) e chamar fillModuleChallengeRows() depois;
//      o estado tem STATE.completedChallenges ({}) e STATE.challengeReviews ({}, sanitizeChallengeReviewEntry ao juntar).
//   Os Ditados (shared/ditados.js) entram como um cartão da tela de categorias quando o site os carrega.
//
// Configuração (registerChallenges). Obrigatórios: lang, familia. O resto tem padrão.
//   lang                   código do idioma estudado (fr: 'fr'): o sentido da Expressão em meaning[lang]
//   familia()              a instância da família do idioma (fr: latinaFr()): a correção da Acentuação
//                          (resultadoAcentuacao: acento exigido, "oe" por "œ" = quase)
//   texts                  { 'pt-BR': {...}, en: {...} } textos que citam o idioma estudado: ch.sub, ch.verify,
//                          ch.knowMore, ch.goFurther (consultados antes dos textos comuns de CHALLENGE_I18N)
//   table, publishedRpc    tabela e RPC do Supabase (padrão 'challenges' e 'get_published_challenges')
//   accentPickerHTML(), wireAccentPicker(conteúdo, campo)   teclado de letras do idioma na Acentuação (padrão: sem)
//
// Grátis x Premium (igual ao fr de antes): desafio com moduleId é Premium (Desafios do Módulo), sem moduleId é Free;
// hoje só com o selo, porque a trava está desligada (CHALLENGE_PAYWALL_ENABLED = false; permissão challenges_premium
// em Admin > Planos). XP: os desafios não dão XP (auditoria de XP); contam para as conquistas (challengesDone).

let CH_CONFIG = null;

function chCfg(){
  if (!CH_CONFIG) throw new Error('Desafios sem configuração: chame registerChallenges({...}) (ver shared/desafios.js)');
  return CH_CONFIG;
}
function chHasConfig(){ return !!CH_CONFIG; }

function registerChallenges(cfg){
  const noop = () => {};
  CH_CONFIG = Object.assign({
    lang: '',
    texts: {},
    table: 'challenges',
    publishedRpc: 'get_published_challenges',
    accentPickerHTML: () => '',
    wireAccentPicker: noop,
  }, cfg);
  return CH_CONFIG;
}

// A família do idioma (correção da Acentuação): ver familia() acima.
function chFamilia(){ return chCfg().familia(); }
// Textos do site que citam o idioma estudado (chT procura aqui primeiro).
function chSiteTexts(){ return (CH_CONFIG && CH_CONFIG.texts) || {}; }

// Os listeners que eram de nível superior no fr/app.js, na mesma ordem (voltar à trilha, troca de idioma, janela
// Premium, voltar da lista e do player); o site chama uma vez, no mesmo ponto do carregamento.
function wireChallengesScreen(){
  // site sem a seção no index.html: monta a marcação comum (shared/desafios-telas.js); o fr já tem, nada muda
  if (typeof mountChallengesScreen === 'function') mountChallengesScreen();
  document.getElementById('challenges-module-back').addEventListener('click', () => {
    challengesModuleFilter = null;
    switchTab('path');
  });
  window.addEventListener('i18n:change', () => { applyChallengeI18n(); });
  document.getElementById('premium-challenges-modal-close').addEventListener('click', () => {
    document.getElementById('premium-challenges-modal').style.display = 'none';
  });
  document.getElementById('premium-challenges-modal').addEventListener('click', (e) => {
    if (e.target.id === 'premium-challenges-modal') document.getElementById('premium-challenges-modal').style.display = 'none';
  });
  document.getElementById('challenges-list-back-btn').addEventListener('click', () => {
    challengeQueueContext = null;
    renderChallengeCategories();
  });
  document.getElementById('challenge-back-to-list').addEventListener('click', () => {
    if (challengePreviewMode){
      challengePreviewMode = false;
      document.getElementById('challenge-preview-banner').style.display = 'none';
      removePreviewWarningEl();
      renderChallengesAdmin();
    } else {
      challengeQueueContext = null;
      backToChallengesListOrCategories();
    }
  });
  // barra do admin e importação (shared/desafios-admin.js), logo depois, como no fr/app.js
  if (typeof wireChallengesAdminScreen === 'function') wireChallengesAdminScreen();
}

// Plural com contagem zero: em pt-BR o Intl.PluralRules trata 0 como 'one',
// mas o texto original sempre dizia "0 ditados" (plural). Preserva o texto
// em português byte a byte; em inglês 0 já é 'other'.
function tpZero(key, n, params){
  return tp(key, n === 0 ? 2 : n, Object.assign({ n: 0 === n ? 0 : n }, params || {}));
}

// ============================================================
// DESAFIOS: três categorias compartilhando a mesma infraestrutura
// (níveis, geração automática, TTS, fila de revisão, aprovação,
// publicação) — só a lógica específica de cada tipo muda:
//
//   expression        — expressão -> exemplo em contexto (TTS) -> hipótese
//                        -> alternativas -> feedback -> segundo exemplo
//                        (TTS) -> microatividade -> "pour aller plus loin"
//   listen_translate  — frase em francês (só áudio) -> tradução do aluno
//                        -> avaliação semântica (não exige match literal)
//                        -> feedback com frase original revelada
//   accent            — palavra/expressão curta (só áudio) -> grafia do
//                        aluno -> correção sensível a acentos
//
// Curadoria e geração dos desafios feita fora do site (scripts/
// challenges_pipeline/); aqui só a experiência do aluno e a tela de
// revisão do admin. Ver challenges.js pro shape de cada tipo.
// ============================================================
const CHALLENGES_ADMIN_EMAIL = 'brunemed1310@gmail.com';

// Os desafios são persistidos na tabela "challenges" do Supabase (não mais
// num array estático carregado de challenges.js) -- ver
// scripts/supabase_migrations/001_create_challenges_table.sql. A RLS da
// tabela já faz o trabalho de só devolver desafios publicados pra
// aluno/anônimo e devolver tudo pra admin (auth.jwt() email), então o
// front não precisa filtrar por permissão -- só usa o que voltou.
let CHALLENGES = [];

// Colunas "de verdade" da tabela (fora da coluna jsonb `data`). Tudo que
// não está nesta lista quando um objeto de desafio é montado no front
// (canonicalExpression, example, sentenceFr, targetText,
// externalResources, etc.) é o conteúdo específico do tipo e vai inteiro
// dentro de `data` ao persistir -- ver challengeDataPayload().
const CHALLENGE_DB_COLUMNS = [
  'id', 'type', 'level', 'status',
  'created_at', 'updated_at',
  'published_at', 'published_by',
  'rejected_at', 'rejected_by',
  'unpublished_at', 'unpublished_by',
];

function challengeDataPayload(c){
  const data = {};
  Object.keys(c).forEach(k => {
    if (!CHALLENGE_DB_COLUMNS.includes(k)) data[k] = c[k];
  });
  return data;
}

const CHALLENGE_VALID_TYPES = ['expression', 'listen_translate', 'accent', 'cloze_grammar'];
const CHALLENGE_VALID_STATUSES = ['needs_review', 'approved', 'published', 'rejected'];

// Busca os desafios do banco de dados e repõe CHALLENGES. Chamado sempre
// que a aba Desafios é aberta (e de novo dentro do painel admin), pra
// nunca depender de cache/estado de sessão -- uma publicação feita em
// outra aba/navegador aparece assim que o site é reaberto ou a lista é
// recarregada, sem precisar de nenhuma ação do Claude Code.
// Cache em memória (5 min): reabrir a aba Desafios não baixa tudo de novo.
// `force` (admin/edição) ou uma gravação (persistChallenge) ignoram o cache.
let challengesLoadedAt = 0;
const CHALLENGES_CACHE_MS = 5 * 60 * 1000;
async function loadChallengesFromDB(force){
  if (!force && challengesLoadedAt && Date.now() - challengesLoadedAt < CHALLENGES_CACHE_MS) return true;
  try {
    // Fase 8: com CHALLENGES_SERVER_GATING ligada, quem não é admin lê pela RPC
    // get_published_challenges (008), que devolve só o esqueleto dos Premium
    // para contas Free. Desligada (padrão), mantém o select direto de sempre.
    const useRpc = CHALLENGES_SERVER_GATING && !isChallengesAdmin();
    const { data, error } = useRpc
      ? await supabaseClient.rpc(chCfg().publishedRpc)
      : await supabaseClient.from(chCfg().table).select('*');
    if (error) throw error;
    CHALLENGES = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      level: row.level,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      published_at: row.published_at,
      published_by: row.published_by,
      rejected_at: row.rejected_at,
      rejected_by: row.rejected_by,
      unpublished_at: row.unpublished_at,
      unpublished_by: row.unpublished_by,
      ...(row.data || {}),
    }));
    challengesLoadedAt = Date.now();
    return true;
  } catch (err){
    console.error('Falha ao carregar desafios do Supabase:', err);
    return false;
  }
}

// Grava status + todo o conteúdo específico do tipo (colunas extras via
// `extraColumns`, ex: published_at/published_by) numa única chamada.
// `c` já deve estar atualizado localmente (otimista) antes de chamar --
// em caso de erro, quem chamou é responsável por reverter `c`.
async function persistChallenge(c, extraColumns = {}){
  const payload = { status: c.status, data: challengeDataPayload(c), ...extraColumns };
  const { error } = await supabaseClient.from(chCfg().table).update(payload).eq('id', c.id);
  challengesLoadedAt = 0; // gravou: o cache deixa de valer
  if (error){
    console.error('Falha ao salvar desafio no Supabase:', error);
    alert(t('adminChallenges.persist.failed') + error.message);
    return false;
  }
  return true;
}

const CHALLENGE_CATEGORIES = [
  { type: 'expression', emoji: '🧩', title: 'Expressões', subtitle: 'Descubra o sentido' },
  { type: 'listen_translate', emoji: '🎧', title: 'Ouça e traduza', subtitle: 'Escute e traduza' },
  { type: 'accent', emoji: '✍️', title: 'Acentuação', subtitle: 'Escreva corretamente' },
  { type: 'cloze_grammar', emoji: '🧠', title: 'Complete a frase', subtitle: 'Gramática na prática' },
];

let currentChallengesCategory = 'expression';
// Desafio aberto no momento (ver openChallengePlayer/renderChallengesList)
// -- só pra contexto automático de report (shared/reports.js), sem
// nenhuma outra leitura no resto do app.
let CURRENT_CHALLENGE_PLAYER = null;

function isChallengesAdmin(){
  return !!(CURRENT_USER && CURRENT_USER.email === CHALLENGES_ADMIN_EMAIL);
}

function escapeHtmlChallenge(str){
  return String(str).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function publishedChallenges(){
  return CHALLENGES.filter(c => c.status === 'published');
}
function pendingChallenges(){
  return CHALLENGES.filter(c => c.status === 'needs_review');
}

// ---------- i18n dos textos de INTERFACE dos Desafios/Ditados ----------
// chT() agora lê o idioma do site do mecanismo global (getUiLang, shared/i18n),
// cai em pt-BR e, por fim, na própria chave. 'en' = inglês (reaproveita as
// traduções do catálogo global onde o texto em português é idêntico). O CONTEÚDO no
// idioma estudado (frases, respostas, dados do banco) NÃO passa por aqui.
// Os textos que citam o idioma estudado (ch.sub, ch.verify, ch.knowMore, ch.goFurther) vêm da configuração do site
// (registerChallenges({ texts })), que chT() consulta primeiro: fr/desafios-config.js.
const CHALLENGE_I18N = {
  'pt-BR': {
    'tier.premium': 'Premium',
    'tier.free': 'Free',
    'dict.count.one': '{n} ditado',
    'dict.count.many': '{n} ditados',
    'ch.retryNow': '🔁 Tentar de novo',
    'ch.catProgress.one': '{done} de {total} concluído',
    'ch.catProgress.many': '{done} de {total} concluídos',
    'ch.review.title': 'Revisar erros ({n})',
    'ch.review.subtitle': 'Desafios que você errou, na hora de rever',
    'ch.review.doneTitle': 'Revisão do dia concluída!',
    'ch.review.doneSub': 'Os desafios que você acertou voltam mais tarde, cada vez mais espaçados.',
    'ch.review.back': 'Voltar aos desafios',
    'ch.retryLater': 'Tentar mais tarde',
    'ch.complete': '✅ Concluir',
    'ch.loading': 'Carregando desafios...',
    'ch.loadError': 'Não foi possível carregar os desafios agora. Verifique sua conexão e tente novamente.',
    'ch.retry': 'Tentar de novo',
    'ch.moduleTitle': 'Desafios do Módulo {n}',
    'ch.moduleSub': '{title} · agora que você estudou esse tema, pratique de novas formas.',
    'ch.title': 'Desafios',
    'ch.count.one': '{n} desafio',
    'ch.count.many': '{n} desafios',
    'ch.cat.expression.title': 'Expressões',
    'ch.cat.expression.subtitle': 'Descubra o sentido',
    'ch.cat.listen_translate.title': 'Ouça e traduza',
    'ch.cat.listen_translate.subtitle': 'Escute e traduza',
    'ch.cat.accent.title': 'Acentuação',
    'ch.cat.accent.subtitle': 'Escreva corretamente',
    'ch.cat.cloze_grammar.title': 'Complete a frase',
    'ch.cat.cloze_grammar.subtitle': 'Gramática na prática',
    'ch.label.cloze': '🧠 Complete a frase',
    'ch.cloze.instruction': 'Escolha a forma certa para cada lacuna:',
    'ch.cloze.blank': 'Lacuna {n}',
    'ch.cloze.chooseAll': 'Escolha uma opção para cada lacuna antes de verificar.',
    'ch.cloze.right': '✅ Resposta certa.',
    'ch.cloze.yourAnswer': 'Sua resposta',
    'ch.cloze.correct': 'Resposta certa',
    'ch.cloze.translation': 'Tradução',
    'ch.cat.dictation.title': 'Ditados',
    'ch.cat.dictation.subtitle': 'Ouça e escreva',
    'ch.label.listen': '🎧 Ouça e traduza',
    'ch.label.accent': '✍️ Acentuação',
    'ch.ofModule': ' · do módulo',
    'ch.emptyTitle': 'Nenhum desafio publicado ainda',
    'ch.emptySub': 'Em breve, novos desafios nesta categoria.',
    'ch.lockedNote.one': '🔒 +{n} desafio de módulo no Premium',
    'ch.lockedNote.many': '🔒 +{n} desafios de módulo no Premium',
    'ch.level': 'Nível {level}',
    'ch.btn.premiumLock': '🔒 Premium',
    'ch.progress.one': '{done}/{total} concluído',
    'ch.progress.many': '{done}/{total} concluídos',
    'ch.btn.review': '🎉 Revisar',
    'ch.btn.continue': 'Continuar',
    'ch.btn.start': 'Começar',
    'ch.queue.done': 'Exercício concluído!',
    'ch.queue.levelProgress': 'Nível {level} — {progress}',
    'ch.queue.continue': 'Continuar →',
    'ch.queue.levelDone': 'Nível {level} concluído!',
    'ch.queue.levelDoneSub': 'Você terminou todos os exercícios desse nível.',
    'ch.queue.back': 'Voltar aos níveis',
    'ch.listenPron': 'Ouvir pronúncia',
    'ch.expr.reveal': 'Ver as respostas',
    'ch.expr.yourAnswer': 'Sua resposta: {chosen}<br>Resposta certa: <strong>{correct}</strong>',
    'ch.expr.signifies': 'significa <strong>{fr}</strong>.',
    'ch.expr.inPt': 'Em português: <strong>{pt}</strong>.',
    'ch.expr.example1': 'Exemplo 1',
    'ch.expr.example2': 'Exemplo 2',
    'ch.listenFr': '▶ Ouvir',
    'ch.slow': 'Devagar',
    'ch.expr.yourTurn': 'Sua vez',
    'ch.expr.showAnswer': 'Ver a resposta',
    'ch.expr.right': '✅ Resposta certa.',
    'ch.notQuite': '❌ Ainda não.',
    'ch.lt.hint': 'Mostrar dica',
    'ch.lt.label': 'Digite sua tradução:',
    'ch.lt.placeholder': 'Sua tradução em português...',
    'ch.lt.alert.negation': 'Atenção à negação: a frase original e a sua não concordam em "não/nunca/nada".',
    'ch.lt.alert.number': 'Atenção aos números: confira a quantidade na frase original.',
    'ch.lt.alert.mustInclude': 'Faltou uma ideia importante: "{word}".',
    'ch.lt.alert.mustExclude': 'A palavra "{word}" não se encaixa nesta frase.',
    'ch.lt.missing': 'Palavras que faltaram',
    'ch.search.placeholder': 'Buscar expressão…',
    'ch.search.label': 'Buscar nas expressões',
    'ch.search.none': 'Nenhuma expressão encontrada.',
    'ch.filter.label': 'Filtrar expressões',
    'ch.filter.all': 'Todas',
    'ch.filter.pending': 'Pendentes',
    'ch.filter.done': 'Concluídas',
    'ch.ring.aria': '{done} de {total} concluídas',
    'ch.reg.formal': 'Formal',
    'ch.reg.neutral': 'Dia a dia',
    'ch.reg.familiar': 'Entre amigos',
    'ch.reg.slang': 'Gíria',
    'ch.reg.vulgar': 'Pode ofender',
    'ch.reg.formal.hint': 'Registro formal: bom com desconhecidos e em situações sérias.',
    'ch.reg.neutral.hint': 'Serve em quase qualquer situação.',
    'ch.reg.familiar.hint': 'Informal: use com amigos e pessoas próximas.',
    'ch.reg.slang.hint': 'Gíria: só com pessoas bem próximas.',
    'ch.reg.vulgar.hint': 'Vulgar: bom reconhecer, melhor não usar.',
    'ch.album.guess': 'O que será que significa?',
    'ch.album.seal': 'no álbum',
    'ch.album.locked': '🔒 Premium',
    'ch.album.listen': 'Ouvir a expressão',
    'ch.today.title': 'Expressão de hoje',
    'ch.today.hint': 'Ouça e tente adivinhar antes de abrir.',
    'ch.today.cta': 'Descobrir o sentido',
    'ch.today.allDone': '🎉 Você já descobriu todas as expressões disponíveis.',
    'ch.lt.legend.bad': 'palavra errada',
    'ch.lt.legend.near': 'quase certa',
    'ch.lt.legend.miss': 'faltou',
    'ch.lt.agreement': '⚠ Repare na concordância: depois de "{pronoun}", "{verb}" não é a conjugação certa.',
    'ch.lt.yours': 'Sua resposta',
    'ch.lt.expected': 'Resposta esperada',
    'ch.lt.original': 'Frase original',
    'ch.lt.explanation': 'Explicação',
    'ch.listenAgain': '▶ Ouvir de novo',
    'ch.lt.right': '✅ Tradução certa.',
    'ch.lt.partial': '🟡 Quase: a ideia está certa, mas confira os detalhes.',
    'ch.accent.label': 'Digite o que você ouviu:',
    'ch.accent.yours': 'Sua resposta: <strong>{answer}</strong>',
    'ch.accent.right': '✅ Certo.',
    'ch.accent.partial': '🟡 Quase: confira os acentos.',
    'ch.accent.wrong': '❌ Errado.',
    'ch.static.back': '← Voltar às categorias',
    'ch.static.backChallenges': '← Voltar aos desafios',
    'ch.static.backTrail': '← Voltar à trilha',
    'prem.modal.title': '🔒 Recurso Premium',
    'prem.modal.p1': 'Os <strong>Desafios do Módulo</strong> reforçam cada tema da trilha com Expressões, Ouça e traduza, Acentuação e Ditados extras.',
    'prem.modal.p2': 'Eles fazem parte do plano Premium. Para pedir o Premium, fale com a Prof. Brune pelo botão abaixo.'
  },
  'en': {
    'tier.premium': "Premium",
    'tier.free': "Free",
    'dict.count.one': "{n} dictation",
    'dict.count.many': "{n} dictations",
    'ch.retryNow': "🔁 Try again",
    'ch.catProgress.one': "{done} of {total} completed",
    'ch.catProgress.many': "{done} of {total} completed",
    'ch.review.title': "Review mistakes ({n})",
    'ch.review.subtitle': "Challenges you got wrong, time to review them",
    'ch.review.doneTitle': "Today's review is done!",
    'ch.review.doneSub': "The challenges you got right come back later, each time more spaced out.",
    'ch.review.back': "Back to challenges",
    'ch.retryLater': "Try later",
    'ch.complete': "✅ Complete",
    'ch.loading': "Loading challenges...",
    'ch.loadError': "Couldn't load the challenges right now. Check your connection and try again.",
    'ch.retry': "Try again",
    'ch.moduleTitle': "Module {n} Challenges",
    'ch.moduleSub': "{title} · now that you have studied this topic, practice in new ways.",
    'ch.title': "Challenges",
    'ch.count.one': "{n} challenge",
    'ch.count.many': "{n} challenges",
    'ch.cat.expression.title': "Expressions",
    'ch.cat.expression.subtitle': "Discover the meaning",
    'ch.cat.listen_translate.title': "Listen and translate",
    'ch.cat.listen_translate.subtitle': "Listen and translate",
    'ch.cat.accent.title': "Accents",
    'ch.cat.accent.subtitle': "Write it correctly",
    'ch.cat.cloze_grammar.title': "Complete the sentence",
    'ch.cat.cloze_grammar.subtitle': "Grammar in practice",
    'ch.label.cloze': "🧠 Complete the sentence",
    'ch.cloze.instruction': "Choose the right form for each blank:",
    'ch.cloze.blank': "Blank {n}",
    'ch.cloze.chooseAll': "Choose an option for each blank before checking.",
    'ch.cloze.right': "✅ Correct answer.",
    'ch.cloze.yourAnswer': "Your answer",
    'ch.cloze.correct': "Correct answer",
    'ch.cloze.translation': "Translation",
    'ch.cat.dictation.title': "Dictations",
    'ch.cat.dictation.subtitle': "Listen and write",
    'ch.label.listen': "🎧 Listen and translate",
    'ch.label.accent': "✍️ Accents",
    'ch.ofModule': " · from the module",
    'ch.emptyTitle': "No challenges published yet",
    'ch.emptySub': "New challenges in this category are coming soon.",
    'ch.lockedNote.one': "🔒 +{n} module challenge on Premium",
    'ch.lockedNote.many': "🔒 +{n} module challenges in Premium",
    'ch.level': "Level {level}",
    'ch.btn.premiumLock': "🔒 Premium feature",
    'ch.progress.one': "{done}/{total} completed",
    'ch.progress.many': "{done}/{total} completed",
    'ch.btn.review': "🎉 Review",
    'ch.btn.continue': "Continue",
    'ch.btn.start': "Start",
    'ch.queue.done': "Exercise complete!",
    'ch.queue.levelProgress': "Level {level} — {progress}",
    'ch.queue.continue': "Continue →",
    'ch.queue.levelDone': "Level {level} complete!",
    'ch.queue.levelDoneSub': "You have finished all the exercises in this level.",
    'ch.queue.back': "Back to levels",
    'ch.listenPron': "Listen to pronunciation",
    'ch.expr.reveal': "See the answers",
    'ch.expr.yourAnswer': "Your answer: {chosen}<br>Correct answer: <strong>{correct}</strong>",
    'ch.expr.signifies': "means <strong>{fr}</strong>.",
    'ch.expr.inPt': "In English: <strong>{pt}</strong>.",
    'ch.expr.example1': "Example 1",
    'ch.expr.example2': "Example 2",
    'ch.listenFr': "▶ Listen",
    'ch.slow': "Slowly",
    'ch.expr.yourTurn': "Your turn",
    'ch.expr.showAnswer': "See the answer",
    'ch.expr.right': "✅ Correct answer.",
    'ch.notQuite': "❌ Not quite.",
    'ch.lt.hint': "Show a hint",
    'ch.lt.label': "Type your translation:",
    'ch.lt.placeholder': "Your translation in English...",
    'ch.lt.alert.negation': "Watch the negation: the original sentence and yours don't agree on \"not/never/nothing\".",
    'ch.lt.alert.number': "Watch the numbers: check the quantity in the original sentence.",
    'ch.lt.alert.mustInclude': "An important idea is missing: \"{word}\".",
    'ch.lt.alert.mustExclude': "The word \"{word}\" doesn't fit this sentence.",
    'ch.lt.missing': "Words that were missing",
    // Etapa 3, lote B (2026-10-19): chaves que só existiam no pt-BR (o chT caía no português). needs_review.
    'ch.search.placeholder': "Search expressions…", // ALTA
    'ch.search.label': "Search the expressions", // ALTA
    'ch.search.none': "No expressions found.", // ALTA
    'ch.filter.label': "Filter expressions", // ALTA
    'ch.filter.all': "All", // ALTA
    'ch.filter.pending': "Pending", // ALTA -- "Pendentes" (escolha da dona, 2026-10-19)
    'ch.filter.done': "Completed", // ALTA
    'ch.ring.aria': "{done} of {total} completed", // ALTA
    'ch.lt.legend.bad': "wrong word", // ALTA
    'ch.lt.legend.near': "almost right", // ALTA
    'ch.lt.legend.miss': "missing", // ALTA
    'ch.lt.agreement': "⚠ Mind the agreement: after \"{pronoun}\", \"{verb}\" is not the right conjugation.",
    'ch.lt.yours': "Your answer",
    'ch.lt.expected': "Expected answer",
    'ch.lt.original': "Original sentence",
    'ch.lt.explanation': "Explanation",
    'ch.listenAgain': "▶ Listen again",
    'ch.reg.formal': "Formal",
    'ch.reg.neutral': "Everyday",
    'ch.reg.familiar': "Among friends",
    'ch.reg.slang': "Slang",
    'ch.reg.vulgar': "Can offend",
    'ch.reg.formal.hint': "Formal register: good with strangers and in serious situations.",
    'ch.reg.neutral.hint': "Works in almost any situation.",
    'ch.reg.familiar.hint': "Informal: use with friends and people close to you.",
    'ch.reg.slang.hint': "Slang: only with people very close to you.",
    'ch.reg.vulgar.hint': "Vulgar: good to recognize, better not to use.",
    'ch.album.guess': "What could it mean?",
    'ch.album.seal': "in your album",
    'ch.album.locked': "🔒 Premium",
    'ch.album.listen': "Listen to the expression",
    'ch.today.title': "Expression of the day",
    'ch.today.hint': "Listen and try to guess before opening it.",
    'ch.today.cta': "Find out the meaning",
    'ch.today.allDone': "🎉 You have discovered every available expression.",
    'ch.lt.right': "✅ Correct translation.",
    'ch.lt.partial': "🟡 Almost: right idea, but check the details.",
    'ch.accent.label': "Type what you heard:",
    'ch.accent.yours': "Your answer: <strong>{answer}</strong>",
    'ch.accent.right': "✅ Correct.",
    'ch.accent.partial': "🟡 Almost: check the accents.",
    'ch.accent.wrong': "❌ Incorrect.",
    'ch.static.back': "← Back to categories",
    'ch.static.backChallenges': "← Back to challenges",
    'ch.static.backTrail': "← Back to the Study Path",
    'prem.modal.title': "🔒 Premium feature",
    'prem.modal.p1': "<strong>Module Challenges</strong> reinforce each topic in the course with Expressions, Listen and Translate, Accents, and extra Dictations.",
    'prem.modal.p2': "They're part of the Premium plan. To ask for Premium, contact Prof. Brune using the button below."
  }
};
function chT(key, vars){
  // Idioma do site (mecanismo global, shared/i18n); cai em pt-BR e, por fim, na chave.
  // Os textos do Ditado (dict.*, menos dict.count.*) moram em DICTATION_I18N (shared/ditados.js): procura lá também.
  const lang = (typeof getUiLang === 'function' && getUiLang()) || 'pt-BR';
  const DI = typeof DICTATION_I18N !== 'undefined' ? DICTATION_I18N : {};
  const SI = chSiteTexts();
  let str = (SI[lang] && SI[lang][key]);
  if (str == null) str = (CHALLENGE_I18N[lang] && CHALLENGE_I18N[lang][key]);
  if (str == null) str = (DI[lang] && DI[lang][key]);
  if (str == null) str = SI['pt-BR'] && SI['pt-BR'][key];
  if (str == null) str = CHALLENGE_I18N['pt-BR'][key];
  if (str == null) str = DI['pt-BR'] && DI['pt-BR'][key];
  if (str == null) return key;
  if (vars) str = str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] != null ? vars[name] : m));
  return str;
}
// Preenche textos estáticos do index.html marcados com data-ch-i18n="chave".
function applyChallengeI18n(){
  document.querySelectorAll('[data-ch-i18n]').forEach(el => { el.innerHTML = chT(el.dataset.chI18n); });
}
// (O listener 'i18n:change' que estava aqui no fr/app.js está em wireChallengesScreen(), chamada no mesmo ponto.)

// ---------- Desafios do Módulo (Premium) ----------
// Um desafio "da trilha" é qualquer desafio com `moduleId` (campo extra dentro
// de `data`, sem coluna nova no banco -- ver challengeDataPayload). Esses
// aparecem (1) numa unidade opcional no fim de cada módulo da Trilha
// ("Desafios do Módulo N") e (2) na aba Desafios, onde a conta Free os vê
// TRANCADOS (cadeado + aviso de Premium) em vez de escondidos. Desafios sem
// moduleId continuam abertos a todos, como sempre foram. É uma trava de UI,
// não fronteira de segurança: a leitura dos desafios publicados continua
// pública no banco (mesmo nível de rigor de outros limites de UX do app).
let challengesModuleFilter = null;        // moduleId enquanto a pessoa navega pela unidade do módulo
let pendingChallengesModuleFilter = null; // repassado de openModuleChallenges() ao handler da aba

function challengeModuleId(c){ return (c && c.moduleId) || null; }
// Desafios do Módulo e Ditados extras: célula "Desafios Premium" (challenges_premium) da tabela Admin > Planos.
function challengesPremiumUnlocked(){
  return (typeof planCan === 'function' && planCan('challenges_premium')) || isChallengesAdmin();
}
// Paywall DESLIGADO por enquanto (decisão da autora): interface de bloqueio,
// paywall e Stripe entram depois. Hoje só ROTULAMOS cada item como Free ou
// Premium (tierBadgeHTML); quando o paywall existir, basta ligar esta flag.
const CHALLENGE_PAYWALL_ENABLED = false;
// Fase 8: leitura dos desafios pela RPC com trava no servidor. SÓ ligar depois de
// aplicar fr/scripts/supabase_migrations/008 (passo 1 e 2) no banco correspondente.
const CHALLENGES_SERVER_GATING = false;
// Free x Premium: desafios de módulo (Ouça e traduza, Acentuação, Expressões)
// são Premium; ditado é Free só quando d.free === true (1 por módulo).
function challengeTier(c){ return challengeModuleId(c) ? 'premium' : 'free'; }
function tierBadgeHTML(tier){
  return `<span class="tier-badge tier-${tier}">${chT(tier === 'premium' ? 'tier.premium' : 'tier.free')}</span>`;
}
function isChallengeLocked(c){
  return CHALLENGE_PAYWALL_ENABLED && !!challengeModuleId(c) && !challengesPremiumUnlocked();
}
// Tudo que a lista pode MOSTRAR (inclui os trancados) / só o que dá pra JOGAR.
function listedChallenges(){
  const all = publishedChallenges();
  return challengesModuleFilter ? all.filter(c => challengeModuleId(c) === challengesModuleFilter) : all;
}
function playableChallenges(){
  return listedChallenges().filter(c => !isChallengeLocked(c));
}
async function ensureChallengesPlanLoaded(){
  try { if (typeof ensureProfileLoaded === 'function' && CURRENT_USER) await ensureProfileLoaded(); } catch (e) { /* conta sem perfil carregado = Free */ }
}

// "Prontos, mas fora do ar" -- desafios que já foram aprovados/publicados
// alguma vez mas não estão visíveis pro aluno agora (despublicados). Só a
// admin enxerga essas linhas (a RLS de leitura pública só devolve
// status = 'published').
function unpublishedButApprovedChallenges(){
  return CHALLENGES.filter(c => c.status === 'approved');
}

function isChallengeCompleted(id){
  return !!STATE.completedChallenges[id];
}
// BEGIN challenge-review-logic (extraído por fr/scripts/test_answer_validation.js)
// Revisão espaçada dos desafios errados (Fase 6). Caixas Leitner: depois de
// um erro (fail ou partial) o desafio volta na caixa 1 (1 dia); cada acerto
// numa revisão DEVIDA sobe uma caixa (3, 7, 14 dias); acertar na caixa 4
// "forma" o desafio (sai da revisão). Errar a qualquer momento volta à 1.
// Acerto fora do prazo não muda nada (ainda não era revisão). Contagem por
// DIA do calendário local, não por 24h exatas.
const CHALLENGE_REVIEW_BOX_DAYS = [1, 3, 7, 14];
function challengeReviewDayNumber(ms){
  const d = new Date(ms);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
function sanitizeChallengeReviewEntry(raw, id){
  if (!raw || typeof raw !== 'object') return null;
  const box = Math.min(CHALLENGE_REVIEW_BOX_DAYS.length, Math.max(1, Math.floor(Number(raw.box)) || 1));
  const lastErrorAt = Number(raw.lastErrorAt);
  if (!isFinite(lastErrorAt) || lastErrorAt <= 0) return null;
  const lastSeenAt = isFinite(Number(raw.lastSeenAt)) && Number(raw.lastSeenAt) > 0 ? Number(raw.lastSeenAt) : lastErrorAt;
  return { id: String(raw.id || id), lastErrorAt, lastSeenAt, box };
}
function challengeReviewDueDay(entry){
  return challengeReviewDayNumber(entry.lastSeenAt || entry.lastErrorAt) + CHALLENGE_REVIEW_BOX_DAYS[entry.box - 1];
}
function isChallengeReviewDue(entry, nowMs){
  if (!entry) return false;
  return challengeReviewDayNumber(nowMs) >= challengeReviewDueDay(entry);
}
// Devolve a nova entrada (ou null = sair da revisão / nunca entrou).
function updateChallengeReviewEntry(entry, id, outcome, nowMs){
  if (outcome === 'fail' || outcome === 'partial'){
    return { id, lastErrorAt: nowMs, lastSeenAt: nowMs, box: 1 };
  }
  if (outcome !== 'ok' || !entry) return entry || null;
  if (!isChallengeReviewDue(entry, nowMs)) return entry;
  if (entry.box >= CHALLENGE_REVIEW_BOX_DAYS.length) return null;
  return { id: entry.id || id, lastErrorAt: entry.lastErrorAt, lastSeenAt: nowMs, box: entry.box + 1 };
}
// ids devidos hoje, os erros mais antigos primeiro.
function dueChallengeReviewIds(reviews, nowMs){
  return Object.values(reviews || {})
    .filter(e => e && isChallengeReviewDue(e, nowMs))
    .sort((a, b) => a.lastErrorAt - b.lastErrorAt)
    .map(e => e.id);
}
// END challenge-review-logic

// Fila "Revisar erros" ativa (true enquanto o aluno percorre os devidos de hoje).
let challengeReviewQueueActive = false;
function recordChallengeReviewOutcome(c, outcome){
  if (!c || challengePreviewMode) return;
  const next = updateChallengeReviewEntry(STATE.challengeReviews[c.id], c.id, outcome, Date.now());
  if (next) STATE.challengeReviews[c.id] = next; else delete STATE.challengeReviews[c.id];
  saveState();
}
// Só os que existem e dá pra jogar no recorte atual (módulo / paywall).
function dueChallengeReviews(){
  const playableIds = new Set(playableChallenges().map(c => c.id));
  return dueChallengeReviewIds(STATE.challengeReviews, Date.now()).filter(id => playableIds.has(id));
}

// Só Expressões tem conteúdo em mais de um nível hoje -- Ouça e
// traduza/Acentuação mostram tudo junto, como antes.
const CHALLENGE_LEVELS_ORDER = ['A1', 'A2', 'B1', 'B2'];

// Níveis recolhidos (estilo lingua.com: todos os níveis numa página só,
// cada um com um cabeçalho clicável pra esconder/mostrar) -- guarda só os
// que o aluno já fechou, tudo aberto por padrão.
const collapsedChallengeLevels = new Set();

// Registro das expressões (campo próprio `register`, 12/10/2026). Mesmos
// valores de REGISTER_KEY em fr/scripts/challenges_import/build_lote_expressoes.py.
// Toda expressão nova precisa ter registro (skill criar-desafios).
const EXPRESSION_REGISTERS = {
  formal:   { icon: '🎩' },
  neutral:  { icon: '🗣' },
  familiar: { icon: '😎' },
  slang:    { icon: '🤙' },
  vulgar:   { icon: '⚠️' },
};

// Sentido curto mostrado no cartão do álbum (só depois de concluir, para não
// entregar a resposta). O aviso de registro no fim do texto sai: agora ele é
// a etiqueta. Site em outro idioma: o sentido no idioma estudado (meaning[lang] da configuração; fr: meaning.fr).
function expressionCardMeaning(c){
  const lang = (typeof getUiLang === 'function' && getUiLang()) || 'pt-BR';
  const m = c.meaning || {};
  const target = m[chCfg().lang];
  const raw = lang === 'pt-BR' ? (m.pt || target) : (target || m.pt);
  return String(raw || '').replace(/\s*(⚠️\s*)?Registro:[\s\S]*$/, '').trim();
}

// "Expressão de hoje": uma pendente (não trancada) sorteada pelo dia, do
// nível mais baixo que ainda tem pendentes; "Pode ofender" só se não sobrar
// outra. Concluir a do dia faz aparecer a próxima.
function expressionOfTheDay(list){
  let pending = list.filter(c => !isChallengeCompleted(c.id) && !isChallengeLocked(c));
  if (!pending.length) return null;
  const level = CHALLENGE_LEVELS_ORDER.find(lvl => pending.some(c => c.level === lvl));
  if (level) pending = pending.filter(c => c.level === level);
  const polite = pending.filter(c => c.register !== 'vulgar');
  if (polite.length) pending = polite;
  pending.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const day = typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10);
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pending[h % pending.length];
}

// ---------- Ouça e traduza ----------
// Correção não exige match literal com a tradução de referência: compara
// por sobreposição de palavras de conteúdo (ignorando artigos/preposições
// comuns em português) contra qualquer uma das traduções aceitas geradas
// na curadoria. É uma aproximação, não uma avaliação semântica de verdade
// (não há chamada de IA em tempo de execução do aluno) — por isso o
// feedback sempre mostra a resposta do aluno ao lado da esperada, pra ele
// mesmo julgar nuances que o comparador não capta.
// BEGIN challenge-translation-logic (extraído por fr/scripts/test_answer_validation.js)
function normalizeForTranslationCompare(s){
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Comparador pt-BR usado pela análise de alertas (negação/número/mustInclude, Fase 3).
const TRANSLATION_STOPWORDS_PT = new Set([
  'o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas',
  'que','e','é','ele','ela','eles','elas','eu','tu','voce','você','nos','nós','voces','vocês',
  'para','por','com','se','ao','aos','a','as','à','às','sao','são','esta','está','isso','isto'
]);

function translationTokenSet(s){
  return normalizeForTranslationCompare(s).split(' ').filter(w => w && !TRANSLATION_STOPWORDS_PT.has(w));
}

function translationSimilarity(a, b){
  const ta = translationTokenSet(a);
  const tb = translationTokenSet(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  const overlap = ta.filter(w => setB.has(w)).length;
  return overlap / Math.max(ta.length, tb.length);
}

function isTranslationAcceptable(studentAnswer, referenceTranslations){
  if (!studentAnswer || !studentAnswer.trim()) return false;
  return (referenceTranslations || []).some(ref => translationSimilarity(studentAnswer, ref) >= 0.55);
}

// Fase 9: o comparador mora em shared/translation-compare.js (um por idioma da
// TRADUÇÃO, que é o idioma do site). Em português o comportamento é idêntico
// ao antigo (teste diferencial em tests/i18n/test_translation_compare.js).
// Se o site está em inglês mas o desafio ainda não tem referências em inglês,
// o aluno traduz para o português como antes (com o aviso do desafio).
function challengeOverlay(c){
  const lang = typeof getUiLang === 'function' ? getUiLang() : 'pt-BR';
  return (lang !== 'pt-BR' && window.CHALLENGES_I18N && window.CHALLENGES_I18N[lang] && window.CHALLENGES_I18N[lang][c.id]) || null;
}
// Texto do desafio no idioma do site (overlay) ou o original.
function challengeText(c, field){
  const ov = challengeOverlay(c);
  return (ov && ov[field]) ? ov[field] : c[field];
}
function listenTranslateSetup(c){
  const ov = challengeOverlay(c);
  const hasEn = !!(ov && Array.isArray(ov.referenceTranslations) && ov.referenceTranslations.length);
  const lang = hasEn ? getUiLang() : 'pt-BR';
  return {
    lang,
    translated: hasEn || lang === getUiLang(),
    cmp: TranslationCompare.forLang(lang),
    refs: hasEn ? ov.referenceTranslations : (c.referenceTranslations || []),
    explanation: (hasEn && ov.explanation) ? ov.explanation : c.explanation
  };
}

// A sobreposição de palavras acima não pega troca de sujeito ("eu comprou"
// em vez de "eu comprei") -- "comprou" e "comprei" contam como palavras
// completamente diferentes pro comparador, então em geral esse erro já
// reduz a sobreposição sozinho, mas quando o resto da frase é longo o
// score ainda passa do limiar. Esta checagem olha só o par PRONOME +
// VERBO SEGUINTE dentro da própria resposta do aluno (não compara com a
// referência) -- não é um parser gramatical completo (não cobre sujeito
// oculto, verbos compostos, oração relativa etc.), só pega o par mais
// comum de erro: um pronome-sujeito explícito seguido de um verbo
// conjugado numa pessoa incompatível.
const PT_SUBJECT_PRONOUN_PERSON = {
  'eu': '1s', 'tu': '2s', 'voce': '3s', 'ele': '3s', 'ela': '3s',
  'nos': '1p', 'a gente': '3s', 'voces': '3p', 'eles': '3p', 'elas': '3p'
};

// Formas dos verbos irregulares mais comuns -- chaves já sem acento
// (mesma normalização usada pra comparar a resposta, ver
// normalizeForTranslationCompare) nos tempos presente/pretérito perfeito/
// imperfeito. Onde a forma sem acento colide entre pessoas diferentes
// (ex: "tem"/"têm", "vimos" de ver/vir), listamos as duas -- e onde colide
// com outra palavra comum não-verbal (ex: "da" de "dá" vs. a contração
// "da"), preferimos omitir a forma a arriscar falso positivo.
const PT_IRREGULAR_VERB_FORMS = {
  sou:'1s', es:'2s', e:'3s', somos:'1p', sao:'3p',
  era:['1s','3s'], eras:'2s', eramos:'1p', eram:'3p',
  fui:'1s', foi:'3s', fomos:'1p', foram:'3p',
  estou:'1s', estas:'2s', esta:'3s', estamos:'1p', estao:'3p',
  estava:['1s','3s'], estavas:'2s', estavamos:'1p', estavam:'3p',
  estive:'1s', esteve:'3s', estivemos:'1p', estiveram:'3p',
  tenho:'1s', tens:'2s', tem:['3s','3p'], temos:'1p',
  tinha:['1s','3s'], tinhas:'2s', tinhamos:'1p', tinham:'3p',
  tive:'1s', teve:'3s', tivemos:'1p', tiveram:'3p',
  vou:'1s', vais:'2s', vai:'3s', vamos:'1p', vao:'3p',
  faco:'1s', fazes:'2s', faz:'3s', fazemos:'1p', fazem:'3p',
  fiz:'1s', fez:'3s', fizemos:'1p', fizeram:'3p',
  posso:'1s', podes:'2s', pode:'3s', podemos:'1p', podem:'3p',
  pude:'1s', pudemos:'1p', puderam:'3p',
  quero:'1s', queres:'2s', quer:'3s', queremos:'1p', querem:'3p',
  quis:['1s','3s'], quisemos:'1p', quiseram:'3p',
  digo:'1s', dizes:'2s', diz:'3s', dizemos:'1p', dizem:'3p',
  disse:['1s','3s'], dissemos:'1p', disseram:'3p',
  vejo:'1s', ves:'2s', ve:'3s', vemos:'1p', veem:'3p',
  vi:'1s', viu:'3s', vimos:'1p', viram:'3p',
  dou:'1s', damos:'1p',
  dei:'1s', deu:'3s', demos:'1p', deram:'3p',
  venho:'1s', vens:'2s', vem:'3s', vim:'1s', veio:'3s', viemos:'1p', vieram:'3p',
  sei:'1s', sabes:'2s', sabe:'3s', sabemos:'1p', sabem:'3p',
  soube:['1s','3s'], soubemos:'1p', souberam:'3p',
  ponho:'1s', poes:'2s', poe:'3s', pomos:'1p', poem:'3p',
  pus:'1s', pos:'3s', pusemos:'1p', puseram:'3p',
};

function ptVerbPersonTags(word){
  if (PT_IRREGULAR_VERB_FORMS[word]){
    const v = PT_IRREGULAR_VERB_FORMS[word];
    return Array.isArray(v) ? v : [v];
  }
  // Só terminações que são um sinal razoavelmente seguro de VERBO conjugado
  // -- de propósito SEM as terminações genéricas -o (1ª pess. sing. do
  // presente) e -a/-e (3ª pess. sing. do presente), que colidem com a
  // imensa maioria dos substantivos/adjetivos/advérbios do português
  // (livro, filme, já, noite...) e geravam falsos positivos constantes:
  // qualquer palavra comum terminada em -a/-e/-o virava "erro de
  // concordância" mesmo quando a resposta do aluno estava certa. Mesmo
  // princípio já usado no dicionário de irregulares acima (comentário
  // "preferimos omitir a forma a arriscar falso positivo").
  const rules = [
    [/amos$|emos$|imos$/, '1p'],
    [/astes$|estes$|istes$/, '2p'],
    [/aram$|eram$|iram$/, '3p'],
    [/am$|em$/, '3p'],
    [/ou$|eu$|iu$/, '3s'],
    [/aste$|este$|iste$/, '2s'],
    [/ei$/, '1s'],
    // (sem a terminação genérica -as/-es da 2ª pess.: colide com plurais
    //  como "legumes" e com o artigo "as"; "tu" quase não é usado e os
    //  irregulares comuns já estão no dicionário acima)
  ];
  for (const [re, tag] of rules){
    if (re.test(word)) return [tag];
  }
  return [];
}

// Procura pronome-sujeito seguido (até 2 palavras de distância, pra
// tolerar advérbios como "já"/"não" no meio) de um verbo conjugado numa
// pessoa incompatível. Para de procurar ao encontrar outro pronome antes
// de achar um verbo reconhecível (não atribui o erro à oração seguinte).
function translationHasPersonMismatch(text){
  const words = normalizeForTranslationCompare(text).split(' ').filter(Boolean);
  for (let i = 0; i < words.length; i++){
    let pronoun = words[i];
    let j = i + 1;
    if (pronoun === 'a' && words[i + 1] === 'gente'){ pronoun = 'a gente'; j = i + 2; }
    const expected = PT_SUBJECT_PRONOUN_PERSON[pronoun];
    if (!expected) continue;
    for (let lookahead = 0; lookahead < 3 && j + lookahead < words.length; lookahead++){
      const candidate = words[j + lookahead];
      if (PT_SUBJECT_PRONOUN_PERSON[candidate]) break;
      if (candidate === 'e' || (TRANSLATION_STOPWORDS_PT.has(candidate) && !PT_IRREGULAR_VERB_FORMS[candidate])) continue; // "e" normalizado colide com a conjunção
      const tags = ptVerbPersonTags(candidate);
      if (tags.length){
        if (!tags.includes(expected)) return { pronoun, verb: candidate, expected, got: tags };
        break;
      }
    }
  }
  return null;
}

// ---- Análise da tradução (Fase 3, 05/10/2026) ----
// Além da sobreposição de palavras, a análise acusa 3 tipos de alerta contra
// a referência de MELHOR similaridade: negação trocada ("não" presente só
// de um lado), número diferente ("dois" x "três", dígitos incluídos) e, se o
// desafio trouxer, `mustInclude` (lista de grupos de alternativas: pelo
// menos uma de cada grupo precisa aparecer) e `mustExclude` (palavras que
// não podem aparecer). Também devolve as palavras da referência que
// faltaram na resposta (diferença palavra a palavra).
const PT_NEGATION_WORDS = new Set(['nao','nunca','jamais','nem','nada','ninguem','nenhum','nenhuma','sem']);
const PT_NUMBER_WORDS = {
  zero:0, dois:2, duas:2, tres:3, quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9, dez:10,
  onze:11, doze:12, treze:13, catorze:14, quatorze:14, quinze:15, dezesseis:16, dezessete:17,
  dezoito:18, dezenove:19, vinte:20, trinta:30, quarenta:40, cinquenta:50, sessenta:60,
  setenta:70, oitenta:80, noventa:90, cem:100, cento:100
};

function translationNumbers(text){
  const nums = new Set();
  normalizeForTranslationCompare(text).split(' ').forEach(w => {
    if (/^\d+$/.test(w)){ if (w !== '1') nums.add(Number(w)); }
    else if (Object.prototype.hasOwnProperty.call(PT_NUMBER_WORDS, w)) nums.add(PT_NUMBER_WORDS[w]);
  });
  return nums;
}
function translationHasNegation(text){
  return normalizeForTranslationCompare(text).split(' ').some(w => PT_NEGATION_WORDS.has(w));
}

function analyzeTranslation(studentAnswer, referenceTranslations, extra){
  const refs = referenceTranslations || [];
  let best = 0, bestRef = refs[0] || '';
  refs.forEach(ref => {
    const sim = translationSimilarity(studentAnswer, ref);
    if (sim > best){ best = sim; bestRef = ref; }
  });
  const alerts = [];
  if (best > 0){
    if (translationHasNegation(studentAnswer) !== translationHasNegation(bestRef)) alerts.push({ type: 'negation' });
    const sn = translationNumbers(studentAnswer), rn = translationNumbers(bestRef);
    if (sn.size !== rn.size || [...sn].some(n => !rn.has(n))) alerts.push({ type: 'number' });
  }
  const studentTokens = new Set(normalizeForTranslationCompare(studentAnswer).split(' '));
  const norm = w => normalizeForTranslationCompare(w);
  if (extra && Array.isArray(extra.mustInclude)){
    extra.mustInclude.forEach(group => {
      const alts = (Array.isArray(group) ? group : [group]).map(norm).filter(Boolean);
      if (alts.length && !alts.some(w => studentTokens.has(w) || normalizeForTranslationCompare(studentAnswer).includes(w))){
        alerts.push({ type: 'mustInclude', word: alts[0] });
      }
    });
  }
  if (extra && Array.isArray(extra.mustExclude)){
    extra.mustExclude.map(norm).filter(Boolean).forEach(w => {
      if (studentTokens.has(w)) alerts.push({ type: 'mustExclude', word: w });
    });
  }
  const missingWords = translationTokenSet(bestRef).filter(w => !studentTokens.has(w));
  return { similarity: best, bestRef, alerts, missingWords };
}

// Resultado em 3 níveis (regra de conclusão dos Desafios, 04/10/2026):
// 'ok' = acerto (similaridade >= 0,8 e sem alerta); 'partial' = erro leve
// (0,55 a 0,8, ou qualquer alerta -- concordância, negação, número,
// mustInclude/mustExclude) -- conclui com explicação; 'fail' = erro total
// (< 0,55 ou vazio) -- não conclui.
function listenTranslateOutcome(studentAnswer, referenceTranslations, personMismatch, extra){
  if (!studentAnswer || !studentAnswer.trim()) return 'fail';
  const an = analyzeTranslation(studentAnswer, referenceTranslations, extra);
  if (an.similarity < 0.55) return 'fail';
  if (personMismatch || an.alerts.length || an.similarity < 0.8) return 'partial';
  return 'ok';
}

// ---- Marcação palavra a palavra (07/10/2026) ----
// Cada palavra da resposta do aluno vira 'ok' (está na referência), 'near'
// (quase: mesma raiz/pequena diferença de grafia ou flexão, ex. comprou x
// comprei) ou 'bad' (não está na referência). Palavras de ligação (artigos,
// preposições) que sobram são neutras (null). Na referência, 'ok' = o aluno
// escreveu, 'near' = foi a quase-acertada, 'miss' = faltou.
function translationEditDistance(a, b){
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++){
    const cur = [i];
    for (let j = 1; j <= n; j++){
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function translationWordsAreNear(a, b){
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4) return false;
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  if (p >= 4 && p >= Math.min(a.length, b.length) - 3) return true;
  return translationEditDistance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 4));
}
function markTranslationWords(studentAnswer, referenceText){
  const toks = s => String(s || '').split(/\s+/).filter(Boolean)
    .map(text => ({ text, norm: normalizeForTranslationCompare(text) }));
  const stu = toks(studentAnswer), ref = toks(referenceText);
  stu.forEach(t => { t.cls = null; });
  ref.forEach(t => { t.cls = null; });
  const free = t => t.norm && !t.cls;
  // 1) iguais
  stu.forEach(s => {
    if (!s.norm) return;
    const r = ref.find(r => free(r) && r.norm === s.norm);
    if (r){ s.cls = 'ok'; r.cls = 'ok'; }
  });
  // 2) quase
  stu.forEach(s => {
    if (!s.norm || s.cls) return;
    const r = ref.find(r => free(r) && !TRANSLATION_STOPWORDS_PT.has(r.norm) && translationWordsAreNear(s.norm, r.norm));
    if (r){ s.cls = 'near'; r.cls = 'near'; }
  });
  // 3) o resto
  stu.forEach(s => {
    if (!s.norm || s.cls) return;
    s.cls = TRANSLATION_STOPWORDS_PT.has(s.norm) ? null : 'bad';
  });
  ref.forEach(r => {
    if (!r.norm || r.cls) return;
    r.cls = TRANSLATION_STOPWORDS_PT.has(r.norm) ? null : 'miss';
  });
  return { student: stu.map(({ text, cls }) => ({ text, cls })), reference: ref.map(({ text, cls }) => ({ text, cls })) };
}
// END challenge-translation-logic

// ---------- Acentuação ----------
// BEGIN accent-challenge-logic (extraído literalmente por fr/scripts/test_answer_validation.js -- não mover/renomear estes marcadores sem atualizar o teste)
// Correção sensível a acentos/cedilha/trema -- nunca remove diacríticos
// antes de comparar (só normaliza espaço/maiúsculas, que não são o alvo
// da atividade). Família latina, fase 2: as regras moram em
// shared/core/familias/latina.js (configuração do fr em LANG_HOOKS.familiaLatina); a instância do idioma vem de
// chFamilia() (registerChallenges({ familia }); fr: latinaFr()).
function normalizeForAccentCompare(s){
  return FamiliaLatina.normalizarParaAcentuacao(s);
}

function isAccentAnswerCorrect(studentAnswer, targetText){
  return FamiliaLatina.acentuacaoCerta(studentAnswer, targetText);
}

function stripDiacriticsForAccentCompare(s){
  return FamiliaLatina.semAcentoParaAcentuacao(s);
}

// 'ok' = igual; 'partial' = só o acento/cedilha/trema difere, ou "oe" no lugar
// de "œ" (decisão da dona, 2026-10-15) -- erro leve, conclui; 'fail' = palavra
// diferente ou vazio (erro total, não conclui).
function accentAnswerOutcome(studentAnswer, targetText){
  return chFamilia().resultadoAcentuacao(studentAnswer, targetText);
}
// END accent-challenge-logic

// ---------- Complete a frase (gramática) -- type 'cloze_grammar' ----------
// Uma frase em francês com 1+ lacunas "___"; cada lacuna tem 2 a 4 opções
// (múltipla escolha). Primeiro tema: passé composé (auxiliar être/avoir e
// particípio). Dado no banco (dentro de `data`):
//   sentenceFr: "Hier, nous ___ mangé au restaurant."
//   blanks: [{ options: ["avons", "sommes"], answer: "avons" }]
//   translationPt, explanation (pt-BR, obrigatória), topic (ex. "passe-compose")
// Conclusão: todas as lacunas certas = ok; qualquer erro = fail (binário,
// como Expressões). Sem áudio.
// BEGIN cloze-grammar-logic (extraído por fr/scripts/test_answer_validation.js)
const CLOZE_GRAMMAR_BLANK = '___';
function clozeGrammarParts(sentence){
  return String(sentence || '').split(CLOZE_GRAMMAR_BLANK);
}
// Lista de problemas do item (vazia = válido). Usada pelo checklist do admin.
function validateClozeGrammarItem(c){
  const problems = [];
  if (!c || !c.sentenceFr) { problems.push('frase vazia'); return problems; }
  const nBlanks = clozeGrammarParts(c.sentenceFr).length - 1;
  const blanks = Array.isArray(c.blanks) ? c.blanks : [];
  if (nBlanks < 1) problems.push('a frase não tem lacuna ___');
  if (nBlanks !== blanks.length) problems.push(`a frase tem ${nBlanks} lacuna(s) e ${blanks.length} grupo(s) de opções`);
  blanks.forEach((b, i) => {
    const opts = (b && Array.isArray(b.options)) ? b.options : [];
    if (opts.length < 2 || opts.length > 4) problems.push(`lacuna ${i + 1}: precisa de 2 a 4 opções`);
    if (new Set(opts.map(o => String(o).trim().toLowerCase())).size !== opts.length) problems.push(`lacuna ${i + 1}: opções repetidas`);
    if (!b || !opts.includes(b.answer)) problems.push(`lacuna ${i + 1}: a resposta certa não está entre as opções`);
  });
  if (!c.explanation || !String(c.explanation).trim()) problems.push('explicação vazia');
  return problems;
}
// chosen: array com a opção escolhida em cada lacuna (null = não respondida).
function clozeGrammarOutcome(c, chosen){
  const blanks = (c && c.blanks) || [];
  const perBlank = blanks.map((b, i) => !!chosen && chosen[i] != null && chosen[i] === b.answer);
  const complete = !!chosen && blanks.every((b, i) => chosen[i] != null);
  const outcome = complete && perBlank.length > 0 && perBlank.every(Boolean) ? 'ok' : 'fail';
  return { outcome, perBlank, complete };
}
// Frase com as lacunas preenchidas (pelas escolhas ou, sem escolhas, pelas respostas certas).
function clozeGrammarFilled(c, chosen){
  const parts = clozeGrammarParts(c.sentenceFr);
  const blanks = c.blanks || [];
  return parts.map((p, i) => i < parts.length - 1
    ? p + ((chosen && chosen[i] != null) ? chosen[i] : (blanks[i] ? blanks[i].answer : CLOZE_GRAMMAR_BLANK))
    : p).join('');
}
// END cloze-grammar-logic
