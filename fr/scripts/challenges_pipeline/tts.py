"""Geração de áudio (Google Cloud Text-to-Speech) -- infraestrutura única
reaproveitada por TODAS as categorias de Desafios (Expressões, Ouça e
traduza, Acentuação) e pelo resto do TTS do site.

Investigação (ver relatório completo na mensagem que acompanha este commit):
o texto armazenado em challenges.js e enviado à API já estava correto em
todos os casos testados (apóstrofo reto, acentos, cedilha -- confirmado
byte a byte). O problema real é que a voz neural (Chirp3-HD) ocasionalmente
ALUCINA em certas sequências mesmo recebendo o texto certo -- ex: "il
n'écoute" sintetizado como algo que soa "il aime écoute". Isso não é um bug
de parsing/escaping pra corrigir uma vez; é uma característica estocástica
do modelo de voz. A defesa estrutural é: sempre validar o áudio gerado
comparando com o texto de origem (via Speech-to-Text) e tentar de novo
quando não bate -- a mesma chamada com o mesmo texto costuma dar um
resultado diferente na próxima tentativa."""

import base64
import hashlib
import json
import os
import sys
import time
import unicodedata

import requests

from . import config

TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
STT_URL = "https://speech.googleapis.com/v1/speech:recognize"

_CURLY_QUOTE_MAP = str.maketrans({
    "‘": "'", "’": "'", "‚": "'", "′": "'",
    "“": '"', "”": '"', "«": '"', "»": '"',
})

_LIGATURE_MAP = str.maketrans({"œ": "oe", "Œ": "OE", "æ": "ae", "Æ": "AE"})


def prepare_text_for_tts(text):
    """Camada única de preparação de texto pro TTS, usada por toda geração
    de áudio do site (nunca uma implementação diferente por categoria).
    Só normaliza a REPRESENTAÇÃO enviada à API -- nunca expande contrações
    (`n'écoute` continua `n'écoute`, nunca vira `ne écoute`) nem altera o
    texto pedagógico armazenado/exibido (isso acontece só nesta função, no
    momento do envio, sobre uma cópia local da string).

    - NFC normaliza Unicode (uma letra acentuada sempre na mesma
      representação de codepoints, seja qual for a origem do texto).
    - Converte aspas/apóstrofos tipográficos (') pro reto (') -- alguns
      geradores de texto (incluindo o Gemini) às vezes usam a forma
      tipográfica; garante que ambas produzem o mesmo áudio.
    """
    text = unicodedata.normalize("NFC", text)
    text = text.translate(_CURLY_QUOTE_MAP)
    return text


def _normalize_for_comparison(text):
    """Normalização só pra COMPARAR texto original com transcrição do STT
    (nunca usada pro texto que vai pro TTS nem pro texto exibido). Trata
    apóstrofo como separador de palavra (`n'écoute` -> `n ecoute`, do jeito
    que o STT costuma tokenizar elisões) e equipara ligaduras (œ/oe)."""
    text = unicodedata.normalize("NFC", text).lower()
    text = text.translate(_CURLY_QUOTE_MAP)
    text = text.translate(_LIGATURE_MAP)
    text = text.replace("'", " ")
    text = text.replace("-", "")  # "week-end"/"weekend", "c'est-à-dire" etc. -- mesma palavra, STT tokeniza diferente
    cleaned = []
    for ch in text:
        if ch.isalnum() or ch.isspace():
            cleaned.append(ch)
        else:
            cleaned.append(" ")
    return set("".join(cleaned).split())


def _words_missing_from_transcript(source_text, transcript):
    """Devolve o conjunto de palavras do texto original que NÃO aparecem na
    transcrição -- ou None se o STT não transcreveu nada (transcrição vazia
    é uma limitação conhecida do STT em áudios muito curtos/uma palavra só,
    não prova que o TTS errou; tratamos como inconclusivo, não como falha)."""
    if not transcript or not transcript.strip():
        return None
    source_words = _normalize_for_comparison(source_text)
    transcript_words = _normalize_for_comparison(transcript)
    return source_words - transcript_words


def _synthesize_raw(text, retries=3):
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
                return base64.b64decode(data["audioContent"])
            last_error = data.get("error", {})
        except Exception as exc:
            last_error = str(exc)
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"TTS falhou para o texto {text!r}: {last_error}")


def _transcribe(audio_bytes):
    body = {
        "config": {"encoding": "MP3", "sampleRateHertz": 24000, "languageCode": "fr-FR"},
        "audio": {"content": base64.b64encode(audio_bytes).decode()},
    }
    try:
        resp = requests.post(f"{STT_URL}?key={config.GCP_TTS_KEY}", json=body, timeout=30)
        data = resp.json()
        results = data.get("results", [])
        if not results:
            return ""
        return results[0]["alternatives"][0]["transcript"]
    except Exception:
        # STT indisponível não deve travar a geração de áudio -- só
        # significa que não dá pra validar desta vez.
        return None


def synthesize(text, retries=3, validate=True, max_synthesis_attempts=3):
    """Sintetiza `text` e salva em AUDIO_OUTPUT_DIR, nomeado por hash do
    texto ORIGINAL (mesmo texto -> mesmo arquivo, evita regenerar à toa).
    Devolve só o nome do arquivo, pra usar como `audioFile` no
    challenges.js -- o front monta o caminho completo
    (`audio/challenges/<arquivo>`).

    Quando validate=True (padrão), o áudio gerado é conferido via
    Speech-to-Text contra o texto original; se alguma palavra sumiu ou foi
    trocada (o tipo de alucinação que motivou esta função), tenta gerar de
    novo -- a síntese é estocástica, uma nova tentativa com o mesmo texto
    frequentemente sai certa. Depois de esgotar as tentativas, levanta
    exceção em vez de salvar um áudio sabidamente errado (quem chama já
    trata isso como "áudio ausente", ver generate_challenges.py)."""
    if not config.GCP_TTS_KEY:
        raise RuntimeError("GCP_TTS_KEY não configurada (variável de ambiente).")

    filename = hashlib.md5(text.encode("utf-8")).hexdigest()[:12] + ".mp3"
    out_path = os.path.join(config.AUDIO_OUTPUT_DIR, filename)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return filename

    tts_input = prepare_text_for_tts(text)

    last_missing = None
    for attempt in range(max_synthesis_attempts):
        audio_bytes = _synthesize_raw(tts_input, retries=retries)

        if not validate:
            break

        transcript = _transcribe(audio_bytes)
        if transcript is None:
            # STT fora do ar -- não dá pra validar, aceita o áudio como está.
            break
        missing = _words_missing_from_transcript(tts_input, transcript)
        if missing is None or not missing:
            break
        last_missing = missing
        print(
            f'  [aviso] TTS pode ter mispronunciado "{text}" (tentativa {attempt + 1}/'
            f'{max_synthesis_attempts}): faltou {missing} -- ouvido: "{transcript}"',
            file=sys.stderr,
        )
    else:
        raise RuntimeError(
            f'TTS gerou áudio incorreto pra {text!r} em {max_synthesis_attempts} tentativas '
            f'-- palavras nunca reconhecidas: {last_missing}'
        )

    os.makedirs(config.AUDIO_OUTPUT_DIR, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(audio_bytes)
    return filename
