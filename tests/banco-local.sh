#!/bin/bash
# Banco Postgres LOCAL dos testes (nunca Staging nem produção): socket em /tmp/pg, porta 54329, usuário pguser (sem senha).
# Os testes de banco (tests/*/run.sh, run_*.sh, test_*.sh) esperam esse banco. O build_db.sh e o fase-grants/run.sh já
# chamam este roteiro, então em geral ninguém precisa rodá-lo à mão.
# Uso: bash tests/banco-local.sh [ligar|status|desligar]   (padrão: ligar; pode rodar quantas vezes quiser)
# O banco vive em /tmp: some quando a sessão/contêiner é recriado, e este roteiro cria de novo.
set -e
ACAO=${1:-ligar}
SOCK=/tmp/pg; PORTA=54329; DADOS=/tmp/pg-dados
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
[ -n "$BIN" ] || BIN=$(dirname "$(command -v pg_ctl 2>/dev/null || echo /x/x)")
[ -x "$BIN/pg_ctl" ] || { echo "banco-local: Postgres não instalado (falta pg_ctl)"; exit 1; }

# initdb/pg_ctl não rodam como root: como root, usa o usuário do sistema 'postgres'.
como_dono(){ if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
ligado(){ "$BIN/pg_isready" -q -h "$SOCK" -p "$PORTA" 2>/dev/null; }

case "$ACAO" in
  status)
    if ligado; then echo "banco-local: ligado ($SOCK:$PORTA)"; else echo "banco-local: desligado"; exit 1; fi ;;
  desligar)
    if ligado; then como_dono "$BIN/pg_ctl" -D "$DADOS" stop -m fast >/dev/null && echo "banco-local: desligado"; else echo "banco-local: já estava desligado"; fi ;;
  ligar)
    if ligado; then exit 0; fi
    mkdir -p "$SOCK"; chmod 1777 "$SOCK"
    if [ ! -f "$DADOS/PG_VERSION" ]; then
      rm -rf "$DADOS"; mkdir -p "$DADOS"
      [ "$(id -u)" = 0 ] && chown postgres "$DADOS"
      como_dono "$BIN/initdb" -D "$DADOS" -U pguser --auth=trust -E UTF8 >/dev/null
    fi
    como_dono "$BIN/pg_ctl" -D "$DADOS" -l "$DADOS/log.txt" -w \
      -o "-p $PORTA -k $SOCK -c listen_addresses=''" start >/dev/null
    # Papel 'postgres' (existe no Supabase; as migrations dão GRANT para ele).
    psql -h "$SOCK" -p "$PORTA" -U pguser -q -d postgres \
      -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='postgres') then create role postgres superuser login; end if; end \$\$"
    echo "banco-local: ligado ($SOCK:$PORTA)" ;;
  *) echo "uso: bash tests/banco-local.sh [ligar|status|desligar]"; exit 2 ;;
esac
