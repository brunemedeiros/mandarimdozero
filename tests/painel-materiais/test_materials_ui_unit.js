// Node/VM -- peças de tela da aba Material de apoio (shared/teacher-materials-ui.js): agrupamento de envio em grupo, filtros,
// lista por mês, cartão, links seguros, chips, formulário e diálogo de edição. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-materiais/test_materials_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };

const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, isNaN, Promise, Intl, URL, APP_KEY: 'frances',
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx);
ctx.fmtDate = (d, o) => new Intl.DateTimeFormat('pt-BR', o || {}).format(d instanceof Date ? d : new Date(d));
vm.createContext(ctx);
for (const f of ['shared/srs.js', 'shared/admin-students.js', 'shared/teacher-students-ui.js', 'shared/teacher-materials-ui.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };
const link = (id, user, name, lang) => ({ id, student_id: 's' + id, username: user, display_name: name, language_app_key: lang || 'frances' });
const links = [link(1, 'ana', 'Ana Paula'), link(2, 'bia', 'Bia Lima'), link(3, 'caio', 'Caio Prado'), link(4, 'duda', 'Duda', 'mandarim')];
const mat = (id, sid, title, extra) => Object.assign({ id, student_id: 's' + sid, language_app_key: sid === 4 ? 'mandarim' : 'frances', title, description: null, link_url: null, file_url: null, file_name: null, created_at: `2026-10-02T15:00:00.${String(id).padStart(3, '0')}Z` }, extra || {});

// ---- links seguros ----
check('url: https vale', run('tmtSafeUrl("https://a.com/x")') === 'https://a.com/x');
check('url: http vale, com espaços nas pontas', run('tmtSafeUrl("  http://a.com ")') === 'http://a.com');
check('url: javascript: nunca', run('tmtSafeUrl("javascript:alert(1)")') === '');
check('url: data: nunca', run('tmtSafeUrl("data:text/html,x")') === '');
check('url: vazio', run('tmtSafeUrl(null)') === '');
check('host: tira o www', run('tmtHost("https://www.exemplo.com/a/b")') === 'exemplo.com');
check('tamanho: KB e MB', run('tmtSize(2048)') === '2 KB' && run('tmtSize(3 * 1048576)') === '3,0 MB' && run('tmtSize(10)') === '1 KB');

// ---- agrupamento ----
{
  const rows = [
    mat(1, 1, 'Resumo', { description: 'x', created_at: '2026-10-09T15:00:00Z' }),
    mat(2, 1, 'Vocab', { file_url: 'https://c/v.pdf', file_name: 'v.pdf' }), mat(3, 2, 'Vocab', { file_url: 'https://c/v.pdf', file_name: 'v.pdf' }),   // mesmo envio
    mat(4, 3, 'Vocab', { file_url: 'https://c/v.pdf', file_name: 'v.pdf', created_at: '2026-10-02T18:00:00Z' }),                                         // mesmo conteúdo, horas depois: outro envio
    mat(5, 2, 'Números', { description: 'y', created_at: '2026-09-20T15:00:00Z' }),
    mat(6, 9, 'De quem foi removido', { description: 'z' }),                                                                                             // sem vínculo ativo: some
    mat(7, 4, 'Vocab', { file_url: 'https://c/v.pdf', file_name: 'v.pdf' }),                                                                             // outro idioma, mesmo instante: entra no grupo
    mat(8, 1, 'Vocab', { file_url: 'https://c/OUTRO.pdf', file_name: 'o.pdf' }),                                                                         // outro arquivo: outro envio
  ];
  const G = run('tmtGroupMaterials(R, K)', { R: rows, K: links });
  check('grupos: 5 envios (removido fora)', G.length === 5, G.map(g => g.title));
  const v = G.find(g => g.title === 'Vocab' && g.file_url === 'https://c/v.pdf' && g.rows.length > 1);
  check('grupos: Ana, Bia e Duda no mesmo envio', v && v.rows.length === 3 && v.links.map(l => l.username).sort().join() === 'ana,bia,duda', v && v.links.map(l => l.username));
  check('grupos: o das 18h é separado', G.some(g => g.rows.length === 1 && g.rows[0].id === 4));
  check('grupos: arquivo diferente separa', G.some(g => g.rows.length === 1 && g.rows[0].id === 8));
  check('grupos: quem foi removido não aparece', !G.some(g => g.title === 'De quem foi removido'));
  check('grupos: mais recente primeiro', G[0].title === 'Resumo' && G[G.length - 1].title === 'Números');
  check('grupos: mesmo aluno duas vezes no mesmo instante não entra duas vezes', run('tmtGroupMaterials(R, K)', { R: [mat(1, 1, 'A', { description: 'x' }), mat(2, 1, 'A', { description: 'x' })], K: links }).length === 2);
  check('grupos: lista vazia', run('tmtGroupMaterials(null, K)', { K: links }).length === 0);

  // ---- filtros ----
  const f = x => run('tmtFilterGroups(G, f).map(g => g.title).join("|")', { G, f: x });
  check('filtro: sem filtro, todos', f({}).split('|').length === 5);
  check('filtro: por aluno (Bia só no Vocab em grupo)', f({ aluno: 's2' }) === 'Vocab|Números', f({ aluno: 's2' }));
  check('filtro: por curso mandarim só o grupo com a Duda', f({ curso: 'mandarim' }) === 'Vocab');
  check('filtro: busca sem acento e sem maiúscula', f({ busca: 'NUMEROS' }) === 'Números');
  check('filtro: busca pelo nome do arquivo', f({ busca: 'o.pdf' }) === 'Vocab');
  check('filtro: busca pelo nome da pessoa', f({ busca: 'caio' }) === 'Vocab');
  check('filtro: sem resultado', f({ busca: 'zzz' }) === '');

  // ---- lista ----
  const listaHTML = run('tmtListHTML(G, 5)', { G });
  check('lista: 2 meses em ordem', (listaHTML.match(/class="p-mes"/g) || []).length === 2 && listaHTML.indexOf('outubro') < listaHTML.indexOf('setembro'));
  check('lista: 5 cartões', (listaHTML.match(/data-material=/g) || []).length === 5);
  check('lista vazia sem material: convida a enviar', run('tmtListHTML([], 0)').includes('Envie o primeiro material'));
  check('lista vazia por filtro: só avisa', !run('tmtListHTML([], 5)').includes('Envie o primeiro material') && run('tmtListHTML([], 5)').includes('Nenhum material com esses filtros.'));

  // ---- cartão ----
  const card = run('tmtCardHTML(g)', { g: v });
  check('cartão: título, três avatares, nomes', card.includes('Vocab') && (card.match(/class="p-avatar"/g) || []).length === 3 && card.includes('Ana Paula'));
  check('cartão: arquivo como link seguro', /<a class="p-selo p-selo--info" href="https:\/\/c\/v\.pdf" target="_blank" rel="noopener noreferrer">Arquivo · v\.pdf</.test(card), card.slice(0, 700));
  check('cartão: menu com editar e apagar do envio', card.includes(`data-editar-material="${v.gid}"`) && card.includes(`data-apagar-material="${v.gid}"`));
  const perigoso = run('tmtCardHTML(g)', { g: { gid: 9, title: '<img src=x onerror=1>', description: '<script>1</script>', link_url: 'javascript:alert(1)', file_url: 'data:x', file_name: 'a"b', created_at: '2026-10-02T15:00:00Z', links: [links[0]], rows: [{}] } });
  check('cartão: texto do banco escapado', !perigoso.includes('<img') && !perigoso.includes('<script') && perigoso.includes('&lt;img'));
  check('cartão: link e arquivo perigosos não viram href', !/<a /.test(perigoso));
  const semAnexo = run('tmtCardHTML(g)', { g: Object.assign({}, G.find(g => g.title === 'Números')) });
  check('cartão: só descrição não desenha área de anexos', !semAnexo.includes('p-material-anexos') && semAnexo.includes('p-material-texto'));
}

// ---- chips, rótulo, formulário, diálogo ----
check('chips: ninguém escolhido', run('tmtChipsHTML(K, new Set())', { K: links }).includes('Ninguém escolhido'));
const chips = run('tmtChipsHTML(K, S)', { K: [{ student_id: 's1', display_name: '<b>Ana</b>', username: 'ana', language_app_key: 'frances' }], S: new Set(['s1|frances']) });
check('chips: nome escapado e botão de tirar com a chave', !chips.includes('<b>Ana') && chips.includes('data-tirar-pessoa="s1|frances"'));
check('botão: singular e plural', run('tmtSubmitLabel(1)') === 'Enviar material' && run('tmtSubmitLabel(3)') === 'Enviar material para 3 alunos');
const form = run('tmtFormHTML(K, S)', { K: links, S: new Set() });
check('formulário: desligado sem ninguém', /id="material-enviar" disabled/.test(form));
check('formulário: 4 pessoas no seletor, campo de arquivo e lista de anexos', (form.match(/data-escolher-pessoa/g) || []).length === 4 && form.includes('id="material-arquivo"') && form.includes('data-material-anexo'));
check('formulário: ligado com alguém', !/id="material-enviar" disabled/.test(run('tmtFormHTML(K, S)', { K: links, S: new Set(['s1|frances']) })));
const dlg = run('tmtEditDialogHTML(g)', { g: { gid: 5, title: 'T "q"', description: 'D', link_url: 'https://a', file_url: 'https://f', file_name: 'f.pdf', rows: [{}, {}] } });
check('edição: valores escapados nos atributos, aviso de grupo, arquivo mantido', dlg.includes('value="T &quot;q&quot;"') && dlg.includes('2 pessoas') && dlg.includes('f.pdf'));
check('edição: um só destinatário não mostra aviso de grupo', !run('tmtEditDialogHTML(g)', { g: { gid: 5, title: 'T', rows: [{}] } }).includes('p-alerta'));
check('sem alunos: atalho para Alunos', run('tmtNoStudentsHTML()').includes('data-ir-secao="students"'));
check('página: lista e formulário', (() => { const h = run('tmtPageHTML(s)', { s: { links, groups: [], filtros: {}, selected: new Set() } }); return h.includes('data-materiais-lista') && h.includes('id="form-material"'); })());

console.log(`painel-materiais (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
