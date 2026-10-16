// Aba "Material de apoio" do painel da professora (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Só a rede é trocada (tests/painel-alunos/harness.js, materiais em memória). Cobre: lista por mês com envio em grupo, link e
// arquivo, filtros e busca sem refazer o formulário, escolher pessoas (chips), enviar (um aluno, vários, com arquivo), validação
// (título, conteúdo, link sem http), editar e apagar (inclusive em grupo), link perigoso nunca vira href, vista da aluna,
// estados vazios e celular.
// Rodar: node tests/painel-materiais/test_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path'), fs = require('fs'), os = require('os');
const ENORME = path.join(os.tmpdir(), 'painel-materiais-enorme.zip');   // 51 MB esparso, só para o limite de tamanho
const { abrir } = require('../painel-alunos/harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

async function abrirMateriais(opts){
  const h = await abrir(opts); const p = h.page;
  await p.waitForSelector('[data-tsu="geral"], [data-tmt]', { timeout: 15000 });
  await p.evaluate(() => switchTeacherPanelSection('materials'));
  await p.waitForSelector('[data-tmt]', { timeout: 15000 });
  return h;
}

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const key = lang === 'fr' ? 'frances' : 'mandarim';
    const h = await abrirMateriais({ lang, scheme }); const p = h.page;
    await p.waitForSelector('[data-tmt="pagina"]');
    const cards = () => p.$$eval('[data-materiais-lista] .p-aula', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const rows = () => p.evaluate(() => window.__mats.map(x => ({ id: x.id, s: x.student_id, title: x.title, link: x.link_url, file: x.file_url })));
    const abrirPicker = async () => { if (!(await p.evaluate(() => document.querySelector('#form-material details.p-popover').open))) await p.click('#form-material details.p-popover > summary'); };
    const marcar = async (k) => { await abrirPicker(); await p.check(`[data-escolher-pessoa][value="${k}"]`); };

    // ---- lista ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título e subtítulo', (await p.innerText('[data-tmt="pagina"] header')).includes('Material de apoio') && (await p.innerText('[data-tmt="pagina"] header')).includes('Cada aluno vê só o que foi enviado para ele.'));
    L('3 materiais (o enviado a dois conta um só) em 2 meses', (await cards()).length === 3 && (await p.$$eval('[data-materiais-lista] .p-mes', l => l.length)) === 2, await cards());
    L('mais recente primeiro', (await cards())[0].includes('Resumo do passé composé'));
    const grupo = (await cards()).find(c => c.includes('Lista de vocabulário'));
    L('envio em grupo: nomes dos dois alunos e avatares com texto equivalente', grupo.includes('Marina Alves') && grupo.includes('Rafael Costa') && (await p.$$eval('[data-materiais-lista] .p-avatares[role="img"]', l => l.length)) === 1, grupo);
    const lk = await p.$eval('[data-material="1"] a[href^="https://exemplo.com"]', a => ({ t: a.textContent, b: a.target, r: a.rel }));
    L('link: selo com o endereço, abre em outra aba sem vazar a origem', lk.t.includes('exemplo.com') && lk.b === '_blank' && lk.r.includes('noopener') && lk.r.includes('noreferrer'), lk);
    L('arquivo: selo com o nome do arquivo', (await p.textContent('[data-material="2"] .p-material-anexos')).includes('vocab.pdf'));
    L('descrição mantém as quebras de linha', await p.$eval('[data-material="1"] .p-material-texto', e => getComputedStyle(e).whiteSpace === 'pre-wrap' && e.textContent.includes('\n')));
    L('formulário ao lado da lista (à direita)', await p.evaluate(() => document.querySelector('#form-material').getBoundingClientRect().left > document.querySelector('[data-materiais-lista]').getBoundingClientRect().left + 200));

    // ---- filtros: nunca refazem o formulário ----
    await p.fill('#material-titulo', 'rascunho que não pode sumir');
    await p.selectOption('[data-materiais-aluno]', 's2'); L('filtro Rafael: só o envio em grupo', (await cards()).length === 1 && (await cards())[0].includes('Lista de vocabulário'), await cards());
    await p.selectOption('[data-materiais-aluno]', '');
    await p.click('[data-materiais-busca]'); await p.keyboard.type('vocabulario'); L('busca sem acento acha "vocabulário"', (await cards()).length === 1);
    L('campo de busca mantém foco e texto', await p.evaluate(() => document.activeElement === document.querySelector('[data-materiais-busca]') && document.activeElement.value === 'vocabulario'));
    await p.fill('[data-materiais-busca]', 'zzz'); L('sem resultado: mensagem de filtro', (await p.textContent('[data-materiais-lista]')).includes('Nenhum material com esses filtros.'));
    await p.fill('[data-materiais-busca]', 'vocab.pdf'); L('busca acha pelo nome do arquivo', (await cards()).length === 1);
    await p.fill('[data-materiais-busca]', ''); L('limpar a busca volta aos 3', (await cards()).length === 3);
    if (lang === 'fr'){ await p.selectOption('[data-materiais-curso]', 'mandarim'); L('filtro por curso sem materiais: mensagem', (await cards()).length === 0); await p.selectOption('[data-materiais-curso]', ''); }
    L('o rascunho do formulário sobreviveu a todos os filtros', (await p.inputValue('#material-titulo')) === 'rascunho que não pode sumir');
    await p.fill('#material-titulo', '');
    L('formulário: Limpar e Enviar material lado a lado', await p.evaluate(() => { const a = document.querySelector('[data-limpar-material]').getBoundingClientRect(), b = document.querySelector('#material-enviar').getBoundingClientRect(); return Math.abs(a.top - b.top) < 4 && a.right <= b.left; }));

    // ---- escolher pessoas ----
    L('sem ninguém escolhido: botão desligado e chips explicam', await p.isDisabled('#material-enviar') && (await p.innerText('#form-material [data-chips]')).includes('Ninguém escolhido'));
    await abrirPicker();
    await p.fill('[data-buscar-pessoa]', 'helena'); L('buscar pessoa esconde as outras', (await p.$$eval('[data-pessoa]', l => l.filter(e => !e.hidden).length)) === 1);
    await p.fill('[data-buscar-pessoa]', ''); L('limpar mostra todas', (await p.$$eval('[data-pessoa]', l => l.filter(e => !e.hidden).length)) === (await p.$$eval('[data-pessoa]', l => l.length)));
    await p.check(`[data-escolher-pessoa][value="s1|${key}"]`);
    L('uma pessoa: chip e botão no singular', (await p.$$eval('#form-material [data-chips] .p-chip', l => l.length)) === 1 && (await p.textContent('#material-enviar')).trim() === 'Enviar material' && !(await p.isDisabled('#material-enviar')));
    await p.check(`[data-escolher-pessoa][value="s2|${key}"]`);
    L('duas pessoas: botão no plural', (await p.textContent('#material-enviar')).includes('2 alunos'));
    await p.keyboard.press('Escape');
    await p.click(`[data-tirar-pessoa="s2|${key}"]`);
    L('X do chip tira a pessoa e a caixa dela', (await p.$$eval('#form-material [data-chips] .p-chip', l => l.length)) === 1 && !(await p.isChecked(`[data-escolher-pessoa][value="s2|${key}"]`)));
    await p.click(`[data-tirar-pessoa="s1|${key}"]`);
    L('sem ninguém de novo: botão desligado', await p.isDisabled('#material-enviar'));

    // ---- validação ----
    await marcar(`s1|${key}`); await p.keyboard.press('Escape');
    const antes = (await rows()).length;
    await p.click('#material-enviar'); L('sem título: erro', (await p.textContent('#material-erro')).includes('título'));
    await p.fill('#material-titulo', 'Só título'); await p.click('#material-enviar'); L('só título: pede descrição, link ou arquivo', (await p.textContent('#material-erro')).includes('descrição'));
    await p.fill('#material-link', 'javascript:alert(1)'); await p.click('#material-enviar'); L('link sem http: erro', (await p.textContent('#material-erro')).includes('http'));
    L('nada foi gravado por erro de validação', (await rows()).length === antes && (await p.evaluate(() => window.__matUploads.length)) === 0);

    // ---- enviar para uma pessoa (com link) ----
    await p.fill('#material-link', 'https://exemplo.com/novo'); await p.fill('#material-desc', 'Veja antes da aula');
    await p.click('#material-enviar');
    await p.waitForFunction(n => window.__mats.length === n + 1, antes);
    L('enviado para uma pessoa: 1 linha nova com link e descrição', (await rows()).slice(-1)[0].title === 'Só título' && (await rows()).slice(-1)[0].link === 'https://exemplo.com/novo');
    await p.waitForFunction(() => document.querySelectorAll('[data-materiais-lista] .p-aula').length === 4);
    L('lista atualiza sozinha e o novo vem primeiro', (await cards())[0].includes('Só título'));
    L('formulário limpo, mas a pessoa continua escolhida', (await p.inputValue('#material-titulo')) === '' && (await p.$$eval('#form-material [data-chips] .p-chip', l => l.length)) === 1 && !(await p.isDisabled('#material-enviar')));

    // ---- enviar para duas pessoas com arquivo ----
    await marcar(`s2|${key}`); await p.keyboard.press('Escape');
    await p.fill('#material-titulo', 'Gabarito <b>lição 3</b>');
    await p.setInputFiles('#material-arquivo', { name: 'gabarito.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(3 * 1024 * 1024) });
    L('arquivo escolhido aparece como anexo com nome e tamanho, e o campo some', (await p.innerText('[data-material-anexo]')).includes('gabarito.pdf') && (await p.innerText('[data-material-anexo]')).includes('3,0 MB') && await p.$eval('[data-material-arquivo]', e => e.hidden));
    await p.click('[data-material-anexo] .p-anexo-remover'); await p.waitForFunction(() => !document.querySelector('[data-material-anexo] .p-anexo'));
    L('X do anexo tira o arquivo e devolve o campo', !(await p.$eval('[data-material-arquivo]', e => e.hidden)) && (await p.$eval('#material-arquivo', e => e.files.length)) === 0);
    { const fd = fs.openSync(ENORME, 'w'); fs.ftruncateSync(fd, 51 * 1024 * 1024); fs.closeSync(fd); }
    await p.setInputFiles('#material-arquivo', ENORME);
    L('arquivo acima de 50 MB é recusado com aviso', (await p.textContent('#material-erro')).includes('50 MB') && (await p.$eval('#material-arquivo', e => e.files.length)) === 0);
    await p.setInputFiles('#material-arquivo', { name: 'gabarito.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(1024) });
    const n2 = (await rows()).length;
    await p.click('#material-enviar'); await p.waitForFunction(n => window.__mats.length === n + 2, n2);
    const novos = (await rows()).slice(-2);
    L('duas linhas com o mesmo arquivo, e o arquivo subiu uma vez só', novos[0].file === novos[1].file && novos[0].file.includes('gabarito.pdf') && (await p.evaluate(() => window.__matUploads.length)) === 1 && new Set(novos.map(x => x.s)).size === 2, novos);
    await p.waitForFunction(() => document.querySelectorAll('[data-materiais-lista] .p-aula').length === 5);
    const novoCard = (await cards())[0];
    L('na lista vira UM material com os dois nomes; título com HTML aparece como texto', novoCard.includes('Gabarito <b>lição 3</b>') && novoCard.includes('Marina Alves') && novoCard.includes('Rafael Costa') && (await p.$$eval('[data-materiais-lista] b', l => l.filter(b => b.textContent === 'lição 3').length)) === 0, novoCard);
    L('depois de enviar o campo de arquivo volta', !(await p.$eval('[data-material-arquivo]', e => e.hidden)) && (await p.$$eval('[data-material-anexo] .p-anexo', l => l.length)) === 0);

    // ---- editar (grupo) ----
    await p.click('[data-material] summary >> nth=0'); await p.click('[data-editar-material]');
    const dlg = p.locator('#dlg-editar-material');
    L('editar: janela com aviso de que vale para as duas pessoas e o arquivo fica', await dlg.isVisible() && (await dlg.innerText()).includes('2 pessoas') && (await dlg.innerText()).includes('gabarito.pdf'));
    await p.fill('#editar-titulo', ''); await p.click('#form-editar-material button[type=submit]'); L('editar: título vazio dá erro e a janela fica', (await p.textContent('#editar-erro')).includes('título') && await dlg.isVisible());
    await p.fill('#editar-titulo', 'Gabarito da lição 3'); await p.fill('#editar-link', 'ftp://x'); await p.click('#form-editar-material button[type=submit]'); L('editar: link sem http dá erro', (await p.textContent('#editar-erro')).includes('http'));
    await p.fill('#editar-link', 'https://exemplo.com/gabarito');
    await p.click('#form-editar-material button[type=submit]'); await p.waitForSelector('#dlg-editar-material', { state: 'detached' });
    L('editar: as duas linhas mudaram e a lista atualizou', (await rows()).filter(x => x.title === 'Gabarito da lição 3' && x.link === 'https://exemplo.com/gabarito').length === 2 && (await cards())[0].includes('Gabarito da lição 3'));
    await p.click('[data-material] summary >> nth=0'); await p.click('[data-editar-material]'); await p.click('#dlg-editar-material [data-fechar-dialogo] >> nth=1'); await p.waitForSelector('#dlg-editar-material', { state: 'detached' });
    L('editar: cancelar não muda nada', (await rows()).filter(x => x.title === 'Gabarito da lição 3').length === 2);

    // ---- apagar (grupo) ----
    const n3 = (await rows()).length;
    await p.click('[data-material] summary >> nth=0'); await p.click('[data-apagar-material]');
    const cd = p.locator('dialog.p-dialogo--alerta[open]');
    L('apagar: confirmação do painel avisa que vale para as duas pessoas', await cd.isVisible() && (await cd.innerText()).includes('2 pessoas'));
    await cd.locator('.p-perigo').click(); await p.waitForFunction(n => window.__mats.length === n - 2, n3);
    L('apagar: as duas linhas somem e a lista atualiza', (await cards()).length === 4);
    await p.click('[data-material] summary >> nth=0'); await p.click('[data-apagar-material]'); await p.locator('dialog.p-dialogo--alerta[open] button:not(.p-perigo)').click();
    L('apagar: cancelar mantém tudo', (await rows()).length === n3 - 2);

    // ---- link perigoso vindo do banco nunca vira href ----
    await p.evaluate((k) => { window.__mats.push({ id: 900, teacher_id: 'T', student_id: 's1', language_app_key: k, title: 'Perigoso', description: null, link_url: 'javascript:alert(1)', file_url: 'data:text/html,x', file_name: 'x', created_at: new Date().toISOString() }); switchTeacherPanelSection('students'); switchTeacherPanelSection('materials'); }, key);
    await p.waitForSelector('[data-material="900"]');
    L('link javascript: e arquivo data: não viram href', (await p.$$eval('[data-material="900"] a', l => l.length)) === 0);
    L('vista da aluna também não abre link perigoso', await p.evaluate(async () => {
      fetchSupportMaterialsForCurrentStudent = async () => [{ id: 1, title: 'x', description: null, link_url: 'javascript:alert(1)', file_url: null, created_at: new Date().toISOString() }];
      const d = document.createElement('div'); d.id = 'support-materials-content'; document.body.appendChild(d); await renderSupportMaterialsView(); const ok = !d.querySelector('a[href^="javascript"]'); d.remove(); return ok; }));
    if (OUT) await p.screenshot({ path: path.join(OUT, `materiais-${lang}-${scheme}.png`), fullPage: true });

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchTeacherPanelSection('materials')); await p.waitForSelector('[data-tmt="pagina"]'); await p.waitForTimeout(300);
    L('celular: sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: o formulário vem depois da lista (uma coluna)', await p.evaluate(() => document.querySelector('#form-material').getBoundingClientRect().top > document.querySelector('[data-materiais-lista]').getBoundingClientRect().top));
    if (OUT) await p.screenshot({ path: path.join(OUT, `materiais-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- professora (não admin), sem alunos e sem materiais ----
  for (const lang of ['fr', 'zh']){
    const L = (n, c, x) => check(`[${lang}/professora] ${n}`, c, x);
    let h = await abrirMateriais({ lang, scheme: 'light', admin: false });
    L('professora abre Material de apoio normalmente', !!(await h.page.$('[data-tmt="pagina"]')) && h.errors.length === 0, h.errors);
    await h.close();
    h = await abrirMateriais({ lang, scheme: 'light', alunos: [] });
    L('sem alunos: aviso e atalho para Alunos', (await h.page.textContent('[data-tmt="vazio"]')).includes('Nenhum aluno vinculado ainda') && !!(await h.page.$('[data-ir-secao="students"]')));
    await h.page.click('[data-ir-secao="students"]'); await h.page.waitForSelector('[data-tsu="geral"]');
    L('o atalho leva à aba Alunos', await h.page.evaluate(() => document.querySelector('[data-teacher-section="students"]').classList.contains('is-active')));
    await h.close();
    h = await abrirMateriais({ lang, scheme: 'light' });
    await h.page.evaluate(() => { window.__mats = []; switchTeacherPanelSection('students'); switchTeacherPanelSection('materials'); });
    await h.page.waitForFunction(() => document.querySelector('[data-materiais-lista]') && document.querySelector('[data-materiais-lista]').textContent.includes('Nenhum material enviado ainda'));
    L('sem materiais: estado vazio explica o próximo passo', (await h.page.textContent('[data-materiais-lista]')).includes('Envie o primeiro material'));
    await h.close();
  }
  try { fs.unlinkSync(ENORME); } catch (e) {}
  console.log(`painel-materiais (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
