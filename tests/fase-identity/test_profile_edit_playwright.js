// Identity -- Playwright (Chromium real), FR + ZH: edição de perfil com username somente leitura.
// Stub em memória do Supabase (CDN bloqueado no sandbox), reaproveitado da Fase I.
// Rodar: node tests/fase-identity/test_profile_edit_playwright.js
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
const base = fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8');
let STUB = base.slice(base.indexOf('const STUB = `') + 'const STUB = `'.length);
STUB = STUB.slice(0, STUB.indexOf('\n})();`;') + '\n})();'.length);
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const L = (n, c, x) => check(lang + ' ' + n, c, x);

    // conta com username LEGADO (com ".") e outra com username gerado
    const seeded = await page.evaluate(() => {
      window.__DB.profiles.push({ user_id: 'U', username: 'ana.silva', display_name: 'Ana', bio: 'oi', public_profile: true, featured_badge_id: null, avatar_url: null });
      CURRENT_USER = { id: 'U', email: 'ana@example.com' }; window.__uid = 'U';
      window.__writes = [];
      const origFrom = supabaseClient.from.bind(supabaseClient);
      supabaseClient.from = (t) => { const b = origFrom(t); if (t !== 'profiles') return b;
        return new Proxy(b, { get(tg, p){ const v = tg[p]; if (p === 'update' || p === 'insert') return (pl) => { window.__writes.push({ op: p, pl: JSON.parse(JSON.stringify(pl)) }); return v.call(tg, pl); }; return typeof v === 'function' ? v.bind(tg) : v; } }); };
      PROFILE_CACHE = null;
      return true;
    });
    await page.evaluate(async () => { PROFILE_CACHE = await ensureProfileLoaded(); openEditProfileModal([]); });
    await page.waitForSelector('#profile-edit-modal', { state: 'visible' });

    const f = await page.evaluate(() => { const u = document.getElementById('profile-edit-username'); return { v: u.value, ro: u.readOnly, label: document.querySelector('label[for="profile-edit-username"]').textContent }; });
    L('modal abre com o username atual', f.v === 'ana.silva', f);
    L('campo username é somente leitura', f.ro === true);
    L('rótulo comunica identificador permanente (não "Nome de usuário")', /permanente/i.test(f.label), f.label);

    // tentativa de digitar: readonly impede; força via DOM + evento e confirma que o save ignora
    await page.evaluate(() => { const u = document.getElementById('profile-edit-username'); u.removeAttribute('readonly'); u.value = 'hacker'; u.dispatchEvent(new Event('input')); });
    await page.fill('#profile-edit-display-name', 'Ana Santos');
    await page.click('#profile-edit-save-btn');
    await page.waitForFunction(() => window.__writes.some(w => w.op === 'update'), null, { timeout: 8000 });
    // (o stub devolve array no update().single(); recarrega o cache como o app faria numa nova sessão)
    const w = await page.evaluate(async () => { PROFILE_CACHE = null; PROFILE_CACHE = await ensureProfileLoaded(); return { writes: window.__writes, row: window.__DB.profiles.find(p => p.user_id === 'U'), cache: PROFILE_CACHE }; });
    const upd = w.writes.find(x => x.op === 'update');
    L('save envia display_name', upd && upd.pl.display_name === 'Ana Santos', upd);
    L('save NÃO envia username (mesmo adulterando o campo no DOM)', upd && !('username' in upd.pl) && !('user_id' in upd.pl), upd);
    L('nenhum INSERT em profiles pelo cliente', !w.writes.some(x => x.op === 'insert'));
    L('username permanece o mesmo após salvar', w.row.username === 'ana.silva' && w.cache.username === 'ana.silva', w.row);
    L('display_name atualizado', w.row.display_name === 'Ana Santos');

    // reabrir: campo continua mostrando o username original; perfil público mesma URL
    await page.evaluate(() => { openEditProfileModal([]); });
    L('reabrir mostra username original', (await page.inputValue('#profile-edit-username')) === 'ana.silva');
    const route = await page.evaluate(() => { const r = (typeof routeToHash === 'function') ? routeToHash({ type: 'publicProfile', username: PROFILE_CACHE.username }) : null; return r; });
    L('URL do perfil público estável (usa username, não display_name)', route === null || route === '#/user/ana.silva', route);
    L('sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Identity profile-edit playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();
