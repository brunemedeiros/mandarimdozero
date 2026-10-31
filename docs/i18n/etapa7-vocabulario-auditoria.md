# Etapa 7 do plano "Voz da Prof. Brune": vocabulário único (auditoria e prévia)

Data: 2026-10-31. **Só auditoria e prévia**: nada do site, do banco ou das Edge Functions foi alterado; nenhum commit. Banco de
produção (`eigjocalzwamisgqilhg`) consultado só com SELECT. Branch `claude/optimistic-ramanujan-tercxc` atualizada com a `main`
(commit 817cb32a).

**Grátis x Premium:** nada muda. São só nomes; todas as telas citadas continuam com o mesmo acesso de hoje.

Tabela aprovada pela dona (18/10): "cada termo é testado na tela antes de virar regra, em pt e en; consistência não é uniformizar
termos que cumprem funções diferentes". Decidido depois: "Note" virou "item" (Etapa 4); "Pular unidades" pertence ao Ponto de
verificação; "Revisão rápida" mantém o ícone ⚡.

## 1. Como foi levantado

- Catálogo `shared/i18n/pt-BR.js` e `en.js` (4254 chaves cada), lidos por script (`load.js`/`scan.js` na pasta da prévia).
- Textos dos Desafios e Ditados: `CHALLENGE_I18N` (hoje em `shared/desafios.js`, não mais em `fr/app.js`) e `DICTATION_I18N` (`shared/ditados.js`).
- HTML fixo (`fr/index.html`, `zh/index.html`, `index.html`): rodei `tests/i18n/scan_pt_literais.js`. Todo texto do HTML com algum
  dos termos é cópia de uma chave do catálogo (`data-i18n`), então muda junto com a chave. Fora do catálogo só apareceu
  `shared/review-milestone.js:55` (reserva "{n} vencendo hoje", igual à chave) e o ícone ⚡ fixo em `shared/recomecar-curso.js:283`.
- Central de Ajuda (`ajuda/`): só "Excluir minha conta" (cita o botão) e "aplicativo" no texto exigido pelo Google; nada a mudar.
- Banco de produção (SELECT): `notification_templates` ativos, `badge_catalog`, `permission_catalog` e o código das funções SQL.
  Funções SQL: nenhum texto visível com os termos (só nomes de tabela e "streak" em inglês, correto).
- Edge Functions: os termos só aparecem em comentários.
- Área: chaves com prefixo `admin.`, `adminChallenges.`, `rb.`, `panel.`, `students.`, `materials.`, `classlogs.`, `perm.`, `plans.`,
  `badges.`, `analytics.`, `reports.`, `notifications.`, `cards.`, `teacherLogs.` são telas de Professora/Admin; o resto é do aluno
  (`studentPanel.` é a aba Aluno, vista pela aluna).

Contagem: uma chave com `one`/`other` conta como 1. "Já certo" é aproximado (chaves do aluno que já usam o termo da tabela).

## 2. Resumo por termo

| Conceito | Termo | Muda (aluno / Prof.-Admin) | Já certo | NÃO muda (função diferente) | Sem uso (apagar a chave) | Banco |
|---|---|---|---|---|---|---|
| Item de estudo | cartão ("carta" só no jogo de pares) | 8 / 8 | cerca de 200 | 1 (jogo de pares) | 1 | 0 |
| Dias seguidos | sequência | 0 / 3 | 27 | 0 | 0 | 0 (en "streak" é o certo) |
| Prova do fim do módulo | Ponto de verificação (en Checkpoint) | 7 / 3 | 9 / 3 | 3 (zh: fase final da unidade) | 0 | 0 |
| Revisão opcional da trilha | Reforço do módulo | 9 / 0 | 5 (verbos "revisar") | 0 | 0 | 0 |
| Tela de todos os cartões | Navegar | 3 / 0 | 10 ("Painel" de Professora/Admin) | 1 (aria "Fechar painel" do mapa) | 0 | 0 |
| O que vence hoje | para hoje | 15 / 4 | 6 | 17 / 25 | 1 | 4 linhas |
| Modo rápido | Revisão rápida (en Quick review) | 6 / 4 | 1 | 1 (lembrete "pequena revisão") | 1 | as mesmas 4 linhas |
| Remover | Apagar | 21 / 5 | 15 | 7 (Excluir conta) + 2 (excluir = deixar de fora) | 0 | 0 |
| Campo explicativo do cartão | Observação | 3 / 0 | 3 / 6 | 8 / 15 | 0 | 0 |
| Plano sem custo | grátis | 2 / 0 | 10 / 2 | 0 | 0 | 0 |
| O produto | site ("app" só o instalado) | 20 / 16 | 16 / 22 | 2 | 0 | 2 linhas (`badge_catalog`) |
| **Total** | | **93 / 43** | | | **4** | **6 linhas** |

## 3. Casos em que NÃO uniformizar (recomendação)

1. **"Excluir minha conta" fica "Excluir"** (7 chaves `accountDelete.*`). É a palavra das lojas de app e do Google/Apple para essa
   ação, a mesma da LGPD e da Central de Ajuda/Política (que o advogado está lendo), e ajuda a separar a ação mais grave e
   irreversível (a conta inteira) de apagar um cartão, Deck ou tag. A explicação dentro da janela já diz "Isso apaga..." e continua.
   Regra proposta: **Excluir** = só a conta; **Apagar** = qualquer conteúdo.
2. **"Excluir minha atividade dos Analytics"** (Admin): aqui "excluir" é "deixar de fora", não "apagar". Não muda.
3. **"cartas" no jogo de pares** (`review.match.pairsLabel`, "pares (N cartas)", modo Combinar): exceção da própria tabela.
4. **"Nota de realidade" e "Nota cultural"** (`concept.*`): são tipos de conteúdo pedagógico (nome usado nas regras, na skill e
   nas unidades), não o campo do cartão. "Nota" = pontuação ("melhor nota", "Nota Mil", Ditados) também não muda.
5. **Caderno da professora**: "Observações" (o aluno vê) e "Notas só suas" (só a professora) são campos diferentes de propósito.
   Unificar em "Observação" apagaria a diferença entre o que a aluna vê e o que é privado. Não muda.
6. **Missão "cartas em atraso"**: troca "carta" por "cartão", mas **mantém "atrasados"**. A missão conta só cartões que venceram
   ANTES de hoje (`registerDailyOverdueReviewCard`), não tudo o que é "para hoje". Proposta: "Revise {n} cartões atrasados".
7. **Listas de erros** ("Palavras para revisar" dos Ditados, "Formas para revisar" da Conjugação, "Frases para revisar" dos Jogos,
   "Palavras para rever do Ponto de verificação" no zh): são os erros da sessão, não o que vence hoje. Não viram "para hoje".
8. **Dias futuros da "Sua semana de revisão"** ("{dia}: N para revisar", "cartões que vencem"): falam de outro dia; "para hoje"
   ficaria errado. Não muda.
9. **"vence/venceu" de convite e de link de e-mail** (`tinvite.*`, `gate.link.*`): é "expira". Não muda.
10. **"Pendentes" das filas de moderação** (Banco de Revisão, Desafios no Admin, Google Agenda) e o filtro "Pendentes" dos
    Desafios (escolha da dona em 2026-10-19): é "ainda não feito/decidido", não o que vence hoje. Não muda.
11. **Colunas Novo / Aprendendo / Revisar da aba Revisão** (resumo, tabela de Decks, filtro "Estado" do Navegar): é a divisão por
    estado do cartão, com as cores do Anki, e o total ao lado ("Estudar tudo (N)") já é o "para hoje". Trocar "Revisar" por
    "Para hoje" juntaria duas coisas diferentes. Não muda.
12. **"Ponto de verificação" no chinês dentro da lição** (`zh.path.banner.checkpoint`, `zh.path.lessonDone.checkpointTitle`,
    `zh.path.lessonDone.recapMissed`): é a fase final de cada unidade do zh, não a prova do fim do módulo. Hoje o zh não tem
    módulos, então não há choque na tela, mas quando o zh ganhar módulos haverá duas coisas com o mesmo nome. **Decisão da dona**:
    manter, ou dar outro nome à fase da unidade (sugestão: "Teste da unidade"). Não entra em nenhum lote até ela decidir.
13. **"Checkpoint desbloqueado"** (zh, cartão da história entre unidades): é a HISTÓRIA, não a prova do módulo. Muda, mas para
    "História desbloqueada" (en "Story unlocked"), e não para "Ponto de verificação".
14. **"Fechar painel"** (aria do painel que sobe ao tocar num item do Mapa): é a gaveta do Mapa, não a tela dos cartões. Pode ficar;
    se a dona quiser "Painel" só para Professora/Admin em tudo, trocar por "Fechar" (1 chave, só leitor de tela).
15. **"Revisão" sozinha (aba)** continua "Revisão". O que muda é a linha opcional da trilha (ver 4.4).

## 4. Ocorrências por termo

Formato: chave · texto pt atual / en atual · tela · proposta (pt / en). "(en)" = só o inglês muda.

### 4.1 cartão ("carta" só no jogo de pares)

