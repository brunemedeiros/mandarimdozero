// Etapa 0a do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md, 2.6): o progresso do aluno atravessa
// mudanças de currículo sem perder nada. Node/VM sobre o código REAL (applySerializedState de fr/app.js, portão de
// shared/core/revisao-decks.js, shared/study-trail-model.js, fr/content.js, fr/curriculum-changes.js).
//   2. saves simulados com o formato real (e os reais anonimizados, se existirem em fixtures/real-*.json)
//   3. conteúdo v2 de TESTE com as operações da seção 5 (reordenar, mover, fundir, aposentar, inserir), item a item
//   4. ida e volta (carregar -> salvar -> carregar duas vezes = mesmo estado)
//   5. volta de item aposentado
//   6. portão de lição (released) e lessonId
// Rodar: node tests/curriculo-ids/test_carregamento.js
const { check, summary } = require('../fase-e/harness');
const L = require('./lib');

const pick = (e) => { const o = {}; L.FIELDS.forEach(f => { if (e && e[f] !== undefined) o[f] = e[f]; }); return JSON.stringify(o); };
const isStudyId = (id) => /^u./.test(String(id));
const keyOf = (id) => { const b = /-b$/.test(id); return { key: id.slice(1, b ? -2 : undefined), suffix: b ? '-b' : '' }; };
const progressed = (e) => e && (e.reps > 0 || e.state && e.state !== 'new');

