// Fase F -- Node/VM: Add Card + Deck + limite por CardInstance.
// Rodar: node tests/fase-f/test_add_card_unit.js
const { load, check, summary } = require('./harness');
const U1 = 'user-1', U2 = 'user-2';

const mk = (ctx, mode, fields, extra) => {
  const st = ctx.createNativeNoteEditorState(Object.assign({ cardGenerationMode: mode, languageAppKey: ctx.APP_KEY }, extra || {}));
  fields.forEach(f => ctx.addFieldToEditorState(st, f));
  return st;
};
const cv = (o) => ({ content: { value: o } });

(async () => {
  for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
    console.log('== ' + lang);
    const { ctx, db } = load(appKey, U1);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);

    // ---- regra canônica de limite ----
    const normal = mk(ctx, 'normal', [cv('a'), cv('b')]);
    const rev = mk(ctx, 'normal_reversed', [cv('a'), cv('b')]);
    const cloze3 = mk(ctx, 'cloze', [cv('{{c1::x}} {{c2::y}} {{c3::z}}'), cv('trad')]);
    const ta = mk(ctx, 'type_answer', [cv('p'), cv('r')]);
    const mc = mk(ctx, 'multiple_choice', [{ role: 'prompt', content: { value: 'q' } }, { role: 'answer', content: { value: 'ok' } }, { role: 'distractor', content: { value: 'x' } }]);
    const cnt = s => ctx.cardInstanceCountForEditorState(s, appKey);
    L('Normal = 1', cnt(normal) === 1, cnt(normal));
    L('Normal com reverso = 2', cnt(rev) === 2, cnt(rev));
    L('Cloze com 3 lacunas = 3', cnt(cloze3) === 3, cnt(cloze3));
    L('Type Answer = 1', cnt(ta) === 1);
    L('Multiple Choice = 1', cnt(mc) === 1);

    // uso = CardInstances de linhas ativas persistidas (arquivadas não contam; legacy = 1)
    const rows = [
      Object.assign(ctx.noteEditorStateToRow(rev), { id: 1, status: 'active', language_app_key: appKey }),
      Object.assign(ctx.noteEditorStateToRow(cloze3), { id: 2, status: 'active', language_app_key: appKey }),
      { id: 3, status: 'active', front: 'x', back_trans: 'y', language_app_key: appKey },
      Object.assign(ctx.noteEditorStateToRow(rev), { id: 4, status: 'archived', language_app_key: appKey }),
    ];
    L('uso = 2 + 3 + 1 (arquivado não conta)', ctx.ownCardInstanceUsage(rows) === 6, ctx.ownCardInstanceUsage(rows));

    // preflight
    const pf = (activeRows, states, link) => ctx.preflightOwnCardInstanceCreation({ activeRows, hasTeacherLink: !!link, editorStates: states, languageAppKey: appKey, limit: 20 });
    const full19 = Array.from({ length: 19 }, (_, i) => ({ id: i, status: 'active', front: 'a', back_trans: 'b', language_app_key: appKey }));
    L('19 usados + Normal(1) = ok', pf(full19, [normal]).ok === true);
    L('19 usados + reverso(2) = bloqueia por CardInstance', pf(full19, [rev]).ok === false && pf(full19, [rev]).requested === 2 && pf(full19, [rev]).remaining === 1, pf(full19, [rev]));
    L('19 usados + cloze3 = bloqueia', pf(full19, [cloze3]).ok === false);
    L('vínculo com professora isenta do teto', pf(full19, [cloze3, rev], true).ok === true && pf(full19, [cloze3], true).remaining === Infinity);
    L('lote (import): 2 Normal + 1 reverso = 4 vs restam 3', pf(Array.from({ length: 17 }, (_, i) => ({ id: i, status: 'active', front: 'a', back_trans: 'b', language_app_key: appKey })), [normal, normal, rev]).ok === false);

    // ---- criação: Deck padrão = personal_root, Deck no MESMO insert ----
    let r = await ctx.createOwnFlashcard({ languageAppKey: appKey, nativeState: normal });
    const pr = db.decks.find(d => d.kind === 'personal_root');
    L('criação sem deckId -> personal_root (nunca NULL)', r.ok && r.card.deck_id === pr.id && pr != null, r);
    L('linha nativa (fields+mode), sem colunas legadas de tipo', r.card.card_generation_mode === 'normal' && Array.isArray(r.card.fields) && r.card.choices === null && r.card.cloze_sentence === null);
    L('bootstrap idempotente (1 root, 1 personal_root)', db.decks.filter(d => d.kind === 'root').length === 1 && db.decks.filter(d => d.kind === 'personal_root').length === 1);

    // subdeck pessoal
    const subDeck = { id: 900, kind: 'personal', owner_id: U1, parent_deck_id: pr.id, language_app_key: appKey, name: 'Verbos' };
    db.decks.push(subDeck);
    r = await ctx.createOwnFlashcard({ languageAppKey: appKey, nativeState: rev, deckId: 900, decks: db.decks });
    L('criação em subdeck pessoal', r.ok && r.card.deck_id === 900);
    // 1 linha + 2 CardInstances irmãos compartilham o Deck
    const built = ctx.buildEngineCardsFromRow(r.card, { origin: 'self', appKey, idPrefix: 's' });
    L('Normal com reverso: 2 CardInstances, mesmo deckId, ids distintos, FSRS independente',
      built.length === 2 && built[0].deckId === 900 && built[1].deckId === 900 && built[0].id !== built[1].id && built[0] !== built[1] && built[0].due !== undefined);
    r = await ctx.createOwnFlashcard({ languageAppKey: appKey, nativeState: cloze3, deckId: 900, decks: db.decks });
    const clz = ctx.buildEngineCardsFromRow(r.card, { origin: 'self', appKey, idPrefix: 's' });
    L('Cloze 3 lacunas: 3 CardInstances no mesmo Deck, ids únicos', clz.length === 3 && clz.every(c => c.deckId === 900) && new Set(clz.map(c => c.id)).size === 3);
    for (const [n, st] of [['Type Answer', ta], ['Multiple Choice', mc]]){
      r = await ctx.createOwnFlashcard({ languageAppKey: appKey, nativeState: st, deckId: 900, decks: db.decks });
      const b = ctx.buildEngineCardsFromRow(r.card, { origin: 'self', appKey, idPrefix: 's' });
      L(n + ': 1 CardInstance no Deck', r.ok && b.length === 1 && b[0].deckId === 900);
    }

    // ---- destinos proibidos (nada é gravado) ----
    const before = db.own_flashcards.length;
    db.decks.push({ id: 901, kind: 'course', owner_id: null, parent_deck_id: null, language_app_key: appKey, name: 'curso' });
    db.decks.push({ id: 902, kind: 'teacher', owner_id: U1, teacher_id: 't', parent_deck_id: null, language_app_key: appKey, name: 'prof' });
    db.decks.push({ id: 903, kind: 'personal', owner_id: U2, parent_deck_id: null, language_app_key: appKey, name: 'alheio' });
    db.decks.push({ id: 904, kind: 'personal', owner_id: U1, parent_deck_id: pr.id, language_app_key: appKey === 'frances' ? 'mandarim' : 'frances', name: 'outro idioma' });
    for (const [n, id] of [['Course Deck', 901], ['Teacher Deck', 902], ['Deck de outro usuário', 903], ['Deck de outro idioma', 904], ['Deck inexistente', 99999]]){
      r = await ctx.createOwnFlashcard({ languageAppKey: appKey, nativeState: normal, deckId: id, decks: db.decks });
      L('destino proibido rejeitado: ' + n, r.ok === false);
    }
    L('nenhuma linha criada pelas tentativas proibidas', db.own_flashcards.length === before);

    // ---- atomicidade: falha de insert não deixa nada e não consome limite ----
    db.failNextInsert = true;
    const n0 = db.own_flashcards.length;
    const u0 = ctx.ownCardInstanceUsage(db.own_flashcards);
    r = await ctx.createOwnFlashcard({ languageAppKey: appKey, nativeState: rev, deckId: 900, decks: db.decks });
    L('insert falho: ok=false, nenhuma linha', r.ok === false && db.own_flashcards.length === n0);
    L('uso não muda após falha', ctx.ownCardInstanceUsage(db.own_flashcards) === u0);

    // ---- Review encontra pelo Deck Engine, sem fila paralela ----
    const persisted = db.own_flashcards.filter(x => x.deck_id === 900);
    const cards = [];
    db.own_flashcards.forEach(row => ctx.buildEngineCardsFromRow(row, { origin: 'self', appKey, idPrefix: 's' }).forEach(c => cards.push(c)));
    const scope = ctx.getStudyScopeForDeck(db.decks, 900, cards);
    const expected = persisted.reduce((s, row) => s + ctx.cardInstanceCountForRow(row), 0);
    L('escopo do subdeck = todos os CardInstances persistidos nele', scope.length === expected && scope.length > 0, { scope: scope.length, expected });
    const rootScope = ctx.getStudyScopeForDeck(db.decks, pr.id, cards);
    L('escopo do personal_root inclui subdeck (descendentes)', rootScope.length === cards.length, { rootScope: rootScope.length, all: cards.length });
    const counts = ctx.getDeckCounts(db.decks, 900, cards);
    L('contagem New via Deck Engine (nada estudado ainda)', counts.new === scope.length, counts);

    // ---- import Anki: mesmo Deck padrão + mesma regra por CardInstance ----
    const ankiEntries = [{ editorState: rev }, { editorState: cloze3 }, { editorState: normal }];
    const ankiPre = ctx.preflightOwnCardInstanceCreation({ activeRows: [], hasTeacherLink: false, editorStates: ankiEntries.map(e => e.editorState), languageAppKey: appKey, limit: 20 });
    L('Anki: lote (reverso 2 + cloze 3 + normal 1) = 6 CardInstances pela regra canônica', ankiPre.requested === 6 && ankiPre.ok, ankiPre);
    const dest = await ctx.resolveOwnCreationDeck({ languageAppKey: appKey });
    const ankiRes = await ctx.persistAnkiImportBatches(ankiEntries, { identity: { owner_id: U1, language_app_key: appKey, deck_id: dest.deckId } });
    L('Anki: todas as linhas criadas no Deck padrão (personal_root), nativas', ankiRes.ok && ankiRes.createdRows.length === 3 && ankiRes.createdRows.every(x => x.deck_id === pr.id && x.fields && x.card_generation_mode), ankiRes.createdRows && ankiRes.createdRows.map(x => x.deck_id));
    L('Anki: computeAnkiImportRemainingSlots removida (regra única)', typeof ctx.computeAnkiImportRemainingSlots === 'undefined');

    // ---- legado NULL permanece fora de escopo (sem backfill) ----
    const legacy = { id: 5000, status: 'active', front: 'l', back_trans: 'l', language_app_key: appKey, owner_id: U1, deck_id: null };
    const lc = ctx.buildEngineCardsFromRow(legacy, { origin: 'self', appKey, idPrefix: 's' });
    L('linha antiga (deck_id NULL) fica fora de qualquer Deck', ctx.getStudyScopeForDeck(db.decks, pr.id, lc).length === 0 && lc[0].deckId === null);
  }
  summary('Fase F -- unit');
})();
