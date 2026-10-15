#!/bin/bash
# 094 (Presença, Competências, aula de turma) -- Postgres LOCAL (nunca produção): banco com 001..092 + 094 (duas vezes:
# idempotente) e o teste. Cluster em /tmp/pg:54329 (ver tests/perfil-privado/run.sh).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" aulas94 >/dev/null 2>&1
$P aulas94 -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P aulas94 -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^(0(59|6[1-9]|7[0-9]|8[0-5]|87|94)|101)_'); do
  $P aulas94 -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P aulas94 -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
$P aulas94 -f "$MIG/094_class_logs_attendance_skills.sql" >/dev/null
$P aulas94 -f "$MIG/101_class_schedule.sql" >/dev/null
echo "migrations aplicadas (até 094 e 101, as duas duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_094.sql" 2>&1 | grep -v '^\s*$'
psql -h /tmp/pg -p 54329 -U pguser aulas94 -q -At -f "$HERE/test_101.sql" 2>&1 | grep -v '^\s*$'
