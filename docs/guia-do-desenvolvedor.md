# Guia do desenvolvedor (vivo)

Objetivo: quem sabe programar consegue assumir o site sozinho. Cresce a cada decisão técnica específica.
Regras de código: `.claude/rules/qualidade-de-codigo.md`. Regras por área: `.claude/rules/`. Histórico: `docs/historico/`.

## Como o site é montado
- Estático (GitHub Pages, publicado a partir da `main`), sem build. `fr/` e `zh/` são apps espelhados (`app.js`); o que é comum mora em
  `shared/` e `shared/core/`; o que muda por idioma entra por `LANG_HOOKS` (`fr/lang-hooks.js`, `zh/lang-hooks.js`).
- Dados: Supabase (banco, Auth, Storage, Edge Functions). Produção `eigjocalzwamisgqilhg`, Staging `ilfjzizjfcmhibkhwber`; sempre Staging antes.

## Currículo e progresso do aluno (ids estáveis)
- Cada palavra, frase e fala do currículo tem uma **chave estável `k`** em `fr/content.js`. O id do cartão (`u{k}`) vem da chave,
  nunca da posição: reordenar, mover e reescrever não troca id. Item sem `k` (zh) segue a regra antiga.
- Mudou o currículo (fundir, aposentar, mover unidade)? Registre em `fr/curriculum-changes.js` (`STUDY_KEY_MERGES`, `STUDY_RETIRED_KEYS`,
  `UNIT_MERGES`, `MODULE_MERGES`) e use os scripts. O teste `tests/curriculo-ids/test_ids_publicados.js` falha se um id já publicado
  sumir sem estar registrado (livro-razão `fr/published_ids.json`).
- Progresso de cartões aposentados fica em `STATE.retiredStudyCards` (volta se o item voltar). `released` mantém na revisão uma palavra
  que o aluno já liberou. Unidade nova inserida atrás do aluno nasce aberta e não concluída (`openUnitsBeforeOpenOnes`).
- Notificações: o `notification-cron` usa um mapa gerado, `STUDY_ITEM_GATE`; regenere com `node scripts/gerar_mapa_cron.js` e publique a
  função (a Edge Function só muda em produção após novo deploy).
- Detalhes e decisões: `docs/historico/21-*`, `22-*`, `docs/i18n/curriculo/04-lacunas-e-propostas-fr.md` seção 2.

## Como testar
- Testes por tema em `tests/<tema>/`; bateria completa e suítes instáveis: `.claude/rules/testes.md`.
- Mudou progresso/trilha: rode `tests/curriculo-ids`, `tests/e4/test_progresso_ida_e_volta.js`, `tests/e4/test_core_carregado.js` e as capturas
  `tests/e4/capturas.js` + `comparar-capturas.js` (a interface não pode mudar sem intenção).

## Pendências técnicas conhecidas
- Ver a seção "Estado atual" do `CLAUDE.md` (1 linha por item).
