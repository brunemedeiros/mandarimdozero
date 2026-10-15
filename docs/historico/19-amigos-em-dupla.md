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
   - **Ainda em português no site em inglês** (fora de Amigos, em código de outras conversas): avisos do Mural
     (`_mural_notify`, 087) e do convite da professora (`_teacher_notify`, 077). Ficam pendentes, para corrigir com o
     mesmo modelo.
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
