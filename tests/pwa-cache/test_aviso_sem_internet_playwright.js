// Aviso "Você está sem internet" por cima do site (shared/sem-internet.js + .css; decisão da autora, 2026-11-13).
// Caso: a internet cai com o site JÁ aberto (a abertura sem internet é a tela shared/offline.html, ver test_playwright.js).
// Playwright/Chromium real, fr e zh, arquivos de PRODUÇÃO; só o Supabase é trocado por um stub (aluna logada).
// Prova, em cada site:
//   1. a internet cai: na hora aparece o aviso por cima, com o texto em pt-BR (en no site em inglês);
//   2. o site por baixo fica bloqueado: inerte (sem toque nem foco) e os atalhos de teclado não passam;
//   3. a internet volta: o aviso some sozinho, nada é recarregado (a aluna continua de onde parou) e o site volta a responder;
//   4. progresso não confirmado (o supabase-js avisa "SIGNED_IN" ao voltar para a aba e a releitura falha sem internet):
//      ao voltar a internet, o app lê o progresso de novo e volta a poder salvar;
//   5. a rede cai SEM o evento 'offline' (o que aconteceu no celular da autora, 2026-11-14): o próprio site percebe pelo
//      áudio que não toca, por um pedido que falha e pelo batimento, mostra o aviso e o esconde quando a rede volta, mesmo
//      sem o evento 'online';
//   6. 0 erro de página. SHOTS=<pasta> salva capturas fr/zh x claro/escuro x 390 px.
// Rodar: node tests/pwa-cache/test_aviso_sem_internet_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `(function(){
  window.__loads = 0;
  const mk = (table) => { let single = false; const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => {
        let data = single ? null : [];
        if (table === 'progress' && single){ window.__loads++; data = { data: {} }; }
        return Promise.resolve({ data, error: null }).then(ok, ko);
      };
      if (p === 'maybeSingle' || p === 'single') return () => { single = true; return b; };
      return () => b; } }); return b; };
  const user = { id: 'u-offline', email: 'ana@exemplo.com', user_metadata: { full_name: 'Ana Souza' }, created_at: new Date().toISOString() };
  const client = { auth: { getSession: async () => ({ data: { session: { user, access_token: 'x' } } }), getUser: async () => ({ data: { user } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }) },
    from: (t) => mk(t), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel(){},
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let pass = 0, fail = 0;
const check = (label, cond, extra) => { if (cond) pass++; else { fail++; console.log('  FALHOU:', label, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };

async function abrir(browser, base, site, o){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, serviceWorkers: 'block',
    colorScheme: o.tema || 'light', locale: o.lang, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ lang, tema }) => { try { localStorage.setItem('ui-language', lang); localStorage.setItem('ui-language-gate', lang); localStorage.setItem('app_theme', tema); } catch (e) {} }, { lang: o.lang, tema: o.tema || 'light' });
  if (o.intervalos) await ctx.addInitScript((iv) => { window.__semInternetIntervalos = iv; }, o.intervalos);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  // A última rota registrada vence: primeiro o bloqueio geral, depois o stub do Supabase.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.goto(`${base}/${site}/index.html`);
  await page.waitForFunction(() => typeof CURRENT_USER !== 'undefined' && CURRENT_USER && progressLoadedOk, null, { timeout: 25000 });
  await page.waitForTimeout(800);
  return { ctx, page, errs };
}

