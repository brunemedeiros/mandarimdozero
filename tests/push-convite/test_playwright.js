// Ajuda e convite para ativar os alertas no celular (plano B e A, 2026-11-25; shared/push-convite.js).
// Playwright, FR + ZH; Supabase stubado em memória (molde de tests/amigos-push); push stubado.
// Rodar: node tests/push-convite/test_playwright.js  (SHOTS_DIR=... salva prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS_DIR || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { friendships: [], profiles: [], earned_badges: [] };
  window.__rpc = []; window.__RPC = {}; window.__upserts = [];
  function builder(table){
    const st = { f: [], or: null, head: false };
    const matchOr = (row) => !st.or || st.or.split(',').some(p => { const [k, , v] = p.split('.'); return row[k] === v; });
    const rows = () => (window.__DB[table] || []).filter(r => st.f.every(([k, v]) => r[k] === v) && matchOr(r));
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => { const r = rows(); return Promise.resolve(st.head ? { count: r.length, data: null, error: null } : { data: r, error: null }).then(ok, ko); };
      if (prop === 'select') return (c, opts) => { if (opts && opts.head) st.head = true; return b; };
      if (prop === 'eq') return (k, v) => { st.f.push([k, v]); return b; };
      if (prop === 'or') return (s) => { st.or = s; return b; };
      if (prop === 'upsert') return (row, opts) => { window.__upserts.push({ table, row, opts }); return Promise.resolve({ data: null, error: null }); };
      if (prop === 'maybeSingle' || prop === 'single') return () => Promise.resolve({ data: rows()[0] || null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => { window.__rpc.push({ name, args }); const h = window.__RPC[name]; return h ? { data: h(args), error: null } : { data: null, error: { message: 'missing ' + name } }; },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;



let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const PHONE = { width: 390, height: 844 };

async function boot(browser, lang, port, opt = {}){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: opt.viewport || PHONE, colorScheme: opt.theme || process.env.THEME || 'light',
    ...(opt.ua ? { userAgent: opt.ua } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\/shared\/vendor\/supabase-js/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

// push: 'off' (dá para ativar), 'on' (já ativado aqui), 'none' (navegador sem push). perm: permissão do navegador.
async function setup(page, push, perm = 'default'){
  await page.evaluate(({ push, perm }) => {
    try { Object.defineProperty(Notification, 'permission', { get: () => perm, configurable: true }); } catch (e) {}
    CURRENT_USER = { id: 'me' };
    PROFILE_CACHE = { user_id: 'me', username: 'eu', display_name: 'Eu Mesma' };
    window.__DB.notification_preferences = [{ user_id: 'me', channels: {}, quiet_hours_start: null, quiet_hours_end: null }];
    window.__DB.friend_settings = [];
    pushSupported = () => push !== 'none';
    getLocalPushSubscription = async () => (push === 'on' ? { endpoint: 'x' } : null);
    window.__subscribed = 0; window.__setAll = [];
    subscribeToPush = async () => { window.__subscribed++; return window.__subResult || { ok: true }; };
    setAllCategoriesChannel = async (...a) => { window.__setAll.push(a); };
    try { Object.keys(localStorage).filter(k => k.startsWith('pushLessonInvite')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }, { push, perm });
}
const text = (page, sel) => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
async function shot(page, name){ if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); }

async function openNotifSettings(page){
  await page.evaluate(() => { const w = document.getElementById('settings-notifications-content'); if (!w) throw new Error('sem a tela'); });
  await page.evaluate(() => { switchTab('settings'); switchSettingsSection('notifications'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => renderNotificationPreferencesView());
  await page.waitForSelector('#notif-pref-push-switch', { timeout: 8000 });
}
const helpState = (page) => page.evaluate(() => {
  const s = document.getElementById('notif-pref-push-help');
  return { visible: !!s && !s.hidden && s.getClientRects().length > 0, kind: s && s.querySelector('.push-help') ? s.querySelector('.push-help').dataset.pushHelp : '',
    text: s ? s.innerText.replace(/\s+/g, ' ').trim() : '', retry: !!(s && s.querySelector('[data-push-help-retry]')) };
});

// Tela de "Lição concluída" de verdade (renderLessonCompleteScreen), com a primeira lição da 1ª unidade.
async function renderDone(page){
  await page.evaluate(() => {
    const u = UNITS.find(x => x.lessons && x.lessons.length) || UNITS[0];
    if (STATE.currentUnitId !== u.id || document.getElementById('unit-detail-wrap').style.display === 'none'){ switchTab('path'); openUnitDetail(u.id); }
    renderLessonCompleteScreen(u, u.lessons ? u.lessons[0] : null, { challengesBefore: null, xpEarned: 6, scorePct: 100 });
  });
  await page.waitForTimeout(300);
}
const inviteState = (page) => page.evaluate(() => {
  const s = document.getElementById('push-lesson-invite');
  let st = {}; try { st = JSON.parse(localStorage.getItem('pushLessonInvite:me') || '{}'); } catch (e) {}
  return { exists: !!s, visible: !!s && !s.hidden && s.getClientRects().length > 0, text: s ? s.innerText.replace(/\s+/g, ' ').trim() : '', st };
});
const setInvite = (page, st) => page.evaluate((st) => localStorage.setItem('pushLessonInvite:me', JSON.stringify(st)), st);

async function run(browser, port, lang){
  const L = lang;
  const DAY = 86400000;

  // ---------- B: Configurações > Notificações ----------
  // B1. Android, navegador com "Bloquear" guardado: caixa fixa já ao abrir, com Chrome + ícone do app e "Já liberei"
  let { page, errors, ctx } = await boot(browser, lang, port, { ua: ANDROID_UA });
  await setup(page, 'off', 'denied');
  await openNotifSettings(page);
  let h = await helpState(page);
  check(`${L}: Android bloqueado: caixa aparece ao abrir`, h.visible && h.kind === 'blocked' && h.retry, h);
  check(`${L}: Android bloqueado: passos do Chrome e do ícone`, /Configurações do site/.test(h.text) && /Bloqueados/.test(h.text) && /Informações do app/.test(h.text) && /Seu celular bloqueou/.test(h.text), h.text);
  await page.evaluate(() => document.getElementById('notif-pref-push-help').scrollIntoView({ block: 'center' }));
  await shot(page, `${L}-b-android-bloqueado`);
  // "Já liberei, tentar de novo": deu certo agora
  await page.evaluate(() => { try { Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true }); } catch (e) {} getLocalPushSubscription = async () => (window.__subscribed ? { endpoint: 'x' } : null); });
  await page.click('#notif-pref-push-help [data-push-help-retry]');
  await page.waitForTimeout(400);
  const r1 = await page.evaluate(() => ({ sub: window.__subscribed, setAll: window.__setAll, on: document.getElementById('notif-pref-push-switch').checked, help: !document.getElementById('notif-pref-push-help').hidden }));
  check(`${L}: Já liberei: ativa, liga todas as categorias e a caixa some`, r1.sub === 1 && JSON.stringify(r1.setAll) === JSON.stringify([['push', true]]) && r1.on && !r1.help, r1);
  check(`${L}: sem erros (B1)`, errors.length === 0, errors);
  await ctx.close();

  // B2. Computador bloqueado: passos do cadeado; "Já liberei" ainda bloqueado avisa e a caixa continua
  ({ page, errors, ctx } = await boot(browser, lang, port, { viewport: { width: 1280, height: 900 } }));
  await setup(page, 'off', 'denied');
  await openNotifSettings(page);
  h = await helpState(page);
  check(`${L}: computador bloqueado: passos do cadeado`, h.visible && /navegador bloqueou/.test(h.text) && /cadeado/.test(h.text) && !/Informações do app/.test(h.text), h.text);
  await page.evaluate(() => { window.__subResult = { ok: false, reason: 'blocked' }; });
  await page.click('#notif-pref-push-help [data-push-help-retry]');
  await page.waitForTimeout(400);
  const toast2 = await page.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | '));
  h = await helpState(page);
  check(`${L}: ainda bloqueado: avisa e a caixa continua`, /Ainda está bloqueado/.test(toast2) && h.visible, { toast2, h });
  check(`${L}: sem erros (B2)`, errors.length === 0, errors);
  await ctx.close();

  // B3. Permissão ainda não pedida: sem caixa; interruptor recusado pelo celular ("denied") mostra a caixa (não só o aviso)
  ({ page, errors, ctx } = await boot(browser, lang, port, { ua: ANDROID_UA }));
  await setup(page, 'off', 'default');
  await openNotifSettings(page);
  h = await helpState(page);
  check(`${L}: sem bloqueio: nenhuma caixa`, !h.visible, h);
  await page.evaluate(() => { window.__subResult = { ok: false, reason: 'denied' }; });
  await page.click('label:has(#notif-pref-push-switch)');
  await page.waitForTimeout(400);
  h = await helpState(page);
  const sw3 = await page.evaluate(() => document.getElementById('notif-pref-push-switch').checked);
  check(`${L}: recusado pelo celular: caixa aparece e o interruptor volta`, h.visible && h.kind === 'blocked' && !sw3, { h, sw3 });
  check(`${L}: sem erros (B3)`, errors.length === 0, errors);
  await ctx.close();

  // B4. iPhone no Safari (sem push fora da Tela de Início): passo a passo da Tela de Início
  ({ page, errors, ctx } = await boot(browser, lang, port, { ua: IPHONE_UA }));
  await setup(page, 'none', 'default');
  await openNotifSettings(page);
  h = await helpState(page);
  check(`${L}: iPhone: passo a passo da Tela de Início`, h.visible && h.kind === 'ios' && /Adicionar à Tela de Início/.test(h.text) && !h.retry, h);
  await page.evaluate(() => document.getElementById('notif-pref-push-help').scrollIntoView({ block: 'center' }));
  await shot(page, `${L}-b-iphone`);
  check(`${L}: sem erros (B4)`, errors.length === 0, errors);
  await ctx.close();

  // B5. Já ativado aqui: sem caixa, mesmo com a permissão "denied" de outro jeito
  ({ page, errors, ctx } = await boot(browser, lang, port));
  await setup(page, 'on', 'granted');
  await openNotifSettings(page);
  h = await helpState(page);
  check(`${L}: já ativado: sem caixa`, !h.visible, h);
  await ctx.close();

  // ---------- A: convite na tela de Lição concluída ----------
  ({ page, errors, ctx } = await boot(browser, lang, port, { ua: ANDROID_UA }));
  await setup(page, 'off', 'default');
  // 1ª lição: não mostra
  await page.evaluate(() => pushInviteNoteLessonDone());
  await renderDone(page);
  let iv = await inviteState(page);
  check(`${L}: 1ª lição: sem convite e a tela fica idêntica (nem o lugar do convite entra)`, !iv.exists && iv.st.lessons === 1, iv);
  // 2ª lição: mostra
  await page.evaluate(() => pushInviteNoteLessonDone());
  await renderDone(page);
  iv = await inviteState(page);
  check(`${L}: 2ª lição: convite aparece e conta 1 vez`, iv.visible && /Quer um lembrete/.test(iv.text) && /Ativar lembretes/.test(iv.text) && /Agora não/.test(iv.text) && iv.st.shown === 1, iv);
  check(`${L}: sem "Não perguntar mais"`, !/perguntar mais/i.test(iv.text));
  await page.evaluate(() => document.getElementById('push-lesson-invite').scrollIntoView({ block: 'center' }));
  await shot(page, `${L}-a-convite`);
  // Agora não: some; reabrir a tela no mesmo dia não mostra de novo
  await page.click('#push-lesson-invite [data-push-invite-lesson="later"]');
  await page.waitForTimeout(150);
  check(`${L}: Agora não: some`, !(await inviteState(page)).visible);
  await page.evaluate(() => pushInviteNoteLessonDone());
  await renderDone(page);
  check(`${L}: antes de 7 dias: não volta`, !(await inviteState(page)).visible);
  // depois de 7 dias: volta (2ª vez); depois de mais 7: 3ª vez; depois disso, nunca mais
  for (const n of [2, 3]){
    await page.evaluate((DAY) => { const s = JSON.parse(localStorage.getItem('pushLessonInvite:me')); s.last = Date.now() - 7 * DAY - 1000; localStorage.setItem('pushLessonInvite:me', JSON.stringify(s)); }, DAY);
    await renderDone(page);
    iv = await inviteState(page);
    check(`${L}: depois de 7 dias: volta (${n}ª vez)`, iv.visible && iv.st.shown === n, iv);
  }
  await page.evaluate((DAY) => { const s = JSON.parse(localStorage.getItem('pushLessonInvite:me')); s.last = Date.now() - 30 * DAY; localStorage.setItem('pushLessonInvite:me', JSON.stringify(s)); }, DAY);
  await renderDone(page);
  check(`${L}: depois de 3 vezes: nunca mais`, !(await inviteState(page)).visible);
  // Ativar: pede o push, liga todas as categorias, marca feito
  await setInvite(page, { lessons: 5, shown: 0, last: 0 });
  await renderDone(page);
  await page.click('#push-lesson-invite [data-push-invite-lesson="enable"]');
  await page.waitForTimeout(300);
  iv = await inviteState(page);
  const en = await page.evaluate(() => ({ sub: window.__subscribed, setAll: window.__setAll }));
  check(`${L}: Ativar: pede o push, liga tudo e não convida mais`, en.sub === 1 && JSON.stringify(en.setAll) === JSON.stringify([['push', true]]) && !iv.visible && iv.st.done === true, { en, iv });
  // Ativar recusado pelo celular: o cartão vira o passo a passo de liberar
  await setInvite(page, { lessons: 5, shown: 0, last: 0 });
  await page.evaluate(() => { window.__subResult = { ok: false, reason: 'denied' }; });
  await renderDone(page);
  await page.click('#push-lesson-invite [data-push-invite-lesson="enable"]');
  await page.waitForTimeout(300);
  iv = await inviteState(page);
  check(`${L}: Ativar recusado: mostra como liberar + Entendi`, iv.visible && /bloqueou os alertas/.test(iv.text) && /Entendi/.test(iv.text), iv.text);
  // navegador com "Bloquear" guardado: não convida (o clique não resolve)
  await page.evaluate(() => { try { Object.defineProperty(Notification, 'permission', { get: () => 'denied', configurable: true }); } catch (e) {} });
  await setInvite(page, { lessons: 5, shown: 0, last: 0 });
  await renderDone(page);
  check(`${L}: bloqueado: não convida`, !(await inviteState(page)).visible);
  // checkpoint e 1ª lição do curso: sem o lugar do convite
  const noSlot = await page.evaluate(() => {
    const u = UNITS.find(x => x.lessons && x.lessons.length) || UNITS[0];
    renderLessonCompleteScreen(u, null, { challengesBefore: null, xpEarned: 1, scorePct: 100, trackHistory: false });
    const a = !document.getElementById('push-lesson-invite');
    renderLessonCompleteScreen(u, u.lessons[0], { challengesBefore: null, xpEarned: 1, scorePct: 100, welcomeB: true });
    return a && !document.getElementById('push-lesson-invite');
  });
  check(`${L}: checkpoint e 1ª lição do curso: sem convite`, noSlot);
  check(`${L}: sem erros (A)`, errors.length === 0, errors);
  await ctx.close();

  // A no iPhone (Safari): o convite já mostra o passo a passo
  ({ page, errors, ctx } = await boot(browser, lang, port, { ua: IPHONE_UA }));
  await setup(page, 'none', 'default');
  await setInvite(page, { lessons: 2, shown: 0, last: 0 });
  await renderDone(page);
  iv = await inviteState(page);
  check(`${L}: iPhone: convite com o passo a passo e Entendi`, iv.visible && /Adicionar à Tela de Início/.test(iv.text) && /Entendi/.test(iv.text) && !/Ativar lembretes/.test(iv.text), iv.text);
  await page.evaluate(() => document.getElementById('push-lesson-invite').scrollIntoView({ block: 'center' }));
  await shot(page, `${L}-a-iphone`);
  check(`${L}: sem erros (A iPhone)`, errors.length === 0, errors);
  await ctx.close();

  // Site em inglês: textos em inglês (nada em português)
  ({ page, errors, ctx } = await boot(browser, lang, port, { ua: ANDROID_UA }));
  await setup(page, 'off', 'denied');
  await page.evaluate(async () => { await setUiLang('en'); });
  const enText = await page.evaluate(() => pushHelpHTML('blocked') + pushLessonInviteHTML('push') + pushHelpHTML('ios'));
  const isEn = /Site settings/.test(enText) && /Turn on reminders/.test(enText) && /Add to Home Screen/.test(enText);
  if (isEn) check(`${L}: inglês sem português`, !/Configurações|Ativar|Agora não|Tela de Início/.test(enText), enText.slice(0, 200));
  else console.log(`  (aviso) ${L}: não consegui trocar o idioma do site neste teste; textos em inglês conferidos só pelo test_i18n_unit`);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  try { for (const lang of ['fr', 'zh']) await run(browser, port, lang); }
  catch (e) { failed++; console.log('  ERRO:', e && e.stack || e); }
  await browser.close(); server.close();
  console.log(`\n${passed}/${passed + failed}`);
  process.exit(failed ? 1 : 0);
})();
