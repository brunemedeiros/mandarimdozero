"""Prova que `_synthesize_raw` mantém o corpo da requisição de fr/zh IDÊNTICO
ao de antes e que os parâmetros novos (voice, language_code, lang='pt') só
agem quando usados. Sem rede: `requests.post` é substituído.
Roda: python3 fr/scripts/test_tts_voice_params.py"""
import base64
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from challenges_pipeline import config, tts  # noqa: E402

config.GCP_TTS_KEY = "chave-falsa"
capturado = []


class _Resp:
    def json(self):
        return {"audioContent": base64.b64encode(b"mp3").decode()}


def _post(url, headers=None, data=None, timeout=None):
    capturado.append(json.loads(data))
    return _Resp()


tts.requests.post = _post
falhas = 0
checagens = 0


def confere(cond, nome):
    global falhas, checagens
    checagens += 1
    if not cond:
        falhas += 1
        print("FALHOU:", nome)


def voz(**kw):
    capturado.clear()
    r = tts._synthesize_raw("olá", **kw)
    confere(r == b"mp3", f"devolve o áudio ({kw})")
    return capturado[0]["voice"]


# Comportamento antigo (corpo exato de antes da mudança)
confere(voz() == {"languageCode": "fr-FR", "name": config.TTS_VOICE}, "fr padrão")
confere(config.TTS_VOICE == "fr-FR-Chirp3-HD-Achernar", "voz fr padrão é Achernar")
confere(voz(lang="fr") == {"languageCode": "fr-FR", "name": "fr-FR-Chirp3-HD-Achernar"}, "fr explícito")
confere(voz(lang="zh") == {"languageCode": "cmn-CN", "name": "cmn-CN-Chirp3-HD-Achernar"}, "zh")
confere(capturado[0]["audioConfig"] == {"audioEncoding": "MP3"} and capturado[0]["input"] == {"text": "olá"}, "resto do corpo")
confere(tts._STT_LOCALE_BY_LANG["fr"] == "fr-FR" and tts._STT_LOCALE_BY_LANG["zh"] == "cmn-Hans-CN", "STT fr/zh")

# Novos usos
confere(voz(lang="pt") == {"languageCode": "pt-BR", "name": "pt-BR-Chirp3-HD-Achernar"}, "pt padrão")
confere(voz(lang="pt", voice="pt-BR-Neural2-B") == {"languageCode": "pt-BR", "name": "pt-BR-Neural2-B"}, "pt voz escolhida")
confere(voz(voice="x", language_code="y") == {"languageCode": "y", "name": "x"}, "voz e locale livres")

print(f"test_tts_voice_params: {checagens - falhas}/{checagens} ok" + ("" if not falhas else f", {falhas} falha(s)"))
sys.exit(1 if falhas else 0)
