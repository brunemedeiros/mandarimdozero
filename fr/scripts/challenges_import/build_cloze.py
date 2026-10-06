"""Monta o JSON importável dos desafios "Complete a frase" (type
`cloze_grammar`) de UM módulo, a partir do conteúdo-fonte
(ex.: modulo-a1-m6-cloze.json). NÃO chama rede nenhuma. Sem áudio.

    python3 fr/scripts/challenges_import/build_cloze.py [conteudo.json]

Gera lote-<modulo>-cloze.json (importável no painel admin) e
lote-<modulo>-cloze.md (resumo legível para revisão da autora).

Teto de vocabulário: avisa palavras das frases (já com as lacunas
preenchidas pela resposta certa) que NÃO aparecem em nenhum módulo do mesmo
nível até este (cumulativo) nem nas palavras funcionais de build_modulo.py.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
import build_modulo as bmod  # noqa: E402

DEFAULT_SRC = os.path.join(HERE, "modulo-a1-m6-cloze.json")
BLANK = "___"
CAP_PER_MODULE = 8


def allowed_tokens_up_to(module_id):
    js = r"""
    const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');
    const w=new Function(src+';return {UNITS,MODULES};')();
    const target=w.MODULES.find(x=>x.id===process.argv[2]);
    const mods=w.MODULES.filter(m=>m.level===target.level);
    const idx=mods.findIndex(m=>m.id===target.id);
    const out=[];
    for(const m of mods.slice(0,idx+1)) for(const id of m.unitIds){const u=w.UNITS.find(x=>x.id===id);
      (u.vocab||[]).forEach(v=>out.push(v.f));(u.phrases||[]).forEach(p=>out.push(p.f));
      if(u.dialogue)u.dialogue.lines.forEach(l=>out.push(l.f));
      if(u.grammar){(u.grammar.blocks||[]).forEach(b=>(b.examples||[]).forEach(e=>out.push(e.f)));
        (u.grammar.exercises||[]).forEach(e=>{out.push(e.prompt);out.push(e.answer);});}
    }
    console.log(JSON.stringify({units:target.unitIds,texts:out}));
    """
    res = subprocess.run(["node", "-e", js, os.path.join(ROOT, "fr", "content.js"), module_id],
                         capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    allowed = set()
    for t in data["texts"]:
        allowed.update(bmod.tokens(str(t)))
    return allowed, data["units"]


def filled(sentence, blanks):
    parts = sentence.split(BLANK)
    return "".join(p + (blanks[i]["answer"] if i < len(parts) - 1 else "") for i, p in enumerate(parts))


def write_summary(items, path, module_id):
    L = [f"# Complete a frase (gramática) -- módulo {module_id}", "",
         f"{len(items)} desafios `cloze_grammar` (múltipla escolha por lacuna, sem áudio). "
         "Política: Premium, unidade \"Desafios do Módulo\". Status: needs_review.", "",
         "| Id | Frase | Opções (certa em **negrito**) | Tradução | Explicação |", "|---|---|---|---|---|"]
    for i in items:
        opts = " ; ".join(" / ".join(f"**{o}**" if o == b["answer"] else o for o in b["options"]) for b in i["blanks"])
        L.append(f"| {i['id']} | {i['sentenceFr']} | {opts} | {i['translationPt']} | {i['explanation']} |")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    with open(src_path, encoding="utf-8") as f:
        src = json.load(f)
    module_id, level = src["moduleId"], src["level"]
    allowed, unit_ids = allowed_tokens_up_to(module_id)
    short = module_id.lower().replace("-", "")
    errors, warnings, items = [], [], []
    for n, s in enumerate(src["clozeGrammar"], 1):
        cid = f"cloze-{short}-{n:03d}"
        sent, blanks = s["sentenceFr"], s["blanks"]
        if s["unitId"] not in unit_ids:
            errors.append(f"{cid}: unitId {s['unitId']} fora do módulo")
        if sent.count(BLANK) != len(blanks) or not blanks:
            errors.append(f"{cid}: {sent.count(BLANK)} lacuna(s) ___ e {len(blanks)} grupo(s) de opções")
        for k, b in enumerate(blanks, 1):
            if not 2 <= len(b["options"]) <= 4:
                errors.append(f"{cid}: lacuna {k} precisa de 2 a 4 opções")
            if b["answer"] not in b["options"]:
                errors.append(f"{cid}: lacuna {k} sem a resposta entre as opções")
            if len(set(o.lower() for o in b["options"])) != len(b["options"]):
                errors.append(f"{cid}: lacuna {k} com opções repetidas")
        if not s.get("explanation", "").strip():
            errors.append(f"{cid}: explicação (pt-BR) obrigatória")
        if not s.get("translationPt", "").strip():
            errors.append(f"{cid}: tradução (pt-BR) obrigatória")
        full = filled(sent, blanks) if sent.count(BLANK) == len(blanks) else sent
        extra = sorted(t for t in set(bmod.tokens(full)) if t not in allowed and t not in bmod.FUNCTION_WORDS)
        if extra:
            warnings.append(f"{cid} ({full!r}): fora do vocabulário visto até {module_id} -> {extra}")
        items.append({
            "id": cid, "type": "cloze_grammar", "level": level,
            "moduleId": module_id, "unitId": s["unitId"], "theme": s["theme"],
            "topic": src.get("topic", ""), "sentenceFr": sent, "blanks": blanks,
            "translationPt": s["translationPt"], "explanation": s["explanation"],
            "status": "needs_review",
        })
    if len(items) > CAP_PER_MODULE:
        errors.append(f"mais de {CAP_PER_MODULE} desafios cloze_grammar no módulo (mantenha o conjunto leve)")
    if len({i["sentenceFr"] for i in items}) != len(items):
        errors.append("frases repetidas no lote")
    for w in warnings:
        print("AVISO", w)
    if errors:
        print("\n".join("ERRO " + e for e in errors), file=sys.stderr)
        sys.exit(1)
    base = f"lote-{module_id.lower()}-cloze"
    out = os.path.join(HERE, base + ".json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")
    write_summary(items, os.path.join(HERE, base + ".md"), module_id)
    print(f"{len(items)} desafios cloze_grammar -> {out}")


if __name__ == "__main__":
    main()
