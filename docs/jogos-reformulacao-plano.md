# Reformulação da lista dos Jogos da Conjugação (plano, 2026-11-06)

Pedido da autora: lista dos Jogos no padrão visual da lista de Expressões (Desafios), com ideias de organização da
lingua.com (painel de progresso, cartões com status, Premium no fim de cada grupo). Nada implementado ainda.

## Diagnóstico (resumo)

- Jogos: aba Conjugação > Jogos. Motor `shared/conj-games.js`, abas e trava em `shared/conjugacao.js:525-562`, dados em
  `fr/conj-games.js` (4 jogos: `etre-avoir`, `pc-auxiliaire`, `tu-vous` A1; `pc-imparfait` A2; 82 frases, 10 por partida).
  Lista plana, sem filtro, sem progresso salvo por jogo (só conta o dia da sequência), sem XP (decisão de 2026-10-26).
- Expressões: `shared/desafios-telas.js:448-628` + `shared/desafios.css`. Têm contador "X de Y concluídos", grupos por
  nível recolhíveis com anel, filtros Todas/Pendentes/Concluídas, busca, cartão estilo álbum (concluída com selo),
  progresso salvo em `STATE.completedChallenges`, "🔁 Revisar erros" com revisão espaçada.

## Decisões da autora (2026-11-06)

1. Lugar: os Jogos continuam SÓ dentro da Conjugação.
2. Sem destaque/"Comece por estes"; sem filtros de tema e de "novos". Filtro só Todos / Pendentes / Concluídos.
3. Topo: "X de Y jogos concluídos" com a barra das Expressões + total de acertos. Sem XP. Salvo na conta.
4. Grupos por nível, recolhíveis, com anel (peça das Expressões). Cartão: título (francês em azul), frase curta, selo de
   nível, etiqueta de tema. Só o concluído ganha selo (como nas Expressões); o pendente fica com o visual de pendente,
   sem texto "Não jogado".
5. Grátis: 1 jogo por nível (A1 `etre-avoir`, A2 `pc-imparfait`). Os outros são Premium e ficam no fim de cada grupo, com
   o convite "⭐ Premium: mais N jogos · Fale com a Prof. Brune" (abre `premium-games-modal`). Regra 7 continua: cadeado
   só com o bloqueio ligado. Plano futuro: criar jogos para ter sempre 1 grátis em cada nível.
6. "Assinar" de verdade só depois do paywall: pendência 12 em `docs/historico/14-pendencias-pos-paywall-e-decks.md`.
7. "Recomeçar o curso" zera o progresso dos jogos (como zera os Desafios).
8. Resultado da partida mostra os erros com a opção "Revisar erros", no espírito do Banco de Revisão (formato a confirmar).
9. Jogos de vocabulário e de preposições não entram na Conjugação; se vierem, serão em Desafios (assunto separado).
10. Banco de dados: sem tabela nova e sem migration; o progresso vai dentro do `progress.data` que já existe.

## Decisões da autora (2026-11-06, 2ª rodada)

- Filtro: Todos / Pendentes / Concluídos.
- Do artifact de português entra TUDO nesta reformulação, menos os jogos de português: etapas na partida (Escolha,
  Escreva, Corrija o erro, Traduza), revisão escrevendo, rodada Completa x Curta, frase de exemplo no cartão, jogo de
  revisão do nível, cartões "em breve", desenhos novos e respostas alternativas. Objetivo: melhorar os jogos existentes,
  o visual, e já preparar jogos novos.

## Decisões da autora (2026-11-06, 3ª rodada)

- Concluído: todas as frases do jogo respondidas, somando as partidas (a próxima partida puxa primeiro as não vistas), e
  70% pela ÚLTIMA resposta de cada frase ("Não sei" = erro). Já é o que a etapa 1 calcula.
- "Revisar erros": as duas formas (na hora, no fim da partida, escrevendo a resposta; e guardado para voltar em outro dia,
  como nos Desafios).
- Sem desenhos novos de linha do tempo nos Jogos (o `pc-imparfait` mantém os 2 que já tem).
- Ordem das etapas: a da tabela abaixo.

## Jogos novos (a partir de `docs/i18n/curriculo/04-v1-lacunas-e-propostas-fr.md`, seção 2.2 e J6) -- lista APROVADA pela autora em 2026-11-07

