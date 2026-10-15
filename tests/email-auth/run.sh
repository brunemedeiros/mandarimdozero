#!/bin/bash
# Modelos bilíngues do Supabase Auth (docs/email/supabase/bilingue/): renderiza com o motor de template do Go
# (o mesmo do Supabase Auth), com Data ausente/vazio/pt-BR/en/es, em html/template e text/template, e confere:
# português idêntico ao modelo atual e inglês sem nenhuma palavra em português. Sem rede.
# Uso: bash tests/email-auth/run.sh
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
export PATH="$PATH:/usr/local/go/bin"
TMP=$(mktemp -d)
cp "$HERE/render_bilingue.go" "$TMP/main.go"
cd "$TMP" || exit 1
go mod init rendertest >/dev/null 2>&1
go run main.go "$ROOT" > "$TMP/saida.txt" 2>&1
echo "verificações ok: $(grep -c '^ok' "$TMP/saida.txt")"
grep -v '^ok' "$TMP/saida.txt"
rm -rf "$TMP"
