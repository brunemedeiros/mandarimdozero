# 19 -- Amigos em dupla: sequência com amigo, cutucar e missão em dupla (2026-10-15)

Pedido da autora: "pode fazer todos eles" (2026-10-15), sobre os três itens aprovados em 2026-10-14 em
`docs/amigos-seguir-x-amizade.md` (seção 3). "Seguir" só para contas oficiais continua fora (só se um dia fizer sentido).

**Grátis x Premium:** tudo grátis.

## O que entrou

- **Sequência com amigo**: chip "🤝 12 dias juntos" no cartão do amigo (Perfil > Amigos), a partir de 2 dias.
  - É automática entre amigos aceitos, sem convite.
  - Conta os dias seguidos em que os dois estudaram: a interseção das duas sequências atuais (`_account_streak`, 086).
  - Não precisa de tabela nova nem de histórico.
- **Cutucar**: botão "👋 Cutucar" no cartão do amigo que ainda não estudou hoje.
  - Limites: 1 por amigo por dia e 20 por dia.
  - Quem recebe ganha um aviso no sino. Se os dois têm sequência juntos, o aviso cita os dias
    ("estude hoje para manter os 12 dias seguidos de vocês").
  - Vários amigos no mesmo dia viram um aviso só ("Bia e mais 2 amigos cutucaram você").
  - Depois de cutucar, o botão vira "Cutucado".
  - Quem não quer receber desliga "Receber cutucadas dos amigos" em Configurações > Notificações > Amigos. Aí o botão
    nem aparece para os amigos.
- **Missão em dupla**: cartão no topo da aba Amigos.
  - Sem missão: escolher o amigo e a meta (150, 300 ou 600 XP; padrão 300) e tocar em "Começar missão".
  - Com missão: barra com a parte de cada um, "180 de 300 XP" e "Termina em N dias".
  - Uma missão por pessoa por semana (segunda a domingo, horário de Brasília). Quem já está em missão não aparece na
    lista.
  - Começa na hora e o amigo recebe aviso ("Bia chamou você para uma missão em dupla: 300 XP juntos até domingo 🤝").
  - Só conta o XP feito depois de começar (o XP de cada um no início fica gravado). Vale o XP de todos os idiomas.
  - Cumprida: aviso para os dois e +1 na conquista nova **Missões em Dupla**. Quem confere é um gatilho em `weekly_xp`,
    a cada XP salvo; ele nunca impede o XP de ser salvo.
  - Se a amizade acabar antes de cumprir, a missão é desfeita e os dois ficam livres.
  - Desligar avisos: "Avisar sobre missões em dupla".
- **Conquista Missões em Dupla** (trilha `duo`, da conta, ícone 🫶): metas 1, 5 e 15 missões.
  - Nomes: Dupla Dinâmica, Parceria de Peso, Dupla Imbatível. Em inglês: Dynamic Duo, Power Partnership, Unbeatable Duo.
  - Ouro e máximo recebem Parabéns como as outras.

## Decisões tomadas na implementação (a autora pode mudar)

| Pergunta | Escolha | Por quê | Como mudar |
|---|---|---|---|
| Missão precisa de aceite do amigo? | Não, começa na hora | Já são amigos; menos atrito (o Duolingo também não pede) | Novo status `invited` + botão Aceitar |
| Quem forma a dupla? | Quem chama escolhe o amigo | Mais simples que sortear; o aluno chama quem conhece | Sorteio semanal automático |
| Metas | 150 / 300 / 600 XP | XP semanal mediano por pessoa na produção: 140 a 360 (set-out/2026) | `check` da tabela + `FRIENDS_DUO_GOALS` |
| XP de antes de começar conta? | Não | Senão quem começa no sábado com 400 XP cumpre na hora | Zerar `base_a/base_b` |
| Sequência com amigo precisa de convite? | Não | Amigos já veem a sequência um do outro (086) | Tabela de pares com aceite |
| Chip a partir de quantos dias? | 2 | "1 dia juntos" não diz nada | `FRIENDS_JOINT_MIN` |
| Recompensa | Conquista Missões em Dupla (1, 5, 15) | Não mexe no XP do ranking | Metas em `badge-tracks.js` |

## Correções pedidas pela autora na mesma entrega (2026-10-15)