// ============ 1. função pura applyStudyKeyChanges ============
console.log('== applyStudyKeyChanges (pura)');
{
  const ctx = L.frContext();
  const f = ctx.applyStudyKeyChanges;
  const A = (id, extra) => Object.assign({ id, reps: 1, stability: 5, state: 'review', lastReview: 1000, firstLearnedDate: '2026-05-01' }, extra);
  const input = [A('uX-v0', { lastReview: 2000, stability: 3, firstLearnedDate: '2026-06-01' }), A('uY-v3', { lastReview: 1000, stability: 9, firstLearnedDate: '2026-01-02' }),
    A('uX-v0-b', { lastReview: 500 }), A('uY-v3-b', { lastReview: 900 }), { id: 't1', origin: 'teacher', reps: 4 }];
  const frozen = JSON.stringify(input);
  const r = f(input, { merges: { 'Y-v3': 'X-v0' }, currentIds: ['uX-v0', 'uX-v0-b'], today: '2026-10-18' });
  check('não muta a entrada', JSON.stringify(input) === frozen);
  const byId = Object.fromEntries(r.cards.map(c => [c.id, c]));
  check('fusão A: vence a revisão mais recente (stability 3) e firstLearnedDate = a mais antiga',
    byId['uX-v0'].stability === 3 && byId['uX-v0'].lastReview === 2000 && byId['uX-v0'].firstLearnedDate === '2026-01-02', byId['uX-v0']);
  check('fusão B separada da A: vence uY-v3-b (900 > 500)', byId['uX-v0-b'].lastReview === 900);
  check('perdedores no arquivo com mergedInto', r.archive['uY-v3'] && r.archive['uY-v3'].mergedInto === 'uX-v0' && r.archive['uX-v0-b'] && r.archive['uX-v0-b'].mergedInto === 'uX-v0-b', r.archive);
  check('renames registrados', r.renames['uY-v3'] === 'uX-v0' && r.renames['uY-v3-b'] === 'uX-v0-b');
  check('cartão da professora passa intacto (mesmo objeto)', r.cards.includes(input[4]));
  const tie = f([A('uX-v0', { stability: 2 }), A('uY-v3', { stability: 7 })], { merges: { 'Y-v3': 'X-v0' } });
  check('empate de revisão: maior stability', tie.cards.find(c => c.id === 'uX-v0').stability === 7);
  const tie2 = f([A('uY-v3', { difficulty: 9 }), A('uX-v0', { difficulty: 1 })], { merges: { 'Y-v3': 'X-v0' } });
  check('empate total: fica o sobrevivente', tie2.cards.find(c => c.id === 'uX-v0').difficulty === 1);
  const only = f([A('uY-v3', { reps: 6 })], { merges: { 'Y-v3': 'X-v0' } });
  check('só a antiga no save: renomeada para a sobrevivente', only.cards.length === 1 && only.cards[0].id === 'uX-v0' && only.cards[0].reps === 6);
  const chain = f([A('uZ-v1')], { merges: { 'Z-v1': 'Y-v3', 'Y-v3': 'X-v0' } });
  check('fusão encadeada', chain.cards[0].id === 'uX-v0');
  const cyc = f([A('uZ-v1')], { merges: { 'Z-v1': 'Y-v3', 'Y-v3': 'Z-v1' } });
  check('ciclo de fusão não trava', cyc.cards.length === 1);
  const again = f(r.cards, { merges: { 'Y-v3': 'X-v0' }, currentIds: ['uX-v0', 'uX-v0-b'], archive: r.archive, today: '2026-10-19' });
  check('idempotente: aplicar de novo dá o mesmo', JSON.stringify(again.cards) === JSON.stringify(r.cards) && JSON.stringify(again.archive) === JSON.stringify(r.archive));
  const ret = f([A('uX-v0'), A('uX-v0-b')], { retiredKeys: ['X-v0'], currentIds: ['uX-v0', 'uX-v0-b'], today: '2026-10-18' });
  check('aposentado vai para o arquivo (A e B)', ret.cards.length === 0 && ret.archive['uX-v0'].retiredAt === '2026-10-18' && ret.archive['uX-v0-b']);
  const back = f([], { archive: ret.archive, currentIds: ['uX-v0', 'uX-v0-b'] });
  check('desaposentado: progresso volta e sai do arquivo', back.cards.length === 2 && back.restored.length === 2 && !Object.keys(back.archive).length && back.cards[0].reps === 1 && !('retiredAt' in back.cards[0]));
  const orphan = f([A('uGone-v1'), { id: 'uX-v0', reps: 0 }], { currentIds: ['uX-v0'] });
  check('órfão (id sem item) vai para o arquivo, não some', orphan.archive['uGone-v1'] && orphan.archive['uGone-v1'].reps === 1 && orphan.cards.length === 1);
  const noCur = f([A('uGone-v1')], {});
  check('sem currentIds: nada é arquivado (zh/compat)', noCur.cards.length === 1 && !Object.keys(noCur.archive).length);
  const dup = f([A('uX-v0', { reps: 1 }), A('uX-v0', { reps: 9, lastReview: 1 })], { currentIds: ['uX-v0'] });
  check('id repetido no save: vale o último, como sempre (sem arquivar)', dup.cards.length === 1 && dup.cards[0].reps === 9 && !Object.keys(dup.archive).length);
  const legacy = f([{ id: 'uX-v0', origin: 'study', reps: 2, front: 'velho' }], { currentIds: ['uX-v0'] });
  check('save antigo (objeto inteiro, origin study) continua aceito', legacy.cards[0].reps === 2);
  const evil = f([], { archive: { __proto__: { reps: 1 }, 'uX-v0': { reps: 3 } }, currentIds: ['uX-v0'] });
  check('arquivo: só objetos válidos', evil.cards.length === 1 && evil.cards[0].reps === 3);
  const rr = ctx.renameStudyIdsInRecords({ 'uY-v3': 'uX-v0' }, { 'uY-v3': { 'a': { reps: 1 } }, 'uX-v0': { 'b': { reps: 2 } }, 'uQ': {} }, ['uY-v3', 'uX-v0', 't1']);
  check('gavetas de palavra e difíceis acompanham a fusão', rr.cardVariants['uX-v0'].a && rr.cardVariants['uX-v0'].b && !rr.cardVariants['uY-v3'] && JSON.stringify(rr.hardSeenIds) === '["uX-v0","t1"]', rr);
  const um = ctx.applyUnitModuleMerges({ 'A': { started: true, completed: true }, 'B': { started: true, completed: false, lessonIdx: 2 } }, { 'M1': { completed: true, bestScore: 80 }, 'M2': { completed: false, bestScore: 90 } }, { 'A': 'B' }, { 'M1': 'M2', 'M9': null });
  check('UNIT_MERGES: concluída se qualquer uma estava', um.unitProgress.B.completed === true && um.unitProgress.B.started === true);
  check('MODULE_MERGES: aprovado mantido e melhor nota', um.checkpointProgress.M2.completed === true && um.checkpointProgress.M2.bestScore === 90);
  const umEmpty = ctx.applyUnitModuleMerges({ A: { x: 1 } }, undefined, {}, {});
  check('sem fusão de unidade: igual', JSON.stringify(umEmpty.unitProgress) === '{"A":{"x":1}}' && umEmpty.checkpointProgress === undefined);
}

