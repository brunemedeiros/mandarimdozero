"""Gera desafios "Acentuação": palavra ou expressão curta em francês onde a
acentuação é relevante/tende a ser esquecida por brasileiros -> aluno ouve
e digita -> correção sensível a acentos. Seleção de palavras é automática
(o próprio Gemini escolhe, seguindo os critérios do prompt) -- nunca uma
lista fixa hardcoded, mas evita repetir palavras já usadas em lotes
anteriores (passadas via `avoid`).

IMPORTANTE: a explicação de QUAL acento está em QUAL letra nunca vem do
texto livre do Gemini -- testado na prática, o modelo confunde tipos de
acento (chama grave de circunflexo, inventa acento em letra que não tem
nenhum, chega a inventar "á" que não existe no francês). describe_accents()
calcula isso a partir dos caracteres reais da palavra, então é sempre
correto por construção."""

import unicodedata

from . import vertex_client

_ACCENT_NAMES_PT = {
    "́": "agudo",
    "̀": "grave",
    "̂": "circunflexo",
    "̈": "trema",
    "̧": "cedilha",
}


def describe_accents(text):
    """Descreve em português, de forma determinística (a partir dos
    caracteres reais de `text`), quais sinais diacríticos aparecem e em
    qual letra. Devolve None se a palavra não tiver nenhum -- usado pra
    descartar seleções ruins (palavra sem acento não serve pro exercício)."""
    decomposed = unicodedata.normalize("NFD", text)
    marks = []
    for i, ch in enumerate(decomposed):
        if ch in _ACCENT_NAMES_PT and i > 0:
            marks.append((decomposed[i - 1], _ACCENT_NAMES_PT[ch]))
    if not marks:
        return None
    parts = [f'"{base}" tem acento {name}' for base, name in marks]
    return ", ".join(parts) + "."

LEVEL_GUIDANCE = {
    "A1": "Palavras muito frequentes do dia a dia (saudações, números, objetos comuns, verbos básicos).",
    "A2": "Vocabulário cotidiano um pouco mais amplo (rotina, família, comida, lugares).",
    "B1": "Vocabulário mais variado, incluindo palavras menos óbvias mas ainda de uso comum.",
    "B2": "Palavras mais sofisticadas/formais, com maior chance de múltiplos acentos ou combinações menos intuitivas.",
}

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "targetText": {"type": "STRING"},
                },
                "required": ["targetText"],
            },
        },
    },
    "required": ["items"],
}

PROMPT_TEMPLATE = (
    "Selecione {count} palavras (ou expressões bem curtas, tipo 2 "
    "palavras, quando fizer sentido pedagógico) em francês pra um "
    "exercício de acentuação ortográfica, nível {level}, pra um aluno "
    "brasileiro.\n\n"
    "Nível {level}: {level_guidance}\n\n"
    "Priorize palavras onde:\n"
    "- o acento é frequentemente esquecido/confundido por brasileiros;\n"
    "- existe uma diferença notável entre a ortografia em português e "
    "francês (ex: palavras parecidas mas sem o mesmo acento);\n"
    "- há múltiplos acentos na mesma palavra;\n"
    "- o acento muda a aparência da palavra de forma perceptível;\n"
    "- a palavra é frequente e pedagogicamente relevante (nunca escolha "
    "uma palavra rara só pra 'ter mais um acento diferente').\n"
    "NÃO escolha palavras aleatórias só pra preencher quantidade -- cada "
    "escolha precisa ter uma razão pedagógica real (explique essa razão "
    "em explanation).\n\n"
    "Nunca repita nenhuma destas palavras já usadas em lotes anteriores: "
    "{avoid_list}\n\n"
    "Pra cada item, devolva só targetText: a palavra ou expressão curta, "
    "com a acentuação CORRETA (é a resposta de referência). A palavra "
    "PRECISA conter pelo menos um sinal diacrítico de verdade (acento "
    "agudo/grave/circunflexo/trema ou cedilha) -- nunca escolha uma "
    "palavra sem nenhum acento, isso não serve pro exercício."
)


def generate_batch(level, count, avoid_words=None):
    guidance = LEVEL_GUIDANCE.get(level, LEVEL_GUIDANCE["B1"])
    avoid_list = ", ".join(avoid_words) if avoid_words else "(nenhuma ainda)"
    prompt = PROMPT_TEMPLATE.format(count=count, level=level, level_guidance=guidance, avoid_list=avoid_list)
    result = vertex_client.generate_json(
        prompt, SCHEMA, log_label="accent-batch", log_detail=f"{level} x{count}", temperature=0.7
    )
    return result.get("items", [])
