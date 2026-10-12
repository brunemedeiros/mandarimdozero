# Auditoria: Banco de Revisão alimentando o deck da professora (2026-10-12)

Só leitura, sem testes e sem consulta ao banco ao vivo. Preview visual: artifact "Banco de Revisão no site".
Decisões da autora: tudo na 1ª entrega (lista, Modo aula, Visão geral, Manual); banco só para quem tem vínculo;
geração automática de cartões é recurso do plano Professora; Modo aula continua alimentando o progresso do aluno.

## Achados que mudam o desenho
1. O deck "Gerados pela professora" não existe. Existe o `teacher_root` "Cartões da professora" (`053_ensure_teacher_decks.sql:67`, `shared/i18n/pt-BR.js:296`).
2. `teacher_flashcards.note` não é privada: o aluno lê a linha inteira (RLS `teacher_flashcards_student_read`, 026:19) e o cartão é copiado para `progress.data[lang].cards` (`flashcard-model.js:1371`). Notas e motivos do Banco ficam só nas tabelas do Banco.
3. Possível bug (não testado): `mergeSavedCards` (`study-trail-model.js:266`) deixa a cópia do progresso vencer o dado novo; corrigir/arquivar item já entregue pode não chegar ao aluno. Testar antes de usar "cortado = arquivado".
4. `teacher_panel` e `teacher_student_analytics` existem no catálogo mas nada as consome; `review_bank` só barra de verdade se entrar em RLS/RPC (`has_permission`).

## Mapeamento de tipos
vocabulário/estrutura = `normal`; verbo/erro ("corrija a frase") = `type_answer` (errado vira o prompt); lacuna = `cloze` (conversor para `{{c1::}}`); pronúncia = `normal` com áudio TTS. O motor não tem Field de explicação visível ao aluno nem Field "forma errada"; usar `tags` para tipo/aula. Status pendente/aprovado/cortado fica só na tabela do Banco (`teacher_flashcards.status` só aceita active/archived).

## Mudanças necessárias
- Migrations (a partir de 077, sem DROP, Staging antes): `review_bank_items`, `review_bank_reviews`, recaps (coluna em `teacher_class_logs` ou tabela), `teacher_flashcards.bank_item_id` com índice único parcial, RPC `approve_review_bank_item` (atômica, idempotente), RPC de progresso por item (molde 059), subdeck "Gerados pela professora" com trava de unicidade, permissão `review_bank` (catálogo + 5 linhas em `role_permissions`).
- JS: `shared/review-bank-model.js` (puro), `shared/review-bank.js` (tela), seção em `teacher-panel.js`, `rowId` no meta de `review_answer` (`analytics.js:163`), i18n pt-BR/en.
- Testes: `tests/banco-revisao/`; atualizar `tests/papeis-permissoes/test_075.sql` (12 permissões/60 linhas) e `tests/painel-professora/test_playwright.js` (4 seções).

## Analytics
Aluno: métricas derivadas de `STATE.cards` (`analytics-metrics.js:173`), entram sozinhas para linhas de `teacher_flashcards`. Rótulos hardcoded em português em `fr/app.js:7939` e `zh/app.js:7693`. Professora: `get_teacher_student_metrics` (059) e `get_teacher_student_overview` (070). Falta atribuir resposta a item do Banco.

## Riscos
Duplicar cartões (insert sem idempotência), zerar FSRS ao editar item entregue (`revision`), zh exige pinyin e não inverte, privacidade de notas, regra "1 professora por aluno" não imposta.
