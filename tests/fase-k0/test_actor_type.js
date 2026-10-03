// K.0-A -- actor_type: gravação como 'user', leitura aceita 'user'+'student', 'admin' fora.
// Uso: node tests/fase-k0/test_actor_type.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '../..');
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : (fail++, console.log('FAIL', n)); };

// Fake PostgREST-like builder sobre um array de linhas.
function makeClient(rows, inserted){
  return { from(tbl){
    const f = []; let lim = Infinity; let ord = null;
    const b = {
      select(){ return b; },
      eq(c,v){ f.push(r => r[c] === v); return b; },
      neq(c,v){ f.push(r => r[c] !== v); return b; },
      in(c,vs){ f.push(r => vs.includes(r[c])); return b; },
      gte(c,v){ f.push(r => r[c] >= v); return b; },
      lte(c,v){ f.push(r => r[c] <= v); return b; },
      order(c,o){ ord = [c,o]; return b; },
      limit(n){ lim = n; return b; },
      insert(p){ inserted.push(p); return { then(cb){ cb({error:null}); } }; },
      then(res){ let out = rows.filter(r => f.every(fn => fn(r))); if (ord) out = out.sort((a,b)=> a[ord[0]]<b[ord[0]]?1:-1); res({ data: out.slice(0, lim), error: null }); },
    };
    return b;
  } };
}

// ---- dados: espelham a distribuição real (user histórico, student novo, admin)
const mk = (id, actor, type, day, uid) => ({ id, actor_type: actor, event_type: type, user_id: uid, language_app_key: 'frances', device_type: 'desktop', event_name: 'x', meta: null, created_at: `2026-09-${day}T10:00:00Z`, session_id: 's', browser: 'Chrome', os: 'Linux' });
const ROWS = [
  mk(1,'user','lesson_complete','10','u1'), mk(2,'user','tab_switch','11','u2'), mk(3,'user','lesson_complete','12','u1'),
  mk(4,'student','lesson_complete','25','u3'), mk(5,'student','tab_switch','26','u1'),
  mk(6,'admin','lesson_complete','11','adm'), mk(7,'admin','tab_switch','12','adm'),
  mk(8,'user','technical_error','13','u1'), mk(9,'student','technical_perf','27','u3'), mk(10,'admin','technical_error','13','adm'),
  mk(11,'user','page_load','14','u2'),
];

// ---- carrega admin-analytics.js real
const src = fs.readFileSync(path.join(root,'shared/admin-analytics.js'),'utf8');
const ctx = { console, document: { getElementById(){ return null; }, querySelectorAll(){ return []; } }, supabaseClient: makeClient(ROWS, []) };
vm.createContext(ctx);
vm.runInContext(src + `
this.fetchW = fetchUsageEventsForWindow; this.fetchR = fetchAllStudentEventsForRetention; this.fetchT = fetchTechnicalEventsForWindow;
this.TYPES = ANALYTICS_STUDENT_ACTOR_TYPES; this.setState = (o)=>Object.assign(ANALYTICS_STATE,o);`, ctx);
ctx.setState({ languageFilter:'all', deviceFilter:'all' });
(async () => {
  const W = await ctx.fetchW('2026-09-01T00:00:00Z','2026-09-30T23:59:59Z');
  const ids = W.map(r => r.session_id && r.event_type + '|' + r.user_id + '|' + r.created_at);
  t('constante = [user, student]', JSON.stringify(ctx.TYPES) === '["user","student"]');
  // esperado em W: ids 1,2,3,4,5,11 (user+student, sem technical_*, sem admin)
  t('W: histórico user aparece (4 linhas user)', W.filter(r => ROWS.find(x => x.created_at===r.created_at && x.user_id===r.user_id && x.actor_type==='user')).length >= 4);
  t('W: total = 6 (4 user + 2 student, sem technical, sem admin)', W.length === 6);
  t('W: student legado contabilizado', W.some(r => r.user_id==='u3'));
  t('W: nenhum admin', !W.some(r => r.user_id==='adm'));
  t('W: sem technical_*', !W.some(r => /^technical_/.test(r.event_type)));
  t('W: sem duplicação (chaves únicas)', new Set(ids).size === W.length);
  const R = await ctx.fetchR();
  t('R(retenção): 6 linhas, sem admin, sem technical, sem duplicar', R.length === 6 && !R.some(r=>r.user_id==='adm'));
  const T = await ctx.fetchT('2026-09-01T00:00:00Z','2026-09-30T23:59:59Z');
  t('T(técnico): user+student technical, admin fora (2)', T.length === 2 && !T.some(r=>r.user_id==='adm'));
  t('T: só technical_*', T.every(r => /^technical_/.test(r.event_type)));
  // filtros de idioma/dispositivo continuam intactos
  ctx.setState({ languageFilter:'mandarim' });
  t('filtro de idioma ainda aplicado (mandarim -> 0)', (await ctx.fetchW('2026-09-01T00:00:00Z','2026-09-30T23:59:59Z')).length === 0);
  ctx.setState({ languageFilter:'all', deviceFilter:'mobile' });
  t('filtro de dispositivo ainda aplicado (mobile -> 0)', (await ctx.fetchW('2026-09-01T00:00:00Z','2026-09-30T23:59:59Z')).length === 0);
  ctx.setState({ deviceFilter:'all' });
  t('janela de datas ainda aplicada', (await ctx.fetchW('2026-09-24T00:00:00Z','2026-09-30T23:59:59Z')).length === 2);

  // ---- escrita: trackEvent real
  async function run(isAdmin, exclude){
    const inserted = [];
    const c2 = { console, window:{}, navigator:{userAgent:'Mozilla Chrome/1 Linux'}, crypto:{randomUUID:()=>'sid'},
      CURRENT_USER:{id:'u9'}, APP_KEY:'frances', isAdminUser:()=>isAdmin, PROFILE_CACHE:{exclude_own_activity: exclude},
      supabaseClient: makeClient([], inserted), document:{addEventListener(){}} };
    c2.window.addEventListener = ()=>{}; c2.addEventListener = ()=>{};
    vm.createContext(c2);
    vm.runInContext(fs.readFileSync(path.join(root,'shared/analytics.js'),'utf8') + '\nthis.te=trackEvent;', c2);
    c2.te('lesson_complete','x',{});
    return inserted;
  }
  let ins = await run(false, true);
  t('trackEvent aluno grava actor_type=user', ins.length===1 && ins[0].actor_type==='user');
  t('trackEvent aluno NUNCA grava student', !ins.some(r=>r.actor_type==='student'));
  ins = await run(true, true);
  t('admin com exclude_own_activity=true: nada gravado', ins.length===0);
  ins = await run(true, false);
  t('admin com exclude=false: grava actor_type=admin', ins.length===1 && ins[0].actor_type==='admin');
  // arquitetura: nenhum 'student' restante em código executável
  const code = ['shared/analytics.js','shared/admin-analytics.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8').split('\n').filter(l=>!/^\s*\/\//.test(l)).join('\n')).join('\n');
  t("único 'student' executável é o valor legado da constante", (code.match(/'student'/g)||[]).length === 1);
  t('nenhum .eq actor_type restante', !/\.eq\('actor_type'/.test(code));
  console.log(`K.0-A: ${pass} ok, ${fail} falhas`); process.exit(fail?1:0);
})();
