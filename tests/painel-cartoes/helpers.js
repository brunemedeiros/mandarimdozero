// Ajudantes para os testes antigos (fase-g/h/i) falarem com a tela nova de Cartões:
// alunos ficam num seletor que abre e fecha, tipos são botões de escolha, mover é uma janela na lista.
// A comemoração de sequência (dias seguidos) do app pode abrir por cima depois de um estudo; fecha pelo botão dela.
async function fecharSequencia(page){
  await page.evaluate(() => { const o = document.getElementById('streak-modal-overlay'); if (o && getComputedStyle(o).display !== 'none') document.getElementById('streak-modal-continue-btn').click(); });
}
async function clicar(page, sel){
  for (let i = 0; i < 3; i++){
    try { await page.click(sel, { timeout: 4000 }); return; } catch (e) { if (i === 2) throw e; await fecharSequencia(page); }
  }
}
async function openPicker(page){
  await fecharSequencia(page);
  const aberto = await page.evaluate(() => { const d = document.querySelector('[data-cards-pane="criar"] details.p-popover'); return !!d && d.open; });
  if (!aberto) await clicar(page, '[data-cards-pane="criar"] details.p-popover > summary');
}
async function pickStudent(page, sid, on = true){
  await openPicker(page);
  await page[on ? 'check' : 'uncheck'](`[data-student-checkbox][value="${sid}"]:visible`);
  await page.keyboard.press('Escape');
}
async function setLang(page, key){
  await openPicker(page);
  await page.click(`[data-lang-filter="${key}"]`);
  await page.keyboard.press('Escape');
}
async function setType(page, type){
  await page.click(`.p-tipos label:has([value="${type}"])`);
  await page.waitForTimeout(150);
}
async function openTree(page, sid){
  await page.waitForSelector(`[data-dest-row="${sid}"]`);
  const aberto = await page.evaluate(s => document.querySelector(`[data-dest-row="${s}"] details`).open, sid);
  if (!aberto) await page.click(`[data-dest-row="${sid}"] details > summary`);
}
async function goTab(page, tab){ await fecharSequencia(page); await clicar(page, `[data-cards-tab="${tab}"]`); }
async function moveCardUI(page, cardId, deckId){
  await goTab(page, 'lista');
  await page.click(`[data-card-row="${cardId}"] summary`);
  await page.click(`[data-move-flashcard="${cardId}"]`);
  await page.selectOption('#mover-cartao-deck', String(deckId));
  await page.click('#form-mover-cartao button[type=submit]');
  await page.waitForSelector('#dlg-mover-cartao', { state: 'detached' });
  await goTab(page, 'criar');
}
async function moveOptions(page, cardId){
  await goTab(page, 'lista');
  await page.click(`[data-card-row="${cardId}"] summary`);
  const has = await page.$(`[data-move-flashcard="${cardId}"]`);
  let opts = [];
  if (has){
    await page.click(`[data-move-flashcard="${cardId}"]`);
    opts = await page.$$eval('#mover-cartao-deck option', o => o.map(x => x.value).filter(Boolean));
    await page.keyboard.press('Escape');
    await page.evaluate(() => { const d = document.getElementById('dlg-mover-cartao'); if (d) d.remove(); });
  } else await page.keyboard.press('Escape');
  await goTab(page, 'criar');
  return opts;
}
async function listText(page){ await goTab(page, 'lista'); const t = await page.innerText('[data-cards-pane="lista"]'); await goTab(page, 'criar'); return t; }
module.exports = { openPicker, pickStudent, setLang, setType, openTree, goTab, moveCardUI, moveOptions, listText };
