"""Pipeline de curadoria automática de Desafios -> Expressões.

Uso:
    python3 -m challenges_pipeline.generate_challenges \
        --level B1 "avoir la gueule de bois" "casser les pieds" "poser un lapin"

Pra cada expressão: gera um exemplo em contexto + segundo exemplo (uma
chamada de texto ao Gemini/Vertex AI, controlada por nível CEFR), sintetiza
o áudio da EXPRESSÃO-ALVO (não do exemplo inteiro) e do segundo exemplo
(Google Cloud TTS), e busca recursos externos de aprofundamento
(dicionário/artigo > vídeo de qualidade > YouGlish) pra seção "Pour aller
plus loin" -- que nunca é necessária pra completar o desafio.

O desafio NÃO depende mais de encontrar/analisar um vídeo do YouTube pra
funcionar -- essa foi uma decisão de produto deliberada (ver discussão da
"Atualização — Desafios → Expressões"): o vídeo virou só um link opcional de
aprofundamento, o conteúdo pedagógico principal é gerado e controlado pelo
próprio site.

Tudo sai com status "needs_review" pra revisão humana no painel admin --
nunca publica sozinho.
"""

import argparse
import json
import sys

from . import content_generator, cost_log, external_resources, tts


def build_challenge_draft(idx, expression, level):
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


def run(expressions, level, out_path):
    accepted = []
    rejected = []

    for idx, expression in enumerate(expressions, start=1):
        print(f'[{idx}/{len(expressions)}] "{expression}"...')
        try:
            draft = build_challenge_draft(idx, expression, level)
        except Exception as exc:
            rejected.append({"expression": expression, "reason": f"falha na geração: {exc}"})
            print(f'  -> falhou: {exc}')
            continue

        # correctAnswer precisa bater exatamente com uma das options, senão
        # o front não consegue destacar/validar a resposta certa.
        if draft["correctAnswer"] not in draft["options"]:
            rejected.append({"expression": expression, "reason": "correctAnswer não bate com nenhuma option gerada"})
            print("  -> descartado: correctAnswer não bate com as alternativas geradas")
            continue

        accepted.append(draft)
        audio_status = "com áudio" if draft["expressionAudioFile"] and draft["secondExample"]["audioFile"] else "ÁUDIO FALTANDO"
        resources_status = ", ".join(r["type"] for r in draft["externalResources"]) or "nenhum recurso externo"
        print(f'  -> gerado ({audio_status}, recursos: {resources_status})')

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"accepted": accepted, "rejected": rejected}, f, ensure_ascii=False, indent=2)

    summary = cost_log.summarize()
    print("\n--- Resumo ---")
    print(f"Pedidos: {len(expressions)}")
    print(f"Gerados (needs_review): {len(accepted)}")
    print(f"Falharam: {len(rejected)}")
    for r in rejected:
        print(f'  - "{r["expression"]}": {r["reason"]}')
    print(f"Chamadas ao Gemini: {summary['calls']} (cache hits: {summary['cacheHits']})")
    print(f"Custo aproximado (estimativa, não é fatura oficial): ${summary['approxCostUsd']}")
    print(f"\nCandidatos salvos em: {out_path}")
    print("Nenhum desafio foi publicado — todos entram como needs_review, pra revisão humana no painel admin.")


def main():
    parser = argparse.ArgumentParser(description="Curadoria automática de Desafios -> Expressões")
    parser.add_argument("expressions", nargs="+", help="Expressões idiomáticas a gerar (uma por argumento)")
    parser.add_argument("--level", default="B1", help="Nível CEFR (padrão: B1)")
    parser.add_argument("--out", default="challenges_pipeline_output.json", help="Arquivo JSON de saída")
    args = parser.parse_args()
    run(args.expressions, args.level, args.out)


if __name__ == "__main__":
    main()
