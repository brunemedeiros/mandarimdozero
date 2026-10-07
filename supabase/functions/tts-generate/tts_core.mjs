// ---------- tts-generate: núcleo PURO (sem Deno, sem rede) ----------
//
// Peças puras da Edge Function tts-generate, isoladas aqui pra poderem ser
// testadas em Node (tests/tts-google/) sem runtime Deno: escolha de voz,
// velocidade, normalização de "texto falado", decisão de cota mensal,
// montagem do corpo da requisição do Google Cloud TTS e mapeamento de erro.
// Nenhuma função aqui faz I/O nem lê variável de ambiente -- quem chama
// (index.ts) passa tudo como parâmetro.

// Mesmas vozes do pipeline offline da trilha (fr/scripts/challenges_pipeline/
// tts.py): Chirp 3 HD, voz Achernar. `languageCode` é o que o Google espera
// (mandarim = cmn-CN, não zh-CN).
export const TTS_VOICES = {
  'fr-FR': { languageCode: 'fr-FR', name: 'fr-FR-Chirp3-HD-Achernar', baseRate: 0.9 },
  'cmn-CN': { languageCode: 'cmn-CN', name: 'cmn-CN-Chirp3-HD-Achernar', baseRate: 0.85 },
  'pt-BR': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Achernar', baseRate: 1.0 },
};

// Locale de síntese (audio.language, escolhido no editor) -> chave de TTS_VOICES.
const LANGUAGE_ALIASES = {
  'fr-fr': 'fr-FR', fr: 'fr-FR',
  'zh-cn': 'cmn-CN', 'cmn-cn': 'cmn-CN', zh: 'cmn-CN', cmn: 'cmn-CN',
  'pt-br': 'pt-BR', pt: 'pt-BR',
};

export function normalizeTtsLanguage(language) {
  if (!language || typeof language !== 'string') return null;
  return LANGUAGE_ALIASES[language.trim().toLowerCase()] || null;
}

// Formato de nome de voz do Google: "<lang>-<REGIÃO>-<resto>" (ex.
// fr-FR-Chirp3-HD-Achernar). Só aceita voz do MESMO idioma da síntese --
// uma voz de outro idioma pediria um languageCode diferente do escolhido.
const VOICE_NAME_RE = /^([a-z]{2,3}-[A-Z]{2})-[A-Za-z0-9-]{1,60}$/;

// Devolve {ok:true, languageCode, name, baseRate} ou {ok:false, error}.
export function resolveTtsVoice(language, voiceId) {
  const key = normalizeTtsLanguage(language);
  if (!key) return { ok: false, error: 'unsupported_language' };
  const def = TTS_VOICES[key];
  const wanted = typeof voiceId === 'string' ? voiceId.trim() : '';
  if (!wanted) return { ok: true, languageCode: def.languageCode, name: def.name, baseRate: def.baseRate };
  const m = VOICE_NAME_RE.exec(wanted);
  if (!m || m[1] !== def.languageCode) return { ok: false, error: 'invalid_voice' };
  return { ok: true, languageCode: def.languageCode, name: wanted, baseRate: def.baseRate };
}

// A velocidade do editor (Lento 0.8 / Normal 1 / Rápido 1.2) é RELATIVA à
// velocidade base do idioma (fr 0.9, zh 0.85, pt 1.0 -- as mesmas da trilha).
// null/inválido = 1 (só a base). Resultado limitado ao intervalo do Google.
export function resolveSpeakingRate(baseRate, rate) {
  const mult = (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) ? rate : 1;
  const value = Math.round(baseRate * mult * 100) / 100;
  return Math.min(2, Math.max(0.25, value));
}

// Porte da camada de "texto falado" (fr/scripts/challenges_pipeline/
// spoken_text.py): mesmas regras, mesma ordem e mesmo resultado (teste de
// paridade em tests/tts-google/test_tts_core.mjs roda TODAS as entradas do
// manifest fr + os casos de pt nos dois lados). Só muda o texto ENVIADO ao
// provedor; texto exibido e generationKey usam o original. Mudar uma regra
// de um idioma = subir a versão daquele idioma em
// TTS_SPOKEN_RULES_VERSION_BY_LANG (index.ts e shared/flashcard-model.js):
// invalida só os áudios desse idioma.
// Letra = \p{L} (flag u), igual ao [^\W\d_] do Python (com acentos).
const L = '\\p{L}';

