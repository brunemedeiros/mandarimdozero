// K2-F hardening — Anki: CardInstance invertido de Teacher/Self usa o modelo Reverso.
// Node/VM, código real.  Rodar: node tests/k2f/test_anki_teacher_self_reverse.js
const { loadLang, read, extractFunction, check, summary } = require('../fase-e/harness');
const vm = require('vm');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang), isZh = lang === 'zh', appKey = ctx.APP_KEY;
  const run = c => vm.runInContext(c, ctx);
  const src = read(lang + '/app.js');
  ['hasPlainFrontBack', 'cardPromptText', 'cardAnswerText'].forEach(f => run(extractFunction(src, f)));
  if (isZh){ run(extractFunction(src, 'cardPromptPinyinText')); run(extractFunction(src, 'zhTypeAnswerExportColumns')); }
  else run('this.cardPromptPinyinText = function(){ return ""; };');
  ctx.APP_IDENTITY = new Proxy({}, { get: () => new Proxy({}, { get: () => ({ name: 'App' }) }) });
  ctx.unitOrdinalInfo = () => ({ num: 1 }); ctx.unitsOfLevel = () => [];
  run(read('shared/anki-export.js'));
  const a = src.indexOf('const ANKI_EXPORT_CONFIG = {'), b = src.indexOf('\n};', a) + 3;
  run(src.slice(a, b).replace('const ANKI_EXPORT_CONFIG', 'this.ANKI_EXPORT_CONFIG'));
  const cfg = ctx.ANKI_EXPORT_CONFIG;
  const T = isZh ? 'zh' : 'fr', ST = isZh ? '你好' : 'bonjour', PY = 'nǐ hǎo', TR = isZh ? 'olá' : 'bom dia';
  const fld = (id, l, v, extra) => Object.assign({ id, lang: l, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null }, extra || {});
  const nativeFields = () => isZh
    ? [fld('h', 'zh', ST, { pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', PY), fld('t', 'pt-BR', TR)]
    : [fld('s', 'fr', ST), fld('t', 'pt-BR', TR)];
  const build = (origin, row) => ctx.buildEngineCardsFromRow(row, { origin, appKey, idPrefix: origin === 'teacher' ? 't' : 's' });
  const prefix = isZh ? 'zh' : 'fr';

  for (const origin of ['teacher', 'self']){
    const O = lang + ' ' + origin;
    // --- normal: modelo Básico
    const normal = build(origin, { id: 10, language_app_key: appKey, fields: nativeFields(), card_generation_mode: 'normal', status: 'active', revision: 0 })[0];
    check(O + ' normal → Básico', ctx.ankiExportCardKind(normal) === 'basic');
    const nf = cfg.noteFields(normal, null);
    check(O + ' normal: frente = idioma estudado, verso = tradução, sem troca', isZh ? (nf[0] === PY && nf[1] === ST && nf[2] === TR) : (nf[0] === ST && nf[1] === TR), nf);

    // --- normal_reversed: A básico, B reverso, campos semânticos iguais
    const pair = build(origin, { id: 11, language_app_key: appKey, fields: nativeFields(), card_generation_mode: 'normal_reversed', status: 'active', revision: 0 });
    const [A, B] = pair;
    check(O + ' reverso: 2 CardInstances independentes, ids distintos', pair.length === 2 && A.id !== B.id);
    check(O + ' reverso: A → Básico, B → Reverso', ctx.ankiExportCardKind(A) === 'basic' && ctx.ankiExportCardKind(B) === 'reverse');
    const fa = cfg.noteFields(A, null), fb = cfg.reverseFields(B, null);
    check(O + ' reverso: campos semânticos de B = campos de A (só o template inverte)', JSON.stringify(fa) === JSON.stringify(fb), [fa, fb]);
    check(O + ' reverso: nenhum campo vazio/trocado', fb.every(x => x && x.length) && fb.includes(TR) && fb.includes(ST) && (!isZh || fb.includes(PY)), fb);
    check(O + ' reverso: GUID distinto', cfg.guidPrefix + A.id !== cfg.guidPrefix + B.id);
    check(O + ' reverso: sortField de B = lado estudado (não a tradução)', cfg.sortField(B) === (isZh ? PY : ST), cfg.sortField(B));
    check(O + ' reverso: A e B não agrupados (2 notas)', pair.map(c => c.id).length === 2 && new Set(pair.map(c => cfg.guidPrefix + c.id)).size === 2);

    // --- legado invertido por idioma do Field (front = tradução)
    if (!isZh){
      const leg = build(origin, { id: 12, language_app_key: appKey, front: TR, back_trans: ST, front_is_target_language: false, status: 'active', revision: 0 })[0];
      check(O + ' legado invertido (front=tradução) → Reverso, campos corretos', ctx.ankiExportCardKind(leg) === 'reverse' && cfg.reverseFields(leg, null)[0] === ST && cfg.reverseFields(leg, null)[1] === TR, cfg.reverseFields(leg, null));
      const legN = build(origin, { id: 13, language_app_key: appKey, front: ST, back_trans: TR, front_is_target_language: true, status: 'active', revision: 0 })[0];
      check(O + ' legado normal → Básico', ctx.ankiExportCardKind(legN) === 'basic');
    }

    // --- Múltipla escolha invertida (prompt = tradução)
    const mcFields = isZh
      ? [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', 'zh', ST, { role: 'answer', pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', PY), fld('d', 'zh', '再见', { role: 'distractor' })]
      : [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', 'fr', ST, { role: 'answer' }), fld('d', 'fr', 'au revoir', { role: 'distractor' })];
    const mc = build(origin, { id: 14, language_app_key: appKey, fields: mcFields, card_generation_mode: 'multiple_choice', status: 'active', revision: 0 })[0];
    check(O + ' MC invertida → Reverso, campos corretos', ctx.ankiExportCardKind(mc) === 'reverse' && cfg.reverseFields(mc, null).includes(ST) && cfg.reverseFields(mc, null).includes(TR) && (!isZh || cfg.reverseFields(mc, null)[0] === PY), cfg.reverseFields(mc, null));

    // --- Digite a resposta invertida
    const taFields = isZh
      ? [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', 'zh', ST, { role: 'answer', pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', PY)]
      : [fld('q', 'pt-BR', TR, { role: 'prompt' }), fld('a', 'fr', ST, { role: 'answer' })];
    const ta = build(origin, { id: 15, language_app_key: appKey, fields: taFields, card_generation_mode: 'type_answer', status: 'active', revision: 0 })[0];
    const tf = cfg.reverseFields(ta, null);
    check(O + ' type_answer invertido → Reverso, frente não vazia', ctx.ankiExportCardKind(ta) === 'reverse' && tf.every(x => x && x.length) && tf.includes(ST) && tf.includes(TR), tf);

    // --- Cloze inalterado
    const clozeFields = isZh ? [fld('c', 'zh', '我{{c1::是|shì}}学生{{c2::。|jù}}'), fld('t', 'pt-BR', 'eu sou aluno')] : [fld('c', 'fr', 'Je {{c1::suis}} étudiant {{c2::ici}}'), fld('t', 'pt-BR', 'eu sou aluno')];
    const cl = build(origin, { id: 16, language_app_key: appKey, fields: clozeFields, card_generation_mode: 'cloze', status: 'active', revision: 0 });
    check(O + ' Cloze: cada marca = CardInstance, todos → cloze (nunca Reverso/Básico)', cl.length === 2 && cl.every(c => ctx.ankiExportCardKind(c) === 'cloze'));

    // --- somente leitura
    const snap = JSON.stringify(pair.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state]));
    cfg.reverseFields(B, null); cfg.noteFields(A, null); cfg.sortField(B); ctx.ankiExportCardKind(B);
    check(O + ' export é somente leitura (FSRS intacto)', snap === JSON.stringify(pair.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state])));
  }

  // --- Study Trail inalterado
  const cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const sA = cards.find(c => c.id.endsWith('-v0') && !c.id.endsWith('-b')), sB = cards.find(c => c.id === sA.id + '-b');
  check(lang + ' Study: A → Básico, B → Reverso (inalterado)', ctx.ankiExportCardKind(sA) === 'basic' && ctx.ankiExportCardKind(sB) === 'reverse');
  check(lang + ' Study: trilha sem cardInstance/sem lang nunca vira Reverso por engano', cards.every(c => !(c.origin === 'study' && c.cardInstance && ctx.isStudyWordProjectionCard(c)) || ctx.ankiExportCardKind(c) === 'basic'));
}
summary('K2-F hardening (Anki Teacher/Self)');
