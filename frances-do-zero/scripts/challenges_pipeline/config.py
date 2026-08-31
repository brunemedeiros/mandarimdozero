import os

# ---------- Google Cloud / Vertex AI ----------
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "prof-brune")
GCP_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get(
    "GOOGLE_APPLICATION_CREDENTIALS", "/home/user/.gcp/prof-brune-vertex-ai.json"
)

MODEL_PRIMARY = "gemini-2.5-flash-lite"   # barato, usado pra maioria dos candidatos
MODEL_FALLBACK = "gemini-2.5-flash"        # mais caro, só quando a confiança do primeiro é baixa

# Abaixo deste valor de confidence, tenta de novo com MODEL_FALLBACK antes de descartar.
FALLBACK_CONFIDENCE_THRESHOLD = 0.6

# Abaixo deste valor de confidence (mesmo depois do fallback), o candidato não
# vira desafio — fica de fora e conta como "não atingiu os critérios".
MIN_ACCEPTABLE_CONFIDENCE = 0.6

# Tamanho de cada janela analisada por chamada ao Gemini (nunca o vídeo inteiro).
CLIP_WINDOW_SECONDS = 45
# Quantas janelas no máximo por vídeo candidato, pra não deixar o custo escalar
# em vídeos longos — prioriza os primeiros minutos, onde expressões costumam
# aparecer em conteúdo didático/vlogs curtos.
MAX_WINDOWS_PER_VIDEO = 4
# Ignora vídeos candidatos mais longos que isso (segundos) — o pipeline é
# pensado pra clipes curtos (vlogs, trechos didáticos), não filmes/podcasts longos.
MAX_VIDEO_DURATION_SECONDS = 20 * 60

# ---------- YouTube Data API v3 (só descoberta/metadados, nunca transcrição) ----------
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
YOUTUBE_MAX_CANDIDATES_PER_EXPRESSION = 5

# ---------- Cache / custos ----------
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.path.join(_THIS_DIR, ".cache", "analysis_cache.json")
COST_LOG_PATH = os.path.join(_THIS_DIR, ".cache", "cost_log.jsonl")

# Preços aproximados (USD por 1M tokens) só pra estimativa de custo no log —
# NÃO é fonte de cobrança oficial, é so pra visibilidade humana no console.
# Ver preço real em cloud.google.com/vertex-ai/generative-ai/pricing.
APPROX_PRICE_PER_1M_TOKENS = {
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},
}
