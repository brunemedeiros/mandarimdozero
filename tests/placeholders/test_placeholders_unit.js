// Placeholders de perfil (shared/profile-placeholders.js) -- Node/VM. Rodar: node tests/placeholders/test_placeholders_unit.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

function load(globals){
  const ctx = vm.createContext(Object.assign({ console }, globals || {}));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/profile-placeholders.js'), 'utf8') + ';globalThis.__api={buildProfilePlaceholderContext,resolveProfilePlaceholders,applyProfilePlaceholders,sanitizeProfileName,hasProfilePlaceholder,PROFILE_COUNTRIES,profileCountryName};', ctx);
  return ctx;
}
const { __api: A } = load();

// ---- substituição básica ----
const ctxBR = A.buildProfilePlaceholderContext({ profile: { display_name: 'Ana Souza', country: 'BR' }, studyLang: 'fr', uiLang: 'pt-BR' });
check('nome completo', A.resolveProfilePlaceholders('Je m\'appelle {nome}.', ctxBR) === "Je m'appelle Ana Souza.");
check('primeiro nome', A.resolveProfilePlaceholders('{primeiro_nome}', ctxBR) === 'Ana');
check('nacionalidade fr BR', A.resolveProfilePlaceholders('Je suis {nacionalidade}.', ctxBR) === 'Je suis brésilienne.');
check('nacionalidade_t pt BR', A.resolveProfilePlaceholders('Eu sou {nacionalidade_t}.', ctxBR) === 'Eu sou brasileira.');
const ctxUS = A.buildProfilePlaceholderContext({ profile: { display_name: 'John', country: 'US' }, studyLang: 'fr', uiLang: 'en' });
check('US fr/en', A.resolveProfilePlaceholders('{nacionalidade}|{nacionalidade_t}', ctxUS) === 'américaine|American');
const ctxZH = A.buildProfilePlaceholderContext({ profile: { display_name: 'Li', country: 'US' }, studyLang: 'zh', uiLang: 'pt-BR' });
check('zh hanzi + pinyin', A.resolveProfilePlaceholders('我是{nacionalidade}。 {nacionalidade_p}', ctxZH) === '我是美国人。 Měiguó rén');
check('placeholder desconhecido fica', A.resolveProfilePlaceholders('{xyz} {nome}', ctxBR) === '{xyz} Ana Souza');
check('texto sem placeholder intacto (mesma referência de valor)', A.resolveProfilePlaceholders('Bonjour', ctxBR) === 'Bonjour');
check('não-string passa direto', A.resolveProfilePlaceholders(null, ctxBR) === null);

// ---- convidado / sem país / sem nome ----
const g = A.buildProfilePlaceholderContext({ profile: null, guest: true, studyLang: 'fr', uiLang: 'pt-BR' });
check('convidado = Convidado', g.nome === 'Convidado' && g.primeiro_nome === 'Convidado');
check('convidado en = Guest', A.buildProfilePlaceholderContext({ guest: true, uiLang: 'en' }).nome === 'Guest');
check('convidado ignora perfil', A.buildProfilePlaceholderContext({ profile: { display_name: 'X' }, guest: true }).nome === 'Convidado');
check('sem país = Brasil', g.nacionalidade === 'brésilienne' && g.nacionalidade_t === 'brasileira');
check('país desconhecido = Brasil', A.buildProfilePlaceholderContext({ profile: { country: 'ZZ' }, studyLang: 'fr' }).nacionalidade === 'brésilienne');
check('país minúsculo aceito', A.buildProfilePlaceholderContext({ profile: { country: 'us' }, studyLang: 'fr' }).nacionalidade === 'américaine');
check('conta sem display_name = Convidado', A.buildProfilePlaceholderContext({ profile: { display_name: '   ' }, studyLang: 'fr' }).nome === 'Convidado');

// ---- nomes com acento, aspas, HTML ----
check('acento preservado', A.sanitizeProfileName('José Ângelo') === 'José Ângelo');
check('aspas e apóstrofo preservados', A.sanitizeProfileName('Anne "Ana" D\'Ávila') === 'Anne "Ana" D\'Ávila');
check('tags removidas', !/[<>]/.test(A.sanitizeProfileName('<img src=x onerror=alert(1)>Ana')), A.sanitizeProfileName('<img src=x onerror=alert(1)>Ana'));
check('<script> não sobrevive', !/<|>/.test(A.resolveProfilePlaceholders('{nome}', A.buildProfilePlaceholderContext({ profile: { display_name: '<script>alert(1)</script>' } }))));
check('controle e espaços colapsados', A.sanitizeProfileName('A\n\tB   C') === 'A B C');
check('limite 60', A.sanitizeProfileName('x'.repeat(100)).length === 60);
// padrões especiais do String.replace ($&, $1) não podem vazar
check('$& no nome é literal', A.resolveProfilePlaceholders('{nome}', A.buildProfilePlaceholderContext({ profile: { display_name: 'A$&B$1' } })) === 'A$&B$1');
check('primeiro nome com acento', A.buildProfilePlaceholderContext({ profile: { display_name: 'Åsa Ñandú' } }).primeiro_nome === 'Åsa');

