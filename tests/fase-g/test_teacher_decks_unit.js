// Fase G -- Node/VM: Teacher Decks + Teacher Cards no Deck Engine.
// Rodar: node tests/fase-g/test_teacher_decks_unit.js
const { load, check, summary } = require('./harness');
const T = 'teacher-1', T2 = 'teacher-2', S1 = 'student-1', S2 = 'student-2';

const mk = (ctx, mode, fields, extra) => {
  const st = ctx.createNativeNoteEditorState(Object.assign({ cardGenerationMode: mode, languageAppKey: ctx.APP_KEY }, extra || {}));
  fields.forEach(f => ctx.addFieldToEditorState(st, f));
  return st;
};
const cv = o => ({ content: { value: o } });
const cards = (ctx, rows, origin) => rows.flatMap(r => ctx.buildEngineCardsFromRow(r, { origin, appKey: ctx.APP_KEY, idPrefix: origin === 'teacher' ? 't' : 's' }));

(async () => {
  for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
    console.log('== ' + lang);
    const { ctx, db } = load(appKey, T);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    db.teacher_students.push({ teacher_id: T, student_id: S1, language_app_key: appKey, status: 'active' },
                             { teacher_id: T, student_id: S2, language_app_key: appKey, status: 'active' });
    const normal = mk(ctx, 'normal', [cv('a'), cv('b')]);
    const rev = mk(ctx, 'normal_reversed', [cv('a'), cv('b')]);
    const cloze3 = mk(ctx, 'cloze', [cv('{{c1::x}} {{c2::y}} {{c3::z}}'), cv('trad')]);
    const ta = mk(ctx, 'type_answer', [cv('p'), cv('r')]);
    const mc = mk(ctx, 'multiple_choice', [{ role: 'prompt', content: { value: 'q' } }, { role: 'answer', content: { value: 'ok' } }, { role: 'distractor', content: { value: 'x' } }]);

    // ---- A. bootstrap ----
    const b1 = await ctx.ensureTeacherDecksForStudent(S1, appKey);
    const b1b = await ctx.ensureTeacherDecksForStudent(S1, appKey);
    L('A bootstrap cria teacher_root', b1.ok && b1.teacherRootDeckId != null);
    L('A idempotente: mesmo teacher_root, 1 só no banco', b1b.teacherRootDeckId === b1.teacherRootDeckId && db.decks.filter(d => d.kind === 'teacher_root').length === 1);
    const tr1 = db.decks.find(d => d.id === b1.teacherRootDeckId);
    L('A teacher_root: professora, aluno, idioma, pai=root do aluno', tr1.teacher_id === T && tr1.owner_id === S1 && tr1.language_app_key === appKey && db.decks.find(d => d.id === tr1.parent_deck_id).kind === 'root');
    L('A sem vínculo ativo: rejeitado, nada criado', (await ctx.ensureTeacherDecksForStudent('estranho', appKey)).ok === false && db.decks.filter(d => d.owner_id === 'estranho').length === 0);
    const otherLang = appKey === 'frances' ? 'mandarim' : 'frances';
    L('A idioma sem vínculo: rejeitado', (await ctx.ensureTeacherDecksForStudent(S1, otherLang)).ok === false);
    const b2 = await ctx.ensureTeacherDecksForStudent(S2, appKey);
    L('A/C dois alunos = duas árvores distintas', b2.ok && b2.teacherRootDeckId !== b1.teacherRootDeckId && db.decks.find(d => d.id === b2.teacherRootDeckId).owner_id === S2);

    // ---- default de destino + criação dos 5 tipos ----
    const dest1 = await ctx.resolveTeacherCreationDeck({ studentId: S1, languageAppKey: appKey });
    L('6 destino padrão = teacher_root do aluno', dest1.ok && dest1.deckId === tr1.id);
    const made = {};
    for (const [n, st] of [['Normal', normal], ['Reverso', rev], ['Type Answer', ta], ['Cloze', cloze3], ['Multiple Choice', mc]]){
      const r = await ctx.createFlashcard({ studentId: S1, languageAppKey: appKey, nativeState: st, deckId: dest1.deckId });
      made[n] = r;
      L('B ' + n + ': criado nativo no teacher_root (deck_id no mesmo INSERT)', r.ok && r.card.deck_id === tr1.id && r.card.card_generation_mode === st.cardGenerationMode && Array.isArray(r.card.fields) && r.card.teacher_id === T && r.card.student_id === S1);
    }
    const built = n => cards(ctx, [made[n].card], 'teacher');
    L('G Normal = 1 CardInstance', built('Normal').length === 1);
    L('G Reverso = 2 CardInstances, mesmo deckId, ids distintos, FSRS independente', (() => { const c = built('Reverso'); return c.length === 2 && c[0].deckId === tr1.id && c[1].deckId === tr1.id && c[0].id !== c[1].id && c[0] !== c[1]; })());
    L('G Cloze 3 = 3 CardInstances no mesmo Deck', (() => { const c = built('Cloze'); return c.length === 3 && c.every(x => x.deckId === tr1.id) && new Set(c.map(x => x.id)).size === 3; })());
    L('G Type Answer/MC = 1 CardInstance cada', built('Type Answer').length === 1 && built('Multiple Choice').length === 1);
    L('G irmãos ficam juntos: 1 linha = 1 deck_id (nunca por CardInstance)', made['Reverso'].card.deck_id === tr1.id && !('deckId' in ctx.buildEngineCardsFromRow(made['Reverso'].card, { origin: 'teacher', appKey, idPrefix: 't' })[0].cardInstance));
    L('CardInstance não é persistido (linha só tem Note)', !('cardInstance' in made['Reverso'].card) && !('cardInstances' in made['Reverso'].card));

    // ---- C. multi-aluno ----
    const before = db.teacher_flashcards.length;
    db.failStudent = S2;
    const results = await Promise.all([S1, S2].map(async sid => {
      const d = await ctx.resolveTeacherCreationDeck({ studentId: sid, languageAppKey: appKey });
      if (!d.ok) return { ok: false, student: sid };
      const r = await ctx.createFlashcard({ studentId: sid, languageAppKey: appKey, nativeState: normal, deckId: d.deckId });
      return Object.assign({ student: sid }, r);
    }));
    db.failStudent = null;
    L('C sucesso parcial possível: aluno 1 ok, aluno 2 falhou', results[0].ok === true && results[1].ok === false);
    L('C falha do aluno 2 NÃO atribui o cartão ao Deck de outro aluno', db.teacher_flashcards.length === before + 1 && db.teacher_flashcards.slice(before).every(r => r.student_id === S1 && r.deck_id === tr1.id));
    const okBoth = await Promise.all([S1, S2].map(async sid => {
      const d = await ctx.resolveTeacherCreationDeck({ studentId: sid, languageAppKey: appKey });
      return ctx.createFlashcard({ studentId: sid, languageAppKey: appKey, nativeState: normal, deckId: d.deckId });
    }));
    L('C mesmo conteúdo p/ 2 alunos: 2 linhas independentes, deck_id diferentes', okBoth.every(r => r.ok) && okBoth[0].card.deck_id !== okBoth[1].card.deck_id && okBoth[0].card.id !== okBoth[1].card.id);
    L('C isolamento: árvore do aluno 1 não contém deck do aluno 2', ctx.getTeacherDecksForStudent(db.decks, { teacherId: T, studentId: S1, languageAppKey: appKey }).every(d => d.owner_id === S1));

    // ---- F. destinos proibidos ----
    db.decks.push({ id: 801, kind: 'personal_root', owner_id: S1, parent_deck_id: null, language_app_key: appKey, name: 'Meus Decks' });
    db.decks.push({ id: 802, kind: 'course', owner_id: null, parent_deck_id: null, language_app_key: appKey, name: 'curso' });
    db.decks.push({ id: 803, kind: 'teacher_root', owner_id: S1, teacher_id: T2, parent_deck_id: null, language_app_key: appKey, name: 'outra professora' });
    db.decks.push({ id: 804, kind: 'root', owner_id: S1, parent_deck_id: null, language_app_key: appKey, name: 'root dup' });
    const nrows = db.teacher_flashcards.length;
    for (const [n, id] of [['Personal Deck', 801], ['Course Deck', 802], ['Teacher Deck de outra professora', 803], ['Teacher Deck de outro aluno', b2.teacherRootDeckId], ['root', 804], ['inexistente', 999999]]){
      const d = await ctx.resolveTeacherCreationDeck({ studentId: S1, languageAppKey: appKey, deckId: id, decks: db.decks });
      L('F destino rejeitado: ' + n, d.ok === false);
    }
    L('F nada gravado pelas tentativas proibidas', db.teacher_flashcards.length === nrows);

    // ---- E. hierarquia ----
    const treeOf = sid => ctx.getTeacherDecksForStudent(db.decks, { teacherId: T, studentId: sid, languageAppKey: appKey });
    const root1 = ctx.getTeacherRootDeck(db.decks, { teacherId: T, studentId: S1, languageAppKey: appKey });
    L('E getTeacherRootDeck acha o teacher_root certo', root1.id === tr1.id);
    const subA = await ctx.createTeacherDeck({ name: 'Aulas', parentDeck: root1, decks: db.decks });
    L('E subdeck sob teacher_root (kind teacher, aluno/professora/idioma herdados)', subA.ok && subA.deck.kind === 'teacher' && subA.deck.owner_id === S1 && subA.deck.teacher_id === T && subA.deck.language_app_key === appKey);
    const subB = await ctx.createTeacherDeck({ name: 'Verbos', parentDeck: subA.deck, decks: db.decks });
    L('E subdeck sob outro subdeck', subB.ok && subB.deck.parent_deck_id === subA.deck.id);
    L('E nome vazio rejeitado', (await ctx.createTeacherDeck({ name: '  ', parentDeck: root1, decks: db.decks })).ok === false);
    L('E não cria sob Personal/Course/Deck de outra professora', [801, 802, 803].every(id => { const p = db.decks.find(d => d.id === id); return ctx.canCreateTeacherSubdeck(p, { teacherId: T }).ok === false; }));
    ctx.CURRENT_USER = { id: T2 };
    L('E outra professora não cria sob a árvore de T', (await ctx.createTeacherDeck({ name: 'x', parentDeck: subA.deck, decks: db.decks })).ok === false);
    ctx.CURRENT_USER = { id: T };
    L('E descendentes do teacher_root incluem Aulas e Verbos', (() => { const ids = ctx.getDeckSubtreeIds(db.decks, tr1.id); return ids.includes(subA.deck.id) && ids.includes(subB.deck.id); })());
    L('E ordem em árvore (pai antes do filho) com profundidade', (() => { const o = ctx.orderedTeacherDecks(db.decks, treeOf(S1)); return o[0].depth === 0 && o.find(x => x.deck.id === subB.deck.id).depth === 2; })());
    // mover
    const mv = await ctx.moveTeacherDeck({ deck: subB.deck, destination: root1, decks: db.decks });
    L('E mover Teacher Deck dentro da própria árvore', mv.ok && db.decks.find(d => d.id === subB.deck.id).parent_deck_id === tr1.id);
    const subC = await ctx.createTeacherDeck({ name: 'C', parentDeck: subA.deck, decks: db.decks });
    L('E ciclo rejeitado (mover pai sob o próprio descendente)', (await ctx.moveTeacherDeck({ deck: subA.deck, destination: subC.deck, decks: db.decks })).ok === false);
    const s2root = db.decks.find(d => d.id === b2.teacherRootDeckId);
    for (const [n, dst] of [['outra árvore (outro aluno)', s2root], ['Personal', db.decks.find(d => d.id === 801)], ['Course', db.decks.find(d => d.id === 802)], ['teacher_root de outra professora', db.decks.find(d => d.id === 803)]]){
      L('E mover p/ ' + n + ' rejeitado', (await ctx.moveTeacherDeck({ deck: subA.deck, destination: dst, decks: db.decks })).ok === false);
    }
    L('E teacher_root não é movível', ctx.validateDeckMove({ deck: root1, destination: subA.deck, decks: db.decks }).ok === false);
    L('E Personal continua movível como antes (regressão Fase C)', ctx.validateDeckMove({ deck: { id: 1, kind: 'personal', owner_id: 'x', language_app_key: appKey }, destination: { id: 2, kind: 'personal_root', owner_id: 'x', language_app_key: appKey }, decks: [] }).ok === true);
    // mover Note
    const note = made['Normal'].card;
    const mvN = await ctx.setTeacherFlashcardDeck({ note, destination: subA.deck, decks: db.decks });
    L('E mover Note entre Teacher Decks do mesmo aluno', mvN.ok && db.teacher_flashcards.find(r => r.id === note.id).deck_id === subA.deck.id);
    L('E mover Note p/ Personal rejeitado', (await ctx.setTeacherFlashcardDeck({ note, destination: db.decks.find(d => d.id === 801), decks: db.decks })).ok === false);
    L('E mover Note p/ Deck de outro aluno rejeitado', (await ctx.setTeacherFlashcardDeck({ note, destination: s2root, decks: db.decks })).ok === false);
    // excluir
    L('E excluir subdeck com Notes rejeitado (não apaga cartões)', (await ctx.deleteTeacherDeck({ deck: subA.deck, decks: db.decks })).ok === false && db.teacher_flashcards.some(r => r.id === note.id));
    const emptyRes = await ctx.deleteTeacherDeck({ deck: subC.deck, decks: db.decks });
    L('E excluir subdeck vazio (sem filhos/Notes) permitido', emptyRes.ok && !db.decks.some(d => d.id === subC.deck.id));
    L('E excluir teacher_root nunca', (await ctx.deleteTeacherDeck({ deck: root1, decks: db.decks })).ok === false);

    // ---- H/I. Review + contagens ----
    db.own_flashcards.push({ id: 7001, owner_id: S1, language_app_key: appKey, status: 'active', front: 'p', back_trans: 'p', deck_id: 801 });
    const teacherCards = cards(ctx, db.teacher_flashcards.filter(r => r.student_id === S1), 'teacher');
    const ownCards = cards(ctx, db.own_flashcards, 'self');
    const trail = [{ id: 'u1-v0', origin: 'study', unitId: 'u1', deckId: null, state: 'new', due: 0, reps: 0 }];
    const all = [...teacherCards, ...ownCards, ...trail];
    const scope = ctx.getStudyScopeForDeck(db.decks, tr1.id, all);
    L('H escopo do Teacher Deck: só cards de professora do aluno (descendentes incluídos)', scope.length > 0 && scope.every(c => c.origin === 'teacher') && scope.length === teacherCards.length);
    L('H não mistura Personal nem Study Trail', !scope.some(c => c.origin === 'self' || c.origin === 'study'));
    L('H escopo de subdeck só inclui o próprio subtree', (() => { const s = ctx.getStudyScopeForDeck(db.decks, subA.deck.id, all); return s.length > 0 && s.every(c => c.deckId === subA.deck.id || ctx.getDeckSubtreeIds(db.decks, subA.deck.id).includes(c.deckId)); })());
    const rc = cards(ctx, [made['Reverso'].card], 'teacher');
    rc[0].reps = 5; rc[0].state = 'review';
    L('H FSRS independente por CardInstance (mutar um não altera o irmão)', rc[1].reps === 0 && rc[1].state !== 'review');
    const cnt = ctx.getDeckCounts(db.decks, tr1.id, teacherCards);
    L('I contagens New/Learning/Review via Deck Engine (nada estudado: tudo New)', cnt.new === teacherCards.length && cnt.learning === 0 && cnt.review === 0, cnt);
    teacherCards[0].state = 'learning'; teacherCards[1].state = 'review'; teacherCards[1].due = 0;
    const cnt2 = ctx.getDeckCounts(db.decks, tr1.id, teacherCards);
    L('I New/Learning/Review refletem o estado FSRS do card', cnt2.learning === 1 && cnt2.new === teacherCards.length - 2 && cnt2.review === 1, cnt2);
    L('I contagem = CardInstances (não linhas)', teacherCards.length > db.teacher_flashcards.filter(r => r.student_id === S1).length);

    // ---- 11. limite: Teacher Cards não entram ----
    L('11 Teacher Cards NÃO consomem o limite pessoal (uso = só own_flashcards ativos)', ctx.ownCardInstanceUsage(db.own_flashcards) === 1);
    const pf = ctx.preflightOwnCardInstanceCreation({ activeRows: db.own_flashcards, hasTeacherLink: false, editorStates: [normal], languageAppKey: appKey, limit: 20 });
    L('11 preflight pessoal ignora Teacher Cards', pf.ok && pf.used === 1, pf);

    // ---- 13. históricos ----
    const legacy = Array.from({ length: 5 }, (_, i) => ({ id: 50 + i, teacher_id: T, student_id: S1, language_app_key: appKey, status: 'active', front: 'l' + i, back_trans: 'b', deck_id: null }));
    const lc = cards(ctx, legacy, 'teacher');
    L('13 históricos: deckId null, fora de qualquer escopo de Deck, não alterados', lc.every(c => c.deckId === null) && ctx.getStudyScopeForDeck(db.decks, tr1.id, lc).length === 0 && legacy.every(r => r.deck_id === null));

    // ---- aluno: seção somente leitura ----
    ctx.CURRENT_USER = { id: S1 };
    ctx.STATE.cards = [...teacherCards, ...ownCards];
    const html = ctx.teacherDecksReadOnlyHTML(db.decks);
    L('aluno vê a seção "Cartões da professora" com "Estudar este Deck"', html.includes('Cartões da professora') && html.includes('data-study-deck'));
    L('aluno: seção estruturalmente só-leitura (sem criar/mover/apagar/subdeck)', !/data-dest|data-move|data-delete|my-deck-new|<select|<input|newsub|Excluir|Apagar/.test(html));
    L('aluno só vê Teacher Decks dele (não os do aluno 2, nem de outra professora que não recebeu)', ctx.teacherReceivedDecks(db.decks).every(d => d.owner_id === S1));
    ctx.CURRENT_USER = { id: 'sem-professora' };
    L('conta sem professora: seção some por completo', ctx.teacherDecksReadOnlyHTML(db.decks) === '');
    // aluno não tem API de escrita de Teacher Deck no cliente do aluno
    ctx.CURRENT_USER = { id: S1 };
    L('aluno: createTeacherDeck rejeitado (canCreateTeacherSubdeck exige ser a professora)', (await ctx.createTeacherDeck({ name: 'x', parentDeck: tr1, decks: db.decks })).ok === false);
    L('aluno: moveTeacherDeck/deleteTeacherDeck rejeitados', (await ctx.moveTeacherDeck({ deck: subA.deck, destination: tr1, decks: db.decks })).ok === false && (await ctx.deleteTeacherDeck({ deck: subA.deck, decks: db.decks })).ok === false);
  }
  summary('Fase G -- unit');
})();
