"""Regenera os mp3 do francês cujo TEXTO FALADO mudou (regras de
challenges_pipeline/spoken_text.py). Não precisa saber Python: roda pelo
GitHub Actions (aba Actions > "Áudio TTS" > Run workflow, modo "regenerar").

Para cada entrada afetada: sintetiza o texto falado, valida (Speech-to-Text
contra o texto falado + pico de volume) e só então grava fr/audio/<md5>.mp3 e
atualiza fr/audio-manifest.js. A chave do manifest continua sendo o texto
EXIBIDO. Chave da API: variável de ambiente GCP_TTS_KEY (nunca em arquivo).
"""
import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import miniaudio  # noqa: E402

from challenges_pipeline import config  # noqa: E402
from challenges_pipeline.spoken_text import load_manifest, report_affected_entries  # noqa: E402
from challenges_pipeline.tts import (  # noqa: E402
    _synthesize_raw, _transcribe, _words_missing_from_transcript, prepare_text_for_tts,
)

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MANIFEST = os.path.join(ROOT, "fr", "audio-manifest.js")
AUDIO_DIR = os.path.join(ROOT, "fr", "audio")
PEAK_THRESHOLD = 0.15
MAX_ATTEMPTS = 6


def audio_peak(data):
    s = miniaudio.decode(data, output_format=miniaudio.SampleFormat.FLOAT32).samples
    return max(abs(min(s)), abs(max(s))) if len(s) else 0.0


def generate(spoken):
    tts_input = prepare_text_for_tts(spoken)
    reason = "?"
    for attempt in range(1, MAX_ATTEMPTS + 1):
        data = _synthesize_raw(tts_input)
        peak = audio_peak(data)
        if peak < PEAK_THRESHOLD:
            reason = f"quase mudo (pico {peak:.3f})"
            continue
        transcript = _transcribe(data)
        if transcript is None:
            reason = "STT indisponível"
            continue
        if not transcript.strip():
            reason = "transcrição vazia"
            continue
        missing = _words_missing_from_transcript(tts_input, transcript)
        if missing:
            reason = f"faltou {missing} (ouvido: {transcript!r})"
            continue
        return data
    raise RuntimeError(f"{spoken!r}: {reason} após {MAX_ATTEMPTS} tentativas")


def main():
    if not config.GCP_TTS_KEY:
        print("GCP_TTS_KEY não configurada.", file=sys.stderr)
        return 1
    manifest = load_manifest(MANIFEST)
    affected = report_affected_entries(manifest, "fr")
    print(f"{len(affected)} entradas a regenerar.")
    src = open(MANIFEST, encoding="utf-8").read()
    failures = []
    for display, spoken, rules in affected:
        print(f"- {display!r} -> {spoken!r} {rules}")
        try:
            data = generate(spoken)
        except Exception as exc:  # não interrompe as outras
            print(f"  FALHOU: {exc}", file=sys.stderr)
            failures.append(display)
            continue
        new_name = hashlib.md5(display.encode("utf-8")).hexdigest()[:12] + ".mp3"
        with open(os.path.join(AUDIO_DIR, new_name), "wb") as f:
            f.write(data)
        old_name = manifest[display]
        esc = display.replace('"', '\\"')
        src = src.replace(f' "{esc}": "{old_name}"', f' "{esc}": "{new_name}"')
        still_used = sum(1 for v in manifest.values() if v == old_name) > 1
        if old_name != new_name and not still_used:
            try:
                os.remove(os.path.join(AUDIO_DIR, old_name))
            except FileNotFoundError:
                pass
        print(f"  ok -> {new_name}")
    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write(src)
    if failures:
        print("Falharam:", failures, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
