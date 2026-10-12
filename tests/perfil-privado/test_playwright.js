// Etapa 3b (perfil privado) no site: Deck criado à mão nasce público só em conta pública; import nasce privado;
// perfil privado visto por estranho mostra nome/@/badges sem foto e bio; leituras novas caem na antiga sem a 080.
// Rodar: node tests/perfil-privado/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const STUB = /const STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof createPersonalDeck === 'function' && typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0);
    const L = (n, c, x) => check(`${lang} ${n}`, c, x);
    const r = await page.evaluate(async () => {
      CURRENT_USER = { id: 'U1' }; window.__uid = 'U1';
      const decks = [{ id: 1, kind: 'personal_root', owner_id: 'U1', language_app_key: APP_KEY, name: 'Meus Decks' }];
      window.__DB.decks = decks.slice();
      const calls = [];
      const orig = supabaseClient.rpc.bind(supabaseClient);
      supabaseClient.rpc = async (n, a) => { calls.push([n, a]);
        if (n === 'publish_deck') return { data: { public_id: 'pid-' + a.p_deck_id, published_at: '2026-10-12', visible_on_profile: true }, error: null };
        return orig(n, a); };
      // insert em decks: o stub da fase-i só aceita Decks de professora; aqui um insert simples
      let seq = 100; const origFrom = supabaseClient.from.bind(supabaseClient);
      supabaseClient.from = (t) => t !== 'decks' ? origFrom(t) : ({ insert: (row) => ({ select: () => ({ single: async () => ({ data: Object.assign({ id: ++seq, is_public: false }, row), error: null }) }) }) });
      const out = {};
      PROFILE_CACHE = { user_id: 'U1', public_profile: true };
      out.manualPublic = (await createPersonalDeck({ name: 'A', parentDeckId: 1, languageAppKey: APP_KEY, decks, source: 'manual' })).deck;
      out.importPublic = (await createPersonalDeck({ name: 'B', parentDeckId: 1, languageAppKey: APP_KEY, decks })).deck;
      PROFILE_CACHE = { user_id: 'U1', public_profile: false };
      out.manualPrivate = (await createPersonalDeck({ name: 'C', parentDeckId: 1, languageAppKey: APP_KEY, decks, source: 'manual' })).deck;
      out.publishCalls = calls.filter(c => c[0] === 'publish_deck').length;
      // leituras com fallback (sem a 080 o stub devolve data null)
      window.__DB.profiles = [{ user_id: 'X', username: 'xis', display_name: 'Xis', avatar_url: 'a.png' }];
      out.cards = await fetchProfileCards(['X']);
      // perfil privado visto por estranho (get_profile_card da 080)
      supabaseClient.rpc = async (n, a) => {
        if (n === 'get_profile_card') return { data: { user_id: 'P', username: 'paula', display_name: 'Paula', avatar_url: null, bio: null, featured_badge_id: null, is_public: false, full_access: false }, error: null };
        if (n === 'get_public_profile_stats') return { data: { error: 'not_public' }, error: null };
        return orig(n, a); };
      const host = document.createElement('div'); document.body.prepend(host);
      await renderPublicProfileInto(host, 'paula');
      out.profileText = host.innerText;
      out.hasImg = !!host.querySelector('img.public-profile-avatar');
      return out;
    });
    L('Deck à mão em conta pública nasce público', r.manualPublic.is_public === true && r.manualPublic.public_id === 'pid-' + r.manualPublic.id, r.manualPublic);
    L('Deck sem source (import/cópia) nasce privado', !r.importPublic.is_public, r.importPublic);
    L('Deck à mão em conta privada nasce privado', !r.manualPrivate.is_public, r.manualPrivate);
    L('publish_deck chamado uma vez só', r.publishCalls === 1, r.publishCalls);
    L('profile_cards cai na leitura antiga sem a 080', r.cards.length === 1 && r.cards[0].username === 'xis', r.cards);
    L('perfil privado para estranho: nome e @, sem foto', r.profileText.includes('Paula') && r.profileText.includes('@paula') && !r.hasImg, r.profileText);
    L('perfil privado para estranho: aviso de privado', /privad/i.test(r.profileText), r.profileText);
    L('sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();
