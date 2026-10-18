// Etapa 0a do currículo (docs/i18n/curriculo/04-lacunas-e-propostas-fr.md, seção 2): utilitários dos testes.
// Tudo roda sobre os arquivos de PRODUÇÃO (shared/study-trail-model.js, fr/content.js, fr/curriculum-changes.js e as
// funções reais de fr/app.js + shared/core extraídas pelo harness da Fase E). Nada de rede.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { loadLang } = require('../fase-e/harness');

const ROOT = path.resolve(__dirname, '..', '..');
const FIELDS = ['stability', 'difficulty', 'due', 'reps', 'lapses', 'state', 'lastReview', 'interval', 'fsrsReps', 'fsrsLapses', 'firstLearnedDate'];

// PRNG determinístico (os saves simulados são sempre os mesmos).
function rng(seed){ let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Contexto do fr com o conteúdo de hoje. Também carrega applySerializedState/isCardLessonCompleted reais.
function frContext(){
  const ctx = loadLang('fr');
  const run = (code) => vm.runInContext(code, ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/card-variants.js'), 'utf8'), ctx, { filename: 'shared/card-variants.js' });
  ctx.__run = run;
  run('STATE.retiredStudyCards = {}; STATE.cardVariants = {}; STATE.reviewRecords = { speedBestScore: 0, speedBestStreak: 0, matchBestMs: null, hardSeenIds: [] }; STATE.checkpointProgress = {};');
  run('UNITS.forEach(u => { STATE.unitProgress[u.id] = { started:false, completed:false, unlocked:false, lessonIdx:0, lessonMisses:{} }; });');
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  return ctx;
}

// Carrega um bloco salvo pelo caminho real (applySerializedState) num contexto novo e devolve o contexto.
function loadBlock(ctx, block){
  ctx.applySerializedState(JSON.parse(JSON.stringify(block)));
  return ctx;
}
// O que serializeState grava do que a Etapa 0 toca (cartões, arquivo, unidades, versão); ver tests/e4 para o caminho inteiro.
function saveBlock(ctx){
  ctx.__run('stampUnitLessonIds(STATE.unitProgress, UNITS)');
  return JSON.parse(JSON.stringify({
    cards: ctx.serializeCardsForSave(ctx.STATE.cards),
    retiredStudyCards: ctx.STATE.retiredStudyCards,
    unitProgress: ctx.STATE.unitProgress,
    checkpointProgress: ctx.STATE.checkpointProgress,
    cardVariants: ctx.STATE.cardVariants,
    reviewRecords: ctx.STATE.reviewRecords,
    _curriculumVersion: ctx.__run('studyCurriculumChanges().version'),
  }));
}

// ---------- saves simulados (formas reais agregadas, sem dado pessoal) ----------
function freshEntries(ctx){ return ctx.serializeCardsForSave(ctx.buildCardsFromUnits(ctx.UNITS)); }
function studied(entry, r, opts){
  const o = opts || {};
  const day = 86400000, now = Date.UTC(2026, 9, 10);
  const states = o.states || ['review'];
  const state = states[Math.floor(r() * states.length)];
  const reps = o.repsMin + Math.floor(r() * (o.repsMax - o.repsMin + 1));
  const lapses = o.lapses ? Math.floor(r() * 3) : 0;
  const stability = +(o.stabMin + r() * (o.stabMax - o.stabMin)).toFixed(4);
  const last = now - Math.floor(r() * 60) * day - Math.floor(r() * day);
  return Object.assign(entry, {
    reps, lapses, state, stability, difficulty: +(3 + r() * 5).toFixed(4), lastReview: last,
    due: last + Math.round(stability * day), interval: Math.max(1, Math.round(stability)),
    fsrsReps: reps, fsrsLapses: lapses, fsrsMigrated: true,
    firstLearnedDate: new Date(last - Math.floor(r() * 90) * day).toISOString().slice(0, 10),
  });
}
const wordIds = (unitId, n) => { const out = []; for (let i = 0; i < n; i++) out.push(`u${unitId}-v${i}`, `u${unitId}-v${i}-b`); return out; };
function unitIdsOfLevel(ctx, level){ return ctx.UNITS.filter(u => u.level === level && u.type !== 'grammar' && (u.vocab || []).length).map(u => u.id); }

function simulatedSaves(ctx){
  const r = rng(20261018);
  const lessonUnits = unitIdsOfLevel(ctx, 'A1');
  const allUnits = ctx.UNITS.filter(u => u.type !== 'grammar' && (u.vocab || []).length).map(u => u.id);
  const phraseIdsOf = (unitIds) => ctx.buildCardsFromUnits(ctx.UNITS).filter(c => c.phraseIdx != null && unitIds.includes(c.unitId)).map(c => c.id);
  const make = (name, completedUnits, startedUnit, progressIds, opts, extra) => {
    const entries = freshEntries(ctx);
    const set = new Set(progressIds);
    entries.forEach(e => { if (set.has(e.id)) studied(e, r, opts); });
    const unitProgress = {};
    completedUnits.forEach(id => { unitProgress[id] = { started: true, completed: true, unlocked: true, lessonIdx: 0, lessonMisses: {}, completedVia: 'lessons', completedAt: '2026-09-20' }; });
    if (startedUnit) unitProgress[startedUnit.id] = { started: true, completed: false, unlocked: true, lessonIdx: startedUnit.lessonIdx, lessonMisses: {} };
    return Object.assign({ name, block: { cards: entries.concat((extra && extra.cards) || []), unitProgress, xp: 100 } });
  };
  const s = [];
  // 1. conta nova: todos os cartões no padrão (nenhum com reps)
  s.push(make('conta nova', [], null, [], {}));
  // 2. 38 cartões progredidos: A1-1 concluída, A1-2 começada (lição 2 em diante), A/B + "Na frase" em review
  {
    const ids = wordIds('A1-1', 10).concat(wordIds('A1-2', 6).slice(0, 12)).concat(phraseIdsOf(['A1-1']).slice(0, 6));
    s.push(make('38 progredidos, 1 concluída, 1 começada', ['A1-1'], { id: 'A1-2', lessonIdx: 2 }, ids.slice(0, 38), { repsMin: 1, repsMax: 2, stabMin: 8, stabMax: 51 }));
  }
  // 3. ~70 progredidos e 5 unidades concluídas
  {
    const done = lessonUnits.slice(0, 5);
    // + français do A1-9 (vai ser fundido) sem o sobrevivente A1-2-v7 estudado
    const ids = done.flatMap(u => wordIds(u, 7)).concat(phraseIdsOf(done)).filter(id => !/^uA1-2-v7/.test(id)).slice(0, 68).concat(['uA1-9-v0', 'uA1-9-v0-b']);
    s.push(make('~70 progredidos, 5 concluídas', done, { id: lessonUnits[5], lessonIdx: 1 }, ids, { repsMin: 1, repsMax: 4, stabMin: 2, stabMax: 60 }));
  }
  // 4. ~167 progredidos, 24 unidades concluídas, lapsos, learning/relearning, firstLearnedDate variados, + 2 órfãos antigos
  {
    // 24 unidades concluídas contando as de gramática (como no bloco real); a 25ª começada
    const grammar = ctx.UNITS.filter(u => u.type === 'grammar').map(u => u.id);
    const done = allUnits.slice(0, 20).concat(grammar.slice(0, 24 - Math.min(20, allUnits.length)));
    const pool = done.flatMap(u => wordIds(u, 10)).concat(phraseIdsOf(done));
    // + récemment (vai ser aposentada) e a frase R4 do A1-5
    const ids = pool.filter(id => !['uA1-20-v9', 'uA1-20-v9-b', 'uA1-5-p11'].includes(id)).slice(0, 164).concat(['uA1-20-v9', 'uA1-20-v9-b', 'uA1-5-p11']);
    const orphan = [studied({ id: 'uA1-1-v99' }, r, { repsMin: 3, repsMax: 5, stabMin: 10, stabMax: 30 }), studied({ id: 'uA1-1-p99' }, r, { repsMin: 1, repsMax: 1, stabMin: 1, stabMax: 2 })];
    s.push(make('~167 progredidos, 24 concluídas, órfãos antigos', done, { id: grammar[grammar.length - 1], lessonIdx: 0 }, ids,
      { repsMin: 1, repsMax: 9, stabMin: 0.5, stabMax: 120, lapses: true, states: ['review', 'review', 'learning', 'relearning'] }, { cards: orphan }));
  }
  // 5. cartões da professora e próprios misturados (o save grava o objeto inteiro deles)
  {
    const ids = wordIds('A1-1', 10);
    const extra = { cards: [
      { id: 't12', origin: 'teacher', rowId: 12, reps: 3, stability: 9.1, state: 'review', lastReview: 1790000000000, due: 1790500000000, flashcardStatus: 'active', deckId: 4 },
      { id: 't13-b', origin: 'teacher', rowId: 13, reps: 1, stability: 2, state: 'learning', lastReview: 1790000000000, due: 1790100000000, flashcardStatus: 'active' },
      { id: 's5', origin: 'self', rowId: 5, reps: 2, stability: 4.4, state: 'review', lastReview: 1790000000000, due: 1790300000000, flashcardStatus: 'active' },
      { id: 's6-r2', origin: 'self', rowId: 6, reps: 0, state: 'new', flashcardStatus: 'active' },
    ] };
    s.push(make('professora + próprios', ['A1-1'], { id: 'A1-2', lessonIdx: 1 }, ids, { repsMin: 1, repsMax: 3, stabMin: 3, stabMax: 40 }, extra));
  }
  return s;
}

// Saves reais anonimizados, se a dona colocar (tests/curriculo-ids/fixtures/real-*.json): cada arquivo é um bloco de
// progresso ({cards, unitProgress, ...}) ou { blocks: { frances: {...}, ... } }. Sem eles, os testes usam só os simulados.
function realSaves(){
  const dir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^real-.*\.json$/.test(f)).sort().flatMap(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j && j.blocks) return Object.keys(j.blocks).map(k => ({ name: f + '#' + k, block: j.blocks[k] }));
    return [{ name: f, block: j }];
  });
}

