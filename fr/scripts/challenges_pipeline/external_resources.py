"""Recursos externos opcionais ("Pour aller plus loin" / "Voir en contexte")
-- uma camada OPCIONAL de aprofundamento, mostrada só depois que o aluno já
respondeu o desafio. Nunca necessária pra completar a atividade.

Hierarquia de fontes (não assume YouTube como melhor fonte):
  1. Dicionários/artigos linguísticos confiáveis (Le Robert, Larousse,
     CNRTL, La Langue Française, Linternaute, Wiktionnaire...) -- achados
     via busca real na web (Gemini com a ferramenta googleSearch do
     Vertex AI, que devolve citações reais em groundingMetadata).
  2. Vídeo do YouTube, só quando realmente tem qualidade (rejeita
     conteúdo automatizado: voz sintética lendo uma definição, slideshow,
     sem apresentação humana real).
  3. YouGlish, pra ouvir a expressão em múltiplos contextos reais -- URL
     construída deterministicamente (sem precisar buscar), papel
     diferente dos outros dois ("Voir en contexte", não "En savoir plus").

Nunca copia conteúdo de terceiros pra dentro da plataforma -- só guarda
URL, título, nome da fonte e uma descrição curta gerada internamente."""

import html
import time
import urllib.parse

import requests

from . import config, cost_log, vertex_client

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

RANK_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "sources": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "chunkIndex": {"type": "NUMBER"},
                    "sourceName": {"type": "STRING"},
                    "resourceType": {"type": "STRING", "enum": ["dictionary", "article", "other"]},
                    "isGoodFit": {"type": "BOOLEAN"},
                    "quality": {"type": "NUMBER"},
                    "pedagogicalValue": {"type": "NUMBER"},
                    "description": {"type": "STRING"},
                },
                "required": ["chunkIndex", "sourceName", "resourceType", "isGoodFit", "quality", "pedagogicalValue", "description"],
            },
        },
    },
    "required": ["sources"],
}

RANK_PROMPT_TEMPLATE = (
    "Aqui está uma resposta com fontes pesquisadas na web sobre a expressão "
    "idiomática francesa \"{expression}\", e a lista numerada das fontes "
    "citadas (chunkIndex -> domínio).\n\n"
    "Resposta pesquisada:\n{answer_text}\n\n"
    "Fontes citadas:\n{chunks_list}\n\n"
    "Pra cada fonte citada, avalie como recurso de aprofundamento pra um "
    "aluno de francês (mostrado DEPOIS de ele já ter respondido um "
    "exercício sobre a expressão): resourceType (dictionary = dicionário "
    "tipo Le Robert/Larousse/CNRTL/Wiktionnaire; article = artigo "
    "linguístico/cultural tipo La Langue Française/Linternaute/Expressio; "
    "other = qualquer outra coisa, inclusive se não for relevante). "
    "isGoodFit=true só se a fonte realmente explica bem a expressão "
    "(significado, origem, exemplos) com autoridade e clareza -- nunca "
    "marque true só porque o domínio apareceu na busca. quality e "
    "pedagogicalValue de 0 a 1. description: 1 frase curta em português "
    "dizendo o que o aluno vai encontrar lá (ex: 'Definição, origem e "
    "exemplos de uso no Le Robert')."
)

YOUTUBE_JUDGE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "results": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "index": {"type": "NUMBER"},
                    "isGoodFit": {"type": "BOOLEAN"},
                    "automatedContent": {"type": "BOOLEAN"},
                    "quality": {"type": "NUMBER"},
                    "pedagogicalValue": {"type": "NUMBER"},
                    "description": {"type": "STRING"},
                },
                "required": ["index", "isGoodFit", "automatedContent", "quality", "pedagogicalValue", "description"],
            },
        },
    },
    "required": ["results"],
}

