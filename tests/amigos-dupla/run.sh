#!/bin/bash
# Postgres LOCAL (nunca produção): banco até 080 + 086 + 102 (amigos em dupla).
# Uso: bash tests/amigos-dupla/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" dupla >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P dupla -f "$MIG/$f" >/dev/null 2>&1 || echo "aviso: $f não aplicou (ignorado)"
done
for f in 086_friends_streak_milestones_and_congrats.sql 102_friends_duo.sql; do
  $P dupla -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P dupla -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
# idempotência: aplicar a 102 de novo não pode falhar
$P dupla -f "$MIG/102_friends_duo.sql" >/dev/null 2>&1 || { echo "FALHA: 102 não é idempotente"; exit 1; }
echo "migrations aplicadas (até 080 + 086 + 102, duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser dupla -q -At -f "$HERE/test_duo_102.sql" 2>&1 | grep -v '^\s*$'
