// Melhoria 3 da revisão de arquitetura (docs/revisao-codigo-compartilhado-arquitetura.md, 2026-10-26): pontos de shared/ que
// supunham só fr/zh passaram a ler o registro de idiomas (languages/registry.*):
//   shared/study-trail-model.js     idioma dos Fields da trilha (estudado = fieldLang; tradução = idioma da base do curso)
//   shared/profile-placeholders.js  {nacionalidade} no idioma estudado (fr, zh, pt)
//   shared/flashcard-field-editor.js voz sugerida pelo idioma do Field (conhece 'pt')
// Prova, com os arquivos de PRODUÇÃO desta árvore x os do commit de REF (antes da melhoria, lidos por `git show`):
//   1. fr e zh geram EXATAMENTE os mesmos cartões da trilha (ids, ordem e cada campo, Fields inclusive);
//   2. os placeholders de fr e zh dão o mesmo texto para todo país x gênero x idioma do site x convidado;
//   3. a voz sugerida é a mesma para todo idioma de Field que já existia;
//   4. um site de mentira 'pt' (appKey portugues, com o conteúdo do fr) gera Fields 'pt' + 'en', nacionalidade em português
//      e voz pt-BR.
// Rodar: node tests/paridade-sites/test_idioma_registro.js   (REF padrão 5d9f480f; PARIDADE_M3_REF=<commit>)
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_M3_REF || '5d9f480f';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };
const agora = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const antes = (p) => execFileSync('git', ['show', `${REF}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const composed = (site) => require(path.join(ROOT, 'scripts/lib/course-content.js')).composedSource(site);

function motor(read){
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  ['languages/registry.js', 'shared/flashcard-model.js', 'shared/study-trail-model.js', 'shared/profile-placeholders.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  const core = read('shared/core/revisao-decks.js');
  vm.runInContext(/function flashcardIdForRow\(prefix, row\)\{[\s\S]*?\n\}/.exec(core)[0], ctx);
  const fe = read('shared/flashcard-field-editor.js');
  const opts = /const TTS_LANGUAGE_UI_OPTIONS = \[[\s\S]*?\n\];/.exec(fe)[0];
  const fn = /function suggestedTtsLanguageForFieldLang\(lang\)\{[\s\S]*?\n\}/.exec(fe)[0];
  vm.runInContext(opts + '\n' + fn + '\nthis.__tts = suggestedTtsLanguageForFieldLang; this.__pc = buildProfilePlaceholderContext; this.__countries = PROFILE_COUNTRIES;', ctx);
  return ctx;
}
function cartoes(ctx, site, appKey){
  vm.runInContext(composed(site).replace(/\bconst (UNITS|LEVELS|MODULES|LEVEL_TESTS|STORIES|HANZI_LESSONS|HANZI_ALL|DICTATIONS|CONJUGATION_GROUPS|VERB_TRANSLATIONS|CONJUGATION_VERBS)\b/g, 'var $1') + '\n;this.__U = UNITS;', ctx);
  return JSON.parse(JSON.stringify(vm.runInContext(`(function(){ const cards = [];
    __U.forEach(u => { if (u.type === 'grammar') return; (u.vocab || []).forEach((v, i) => buildStudyWordCards(u, v, i, ${JSON.stringify(appKey)}).forEach(c => cards.push(c))); });
    buildStudyPhraseCards(__U, ${JSON.stringify(appKey)}).forEach(c => cards.push(c));
    return cards; })()`, ctx)));
}

const A = motor(antes), B = motor(agora);

// 1. cartões da trilha
for (const [site, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
  const ca = cartoes(motor(antes), site, appKey), cb = cartoes(motor(agora), site, appKey);
  const diff = ca.findIndex((c, i) => JSON.stringify(c) !== JSON.stringify(cb[i]));
  check(`${site}: mesmos ${ca.length} cartões da trilha (ids, ordem, todos os campos e Fields)`, ca.length > 300 && ca.length === cb.length && diff === -1, diff >= 0 ? { antes: ca[diff], depois: cb[diff] } : ca.length);
  const langs = [...new Set(cb.flatMap(c => (c.fields || (c.note && c.note.fields) || []).map(f => f.lang)))];
  console.log(`  ${site}: ${cb.length} cartões; idiomas de Field: ${JSON.stringify(langs)}`);
}

// 2. placeholders
let combos = 0, iguais = 0;
for (const studyLang of ['fr', 'zh', undefined, 'xx']) for (const uiLang of ['pt-BR', 'en', 'es']) for (const guest of [false, true])
  for (const gender of [null, 'masculine', 'feminine', 'other', 'undisclosed']) for (const c of A.__countries.concat([{ code: 'ZZ' }, { code: null }])){
    const o = { profile: { display_name: 'Ana Souza', country: c.code }, studyLang, uiLang, guest, gender };
    combos++; if (JSON.stringify(A.__pc(o)) === JSON.stringify(B.__pc(o))) iguais++;
  }
check(`placeholders iguais em todas as combinações de fr/zh (${iguais}/${combos})`, combos > 1000 && iguais === combos, combos - iguais);

// 3. voz sugerida
const fieldLangs = ['fr', 'zh', 'zh-pinyin', 'pt-BR', 'en', '', null, undefined, 'es'];
const vozDiff = fieldLangs.filter(l => A.__tts(l) !== B.__tts(l));
check('voz sugerida igual para os idiomas de Field que já existiam', vozDiff.length === 0, vozDiff.map(l => [l, A.__tts(l), B.__tts(l)]));

// 4. site de mentira 'pt'
{
  const ctx = motor(agora);
  const cs = cartoes(ctx, 'fr', 'portugues');
  const fl = cs.map(c => (c.fields || (c.note && c.note.fields) || []).map(f => f.lang).join('+'));
  check(`pt de mentira: todo cartão da trilha com Fields pt + en (${cs.length})`, cs.length > 300 && fl.every(x => x === 'pt+en'), [...new Set(fl)]);
  const frCs = cartoes(motor(agora), 'fr', 'frances');
  check('pt de mentira: mesmos ids que o fr (o id não depende do idioma)', JSON.stringify(cs.map(c => c.id)) === JSON.stringify(frCs.map(c => c.id)));
  const br = ctx.__pc({ profile: { display_name: 'Ana', country: 'US' }, studyLang: 'pt', uiLang: 'en', gender: 'feminine' });
  check('pt de mentira: {nacionalidade} em português (americana), tradução em inglês (American)', br.nacionalidade === 'americana' && br.nacionalidade_t === 'American', br);
  const neutro = ctx.__pc({ profile: { display_name: 'Ana', country: 'IT' }, studyLang: 'pt', uiLang: 'en' });
  check('pt de mentira: forma neutra em português (italiano·a)', neutro.nacionalidade === 'italiano·a', neutro);
  const viaReg = vm.runInContext('LanguageRegistry.studyLangOf("portugues")', ctx);
  check('registro: portugues -> fieldLang pt; tradução da base en', viaReg === 'pt' && vm.runInContext('LanguageRegistry.baseTranslationLangOf("portugues")', ctx) === 'en' && vm.runInContext('LanguageRegistry.baseTranslationLangOf("frances")', ctx) === 'pt-BR');
  check('voz sugerida: Field pt -> pt-BR', ctx.__tts('pt') === 'pt-BR' && A.__tts('pt') === '', [A.__tts('pt'), ctx.__tts('pt')]);
}

console.log(`idioma pelo registro (melhoria 3): ${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
