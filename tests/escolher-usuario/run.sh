#!/bin/bash
# Postgres LOCAL (nunca produção): até 080 + 110 + 111 (escolher o @ uma vez) + 113 (conferir o @ no cadastro).
# Uso: bash tests/escolher-usuario/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" usuario111 >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P usuario111 -f "$MIG/$f" >/dev/null 2>&1 || echo "aviso: $f não aplicou (ignorado)"
done
for f in 110_get_my_profile_creates_missing.sql 111_choose_username_once.sql 111_choose_username_once.sql 113_check_username_signup.sql 113_check_username_signup.sql; do
  $P usuario111 -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P usuario111 -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 080 + 110 + 111 + 113, a 111 e a 113 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser usuario111 -q -At -f "$HERE/test_111.sql" 2>&1 | grep -v '^\s*$'
psql -h /tmp/pg -p 54329 -U pguser usuario111 -q -At -f "$HERE/test_113.sql" 2>&1 | grep -v '^\s*$'
