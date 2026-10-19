// Etapa 2 do plano "Voz da Prof. Brune" (2026-10-19): acessibilidade crítica no fr e no zh.
// Avisos rápidos (toast) com tempo de leitura e anunciados; janelas antigas com papel de janela, foco, Tab preso, Esc e
// foco devolvido; erros do francês em vermelho (o --seal-red do fr é azul). Rodar: node tests/acessibilidade/test_playwright.js
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
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const app of ['fr', 'zh']){
    for (const theme of ['light', 'dark']){
      const tag = `${app} ${theme}`;
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 }, serviceWorkers: 'block', colorScheme: theme });
      await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.goto(`${base}/${app}/index.html`);
      await page.waitForFunction(() => typeof showToast === 'function' && window.ModalA11y && CURRENT_USER === false, null, { timeout: 20000 });

      // avisos rápidos
      const layer = await page.evaluate(() => { const l = document.getElementById('toast-layer'); return { role: l.getAttribute('role'), live: l.getAttribute('aria-live') }; });
      check(`${tag}: camada dos avisos é anunciada (role=status, aria-live=polite)`, layer.role === 'status' && layer.live === 'polite', layer);
      await page.evaluate(() => { showToast('Salvo!'); showToast('Não foi possível ler este arquivo. Use um .apkg do Anki ou um .json exportado por este site.'); });
      await page.waitForTimeout(3000);
      let n = await page.evaluate(() => [...document.querySelectorAll('#toast-layer .toast')].map(t => t.textContent.length));
      check(`${tag}: com 3 s os dois avisos continuam na tela (antes sumiam aos 2 s)`, n.length === 2, n);
      await page.waitForTimeout(1500);
      n = await page.evaluate(() => [...document.querySelectorAll('#toast-layer .toast')].map(t => t.textContent.length));
      check(`${tag}: o curto some por volta de 4 s; o longo fica mais`, n.length === 1 && n[0] > 60, n);
      await page.hover('#toast-layer .toast');
      await page.waitForTimeout(3500);
      check(`${tag}: passar o mouse segura o aviso`, await page.evaluate(() => document.querySelectorAll('#toast-layer .toast').length === 1));
      await page.mouse.move(5, 790); await page.waitForTimeout(2200);
      check(`${tag}: tirar o mouse deixa o aviso sair`, await page.evaluate(() => document.querySelectorAll('#toast-layer .toast').length === 0));

      // janelas antigas
      const all = await page.evaluate(() => [...document.querySelectorAll('.app-modal-overlay, .manual-modal-overlay, .streak-modal-overlay')].map(el => {
        const lab = el.getAttribute('aria-labelledby'); const t = lab && document.getElementById(lab);
        return { id: el.id, role: el.getAttribute('role') || (el.querySelector('[role="dialog"],[role="alertdialog"]') ? 'filho' : ''), modal: el.getAttribute('aria-modal'), title: t ? t.textContent.trim().slice(0, 30) : '' };
      }));
      const bad = all.filter(m => !(m.role === 'filho' || (m.role === 'dialog' && m.modal === 'true' && m.title)));
      check(`${tag}: todas as ${all.length} janelas do HTML têm papel de janela e título`, all.length >= 14 && bad.length === 0, bad);
      // abre a janela de atalhos a partir de um botão com foco
      await page.evaluate(() => { const b = document.createElement('button'); b.id = 'abridor-teste'; b.textContent = 'abrir'; document.body.appendChild(b); b.focus(); document.getElementById('kbd-shortcuts-modal').style.display = 'flex'; });
      await page.waitForTimeout(150);
      let f = await page.evaluate(() => ({ inside: document.getElementById('kbd-shortcuts-modal').contains(document.activeElement), id: document.activeElement.id }));
      check(`${tag}: ao abrir, o foco vai para dentro da janela`, f.inside, f);
      for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
      check(`${tag}: Tab fica preso na janela`, await page.evaluate(() => document.getElementById('kbd-shortcuts-modal').contains(document.activeElement)));
      await page.keyboard.press('Shift+Tab');
      check(`${tag}: Shift+Tab também`, await page.evaluate(() => document.getElementById('kbd-shortcuts-modal').contains(document.activeElement)));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      f = await page.evaluate(() => ({ disp: document.getElementById('kbd-shortcuts-modal').style.display, id: document.activeElement.id }));
      check(`${tag}: Esc fecha pelo botão de fechar e o foco volta para quem abriu`, f.disp === 'none' && f.id === 'abridor-teste', f);
      // janela de escolha obrigatória (sem botão de fechar) não fecha com Esc
      await page.evaluate(() => { document.getElementById('ui-language-first-modal').style.display = 'flex'; });
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
      check(`${tag}: escolha obrigatória do idioma não fecha com Esc`, await page.evaluate(() => document.getElementById('ui-language-first-modal').style.display === 'flex'));
      await page.evaluate(() => { document.getElementById('ui-language-first-modal').style.display = 'none'; });
      // janela com o X tratado pelo próprio app: Reportar
      await page.evaluate(() => { document.getElementById('abridor-teste').focus(); if (typeof openReportModal === 'function') openReportModal(); else document.getElementById('report-modal').style.display = 'flex'; });
      await page.waitForTimeout(200);
      check(`${tag}: Reportar abre com o foco dentro`, await page.evaluate(() => document.getElementById('report-modal').contains(document.activeElement)));
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      check(`${tag}: Esc fecha o Reportar`, await page.evaluate(() => getComputedStyle(document.getElementById('report-modal')).display === 'none'));

      // erros em vermelho
      // o ditado só existe no fr
      const cor = await page.evaluate((app) => {
        const host = document.createElement('div'); document.body.appendChild(host);
        host.innerHTML = '<p class="profile-edit-error">erro</p><p class="login-note err">erro</p>' + (app === 'fr' ? '<span class="dictation-word-wrong">x</span>' : '');
        const rgb = (el) => getComputedStyle(el).color.match(/\d+/g).map(Number);
        const out = [...host.children].map(rgb); host.remove(); return out;
      }, app);
      check(`${tag}: mensagens de erro em vermelho (não azul)`, cor.every(([r, g, b]) => r > g + 60 && r > b + 60), cor);
      check(`${tag}: sem erro de página`, errs.length === 0, errs);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`acessibilidade (etapa 2): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})();
