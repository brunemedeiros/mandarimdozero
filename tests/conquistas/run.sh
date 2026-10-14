#!/bin/bash
# Postgres LOCAL (nunca produção): reconstrói o banco como tests/amigos/run.sh (até 074 + 086) e aplica a 091.
# Uso: bash tests/conquistas/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" conquistas >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-4])_'); do
  $P conquistas -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; exit 1; }
done
$P conquistas -f "$MIG/086_friends_streak_milestones_and_congrats.sql" >/dev/null 2>&1 || { echo "FALHA ao aplicar 086"; exit 1; }
$P conquistas -f "$MIG/091_badge_congrats.sql" >/dev/null 2>&1 || { echo "FALHA ao aplicar 091"; $P conquistas -f "$MIG/091_badge_congrats.sql" 2>&1 | grep -i error | head -3; exit 1; }
$P conquistas -f "$MIG/092_podium_weeks.sql" >/dev/null 2>&1 || { echo "FALHA ao aplicar 092"; $P conquistas -f "$MIG/092_podium_weeks.sql" 2>&1 | grep -i error | head -3; exit 1; }
echo "migrations aplicadas (até 074 + 086 + 091 + 092)"
psql -h /tmp/pg -p 54329 -U pguser conquistas -q -At -f "$HERE/test_badge_congrats_091.sql" 2>&1 | grep -v '^\s*$'
psql -h /tmp/pg -p 54329 -U pguser conquistas -q -At -f "$HERE/test_podium_092.sql" 2>&1 | grep -v '^\s*$'
