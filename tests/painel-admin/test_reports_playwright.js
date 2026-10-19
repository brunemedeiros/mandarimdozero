// Aba "Reports" do Painel de Admin (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Banco em memória e Edge Function simulada (tests/painel-admin/harness.js). Cobre: tabela com status em cor, filtros do servidor e busca
// sem perder o foco, janela de detalhe (contexto recolhido, captura só http), salvar status/prioridade/nota, responder por e-mail
// (pede confirmação, valida, falha), aviso de lista cortada, acesso negado e celular.
// Rodar: node tests/painel-admin/test_reports_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrirAdmin } = require('./harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const R = (id, o) => Object.assign({ id, kind: 'problema', category: 'bug_tecnico', description: 'Botão não responde ' + id, expected_behavior: null, severity_reported: null, language_app_key: 'frances', status: 'novo', priority: null, internal_note: null,
  created_at: `2026-10-${String(10 - id).padStart(2, '0')}T14:30:00Z`, user_id: null, reporter_email: null, screenshot_url: null, context: {} }, o || {});
const SEED = {
  reports: [
    R(1, { user_id: 'u1', description: 'O áudio da lição 3 corta no meio', expected_behavior: 'Tocar inteiro', severity_reported: 'dificulta', category: 'audio', context: { screen: 'path', browser: 'Chrome 120', viewport: { w: 390, h: 800 } }, screenshot_url: 'https://cdn.exemplo.com/print1.png' }),
    R(2, { kind: 'sugestao', category: 'sugestao_melhoria', description: 'Queria um modo escuro mais escuro', reporter_email: 'visitante@exemplo.com', status: 'resolvido', priority: 'baixa', language_app_key: 'mandarim', admin_reply_sent_at: '2026-10-09T10:00:00Z', admin_reply_subject: 'Obrigada!', admin_reply: 'Já está no ar.' }),
    R(3, { description: 'Convidado sem e-mail: tela branca', context: { screen: 'review' } }),
    R(4, { user_id: 'u2', description: 'Tradução errada: "ça va" <b>', category: 'traducao', status: 'em_analise', priority: 'alta' }),
    R(5, { description: 'Link perigoso na captura', screenshot_url: 'javascript:alert(1)', reporter_email: 'outro@exemplo.com' }),
  ],
  profiles: [{ user_id: 'u1', username: 'ana', display_name: 'Ana Souza' }, { user_id: 'u2', username: 'bruno', display_name: null }],
};
const ANTES = () => {
  window.__FN['report-reply-send'] = (b) => {
    const r = window.__T.reports.find(x => String(x.id) === String(b.report_id));
    if (!r) return { ok: false, error: 'report_not_found' };
    r.admin_reply_sent_at = new Date().toISOString(); r.admin_reply_subject = b.subject; r.admin_reply = b.body;
    return { ok: true, to: r.reporter_email || 'ana@exemplo.com' };
  };
};

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const h = await abrirAdmin({ lang, scheme, aba: 'reports', seed: SEED, antes: ANTES }); const p = h.page;
    await p.waitForSelector('[data-trp="pagina"]');
    const T = (n) => p.evaluate(x => window.__T[x].map(r => ({ ...r })), n);
    const rows = () => p.$$eval('[data-reports-lista] [data-report-row]', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const ids = () => p.$$eval('[data-reports-lista] [data-report-row]', l => l.map(e => e.dataset.reportRow).join());
    const dlg = p.locator('dialog.p-dialogo--alerta[open]');
    const det = p.locator('#dlg-report');

    // ---- quadro ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título, as 6 abas do Admin (a de Privacidade é temporária) e Reports ativa', (await p.innerText('[data-trp="pagina"] header')).includes('Reports') && JSON.stringify(await p.$$eval('#view-admin-badges [data-admin-section]', l => l.map(b => b.dataset.adminSection))) === '["badges","analytics","notifications","reports","premium","privacy"]' && await p.$eval('[data-admin-section="reports"]', b => b.classList.contains('is-active')));
    L('5 reports, o mais recente primeiro', (await rows()).length === 5 && (await ids()) === '1,2,3,4,5', await ids());
    const r1 = (await rows())[0];
    L('linha: categoria, trecho, nome da conta, Francês, tela, status Novo', r1.includes('Áudio') && r1.includes('O áudio da lição 3') && r1.includes('Ana Souza') && r1.includes('Francês') && r1.includes('Estudo') && r1.includes('Novo'), r1);
    L('sugestão resolvida: e-mail do convidado, Chinês, Resolvido, prioridade e "respondido"', (await rows())[1].includes('visitante@exemplo.com') && (await rows())[1].includes('Chinês') && (await rows())[1].includes('Resolvido') && (await rows())[1].includes('Baixa') && (await rows())[1].includes('respondido'));
    L('conta sem nome de exibição usa o @usuário? (usa o username)', (await rows())[3].includes('bruno'));
    L('convidado sem e-mail aparece como "convidada"', (await rows())[2].includes('convidada'));
    L('status em cor: Novo vermelho, Resolvido verde, Em análise amarelo', await p.evaluate(() => ['1:p-selo--erro', '2:p-selo--ok', '4:p-selo--aviso'].every(x => { const [id, c] = x.split(':'); return document.querySelector(`[data-report-row="${id}"] [data-status]`).classList.contains(c); })));
    L('HTML no texto aparece como texto', (await p.$$eval('[data-reports-lista] b', l => l.length)) === 0 && (await p.innerText('[data-reports-lista]')).includes('<b>'));
    L('contagem de reports', (await p.textContent('[data-reports-contagem]')).includes('5 reports'));

    // ---- filtros (servidor) e busca (navegador) ----
    await p.selectOption('[data-reports-status]', 'novo'); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 3); L('filtro por status Novo', (await ids()) === '1,3,5', await ids());
    await p.selectOption('[data-reports-status]', 'all'); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 5);
    await p.selectOption('[data-reports-tipo]', 'sugestao'); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 1); L('filtro só sugestões', (await ids()) === '2');
    await p.selectOption('[data-reports-tipo]', 'all');
    await p.selectOption('[data-reports-idioma]', 'mandarim'); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 1); L('filtro por idioma Chinês', (await ids()) === '2');
    await p.selectOption('[data-reports-idioma]', 'all'); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 5);
    L('os filtros do servidor não refazem a página (busca e foco ficam)', await p.$eval('[data-reports-busca]', e => !!e));
    await p.click('[data-reports-busca]'); await p.keyboard.type('audio'); L('busca sem acento acha "áudio"', (await ids()) === '1');
    L('campo de busca mantém foco e texto', await p.evaluate(() => document.activeElement === document.querySelector('[data-reports-busca]') && document.activeElement.value === 'audio'));
    await p.fill('[data-reports-busca]', 'visitante'); L('busca pelo e-mail do convidado', (await ids()) === '2');
    await p.fill('[data-reports-busca]', 'zzz'); L('sem resultado: mensagem de busca', (await p.textContent('[data-reports-lista]')).includes('Nenhum report com essa busca.'));
    await p.fill('[data-reports-busca]', 'ana'); await p.selectOption('[data-reports-status]', 'novo'); await p.waitForTimeout(250);
    L('a busca continua valendo depois de trocar o filtro do servidor', (await p.inputValue('[data-reports-busca]')) === 'ana' && (await ids()) === '1', await ids());
    await p.selectOption('[data-reports-status]', 'all'); await p.fill('[data-reports-busca]', ''); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 5);
    await p.selectOption('[data-reports-status]', 'recusado'); await p.waitForFunction(() => !document.querySelector('[data-report-row]'));
    L('filtro sem nenhum report: mensagem', (await p.textContent('[data-reports-lista]')).includes('Nenhum report encontrado com esse filtro.'));
    await p.selectOption('[data-reports-status]', 'all'); await p.waitForFunction(() => document.querySelectorAll('[data-report-row]').length === 5);

    // ---- detalhe ----
    await p.click('[data-ver-report="1"]');
    L('detalhe: janela com título, quem enviou e a descrição', await det.isVisible() && (await det.innerText()).includes('Problema') && (await det.innerText()).includes('Ana Souza') && (await det.innerText()).includes('O áudio da lição 3 corta no meio'));
    L('detalhe: esperava e gravidade percebida', (await det.innerText()).includes('Tocar inteiro') && (await det.innerText()).includes('Dificulta'));
    L('detalhe: contexto recolhido; abre e mostra as chaves e o objeto em JSON', !(await p.$eval('#dlg-report .p-automaticos', e => e.open)) && (await (async () => { await p.click('#dlg-report .p-automaticos summary'); return (await p.innerText('#dlg-report .p-contexto')).includes('Chrome 120') && (await p.innerText('#dlg-report .p-contexto')).includes('"w":390'); })()));
    L('detalhe: captura abre em outra aba sem vazar a origem', await p.$eval('#dlg-report a[href^="https://cdn.exemplo.com"]', a => a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer')));
    L('detalhe: status Novo e prioridade vazia', (await p.inputValue('#report-status')) === 'novo' && (await p.inputValue('#report-prioridade')) === '');
    await p.selectOption('#report-status', 'confirmado'); await p.selectOption('#report-prioridade', 'critica'); await p.fill('#report-nota', 'reproduzi no celular');
    await p.evaluate(() => { window.__falha = { tabela: 'reports', op: 'update' }; }); await p.click('#form-report button[type=submit]'); await p.waitForFunction(() => document.getElementById('report-erro').textContent.length > 0);
    L('erro ao salvar: avisa e a janela fica aberta com o que foi escolhido', (await p.textContent('#report-erro')).includes('salvar') && await det.isVisible() && (await p.inputValue('#report-status')) === 'confirmado');
    await p.click('#form-report button[type=submit]'); await p.waitForSelector('#dlg-report', { state: 'detached' });
    const e1 = (await T('reports')).find(r => r.id === 1);
    L('salvar: grava status, prioridade e nota; a gravidade percebida nunca muda', e1.status === 'confirmado' && e1.priority === 'critica' && e1.internal_note === 'reproduzi no celular' && e1.severity_reported === 'dificulta', e1);
    await p.waitForFunction(() => document.querySelector('[data-report-row="1"] [data-status]').textContent.includes('Confirmado'));
    L('a lista mostra o status novo e a prioridade', (await rows())[0].includes('Confirmado') && (await rows())[0].includes('Crítica'));
    await p.click('[data-ver-report="1"]'); await p.fill('#report-nota', ''); await p.selectOption('#report-prioridade', ''); await p.click('#form-report button[type=submit]'); await p.waitForSelector('#dlg-report', { state: 'detached' });
    L('limpar nota e prioridade grava null', (await T('reports')).find(r => r.id === 1).internal_note === null && (await T('reports')).find(r => r.id === 1).priority === null);
    await p.click('[data-ver-report="5"]');
    L('captura com javascript: não vira link', (await p.$$eval('#dlg-report a[href^="javascript"]', l => l.length)) === 0 && (await det.innerText()).includes('sem captura anexada'));
    await p.click('#dlg-report [data-fechar-dialogo] >> nth=0'); await p.waitForSelector('#dlg-report', { state: 'detached' });

    // ---- responder ----
    await p.click('[data-ver-report="2"]');
    L('já respondido: mostra a última resposta com a data e o e-mail', (await det.innerText()).includes('Última resposta enviada') && (await det.innerText()).includes('visitante@exemplo.com') && (await det.innerText()).includes('Já está no ar.'));
    await p.click('#dlg-report [data-fechar-dialogo] >> nth=0'); await p.waitForSelector('#dlg-report', { state: 'detached' });
    await p.click('[data-ver-report="3"]');
    L('convidado sem e-mail: sem campos de resposta e com o aviso', !(await p.$('#report-resp-enviar')) && (await det.innerText()).includes('não é possível responder'));
    await p.click('#dlg-report [data-fechar-dialogo] >> nth=0'); await p.waitForSelector('#dlg-report', { state: 'detached' });
    await p.click('[data-ver-report="4"]');
    await p.click('#report-resp-enviar'); L('resposta vazia: pede assunto e mensagem, sem confirmar nem enviar', (await p.textContent('#report-resp-erro')).includes('assunto') && !(await dlg.count()) && (await p.evaluate(() => window.__fnLog.length)) === 0);
    await p.fill('#report-resp-assunto', 'Sobre a sua tradução'); await p.fill('#report-resp-msg', 'Obrigada por avisar! Corrigimos.');
    await p.click('#report-resp-enviar');
    L('enviar pede confirmação com quem recebe e o assunto; nada foi enviado ainda', await dlg.isVisible() && (await dlg.innerText()).includes('bruno') && (await dlg.innerText()).includes('Sobre a sua tradução') && (await p.evaluate(() => window.__fnLog.length)) === 0);
    await dlg.locator('button.secondary').click(); await p.waitForTimeout(250);
    L('Voltar: não envia e mantém o que foi escrito', (await p.evaluate(() => window.__fnLog.length)) === 0 && (await p.inputValue('#report-resp-msg')) === 'Obrigada por avisar! Corrigimos.' && await det.isVisible());
    await p.evaluate(() => { window.__falha = { fn: 'report-reply-send' }; });
    await p.click('#report-resp-enviar'); await dlg.locator('button:not(.secondary)').click();
    await p.waitForFunction(() => document.getElementById('report-resp-erro').textContent.length > 0);
    L('falha ao enviar: mensagem amigável e a janela fica', (await p.textContent('#report-resp-erro')).includes('Não foi possível enviar') && await det.isVisible());
    await p.click('#report-resp-enviar'); await dlg.locator('button:not(.secondary)').click();
    await p.waitForSelector('#dlg-report', { state: 'detached' });
    const fnLog = await p.evaluate(() => window.__fnLog.filter(x => x[0] === 'report-reply-send').map(x => x[1]));
    const sent = fnLog[fnLog.length - 1];
    L('confirmar: chama a função com o report, o assunto e a mensagem', String(sent.report_id) === '4' && sent.subject === 'Sobre a sua tradução' && sent.body === 'Obrigada por avisar! Corrigimos.', sent);
    await p.waitForFunction(() => document.querySelector('[data-report-row="4"]').textContent.includes('respondido'));
    L('a lista marca como respondido', true);
    await p.evaluate(() => { window.__FN['report-reply-send'] = () => ({ ok: false, error: 'no_email' }); });
    await p.click('[data-ver-report="1"]'); await p.fill('#report-resp-assunto', 'x'); await p.fill('#report-resp-msg', 'y'); await p.click('#report-resp-enviar'); await dlg.locator('button:not(.secondary)').click();
    await p.waitForFunction(() => document.getElementById('report-resp-erro').textContent.length > 0);
    L('erro conhecido da função: texto do código (sem e-mail), nunca o código cru', (await p.textContent('#report-resp-erro')).includes('Sem e-mail') && !(await p.textContent('#report-resp-erro')).includes('no_email'));
    await p.click('#dlg-report [data-fechar-dialogo] >> nth=0'); await p.waitForSelector('#dlg-report', { state: 'detached' });
    if (OUT) await p.screenshot({ path: path.join(OUT, `reports-${lang}-${scheme}.png`), fullPage: true });
    await p.click('[data-ver-report="1"]'); await p.click('#dlg-report .p-automaticos summary'); await p.waitForTimeout(200);
    if (OUT) await p.screenshot({ path: path.join(OUT, `reports-detalhe-${lang}-${scheme}.png`) });
    await p.click('#dlg-report [data-fechar-dialogo] >> nth=0'); await p.waitForSelector('#dlg-report', { state: 'detached' });

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchAdminPanelSection('reports')); await p.waitForSelector('[data-trp="pagina"]'); await p.waitForTimeout(300);
    L('celular: sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    await p.click('[data-ver-report="1"]'); await p.waitForTimeout(250);
    L('celular: a janela de detalhe cabe na tela', await p.evaluate(() => { const a = document.querySelector('#dlg-report article').getBoundingClientRect(); return a.left >= 0 && a.right <= window.innerWidth + 1; }));
    if (OUT) await p.screenshot({ path: path.join(OUT, `reports-mobile-${lang}-${scheme}.png`) });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- lista cortada, sem ser admin, sem reports ----
  for (const lang of ['fr', 'zh']){
    let h = await abrirAdmin({ lang, aba: 'badges', seed: { reports: Array.from({ length: 205 }, (_, i) => R(i + 1, { created_at: new Date(2026, 9, 1, 0, i).toISOString() })), profiles: [] } });
    await h.page.evaluate(() => switchAdminPanelSection('reports')); await h.page.waitForSelector('[data-trp="pagina"]');
    check(`[${lang}] 205 reports: mostra os 200 mais recentes e avisa`, (await h.page.$$eval('[data-report-row]', l => l.length)) === 200 && (await h.page.textContent('[data-reports-contagem]')).includes('200 mais recentes'));
    await h.close();
    h = await abrirAdmin({ lang, aba: 'premium', seed: SEED });
    await h.page.evaluate(() => { isAdminUser = () => false; renderAdminReportsView(); });
    check(`[${lang}] sem ser admin: só o aviso`, (await h.page.textContent('#admin-reports-content')).includes('só para a administração') && !(await h.page.$('[data-reports-lista]')));
    await h.close();
    h = await abrirAdmin({ lang, aba: 'reports', seed: { reports: [], profiles: [] } });
    await h.page.waitForSelector('[data-trp="pagina"]');
    check(`[${lang}] sem reports: estado vazio`, (await h.page.textContent('[data-reports-lista]')).includes('Nenhum report encontrado'));
    await h.close();
  }
  console.log(`painel-admin reports (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
