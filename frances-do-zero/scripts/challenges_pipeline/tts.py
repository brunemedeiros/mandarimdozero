"""Geração de áudio (Google Cloud Text-to-Speech) pras frases de exemplo dos
desafios. Reaproveita a mesma API key/voz já usada pelo resto do site (ver
scripts/gen_guided_dictation_audio.py) -- sem SSML/pausas especiais aqui,
é só uma leitura natural de uma frase curta."""

import base64
import hashlib
import json
import os
import time

import requests

from . import config

TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


def synthesize(text, retries=3):
    """Sintetiza `text` e salva em AUDIO_OUTPUT_DIR, nomeado por hash do
    texto (mesmo texto -> mesmo arquivo, evita regenerar à toa). Devolve só
    o nome do arquivo (sem o caminho), pra usar como `audioFile` no
    challenges.js -- o front monta o caminho completo
    (`audio/challenges/<arquivo>`)."""
    if not config.GCP_TTS_KEY:
        raise RuntimeError("GCP_TTS_KEY não configurada (variável de ambiente).")

    filename = hashlib.md5(text.encode("utf-8")).hexdigest()[:12] + ".mp3"
    out_path = os.path.join(config.AUDIO_OUTPUT_DIR, filename)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return filename

    body = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": "fr-FR", "name": config.TTS_VOICE},
        "audioConfig": {"audioEncoding": "MP3"},
    })

    last_error = None
    for attempt in range(retries):
        try:
            resp = requests.post(
                f"{TTS_URL}?key={config.GCP_TTS_KEY}",
                headers={"Content-Type": "application/json"},
                data=body,
                timeout=30,
            )
            data = resp.json()
            if "audioContent" in data:
                os.makedirs(config.AUDIO_OUTPUT_DIR, exist_ok=True)
                with open(out_path, "wb") as f:
                    f.write(base64.b64decode(data["audioContent"]))
                return filename
            last_error = data.get("error", {})
        except Exception as exc:
            last_error = str(exc)
        time.sleep(1.5 * (attempt + 1))

    raise RuntimeError(f"TTS falhou para o texto {text!r}: {last_error}")
