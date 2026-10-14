#!/bin/bash
# Etapa 4 (087, mural) -- Postgres LOCAL (nunca produção): banco com 001..085 + 087 (duas vezes: idempotente) e o
# teste da 087. Cluster em /tmp/pg:54329 (ver tests/perfil-privado/run.sh).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" mural87 >/dev/null 2>&1
$P mural87 -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P mural87 -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|8[0-5]|87)_'); do
  $P mural87 -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P mural87 -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
$P mural87 -f "$MIG/087_mural.sql" >/dev/null
echo "migrations aplicadas (até 087, 087 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser mural87 -q -At -f "$HERE/test_087.sql" 2>&1 | grep -v '^\s*$'
