// Node/VM -- peças de tela do Analytics (shared/admin-analytics-ui.js): indicadores com variação, barras, tabelas, funil, filtros, sub-abas,
// cada seção e escape de texto vindo dos eventos (navegador, sistema, nome do evento). Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-admin/test_analytics_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Infinity, Intl, APP_KEY: 'frances', UNITS: [],
  AVAILABLE_LANGUAGES: [{ appKey: 'frances', name: 'Francês' }, { appKey: 'mandarim', name: 'Chinês' }],
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx); ctx.fmtDate = (d) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(d)); vm.createContext(ctx);
for (const f of ['shared/admin-analytics-calc.js', 'shared/admin-analytics-ui.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };

// ---- variação ----
check('variação: sem delta, nada', run('tanDeltaHTML(null)') === '');
check('variação: sobe em verde com seta e texto equivalente', (h => h.includes('p-selo--ok') && h.includes('▲ 50%') && h.includes('aria-label="Subiu 50%'))(run('tanDeltaHTML({kind:"up",pct:50})')));
check('variação: cai em vermelho', (h => h.includes('p-selo--erro') && h.includes('▼ 20%') && h.includes('Caiu 20%'))(run('tanDeltaHTML({kind:"down",pct:20})')));
check('variação: nova e igual', run('tanDeltaHTML({kind:"new"})').includes('p-selo--info') && run('tanDeltaHTML({kind:"flat"})').includes('>=<'));
const kpi = run('tanKpiHTML("<b>9</b>", "Alunos <i>", "nota", {kind:"up",pct:5})');
check('indicador: valor e rótulo escapados, nota e variação', !kpi.includes('<b>9') && kpi.includes('&lt;b&gt;9') && kpi.includes('Alunos &lt;i&gt;') && kpi.includes('p-indicador-detalhe') && kpi.includes('▲ 5%'));
check('indicador: sem nota não desenha o detalhe', !run('tanKpiHTML(1, "x")').includes('p-indicador-detalhe'));

// ---- barras ----
const bars = run('tanBarsHTML(R, L, n => " +" + n.count)', { R: [{ name: 'a', count: 0 }, { name: 'b', count: 10, uniqueStudents: 3 }, { name: '<script>x</script>', count: 5 }], L: { a: 'Rótulo A' } });
check('barras: a maior vale 100%, a metade 50%, o zero 0% (o primeiro ser zero não zera as outras)', bars.includes('--v:0%') && bars.includes('--v:100%') && bars.includes('--v:50%'));
check('barras: rótulo do mapa, depois o nome cru, tudo escapado', bars.includes('Rótulo A') && !bars.includes('<script>') && bars.includes('&lt;script&gt;x&lt;/script&gt;'));
check('barras: alunos únicos no plural e a nota extra', bars.includes('10 · 3 alunos(as) +10'));
check('barras: cada barra tem texto equivalente', (bars.match(/role="img" aria-label="/g) || []).length === 3 && bars.includes('aria-label="Rótulo A: 0"'));
check('barras: lista vazia não quebra', run('tanBarsHTML([], {})') === '<div class="p-barras"></div>');
check('vazio usa o texto padrão ou o dado', run('tanEmptyHTML()').includes(run('t("admin.analytics.noData")')) && run('tanEmptyHTML("x")').includes('>x<'));
check('aviso de lista cortada traz o limite', run('tanTruncatedHTML("analytics.truncated.main", 5000)').includes('5000') && run('tanTruncatedHTML("analytics.truncated.main", 5000)').includes('p-alerta--aviso'));

// ---- filtros ----
const st = { period: 'custom', languageFilter: 'mandarim', deviceFilter: 'mobile', compare: true, customSince: '2026-10-01', customUntil: '2026-10-07', since: new Date('2026-10-01T00:00:00Z'), until: new Date('2026-10-07T00:00:00Z'), previous: { since: new Date('2026-09-24T00:00:00Z'), until: new Date('2026-09-30T00:00:00Z') } };
const ctl = run('tanControlsHTML(s)', { s: st });
check('filtros: período, idioma e dispositivo marcados', /<option value="custom" selected/.test(ctl) && /<option value="mandarim" selected/.test(ctl) && /<option value="mobile" selected/.test(ctl));
check('filtros: período personalizado mostra as duas datas', ctl.includes('id="analytics-custom-since" value="2026-10-01"') && ctl.includes('id="analytics-custom-until" value="2026-10-07"'));
check('filtros: comparação ligada como interruptor e a linha do período com o anterior', /id="analytics-compare-switch" aria-checked="true" checked/.test(ctl) && ctl.includes('01/10/2026') && ctl.includes('24/09/2026'));
check('filtros: período fixo não mostra datas', !run('tanControlsHTML(s)', { s: Object.assign({}, st, { period: 'last7', compare: false }) }).includes('analytics-custom-since') && !run('tanControlsHTML(s)', { s: Object.assign({}, st, { period: 'last7', compare: false }) }).includes('24/09/2026'));
check('interruptor de excluir minha atividade', /id="analytics-exclude-own-switch" aria-checked="true" checked/.test(run('tanExcludeOwnHTML(true)')) && !/ checked/.test(run('tanExcludeOwnHTML(false)')));

// ---- sub-abas ----
const nav = run('tanSubnavHTML("engajamento")');
check('sub-abas: 11 abas, só a atual marcada', (nav.match(/data-analytics-tab=/g) || []).length === 11 && (nav.match(/aria-current="page"/g) || []).length === 1 && /data-analytics-tab="engajamento" aria-selected="true" aria-current="page"/.test(nav));

// ---- seções ----
const stats = { activeStudents: 5, newStudents: 2, sessions: 7, exercisesStarted: 4, exercisesCompleted: 9, overallCompletionRate: 75, estimatedStudyMinutes: 125, newActiveCount: 1, returningActiveCount: 4,
  activeByDayRows: [{ day: '2026-10-05', count: 3 }], sessionsByDayRows: [], freqBuckets: [{ label: '1 dia', count: 2 }, { label: '2–4', count: 0 }],
  areaRows: [{ name: 'path', count: 4, uniqueStudents: 2 }, { name: '<x>', count: 1, uniqueStudents: 1 }, { name: 'leaderboard', count: 3, uniqueStudents: 2 }], featureRows: [{ name: 'flashcard_review', count: 3, uniqueStudents: 1 }],
  exerciseRows: [{ name: 'flashcard_review', started: 4, completed: 3, completionRate: 75, avgScore: null, uniqueStudents: 2 }, { name: 'vocab_lesson', started: null, completed: 6, completionRate: null, avgScore: 85, uniqueStudents: 3 }, { name: 'dictation', started: 2, completed: 1, completionRate: 50, avgScore: 85, uniqueStudents: 1 }],
  byLanguageCounts: { frances: 8, mandarim: 2 }, levelRows: [{ name: 'A1', count: 2 }], unitsCompletedBuckets: [{ label: '0', count: 1 }, { label: '1–2', count: 0 }], lessonsCompletedBuckets: [{ label: '0', count: 0 }],
  deviceRows: [{ name: 'mobile', count: 3, uniqueStudents: 2 }, { name: 'desconhecido', count: 1, uniqueStudents: 1 }], browserRows: [{ name: 'Chrome<img src=x>', count: 3, uniqueStudents: 2 }], osRows: [], exercisesPerSession: 1.3, avgLongestStreak: 2.5, maxLongestStreak: 4, totalEvents: 20 };
const prevS = Object.assign({}, stats, { activeStudents: 4, newStudents: 0, sessions: 7, exercisesCompleted: 12 });
const rs = run('tanResumoHTML(s, p)', { s: stats, p: prevS });
check('resumo: 7 indicadores, taxa 75% e tempo 2h 5min', (rs.match(/p-indicador"/g) || []).length === 7 && rs.includes('75%') && rs.includes('2h 5min'));
check('resumo: variação contra o período anterior (alunos +25%, novos "novo", sessões igual, concluídos −25%)', rs.includes('▲ 25%') && rs.includes('>novo<') && rs.includes('>=<') && rs.includes('▼ 25%'));
check('resumo: sem comparação não mostra variação', !run('tanResumoHTML(s, null)', { s: stats }).includes('▲'));
check('resumo: taxa nula mostra "—"', run('tanResumoHTML(s, null)', { s: Object.assign({}, stats, { overallCompletionRate: null }) }).includes('>—'));
const at = run('tanAtividadeHTML(s)', { s: stats });
check('atividade: 4 seções; sem sessões por dia mostra vazio; frequência com dados', (at.match(/<article>/g) || []).length === 4 && at.includes('2026-10-05') && at.includes('1 dia'));
const nv = run('tanNavegacaoHTML(s)', { s: stats });
check('navegação: área com rótulo, nome desconhecido escapado, funcionalidade com rótulo', nv.includes('Trilha') && !nv.includes('<x>') && nv.includes('&lt;x&gt;') && nv.includes('Sessão de flashcards'));
const ex = run('tanExerciciosHTML(s)', { s: stats });
check('exercícios: tabela com 3 linhas, "—" onde não há início, nota de 85%', (ex.match(/<tr><td>/g) || []).length === 3 && ex.includes('<td>—</td>') && ex.includes('85%'));
check('funil: só tipos com início (2); o ditado com média 85% mostra "nota boa" e a revisão (sem nota) mostra "nota média"', (ex.match(/p-funil-linha/g) || []).length === 2 && ex.includes(run('t("admin.analytics.funnel.goodScore")')) && ex.includes(run('t("admin.analytics.funnel.avgScore")')));
check('idioma: barras com os nomes dos idiomas; filtro ativo avisa', (h => h.includes('Francês') && h.includes('Chinês') && h.includes('Chinês') )(run('tanIdiomaHTML(s, "all")', { s: stats })) && run('tanIdiomaHTML(s, "mandarim")', { s: stats }).split('Chinês').length > run('tanIdiomaHTML(s, "all")', { s: stats }).split('Chinês').length);
const pr = run('tanProgressaoHTML(s)', { s: stats });
check('progressão: 3 seções; baldes todos zero mostram vazio', (pr.match(/<article>/g) || []).length === 3 && pr.includes('A1') && pr.includes('p-nota'));
const dv = run('tanDispositivosHTML(s)', { s: stats });
check('dispositivos: navegador com HTML escapado; sem sistema mostra vazio', !dv.includes('<img') && dv.includes('Chrome&lt;img'));
check('dispositivos: só "desconhecido" avisa que faltam dados', run('tanDispositivosHTML(s)', { s: Object.assign({}, stats, { deviceRows: [{ name: 'desconhecido', count: 1 }] }) }).includes('p-nota'));
const en = run('tanEngajamentoHTML(s, X, B)', { s: stats, X: [{ amount: 100 }, { amount: 50 }], B: [{ user_id: 'a' }, { user_id: 'a' }, { user_id: 'b' }] });
check('engajamento: XP total 150, média por TODOS os ativos (150/5 = 30), 10 indicadores e 2 alunos com badge', en.includes('>150<') && en.includes('>30<') && (en.match(/p-indicador"/g) || []).length === 10 && en.includes('2 aluno'), en.slice(0, 200));
check('engajamento: sem alunos ativos a média é 0 (nunca NaN)', !run('tanEngajamentoHTML(s, X, [])', { s: Object.assign({}, stats, { activeStudents: 0 }), X: [{ amount: 10 }] }).includes('NaN'));
const tc = run('tanTecnologiaHTML(tch)', { tch: { totalErrors: 3, affectedStudents: 2, errorRows: [{ name: 'js_error', count: 2, uniqueStudents: 1 }, { name: 'novo<x>', count: 1, uniqueStudents: 1 }], perfSampleCount: 2, avgLoadMs: 2000, medianLoadMs: 3000 } });
check('técnico: erros com rótulo, nome novo escapado, carga em ms', tc.includes('2000ms') && tc.includes('3000ms') && !tc.includes('<x>') && tc.includes('&lt;x&gt;'));
check('técnico: sem amostras mostra o aviso', run('tanTecnologiaHTML(tch)', { tch: { totalErrors: 0, affectedStudents: 0, errorRows: [], perfSampleCount: 0 } }).includes('p-nota'));
const rt = run('tanRetencaoHTML(c)', { c: [{ week: '2026-09-28', size: 4, retention: { 1: { pct: 50, eligible: 4, returned: 2 }, 7: null, 14: null, 30: null } }] });
check('retenção: linha da coorte com data, 50% (2/4) e "—" nos dias que ainda não completaram', rt.includes('28/09/2026') && rt.includes('50%') && rt.includes('(2/4)') && (rt.match(/<td>—<\/td>/g) || []).length === 3);
check('retenção vazia avisa', run('tanRetencaoHTML([])').includes('p-nota'));

// ---- página ----
const pg = run('tanPageHTML(s)', { s: { controls: st, excludeOwn: false, tab: 'resumo', stats, prevStats: null, truncated: true, limit: 5000, emptyEvents: false } });
check('página: tudo sob .painel, filtros, aviso de corte, 11 sub-abas e 11 painéis (4 vazios para carregar depois)', pg.startsWith('<div class="painel">') && pg.includes('data-analytics-filtros') && pg.includes('data-analytics-cortado') && (pg.match(/data-analytics-tab=/g) || []).length === 11 && (pg.match(/data-analytics-panel=/g) || []).length === 11 && /data-analytics-panel="retencao"><\/div>/.test(pg));
check('página: sem corte e com eventos, sem avisos', !run('tanPageHTML(s)', { s: { controls: st, excludeOwn: true, tab: 'resumo', stats, prevStats: null, truncated: false, limit: 5000, emptyEvents: false } }).includes('data-analytics-cortado'));
check('página: sem eventos mostra o aviso de período vazio', run('tanPageHTML(s)', { s: { controls: st, excludeOwn: true, tab: 'resumo', stats, prevStats: null, truncated: false, limit: 5000, emptyEvents: true } }).includes('p-alerta--info'));

console.log(`painel-admin analytics (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
