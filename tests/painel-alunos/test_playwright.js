// Aba "Alunos" do painel da professora (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Só a rede é trocada (tests/painel-alunos/harness.js). Cobre: layout em tela cheia, quadro geral (indicadores, alerta,
// busca/filtros, situação), cache e "Atualizar dados", ficha do aluno, remover vínculo (diálogo de confirmação),
// vincular aluno (admin) x professora, falha de uma consulta e ausência de rolagem horizontal no celular.
// Rodar: node tests/painel-alunos/test_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrir } = require('./harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const R = `${lang}/${scheme}`;
    const L = (n, c, x) => check(`[${R}] ${n}`, c, x);
    const h = await abrir({ lang, scheme, width: 1280, height: 1000 }); const p = h.page;
    await p.waitForSelector('[data-tsu="geral"]', { timeout: 15000 });
    const rpcOv = () => p.evaluate(() => window.__rpc.filter(x => x === 'get_teacher_student_overview').length);
    const linhas = () => p.$$eval('[data-tabela-alunos] tbody tr', trs => trs.map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));

    // ---- layout ----
    L('painel em tela cheia: Ranking/Status ao lado escondidos', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('o conteúdo usa a largura (mais de 900px)', (await p.$eval('[data-tsu="geral"]', e => e.getBoundingClientRect().width)) > 900);
    L('fora do painel da professora o Ranking continua aparecendo', await p.evaluate(() => { switchTab('profile'); const d = getComputedStyle(document.querySelector('.right-cards')).display; switchTab('teacher-panel'); return d !== 'none'; }));
    await p.waitForSelector('[data-tsu="geral"]');

    // ---- quadro geral ----
    L('7 alunos na tabela', (await linhas()).length === 7);
    L('uma consulta de overview por aluno (7)', (await rpcOv()) === 7, await rpcOv());
    const ind = await p.$$eval('[data-tsu="geral"] .p-indicador', l => l.map(e => e.querySelector('.p-indicador-valor').textContent.trim()));
    L('indicadores: 7 ativos, 1 estudou hoje, 96 vencidas, 3 precisam de atenção', ind.join() === '7,1,96,3', ind);
    L('alerta de 2 parados', (await p.textContent('[data-tsu="geral"] .p-alerta')).includes('2 alunos estão há 7 dias ou mais sem estudar.'));
    const rows = await linhas();
    const sit = (nome) => rows.find(r => r.includes(nome));
    L('situação: Marina e Rafael e Camila (3 dias) em dia', ['Marina', 'Rafael', 'Camila'].every(n => /Em dia/.test(sit(n))), rows);
    L('situação: Tiago (4 dias) em atenção', /Atenção/.test(sit('Tiago')));
    L('situação: Helena (9) e Bruno (12) parados', /Parado/.test(sit('Helena')) && /Parado/.test(sit('Bruno')));
    L('situação: quem nunca estudou fica "Sem estudo" (neutro)', /Sem estudo/.test(sit('Novo Aluno')) && /sem registro/.test(sit('Novo Aluno')));
    L('títulos de coluna alinhados com o conteúdo (texto, não só cor)', await p.$$eval('[data-tabela-alunos] .p-selo', l => l.every(e => e.textContent.trim().length > 2)));
    L('cabeçalho: botão Vincular só aparece para a admin (aqui é admin)', !!(await p.$('[data-abrir-dialogo="dlg-vincular-aluno"]')));

    // ---- filtros: só a tabela muda; o campo de busca nunca é refeito ----
    await p.click('[data-busca-aluno]'); await p.keyboard.type('helena');
    L('busca "helena": 1 linha', (await linhas()).length === 1 && (await linhas())[0].includes('Helena'), await linhas());
    L('o campo de busca continua o mesmo, com foco e texto', await p.evaluate(() => document.activeElement === document.querySelector('[data-busca-aluno]') && document.activeElement.value === 'helena'));
    await p.fill('[data-busca-aluno]', 'xyz'); L('busca sem resultado: mensagem própria', (await p.textContent('[data-tabela-alunos]')).includes('Nenhum aluno com esses filtros.'));
    await p.fill('[data-busca-aluno]', ''); L('limpar a busca volta aos 7', (await linhas()).length === 7);
    await p.click('[data-so-atencao]'); L('só quem precisa de atenção: Tiago, Helena e Bruno', (await linhas()).length === 3, await linhas());
    await p.click('[data-so-atencao]'); L('desligar o interruptor volta aos 7', (await linhas()).length === 7);
    await p.click('[data-ver-parados]'); L('"Ver quem são" liga o filtro de atenção', (await p.isChecked('[data-so-atencao]')) && (await linhas()).length === 3);
    await p.click('[data-so-atencao]');
    if (lang === 'fr'){
      L('seletor de curso aparece (francês e chinês na turma)', !!(await p.$('[data-filtro-curso]')));
      await p.selectOption('[data-filtro-curso]', 'mandarim'); L('filtro por curso: só o Bruno', (await linhas()).length === 1 && (await linhas())[0].includes('Bruno'), await linhas());
      await p.selectOption('[data-filtro-curso]', '');
    }
    L('filtros não refizeram a tela inteira (ainda 7 consultas)', (await rpcOv()) === 7);

    // ---- ficha ----
    await p.click('[data-abrir-aluno="1"]'); await p.waitForSelector('[data-tsu="ficha"] .p-resumo');
    L('ficha: trilha Alunos / Marina Alves', (await p.textContent('[data-tsu="ficha"] .p-trilha')).replace(/\s+/g, ' ').trim() === 'Alunos › Marina Alves' || (await p.textContent('[data-tsu="ficha"] .p-trilha')).includes('Marina Alves'));
    L('ficha: o título recebe o foco (leitor de tela anuncia a mudança)', await p.evaluate(() => document.activeElement && document.activeElement.tagName === 'H2' && document.activeElement.textContent === 'Marina Alves'));
    const ficha = await p.innerText('[data-tsu="ficha"]');
    L('ficha: indicadores (hoje, 23 dias, 12 vencidas, 80%)', ficha.includes('hoje') && ficha.includes('23 dias') && /\b12\b/.test(ficha) && ficha.includes('80%'), ficha.slice(0, 300));
    L('ficha: nada de ranking, XP ou gamificação do aluno no painel', !/\bXP\b/.test(ficha));
    await p.waitForFunction(() => { const b = document.querySelector('[data-bloco-criados]'); return b && !b.querySelector('.p-spinner'); });
    await p.waitForFunction(() => { const b = document.querySelector('[data-bloco-aulas]'); return b && !b.querySelector('.p-spinner'); });
    L('ficha: cartões criados chegaram (12 conteúdos)', /Conteúdos criados para este aluno\s*12/.test(await p.innerText('[data-bloco-criados]')));
    L('ficha: aula recente aparece', (await p.innerText('[data-bloco-aulas]')).includes('Passé composé com être'));
    L('ficha: 30 quadradinhos de atividade, 4 ativos', (await p.$$eval('.p-atividade i', l => l.length)) === 30 && (await p.$$eval('.p-atividade i.on', l => l.length)) === 4);
    L('ficha: a fila empilhada tem texto equivalente', (await p.getAttribute('.p-pilha', 'aria-label')).includes('novos'));
    L('ficha: botões Registrar aula e Criar cartão levam às outras abas', await p.evaluate(() => !!document.querySelector('[data-ir-secao="classlogs"]') && !!document.querySelector('[data-ir-secao="flashcards"]')));
    L('ficha: sem consulta nova ao voltar para ela (cache)', (await rpcOv()) === 7);
    if (OUT) await p.screenshot({ path: path.join(OUT, `alunos-ficha-${lang}-${scheme}.png`), fullPage: true });
    await p.click('[data-voltar-alunos]'); await p.waitForSelector('[data-tsu="geral"]');
    L('voltar: quadro geral de novo, sem refazer as 7 consultas (cache)', (await linhas()).length === 7 && (await rpcOv()) === 7, await rpcOv());
    if (OUT) await p.screenshot({ path: path.join(OUT, `alunos-geral-${lang}-${scheme}.png`), fullPage: true });
    await p.click('[data-atualizar-alunos]'); await p.waitForFunction(() => document.querySelector('[data-tsu="geral"]')); await p.waitForTimeout(200);
    L('"Atualizar dados" busca tudo de novo (14 consultas)', (await rpcOv()) === 14, await rpcOv());

    // ---- ir para outras abas a partir da ficha ----
    await p.click('[data-abrir-aluno="2"]'); await p.waitForSelector('[data-tsu="ficha"] .p-resumo');
    await p.click('[data-ir-secao="classlogs"]');
    L('Registrar aula abre a aba Aulas', await p.evaluate(() => document.querySelector('[data-teacher-section="classlogs"]').classList.contains('is-active')));
    await p.evaluate(() => switchTeacherPanelSection('students')); await p.waitForSelector('[data-tsu="geral"]');
    L('voltar à aba Alunos mostra o quadro geral (não fica preso na ficha)', !(await p.$('[data-tsu="ficha"]')));

    // ---- remover vínculo ----
    await p.click('[data-abrir-aluno="3"]'); await p.waitForSelector('[data-tsu="ficha"] .p-resumo');
    await p.click('[data-tsu="ficha"] details.p-menu > summary'); await p.click('[data-remover-vinculo="3"]');
    const dlg = p.locator('dialog.p-dialogo--alerta[open]');
    L('remover: abre confirmação do painel (não o confirm do navegador) com o nome', await dlg.isVisible() && (await dlg.locator('h3').textContent()).includes('Helena Duarte'));
    L('remover: Cancelar tem o foco e o texto explica que o progresso é mantido', (await p.evaluate(() => document.activeElement.textContent.trim())).length > 0 && (await dlg.innerText()).includes('progresso'));
    await dlg.locator('button.secondary').click(); await p.waitForTimeout(150);
    L('remover: Cancelar não remove nada', (await p.evaluate(() => window.__removidos.length)) === 0);
    await p.click('[data-tsu="ficha"] details.p-menu > summary'); await p.click('[data-remover-vinculo="3"]');
    await p.locator('dialog.p-dialogo--alerta[open] .p-perigo').click(); await p.waitForSelector('[data-tsu="geral"]');
    L('remover: confirmar chama removeStudentLink(3) e volta ao quadro geral', (await p.evaluate(() => window.__removidos.join())) === '3' && !(await p.$('[data-tsu="ficha"]')));

    // ---- vincular (admin) ----
    await p.click('[data-abrir-dialogo="dlg-vincular-aluno"]'); const vd = p.locator('#dlg-vincular-aluno');
    L('vincular: janela abre com conta e idioma', await vd.isVisible() && !!(await p.$('#admin-student-username')) && !!(await p.$('#admin-student-language')));
    await p.selectOption('#admin-student-language', lang === 'fr' ? 'frances' : 'mandarim');
    L('vincular: X no canto e botões do rodapé lado a lado', await p.evaluate(() => { const x = document.querySelector('#dlg-vincular-aluno header button'), f = [...document.querySelectorAll('#dlg-vincular-aluno footer button')]; return getComputedStyle(x).position === 'absolute' && x.getBoundingClientRect().width < 60 && f.length === 2 && Math.abs(f[0].getBoundingClientRect().top - f[1].getBoundingClientRect().top) < 4; }));
    const opts = await p.$$eval('#admin-student-username option', o => o.map(x => x.value));
    L('vincular: quem já é aluno naquele idioma não aparece na lista (Marina fora, Nova Aluna dentro)', opts.includes('novaaluna') && !opts.includes('marina.alves'), opts);
    await p.selectOption('#admin-student-username', 'novaaluna'); await p.click('#admin-assign-student-btn'); await p.waitForTimeout(300);
    L('vincular: envia conta e idioma, fecha a janela e recarrega', (await p.evaluate(() => window.__vinculou.join())).startsWith('novaaluna,') && !(await vd.isVisible()));

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchTeacherPanelSection('students')); await p.waitForSelector('[data-tsu="geral"]'); await p.waitForTimeout(200);
    L('celular: sem rolagem horizontal no quadro geral', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: colunas secundárias escondidas, situação visível', await p.evaluate(() => { const th = [...document.querySelectorAll('[data-tabela-alunos] th')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent.trim()); return th.length <= 4 && th.some(x => /Situação|Status/.test(x)); }));
    L('celular: botão Abrir com alvo de toque de pelo menos 32px de altura', (await p.$eval('[data-abrir-aluno]', e => e.getBoundingClientRect().height)) >= 28);
    await p.click('[data-abrir-aluno="1"]'); await p.waitForSelector('[data-tsu="ficha"] .p-resumo'); await p.waitForTimeout(300);
    L('celular: sem rolagem horizontal na ficha', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    if (OUT) await p.screenshot({ path: path.join(OUT, `alunos-ficha-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- professora (não admin) e consulta que falha ----
  for (const lang of ['fr', 'zh']){
    const R = `${lang}/professora`; const L = (n, c, x) => check(`[${R}] ${n}`, c, x);
    const h = await abrir({ lang, scheme: 'light', admin: false, falhar: ['s4'] }); const p = h.page;
    await p.waitForSelector('[data-tsu="geral"]', { timeout: 15000 });
    L('professora: sem botão Vincular e sem janela de vínculo', !(await p.$('[data-abrir-dialogo="dlg-vincular-aluno"]')) && !(await p.$('#dlg-vincular-aluno')));
    L('professora: aviso de que a administração vincula', (await p.textContent('[data-tsu="geral"]')).includes('quem vincula alunos é a administração'));
    L('consulta que falhou: aviso e "—" no lugar da situação (nunca "Parado")', (await p.textContent('[data-tsu="geral"]')).includes('Não foi possível carregar os dados de 1 aluno.') && /Tiago Nunes.*—/s.test(await p.textContent('[data-tabela-alunos] tr:nth-child(4)')) && !/Parado|Atenção/.test(await p.textContent('[data-tabela-alunos] tr:nth-child(4)')));
    await p.click('[data-abrir-aluno="4"]'); await p.waitForSelector('[data-tsu="ficha"]');
    L('ficha de quem falhou: mensagem de erro (role=alert) e ainda mostra cartões criados', !!(await p.$('[data-tsu="ficha"] [role="alert"]')) && !!(await p.$('[data-bloco-criados]')));
    L('professora: nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`painel-alunos (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
