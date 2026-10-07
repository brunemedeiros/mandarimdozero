// Placeholders de perfil no conteúdo da trilha (decisão da dona do projeto,
// 2026-10-06). O conteúdo (fr/content.js, zh/content.js) pode ter, nos
// exemplos em que o falante é o próprio aluno, os marcadores:
//   {nome}             nome completo do perfil (display_name)
//   {primeiro_nome}    primeira palavra do nome
//   {nacionalidade}    nacionalidade no IDIOMA ESTUDADO (fr: "brésilienne",
//                      zh: "巴西人"), a partir de profiles.country
//   {nacionalidade_p}  pinyin da nacionalidade (só zh: "Bāxī rén")
//   {nacionalidade_t}  nacionalidade na língua da TRADUÇÃO (idioma do site:
//                      pt-BR "brasileira", en "Brazilian")
//
// Regras:
//  - Convidado (sem conta): nome = "Convidado" (idioma do site: "Guest"); um
//    nome vazio deixaria "Je m'appelle ." estranho. Conta sem display_name
//    cai no mesmo valor (nunca usa e-mail na lição).
//  - Sem país preenchido: Brasil.
//  - Gênero (decisão 2026-10-06): campo opcional do perfil, guardado em
//    profile_private (tabela privada, NUNCA em profiles, que é legível
//    publicamente). Masculino -> forma masculina; Feminino -> feminina; Outro,
//    Prefiro não dizer, não preenchido e convidado -> forma neutra com duas
//    terminações no texto exibido (fr "brésilien·ne", pt "brasileiro·a"; en
//    "Brazilian" não tem gênero; zh não tem gênero). O áudio lê as duas formas
//    ("brésilien, brésilienne"): ver speakableProfileText.
//  - O nome é digitado pelo usuário e entra em innerHTML em vários pontos da
//    UI: aqui removemos < e > e caracteres de controle (nenhuma tag
//    sobrevive). & e aspas ficam (o conteúdo já os usa).
//  - Áudio: textos com placeholder resolvido raramente batem uma chave de
//    AUDIO_MANIFEST (chave = texto literal); speakFrench/speakChinese já caem
//    no Web Speech com o texto preenchido. Com nome "Brune"/país Brasil o
//    texto volta a ser idêntico ao do manifest.
//
// applyProfilePlaceholders() reescreve as strings DENTRO de UNITS (os mesmos
// objetos, como shared/content-i18n.js faz). Guarda o modelo ({...}) de cada
// string num registro próprio; se content-i18n reaplicar um idioma (que
// devolve o texto com placeholder), o novo texto vira o modelo.

var PROFILE_PLACEHOLDER_RE = /\{(nome|primeiro_nome|nacionalidade|nacionalidade_p|nacionalidade_t)\}/g;
var PROFILE_DEFAULT_COUNTRY = 'BR';

