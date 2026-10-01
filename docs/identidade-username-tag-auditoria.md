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
  `shared/anki-import.js`, `shared/my-flashcards.js`, `shared/tag-manager.js` (aberto e auditado na Parte II), migrations 001/037/038/043/
  056/057/058/059, `supabase/functions/notification-cron`, `docs/arquitetura-total-decks-tags-painel.md` e
  `docs/public-decks-auditoria.md`, `fr|zh/index.html` (campo de username).
- Banco real: consultas somente leitura (profiles: triggers, policies, constraints, índices, privilégios; funções
  que citam username; colisões; migrations aplicadas; policies/constraints de tags). Nenhuma escrita.
- Migration 059 (`059_teacher_metrics_note_level.sql`, métricas de professora, sem relação com identidade): o banco
  tem aplicada até `fix_teacher_metrics_card_selection` (058); **059 continua não aplicada**.
- Código de produção, schema, RLS, RPC, UI e usernames: **inalterados**. Nenhum push, deploy ou migration.

---

# PARTE II -- Fechamento da política de identidade USERNAME <-> TAG (2026-10-01)

Etapa de fechamento: **ainda não é implementação** e **nenhuma decisão foi tomada pelo Claude**. A Parte I
estava correta no diagnóstico; esta parte inspeciona o arquivo que faltava (`tag-manager.js`), formaliza o problema,
refina as alternativas e lista o que continua DECISÃO PENDENTE.

## 14. Auditoria de `shared/tag-manager.js` (aberto e lido por inteiro)

| Aspecto | O que o arquivo faz | Efeito sobre `criado-por-*` |
|---|---|---|
| Criação | Não cria Tags. O Painel só renomeia/exclui tags já existentes (criação vive no editor, `flashcard-tags-editor.js`) | Sem porta de criação aqui |
| Renomear | `planTagRename(old, rawNew, counts)` normaliza o texto digitado com `normalizeNoteTags([rawNew])`, valida com `validateNoteTags`, e chama `renameNoteTag(scope, old, newSlug)` → RPC `rename_note_tag`. Campo com `maxlength=80` | **Permite renomear qualquer tag para `criado-por-fulano`** (forja) e renomear a própria `criado-por-x` para outro nome |
| Excluir | Confirmação inline, depois RPC `delete_note_tag` (remove a tag exata de todas as Notes do escopo) | **Permite apagar `criado-por-*` em todas as Notes de uma vez** |
| Merge | A RPC funde quando o destino existe; a UI avisa a colisão (`data-tag-collision`) e não bloqueia | Renomear X → `criado-por-fulano` onde já existe funde silenciosamente na tag de sistema |
| Normalização | Só a função canônica `normalizeNoteTags`/`validateNoteTags` (nenhuma segunda regra) | Sem regra especial de prefixo |
| Cache/estado | Estado local `ui`; após rename/delete em `scope='own'`, `applyTagChangeToLocalState` atualiza `STATE.cards` (origin `self`) e `reviewTagFilter`. Scope `teacher` não altera estado local | Coerência local; nenhuma proteção |
| Tratamento de Tag de sistema | **Nenhum.** Zero ocorrência de `criado-por`, prefixo reservado ou lista de tags protegidas; a lista exibe todas as tags igualmente | Confirma 7.3 da v3 |
| Chamadas RPC | `list_note_tags`, `rename_note_tag`, `delete_note_tag` (057, SECURITY INVOKER); erros mapeados só para `invalid_tag`/`invalid_scope` | Servidor não distingue tag de sistema |
| Validação client | Só formato/limites (50 chars, 20 por Note). O servidor revalida só `^[a-z0-9]+(-[a-z0-9]+)*$` | Mesmo regex serve a `criado-por-ana` e a uma tag comum |

**Comparação com o diagnóstico anterior:** confirmado integralmente; nenhuma correção necessária. Dois detalhes
novos: (1) a rota de forja pelo Painel funciona também no escopo `teacher` (professora/admin sobre Teacher Cards);
(2) o merge do Painel é uma porta para **adulterar** (não só criar) uma atribuição legítima. Editor
(`flashcard-tags-editor.js`): `commit()` normaliza e adiciona qualquer slug, o chip tem botão ✕ para qualquer tag --
confirma o mesmo. Importação/exportação: ver 20.

## 15. Contrato ATUAL de username (consolidado, verificado no banco)

| Item | Estado | Origem |
|---|---|---|
| Alfabeto | `[a-z0-9_.-]` | CHECK `profiles_username_check` (verificado em `pg_constraint`) |
| Comprimento | 3–24 | CHECK |
| Caixa | **Somente minúsculas.** `Ana`/`ANA` são rejeitados pelo CHECK (`^[a-z0-9_.-]{3,24}$` é sensível à caixa) e `UNIQUE (profiles_username_key)` age sobre o texto já minúsculo. Portanto `Ana`/`ana`/`ANA` **não coexistem e não podem existir**, mesmo sem o frontend | banco |
| Unicidade | `UNIQUE (username)` | banco |
| Início/fim/sequência de separadores | Permitidos (`-ana`, `ana.`, `a..b`, `---`, `___`, `...`); nenhum perfil atual os usa (edge_sep 0, double_sep 0) | CHECK não restringe |
| Exigência de letra/dígito | **Nenhuma** no CHECK; hoje 0 perfis sem alfanumérico | CHECK |
| Armazenamento | `profiles.username`; nenhuma outra tabela guarda username como chave; identidade persistida é uuid | schema |
| Normalização | `slugifyUsername` no cliente (remove o inválido, corta em 24); não existe normalização no servidor além do CHECK | `profile.js` |
| Edição | Permitida pela própria conta (UPDATE direto, sem trigger) | RLS + ausência de trigger |
| Exclusão | `auth.users` → `profiles` ON DELETE CASCADE; o username volta a ficar livre imediatamente. **Não existe tabela de username reservado/aposentado** (0 tabelas com nome `reserved`/`username`/`alias`/`redirect`) | schema |
| Reutilização | Livre: qualquer nova conta pode registrar um username liberado | UNIQUE sem histórico |
| Rotas/links | `#/user/<username>`; busca normaliza com `trim().toLowerCase()`; sem alias/redirect/histórico | `router.js`, `public-profile.js` |
| Perfil público | Resolução por username (RPCs `get_public_profile_stats`, `get_public_flashcards`) | 037/038/043/056 |
| Criação inicial | `createInitialProfile`: parte local do e-mail → slugify → sufixo numérico em `23505` (até 30 tentativas). **15 das 41 contas de `auth.users` ainda não têm profile**; ao criarem, receberão username derivado do e-mail, possivelmente com `.` | `profile.js:138`, contagem no banco |