// ============ 2 a 5. saves simulados (e reais, se houver) pelo carregamento real ============
const v1 = L.frContext();
const saves = L.simulatedSaves(v1).concat(L.realSaves().map(s => Object.assign(s, { real: true })));
console.log(`== ${saves.length} saves (${saves.filter(s => s.real).length} reais)`);
const seenCases = { aposentado: 0, fusaoDosDois: 0, fusaoSoAntiga: 0, movido: 0, orfao: 0, fraseQueDeixouDeSerExemplo: 0 };
check('5 saves simulados', saves.filter(s => !s.real).length === 5);

saves.forEach(({ name, block }) => {
  const tag = `[${name}]`;
  const savedStudy = (block.cards || []).filter(c => isStudyId(c.id) && (c.origin == null || c.origin === 'study'));
  const savedById = new Map(savedStudy.map(c => [c.id, c]));

  // --- conteúdo de hoje (v1): nada muda para quem estuda ---
  const c1 = L.loadBlock(L.frContext(), block);
  const ids1 = new Set(c1.STATE.cards.map(c => c.id));
  const lost1 = savedStudy.filter(s => {
    if (ids1.has(s.id)) return pick(c1.STATE.cards.find(c => c.id === s.id)) !== pick(Object.assign({}, c1.STATE.cards.find(c => c.id === s.id), s)) ;
    return !c1.STATE.retiredStudyCards[s.id] || pick(c1.STATE.retiredStudyCards[s.id]) !== pick(s);
  });
  check(`${tag} v1: todo cartão salvo volta com o FSRS idêntico (ou vai para o arquivo se não existe mais)`, lost1.length === 0, lost1.slice(0, 3).map(x => x.id));
  const orphans = savedStudy.filter(s => !ids1.has(s.id)).map(s => s.id);
  check(`${tag} v1: arquivo = só os órfãos (${orphans.length})`, JSON.stringify(Object.keys(c1.STATE.retiredStudyCards).sort()) === JSON.stringify(orphans.sort()));
  check(`${tag} v1: cartões da professora/próprios não entram no arquivo`, Object.keys(c1.STATE.retiredStudyCards).every(isStudyId));
  const released1 = c1.STATE.cards.filter(c => c.released);
  check(`${tag} v1: released só em cartão que o portão libera`, released1.every(c => { const p = c1.STATE.unitProgress[c.unitId]; return p && (p.completed || p.started); }));
  const completedUnits = Object.keys(block.unitProgress || {}).filter(u => block.unitProgress[u].completed);
  check(`${tag} v1: todo cartão de unidade concluída ganhou released`, c1.STATE.cards.filter(c => completedUnits.includes(c.unitId)).every(c => c.released));
  const save1 = L.saveBlock(c1);

  // --- ida e volta (v1): carregar -> salvar -> carregar duas vezes = mesmo estado ---
  const c1b = L.loadBlock(L.loadBlock(L.frContext(), save1), save1);
  check(`${tag} v1: ida e volta (2 cargas) = ponto fixo`, JSON.stringify(L.saveBlock(c1b)) === JSON.stringify(save1));

  // --- conteúdo v2 de teste ---
  const c2 = L.frContext();
  const ops = L.applyV2(c2);
  L.loadBlock(c2, save1);
  const byId2 = new Map(c2.STATE.cards.map(c => [c.id, c]));
  const arch2 = c2.STATE.retiredStudyCards;
  const problems = [];
  savedStudy.concat(Object.values(save1.retiredStudyCards || {})).forEach(s0 => {
    const s = save1.cards.find(c => c.id === s0.id) || s0; // depois do v1 (com released)
    const { key, suffix } = keyOf(s.id);
    if (ops.retired.includes(key)){
      if (!arch2[s.id] || pick(arch2[s.id]) !== pick(s)) problems.push(['aposentado fora do arquivo', s.id]);
      if (progressed(s)) seenCases.aposentado++;
      return;
    }
    if (ops.merges[key]){
      const tid = 'u' + ops.merges[key] + suffix;
      const t = save1.cards.find(c => c.id === tid);
      const card = byId2.get(tid);
      const tRev = t && t.lastReview != null ? t.lastReview : -Infinity, sRev = s.lastReview != null ? s.lastReview : -Infinity;
      const sWins = sRev > tRev || (sRev === tRev && (Number(s.stability) || 0) > (Number(t && t.stability) || 0));
      const win = !t ? s : (sWins ? s : t), lose = !t ? null : (sWins ? t : s);
      const exp = Object.assign({}, win);
      const dates = [s.firstLearnedDate, t && t.firstLearnedDate].filter(Boolean).sort();
      if (dates.length) exp.firstLearnedDate = dates[0];
      if (!card || pick(card) !== pick(exp)) problems.push(['fusão errada', s.id, '->', tid]);
      if (progressed(s)) { if (t && progressed(t)) seenCases.fusaoDosDois++; else seenCases.fusaoSoAntiga++; }
      if (lose){
        const lid = lose === s ? s.id : tid;
        if (!arch2[lid] || pick(arch2[lid]) !== pick(lose) || arch2[lid].mergedInto !== tid) problems.push(['perdedor da fusão fora do arquivo', lid]);
      }
      return;
    }
    if (Object.values(ops.merges).includes(key)) return; // sobrevivente: conferido pelo lado da fusão
    const card = byId2.get(s.id);
    if (card){
      if (pick(card) !== pick(s)) problems.push(['mudou o FSRS', s.id]);
      const c1card = c1.STATE.cards.find(c => c.id === s.id);
      if (progressed(s) && c1card && c1card.unitId !== card.unitId) seenCases.movido++;
      return;
    }
    if (!arch2[s.id] || pick(arch2[s.id]) !== pick(s)) problems.push(['sumiu', s.id]);
    if (progressed(s)) { if (ids1.has(s.id)) seenCases.fraseQueDeixouDeSerExemplo++; else seenCases.orfao++; }
  });
  check(`${tag} v2: item a item (mantido, movido, fundido, aposentado, órfão): nada some`, problems.length === 0, problems.slice(0, 4));
  // movidos: mesmo id, unidade nova
  const moved = ['uA1-10-v6', 'uA1-3-v5', 'uA1-3-v8'].map(id => byId2.get(id));
  check(`${tag} v2: palavras movidas mantêm o id e mudam de unidade`, moved[0].unitId === 'A1-28' && moved[1].unitId === 'A1-21' && moved[2].unitId === 'A1-21');
  check(`${tag} v2: chave nova não herda progresso de ninguém`, ['uA1-3-v10', 'uA1-6-v10', 'uA1-9-v10', 'uA1-20-v10'].every(id => byId2.get(id) && !progressed(byId2.get(id))));
  check(`${tag} v2: palavra que entrou no lugar (posição) de outra não herda o progresso dela`, !progressed(byId2.get('uA1-6-v10')) && !byId2.has('uA1-6-v6'));
  // portão: palavra estudada (released) que foi para unidade não iniciada continua na Revisão
  const movedReleased = c2.STATE.cards.filter(c => c.released && ['A1-21', 'A1-28'].includes(c.unitId));
  check(`${tag} v2: palavra liberada movida para unidade não iniciada continua na Revisão`, movedReleased.every(c => c2.isCardLessonCompleted(c)));
  if (completedUnits.includes('A1-10')) check(`${tag} v2: números do A1-10 (concluída) seguem elegíveis no A1-28`, movedReleased.filter(c => c.unitId === 'A1-28' && c.vocabIdx != null).length === 16);

  // ida e volta no v2 + idempotência
  const save2 = L.saveBlock(c2);
  const c2b = L.frContext(); L.applyV2(c2b); L.loadBlock(c2b, save2); L.loadBlock(c2b, save2);
  check(`${tag} v2: ida e volta (2 cargas) = ponto fixo`, JSON.stringify(L.saveBlock(c2b)) === JSON.stringify(save2));
  const c2c = L.frContext(); L.applyV2(c2c); L.loadBlock(c2c, save1); L.loadBlock(c2c, L.saveBlock(c2c));
  check(`${tag} v2: carregar o save antigo duas vezes = uma vez`, JSON.stringify(L.saveBlock(c2c)) === JSON.stringify(save2));

  // volta do aposentado (récemment volta ao conteúdo)
  const c3 = L.frContext(); L.applyV2(c3, { keepRecemment: true }); L.loadBlock(c3, save2);
  const rec1 = save1.cards.find(c => c.id === 'uA1-20-v9'), rec3 = c3.STATE.cards.find(c => c.id === 'uA1-20-v9');
  check(`${tag} volta de aposentado: progresso de récemment volta igual e sai do arquivo`, rec3 && pick(rec3) === pick(rec1) && !c3.STATE.retiredStudyCards['uA1-20-v9']);
});

