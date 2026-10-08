# Histórico: Public Deck, fluxo de migrations, rollout 059-069

> Arquivado do CLAUDE.md raiz em 2026-10-07, texto original sem alteração. Não é carregado automaticamente: leia só quando o assunto aparecer.

## Public Deck (2026-10-01, local — migrations 059/060/061 NÃO aplicadas)

Implementado sobre o contrato aprovado (`docs/public-decks-contrato-tecnico.md`, seção "v6 — Implementação"): Deck pessoal publicável por RPC,
`public_id` opaco (`#/deck/<uuid>`), metadado público para anônimo/Free, conteúdo e cópia só Premium/dono, `public_profile=false` esconde sem despublicar,
`personal_root`/Course/Teacher nunca públicos (CHECK + trigger), `note` nunca público, atribuição `criado-por-[username]` pela regra única `note_attribution_tag`.
Sem renderer novo (Preview com os 4 renderers). Lista solta de cartões públicos aposentada por flag (`PUBLIC_FLAT_FLASHCARDS_ENABLED=false`).
Pendências registradas lá: duplicatas, proxy de mídia (uid no caminho do Storage), cleanup da lista solta. Testes em `tests/fase-public-deck/`.
Duplicatas V1 (062, local, não aplicada): assinatura nativa no servidor, EXACT não recriada, VARIANT opt-in, cross-family só informativa, Decks sem Note nova omitidos, lock por copiador + duplicates_changed (ver docs/public-decks-duplicatas-contrato.md §R).
P7: cópia de Public Deck duplica a mídia no Storage do copiador (manifest → storage.copy → RPC com `p_media_map`, compensação em falha); limites 2000 Notes/mídias são guardas técnicas configuráveis.

## Fluxo de migrations no Staging via MCP (caminho A, decidido em 2026-10-02)

- Staging = `ilfjzizjfcmhibkhwber` ("Idiomas com Prof. Brune — Staging"). Produção = `eigjocalzwamisgqilhg`.
- 001→066 aplicadas no Staging pelo CLI (`supabase db push`), versões `20250101000001`…`20250101000066`.
- **A partir da migration lógica 067**, o fluxo normal do Staging é `mcp__Supabase__apply_migration` com
  `project_id` literal `ilfjzizjfcmhibkhwber`. Antes de cada escrita: `get_project` (ref e nome "Staging")
  + `list_migrations` (aplicar só o que estiver pendente; nunca reaplicar/alterar o que já existe).
  Depois: confirmar a migration aplicada, se houve erro e o último registro do histórico.
- O MCP grava a versão com o horário da aplicação (ex.: `2026…`), não `20250101000NNN`. **Nunca editar
  `supabase_migrations.schema_migrations` à mão** para "corrigir" isso. Registrar abaixo a correspondência.
  O CLI não foi abandonado definitivamente, mas um `db push` futuro precisa considerar essas versões.
- Cada migration é testada no Postgres local antes; migrations destrutivas ou de risco elevado exigem
  confirmação da autora antes de aplicar.
- Produção: nada é aplicado sem autorização explícita naquela etapa (existir no repositório não autoriza).
  Sem push/PR/deploy como parte da aplicação.

| Migration lógica (arquivo) | Versão registrada no Staging | Data |
|---|---|---|
| 067 (`067_public_deck_copy_linear_plan.sql`, commit `69cad4c`) | `20261003000046` (`public_deck_copy_linear_plan`) | 2026-10-03 |
| 068 (`068_public_deck_copy_media_linear.sql`, commit `c97222e`) | `20261003015924` (`public_deck_copy_media_linear`) | 2026-10-03 |
| 069 (`069_public_deck_duplicates_changed_not_retryable.sql`, commit `fb5c159`) | `20261003124403` (`public_deck_duplicates_changed_not_retryable`) | 2026-10-03 |
| 070 (`070_teacher_student_overview.sql`) | `20261005121926` (`teacher_student_overview`) | 2026-10-05 |
| 071 (`071_public_deck_hardening.sql`) | `20261005202012` (`public_deck_hardening`) | 2026-10-05 |
| 073 (`073_create_profile_private.sql`) | Staging `20261006171157`; produção `20261006201346` (`create_profile_private`, aplicada pela ferramenta com autorização, RLS+4 policies, anon sem acesso) | 2026-10-06 |

## Checkpoint -- etapa de segurança (grants + proteção de plan/role) validada no Staging (2026-10-02)

Registro formal, sem nenhuma migration nova, sem alteração de banco, sem push/PR/deploy.

