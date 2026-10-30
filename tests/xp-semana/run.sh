#!/usr/bin/env bash
# XP da semana no topo + janelinha + avisos de XP fora das telas de conclusão.
set -e
cd "$(dirname "$0")/../.."
node tests/xp-semana/test_calculo.js
node tests/xp-semana/test_playwright.js
