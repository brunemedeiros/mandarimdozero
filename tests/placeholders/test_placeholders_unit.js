// Placeholders de perfil (shared/profile-placeholders.js) -- Node/VM. Rodar: node tests/placeholders/test_placeholders_unit.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

function load(globals){
  const ctx = vm.createContext(Object.assign({ console }, globals || {}));
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/profile-placeholders.js'), 'utf8') + ';globalThis.__api={buildProfilePlaceholderContext,resolveProfilePlaceholders,applyProfilePlaceholders,sanitizeProfileName,hasProfilePlaceholder,PROFILE_COUNTRIES,profileCountryName,speakableProfileText};', ctx);
  return ctx;
}
const { __api: A } = load();

// ---- substituição básica ----
const ctxBR = A.buildProfilePlaceholderContext({ profile: { display_name: 'Ana Souza', country: 'BR' }, studyLang: 'fr', uiLang: 'pt-BR' });
check('nome completo', A.resolveProfilePlaceholders('Je m\'appelle {nome}.', ctxBR) === "Je m'appelle Ana Souza.");
check('primeiro nome', A.resolveProfilePlaceholders('{primeiro_nome}', ctxBR) === 'Ana');
check('nacionalidade fr BR', A.resolveProfilePlaceholders('Je suis {nacionalidade}.', ctxBR) === 'Je suis brésilien·ne.'); // sem gênero = neutra
check('nacionalidade_t pt BR', A.resolveProfilePlaceholders('Eu sou {nacionalidade_t}.', ctxBR) === 'Eu sou brasileiro·a.');
const ctxUS = A.buildProfilePlaceholderContext({ profile: { display_name: 'John', country: 'US' }, studyLang: 'fr', uiLang: 'en' });
check('US fr/en', A.resolveProfilePlaceholders('{nacionalidade}|{nacionalidade_t}', ctxUS) === 'américain·e|American');
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
check('sem país = Brasil', g.nacionalidade === 'brésilien·ne' && g.nacionalidade_t === 'brasileiro·a');
check('país desconhecido = Brasil', A.buildProfilePlaceholderContext({ profile: { country: 'ZZ' }, studyLang: 'fr' }).nacionalidade === 'brésilien·ne');
check('país minúsculo aceito', A.buildProfilePlaceholderContext({ profile: { country: 'us' }, studyLang: 'fr' }).nacionalidade === 'américain·e');
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


// ---- gênero (decisão 2026-10-06) ----
const gctx = (gender, country, lang, ui) => A.buildProfilePlaceholderContext({ profile: { country: country || 'BR' }, gender, studyLang: lang || 'fr', uiLang: ui || 'pt-BR' });
check('masculino BR: fr e pt', gctx('masculine').nacionalidade === 'brésilien' && gctx('masculine').nacionalidade_t === 'brasileiro');
check('feminino BR: fr e pt', gctx('feminine').nacionalidade === 'brésilienne' && gctx('feminine').nacionalidade_t === 'brasileira');
for (const g of ['other', 'undisclosed', null, undefined, '', 'xyz']){
  check('neutro para ' + JSON.stringify(g), gctx(g).nacionalidade === 'brésilien·ne' && gctx(g).nacionalidade_t === 'brasileiro·a');
}
check('convidado ignora gênero (neutro)', A.buildProfilePlaceholderContext({ guest: true, gender: 'masculine', studyLang: 'fr' }).nacionalidade === 'brésilien·ne');
check('en não tem gênero', gctx('masculine', 'US', 'fr', 'en').nacionalidade_t === 'American' && gctx('feminine', 'US', 'fr', 'en').nacionalidade_t === 'American' && gctx(null, 'US', 'fr', 'en').nacionalidade_t === 'American');
check('zh não tem gênero', ['masculine', 'feminine', 'other', null].every(g => gctx(g, 'US', 'zh').nacionalidade === '美国人'));
check('zh pinyin e hanzi iguais com gênero', gctx('masculine', 'JP', 'zh').nacionalidade_p === 'Rìběn rén');
// todos os países: masc/fem/neutro coerentes
check('todo país: neutro = masc+terminação ou igual', A.PROFILE_COUNTRIES.every(c => c.frn === c.frm || c.frn.replace('\u00B7', '').startsWith(c.frm)) && A.PROFILE_COUNTRIES.every(c => c.ptn === c.ptm || c.ptn.indexOf('\u00B7') > 0));
check('todo país: neutro com · só quando masc != fem', A.PROFILE_COUNTRIES.every(c => (c.frm === c.fr) === (c.frn.indexOf('\u00B7') === -1)) && A.PROFILE_COUNTRIES.every(c => (c.ptm === c.pt) === (c.ptn.indexOf('\u00B7') === -1)));
// apply com gênero via PROFILE_PRIVATE_CACHE
const GP = load({ UNITS: [{ phrases: [{ f: 'Je suis {nacionalidade}.', t: 'Sou {nacionalidade_t}.' }] }], APP_KEY: 'frances', CURRENT_USER: { id: 1 }, PROFILE_CACHE: { country: 'FR' }, PROFILE_PRIVATE_CACHE: { gender: 'masculine' }, getUiLang: () => 'pt-BR' });
vm.runInContext('applyProfilePlaceholders()', GP);
let gu = vm.runInContext('UNITS', GP);
check('apply masculino', gu[0].phrases[0].f === 'Je suis français.' && gu[0].phrases[0].t === 'Sou francês.', gu[0].phrases[0]);
vm.runInContext('PROFILE_PRIVATE_CACHE={gender:"feminine"}; applyProfilePlaceholders()', GP);
check('apply feminino (reescreve)', gu[0].phrases[0].f === 'Je suis française.' && gu[0].phrases[0].t === 'Sou francesa.');
vm.runInContext('PROFILE_PRIVATE_CACHE={gender:"undisclosed"}; applyProfilePlaceholders()', GP);
check('apply prefiro não dizer = neutro', gu[0].phrases[0].f === 'Je suis français·e.' && gu[0].phrases[0].t === 'Sou francês·a.');
vm.runInContext('PROFILE_PRIVATE_CACHE=null; applyProfilePlaceholders()', GP);
check('apply sem cache = neutro', gu[0].phrases[0].f === 'Je suis français·e.');

