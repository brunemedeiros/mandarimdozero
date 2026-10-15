#!/bin/bash
# 105 (sino da professora) -- Postgres LOCAL (nunca produção): banco com 001..087 + 102 + 104, avisos ANTIGOS gravados
# antes da 105 (para provar a migração dos antigos), depois a 105 duas vezes (idempotente) e o teste em transação
# com ROLLBACK. Uso: bash tests/sino-professora/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
DB=${DB:-sino105}
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" "$DB" >/dev/null 2>&1
$P "$DB" -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P "$DB" -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|8[0-7])_'); do
  $P "$DB" -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P "$DB" -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
for f in 102_friends_duo.sql 104_server_notifications_en.sql; do
  $P "$DB" -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; exit 1; }
done
$P "$DB" -f "$HERE/seed_antes_105.sql" >/dev/null
for f in 105_teacher_bell.sql 105_teacher_bell.sql; do
  $P "$DB" -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P "$DB" -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "migrations aplicadas (até 087 + 102 + 104, avisos antigos, 105 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser "$DB" -q -At -f "$HERE/test_105.sql" 2>&1 | grep -v '^\s*$'
