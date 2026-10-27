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

## Mapa do currículo em dados (`mapa.json` e `excecoes.json`)
- **Onde fica:** `docs/i18n/curriculo/dados/mapa.json` (A1 e A2 do francês: níveis, módulos e unidades com id estável, `id_funcao`,
  cartões com chave, notas com tipo, confiança e gancho, gramáticas com `versao_gratis_em`) e `dados/excecoes.json` (expressões fixas,
  fórmulas de diálogo, "diálogo como entrada", unidades acima do limite). As contas saem de `fr/scripts/curriculo_mapa.js` (funções puras).
  Divergências com o `08`: `dados/ACHADOS.md`.
- **Como mudar:** o mapa está congelado (decisão 259); mudança só por pedido de mudança aprovado pela dona, com o `auditor-curricular`.
  Edite o json, rode `node fr/scripts/curriculo_mapa.js --conferir` e `--tabela` e cole os números no `08`. Exceção nova só com o OK da dona.
  Regra numérica (limite de palavras, lições, teto de tempo) muda em `REGRAS` no script e no `15`, nunca no json
  (teto da regra 16: 3h55 para todos os módulos, sem exceção, decisão 270). Campo opcional `licao` no cartão: número da lição (1 a 4)
  quando a distribuição está decidida (decisão 274; hoje só "Cumprimentar e se despedir") ou `"pronuncia"` (não conta como palavra).
- **Como testar:** `node tests/curriculo/test_mapa_totais.js` (totais do `08`, regras 12, 13, 14 e 16, títulos das notas de vocabulário, chaves
  contra `fr/published_ids.json`).
- **O que não fazer:** não digitar total no `08` nem no json; não mudar número do json para o teste passar (registre em `ACHADOS.md`);
  não usar a posição ("M4.2") como id; o json ainda não alimenta o site (`fr/content.js` continua sendo o conteúdo publicado).

## Papel das frases "Na frase" e validador "só palavras vistas" (decisões 226 e 233)
- **Onde fica:** regra do papel em `fr/scripts/curriculo_papel.js` (`frasePodeAparecer(papel, contexto)`: `so_exemplo` só em ficha, Revisão e
  exercício da lição; `essencial` em todo lugar; Ponto de verificação da unidade fechado para `so_exemplo` por escolha conservadora) e papéis
  por chave em `docs/i18n/curriculo/dados/frases_na_frase.json` (começa vazio; marca-se junto com o conteúdo, decisão 227).
  Validador em `fr/scripts/curriculo_palavras_vistas.js` (`palavrasVistasAte`, `validarTexto`), com dados em `dados/palavras_funcionais.json`
  (cada grupo justificado; cartão vence a lista; grupo com `lema` só vale depois do cartão do lema) e `dados/formas_extras.json` (formas
  irregulares e nomes de pessoa). Relatório: `node fr/scripts/curriculo_palavras_vistas.js --relatorio` grava `dados/RELATORIO-palavras-vistas.md`.
- **Como mudar:** contexto novo entra em `CONTEXTOS` do `curriculo_papel.js` (lista única, o validador usa a mesma); onde a nota conta como
  vista é `NOTAS_CONTAM_EM` (hoje só `dialogo`, decisões 225 e 253). Forma irregular que aparece como "incerta": acrescente em `formas_extras.json`.
  Palavra funcional nova: grupo com justificativa. Exceção nova só em `excecoes.json`, com o OK da dona.
- **Como testar:** `node tests/curriculo/test_palavras_vistas.js` e `node tests/curriculo/test_papel_frases.js` (casos sintéticos + mapa real).
- **O que não fazer:** não usar o relatório como teste que falha (é a lista de reescrita, informativa); não editar o relatório à mão; não pôr
  palavra de conteúdo em `palavras_funcionais.json` para "limpar" achado; não espalhar `if (papel === ...)` pelo app (chamar `frasePodeAparecer`).
- **Limitações:** comparação por forma (gerador simples: gênero, número, presente regular, particípio, imperfeito); forma irregular fora de
  `formas_extras.json` vira `incerta` só quando é de verbo visto. Expressão de várias palavras libera cada palavra solta. Notas só contam pelo
  campo `palavras` do `mapa.json` (as de explicação, realidade e cultura ainda não listam palavras). Gramática não libera formas (ex.: *il faut*).
  Exceções valem só na unidade citada (não acumulam). Nome próprio: maiúscula no meio da frase ou lista de nomes.

## Como testar
- Testes por tema em `tests/<tema>/`; bateria completa e suítes instáveis: `.claude/rules/testes.md`.
- Mudou progresso/trilha: rode `tests/curriculo-ids`, `tests/e4/test_progresso_ida_e_volta.js`, `tests/e4/test_core_carregado.js` e as capturas
  `tests/e4/capturas.js` + `comparar-capturas.js` (a interface não pode mudar sem intenção).

## Pendências técnicas conhecidas
- Ver a seção "Estado atual" do `CLAUDE.md` (1 linha por item).
