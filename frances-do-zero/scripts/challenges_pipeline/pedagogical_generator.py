"""Geração do conteúdo pedagógico (pergunta, alternativas, explicação, 2º
exemplo, microatividade) pra um desafio já confirmado por análise de vídeo.
É uma chamada de texto simples (sem vídeo, bem mais barata) — só roda depois
que o GeminiVertexAIProvider já confirmou que a expressão está no vídeo,
nunca antes."""

import json

import requests

from . import config

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "meaningFr": {"type": "STRING"},
        "meaningPt": {"type": "STRING"},
        "questionFr": {"type": "STRING"},
        "choices": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "text": {"type": "STRING"},
                    "correct": {"type": "BOOLEAN"},
                },
                "required": ["text", "correct"],
            },
        },
        "explanation": {"type": "STRING"},
        "secondExampleText": {"type": "STRING"},
        "microActivityPrompt": {"type": "STRING"},
        "microActivityAnswer": {"type": "STRING"},
    },
    "required": [
        "meaningFr", "meaningPt", "questionFr", "choices", "explanation",
        "secondExampleText", "microActivityPrompt", "microActivityAnswer",
    ],
}

PROMPT_TEMPLATE = (
    "Você é professora de francês (nível {level}) criando um desafio de "
    "vocabulário sobre a expressão idiomática \"{expression}\", que foi "
    "confirmada num vídeo real dizendo: \"{spoken_occurrence}\" "
    "(contexto transcrito: \"{transcript}\"). Gere, em francês (com "
    "tradução em português onde indicado):\n"
    "- meaningFr: o significado da expressão, em francês simples.\n"
    "- meaningPt: o significado em português.\n"
    "- questionFr: uma pergunta curta em francês tipo 'À votre avis, que "
    "signifie cette expression ?' pedindo pro aluno inferir o sentido.\n"
    "- choices: exatamente 4 alternativas em francês (uma correta, três "
    "distratoras plausíveis mas erradas), cada uma com text e correct.\n"
    "- explanation: 1-2 frases em francês explicando a expressão.\n"
    "- secondExampleText: uma frase NOVA em francês (diferente da ouvida no "
    "vídeo) usando a expressão de forma flexionada naturalmente.\n"
    "- microActivityPrompt: uma frase em francês com uma lacuna "
    "'__________' pro aluno completar usando a expressão.\n"
    "- microActivityAnswer: a resposta esperada da lacuna.\n"
    "Nunca copie a frase ouvida no vídeo para secondExampleText — tem que "
    "ser um exemplo novo."
)


def generate(access_token_fn, canonical_expression, spoken_occurrence, transcript, level):
    url = (
        f"https://{config.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/"
        f"{config.GCP_PROJECT_ID}/locations/{config.GCP_LOCATION}/publishers/google/"
        f"models/{config.MODEL_PRIMARY}:generateContent"
    )
    prompt = PROMPT_TEMPLATE.format(
        level=level,
        expression=canonical_expression,
        spoken_occurrence=spoken_occurrence or canonical_expression,
        transcript=transcript or "",
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": SCHEMA,
            "temperature": 0.4,
        },
    }
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {access_token_fn()}", "Content-Type": "application/json"},
        json=body,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text), data.get("usageMetadata") or {}
