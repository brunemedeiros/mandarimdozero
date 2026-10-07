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
SPOKEN_RULES_VERSION = 5


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
    # Regra que não cabe num re.sub simples (ex.: gênero entre parênteses,
    # que olha várias ocorrências juntas): função texto -> texto.
    fn: Optional[Callable[[str], str]] = None

    def apply(self, text: str) -> str:
        if self.fn is not None:
            return self.fn(text)
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
    SpokenRule(
        id="fr.age-elision",
        lang="fr",
        reason=(
            '"l\'âge" era lido como duas palavras ("l âge"), o mesmo problema do '
            '"l\'œuf". Escrever "l\'age" (sem o circunflexo) faz o Chirp ler '
            'uma palavra só. Vale só depois de l\' -- "quel âge" não muda.'
        ),
        pattern=r"\b([lL])(['\u2019])âge",
        replacement=r"\1\2age",
    ),
]

# ---------------------------------------------------------------------------
# Chinês -- sem regras hoje. O manifest zh foi verificado (424 entradas, todas
# com MD5 == texto exibido): nunca houve pré-processamento. Fica registrado
# aqui para que a tabela por idioma exista desde já.
# ---------------------------------------------------------------------------
_ZH_RULES: List[SpokenRule] = []

# ---------------------------------------------------------------------------
# Português (pt-BR) -- aprovadas pela autora em 2026-10-06 (docs/pt-tts-
# proposta.md + docs/pt-tts-revisao.md). Usadas hoje só pelo TTS por campo
# (Edge Function tts-generate, porte em tts_core.mjs -- mesma ordem e mesmo
# resultado, conferido por teste de paridade). Sandhi, siglas, números,
# hífen de pronome e acentos ficam com a voz (não são regra de texto).
# Letra = [^\W\d_] (equivale a \p{L} do JS, com acentos).
# ---------------------------------------------------------------------------
_L = r"[^\W\d_]"

_PT_TITLES = {
    "Sr": "Senhor", "Sra": "Senhora", "Srta": "Senhorita", "Srs": "Senhores", "Sras": "Senhoras",
    "Dr": "Doutor", "Dra": "Doutora", "Drs": "Doutores", "Dras": "Doutoras",
    "Prof": "Professor", "Profa": "Professora",
}
_PT_TITLES_FEM = {"Sr": "Senhora", "Dr": "Doutora", "Prof": "Professora"}
_PT_TITLE_AFTER = r"(?=\s|[,;:!?)]|$)"


def _pt_titles(text: str) -> str:
    def end_dot(m, word):
        return word + ("." if m.end() == len(m.string) and m.group(0).endswith(".") else "")
    # "Sr.(a)" / "Sr(a)." -> "Senhor ou Senhora"
    text = re.sub(rf"(?<!{_L})Sr\.?\(a\)\.?", lambda m: end_dot(m, "Senhor ou Senhora"), text)
    # "Sr.ª", "Dr.ª", "Prof.ª", "Profª"
    text = re.sub(rf"(?<!{_L})(Sr|Dr|Prof)\.?ª{_PT_TITLE_AFTER}", lambda m: _PT_TITLES_FEM[m.group(1)], text)
    # Com ponto: expande sempre que vier espaço, pontuação ou fim do texto.
    text = re.sub(rf"(?<!{_L})(Srta|Sras|Srs|Sra|Sr|Dras|Drs|Dra|Dr|Profa|Prof)\.{_PT_TITLE_AFTER}",
                  lambda m: end_dot(m, _PT_TITLES[m.group(1)]), text)
    # Sem ponto, antes de nome com maiúscula ("Dr Paulo").
    text = re.sub(rf"(?<!{_L})(Sra|Sr|Dra|Dr)(?= [A-ZÀ-ÖØ-Þ])", lambda m: _PT_TITLES[m.group(1)], text)
    return text


_PT_VOWELS = "aeiouáéíóúâêôãõ"


def _pt_gender_variant(word: str, suf: str):
    if suf == "a":
        if word.endswith("o"):
            return word, word[:-1] + "a"
        if word.endswith("O"):
            return word, word[:-1] + "A"
        if word.endswith("or"):
            return word, word + "a"
        return None
    if suf == "as":
        return (word, word[:-2] + "as") if word.endswith("os") else None
    if suf == "s":
        return (word, word + "s") if word[-1:].lower() in _PT_VOWELS else None
    if suf == "es":
        return (word, word + "es") if word[-1:].lower() in "rz" else None
    return None


_PT_GENDER_RE = re.compile(rf"(?<!{_L})({_L}(?:{_L}|-)*)\((as|es|a|s)\)")


