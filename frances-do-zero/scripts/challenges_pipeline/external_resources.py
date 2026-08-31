"""Recursos externos opcionais ("Pour aller plus loin") -- ao contrário do
desafio principal (que agora nunca depende de vídeo), aqui é DESEJÁVEL achar
conteúdo que EXPLIQUE a expressão (origem, história, mais exemplos, contexto
cultural), pra quem quiser se aprofundar depois de já ter respondido.
Busca só metadados (YouTube Data API v3) e usa uma chamada de texto barata
ao Gemini pra avaliar qualidade -- nunca baixa/analisa o vídeo em si, então
não depende do Vertex AI de vídeo que o fluxo principal não usa mais."""

import html

import requests

from . import config, vertex_client

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

JUDGE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "results": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "index": {"type": "NUMBER"},
                    "isGoodFit": {"type": "BOOLEAN"},
                    "reason": {"type": "STRING"},
                },
                "required": ["index", "isGoodFit", "reason"],
            },
        },
    },
    "required": ["results"],
}

JUDGE_PROMPT_TEMPLATE = (
    "Estes são resultados de busca no YouTube para conteúdo de "
    "aprofundamento sobre a expressão idiomática francesa \"{expression}\" "
    "(um aluno já respondeu um exercício sobre essa expressão e quer saber "
    "mais -- origem, explicação detalhada, mais exemplos, contexto "
    "cultural). Avalie cada resultado (por título/canal) quanto a "
    "relevância, clareza esperada, confiabilidade da fonte e qualidade "
    "pedagógica. Marque isGoodFit=true só pros que parecem realmente úteis "
    "e relevantes; nunca marque true só porque o título contém a "
    "expressão.\n\n"
    "Resultados:\n{results_list}"
)


def _search_youtube(expression, max_results):
    if not config.YOUTUBE_API_KEY:
        return []
    resp = requests.get(
        SEARCH_URL,
        params={
            "key": config.YOUTUBE_API_KEY,
            "q": f'"{expression}" expression française signification',
            "part": "snippet",
            "type": "video",
            "relevanceLanguage": "fr",
            "maxResults": max_results,
        },
        timeout=30,
    )
    resp.raise_for_status()
    items = []
    for it in resp.json().get("items", []):
        video_id = it.get("id", {}).get("videoId")
        if not video_id:
            continue
        # A YouTube Data API às vezes devolve título/canal com entidades HTML
        # já escapadas (ex: &quot; no lugar de "), sobra de como o YouTube
        # armazena esses campos -- decodifica aqui pra não escapar de novo
        # (double-encoding) na hora de renderizar no site.
        items.append({
            "videoId": video_id,
            "title": html.unescape(it["snippet"]["title"]),
            "channelTitle": html.unescape(it["snippet"]["channelTitle"]),
        })
    return items


def find_for_expression(expression):
    """Busca e avalia recursos externos pra uma expressão. Nunca levanta
    exceção pro chamador -- se a busca ou o julgamento falharem, devolve
    lista vazia (o desafio principal nunca depende disso)."""
    try:
        candidates = _search_youtube(expression, config.EXTERNAL_RESOURCES_MAX_RESULTS)
        if not candidates:
            return []

        results_list = "\n".join(
            f'{i}. "{c["title"]}" (canal: {c["channelTitle"]})' for i, c in enumerate(candidates)
        )
        prompt = JUDGE_PROMPT_TEMPLATE.format(expression=expression, results_list=results_list)
        judged = vertex_client.generate_json(
            prompt, JUDGE_SCHEMA, log_label="external-resource-judge", log_detail=expression
        )

        good = [r for r in judged.get("results", []) if r.get("isGoodFit")]
        good.sort(key=lambda r: r.get("index", 0))

        resources = []
        for r in good[: config.EXTERNAL_RESOURCES_KEEP]:
            idx = int(r["index"])
            if 0 <= idx < len(candidates):
                c = candidates[idx]
                resources.append({
                    "type": "youtube",
                    "url": f"https://www.youtube.com/watch?v={c['videoId']}",
                    "title": c["title"],
                })
        return resources
    except Exception:
        return []
