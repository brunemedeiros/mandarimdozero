# Contratos da E0: registro de idiomas/cursos, camada do curso e relatório de confiança

Etapa E0 de `arquitetura-multi-idioma-cursos.md`. Contratos de dados, **sem código ainda**. Revisão 2 (2026-10-12), já
incorporando a revisão do `plan-reviewer`. As decisões Q-01 a Q-06 estão como **provisórias** (ver seção 8).
Inventário que embasa estes contratos: `inventario-pontos-de-variacao.md`.

## 1. Vocabulário congelado

| Termo | Significado |
|---|---|
| Idioma estudado | O que se aprende (`fr`, `zh`, `pt`). Id de URL, pasta e registro. |
| `appKey` | Nome interno gravado no banco (`frances`, `mandarim`, `portugues`). Não muda. |
| Idioma do site | Idioma da interface e das explicações (`pt-BR`, `en`, futuros). Tem registro próprio (seção 3). |
| Curso | Par (estudado × site). `courseId = "<appKey>@<idiomaDoSite>"`. |
| Conteúdo-base | O que é do idioma estudado e igual para todos os cursos dele (frases, hanzi, áudio, exercícios). |
| Camada do curso | O que depende do idioma do site. Autoria humana por par; pode acrescentar e **substituir** (inclusive itens da base). |
| Família | Grupo de comportamento (`latin`, `cjk`). |

## 2. Registro de idiomas estudados

**Formato (B1):** a fonte é `languages/registry.json` (dados puros). Lido pelo navegador (via `languages/registry.js`, que o
expõe como global e mantém a API atual de `languages/index.js`), pelo Deno (Edge Functions) e pelos scripts Node/Python.
Cópias que não leem o JSON (SQL das migrations, workflows, `shared/app-identity.json`) ficam **declaradas** em
`docs/i18n/copias-do-registro.md` (criado na E1), cada uma com o teste de sincronia que a confere. A V-02 passa a varrer
também `supabase/functions/` e `scripts/`, não só `shared/`.

| Campo | Tipo | Obrigatório | Exemplo (fr) |
|---|---|---|---|
| `id` | string (URL) | sim | `"fr"` |
| `appKey` | string | sim | `"frances"` |
| `enabled` | boolean | sim | `true` (pt: `false` até a E7) |
| `family` | `"latin"` \| `"cjk"` | sim | `"latin"` |
| `locale` | BCP-47 | sim | `"fr-FR"` (zh `"zh-CN"`, pt `"pt-BR"`) |
| `fieldLang` | string | sim | idioma do Field do estudado: `"fr"`, `"zh"`, `"pt"` (**não** `pt-BR`, para não colidir com o lado da tradução) |
| `path` | string | sim | `"fr/"` (mesmo nome usado hoje em `languages/index.js`) |
| `name`, `nativeName` | string | sim | mantidos como hoje |
| `names` | `{ [idiomaDoSite]: { short, course } }` | sim | `short` ("Chinês" no portão, "Mandarim" em rótulos de deck, quando diferirem); `course` ("Francês com Prof. Brune") |
| `flagSvg` | caminho do SVG | sim | **SVG, não emoji** (Windows não desenha bandeira em emoji). Emoji só como `flagEmoji` opcional |
| `accent`, `icon` | como hoje | sim | |
| `brand` | `{ appName, themeColor, manifestLang }` por idioma do site | sim | origem de `shared/app-identity.json` |
| `tts` | `{ voice, baseRate, spokenRulesVersion }` | sim | a versão migra **byte a byte** (ver abaixo) |
| `modules` | `string[]` | sim | módulos do idioma: `desafios`, `conjugacao`, `hanzi`, `ditados`... (fr hoje: desafios, conjugação, ditados; zh: hanzi) |
| `hasLevelTest` | boolean | sim | |
| `siteLanguages` | `string[]` | sim | fr: `["pt-BR","en"]`; pt: `["en"]` (Q-04) |
| `courses` | `{ [idiomaDoSite]: { status, legacyFallback?, notice? } }` | sim | `status` ∈ `rascunho` \| `beta` \| `publicado` |

Regras:
- `layerDir(courseId)` e `courseIdOf(id, siteLang)` são as **únicas** funções que convertem entre `courseId`
  (`frances@pt-BR`) e pasta (`courses/fr-pt-BR`). Nada monta caminho por concatenação. Funções `studyLangOf`/`folderOf`/`appKeyOf`
  também saem do registro.
- `siteLanguages` nunca contém o próprio idioma estudado.
- **TTS (item 13):** `spokenRulesVersion` entra na chave de geração do áudio; ao migrar para o registro a string da chave
  não pode mudar, com teste que compara a chave antes/depois. Divergência a resolver na E1: Python em `5`, TypeScript em `fr: 4`.
- **Quem vê `rascunho`:** só admin e professora (valor único em toda a documentação). No GitHub Pages isso é só
  cosmético: os arquivos continuam acessíveis pela URL. Conteúdo sensível não vai em `rascunho` no repositório público.
