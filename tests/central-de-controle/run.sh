#!/bin/bash
# 145 (Central de Controle): Postgres LOCAL (nunca produção) com todas as migrations do repositório, 145 aplicada 2 vezes.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
bash "$ROOT/tests/banco-local.sh" >/dev/null
DB=overview145; P="psql -h /tmp/pg -p 54329 -U pguser -q"
$P postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
$P $DB -f "$ROOT/tests/fase-identity/stub_auth_storage.sql" >/dev/null 2>&1
$P $DB -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select string_to_array(name, '/') \$\$" >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^[01][0-9][0-9]_' | grep -v "^145"); do $P $DB -f "$MIG/$f" >/dev/null 2>&1 || true; done
$P -v ON_ERROR_STOP=1 $DB -f "$MIG/145_admin_overview.sql" >/dev/null
$P -v ON_ERROR_STOP=1 $DB -f "$MIG/145_admin_overview.sql" >/dev/null
echo "145 aplicada (duas vezes)"
$P $DB -At -f "$HERE/test_145.sql" 2>&1 | grep -v '^\s*$'
