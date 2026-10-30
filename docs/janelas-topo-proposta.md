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

## 6. Implementação (2026-10-30)

Respostas da dona (2026-10-30): 1) janela da sequência como na prévia e rework da do XP no mesmo estilo, abrindo com mouse,
clique, toque e teclado; 2) zerada = "Hoje pode ser o dia 1"; 3) semana de segunda a domingo nas duas janelas (topo e depois
da lição); 4) recorde guardado de verdade; 5) sem amigos = "Chamar amigos"; 6) frase do XP só quando a semana atual for maior
e botão "Ver ranking".

**Grátis x Premium:** tudo grátis.

### Arquivos

| Arquivo | O que faz |
|---|---|
| `shared/janelas-topo.js` | Contas puras (`TopPopCalc`: semana seg a dom, estado da sequência, recorde, amigos, frase do XP), controle comum das janelas (`TopPop.register/open/close`: mouse, clique, toque, Enter/Espaço, Tab, Esc, clique fora, uma por vez, nada durante `lesson-focus`, bico apontando para o pill) e a janela da sequência. |
| `shared/janelas-topo.css` | Desenho das duas janelas (substitui `shared/xp-semana.css`, apagado). Só tokens que já existem. |
| `shared/xp-semana.js` | Mesmos dados de antes (`weekly_xp` + `STATE.periodXp`); a janela agora usa `TopPop` (colunas, frase, total, "Ver ranking" -> `switchTab('leaderboard')`). |
| `shared/topbar-stats.js` | `renderTopbarStats()` também atualiza o rótulo do botão 🔥 (`TopPop.paintStreak`). |
| `shared/friends.js` | `friendsOpenInvite()`: abre Amigos e põe o foco no botão de convite (sem amigos: o bloco "Estudar junto é mais divertido", com Convidar amigos, Mostrar QR code e a busca; com amigos: os botões do topo). |
| `shared/core/gamificacao.js` | `buildStreakWeekData()` (janela depois da lição) passou de "últimos 7 dias" para segunda a domingo, com os dias que ainda vão chegar tracejados. |
| `shared/account-progress.js`, `shared/auth.js` (só o `saveState`, uma linha antes da união da conta), `shared/core/estado-salvar.js` (leitura), `shared/core/estado-trilha-desafios.js` | Recorde `bestStreak` (abaixo). Fica fora do `serializeState()` de propósito: os testes de paridade comparam aquele objeto antes x depois. |
| `fr/index.html`, `zh/index.html` | 🔥 virou `<button id="streak-btn" class="tpop-btn">` (o pill continua dentro), CSS e script novos. |
| `shared/i18n/pt-BR.js`, `en.js` | Chaves `streakPop.*` e `xpWeek.headUnit/last4/colRange/colRangeCross/better/seeRanking`; saíram `xpWeek.title/lastWeek/weeksAgo/range` (sem uso). |

### Recorde ("Maior sequência")

- **Onde fica:** `progress.data._account.bestStreak` (campo da conta, junto com `streak`/`activityLog`), com espelho em cada bloco de
  curso, como os outros campos da conta. Sem migration: `progress.data` é JSON.
- **Como nasce:** no primeiro save depois desta versão, `saveState` põe `bestStreak` no bloco e `AccountProgress.mergeAccount` grava o maior entre o recorde guardado, a
  sequência (mesmo congelada, porque aconteceu) e o maior bloco de dias seguidos do `activityLog` da conta. O `activityLog` é o
  histórico mais antigo que existe (conferido na produção, só SELECT: começa em 2026-08-24, 24 contas; a tabela `study_days` do
  servidor só começa em 2026-10-12 e não é lida pelo site), por isso não foi preciso migration.
- **Como sobe:** `registerStudyToday()` sobe `STATE.bestStreak` quando a sequência passa dele; o save e a união da conta só ficam com o maior
  (nunca desce). A janela mostra o maior entre guardado, histórico e sequência atual, então já aparece certo antes do primeiro save.
- Não entrou em `MONOTONIC_PROGRESS_FIELDS` de `shared/auth.js` e nenhum guarda-corpo mudou (`progressLoadedOk`, campos vitalícios): a união já impede a queda.
- Recomeçar o curso (futuro): o recorde é da CONTA; decidir com a dona se o recomeço zera ou não.

### Amigos na janela

Ao abrir a janela (no máximo 1 leitura por minuto): `friends_duo_state` (109; sem ela, `friends_duo` da 102), uma linha por amigo
aceito; sequência ativa = `joint_streak >= 2`; o nome do amigo da maior vem da lista de Amigos já carregada ou de `profile_cards`.
"Ver amigos" -> aba Amigos. "Chamar amigos" -> aba Amigos com o foco no botão "Convidar amigos" da tela vazia (link, QR code, busca,
sugestões).

### Testes

`tests/janelas-topo/` (`run.sh`): `test_calculo.js` (contas, recorde, semana depois da lição) e `test_playwright.js` (fr/zh, pt-BR e en,
1280 e 390; `SHOTS=dir` salva as capturas). `tests/xp-semana/test_playwright.js` atualizado para o desenho novo (colunas, datas).
