import os

# ---------- Google Cloud / Vertex AI (geração de texto) ----------
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "prof-brune")
GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS", "/home/user/.gcp/prof-brune-vertex-ai.json"
)

MODEL_PRIMARY = "gemini-2.5-flash-lite"

# ---------- Text-to-Speech (frases de exemplo) ----------
# Chave de API simples (mesma reutilizada pro resto do TTS do site) -- a
# Text-to-Speech API não tem o mesmo requisito de Service Account/ADC que o
# Vertex AI, então mantém a mesma convenção já usada em
# scripts/gen_guided_dictation_audio.py (variável GCP_TTS_KEY).
GCP_TTS_KEY = os.environ.get("GCP_TTS_KEY")
TTS_VOICE = "fr-FR-Chirp3-HD-Achernar"

# ---------- YouTube Data API v3 (só pra "pour aller plus loin", opcional) ----------
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
EXTERNAL_RESOURCES_MAX_RESULTS = 3
EXTERNAL_RESOURCES_KEEP = 1  # quantos links aprovados guardar por desafio

# ---------- Cache / custos ----------
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.path.join(_THIS_DIR, ".cache", "analysis_cache.json")
COST_LOG_PATH = os.path.join(_THIS_DIR, ".cache", "cost_log.jsonl")
AUDIO_OUTPUT_DIR = os.path.join(_THIS_DIR, "..", "..", "audio", "challenges")

# Preços aproximados (USD por 1M tokens) só pra estimativa de custo no log —
# NÃO é fonte de cobrança oficial, é so pra visibilidade humana no console.
APPROX_PRICE_PER_1M_TOKENS = {
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
}
