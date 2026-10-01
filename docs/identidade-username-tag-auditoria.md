# Auditoria de identidade, username e tag de atribuição (v4 do contrato de Public Decks)

Data: 2026-10-01. Somente leitura + documentação. Complementa `docs/public-decks-auditoria.md` (v3, `e27406c`),
que passa a apontar para este arquivo. Fonte do contrato: `docs/arquitetura-total-decks-tags-painel.md` (AT).
Nenhum código, migration, RPC, RLS, schema, UI ou username foi alterado. Migration 059 **não aplicada** (ver 12).

## 0. Resumo executivo

1. **Colisão teórica: confirmada.** `normalizeTagSlug` troca `.` e `_` por `-`; o username aceita `[a-z0-9_.-]`.
   `ana.silva`, `ana_silva`, `ana-silva` (e `ana--silva`, `-ana`, `ana-`, `_ana_`) geram a mesma Tag.
2. **Colisão real: não existe hoje.** Consulta somente leitura no banco real (26 perfis): 26 slugs distintos, 0 grupos
   colidindo, 0 duplicatas por caixa, 0 slug vazio, maior slug com 20 caracteres. 3 usernames contêm `.` ou `_`
   (a normalização os alteraria) — nenhum colide com outro. O risco é **futuro**, não herdado.
3. **Username não é estável hoje**, e a mudança tem consequências piores que "tag dividida": o username antigo
   **fica livre** e outra pessoa pode registrá-lo (ver 6).
4. **A Tag `criado-por-*` hoje é forjável por qualquer usuário**, por 4 portas client e 2 server-side (ver 7).
5. **Caixa não é problema:** o banco só aceita minúsculas (CHECK). `Ana`/`ANA` não existem como username.
6. **A AT não define** como resolver a colisão nem o que "username" significa para a Tag (§10.1 pede só
   "evitar caracteres especiais"; §10.3 e inv. 15 exigem username imutável). É **necessária decisão de
   produto/arquitetura** antes de qualquer implementação (seção 9 e 11).

## 1. Cadeia de identidade do username

| Ponto | Comportamento atual | Depende de username? | Risco para imutabilidade | Arquivo |
|---|---|---|---|---|
| Criação de conta | Auth do Supabase; sem username no signup. | Não | — | `shared/auth.js` |
| Criação do profile | `createInitialProfile()`: parte local do e-mail passa por `slugifyUsername`; em `23505` tenta `base2`, `base3`… (30 tentativas). | Gera o username | O username inicial deriva do e-mail (`ana.silva@…` → `ana.silva`), tornando `.`/`_` comuns | `shared/profile.js:138` |
| Armazenamento | `profiles.username text not null unique check ~ '^[a-z0-9_.-]{3,24}$'`. Índice único `profiles_username_key`. | Sim | UNIQUE protege unicidade atual, não histórica | `001_create_profiles_table.sql:25` |
| Validação (client) | `slugifyUsername`: minúsculas, remove tudo fora de `[a-z0-9_.-]`, corta em 24. Mínimo 3. Input `maxlength=24`. | Sim | Só UI; o banco tem CHECK próprio | `shared/profile.js:114,186`, `fr|zh/index.html` |
| Unicidade (client) | `isUsernameAvailable` (SELECT `neq user_id`) antes do UPDATE; a garantia final é o UNIQUE. | Sim | Checagem racy, mas o UNIQUE fecha | `shared/profile.js:175` |
| Edição | `saveProfileEdits` envia `username` no UPDATE de `profiles` (policy owner). | Sim | **Porta aberta** (seção 2) | `shared/profile.js:186` |
| Case sensitivity | CHECK só aceita minúsculas; slugify faz `toLowerCase`; busca pública faz `toLowerCase` no input. | Sim | `Ana`, `ANA` não coexistem nem entram | `profile.js:115`, `public-profile.js:95` |
| Cache | `PROFILE_CACHE` por sessão; reescrito após `saveProfileEdits`. Outras abas/sessões ficam velhas. | Sim | Cache velho pode exibir username antigo | `shared/profile.js:32,225` |
| Rota | `#/user/<username>`; o router **não** normaliza caixa nem filtra caracteres (`parts[1]` cru); a busca normaliza com `trim().toLowerCase()`. | Sim | Link antigo quebra após mudança; sem alias/redirect | `shared/router.js:103` |
| Perfil público | `fetchPublicProfileByUsername` → `profiles WHERE username`; RPCs `get_public_profile_stats(p_username)` e `get_public_flashcards(p_username, …)` (SECURITY DEFINER) resolvem por username. | Sim | Identidade pública = username; mudar quebra o link | `shared/public-profile.js:94`, `037/038/043/056` |
| Ranking | Lê username de `profiles` a cada render; clique abre perfil por username. | Sim | Segue o valor atual | `shared/leaderboard.js:89,290` |
| Vínculo professora↔aluna | Resolve @username → `user_id` (`resolveProfileByUsername`); depois grava `student_id` (uuid). | Só para resolver | uuid persistido, imune a mudança | `shared/roles.js:54`, `admin-badges.js:21` |
| Premium / Badges (admin) | Busca por @username → `user_id`; grava uuid. | Só para resolver | idem | `admin-premium.js`, `admin-badges.js` |
| Notificações | Edge Function lê username só para exibição (`@username`). | Não | — | `notification-cron/index.ts:750` |
| Reports | Contexto de report grava `flashcard_owner_username` como texto no momento. | Sim (snapshot) | Reports antigos guardam o username da época | `public-profile.js` (reportPublicFlashcard) |
| Cards/Notes/Decks | **Nenhuma coluna** referencia username (Notes, Decks, tags). Hoje só uuid (`owner_id`, `teacher_id`, `student_id`). | Não | Atribuição, quando existir, será a primeira dependência persistida | schema |
| Tags | Nenhum código constrói `criado-por-*` (0 ocorrências fora de docs). 0 Notes com essa tag. | Não ainda | — | grep repo + banco |
| Export/Import | Anki export/import e arquivo/link de Meus Cartões não usam username (tags só como texto). | Não | Mas **importam tags cruas** (ver 7) | `anki-import.js`, `my-flashcards.js` |
| Identidade do tipo "username = chave" | Nenhuma tabela usa username como FK. Identidade persistida é sempre uuid. | — | Bom: imutabilidade pode ser aplicada sem migrar FKs | schema |

