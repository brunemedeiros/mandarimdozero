// ---------- TTS Generate (Fase 7f -- implementação, ver CLAUDE.md) ----------
//
// Gera (ou recusa gerar, se nenhum provedor real estiver configurado) um
// áudio TTS pra UM Field de teacher_flashcards/own_flashcards, faz upload
// pro MESMO bucket `flashcard-media` já usado pelo upload manual (Fase 7e,
// migration 046) -- nunca um bucket novo. Devolve só metadado (URL/path/
// generationKey/generatedAt); NUNCA grava `fields` na linha sozinha -- quem
// chama (shared/teacher-flashcards.js/shared/own-flashcards.js) decide
// quando/se aplica o resultado ao Field e chama updateFlashcardContent()
// como qualquer outra edição (mesmo mecanismo de revision/reset de
// progresso já existente, sem nenhum caminho de escrita novo).
//
// Roda no contexto do PRÓPRIO usuário que chama (repassa o cabeçalho
// Authorization, mesmo padrão de push-send) -- NÃO usa service role. A
// checagem de "esta conta pode tocar nesta linha?" é feita pela PRÓPRIA
// RLS de teacher_flashcards/own_flashcards (owner-only nas duas tabelas,
// ver migrations 026/028) ao tentar SELECT a linha -- nunca reimplementada
// aqui. O upload pro Storage também usa este MESMO cliente -- a policy do
// bucket `flashcard-media` (migration 032) já restringe escrita à própria
// pasta ({auth.uid()}/...), então nunca precisa de service role pra nada
// nesta function.
//
// Achado de segurança documentado, não corrigido (mesmo nível de rigor já
// aceito noutros pontos desta feature -- "trava de UI, não fronteira de
// segurança"): em teacher_flashcards, uma ALUNA vinculada tem RLS de
// LEITURA (não escrita) sobre um cartão que a professora atribuiu a ela --
// a checagem de autorização abaixo (SELECT via RLS) portanto deixaria uma
// aluna passar essa checagem pra um cartão que ela só pode LER, mesmo sem
// nunca conseguir gravar o resultado de volta em `fields` (RLS de
// UPDATE/INSERT em teacher_flashcards é admin-only, migration 026). Pior
// caso real: gasto de quota de rate limit + um objeto órfão no Storage sob
// a PRÓPRIA pasta dela (nunca expõe dado de outra conta) -- nunca
// alcançável hoje de qualquer jeito, porque shared/admin-flashcards.js (o
// único chamador desta function pro caso teacher_flashcards) é 100%
// gate-checked por isAdminUser(), e hoje só existe 1 professora/admin real
// na plataforma (ver CLAUDE.md). Registrado aqui pra não parecer
// esquecimento -- não uma exposição de conteúdo de cartão de ninguém.
//
// Rate limiting (ver migration 047) -- no máximo TTS_RATE_LIMIT gerações
// BEM-SUCEDIDAS por conta a cada TTS_RATE_LIMIT_WINDOW_MINUTES minutos.
//
// Provider abstraction (generateTTS) -- isola TODA chamada a um provedor
// de TTS específico. Provedor: Google Cloud TTS (Chirp 3 HD, mesmas vozes
// da trilha), chave na secret TTS_PROVIDER_API_KEY (ver CLAUDE.md, "TTS por
// Field -- provedor Google ativado"). Sem a secret, devolve
// {ok:false, error:'provider_not_configured'}, nunca finge sucesso.
//
// Cota mensal -- além do limite curto, no máximo TTS_MONTHLY_LIMIT (padrão
// 300, env TTS_MONTHLY_LIMIT) gerações bem-sucedidas por conta por mês
// (UTC). A conta admin é isenta. Partes puras em ./tts_core.mjs.
// TTS_MOCK_ENABLED (secret separada, só pra teste -- nunca setada em
// produção real) troca generateTTS() por um mock que gera um WAV
// minúsculo/silencioso, permitindo validar o pipeline inteiro (auth,
// rate limit, upload, resposta) sem nenhuma credencial de provedor real.

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildGoogleSynthesizeBody,
  decideMonthlyQuota,
  decodeBase64ToBytes,
  isTtsAdminEmail,
  mapGoogleTtsError,
  parseMonthlyLimit,
  resolveSpeakingRate,
  resolveTtsVoice,
  startOfCurrentMonthUtcIso,
  toSpokenTextForTts,
} from './tts_core.mjs';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Espelha EXATAMENTE shared/flashcard-model.js (TTS_PROVIDER_MODEL_ID/
// TTS_CONFIG_VERSION/TTS_TEXT_MAX_LENGTH) -- os 2 lados precisam concordar
// no mesmo hash pro cliente poder calcular "desatualizado" sem round-trip
// (ver CLAUDE.md, Fase 7f). Trocar de provedor real = mudar as 2 constantes
// TTS_PROVIDER_MODEL_ID/TTS_CONFIG_VERSION nos DOIS lugares -- invalida o
// cache de TODO Field TTS já gerado, de propósito (áudio de um provedor
// diferente É um resultado diferente).
const TTS_PROVIDER_MODEL_ID = 'google-chirp3-hd';
const TTS_CONFIG_VERSION = 2;
// Versão das regras de "texto falado" POR IDIOMA (tts_core.mjs /
// spoken_text.py). Entra no generationKey junto com TTS_CONFIG_VERSION:
// mudar a regra de um idioma invalida só os áudios daquele idioma.
const TTS_SPOKEN_RULES_VERSION_BY_LANG: Record<string, number> = { fr: 4, pt: 1, zh: 0 };
function ttsConfigVersionFor(language: string | null): string {
  const l = String(language || '').trim().toLowerCase();
  const fam = l.startsWith('fr') ? 'fr' : l.startsWith('pt') ? 'pt' : (l.startsWith('zh') || l.startsWith('cmn')) ? 'zh' : 'x';
  return `${TTS_CONFIG_VERSION}:${fam}${TTS_SPOKEN_RULES_VERSION_BY_LANG[fam] ?? 0}`;
}
const TTS_TEXT_MAX_LENGTH = 500;
const TTS_RATE_LIMIT = 20;
const TTS_RATE_LIMIT_WINDOW_MINUTES = 10;

async function computeTtsGenerationKey(
  effectiveText: string,
  language: string | null,
  voiceId: string | null,
  rate: number | null,
): Promise<string> {
  const parts = [
    effectiveText || '',
    language || '',
    voiceId || '',
    rate === null || rate === undefined ? '' : String(rate),
    TTS_PROVIDER_MODEL_ID,
    ttsConfigVersionFor(language),
  ];
  const input = parts.map((p) => encodeURIComponent(p)).join('\u001F');
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// WAV mono 8kHz de ~200ms de silêncio -- pequeno, válido, tocável por
// qualquer <audio>, usado SÓ pelo mock de teste (TTS_MOCK_ENABLED).
function buildSilentWavBytes(): Uint8Array {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * 0.2);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  // Samples já ficam zerados (silêncio) por padrão -- ArrayBuffer nasce zerado.
  return new Uint8Array(buffer);
}

type TtsGenerateResult =
  | { ok: true; audioBytes: Uint8Array; mimeType: string }
  | { ok: false; error: string };

// ---------- Provider abstraction ----------
// Isola TODA chamada HTTP a um provedor de TTS específico -- troca de
// provedor futura só toca esta função (+ as 2 constantes acima).
async function generateTTS(input: {
  text: string;
  language: string;
  voiceId: string | null;
  rate: number | null;
}): Promise<TtsGenerateResult> {
  // Mock provider -- só ativo com a secret TTS_MOCK_ENABLED='true' setada
  // EXPLICITAMENTE (nunca por acidente) -- ferramenta de TESTE apenas,
  // nunca ativada em produção real.
  if (Deno.env.get('TTS_MOCK_ENABLED') === 'true') {
    return { ok: true, audioBytes: buildSilentWavBytes(), mimeType: 'audio/wav' };
  }
  const apiKey = Deno.env.get('TTS_PROVIDER_API_KEY');
  if (!apiKey) {
    return { ok: false, error: 'provider_not_configured' };
  }
  // Google Cloud Text-to-Speech (REST v1), mesma voz Chirp 3 HD da trilha.
  const voice = resolveTtsVoice(input.language, input.voiceId);
  if (!voice.ok || !voice.languageCode || !voice.name) return { ok: false, error: voice.error || 'provider_error' };
  const body = buildGoogleSynthesizeBody({
    text: toSpokenTextForTts(input.text, voice.languageCode),
    languageCode: voice.languageCode,
    voiceName: voice.name,
    speakingRate: resolveSpeakingRate(voice.baseRate, input.rate),
  });
  let resp: Response;
  try {
    resp = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Só o NOME do erro -- a mensagem de um erro de rede pode repetir a URL,
    // que contém a chave.
    console.error('tts-generate: falha de rede ao chamar o Google TTS', (err as Error)?.name || 'Error');
    return { ok: false, error: 'provider_error' };
  }
  let data: { audioContent?: string; error?: { status?: string; message?: string } } = {};
  try {
    data = await resp.json();
  } catch {
    data = {};
  }
  if (!resp.ok || !data.audioContent) {
    console.error('tts-generate: Google TTS recusou', resp.status, data?.error?.status || '');
    return { ok: false, error: mapGoogleTtsError(resp.status) };
  }
  return { ok: true, audioBytes: decodeBase64ToBytes(data.audioContent), mimeType: 'audio/mpeg' };
}

// CORS: o app chama esta função do navegador (outra origem). Sem responder ao
// preflight OPTIONS e sem os cabeçalhos abaixo, o navegador bloqueia a chamada
// antes de ela chegar aqui e o app só mostra "Não foi possível gerar o áudio agora."
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_authorization' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let payload: {
    table?: string;
    rowId?: number;
    fieldId?: string;
    text?: string;
    language?: string;
    voiceId?: string;
    rate?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  if (payload.table !== 'teacher_flashcards' && payload.table !== 'own_flashcards') {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_table' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  if (!payload.rowId || !payload.fieldId) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_row_or_field' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  const cleanText = (payload.text || '').trim();
  if (!cleanText) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_text' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  if (cleanText.length > TTS_TEXT_MAX_LENGTH) {
    return new Response(JSON.stringify({ ok: false, error: 'text_too_long' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  if (!payload.language) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_language' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Cliente "como o usuário" -- mesmo padrão de push-send/report-reply-send.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_session' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  const userId = userData.user.id;

  // Autorização -- a RLS de teacher_flashcards/own_flashcards decide
  // sozinha se esta conta pode ver esta linha (ver comentário de topo,
  // "achado de segurança"). Nunca distingue "não existe" de "não
  // autorizada" na resposta -- não vaza existência de linha alheia.
  const { data: row, error: rowError } = await supabase
    .from(payload.table)
    .select('id')
    .eq('id', payload.rowId)
    .maybeSingle();
  if (rowError) {
    console.error('tts-generate: falha ao checar autorização', rowError);
    return new Response(JSON.stringify({ ok: false, error: 'authorization_check_failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
  if (!row) {
    return new Response(JSON.stringify({ ok: false, error: 'not_authorized' }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  // Rate limiting (migration 047) -- checado ANTES de gastar qualquer
  // chamada de provedor. RLS de tts_generation_log já escopa a contagem à
  // PRÓPRIA conta -- nenhum filtro extra de user_id necessário na query.
  const windowStart = new Date(Date.now() - TTS_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count: recentCount, error: countError } = await supabase
    .from('tts_generation_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', windowStart);
  if (countError) {
    // Falha ao LER a tabela de controle de custo nunca deveria travar a
    // geração inteira por uma tabela auxiliar -- loga e segue (mesmo
    // espírito de "melhor esforço" já usado noutras compensações desta
    // feature), em vez de fail-closed numa dependência secundária.
    console.error('tts-generate: falha ao checar rate limit (seguindo mesmo assim)', countError);
  } else if ((recentCount ?? 0) >= TTS_RATE_LIMIT) {
    return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), {
      status: 429,
      headers: JSON_HEADERS,
    });
  }

  // Cota mensal -- controle de custo do provedor pago. Diferente do limite
  // curto acima, aqui uma falha ao LER a contagem BLOQUEIA (fail-closed):
  // sem saber o consumo do mês, não se gasta chamada paga.
  const isAdmin = isTtsAdminEmail(userData.user.email);
  if (!isAdmin) {
    const monthlyLimit = parseMonthlyLimit(Deno.env.get('TTS_MONTHLY_LIMIT'));
    const { count: monthCount, error: monthError } = await supabase
      .from('tts_generation_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfCurrentMonthUtcIso(new Date()));
    if (monthError) {
      console.error('tts-generate: falha ao checar cota mensal', monthError);
      return new Response(JSON.stringify({ ok: false, error: 'quota_check_failed' }), {
        status: 503,
        headers: JSON_HEADERS,
      });
    }
    const quota = decideMonthlyQuota({ count: monthCount ?? 0, limit: monthlyLimit, isAdmin });
    if (!quota.allowed) {
      return new Response(JSON.stringify({ ok: false, error: quota.error }), {
        status: 429,
        headers: JSON_HEADERS,
      });
    }
  }

  const voiceId = payload.voiceId || null;
  const rate = payload.rate === undefined ? null : payload.rate;
  const generationKey = await computeTtsGenerationKey(cleanText, payload.language, voiceId, rate);

  const generated = await generateTTS({ text: cleanText, language: payload.language, voiceId, rate });
  if (!generated.ok) {
    const clientSide = generated.error === 'unsupported_language' || generated.error === 'invalid_voice';
    return new Response(JSON.stringify({ ok: false, error: generated.error }), {
      status: clientSide ? 400 : 502,
      headers: JSON_HEADERS,
    });
  }

  const ext = generated.mimeType === 'audio/mpeg' ? 'mp3' : generated.mimeType === 'audio/wav' ? 'wav' : 'bin';
  const safeFieldId = String(payload.fieldId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const path = `${userId}/tts-${safeFieldId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('flashcard-media')
    .upload(path, generated.audioBytes, { contentType: generated.mimeType, cacheControl: '3600' });
  if (uploadError) {
    console.error('tts-generate: falha no upload', uploadError);
    return new Response(JSON.stringify({ ok: false, error: 'upload_failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
  const { data: pub } = supabase.storage.from('flashcard-media').getPublicUrl(path);

  // Registra a geração pro rate limit SÓ depois do upload ter sucesso de
  // verdade (nunca conta tentativa falha como quota gasta) -- best-effort,
  // uma falha aqui não desfaz uma geração que já teve sucesso.
  const { error: logError } = await supabase.from('tts_generation_log').insert({ user_id: userId });
  if (logError) console.warn('tts-generate: falha ao registrar rate limit (best-effort)', logError);

  return new Response(
    JSON.stringify({
      ok: true,
      url: pub.publicUrl,
      path,
      generationKey,
      generatedAt: new Date().toISOString(),
    }),
    { status: 200, headers: JSON_HEADERS },
  );
});
