// Exercícios de digitar do francês no navegador: teclado de letras (letras extras só quando a resposta pede) e
// cartão com duas formas ("allemand / allemande": barra e vírgula valem, ordem trocada não).
// Rodar: node tests/respostas-digitadas/test_playwright.js
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

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });

  const keys = await page.evaluate(() => {
    const n = (h) => { const d = document.createElement('div'); d.innerHTML = h; return [...d.querySelectorAll('.fr-accent-key')].map(b => b.textContent); };
    return { base: n(frAccentPickerHTML()), cur: n(frAccentPickerHTML('cœur')), ae: n(frAccentPickerHTML('curriculum vitæ')), mix: n(frAccentPickerHTML('Ñandú ß')) };
  });
  check('teclado de sempre: 14 teclas, com ç e œ', keys.base.length === 14 && keys.base.includes('ç') && keys.base.includes('œ'), keys.base);
  check('resposta só com letras do teclado: nada a mais', keys.cur.length === 14, keys.cur);
  check('resposta com æ: entra a tecla æ (15 teclas)', keys.ae.length === 15 && keys.ae[14] === 'æ', keys.ae);
  check('letras extras sem repetir, em minúscula (ñ, ú, ß)', keys.mix.slice(14).join('') === 'ñúß', keys.mix);

  // exercício "Digite o que ouviu" com cartão de duas formas
  async function roda(typed, f){
    return page.evaluate(async ([typed, f]) => {
      STATE.currentUnitId = UNITS[0].id;
      const el = document.getElementById('step-content'), nb = document.getElementById('step-next-btn');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const v = el.closest('.view'); if (v) v.classList.add('active');
      STEP_STATE.exerciseAnswered = false; STEP_STATE.exerciseIndex = 0; STEP_STATE.exerciseList = [1, 2, 3, 4];
      renderVocabTypeExercise({ item: { f, t: 'x' }, format: 'vocabType' }, el, nb, 4);
      const picker = [...el.querySelectorAll('.fr-accent-key')].map(b => b.textContent).join('');
      document.getElementById('vocab-type-input').value = typed;
      document.getElementById('vocab-type-verify-btn').click();
      await new Promise(r => setTimeout(r, 250));
      return { wrong: !!el.querySelector('.wrong-feedback'), attempt: (el.querySelector('.typed-attempt') || {}).textContent || null, picker };
    }, [typed, f]);
  }
  let r;
  r = await roda('allemand / allemande', 'allemand / allemande'); check('texto inteiro com barra = acerto', !r.wrong, r);
  r = await roda('allemand, allemande', 'allemand / allemande'); check('vírgula = acerto', !r.wrong, r);
  r = await roda('allemande / allemand', 'allemand / allemande'); check('ordem trocada = erro', r.wrong, r);
  r = await roda('allemand / allemand', 'allemand / allemande'); check('segunda forma incompleta = erro, com "Sua resposta" marcada', r.wrong && r.attempt === 'allemand / allemand', r);
  r = await roda('x', 'curriculum vitæ'); check('exercício que pede æ mostra a tecla æ', r.picker.endsWith('æ'), r.picker);
  check('0 pageerrors (fora o esperado sem rede)', errors.filter(e => !/createClient|Failed to fetch|NetworkError/.test(e)).length === 0, errors.slice(0, 3));
  console.log(`respostas digitadas no navegador: ${passed} passaram, ${failed} falharam`);
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
});