const estado = (page) => page.evaluate(() => {
  const el = document.getElementById('sem-internet-aviso');
  const app = document.getElementById('app');
  return {
    visivel: !!el && !el.hidden && getComputedStyle(el).display !== 'none',
    titulo: el ? el.querySelector('.sem-internet-titulo').textContent : '',
    texto: el ? el.querySelector('.sem-internet-texto').textContent : '',
    appInerte: !!(app && app.inert),
    logo: !!(el && el.querySelector('.sem-internet-logo') && el.querySelector('.sem-internet-logo').naturalWidth > 0),
    marca: window.__marcaSemRecarregar || null,
    teclas: window.__teclasQuePassaram || 0,
    progressLoadedOk: typeof progressLoadedOk !== 'undefined' ? progressLoadedOk : null,
    loads: window.__loads,
  };
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const site of ['fr', 'zh']){
      // pt-BR, claro: fluxo completo
      const { ctx, page, errs } = await abrir(browser, base, site, { lang: 'pt-BR' });
      await page.evaluate(() => { window.__marcaSemRecarregar = 'mesma-pagina'; window.__teclasQuePassaram = 0;
        window.addEventListener('keydown', () => { window.__teclasQuePassaram++; }); });
      check(`${site}: com internet, sem aviso`, !(await estado(page)).visivel);

      await ctx.setOffline(true);
      await page.waitForTimeout(300);
      const off = await estado(page);
      check(`${site}: a internet cai e o aviso aparece na hora, em pt-BR`, off.visivel && off.titulo === 'Você está sem internet'
        && off.texto === 'Assim que a internet voltar, você continua de onde parou.', off);
      check(`${site}: o site por baixo fica inerte (sem toque nem foco)`, off.appInerte, off);
      check(`${site}: o logo aparece mesmo sem internet (baixado na abertura)`, off.logo, off);
      await page.keyboard.press('1'); await page.keyboard.press('Enter');
      check(`${site}: atalhos de teclado não passam com o aviso aberto`, (await estado(page)).teclas === 0, await estado(page));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `aviso-${site}-claro-390.png`) });

      // simula o "SIGNED_IN" ao voltar para a aba: releitura do progresso falhou sem internet
      const loadsAntes = (await estado(page)).loads;
      await page.evaluate(() => { progressLoadedOk = false; });
      await ctx.setOffline(false);
      await page.waitForFunction(() => progressLoadedOk === true, null, { timeout: 15000 }).catch(() => {});
      const on = await estado(page);
      check(`${site}: a internet volta e o aviso some sozinho`, !on.visivel && !on.appInerte, on);
      check(`${site}: nada é recarregado (continua de onde parou)`, on.marca === 'mesma-pagina', on);
      check(`${site}: progresso não confirmado é lido de novo ao voltar a internet`, on.progressLoadedOk === true && on.loads > loadsAntes, on);
      await page.keyboard.press('Escape');
      check(`${site}: o teclado volta a funcionar`, (await estado(page)).teclas >= 1, await estado(page));
      check(`${site}: 0 erro de página`, errs.length === 0, errs);
      await ctx.close();

      // Rede cai SEM o evento 'offline' (navigator.onLine continua true): bloqueia todo pedido da página.
      for (const gatilho of ['audio', 'pedido', 'batimento']){
        const sx = await abrir(browser, base, site, { lang: 'pt-BR', intervalos: { batimento: 1500, rechecar: 700, espera: 0 } });
        const cair = () => sx.page.route('**/*', r => r.abort('internetdisconnected'));
        await sx.page.waitForTimeout(300);
        check(`${site} (${gatilho}): com rede, sem aviso (o batimento não dá alarme falso)`, !(await estado(sx.page)).visivel);
        await cair();
        if (gatilho === 'audio') await sx.page.evaluate(() => { new Audio('./audio/nao-existe-' + Date.now() + '.mp3').play().catch(() => {}); });
        if (gatilho === 'pedido') await sx.page.evaluate(() => { fetch('./nao-existe-' + Date.now() + '.json').catch(() => {}); });
        await sx.page.waitForFunction(() => window.semInternetAviso && window.semInternetAviso.visivel(), null, { timeout: 8000 }).catch(() => {});
        const ox = await estado(sx.page);
        check(`${site} (${gatilho}): rede caiu sem o evento 'offline' e o aviso aparece`, ox.visivel && ox.appInerte && (await sx.page.evaluate(() => navigator.onLine)) === true, ox);
        await sx.page.unrouteAll({ behavior: 'ignoreErrors' });
        await sx.page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
        await sx.page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
        await sx.page.waitForFunction(() => window.semInternetAviso && !window.semInternetAviso.visivel(), null, { timeout: 8000 }).catch(() => {});
        const vx = await estado(sx.page);
        check(`${site} (${gatilho}): rede volta sem o evento 'online' e o aviso some sozinho`, !vx.visivel && !vx.appInerte, vx);
        check(`${site} (${gatilho}): 0 erro de página`, sx.errs.length === 0, sx.errs);
        await sx.ctx.close();
      }

      // en (texto) e escuro (captura)
      const en = await abrir(browser, base, site, { lang: 'en', tema: 'dark' });
      await en.ctx.setOffline(true); await en.page.waitForTimeout(300);
      const offEn = await estado(en.page);
      check(`${site}: site em inglês, aviso em inglês`, offEn.visivel && offEn.titulo === "You're offline"
        && offEn.texto === "As soon as you're back online, you'll pick up right where you left off.", offEn);
      if (SHOTS) await en.page.screenshot({ path: path.join(SHOTS, `aviso-${site}-escuro-390-en.png`) });
      check(`${site} (en): 0 erro de página`, en.errs.length === 0, en.errs);
      await en.ctx.close();

      if (SHOTS){
        const d = await abrir(browser, base, site, { lang: 'pt-BR', tema: 'dark' });
        await d.ctx.setOffline(true); await d.page.waitForTimeout(300);
        await d.page.screenshot({ path: path.join(SHOTS, `aviso-${site}-escuro-390.png`) });
        await d.ctx.close();
      }
    }
  } finally { await browser.close(); server.close(); }
  console.log(`Aviso sem internet (site aberto): ${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