## 16. O problema formalizado

Seja `U` o conjunto de usernames válidos hoje: `U = { u : u ~ ^[a-z0-9_.-]{3,24}$ }` e `T(u)` a tag de atribuição
`normalizeTagSlug("criado-por-" + u)`, **o que equivale a `"criado-por-" + norm(u)` com `norm = trim_hifen ∘
colapsa_hifen ∘ (. _ → -)`** (para o alfabeto de `U`, NFD e caixa não têm efeito).

- `norm` **não é injetiva** em `U`: existem `u1 ≠ u2` com `T(u1) = T(u2)` (ex.: `ana.silva`, `ana_silva`,
  `ana-silva`; `ana`, `ana-`, `-ana`, `ana.`).
- `T` pode ser degenerada: se `u` não tem alfanumérico, `norm(u) = ""` e `T(u) = "criado-por"` (nenhum autor).
- A AT define `criado-por-[username]` como representação **permanente** da autoria e exige username imutável, mas
  não impõe que `T` seja injetiva.
- Logo, **username, no contrato atual, não é chave suficiente para identificar autoria por Tag.** Imutabilidade
  resolve estabilidade, **não** unicidade; proteção da tag resolve forja, **não** colisão; a unicidade exige uma das
  decisões da seção 18.
- Consequência independente: mesmo com `T` injetiva, o username liberado por exclusão pode ser reutilizado (15), o
  que quebra a permanência da atribuição por outra via.

Estado nos dados: 26 perfis, 0 colisões (Parte I, seção 4); **nenhuma correção histórica é necessária ou proposta**
e nenhuma migração preventiva de dados deve ser criada nesta etapa.

## 17. Colisões teóricas e usernames existentes

**Teóricas:** ver Parte I (3) e 16.
**Reais:** nenhuma. **Afetados pela normalização (3 perfis, todos com `.`, nenhum com `_`; 23 já canônicos
`^[a-z0-9]+(-[a-z0-9]+)*$`):** a tag deles seria `criado-por-<username com . → ->`, diferente do username
exibido.
Fatos (consulta somente leitura de 2026-10-01; nenhum username listado): os 3 têm `public_profile = true`, os 3
têm conteúdo próprio ou vínculos (cartões/vínculo de professora), 0 Notes com tags e 0 com `criado-por-*`, 0 Decks
públicos (tabela `decks` vazia), 0 tabelas de alias/redirect.

| Política possível para os 3 | Precisam mudar? | URL quebra? | Histórico quebra? | Redirect existe? | Atribuição pública já existe? |
|---|---|---|---|---|---|
| Aceitar como estão (tag normalizada difere do username) | Não | Não | Não | n/a | Não |
| Impor alfabeto canônico a futuros e deixar os 3 (grandfather) | Não | Não | Não | n/a | Não |
| Migrar os 3 para o alfabeto canônico | **Sim** (`.` → `-` ou remover) | **Sim**: `#/user/<antigo>` deixa de resolver | Reports antigos guardam o username da época (o contexto de Reports guarda o username como texto dentro do payload; nenhuma coluna de tabela além de `profiles.username` o armazena); vínculos/Premium/badges usam uuid → intactos | **Não** (precisaria de tabela de alias/histórico; a AT não define) | Não |
| Trocar a base da tag para identificador interno | Não | Não | Não | n/a | Não |

Observação: como os 3 já têm perfil público ativo, qualquer migração deles é uma mudança de identidade pública
**observável por quem tem o link**. Sem Tags nem Decks públicos ainda, hoje o custo é só de URL, e o momento de
menor custo é antes de existir qualquer atribuição.

## 18. Alternativas refinadas (nenhuma escolhida)

Refinamento após a leitura de `tag-manager.js`: **nenhuma alternativa dispensa a proteção da tag** (14: o Painel
renomeia/funde/apaga qualquer tag, e o editor/RPC aceitam o prefixo). Proteção é ortogonal e necessária em todas.

Legenda de avaliação: **literal** = continua sendo `criado-por-[username]` com o username exibido; **AT** = não
contradiz seção da AT; custo de migração e risco consideram os 26 perfis atuais e 15 contas ainda sem perfil.

