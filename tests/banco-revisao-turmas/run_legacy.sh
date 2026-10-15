#!/bin/sh
# Suíte antiga do Banco (tests/banco-revisao/test_review_bank.sql) com a 096 aplicada por cima: o aluno ligado a UMA
# conta precisa continuar funcionando igual. Mesmo cluster de tests/banco-revisao/run_local.sh.
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists banco96' -c 'create database banco96'"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d banco96 -f $D/tests/papeis-permissoes/local_stub_schema.sql -f $D/tests/papeis-permissoes/stub_076.sql -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql -f $D/shared/supabase_migrations/076_teacher_role_policies.sql -f $D/tests/banco-revisao/stub_review_bank.sql -f $D/shared/supabase_migrations/081_review_bank.sql -f $D/shared/supabase_migrations/082_review_bank_roster.sql -f $D/shared/supabase_migrations/083_review_bank_schedule.sql -f $D/shared/supabase_migrations/084_review_bank_import_keys.sql -f $D/shared/supabase_migrations/085_review_bank_sensitive.sql -f $D/tests/banco-revisao-turmas/stub_087_094.sql -f $D/shared/supabase_migrations/096_review_bank_classrooms.sql" 2>&1 | grep -v NOTICE || true
su postgres -c "psql -q -d banco96 -c 'grant all on all tables in schema public to authenticated' -c 'grant usage on schema public to authenticated'"
su postgres -c "psql -d banco96 -f $D/tests/banco-revisao/test_review_bank.sql" 2>&1 | grep -A20 "passed | failed"
