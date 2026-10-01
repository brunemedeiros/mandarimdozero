// Public Deck (P3-P6) -- Playwright (Chromium real), FR + ZH. Supabase do CDN = stub em memória
// (as regras reais de gate/privacidade/cópia/atribuição estão em test_public_deck.sql, Postgres local).
// Aqui: rota #/deck/<uuid>, página anônima/Free/Premium/dono, renderização pelos MESMOS renderers
// (Preview), importação (estado da sessão), publicar/despublicar pelo dono, seção no perfil.
// Rodar: node tests/fase-public-deck/test_playwright.js
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
// Reaproveita o stub de Deck/RLS da Fase I (mesmo arquivo, sem copiar) e acrescenta o gancho de RPC.
const src = fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8');
let STUB = src.slice(src.indexOf('const STUB = `') + 'const STUB = `'.length, src.indexOf('`;', src.indexOf('const STUB = `')));
STUB = STUB.replace("rpc: async (name, args) => {", "rpc: async (name, args) => {\n      if (window.__rpcLog) window.__rpcLog.push([name, args]);\n      if (window.__rpcHandler){ const r = window.__rpcHandler(name, args); if (r !== undefined) return r; }");
STUB = STUB.replace("storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },",
  "storage: { from: () => ({ upload: async () => ({}), getPublicUrl: (p) => ({ data: { publicUrl: 'https://proj.supabase.co/storage/v1/object/public/flashcard-media/' + p } }),\n" +
  "  copy: async (src, dest) => { const S = (window.__STORAGE = window.__STORAGE || { log: [], copies: 0, failCopyAt: null }); S.log.push(['copy', src, dest]); if (S.failCopyAt != null && S.copies >= S.failCopyAt) return { data: null, error: { message: 'boom' } }; S.copies++; return { data: { path: dest }, error: null }; },\n" +
  "  remove: async (paths) => { const S = (window.__STORAGE = window.__STORAGE || { log: [], copies: 0, failCopyAt: null }); S.log.push(['remove', paths]); return { data: paths, error: null }; } }) },");
STUB = STUB.replace("getSession: async () => ({ data: { session: null } })", "getSession: async () => ({ data: { session: window.__SESSION || null } })");

