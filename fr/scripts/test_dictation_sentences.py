"""Testes offline da divisão em frases e do dry-run. Rodar: python3 fr/scripts/test_dictation_sentences.py"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dictation_sentences import split_sentences
import gen_dictation_sentence_audio as ga
import gen_guided_dictation_audio as g

FAILS = []; N = 0
def check(name, cond):
    global N; N += 1
    if not cond: FAILS.append(name); print("FALHOU:", name)

check("simples", split_sentences("Bonjour ! Comment ça va ?") == ["Bonjour !", "Comment ça va ?"])
check("M.", split_sentences("M. Dupont habite à Lyon. Il rit.") == ["M. Dupont habite à Lyon.", "Il rit."])
check("Mme/inicial", split_sentences("Mme Martin et J. Dupont parlent.") == ["Mme Martin et J. Dupont parlent."])
check("Mme.", split_sentences("Mme. Martin part. Oui.") == ["Mme. Martin part.", "Oui."])
check("reticencias", split_sentences("Alors... je pars. Salut") == ["Alors...", "je pars.", "Salut"])
check("reticencia unicode", split_sentences("Alors… je pars.") == ["Alors…", "je pars."])
check("aspas", split_sentences("Il dit : « Oui. » Puis il part.") == ["Il dit : « Oui. »", "Puis il part."])
check("sem ponto final", split_sentences("Je pars") == ["Je pars"])
check("numero", split_sentences("Il a 3.5 euros. Merci") == ["Il a 3.5 euros.", "Merci"])
check("vazio", split_sentences("  ") == [])

ds = g.load_dictations(os.path.join(HERE, "..", "dictations.js"))
items = ga.plan(ds)
check("ha itens", len(items) > 0)
for did, n, s, ssml, spoken in items:
    check(f"{did} s{n} nao vazia", s.strip() and spoken.strip())
    check(f"{did} s{n} ssml<=5000", len(ssml.encode("utf-8")) <= g.SSML_MAX_BYTES)
check("ids unicos (id,n)", len({(i[0], i[1]) for i in items}) == len(items))
print(f"{N} verificações, {len(FAILS)} falhas")
sys.exit(1 if FAILS else 0)