| Critério | A. Restringir username ao conjunto que a normalização representa (`[a-z0-9]` + `-` interno) | B. Username canônico desde a origem + ajuste dos 3 existentes | C. Mudar a normalização da tag para preservar mais informação | D. Username livre + identificador interno na tag | E. Híbrido: username visível + identificador estável só p/ atribuição | F. Checagem de unicidade por slug (sem restringir o alfabeto) |
|---|---|---|---|---|---|---|
| Literal `criado-por-[username]` | Sim (username = slug) para novos | Sim | Parcial (tag preserva `.`/`_`, mas muda o contrato de formato de tag) | **Não** (tag usa outro valor) | Parcial (tag usa o id; o username aparece ao lado) | Sim para quem não colide; a tag ainda difere do username (`.` vira `-`) |
| Compatível com a AT | Sim (§10.3, §20, §10.1 "evitar caracteres especiais") | Sim | **Conflita** com §10.1 (tags sem caracteres especiais) e com `note_tag_is_canonical` | Contradiz o exemplo `criado-por-catharinaurbani` (§10.3) | Depende de reinterpretar `[username]`; AT não prevê | Sim |
| Estabilidade | Com imutabilidade, total | idem | idem | Total (independe do username) | Total | Com imutabilidade |
| Unicidade tag↔autor | Garante para novos; os 3 `.` ficam fora da garantia se grandfathered | Garante para todos após ajuste | Garante se o mapa for injetivo | Total | Total | Garante contra novas colisões; não impede tags "diferentes do username" |
| URLs | Preserva (não muda username) | **Quebra** as dos 3 migrados (sem redirect) | Preserva | Preserva | Preserva | Preserva |
| Perfil Público | Intacto | Muda para os 3 | Intacto | Intacto | Intacto | Intacto |
| Usernames existentes | 3 com `.` seguem inválidos pela nova regra (grandfather) | Os 3 mudam | Nenhum muda | Nenhum muda | Nenhum muda | Nenhum muda |
| Contas futuras (15 sem perfil, e-mail com `.`) | Precisam de regra de derivação do username inicial (hoje o e-mail gera `.`) | idem | Sem impacto | Sem impacto | Sem impacto | Colisão detectada na criação; sufixo numérico já existe |
| Atribuição permanente | OK com imutabilidade + reserva | OK | OK | OK (sobrevive até a renomeação) | OK | OK com reserva |
| Exclusão de conta / reuso | Precisa de reserva de username | idem | idem | O id interno pode ser aposentado separadamente | idem | Precisa de reserva |
| Tags / Painel de Tags | Proteger prefixo | idem | Mudança global do regex/normalização | Proteger prefixo; tag opaca | Proteger prefixo | Proteger prefixo |
| Importação / exportação | Tags `criado-por-*` precisam de política (validar origem) | idem | idem | idem | idem | idem |
| Notes / CardInstances / Reverse / Cloze | Sem impacto (tag na Note) | idem | idem | idem | idem | idem |
| Complexidade de migração | Baixa (CHECK novo + regra para os 3) | Média (migra 3 + 15 pendentes) | Alta (mexe em função usada por editor, Anki, Painel, filtro, 057, CHECK 056) | Média/alta (coluna + backfill + UI de exibição) | Média/alta | Baixa/média (índice único por expressão) |
| Risco de quebrar dados futuros | Baixo | Médio (URLs) | **Alto** (formato de tag global) | Médio (contradiz o exemplo da AT) | Médio | Baixo |
| Resolve `___` | Sim (exige alfanumérico) | Sim | Parcial | Sim | Sim | Só com regra extra (exigir alfanumérico) |
| Resolve a colisão | Sim para novos | Sim | Sim | Sim | Sim | Sim (para novos) |

Alternativa **G** (sustentada pelo código/AT? **Não encontrada**): nenhuma outra alternativa é sustentada pela AT;
combinar A/B/F com a proteção do prefixo é a família menos invasiva, mas **é uma recomendação técnica, não uma
decisão**.

## 19. Username excluído

Cenário: `ana` cria atribuição `criado-por-ana`, exclui a conta; `B` registra `ana`.

- Hoje: o CASCADE libera `ana`; sem reserva, `B` passa a gerar `criado-por-ana`; as cópias antigas parecem de `B`
  (ambiguidade histórica; **pior** que colisão de normalização, porque ocorre mesmo com tag injetiva).
- Alternativa R1: **reservar permanentemente** todo username já usado por uma conta com atribuição (tabela de
  reservados/aposentados; impede reuso; custo: acúmulo de nomes indisponíveis).
- Alternativa R2: reservar **só** usernames que já produziram atribuição pública (menor acúmulo; exige o rastreio
  de "tag emitida").
- Alternativa R3: permitir reuso e aceitar a ambiguidade (contradiz "permanente/representa o autor", §10.3).
- Alternativa R4: identificador interno na tag (D/E) torna o reuso inócuo para a atribuição, mas muda a forma.
- Impacto comum: toda reserva exige tabela/trigger nova e decisão sobre direito de exclusão (LGPD) -- a AT não trata.
- Estado: **não definido pela AT**.

## 20. Username sem identidade útil

- O CHECK permite `___`, `...`, `---`, `-_-`, `.-.` (3+ separadores, sem alfanumérico). Hoje existem **0**.
- Para qualquer um deles `norm(u) = ""` e `T(u)` vira `criado-por` (a normalização remove o hífen final), tag igual
  para todos eles e sem autor.
- Também degradado (não vazio, mas pouco informativo): `1__` ou `_a_` → `criado-por-1` / `criado-por-a`, e podem colidir com `1`/`a`-derivados como `1.a`? não; colidem com outro username que normalize igual (ex.: `a--` e `_a_`).
- AT: **nada define**. Alternativas A/B/F (exigir pelo menos um alfanumérico e/ou iniciar/terminar alfanumérico),
  D/E (irrelevante para a tag, mas ainda precisa de username útil para a URL) -- todas exigem a decisão do
  alfabeto.

## 21. Portas de forja/adulteração (revisão completa, pós `tag-manager.js`)

