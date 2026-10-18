# Banco de Revisão ligado a uma Turma: plano (aguardando aprovação da autora)

Escrito em 2026-10-14. Nada foi implementado. Base: código da `main` em 2026-10-14 e banco de produção conferido ao vivo
(só leitura).

## O que a autora decidiu

- Um aluno do Banco pode ser ligado a uma **Turma** (as mesmas Turmas do Mural, migration 087), e não só a uma conta.
- Cada item continua existindo **uma vez** no Banco. Ao aprovar ou ao clicar em "Gerar cartões", cada membro da turma
  recebe a própria cópia do cartão, com o próprio progresso (FSRS).
- Corrigir, cortar ou reaprovar um item vale para as cópias de todos.
- **Modo aula: as respostas valem para todos** os membros da turma.
- **Quem entra na turma depois recebe todos os cartões** já aprovados.

## Decisões que tomei e que a autora pode mudar

1. **Ligação é a conta OU a turma, nunca as duas.** Trocar de conta para turma mantém os cartões que a conta já tinha
   (viram a cópia daquele membro, sem perder progresso).
2. **Quem sai da turma (ou perde o vínculo) fica com os cartões que já recebeu**, como hoje acontece ao desvincular um
   aluno; só deixa de receber os novos. Nada é apagado.
3. **Quem entra depois não herda as respostas antigas do Modo aula** (só os cartões). As respostas de aulas em que a
   pessoa não estava não entram no FSRS dela; as aulas a partir da entrada, sim.
4. **Mandarim continua fora da geração** (pinyin), igual a hoje.
5. **Turma e aluno do Banco precisam ser do mesmo idioma** (as duas tabelas já usam a mesma chave, ex.: `frances`).

## Como fica por dentro

### Banco (migration 096, nova; 095 já foi usada no Staging por outra conversa)

- `review_bank_students.classroom_id` (turma; exclusivo com `linked_student_id`, garantido por `check`).
- Índice único de `teacher_flashcards.bank_item_id` passa de "1 cartão por item" para "1 cartão por item **por aluno**"
  (`bank_item_id, student_id`). Isso exige `DROP INDEX`: a migration vai pelo **SQL Editor da autora** (skill
  `migration-supabase`), primeiro no Staging.
- `review_bank_items.teacher_flashcard_id` continua existindo e passa a significar "já entregue" (o primeiro cartão);
  a contagem e os filtros da tela seguem funcionando.
- Tabela nova `review_bank_review_acks (review_id, student_id, applied_at)`: hoje a confirmação de uma resposta do Modo aula
  é uma coluna só (`applied_at`), então o primeiro membro que abrisse o app marcaria a resposta como aplicada para todos.
  Com a tabela, cada membro confirma a sua. As respostas antigas já confirmadas continuam confirmadas.
- Função interna "destinatários do aluno do Banco": a conta vinculada, ou os membros da turma com vínculo ativo.
- RPCs redefinidas:
  - `approve_review_bank_item`: cria o cartão para cada destinatário que ainda não tem (e reativa os arquivados).
  - `set_review_bank_item_status`: cortar arquiva as cópias de todos; reaprovar reativa todas.
  - `get_my_pending_bank_reviews` / `ack_my_bank_reviews`: acham o cartão do próprio aluno pelo item e confirmam só para ele.
    O app do aluno (`review-bank-student.js`) **não muda**.
  - `link_review_bank_student` ganha a irmã `link_review_bank_classroom` (e o desvincular limpa as duas).
  - `agent_approve_review_bank_item` (modo agente, outra conversa): NÃO é tocado. Ele exige conta vinculada, então recusa aluno ligado a turma (seguro); estender o agente para turmas fica para aquela conversa.
- Entrada na turma (`mural_set_classroom_members` e `join_classroom_code`): gatilho que copia para o membro novo todos os
  cartões já entregues dos alunos do Banco ligados àquela turma (conteúdo copiado de um cartão irmão do mesmo item).
  Cuidado já mapeado: `ensure_teacher_decks` usa quem está logado como professora, e quem entra pelo código é o aluno;
  o gatilho usa o mesmo recurso da 090 (age como a professora só durante a criação do deck).

### Tela do Banco (`shared/review-bank.js`)

