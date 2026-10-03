# Runbook de rollback — migrations 059–069 (produção em 058)

> Documento de **referência**. Nada aqui foi executado. Todo SQL abaixo é marcado
> "NÃO EXECUTAR — referência". Números de linha conferidos com `grep -n`/`sed -n`
> em `shared/supabase_migrations/` (arquivos `NNN_*.sql`; abreviados por `NNN`).

Ordem operacional de aplicação: **060 → 061 → 062 → 063 → 064 → 065 → 066 → 067 → 068 → 069 → 059** (SQL Editor: 060, 061, 062, 063, 066; ferramenta: 064, 065, 067, 068, 069, 059). O rollback completo é na ordem inversa.
Estado de produção antes: 058 (`fix_teacher_metrics_card_selection`).

## 0. Princípios (honestidade)

- Só há bloco `ROLLBACK` no arquivo em: 059, 060, 061 (incompleto), 063, 064, 065, 066, 067 e 068 (só uma frase, não é SQL). **062 e 069 não têm rollback no arquivo.**
- Reverter função `create or replace` = **recriar a definição anterior a partir do arquivo anterior**. Nada é "desfeito" automaticamente.
- Dropar funções/colunas **não desfaz dados** criados depois do rollout (ver seção 7).
- Rollback deve ser feito em **ordem inversa** (059 → 069 → 068 → … → 060, inverso da ordem de aplicação), nunca fora de ordem, porque 067/068/069 dependem de 062, que depende de 061, que depende de 060.
- Antes de qualquer rollback, confirmar o ref do projeto (`eigjocalzwamisgqilhg`) e tirar snapshot (contagem/hash de `decks`, `own_flashcards`, `profiles`).

## 1. Migration 059 — `get_teacher_student_metrics` por Note

- **Objetos:** `create or replace function public.get_teacher_student_metrics(uuid, text)` (059:41–147), `revoke … from public` / `from anon` (149–150), `grant execute … to authenticated` (151). Nenhum schema, dado ou RLS.
- **Rollback no arquivo:** 059:40, uma linha de texto: "reaplicar o corpo de 058". **Completo** (é só uma função).
- **Rollback real:** recriar a definição de `058_fix_teacher_metrics_card_selection.sql`, **linhas 21–119** (função) e **120–121** (revoke/grant).
- **Dados:** nenhum.
- **Dependências / impacto no cliente:** reverter 059 **quebra** `shared/admin-students.js` do novo branch (passa a ler as chaves `contentsTotal`, `cardsTotal`, `archivedNotes` etc., que a 058 não devolve). Reverter o cliente junto ou antes.
- Independente das outras (pode ser revertida a qualquer momento, mas como é a última aplicada, é a primeira a reverter).

```sql
-- NÃO EXECUTAR — referência
-- recriar a partir de 058_fix_teacher_metrics_card_selection.sql linhas 21–121
```

## 2. Migration 060 — identidade (username gerado) + Tag de atribuição

- **Objetos (060):**
  - funções novas: `generate_public_username()` (:25), `profiles_assign_username()` (:50), `profiles_protect_identity()` (:71), `ensure_my_profile()` (:96; revoke public/anon :140, grant authenticated :141), `is_attribution_tag(text)` (:146), `attribution_tag_for_username(text)` (:157), `note_tags_guard()` (:178), `copy_public_flashcard(bigint,text,jsonb,bigint)` (:324; grants :423–424), `profiles_protect_delete()` (:433; revoke :441).
  - triggers novos: `profiles_assign_username_trigger` (BEFORE INSERT, :62), `profiles_protect_identity_trigger` (BEFORE UPDATE, :88), `own_flashcards_note_tags_guard` e `teacher_flashcards_note_tags_guard` (BEFORE INSERT/UPDATE OF tags, :207, :212), `profiles_protect_delete_trigger` (BEFORE DELETE, :443).
  - **replace** (existiam na 057): `rename_note_tag(text,text,text)` (:218) e `delete_note_tag(text,text)` (:275), grants reafirmados :308–311.
  - Sem colunas, constraints, índices, policies, `update`/`insert`/backfill (grep confirma).
