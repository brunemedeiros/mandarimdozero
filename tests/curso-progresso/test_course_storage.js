// E3 / C1: chave do bloco de progresso por curso. (A) função pura courseStorageKey; (B) DIFERENCIAL: o shared/auth.js de ANTES
// do C1 (git show) e o novo, com as mesmas contas fictícias, leem e gravam exatamente o mesmo; (C) com a flag LIGADA (C5)
// um curso novo grava em chave própria e preserva o resto da linha.
// Rodar: node tests/curso-progresso/test_course_storage.js
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const clone = o => JSON.parse(JSON.stringify(o));
const hash = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 12);
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
// auth.js de ANTES do C1, congelado (shared/auth.js lia e gravava direto a chave APP_KEY)
const OLD_AUTH = fs.readFileSync(path.join(__dirname, 'fixtures', 'auth.antes-do-c1.js'), 'utf8');

// ---------- (A) função pura ----------
const reg = require(path.join(ROOT, 'languages/registry.js'));
global.LanguageRegistry = reg.LanguageRegistry;
const CS = require(path.join(ROOT, 'shared/course-storage.js'));
check('flag de cursos por idioma do site começa DESLIGADA', CS.COURSE_PROGRESS_PER_SITE_LANGUAGE === false);
check('frances@pt-BR -> frances (legado, vem do registro)', CS.courseStorageKey('frances@pt-BR') === 'frances');
check('mandarim@pt-BR -> mandarim', CS.courseStorageKey('mandarim@pt-BR') === 'mandarim');
check('frances@en -> própria chave', CS.courseStorageKey('frances@en') === 'frances@en');
check('mandarim@en -> própria chave', CS.courseStorageKey('mandarim@en') === 'mandarim@en');
check('portugues@en -> própria chave (nada de deduzir "pt-BR usa sem sufixo")', CS.courseStorageKey('portugues@en') === 'portugues@en');
check('registro em _meta.courses vence', CS.courseStorageKey('frances@en', { 'frances@en': { storageKey: 'frances-en-x' } }) === 'frances-en-x');
check('registro sem storageKey é ignorado', CS.courseStorageKey('frances@pt-BR', { 'frances@pt-BR': {} }) === 'frances');
check('courseId inválido não quebra', CS.courseStorageKey('lixo') === 'lixo');
check('flag desligada: site em inglês continua no curso legado', CS.activeCourseId('frances', 'en') === 'frances@pt-BR' && CS.courseStorageKeyFor('frances', 'en', null) === 'frances');
check('flag ligada: site em inglês abre frances@en', CS.activeCourseId('frances', 'en', true) === 'frances@en' && CS.courseStorageKeyFor('frances', 'en', null, true) === 'frances@en');
check('flag ligada: pt-BR continua na chave legada', CS.courseStorageKeyFor('mandarim', 'pt-BR', null, true) === 'mandarim');
check('registro no _meta.courses é respeitado em courseStorageKeyFor', CS.courseStorageKeyFor('frances', 'pt-BR', { _meta: { courses: { 'frances@pt-BR': { storageKey: 'frances' } } } }) === 'frances');

// ---------- ambiente de auth (mesmo molde de tests/i18n/test_ui_language_persistence.js) ----------
function fakeEl(){ return { addEventListener(){}, style: { removeProperty(){} }, classList: { add(){}, remove(){}, toggle(){} }, textContent: '' }; }
function makeEnv({ authSrc, row, appKey, uiLang, state, flagOn }){
  const db = { row: row ? clone(row) : null, upserts: [], applied: [], weekly: [], legacyCalls: 0 };
  const supabaseClient = { from(table){
    const q = { select(){ return q; }, eq(){ return q; },
      async maybeSingle(){ return { data: db.row ? { data: clone(db.row) } : null, error: null }; },
      async upsert(payload){ if (table === 'progress'){ db.row = clone(payload.data); db.upserts.push(clone(payload.data)); } if (table === 'weekly_xp'){ const w = clone(payload); delete w.updated_at; db.weekly.push(w); } return { error: null }; } };
    return q; } };
  const sb = { console: { error(){}, log(){}, warn(){} }, supabaseClient, URLSearchParams, Promise, Object, JSON, Number, String, setTimeout, Date,
    location: { search: '' }, document: { getElementById: () => fakeEl(), addEventListener(){}, querySelectorAll: () => [] },
    APP_KEY: appKey, STATE: { xp: state.xp, periodXp: { weekStart: '2026-10-05', amount: 7 } },
    serializeState: () => clone(state), applySerializedState(d){ db.applied.push(clone(d)); }, loadLegacyState(){ db.legacyCalls++; }, showToast(){},
    getUiLang: () => uiLang, setUiLang: async l => l, ensurePeriodXp(){}, t: k => k };
  sb.window = sb; vm.createContext(sb);
  vm.runInContext(read('languages/registry.js'), sb);
  let cs = read('shared/course-storage.js'); if (flagOn) cs = cs.replace('var COURSE_PROGRESS_PER_SITE_LANGUAGE = false;', 'var COURSE_PROGRESS_PER_SITE_LANGUAGE = true;');
  if (authSrc !== OLD_AUTH) vm.runInContext(cs, sb);
  vm.runInContext(read('shared/language-pref.js'), sb);
  vm.runInContext(authSrc, sb);
  sb.run = code => vm.runInContext(code, sb);
  sb.db = db;
  return sb;
}
async function scenario(authSrc, { row, appKey, uiLang, state, flagOn }){
  const env = makeEnv({ authSrc, row, appKey, uiLang, state, flagOn });
  env.run("CURRENT_USER = { id: 'u1' };");
  await env.loadState();
  await env.saveState();
  return { applied: env.db.applied, finalRow: env.db.row, weekly: env.db.weekly };
}