| Porta | Onde | Pode forjar/apagar `criado-por-*`? | Defesa hoje |
|---|---|---|---|
| Editor de tags (criar/remover chip) | client (`flashcard-tags-editor.js`) | Sim (cria, remove) | Nenhuma |
| Painel (rename) | client + RPC `rename_note_tag` (server) | Sim (forja/adultera/funde) | Nenhuma |
| Painel (delete) | client + RPC `delete_note_tag` (server) | Sim (apaga global) | Nenhuma |
| UPDATE direto em `own_flashcards.tags` | **server** (policy `own_flashcards_owner_all`) | Sim | Só CHECK 20×50 |
| UPDATE em `teacher_flashcards.tags` | server | Só admin (026) | RLS admin-only |
| Importação `.apkg` | client (`anki-import.js`, tags de `note.tags`) | Sim (tag `criado-por-x` no pacote) | Normalização + limites |
| Importação por arquivo/link (Meus Cartões) e cópia de perfil público | client (`nativeNoteEditorStateFromImportPayload`, `partitionNoteTagsByLimits`) | Sim (payload editável, tags viajam como valor) | Normalização + limites |
| Export Anki | client | Exporta como qualquer tag (sem corrupção) | n/a |
| Operação administrativa | admin só altera `teacher_flashcards`; `service_role`/SQL ignora RLS | Sim (por natureza) | Só trigger poderia limitar |
| `get_public_flashcards` (056) | server (devolve `tags`) | Divulga as tags como estão | Nenhuma validação de origem |
| Merge via rename | server | Funde em tag de sistema | Nenhuma |

Conclusão: nenhuma porta distingue tag de sistema; toda defesa precisaria estar no **servidor** (trigger sobre
`tags` das duas tabelas + validação nas RPCs) e, para a emissão legítima, num caminho server-side único que gere
`criado-por-*` a partir da identidade real do autor.

## 22. Note/CardInstance (reconfirmação no código)

Tags vivem na linha (`own_flashcards.tags`/`teacher_flashcards.tags`); `buildEngineCardsFromRow` computa
`normalizeNoteTags(row.tags)` **uma vez** e entrega a mesma lista a todas as CardInstances da linha; Reverse e Cloze
multi-marca não criam atribuições independentes porque são derivados de uma Note; regerar/revisar mantém a Note;
renomear/apagar pelo Painel atua por linha. **Exceção:** o export Anki emite CardInstances como notas separadas;
reimportar cria Notes independentes que podem divergir depois (7j). Isso não é regressão desta auditoria, e a AT já
proíbe tratar a cópia por Anki como atribuição de Deck público.

## 23. Atribuição NÃO é deduplicação

Contrato explícito: a tag `criado-por-*` identifica **autoria/origem**. Ela **não** decide se o conteúdo já foi
importado, se duas cópias devem ser fundidas, se Notes semelhantes são iguais nem qual o algoritmo de similaridade
(pendência 3 da v3). Nenhum `source_card_id`, coluna de origem ou equivalente é proposto aqui; a AT não define isso e
não foi criado nada.

## 24. Revisão da Arquitetura Total (o que está FECHADO e o que é PENDENTE)

| Questão | Situação | Seção da AT |
|---|---|---|
| Atribuição por `criado-por-[username]` | FECHADO | §10.3 |
| Tag permanente, não apagável pelo destinatário, representa o autor, permanece se o Deck for movido | FECHADO | §10.3 |
| Em cópias múltiplas preserva-se só a atribuição original | FECHADO | §10.3 |
| Username único e imutável; display name editável | FECHADO | §10.3, §20, inv. 15 |
| Tags minúsculas, sem acento, sem espaço, "evitar caracteres especiais", sem hierarquia | FECHADO | §10.1 |
| Tags pertencem à Note; irmãos compartilham | FECHADO | §10 |
| Perfil público em `fr/#/user/username` | FECHADO (formato hash) | §20 |
| Formato canônico do username | **DECISÃO PENDENTE** (AT não restringe o alfabeto do username) | -- |
| Como resolver a colisão da normalização | **DECISÃO PENDENTE** | -- |
| Tratamento dos 3 usernames existentes | **DECISÃO PENDENTE** | -- |
| Reserva de username após exclusão | **DECISÃO PENDENTE** | -- |
| Username sem alfanumérico | **DECISÃO PENDENTE** | -- |
| Se `[username]` na tag é o username literal ou admite outro identificador | **DECISÃO PENDENTE** (o exemplo literal da AT sugere o username, mas não proíbe outro) | §10.3 (exemplo) |
| Redirect/histórico de username | **DECISÃO PENDENTE** (inv. 15 torna desnecessário se não houver mudança; só importa se houver migração dos 3) | -- |
| Proteção servidor da tag de sistema | Exigida pelo contrato ("não pode ser apagada"); mecanismo **não definido** | §10.3 |

## DECISÕES NECESSÁRIAS ANTES DA IMPLEMENTAÇÃO

Nenhuma respondida pelo Claude. Cada item lista as opções já levantadas.

1. **Qual formato canônico de username será adotado?** (alfabeto, início/fim, exigir alfanumérico; ou manter o atual
   e depender de F/D/E).
2. **Os 3 usernames existentes com `.` precisam mudar?** (aceitar como estão / grandfather / migrar com redirect /
   migrar sem redirect). Impacto: URL pública ativa dos 3; 0 atribuições existentes.
3. **Como tratar usernames futuros que poderiam colidir?** (restringir alfabeto / unicidade por slug / identificador
   interno), e como derivar o username inicial do e-mail (15 contas ainda sem perfil).
4. **Username excluído fica reservado?** (R1 sempre, R2 só se emitiu atribuição, R3 reutilizável, R4 irrelevante
   com identificador interno).
5. **O que fazer com username como `___`?** (rejeitar na origem exigindo alfanumérico; ou aceitar com tag
   degenerada, o que contradiz o contrato).
6. **A atribuição continuará literalmente baseada no username?** (determina A/B/F vs. D/E).
7. **A arquitetura permite algum identificador adicional sem substituir a Tag exigida?** (a AT não proíbe nem
   prevê; exige confirmação de produto).