## 2. Portas de alteração do username

| Porta | Existe? | Protegida no servidor? |
|---|---|---|
| Frontend `saveProfileEdits` (UPDATE em `profiles`) | Sim | Não |
| **API direta** (PostgREST/supabase-js por qualquer usuário autenticado: `UPDATE profiles SET username=… WHERE user_id=auth.uid()`) | Sim: policy `profiles_owner_update` (using/check só `auth.uid()=user_id`); `authenticated` tem UPDATE na coluna | **Não.** Só o CHECK de formato e o UNIQUE. O slugify do cliente é contornável |
| Trigger | Só `trg_profiles_set_updated_at` (BEFORE UPDATE, carimba `updated_at`). Nenhum trigger de imutabilidade | **Não** |
| RPC / função SQL | Nenhuma altera `profiles.username` (as 2 únicas funções que citam username, `get_public_profile_stats` e `get_public_flashcards`, só leem) | n/a |
| Edge Function | `notification-cron` só lê | n/a |
| Import (Anki/arquivo/perfil público) | Não toca `profiles` | n/a |
| Admin (UI) | Não há tela que edite username; `setPlanTier`/`admin_mode`/avatar usam UPDATE em colunas próprias | n/a (mas a policy de update permite à própria conta) |
| Painel de Tags / editor | Não toca `profiles` | n/a |
| `service_role` / SQL manual / MCP | Sim (por natureza) | Não protegível por RLS; só trigger |
| INSERT (criação) | `profiles_owner_insert`; define o username inicial | n/a |
| DELETE | `authenticated` tem privilégio de tabela, mas **não há policy de DELETE** → RLS nega | Negado |

**Conclusão:** nenhuma proteção server-side existe. Imutabilidade exigiria no mínimo um trigger BEFORE UPDATE (e
decisão sobre INSERT, DELETE de conta e `service_role`); só UI não basta.

## 3. Normalização de Tags (implementação exata)

`normalizeTagSlug` (`shared/flashcard-model.js:498`), única implementação do app:

1. `String(raw||'')`; 2. `normalize('NFD')` e remoção de diacríticos `U+0300–U+036F`; 3. `toLowerCase()`;
4. `::` → `-`; 5. `[^a-z0-9-]+` → `-`; 6. `-+` → `-`; 7. remove `-` no início e no fim.