**Estado confirmado do Staging**: project_ref `ilfjzizjfcmhibkhwber` ("Idiomas com Prof. Brune — Staging");
migrations 001–066 aplicadas, sem buracos; última: `20250101000066_profiles_protect_plan_role_insert`.
Produção `eigjocalzwamisgqilhg` NÃO foi alterada nesta etapa.

**Migration 065** (paridade de GRANTs): aplicada no Staging e validada pelo SQL Editor -- 21 tabelas públicas
× 3 roles (`anon`, `authenticated`, `service_role`) → 252/252 grants DML esperados presentes; nenhum dado alterado.

**Migration 066** (`profiles_protect_plan_role_insert`): aplicada com sucesso no Staging (dry-run mostrou
somente a 066 antes da aplicação). Objetivo: impedir a criação inicial de `profiles` com `role=admin` /
`plan_tier=premium`. Junto com a 063, protege tanto a alteração de um perfil existente quanto a criação inicial.

**Teste real de autenticação** (`tests/fase-grants/staging_auth_test.js`, login real no Staging):
- A1 Free → `plan_tier=premium`: 403 / 42501 / `plan_role_protected` — PASSOU
- A2 Free → `role=admin`: 403 / 42501 / `plan_role_protected` — PASSOU
- B1 Premium → `role=admin`: 403 / 42501 / `plan_role_protected` — PASSOU
- B2 Premium → `plan_tier=free`: 403 / 42501 / `plan_role_protected` — PASSOU
- C conta sem profile → INSERT `role=admin`, `plan_tier=premium`: 403 / 42501 / `plan_role_protected` — PASSOU
- Após C, `profiles` permaneceu vazio para essa conta; nenhuma reversão/neutralização foi necessária;
  nenhuma senha ou token foi exposto; o script não usou produção.

**Fluxo futuro de migrations no Staging**: caminho A (seção "Fluxo de migrations no Staging via MCP" acima),
registrado no commit local `098dd96` -- da migration lógica 067 em diante, MCP direto no Staging, com
confirmação de `project_id`/nome "Staging" antes de escrever, consulta de migrations antes e depois, só
pendentes, nunca editar `supabase_migrations.schema_migrations`, correspondência número lógico ↔ versão MCP
registrada na tabela acima, produção só com autorização explícita, migrations destrutivas/de risco exigem
confirmação da autora, sem push/PR/deploy como parte da aplicação.

## Checkpoint -- migration 067 aplicada no Staging + homologação real de performance (2026-10-03)

- 067 aplicada via MCP no Staging (`ilfjzizjfcmhibkhwber`), versão `20261003000046`. Arquivo idêntico ao de `69cad4c`
  (md5 `589277c1…`). `_public_deck_plan` (STABLE, invoker, só owner) e `copy_public_deck` (SECURITY DEFINER, VOLATILE,
  `search_path=public`, EXECUTE só `authenticated`) confirmados na versão 067. Schema/dados inalterados (hashes iguais).
- Caminho real do app (seleção explícita `[{sig, cls}]` como `publicDeckPlanSelection`), cada RPC sob `statement_timeout=8s`:
  500 → check 0,23 s / cópia 0,98 s; 1000 → 0,39 / 1,97 s; 2000 → 0,81 / 4,57 s (2000 Notes, 2200 CardInstances, sem timeout);
  2001 → `deck_too_large` em 5–13 ms, nada criado. D1 (062: 10,8 s e cancelamento) resolvido para cópia sem mídia.
- **Novo blocker D2**: 2000 Notes com áudio em todas → cópia CANCELADA pelo limite de 8 s (57014, no laço de inserção).
  1000 com áudio: cópia 3,97 s (vs 1,97 s sem áudio). A 2000: `_validate_media_map` 1,32 s, manifest (RPC separado) 1,44 s;
  o remap em SQL puro custa ~2 ms, então o custo extra está nas chamadas de mídia por Note dentro do laço PL/pgSQL.
  Timeout e limite NÃO alterados; não corrigido. Independência da mídia confirmada a 1000 (0 refs à pasta do autor).
- Atomicidade: falha forçada no último item de 2000 (`media_map_incomplete`) → 0 Notes e 0 Decks extras do copiador.
- Limpeza: 0 Decks/Cards/objetos, 3 perfis com hash idêntico, 067 segue aplicada. Produção não tocada. Sem push/PR/deploy.

## D2 -- migration 068 (mídia da cópia de Public Deck com custo linear) -- aplicada no Staging (2026-10-03)

- **Causa**: a regex de `flashcard_media_path` (~32 µs/URL local; a `substring` não ancorada ~21 µs) rodava ~8000×
  numa cópia de 2000 Notes com áudio: `_validate_media_map` (laço, 2 regex + EXISTS por entrada) e, por Note,
  `native_fields_media_urls` + `native_fields_remap_media`→`_remap_media_obj`. Manifest filtrava `sig = any(v_sel)` por Note.
