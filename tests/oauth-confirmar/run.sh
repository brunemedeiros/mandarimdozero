#!/bin/bash
# 156: confirmação da ligação do Google Agenda / Notion pela sessão logada.
# 1) peças puras e código (Node); 2) migration no Postgres LOCAL (banco aulas94 de tests/aulas-presenca/run.sh, com 117 e 128).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
node "$HERE/test_oauth_confirm.mjs" 2>/dev/null | tail -1
bash "$ROOT/tests/banco-local.sh" >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
if ! $P aulas94 -At -c "select to_regproc('public.notion_save_connection') is not null" 2>/dev/null | grep -q t; then
  bash "$ROOT/tests/aulas-presenca/run.sh" >/dev/null 2>&1
fi
$P aulas94 -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if; end \$\$" >/dev/null
$P aulas94 -f "$MIG/156_oauth_confirm_same_session.sql" >/dev/null
$P aulas94 -f "$MIG/156_oauth_confirm_same_session.sql" >/dev/null
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_156.sql" 2>&1 | grep -v '^\s*$'