YOUTUBE_JUDGE_PROMPT_TEMPLATE = (
    "Estes são resultados de busca no YouTube para conteúdo de "
    "aprofundamento sobre a expressão idiomática francesa \"{expression}\" "
    "(mostrado só depois que o aluno já respondeu um exercício sobre ela). "
    "Avalie CADA resultado por título/canal/descrição:\n\n"
    "REJEITAR (isGoodFit=false, automatedContent=true) qualquer resultado "
    "que pareça: voz sintética/TTS simplesmente lendo uma definição na "
    "tela, slideshow estático, conteúdo produzido em massa sem "
    "apresentação humana real, título sensacionalista, ou conteúdo "
    "substituível por um parágrafo de dicionário. NÃO rejeite só porque o "
    "título contém a expressão -- rejeite pelo que o conteúdo realmente "
    "parece ser.\n"
    "APROVAR (isGoodFit=true) só vídeos que pareçam ter valor real: "
    "professor/especialista reconhecido, canal educacional de qualidade, "
    "entrevista, programa, explicação bem produzida com apresentação "
    "humana genuína.\n\n"
    "Resultados:\n{results_list}"
)


def _search_grounded_dictionary_sources(expression):
    """Busca fontes reais na web (dicionários/artigos) via Gemini com a
    ferramenta de busca do Google (Vertex AI) -- não é geração controlada
    (JSON), então isso fica numa chamada separada da classificação."""
    url = (
        f"https://{config.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/"
        f"{config.GCP_PROJECT_ID}/locations/{config.GCP_LOCATION}/publishers/google/"
        f"models/{config.MODEL_PRIMARY}:generateContent"
    )
    prompt = (
        f'Trouve les meilleures pages de dictionnaire ou d\'article linguistique '
        f'en français expliquant l\'expression idiomatique "{expression}" '
        f'(signification, origine, exemples). Priorise des sources comme Le '
        f'Robert, Larousse, CNRTL, La Langue Française, Linternaute, '
        f'Wiktionnaire, Expressio.'
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "tools": [{"googleSearch": {}}],
    }
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {vertex_client.access_token()}", "Content-Type": "application/json"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return "", []
    content = candidates[0]
    text = content["content"]["parts"][0]["text"]
    chunks = content.get("groundingMetadata", {}).get("groundingChunks", [])
    cost_log.log_call(config.MODEL_PRIMARY, "external-resource-search", expression, data.get("usageMetadata") or {}, cache_hit=False)
    return text, chunks


def _check_link(url, timeout=8):
    """Confere se um link ainda funciona -- só pra URLs no domínio do
    próprio redirecionador de citações do Google (nunca acessa o site de
    terceiros diretamente). Se a checagem falhar por qualquer motivo
    (rede, timeout), devolve None em vez de assumir que está quebrado."""
    try:
        resp = requests.head(url, timeout=timeout, allow_redirects=True)
        if resp.status_code >= 400:
            resp = requests.get(url, timeout=timeout, allow_redirects=True, stream=True)
        return resp.status_code < 400
    except Exception:
        return None


def _find_dictionary_and_article_sources(expression):
    try:
        answer_text, chunks = _search_grounded_dictionary_sources(expression)
    except Exception:
        return []
    if not chunks:
        return []

    chunks_list = "\n".join(
        f'{i}. {c.get("web", {}).get("title", "?")}' for i, c in enumerate(chunks)
    )
    prompt = RANK_PROMPT_TEMPLATE.format(expression=expression, answer_text=answer_text, chunks_list=chunks_list)
    try:
        ranked = vertex_client.generate_json(
            prompt, RANK_SCHEMA, log_label="external-resource-rank", log_detail=expression
        )
    except Exception:
        return []

    good = [
        r for r in ranked.get("sources", [])
        if r.get("isGoodFit") and r.get("resourceType") in ("dictionary", "article") and r.get("quality", 0) >= 0.6
    ]
    good.sort(key=lambda r: (r.get("quality", 0) + r.get("pedagogicalValue", 0)), reverse=True)

    resources = []
    for r in good:
        idx = int(r["chunkIndex"])
        if not (0 <= idx < len(chunks)):
            continue
        web = chunks[idx].get("web", {})
        redirect_url = web.get("uri")
        if not redirect_url:
            continue
        checked = _check_link(redirect_url)
        resources.append({
            "type": r["resourceType"],
            "url": redirect_url,
            "title": web.get("title", r["sourceName"]),
            "sourceName": r["sourceName"],
            "description": r["description"],
            "quality": "high" if r.get("quality", 0) >= 0.85 else "medium",
            "buttonLabel": "En savoir plus",
            "approved": True,
            "lastChecked": time.strftime("%Y-%m-%d") if checked else None,
        })
    return resources


