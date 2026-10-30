# Janelas do topo: sequência (🔥) e XP da semana (⭐), PRÉVIA para aprovação

Pedido da dona (2026-10-30): janela ao passar o mouse na sequência, parecida com a do Duolingo mas sem copiar, e rework da
janelinha do XP (`shared/xp-semana.js`, PR 415) no mesmo estilo. **Nada foi alterado no site.** Prévia montada sobre a página
real de fr e zh (Playwright, Supabase simulado), arquivos em
`/tmp/claude-0/-home-user-mandarimdozero/3e41ab12-78b3-5f2b-964b-fef249117fbb/scratchpad/janelas-topo/`
(`proto.css`, `proto.js`, `render.js`, capturas em `shots/`).

**Grátis x Premium:** tudo grátis (as duas janelas só mostram dados que a pessoa já tem).

## 1. Linguagem visual comum (A e B)

- Caixa de 340px no computador; no celular ocupa a largura com 16px de margem (390px: janela de 358px, sem rolagem lateral).
- Raio 18px, borda `--paper-line`, sombra `--shadow-lift`, fundo `--paper`. Um bico no alto aponta para o pill que abriu.
- **Cabeçalho colorido**: caixa da marca com texto (`--brand-fill` + `--on-brand-fill`, azul no fr, vermelho no zh, igual nos dois
  temas, regra do PR 370). Número grande na fonte de título do site (`--font-display`: Nunito no fr, Noto Serif SC no zh), frase
  curta embaixo, ícone grande do Fluent à direita (🔥 ou ⭐).
  - Sequência viva e feita hoje: chama colorida. Viva mas hoje ainda não: chama um pouco apagada. Zerada: chama clarinha, sem cor.
- Corpo: seção com título pequeno e dado à direita; linha de dado com divisória; cartão `--paper-warm` com ícone (amigos / total).
- Dias estudados: círculo verde com ✓ (`--success-fill` + `--on-success-fill`, o mesmo da janela de sequência que já existe).
  Hoje: anel na cor da marca e rótulo em `--seal-red-dark`. Dias que ainda vão chegar: círculo tracejado.
- Nenhuma cor nova: só tokens que já existem nos dois sites e nos dois temas.

## 2. A) Janela da sequência

Ordem: cabeçalho → "Esta semana" (seg a dom) → "Maior sequência" → cartão "Sequências com amigos".

| Estado | Cabeçalho (pt-BR) | Cabeçalho (en) |
|---|---|---|
| Viva, hoje feito (`lastStudyDay` = hoje) | **5** dias seguidos / "Hoje já contou. Amanhã vem o dia 6!" | **5** day streak / "Today counts. Day 6 is tomorrow!" |
| Viva, hoje ainda não (`lastStudyDay` = ontem) | **4** dias seguidos / "Uma lição ou revisão hoje e são 5 dias." | **4** day streak / "One lesson or review today makes it 5 days." |
| Zerada (`effectiveStreak()` = 0) | "Hoje pode ser o dia 1" / "Uma lição ou revisão já começa uma sequência nova." | "Today can be day 1" / "One lesson or review starts a new streak." |

Singular: "1 dia seguido" / "1 day streak". Nunca "você perdeu", "não estudou", "quebrou".

Resto dos textos:

| Lugar | pt-BR | en |
|---|---|---|
| Semana | Esta semana · "3 de 7 dias" | This week · "3 of 7 days" |
| Dias | seg ter qua qui sex sáb dom (chaves `wizard.day.*` que já existem) | Mon Tue Wed Thu Fri Sat Sun |
| Recorde | Maior sequência · "9 dias"; se for a atual: selo "é agora!" | Longest streak · "9 days"; "that's now!" |
| Amigos, título | Sequências com amigos | Friend streaks |
| 1 ativa | 1 ativa: **12 dias** com Bia | 1 active: **12 days** with Bia |
| Várias | 2 ativas. A maior: **12 dias** com Bia | 2 active. Longest: **12 days** with Bia |
| Tem amigos, nenhuma ativa | Estudem no mesmo dia e a sequência de vocês começa. | Study on the same day and your streak together begins. |
| Sem amigos | Estudar junto com alguém ajuda a manter o ritmo. | Studying with someone helps you keep the rhythm. |
| Botão | Ver amigos (sem amigos: Chamar amigos) | See friends (Invite friends) |
| Rótulo do botão 🔥 (leitor de tela) | Sequência: {n} dias seguidos. Ver detalhes | Streak: {n} days in a row. See details |

### De onde vem cada dado

