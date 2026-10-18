# 22. Etapa 0b do currículo fr, parte 1: mapa do cron, unidade nova aberta, deck de unidade que saiu (2026-10-18)

Plano: `docs/i18n/curriculo/04-lacunas-e-propostas-fr.md` 2.4, 2.5 e 2.10 (sobre a Etapa 0a, `21-etapa-0a-ids-estaveis-fr.md`).
Grátis x Premium: infraestrutura, tudo grátis; nada muda para o aluno com o conteúdo de hoje.
Fora desta parte: script de operações (`curriculo_ops.js`) e camadas por chave (aguardam decisão da dona).

## O que entrou

- **Mapa do cron gerado.** `scripts/gerar_mapa_cron.js` (fr + zh; `--conferir`) escreve `STUDY_ITEM_GATE`
  {id do cartão A da palavra -> [unidade atual, índice da lição] ou, chave fundida, [unidade, lição, sobrevivente]} entre os
  marcadores `>>> / <<< GERADO: STUDY_ITEM_GATE` de `supabase/functions/notification-cron/index.ts` E de
  `docs/deploy/notification-cron-para-colar-no-painel.ts` (não havia script para a cópia do painel; agora o gerador mantém o
  trecho dos dois em sincronia, o resto da cópia continua à mão). Sai o `LESSON_VOCAB_MAP` feito à mão e a regex no id.
  Aposentado fica fora do mapa; `released` passa sempre (espelho do cliente); "Na frase" nunca contou e continua fora.
  Diferença de propósito: id de palavra que não existe mais no conteúdo (órfão) a v25 contava se a unidade do id estivesse
  concluída; agora não conta (igual à tela Revisão, que manda o órfão para o arquivo). Idioma sem mapa (`portugues`, sem trilha
  publicada): cartão da trilha não conta; ao publicar a trilha do pt, acrescentar o idioma em `LANGS` do gerador.
- **Regra 2.10** (`openUnitsBeforeOpenOnes`, `shared/trail-state-model.js`, pura): unidade fica aberta se alguma unidade depois
  dela no mesmo nível já está aberta (junto com `recalcUnlocked`: 1ª do nível ou anterior concluída). Só abre; não conclui,
  não começa, não mexe em lição. Chamada em `applySerializedState` do fr; o zh não chama.
- **Course Deck de unidade que saiu** (`deckBrowserUnitVisible`, `shared/deck-browser.js`): escondido mesmo com progresso
  antigo no save; nada é apagado no banco.

## Testes

Novos em `tests/curriculo-ids/`: `test_cron_mapa.js` (29: trecho em dia nos 2 arquivos, 696 comparações antes x depois iguais
com a cópia congelada `cron_v25_referencia.js` sobre os saves simulados do fr e um do zh, em 3 datas, save cru, formato antigo
e ida e volta; cron = cliente; conteúdo v2 de teste), `test_unidade_nova.js` (38), `test_deck_unidade_excluida.js` (9),
`test_playwright_0b.js` (23, navegador: fr claro/escuro com duas unidades inseridas, deck escondido, zh claro/escuro).
Ajustados de propósito: `k2b/test_cron_dedup.js` (recorte começa no mapa gerado), `trilha/test_a0_eligibility.js` (espelho do
servidor recebe a entrada do mapa; +1 checagem de `released`), `fase-e/harness.js` (carrega `shared/trail-state-model.js` e
extrai `trailGroups`/`unitsOfLevel`, que o `applySerializedState` do fr agora usa).
Capturas antes x depois (tests/e4): 18 de 18 iguais. Bateria completa: ver o relatório da entrega.

## Para a dona decidir

- Unidade nova aberta atrás do aluno vira a unidade "atual" da trilha (o "Continuar" aponta para ela), porque a regra de
  06/10 é "a 1ª não concluída em ordem". Não tranca nada; se a dona preferir que o "Continuar" siga onde o aluno estava,
  é uma mudança pequena em `currentTrailUnit`.

## Passo manual pendente

Deploy do `notification-cron` (o mapa só vale em produção depois dele): ver o relatório da entrega e `docs/deploy/`.
