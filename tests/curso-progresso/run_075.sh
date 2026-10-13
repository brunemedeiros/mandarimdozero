#!/bin/bash
# Postgres LOCAL (nunca produção): reconstrói o banco com 001..070, aplica a 075 e roda (1) o teste ANTIGO do painel da professora
# (tests/painel-alunos/test_rpc.sql, 25 verificações do comportamento de antes) e (2) test_075_rpc.sql (chaves de curso e _account).
# Pré-requisito: Postgres local em /tmp/pg porta 54329 com os papéis anon/authenticated/service_role/postgres.
# Uso: bash tests/curso-progresso/run_075.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$ROOT/tests/fase-identity/build_db.sh" c075 >/dev/null 2>&1
for f in $(ls "$MIG" | sort | grep -E '^0(59|6[1-9]|70|75)_'); do
  $P c075 -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; exit 1; }
done
echo "migrations aplicadas (até 075)"
echo "== comportamento antigo (painel-alunos/test_rpc.sql) com a 075 aplicada"
psql -h /tmp/pg -p 54329 -U pguser c075 -q -At -f "$ROOT/tests/painel-alunos/test_rpc.sql" 2>&1 | grep -v '^\s*$' | tail -3
echo "== chaves de curso e _account (test_075_rpc.sql)"
psql -h /tmp/pg -p 54329 -U pguser c075 -q -At -f "$HERE/test_075_rpc.sql" 2>&1 | grep -v '^\s*$'