- No aluno do Banco: "Vincular a uma conta" ou "Vincular a uma Turma" (lista as turmas do mesmo idioma), mostrando os
  membros e quantos cartões cada um tem.
- Corrigir item entregue passa a atualizar as cópias de todos (hoje atualiza só o cartão guardado no item).
- Contagens mostram "entregue para N".

### O que NÃO muda

App do aluno, Mural, Turmas e o fluxo de quem é ligado a uma conta só.

## Grátis x Premium

Nada muda: o Banco é do papel Professora (permissão `review_bank`); receber e estudar os cartões é grátis para o aluno.

## Etapas (cada uma só com autorização)

1. Migration 096 + testes SQL no harness de `tests/mural/` (único que já aplica 081 a 085 e 087 juntas):
   aprovar com turma de 2 = 2 cartões; corrigir/cortar vale para os dois; membro novo recebe tudo; quem sai mantém;
   Modo aula chega aos dois e cada um confirma o seu; aluno de conta única continua igual; sem permissão nada passa.
2. Tela do Banco + testes (modelo, playwright fr/zh, claro/escuro, 390px) + regressão `tests/banco-revisao` e `tests/mural`.
3. Staging (SQL Editor da autora, por causa do `DROP INDEX`), conferência ao vivo.
4. Produção (SQL Editor da autora) e merge (a pedido).
5. Converter "Sandra e Eduardo" (mudança de dado em produção, só com autorização).

## Sandra e Eduardo (conferido em produção, 2026-10-14)

Hoje os 116 cartões estão na conta vinculada (aparenta ser a do Eduardo). **Não achei conta da Sandra com vínculo ativo
de francês com a autora.** Para ela receber os cartões, precisa criar conta e entrar na turma (pelo link da turma, que já
cria o vínculo). Os cartões do Eduardo ficam como estão, com o progresso.

## Etapa 1 entregue (2026-10-15)

- `shared/supabase_migrations/096_review_bank_classrooms.sql` (095 já tinha sido usada no Staging por outra conversa,
  `095_friend_suggestions`). Arquivo para o SQL Editor: `docs/rollout-sql/096_sql_editor.sql`. NÃO aplicada em lugar nenhum.
- Mudanças em relação ao plano: (1) a correção de item entregue ganhou uma RPC `sync_review_bank_item_cards` (atualiza as
  cópias de todos numa chamada só; a tela passa a usá-la na etapa 2); (2) o modo agente não foi tocado (recusa aluno de
  turma, seguro); (3) a regra de escrita direta usa `_teacher_owns_classroom` (094), porque `classrooms` é fechada para
  leitura direta e a policy daria "permission denied" em qualquer insert de aluno do Banco (pego pelo teste).
- Testes: `tests/banco-revisao-turmas/run.sh` (Postgres local, migrations reais até 088 + 094 + 096 duas vezes):
  096 49/49, Mural 087 80/80 por cima da 096. `run_legacy.sh`: suíte antiga do Banco com a 096 por cima, 44/44
  (sem a 096: 44/44).
- Detalhe aceito: se um aluno de conta única virar turma com respostas do Modo aula ainda não abertas no app, essas
  respostas antigas não chegam (a regra da turma só entrega respostas posteriores à entrada).

## Etapa 2 entregue (2026-10-15)

- Tela (`shared/review-bank.js`, `review-bank-model.js`, `review-bank-class.js`, `review-bank.css`): aluno do Banco sem
  vínculo mostra "conta" OU "turma" (turmas do mesmo idioma, vindas de `mural_list`, com o número de membros); ligado à
  turma mostra "Turma", o nome e os membros, e "Desvincular". "Gerar cartões", aprovar e a geração automática valem para
  aluno de turma (`rbHasTarget`). Corrigir item entregue usa `sync_review_bank_item_cards` (cópias de todos). Textos
  novos `rb.*` em pt-BR e en.
- Testes: Banco Playwright 501/501 (36 novas: escolher turma, ligar, membros na tela, gerar = 1 cópia por membro,
  desvincular; fr/zh, claro/escuro, 390px), modelo 45/45 (1 nova), demais do Banco iguais, painel-professora 409/409,
  mural 255/255, i18n unit 2032/2032. O teste antigo do Banco ganhou os fakes de `mural_list`,
  `link_review_bank_classroom` e `sync_review_bank_item_cards` (mudança intencional: a correção passou a ser por RPC).
