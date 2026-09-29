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
from .spoken_text import to_spoken_text

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


# Elisões do francês: o texto escreve "t'as", o STT costuma escrever "tu as"
# (soam quase iguais). Só pra COMPARAR -- nunca muda o texto exibido nem o enviado.
_ELISIONS = {"t": "tu", "j": "je", "n": "ne", "m": "me", "s": "se", "d": "de", "c": "ce", "qu": "que"}
_ARTICLE_FORMS = {"l": "le", "la": "le"}


def _tokens_for_comparison(text):
    """Lista ORDENADA de palavras normalizadas (apóstrofo separa palavra)."""
    text = unicodedata.normalize("NFC", text).lower()
    text = text.translate(_CURLY_QUOTE_MAP)
    text = text.translate(_LIGATURE_MAP)
    text = text.replace("'", " ")
    text = text.replace("-", "")  # "week-end"/"weekend", "c'est-à-dire" etc. -- mesma palavra, STT tokeniza diferente
    cleaned = [ch if (ch.isalnum() or ch.isspace()) else " " for ch in text]
    return "".join(cleaned).split()


def _canonical(tok):
    return _ARTICLE_FORMS.get(tok) or _ELISIONS.get(tok) or tok


def _normalize_for_comparison(text):
    """Conjunto de palavras normalizadas só pra COMPARAR texto original com
    transcrição do STT (nunca usada pro texto que vai pro TTS nem pro texto
    exibido). Apóstrofo separa palavra (`n'écoute` -> `n ecoute`), equipara
    ligaduras (œ/oe) e trata a elisão como a palavra cheia (`t'as` == `tu as`)."""
    return {_canonical(t) for t in _tokens_for_comparison(text)}


def _words_missing_from_transcript(source_text, transcript):
    """Devolve o conjunto de palavras do texto original que NÃO aparecem na
    transcrição -- ou None se o STT não transcreveu nada (transcrição vazia
    é uma limitação conhecida do STT em áudios muito curtos/uma palavra só,
    não prova que o TTS errou; tratamos como inconclusivo, não como falha)."""
    if not transcript or not transcript.strip():
        return None
    src = _tokens_for_comparison(source_text)
    tr_raw = set(_tokens_for_comparison(transcript))
    tr = {_canonical(t) for t in tr_raw}
    missing = set()
    skip_next = False
    for i, tok in enumerate(src):
        if skip_next:
            skip_next = False
            continue
        # STT que cola a elisão na palavra seguinte ("t'es" -> "tes")
        if tok in _ELISIONS and i + 1 < len(src) and (tok + src[i + 1]) in tr_raw:
            skip_next = True
            continue
        if _canonical(tok) not in tr:
            missing.add(_canonical(tok))
    return missing


def audio_is_healthy(data, min_peak=0.15, min_voiced_s=0.15, min_rms=0.02):
    """Checagem física do mp3 (independe do STT, que erra palavras curtas):
    volume de pico, duração com som de verdade e energia média. Pega o caso
    dos áudios quase mudos ('je', 'tu') sem confiar na transcrição."""
    import miniaudio
    dec = miniaudio.decode(data, output_format=miniaudio.SampleFormat.FLOAT32)
    smp = dec.samples
    if not len(smp):
        return False, "vazio"
    peak = max(abs(min(smp)), abs(max(smp)))
    voiced = [i for i, x in enumerate(smp) if abs(x) > 0.02]
    voiced_s = (voiced[-1] - voiced[0]) / dec.sample_rate if voiced else 0.0
    rms = (sum(x * x for x in smp) / len(smp)) ** 0.5
    if peak < min_peak:
        return False, f"quase mudo (pico {peak:.3f})"
    if voiced_s < min_voiced_s:
        return False, f"som muito curto ({voiced_s:.2f}s)"
    if rms < min_rms:
        return False, f"energia baixa (rms {rms:.3f})"
    return True, "ok"


# Voz e locale por idioma (fr é o padrão -- todo o resto do pipeline continua igual).
_VOICE_BY_LANG = {
    "fr": ("fr-FR", None),  # None = usa config.TTS_VOICE
    "zh": ("cmn-CN", "cmn-CN-Chirp3-HD-Achernar"),
}
_STT_LOCALE_BY_LANG = {"fr": "fr-FR", "zh": "cmn-Hans-CN"}


def _synthesize_raw(text, retries=3, lang="fr"):
    body = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": _VOICE_BY_LANG[lang][0],
                  "name": _VOICE_BY_LANG[lang][1] or config.TTS_VOICE},
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


def _transcribe(audio_bytes, lang="fr"):
    body = {
        "config": {"encoding": "MP3", "sampleRateHertz": 24000, "languageCode": _STT_LOCALE_BY_LANG[lang]},
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


def synthesize(text, retries=3, validate=True, max_synthesis_attempts=3, lang="fr"):
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

    # O arquivo continua nomeado pelo hash do texto EXIBIDO (é a chave do
    # manifest); só o que é ENVIADO ao TTS passa pela camada de texto falado
    # (spoken_text.py) -- e é contra esse texto falado que o STT valida.
    tts_input = prepare_text_for_tts(to_spoken_text(text, lang))

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
