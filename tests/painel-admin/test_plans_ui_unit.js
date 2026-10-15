// Node/VM -- peças de tela da aba Planos (shared/admin-plans-ui.js): termo de busca, opções da busca, ficha da conta, matriz de
// permissões e escape de texto vindo do banco. Textos do catálogo REAL pt-BR (tests/i18n/vm-t.js).
// Uso: node tests/painel-admin/test_plans_ui_unit.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const { installT } = require('../i18n/vm-t.js');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const check = (name, cond, x) => { if (cond) pass++; else { fail++; console.log('FALHA:', name, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const ctx = { console, Date, Math, JSON, Number, String, Array, Object, Set, Promise,
  escapeHTML: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
installT(ctx); vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/admin-plans-ui.js'), 'utf8'), ctx);
const run = (code, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(code, ctx); };

// ---- termo de busca ----
check('busca: tira o @ do começo', run('plnSearchTerm("@@ana")') === 'ana');
check('busca: tira caracteres do filtro', run('plnSearchTerm(" a%b,c(d)e*f\\\\g ")') === 'abcdefg');
check('busca: vazio e nulo', run('plnSearchTerm(null)') === '' && run('plnSearchTerm("")') === '');
check('inicial: maiúscula do nome, ou do usuário, ou ?', run('plnInitial({display_name:"ana"})') === 'A' && run('plnInitial({username:"zé"})') === 'Z' && run('plnInitial({})') === '?');
check('inicial: escapada', run('plnInitial({display_name:"<b>"})') === '&lt;');
check('permissão: usa o texto do catálogo quando existe', run('plnPermLabel({key:"own_cards_limit",label_pt:"x"})') === 'Cartões próprios (quantidade)');
check('permissão: sem texto no catálogo usa o do banco', run('plnPermLabel({key:"nova_coisa",label_pt:"Coisa nova"})') === 'Coisa nova');

// ---- página ----
const pg = run('plnPageHTML()');
check('página: título, busca como combobox e matriz', pg.includes('<h2>Planos</h2>') && /role="combobox"[^>]*aria-expanded="false"/.test(pg) && pg.includes('id="plans-matrix"') && pg.includes('id="plans-account"'));
check('página: campo de busca com rótulo para leitor de tela', /<label class="p-so-leitor" for="plans-search-input">/.test(pg));
check('página: tudo sob .painel', pg.startsWith('<div class="painel">'));

// ---- opções da busca ----
const rows = [{ user_id: 'u1', username: 'ana', display_name: 'Ana <i>', plan_tier: 'premium', role: 'teacher' }, { user_id: 'u2', username: 'anabela', display_name: null, plan_tier: 'free', role: 'admin' }, { user_id: 'u3', username: 'x', plan_tier: 'free', role: 'user' }];
const op = run('plnOptionsHTML(R, 1)', { R: rows });
check('opções: 3 itens, o ativo marcado', (op.match(/data-plano-opcao/g) || []).length === 3 && /id="plans-opt-1"[^>]*class="p-ativo"/.test(op) && !/id="plans-opt-0"[^>]*class="p-ativo"/.test(op));
check('opções: nome escapado', !op.includes('<i>') && op.includes('Ana &lt;i&gt;'));
check('opções: selos de Premium, Professora e Admin', op.includes('>Premium<') && op.includes('>Professora<') && op.includes('>Admin<'));
check('opções: sem selo para conta comum', !/id="plans-opt-2"[\s\S]*p-selo/.test(op.slice(op.indexOf('id="plans-opt-2"'))));
check('opções: sem nome usa o usuário', op.includes('<b>anabela</b>'));

// ---- ficha da conta ----
const conta = run('plnAccountHTML(P, I)', { P: { user_id: 'u1', username: 'ana', display_name: 'Ana' }, I: { roles: ['user', 'premium_basic', 'student'], admin: false } });
check('conta: 3 interruptores de plano', (conta.match(/data-plan-role=/g) || []).length === 3);
check('conta: só Premium Basic ligado', /data-plan-role="premium_basic"[^>]*aria-checked="true"[^>]* checked/.test(conta) && /data-plan-role="premium_pro"[^>]*aria-checked="false"/.test(conta) && !/data-plan-role="teacher"[^>]* checked/.test(conta));
check('conta: interruptor é checkbox com role switch', /<input type="checkbox" role="switch" data-plan-role="teacher"/.test(conta));
check('conta: aluna mostra ✓ e a explicação', conta.includes('Aluno ✓') && conta.includes('vínculo'));
check('conta: sem aviso de Admin para conta comum', !conta.includes('acesso a tudo'));
check('conta: admin mostra a nota', run('plnAccountHTML(P, I)', { P: { username: 'b' }, I: { roles: ['user'], admin: true } }).includes('acesso a tudo'));
check('conta: informação vazia não quebra', run('plnAccountHTML(P, null)', { P: { username: 'b' } }).includes('data-plan-role="teacher"'));

// ---- matriz ----
const cat = [{ key: 'own_cards_limit', kind: 'limit', label_pt: 'a', sort: 1 }, { key: 'rich_card_formats', kind: 'bool', label_pt: 'b', sort: 2 }, { key: 'zz"<x>', kind: 'bool', label_pt: 'Perigo <b>', sort: 3 }];
const perms = [{ role: 'user', permission_key: 'own_cards_limit', enabled: true, limit_value: 20 }, { role: 'premium_pro', permission_key: 'rich_card_formats', enabled: true, limit_value: null }, { role: 'teacher', permission_key: 'own_cards_limit', enabled: false, limit_value: 7 }];
const mx = run('plnMatrixHTML(C, P)', { C: cat, P: perms });
check('matriz: 3 linhas e 6 colunas no cabeçalho', (mx.match(/<tr>/g) || []).length === 4 && (mx.match(/<th scope="col"/g) || []).length === 6);
check('matriz: 15 células (3 × 5)', (mx.match(/data-plano-celula/g) || []).length === 15);
check('matriz: limite só nas permissões de número (5 campos)', (mx.match(/data-plano-limite/g) || []).length === 5);
check('matriz: Grátis tem limite 20 ligado', /data-role="user" data-key="own_cards_limit"[^>]*>\s*<input type="checkbox"[^>]* checked>\s*<input type="number"[^>]*value="20"/.test(mx));
check('matriz: desligada traz o campo de número desabilitado', /data-role="teacher" data-key="own_cards_limit"[^>]*>\s*<input type="checkbox"[^>]*>\s*<input type="number"[^>]*value="7"[^>]* disabled/.test(mx));
check('matriz: sem linha no banco = desligado', /data-role="student" data-key="rich_card_formats"[^>]*>\s*<input type="checkbox" aria-label="[^"]*">/.test(mx));
check('matriz: nome da permissão com HTML escapado, também no atributo', !mx.includes('Perigo <b>') && mx.includes('Perigo &lt;b&gt;') && mx.includes('data-key="zz&quot;&lt;x&gt;"'));
check('matriz: cada caixa tem nome acessível com permissão e tipo de conta', mx.includes('aria-label="Cartões próprios (quantidade): Premium Pro"'));
check('matriz: sob o contêiner de tabela do painel', mx.startsWith('<div class="p-tabela p-tabela--matriz">'));

console.log(`painel-admin planos (peças de tela): ${pass}/${pass + fail} checks`);
process.exit(fail ? 1 : 0);
