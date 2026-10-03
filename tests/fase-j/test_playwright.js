// Fase J (Painel de Tags) -- Playwright (Chromium real), FR + ZH.
// Stub em memória do Supabase (CDN bloqueado no sandbox), reaproveitado da
// Fase I e estendido com as 3 RPCs de tags. As regras REAIS (fusão, ordem,
// RLS, atomicidade) estão em test_supabase_real.sql; aqui: UI ponta a ponta.
// Rodar: node tests/fase-j/test_playwright.js
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

// STUB base da Fase I (mesmo contrato de from()/auth/storage) + RPCs de tags.
const base = fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8');
let STUB = base.slice(base.indexOf('const STUB = `') + 'const STUB = `'.length);
STUB = STUB.slice(0, STUB.indexOf('\n})();`;') + '\n})();'.length);
const TAG_RPC = `
      if (name === 'list_note_tags' || name === 'rename_note_tag' || name === 'delete_note_tag'){
        window.__tagRpcCalls = (window.__tagRpcCalls || []); window.__tagRpcCalls.push({ name, args });
        if (window.__failTagList && name === 'list_note_tags') return { data: null, error: { message: 'falha simulada' } };
        if (window.__failTagRename && name === 'rename_note_tag') return { data: null, error: { message: 'falha simulada' } };
        if (window.__tagRpcDelay) await new Promise(r => setTimeout(r, window.__tagRpcDelay));
        const scope = args.p_scope;
        const rows = scope === 'own' ? window.__DB.own_flashcards.filter(r => r.owner_id === uid)
          : window.__DB.teacher_flashcards.filter(r => r.teacher_id === uid && window.__isAdmin);
        if (name === 'list_note_tags'){
          const m = {}; rows.forEach(r => new Set(r.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; }));
          return { data: Object.keys(m).sort().map(t => ({ tag: t, notes: m[t] })), error: null };
        }
        if (name === 'rename_note_tag'){
          if (args.p_old === args.p_new) return { data: { affected: 0, merged: 0, unchanged: true }, error: null };
          let affected = 0, merged = 0;
          rows.forEach(r => { const t = r.tags || []; if (!t.includes(args.p_old)) return; if (t.includes(args.p_new)) merged++;
            const out = []; t.forEach(x => { const y = x === args.p_old ? args.p_new : x; if (!out.includes(y)) out.push(y); }); r.tags = out; affected++; });
          return { data: { affected, merged, unchanged: false }, error: null };
        }
        let affected = 0;
        rows.forEach(r => { if ((r.tags || []).includes(args.p_tag)){ r.tags = r.tags.filter(x => x !== args.p_tag); affected++; } });
        return { data: { affected }, error: null };
      }
      if (name === 'ensure_user_decks'){`;
