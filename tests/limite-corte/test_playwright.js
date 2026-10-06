// Limite do plano grátis "corta e avisa" (arquitetura seção 17) -- Playwright, FR + ZH.
// Importações (arquivo/link, Anki, perfil público) criam só as primeiras
// Notes que cabem no teto de 20 CardInstances e avisam com convite ao
// Premium; criação manual de 1 cartão continua bloqueando; Premium e
// vínculo com professora sem teto.
// Rodar: node tests/limite-corte/test_playwright.js
const { server, bootPage, openMeusCartoes, stubAnkiParse, openAnkiImport, chromium } = require('../anki-destino/pw_harness');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

const seed = (page, n) => page.evaluate(n => {
  window.__DB.own_flashcards = [];
  if (typeof STATE !== 'undefined') STATE.cards = STATE.cards.filter(c => c.origin !== 'self');
  const pr = window.__DB.decks.find(d => d.kind === 'personal_root');
  for (let i = 0; i < n; i++) window.__DB.own_flashcards.push({ id: 9000 + i, owner_id: 'u-f', language_app_key: APP_KEY, status: 'active', deck_id: pr ? pr.id : null, front: 'a' + i, back_trans: 'b', fields: null, card_generation_mode: null, revision: 0, tags: [], created_at: new Date().toISOString() });
}, n);
const modal = page => page.evaluate(() => { const m = document.getElementById('flashcard-limit-modal'); return { open: m.style.display === 'flex', text: m.innerText, cta: !!m.querySelector('[data-limit-premium-cta]') }; });
const closeModal = page => page.evaluate(() => { document.getElementById('flashcard-limit-modal').style.display = 'none'; });

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const key = lang === 'fr' ? 'frances' : 'mandarim';
    page.on('dialog', d => d.accept());

    // A) Arquivo/link: Free com 18 -> 3 Normal, só 2 criados + aviso
    await openMeusCartoes(page, false, false);
    await seed(page, 18);
    await openMeusCartoes(page, false, false);
    const file = { languageAppKey: key, cards: ['c1', 'c2', 'c3'].map(f => ({ front: f, backTrans: f + 'b', frontIsTargetLanguage: true })) };
    await page.setInputFiles('#my-flashcards-import-file', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
    await page.waitForFunction(() => document.getElementById('flashcard-limit-modal').style.display === 'flex', null, { timeout: 8000 });
    let m = await modal(page);
    L('A arquivo: só as 2 primeiras Notes criadas', await ev(() => { const t = window.__DB.own_flashcards.filter(r => r.fields).map(r => r.fields[0].content.value); return t.length === 2 && t[0] === 'c1' && t[1] === 'c2'; }));
    L('A aviso com números reais', m.text.includes('Esta importação criaria 3 cartões, mas sua conta pode possuir apenas 20') && m.text.includes('apenas os primeiros 2 cartões foram criados'), m.text);
    L('A convite ao Premium destacado', m.cta && /Premium/.test(m.text) && /administração/.test(m.text));
    await closeModal(page);

    // B) Criação manual no teto: bloqueia e mostra o texto PADRÃO (sem vazar o aviso de corte)
    await openMeusCartoes(page, false, false);
    await ev(() => openFlashcardLimitModal());
    m = await modal(page);
    L('B modal padrão restaurado (sem texto de importação)', m.open && m.text.includes('20 cartões próprios ativos') && !m.cta && !m.text.includes('criaria'), m.text);
    await closeModal(page);

    // C) Anki: Free com 17 -> 5 Notes, 3 criadas, aviso "Este Deck criaria 5..."
    await seed(page, 17);
    await openMeusCartoes(page, false, false);
    await stubAnkiParse(page, [1, 2, 3, 4, 5].map(i => ({ id: i, front: 'k' + i, back: 'v' + i, deck: 'Pacote' })));
    await openAnkiImport(page);
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    m = await modal(page);
    const ank = await ev(() => ({ rows: window.__DB.own_flashcards.filter(r => r.fields).map(r => r.fields[0].content.value), body: document.getElementById('anki-import-body').innerText }));
    L('C Anki: só as 3 primeiras Notes criadas', ank.rows.join(',') === 'k1,k2,k3', ank.rows);
    L('C Anki: aviso "Este Deck criaria 5 cartões..."', m.open && m.text.includes('Este Deck criaria 5 cartões, mas sua conta pode possuir apenas 20') && m.text.includes('você já tinha 17') && m.text.includes('apenas os primeiros 3 cartões foram criados') && m.cta, m.text);
    L('C Anki: resultado também informa o corte', ank.body.includes('2 cartão(ões) do Anki ficaram de fora'), ank.body);
    await closeModal(page);
    await page.click('#anki-import-done-btn');

    // D) Anki no teto: nada criado (nem Deck), aviso
    await seed(page, 20);
    await openMeusCartoes(page, false, false);
    await stubAnkiParse(page, [{ id: 7, front: 'z1', back: 'z2', deck: 'NovoDeck' }]);
    await openAnkiImport(page);
    const nDecks = await ev(() => window.__DB.decks.length);
    await page.click('#anki-import-confirm-btn');
    await page.waitForFunction(() => document.getElementById('flashcard-limit-modal').style.display === 'flex', null, { timeout: 8000 });
    m = await modal(page);
    L('D no teto: nada criado, nenhum Deck criado', await ev(n => window.__DB.own_flashcards.filter(r => r.fields).length === 0 && window.__DB.decks.length === n, nDecks));
    L('D aviso "nenhum cartão foi criado"', m.text.includes('Por isso, nenhum cartão foi criado.'), m.text);
    await closeModal(page);
    await ev(() => { document.getElementById('anki-import-modal').style.display = 'none'; });

    // E) Premium: sem corte
    await seed(page, 19);
    await openMeusCartoes(page, true, false);
    await stubAnkiParse(page, [1, 2, 3].map(i => ({ id: i, front: 'p' + i, back: 'q' + i })));
    await openAnkiImport(page);
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    L('E Premium: todas criadas, sem aviso', await ev(() => window.__DB.own_flashcards.filter(r => r.fields).length === 3 && document.getElementById('flashcard-limit-modal').style.display !== 'flex'));
    await page.click('#anki-import-done-btn');

    // F) Perfil público: Free com 19 -> 2 cartões, só o 1º copiado
    await seed(page, 19);
    await openMeusCartoes(page, false, false);
    const pub = await ev(async () => {
      PUBLIC_PROFILE_IMPORT_STATE.username = 'autora';
      PUBLIC_PROFILE_IMPORT_STATE.cardsCache = [{ id: 501, front: 'pub1', backTrans: 'x', frontIsTargetLanguage: true, tags: [] }, { id: 502, front: 'pub2', backTrans: 'y', frontIsTargetLanguage: true, tags: [] }];
      PUBLIC_PROFILE_IMPORT_STATE.selectedIds = new Set([501, 502]);
      PUBLIC_PROFILE_IMPORT_STATE.myCards = window.__DB.own_flashcards.slice();
      PUBLIC_PROFILE_IMPORT_STATE.hasLink = false;
      const copied = [];
      copyPublicFlashcard = async ({ sourceId }) => { copied.push(sourceId); return { ok: true, card: { id: 7000 + sourceId, owner_id: 'u-f', language_app_key: APP_KEY, status: 'active', front: 'p', back_trans: 'q', revision: 0, tags: [] } }; };
      renderPublicProfileCardsBox = async () => {};
      const outer = document.createElement('div'), mid = document.createElement('div'), box = document.createElement('div');
      box.innerHTML = '<p id="public-profile-cards-import-error"></p><button id="public-profile-cards-import-btn"></button>';
      mid.appendChild(box); outer.appendChild(mid); document.body.appendChild(outer);
      await importSelectedPublicFlashcards(box);
      return copied;
    });
    m = await modal(page);
    L('F perfil público: só o 1º cartão copiado', pub.length === 1 && pub[0] === 501, pub);
    L('F perfil público: aviso de corte com convite', m.open && m.text.includes('Esta seleção criaria 2 cartões') && m.text.includes('apenas o primeiro cartão foi criado') && m.cta, m.text);
    await closeModal(page);

    L('sem erros de JS na página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Limite corta-e-avisa -- playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
