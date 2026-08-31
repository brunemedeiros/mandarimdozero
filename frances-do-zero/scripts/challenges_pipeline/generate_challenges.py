"""Pipeline de curadoria automática de Desafios -- três categorias
compartilhando a mesma infraestrutura (níveis CEFR, TTS, fila de revisão):

    python3 -m challenges_pipeline.generate_challenges expression \
        --level B1 "avoir la gueule de bois" "casser les pieds"

    python3 -m challenges_pipeline.generate_challenges listen_translate \
        --level A2 --count 20 --out /tmp/lt.json

    python3 -m challenges_pipeline.generate_challenges accent \
        --level B1 --count 30 --out /tmp/accent.json

Todas as categorias saem com status "needs_review" pra revisão humana no
painel admin -- nunca publicam sozinhas.
"""

import argparse
import json
import sys

from . import (
    accent_generator,
    content_generator,
    cost_log,
    external_resources,
    listen_translate_generator,
    tts,
)

# Nenhuma chamada ao Gemini pede mais que isso de uma vez -- lotes grandes
# (ex: 100) são feitos em várias chamadas menores, tanto por limite de
# tokens de saída quanto pra manter a qualidade/diversidade de cada lote.
BATCH_SIZE = 15


# ---------- Expressões ----------

def build_expression_draft(idx, expression, level):
    content = content_generator.generate(expression, level)

    # O TTS da etapa inicial pronuncia só a expressão-alvo (não a frase de
    # exemplo inteira) -- decisão de produto explícita, ver README.
    expression_audio = None
    try:
        expression_audio = tts.synthesize(expression)
    except Exception as exc:
        print(f'  [aviso] TTS falhou pra expressão-alvo: {exc}', file=sys.stderr)

    second_example_audio = None
    try:
        second_example_audio = tts.synthesize(content["secondExampleText"])
    except Exception as exc:
        print(f'  [aviso] TTS falhou pro segundo exemplo: {exc}', file=sys.stderr)

    resources = external_resources.find_for_expression(expression)

    return {
        "id": f"expr-auto-{idx:03d}",
        "type": "expression",
        "canonicalExpression": expression,
        "level": level,
        "expressionAudioFile": expression_audio,
        "meaning": {"fr": content["meaningFr"], "pt": content["meaningPt"]},
        "example": {"text": content["exampleText"]},
        "question": content["question"],
        "options": content["options"],
        "correctAnswer": content["correctAnswer"],
        "explanation": content["explanation"],
        "secondExample": {"text": content["secondExampleText"], "audioFile": second_example_audio},
        "microActivity": {
            "prompt": content["microActivityPrompt"],
            "answer": content["microActivityAnswer"],
        },
        "externalResources": resources,
        "status": "needs_review",
    }


def run_expression(expressions, level, out_path):
    accepted, rejected = [], []

    for idx, expression in enumerate(expressions, start=1):
        print(f'[{idx}/{len(expressions)}] "{expression}"...')
        try:
            draft = build_expression_draft(idx, expression, level)
        except Exception as exc:
            rejected.append({"item": expression, "reason": f"falha na geração: {exc}"})
            print(f'  -> falhou: {exc}')
            continue

        if draft["correctAnswer"] not in draft["options"]:
            rejected.append({"item": expression, "reason": "correctAnswer não bate com nenhuma option gerada"})
            print("  -> descartado: correctAnswer não bate com as alternativas geradas")
            continue

        accepted.append(draft)
        audio_status = "com áudio" if draft["expressionAudioFile"] and draft["secondExample"]["audioFile"] else "ÁUDIO FALTANDO"
        resources_status = ", ".join(r["type"] for r in draft["externalResources"]) or "nenhum recurso externo"
        print(f'  -> gerado ({audio_status}, recursos: {resources_status})')

    _finish(accepted, rejected, out_path, len(expressions))


# ---------- Ouça e traduza ----------

def build_listen_translate_draft(idx, item, level):
    sentence_audio = None
    try:
        sentence_audio = tts.synthesize(item["sentenceFr"])
    except Exception as exc:
        print(f'  [aviso] TTS falhou pra frase: {exc}', file=sys.stderr)

    return {
        "id": f"lt-auto-{idx:03d}",
        "type": "listen_translate",
        "level": level,
        "sentenceFr": item["sentenceFr"],
        "audioFile": sentence_audio,
        "hintText": item["hintText"],
        "referenceTranslations": item["referenceTranslations"],
        "explanation": item.get("explanation") or "",
        "status": "needs_review",
    }


def run_listen_translate(level, count, out_path):
    accepted, rejected = [], []
    idx = 0
    remaining = count
    batch_num = 0

    while remaining > 0:
        batch_num += 1
        this_batch = min(BATCH_SIZE, remaining)
        print(f'[lote {batch_num}] gerando {this_batch} frase(s) nível {level}...')
        try:
            items = listen_translate_generator.generate_batch(level, this_batch)
        except Exception as exc:
            rejected.append({"item": f"lote {batch_num}", "reason": f"falha na geração do lote: {exc}"})
            print(f'  -> lote falhou: {exc}')
            remaining -= this_batch
            continue

        for item in items:
            idx += 1
            try:
                draft = build_listen_translate_draft(idx, item, level)
            except Exception as exc:
                rejected.append({"item": item.get("sentenceFr", "?"), "reason": f"falha ao montar desafio: {exc}"})
                continue
            accepted.append(draft)
            audio_status = "com áudio" if draft["audioFile"] else "ÁUDIO FALTANDO"
            print(f'  -> "{draft["sentenceFr"]}" ({audio_status})')

        remaining -= this_batch

    _finish(accepted, rejected, out_path, count)


