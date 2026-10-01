#!/bin/bash
# Reconstrói um Postgres LOCAL (nunca produção) com os stubs de auth/storage e
# as migrations reais 001..058 (059 fica de fora de propósito), semeia contas
# LEGADAS (com '.'), e só então aplica a 060. Uso: build_db.sh <nome_db>
set -e
DB=${1:-ident}; P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=0"
HERE=$(cd "$(dirname "$0")" && pwd); MIG="$HERE/../../shared/supabase_migrations"
$P postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
$P $DB -f $HERE/stub_auth_storage.sql >/dev/null 2>&1
for f in $(ls $MIG | sort | grep -E '^0[0-5][0-9]_' | grep -v '^059' | grep -v '^060'); do $P $DB -f $MIG/$f >/dev/null 2>&1 || true; done
$P $DB -f $HERE/seed_legacy.sql >/dev/null
$P $DB -f $MIG/060_identity_generated_username_and_attribution_tag.sql 2>&1 | grep -i error || true
echo built:$DB
