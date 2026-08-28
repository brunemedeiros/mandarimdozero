import json, base64, subprocess, os, sys, re, time

API_KEY = os.environ["GCP_TTS_KEY"]

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

def build_ssml(dictee_num, text):
    clauses = split_clauses(text)
    parts = []

    parts.append(f'Français avec Prof. Brune, dictée {dictee_num}.')
    parts.append('<break time="700ms"/>')

    parts.append("Je vais d'abord lire la dictée. Écoutez.")
    parts.append('<break time="500ms"/>')
    parts.append(f'<prosody rate="90%">{xml_escape(text)}</prosody>')
    parts.append('<break time="1500ms"/>')

    parts.append('Nous allons commencer la dictée. Écrivez.')
    parts.append('<break time="1500ms"/>')

    clause_ssml = []
    for clause, punct in clauses:
        label = PUNCT_LABEL[punct]
        unit = f'<prosody rate="80%">{xml_escape(clause)}, {label}.</prosody>'
        clause_ssml.append(unit)
        clause_ssml.append('<break time="3000ms"/>')
        clause_ssml.append(unit)
        clause_ssml.append('<break time="4000ms"/>')
    parts.extend(clause_ssml)

    parts.append('Je vais relire la dictée. Vérifiez.')
    parts.append('<break time="1000ms"/>')

    final_read = ' '.join(f'{xml_escape(clause)}, {PUNCT_LABEL[punct]}.' for clause, punct in clauses)
    parts.append(final_read)

    return '<speak>' + ' '.join(parts) + '</speak>'

def synth_ssml(ssml, out_path, retries=3):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return "skip"
    body = json.dumps({
        "input": {"ssml": ssml},
        "voice": {"languageCode": "fr-FR", "name": "fr-FR-Chirp3-HD-Achernar"},
        "audioConfig": {"audioEncoding": "MP3"}
    })
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
                with open(out_path, "wb") as f:
                    f.write(base64.b64decode(resp["audioContent"]))
                return "ok"
            else:
                err = resp.get("error", {})
                if attempt == retries - 1:
                    return f"error: {err}"
                time.sleep(1.5 * (attempt + 1))
        except Exception as e:
            if attempt == retries - 1:
                return f"exception: {e}"
            time.sleep(1.5 * (attempt + 1))
    return "failed"

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
    # Usage: GCP_TTS_KEY=... python3 gen_guided_dictation_audio.py [dictations.js] [audio_dir] [dictee_id ...]
    # With no dictee_id args, (re)generates every dictation in the file.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    js_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(script_dir, "..", "dictations.js")
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(script_dir, "..", "audio")
    only_ids = set(sys.argv[3:]) if len(sys.argv) > 3 else None

    DICTATIONS = load_dictations(js_path)
    for i, d in enumerate(DICTATIONS):
        if only_ids and d["id"] not in only_ids:
            continue
        ssml = build_ssml(i + 1, d["text"])
        out_path = os.path.join(out_dir, f"dictation-{d['id']}-guided.mp3")
        status = synth_ssml(ssml, out_path)
        print(d["id"], status, f"(ssml len={len(ssml)})")
