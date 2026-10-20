// Aba "Analytics" do Painel de Admin (Design System do painel) no navegador real, FR + ZH x claro/escuro + celular.
// Banco em memória (tests/painel-admin/harness.js) com eventos de uso relativos a hoje. Cobre: indicadores do Resumo, filtros (período,
// idioma, dispositivo, datas, comparação), as 11 sub-abas, carregamento sob demanda e cache (Retenção, Engajamento, Tecnologia),
// aviso quando a consulta chega ao teto, texto de evento sem executar HTML, interruptor de excluir minha atividade, acesso negado e celular.
// Rodar: node tests/painel-admin/test_analytics_playwright.js   (SHOT_DIR=/tmp/x salva capturas)
const path = require('path');
const { abrirAdmin } = require('./harness.js');
const OUT = process.env.SHOT_DIR || null;
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

const d = (n, hm) => { const x = new Date(); x.setUTCDate(x.getUTCDate() - n); return `${x.toISOString().slice(0, 10)}T${hm || '12:00:00'}Z`; };
const E = (user, type, name, n, hm, o) => Object.assign({ user_id: user, actor_type: 'user', language_app_key: 'frances', event_type: type, event_name: name, meta: {}, created_at: d(n, hm), session_id: null, device_type: null, browser: null, os: null }, o || {});
const EVENTS = [
  E('u1', 'lesson_start', 'flashcard_review', 2, '10:00:00', { session_id: 's1', device_type: 'mobile', browser: 'Chrome', os: 'Android' }),
  E('u1', 'lesson_complete', 'flashcard_review', 2, '10:10:00', { session_id: 's1', device_type: 'mobile', browser: 'Chrome', os: 'Android' }),
  E('u1', 'lesson_complete', 'vocab_lesson', 2, '10:20:00', { session_id: 's1', meta: { scorePct: 90, unitId: 'A1-1', lessonIdx: 0 } }),
  E('u1', 'lesson_complete', 'unit_checkpoint', 3, '09:00:00', { session_id: 's2', meta: { scorePct: 70, unitId: 'A1-1' } }),
  E('u2', 'lesson_start', 'flashcard_review', 2, '11:00:00', { session_id: 's3', device_type: 'desktop', browser: 'Firefox', os: 'Linux' }),
  E('u2', 'tab_switch', 'review', 2, '11:01:00', { session_id: 's3' }),
  E('u2', 'tab_switch', 'leaderboard', 5, '11:00:00', { session_id: 's4', browser: '<img src=x onerror=alert(1)>' }),
  E('u3', 'lesson_complete', 'dictation', 1, '08:00:00', { language_app_key: 'mandarim', meta: { score: 60 } }),
  E('u1', 'technical_error', 'js_error', 2, '10:30:00'), E('u1', 'technical_error', 'js_error', 2, '10:31:00'),
  E('u1', 'technical_perf', 'page_load', 2, '10:00:00', { meta: { loadMs: 1200 } }), E('u1', 'technical_perf', 'page_load', 3, '10:00:00', { meta: { loadMs: 2800 } }),
  E('adm', 'lesson_complete', 'vocab_lesson', 2, '10:00:00', { actor_type: 'admin' }),
  E('u2', 'lesson_complete', 'flashcard_review', 40, '10:00:00'),   // só no período anterior (para a comparação)
];
const SEED = {
  usage_events: EVENTS,
  profiles: [{ user_id: 'T', username: 'brune', created_at: d(300), exclude_own_activity: true }, { user_id: 'u1', created_at: d(10) }, { user_id: 'u2', created_at: d(45) }, { user_id: 'u3', created_at: d(1) }],
  badge_grants: [{ user_id: 'u1', badge_id: 'colab', granted_at: d(1) }, { user_id: 'u1', badge_id: 'beta', granted_at: d(2) }, { user_id: 'u2', badge_id: 'colab', granted_at: d(1) }],
};
const ANTES = () => {
  PROFILE_CACHE = { user_id: 'T', exclude_own_activity: true };
  window.__T.weekly_xp = [{ user_id: 'u1', amount: 100, language_app_key: 'frances', week_start: analyticsCurrentWeekStart() }, { user_id: 'u2', amount: 50, language_app_key: 'frances', week_start: analyticsCurrentWeekStart() }];
  window.__fromLog = [];
  const orig = supabaseClient.from; supabaseClient.from = (n) => { window.__fromLog.push(n); return orig(n); };
};

