// Portão de entrada (index.html da raiz: idioma, login e cadastro): caixas com texto usam --brand-fill (azul #2879B3) com branco,
// claro e escuro, igual ao fr (decisão de 2026-10-19). Antes: #3498D6 + branco = 3,2:1.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH, '/opt/node22/lib/node_modules', '/opt/node-tools/node_modules'].filter(Boolean) }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'); let ok = 0, bad = 0;
const L = (n, c, i) => { if (c) ok++; else { bad++; console.log('FALHOU:', n, i === undefined ? '' : JSON.stringify(i)); } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const STUB = `(function(){ const b = new Proxy({}, { get(_, k){ if (k === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) }, from: () => b, rpc: async () => ({ data: null, error: null }), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), functions: { invoke: async () => ({ data: null, error: null }) } };
  window.supabase = { createClient: () => client }; })();`;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 1000, height: 800 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); const erros = [];
    p.on('pageerror', e => erros.push(e.message)); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await p.goto(base + '/index.html'); await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const prob = (bg, fg) => { const P = s => s.match(/[\d.]+/g).map(Number); const l = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }; const a = l(P(bg)), c = l(P(fg)); return (Math.max(a, c) + .05) / (Math.min(a, c) + .05); };
      const alvo = [...document.querySelectorAll('.btn-primary, .gate-speak button[aria-pressed="true"]')].filter(e => e.getBoundingClientRect().width > 0);
      return { n: alvo.length, itens: alvo.map(e => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, fg: cs.color, c: +prob(cs.backgroundColor, cs.color).toFixed(2) }; }) };
    });
    L(`portão ${scheme}: há caixa(s) com a cor da marca na tela (${r.n})`, r.n > 0, r);
    L(`portão ${scheme}: fundo --brand-fill, texto branco, contraste >= 4,5:1`, r.itens.every(i => i.bg === 'rgb(40, 121, 179)' && i.fg === 'rgb(255, 255, 255)' && i.c >= 4.5), r.itens);
    L(`portão ${scheme}: sem erros de JS`, erros.length === 0, erros); await ctx.close();
  }
  await b.close(); server.close(); console.log(`cores-marca portão: ${ok}/${ok + bad} checks`); if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
