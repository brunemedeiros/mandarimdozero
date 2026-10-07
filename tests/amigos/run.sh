#!/bin/bash
# Postgres LOCAL (nunca produção): reconstrói o banco com 001..071 e aplica a 073 e 074.
# Uso: bash tests/amigos/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" amigos >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-4])_'); do
  $P amigos -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P amigos -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
echo "migrations aplicadas (até 074)"
psql -h /tmp/pg -p 54329 -U pguser amigos -q -At -f "$HERE/test_friends.sql" 2>&1 | grep -v '^\s*$'
psql -h /tmp/pg -p 54329 -U pguser amigos -q -At -f "$HERE/test_friends_074.sql" 2>&1 | grep -v '^\s*$'