8. **Como preservar URLs se usernames forem normalizados?** (grandfather evita; migração exigiria alias).
9. **Existe necessidade de redirect histórico?** (só se houver migração ou se a imutabilidade admitir exceções).

Ficam fora das decisões de identidade, mas dependentes: o mecanismo de proteção da tag (trigger/RPC), a política de
importação para tags `criado-por-*` (aceitar, rejeitar ou reescrever na entrada) e o algoritmo de similaridade.

## 25. Dependências entre fases

`IDENTIDADE (decisões 1–9) → USERNAME IMUTÁVEL (trigger/RPC/UI) → TAG DE SISTEMA PROTEGIDA (servidor) → PROJEÇÃO
PÚBLICA NATIVA (emitir a tag a partir da identidade, sem confiar no cliente) → PUBLIC DECK → IMPORTAÇÃO → SEMELHANTES/
MERGE → PERFIL PÚBLICO (lista de Decks) → K.8.`

Diferença justificada em relação ao encadeamento proposto: **reserva de username (decisão 4) e proteção do prefixo
podem ser feitas em paralelo à imutabilidade**, mas nenhuma pode ser adiada para depois da projeção pública, porque a
primeira cópia emitida já cria atribuição permanente. A imutabilidade **sozinha** não torna a Tag segura: precisa de
(a) tag injetiva ou identificador, (b) reserva, (c) proteção servidor.

## 26. Verificações da Parte II

- Arquivos realmente abertos: `shared/tag-manager.js` (inteiro), `shared/flashcard-tags-editor.js` (inteiro),
  trechos de `shared/flashcard-native-persistence.js`, `shared/anki-import.js`, `shared/anki-export.js`,
  `shared/my-flashcards.js` (grep de `tags`), e a AT (§10, §20, busca por reserva/exclusão/redirect/identificador).
- Banco real (somente `SELECT`/catálogos): contagens por padrão de caractere em `profiles`, cruzamento com conteúdo,
  tabelas de reserva/alias/redirect, número de usuários de `auth.users` (41) e perfis (26). Nenhuma escrita.
- Nenhum código, schema, RLS, RPC, UI, username ou dado alterado; sem migration; sem push; sem deploy; migration 059
  **não aplicada**.

---

# PARTE III -- Contrato PROPOSTO de identidade USERNAME <-> TAG (2026-10-01)

Fechamento de contrato, **sem implementação**. Legenda usada nesta parte (em todo item):

- 🟦 **ARQUITETURA JÁ DEFINIDA** -- exigida pela Arquitetura Total (AT), com a seção.
- 🟩 **PROPOSTA TÉCNICA** -- decisão sugerida para fechar uma lacuna; ainda não aprovada.
- 🟨 **DECISÃO PENDENTE** -- depende de aprovação de produto/arquitetura.
- 🟥 **PRÉ-REQUISITO** -- precisa estar pronto antes da fase seguinte.

Nada aqui altera código, schema, usernames ou Tags. Migration 059 continua não aplicada.

## 27. Consulta final (somente leitura, 2026-10-01) -- resultado agregado

Executada no banco real; nenhum username listado; nenhuma escrita.

| Verificação | Resultado |
|---|---|
| `profiles` / usernames distintos / duplicados | 26 / 26 / 0 |
| Fora do formato canônico proposto (`^[a-z0-9]([a-z0-9-]{1,22}[a-z0-9])$`, 3–24) | **3** (todos por `.`) |
| Fora do canônico **sem hífens consecutivos** | 3 (os mesmos) |
| Usernames com `--` | 0 |
| Grupos colidindo sob a regra atual de tag | **0** |
| Entre os 3 que migrariam: colisão entre si / com username existente (substituindo `.` por `-`) | **0 / 0** |
| Os 3 têm candidato válido por simples substituição `.`→`-` (3–24, canônico) | **3 de 3** |
| Notes com tag `criado-por*` (`own_flashcards` / `teacher_flashcards`) | **0 / 0** |
| Notes com qualquer tag (own / teacher) | 0 / 0 |
| Decks (qualquer tipo) | **0** (portanto nenhum Deck tem tag `criado-por-*`) |
| Tabelas de reserva/alias/redirect/username | **0** |
| `auth.users` sem profile | **15** |
| Desses 15: parte local do e-mail com `.` / com `_` / com caracteres removíveis | **4 / 0 / 0** |
| Desses 15: canônico curto demais (<3) / colisão interna / colisão com username existente | 0 / 0 / 0 |

Conclusões: **nenhuma das três atribuições existe**; os 3 usernames com `.` não têm atribuição pública (confirmado:
zero tags `criado-por*` em todo o banco) e podem ser migrados sem colisão; 4 das 15 contas futuras já nasceriam com
`.` pela regra atual de derivação por e-mail.

## 28. Dois problemas distintos (ambos precisam ser resolvidos)

| | Problema A -- colisão por normalização | Problema B -- reutilização após exclusão |
|---|---|---|
| Causa | `norm` não é injetiva (`ana.silva`, `ana_silva`, `ana-silva`) | O CASCADE de `auth.users` libera o username; nenhuma reserva |
| Exemplo | duas contas vivas geram a mesma `criado-por-ana-silva` | A exclui `ana`; B registra `ana`; as cópias antigas passam a "pertencer" a B |
| Resolve imutabilidade? | Não | Não |
| Resolve tag injetiva? | Sim | Não |
| Resolve proteção de tag? | Não | Não |
| Exige | username canônico (ou id interno) | reserva permanente |

🟩 A política proposta só é suficiente se contiver os **dois** mecanismos mais a imutabilidade e a proteção do
prefixo. Cada um sozinho deixa uma falha aberta.

## 29. Política proposta, ponto a ponto

### 29.1 Username canônico -- 🟩 PROPOSTA TÉCNICA (AT: 🟦 §10.1 "evitar caracteres especiais" para tags; §10.3 exemplo `criado-por-catharinaurbani`)

