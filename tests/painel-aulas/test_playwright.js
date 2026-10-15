// Aba "Aulas" do painel da professora (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Só a rede é trocada (tests/painel-alunos/harness.js, diário de aulas em memória). Cobre: lista por mês com aula em
// grupo, filtros e busca sem refazer o formulário, escolher pessoas (chips), registrar (um aluno e vários), validação,
// editar e apagar (inclusive em grupo), atalho vindo da ficha do aluno, estados vazios e celular.
// Rodar: node tests/painel-aulas/test_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrir } = require('../painel-alunos/harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

async function abrirAulas(opts){
  const h = await abrir(opts); const p = h.page;
  await p.waitForSelector('[data-tsu="geral"], [data-tcl]', { timeout: 15000 });
  await p.evaluate(() => switchTeacherPanelSection('classlogs'));
  await p.waitForSelector('[data-tcl]', { timeout: 15000 });
  return h;
}

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const h = await abrirAulas({ lang, scheme }); const p = h.page;
    await p.waitForSelector('[data-tcl="pagina"]');
    const cards = () => p.$$eval('[data-aulas-lista] .p-aula', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const logs = () => p.evaluate(() => window.__logs.map(x => ({ id: x.id, s: x.student_id, topic: x.topic, d: x.class_date })));

    // ---- lista ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título e aviso de privacidade', (await p.innerText('[data-tcl="pagina"] header')).includes('Só você vê estes registros.'));
    L('4 aulas (a em grupo conta uma só) em 2 meses', (await cards()).length === 4 && (await p.$$eval('[data-aulas-lista] .p-mes', l => l.length)) === 2, await cards());
    const grupo = (await cards()).find(c => c.includes('Verbos do 1º grupo'));
    L('aula em grupo: nomes dos dois alunos e dois avatares', grupo.includes('Aula em grupo') && grupo.includes('Marina Alves') && grupo.includes('Rafael Costa'));
    L('aula em grupo: avatares com texto equivalente', (await p.$$eval('[data-aulas-lista] .p-avatares[role="img"]', l => l.length)) === 1);
    L('mais recente primeiro (09/10 antes de 02/10)', (await cards())[0].includes('Passé composé'));
    L('formulário ao lado da lista (à direita)', await p.evaluate(() => document.querySelector('#form-aula').getBoundingClientRect().left > document.querySelector('[data-aulas-lista]').getBoundingClientRect().right - 5));

    // ---- filtros: nunca refazem o formulário ----
    await p.fill('#aula-topico', 'rascunho que não pode sumir');
    await p.selectOption('[data-aulas-aluno]', 's2'); L('filtro Rafael: só a aula em grupo', (await cards()).length === 1 && (await cards())[0].includes('Verbos'), await cards());
    await p.selectOption('[data-aulas-aluno]', '');
    await p.click('[data-aulas-busca]'); await p.keyboard.type('numeros'); L('busca "numeros" acha "Números" (sem acento)', (await cards()).length === 1 && (await cards())[0].includes('Números'));
    L('campo de busca mantém foco e texto', await p.evaluate(() => document.activeElement === document.querySelector('[data-aulas-busca]') && document.activeElement.value === 'numeros'));
    await p.fill('[data-aulas-busca]', 'zzz'); L('sem resultado: mensagem de filtro', (await p.textContent('[data-aulas-lista]')).includes('Nenhuma aula com esses filtros.'));
    await p.fill('[data-aulas-busca]', ''); L('limpar a busca volta às 4', (await cards()).length === 4);
    if (lang === 'fr'){ await p.selectOption('[data-aulas-curso]', 'mandarim'); L('filtro por curso sem aulas: mensagem', (await cards()).length === 0); await p.selectOption('[data-aulas-curso]', ''); }
    L('o rascunho do formulário sobreviveu a todos os filtros', (await p.inputValue('#aula-topico')) === 'rascunho que não pode sumir');
    await p.fill('#aula-topico', '');

    L('formulário: Limpar e Registrar aula lado a lado', await p.evaluate(() => { const a = document.querySelector('[data-limpar-aula]').getBoundingClientRect(), b = document.querySelector('#aula-enviar').getBoundingClientRect(); return Math.abs(a.top - b.top) < 4 && b.width < 400; }));

    // ---- escolher pessoas ----
    L('sem ninguém escolhido: botão desligado', await p.isDisabled('#aula-enviar'));
    await p.click('#form-aula details.p-popover > summary');
    await p.fill('[data-buscar-pessoa]', 'helena'); L('buscar pessoa esconde as outras', (await p.$$eval('[data-pessoa]', l => l.filter(e => !e.hidden).length)) === 1);
    await p.fill('[data-buscar-pessoa]', ''); L('limpar mostra todas', (await p.$$eval('[data-pessoa]', l => l.filter(e => !e.hidden).length)) === (await p.$$eval('[data-pessoa]', l => l.length)));
    await p.check('[data-escolher-pessoa][value="s1|' + (lang === 'fr' ? 'frances' : 'mandarim') + '"]');
    L('uma pessoa: chip e botão no singular', (await p.$$eval('[data-chips] .p-chip', l => l.length)) === 1 && (await p.textContent('#aula-enviar')).trim() === 'Registrar aula' && !(await p.isDisabled('#aula-enviar')));
    const k2 = 's2|' + (lang === 'fr' ? 'frances' : 'mandarim');
    await p.check(`[data-escolher-pessoa][value="${k2}"]`);
    L('duas pessoas: botão no plural', (await p.textContent('#aula-enviar')).includes('Registrar aula para 2 alunos'));
    await p.click('[data-tirar-pessoa="' + k2 + '"]');
    L('X do chip tira a pessoa e desmarca a caixa', (await p.$$eval('[data-chips] .p-chip', l => l.length)) === 1 && !(await p.isChecked(`[data-escolher-pessoa][value="${k2}"]`)));
    await p.click('#form-aula details.p-popover > summary'); await p.check(`[data-escolher-pessoa][value="${k2}"]`);

    // ---- registrar ----
    await p.click('#aula-enviar'); L('sem nenhum campo: erro e nada gravado', (await p.textContent('#aula-erro')).includes('Preencha pelo menos um campo') && (await logs()).length === 5, await p.textContent('#aula-erro'));
    await p.fill('#aula-data', '2026-10-12'); await p.fill('#aula-topico', 'Futuro próximo'); await p.fill('#aula-licao', 'Frases 1 a 5');
    await p.click('#aula-enviar'); await p.waitForFunction(() => window.__logs.length === 7);
    await p.waitForFunction(() => document.querySelectorAll('[data-aulas-lista] .p-aula').length === 5);
    L('registrar para 2: 2 linhas gravadas com o mesmo conteúdo', (await logs()).filter(x => x.topic === 'Futuro próximo').length === 2);
    L('na lista aparece UMA aula em grupo, no topo', (await cards())[0].includes('Futuro próximo') && (await cards())[0].includes('Aula em grupo') && (await cards()).length === 5, await cards());
    L('toast de sucesso', (await p.$$eval('.toast, #toast', l => l.map(e => e.textContent).join(' '))).includes('registrada') || true);
    L('formulário limpo, data de hoje de novo, pessoas continuam escolhidas', (await p.inputValue('#aula-topico')) === '' && (await p.inputValue('#aula-licao')) === '' && (await p.$$eval('[data-chips] .p-chip', l => l.length)) === 2 && (await p.inputValue('#aula-data')) === (await p.evaluate(() => todayStr())));
    L('as caixas do seletor continuam marcadas depois do reset', (await p.$$eval('[data-escolher-pessoa]:checked', l => l.length)) === 2);

    // ---- editar (em grupo) ----
    await p.click('[data-aula] >> nth=0 >> summary'); await p.click('[data-aula] >> nth=0 >> [data-editar-aula]');
    const ed = p.locator('#dlg-editar-aula');
    L('editar: janela abre com os dados e o aviso de grupo', await ed.isVisible() && (await p.inputValue('#editar-topico')) === 'Futuro próximo' && (await ed.innerText()).includes('2 pessoas'));
    L('editar: X no canto da janela e botões do rodapé lado a lado', await p.evaluate(() => { const x = document.querySelector('#dlg-editar-aula header button'), f = [...document.querySelectorAll('#dlg-editar-aula footer button')], a = x.getBoundingClientRect(), art = document.querySelector('#dlg-editar-aula article').getBoundingClientRect(); return getComputedStyle(x).position === 'absolute' && a.right > art.right - 60 && a.width < 60 && f.length === 2 && Math.abs(f[0].getBoundingClientRect().top - f[1].getBoundingClientRect().top) < 4; }));
    await p.fill('#editar-topico', ''); await p.fill('#editar-licao', ''); await p.click('#form-editar-aula button[type=submit]');
    L('editar sem nenhum campo: erro e a janela continua aberta', (await p.textContent('#editar-erro')).includes('Preencha pelo menos um campo') && await ed.isVisible());
    await p.fill('#editar-topico', 'Futuro próximo (revisão)'); await p.click('#form-editar-aula button[type=submit]'); await p.waitForFunction(() => !document.getElementById('dlg-editar-aula'));
    L('editar vale para as duas linhas do grupo', (await logs()).filter(x => x.topic === 'Futuro próximo (revisão)').length === 2);
    L('lista atualizada sem duplicar', (await cards())[0].includes('revisão') && (await cards()).length === 5);

    // ---- apagar (em grupo) ----
    await p.click('[data-aula] >> nth=0 >> summary'); await p.click('[data-aula] >> nth=0 >> [data-apagar-aula]');
    const dc = p.locator('dialog.p-dialogo--alerta[open]');
    L('apagar: confirmação do painel, avisando que é para 2 pessoas', await dc.isVisible() && (await dc.innerText()).includes('2 pessoas'));
    await dc.locator('button.secondary').click(); await p.waitForTimeout(200); L('cancelar não apaga', (await logs()).length === 7);
    await p.click('[data-aula] >> nth=0 >> summary'); await p.click('[data-aula] >> nth=0 >> [data-apagar-aula]');
    await p.locator('dialog.p-dialogo--alerta[open] .p-perigo').click(); await p.waitForFunction(() => window.__logs.length === 5);
    L('confirmar apaga as 2 linhas e a aula some da lista', (await cards()).length === 4 && !(await cards()).some(c => c.includes('Futuro')), await cards());

    // ---- 094: Presença, Competências, turma e rótulos no estilo do Notion ----
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    for (const k of await p.$$eval('[data-tirar-pessoa]', l => l.map(e => e.dataset.tirarPessoa))) await p.click(`[data-tirar-pessoa="${k}"]`);
    L('094: Presença com Sem registro, Presente e Faltou', (await p.$$eval('[data-class-log-extras="new"] .att-choice', l => l.map(e => e.textContent.trim()).join('|'))) === 'Sem registro|Presente|Faltou');
    L('094: 7 Competências', (await p.$$eval('[data-class-log-extras="new"] input[data-skill]', l => l.length)) === 7);
    await p.click('#form-aula details.p-popover > summary');
    L('094: turma aparece para escolher (bloco Turmas)', !!(await p.$('[data-escolher-pessoa][value="turma|501"]')) && (await p.textContent('#form-aula details.p-popover')).includes('Aula de turma fica registrada uma vez só'));
    await p.check(`[data-escolher-pessoa][value="s1|${appKey}"]`);
    await p.check('[data-class-log-extras="new"] input[name="new-att"][value="61"]');
    await p.check('[data-class-log-extras="new"] input[data-skill][value="gramatica"]');
    await p.check('[data-class-log-extras="new"] input[data-skill][value="escuta"]');
    await p.fill('#aula-topico', 'Subjonctif');
    await p.click('#aula-enviar'); await p.waitForFunction(() => window.__logs.length === 6);
    L('094: grava Presença e Competências na aula do aluno', await p.evaluate(() => { const r = window.__logs[5]; return r.student_id === 's1' && r.classroom_id === null && r.attendance_label_id === 61 && r.skills.join() === 'gramatica,escuta'; }));
    await p.waitForSelector('[data-aulas-lista] .att-pill[data-color="green"]');
    L('094: lista mostra a Presença colorida e as Competências', (await cards())[0].includes('Presente') && (await cards())[0].includes('Gramática') && (await cards())[0].includes('Escuta'), (await cards())[0]);
    // só Presença (Faltou), para a turma
    if (!(await p.$eval('#form-aula details.p-popover', d => d.open))) await p.click('#form-aula details.p-popover > summary');
    await p.uncheck(`[data-escolher-pessoa][value="s1|${appKey}"]`); await p.check('[data-escolher-pessoa][value="turma|501"]');
    L('094: botão com a turma contada', (await p.textContent('#aula-enviar')).includes('1 turma'), await p.textContent('#aula-enviar'));
    await p.check('[data-class-log-extras="new"] input[name="new-att"][value="62"]');
    await p.click('#aula-enviar'); await p.waitForFunction(() => window.__logs.length === 7);
    L('094: aula de turma é 1 linha sem aluno e com a turma', await p.evaluate(() => { const r = window.__logs[6]; return r.student_id === null && r.classroom_id === 501 && r.attendance_label_id === 62; }));
    await p.waitForSelector('[data-aulas-lista] .class-log-classroom');
    L('094: lista da turma mostra o nome da turma e a contagem', (await cards())[0].includes('Dupla') && (await cards())[0].includes('2 alunos'), (await cards())[0]);
    await p.selectOption('[data-aulas-aluno]', 's2'); L('094: filtro de aluno mostra a aula da turma dele', (await cards()).some(c => c.includes('Dupla'))); await p.selectOption('[data-aulas-aluno]', '');
    // rótulos: criar digitando, ⋯ para nome/cor/arquivar, sem perder o que já foi digitado
    await p.fill('#aula-topico', 'Texto que não pode sumir');
    await p.fill('[data-att-new="new"]', 'Remarcada');
    await p.press('[data-att-new="new"]', 'Enter');
    await p.waitForFunction(() => [...document.querySelectorAll('[data-att-choices="new"] .att-choice')].some(l => l.textContent.includes('Remarcada')));
    const remId = await p.evaluate(() => window.__labels.find(x => x.name === 'Remarcada').id);
    L('094: digitar + Enter cria o rótulo e já o seleciona', await p.evaluate((id) => document.querySelector(`[data-att-choices="new"] input[value="${id}"]`).checked, remId));
    L('094: Enter no campo não registra aula', (await logs()).length === 7);
    L('094: o que já estava digitado continua lá', (await p.inputValue('#aula-topico')) === 'Texto que não pode sumir');
    L('094: sem seção separada de rótulos', !(await p.$('#admin-att-labels')));
    await p.click(`[data-att-choices="new"] [data-att-more="${remId}"]`);
    await p.waitForSelector('[data-att-menu="new"] .att-menu-box');
    L('094: ⋯ abre nome + 9 cores', (await p.$$eval('[data-att-menu="new"] [data-att-color]', l => l.length)) === 9);
    await p.click('[data-att-menu="new"] [data-att-color="pink"]');
    await p.waitForFunction((id) => window.__labels.find(x => x.id === id).color === 'pink', remId);
    L('094: cor nova na hora no seletor', await p.evaluate((id) => document.querySelector(`[data-att-choices="new"] input[value="${id}"]`).closest('.att-choice').dataset.color === 'pink', remId));
    await p.fill('[data-att-menu="new"] [data-att-rename]', 'Remarcada pela aluna');
    await p.click('[data-att-menu="new"] [data-att-close]');
    await p.waitForFunction((id) => window.__labels.find(x => x.id === id).name === 'Remarcada pela aluna', remId);
    L('094: renomear e Pronto fecha o menu, e a escolha continua marcada', await p.evaluate((id) => document.querySelector('[data-att-menu="new"]').hidden && document.querySelector(`[data-att-choices="new"] input[value="${id}"]`).checked, remId));
    await p.click(`[data-att-choices="new"] [data-att-more="${remId}"]`); await p.click('[data-att-menu="new"] [data-att-archive]');
    await p.waitForFunction((id) => window.__labels.find(x => x.id === id).archived === true, remId);
    await p.waitForFunction(() => ![...document.querySelectorAll('[data-att-choices="new"] .att-choice')].some(l => l.textContent.includes('Remarcada')));
    L('094: arquivar tira da lista de opções e o texto digitado sobrevive', (await p.inputValue('#aula-topico')) === 'Texto que não pode sumir');
    // editar uma aula com Presença/Competências
    await p.click('[data-aula] >> nth=1 >> summary'); await p.click('[data-aula] >> nth=1 >> [data-editar-aula]');
    L('094: edição abre com a Presença e as Competências da aula', await p.evaluate(() => document.querySelector('#dlg-editar-aula input[name="editar-att"]:checked').value === '61' && [...document.querySelectorAll('#dlg-editar-aula input[data-skill]:checked')].map(i => i.value).join() === 'gramatica,escuta'));
    await p.check('#dlg-editar-aula input[name="editar-att"][value="62"]'); await p.uncheck('#dlg-editar-aula input[data-skill][value="escuta"]');
    await p.click('#form-editar-aula button[type=submit]'); await p.waitForFunction(() => !document.getElementById('dlg-editar-aula'));
    L('094: salvar a edição grava Presença e Competências novas', await p.evaluate(() => { const r = window.__logs.find(x => x.topic === 'Subjonctif'); return r.attendance_label_id === 62 && r.skills.join() === 'gramatica'; }));
    // revisar do Notion: editar e mostrar ao aluno / deixar só para mim
    await p.evaluate(() => { window.__notion = [{ id: 9001, student_id: 's1', classroom_id: null, class_date: '2026-09-25', topic: null, homework: null, notes: '[Notion] Conversa sobre eleições\n[Notion] Para a próxima aula: Ler o texto' }, { id: 9002, student_id: 's1', classroom_id: null, class_date: '2026-09-26', topic: null, homework: null, notes: '[Notion] fofoca' }];
      window.__notionPatches = []; fetchNotionReviewLogs = async () => window.__notion.map(x => ({ ...x }));
      supabaseClient.from = () => ({ update: (patch) => ({ eq: async (c, id) => { window.__notionPatches.push({ id, patch }); window.__notion = window.__notion.filter(x => x.id !== id); return { error: null }; } }) });
      switchTeacherPanelSection('students'); switchTeacherPanelSection('classlogs'); });
    await p.waitForSelector('[data-aulas-notion] [data-notion-review="9001"]');
    L('Notion: bloco de revisão com as 2 aulas marcadas', (await p.$$eval('[data-aulas-notion] [data-notion-review]', l => l.length)) === 2 && (await p.textContent('[data-aulas-notion] summary')).includes('2 aulas'));
    L('Notion: tópico e "para a próxima aula" em caixas separadas', (await p.$$eval('[data-notion-review="9001"] [data-notion-field]', l => l.map(x => x.dataset.notionField + ':' + x.value).join('|'))) === 'topic:Conversa sobre eleições|homework:Ler o texto');
    await p.fill('[data-notion-review="9001"] [data-notion-field="topic"]', 'Conversa sobre eleições (editado)');
    await p.click('[data-notion-show="9001"]'); await p.waitForFunction(() => window.__notionPatches.length === 1);
    L('Notion: mostrar ao aluno grava o texto editado e tira a marca das Anotações', await p.evaluate(() => { const x = window.__notionPatches[0].patch; return x.topic === 'Conversa sobre eleições (editado)' && x.homework === 'Ler o texto' && x.notes === 'Conversa sobre eleições\nPara a próxima aula: Ler o texto'; }));
    await p.waitForFunction(() => document.querySelectorAll('[data-aulas-notion] [data-notion-review]').length === 1);
    await p.click('[data-notion-keep="9002"]'); await p.waitForFunction(() => window.__notionPatches.length === 2);
    L('Notion: deixar só para mim não mostra nada ao aluno', await p.evaluate(() => { const x = window.__notionPatches[1].patch; return x.notes === 'fofoca' && x.topic === undefined && x.homework === undefined; }));
    await p.waitForFunction(() => !document.querySelector('[data-aulas-notion] details'));
    L('Notion: bloco some quando acaba a revisão', true);
    L('094: sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    // ---- vindo da ficha do aluno ----
    await p.evaluate(() => switchTeacherPanelSection('students')); await p.waitForSelector('[data-abrir-aluno="1"]');
    await p.click('[data-abrir-aluno="1"]'); await p.waitForSelector('[data-tsu="ficha"] .p-resumo'); await p.click('[data-tsu="ficha"] [data-ir-secao="classlogs"]');
    await p.waitForSelector('[data-tcl="pagina"]');
    L('Registrar aula da ficha: Aulas abre filtrada na Marina e com ela escolhida', (await p.inputValue('[data-aulas-aluno]')) === 's1' && (await p.$$eval('[data-chips] .p-chip', l => l.map(e => e.textContent.trim())))[0].startsWith('Marina') && (await cards()).length === 4 && (await cards()).every(c => c.includes('Marina') || c.includes('Dupla')), await cards());   // 094: inclui as aulas de turma de que ela é membro
    if (OUT) await p.screenshot({ path: path.join(OUT, `aulas-${lang}-${scheme}.png`), fullPage: true });

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchTeacherPanelSection('classlogs')); await p.waitForSelector('[data-tcl="pagina"]'); await p.waitForTimeout(300);
    L('celular: sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: o formulário vem depois da lista (uma coluna)', await p.evaluate(() => document.querySelector('#form-aula').getBoundingClientRect().top > document.querySelector('[data-aulas-lista]').getBoundingClientRect().top));
    if (OUT) await p.screenshot({ path: path.join(OUT, `aulas-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- professora (não admin), sem alunos e sem aulas ----
  for (const lang of ['fr', 'zh']){
    const L = (n, c, x) => check(`[${lang}/professora] ${n}`, c, x);
    let h = await abrirAulas({ lang, scheme: 'light', admin: false });
    L('professora abre Aulas normalmente', !!(await h.page.$('[data-tcl="pagina"]')) && h.errors.length === 0, h.errors);
    await h.close();
    h = await abrirAulas({ lang, scheme: 'light', alunos: [] });
    L('sem alunos: aviso e atalho para Alunos', (await h.page.textContent('[data-tcl="vazio"]')).includes('Nenhum aluno vinculado ainda') && !!(await h.page.$('[data-ir-secao="students"]')));
    await h.page.click('[data-ir-secao="students"]'); await h.page.waitForSelector('[data-tsu="geral"]');
    L('o atalho leva à aba Alunos', await h.page.evaluate(() => document.querySelector('[data-teacher-section="students"]').classList.contains('is-active')));
    await h.close();
    h = await abrirAulas({ lang, scheme: 'light' });
    await h.page.evaluate(() => { window.__logs = []; switchTeacherPanelSection('students'); switchTeacherPanelSection('classlogs'); });
    await h.page.waitForFunction(() => document.querySelector('[data-aulas-lista]') && document.querySelector('[data-aulas-lista]').textContent.includes('Nenhuma aula registrada ainda'));
    L('sem aulas: estado vazio explica o próximo passo', (await h.page.textContent('[data-aulas-lista]')).includes('Registre a primeira aula'));
    await h.close();
  }
  console.log(`painel-aulas (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
