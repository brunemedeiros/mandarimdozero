# Inventário dos pontos de variação (E0)

Levantamento somente leitura feito em 2026-10-12 (agente `Explore`, leitura de código; nenhum arquivo do app foi alterado).
Parte da E0 de `arquitetura-multi-idioma-cursos.md`. Base para as etapas E1 a E7.

**Eixo**: A = idioma estudado (fr, zh, futuro pt); B = idioma do site (pt-BR, en).
**Classe**: núcleo (vale para todos) | família (latin ou cjk) | idioma | curso (par estudado × site).
Caminhos relativos à raiz. As contagens são por linha de tabela (uma linha pode agrupar vários pontos), então são ordem de grandeza.

Fatos de base: `fr/app.js` e `zh/app.js` são bases espelhadas com divergência; o eixo B já grava `uiLanguage` em
`progress.data._meta.uiLanguage` e `localStorage`; catálogos em `shared/i18n/pt-BR.js` e `en.js` (`es.js` congelado);
a tabela `progress` guarda um namespace por `appKey`, então `portugues` precisará de um terceiro.

## 1. Registro, seletor e portão

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `languages/index.js:21-47` | `AVAILABLE_LANGUAGES` (id, appKey, nome, bandeira, path, accent, enabled, hasLevelTest). Já é o registro certo. | A | idioma |
| `shared/language-pref.js:17` | `APP_KEY_TO_LANG_ID` duplica o registro | A | idioma (derivável) |
| `shared/language-pref.js:87` | `ACCOUNT_UI_LANGUAGES=['pt-BR','en']` | B | núcleo |
| `shared/language-pref.js:38-41` | Infere idioma da conta por `stored.frances`/`stored.mandarim` | A | núcleo |
| `shared/language-switcher.js` | Já parametrizado; nome do idioma só em português | A+B | núcleo (falta nome por idioma do site) |
| `index.html` (portão) | Grade parametrizada; textos fixos em português; não carrega `shared/i18n`, então sem inglês no portão; `<html lang>`, `<title>` fixos | B | núcleo |
| `shared/auth.js:351,375-381` | Sugestão de idioma do site: `startsWith('en') ? 'en' : 'pt-BR'` (idioma novo cai em pt-BR) | B | núcleo |
| `shared/profile.js:688` | Nome do país escolhe `'en'` ou `'pt-BR'` | B | núcleo |
| `shared/friends.js:358` | Fallback `'frances'` | A | núcleo |
| `shared/leaderboard.js`, `friends.js`, `admin-analytics.js`, `public-profile.js` | Já usam `AVAILABLE_LANGUAGES` | A | núcleo |

## 2. Constantes por app e HTML de cada idioma

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `fr/app.js:976-982`, `zh/app.js:1220-1226` | `APP_KEY`, `LANGUAGE_STUDY_NAME` (texto em português usado no wizard), `LANG_ID` | A | idioma |
| `shared/wizard.js:10-11,156` | Nome do idioma estudado vem em português | A+B | idioma |
| `fr/app.js:945-950`, `zh/app.js:1031-1035` | `ContentI18n.create` com módulos/testes (fr) ou stories/hanzi (zh) | A+B | idioma/curso |
| `fr/app.js:955-968`, `zh/app.js:1040-1060` | `refreshStudyCardTexts` (`.f` x `back_hanzi`/`front_pinyin`) | A | família |
| `fr/app.js:1302`, `zh/app.js:1431` | `LEVEL_DESCRIPTIONS` | A | curso |
| `fr/app.js:1782`, `zh/app.js:1869` | Badges amarrados a `A1` e unidades numéricas | A | curso |
| `fr/app.js:1497,1594`, `zh/app.js:1593,1687` | Missões/pools (`conj1` x `hanzi1`) | A | idioma |
| `fr/app.js:42-46,238,265,306`, `zh/app.js:39-44,228,259,311` | Vozes Web Speech (`fr-FR`/`zh-CN`) | A | família+idioma |
| `fr/app.js:4934-4951` | Grupos de acentos | A | família latin |
| `zh/app.js:5160-5260` | Pinyin, tons | A | família cjk |
| `zh/app.js:383-470,8260-8820` | HanziWriter, lições de hanzi | A | idioma (zh) |
| `zh/app.js:1075` | Chave `mandarim_hide_pinyin` | A | idioma |
| `fr/app.js:9799` | Módulo Desafios/Ditados/Conjugação só em fr | A | curso (fr) |
| `fr|zh/index.html:6-8,20` | `<title>`, `theme-color`, nome do app | A+B | idioma |
| `fr/index.html:4935+` x `zh/index.html` | Conjunto de `<script>` diferente | A | idioma |
| `fr/index.html:4262,4777`, `zh/index.html:3622,4106` | `<option pt-BR/en>` escritos à mão nos dois HTML | B | núcleo (duplicado) |
| `shared/i18n/pt-BR.js`, `en.js` | Namespaces `fr.*` (128) e `zh.*` (127) no catálogo compartilhado | A+B | idioma |
| `shared/i18n/i18n.js:29,277,41,296,128` | `UI_LANGS`, `SELECTABLE_UI_LANGS`, `normalizeLang`, confirmação binária `toEn/toPt`, `Intl.PluralRules` | B | núcleo |

