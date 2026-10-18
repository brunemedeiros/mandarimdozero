// Configurações no Design System do painel (Pico, 2026-10-17): interruptores input[role=switch] (tema, cloze, som,
// pelo clique no texto e pelo teclado), abas com aria-pressed, Exportar com campo de unidade (também no site em
// inglês) e Notificações com 3 interruptores e a matriz em tabela. fr e zh.
// Harness copiado de tests/notificacoes/test_playwright.js (convidado + Supabase stubado).
// Rodar: node tests/configuracoes/test_playwright.js
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
    function d(row, k, v){ return v === null ? row[k] == null : String(row[k]) === String(v); }
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

let ok = 0, bad = 0; const chk = (n, c) => { if (c) ok++; else { bad++; console.log('FALHOU:', n); } };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  for (const lang of ['fr', 'zh']){
    const { page, ctx } = await bootLogged(browser, lang, port, 'light', { width: 1280, height: 900 });
    await page.evaluate(() => { window.getLocalPushSubscription = async () => null; window.ensureNotificationPreferencesLoaded = async () => ({ channels: { estudo: ['in_app', 'push'] }, quiet_hours_start: 22, quiet_hours_end: 8 }); });
    await page.evaluate(() => switchTab('settings')); await page.waitForTimeout(300);
    // tema
    const dark0 = await page.evaluate(() => isDarkThemeActive());
    await page.click('label:has(#theme-pref-switch) .pref-row-title');
    chk(lang + ': clicar no texto troca o tema', await page.evaluate(d => isDarkThemeActive() !== d, dark0));
    chk(lang + ': interruptor do tema acompanha', await page.evaluate(() => document.getElementById('theme-pref-switch').checked === isDarkThemeActive()));
    await page.click('#theme-pref-switch');
    chk(lang + ': clicar de novo volta o tema', await page.evaluate(d => isDarkThemeActive() === d, dark0));
    // cloze e som
    const c0 = await page.evaluate(() => getClozeMode());
    await page.click('#cloze-mode-switch');
    chk(lang + ': cloze salvo', await page.evaluate(c => getClozeMode() !== c && document.getElementById('cloze-mode-switch').checked === (getClozeMode() === 'type'), c0));
    const s0 = await page.evaluate(() => isFeedbackSoundEnabled());
    await page.keyboard.press('Tab'); // foco vai para o próximo interruptor (som)
    await page.keyboard.press('Space');
    chk(lang + ': som alterna pelo teclado', await page.evaluate(s => isFeedbackSoundEnabled() !== s && document.getElementById('feedback-sound-switch').checked === isFeedbackSoundEnabled(), s0));
    // abas
    await page.click('[data-settings-section="export"]');
    chk(lang + ': aba Exportar marcada', await page.evaluate(() => document.querySelector('[data-settings-section="export"]').getAttribute('aria-pressed') === 'true' && document.querySelector('[data-settings-section="geral"]').getAttribute('aria-pressed') === 'false'));
    const n = await page.evaluate(() => document.querySelectorAll('#export-unit-select option').length);
    chk(lang + ': campo de unidade com Todas + unidades (' + n + ')', n > 5);
    chk(lang + ': primeira opção é Todas as unidades', await page.evaluate(() => document.querySelector('#export-unit-select option').textContent === 'Todas as unidades'));
    const second = await page.evaluate(() => document.querySelectorAll('#export-unit-select option')[2].value);
    await page.selectOption('#export-unit-select', second);
    chk(lang + ': unidade escolhida vale para o export', await page.evaluate(v => exportSelectedUnit === v, second));
    await page.click('[data-settings-section="notifications"]'); await page.waitForTimeout(700);
    chk(lang + ': 3 interruptores principais', await page.evaluate(() => ['notif-pref-inapp-switch','notif-pref-push-switch','notif-pref-email-switch'].every(id => document.getElementById(id)?.matches('input[role=switch]'))));
    chk(lang + ': matriz com 1 linha por categoria', await page.evaluate(() => document.querySelectorAll('.cfg-matriz tbody tr').length === NOTIFICATION_PREF_CATEGORIES.length));
    chk(lang + ': caixinhas da matriz com nome acessível', await page.evaluate(() => [...document.querySelectorAll('.cfg-matriz input')].every(i => (i.getAttribute('aria-label') || '').includes(':'))));
    await ctx.close();
  }
  // site em inglês: nada em português no campo de unidade
  {
    const { page, ctx } = await bootLogged(browser, 'fr', port, 'light', { width: 1280, height: 900 });
    await page.evaluate(async () => { await setUiLang('en'); switchTab('settings'); switchSettingsSection('export'); renderExportDeckSelect(ANKI_EXPORT_CONFIG); });
    const en = await page.evaluate(() => ({ opt: document.querySelector('#export-unit-select option').textContent, label: document.querySelector('#export-deck-select label').firstChild.textContent.trim() }));
    chk('en: campo e primeira opção em inglês ' + JSON.stringify(en), en.opt === 'All units' && en.label === 'Unit');
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Configurações (funcional): ${ok} ok, ${bad} falhas`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
