# Relatório do piloto automático — 07/10/2026

## Resumo
A aba Revisão agora segue a Proposta A com as partes da B que você escolheu. No topo fica o total de hoje (Novo, Aprendendo e Revisar) e os botões "⏱ 5 minutos" e "Estudar tudo (N)". Os modos mostram seus recordes. Embaixo deles fica "Sua semana de revisão", com a meta de 5 dias. Dentro de cada Deck há a barra de força da memória. O 🔥 de dias seguidos continua no topo. Tudo foi testado, commitado e enviado para a branch `claude/fervent-noether-9f1ya7`. Nada foi publicado no site e nada mudou no banco.

**Critério de "pronto" que usei:** as 5 partes funcionando em francês e chinês, nos temas claro e escuro e no celular. Os testes novos e os antigos passando, e um revisor independente sem achar problema aberto.

## Decisões que tomei por você
1. **Recorde do Speed Review em pontos, não em segundos.** O mockup dizia "41 s", mas o Speed Review mede pontos (cada cartão tem seu próprio relógio, não existe um tempo total). Por isso o recorde é "Seu recorde: N pts". O Combinar mede segundos e ficou "Seu recorde: N s". Como reverter: trocar o texto em `renderReviewModeSelect` (fr/zh `app.js`) e passar a medir o tempo total da rodada.
2. **Números da tabela centralizados.** O mockup da Proposta A alinhava à direita, mas antes você tinha pedido centralizado. Mantive o seu pedido. Como reverter: uma linha de CSS em `.deck-table-num`.
3. **Sessão de 5 minutos.** Ela usa a mesma fila de "Estudar tudo", com os cartões já estudados primeiro (os mais errados, depois os mais atrasados) e as palavras novas por último. A fila é cortada quando o seu tempo médio por cartão soma 5 minutos. Até você ter 10 cartões revisados, uso 10 segundos por cartão. Não há um cronômetro que interrompe no meio. Como reverter ou mudar: as constantes ficam no topo de `shared/review-extras.js`.
4. **Meta fixa em 5 dias.** Ainda não dá para mudar a meta em "Configurar". Se quiser, entra como uma opção lá.
5. **Barra de força da memória azul também no chinês.** A cor da marca do chinês é vermelha, mas o vermelho já significa "Aprendendo" na tabela. Por isso usei azul nos dois sites. Como reverter: as cores `--mem-*` no `index.html` de cada site.
6. **Dica antiga removida.** O texto "Speed Review usa a sessão de hoje..." que ficava acima dos modos saiu, como no mockup.
7. **Previsão de palavras novas por dia.** Nos dias que vêm, a barra azul assume que você vai aprender o limite de "Novas palavras por dia" enquanto houver palavras novas liberadas. É uma estimativa.

## Pendências que precisam de você
- **Publicar:** o código está só na branch. Ele vai para o site quando você pedir o PR ou o merge.
- Nenhuma migration, nenhum custo e nenhuma ação irreversível.

## O que foi alterado
- Novo: `shared/review-extras.js`. Concentra a semana, a meta, a estimativa de tempo, a fila de 5 minutos, os recordes e a força da memória.
- `fr/app.js` e `zh/app.js` (iguais nos dois):
  - faixa do topo;
  - botão de 5 minutos;
  - recordes ao fim do Speed Review e do Combinar;
  - tempo médio das sessões;
  - progresso salvo com `reviewRecords` e `reviewTimeStats`.
- `fr/index.html` e `zh/index.html`: nova ordem da tela (faixa → tabela → modos → semana) e estilos.
- `shared/deck-browser.js`: barra de força da memória na tela do Deck.
- Testes:
  - novo `tests/revisao-proposta-a/test_playwright.js` (56 verificações);
  - `tests/deck-browser/test_playwright.js` (2 verificações atualizadas para o desenho novo).
- `CLAUDE.md`: seção "Revisão -- Proposta A + partes da B".
- Commit `b2e973c`, já enviado.

## Problemas encontrados
- A primeira versão deixava "5 minutos" e "Estudar tudo" numa segunda linha no computador. Ajustei a largura dos botões e agora ficam ao lado das contagens.
- O revisor independente achou que as sessões de "Palavras difíceis" não marcavam a hora de início. Isso podia distorcer a média de tempo. Ele corrigiu.
- Duas verificações antigas falharam porque conferiam o desenho anterior (botão embaixo da tabela, sem contagens no topo). Atualizei as duas para o desenho novo.
- O teste K2-H continua com as mesmas 2 falhas que já existiam antes deste trabalho. Não têm relação com esta mudança.

## Testes
Todos passando:

| Teste | Resultado |
|---|---|
| Proposta A (novo) | 56/56 |
| Deck browser | 206/206 |
| Ajustes da Revisão | 48/48 |
| K1 | 30/30 |
| Tags da trilha | 28/28 |
| Fase H | 68/68 |
| Plano admin | 26/26 |
| Fase E | 38/38 |
| Fase F | 50/50 |
| Fase I | 48/48 |
| K6 | 28/28 |
| K2-C a K2-G | todos ok |
| K3 | 20/20 |
| K5 | 18/18 |
| Limite | 26/26 |

## Divisão do trabalho
- Eu (orquestrador): planejamento, código, testes e capturas de tela.
- 1 subagente opus: verificação independente do código e dos testes, com uma correção pequena.

## Ajustes depois da sua resposta (07/10/2026)
- **Estimativa removida:** o "cerca de N min" saiu do topo.
- **Tempo no Speed Review:** o recorde agora mostra pontos e tempo, por exemplo "Seu recorde: 30 pts · 41 s".
  - O tempo é o tempo total da rodada (você preferiu ao tempo médio por palavra).
  - Só conta rodada completa: todas as palavras respondidas, sem perder as 3 vidas, com pelo menos 5 palavras.
  - Testes: Proposta A 58/58, Deck browser 206/206, Ajustes 48/48, K1 30/30, K3 20/20, K5 18/18, K6 28/28.
