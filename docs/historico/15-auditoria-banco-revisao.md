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

## Decisões da autora (2026-10-12)
- O cartão aprovado vai para o deck existente "Cartões da professora" (`teacher_root`), sem deck/kind novo e sem subdeck. Aprovar entrega na hora.
- Banco só para quem tem vínculo; geração automática = permissão `review_bank` do plano Professora.
- Modo aluno: "Ver resposta" = 4 notas (Errei, Difícil, Bom, Fácil); múltipla escolha = 2 (Errei, Bom); digitar = 3 (errou = Errei, quase lá = Difícil, certo = Bom).
- O campo "Notas" do cartão é observação/explicação para o aluno (não nota pessoal): renomear para Observações ou Explicação. Pendente: confirmar nome e o que fazer com notas privadas que já existam.
- Caixas azuis: fundo `#1D5A82` com texto branco em negrito (contraste ~7:1).
- Dados do artifact (itens, revisões, recaps, manual) podem ser levados ao banco do site: autorizado.
- Editar cartão entregue: bloquear é inaceitável. Proposta: correção mantém o progresso (mesmo id) e só "mudou o sentido" reinicia.

## Bug confirmado e corrigido (mergeSavedCards)
`tests/banco-revisao/test_merge_saved_cards.js` (fr e zh): antes da correção, arquivar, mudar observação e mudar tags de um cartão da professora já estudado NÃO chegavam ao aluno (6 falhas); o save antigo vencia o dado novo do banco. Correção em `shared/study-trail-model.js` (`NOTE_LEVEL_FRESH_FIELDS` vencem a cópia salva; só o progresso vem do save). Depois: 10/10. Regressão: fase-e 75/75, fase-f 68/68, fase-g 134/134, fase-h 78/78 e 52/52, k2c 88/88, k2e 64/64, k2g 31/31. Falhas que já existiam antes da correção (iguais sem ela): fase-i 63/67, trilha-tags 72/74; `tests/i18n/test_i18n_unit.js` não roda (commit `e88fabb` ausente no clone).

## Migration 081_review_bank (aplicada no Staging com o nome `080_review_bank`)
Arquivo `shared/supabase_migrations/081_review_bank.sql`. Renumerada de 080 para 081 porque outra conversa criou `080_private_profile` (branch `claude/fervent-noether-9f1ya7`, também no Staging); o Staging guarda a minha como `080_review_bank` (versão `20261012202106`) e o nome não se edita. 077/078/079 são dessa outra conversa e já estão na produção. Tabelas `review_bank_items`, `review_bank_recaps`, `review_bank_reviews`; `teacher_flashcards.bank_item_id` (índice único parcial); RPCs `approve_review_bank_item`, `set_review_bank_item_status`, `get_my_pending_bank_reviews`, `ack_my_bank_reviews`; permissão `review_bank` (só `teacher`). Teste local `tests/banco-revisao/run_local.sh`: 22/22 (rodado de novo depois de renumerar) e reaplicação sem erro. Staging: aplicada em 2026-10-12, versão `20261012202106`; verificado 3 tabelas com RLS, 3 policies, 4 funções `security definer` com `search_path=public`, sem execute para `anon`, `teacher_flashcards` intacta. Produção: NÃO aplicada.

## Decisões da autora, rodada 2 (2026-10-12)
- Campo "Notas" do cartão vira **Observações** (exemplo, regra, explicação) e é mostrado ao aluno. Os itens do Banco têm essa nota de verdade (ex.: frase de exemplo com tradução, regra gramatical); a conferência na produção (0 cartões da professora com nota) vale só para os cartões que já existem no site.
- Geração automática: o item vira cartão direto quando não tem "Para conferir" e tem os campos completos (erro: forma errada e certa). Só os com dúvida ficam em Pendentes. Configurável pela professora (`review_bank_settings.auto_generate`).
- O Banco funciona sem conta (Modo aula, Récap, Visão geral), mas só gera cartões em "Cartões da professora" com aluno vinculado (conta + vínculo ativo no mesmo idioma).
- O Banco aparece no menu Professora em qualquer idioma do site, com alunos de todos os idiomas. Para o aluno, só aparece no idioma em que ele é aluno.
- Urgente (fora deste trabalho): criar o app de português (`ptbr`). 13 dos 24 alunos do artifact estudam português (11 ativos, 2 arquivados), língua de referência inglês; Barae e Evan já têm vínculo `portugues` ativo.

## Dados do artifact (lidos em 2026-10-12, só leitura; cópia local fora do repo)
24 alunos (11 francês, 13 português); 6 com conta e vínculo ativo no site (Carol, Catharina, Luana, Marconi em francês; Barae, Evan em português), 1 com conta sem vínculo (Polina), 11 sem conta entre os 18 com e-mail; 4 sem e-mail não conferidos. Campos de um item: `q, a, errado, lacuna, nota, duvida, tipo, status, data, origem, nivel/proxima/ultima` (agendamento antigo, substituído pelo FSRS), `proposta/revisao/antes/criados` (revisão de qualidade com proposta de edição e desfazer). Recaps, revisões e manual vêm das coleções `alunos/{id}/recaps`, `alunos/{id}/revisoes` e `config/manual`. Códigos de acesso e e-mails dos alunos NÃO vão para o repositório.