// code: ISO 3166-1 alfa-2. names: nome do país no seletor.
// Nacionalidade por idioma e gênero (decisão 2026-10-06, 4ª rodada):
//   fr (feminina) / frm (masculina) / frn (neutra, duas terminações) -- idioma estudado
//   pt (feminina) / ptm (masculina) / ptn (neutra)                    -- tradução em pt-BR
//   en (sem gênero)                                                   -- tradução em en
//   zh / zhp: hanzi / pinyin (chinês não tem gênero)
// A forma neutra é a que o texto exibido mostra para gênero Outro/Prefiro não
// dizer/não preenchido/convidado; o áudio lê as duas formas (ver
// speakableProfileText). Invariáveis (britannique, canadense) repetem a forma.
var PROFILE_COUNTRIES = [
  { code: 'BR', names: { 'pt-BR': 'Brasil', en: 'Brazil' }, fr: 'brésilienne', frm: 'brésilien', frn: 'brésilien·ne', zh: '巴西人', zhp: 'Bāxī rén', pt: 'brasileira', ptm: 'brasileiro', ptn: 'brasileiro·a', en: 'Brazilian' },
  { code: 'US', names: { 'pt-BR': 'Estados Unidos', en: 'United States' }, fr: 'américaine', frm: 'américain', frn: 'américain·e', zh: '美国人', zhp: 'Měiguó rén', pt: 'americana', ptm: 'americano', ptn: 'americano·a', en: 'American' },
  { code: 'PT', names: { 'pt-BR': 'Portugal', en: 'Portugal' }, fr: 'portugaise', frm: 'portugais', frn: 'portugais·e', zh: '葡萄牙人', zhp: 'Pútáoyá rén', pt: 'portuguesa', ptm: 'português', ptn: 'português·a', en: 'Portuguese' },
  { code: 'AO', names: { 'pt-BR': 'Angola', en: 'Angola' }, fr: 'angolaise', frm: 'angolais', frn: 'angolais·e', zh: '安哥拉人', zhp: 'Āngēlā rén', pt: 'angolana', ptm: 'angolano', ptn: 'angolano·a', en: 'Angolan' },
  { code: 'AR', names: { 'pt-BR': 'Argentina', en: 'Argentina' }, fr: 'argentine', frm: 'argentin', frn: 'argentin·e', zh: '阿根廷人', zhp: 'Āgēntíng rén', pt: 'argentina', ptm: 'argentino', ptn: 'argentino·a', en: 'Argentine' },
  { code: 'MX', names: { 'pt-BR': 'México', en: 'Mexico' }, fr: 'mexicaine', frm: 'mexicain', frn: 'mexicain·e', zh: '墨西哥人', zhp: 'Mòxīgē rén', pt: 'mexicana', ptm: 'mexicano', ptn: 'mexicano·a', en: 'Mexican' },
  { code: 'CA', names: { 'pt-BR': 'Canadá', en: 'Canada' }, fr: 'canadienne', frm: 'canadien', frn: 'canadien·ne', zh: '加拿大人', zhp: 'Jiānádà rén', pt: 'canadense', ptm: 'canadense', ptn: 'canadense', en: 'Canadian' },
  { code: 'GB', names: { 'pt-BR': 'Reino Unido', en: 'United Kingdom' }, fr: 'britannique', frm: 'britannique', frn: 'britannique', zh: '英国人', zhp: 'Yīngguó rén', pt: 'britânica', ptm: 'britânico', ptn: 'britânico·a', en: 'British' },
  { code: 'FR', names: { 'pt-BR': 'França', en: 'France' }, fr: 'française', frm: 'français', frn: 'français·e', zh: '法国人', zhp: 'Fǎguó rén', pt: 'francesa', ptm: 'francês', ptn: 'francês·a', en: 'French' },
  { code: 'ES', names: { 'pt-BR': 'Espanha', en: 'Spain' }, fr: 'espagnole', frm: 'espagnol', frn: 'espagnol·e', zh: '西班牙人', zhp: 'Xībānyá rén', pt: 'espanhola', ptm: 'espanhol', ptn: 'espanhol·a', en: 'Spanish' },
  { code: 'IT', names: { 'pt-BR': 'Itália', en: 'Italy' }, fr: 'italienne', frm: 'italien', frn: 'italien·ne', zh: '意大利人', zhp: 'Yìdàlì rén', pt: 'italiana', ptm: 'italiano', ptn: 'italiano·a', en: 'Italian' },
  { code: 'DE', names: { 'pt-BR': 'Alemanha', en: 'Germany' }, fr: 'allemande', frm: 'allemand', frn: 'allemand·e', zh: '德国人', zhp: 'Déguó rén', pt: 'alemã', ptm: 'alemão', ptn: 'alemão·ã', en: 'German' },
  { code: 'JP', names: { 'pt-BR': 'Japão', en: 'Japan' }, fr: 'japonaise', frm: 'japonais', frn: 'japonais·e', zh: '日本人', zhp: 'Rìběn rén', pt: 'japonesa', ptm: 'japonês', ptn: 'japonês·a', en: 'Japanese' },
  { code: 'CN', names: { 'pt-BR': 'China', en: 'China' }, fr: 'chinoise', frm: 'chinois', frn: 'chinois·e', zh: '中国人', zhp: 'Zhōngguó rén', pt: 'chinesa', ptm: 'chinês', ptn: 'chinês·a', en: 'Chinese' }
];

var PROFILE_GENDERS = ['masculine', 'feminine', 'other', 'undisclosed'];

function normalizeProfileGender(g){
  return PROFILE_GENDERS.indexOf(g) !== -1 ? g : null;
}

// Forma da nacionalidade conforme o gênero. Só masculino/feminino escolhem uma
// forma; Outro, Prefiro não dizer, vazio e convidado usam a neutra.
function pickNationalityForm(country, lang, gender){
  var k = lang === 'fr' ? 'fr' : 'pt';
  if (gender === 'masculine') return country[k + 'm'];
  if (gender === 'feminine') return country[k];
  return country[k + 'n'];
}

// Texto para a VOZ: cada forma neutra ("brésilien·ne") vira as duas formas
// lidas em sequência ("brésilien, brésilienne"). Só afeta o que é falado; o
// texto exibido e as chaves de AUDIO_MANIFEST continuam com o "·".
var PROFILE_NEUTRAL_SPOKEN = null;
function profileNeutralSpokenMap(){
  if (PROFILE_NEUTRAL_SPOKEN) return PROFILE_NEUTRAL_SPOKEN;
  var map = {};
  for (var i = 0; i < PROFILE_COUNTRIES.length; i++){
    var c = PROFILE_COUNTRIES[i];
    if (c.frn.indexOf('\u00B7') !== -1) map[c.frn] = c.frm + ', ' + c.fr;
    if (c.ptn.indexOf('\u00B7') !== -1) map[c.ptn] = c.ptm + ', ' + c.pt;
  }
  PROFILE_NEUTRAL_SPOKEN = map;
  return map;
}
function speakableProfileText(text){
  if (typeof text !== 'string' || text.indexOf('\u00B7') === -1) return text;
  var map = profileNeutralSpokenMap();
  var keys = Object.keys(map).sort(function(a, b){ return b.length - a.length; });
  var out = text;
  for (var i = 0; i < keys.length; i++){
    out = out.split(keys[i]).join(map[keys[i]]);
  }
  return out;
}

