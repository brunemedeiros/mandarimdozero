#!/bin/bash
# Testa a 065 num Postgres LOCAL com o padrão restritivo de GRANTs (como o staging). Uso: run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); MIG="$HERE/../../shared/supabase_migrations"
S="psql -h /tmp/pg -p 54329 -U pguser -q"
$S postgres -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='postgres') then create role postgres superuser login; end if; end \$\$"
P="psql -h /tmp/pg -p 54329 -U postgres -q -v ON_ERROR_STOP=0"
$P postgres -c "drop database if exists grants65" -c "create database grants65 owner postgres" >/dev/null
$P grants65 -c "create role anon nologin" -c "create role authenticated nologin" -c "create role service_role nologin bypassrls" 2>/dev/null || true
# o stub cria as roles de novo (erro ignorado) e o schema auth/storage
$P grants65 -f $HERE/stub_staging_like.sql >/dev/null 2>&1
ERR=0
for f in $(ls $MIG | sort | grep -E '^0[0-6][0-9]_' | grep -v '^065' | grep -v '^066'); do
  out=$(psql -h /tmp/pg -p 54329 -U postgres grants65 -q -v ON_ERROR_STOP=1 -f $MIG/$f 2>&1 >/dev/null | grep -v NOTICE || true) ; [ -z "$out" ] || { echo "ERRO em $f: $(echo "$out"|head -2)"; ERR=$((ERR+1)); }
done
echo "cadeia 001..064 aplicada (erros: $ERR)"
