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
check("explain nada", st.explain_spoken_text("Bonjour !", "fr") == [])

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
            "un / une", "un kilo (de)", "une bouteille (de)", "une tranche (de)", "l'œuf", "L'œuf est cuit."}
check("relatório fr = exatamente as 14 esperadas", disp == expected)
check("relatório zh vazio", st.report_affected_entries(zh, "zh") == [])

# a 9 entradas com barra são justamente as que o gerador antigo tratou (hash != texto exibido)
mismatched = {k for k, v in fr.items() if md5(k) != v}
check("as 9 com hash!=exibido são as 9 com barra", mismatched == {d for d in expected if " / " in d})
check("todo mismatch de hash é coberto por uma regra", mismatched <= disp)
check("zh: todo hash == texto exibido", all(md5(k) == v for k, v in zh.items()))

print(f"{COUNT - len(FAILS)}/{COUNT} passaram")
sys.exit(1 if FAILS else 0)
