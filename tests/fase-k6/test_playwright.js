// K.6 -- Playwright (Chromium real), FR + ZH: tela real do Analytics da professora
// (botão 📊 em "🎓 Alunos"). As respostas da RPC vêm de fixtures.json, geradas pela
// RPC REAL (migration 059) num Postgres local (gen_fixtures.sql); o navegador só
// substitui a rede. Rodar: node tests/fase-k6/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async (name, args) => { window.__rpcCalls = (window.__rpcCalls || 0) + 1;
      if (name !== 'get_teacher_student_metrics') return { data: null, error: null };
      return { data: window.__FIX[args.p_student_id] || { error: 'not_authorized' }, error: null }; } };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    // o schema da RPC é idêntico nos 2 idiomas; só o language_app_key do vínculo muda
    await page.addInitScript((fix) => { window.__FIX = {}; fix.forEach(f => { window.__FIX['d' + f.student] = f.metrics; }); }, FIX);
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    await page.evaluate((appKey) => {
      CURRENT_USER = { id: 'T' }; isAdminUser = () => true;
      fetchMyStudents = async () => [1,2,3,4,5,6].map(n => ({ id: n, student_id: 'd' + n, username: 'al' + n, display_name: 'Aluno ' + n, language_app_key: appKey, status: 'active' }));
      fetchAllProfiles = async () => [];
      switchTab('admin-badges'); switchAdminPanelSection('students');
    }, appKey);
    await page.waitForSelector('[data-toggle-metrics]');
    const open = async (n) => { await page.click(`[data-toggle-metrics="${n}"]`); await page.waitForFunction((n) => { const t = document.getElementById('metrics-link-' + n).textContent; return t && !t.includes('Carregando'); }, n); return page.evaluate((n) => document.getElementById('metrics-link-' + n).innerText, n); };

    const t1 = await open(1); L('sem conteúdo: mensagem vazia', t1.includes('ainda não criou nenhum cartão'), t1);
    const t2 = await open(2); L('nada estudado: 0 de 2, 2 não iniciados, 0 fracos', t2.includes('Conteúdos estudados: 0 de 2') && t2.includes('2 não iniciados') && /0 fracos/.test(t2) && t2.includes('2 novos'), t2);
    L('nada estudado: "fracos" não inclui não iniciados', /2 não iniciados · 0 fracos/.test(t2), t2);
    const t3 = await open(3); L('Reverse+Cloze+Normal: 3 conteúdos, 6 cartões', t3.includes('3 ativos') && t3.includes('Cartões gerados desses conteúdos: 6'), t3);
    L('sibling New não rebaixa: 2 estudados de 3; 1 médio 1 forte; Cloze não iniciado', t3.includes('2 de 3') && /1 não iniciados · 0 fracos · 1 médios · 1 fortes/.test(t3), t3);
    L('N/L/R/Devidos por cartão: 4 novos, 1 aprendendo, 1 para revisar, 2 devidos', t3.includes('4 novos') && t3.includes('1 aprendendo') && t3.includes('1 para revisar') && t3.includes('2 devidos'), t3);
    const t4 = await open(4); L('arquivado fora do ativo e mostrado como informativo', t4.includes('1 ativos') && t4.includes('Arquivados') && t4.includes('1 conteúdos') && t4.includes('1 cartões') && t4.includes('Cartões gerados desses conteúdos: 1'), t4);
    L('relearning conta como aprendendo; força fraca', t4.includes('1 aprendendo') && /1 fracos/.test(t4), t4);
    const t5 = await open(5); L('Self e Study com mesmo rowId não entram', t5.includes('Cartões gerados desses conteúdos: 1') && t5.includes('1 para revisar') && t5.includes('0 devidos') && !/Study|trilha/i.test(t5), t5);
    const t6 = await open(6); L('vários estados: 5 conteúdos, 4 estudados, 1 não iniciado', t6.includes('4 de 5') && /1 não iniciados · 1 fracos · 2 médios · 1 fortes/.test(t6), t6);
    L('sem XP/streak na tela', !/xp|streak|sequência/i.test(t6 + t3));
    L('rotulos: conteúdos x cartões', t6.includes('Conteúdos que você criou') && t6.includes('Cartões gerados desses conteúdos'));
    // cache: abrir de novo não refaz a RPC
    const calls = await page.evaluate(() => window.__rpcCalls); await page.click('[data-toggle-metrics="6"]'); await page.click('[data-toggle-metrics="6"]');
    L('cache por vínculo: sem nova RPC', (await page.evaluate(() => window.__rpcCalls)) === calls);
    L('nenhum erro de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();