| Dado | Fonte |
|---|---|
| Número | `effectiveStreak()` (`shared/srs.js`), sobre `STATE.streak` + `STATE.lastStudyDay`, que desde a E3/C2 são da CONTA (união dos cursos, `shared/account-progress.js`, aplicada no `loadState` de `shared/auth.js`). É o mesmo número do pill. |
| Estado (feito hoje / ainda não / zerada) | `STATE.lastStudyDay` = `todayStr()` / = ontem / `effectiveStreak()` = 0 |
| Dias da semana | `STATE.activityLog['YYYY-MM-DD'] > 0` (conta). Semana de segunda a domingo, mesma conta do Ranking (`XpSemanaCalc.weekStartOf`, `shared/xp-semana.js`). A janela atual (`buildStreakWeekData`, `shared/core/gamificacao.js`) mostra os últimos 7 dias; a nova mostra seg a dom. |
| Maior sequência | **Não existe campo salvo.** Calculada na hora: maior bloco de dias seguidos em `STATE.activityLog` (no mínimo a sequência atual). Só aparece a partir de 2 dias. Limite: o `activityLog` só tem dias desde que passou a ser gravado; contas muito antigas podem ter recorde menor que o real. |
| Sequências com amigos | RPC `friends_duo_state` (109; fallback `friends_duo`, 102), campo `joint_streak` por amigo, contando só `>= FRIENDS_JOINT_MIN` (2), como o chip 🤝 de `shared/friends.js`. Nome: lista de amigos (`FRIENDS_STATE`). Hoje esses dados só carregam ao abrir Amigos; a janela faria a leitura ao abrir (1 vez por minuto no máximo, como o XP). Sem amigos aceitos: texto "Sem amigos". |
| Botão | `switchTab('friends')` (mesma chamada do convite em `shared/friends.js`) e fecha a janela. |

## 3. B) Janela do XP (rework)

Mesmo cabeçalho: **65** XP nesta semana / "26 out a 1 nov" (en: **65** XP this week / "Oct 26 to Nov 1"), ⭐ grande à direita
(clarinha quando a semana está em 0). Corpo: "Últimas 4 semanas" em colunas (mais antiga à esquerda, esta semana à direita na
cor da marca, com o número em cima e "5 a 11 out" embaixo); cartão 📚 "XP total neste curso · 1840 XP"; nota de rodapé.

| Lugar | pt-BR | en |
|---|---|---|
| Cabeçalho | XP nesta semana | XP this week |
| Seção | Últimas 4 semanas | Last 4 weeks |
| Coluna atual | Esta semana | This week |
| Colunas antigas | 5 a 11 out · 28 set a 4 out | Oct 5–11 · Sep 28–Oct 4 |
| Total | XP total neste curso (chave atual `xpWeek.totalLabel`) | Total XP in this course |
| Nota | chave atual `xpWeek.note` (sem mudança) | idem |

Dados: os mesmos de hoje (`XpSemana.currentSeries()`: `weekly_xp` da conta nas 4 semanas + `STATE.periodXp`; total = `STATE.xp`).
Carregando / erro: as colunas antigas mostram "…" e a nota atual `xpWeek.loading` / `xpWeek.error`. Só muda o desenho.

## 4. Comportamento e acessibilidade (iguais nas duas)

- O 🔥 vira `<button>` (hoje é `<div>`), como o ⭐: `aria-haspopup="dialog"`, `aria-controls`, `aria-expanded`; janela com
  `role="dialog"` e `aria-labelledby` no número do cabeçalho; semana como lista com `aria-current="date"` em hoje; ✓ e ícones `aria-hidden`.
- Mouse: abre ao passar, fecha 250ms depois de sair (pode entrar na janela). Clique fixa. Toque: abre/fecha. Enter/Espaço abrem
  com o foco na janela; Tab vai ao botão "Ver amigos" (A) e, ao sair, fecha; Esc fecha e devolve o foco ao pill; clique fora fecha.
- Só uma janela aberta por vez (abrir uma fecha a outra).
- Alvo de toque de 44px no celular (pills e botão "Ver amigos"); pill aberto ganha contorno da marca (no computador, onde os pills
  não têm caixa, ganha também o fundo do hover).
- Não abre durante lição (`lesson-focus`), como os avisos.
- Peça comum em `shared/` (ex.: `shared/janelas-topo.js` + `.css`, reaproveitando o posicionamento de `xp-semana.js`), vale para
  fr, zh, pt e futuros no mesmo PR; textos novos em `shared/i18n/pt-BR.js` e `en.js`.

## 5. Perguntas para a dona

1. Sequência zerada: "Hoje pode ser o dia 1" (sem número) ou "0 dias seguidos" com a frase embaixo?
2. A semana da janela: seg a dom (como o Ranking, proposta) ou os últimos 7 dias (como a janela que aparece depois da lição)? Se
   seg a dom, mudar também a janela depois da lição para ficarem iguais?
3. "Maior sequência" calculada pelo histórico de dias (pode ficar menor que o real em contas antigas). Aceita, ou prefere guardar
   um recorde de verdade a partir de agora (campo novo na conta)?
4. Cartão de amigos sem nenhum amigo: mostrar "Chamar amigos" ou esconder o cartão?
5. Janela do XP: incluir uma frase comparando com a semana passada (só quando for positiva, ex.: "Já passou a semana passada!")?
   E um botão "Ver ranking", fazendo par com o "Ver amigos"?
6. A janela da sequência abre também ao passar o mouse (como a do XP hoje) ou só no clique/toque?