1. **"Site em inglês não deve ter nada em português."** Todos os avisos de Amigos são escritos no idioma do site de
   quem recebe (`progress.data._meta.uiLanguage`, função `_ui_lang`), num lugar só (`_friends_msg`). Vale para os
   novos e também para os antigos: pedido, aceite, "te passou no ranking", parabéns e obrigado.
   - `respond_friend_request` (da 073) não foi recriada, porque tem um DELETE e a ferramenta de migration trava
     esperando confirmação. O texto pronto em português que ela manda passa pela `_friends_notify`, que reconhece o
     final da frase e reescreve no idioma de quem recebe.
   - Mural (`_mural_notify`, 087) e convite da professora (`_teacher_notify`, 077): corrigidos depois, na 104 (seção
     abaixo).
2. **"O aviso tem de chegar a quem NÃO abriu o app."** Cada aviso de Amigos também vai para a fila `push_outbox`, e o
   banco chama na hora (pg_net) a Edge Function nova `push-dispatch`, que manda o push para os aparelhos da pessoa.
   - Recebe quem ativou notificações no aparelho (Configurações > Notificações > Push).
   - Amigos ganhou a coluna Push na matriz de Configurações, ligada por padrão; Amigos continua sem e-mail.
   - Respeita o horário silencioso, em hora de Brasília.
   - Na produção, em 2026-10-15, só 1 aparelho tinha push ativado: o da autora. Os alunos precisam ativar o push
     para receber fora do site.

## Banco: migration `102_friends_duo.sql`

- **Número:** era 100, virou 101 e por fim **102**. A 100 (`100_review_bank_agent_other_students`) e a 101
  (`101_class_schedule`) foram pegas por outras conversas enquanto esta era feita.
- **Colunas novas** em `friend_settings`: `accept_nudges` e `notify_missions` (ligadas por padrão).
- **Tabelas novas** (sem policy, só pelas funções): `friend_nudges`, `duo_missions`, `duo_mission_members` e `push_outbox`.
  A chave de `duo_mission_members` garante uma missão por pessoa por semana.
- **Funções:**
  - públicas: `friends_duo`, `nudge_friend`, `start_duo_mission`, `my_duo_mission`, `my_duo_missions_done`;
  - só da service role: `push_outbox_claim` (usada pela `push-dispatch`);
  - internas: `_are_friends`, `_joint_streak`, `_week_xp`, `_duo_check`, `_ui_lang`, `_friends_msg`,
    `_friends_notify_msg`, `_friends_push`, `_push_kick`, `_push_secret`.
- **Recriadas, iguais às da produção trocando só a linha do aviso:** `send_friend_request`,
  `process_friend_overtakes`, `congratulate_friend` e `thank_friend_congrats`.
- **Gatilho** `weekly_xp_duo_check`: um erro dentro dele é ignorado, para nunca bloquear o XP.
- **Avisos:** `_friends_notify` ganha os interruptores novos, com a mesma assinatura. Antes de aplicar, conferi que a
  versão em produção e no Staging era a da 086 (mesmo md5).
- **Sem DROP.** O rollback está no cabeçalho do arquivo.
- **Staging:**
  - Primeira versão registrada como `101_friends_duo` (`20261015012927`), antes de virar 102. A parte de idioma e
    push entrou depois, como `102b_friends_i18n_push_1`, `_2`, `_3b`, `_3c`, `_3e` e `_3f`. O `_3` e o `_3a`
    estouraram o tempo e não foram aplicados; o `_3d` (`respond_friend_request`) foi abandonado.
  - Todas as funções são idênticas às do arquivo (md5 conferido); a `my_duo_mission` só difere por um comentário.
  - `push-dispatch` publicada e segredos no Vault. Ligação conferida: o banco chama a função e ela responde
    `vapid_missing`, porque o Staging não tem as chaves de push.