# ---------- Acentuação ----------

def build_accent_draft(idx, item, level):
    # A explicação nunca vem do texto livre do Gemini sobre "qual acento
    # está onde" -- na prática o modelo confunde tipos de acento e chega a
    # inventar acentos que não existem na palavra. describe_accents() é
    # determinístico (lê os caracteres reais de targetText), então é
    # sempre correto -- e serve pra descartar palavras sem nenhum acento.
    explanation = accent_generator.describe_accents(item["targetText"])
    if explanation is None:
        raise ValueError(f'"{item["targetText"]}" não tem nenhum acento/cedilha -- não serve pro exercício')

    word_audio = None
    try:
        word_audio = tts.synthesize(item["targetText"])
    except Exception as exc:
        print(f'  [aviso] TTS falhou pra palavra: {exc}', file=sys.stderr)

    return {
        "id": f"accent-auto-{idx:03d}",
        "type": "accent",
        "level": level,
        "targetText": item["targetText"],
        "audioFile": word_audio,
        "explanation": explanation,
        "status": "needs_review",
    }


def run_accent(level, count, out_path):
    accepted, rejected = [], []
    idx = 0
    remaining = count
    batch_num = 0
    used_words = []

    while remaining > 0:
        batch_num += 1
        this_batch = min(BATCH_SIZE, remaining)
        print(f'[lote {batch_num}] selecionando {this_batch} palavra(s) nível {level}...')
        try:
            items = accent_generator.generate_batch(level, this_batch, avoid_words=used_words)
        except Exception as exc:
            rejected.append({"item": f"lote {batch_num}", "reason": f"falha na geração do lote: {exc}"})
            print(f'  -> lote falhou: {exc}')
            remaining -= this_batch
            continue

        for item in items:
            idx += 1
            used_words.append(item["targetText"])
            try:
                draft = build_accent_draft(idx, item, level)
            except Exception as exc:
                rejected.append({"item": item.get("targetText", "?"), "reason": f"falha ao montar desafio: {exc}"})
                continue
            accepted.append(draft)
            audio_status = "com áudio" if draft["audioFile"] else "ÁUDIO FALTANDO"
            print(f'  -> "{draft["targetText"]}" ({audio_status})')

        remaining -= this_batch

    _finish(accepted, rejected, out_path, count)


# ---------- Comum ----------

def _finish(accepted, rejected, out_path, requested_count):
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"accepted": accepted, "rejected": rejected}, f, ensure_ascii=False, indent=2)

    summary = cost_log.summarize()
    print("\n--- Resumo ---")
    print(f"Pedidos: {requested_count}")
    print(f"Gerados (needs_review): {len(accepted)}")
    print(f"Falharam: {len(rejected)}")
    for r in rejected:
        print(f'  - "{r["item"]}": {r["reason"]}')
    print(f"Chamadas ao Gemini: {summary['calls']} (cache hits: {summary['cacheHits']})")
    print(f"Custo aproximado (estimativa, não é fatura oficial): ${summary['approxCostUsd']}")
    print(f"\nCandidatos salvos em: {out_path}")
    print("Nenhum desafio foi publicado — todos entram como needs_review, pra revisão humana no painel admin.")


def main():
    parser = argparse.ArgumentParser(description="Curadoria automática de Desafios")
    sub = parser.add_subparsers(dest="category", required=True)

    p_expr = sub.add_parser("expression", help="Categoria Expressões")
    p_expr.add_argument("expressions", nargs="+", help="Expressões idiomáticas a gerar (uma por argumento)")
    p_expr.add_argument("--level", default="B1", help="Nível CEFR (padrão: B1)")
    p_expr.add_argument("--out", default="challenges_pipeline_output.json", help="Arquivo JSON de saída")

    p_lt = sub.add_parser("listen_translate", help="Categoria Ouça e traduza")
    p_lt.add_argument("--level", default="B1", help="Nível CEFR (padrão: B1)")
    p_lt.add_argument("--count", type=int, required=True, help="Quantos desafios gerar")
    p_lt.add_argument("--out", default="challenges_pipeline_output.json", help="Arquivo JSON de saída")

    p_accent = sub.add_parser("accent", help="Categoria Acentuação")
    p_accent.add_argument("--level", default="B1", help="Nível CEFR (padrão: B1)")
    p_accent.add_argument("--count", type=int, required=True, help="Quantos desafios gerar")
    p_accent.add_argument("--out", default="challenges_pipeline_output.json", help="Arquivo JSON de saída")

    args = parser.parse_args()
    if args.category == "expression":
        run_expression(args.expressions, args.level, args.out)
    elif args.category == "listen_translate":
        run_listen_translate(args.level, args.count, args.out)
    elif args.category == "accent":
        run_accent(args.level, args.count, args.out)


if __name__ == "__main__":
    main()