Muda, aluno (8):

| Chave | Hoje (pt / en) | Tela | Proposta |
|---|---|---|---|
| `fr.mission.overdue` (one/other) | Revise {n} carta(s) em atraso / Review {n} overdue card(s) | Missões do dia (fr e zh) | Revise {n} cartão atrasado / cartões atrasados (en igual) |
| `ui.myCards.sub` | Crie seus próprios flashcards... / Create your own flashcards... | Meus cartões | Crie seus próprios cartões... / Create your own cards... |
| `publicProfile.sectionFlashcards` | Flashcards / Flashcards | Perfil público | Cartões / Cards |
| `review.tags.hint` | Tags valem para o cartão inteiro (todos os cards gerados dele)... | Navegar > editor > Tags | Tags valem para o item inteiro (todos os cartões gerados dele)... / Tags apply to the whole item (every card generated from it)... |
| `restart.zero.memory` (en) | ...path flashcards... | Recomeçar o curso | ...path cards... |
| `restart.keep.cards` (en) | Your teacher's flashcards and your own... | Recomeçar o curso | Your teacher's cards and your own... |
| `accountDelete.hint` (en) | ...progress, flashcards, badges... | Configurações > Excluir conta | ...progress, cards, badges... |
| `accountDelete.modal.explain` (en) | ...your flashcards... | janela Excluir conta | ...your cards... |

Muda, Professora/Admin (8): `admin.panel.tab.flashcards` "📇 Flashcards" → "📇 Cartões" (aba do Painel; testes do painel procuram
o nome), `admin.students.metrics.noCards` (cita a aba), `admin.flashcards.edit.modeFlip` "Flashcard normal" → "Cartão normal",
`admin.analytics.lesson.flashcard_review` "Sessão de flashcards" → "Sessão de cartões", `admin.analytics.resumo.rateNA` e
`rateNote` ("flashcards" → "cartões"), `students.ev.act.flashcard_review` "revisão de flashcards" → "revisão de cartões",
`admin.flashcards.linkFirst` (en "flashcards" → "cards").

Sem uso: `review.mode.flashcard.name` ("Flashcard"; nenhuma tela usa): apagar dos dois catálogos.
NÃO muda: `review.match.pairsLabel` (cartas do jogo de pares). Os `{cards}` de `limitCut.already`, `review.deck.deleteConfirm`,
`review.deck.deletedWith`, `review.panel.deleteManyConfirm` são variáveis (o texto que entra já é "cartão/cartões").

### 4.2 sequência

Aluno: tudo certo (27 chaves com "sequência" ou "dias seguidos"; nenhum "série" ou "streak" em português). Inglês "streak" é o
termo certo.
Muda, Admin (3): `admin.badges.grant.notePh` "ex: reportou o bug do streak" → "da sequência"; `admin.analytics.resumo.xpNote`
"sequência de dias (streak)" → "sequência de dias"; `admin.analytics.eng.xpNote2` "o streak 'oficial' do app" → "a sequência
'oficial' do site".

### 4.3 Ponto de verificação (en Checkpoint)

| Chave | Hoje (pt / en) | Tela | Proposta |
|---|---|---|---|
| `trail.map.checkpointShort` | Ponto / Checkpoint | Mapa (rótulo do quadrinho) | Ponto de verificação (cabe em 390px, ver prévia 2) |
| `trail.map.checkpoint.redo` | Refazer o ponto / Retake the checkpoint | Mapa, painel do Ponto | Refazer o Ponto de verificação / Retake the Checkpoint |
| `zh.path.story.unlocked` | Checkpoint desbloqueado / Checkpoint unlocked | zh, cartão de história | História desbloqueada / Story unlocked (ver 3.13) |
| `badge.track.course1.goal.4`, `badge.track.aced.goal`, `.goal.1`, `.goal.4` | ...pontos de verificação... / ...checkpoint(s)... | Conquistas | maiúscula: "Pontos de verificação" / "Checkpoint(s)" (opcional, padroniza com o resto) |

Muda, Admin (3): `admin.analytics.lesson.unit_checkpoint` "✅ Checkpoint de unidade", `admin.analytics.prog.units` "(checkpoints)",
`admin.analytics.prog.unitsNote` ("gera um checkpoint") → "Ponto de verificação".
Já certo (9 aluno): `restart.zero.trail`, `comeback.checkpoint`, `toast.checkpointPassed`, `trail.unit.skippedTitle`,
`trail.checkpoint.title`, `trail.map.aria.checkpoint`, `trail.map.unit.skipCta`, `trail.map.checkpoint.lockedHint`,
`trail.map.checkpoint.take`. Decisão pendente: zh, ver 3.12.

### 4.4 Reforço do módulo

| Chave | Hoje (pt / en) | Tela | Proposta (pt / en) |
|---|---|---|---|
| `trail.moduleReview.title` | Revisão do módulo / Module review | Trilha (lista) e painel do Mapa | Reforço do módulo / Module refresher |
| `trail.moduleReview.chip` | Revisão / Review | etiqueta da linha e quadrinho do Mapa | Reforço / Refresher |
| `trail.moduleReview.doneOn` | Revisada em {date} (opcional) | Trilha | Feito em {date} (opcional) / Done on {date} (optional) |
| `trail.moduleReview.doneOnAgain` | Revisada em {date} · de novo agora: ... | Trilha | Feito em {date} · de novo agora: ... / Done on {date} · again now: ... |
| `trail.map.aria.review` | Revisão do módulo {n}, opcional | Mapa (leitor de tela) | Reforço do módulo {n}, opcional / Module {n} refresher, optional |
| `trail.map.review.statusDone` | Revisada / Reviewed | painel do Mapa | Feito / Done |
| `trail.map.review.statusReady` | Recomendada / Recommended | painel do Mapa | Recomendado (concordância com "Reforço") |
| `trail.map.review.cta` | Revisar agora / Review now | botão do painel do Mapa | Fazer o reforço / Start the refresher |
| `fr.dictation.levelReviewTitle` | Revisão do nível {level} / Level {level} review | linha "Revisão do A1" dos Ditados | Reforço do nível {level} / Level {level} refresher |

Fica (verbo "revisar" descreve o que se faz, não o nome): `trail.moduleReview.locked`, `.empty`, `.recommended`,
`trail.map.review.goal`, `.lastSession`. O motivo "{n} vencendo hoje" entra no lote "para hoje".
Também mudam, no mesmo PR: `.claude/rules/frontend-fr-zh.md` (cita "Revisão do módulo" e "Revisão do A1") e os testes que
procuram o texto (seção 6). O nome interno (`moduleReview`, `review-milestone`) não precisa mudar.
Prova na tela: seção 5, prévias 1 e 2. Com "Reforço" a linha da trilha e o quadrinho do Mapa deixam de repetir a palavra da aba
"Revisão" do menu de baixo; o botão diz o que acontece ("Fazer o reforço"), e o texto explicativo continua igual.

### 4.5 Navegar ("Painel" só para Professora e Admin)

| Chave | Hoje (pt / en) | Tela | Proposta |
|---|---|---|---|
| `review.deck.browse` | Painel / Browse | aba Revisão (botão do topo) e título da janela | Navegar (en continua Browse) |
| `review.deck.orphans` (one/other) | ...Abra o Painel para vê-los e movê-los. / ...Open Browse... | aba Revisão, aviso abaixo da tabela | ...Abra Navegar para vê-los e movê-los. (en igual) |
| `ankiImport.tags.note` | ...ficarão disponíveis para filtro quando o Painel existir. / ...once the Dashboard... | importar do Anki | ...e você pode filtrar por elas em Navegar. / ...and you can filter by them in Browse. (a frase atual está velha: o Painel já existe) |

Já certo: "Painel de Admin", "Painel da professora" (`menu.admin`, `panel.teacher.*`, `perm.teacher_panel`, `admin.*`).
Prova na tela: prévias 4, 5 e 6 (o botão cabe em 390px nos dois sites; a janela fica "Navegar" ao lado da busca).

### 4.6 para hoje

Muda, aluno (15):

