#!/bin/sh
# Achados C1, A1, A2, A3 e M2 da revisão do código compartilhado (docs/revisao-codigo-compartilhado-erros.md).
# Todos falham na origin/main 1559776e e passam depois das correções. Para rodar contra outra árvore:
#   REPO_ROOT=/caminho/do/worktree sh tests/revisao-seguranca/run.sh   (o test_c1_unit.js lê sempre esta árvore)
D="$(cd "$(dirname "$0")" && pwd)"
rc=0
for t in test_c1_unit.js test_c1_midia.js test_a1_texto.js test_a2_progresso.js test_a3_revisao_rapida.js test_m2_voz_cancelar.js; do
  out=$(node "$D/$t" 2>&1) || rc=1
  echo "$out" | tail -1
done
exit $rc