// Correção pontual por texto exato (vence as regras), igual ao Python.
const SPOKEN_OVERRIDES = {
  fr: { 'une bouteille (de)': 'une bouteille (de)' },
  zh: {},
  pt: {},
};

const FR_RULES = [
  (t) => t.replace(/\s*\(([^()]*)\)/g, ' $1…'),                         // fr.parenthetical-particle
  (t) => t.replace(/\s+\/\s+/g, ', '),                                   // fr.slash-alternatives
  (t) => t.replace(/œuf/g, 'oeuf'),                                      // fr.oe-ligature-elision
  (t) => t.replace(/(?<![\p{L}\p{N}_])([lL])(['\u2019])âge/gu, '$1$2age'), // fr.age-elision
];

const PT_TITLES = {
  Sr: 'Senhor', Sra: 'Senhora', Srta: 'Senhorita', Srs: 'Senhores', Sras: 'Senhoras',
  Dr: 'Doutor', Dra: 'Doutora', Drs: 'Doutores', Dras: 'Doutoras',
  Prof: 'Professor', Profa: 'Professora',
};
const PT_TITLES_FEM = { Sr: 'Senhora', Dr: 'Doutora', Prof: 'Professora' };
const PT_TITLE_AFTER = '(?=\\s|[,;:!?)]|$)';

function ptTitles(text) {
  const endDot = (m, offset, str, word) => word + ((offset + m.length === str.length && m.endsWith('.')) ? '.' : '');
  text = text.replace(new RegExp(`(?<!${L})Sr\\.?\\(a\\)\\.?`, 'gu'), (m, off, str) => endDot(m, off, str, 'Senhor ou Senhora'));
  text = text.replace(new RegExp(`(?<!${L})(Sr|Dr|Prof)\\.?ª${PT_TITLE_AFTER}`, 'gu'), (m, g1) => PT_TITLES_FEM[g1]);
  text = text.replace(new RegExp(`(?<!${L})(Srta|Sras|Srs|Sra|Sr|Dras|Drs|Dra|Dr|Profa|Prof)\\.${PT_TITLE_AFTER}`, 'gu'),
    (m, g1, off, str) => endDot(m, off, str, PT_TITLES[g1]));
  text = text.replace(new RegExp(`(?<!${L})(Sra|Sr|Dra|Dr)(?= [A-ZÀ-ÖØ-Þ])`, 'gu'), (m, g1) => PT_TITLES[g1]);
  return text;
}

const PT_VOWELS = 'aeiouáéíóúâêôãõ';
function ptGenderVariant(word, suf) {
  if (suf === 'a') {
    if (word.endsWith('o')) return [word, word.slice(0, -1) + 'a'];
    if (word.endsWith('O')) return [word, word.slice(0, -1) + 'A'];
    if (word.endsWith('or')) return [word, word + 'a'];
    return null;
  }
  if (suf === 'as') return word.endsWith('os') ? [word, word.slice(0, -2) + 'as'] : null;
  if (suf === 's') return PT_VOWELS.includes(word.slice(-1).toLowerCase()) && word.length ? [word, word + 's'] : null;
  if (suf === 'es') return 'rz'.includes(word.slice(-1).toLowerCase()) && word.length ? [word, word + 'es'] : null;
  return null;
}

// "obrigado(a)" -> "obrigado, obrigada"; vários marcadores repetem o trecho
// inteiro: "o(a) aluno(a)" -> "o aluno, a aluna". Igual ao _pt_gender do Python.
function ptGender(text) {
  const re = new RegExp(`(?<!${L})(${L}(?:${L}|-)*)\\((as|es|a|s)\\)`, 'gu');
  const valid = [];
  for (const m of text.matchAll(re)) {
    const v = ptGenderVariant(m[1], m[2]);
    if (v) valid.push([m.index, m.index + m[0].length, v]);
  }
  if (!valid.length) return text;
  const start = valid[0][0], end = valid[valid.length - 1][1];
  const build = (idx) => {
    let out = '', pos = start;
    for (const [s0, e0, v] of valid) { out += text.slice(pos, s0) + v[idx]; pos = e0; }
    return out + text.slice(pos, end);
  };
  return text.slice(0, start) + build(0) + ', ' + build(1) + text.slice(end);
}

const PT_UNITS = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono'];
const PT_TENS = ['', 'décimo', 'vigésimo', 'trigésimo', 'quadragésimo', 'quinquagésimo',
  'sexagésimo', 'septuagésimo', 'octogésimo', 'nonagésimo'];
function ptOrdinalWord(n, fem) {
  if (n < 1 || n > 100) return null;
  let words = n === 100 ? ['centésimo']
    : [...(n >= 10 ? [PT_TENS[Math.floor(n / 10)]] : []), ...(n % 10 ? [PT_UNITS[n % 10]] : [])];
  if (fem) words = words.map(w => w.slice(0, -1) + 'a');
  return words.join(' ');
}
function ptOrdinals(text) {
  return text.replace(new RegExp(`(?<!\\d)(?<!${L})(\\d{1,3})\\.?([ºª])(?!\\d)(?!${L})`, 'gu'),
    (m, num, ind) => ptOrdinalWord(parseInt(num, 10), ind === 'ª') || m);
}

const PT_RULES = [
  ptTitles,                                                                  // pt.title-abbreviations
  (t) => t.replace(new RegExp(`(?<!${L})([Nn])\\.?º\\s*(?=\\d)`, 'gu'),         // pt.number-abbreviation
    (m, n) => (n === 'N' ? 'Número ' : 'número ')),
  ptGender,                                                                  // pt.gender-parenthetical
  (t) => t.replace(/\s+\((de|em|a|com|por|para|do|da|no|na)\)/g, ' $1…'),     // pt.parenthetical-particle
  (t) => t.replace(/\s+\/\s+/g, ', '),                                       // pt.slash-alternatives
  ptOrdinals,                                                                // pt.ordinal-indicators
  (t) => t.replace(/[\u2022\u2190-\u21FF\u2600-\u27BF\uFE0F\u200D\u{1F000}-\u{1FAFF}]|(?<!\S)\*+(?!\S)/gu, ' '), // pt.strip-symbols
];

const RULES_BY_LANG = { fr: FR_RULES, zh: [], pt: PT_RULES };

// languageCode do Google (fr-FR / cmn-CN / pt-BR) -> chave do Python (fr / zh / pt).
export function spokenLangKey(languageCode) {
  const l = String(languageCode || '').trim().toLowerCase();
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('pt')) return 'pt';
  if (l.startsWith('zh') || l.startsWith('cmn')) return 'zh';
  return null;
}

export function toSpokenTextForTts(text, languageCode) {
  const t = String(text || '');
  const lang = spokenLangKey(languageCode);
  if (!lang) return t;
  const ov = SPOKEN_OVERRIDES[lang] || {};
  if (Object.prototype.hasOwnProperty.call(ov, t)) return ov[t];
  let out = t;
  for (const rule of RULES_BY_LANG[lang] || []) out = rule(out);
  return out.replace(/\s{2,}/g, ' ').trim();
}

export function buildGoogleSynthesizeBody({ text, languageCode, voiceName, speakingRate }) {
  return {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate },
  };
}

// Erro do Google -> código nosso. Nunca devolve a mensagem crua (pode
// conter detalhes da conta); só um código estável pro cliente.
export function mapGoogleTtsError(status) {
  if (status === 429) return 'provider_rate_limited';
  return 'provider_error';
}

export function decodeBase64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Cota mensal por conta ----------
export const TTS_MONTHLY_LIMIT_DEFAULT = 300;
export const TTS_ADMIN_EMAIL = 'brunemed1310@gmail.com';

// Valor da env TTS_MONTHLY_LIMIT: inteiro >= 0; qualquer outra coisa usa o padrão.
export function parseMonthlyLimit(envValue) {
  if (envValue === undefined || envValue === null || String(envValue).trim() === '') return TTS_MONTHLY_LIMIT_DEFAULT;
  const n = Number(envValue);
  return Number.isInteger(n) && n >= 0 ? n : TTS_MONTHLY_LIMIT_DEFAULT;
}

// Início do mês corrente em UTC (ISO), usado como limite inferior da contagem.
export function startOfCurrentMonthUtcIso(now) {
  const d = now instanceof Date ? now : new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function isTtsAdminEmail(email) {
  return typeof email === 'string' && email.trim().toLowerCase() === TTS_ADMIN_EMAIL;
}

// count = gerações bem-sucedidas da conta desde o início do mês.
export function decideMonthlyQuota({ count, limit, isAdmin }) {
  if (isAdmin) return { allowed: true };
  return (count ?? 0) >= limit ? { allowed: false, error: 'monthly_quota_exceeded' } : { allowed: true };
}
