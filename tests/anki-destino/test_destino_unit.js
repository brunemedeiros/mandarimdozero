// Import do Anki para um Deck escolhido (arquitetura seções 5.3/22/23) -- Node/VM.
// planAnkiDeckDestinations / executeAnkiDeckCreations / ankiNoteDeckKey
// (shared/anki-import.js) + createPersonalDeck (shared/deck-data.js) +
// persistAnkiImportBatches com deck_id por Note. Arquivos REAIS via harness da Fase F.
// Rodar: node tests/anki-destino/test_destino_unit.js
const { load, check, summary } = require('../fase-f/harness');
const U = 'u1';

(async () => {
  for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
    console.log('== ' + lang);
    const { ctx, db } = load(appKey, U);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const boot = await ctx.ensureDecksForCurrentUser(appKey);
    const pr = boot.personalRootDeckId;
    const st = (v) => { const s = ctx.createNativeNoteEditorState({ cardGenerationMode: 'normal', languageAppKey: appKey }); ctx.addFieldToEditorState(s, { content: { value: v } }); ctx.addFieldToEditorState(s, { content: { value: v + '-b' } }); return s; };
    const note = (id, path) => ({ ankiNoteId: id, ok: true, deckPath: path, editorState: st('n' + id) });
    const notes = [note(1, ['Vocab', 'Animais']), note(2, ['Vocab', 'Animais']), note(3, ['Vocab', 'Cores']), note(4, ['Verbos']), note(5, [])];

    // sem pastas: tudo no destino, nenhum Deck novo
    let plan = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: pr, notes, keepFolders: false });
    L('sem pastas: nenhuma criação, toda Note no destino', plan.creations.length === 0 && notes.every(n => ctx.ankiNoteDeckKey(n, plan) === ''));

    // com pastas, sem conflito: pai antes do filho
    plan = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: pr, notes, keepFolders: true, conflictMode: null });
    const names = plan.creations.map(c => c.name);
    L('cria Verbos, Vocab, Animais, Cores (pai antes do filho)', plan.conflicts.length === 0 && names.length === 4 && names.indexOf('Vocab') < names.indexOf('Animais') && names.indexOf('Vocab') < names.indexOf('Cores'), names);
    L('Note sem pasta vai para o destino', ctx.ankiNoteDeckKey(notes[4], plan) === '');
    L('Note em Vocab::Animais mapeada para a pasta mais funda', ctx.ankiNoteDeckKey(notes[0], plan) === 'Vocab::Animais');
    L('planejar não grava Deck (preview)', db.decks.length === 2);

    // conflito: já existe "vocab" (case diferente) e "Animais" dentro dele
    db.decks.push({ id: 700, kind: 'personal', owner_id: U, parent_deck_id: pr, language_app_key: appKey, name: 'vocab' });
    db.decks.push({ id: 701, kind: 'personal', owner_id: U, parent_deck_id: 700, language_app_key: appKey, name: 'Animais' });
    db.decks.push({ id: 702, kind: 'personal', owner_id: U, parent_deck_id: pr, language_app_key: appKey, name: 'Vocab (2)' });
    const detect = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: pr, notes, keepFolders: true, conflictMode: null });
    L('detecção (todos os níveis): Vocab e Vocab::Animais', detect.conflicts.map(c => c.key).join('|') === 'Vocab|Vocab::Animais', detect.conflicts);

    const merge = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: pr, notes, keepFolders: true, conflictMode: 'merge' });
    L('merge: Vocab e Animais reaproveitados, só Cores e Verbos criados', merge.targetByKey.get('Vocab').deckId === 700 && merge.targetByKey.get('Vocab::Animais').deckId === 701 && merge.creations.map(c => c.name).sort().join('|') === 'Cores|Verbos', merge.creations);

    const suffix = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: pr, notes, keepFolders: true, conflictMode: 'suffix' });
    const vocabNew = suffix.creations.find(c => c.key === 'Vocab');
    L('sufixo: "Vocab (2)" já existe -> "Vocab (3)"', vocabNew && vocabNew.name === 'Vocab (3)', vocabNew);
    L('sufixo: filhos de um Deck novo nunca conflitam (Animais sem sufixo)', suffix.creations.find(c => c.key === 'Vocab::Animais').name === 'Animais');
    L('nunca um Deck "Importado" global', !suffix.creations.some(c => /importad/i.test(c.name)));

    // execução real com createPersonalDeck
    const exec = await ctx.executeAnkiDeckCreations(suffix, { createFn: ctx.createPersonalDeck, decks: db.decks, languageAppKey: appKey });
    const vocab3 = db.decks.find(d => d.name === 'Vocab (3)');
    const animais = db.decks.find(d => d.name === 'Animais' && vocab3 && d.parent_deck_id === vocab3.id);
    L('execução: Decks pessoais criados com o pai certo', exec.errors.length === 0 && vocab3 && vocab3.kind === 'personal' && vocab3.parent_deck_id === pr && !!animais, exec.errors);

    // persistência: cada Note no Deck da sua pasta
    const entries = notes.map(n => ({ editorState: n.editorState, deckId: exec.idByKey.get(ctx.ankiNoteDeckKey(n, suffix)) }));
    const res = await ctx.persistAnkiImportBatches(entries, { identity: { owner_id: U, language_app_key: appKey, deck_id: pr } });
    L('persistência: deck_id por Note', res.ok && res.createdRows[0].deck_id === animais.id && res.createdRows[3].deck_id === exec.idByKey.get('Verbos') && res.createdRows[4].deck_id === pr, res.createdRows.map(r => r.deck_id));

    // falha ao criar um Deck: ramo inteiro falha, resto segue
    const before = db.decks.length;
    const plan2 = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: pr, notes: [note(10, ['Novo', 'Sub']), note(11, ['Outro'])], keepFolders: true, conflictMode: 'suffix' });
    const flaky = async (args) => args.name === 'Novo' ? { ok: false, error: 'falha simulada' } : ctx.createPersonalDeck(args);
    const ex2 = await ctx.executeAnkiDeckCreations(plan2, { createFn: flaky, decks: db.decks, languageAppKey: appKey });
    L('falha num Deck: ele e os filhos marcados como falhos, irmão criado', ex2.failedKeys.has('Novo') && ex2.failedKeys.has('Novo::Sub') && ex2.idByKey.has('Outro') && ex2.errors.length === 1 && db.decks.length === before + 1, { failed: [...ex2.failedKeys], errs: ex2.errors });
    L('mensagem de falha em português', /Não foi possível criar o Deck "Novo"/.test(ex2.errors[0]));

    // destino em subdeck: pastas recriadas abaixo dele
    const plan3 = ctx.planAnkiDeckDestinations({ decks: db.decks, destDeckId: 700, notes: [note(20, ['Animais'])], keepFolders: true, conflictMode: 'merge' });
    L('destino = subdeck: "Animais" já existe dentro dele -> merge', plan3.targetByKey.get('Animais').deckId === 701 && plan3.creations.length === 0);
  }
  summary('Anki destino -- unit');
})();
