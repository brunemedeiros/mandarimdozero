#!/bin/sh
# 076 -- aplica 075 + 076 sobre um schema mínimo igual às policies da produção e roda os cenários.
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists papeis76' -c 'create database papeis76'"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d papeis76 -f $D/tests/papeis-permissoes/local_stub_schema.sql -f $D/tests/papeis-permissoes/stub_076.sql -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql -f $D/shared/supabase_migrations/076_teacher_role_policies.sql"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d papeis76 -f $D/shared/supabase_migrations/076_teacher_role_policies.sql"
su postgres -c "psql -d papeis76 -f $D/tests/papeis-permissoes/test_076.sql"
