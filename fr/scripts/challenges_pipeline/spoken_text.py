"""Camada de "texto falado": decide COMO um texto exibido deve ser LIDO pelo TTS.

Por que existe (ver CLAUDE.md, seção "Projeto de melhoria do sistema de áudio"):
o texto que aparece na tela (`f` de content.js) sempre foi enviado ao TTS sem
nenhuma decisão de leitura. O script original que gerou os mp3 do vocabulário
(que nunca entrou no git) tratava ` / ` cortando o texto na barra e enviando só
a primeira forma -- provado pelo MD5 dos nomes dos arquivos (9 entradas, todas
com barra, batem só com a 1ª forma: "un / une" virou "un"). Aquela regra era
implícita e se perdeu junto com o script. Aqui as regras ficam DECLARADAS,
versionadas e testáveis.

Princípios:
- O texto EXIBIDO nunca muda. Só a cópia enviada ao TTS.
- Uma tabela de regras POR IDIOMA (o sandhi do português, por exemplo, nunca
  deve vazar para as regras do francês).
- Toda regra tem id + motivo, e `explain_spoken_text()` diz quais dispararam --
  é o que permite listar quais entradas do manifest precisam ser regeneradas
  quando uma regra muda (`report_affected_entries`).
- `SPOKEN_RULES_VERSION` sobe sempre que o comportamento de alguma regra muda.
- Sem dependências externas (só stdlib): roda em qualquer lugar, inclusive em
  testes, sem chave de API.
"""

import json
import os
import re
import sys
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

# Sobe quando o comportamento de qualquer regra muda (regenerar o que a regra afeta).
SPOKEN_RULES_VERSION = 2


@dataclass(frozen=True)
class SpokenRule:
    id: str
    lang: str
    reason: str
    pattern: str            # regex aplicada ao texto exibido
    replacement: str        # string de substituição (sintaxe de re.sub)
    enabled: bool = True
    # 'approved' = decidida com a autora; 'pending-lab' = depende de OUVIR
    # variantes (audio_lab.py) antes de ser ligada.
    status: str = "approved"

    def apply(self, text: str) -> str:
        return re.sub(self.pattern, self.replacement, text)


# ---------------------------------------------------------------------------
# Francês
# ---------------------------------------------------------------------------
_FR_RULES: List[SpokenRule] = [
    SpokenRule(
        id="fr.parenthetical-particle",
        lang="fr",
        reason=(
            '"un kilo (de)": o TTS tratava o parêntese como um aparte e fazia '
            'uma pausa grande antes de "de". Escolha da autora no laboratório: '
            '"un kilo de…" (reticências dão uma pausa curta e o "de" é lido).'
        ),
        pattern=r"\s*\(([^()]*)\)",
        replacement=r" \1…",
    ),
    SpokenRule(
        id="fr.slash-alternatives",
        lang="fr",
        reason=(
            '"un / une", "français / française": o gerador antigo enviava só a '
            "1ª forma. As duas formas devem ser lidas, separadas por uma pausa "
            'curta (vírgula): "un, une".'
        ),
        pattern=r"\s+/\s+",
        replacement=", ",
    ),
    SpokenRule(
        id="fr.oe-ligature-elision",
        lang="fr",
        reason=(
            '"l\'œuf" era lido como duas palavras ("L œuf"). Escolha da autora no '
            'laboratório: escrever "oeuf" (sem a ligadura) faz o Chirp ler como '
            'uma palavra só ("l\'oeuf"). Vale também para "œufs".'
        ),
        pattern=r"œuf",
        replacement="oeuf",
    ),
]

# ---------------------------------------------------------------------------
# Chinês -- sem regras hoje. O manifest zh foi verificado (424 entradas, todas
# com MD5 == texto exibido): nunca houve pré-processamento. Fica registrado
# aqui para que a tabela por idioma exista desde já.
# ---------------------------------------------------------------------------
_ZH_RULES: List[SpokenRule] = []

