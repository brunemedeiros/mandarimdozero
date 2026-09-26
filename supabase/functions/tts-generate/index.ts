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
// de TTS específico. NENHUM provedor real está configurado hoje
// (confirmado por grep no repositório inteiro antes desta implementação,
// ver CLAUDE.md "Fase 7f -- auditoria") -- sem a secret
// TTS_PROVIDER_API_KEY, esta function sempre devolve
// {ok:false, error:'provider_not_configured'}, nunca finge sucesso.
// TTS_MOCK_ENABLED (secret separada, só pra teste -- nunca setada em
// produção real) troca generateTTS() por um mock que gera um WAV
// minúsculo/silencioso, permitindo validar o pipeline inteiro (auth,
// rate limit, upload, resposta) sem nenhuma credencial de provedor real.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Espelha EXATAMENTE shared/flashcard-model.js (TTS_PROVIDER_MODEL_ID/
// TTS_CONFIG_VERSION/TTS_TEXT_MAX_LENGTH) -- os 2 lados precisam concordar
// no mesmo hash pro cliente poder calcular "desatualizado" sem round-trip
// (ver CLAUDE.md, Fase 7f). Trocar de provedor real = mudar as 2 constantes
// TTS_PROVIDER_MODEL_ID/TTS_CONFIG_VERSION nos DOIS lugares -- invalida o
// cache de TODO Field TTS já gerado, de propósito (áudio de um provedor
// diferente É um resultado diferente).
const TTS_PROVIDER_MODEL_ID = 'unconfigured';
const TTS_CONFIG_VERSION = 1;
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
    String(TTS_CONFIG_VERSION),
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
  // Nenhum provedor real foi contratado ainda (decisão em aberto #1 da
  // auditoria da Fase 7f, ver CLAUDE.md) -- quando um existir, a chamada
  // HTTP de verdade entra aqui, isolada, sem tocar em mais nada desta
  // function. A presença de TTS_PROVIDER_API_KEY sozinha nunca basta pra
  // "funcionar de verdade" -- esta função continua devolvendo um erro
  // explícito e diagnosticável, nunca inventa sucesso.
  return { ok: false, error: 'provider_not_implemented' };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (payload.table !== 'teacher_flashcards' && payload.table !== 'own_flashcards') {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_table' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!payload.rowId || !payload.fieldId) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_row_or_field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const cleanText = (payload.text || '').trim();
  if (!cleanText) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_text' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (cleanText.length > TTS_TEXT_MAX_LENGTH) {
    return new Response(JSON.stringify({ ok: false, error: 'text_too_long' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!payload.language) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_language' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!row) {
    return new Response(JSON.stringify({ ok: false, error: 'not_authorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const voiceId = payload.voiceId || null;
  const rate = payload.rate === undefined ? null : payload.rate;
  const generationKey = await computeTtsGenerationKey(cleanText, payload.language, voiceId, rate);

  const generated = await generateTTS({ text: cleanText, language: payload.language, voiceId, rate });
  if (!generated.ok) {
    return new Response(JSON.stringify({ ok: false, error: generated.error }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
