---
paths:
  - "fr/scripts/**"
  - "supabase/functions/tts-generate/**"
  - "**/audio-manifest.js"
  - ".github/workflows/audio-tts.yml"
  - "shared/flashcard-field-audio-recorder.js"
---

# Áudio e TTS

Procedimento: skill `audio-tts`. Histórico: `docs/historico/05-*`, `07-*` (camada de texto falado), `11-*`.

- Manifest: chave = texto EXIBIDO, arquivo = MD5 desse texto; o TTS recebe `to_spoken_text(texto, idioma)`.
- Regras de texto falado por idioma: Python `fr/scripts/challenges_pipeline/spoken_text.py` e JS
  `supabase/functions/tts-generate/tts_core.mjs` com paridade testada. Mudou regra → subir a versão do idioma
  (`SPOKEN_RULES_VERSION` e `TTS_SPOKEN_RULES_VERSION_BY_LANG`) e rodar os 2 testes.
- Voz Chirp 3 HD Achernar (fr-FR, cmn-CN, pt-BR). Chave só em Secrets (`GCP_TTS_KEY` no GitHub, `TTS_PROVIDER_API_KEY`
  no Supabase); nunca em arquivo/commit/chat.
- TTS por Field: só ação explícita, idempotente por `generationKey`; cota mensal por conta; nunca gerar em Review/Preview.
