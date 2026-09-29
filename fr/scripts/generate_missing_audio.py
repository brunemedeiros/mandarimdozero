"""Gera mp3 para textos do currículo que ainda NÃO têm áudio pré-gerado
(ex.: exemplos dentro de "Vale entender": 拜拜, "s'il te plaît") e os registra
no AUDIO_MANIFEST do idioma. Roda pelo GitHub Actions (modo "gerar-faltantes-*").

Uso: node fr/scripts/list_missing_audio.js zh | python3 fr/scripts/generate_missing_audio.py zh
Chave: variável de ambiente GCP_TTS_KEY (nunca em arquivo).
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import miniaudio  # noqa: E402

from challenges_pipeline import config  # noqa: E402
from challenges_pipeline.spoken_text import to_spoken_text  # noqa: E402
from challenges_pipeline.tts import (  # noqa: E402
    _synthesize_raw, _transcribe, _words_missing_from_transcript, prepare_text_for_tts,
    audio_is_healthy,
)

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PEAK_THRESHOLD = 0.15
MAX_ATTEMPTS = 5


def audio_peak(data):
    s = miniaudio.decode(data, output_format=miniaudio.SampleFormat.FLOAT32).samples
    return max(abs(min(s)), abs(max(s))) if len(s) else 0.0


def generate(display, lang):
    text = prepare_text_for_tts(to_spoken_text(display, lang))
    reason = "?"
    best = None
    for _ in range(MAX_ATTEMPTS):
        data = _synthesize_raw(text, lang=lang)
        ok, why = audio_is_healthy(data)
        if not ok:
            reason = why
            continue
        if lang == "zh":
            # sem espaços entre palavras: só exige que o STT tenha ouvido algo
            tr = _transcribe(data, lang="zh")
            if tr is None or tr.strip():
                return data
            reason = "transcrição vazia"
            best = data
            continue
        tr = _transcribe(data, lang=lang)
        if tr is None:
            return data
        missing = _words_missing_from_transcript(text, tr) if tr.strip() else set(text.split())
        if not missing:
            return data
        reason = f"faltou {missing} (ouvido: {tr!r})"
        if best is None or len(missing) * 2 <= max(1, len(text.split())):
            best = data
    if best is not None and len(text) <= 6:
        print("  [aviso] aceito com ressalva -- vale ouvir")
        return best
    raise RuntimeError(f"{display!r}: {reason}")


def main():
    lang = sys.argv[1]
    if not config.GCP_TTS_KEY:
        print("GCP_TTS_KEY não configurada.", file=sys.stderr)
        return 1
    texts = json.load(sys.stdin)
    audio_dir = os.path.join(ROOT, lang, "audio")
    manifest_path = os.path.join(ROOT, lang, "audio-manifest.js")
    src = open(manifest_path, encoding="utf-8").read()
    done, failed = [], []
    for t in texts:
        print(f"- {t!r}")
        try:
            data = generate(t, lang)
        except Exception as exc:
            print(f"  FALHOU: {exc}", file=sys.stderr)
            failed.append(t)
            continue
        name = hashlib.md5(t.encode("utf-8")).hexdigest()[:12] + ".mp3"
        with open(os.path.join(audio_dir, name), "wb") as f:
            f.write(data)
        done.append((t, name))
        print(f"  ok -> {name}")
    if done:
        entries = ",\n".join(' %s: "%s"' % (json.dumps(t, ensure_ascii=False), n) for t, n in done)
        m = re.search(r'"\n\};\s*$', src) or re.search(r'\n\};\s*$', src)
        head = src[: m.start()] + ('"' if src[m.start():].startswith('"') else "")
        src = head + ",\n" + entries + "\n};\n"
        open(manifest_path, "w", encoding="utf-8").write(src)
    print(f"{len(done)} gerados, {len(failed)} falharam.")
    if failed:
        print("Falharam:", failed, file=sys.stderr)
    return 0 if not failed else 2


if __name__ == "__main__":
    sys.exit(main())
