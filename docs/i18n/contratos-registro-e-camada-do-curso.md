# Contratos da E0: registro de idiomas/cursos, camada do curso e relatório de confiança

Etapa E0 de `arquitetura-multi-idioma-cursos.md`. Contratos de dados, **sem código ainda**. As decisões Q-01 a Q-06
estão como **provisórias** (recomendação executada até a dona decidir; ver o fim deste arquivo).

## 1. Vocabulário congelado

| Termo | Significado |
|---|---|
| Idioma estudado | O que se aprende (`fr`, `zh`, `pt`). Id de URL, pasta e `registry`. |
| `appKey` | Nome interno gravado no banco (`frances`, `mandarim`, `portugues`). Não muda. |
| Idioma do site | Idioma da interface e das explicações (`pt-BR`, `en`, futuros). |
| Curso | Par (estudado × site). `courseId = "<appKey>@<idiomaDoSite>"`. |
| Conteúdo-base | O que é do idioma estudado e igual para todos os cursos dele (frases, hanzi, áudio, exercícios). |
| Camada do curso | O que depende do idioma do site: títulos, traduções, notas, contrastes, armadilhas, regras de correção. Tem autoria humana por par e pode acrescentar ou substituir. |
| Família | Grupo de comportamento (`latin`, `cjk`). |

## 2. Contrato do registro (`languages/registry.js`)

Um objeto por idioma estudado. Campos:

| Campo | Tipo | Obrigatório | Exemplo (fr) |
|---|---|---|---|
| `id` | string (URL) | sim | `"fr"` |
| `appKey` | string | sim | `"frances"` |
| `enabled` | boolean | sim | `true` (pt: `false` até a E7) |
| `family` | `"latin"` \| `"cjk"` | sim | `"latin"` |
| `locale` | BCP-47 do conteúdo | sim | `"fr-FR"` (zh: `"zh-CN"`, pt: `"pt-BR"`) |
| `flag` | emoji/arquivo | sim | `"🇫🇷"` (pt: `"🇧🇷"`) |
| `names` | `{ [idiomaDoSite]: string }` | sim | `{ "pt-BR": "Francês", en: "French" }` |
| `tts` | `{ voiceId, rate?, spokenTextRules? }` | sim | voz Chirp 3 HD do idioma |
| `hasLevelTest` | boolean | sim | `true` |
| `siteLanguages` | `string[]` | sim | fr: `["pt-BR","en"]`; pt: `["en"]` (Q-04) |
| `courses` | `{ [idiomaDoSite]: { status } }` | sim | `status` ∈ `rascunho` \| `beta` \| `publicado` |
| `entry` | caminho da pasta | sim | `"fr/"` |

Regras:
- Fonte única; nenhum mapa fixo de fr/zh pode sobrar no código compartilhado (E1).
- `siteLanguages` nunca contém o próprio idioma estudado.
- Idioma novo só aparece na interface se `enabled` e se o curso escolhido não estiver em `rascunho` (exceto admin).
- Conta: `_meta.courses = { [courseId]: { storageKey, startedAt } }` e `_meta.currentCourse`. Os cursos `frances@pt-BR` e
  `mandarim@pt-BR` apontam para `data.frances` e `data.mandarim`; os demais usam a própria chave (`data["frances@en"]`).
  Conta antiga sem `_meta.courses` é lida como se tivesse esses dois registros. Streak é da conta.

## 3. Contrato da camada do curso (`courses/<estudado>-<site>/`)

Um arquivo por unidade (Q-02): `courses/fr-en/units/<unitId>.js`, mais `index.js` (metadados do curso) e `rules.js`
(regras de correção do idioma do site, se houver).

Por unidade, o arquivo exporta `{ unitId, title, summary, items, notes, contrasts, traps, review }`:

| Campo | O que é | Pode substituir a base? |
|---|---|---|
| `title`, `summary` | Título e resumo da unidade na língua do site | é o único (a base não tem) |
| `items[<itemId>]` | `{ translation, hint? }` por frase/palavra | `translation` obrigatória; `hint` opcional |
| `notes[]` | Notas de realidade/culturais escritas para essa língua de origem | acrescenta; pode **substituir** nota-base marcada `replaceable` |
| `contrasts[]` | Contrastes com a língua de origem (ex.: falso cognato, ordem de palavras) | acrescenta |
| `traps[]` | Armadilhas de pronúncia/escrita típicas de quem fala a língua do site | acrescenta |
| `review` | Relatório de confiança (seção 4) | obrigatório |

Regras:
- Chaves de lógica (nomes de campo Anki, `unitId`, `lang`) ficam na base e **nunca** são traduzidas.
- Falta de texto (Q-03): `publicado` exige camada completa; `beta` mostra o texto-base no idioma estudado (nunca de outra
  língua de origem) com aviso discreto; `rascunho` só admin vê, e o painel lista o que falta.
- Uma camada é **escrita** para a língua de origem, não traduzida da portuguesa (premissa da dona).
- Durante a E2 o inglês atual (tradução) continua sendo exibido igual; é tratado como `beta` até a E9.

## 4. Relatório de confiança por item

Todo texto novo ou editado da camada traz, no campo `review` da unidade (ou do item, se só ele mudou):

```js
review: [
  { path: 'notes.2', confidence: 'alta'|'media'|'baixa', by: 'autora'|'agente:revisor-conteudo'|'nativo:<nome>',
    date: '2026-10-12', note: 'texto livre curto' }
]
```

- Itens `baixa` ou sem `review` impedem `publicado`.
- O resumo (contagem por nível, por unidade) é reportado no chat a cada entrega (regra de notas de realidade) e fica em
  `docs/historico/` (skill `registrar-entrega`).

## 5. Decisões Q-01 a Q-06 (provisórias, recomendação executada)

| Q | Decisão provisória |
|---|---|
| Q-01 | `languages/registry.js` estático + `_meta.courses` na conta. |
| Q-02 | Um arquivo por unidade, carregado sob demanda. |
| Q-03 | Regra de falta de texto da seção 3 (`rascunho`/`beta`/`publicado`). |
| Q-04 | Todos os idiomas de site, exceto o próprio idioma estudado. |
| Q-05 | Pasta por idioma estudado (`fr`, `zh`, `pt`); camada em `courses/<estudado>-<site>`. |
| Q-06 | Trocar o CHECK de idioma por regra aberta numa migration única, na E6. Até lá `portugues` já passa. |

Se a dona mudar alguma, atualizar esta tabela e `arquitetura-multi-idioma-cursos.md`.
