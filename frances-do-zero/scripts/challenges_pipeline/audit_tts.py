"""Ferramenta de auditoria/regressão do TTS em francês.

Dois modos de uso:

1. Bateria de regressão (frases fixas cobrindo contrações, acentos,
   cedilha, ligaduras e pontuação -- incluindo o caso relatado que motivou
   esta ferramenta): roda `tts.synthesize()` de verdade (com validação e
   retry) pra cada frase e reporta o resultado. É o jeito de saber se uma
   mudança futura no pipeline/voz quebrou alguma dessas classes de caso.

       python3 -m challenges_pipeline.audit_tts battery

2. Auditoria do conteúdo já publicado/pendente em challenges.js: lê cada
   par (texto, audioFile) do arquivo e confere via Speech-to-Text se o
   áudio já gerado ainda bate com o texto (não gera áudio novo, só audita
   o que já existe).

       python3 -m challenges_pipeline.audit_tts existing [caminho/challenges.js]

Em ambos os casos, nunca decide sozinho que um áudio está "ruim" com base
só numa transcrição vazia do STT (isso é uma limitação conhecida do STT em
clipes curtos/uma palavra só, não prova nada sobre o TTS) -- só reporta
como suspeito quando o STT efetivamente ouviu outra coisa."""

import argparse
import json
import os
import subprocess
import sys

from . import config, tts

REGRESSION_PHRASES = [
    # contrações
    "j'aime", "j'habite", "j'écoute", "j'arrive", "j'ai", "j'étais", "j'avais",
    "j'essaie", "j'ai essayé", "l'homme", "l'enfant", "l'école", "l'idée",
    "l'autre", "l'eau", "l'été", "d'accord", "qu'il", "qu'elle", "qu'on", "qu'ils",
    "s'il", "n'écoute", "n'aime", "n'est", "n'a", "n'était", "n'avait",
    "c'est", "ce n'est pas",
    # acentos
    "élève", "très", "après", "forêt", "naïf", "français", "où", "déjà",
    # cedilha
    "garçon", "leçon", "ça",
    # ligaduras
    "cœur", "sœur", "œuf", "œuvre",
    # pontuação
    "Qu'est-ce que tu fais ?", "C'est incroyable !", "Il n'écoute jamais.", "Tu viens avec nous ?",
    # regressão permanente do caso relatado
    "J'ai essayé de lui expliquer, mais il n'écoute jamais, il me casse vraiment les pieds avec ses idées fixes.",
    "J'aime beaucoup cette chanson.",
    "L'homme est déjà parti.",
    "Qu'est-ce qu'il fait ?",
    "Elle n'écoute jamais.",
    "C'est très difficile.",
    "Ma sœur habite à Paris.",
    "J'ai acheté deux œufs.",
]


def run_battery():
    ok, failed = [], []
    for phrase in REGRESSION_PHRASES:
        try:
            fn = tts.synthesize(phrase, validate=True)
            ok.append(phrase)
            print(f"[OK] {phrase!r} -> {fn}")
        except Exception as exc:
            failed.append({"phrase": phrase, "error": str(exc)})
            print(f"[FALHOU] {phrase!r}: {exc}")
    print(f"\n--- {len(ok)}/{len(REGRESSION_PHRASES)} passaram na validação ---")
    if failed:
        print("Falharam mesmo depois das tentativas de retry:")
        for f in failed:
            print(f'  - {f["phrase"]!r}: {f["error"]}')
    return len(failed) == 0


def _load_challenges_js(path):
    node_script = f"""
const fs = require('fs');
const src = fs.readFileSync({json.dumps(path)}, 'utf8') + '\\nmodule.exports = CHALLENGES;';
fs.writeFileSync('/tmp/audit_ch.js', src);
const CHALLENGES = require('/tmp/audit_ch.js');
const pairs = [];
CHALLENGES.forEach(c => {{
  if (c.expressionAudioFile) pairs.push({{text: c.canonicalExpression, audioFile: c.expressionAudioFile, ctx: c.id + '.expressionAudioFile'}});
  if (c.example && c.example.audioFile) pairs.push({{text: c.example.text, audioFile: c.example.audioFile, ctx: c.id + '.example'}});
  if (c.secondExample && c.secondExample.audioFile) pairs.push({{text: c.secondExample.text, audioFile: c.secondExample.audioFile, ctx: c.id + '.secondExample'}});
  if (c.audioFile && c.type !== 'expression') pairs.push({{text: c.sentenceFr || c.targetText, audioFile: c.audioFile, ctx: c.id + '.audioFile'}});
}});
console.log(JSON.stringify(pairs));
"""
    result = subprocess.run(["node", "-e", node_script], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"falha ao carregar {path} via node: {result.stderr}")
    return json.loads(result.stdout)


def run_existing_audit(challenges_js_path):
    pairs = _load_challenges_js(challenges_js_path)
    print(f"Auditando {len(pairs)} arquivo(s) de áudio já gerado(s)...\n")

    suspicious, missing, inconclusive, ok_count = [], [], 0, 0
    for p in pairs:
        audio_path = os.path.join(config.AUDIO_OUTPUT_DIR, p["audioFile"])
        if not os.path.exists(audio_path):
            missing.append(p)
            print(f"[ARQUIVO AUSENTE] {p['ctx']}: {p['audioFile']}")
            continue
        transcript = tts._transcribe(open(audio_path, "rb").read())
        missing_words = tts._words_missing_from_transcript(p["text"], transcript)
        if missing_words is None:
            inconclusive += 1
            print(f"[INCONCLUSIVO] {p['ctx']}: STT não conseguiu transcrever (comum em áudio curto)")
        elif missing_words:
            suspicious.append({**p, "transcript": transcript, "missing": list(missing_words)})
            print(f"[SUSPEITO] {p['ctx']}: {p['text']!r}")
            print(f'    ouvido: {transcript!r}')
            print(f'    faltando: {missing_words}')
        else:
            ok_count += 1
            print(f"[OK] {p['ctx']}")

    print(f"\n--- Resumo: {ok_count} ok, {len(suspicious)} suspeito(s), "
          f"{inconclusive} inconclusivo(s), {len(missing)} arquivo(s) ausente(s), {len(pairs)} total ---")
    return suspicious, missing


def main():
    parser = argparse.ArgumentParser(description="Auditoria/regressão do TTS em francês")
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("battery", help="Roda a bateria fixa de regressão (gera áudio novo, validado)")
    p_existing = sub.add_parser("existing", help="Audita o áudio já gerado em challenges.js")
    p_existing.add_argument("path", nargs="?", default="../challenges.js")

    args = parser.parse_args()
    if args.mode == "battery":
        success = run_battery()
        sys.exit(0 if success else 1)
    elif args.mode == "existing":
        suspicious, missing = run_existing_audit(args.path)
        sys.exit(0 if not suspicious and not missing else 1)


if __name__ == "__main__":
    main()
