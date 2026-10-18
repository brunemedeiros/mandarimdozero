# Qualidade de código (vale para toda mudança)

Decisão da dona (2026-10-18): o código não pode virar uma coleção de remendos. Quem assumir o projeto no futuro (uma pessoa que sabe
programar) deve conseguir entender, mudar e testar tudo sem depender de histórico de conversa. Guia vivo: `docs/guia-do-desenvolvedor.md`.

- **Um lugar para cada decisão.** Antes de acrescentar uma regra, procure se ela já existe (funções em `shared/core/`, tabelas em
  `fr/curriculum-changes.js`, tokens, constantes). Lógica repetida em fr e zh vai para `shared/`; a parte por idioma entra por gancho
  (`LANG_HOOKS`), não por `if (idioma)` espalhado.
- **Função pura + camada fina.** Regra de negócio (id de cartão, portão de lição, fusões, abertura de unidade) em função pura testável,
  sem DOM, sem `STATE` global; o `app.js` só chama.
- **Nada de "gambiarra com comentário de desculpa".** Se algo precisa ser provisório, abra pendência no `CLAUDE.md` (1 linha) e
  deixe o provisório isolado e nomeado. Remendo sem teste não entra.
- **Dados e conteúdo mudam por script**, não à mão (`fr/scripts/curriculo_ops.js` e geradores): o script atualiza todas as camadas
  juntas e roda os validadores.
- **Teste junto com a mudança** em `tests/<tema>/`, com regressão da área e números reais no relatório. Mudou comportamento: teste
  novo que falharia sem a mudança.
- **Nomes que dizem o que é.** Função, arquivo e chave com nome funcional, sem número de fase ("etapa2Fix"). Comentário explica o
  porquê, não o quê, e aponta o doc (`docs/...`) quando a decisão é longa.
- **Cada coisa específica nova vira linha no guia do desenvolvedor** (onde fica, como mudar, como testar, o que não fazer).
