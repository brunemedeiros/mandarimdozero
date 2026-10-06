// Fase 1 da trilha: shared/trail-state-model.js (funções puras) + a fiação
// real em fr/app.js e zh/app.js (recalculateUnlockedUnits, markUnitCompleted,
// completeModuleUnits). Código REAL carregado num sandbox vm; o estado de
// progresso é o que o app realmente grava (lessonIdx volta a 0 ao concluir).
// Rodar: node tests/trilha/test_trail_state_model.js
const vm = require('vm');
const { read, check, summary } = require('../fase-e/harness');

// Extrai uma função top-level por casamento de chaves, começando o corpo
// DEPOIS dos parênteses dos parâmetros (markUnitCompleted tem `{ skipToast }`
// como parâmetro, que enganaria o extrator do harness da Fase E).
function extractFunction(src, name){
  const m = new RegExp('^function\\s+' + name + '\\s*\\(', 'm').exec(src);
  if (!m) throw new Error('função não encontrada: ' + name);
  let j = m.index + m[0].length, pd = 1;
  while (pd > 0){ const c = src[j++]; if (c === '(') pd++; else if (c === ')') pd--; }
  const start = src.indexOf('{', j);
  let depth = 0, inStr = null, inLine = false, inBlock = false;
  for (let k = start; k < src.length; k++){
    const c = src[k], n = src[k + 1];
    if (inLine){ if (c === '\n') inLine = false; continue; }
    if (inBlock){ if (c === '*' && n === '/'){ inBlock = false; k++; } continue; }
    if (inStr){ if (c === '\\') k++; else if (c === inStr) inStr = null; continue; }
    if (c === '/' && n === '/'){ inLine = true; continue; }
    if (c === '/' && n === '*'){ inBlock = true; continue; }
    if (c === '"' || c === "'" || c === '`'){ inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}'){ depth--; if (depth === 0) return src.slice(m.index, k + 1); }
  }
  throw new Error('chaves desbalanceadas: ' + name);
}

