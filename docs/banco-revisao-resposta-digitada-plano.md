# Guardar o que a aluna digitou nos cartões da professora: plano (NÃO implementado)

Pedido da autora em 2026-11-24, depois do report 37 (Francielly, cartão "Corrija: Je n'ai besoin de payer").
Situação: o banco só guarda "errou/acertou" (`review_bank_reviews.outcome`, `grade`, `typed` = se foi digitado). Ela errou
8 das 10 tentativas e não dava para saber se o erro era dela ou do cartão (era do cartão: pedia duas frases e uma delas
na forma oral, sem o "ne"; o item foi dividido em dois, ver `docs/banco-revisao-correcoes/README.md`).

## O que já existe (levantado em 2026-11-24)

- O texto digitado JÁ está no navegador na hora da nota: `STATE.reviewCardState.typedAnswer` (cartões "Digite a resposta" e
  Cloze, `shared/core/licao-base.js`). Só não é enviado.
- Estudo em casa: `logBankHomeStudy()` (`shared/review-bank-student.js`) põe a resposta numa fila local e envia pela RPC
  `log_my_bank_review(p_card_id, p_grade, p_typed, p_fsrs)` (migration 112) ou `correct_my_bank_review` (127, botão "Voltar").
- Quem lê `review_bank_reviews`: só a professora dona do item (política `review_bank_reviews_teacher_all`). A aluna não lê.
- Excluir a conta da aluna apaga as linhas dela (`student_id ... on delete cascade`). Hoje há 1028 linhas.

## Etapas

**Etapa 1: o report leva a resposta digitada (sem banco, só site).**
Quando a aluna aperta ⚑ num cartão de digitar já respondido, o contexto do report ganha `review_typed_answer` (o que ela
digitou) e `review_answer_correct` (o site considerou certo ou errado). Ela mesma está enviando o report, então não
há dado novo guardado sem ela saber. Mudança pequena em `shared/reports.js` (`reportReviewCardInfo`) + teste em
`tests/reports-contexto/`. Vale para fr, zh e pt, e também para os cartões próprios e da trilha.

**Etapa 2: guardar a resposta no Banco (migration + site).**
- Migration nova (número livre na hora): coluna `typed_text text` em `review_bank_reviews`, com limite de 300 caracteres.
- Nova versão da RPC com um 5º parâmetro (`p_typed_text`), mantendo a de 4 parâmetros funcionando (aparelho com o site
  antigo em cache continua enviando sem quebrar). Mesma coisa para `correct_my_bank_review`. Sem `DROP`: só acrescenta.
- `logBankHomeStudy()` passa a mandar `STATE.reviewCardState.typedAnswer` na fila.
- Staging antes da produção, teste SQL local (`tests/banco-revisao-compartilhado/`) e teste no navegador.

**Etapa 3: mostrar para a professora.**
- No Banco > aluno > item: "Últimas respostas digitadas" (data, o que ela escreveu, certo/errado), com o erro marcado em
  vermelho pela mesma peça da Revisão (`typedAttemptHTML`).
- Na faixa de estatísticas, um aviso "itens que a aluna erra muito" (ex.: 3 erros seguidos), para achar cartão mal feito
  antes de virar report. Prévia visual antes de publicar (o Banco mantém o visual antigo).

## Grátis x Premium

Tudo grátis (é ferramenta da professora sobre os cartões dela; não há limite de uso).

## Decisões da autora (perguntas abertas)

1. **Guardar só quando ela erra, ou toda resposta digitada?** Recomendação: só quando erra (menos dado guardado, e é o
   que ajuda a achar cartão ruim; o acerto já é igual à resposta do cartão).
2. **Avisar a aluna?** Recomendação: sim, uma linha na Política de Privacidade (rascunho em `shared/privacy-draft.js`) e
   na Central de Ajuda: "sua professora vê o que você digita nos cartões que ela criou". Sem aviso na tela de estudo.
3. **Por quanto tempo guardar o texto?** Recomendação: 180 dias. Depois disso o texto é apagado (a linha de errou/acertou fica).
4. **Modo aula**: hoje a professora dá a nota na aula e a aluna não digita no site. Fica de fora, salvo pedido.
5. Começar pela Etapa 1 sozinha (rápida, sem banco) e decidir a 2 e a 3 depois?
