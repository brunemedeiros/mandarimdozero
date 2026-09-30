// Fase H -- Node/VM: experiência de Teacher Decks (professora e aluno).
// Rodar: node tests/fase-h/test_teacher_experience_unit.js
const { load, check, summary, read } = require('./harness');
const T = 'teacher-1', T2 = 'teacher-2', S1 = 'student-1', S2 = 'student-2', S3 = 'student-3';
const cv = o => ({ content: { value: o } });
const mk = (ctx, mode, fields) => { const st = ctx.createNativeNoteEditorState({ cardGenerationMode: mode, languageAppKey: ctx.APP_KEY }); fields.forEach(f => ctx.addFieldToEditorState(st, f)); return st; };
const cardsOf = (ctx, rows) => rows.flatMap(r => ctx.buildEngineCardsFromRow(r, { origin: 'teacher', appKey: ctx.APP_KEY, idPrefix: 't' }));

(async () => {
  for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
    console.log('== ' + lang);
    const { ctx, db } = load(appKey, T);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const other = appKey === 'frances' ? 'mandarim' : 'frances';
    db.teacher_students.push(
      { teacher_id: T, student_id: S1, language_app_key: appKey, status: 'active', username: 'a1' },
      { teacher_id: T, student_id: S1, language_app_key: other, status: 'active', username: 'a1' },
      { teacher_id: T, student_id: S2, language_app_key: appKey, status: 'active', username: 'a2' },
      { teacher_id: T, student_id: S3, language_app_key: appKey, status: 'removed', username: 'a3' });

    // ---- H8: seleção efetiva por aluno + idioma; destino por aluno+idioma ----
    const S = require('vm').runInContext('ADMIN_FLASHCARDS_STATE', ctx);
    const cache = db.teacher_students.filter(x => x.status === 'active');
    S._studentsCache = cache;
    S.studentIds = new Set([S1]);
    S.langFilter = appKey;
    const sel = ctx.adminSelectedStudents(S._studentsCache);
    L('H8 aluno em 2 idiomas: só a linha do idioma ativo é selecionada', sel.length === 1 && sel[0].language_app_key === appKey, sel);
    S.langFilter = other;
    const sel2 = ctx.adminSelectedStudents(S._studentsCache);
    L('H8 trocar o idioma troca a linha efetiva (nunca as duas)', sel2.length === 1 && sel2[0].language_app_key === other);
    S.studentIds = new Set([S1, S2]); S.langFilter = appKey;
    L('H8 aluno sem vínculo no idioma ativo não entra na seleção efetiva', ctx.adminSelectedStudents(S._studentsCache).every(x => x.language_app_key === appKey) && ctx.adminSelectedStudents(S._studentsCache).length === 2);
    L('H8 chave de destino inclui o idioma', ctx.adminDestKey({ student_id: S1, language_app_key: appKey }) !== ctx.adminDestKey({ student_id: S1, language_app_key: other }));
    // um único idioma presente: sem filtro extra
    S._studentsCache = cache.filter(x => x.language_app_key === appKey);
    S.studentIds = new Set([S1, S2]);
    L('H8 um idioma só: seleção = ids marcados', ctx.adminSelectedStudents(S._studentsCache).length === 2);

    // ---- H1/H2: árvore, subdeck ----
    const b1 = await ctx.ensureTeacherDecksForStudent(S1, appKey);
    const b2 = await ctx.ensureTeacherDecksForStudent(S2, appKey);
    const root1 = db.decks.find(d => d.id === b1.teacherRootDeckId), root2 = db.decks.find(d => d.id === b2.teacherRootDeckId);
    const sub = await ctx.createTeacherDeck({ name: '  Aulas  ', parentDeck: root1, decks: db.decks });
    L('H2 subdeck: nome aparado, kind teacher, herdado aluno/professora/idioma', sub.ok && sub.deck.name === 'Aulas' && sub.deck.kind === 'teacher' && sub.deck.owner_id === S1 && sub.deck.teacher_id === T && sub.deck.language_app_key === appKey);
    L('H2 nome longo (>60) rejeitado', (await ctx.createTeacherDeck({ name: 'x'.repeat(61), parentDeck: root1, decks: db.decks })).ok === false);
    L('H2 aluno sem vínculo ativo (removed): bootstrap rejeitado, nenhum Deck criado', (await ctx.ensureTeacherDecksForStudent(S3, appKey)).ok === false && !db.decks.some(d => d.owner_id === S3));
    const subChild = await ctx.createTeacherDeck({ name: 'Verbos', parentDeck: sub.deck, decks: db.decks });
    L('H2 subdeck de subdeck', subChild.ok && subChild.deck.parent_deck_id === sub.deck.id);

    // ---- H3: mover Note (Note-level) ----
    const rev = mk(ctx, 'normal_reversed', [cv('a'), cv('b')]);
    const cz = mk(ctx, 'cloze', [cv('{{c1::x}} {{c2::y}} {{c3::z}}'), cv('t')]);
    const nrm = mk(ctx, 'normal', [cv('a'), cv('b')]);
    const rows = {};
    for (const [n, st] of [['rev', rev], ['cz', cz], ['nrm', nrm]]) rows[n] = (await ctx.createFlashcard({ studentId: S1, languageAppKey: appKey, nativeState: st, deckId: root1.id })).card;
    const snap = JSON.stringify({ ...rows.rev, deck_id: null });
    const bsib = cardsOf(ctx, [rows.rev]).map(c => c.id);
    const mvRes = await ctx.setTeacherFlashcardDeck({ note: rows.rev, destination: sub.deck, decks: db.decks });
    const after = db.teacher_flashcards.find(r => r.id === rows.rev.id);
    L('H3 mover Note: só deck_id muda (id/revision/fields/mode intactos)', mvRes.ok && after.deck_id === sub.deck.id && JSON.stringify({ ...after, deck_id: null }) === snap);
    const sibs = cardsOf(ctx, [after]);
    L('H3 Normal com reverso: 2 irmãos continuam juntos no MESMO Deck, ids iguais aos de antes', sibs.length === 2 && sibs.every(c => c.deckId === sub.deck.id) && sibs.map(c => c.id).join() === bsib.join());
    const czMv = await ctx.setTeacherFlashcardDeck({ note: rows.cz, destination: subChild.deck, decks: db.decks });
    const czCards = cardsOf(ctx, [db.teacher_flashcards.find(r => r.id === rows.cz.id)]);
    L('H3 Cloze 3 marcas: todos os cN no mesmo Deck', czMv.ok && czCards.length === 3 && czCards.every(c => c.deckId === subChild.deck.id));
    L('H3 Normal = 1 CardInstance', cardsOf(ctx, [rows.nrm]).length === 1);
    for (const [n, dst] of [['Deck de outro aluno', root2], ['Personal', { id: 900, kind: 'personal_root', owner_id: S1, language_app_key: appKey }], ['Course', { id: 901, kind: 'course', owner_id: null, language_app_key: appKey }], ['Deck de outra professora', { id: 902, kind: 'teacher_root', owner_id: S1, teacher_id: T2, language_app_key: appKey }], ['outro idioma', { id: 903, kind: 'teacher_root', owner_id: S1, teacher_id: T, language_app_key: other }]]){
      L('H3 mover Note p/ ' + n + ' rejeitado', (await ctx.setTeacherFlashcardDeck({ note: rows.nrm, destination: dst, decks: db.decks })).ok === false && db.teacher_flashcards.find(r => r.id === rows.nrm.id).deck_id === root1.id);
    }
    ctx.CURRENT_USER = { id: T2 };
    L('H3 outra professora não move a Note da professora A', (await ctx.setTeacherFlashcardDeck({ note: rows.nrm, destination: sub.deck, decks: db.decks })).ok === false);
    ctx.CURRENT_USER = { id: T };

    // ---- edição da Note não perde deck_id ----
    const upd = await ctx.updateFlashcardContent(rows.nrm.id, { nativeState: mk(ctx, 'normal', [cv('novo'), cv('b2')]), revision: 1 });
    L('H1 editar a Note mantém o deck_id', db.teacher_flashcards.find(r => r.id === rows.nrm.id).deck_id === root1.id, upd);

    // ---- H4: exclusão ----
    L('H4 teacher_root nunca deletável', (await ctx.deleteTeacherDeck({ deck: root1, decks: db.decks })).ok === false);
    const dChild = await ctx.deleteTeacherDeck({ deck: sub.deck, decks: db.decks });
    L('H4 teacher com filhos: rejeitado, com mensagem', dChild.ok === false && dChild.reason === 'has_children' && /subdecks/.test(dChild.error));
    const dNotes = await ctx.deleteTeacherDeck({ deck: subChild.deck, decks: db.decks });
    L('H4 teacher com Teacher Cards: rejeitado, com mensagem', dNotes.ok === false && dNotes.reason === 'has_notes' && /cartões/.test(dNotes.error));
    L('H4 nada foi apagado nem virou NULL', db.decks.some(d => d.id === sub.deck.id) && db.teacher_flashcards.filter(r => r.deck_id == null).length === 0);
    const empty = await ctx.createTeacherDeck({ name: 'Vazio', parentDeck: root1, decks: db.decks });
    L('H4 teacher vazio: deletável', (await ctx.deleteTeacherDeck({ deck: empty.deck, decks: db.decks })).ok === true && !db.decks.some(d => d.id === empty.deck.id));

    // ---- H5/H10: aluno ----
    const all = cardsOf(ctx, db.teacher_flashcards.filter(r => r.student_id === S1));
    ctx.CURRENT_USER = { id: S1 };
    ctx.STATE.cards = all;
    ctx.eligibleReviewPool = () => all;
    const html = ctx.teacherDecksReadOnlyHTML(db.decks);
    L('H5 aluno vê a árvore com contagens New/Aprendendo/Revisar', /novos/.test(html) && /aprendendo/.test(html) && /para revisar/.test(html) && html.includes('data-study-deck'));
    L('H5 aluno: HTML sem controles de escrita', !/data-dest|data-move|data-tree-delete|<select|<input|Apagar|Excluir|Renomear|Mover/.test(html));
    const cRoot = ctx.getDeckCounts(db.decks, root1.id, all);
    L('H10 contagem do teacher_root = CardInstances da subárvore (não Notes)', cRoot.new === all.length && all.length > db.teacher_flashcards.filter(r => r.student_id === S1).length, cRoot);
    L('H5 aluno vê só a árvore dele', ctx.teacherReceivedDecks(db.decks).every(d => d.owner_id === S1));
    L('H5 aluno não cria/move/apaga Teacher Deck', (await ctx.createTeacherDeck({ name: 'x', parentDeck: root1, decks: db.decks })).ok === false && (await ctx.moveTeacherDeck({ deck: sub.deck, destination: root1, decks: db.decks })).ok === false && (await ctx.deleteTeacherDeck({ deck: sub.deck, decks: db.decks })).ok === false && (await ctx.setTeacherFlashcardDeck({ note: rows.nrm, destination: sub.deck, decks: db.decks })).ok === false);
    ctx.CURRENT_USER = { id: T };

    // ---- H11: históricos ----
    const legacy = Array.from({ length: 5 }, (_, i) => ({ id: 50 + i, teacher_id: T, student_id: S1, language_app_key: appKey, status: 'active', front: 'l' + i, back_trans: 'b', deck_id: null }));
    const lc = cardsOf(ctx, legacy);
    L('H11 históricos: deckId null, fora de qualquer escopo, linhas intactas', lc.every(c => c.deckId === null) && ctx.getStudyScopeForDeck(db.decks, root1.id, lc).length === 0 && legacy.every(r => r.deck_id === null));

    // ---- H9: duas professoras, mesmo aluno/idioma ----
    const ctxB = load(appKey, T2, db);
    ctxB.db.teacher_students.push({ teacher_id: T2, student_id: S1, language_app_key: appKey, status: 'active' });
    const bB = await ctxB.ctx.ensureTeacherDecksForStudent(S1, appKey);
    L('H9 professora B tem a SUA raiz, distinta da de A', bB.ok && bB.teacherRootDeckId !== root1.id && ctxB.db.decks.find(d => d.id === bB.teacherRootDeckId).teacher_id === T2);
    const treeB = ctxB.ctx.getTeacherDecksForStudent(db.decks, { teacherId: T2, studentId: S1, languageAppKey: appKey });
    L('H9 árvore de B não contém decks de A (e vice-versa)', treeB.every(d => d.teacher_id === T2) && ctx.getTeacherDecksForStudent(db.decks, { teacherId: T, studentId: S1, languageAppKey: appKey }).every(d => d.teacher_id === T));
    L('H9 B não usa a árvore de A como destino', (await ctxB.ctx.resolveTeacherCreationDeck({ studentId: S1, languageAppKey: appKey, deckId: root1.id, decks: db.decks })).ok === false);
    L('H9 mesmos nomes de raiz não quebram nada (ids distintos)', root1.name === db.decks.find(d => d.id === bB.teacherRootDeckId).name && root1.id !== bB.teacherRootDeckId);
    ctx.CURRENT_USER = { id: S1 };
    L('H9 aluno enxerga as duas árvores', ctx.teacherReceivedDecks(db.decks).filter(d => d.kind === 'teacher_root').length === 2);
    ctx.CURRENT_USER = { id: T };

    // ---- H7: multi-aluno, decks nunca compartilhados ----
    const results = await Promise.all([S1, S2].map(async sid => {
      const d = await ctx.resolveTeacherCreationDeck({ studentId: sid, languageAppKey: appKey });
      return ctx.createFlashcard({ studentId: sid, languageAppKey: appKey, nativeState: nrm, deckId: d.deckId });
    }));
    L('H7 2 alunos: 2 linhas, decks diferentes e de cada aluno', results.every(r => r.ok) && results[0].card.deck_id !== results[1].card.deck_id && results[1].card.deck_id === root2.id && results[0].card.deck_id === root1.id);

    // ---- código: sem regressão de escopo ----
    for (const f of ['fr/app.js', 'zh/app.js']) L('escopo: ' + f + ' sem menção nova a Teacher Deck da Fase H', !/adminSelectedStudents|fillTeacherTreeLists/.test(read(f)));
  }
  summary('Fase H -- unit');
})();
