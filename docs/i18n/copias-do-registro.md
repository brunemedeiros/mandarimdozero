# Cópias do registro de idiomas (E1)

Fonte única: `languages/registry.json`. Gerado: `languages/registry.js` (`node scripts/build-registry.js`; `--check` no teste).
O navegador lê `registry.js`; o Python (`scripts/generate_pwa_assets.py`) lê o JSON direto. O que **não** lê o JSON fica
aqui, cada item com o teste que confere a sincronia (ou o motivo de ficar fora).

| Cópia | Onde | Conferido por |
|---|---|---|
| Versão das regras de TTS por idioma (`{ fr: 4, pt: 1, zh: 0 }`) | `supabase/functions/tts-generate/index.ts` | `tests/tts-google/test_tts_core.mjs` ("Deno == registro") |
| Voz e taxa por idioma | `supabase/functions/tts-generate/tts_core.mjs`, `fr/scripts/challenges_pipeline/tts.py` | pendente (E6); hoje só revisão manual |
| Versão das regras de fala (Python = 5, TS = fr 4) | `fr/scripts/challenges_pipeline/spoken_text.py` | **divergência aberta**: a E1 não mexe nos números para não invalidar áudio; decidir na E6 |
| `LANGUAGES` e `MISSION_FIELD_BY_ID` | `supabase/functions/notification-cron/index.ts` | pendente (E6) |
| `CHECK (language_app_key in (...))` e `foreach` | `shared/supabase_migrations/` | pendente (E6, Q-06 adiada pela Dv-4) |
| Rótulos por chave de i18n (`REPORT_LANGUAGE_LABELS`, `STUDENT_LANGUAGE_LABELS`, `DECK_BROWSER_LANG_LABELS`, `<option>` de admin-notifications) | `shared/admin-*.js`, `shared/deck-browser.js` | lint em `tests/registro/test_registry.js` (lista de exceções) |
| `FLASHCARD_DIRECTION_LANGUAGE_LABELS` e `myFlashcardLangName` (português como lógica) | `shared/admin-students.js`, `shared/my-flashcards.js` | exceção declarada; resolve na E4/E5 |
| Tabela de rótulos de tag em português | `shared/study-trail-model.js` | exceção declarada |
| Nome, descrição, cores do PWA | `shared/app-identity.json` | `generate_pwa_assets.py` (nome vem do registro; descrição/cores ainda do JSON de identidade) |
| Listas de idiomas nos workflows | `.github/workflows/deploy-pages.yml`, `audio-tts.yml` | pendente (E7) |
| Rótulo `fr`/`zh`/`pt-BR` em `FIELD_LANG_OPTIONS` | `shared/flashcard-field-editor.js` | pendente (E5: entra `pt`) |
