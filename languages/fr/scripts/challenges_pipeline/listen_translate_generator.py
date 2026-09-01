"""Gera desafios "Ouça e traduza": frase curta em francês (só áudio, nunca
mostrada por escrito antes da resposta) -> aluno traduz -> avaliação
aceita várias traduções válidas (não exige match literal). Uma única
chamada de texto ao Gemini gera um lote inteiro (mais barato e mantém
diversidade de tópico entre as frases do mesmo lote)."""

from . import vertex_client

LEVEL_GUIDANCE = {
    "A1": "Frases bem curtas (até ~8 palavras), presente do indicativo, vocabulário básico do dia a dia.",
    "A2": "Frases curtas e diretas, vocabulário controlado, passé composto simples permitido.",
    "B1": "Frases naturais com alguma complexidade -- passé composto, imparfait, conectores comuns.",
    "B2": "Frases mais sofisticadas: conectores variados (même si, malgré, en revanche), tempos verbais variados (subjonctif quando natural), estruturas mais elaboradas.",
}

HINT_GUIDANCE = {
    "A1": "Revele bastante: sujeito, artigos e palavras muito frequentes; esconda só 1-2 palavras-chave.",
    "A2": "Revele uma boa parte da estrutura, esconda os elementos mais relevantes pro sentido.",
    "B1": "Revele só uma pequena parte da frase.",
    "B2": "Dica mínima -- esconda a maior parte da frase, exigindo recuperação praticamente autônoma.",
}

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "sentenceFr": {"type": "STRING"},
                    "hintText": {"type": "STRING"},
                    "referenceTranslations": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "explanation": {"type": "STRING"},
                },
                "required": ["sentenceFr", "hintText", "referenceTranslations", "explanation"],
            },
        },
    },
    "required": ["items"],
}

PROMPT_TEMPLATE = (
    "Gere {count} frases em francês pra um exercício de compreensão "
    "auditiva + tradução, nível {level}, pra um aluno brasileiro.\n\n"
    "Controle de dificuldade pro nível {level}: {level_guidance}\n\n"
    "Cada frase deve ser curta, natural e realista -- linguagem cotidiana, "
    "situações reais, nunca uma frase artificial montada só pra testar uma "
    "palavra isolada. Varie os tópicos entre as {count} frases (trabalho, "
    "casa, planos, sentimentos, rotina, viagens etc.) -- não repita a "
    "mesma estrutura ou o mesmo assunto em todas.\n\n"
    "Pra cada frase, gere:\n"
    "- sentenceFr: a frase em francês.\n"
    "- hintText: a MESMA frase com parte das palavras substituída por "
    "'______' (uma lacuna por trecho oculto, pode haver mais de uma "
    "lacuna). {hint_guidance} Nunca revele a frase inteira -- a dica tem "
    "que deixar trabalho de recuperação real pro aluno.\n"
    "- referenceTranslations: de 3 a 5 traduções válidas em português "
    "brasileiro, cobrindo variações naturais de fraseado/sinônimos (não "
    "só uma tradução literal palavra por palavra) -- a primeira da lista "
    "deve ser a mais natural/idiomática.\n"
    "- explanation: 1 frase curta em português, só quando houver algo "
    "não-óbvio pra explicar (uma expressão, um falso cognato, um tempo "
    "verbal específico) -- caso contrário deixe uma string vazia."
)


def generate_batch(level, count):
    guidance = LEVEL_GUIDANCE.get(level, LEVEL_GUIDANCE["B1"])
    hint_guidance = HINT_GUIDANCE.get(level, HINT_GUIDANCE["B1"])
    prompt = PROMPT_TEMPLATE.format(count=count, level=level, level_guidance=guidance, hint_guidance=hint_guidance)
    result = vertex_client.generate_json(
        prompt, SCHEMA, log_label="listen-translate-batch", log_detail=f"{level} x{count}", temperature=0.6
    )
    return result.get("items", [])