- Fallback atual de `pt-BR` sem overlay continua valendo para o legado (seção 4, `legacyFallback`).

## 3. Registro de idiomas do site (novo)

`languages/site-languages.json`: um objeto por idioma do site.

| Campo | Exemplo (`en`) |
|---|---|
| `id` | `"en"` (`pt-BR`, futuros) |
| `selectable` | `true` (`es` fica `false`, congelado) |
| `names` | `{ "pt-BR": "Inglês", en: "English" }` |
| `browserMatch` | prefixos do navegador que sugerem o idioma (`["en"]`), substitui `startsWith('en') ? ...` |
| `pluralRule` | `"one-other"` (regra por `n===1`, ver `.claude/rules/i18n.md`) |
| `comparator` | chave do módulo do comparador de tradução, se houver (`pt-BR`, `en`) |
| `dictationVoice` | voz da introdução dos ditados |

Dele saem: `UI_LANGS`, `ACCOUNT_UI_LANGUAGES`, as `<option>` hoje escritas à mão nos dois HTML, a confirmação de troca
(hoje binária `toEn/toPt`) e o CHECK de `ui_language` (migration 056, tratado na E6 junto com Q-06).
**Adicionar um idioma de site** é um procedimento próprio (checklist na E8): catálogo `shared/i18n/<id>.js`, registro,
comparador, templates de notificação, voz, camada de cada curso.

## 4. Camada do curso (`courses/<estudado>-<site>/`)

Arquivos: `index.js` (metadados do curso **e títulos e resumos de todas as unidades**, carregado de uma vez, porque
Trilha, revisão, Decks e checkpoint precisam deles juntos), `units/<unitId>.js` (carregado sob demanda, Q-02),
`challenges.js` (overlay de desafios/ditados, quando o idioma tem o módulo), `rules.js` (regras de correção).
Todos os arquivos entram no precache do service worker do idioma (corrige o furo atual de `content.en.js` fora do precache).

`index.js` exporta `{ courseId, status, levels, modules, levelTests, unitTitles }` (o que hoje fica em `levels`,
`modules`, `levelTests` do overlay).

Cada `units/<unitId>.js` exporta:

| Campo | O que é |
|---|---|
| `unitId` | id da unidade da base |
| `title`, `goal` | título e objetivo (nomes iguais aos da base, `goal`, não `summary`) |
| `lessons[]` | títulos e textos de lição |
| `vocab`, `phrases` | traduções por **id estável do item**; durante a transição aceita também **índice** (Dv-2/Q-08), com a forma marcada em `keyBy: 'index'|'id'` |
| `phrases[].scenario` | cenário localizado |
| `concepts`, `grammar`, `trueFalse` | textos de conceitos, gramática e "verdadeiro ou falso" |
| `notes[]` | notas de realidade/culturais para essa língua de origem; acrescentam |
| `contrasts[]`, `traps[]` | contrastes e armadilhas típicas de quem fala a língua do site |
| `overrides` | **substituições de item da base** (ex.: zh troca 巴 por 美; frase-modelo "Je suis américaine" localizada). Cada uma: `{ target, replacement, reason }` |
| `review[]` | relatório de confiança (seção 6) |

Regras:
- A camada pode substituir qualquer texto de **exemplo** da base via `overrides`; nunca substitui chaves de lógica
  (`unitId`, nomes de campo Anki, `lang`), que ficam na base e nunca são traduzidas.
- Campos obrigatórios para `publicado`: `title`, `goal`, tradução de todo `vocab`/`phrases`, ao menos 1 entrada de
  `review` por nota e `status` de aprovação (seção 6). O script da E2 usa exatamente esta lista.
- **Falta de texto:** `publicado` exige camada completa; `beta` mostra o texto-base no idioma estudado (nunca de outra
  língua de origem) com aviso discreto, **exceto** quando `legacyFallback: 'pt-BR'` e `notice: false`: é o estado do
  curso em inglês atual durante a E2 até a E9 (Dv-3), com comportamento idêntico ao de hoje (cai no português, sem aviso).
  Essa é uma exceção escrita à premissa P3 e some quando a E9 terminar. `rascunho`: ver seção 2.
- A camada é **escrita** para a língua de origem, não traduzida do português.
- Fontes antigas (`docs/i18n/content-en/`, `content-zh-en/`) e geradores (`scripts/build-content-overlay.js`,
  `validate-*`, `build-challenges-overlay.js`) são aposentados na E2 e apagados ou marcados como obsoletos, para não
  haver duas verdades.

## 5. Conta, progresso e idioma do site

- `_meta.courses = { [courseId]: { storageKey, startedAt } }` e `_meta.currentCourse`.
- `frances@pt-BR` e `mandarim@pt-BR` apontam para `data.frances` e `data.mandarim`; os demais usam a própria chave
  (`data["frances@en"]`).
