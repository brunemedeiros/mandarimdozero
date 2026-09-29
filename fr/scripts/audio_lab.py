"""Laboratório de escuta: gera VARIANTES de escrita de um mesmo texto e monta
uma página HTML pra OUVIR e escolher qual o TTS lê certo.

Existe porque a síntese neural é estocástica e cada forma de escrever (`l'œuf`,
`l’œuf`, `l'oeuf`...) pode ser lida diferente -- só se descobre ouvindo. A
variante escolhida vira a regra de `challenges_pipeline/spoken_text.py`.

Uso (precisa de GCP_TTS_KEY, exceto com --dry-run):
    python3 fr/scripts/audio_lab.py --dry-run     # mostra o plano e o custo, sem rede
    python3 fr/scripts/audio_lab.py               # gera e abre fr/scripts/lab_output/index.html

Custo: cada variante é um TTS curto. O plano completo tem ~30 variantes / ~400
caracteres (0,04% da cota gratuita mensal do Chirp 3 HD, ver CLAUDE.md).
"""
import html
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from challenges_pipeline.spoken_text import to_spoken_text  # noqa: E402

OUT_DIR = os.path.join(HERE, "lab_output")

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


def plan():
    rows = []
    for case, variants in CASES.items():
        seen = []
        for v in variants:
            if v not in seen:
                seen.append(v)
        auto = to_spoken_text(variants[0], "fr")
        if auto not in seen:
            seen.append(auto)
        rows.append((case, [(v, v == auto and v != variants[0]) for v in seen]))
    return rows


def main():
    dry = "--dry-run" in sys.argv
    rows = plan()
    total_variants = sum(len(v) for _, v in rows)
    total_chars = sum(len(t) for _, vs in rows for t, _ in vs)
    print(f"{len(rows)} casos, {total_variants} variantes, {total_chars} caracteres no total.")
    for case, vs in rows:
        print(f"\n{case}")
        for t, is_auto in vs:
            print(f"   {'*' if is_auto else ' '} {t!r}")
    print("\n(* = saída atual de to_spoken_text)")
    if dry:
        print("\n--dry-run: nada foi gerado.")
        return 0

    from challenges_pipeline import config
    from challenges_pipeline.tts import _synthesize_raw, prepare_text_for_tts
    if not config.GCP_TTS_KEY:
        print("\nGCP_TTS_KEY não configurada.", file=sys.stderr)
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    body = ["<!doctype html><meta charset='utf-8'><title>Laboratório de áudio</title>",
            "<style>body{font:16px system-ui;max-width:760px;margin:24px auto;padding:0 16px}"
            "h2{margin-top:32px}li{margin:10px 0}code{background:#eee;padding:2px 6px;border-radius:4px}"
            "audio{vertical-align:middle;margin-left:8px}.auto{color:#a60}</style>",
            "<h1>Laboratório de áudio</h1><p>Ouça cada variante e anote qual soa natural "
            "(uma palavra só, pausa curta).</p>"]
    n = 0
    for ci, (case, vs) in enumerate(rows):
        body.append(f"<h2>{html.escape(case)}</h2><ol>")
        for vi, (text, is_auto) in enumerate(vs):
            n += 1
            fname = f"c{ci}_v{vi}.mp3"
            print(f"[{n}/{total_variants}] {text!r}")
            audio = _synthesize_raw(prepare_text_for_tts(text))
            with open(os.path.join(OUT_DIR, fname), "wb") as f:
                f.write(audio)
            tag = " <span class='auto'>← regra atual</span>" if is_auto else ""
            body.append(f"<li><code>{html.escape(text)}</code>{tag}"
                        f"<audio controls src='{fname}'></audio></li>")
        body.append("</ol>")
    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write("\n".join(body))
    print(f"\nPronto: abra {os.path.join(OUT_DIR, 'index.html')} no navegador.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
