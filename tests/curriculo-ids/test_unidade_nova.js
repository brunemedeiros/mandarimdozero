// Etapa 0b do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md 2.10, decisão da dona): "a unidade nova nasce
// aberta, mas não concluída". Função pura openUnitsBeforeOpenOnes (shared/trail-state-model.js) + o carregamento real do
// fr (applySerializedState) com o conteúdo v2 de teste (A1-21 inserida depois da A1-3; A1-28 depois da A1-10).
// Rodar: node tests/curriculo-ids/test_unidade_nova.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { check, summary } = require('../fase-e/harness');
const L = require('./lib');

const ctxPure = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(L.ROOT, 'shared/trail-state-model.js'), 'utf8'), ctxPure, { filename: 'shared/trail-state-model.js' });
const { openUnitsBeforeOpenOnes: open, recalcUnlocked, trailItemState } = ctxPure;

const U = (...ids) => ids.map(id => ({ id }));
const P = (o) => JSON.parse(JSON.stringify(o));
const done = { started: true, completed: true, unlocked: true, lessonIdx: 0, lessonMisses: {} };
const cur = (li) => ({ started: true, completed: false, unlocked: true, lessonIdx: li || 0, lessonMisses: {} });
const locked = { started: false, completed: false, unlocked: false, lessonIdx: 0, lessonMisses: {} };
// a regra completa (2.10) = recalcUnlocked (1ª do grupo, anterior concluída) + openUnitsBeforeOpenOnes
const rule = (groups, prog) => { recalcUnlocked(groups, prog); return open(groups, prog); };

console.log('== função pura');
{
  // 1. inserida no meio, aluno adiante
  const g = [U('A', 'B', 'N', 'C', 'D')];
  const p = { A: P(done), B: P(done), N: P(locked), C: P(done), D: P(cur(2)) };
  const r = rule(g, p);
  check('meio, aluno adiante: a nova abre', p.N.unlocked === true, r);
  check('meio, aluno adiante: a nova NÃO é concluída nem começada, lição intacta', p.N.completed === false && p.N.started === false && p.N.lessonIdx === 0);
  check('meio, aluno adiante: o resto não muda', JSON.stringify([p.A, p.B, p.C, p.D]) === JSON.stringify([done, done, done, cur(2)]));
  check('meio, aluno adiante: aparece como liberada (não trancada nem concluída)', ['current', 'available'].includes(trailItemState({ id: 'N' }, g, p)));
}
{
  // 2. aluno que ainda não chegou lá: ordem normal
  const g = [U('A', 'B', 'N', 'C', 'D')];
  const p = { A: P(done), B: P(cur(1)), N: P(locked), C: P(locked), D: P(locked) };
  const r = rule(g, p);
  check('aluno antes da nova: continua trancada', p.N.unlocked === false && r.length === 0 && trailItemState({ id: 'N' }, g, p) === 'locked');
  check('aluno antes da nova: C e D continuam trancadas', !p.C.unlocked && !p.D.unlocked);
  // ao concluir B, a nova abre pela regra de sempre (anterior concluída)
  p.B = P(done); rule(g, p);
  check('aluno antes da nova: ao concluir a anterior, a nova abre (regra de sempre)', p.N.unlocked && !p.C.unlocked);
}
{
  // 2b. a anterior à nova NÃO está concluída (aluno pulou por fora da ordem) e há unidade aberta depois: só a regra nova abre
  const g2 = [U('A', 'B', 'N', 'C')];
  const p2 = { A: P(done), B: P(cur(1)), N: P(locked), C: P(cur(0)) };
  check('anterior não concluída, posterior aberta: só a parte nova abre', JSON.stringify(rule(g2, p2)) === '["N"]' && p2.N.unlocked && !p2.N.completed);
}
{
  // 3. aluno exatamente na unidade seguinte à nova
  const g = [U('A', 'N', 'B')];
  const p = { A: P(done), N: P(locked), B: P(cur(0)) };
  rule(g, p);
  check('aluno logo depois da nova: abre', p.N.unlocked && !p.N.completed);
}
{
  // 4. inserida no começo do nível
  const g = [U('N', 'A', 'B')];
  const p = { N: P(locked), A: P(done), B: P(cur(1)) };
  rule(g, p);
  check('no começo, aluno adiante: abre (1ª do nível) e não conclui', p.N.unlocked && !p.N.completed && !p.N.started);
  const p2 = { N: P(locked), A: { started: false, completed: false, unlocked: true, lessonIdx: 0 }, B: P(locked) };
  rule(g, p2);
  check('no começo, conta nova: a nova é a 1ª, abre; o resto segue a ordem', p2.N.unlocked && p2.A.unlocked && !p2.B.unlocked);
  const p3 = { N: P(locked), A: P(done), B: P(cur(1)) };
  const r3 = open(g, p3);
  check('no começo: só a parte nova da regra também abre', p3.N.unlocked && JSON.stringify(r3) === '["N"]');
}
{
  // 5. encadeamentos: duas novas seguidas, e novas em dois lugares
  const g = [U('A', 'N1', 'N2', 'B', 'N3', 'C', 'N4', 'D')];
  const p = { A: P(done), N1: P(locked), N2: P(locked), B: P(done), N3: P(locked), C: P(cur(1)), N4: P(locked), D: P(locked) };
  const r = rule(g, p);
  check('encadeamento: N1, N2 e N3 abrem (antes de C, que está aberta)', p.N1.unlocked && p.N2.unlocked && p.N3.unlocked, r);
  check('encadeamento: N4 e D (depois de onde o aluno está) continuam trancadas', !p.N4.unlocked && !p.D.unlocked);
  check('encadeamento: nenhuma nova concluída', [p.N1, p.N2, p.N3].every(x => !x.completed && !x.started));
  // abrir N1 não abre a seguinte por "anterior concluída" (abrir não é concluir)
  const g2 = [U('A', 'B', 'N', 'C', 'X')];
  const p4 = { A: P(done), B: P(cur(0)), N: P(locked), C: P(cur(0)), X: P(locked) };
  rule(g2, p4);
  check('encadeamento: abrir a nova não libera a próxima trancada', p4.N.unlocked && !p4.X.unlocked);
}
{
  // 6. idempotência e grupos independentes
  const g = [U('A', 'N', 'B'), U('A2-1', 'A2-N', 'A2-2')];
  const p = { A: P(done), N: P(locked), B: P(cur(0)), 'A2-1': { started: false, completed: false, unlocked: true, lessonIdx: 0 }, 'A2-N': P(locked), 'A2-2': P(locked) };
  rule(g, p);
  const snap = JSON.stringify(p);
  const again = rule(g, p);
  check('idempotente: aplicar de novo não muda nada', again.length === 0 && JSON.stringify(p) === snap);
  check('grupos (níveis) independentes: aluno no A1 não abre a nova do A2', !p['A2-N'].unlocked && !p['A2-2'].unlocked);
  const q = { X: P(cur(0)) };
  open([U('X')], q);
  check('nunca tranca: unidade aberta sozinha continua aberta', q.X.unlocked === true);
  check('unidade sem progresso no mapa é ignorada (não quebra)', open([U('Z', 'X')], { X: P(cur(0)) }).length === 0);
  check('entradas vazias não quebram', open(null, {}).length === 0 && open([[]], {}).length === 0);
}

