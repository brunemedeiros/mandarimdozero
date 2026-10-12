#!/bin/sh
# 080 -- aplica 075 + 076 + 080 sobre o schema mínimo (stubs) e roda os cenários do Banco de Revisão.
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists banco80' -c 'create database banco80'"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d banco80 -f $D/tests/papeis-permissoes/local_stub_schema.sql -f $D/tests/papeis-permissoes/stub_076.sql -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql -f $D/shared/supabase_migrations/076_teacher_role_policies.sql -f $D/tests/banco-revisao/stub_review_bank.sql -f $D/shared/supabase_migrations/080_review_bank.sql"
# idempotência: reaplicar não pode falhar
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d banco80 -f $D/shared/supabase_migrations/080_review_bank.sql"
su postgres -c "psql -q -d banco80 -c 'grant all on all tables in schema public to authenticated' -c 'grant usage on schema public to authenticated'"
su postgres -c "psql -d banco80 -f $D/tests/banco-revisao/test_review_bank.sql"