# Idiomas futuros (ex.: português, com sandhi consonantal "os carros azuis" ->
# ligação s+a) entram como mais uma lista aqui -- nunca misturadas com as do fr.
RULES_BY_LANG: Dict[str, List[SpokenRule]] = {
    "fr": _FR_RULES,
    "zh": _ZH_RULES,
}

# Correção manual pontual, quando nenhuma regra genérica resolve: texto exibido
# -> texto falado. Tem prioridade sobre as regras.
SPOKEN_OVERRIDES: Dict[str, Dict[str, str]] = {
    # Escolhas da autora no laboratório (audio_lab.py), onde a regra genérica
    # (vírgula) não é a que ela ouviu melhor / a que funcionou de forma estável.
    "fr": {
        "français / française": "français. française",
        "une bouteille (de)": "une bouteille (de)",
    },
    "zh": {},
}


def _active_rules(lang: str) -> List[SpokenRule]:
    return [r for r in RULES_BY_LANG.get(lang, []) if r.enabled]


def _tidy(text: str) -> str:
    return re.sub(r"\s{2,}", " ", text).strip()


def to_spoken_text(text: str, lang: str = "fr") -> str:
    """Devolve o texto que deve ser ENVIADO ao TTS para `text` (texto exibido)."""
    override = SPOKEN_OVERRIDES.get(lang, {}).get(text)
    if override is not None:
        return override
    out = text
    for rule in _active_rules(lang):
        out = rule.apply(out)
    return _tidy(out)


def explain_spoken_text(text: str, lang: str = "fr") -> List[str]:
    """Ids das regras (ou 'override') que alteram `text`."""
    if text in SPOKEN_OVERRIDES.get(lang, {}):
        return ["override"]
    fired = []
    out = text
    for rule in _active_rules(lang):
        new = rule.apply(out)
        if new != out:
            fired.append(rule.id)
        out = new
    return fired


# ---------------------------------------------------------------------------
# Relatório: quais entradas do manifest mudam de texto falado.
# ---------------------------------------------------------------------------
_MANIFEST_ENTRY_RE = re.compile(r'^ "((?:[^"\\]|\\.)*)": "([0-9a-f]{12})\.mp3"', re.M)


def load_manifest(path: str) -> Dict[str, str]:
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    return {k.replace('\\"', '"'): v for k, v in _MANIFEST_ENTRY_RE.findall(raw)}


def report_affected_entries(manifest: Dict[str, str], lang: str = "fr") -> List[Tuple[str, str, List[str]]]:
    """[(texto_exibido, texto_falado, [regras])] só das entradas cujo texto
    falado difere do exibido -- ou seja, as que precisam de mp3 novo."""
    affected = []
    for display in sorted(manifest):
        rules = explain_spoken_text(display, lang)
        if rules:
            affected.append((display, to_spoken_text(display, lang), rules))
    return affected


def _main(argv: Optional[List[str]] = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    here = os.path.dirname(os.path.abspath(__file__))
    audio_dir = os.path.join(here, "..", "..")  # fr/
    repo_root = os.path.join(audio_dir, "..")
    targets = {
        "fr": os.path.join(repo_root, "fr", "audio-manifest.js"),
        "zh": os.path.join(repo_root, "zh", "audio-manifest.js"),
    }
    if "--json" in argv:
        as_json = True
        argv.remove("--json")
    else:
        as_json = False
    langs = [a for a in argv if a in targets] or ["fr", "zh"]
    results = {}
    for lang in langs:
        manifest = load_manifest(targets[lang])
        affected = report_affected_entries(manifest, lang)
        results[lang] = {
            "rulesVersion": SPOKEN_RULES_VERSION,
            "entries": len(manifest),
            "affected": [{"display": d, "spoken": s, "rules": r} for d, s, r in affected],
            "charsToRegenerate": sum(len(s) for _, s, _ in affected),
        }
    if as_json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return 0
    for lang, res in results.items():
        print(f"[{lang}] {res['entries']} entradas no manifest, {len(res['affected'])} mudam "
              f"({res['charsToRegenerate']} caracteres a regenerar) -- regras v{res['rulesVersion']}")
        for a in res["affected"]:
            print(f"   {a['display']!r} -> {a['spoken']!r}   {a['rules']}")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
