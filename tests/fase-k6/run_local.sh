#!/bin/sh
# K.6 -- roda a migration 059 + o teste SQL num Postgres LOCAL (schema mínimo).
# Uso (como root, Postgres 16 instalado): tests/fase-k6/run_local.sh
set -e
D="$(cd "$(dirname "$0")/../.." && pwd)"
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
su postgres -c "psql -q -c 'drop database if exists k6' -c 'create database k6'"
su postgres -c "psql -q -d k6 -f $D/tests/fase-k6/local_stub_schema.sql -f $D/shared/supabase_migrations/059_teacher_metrics_note_level.sql"
su postgres -c "psql -d k6 -f $D/tests/fase-k6/test_teacher_metrics_note_level.sql" 2>&1 | grep -E "RESULTS|ERROR" || true