def _find_youtube_source(expression):
    if not config.YOUTUBE_API_KEY:
        return None
    try:
        resp = requests.get(
            SEARCH_URL,
            params={
                "key": config.YOUTUBE_API_KEY,
                "q": f'"{expression}" expression française signification',
                "part": "snippet",
                "type": "video",
                "relevanceLanguage": "fr",
                "maxResults": config.EXTERNAL_RESOURCES_MAX_RESULTS,
            },
            timeout=30,
        )
        resp.raise_for_status()
        candidates = []
        for it in resp.json().get("items", []):
            video_id = it.get("id", {}).get("videoId")
            if not video_id:
                continue
            candidates.append({
                "videoId": video_id,
                "title": html.unescape(it["snippet"]["title"]),
                "channelTitle": html.unescape(it["snippet"]["channelTitle"]),
                "description": html.unescape(it["snippet"].get("description", "")),
            })
        if not candidates:
            return None

        results_list = "\n".join(
            f'{i}. "{c["title"]}" (canal: {c["channelTitle"]}) -- {c["description"][:150]}'
            for i, c in enumerate(candidates)
        )
        prompt = YOUTUBE_JUDGE_PROMPT_TEMPLATE.format(expression=expression, results_list=results_list)
        judged = vertex_client.generate_json(
            prompt, YOUTUBE_JUDGE_SCHEMA, log_label="external-resource-youtube-judge", log_detail=expression
        )

        good = [
            r for r in judged.get("results", [])
            if r.get("isGoodFit") and not r.get("automatedContent") and r.get("quality", 0) >= 0.6
        ]
        if not good:
            return None
        good.sort(key=lambda r: (r.get("quality", 0) + r.get("pedagogicalValue", 0)), reverse=True)
        best = good[0]
        idx = int(best["index"])
        if not (0 <= idx < len(candidates)):
            return None
        c = candidates[idx]
        return {
            "type": "youtube",
            "url": f"https://www.youtube.com/watch?v={c['videoId']}",
            "title": c["title"],
            "sourceName": c["channelTitle"],
            "description": best["description"],
            "quality": "high" if best.get("quality", 0) >= 0.85 else "medium",
            "buttonLabel": "En savoir plus",
            "approved": True,
            "lastChecked": time.strftime("%Y-%m-%d"),
        }
    except Exception:
        return None


def _youglish_resource(expression):
    """URL construída deterministicamente (sem busca) -- formato padrão do
    YouGlish pra uma expressão em francês. Papel diferente dos outros
    recursos: ouvir a expressão em múltiplos contextos reais."""
    encoded = urllib.parse.quote(expression)
    return {
        "type": "youglish",
        "url": f"https://youglish.com/pronounce/{encoded}/french",
        "title": "YouGlish",
        "sourceName": "YouGlish",
        "description": "Ouça a expressão sendo usada por falantes reais em vários vídeos.",
        "quality": "high",
        "buttonLabel": "Voir en contexte",
        "approved": True,
        "lastChecked": None,
    }


def find_for_expression(expression):
    """Monta a lista de recursos externos pra uma expressão, seguindo a
    hierarquia dicionário/artigo > vídeo de qualidade > YouGlish. Nunca
    levanta exceção pro chamador -- o desafio principal nunca depende
    disso. Prioriza diversidade de função sobre redundância (não devolve
    3 dicionários iguais)."""
    resources = []

    dict_sources = _find_dictionary_and_article_sources(expression)
    if dict_sources:
        resources.append(dict_sources[0])
    else:
        yt = _find_youtube_source(expression)
        if yt:
            resources.append(yt)

    if len(resources) < config.EXTERNAL_RESOURCES_KEEP:
        resources.append(_youglish_resource(expression))

    return resources[: config.EXTERNAL_RESOURCES_KEEP]
