#!/bin/bash
# Reconstrói o Postgres local, aplica 061 e roda os testes do banco. Uso: run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."
bash "$ROOT/tests/fase-identity/build_db.sh" pubdeck >/dev/null 2>&1
psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -v ON_ERROR_STOP=1 -f "$ROOT/shared/supabase_migrations/061_public_decks.sql" >/dev/null 2>&1
psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -v ON_ERROR_STOP=1 -f "$ROOT/shared/supabase_migrations/062_public_deck_duplicates.sql" >/dev/null 2>&1
psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -f "$HERE/test_public_deck.sql" 2>&1 | grep -v '^\s*$'
echo "--- P7 independência de mídia ---"
psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -f "$HERE/test_media_independence.sql" 2>&1 | grep -v '^\s*$'
echo "--- Hardening final ---"
psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -f "$HERE/test_hardening.sql" 2>&1 | grep -v '^\s*$'
echo "--- Duplicatas / reimportação (062) ---"
psql -h /tmp/pg -p 54329 -U pguser pubdeck -q -f "$HERE/test_duplicates.sql" 2>&1 | grep -v '^\s*$'
echo "--- Concorrência real (062) ---"
bash "$HERE/test_duplicates_concurrency.sh"
