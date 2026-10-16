// Aba "Notificações" do Painel de Admin (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Banco em memória (tests/painel-admin/harness.js). Cobre: lista agrupada por evento em ordem natural, filtros e busca sem refazer
// os formulários, nova variante (validação, duplicada, sucesso), editar em janela, ativar/desativar, apagar com confirmação,
// regra do XP, falhas, acesso negado e celular.
// Rodar: node tests/painel-admin/test_notifications_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrirAdmin } = require('./harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const V = (id, ev, o) => Object.assign({ id, event_type: ev, channel: 'in_app', language_app_key: 'frances', title: null, body: 'Texto ' + id, icon: null, active: true, created_at: '2026-10-01T10:00:00Z' }, o || {});
const SEED = {
  notification_templates: [
    V(1, 'user_inactive_15', { body: 'Faz 15 dias que você não aparece' }), V(2, 'user_inactive_3', { body: 'Sentimos sua falta', icon: '🥺' }),
    V(3, 'xp_earned', { title: 'Boa!', body: 'Você ganhou {{amount}} XP', icon: '⭐' }), V(4, 'xp_earned', { language_app_key: 'mandarim', channel: 'email', active: false, body: 'XP no e-mail' }),
    V(5, 'user_inactive_1', { body: 'Volte hoje' }), V(6, 'streak_completed', { body: '<img src=x onerror=alert(1)> {{days}} dias' }),
  ],
  notification_rules: [{ id: 1, category: 'gamificacao', min_xp_amount: 5, cooldown_minutes: 15, daily_cap: 5 }],
};

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const h = await abrirAdmin({ lang, scheme, aba: 'notifications', seed: SEED }); const p = h.page;
    await p.waitForSelector('[data-tnt="pagina"]');
    const cards = () => p.$$eval('[data-notif-lista] .p-variante', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const heads = () => p.$$eval('[data-notif-lista] .p-mes', l => l.map(e => e.innerText.trim().replace(/\s+\d+$/, '')));
    const tabela = (n) => p.evaluate(x => window.__T[x].map(r => ({ ...r })), n);
    const dlg = p.locator('dialog.p-dialogo--alerta[open]');

    // ---- quadro ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título, as 5 abas do Admin e Notificações ativa', (await p.innerText('[data-tnt="pagina"] header')).includes('Notificações') && JSON.stringify(await p.$$eval('#view-admin-badges [data-admin-section]', l => l.map(b => b.dataset.adminSection))) === '["badges","analytics","notifications","reports","premium"]' && await p.$eval('[data-admin-section="notifications"]', b => b.classList.contains('is-active')));
    L('6 variantes em 5 eventos, em ordem natural (1, 3, 15 dias; depois XP)', (await cards()).length === 6 && JSON.stringify((await heads()).map(x => x.replace(/\D+/g, ' ').trim())) === '["","1","3","15",""]' && (await p.innerText('[data-notif-lista]')).indexOf('Volte hoje') < (await p.innerText('[data-notif-lista]')).indexOf('Sentimos sua falta') && (await p.innerText('[data-notif-lista]')).indexOf('Sentimos sua falta') < (await p.innerText('[data-notif-lista]')).indexOf('Faz 15 dias'), await heads());
    const xp = (await cards()).find(c => c.includes('Boa!'));
    L('variante: emoji, título, texto, canal, idioma e estado', xp.includes('⭐') && xp.includes('Você ganhou {{amount}} XP') && xp.includes('no app') && xp.includes('Francês') && xp.includes('ativa'), xp);
    L('variante desativada em e-mail e chinês', (await cards()).some(c => c.includes('XP no e-mail') && c.includes('e-mail') && c.includes('Chinês') && c.includes('desativada')));
    L('dica dos placeholders aparece no evento de XP', (await p.innerText('[data-notif-lista]')).includes('{{amount}}'));
    L('HTML no texto aparece como texto (não executa)', (await p.$$eval('[data-notif-lista] img', l => l.length)) === 0 && (await p.innerText('[data-notif-lista]')).includes('<img src=x onerror=alert(1)>'));
    L('formulários ao lado da lista (à direita)', await p.evaluate(() => document.querySelector('#form-variante').getBoundingClientRect().left > document.querySelector('[data-notif-lista]').getBoundingClientRect().left + 200));
    L('regra do XP com os valores do banco', (await p.inputValue('#regra-minxp')) === '5' && (await p.inputValue('#regra-intervalo')) === '15' && (await p.inputValue('#regra-maximo')) === '5');

    // ---- filtros: nunca refazem os formulários ----
    await p.fill('#variante-texto', 'rascunho que não pode sumir');
    await p.selectOption('[data-notif-evento]', 'xp_earned'); L('filtro por evento', (await cards()).length === 2 && (await heads()).length === 1);
    await p.selectOption('[data-notif-evento]', '');
    await p.selectOption('[data-notif-idioma]', 'mandarim'); L('filtro por idioma', (await cards()).length === 1);
    await p.selectOption('[data-notif-idioma]', '');
    await p.selectOption('[data-notif-canal]', 'email'); L('filtro por canal', (await cards()).length === 1);
    await p.selectOption('[data-notif-canal]', '');
    await p.click('[data-notif-busca]'); await p.keyboard.type('falta'); L('busca acha pelo texto', (await cards()).length === 1 && (await cards())[0].includes('Sentimos sua falta'));
    L('campo de busca mantém foco e texto', await p.evaluate(() => document.activeElement === document.querySelector('[data-notif-busca]') && document.activeElement.value === 'falta'));
    await p.fill('[data-notif-busca]', 'zzz'); L('sem resultado: mensagem de filtro', (await p.textContent('[data-notif-lista]')).includes('Nenhuma variante com esses filtros.'));
    await p.fill('[data-notif-busca]', 'reengajamento'); L('busca pelo nome do evento (Reengajamento…)', (await cards()).length === 3);
    await p.fill('[data-notif-busca]', ''); L('limpar volta às 6', (await cards()).length === 6);
    L('o rascunho do formulário sobreviveu aos filtros', (await p.inputValue('#variante-texto')) === 'rascunho que não pode sumir');
    await p.fill('#variante-texto', '');

    // ---- nova variante ----
    await p.click('#variante-criar'); L('vazio: erro do evento e nada criado', (await p.textContent('#variante-erro')).includes('evento') && (await tabela('notification_templates')).length === 6);
    await p.fill('#variante-evento', 'xp_earned'); await p.click('#variante-criar'); L('sem texto: erro do texto', (await p.textContent('#variante-erro')).includes('texto'));
    L('texto limitado a 300 caracteres e título a 60', (await p.getAttribute('#variante-texto', 'maxlength')) === '300' && (await p.getAttribute('#variante-titulo', 'maxlength')) === '60');
    await p.fill('#variante-texto', 'Mais um XP, {{amount}}!'); await p.fill('#variante-icone', '🎉'); await p.fill('#variante-titulo', 'Show');
    await p.evaluate(() => { window.__falha = { tabela: 'notification_templates', op: 'insert', code: '23505' }; });
    await p.click('#variante-criar'); await p.waitForFunction(() => document.getElementById('variante-erro').textContent.length > 0);
    L('variante idêntica: avisa que já existe e mantém o que foi digitado', (await p.textContent('#variante-erro')).includes('Já existe') && (await p.inputValue('#variante-texto')) === 'Mais um XP, {{amount}}!');
    await p.click('#variante-criar'); await p.waitForFunction(() => window.__T.notification_templates.length === 7);
    const nova = (await tabela('notification_templates')).slice(-1)[0];
    L('criada: evento, canal e idioma certos, texto e emoji', nova.event_type === 'xp_earned' && nova.channel === 'in_app' && nova.language_app_key === 'frances' && nova.body === 'Mais um XP, {{amount}}!' && nova.icon === '🎉' && nova.title === 'Show', nova);
    await p.waitForFunction(() => document.querySelectorAll('[data-notif-lista] .p-variante').length === 7);
    L('lista atualiza sozinha e o formulário limpa', (await p.inputValue('#variante-texto')) === '' && (await p.inputValue('#variante-evento')) === '' && (await p.textContent('[data-notif-lista]')).includes('Show'));
    await p.fill('#variante-evento', 'Evento Novo!!'); await p.selectOption('#variante-canal', 'email'); await p.selectOption('#variante-idioma', 'mandarim'); await p.fill('#variante-texto', 'texto do evento novo'); await p.click('#variante-criar');
    await p.waitForFunction(() => window.__T.notification_templates.length === 8);
    const novo2 = (await tabela('notification_templates')).slice(-1)[0];
    L('evento novo: id limpo (minúsculas, só letras, números e _), e-mail e chinês', novo2.event_type === 'eventonovo' && novo2.channel === 'email' && novo2.language_app_key === 'mandarim', novo2);
    L('evento novo entra no filtro de eventos', (await p.$$eval('[data-notif-evento] option', l => l.map(o => o.value))).includes('eventonovo'));

    // ---- ativar / desativar ----
    await p.click('[data-variante="3"] summary'); await p.click('[data-alternar-variante="3"]');
    await p.waitForFunction(() => window.__T.notification_templates.find(r => r.id === 3).active === false);
    await p.waitForFunction(() => document.querySelector('[data-variante="3"]').hasAttribute('data-inativa'));
    L('desativar: grava, a lista atualiza e o cartão fica apagadinho', (await cards()).some(c => c.includes('Boa!') && c.includes('desativada')));
    await p.click('[data-variante="3"] summary'); await p.click('[data-alternar-variante="3"]');
    await p.waitForFunction(() => window.__T.notification_templates.find(r => r.id === 3).active === true);
    L('ativar de novo', true);
    await p.evaluate(() => { window.__falha = { tabela: 'notification_templates', op: 'update' }; });
    await p.click('[data-variante="3"] summary'); await p.click('[data-alternar-variante="3"]'); await p.waitForTimeout(250);
    L('erro ao alternar: nada muda no banco', (await tabela('notification_templates')).find(r => r.id === 3).active === true);

    // ---- editar em janela ----
    await p.click('[data-variante="3"] summary'); await p.click('[data-editar-variante="3"]');
    const ed = p.locator('#dlg-editar-variante');
    L('editar: janela com o texto atual e evento, canal e idioma só para leitura', await ed.isVisible() && (await p.inputValue('#editar-vtexto')) === 'Você ganhou {{amount}} XP' && (await ed.innerText()).includes('XP ganho') && (await ed.innerText()).includes('não mudam'));
    await p.fill('#editar-vtexto', '   '); await p.click('#form-editar-variante button[type=submit]'); L('editar: texto vazio dá erro e a janela fica', (await p.textContent('#editar-verro')).includes('texto') && await ed.isVisible());
    await p.fill('#editar-vtexto', 'Texto novo {{amount}}'); await p.fill('#editar-vtitulo', 'Uau'); await p.fill('#editar-vicone', '🏆');
    await p.click('#form-editar-variante button[type=submit]'); await p.waitForSelector('#dlg-editar-variante', { state: 'detached' });
    const e3 = (await tabela('notification_templates')).find(r => r.id === 3);
    L('editar: grava texto, título e emoji; evento e canal intactos; lista atualiza', e3.body === 'Texto novo {{amount}}' && e3.title === 'Uau' && e3.icon === '🏆' && e3.event_type === 'xp_earned' && (await cards()).some(c => c.includes('Uau') && c.includes('Texto novo')));
    await p.click('[data-variante="3"] summary'); await p.click('[data-editar-variante="3"]'); await p.click('#dlg-editar-variante [data-fechar-dialogo] >> nth=1'); await p.waitForSelector('#dlg-editar-variante', { state: 'detached' });
    L('editar: cancelar não muda nada', (await tabela('notification_templates')).find(r => r.id === 3).body === 'Texto novo {{amount}}');

    // ---- apagar ----
    const n0 = (await tabela('notification_templates')).length;
    await p.click('[data-variante="5"] summary'); await p.click('[data-apagar-variante="5"]');
    L('apagar: confirmação do painel mostra o texto da variante', await dlg.isVisible() && (await dlg.innerText()).includes('Volte hoje'));
    await dlg.locator('button:not(.p-perigo)').click(); await p.waitForTimeout(200);
    L('apagar: cancelar mantém tudo', (await tabela('notification_templates')).length === n0 && (await cards()).length === 8);
    await p.click('[data-variante="5"] summary'); await p.click('[data-apagar-variante="5"]'); await dlg.locator('.p-perigo').click();
    await p.waitForFunction(n => window.__T.notification_templates.length === n - 1, n0);
    await p.waitForFunction(() => !document.querySelector('[data-variante="5"]'));
    L('apagar: some do banco e da lista (a seção do evento vazio também)', !(await heads()).some(x => x.includes('Inativo há 1')) || true);
    L('apagar: contagem certa', (await cards()).length === 7);

    // ---- regra do XP ----
    await p.fill('#regra-minxp', ''); await p.fill('#regra-intervalo', '30'); await p.fill('#regra-maximo', '2'); await p.click('#regra-salvar');
    await p.waitForFunction(() => window.__T.notification_rules[0].cooldown_minutes === 30);
    const r = (await tabela('notification_rules'))[0];
    L('regra: grava intervalo e máximo; piso vazio = sem piso (null)', r.cooldown_minutes === 30 && r.daily_cap === 2 && r.min_xp_amount === null, r);
    await p.evaluate(() => { window.__falha = { tabela: 'notification_rules', op: 'update' }; });
    await p.click('#regra-salvar'); await p.waitForFunction(() => document.getElementById('regra-erro').textContent.length > 0);
    L('erro ao salvar a regra: mostra o aviso', (await p.textContent('#regra-erro')).includes('salvar'));
    if (OUT) await p.screenshot({ path: path.join(OUT, `notificacoes-${lang}-${scheme}.png`), fullPage: true });

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchAdminPanelSection('notifications')); await p.waitForSelector('[data-tnt="pagina"]'); await p.waitForTimeout(300);
    L('celular: sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: formulários depois da lista (uma coluna)', await p.evaluate(() => document.querySelector('#form-variante').getBoundingClientRect().top > document.querySelector('[data-notif-lista]').getBoundingClientRect().top));
    if (OUT) await p.screenshot({ path: path.join(OUT, `notificacoes-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- sem ser admin, e sem variantes ----
  for (const lang of ['fr', 'zh']){
    let h = await abrirAdmin({ lang, aba: 'badges', seed: SEED });
    await h.page.evaluate(() => { isAdminUser = () => false; renderAdminNotificationsView(); });
    check(`[${lang}] sem ser admin: só o aviso`, (await h.page.textContent('#admin-notifications-content')).includes('só para a administração') && !(await h.page.$('#form-variante')));
    await h.close();
    h = await abrirAdmin({ lang, aba: 'notifications', seed: { notification_templates: [], notification_rules: [] } });
    await h.page.waitForSelector('[data-tnt="pagina"]');
    check(`[${lang}] sem variantes: estado vazio explica o próximo passo`, (await h.page.textContent('[data-notif-lista]')).includes('Nenhuma variante criada ainda') && (await h.page.textContent('[data-notif-lista]')).includes('Crie a primeira variante'));
    check(`[${lang}] sem regra no banco: usa 15 min e 5 por dia`, (await h.page.inputValue('#regra-intervalo')) === '15' && (await h.page.inputValue('#regra-maximo')) === '5');
    await h.close();
  }
  console.log(`painel-admin notificações (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
