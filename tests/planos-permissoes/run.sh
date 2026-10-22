#!/bin/bash
# Etapa 5 (116): monta um Postgres LOCAL com as migrations reais 001..115, aplica a 116 duas vezes (idempotência)
# e roda tests/planos-permissoes/test_116.sql. Nunca toca Staging nem produção. Uso: bash tests/planos-permissoes/run.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q"
bash "$ROOT/tests/fase-identity/build_db.sh" planos116 >/dev/null 2>&1
# stubs que o Postgres local não tem (Storage/Vault do Supabase)
$P planos116 -c "create or replace function storage.foldername(name text) returns text[] language sql immutable as \$\$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] \$\$;" >/dev/null
for f in $(ls $MIG | sort | grep -E '^(059|06[1-9]|0[7-9][0-9]|10[0-9]|11[0-5])_'); do
  $P planos116 -v ON_ERROR_STOP=0 -f "$MIG/$f" >/dev/null 2>&1 || true
done
$P planos116 -v ON_ERROR_STOP=1 -f "$MIG/116_plan_permissions_effective.sql" >/dev/null
$P planos116 -v ON_ERROR_STOP=1 -f "$MIG/116_plan_permissions_effective.sql" >/dev/null && echo "ok|116 aplicada 2x (idempotente)"
$P planos116 -f "$HERE/test_116.sql" 2>&1 | grep -v '^\s*$' | grep -v '^BEGIN\|^ROLLBACK\|^CREATE\|^INSERT\|^GRANT\|^SELECT\|^UPDATE'
echo "--- 008 corrigida (Desafios no servidor; NÃO aplicada em lugar nenhum) ---"
(cd "$ROOT" && $P planos116 -f "$HERE/test_008.sql" 2>&1 | grep -E '^ ?(ok|FALHA|TOTAL)|ERROR')