- **068** (`068_public_deck_copy_media_linear.sql`): validação do mapa em uma consulta (`MATERIALIZED`, caminho 1×
  por chave/valor, mesmas 5 regras); cópia resolve a mídia de todas as Notes a criar numa passada antes do laço
  (mesmas regras de remap/contagem); manifest com seleção por chave e caminho 1× por URL. Plano de duplicatas
  (067), `flashcard_media_path`, limites (2000/2000), erros e atomicidade inalterados.
- **Local (antes 067 → depois 068)**: 2000 sem mídia 1,39 → 1,05 s; 2000 com áudio 2,02 → 1,28 s (diferença de
  mídia 0,63 → ~0,2 s). Falhas de mapa agora abortam cedo (0,08–0,44 s), antes de criar qualquer coisa.
- **Testes** (`tests/fase-public-deck/`): run.sh completo verde, `d2/differential.sh` (068 = 062 = 067 em 28
  cenários, + escala 2000/600 por hash), `d2/atomicity_scale.sh` (6/6), `bench_media.sh`, legacy parity 17/17,
  Playwright 152/152. 2000 Notes com áudio+imagem (4000 mídias) é recusado por `deck_media_too_large` (teto de
  mídias já existente, mantido).
- **Próxima alavanca (não feita)**: `own_flashcards_touch_deck` atualiza a mesma linha de `decks` a cada INSERT
  (~29% da cópia local). Só se o Staging com 068 não tiver margem.

**Atualização (2026-10-03): 068 aplicada no Staging (`20261003015924`) e D2 RESOLVIDO.** Definições idênticas às locais (md5), grants/owner/`SECURITY DEFINER`/`search_path` corretos, schema/dados intocados. Homologação real (mesmo script da 067, seleção explícita, cada RPC sob 8 s): cópia de 2000 com áudio 4,61 s / 4,73 s (antes: cancelada); 1000 com áudio 1,92 s; 2000 sem mídia 3,76 s. 2001 → `deck_too_large`, nada criado. Atomicidade: mapa sem a última mídia → `media_map_incomplete`, destino inexistente → `invalid_media_map`, 0 Notes/Decks extras. Independência lógica: 0 URLs na pasta do autor, `storagePath`/`generationKey` removidos. Limpeza: estado igual ao snapshot pré-068. Detalhes: `docs/public-decks-duplicatas-contrato.md` §S.3. Produção não tocada; P8.1/P8.2/P8.5, H/J/K e os 4 achados de baixo risco continuam pendentes.

## Checkpoint -- homologação real P8.1/P8.2/P8.5 do Public Deck no Staging APROVADA (2026-10-03)

- Script `tests/fase-public-deck/staging_storage_test.js` (versão de `fb5c159`, que confere existência pela listagem do Storage e não pelo link público) rodado pela autora contra o Staging `ilfjzizjfcmhibkhwber`, RUN `p82610031328034369`, com 067/068/069 aplicadas.
- Resultado: **P8.1 16/16, P8.5 44/44, P8.2 13/13 (parcial), LIMPEZA 16/16.** P8.2b (2 usuários Premium distintos em paralelo) NÃO executado: exige uma 2ª conta Premium.
- A rodada anterior (RUN `p8261003130827316c`) falhou em 3 checks ("autor apaga o PRÓPRIO original", "autor apaga as origens", objetos removidos na limpeza) por FALSO NEGATIVO de uma cópia antiga do script: os logs do Staging mostram DELETE 200 e GETs públicos servidos do cache da CDN (`HIT` 200) já depois de o objeto ter sido apagado. Não era bug do app/policies (`flashcard_media_owner_delete` existe e funciona).
- Conferido ao vivo depois da rodada aprovada: 0 Notes, 0 Decks pessoais, 0 Decks públicos, 0 objetos em `flashcard-media`. Nenhum resíduo.
- Achado de baixo risco, NÃO corrigido: o conteúdo público do Deck (`get_public_deck_notes`) ainda inclui `storagePath` em `image` (o `public_note_native` só remove de `audio`). A cópia já remove dos dois. O caminho só repete o que a própria URL pública já mostra (a pasta do autor), mas por coerência deveria sair também de `image`.
- Produção não tocada. Pendentes: P8.2b, o achado acima, H/J/K e os 4 achados de baixo risco já registrados.

## Checkpoint final P8 -- auditoria de fechamento do Public Deck (2026-10-03, só leitura)

Checkpoint pedido pela autora: só documentação. Nenhuma migration, nenhuma mudança de banco, nenhum push/PR.

