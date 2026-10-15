# Amigos: "seguir" (Duolingo) x amizade com pedido e aceite (nosso), e sugestões sem usar contatos

Exploração pedida pela autora em 2026-10-14. **Decisões da autora (2026-10-14):** manter pedido e aceite; aprovados
missão em dupla, sequência com amigo, cutucar e "seguir" só para contas oficiais; aprovadas as seis sugestões de
amigos da seção 4. Sugestões + QR code entregues (095, `docs/historico/17-sugestoes-de-amigos.md`); missão em
dupla, sequência com amigo e cutucar entregues em 2026-10-15 (102, `docs/historico/18-amigos-em-dupla.md`). Base: `shared/friends.js`, migrations 073/074/086.

## 1. Como cada um funciona

| | Duolingo: seguir | Nosso: amizade com pedido e aceite |
|---|---|---|
| Como começa | Você segue e pronto; a pessoa não precisa aceitar | Você manda pedido; vale quando a pessoa aceita (se os dois mandam, aceita sozinho) |
| O que a outra pessoa vê | "Segue você" no perfil, com botão Seguir de volta | Pedido na aba Amigos (+1 no Perfil) |
| Recursos em dupla | Missões de Amigos e Sequência com amigo só quando os dois se seguem | Ranking de amigos, atividade, parabéns, Pódio |
| Achar pessoas | Agenda do celular, Facebook, busca, sugestões | Busca por @ ou nome, link de convite |

## 2. Bom e ruim

**Seguir (Duolingo)**
- Bom: zero atrito, a rede cresce rápido, ninguém fica com pedido parado, funciona para quem tem muitos seguidores
  (ex.: uma professora com 200 alunos).
- Ruim:
  - qualquer pessoa pode te seguir e ver seu progresso;
  - precisa de botão de bloquear e de denúncia;
  - risco maior com alunos menores de idade;
  - o ranking "de amigos" mistura gente que você não conhece;
  - existe o "seguir para ser seguido" (spam).

**Pedido e aceite (nosso)**
- Bom: consentimento, combina com o perfil privado (080), é seguro para alunos, e o ranking e os parabéns ficam entre
  pessoas que se conhecem.
- Ruim:
  - atrito;
  - pedido ignorado fica parado;
  - redes menores;
  - quem não tem amigos no site não vê nada nas telas de amigos.

## 3. Recomendação

Manter pedido e aceite (o público é de alunos e a privacidade já é uma regra do site) e trazer do Duolingo o que não
depende de seguir:

1. **Missão em dupla** da semana (ex.: "você e a Bia: 300 XP juntos até domingo"), com recompensa para os dois.
2. **Sequência com amigo**: dias seguidos em que os dois estudaram.
3. **Cutucar**: lembrete amigável para o amigo que ainda não estudou hoje (1 por dia, dá para desligar).
4. **"Seguir" só para contas oficiais**, se um dia fizer sentido (ex.: o perfil da Prof. Brune com novidades), sem
   mudar a amizade entre alunos.

## 4. Sugestões de amigos sem usar a agenda

Ordenadas pela força do sinal:

| Sugestão | Por que funciona | Cuidado de privacidade |
|---|---|---|
| Colegas da mesma professora ou da mesma turma (Mural, 087) | Já estudam juntos; é o caso mais forte para os nossos alunos | Mostrar só nome e foto; a pessoa pode sair das sugestões |
| Amigos de amigos ("2 amigos em comum") | É o que mais funciona nas redes sociais | Só com amigos aceitos; nunca mostrar quem são os amigos de um perfil privado |
| Quem entrou pelo seu link de convite (ou quem te convidou) | O link já leva o @ de quem convidou (`?amigo=usuario`), mas hoje isso não é gravado no banco | Nenhum: a pessoa usou o link |
| QR code do convite para mostrar na aula | Presencial: aponta o celular e manda o pedido | Nenhum |
| Mesmo idioma, nível parecido e perfil público ("parceiros de estudo") | Bom para quem não conhece ninguém | Só perfis públicos (080) |
| Quem ficou perto de você no Ranking geral da semana | Rivalidade saudável | Só perfis públicos |

Regras comuns:
- cartão no estilo do Duolingo, com X para dispensar (o site lembra o que foi dispensado);
- opção "Aparecer nas sugestões" em Configurações > Amigos (`friend_settings`), ligada por padrão para colegas da
  mesma professora e desligada para estranhos;
- limite de sugestões por dia.

Grátis x Premium: tudo grátis (rede social puxa estudo; travar atrapalha).

Pacote inicial sugerido:
- colegas da mesma professora ou turma;
- amigos em comum;
- QR code de convite;
- opção de privacidade.

Precisa de 1 migration (função de sugestões + coluna de privacidade) e da tela "Sugestões de amigos" na aba Amigos.
