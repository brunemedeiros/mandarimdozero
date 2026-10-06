"""Divisão de um ditado em FRASES (regra compartilhada com o app).

ESTA REGRA PRECISA SER REIMPLEMENTADA IDÊNTICA EM JS (fr/app.js). O app calcula
em runtime; não existe arquivo derivado. Algoritmo, sem ambiguidade:

  1. Quebre o texto em tokens separados por espaço em branco (/\\s+/), ignorando
     tokens vazios.
  2. Um token ENCERRA uma frase se casar com
         /[.!?…]+["'»”)\\]]*$/
     (termina em um ou mais de . ! ? … seguidos, opcionalmente, de aspas
     fechando ou parêntese/colchete fechando) E NÃO for abreviação.
  3. Abreviação (o token NÃO encerra frase) quando, removidos os fechamentos do
     passo 2, o token for exatamente uma destas (maiúsculas/minúsculas importam):
         M.  Mme.  Mmes.  Mlle.  Mlles.  Dr.  Pr.  St.  Ste.  etc.  p.  n°.
     ou uma única letra maiúscula seguida de ponto (inicial: "J.", "A.").
  4. Cada frase = tokens desde o fim da anterior até o token que encerra,
     unidos por UM espaço; a pontuação final fica incluída.
  4b. Token formado SÓ por fechamentos (ex.: "\u00bb" solto, depois de "Oui.") logo
     após uma frase encerrada é anexado a essa frase (com um espaço), não abre outra.
  5. Se sobrar texto sem token terminador, ele vira a última frase.
  6. Nunca devolve frase vazia.

Exemplos:
  "Bonjour ! Comment ça va ?"        -> ["Bonjour !", "Comment ça va ?"]
  "M. Dupont habite à Lyon. Il rit."  -> ["M. Dupont habite à Lyon.", "Il rit."]
  "Alors... je pars. Salut"          -> ["Alors...", "je pars.", "Salut"]
  "Il dit : « Oui. » Puis il part."  -> ["Il dit : « Oui. »", "Puis il part."]
  "Il a 3.5 euros. Merci"            -> ["Il a 3.5 euros.", "Merci"]
"""
import re

_END_RE = re.compile(r'[.!?…]+["\'»”)\]]*$')
_CLOSERS_RE = re.compile(r'["\'»”)\]]+$')
_ABBREVIATIONS = {"M.", "Mme.", "Mmes.", "Mlle.", "Mlles.", "Dr.", "Pr.",
                  "St.", "Ste.", "etc.", "p.", "n°."}
_ONLY_CLOSERS_RE = re.compile(r'^["\'\u00bb\u201d)\]]+$')
_INITIAL_RE = re.compile(r'^[A-Z]\.$')


def _is_abbreviation(token):
    core = _CLOSERS_RE.sub('', token)
    return core in _ABBREVIATIONS or bool(_INITIAL_RE.match(core))


def split_sentences(text):
    sentences, current = [], []
    for tok in text.split():
        if not current and sentences and _ONLY_CLOSERS_RE.match(tok):
            sentences[-1] += ' ' + tok
            continue
        current.append(tok)
        if _END_RE.search(tok) and not _is_abbreviation(tok):
            sentences.append(' '.join(current))
            current = []
    if current:
        sentences.append(' '.join(current))
    return [s for s in sentences if s.strip()]
