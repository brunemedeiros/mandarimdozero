import json
import os
import time
from . import config


def log_call(model, video_id, expression, usage, cache_hit=False):
    """Registra uma chamada ao Gemini pra observabilidade de custo.
    Nunca bloqueia o pipeline se o log falhar — é só telemetria local."""
    prices = config.APPROX_PRICE_PER_1M_TOKENS.get(model, {})
    input_tokens = usage.get("promptTokenCount", 0) if usage else 0
    output_tokens = usage.get("candidatesTokenCount", 0) if usage else 0
    approx_cost_usd = None
    if prices and not cache_hit:
        approx_cost_usd = round(
            (input_tokens / 1_000_000) * prices.get("input", 0)
            + (output_tokens / 1_000_000) * prices.get("output", 0),
            6,
        )

    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": model,
        "videoId": video_id,
        "expression": expression,
        "cacheHit": cache_hit,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "approxCostUsd": approx_cost_usd,
    }
    try:
        os.makedirs(os.path.dirname(config.COST_LOG_PATH), exist_ok=True)
        with open(config.COST_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        pass
    return entry


def summarize():
    """Le o log de custo e devolve um resumo simples pra imprimir no console."""
    if not os.path.exists(config.COST_LOG_PATH):
        return {"calls": 0, "cacheHits": 0, "approxCostUsd": 0.0}
    calls = 0
    cache_hits = 0
    total_cost = 0.0
    with open(config.COST_LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            calls += 1
            if entry.get("cacheHit"):
                cache_hits += 1
            total_cost += entry.get("approxCostUsd") or 0.0
    return {"calls": calls, "cacheHits": cache_hits, "approxCostUsd": round(total_cost, 4)}
