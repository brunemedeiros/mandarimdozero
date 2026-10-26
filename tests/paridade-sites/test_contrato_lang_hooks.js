// Contrato único dos LANG_HOOKS (melhoria 1 da revisão de arquitetura, docs/revisao-codigo-compartilhado-arquitetura.md
// seção 5.4). Node, sem navegador. Para CADA site descoberto sozinho (pasta com index.html e app.js, scripts/lib/sites.js):
//   1. o site carrega shared/core/lang-hooks-contrato.js antes de lang-hooks.js e declara LANG_HOOKS com defineLangHooks;
//   2. nenhum gancho obrigatório falta (obrigatorioSe pelo content.js do site e pelo registro: módulos, Teste de Nível, família),
//      tipos certos, subchaves dos objetos fechados, nada fora do contrato;
//   3. toda chave de texto declarada (textKey, lessonKeys, trueFalseHintKeys, levelTestKeys, checkpointExam.keys) e toda
//      chave montada por LANG_HOOKS.uiKey('<sufixo literal>') no código comum existe em shared/i18n/pt-BR.js E en.js;
//   4. todo LANG_HOOKS.<gancho> (e LANG_HOOKS.<objeto fechado>.<subchave>) lido em shared/**/*.js está no contrato.
// Também prova que o teste pega o erro: site de mentira sem um gancho obrigatório, com chave de texto inexistente e com
// gancho fora do contrato.
// Rodar: node tests/paridade-sites/test_contrato_lang_hooks.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const { discoverSites } = require(path.join(ROOT, 'scripts/lib/sites.js'));
const C = require(path.join(ROOT, 'shared/core/lang-hooks-contrato.js'));
const { LanguageRegistry } = require(path.join(ROOT, 'languages/registry.js'));
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 900) : ''); } };

// catálogos de texto
const cat = {};
for (const lang of ['pt-BR', 'en']){
  const ctx = { window: {} }; ctx.window.I18N_CATALOG = {};
  vm.runInNewContext(read(`shared/i18n/${lang}.js`), ctx);
  cat[lang] = ctx.window.I18N_CATALOG[lang] || {};
}
check('catálogos carregados', Object.keys(cat['pt-BR']).length > 1000 && Object.keys(cat.en).length > 1000);
const existe = (k) => typeof k === 'string' && cat['pt-BR'][k] !== undefined && cat.en[k] !== undefined;

