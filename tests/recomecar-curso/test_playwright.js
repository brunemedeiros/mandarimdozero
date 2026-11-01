// Recomeçar o curso (migration 123) e retomada guiada, no navegador real (Playwright/Chromium), fr e zh, arquivos de PRODUÇÃO.
// Só o Supabase é trocado por um stub com "banco" guardado no localStorage do contexto (sobrevive ao recarregar a página);
// restart_course / undo_restart_course do stub seguem a regra da migration 123 (a regra do servidor em si é testada em test_123.sql).
// Cobre: seção em Configurações (o que zera e o que fica, por site), confirmação forte (caixa + botão vermelho com texto --on-vivid),
// Esc fecha, recomeçar (RPC com a chave do bloco, página recarrega, trilha e XP zerados, aviso "Pronto!", aviso de desfazer com data),
// desfazer (progresso volta), aba antiga (outra aba recarrega; aba que tenta salvar é barrada), retomada aos 60 dias (aparece uma vez,
// Revisão rápida abre a Revisão), aluno vinculado vê a nota da professora, sino e ficha da professora, site em inglês sem português,
// 44px e sem rolagem lateral no celular, 0 erros de página.
// Rodar: node tests/recomecar-curso/test_playwright.js   (SHOTS=dir salva capturas fr/zh x claro/escuro x 390/1280)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const NOW = '2026-10-30T11:00:00-03:00';
const BLOCK = { fr: 'frances', zh: 'mandarim' };

// Banco do stub: localStorage['__db'] = { row, backups: [], rpcs: [], upserts: n, linked }.
const STUB = `(function(){
  const LS = window.localStorage;
  const db = () => JSON.parse(LS.getItem('__db'));
  const put = (d) => LS.setItem('__db', JSON.stringify(d));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const KEEP = ['streak', 'lastStudyDay', 'lastReviewReminderDay', 'activityLog', 'dailyLessonsLog', 'hadStreakComeback', 'bestStreak', 'studyGoal', 'studySettings', '_curriculumVersion'];
  const mk = (table) => { let single = false, op = 'select', payload = null; const b = new Proxy({}, { get(_, p){
    if (p === 'then') return (ok, ko) => {
      const d = db(); let data = single ? null : [];
      if (table === 'progress' && op === 'upsert'){ d.row = clone(payload.data); d.upserts = (d.upserts || 0) + 1; put(d); return Promise.resolve({ data: null, error: null }).then(ok, ko); }
      if (table === 'progress' && single) data = { data: clone(d.row) };
      if (table === 'course_restart_backups') data = d.backups.slice().reverse().map(x => ({ id: x.id, course_key: x.course_key, created_at: x.created_at, expires_at: x.expires_at, restored_at: x.restored_at || null, superseded_at: x.superseded_at || null, purged_at: null }));
      if (table === 'teacher_students') data = d.linked ? [{ id: 1 }] : [];
      return Promise.resolve({ data, error: null }).then(ok, ko);
    };
    if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
    if (p === 'upsert') return (v) => { op = 'upsert'; payload = v; return b; };
    return () => b; } }); return b; };
  const user = { id: 'u-rc', email: 'ana@exemplo.com', user_metadata: { full_name: 'Ana Souza' }, app_metadata: { provider: 'email' }, created_at: new Date().toISOString() };
  const client = { auth: { getSession: async () => ({ data: { session: { user, access_token: 'x' } } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async (name, args) => {
      const d = db(); d.rpcs.push([name, args]);
      if (name === 'restart_course'){
        const b = d.row[args.p_course_key];
        if (!b){ put(d); return { data: { error: 'no_course' }, error: null }; }
        const epoch = (Number(b.restartEpoch) || 0) + 1, now = new Date().toISOString();
        const nb = { cards: (b.cards || []).filter(c => c.origin === 'teacher' || c.origin === 'self'), restartEpoch: epoch, restartedAt: now };
        KEEP.forEach(k => { if (k in b) nb[k] = b[k]; });
        d.backups.forEach(x => { if (x.course_key === args.p_course_key && !x.restored_at) x.superseded_at = now; });
        const id = d.backups.length + 1;
        d.backups.push({ id, course_key: args.p_course_key, epoch, block: b, created_at: now, expires_at: new Date(Date.now() + 30 * 86400000).toISOString() });
        d.row[args.p_course_key] = nb; put(d);
        return { data: { ok: true, backup_id: id, epoch, restarted_at: now }, error: null };
      }
      if (name === 'undo_restart_course'){
        const x = d.backups.find(y => y.id === args.p_backup_id);
        if (!x || x.restored_at || x.superseded_at){ put(d); return { data: { error: 'superseded' }, error: null }; }
        d.row[x.course_key] = Object.assign(clone(x.block), { restartEpoch: x.epoch + 1 }); x.restored_at = new Date().toISOString(); put(d);
        return { data: { ok: true, epoch: x.epoch + 1 }, error: null };
      }
      put(d); return { data: null, error: null };
    } };
  window.supabase = { createClient: () => client };
})();`;

