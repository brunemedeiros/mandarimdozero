// Fase I (Tags) -- testes unitários (Node/VM). Carrega os arquivos REAIS
// (nunca cópias). Rodar: node tests/fase-i/test_tags_unit.js
const vm = require('vm');
const g = require('../fase-g/harness');
const { read, check, summary, FILES } = g;
const { extractFunction } = require('../fase-e/harness');

function ctxFor(appKey){
  const { ctx } = g.load(appKey, 'u-1');
  ['shared/anki-parser.js', 'shared/anki-import.js', 'shared/anki-export.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const J = (ctx, expr) => JSON.parse(JSON.stringify(run(ctx, expr)));
const fr = ctxFor('frances'), zh = ctxFor('mandarim');

// ---------- Normalização (autoridade única: shared/flashcard-model.js) ----------
check('slug: lowercase', J(fr, `normalizeTagSlug('SAUDACAO')`) === 'saudacao');
check('slug: acentos', J(fr, `normalizeTagSlug('Saudação')`) === 'saudacao');
check('slug: espaços viram -', J(fr, `normalizeTagSlug('meu deck  novo')`) === 'meu-deck-novo');
check('slug: :: achatado', J(fr, `normalizeTagSlug('Idioma::Frances')`) === 'idioma-frances');
check('slug: caracteres inválidos', J(fr, `normalizeTagSlug('a!!b@@c')`) === 'a-b-c');
check('slug: só inválidos -> vazio', J(fr, `normalizeTagSlug('!!!')`) === '');
check('dedup + ordem da 1ª ocorrência', JSON.stringify(J(fr, `normalizeNoteTags(['B','a','b','A','c'])`)) === '["b","a","c"]');
check('formas equivalentes -> mesmo slug', J(fr, `normalizeTagSlug('Café com Leite')`) === J(fr, `normalizeTagSlug('cafe-com-leite')`));
check('normalizeNoteTags(undefined) = []', JSON.stringify(J(fr, `normalizeNoteTags(undefined)`)) === '[]');

// ---------- Limites (20 / 50, nunca truncam) ----------
const many = n => `Array.from({length:${n}},(_,i)=>'t'+i)`;
check('20 tags aceitas', J(fr, `validateNoteTags(${many(20)}).ok`) === true);
const v21 = J(fr, `validateNoteTags(${many(21)})`);
check('21ª rejeitada (sem truncar)', v21.ok === false && v21.errorCode === 'too_many_tags' && v21.tags.length === 21 && /20/.test(v21.error), v21);
check('tag de 50 chars aceita', J(fr, `validateNoteTags(['${'a'.repeat(50)}']).ok`) === true);
const v51 = J(fr, `validateNoteTags(['${'a'.repeat(51)}'])`);
check('tag de 51 chars rejeitada (sem truncar)', v51.ok === false && v51.errorCode === 'tag_too_long' && v51.tags[0].length === 51, v51);
check('constantes 20/50', J(fr, `[TAG_MAX_PER_NOTE, TAG_MAX_LENGTH]`).join() === '20,50');
const part = J(fr, `partitionNoteTagsByLimits([...${many(22)}, '${'x'.repeat(60)}'])`);
check('partition: mantém 20, informa 3 descartadas com motivo', part.tags.length === 20 && part.dropped.length === 3 && part.dropped.filter(d => d.reason === 'over_limit').length === 2 && part.dropped.filter(d => d.reason === 'too_long').length === 1, part);

// ---------- Filtro (OR) ----------
const cards = [{ id: 'a', tags: ['a1', 'saudacao'] }, { id: 'b', tags: ['b2'] }, { id: 'c', tags: [] }, { id: 'trilha' }];
const fil = f => J(fr, `${JSON.stringify(cards)}.filter(c => cardMatchesTagFilter(c, ${JSON.stringify(f)})).map(c => c.id)`).join();
check('filtro vazio = tudo (inclui trilha sem tags)', fil([]) === 'a,b,c,trilha');
check('filtro [a1] -> a', fil(['a1']) === 'a');
check('filtro [a1,verbos] -> a (OR)', fil(['a1', 'verbos']) === 'a');
check('filtro [a1,b2] -> a,b (OR)', fil(['a1', 'b2']) === 'a,b');
check('tag inexistente -> nada', fil(['nada']) === '');
check('trilha (sem tags) nunca passa com filtro ativo', !fil(['a1']).includes('trilha'));
check('collectTagsFromCards distintas e ordenadas', J(fr, `collectTagsFromCards(${JSON.stringify(cards)})`).join() === 'a1,b2,saudacao');

// ---------- Tags pertencem à Note: irmãos compartilham; FSRS independente ----------
const rowRev = { id: 501, language_app_key: 'frances', status: 'active', revision: 0, front: 'a', back_trans: 'b', tags: ['saudacao', 'A1'],
  fields: [{ id: 'f1', lang: 'fr', role: null, content: { value: 'bonjour' }, audio: null, image: null, pinyinFieldId: null }, { id: 'f2', lang: 'pt-BR', role: null, content: { value: 'olá' }, audio: null, image: null, pinyinFieldId: null }],
  card_generation_mode: 'normal_reversed' };
run(fr, `var __rev = buildEngineCardsFromRow(${JSON.stringify(rowRev)}, {origin:'self', appKey:'frances', idPrefix:'s'});`);
check('Normal reverso: 2 CardInstances', J(fr, `__rev.length`) === 2);
check('irmãos com as MESMAS tags (normalizadas)', J(fr, `__rev.every(c => JSON.stringify(c.tags) === '["saudacao","a1"]')`) === true);
run(fr, `__rev[0].reps = 3; __rev[0].due = 12345;`);
check('FSRS independente entre irmãos (mutar um não afeta o outro)', J(fr, `__rev[1].reps`) === 0);
run(fr, `var __rev2 = buildEngineCardsFromRow(Object.assign(${JSON.stringify(rowRev)}, {tags: ['outra']}), {origin:'self', appKey:'frances', idPrefix:'s'});`);
check('mudar tags não muda ids nem FSRS default dos cards', J(fr, `__rev2.map(c=>c.id).join()`) === J(fr, `__rev.map(c=>c.id).join()`) && J(fr, `__rev2[0].reps`) === 0);
const rowCloze = { id: 502, language_app_key: 'frances', status: 'active', revision: 0, front: null, back_trans: 'trad', tags: ['verbos'],
  fields: [{ id: 'f1', lang: 'fr', role: null, content: { value: '{{c1::Je}} {{c2::suis}} là' }, audio: null, image: null, pinyinFieldId: null }, { id: 'f2', lang: 'pt-BR', role: null, content: { value: 'Eu estou aqui' }, audio: null, image: null, pinyinFieldId: null }],
  card_generation_mode: 'cloze' };
run(fr, `var __cl = buildEngineCardsFromRow(${JSON.stringify(rowCloze)}, {origin:'teacher', appKey:'frances', idPrefix:'t'});`);
check('Cloze multi-marca: 2 CardInstances com as mesmas tags', J(fr, `__cl.length`) === 2 && J(fr, `__cl.every(c => c.tags.join() === 'verbos')`) === true);
check('Legacy sem tags -> []', J(fr, `buildEngineCardsFromRow({id:9, language_app_key:'frances', status:'active', revision:0, front:'a', back_trans:'b'}, {origin:'self', appKey:'frances', idPrefix:'s'})[0].tags.length`) === 0);

// ---------- Editor: criar / editar / remover / preservar ----------
run(fr, `var __st = createNativeNoteEditorState({cardGenerationMode:'normal', tags:['Saudação','a1','a1']});`);
check('criar Note com tags (normalizadas, sem duplicata)', J(fr, `__st.tags.join()`) === 'saudacao,a1');
run(fr, `var __row = noteEditorStateToRow(__st);`);
check('serialização leva as tags', J(fr, `__row.tags.join()`) === 'saudacao,a1');
const rt = J(fr, `createNativeNoteEditorStateFromRow(Object.assign({}, ${JSON.stringify(rowRev)}, {id: 501})).tags`);
check('reabrir Note nativa preserva tags', rt.join() === 'saudacao,a1', rt);
check('editar sem alterar tags: sem nova revision', J(fr, `noteEditorStateRequiresNewRevision(createNativeNoteEditorStateFromRow(${JSON.stringify(rowRev)}), createNativeNoteEditorStateFromRow(${JSON.stringify(rowRev)}))`) === false);
check('remover uma tag conta como mudança de conteúdo', J(fr, `(function(){ var a = createNativeNoteEditorStateFromRow(${JSON.stringify(rowRev)}); var b = cloneNoteEditorState(a); b.tags = b.tags.filter(t => t !== 'a1'); return noteEditorStateRequiresNewRevision(a, b); })()`) === true);
check('salvar sem tags -> []', J(fr, `noteEditorStateToRow(createNativeNoteEditorState({cardGenerationMode:'normal'})).tags.length`) === 0);
// validação central de save
run(fr, `var __ok = createNativeNoteEditorState({cardGenerationMode:'normal', tags:['x']}); __ok.fields = ${JSON.stringify(rowRev.fields)};`);
check('validateNoteEditorStateForSave aceita ≤20', J(fr, `validateNoteEditorStateForSave(__ok).ok`) === true);
run(fr, `__ok.tags = ${many(21)};`);
const sv = J(fr, `validateNoteEditorStateForSave(__ok)`);
check('validateNoteEditorStateForSave rejeita 21 (mensagem clara)', sv.ok === false && /20/.test(sv.error), sv);
run(fr, `__ok.tags = ['${'z'.repeat(51)}'];`);
check('validateNoteEditorStateForSave rejeita tag de 51', J(fr, `validateNoteEditorStateForSave(__ok).ok`) === false);
// legado -> nativo preserva tags que a linha já tinha
const conv = J(fr, `nativeNoteEditorStateFromLegacyRow({id: 77, language_app_key:'frances', status:'active', revision:0, front:'a', back_trans:'b', front_is_target_language:true, tags:['vindas-do-anki']}).tags`);
check('conversão Legacy->Native preserva tags existentes', conv.join() === 'vindas-do-anki', conv);
check('edição legada (updateFlashcardContent legacy) não menciona tags', !/tags/.test(extractFunction(read('shared/teacher-flashcards.js'), 'updateFlashcardContent')) && !/tags/.test(extractFunction(read('shared/own-flashcards.js'), 'updateOwnFlashcardContent')));

// ---------- Cópia entre usuários (arquivo/link/perfil público): tags acompanham; sem vínculo vivo ----------
const imp = J(fr, `nativeNoteEditorStateFromImportPayload({front:'a', backTrans:'b', frontIsTargetLanguage:true, tags:['Saudação','a1']}, 'frances').tags`);
check('importação/cópia preserva tags (normalizadas)', imp.join() === 'saudacao,a1', imp);
run(fr, `var __src = {tags:['t1']}; var __cp = nativeNoteEditorStateFromImportPayload({front:'a', backTrans:'b', tags: __src.tags}, 'frances'); __src.tags.push('depois');`);
check('cópia não é referência viva ao original', J(fr, `__cp.tags.join()`) === 't1');
run(fr, `var __big = nativeNoteEditorStateFromImportPayload({front:'a', backTrans:'b', tags: ${many(25)}}, 'frances');`);
check('importação externa respeita limite e AVISA (não silencioso)', J(fr, `__big.tags.length`) === 20 && /ignoradas/.test(J(fr, `summarizeDroppedImportTags([__big])`)));
check('sem excedente: nenhum aviso', J(fr, `summarizeDroppedImportTags([nativeNoteEditorStateFromImportPayload({front:'a', backTrans:'b', tags:['x']}, 'frances')])`) === '');
check('payload de exportação (arquivo/link) inclui tags', /tags:\s*Array\.isArray\(c\.tags\)/.test(read('shared/my-flashcards.js')));

// ---------- Anki: import -> plano, limites; export -> string; round-trip ----------
function ankiPlan(ctx, tags){
  const model = { id: 1, type: 0, flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }], tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id=answer>{{Back}}' }] };
  const pr = { models: { 1: model }, decks: { 1: { name: 'Vocab::Animais' } }, cardsByNoteId: new Map([[10, [{ deckId: 1 }]]]),
    notes: [{ id: 10, guid: 'g', mid: 1, flds: ['chat', 'gato'], tags }] };
  ctx.__pr = pr;
  return J(ctx, `buildAnkiImportPlan(__pr, {languageAppKey: 'frances', existingRows: []})`);
}
let plan = ankiPlan(fr, ['Vocab', 'A1', 'café_com_leite', 'vocab']);
check('Anki import: tags normalizadas e sem duplicata', plan.notes[0].ok && plan.notes[0].editorState.tags.join() === 'vocab,a1,cafe-com-leite', plan.notes[0]);
plan = ankiPlan(fr, Array.from({ length: 23 }, (_, i) => 'tag' + i));
check('Anki import: 23 tags -> mantém 20 e avisa (não silencioso)', plan.notes[0].ok && plan.notes[0].editorState.tags.length === 20 && plan.notes[0].warnings.some(w => /não foram importadas/.test(w)), plan.notes[0].warnings);
plan = ankiPlan(fr, ['x'.repeat(60), 'ok']);
check('Anki import: tag > 50 fora, restante fica, com aviso', plan.notes[0].editorState.tags.join() === 'ok' && plan.notes[0].warnings.some(w => /acima de 50/.test(w)));
// export: 1 string por NOTE (irmãos iguais), sem tag de direção; round-trip
const exp = J(fr, `__rev.map(c => ankiNoteTagsString(c))`);
check('Anki export: tags da Note em cada card, sem duplicar nem inventar direção', exp[0] === ' saudacao a1 ' && exp[1] === exp[0] && !/reverso|reverse|direcao/.test(exp[0]), exp);
check('Anki export: trilha continua unidadeN', J(fr, `ankiNoteTagsString({unitId: 3, tags: []})`) === 'unidade3 ');
check('Anki export: sem tags -> vazio (nunca unidadenull)', J(fr, `ankiNoteTagsString({unitId: null, tags: []})`) === '');
plan = ankiPlan(fr, exp[0].trim().split(/\s+/));
check('Anki round-trip: exportar -> importar preserva o conjunto', plan.notes[0].editorState.tags.join() === 'saudacao,a1');

// ---------- Filtro no Review (fr + zh): funções REAIS de app.js ----------
for (const [label, appjs] of [['fr', 'fr/app.js'], ['zh', 'zh/app.js']]){
  const ctx = vm.createContext({ console, JSON, Array, Set, Object });
  vm.runInContext(read('shared/flashcard-model.js'), ctx);
  const src = read(appjs);
  ['activeReviewTagFilter', 'matchesReviewTagFilter', 'eligibleReviewPool', 'reviewTagUniverse', 'matchesReviewOriginFilter'].forEach(fn => vm.runInContext(extractFunction(src, fn), ctx));
  vm.runInContext(`var STATE = {studySettings:{reviewOriginFilter:'all', reviewTagFilter:[]}, cards:[
    {id:1, origin:'self', flashcardStatus:'active', tags:['a1']}, {id:2, origin:'teacher', flashcardStatus:'active', tags:['b2']},
    {id:3, origin:'study', tags:[]}, {id:4, origin:'self', flashcardStatus:'archived', tags:['a1']}]};
    function isCardLessonCompleted(c){ return c.origin === 'study' ? true : c.flashcardStatus === 'active'; }`, ctx);
  const ids = () => JSON.parse(JSON.stringify(vm.runInContext('eligibleReviewPool().map(c=>c.id)', ctx))).join();
  check(label + ' sem filtro = comportamento atual', ids() === '1,2,3');
  vm.runInContext(`STATE.studySettings.reviewTagFilter = ['a1']`, ctx);
  check(label + ' filtro [a1]: só o ativo com a1 (arquivado fora, trilha fora)', ids() === '1');
  vm.runInContext(`STATE.studySettings.reviewTagFilter = ['a1','b2']`, ctx);
  check(label + ' filtro OR [a1,b2]', ids() === '1,2');
  vm.runInContext(`STATE.studySettings.reviewOriginFilter = 'teacher'`, ctx);
  check(label + ' composição com origem (AND): teacher + [a1,b2] -> só 2', ids() === '2');
  check(label + ' reviewOriginFilter não é alterado pelo filtro de tag', vm.runInContext('STATE.studySettings.reviewOriginFilter', ctx) === 'teacher');
  vm.runInContext(`STATE.studySettings.reviewOriginFilter = 'all'; STATE.studySettings.reviewTagFilter = [];`, ctx);
  check(label + ' limpar filtro restaura tudo', ids() === '1,2,3');
  check(label + ' universo de tags não inclui a própria seleção como restrição', JSON.parse(JSON.stringify(vm.runInContext(`STATE.studySettings.reviewTagFilter=['a1']; collectTagsFromCards(reviewTagUniverse())`, ctx))).join() === 'a1,b2');
  check(label + ' eligibleDeckReviewPool NÃO usa filtro de tag (contagens do Deck intactas)', !/matchesReviewTag/.test(extractFunction(src, 'eligibleDeckReviewPool')));
}
summary('Fase I -- unit');
