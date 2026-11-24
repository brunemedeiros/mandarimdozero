// Aba "Visão Geral" do Painel de Admin (Central de Controle) no navegador real: FR + ZH x claro/escuro + celular.
// Banco em memória (tests/painel-admin/harness.js) com as RPCs da migration 145 simuladas e os 7 alunos de exemplo da aba Alunos
// (tests/painel-alunos/harness.js: 3 Em dia, 1 Atenção, 2 Parado, 1 Sem estudo). Cobre: aba no lugar de Badges, filtros mandam os
// parâmetros certos, números, gráficos acessíveis, faixa clicável com lista e atalho para a ficha, Situação igual à da aba Alunos,
// Revisões só em Meus alunos, erro com "Tentar de novo", acesso negado e celular sem rolagem lateral.
// Rodar: node tests/central-de-controle/test_overview_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const { abrirAdmin } = require('../painel-admin/harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const ANTES = () => {
  const day = n => { const d = new Date(Date.now() - n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  window.__RPC.admin_overview_stats = (a) => {
    const n = a.p_days;
    const mine = a.p_scope === 'mine';
    return {
      today: day(0), days: n, scope: a.p_scope, language: a.p_language,
      totals: { accounts: mine ? 7 : 25, active: mine ? 5 : 12, new_accounts: 3, premium: 0, engagement_avg: mine ? 2.6 : 1.2 },
      series: Array.from({ length: n }, (_, i) => ({ day: day(n - 1 - i), sessions: (i % 7) + 1, active: i % 4, new_accounts: i === n - 1 ? 2 : 0 })),
      engagement: {
        nenhum: [{ user_id: 's7', display_name: 'Novo Aluno', username: 'novato', days: 0, new_account: true }],
        baixo: [], medio: [{ user_id: 's1', display_name: 'Marina Alves', username: 'marina.alves', days: 3, new_account: false }, { user_id: 's2', display_name: 'Rafael Costa', username: 'rafa.costa', days: 2, new_account: false }],
        alto: [{ user_id: 's5', display_name: '<img src=x onerror=alert(1)>', username: 'cafer', days: 5, new_account: false }], altissimo: [],
      },
      plans: { free: mine ? 7 : 25, premium: 0 },
    };
  };
  window.__RPC.admin_overview_reviews = (a) => ({ days: a.p_days, totals: { home: 130, class: 24 },
    students: [{ user_id: 's1', display_name: 'Marina Alves', username: 'marina.alves', home: 100, class: 20 }, { user_id: 's2', display_name: 'Rafael Costa', username: 'rafa.costa', home: 30, class: 4 }] });
  window.__RPC.get_teacher_student_overview = (a) => window.__OV(a.p_student_id);
  window.__RPC.get_teacher_student_restarts = () => ({ restarts: [] });
};

(async () => {
  for (const [lang, scheme, width] of [['fr', 'light', 1280], ['fr', 'dark', 1280], ['zh', 'light', 1280], ['zh', 'dark', 1280], ['fr', 'light', 390]]){
    const tag = `[${lang}/${scheme}/${width}]`;
    const L = (n, c, x) => check(`${tag} ${n}`, c, x);
    const h = await abrirAdmin({ lang, scheme, width, height: width < 500 ? 900 : 1000, aba: 'overview', antes: ANTES }); const p = h.page;
    await p.waitForSelector('[data-aov="numeros"]');
    const rpcs = (nome) => p.evaluate(n => window.__rpcLog.filter(x => x[0] === n).map(x => x[1]), nome);
    const shot = async (nome) => { if (OUT) await p.screenshot({ path: `${OUT}/${lang}-${scheme}-${width}-${nome}.png`, fullPage: true }); };

    // ---- aba ----
    L('6 abas do Admin com Visão Geral no lugar de Badges, e ela ativa', JSON.stringify(await p.$$eval('#view-admin-badges [data-admin-section]', l => l.map(b => b.dataset.adminSection))) === '["overview","analytics","notifications","reports","premium","privacy"]'
      && await p.$eval('[data-admin-section="overview"]', b => b.classList.contains('is-active') && b.textContent.trim() === 'Visão Geral'));
    L('subtítulo do painel não fala mais de Badges', !(await p.textContent('#view-admin-badges .path-header p')).includes('Badges'));
    L('só a Visão Geral aparece (o antigo contêiner de Badges fica escondido)', await p.$eval('#admin-overview-content', e => e.style.display !== 'none') && await p.$eval('#admin-badges-content', e => e.style.display === 'none'));
    L('abre em Meus alunos, 30 dias, todos os idiomas', JSON.stringify((await rpcs('admin_overview_stats'))[0]) === JSON.stringify({ p_days: 30, p_scope: 'mine', p_language: 'all' }), await rpcs('admin_overview_stats'));

    // ---- números e gráficos ----
    const numeros = await p.innerText('[data-aov="numeros"]');
    L('números: Alunos 7, estudaram 5, engajamento 2,6, cadastros 3, Premium 0', ['Alunos', '7', '5', '2,6', 'Cadastros novos', 'Premium'].every(x => numeros.includes(x)), numeros);
    L('2 gráficos com nome para leitor de tela e tabela escondida', (await p.$$eval('[data-aov-grafico] svg[role="img"][aria-label]', l => l.length)) === 2 && (await p.$$eval('[data-aov-grafico] table.p-so-leitor', l => l.length)) === 2);
    L('tabela escondida tem os 30 dias', (await p.$$eval('[data-aov-grafico="atividade"] table tbody tr', l => l.length)) === 30);
    L('linhas desenhadas com cor de token (não preto padrão)', await p.$eval('[data-aov-grafico="atividade"] polyline.aov-serie--acessos', e => { const c = getComputedStyle(e).stroke; return c && c !== 'none' && c !== 'rgb(0, 0, 0)'; }));

    // ---- engajamento ----
    L('5 faixas; vazias desabilitadas', (await p.$$eval('[data-aov-faixa]', l => l.length)) === 5 && await p.$eval('[data-aov-faixa="baixo"]', b => b.disabled) && !(await p.$eval('[data-aov-faixa="medio"]', b => b.disabled)));
    await p.click('[data-aov-faixa="medio"]');
    L('clicar em Médio abre a lista com as 2 pessoas e marca aria-expanded', await p.$eval('[data-aov-faixa="medio"]', b => b.getAttribute('aria-expanded') === 'true') && (await p.$$eval('[data-aov-faixa-lista="medio"] .aov-pessoa', l => l.length)) === 2);
    L('foco volta para o botão da faixa', await p.evaluate(() => document.activeElement && document.activeElement.dataset.aovFaixa === 'medio'));
    await shot('faixa-aberta');
    await p.click('[data-aov-faixa="alto"]');
    L('abrir outra faixa fecha a anterior', !(await p.$('[data-aov-faixa-lista="medio"] .aov-pessoa')) && (await p.$$eval('[data-aov-faixa-lista="alto"] .aov-pessoa', l => l.length)) === 1);
    L('nome vindo do banco é texto (sem <img> injetado)', !(await p.$('[data-aov-faixa-lista="alto"] img')) && (await p.textContent('[data-aov-faixa-lista="alto"]')).includes('<img'));
    await p.keyboard.press('Enter');
    L('Enter no botão da faixa fecha a lista (teclado)', await p.$eval('[data-aov-faixa="alto"]', b => b.getAttribute('aria-expanded') === 'false'));

    // ---- Situação (mesma regra e mesmos números da aba Alunos) ----
    await p.waitForSelector('[data-aov="situacao"] [data-aov-sit]');
    const sit = await p.$$eval('[data-aov-sit]', l => Object.fromEntries(l.map(b => [b.dataset.aovSit, b.querySelector('b').textContent])));
    L('Situação: Em dia 3, Atenção 1, Parado 2, Sem estudo 1 (igual à aba Alunos)', JSON.stringify(sit) === JSON.stringify({ ok: '3', warn: '1', stopped: '2', none: '1' }), sit);
    const tsu = await p.evaluate(() => { const r = tsuSummary(ADMIN_OVERVIEW.situation.rows); return [r.stopped, r.warn]; });
    L('Situação confere com o resumo da própria aba Alunos (tsuSummary)', tsu[0] === 2 && tsu[1] === 1, tsu);
    L('Situação explica a diferença dos Desafios', (await p.textContent('[data-aov="situacao"]')).includes('Desafios e Ditados'));
    await p.click('[data-aov-sit="stopped"]');
    const parados = await p.$$eval('[data-aov-sit-lista] .aov-pessoa b', l => l.map(e => e.textContent));
    L('clicar em Parado lista Helena e Bruno', parados.length === 2 && parados.includes('Helena Duarte') && parados.includes('Bruno Teles'), parados);

    // ---- Revisões ----
    const rev = await p.innerText('[data-aov="revisoes"]');
    L('Revisões: Em casa 130 e Na aula 24, por aluno', rev.includes('130') && rev.includes('24') && rev.includes('Marina Alves') && rev.includes('Rafael Costa'), rev);
    L('Plano: Grátis e Premium com a nota do futuro', (await p.textContent('[data-aov="plano"]')).includes('pagamento pendente'));
    L('rodapé: horário de Brasília', (await p.textContent('[data-aov="fuso"]')).includes('Brasília'));
    L('sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
    await shot('meus-alunos');

    // ---- filtros ----
    await p.click('[data-aov-quem="others"]'); await p.waitForFunction(() => document.querySelector('[data-aov="numeros"]') && !document.querySelector('[data-aov="situacao"]'));
    L('Outras contas: pede scope=others, sem Situação e sem Revisões, diz "Contas"', (await rpcs('admin_overview_stats')).slice(-1)[0].p_scope === 'others' && !(await p.$('[data-aov="revisoes"]')) && (await p.innerText('[data-aov="numeros"]')).includes('Contas')
      && await p.$eval('[data-aov-quem="others"]', b => b.getAttribute('aria-pressed') === 'true'));
    await p.click('[data-aov-faixa="medio"]');
    L('Outras contas: lista sem "Abrir ficha" (sem vínculo)', !(await p.$('[data-aov-ficha]')));
    await p.click('[data-aov-periodo="7"]'); await p.waitForFunction(() => document.querySelectorAll('[data-aov-grafico="atividade"] table tbody tr').length === 7);
    L('7 dias: pede p_days 7 e o gráfico tem 7 dias', (await rpcs('admin_overview_stats')).slice(-1)[0].p_days === 7);
    await p.click('[data-aov-idioma="portugues"]'); await p.waitForSelector('[data-aov="numeros"]');
    L('Português fica no filtro e manda p_language portugues', (await rpcs('admin_overview_stats')).slice(-1)[0].p_language === 'portugues');

    // ---- erro e "Tentar de novo" ----
    await p.evaluate(() => { window.__falha = { rpc: 'admin_overview_stats' }; });
    await p.click('[data-aov-periodo="90"]'); await p.waitForSelector('[data-aov="erro"]');
    L('falha: aviso de erro, sem números falsos', !(await p.$('[data-aov="numeros"]')) && (await p.textContent('[data-aov="erro"]')).includes('Não foi possível'));
    await p.click('[data-aov-tentar]'); await p.waitForSelector('[data-aov="numeros"]');
    L('Tentar de novo carrega os 90 dias', (await rpcs('admin_overview_stats')).slice(-1)[0].p_days === 90 && (await p.$$eval('[data-aov-grafico="atividade"] table tbody tr', l => l.length)) === 90);

    // ---- atalho para a ficha ----
    await p.click('[data-aov-quem="mine"]'); await p.waitForSelector('[data-aov-faixa="medio"]');
    await p.click('[data-aov-faixa="medio"]');
    await p.click('[data-aov-faixa-lista="medio"] [data-aov-ficha="s1"]');
    await p.waitForSelector('[data-tsu="ficha"]', { timeout: 5000 }).catch(() => {});
    L('"Abrir ficha" leva à ficha da aluna na aba Alunos', await p.evaluate(() => document.getElementById('view-teacher-panel').classList.contains('active') && !!document.querySelector('[data-tsu="ficha"]') && document.querySelector('[data-tsu="ficha"] h2').textContent.includes('Marina')));

    // ---- sem ser admin ----
    await p.evaluate(() => { isAdminUser = () => false; window.__rpcLog = []; renderAdminOverviewView(); });
    L('sem ser admin: só o aviso, sem chamar o banco', (await p.textContent('#admin-overview-content')).includes('administração') && (await rpcs('admin_overview_stats')).length === 0);

    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }
  console.log(`central-de-controle visão geral (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