// usos no código comum
function jsFiles(dir){ return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? jsFiles(path.join(dir, d.name)) : (d.name.endsWith('.js') ? [path.join(dir, d.name)] : [])); }
const sharedSrc = jsFiles(path.join(ROOT, 'shared')).filter(f => !f.includes(path.join('shared', 'i18n'))).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const usados = new Set(), usadosSub = new Set();
for (const m of sharedSrc.matchAll(/LANG_HOOKS\.([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?/g)){ usados.add(m[1]); if (m[2]) usadosSub.add(m[1] + '.' + m[2]); }
const uiSufixos = [...new Set([...sharedSrc.matchAll(/LANG_HOOKS\.uiKey\(\s*'([^']+)'\s*\)/g)].map(m => m[1]))];
check(`código comum lê ganchos (${usados.size}) e uiKey com sufixos literais (${uiSufixos.length})`, usados.size > 60 && uiSufixos.length >= 9);

// 4. nada lido sem estar no contrato
const semDoc = [...usados].filter(n => !C.LANG_HOOKS_CONTRATO[n]);
check('todo gancho lido em shared/ está no contrato', semDoc.length === 0, semDoc);
const subSemDoc = [...usadosSub].filter(s => { const [n, k] = s.split('.'); const e = C.LANG_HOOKS_CONTRATO[n]; if (!e || e.tipo !== 'object' || e.aberto) return false;
  return ![...(e.chaves || []), ...(e.chavesOpcionais || [])].includes(k); });
check('toda subchave lida de objeto fechado (lessonKeys, typedAnswer, reviewTyped...) está no contrato', subSemDoc.length === 0, subSemDoc);
// e o contrato não guarda gancho morto
const mortos = Object.keys(C.LANG_HOOKS_CONTRATO).filter(n => !usados.has(n));
check('todo gancho do contrato é lido em algum lugar de shared/', mortos.length === 0, mortos);
check('toda entrada do contrato tem descrição e tipo conhecido', Object.entries(C.LANG_HOOKS_CONTRATO).every(([, e]) => e.desc && ['function', 'string', 'number', 'object', 'textKey'].includes(e.tipo)));
check('padrões só neutros (funções; nenhum texto)', Object.values(C.LANG_HOOKS_CONTRATO).every(e => e.padrao === undefined || typeof e.padrao === 'function'));

function carregarSite(site, src){
  const ctx = { console: { error(){}, warn(){}, log(){} }, t: (k) => k, window: {} };
  ctx.defineLangHooks = C.defineLangHooks;
  vm.createContext(ctx);
  const err = console.error; console.error = () => {}; // o aviso do defineLangHooks no console é conferido abaixo pelo verificarLangHooks
  try { vm.runInContext((src != null ? src : read(site + '/lang-hooks.js')) + '\n;this.__H = LANG_HOOKS;', ctx, { filename: site + '/lang-hooks.js' }); }
  finally { console.error = err; }
  return ctx.__H;
}
function contextoDoSite(site, appKey){
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read(site + '/content.js') + '\n;this.__m = typeof MODULES !== "undefined" ? MODULES : []; this.__lt = typeof LEVEL_TESTS !== "undefined" ? LEVEL_TESTS : [];', ctx);
  const lang = LanguageRegistry.all().find(l => l.appKey === appKey);
  return { familia: lang ? lang.family : null, modulos: ctx.__m.length > 0, testeDeNivel: ctx.__lt.length > 0 };
}
function conferir(tag, H, sctx){
  const problemas = C.verificarLangHooks(H, sctx);
  const chaves = C.chavesDeTextoDosLangHooks(H).filter(x => !existe(x.chave));
  const ui = uiSufixos.filter(s => !existe(H.uiKey(s))).map(s => H.uiKey(s));
  return { problemas, chaves, ui };
}

const sites = discoverSites(ROOT);
check('sites descobertos (fr e zh pelo menos)', sites.some(s => s.site === 'fr') && sites.some(s => s.site === 'zh'), sites);
for (const { site, appKey } of sites){
  const tag = `[${site}]`;
  const html = read(site + '/index.html');
  const iC = html.indexOf('../shared/core/lang-hooks-contrato.js'), iH = html.indexOf('<script src="lang-hooks.js"');
  check(`${tag} index.html carrega o contrato antes de lang-hooks.js`, iC > 0 && iH > iC);
  check(`${tag} lang-hooks.js usa defineLangHooks`, /const LANG_HOOKS = \(typeof defineLangHooks === .function. \? defineLangHooks : \(h\) => h\)\(\{/.test(read(site + '/lang-hooks.js')));
  const H = carregarSite(site);
  const sctx = contextoDoSite(site, appKey);
  check(`${tag} appKey dos ganchos = registro`, H.appKey === appKey, [H.appKey, appKey]);
  const r = conferir(tag, H, sctx);
  check(`${tag} ganchos completos e dentro do contrato (contexto ${JSON.stringify(sctx)})`, r.problemas.length === 0, r.problemas);
  check(`${tag} chaves de texto declaradas existem em pt-BR e en (${C.chavesDeTextoDosLangHooks(H).length})`, r.chaves.length === 0, r.chaves);
  check(`${tag} chaves montadas por uiKey existem em pt-BR e en (${uiSufixos.length})`, r.ui.length === 0, r.ui);
}

// O teste pega o erro (site de mentira a partir do fr)
{
  const src = read('fr/lang-hooks.js');
  const sctx = { familia: 'latin', modulos: true, testeDeNivel: true };
  const semSpeak = carregarSite('fr', src.replace(/\n  speak: \(\.\.\.a\) => speakFrench\(\.\.\.a\),/, ''));
  check('site de mentira sem speak: acusa', C.verificarLangHooks(semSpeak, sctx).some(p => p.includes('speak ')));
  const semFamilia = carregarSite('fr', src); delete semFamilia.familiaLatina;
  check('site latino sem familiaLatina: acusa', C.verificarLangHooks(semFamilia, sctx).some(p => p.includes('familiaLatina')));
  check('site de outra família sem familiaLatina: passa nesse item', !C.verificarLangHooks(semFamilia, { familia: 'cjk', modulos: true, testeDeNivel: true }).some(p => p.includes('familiaLatina')));
  const chaveRuim = carregarSite('fr', src.replace("voiceMissingKey: 'toast.voiceMissingFr'", "voiceMissingKey: 'pt.toast.naoExiste'"));
  check('chave de texto inexistente: acusa', conferir('x', chaveRuim, sctx).chaves.some(x => x.chave === 'pt.toast.naoExiste'));
  const extra = carregarSite('fr', src.replace('  textOf: (x) => x.f,', '  textOf: (x) => x.f,\n  ganchoNovo: () => 1,'));
  check('gancho fora do contrato: acusa', C.verificarLangHooks(extra, sctx).some(p => p.includes('ganchoNovo')));
  const subRuim = carregarSite('fr', src.replace("unitDone: 'toast.unitComplete',", "unitDone: 'toast.unitComplete', novaChave: 'x',"));
  check('subchave nova em lessonKeys: acusa', C.verificarLangHooks(subRuim, sctx).some(p => p.includes('lessonKeys.novaChave')));
  const padroes = carregarSite('fr', src.replace("  recapExtra: () => '',\n", '').replace('  afterOpenUnit: () => {},\n', ''));
  check('gancho com padrão neutro que falta: defineLangHooks põe o padrão', padroes.recapExtra() === '' && typeof padroes.afterOpenUnit === 'function' && C.verificarLangHooks(padroes, sctx).length === 0);
}

console.log(`contrato dos LANG_HOOKS: ${passed} passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
