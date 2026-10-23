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
   ajuste fino em Desafios, Revisão e Trilha. **Feito.**
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

## Passo 4: outras telas (2026-10-12)

Só tela e texto, sem migration. Grátis x Premium: tudo grátis.

- CSS novo num bloco único no fim do `<style>` de fr e zh: `/* ---------- Cara de jogo: telas` até
  `/* ---------- fim: cara de jogo, telas`. Sobrescreve as regras antigas de cada tela sem reescrevê-las (próximas
  telas entram nesse bloco). O teste de i18n já ignora tudo do bloco dos Painéis até o `</style>`.
- Ranking completo (`shared/leaderboard.js`): prazo em pílula, cartão com pódio dos 3 primeiros e "Faltam X XP"
  acima da lista (a lista completa continua embaixo), linha "você" com fundo claro e contorno da cor da marca (antes:
  fundo cheio azul/vermelho), XP em pílula. Pódio clicável abre o perfil, como as linhas.
- Pódio e barra viraram genéricos em `leaderboard.js` (`leaderboardPodiumHTML`, `leaderboardDuelHTML`, classes `lb-*`);
  Perfil > Amigos passou a usar os mesmos. Os textos continuam com as chaves `friends.*` (nasceram em Amigos).
- Perfil > Visão geral (`shared/profile.js`): identidade num cartão com faixa de cor e anel no avatar, "Editar perfil"
  com volume, barra do idioma mais grossa, sequência e XP em blocos com ícone (rótulos sem caixa alta). Sem nenhuma
  conquista, as 4 primeiras aparecem bloqueadas (tocar mostra como ganhar).
- Conquistas (Perfil e Progresso): bloqueadas em cinza com cadeado e borda tracejada (antes: só transparência);
  ganhas com borda e "volume" na cor de destaque.
- Progresso: cada número ganhou ícone (`data-stat` novo em unidades, palavras, sequência, revisões e XP, em fr e zh).
- Metas: sem meta, um alvo grande acima de "Definir minha meta"; rótulos sem caixa alta.
- Desafios, Revisão e Trilha: cartões clicáveis com a mesma borda de baixo dos botões.
- Configurações > Notificações: 6 textos sem "--" nem "pra" (regra do projeto). Lista `GAME_PASS_KEYS` no teste de i18n.
- zh não definia `--error-red` (usado no selo "+N", na opção errada e em apagar Deck): o selo de pedidos aparecia sem
  fundo. Token criado nos 3 blocos de tema do zh com os valores do fr.
- Testes: amigos 182/182, i18n unit 2033/2033 (6 a menos porque os textos reescritos saem da comparação com o texto
  antigo), k2e 28/28, k7 40/40, revisao-ajustes 48/48, deck-browser 206/206, desafios-conclusao 19/19,
  desafios-modulo 75/75, placeholders 45/45, checkpoint-zh 25/25, ditado 58/58, fase-public-deck 152 ok, trilha
  (mobile_shell 108, trail_map 61, review_milestone_ui 34, skip_checkpoint_ui 19) sem falhas. desafios-progresso 22/23:
  "barra existe" falha igual na main (a barra do cartão de categoria foi escondida numa passada de design anterior;
  pré-existente).
- Validação visual: Perfil, Metas, Progresso, Ranking, Desafios, Revisão, Trilha e Configurações em fr claro/escuro,
  celular e zh claro/escuro.

## Passo 5a: foguinho, marcos de sequência, Parabenizar e Agradecer (2026-10-13)

Decisões da autora: marcos 5, 10, 15, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350 e 365 dias; reações fixas
🎉 👏 💪 ❤️ com botão de agradecer ("mostrar que o parabéns não foi ignorado"); conquistas (badges) ficam SEM
parabéns até a autora definir o critério das conquistas (análise em `docs/conquistas-analise.md`, pausado); tudo grátis.