function dayAgo(n){ const d = new Date(Date.parse(NOW) - n * 86400000); return d.toISOString().slice(0, 10); }
// Bloco com progresso de verdade: 1ª unidade concluída, XP 1840, cartão da trilha estudado, cartão da professora.
function rowFor(app, lang, o){
  const key = lang === 'en' ? BLOCK[app] + '@en' : BLOCK[app];
  const last = o.lastDay || dayAgo(1);
  const block = { xp: 1840, totalReviews: 120, unitProgress: { 1: { unlocked: true, started: true, completed: true, lessonIdx: 0, lessonMisses: {} }, 2: { unlocked: true, started: true, completed: false, lessonIdx: 1, lessonMisses: {} } },
    streak: 4, lastStudyDay: last, activityLog: { [last]: 3 }, welcome: { a: '2026-09-01', b: '2026-09-01' }, periodXp: { weekStart: '2026-10-26', amount: 60 },
    cards: [{ id: 't77', origin: 'teacher', rowId: 77, reps: 3, stability: 4, state: 'review', due: 0 }], studyGoal: { minutes: 15 } };
  return { _meta: { uiLanguage: lang }, _account: { streak: 4, lastStudyDay: last, bestStreak: 11, activityLog: { [last]: 3 } }, [key]: block };
}

let pass = 0, fail = 0;
function check(label, cond, extra){ if (cond) pass++; else { fail++; console.log('  FALHOU:', label, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } }
const PT_WORDS = /\b(Recomeçar|recomeçar|Desfazer|desfazer|Volta|zero\b.*curso|Continua|Lições|unidades|memória|conquistas|missões|Desafios|Ditados|sequência|professora|Cancelar|Entendi|Que bom|Continuar|revisão|Ponto de verificação|Dá para|Você)\b/;

async function openApp(browser, base, app, o){
  const mobile = o.width < 600;
  const ctx = o.ctx || await browser.newContext({ viewport: { width: o.width, height: mobile ? 844 : 860 }, serviceWorkers: 'block', locale: o.lang, timezoneId: 'America/Sao_Paulo', hasTouch: mobile, isMobile: mobile });
  if (!o.ctx){
    // Tema desde o começo (app_theme, shared/theme.js): trocar depois deixa a captura no meio da transição de cor.
    await ctx.addInitScript(({ lang, seed, theme }) => {
      try { localStorage.setItem('ui-language', lang); localStorage.setItem('ui-language-gate', lang); localStorage.setItem('app_theme', theme); if (!localStorage.getItem('__db')) localStorage.setItem('__db', seed); } catch (e) {}
    }, { lang: o.lang, theme: o.theme || 'light', seed: JSON.stringify({ row: rowFor(app, o.lang, o), backups: [], rpcs: [], upserts: 0, linked: !!o.linked }) });
  }
  const page = await ctx.newPage();
  // Avisos (toasts) mostrados nesta carga da página, para conferir mesmo depois de sumirem.
  await page.addInitScript(() => { window.__toastLog = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('toast')) window.__toastLog.push(n.textContent); })))
    .observe(document, { childList: true, subtree: true }); });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.clock.setFixedTime(new Date(NOW));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.goto(`${base}/${app}/index.html`);
  await waitLoaded(page);
  await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), o.theme || 'light');
  return { ctx, page, errs };
}
async function waitLoaded(page){
  await page.waitForFunction(() => typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id && progressLoadedOk && typeof RecomecarCurso !== 'undefined', null, { timeout: 25000 });
  await page.waitForTimeout(900);
}
const dbOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('__db')));
async function openSettings(page){
  await page.evaluate(() => { switchTab('settings'); });
  await page.waitForFunction(() => { const b = document.getElementById('settings-restart-box'); return b && !b.hidden && b.querySelector('#restart-course-open'); }, null, { timeout: 5000 });
  await page.waitForTimeout(300);
}
async function shot(page, name, sel){
  if (!SHOTS) return;
  const vp = page.viewportSize();
  if (sel){
    const r = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: 'center' }); return null; }, sel);
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), clip: { x: 0, y: 0, width: vp.width, height: vp.height } });
}