| Propriedade | Regra |
|---|---|
| Permitidos | `a-z`, `0-9`, `-` |
| Substituídos por `-` | espaço, `.`, `_`, `/`, `::`, pontuação, símbolos, emoji, qualquer não-ASCII sem decomposição |
| Caixa | irrelevante (minúscula) |
| Acentos | removidos via NFD (`é`→`e`); letras sem decomposição (`ß`, `ø`, `œ`) viram `-`/somem |
| Unicode | só ASCII sobrevive |
| `-` repetido/nas pontas | colapsado/removido |
| `_` e `.` | **viram `-`** (origem da colisão) |
| Comprimento | `TAG_MAX_LENGTH=50`, `TAG_MAX_PER_NOTE=20` (`validateNoteTags`); CHECK `*_tags_limits` (056). Sem truncamento silencioso |
| Tamanho da tag de atribuição | `criado-por-` (11) + até 24 = 35 ≤ 50: nunca estoura |
| Servidor | `note_tag_is_canonical`: `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–50. Não normaliza, só valida |

Consumidores: editor de tags (`flashcard-tags-editor.js`), `validateNoteEditorStateForSave`, importação Anki
(`anki-import.js`), importação por arquivo/link e cópia de perfil público (`nativeNoteEditorStateFromImportPayload`),
`createNativeNoteEditorState`, Painel de Tags (`tag-manager.js` → RPCs), filtro de Review (`cardMatchesTagFilter`),
export Anki, `buildEngineCardsFromRow`.

**Colisões teóricas** (todas → `criado-por-ana-silva`): `ana.silva`, `ana_silva`, `ana-silva`, `ana--silva`,
`ana._silva`, `ana.-silva`. Outros: `-ana`, `ana-`, `_ana_`, `ana.`, `.ana` → `criado-por-ana`, colidindo com `ana`.
Caso degenerado: `___`, `...`, `---` (válidos no CHECK) → sufixo vazio → a tag completa vira `criado-por`
(sem identificar ninguém). O CHECK não exige letra ou dígito.

## 4. Consulta real (somente leitura) — **realizada**

Projeto `eigjocalzwamisgqilhg`, via `execute_sql`, apenas `SELECT`/catálogos. Nenhum dado pessoal exposto neste
documento (nenhum username listado).

```sql
with n as (
  select username,
         trim(both '-' from regexp_replace(regexp_replace(lower(username),'[^a-z0-9-]+','-','g'),'-+','-','g')) slug
  from profiles)
select count(*) total_profiles, count(distinct slug) distinct_slugs,
       count(*) filter (where username <> slug) usernames_changed_by_norm,
       count(*) filter (where username ~ '[._]') with_dot_or_underscore,
       (select count(*) from (select slug from n group by slug having count(*)>1) g) colliding_groups,
       (select count(*) from (select lower(username) from profiles group by 1 having count(*)>1) g) case_dups,
       max(length(slug)) max_slug_len, count(*) filter (where slug='') empty_slug
from n;
```

Resultado: `total_profiles 26 · distinct_slugs 26 · usernames_changed_by_norm 3 · with_dot_or_underscore 3 ·
colliding_groups 0 · case_dups 0 · max_slug_len 20 · empty_slug 0`.
A regex SQL aproxima `normalizeTagSlug` apenas para o alfabeto do username (já ASCII minúsculo; NFD não se
aplica). Também verificado: 0 Notes com tag iniciada em `criado-por`; 0 Notes com qualquer tag nas duas tabelas
(tags ainda não usadas em produção). **A consulta deve ser repetida imediatamente antes de qualquer migração de
imutabilidade/atribuição** (dados mudam).

## 5. Case sensitivity

| Camada | Regra |
|---|---|
| Banco | CHECK `^[a-z0-9_.-]{3,24}$`: maiúscula é **rejeitada**; UNIQUE sobre o texto já minúsculo. `Ana`/`ana`/`ANA` não coexistem |
| Frontend | `slugifyUsername` aplica `toLowerCase` antes de enviar |
| Rotas | `#/user/Ana` funciona porque a busca faz `trim().toLowerCase()`; o router em si não normaliza |
| Tags | `normalizeTagSlug` minusculiza; compatível com a regra de username |

