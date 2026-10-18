// Etapa 0b do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.4 e 2.5): Course Deck de unidade que não
// existe mais no conteúdo fica no banco (vazio) e escondido na tabela de Decks da Revisão (shared/deck-browser.js).
// Nada é apagado. Código REAL: shared/deck-engine.js, shared/deck-browser.js, fr/content.js (harness da Fase E).
// Rodar: node tests/curriculo-ids/test_deck_unidade_excluida.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { check, summary, loadLang, fakeEnsureCourseDecks, ROOT } = require('../fase-e/harness');

function ctxWithBrowser(){
  const ctx = loadLang('fr');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/deck-browser.js'), 'utf8'), ctx, { filename: 'shared/deck-browser.js' });
  ctx.CURRENT_USER = { id: 'aluno-1' };
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.UNITS.forEach(u => { ctx.STATE.unitProgress[u.id] = { started: true, completed: true, unlocked: true, lessonIdx: 0 }; });
  return ctx;
}
const ids = (list) => list.map(d => d.course_unit_id);

{
  const ctx = ctxWithBrowser();
  // decks do banco: os de hoje + um de unidade que deixou de existir ("A1-99", ex.: excluída numa versão do currículo)
  const store = [];
  fakeEnsureCourseDecks(store, 'frances', ctx.courseUnitsForDecks(ctx.UNITS));
  const root = store.find(d => d.course_unit_id == null);
  store.push({ id: store.length + 1, kind: 'course', name: 'Unidade excluída', language_app_key: 'frances', course_unit_id: 'A1-99', parent_deck_id: root.id, owner_id: null, teacher_id: null, is_public: false });
  ctx.STATE.decks = store;
  ctx.STATE.unitProgress['A1-99'] = { started: true, completed: true, unlocked: true, lessonIdx: 0 }; // progresso antigo no save
  const before = JSON.stringify(store);
  ctx.assignCourseDeckIds(ctx.STATE.cards, ctx.buildCourseDeckIndex(store, 'frances'));
  const kids = ctx.deckBrowserChildren(store, root.id);
  check('deck da unidade excluída escondido (mesmo com progresso antigo no save)', !ids(kids).includes('A1-99'), ids(kids));
  const withDeck = ctx.courseUnitsForDecks(ctx.UNITS).map(u => String(u.unit_id)); // unidades que têm Course Deck
  check('decks das unidades de hoje continuam (concluídas/começadas)', withDeck.length > 0 && withDeck.every(id => ids(kids).includes(id)) && kids.length === withDeck.length, [kids.length, withDeck.length]);
  check('ordem do currículo mantida', JSON.stringify(ids(kids)) === JSON.stringify(withDeck));
  const gone = store.find(d => d.course_unit_id === 'A1-99');
  check('deck excluído fica vazio (nenhum cartão aponta para ele)', ctx.STATE.cards.every(c => c.deckId !== gone.id));
  check('nada é apagado nem alterado no banco', JSON.stringify(store) === before);
  check('deckBrowserUnitVisible: unidade inexistente = false; existente começada = true',
    ctx.deckBrowserUnitVisible(gone) === false && ctx.deckBrowserUnitVisible(store.find(d => d.course_unit_id === 'A1-1')) === true);
  // a regra de sempre continua: unidade de hoje ainda não começada fica escondida
  ctx.STATE.unitProgress['A1-2'] = { started: false, completed: false, unlocked: false, lessonIdx: 0 };
  check('regra de sempre: unidade não começada escondida', !ids(ctx.deckBrowserChildren(store, root.id)).includes('A1-2'));
  check('raiz "Trilha de Estudo" e decks que não são de unidade passam', ctx.deckBrowserUnitVisible(root) === true && ctx.deckBrowserUnitVisible({ kind: 'personal', id: 5 }) === true);
}
{
  // zh: unidade com id numérico (course_unit_id é texto no banco)
  const ctx = loadLang('zh');
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/deck-browser.js'), 'utf8'), ctx, { filename: 'shared/deck-browser.js' });
  ctx.UNITS.forEach(u => { ctx.STATE.unitProgress[u.id] = { started: true, completed: false, unlocked: true, lessonIdx: 1 }; });
  const store = [];
  fakeEnsureCourseDecks(store, 'mandarim', ctx.courseUnitsForDecks(ctx.UNITS));
  const root = store.find(d => d.course_unit_id == null);
  const kids = ctx.deckBrowserChildren(store, root.id);
  check('zh: todos os decks de unidade continuam visíveis (id numérico x texto)', kids.length === ctx.courseUnitsForDecks(ctx.UNITS).length && kids.length > 0, [kids.length, ctx.UNITS.length]);
}
summary('curriculo-ids deck de unidade excluída');