**1. Homologado no Staging (`ilfjzizjfcmhibkhwber`)**
- Segurança: 065 (paridade de GRANTs, 252/252) e 063/066 (`plan_tier`/`role` protegidos; 5/5 tentativas com login real bloqueadas).
- D1 (067): cópia de 2000 Notes em 4,6 s; 2001 é recusado (`deck_too_large`) sem criar nada.
- D2 (068): cópia de 2000 Notes com áudio em 4,6–4,7 s (antes era cancelada no limite de 8 s).
- 069 (`20261003124403`): `duplicates_changed` com SQLSTATE PT409, validada pela rodada real.
- P8.1 16/16, P8.2 13/13 (mesmo copiador em duas sessões = escopo do advisory lock), P8.5 44/44, limpeza 16/16 (RUN `p82610031328034369`). Depois: 0 Notes, 0 Decks, 0 objetos.
- Também passaram em SQL real no Staging: cenários A–M de duplicatas (H/J parciais, K não testado), P8.3, P8.4 e P8.6.

**2. Pendências explícitas (não bloqueiam a produção)**
- **P8.2b** (duas contas Premium DISTINTAS copiando em paralelo): não executado; só rodar se surgir motivo concreto (exige uma 2ª conta Premium).
- **Hardening pós-P8** (futura migration 070, NÃO aberta): tirar `storagePath` de `image` em `get_public_deck_notes`/`public_note_native` (hoje só sai de `audio`; a cópia já remove dos dois), junto com os 4 achados de baixo risco da 062:
  - host não ancorado na regex de caminho de mídia -> corrigir;
  - manifest sem teto -> custo já linear desde a 068 e teto de 2000 mídias já existe; aceitar ou incluir;
  - mensagem de erro sem `cls` -> cosmético;
  - comentário de rollback desatualizado -> documentação.
- **H/J/K**: duplicatas entre Clozes, Type Answer x Type Answer, Teacher/Course na coleção do copiador -- parciais ou sem teste; decidir se testa antes da produção.

**3. Staging x Produção (conferido via `list_migrations` em 2026-10-03)**
- Staging: 001–069 aplicadas.
- Produção (`eigjocalzwamisgqilhg`): última = `fix_teacher_metrics_card_selection` (058, 2026-10-01). **059–069 existem SÓ no Staging** (11 migrations: 059 teacher_metrics_note_level, 060 identity_generated_username_and_attribution_tag, 061 public_decks, 062 public_deck_duplicates, 063 profiles_protect_plan_tier_role, 064 version_progress_table, 065 grant_table_privileges_parity, 066 profiles_protect_plan_role_insert, 067, 068, 069).
- O histórico da produção tem versões e nomes diferentes dos do Staging (ex.: `protect_teacher_decks_delete_definer` separada) -> aplicar uma a uma via MCP, em ordem numérica, nunca `db push` cego, e só com autorização explícita da autora naquela etapa.
- Antes de aplicar, conferir o `statement_timeout` do papel `authenticated` na produção (no Staging é 8 s, e os tempos acima valem para esse limite).

