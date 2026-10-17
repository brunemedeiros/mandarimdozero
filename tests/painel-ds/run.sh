#!/bin/bash
# Regressão do Design System do painel (Fase 1): escopo, tokens, contraste e navegador.
# Uso: bash tests/painel-ds/run.sh   (SHOT_DIR=/tmp/painel-shots para salvar screenshots)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
for t in test_escopo test_tokens test_contraste test_playwright test_alinhamento test_ui; do
  echo "== $t"; node "$HERE/$t.js"
done