// ---- applyProfilePlaceholders sobre UNITS (in place, reaplicável) ----
const mk = () => [{ id: 'u', phrases: [{ f: "Je m'appelle {nome}.", t: 'Eu me chamo {nome}.', blocks: [{ f: '{nome}.' }, { f: 'Je suis {nacionalidade}.' }], scenario: 'Você é {nacionalidade_t}.' }], vocab: [{ f: 'brésilien / brésilienne' }] }];
const C = load({ UNITS: mk(), APP_KEY: 'frances', CURRENT_USER: null, PROFILE_CACHE: null, getUiLang: () => 'pt-BR' });
vm.runInContext('applyProfilePlaceholders()', C);
let U = vm.runInContext('UNITS', C);
check('convidado: frase', U[0].phrases[0].f === "Je m'appelle Convidado." && U[0].phrases[0].t === 'Eu me chamo Convidado.', U[0].phrases[0]);
check('convidado: blocks', U[0].phrases[0].blocks[0].f === 'Convidado.' && U[0].phrases[0].blocks[1].f === 'Je suis brésilienne.');
check('vocab sem placeholder intacto', U[0].vocab[0].f === 'brésilien / brésilienne');
// perfil carrega depois: reescreve a partir do modelo
vm.runInContext('CURRENT_USER={id:1}; PROFILE_CACHE={display_name:"Maria Clara",country:"US"}; applyProfilePlaceholders()', C);
check('perfil: nome', U[0].phrases[0].f === "Je m'appelle Maria Clara." && U[0].phrases[0].blocks[0].f === 'Maria Clara.', U[0].phrases[0].f);
check('perfil: país US', U[0].phrases[0].blocks[1].f === 'Je suis américaine.' && U[0].phrases[0].scenario === 'Você é americana.');
// troca de perfil de novo (modelo preservado)
vm.runInContext('PROFILE_CACHE={display_name:"Zé",country:"BR"}; applyProfilePlaceholders()', C);
check('troca de perfil reescreve', U[0].phrases[0].t === 'Eu me chamo Zé.' && U[0].phrases[0].scenario === 'Você é brasileira.');
// overlay do content-i18n reaplicando texto novo com placeholder (inglês) vira novo modelo
vm.runInContext('UNITS[0].phrases[0].t = "Hello! My name is {nome}."; applyProfilePlaceholders()', C);
check('texto novo com placeholder vira modelo', U[0].phrases[0].t === 'Hello! My name is Zé.');
vm.runInContext('PROFILE_CACHE={display_name:"Bia"}; applyProfilePlaceholders()', C);
check('...e reage a mudança de perfil', U[0].phrases[0].t === 'Hello! My name is Bia.');
// texto novo SEM placeholder (overlay estático) não é sobrescrito pelo modelo velho
vm.runInContext('UNITS[0].phrases[0].t = "Olá!"; applyProfilePlaceholders()', C);
check('texto novo sem placeholder preservado', U[0].phrases[0].t === 'Olá!');
// idempotência
vm.runInContext('applyProfilePlaceholders(); applyProfilePlaceholders()', C);
check('idempotente', U[0].phrases[0].f === "Je m'appelle Bia." );
// zh
const Z = load({ UNITS: [{ phrases: [{ p: 'Wǒ shì {nacionalidade_p}.', c: '我是{nacionalidade}。' }] }], APP_KEY: 'mandarim', CURRENT_USER: { id: 1 }, PROFILE_CACHE: { display_name: 'A', country: 'PT' }, getUiLang: () => 'pt-BR' });
vm.runInContext('applyProfilePlaceholders()', Z);
const zu = vm.runInContext('UNITS', Z);
check('zh apply', zu[0].phrases[0].c === '我是葡萄牙人。' && zu[0].phrases[0].p === 'Wǒ shì Pútáoyá rén.', zu[0].phrases[0]);
// sem UNITS: não lança
check('sem UNITS = null', load({}).__api.applyProfilePlaceholders() === null);

// ---- tabela de países ----
check('BR e US presentes', ['BR', 'US'].every(c => A.PROFILE_COUNTRIES.some(x => x.code === c)));
check('toda entrada completa', A.PROFILE_COUNTRIES.every(c => c.fr && c.zh && c.zhp && c.pt && c.en && c.names['pt-BR'] && c.names.en && /^[A-Z]{2}$/.test(c.code)));
check('códigos únicos', new Set(A.PROFILE_COUNTRIES.map(c => c.code)).size === A.PROFILE_COUNTRIES.length);
check('nome do país por idioma', A.profileCountryName('US', 'en') === 'United States' && A.profileCountryName('US', 'pt-BR') === 'Estados Unidos');

// ---- conteúdo real: nenhum placeholder desconhecido ---
for (const lang of ['fr', 'zh']){
  const src = fs.readFileSync(path.join(ROOT, lang, 'content.js'), 'utf8');
  const found = [...src.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(k => /^(nome|primeiro_nome|nacionalidade\w*)$/.test(k) || false);
  const ok = new Set(['nome', 'primeiro_nome', 'nacionalidade', 'nacionalidade_p', 'nacionalidade_t']);
  check(lang + ': conteúdo só usa placeholders conhecidos', found.every(k => ok.has(k)) && found.length > 0, found);
  const ctxc = vm.createContext({ console });
  vm.runInContext(src + ';globalThis.U=UNITS;', ctxc);
  const walk = (o, f) => { if (typeof o === 'string') f(o); else if (o && typeof o === 'object') Object.values(o).forEach(v => walk(v, f)); };
  let leftover = [];
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/profile-placeholders.js'), 'utf8'), ctxc);
  vm.runInContext('globalThis.UNITS=U; globalThis.APP_KEY=' + JSON.stringify(lang === 'fr' ? 'frances' : 'mandarim') + '; applyProfilePlaceholders({guest:true});', ctxc);
  walk(vm.runInContext('U', ctxc), s => { if (/\{(nome|primeiro_nome|nacionalidade\w*)\}/.test(s)) leftover.push(s); });
  check(lang + ': nenhuma string do conteúdo fica com placeholder depois de aplicar', leftover.length === 0, leftover.slice(0, 3));
}

console.log(`${passed} ok, ${failed} falhas`);
process.exit(failed ? 1 : 0);
