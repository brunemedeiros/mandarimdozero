#!/bin/bash
# 096 (Banco de Revisão ligado a uma Turma) -- Postgres LOCAL (nunca produção): banco com 001..090 + 094 + 095 + 096
# (096 duas vezes: idempotente) e o teste da 096; depois as suítes do Mural (087) e do Banco por cima da 096.
# Cluster em /tmp/pg:54329 (ver tests/perfil-privado/run.sh).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
DB=rbturmas96
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" $DB >/dev/null 2>&1
$P $DB -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P $DB -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|8[0-9]|90|94|95|96)_'); do
  $P $DB -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P $DB -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
$P $DB -f "$MIG/096_review_bank_classrooms.sql" >/dev/null
echo "migrations aplicadas (até 096, 096 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser $DB -q -At -f "$HERE/test_096.sql" 2>&1 | grep -v '^\s*$'
echo "--- Mural (087) com a 096 ---"
psql -h /tmp/pg -p 54329 -U pguser $DB -q -At -f "$ROOT/tests/mural/test_087.sql" 2>&1 | grep -E '^FALHA|RESULTADO'