- **Rollback no arquivo:** bloco "ROLLBACK (manual)" em 060:447–457. **Quase completo**: dropa os 4 triggers de tabela, `profiles_protect_delete`, `copy_public_flashcard`, `ensure_my_profile`, e as funções auxiliares; manda "reaplicar rename/delete de 057". Falta mencionar `ensure_my_profile` revoke/grants (somem junto com o drop) — nada a mais a fazer.
- **Rollback real:**
  1. Dropar triggers e funções do bloco 060:447–457.
  2. **Recriar `rename_note_tag` e `delete_note_tag` a partir de `057_note_tag_management_rpcs.sql`: `rename_note_tag` linhas 58–110, `delete_note_tag` linhas 112–140** (grants 144–148 já existem; `create or replace` os preserva, mas reafirmar se quiser).
  3. Observação: `note_tag_is_canonical` e `list_note_tags` (057) não são tocadas pela 060.
- **Dados:** 060 não altera linha nenhuma. Mas **efeitos persistem**: usernames gerados para profiles criados depois (ver seção 7). Ao reverter, o trigger de imutabilidade some → username volta a ser editável e o cliente antigo volta a criar profile com sufixo numérico.
- **Dependência:** `copy_public_flashcard` é redefinida pela 061 → reverter 061 **antes** de 060. `note_attribution_tag` (061) é independente de `is_attribution_tag` (060) em tempo de criação (plpgsql), mas o código novo usa ambas.
- **Impacto cliente:** `shared/profile.js` / `shared/public-profile.js` chamam `ensure_my_profile` e `copy_public_flashcard` → quebram se a 060 for revertida com o cliente novo no ar.

## 3. Migration 061 — Public Decks (colunas, guardas, RPCs, helpers)

- **Objetos (061):**
  - `decks`: colunas `public_id uuid`, `public_description`, `public_icon`, `public_color`, `published_at`, `content_updated_at timestamptz not null default now()` (:24–29); índices `decks_public_id_key` (único parcial, :31) e `decks_owner_public_idx` (:32); constraints `decks_public_only_personal`, `decks_public_requires_id`, `decks_public_description_len`, `decks_public_icon_list`, `decks_public_color_list` (:37–~64).
  - funções: `decks_public_guard()` (:67) + trigger `decks_public_guard_trigger` (BEFORE INSERT/UPDATE, :119–121), `decks_touch_parent()` (:125) + trigger `decks_touch_parent_trigger` (:144–146), `own_flashcards_touch_updated_at()` (:159) + trigger (:175–177), `own_flashcards_touch_deck()` (:180) + trigger (:203–205), `note_attribution_tag(text[],uuid,uuid)` (:211), `note_copy_tags(text[],text)` (:235), `public_note_native(public.own_flashcards)` (:261; revoke :396), `public_deck_copy_max_notes()` (:411), `public_deck_copy_max_media()` (:415), `flashcard_media_path(text)` (:422), `native_fields_media_urls(jsonb)` (:430), `_remap_media_obj(jsonb,jsonb)` (:444), `native_fields_remap_media(jsonb,jsonb)` (:461), `_validate_media_map(jsonb,uuid)` (:477), `public_deck_subtree_ids(bigint,uuid)` (:504), `publish_deck(bigint,text,text,text)` (:518), `unpublish_deck(bigint)` (:578), `get_public_deck(uuid)` (:609), `get_public_deck_notes(uuid)` (:678), `list_public_decks_for_user(text,text)` (:726), `get_public_deck_owner_status(bigint)` (:758), `get_public_deck_media_manifest(uuid)` (:819–856), `copy_public_deck(uuid,bigint,jsonb)` (:861–1000; antes `drop function if exists copy_public_deck(uuid,bigint)` :860); grants nas linhas 601–604, 791–798, 857–858, 1001–1002.
  - `own_flashcards.updated_at timestamptz not null default now()` (:152–155, com backfill).
  - **replace** de objetos existentes: `get_public_flashcards(text,text)` (:1008–1045, **remove a chave `note`** do JSON) e `copy_public_flashcard(bigint,text,jsonb,bigint)` (:1048–1130, redefine a da 060).
  - **dado:** `update public.decks set is_public = false where is_public and kind <> 'personal'` (:35); `update public.own_flashcards set updated_at = created_at where updated_at is null` (:153).
