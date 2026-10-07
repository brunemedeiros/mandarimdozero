// Harness dos testes da Fase E (Study Trail <-> Course Decks).
// Carrega os arquivos REAIS do repositório num sandbox `vm` (nunca cópias):
// shared/deck-engine.js, shared/flashcard-model.js, shared/srs.js,
// <lang>/content.js e -- por extração textual de funções top-level --
// funções reais de <lang>/app.js (app.js inteiro depende de DOM, então só
// as funções puras/de estado necessárias são extraídas).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Extrai `function name(...){...}` / `async function name(...){...}` de
// nível superior, por casamento de chaves (ignora chaves em strings/
// comentários de forma simples, suficiente para este código).
function extractFunction(src, name){
  const re = new RegExp('^(async\\s+)?function\\s+' + name + '\\s*\\(', 'm');
  const m = re.exec(src);
  if (!m) throw new Error('função não encontrada: ' + name);
  let i = src.indexOf('{', m.index), depth = 0, inStr = null, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++){
    const c = src[j], n = src[j + 1];
    if (inLine){ if (c === '\n') inLine = false; continue; }
    if (inBlock){ if (c === '*' && n === '/'){ inBlock = false; j++; } continue; }
    if (inStr){ if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '/'){ inLine = true; continue; }
    if (c === '/' && n === '*'){ inBlock = true; continue; }
    if (c === '"' || c === "'" || c === '`'){ inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}'){ depth--; if (depth === 0) return src.slice(m.index, j + 1); }
  }
  throw new Error('chaves desbalanceadas: ' + name);
}

const APP_FUNCTIONS = [
  'buildCardsFromUnits', 'flashcardIdForRow', 'lessonIndexForVocabIdx', 'isCardLessonCompleted', 'findMatchingPhrase',
  'matchesReviewOriginFilter', 'activeReviewTagFilter', 'matchesReviewTagFilter', 'eligibleReviewPool', 'eligibleDeckReviewPool', 'applySerializedState',
  'ensureCourseDecksLoaded', 'ensureDecksLoadedForReview',
  'deckReviewSummary', 'deckCountsForReview', 'reviewFilterQueue',
  'sessionIntensityToLimit',
];

function loadLang(lang, overrides){
  const appKey = lang === 'fr' ? 'frances' : 'mandarim';
  const ctx = vm.createContext(require('../i18n/vm-t').installT({ console, Date, Math, JSON, Map, Set, Promise, Object, Array, String, Number }));
  ctx.APP_KEY = appKey;
  ctx.window = ctx;
  const run = (code, file) => vm.runInContext(code, ctx, { filename: file });
  run(read('shared/srs.js'), 'shared/srs.js');
  run(read('shared/fsrs.js'), 'shared/fsrs.js');
  run(read('shared/study-queue.js'), 'shared/study-queue.js');
  run(read('shared/flashcard-model.js'), 'shared/flashcard-model.js');
  run(read('shared/study-trail-model.js'), 'shared/study-trail-model.js');
  run(read('shared/analytics-metrics.js'), 'shared/analytics-metrics.js');
  run(read('shared/deck-engine.js'), 'shared/deck-engine.js');
  run(read('shared/deck-data.js'), 'shared/deck-data.js');
  run(read(lang + '/content.js') + '\n;this.UNITS = UNITS;', lang + '/content.js');
  const appSrc = read(lang + '/app.js');
  APP_FUNCTIONS.forEach(fn => {
    try { run(extractFunction(appSrc, fn), lang + '/app.js#' + fn); }
    catch (e) { if (!/não encontrada/.test(e.message)) throw e; }
  });
  run('this.STATE = { cards: [], hanziCards: [], decks: [], courseDecksLoaded: false, unitProgress: {}, studySettings: { newCardsPerDay: 20, sessionIntensity: "normal", reviewOriginFilter: "all" } };', 'state');
  run('this.CURRENT_USER = null;', 'user');
  if (overrides) Object.assign(ctx, overrides);
  return ctx;
}

// Simula, em JS, o CONTRATO de ensure_course_decks() (migration 051) sobre
// linhas em memória -- usado só pelos testes Node/VM (o comportamento real
// da função é testado contra o Postgres em test_supabase_real.js).
function fakeEnsureCourseDecks(store, languageAppKey, units){
  let root = store.find(d => d.kind === 'course' && d.language_app_key === languageAppKey && d.course_unit_id == null);
  if (!root){
    root = { id: store.length + 1, kind: 'course', name: languageAppKey + ' — Curso', language_app_key: languageAppKey,
      course_unit_id: null, parent_deck_id: null, owner_id: null, teacher_id: null, is_public: false };
    store.push(root);
  }
  units.forEach(u => {
    let d = store.find(x => x.kind === 'course' && x.language_app_key === languageAppKey && x.course_unit_id === u.unit_id);
    if (!d){
      d = { id: store.length + 1, kind: 'course', name: u.title, language_app_key: languageAppKey,
        course_unit_id: u.unit_id, parent_deck_id: root.id, owner_id: null, teacher_id: null, is_public: false };
      store.push(d);
    } else d.name = u.title;
  });
  return store.filter(d => d.kind === 'course' && d.language_app_key === languageAppKey);
}

let passed = 0, failed = 0;
function check(name, cond, extra){
  if (cond) passed++;
  else { failed++; console.log('  FALHOU:', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}
function summary(label){
  console.log(`${label}: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
}

module.exports = { ROOT, read, loadLang, fakeEnsureCourseDecks, check, summary, extractFunction };