// ---- áudio: neutro lido com as duas formas ----
const spk = load({}); vm.runInContext('globalThis.__s=speakableProfileText', spk);
const speak = spk.__s;
check('fala: brésilien·ne', speak('Je suis brésilien·ne.') === 'Je suis brésilien, brésilienne.', speak('Je suis brésilien·ne.'));
check('fala: português·a', speak('Sou português·a.') === 'Sou português, portuguesa.');
check('fala: alemão·ã', speak('Sou alemão·ã.') === 'Sou alemão, alemã.');
check('fala: texto sem · passa direto', speak('Je suis brésilienne.') === 'Je suis brésilienne.' && speak(null) === null);
check('fala: "·" que não é nacionalidade fica', speak('a·b') === 'a·b');
check('fala: todo neutro com · do catálogo vira masc, fem', A.PROFILE_COUNTRIES.every(c => c.frn.indexOf('\u00B7') === -1 || speak(c.frn) === c.frm + ', ' + c.fr));
check('fala: todo neutro pt do catálogo', A.PROFILE_COUNTRIES.every(c => c.ptn.indexOf('\u00B7') === -1 || speak(c.ptn) === c.ptm + ', ' + c.pt));
// o texto exibido (placeholder resolvido) é o que vai para speak; o original não muda
const shown = A.resolveProfilePlaceholders('Je suis {nacionalidade}.', gctx(null));
check('exibido mantém ·; falado expande', shown === 'Je suis brésilien·ne.' && speak(shown) === 'Je suis brésilien, brésilienne.');

// ---- applyProfilePlaceholders sobre UNITS (in place, reaplicável) ----
const mk = () => [{ id: 'u', phrases: [{ f: "Je m'appelle {nome}.", t: 'Eu me chamo {nome}.', blocks: [{ f: '{nome}.' }, { f: 'Je suis {nacionalidade}.' }], scenario: 'Você é {nacionalidade_t}.' }], vocab: [{ f: 'brésilien / brésilienne' }] }];
const C = load({ UNITS: mk(), APP_KEY: 'frances', CURRENT_USER: null, PROFILE_CACHE: null, getUiLang: () => 'pt-BR' });
vm.runInContext('applyProfilePlaceholders()', C);
let U = vm.runInContext('UNITS', C);
check('convidado: frase', U[0].phrases[0].f === "Je m'appelle Convidado." && U[0].phrases[0].t === 'Eu me chamo Convidado.', U[0].phrases[0]);
check('convidado: blocks', U[0].phrases[0].blocks[0].f === 'Convidado.' && U[0].phrases[0].blocks[1].f === 'Je suis brésilien·ne.');
check('vocab sem placeholder intacto', U[0].vocab[0].f === 'brésilien / brésilienne');
// perfil carrega depois: reescreve a partir do modelo
vm.runInContext('CURRENT_USER={id:1}; PROFILE_CACHE={display_name:"Maria Clara",country:"US"}; applyProfilePlaceholders()', C);
check('perfil: nome', U[0].phrases[0].f === "Je m'appelle Maria Clara." && U[0].phrases[0].blocks[0].f === 'Maria Clara.', U[0].phrases[0].f);
check('perfil: país US', U[0].phrases[0].blocks[1].f === 'Je suis américain·e.' && U[0].phrases[0].scenario === 'Você é americano·a.');
// troca de perfil de novo (modelo preservado)
vm.runInContext('PROFILE_CACHE={display_name:"Zé",country:"BR"}; applyProfilePlaceholders()', C);
check('troca de perfil reescreve', U[0].phrases[0].t === 'Eu me chamo Zé.' && U[0].phrases[0].scenario === 'Você é brasileiro·a.');
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
check('toda entrada completa', A.PROFILE_COUNTRIES.every(c => c.fr && c.frm && c.frn && c.zh && c.zhp && c.pt && c.ptm && c.ptn && c.en && c.names['pt-BR'] && c.names.en && /^[A-Z]{2}$/.test(c.code)));
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