- Migration **086** (`shared/supabase_migrations/086_friends_streak_milestones_and_congrats.sql`). Número 086 porque
  078 a 085 já foram usados por outras conversas no Staging (080 aparece duas vezes lá). Sem DROP, sem mudar assinatura.
  - `_account_streak` (interna): mesma leitura de sequência da 075 (`data._account`, ou o idioma com
    `lastStudyDay` mais novo); zera se o último dia foi antes de ontem (Brasília).
  - `friends_extras()`: sequência, "estudou hoje" e idiomas (bandeiras) de você + amigos.
  - `streak_milestones` + `record_streak_milestone(p_streak, p_last_day)`: registra só o MAIOR marco ainda não
    registrado na sequência atual (quem já tinha 40 dias não gera 5 avisos). O site chama em `registerStudyToday`.
  - `friend_congrats` + `congratulate_friend`: só amigo aceito, marco dos últimos 7 dias, 1 por pessoa por marco
    (tocar de novo troca a reação), até 20 por dia; aviso agrupado no sino ("Fulana e mais 2 amigos parabenizaram você").
  - `thank_friend_congrats`: só quem recebeu, uma vez; avisa quem mandou ("Fulano agradeceu seu parabéns 💛").
  - `friends_streak_feed`, `my_received_congrats`; `friend_settings.notify_congrats` (Configurações > Notificações > Amigos).
  - Privacidade: amigos veem a sequência mesmo de perfil privado, mesma regra do perfil privado em construção
    (080_private_profile no Staging: amigos aceitos veem o perfil completo).
- Site (`shared/friends.js`): foguinho 🔥N no avatar (cartões e pódio) com anel quando estudou hoje, bandeiras (SVG de
  `AVAILABLE_LANGUAGES`) no cartão, atividade com marcos de sequência + conquistas dos últimos 7 dias (antes 30),
  botão "👏 Parabenizar" com as 4 reações, "Você reagiu 💪", contagem e "Fulano agradeceu 💛"; cartão "Parabéns para
  você" com "Agradecer 💛". 17 chaves i18n novas (pt-BR e en).
- Aplicada no **Staging** (`ilfjzizjfcmhibkhwber`) em 2026-10-13, mais o ajuste `086b` (search_path fixo em
  `_congrats_target_label`, já incluído no arquivo). Conferido: tabelas com RLS e sem acesso direto, anon sem
  execução, funções internas fechadas, `_friends_notify` era idêntica à da 074 nos dois ambientes antes da troca.
  **Produção: aplicada em 2026-10-13 com autorização da autora** (versão do arquivo, já com o ajuste do search_path;
  conferido antes: `_friends_notify` idêntica à da 074, tabelas novas inexistentes; depois: RLS, grants e advisors iguais
  ao Staging, a linha existente de `friend_settings` intacta).
- Testes: banco local 124/124 (80 antigos + 44 da 086: amigo/não amigo, perfil privado, sequência quebrada,
  maior marco, reação trocada, aviso agrupado, agradecer só uma vez, limite diário, sem acesso direto, progress
  intacto); Playwright amigos 210/210 (eram 182); i18n unit 2033/2033; k2e 28/28; revisao-ajustes 48/48;
  checkpoint-zh 25/25; ditado 58/58; placeholders 45/45; desafios-conclusao 19/19; trilha mobile_shell 108,
  review_milestone_ui 34. O Postgres local de teste foi recriado neste container (initdb em /tmp/pgdata, porta 54329).

## Janela "Minha meta de estudo" sem estilo no zh (2026-10-23)
- Achado da autora: no chinês, os passos "Que nível você quer alcançar?" e "Quantas lições por dia" mostravam botões cinza
  do navegador. Causa: `shared/wizard.js` usa `.wizard-level-*`, que só existia no `fr/index.html` (o zh nunca teve o bloco).
  Correção: o mesmo bloco copiado para o `zh/index.html` (só tokens que o zh já tem; círculo ativo com `--brand-fill`).
- Teste novo `tests/metas-wizard/test_playwright.js` 18/18 (fr e zh, claro/escuro, 390px); sem a correção dá 12/18.
  `tests/cores-marca` 20/20, 6/6, 26/26.