console.log('   casos exercitados com progresso:', JSON.stringify(seenCases));
check('os saves exercitam aposentado, fusão (com e sem o sobrevivente), movido e órfão', seenCases.aposentado > 0 && seenCases.fusaoDosDois > 0 && seenCases.fusaoSoAntiga > 0 && seenCases.movido > 0 && seenCases.orfao > 0, seenCases);

// ============ 6. portão e lições (save sob medida) ============
console.log('== portão de lição e lessonId');
{
  const base = L.frContext();
  const entries = base.serializeCardsForSave(base.buildCardsFromUnits(base.UNITS));
  const touch = (id) => Object.assign(entries.find(e => e.id === id), { reps: 2, state: 'review', stability: 10, lastReview: 1790000000000, due: 1791000000000, fsrsMigrated: true });
  ['uA1-3-v0', 'uA1-3-v1', 'uA1-3-v2', 'uA1-10-v6', 'uA1-10-v7', 'uA1-10-v8', 'uA1-10-v9', 'uA1-10-v10', 'uA1-10-v11'].forEach(touch);
  const up = (lessonIdx, extra) => Object.assign({ started: true, completed: false, unlocked: true, lessonIdx, lessonMisses: {} }, extra);
  const block = { cards: entries, unitProgress: { 'A1-3': up(1), 'A1-2': up(2), 'A1-10': up(4) } };
  const c1 = L.loadBlock(L.frContext(), block);
  const save1 = L.saveBlock(c1);
  check('lessonId salvo para unidade começada', save1.unitProgress['A1-2'].lessonId === 'nacionalidades' && save1.unitProgress['A1-3'].lessonId === 'contar-ate-vinte' && save1.unitProgress['A1-10'].lessonId === 'numeros-90-100');
  check('lessonId não é gravado para unidade não começada', !('lessonId' in (save1.unitProgress['A1-4'] || {})));
  check('A1-3 lição 1 feita: palavras da lição 1 liberadas, da lição 2 não', ['uA1-3-v0', 'uA1-3-v2'].every(id => c1.STATE.cards.find(c => c.id === id).released) && !c1.STATE.cards.find(c => c.id === 'uA1-3-v5').released);
  const c2 = L.frContext(); L.applyV2(c2); L.loadBlock(c2, save1);
  const card = (id) => c2.STATE.cards.find(c => c.id === id);
  check('palavra nova (quatre) na unidade começada não entra antes da lição', card('uA1-3-v10') && !c2.isCardLessonCompleted(card('uA1-3-v10')));
  check('palavra já liberada (zéro) continua na Revisão', c2.isCardLessonCompleted(card('uA1-3-v0')));
  check('vingt (nunca liberada) movida para A1-21 não iniciada: fora da Revisão', card('uA1-3-v5').unitId === 'A1-21' && !c2.isCardLessonCompleted(card('uA1-3-v5')));
  check('trente (liberada no A1-10) movida para A1-28 não iniciada: continua na Revisão', card('uA1-10-v6').unitId === 'A1-28' && c2.isCardLessonCompleted(card('uA1-10-v6')));
  check('lição mudou de posição: lessonIdx segue o id (nacionalidades 2 -> 3)', c2.STATE.unitProgress['A1-2'].lessonIdx === 3 && c2.STATE.unitProgress['A1-2'].lessonId === 'nacionalidades');
  const a10 = c2.UNITS.find(u => u.id === 'A1-10');
  // aqui todas as palavras que sobraram no A1-10 já estavam liberadas: vai para a última lição (checkpoint)
  check('lição sumiu e todas as palavras já liberadas: vai para a última lição (checkpoint)', c2.STATE.unitProgress['A1-10'].lessonIdx === a10.lessons.length - 1 && c2.STATE.unitProgress['A1-10'].lessonId === 'checkpoint', c2.STATE.unitProgress['A1-10']);
  // regra pura: 1ª lição com palavra ainda não liberada
  const fakeUnit = { id: 'X', lessons: [{ id: 'a', vocabIdx: [0, 1] }, { id: 'b', vocabIdx: [2, 3] }, { id: 'checkpoint', vocabIdx: [] }] };
  const fakeProg = { X: { started: true, completed: false, lessonIdx: 2, lessonId: 'sumiu' } };
  c2.reconcileUnitLessonIdx(fakeProg, [fakeUnit], (u, vi) => vi < 2);
  check('lição sumiu: volta para a 1ª lição com palavra não liberada', fakeProg.X.lessonIdx === 1 && fakeProg.X.lessonId === 'b', fakeProg.X);
  const c1again = L.loadBlock(L.frContext(), save1);
  check('conteúdo igual: lessonIdx não muda', c1again.STATE.unitProgress['A1-2'].lessonIdx === 2 && c1again.STATE.unitProgress['A1-10'].lessonIdx === 4);
}

