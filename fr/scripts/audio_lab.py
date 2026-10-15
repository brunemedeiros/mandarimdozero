"""Laboratório de escuta: gera VARIANTES de escrita de um mesmo texto e monta
uma página HTML pra OUVIR e escolher qual o TTS lê certo.

Existe porque a síntese neural é estocástica e cada forma de escrever (`l'œuf`,
`l’œuf`, `l'oeuf`...) pode ser lida diferente -- só se descobre ouvindo. A
variante escolhida vira a regra de `challenges_pipeline/spoken_text.py`.

Uso (precisa de GCP_TTS_KEY, exceto com --dry-run):
    python3 fr/scripts/audio_lab.py --dry-run     # mostra o plano e o custo, sem rede
    python3 fr/scripts/audio_lab.py               # gera e abre fr/scripts/lab_output/index.html

Português do Brasil (--lang pt):
    --modo regras   variantes de escrita das regras de texto falado (hora, moeda,
                    abreviações, gênero, barra, ordinais, títulos), voz Achernar
    --modo vozes    as mesmas frases de referência lidas por várias vozes pt-BR
                    (dicionário VOZES_PT abaixo; --vozes-todas inclui as 30 Chirp3-HD)
    Saída em fr/scripts/lab_output_pt/index.html (nunca commitada).

Custo: cada variante é um TTS curto. O plano do fr tem ~26 variantes / ~290
caracteres (0,03% da cota gratuita mensal do Chirp 3 HD, ver CLAUDE.md).
"""
import argparse
import html
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from challenges_pipeline.spoken_text import to_spoken_text  # noqa: E402

OUT_DIR = os.path.join(HERE, "lab_output")
OUT_DIR_PT = os.path.join(HERE, "lab_output_pt")

# caso -> variantes de escrita a comparar. A 1ª é sempre o que o app faz HOJE;
# "regra atual" é acrescentada automaticamente (saída de to_spoken_text).
CASES = {
    "l'œuf (palavra sozinha)": [
        "l'œuf", "l’œuf", "l'oeuf", "l’oeuf", "l' œuf", "loeuf", "l'œuf.",
    ],
    "L'œuf est cuit. (frase)": [
        "L'œuf est cuit.", "L’œuf est cuit.", "L'oeuf est cuit.", "L’oeuf est cuit.",
    ],
    "un kilo (de)": [
        "un kilo (de)", "un kilo de", "un kilo, de", "un kilo de…",
    ],
    "une bouteille (de)": [
        "une bouteille (de)", "une bouteille de", "une bouteille, de",
    ],
    "un / une (formas alternativas)": [
        "un / une", "un, une", "un ou une", "un. une", "un\nune",
    ],
    "français / française": [
        "français / française", "français, française", "français. française",
    ],
}

# ---------------------------------------------------------------------------
# Português do Brasil
# ---------------------------------------------------------------------------
# MODO regras: o 1º item de cada caso é o texto como o aluno vê. Os demais são
# PROPOSTAS de leitura escritas à mão (hora, moeda e abreviações ainda NÃO têm
# regra em spoken_text.py: ver docs/pt-tts-revisao.md seção 4). A "regra atual"
# (saída real de to_spoken_text) é acrescentada automaticamente e marcada.
CASES_PT_REGRAS = {
    "Hora 24h: 14h30": [
        "Eu chego às 14h30.", "Eu chego às 14 horas e 30 minutos.",
        "Eu chego às quatorze horas e trinta minutos.", "Eu chego às duas e meia da tarde.",
    ],
    "Hora 24h: 8h e 21h15": [
        "A aula é às 8h.", "A aula é às 8 horas.",
        "O jantar é às 21h15.", "O jantar é às 21 horas e 15 minutos.",
    ],
    "Moeda: R$ 5,50": [
        "O café custa R$ 5,50.", "O café custa 5 reais e 50 centavos.",
        "O café custa cinco reais e cinquenta centavos.",
    ],
    "Moeda: R$ 1.250,00 e R$ 1,00": [
        "O curso custa R$ 1.250,00.", "O curso custa 1250 reais.",
        "O curso custa mil duzentos e cinquenta reais.",
        "Custa R$ 1,00.", "Custa 1 real.",
    ],
    "Abreviações: p.ex., etc., obs.": [
        "Frutas, p.ex., maçã, banana etc.", "Frutas, por exemplo, maçã, banana etc.",
        "Frutas, por exemplo, maçã, banana e assim por diante.",
        "Obs.: a loja fecha cedo.", "Observação: a loja fecha cedo.",
    ],
    "Gênero entre parênteses: Bem-vindo(a)": [
        "Bem-vindo(a) à nossa casa!", "Bem-vindo, bem-vinda à nossa casa!",
        "Bem-vindo à nossa casa!", "Bem-vindo ou bem-vinda à nossa casa!",
    ],
    "Gênero entre parênteses: obrigado(a)": [
        "Muito obrigado(a)!", "Muito obrigado, obrigada!", "Muito obrigado!",
    ],
    "Barra: bonito / bonita": [
        "bonito / bonita", "bonito, bonita", "bonito ou bonita", "bonito. bonita",
    ],
    "Ordinais: 3º andar, 1ª vez": [
        "Moro no 3º andar.", "Moro no terceiro andar.",
        "É a minha 1ª vez no Brasil.", "É a minha primeira vez no Brasil.",
    ],
    "Títulos: Dra. Ângela, Sr. e Sra. Silva": [
        "A Dra. Ângela chegou.", "A Doutora Ângela chegou.",
        "O Sr. e a Sra. Silva moram aqui.", "O Senhor e a Senhora Silva moram aqui.",
    ],
}

