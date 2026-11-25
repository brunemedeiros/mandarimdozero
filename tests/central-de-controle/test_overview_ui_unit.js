// Node/VM -- peças de tela da Visão Geral do Painel de Admin (shared/admin-overview-ui.js): filtros, números, gráfico SVG acessível,
// faixas de engajamento clicáveis, Situação (4 estados), Revisões, Plano, estados vazios/erro, escape de texto e datas sem mudar de dia.
// Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js). Uso: node tests/central-de-controle/test_overview_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Infinity, Intl,
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx);
ctx.fmtDate = (d, o) => new Intl.DateTimeFormat('pt-BR', o).format(d);
ctx.fmtNumber = (n, o) => new Intl.NumberFormat('pt-BR', o).format(n);
vm.createContext(ctx);
for (const f of ['shared/admin-overview-ui.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };

// ---- datas e faixas ----
const d = run('aovParseDay("2026-11-24")');
check('data AAAA-MM-DD vira o dia local certo (não muda para o dia anterior)', d.getFullYear() === 2026 && d.getMonth() === 10 && d.getDate() === 24 && d.getHours() === 0);
check('data inválida = null', run('aovParseDay("24/11/2026")') === null);
check('faixas: 0 Nenhum, 1 Baixo, 2-3 Médio, 4-5 Alto, 6-7 Altíssimo',
  JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7].map(n => run(`aovBand(${n})`))) === JSON.stringify(['nenhum', 'baixo', 'medio', 'medio', 'alto', 'alto', 'altissimo', 'altissimo']));
check('escala do gráfico arredonda para cima', run('aovNiceMax(0)') === 4 && run('aovNiceMax(7)') === 10 && run('aovNiceMax(23)') === 25 && run('aovNiceMax(130)') === 200);

// ---- dados de exemplo ----
const days = Array.from({ length: 7 }, (_, i) => `2026-11-${String(18 + i).padStart(2, '0')}`);
const STATS = {
  totals: { accounts: 15, active: 9, new_accounts: 2, premium: 0, engagement_avg: 2.4 },
  series: days.map((day, i) => ({ day, sessions: i * 2, active: i, new_accounts: i === 6 ? 1 : 0 })),
  engagement: { nenhum: [{ user_id: 'u1', display_name: '<b>Bia</b>', username: 'bia', days: 0, new_account: true }], baixo: [], medio: [{ user_id: 'u2', display_name: 'Ana', username: 'ana', days: 2, new_account: false }], alto: [], altissimo: [] },
  plans: { free: 15, premium: 0 },
};
const ST = (o) => Object.assign({ days: 30, scope: 'mine', language: 'all', stats: STATS, statsError: false, reviews: null, reviewsError: false, situation: null, openBand: null, openSit: null }, o || {});

