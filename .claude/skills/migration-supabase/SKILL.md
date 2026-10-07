---
name: migration-supabase
description: Criar, testar e aplicar uma migration SQL do Supabase neste projeto (Staging e produção), incluindo o caso de SQL com DROP que a ferramenta MCP não consegue aplicar. Use ao criar tabela/coluna/função/RLS/trigger, ao aplicar migration pendente ou ao registrar uma migration aplicada.
---

# Migration Supabase

Projetos: Staging `ilfjzizjfcmhibkhwber` ("Idiomas com Prof. Brune — Staging"), produção `eigjocalzwamisgqilhg`.
Histórico de rollouts: `docs/historico/08-public-deck-migrations-rollout-059-069.md`. Rollback: `docs/rollout-059-069-rollback.md`.

## 1. Escrever
- Próximo número livre em `shared/supabase_migrations/NNN_nome.sql` (Desafios: `fr/scripts/supabase_migrations/`).
  Conferir números já usados (há 072 e 073 duplicados; não repetir).
- Aditiva sempre que possível (`if not exists`, `create or replace`). Sem backfill silencioso.
- `security definer` → `set search_path = public`, checagem de autorização dentro, `revoke ... from public, anon`,
  `grant execute ... to authenticated`. `coalesce(auth.jwt()->>'email','')` em comparação de admin.
- RLS em toda tabela nova; policies `{tabela}_{qualificador}_{ação}`.

## 2. Testar localmente
- Postgres local com 001..NNN aplicadas (ver `tests/*/run.sh` como modelo), cenários em transação + `ROLLBACK`.

## 3. Aplicar
- Antes: `get_project` (confirmar nome/ref) + `list_migrations` (aplicar só pendentes).
- **SQL sem `DROP`**: `mcp__Supabase__apply_migration` com `project_id` literal, primeiro no Staging.
- **SQL com `DROP` real** (inclusive dentro de `EXECUTE`): a ferramenta trava 60 s e não aplica. Preparar
  `docs/rollout-sql/NNN_sql_editor.sql` (arquivo original entre `begin;` e `commit;`) para a autora colar no
  SQL Editor ("Copy raw file" no GitHub; colar do chat trunca). Não aparece em `schema_migrations` -- registrar à mão no histórico.
- Produção: só com autorização explícita da autora NAQUELA etapa. Destrutiva/risco alto: confirmar antes.
- Plano Free do Supabase não tem backup/PITR: antes de algo arriscado, salvar snapshot (SELECT + md5) fora do repo.

## 4. Verificar e registrar
- Só leitura depois: objetos existem, `security definer`/`search_path`/grants certos, contagem e hash das tabelas
  tocadas iguais aos de antes (quando a migration não deveria mudar dados).
- Registrar 1 linha: número lógico → versão gravada (o MCP grava o horário, não `20250101000NNN`) e data,
  no histórico do tema em `docs/historico/`; atualizar "Estado atual" do `CLAUDE.md` raiz.
- Na mensagem final: link do arquivo + o que a autora ainda precisa fazer (regra "passos manuais vêm junto").