## Migration 082_review_bank_roster
`shared/supabase_migrations/082_review_bank_roster.sql`: `review_bank_students` (lista própria, `linked_student_id` = conta vinculada), `review_bank_settings` (geração automática + manual), `bank_student_id` obrigatório em itens/recaps/respostas, `import_key` e `proposal` nos itens, policies por ALTER POLICY, RPCs `link_review_bank_student`/`unlink_review_bank_student`, e `approve_review_bank_item`, `set_review_bank_item_status`, `get_my_pending_bank_reviews`, `ack_my_bank_reviews` redefinidas pelo aluno do Banco (aprovar sem conta vinculada dá `student_not_linked`). Teste local `tests/banco-revisao/run_local.sh`: 33/33 e reaplicação sem erro. Staging: aplicada, versão `20261012211144`, 5 tabelas com RLS, 5 policies, 6 funções `security definer` sem execute para `anon`, tabelas do Banco vazias antes. Produção: NÃO aplicada (081 e 082 vão juntas, na ordem).

## Entrega da tela (2026-10-12/13) -- Professora > Cartões > Banco de Revisão
**Onde:** `shared/review-bank.js` (dados, Alunos, itens, Récap, estatísticas, Visão geral, Manual, importação), `shared/review-bank-class.js` (Modo aula em tela cheia), `shared/review-bank-model.js` (puro), `shared/review-bank-import.js`, `shared/review-bank.css`, `shared/review-answer-extras.js` e `shared/review-bank-student.js` (lado do aluno), seletor Cartões | Banco de Revisão em `shared/teacher-panel.js`, textos `rb.*` em `shared/i18n/pt-BR.js` e `en.js`. fr e zh.
**Regras de produto:** aprovar item de aluno vinculado gera o cartão na hora em "Cartões da professora" (RPC atômica, 1 cartão por item); sem conta o Banco funciona (Modo aula, Récap, Visão geral) mas não gera cartão; geração automática (ligada por padrão) só para item sem "Para conferir", completo, não sensível e de aluno vinculado; mandarim não é automático (pinyin). Editar item entregue CORRIGE sem zerar o progresso (mesmo cartão e mesma revisão); só "mudou o sentido" (checkbox) ou mudar o tipo de cartão sobe a revisão. Cortar arquiva o cartão. Observações (antes "Notas") aparecem ao aluno só depois de responder. Digitar (francês): certo = Bom, quase lá (acento ou 1 letra em palavra de 5+) = Difícil, errado = Errei; múltipla escolha 2 notas; ver resposta 4. Respostas do Modo aula viram nota no FSRS do próprio aluno quando ele abre o app (RPC `get_my_pending_bank_reviews`). Motivos do erro por tipo de item, os do Banco antigo (migration/tela usam as mesmas chaves). Caixas azuis: `#1D5A82` com texto branco em negrito (`--rb-box`).
**Migrations (todas só no Staging; produção NÃO):** 081 (itens/recaps/respostas, RPCs, permissão), 082 (lista de alunos do Banco, configurações, manual), 083 (agendamento do Récap e modo da resposta), 084 (índices únicos completos: o upsert não funciona com índice parcial, provado no Postgres), 085 (`sensitive`). Versões no Staging: 081 como `080_review_bank` (20261012202106), 082 = 20261012211144; 083, 084 e 085 pelo `list_migrations`.
**Importação do Banco antigo:** botão em Alunos > "Importar dados do Banco antigo", arquivo .json (formato no cabeçalho de `review-bank-import.js`). Não sobrescreve nem duplica (importar de novo é seguro), não entrega nada. Arquivo gerado a partir do banco do artifact em 2026-10-12: 24 alunos (13 português, 11 francês), 2.076 itens (1.876 aprovados, 189 pendentes, 11 cortados), 30 récaps, 53 respostas, manual; 26 itens sensíveis e 66 propostas de revisão. Fica FORA do repositório (nomes e conteúdo de alunos).
**Testes (`tests/banco-revisao/`):** SQL `run_local.sh` 44/44; `test_model` 44/44; `test_import` 11/11; `test_i18n_keys` 5/5; `test_answer_extras` 17/17; `test_student_pending` 13/13; `test_merge_saved_cards` 10/10; `test_playwright` 381/381 (fr e zh, claro e escuro, 390px). Regressão rodada: painel-professora 162/162, deck-browser 206/206, fase-e/f/g/h/i/j/k1/k5/k6, k2d/e/g, limite-corte, revisao-ajustes, revisao-proposta-a, trilha-tags, painel-alunos, plano-admin, placeholders, todos OK. Falhas que já existiam sem as minhas mudanças (conferido com stash): k2c e k2h. Não rodam por ambiente: k2f (falta `sql.js`) e i18n playwright/unit (falta o commit `e88fabb`).
**Falta para entrar em produção:** (1) autorização para aplicar 081 a 085 na produção, em ordem; (2) publicar a branch (merge, só a pedido); (3) importar o arquivo pela tela; (4) vincular os alunos que têm conta (6 hoje) e usar "Gerar cartões"; (5) criar o app de português (13 de 24 alunos).
