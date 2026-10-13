#!/bin/sh
# Papéis e permissões -- roda a 075 + testes num Postgres LOCAL (schema mínimo). Uso: tests/papeis-permissoes/run_local.sh
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists papeis' -c 'create database papeis'"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d papeis -f $D/tests/papeis-permissoes/local_stub_schema.sql -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql"
# idempotência: aplicar de novo não pode falhar
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d papeis -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql"
su postgres -c "psql -d papeis -f $D/tests/papeis-permissoes/test_075.sql"
