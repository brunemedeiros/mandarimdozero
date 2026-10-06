// Import do Anki para um Deck escolhido -- Playwright (Chromium real), FR + ZH.
// Fluxo real da tela de resumo do import (shared/anki-import-ui.js): seletor
// de Deck de destino, "Manter as pastas do Anki", conflito de nome
// ("Criar com sufixo (2)" / "Inserir no Deck existente"), Decks criados só
// depois de confirmar, cada Note no Deck da sua pasta.
// Rodar: node tests/anki-destino/test_playwright.js
const { server, bootPage, openMeusCartoes, stubAnkiParse, openAnkiImport, chromium } = require('./pw_harness');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

const NOTES = [
  { id: 1, front: 'chat', back: 'gato', deck: 'Vocab::Animais', tags: ['bichos'] },
  { id: 2, front: 'chien', back: 'cachorro', deck: 'Vocab::Animais' },
  { id: 3, front: 'rouge', back: 'vermelho', deck: 'Vocab::Cores' },
  { id: 4, front: 'aller', back: 'ir', deck: 'Verbos' },
];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);

    // 1) Manter pastas (padrão), destino = Meus Decks, sem conflito
    await openMeusCartoes(page, true, false);
    await stubAnkiParse(page, NOTES);
    await openAnkiImport(page);
    const decksBefore = await ev(() => window.__DB.decks.length);
    L('resumo: seletor de Deck com "Meus Decks" selecionado', await ev(() => { const s = document.getElementById('anki-import-dest-deck'); const pr = window.__DB.decks.find(d => d.kind === 'personal_root'); return !!s && s.value === String(pr.id) && s.options[s.selectedIndex].textContent.trim() === 'Meus Decks'; }));
    L('resumo: "Manter as pastas do Anki" ligado por padrão', await ev(() => document.getElementById('anki-import-keep-folders').checked === true));
    L('preview não cria Deck nenhum', await ev(n => window.__DB.decks.length === n, decksBefore));
    L('sem conflito: nenhuma pergunta, botão habilitado', await ev(() => !document.querySelector('input[name="anki-import-conflict"]') && !document.getElementById('anki-import-confirm-btn').disabled));
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    const r1 = await ev(() => {
      const D = window.__DB.decks, pr = D.find(d => d.kind === 'personal_root');
      const by = (name, parent) => D.find(d => d.name === name && d.parent_deck_id === parent);
      const vocab = by('Vocab', pr.id), animais = vocab && by('Animais', vocab.id), cores = vocab && by('Cores', vocab.id), verbos = by('Verbos', pr.id);
      const rowOf = t => window.__DB.own_flashcards.find(r => r.fields && r.fields[0].content.value === t);
      return { ok: !!(vocab && animais && cores && verbos), kinds: [vocab, animais, cores, verbos].every(d => d && d.kind === 'personal'),
        chat: rowOf('chat').deck_id === animais.id, chien: rowOf('chien').deck_id === animais.id, rouge: rowOf('rouge').deck_id === cores.id, aller: rowOf('aller').deck_id === verbos.id,
        importado: D.some(d => /importad/i.test(d.name)), text: document.getElementById('anki-import-body').innerText };
    });
    L('pastas recriadas abaixo de Meus Decks (Vocab > Animais/Cores, Verbos), kind=personal', r1.ok && r1.kinds, r1);
    L('cada Note no Deck da sua pasta', r1.chat && r1.chien && r1.rouge && r1.aller, r1);
    L('nunca um Deck global "Importado"', !r1.importado);
    L('resultado informa Decks criados', /4 Deck\(s\) criado\(s\)/.test(r1.text), r1.text);
    L('cartões entram em STATE.cards com o deckId certo', await ev(() => STATE.cards.filter(c => c.origin === 'self').length === 4 && STATE.cards.filter(c => c.origin === 'self').every(c => c.deckId != null)));
    await page.click('#anki-import-done-btn');

    // 2) Mesmo .apkg de novo: conflito -> pergunta, botão bloqueado até escolher; escolhe sufixo
    await openMeusCartoes(page, true, false);
    await stubAnkiParse(page, NOTES);
    await openAnkiImport(page);
    let q = await ev(() => ({ text: (document.getElementById('anki-import-conflicts') || {}).innerText || '', disabled: document.getElementById('anki-import-confirm-btn').disabled }));
    L('conflito: pergunta exibida', q.text.includes('Um deck com este nome já existe. O que você deseja fazer?') && q.text.includes('Criar com sufixo (2)') && q.text.includes('Inserir no Deck existente'), q);
    L('conflito: confirmar bloqueado até escolher', q.disabled === true);
    L('duplicatas prováveis vêm desmarcadas', await ev(() => ANKI_IMPORT_STATE.selectedIds.size === 0));
    await page.click('#anki-import-select-all');
    await page.check('input[name="anki-import-conflict"][value="suffix"]');
    L('escolha feita: confirmar habilitado', await ev(() => !document.getElementById('anki-import-confirm-btn').disabled));
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    const r2 = await ev(() => { const D = window.__DB.decks, pr = D.find(d => d.kind === 'personal_root');
      const v2 = D.find(d => d.name === 'Vocab (2)' && d.parent_deck_id === pr.id), ve2 = D.find(d => d.name === 'Verbos (2)' && d.parent_deck_id === pr.id);
      return { v2: !!v2, ve2: !!ve2, animaisInV2: !!(v2 && D.find(d => d.name === 'Animais' && d.parent_deck_id === v2.id)), vocabCount: D.filter(d => d.name === 'Vocab').length }; });
    L('sufixo: "Vocab (2)" e "Verbos (2)" criados, filhos sem sufixo, original intacto', r2.v2 && r2.ve2 && r2.animaisInV2 && r2.vocabCount === 1, r2);
    await page.click('#anki-import-done-btn');

    // 3) Inserir no existente, destino = subdeck Vocab, sem manter pastas -> tudo no Vocab
    await openMeusCartoes(page, true, false);
    await stubAnkiParse(page, [{ id: 9, front: 'bleu', back: 'azul', deck: 'Vocab::Cores' }, { id: 10, front: 'vert', back: 'verde', deck: 'Outra' }]);
    await openAnkiImport(page);
    const vocabId = await ev(() => window.__DB.decks.find(d => d.name === 'Vocab').id);
    await page.selectOption('#anki-import-dest-deck', String(vocabId));
    await page.uncheck('#anki-import-keep-folders');
    L('sem pastas: nenhuma pergunta de conflito', await ev(() => !document.querySelector('input[name="anki-import-conflict"]') && !document.getElementById('anki-import-confirm-btn').disabled));
    const nDecks = await ev(() => window.__DB.decks.length);
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    L('sem pastas: tudo no Deck escolhido e nenhum Deck criado', await ev(([v, n]) => { const rows = window.__DB.own_flashcards.filter(r => ['bleu', 'vert'].includes(r.fields[0].content.value)); return rows.length === 2 && rows.every(r => r.deck_id === v) && window.__DB.decks.length === n; }, [vocabId, nDecks]));
    await page.click('#anki-import-done-btn');

    // 4) Inserir no existente (merge) com pastas, destino = Meus Decks
    await openMeusCartoes(page, true, false);
    await stubAnkiParse(page, [{ id: 11, front: 'jaune', back: 'amarelo', deck: 'Vocab::Cores' }]);
    await openAnkiImport(page);
    await page.check('input[name="anki-import-conflict"][value="merge"]');
    const nDecks2 = await ev(() => window.__DB.decks.length);
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    L('inserir no existente: Note no "Cores" já existente, nenhum Deck novo', await ev(n => { const D = window.__DB.decks; const vocab = D.find(d => d.name === 'Vocab'); const cores = D.find(d => d.name === 'Cores' && d.parent_deck_id === vocab.id); const r = window.__DB.own_flashcards.find(x => x.fields[0].content.value === 'jaune'); return r.deck_id === cores.id && D.length === n; }, nDecks2));
    await page.click('#anki-import-done-btn');

    // 5) Falha ao criar um Deck: Notes daquele ramo não são importadas, aviso
    await openMeusCartoes(page, true, false);
    await stubAnkiParse(page, [{ id: 12, front: 'un', back: 'um', deck: 'Quebrado::Sub' }, { id: 13, front: 'deux', back: 'dois', deck: 'Bom' }]);
    await openAnkiImport(page);
    await ev(() => { const orig = createPersonalDeck; window.__origCreate = orig; createPersonalDeck = async (a) => a.name === 'Quebrado' ? { ok: false, error: 'falha simulada' } : orig(a); });
    await page.click('#anki-import-confirm-btn');
    await page.waitForSelector('#anki-import-done-btn', { timeout: 10000 });
    const r5 = await ev(() => ({ un: window.__DB.own_flashcards.some(r => r.fields && r.fields[0].content.value === 'un'), deux: window.__DB.own_flashcards.some(r => r.fields && r.fields[0].content.value === 'deux'), sub: window.__DB.decks.some(d => d.name === 'Sub'), text: document.getElementById('anki-import-body').innerText }));
    L('falha de Deck: ramo não importado, outro ramo importado, aviso', !r5.un && r5.deux && !r5.sub && /Não foi possível criar o Deck "Quebrado"/.test(r5.text), r5);
    await ev(() => { createPersonalDeck = window.__origCreate; });
    await page.click('#anki-import-done-btn');

    L('sem erros de JS na página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Anki destino -- playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