// ---- página e filtros ----
const page = run('aovPageHTML(S, () => true)', { S: ST() });
check('página: título e subtítulo', page.includes('Visão Geral') && page.includes('num lugar só'));
check('filtros: 3 grupos com o escolhido marcado', (page.match(/aria-pressed="true"/g) || []).length === 3 && page.includes('data-aov-periodo="30" aria-pressed="true"') && page.includes('data-aov-quem="mine" aria-pressed="true"') && page.includes('data-aov-idioma="all" aria-pressed="true"'));
check('filtros: Português aparece no idioma (decisão da autora)', page.includes('data-aov-idioma="portugues"') && page.includes('Português'));
check('filtros: categorias Meus alunos, Outras contas, Todas as contas', ['Meus alunos', 'Outras contas', 'Todas as contas'].every(x => page.includes(x)));
check('filtros: cada grupo tem nome (aria-labelledby)', (page.match(/role="group" aria-labelledby="aov-rot-/g) || []).length === 3);

// ---- números ----
check('números: Meus alunos diz "Alunos"; Outras contas diz "Contas"', run('aovKpisHTML(S.stats, "mine")', { S: ST() }).includes('>Alunos<') && run('aovKpisHTML(S.stats, "others")').includes('>Contas<'));
check('números: engajamento médio com vírgula', run('aovKpisHTML(S.stats, "mine")').includes('>2,4<'));

// ---- gráfico ----
const chart = run('aovLineChartHTML("x", "Acessos", D, [{key:"acessos",label:"Acessos",values:[0,2,4,6,8,10,12]},{key:"estudo",label:"Estudaram",values:[0,1,2,3,4,5,6]}])', { D: days });
check('gráfico: svg com nome (role=img + aria-label com período e máximo)', chart.includes('role="img"') && chart.includes('aria-label="Acessos: de 18/11 a 24/11, no máximo 12 num dia."'));
check('gráfico: 1 linha por série, cores por classe (token no CSS)', (chart.match(/<polyline/g) || []).length === 2 && chart.includes('aov-serie--acessos') && chart.includes('aov-serie--estudo') && !/#[0-9a-f]{3,6}/i.test(chart));
check('gráfico: só 3 rótulos de dia no eixo (cabe no celular)', (chart.match(/class="aov-eixo" x="[0-9.]+" y="184"/g) || []).length === 3);
check('gráfico: tabela para leitor de tela com todos os dias', chart.includes('class="p-so-leitor"') && (chart.match(/<th scope="row">/g) || []).length === 7);
check('gráfico: legenda com o total de cada série', chart.includes('Acessos: <b>42</b>') && chart.includes('Estudaram: <b>21</b>'));
const vazio = run('aovLineChartHTML("x", "C", D, [{key:"cadastros",label:"Cadastros",values:[0,0,0,0,0,0,0]}])', { D: days });
check('gráfico zerado: avisa "Nada neste período"', vazio.includes('Nada neste período'));
check('gráfico com 90 dias: sem bolinhas (fica limpo)', !run('aovLineChartHTML("x","C",D90,[{key:"cadastros",label:"C",values:D90.map(()=>1)}])', { D90: Array.from({ length: 90 }, (_, i) => `2026-08-${String((i % 28) + 1).padStart(2, '0')}`) }).includes('<circle'));

// ---- engajamento ----
const eng = run('aovEngagementHTML(S.stats, null, () => true)', { S: ST() });
check('engajamento: 5 faixas, cada uma é botão', (eng.match(/<button type="button" class="aov-faixa/g) || []).length === 5);
check('engajamento: faixa vazia desabilitada, com gente habilitada', /data-aov-faixa="baixo"[^>]*disabled/.test(eng) && !/data-aov-faixa="medio"[^>]*disabled/.test(eng));
check('engajamento: barra relativa à maior faixa', eng.includes('--v:100%') && eng.includes('--v:0%'));
check('engajamento: plural "1 pessoa" / "0 pessoas"', eng.includes('1 pessoa<') && eng.includes('0 pessoas<'));
check('engajamento: fechado não mostra lista', !eng.includes('aov-pessoa"') && eng.includes('aria-expanded="false"'));
check('engajamento: nota explica os 7 dias e que abrir o site não conta', eng.includes('6 dias anteriores') && eng.includes('Só abrir o site não conta'));
const engOpen = run('aovEngagementHTML(S.stats, "nenhum", () => true)');
check('faixa aberta: aria-expanded e lista com nome escapado, conta nova e "Abrir ficha"', engOpen.includes('data-aov-faixa="nenhum" aria-expanded="true"') && engOpen.includes('&lt;b&gt;Bia&lt;/b&gt;') && !engOpen.includes('<b>Bia</b>') && engOpen.includes('conta nova') && engOpen.includes('data-aov-ficha="u1"'));
check('faixa aberta sem ficha (Outras contas): sem botão "Abrir ficha"', !run('aovEngagementHTML(S.stats, "nenhum", () => false)').includes('data-aov-ficha'));
check('faixa aberta: "0 dias com estudo" no plural', engOpen.includes('0 dias com estudo'));

// ---- Situação ----
const L = (id, sit, days, failed) => ({ link: { student_id: id, display_name: 'Aluno ' + id, username: id, language_app_key: 'frances' }, situation: sit, days, failed: !!failed });
const SIT = { loading: false, rows: [L('a', 'ok', 0), L('b', 'ok', 2), L('c', 'warn', 5), L('d', 'stopped', 9), L('e', 'none', null), L('f', 'none', null, true)] };
run('tsuDaysLabel = (n) => n == null ? "sem registro" : n + " dias";');
const sit = run('aovSituationHTML(X, null)', { X: SIT });
check('situação: 4 botões (Em dia, Atenção, Parado, Sem estudo) com contagem', (sit.match(/data-aov-sit="/g) || []).length === 4 && sit.includes('Em dia</span><b>2</b>') && sit.includes('Atenção</span><b>1</b>') && sit.includes('Parado</span><b>1</b>') && sit.includes('Sem estudo</span><b>1</b>'));
check('situação: quem falhou não entra e gera aviso', sit.includes('Não deu para ler 1 aluno agora'));
check('situação: explica a regra e a diferença dos Desafios', sit.includes('Em dia estudou nos últimos 3 dias') && sit.includes('Desafios e Ditados ainda não contam aqui'));
const sitOpen = run('aovSituationHTML(X, "stopped")');
check('situação aberta: lista com a aluna parada e atalho para a ficha no idioma do vínculo', sitOpen.includes('Aluno d') && sitOpen.includes('data-aov-ficha="d" data-aov-ficha-lang="frances"') && sitOpen.includes('9 dias'));
check('situação carregando: mostra o progresso', run('aovSituationHTML({loading:true, done:3, total:15}, null)').includes('3 de 15'));
check('situação sem alunos: estado vazio', run('aovSituationHTML({loading:false, rows:[]}, null)').includes('Nenhuma conta nesta escolha'));

// ---- Revisões e Plano ----
const rev = run('aovReviewsHTML({totals:{home:120,class:30},students:[{user_id:"a",display_name:"Ana",home:100,class:30},{user_id:"b",display_name:"<i>Bia</i>",home:20,class:0}]}, false)');
check('revisões: Em casa e Na aula separados, por aluno, nome escapado', rev.includes('>120<') && rev.includes('>30<') && rev.includes('Em casa') && rev.includes('Na aula') && rev.includes('&lt;i&gt;Bia') && rev.includes('nunca entra nos dois'));
check('revisões com erro: aviso, nunca "0"', run('aovReviewsHTML(null, true)').includes('Não foi possível carregar as revisões') && !run('aovReviewsHTML(null, true)').includes('>0<'));
const plan = run('aovPlansHTML(S.stats)', { S: ST() });
check('plano: Grátis e Premium + nota do futuro (cancelada, expirada, pagamento pendente)', plan.includes('Grátis') && plan.includes('Premium') && plan.includes('pagamento pendente'));

// ---- corpo por categoria ----
const bodyMine = run('aovBodyHTML(S, () => true)', { S: ST({ situation: SIT, reviews: { totals: { home: 1, class: 0 }, students: [] } }) });
check('Meus alunos: engajamento, situação, revisões e plano', ['data-aov="engajamento"', 'data-aov="situacao"', 'data-aov="revisoes"', 'data-aov="plano"'].every(x => bodyMine.includes(x)));
const bodyAll = run('aovBodyHTML(S, () => false)', { S: ST({ scope: 'all' }) });
check('Todas as contas: sem situação e sem revisões (são só dos meus alunos)', bodyAll.includes('data-aov="engajamento"') && bodyAll.includes('data-aov="plano"') && !bodyAll.includes('data-aov="situacao"') && !bodyAll.includes('data-aov="revisoes"'));
check('erro ao carregar: aviso com "Tentar de novo"', run('aovBodyHTML(S, () => true)', { S: ST({ stats: null, statsError: true }) }).includes('data-aov-tentar'));
check('carregando: rodinha', run('aovBodyHTML(S, () => true)', { S: ST({ stats: null }) }).includes('p-spinner'));
check('rodapé: dia no horário de Brasília', bodyMine.includes('horário de Brasília'));

console.log(`central-de-controle (peças da Visão Geral): ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
