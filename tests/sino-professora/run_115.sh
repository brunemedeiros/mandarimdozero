#!/bin/bash
# 115 (Etapa 4: avisos de vínculo sem "aluno/a", badge "Turma de X") -- Postgres LOCAL (nunca produção).
# Monta o banco da 108 (run.sh, que roda o teste da 108), aplica a 115 duas vezes (idempotente) e roda test_115.sql
# em transação com ROLLBACK. Uso: bash tests/sino-professora/run_115.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."; MIG="$ROOT/shared/supabase_migrations"
export DB=${DB:-sino115}
P="psql -h /tmp/pg -p 54329 -U pguser -q -v ON_ERROR_STOP=1"
bash "$HERE/run.sh" | tail -1
for f in 115_etapa4_teacher_link_texts.sql 115_etapa4_teacher_link_texts.sql; do
  $P "$DB" -f "$MIG/$f" >/dev/null 2>&1 || { echo "FALHA ao aplicar $f"; $P "$DB" -f "$MIG/$f" 2>&1 | grep -i error | head -3; exit 1; }
done
echo "115 aplicada duas vezes"
psql -h /tmp/pg -p 54329 -U pguser "$DB" -q -At -f "$HERE/test_115.sql" 2>&1 | grep -v '^\s*$'
