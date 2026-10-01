# Public Decks -- auditoria técnica e contrato implementável (v5)

Somente documentação. Nenhum código, migration, RPC, RLS, rota ou UI foi alterado nesta etapa. Mantém tudo local
(sem push, PR, deploy; migrations 059 e 060 **não aplicadas**).
**Fontes:** `docs/arquitetura-total-decks-tags-painel.md` ("AT §n"), `docs/public-decks-auditoria.md` (v3, regras
fechadas e pendências -- **continua válido**, este documento o complementa com a auditoria do código atual e o
transforma em contrato técnico), `docs/identidade-username-tag-auditoria.md` (Parte IV, identidade **fechada**).
Rótulos: **FECHADO** (decidido pela fonte), **RECOMENDAÇÃO** (proposta técnica, precisa de confirmação de Produto),
**PENDENTE** (ninguém decidiu; não foi inventado).

## 0. Estado da fase anterior (Identity) -- fechada
`user_id` = identidade; `username` = identificador público gerado (`u`+10 hex), imutável; `display_name` =
apresentação; `criado-por-[username]` = representação persistente da autoria, **nunca** fonte de verdade
(a lógica interna usa `user_id`; o servidor deriva a tag do `user_id` do dono da fonte). Verificado nesta etapa:
Playwright da edição de perfil 22/22 (FR+ZH); nenhum fluxo cria 2 identificadores por conta (PK em `profiles.user_id`;
`ON CONFLICT` não troca username; novo trigger recusa apagar profile de conta existente); Postgres local 60/60.

## 1. Auditoria do estado atual (verificada no código/migrations)

### A. Public Profile (existe)
- Rota `#/user/<username>` (`shared/router.js`, tipo `publicProfile`); página standalone sem login e modal no app
  (`shared/public-profile.js`: `renderPublicProfileInto`, `openPublicProfilePage`, `renderStandalonePublicProfile`).
- RPC `get_public_profile_stats(p_username)` (SECURITY DEFINER, anon+authenticated): só se `profiles.public_profile=true`;
  devolve agregados por idioma (pct, nível, XP, streak, lastStudyDay). Identidade/badges são legíveis por
  `profiles_public_read`. Nada de FSRS/due/estados.
- `public_profile` é interruptor **da conta** (default `true` desde a 041).

### B. Public Flashcards (existe, **Legacy**)
- `get_public_flashcards(p_username, p_language_app_key)` (038/043, +tags na 056): lê `own_flashcards` com
  `status='active'` e `hidden_from_profile=false`; devolve `id, front, frontPinyin, backTrans, note, frontIsTargetLanguage, tags`.
- **Não devolve** `fields`, `card_generation_mode`, mídia por Field, nem `deck_id`: o conteúdo público é a projeção
  Legacy (espelho `front`/`back_trans`). Um cartão nativo Cloze/MC/Type Answer aparece público como um flip simples
  (**ou vazio/incorreto**, pois o espelho é posicional). Isso não pode ser perpetuado.
- A UI (`importSelectedPublicFlashcards`) lista cartões soltos por idioma, importa via `copy_public_flashcard`
  (060, local) com preview estático próprio (`openPublicFlashcardPreview`, 3º renderer informal).
- `get_public_flashcards` expõe `note` (campo livre do dono, "nota privada" no editor nativo) -- **possível vazamento
  de conteúdo não pretendido** (ver §14, risco R4).

### C. `decks.is_public` (existe só como coluna)
- Coluna `boolean not null default false` (049). Nenhum código cliente a lê ou escreve (grep: só migrations/testes).
  Nenhuma policy/RPC pública sobre Decks. `decks` só tem RLS de dono/professora/admin/curso (`decks_course_select`):
  **um visitante não consegue ler nenhum Deck por RLS**.
- Trigger `decks_validate_hierarchy` recusa `is_public` em `root`, `teacher_root`, `teacher` e `course`.
  **Lacuna real: `personal_root` ("Meus Decks") NÃO é recusado** -- um dono pode hoje marcar `personal_root` como
  público via API (policy `decks_owner_write` cobre só `kind='personal'`, mas o bootstrap/admin e o trigger permitem).
  Hoje `decks_owner_write` impede o dono comum de escrever `personal_root`; ainda assim a regra "personal_root nunca
  público" **não está no banco** e precisa ser (§4).
- `personal` pode ser público livremente; nada impõe relação com ancestrais/filhos.

### D. O que falta para Public Deck
Metadados (descrição, ícone, cor, última atualização); RPCs públicas de leitura (página do Deck, lista no perfil);
RPC de publicar/despublicar com validação; contagem de Notes; rota; página; renderização nativa de Notes públicas;
RPC de cópia de Deck (generalização de `copy_public_flashcard`); gate Free/Premium; reports; testes.

### E/F. Legacy x Native
- Legacy: o espelho `front`/`back_trans`/`front_pinyin`, `get_public_flashcards`, `hidden_from_profile` (eixo por
  cartão), o preview público, o export por link.
- Native: `fields`+`card_generation_mode`+`tags`+`deck_id` em `own_flashcards`; `buildEngineCardsFromRow` (motor),
  os 4 renderers (`renderNormalCard`/`renderMultipleChoiceCard`/`renderTypeAnswerCard`/`renderClozeCard`), parser de
  Cloze, `resolveCardField`/`resolveFieldAudioUrl`, Preview (`shared/flashcard-preview.js`), Anki export.
