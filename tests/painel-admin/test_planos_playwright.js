// Aba "Planos" do Painel de Admin (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Banco em memória (tests/painel-admin/harness.js). Cobre: busca com teclado, ficha da conta, dar/tirar plano (tirar pede
// confirmação), matriz de permissões (desligar pede confirmação, número grava), falhas que desfazem, acesso negado e celular.
// Rodar: node tests/painel-admin/test_planos_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrirAdmin } = require('./harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const KEYS = [['own_cards_limit', 'limit'], ['rich_card_formats', 'bool'], ['tts_monthly_quota', 'limit'], ['public_deck_import', 'bool'], ['public_deck_copy_count', 'bool'], ['challenges_premium', 'bool'],
  ['trail_skip_locked', 'bool'], ['class_logs_view', 'bool'], ['support_materials_view', 'bool'], ['teacher_panel', 'bool'], ['teacher_student_analytics', 'bool'], ['teacher_board', 'bool']];
const ROLES = ['user', 'student', 'premium_basic', 'premium_pro', 'teacher'];
const SEED = {
  permission_catalog: KEYS.map(([key, kind], i) => ({ key, kind, label_pt: key, sort: i })),
  role_permissions: ROLES.flatMap(r => KEYS.map(([k]) => ({ role: r, permission_key: k, enabled: r !== 'user' || k === 'own_cards_limit', limit_value: k === 'own_cards_limit' && r === 'user' ? 20 : (k === 'tts_monthly_quota' ? 300 : null) }))),
  profiles: [
    { user_id: 'A', username: 'brune', display_name: 'Brune', plan_tier: 'premium', role: 'admin' },
    { user_id: 'P', username: 'carla.prof', display_name: 'Carla', plan_tier: 'free', role: 'user' },
    { user_id: 'S', username: 'ana', display_name: 'Ana Souza', plan_tier: 'free', role: 'user' },
    { user_id: 'S2', username: 'anabela', display_name: 'Anabela', plan_tier: 'free', role: 'user' },
    { user_id: 'S3', username: 'fabiana', display_name: 'Fabiana Lima', plan_tier: 'free', role: 'user' },
  ],
};
const ANTES = () => {
  window.__grants = [];
  window.__RPC.admin_get_account_roles = (a) => ({ roles: ['user'].concat(window.__grants.filter(g => g[0] === a.p_user).map(g => g[1])), admin: a.p_user === 'A', grants: [] });
  window.__RPC.admin_grant_role = (a) => { window.__grants.push([a.p_user, a.p_role]); return {}; };
  window.__RPC.admin_revoke_role = (a) => { window.__grants = window.__grants.filter(g => !(g[0] === a.p_user && g[1] === a.p_role)); return {}; };
  window.__RPC.admin_set_role_permission = (a) => { const r = window.__T.role_permissions.find(x => x.role === a.p_role && x.permission_key === a.p_key); r.enabled = a.p_enabled; r.limit_value = a.p_limit; return null; };
};

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const h = await abrirAdmin({ lang, scheme, aba: 'premium', seed: SEED, antes: ANTES }); const p = h.page;
    await p.waitForSelector('[data-plano-matriz] tbody tr');
    const rpcs = (nome) => p.evaluate(n => window.__rpcLog.filter(x => x[0] === n).map(x => x[1]), nome);
    const dlg = p.locator('dialog.p-dialogo--alerta[open]');
    const celula = (r, k) => `[data-plano-celula][data-role="${r}"][data-key="${k}"]`;

    // ---- quadro ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título, subtítulo e as 2 seções', (await p.innerText('[data-tpl="pagina"] header')).includes('Planos') && (await p.$$eval('[data-tpl="pagina"] > article', l => l.length)) === 2);
    L('as 6 abas do Admin (a de Privacidade é temporária) continuam e Planos está ativa', JSON.stringify(await p.$$eval('#view-admin-badges [data-admin-section]', l => l.map(b => b.dataset.adminSection))) === '["badges","analytics","notifications","reports","premium","privacy"]' && await p.$eval('[data-admin-section="premium"]', b => b.classList.contains('is-active')));
    L('matriz: 12 permissões × 5 tipos', (await p.$$eval('[data-plano-matriz] tbody tr', l => l.length)) === 12 && (await p.$$eval('[data-plano-matriz] thead th', l => l.length)) === 6);
    L('matriz: limites só nas 2 permissões de número × 5 tipos', (await p.$$eval('[data-plano-limite]', l => l.length)) === 10);
    L('matriz: Grátis tem 20 cartões', (await p.inputValue(`${celula('user', 'own_cards_limit')} [data-plano-limite]`)) === '20');
    L('matriz: sem ícones de ação sem nome (toda caixa tem nome)', await p.$$eval('[data-plano-celula] input', l => l.every(i => !!i.getAttribute('aria-label'))));

    // ---- busca ----
    L('lista fechada no começo', await p.getAttribute('#plans-search-input', 'aria-expanded') === 'false' && await p.$eval('#plans-search-list', e => e.hidden));
    await p.fill('#plans-search-input', 'a'); await p.waitForFunction(() => document.getElementById('plans-search-status').textContent.length > 0);
    L('1 letra: pede mais', (await p.textContent('#plans-search-status')).includes('2 letras'));
    await p.fill('#plans-search-input', 'zzzz'); await p.waitForFunction(() => document.getElementById('plans-search-status').textContent.includes('zzzz'));
    L('sem resultado: avisa com o termo', (await p.textContent('#plans-search-status')).includes('"zzzz"'));
    await p.fill('#plans-search-input', '@ana'); await p.waitForSelector('[data-plano-opcao]');
    const ops = await p.$$eval('[data-plano-opcao] [data-opcao-usuario]', l => l.map(e => e.textContent));
    L('@ana: 3 contas que contêm o termo, quem começa com ele primeiro', ops.length === 3 && ops[0] === '@ana' && ops[1] === '@anabela' && ops[2] === '@fabiana', ops);
    L('lista aberta, primeira opção ativa', await p.getAttribute('#plans-search-input', 'aria-expanded') === 'true' && await p.$eval('[data-plano-opcao][data-i="0"]', e => e.classList.contains('p-ativo')));
    L('lista aparece por cima do conteúdo (não corta a ficha)', await p.evaluate(() => { const l = document.getElementById('plans-search-list').getBoundingClientRect(); return l.height > 40 && getComputedStyle(document.getElementById('plans-search-list')).position === 'absolute'; }));
    await p.keyboard.press('ArrowDown');
    L('seta para baixo move a opção ativa e o aria-activedescendant', await p.$eval('[data-plano-opcao][data-i="1"]', e => e.classList.contains('p-ativo')) && await p.getAttribute('#plans-search-input', 'aria-activedescendant') === 'plans-opt-1');
    await p.keyboard.press('ArrowUp'); await p.keyboard.press('Escape');
    L('Esc fecha a lista', await p.$eval('#plans-search-list', e => e.hidden) && await p.getAttribute('#plans-search-input', 'aria-expanded') === 'false');
    await p.fill('#plans-search-input', '@ana'); await p.waitForSelector('[data-plano-opcao]'); await p.keyboard.press('Enter');
    await p.waitForSelector('[data-plan-role="teacher"]');
    L('Enter escolhe: ficha da conta com nome e usuário', (await p.innerText('#plans-account')).includes('Ana Souza') && (await p.innerText('#plans-account')).includes('@ana'));
    L('ficha: 3 interruptores desligados e Aluno explicado', (await p.$$eval('[data-plan-role]', l => l.length)) === 3 && (await p.$$eval('[data-plan-role]', l => l.every(i => !i.checked))) && (await p.innerText('#plans-account')).includes('vínculo'));
    L('ficha: campo mostra @ana e a lista fechou', (await p.inputValue('#plans-search-input')) === '@ana' && await p.$eval('#plans-search-list', e => e.hidden));
    await p.fill('#plans-search-input', 'fabi'); await p.waitForSelector('[data-plano-opcao]'); await p.click('[data-plano-opcao][data-i="0"]');
    await p.waitForFunction(() => document.getElementById('plans-account').textContent.includes('Fabiana'));
    L('clicar numa opção escolhe a conta', true);
    await p.fill('#plans-search-input', '@ana'); await p.waitForSelector('[data-plano-opcao]'); await p.keyboard.press('Enter'); await p.waitForFunction(() => document.getElementById('plans-account').textContent.includes('Ana Souza'));

    // ---- dar plano (sem confirmação) ----
    await p.click('[data-plan-role="teacher"]'); await p.waitForFunction(() => document.querySelector('[data-plan-role="teacher"]').getAttribute('aria-checked') === 'true');
    L('dar plano: chama a RPC certa, sem pedir confirmação', JSON.stringify(await rpcs('admin_grant_role')) === '[{"p_user":"S","p_role":"teacher","p_expires_at":null}]' && !(await dlg.count()));
    L('dar plano: o interruptor fica ligado e avisa', await p.$eval('[data-plan-role="teacher"]', i => i.checked));

    // ---- tirar plano (confirma) ----
    await p.click('[data-plan-role="teacher"]');
    L('tirar plano: pergunta com plano e @usuário, e nada foi tirado ainda', await dlg.isVisible() && (await dlg.innerText()).includes('Professora') && (await dlg.innerText()).includes('@ana') && (await rpcs('admin_revoke_role')).length === 0);
    await dlg.locator('button:not(.p-perigo)').click(); await p.waitForFunction(() => document.querySelector('[data-plan-role="teacher"]').checked);
    L('cancelar: o plano continua e o interruptor volta ligado', (await rpcs('admin_revoke_role')).length === 0 && await p.$eval('[data-plan-role="teacher"]', i => i.checked && i.getAttribute('aria-checked') === 'true'));
    await p.click('[data-plan-role="teacher"]'); await dlg.locator('.p-perigo').click();
    await p.waitForFunction(() => document.querySelector('[data-plan-role="teacher"]').getAttribute('aria-checked') === 'false');
    L('confirmar: chama a RPC e o interruptor desliga', (await rpcs('admin_revoke_role')).length === 1 && !(await p.$eval('[data-plan-role="teacher"]', i => i.checked)));
    await p.evaluate(() => { window.__falha = { rpc: 'admin_grant_role' }; });
    await p.click('[data-plan-role="premium_pro"]');     await p.waitForFunction(() => !document.querySelector('[data-plan-role="premium_pro"]').disabled);
    L('erro ao dar plano: o interruptor volta desligado', !(await p.$eval('[data-plan-role="premium_pro"]', i => i.checked)) && (await p.evaluate(() => window.__grants.length)) === 0);
    await p.evaluate(() => { window.__RPC.admin_get_account_roles = () => ({ roles: ['user', 'premium_basic'], admin: false }); });
    await p.fill('#plans-search-input', '@ana'); await p.waitForSelector('[data-plano-opcao]'); await p.keyboard.press('Enter'); await p.waitForFunction(() => document.querySelector('[data-plan-role="premium_basic"]')?.checked);
    await p.evaluate(() => { window.__falha = { rpc: 'admin_revoke_role' }; });
    await p.click('[data-plan-role="premium_basic"]'); await dlg.locator('.p-perigo').click(); await p.waitForFunction(() => !document.querySelector('[data-plan-role="premium_basic"]').disabled); await p.waitForTimeout(200);
    L('erro ao tirar plano: o interruptor volta ligado', await p.$eval('[data-plan-role="premium_basic"]', i => i.checked && i.getAttribute('aria-checked') === 'true'));
    await p.evaluate(() => { window.__RPC.admin_get_account_roles = (a) => ({ roles: ['user'].concat(window.__grants.filter(g => g[0] === a.p_user).map(g => g[1])), admin: a.p_user === 'A', grants: [] }); });

    // ---- conta admin ----
    await p.fill('#plans-search-input', '@brune'); await p.waitForSelector('[data-plano-opcao]'); await p.keyboard.press('Enter'); await p.waitForFunction(() => document.getElementById('plans-account').textContent.includes('Brune'));
    L('conta admin: mostra a nota de acesso a tudo', (await p.innerText('#plans-account')).includes('acesso a tudo'));

    // ---- matriz: ligar (sem confirmação) e desligar (confirma) ----
    await p.check(`${celula('user', 'rich_card_formats')} input[type=checkbox]`); await p.waitForFunction(() => document.querySelector('[data-plano-celula][data-role="user"][data-key="rich_card_formats"]').classList.contains('is-saved'));
    L('ligar permissão: grava na hora, sem confirmação, e marca como salvo', (await p.evaluate(() => window.__T.role_permissions.find(r => r.role === 'user' && r.permission_key === 'rich_card_formats').enabled)) === true && !(await dlg.count()));
    await p.uncheck(`${celula('user', 'rich_card_formats')} input[type=checkbox]`);
    L('desligar permissão: pergunta com a permissão e o tipo de conta', await dlg.isVisible() && (await dlg.innerText()).includes('Todos os tipos de cartão') && (await dlg.innerText()).includes('Grátis')); // Etapa 5: rótulo novo
    await dlg.locator('button:not(.p-perigo)').click(); await p.waitForFunction(() => document.querySelector('[data-plano-celula][data-role="user"][data-key="rich_card_formats"] input[type=checkbox]').checked);
    L('cancelar: a caixa volta ligada e o banco não mudou', await p.isChecked(`${celula('user', 'rich_card_formats')} input[type=checkbox]`) && (await p.evaluate(() => window.__T.role_permissions.find(r => r.role === 'user' && r.permission_key === 'rich_card_formats').enabled)) === true);
    await p.uncheck(`${celula('user', 'rich_card_formats')} input[type=checkbox]`); await dlg.locator('.p-perigo').click();
    await p.waitForFunction(() => window.__T.role_permissions.find(r => r.role === 'user' && r.permission_key === 'rich_card_formats').enabled === false);
    L('confirmar: desligou no banco', true);
    await p.uncheck(`${celula('premium_pro', 'tts_monthly_quota')} input[type=checkbox]`); await dlg.locator('.p-perigo').click();
    await p.waitForFunction(() => window.__T.role_permissions.find(r => r.role === 'premium_pro' && r.permission_key === 'tts_monthly_quota').enabled === false);
    L('permissão de número desligada: o campo de número desabilita', await p.isDisabled(`${celula('premium_pro', 'tts_monthly_quota')} [data-plano-limite]`));
    await p.check(`${celula('premium_pro', 'tts_monthly_quota')} input[type=checkbox]`); await p.waitForFunction(() => !document.querySelector('[data-plano-celula][data-role="premium_pro"][data-key="tts_monthly_quota"] [data-plano-limite]').disabled);
    await p.fill(`${celula('premium_pro', 'tts_monthly_quota')} [data-plano-limite]`, '600'); await p.press(`${celula('premium_pro', 'tts_monthly_quota')} [data-plano-limite]`, 'Tab');
    await p.waitForFunction(() => window.__T.role_permissions.find(r => r.role === 'premium_pro' && r.permission_key === 'tts_monthly_quota').limit_value === 600);
    L('número: grava 600', true);
    await p.fill(`${celula('premium_pro', 'tts_monthly_quota')} [data-plano-limite]`, ''); await p.press(`${celula('premium_pro', 'tts_monthly_quota')} [data-plano-limite]`, 'Tab');
    await p.waitForFunction(() => window.__T.role_permissions.find(r => r.role === 'premium_pro' && r.permission_key === 'tts_monthly_quota').limit_value === null);
    L('número vazio = sem limite (null)', true);
    await p.evaluate(() => { window.__falha = { rpc: 'admin_set_role_permission' }; });
    await p.click(`${celula('user', 'public_deck_import')} input[type=checkbox]`); await p.waitForTimeout(300);
    L('erro ao ligar: a caixa volta desligada e não marca como salvo', !(await p.isChecked(`${celula('user', 'public_deck_import')} input[type=checkbox]`)) && !(await p.$eval(celula('user', 'public_deck_import'), e => e.classList.contains('is-saved'))));
    if (OUT) await p.screenshot({ path: path.join(OUT, `planos-${lang}-${scheme}.png`), fullPage: true });

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchAdminPanelSection('premium')); await p.waitForSelector('[data-plano-matriz] tbody tr'); await p.waitForTimeout(300);
    L('celular: página sem rolagem horizontal (a matriz rola dentro do quadro)', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: a primeira coluna (nome da permissão) fica fixa ao rolar', await p.$eval('[data-plano-matriz] tbody th', e => getComputedStyle(e).position === 'sticky'));
    L('celular: o quadro da matriz rola na horizontal', await p.$eval('.p-tabela--matriz', e => e.scrollWidth > e.clientWidth));
    L('celular: caixas com área de toque de pelo menos 22px', await p.$$eval('[data-plano-celula] input[type=checkbox]', l => l.every(i => i.getBoundingClientRect().width >= 22)));
    if (OUT) await p.screenshot({ path: path.join(OUT, `planos-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- sem ser admin ----
  for (const lang of ['fr', 'zh']){
    const h = await abrirAdmin({ lang, aba: 'badges', seed: SEED, antes: ANTES });
    await h.page.evaluate(() => { isAdminUser = () => false; renderAdminPremiumView(); });
    check(`[${lang}] sem ser admin: só o aviso, sem busca nem matriz`, (await h.page.textContent('#admin-premium-content')).includes('Só a administração') && !(await h.page.$('#plans-search-input')));
    await h.close();
  }
  console.log(`painel-admin planos (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
