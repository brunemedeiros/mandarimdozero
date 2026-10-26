# Recomeçar um curso: mapa do progresso e opções

Data: 2026-10-26. **Só leitura**: nenhum código, banco ou migration foi alterado; na produção (`eigjocalzwamisgqilhg`) só `SELECT`,
com agregados (sem nomes nem dados individuais). Pergunta da dona: um aluno volta depois de anos e quer começar do zero o mesmo curso.
Regra do projeto que manda em tudo aqui: **nunca apagar progresso de memória (FSRS) por engano**.

Base: `docs/i18n/auditoria-progresso-por-curso.md` (2026-10-06) e `docs/i18n/auditoria-e3-progresso-por-curso.md` (2026-10-12), conferidas
contra o código de hoje e o banco ao vivo.

## 1. Resumo

1. O progresso de um curso mora num **bloco** de `progress.data` (uma linha por conta): `data.frances`, `data.mandarim` (cursos para
   falantes de português) e `data["frances@en"]`, `data["portugues@en"]` etc. A sequência de dias é da **conta** (`data._account`).
   Não existe histórico nem cópia de segurança: cada `saveState` regrava a linha inteira.
2. **Não existe hoje nenhuma função de apagar ou arquivar progresso**: nenhuma RPC, nenhuma tela de admin. O "Recomeçar" do Hanzi só
   reinicia o exercício de escrita na tela (`zh/app.js:2187-2193`), não apaga nada. A única coisa que apaga é excluir a conta.
3. Achado que muda o desenho: **o FSRS dos cartões da professora e dos cartões próprios mora no mesmo array `cards` do bloco do curso**,
   ao lado dos da trilha. A decisão P1 (FSRS desses cartões por idioma estudado, aprovada em 2026-10-12) **não foi implementada**: nos 3
   blocos `frances@en` da produção há 268 entradas de cartões da professora e 7 próprias, todas sem histórico, enquanto as mesmas contas
   têm 148 cartões da professora com FSRS no bloco `frances`. Qualquer "recomeçar" que trate o bloco inteiro apagaria a memória desses
   cartões. Todo recomeço tem de filtrar por `origin`.
4. Dois mecanismos de proteção atrapalham um recomeço feito pelo navegador: o guarda-corpo que recusa gravar `xp`, `totalReviews` e
   `totalAudioPlays` menores (`shared/auth.js:51`, `594`) e a corrida entre abas (uma aba aberta antes do recomeço grava o progresso velho
   por cima). Por isso o recomeço deve ser feito **no servidor**, numa RPC, com cópia de segurança e uma marca de "época" que faça aba antiga
   recusar gravar.
5. Recomendação: **A ("Recomeçar a trilha") com cópia de segurança automática por 30 dias, mais D (retomada guiada) para quem volta**. B
   entra como uma caixa opcional dentro de A ("também zerar a memória dos cartões da trilha"). C (temporadas) não compensa o custo agora.

## 2. Mapa: o que é "progresso de um curso" hoje

Legenda do dono: **curso** = bloco de `progress.data` daquele par (idioma estudado × idioma do site); **idioma** = por idioma estudado
(`language_app_key`); **conta** = um só por pessoa.

### 2.1 Dentro do bloco do curso (`progress.data[<chave>]`)

Gravação: `serializeState()` em `shared/core/estado-salvar.js:6-51`; leitura: `applySerializedState()` (`:53-131`); chave do bloco:
`progressBlockKey()` (`shared/auth.js:66-70`) e `CourseStorage.courseStorageKey()` (`shared/course-storage.js:27`); salvar e carregar:
`saveState()` (`shared/auth.js:545`) e `loadState()` (`:720`).

