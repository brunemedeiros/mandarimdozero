import json

import google.auth
import google.auth.transport.requests
import requests

from . import cache, config, cost_log
from .transcription_provider import ClipAnalysis, TranscriptionProvider

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "expressionFound": {"type": "BOOLEAN"},
        "canonicalExpression": {"type": "STRING"},
        "spokenOccurrence": {"type": "STRING", "nullable": True},
        "timestampStart": {"type": "NUMBER", "nullable": True},
        "timestampEnd": {"type": "NUMBER", "nullable": True},
        "transcript": {"type": "STRING", "nullable": True},
        "confidence": {"type": "NUMBER"},
        "audioClarity": {"type": "STRING", "enum": ["high", "medium", "low"]},
        "contextQuality": {"type": "STRING", "enum": ["high", "medium", "low"]},
        "notes": {"type": "STRING", "nullable": True},
    },
    "required": [
        "expressionFound", "canonicalExpression", "confidence",
        "audioClarity", "contextQuality",
    ],
}

PROMPT_TEMPLATE = (
    "Você está analisando um trecho de vídeo do YouTube para um app de ensino "
    "de francês como língua estrangeira. Verifique se a expressão idiomática "
    "canônica \"{expression}\" é efetivamente pronunciada em francês neste "
    "trecho, em qualquer forma flexionada ou conjugada (registre a forma "
    "exata ouvida em spokenOccurrence, mesmo que diferente da forma "
    "canônica). Dê o timestamp (em segundos, relativo ao início do vídeo "
    "inteiro, não do trecho) do início e fim da fala onde a expressão "
    "ocorre. Avalie audioClarity (clareza do áudio: fala natural e "
    "compreensível vs. ruído/música alta/sobreposição de vozes) e "
    "contextQuality (o contexto ao redor ajuda um estudante a inferir o "
    "significado da expressão, mesmo sem saber ela de antemão). Em "
    "transcript, transcreva literalmente (em francês) só a frase ou trecho "
    "curto onde a expressão ocorre — não o trecho inteiro analisado. Em "
    "notes, se quiser, deixe uma observação curta para quem for revisar "
    "(ex: qualidade do áudio, sotaque, algo a conferir de ouvido) — nunca "
    "repita ali o mesmo texto de transcript. "
    "IMPORTANTE: nunca invente uma ocorrência, timestamp, transcrição ou "
    "contexto que não estejam realmente presentes no áudio/vídeo. Se a "
    "expressão não for dita neste trecho, ou não houver fala em francês "
    "compreensível, defina expressionFound como false, confidence baixo "
    "(perto de 0), e deixe spokenOccurrence/timestampStart/timestampEnd/"
    "transcript como null."
)


class GeminiVertexAIProvider(TranscriptionProvider):
    def __init__(self, model=None):
        self.model = model or config.MODEL_PRIMARY
        self._creds = None

    def _access_token(self):
        if self._creds is None:
            self._creds, _ = google.auth.load_credentials_from_file(
                config.GOOGLE_APPLICATION_CREDENTIALS,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
        if not self._creds.valid:
            self._creds.refresh(google.auth.transport.requests.Request())
        return self._creds.token

    def _call_model(self, model, video_id, start_seconds, end_seconds, canonical_expression):
        url = (
            f"https://{config.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/"
            f"{config.GCP_PROJECT_ID}/locations/{config.GCP_LOCATION}/publishers/google/"
            f"models/{model}:generateContent"
        )
        body = {
            "contents": [{
                "role": "user",
                "parts": [
                    {
                        "fileData": {
                            "fileUri": f"https://www.youtube.com/watch?v={video_id}",
                            "mimeType": "video/mp4",
                        },
                        "videoMetadata": {
                            "startOffset": f"{int(start_seconds)}s",
                            "endOffset": f"{int(end_seconds)}s",
                        },
                    },
                    {"text": PROMPT_TEMPLATE.format(expression=canonical_expression)},
                ],
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": RESPONSE_SCHEMA,
                "temperature": 0.0,
            },
        }
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {self._access_token()}", "Content-Type": "application/json"},
            json=body,
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini não retornou candidatos: {data}")
        text = candidates[0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        return parsed, data.get("usageMetadata") or {}

    def analyze_clip(self, video_id, start_seconds, end_seconds, canonical_expression):
        cache_key = cache.make_key(video_id, canonical_expression, start_seconds, end_seconds, self.model)
        cached = cache.get(cache_key)
        if cached is not None:
            cost_log.log_call(self.model, video_id, canonical_expression, usage=None, cache_hit=True)
            return _to_clip_analysis(cached, self.model)

        parsed, usage = self._call_model(self.model, video_id, start_seconds, end_seconds, canonical_expression)
        cost_log.log_call(self.model, video_id, canonical_expression, usage, cache_hit=False)

        # Confiança baixa no modelo barato -> tenta uma vez com o modelo mais
        # capaz antes de descartar o candidato (nunca pula direto pro caro).
        used_model = self.model
        if parsed.get("confidence", 0) < config.FALLBACK_CONFIDENCE_THRESHOLD and self.model == config.MODEL_PRIMARY:
            fb_key = cache.make_key(video_id, canonical_expression, start_seconds, end_seconds, config.MODEL_FALLBACK)
            fb_cached = cache.get(fb_key)
            if fb_cached is not None:
                cost_log.log_call(config.MODEL_FALLBACK, video_id, canonical_expression, usage=None, cache_hit=True)
                parsed, used_model = fb_cached, config.MODEL_FALLBACK
            else:
                fb_parsed, fb_usage = self._call_model(
                    config.MODEL_FALLBACK, video_id, start_seconds, end_seconds, canonical_expression
                )
                cost_log.log_call(config.MODEL_FALLBACK, video_id, canonical_expression, fb_usage, cache_hit=False)
                cache.set(fb_key, fb_parsed)
                parsed, used_model = fb_parsed, config.MODEL_FALLBACK

        cache.set(cache_key, parsed)
        return _to_clip_analysis(parsed, used_model)


def _to_clip_analysis(parsed, model_used):
    return ClipAnalysis(
        expression_found=bool(parsed.get("expressionFound")),
        canonical_expression=parsed.get("canonicalExpression", ""),
        spoken_occurrence=parsed.get("spokenOccurrence"),
        timestamp_start=parsed.get("timestampStart"),
        timestamp_end=parsed.get("timestampEnd"),
        transcript=parsed.get("transcript"),
        confidence=float(parsed.get("confidence") or 0),
        audio_clarity=parsed.get("audioClarity"),
        context_quality=parsed.get("contextQuality"),
        notes=parsed.get("notes"),
        model_used=model_used,
    )