| Chave | Hoje (pt / en) | Tela | Proposta (pt / en) |
|---|---|---|---|
| `progress.statDueNow` | Devidos / Due | Perfil > Progresso | Para hoje / Due today |
| `progress.statReview` | Para revisar / To review | Perfil > Progresso | Em revisão / In review (é o estado do cartão, não o prazo; senão fica "Para revisar" ao lado de "Para hoje") |
| `progress.statToday` | Para estudar hoje / To study today | Perfil > Progresso | Na sessão de hoje / In today's session (senão "Para hoje" e "Para estudar hoje" ficam lado a lado) |
| `progress.statTodayTitle` | ...devidos + novos... | dica do contador | ...os para hoje + novos... |
| `deck.countsFull` | ...Para revisar: {review} · Devidos: {due} | Meus cartões (lista de Decks) | ...Em revisão: {review} · Para hoje: {due} |
| `deck.countsDetail` | ...{review} para revisar | contagem de Deck | ...{review} em revisão |
| `review.speed.upToDateBody` | Nenhuma revisão pendente agora... / No reviews due right now... | Revisão rápida sem nada | Nenhuma revisão para hoje... (en igual) |
| `review.session.pendingOverall` | ...{n} cartão(ões) pendente(s) no geral. | fim da sessão | ...{n} cartão/cartões para hoje no geral. |
| `review.session.classEmptyTitle` | Nenhum cartão das aulas para revisar agora | Revisão, cartões da professora | Nenhum cartão das aulas para hoje |
| `ui.review.practiceHint` | ...mesmo sem revisões pendentes. | Revisão | ...mesmo sem nada para hoje. |
| `review.strength.hint` | ...sem nenhuma revisão pendente agora. | Revisão, força do vocabulário | ...sem nenhuma revisão para hoje. |
| `zh.hanzi.pendingChars` | ...{n} caractere(s) pendente(s). | zh, Hanzi | ...{n} caractere/caracteres para hoje. |
| `trail.map.unit.toReview` | 🔁 {n} para revisar / 🔁 {n} to review | Mapa, painel da unidade | 🔁 {n} para hoje / 🔁 {n} due today |
| `trail.moduleReview.reason.due` (+ reserva em `shared/review-milestone.js:55`) | {n} vencendo hoje / {n} due today | linha do Reforço | {n} para hoje |
| `studentPanel.review.dueCount` | {n} cartões para revisar hoje | aba Aluno > Revisão | {n} cartões para hoje |

Muda, Professora (4, opcional): `students.col.due`, `students.ind.due`, `students.ind.dueCount` "Revisões vencidas" → "Para hoje";
`students.created.cardsValue` "· {due} vencidos" → "· {due} para hoje" (os rótulos `progress.*` acima também aparecem em
Professora > Alunos > Decks do aluno).
Sem uso: `zh.progress.statDue` ("Pendentes agora").
Já certo: `review.today.aria`, `review.today.upToDate`, `classBanner.title`, `classBanner.titleShort`, `mural.side.review`,
`mural.side.reviewNone`.
NÃO muda: ver 3.6 a 3.11 (missão "atrasados", listas de erros, semana, convites e links, filas de moderação, filtro dos Desafios,
colunas Novo/Aprendendo/Revisar). Também `ui.review.newPerDay.unlimited` ("todas as pendentes de uma vez": fala das NOVAS; se a
dona quiser, "todas as novas de uma vez").
**Banco (migration futura, SQL Editor)**: `notification_templates` ids 39 e 41 (pt, `review_overdue`): "{{dueCount}} palavras estão
prontas para uma revisão rápida 📚" → proposta "{{dueCount}} palavras para hoje na Revisão 📚"; ids 119 e 120 (en): "...are ready
for a quick review 📚" → "{{dueCount}} words due today in Review 📚". Motivo duplo: "para hoje" e não confundir com o modo
"Revisão rápida" (o aviso abre a Revisão normal). Título "Revisão do dia" / "Today's review" fica.

### 4.7 Revisão rápida (en Quick review), ícone ⚡

| Chave | Hoje (pt / en) | Tela | Proposta |
|---|---|---|---|
| `review.mode.speed.name` | Speed Review / Speed Review | aba Revisão, cartão do modo | Revisão rápida / Quick review (cabe em 390px, prévia 5) |
| `review.speed.insufficientBody` | O Speed Review precisa... / Speed Review needs... | Revisão rápida sem palavras | A Revisão rápida precisa... / Quick review needs... |
| `fr.mission.speedReview1` | ...sessão de Revisão Rápida / ...Speed Review session | Missões do dia | ...sessão de Revisão rápida / ...Quick review session |
| `badge.explorer.desc` (en) | Used review, speed review and the memory game | Conquistas | ...quick review... |
| `comeback.review` | Fazer uma revisão rápida / Do a quick review, com ícone ⚡ | janela de volta depois de dias parado | Fazer uma revisão de 5 minutos / Do a 5-minute review, ícone ⏱ (o botão abre a sessão curta de cartões, NÃO a Revisão rápida; o ⚡ é de outra coisa) |
| `ui.reviewReminder.title` (en) | Shall we do a quick review? | lembrete do rodapé | Shall we do a short review? (pt "pequena revisão" fica) |

Muda, Admin (4, só en): `admin.analytics.lesson.speed_review`, `admin.analytics.resumo.rateNA`, `rateNote`,
`students.ev.act.speed_review` ("speed review" → "quick review"). Sem uso: `review.mode.speed.desc`.
Fora do catálogo: ícone em `shared/recomecar-curso.js:283`.

### 4.8 Apagar ("Excluir" só para a conta)

Muda, aluno (21), todas na aba Revisão (tabela de Decks e Navegar) e no gerenciador de Tags: `review.deck.delete` "Excluir",
`review.deck.deleteTitle`, `review.deck.alsoDeleted`, `review.deck.deletePermanently`, `review.deck.deleteConfirm`,
`review.deck.deletedMoved` "Deck excluído", `review.deck.deletedWith`, `review.panel.deleteOne` "🗑 Excluir",
`review.panel.deleteManyConfirm`, `review.panel.deletedWhat` ("conteúdo(s) excluído(s)"), `tagManager.err.systemProtected`,
`tagManager.delete.askHtml`, `tagManager.delete.confirm`, `tagManager.delete.title`, `tagManager.delete.aria`,
`tagManager.deleting` "Excluindo…", `deck.delete.err.notOwn`, `.moveFailed`, `.deleteCardsFailed`, `.movedButDeck`,
`.deletedButDeck`. Em todas: Excluir/excluído/Excluindo → Apagar/apagado/Apagando. Inglês já é "Delete" (fica).
Muda, Professora/Admin (5): `admin.notifications.btn.delete`, `admin.notifications.confirm.delete`,
`admin.badges.catalog.deleteTitle`, `admin.badges.confirm.delete`, `tagManager.hint.teacher`.
NÃO muda: `accountDelete.*` (7), `admin.analytics.exclude.title`, `admin.analytics.lang.note` (ver 3.1 e 3.2).
Já certo: Meus cartões, Decks, Mural, Material, aulas, Professora > Cartões (todos "Apagar").

### 4.9 Observação