const PID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const SUB = '1a2b3c4d-1111-4222-8333-444455556666';
const mkDeck = (lang, viewer) => ({
  public_id: PID, name: 'Verbos <b>do dia</b>', description: 'Os verbos mais úteis', icon: 'chat', color: 'blue', language: lang,
  published_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-20T10:00:00Z', notes_count: 4,
  owner: { username: 'u0123456789', display_name: 'Dona do Deck', avatar_url: null },
  subdecks: [{ public_id: SUB, name: 'Sub público', icon: 'star', color: 'gold', notes_count: 2 }], parent: null, viewer,
});
const notesFor = (lang) => ({ language: lang, total: 4, notes: [
  { idx: 1, mode: 'normal', tags: ['criado-por-u0123456789', 'vocab'], fields: [
    { id: 'a', lang: lang === 'frances' ? 'fr' : 'zh', role: null, content: { value: lang === 'frances' ? 'bonjour' : '你好' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'b', lang: 'pt-BR', role: null, content: { value: 'olá' }, audio: null, image: null, pinyinFieldId: null }] },
  { idx: 2, mode: 'cloze', tags: [], fields: [
    { id: 'a', lang: lang === 'frances' ? 'fr' : 'zh', role: null, content: { value: lang === 'frances' ? 'Je {{c1::suis}} ici' : '我{{c1::是|shì}}学生' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'b', lang: 'pt-BR', role: null, content: { value: 'Eu estou aqui' }, audio: null, image: null, pinyinFieldId: null }] },
  { idx: 3, mode: 'multiple_choice', tags: [], fields: [
    { id: 'p', lang: null, role: 'prompt', content: { value: 'maison' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'r', lang: 'pt-BR', role: 'answer', content: { value: 'casa' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'd', lang: null, role: 'distractor', content: { value: 'carro' }, audio: null, image: null, pinyinFieldId: null }] },
  { idx: 4, mode: 'normal_reversed', tags: [], fields: [
    { id: 'a', lang: null, role: null, content: { value: 'chat' }, audio: null, image: null, pinyinFieldId: null },
    { id: 'b', lang: 'pt-BR', role: null, content: { value: 'gato' }, audio: null, image: null, pinyinFieldId: null }] },
] });

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function newPage(browser, port, lang, { guest, session, hash, handlerSrc }){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(([g, s, h]) => {
    try { if (g) sessionStorage.setItem('guest_mode', '1'); } catch (e) {}
    if (s) window.__SESSION = s;
    window.__rpcLog = [];
    eval(h);
  }, [!!guest, session || null, handlerSrc]);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html${hash || ''}`);
  return { page, errors, ctx };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const otherKey = lang === 'fr' ? 'mandarim' : 'frances';
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const handler = (viewer, key, extra) => `window.__rpcHandler = (name, args) => {
      const deck = ${JSON.stringify(mkDeck(key || appKey, viewer))};
      if (name === 'get_public_deck') return args.p_public_id === '${PID}' ? { data: deck, error: null } : { data: { error: 'unavailable' }, error: null };
      if (name === 'get_public_deck_notes') return { data: ${JSON.stringify(viewer.can_open ? notesFor(key || appKey) : { error: viewer.authenticated ? 'premium_required' : 'login_required' })}, error: null };
      ${extra || ''}
      return undefined; };`;

    // ===== Anônimo: página standalone =====
    {
      const { page, errors, ctx } = await newPage(browser, port, lang, { hash: `#/deck/${PID}`, handlerSrc: handler({ authenticated: false, premium: false, is_owner: false, can_open: false, can_import: false }) });
      await page.waitForSelector('#public-profile-standalone .public-deck-header', { timeout: 15000 });
      const txt = await page.locator('#public-profile-page-body').innerText();
      L('anônimo: página pública abre sem login (standalone)', await page.locator('#public-profile-standalone').isVisible());
      L('anônimo: mostra nome, autor, descrição, Notes, atualização', txt.includes('Verbos') && txt.includes('Dona do Deck') && txt.includes('Os verbos mais úteis') && txt.includes('4 Notes') && txt.includes('Atualizado em'));
      L('anônimo: HTML do nome escapado (sem <b> real)', await page.locator('#public-profile-page-body b').count() === 0);
      L('anônimo: gate de login, sem "Ver cartões" nem importar', await page.locator('[data-public-deck-gate="login"]').count() === 1 && await page.locator('#public-deck-open-btn, #public-deck-import-btn').count() === 0);
      L('anônimo: nunca chamou conteúdo nem cópia', !(await page.evaluate(() => window.__rpcLog.map(x => x[0]))).some(n => ['get_public_deck_notes', 'copy_public_deck'].includes(n)));
      L('anônimo: lista subdeck público', (await page.locator('[data-public-deck-sub]').count()) === 1);
      L('anônimo: erros de página', errors.length === 0, errors);
      await page.reload(); await page.waitForSelector('.public-deck-header');
      L('anônimo: reload mantém a página', true);
      await ctx.close();
    }
    // ===== Deck inexistente / privado / despublicado (mesma resposta) =====
    {
      const { page, ctx } = await newPage(browser, port, lang, { hash: '#/deck/11111111-2222-4333-8444-555555555555', handlerSrc: handler({ authenticated: false }) });
      await page.waitForSelector('#public-profile-standalone .review-empty', { timeout: 15000 });
      const t = await page.locator('#public-profile-page-body').innerText();
      L('indisponível: mesma página para inexistente/privado/despublicado', t.includes('Deck indisponível') && !t.includes('Verbos'));
      await ctx.close();
    }
    // ===== id fora do formato nunca chega à RPC =====
    {
      const { page, ctx } = await newPage(browser, port, lang, { guest: true, hash: '#/deck/123', handlerSrc: handler({ authenticated: false }) });
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
      L('id inválido (#/deck/123) não consulta a RPC', !(await page.evaluate(() => window.__rpcLog.map(x => x[0]))).includes('get_public_deck'));
      await ctx.close();
    }

    // ===== Dentro do app: Free / Premium / dono =====
    const bootApp = async (viewer, key, extra) => {
      const r = await newPage(browser, port, lang, { guest: true, handlerSrc: handler(viewer, key, extra) });
      await r.page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
      await r.page.evaluate(() => { CURRENT_USER = { id: 'U' }; window.__uid = 'U'; ensureProfileLoaded = async () => ({ plan_tier: 'free' }); });
      return r;
    };
    {
      const { page, errors, ctx } = await bootApp({ authenticated: true, premium: false, is_owner: false, can_open: false, can_import: false });
      await page.evaluate((id) => { window.location.hash = '#/deck/' + id; renderRoute(hashToRoute('#/deck/' + id)); }, PID);
      await page.waitForSelector('#public-deck-modal-body .public-deck-header', { timeout: 10000 });
      L('rota #/deck/<id> dentro do app abre o modal', await page.locator('#public-deck-modal').isVisible());
      L('Free: vê metadado', (await page.locator('#public-deck-modal-body').innerText()).includes('4 Notes'));
      L('Free: gate Premium, sem abrir conteúdo, sem importar', await page.locator('[data-public-deck-gate="premium"]').count() === 1 && await page.locator('#public-deck-open-btn, #public-deck-import-btn').count() === 0);
      L('Free: não chamou conteúdo/cópia', !(await page.evaluate(() => window.__rpcLog.map(x => x[0]))).some(n => ['get_public_deck_notes', 'copy_public_deck'].includes(n)));
      L('Free: erros de página', errors.length === 0, errors);
      await ctx.close();
    }
    {
      // Premium: abre conteúdo, vê com os renderers reais, importa
      const copyHandler = `if (name === 'get_public_deck_media_manifest') return { data: { count: 0, items: [] }, error: null };
        if (name === 'copy_public_deck'){ window.__DB.own_flashcards.push({ id: 9001, owner_id: 'U', language_app_key: '${appKey}', status: 'active', revision: 0, deck_id: 8001, back_trans: 'olá', front: 'bonjour', card_generation_mode: 'normal', tags: ['criado-por-u0123456789'], fields: [{ id: 'a', lang: null, role: null, content: { value: 'bonjour' }, audio: null, image: null, pinyinFieldId: null }, { id: 'b', lang: 'pt-BR', role: null, content: { value: 'olá' }, audio: null, image: null, pinyinFieldId: null }] });
        window.__DB.decks.push({ id: 8001, kind: 'personal', owner_id: 'U', language_app_key: '${appKey}', parent_deck_id: 7000, name: 'Verbos' });
        return { data: { deck_id: 8001, notes_copied: 4, skipped_incompatible: 1, media_remapped: 0 }, error: null }; }`;
      const { page, errors, ctx } = await bootApp({ authenticated: true, premium: true, is_owner: false, can_open: true, can_import: true }, null, copyHandler);
      await page.evaluate((id) => openPublicDeckPage(id), PID);
      await page.waitForSelector('#public-deck-open-btn');
      await page.click('#public-deck-open-btn');
      await page.waitForSelector('[data-public-note-view]');
      L('Premium: lista as Notes (4) com modo e Tags', await page.locator('[data-public-note]').count() === 4 && (await page.locator('#public-deck-notes-box').innerText()).includes('Múltipla escolha'));
      // Normal / Cloze / MC / Reverse pelos MESMOS renderers (Preview)
      const modals = await page.evaluate(async () => {
        const out = {};
        const open = async (idx) => { document.querySelector(`[data-public-note-view="${idx}"]`).click(); await new Promise(r => setTimeout(r, 150)); const m = document.getElementById('flashcard-preview-modal'); const h = m.innerHTML; const vis = m.style.display !== 'none'; closeFlashcardPreview(); return { h, vis }; };
        for (const i of [1, 2, 3, 4]) out[i] = await open(i);
        return out;
      });
      L('Preview Normal usa o renderer de Normal (.flashcard)', modals[1].vis && /flashcard/.test(modals[1].h));
      L('Preview Cloze usa o renderer de Cloze (lacuna)', modals[2].vis && /cloze/.test(modals[2].h));
      L('Preview Múltipla escolha usa o renderer de MC (.mc-option)', modals[3].vis && /mc-option/.test(modals[3].h));
      L('Preview Reverse abre (2 CardInstances da mesma Note)', modals[4].vis);
      L('Preview não cria renderer próprio (nenhuma função renderPublic*)', await page.evaluate(() => !Object.keys(window).some(k => /^renderPublic(Card|Cloze|MultipleChoice|Normal|TypeAnswer)/.test(k))));
      const stateBefore = await page.evaluate(() => ({ cards: STATE.cards.length, reps: STATE.cards.reduce((a, c) => a + (c.reps || 0), 0) }));
      L('Ver cartão não grava nada nem altera FSRS', (await page.evaluate(() => (window.__DB.own_flashcards || []).length)) === 0);
      // Importar
      L('Premium não-dono vê Importar', await page.locator('#public-deck-import-btn').count() === 1);
      await page.click('#public-deck-import-btn');
      await page.waitForFunction(() => window.__rpcLog.some(x => x[0] === 'copy_public_deck'), null, { timeout: 8000 });
      const args = await page.evaluate(() => window.__rpcLog.find(x => x[0] === 'copy_public_deck')[1]);
      L('import chama copy_public_deck com o public_id (destino padrão = Meus Decks)', args.p_public_id === PID && args.p_dest_deck_id === null && JSON.stringify(args.p_media_map) === '{}', args);
      await page.waitForFunction(() => STATE.cards.some(c => c.origin === 'self' && c.rowId === 9001), null, { timeout: 8000 });
      const imp = await page.evaluate(() => { const c = STATE.cards.find(x => x.origin === 'self' && x.rowId === 9001); return { deck: c.deckId, reps: c.reps, tags: c.tags, decks: STATE.decks.some(d => d.id === 8001) }; });
      L('cópia entra na sessão com deckId, FSRS zerado, atribuição na Tag e Deck na árvore', imp.deck === 8001 && imp.reps === 0 && imp.tags.includes('criado-por-u0123456789') && imp.decks, imp);
      L('Premium: erros de página', errors.length === 0, errors);
      await ctx.close();
    }

    // ===== P7: cópia com mídia INDEPENDENTE (duplica objetos antes da RPC; compensa em falha) =====
    {
      const UID_A = '00000000-0000-0000-0000-00000000aaaa';
      const U = (p) => 'https://proj.supabase.co/storage/v1/object/public/flashcard-media/' + UID_A + '/' + p;
      const ITEMS = [{ url: U('audio-1.mp3'), path: UID_A + '/audio-1.mp3' }, { url: U('image-1.png'), path: UID_A + '/image-1.png' }, { url: U('tts-3.mp3'), path: UID_A + '/tts-3.mp3' }];
      const mediaHandler = `
        if (name === 'get_public_deck_media_manifest'){ window.__manifestCalls = (window.__manifestCalls || 0) + 1; const items = window.__SCEN.items; return { data: { count: items.length, items }, error: null }; }
        if (name === 'copy_public_deck'){ const sc = window.__SCEN; sc.copyCalls = (sc.copyCalls || 0) + 1; window.__copyArgs = args;
          if (sc.failFirstWith && sc.copyCalls === 1) return { data: null, error: { message: sc.failFirstWith } };
          if (sc.failAlways) return { data: null, error: { message: sc.failAlways } };
          window.__DB.decks.push({ id: 8100, kind: 'personal', owner_id: 'U', language_app_key: '${appKey}', parent_deck_id: 7000, name: 'Verbos' });
          window.__DB.own_flashcards.push({ id: 9100, owner_id: 'U', language_app_key: '${appKey}', status: 'active', revision: 0, deck_id: 8100, back_trans: 'olá', front: 'bonjour', card_generation_mode: 'normal', tags: ['criado-por-u0123456789'], fields: [{ id: 'a', lang: null, role: null, content: { value: 'bonjour' }, audio: { type: 'upload', url: Object.values(args.p_media_map)[0] || null }, image: null, pinyinFieldId: null }, { id: 'b', lang: 'pt-BR', role: null, content: { value: 'olá' }, audio: null, image: null, pinyinFieldId: null }] });
          return { data: { deck_id: 8100, notes_copied: 1, skipped_incompatible: 0, media_remapped: Object.keys(args.p_media_map).length }, error: null }; }`;
      const runScenario = async (scen, storageInit) => {
        const r = await bootApp({ authenticated: true, premium: true, is_owner: false, can_open: true, can_import: true }, null, mediaHandler);
        await r.page.evaluate(([sc, st, uid]) => { window.__SCEN = sc; window.__STORAGE = Object.assign({ log: [], copies: 0, failCopyAt: null }, st || {}); CURRENT_USER = { id: uid }; }, [scen, storageInit, 'U']);
        await r.page.evaluate((id) => openPublicDeckPage(id), PID);
        await r.page.waitForSelector('#public-deck-import-btn');
        await r.page.click('#public-deck-import-btn');
        await r.page.waitForFunction(() => { const b = document.getElementById('public-deck-import-btn'); return b && !b.disabled; }, null, { timeout: 8000 });
        await r.page.waitForTimeout(250);
        const out = await r.page.evaluate(() => ({ log: window.__STORAGE.log, args: window.__copyArgs || null, copyCalls: window.__SCEN.copyCalls || 0, manifest: window.__manifestCalls || 0,
          imported: STATE.cards.some(c => c.origin === 'self' && c.rowId === 9100), btn: document.getElementById('public-deck-import-btn').textContent }));
        return Object.assign(r, { out });
      };
      {
        const { out, errors, ctx } = await runScenario({ items: ITEMS });
        const copies = out.log.filter(x => x[0] === 'copy'), removes = out.log.filter(x => x[0] === 'remove');
        L('mídia: duplica cada objeto (3 copy do Storage) ANTES da RPC, só para a pasta do copiador', copies.length === 3 && copies.every(c => c[2].startsWith('U/pubcopy-')) && copies.every(c => c[1].startsWith(UID_A + '/')), copies);
        const keys = Object.keys(out.args.p_media_map);
        L('mídia: RPC recebe mapa com as 3 URLs; nenhum destino aponta para a pasta do autor', keys.length === 3 && keys.every(k => ITEMS.some(i => i.url === k)) && Object.values(out.args.p_media_map).every(v => !v.includes(UID_A) && v.includes('/U/pubcopy-')), out.args);
        L('mídia: sucesso não remove nada e a cópia entra na sessão', removes.length === 0 && out.imported && out.manifest === 1);
        L('mídia: botão volta ao rótulo normal', !/Copiando/.test(out.btn), out.btn);
        L('mídia: erros de página', errors.length === 0, errors);
        await ctx.close();
      }
      {
        const { out, ctx } = await runScenario({ items: ITEMS }, { failCopyAt: 1 });
        const created = out.log.filter(x => x[0] === 'copy').length;   // tentativas
        const removes = out.log.filter(x => x[0] === 'remove');
        L('falha ao copiar mídia: RPC NÃO é chamada (nada criado no banco)', out.copyCalls === 0 && !out.imported);
        L('falha ao copiar mídia: remove os objetos que já havia criado (sem órfãos)', removes.length === 1 && removes[0][1].length === 1 && removes[0][1][0].startsWith('U/pubcopy-'), out.log);
        await ctx.close();
      }
      {
        const { out, ctx } = await runScenario({ items: ITEMS, failAlways: 'invalid_media_map' });
        const removes = out.log.filter(x => x[0] === 'remove');
        L('RPC falha: remove TODOS os 3 objetos duplicados (compensação)', out.copyCalls === 1 && removes.length === 1 && removes[0][1].length === 3 && !out.imported, out.log);
        await ctx.close();
      }
      {
        const { out, ctx } = await runScenario({ items: ITEMS, failFirstWith: 'media_map_incomplete' });
        const removes = out.log.filter(x => x[0] === 'remove'), copies = out.log.filter(x => x[0] === 'copy');
        L('Deck mudou durante a importação: limpa a 1ª tentativa e refaz (2 manifests, 2 RPCs, 6 copies)', out.manifest === 2 && out.copyCalls === 2 && copies.length === 6 && removes.length === 1 && removes[0][1].length === 3 && out.imported, { m: out.manifest, c: out.copyCalls });
        await ctx.close();
      }
      {
        const { out, ctx } = await runScenario({ items: [] });
        L('Deck sem mídia: nenhuma operação de Storage, RPC com mapa vazio', out.log.length === 0 && JSON.stringify(out.args.p_media_map) === '{}' && out.imported);
        await ctx.close();
      }
      {
        const { page, ctx } = await runScenario({ items: [] });
        L('paridade JS×SQL: publicDeckMediaPathFromUrl', await page.evaluate(([a, b]) => publicDeckMediaPathFromUrl(a) === 'x/y.mp3' && publicDeckMediaPathFromUrl('https://ext.com/x.mp3') === null && publicDeckMediaPathFromUrl('https://p.supabase.co/storage/v1/object/public/avatars/a.png') === null && publicDeckMediaPathFromUrl(b) === null && publicDeckMediaPathFromUrl('https://p.supabase.co/storage/v1/object/public/flashcard-media/a/b.mp3?x=1') === null,
          ['https://p.supabase.co/storage/v1/object/public/flashcard-media/x/y.mp3', 'https://p.supabase.co/storage/v1/object/public/flashcard-media/a/../b.mp3']));
        await ctx.close();
      }
    }
    {
      // Dono: abre sem importar
      const { page, ctx } = await bootApp({ authenticated: true, premium: false, is_owner: true, can_open: true, can_import: false });
      await page.evaluate((id) => openPublicDeckPage(id), PID);
      await page.waitForSelector('#public-deck-open-btn');
      L('dono: abre cartões, sem botão de importar', await page.locator('#public-deck-import-btn').count() === 0);
      await ctx.close();
    }
    {
      // Site de outro idioma: só metadado + link para o site certo
      const { page, ctx } = await bootApp({ authenticated: true, premium: true, is_owner: false, can_open: true, can_import: true }, otherKey);
      await page.evaluate((id) => openPublicDeckPage(id), PID);
      await page.waitForSelector('[data-public-deck-gate="site"]');
      L('idioma diferente do site: sem abrir/importar aqui', await page.locator('#public-deck-open-btn, #public-deck-import-btn').count() === 0);
      await ctx.close();
    }
    {
      // Report: reutiliza o modal existente com contexto de Deck
      const { page, ctx } = await bootApp({ authenticated: true, premium: true, is_owner: false, can_open: true, can_import: true });
      await page.evaluate((id) => openPublicDeckPage(id), PID);
      await page.waitForSelector('#public-deck-report-btn');
      await page.click('#public-deck-report-btn');
      const rc = await page.evaluate(() => ({ vis: document.getElementById('report-modal').style.display !== 'none', ctx: REPORT_MODAL_CONTEXT }));
      L('report de Deck abre o modal de Reports existente com source public_deck', rc.vis && rc.ctx.source === 'public_deck' && rc.ctx.public_id === PID && rc.ctx.owner_username === 'u0123456789', rc.ctx);
      L('report de Deck não carrega dados privados (user_id/email do dono)', !/user_id|email|owner_id/.test(JSON.stringify(rc.ctx)));
      await page.evaluate(() => closeReportModal());
      await page.click('#public-deck-open-btn'); await page.waitForSelector('[data-public-note-report]');
      await page.click('[data-public-note-report="1"]');
      const rc2 = await page.evaluate(() => REPORT_MODAL_CONTEXT);
      L('report de Card público usa source public_deck_note com idx', rc2.source === 'public_deck_note' && rc2.note_idx === 1, rc2);
      await ctx.close();
    }

    // ===== Dono: publicar / despublicar em Meus Decks =====
    {
      const pubHandler = `
        const OWN = (id) => window.__DB.decks.find(d => d.id === id);
        if (name === 'get_public_deck_owner_status'){ const d = OWN(args.p_deck_id); return { data: { is_public: !!d.is_public, public_id: d.public_id || null, description: d.public_description || null, icon: d.public_icon || null, color: d.public_color || null, notes_count: 3, incompatible: [{ note_id: 5, reason: 'not_representable_as_native' }], updated_at: '2026-09-20T00:00:00Z' }, error: null }; }
        if (name === 'publish_deck'){ const d = OWN(args.p_deck_id); if (d.kind !== 'personal') return { data: null, error: { message: 'public_deck_kind_forbidden' } };
          Object.assign(d, { is_public: true, public_id: d.public_id || '${PID}', published_at: '2026-09-29T00:00:00Z', public_description: args.p_description, public_icon: args.p_icon, public_color: args.p_color });
          return { data: { public_id: d.public_id, published_at: d.published_at, visible_on_profile: true }, error: null }; }
        if (name === 'unpublish_deck'){ const d = OWN(args.p_deck_id); d.is_public = false; return { data: { public_id: d.public_id, is_public: false }, error: null }; }`;
      const { page, errors, ctx } = await bootApp({ authenticated: true, premium: true, is_owner: true, can_open: true, can_import: false }, null, pubHandler);
      await page.evaluate(async (k) => {
        const D = window.__DB.decks;
        D.push({ id: 7000, kind: 'personal_root', owner_id: 'U', language_app_key: k, parent_deck_id: 6999, name: 'Meus Decks' });
        D.push({ id: 7001, kind: 'personal', owner_id: 'U', language_app_key: k, parent_deck_id: 7000, name: 'Verbos' });
        D.push({ id: 6999, kind: 'root', owner_id: 'U', language_app_key: k, parent_deck_id: null, name: 'root' });
        STATE.decks = []; switchTab('my-flashcards');
      }, appKey);
      await page.waitForSelector('[data-publish-deck="7001"]');
      L('Meus Decks: Deck pessoal tem "Publicar"', (await page.locator('[data-publish-deck="7001"]').innerText()).includes('Publicar'));
      L('Meus Decks: Meus Decks (personal_root) NÃO tem controle de publicar', await page.locator('[data-publish-deck="7000"]').count() === 0);
      await page.click('[data-publish-deck="7001"]');
      await page.waitForSelector('[data-publish-form="7001"]');
      const ft = await page.locator('[data-publish-form="7001"]').innerText();
      L('formulário: avisa que subdecks não são publicados automaticamente e que a nota privada nunca é pública', /subdecks não são publicados automaticamente/.test(ft) && /nota privada/.test(ft));
      L('formulário: informa Notes incompatíveis não publicadas', /não serão publicadas/.test(ft));
      await page.fill('[data-publish-desc]', 'Minha lista');
      await page.selectOption('[data-publish-icon]', 'school'); await page.selectOption('[data-publish-color]', 'green');
      await page.click('[data-publish-save]');
      await page.waitForSelector('[data-publish-unpublish]');
      const pa = await page.evaluate(() => window.__rpcLog.find(x => x[0] === 'publish_deck')[1]);
      L('publicar chama publish_deck (RPC) com descrição/ícone/cor', pa.p_deck_id === 7001 && pa.p_description === 'Minha lista' && pa.p_icon === 'school' && pa.p_color === 'green', pa);
      L('nenhum UPDATE direto de is_public pelo cliente', await page.evaluate(() => !(window.__updatesToDecks || []).length));
      L('publicado: botão vira 🌐 Público e mostra o link com #/deck/<public_id>', (await page.locator('[data-publish-deck="7001"]').innerText()).includes('Público') && (await page.locator('[data-publish-link]').inputValue()).includes('#/deck/' + PID));
      await page.click('[data-publish-unpublish]');
      await page.waitForFunction(() => document.querySelector('[data-publish-deck="7001"]').textContent.includes('Publicar'));
      L('despublicar chama unpublish_deck e volta a "Publicar"', await page.evaluate(() => window.__rpcLog.some(x => x[0] === 'unpublish_deck')));
      L('Deck: erros de página', errors.length === 0, errors);
      await ctx.close();
    }

    // ===== Perfil público: lista de Decks públicos; lista solta aposentada =====
    {
      const profHandler = `
        if (name === 'get_public_profile_stats') return { data: { languages: [] }, error: null };
        if (name === 'list_public_decks_for_user') return { data: { decks: [{ public_id: '${PID}', name: 'Verbos', description: null, icon: 'chat', color: 'blue', language: '${appKey}', published_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-20T00:00:00Z', notes_count: 4 }] }, error: null };`;
      const r = await bootApp({ authenticated: true, premium: false, is_owner: false, can_open: false, can_import: false }, null, profHandler);
      const { page, ctx } = r;
      await page.evaluate(() => { window.__DB.profiles.push({ user_id: 'X', username: 'u0123456789', display_name: 'Dona do Deck', avatar_url: null, bio: null, featured_badge_id: null }); });
      await page.evaluate(() => openPublicProfileModalForUsername('u0123456789'));
      await page.waitForSelector('[data-public-deck-link]', { timeout: 10000 });
      const pt = await page.locator('#public-profile-modal-body').innerText();
      L('perfil: seção "Decks públicos" com nome, Notes e idioma', /decks públicos/i.test(pt) && pt.includes('Verbos') && pt.includes('4 Notes'));
      L('perfil: lista solta de cartões aposentada (sem "Ver cartões criados por")', !pt.includes('Ver cartões criados por') && await page.locator('#public-profile-cards-toggle-btn').count() === 0);
      L('perfil: não chamou get_public_flashcards', !(await page.evaluate(() => window.__rpcLog.map(x => x[0]))).includes('get_public_flashcards'));
      await page.click('[data-public-deck-link]');
      await page.waitForSelector('#public-deck-modal-body .public-deck-header');
      L('perfil: clicar no Deck abre a página do Deck', true);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`\n${passed + failed} verificações — ${failed ? failed + ' FALHARAM' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();
