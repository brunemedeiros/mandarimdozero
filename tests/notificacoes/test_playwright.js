// Painel de Notificações (shared/notifications.js): só os avisos do site aberto (Amigos são gravados uma vez por
// site e apareciam duplicados), grupos Hoje/Ontem/Antes, ponto de não lido, sem emoji repetido no começo do texto,
// ícones do Fluent, aviso de Amigos lido nos dois sites, "Ler todas" no idioma do site. fr e zh, claro/escuro, celular.
// Harness do navegador de Decks (convidado + Supabase stubado; CURRENT_USER setado depois do boot).
// Rodar: node tests/notificacoes/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { decks: [], own_flashcards: [], notifications: window.__SEED_NOTIFS || [] };
  window.__writes = [];
  function builder(table){
    const st = { table, filters: [], ins: [], op: 'select', patch: null };
    const match = (row) => st.filters.every(([k, v]) => d(row, k, v)) && st.ins.every(([k, vs]) => vs.includes(row[k]));
    function d(row, k, v){ return v === null ? row[k] == null : row[k] === v; }
    const exec = () => {
      const rows = (window.__DB[table] || []);
      if (st.op === 'update'){
        const hit = rows.filter(match); hit.forEach(r => Object.assign(r, st.patch));
        window.__writes.push({ table, op: 'update', patch: st.patch, ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (st.op === 'delete'){
        const hit = rows.filter(match);
        window.__DB[table] = rows.filter(r => !hit.includes(r));
        window.__writes.push({ table, op: 'delete', ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (table === 'decks') return rows.filter(match);
      return rows.filter(match);
    };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => { const d = exec(); return Promise.resolve({ data: d, count: Array.isArray(d) ? d.length : 0, error: null }).then(ok, ko); };
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.ins.push([k, vs]); return b; };
      if (prop === 'is') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'update') return (p) => { st.op = 'update'; st.patch = p; return b; };
      if (prop === 'delete') return () => { st.op = 'delete'; return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1200, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}


function seed(){
  const now = new Date();
  const at = (d, h) => { const x = new Date(now); x.setDate(x.getDate() - d); if (h != null) x.setHours(h, 0, 0, 0); return x.toISOString(); };
  const today = new Date(now.getTime() - 5 * 60000).toISOString();
  const friend = { user_id: 'u1', category: 'amigos', event_type: 'friend_request', title: null, body: 'Eliezer Belarmino enviou um pedido de amizade 👋', action_tab: 'friends', created_at: today, read_at: null };
  return [
    Object.assign({ id: 1, language_app_key: 'frances' }, friend),
    Object.assign({ id: 2, language_app_key: 'mandarim' }, friend),
    { id: 3, user_id: 'u1', language_app_key: 'frances', category: 'gamificacao', title: 'Nova conquista! 🥉', body: 'Você desbloqueou o badge "Primeira Amizade" 🤝', created_at: today, read_at: null },
    { id: 4, user_id: 'u1', language_app_key: 'frances', category: 'mural', title: null, body: "📌 Priscila de Mello postou no mural (turma Jeanne D'Arc): Teste", created_at: at(1, 12), read_at: at(0) },
    { id: 5, user_id: 'u1', language_app_key: 'frances', category: 'mural', title: null, body: '💬 Eliezer Belarmino comentou no mural: essai', created_at: at(1, 11), read_at: at(0) },
    { id: 6, user_id: 'u1', language_app_key: 'mandarim', category: 'streak', title: null, body: 'Sua sequência no chinês está em risco 🔥', created_at: today, read_at: null },
    { id: 7, user_id: 'u1', language_app_key: 'frances', category: 'revisao', title: null, body: 'Você tem 12 cartões para revisar', created_at: at(3, 12), read_at: at(2) },
  ];
}

async function bootLogged(browser, lang, port, theme, viewport){
  const ctx0 = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1280, height: 860 }, colorScheme: theme || 'light' });
  await ctx0.addInitScript((rows) => { window.__SEED_NOTIFS = rows; }, seed());
  const page = await ctx0.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  await page.evaluate(() => { CURRENT_USER = { id: 'u1', email: 'a@b.c' }; });
  return { page, errors, ctx: ctx0 };
}

const SHOTS = process.env.SHOTS;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [lang, theme, vp] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark'], ['fr', 'light', { width: 390, height: 844 }]]){
    const tag = `${lang} ${theme}${vp ? ' celular' : ''}`;
    const { page, errors, ctx } = await bootLogged(browser, lang, port, theme, vp);
    await page.evaluate(() => refreshNotificationUnreadCount());
    await page.waitForTimeout(150);
    const badge = await page.evaluate(() => document.getElementById('notifications-badge').textContent);
    const key = lang === 'fr' ? 'frances' : 'mandarim';
    const expectUnread = seed().filter(n => n.language_app_key === key && !n.read_at).length;
    check(tag + ': contador do sino só com os avisos deste site', badge === String(expectUnread), { badge, expectUnread });
    await page.click('#notifications-topbar-btn');
    await page.waitForSelector('#notifications-list .notification-item');
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('#notifications-list .notification-item'));
      return { n: items.length, groups: Array.from(document.querySelectorAll('.notification-group')).map(g => g.textContent),
        texts: items.map(i => i.querySelector('.notification-item-text').textContent),
        dots: document.querySelectorAll('.notification-unread-dot').length,
        emo: items.every(i => !!i.querySelector('.notification-item-icon .emo')),
        markAll: document.getElementById('notifications-mark-all-btn').textContent,
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        panelRight: document.getElementById('notifications-dropdown').getBoundingClientRect().right <= window.innerWidth };
    });
    const mine = seed().filter(n => n.language_app_key === key);
    check(tag + ': só os avisos deste site, sem o aviso de Amigos duplicado', r.n === mine.length && r.texts.filter(x => /pedido de amizade/.test(x)).length === 1, r);
    if (lang === 'fr'){
      check(tag + ': grupos Hoje, Ontem, Antes', r.groups.join('|') === 'Hoje|Ontem|Antes', r.groups);
      check(tag + ': emoji do começo do texto sai (o ícone já está à esquerda)', r.texts.some(x => x.startsWith('Priscila de Mello postou')) && r.texts.some(x => x.startsWith('Eliezer Belarmino comentou')), r.texts);
      check(tag + ': ponto só nos não lidos', r.dots === 2, r.dots);
    }
    check(tag + ': ícones do Fluent', r.emo, r);
    check(tag + ': painel cabe na tela', r.noOverflow && r.panelRight, r);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${lang}-${theme}${vp ? '-mobile' : ''}.png` });
    if (lang === 'fr' && theme === 'light' && !vp){
      await page.click('.notification-item[data-twin-at]');
      await page.waitForTimeout(200);
      const db = await page.evaluate(() => window.__DB.notifications.filter(n => n.category === 'amigos').map(n => !!n.read_at));
      check('aviso de Amigos lido aqui fica lido no outro site também', db.length === 2 && db.every(Boolean), db);
      await page.evaluate(() => { window.getUiLang = () => 'en'; if (typeof applyI18n === 'function') applyI18n(); });
    }
    check(tag + ': zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log('Notificações playwright: ' + passed + '/' + (passed + failed) + ' verificações' + (failed ? '' : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