console.log('== conteúdo atual: nenhum save muda');
{
  const ctx = L.frContext();
  const groups = ctx.__run('LEVELS.map(lvl => UNITS.filter(u => u.level === lvl.id)).filter(g => g.length)');
  L.simulatedSaves(ctx).forEach(s => {
    const up = P(s.block.unitProgress);
    const full = {};
    ctx.UNITS.forEach(u => { full[u.id] = Object.assign({ started: false, completed: false, unlocked: ctx.UNITS.find(x => x.level === u.level) === u, lessonIdx: 0 }, up[u.id] || {}); });
    recalcUnlocked(groups, full);
    const before = JSON.stringify(full);
    const r = open(groups, full);
    check(`"${s.name}": a regra nova não abre nada no conteúdo de hoje`, r.length === 0 && JSON.stringify(full) === before, r);
  });
}

console.log('== carregamento real do fr (applySerializedState) com o conteúdo v2 de teste');
{
  const ctx0 = L.frContext();
  const saves = L.simulatedSaves(ctx0);
  // save 3: A1-1..A1-5 concluídas, A1-6 começada. A1-21 entra depois da A1-3 (atrás do aluno); A1-28 depois da A1-10 (à frente).
  const s = saves[2];
  const ctx = L.frContext();
  L.applyV2(ctx);
  L.loadBlock(ctx, s.block);
  const up = ctx.STATE.unitProgress;
  check('v2: A1-21 (inserida atrás do aluno) aberta', up['A1-21'].unlocked === true);
  check('v2: A1-21 não concluída, não começada, lição 0', up['A1-21'].completed === false && up['A1-21'].started === false && up['A1-21'].lessonIdx === 0);
  check('v2: A1-28 (à frente do aluno) continua trancada', up['A1-28'].unlocked === false);
  check('v2: as unidades do save não mudam (concluídas continuam concluídas)', Object.keys(s.block.unitProgress).every(id => up[id].completed === s.block.unitProgress[id].completed && up[id].lessonIdx === s.block.unitProgress[id].lessonIdx));
  check('v2: cartões da unidade nova não entram na Revisão por causa dela (portão)', ctx.STATE.cards.filter(c => c.unitId === 'A1-21' && c.reps > 0 && !c.released).every(c => !ctx.isCardLessonCompleted(c)));
  // ida e volta pelo caminho real: carregar o save gravado de novo dá o mesmo
  const saved = L.saveBlock(ctx);
  const ctx2 = L.frContext(); L.applyV2(ctx2); L.loadBlock(ctx2, saved);
  check('v2: ida e volta igual (idempotente pelo caminho real)', JSON.stringify(ctx2.STATE.unitProgress) === JSON.stringify(up));
  // aluno que não chegou na A1-3: A1-21 continua trancada
  const ctx3 = L.frContext(); L.applyV2(ctx3); L.loadBlock(ctx3, saves[1].block);
  check('v2: aluno na A1-2 (antes da nova): A1-21 trancada', ctx3.STATE.unitProgress['A1-21'].unlocked === false);
  // conta nova (nenhum progresso): nada abre fora da ordem
  const ctx4 = L.frContext(); L.applyV2(ctx4); L.loadBlock(ctx4, saves[0].block);
  check('v2: conta nova: A1-21 e A1-28 trancadas', !ctx4.STATE.unitProgress['A1-21'].unlocked && !ctx4.STATE.unitProgress['A1-28'].unlocked);
  // duas unidades novas seguidas (A1-21 e A1-22) atrás do aluno: a 2ª só abre pela regra nova (a anterior, A1-21, não
  // está concluída); e o aluno com 24 unidades concluídas tem a A1-28 atrás dele também
  const ctx5 = L.frContext(); L.applyV2(ctx5);
  const at = ctx5.UNITS.findIndex(u => u.id === 'A1-21');
  ctx5.UNITS.splice(at + 1, 0, { id: 'A1-22', level: 'A1', title: 'Nova 2', goal: '', vocab: [{ k: 'A1-22-v0', f: 'le chat', t: 'o gato' }], phrases: [],
    lessons: [{ id: 'nova-2', vocabIdx: [0] }, { id: 'checkpoint', vocabIdx: [], isCheckpoint: true }] });
  const mod = ctx5.MODULES_REF.find(m => m.unitIds.includes('A1-21'));
  mod.unitIds.splice(mod.unitIds.indexOf('A1-21') + 1, 0, 'A1-22');
  ctx5.STATE.unitProgress['A1-22'] = { started: false, completed: false, unlocked: false, lessonIdx: 0, lessonMisses: {} };
  ctx5.STATE.cards = ctx5.buildCardsFromUnits(ctx5.UNITS);
  L.loadBlock(ctx5, saves[3].block);
  const up5 = ctx5.STATE.unitProgress;
  check('v2: duas novas seguidas atrás do aluno: as duas abrem, nenhuma concluída',
    up5['A1-21'].unlocked && up5['A1-22'].unlocked && !up5['A1-21'].completed && !up5['A1-22'].completed && !up5['A1-22'].started);
  check('v2: A1-28 atrás do aluno com 24 concluídas: aberta e não concluída', up5['A1-28'].unlocked && !up5['A1-28'].completed);
}