Todos no formato atual (duas formas para a lacuna) + as etapas novas. Só verbos (vocabulário e preposições ficam para Desafios).
Grátis: 1 por nível. Cada jogo novo: ~20 frases em pt-BR e en, revisor-conteudo, aprovação da autora antes de publicar.

| Nível | id proposto | Jogo | Treina (item do currículo) | Grátis? |
|---|---|---|---|---|
| A1 | `present-futur-proche` | Agora ou depois? | présent x futur proche (G28) | Premium |
| A1 | `participe-passe` | Qual é o particípio? | particípio irregular x forma inventada (*pris* x *prendu*; G30) | Premium |
| A1 | `revisao-a1` | Revisão A1 | mistura dos jogos A1 (ideia do artifact) | Premium |
| A2 | `accord-etre` | Allé ou allée? | concordância do particípio com *être* (G31, A2) | Premium |
| A2 | `futur-conditionnel` | Futur ou conditionnel? | *j'aimerai* x *j'aimerais* (G39, G43) | Premium |
| A2 | `futur-simple-proche` | Futur simple ou futur proche? | G39 x G28 | Premium |
| A2 | `revisao-a2` | Revisão A2 | mistura dos jogos A2 | Premium |
| B1 | `indicatif-subjonctif` | Indicatif ou subjonctif? | *il faut que*, *je pense que* x *je ne pense pas que* | **Grátis** |
| B1 | `pqp-passe-compose` | Plus-que-parfait ou passé composé? | anterioridade no passado | Premium |
| B1 | `si-hypothese` | Se eu tivesse... (*si* + imparfait / conditionnel) | frases com *si* | Premium |

## Etapas (cada uma mostrada à autora antes da seguinte)

1. **Feita (2026-11-06, aguarda a autora ver)**: progresso de cada jogo salvo na conta, sem mudança visual.
   `STATE.conjGames` (fr/app.js) = `{ gameId: { items: { itemId: { ok, at } }, rounds } }`: última resposta de cada frase
   ("Não sei" = erro), dia, partidas terminadas; vai no `serializeState` e volta por `mergeConjGamesState`
   (shared/core/estado-salvar.js; vence o dia mais recente, nada é apagado). Funções em shared/conj-games.js:
   `recordConjGameAnswer`, `finishConjGameRound`, `conjGameStatus` (vistas, acertos, %, concluído com
   `CONJ_GAME_DONE_PCT = 70`), `conjGamesSummary` (painel do topo). Sair no meio guarda as respostas. Recomeçar o curso
   já zera (a RPC 123 só copia campos fixos) e agora lista "Jogos da Conjugação". Teste `tests/jogos-progresso/` 42/42.
2. **Feita (2026-11-07, aguarda a autora ver)**: lista no padrão das Expressões, desenhada em `renderList`
   (shared/conj-games.js) com as peças de shared/desafios.css (`.challenge-progress`, `.challenges-level-*`,
   `.challenge-card.expr-card`, `.expr-card-seal`, `.expr-reg`); o próprio do cartão de jogo em shared/conjugacao.css. Painel
   "X de Y jogos concluídos" + barra + acertos; grupos por nível recolhíveis com anel; cartão com título, frase de exemplo
   (`sample`) com as duas opções, apresentação em 2 linhas, tema (`theme`) e "⭐ Premium" só nos não grátis (`free`);
   concluído com selo "✓ Concluído · N%". `isConjGameLocked(g)` nunca trava jogo `free`. Site com Jogos precisa carregar
   shared/desafios.css (o fr carrega). Testes: jogos-progresso 60/60, conjugacao 82/82 (checks de Premium atualizados:
   pc-imparfait virou grátis), paridade da Conjugação 343/343 (conteúdo da lista fora da comparação nas duas árvores).
3. Filtros Todos / Pendentes / Concluídos, Premium no fim de cada grupo, cartões "em breve" (aprovados: Agora ou depois? A1,
   Futur ou conditionnel? A2, Indicatif ou subjonctif? B1).
4. Resultado com os erros + "Revisar erros" escrevendo (na hora) e guardado para outro dia.
5. Rodada Completa x Curta; a partida puxa primeiro as frases ainda não vistas.
6. Etapa "Escreva a resposta" dentro da partida.
7. Etapas "Corrija o erro" e "Traduza a frase inteira" (conteúdo novo, revisão e aprovação).
8. Jogos de revisão do nível e respostas alternativas.