- `own_flashcards` **não tem `updated_at`** (só `created_at` e `revision`): "última atualização" não é derivável hoje.

### G. RPCs/policies a criar ou alterar
Ver §6 e §7. Resumo: trigger de `is_public` (personal_root, fonte pública exige dono com perfil público), colunas de
metadado em `decks`, RPCs `publish_deck`/`unpublish_deck`/`get_public_deck`/`list_public_decks`/
`get_public_deck_notes`/`copy_public_deck`, `updated_at` em Notes, extensão de `get_public_profile_stats`
(ou RPC irmã) para listar Decks públicos, revisão de `copy_public_flashcard` (reuso).

### H. Rotas hash-based
Existem: `#/user/<u>`, `#/review/deck/<id>`, `#/unit/...`. Falta: `#/deck/<id>` (§8). `hashToRoute` hoje trata
`parts[0]==='deck'` como aba desconhecida; `routeToHash` não conhece o tipo. O guard de auth precisa permitir a rota
pública sem sessão como já faz com `#/user/<u>` (`shared/auth.js`).

### I. Componentes reutilizáveis
Roteador/guard de `publicProfile`; `renderPublicProfileInto` (container-agnóstico); os 4 renderers + Preview
(`shared/flashcard-preview.js`); `buildEngineCardsFromRow`; `getDeckCounts`/`generatedCardInstanceCount`
(`shared/deck-engine.js`); `preflightOwnCardInstanceCreation`; `resolveOwnCreationDeck`; `copyPublicFlashcard`;
`openReportModal`; chips de tag; `.pill`/`.admin-badge-row`/`.profile-edit-*` (zero CSS novo quando possível).

## 2. Publicação de subtree -- análise (NÃO implementar até Produto confirmar)
Base: AT §18 diz "Cards do Deck" sem definir subtree; AT §3.2 define subtree só para estudo, §5.4 para exclusão.
Modelo de dados: a Note pertence a **um** Deck (`deck_id`); descendentes são Decks filhos.

| Critério | A. só o Deck (Notes diretas; filhos nunca) | B. Deck + toda a subtree (automático) | C. só Cards diretos (= A nos dados) | D. flag por Deck; página = Deck + descendentes que **também** são públicos |
|---|---|---|---|---|
| Cópia | copia só as Notes diretas | copia tudo | = A | copia Notes diretas + subdecks públicos |
| Contagem de Notes | só `deck_id = X` | `deck_id ∈ subtree(X)` | = A | diretas + das subdecks públicas |
| Decks filhos | ignorados (inclusive públicos) | todos aparecem, inclusive privados | = A | só os públicos |
| Permissões | 1 flag a validar | 1 flag, mas o efeito se propaga: validar a subtree inteira | = A | validar cada flag |
| Edição posterior do dono | nova Note em X vira pública; em filho, não | nova Note/subdeck sob X vira pública **sem aviso** | = A | nova Note em deck público vira pública; subdeck novo nasce privado |
| Unpublish | despublica 1 Deck | despublica tudo? ou só X? (ambíguo) | = A | despublicar X não altera filhos públicos (viram raízes públicas soltas) |
| Atribuição | por Note, independe | idem | idem | idem |
| Performance | consulta simples | CTE recursiva sobre `parent_deck_id` por visita/cópia | = A | CTE recursiva filtrada |
| Risco de expor sem querer | **baixo** | **alto** (mover/criar sob um Deck público publica) | baixo | médio-baixo (publicar é sempre ato explícito por Deck) |

**RECOMENDAÇÃO: D** -- cada Deck é publicado por ato explícito (flag própria); a página de um Deck público mostra suas
Notes diretas e lista os **subdecks que também são públicos**; copiar copia o mesmo escopo. Evita publicação acidental
(mover um Deck privado para baixo de um público não o expõe) e preserva "N Notes" como fórmula simples e verificável.
Alternativa fiel ao texto literal de AT §3.2 (estudo = subtree) é **B**, mais conveniente mas com o maior risco de
exposição. **Aguardando confirmação.** Nada abaixo depende da escolha além dos itens marcados *(subtree)*.

## 3. Modelo de dados do Public Deck
Princípio: `decks.is_public` sozinho **não é suficiente** (não carrega metadado, nem prova de que a regra foi
validada, nem controla nome/descrição públicos). Mas **não** criar entidade nova: Public Deck continua sendo o mesmo
`decks` (`kind='personal'`, AT §18/inv.), com colunas **aditivas**.

