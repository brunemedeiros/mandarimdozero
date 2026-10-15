#!/bin/bash
# Postgres LOCAL (nunca produção): banco como tests/conquistas/run.sh + 087 (turmas do Mural) + 095 (sugestões).
# Uso: bash tests/amigos-sugestoes/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" sugestoes >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P sugestoes -f "$MIG/$f" >/dev/null 2>&1 || echo "aviso: $f não aplicou (ignorado)"
done
# 087 inteira depende do Storage do Supabase (storage.foldername): aqui só as tabelas de turma.
sed -n '/^create table if not exists public.classrooms/,/^create index if not exists classroom_members_student_idx/p' "$MIG/087_mural.sql" | $P sugestoes >/dev/null
for f in 086_friends_streak_milestones_and_congrats.sql 095_friend_suggestions.sql; do
  $P sugestoes -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P sugestoes -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 080 + 086 + turmas da 087 + 095)"
psql -h /tmp/pg -p 54329 -U pguser sugestoes -q -At -f "$HERE/test_suggestions_095.sql" 2>&1 | grep -v '^\s*$'
