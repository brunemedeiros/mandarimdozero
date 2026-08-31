"""Pipeline de curadoria automática de Desafios -> Expressões.

Uso:
    python3 -m challenges_pipeline.generate_challenges \
        --level B1 "avoir la gueule de bois" "casser les pieds" "poser un lapin"

Pra cada expressão: busca vídeos candidatos (YouTube Data API v3, só
metadados), analisa janelas curtas de cada um via Gemini/Vertex AI até achar
uma ocorrência com confiança suficiente, e — só então — gera o conteúdo
pedagógico (pergunta, alternativas, explicação, 2º exemplo, microatividade)
com uma segunda chamada de texto (barata). O resultado sai como candidatos
com status "needs_review" num JSON, pra revisão humana — nunca publica
sozinho.

Nunca inventa timestamp/transcrição/ocorrência: se uma expressão não for
encontrada com confiança suficiente em nenhum candidato, ela entra na lista
de "não atingiu os critérios" em vez de virar um desafio forçado.
"""

import argparse
import json
import sys

from . import config, cost_log
from .gemini_vertex_provider import GeminiVertexAIProvider
from . import pedagogical_generator
from .youtube_search import search_candidates, clip_windows


def find_best_occurrence(provider, expression):
    """Busca candidatos e analisa janelas até achar uma ocorrência aceitável.
    Devolve (ClipAnalysis com expression_found=True, video_id) ou (None, None)."""
    try:
        candidates = search_candidates(f'{expression} expression française')
    except Exception as exc:
        print(f'  [erro] busca no YouTube falhou para "{expression}": {exc}', file=sys.stderr)
        return None, None

    if not candidates:
        print(f'  nenhum vídeo candidato encontrado para "{expression}"')
        return None, None

    for candidate in candidates:
        windows = clip_windows(candidate.duration_seconds)
        for start, end in windows:
            try:
                analysis = provider.analyze_clip(candidate.video_id, start, end, expression)
            except Exception as exc:
                print(f'  [erro] análise falhou ({candidate.video_id} {start}-{end}s): {exc}', file=sys.stderr)
                continue
            if analysis.expression_found and analysis.confidence >= config.MIN_ACCEPTABLE_CONFIDENCE:
                return analysis, candidate.video_id
    return None, None


def build_challenge_draft(idx, expression, level, analysis, video_id, access_token_fn):
    try:
        content, _usage = pedagogical_generator.generate(
            access_token_fn, expression, analysis.spoken_occurrence, analysis.transcript, level
        )
    except Exception as exc:
        print(f'  [erro] geração pedagógica falhou para "{expression}": {exc}', file=sys.stderr)
        return None

    return {
        "id": f"expr-auto-{idx:03d}",
        "type": "expression",
        "canonicalExpression": expression,
        "level": level,
        "meaning": {"fr": content["meaningFr"], "pt": content["meaningPt"]},
        "video": {
            "youtubeId": video_id,
            "startTime": analysis.timestamp_start,
            "endTime": analysis.timestamp_end,
            "spokenOccurrence": analysis.spoken_occurrence,
            "transcript": analysis.transcript,
            "confidence": round(analysis.confidence, 2),
            "audioClarity": analysis.audio_clarity,
            "contextQuality": analysis.context_quality,
            "notes": analysis.notes,
        },
        "question": {"fr": content["questionFr"]},
        "choices": content["choices"],
        "explanation": content["explanation"],
        "secondExample": {"text": content["secondExampleText"], "audioFile": None},
        "microActivity": {
            "prompt": content["microActivityPrompt"],
            "answer": content["microActivityAnswer"],
        },
        "status": "needs_review",
    }


def run(expressions, level, out_path):
    provider = GeminiVertexAIProvider()
    accepted = []
    rejected = []

    for idx, expression in enumerate(expressions, start=1):
        print(f'[{idx}/{len(expressions)}] "{expression}"...')
        analysis, video_id = find_best_occurrence(provider, expression)
        if analysis is None:
            rejected.append({"expression": expression, "reason": "nenhuma ocorrência com confiança suficiente"})
            print("  -> não atingiu os critérios")
            continue

        draft = build_challenge_draft(idx, expression, level, analysis, video_id, provider._access_token)
        if draft is None:
            rejected.append({"expression": expression, "reason": "falha ao gerar conteúdo pedagógico"})
            continue

        accepted.append(draft)
        print(f'  -> encontrado em {video_id} ({analysis.timestamp_start}s-{analysis.timestamp_end}s, '
              f'confiança {analysis.confidence:.2f})')

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"accepted": accepted, "rejected": rejected}, f, ensure_ascii=False, indent=2)

    summary = cost_log.summarize()
    print("\n--- Resumo ---")
    print(f"Pedidos: {len(expressions)}")
    print(f"Gerados (needs_review): {len(accepted)}")
    print(f"Não atingiram os critérios: {len(rejected)}")
    for r in rejected:
        print(f'  - "{r["expression"]}": {r["reason"]}')
    print(f"Chamadas ao Gemini: {summary['calls']} (cache hits: {summary['cacheHits']})")
    print(f"Custo aproximado (estimativa, não é fatura oficial): ${summary['approxCostUsd']}")
    print(f"\nCandidatos salvos em: {out_path}")
    print("Nenhum desafio foi publicado — todos entram como needs_review, pra revisão humana no painel admin.")


def main():
    parser = argparse.ArgumentParser(description="Curadoria automática de Desafios -> Expressões")
    parser.add_argument("expressions", nargs="+", help="Expressões idiomáticas a buscar (uma por argumento)")
    parser.add_argument("--level", default="B1", help="Nível CEFR (padrão: B1)")
    parser.add_argument("--out", default="challenges_pipeline_output.json", help="Arquivo JSON de saída")
    args = parser.parse_args()
    run(args.expressions, args.level, args.out)


if __name__ == "__main__":
    main()
