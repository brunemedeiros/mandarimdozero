# 18 -- Amigos em dupla: sequência com amigo, cutucar e missão em dupla (2026-10-15)

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
| Avisos em inglês | Em português, como os outros avisos de amigos | Os avisos do banco ainda não têm tradução | Junto com a tradução dos avisos |

## Banco: migration `101_friends_duo.sql`

- **Número:** a 100 foi pega por outra conversa minutos antes (`100_review_bank_agent_other_students`), por isso 101.
- **Colunas novas** em `friend_settings`: `accept_nudges` e `notify_missions` (ligadas por padrão).
- **Tabelas novas** (sem policy, só pelas funções): `friend_nudges`, `duo_missions` e `duo_mission_members`. A chave da
  última garante uma missão por pessoa por semana.
- **Funções:**
  - públicas: `friends_duo`, `nudge_friend`, `start_duo_mission`, `my_duo_mission`, `my_duo_missions_done`;
  - internas: `_are_friends`, `_joint_streak`, `_week_xp`, `_duo_check`.
- **Gatilho** `weekly_xp_duo_check`: um erro dentro dele é ignorado, para nunca bloquear o XP.
- **Avisos:** `_friends_notify` ganha os interruptores novos, com a mesma assinatura. Antes de aplicar, conferi que a
  versão em produção e no Staging era a da 086 (mesmo md5).
- **Sem DROP.** O rollback está no cabeçalho do arquivo.
- **Staging:** aplicada em 2026-10-15 (versão `20261015012927`).
  - As funções são idênticas às do arquivo (md5 conferido função por função; a `my_duo_mission` só difere por um
    comentário).
  - Visitante sem login não roda as funções públicas e nenhuma conta lê as tabelas novas direto.
  - Teste com ROLLBACK: o XP continua sendo salvo com o gatilho.
- **Produção:** pendente de autorização (aplicar o arquivo inteiro).

## Testes

| Teste | Resultado |
|---|---|
| `tests/amigos-dupla/run.sh` (SQL local, com ROLLBACK, aplicando a 101 duas vezes para conferir que pode repetir) | 43/43 |
| `tests/amigos-dupla/test_playwright.js` (fr e zh, claro e escuro, computador e celular, sem rolagem lateral, toque >= 44px) | 110/110 |
| Regressão de Amigos (SQL, 073/074/086 com a 101 por cima) | 125/125 |
| Amigos (navegador) | 210/210 |
| Sugestões | 58/58 |
| Conquistas | 76/76 e 66/66 |
| i18n | 2032/2032 e 209/209 |
| Ícones | 43/43 |

Testes antigos mudados de propósito:
- `tests/amigos/test_playwright.js`: de 6 para 8 interruptores de Amigos.
- `tests/i18n/test_i18n_unit.js`: `friends.duo.theirs` ("{name}: {n} XP") é igual nos dois idiomas.