Conclusão: caixa **não** gera ambiguidade nem exige decisão. (Atenção: as RPCs públicas comparam
`username = p_username` sem `lower()`; o cliente já envia minúsculo, mas uma chamada direta com `Ana` retorna
vazio, não outro perfil.)

## 6. Estabilidade da atribuição (demonstração, nada corrigido)

Cenário: `ana.silva` publica um Deck; B copia → Notes de B recebem `criado-por-ana-silva` (valor gravado como
texto em `tags`, **sem vínculo com `profiles`**). Depois `ana.silva` muda para `ana-silva` (permitido hoje):

| Pergunta | Resposta com o código atual |
|---|---|
| A tag antiga continua? | Sim, nas cópias já feitas (é só texto) |
| Novas cópias usam a nova tag? | Sim: `criado-por-ana-silva` coincide por acaso; para `ana.novo` seria `criado-por-ana-novo`: **autoria dividida** em duas tags para a mesma pessoa |
| Dois autores aparentes? | Sim: as cópias antigas apontam um nome que a autora não usa mais |
| URL antiga? | `#/user/ana.silva` → `notFound` (sem alias, sem redirect, sem histórico) |
| Perfil público antigo? | Some; RPCs devolvem erro/vazio para o nome antigo |
| **Reuso do username liberado** | **Qualquer pessoa pode registrar `ana.silva` depois.** A nova dona passa a gerar `criado-por-ana-silva`, igual à tag histórica da autora original: as cópias antigas passam a "pertencer" à pessoa errada. Falha de integridade da atribuição, pior que divisão |
| Reports antigos | Guardam o texto do username da época |
| Cópia de cópia | Preserva a tag original (regra 9); herda o mesmo problema |

## 7. Operações que podem corromper/forjar `criado-por-*`

| Operação | Lado | Barrada hoje? |
|---|---|---|
| Criar a tag no editor de Meus Cartões (digitar `criado-por-qualquer`) | client | Não (aceita qualquer slug) |
| Remover/editar a tag no editor | client | Não |
| Painel de Tags — renomear X → `criado-por-fulano` (forjar) ou renomear/apagar a tag real | client → RPC | Não; `rename_note_tag`/`delete_note_tag` aceitam qualquer slug canônico |
| RPC `rename_note_tag` / `delete_note_tag` / `list_note_tags` | **server** (SECURITY INVOKER, 057) | Não; sem lista de prefixos reservados |
| UPDATE direto em `own_flashcards.tags` (API) | **server** | Não: policy `own_flashcards_owner_all` (ALL, dono) + só CHECK de 20×50 |
| UPDATE em `teacher_flashcards.tags` | server | Só admin (026); aluna não escreve |
| Merge via rename (destino já existente) | server | Funde sem aviso de tag de sistema |
| Importação Anki (`.apkg` com tag `criado-por-x`) | client | Não: tags cruas só são normalizadas |
| Importação por arquivo/link e cópia de perfil público | client | Não: `tags` do payload viajam como valor; o payload é editável à mão |
| Export Anki | client | Exporta como qualquer tag (sem corrupção) |
| Edição de Note / edição em massa | client | Edição em massa de tags não existe; só o Painel (RPC) |
| Migração | — | Nenhuma opera sobre `criado-por-*` |

Conclusão: **100% da proteção hoje é inexistente**. A proteção real precisa estar no servidor (trigger/CHECK ou
validação nas RPCs e na escrita de `own_flashcards`), não só no editor/Painel (confirma v3, 7.3).

## 8. Note × CardInstance

Confirmado: `tags` é coluna da linha (Note); `buildEngineCardsFromRow` calcula `normalizeNoteTags(row.tags)`
**uma vez** e atribui a mesma lista a todas as CardInstances da linha (Reverse = 2, Cloze = N); CardInstances
não são persistidas e não existe coluna de tag por card. Dentro de uma linha, irmãos **não podem** divergir.
Rename/delete do Painel atuam por linha (`UPDATE`), mantendo a coerência.

Único caminho de divergência: **entre Notes diferentes**. O export Anki (7i) emite cada CardInstance como nota
Anki separada; reimportar cria **Notes independentes** (documentado na 7j: Reverse e Cloze multi-marca perdem o
agrupamento). Elas nascem com as mesmas tags, mas editar uma não afeta a outra: a atribuição pode divergir se uma
for alterada/limpa. Fora do fluxo de Deck público (a AT proíbe cópia por Anki como atribuição) mas relevante para
"cópia permanente".

