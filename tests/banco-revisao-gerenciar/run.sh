#!/bin/bash
# 137 (gerenciar alunos e itens do Banco) -- Postgres LOCAL, mesmo molde de tests/banco-revisao-turmas/run.sh.
# (096 duas vezes: idempotente) e o teste da 096; depois as suítes do Mural (087) e do Banco por cima da 096.
# Cluster em /tmp/pg:54329 (ver tests/perfil-privado/run.sh).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
DB=rbgerenciar136
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" $DB >/dev/null 2>&1
$P $DB -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P $DB -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^(0(59|6[1-9]|7[0-9]|8[0-9]|90|94|95|96)|112|117|128|132|135|137|145)_|^114_review_bank_requests'); do
  $P $DB -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P $DB -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
$P $DB -f "$MIG/096_review_bank_classrooms.sql" >/dev/null
$P $DB -f "$MIG/135_agent_turma_cards_and_absences.sql" >/dev/null
$P $DB -f "$MIG/137_review_bank_manage_students_items.sql" >/dev/null
$P $DB -f "$MIG/145_review_bank_merge_keep_history.sql" >/dev/null
echo "migrations aplicadas (até 137, 137 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser $DB -q -At -f "$HERE/test_137.sql" 2>&1 | grep -v '^\s*$'
psql -h /tmp/pg -p 54329 -U pguser $DB -q -At -f "$HERE/test_145.sql" 2>&1 | grep -v '^\s*$'