- **Produção** (autorizada pela autora em 2026-10-15):
  - Aplicada em 7 partes: `102_friends_duo_a`, `_b1`, `_b2`, `_b3`, `_c1`, `_c2` e `_c3`. Peças grandes demais
    estouram o tempo da ferramenta, e a ordem garante que nada fica quebrado entre uma parte e outra.
  - As 22 funções são idênticas às do arquivo (md5).
  - Visitante sem login e contas comuns não chegam nas tabelas nem nas funções novas; as permissões das funções
    antigas continuam; o gatilho existe.
  - Dados intactos: `friend_settings` com 1 linha e `friendships` com 3.
  - Teste com a conta da autora (ROLLBACK) funcionando.
  - **Edge Function `push-dispatch`** publicada (v1, `verify_jwt`), com os segredos `push_dispatch_url` e
    `push_dispatch_anon` no Vault. A chave anon é pública. Ligação conferida: o banco chamou e ela respondeu
    `{"ok":true,"claimed":0}`.

## Testes

| Teste | Resultado |
|---|---|
| `tests/amigos-dupla/run.sh` (SQL local, com ROLLBACK, aplicando a 102 duas vezes; inclui inglês e fila de push) | 58/58 |
| `tests/amigos-dupla/test_playwright.js` (fr e zh, claro e escuro, computador e celular, sem rolagem lateral, toque >= 44px, matriz de Push) | 114/114 |
| Regressão de Amigos (SQL, 073/074/086 com a 102 por cima) | 125/125 |
| Parabéns por conquista e Pódio (SQL, 091/092 com a 102 por cima) | 31/31 |
| Amigos (navegador) | 210/210 |
| Sugestões | 58/58 |
| Conquistas | 76/76 e 66/66 |
| i18n | 2032/2032 e 209/209 |
| Ícones | 43/43 |

Testes antigos mudados de propósito:
- `tests/amigos/test_playwright.js`: de 6 para 8 interruptores de Amigos.
- `tests/i18n/test_i18n_unit.js`: `friends.duo.theirs` ("{name}: {n} XP") é igual nos dois idiomas.

## Depois: Mural, convite da professora e convite para ativar as notificações (2026-10-15)

Pedidos da autora: corrigir também os outros avisos ("obviamente") e fazer o convite para ativar o push ("SIM").

### Migration `104_server_notifications_en.sql` (a 103 foi usada por outra conversa)

- `_mural_notify` e `_teacher_notify` gravam o aviso em inglês para quem usa o site em inglês (`_ui_lang`). As frases
  vêm prontas das funções do Mural e do convite (outras conversas; algumas com DELETE, que trava a ferramenta).
  `_notif_text_en` reconhece as 9 frases da produção de 2026-10-15 e devolve a versão em inglês:
  - Mural: post (com e sem turma), comentário, "colocou você na turma", "entrou pelo link na turma" (com e sem
    vínculo novo);
  - convite da professora: convite, aceite pelo link, aceite pelo convite, recusa.
- Vocabulário igual ao do site em inglês: "board" (Mural) e "class" (turma). Idiomas: French, Chinese, Portuguese.
  Quando a conta não tem nome nem @, "Professora" vira "Your teacher".
- **Frase nova num aviso desses precisa entrar na `_notif_text_en`** e no teste `tests/avisos-idioma/`. Senão sai
  como veio, em português.
- **Staging e produção:** aplicada em 2026-10-15 pela ferramenta, arquivo inteiro, sem DROP. As funções são
  idênticas às do arquivo (md5); contas comuns continuam sem acesso às funções de aviso; tradução conferida na
  produção.
- **Testes:**

  | Teste | Resultado |
  |---|---|
  | `tests/avisos-idioma/run.sh` | 19/19 |
  | Mural (`tests/mural/run.sh`) com a 104 por cima | 80/80, igual a antes |
  | Convite da professora (077) com a 104 por cima | 0 falhas, igual a antes |

### Convite para ativar as notificações (`shared/friends.js`)

- **Faixa na aba Amigos**, para quem tem amigo e ainda não ativou o push neste aparelho:
  - "Ativar notificações" pede a permissão do navegador e liga Amigos por push.
  - "Agora não" esconde por 14 dias.
- **Janela uma vez só** quando a pessoa ganha o primeiro amigo ("Você ganhou um amigo! 🎉"). Ela espera a comemoração
  da conquista e qualquer outra janela fecharem.
- **iPhone/iPad sem o site na Tela de Início:** o navegador não tem push. A faixa explica "Compartilhar > Adicionar à
  Tela de Início", com o botão "Entendi".
- **Não aparece** quando o push já está ativado neste aparelho, quando as notificações estão bloqueadas no navegador
  (o clique não resolveria) ou quando o aparelho não tem suporte.