- **Conta antiga sem `_meta.courses`:** o registro é montado **só para os blocos que existem** (`data.frances` presente
  gera `frances@pt-BR`; `data.mandarim` presente gera `mandarim@pt-BR`). `startedAt` fica `null` nessas contas.
- **Quem manda:** `_meta.uiLanguage` é a preferência da conta e vale em todos os idiomas estudados; o curso é derivado dele
  e do idioma estudado da página aberta (`courseId = appKey da página + uiLanguage`). `_meta.currentCourse` e
  `_meta.currentLearningLanguage`/`last_language` são **cache/atalho derivados**, nunca fonte. Trocar o idioma do site em
  `/fr` muda o curso aberto em `/zh` na próxima visita (cada par tem o próprio progresso, como no Duolingo).
- **Idioma do site inválido para o idioma estudado** (ex.: conta com `pt-BR` abre `/pt`, que só aceita `en`): o site
  abre em `en` **só naquela página**, sem alterar a preferência da conta, com aviso discreto. A confirmar na Q-24.
- Streak é da conta.
- **Chave no servidor, tabela por tabela** (a preencher e conferir na E3 com `list_tables`): hoje `weekly_xp` (PK
  `user_id, week_start, language_app_key`), `earned_badges`, `notifications`, `teacher_students` e `decks` são por
  `appKey`, **não** por `courseId`. A E3 decide, por tabela, se continua por `appKey` ou passa a `courseId`; XP por curso
  só vale no cliente até lá.

## 6. Relatório de confiança

Todo texto novo ou editado da camada traz uma entrada de `review`:

```js
{ id: 'note-realidade-3', confidence: 'alta'|'media'|'baixa',
  by: 'autora'|'agente:revisor-conteudo'|'nativo:<nome>', date: '2026-10-12',
  approval: 'needs_review'|'aprovado', note: 'texto livre curto' }
```

- Referência por **id** do item, não por índice (reordenar não quebra).
- Regra validável: sem revisão `nativo:*` ou `autora`, `confidence` é no máximo `media` (R-32).
- `publicado` exige `approval: 'aprovado'` em tudo e nenhum `baixa`. Texto novo entra como `needs_review`
  (`.claude/rules/i18n.md`).
- Resumo por nível reportado no chat a cada entrega e arquivado em `docs/historico/` (skill `registrar-entrega`).

## 7. Mapa de pontos do inventário para etapas (donos)

Pontos sem dono na primeira versão da arquitetura, agora atribuídos (a arquitetura deve ser atualizada na aprovação):

| Ponto | Etapa |
|---|---|
| Migrations 061, 071, 073, 074 (ramos e `foreach` sem `portugues`) | E6 (junto com 059, 070, 037) |
| `notification-cron`: `LESSON_VOCAB_MAP` (gerado a partir da base), `MISSION_FIELD_BY_ID`, `LANGUAGES` | E6 |
| `deploy-pages.yml:45` (`sed __BUILD_ID__` em lista fixa) e `audio-tts.yml` | E7 |
| `LEVEL_DESCRIPTIONS`, badges presos a `A1`, pools de missões, `mandarim_hide_pinyin` | E5 |
| Namespaces `fr.*`/`zh.*` e novo `pt.*` no catálogo | E5 |
| `teste-de-nivelamento-fr/`, `contrato/`, `languages/*/index.html`, `report-reply-send`, `push-send`, portão sem i18n | E7 |
| `my-flashcards.js:75-78`, `anki-import.js` (nomes em português como lógica) | E4 (cobertos por teste, não por lint) |
| Aposentar geradores/fontes do overlay antigo | E2 |
| Adicionar um idioma do site (procedimento) | E8 |
| CHECK `ui_language` (056) | E6 (com Q-06) |

## 8. Decisões Q-01 a Q-06 (provisórias, recomendação executada)

| Q | Decisão provisória |
|---|---|
| Q-01 | Registro estático (`registry.json` + global) e `_meta.courses` na conta (seções 2 e 5). |
| Q-02 | Um arquivo por unidade sob demanda, mais `index.js` com títulos de todas (seção 4). |
| Q-03 | Regras de falta de texto da seção 4, com exceção `legacyFallback` até a E9. |
| Q-04 | Todos os idiomas de site, exceto o próprio idioma estudado. |
| Q-05 | Pasta por idioma estudado (`fr`, `zh`, `pt`); camada em `courses/<estudado>-<site>`, só via `layerDir()`. |
| Q-06 | CHECK aberto numa migration única, **adiada** até o primeiro idioma depois do `pt` (Dv-4); `portugues` já passa hoje. |
| Q-24 (nova) | Idioma do site não aceito pelo idioma estudado: abrir em `en` só na página, sem mudar a conta. |

Observação: as contagens do inventário são ordem de grandeza e não servem como métrica de "pronto". Quando a dona
aprovar a E0, acrescentar uma linha de 2026-10-12 ao histórico da arquitetura (§15).
