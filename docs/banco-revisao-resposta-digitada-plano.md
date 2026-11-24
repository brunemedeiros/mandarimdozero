# Guardar o que a aluna digitou nos cartões da professora: plano (Etapa 1 feita; 2 e 3 aguardam)

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

**Etapa 1: o report leva a resposta digitada (sem banco, só site). FEITA em 2026-11-24** (`reportTypedAnswerInfo` em
`shared/reports.js`; campos `review_typed_answer` e `review_answer_result` = certo/quase/errado; segue o cartão da tela também
no "ver cartão anterior", com `review_peek`; teste `tests/reports-contexto/` 43/43).
Quando a aluna aperta ⚑ num cartão de digitar já respondido, o contexto do report ganha `review_typed_answer` (o que ela
digitou) e `review_answer_result` (o site considerou certo, quase ou errado). Ela mesma está enviando o report, então não
há dado novo guardado sem ela saber. Mudança pequena em `shared/reports.js` (`reportTypedAnswerInfo`) + teste em
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

## Decisões da autora (2026-11-24)

1. Guardar o texto **só quando ela erra**.
2. **Avisar** na Política de Privacidade (`shared/privacy-draft.js`, vai ao advogado) e na Central de Ajuda (`ajuda/`):
   "sua professora vê o que você digita nos cartões que ela criou". O aviso entra JUNTO com a Etapa 2 (antes dela seria
   descrever algo que o site ainda não faz).
3. Guardar o texto por **180 dias**; depois o texto é apagado e a linha de errou/acertou fica.
4. Modo aula fica de fora (a aluna não digita no site durante a aula).
5. Ordem: Etapa 1 agora; Etapas 2 e 3 depois, quando a autora pedir.