- **Grátis x Premium:** tudo grátis.
- **Também corrigido:** no celular, o formulário da missão em dupla tinha buracos entre os campos (CSS da entrega
  anterior).
- **Teste:** `tests/amigos-push/test_playwright.js`, 72/72 (fr e zh, claro e escuro, computador e celular, iPhone,
  bloqueado, primeiro amigo).

## Missão em dupla automática da semana (109, 2026-10-15)

Redesenho aprovado pela autora a partir da prévia (https://claude.ai/artifact/MdWXEhK4cZN5REQLPAxXWY).

- **Como funciona:** toda segunda às 8h (Brasília) o site forma as duplas sozinho entre amigos. Meta: 4 dias de estudo de
  **cada um** até domingo. Não tem formulário. Dia de estudo = dia em que a conta ganhou XP (tabela `study_days`, gravada
  pelo gatilho de `weekly_xp`, só para XP da semana atual).
- **Quem entra no sorteio:** quem estudou na semana anterior e deixou ligada "Participar das missões em dupla"
  (`friend_settings.join_duo_missions`, ligada por padrão). Desligar tira a pessoa a partir da segunda seguinte, sem aviso
  para ninguém. Não existe botão de recusar ou trocar dupla (decisão da autora: seria agressivo para o outro).
- **Rodízio:** a cada semana a dupla muda; preferência por quem nunca fez dupla com a pessoa, depois por quem fez há mais
  tempo; empate no acaso. Com um só amigo ativo, repete.
- **Cumpriu:** aviso para os dois ("Missão em dupla cumprida! Você e X estudaram 4 dias cada 🎉"), +1 na conquista Missões em
  Dupla, cartão fica "Cumprida" até domingo. Não cumpriu: termina sem culpa (nenhum aviso de "fulano não cumpriu").
- **Sobrou sem dupla:** botão "Chamar para missão" no cartão do amigo (`start_duo_mission`): missão de dias começando hoje,
  meta 4 ou os dias que faltam até domingo. Amigo que não participa aparece igual a "já está em missão" (`can_invite` falso),
  sem expor a escolha dele.
- **Onde aparece:** linha da dupla no quadro "Missões do dia"; faixa na tela de lição concluída (só no 1º estudo do dia);
  cartão na aba Amigos com a semana dos dois (7 bolinhas por pessoa) e o cutucar dentro do cartão.
- **Missões do dia clicáveis:** cada linha abre a atividade que ela pede (`DAILY_MISSION_TARGETS` em
  `shared/core/estado-trilha-desafios.js`): dupla → Amigos; conjugação → Conjugação; revisões/atrasados → Revisão;
  revisão rápida e jogo de combinar → o modo certo da Revisão; hanzi → Hanzi; o resto → próxima lição da trilha.
- **Sorteio:** `duo_pair_week()` (uma vez por semana, `duo_pairing_runs`, trava contra duas chamadas juntas), agendado no
  pg_cron (`duo-pair-weekly`, `0 11 * * 1`) e também chamado na primeira abertura depois de segunda 8h, se o cron não rodou
  (`_duo_maybe_pair`). **Atenção na produção:** a primeira abertura depois de aplicar já forma as duplas desta semana e manda
  os avisos (quem estudou na semana passada).
- Missões antigas de XP (102) continuam valendo até o fim da semana delas.
- **Grátis x Premium:** tudo grátis.
- **Staging:** aplicada em 2026-10-15 em 3 partes (`109_duo_weekly_auto_1/2/3`; o arquivo inteiro trava a ferramenta).
  As 10 funções conferidas por md5 com o banco local; cron criado; sem DROP. **Produção: pendente (aguardando a autora).**
- **Testes:**

  | Teste | Resultado |
  |---|---|
  | `tests/amigos-dupla/run_109.sh` (sorteio, rodízio, exclusões, textos pt/en, dia de estudo, XP de semana antiga, cumprida, chamar, permissões) | 25/25 |
  | `tests/amigos-dupla/test_playwright.js` (cartão, semana, chamar, linha nas Missões do dia, faixa no fim da lição, fr/zh, claro/escuro, celular) | 138/138 |
  | `tests/amigos/test_playwright.js` (9 preferências agora) | 210/210 |