- **Rollback no arquivo:** 061:1135–1152, **INCOMPLETO**. Dropa as RPCs, `public_note_native`, `note_copy_tags`, `note_attribution_tag`, 4 triggers, e tem `alter table … drop constraint decks_public_only_personal, ... ;` (reticências, não lista as 5). **Não cobre:** `decks_touch_parent()`, `own_flashcards_touch_updated_at()`, `own_flashcards_touch_deck()`, `decks_public_guard()` (as *funções*), os helpers de mídia (`flashcard_media_path`, `native_fields_media_urls`, `_remap_media_obj`, `native_fields_remap_media`, `_validate_media_map`, `public_deck_copy_max_*`, `public_deck_subtree_ids`), os 2 índices, e **não restaura** `get_public_flashcards` nem `copy_public_flashcard`. Diz que colunas/`updated_at` "podem ficar".
- **Rollback real (depois de reverter 062–069):**
  1. `drop function` das 11 RPCs/auxiliares listadas acima com assinatura exata (todas as de leitura/escrita pública e os helpers de mídia).
  2. `drop trigger` ×4 (guard, touch_parent, touch_updated_at, touch_deck) e `drop function` das 4 funções de trigger.
  3. `drop constraint` das 5 constraints `decks_public_*`; `drop index decks_public_id_key, decks_owner_public_idx`.
  4. Colunas `decks.public_*`/`published_at`/`content_updated_at` e `own_flashcards.updated_at`: **podem permanecer** (inofensivas; `updated_at` com `not null default now()` não atrapalha o cliente antigo). Se for dropar, é destrutivo para o histórico de timestamps.
  5. **Restaurar `get_public_flashcards`:** recriar de `056_tags_limits_and_public_tags.sql` **linhas 32–71** (inclui a chave `note`; é a versão ativa em produção hoje: `id, front, frontPinyin, backTrans, note, frontIsTargetLanguage, tags`).
  6. **Restaurar `copy_public_flashcard`:** recriar de `060_…sql` **linhas 324–421** (grants 423–424) — *só se a 060 permanecer*; se 060 também for revertida, a função simplesmente fica dropada (na produção atual ela não existe).
- **Dados:** `update decks set is_public=false …` **não é reversível**, mas só importa se existiam Decks `is_public=true` com `kind<>'personal'`; verificar em produção antes (provavelmente 0 linhas). Backfill de `updated_at`: irreversível sem apagar a coluna; irrelevante.
- **Impacto cliente:** `shared/public-deck.js`, `shared/public-profile.js`, `shared/own-flashcards.js` quebram sem as RPCs. A UI do novo branch fica sem Public Deck. `get_public_flashcards` restaurada devolve `note` de novo (a versão nova o escondia; ver seção 7).

## 4. Migration 062 — duplicatas / reimportação de Public Deck