| Item | Campo | Dono | Observação |
|---|---|---|---|
| Lições e unidades concluídas, lição atual, erros por lição | `unitProgress[unitId]` (`started`, `completed`, `lessonIdx`, `lessonMisses`, como concluiu) | curso | Unidade **pulada** = `completed` com via `skip_test` (`shared/trail-state-model.js:92-101`, `shared/core/modulos-niveis.js:575-595`) |
| Ponto de verificação do módulo, Teste de Nível, Revisão do módulo | `checkpointProgress`, `levelTestProgress`, `reviewMilestones` | curso | `moduleSaveFields()` (`shared/core/modulos-niveis.js:57-70`) |
| Cartões da trilha (palavra e "Na frase") | `cards[]` com `origin:'study'`: só `id` + FSRS (`STUDY_PROGRESS_FIELDS`, `shared/study-trail-model.js:24-28`) e a marca `released` | curso | FSRS é por CardInstance, mas **guardado no bloco do curso**: `frances@pt-BR` e `frances@en` têm memórias separadas para a mesma palavra |
| Cartões da professora e próprios (FSRS) | `cards[]` com `origin:'teacher'`/`'self'` (objeto inteiro, `serializeCardsForSave`, `:284`) | **curso** (deveria ser idioma, P1 não feito) | Conteúdo nas tabelas `teacher_flashcards`/`own_flashcards` (por idioma); a memória vai junto no bloco |
| Cartões aposentados por mudança de currículo | `retiredStudyCards`, `_curriculumVersion` | curso | `shared/core/curriculo-progresso.js:14-20` |
| Hanzi (zh) | `hanziCards` (FSRS), `hanziLessonProgress` | curso | |
| Histórias (zh) | `storyProgress` | curso | |
| Desafios (fr) | `completedChallenges`, `challengeReviews` (revisão espaçada dos Desafios) | curso | |
| Ditados (fr) | `dictations` (melhor nota), `dictationsAced` | curso | |
| Conjugação (fr) | nada próprio: só `daily.conjugation*`, `modesUsed.conjugation` e XP | curso | A prática não guarda progresso por verbo |
| XP do curso | `xp`, `periodXp` (semana) | curso | `xp` é vitalício (guarda-corpo) |
| Contadores vitalícios | `totalReviews`, `totalAudioPlays`, `everUsedSpeedReview`, `everUsedMatchGame`, `modesUsed`, `reviewRecords`, `reviewTimeStats` | curso | Alimentam conquistas |
| Missões do dia | `daily` | curso | O cron lê `daily.missions` |
| Ajustes do motor de memória | `studySettings` | curso (P2 pedia idioma; não feito) | Novas por dia, frequência, filtros |
| Meta e lembrete | `studyGoal` | curso (espelho) | |
| Boas-vindas da 1ª lição | `welcome` | curso | Outra sessão mexe nisso agora |
| Resumo para Perfil e professora | `progressSummary` | curso | Recalculado a cada save |
| Gaveta de palavras | `cardVariants` | curso | Vazia em produção |
| Espelho da sequência | `streak`, `lastStudyDay`, `activityLog`, `dailyLessonsLog`, `hadStreakComeback`, `lastReviewReminderDay` | espelho da conta | Só os dias deste curso; a fonte é `_account` |

### 2.2 Fora do bloco

| Item | Onde | Dono | Observação |
|---|---|---|---|
| Sequência de dias, dias estudados | `progress.data._account` (`shared/account-progress.js:19`); tabelas `study_days` (dia com XP, 109) e `streak_milestones` | conta | |
| Registro de cursos | `progress.data._meta.courses[courseId] = {storageKey, startedAt}`, `_meta.currentCourse`, `_meta.uiLanguage` | conta | `registerCourse` só acrescenta (`shared/course-storage.js:59`) |
| XP semanal e Ranking | `weekly_xp (user_id, week_start, language_app_key, amount)` | idioma (soma dos cursos do idioma, `weeklyXpForLanguage`, `:67`) | Amigos e Pódio leem daqui |
| Conquistas | `earned_badges (user_id, language_app_key, badge_id)`; `badge_grants` (dadas pela professora) | idioma; as de conta valem em todos (`isAccountBadge`) | Nível de conquista nunca cai: `max(alcançado, gravado)` (`shared/badge-tracks.js:127`) |
| Decks e Course Decks | `decks` (kinds `course`, `personal`, `teacher`...) | idioma | Course Deck é estrutura (unidade); não guarda progresso |
| Cartões próprios | `own_flashcards` | idioma | 7 cartões, 2 donos na produção |
| Cartões da professora | `teacher_flashcards` | idioma (por aluno) | 1036 cartões |
| Banco de Revisão | `review_bank_items` (com `fsrs` espelhado do estudo em casa, 112), `review_bank_reviews`, `review_bank_students.linked_student_id` | idioma, do vínculo | O FSRS "de verdade" do aluno é o do bloco; o do item é espelho |
| Vínculo com a professora | `teacher_students` | idioma | 14 vínculos ativos |
| Missões em dupla | `duo_missions` (`base_a/base_b` = XP da semana) | conta | |
| Avisos | `notification-cron`: `blockForLanguage` (`index.ts:554`) escolhe o bloco do curso aberto por último; `computeReviewOverdueCount` (`:293`) usa o mapa gerado `STUDY_ITEM_GATE` (`:217`) com `released`/`unitProgress` | lê o curso | |
| Professora vê | RPCs `get_teacher_student_overview`, `get_teacher_student_metrics`, `get_teacher_student_deck_counts` leem o bloco | lê o curso | |
| Perfil público, amigos | `get_public_profile_stats`, `friends_extras`, `_account_streak`, `_studied_languages` | lê os blocos | |