| Chave | Hoje (pt / en) | Tela | Proposta |
|---|---|---|---|
| `myFlashcards.note.label` | Nota (opcional) / Note (optional) | criar/editar cartão próprio | Observação (opcional) (en fica "Note") |
| `publicProfile.labelNote` | Nota / Note | cartão no perfil público e no editor da Professora (`shared/admin-flashcards.js:385`) | Observação |
| `publicDeck.publish.ownKeyHtml` | ...O campo "nota privada" dos cartões nunca é público. | publicar Deck | ...O campo "Observação" dos cartões nunca é público. (en: the cards' "Note" field) |

Já certo: `review.observation`, `studentPanel.review.hint`, `myClassLogs.observations`; Professora: `admin.flashcards.hint.*`,
`admin.flashcards.native.privateNote`, `rb.fObservation`. NÃO muda: ver 3.4 e 3.5.

### 4.10 grátis

| Chave | Hoje (pt / en) | Tela | Proposta |
|---|---|---|---|
| `fr.trail.freeDictation` | {n} ditado Free (one e other iguais) / {n} Free dictation(s) | trilha, linha dos Desafios do módulo e dos Ditados | one "{n} ditado grátis", other "{n} ditados grátis" (conserta também o plural) |
| `CHALLENGE_I18N['pt-BR']['tier.free']` | Free | selo dos Desafios | Grátis |

Já certo: limite do plano, cadastro ("Criar conta grátis"), pulo de unidades, Admin > Planos. Inglês "Free" é o certo.

### 4.11 site ("app" só para o instalado no celular)

Muda, aluno (20): `report.modal.successText` ("melhorar o app"), `settings.uiLanguage.sub` ("textos do app"),
`settings.export.descFr`, `settings.export.descZh` ("usado aqui no app"), `notif.pref.inAppOnly`, `notif.pref.inApp.title`
("Notificações no app"), `notif.pref.push.sub` ("mesmo com o app fechado"), `notif.pref.matrix.app` ("App"),
`notif.pref.titleMatrixInApp` ("No app"), `ankiExport.deckDesc` ("Exportado do app {app}"), `ui.update.body` ("Atualizamos o
app"), `badge.founder.desc` ("plataforma"), `badge.beta_tester.desc`, `badge.catalog.ambassador.desc` ("aplicativo"),
`badge.catalog.pioneer.desc`, `gate.link.entrar.title` ("Entrar no app"), `import.tagsDropped.system`,
`ankiImport.warn.clozeNoTranslation`, `ankiImport.warn.hintsDropped`, `ankiImport.warn.systemTags`. Em todas: app/aplicativo/
plataforma → site. Inglês: "app"/"platform" → "site"; nas Notificações, "In-app notifications" vira "Site notifications" e a
coluna "App" vira "Site" (confiança média: "in-app" é o termo comum em inglês; a dona decide se o en acompanha).
Muda, Professora/Admin (16): `admin.common.adminOnly`, `admin.panel.sub` ("plataforma"), `admin.notifications.channel.inAppLower`,
`admin.notifications.new.lang`, `.new.channelInApp`, `.new.hint`, `admin.badges.create.descPh`,
`admin.analytics.kpi.activeStudentsNote`, `.kpi.sessionsNote`, `.prog.levelNote`, `.eng.xpNote2`, `.tech.note`,
`notifications.sub`, `notifications.filter.lang.aria`, `badges.builtin.hint`, `analytics.sub`.
NÃO muda: `ankiExport.appName.*` (variável com o nome do curso); `friends.push.iosText` já diz "site" e fala do atalho na Tela de
Início (certo).
**Banco (migration futura)**: `badge_catalog.description` de `ambassador` ("Divulgou o aplicativo...") e `pioneer` ("...usar o app
em sua fase inicial") → "site". (O nome "Embaixador/a", "Pioneiro/a" é assunto da Etapa 4, gênero.)

## 5. Prévias na tela (antes x depois)

Feitas com Playwright no app real (fr e zh, tema claro, 390 e 1280, site em pt-BR e em en), com o catálogo trocado **só na
memória do navegador** (nenhum arquivo do repo mudou). Estado simulado: módulo 1 do fr (2 primeiras unidades do zh) concluído, com
cartões para hoje. 96 capturas, 0 erros de página. Pasta (temporária, desta sessão):
`/tmp/claude-0/-home-user-mandarimdozero/3e41ab12-78b3-5f2b-964b-fef249117fbb/scratchpad/etapa7/` (`shots/` = cada captura,
`lado-a-lado/` = antes e depois juntos; roteiro `previa.js`, textos do "depois" em `depois.json`).

| # | Cena | O que mostra | Arquivo lado a lado (`lado-a-lado/`) |
|---|---|---|---|
| 1 | Trilha em lista (fr) | "Revisão do módulo · REVISÃO" x "Reforço do módulo · REFORÇO", com a aba "Revisão" no menu de baixo | `1-trilha-lista__fr-390-pt-BR.png`, `__fr-1280-en.png` |
| 2 | Mapa, painel da linha opcional (fr) | quadrinho "Revisão" e "Ponto" x "Reforço" e "Ponto de verificação"; botão "Revisar agora" x "Fazer o reforço"; "Recomendado" | `2-mapa-reforco__fr-390-pt-BR.png` |
| 3 | Mapa, painel de unidade (fr, zh) | "🔁 20 para revisar" x "🔁 20 para hoje" | `3-mapa-unidade__fr-390-pt-BR.png`, `__zh-390-pt-BR.png` |
| 4 | Aba Revisão (topo) | "Decks · Painel · Configurar" x "Decks · Navegar · Configurar"; "Speed Review" x "Revisão rápida" | `4-aba-revisao__fr-1280-pt-BR.png` |
| 5 | Aba Revisão no celular | o botão "Navegar" e o cartão "Revisão rápida" cabem em 390px | `5-revisao-decks__fr-390-pt-BR.png`, `__zh-390-pt-BR.png` |
| 6 | Janela dos cartões aberta | título "Painel" x "Navegar" | `6-navegar-aberto__fr-1280-pt-BR.png`, `__zh-390-pt-BR.png` |
| 7 | Perfil > Progresso | "Para revisar · Devidos · Para estudar hoje" x "Em revisão · Para hoje · Na sessão de hoje" | `7-progresso-contadores__fr-390-pt-BR.png` |

O que as prévias mostraram:
- **Reforço do módulo se distingue da aba Revisão sem ficar mais difícil**: a linha da trilha e o quadrinho do Mapa deixam de dizer
  "Revisão" duas vezes (título e etiqueta) a poucos centímetros da aba "Revisão"; o texto explicativo ("uma sessão curta com o que
  mais precisa ser revisto neste módulo") continua dizendo o que é. Em inglês, "Module refresher" ficou com o mesmo tamanho.
- **"Navegar" cabe** no seletor do topo da Revisão em 390px (fr e zh) e não quebra o título da janela.
- **"Para hoje" sozinho criaria um choque** em Perfil > Progresso: "Para hoje" ao lado de "Para estudar hoje" e de "Para revisar".
  Por isso a proposta troca os três juntos ("Em revisão", "Para hoje", "Na sessão de hoje"). Na captura do celular "Na sessão de
  hoje" quebra em 2 linhas, como "Para estudar hoje" já quebrava.
- **"Ponto de verificação" inteiro cabe** no quadrinho do Mapa em 390px; dá para aposentar o rótulo curto "Ponto".
- **Achado fora do vocabulário (bug que já está na `main`)**: em Perfil > Progresso o ícone de cada contador fica POR CIMA do número
  e do rótulo (fr e zh, 390 e 1280). Causa: `#view-progress .stat-card{ padding:14px 16px }` (fr `index.html:3668`, zh `:3937`,
  commit 4d8618c2) vence o `padding-left:64px` de `.stat-card`. Nas capturas da cena 7 a prévia põe o padding de volta só para dar
  para ler; deixei uma tarefa sugerida para consertar.
- Não capturado: a linha "Revisão do A1" dos Ditados (mesma troca de nome da linha do módulo) e a tela "Revisão rápida sem nada para
  hoje". A tabela de Decks aparece vazia porque o modo convidado não tem Decks; os botões e o resumo são os de verdade.

## 6. Lotes propostos

| Lote | O que entra | Chaves (aluno + Prof./Admin) | Banco | Risco |
|---|---|---|---|---|
| **1a** | grátis, sequência (Admin), Revisão rápida (com o ícone ⏱ do "Fazer uma revisão de 5 minutos"), Apagar | 2 + 0; 0 + 3; 6 + 4 (+1 chave sem uso); 21 + 5 = **29 + 12 = 41** | 0 | Baixo. Só nomes; o "Excluir" da conta fica. |
| **1b** | site/app | **20 + 16 = 36** | `badge_catalog` (2 linhas) | Baixo/médio: inglês das Notificações ("in-app") pede decisão da dona; 1 migration curta (UPDATE). |
| **2** | cartão, Observação, Ponto de verificação (inclui "História desbloqueada" no zh) | 8 + 8 (+1 sem uso); 3 + 0; 7 + 3 = **18 + 11 = 29** | 0 | Médio: aba "📇 Flashcards" da Professora muda de nome (testes do painel); `publicProfile.labelNote` também aparece no editor da Professora. |
| **3** | para hoje (com "Em revisão" e "Na sessão de hoje") | **15 + 4 = 19** (+1 sem uso) | `notification_templates` 39, 41, 119, 120 (texto vale também para Revisão rápida) | Médio/alto: os testes k2e, k7, k10 e painel-alunos conferem "Para revisar/Devidos/Para estudar hoje" pelo texto. |
| **4** | Navegar | **3 + 0** | 0 | Baixo. |
| **5** | Reforço do módulo e do nível | **9 + 0** | 0 | Médio: testes da paridade de módulos, da trilha e dos Desafios do módulo procuram o texto; regra `frontend-fr-zh.md` muda junto. |
| — | Decisão pendente | zh "Ponto de verificação" da fase da unidade (3 chaves); "Fechar painel" (1, opcional) | | |

Total: **93 chaves do aluno + 43 de Professora/Admin**, 4 chaves sem uso para apagar, 6 linhas do banco.

Em todos os lotes:
- `tests/i18n/test_i18n_unit.js`: cada texto em português que muda entra em `DELIBERATE_PT_CHANGES` (com data e motivo); tirar de
  `EN_SAME_AS_PT_OK` as chaves que deixam de ser iguais ou somem (`review.mode.flashcard.name`, `review.mode.speed.name`,
  `publicProfile.sectionFlashcards`, `notif.pref.matrix.app`, `admin.panel.tab.flashcards`).
- O HTML fixo com `data-i18n` (texto padrão) muda junto com a chave (teste de byte a byte).
- Rodar `node tests/i18n/test_i18n_unit.js`, `tests/i18n/test_sem_portugues_en.js` e a regressão da área do lote.
- Testes que citam os textos hoje: "Revisão do módulo" (6 arquivos: `tests/paridade-sites/test_modulos_niveis*.js`,
  `capturas_modulos_niveis.js`, `tests/trilha/test_review_milestone_ui.js`, `tests/i18n/test_sem_portugues_en.js`), "Revisão do
  nível" (`tests/desafios-modulo/test_playwright.js`, que também confere "Free"), "vencendo hoje" (`tests/trilha/test_review_milestone*.js`),
  "Devidos" (`tests/k10`, `k2e`, `k7`, `painel-alunos`), "Speed Review" (só nomes de checagem em `revisao-proposta-a`, `modo-foco`,
  `deck-browser`).
- Textos novos em inglês entram como `needs_review` com confiança; os do banco vão por migration (Staging antes da produção),
  conferidos por SELECT depois.
- Paridade: tudo é catálogo comum (`shared/`), então fr, zh e o futuro pt recebem juntos.

## 7. Decisões que dependem da dona

1. "Excluir" só para a conta, "Apagar" para todo o resto (recomendado) ou "Apagar" também na conta.
2. Inglês do Reforço: "Module refresher" (proposto, confiança média) ou outro.
3. Perfil > Progresso: aceitar a troca dos três rótulos ("Em revisão", "Para hoje", "Na sessão de hoje").
4. Inglês das Notificações: acompanhar "site" ("Site notifications") ou manter "In-app" (termo comum em inglês).
5. zh: manter "Ponto de verificação" para a fase final da unidade ou renomear (ex.: "Teste da unidade").
6. "Fechar painel" do Mapa: deixar ou trocar por "Fechar".
7. Ordem dos lotes (sugestão: 1a, 4, 5, 2, 1b, 3; o 3 por último porque mexe em mais testes e no banco).

## 8. Decisões da dona (2026-10-31)

- "Excluir" só para a conta; "Apagar" para todo o resto.
- "Fechar painel" do Mapa vira "Fechar".
- Notificações em inglês continuam "In-app".
- NÃO usar "Reforço": continua "Revisão do módulo" e o botão continua "Revisar agora" (lote 5 cancelado).
- NÃO usar "Navegar": continua "Painel" (lote 4 cancelado).
- Lotes 1a (grátis, sequência, Revisão rápida, Apagar) e 2 (cartão, Observação, Ponto de verificação) aprovados.
- Ponto de verificação é só o do módulo; a fase final dentro da unidade (zh) passa a se chamar "Revisão da Unidade".
- "Devidos" -> "Para hoje": aceito, mas os rótulos de Perfil > Progresso ficam para pensar melhor (a dona perguntou a
  diferença entre "Para hoje" e "Na sessão de hoje" e o sentido de "Em revisão"); "20 para revisar" da unidade: em discussão
  ("20 cartões aguardando revisão"?).

## 9. Lotes 1a e 2 aplicados (2026-10-31)

Aplicado na branch `claude/optimistic-ramanujan-tercxc` (sem commit; a `main` foi mesclada antes, com o conflito do `CLAUDE.md`
resolvido mantendo os dois lados). Sem banco e sem Edge Function: nenhuma migration nestes lotes. **Grátis x Premium:** nada
muda (só nomes). Paridade: tudo é catálogo comum (`shared/i18n/`) ou código de `shared/`, então fr, zh e o futuro pt recebem juntos.

### 9.1 O que entrou

- **Lote 1a**: grátis (selo dos Desafios `CHALLENGE_I18N['pt-BR']['tier.free']` em `shared/desafios.js` e `fr.trail.freeDictation`,
  que ganhou plural de verdade); sequência (3 chaves do Admin); Revisão rápida (en Quick review); Apagar no lugar de Excluir (26 chaves,
  mais os textos de reserva em `shared/tag-manager.js`). "Excluir minha conta" (`accountDelete.*`) e "Excluir minha atividade dos
  Analytics" ficaram. O "app" de `admin.analytics.eng.xpNote2` ficou para o lote 1b.
- **Retomada**: "Fazer uma revisão rápida" virou "Fazer uma revisão de 5 minutos" (en "Do a 5-minute review") e o ícone fixo de
  `shared/recomecar-curso.js` passou de ⚡ para ⏱ (o ⏱ já está no MAP do Fluent e é o mesmo do botão "5 minutos" da aba Revisão).
- **Lote 2**: cartão (inclui a aba antiga "📇 Flashcards" -> "📇 Cartões", que hoje nenhuma tela usa: o Painel da professora usa
  `panel.tab.cards` = "Cartões"; por isso `admin.students.metrics.noCards` passou a citar a aba "Cartões"); Observação (3 chaves);
  Ponto de verificação só para a prova do módulo (rótulo do Mapa inteiro, "Refazer o Ponto de verificação", metas das conquistas com
  maiúscula).
- **zh (e fr): fase final dentro da unidade = "Revisão da Unidade"** (en "Unit review"). Achado: essa fase existe nos DOIS sites
  (20 lições `isCheckpoint` no fr e 18 no zh, todas com o título "Ponto de verificação" na camada do curso). Pela decisão "Ponto de
  verificação é só o do módulo" e pela regra de paridade, mudou nos dois: título da lição em `courses/fr-pt-BR/layer.js` e
  `courses/zh-pt-BR/layer.js` ("Revisão da Unidade") e em `fr/content.en.js`/`zh/content.en.js` ("Unit review"); faixa da fase
  (`zh.path.banner.checkpoint`), tela de fim (`zh.path.lessonDone.checkpointTitle`, `.recapMissed`) e o rótulo do passo
  (`shared/core/licao-base.js` usava `trail.checkpoint.title`; agora usa a chave nova `trail.unitReview.title`).
- **História desbloqueada** (en "Story unlocked"): `zh.path.story.unlocked` era o cartão da HISTÓRIA entre unidades (confirmado em
  `zh/app.js:757`).
- **Analytics do Admin**: o evento `unit_checkpoint` é "unidade concluída" (dispara em `shared/core/trilha-licao.js` ao concluir a
  unidade, inclusive as de gramática sem lições), não o Ponto de verificação do módulo. Em vez de "Ponto de verificação" (proposta da
  seção 4.3), ficou "✅ Unidade concluída" / "unidade concluída" e o "(checkpoints)" saiu do título "Unidades concluídas por aluno".
- **Mapa**: o ✕ do painel usa `common.close` ("Fechar"/"Close"); `trail.map.closePanel` foi apagada.
- **Acréscimo aprovado pela dona (2026-10-31)**:
  - Perfil > Progresso, opção A: saiu o contador "Para estudar hoje" (a fila da sessão fica só na aba Revisão);
    `progress.statReview` "Para revisar" -> "Já aprendidos" (en "Learned", confiança média) e `progress.statDueNow` "Devidos" ->
    "Para hoje" (en "Due today"). As mesmas chaves aparecem na tabela "Decks do aluno" do painel da professora
    (`shared/teacher-students-ui.js`) e ficam com os nomes novos. `progress.statToday` e `progress.statTodayTitle` ficaram sem uso e
    foram apagadas. Grade: com um contador a menos, o "XP acumulado" fica sozinho na última linha (390: 2 colunas; 1280: 4 colunas);
    sem sobreposição nem rolagem lateral (capturas 3).
  - Painel da unidade no Mapa: `trail.map.unit.toReview` virou plural ("🔁 1 cartão para revisar hoje" / "🔁 N cartões para revisar
    hoje"; en "1 card to review today" / "N cards to review today"), chamado com `tp()` em `shared/core/modulos-niveis.js`.
  - `deck.countsFull`/`deck.countsDetail` ("Para revisar: · Devidos:" na lista de Decks) NÃO mudaram: são do lote 3 ("para hoje").
- **Chaves sem uso apagadas** (conferido com busca no código e no HTML, inclusive chave montada): `review.mode.flashcard.name`,
  `review.mode.speed.desc`, `zh.progress.statDue`. A seção 2 fala em 4, mas só há 3 listadas nas seções 4.1, 4.6 e 4.7. Além delas:
  `trail.map.closePanel`, `progress.statToday`, `progress.statTodayTitle` (ficaram sem uso nesta entrega).
- Traduções novas em inglês marcadas no `en.js` com "Etapa 7 (needs_review)"; confiança alta, menos "Learned" (média).

### 9.2 Chaves mudadas (pt antes -> depois | en antes -> depois)

| Chave | pt | en |
|---|---|---|
| `comeback.review` | 'Fazer uma revisão rápida' → 'Fazer uma revisão de 5 minutos' | 'Do a quick review' → 'Do a 5-minute review' |
| `review.mode.flashcard.name` | removida | removida |
| `review.mode.speed.name` | 'Speed Review' → 'Revisão rápida' | 'Speed Review' → 'Quick review' |
| `review.mode.speed.desc` | removida | removida |
| `review.speed.insufficientBody` | 'O Speed Review precisa de palavras já estudadas com sucesso pelo menos uma vez. Continue estudando unidades no Estudo.' → 'A Revisão rápida precisa de palavras já estudadas com sucesso pelo menos uma vez. Continue estudando unidades no Est... | 'Speed Review needs words you have already studied successfully at least once. Keep studying units in Study.' → 'Quick review needs words you have already studied successfully at least once. Keep studying units in Study.' |
| `myFlashcards.note.label` | 'Nota (opcional)' → 'Observação (opcional)' | (igual) |
| `zh.path.story.unlocked` | 'Checkpoint desbloqueado' → 'História desbloqueada' | 'Checkpoint unlocked' → 'Story unlocked' |
| `zh.path.lessonDone.recapMissed` | 'Palavras para rever do Ponto de verificação' → 'Palavras para rever da Revisão da Unidade' | 'Words to review from the Checkpoint' → 'Words to review from the Unit review' |
| `zh.path.lessonDone.checkpointTitle` | 'Ponto de verificação concluído!' → 'Revisão da Unidade concluída!' | 'Checkpoint completed!' → 'Unit review completed!' |
| `zh.path.banner.checkpoint` | '🧩 Ponto de verificação' → '🧩 Revisão da Unidade' | '🧩 Checkpoint' → '🧩 Unit review' |
| `fr.mission.speedReview1` | 'Complete uma sessão de Revisão Rápida' → 'Complete uma sessão de Revisão rápida' | 'Complete a Speed Review session' → 'Complete a Quick review session' |
| `fr.mission.overdue` | { one: 'Revise {n} carta em atraso', other: 'Revise {n} cartas em atraso' } → { one: 'Revise {n} cartão atrasado', other: 'Revise {n} cartões atrasados' } | (igual) |
| `zh.progress.statDue` | removida | removida |
| `progress.statReview` | 'Para revisar' → 'Já aprendidos' | 'To review' → 'Learned' |
| `progress.statDueNow` | 'Devidos' → 'Para hoje' | 'Due' → 'Due today' |
| `fr.trail.freeDictation` | { one: '{n} ditado Free', other: '{n} ditado Free' } → { one: '{n} ditado grátis', other: '{n} ditados grátis' } | (igual) |
| `review.deck.delete` | 'Excluir' → 'Apagar' | (igual) |
| `review.deck.deleteTitle` | 'Excluir este deck irá excluir todos os cartões dentro dele' → 'Apagar este deck irá apagar todos os cartões dentro dele' | (igual) |
| `review.deck.alsoDeleted` | ' (que também serão excluídos)' → ' (que também serão apagados)' | (igual) |
| `review.deck.deletePermanently` | 'Excluir permanentemente' → 'Apagar permanentemente' | (igual) |
| `review.deck.deleteConfirm` | 'Excluir "{name}" e {n} {cards} para sempre? O histórico de revisão também será apagado. Isso não pode ser desfeito.' → 'Apagar "{name}" e {n} {cards} para sempre? O histórico de revisão também será apagado. Isso não pode ser desfeito.' | (igual) |
| `review.deck.deletedMoved` | 'Deck excluído. {n} {what} para "{dest}".' → 'Deck apagado. {n} {what} para "{dest}".' | (igual) |
| `review.deck.deletedWith` | 'Deck excluído com {n} {cards}.' → 'Deck apagado com {n} {cards}.' | (igual) |
| `review.panel.deleteOne` | '🗑 Excluir' → '🗑 Apagar' | (igual) |
| `review.panel.deleteManyConfirm` | 'Excluir {n} {items} ({total} {cards}) para sempre? O histórico de revisão também será apagado.' → 'Apagar {n} {items} ({total} {cards}) para sempre? O histórico de revisão também será apagado.' | (igual) |
| `review.panel.deletedWhat.one` | 'conteúdo excluído' → 'conteúdo apagado' | (igual) |
| `review.panel.deletedWhat.other` | 'conteúdos excluídos' → 'conteúdos apagados' | (igual) |
| `review.tags.hint` | 'Tags valem para o cartão inteiro (todos os cards gerados dele) e servem para filtrar a Revisão. Até {max} tags de {l... → 'Tags valem para o item inteiro (todos os cartões gerados dele) e servem para filtrar a Revisão. Até {max} tags de {l... | 'Tags apply to the whole card (every card generated from it) and can be used to filter Review. Up to {max} tags of {l... → 'Tags apply to the whole item (every card generated from it) and can be used to filter Review. Up to {max} tags of {l... |
| `publicProfile.sectionFlashcards` | 'Flashcards' → 'Cartões' | 'Flashcards' → 'Cards' |
| `publicProfile.labelNote` | 'Nota' → 'Observação' | (igual) |
| `admin.students.metrics.noCards` | 'Você ainda não criou nenhum cartão para este aluno, na aba "📇 Flashcards".' → 'Você ainda não criou nenhum cartão para este aluno, na aba "Cartões".' | 'You haven\'t created any cards for this student yet, in the "📇 Flashcards" tab.' → 'You haven\'t created any cards for this student yet, in the "Cards" tab.' |
| `admin.flashcards.edit.modeFlip` | ' Flashcard normal' → ' Cartão normal' | ' Normal flashcard' → ' Normal card' |
| `admin.notifications.btn.delete` | 'Excluir' → 'Apagar' | (igual) |
| `admin.notifications.confirm.delete` | 'Excluir esta variante de notificação?' → 'Apagar esta variante de notificação?' | (igual) |
| `admin.badges.catalog.deleteTitle` | 'Excluir badge (e todas as concessões dele)' → 'Apagar badge (e todas as concessões dele)' | (igual) |
| `admin.badges.grant.notePh` | 'ex: reportou o bug do streak' → 'ex: reportou o bug da sequência' | (igual) |
| `admin.badges.confirm.delete` | 'Excluir este badge e todas as concessões dele?' → 'Apagar este badge e todas as concessões dele?' | (igual) |
| `admin.analytics.lesson.unit_checkpoint` | '✅ Checkpoint de unidade' → '✅ Unidade concluída' | '✅ Unit checkpoint' → '✅ Unit completed' |
| `admin.analytics.lesson.flashcard_review` | '🔁 Sessão de flashcards' → '🔁 Sessão de cartões' | '🔁 Flashcard session' → '🔁 Card session' |
| `admin.analytics.resumo.rateNA` | 'Taxa de conclusão indisponível: ninguém começou um exercício dos tipos contados aqui (flashcards, revisão rápida, jo... → 'Taxa de conclusão indisponível: ninguém começou um exercício dos tipos contados aqui (cartões, revisão rápida, jogo ... | 'Completion rate unavailable: nobody started an exercise of the types counted here (flashcards, speed review, memory ... → 'Completion rate unavailable: nobody started an exercise of the types counted here (cards, quick review, memory game,... |
| `admin.analytics.resumo.rateNote` | 'A taxa de conclusão só usa os exercícios que têm um "começo" registrado (flashcards, revisão rápida, jogo da memória... → 'A taxa de conclusão só usa os exercícios que têm um "começo" registrado (cartões, revisão rápida, jogo da memória, h... | 'The completion rate only uses exercises that have a recorded "start" (flashcards, speed review, memory game, hanzi, ... → 'The completion rate only uses exercises that have a recorded "start" (cards, quick review, memory game, hanzi, dicta... |
| `admin.analytics.resumo.xpNote` | 'Quer ver XP total e sequência de dias (streak)? Isso está na aba Engajamento, não aqui no Resumo.' → 'Quer ver XP total e sequência de dias? Isso está na aba Engajamento, não aqui no Resumo.' | (igual) |
| `admin.analytics.prog.units` | 'Unidades concluídas por aluno (checkpoints)' → 'Unidades concluídas por aluno' | 'Units completed per student (checkpoints)' → 'Units completed per student' |
| `admin.analytics.prog.unitsNote` | 'Nem toda unidade tem lições internas (ex: unidades de gramática no francês) — essas pontuam como um bloco único de e... → 'Nem toda unidade tem lições internas (ex: unidades de gramática no francês) — essas pontuam como um bloco único de e... | 'Not every unit has internal lessons (e.g. grammar units in French): those count as a single block of exercises, and ... → 'Not every unit has internal lessons (e.g. grammar units in French): those count as a single block of exercises, and ... |
| `admin.analytics.eng.xpNote2` | 'Sequência é uma aproximação calculada a partir dos dias com atividade registrada, não o streak "oficial" do app (que... → 'Sequência é uma aproximação calculada a partir dos dias com atividade registrada, não a sequência "oficial" do app (... | (igual) |
| `admin.panel.tab.flashcards` | '📇 Flashcards' → '📇 Cartões' | '📇 Flashcards' → '📇 Cards' |
| `ui.myCards.sub` | 'Crie seus próprios flashcards: palavras e frases que você quer memorizar, mesmo que não estejam na trilha.' → 'Crie seus próprios cartões: palavras e frases que você quer memorizar, mesmo que não estejam na trilha.' | 'Create your own flashcards: words and phrases you want to memorize, even if they\'re not in the path.' → 'Create your own cards: words and phrases you want to memorize, even if they\'re not in the path.' |
| `badge.track.course1.goal.4` | 'Tire 100% em todos os pontos de verificação do {level}' → 'Tire 100% em todos os Pontos de verificação do {level}' | 'Score 100% on every checkpoint of {level}' → 'Score 100% on every Checkpoint of {level}' |
| `badge.track.aced.goal` | 'Tire 100% em {n} pontos de verificação' → 'Tire 100% em {n} Pontos de verificação' | 'Score 100% on {n} checkpoints' → 'Score 100% on {n} Checkpoints' |
| `badge.track.aced.goal.1` | 'Tire 100% em um ponto de verificação' → 'Tire 100% em um Ponto de verificação' | 'Score 100% on a checkpoint' → 'Score 100% on a Checkpoint' |
| `badge.track.aced.goal.4` | 'Tire 100% em todos os pontos de verificação do {level}' → 'Tire 100% em todos os Pontos de verificação do {level}' | 'Score 100% on every checkpoint of {level}' → 'Score 100% on every Checkpoint of {level}' |
| `students.ev.act.unit_checkpoint` | 'ponto de verificação' → 'unidade concluída' | 'checkpoint' → 'unit completed' |
| `students.ev.act.flashcard_review` | 'revisão de flashcards' → 'revisão de cartões' | 'flashcard review' → 'card review' |
| `trail.map.closePanel` | removida | removida |
| `trail.map.checkpointShort` | 'Ponto' → 'Ponto de verificação' | (igual) |
| `trail.map.unit.toReview` | '🔁 {n} para revisar' → { one: '🔁 {n} cartão para revisar hoje', other: '🔁 {n} cartões para revisar hoje' } | '🔁 {n} to review' → { one: '🔁 {n} card to review today', other: '🔁 {n} cards to review today' } |
| `trail.map.checkpoint.redo` | 'Refazer o ponto' → 'Refazer o Ponto de verificação' | 'Retake the checkpoint' → 'Retake the Checkpoint' |
| `tagManager.err.systemProtected` | 'Tags de atribuição (criado-por-…) são de sistema e não podem ser criadas, renomeadas ou excluídas.' → 'Tags de atribuição (criado-por-…) são de sistema e não podem ser criadas, renomeadas ou apagadas.' | (igual) |
| `tagManager.delete.askHtml` | 'Excluir <strong>#{tag}</strong>? Essa Tag será removida de {notes}. A remoção é global no seu escopo e não pode ser ... → 'Apagar <strong>#{tag}</strong>? Essa Tag será removida de {notes}. A remoção é global no seu escopo e não pode ser d... | (igual) |
| `tagManager.delete.confirm` | 'Excluir Tag' → 'Apagar Tag' | (igual) |
| `tagManager.delete.title` | 'Excluir tag' → 'Apagar tag' | (igual) |
| `tagManager.delete.aria` | 'Excluir tag {tag}' → 'Apagar tag {tag}' | (igual) |
| `tagManager.hint.teacher` | 'Tags dos seus cartões de aluno (todos os alunos e idiomas). Renomear ou excluir vale para todos eles.' → 'Tags dos seus cartões de aluno (todos os alunos e idiomas). Renomear ou apagar vale para todos eles.' | (igual) |
| `tagManager.deleting` | 'Excluindo…' → 'Apagando…' | (igual) |
| `deck.delete.err.notOwn` | 'Só é possível excluir um Deck pessoal seu.' → 'Só é possível apagar um Deck pessoal seu.' | (igual) |
| `deck.delete.err.moveFailed` | 'Não foi possível mover os cartões agora. Nada foi excluído.' → 'Não foi possível mover os cartões agora. Nada foi apagado.' | (igual) |
| `deck.delete.err.deleteCardsFailed` | 'Não foi possível excluir os cartões agora. Nada foi excluído.' → 'Não foi possível apagar os cartões agora. Nada foi apagado.' | (igual) |
| `deck.delete.err.movedButDeck` | 'Os cartões foram movidos, mas não foi possível excluir o Deck agora. Tente de novo.' → 'Os cartões foram movidos, mas não foi possível apagar o Deck agora. Tente de novo.' | (igual) |
| `deck.delete.err.deletedButDeck` | 'Os cartões foram excluídos, mas não foi possível excluir o Deck agora. Tente de novo.' → 'Os cartões foram apagados, mas não foi possível apagar o Deck agora. Tente de novo.' | (igual) |
| `publicDeck.publish.ownKeyHtml` | 'Cada Deck tem a própria chave: <strong>subdecks não mudam junto</strong>. O campo "nota privada" dos cartões nunca é... → 'Cada Deck tem a própria chave: <strong>subdecks não mudam junto</strong>. O campo "Observação" dos cartões nunca é p... | 'Each Deck has its own switch: <strong>subdecks don\'t change with it</strong>. The cards\' "private note" field is n... → 'Each Deck has its own switch: <strong>subdecks don\'t change with it</strong>. The cards\' "Note" field is never pub... |
| `restart.zero.memory` | (igual) | 'The memory of your path flashcards (they come back as new)' → 'The memory of your path cards (they come back as new)' |
| `restart.keep.cards` | (igual) | 'Your teacher\'s flashcards and your own, with their memory' → 'Your teacher\'s cards and your own, with their memory' |
| `accountDelete.hint` | (igual) | 'Deletes your account and everything linked to it: progress, flashcards, achievements, friendships, photos and files.... → 'Deletes your account and everything linked to it: progress, cards, achievements, friendships, photos and files. This... |
| `accountDelete.modal.explain` | (igual) | 'This deletes your progress, your flashcards, the records your teacher keeps about you (lessons and flashcards), and ... → 'This deletes your progress, your cards, the records your teacher keeps about you (lessons and cards), and your files... |
| `admin.flashcards.linkFirst` | (igual) | 'Link a student first, in the "🎓 Students" tab, to be able to create flashcards for them.' → 'Link a student first, in the "🎓 Students" tab, to be able to create cards for them.' |
| `admin.analytics.lesson.speed_review` | (igual) | '⚡ Speed review' → '⚡ Quick review' |
| `ui.reviewReminder.title` | (igual) | 'Shall we do a quick review?' → 'Shall we do a short review?' |
| `badge.explorer.desc` | (igual) | 'Used review, speed review and the memory game' → 'Used review, quick review and the memory game' |
| `students.ev.act.speed_review` | (igual) | 'speed review' → 'quick review' |
| `trail.unitReview.title` (nova) | Revisão da Unidade | Unit review |
| `progress.statToday`, `progress.statTodayTitle` | removidas (contador saiu do Perfil) | removidas |
| `CHALLENGE_I18N['pt-BR']['tier.free']` (`shared/desafios.js`) | Free -> Grátis | (igual, Free) |
| lição `checkpoint` das unidades (camadas `courses/*-pt-BR/layer.js`, `*/content.en.js`) | Ponto de verificação -> Revisão da Unidade (38 lições) | Checkpoint -> Unit review |

HTML fixo: `ui.myCards.sub` (texto padrão no `fr/index.html` e `zh/index.html`). Ícone: `shared/recomecar-curso.js` ⚡ -> ⏱.
Regra curta nova em `.claude/rules/i18n.md` (vocabulário único).

### 9.3 Testes

Ajustados de propósito (só o texto que mudou):
- `tests/i18n/test_i18n_unit.js`: lista `ETAPA7_DONA` (pares antes -> depois) entrou em `DELIBERATE_PT_CHANGES`; `trail.unitReview.title`
  em `NEW_KEYS`; saíram de `EN_SAME_AS_PT_OK` as chaves apagadas ou que deixaram de ser iguais (`review.mode.flashcard.name`,
  `review.mode.speed.name`, `publicProfile.sectionFlashcards`, `admin.panel.tab.flashcards`).
- `tests/camada-curso/test_equivalence.js`: a comparação "arquivos em disco == original" aplica a troca do título da lição final.
- `tests/deck-browser/test_playwright.js`: "Excluir"/"Excluir este deck irá excluir..."/"Excluir permanentemente" -> "Apagar...".
- `tests/desafios-modulo/test_playwright.js`: selo "Free" -> "Grátis" e "1 ditado Free" -> "1 ditado grátis".
- `tests/k2e/test_playwright.js`: rótulos do Perfil "Já aprendidos"/"Para hoje" e o contador "Para estudar hoje" ausente.
- `tests/k7/test_k7_student_analytics.js`: a regra da fila da sessão continua conferida pela função; o Perfil não mostra mais o contador.
- `tests/painel-admin/test_analytics_playwright.js`: "Sessão de flashcards" -> "Sessão de cartões".
- Testes "antes x depois" da paridade (`test_conjugacao.js`, `test_ditados.js`, `test_modulos_niveis.js`, `test_quase_iguais.js`):
  neutralização nova `tests/paridade-sites/etapa7-neutro.js` aplicada ao lado de antes (lista dos textos desta seção), sem apagar
  nenhuma comparação.

Regressão (antes = árvore desta branch com a `main` mesclada, sem as mudanças; depois = com as mudanças):

| Teste | Antes | Depois |
|---|---|---|
| `tests/i18n/test_i18n_unit.js` | 2341/2341 | 2335/2335 |
| `tests/i18n/test_playwright.js` | 209/209 | 209/209 |
| `tests/i18n/test_sem_portugues_en.js` | 6/6 | 6/6 |
| `tests/acessibilidade/test_playwright.js` | 60/60 | 60/60 |
| `tests/trilha/test_a0_eligibility.js` | 12/12 | 12/12 |
| `tests/trilha/test_checkpoint_exam.js` | 43/43 | 43/43 |
| `tests/trilha/test_grammar_validator.js` | 8/8 | 8/8 |
| `tests/trilha/test_mobile_shell.js` | 108/108 | 108/108 |
| `tests/trilha/test_review_milestone.js` | 14/14 | 14/14 |
| `tests/trilha/test_review_milestone_ui.js` | 34/34 | 34/34 |
| `tests/trilha/test_skip_checkpoint_ui.js` | 19/19 | 19/19 |
| `tests/trilha/test_trail_helpers.js` | 6/6 | 6/6 |
| `tests/trilha/test_trail_map.js` | 61/61 | 61/61 |
| `tests/trilha/test_trail_state_model.js` | 37/37 | 37/37 |
| `tests/trilha/test_trail_ui.js` | 86/86 | 86/86 |
| `tests/trilha/test_zh_map_stories.js` | 4/4 | 4/4 |
| `tests/checkpoint-zh/test_playwright.js` | 25/25 | 25/25 |
| `tests/paridade-sites/test_atalhos.js` | 92/92 | 92/92 |
| `tests/paridade-sites/test_conjugacao.js` | 343/343 | 343/343 |
| `tests/paridade-sites/test_conjugacao_motor.js` | 45/45 | 45/45 |
| `tests/paridade-sites/test_contrato_lang_hooks.js` | 29/29 | 29/29 |
| `tests/paridade-sites/test_correcoes_5d.js` | 4/4 | 4/4 |
| `tests/paridade-sites/test_css_compartilhado.js` | 5/5 | 5/5 |
| `tests/paridade-sites/test_desafios.js` | quebra (erro) | quebra (erro) |
| `tests/paridade-sites/test_desafios_css.js` | falha (dark 1200) | falha (dark 1200) |
| `tests/paridade-sites/test_desafios_motor.js` | 49/49 | 49/49 |
| `tests/paridade-sites/test_ditados.js` | 828/828 | 828/828 |
| `tests/paridade-sites/test_ditados_motor.js` | 41/41 | 41/41 |
| `tests/paridade-sites/test_gramatica_cenario.js` | 46/46 | 46/46 |
| `tests/paridade-sites/test_gramatica_cenario_zh_playwright.js` | 54/54 | 54/54 |
| `tests/paridade-sites/test_idioma_registro.js` | 10/10 | 10/10 |
| `tests/paridade-sites/test_licao_feedback.js` | 43/43 | 43/43 |
| `tests/paridade-sites/test_licao_feedback_playwright.js` | 16/16 | 16/16 |
| `tests/paridade-sites/test_modulos_niveis.js` | 90/90 | 90/90 |
| `tests/paridade-sites/test_modulos_niveis_zh_playwright.js` | 95/95 | 95/95 |
| `tests/paridade-sites/test_quase_iguais.js` | 2768/2768 | 2768/2768 |
| `tests/paridade-sites/test_voz.js` | ok | ok |
| `tests/deck-browser/test_playwright.js` | 208/208 | 208/208 |
| `tests/janelas-revisao/test_playwright.js` | 40/40 | 40/40 |
| `tests/painel-cartoes/test_cards_ui_unit.js` | 45/45 | 45/45 |
| `tests/painel-cartoes/test_playwright.js` | 264/264 | 264/264 |
| `tests/painel-cartoes/test_verso_preenchimento.js` | 35/35 | 35/35 |
| `tests/painel-professora/test_playwright.js` | 691/691 | 691/691 |
| `tests/limite-corte/test_cut_unit.js` | 30/30 | 30/30 |
| `tests/limite-corte/test_playwright.js` | 38/38 | 38/38 |
| `tests/desafios-album/test_playwright.js` | 66/66 | 66/66 |
| `tests/desafios-cloze/test_playwright.js` | 38/38 | 38/38 |
| `tests/desafios-comando-idioma/test_playwright.js` | 48/48 | 48/48 |
| `tests/desafios-conclusao/test_playwright.js` | 19/19 | 19/19 |
| `tests/desafios-exemplos-traducao/test_playwright.js` | 112/112 | 112/112 |
| `tests/desafios-expressoes-passos/test_playwright.js` | 175/175 | 175/175 |
| `tests/desafios-idioma-site/test_playwright.js` | 41/41 | 41/41 |
| `tests/desafios-modulo/test_playwright.js` | 75/75 | 75/75 |
| `tests/desafios-progresso/test_playwright.js` | 22/23 (falha) | 22/23 (falha) |
| `tests/desafios-ptpt/test_playwright.js` | 8/8 | 8/8 |
| `tests/desafios-ptpt/test_ptpt.js` | 282/282 | 282/282 |
| `tests/desafios-revisar-erros/test_playwright.js` | 36/36 | 36/36 |
| `tests/conjugacao/test_playwright.js` | 80/80 | 80/80 |
| `tests/recomecar-curso/test_playwright.js` | 220/220 | 220/220 |
| `tests/recomecar-curso/test_unit.js` | 30/30 | 30/30 |
| `tests/janelas-topo/test_calculo.js` | 35/35 | 35/35 |
| `tests/janelas-topo/test_playwright.js` | 276/276 | 276/276 |
| `tests/boas-vindas/test_playwright.js` | 190/190 | 190/190 |
| `tests/conquistas/test_badge_tracks.js` | 76/76 | 76/76 |
| `tests/conquistas/test_playwright.js` | 66/66 | 66/66 |
| `tests/k10/test_playwright.js` | 114/114 | 114/114 |
| `tests/k2e/test_playwright.js` | 28/28 | 28/28 |
| `tests/k7/test_k7_student_analytics.js` | 40/40 | 40/40 |
| `tests/k3/test_k3_playwright.js` | 20/20 | 20/20 |
| `tests/k5/test_k5_deck_analytics.js` | 32/32 | 32/32 |
| `tests/k5/test_k5_playwright.js` | 18/18 | 18/18 |
| `tests/painel-alunos/test_playwright.js` | 256/256 | 256/256 |
| `tests/painel-alunos/test_students_ui_unit.js` | 61/61 | 61/61 |
| `tests/fase-h/test_teacher_experience_unit.js` | 76/78 (falha) | 76/78 (falha) |
| `tests/fase-h/test_playwright.js` | quebra (erro) | quebra (erro) |
| `tests/fase-j/test_tag_manager_unit.js` | 85/85 | 85/85 |
| `tests/conta-excluir/test_core.js` | 16/16 | 16/16 |
| `tests/conta-excluir/test_playwright.js` | 20/20 | 20/20 |
| `tests/camada-curso/test_equivalence.js` | 75/75 | 75/75 |
| `tests/lembrete-revisao/test_playwright.js` | 26/26 | 26/26 |
| `tests/modo-foco/test_playwright.js` | 19/19 | 19/19 |
| `tests/revisao-proposta-a/test_playwright.js` | 60/60 | 60/60 |
| `tests/painel-admin/test_analytics_playwright.js` | 174/174 | 174/174 |
| `tests/notificacoes/test_playwright.js` | 36/36 | 36/36 |
| `tests/configuracoes/test_playwright.js` | 27/27 | 27/27 |
| `tests/zh-manual/test_playwright.js` | 27/27 | 27/27 |
| `tests/i18n/test_content_en.js` | 29/30 (falha) | 29/30 (falha) |
| `tests/fase-k6/test_playwright.js` | 28/28 | 28/28 |
| `tests/fase-g/test_playwright.js` | 68/68 | 68/68 |
| `tests/fase-f/test_playwright.js` | 50/50 | 50/50 |
| `tests/curriculo-ids/test_playwright_0b.js` | 23/23 | 23/23 |
| `tests/revisao-ajustes/test_playwright.js` | 48/48 | 48/48 |
| `tests/fase-i/test_playwright.js` | 48/48 | 48/48 |
| `tests/metas-wizard/test_playwright.js` | 18/18 | 18/18 |

Falhas que já existiam antes (iguais antes e depois, nada a ver com o vocabulário): `test_desafios.js` (TypeError em `fingerprint`),
`test_desafios_css.js` (regras do tema escuro em 1200), `desafios-progresso` 22/23 ("barra existe"), `fase-h` (unit 76/78 e
navegador, "zh H5 aluno vê a árvore") e `i18n/test_content_en.js` 29/30 (aviso na unidade de gramática). `i18n/test_i18n_unit.js`
tem 6 verificações a menos porque 6 chaves saíram do catálogo. `test_conjugacao.js` falhou 1 vez por instabilidade (94 x 92 cenas
no jogo) numa rodada em paralelo e passou 343/343 nas outras duas.

### 9.4 Capturas

fr e zh, tema claro, 390 e 1280 (site em pt-BR), pasta temporária desta sessão
`/tmp/claude-0/-home-user-mandarimdozero/3e41ab12-78b3-5f2b-964b-fef249117fbb/scratchpad/etapa7-lotes/shots/` (roteiro
`capturas.js` na pasta acima): `1-unidade-revisao-da-unidade` (trilha com a última lição "Revisão da Unidade"),
`2-mapa-unidade-fechar` (painel da unidade com "🔁 N cartões para revisar hoje"; o ✕ tem aria "Fechar"), `3-perfil-progresso`
(contadores sem "Para estudar hoje", com "Já aprendidos" e "Para hoje"), `4-revisao-rapida` e `5-revisao-decks` (aba Revisão:
modo "Revisão rápida"), `6-deck-apagar` (tela do Deck pessoal com "Apagar"), `7-adicionar-observacao` (janela Adicionar cartão
com "Observação (opcional)"). 0 erros de página nas 4 rodadas.

### 9.5 Fica para depois

- Lote 1b (site/app), lote 3 ("para hoje" no resto: `deck.countsFull`, `deck.countsDetail`, Revisão, Professora, banco) e os rótulos
  que ainda dizem "Para revisar"/"Devidos" fora do Perfil.
- Lote 4 (Navegar) e lote 5 (Reforço) cancelados pela dona.
- `admin.panel.tab.flashcards` mudou de texto, mas nenhuma tela usa a chave (candidata a apagar num próximo lote).