async function flow(browser, base, app, o){
  const tag = `${app}/${o.lang}/${o.width}/${o.theme || 'light'}`;
  const mobile = o.width < 600;
  const key = o.lang === 'en' ? BLOCK[app] + '@en' : BLOCK[app];
  const sp = `${app}-${o.lang === 'en' ? 'en-' : ''}${o.theme || 'light'}-${o.width}`;
  const { ctx, page, errs } = await openApp(browser, base, app, Object.assign({ linked: true }, o));
  const before = await page.evaluate(() => ({ xp: STATE.xp, done: Object.values(STATE.unitProgress).filter(p => p.completed).length }));
  check(`${tag}: carregou o curso com progresso (XP 1840, 1 unidade concluída)`, before.xp === 1840 && before.done === 1, before);

  // Seção em Configurações
  await openSettings(page);
  const box = await page.evaluate(() => { const b = document.getElementById('settings-restart-box'); const btn = b.querySelector('#restart-course-open'); const cs = getComputedStyle(btn);
    return { text: b.innerText, h: Math.round(btn.getBoundingClientRect().height), bg: cs.backgroundColor, color: cs.color, undo: !!b.querySelector('#restart-course-undo-open') }; });
  check(`${tag}: seção "Recomeçar este curso" com o nome do curso`, (o.lang === 'en' ? /Restart this course/ : /Recomeçar este curso/).test(box.text) && (o.lang === 'en' ? /French|Chinese/ : /Francês|Chinês|francês|chinês/).test(box.text), box.text);
  check(`${tag}: sem cópia ainda, sem botão de desfazer`, !box.undo);
  if (mobile) check(`${tag}: botão com 44px no celular`, box.h >= 44, box.h);
  await shot(page, `01-configuracoes-${sp}`, '#settings-restart-box');

  // Confirmação
  await page.click('#restart-course-open');
  await page.waitForFunction(() => document.getElementById('restart-course-modal').style.display === 'flex');
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => { const y = document.getElementById('restart-course-yes'); const cs = getComputedStyle(y); const root = getComputedStyle(document.documentElement);
    return { text: document.getElementById('restart-course-modal').innerText, disabled: y.disabled, bg: cs.backgroundColor, color: cs.color, err: root.getPropertyValue('--error-red').trim(), onv: root.getPropertyValue('--on-vivid').trim(),
      teacher: !document.getElementById('restart-course-teacher-note').hidden, focusIn: document.getElementById('restart-course-modal').contains(document.activeElement),
      scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, checkH: Math.round(document.querySelector('.rc-check').getBoundingClientRect().height) }; });
  check(`${tag}: janela lista o que zera e o que fica`, o.lang === 'en' ? /Goes back to zero[\s\S]*Stays as it is/.test(m.text) : /Volta para o zero[\s\S]*Continua como está/.test(m.text), m.text.slice(0, 200));
  if (app === 'fr') check(`${tag}: fr lista Desafios e Ditados, sem hanzi`, (o.lang === 'en' ? /Challenges[\s\S]*Dictations/ : /Desafios[\s\S]*Ditados/).test(m.text) && !/[Hh]anzi/.test(m.text));
  else check(`${tag}: zh lista hanzi e histórias, sem Desafios`, (o.lang === 'en' ? /Hanzi[\s\S]*Stories/ : /Hanzi[\s\S]*Histórias/).test(m.text) && !/Desafios|Challenges/.test(m.text));
  check(`${tag}: botão vermelho desligado até marcar a caixa`, m.disabled);
  check(`${tag}: aluno vinculado vê o aviso da professora`, m.teacher);
  check(`${tag}: foco dentro da janela`, m.focusIn);
  if (mobile) check(`${tag}: caixa de confirmação com 44px e sem rolagem lateral`, m.checkH >= 44 && !m.scrollX, m);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check(`${tag}: Esc fecha a janela`, await page.evaluate(() => document.getElementById('restart-course-modal').style.display === 'none'));
  await page.click('#restart-course-open');
  await page.waitForTimeout(300);
  await page.click('#restart-course-check');
  const on = await page.evaluate(() => { const y = document.getElementById('restart-course-yes'); const cs = getComputedStyle(y);
    const probe = document.createElement('span'); probe.style.cssText = 'color:var(--on-vivid);background:var(--error-red)'; document.body.appendChild(probe);
    const pc = getComputedStyle(probe); const exp = { color: pc.color, bg: pc.backgroundColor }; probe.remove();
    return { disabled: y.disabled, bg: cs.backgroundColor, color: cs.color, exp }; });
  check(`${tag}: marcou a caixa: botão liga, fundo --error-red e texto --on-vivid do tema`, !on.disabled && on.bg === on.exp.bg && on.color === on.exp.color, on);
  await shot(page, `02-confirmacao-${sp}`);

  // Outra aba aberta antes (mesmo contexto: mesmo "banco")
  const other = await openApp(browser, base, app, Object.assign({}, o, { ctx }));
  await other.page.evaluate(() => { window.__reloadedMark = 1; });

  await page.click('#restart-course-yes');
  await page.waitForLoadState('load');
  await waitLoaded(page);
  await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), o.theme || 'light');
  let d = await dbOf(page);
  check(`${tag}: RPC restart_course com a chave do bloco (${key})`, d.rpcs.some(r => r[0] === 'restart_course' && r[1].p_course_key === key), d.rpcs);
  const after = await page.evaluate(() => ({ xp: STATE.xp, done: Object.values(STATE.unitProgress).filter(p => p && p.completed).length, epoch: RecomecarCurso._state.epoch, t77: (STATE.cards.find(c => c.id === 't77') || {}).reps, streak: STATE.streak, best: STATE.bestStreak, welcome: !!(STATE.welcome && STATE.welcome.a) }));
  check(`${tag}: depois de recomeçar: XP 0, nenhuma unidade concluída, época 1`, after.xp === 0 && after.done === 0 && after.epoch === 1, after);
  // Memória do cartão da professora: no bloco (a RPC mantém) ou em _lang (P1: o 1º salvar guarda lá a cópia com histórico).
  const dbx = await dbOf(page);
  const t77 = ((dbx.row[key].cards || []).concat(((dbx.row._lang || {})[BLOCK[app]] || {}).cards || [])).find(c => c.id === 't77');
  check(`${tag}: ficam a sequência (4), o recorde (11) e a memória do cartão da professora (reps 3)`, after.streak === 4 && after.best === 11 && t77 && t77.reps === 3, [after, t77]);
  check(`${tag}: boas-vindas da 1ª lição voltam (marca apagada)`, !after.welcome);
  check(`${tag}: aviso "Pronto!" aparece`, await page.evaluate((en) => window.__toastLog.some(x => (en ? /course restarted from zero/ : /O curso recomeçou do zero/).test(x)), o.lang === 'en'), await page.evaluate(() => window.__toastLog));
  d = await dbOf(page);
  check(`${tag}: 1º salvar do bloco recomeçado leva a época`, d.row[key].restartEpoch === 1 && d.row[key].progressSummary, Object.keys(d.row[key]));
  // A outra aba recarregou sozinha (sinal entre abas)
  await other.page.waitForFunction(() => typeof window.__reloadedMark === 'undefined' && typeof RecomecarCurso !== 'undefined' && progressLoadedOk, null, { timeout: 15000 }).catch(() => {});
  check(`${tag}: a outra aba aberta recarregou e mostra o curso recomeçado`, await other.page.evaluate(() => typeof window.__reloadedMark === 'undefined' && STATE.xp === 0).catch(() => false));
  await other.page.close();
  if (SHOTS){ await page.evaluate(() => switchTab('path')); await page.waitForTimeout(500); await shot(page, `03-trilha-zerada-${sp}`); }

  // Aviso de desfazer
  await openSettings(page);
  await page.waitForFunction(() => !!document.getElementById('restart-course-undo-open'), null, { timeout: 5000 }).catch(() => {});
  const notice = await page.evaluate(() => { const b = document.getElementById('settings-restart-box'); return b.querySelector('.rc-desfazer') ? b.querySelector('.rc-desfazer').innerText : ''; });
  check(`${tag}: aviso "Você pode desfazer até DD/MM"`, o.lang === 'en' ? /restarted this course on Oct 30\. You can undo it until Nov 29/.test(notice) : /recomeçou este curso em 30\/10\. Dá para desfazer até 29\/11/.test(notice), notice);
  await shot(page, `04-aviso-desfazer-${sp}`, '#settings-restart-box');

  // Aba antiga que tenta salvar (sem o sinal): barrada
  const stale = await openApp(browser, base, app, Object.assign({}, o, { ctx }));
  await stale.page.evaluate(() => { window.__mark2 = 1; });
  await page.evaluate(() => supabaseClient.rpc('restart_course', { p_course_key: RecomecarCurso._state.blockKey }));
  const ups = (await dbOf(page)).upserts;
  await stale.page.evaluate(() => { STATE.xp = 999; return saveState(); });
  const d2 = await dbOf(page);
  check(`${tag}: aba antiga que tenta salvar depois de um recomeço é barrada (não grava)`, d2.upserts === ups && d2.row[key].restartEpoch === 2 && !d2.row[key].xp, { ups, now: d2.upserts, ep: d2.row[key].restartEpoch });
  await stale.page.waitForFunction(() => typeof window.__mark2 === 'undefined', null, { timeout: 8000 }).catch(() => {});
  check(`${tag}: aba antiga recarrega sozinha`, await stale.page.evaluate(() => typeof window.__mark2 === 'undefined').catch(() => false));
  await stale.page.close();
  // volta a página principal para a época 2
  await page.reload(); await waitLoaded(page);
  await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), o.theme || 'light');

  // Desfazer o 2º recomeço (volta ao 1º) e depois... o 1º não desfaz mais; aqui conferimos o caminho da janela
  await openSettings(page);
  await page.waitForFunction(() => !!document.getElementById('restart-course-undo-open'), null, { timeout: 5000 });
  await page.click('#restart-course-undo-open');
  await page.waitForFunction(() => document.getElementById('restart-undo-modal').style.display === 'flex');
  await page.waitForTimeout(300);
  const um = await page.evaluate(() => document.getElementById('restart-undo-modal').innerText);
  check(`${tag}: janela de desfazer explica que o estudo depois do recomeço se perde`, o.lang === 'en' ? /Undo the restart\?[\s\S]*after restarting is lost/.test(um) : /Desfazer o recomeço\?[\s\S]*depois de recomeçar se perde/.test(um), um);
  await shot(page, `05-desfazer-${sp}`);
  if (o.lang !== 'en' && o.width >= 600) {
    // desfazer de verdade: precisa voltar ao 1º estado. Para isso desfaz o 2º (volta ao 1º recomeço) -- e o progresso original
    // volta quando a cópia é a do 1º recomeço: usamos um banco novo para o caminho completo.
  }
  await page.click('#restart-undo-yes');
  await page.waitForLoadState('load'); await waitLoaded(page);
  d = await dbOf(page);
  check(`${tag}: desfazer chama undo_restart_course e a página recarrega (época 3)`, d.rpcs.some(r => r[0] === 'undo_restart_course') && (await page.evaluate(() => RecomecarCurso._state.epoch)) === 3);
  check(`${tag}: aviso "Seu progresso voltou"`, await page.evaluate((en) => window.__toastLog.some(x => (en ? /Your progress is back/ : /Seu progresso voltou/).test(x)), o.lang === 'en'), await page.evaluate(() => window.__toastLog));

  if (o.lang === 'en'){
    await openSettings(page);
    await page.click('#restart-course-open'); await page.waitForTimeout(300);
    const txt = await page.evaluate(() => document.getElementById('settings-restart-box').innerText + '\n' + document.getElementById('restart-course-modal').innerText);
    check(`${tag}: site em inglês sem português (seção e janela)`, !PT_WORDS.test(txt), (txt.match(PT_WORDS) || [])[0]);
    await page.keyboard.press('Escape');
  }
  check(`${tag}: sem erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// Desfazer completo: recomeça uma vez e desfaz -> volta exatamente o progresso de antes.
async function undoFull(browser, base, app){
  const tag = `${app}/desfazer-completo`;
  const { ctx, page, errs } = await openApp(browser, base, app, { lang: 'pt-BR', width: 1280 });
  const key = BLOCK[app];
  const orig = (await dbOf(page)).row[key];
  await page.evaluate(() => supabaseClient.rpc('restart_course', { p_course_key: RecomecarCurso._state.blockKey }));
  await page.reload(); await waitLoaded(page);
  await openSettings(page);
  await page.waitForFunction(() => !!document.getElementById('restart-course-undo-open'), null, { timeout: 5000 });
  await page.click('#restart-course-undo-open'); await page.waitForTimeout(200);
  await page.click('#restart-undo-yes');
  await page.waitForLoadState('load'); await waitLoaded(page);
  const st = await page.evaluate(() => ({ xp: STATE.xp, done: Object.values(STATE.unitProgress).filter(p => p && p.completed).length }));
  check(`${tag}: XP 1840 e a unidade concluída voltam`, st.xp === 1840 && st.done === 1, st);
  const now = (await dbOf(page)).row[key];
  const strip = (b) => { const o = JSON.parse(JSON.stringify(b)); delete o.restartEpoch; return o; };
  check(`${tag}: bloco no "servidor" volta igual (fora a época)`, JSON.stringify(strip(now).unitProgress) === JSON.stringify(orig.unitProgress) && now.restartEpoch === 2, Object.keys(now));
  check(`${tag}: sem erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// Retomada guiada: 70 dias parado neste curso.
async function comeback(browser, base, app, o){
  const tag = `${app}/${o.lang}/${o.width}/${o.theme || 'light'}/retomada`;
  const sp = `${app}-${o.lang === 'en' ? 'en-' : ''}${o.theme || 'light'}-${o.width}`;
  const mobile = o.width < 600;
  const { ctx, page, errs } = await openApp(browser, base, app, Object.assign({ lastDay: dayAgo(70) }, o));
  await page.waitForFunction(() => document.getElementById('comeback-modal').style.display === 'flex', null, { timeout: 12000 }).catch(() => {});
  const c = await page.evaluate(() => { const m = document.getElementById('comeback-modal'); const opts = [...m.querySelectorAll('[data-comeback]')];
    return { open: m.style.display === 'flex', text: m.innerText, ids: opts.map(b => b.dataset.comeback), minH: Math.min(...opts.map(b => Math.round(b.getBoundingClientRect().height))),
      focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.comeback : null,
      scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
  check(`${tag}: janela "Que bom te ver de volta" aparece`, c.open && (o.lang === 'en' ? /Great to see you back/ : /Que bom te ver de volta/).test(c.text), c.text.slice(0, 120));
  check(`${tag}: caminhos: continuar, revisão rápida, ${app === 'fr' ? 'Ponto de verificação, ' : ''}recomeçar`,
    c.ids[0] === 'continue' && c.ids[1] === 'review' && c.ids[c.ids.length - 1] === 'restart' && (app !== 'fr' || c.ids.includes('checkpoint')), c.ids);
  check(`${tag}: sem culpa (nada de "perdeu", "sumiu", "abandonou")`, !/perdeu|sumiu|abandon|lost your|missed/i.test(c.text));
  check(`${tag}: foco no primeiro caminho`, c.focus === 'continue', c.focus);
  if (mobile) check(`${tag}: caminhos com 44px e sem rolagem lateral`, c.minH >= 44 && !c.scrollX, c);
  if (o.lang === 'en') check(`${tag}: inglês sem português`, !PT_WORDS.test(c.text), (c.text.match(PT_WORDS) || [])[0]);
  await shot(page, `06-retomada-${sp}`);
  const d = await dbOf(page);
  const ck = o.lang === 'en' ? BLOCK[app] + '@en' : BLOCK[app] + '@pt-BR';
  check(`${tag}: dia mostrado gravado em _meta.comebackSeen (uma vez por retorno)`, d.row._meta && d.row._meta.comebackSeen && d.row._meta.comebackSeen[ck] === dayAgo(70), d.row._meta);
  await page.click('[data-comeback="review"]');
  await page.waitForTimeout(500);
  check(`${tag}: "Revisão rápida" fecha a janela e abre a Revisão`, await page.evaluate(() => document.getElementById('comeback-modal').style.display === 'none' && document.getElementById('view-review').classList.contains('active')));
  await page.reload(); await waitLoaded(page); await page.waitForTimeout(1500);
  check(`${tag}: ao abrir de novo, não aparece outra vez`, await page.evaluate(() => document.getElementById('comeback-modal').style.display !== 'flex'));
  check(`${tag}: sem erros de página`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

// Painel da professora: sino e ficha (funções de produção, sem rede).
async function teacher(browser, base, app){
  for (const lang of ['pt-BR', 'en']){
    const { ctx, page, errs } = await openApp(browser, base, app, { lang, width: 1280 });
    const r = await page.evaluate(() => {
      const n = (ev) => teacherBellText({ event_type: ev, params: { name: 'Sofia', course: 'frances' }, language_app_key: 'frances', body: 'x' });
      const ov = { restarts: [{ course_key: 'frances', created_at: '2026-10-30T14:00:00Z', restored_at: null }] };
      const ov2 = { restarts: [{ course_key: 'frances@en', created_at: '2026-10-20T14:00:00Z', restored_at: '2026-10-22T14:00:00Z' }] };
      return { a: n('student_course_restart'), b: n('student_course_restart_undo'), f: tsuRestartHTML(ov, { key: 'frances' }), g: tsuRestartHTML(ov2, { key: 'frances' }), h: tsuRestartHTML(ov, { key: 'mandarim' }) };
    });
    if (lang === 'en'){
      check(`${app}/en: sino da professora "Sofia restarted the French course from zero."`, r.a === 'Sofia restarted the French course from zero.' && r.b === 'Sofia undid the restart of the French course.', r);
      check(`${app}/en: ficha "Restarted the course from zero on Oct 30."`, /Restarted the course from zero on Oct 30\./.test(r.f) && /on Oct 20 and undid it on Oct 22/.test(r.g) && r.h === '', r);
    } else {
      check(`${app}/pt: sino da professora "Sofia recomeçou do zero o curso de francês."`, r.a === 'Sofia recomeçou do zero o curso de francês.' && r.b === 'Sofia desfez o recomeço do curso de francês.', r);
      check(`${app}/pt: ficha "Recomeçou o curso do zero em 30/10." (só no idioma do vínculo)`, /Recomeçou o curso do zero em 30\/10\./.test(r.f) && /em 20\/10 e desfez em 22\/10/.test(r.g) && r.h === '', r);
    }
    check(`${app}/${lang}: sem erros de página (professora)`, errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    for (const app of ['fr', 'zh']){
      await flow(browser, base, app, { lang: 'pt-BR', width: 1280, theme: 'light' });
      await flow(browser, base, app, { lang: 'pt-BR', width: 390, theme: 'light' });
      await flow(browser, base, app, { lang: 'en', width: 1280, theme: 'light' });
      if (SHOTS){ await flow(browser, base, app, { lang: 'pt-BR', width: 1280, theme: 'dark' }); await flow(browser, base, app, { lang: 'pt-BR', width: 390, theme: 'dark' }); }
      await undoFull(browser, base, app);
      await comeback(browser, base, app, { lang: 'pt-BR', width: 1280, theme: 'light' });
      await comeback(browser, base, app, { lang: 'pt-BR', width: 390, theme: 'light' });
      await comeback(browser, base, app, { lang: 'en', width: 1280, theme: 'light' });
      if (SHOTS){ await comeback(browser, base, app, { lang: 'pt-BR', width: 1280, theme: 'dark' }); await comeback(browser, base, app, { lang: 'pt-BR', width: 390, theme: 'dark' }); }
      await teacher(browser, base, app);
    }
  } catch (e) { fail++; console.log('  ERRO:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
  await browser.close(); server.close();
  console.log(`\nRESULTADO recomecar-curso navegador: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
