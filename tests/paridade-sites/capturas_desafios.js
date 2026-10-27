// Paridade, etapa 5c (docs/historico/29-paridade-desafios.md): capturas dos Desafios do fr, para comparar ANTES
// (origin/main num worktree) e DEPOIS da mudança para shared/desafios*.js + fr/desafios-config.js + shared/desafios.css.
// Uso: node tests/paridade-sites/capturas_desafios.js <pasta-da-árvore> <pasta-de-saída>
// Compare com: node tests/e4/comparar-capturas.js <antes> <depois> 0
// Cenas (claro/escuro, 390px e 1200px): categorias, álbum de Expressões (com expressão do dia, filtro, busca e nível
// recolhido), fila por nível (Ouça e traduza, Acentuação), Complete a frase, cada player em pergunta e devolutiva
// certa/quase/errada, "Continuar" da fila e nível concluído, revisão dos erros (cartão e fim), Desafios do Módulo,
// linha da trilha, janela Premium, admin (lista, edição, prévia) e importação. Tempo congelado, Math.random com
// semente, animações desligadas, mp3 sem resposta (igual nas duas árvores).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const H = require('./desafios-harness.js');
const ROOT = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || '/tmp/5c-capturas');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const hashes = {};
  for (const theme of ['light', 'dark']) for (const width of [390, 1200]) {
    // um navegador novo por combinação: o cache de imagens decodificadas (ícones Fluent em máscara CSS) de uma rodada
    // não interfere na seguinte (sem isso, um ícone da faixa lateral saía com outro antisserrilhado numa cena só)
    const browser = await H.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    const { page, ctx, server, errors } = await H.boot(browser, ROOT, { theme, viewport: { width, height: 844 }, blockMp3: true });
    await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important;caret-color:transparent !important;scroll-behavior:auto !important}' });
    await page.evaluate(() => { const o = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function(){ return o.call(this, { block: 'start' }); }; });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (name, opts) => {
      opts = opts || {};
      await page.waitForTimeout(150);
      await page.evaluate((kf) => {
        document.querySelectorAll('#streak-modal-overlay, .toast, .toast-container, #toast, .badge-unlock-toast, .confetti-piece').forEach(e => e.remove());
        if (!kf && document.activeElement && document.activeElement.blur) document.activeElement.blur();
        window.scrollTo(0, 0); return document.fonts && document.fonts.ready;
      }, !!opts.keepFocus);
      await page.waitForFunction(() => [...document.images].every(i => i.complete || i.loading === 'lazy'), null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(Number(process.env.CAPTURA_ESPERA || 250));
      // estilo e pintura em dia antes da foto (dois quadros), para não pegar um ícone pintado pela metade
      await page.evaluate(() => { void document.documentElement.offsetHeight; document.querySelectorAll('.emo').forEach(e => getComputedStyle(e).maskImage); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const buf = opts.el ? await (await page.$(opts.el)).screenshot() : await page.screenshot({ fullPage: true });
      const full = `fr-${theme}-${width}-${name}`;
      fs.writeFileSync(path.join(OUT, full + '.png'), buf);
      hashes[full] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    };
    await ev(() => switchTab('challenges'));
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    await shot('categorias');
    await page.hover('.challenge-category-card'); await shot('categorias-hover'); await page.mouse.move(0, 0);
    await ev(() => document.querySelector('.challenge-category-card[data-category="expression"]').click());
    await shot('album');
    // conclui algumas expressões para o álbum mostrar o selo e o sentido
    await ev(() => { publishedChallenges().filter(c => c.type === 'expression').slice(0, 5).forEach(c => { STATE.completedChallenges[c.id] = true; }); renderChallengesList('expression'); });
    await shot('album-concluidas');
    await ev(() => document.querySelector('.challenges-filter-chip[data-filter="done"]').click()); await shot('album-filtro-feitas');
    await ev(() => { document.querySelector('.challenges-filter-chip[data-filter="all"]').click(); const i = document.getElementById('challenges-search'); i.value = 'bon'; i.dispatchEvent(new Event('input')); });
    await shot('album-busca');
    await ev(() => { const i = document.getElementById('challenges-search'); i.value = ''; i.dispatchEvent(new Event('input')); document.querySelector('.challenges-level-heading').click(); });
    await shot('album-recolhido');
    for (const t of ['listen_translate', 'accent', 'cloze_grammar']){ await ev((t) => renderChallengesList(t), t); await shot('lista-' + t); }
    // players: um de cada tipo, pergunta e devolutivas
    const ids = await ev(() => ['expression', 'listen_translate', 'accent', 'cloze_grammar'].map(t => publishedChallenges().find(c => c.type === t && c.moduleId).id));
    for (const id of ids){
      await ev((id) => { window.__seed(4242); openChallengePlayer(id); }, id);
      await shot('q-' + id);
      const type = await ev((id) => CHALLENGES.find(c => c.id === id).type, id);
      if (type === 'expression'){ await ev(() => window.__exprAbrir()); await shot('q-revelada-' + id); }
      if (type === 'accent'){ await page.click('#accent-answer-input'); await page.keyboard.type('caf'); await ev(() => { const b = document.querySelector('#challenge-player-content .fr-accent-picker button'); if (b) b.click(); }); await shot('q-foco-' + id, { keepFocus: true }); }
      for (const k of [0, 1, 2]){
        if (type === 'expression' && k === 1) continue;
        await ev(([id, k]) => { window.__seed(4242); openChallengePlayer(id); const c = CHALLENGES.find(x => x.id === id);
          if (c.type === 'expression'){ window.__exprAbrir(); const b = window.__exprOpcoes(); (k === 0 ? b.find(x => window.__exprTexto(x) === c.correctAnswer) : b.find(x => window.__exprTexto(x) !== c.correctAnswer)).click(); }
          else if (c.type === 'listen_translate'){ document.getElementById('lt-hint-btn').click(); const r = c.referenceTranslations[0]; document.getElementById('lt-answer-input').value = [r, 'Não ' + r.split(' ').slice(0, -1).join(' '), 'Eu gosto de gatos azuis'][k]; document.getElementById('lt-verify-btn').click(); }
          else if (c.type === 'accent'){ document.getElementById('accent-answer-input').value = [c.targetText, c.targetText.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'zzz'][k]; document.getElementById('accent-verify-btn').click(); }
          else { if (k === 1){ document.getElementById('cloze-grammar-verify-btn').click(); return; } (c.blanks || []).forEach((b, i) => { [...document.querySelectorAll('.challenge-choice-btn[data-blank="' + i + '"]')].find(x => k === 0 ? x.dataset.value === b.answer : x.dataset.value !== b.answer).click(); }); document.getElementById('cloze-grammar-verify-btn').click(); } }, [id, k]);
        await shot('fb' + k + '-' + id);
      }
      if (type === 'expression'){ await ev(() => { const r = document.getElementById('challenge-reveal-answer-btn'); if (r) r.click(); else window.__exprAteFinal(); }); await shot('fb-micro-' + id); }
    }
    // fila
    await ev(() => { const c = publishedChallenges().find(x => x.type === 'accent'); challengeQueueContext = { type: 'accent', level: c.level }; openChallengePlayer(c.id); document.getElementById('accent-answer-input').value = c.targetText; document.getElementById('accent-verify-btn').click(); document.getElementById('challenge-complete-btn').click(); });
    await shot('fila-continuar');
    await ev(() => renderChallengeQueueLevelDoneScreen(publishedChallenges().find(x => x.type === 'accent'))); await shot('fila-nivel-concluido');
    await ev(() => renderChallengesList('accent')); await shot('fila-progresso');
    // revisão dos erros
    await ev(() => { const base = Date.now(); publishedChallenges().filter(c => c.type !== 'expression').slice(0, 3).forEach(c => { STATE.challengeReviews[c.id] = { id: c.id, lastErrorAt: base - 9 * 86400000, lastSeenAt: base - 9 * 86400000, box: 1 }; }); renderChallengeCategories(); });
    await page.waitForFunction(() => document.getElementById('challenges-review-card'));
    await shot('revisao-cartao');
    await ev(() => renderChallengeReviewDoneScreen()); await shot('revisao-fim');
    // Desafios do Módulo
    await ev(() => openModuleChallenges('A1-m1'));
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    await shot('modulo');
    await ev(() => document.querySelector('.challenge-category-card[data-category]').click()); await shot('modulo-lista');
    // trilha
    await ev(() => { STATE.currentLevel = 'A1'; switchTab('path'); });
    await page.waitForFunction(() => document.querySelectorAll('.module-challenges-slot .unit-block').length > 0, null, { timeout: 10000 }).catch(() => {});
    await ev(() => { const r = document.querySelector('.module-challenges-slot .unit-block'); if (r) r.scrollIntoView(); });
    if (await ev(() => !!document.querySelector('.module-challenges-slot .unit-block'))) await shot('trilha-linha', { el: '.module-challenges-slot .unit-block' });
    // janela Premium
    await ev(() => { switchTab('challenges'); openPremiumChallengesModal(); }); await shot('premium');
    await ev(() => { document.getElementById('premium-challenges-modal').style.display = 'none'; });
    // admin
    await ev(() => { CURRENT_USER = { id: 'a', email: 'brunemed1310@gmail.com' }; challengesLoadedAt = 0; renderChallengeCategories(); });
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    await shot('admin-barra');
    await ev(() => renderChallengesAdmin()); await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
    await shot('admin-lista');
    await ev(() => { const s = document.getElementById('challenges-admin-filter-type'); s.value = 'cloze_grammar'; s.dispatchEvent(new Event('change')); }); await shot('admin-cloze');
    await ev(() => { const s = document.getElementById('challenges-admin-filter-type'); s.value = 'all'; s.dispatchEvent(new Event('change')); const c = pendingChallenges()[0]; challengesAdminEditingId = c.id; renderChallengesAdminList(); });
    await shot('admin-edicao');
    await ev(() => { challengesAdminEditingId = null; const cbs = document.querySelectorAll('.challenges-admin-select-checkbox'); [0, 1].forEach(i => { cbs[i].checked = true; cbs[i].dispatchEvent(new Event('change')); }); });
    await shot('admin-selecao');
    await ev(() => openChallengePreview(pendingChallenges().find(c => c.type === 'listen_translate'))); await shot('admin-previa');
    await ev(() => { document.getElementById('challenge-back-to-list').click(); });
    await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
    await ev(() => { document.getElementById('challenges-admin-back-btn').click(); });
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    await ev(() => document.getElementById('challenges-admin-import-btn').click()); await shot('importar');
    await ev(() => { document.getElementById('challenges-import-textarea').value = 'não é json'; document.getElementById('challenges-import-submit-btn').click(); }); await shot('importar-erro');
    if (errors.length) console.log(`  erros de página (${theme} ${width}):`, errors.slice(0, 3));
    await ctx.close(); server.close();
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'hashes.json'), JSON.stringify(hashes, null, 1));
  console.log(Object.keys(hashes).length + ' capturas em ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