| Dado | Existe? | Fonte | Decisão |
|---|---|---|---|
| Deck público | `decks.is_public` | coluna | reutilizar |
| Nome | `decks.name` | coluna | reutilizar (renomear mantém o mesmo Deck, AT §19.1) |
| Idioma | `decks.language_app_key` | coluna | reutilizar |
| Autor | `decks.owner_id` → profile | join | derivado (username/display_name) |
| Nº de Notes | -- | **derivado** | `count(own_flashcards)` por escopo (§11); sem coluna |
| Descrição | não | **coluna nova** `public_description text` (≤ 280) | nullable |
| Ícone | não | **coluna nova** `public_icon text` | lista fechada (CHECK/tabela de constantes), sem upload |
| Cor | não | **coluna nova** `public_color text` | lista fechada |
| Publicado em | não | **coluna nova** `published_at timestamptz` | ordenação; limpa ao despublicar |
| Última atualização | não derivável (Notes sem `updated_at`) | **`own_flashcards.updated_at`** + trigger (nova coluna) | `max(updated_at)` no escopo; decisão pendente sobre o que conta como atualização (§17) |
| Identificador público | `decks.id` (bigint) | coluna | RECOMENDAÇÃO: usar o próprio `id` (§8) |

Metadados com prefixo `public_` e `CHECK` coerente: só podem existir quando `is_public`. Índices: parcial
`decks (owner_id) where is_public`, `decks (language_app_key, published_at desc) where is_public`; `own_flashcards
(deck_id)` já existe. **Upload de imagem: fora de escopo** (lista fechada de ícone/cor).

## 4. Permissões (servidor, nunca só UI)
| Ator | Pode |
|---|---|
| Owner | publicar/despublicar Deck `kind='personal'` seu (RPC), alterar metadados públicos, apagar o Deck (regras de AT §5.4), editar Notes normalmente |
| Outro autenticado/visitante | ler **apenas** via RPC pública (SECURITY DEFINER, anon+authenticated) que filtra por `is_public` + dono com `public_profile`; **sem** write algum |
| Premium | idem + copiar (§12) |
| `personal_root`, `root`, Course, Teacher, `teacher_root` | **nunca** públicos (trigger recusa; hoje `personal_root` não é recusado -- corrigir) |

Regras a pôr no banco (trigger `BEFORE INSERT/UPDATE` em `decks`): `is_public` só em `kind='personal'`; metadados
`public_*` só com `is_public`; a escrita direta de `is_public`/`public_*` pelo dono **vai por RPC** (revogar do UPDATE
direto via trigger que compara OLD/NEW para `authenticated`, como feito com `username`), para que publicar sempre passe
pela validação (idioma, kind, dono, perfil público ligado, nome não vazio). *(subtree)* a RPC valida o escopo conforme
a decisão do §2.

## 5. Perfil público
- `#/user/<username>` e sem login: **inalterados**. Acrescentar uma seção "Decks públicos" lendo uma RPC pública
  (nova, ou ampliar `get_public_profile_stats`) que devolve, por Deck: `id, name, language, icon, color, notes, updatedAt`.
- Mantém XP/streak/progresso (decisão da autora, v3 §5.1). **Não** expõe FSRS, due, New/Learning/Review pessoais,
  Teacher Cards, Notes não publicadas.
- `public_profile=false`: o perfil não responde (comportamento atual); Decks públicos do dono **não** aparecem nem
  abrem (RECOMENDAÇÃO: o interruptor da conta vence; reativar restaura sem perder `is_public`). **PENDENTE** de
  confirmação (v3 pendência 9).
- A listagem solta de cartões por idioma (`get_public_flashcards`, `hidden_from_profile`) -- v3 pendência 4: AT §20
  fala de **Decks públicos**, não cartões soltos; RECOMENDAÇÃO: congelar a lista solta e, quando Public Deck
  existir, aposentá-la (PENDENTE de confirmação). `hidden_from_profile` passa a ser irrelevante para Public Deck
  (publicação é por Deck).

## 6. Rotas
`#/deck/<id>` (RECOMENDAÇÃO), coerente com `#/review/deck/<id>` (id numérico do Deck) e `#/user/<u>`. Estável sob
renomeação do Deck e do `display_name`; username **não** é parte da identidade do Deck (só aparece como "autor").
O resolvedor valida na RPC (`is_public` + perfil público); id inexistente, privado ou despublicado devolvem a **mesma**
resposta "indisponível" (não vaza existência de Deck privado). `hashToRoute`/`routeToHash`/guard de `auth.js` ganham
um tipo `publicDeck`. Ids sequenciais são enumeráveis, mas só expõem o que já é público; se Produto exigir id opaco,
trocar por `public_id` (uuid) é aditivo. **PENDENTE:** confirmar id sequencial vs. opaco.

## 7. Visibilidade, publicar, despublicar
| Evento | Comportamento (RECOMENDAÇÃO, salvo menção) |
|---|---|
| Privado | invisível; RPC pública devolve "indisponível" |
| Publicar | RPC valida e seta `is_public`, `published_at`, metadados; vira visível no perfil e na rota |
| Despublicar | `is_public=false`, limpa `published_at`/metadados públicos; rota/perfil passam a "Deck indisponível" (**mesma** página para inexistente/privado); **cópias já feitas ficam intactas** (FECHADO v3 §5.2) |
| Dono exclui Deck | some tudo; cópias intactas (FECHADO); `deck_id` das Notes segue `on delete set null` (regra de exclusão AT §5.4 vale antes) |
| Dono edita conteúdo | o Deck continua o mesmo; `updated_at` das Notes avança (AT §19.1); quem copiou precisa reimportar |
| Dono muda `display_name` | nada muda (URL e atribuição usam `username`/`user_id`) |
| Dono desativa `public_profile` | ver §5 (PENDENTE) |

