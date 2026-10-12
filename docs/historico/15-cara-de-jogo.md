# Histórico: cara de jogo (identidade visual gamificada)

Pedido da autora (2026-10-12), depois da auditoria da aba Perfil > Amigos: o visual parecia "documento do Word",
com escrita em formato de tabela, pouca hierarquia e nada divertido. Ela quer a "cara de jogo" no site todo.
A maquete aprovada como direção é o artifact "Amigos com cara de jogo" (claude.ai/artifact/5823d1MdcerBBw7Pjo9xkn).

## Ordem combinada

1. Fonte Nunito de verdade e bug do título da atividade de Amigos. **Feito.**
2. Base visual compartilhada: botão com volume e títulos sem caixa alta **(feito)**; cartão, estado vazio e selo
   entram junto com a primeira tela que usar cada um (passo 3).
3. Aba Amigos redesenhada conforme a maquete (fecha os achados da auditoria). **Feito.**
4. Outras telas: Perfil (Visão geral, Metas, Progresso) e Ranking (estética antiga); Configurações (metade);
   ajuste fino em Desafios, Revisão e Trilha.
5. Dados novos: sequência e idioma por amigo no `friends_leaderboard` (migration), sequência como evento na
   atividade, botão "Parabenizar" (proposta: grátis).

Grátis x Premium: passos 1 a 4 são visuais, tudo grátis.

## Passos 1 e 2 (commit ab4fb8d, 2026-10-12)

- Causa do "visual de Word": `@font-face{ src: local('Nunito') }` só usava a Nunito se estivesse instalada no
  aparelho; quase todos caíam em Arial/Segoe. Agora `fr/index.html`, `zh/index.html` e `index.html` carregam a
  Nunito (400 a 900) do Google Fonts com `display=swap`. O Service Worker ignora outra origem, então offline fica a
  fonte do sistema. Hanzi continua na fonte CJK do sistema (a Nunito não tem esses caracteres).
- Botões: `.btn-primary`/`.btn-gold` ganham sombra sólida embaixo `color-mix(in srgb, <cor> 62-65%, #000)`
  (com fallback rgba antes), `.btn-secondary` usa `--paper-line`; ao apertar o botão desce 2px. Tokens
  `--btn-depth` (4px) e `--btn-depth-sm` (3px); `.btn-sm` (só fr) usa 3px/2px. Raio 14px.
- Títulos: `.section-label`, `.side-card-title`, `#side-missions-body .dcs-caption` e `.module-label .ml-text` (só
  fr) viraram frase normal, 15px, peso 900, `--ink`. Usam `--font-body`, porque no zh `--font-display` é serifada.
  Etiquetas pequenas ("COMECE POR AQUI", "GRAMÁTICA", cabeçalhos de tabela admin) ficaram em caixa alta de propósito;
  revisar tela a tela no passo 4.
- Bug: a section da atividade de Amigos e o div interno tinham o id `friends-activity`; o loader sobrescrevia a
  section e apagava o título. A section virou `friends-activity-section`.
- Validação: prints antes/depois em fr claro/escuro/celular, zh claro/escuro (Amigos, Trilha, Revisão,
  Configurações, Perfil). O "antes" foi simulado com Arimo, porque o sandbox tem a Nunito instalada.
- Regressão Playwright: amigos 158/158, revisao-ajustes 48/48, deck-browser 206/206, desafios-conclusao 19/19,
  desafios-modulo 75/75, placeholders 45/45, ditado 58/58, checkpoint-zh 25/25. i18n trava em
  `triggerWouldGenerate` (`#flashcard-limit-modal`), igual sem as mudanças (pré-existente, não investigado).

## Passo 3: aba Amigos (2026-10-12)

Só tela, com os dados que já existiam (sem migration). Grátis x Premium: tudo grátis.

- Ordem nova em `renderFriendsView` (`shared/friends.js`): título "Amigos" + botão "＋ Convidar amigos" (um botão só:
  `navigator.share` quando existe, senão copia o link); pedidos recebidos num cartão em destaque ("N pessoas querem
  estudar com você", botões Aceitar e "Agora não", que continua sendo o `respond_friend_request(false)`); "Disputa da
  semana" (prazo, seletor de idioma, pódio 2º/1º/3º, barra "Faltam X XP para você passar Fulano", conquistas recentes e
  "Ver ranking completo"); "Seus amigos (N)" em cartões com o XP da semana e menu ⋯ ("Ver perfil", "Desfazer
  amizade"), com os pedidos enviados como cartão tracejado na mesma grade e a busca ao lado do título.
- "Faltam X XP" = XP de quem está logo acima - meu XP + 1 (passar, não empatar). Líder vê a vantagem sobre o 2º;
  empate no topo e semana zerada têm frase própria.
- Sem amigos: o estado vazio vira convite (título, botão de convidar, busca e 3 motivos). Os pedidos enviados aparecem
  abaixo dele.
- Preferências de Amigos (`friend_settings`) saíram da aba e foram para Configurações > Notificações, seção "Amigos"
  (`renderNotificationPreferencesView` chama `loadFriendsPrefs`).
- Cores do pódio: tokens `--medal-gold/-silver/-bronze` e `--on-medal` nos 3 blocos de tema de fr e zh. O cartão de
  pedidos usa `color-mix` de `--imperial-gold` (rosa no fr, dourado no zh).
- i18n: 21 chaves novas em pt-BR e en; 12 chaves sem uso removidas dos dois (seções antigas, convite em dois botões).
- `tests/i18n/test_i18n_unit.js`: a comparação do HTML com o commit de referência ganhou o normalizador `gameLook`
  (Nunito, botões, títulos e tokens de medalha). O commit dos passos 1 e 2 tinha deixado 2 falhas nesse teste, que a
  regressão daquela entrega não rodou; corrigidas aqui (incluindo uma linha em branco a mais que a troca do `@font-face`
  deixou no fr e no zh).
- Testes: amigos 182/182 (eram 158; seletores atualizados para cartões e menu, mais verificações de menu ⋯, pódio,
  barra, prazo, estado vazio e preferências em Configurações); i18n unit 2039/2039; placeholders 45/45;
  revisao-ajustes 48/48; desafios-conclusao 19/19; checkpoint-zh 25/25; ditado 58/58; i18n
  ui_language_first_access 20/20, persistence 39/39, badges 12/12. `test_ui_language_confirm_browser` 15/16, com a
  mesma falha sem as mudanças (pré-existente).
- No teste, `navigator.serviceWorker.ready` nunca resolve (SW bloqueado), e a aba Notificações ficava carregando: o
  teste troca `getLocalPushSubscription` por uma que devolve null. Em produção isso não acontece.
- Validação visual: fr/zh × claro/escuro, celular com e sem amigos, menu aberto, Configurações > Notificações.
