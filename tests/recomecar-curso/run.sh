#!/bin/bash
# 123 (recomeçar o curso do zero, cópia de 30 dias, desfazer, época) -- Postgres LOCAL (nunca produção).
# Banco com 001..087 + 102 + 104 + 108 (mesma base de tests/sino-professora/run.sh), 123 aplicada duas vezes (idempotente),
# depois test_123.sql em transação com ROLLBACK. Cluster em /tmp/pg:54329 (ver tests/perfil-privado/run.sh).
# Uso: bash tests/recomecar-curso/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
DB=${DB:-recomecar123}
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" "$DB" >/dev/null 2>&1
$P "$DB" -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P "$DB" -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|8[0-7])_'); do
  $P "$DB" -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P "$DB" -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
for f in 102_friends_duo.sql 104_server_notifications_en.sql 108_teacher_bell.sql 123_restart_course.sql 123_restart_course.sql; do
  $P "$DB" -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P "$DB" -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 087 + 102 + 104 + 108, 123 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser "$DB" -q -At -f "$HERE/test_123.sql" 2>&1 | grep -v '^\s*$'
# Zero resíduo depois do ROLLBACK.
psql -h /tmp/pg -p 54329 -U pguser "$DB" -q -At -c "select 'resíduo depois do ROLLBACK: ' || (select count(*) from course_restart_backups) || ' cópias, ' || (select count(*) from progress where data::text like '%restartEpoch%') || ' blocos com época'"