## 8. Conteúdo nativo (crítico)
Contrato: o Public Deck serve **Notes nativas** (`fields`, `card_generation_mode`, `tags`, mídia por Field), nunca o
espelho Legacy. A RPC `get_public_deck_notes(deck_id)` devolve, por Note, **somente**: `id, language_app_key,
fields (conteúdo+idioma+role+pinyinFieldId+audio/image), card_generation_mode, tags` -- **sem** `note` (campo
livre do dono, ver R4), **sem** `status`, `revision`, FSRS, `owner_id`, `deck_id`. O cliente monta cards com a mesma
`buildEngineCardsFromRow` e desenha com os **mesmos 4 renderers**, via o contrato `renderer(mountEl, card, localState,
callbacks)` já usado pelo Preview (`__isPreviewCard`; `callbacks` no-op; sem `registerAudioPlay`). Cobertura:
- Normal, Normal com reverso (2 CardInstances da mesma Note, sufixo `-b`), Digite a resposta, Cloze (parser central,
  1 CardInstance por marca), Múltipla escolha (distratores nativos, 1–3): vêm de `fields`/`card_generation_mode`.
- Áudio por Field e imagem: `field.audio`/`field.image` (URLs públicas do bucket `flashcard-media`). Risco: os paths
  contêm o `auth.uid()` do dono (R3). `storagePath` do TTS **não** deve ir na resposta pública (só a URL resolvida).
- Cards legados (linha sem `fields`): a RPC os converte pelo **mesmo** `interpretNoteFromRow` no cliente, ou os
  marca "somente flip" -- **PENDENTE** (como tratar Legacy no público: converter no servidor é proibido pela regra
  "nunca converter em massa").
Reuso: `shared/flashcard-preview.js` é a base; a página do Deck é um "Preview em lote" read-only. **Não** criar
terceiro renderer (o preview estático atual `openPublicFlashcardPreview` deve ser aposentado).

## 9. Contagem
- **Deck público mostra "N Notes"** (AT §18). Fórmula: `N = count(own_flashcards)` com `deck_id ∈ escopo(D)`,
  `status='active'` (arquivadas e `hidden_from_profile` **não** contam e **não** são servidas -- *(subtree)* escopo =
  `{D}` na recomendação D, ou `subtree(D)` em B). Reverse = 1 Note; Cloze = 1 Note; MC/Type Answer = 1 Note.
- **Limite Free usa CardInstances** (AT §17): `Σ generatedCardInstanceCount(nota)` -- a mesma função do motor, não
  a contagem pública. Os dois números nunca se misturam na UI ("N Notes" no Deck público; "N Cards" só no aviso de
  importação/corte).

## 10. Free / Premium (mapeado; limite atual intocado)
Segue v3 §9: visitante e Free veem existência do Deck (nome, autor, ícone/cor, nº de Notes -- granularidade fina é
PENDENTE 6.6); **abrir/importar = Premium** (AT §18.2). Premium importa sem o teto de 20. Ações que exigem login:
copiar/importar, reportar (a decidir se visitante pode), abrir a página (**PENDENTE**: AT §18.2 diz que Free
"não pode abrir"; visitante anônimo não é tratado). **Tensão a resolver (não resolvida aqui):** AT §17 descreve o
corte "criaria N, só os primeiros 20" para importação de Deck, mas AT §18.2 proíbe Free de importar; portanto o corte
só se aplica se Free puder importar (parcialmente) ou a vínculo/Premium sem teto -- **PENDENTE** de Produto.
Corte por Note vs por Card (v3 pendência 3-bis): nunca gerar meia Note silenciosamente.

## 11. Cópia e atribuição
Generalizar `copy_public_flashcard` (060), não criar lógica paralela: `copy_public_deck(deck_id, dest_deck_id,
…)` chama o **mesmo** núcleo (função interna única que valida a fonte, deriva a atribuição do `user_id` do dono,
descarta tags do cliente, grava Note nativa independente). Regras (FECHADAS): cópia independente, sem live link,
sem `source_*`; `criado-por-[username]` do autor **original** (cópia de cópia mantém só a original, reutilizando a
tag já existente na fonte); Reverse/Cloze compartilham (mesma Note); importador não altera atribuição;
Tags comuns copiam (limite 19 + a de sistema); destino = `Meus Decks` ou subdeck pessoal (AT §24), validado por
`canPlaceOwnNoteInDeck`. Importação em lote deve ser **atômica por chamada** (uma RPC, uma transação).

## 12. Reimportação / duplicatas
AT §19.1/§23: detectar Deck/Notes semelhantes, avisar, oferecer merge/inserir, nunca duplicar silenciosamente;
AT removeu "Já adicionado". **PENDENTE (subfase própria):** algoritmo de similaridade (unidade, normalização,
Cloze, mídia). Nesta fase só o contrato: o front **não** deve criar Notes se a RPC sinalizar candidatas; a RPC de
cópia recebe `on_duplicate = 'ask' | 'skip' | 'create_anyway'` (default `ask`, que devolve candidatas em vez de criar).

