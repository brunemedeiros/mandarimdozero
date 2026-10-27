// Node/VM -- peças de tela da aba Reports (shared/admin-reports-ui.js): busca, linha da tabela, filtros, contexto, resposta por e-mail,
// janela de detalhe e escape de texto/links. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-admin/test_reports_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Intl,
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx); ctx.fmtDate = (d, o) => new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: 'UTC' }, o || {})).format(new Date(d)); vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/admin-reports-ui.js'), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };
const NAMES = { u1: 'Ana Souza' };
const LB = {
  statusKeys: ['novo', 'em_analise', 'confirmado', 'em_desenvolvimento', 'resolvido', 'nao_reproduzido', 'recusado', 'duplicado'], priorityKeys: ['baixa', 'media', 'alta', 'critica'],
  status: s => ({ novo: 'Novo', resolvido: 'Resolvido', em_analise: 'Em análise' }[s] || s), priority: p => ({ alta: 'Alta', baixa: 'Baixa' }[p] || p),
  category: id => ({ bug_tecnico: 'Bug / erro técnico', sugestao_melhoria: 'Sugestão de melhoria' }[id]), severity: id => ({ impede: 'Impede continuar' }[id]),
  lang: k => ({ frances: 'Francês', mandarim: 'Chinês' }[k] || k || '?'), screen: k => ({ path: 'Estudo', review: 'Revisão' }[k] || k),
  reporter: r => r.user_id ? (NAMES[r.user_id] || 'conta logada (perfil não encontrado)') : (r.reporter_email || 'convidada'),
};
const R = (id, o) => Object.assign({ id, kind: 'problema', category: 'bug_tecnico', description: 'Botão não responde ' + id, language_app_key: 'frances', status: 'novo', priority: null, created_at: '2026-10-05T14:30:00Z', user_id: null, reporter_email: null, context: {} }, o || {});
const REPS = [R(1, { user_id: 'u1', context: { screen: 'path', browser: 'Chrome' } }), R(2, { kind: 'sugestao', category: 'sugestao_melhoria', description: 'Queria modo escuro', reporter_email: 'conv@x.com', status: 'resolvido', priority: 'alta', admin_reply_sent_at: '2026-10-06T10:00:00Z', language_app_key: 'mandarim' }), R(3, { description: 'Áudio cortado <b>', internal_note: 'duplicado do 1' })];

// ---- peças pequenas ----
check('url: só http(s)', run('trpSafeUrl("https://a.com/x.png")') === 'https://a.com/x.png' && run('trpSafeUrl("javascript:alert(1)")') === '' && run('trpSafeUrl("data:text/html,x")') === '' && run('trpSafeUrl(null)') === '');
check('trecho: corta com reticências, mantém o curto', run('trpSnippet("abcdef", 3)') === 'abc…' && run('trpSnippet("ab", 3)') === 'ab' && run('trpSnippet(null, 3)') === '');
check('cor do status: novo vermelho, análise amarelo, resolvido verde, recusado neutro', run('trpStatusClass("novo")') === 'p-selo--erro' && run('trpStatusClass("em_analise")') === 'p-selo--aviso' && run('trpStatusClass("resolvido")') === 'p-selo--ok' && run('trpStatusClass("recusado")') === '' && run('trpStatusClass("em_desenvolvimento")') === 'p-selo--info');
check('quem pode ser respondido: conta logada e convidado com e-mail; convidado sem e-mail não', run('trpCanReply({user_id:"u"})') && run('trpCanReply({reporter_email:"a@b"})') && !run('trpCanReply({})'));
check('contexto vazio avisa', run('trpContextHTML({})').includes('sem contexto adicional') && run('trpContextHTML(null)').includes('sem contexto adicional'));
const cx = run('trpContextHTML(c)', { c: { screen: 'path', x: { a: 1 }, n: null, '<k>': '<v>' } });
check('contexto: chaves e valores escapados, objeto em JSON, nulo como texto', !cx.includes('<k>') && cx.includes('&lt;k&gt;') && cx.includes('&lt;v&gt;') && cx.includes('{&quot;a&quot;:1}') && cx.includes('<dd>null</dd>'));

// ---- busca ----
const f = (q) => run('trpFilterReports(R, q, LB).map(r => r.id).join()', { R: REPS, q, LB });
check('busca: vazia mantém tudo', f('') === '1,2,3');
check('busca: texto sem acento e sem maiúscula', f('AUDIO') === '3' && f('modo escuro') === '2');
check('busca: pessoa (nome da conta e e-mail do convidado)', f('souza') === '1' && f('conv@x') === '2');
check('busca: tela (nome legível) e categoria', f('estudo') === '1' && f('sugestao de melhoria') === '2');
check('busca: nota interna', f('duplicado do') === '3');
check('busca: sem resultado', f('zzz') === '');

