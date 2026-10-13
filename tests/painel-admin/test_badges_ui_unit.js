// Node/VM -- peças de tela da aba Badges (shared/admin-badges-ui.js): filtros de concessões, cartão do badge, tabela, formulários,
// janelas de editar e de gerenciar pessoas e escape de texto. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-admin/test_badges_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise, Intl,
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx); ctx.fmtDate = (d) => new Intl.DateTimeFormat('pt-BR').format(new Date(d)); vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/admin-badges-ui.js'), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };
const CAT = [{ id: 'colab', name: 'Colaboradora', icon: '🛠️', description: 'Ajudou no app' }, { id: 'beta', name: 'Beta <b>', icon: '🧪', description: null }];
const SVG = '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>';
const BUILT = [{ id: 'xp_100', name: '100 XP', icon: '⭐', desc: 'Chegou a 100 XP' }, { id: 'founder', name: 'Fundadora', icon: SVG, desc: 'Primeira' }, { id: 'streak_7', name: '7 dias', icon: '🔥', desc: 'Uma semana' }];
const G = [
  { user_id: 'u1', badge_id: 'colab', username: 'ana', display_name: 'Ana Souza', note: 'reportou bug', granted_at: '2026-10-01T10:00:00Z' },
  { user_id: 'u2', badge_id: 'colab', username: 'bia', display_name: null, note: null, granted_at: '2026-10-02T10:00:00Z' },
  { user_id: 'u1', badge_id: 'xp_100', username: 'ana', display_name: 'Ana Souza', note: null, granted_at: '2026-10-03T10:00:00Z' },
  { user_id: 'u1', badge_id: 'founder', username: 'ana', display_name: 'Ana Souza', note: null, granted_at: '2026-10-05T10:00:00Z' },
  { user_id: 'u9', badge_id: 'removido_do_catalogo', username: null, display_name: null, note: '<i>x</i>', granted_at: '2026-10-04T10:00:00Z' },
];
const P = [{ user_id: 'u1', username: 'ana', display_name: 'Ana Souza' }, { user_id: 'u2', username: 'bia', display_name: null }, { user_id: 'u3', username: 'caio', display_name: 'Caio "C"' }];
const fg = f => run('tbdFilterGrants(G, f, CAT, BUILT).length', { G, f, CAT, BUILT });

check('busca de badge: catálogo, automático e desconhecido', run('tbdFindBadge("colab", CAT, BUILT).name', { CAT, BUILT }) === 'Colaboradora' && run('tbdFindBadge("xp_100", CAT, BUILT).icon', { CAT, BUILT }) === '⭐' && run('tbdFindBadge("zzz", CAT, BUILT)', { CAT, BUILT }) === null);
check('filtro: sem filtro, todas', fg({}) === 5);
check('filtro: por badge', fg({ badge: 'colab' }) === 2);
check('filtro: busca por usuário, sem acento e sem maiúscula', fg({ busca: 'ANA' }) === 3);
check('filtro: busca pelo nome da pessoa', fg({ busca: 'souza' }) === 3);
check('filtro: busca pela nota', fg({ busca: 'bug' }) === 1);
check('filtro: busca pelo nome do badge', fg({ busca: 'colabor' }) === 2);
check('filtro: badge e busca juntos', fg({ badge: 'colab', busca: 'bia' }) === 1);
check('filtro: sem resultado', fg({ busca: 'zzz' }) === 0);

const card = run('tbdCardHTML(b, 3)', { b: CAT[1] });
check('cartão: nome escapado, 3 pessoas, id e ações', !card.includes('<b>') && card.includes('Beta &lt;b&gt;') && card.includes('3 pessoas') && card.includes('>beta<') && card.includes('data-gerenciar-badge="beta"') && card.includes('data-editar-badge="beta"') && card.includes('data-apagar-badge="beta"'));
check('cartão: uma pessoa no singular', run('tbdCardHTML(b, 1)', { b: CAT[0] }).includes('1 pessoa<'));
check('catálogo: 2 cartões com a contagem certa', (() => { const h = run('tbdCatalogHTML(CAT, G)', { CAT, G }); return (h.match(/data-badge=/g) || []).length === 2 && h.includes('2 pessoas') && h.includes('0 pessoas'); })());
check('catálogo vazio convida a criar', run('tbdCatalogHTML([], [])').includes('Crie o primeiro badge'));
const bi = run('tbdBuiltinHTML(BUILT)', { BUILT });
check('automáticos: recolhido, com contagem e nomes', bi.startsWith('<details') && !/ open/.test(bi.split('>')[0]) && bi.includes('100 XP') && bi.includes('7 dias') && bi.includes('>3<') && bi.includes('<svg viewBox'));
check('SVG do automático só entra como está nos automáticos; um "ícone" SVG vindo do catálogo é escapado', !run('tbdCardHTML(b, 0)', { b: { id: 'x', name: 'n', icon: SVG, description: '' } }).includes('<svg') && run('tbdFiltersHTML(CAT, BUILT, G, f)', { CAT, BUILT, G, f: {} }).includes('Fundadora') && !run('tbdFiltersHTML(CAT, BUILT, G, f)', { CAT, BUILT, G, f: {} }).includes('<svg'));

