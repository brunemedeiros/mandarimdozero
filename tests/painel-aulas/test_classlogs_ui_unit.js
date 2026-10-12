// Node/VM -- peças de tela da aba Aulas (shared/teacher-classlogs-ui.js): agrupamento de aula em grupo, filtros, lista por mês,
// cartão, formulário e diálogo de edição. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-aulas/test_classlogs_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };

const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, isNaN, Promise, Intl, APP_KEY: 'frances',
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx);
ctx.fmtDate = (d, o) => new Intl.DateTimeFormat('pt-BR', o || {}).format(d instanceof Date ? d : new Date(d));
vm.createContext(ctx);
for (const f of ['shared/srs.js', 'shared/admin-students.js', 'shared/teacher-students-ui.js', 'shared/teacher-classlogs-ui.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const link = (id, user, name, lang) => ({ id, student_id: 's' + id, username: user, display_name: name, language_app_key: lang || 'frances' });
const links = [link(1, 'ana', 'Ana Paula'), link(2, 'bia', 'Bia Lima'), link(3, 'caio', 'Caio Prado'), link(4, 'duda', 'Duda', 'mandarim')];
const log = (id, sid, date, topic, extra) => Object.assign({ id, student_id: 's' + sid, language_app_key: sid === 4 ? 'mandarim' : 'frances', class_date: date, topic, homework: null, observations: null, notes: null, created_at: `${date}T15:00:00.${String(id).padStart(3, '0')}Z` }, extra || {});

// ---- 1. Agrupamento ----
{
  const logs = [
    log(1, 1, '2026-10-09', 'Passé composé', { homework: 'Ex 4' }),
    log(2, 1, '2026-10-02', 'Verbos', { notes: 'x' }), log(3, 2, '2026-10-02', 'Verbos', { notes: 'x' }),            // grupo: mesmo conteúdo, criadas juntas
    log(4, 3, '2026-10-02', 'Verbos', { notes: 'x', created_at: '2026-10-02T18:00:00Z' }),                            // mesmo conteúdo mas criada horas depois: aula separada
    log(5, 2, '2026-09-20', 'Números'),
    log(6, 9, '2026-10-10', 'De quem já foi removido'),                                                               // sem vínculo ativo: some
    log(7, 4, '2026-10-02', 'Verbos', { notes: 'x' }),                                                                // outro aluno e idioma, mesmo conteúdo e instante: entra no grupo
  ];
  const G = ctx.tclGroupLogs(logs, links);
  check('grupo: 4 aulas (a do aluno sem vínculo some)', G.length === 4, G.map(g => g.gid));
  const grp = G.find(g => g.logs.some(l => l.id === 2));
  check('aula em grupo junta as linhas criadas juntas (1, 2 e 4 alunos)', grp.logs.map(l => l.id).sort().join() === '2,3,7' && grp.links.length === 3, grp.logs.map(l => l.id));
  check('mesmo conteúdo criado horas depois é outra aula', G.some(g => g.logs.length === 1 && g.logs[0].id === 4));
  check('mesmo aluno no mesmo instante não duplica no grupo', ctx.tclGroupLogs([log(1, 1, '2026-10-02', 'A'), log(2, 1, '2026-10-02', 'A')], links).length === 2);
  check('ordem: mais recente primeiro (data, depois criação)', G.map(g => g.class_date).join() === '2026-10-09,2026-10-02,2026-10-02,2026-09-20', G.map(g => g.class_date));
  check('vazio e nulo não quebram', ctx.tclGroupLogs([], links).length === 0 && ctx.tclGroupLogs(null, links).length === 0);

  // ---- 2. Filtros ----
  const F = (f) => ctx.tclFilterGroups(G, Object.assign({ aluno: '', curso: '', busca: '' }, f)).map(g => g.gid).join();
  const all = G.map(g => g.gid).join();
  check('sem filtro: todas', F({}) === all);
  check('filtro por aluno pega também as aulas em grupo dele', ctx.tclFilterGroups(G, { aluno: 's2', curso: '', busca: '' }).length === 2);
  check('filtro por curso', ctx.tclFilterGroups(G, { aluno: '', curso: 'mandarim', busca: '' }).length === 1);
  check('busca no tópico, sem acento e sem maiúscula', ctx.tclFilterGroups(G, { aluno: '', curso: '', busca: 'PASSE' }).length === 1 && ctx.tclFilterGroups(G, { aluno: '', curso: '', busca: 'numeros' }).length === 1);
  check('busca na lição de casa e no nome do aluno', ctx.tclFilterGroups(G, { aluno: '', curso: '', busca: 'ex 4' }).length === 1 && ctx.tclFilterGroups(G, { aluno: '', curso: '', busca: 'bia' }).length >= 2);
  check('busca em anotações privadas também', ctx.tclFilterGroups(G, { aluno: '', curso: '', busca: 'x' }).length >= 1);
  check('busca sem resultado', ctx.tclFilterGroups(G, { aluno: '', curso: '', busca: 'zzzz' }).length === 0);

  // ---- 3. Lista por mês e cartão ----
  const list = ctx.tclListHTML(G, G.length);
  check('meses em ordem, um rótulo por mês', (list.match(/class="p-mes"/g) || []).length === 2 && list.indexOf('outubro de 2026') < list.indexOf('setembro de 2026'), list.match(/p-mes">[^<]*/g));
  check('4 cartões com Editar e Apagar', (list.match(/class="p-aula"/g) || []).length === 4 && (list.match(/data-editar-aula=/g) || []).length === 4 && (list.match(/data-apagar-aula=/g) || []).length === 4);
  check('data em destaque (dia e mês curto) sem fuso errado', list.includes('<b>09</b><span>out</span>') && list.includes('<b>20</b><span>set</span>'));
  check('aula em grupo: avatares com texto equivalente e nomes', list.includes('Aula em grupo com 3 pessoas') && list.includes('Aula em grupo · Ana Paula, Bia Lima, Duda'));
  check('aula individual: nome e idioma', list.includes('Ana Paula · Francês'));
  check('campos vazios não aparecem; os preenchidos sim', list.includes('<dt>Lição de casa</dt><dd>Ex 4</dd>') && !list.includes('<dt>Observações</dt>'));
  check('aula sem tópico tem título', ctx.tclCardHTML(ctx.tclGroupLogs([log(1, 1, '2026-10-09', null, { notes: 'só nota' })], links)[0]).includes('Aula sem tópico'));
  check('lista vazia: sem aulas x com filtro', ctx.tclListHTML([], 0).includes('Nenhuma aula registrada ainda') && ctx.tclListHTML([], 5).includes('Nenhuma aula com esses filtros.') && !ctx.tclListHTML([], 5).includes('Registre a primeira'));

  // ---- 4. Tela, formulário, diálogo ----
  const sel = new Set(['s1|frances', 's2|frances']);
  const page = ctx.tclPageHTML({ links, groups: G, filtros: { aluno: '', curso: '', busca: '' }, selected: sel, today: '2026-10-12' });
  check('tela: título, subtítulo de privacidade e formulário ao lado', page.includes('<h2>Aulas</h2>') && page.includes('Só você vê estes registros.') && page.includes('id="form-aula"'));
  check('tela: filtro de aluno com 4 pessoas e filtro de curso (2 cursos)', (page.match(/<option value="s\d/g) || []).length === 4 && page.includes('data-aulas-curso'));
  check('formulário: chips das 2 pessoas e botão no plural', (page.match(/data-tirar-pessoa=/g) || []).length === 2 && page.includes('Registrar aula para 2 alunos') && !/id="aula-enviar" disabled/.test(page));
  const vazio = ctx.tclFormHTML(links, new Set(), '2026-10-12');
  check('formulário sem ninguém: botão desligado e texto de apoio', /id="aula-enviar" disabled/.test(vazio) && vazio.includes('Ninguém escolhido ainda') && vazio.includes('Preencha pelo menos um campo.'));
  check('formulário: data de hoje preenchida; 4 caixas de pessoas; as escolhidas marcadas', vazio.includes('value="2026-10-12"') && (vazio.match(/data-escolher-pessoa/g) || []).length === 4 && ctx.tclFormHTML(links, sel, 'x').includes('value="s1|frances" checked'));
  check('formulário com um vínculo só: sem filtro de curso', !ctx.tclPageHTML({ links: links.slice(0, 2), groups: [], filtros: { aluno: '', curso: '', busca: '' }, selected: new Set(), today: 'x' }).includes('data-aulas-curso'));
  const dlg = ctx.tclEditDialogHTML(grp);
  check('diálogo de edição: campos preenchidos e aviso de grupo', dlg.includes('value="Verbos"') && dlg.includes('Esta aula foi registrada para 3 pessoas. A mudança vale para todas.') && dlg.includes('data-gid="2"'));
  check('diálogo de edição de aula individual: sem aviso de grupo', !ctx.tclEditDialogHTML(G.find(g => g.logs.length === 1)).includes('p-alerta'));
  check('sem alunos: estado vazio com atalho para a aba Alunos', ctx.tclNoStudentsHTML().includes('Nenhum aluno vinculado ainda') && ctx.tclNoStudentsHTML().includes('data-ir-secao="students"'));
}

// ---- 5. Escape de HTML ----
{
  const evil = '<img src=x onerror=alert(1)>';
  const ev = [link(1, evil, evil)];
  const logs = [{ id: 1, student_id: 's1', language_app_key: 'frances', class_date: '2026-10-09', topic: evil, homework: evil, observations: evil, notes: evil, created_at: '2026-10-09T10:00:00Z' }];
  const G = ctx.tclGroupLogs(logs, ev);
  const html = ctx.tclPageHTML({ links: ev, groups: G, filtros: { aluno: '', curso: '', busca: '"><script>' }, selected: new Set(['s1|frances']), today: '2026-10-09' }) + ctx.tclEditDialogHTML(G[0]);
  check('nenhum <img nem <script crus (tópico, lição, notas, nome, busca)', !html.includes('<img') && !html.includes('<script'), html.match(/<(img|script)[^>]*>/));
  check('aspas do valor da busca escapadas', html.includes('value="&quot;&gt;&lt;script&gt;"'));
}
check('iniciais usadas nos avatares', ctx.tsuInitials('Ana Paula') === 'AP');
console.log(`${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
