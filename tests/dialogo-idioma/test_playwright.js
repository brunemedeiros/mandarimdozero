// Passo Diálogo e "Você entendeu?" das lições (fr e zh) no idioma do site: em pt-BR os textos continuam iguais aos de
// antes; em inglês não sobra nada da interface em português (achado de 2026-10-18: "✅ Isso mesmo!", "Ouvir tudo",
// "Áudio automático" etc. eram texto fixo). O conteúdo do curso (título, falas, tradução) não entra na conta.
// Harness copiado de tests/notificacoes/test_playwright.js. Rodar: node tests/dialogo-idioma/test_playwright.js
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


const OUT = process.env.SHOT_DIR;
const PT_UI = ['Diálogo', 'Ouvir tudo', 'Áudio automático', 'Mostrar traduções', 'palavras coloridas', 'Você entendeu', 'Sem olhar o diálogo',
  'Complete a resposta', 'Ouça e escolha', 'Compreensão', 'Isso mesmo', 'Quase!', 'Próxima pergunta', 'Concluir', 'certas.', 'Refazer as perguntas', 'Continuar'];
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  for (const lang of ['fr', 'zh']) for (const ui of ['pt-BR', 'en']){
    const L = `${lang} ${ui}`;
    const { page, ctx } = await bootLogged(browser, lang, port, 'light', { width: 900, height: 1000 });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    if (ui === 'en') await page.evaluate(() => setUiLang('en'));
    // Só a interface: o conteúdo do curso (título, cena, falas, traduções e perguntas) sai do texto conferido.
    const uiText = () => page.evaluate(() => {
      const host = document.getElementById('tmp-dlg'); const clone = host.cloneNode(true);
      clone.querySelectorAll('.dlg-title, .dlg-bubble, .dlg-name, .dlg-emoji, .dlg-opt, .dlg-fb-right, .dlg-q-text, .dlg-q-ctx, .dlg-q-prompt').forEach(e => e.remove());
      const s = clone.querySelector('.dlg-scene'); if (s && s.textContent.startsWith('📍')) s.remove();
      const attrs = [...host.querySelectorAll('[aria-label]')].filter(e => !e.closest('.dlg-bubble')).map(e => e.getAttribute('aria-label').replace(/^[^:]*: /, ''));
      return clone.textContent.replace(/\s+/g, ' ') + ' | ' + attrs.join(' | ') + ' | ' + document.getElementById('tmp-next').textContent;
    });
    const has = (txt) => PT_UI.filter(w => txt.includes(w));
    const ok = await page.evaluate(() => {
      const u = UNITS.find(x => x.dialogue && Array.isArray(x.dialogue.check) && x.dialogue.check.length);
      if (!u) return false;
      const host = document.createElement('div'); host.id = 'tmp-dlg'; document.body.prepend(host);
      const btn = document.createElement('button'); btn.id = 'tmp-next'; document.body.prepend(btn);
      window.__u = u; renderDialogueStep(u, host, btn); return true;
    });
    check(L + ': unidade com diálogo encontrada', ok);
    if (!ok){ await ctx.close(); continue; }
    let txt = await uiText();
    if (ui === 'en') check(L + ': passo Diálogo sem português na interface', has(txt).length === 0, has(txt));
    else check(L + ': passo Diálogo com os textos de antes', ['Diálogo', 'Ouvir tudo', 'Áudio automático', 'Mostrar traduções'].every(w => txt.includes(w)), txt.slice(0, 200));
    await page.evaluate(() => { const h = document.getElementById('tmp-dlg'), b = document.getElementById('tmp-next'); renderDialogueCheckStep(window.__u, h, b); });
    await page.click('#tmp-dlg .dlg-opt');
    txt = await uiText();
    if (ui === 'en') check(L + ': pergunta respondida sem português', has(txt).length === 0, has(txt));
    else check(L + ': pergunta com os textos de antes', ['Você entendeu?', 'Sem olhar o diálogo'].every(w => txt.includes(w)) && /Isso mesmo|Quase!/.test(txt), txt.slice(0, 300));
    // Responde até o fim para ver o resumo.
    for (let i = 0; i < 12; i++){
      const more = await page.$('#dlg-q-next'); if (!more) break;
      await more.click(); await page.waitForTimeout(50);
      const opt = await page.$('#tmp-dlg .dlg-opt:not(.locked)'); if (opt) await opt.click();
    }
    txt = await uiText();
    if (ui === 'en') check(L + ': resumo final sem português', has(txt).length === 0 && /of \d+ correct/.test(txt), { pt: has(txt), txt: txt.slice(0, 200) });
    else check(L + ': resumo final com os textos de antes', /\d+ de \d+ certas\./.test(txt) && txt.includes('Refazer as perguntas') && txt.includes('Continuar →'), txt.slice(0, 300));
    if (OUT) await (await page.$('#tmp-dlg')).screenshot({ path: `${OUT}/dlg-${lang}-${ui}.png` });
    check(L + ': sem erros na página', errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Diálogo no idioma do site: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
