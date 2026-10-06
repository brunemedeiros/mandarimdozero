"""Áudio POR FRASE dos ditados: fr/audio/dictation-<id>-s<N>.mp3 (N de 1).

Só a frase, voz FR_VOICE, ritmo natural levemente lento (rate 85%), sem abertura
nem introdução em português. Aplica to_spoken_text (texto falado), como o resto
do pipeline. Pula mp3 existente, salvo DICTATION_FORCE=1. Filtro: DICTATION_ONLY=d1,d2.

Uso: [DICTATION_FORCE=1] [DICTATION_ONLY=id1,id2] GCP_TTS_KEY=... python3 gen_dictation_sentence_audio.py [--dry-run]
--dry-run: sem rede/chave; imprime frases, tamanhos e custo em caracteres.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "challenges_pipeline"))
import gen_guided_dictation_audio as g
from dictation_sentences import split_sentences
from spoken_text import to_spoken_text

RATE = "85%"


def sentence_ssml(sentence):
    spoken = to_spoken_text(sentence, "fr")
    return f'<speak><prosody rate="{RATE}">{g.xml_escape(spoken)}</prosody></speak>', spoken


def plan(dictations, only=None):
    """[(id, n, frase, ssml, texto_falado)] de todas as frases."""
    out = []
    for d in dictations:
        if only and d["id"] not in only:
            continue
        for n, s in enumerate(split_sentences(d["text"]), 1):
            ssml, spoken = sentence_ssml(s)
            out.append((d["id"], n, s, ssml, spoken))
    return out


def main():
    dry = "--dry-run" in sys.argv
    only = {x for x in os.environ.get("DICTATION_ONLY", "").split(",") if x} or None
    force = os.environ.get("DICTATION_FORCE") == "1"
    out_dir = os.path.join(HERE, "..", "audio")
    items = plan(g.load_dictations(os.path.join(HERE, "..", "dictations.js")), only)
    if dry:
        chars = 0
        for did, n, s, ssml, spoken in items:
            chars += len(spoken)
            print(f"{did} s{n}: {s!r} | falado={len(spoken)} chars | ssml={len(ssml.encode('utf-8'))} bytes")
        print(f"TOTAL: {len(items)} frases, {chars} caracteres (cota grátis: 1.000.000/mês)")
        return
    if not g.API_KEY:
        sys.exit("GCP_TTS_KEY ausente")
    for did, n, s, ssml, spoken in items:
        path = os.path.join(out_dir, f"dictation-{did}-s{n}.mp3")
        if not force and os.path.exists(path) and os.path.getsize(path) > 0:
            print(did, n, "skip"); continue
        data, err = g.synth_ssml_bytes(ssml, g.FR_VOICE)
        if err:
            print(did, n, err); continue
        with open(path, "wb") as f:
            f.write(data)
        print(did, n, "ok")


if __name__ == "__main__":
    main()