- **Objetos (062):** todas **novas, exceto onde indicado**: `_note_norm(text)` (:20), `_note_field_component(jsonb,jsonb)` (:29), `_note_dup_parts(jsonb,text)` (:40), `note_content_signature(public.own_flashcards)` (:98), `note_variant_key(public.own_flashcards)` (:108), `_note_instance_count(jsonb)` (:122), `_public_deck_plan(uuid,bigint[],text)` (:147–187), `_public_deck_plan_json(uuid,bigint[],text)` (:191), `_public_deck_resolve_selection(text[],text[],jsonb,boolean)` (:201–238), `_unique_deck_name(bigint,uuid,text)` (:242), `check_public_deck_duplicates(uuid,bigint)` (:263–348; grants :349–350), e **replaces com troca de assinatura**: `drop function if exists get_public_deck_media_manifest(uuid)` (:355) + nova `get_public_deck_media_manifest(uuid,jsonb)` (:356–399; grants :400–401); `drop function if exists copy_public_deck(uuid,bigint,jsonb)` (:406) + nova `copy_public_deck(uuid,bigint,jsonb,jsonb)` (:407–583; grants :584–585). Sem tabelas, colunas, índices, policies ou dados ("SÓ FUNÇÕES", cabeçalho).
- **Rollback no arquivo:** **nenhum.** Só há texto "NÃO aplicar em produção sem aprovação".
- **Rollback real (só depois de reverter 069/068/067):**
  1. `drop function public.copy_public_deck(uuid,bigint,jsonb,jsonb);`
  2. `drop function public.get_public_deck_media_manifest(uuid,jsonb);`
  3. `drop function public.check_public_deck_duplicates(uuid,bigint);` e as funções auxiliares (`_unique_deck_name`, `_public_deck_resolve_selection`, `_public_deck_plan_json`, `_public_deck_plan`, `_note_instance_count`, `note_variant_key`, `note_content_signature`, `_note_dup_parts`, `_note_field_component`, `_note_norm`) — nessa ordem de dependência.
  4. **Recriar a versão 3-arg de `copy_public_deck`:** `061_public_decks.sql` linhas **861–1000** (+ grants 1001–1002).
  5. **Recriar o manifest 1-arg:** `061_public_decks.sql` linhas **819–856** (+ grants 857–858).
  6. `_validate_media_map` ficará na versão que estiver ativa (061 se 068 também foi revertida).
- **Dados:** nenhum alterado pela 062.
- **Impacto cliente:** o cliente novo chama `check_public_deck_duplicates`, passa `p_selection` e a versão de 4 args; com 3 args o RPC não encontra a assinatura → cópia de Public Deck falha.

## 5. Migrations 063, 066, 064, 065 (segurança/paridade)

### 063 — `profiles_protect_plan_role`
- **Objetos:** função `profiles_protect_plan_role()` (:5–14), `revoke execute … from public, anon, authenticated` (:15), trigger `trg_profiles_protect_plan_role` BEFORE UPDATE em `profiles` (:16–18). Nada de dados/policies.
- **Rollback no arquivo:** 063:19 (uma linha). **Completo.**
- Reverter reabre a auto-promoção `plan_tier='premium'`/`role='admin'` via `profiles_owner_update`. Só reverter se o trigger estiver quebrando algo — é proteção de segurança.
```sql
-- NÃO EXECUTAR — referência
-- drop trigger trg_profiles_protect_plan_role on public.profiles; drop function public.profiles_protect_plan_role();
```

### 066 — `profiles_protect_plan_role_insert`
- **Objetos:** função `profiles_protect_plan_role_insert()` (:12–21), revoke (:22), trigger `trg_profiles_protect_plan_role_insert` BEFORE INSERT (:23–25).
- **Rollback no arquivo:** 066:26–27. **Completo.** Reabre INSERT com role/plan_tier elevados.
- Atenção: se a 060 já foi aplicada, `ensure_my_profile()` é SECURITY DEFINER e não é afetada; o INSERT direto do cliente antigo (role/plan default) também não.
```sql
-- NÃO EXECUTAR — referência
-- drop trigger trg_profiles_protect_plan_role_insert on public.profiles; drop function public.profiles_protect_plan_role_insert();
```

