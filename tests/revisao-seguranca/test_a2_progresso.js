// A2: falha na busca dos cartões da professora/próprios no carregamento NUNCA apaga o progresso FSRS deles.
// Falha na origin/main (o save seguinte sai sem os cartões), passa na branch. fr e zh, professora e próprios.
// Cenários: (1) busca falha -> o save regrava as entradas intactas; (2) depois uma busca boa na mesma sessão devolve o
// progresso aos cartões; (3) busca boa e vazia (cartão apagado no banco) continua tirando a entrada, como antes;
// (4) carregamento normal (busca boa) continua aplicando o progresso salvo.
const { withPage, realErrors, close, check, summary } = require('./harness');

async function scenario(page, { failTeacher, failSelf, thenSucceed, emptyResult }){
  return page.evaluate(async ({ failTeacher, failSelf, thenSucceed, emptyResult }) => {
    const lang = APP_KEY === 'mandarim' ? 'zh' : 'fr';
    const fields = (a, b) => [{ id: 'a', lang, role: null, content: { value: a }, audio: null, image: null, pinyinFieldId: null },
      { id: 'b', lang: 'pt-BR', role: null, content: { value: b }, audio: null, image: null, pinyinFieldId: null }];
    const tRow = { id: 77, student_id: 'u1', teacher_id: 't1', language_app_key: APP_KEY, status: 'active', revision: 0, note: null, tags: [], deck_id: null, fields: fields('chat', 'gato'), card_generation_mode: 'normal' };
    const sRow = { id: 88, owner_id: 'u1', language_app_key: APP_KEY, status: 'active', revision: 0, note: null, tags: [], deck_id: null, fields: fields('chien', 'cachorro'), card_generation_mode: 'normal' };
    const tCard = buildCardFromTeacherFlashcard(tRow)[0];
    const sCard = buildCardFromSelfFlashcard(sRow)[0];
    const prog = { reps: 9, stability: 42, difficulty: 5.5, state: 'review', due: Date.now() + 864e5 * 30, lastReview: Date.now() - 864e5, fsrsReps: 9, fsrsLapses: 1, fsrsMigrated: true };
    const savedT = Object.assign({}, tCard, prog);
    const savedS = Object.assign({}, sCard, prog, { stability: 17 });
    const progressRow = { data: { [progressBlockKey ? progressBlockKey({}) : APP_KEY]: { cards: [savedT, savedS], xp: 100, totalReviews: 9 } } };
    let fail = { teacher_flashcards: failTeacher, own_flashcards: failSelf };
    let upserted = [];
    const mk = (table) => {
      const base = {
        maybeSingle(){ return Promise.resolve(table === 'progress' ? { data: progressRow, error: null } : { data: null, error: null }); },
        single(){ return Promise.resolve({ data: null, error: null }); },
        upsert(v){ if (table === 'progress') upserted.push(JSON.parse(JSON.stringify(v))); return Promise.resolve({ error: null }); },
        then(ok, ko){
          let res = { data: [], error: null };
          if (fail[table]) res = { data: null, error: { message: 'timeout' } };
          else if (table === 'teacher_flashcards') res = { data: emptyResult ? [] : [tRow], error: null };
          else if (table === 'own_flashcards') res = { data: emptyResult ? [] : [sRow], error: null };
          return Promise.resolve(res).then(ok, ko); } };
      // Qualquer outro método do construtor de consulta (select, eq, or, order...) devolve a própria consulta.
      const q = new Proxy(base, { get(o, p){ return p in o ? o[p] : () => q; } });
      return q; };
    supabaseClient.from = mk;
    supabaseClient.rpc = async () => ({ data: null, error: null });
    CURRENT_USER = { id: 'u1', email: 'a@b.c' };
    STATE.cards = STATE.cards.filter(c => c.origin === 'study');
    await loadStateAndRender();
    const inState = (id) => STATE.cards.find(c => c.id === id) || null;
    const res = { tId: tCard.id, sId: sCard.id, loadedOk: progressLoadedOk };
    res.tInState1 = !!inState(tCard.id); res.sInState1 = !!inState(sCard.id);
    await saveState();
    const lastBlock = () => { const u = upserted[upserted.length - 1]; return u && u.data && Object.values(u.data).find(b => b && Array.isArray(b.cards)); };
    let b = lastBlock();
    const entry = (blk, id) => blk ? blk.cards.find(c => c.id === id) || null : null;
    res.save1T = entry(b, tCard.id); res.save1S = entry(b, sCard.id);
    if (thenSucceed){
      fail = { teacher_flashcards: false, own_flashcards: false };
      await mergeTeacherFlashcardsIntoState();
      await mergeSelfFlashcardsIntoState();
      const t = inState(tCard.id), s = inState(sCard.id);
      res.after = { t: t && { stability: t.stability, reps: t.fsrsReps, lapses: t.fsrsLapses }, s: s && { stability: s.stability, reps: s.fsrsReps } };
      await saveState();
      b = lastBlock();
      res.save2Count = b ? b.cards.filter(c => c.id === tCard.id || c.id === sCard.id).length : null;
      res.save2T = entry(b, tCard.id); res.save2S = entry(b, sCard.id);
    }
    const t = inState(tCard.id);
    res.tStability = t ? t.stability : null;
    return res;
  }, { failTeacher, failSelf, thenSucceed, emptyResult });
}

