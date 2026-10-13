// Banco de Revisão -- o progresso salvo do aluno vence o dado novo do banco?
// Rodar: node tests/banco-revisao/test_merge_saved_cards.js
const { load, check, summary } = require('../fase-h/harness');

for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
  console.log('== ' + lang);
  const { ctx } = load(appKey, 'student-1');
  const L = (n, c, x) => check(lang + ' ' + n, c, x);
  const mkState = (mode, fields) => { const st = ctx.createNativeNoteEditorState({ cardGenerationMode: mode, languageAppKey: appKey }); fields.forEach(f => ctx.addFieldToEditorState(st, f)); return st; };
  const cv = v => ({ content: { value: v } });
  const base = ctx.noteEditorStateToRow(mkState('normal', [cv('escolher'), cv('choisir')]), { id: 500 });
  const build = row => ctx.buildEngineCardsFromRow(row, { origin: 'teacher', appKey, idPrefix: 't' });

  // 1) cartão entregue e estudado: o save do aluno guarda o card inteiro (como serializeCardsForSave faz)
  const delivered = build(Object.assign({}, base, { status: 'active', note: 'obs antiga', tags: ['a'] }))[0];
  delivered.reps = 3; delivered.interval = 9; delivered.stability = 12.5;
  const saved = JSON.parse(JSON.stringify(ctx.serializeCardsForSave([delivered])));

  // 2) a professora arquiva / muda a observação / as tags, SEM mudar o conteúdo (mesmo id)
  const fresh = build(Object.assign({}, base, { status: 'archived', note: 'obs nova', tags: ['a', 'b'] }))[0];
  L('mesmo id depois de mudar só status/observação/tags', fresh.id === delivered.id, [fresh.id, delivered.id]);
  const cards = [fresh];
  ctx.mergeSavedCards(cards, saved);
  const m = cards[0];
  L('progresso FSRS preservado (esperado)', m.reps === 3 && m.interval === 9, m.reps);
  L('ARQUIVAR chega ao aluno', m.flashcardStatus === 'archived', 'flashcardStatus=' + m.flashcardStatus);
  L('OBSERVAÇÃO nova chega ao aluno', m.teacherNote === 'obs nova' && m.note.note === 'obs nova', 'teacherNote=' + m.teacherNote);
  L('TAGS novas chegam ao aluno', JSON.stringify(m.tags) === '["a","b"]', JSON.stringify(m.tags));
}
summary();