### 2.3 Regras do código que pesam num recomeço

- **Portão da Revisão**: cartão da trilha só entra na Revisão quando a lição terminou, ou quando já tem `released`
  (`isCardLessonCompleted`, `shared/core/revisao-decks.js:661-675`; o cron repete a regra). Se `released` for mantido, zerar
  `unitProgress` **não** tira os cartões da Revisão. Produção: 1878 cartões com `released` nos blocos `frances`, **0 no `mandarim`** (no zh,
  zerar `unitProgress` hoje tiraria da Revisão os cartões já estudados; o recomeço tem de carimbar `released` antes).
- **XP de refazer**: "refazer lição concluída 0", lição de hanzi e história já concluídas não pagam de novo. Depois de zerar `unitProgress`,
  `hanziLessonProgress` e `storyProgress`, tudo volta a pagar XP. Decisão da dona (pergunta 3).
- **Guarda-corpo**: `xp`, `totalReviews`, `totalAudioPlays` nunca podem diminuir no bloco (`shared/auth.js:51`, `594`). Recomeço que zere
  XP pelo navegador é recusado.
- **Corrida entre abas**: `saveState` troca o bloco inteiro pelo STATE da aba (`shared/auth.js:615`). Uma segunda aba aberta antes do
  recomeço, sem XP menor, desfaz o recomeço sem aviso.
- **Formato antigo do zh**: 6 linhas ainda têm cartões na raiz de `progress.data`, 3 delas também com `mandarim`. Se o bloco `mandarim`
  fosse **apagado**, `loadLegacyState` ressuscitaria o progresso velho da raiz. Recomeço nunca apaga a chave: regrava o bloco.

## 3. Produção hoje (2026-10-26, só agregados)

| Medida | Valor |
|---|---|
| Linhas em `progress` | 41; 33 com algum bloco de curso |
| Contas com mais de um curso | **4**: 1 `frances+mandarim`, 1 `frances+frances@en`, 2 `frances+frances@en+mandarim` |
| Blocos | `frances` 26, `mandarim` 10, `frances@en` 3 (os 3 sem nenhum cartão estudado e XP 0), `portugues*` 0 |
| Tamanho do bloco (texto) | mediana: fr 123 KB, zh 158 KB; máximo 447 KB. Linha inteira: mediana 122 KB, **máximo 863 KB** |
| Cartões por bloco | média 504 (fr), 395 (zh) |
| FSRS da trilha | 1352 cartões estudados em 17 contas (fr), 170 em 8 contas (zh) |
| FSRS da professora | 148 cartões com histórico, todos no bloco `frances` |
| Unidades concluídas | 156 (fr), 19 (zh) |
| Parados há mais de 30 dias | 3 blocos fr, 2 zh (o dia mais antigo registrado é 30/08/2026: o caso "volta depois de anos" ainda não existe) |
| Apagar/arquivar progresso | **nenhuma** RPC, gatilho ou tela; `progress` tem RLS só de ler, inserir e atualizar a própria linha (não há política de DELETE) |

**O que a exclusão de conta apaga** (`delete-my-account` v1; `supabase/functions/delete-my-account/core.mjs`): recusa professora e admin;
apaga arquivos (avatar, mídia dos cartões, fotos do mural, capturas dos reports), limpa e-mail e captura dos reports (o report fica),
apaga `teacher_support_materials` do aluno e **a pessoa no Banco de Revisão vinculada a ele** (`review_bank_students`), e então apaga o
usuário; o banco apaga em cascata todo o resto (`progress`, `weekly_xp`, `earned_badges`, `own_flashcards`, `teacher_flashcards` dele,
`review_bank_items/reviews`, `teacher_students`, amigos, avisos, `study_days`, `usage_events`...). Não serve como "recomeçar": apaga tudo,
inclusive os cartões da professora e o histórico do Banco.

## 4. Princípios comuns a qualquer opção

