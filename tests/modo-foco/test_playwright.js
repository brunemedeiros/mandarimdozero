// Modo foco na Conjugação, na Revisão e nos Desafios (shared/activity-focus.js): ao abrir a
// sessão, topo/menu/cartões somem (como nas lições) e aparece a ⚑ ao lado do link de voltar;
// ao sair, tudo volta. O foco de uma lição da trilha não é mexido. fr e zh (Revisão).
// Harness do navegador de Decks (convidado + Supabase stubado).
// Rodar: node tests/modo-foco/test_playwright.js
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
  window.__DB = { decks: [], own_flashcards: [] };
  window.__writes = [];
  function builder(table){
    const st = { table, filters: [], ins: [], op: 'select', patch: null };
    const match = (row) => st.filters.every(([k, v]) => d(row, k, v)) && st.ins.every(([k, vs]) => vs.includes(row[k]));
    function d(row, k, v){ return row[k] === v; }
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
      if (prop === 'then') return (ok, ko) => Promise.resolve({ data: exec(), error: null }).then(ok, ko);
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.ins.push([k, vs]); return b; };
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


const state = (page) => page.evaluate(() => {
  const vis = sel => Array.from(document.querySelectorAll(sel)).some(el => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0);
  return { focus: document.body.classList.contains('lesson-focus'), owner: document.body.dataset.activityFocus || null,
    topbar: vis('.topbar'), sidebar: vis('.sidebar'), cards: vis('.right-cards'), flag: vis('.activity-report-btn, .activity-flag-btn') };
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---- fr: Conjugação ----
  {
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light', { width: 1280, height: 900 });
    await page.evaluate(() => switchTab('conjugaison'));
    let s = await state(page);
    check('fr conj: tela de escolha sem foco', !s.focus && s.topbar && s.sidebar && !s.flag, s);
    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box');
    s = await state(page);
    check('fr conj: sessão em foco (sem topo, menu e cartões; com ⚑)', s.focus && s.owner === 'conjugaison' && !s.topbar && !s.sidebar && !s.cards && s.flag, s);
    // Prática no molde da trilha (2026-10-26): barra com progresso, ⚑, ⌨️ e X no lugar do link de voltar.
    const bar = await page.evaluate(() => { const b = document.querySelector('#conj-practice-wrap .activity-lesson-bar');
      return b && b.querySelector('.activity-exit-btn') && b.querySelector('[data-report-flag]') && b.querySelector('.activity-kbd-btn') ? true : false; });
    check('fr conj: X, ⌨️ e ⚑ na mesma barra (molde da trilha)', bar);
    await page.click('#conj-practice-wrap .activity-flag-btn');
    check('fr conj: ⚑ abre o report', await page.evaluate(() => { const m = document.getElementById('report-modal'); return !!m && getComputedStyle(m).display !== 'none'; }));
    await page.evaluate(() => { const m = document.getElementById('report-modal'); if (typeof closeReportModal === 'function') closeReportModal(); else if (m) m.style.display = 'none'; });
    await page.click('#conj-practice-wrap .activity-exit-btn');
    s = await state(page);
    check('fr conj: voltar à seleção desliga o foco', !s.focus && !s.owner && s.topbar && s.sidebar, s);
    // Sessão aberta e troca de aba por fora (ex.: rota): o foco não fica preso.
    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box');
    await page.evaluate(() => switchTab('profile'));
    s = await state(page);
    check('fr conj: trocar de aba no meio da sessão desliga o foco', !s.focus && !s.owner && s.topbar, s);
    check('fr conj: zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- fr: Revisão e Desafios; lição da trilha intacta ----
  {
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light', { width: 1280, height: 900 });
    await page.evaluate(() => switchTab('review'));
    await page.evaluate(() => openReviewSession('flashcard'));
    let s = await state(page);
    check('fr revisão: sessão em foco', s.focus && s.owner === 'review' && !s.topbar && !s.sidebar && s.flag, s);
    await page.click('#review-back-to-modes');
    s = await state(page);
    check('fr revisão: voltar aos modos desliga o foco', !s.focus && !s.owner && s.topbar, s);
    await page.evaluate(() => openReviewSession('speed'));
    s = await state(page);
    check('fr revisão: Speed Review também em foco', s.focus && s.owner === 'review', s);
    await page.evaluate(() => backToReviewModeSelect());

    await page.evaluate(() => switchTab('challenges'));
    await page.evaluate(() => { document.getElementById('challenges-categories-wrap').style.display = 'none'; document.getElementById('challenge-player-wrap').style.display = 'block'; });
    s = await state(page);
    check('fr desafios: desafio aberto em foco', s.focus && s.owner === 'challenges' && !s.topbar && s.flag, s);
    await page.evaluate(() => renderChallengeCategories());
    s = await state(page);
    check('fr desafios: voltar desliga o foco', !s.focus && !s.owner && s.topbar, s);

    // Lição da trilha: o foco é dela; o módulo não desliga.
    await page.evaluate(() => switchTab('path'));
    await page.evaluate(() => setLessonFocusMode(true));
    await page.evaluate(() => switchTab('path'));
    s = await state(page);
    check('fr trilha: foco da lição não é mexido', s.focus && !s.owner, s);
    await page.evaluate(() => setLessonFocusMode(false));
    check('fr revisão/desafios: zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- zh: Revisão; celular (fr) ----
  {
    const { page, errors, ctx } = await bootPage(browser, 'zh', port, 'dark', { width: 1280, height: 900 });
    await page.evaluate(() => switchTab('review'));
    await page.evaluate(() => openReviewSession('flashcard'));
    let s = await state(page);
    check('zh revisão: sessão em foco', s.focus && s.owner === 'review' && !s.topbar && s.flag, s);
    await page.click('#review-back-to-modes');
    s = await state(page);
    check('zh revisão: voltar desliga o foco', !s.focus && !s.owner && s.topbar, s);
    check('zh: zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }
  {
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light', { width: 390, height: 844 });
    await page.evaluate(() => switchTab('conjugaison'));
    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box');
    const m = await page.evaluate(() => { const nav = document.querySelector('.bottom-nav'); const f = document.querySelector('#conj-practice-wrap .activity-flag-btn').getBoundingClientRect();
      return { nav: !!nav && getComputedStyle(nav).display !== 'none', flag: Math.round(f.width), noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
    check('celular: sem barra de baixo no foco, ⚑ com 44px, sem rolagem lateral', !m.nav && m.flag >= 44 && m.noOverflow, m);
    check('celular: zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log('Modo foco playwright: ' + passed + '/' + (passed + failed) + ' verificações' + (failed ? '' : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
