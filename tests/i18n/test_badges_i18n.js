// i18n Fase 11 -- nomes/descrições de conquistas (BADGES, SPECIAL_BADGES, badge_catalog).
// pt-BR idêntico ao commit anterior à fase; ?ui=en traduzido; badge do catálogo sem
// tradução cai no texto do banco. Rodar: node tests/i18n/test_badges_i18n.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const PREV = process.env.I18N_PREV_BADGES || '7ac40c4';
const PREV_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bdg-prev-'));
execSync(`git archive ${PREV} fr zh shared languages icons | tar -x -C ${PREV_DIR}`, { cwd: ROOT });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const serve = (root) => http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) ok++; else { bad++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const STUB = `window.supabase={createClient(){return{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},order(){return q},maybeSingle:async()=>({data:null,error:null}),then(r){r({data:[],error:null})}};return q},channel(){return{on(){return this},subscribe(){return this}}}}}};`;
(async () => {
  const cur = serve(ROOT), prev = serve(PREV_DIR);
  await new Promise(r => cur.listen(0, r)); await new Promise(r => prev.listen(0, r));
  const browser = await chromium.launch();
  const grab = async (port, site, q) => { const ctx = await browser.newContext({ serviceWorkers: 'block' }); const page = await ctx.newPage();
    // Só o CDN do Supabase (antes '**/*supabase*' pegava também ../shared/supabase-client.js e o app não iniciava).
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} }); // convidado: o app inicia e semeia as conquistas
    await page.goto(`http://localhost:${port}/${site}/${q}`); await page.waitForFunction(() => typeof BADGES !== 'undefined' && typeof SPECIAL_BADGES !== 'undefined', null, { timeout: 15000 });
    await page.waitForTimeout(800);
    // Conquistas com níveis: BADGES é preenchido ao semear (depois de carregar o progresso).
    await page.waitForFunction(() => BADGES.length > 0, null, { timeout: 15000 }).catch(() => {});
    const r = await page.evaluate(() => ({ b: BADGES.map(b => [b.id, b.name, b.desc]), s: SPECIAL_BADGES.map(b => [b.id, b.name, b.desc]),
      cat: typeof catalogBadgeText === 'function' ? [catalogBadgeText('student', 'name', 'X'), catalogBadgeText('novo-sem-traducao', 'name', 'Texto do banco')] : null }));
    await ctx.close(); return r; };
  for (const site of ['fr', 'zh']) {
    const before = await grab(prev.address().port, site, ''); const pt = await grab(cur.address().port, site, '');
    const en = await grab(cur.address().port, site, '?ui=en');
    // 2026-10-14: conquistas com níveis (docs/conquistas-proposta-niveis.md) trocaram os nomes de propósito. BADGES virou a
    // lista de níveis das trilhas; o texto de antes continua só na clássica Multitarefa.
    check(`${site}: BADGES pt-BR com os nomes aprovados (${pt.b.length} níveis)`, pt.b.length >= 40 && ['Revisor(a) Aprendiz', 'Uma Semana!', 'Primeiro Passo', 'Mestre da Revisão'].every(n => pt.b.some(x => x[1] === n)), pt.b.slice(0, 3));
    check(`${site}: Multitarefa (clássica) com o texto de antes`, JSON.stringify(pt.b.find(x => x[0] === 'multitasker')) === JSON.stringify(before.b.find(x => x[0] === 'multitasker')));
    check(`${site}: SPECIAL_BADGES pt-BR idêntico`, JSON.stringify(pt.s) === JSON.stringify(before.s));
    check(`${site}: em inglês, nomes mudam e nenhum vira chave`, en.b.length === pt.b.length && en.b.every((x, i) => x[1] !== pt.b[i][1]) && en.b.every(x => !x[1].startsWith('badge.') && !x[2].startsWith('badge.')));
    check(`${site}: Fundadora/Beta em inglês`, en.s[0][1] === 'Founder' && en.s[1][2].startsWith('Helped test'));
    check(`${site}: catálogo traduzido e fallback pro banco`, en.cat && en.cat[0] === "Prof. Brune's student" && en.cat[1] === 'Texto do banco');
    check(`${site}: pt-BR do catálogo igual ao banco`, pt.cat && pt.cat[0] === 'Aluno/a da Prof. Brune');
  }
  await browser.close(); cur.close(); prev.close(); console.log(`${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