## 3. Conteúdo e camadas do idioma do site

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `fr/content.js:41-46,2765,2787` | `LEVELS`, `UNITS` ('A1-1'), `MODULES`, `LEVEL_TESTS` com português embutido | A+B | curso |
| `zh/content.js:7-11` | `LEVELS`, `UNITS` numéricas; sem módulos nem testes | A+B | curso |
| `fr/content.js` (campos) | Schema `f`,`t`; textos em português (`title`, `goal`, `body`, `whyNote`...) | A (schema) + B (texto) | idioma / curso |
| `zh/content.js` (campos) | Schema `c`,`p`,`t` | A | família cjk |
| `fr/content.js` (grammar.table) | Tabelas de conjugação com pronomes franceses | A | idioma |
| `shared/content-i18n.js:32` | `DEFAULT_LANG='pt-BR'`: português é a "fonte", inglês traduz | B | núcleo |
| `shared/content-i18n.js:38,49-103` | `SRC_KEYS` com `f`,`c`,`p`; ramo `hanzi` só zh | A | família |
| `shared/content-i18n.js:206-248` | Overlay `CONTENT_OVERLAYS[lang]`; sem overlay cai em pt-BR | B | núcleo |
| `fr|zh/content.en.js`, `fr/challenges.en.js` | Overlays gerados do inglês | B | curso |
| `fr/app.js:11156-11178,8932,11488` | Overlay de desafios, áudio guiado `.en.mp3`, `lang !== 'pt-BR'` | B | curso (fr×en) |
| `docs/i18n/content-en/`, `content-zh-en/` | Fontes das traduções | A+B | curso |
| `scripts/build-content-overlay.js`, `validate-content-overlay.js` | `site` fr/zh; convenção de pasta por idioma | A+B | família/curso |
| `scripts/build-challenges-overlay.js`, `validate-challenges-en.js` | Só `fr/` | A | curso (fr) |

## 4. Comparador de tradução só em português

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `shared/translation-compare.js:18-137` | Stopwords, pronomes, verbos em pt e en | B | idioma (do site) |
| `shared/translation-compare.js:148-169` | `LANGS`, `forLang` com fallback pt-BR, limiar 0.55 | B | núcleo+idioma |
| `fr/app.js:11118-11135,11194-11320` | Cópia antiga só em português ao lado do módulo novo (duplicação a remover) | B | idioma |
| `fr/index.html:4939` | Só fr carrega o comparador | A | curso (fr) |

