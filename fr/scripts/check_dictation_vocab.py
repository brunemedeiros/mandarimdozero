"""Confere se os ditados de fr/dictations.js só usam vocabulário já visto até o
módulo do ditado (módulos anteriores + o próprio), igual ao teto de vocabulário
dos Desafios. Só avisa (não bloqueia). Uso: python3 fr/scripts/check_dictation_vocab.py"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "challenges_import"))
import build_modulo as bm  # noqa: E402

def load():
    js = os.path.join(HERE, "..", "dictations.js")
    code = ("let s=require('fs').readFileSync(%s,'utf8').replace('const DICTATIONS','global.D');eval(s);"
            "console.log(JSON.stringify(global.D))" % json.dumps(js))
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)

def main():
    bad = 0
    for d in load():
        n = int(d["moduleId"].split("m")[-1])
        allowed = set()
        for m in range(1, n + 1):
            a, _ = bm.module_allowed_tokens(f"A1-m{m}")
            allowed |= set(a)
        extra = sorted(t for t in set(bm.tokens(d["text"])) if t not in allowed and t not in bm.FUNCTION_WORDS)
        if extra:
            bad += 1
            print(f"{d['id']} ({d['moduleId']}): fora do vocabulário -> {extra}")
    print("OK: nenhum aviso" if not bad else f"{bad} ditado(s) com avisos")

if __name__ == "__main__":
    main()
