#!/bin/bash
# Etapa 3b (080) -- Postgres LOCAL (nunca produção): banco com 001..079 + 080 (duas vezes: idempotente),
# roda o teste da 080 e as suítes que dependem de perfis (amigos 073/074). Cluster em /tmp/pg:54329.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" perfilpriv >/dev/null 2>&1
# o stub de storage do build_db não tem storage.foldername (a 076 usa na policy de material de apoio)
$P perfilpriv -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null
$P perfilpriv -c "do \$\$ begin if not exists (select 1 from pg_policies where policyname='support_materials_owner_insert') then create policy support_materials_owner_insert on storage.objects for insert to authenticated with check (true); end if; end \$\$" >/dev/null
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|7[0-9]|80)_'); do
  $P perfilpriv -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P perfilpriv -f "$MIG/$f" 2>&1 | tail -3; exit 1; }
done
$P perfilpriv -f "$MIG/080_private_profile.sql" >/dev/null
echo "migrations aplicadas (até 080, 080 duas vezes)"
psql -h /tmp/pg -p 54329 -U pguser perfilpriv -q -At -f "$HERE/test_080.sql" 2>&1 | grep -v '^\s*$'
echo "--- Deck público com a 080 ---"
for t in test_public_deck test_media_independence test_hardening test_071 test_duplicates test_duplicates_hjk; do
  psql -h /tmp/pg -p 54329 -U pguser perfilpriv -q -f "$ROOT/tests/fase-public-deck/$t.sql" 2>&1 | grep -E "RESULTADO|FALHA"
done
psql -h /tmp/pg -p 54329 -U pguser perfilpriv -q -f "$ROOT/tests/k8/test_079.sql" 2>&1 | grep -E "RESULTADO|FALHA"
echo "--- Amigos com a 080 ---"
psql -h /tmp/pg -p 54329 -U pguser perfilpriv -q -At -f "$ROOT/tests/amigos/test_friends.sql" 2>&1 | grep -v '^\s*$' | grep -E 'FALHA' || true; psql -h /tmp/pg -p 54329 -U pguser perfilpriv -q -At -f "$ROOT/tests/amigos/test_friends.sql" 2>&1 | grep -c '^ok|'
psql -h /tmp/pg -p 54329 -U pguser perfilpriv -q -At -f "$ROOT/tests/amigos/test_friends_074.sql" 2>&1 | grep -v '^\s*$' | tail -4
