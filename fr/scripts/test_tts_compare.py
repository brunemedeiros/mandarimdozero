"""Testes da comparação texto original x transcrição do STT (sem rede)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from challenges_pipeline.tts import _words_missing_from_transcript as miss, audio_is_healthy

n = ok = 0
def check(name, cond):
    global n, ok
    n += 1; ok += bool(cond)
    print(("ok   " if cond else "FALHOU: ") + name)

check("t'as == tu as", miss("t'as quel âge ?", "tu as quel âge") == set())
check("t'es == tu es", miss("t'es français ?", "tu es français") == set())
check("t'es colado (tes)", miss("t'es français ?", "tes français") == set())
check("j'ai == je ai", miss("j'ai faim", "je ai faim") == set())
check("l'oeuf == le oeuf", miss("l'oeuf", "le œuf") == set())
check("n'écoute == ne écoute", miss("je n'écoute pas", "je ne écoute pas") == set())
check("palavra realmente ausente continua acusada", miss("t'as quel âge ?", "tu as âge") == {"quel"})
check("transcrição vazia = inconclusiva", miss("vous", "") is None)
check("texto sem elisão inalterado", miss("bonjour madame", "bonjour madame") == set())
import re
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
man = open(os.path.join(root, "audio-manifest.js"), encoding="utf-8").read()
h = re.search(r'^ "vous": "([0-9a-f]{12})\.mp3"', man, re.M).group(1)
good, why = audio_is_healthy(open(os.path.join(root, "audio", h + ".mp3"), "rb").read())
check("mp3 real de 'vous' passa na checagem física (%s)" % why, good)
print(f"{ok}/{n} passaram"); sys.exit(0 if ok == n else 1)