## 13. Tags
Tags pertencem à Note, irmãs compartilham. `criado-por-*` é de sistema e já protegida (060). A cópia carrega as
tags comuns do autor e a atribuição; **colisão** entre uma tag comum do autor e do importador não gera atribuição
(só a RPC emite `criado-por-*`, validada por `is_attribution_tag`). Tags do autor ficam visíveis dentro dos Cards;
**sem** lista/contagem de Tags como hierarquia pública (AT §18).

## 14. Reports
Reuso de `reports` + `openReportModal(extraContext)` (já usado como `source:'public_profile_flashcard'`). Sem nova
tabela: `reports.context jsonb` comporta `{source:'public_deck'|'public_deck_note', deck_id, note_id,
author_user_id, author_username}`. `category='erro_conteudo'` já existe. O `user_id` do reporter já é gravado.
Faltará: botão de reportar na página do Deck e por Note (UI), e o `admin-reports.js` exibir o contexto (já exibe
`context`). Migration só se Produto quiser categoria "conteúdo impróprio" (**PENDENTE**).

## 15. Matriz de testes planejada
- **Publicação:** personal público ok; `personal_root`/Course/Teacher/`teacher_root`/`root` recusados (Postgres, trigger);
  não-dono recusado; UPDATE direto de `is_public` por `authenticated` recusado (só RPC); metadados sem `is_public` recusados;
  idioma/kind validados; publicar duas vezes idempotente.
- **Perfil:** Deck público aparece; privado não; username estável; `display_name` não muda URL; sem login funciona;
  `public_profile=false` conforme decisão.
- **Rota:** abrir direto, recarregar, sem/com login, id inexistente, privado e despublicado (mesma resposta).
- **Conteúdo:** Normal, Reverse (2 CardInstances), Type Answer, Cloze (marcas), MC (distratores), áudio/imagem por Field,
  renderização pelos 4 renderers reais; **sem** `note`, FSRS, `owner_id` na resposta; Legacy conforme decisão.
- **Contagem:** Notes (Reverse=1, Cloze=1), escopo conforme §2, arquivadas/ocultas fora; CardInstances só no limite.
- **Atribuição:** autor, cópia, cópia de cópia, `display_name` alterado, falsificação (payload/import/RPC/rename).
- **Permissões:** owner x visitante x autenticado x Course x Teacher; RLS de `decks` inalterada para leitura direta.
- **Importação:** independente, sem live link, tags, limite Free/Premium, duplicatas (`ask`), atomicidade, destino válido.
- **Privacidade:** `public_profile`, privado, despublicado, FSRS/Teacher Cards/`note` não expostos; enumeração de ids.
- **Reports:** contexto de Deck/Note gravado.
- Regressão: Identity (60+30+22), Fases E–K, Anki, Preview.

## 16. Riscos
- **R1** `personal_root` publicável hoje (lacuna no trigger). **R2** publicação por subtree acidental (B). **R3** URLs de
  mídia carregam o `auth.uid()` do dono (user_id deixa de ser "interno" de fato nas URLs; já ocorre em avatares) e
  `storagePath` não deve vazar. **R4** `get_public_flashcards` expõe `note`. **R5** ids sequenciais enumeráveis.
  **R6** sem `updated_at` em Notes ("última atualização"). **R7** público Legacy (espelho posicional incorreto para
  tipos ricos). **R8** tensão AT §17 x §18.2. **R9** copiar Deck grande: atomicidade/tempo da RPC, limites de payload.
  **R10** enumeração via `list_public_decks`: sem busca pública (AT §20), só por perfil.

## 17. Decisões que precisam de confirmação (não resolver na implementação)
1. Subtree: A/B/C/D (recomendado **D**) -- §2.
2. Rota: `#/deck/<id>` sequencial vs id opaco -- §6.
3. `public_profile=false` esconde Decks públicos? (recomendado: sim, sem perder a flag) -- §5.
4. Aposentar a lista solta de cartões e `hidden_from_profile` -- §5.
5. O que o Free/visitante vê do Deck (campos) e se visitante anônimo abre a página -- §10.
6. Tensão AT §17 x §18.2 (Free importa parcial?) e corte por Note vs Card -- §10.
7. Tratamento de Notes Legacy no público -- §8.
8. O que conta como "última atualização" (edição de conteúdo? tags? mover?) -- §3.
9. Categoria de report adicional -- §14.
10. `note` (campo livre) fica fora do público? (recomendado: fora) -- §8.

## 18. Arquivos que serão alterados na implementação seguinte
Novas migrations (061+, depois da 060): colunas `public_*`/`published_at` em `decks`, `updated_at` em `own_flashcards`
+ trigger, endurecimento do trigger de `is_public` (`personal_root`), RPCs de publicar/ler/copiar/listar, extensão
de `get_public_profile_stats`. Cliente: `shared/router.js`, `shared/auth.js` (rota pública), `shared/public-profile.js`
(seção Decks, aposentar lista solta), nova `shared/public-deck.js` (página), `shared/deck-data.js` (publicar),
`shared/own-flashcards.js` (cópia de Deck), `shared/my-flashcards.js` (UI de publicar/ícone/cor), `shared/reports.js`
(contexto), `fr|zh/index.html` (container da página), testes em `tests/fase-public-deck/`.