## 5. Flashcards, fields, Anki, decks (shared/)

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `shared/flashcard-model.js:32` | `STUDY_LANG_FOR_APP_KEY` | A | idioma (derivável) |
| `shared/flashcard-model.js:41,46-47` | Tradução legada sempre pt-BR; títulos de origem em pt | B | núcleo |
| `shared/flashcard-model.js:334,880-1030` | Família por prefixo; ramo `isZh` com pinyin | A | família |
| `shared/flashcard-native-persistence.js:356-440` | `isZh`; `'pt-BR'` fixo no lado da tradução | A+B | família/núcleo |
| `shared/flashcard-field-editor.js:47-50,140-148,982` | Lista fechada de idiomas de Field (fr, zh, pt-BR) | A | núcleo |
| `shared/flashcard-cloze-editor.js`, `own-flashcards.js`, `teacher-flashcards.js` | Exigem pinyin para 'mandarim' | A | família cjk |
| `shared/my-flashcards.js:75-78` | Nomes de idioma em português usados como lógica | A+B | idioma |
| `shared/admin-flashcards.js`, `admin-students.js` | `isMandarim`, rótulos por appKey, direção `FLASHCARD_DIRECTION_LANGUAGE_LABELS` (strings pt como lógica) | A+B | família/curso |
| `shared/deck-browser.js:78-82`, `admin-reports.js:51`, `admin-notifications.js:179`, `public-deck.js:31-32` | Mapas fixos de rótulo/pasta por appKey (alguns sem portugues) | A | idioma |
| `shared/admin-analytics.js` | Abas/eventos de hanzi, conjugaison, ditado | A | idioma |
| `shared/anki-import.js:171-215,405` | Nomes de campo Anki em português como lógica; `lang:'zh'` fixo | A+B | família/idioma |
| `shared/anki-export.js:235,345` | Campo 'Tradução' como default | B | núcleo |
| `shared/study-trail-model.js` | Fields por appKey; tag `<appKey>-geral` e regex fixa; slugs em pt como lógica (`estudo`, `modulo-n`...) | A+B | família/núcleo |
| `shared/profile-placeholders.js` | Países com formas fr/zh/pt; `uiLang==='en'?'en':'pt-BR'` | A+B | idioma |
| `shared/roles.js:61` | Já inclui `portugues` | A | núcleo |
| `shared/notifications.js:109`, `reports.js:60` | Templates por idioma do site; label pt-BR literal | B | núcleo |

## 6. Edge Functions

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `tts-generate/tts_core.mjs:13-24,69-167` | `TTS_VOICES`, aliases, regras de fala por idioma | A | idioma/família |
| `tts-generate/index.ts:85-90` | Versão de regras por idioma (duplica `flashcard-model.js`) | A | idioma |
| `notification-cron/index.ts:92-95` | `LANGUAGES` fixo (duplica o registro) | A | idioma |
| `notification-cron/index.ts:128-135` | `MISSION_FIELD_BY_ID` (fr/zh) | A | idioma |
| `notification-cron/index.ts:202-258` | `LESSON_VOCAB_MAP` gerado à mão por curso | A | curso |
| `notification-cron/index.ts:666,680,712` | Fallbacks `'frances'` | A | núcleo |
| `notification-cron/index.ts` (`uiLangFor`, corpo do e-mail) | Textos pt/en fixos; templates por `ui_language` | B | núcleo |
| `report-reply-send/index.ts:50-54,114` | Nome do curso por appKey; rodapé só em pt | A+B | idioma/núcleo |
| `push-send/index.ts:75` | Fallback 'Notificação' | B | núcleo |

## 7. Migrations (`shared/supabase_migrations/001-074`)

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| 025, 026, 028, 031, 033, 049 | `CHECK (language_app_key in ('frances','mandarim','portugues'))` em 6 tabelas | A | núcleo (lista fechada) |
| 049, 050, 051, 053 | Funções com a mesma lista; `CASE` com nome do deck raiz em pt | A+B | idioma |
| 056 | `ui_language` CHECK `('pt-BR','en')`; semeia en copiando de pt | B | núcleo |
| 061, 071 | `CASE` fr/zh; `'pt-BR'` fixo; pinyin (sem ramo para pt) | A+B | família cjk |
| 070 | Lista fixa na visão de professora | A | núcleo |
| 073, 074 | `foreach` em `['frances','mandarim']` (sem portugues) | A | idioma |
| 010-030 | Seeds de templates repetidos por idioma, textos quase iguais | A+B | curso |
| 027, 028, 034, 040 e outras | Colunas/chaves de pinyin | A | família cjk |

