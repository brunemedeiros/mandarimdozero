#!/usr/bin/env bash
# Janelas do topo (sequência e XP da semana): contas e navegador.
set -e
cd "$(dirname "$0")/../.."
node tests/janelas-topo/test_calculo.js
node tests/janelas-topo/test_playwright.js