## 19. Verificações desta etapa
Somente leitura: código (`profile.js`, `public-profile.js`, `router.js`, `deck-*`, `flashcard-*`, `reports.js`),
migrations 020/037/038/043/049/051/056/060, banco local. Nada alterado além deste arquivo. Sem push/PR/deploy;
059 e 060 não aplicadas.

---

# v6 — Implementação (local; migrations 059, 060 e 061 NÃO aplicadas em produção)

As 10 decisões da §17 foram **aprovadas** e implementadas como abaixo. Sem push/PR/deploy.

| # | Decisão aprovada | Implementação |
|---|---|---|
| 1 | Publicar é ato explícito por Deck; sem herança | `publish_deck(deck_id,…)` age só no Deck; `get_public_deck` lista só subdecks que **também** têm `is_public`; a cópia percorre só Decks públicos |
| 2 | URL opaca e estável | `decks.public_id uuid` (UNIQUE parcial), gerado no 1º publish, imutável (trigger), mantido ao despublicar. Rota `#/deck/<uuid>`. **Não autoriza nada** |
| 3 | `public_profile=false` esconde sem despublicar | Todas as RPCs juntam `profiles.public_profile`; `is_public` fica intacto; URL direta também fica "indisponível" |
| 4 | Cartões soltos aposentados (transição) | UI da lista solta desligada por `PUBLIC_FLAT_FLASHCARDS_ENABLED=false`; RPC/colunas/`hidden_from_profile` preservadas; cleanup futuro |
| 5 | Anônimo/Free: metadado; Premium: conteúdo+importar | `viewer.can_open`/`can_import` calculados no servidor; `get_public_deck_notes` devolve `login_required`/`premium_required`; `copy_public_deck` exige Premium |
| 6 | Free não importa; corte de 20 não vale para Public Deck | Sem importação parcial. Limite global intocado |
| 7 | Legacy via adapter nativo; incompatível não é publicado | `public_note_native(own_flashcards)` espelha `nativeNoteEditorStateFromLegacyRow` (paridade testada: `test_legacy_parity.js`). Retorna NULL → fora do público + `get_public_deck_owner_status.incompatible` informa o dono. Legacy nunca alterado |
| 8 | Última atualização | `own_flashcards.updated_at` + `decks.content_updated_at`; ver abaixo |
| 9 | Report reutiliza o sistema existente | `reports.context` (jsonb) com `source: public_deck` / `public_deck_note`; nenhuma tabela/migration |
| 10 | `note` fora do público | Nunca selecionado pelas RPCs públicas nem copiado; `get_public_flashcards` deixou de devolvê-lo |

**Correções de segurança desta fase:** `personal_root` não pode mais ser público (CHECK `decks_public_only_personal` + trigger — vale
para qualquer papel, inclusive SQL direto); campos de publicação (`is_public`, `public_*`, `published_at`) e `content_updated_at`
só mudam por RPC SECURITY DEFINER (papéis de API são barrados no trigger `decks_public_guard`).

**Migration 061 (aditiva):** colunas `public_id`, `public_description` (≤280), `public_icon`/`public_color` (listas fechadas, sem upload),
`published_at`, `content_updated_at`; `own_flashcards.updated_at`; triggers; RPCs `publish_deck`, `unpublish_deck`, `get_public_deck`,
`get_public_deck_notes`, `list_public_decks_for_user`, `get_public_deck_owner_status`, `copy_public_deck`; helpers `note_attribution_tag`
(regra única de autoria, também usada por `copy_public_flashcard`), `note_copy_tags`, `public_note_native`.
Valor inicial de `updated_at` para Notes pré-existentes = `created_at` (não há histórico anterior); de `content_updated_at` = momento da migration.

**"Última atualização" (eventos):** criar/editar/mover/arquivar Note (conteúdo, Fields, Card Type, Tags, `deck_id`, `status`); mover atualiza **origem e destino**;
criar/mover/apagar subdeck atualiza o pai; renomear Deck / mudar metadado público / publicar. **Não** atualizam: revisão, FSRS, due, New/Learning/Review, XP, streak,
`note` privada, `hidden_from_profile` (FSRS nem vive nessas tabelas).

**Contagem:** `notes_count` = Notes ativas e representáveis no Deck (Reverse=1, Cloze=1, MC=1, Type Answer=1). CardInstances (limite Free) continuam
calculadas só no cliente (`generatedCardInstanceCount`); o servidor não persiste `card_instances_count`.

**Cópia (`copy_public_deck`)**: uma transação; cria Deck pessoal novo em Meus Decks (ou no destino válido), recria os subdecks públicos, copia Notes nativas
(Fields/modo/tags comuns) com a atribuição `criado-por-[username do autor original]` (cópia de cópia mantém só a original); não copia FSRS, progresso, `note`,
`storagePath`, `generationKey`. Sem live link e sem `source_*`. Guarda TÉCNICA (não é regra de produto nem tem relação com o limite Free de 20 CardInstances): 2000 Notes e 2000 arquivos de mídia por cópia, contando raiz + subdecks públicos; configuráveis sem migration (`app.public_deck_copy_max_notes` / `app.public_deck_copy_max_media`). O banco copia ~0,7 ms/Note (500=0,36 s, 1000=0,73 s, 2000=1,46 s), então o teto protege memória da resposta e o nº de objetos que o cliente duplica no Storage, não um timeout medido.
**Duplicatas/reimportação:** não implementado (decisão pendente própria — algoritmo de similaridade). Ponto de integração: parâmetro futuro de `copy_public_deck`
(`on_duplicate`), hoje inexistente; reimportar cria nova cópia.

