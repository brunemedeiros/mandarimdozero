#!/bin/sh
# 077 -- aplica 075 + 076 + 077 sobre o schema mínimo e roda os cenários de convite/badge (2x a 077: idempotente).
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists papeis77' -c 'create database papeis77'"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d papeis77 -f $D/tests/papeis-permissoes/local_stub_schema.sql -f $D/tests/papeis-permissoes/stub_076.sql -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql -f $D/shared/supabase_migrations/076_teacher_role_policies.sql"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d papeis77 -c \"update teacher_students set language_app_key='frances'\" -f $D/tests/papeis-permissoes/stub_077.sql -f $D/shared/supabase_migrations/077_teacher_invites_and_badges.sql -f $D/shared/supabase_migrations/077_teacher_invites_and_badges.sql"
su postgres -c "psql -d papeis77 -f $D/tests/papeis-permissoes/test_077.sql"