// ============ zh (C1 da paridade, 2026-10-23): mesma regra do fr, nenhum id mudou ============
const fs = require('fs'), path = require('path');
console.log('== zh');
{
  const zh = L.zhContext();
  const cards = zh.STATE.cards;
  const ledger = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'zh/published_ids.json'), 'utf8'));
  check('zh: todo cartão da trilha tem studyKey (chave no conteúdo)', cards.length > 0 && cards.every(c => typeof c.studyKey === 'string'));
  check('zh: id = u{k} = o id de antes pela posição (nenhum id mudou)', cards.every(c => c.phraseIdx != null ? c.id === 'u' + c.studyKey && /^u.+-[pd]\d+$/.test(c.id) : (c.id === `u${c.unitId}-v${c.vocabIdx}` || c.id === `u${c.unitId}-v${c.vocabIdx}-b`)));
  check('zh: ids == livro-razão zh/published_ids.json (conferido contra a origin/main)', JSON.stringify(cards.map(c => c.id).sort()) === JSON.stringify(ledger.cards.slice().sort()));
  const src = fs.readFileSync(path.join(L.ROOT, 'zh/app.js'), 'utf8');
  const fn = (name) => { const a = src.indexOf('function ' + name + '('); return src.slice(a, src.indexOf('\n}\n', a)); };
  check('zh: applySerializedState chama as funções comuns (shared/core/curriculo-progresso.js)', ['curriculumLoadPrepare(data)', 'curriculumLoadReconcileUnits()', 'curriculumLoadStampReleased()'].every(x => fn('applySerializedState').includes(x)));
  check('zh: serializeState grava os campos de currículo', fn('serializeState').includes('...curriculumSaveFields()'));

  // save antigo do zh (sem _curriculumVersion nem retiredStudyCards): unidade 1 concluída, unidade 2 começada, 1 órfão
  const r = L.rng(20261023);
  const entries = zh.serializeCardsForSave(zh.buildCardsFromUnits(zh.UNITS));
  const u1 = entries.filter(e => /^u1-/.test(e.id)), u2 = entries.filter(e => /^u2-v[0-2](-b)?$/.test(e.id));
  u1.concat(u2).forEach((e, i) => Object.assign(e, { reps: 1 + (i % 4), lapses: i % 2, state: 'review', stability: 3 + i * 0.5, difficulty: 4.5,
    lastReview: 1790000000000 + i * 1000, due: 1790400000000 + i * 1000, interval: 3 + i, fsrsReps: 1 + (i % 4), fsrsLapses: i % 2, fsrsMigrated: true, firstLearnedDate: '2026-09-1' + (i % 10) }));
  const orphan = { id: 'u1-v99', reps: 4, stability: 12, state: 'review', lastReview: 1790000000000, due: 1791000000000 };
  const teacher = { id: 't7', origin: 'teacher', rowId: 7, reps: 2, stability: 5, state: 'review', flashcardStatus: 'active' };
  const block = { cards: entries.concat([orphan, teacher]), xp: 50,
    unitProgress: { 1: { started: true, completed: true, unlocked: true, lessonIdx: 0, lessonMisses: {} }, 2: { started: true, completed: false, unlocked: true, lessonIdx: 1, lessonMisses: {} } } };
  const before = JSON.parse(JSON.stringify(block));
  const z1 = L.loadBlock(L.zhContext(), block);
  check('zh: carregar não muta o save recebido', JSON.stringify(block) === JSON.stringify(before));
  const byId = new Map(z1.STATE.cards.map(c => [c.id, c]));
  const studiedIds = u1.concat(u2).map(e => e.id);
  const badFsrs = studiedIds.filter(id => L.FIELDS.some(f => JSON.stringify(byId.get(id)[f]) !== JSON.stringify(before.cards.find(e => e.id === id)[f])));
  check(`zh: save antigo carrega com o FSRS intacto (${studiedIds.length} cartões estudados)`, badFsrs.length === 0, badFsrs.slice(0, 3));
  check('zh: nenhum cartão da trilha sumiu (mesma quantidade)', z1.STATE.cards.filter(c => c.origin === 'study').length === cards.length);
  check('zh: órfão antigo vai para o arquivo com o progresso (antes era descartado em silêncio)', z1.STATE.retiredStudyCards['u1-v99'] && z1.STATE.retiredStudyCards['u1-v99'].stability === 12);
  check('zh: unidade 1 concluída: cartões ganham released', u1.every(e => byId.get(e.id).released === true));
  check('zh: unidade 2 começada (lição 1): só as palavras da lição 0 ganham released', z1.STATE.cards.filter(c => c.released && c.unitId === 2).every(c => z1.lessonIndexForVocabIdx(z1.UNITS[1], c.vocabIdx != null ? c.vocabIdx : c.gateVocabIdx) < 1));
  check('zh: nenhum released em unidade não começada', z1.STATE.cards.every(c => !c.released || c.unitId === 1 || c.unitId === 2));
  const s1 = L.saveBlock(z1);
  check('zh: save grava _curriculumVersion = 1 e o arquivo', s1._curriculumVersion === 1 && s1.retiredStudyCards['u1-v99']);
  check('zh: save grava lessonId da unidade começada', s1.unitProgress[2].lessonId === z1.UNITS[1].lessons[1].id);
  const z2 = L.loadBlock(L.zhContext(), s1);
  const s2 = L.saveBlock(z2);
  check('zh: ida e volta: salvar, recarregar e salvar dá o mesmo bloco', JSON.stringify(s1) === JSON.stringify(s2), Object.keys(s1).filter(k => JSON.stringify(s1[k]) !== JSON.stringify(s2[k])));

  // fusão e aposentado no zh (conteúdo sem módulos): o caminho comum funciona sem MODULES
  const z3 = L.zhContext();
  z3.__run(`Object.assign(STUDY_KEY_MERGES, { '2-v0': '1-v0' }); STUDY_RETIRED_KEYS.push('2-v1');`);
  const merged = JSON.parse(JSON.stringify(before));
  L.loadBlock(z3, merged);
  check('zh: typeof MODULES === undefined no contexto (sem módulos)', z3.__run('typeof MODULES') === 'undefined');
  check('zh: fusão 2-v0 -> 1-v0 com aposentado 2-v1: o perdedor e o aposentado vão para o arquivo',
    ['u1-v0', 'u2-v0'].some(id => z3.STATE.retiredStudyCards[id] && z3.STATE.retiredStudyCards[id].mergedInto === 'u1-v0') && z3.STATE.retiredStudyCards['u2-v1'] && z3.STATE.retiredStudyCards['u2-v1-b'], Object.keys(z3.STATE.retiredStudyCards));
  const fresh = new Map(z3.STATE.cards.map(c => [c.id, c]));
  const a = before.cards.find(e => e.id === 'u1-v0'), b = before.cards.find(e => e.id === 'u2-v0');
  const win = (b.lastReview > a.lastReview) ? b : a;
  check('zh: sobrevivente fica com a revisão mais recente (regra FSRS da fusão)', fresh.get('u1-v0').lastReview === win.lastReview && fresh.get('u1-v0').stability === win.stability);
}
summary('curriculo-ids carregamento');