function load(lang){
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, Set, Map });
  const run = (c, f) => vm.runInContext(c, ctx, { filename: f });
  run(read('shared/trail-state-model.js'), 'trail-state-model.js');
  run(read(lang + '/content.js') + '\n;this.UNITS=UNITS;this.LEVELS=LEVELS;' + (lang === 'fr' ? 'this.MODULES=MODULES;' : ''), 'content.js');
  const src = read(lang + '/app.js');
  const fns = ['trailGroups', 'recalculateUnlockedUnits', 'markUnitCompleted'].concat(lang === 'fr' ? ['unitsOfLevel', 'completeModuleUnits'] : []);
  fns.forEach(f => run(extractFunction(src, f), lang + '/app.js#' + f));
  // dependências com efeitos colaterais: stubs que só contam chamadas
  run(`this.calls = { xp: 0, fsrs: 0 };
       this.addXP = n => { calls.xp += n; };
       this.registerStudyToday = () => {}; this.maybeShowStreakCelebration = () => {};
       this.registerDailyLessonCompleted = () => {}; this.registerDailyStars = () => {};
       this.lessonStars = () => 0; this.trackEvent = () => {}; this.showToast = () => {};
       this.saveState = () => {}; this.setTimeout = () => {};
       this.todayStr = () => '2026-10-06';
       this.registerExerciseCorrect = () => { calls.fsrs++; };
       this.STATE = { unitProgress: {}, checkpointProgress: {}, levelTestProgress: {} };
       this.UNITS.forEach((u, i) => { STATE.unitProgress[u.id] = { started:false, completed:false, unlocked:false, lessonIdx:0, lessonMisses:{} }; });`, 'state');
  if (lang === 'fr') run('MODULES.forEach(m => { STATE.checkpointProgress[m.id] = { completed:false, bestScore:0 }; });', 'cp');
  return ctx;
}
const groupsOf = (ctx, lang) => lang === 'fr' ? ctx.LEVELS.map(l => ctx.UNITS.filter(u => u.level === l.id)) : [ctx.UNITS];
const reset = ctx => vm.runInContext('UNITS.forEach(u => { STATE.unitProgress[u.id] = { started:false, completed:false, unlocked:false, lessonIdx:0, lessonMisses:{} }; })', ctx);

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = load(lang);
  const G = groupsOf(ctx, lang);
  const P = () => ctx.STATE.unitProgress;
  const first = G[0][0], second = G[0][1], third = G[0][2];

  // --- recalcUnlocked via função REAL do app
  ctx.recalculateUnlockedUnits();
  check(lang + ': usuário novo: 1ª unidade liberada, 2ª trancada', P()[first.id].unlocked === true && P()[second.id].unlocked === false);
  if (lang === 'fr') check('fr: 1ª unidade de CADA nível nasce liberada', G.filter(g => g.length).every(g => P()[g[0].id].unlocked === true));
  if (lang === 'fr') check('fr: nível sem unidades (A2 ainda vazio) não quebra o módulo', G.some(g => g.length === 0) && ctx.nextTrailItem(G, P()) !== undefined);

  // --- estados: usuário novo
  check(lang + ': novo: 1ª = current, 2ª = locked', ctx.trailItemState(first, G, P()) === 'current' && ctx.trailItemState(second, G, P()) === 'locked');
  let n = ctx.nextTrailItem(G, P());
  check(lang + ': novo: Continuar = lição 0 da 1ª unidade', n.unitId === first.id && n.lessonIdx === 0 && n.lessonCount === first.lessons.length, n);

  // --- em andamento (estado real: lição 2 feita)
  P()[first.id] = { started: true, completed: false, unlocked: true, lessonIdx: 2, lessonMisses: {} };
  n = ctx.nextTrailItem(G, P());
  check(lang + ': andamento: Continuar = lição seguinte (idx 2)', n.unitId === first.id && n.lessonIdx === 2, n);

  // --- conclui a 1ª pelo fluxo REAL (markUnitCompleted): lessonIdx volta a 0
  P()[first.id].lessonIdx = 0;
  ctx.markUnitCompleted(first.id, 100, { skipToast: true });
  ctx.recalculateUnlockedUnits();
  check(lang + ': concluída estudando: estado done, completedVia lessons + data', ctx.trailItemState(first, G, P()) === 'done' && P()[first.id].completedVia === 'lessons' && P()[first.id].completedAt === '2026-10-06', P()[first.id]);
  check(lang + ': liberou a 2ª, que vira a única current', ctx.trailItemState(second, G, P()) === 'current' && ctx.nextTrailItem(G, P()).unitId === second.id);
  check(lang + ': só UMA unidade current na trilha', G.flat().filter(u => ctx.trailItemState(u, G, P()) === 'current').length === 1);

  // --- save ANTIGO: completed sem completedVia -> done (lessons), nunca skipped
  reset(ctx);
  P()[first.id] = { started: true, completed: true, unlocked: true, lessonIdx: 0, lessonMisses: {} };
  ctx.recalculateUnlockedUnits();
  check(lang + ': save antigo sem completedVia = done (não "pulada")', ctx.trailItemState(first, G, P()) === 'done');
  check(lang + ': completedVia desconhecido tratado como lessons', ctx.unitCompletedVia({ completed: true, completedVia: 'xyz' }) === 'lessons');
  check(lang + ': unidade não concluída não tem completedVia', ctx.unitCompletedVia({ completed: false, completedVia: 'skip_test' }) === null);

  // --- trilha concluída
  reset(ctx);
  G.flat().forEach(u => { P()[u.id].started = true; P()[u.id].completed = true; });
  ctx.recalculateUnlockedUnits();
  check(lang + ': tudo concluído: nextTrailItem = null, nenhuma current', ctx.nextTrailItem(G, P()) === null && G.flat().every(u => ctx.trailItemState(u, G, P()) !== 'current'));

  // --- unidade sem lições (gramática no fr)
  if (lang === 'fr'){
    const gram = ctx.UNITS.find(u => u.type === 'grammar');
    const gg = [[gram]]; const gp = { [gram.id]: { started: false, completed: false, unlocked: true, lessonIdx: 0 } };
    const gn = ctx.nextTrailItem(gg, gp);
    check('fr: unidade de gramática (sem lições): lessonIdx null, lessonCount 0', gn.unitId === gram.id && gn.lessonIdx === null && gn.lessonCount === 0, gn);
  }
  // lessonIdx fora da faixa não quebra
  const u0 = G[0][0];
  const oob = ctx.nextTrailItem([[u0]], { [u0.id]: { completed: false, unlocked: true, lessonIdx: 999 } });
  check(lang + ': lessonIdx fora da faixa é limitado à última lição', oob.lessonIdx === u0.lessons.length - 1, oob);
  check(lang + ': progress sem entrada = locked, não lança', ctx.trailItemState({ id: 'nao-existe' }, G, P()) === 'locked');
}

