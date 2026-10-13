// Conjugação (só fr): disposição da tabela de prática como num livro de
// conjugação (singular à esquerda, plural à direita, pronome na linha do
// campo), tempo único em largura cheia, listas da escolha agrupadas e
// celular sem rolagem horizontal. Playwright (Chromium real), claro/escuro.
// Harness do navegador de Decks (convidado + Supabase stubado).
// Rodar: node tests/conjugacao/test_playwright.js
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

async function fill(page, wrongIdx){
  await page.evaluate((w) => {
    const verb = CONJ_STATE.verbQueue[CONJ_STATE.verbIndex];
    document.querySelectorAll('.conj-field').forEach((f) => {
      const inp = f.querySelector('input'); if (!inp || inp.disabled) return;
      const exp = (getConjForms(verb, f.dataset.tense) || [])[Number(f.dataset.idx)] || '';
      inp.value = Number(f.dataset.idx) === w ? 'xxx' : exp;
    });
  }, wrongIdx);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const theme of ['light', 'dark']){
    const { page, errors, ctx } = await bootPage(browser, 'fr', port, theme);
    const L = (n, c, x) => check(theme + ' ' + n, c, x);
    await page.evaluate(() => switchTab('conjugaison'));
    await page.waitForSelector('#conj-tense-list .conj-check-item');
    const sel = await page.evaluate(() => {
      const list = document.getElementById('conj-tense-list');
      const items = Array.from(list.querySelectorAll('.conj-check-item'));
      const h3 = document.querySelector('.conj-select-col h3');
      return { n: items.length, gap: getComputedStyle(list).rowGap, caps: getComputedStyle(h3).textTransform, itemH: Math.min(...items.map(i => i.getBoundingClientRect().height)) };
    });
    L('escolha: tempos numa lista agrupada (sem espaço entre itens)', sel.n > 3 && (sel.gap === '0px' || sel.gap === 'normal'), sel);
    L('escolha: títulos sem caixa alta', sel.caps === 'none', sel.caps);
    L('escolha: itens com 44px de toque', sel.itemH >= 44, sel.itemH);

    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box .conj-field input');
    const lay = await page.evaluate(() => {
      const box = document.querySelector('.conj-tense-box').getBoundingClientRect();
      const grid = document.querySelector('.conj-tense-grid').getBoundingClientRect();
      const r = i => document.querySelector('.conj-field[data-idx="' + i + '"] input').getBoundingClientRect();
      const lab = i => document.querySelector('.conj-field[data-idx="' + i + '"] label').getBoundingClientRect();
      const p = [0, 1, 2, 3, 4, 5].map(r);
      return { single: document.querySelectorAll('.conj-tense-box').length === 1, full: Math.abs(box.width - grid.width) < 2,
        leftCol: p[0].left === p[1].left && p[1].left === p[2].left, rightCol: p[3].left === p[4].left && p[4].left === p[5].left,
        rightOfLeft: p[3].left > p[0].right, sameRow: Math.abs(p[0].top - p[3].top) < 2 && Math.abs(p[2].top - p[5].top) < 2,
        labelLeft: lab(0).right <= p[0].left && lab(0).top >= p[0].top - 1 && lab(0).bottom <= p[0].bottom + 1 };
    });
    L('prática: um tempo só ocupa a largura toda', lay.single && lay.full, lay);
    L('prática: je/tu/il numa coluna, nous/vous/ils na outra, lado a lado', lay.leftCol && lay.rightCol && lay.rightOfLeft && lay.sameRow, lay);
    L('prática: pronome à esquerda do campo, na mesma linha', lay.labelLeft, lay);

    await fill(page, 3);
    await page.click('#conj-verify-btn');
    await page.waitForSelector('.conj-field.wrong');
    const chk = await page.evaluate(() => {
      const r = i => document.querySelector('.conj-field[data-idx="' + i + '"] input').getBoundingClientRect();
      return { wrong: document.querySelector('.conj-field.wrong').dataset.idx, exp: document.querySelector('.conj-field.wrong .expected').textContent,
        aligned: Math.abs(r(0).top - r(3).top) < 2, ok: document.querySelectorAll('.conj-field.ok').length };
    });
    L('corrigir: erro mostra a forma certa e acertos ficam verdes', chk.wrong === '3' && chk.exp.startsWith('→') && chk.ok === 5, chk);
    L('corrigir: a correção embaixo não desalinha je e nous', chk.aligned, chk);
    L('zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }

  // Celular (390px): sem rolagem horizontal; tabela numa coluna só.
  const { page, errors, ctx } = await bootPage(browser, 'fr', port, 'light', { width: 390, height: 844 });
  await page.evaluate(() => switchTab('conjugaison'));
  await page.waitForSelector('#conj-tense-list .conj-check-item');
  const ov1 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check('celular: escolha sem rolagem horizontal', ov1);
  await page.click('#conj-start-btn');
  await page.waitForSelector('.conj-tense-box .conj-field input');
  const m = await page.evaluate(() => {
    const p = [0, 3].map(i => document.querySelector('.conj-field[data-idx="' + i + '"] input').getBoundingClientRect());
    return { oneCol: p[0].left === p[1].left && p[1].top > p[0].top, noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1 };
  });
  check('celular: tabela numa coluna (je ... ils, de cima para baixo)', m.oneCol, m);
  check('celular: prática sem rolagem horizontal', m.noOverflow, m);
  check('celular: zero pageerror', errors.length === 0, errors);
  await ctx.close();

  await browser.close(); server.close();
  console.log('Conjugação playwright: ' + passed + '/' + (passed + failed) + ' verificações' + (failed ? '' : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
