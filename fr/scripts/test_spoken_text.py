"""Testes da camada de texto falado (sem rede, sem chave de API).

Rodar:  python3 fr/scripts/test_spoken_text.py
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from challenges_pipeline import spoken_text as st  # noqa: E402

FAILS = []
COUNT = 0


def check(name, cond):
    global COUNT
    COUNT += 1
    if not cond:
        FAILS.append(name)
        print("FALHOU:", name)


def md5(s):
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:12]


# --- regras aprovadas -------------------------------------------------------
check("slash -> vírgula", st.to_spoken_text("un / une", "fr") == "un, une")
check("slash com acentos", st.to_spoken_text("brésilien / brésilienne", "fr") == "brésilien, brésilienne")
check("parêntese lido, pausa curta (reticências)", st.to_spoken_text("un kilo (de)", "fr") == "un kilo de…")
check("parêntese no fim de outra expressão", st.to_spoken_text("une tranche (de)", "fr") == "une tranche de…")
check("bouteille: override da autora mantém o parêntese", st.to_spoken_text("une bouteille (de)", "fr") == "une bouteille (de)")
check("français / française: padrão único (vírgula)", st.to_spoken_text("français / française", "fr") == "français, française")
check("œuf -> oeuf (uma palavra só)", st.to_spoken_text("l'œuf", "fr") == "l'oeuf")
check("L'œuf est cuit. -> oeuf", st.to_spoken_text("L'œuf est cuit.", "fr") == "L'oeuf est cuit.")
check("sem espaço duplo", "  " not in st.to_spoken_text("un kilo (de)", "fr"))

# --- não pode mexer no que já está certo ------------------------------------
for t in ["Bonjour !", "Je m'appelle Brune.", "C'est ma sœur.", "Il est français, elle est espagnole.",
          "km/h", "Tu as des frères et sœurs ?", "un demi-kilo"]:
    check(f"texto normal intacto: {t!r}", st.to_spoken_text(t, "fr") == t)

# barra SEM espaços não é tratada (convenção do app é ' / '), ex.: km/h, s/he
check("barra sem espaços fica", st.to_spoken_text("un/une", "fr") == "un/une")

# --- regra pendente do laboratório está DESLIGADA ---------------------------
pend = [r for r in st.RULES_BY_LANG["fr"] if r.status == "pending-lab"]
check("nenhuma regra pendente do lab sobrando ligada", all(not r.enabled for r in pend))

# --- idiomas isolados -------------------------------------------------------
check("zh sem regras (identidade)", st.to_spoken_text("你几岁？/ 你多大？", "zh") == "你几岁？/ 你多大？")
check("idioma desconhecido = identidade", st.to_spoken_text("un / une", "xx") == "un / une")
check("regras de fr não vazam pra zh", all(r.lang == "fr" for r in st.RULES_BY_LANG["fr"]))

# --- override manual tem prioridade ----------------------------------------
st.SPOKEN_OVERRIDES["fr"]["un / une"] = "un ou une"
check("override vence a regra", st.to_spoken_text("un / une", "fr") == "un ou une")
check("explain diz override", st.explain_spoken_text("un / une", "fr") == ["override"])
del st.SPOKEN_OVERRIDES["fr"]["un / une"]

# --- explain ----------------------------------------------------------------
check("explain slash", st.explain_spoken_text("un / une", "fr") == ["fr.slash-alternatives"])
check("explain paren", st.explain_spoken_text("un kilo (de)", "fr") == ["fr.parenthetical-particle"])
check("l'âge sem circunflexo", st.to_spoken_text("l'âge", "fr") == "l'age")
check("quel âge não muda", st.to_spoken_text("t'as quel âge ?", "fr") == "t'as quel âge ?")
check("explain nada", st.explain_spoken_text("Bonjour !", "fr") == [])

# --- português (pt-BR), aprovado em 2026-10-06 --------------------------------
PT_CASES = {
    "bonito / bonita": "bonito, bonita",
    "km/h": "km/h", "e/ou": "e/ou", "24/7": "24/7",
    "obrigado(a)": "obrigado, obrigada",
    "Muito obrigado(a)!": "Muito obrigado, obrigada!",
    "professor(a)": "professor, professora",
    "bem-vindo(a)": "bem-vindo, bem-vinda",
    "livro(s)": "livro, livros",
    "o(a) aluno(a)": "o aluno, a aluna",
    "Caro(a) professor(a), bom dia.": "Caro professor, cara professora, bom dia.",
    "professor(es)": "professor, professores",
    "os(as) alunos(as)": "os alunos, as alunas",
    "inglês(a)": "inglês(a)",
    "gostar (de)": "gostar de…",
    "você (informal)": "você (informal)",
    "Bom dia, Sra. Silva!": "Bom dia, Senhora Silva!",
    "Obrigado, Sra.": "Obrigado, Senhora.",
    "Sr. e Sra. Silva": "Senhor e Senhora Silva",
    "Sr.(a) Silva": "Senhor ou Senhora Silva",
    "Prof.ª Ana": "Professora Ana",
    "Dr Paulo chegou": "Doutor Paulo chegou",
    "1º andar": "primeiro andar",
    "a 2ª aula": "a segunda aula",
    "21º andar": "vigésimo primeiro andar",
    "1.º de maio": "primeiro de maio",
    "25ª edição": "vigésima quinta edição",
    "101º": "101º",
    "1° andar": "1° andar",
    "nº 5": "número 5",
    "Nº 12": "Número 12",
    "Oi 👋 → tudo ✓": "Oi tudo",
    "* item": "item",
    "Os carros azuis.": "Os carros azuis.",
    "Vou chamá-lo amanhã.": "Vou chamá-lo amanhã.",
    "Tudo bem?": "Tudo bem?",
    "Moro nos EUA.": "Moro nos EUA.",
    "Tenho 25 anos.": "Tenho 25 anos.",
    # Frases de PLE com acento/cedilha/til (Unicode: \w ASCII do JS x \p{L}); a paridade com o JS está em tests/tts-google.
    "Sr. Gonçalves, o(a) senhor(a) é brasileiro(a)?": "Senhor Gonçalves, o senhor é brasileiro, a senhora é brasileira?",
    "Eu sou do Brasil / de Portugal": "Eu sou do Brasil, de Portugal",
    "alemão(ã)": "alemão(ã)", "Pão(ães)": "Pão(ães)",
    "Moro no 3º andar, apartamento nº 12.": "Moro no terceiro andar, apartamento número 12.",
    "Preciso (de) ajuda e gosto (de) café / chá": "Preciso de… ajuda e gosto de… café, chá",
    "Olá! Tudo bem com você(s)?": "Olá! Tudo bem com você, vocês?",
    "A Dra. Ângela é médica.": "A Doutora Ângela é médica.",
    "Prof. Álvaro, bom dia.": "Professor Álvaro, bom dia.",
    "Ele é o 2º / ela é a 2ª": "Ele é o segundo, ela é a segunda",
    "à vista (informal)": "à vista (informal)",
    "ônibus nº 8 → Centro": "ônibus número 8 Centro",
    "você": "você",
    # Horas 24h (a leitura só diz o número; "duas e meia" o curso ensina à parte)
    "14h30": "14 horas e 30 minutos", "Chego às 14h30.": "Chego às 14 horas e 30 minutos.",
    "14h00": "14 horas", "14h": "14 horas", "9h00": "9 horas", "9h": "9 horas", "09h": "9 horas",
    "1h": "1 hora", "1h30": "1 hora e 30 minutos", "0h": "0 horas", "00h": "0 horas", "00h30": "0 horas e 30 minutos",
    "14h01": "14 horas e 1 minuto", "24h": "24 horas", "O banco abre às 8h e fecha às 17h.": "O banco abre às 8 horas e fecha às 17 horas.",
    "14:30": "14 horas e 30 minutos", "9:05": "9 horas e 5 minutos", "00:00": "0 horas", "23:59": "23 horas e 59 minutos",
    "A aula é às 19:30h.": "A aula é às 19 horas e 30 minutos.",
    "Fiz uma viagem de 5h de ônibus": "Fiz uma viagem de 5 horas de ônibus",
    "placar 2:1": "placar 2:1", "O jogo terminou 3:0.": "O jogo terminou 3:0.", "Mateus 3:16": "Mateus 3 horas e 16 minutos",  # limite conhecido: com minutos de 2 dígitos não há como distinguir de versículo/razão
    "24:30": "24:30", "14:75": "14:75", "14h75": "14h75", "25h30": "25h30", "30h de estudo": "30h de estudo",
    "10:30:15": "10:30:15", "1,5h": "1,5h", "km2h": "km2h", "14 h": "14 h", "9h5": "9h5", "OK 14hs": "OK 14hs",
    # Moeda
    "R$ 5,50": "5 reais e 50 centavos", "R$5,50": "5 reais e 50 centavos", "R$ 1,00": "1 real", "R$ 12,00": "12 reais",
    "R$ 0,50": "50 centavos", "R$ 1,01": "1 real e 1 centavo", "R$ 1.250,00": "1.250 reais", "R$ 5": "5 reais",
    "R$ 1": "1 real", "R$ 0,00": "0 reais", "R$ 1.250,75": "1.250 reais e 75 centavos", "R$ 2,05": "2 reais e 5 centavos",
    "Custa R$ 5,50 o quilo.": "Custa 5 reais e 50 centavos o quilo.", "De R$ 3,00 a R$ 4,50": "De 3 reais a 4 reais e 50 centavos",
    "R$": "R$", "Quanto custa em R$?": "Quanto custa em R$?", "R$ abc": "R$ abc", "US$ 5,00": "US$ 5,00",
    "R$ 5,5": "R$ 5,5", "R$ 5 mil": "R$ 5 mil", "R$ 2 milhões": "R$ 2 milhões",
    # Abreviações inequívocas
    "p.ex. café": "por exemplo café", "P.ex. café": "Por exemplo café", "p. ex. chá": "por exemplo chá",
    "Frutas, p.ex. maçã.": "Frutas, por exemplo maçã.",
    "Tenho livros, canetas, etc.": "Tenho livros, canetas, etcétera.", "Compro pão, leite, etc. e vou embora": "Compro pão, leite, etcétera e vou embora",
    "livros, etc., e mais": "livros, etcétera, e mais", "(maçã, uva, etc.)": "(maçã, uva, etcétera)",
    "Compro pão, etc. Depois volto.": "Compro pão, etcétera. Depois volto.", "Etc.": "Etcétera.", "etc": "etc", "o etcetera": "o etcetera",
    "Obs.: traga o livro": "Observação: traga o livro", "obs. importante": "observação importante", "Veja a obs.": "Veja a observação.",
    "vc tb vai? blz": "vc tb vai? blz", "site.etc.br": "site.etc.br", "inobs.": "inobs.", "tipo p.exemplo": "tipo p.exemplo",
}
for src, want in PT_CASES.items():
    got = st.to_spoken_text(src, "pt")
    check(f"pt: {src!r} -> {want!r} (veio {got!r})", got == want)
check("fr não é afetado por pt", st.to_spoken_text("Bom dia, Sra. Silva, 1º andar", "fr") == "Bom dia, Sra. Silva, 1º andar")
check("pt não aplica regra do fr", st.to_spoken_text("l'œuf", "pt") == "l'œuf")
check("pt gênero: 2a forma em minúscula quando a frase abre com maiúscula", st.to_spoken_text("Bem-vindo(a) à nossa casa!", "pt") == "Bem-vindo, bem-vinda à nossa casa!")
check("explain pt gênero", st.explain_spoken_text("obrigado(a)", "pt") == ["pt.gender-parenthetical"])
check("pt: SPOKEN_OVERRIDES serve para internetês (vc, tb)", (st.SPOKEN_OVERRIDES["pt"].update({"vc tb vai?": "você também vai?"}) or True) and st.to_spoken_text("vc tb vai?", "pt") == "você também vai?")
del st.SPOKEN_OVERRIDES["pt"]["vc tb vai?"]
check("explain pt hora", st.explain_spoken_text("às 14h30", "pt") == ["pt.time-24h"])
check("explain pt moeda", st.explain_spoken_text("R$ 5,50", "pt") == ["pt.currency-brl"])
check("explain pt abreviação", st.explain_spoken_text("p.ex. etc.", "pt") == ["pt.common-abbreviations"])
check("hora/moeda/abreviação não vazam para fr e zh",
      all(st.to_spoken_text(x, l) == x for l in ("fr", "zh") for x in ("14h30", "R$ 5,50", "etc.", "p.ex. 9:05")))
check("regras de pt são só pt", all(r.lang == "pt" for r in st.RULES_BY_LANG["pt"]))

# --- contra o manifest REAL --------------------------------------------------
root = os.path.join(HERE, "..", "..")
fr = st.load_manifest(os.path.join(root, "fr", "audio-manifest.js"))
zh = st.load_manifest(os.path.join(root, "zh", "audio-manifest.js"))
check("manifest fr carregado (>700)", len(fr) > 700)
check("manifest zh carregado (>400)", len(zh) > 400)

affected = st.report_affected_entries(fr, "fr")
disp = {d for d, _, _ in affected}
expected = {"allemand / allemande", "américain / américaine", "anglais / anglaise", "brésilien / brésilienne",
            "espagnol / espagnole", "français / française", "italien / italienne", "portugais / portugaise",
            "un / une", "un kilo (de)", "une bouteille (de)", "une tranche (de)", "l'œuf", "L'œuf est cuit.",
            "l'âge", "Quel est l'âge de ton père ?"}
check("relatório fr = exatamente as 16 esperadas", disp == expected)
check("relatório zh vazio", st.report_affected_entries(zh, "zh") == [])

# Antes da regeneração, só as 9 entradas com barra tinham hash != texto exibido
# (gerador antigo cortava na barra). Depois de regenerar, todas batem.
mismatched = {k for k, v in fr.items() if md5(k) != v}
check("manifest fr: todo hash == md5 do texto exibido (regenerado)", mismatched == set())
check("todo mismatch de hash é coberto por uma regra", mismatched <= disp)
check("zh: todo hash == texto exibido", all(md5(k) == v for k, v in zh.items()))

print(f"{COUNT - len(FAILS)}/{COUNT} passaram")
sys.exit(1 if FAILS else 0)
