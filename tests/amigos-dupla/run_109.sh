#!/bin/bash
# Postgres LOCAL (nunca produção): até 080 + 086 + 102 + 109 (missão em dupla automática de 4 dias).
# Uso: bash tests/amigos-dupla/run_109.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" dupla109 >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P dupla109 -f "$MIG/$f" >/dev/null 2>&1 || echo "aviso: $f não aplicou (ignorado)"
done
for f in 086_friends_streak_milestones_and_congrats.sql 102_friends_duo.sql 109_duo_weekly_auto.sql 109_duo_weekly_auto.sql; do
  $P dupla109 -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P dupla109 -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 080 + 086 + 102 + 109, a 109 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser dupla109 -q -At -f "$HERE/test_duo_109.sql" 2>&1 | grep -v '^\s*$'
