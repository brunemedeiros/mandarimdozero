"""Cliente compartilhado pra chamadas de texto ao Gemini via Vertex AI
(Service Account + Application Default Credentials — nunca a API key
simples do AI Studio). Usado por content_generator.py e external_resources.py."""

import json

import google.auth
import google.auth.transport.requests
import requests

from . import config, cost_log

_creds = None


def _access_token():
    global _creds
    if _creds is None:
        _creds, _ = google.auth.load_credentials_from_file(
            config.GOOGLE_APPLICATION_CREDENTIALS,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    if not _creds.valid:
        _creds.refresh(google.auth.transport.requests.Request())
    return _creds.token


def generate_json(prompt, schema, log_label, log_detail="", temperature=0.4, model=None):
    """Chama o Gemini pedindo saída JSON estruturada no schema dado. Devolve
    o dict já parseado. Levanta exceção se a chamada ou o parse falharem —
    quem chama decide como lidar (nunca inventa um resultado)."""
    model = model or config.MODEL_PRIMARY
    url = (
        f"https://{config.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/"
        f"{config.GCP_PROJECT_ID}/locations/{config.GCP_LOCATION}/publishers/google/"
        f"models/{model}:generateContent"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema,
            "temperature": temperature,
        },
    }
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {_access_token()}", "Content-Type": "application/json"},
        json=body,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini não retornou candidatos: {data}")
    text = candidates[0]["content"]["parts"][0]["text"]
    cost_log.log_call(model, log_label, log_detail, data.get("usageMetadata") or {}, cache_hit=False)
    return json.loads(text)