(async () => {
  const frBlock = { xp: 120, totalReviews: 40, totalAudioPlays: 3, streak: 2, cards: [{ id: 'uA1-1-v0', reps: 2 }], unitProgress: { 'A1-1': { completed: true } } };
  const zhBlock = { xp: 80, totalReviews: 10, totalAudioPlays: 0, streak: 1, hanziCards: [{ id: 'h0-c0', reps: 1 }] };
  const rows = {
    'conta só francês': { frances: frBlock, _meta: { currentLearningLanguage: 'fr' } },
    'conta só mandarim': { mandarim: zhBlock, _meta: { currentLearningLanguage: 'zh', uiLanguage: 'en' } },
    'conta com os dois': { frances: frBlock, mandarim: zhBlock, _meta: { currentLearningLanguage: 'fr', uiLanguage: 'pt-BR' } },
    'conta antiga sem _meta': { frances: frBlock },
    'conta zh no formato legado (raiz)': { xp: 5, cards: [{ id: 'x', reps: 1 }] },
    'conta nova (sem linha)': null,
    'conta nova (só _meta)': { _meta: { currentLearningLanguage: 'fr' } },
  };
  // (B) diferencial antigo x novo: 7 contas x 2 idiomas x 2 idiomas do site = 28 cenários
  let n = 0;
  for (const [nome, row] of Object.entries(rows)){
    for (const appKey of ['frances', 'mandarim']){
      for (const uiLang of ['pt-BR', 'en']){
        const state = { xp: 150, totalReviews: 50, totalAudioPlays: 4, streak: 3, marker: appKey + uiLang };
        const a = await scenario(OLD_AUTH, { row, appKey, uiLang, state });
        const b = await scenario(read('shared/auth.js'), { row, appKey, uiLang, state });
        n++;
        check(`${nome} / ${appKey} / ${uiLang}: o que o app recebe ao carregar é idêntico`, hash(a.applied) === hash(b.applied), [a.applied, b.applied]);
        check(`${nome} / ${appKey} / ${uiLang}: a linha gravada é idêntica`, hash(a.finalRow) === hash(b.finalRow), [a.finalRow, b.finalRow]);
        check(`${nome} / ${appKey} / ${uiLang}: XP semanal idêntico`, hash(a.weekly) === hash(b.weekly));
      }
    }
  }
  console.log(`diferencial: ${n} cenários`);

  // guard-rail monotônico continua valendo no bloco certo (mesmo comportamento do antigo)
  for (const authSrc of [OLD_AUTH, read('shared/auth.js')]){
    const env = makeEnv({ authSrc, row: { frances: { xp: 500, totalReviews: 0, totalAudioPlays: 0 } }, appKey: 'frances', uiLang: 'en', state: { xp: 100, totalReviews: 0, totalAudioPlays: 0 } });
    env.run("CURRENT_USER = { id: 'u1' }; progressLoadedOk = true;"); env.loadState = () => {};
    await env.saveState();
    check('guard-rail: XP menor que o salvo é recusado (sem upsert)' + (authSrc === OLD_AUTH ? ' [antigo]' : ' [novo]'), env.db.upserts.length === 0);
  }

  // (C) flag LIGADA (C5): curso novo em chave própria, resto da linha preservado
  {
    const row = { frances: frBlock, mandarim: zhBlock, _meta: { currentLearningLanguage: 'fr', uiLanguage: 'en' } };
    const state = { xp: 9, totalReviews: 1, totalAudioPlays: 0, marker: 'novo-curso' };
    const env = makeEnv({ authSrc: read('shared/auth.js'), row, appKey: 'frances', uiLang: 'en', state, flagOn: true });
    env.run("CURRENT_USER = { id: 'u1' };");
    await env.loadState();
    check('flag ligada: curso novo sem bloco não recebe o progresso do curso pt-BR', env.db.applied.length === 0);
    await env.saveState();
    check('flag ligada: grava em data["frances@en"]', env.db.row['frances@en'] && env.db.row['frances@en'].marker === 'novo-curso');
    check('flag ligada: bloco legado frances intacto', hash(env.db.row.frances) === hash(frBlock));
    check('flag ligada: mandarim e _meta intactos', hash(env.db.row.mandarim) === hash(zhBlock) && env.db.row._meta.uiLanguage === 'en');
    const env2 = makeEnv({ authSrc: read('shared/auth.js'), row: env.db.row, appKey: 'frances', uiLang: 'en', state, flagOn: true });
    env2.run("CURRENT_USER = { id: 'u1' };"); await env2.loadState();
    check('flag ligada: recarregar traz o bloco do curso novo', env2.db.applied.length === 1 && env2.db.applied[0].marker === 'novo-curso');
    const env3 = makeEnv({ authSrc: read('shared/auth.js'), row: Object.assign({}, env.db.row, { _meta: Object.assign({}, env.db.row._meta, { uiLanguage: 'pt-BR' }) }), appKey: 'frances', uiLang: 'pt-BR', state, flagOn: true });
    env3.run("CURRENT_USER = { id: 'u1' };"); await env3.loadState();
    check('flag ligada: voltar para pt-BR traz o progresso antigo, não o do curso novo', env3.db.applied.length === 1 && hash(env3.db.applied[0]) === hash(frBlock));
  }

  // (D) C5: cursos por idioma do site ligados
  {
    const src = read('shared/auth.js');
    const base = { frances: Object.assign({}, frBlock, { periodXp: { weekStart: '2026-10-05', amount: 30 } }), mandarim: zhBlock, _meta: { currentLearningLanguage: 'fr', uiLanguage: 'en' } };
    const stA = { xp: 9, totalReviews: 1, totalAudioPlays: 0, marker: 'A-en' };
    const stB = { xp: 130, totalReviews: 41, totalAudioPlays: 3, marker: 'B-pt' };
    const mk = (row, uiLang, state) => { const e = makeEnv({ authSrc: src, row, appKey: 'frances', uiLang, state, flagOn: true }); e.run("CURRENT_USER = { id: 'u1' };"); return e; };

    const e1 = mk(base, 'en', stA); await e1.loadState(); await e1.saveState();
    check('C5: XP semanal grava a SOMA dos cursos do idioma (7 do curso novo + 30 do legado)', e1.db.weekly.length === 1 && e1.db.weekly[0].amount === 37, e1.db.weekly);
    check('C5: curso novo registrado em _meta.courses', JSON.stringify(Object.keys(e1.db.row._meta.courses)) === '["frances@en"]' && e1.db.row._meta.courses['frances@en'].storageKey === 'frances@en' && typeof e1.db.row._meta.courses['frances@en'].startedAt === 'string');
    check('C5: _meta.currentCourse = curso aberto', e1.db.row._meta.currentCourse === 'frances@en');
    check('C5: demais campos de _meta preservados', e1.db.row._meta.uiLanguage === 'en' && e1.db.row._meta.currentLearningLanguage === 'fr');
    const started = e1.db.row._meta.courses['frances@en'].startedAt;

    // trocar de curso e voltar: os dois progressos preservados
    const row2 = clone(e1.db.row); row2._meta.uiLanguage = 'pt-BR';
    const e2 = mk(row2, 'pt-BR', stB); await e2.loadState(); await e2.saveState();
    check('C5: no curso pt-BR carrega o bloco antigo (não o do curso novo)', e2.db.applied.length === 1 && e2.db.applied[0].marker === undefined && e2.db.applied[0].xp === 120);
    check('C5: curso legado registrado com startedAt null (bloco já existia)', e2.db.row._meta.courses['frances@pt-BR'].storageKey === 'frances' && e2.db.row._meta.courses['frances@pt-BR'].startedAt === null);
    check('C5: currentCourse acompanha', e2.db.row._meta.currentCourse === 'frances@pt-BR');
    check('C5: curso novo continua intacto depois de salvar o pt-BR', e2.db.row['frances@en'].marker === 'A-en' && e2.db.row.frances.marker === 'B-pt');
    check('C5: registro do curso novo não é reescrito (startedAt igual)', e2.db.row._meta.courses['frances@en'].startedAt === started);
    check('C5: XP semanal no pt-BR soma o curso novo (7 + 0 do bloco en sem periodXp = 7)', e2.db.weekly[0].amount === 7, e2.db.weekly);
    const row3 = clone(e2.db.row); row3._meta.uiLanguage = 'en';
    const e3 = mk(row3, 'en', stA); await e3.loadState();
    check('C5: voltar ao curso novo traz o progresso dele', e3.db.applied.length === 1 && e3.db.applied[0].marker === 'A-en');

    // o curso da página é fixado no carregamento: outra aba mudando o idioma da conta não desvia a gravação
    const e4 = mk(base, 'en', stA); await e4.loadState();
    e4.db.row._meta.uiLanguage = 'pt-BR';
    await e4.saveState();
    check('C5: aba antiga continua gravando no curso em que carregou', e4.db.row['frances@en'] && e4.db.row['frances@en'].marker === 'A-en' && e4.db.row.frances.marker === undefined);

    // zh no formato antigo (raiz) não vira progresso do curso novo
    const e5 = makeEnv({ authSrc: src, row: { xp: 5, cards: [{ id: 'x', reps: 1 }] }, appKey: 'mandarim', uiLang: 'en', state: stA, flagOn: true });
    e5.run("CURRENT_USER = { id: 'u1' };"); await e5.loadState();
    check('C5: formato antigo do zh na raiz NÃO é importado para mandarim@en', e5.db.legacyCalls === 0);
    const e6 = makeEnv({ authSrc: src, row: { xp: 5, cards: [{ id: 'x', reps: 1 }] }, appKey: 'mandarim', uiLang: 'pt-BR', state: stA, flagOn: true });
    e6.run("CURRENT_USER = { id: 'u1' };"); await e6.loadState();
    check('C5: formato antigo do zh continua sendo lido no curso legado (pt-BR)', e6.db.legacyCalls === 1);

    // XP semanal: outra semana não soma
    const e7 = mk({ frances: { periodXp: { weekStart: '2026-09-28', amount: 99 } }, _meta: { uiLanguage: 'en' } }, 'en', stA); await e7.loadState(); await e7.saveState();
    check('C5: bloco de outra semana não entra na soma', e7.db.weekly[0].amount === 7, e7.db.weekly);
    // mandarim não soma frances
    const e8 = makeEnv({ authSrc: src, row: { frances: { periodXp: { weekStart: '2026-10-05', amount: 50 } }, _meta: { uiLanguage: 'en' } }, appKey: 'mandarim', uiLang: 'en', state: stA, flagOn: true });
    e8.run("CURRENT_USER = { id: 'u1' };"); await e8.loadState(); await e8.saveState();
    check('C5: idiomas diferentes não somam entre si', e8.db.weekly[0].amount === 7 && e8.db.weekly[0].language_app_key === 'mandarim', e8.db.weekly);

    // "Meus cursos": lista pura
    const mc = fs.readFileSync(path.join(ROOT, 'shared/my-courses.js'), 'utf8');
    const lr = { enabled: () => [{ appKey: 'frances', path: 'fr/', siteLanguages: ['pt-BR', 'en'] }, { appKey: 'mandarim', path: 'zh/', siteLanguages: ['pt-BR', 'en'] }],
      courseStatus: (a, s) => (a === 'mandarim' && s === 'en') ? { status: 'rascunho' } : (a === 'frances' && s === 'en') ? { status: 'beta' } : { status: 'publicado' }, courseIdOf: (a, s) => a + '@' + s };
    const sbx = { LanguageRegistry: lr, window: { addEventListener(){} }, document: { readyState: 'complete', getElementById: () => null } };
    vm.createContext(sbx); vm.runInContext(mc + '\nthis.list = listAvailableCourses;', sbx);
    const aluno = sbx.list('frances', 'pt-BR', false), adm = sbx.list('frances', 'pt-BR', true);
    check('Meus cursos: aluno não vê rascunho; admin vê', aluno.length === 3 && adm.length === 4);
    check('Meus cursos: marca só o curso atual', aluno.filter(c => c.current).length === 1 && aluno.find(c => c.current).courseId === 'frances@pt-BR');
    check('Meus cursos: beta aparece com status beta', aluno.find(c => c.courseId === 'frances@en').status === 'beta');
  }

  console.log(`curso-storage: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