1. **Nada some sem cópia**: antes de mexer, o bloco inteiro vai para uma tabela nova `progress_snapshots` (dono, curso, motivo, data,
   `data jsonb`, `expires_at`). Tabela separada, não dentro de `progress.data`: a linha já chega a 863 KB e é relida e regravada a cada save.
2. **No servidor, numa transação**: RPC `security definer` (`restart_course(p_course_id, p_scope)`) copia, recomeça e grava uma marca
   `_meta.courses[courseId].epoch` (+1) e `restartedAt`. O cliente passa a mandar a época que carregou; `saveState` recusa gravar se a
   época do servidor for maior (aba antiga) e recarrega. Sem isso, a corrida entre abas desfaz o recomeço.
3. **Nunca tocar** em: cartões `origin:'teacher'`/`'self'` e seu FSRS, `teacher_flashcards`, `own_flashcards`, Decks, Banco de Revisão,
   vínculo com a professora, `_account` (sequência), `weekly_xp`, `earned_badges`, `badge_grants`, `xp`, `totalReviews`, `totalAudioPlays`,
   `everUsed*`, `modesUsed`, `reviewRecords`, `studySettings`, `studyGoal`, outros cursos.
4. **Desfazer**: `restore_course_snapshot(p_id)` devolve o bloco copiado (mantendo o XP maior entre os dois, para o guarda-corpo e o
   Ranking não verem XP sumir).
5. **Professora avisada**: aluno vinculado que recomeça aparece no painel dela (linha "Recomeçou o curso em DD/MM"), para ela não achar
   que o progresso sumiu por erro.

## 5. As opções

### A) Recomeçar a trilha

- **O que a pessoa vê**: em Configurações (ou no menu da bandeira, na linha do curso) "Recomeçar a trilha". Janela de confirmação:
  "A trilha volta para a primeira lição. Seus cartões continuam na Revisão com a memória de agora, e seu XP, sua sequência e suas
  conquistas continuam iguais. Dá para desfazer por 30 dias." Depois: trilha do começo, Revisão igual.
- **Zera** (só o curso aberto): `unitProgress`, `checkpointProgress`, `levelTestProgress`, `reviewMilestones`; no zh `hanziLessonProgress`
  e `storyProgress`; `welcome` (a pergunta 6 decide). `currentLevel` volta ao primeiro nível.
- **Mantém**: todo o FSRS (trilha, hanzi, professora, próprios), `released` (carimbado antes, ver 2.3), XP, contadores, conquistas,
  missões do dia, Desafios e Ditados (a pergunta 4 decide), tudo da seção 4 item 3.
- **Risco**: baixo. Nenhuma memória perdida. Efeitos: a lição refeita mostra palavras que já estão na Revisão (normal, é reaprender);
  XP de lição volta a pagar (pergunta 3); a barra das conquistas de curso (unidades, palavras) mostra o valor novo, mas o nível já ganho
  não cai. Aviso de revisão atrasada continua igual.
- **Desfazer**: sim (cópia por 30 dias).
- **Esforço**: 1 migration (tabela `progress_snapshots` + 2 RPCs + limpeza dos vencidos no cron), cliente (botão, janela, época no
  `saveState`, recarregar depois), textos pt-BR e en, testes (unidade da RPC com ROLLBACK, navegador fr/zh × claro/escuro × celular, duas
  abas). Sem Edge Function. Médio.
- **Grátis ou Premium**: grátis (é sobre o próprio progresso; cobrar para recomeçar pune quem volta).

### B) Recomeçar do zero (trilha + memória dos cartões da trilha)

- **O que a pessoa vê**: a mesma janela de A com uma caixa desmarcada "Também apagar a memória dos cartões da trilha (eles voltam como
  novos e só reaparecem quando você refizer as lições)". Ao marcar, um segundo aviso em vermelho, digitar "RECOMEÇAR" para confirmar.
- **Zera**: tudo de A, mais o FSRS e o `released` dos cartões `origin:'study'` (e `hanziCards` no zh); `retiredStudyCards` também (é
  memória arquivada da trilha). Desafios: `challengeReviews` volta junto se a pessoa escolher recomeçar os Desafios.
- **Mantém**: FSRS de professora e próprios (filtro por `origin`), XP total, contadores, conquistas, sequência, Ranking, Banco.
- **Risco**: médio. Perde-se de propósito a memória da trilha, incluindo a dificuldade de cada palavra, que o FSRS usaria bem: depois de
  anos parado, o FSRS já trata a palavra esquecida como lapso e reaprende sozinho, sem precisar apagar. O ganho real de B é só psicológico
  (fila de Revisão vazia). O aviso de revisão atrasada some (cartões viram New).
