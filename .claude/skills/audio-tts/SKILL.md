---
name: audio-tts
description: Corrigir ou regenerar áudios pré-gerados (AUDIO_MANIFEST) de fr/zh, adicionar uma regra de "texto falado" (pronúncia enviada ao TTS) ou mexer no TTS por Field (Edge Function tts-generate). Use quando um áudio for lido errado, faltar mp3 ou mudar texto com áudio.
---

# Áudio TTS

Histórico: `docs/historico/05-audio-midia-anki-fase-7.md`, `07-*` (camada de texto falado), `11-*` (provedor Google).

## Áudio pré-gerado (trilha, desafios, ditados)
- Nunca rodar geração local com a chave: usar GitHub Actions > "Áudio TTS" (`.github/workflows/audio-tts.yml`):
  `laboratorio` (variantes para ouvir), `regenerar` (todas as entradas afetadas pelas regras), `gerar-faltantes`,
  e modos de lote (`ditados`, `desafios-a1-mN`). O robô commita mp3/manifest e dispara o deploy.
- Validação do gerador: STT tolerante a elisão + checagem física (`audio_is_healthy`).
- Cota grátis do Google: 1M caracteres/mês (o site usa ~1,3%).

## Regra nova de texto falado
1. Python `fr/scripts/challenges_pipeline/spoken_text.py` (`RULES_BY_LANG`, `SPOKEN_OVERRIDES`).
2. Mesma regra em `supabase/functions/tts-generate/tts_core.mjs`.
3. Subir versão: `SPOKEN_RULES_VERSION` (Python) e `TTS_SPOKEN_RULES_VERSION_BY_LANG` (index.ts + `shared/flashcard-model.js`).
4. Testes: `python3 fr/scripts/test_spoken_text.py` e `node tests/tts-google/test_tts_core.mjs` (paridade com todo o manifest).
5. Rodar Actions `regenerar`. Só o texto ENVIADO muda; exibido e chave do manifest nunca.

## TTS por Field
- Deploy da `tts-generate` (2 arquivos: `index.ts`, `tts_core.mjs`) após mudança. Nunca gerar em Review/Preview.
