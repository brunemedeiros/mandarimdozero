"""Monta o JSON importável (painel admin > Desafios > importar) das 80
expressões do "lote de expressões" a partir do conteúdo-fonte
(lote-expressoes-content.json). NÃO chama rede nenhuma.

    python3 fr/scripts/challenges_import/build_lote_expressoes.py

Gera lote-expressoes-80.json com status "needs_review" (nunca publica sozinho).
O aviso de REGISTRO (familiar / muito familiar / vulgar) é acrescentado aqui,
por regra única, em meaning.pt e explanation -- o app não tem campo de
registro, então o aviso vai dentro do texto.

Nomes de áudio: md5(texto exibido)[:12] + ".mp3", a mesma regra de
challenges_pipeline/tts.py (synthesize). Os mp3 são gerados depois por
generate_challenge_audio.py (workflow "Áudio TTS", modo desafios-expressoes).
"""
import hashlib
import json
import os
import sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "lote-expressoes-content.json")
OUT = os.path.join(HERE, "lote-expressoes-80.json")

# Expressões que já existem no banco (migrations 002/005 + fr/challenges.js).
EXISTING = {
    "avoir faim", "avoir la gueule de bois", "avoir le trac", "avoir raison",
    "avoir soif", "avoir un poil dans la main", "casser les pieds", "coup de main",
    "faire la grasse matinée", "mettre les points sur les i",
    "ne pas y aller de main morte", "poser un lapin",
}

PT_SUFFIX = {
    "neutre": "",
    "familier": " Registro: familiar — use com amigos e pessoas próximas, evite em contextos formais.",
    "très familier": " ⚠️ Registro: muito familiar/gíria — só com pessoas próximas; evite em contextos formais.",
    "vulgaire": " ⚠️ Registro: vulgar — pode ofender. Evite em contextos formais ou com desconhecidos.",
}
FR_SUFFIX = {
    "neutre": "",
    "familier": " Registre familier : à utiliser entre amis, pas dans un contexte formel.",
    "très familier": " Registre très familier : seulement avec des proches.",
    "vulgaire": " Registre vulgaire : peut choquer, à éviter dans un contexte formel ou avec des inconnus.",
}
LEVELS = {"A1", "A2", "B1", "B2"}


def audio_name(text):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12] + ".mp3"


def youglish(expression):
    return {
        "type": "youglish",
        "url": "https://youglish.com/pronounce/" + quote(expression, safe="") + "/french",
        "title": "YouGlish",
        "sourceName": "YouGlish",
        "description": "Ouça a expressão sendo usada por falantes reais em vários vídeos.",
        "quality": "high",
        "buttonLabel": "Voir en contexte",
        "approved": True,
        "lastChecked": None,
    }


def build_item(src):
    expr, reg = src["expression"], src["register"]
    return {
        "id": src["id"],
        "type": "expression",
        "canonicalExpression": expr,
        "level": src["level"],
        "expressionAudioFile": audio_name(expr),
        "meaning": {
            "fr": src["meaningFr"],
            "pt": src["meaningPt"].rstrip() + PT_SUFFIX[reg],
        },
        "example": {"text": src["exampleText"], "audioFile": audio_name(src["exampleText"])},
        "question": src["question"],
        "options": src["options"],
        "correctAnswer": src["correctAnswer"],
        "explanation": src["explanationFr"].rstrip() + FR_SUFFIX[reg],
        "secondExample": {
            "text": src["secondExampleText"],
            "audioFile": audio_name(src["secondExampleText"]),
        },
        "microActivity": {"prompt": src["microPrompt"], "answer": src["microAnswer"]},
        "externalResources": [youglish(expr)],
        "status": "needs_review",
    }


def validate(items):
    errors, seen_ids, seen_expr = [], set(), set()
    for it in items:
        i = it["id"]
        if i in seen_ids:
            errors.append(f"{i}: id duplicado")
        seen_ids.add(i)
        e = it["canonicalExpression"]
        if e in seen_expr or e in EXISTING:
            errors.append(f"{i}: expressão repetida/já existente ({e})")
        seen_expr.add(e)
        if it["level"] not in LEVELS:
            errors.append(f"{i}: nível inválido {it['level']}")
        opts = it["options"]
        if len(opts) != 4 or len(set(opts)) != 4:
            errors.append(f"{i}: precisa de 4 opções distintas")
        if it["correctAnswer"] not in opts:
            errors.append(f"{i}: correctAnswer fora das opções")
        mp = it["microActivity"]["prompt"]
        if mp.count("_" * 10) != 1 or "_" * 11 in mp:
            errors.append(f"{i}: microActivity.prompt precisa de UMA lacuna de 10 '_'")
        if not it["microActivity"]["answer"].strip():
            errors.append(f"{i}: microActivity.answer vazio")
        if it["example"]["text"] == it["secondExample"]["text"]:
            errors.append(f"{i}: os dois exemplos são iguais")
        for k in ("fr", "pt"):
            if not it["meaning"][k].strip():
                errors.append(f"{i}: meaning.{k} vazio")
    return errors


def main():
    with open(SRC, encoding="utf-8") as f:
        src_items = json.load(f)
    items = [build_item(s) for s in src_items]
    errors = validate(items)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")
    texts = {t for it in items for t in (it["canonicalExpression"], it["example"]["text"], it["secondExample"]["text"])}
    print(f"{len(items)} desafios -> {OUT} ({len(texts)} textos distintos para áudio)")


if __name__ == "__main__":
    main()
