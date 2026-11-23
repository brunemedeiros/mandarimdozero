#!/bin/bash
# Postgres LOCAL (nunca produção): stubs + profiles mínima (padrão antigo = público, como a 041) + 073 + 136 + test_136.sql.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists pp136' -c 'create database pp136'" >/dev/null
su postgres -c "psql -q -d pp136 -f $ROOT/tests/fase-identity/stub_auth_storage.sql" >/dev/null 2>&1 || true
su postgres -c "psql -q -d pp136 -v ON_ERROR_STOP=1 -c \"create table if not exists public.profiles(user_id uuid primary key references auth.users(id), username text, public_profile boolean not null default true); grant select, insert, update on public.profiles to authenticated;\""
su postgres -c "psql -q -d pp136 -v ON_ERROR_STOP=1 -f $ROOT/shared/supabase_migrations/073_create_profile_private.sql"
su postgres -c "psql -q -d pp136 -v ON_ERROR_STOP=1 -f $ROOT/shared/supabase_migrations/136_privacy_default_and_age_ack.sql"
# Rodar a 136 duas vezes prova que é idempotente.
su postgres -c "psql -q -d pp136 -v ON_ERROR_STOP=1 -f $ROOT/shared/supabase_migrations/136_privacy_default_and_age_ack.sql"
su postgres -c "psql -d pp136 -q -At -f $HERE/test_136.sql" 2>&1 | grep -v '^\s*$'