**Mídia — mecanismo definido:** o conteúdo (e portanto as URLs de mídia de `field.audio/image`) só é entregue a Premium/dono pela RPC, sem `storagePath`/`generationKey`;
anônimo e Free nunca recebem URL de mídia. O bucket `flashcard-media` continua público-leitura com nome de objeto de sufixo aleatório.
**Risco residual conhecido:** o caminho do objeto contém o `auth.uid()` do dono (já ocorre em avatares). Endurecimento proposto e **não implementado**:
Edge Function proxy que serve a mídia por `public_id` (checando `is_public`/perfil/Premium) ou bucket separado `public-deck-media` populado na publicação.
**Mídia da cópia é INDEPENDENTE (P7).** Fluxo: `get_public_deck_media_manifest(public_id)` (Premium) → o cliente duplica cada objeto do bucket
`flashcard-media` para a PRÓPRIA pasta (`<uid>/pubcopy-...`, via `storage.copy` com o JWT dele; a policy do bucket só permite escrever na própria pasta) →
`copy_public_deck(public_id, destino, p_media_map)` valida o mapa (cada destino precisa ser objeto real na pasta do copiador; `invalid_media_map`) e, na MESMA
transação, copia as Notes reescrevendo toda URL do nosso bucket (`media_map_incomplete` se faltar uma: a cópia nunca aponta para o original). Falha em qualquer
passo: o cliente remove os objetos que ele mesmo criou (compensação) e nada é criado no banco. Links externos (`audio.type='url'`) permanecem links (não são do app).
Legado com mídia sem Field de destino seguro (ex.: idioma sem estudo mapeado) é incompatível (não publica parcial). Storage e Postgres não compartilham transação:
se a aba fechar entre a duplicação e a RPC, sobram objetos órfãos em `<uid>/pubcopy-*` (nenhuma Note os referencia) — limpeza periódica é pendência registrada.
O arquivo do original pode ser apagado/substituído, o Deck despublicado ou excluído: a cópia continua intacta (testado).

**Cliente:** `shared/public-deck.js` (página, lista de Notes → Preview com os **mesmos 4 renderers**, importar, reportar, controles do dono), rota `publicDeck` em
`router.js`, bypass anônimo em `auth.js`, seção "Decks públicos" em `public-profile.js`, botão Publicar em Meus Decks (`my-flashcards.js`).

**Testes (`tests/fase-public-deck/`):** `run.sh` + `test_public_deck.sql` (87/87) + `test_media_independence.sql` (48/48, Postgres local), `test_legacy_parity.js` (17/17), `test_playwright.js` (110/110 FR+ZH),
`test_concurrency_perf.sh`. Regressões verdes: Identity (60 SQL, 30 cliente, 22 Playwright), Fases E–K1 (unit e Playwright).

**Pendente / fora de escopo:** duplicatas/merge; proxy de mídia; remoção definitiva da lista solta e de `hidden_from_profile`; ícone/cor ainda sem UI de pré-visualização no editor de publicação;
Deck público de professora (Teacher Deck) continua proibido; busca/descoberta pública (AT §20) inexistente por desenho.

# v7 — Hardening final pós-P7 (local; migrations 059–061 continuam NÃO aplicadas em produção)

Auditoria de integração/segurança/consistência. Nenhuma mudança de SQL, de policy ou de produto; uma
correção de cliente e testes novos. Duplicatas/reimportação, "Já adicionado" e limpeza da lista legada
seguem FORA de escopo.

## Cópia de conteúdo ≠ cópia de mídia
- **Conteúdo**: `copy_public_deck` (SQL, uma transação) cria Decks/Notes novos do copiador, com atribuição
  `criado-por-[username]` do autor original. **Mídia**: operação separada, feita ANTES pelo cliente com
  `storage.copy` (fora da transação SQL).
- Mídia **interna** (bucket `flashcard-media`) é **fisicamente duplicada** na pasta do copiador. Mídia
  **externa** (`audio.type='url'` para outro host) **não** é duplicada: permanece link.
- `media_map` (URL antiga → URL nova) só é aceito se TODO destino é objeto real do **próprio copiador**
  (`<auth.uid()>/…`, existente em `storage.objects`); a RPC **não aceita destino externo**, destino na
  pasta de outro usuário, destino == origem, nem mapa que não seja objeto. Mapa que não cobre toda URL
  interna das Notes ⇒ `media_map_incomplete` e a transação inteira é revertida. Chave a mais no mapa
  (mídia saiu do original depois do manifest) é aceita.
- O manifest só lista URLs **distintas** (uma entrada por objeto, mesmo referenciado por várias Notes) da
  árvore pública (raiz + subdecks explicitamente públicos), Notes ativas e compatíveis; nunca arquivadas,
  subdecks privados, públicos-sob-privado, outros Decks do dono ou links externos. O cliente também
  deduplica por URL e copia cada objeto uma única vez.

## Storage real: o que foi e o que NÃO foi validado
- Validado no **banco local** (Postgres + stub de `storage.objects`): autorização do manifest/RPC,
  validação do mapa, atomicidade, independência após apagar/substituir/despublicar/excluir o original.
