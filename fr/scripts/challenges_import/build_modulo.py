"""Monta o JSON importável (painel admin > Desafios > importar) dos desafios
de UM módulo da trilha (hoje: A1-m1) a partir do conteúdo-fonte
(modulo-a1-m1-content.json). NÃO chama rede nenhuma.

    python3 fr/scripts/challenges_import/build_modulo.py [conteudo.json]

Cada desafio sai com `moduleId`/`unitId`/`theme` (campos extras que o app guarda
dentro de `data`, sem mudar o banco) e status "needs_review".

Teto de vocabulário: avisa (não bloqueia) palavras das frases em francês que NÃO
aparecem no conteúdo das unidades do módulo (vocabulário, frases, diálogos,
exercícios de gramática) nem na lista de palavras funcionais/números/nomes
própios abaixo -- serve pra eu revisar à mão se a frase usa algo que o aluno
ainda não viu.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
import build_lote_expressoes as bexpr  # noqa: E402

DEFAULT_SRC = os.path.join(HERE, "modulo-a1-m1-content.json")

# Já existem no banco (consulta de 2026-10): evita duplicar.
EXISTING_ACCENT = {"école", "à bientôt", "fréquent", "même", "voilà", "déjà", "après", "français", "préférer"}
EXISTING_EXPR = set(bexpr.EXISTING) | {"avoir faim", "avoir soif", "avoir raison"}
EXISTING_LT = {
    "Je mange une pomme.",
    "J'ai acheté un nouveau livre hier soir et je l'ai déjà commencé.",
    "J'ai acheté un nouveau livre hier et je l'ai déjà fini.",
}

# Palavras funcionais, números e nomes próprios que as frases podem usar sem
# serem "vocabulário novo" (o aluno vê isso desde a 1ª unidade).
FUNCTION_WORDS = set("""
le la les l un une des de du d à au aux en et ou mais est sont suis es sommes êtes a ai as avons avez ont
je tu il elle on nous vous ils elles me m te t se s ne n pas ça c ce cet cette mon ma mes ton ta tes son sa ses
notre nos votre vos leur leurs moi toi lui eux oui non très aussi bien mal plus que qui quoi où comment quel quelle
quels quelles combien voici voilà pour avec sans sur dans par chez ici là
zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize vingt
léo ana marc paul sophie brune paris lyon
""".split())


def audio_name(text):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12] + ".mp3"


def tokens(text):
    return re.findall(r"[a-zàâäçéèêëîïôöœùûüÿ]+", text.lower().replace("'", " ").replace("’", " "))


def module_allowed_tokens(module_id):
    js = r"""
    const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');
    const w=new Function(src+';return {UNITS,MODULES};')();
    const m=w.MODULES.find(x=>x.id===process.argv[2]);
    const out=[];
    for(const id of m.unitIds){const u=w.UNITS.find(x=>x.id===id);
      (u.vocab||[]).forEach(v=>out.push(v.f));(u.phrases||[]).forEach(p=>out.push(p.f));
      if(u.dialogue)u.dialogue.lines.forEach(l=>out.push(l.f));
      if(u.grammar&&u.grammar.exercises)u.grammar.exercises.forEach(e=>{out.push(e.prompt);out.push(e.answer);});
    }
    console.log(JSON.stringify({units:m.unitIds,texts:out}));
    """
    res = subprocess.run(["node", "-e", js, os.path.join(ROOT, "fr", "content.js"), module_id],
                         capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    allowed = set()
    for t in data["texts"]:
        allowed.update(tokens(t))
    return allowed, data["units"]


def make_hint(fr, hide):
    out = fr
    for word in hide:
        pat = re.compile(r"(?<![\wàâäçéèêëîïôöœùûüÿ])" + re.escape(word) + r"(?![\wàâäçéèêëîïôöœùûüÿ])", re.IGNORECASE)
        if not pat.search(out):
            raise ValueError(f"palavra a esconder não encontrada: {word!r} em {fr!r}")
        out = pat.sub("______", out, count=1)
    return out


def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    with open(src_path, encoding="utf-8") as f:
        src = json.load(f)
    module_id, level = src["moduleId"], src["level"]
    allowed, unit_ids = module_allowed_tokens(module_id)
    short = module_id.lower().replace("-", "")  # a1m1
    errors, warnings, items = [], [], []

    for n, s in enumerate(src["listenTranslate"], 1):
        cid = f"lt-{short}-{n:03d}"
        fr = s["fr"]
        if s["unitId"] not in unit_ids:
            errors.append(f"{cid}: unitId {s['unitId']} fora do módulo")
        if fr in EXISTING_LT:
            errors.append(f"{cid}: frase já existe no banco")
        if not 3 <= len(s["refs"]) <= 5 and len(s["refs"]) < 2:
            errors.append(f"{cid}: poucas traduções de referência")
        try:
            hint = make_hint(fr, s["hide"])
        except ValueError as e:
            errors.append(f"{cid}: {e}")
            continue
        extra = sorted(t for t in set(tokens(fr)) if t not in allowed and t not in FUNCTION_WORDS)
        if extra:
            warnings.append(f"{cid} ({fr!r}): fora do vocabulário do módulo -> {extra}")
        items.append({
            "id": cid, "type": "listen_translate", "level": level,
            "moduleId": module_id, "unitId": s["unitId"], "theme": s["theme"],
            "sentenceFr": fr, "audioFile": audio_name(fr), "hintText": hint,
            "referenceTranslations": s["refs"], "explanation": s.get("explanation", ""),
            "status": "needs_review",
        })

    for n, s in enumerate(src["accent"], 1):
        cid = f"accent-{short}-{n:03d}"
        if s["text"] in EXISTING_ACCENT:
            errors.append(f"{cid}: palavra já existe no banco ({s['text']})")
        items.append({
            "id": cid, "type": "accent", "level": level,
            "moduleId": module_id, "unitId": s["unitId"], "theme": s["theme"],
            "targetText": s["text"], "audioFile": audio_name(s["text"]),
            "explanation": s["explanation"], "status": "needs_review",
        })

    for n, s in enumerate(src["expression"], 1):
        cid = f"expr-{short}-{n:03d}"
        if s["expression"].lower().rstrip(" !") in EXISTING_EXPR:
            errors.append(f"{cid}: expressão já existe")
        item = bexpr.build_item({**s, "id": cid, "level": level})
        item.update({"moduleId": module_id, "unitId": s["unitId"], "theme": s["theme"]})
        items.append(item)

    ids = [i["id"] for i in items]
    if len(ids) != len(set(ids)):
        errors.append("ids duplicados")
    errors += [e for e in bexpr.validate([i for i in items if i["type"] == "expression"]) if "já existente" not in e]
    texts = [i["sentenceFr"] for i in items if i["type"] == "listen_translate"]
    if len(texts) != len(set(texts)):
        errors.append("frases repetidas no lote")

    for w in warnings:
        print("AVISO", w)
    if errors:
        print("\n".join("ERRO " + e for e in errors), file=sys.stderr)
        sys.exit(1)
    out = os.path.join(HERE, f"lote-{module_id.lower()}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")
    by_type = {}
    for i in items:
        by_type[i["type"]] = by_type.get(i["type"], 0) + 1
    print(f"{len(items)} desafios {by_type} -> {out}")


if __name__ == "__main__":
    main()