Regra proposta: `^[a-z0-9]([a-z0-9-]{1,22}[a-z0-9])$` (3–24; só `a-z`, `0-9`, `-`; começa e termina alfanumérico).

**🟥 Incompatibilidade nova, não percebida antes:** a regra *como enunciada* **ainda não é injetiva sobre a tag**.
`normalizeTagSlug` colapsa `-+` em `-`, portanto `ana--silva` e `ana-silva` (ambos canônicos pela regra proposta)
geram a mesma tag. Para a tag ser idêntica ao username (`norm(u) = u` para todo username válido) a regra precisa
**também proibir hífens consecutivos** (`(?!.*--)`). Hoje há 0 usernames com `--`, então não há custo de dados.
Regra corrigida proposta: `^[a-z0-9]+(-[a-z0-9]+)*$` com comprimento 3–24 (é exatamente o regex canônico de tag
`note_tag_is_canonical`, sem o limite de 50). Com ela, `normalizeTagSlug("criado-por-" + u) = "criado-por-" + u`:
a tag é literalmente `criado-por-[username]`, e `___`, `...`, `-a-`, `a--b` deixam de existir.

Compatibilidade verificada:

| Item | Resultado |
|---|---|
| CHECK atual `^[a-z0-9_.-]{3,24}$` | A regra nova é um **subconjunto** estrito: pode ser imposta sem rejeitar nenhum valor futuro válido; 23 dos 26 atuais já a satisfazem; 3 não (por `.`). Pode ser adicionada como `CHECK ... NOT VALID` (vale para INSERT/UPDATE novos, não revalida as 3 linhas existentes) e validada depois da migração. Detalhe: a coluna não pode ser UPDATEada nas 3 linhas enquanto estiver `NOT VALID` sem satisfazer a regra -- é o mecanismo desejado |
| Comprimento | 3–24 mantido; tag máxima `criado-por-` (11) + 24 = 35 ≤ 50 |
| Rotas `#/user/<username>` | `-` é seguro no hash; o router separa por `/`; sem mudança de rota |
| Perfil público / RPCs por `p_username` | Sem mudança de forma; as RPCs seguem comparando texto exato (já minúsculo) |
| Criação automática (`createInitialProfile`) | **Incompatível hoje:** `slugifyUsername` aceita `.`/`_`/`--`; precisa de função de derivação canônica (ver 29.9). Achado latente: sufixo numérico é concatenado **depois** do `slice(0,24)`, então base de 24 caracteres + sufixo estoura o CHECK (erro `23514`, não `23505`, e a função devolve `null` sem tentar de novo). Truncar em 24 pode também terminar com `-` |
| Auth | Supabase Auth não usa username; sem impacto |
| Importação / exportação | Não usam username; só tags (ver 29.7) |
| Edição pelo usuário (UI) | `slugifyUsername`/placeholder `seu_username` (contém `_`) e o input precisam mudar; sem username editável (29.2) |

### 29.2 Username imutável -- 🟦 AT (§10.3, §20, inv. 15) + 🟩 mecanismo proposto

Caminhos a fechar (conceitual): UPDATE direto por API (hoje aberto), RPC (nenhuma altera), Edge Function (nenhuma
altera), frontend (`saveProfileEdits`), admin (sem tela), `service_role`/SQL.
Mecanismo proposto: trigger `BEFORE UPDATE` em `profiles` que rejeita `NEW.username <> OLD.username` para qualquer
papel, com **um único caminho controlado** para a migração das 3 contas (função dedicada ou flag de sessão
verificável) e desligável apenas por esse caminho; mais a remoção de `username` do payload de `saveProfileEdits` e
campo somente leitura na UI. 🟥 Pré-requisito: a política de definição inicial (29.9) -- depois de imutável, um
username derivado do e-mail e nunca revisado não poderá ser corrigido.
🟨 Pendente: existe "janela final de ajuste" para os 23 perfis canônicos já existentes (podem hoje editar) ou ficam
travados como estão? A AT diz "imutável" sem janela.

### 29.3 Os 3 usernames existentes com `.` -- 🟩 proposta / 🟨 aprovação

- Regra de transformação proposta: `.` → `-`, colapsar `-+`, remover `-` das pontas, validar 3–24.
- Resultado verificado na consulta (27): **3 de 3** produzem candidato válido; **0** colisão entre si; **0** colisão com
  username existente. Se uma colisão aparecer antes da execução, a regra de desempate precisa ser definida
  **e confirmada** (ex.: sufixo numérico) -- nunca automática.
- 🟨 **Confirmação/preview obrigatórios:** gerar uma lista `username atual → candidato` para aprovação humana antes de
  executar; nenhum nome é escolhido silenciosamente.
- Preservação: a migração só altera `profiles.username` (uuid é a identidade); `profile`, `display_name`, bio, avatar,
  badges, Premium, vínculos de professora, Cards, Notes e Decks usam `user_id` e permanecem intactos. Não existem
  Decks nem tags `criado-por-*`, então nada de atribuição é afetado.
- Impacto em URLs: o link `#/user/<antigo>` deixa de resolver (consulta confirma perfil público ativo nos 3).
  Reports já gravados guardam o username antigo como texto no payload do contexto.
- 🟥 **Antes de executar:** repetir a consulta de 27 confirmando 0 tags `criado-por-*` (inclusive nos 3) e 0 Decks.

### 29.4 Aliases / URLs antigas -- 🟨 DECISÃO PENDENTE (AT não define)

Não assumir que são obrigatórios. Comparação (mecanismo de **compatibilidade**, nunca de identidade):