console.log('== fr e zh: mesma chamada (C1 da paridade, shared/core/curriculo-progresso.js)');
{
  const core = fs.readFileSync(path.join(L.ROOT, 'shared/core/curriculo-progresso.js'), 'utf8');
  const fn = (src, name) => { const a = src.indexOf('function ' + name + '('); return src.slice(a, src.indexOf('\n}\n', a)); };
  check('shared/core: curriculumLoadReconcileUnits chama a regra', /openUnitsBeforeOpenOnes\(trailGroups\(\), STATE\.unitProgress\)/.test(fn(core, 'curriculumLoadReconcileUnits')));
  ['fr', 'zh'].forEach(lang => {
    const src = fs.readFileSync(path.join(L.ROOT, lang, 'app.js'), 'utf8');
    // paridade 5d: applySerializedState é comum (shared/core/estado-salvar.js); o app.js não tem cópia própria
    const comum = fs.readFileSync(path.join(L.ROOT, 'shared/core/estado-salvar.js'), 'utf8');
    check(`${lang}: applySerializedState chama a função comum (e não uma cópia própria)`, fn(comum, 'applySerializedState').includes('curriculumLoadReconcileUnits()') && !/function applySerializedState\(/.test(src) && !/openUnitsBeforeOpenOnes/.test(src));
  });
}

summary('curriculo-ids unidade nova');
