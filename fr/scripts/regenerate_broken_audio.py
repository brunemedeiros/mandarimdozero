"""Regera os 6 mp3s de fr/audio que saíram quase mudos da geração original
(ver nota em fr/audio-manifest.js e o PR que os removeu de lá).

Reaproveita a mesma infraestrutura de TTS já usada pro resto do site
(challenges_pipeline/tts.py: mesma voz fr-FR-Chirp3-HD-Achernar, mesma
validação via Speech-to-Text, mesmo esquema de nome de arquivo por hash MD5
do texto) -- só aponta a saída pra fr/audio/ em vez de fr/audio/challenges/,
que é onde o manifesto principal (AUDIO_MANIFEST) espera os arquivos.

Não escreve em audio-manifest.js sozinho -- só gera os mp3s e imprime as
linhas prontas pra colar de volta no manifesto, pelo mesmo motivo que o
resto do pipeline nunca publica sozinho (ver challenges_pipeline/README.md):
mais seguro revisar antes de um arquivo versionado mudar.

Uso:
    export GCP_TTS_KEY="..."
    cd frances-do-zero/scripts   # (ou fr/scripts, dependendo do clone)
    python3 regenerate_broken_audio.py
"""

import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from challenges_pipeline import config
from challenges_pipeline.tts import (
    _synthesize_raw,
    _transcribe,
    _words_missing_from_transcript,
    prepare_text_for_tts,
)

# As 6 palavras cujo mp3 original saiu quase mudo (pico de amplitude ~70-680x
# mais baixo que a média do resto do manifesto) -- ver commit que as removeu
# de AUDIO_MANIFEST em fr/audio-manifest.js.
WORDS_TO_REGENERATE = ["ans", "je", "cher", "près", "dire", "tu"]

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_OUTPUT_DIR = os.path.join(_THIS_DIR, "..", "audio")

MAX_ATTEMPTS = 4


def regenerate_one(text, max_attempts=MAX_ATTEMPTS):
    """Mesma lógica de challenges_pipeline.tts.synthesize() (síntese +
    validação via STT, tenta de novo se alguma palavra sumir da
    transcrição), mas sempre regera (não reusa um mp3 existente por hash) e
    salva em fr/audio/ em vez de fr/audio/challenges/."""
    filename = hashlib.md5(text.encode("utf-8")).hexdigest()[:12] + ".mp3"
    out_path = os.path.join(AUDIO_OUTPUT_DIR, filename)
    tts_input = prepare_text_for_tts(text)

    last_missing = None
    for attempt in range(max_attempts):
        print(f'  tentativa {attempt + 1}/{max_attempts} para "{text}"...')
        audio_bytes = _synthesize_raw(tts_input, retries=3)

        transcript = _transcribe(audio_bytes)
        if transcript is None:
            print("  [aviso] Speech-to-Text indisponível -- aceitando áudio sem validar.")
            break
        missing = _words_missing_from_transcript(tts_input, transcript)
        if missing is None or not missing:
            print(f'  OK -- STT ouviu: "{transcript}"')
            break
        last_missing = missing
        print(f'  [aviso] STT não reconheceu tudo (faltou {missing}, ouvido: "{transcript}") -- tentando de novo.')
    else:
        raise RuntimeError(
            f'Não deu pra gerar um áudio válido para {text!r} em {max_attempts} tentativas '
            f'-- palavras nunca reconhecidas: {last_missing}. Rode de novo mais tarde '
            f'(a síntese é estocástica) ou aumente max_attempts.'
        )

    os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(audio_bytes)
    return filename


def main():
    if not config.GCP_TTS_KEY:
        print("ERRO: variável de ambiente GCP_TTS_KEY não configurada.", file=sys.stderr)
        print("Rode: export GCP_TTS_KEY=\"sua-chave-aqui\"", file=sys.stderr)
        sys.exit(1)

    print(f"Regerando {len(WORDS_TO_REGENERATE)} áudios (voz {config.TTS_VOICE})...\n")
    results = {}
    failures = {}
    for word in WORDS_TO_REGENERATE:
        print(f'"{word}":')
        try:
            filename = regenerate_one(word)
            results[word] = filename
            print(f'  -> salvo em fr/audio/{filename}\n')
        except Exception as exc:
            failures[word] = str(exc)
            print(f"  -> FALHOU: {exc}\n")

    print("=" * 60)
    if results:
        print(f"{len(results)}/{len(WORDS_TO_REGENERATE)} geradas com sucesso.")
        print("\nLinhas prontas pra colar de volta em fr/audio-manifest.js")
        print("(ordem alfabética -- cada uma vai no lugar certo do arquivo):\n")
        for word in sorted(results):
            print(f' "{word}": "{results[word]}",')
        print(
            "\nDepois de colar: remova também o bloco de comentário "
            '"Exceção manual (2026-09-16)" no topo de fr/audio-manifest.js '
            "(ou reduza pra só as palavras que ainda faltarem, se alguma falhou acima)."
        )
    if failures:
        print(f"\n{len(failures)} falharam -- rode o script de novo só pra essas (a síntese é estocástica):")
        for word, err in failures.items():
            print(f'  "{word}": {err}')


if __name__ == "__main__":
    main()