| Opção | Efeito | Custo | Risco |
|---|---|---|---|
| Redirect (consulta no nome antigo → perfil atual; só para os 3) | Links antigos continuam funcionando | Tabela mínima de pares antigo→atual + lookup no cliente/RPC | Se o antigo for reservado (29.5) não há conflito; se não, ambiguidade |
| Alias permanente | Idem, e o antigo pode continuar resolvendo para sempre | Idem; vira dívida permanente | Confunde identidade com URL, se mal desenhado |
| Perfil "não encontrado" | Link antigo quebra | Nenhum | Perda de links compartilhados dos 3 (único impacto conhecido, sem Decks públicos ainda) |
| Outra | -- | -- | -- |

Observação: como hoje não existe Deck público nem atribuição, a quebra dos 3 links é de baixo custo **se ocorrer
antes** de Public Deck.

### 29.5 Reserva permanente após exclusão -- 🟩 DECISÃO DE ARQUITETURA PROPOSTA (AT não define)

- Necessidade: tabela de usernames reservados (`username` único, `reserved_at`, motivo). Recomendação técnica:
  **reservar ao INSERT do profile** (todo username já atribuído, não só no DELETE), porque o DELETE ocorre por CASCADE de
  `auth.users`, `service_role` ou SQL e é mais fácil perder; um trigger `BEFORE DELETE` poderia ser redundante.
- Efeito: após exclusão, o username não pode ser registrado por outra conta. Contas nunca existentes seguem livres.
- O dono original poderia recuperar o próprio username? 🟨 pendente (a reserva tem que ser vinculada ao `user_id`
  original ou anônima).
- Impacto em URLs: `#/user/<excluído>` continua "não encontrado" (sem alias), mas **não é reutilizável**.
- Impacto em direitos de exclusão (LGPD): a reserva guarda um nome, não dado pessoal adicional; ainda assim 🟨 exige
  decisão (o nome pode ser pessoal).
- Interação com a migração dos 3: os nomes `.` antigos entram na reserva (ou no alias, 29.4); nenhuma outra conta os
  assumirá.

### 29.6 Username sem identidade -- 🟩 consequência do 29.1

Com `^[a-z0-9]+(-[a-z0-9]+)*$`, `___`, `...`, `---`, `-a-` não existem; o sufixo da tag nunca é vazio. Hoje: 0 casos.

### 29.7 `criado-por-*` como Tag de sistema -- 🟦 AT (§10.3: permanente, não apagável pelo destinatário) + 🟩 proteção proposta

Exigência: server-side, em **todas** as portas (21): trigger sobre `tags` de `own_flashcards` e `teacher_flashcards`
(rejeitar inserir/alterar/remover `criado-por-*` fora do caminho legítimo), validação nas RPCs
`rename_note_tag`/`delete_note_tag` (nem origem nem destino com o prefixo; sem merge), importação (`.apkg`, arquivo/link,
cópia de perfil público: descartar ou rejeitar tags com o prefixo vindas do payload) e uma **única via de emissão** no
servidor que gere a tag a partir do `username` real do autor lido de `profiles` (nunca do cliente). Esconder na UI não
basta. 🟨 Pendente: na importação, rejeitar a Note, descartar apenas a tag ou reescrever; e se o próprio autor pode
ver a tag nas suas Notes (a AT diz que aparece como tag da Note, bloqueada).

### 29.8 Atribuição na Note -- 🟦 AT (§10, inv. 11)

Confirmado como contrato: a tag pertence à Note; Reverse e Cloze compartilham; CardInstances irmãos têm a mesma
origem; regenerar/revisar CardInstances não cria autoria (CardInstance nem é persistido); editar a cópia não remove a
tag; cópia de cópia mantém só o autor original. **Não** são criados `source_user_id`/`source_card_id`.

### 29.9 Contas sem username (15) -- 🟩 proposta / 🟨 aprovação

Derivação canônica determinística proposta a partir da parte local do e-mail: minúsculas → remover acentos →
substituir qualquer caractere fora de `[a-z0-9]` por `-` → colapsar `-+` → remover `-` das pontas → se <3 caracteres,
completar com sufixo determinístico → truncar para caber **junto com o sufixo** em 24 → verificar contra
`profiles` **e contra a reserva** → em colisão, sufixo numérico canônico (`-2`/`2`; formato a aprovar) reavaliado depois
do truncamento.
Dados (27): das 15, **4** têm `.` (viram `-`), 0 `_`, 0 caracteres removíveis, 0 curtos demais, 0 colisão interna,
0 colisão com username existente. 🟨 Pendente: derivar automaticamente ou pedir confirmação do nome na primeira
entrada (importante porque o username será imutável).

### 29.10 Deduplicação -- 🟦 separada (v3 pendência 3; AT §19/§23)

`criado-por-*` identifica **autoria**; não decide se já foi importado, se Notes são semelhantes, se devem ser
fundidas ou qual o algoritmo. Isso pertence à fase de semelhantes/merge. Nenhum campo de origem é criado.

### 29.11 Resumo dos dois problemas

A (normalização) é resolvida por 29.1 corrigido (sem hífens consecutivos); B (reutilização) por 29.5; imutabilidade
(29.2) e proteção da tag (29.7) fecham estabilidade e forja. Nenhum item sozinho basta.

## 30. Alternativas (nomenclatura desta etapa) -- comparação, sem escolha

Mapeamento: A = manter username livre e mudar a normalização da Tag; B = manter username livre e usar identificador
interno na Tag; C = username canônico restrito (esta proposta); D = username visual livre + identificador interno; E =
híbrido (username canônico restrito para novos + identificador/alias para atribuição quando o nome visível diferir).

