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

# Duas escalas independentes, e é isso que precisa progredir com o nível --
# não só uma delas. Vocabulário (frequência/familiaridade da palavra) e
# complexidade ortográfica (quantos acentos, quão previsíveis) não andam
# juntos por natureza: dá pra ter uma palavra rara com um acento trivial, ou
# uma palavra do dia a dia com uma combinação de acentos difícil. Um B2 só
# com "palavra mais sofisticada" pode sair mais fácil de acentuar que um A2,
# o que quebra a progressão que o aluno espera. Por isso o nível aqui fixa
# as duas coisas: que tipo de vocabulário E que tipo de desafio ortográfico.
LEVEL_GUIDANCE = {
    "A1": (
        "Vocabulário: palavras muito frequentes do dia a dia (saudações, números, objetos "
        "comuns, verbos básicos).\n"
        "Complexidade ortográfica: exatamente UM acento, de um tipo isolado e óbvio (agudo ou "
        "grave), numa posição clara -- o tipo de acento mais fácil de perceber e lembrar."
    ),
    "A2": (
        "Vocabulário: cotidiano um pouco mais amplo (rotina, família, comida, lugares).\n"
        "Complexidade ortográfica: um acento só, mas de um tipo que brasileiros tendem a "
        "esquecer por não ter equivalente intuitivo em português (circunflexo, ex: 'fenêtre', "
        "'hôtel') -- ou o mesmo acento agudo/grave repetido mais de uma vez na mesma palavra."
    ),
    "B1": (
        "Vocabulário: mais variado, incluindo palavras menos óbvias mas ainda de uso comum.\n"
        "Complexidade ortográfica: combinação de DOIS tipos diferentes de acento na mesma "
        "palavra (ex: agudo + circunflexo), ou um caso onde o acento muda o sentido da palavra "
        "e por isso é fácil de confundir (ex: 'a' vs 'à', 'ou' vs 'où')."
    ),
    "B2": (
        "Vocabulário: mais sofisticado/formal, mas SEM abrir mão da complexidade ortográfica "
        "abaixo -- uma palavra formal com um acento trivial não serve pra B2.\n"
        "Complexidade ortográfica: combinações raras e pouco intuitivas -- trema junto de outro "
        "acento, cedilha combinada com acento, ou múltiplos acentos de tipos diferentes na "
        "mesma palavra (3+ sinais, ou 2 tipos distintos + posição não óbvia)."
    ),
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
    "Este nível define DUAS coisas obrigatórias, e a escolha só serve se "
    "atender as duas ao mesmo tempo -- não vale compensar uma exigência "
    "com a outra (ex: uma palavra formal/rara não substitui o requisito de "
    "complexidade ortográfica do nível, e vice-versa):\n\n"
    "{level_guidance}\n\n"
    "Critérios gerais, além do que o nível já define acima:\n"
    "- o(s) acento(s) precisa(m) ser algo que brasileiros de fato "
    "esquecem/confundem, não um detalhe irrelevante;\n"
    "- prefira quando há diferença notável com a ortografia em português "
    "(palavras parecidas mas sem o mesmo acento);\n"
    "- a palavra é pedagogicamente relevante (nunca escolha uma palavra "
    "rara só pra 'ter mais um acento diferente' -- a complexidade "
    "ortográfica pedida no nível já cuida disso).\n"
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