- Validado por **stub** (Playwright): sequência manifest → copy → RPC, compensação, retry, dedupe,
  trava de reentrância.
- **NÃO validado contra Storage real**: policies reais de `storage.objects` (032: SELECT público; INSERT/
  DELETE só na pasta `auth.uid()`; **não há UPDATE**), JWT real e o comportamento de `storage.copy`
  (exige SELECT na origem + INSERT no destino; sem upsert, destino existente falha). **Antes do deploy**
  rodar `tests/fase-public-deck/test_real_storage_integration.js` contra um projeto de STAGING (sai com
  SKIPPED sem as variáveis; SKIPPED não vale como validado). Nenhuma policy foi alterada.
- A policy de SELECT é pública por desenho do bucket: qualquer um que saiba o caminho lê/copia o objeto.
  O gate Premium é da RPC/manifest, não do Storage. O manifest expõe o UID do autor no caminho
  (**exposição de path, independente da cópia**); proxy ou bucket público separado seria uma melhoria
  futura de exposição, **não** requisito da independência da cópia já implementada.

## Atomicidade Storage ↔ banco
| Falha | Resultado |
|---|---|
| 1º `storage.copy` falha | RPC nem é chamada; cliente remove o que já criou |
| falha no meio de N | idem |
| manifest mudou (mídia nova) | `media_map_incomplete`, nada criado; cliente limpa e refaz 1 vez |
| mapa incompleto / inválido / destino inexistente | RPC recusa, nada criado; cliente limpa |
| RPC aborta com erro do servidor (SQLSTATE/mensagem conhecida) | transação revertida; cliente limpa |
| **RPC sem resposta (rede/timeout/gateway)** | **ambíguo**: o commit pode ter ocorrido. **Correção desta etapa**: o cliente NÃO apaga a mídia (antes apagava e poderia deixar Notes apontando para arquivos inexistentes). Pode sobrar órfão; a mensagem manda conferir Meus Decks antes de repetir |
| aba fechada entre `storage.copy` e RPC | objetos órfãos (aceito) |
Nenhum caminho persiste Notes apontando para mídia inexistente. **Órfãos são possíveis** (aba morta,
erro ambíguo, chave a mais no mapa); **limpeza periódica de órfãos é pendência futura** (sem GC agora).

## Idempotência
Cada cópia intencional é independente (nova árvore, novos objetos). Duplo clique/chamadas simultâneas da
MESMA importação na mesma aba: a segunda é ignorada (trava em memória). Duas abas/duas cópias seguidas
criam duas árvores independentes (sem deduplicação de produto). O retry interno só ocorre em
`media_map_incomplete` (reversão definitiva), nunca em erro ambíguo.

## Limites
`public_deck_copy_max_notes()` / `public_deck_copy_max_media()` = 2000, **guardrail técnico configurável**
(`alter database … set app.public_deck_copy_max_*`), cobrem a árvore pública inteira (raiz + subdecks
públicos; Notes ativas, inclusive as incompatíveis, para ser conservador). **Não** são o limite Free de
**20 CardInstances**, que é regra separada de produto; a UI não os apresenta como regra Free/Premium.
Exatamente no limite copia; limite+1 ⇒ `deck_too_large`, nada criado (testado: 2000 ok / 2001 recusado).

## Publicação, subdecks, Legacy, Reports
- `content_updated_at` muda só por conteúdo/estrutura/metadado público (Note, Tags, mover Note, subdeck,
  nome, descrição/ícone/cor, publicar); nunca por `note` privada, `hidden_from_profile`, nem por estudo
  (FSRS/Review vivem em `progress`, fora de `decks`/`own_flashcards`). `public_id` é estável em
  despublicar/republicar (índice único; `gen_random_uuid`, nunca reaproveitado); despublicado ou
  `public_profile=false` ⇒ "indisponível" em metadado, conteúdo, manifest e cópia (sem despublicar).
- Publicar o pai **não** publica filhos; só subdecks explicitamente públicos entram (um público sob um
  privado não é alcançável). `personal_root`/Course/Teacher nunca públicos (CHECK + trigger + RPC).
- Legacy: mapeamento SQL = espelho de `nativeNoteEditorStateFromLegacyRow` (paridade testada, 17/17);
  incompatível (ex.: mídia sem Field de idioma seguro) ⇒ não publica, a linha original não é alterada e o
  dono vê a contagem em `get_public_deck_owner_status`.
- Reports: `source: 'public_deck'` / `'public_deck_note'` com `public_id`, nome do Deck, username do dono
  e índice posicional da Note (nunca ID interno); anônimo pode reportar (guest_id); Notes só são
  mostradas a Premium/dono.

## Testes (esta etapa)
Postgres local: 87 + 48 + **20 novos** (`test_hardening.sql`); Playwright 118 (fr+zh, **6 novos**
verificando erro ambíguo, dedupe e reentrância — falham sem a correção); paridade Legacy 17/17;
concorrência/perf (8 publish simultâneos ⇒ 1 `public_id`; 4 cópias simultâneas independentes; 2000 ok /
2001 recusado). Pendente: `test_real_storage_integration.js` (staging).