// --- PULAR (só fr: Ponto de verificação do módulo) com função REAL
console.log('== fr: pular via Ponto de verificação');
{
  const ctx = load('fr');
  const G = groupsOf(ctx, 'fr'); const P = () => ctx.STATE.unitProgress;
  const m1 = ctx.MODULES[0];
  const ids = m1.unitIds;
  // aluno concluiu ESTUDANDO a 1ª unidade do módulo, depois passa no ponto
  P()[ids[0]] = { started: true, completed: true, unlocked: true, lessonIdx: 0, lessonMisses: {}, completedVia: 'lessons', completedAt: '2026-10-01' };
  ctx.completeModuleUnits(m1, 80);
  check('fr: unidade já concluída estudando NÃO é reclassificada como pulada', P()[ids[0]].completedVia === 'lessons' && P()[ids[0]].completedAt === '2026-10-01', P()[ids[0]]);
  const skipped = ids.slice(1).filter(id => ctx.UNITS.find(u => u.id === id));
  check('fr: demais unidades do módulo ficam skip_test + data', skipped.every(id => P()[id].completed && P()[id].completedVia === 'skip_test' && P()[id].completedAt === '2026-10-06'), skipped.map(id => P()[id]));
  const u2 = ctx.UNITS.find(u => u.id === ids[1]);
  check('fr: trailItemState = skipped', ctx.trailItemState(u2, G, P()) === 'skipped');
  // refazer o ponto não reclassifica
  ctx.completeModuleUnits(m1, 90);
  check('fr: refazer o ponto mantém completedVia', P()[ids[0]].completedVia === 'lessons' && P()[ids[1]].completedVia === 'skip_test');
  // a próxima unidade (primeira não concluída em ordem) continua sendo a única current
  ctx.recalculateUnlockedUnits();
  const cur = G.flat().filter(u => ctx.trailItemState(u, G, P()) === 'current');
  check('fr: depois de pular o módulo 1, a atual é a 1ª unidade não concluída', cur.length === 1 && !ids.includes(cur[0].id), cur.map(u => u.id));
  // Fase 6: o pulo NÃO dá XP e NÃO inventa nota "Bom" no FSRS (decisão da professora)
  check('fr: pulo sem XP e sem nota "Bom" no FSRS (fase 6)', ctx.calls.xp === 0 && ctx.calls.fsrs === 0, ctx.calls);
}

// --- Equivalência: nova recalcUnlocked == regra antiga, em muitos estados
console.log('== equivalência com a regra antiga');
for (const lang of ['fr', 'zh']){
  const ctx = load(lang); const G = groupsOf(ctx, lang);
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let bad = 0;
  for (let t = 0; t < 300; t++){
    const mk = () => { const p = {}; G.flat().forEach(u => { p[u.id] = { completed: rnd() < 0.4, unlocked: rnd() < 0.3 }; }); return p; };
    const a = mk(); const b = JSON.parse(JSON.stringify(a));
    // regra antiga (copiada dos 2 apps antes da Fase 1)
    G.forEach(units => units.forEach((u, i) => {
      const prog = b[u.id];
      if (i === 0){ prog.unlocked = true; return; }
      prog.unlocked = b[units[i - 1].id]?.completed || prog.unlocked;
    }));
    ctx.recalcUnlocked(G, a);
    if (G.flat().some(u => !!a[u.id].unlocked !== !!b[u.id].unlocked)) bad++;
  }
  check(lang + ': recalcUnlocked ≡ regra antiga em 300 estados aleatórios', bad === 0, bad);
}
summary('Fase 1 trail-state-model');