### 064 — versionar `progress`
- **Objetos:** `create table if not exists public.progress`, `add column if not exists data/updated_at`, `enable row level security`, 3 policies condicionais, função `set_updated_at()` condicional, trigger `progress_set_updated_at` condicional (:22–~68). **Em produção tudo já existe → no-op estrito**: nada é criado.
- **Rollback no arquivo:** 064:70–71 (`drop table public.progress; drop function public.set_updated_at();`) — **NUNCA executar na produção** (apagaria o progresso de todas as alunas e a função usada por outros triggers). Como a migration não cria nada na produção, **não há nada a reverter**.

### 065 — paridade de GRANTs
- **Objetos:** `grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role` (:24); `alter default privileges for role postgres in schema public grant … on tables to …` (:28–29). Na produção, no-op (privilégios já existem).
- **Rollback no arquivo:** 065:31–32 (`revoke select, insert, update, delete on all tables … from anon, authenticated, service_role`) — **NUNCA executar em produção**: derrubaria todo acesso do app (RLS não adianta sem GRANT). Como é no-op, **não há nada a reverter**; se a aplicação gerar algum GRANT novo em tabela criada depois, não vale reverter globalmente.

## 6. Migrations 067, 068, 069 (otimização/cópia)

### 067 — plano e cópia lineares
- **Objetos (replace, mesmas assinaturas da 062):** `_public_deck_plan(uuid,bigint[],text)` (067:25–84) e `copy_public_deck(uuid,bigint,jsonb,jsonb)` (067:87–276); revoke/grants 85, 278–279. Sem schema/dados.
- **Rollback no arquivo:** 067:23 ("reaplicar os blocos de `_public_deck_plan` e `copy_public_deck` da 062") — **completo** como instrução.
- **Rollback real:** `_public_deck_plan` = `062_…sql` **147–187** (+ revoke 188); `copy_public_deck` = `062_…sql` **407–583** (+ grants 584–585). Comportamento idêntico; só custo/tempo piora (D1: 2000 Notes ~10,8 s no Staging, cancelado a 8 s).
- Depende de ter revertido 068/069 antes (068 substitui `copy_public_deck`; ver abaixo).

### 068 — mídia da cópia linear
- **Objetos (replace, mesmas assinaturas):** `_validate_media_map(jsonb,uuid)` (068:42–68), `get_public_deck_media_manifest(uuid,jsonb)` (:74–128; grants :129–130), `copy_public_deck(uuid,bigint,jsonb,jsonb)` (:135–374; grants :375–376). Sem schema/dados.
- **Rollback no arquivo:** 068:36–37 (frase: reaplicar `_validate_media_map` da 061, manifest da 062, `copy_public_deck` da 067). **Completo como roteiro**, sem SQL.
- **Rollback real:** `_validate_media_map` = `061_…sql` **477–497**; manifest = `062_…sql` **356–399** (+ grants 400–401); `copy_public_deck` = `067_…sql` **87–276** (+ grants 278–279).
- **Nota:** reverter 068 reintroduz D2 — cópia de 2000 Notes **com áudio** cancelada pelo `statement_timeout` de 8 s (57014). Deixar o cliente com o limite de Notes/mídia reduzido ou desabilitar a cópia até re-aplicar.

### 069 — `duplicates_changed` com SQLSTATE `PT409`
- **Objeto (replace):** `_public_deck_resolve_selection(text[],text[],jsonb,boolean)` (069:23–60; revoke :61). Sem schema/dados.
- **Rollback no arquivo:** **nenhum bloco** (069:17 só comenta "rollback" no sentido do loop que o 40001 causava).
- **Rollback real:** recriar `062_…sql` **linhas 201–238** (+ revoke 239). Atenção: a 062 usa `errcode = '40001'` nas duas ocorrências de `duplicates_changed` → **o PostgREST repete a transação sem fim** (≈16.000 execuções observadas no Staging; HTTP 504). Só reverter a 069 sabendo disso; é uma regressão operacional séria, não só funcional.

