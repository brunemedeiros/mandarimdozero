#!/bin/bash
# Postgres LOCAL (nunca produção): avisos gravados pelo banco no idioma de quem recebe (102 Amigos, 104 Mural/professora).
# Uso: bash tests/avisos-idioma/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" avisos >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P avisos -f "$MIG/$f" >/dev/null 2>&1 || echo "aviso: $f não aplicou (ignorado)"
done
for f in 086_friends_streak_milestones_and_congrats.sql 102_friends_duo.sql 104_server_notifications_en.sql 104_server_notifications_en.sql; do
  $P avisos -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P avisos -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 080 + 086 + 102 + 104, a 104 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser avisos -q -At -f "$HERE/test_avisos_104.sql" 2>&1 | grep -v '^\s*$'
