// A1: texto do cartão (próprio ou copiado de Deck público) nunca vira HTML no Combinar e na Revisão rápida.
// Falha na origin/main (o <img onerror> do texto roda), passa na branch. fr e zh.
// Também prova que o conteúdo REAL da trilha (todas as frentes, versos e pinyin) mostra exatamente o mesmo texto que
// antes: para cada texto, o HTML antigo (cru) e o novo (escapado) dão o mesmo textContent.
const { withPage, realErrors, close, check, summary } = require('./harness');

(async () => {
  for (const site of ['fr', 'zh']){
    console.log(`\n[${site}]`);
    const r = await withPage(site, async (page, errs) => {
      const out = await page.evaluate(async () => {
        const res = {};
        // 1) Conteúdo real: o texto exibido é o mesmo com e sem escape.
        const div = document.createElement('div');
        const differs = [];
        let n = 0;
        const all = STATE.cards.filter(c => c.origin === 'study');
        all.forEach(c => {
          const texts = [cardPromptText(c), cardAnswerText(c)];
          if (typeof cardPromptPinyinText === 'function') texts.push(cardPromptPinyinText(c));
          texts.forEach(s => {
            if (s == null) return;
            n++;
            div.innerHTML = String(s); const before = div.textContent;
            div.innerHTML = escapeHTML(String(s)); const after = div.textContent;
            if (before !== after) differs.push([c.id, s]);
          });
        });
        res.realTexts = n; res.realDiffers = differs.slice(0, 5); res.realDiffersN = differs.length;
        // 2) Cartões próprios com HTML no texto.
        window.__p2 = 0;
        const lang = APP_KEY === 'mandarim' ? 'zh' : 'fr';
        const PAYLOAD = (i) => '<img src=x onerror="window.__p2++">w' + i + ' & <b>';
        for (let i = 0; i < 10; i++){
          addSelfFlashcardToState({ id: 900 + i, owner_id: 'u1', language_app_key: APP_KEY, status: 'active', revision: 0, note: null, tags: [], deck_id: null,
            fields: [{ id: 'a', lang, role: null, content: { value: PAYLOAD(i) }, audio: null, image: null, pinyinFieldId: null },
                     { id: 'b', lang: 'pt-BR', role: null, content: { value: '<i>t' + i + '</i>' }, audio: null, image: null, pinyinFieldId: null }],
            card_generation_mode: 'normal' });
        }
        let err = null;
        try { switchTab('review'); openReviewSession('match'); await new Promise(r => setTimeout(r, 300)); MATCH_STATE.pairSize = 5; startMatchGame(); } catch (e) { err = 'match: ' + e.message; }
        await new Promise(r => setTimeout(r, 800));
        res.afterMatch = window.__p2;
        const tiles = [...document.querySelectorAll('.match-tile-front')];
        res.tilesOk = tiles.length > 0 && tiles.every(el => el.querySelector('img,b,i') === null);
        res.tileShowsRawText = tiles.some(el => /^<img src=x onerror="window.__p2\+\+">w\d & <b>$/.test(el.textContent)) || tiles.some(el => /^<i>t\d<\/i>$/.test(el.textContent));
        try { backToReviewModeSelect(); openReviewSession('speed'); } catch (e) { err = (err || '') + ' speed: ' + e.message; }
        await new Promise(r => setTimeout(r, 1200));
        res.afterSpeed = window.__p2;
        const prompt = document.querySelector('#speed-review-content .speed-prompt');
        res.speedPromptNoTags = !!prompt && prompt.querySelector('img,b,i') === null;
        res.speedOptionsNoTags = [...document.querySelectorAll('.speed-option')].every(b => b.querySelector('img,b,i') === null);
        // Acertar continua marcando a opção certa (answerSpeedQuestion compara textContent com o texto do cartão).
        const card = SPEED_STATE.queue[SPEED_STATE.index];
        const right = [...document.querySelectorAll('.speed-option')].find(b => b.textContent === cardAnswerText(card));
        res.rightFound = !!right;
        if (right){ right.click(); await new Promise(r => setTimeout(r, 50)); res.rightMarked = right.classList.contains('correct'); }
        backToReviewModeSelect();
        res.err = err;
        return res;
      });
      out.errors = realErrors(errs);
      return out;
    });
    check(`${site}: conteúdo real da trilha mostra o mesmo texto (${r.realTexts} textos)`, r.realTexts > 100 && r.realDiffersN === 0, r.realDiffers);
    check(`${site}: Combinar não executa HTML do texto`, r.afterMatch === 0, r.afterMatch);
    check(`${site}: Combinar mostra o texto como texto`, r.tilesOk && r.tileShowsRawText, r);
    check(`${site}: Revisão rápida não executa HTML do texto`, r.afterSpeed === 0, r.afterSpeed);
    check(`${site}: Revisão rápida sem tags vindas do texto`, r.speedPromptNoTags && r.speedOptionsNoTags, r);
    check(`${site}: opção certa continua marcada`, r.rightFound && r.rightMarked, r);
    check(`${site}: sem erro de página`, !r.err && r.errors.length === 0, [r.err, r.errors]);
  }
  await close();
  summary('A1 texto');
})().catch(async e => { console.error(e); await close(); process.exit(1); });
