#!/bin/bash
# P1: memória dos cartões da professora e próprios por idioma estudado (docs/p1-memoria-por-idioma.md).
# A simulação com dados reais precisa do arquivo copiado da produção (fora do repositório): passe o caminho como 1º argumento.
set -e
cd "$(dirname "$0")/../.."
node tests/p1-memoria-por-idioma/test_memoria_por_idioma.js
if [ -n "$1" ]; then node tests/p1-memoria-por-idioma/simular_migracao.js "$1"; fi