# MODO vozes: frases de referência (cada uma isola um som).
FRASES_PT_VOZES = {
    "nasais (pão, mãe, bom, um)": "Minha mãe comprou um pão bom, e a mão do João é um limão.",
    "r inicial e rr": "O rato roeu a roupa do rei de Roma, e o carro corre na rua.",
    "l final (Brasil)": "O Brasil é um país grande, e o sol de abril é mil vezes legal.",
    "d e t antes de i (dia, tia, cidade, tarde)": "De dia, a tia foi à cidade, e de tarde voltou de ônibus.",
    "lh e nh": "A filha da minha vizinha ganhou um ninho com milho e linho.",
    "s final e nomes de lugar": "Os meus pais moram em São Paulo, mas o resto da família é do Rio e de Recife.",
    "diálogo curto 1": "Oi, tudo bem? Eu sou de Chicago.",
    "diálogo curto 2": "Você quer um café? Quero sim, obrigada!",
}

# Vozes pt-BR a comparar: nome da voz -> (rótulo, gênero esperado, tipo).
# FÁCIL DE EDITAR: tire/acrescente linhas. Se uma voz não existir na conta, o
# laboratório marca "indisponível" e segue com as outras. (Gênero: o da
# documentação da Google; a dona confere de ouvido.)
VOZES_PT = {
    "pt-BR-Chirp3-HD-Achernar": ("Achernar (a atual do site)", "feminina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Aoede": ("Aoede", "feminina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Kore": ("Kore", "feminina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Leda": ("Leda", "feminina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Zephyr": ("Zephyr", "feminina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Puck": ("Puck", "masculina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Charon": ("Charon", "masculina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Fenrir": ("Fenrir", "masculina", "Chirp3-HD"),
    "pt-BR-Chirp3-HD-Orus": ("Orus", "masculina", "Chirp3-HD"),
    "pt-BR-Neural2-A": ("Neural2 A", "feminina", "Neural2"),
    "pt-BR-Neural2-B": ("Neural2 B", "masculina", "Neural2"),
    "pt-BR-Neural2-C": ("Neural2 C", "feminina", "Neural2"),
    "pt-BR-Wavenet-A": ("Wavenet A", "feminina", "Wavenet"),
    "pt-BR-Wavenet-B": ("Wavenet B", "masculina", "Wavenet"),
    "pt-BR-Wavenet-C": ("Wavenet C", "feminina", "Wavenet"),
}

# Com --vozes-todas entram as 30 Chirp3-HD (os nomes são os mesmos em todos os idiomas).
_CHIRP3_FEM = ["Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome", "Gacrux", "Kore",
               "Laomedeia", "Leda", "Pulcherrima", "Sulafat", "Vindemiatrix", "Zephyr"]
_CHIRP3_MASC = ["Achird", "Algenib", "Algieba", "Alnilam", "Charon", "Enceladus", "Fenrir", "Iapetus",
                "Orus", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar", "Umbriel",
                "Zubenelgenubi"]


def vozes_pt(todas=False):
    vozes = dict(VOZES_PT)
    if todas:
        extras = [(n, "feminina") for n in _CHIRP3_FEM] + [(n, "masculina") for n in _CHIRP3_MASC]
        for nome, gen in extras:
            vozes.setdefault(f"pt-BR-Chirp3-HD-{nome}", (nome, gen, "Chirp3-HD"))
    return vozes


def plan(cases=None, lang="fr"):
    rows = []
    for case, variants in (cases or CASES).items():
        seen = []
        for v in variants:
            if v not in seen:
                seen.append(v)
        auto = to_spoken_text(variants[0], lang)
        if auto not in seen:
            seen.append(auto)
        rows.append((case, [(v, v == auto and v != variants[0]) for v in seen]))
    return rows


def plan_vozes(todas=False):
    vozes = list(vozes_pt(todas).items())
    return [(frase, texto, vozes) for frase, texto in FRASES_PT_VOZES.items()]


_ESTILO = ("<style>body{font:16px system-ui;max-width:820px;margin:24px auto;padding:0 16px}"
           "h2{margin-top:32px}li{margin:10px 0}code{background:#eee;padding:2px 6px;border-radius:4px}"
           "audio{vertical-align:middle;margin-left:8px}.auto{color:#a60}"
           "table{border-collapse:collapse;width:100%}"
           "td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:middle}"
           ".erro{color:#b00}.nota{color:#555}</style>")


def _tem_chave():
    from challenges_pipeline import config
    if not config.GCP_TTS_KEY:
        print("\nGCP_TTS_KEY não configurada.", file=sys.stderr)
        return False
    return True


def _modo_regras(lang, dry):
    rows = plan(CASES_PT_REGRAS if lang == "pt" else CASES, lang)
    total_variants = sum(len(v) for _, v in rows)
    total_chars = sum(len(t) for _, vs in rows for t, _ in vs)
    print(f"{len(rows)} casos, {total_variants} variantes, {total_chars} caracteres no total.")
    for case, vs in rows:
        print(f"\n{case}")
        for t, is_auto in vs:
            print(f"   {'*' if is_auto else ' '} {t!r}")
    print("\n(* = saída atual de to_spoken_text)")
    if lang == "pt":
        print("(sem * = a regra atual não mudou o texto: a regra ainda não existe ou não se aplica)")
    if dry:
        print("\n--dry-run: nada foi gerado.")
        return 0

    from challenges_pipeline.tts import _synthesize_raw, prepare_text_for_tts
    if not _tem_chave():
        return 1
    out_dir = OUT_DIR_PT if lang == "pt" else OUT_DIR
    os.makedirs(out_dir, exist_ok=True)
    if lang == "pt":
        titulo = "Laboratório de áudio: regras do português"
        intro = ("Ouça cada variante (voz pt-BR-Chirp3-HD-Achernar) e anote qual soa natural. "
                 "A 1ª é o texto como o aluno vê; a marcada com a seta é a saída da regra atual.")
    else:
        titulo = "Laboratório de áudio"
        intro = "Ouça cada variante e anote qual soa natural (uma palavra só, pausa curta)."
    body = [f"<!doctype html><meta charset='utf-8'><title>{titulo}</title>", _ESTILO,
            f"<h1>{titulo}</h1><p>{intro}</p>"]
    n = 0
    for ci, (case, vs) in enumerate(rows):
        body.append(f"<h2>{html.escape(case)}</h2><ol>")
        for vi, (text, is_auto) in enumerate(vs):
            n += 1
            fname = f"c{ci}_v{vi}.mp3"
            print(f"[{n}/{total_variants}] {text!r}")
            audio = _synthesize_raw(prepare_text_for_tts(text), lang=lang)
            with open(os.path.join(out_dir, fname), "wb") as f:
                f.write(audio)
            tag = " <span class='auto'>← regra atual</span>" if is_auto else ""
            body.append(f"<li><code>{html.escape(text)}</code>{tag}"
                        f"<audio controls src='{fname}'></audio></li>")
        body.append("</ol>")
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write("\n".join(body))
    print(f"\nPronto: abra {os.path.join(out_dir, 'index.html')} no navegador.")
    return 0


def _modo_vozes(todas, dry):
    rows = plan_vozes(todas)
    n_vozes = len(rows[0][2])
    total = sum(len(t) for _, t, _ in rows) * n_vozes
    print(f"{len(rows)} frases x {n_vozes} vozes = {len(rows) * n_vozes} áudios, {total} caracteres no total.")
    print("Vozes:")
    for nome, (_rot, gen, tipo) in rows[0][2]:
        print(f"   {nome}  ({tipo}, {gen})")
    for frase, texto, _ in rows:
        print(f"\n{frase}\n     {texto!r}")
    if dry:
        print("\n--dry-run: nada foi gerado.")
        return 0

    from challenges_pipeline.tts import _synthesize_raw, prepare_text_for_tts
    if not _tem_chave():
        return 1
    os.makedirs(OUT_DIR_PT, exist_ok=True)
    body = ["<!doctype html><meta charset='utf-8'><title>Laboratório de áudio: vozes do português</title>",
            _ESTILO, "<h1>Laboratório de áudio: comparação de vozes (pt-BR)</h1>",
            "<p>As mesmas frases lidas por vozes diferentes. Anote qual soa mais natural e que sotaque "
            "você percebe (carioca, paulista, neutro, outro). O Google só oferece o locale pt-BR: "
            "não dá para escolher a variedade regional, então o sotaque é o que cada voz já tem.</p>"]
    n = 0
    total_audios = len(rows) * n_vozes
    indisponiveis = set()
    for fi, (frase, texto, vozes) in enumerate(rows):
        body.append(f"<h2>{html.escape(frase)}</h2><p><code>{html.escape(texto)}</code></p>"
                    "<table><tr><th>Voz</th><th>Tipo / gênero</th><th>Ouvir</th></tr>")
        for nome, (rot, gen, tipo) in vozes:
            n += 1
            print(f"[{n}/{total_audios}] {nome}")
            celula = "<span class='erro'>indisponível nesta conta</span>"
            if nome not in indisponiveis:
                try:
                    audio = _synthesize_raw(prepare_text_for_tts(texto), retries=1,
                                            lang="pt", voice=nome, language_code="pt-BR")
                    fname = f"f{fi}_{nome.replace('pt-BR-', '').lower()}.mp3"
                    with open(os.path.join(OUT_DIR_PT, fname), "wb") as f:
                        f.write(audio)
                    celula = f"<audio controls src='{fname}'></audio>"
                except RuntimeError as exc:
                    indisponiveis.add(nome)
                    print(f"   indisponível: {exc}", file=sys.stderr)
            body.append(f"<tr><td><b>{html.escape(rot)}</b><br><span class='nota'>{html.escape(nome)}</span></td>"
                        f"<td>{html.escape(tipo)}, {html.escape(gen)}</td><td>{celula}</td></tr>")
        body.append("</table>")
    if indisponiveis:
        body.append("<h2>Vozes indisponíveis</h2><ul>" +
                    "".join(f"<li>{html.escape(v)}</li>" for v in sorted(indisponiveis)) + "</ul>")
    with open(os.path.join(OUT_DIR_PT, "index.html"), "w", encoding="utf-8") as f:
        f.write("\n".join(body))
    print(f"\nPronto: abra {os.path.join(OUT_DIR_PT, 'index.html')} no navegador.")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Laboratório de escuta do TTS.")
    ap.add_argument("--dry-run", action="store_true", help="mostra o plano e o custo, sem rede e sem chave")
    ap.add_argument("--lang", choices=["fr", "pt"], default="fr")
    ap.add_argument("--modo", choices=["regras", "vozes"], default="regras")
    ap.add_argument("--vozes-todas", action="store_true", help="(pt, modo vozes) inclui as 30 vozes Chirp3-HD")
    args = ap.parse_args(argv)
    if args.modo == "vozes":
        if args.lang != "pt":
            ap.error("--modo vozes só existe para --lang pt")
        return _modo_vozes(args.vozes_todas, args.dry_run)
    return _modo_regras(args.lang, args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