- Correção de uma resposta minha à autora: os cartões da professora NÃO voltam para a Revisão geral quando o vínculo
  acaba. Desde o PR #316 eles só aparecem em Aluno > Revisão, e hoje, sem vínculo, o menu Aluno continua aparecendo só
  por causa desses cartões (com Mural/Aulas/Material vazios). Decisão pendente da autora: o que fazer com eles nesse caso.

## Opção 2 da autora (2026-10-15): sem vínculo, os cartões da professora somem do Aluno

- Decisão: sem vínculo ativo, o item Aluno some e os cartões da professora param de aparecer; o progresso fica guardado e
  volta com o vínculo.
- Por que no app e não no banco: se o banco escondesse as linhas, `mergeSavedCards` descartaria o cartão e o próximo
  salvamento apagaria o progresso (FSRS). Então os cartões continuam carregados e salvos; só a tela filtra.
- Como: cartão da professora ganha `teacherId` (fresco do banco, `NOTE_LEVEL_FRESH_FIELDS`); no boot o app busca a
  professora ativa do idioma (`fetchMyActiveTeacherId`, `CLASS_ACTIVE_TEACHER_ID`); `isActiveClassReviewCard` filtra a aba
  Aluno > Revisão e o "segurar" o item Aluno. Sem saber (offline), não esconde. Cartões de uma professora antiga também
  somem quando o aluno tem outra professora no idioma.
- Testes: `tests/banco-revisao/test_active_teacher.js` 18/18 (novo). Banco Playwright 501/501. Regressão de 46 suítes
  comparada antes x depois (cópia do repositório no commit anterior): iguais, exceto 2 testes antigos atualizados por
  mudança intencional (fase-h origin filter 54/54: o aluno simulado passa a ter professora ativa; fase-i tags unit 67/67:
  extrai `isActiveClassReviewCard`). Pré-existentes iguais nos dois lados: k2c Playwright 12/14, trilha-tags unit e
  painel-alunos unit não rodam neste ambiente.

## Antes do Staging (2026-10-15)

- `main` trouxe a rotina automática do Banco (089/090 e 097 a 100, outra conversa). A 096 não toca nas funções dela
  (`agent_*`, `_rb_agent_*`, `review_bank_agent_*`); a rotina só entrega cartão quando há `linked_student_id`
  (`core.mjs`), então ignora aluno ligado a turma. `rbReadyToDeliver` (novo na `main`) passou a aceitar turma.
  Motor da rotina regerado (`node scripts/build-review-bank-agent.js`): `test_agent_core` 49/49. **Ao publicar, a Edge
  Function `review-bank-agent` precisa de novo deploy** (o arquivo gerado mudou; sem deploy ela segue com o motor antigo,
  que funciona igual para alunos de conta).
- Testes depois do merge: 096 49/49 (agora com 089, 090 e 095 antes, como no Staging), Mural 80/80, suíte antiga do
  Banco com a 096 por cima 83/83 (inclui as partes da rotina; antes 83/83), Banco Playwright 519/519, modelo 49/49,
  aluno com professora ativa 18/18, i18n unit 2032/2032.
- Staging conferido (só leitura): todas as dependências existem, 096 ainda não aplicada; foto antes:
  teacher_flashcards 8 linhas (md5 a90d5f4c...), review_bank_items 18, review_bank_students 5, review_bank_reviews 0.

## Publicado (2026-10-15)

- 096 na produção (SQL Editor da autora), conferida: 8 funções, índice novo, gatilho, acks fechada, 703 cartões e 2.134 itens
  intactos, nenhuma duplicata.
- Textos aprovados: "Ainda sem conta no site" e "Vincular ao aluno" (en: "No account on the site yet", "Link to student").
- PR #337 mesclado (merge c57286f); Pages publicado.
- Edge Function `review-bank-agent` v8 (autorizada): mesmo `index.ts` da v7, atalhos para `engine.generated.mjs` e `core.mjs`
  fixados no commit c57286f (só o motor gerado mudou).
- Falta: converter "Sandra e Eduardo" em turma quando a Sandra tiver conta (dado em produção, só com autorização).