| Critério | A | B | C (proposta) | D | E |
|---|---|---|---|---|---|
| Literal `criado-por-[username]` | Parcial (tag preserva `.`/`_`) | **Não** | **Sim** (tag = username) | Não | Sim para canônicos; id só como exceção |
| Compat. AT | **Conflita** com §10.1 (sem caracteres especiais) | Contradiz o exemplo §10.3 | Compatível (§10.1/§10.3/§20) | Contradiz §10.3 | Compatível se o id for só auxiliar |
| Unicidade tag↔autor | Só se o novo mapa for injetivo | Total | **Total**, desde que sem `--` e com reserva | Total | Total |
| Estabilidade | Com imutabilidade | Total (independe do nome) | Com imutabilidade + reserva | Total | Total |
| Usernames existentes | Nenhum muda | Nenhum muda | **3 mudam** | Nenhum muda | 3 mudam ou ficam como exceção |
| URLs | Preserva | Preserva | Quebra as 3 sem redirect (🟨) | Preserva | Preserva |
| Tags | Muda a função global (editor, Anki, Painel, filtro, 057, CHECK 056) | Tag opaca | Sem mudança de regra de tag | Tag opaca | Sem mudança |
| Importação | Reescrita de tags históricas | Reescrever em cópias | Proteger prefixo | Idem | Idem |
| Atribuição / Note / Reverse / Cloze | Igual (nível de Note) | Igual | Igual | Igual | Igual |
| Complexidade | Alta (mexe numa função compartilhada) | Média/alta | **Baixa/média** | Média/alta | Alta (dois mecanismos) |
| Risco | Alto (formato global de tag) | Médio (dado novo + exibição) | Médio-baixo; ver incompatibilidades abaixo | Médio | Médio-alto |

**Incompatibilidades de C destacadas (nenhuma é bloqueante, mas todas exigem decisão):**
1. Sem a proibição de hífens consecutivos, C continua não injetiva (29.1).
2. Imutabilidade + derivação automática do e-mail: o usuário pode ficar preso a um nome que nunca escolheu (29.2/29.9).
3. `createInitialProfile` hoje viola o CHECK por sufixo/truncamento em casos de borda (29.1).
4. As três contas migradas quebram links existentes (29.3/29.4), embora ainda sem atribuição.
5. A reserva é um mecanismo **novo** (tabela e trigger) que a AT não prevê, embora seja necessário para a permanência
   que a AT exige; não é opcional em nenhuma alternativa que mantenha o username como base da tag.
6. A AT não restringe o alfabeto do username: C é uma interpretação *conservadora* de §10.3 ("username" = valor
   que cabe numa tag), não uma regra explícita da AT.

## 31. Ordem de implementação futura (avaliada)

Ordem proposta pelo contrato: 1 contrato → 2 proteção server-side do username → 3 migração dos existentes → 4 reserva →
5 Tag de sistema → 6 projeção pública nativa → 7 Public Deck + segurança → 8 importação → 9 semelhantes/merge →
10 Perfil Público/Decks → 11 K.8.

Dependências encontradas que **alteram** a ordem:
- A **reserva (4) deve vir antes ou junto da imutabilidade (2) e da migração (3)**: a migração libera nomes `.`
  (que precisam entrar na reserva) e a reserva-no-INSERT deve estar ativa antes de qualquer novo profile.
- A **derivação de username (29.9) e a nova função de slug devem ser entregues junto do CHECK canônico**: se o CHECK
  entrar antes da mudança no cliente, `createInitialProfile` falha para as 4 contas com `.` (e qualquer nova).
- O **CHECK canônico `NOT VALID` entra junto da imutabilidade**, mas a imutabilidade precisa de **uma exceção
  controlada** para a própria migração das 3 contas; só depois valida-se a constraint.
- A **proteção do prefixo (5) pode e deve rodar em paralelo a 2–4** (é independente de dados) e precisa existir antes
  de 6, mas a emissão da tag (6) **depende de 1–4** (lê o username definitivo no servidor).
- Importação (8) depende de 5 (descarte/rejeição do prefixo) além de 7.
Ordem revisada sugerida: **1 → (4 + CHECK NOT VALID + derivação) → 2 → 3 → validar CHECK → 5 → 6 → 7 → 8 → 9 → 10 → 11**,
com 5 em paralelo desde 2.

## 32. APROVAÇÃO NECESSÁRIA ANTES DA IMPLEMENTAÇÃO

Somente decisões **não** determinadas pela AT. Nenhuma foi respondida pelo Claude.

1. **Aceitar ou não o username canônico restrito.** Proposta: `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–24 (inclui a correção sem
   `--`). Alternativas A, B, D, E (seção 30).
2. **Política para os 3 usernames existentes com `.`.** Migrar com preview e confirmação, por `.`→`-` (3 de 3 viáveis, 0
   colisão), ou aceitar como exceção/grandfather. Pendente: janela final de ajuste para os 23 já canônicos.
3. **Reserva permanente após exclusão.** Aceitar a tabela de reserva (ao INSERT do profile), e decidir: o dono original
   pode reaver o username? reservas são anônimas?
4. **Comportamento de URLs antigas.** Redirect, alias permanente ou "não encontrado" (afeta só os 3 perfis hoje).
5. **Política de geração para os 15 profiles sem username.** Derivação automática determinística (com colisão/truncamento
   e consulta à reserva) ou confirmação do nome na primeira entrada, sabendo que ficará imutável.
6. **Confirmação de que `criado-por-*` será Tag de sistema protegida server-side**, com decisão sobre importação (rejeitar
   a Note, descartar a tag ou reescrever) e visibilidade para o autor.

Verificação adicional que depende de você: aprovar o regex final **sem hífens consecutivos**, por ser uma ampliação do
que foi enunciado.

## 33. Verificações desta etapa (Parte III)

Consulta ao banco: sim, somente leitura, agregada (27); sem escrita. Arquivos lidos: os da Parte I/II (nenhum novo foi
necessário). Código, schema, RLS, RPC, UI, usernames e Tags: **inalterados**. Sem push, sem deploy. Migration 059:
não aplicada. Testes: não aplicável (documentação).
