// Limite do plano grátis "corta e avisa" (arquitetura seção 17) -- Node/VM.
// Testa a regra pura planOwnCardInstanceCut + ownCardInstanceCutMessage
// (shared/deck-engine.js) com os arquivos REAIS carregados pelo harness da Fase F.
// Rodar: node tests/limite-corte/test_cut_unit.js
const { load, check, summary } = require('../fase-f/harness');

const mk = (ctx, mode, values) => {
  const st = ctx.createNativeNoteEditorState({ cardGenerationMode: mode, languageAppKey: ctx.APP_KEY });
  values.forEach(v => ctx.addFieldToEditorState(st, { content: { value: v } }));
  return st;
};
const used = (n, appKey) => Array.from({ length: n }, (_, i) => ({ id: i, status: 'active', front: 'a', back_trans: 'b', language_app_key: appKey }));

for (const [lang, appKey] of [['fr', 'frances'], ['zh', 'mandarim']]){
  console.log('== ' + lang);
  const { ctx } = load(appKey, 'u1');
  const L = (n, c, x) => check(lang + ' ' + n, c, x);
  const normal = mk(ctx, 'normal', ['a', 'b']);
  const rev = mk(ctx, 'normal_reversed', ['a', 'b']);
  const cloze3 = mk(ctx, 'cloze', ['{{c1::x}} {{c2::y}} {{c3::z}}', 'trad']);
  const cut = (usedN, states, link) => ctx.planOwnCardInstanceCut({ activeRows: used(usedN, appKey), hasTeacherLink: !!link, editorStates: states, languageAppKey: appKey, limit: 20 });

  let p = cut(0, [normal, normal, normal]);
  L('cabe tudo: sem corte', p.keepCount === 3 && !p.cut && p.keptInstances === 3 && p.requested === 3, p);

  p = cut(17, [normal, normal, normal, normal, normal]);
  L('17 usados + 5 Normal: cria só 3', p.keepCount === 3 && p.cut && p.keptInstances === 3 && p.requested === 5 && p.remaining === 3, p);

  p = cut(18, [normal, rev, normal]);
  L('nunca Note pela metade: 2 vagas, Normal(1)+reverso(2) -> só a 1ª', p.keepCount === 1 && p.keptInstances === 1 && p.cut, p);

  p = cut(18, [rev, normal]);
  L('corte é um prefixo: reverso(2) cabe nas 2 vagas, Normal fica de fora', p.keepCount === 1 && p.keptInstances === 2, p);

  p = cut(19, [cloze3, normal]);
  L('prefixo: Cloze(3) não cabe em 1 vaga -> nada (nunca pula pra Normal depois)', p.keepCount === 0 && p.keptInstances === 0 && p.cut, p);

  p = cut(20, [normal]);
  L('no teto: nada é criado', p.keepCount === 0 && p.cut, p);

  p = cut(25, [normal]);
  L('acima do teto (dado antigo): remaining 0, nada criado', p.keepCount === 0 && p.remaining === 0, p);

  p = cut(19, [cloze3, cloze3, rev], true);
  L('vínculo/Premium (sem teto): cria tudo', p.keepCount === 3 && !p.cut && p.remaining === Infinity, p);

  L('lista vazia: nada a cortar', cut(10, []).keepCount === 0 && !cut(10, []).cut);

  // arquivados não contam no uso
  const rows = used(19, appKey).concat([{ id: 99, status: 'archived', front: 'a', back_trans: 'b', language_app_key: appKey }]);
  p = ctx.planOwnCardInstanceCut({ activeRows: rows, hasTeacherLink: false, editorStates: [normal, normal], languageAppKey: appKey, limit: 20 });
  L('arquivado não consome vaga', p.used === 19 && p.keepCount === 1, p);

  // mensagem
  let m = ctx.ownCardInstanceCutMessage({ requested: 35, keptInstances: 20, limit: 20, used: 0, what: 'Este Deck' });
  L('mensagem: texto pedido', m === 'Este Deck criaria 35 cartões, mas sua conta pode possuir apenas 20 no plano grátis. Por isso, apenas os primeiros 20 cartões foram criados.', m);
  m = ctx.ownCardInstanceCutMessage({ requested: 5, keptInstances: 3, limit: 20, used: 17, what: 'Esta importação' });
  L('mensagem com uso anterior', m.includes('Esta importação criaria 5 cartões') && m.includes('você já tinha 17 cartões') && m.includes('apenas os primeiros 3 cartões foram criados'), m);
  m = ctx.ownCardInstanceCutMessage({ requested: 3, keptInstances: 0, limit: 20, used: 20 });
  L('mensagem quando nada cabe', m.includes('Por isso, nenhum cartão foi criado.') && m.startsWith('Esta importação'), m);
  m = ctx.ownCardInstanceCutMessage({ requested: 2, keptInstances: 1, limit: 20, used: 19 });
  L('singular: "apenas o primeiro cartão foi criado"', m.includes('apenas o primeiro cartão foi criado') && m.includes('(você já tinha 19 cartões)'), m);

  // criação manual continua bloqueando (preflight inalterado)
  const pf = ctx.preflightOwnCardInstanceCreation({ activeRows: used(19, appKey), hasTeacherLink: false, editorStates: [rev], languageAppKey: appKey, limit: 20 });
  L('criação manual de 1 cartão continua bloqueando (preflight)', pf.ok === false);
}
summary('Limite corta-e-avisa -- unit');
