// Node/VM -- peças de tela da aba Notificações (shared/admin-notifications-ui.js): ordem natural dos eventos, agrupamento e filtros,
// cartão da variante, formulários, janela de edição e escape de texto. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-admin/test_notifications_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Map, Promise,
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx); vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/admin-notifications-ui.js'), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };
const labelOf = e => ({ xp_earned: 'XP ganho', user_inactive_3: 'Inativo há 3 dias' }[e] || e);
const tpl = (id, ev, o) => Object.assign({ id, event_type: ev, channel: 'in_app', language_app_key: 'frances', title: null, body: 'Texto ' + id, icon: null, active: true }, o || {});
const T = [tpl(1, 'user_inactive_15'), tpl(2, 'user_inactive_3'), tpl(3, 'xp_earned', { icon: '⭐', title: 'Boa!' }), tpl(4, 'xp_earned', { language_app_key: 'mandarim', channel: 'email', active: false }), tpl(5, 'user_inactive_30'), tpl(6, 'user_inactive_1')];
const g = f => run('tntGroupTemplates(T, f, labelOf)', { T, f, labelOf });

check('ordem natural: 1, 3, 15, 30 e depois xp_earned', g({}).map(x => x.eventType).join() === 'user_inactive_1,user_inactive_3,user_inactive_15,user_inactive_30,xp_earned');
check('agrupa: XP tem 2 variantes', g({}).find(x => x.eventType === 'xp_earned').variants.length === 2);
check('filtro por evento', g({ evento: 'xp_earned' }).length === 1);
check('filtro por idioma', g({ idioma: 'mandarim' }).length === 1 && g({ idioma: 'mandarim' })[0].variants[0].id === 4);
check('filtro por canal', g({ canal: 'email' })[0].variants[0].id === 4);
check('busca sem acento no texto', g({ busca: 'BOA' }).length === 1 && g({ busca: 'boa' })[0].variants[0].id === 3);
check('busca pelo nome legível do evento', g({ busca: 'inativo' }).length === 1 && g({ busca: 'inativo' })[0].eventType === 'user_inactive_3');
check('busca sem resultado', g({ busca: 'zzz' }).length === 0);
check('filtros combinados', g({ idioma: 'frances', canal: 'in_app', evento: 'xp_earned' })[0].variants.length === 1);

const card = run('tntCardHTML(v)', { v: tpl(9, 'xp_earned', { title: '<b>x</b>', body: '<img src=x onerror=1>', icon: '⭐', active: false, channel: 'email', language_app_key: 'mandarim' }) });
check('cartão: texto e título escapados', !card.includes('<img') && !card.includes('<b>x') && card.includes('&lt;img') && card.includes('&lt;b&gt;x'));
check('cartão: emoji, e-mail, Chinês e desativada', card.includes('⭐') && card.includes('>e-mail<') && card.includes('Chinês') && card.includes('desativada') && card.includes('data-inativa'));
check('cartão: menu com editar, alternar (Ativar) e apagar', card.includes('data-editar-variante="9"') && card.includes('data-alternar-variante="9"') && card.includes('>Ativar<') && card.includes('data-apagar-variante="9"'));
const ativo = run('tntCardHTML(v)', { v: tpl(8, 'xp_earned') });
check('cartão: ativa mostra Desativar, ícone padrão 🔔 e sem título', ativo.includes('>Desativar<') && ativo.includes('🔔') && !ativo.includes('<h3>') && !ativo.includes('data-inativa'));

const lista = run('tntListHTML(G, 6, labelOf, h)', { G: g({}), labelOf, h: e => e === 'xp_earned' ? '{{amount}} -- XP' : '' });
check('lista: 5 seções, 6 cartões, contagem no título', (lista.match(/<section/g) || []).length === 5 && (lista.match(/data-variante=/g) || []).length === 6 && lista.includes('XP ganho'));
check('lista: dica de placeholders do evento aparece', lista.includes('{{amount}} -- XP'));
check('lista: sem nenhuma variante convida a criar', run('tntListHTML([], 0, labelOf)').includes('Crie a primeira variante'));
check('lista: filtro sem resultado só avisa', !run('tntListHTML([], 6, labelOf)').includes('Crie a primeira') && run('tntListHTML([], 6, labelOf)').includes('Nenhuma variante com esses filtros.'));

const fl = run('tntFiltersHTML(T, f, labelOf)', { T, f: { evento: 'xp_earned', idioma: 'mandarim', canal: 'email', busca: 'a"b' }, labelOf });
check('filtros: eventos únicos em ordem natural e o escolhido marcado', (fl.match(/<option value="user_inactive_/g) || []).length === 4 && fl.indexOf('user_inactive_3') < fl.indexOf('user_inactive_15') && /value="xp_earned" selected/.test(fl));
check('filtros: idioma, canal e busca preservados e escapados', /value="mandarim" selected/.test(fl) && /value="email" selected/.test(fl) && fl.includes('value="a&quot;b"'));

const nf = run('tntNewFormHTML(E, labelOf)', { E: ['xp_earned', 'a"b'] });
check('formulário novo: campos com limites (título 60, emoji 8, texto 300)', nf.includes('maxlength="60"') && nf.includes('maxlength="8"') && nf.includes('maxlength="300"'));
check('formulário novo: eventos conhecidos na lista de sugestões, escapados', nf.includes('<option value="xp_earned">XP ganho') && nf.includes('value="a&quot;b"'));
const rf = run('tntRuleHTML(r)', { r: { min_xp_amount: 5, cooldown_minutes: 30, daily_cap: 2 } });
check('regra do XP: valores do banco', /id="regra-minxp"[^>]*value="5"/.test(rf) && /id="regra-intervalo"[^>]*value="30"/.test(rf) && /id="regra-maximo"[^>]*value="2"/.test(rf));
const rv = run('tntRuleHTML(null)');
check('regra do XP: sem regra usa 15 min, 5 por dia e piso vazio', /id="regra-minxp"[^>]*value=""/.test(rv) && /id="regra-intervalo"[^>]*value="15"/.test(rv) && /id="regra-maximo"[^>]*value="5"/.test(rv));
check('regra do XP: zero é valor válido (não vira o padrão)', /id="regra-intervalo"[^>]*value="0"/.test(run('tntRuleHTML(r)', { r: { min_xp_amount: 0, cooldown_minutes: 0, daily_cap: 0 } })));
const ed = run('tntEditDialogHTML(v, labelOf)', { v: tpl(7, 'xp_earned', { title: 'T"1', body: '<x>', channel: 'email' }), labelOf });
check('edição: valores escapados, evento/canal só leitura', ed.includes('value="T&quot;1"') && ed.includes('&lt;x&gt;') && ed.includes('XP ganho') && ed.includes('e-mail') && ed.includes('não mudam'));
const pagina = run('tntPageHTML(s)', { s: { templates: T, filtros: {}, rule: null, labelOf, hintOf: () => '', knownEvents: { xp_earned: 1, achievement_unlocked: 1 } } });
check('página: lista, formulário novo e regra, tudo sob .painel', pagina.startsWith('<div class="painel">') && pagina.includes('data-notif-lista') && pagina.includes('id="form-variante"') && pagina.includes('id="form-regra-xp"'));
check('página: sugestões incluem eventos conhecidos que ainda não têm variante', pagina.includes('<option value="achievement_unlocked">'));

console.log(`painel-admin notificações (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
