#!/bin/bash
# E6 mínima do português no servidor (migration 105). Postgres LOCAL (nunca Staging/produção), cluster em /tmp/pg:54329.
# Banco até 080 + 086 + 102 + 104; o test_105.sql aplica a 105 DENTRO de uma transação (duas vezes) e termina em ROLLBACK.
# Depois roda o teste Node do cron/cliente. Uso: bash tests/pt-servidor/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"; DB=ptserv105
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" $DB >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P $DB -f "$MIG/$f" >/dev/null 2>&1 || echo "aviso: $f não aplicou (ignorado)"
done
for f in 086_friends_streak_milestones_and_congrats.sql 102_friends_duo.sql 104_server_notifications_en.sql; do
  $P $DB -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P $DB -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 080 + 086 + 102 + 104); a 105 entra dentro do teste"
psql -h /tmp/pg -p 54329 -U pguser $DB -q -At -v ON_ERROR_STOP=1 -v mig="$MIG/105_pt_server_minimum.sql" \
  -v cases="$(cat "$HERE/progress_block_cases.json")" -f "$HERE/test_105.sql" 2>&1 | grep -E '^(ok|FALHA|total)|ERROR'
# a 105 não pode ter ficado no banco (ROLLBACK)
left=$($P $DB -At -c "select count(*) from pg_proc where proname in ('_progress_block', '_studied_languages')")
[ "$left" = "0" ] && echo "ok|ROLLBACK: nada da 105 ficou no banco" || echo "FALHA|ROLLBACK: sobrou $left função da 105"
node "$HERE/test_cron_pt.js" 2>&1 | grep -v ExperimentalWarning | grep -v trace-warnings