STUB = STUB.replace("      if (name === 'ensure_user_decks'){", TAG_RPC);

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port){
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
  return { page, errors };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const rowsOf = () => ev(() => [...document.querySelectorAll('#my-tag-manager [data-tag-row]')].map(r => r.dataset.tagRow + ':' + r.querySelector('.profile-edit-hint').textContent.trim()));
    const mgrText = () => ev(() => document.getElementById('my-tag-manager').textContent);

    // ===== seed: aluna U com 3 cartões próprios + 1 Teacher Card com a MESMA string =====
    await ev((a) => {
      const mk = (id, tags, extra) => Object.assign({ id, owner_id: 'U', language_app_key: a, status: 'active', revision: 5, front: 'f' + id, back_trans: 'b' + id, front_is_target_language: true, tags, deck_id: null }, extra);
      window.__DB.own_flashcards.push(mk(901, ['a1', 'saudacao']), mk(902, ['saudacao', 'verbos']), mk(903, ['cumprimentos']));
      window.__DB.teacher_flashcards.push({ id: 950, teacher_id: 'T', student_id: 'U', language_app_key: a, status: 'active', revision: 2, front: 'tf', back_trans: 'tb', tags: ['saudacao', 'prof'], deck_id: null });
      CURRENT_USER = { id: 'U' }; window.__uid = 'U'; window.__isAdmin = false;
      ensureProfileLoaded = async () => ({ plan_tier: 'free' });
      const sc = buildCardFromSelfFlashcard(mk(901, ['a1', 'saudacao'])); STATE.cards = STATE.cards.filter(c => c.origin === 'study').concat(sc);
      STATE.studySettings.reviewTagFilter = ['saudacao'];
      switchTab('my-flashcards');
    }, appKey);
    await page.waitForSelector('#my-tag-manager [data-tag-row]');

    // ===== aluna: lista =====
    let rows = await rowsOf();
    L('lista: só Tags de own_flashcards, com contagem de Notes', JSON.stringify(rows) === '["a1:1 nota","cumprimentos:1 nota","saudacao:2 notas","verbos:1 nota"]', rows);
    L('lista: Tag exclusiva de Teacher Card (prof) NÃO aparece', !rows.some(r => r.startsWith('prof')));
    L('lista: contagem de saudacao não inclui o Teacher Card (2, não 3)', rows.includes('saudacao:2 notas'));
    L('hint explica o escopo (Teacher Cards não editáveis)', (await mgrText()).includes('professora'));

    // ===== aluna: cancelar rename não altera =====
    await page.click('[data-tag-rename="saudacao"]');
    await page.fill('[data-tag-rename-input]', 'Cumprimentos');
    L('rename: mostra resultado normalizado e aviso de colisão', (await mgrText()).includes('#cumprimentos') && (await ev(() => !!document.querySelector('[data-tag-collision]'))));
    L('rename: aviso informa 1 nota já usa e unificação', (await ev(() => document.querySelector('[data-tag-collision]').textContent)).includes('1 nota já usa'));
    L('rename: mostra quantas notas serão alteradas (2)', (await mgrText()).includes('2 notas serão alteradas'));
    await page.click('[data-tag-rename-cancel]');
    const dbTags0 = await ev(() => JSON.stringify(window.__DB.own_flashcards.map(r => r.tags)));
    L('rename cancelado: nada muda no banco', dbTags0 === '[["a1","saudacao"],["saudacao","verbos"],["cumprimentos"]]', dbTags0);
    L('rename cancelado: nenhuma RPC de rename disparada', (await ev(() => (window.__tagRpcCalls || []).filter(c => c.name === 'rename_note_tag').length)) === 0);

    // ===== nenhuma alteração (mesmo slug normalizado) =====
    await page.click('[data-tag-rename="saudacao"]');
    await page.fill('[data-tag-rename-input]', 'SAUDAÇÃO');
    L('rename para o mesmo slug normalizado: confirmar desabilitado (sem UPDATE)', await ev(() => document.querySelector('[data-tag-rename-confirm]').disabled));
    await page.fill('[data-tag-rename-input]', '!!!');
    L('rename inválido: confirmar desabilitado + erro', (await ev(() => document.querySelector('[data-tag-rename-confirm]').disabled)) && (await ev(() => !!document.querySelector('[data-tag-rename-panel] .profile-edit-field-error'))));
    await page.click('[data-tag-rename-cancel]');

    // ===== rename com fusão =====
    await page.click('[data-tag-rename="saudacao"]');
    await page.fill('[data-tag-rename-input]', 'Cumprimentos');
    await page.click('[data-tag-rename-confirm]');
    await page.waitForFunction(() => JSON.stringify(window.__DB.own_flashcards.map(r => r.tags)) === '[["a1","cumprimentos"],["cumprimentos","verbos"],["cumprimentos"]]', null, { timeout: 8000 });
    L('rename: fusão sem duplicata, ordem preservada (no banco)', true);
    const after = await ev(() => ({ rev: window.__DB.own_flashcards.map(r => r.revision).join(), teacher: JSON.stringify(window.__DB.teacher_flashcards[0].tags), filter: JSON.stringify(STATE.studySettings.reviewTagFilter), cardTags: STATE.cards.filter(c => c.origin === 'self').map(c => c.tags.join()).join('|') }));
    L('rename: revision intacta (sem reset de FSRS)', after.rev === '5,5,5', after);
    L('rename: Teacher Card com a mesma string NÃO é alterado (fronteira de propriedade)', after.teacher === '["saudacao","prof"]', after);
    L('rename: reviewTagFilter atualizado (saudacao → cumprimentos)', after.filter === '["cumprimentos"]', after);
    L('rename: STATE.cards (origem self) atualizado em memória', after.cardTags.includes('a1,cumprimentos'), after);
    await page.waitForFunction(() => document.querySelector('#my-tag-manager [data-tag-row="cumprimentos"]'));
    rows = await rowsOf();
    L('rename: lista refeita (cumprimentos:3, saudacao some)', rows.includes('cumprimentos:3 notas') && !rows.some(r => r.startsWith('saudacao')), rows);
    L('rename: filtro persistido no estado salvo', await ev(() => JSON.stringify(serializeState()).includes('"reviewTagFilter":["cumprimentos"]')));

    // ===== delete: cancelar e confirmar =====
    await page.click('[data-tag-delete="verbos"]');
    L('delete: confirmação mostra nome, quantidade e aviso de irreversibilidade', await ev(() => { const t = document.querySelector('[data-tag-delete-panel]').textContent; return t.includes('#verbos') && t.includes('1 nota') && t.includes('não pode ser desfeita'); }));
    await page.click('[data-tag-delete-cancel]');
    L('delete cancelado: nada muda', (await ev(() => JSON.stringify(window.__DB.own_flashcards[1].tags))) === '["cumprimentos","verbos"]');
    await page.click('[data-tag-delete="verbos"]');
    await page.click('[data-tag-delete-confirm]');
    await page.waitForFunction(() => JSON.stringify(window.__DB.own_flashcards[1].tags) === '["cumprimentos"]', null, { timeout: 8000 });
    L('delete: remove só a Tag escolhida, preserva as outras', true);
    L('delete: revision intacta', (await ev(() => window.__DB.own_flashcards.map(r => r.revision).join())) === '5,5,5');

    // ===== delete de Tag no filtro → filtro atualizado/limpo =====
    await page.waitForSelector('#my-tag-manager [data-tag-delete="cumprimentos"]');
    await page.click('[data-tag-delete="cumprimentos"]');
    await page.click('[data-tag-delete-confirm]');
    await page.waitForFunction(() => window.__DB.own_flashcards.every(r => !r.tags.includes('cumprimentos')), null, { timeout: 8000 });
    L('delete de Tag selecionada: filtro limpo (nunca filtro morto)', (await ev(() => STATE.studySettings.reviewTagFilter.length)) === 0);
    L('delete: Teacher Card intacto após tudo', (await ev(() => JSON.stringify(window.__DB.teacher_flashcards[0].tags))) === '["saudacao","prof"]');
    await page.waitForFunction(() => document.querySelector('#my-tag-manager [data-tag-row="a1"]'));
    await page.click('[data-tag-delete="a1"]'); await page.click('[data-tag-delete-confirm]');
    await page.waitForSelector('#my-tag-manager [data-tag-manager-empty]');
    L('estado vazio depois de excluir tudo', true);

    // ===== duplo submit: 1 só RPC =====
    await ev(() => { window.__DB.own_flashcards[0].tags = ['x1', 'y1']; window.__tagRpcCalls = []; window.__tagRpcDelay = 250; renderMyFlashcardsView(); });
    await page.waitForSelector('#my-tag-manager [data-tag-rename="x1"]');
    await page.click('[data-tag-rename="x1"]'); await page.fill('[data-tag-rename-input]', 'novo');
    await ev(() => { const b = document.querySelector('[data-tag-rename-confirm]'); b.click(); b.click(); b.click(); });
    await page.waitForFunction(() => JSON.stringify(window.__DB.own_flashcards[0].tags) === '["novo","y1"]', null, { timeout: 8000 });
    L('duplo/triplo clique: exatamente 1 RPC de rename', (await ev(() => window.__tagRpcCalls.filter(c => c.name === 'rename_note_tag').length)) === 1);
    await ev(() => { window.__tagRpcDelay = 0; });

    // ===== erro na operação: mensagem, dados intactos =====
    await page.waitForSelector('#my-tag-manager [data-tag-rename="y1"]');
    await ev(() => { window.__failTagRename = true; });
    await page.click('[data-tag-rename="y1"]'); await page.fill('[data-tag-rename-input]', 'zzz'); await page.click('[data-tag-rename-confirm]');
    await page.waitForSelector('#my-tag-manager .profile-edit-error');
    L('erro de RPC: mensagem visível e dados intactos', (await mgrText()).includes('Não foi possível') && (await ev(() => JSON.stringify(window.__DB.own_flashcards[0].tags))) === '["novo","y1"]');
    await ev(() => { window.__failTagRename = false; });

    // ===== erro ao listar → retry =====
    await ev(() => { window.__failTagList = true; renderMyFlashcardsView(); });
    await page.waitForSelector('#my-tag-manager [data-tag-manager-error]');
    L('erro ao listar: mensagem + botão tentar de novo', await ev(() => !!document.querySelector('[data-tag-manager-retry]')));
    await ev(() => { window.__failTagList = false; });
    await page.click('[data-tag-manager-retry]');
    await page.waitForSelector('#my-tag-manager [data-tag-row]');
    L('retry recupera a lista', true);

    // ===== professora (admin): Painel administrativo, todos os alunos/idiomas =====
    await ev((a) => {
      const other = a === 'frances' ? 'mandarim' : 'frances';
      window.__DB.teacher_flashcards.length = 0;
      const tf = (id, tid, sid, lang, tags) => ({ id, teacher_id: tid, student_id: sid, language_app_key: lang, status: 'active', revision: 3, front: 'f', back_trans: 'b', tags, deck_id: null });
      window.__DB.teacher_flashcards.push(tf(1, 'T', 'S1', a, ['saudacao', 'a1']), tf(2, 'T', 'S2', other, ['saudacao']), tf(3, 'T', 'S3', a, ['a1']), tf(4, 'T2', 'S9', a, ['saudacao']));
      CURRENT_USER = { id: 'T' }; window.__uid = 'T'; window.__isAdmin = true; isAdminUser = () => true;
      switchTab('admin-badges'); switchAdminPanelSection('tags');
    }, appKey);
    await page.waitForSelector('#admin-tag-manager [data-tag-row]');
    const arows = await ev(() => [...document.querySelectorAll('#admin-tag-manager [data-tag-row]')].map(r => r.dataset.tagRow + ':' + r.querySelector('.profile-edit-hint').textContent.trim()));
    L('professora: lista Tags de Teacher Cards de TODOS os alunos/idiomas dela (sem a de outra professora)', JSON.stringify(arows) === '["a1:2 notas","saudacao:2 notas"]', arows);
    await page.click('#admin-tag-manager [data-tag-rename="saudacao"]');
    await page.fill('#admin-tag-manager [data-tag-rename-input]', 'cumprimentos');
    await page.click('#admin-tag-manager [data-tag-rename-confirm]');
    await page.waitForFunction(() => window.__DB.teacher_flashcards[1].tags.join() === 'cumprimentos', null, { timeout: 8000 });
    const t = await ev(() => window.__DB.teacher_flashcards.map(r => r.tags.join('+') + '@' + r.revision).join(' | '));
    L('professora: rename atravessa alunos e idiomas sem escolher aluno; ordem e revision preservadas', t === 'cumprimentos+a1@3 | cumprimentos@3 | a1@3 | saudacao@3', t);
    L('professora: Teacher Card de OUTRA professora intacto', t.endsWith('saudacao@3'));
    await page.waitForSelector('#admin-tag-manager [data-tag-row="cumprimentos"]');
    await page.click('#admin-tag-manager [data-tag-delete="a1"]');
    L('professora: confirmação de exclusão com contagem', (await ev(() => document.querySelector('#admin-tag-manager [data-tag-delete-panel]').textContent)).includes('2 notas'));
    await page.click('#admin-tag-manager [data-tag-delete-confirm]');
    await page.waitForFunction(() => window.__DB.teacher_flashcards.slice(0, 3).every(r => !r.tags.includes('a1')), null, { timeout: 8000 });
    L('professora: delete global no escopo dela', (await ev(() => window.__DB.teacher_flashcards.slice(0, 3).map(r => r.tags.join()).join('|'))) === 'cumprimentos|cumprimentos|');
    L('professora: seção não altera o filtro de Review dela (escopo teacher)', (await ev(() => STATE.studySettings.reviewTagFilter.length)) === 0);
    L('professora: nenhuma RPC pediu own (só scope teacher)', await ev(() => window.__tagRpcCalls.filter(c => c.args.p_scope === 'teacher').length > 0));

    // ===== não-admin não acessa a seção =====
    await ev(() => { isAdminUser = () => false; window.__isAdmin = false; renderAdminTagsView(); });
    L('não-admin: seção bloqueada (nenhum gerenciador montado)', (await ev(() => document.getElementById('admin-tags-content').textContent)).includes('administração') && (await ev(() => !document.querySelector('#admin-tag-manager'))));
    L('sem pageerror', errors.length === 0, errors);
    await page.context().close();
  }
  await browser.close(); server.close();
  console.log(`Fase J Playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();