function profileCountryByCode(code){
  var c = String(code || '').toUpperCase();
  for (var i = 0; i < PROFILE_COUNTRIES.length; i++){
    if (PROFILE_COUNTRIES[i].code === c) return PROFILE_COUNTRIES[i];
  }
  return null;
}

function profileCountryName(code, uiLang){
  var c = profileCountryByCode(code);
  if (!c) return '';
  return c.names[uiLang] || c.names['pt-BR'];
}

// Remove tags e caracteres de controle; espaços colapsados; máx. 60.
function sanitizeProfileName(raw){
  return String(raw == null ? '' : raw)
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// opts: { profile, studyLang:'fr'|'zh', uiLang:'pt-BR'|'en'|'es', guest? }
function buildProfilePlaceholderContext(opts){
  opts = opts || {};
  var profile = opts.profile || null;
  var uiLang = opts.uiLang === 'en' ? 'en' : 'pt-BR';
  var guestName = uiLang === 'en' ? 'Guest' : 'Convidado';
  var name = opts.guest ? '' : sanitizeProfileName(profile && profile.display_name);
  if (!name) name = guestName;
  var first = name.split(' ')[0] || name;
  var country = profileCountryByCode(profile && profile.country) || profileCountryByCode(PROFILE_DEFAULT_COUNTRY);
  var studyLang = opts.studyLang === 'zh' ? 'zh' : 'fr';
  // Gênero vem de profile_private (nunca de profiles); convidado = sem gênero.
  var gender = opts.guest ? null : normalizeProfileGender(opts.gender);
  return {
    nome: name,
    primeiro_nome: first,
    nacionalidade: studyLang === 'zh' ? country.zh : pickNationalityForm(country, 'fr', gender),
    nacionalidade_p: country.zhp,
    nacionalidade_t: uiLang === 'en' ? country.en : pickNationalityForm(country, 'pt', gender)
  };
}

function resolveProfilePlaceholders(text, ctx){
  if (typeof text !== 'string' || text.indexOf('{') === -1) return text;
  return text.replace(PROFILE_PLACEHOLDER_RE, function(_m, key){
    return Object.prototype.hasOwnProperty.call(ctx, key) ? ctx[key] : _m;
  });
}

function hasProfilePlaceholder(text){
  PROFILE_PLACEHOLDER_RE.lastIndex = 0;
  var r = typeof text === 'string' && PROFILE_PLACEHOLDER_RE.test(text);
  PROFILE_PLACEHOLDER_RE.lastIndex = 0;
  return r;
}

// Registro: objeto -> { chave: { tpl, out } }
var PROFILE_PLACEHOLDER_REGISTRY = new WeakMap();

function walkProfilePlaceholders(node, ctx, depth){
  if (!node || typeof node !== 'object' || depth > 12) return;
  var keys = Array.isArray(node) ? node.map(function(_v, i){ return i; }) : Object.keys(node);
  var reg = PROFILE_PLACEHOLDER_REGISTRY.get(node);
  for (var i = 0; i < keys.length; i++){
    var k = keys[i], v = node[k];
    if (typeof v === 'string'){
      var entry = reg && reg[k];
      var tpl = null;
      if (entry && v === entry.out) tpl = entry.tpl;          // ainda é o que escrevemos
      else if (hasProfilePlaceholder(v)) tpl = v;              // texto novo com placeholder
      if (tpl === null) { if (entry) delete reg[k]; continue; }
      var out = resolveProfilePlaceholders(tpl, ctx);
      if (!reg){ reg = {}; PROFILE_PLACEHOLDER_REGISTRY.set(node, reg); }
      reg[k] = { tpl: tpl, out: out };
      node[k] = out;
    } else if (v && typeof v === 'object'){
      walkProfilePlaceholders(v, ctx, depth + 1);
    }
  }
}

// Reaplica sobre UNITS (global do idioma). Seguro de chamar várias vezes.
function applyProfilePlaceholders(opts){
  if (typeof UNITS === 'undefined') return null;
  opts = opts || {};
  var appKey = typeof APP_KEY !== 'undefined' ? APP_KEY : '';
  var profile = opts.profile !== undefined ? opts.profile : (typeof PROFILE_CACHE !== 'undefined' ? PROFILE_CACHE : null);
  var user = typeof CURRENT_USER !== 'undefined' ? CURRENT_USER : null;
  var ctx = buildProfilePlaceholderContext({
    profile: profile,
    studyLang: opts.studyLang || (appKey === 'mandarim' ? 'zh' : 'fr'),
    uiLang: opts.uiLang || (typeof getUiLang === 'function' ? getUiLang() : 'pt-BR'),
    guest: opts.guest !== undefined ? opts.guest : !user,
    gender: opts.gender !== undefined ? opts.gender : (typeof PROFILE_PRIVATE_CACHE !== 'undefined' && PROFILE_PRIVATE_CACHE ? PROFILE_PRIVATE_CACHE.gender : null)
  });
  walkProfilePlaceholders(UNITS, ctx, 0);
  return ctx;
}
