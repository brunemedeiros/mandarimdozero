// Aluno > Revisão só com os cartões da professora com vínculo ATIVO (decisão da autora, 2026-10-15): sem vínculo, os
// cartões somem da aba (e o item Aluno some se não sobrar nada), mas continuam em STATE.cards e no save, então o
// progresso volta junto com o vínculo. Rodar: node tests/banco-revisao/test_active_teacher.js
const vm = require('vm');
const { load, check, summary, read } = require('../fase-h/harness');
const { extractFunction } = require('../fase-e/harness');
const { withCore } = require('../e4/app-source');

for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
  console.log('== ' + lang);
  const { ctx } = load(appKey, 'aluno-1');
  const src = withCore(read(lang + '/app.js'));
  ctx.isCardLessonCompleted = c => c.origin !== 'teacher' || c.flashcardStatus === 'active';
  vm.runInContext('var CLASS_ACTIVE_TEACHER_ID;\n' + ['isClassReviewCard', 'isActiveClassReviewCard', 'classReviewPool'].map(n => extractFunction(src, n)).join('\n'), ctx);
  const tp = read('shared/teacher-panel.js');
  vm.runInContext(extractFunction(tp, 'studentHasClassReviewCards'), ctx);
  const L = (n, c, x) => check(lang + ' ' + n, c, x);
  const mkState = (fields) => { const st = ctx.createNativeNoteEditorState({ cardGenerationMode: 'normal', languageAppKey: appKey }); fields.forEach(f => ctx.addFieldToEditorState(st, f)); return st; };
  const cv = v => ({ content: { value: v } });
  const row = (id, teacher) => Object.assign(ctx.noteEditorStateToRow(mkState([cv('pão'), cv('pain')]), { id }), { status: 'active', teacher_id: teacher, student_id: 'aluno-1' });
  const build = r => ctx.buildEngineCardsFromRow(r, { origin: 'teacher', appKey, idPrefix: 't' });

  const a = build(row(601, 'prof-A'))[0], b = build(row(602, 'prof-B'))[0];
  L('cartão da professora sabe de quem é (teacherId)', a.teacherId === 'prof-A' && b.teacherId === 'prof-B', [a.teacherId, b.teacherId]);
  ctx.STATE.cards = [a, b];
  const ids = () => JSON.stringify(ctx.classReviewPool().map(c => c.id));

  vm.runInContext('CLASS_ACTIVE_TEACHER_ID = undefined', ctx);
  L('vínculo ainda desconhecido (offline / antes do boot): não esconde nada', ctx.classReviewPool().length === 2, ids());
  vm.runInContext('CLASS_ACTIVE_TEACHER_ID = "prof-A"', ctx);
  L('com vínculo ativo com a professora A: só os cartões dela', ids() === JSON.stringify([a.id]), ids());
  L('item Aluno aparece por causa deles', ctx.studentHasClassReviewCards() === true);
  vm.runInContext('CLASS_ACTIVE_TEACHER_ID = null', ctx);
  L('sem vínculo: a aba Aluno > Revisão fica vazia', ctx.classReviewPool().length === 0, ids());
  L('sem vínculo: os cartões não seguram o item Aluno', ctx.studentHasClassReviewCards() === false);
  L('sem vínculo: os cartões CONTINUAM em STATE.cards (o progresso não se perde no próximo salvamento)', ctx.STATE.cards.length === 2);

  // progresso volta com o vínculo: o save guarda o cartão inteiro e o merge devolve o FSRS
  a.reps = 4; a.interval = 12; a.stability = 20;
  const saved = JSON.parse(JSON.stringify(ctx.serializeCardsForSave([a])));
  const fresh = build(row(601, 'prof-A'))[0];
  const cards = [fresh]; ctx.mergeSavedCards(cards, saved);
  L('vínculo de volta: mesmo cartão com o progresso salvo', cards[0].reps === 4 && cards[0].interval === 12 && cards[0].teacherId === 'prof-A', [cards[0].reps, cards[0].teacherId]);
  const moved = build(Object.assign(row(601, 'prof-A'), { teacher_id: 'prof-C' }))[0];
  const c2 = [moved]; ctx.mergeSavedCards(c2, saved);
  L('teacherId vem sempre do banco (não do save)', c2[0].teacherId === 'prof-C', c2[0].teacherId);
}
summary();