// ---- linha e lista ----
const row = run('trpRowHTML(r, LB)', { r: REPS[1], LB });
check('linha: ícone de sugestão, categoria, e-mail, Chinês, status resolvido em verde, prioridade', row.includes('💡') && row.includes('Sugestão de melhoria') && row.includes('conv@x.com') && row.includes('Chinês') && row.includes('p-selo--ok') && row.includes('Alta'));
check('linha: marca "respondido" quando já respondeu', row.includes('respondido') && !run('trpRowHTML(r, LB)', { r: REPS[0], LB }).includes('respondido'));
const row1 = run('trpRowHTML(r, LB)', { r: REPS[0], LB });
check('linha: conta logada mostra o nome, a tela e o botão com nome acessível', row1.includes('Ana Souza') && row1.includes('Estudo') && row1.includes('aria-label="Abrir o report: Bug / erro técnico"') && row1.includes('data-ver-report="1"'));
check('linha: texto escapado', !run('trpRowHTML(r, LB)', { r: REPS[2], LB }).includes('<b>') && run('trpRowHTML(r, LB)', { r: REPS[2], LB }).includes('&lt;b&gt;'));
check('linha: data em UTC com hora', row1.includes('05/10/26'));
const lista = run('trpListHTML(R, 3, LB, false)', { R: REPS, LB });
check('lista: 3 linhas e contagem', (lista.match(/data-report-row=/g) || []).length === 3 && lista.includes('3 reports na lista.'));
check('lista: aviso quando cortou no limite', run('trpListHTML(R, 3, LB, true)', { R: REPS, LB }).includes('Mostrando os 3 mais recentes'));
check('lista vazia: sem report e com busca', run('trpListHTML([], 0, LB, false)', { LB }).includes('Nenhum report encontrado com esse filtro.') && run('trpListHTML([], 3, LB, false)', { LB }).includes('Nenhum report com essa busca.'));
const flt = run('trpFiltersHTML(F, LB, ["frances","mandarim"])', { F: { statusFilter: 'resolvido', kindFilter: 'sugestao', languageFilter: 'mandarim', busca: 'a"b' }, LB });
check('filtros: 8 status + todos, valores marcados, busca escapada', (flt.match(/<option value="(novo|em_analise|confirmado|em_desenvolvimento|resolvido|nao_reproduzido|recusado|duplicado)"/g) || []).length === 8 && /value="resolvido" selected/.test(flt) && /value="sugestao" selected/.test(flt) && /value="mandarim" selected/.test(flt) && flt.includes('value="a&quot;b"'));

// ---- janela de detalhe ----
const full = R(7, { user_id: 'u1', description: 'Linha 1\nLinha 2 <img src=x onerror=1>', expected_behavior: 'Abrir', severity_reported: 'impede', screenshot_url: 'https://cdn/x.png', priority: 'alta', status: 'em_analise', internal_note: 'nota "q"', context: { screen: 'review', url: '/x' }, admin_reply_sent_at: '2026-10-06T10:00:00Z', admin_reply_subject: 'Obrigada', admin_reply: 'Corrigido' });
const d = run('trpDetailDialogHTML(r, LB)', { r: full, LB });
check('detalhe: título com tipo e categoria; descrição escapada', d.includes('Problema: Bug / erro técnico') && !d.includes('<img') && d.includes('&lt;img'));
check('detalhe: esperava, gravidade percebida e link da captura seguro', d.includes('Abrir') && d.includes('Impede continuar') && d.includes('href="https://cdn/x.png"') && d.includes('rel="noopener noreferrer"'));
check('detalhe: status e prioridade marcados, nota escapada no campo', /<option value="em_analise" selected/.test(d) && /<option value="alta" selected/.test(d) && d.includes('nota &quot;q&quot;'));
check('detalhe: contexto recolhido', d.includes('<details class="p-automaticos"') && !/<details[^>]* open/.test(d));
check('detalhe: histórico da última resposta e campos de nova resposta', d.includes('Última resposta enviada') && d.includes('Corrigido') && d.includes('id="report-resp-enviar"') && d.includes('maxlength="150"'));
const d2 = run('trpDetailDialogHTML(r, LB)', { r: R(8, { screenshot_url: 'javascript:alert(1)', expected_behavior: null, severity_reported: null }), LB });
check('detalhe: captura perigosa não vira link e campos vazios mostram "não informado"', !/<a /.test(d2.replace(/<a [^>]*data-/g, '')) && d2.includes('sem captura anexada') && (d2.match(/não informado/g) || []).length === 2);
check('detalhe: convidado sem e-mail não pode responder e o aviso aparece', run('trpDetailDialogHTML(r, LB)', { r: R(9), LB }).includes('Não é possível responder') && !run('trpDetailDialogHTML(r, LB)', { r: R(9), LB }).includes('id="report-resp-enviar"'));
check('detalhe: sem prioridade escolhe "não definida"', /<option value="" selected|<option value="">\(não definida\)/.test(d2));
const pg = run('trpPageHTML(s)', { s: { reports: REPS, filtros: { statusFilter: 'all', kindFilter: 'all', languageFilter: 'all', busca: '' }, L: LB, languageKeys: ['frances', 'mandarim'], truncated: false } });
check('página: filtros, lista e tudo sob .painel', pg.startsWith('<div class="painel">') && pg.includes('data-reports-status') && pg.includes('data-reports-lista') && (pg.match(/data-report-row=/g) || []).length === 3);

console.log(`painel-admin reports (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