## 9. Alternativas conceituais (nenhuma escolhida)

Contexto da AT: §10.3 define `criado-por-[username]` como tag permanente e "Username é imutável"; §10.1 exige
tags minúsculas, sem acento, sem caracteres especiais. **Nenhuma seção define o que acontece quando dois
usernames normalizam igual**, nem se "[username]" é o username cru ou normalizado. Não há decisão da AT a citar.

| Alt. | Descrição | Compat. AT | Estabilidade | Unicidade | Impacto em usernames existentes | Atribuições futuras | URLs | Migração | Riscos |
|---|---|---|---|---|---|---|---|---|---|
| **A** | Mudar `normalizeTagSlug` (ex.: preservar `_`/`.` na tag) | Conflita com §10.1 ("evitar caracteres especiais") e com o regex canônico de tag (057/`note_tag_is_canonical`), afetando **todas** as tags | Não resolve mudança de username | Resolveria só se o mapa for injetivo | Nenhum | Tag de atribuição teria caracteres hoje proibidos | Nenhum | Mudar regex do servidor + dados (0 tags hoje) | Altera uma função compartilhada por editor, Anki, Painel e filtro; quebra a tag única "plana" |
| **B** | Username canônico: restringir o username ao alfabeto da tag (`[a-z0-9]` com `-` só interno) em novos registros e/ou edições | Compatível com AT (username é a fonte; tag = username) | Exige imutabilidade (item 10) | Garante injeção username→tag **para novos**; existentes `.`/`_` seguem ambíguos | 3 usernames existentes com `.`/`_`: exigem decisão (grandfather vs migrar); não colidem hoje | Tag = username literal, simples | Mantém `#/user/<username>` | CHECK novo + trilha para os 3 existentes | Perfis "grandfathered" ainda geram tag normalizada ≠ username; se alguém renomear um deles, perde identidade; precisa regra para os 3 |
| **C** | Identificador interno adicional (ex.: `handle` imutável gerado, ou uuid curto) usado na tag | Diverge do texto literal da AT (`criado-por-[username]`); exige decidir se [username] é "o username" ou outro identificador público | Máxima (independe do username) | Garantida pela geração | Backfill de handle para os 26 perfis | Tag ilegível/não-amigável a menos que o handle seja bonito | Rota pode passar a usar o handle | Coluna nova + UNIQUE + backfill | Contradiz o exemplo da AT (`criado-por-catharinaurbani`); mudança de produto |
| **D** | Reservar namespace `criado-por-*` (bloquear manual/forjar) e tratar a tag como "de sistema" | Compatível (§10.3 exige não apagável pelo destinatário); **ortogonal** | Não resolve colisão nem estabilidade | Não | Nenhum | Necessária de qualquer forma (anti-forja) | Nenhum | Trigger/CHECK/validação nas RPCs | Sozinha não fecha o achado crítico |
| **E** | Aceitar a ambiguidade e gravar a tag junto de um **token de autoria interno** (ex.: uuid do autor numa coluna da Note ou tabela de atribuição) e a tag vira só rótulo | AT diz que a tag "representa o autor"; coluna extra pode ser requisito não contraditório (v3 7.1 diz "nenhuma coluna `source_*` é requisito") | Alta (uuid) | Total (uuid) | Nenhum | Dupla fonte de verdade (tag + uuid) | Nenhum | Coluna/tabela nova | Complexidade; AT prefere tag como mecanismo único |
| **F** | Bloquear **registro/edição** de usernames cuja normalização já exista (checagem na unicidade pelo slug) | Compatível | Só com imutabilidade | Garante unicidade da tag para novos e **protege os 26 atuais** (0 colisões hoje) | Nenhum | Tag derivada do slug; username cru continua `.`/`_` | Nenhum | Índice único sobre a expressão do slug (ou constraint) | Cobre colisão, não "rótulo diferente do username" (`ana.silva` → `criado-por-ana-silva`) |

Observações transversais: D é necessária em qualquer cenário; imutabilidade (seção 10) é necessária em qualquer
cenário; A–C–E–F decidem a **injetividade**. B+F+D são as menos invasivas, mas **a escolha é da autora**.

## 10. O que seria necessário para username imutável (não implementar)