def _pt_gender(text: str) -> str:
    """"obrigado(a)" -> "obrigado, obrigada"; com vários marcadores, repete o
    trecho inteiro: "o(a) aluno(a)" -> "o aluno, a aluna". Só -o(a), -or(a),
    -os(as), vogal+(s), r/z+(es); o resto (ex.: "inglês(a)") fica igual."""
    valid = []
    for m in _PT_GENDER_RE.finditer(text):
        v = _pt_gender_variant(m.group(1), m.group(2))
        if v:
            valid.append((m.start(), m.end(), v))
    if not valid:
        return text
    start, end = valid[0][0], valid[-1][1]

    def build(idx):
        out, pos = [], start
        for s0, e0, v in valid:
            out.append(text[pos:s0])
            out.append(v[idx])
            pos = e0
        out.append(text[pos:end])
        return "".join(out)

    return text[:start] + build(0) + ", " + build(1) + text[end:]


_PT_UNITS = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono"]
_PT_TENS = ["", "décimo", "vigésimo", "trigésimo", "quadragésimo", "quinquagésimo",
            "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo"]


def _pt_ordinal_word(n: int, fem: bool):
    if n < 1 or n > 100:
        return None
    if n == 100:
        words = ["centésimo"]
    else:
        words = ([_PT_TENS[n // 10]] if n >= 10 else []) + ([_PT_UNITS[n % 10]] if n % 10 else [])
    if fem:
        words = [w[:-1] + "a" for w in words]
    return " ".join(words)


def _pt_ordinals(text: str) -> str:
    def repl(m):
        w = _pt_ordinal_word(int(m.group(1)), m.group(2) == "ª")
        return w if w else m.group(0)
    return re.sub(rf"(?<!\d)(?<!{_L})(\d{{1,3}})\.?([ºª])(?!\d)(?!{_L})", repl, text)


_PT_RULES: List[SpokenRule] = [
    SpokenRule(
        id="pt.title-abbreviations", lang="pt",
        reason='"Sra. Silva", "Dr. Paulo", "Sr.(a)": o TTS pode soletrar ou pausar no ponto. Lê "Senhora", "Doutor", "Senhor ou Senhora".',
        pattern="", replacement="", fn=_pt_titles,
    ),
    SpokenRule(
        id="pt.number-abbreviation", lang="pt",
        reason='"nº 5" / "n.º 5": lê "número 5".',
        pattern=r"(?<![^\W\d_])([Nn])\.?º\s*(?=\d)",
        replacement="", fn=lambda t: re.sub(r"(?<![^\W\d_])([Nn])\.?º\s*(?=\d)",
                                           lambda m: "Número " if m.group(1) == "N" else "número ", t),
    ),
    SpokenRule(
        id="pt.gender-parenthetical", lang="pt",
        reason='"obrigado(a)", "o(a) aluno(a)", "livro(s)": lê as duas formas ("obrigado, obrigada"; "o aluno, a aluna").',
        pattern="", replacement="", fn=_pt_gender,
    ),
    SpokenRule(
        id="pt.parenthetical-particle", lang="pt",
        reason='"gostar (de)": lê a preposição sem a pausa do parêntese. Lista fechada; parêntese explicativo ("você (informal)") fica igual.',
        pattern=r"\s+\((de|em|a|com|por|para|do|da|no|na)\)",
        replacement=r" \1…",
    ),
    SpokenRule(
        id="pt.slash-alternatives", lang="pt",
        reason='"bonito / bonita": lê as duas formas com uma pausa curta. Barra sem espaço ("e/ou", "km/h") fica igual.',
        pattern=r"\s+/\s+",
        replacement=", ",
    ),
    SpokenRule(
        id="pt.ordinal-indicators", lang="pt",
        reason='"1º andar", "2ª aula", "21º": lê "primeiro", "segunda", "vigésimo primeiro" (1 a 100). "1°" (grau) fica igual.',
        pattern="", replacement="", fn=_pt_ordinals,
    ),
    SpokenRule(
        id="pt.strip-symbols", lang="pt",
        reason="Emoji, setas e marcadores de lista (•, →, ✓, * solto) não devem ser lidos.",
        pattern="[\u2022\u2190-\u21FF\u2600-\u27BF\uFE0F\u200D\U0001F000-\U0001FAFF]|(?<!\S)\*+(?!\S)",
        replacement=" ",
    ),
]

RULES_BY_LANG: Dict[str, List[SpokenRule]] = {
    "fr": _FR_RULES,
    "zh": _ZH_RULES,
    "pt": _PT_RULES,
}

# Correção manual pontual, quando nenhuma regra genérica resolve: texto exibido
# -> texto falado. Tem prioridade sobre as regras.
SPOKEN_OVERRIDES: Dict[str, Dict[str, str]] = {
    # Escolhas da autora no laboratório (audio_lab.py), onde a regra genérica
    # (vírgula) não é a que ela ouviu melhor / a que funcionou de forma estável.
    "fr": {
        "une bouteille (de)": "une bouteille (de)",
    },
    "zh": {},
    "pt": {},
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
