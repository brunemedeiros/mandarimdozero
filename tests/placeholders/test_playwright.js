// Placeholders de perfil no navegador (FR+ZH, convidado). Rodar: node tests/placeholders/test_playwright.js
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
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const unitId = lang === 'fr' ? 'A1-1' : 1;
    const unit2 = lang === 'fr' ? 'A1-2' : 2;
    const getTxt = (id, i) => ev(([id, i]) => { const u = UNITS.find(x => x.id === id); const ph = u.phrases[i]; return { f: ph.f || ph.c, t: ph.t, blocks: (ph.blocks || []).map(b => b.f || b.c) }; }, [id, i]);

    // convidado: nenhum placeholder cru no conteúdo
    const raw = await ev(() => JSON.stringify(UNITS).match(/\{(nome|primeiro_nome|nacionalidade\w*)\}/g));
    L('convidado: nenhum placeholder cru em UNITS', raw === null, raw);
    const p0 = await getTxt(unitId, 0);
    L('convidado: nome = Convidado', /Convidado/.test(p0.f) && /Convidado/.test(p0.t) && p0.blocks.some(b => /Convidado/.test(b)), p0);
    const p1 = await getTxt(unit2, 1);
    L('convidado: nacionalidade padrão Brasil', lang === 'fr' ? (p1.f === 'Je suis brésilienne.' && /brasileira/.test(p1.t)) : (p1.f === '我是巴西人。' && /brasileira/.test(p1.t)), p1);

    // perfil carregado depois: reescreve
    await ev(() => { CURRENT_USER = { id: 'U', email: 'a@b' }; PROFILE_CACHE = { display_name: 'José "Zé" <b>Ângelo', country: 'US', bio: null }; refreshProfilePlaceholders(); });
    const q0 = await getTxt(unitId, 0), q1 = await getTxt(unit2, 1);
    L('perfil: nome com aspas/acento, sem tag', /José "Zé" bÂngelo/.test(q0.f) && !/[<>]/.test(q0.f + q0.t), q0);
    L('perfil: nacionalidade US', lang === 'fr' ? (q1.f === 'Je suis américaine.' && /americana/.test(q1.t)) : (q1.f === '我是美国人。' && /americana/.test(q1.t)), q1);

    // exercício/áudio: botão de áudio com o texto preenchido não quebra (cai no Web Speech)
    const audio = await ev((lang) => {
      const text = lang === 'fr' ? "Bonjour ! Je m'appelle Maria." : '你好！我叫Maria。';
      const inManifest = typeof AUDIO_MANIFEST !== 'undefined' && !!AUDIO_MANIFEST[text];
      let threw = false;
      try { (lang === 'fr' ? speakFrench : speakChinese)(text, null, false); } catch (e) { threw = String(e); }
      const html = audioBtnHTML(text);
      return { inManifest, threw, hasBtn: /audio-btn/.test(html), canSpeak: typeof (lang === 'fr' ? canSpeakFrench : canSpeakChinese) === 'function' };
    }, lang);
    L('áudio: texto fora do manifest não quebra', audio.inManifest === false && audio.threw === false && audio.hasBtn, audio);

    // renderização real da lição: o nome aparece na tela
    await ev((id) => { if (typeof openUnit === 'function') openUnit(id); }, unitId);
    await page.waitForTimeout(300);
    const body = await ev(() => document.body.innerText);
    L('tela da unidade não mostra placeholder cru', !/\{(nome|nacionalidade)/.test(body));

    // perfil: select de país
    await ev(() => { PROFILE_CACHE = { display_name: 'Ana', country: 'US', bio: null, username: 'u1' }; openEditProfileModal([]); });
    const sel = await ev(() => { const s = document.getElementById('profile-edit-country'); return { visible: s.offsetParent !== null, value: s.value, n: s.options.length, hasBR: [...s.options].some(o => o.value === 'BR') }; });
    L('modal: país visível, valor atual e opções', sel.visible && sel.value === 'US' && sel.n >= 3 && sel.hasBR, sel);
    // sem a coluna (migration 072 pendente): campo some e payload não leva country
    await ev(() => { PROFILE_CACHE = { display_name: 'Ana', bio: null, username: 'u1' }; openEditProfileModal([]); });
    const hidden = await ev(() => document.getElementById('profile-edit-country').offsetParent === null);
    L('modal: sem a coluna o campo some', hidden);
    // payload do UPDATE
    const payloads = await ev(async () => {
      const out = [];
      const orig = supabaseClient.from;
      supabaseClient.from = (t) => ({ update: (p) => { out.push(p); return { eq: () => ({ select: () => ({ single: async () => ({ data: Object.assign({}, PROFILE_CACHE, p), error: null }) }) }) }; } });
      CURRENT_USER = { id: 'U' };
      PROFILE_CACHE = { display_name: 'Ana', country: null, bio: null };
      await saveProfileEdits({ displayName: 'Ana B', bio: '', publicProfile: false, country: 'US' });
      const afterCache = PROFILE_CACHE.country;
      PROFILE_CACHE = { display_name: 'Ana', bio: null }; // sem coluna
      await saveProfileEdits({ displayName: 'Ana B', bio: '', publicProfile: false, country: 'US' });
      PROFILE_CACHE = { display_name: 'Ana', country: 'US', bio: null };
      await saveProfileEdits({ displayName: 'Ana B', bio: '', publicProfile: false, country: '' });
      PROFILE_CACHE = { display_name: 'Ana', country: 'US', bio: null };
      await saveProfileEdits({ displayName: 'Ana B', bio: '', publicProfile: false, country: '<x>' });
      PROFILE_CACHE = { display_name: 'Ana', country: 'BR', bio: null };
      await saveProfileEdits({ displayName: 'Ana B', bio: '', publicProfile: false, country: 'US' });
      supabaseClient.from = orig;
      return { out, afterCache };
    });
    L('salvar: country entra quando a coluna existe', payloads.out[0].country === 'US' && payloads.afterCache === 'US', payloads.out[0]);
    L('salvar: sem a coluna, payload não leva country', !('country' in payloads.out[1]), payloads.out[1]);
    L('salvar: vazio vira null; lixo vira null', payloads.out[2].country === null && payloads.out[3].country === null, [payloads.out[2], payloads.out[3]]);
    // salvar reaplica os placeholders
    const after = await getTxt(unit2, 1);
    L('salvar reaplica o conteúdo', lang === 'fr' ? after.f === 'Je suis américaine.' : after.f === '我是美国人。', after);
    L('sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();
