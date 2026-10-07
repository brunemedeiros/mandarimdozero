#!/bin/bash
# Postgres LOCAL (nunca produção): schema mínimo (auth/storage stubs) + migration 073 + test_073.sql.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists pp073' -c 'create database pp073'" >/dev/null
su postgres -c "psql -q -d pp073 -f $ROOT/tests/fase-identity/stub_auth_storage.sql" >/dev/null 2>&1 || true
su postgres -c "psql -q -d pp073 -v ON_ERROR_STOP=1 -f $ROOT/shared/supabase_migrations/073_create_profile_private.sql"
su postgres -c "psql -d pp073 -q -At -f $HERE/test_073.sql" 2>&1 | grep -v '^\s*$'