(async () => {
  for (const site of ['fr', 'zh']){
    console.log(`\n[${site}]`);
    const r1 = await withPage(site, async (page, errs) => { const o = await scenario(page, { failTeacher: true, failSelf: true, thenSucceed: true }); o.errors = realErrors(errs).filter(e => !/timeout|Erro ao carregar/.test(e)); return o; });
    check(`${site}: busca falhou -> progresso carregado e cartões fora da tela (como antes)`, r1.loadedOk === true && !r1.tInState1 && !r1.sInState1, r1);
    check(`${site}: save depois da falha mantém o cartão da professora com o FSRS`, !!r1.save1T && r1.save1T.stability === 42 && r1.save1T.fsrsReps === 9, r1.save1T);
    check(`${site}: save depois da falha mantém o cartão próprio com o FSRS`, !!r1.save1S && r1.save1S.stability === 17, r1.save1S);
    check(`${site}: busca boa na mesma sessão devolve o progresso aos cartões`, r1.after && r1.after.t && r1.after.t.stability === 42 && r1.after.t.lapses === 1 && r1.after.s && r1.after.s.stability === 17, r1.after);
    check(`${site}: save seguinte sem duplicata e com o progresso`, r1.save2Count === 2 && r1.save2T && r1.save2T.stability === 42 && r1.save2S && r1.save2S.stability === 17, { n: r1.save2Count });
    check(`${site}: sem erro de página`, r1.errors.length === 0, r1.errors);

    const r2 = await withPage(site, async (page) => scenario(page, { failTeacher: false, failSelf: false }));
    check(`${site}: carregamento normal aplica o progresso salvo (stability 42)`, r2.tInState1 && r2.tStability === 42 && r2.save1T && r2.save1T.stability === 42, r2);

    const r3 = await withPage(site, async (page) => scenario(page, { failTeacher: false, failSelf: false, emptyResult: true }));
    check(`${site}: busca boa e vazia (cartão apagado) continua tirando a entrada`, !r3.tInState1 && r3.save1T === null && r3.save1S === null, { t: r3.save1T, s: r3.save1S });

    const r4 = await withPage(site, async (page) => scenario(page, { failTeacher: true, failSelf: false }));
    check(`${site}: só a professora falhou -> guarda a professora, próprio segue normal`, !!r4.save1T && r4.save1T.stability === 42 && r4.sInState1 && r4.save1S && r4.save1S.stability === 17, r4);
  }
  await close();
  summary('A2 progresso');
})().catch(async e => { console.error(e); await close(); process.exit(1); });