| Camada | Necessário |
|---|---|
| Banco | Trigger BEFORE UPDATE em `profiles` rejeitando alteração de `username` (inclusive por `service_role`, a menos que exceção explícita); ou revogar UPDATE da coluna; decisão sobre `INSERT` (único momento de definição) e sobre exclusão de conta (reuso do username liberado) |
| RPC | Nenhuma RPC altera hoje; se existir fluxo de "primeira definição" (onboarding), precisa ser a única via e rodar uma vez |
| Frontend | Remover/travar o campo em `openEditProfileModal`/`saveProfileEdits`; exibir como somente leitura; mensagem clara |
| Validação | Decidir regra do alfabeto (B/F): escolher o username no primeiro uso com preview da tag; hoje é derivado do e-mail sem confirmação |
| Rotas | Nenhuma mudança se o username não muda; sem necessidade de alias |
| Reuso | Reservar username de conta excluída (tabela/aposentadoria) para a tag histórica não ser reivindicável |
| Testes | Trigger bloqueia UPDATE de username (owner e outro papel); mudar `display_name`, bio, avatar continua permitido; colisão por slug rejeitada |
| Dados históricos | Os 26 perfis atuais: decidir se ganham uma "janela final de ajuste" (hoje podem alterar) ou ficam travados como estão; sem mudança destrutiva (regra 19) |

## 11. Decisões pendentes

| Pergunta | Estado |
|---|---|
| A colisão já existe em dados reais? | **Não** (0 grupos em 26 perfis, 2026-10-01). Reexecutar antes de migrar |
| A arquitetura define como resolver? | **Não.** §10.1/§10.3/inv. 15 não tratam colisão nem a relação username↔slug |
| Username canônico está definido? | **Não.** O banco aceita `.`/`_`; a AT diz "evitar caracteres especiais" para tags, não para usernames |
| A normalização atual pode ser usada para a tag? | **Não, sem decisão:** não é injetiva sobre o conjunto de usernames válidos |
| Precisa decisão de produto/arquitetura? | **Sim.** (1) Alfabeto/forma canônica do username ou identificador interno; (2) tratar os 3 usernames existentes com `.`/`_`; (3) reuso de username de conta excluída; (4) username com sufixo vazio (`___`) |

## 12. Impacto nas próximas fases

Regra: **sem identidade estável e atribuição não ambígua, não implementar importação pública.**

1. **Username imutável** — primeira fase; depende de decidir a forma canônica (item 11) para não travar um
   identificador insuficiente.
2. **Proteção da tag** — servidor (trigger/validação em `own_flashcards.tags`, `rename_note_tag`,
   `delete_note_tag`, importações), não só UI. Independe da colisão.
3. **Projeção pública** — não implementar `criado-por-*` nem exibir autor com a regra atual.
4. **Public Deck** — bloqueado (v3 15).
5. **Importação** — bloqueada: a cópia precisaria gravar uma tag que ainda não é injetiva nem protegida.
6. **Semelhantes/merge** — a tag de atribuição entra na comparação/preservação; depende de 1–2.
7. **K.8 (Public Analytics)** — continua bloqueada pelas condições da v3 15 + este documento.

## 13. Escopo e verificações desta etapa

- Arquivos inspecionados: `shared/profile.js`, `shared/auth.js`, `shared/router.js`, `shared/public-profile.js`,
  `shared/roles.js`, `shared/admin-*.js`, `shared/leaderboard.js`, `shared/flashcard-model.js`,
  `shared/anki-import.js`, `shared/my-flashcards.js`, `shared/tag-manager.js` (via RPC), migrations 001/037/038/043/
  056/057/058/059, `supabase/functions/notification-cron`, `docs/arquitetura-total-decks-tags-painel.md` e
  `docs/public-decks-auditoria.md`, `fr|zh/index.html` (campo de username).
- Banco real: consultas somente leitura (profiles: triggers, policies, constraints, índices, privilégios; funções
  que citam username; colisões; migrations aplicadas; policies/constraints de tags). Nenhuma escrita.
- Migration 059 (`059_teacher_metrics_note_level.sql`, métricas de professora, sem relação com identidade): o banco
  tem aplicada até `fix_teacher_metrics_card_selection` (058); **059 continua não aplicada**.
- Código de produção, schema, RLS, RPC, UI e usernames: **inalterados**. Nenhum push, deploy ou migration.