const flt = run('tbdFiltersHTML(CAT, BUILT, G, f)', { CAT, BUILT, G, f: { badge: 'xp_100', busca: 'a"b' } });
check('filtros: badges do catálogo e só os automáticos que têm concessão', flt.includes('value="colab"') && flt.includes('value="xp_100" selected') && !flt.includes('value="streak_7"') && flt.includes('value="a&quot;b"'));
const tab = run('tbdGrantsTableHTML(G, 5, CAT, BUILT)', { G, CAT, BUILT });
check('tabela: 5 linhas com pessoa, badge, nota, data e revogar', (tab.match(/data-concessao/g) || []).length === 5 && tab.includes('@ana') && tab.includes('Ana Souza') && tab.includes('Colaboradora') && tab.includes('reportou bug') && tab.includes('01/10/2026') && (tab.match(/data-revogar/g) || []).length === 5);
check('tabela: conta apagada e badge fora do catálogo não quebram; nota escapada', tab.includes('(usuário removido)') && tab.includes('🏅 removido_do_catalogo'), tab.slice(tab.indexOf('u9') - 50, tab.indexOf('u9') + 400));
check('tabela: texto do banco escapado', !tab.includes('<i>x</i>') && tab.includes('&lt;i&gt;x&lt;/i&gt;'));
check('tabela: revogar com nome acessível (badge e pessoa)', tab.includes('aria-label="Revogar Colaboradora de @ana"'));
check('tabela vazia: sem concessão e com filtro', run('tbdGrantsTableHTML([], 0, CAT, BUILT)', { CAT, BUILT }).includes('Nenhum badge concedido ainda') && run('tbdGrantsTableHTML([], 5, CAT, BUILT)').includes('Nenhuma concessão com esses filtros'));

const cf = run('tbdCreateFormHTML()');
check('criar: limites de 40, 8, 32 e 120 caracteres', ['maxlength="40"', 'maxlength="8"', 'maxlength="32"', 'maxlength="120"'].every(x => cf.includes(x)));
const gf = run('tbdGrantFormHTML(CAT, P)', { CAT, P });
check('conceder: select com os badges e sugestões de @usuario escapadas', gf.includes('🛠️ Colaboradora') && gf.includes('<option value="caio">Caio &quot;C&quot;') && !/id="conceder-enviar" disabled/.test(gf));
check('conceder: sem badge criado, botão desligado e aviso', /id="conceder-enviar" disabled/.test(run('tbdGrantFormHTML([], P)', { P })) && run('tbdGrantFormHTML([], P)', { P }).includes('Crie um badge primeiro'));
const ed = run('tbdEditDialogHTML(b)', { b: { id: 'x"y', name: 'N"', icon: '🛠️', description: '<d>' } });
check('editar: valores escapados em atributos e aviso sobre o identificador', ed.includes('value="N&quot;"') && ed.includes('value="x&quot;y"') && ed.includes('&lt;d&gt;') && ed.includes('concessões acompanham'));
const md = run('tbdMembersDialogHTML(b, P, G)', { b: CAT[0], P, G });
check('pessoas: quem tem o badge vem primeiro e marcado, com a nota', md.indexOf('data-user="u1"') < md.indexOf('data-user="u3"') && /data-user="u1" checked data-tinha="1"/.test(md) && md.includes('value="reportou bug"') && !/data-user="u3" checked/.test(md));
check('pessoas: nome escapado, busca e nota com nome acessível', md.includes('Caio &quot;C&quot;') && md.includes('data-buscar-membro') && md.includes('aria-label="Nota para @caio"'));
check('pessoas: sem ninguém no sistema avisa', run('tbdMembersDialogHTML(b, [], [])', { b: CAT[0] }).includes('Ninguém criou um perfil ainda'));
const pg = run('tbdPageHTML(s)', { s: { catalog: CAT, grants: G, profiles: P, builtin: BUILT, filtros: { badge: '', busca: '' } } });
check('página: catálogo, concessões, automáticos e os dois formulários sob .painel', pg.startsWith('<div class="painel">') && pg.includes('data-badges-catalogo') && pg.includes('data-badges-concessoes') && pg.includes('p-automaticos') && pg.includes('id="form-criar-badge"') && pg.includes('id="form-conceder-badge"'));

console.log(`painel-admin badges (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