- **Desfazer**: sim, por N dias (a cópia guarda o bloco inteiro). Depois de N dias, não.
- **Esforço**: o de A mais um ramo na RPC e testes de que nenhum cartão `teacher`/`self` perdeu histórico (contagem antes e depois).
  Pequeno a mais sobre A.
- **Grátis ou Premium**: grátis.

### C) Novo começo sem apagar (temporadas)

- **O que a pessoa vê**: "Começar uma nova temporada do curso"; a temporada atual fica guardada numa lista "Temporadas anteriores" com
  data, XP, unidades; dá para trocar de volta a qualquer momento.
- **Como seria**: a temporada atual vai inteira para `progress_snapshots` sem data de validade; o bloco ativo recomeça como em B (ou A).
  Voltar = trocar: a atual vira arquivo e a antiga volta para o bloco. Guardar a temporada como uma chave nova dentro de `progress.data`
  (ex.: `frances@pt-BR#2`) **não** serve: `get_public_profile_stats` somaria o XP das duas, `weeklyXpForLanguage` somaria a semana, os
  filtros `split_part(key,'@',1)` das RPCs e do cron trariam dois blocos do mesmo curso, e a linha dobraria de tamanho.
- **Mantém e zera**: como em B (ou A); o arquivo guarda tudo.
- **Risco**: médio. O problema é a troca: os cartões da professora e próprios vivem no mesmo array (achado 3), então voltar para a temporada
  antiga traria a memória antiga desses cartões, desfazendo o estudo feito no meio. Só fica seguro depois de implementar a P1 (FSRS de
  professora e próprios fora do bloco do curso). XP: cada temporada com o seu, ou XP vitalício único? Conquistas e Ranking não mudam.
- **Desfazer**: sim, sempre.
- **Esforço**: alto: o de B, mais tela de temporadas, troca com mescla de XP e de memória dos cartões da professora, P1 antes, e o painel da
  professora mostrando de qual temporada é o progresso.
- **Grátis ou Premium**: candidato natural a Premium, se a dona quiser (é um recurso de "biblioteca"), mas recomendo não fazer agora.

### D) Retomada guiada para quem volta depois de muito tempo (não apaga nada)

- **O que a pessoa vê**: ao abrir o curso com `_account.lastStudyDay` há mais de N dias (sugestão: 60), uma tela "Que bom te ver de
  volta!" com três caminhos:
  1. **Revisão de retomada**: sessão curta só com os cartões mais antigos e já maduros (o FSRS já sabe quais estão mais esquecidos),
     limitada a 20 por dia até a fila atrasada baixar, em vez de despejar centenas de cartões vencidos de uma vez.
  2. **Ver onde estou**: o Ponto de verificação do módulo atual ou o Teste de Nível (já existem; `shared/core/modulos-niveis.js`). Se a
     nota ficar abaixo de 70, oferecer "Refazer a partir deste módulo" (é A com escopo de módulo: zera só as unidades daquele módulo em
     diante, com a mesma cópia de segurança).
  3. **Recomeçar a trilha** (opção A) ou do zero (B), para quem prefere.
- **Mantém**: tudo. Só os caminhos 2 (com "refazer") e 3 mexem, e com cópia.
- **Risco**: baixo. Atenção: hoje passar no Ponto de verificação marca unidades como concluídas, mas não existe "reprovar e voltar"; o
  "refazer a partir do módulo" é peça nova. A prova não mostra quanto a pessoa esqueceu de cada palavra (isso é o FSRS); ela só diz
  em que módulo voltar.
- **Desfazer**: não há o que desfazer nos caminhos 1 e 2 sem "refazer"; com "refazer", como em A.
- **Esforço**: médio (tela de boas-vindas de volta em pt-BR e en, regra dos N dias, limite da revisão de retomada, A com escopo de módulo).
  Reaproveita o Ponto de verificação e o Teste de Nível. O cron já tem a régua de reengajamento (dias 1 a 30); a tela pode casar com o
  último e-mail.
- **Grátis ou Premium**: grátis. Pular por Ponto de verificação segue a regra de Admin > Planos (`trail_skip_locked`, hoje desligada:
  todos pulam).

### Cartões próprios, da professora e aluno vinculado (em todas as opções)

