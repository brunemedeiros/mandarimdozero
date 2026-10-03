import json, base64, subprocess, os, sys, re, time

API_KEY = os.environ.get("GCP_TTS_KEY", "")
FORCE = os.environ.get("DICTATION_FORCE") == "1"  # refaz mesmo se o mp3 já existir

PUNCT_LABEL = {
    '.': 'point',
    ',': 'virgule',
    '?': "point d'interrogation",
    '!': "point d'exclamation",
}

def xml_escape(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def split_clauses(text):
    parts = re.findall(r'[^,.!?]+[,.!?]', text)
    clauses = []
    for p in parts:
        p = p.strip()
        punct = p[-1]
        clause = p[:-1].strip()
        if clause:
            clauses.append((clause, punct))
    return clauses

def chunk_words_for_emphasis(words, min_len=3):
    # Agrupa palavras muito curtas (1-2 letras, tipo "à", "et", "je") com a
    # próxima palavra em vez de isolá-las sozinhas entre pausas longas — o
    # TTS neural (Chirp3-HD) às vezes "aluciona" nessas pausas isoladas e lê
    # o nome do caractere/acento ("accent grave") em vez da palavra em si.
    chunks = []
    buffer = []
    for w in words:
        buffer.append(w)
        if len(w) >= min_len:
            chunks.append(' '.join(buffer))
            buffer = []
    if buffer:
        if chunks:
            chunks[-1] = chunks[-1] + ' ' + ' '.join(buffer)
        else:
            chunks.append(' '.join(buffer))
    return chunks

def word_by_word_ssml(clause, punct, pause_ms=550):
    chunks = chunk_words_for_emphasis(clause.split())
    parts = []
    for c in chunks:
        parts.append(xml_escape(c))
        parts.append(f'<break time="{pause_ms}ms"/>')
    parts.append(PUNCT_LABEL[punct] + '.')
    return ' '.join(parts)

# Locução de comando em PORTUGUÊS, dita logo depois do anúncio em francês e
# ANTES da leitura de reconhecimento: explica as 3 etapas pra quem ainda está
# aprendendo. É uma voz/idioma diferente do resto, então vira um pedaço de áudio
# próprio (3 pedaços no total) e os mp3 são emendados em seguida.
PT_INTRO_TEXT = (
    "Antes de começar, veja como funciona. "
    "Primeiro, você vai ouvir o texto inteiro, em ritmo lento. Ainda não escreva nada. "
    "Depois, cada frase será lida com pausas, e é aí que você escreve o que ouvir. "
    "No fim, farei uma última leitura, em ritmo normal, para você conferir se deixou algo passar."
)
PT_VOICE = {"languageCode": "pt-BR", "name": "pt-BR-Chirp3-HD-Achernar"}
FR_VOICE = {"languageCode": "fr-FR", "name": "fr-FR-Chirp3-HD-Achernar"}

def build_ssml_opening(dictee_num, opening=None):
    return ("<speak>" + xml_escape(opening or f"Français avec Prof. Brune, dictée {dictee_num}.")
            + ' <break time="700ms"/></speak>')

def build_ssml_pt_intro():
    return ("<speak>" + xml_escape(PT_INTRO_TEXT) + ' <break time="1000ms"/></speak>')

def build_ssml(dictee_num, text):
    """SSML do corpo em francês (sem a abertura nem a locução em português)."""
    clauses = split_clauses(text)
    parts = []

    parts.append("Je vais d'abord lire la dictée. Écoutez.")
    parts.append('<break time="500ms"/>')
    parts.append(f'<prosody rate="90%">{xml_escape(text)}</prosody>')
    parts.append('<break time="1500ms"/>')

    parts.append('Nous allons commencer la dictée. Écrivez.')
    parts.append('<break time="1500ms"/>')

    # Cada cláusula é lida uma vez em ritmo normal-lento, depois repetida
    # palavra por palavra com pausas maiores entre elas — pensado pra um
    # aluno ainda em formação conseguir escrever cada palavra com tempo,
    # em vez de reouvir a frase inteira no mesmo ritmo.
    clause_ssml = []
    for clause, punct in clauses:
        label = PUNCT_LABEL[punct]
        first_read = f'<prosody rate="80%">{xml_escape(clause)}, {label}.</prosody>'
        second_read = f'<prosody rate="75%">{word_by_word_ssml(clause, punct)}</prosody>'
        clause_ssml.append(first_read)
        clause_ssml.append('<break time="3000ms"/>')
        clause_ssml.append(second_read)
        clause_ssml.append('<break time="4000ms"/>')
    parts.extend(clause_ssml)

    parts.append('Je vais relire la dictée. Vérifiez.')
    parts.append('<break time="1000ms"/>')

    final_read = ' '.join(f'{xml_escape(clause)}, {PUNCT_LABEL[punct]}.' for clause, punct in clauses)
    parts.append(final_read)

    return '<speak>' + ' '.join(parts) + '</speak>'

SSML_MAX_BYTES = 5000  # limite da API por requisição

def synth_ssml_bytes(ssml, voice, retries=3):
    """Devolve (mp3_bytes, None) ou (None, mensagem_de_erro)."""
    if len(ssml.encode("utf-8")) > SSML_MAX_BYTES:
        return None, f"SSML maior que {SSML_MAX_BYTES} bytes ({len(ssml.encode('utf-8'))}): encurte o texto"
    body = json.dumps({
        "input": {"ssml": ssml},
        "voice": voice,
        "audioConfig": {"audioEncoding": "MP3"}
    })
    last = "failed"
    for attempt in range(retries):
        try:
            r = subprocess.run(
                ["curl", "-sS", "-X", "POST",
                 f"https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}",
                 "-H", "Content-Type: application/json",
                 "-d", "@-"],
                input=body.encode("utf-8"),
                capture_output=True, timeout=60
            )
            resp = json.loads(r.stdout.decode("utf-8"))
            if "audioContent" in resp:
                return base64.b64decode(resp["audioContent"]), None
            last = f"error: {resp.get('error', {})}"
        except Exception as e:
            last = f"exception: {e}"
        time.sleep(1.5 * (attempt + 1))
    return None, last

def synth_dictation(dictee_num, text, out_path, force=False, opening=None):
    """3 pedaços (abertura fr + locução pt + corpo fr) emendados num mp3 só.
    Os mp3 do Google saem como quadros MP3 crus (sem cabeçalho Xing/ID3), então
    emendar os bytes é seguro. Só grava o arquivo se os 3 deram certo."""
    if not force and os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return "skip"
    pieces = [
        (build_ssml_opening(dictee_num, opening), FR_VOICE),
        (build_ssml_pt_intro(), PT_VOICE),
        (build_ssml(dictee_num, text), FR_VOICE),
    ]
    blobs = []
    for ssml, voice in pieces:
        data, err = synth_ssml_bytes(ssml, voice)
        if err:
            return err
        blobs.append(data)
    with open(out_path, "wb") as f:
        f.write(b"".join(blobs))
    return "ok"

def load_dictations(js_path):
    # dictations.js is plain JS (unquoted keys), not JSON — evaluate it with
    # node and print DICTATIONS back out as JSON instead of hand-parsing it.
    node_script = (
        f"let src = require('fs').readFileSync({json.dumps(js_path)}, 'utf8');"
        "src = src.replace('const DICTATIONS', 'global.DICTATIONS');"
        "eval(src);"
        "console.log(JSON.stringify(global.DICTATIONS));"
    )
    r = subprocess.run(["node", "-e", node_script], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"failed to load {js_path} via node: {r.stderr}")
    return json.loads(r.stdout)

if __name__ == "__main__":
    # Usage: [DICTATION_FORCE=1] GCP_TTS_KEY=... python3 gen_guided_dictation_audio.py [dictations.js] [audio_dir] [dictee_id ...]
    # With no dictee_id args, (re)generates every dictation in the file.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    js_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(script_dir, "..", "dictations.js")
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(script_dir, "..", "audio")
    only_ids = set(sys.argv[3:]) if len(sys.argv) > 3 else None

    DICTATIONS = load_dictations(js_path)
    for i, d in enumerate(DICTATIONS):
        if only_ids and d["id"] not in only_ids:
            continue
        out_path = os.path.join(out_dir, f"dictation-{d['id']}-guided.mp3")
        status = synth_dictation(i + 1, d["text"], out_path, force=FORCE, opening=d.get("opening"))
        print(d["id"], status)
