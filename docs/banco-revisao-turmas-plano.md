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
