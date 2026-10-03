"""Gera os mp3 (fr/audio/challenges/<md5[:12]>.mp3) de um JSON de desafios
já montado (lote-expressoes-80.json, lote-a1-m1.json ...): expressão = áudio
da expressão e dos dois exemplos; Ouça e traduza = a frase; Acentuação = a
palavra. Roda pelo GitHub Actions (Áudio TTS > modos desafios-expressoes e
desafios-a1-m1).

    GCP_TTS_KEY=... python3 fr/scripts/challenges_import/generate_challenge_audio.py [arquivo.json]

Usa challenges_pipeline.tts.synthesize (mesma voz Chirp 3 HD, mesma camada de
texto falado, validação por Speech-to-Text). Se a validação por STT recusar um
texto (comum em gíria/interjeições), tenta de novo sem o STT mas SEMPRE com a
checagem física do mp3 (volume/duração, tts.audio_is_healthy). Nome do arquivo = hash do texto exibido
(não regenera o que já existe). Um texto que falha não derruba o resto: o resumo
no fim lista o que ficou sem áudio.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

import hashlib  # noqa: E402

from challenges_pipeline import config, tts  # noqa: E402
from challenges_pipeline.spoken_text import to_spoken_text  # noqa: E402

DEFAULT_JSON = os.path.join(HERE, "lote-expressoes-80.json")


def texts_of(item):
    """Textos que precisam de mp3, por tipo de desafio."""
    kind = item.get("type", "expression")
    if kind == "listen_translate":
        return [item["sentenceFr"]]
    if kind == "accent":
        return [item["targetText"]]
    return [
        item["canonicalExpression"],
        item["example"]["text"],
        item["secondExample"]["text"],
    ]


def audio_path(text):
    name = hashlib.md5(text.encode("utf-8")).hexdigest()[:12] + ".mp3"
    return os.path.join(config.AUDIO_OUTPUT_DIR, name)


def fallback_generate(text, attempts=5):
    """Sem STT: sintetiza e só grava se o mp3 passar na checagem física
    (volume/duração). Mesmo texto falado do caminho normal."""
    spoken = tts.prepare_text_for_tts(to_spoken_text(text, "fr"))
    last = "?"
    for _ in range(attempts):
        data = tts._synthesize_raw(spoken)
        ok, why = tts.audio_is_healthy(data)
        if ok:
            os.makedirs(config.AUDIO_OUTPUT_DIR, exist_ok=True)
            with open(audio_path(text), "wb") as f:
                f.write(data)
            return
        last = why
    raise RuntimeError(f"mp3 sem qualidade em {attempts} tentativas: {last}")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_JSON
    with open(path, encoding="utf-8") as f:
        items = json.load(f)
    texts = []
    for it in items:
        for t in texts_of(it):
            if t not in texts:
                texts.append(t)
    print(f"{len(items)} desafios, {len(texts)} textos distintos")
    done, reused, failed = 0, 0, []
    for n, text in enumerate(texts, start=1):
        existed = os.path.exists(audio_path(text))
        try:
            tts.synthesize(text)
        except Exception as exc:
            print(f"  [{n}/{len(texts)}] STT recusou {text!r} ({exc}); tentando sem STT", file=sys.stderr)
            try:
                fallback_generate(text)
            except Exception as exc2:
                failed.append((text, str(exc2)))
                print(f"  [{n}/{len(texts)}] FALHOU {text!r}: {exc2}", file=sys.stderr)
                continue
        if existed:
            reused += 1
        else:
            done += 1
    print(f"geradas: {done} | já existiam: {reused} | falharam: {len(failed)}")
    for text, why in failed:
        print(f"  SEM ÁUDIO: {text!r} -> {why}")
    if failed:
        sys.exit(2)


if __name__ == "__main__":
    main()