## 7. Rollback do grupo inteiro 060–069 (voltar ao estado 058) — NÃO EXECUTADO

Ordem inversa. Marcar cada passo apenas depois de checar o anterior.

1. **059 → 058:** recriar `get_teacher_student_metrics(uuid,text)` de `058_…sql` **21–119**; reafirmar `revoke all … from public` e `grant execute … to authenticated` (058:120–121). (Fazer primeiro: não depende de nada.)
2. **069 → 068:** recriar `_public_deck_resolve_selection` de `062_…sql` **201–238** (volta a 40001; ver riscos).
3. **068 → 067:** recriar `_validate_media_map` de `061_…sql` **477–497**; manifest `get_public_deck_media_manifest(uuid,jsonb)` de `062_…sql` **356–399**; `copy_public_deck` de `067_…sql` **87–276**.
4. **067 → 062:** recriar `_public_deck_plan` de `062_…sql` **147–187** e `copy_public_deck` de `062_…sql` **407–583**.
5. **062 → 061:**
   - `drop function public.copy_public_deck(uuid,bigint,jsonb,jsonb);`
   - `drop function public.get_public_deck_media_manifest(uuid,jsonb);`
   - `drop function public.check_public_deck_duplicates(uuid,bigint);`
   - drop das auxiliares da 062 (`_unique_deck_name`, `_public_deck_resolve_selection`, `_public_deck_plan_json`, `_public_deck_plan`, `_note_instance_count`, `note_variant_key`, `note_content_signature`, `_note_dup_parts`, `_note_field_component`, `_note_norm`).
   - recriar `copy_public_deck(uuid,bigint,jsonb)` de `061_…sql` **861–1000** e o manifest `get_public_deck_media_manifest(uuid)` de `061_…sql` **819–856**, com grants (061:857–858, 1001–1002).
6. **061 → 060/058** (além do bloco incompleto 061:1135–1152, completar com itens abaixo):
   - drop das RPCs e helpers da 061 (com assinatura exata, ver seção 3) incluindo `copy_public_deck(uuid,bigint,jsonb)`, manifest 1-arg, `_validate_media_map`, `native_fields_remap_media`, `_remap_media_obj`, `native_fields_media_urls`, `flashcard_media_path`, `public_deck_copy_max_notes/media`, `public_deck_subtree_ids`, `publish_deck`, `unpublish_deck`, `get_public_deck`, `get_public_deck_notes`, `list_public_decks_for_user`, `get_public_deck_owner_status`, `public_note_native`, `note_copy_tags`, `note_attribution_tag`;
   - drop dos 4 triggers e das 4 funções de trigger (`decks_public_guard`, `decks_touch_parent`, `own_flashcards_touch_updated_at`, `own_flashcards_touch_deck`);
   - drop das 5 constraints `decks_public_*` e dos 2 índices;
   - **restaurar `get_public_flashcards`** de `056_…sql` **32–71**;
   - `copy_public_flashcard`: voltar à versão da 060 (`060_…sql` **324–421**) ou ser dropada no passo seguinte;
   - colunas `decks.public_*`/`published_at`/`content_updated_at` e `own_flashcards.updated_at`: manter (recomendado) ou dropar (destrutivo).