**4. Trabalho paralelo (outras conversas) -- considerar antes de PR/merge/produção**
- Esta branch (`claude/fervent-noether-9f1ya7`) está 63 commits à frente do `main` e 8 atrás. Desde o último merge dela (#277), o `main` recebeu #278–#281 (páginas /contrato, Desafios do Módulo Premium, áudios TTS e Ditados do A1), que tocam `fr/app.js`, `fr/index.html` e o fim deste CLAUDE.md. Há também uma branch paralela ativa, `claude/friendly-hamilton-u4ssl2` (Ditados). Nenhum PR aberto no momento.
- **Risco de ordem, NÃO ignorar**: esta branch tem código de cliente (Public Deck, Tags, Decks, FSRS/Review K1, `shared/*.js`, `fr/zh app.js`/`index.html`) que depende de 059–069. O `main` é publicado automaticamente (GitHub Pages). Mergear esta branch no `main` ANTES de aplicar 059–069 na produção quebraria o app em produção. Ordem: (1) aplicar as migrations na produção com autorização; (2) depois merge/deploy do cliente -- ou manter as features novas desligadas até lá.
- Ao trazer o `main` para esta branch (ou abrir PR), haverá conflito no fim do CLAUDE.md (as duas pontas acrescentaram seções no final): resolver mantendo os dois blocos, nunca descartar. Em `fr/app.js`/`fr/index.html`, resolver preservando o trabalho de Desafios/Ditados das outras conversas.

**5. Próximo bloco (decisão da autora)**: (a) rollout 059–069 na produção, uma por uma, com autorização; (b) decidir sobre H/J/K antes ou junto; (c) depois, hardening 070 e, se houver motivo, P8.2b.

## Rollout readiness 059–069 (2026-10-03, só leitura/testes revertidos) -- BLOCKED

- **Ferramentas MCP do Supabase travam com DROP**: `execute_sql` e `apply_migration`, em produção e no Staging, esperam 60 s e expiram quando o SQL tem um comando `DROP` (inclusive dentro de string executada por `EXECUTE`). Os logs do Postgres provam que a instrução nunca chega ao banco e nada é gravado no histórico. `DROP` só em comentário, `REVOKE`, `DELETE` como palavra e o resto do `apply_migration` funcionam (o `apply_migration` roda dentro de `begin;`, então uma falha não deixa resto). Provável portão de confirmação ("destructive statements may require the user to confirm") que esta sessão remota não exibe. Afeta 060, 061, 062, 063 e 066 (têm `DROP` real) e qualquer rollback. A 064 só cita `DROP` num comentário e roda pela ferramenta; 067–069 não têm `DROP` (por isso entraram no Staging via MCP).
- **Backup**: a organização Supabase está no plano **Free**, que não tem backups diários nem PITR (docs oficiais). Não existe ponto de restauração da produção; a documentação recomenda `supabase db dump` próprio.
- **Rollback**: runbook em `docs/rollout-059-069-rollback.md` (não executado; não versionado ainda). 062 e 069 não têm bloco de rollback; o da 061 é incompleto; reverter 069 reintroduz o retry 40001 (504 no Staging) e reverter 068 reintroduz o timeout D2.
- **Branches**: `main` andou para `7697541` (PR #282, Ditados, + áudios); sem novas chamadas ao banco; merge desta branch continua com conflito só no CLAUDE.md. A árvore do `main` só tem migrations até 055 (056–058 vieram desta branch e já estão aplicadas na produção).
- **H/J/K**: lacunas de teste (lógica já existe em 062/067–069), não bloqueiam tecnicamente as migrations.
- **Decisão de mecanismo (após o checkpoint)**: a autora confirmou que nenhum prompt de confirmação aparece na UI. As migrations com `DROP` real vão pelo **SQL Editor do Supabase**, aplicadas pela autora, colando o arquivo do repositório sem alteração envolto em `begin;` … `commit;`. Mapeamento: **SQL Editor = 060, 061, 062, 063, 066**; **ferramenta (`apply_migration`) = 064, 065, 067, 068, 069, 059**. As aplicadas pelo SQL Editor NÃO ficam em `supabase_migrations.schema_migrations` (nunca inserir à mão); registrar aqui a data de cada uma quando aplicada.
- **Ordem operacional**: 060 → 061 → 062 → 063 → 064 → 065 → 066 → 067 → 068 → 069 → 059 (059 por último encurta a quebra do painel de métricas do `main`). Validada localmente: as 11 rodam isoladas em transação nas duas ordens (planejada e numérica) com esquema final idêntico; a 061 só depois de a 060 passar nas verificações (o corpo plpgsql não valida dependência na criação).
- **Janela de incompatibilidade com o `main` 7697541**: após a 059 o painel 📊 Métricas fica vazio; após a 060 trocar username dá `username_immutable` e contas novas recebem username automático. Durante a janela, não criar contas novas nem testar alteração de username até o deploy do código novo.
- **Backup**: feito via SELECT e conferido por md5, guardado FORA do repositório (dados pessoais).


## Rollout 059–069 em produção -- registro de aplicação

| Ordem | Migration | Como | Data | Verificação |
|---|---|---|---|---|
| 1 | 060 `identity_generated_username_and_attribution_tag` | SQL Editor (autora), arquivo de `4b46602` entre `begin;`/`commit;` | 2026-10-03 | OK (abaixo) |
| 2 | 061 `public_decks` | SQL Editor (autora), copiado de `docs/rollout-sql/061_sql_editor.sql` | 2026-10-03 | OK (abaixo) |
| 3 | 062 `public_deck_duplicates` | SQL Editor (autora), `docs/rollout-sql/062_sql_editor.sql` | 2026-10-03 | OK (abaixo) |
| 4 | 063 `profiles_protect_plan_tier_role` | SQL Editor (autora), `docs/rollout-sql/063_sql_editor.sql` | 2026-10-03 | OK (abaixo) |
| 5 | 064 `version_progress_table` | ferramenta `apply_migration`, autorizada pela autora (versão `20261003201152`) | 2026-10-03 | OK (abaixo) |
| 6 | 065 `grant_table_privileges_parity` | ferramenta `apply_migration`, autorizada pela autora (versão `20261003201521`) | 2026-10-03 | OK (abaixo) |
| 7 | 066 `profiles_protect_plan_role_insert` | SQL Editor (autora), `docs/rollout-sql/066_sql_editor.sql` | 2026-10-03 | OK (abaixo) |
| 8 | 067 `public_deck_copy_linear_plan` | ferramenta `apply_migration`, autorizada pela autora (versão `20261003202227`) | 2026-10-03 | OK (abaixo) |
| 9 | 068 `public_deck_copy_media_linear` | ferramenta `apply_migration`, autorizada pela autora (versão `20261004144937`) | 2026-10-04 | OK (abaixo) |
| 10 | 069 `public_deck_duplicates_changed_not_retryable` | ferramenta `apply_migration`, autorizada pela autora (versão `20261004150754`) | 2026-10-04 | OK (abaixo) |
| 11 | 059 `teacher_metrics_note_level` | ferramenta `apply_migration`, autorizada pela autora (versão `20261004151009`) | 2026-10-04 | OK (abaixo) |

- **060** (aplicada pela autora no SQL Editor da produção `eigjocalzwamisgqilhg`; não aparece em `schema_migrations`, que segue terminando em 058 -- não editar à mão). Verificação só leitura feita depois: 9 funções e 5 triggers presentes e ativos; `ensure_my_profile`/`copy_public_flashcard` com EXECUTE só para `authenticated` (anon = false); `rename_note_tag`/`delete_note_tag` recusam `criado-por-*`; funções puras corretas; corpo de todas as funções igual ao Staging ignorando espaços (diferença só de quebra de linha CRLF da colagem, sem efeito), e `copy_public_flashcard` igual à versão do arquivo da 060 (a do Staging já é a da 061). Dados: 26 profiles, nenhum username alterado nem duplicado, 0 tags não canônicas, 0 tags `criado-por-*`. A conferência prévia (passo C) não foi feita antes do Run; a migration não altera linhas, então não houve perda.
- **Janela aberta:** até o deploy do PR #284, trocar username no site dá `username_immutable` e conta nova recebe username `u…` automático. Não criar contas nem testar troca de username nesse período.
- **Próxima:** 061 (SQL Editor). Conferência prévia já feita por leitura na produção (2026-10-03): 72/72 comandos iguais aos do Staging; nenhum objeto da 061 existe; 33 decks (0 públicos, 0 afetados pelo `update is_public=false`); `own_flashcards` 7 linhas sem `updated_at`; Postgres 17.6.
- **061** (2ª tentativa; a 1ª chegou cortada ao editor -- copiar do anexo do chat truncou em ~6 KB -- e foi recusada no parse sem aplicar nada). Desde então os arquivos para colar ficam em `docs/rollout-sql/NNN_sql_editor.sql`, copiados pelo botão "Copy raw file" do GitHub. Verificação só leitura: 7 colunas novas (`content_updated_at`/`updated_at` not null), 2 índices, 5 constraints `decks_public_*`, 4 triggers ativos; as 25 funções iguais ao Staging (corpo sem espaços, `security definer` e EXECUTE para anon/authenticated idênticos), exceto `_validate_media_map`, `copy_public_deck` (3 args) e `get_public_deck_media_manifest` (1 arg), que batem com o arquivo da 061 (no Staging já são as versões 062/068). `get_public_flashcards` não devolve mais `note`. Dados: 33 decks e 7 own_flashcards com hash idêntico ao de antes; `updated_at` = `created_at` nas 7.
- **Próxima:** 062 (SQL Editor, `docs/rollout-sql/062_sql_editor.sql`). Conferência prévia: 31/31 comandos iguais ao Staging; nenhuma função da 062 existe; existem `copy_public_deck(uuid,bigint,jsonb)` e `get_public_deck_media_manifest(uuid)` da 061, que a 062 troca (são os 2 `DROP`); o cliente da `main` não chama nenhuma delas; banco UTF-8. Só funções, sem dados.
- **062** verificada (só leitura): as 12 funções da 062 existem; `copy_public_deck` e `get_public_deck_media_manifest` só com a assinatura nova (4 e 2 args; as da 061 sumiram). Corpos iguais ao Staging, exceto `_public_deck_plan`, `_public_deck_resolve_selection`, `copy_public_deck` e `get_public_deck_media_manifest`, que batem com o arquivo da 062 (no Staging já são as de 067–069). Privilégios iguais ao Staging (helpers sem EXECUTE; RPCs só `authenticated`). Dados: decks 33, own_flashcards 7, teacher_flashcards 5 (hash `cf25493d…`, igual), profiles 26.
- **Próxima:** 063 (SQL Editor, `docs/rollout-sql/063_sql_editor.sql`). Conferência prévia: função `profiles_protect_plan_role` e trigger `trg_profiles_protect_plan_role` não existem; profiles 26 (1 admin, 25 user, todas free; hash `9e955e0d…`). Só cria função+trigger (o `DROP TRIGGER IF EXISTS` não acha nada); a 066 depois troca a função.
- **063** verificada (só leitura): função `profiles_protect_plan_role` (invoker, `search_path=public`, sem EXECUTE para anon/authenticated, corpo igual ao arquivo) e trigger `trg_profiles_protect_plan_role` BEFORE UPDATE ativo. profiles 26, hash `9e955e0d…` igual ao de antes.
- **Próxima:** 064 (ferramenta `apply_migration`, precisa de autorização). Conferência prévia: na produção a tabela `progress` já existe com as 3 colunas iguais, RLS ligada, as 3 policies com os mesmos nomes, `set_updated_at()` e o trigger `progress_set_updated_at` (32 linhas, hash `c0aee75e…`). Ou seja, a 064 não muda nada na produção: todos os comandos são `if not exists`. Só serve para o histórico ficar alinhado.
- **064** aplicada pela ferramenta (registrada em `schema_migrations` como `20261003201152 version_progress_table`; projeto conferido por `get_project` antes). Verificação só leitura: `progress` com as mesmas 3 colunas, RLS ligada, as 3 policies, 1 `set_updated_at()` e o trigger `progress_set_updated_at` ativo; 32 linhas e nenhuma atualizada depois das 16:00 (a migration rodou às 20:11), então nenhum dado mudou. O hash desta conferência usa outra fórmula que o da pré-checagem (`c0aee75e…`); a prova é a ausência de atualização.
- **Próxima:** 065 (ferramenta `apply_migration`, precisa de autorização). Conferência prévia: o arquivo não tem `DROP`; na produção as 22 tabelas de `public` já têm SELECT/INSERT/UPDATE/DELETE para anon/authenticated/service_role (264/264) e o padrão para tabelas novas do `postgres` já concede o mesmo. Ou seja, a 065 também não muda nada na produção; só alinha o histórico.
- **065** aplicada pela ferramenta (`20261003201521 grant_table_privileges_parity`; projeto conferido antes). Verificação só leitura: 22 tabelas, 264/264 permissões presentes, padrão do `postgres` para tabelas novas inalterado (anon/authenticated/service_role = arwdDxtm). profiles 26, hash `9e955e0d…` (mesma fórmula de antes: md5 das linhas inteiras), 25 user/free + 1 admin/free.
- **Próxima:** 066 (SQL Editor, `docs/rollout-sql/066_sql_editor.sql`, tem `DROP TRIGGER IF EXISTS` real). Conferência prévia: função `profiles_protect_plan_role_insert` não existe; triggers de profiles hoje: assign_username, protect_delete, protect_identity, trg_profiles_protect_plan_role (063) e set_updated_at -- nenhum `trg_profiles_protect_plan_role_insert`, então o DROP não acha nada. Só cria função+trigger BEFORE INSERT; não muda dados.
- **066** verificada (só leitura): função `profiles_protect_plan_role_insert` (invoker, `search_path=public`, sem EXECUTE para anon/authenticated, corpo igual ao arquivo) e trigger `trg_profiles_protect_plan_role_insert` BEFORE INSERT ativo. profiles 26, hash `9e955e0d…` igual.
- **Próxima:** 067 (ferramenta `apply_migration`, precisa de autorização; sem `DROP` real). Conferência prévia: na produção já existem `_public_deck_plan(uuid,bigint[],text)` (invoker, STABLE, sem EXECUTE para anon/authenticated) e `copy_public_deck(uuid,bigint,jsonb,jsonb)` (definer, VOLATILE, EXECUTE só authenticated) da 062, com assinatura e tipo de retorno iguais aos da 067 -- o `create or replace` só troca o corpo. 0 Decks públicos, então nenhuma cópia em uso. 068, 069 e 059 também não têm `DROP` real (todas pela ferramenta).
- **067** aplicada pela ferramenta (`20261003202227 public_deck_copy_linear_plan`). Verificação só leitura: corpo (sem espaços) de `_public_deck_plan` = `62a691ce…` e de `copy_public_deck` = `993e586a…`, iguais ao arquivo; atributos inalterados (invoker/STABLE sem EXECUTE; definer/VOLATILE só authenticated). decks 33, own_flashcards 7, teacher_flashcards 5.
- **Próxima:** 068 (ferramenta, precisa de autorização; sem `DROP` real). Conferência prévia: `_validate_media_map(jsonb,uuid)` (definer, STABLE, sem EXECUTE) e `get_public_deck_media_manifest(uuid,jsonb)` (definer, STABLE, só authenticated) já existem com a mesma assinatura, retorno e atributos que a 068 declara; `copy_public_deck` também (acabou de receber a 067). A 068 só troca os 3 corpos. 0 Decks públicos.
- **Regra da autora para este rollout:** ao fim de cada migration verificada, já preparar o arquivo da próxima (conferência prévia + arquivo para colar + consultas de verificação) sem esperar ela pedir. Aplicar continua sendo dela (SQL Editor) ou com autorização explícita (ferramenta).
- **068** aplicada pela ferramenta (`20261004144937 public_deck_copy_media_linear`; projeto e histórico conferidos antes). Verificação só leitura: corpos (sem espaços) iguais ao arquivo -- `_validate_media_map` `70443220…`, `get_public_deck_media_manifest` `6bb3c952…`, `copy_public_deck` `114f0e98…`; atributos e permissões inalterados (definer, `search_path=public`; `_validate_media_map` sem EXECUTE para anon/authenticated; as outras 2 só authenticated). decks 33 (0 públicos), own_flashcards 7, teacher_flashcards 5, profiles 26.
- **Próxima:** 069 (ferramenta, precisa de autorização; nenhuma ocorrência de `DROP` no arquivo). Conferência prévia: `_public_deck_resolve_selection(text[],text[],jsonb,boolean)` já existe (062) com retorno `text[]`, `immutable`, invoker, `search_path=public`, sem EXECUTE para anon/authenticated -- igual ao que a 069 declara; ela só troca o corpo (arquivo `52bcf8a3…`, produção hoje `055aa013…`) para devolver `duplicates_changed` com SQLSTATE PT409 (sem retry automático). 0 Decks públicos.
- **069** aplicada pela ferramenta (`20261004150754 public_deck_duplicates_changed_not_retryable`; projeto e histórico conferidos antes). Verificação só leitura: corpo de `_public_deck_resolve_selection` = `52bcf8a3…`, igual ao arquivo; continua `immutable`, invoker, `search_path=public`, retorno `text[]`, sem EXECUTE para anon/authenticated. decks 33 (0 públicos), own_flashcards 7, teacher_flashcards 5, profiles 26.
- **Próxima e última:** 059 (ferramenta, precisa de autorização; nenhum `DROP` no arquivo). Conferência prévia: `get_teacher_student_metrics(uuid, text)` já existe com o mesmo retorno (`jsonb`), `security definer`, `search_path=public` -- igual ao que a 059 declara. Ela troca o corpo (arquivo `35ba64ff…`, produção hoje `d61508b0…`, a da 058) e tira o EXECUTE de `anon` (hoje anon=true; authenticated continua). Efeito no site atual (`main`): o painel 📊 Métricas da aba 🎓 Alunos passa a mostrar vazio até o código novo ser publicado, porque as chaves da resposta mudam. Não muda dados.
- **059** aplicada pela ferramenta (`20261004151009 teacher_metrics_note_level`; histórico conferido antes). Verificação só leitura: corpo de `get_teacher_student_metrics` = `35ba64ff…`, igual ao arquivo; 1 versão só da função; `security definer`, `search_path=public`, retorno `jsonb`; EXECUTE só para authenticated (anon agora = false). decks 33, own_flashcards 7, teacher_flashcards 5, profiles 26, progress 32.
- **Rollout 059–069 CONCLUÍDO na produção (2026-10-04).** As 11 migrations estão aplicadas: 060/061/062/063/066 pelo SQL Editor (não aparecem em `schema_migrations`) e 064/065/067/068/069/059 pela ferramenta. Nenhum dado mudou.
- **Janela aberta até o deploy do código novo:** o painel 📊 Métricas da aba 🎓 Alunos fica vazio (as chaves mudaram); trocar username dá `username_immutable`; conta nova recebe username `u…`. Próximo passo, quando a autora decidir: trazer o `main` para esta branch (conflito esperado só no fim do CLAUDE.md -- manter os dois blocos; em `fr/app.js`/`fr/index.html` preservar Desafios/Ditados) e só então merge/deploy.


## Migration 075 `account_roles_and_permissions` (2026-10-08)
| Projeto | Como | Versão |
|---|---|---|
| Staging | ferramenta `apply_migration` | `20261008011037` |
| Produção | SQL Editor da autora (`docs/rollout-sql/075_sql_editor.sql`; a ferramenta estourou o tempo 2x) | não aparece em `schema_migrations` |
Detalhes e verificação: `docs/plano-professora-privacidade.md`.
