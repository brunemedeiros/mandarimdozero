// Aba "Badges" do Painel de Admin (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Banco em memória (tests/painel-admin/harness.js). Cobre: catálogo em cartões, concessões com filtro e busca, criar (validação,
// id repetido), conceder (conta inexistente, repetida), revogar, editar (inclusive trocar o id: concessões acompanham; falha no meio
// não deixa concessão órfã), gerenciar pessoas (janela, nota, falha parcial), apagar com confirmação, acesso negado e celular.
// Rodar: node tests/painel-admin/test_badges_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrirAdmin } = require('./harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const SEED = {
  badge_catalog: [
    { id: 'colab', name: 'Colaboradora', icon: '🛠️', description: 'Ajudou a melhorar o app', created_at: '2026-09-01T10:00:00Z' },
    { id: 'beta', name: 'Beta <b>', icon: '🧪', description: null, created_at: '2026-09-02T10:00:00Z' },
  ],
  badge_grants: [
    { user_id: 'u1', badge_id: 'colab', note: 'reportou bug do streak', granted_by: 'a@x', granted_at: '2026-10-01T10:00:00Z' },
    { user_id: 'u2', badge_id: 'colab', note: null, granted_by: 'a@x', granted_at: '2026-10-02T10:00:00Z' },
    { user_id: 'u1', badge_id: 'beta', note: null, granted_by: 'a@x', granted_at: '2026-10-03T10:00:00Z' },
    { user_id: 'u1', badge_id: 'founder', note: null, granted_by: 'a@x', granted_at: '2026-10-04T10:00:00Z' },
  ],
  profiles: [
    { user_id: 'u1', username: 'ana', display_name: 'Ana Souza' }, { user_id: 'u2', username: 'bia', display_name: 'Bia Lima' },
    { user_id: 'u3', username: 'caio', display_name: null }, { user_id: 'u4', username: 'duda', display_name: 'Duda' },
  ],
};

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const h = await abrirAdmin({ lang, scheme, aba: 'badges', seed: SEED }); const p = h.page;
    await p.waitForSelector('[data-tbd="pagina"]');
    const T = (n) => p.evaluate(x => window.__T[x].map(r => ({ ...r })), n);
    const rows = () => p.$$eval('[data-badges-concessoes] [data-concessao]', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const cardsTxt = () => p.$$eval('[data-badges-catalogo] .p-badge', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const dlg = p.locator('dialog.p-dialogo--alerta[open]');
    const menu = async (sel) => { await p.click(`${sel} details summary`); };

    // ---- quadro ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título, as 5 abas do Admin e Badges ativa', (await p.innerText('[data-tbd="pagina"] header')).includes('Badges') && JSON.stringify(await p.$$eval('#view-admin-badges [data-admin-section]', l => l.map(b => b.dataset.adminSection))) === '["badges","analytics","notifications","reports","premium"]' && await p.$eval('[data-admin-section="badges"]', b => b.classList.contains('is-active')));
    L('catálogo: 2 cartões com a contagem de pessoas', (await cardsTxt()).length === 2 && (await cardsTxt())[0].includes('2 pessoas') && (await cardsTxt())[1].includes('1 pessoa'), await cardsTxt());
    L('nome com HTML aparece como texto', (await p.$$eval('[data-badges-catalogo] b', l => l.length)) === 0 && (await cardsTxt())[1].includes('Beta <b>'));
    L('o ícone SVG do badge automático fica pequeno, do tamanho do texto', await p.$$eval('[data-badges-concessoes] td svg', l => l.length > 0 && l.every(e => e.getBoundingClientRect().width <= 30)));
    L('concessões: 4 linhas (a de badge automático também)', (await rows()).length === 4 && (await rows()).some(r => r.includes('@ana') && r.includes('reportou bug do streak')), await rows());
    L('automáticos: recolhido e lista os badges do app', !(await p.$eval('.p-automaticos', e => e.open)) && (await p.$$eval('.p-automaticos li', l => l.length)) >= 2);
    L('formulários ao lado (à direita)', await p.evaluate(() => document.querySelector('#form-criar-badge').getBoundingClientRect().left > document.querySelector('[data-badges-catalogo]').getBoundingClientRect().left + 200));

    // ---- filtros ----
    await p.fill('#badge-nome', 'rascunho que não pode sumir');
    await p.selectOption('[data-badges-filtro]', 'colab'); L('filtro por badge', (await rows()).length === 2);
    await p.selectOption('[data-badges-filtro]', '');
    await p.click('[data-badges-busca]'); await p.keyboard.type('souza'); L('busca pelo nome da pessoa', (await rows()).length === 3);
    L('campo de busca mantém foco e texto', await p.evaluate(() => document.activeElement === document.querySelector('[data-badges-busca]') && document.activeElement.value === 'souza'));
    await p.fill('[data-badges-busca]', 'streak'); L('busca pela nota', (await rows()).length === 1);
    await p.fill('[data-badges-busca]', 'zzz'); L('sem resultado: mensagem de filtro', (await p.textContent('[data-badges-concessoes]')).includes('Nenhuma concessão com esses filtros.'));
    await p.fill('[data-badges-busca]', ''); L('limpar volta às 4', (await rows()).length === 4);
    L('o rascunho do formulário sobreviveu aos filtros', (await p.inputValue('#badge-nome')) === 'rascunho que não pode sumir');
    await p.fill('#badge-nome', '');

    // ---- criar ----
    await p.click('#badge-criar'); L('vazio: erro do id e nada criado', (await p.textContent('#badge-criar-erro')).includes('pelo menos 2') && (await T('badge_catalog')).length === 2);
    await p.fill('#badge-id', 'Mentora Top!'); await p.click('#badge-criar'); L('sem nome: erro do nome', (await p.textContent('#badge-criar-erro')).includes('nome'));
    await p.fill('#badge-nome', 'Mentora'); await p.click('#badge-criar'); L('sem emoji: erro do emoji', (await p.textContent('#badge-criar-erro')).includes('emoji'));
    await p.fill('#badge-icone', '🎓'); await p.fill('#badge-desc', 'Ensina a turma');
    await p.evaluate(() => { window.__falha = { tabela: 'badge_catalog', op: 'insert', code: '23505' }; });
    await p.click('#badge-criar'); await p.waitForFunction(() => document.getElementById('badge-criar-erro').textContent.includes('Já existe'));
    L('id repetido: avisa e mantém o que foi digitado', (await p.inputValue('#badge-nome')) === 'Mentora');
    await p.click('#badge-criar'); await p.waitForFunction(() => window.__T.badge_catalog.length === 3);
    const nb = (await T('badge_catalog')).slice(-1)[0];
    L('criado: id limpo (minúsculas, só letras, números e _), nome, emoji, descrição', nb.id === 'mentoratop' && nb.name === 'Mentora' && nb.icon === '🎓' && nb.description === 'Ensina a turma', nb);
    await p.waitForFunction(() => document.querySelectorAll('[data-badges-catalogo] .p-badge').length === 3);
    L('catálogo atualiza, formulário limpa e o badge entra no formulário de conceder', (await p.inputValue('#badge-nome')) === '' && (await p.$$eval('#conceder-badge option', l => l.map(o => o.value))).includes('mentoratop'));

    // ---- conceder ----
    await p.selectOption('#conceder-badge', 'mentoratop');
    await p.fill('#conceder-usuario', 'naoexiste'); await p.click('#conceder-enviar'); await p.waitForFunction(() => document.getElementById('conceder-erro').textContent.length > 0);
    L('conta inexistente: avisa e nada é concedido', (await p.textContent('#conceder-erro')).includes('Não achei') && (await T('badge_grants')).length === 4);
    await p.fill('#conceder-usuario', '@Caio'); await p.fill('#conceder-nota', 'ajudou muito'); await p.click('#conceder-enviar');
    await p.waitForFunction(() => window.__T.badge_grants.length === 5);
    const ng = (await T('badge_grants')).slice(-1)[0];
    L('concedido: pessoa, badge e nota certos', ng.user_id === 'u3' && ng.badge_id === 'mentoratop' && ng.note === 'ajudou muito', ng);
    await p.waitForFunction(() => document.querySelectorAll('[data-badges-concessoes] [data-concessao]').length === 5);
    L('concessão nova mostra a data (nunca "undefined")', !(await p.innerText('[data-badges-concessoes]')).includes('undefined'));
    L('lista atualiza; campos do conceder limpam e o badge escolhido continua', (await p.inputValue('#conceder-usuario')) === '' && (await p.inputValue('#conceder-nota')) === '' && (await p.inputValue('#conceder-badge')) === 'mentoratop');
    await p.fill('#conceder-usuario', 'caio'); await p.evaluate(() => { window.__falha = { tabela: 'badge_grants', op: 'insert', code: '23505' }; }); await p.click('#conceder-enviar');
    await p.waitForFunction(() => document.getElementById('conceder-erro').textContent.length > 0);
    L('já tem o badge: avisa com o @', (await p.textContent('#conceder-erro')).includes('@caio'));
    L('sugestões de @usuario: as 4 contas', (await p.$$eval('#conceder-usuarios option', l => l.length)) === 4, await p.$$eval('#conceder-usuarios option', l => l.map(o => o.value)));
    await p.fill('#conceder-usuario', '');

    // ---- revogar ----
    await p.click('[data-concessao][data-user="u3"] [data-revogar]'); await p.waitForFunction(() => window.__T.badge_grants.length === 4);
    L('revogar: some do banco e da lista, sem pedir confirmação', !(await dlg.count()) && (await rows()).length === 4);

    // ---- editar ----
    await menu('[data-badge="colab"]'); await p.click('[data-editar-badge="colab"]');
    const ed = p.locator('#dlg-editar-badge');
    L('editar: janela com os valores atuais e o aviso sobre o identificador', await ed.isVisible() && (await p.inputValue('#editar-bnome')) === 'Colaboradora' && (await p.inputValue('#editar-bid')) === 'colab' && (await ed.innerText()).includes('concessões acompanham'));
    await p.fill('#editar-bnome', ''); await p.click('#form-editar-badge button[type=submit]'); L('editar: nome vazio dá erro e a janela fica', (await p.textContent('#editar-berro')).includes('nome') && await ed.isVisible());
    await p.fill('#editar-bnome', 'Colaboradora Top'); await p.click('#form-editar-badge button[type=submit]'); await p.waitForSelector('#dlg-editar-badge', { state: 'detached' });
    L('editar só o nome: grava, concessões intactas', (await T('badge_catalog')).find(b => b.id === 'colab').name === 'Colaboradora Top' && (await T('badge_grants')).filter(g => g.badge_id === 'colab').length === 2);
    await menu('[data-badge="colab"]'); await p.click('[data-editar-badge="colab"]'); await p.fill('#editar-bid', 'beta'); await p.click('#form-editar-badge button[type=submit]');
    await p.waitForFunction(() => document.getElementById('editar-berro').textContent.length > 0);
    L('trocar para um id que já existe: erro e nada muda', (await p.textContent('#editar-berro')).includes('beta') && (await T('badge_catalog')).some(b => b.id === 'colab'));
    await p.fill('#editar-bid', 'colaboradora'); await p.evaluate(() => { window.__falha = { tabela: 'badge_grants', op: 'update' }; }); await p.click('#form-editar-badge button[type=submit]');
    await p.waitForFunction(() => document.getElementById('editar-berro').textContent.includes('migrad'));
    L('falha ao migrar concessões: avisa; nenhuma concessão fica órfã (o id antigo continua no catálogo)', (await T('badge_catalog')).some(b => b.id === 'colab') && (await T('badge_grants')).filter(g => g.badge_id === 'colab').length === 2);
    await p.evaluate(() => { window.__T.badge_catalog = window.__T.badge_catalog.filter(b => b.id !== 'colaboradora'); });
    await p.click('#form-editar-badge button[type=submit]'); await p.waitForSelector('#dlg-editar-badge', { state: 'detached' });
    L('trocar o id: o badge novo aparece, o antigo some e as concessões acompanham', !(await T('badge_catalog')).some(b => b.id === 'colab') && (await T('badge_catalog')).some(b => b.id === 'colaboradora') && (await T('badge_grants')).filter(g => g.badge_id === 'colaboradora').length === 2 && (await T('badge_grants')).filter(g => g.badge_id === 'colab').length === 0);
    await p.waitForSelector('[data-badge="colaboradora"]');
    L('lista atualizou com o id novo', (await cardsTxt()).some(c => c.includes('Colaboradora Top') && c.includes('2 pessoas')));

    // ---- gerenciar pessoas ----
    await p.click('[data-gerenciar-badge="colaboradora"]');
    const md = p.locator('#dlg-membros-badge');
    const nomes = await p.$$eval('#dlg-membros-badge [data-membro] label', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    L('pessoas: quem tem o badge vem primeiro e marcado, com a nota', await md.isVisible() && nomes[0].includes('@ana') && nomes[1].includes('@bia') && (await p.isChecked('#dlg-membros-badge [data-user="u1"]')) && (await p.inputValue('[data-nota-membro="u1"]')) === 'reportou bug do streak', nomes);
    await p.fill('#dlg-membros-badge [data-buscar-membro]', 'dud'); L('buscar pessoa esconde as outras', (await p.$$eval('#dlg-membros-badge [data-membro]', l => l.filter(e => !e.hidden).length)) === 1);
    await p.fill('#dlg-membros-badge [data-buscar-membro]', '');
    await p.uncheck('#dlg-membros-badge [data-user="u2"]'); await p.check('#dlg-membros-badge [data-user="u4"]'); await p.fill('[data-nota-membro="u4"]', 'nova'); await p.fill('[data-nota-membro="u1"]', 'nota editada');
    await p.click('#form-membros-badge button[type=submit]'); await p.waitForSelector('#dlg-membros-badge', { state: 'detached' });
    const gs = (await T('badge_grants')).filter(g => g.badge_id === 'colaboradora');
    L('salvar: tirou a Bia, deu à Duda com nota e mudou a nota da Ana', gs.length === 2 && gs.some(g => g.user_id === 'u4' && g.note === 'nova') && gs.some(g => g.user_id === 'u1' && g.note === 'nota editada') && !gs.some(g => g.user_id === 'u2'), gs);
    await p.click('[data-gerenciar-badge="colaboradora"]'); await p.uncheck('#dlg-membros-badge [data-user="u4"]'); await p.evaluate(() => { window.__falha = { tabela: 'badge_grants', op: 'delete' }; });
    await p.click('#form-membros-badge button[type=submit]'); await p.waitForFunction(() => document.getElementById('membros-erro').textContent.length > 0);
    L('falha ao salvar: avisa quantas mudanças não foram salvas e a janela fica aberta', (await p.textContent('#membros-erro')).includes('1') && await md.isVisible());
    await p.click('#dlg-membros-badge [data-fechar-dialogo] >> nth=1'); await p.waitForSelector('#dlg-membros-badge', { state: 'detached' });

    // ---- apagar ----
    await menu('[data-badge="beta"]'); await p.click('[data-apagar-badge="beta"]');
    L('apagar: confirmação com o nome e quantas pessoas perdem', await dlg.isVisible() && (await dlg.innerText()).includes('Beta <b>') && (await dlg.innerText()).includes('1'));
    await dlg.locator('button:not(.p-perigo)').click(); await p.waitForTimeout(200);
    L('apagar: cancelar mantém tudo', (await T('badge_catalog')).some(b => b.id === 'beta') && (await T('badge_grants')).some(g => g.badge_id === 'beta'));
    await p.evaluate(() => { window.__falha = { tabela: 'badge_grants', op: 'delete' }; });
    await menu('[data-badge="beta"]'); await p.click('[data-apagar-badge="beta"]'); await dlg.locator('.p-perigo').click(); await p.waitForTimeout(300);
    L('falha ao apagar as concessões: o badge continua no catálogo', (await T('badge_catalog')).some(b => b.id === 'beta'));
    await menu('[data-badge="beta"]'); await p.click('[data-apagar-badge="beta"]'); await dlg.locator('.p-perigo').click();
    await p.waitForFunction(() => !window.__T.badge_catalog.some(b => b.id === 'beta'));
    L('apagar: some o badge e as concessões dele', !(await T('badge_grants')).some(g => g.badge_id === 'beta') && !(await p.$('[data-badge="beta"]')));
    if (OUT) await p.screenshot({ path: path.join(OUT, `badges-${lang}-${scheme}.png`), fullPage: true });

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchAdminPanelSection('badges')); await p.waitForSelector('[data-tbd="pagina"]'); await p.waitForTimeout(300);
    L('celular: sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: formulários depois do catálogo (uma coluna)', await p.evaluate(() => document.querySelector('#form-criar-badge').getBoundingClientRect().top > document.querySelector('[data-badges-catalogo]').getBoundingClientRect().top));
    if (OUT) await p.screenshot({ path: path.join(OUT, `badges-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- sem ser admin, e sem badges ----
  for (const lang of ['fr', 'zh']){
    let h = await abrirAdmin({ lang, aba: 'premium', seed: SEED });
    await h.page.evaluate(() => { isAdminUser = () => false; renderAdminBadgesView(); });
    check(`[${lang}] sem ser admin: só o aviso`, (await h.page.textContent('#admin-badges-content')).includes('só para a administração') && !(await h.page.$('#form-criar-badge')));
    await h.close();
    h = await abrirAdmin({ lang, aba: 'badges', seed: { badge_catalog: [], badge_grants: [], profiles: [] } });
    await h.page.waitForSelector('[data-tbd="pagina"]');
    check(`[${lang}] sem badges: estado vazio explica o próximo passo e o botão de conceder fica desligado`, (await h.page.textContent('[data-badges-catalogo]')).includes('Nenhum badge criado ainda') && await h.page.isDisabled('#conceder-enviar'));
    await h.close();
  }
  console.log(`painel-admin badges (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
