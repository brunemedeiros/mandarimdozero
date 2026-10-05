// Plano efetivo (Admin Mode ON = Premium) + cartão legado abre direto no editor novo (qualquer plano).
// Reaproveita o stub em memória do Supabase de tests/fase-i. Rodar: node tests/plano-admin/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const STUB = /const STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png' };
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
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);

    // ---- plano efetivo ----
    const tiers = await ev(() => {
      CURRENT_USER = { id: 'U', email: 'x@y' };
      const out = {};
      isAdminUser = () => false;
      PROFILE_CACHE = { plan_tier: 'free', admin_mode: true }; out.userFree = isPremium();
      PROFILE_CACHE = { plan_tier: 'premium', admin_mode: true }; out.userPremium = isPremium();
      isAdminUser = () => true;
      PROFILE_CACHE = { plan_tier: 'free', admin_mode: true }; out.adminOn = isPremium();
      PROFILE_CACHE = { plan_tier: 'premium', admin_mode: false }; out.adminOff = isPremium();
      PROFILE_CACHE = null; out.adminLoading = effectivePlanTier(null);
      return out;
    });
    L('plano efetivo: aluno free/premium, admin ON=premium, OFF=free', tiers.userFree === false && tiers.userPremium === true && tiers.adminOn === true && tiers.adminOff === false && tiers.adminLoading === 'premium', tiers);

    // ---- conta grátis: cartão legado abre no editor novo ----
    await ev((a) => {
      isAdminUser = () => false; PROFILE_CACHE = { plan_tier: 'free', admin_mode: true }; window.__uid = 'U';
      window.__DB.own_flashcards = [
        { id: 901, owner_id: 'U', language_app_key: a, status: 'active', revision: 0, tags: [], front: 'la femme de ménage', back_trans: 'a empregada doméstica', front_is_target_language: true, note: null, fields: null, card_generation_mode: null, created_at: '2026-09-24T00:00:00Z' },
        { id: 902, owner_id: 'U', language_app_key: a, status: 'active', revision: 0, tags: [], front: null, back_trans: 'Eu sou', cloze_sentence: 'Je suis sem lacuna', cloze_answer: 'suis', fields: null, card_generation_mode: null, created_at: '2026-09-24T00:00:00Z' },
      ];
      switchTab('my-flashcards');
    }, appKey);
    await page.waitForSelector('[data-edit-own-flashcard="901"]');
    const before = await ev(() => JSON.stringify(window.__DB.own_flashcards));
    await page.click('[data-edit-own-flashcard="901"]');
    await page.waitForSelector('#edit-my-native-flashcard-card-type');
    L('grátis: cartão legado abre direto no editor novo', true);
    const opts = await ev(() => [...document.querySelectorAll('#edit-my-native-flashcard-card-type option')].map(o => o.value));
    L('grátis: Card Type só Normal', JSON.stringify(opts) === '["normal"]', opts);
    const fieldVals = await ev(() => [...document.querySelectorAll('#edit-my-native-flashcard-fields [data-field-content]')].map(e => e.value));
    L('conteúdo do cartão antigo preservado nos campos', fieldVals.includes('la femme de ménage') && fieldVals.includes('a empregada doméstica'), fieldVals);
    L('bloco de áudio presente em cada campo', (await ev(() => document.querySelectorAll('#edit-my-native-flashcard-fields [data-field-audio-add]').length)) >= 2);
    await page.click('#edit-my-native-flashcard-fields [data-field-audio-add] >> nth=0');
    const picks = await ev(() => [...document.querySelectorAll('#edit-my-native-flashcard-fields [data-field-audio-pick]')].filter(b => b.offsetParent).map(b => b.dataset.fieldAudioPick));
    L('grátis: métodos de áudio = arquivo e link', JSON.stringify(picks.sort()) === '["upload","url"]', picks);
    L('abrir o editor não grava nada', (await ev(() => JSON.stringify(window.__DB.own_flashcards))) === before);
    await page.click('#edit-my-native-flashcard-cancel');
    L('cancelar não grava nada', (await ev(() => JSON.stringify(window.__DB.own_flashcards))) === before);

    // salvar converte, mesmo id
    await page.click('[data-edit-own-flashcard="901"]');
    await page.waitForSelector('#edit-my-native-flashcard-save');
    await page.click('#edit-my-native-flashcard-save');
    if (await page.$('#flashcard-reset-confirm-yes:visible')) await page.click('#flashcard-reset-confirm-yes');
    await page.waitForFunction(() => window.__DB.own_flashcards.find(r => r.id === 901).fields, null, { timeout: 8000 }).catch(() => {});
    const row = await ev(() => window.__DB.own_flashcards.find(r => r.id === 901));
    L('salvar: vira formato novo, mesmo id', !!row.fields && row.card_generation_mode === 'normal' && row.id === 901, { fields: !!row.fields, mode: row.card_generation_mode });

    // cartão sem conversão segura: formulário antigo com motivo
    await page.click('[data-edit-own-flashcard="902"]');
    await page.waitForSelector('#edit-my-flashcard-save');
    L('cartão não convertível: formulário antigo com o motivo', (await ev(() => [...document.querySelectorAll('.profile-edit-error')].map(e => e.textContent).join(' '))).includes('não pôde abrir no editor novo'));
    await page.click('#edit-my-flashcard-cancel');

    // ---- admin com Admin Mode ON: Premium ----
    await ev(() => { isAdminUser = () => true; PROFILE_CACHE = { plan_tier: 'free', admin_mode: true }; switchTab('my-flashcards'); });
    await page.waitForSelector('#my-flashcard-card-type-preview, [id$="card-type-preview"]');
    const adminOpts = await ev(() => [...document.querySelectorAll('[id$="card-type-preview"] option')].map(o => o.value));
    L('admin ON: todos os Card Types no criar', adminOpts.length === 5, adminOpts);
    await ev(() => { PROFILE_CACHE = { plan_tier: 'free', admin_mode: false }; switchTab('my-flashcards'); });
    await page.waitForFunction(() => !document.querySelector('.pill') || ![...document.querySelectorAll('.pill')].some(p => p.textContent.includes('⭐ Premium')), null, { timeout: 5000 }).catch(() => {});
    const offOpts = await ev(() => [...document.querySelectorAll('[id$="card-type-preview"] option')].map(o => o.value));
    L('admin OFF: só Normal (visão de aluna grátis)', JSON.stringify(offOpts) === '["normal"]', offOpts);

    const real = errors.filter(e => !/supabaseClient|createClient|Failed to fetch/i.test(e));
    L('sem erro de página', real.length === 0, real);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