(async () => {
  for (const [lang, scheme] of [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']]){
    const L = (n, c, x) => check(`[${lang}/${scheme}] ${n}`, c, x);
    const h = await abrirAdmin({ lang, scheme, aba: 'analytics', seed: SEED, antes: ANTES }); const p = h.page;
    await p.waitForSelector('[data-tan="pagina"]');
    const reads = (table) => p.evaluate(n => window.__fromLog.filter(x => x === n).length, table);
    const kpi = (label) => p.evaluate(l => { const a = [...document.querySelectorAll('[data-analytics-panel]:not([style*="none"]) .p-indicador')].find(e => e.querySelector('.p-indicador-rotulo').textContent.trim() === l); return a ? a.querySelector('.p-indicador-valor').innerText.replace(/\s+/g, ' ').trim() : null; }, label);
    const visiblePanel = () => p.evaluate(() => [...document.querySelectorAll('[data-analytics-panel]')].filter(e => e.style.display !== 'none').map(e => e.dataset.analyticsPanel).join());
    const go = async (tab) => { await p.click(`[data-analytics-tab="${tab}"]`); await p.waitForFunction(t => [...document.querySelectorAll('[data-analytics-panel]')].filter(e => e.style.display !== 'none').map(e => e.dataset.analyticsPanel).join() === t && !document.querySelector(`[data-analytics-panel="${t}"] .p-carregando`), tab); };
    const render = async (fn) => { await p.evaluate(() => { window.__r = 0; }); await fn(); await p.waitForFunction(() => document.querySelector('[data-tan="pagina"] [data-analytics-panel="resumo"]') && !document.querySelector('.p-carregando'), null, { timeout: 8000 }); await p.waitForTimeout(150); };

    // ---- quadro ----
    L('tela cheia: sem Ranking ao lado', await p.evaluate(() => getComputedStyle(document.querySelector('.right-cards')).display === 'none'));
    L('título, as 6 abas do Admin (a de Privacidade é temporária) e Analytics ativa', (await p.innerText('[data-tan="pagina"] header')).includes('Analytics') && JSON.stringify(await p.$$eval('#view-admin-badges [data-admin-section]', l => l.map(b => b.dataset.adminSection))) === '["badges","analytics","notifications","reports","premium","privacy"]' && await p.$eval('[data-admin-section="analytics"]', b => b.classList.contains('is-active')));
    L('11 sub-abas, Resumo aberta e só o painel dela visível', (await p.$$eval('[data-analytics-tab]', l => l.length)) === 11 && (await visiblePanel()) === 'resumo' && await p.$eval('[data-analytics-tab="resumo"]', a => a.getAttribute('aria-current') === 'page'));
    L('filtros: Últimos 30 dias, todos os idiomas e dispositivos; comparação desligada', (await p.inputValue('#analytics-period-select')) === 'last30' && (await p.inputValue('#analytics-language-select')) === 'all' && (await p.inputValue('#analytics-device-select')) === 'all' && !(await p.isChecked('#analytics-compare-switch')));
    L('linha do período mostra de e até', (await p.textContent('[data-analytics-periodo]')).includes(' – '));

    // ---- Resumo (só alunos: o evento da admin e os técnicos ficam de fora) ----
    L('alunos ativos 3 (u1, u2, u3; a admin não conta)', (await kpi('Alunos ativos')) === '3', await kpi('Alunos ativos'));
    L('novos alunos 2 (u1 e u3; a conta da admin não conta)', (await kpi('Novos alunos')) === '2', await kpi('Novos alunos'));
    L('sessões 4', (await kpi('Sessões')) === '4', await kpi('Sessões'));
    L('exercícios iniciados 2 e concluídos 4', (await kpi('Exercícios iniciados')) === '2' && (await kpi('Exercícios concluídos')) === '4', [await kpi('Exercícios iniciados'), await kpi('Exercícios concluídos')]);
    L('taxa de conclusão 100% e tempo estimado 21min', (await kpi('Taxa de conclusão')) === '100%' && (await kpi('Tempo de estudo (estimado)')) === '21min', [await kpi('Taxa de conclusão'), await kpi('Tempo de estudo (estimado)')]);
    L('sem comparação: sem setas de variação', (await p.$$eval('[data-analytics-panel="resumo"] .p-indicador-valor .p-selo', l => l.length)) === 0);

    // ---- comparação ----
    await render(async () => { await p.click('#analytics-compare-switch'); });
    L('comparação: alunos ativos 3 contra 1 = ▲ 200%; novos 2 contra 1 = ▲ 100%', (await kpi('Alunos ativos')).includes('▲ 200%') && (await kpi('Novos alunos')).includes('▲ 100%'), [await kpi('Alunos ativos'), await kpi('Novos alunos')]);
    L('comparação ligada: o interruptor e a linha do período mostram o período anterior', await p.isChecked('#analytics-compare-switch') && (await p.textContent('[data-analytics-periodo]')).includes('comparando com'));
    await render(async () => { await p.click('#analytics-compare-switch'); });
    L('comparação desligada: as setas somem', (await p.$$eval('[data-analytics-panel="resumo"] .p-indicador-valor .p-selo', l => l.length)) === 0);

    // ---- filtros ----
    await render(async () => { await p.selectOption('#analytics-language-select', 'mandarim'); });
    L('idioma Chinês: só o ditado do u3 (1 aluno ativo)', (await kpi('Alunos ativos')) === '1', await kpi('Alunos ativos'));
    await render(async () => { await p.selectOption('#analytics-language-select', 'all'); await p.selectOption('#analytics-device-select', 'mobile'); });
    L('dispositivo celular: só o u1 (1 aluno ativo, 2 eventos de exercício)', (await kpi('Alunos ativos')) === '1', await kpi('Alunos ativos'));
    await render(async () => { await p.selectOption('#analytics-device-select', 'all'); await p.selectOption('#analytics-period-select', 'today'); });
    L('período Hoje: sem eventos, o aviso aparece', (await p.textContent('[data-tan="pagina"]')).includes('Nenhum evento de aluno registrado'));
    L('Hoje: alunos ativos 0', (await kpi('Alunos ativos')) === '0');
    await render(async () => { await p.selectOption('#analytics-period-select', 'custom'); });
    L('período personalizado: aparecem as duas datas', !!(await p.$('#analytics-custom-since')) && !!(await p.$('#analytics-custom-until')));
    await render(async () => { await p.fill('#analytics-custom-since', d(4).slice(0, 10)); await p.press('#analytics-custom-since', 'Tab'); });
    await render(async () => { await p.fill('#analytics-custom-until', d(0).slice(0, 10)); await p.press('#analytics-custom-until', 'Tab'); });
    L('de 4 dias atrás até hoje: u1, u2 (dia 2) e u3 (dia 1); o evento do dia 5 do u2 fica de fora', (await kpi('Alunos ativos')) === '3' && (await kpi('Sessões')) === '3', [await kpi('Alunos ativos'), await kpi('Sessões')]);
    await render(async () => { await p.selectOption('#analytics-period-select', 'last30'); });
    L('voltar para 30 dias: números de antes', (await kpi('Alunos ativos')) === '3');

    // ---- sub-abas (sem consulta nova nas comuns) ----
    const before = await reads('usage_events');
    await go('atividade');
    L('Atividade: novos x recorrentes (u1 e u3 novos no período, u2 recorrente) e barras por dia', (await p.innerText('[data-analytics-panel="atividade"]')).includes('Alunos ativos por dia') && (await p.$$eval('[data-analytics-panel="atividade"] .p-barra', l => l.length)) >= 3);
    await go('navegacao'); L('Navegação: 2 áreas (revisão e ranking) e as funcionalidades com rótulo', (await p.$$eval('[data-analytics-panel="navegacao"] article:first-of-type .p-barra-linha', l => l.length)) === 2 && (await p.innerText('[data-analytics-panel="navegacao"]')).includes('Sessão de flashcards'));
    await go('exercicios');
    L('Exercícios: tabela por tipo e funil só com tipos com início', (await p.$$eval('[data-analytics-panel="exercicios"] tbody tr', l => l.length)) === 4 && (await p.$$eval('[data-analytics-panel="exercicios"] .p-funil-linha', l => l.length)) >= 1);
    await go('progressao'); L('Progressão: 3 blocos', (await p.$$eval('[data-analytics-panel="progressao"] article', l => l.length)) === 3);
    await go('idioma'); L('Idioma: 2 barras (francês e chinês)', (await p.$$eval('[data-analytics-panel="idioma"] .p-barra-linha', l => l.length)) === 2);
    await go('dispositivos');
    L('Dispositivos: celular, desktop e desconhecido; navegador com HTML aparece como texto', (await p.innerText('[data-analytics-panel="dispositivos"]')).includes('<img src=x onerror=alert(1)>') && (await p.$$eval('[data-analytics-panel="dispositivos"] img', l => l.length)) === 0);
    L('trocar entre sub-abas comuns não consulta o banco de novo', (await reads('usage_events')) === before, [before, await reads('usage_events')]);

    // ---- sob demanda ----
    await go('retencao');
    L('Retenção: carregou a tabela de coortes na primeira vez', (await p.$$eval('[data-analytics-panel="retencao"] tbody tr', l => l.length)) >= 1 && (await reads('usage_events')) > before);
    const afterRet = await reads('usage_events');
    await go('resumo'); await go('retencao');
    L('Retenção de novo: vem do cache (nenhuma consulta nova)', (await reads('usage_events')) === afterRet);
    await go('engajamento');
    L('Engajamento: XP da semana 150, média pelos 3 ativos = 50, 3 badges', (await kpi('XP total (semana atual)')) === '150' && (await kpi('XP médio/aluno (semana atual)')) === '50' && (await kpi('Conquistas concedidas')) === '3', [await kpi('XP total (semana atual)'), await kpi('XP médio/aluno (semana atual)'), await kpi('Conquistas concedidas')]);
    await go('tecnologia');
    L('Tecnologia: 2 erros, 1 aluno afetado, carga média 2000ms e mediana 2800ms', (await kpi('Erros registrados')) === '2' && (await kpi('Alunos(as) afetados(as)')) === '1' && (await p.innerText('[data-analytics-panel="tecnologia"]')).includes('2000ms') && (await p.innerText('[data-analytics-panel="tecnologia"]')).includes('2800ms'), await p.innerText('[data-analytics-panel="tecnologia"]'));
    await render(async () => { await p.selectOption('#analytics-period-select', 'last7'); });
    L('mudar o filtro limpa o cache: ao reabrir a Retenção, busca de novo', await (async () => { const n0 = await reads('usage_events'); await go('retencao'); return (await reads('usage_events')) > n0; })());
    await go('resumo');

    // ---- lista grande: busca em páginas; aviso só ao passar do teto ----
    const linhas = n => Array.from({ length: n }, (_, i) => ({ user_id: 'u' + (i % 7), actor_type: 'user', language_app_key: 'frances', event_type: 'tab_switch', event_name: 'path', meta: {}, created_at: new Date(Date.now() - 86400000).toISOString(), session_id: null, device_type: null, browser: null, os: null }));
    await p.evaluate(l => { window.__T.usage_events = window.__T.usage_events.concat(l); }, linhas(5100));
    const antes5k = await reads('usage_events');
    await render(async () => { await p.selectOption('#analytics-period-select', 'last30'); });
    L('5100 eventos: vem tudo em páginas de 1000 e não aparece aviso', (await p.$$eval('[data-analytics-cortado]', l => l.length)) === 0 && (await reads('usage_events')) - antes5k >= 6, [await reads('usage_events') - antes5k]);
    await p.evaluate(l => { window.__T.usage_events = window.__T.usage_events.concat(l); }, linhas(45000));
    await render(async () => { await p.selectOption('#analytics-period-select', 'last7'); await p.selectOption('#analytics-period-select', 'last30'); });
    L('passou de 50000: aparece o aviso de números possivelmente abaixo do real', (await p.$$eval('[data-tan="pagina"] > [data-analytics-cortado]', l => l.length)) === 1 && (await p.innerText('[data-analytics-cortado]')).includes('50000'));
    await p.evaluate(() => { window.__T.usage_events = window.__T.usage_events.filter(e => e.event_name !== 'path' || e.event_type !== 'tab_switch'); });
    await render(async () => { await p.selectOption('#analytics-period-select', 'last7'); await p.selectOption('#analytics-period-select', 'last30'); });
    L('abaixo do teto o aviso some', (await p.$$eval('[data-analytics-cortado]', l => l.length)) === 0);

    // ---- excluir minha atividade ----
    L('interruptor de excluir minha atividade começa ligado', await p.isChecked('#analytics-exclude-own-switch'));
    await p.click('#analytics-exclude-own-switch'); await p.waitForFunction(() => window.__T.profiles.find(r => r.user_id === 'T').exclude_own_activity === false);
    L('desligar: grava a preferência no perfil', !(await p.isChecked('#analytics-exclude-own-switch')) && (await p.getAttribute('#analytics-exclude-own-switch', 'aria-checked')) === 'false');
    await p.evaluate(() => { window.__falha = { tabela: 'profiles', op: 'update' }; });
    await p.click('#analytics-exclude-own-switch'); await p.waitForTimeout(300);
    L('erro ao gravar: o interruptor volta como estava', !(await p.isChecked('#analytics-exclude-own-switch')));
    if (OUT) await p.screenshot({ path: path.join(OUT, `analytics-${lang}-${scheme}.png`), fullPage: true });
    await go('exercicios'); if (OUT) await p.screenshot({ path: path.join(OUT, `analytics-exercicios-${lang}-${scheme}.png`), fullPage: true });
    await go('resumo');

    // ---- celular ----
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => switchAdminPanelSection('analytics')); await p.waitForSelector('[data-tan="pagina"]'); await p.waitForTimeout(400);
    L('celular: sem rolagem horizontal na página', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]));
    L('celular: as sub-abas rolam dentro da própria barra', await p.$eval('[data-analytics-abas]', e => e.scrollWidth > e.clientWidth));
    await go('exercicios');
    L('celular: a tabela de exercícios rola dentro do quadro (a página não)', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    if (OUT) await p.screenshot({ path: path.join(OUT, `analytics-mobile-${lang}-${scheme}.png`), fullPage: true });
    L('nenhum erro de página', h.errors.length === 0, h.errors);
    await h.close();
  }

  // ---- sem ser admin ----
  for (const lang of ['fr', 'zh']){
    const h = await abrirAdmin({ lang, aba: 'premium', seed: SEED, antes: ANTES });
    await h.page.evaluate(() => { isAdminUser = () => false; renderAdminAnalyticsView(); });
    check(`[${lang}] sem ser admin: só o aviso, sem filtros nem consulta`, (await h.page.textContent('#admin-analytics-content')).includes('só para a administração') && !(await h.page.$('#analytics-period-select')));
    await h.close();
  }
  console.log(`painel-admin analytics (navegador): ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
