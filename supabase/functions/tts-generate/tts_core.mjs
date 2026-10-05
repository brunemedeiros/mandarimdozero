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

// Porte MÍNIMO da camada de "texto falado" (fr/scripts/challenges_pipeline/
// spoken_text.py). Só 2 regras do francês, mesmas regex e mesma ordem:
//  - fr.parenthetical-particle: "un kilo (de)" -> "un kilo de…" (lê o "de",
//    sem o parêntese e sem a pausa grande);
//  - fr.slash-alternatives: "un / une" -> "un, une" (lê as duas formas).
// Só muda o texto ENVIADO ao provedor; o texto exibido e o generationKey
// continuam usando o texto original. Mudar estas regras = subir
// TTS_CONFIG_VERSION (index.ts e shared/flashcard-model.js) pra invalidar
// os áudios já gerados.
export function toSpokenTextForTts(text, languageCode) {
  const t = String(text || '');
  if (languageCode !== 'fr-FR') return t;
  return t
    .replace(/\s*\(([^()]*)\)/g, ' $1…')
    .replace(/\s+\/\s+/g, ', ');
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
