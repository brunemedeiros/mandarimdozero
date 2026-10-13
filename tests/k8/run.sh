#!/bin/bash
# K.8 -- Postgres LOCAL (nunca produção). Banco igual ao de tests/fase-public-deck (001..071) + 075 + 079,
# roda os testes do Deck público de novo (a cópia não pode mudar de comportamento) e o teste da 079.
# Uso: bash tests/k8/run.sh   (cluster em /tmp/pg:54329, ver tests/fase-public-deck)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" k8 >/dev/null 2>&1
for f in 061_public_decks 062_public_deck_duplicates 063_profiles_protect_plan_tier_role 064_version_progress_table \
         065_grant_table_privileges_parity 066_profiles_protect_plan_role_insert 067_public_deck_copy_linear_plan \
         068_public_deck_copy_media_linear 069_public_deck_duplicates_changed_not_retryable 071_public_deck_hardening \
         075_account_roles_and_permissions 079_public_deck_copies 079_public_deck_copies; do
  $P k8 -f "$MIG/$f.sql" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P k8 -f "$MIG/$f.sql" 2>&1 | tail -3; exit 1; }
done
echo "migrations aplicadas (061..071 + 075 + 079 duas vezes)"
echo "copy_public_deck = 068 + bloco K.8: $(psql -h /tmp/pg -p 54329 -U pguser k8 -At -c "select (position('public_deck_copies' in prosrc) > 0)::text from pg_proc where proname='copy_public_deck'")"
for t in test_public_deck test_media_independence test_hardening test_071 test_duplicates test_duplicates_hjk; do
  psql -h /tmp/pg -p 54329 -U pguser k8 -q -f "$ROOT/tests/fase-public-deck/$t.sql" 2>&1 | grep -v '^\s*$'
done
psql -h /tmp/pg -p 54329 -U pguser k8 -q -f "$HERE/test_079.sql" 2>&1 | grep -v '^\s*$'
