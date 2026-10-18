// Aba "Cartões" do painel da professora (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Só a rede é trocada (tests/painel-alunos/harness.js: cartões e Decks em memória). Cobre: abas, escolher pessoas, destinos
// (Deck e subdeck), tipos de cartão, criar para 1 e para vários, validação, lista com filtros e paginação, ações (visualizar,
// editar com reinício de progresso, mover, reativar, apagar), estados vazios e celular.
// Rodar: node tests/painel-cartoes/test_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrir } = require('../painel-alunos/harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

async function abrirCartoes(opts){
  const h = await abrir(opts); const p = h.page;
  await p.waitForSelector('[data-tsu="geral"], [data-tcc]', { timeout: 15000 });
  await p.evaluate(() => switchTeacherPanelSection('flashcards'));
  await p.waitForSelector('[data-tcc]', { timeout: 15000 });
  return h;
}

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const h = await abrirCartoes({ lang, scheme }); const p = h.page;
    await p.waitForSelector('[data-tcc="pagina"]');
    const cards = () => p.evaluate(() => window.__cards.map(c => ({ id: c.id, s: c.student_id, deck: c.deck_id, st: c.status, rev: c.revision, front: c.front, back: c.back_trans, tags: c.tags })));
    const linhas = () => p.$$eval('[data-cards-lista] tbody tr', trs => trs.map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));
    const abrirPicker = async () => { if (!(await p.evaluate(() => document.querySelector('[data-cards-pane="criar"] details.p-popover').open))) await p.click('[data-cards-pane="criar"] details.p-popover > summary'); };
    const marcar = async (sid) => { await abrirPicker(); await p.check(`[data-student-checkbox][value="${sid}"]`); };

    // ---- quadro e abas ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título e 2 abas, com a contagem de ativos', (await p.$$eval('[data-cards-tabs] a', l => l.map(a => a.textContent.trim()))).join('|') === 'Criar cartão|Cartões criados (16)');
    L('abre em Criar cartão; a lista fica escondida', await p.isVisible('[data-cards-pane="criar"]') && !(await p.isVisible('[data-cards-pane="lista"]')));
    // Banco de Revisão: continua com a aparência dele, na sub-navegação "Cartões | Banco de Revisão" do painel (só com a permissão)
    L('Banco de Revisão: sub-navegação Cartões | Banco de Revisão aparece para quem tem a permissão', await p.isVisible('#admin-cards-subnav') && (await p.$$eval('#admin-cards-subnav [data-cards-sub]', l => l.map(b => b.textContent.trim()).join('|'))) === 'Cartões|Banco de Revisão');
    await p.click('#admin-cards-subnav [data-cards-sub="bank"]');
    L('Banco de Revisão: abre o bloco dele e esconde o dos cartões', await p.isVisible('#admin-reviewbank-content') && !(await p.isVisible('#admin-flashcards-content')));
    await p.click('#admin-cards-subnav [data-cards-sub="cards"]');
    L('voltar a Cartões: tela nova de volta e o formulário continua montado', await p.isVisible('#admin-flashcards-content') && !(await p.isVisible('#admin-reviewbank-content')) && !!(await p.$('[data-cards-pane="criar"]')));
    await p.click('[data-cards-tab="criar"]');

    // ---- criar: estado inicial ----
    L('sem ninguém: botão desligado, chips e destino explicam', await p.isDisabled('#admin-create-flashcard-btn') && (await p.innerText('[data-cards-chips]')).includes('Ninguém escolhido') && (await p.innerText('#admin-flashcard-destinations')).includes('Selecione ao menos um aluno'));
    L('5 tipos de cartão com descrição, Normal marcado', (await p.$$eval('[data-card-type]', l => l.length)) === 5 && (await p.isChecked('[data-card-type][value="normal"]')) && (await p.innerText('.p-tipos')).includes('Frente e verso'));
    L('editor de campos montado (sem campos ainda) e tags', !!(await p.$('#admin-flashcard-native-fields [data-field-add]')) && !!(await p.$('#admin-flashcard-tags [data-tags-input]')));

    // ---- escolher pessoas ----
    await abrirPicker();
    if (lang === 'fr'){
      L('2 idiomas: botões de idioma, Francês ativo, quem é do outro idioma escondido', (await p.$$eval('[data-lang-filter]', l => l.length)) === 2 && (await p.getAttribute('[data-lang-filter="frances"]', 'aria-pressed')) === 'true' && await p.$eval('[data-student-row][data-lang="mandarim"]', e => e.hidden));
    } else {
      L('1 idioma só: sem botões de idioma', (await p.$$eval('[data-lang-filter]', l => l.length)) === 0);
    }
    await p.fill('#admin-flashcard-search', 'rafa'); L('buscar pessoa esconde as outras', (await p.$$eval('[data-student-row]', l => l.filter(e => !e.hidden).length)) === 1);
    await p.fill('#admin-flashcard-search', '');
    await p.check('[data-student-checkbox][value="s1"]');
    await p.waitForSelector('[data-dest-select="s1"]'); await p.keyboard.press('Escape');
    L('uma pessoa: chip, resumo, botão ligado', (await p.innerText('[data-cards-chips]')).includes('Marina Alves') && (await p.innerText('[data-cards-resumo]')) === '1 pessoa' && !(await p.isDisabled('#admin-create-flashcard-btn')));
    const opts = await p.$$eval('[data-dest-select="s1"] option', o => o.map(x => x.textContent.trim()));
    L('destino: Deck padrão da Marina e o subdeck Verbos', opts.length === 2 && opts[0].includes('padrão') && opts[1] === 'Verbos', opts);
    await p.click('[data-dest-row="s1"] details > summary');
    await p.waitForSelector('[data-tree-row]');
    L('árvore de Decks com contagem de cartões (padrão 1, Verbos 1)', (await p.$$eval('[data-dest-row="s1"] [data-tree-row]', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()))).join('|').match(/padrão\) \(1 cartão\(ões\).*\|Verbos \(1 cartão/) !== null, await p.$$eval('[data-dest-row="s1"] [data-tree-row]', l => l.map(e => e.innerText)));
    L('Deck com cartão não pode ser apagado', await p.$$eval('[data-dest-row="s1"] [data-tree-delete]', l => l.every(b => b.disabled)));
    await abrirPicker(); await p.check('[data-student-checkbox][value="s2"]'); await p.waitForSelector('[data-dest-select="s2"]'); await p.keyboard.press('Escape');
    L('duas pessoas: 2 chips, botão no plural, 2 destinos', (await p.$$eval('[data-cards-chips] .p-chip', l => l.length)) === 2 && (await p.textContent('#admin-create-flashcard-btn')).includes('2 alunos') && (await p.$$eval('[data-dest-row]', l => l.length)) === 2);
    await p.click('[data-tirar-aluno="s2"]');
    L('X do chip tira a pessoa e o destino dela', (await p.$$eval('[data-cards-chips] .p-chip', l => l.length)) === 1 && (await p.$$eval('[data-dest-row]', l => l.length)) === 1 && !(await p.isChecked('[data-student-checkbox][value="s2"]')));

    // ---- tipo de cartão ----
    await p.click('.p-tipos label:has([value="multiple_choice"])'); await p.waitForTimeout(150);
    L('Múltipla escolha troca o editor de campos', (await p.innerText('#admin-flashcard-native-fields')).length > 0 && (await p.evaluate(() => ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode)) === 'multiple_choice');
    await p.click('.p-tipos label:has([value="normal"])'); await p.waitForTimeout(150);
    L('voltar a Normal', (await p.evaluate(() => ADMIN_FLASHCARDS_STATE.nativeCardState.cardGenerationMode)) === 'normal');

    // ---- criar: validação e envio ----
    await p.click('#admin-create-flashcard-btn');
    L('sem campos: mostra o erro de validação', (await p.textContent('#admin-create-flashcard-error')).trim().length > 0);
    const antes = (await cards()).length;
    L('sem campos: nada foi gravado', antes === 17, antes);
    await p.click('#admin-flashcard-native-fields [data-field-add]'); await p.click('#admin-flashcard-native-fields [data-field-add]');
    await p.locator('#admin-flashcard-native-fields [data-field-content]').nth(0).fill('le livre');
    await p.locator('#admin-flashcard-native-fields [data-field-content]').nth(1).fill('o livro');
    await p.fill('#admin-flashcard-tags [data-tags-input]', 'objetos'); await p.click('#admin-flashcard-tags [data-tags-add]');
    await p.fill('#admin-flashcard-note', 'ver imagem');
    await p.click('#admin-create-flashcard-btn'); await p.waitForFunction((n) => window.__cards.length === n + 1, antes);
    const novo = (await cards()).find(c => c.front === 'le livre');
    L('criou o cartão para a Marina no Deck padrão dela, com a tag', !!novo && novo.s === 's1' && novo.back === 'o livro' && novo.tags.includes('objetos') && novo.deck === (await p.evaluate(() => window.__decks.find(d => d.owner_id === 's1' && d.kind === 'teacher_root').id)), novo);
    await p.waitForFunction(() => document.querySelector('[data-cards-tabs]').textContent.includes('(17)'));
    L('a contagem da aba subiu para 17', (await p.textContent('[data-cards-tabs]')).includes('(17)'));
    L('formulário limpo: sem campos, sem nota, Normal marcado', (await p.$$eval('#admin-flashcard-native-fields [data-field-content]', l => l.length)) === 0 && (await p.inputValue('#admin-flashcard-note')) === '' && (await p.isChecked('[data-card-type][value="normal"]')));
    L('as pessoas escolhidas continuam (várias criações seguidas)', (await p.$$eval('[data-cards-chips] .p-chip', l => l.length)) === 1 && !(await p.isDisabled('#admin-create-flashcard-btn')));
    L('a árvore de Decks já conta o cartão novo (padrão 2)', (await p.innerText('[data-dest-row="s1"] [data-tree-list]')).includes('(2 cartão'));

    // ---- novo subdeck e criar para duas pessoas ----
    await p.fill('[data-dest-subname="s1"]', 'Revisão da semana'); await p.click('[data-dest-newsub="s1"]');
    await p.waitForFunction(() => [...document.querySelectorAll('[data-dest-select="s1"] option')].some(o => o.textContent.includes('Revisão da semana')));
    L('novo subdeck criado e já escolhido como destino', (await p.$eval('[data-dest-select="s1"]', e => e.selectedOptions[0].textContent.trim())) === 'Revisão da semana');
    L('subdeck vazio pode ser apagado', await p.$eval('[data-dest-row="s1"] [data-tree-row]:last-child [data-tree-delete]', b => !b.disabled));
    await abrirPicker(); await p.check('[data-student-checkbox][value="s2"]'); await p.waitForSelector('[data-dest-select="s2"]'); await p.keyboard.press('Escape');
    await p.click('#admin-flashcard-native-fields [data-field-add]'); await p.click('#admin-flashcard-native-fields [data-field-add]');
    await p.locator('#admin-flashcard-native-fields [data-field-content]').nth(0).fill('la fenêtre'); await p.locator('#admin-flashcard-native-fields [data-field-content]').nth(1).fill('a janela');
    const n2 = (await cards()).length;
    await p.click('#admin-create-flashcard-btn'); await p.waitForFunction((n) => window.__cards.length === n + 2, n2);
    const jan = (await cards()).filter(c => c.front === 'la fenêtre');
    L('criar para 2 pessoas grava 2 cartões, cada um no Deck escolhido para a pessoa', jan.length === 2 && jan.map(c => c.s).sort().join() === 's1,s2' && jan.find(c => c.s === 's1').deck === (await p.evaluate(() => window.__decks.find(d => d.name === 'Revisão da semana').id)), jan);
    // apagar o subdeck (ainda tem cartão: o botão fica desligado; usa um novo, vazio)
    await p.fill('[data-dest-subname="s1"]', 'Vazio'); await p.click('[data-dest-newsub="s1"]'); await p.waitForFunction(() => [...document.querySelectorAll('[data-dest-select="s1"] option')].some(o => o.textContent.trim() === 'Vazio'));
    await p.click('[data-dest-row="s1"] [data-tree-row]:last-child [data-tree-delete]');
    const cd = p.locator('dialog.p-dialogo--alerta[open]');
    L('apagar Deck: confirmação do painel com o nome', await cd.isVisible() && (await cd.innerText()).includes('Vazio'));
    await cd.locator('.p-perigo').click(); await p.waitForFunction(() => ![...document.querySelectorAll('[data-dest-select="s1"] option')].some(o => o.textContent.trim() === 'Vazio'));
    L('Deck apagado some do destino', true);
    if (OUT) await p.screenshot({ path: path.join(OUT, `cartoes-criar-${lang}-${scheme}.png`), fullPage: true });

    // ---- lista ----
    await p.click('[data-cards-tab="lista"]');
    const total = (await cards()).filter(c => c.st === 'active').length;
    L('lista: 10 por página e paginação com o total', (await linhas()).length === 10 && (await p.innerText('[data-cards-lista] .p-paginacao')).includes('Próxima') && (await p.innerText('[data-cards-lista]')).includes(`1 a 10 de ${total}`), await p.innerText('[data-cards-lista] .p-ferramentas'));
    await p.click('[data-pagina="2"]'); L('página 2 mostra o resto', (await linhas()).length === total - 10 && (await p.getAttribute('[data-pagina="2"]', 'aria-current')) === 'page');
    await p.click('.p-pag-ant'); L('Anterior volta à página 1', (await linhas()).length === 10);
    await p.selectOption('[data-cards-aluno]', 's4'); L('filtro Tiago: 12 cartões (2 páginas)', (await p.innerText('[data-cards-lista]')).includes('1 a 10 de 12'));
    await p.selectOption('[data-cards-aluno]', '');
    await p.click('[data-cards-busca]'); await p.keyboard.type('maison'); L('busca "maison": 1 cartão (sem refazer o campo)', (await linhas()).length === 1 && await p.evaluate(() => document.activeElement === document.querySelector('[data-cards-busca]')));
    await p.fill('[data-cards-busca]', 'verbos'); L('busca acha pela tag', (await linhas()).length === 2);
    await p.fill('[data-cards-busca]', 'zzz'); L('sem resultado: mensagem de filtro', (await p.textContent('[data-cards-lista]')).includes('Nenhum cartão com esses filtros.'));
    await p.fill('[data-cards-busca]', '');
    await p.selectOption('[data-cards-status]', 'archived'); L('arquivados: só "la porte"', (await linhas()).length === 1 && (await linhas())[0].includes('la porte'));
    await p.click('[data-card-row] summary'); L('arquivado tem Reativar', !!(await p.$('[data-toggle-flashcard]')));
    await p.click('[data-toggle-flashcard]'); await p.waitForFunction(() => window.__cards.find(c => c.front === 'la porte').status === 'active');
    await p.waitForFunction(() => !document.querySelector('[data-cards-lista] [data-card-row]')); L('reativado: some dos arquivados e vai para os ativos', (await p.textContent('[data-cards-tabs]')).includes(`(${total + 1})`));
    await p.selectOption('[data-cards-status]', 'active');

    // ---- ações: visualizar ----
    await p.fill('[data-cards-busca]', 'le chat');
    await p.click('[data-card-row] summary'); await p.click('[data-preview-flashcard]');
    L('Visualizar abre o preview do site', await p.isVisible('#flashcard-preview-modal'));
    await p.click('#flashcard-preview-modal-close'); L('preview fecha', !(await p.isVisible('#flashcard-preview-modal')));

    // ---- ações: editar (nativo) ----
    await p.click('[data-card-row] summary'); await p.click('[data-edit-flashcard]');
    const ed = p.locator('#dlg-editar-cartao');
    L('editar: janela com o editor de campos preenchido e o nome da pessoa', await ed.isVisible() && (await ed.innerText()).includes('Marina Alves') && (await p.locator('#edit-native-flashcard-fields [data-field-content]').nth(0).inputValue()) === 'le chat');
    L('editar: X no canto e botões lado a lado', await p.evaluate(() => { const x = document.querySelector('#dlg-editar-cartao header button'), a = document.getElementById('edit-native-flashcard-cancel').getBoundingClientRect(), b = document.getElementById('edit-native-flashcard-save').getBoundingClientRect(); return getComputedStyle(x).position === 'absolute' && Math.abs(a.top - b.top) < 4; }));
    await p.click('#edit-native-flashcard-preview-btn');
    L('Visualizar de dentro da janela de edição aparece POR CIMA dela', await p.isVisible('#flashcard-preview-modal') && await p.evaluate(() => { const m = document.getElementById('flashcard-preview-modal'); const r = m.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + 40); return m.contains(el); }));
    await p.click('#flashcard-preview-modal-close');
    await p.mouse.click(5, 5); L('clique no fundo NÃO fecha a janela de edição', await ed.isVisible());
    await p.locator('#edit-native-flashcard-fields [data-field-content]').nth(0).fill('le chat noir');
    await p.click('#edit-native-flashcard-save');
    const cr = p.locator('dialog.p-dialogo--alerta[open]');
    L('mudou o conteúdo: confirmação avisa que reinicia o progresso', await cr.isVisible() && (await cr.innerText()).includes('reinicia'));
    await cr.locator('button.secondary').click(); await p.waitForTimeout(200);
    L('cancelar a confirmação não grava e a janela continua aberta', (await cards()).find(c => c.front === 'le chat') !== undefined && await ed.isVisible());
    await p.click('#edit-native-flashcard-save'); await p.locator('dialog.p-dialogo--alerta[open] button:not(.secondary)').click();
    await p.waitForFunction(() => window.__cards.some(c => c.front === 'le chat noir'));
    L('confirmar grava, sobe a revisão (progresso reinicia) e fecha a janela', (await cards()).find(c => c.front === 'le chat noir').rev === 1 && !(await ed.isVisible().catch(() => false)));
    await p.waitForSelector('#dlg-editar-cartao', { state: 'detached' });
    L('a lista mostra o texto novo', (await linhas())[0].includes('le chat noir'));
    // editar sem mudar nada: sem confirmação
    await p.click('[data-card-row] summary'); await p.click('[data-edit-flashcard]'); await p.click('#edit-native-flashcard-save');
    L('salvar sem mudar nada não reinicia nem pergunta', !(await p.$('dialog.p-dialogo--alerta[open]')) && (await cards()).find(c => c.front === 'le chat noir').rev === 1);
    await p.waitForSelector('#dlg-editar-cartao', { state: 'detached' });
    // Esc descarta
    await p.click('[data-card-row] summary'); await p.click('[data-edit-flashcard]'); await p.locator('#edit-native-flashcard-fields [data-field-content]').nth(0).fill('descartar'); await p.keyboard.press('Escape');
    await p.waitForSelector('#dlg-editar-cartao', { state: 'detached' });
    L('Esc fecha e descarta o rascunho', (await cards()).some(c => c.front === 'le chat noir') && !(await cards()).some(c => c.front === 'descartar') && (await p.evaluate(() => ADMIN_FLASHCARDS_STATE.editingCardId)) === null);

    // ---- ações: editar cartão antigo (legado) ----
    await p.fill('[data-cards-busca]', 'maison'); await p.click('[data-card-row] summary'); await p.click('[data-edit-flashcard]');
    L('cartão antigo converte com segurança e abre no editor novo', await ed.isVisible() && (await p.locator('#edit-native-flashcard-fields [data-field-content]').nth(0).inputValue()) === 'la maison' && (await ed.innerText()).includes('Marina') === false);
    await p.keyboard.press('Escape'); await p.waitForSelector('#dlg-editar-cartao', { state: 'detached' });
    L('abrir o cartão antigo e fechar sem salvar não converte nada no banco', (await p.evaluate(() => window.__cards.find(c => c.front === 'la maison').fields)) === null);

    // ---- ações: mover ----
    await p.fill('[data-cards-busca]', 'le chat noir'); await p.click('[data-card-row] summary'); await p.click('[data-move-flashcard]');
    const md = p.locator('#dlg-mover-cartao');
    L('mover: janela com os outros Decks da Marina', await md.isVisible() && (await p.$$eval('#mover-cartao-deck option', o => o.map(x => x.textContent.trim()))).includes('Verbos'));
    await p.selectOption('#mover-cartao-deck', { label: 'Verbos' }); await p.click('#form-mover-cartao button[type=submit]');
    await p.waitForFunction(() => window.__cards.find(c => c.front === 'le chat noir').deck_id === window.__decks.find(d => d.name === 'Verbos').id);
    await p.waitForFunction(() => document.querySelector('[data-cards-lista] [data-card-row]').textContent.includes('Verbos'));
    await p.waitForSelector('#dlg-mover-cartao', { state: 'detached' }); L('mover: o cartão aparece no Deck novo e a janela fecha', true);
    L('cartão do aluno sem outros Decks não tem "Mover" no menu', await (async () => { await p.fill('[data-cards-busca]', 'la porte'); const n = (await linhas()).length; await p.fill('[data-cards-busca]', 'mot 1'); await p.click('[data-card-row] summary'); const mv = await p.$('[data-move-flashcard]'); await p.keyboard.press('Escape'); return n >= 0 && !mv; })());

    // ---- ações: apagar ----
    await p.fill('[data-cards-busca]', 'mot 12'); await p.click('[data-card-row] summary'); await p.click('[data-delete-flashcard]');
    const dl = p.locator('dialog.p-dialogo--alerta[open]');
    L('apagar: confirmação do painel (não o confirm do navegador)', await dl.isVisible() && (await dl.innerText()).includes('não dá para desfazer'));
    const nAntes = (await cards()).length;
    await dl.locator('button.secondary').click(); await p.waitForTimeout(150); L('cancelar não apaga', (await cards()).length === nAntes);
    await p.click('[data-card-row] summary'); await p.click('[data-delete-flashcard]'); await p.locator('dialog.p-dialogo--alerta[open] .p-perigo').click();
    await p.waitForFunction((n) => window.__cards.length === n - 1, nAntes);
    L('confirmar apaga o cartão e a lista atualiza', !(await cards()).some(c => c.front === 'mot 12'));
    await p.fill('[data-cards-busca]', '');

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchTeacherPanelSection('flashcards')); await p.waitForSelector('[data-tcc="pagina"]'); await p.waitForTimeout(300);
    await p.click('[data-cards-tab="lista"]'); await p.waitForTimeout(200);
    L('celular: lista sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    await p.click('[data-cards-tab="criar"]'); await p.waitForTimeout(200);
    L('celular: criar sem rolagem horizontal e com o resumo depois do conteúdo', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.p-lateral').getBoundingClientRect().top > document.querySelector('#admin-flashcard-native-fields').getBoundingClientRect().top), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    if (OUT) await p.screenshot({ path: path.join(OUT, `cartoes-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- sem alunos / sem cartões ----
  for (const lang of ['fr', 'zh']){
    const L = (n, c, x) => check(`[${lang}/vazios] ${n}`, c, x);
    let h = await abrirCartoes({ lang, scheme: 'light', alunos: [] });
    L('sem alunos: aviso e atalho para Alunos', (await h.page.textContent('[data-tcc="vazio"]')).includes('Nenhum aluno vinculado ainda') && !!(await h.page.$('[data-ir-secao="students"]')));
    await h.close();
    h = await abrirCartoes({ lang, scheme: 'light' });
    await h.page.evaluate(() => { window.__cards = []; switchTeacherPanelSection('students'); switchTeacherPanelSection('flashcards'); });
    await h.page.waitForFunction(() => document.querySelector('[data-cards-tabs]') && document.querySelector('[data-cards-tabs]').textContent.includes('(0)'));
    await h.page.click('[data-cards-tab="lista"]');
    L('sem cartões: estado vazio com atalho para criar', (await h.page.textContent('[data-cards-lista]')).includes('Nenhum cartão criado ainda') && !!(await h.page.$('[data-cards-lista] [data-cards-tab="criar"]')));
    await h.page.click('[data-cards-lista] [data-cards-tab="criar"]'); L('o atalho abre Criar cartão', await h.page.isVisible('[data-cards-pane="criar"]'));
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`painel-cartoes (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
