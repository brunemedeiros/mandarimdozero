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

## Em aberto (perguntado à autora em 2026-11-06)

- Regra de "Concluído": proposta da autora = todas as frases do jogo respondidas + 70% de acerto. Recomendação:
  contar entre partidas (a próxima partida puxa primeiro as frases ainda não vistas), 70% sobre a ÚLTIMA resposta de
  cada frase ("Não sei" = erro). Aguardando confirmação.
- Formato do "Revisar erros" (na hora, no fim da partida, ou guardado para voltar depois como nos Desafios).
- Peças do artifact de jogos de português (https://claude.ai/artifact/Qrg6nH8zG1mdaDLFK9adLX) a reaproveitar.

## Etapas (cada uma mostrada à autora antes da seguinte)

1. **Feita (2026-11-06, aguarda a autora ver)**: progresso de cada jogo salvo na conta, sem mudança visual.
   `STATE.conjGames` (fr/app.js) = `{ gameId: { items: { itemId: { ok, at } }, rounds } }`: última resposta de cada frase
   ("Não sei" = erro), dia, partidas terminadas; vai no `serializeState` e volta por `mergeConjGamesState`
   (shared/core/estado-salvar.js; vence o dia mais recente, nada é apagado). Funções em shared/conj-games.js:
   `recordConjGameAnswer`, `finishConjGameRound`, `conjGameStatus` (vistas, acertos, %, concluído com
   `CONJ_GAME_DONE_PCT = 70`), `conjGamesSummary` (painel do topo). Sair no meio guarda as respostas. Recomeçar o curso
   já zera (a RPC 123 só copia campos fixos) e agora lista "Jogos da Conjugação". Teste `tests/jogos-progresso/` 42/42.
2. Lista no visual das Expressões: painel no topo, grupos por nível, selo de concluído, tema.
3. Filtro Todos / Pendentes / Concluídos.
4. Grátis x Premium no fim do grupo.
5. Resultado com erros e "Revisar erros".