- **Cartões próprios e da professora nunca somem nem perdem a memória**: a RPC filtra o array por `origin` e só toca em `origin:'study'`
  (e `hanziCards`). Teste obrigatório: contagem e hash do FSRS de `teacher`/`self` iguais antes e depois.
- **Banco de Revisão**: nada muda (`review_bank_items`, `review_bank_reviews`, vínculo, Modo aula). O `fsrs` espelhado no item não é
  tocado; como o FSRS do aluno para esses cartões também não muda, os dois continuam iguais.
- **Professora**: vê a trilha recomeçada no painel (overview lê `unitProgress`), com a marca "Recomeçou em DD/MM" e acesso à cópia por
  N dias. Sugestão: o aluno vinculado pode recomeçar sozinho, mas a professora recebe um aviso no sino (texto no idioma do site dela,
  `_ui_lang`).
- **Decks e Course Decks**: nada muda (estrutura). As contagens do Course Deck mudam só em B (cartões viram New).
- **XP, Ranking, amigos, missões em dupla, sequência**: nada muda em A, B e D (XP vitalício mantido; `weekly_xp` não é tocado).

## 6. Comparação

| | O que zera | FSRS da trilha | XP, Ranking, conquistas | Desfazer | Esforço | Grátis/Premium |
|---|---|---|---|---|---|---|
| A Recomeçar a trilha | lições, unidades, pontos de verificação, Teste de Nível (+ hanzi/histórias no zh) | mantido | mantidos | sim, 30 dias | médio (1 migration, tela, época no save) | grátis |
| B Do zero | A + memória dos cartões da trilha | **apagado (com cópia)** | mantidos | sim, N dias | A + pequeno | grátis |
| C Temporadas | como B, mas a anterior fica guardada | guardado na temporada | a decidir | sempre | alto; exige a P1 antes | grátis ou Premium |
| D Retomada guiada | nada (ou só um módulo em diante) | mantido | mantidos | não precisa | médio | grátis |

## 7. Recomendação

1. **Primeiro, fora deste assunto mas pré-requisito de segurança**: implementar a P1 já aprovada (FSRS de cartões da professora e próprios
   por idioma estudado, fora do bloco do curso). Hoje, quem adiciona o curso "French" (para falantes de inglês) já começa com a memória
   desses cartões zerada nesse curso (268 entradas sem histórico nos 3 blocos `frances@en`), e qualquer recomeço fica mais arriscado
   enquanto eles estiverem no mesmo array.
2. **A com cópia de segurança de 30 dias**, feita no servidor com a marca de época; B como caixa opcional dentro de A, com confirmação forte.
3. **D** como porta de entrada para quem volta depois de 60 dias, oferecendo a revisão de retomada antes de qualquer recomeço.
4. **C** só se surgir pedido real; o site tem dois meses e nenhum caso de "anos depois".

Tudo grátis. Ordem de entrega: migration no Staging, teste com cópias das linhas reais em transação com ROLLBACK (FSRS de professora e
próprios intacto, XP igual), cliente, produção só com autorização.

## 8. Perguntas para a dona

1. Recomeçar é "a trilha" (A) ou "do zero" (B) como padrão? A recomendação é A, com B opcional.
2. Por quantos dias a cópia de segurança fica disponível para desfazer (sugestão: 30)?
3. Ao refazer as lições depois de recomeçar, o XP de lição, hanzi e história volta a ser pago (como se fosse a primeira vez) ou fica em 0
   (como "refazer lição concluída")? Pagar de novo permite "farmar" XP e mexe no Ranking.
4. Desafios e Ditados entram no recomeço da trilha ou ficam como estão?
5. A tela de boas-vindas da 1ª lição aparece de novo depois de recomeçar?
6. Aluno vinculado pode recomeçar sozinho (com aviso para a professora) ou só a professora recomeça pelo painel?
7. Para a retomada (D): a partir de quantos dias parado a tela "Que bom te ver de volta!" aparece (sugestão: 60)?
8. Posso tratar a P1 (FSRS de professora e próprios por idioma estudado) como pré-requisito, numa entrega separada?

## 9. O que não foi verificado

- Nada rodou em navegador; o comportamento descrito vem da leitura do código e dos agregados do banco.
- Não conferi o Staging. O `notification-cron` em produção foi lido pelo repositório, não pelo bundle publicado.
- Não medi quantos cartões ficariam vencidos de uma vez para quem volta (não há conta parada há mais de dois meses).
- Por que o zh tem 0 cartões com `released` (o carimbo existe desde a paridade C1; pode ser que as contas zh não tenham carregado desde então).
