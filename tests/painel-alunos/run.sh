#!/bin/bash
# Postgres LOCAL (nunca produção): reconstrói o banco com 001..069 (via
# tests/fase-identity/build_db.sh + 059/061..069), aplica a 070 e roda
# test_rpc.sql (que termina em ROLLBACK). Uso: bash tests/painel-alunos/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" painel >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|70)_'); do
  $P painel -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; exit 1; }
done
echo "migrations aplicadas (até 070)"
psql -h /tmp/pg -p 54329 -U pguser painel -q -At -f "$HERE/test_rpc.sql" 2>&1 | grep -v '^\s*$'
