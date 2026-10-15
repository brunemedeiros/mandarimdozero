#!/bin/sh
# 081 -- aplica 075 + 076 + 081 a 085 e 089 a 091 sobre o schema mínimo (stubs) e roda os cenários do Banco de Revisão.
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists banco81' -c 'create database banco81'"
su postgres -c "psql -q -d banco81 -c \"do \\\$\\\$ begin if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end \\\$\\\$\""
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d banco81 -f $D/tests/papeis-permissoes/local_stub_schema.sql -f $D/tests/papeis-permissoes/stub_076.sql -f $D/shared/supabase_migrations/075_account_roles_and_permissions.sql -f $D/shared/supabase_migrations/076_teacher_role_policies.sql -f $D/tests/banco-revisao/stub_review_bank.sql -f $D/tests/banco-revisao/stub_agent_inbox.sql -f $D/shared/supabase_migrations/081_review_bank.sql -f $D/shared/supabase_migrations/082_review_bank_roster.sql -f $D/shared/supabase_migrations/083_review_bank_schedule.sql -f $D/shared/supabase_migrations/084_review_bank_import_keys.sql -f $D/shared/supabase_migrations/089_review_bank_agent.sql -f $D/shared/supabase_migrations/090_review_bank_agent_deck_fix.sql -f $D/shared/supabase_migrations/091_review_bank_agent_inbox.sql"
# idempotência: reaplicar não pode falhar
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d banco81 -f $D/shared/supabase_migrations/081_review_bank.sql -f $D/shared/supabase_migrations/082_review_bank_roster.sql -f $D/shared/supabase_migrations/083_review_bank_schedule.sql -f $D/shared/supabase_migrations/084_review_bank_import_keys.sql -f $D/shared/supabase_migrations/085_review_bank_sensitive.sql -f $D/shared/supabase_migrations/089_review_bank_agent.sql -f $D/shared/supabase_migrations/090_review_bank_agent_deck_fix.sql -f $D/shared/supabase_migrations/091_review_bank_agent_inbox.sql"
su postgres -c "psql -q -d banco81 -c 'grant all on all tables in schema public to authenticated' -c 'grant usage on schema public to authenticated' -c 'grant all on all tables in schema public to service_role' -c 'grant usage on schema public to service_role'"
su postgres -c "psql -d banco81 -f $D/tests/banco-revisao/test_review_bank.sql"