// ---------- conteúdo v2 de TESTE com as operações reais da seção 5 do 04 (nunca gravado em disco) ----------
// Mexe em ctx.UNITS no lugar (o mesmo array que o código do contexto enxerga) e nas constantes de
// fr/curriculum-changes.js do contexto. Devolve a descrição do que foi feito.
function applyV2(ctx, opts){
  const o = opts || {};
  const run = ctx.__run;
  const U = (id) => ctx.UNITS.find(u => u.id === id);
  const keysOfLesson = (u) => u.lessons.map(l => (l.vocabIdx || []).map(i => u.vocab[i].k));
  const relesson = (u, lessonKeys) => { u.lessons.forEach((l, li) => { if (l.vocabIdx) l.vocabIdx = lessonKeys[li].map(k => u.vocab.findIndex(v => v.k === k)).filter(i => i >= 0); }); };
  const take = (u, k) => { const i = u.vocab.findIndex(v => v.k === k); return u.vocab.splice(i, 1)[0]; };
  const word = (k, f, t) => ({ k, f, t });
  const newUnit = (id, after, title, vocab, phrases) => {
    const at = ctx.UNITS.findIndex(u => u.id === after);
    const u = { id, level: 'A1', title, goal: '', vocab, phrases: phrases || [],
      lessons: [{ id: 'nova-licao-1', vocabIdx: vocab.map((_, i) => i) }, { id: 'checkpoint', vocabIdx: [], isCheckpoint: true }] };
    ctx.UNITS.splice(at + 1, 0, u);
    const mod = ctx.MODULES_REF.find(m => m.unitIds.includes(after));
    mod.unitIds.splice(mod.unitIds.indexOf(after) + 1, 0, id);
    return u;
  };
  ctx.MODULES_REF = run('MODULES');
  // 1. A1-3: quatre..neuf entre trois e dix (chaves novas) e vingt/l'âge/avoir/ans vão para a unidade nova A1-21
  const a3 = U('A1-3'); const l3 = keysOfLesson(a3);
  const moved3 = ['A1-3-v5', 'A1-3-v6', 'A1-3-v7', 'A1-3-v8'].map(k => take(a3, k));
  const novos3 = ['quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'].map((f, i) => word('A1-3-v' + (10 + i), f, f));
  a3.vocab.splice(a3.vocab.findIndex(v => v.k === 'A1-3-v4'), 0, ...novos3);
  l3[1] = ['A1-3-v3', ...novos3.map(v => v.k), 'A1-3-v4'];
  relesson(a3, l3);
  // frases de idade vão junto (mesma chave)
  const agePhrases = a3.phrases.filter(p => ['A1-3-p0', 'A1-3-p1', 'A1-3-p7'].includes(p.k));
  a3.phrases = a3.phrases.filter(p => !agePhrases.includes(p));
  newUnit('A1-21', 'A1-3', 'Idade', moved3, agePhrases);
  // 4. fusões: français/brésilien do A1-9 -> A1-2; entram habiter e la ville no A1-9
  const a9 = U('A1-9'); const l9 = keysOfLesson(a9);
  take(a9, 'A1-9-v0'); take(a9, 'A1-9-v1');
  a9.vocab.unshift(word('A1-9-v10', 'habiter', 'morar'), word('A1-9-v11', 'la ville', 'a cidade'));
  l9[0] = ['A1-9-v10', 'A1-9-v11', 'A1-9-v2'];
  relesson(a9, l9);
  // 5. manger do A1-6 -> A1-5; entra se coucher
  const a6 = U('A1-6'); const l6 = keysOfLesson(a6);
  const iM = a6.vocab.findIndex(v => v.k === 'A1-6-v6');
  a6.vocab.splice(iM, 1, word('A1-6-v10', 'se coucher', 'deitar-se'));
  l6[2] = l6[2].map(k => k === 'A1-6-v6' ? 'A1-6-v10' : k);
  relesson(a6, l6);
  // 8. trente..cent do A1-10 -> unidade nova A1-28
  const a10 = U('A1-10'); const l10 = keysOfLesson(a10);
  const nums = ['A1-10-v6', 'A1-10-v7', 'A1-10-v8', 'A1-10-v9', 'A1-10-v10', 'A1-10-v11', 'A1-10-v12', 'A1-10-v13'].map(k => take(a10, k));
  relesson(a10, l10);
  a10.lessons = a10.lessons.filter(l => !l.vocabIdx || l.vocabIdx.length || l.isCheckpoint);
  newUnit('A1-28', 'A1-10', 'Números até cem', nums);
  // 9. hier do A1-20 -> A1-7; récemment aposentada; entram tôt e tard
  const a20 = U('A1-20'); const l20 = keysOfLesson(a20);
  take(a20, 'A1-20-v0');
  if (!o.keepRecemment) take(a20, 'A1-20-v9');
  a20.vocab.push(word('A1-20-v10', 'tôt', 'cedo'), word('A1-20-v11', 'tard', 'tarde'));
  l20[0] = l20[0].filter(k => k !== 'A1-20-v0');
  l20[2] = l20[2].filter(k => o.keepRecemment || k !== 'A1-20-v9').concat(['A1-20-v10', 'A1-20-v11']);
  relesson(a20, l20);
  // 11. frase R4 do A1-5 aposentada e frase nova com chave nova
  const a5 = U('A1-5');
  a5.phrases = a5.phrases.filter(p => p.k !== 'A1-5-p11').concat([{ k: 'A1-5-p12', f: 'Je vais prendre un café.', t: 'Vou tomar um café.' }]);
  // 3. reordenar A1-2 (palavras) e abrir a unidade com uma lição nova (as lições antigas mudam de posição)
  const a2 = U('A1-2'); const l2 = keysOfLesson(a2);
  a2.vocab.reverse();
  relesson(a2, l2);
  a2.lessons.unshift({ id: 'abertura-nova', vocabIdx: [] });

  const merges = { 'A1-9-v0': 'A1-2-v7', 'A1-9-v1': 'A1-2-v8', 'A1-6-v6': 'A1-5-v7', 'A1-20-v0': 'A1-7-v4' };
  const retired = o.keepRecemment ? ['A1-5-p11'] : ['A1-20-v9', 'A1-5-p11'];
  const retiredLessons = ['A1-10/numeros-30-50', 'A1-10/numeros-60-80', 'A1-10/numeros-90-100'];
  run(`Object.assign(STUDY_KEY_MERGES, ${JSON.stringify(merges)}); STUDY_RETIRED_KEYS.push(...${JSON.stringify(retired)}); RETIRED_LESSON_IDS.push(...${JSON.stringify(retiredLessons)});`);
  ['A1-21', 'A1-28'].forEach(id => { ctx.STATE.unitProgress[id] = { started: false, completed: false, unlocked: false, lessonIdx: 0, lessonMisses: {} }; });
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  return { merges, retired, retiredLessons };
}

module.exports = { ROOT, FIELDS, rng, frContext, loadBlock, saveBlock, simulatedSaves, realSaves, applyV2 };