7. **060 → 058:** executar o bloco `060:447–457` (drop dos triggers `profiles_assign_username_trigger`, `profiles_protect_identity_trigger`, `profiles_protect_delete_trigger`, `own_flashcards_note_tags_guard`, `teacher_flashcards_note_tags_guard`; drop de `profiles_protect_delete`, `copy_public_flashcard(bigint,text,jsonb,bigint)`, `ensure_my_profile`, `note_tags_guard`, `profiles_assign_username`, `profiles_protect_identity`, `generate_public_username`, `attribution_tag_for_username`, `is_attribution_tag`) **e reaplicar `rename_note_tag` (057:58–110) e `delete_note_tag` (057:112–140)**. Isso restaura as funções da 057, que é o estado de produção hoje.
8. **066, 063:** só se necessário (reabrem auto-promoção). Ordem: 066 (`drop trigger trg_profiles_protect_plan_role_insert …; drop function …`), depois 063. **Recomendação: não reverter.**
9. **064, 065:** nada a fazer em produção (eram no-op). **Nunca** executar os rollbacks dos arquivos.

```sql
-- NÃO EXECUTAR — referência (esqueleto; completar com assinaturas/linhas acima)
-- begin;
--   -- 1..7 conforme lista; verificar com \df public.* e information_schema após cada bloco
-- commit;  -- ou rollback; testar primeiro no Staging
```

## 8. O que NÃO é desfeito (dados criados depois do rollout)

Dropar funções/colunas/triggers **não apaga** o que já foi gravado:

- **Decks publicados:** linhas em `decks` com `is_public=true`, `public_id`, `published_at`, `public_description/icon/color`. Se as colunas forem dropadas, perdem-se esses dados; se mantidas, ficam órfãs mas inofensivas. As constraints `decks_public_*` precisam sair antes de limpar. Para "despublicar" sem dropar coluna: `update decks set is_public=false` (hoje só feito por `unpublish_deck`/SQL de manutenção, pois o trigger `decks_public_guard` bloqueia papéis de API; ao dropar o trigger isso muda).
- **Notes copiadas de Public Deck:** novas linhas em `own_flashcards` (e árvores de `decks` criadas em Meus Decks) continuam existindo, com Tags `criado-por-<username>` e mídia duplicada no Storage do copiador. Nenhum rollback as remove.
- **Usernames gerados:** profiles criados após a 060 têm `username` gerado (imutável enquanto o trigger existia). Dropar o trigger não regenera nem reverte esses valores; a imutabilidade some.
- **Tags de atribuição `criado-por-*`:** permanecem em `tags` das Notes copiadas; sem `note_tags_guard`, passam a poder ser editadas/removidas/forjadas por qualquer dono.
- **`own_flashcards.updated_at`:** coluna e valores permanecem (backfill de 061 não reversível sem dropar).
- **Linhas atualizadas por 061:** `update decks … is_public=false where kind<>'personal'` — irreversível; tende a não ter afetado ninguém (verificar).
- **Mídia no Storage** (`flashcard-media`): objetos criados por cópia ficam; nenhuma função de rollback os apaga.
- **`get_public_flashcards` sem `note`:** enquanto a 061 esteve ativa, clientes recebiam a lista sem `note`; ao restaurar a 056 voltam a receber (comportamento de produção atual).
- **Reports, FSRS, `progress`:** não tocados por nenhuma das 059–069.

## 9. Surpresas / pontos de atenção

- **062 e 069 não têm bloco de rollback**; reverter 069 devolve o bug do retry infinito (`40001`).
- **O rollback da 061 no próprio arquivo é incompleto** (não lista helpers de mídia, 4 funções de trigger, índices, nem restaura `get_public_flashcards`/`copy_public_flashcard`; a linha de constraints termina em `...`).
- **`get_public_flashcards` da 061 remove a chave `note`** — a definição anterior vive em `056`, linhas 32–71 (não em 038/043, que são mais antigas e sem `tags`).
- **064 e 065 não têm rollback utilizável** (e o dos arquivos é perigoso em produção); são no-op lá.
- `copy_public_flashcard` é criada pela 060 e substituída pela 061; reverter só a 061 devolve a versão da 060, não "nada".
- Ordem de reversão de `copy_public_deck`/manifest envolve 4 versões (061 → 062 → 067 → 068); o ponto de partida de cada passo está em arquivos diferentes (tabela nas seções 4 e 6).
