#!/bin/sh
# Família latina (shared/core/familias/): paridade com o fr/app.js + exemplos reais do pt e do fr.
cd "$(dirname "$0")/../.." || exit 1
fail=0
for t in test_paridade_fr test_frances test_portugues; do
  out=$(node "tests/familia-latina/$t.js"); rc=$?
  echo "$out" | tail -1
  if [ $rc -ne 0 ]; then echo "$out" | grep -E '^(✗|FALHOU)' | head -20; fail=1; fi
done
exit $fail