## 8. PWA, rotas, deploy

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `fr|zh/manifest.json`, `shared/app-identity.json` | Nome, cores; `lang:'pt-BR'` fixo (gerados) | A+B | idioma |
| `scripts/generate_pwa_assets.py` | Já itera `apps` | A | núcleo |
| `fr|zh/service-worker.js` | Cache e precache fixos; overlay `.en` fora do precache; push com texto em pt | A+B | idioma/núcleo |
| `shared/router.js` | Rotas por hash, sem 404; independente de idioma | A | núcleo |
| `languages/fr|zh/index.html` | Redirecionamentos legados em pt | A+B | idioma |
| `teste-de-nivelamento-fr/`, `contrato/` | Páginas só em português | A+B | curso/núcleo |
| `CNAME` | Um domínio, sem subdomínio por idioma | A/B | núcleo |
| `.github/workflows/deploy-pages.yml`, `audio-tts.yml` | Listas fixas fr/zh; modo `ditados-en` só fr | A+B | idioma |
| `fr|zh/audio-manifest.js` | Áudio por idioma estudado (independe do site) | A | idioma |

## 9. Scripts de áudio/TTS

| Onde | O que varia | Eixo | Classe |
|---|---|---|---|
| `fr/scripts/challenges_pipeline/spoken_text.py` | Regras de fala fr/zh/pt, versão 5 | A | família+idioma |
| `fr/scripts/challenges_pipeline/tts.py:138-141` | Vozes por idioma | A | idioma |
| `fr/scripts/gen_guided_dictation_audio.py:65-80` | Vozes pt/en/fr; `DICTATION_UI_LANG` | A+B | curso |
| `fr/scripts/generate_missing_audio.py`, `list_missing_audio.js` | Ramo zh | A | família |
| `fr/scripts/` | Scripts de áudio de zh moram em `fr/scripts` (nome não reflete a função) | A | núcleo (mover) |

## 10. Testes que fixam fr/zh

21 arquivos carregam `fr/` ou `zh/` por caminho e 78 citam `frances`/`mandarim` (ids de unidade, textos, tags); testes de
paridade byte a byte do português (`tests/i18n/test_i18n_unit.js`), comparador contra `git show BASE:fr/app.js`, SQL de
fase com CHECKs e seeds. Classe: curso (caminhos e textos) e idioma (appKey). Na E1 a E5 devem passar a ler o registro.

## Contagem por classe (linhas das tabelas, ordem de grandeza)

| Classe | Linhas |
|---|---|
| núcleo | 53 |
| família | 39 |
| idioma | 55 |
| curso | 19 |
| total | 166 |

Por eixo: A ~106, B ~24, A+B ~36.

## Maiores riscos para o `pt` como idioma estudado

1. Seis CHECKs e quatro funções SQL com lista fixa; faltam ramos de `portugues` em 061/071 e no `foreach` de 073/074.
2. Duplicações com o registro: `APP_KEY_TO_LANG_ID`, `STUDY_LANG_FOR_APP_KEY`, `PUBLIC_DECK_LANG_*`, `LANGUAGES` do cron,
   `LANGUAGE_APP_KEY_TO_COURSE_NAME`, versão de regras de TTS (ts e js).
3. `LESSON_VOCAB_MAP` do cron gerado à mão.
4. Comparador de tradução duplicado (módulo novo e cópia antiga em `fr/app.js`).
5. Nomes de campo Anki e tags em português usados como lógica (não traduzir às cegas).
6. Overlay do site só existe para fr (desafios, áudio guiado `.en.mp3`) e zh; service worker não pré-cacheia `content.en.js`.
7. Portão `index.html`, `languages/*/index.html`, `teste-de-nivelamento-fr/` e e-mail de `report-reply-send` só em português.

## Pontos que não cabem direto nas etapas (débito explícito, R-01)

- Portão sem `shared/i18n` (site em inglês no portão): E7.
- Seeds de templates de notificação repetidos por idioma: E6.
- Scripts de áudio de zh dentro de `fr/scripts`: E4/E5.
- Módulo de Desafios/Ditados/Conjugação só em fr: decisão de produto já pendente da autora (aba de Desafios do chinês).
