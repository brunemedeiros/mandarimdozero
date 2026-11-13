---
paths:
  - "tests/**"
---

# Testes

Procedimento de teste no navegador: skill `teste-navegador`. Para rodar regressão em lote: agente `regressao`.

- Cada área tem pasta em `tests/<tema>/` (unit Node/VM, `test_playwright.js`, `.sql` com ROLLBACK, `run.sh`).
- Carregar arquivos de PRODUÇÃO no teste (nunca cópias); stubar só a rede (Supabase, CDN, fetch de mídia).
- Testes de banco usam um Postgres LOCAL (`/tmp/pg`, porta 54329, `pguser`): `bash tests/banco-local.sh` liga (cria se não existir;
  `status`/`desligar` também). `build_db.sh` e `fase-grants/run.sh` já chamam sozinhos. O clone vem raso: teste que pede commit antigo
  (`git show <hash>`) precisa de `git fetch --unshallow origin` antes.
- O sandbox bloqueia o CDN do Supabase: `ERR_TUNNEL_CONNECTION_FAILED` no console é esperado; qualquer outro erro é real.
- Relatar números reais (`N/N`) e separar falhas pré-existentes (confirmadas com `git stash`) de falhas novas.
- Ao mudar comportamento de propósito, atualizar o teste antigo e dizer qual e por quê.
