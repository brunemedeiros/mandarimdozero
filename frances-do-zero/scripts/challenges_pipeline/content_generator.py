"""Gera o conteúdo pedagógico completo de um desafio de expressão: exemplo em
contexto, pergunta, 4 alternativas, explicação, segundo exemplo (flexionado)
e microatividade. Uma única chamada de texto ao Gemini (sem vídeo) -- o
sistema não depende mais de um vídeo do YouTube pra construir o desafio."""

from . import vertex_client

LEVEL_GUIDANCE = {
    "A1": (
        "Frases bem curtas (até ~10 palavras), presente do indicativo, "
        "vocabulário básico do dia a dia. Nada de conectores complexos ou "
        "tempos verbais compostos."
    ),
    "A2": (
        "Frases curtas e diretas, vocabulário controlado, passé composto "
        "simples permitido. Evitar subordinadas complexas."
    ),
    "B1": (
        "Frases naturais com alguma complexidade -- pode usar passé "
        "composto, imparfait, conectores comuns (parce que, alors, donc). "
        "Vocabulário do cotidiano, sem jargão."
    ),
    "B2": (
        "Frases mais sofisticadas: conectores variados (bien que, malgré, "
        "en revanche), tempos verbais variados (subjonctif quando natural), "
        "estruturas mais elaboradas, vocabulário contextual mais rico."
    ),
}

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "exampleText": {"type": "STRING"},
        "meaningFr": {"type": "STRING"},
        "meaningPt": {"type": "STRING"},
        "question": {"type": "STRING"},
        "options": {"type": "ARRAY", "items": {"type": "STRING"}},
        "correctAnswer": {"type": "STRING"},
        "explanation": {"type": "STRING"},
        "secondExampleText": {"type": "STRING"},
        "microActivityPrompt": {"type": "STRING"},
        "microActivityAnswer": {"type": "STRING"},
    },
    "required": [
        "exampleText", "meaningFr", "meaningPt", "question", "options",
        "correctAnswer", "explanation", "secondExampleText",
        "microActivityPrompt", "microActivityAnswer",
    ],
}

PROMPT_TEMPLATE = (
    "Você é professora de francês criando um desafio de vocabulário sobre a "
    "expressão idiomática \"{expression}\" pra um aluno brasileiro de nível "
    "{level}.\n\n"
    "Controle de dificuldade pro nível {level}: {level_guidance}\n\n"
    "Gere:\n"
    "- exampleText: uma frase natural em francês usando a expressão "
    "\"{expression}\" (pode flexionar/conjugar) num contexto que dê pistas "
    "pro significado, sem entregar a definição na própria frase (o aluno "
    "vai ouvir essa frase e tentar deduzir o sentido antes de ver as "
    "alternativas -- a frase não pode dizer 'isso significa...').\n"
    "- meaningFr: o significado da expressão, em francês simples.\n"
    "- meaningPt: o significado em português.\n"
    "- question: uma pergunta curta em francês tipo 'Que signifie cette "
    "expression ?' pedindo pro aluno inferir o sentido.\n"
    "- options: exatamente 4 alternativas em francês (uma correta, três "
    "distratoras plausíveis mas erradas -- nada obviamente absurdo, "
    "distratores derivados de erros de compreensão plausíveis).\n"
    "- correctAnswer: o texto EXATO de uma das 4 alternativas em options "
    "(a correta).\n"
    "- explanation: 1-2 frases curtas em francês explicando a expressão -- "
    "sem ser um texto longo.\n"
    "- secondExampleText: uma frase NOVA em francês (diferente de "
    "exampleText, contexto diferente) usando a expressão de forma "
    "flexionada/conjugada naturalmente -- variar pessoa, tempo verbal, "
    "número ou contexto em relação ao primeiro exemplo, nunca só trocar uma "
    "palavra.\n"
    "- microActivityPrompt: uma frase em francês com uma lacuna "
    "'__________' pro aluno completar usando a expressão (numa forma "
    "flexionada apropriada ao contexto da frase, não necessariamente igual "
    "à forma canônica).\n"
    "- microActivityAnswer: a resposta esperada da lacuna.\n\n"
    "Respeite o nível {level} em TODAS as frases geradas (exampleText, "
    "secondExampleText, microActivityPrompt), não só na dificuldade da "
    "própria expressão."
)


def generate(expression, level):
    guidance = LEVEL_GUIDANCE.get(level, LEVEL_GUIDANCE["B1"])
    prompt = PROMPT_TEMPLATE.format(expression=expression, level=level, level_guidance=guidance)
    return vertex_client.generate_json(prompt, SCHEMA, log_label="content", log_detail=expression)
