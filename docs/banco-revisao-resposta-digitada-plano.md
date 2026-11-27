# Guardar o que a aluna digitou nos cartões da professora: plano (Etapa 1 publicada; Etapa 2 na produção e publicada em 2026-11-27; Etapa 3 depois)

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

**Etapa 2: guardar a resposta no Banco (migration + site). FEITA: migration 143 no Staging (2026-11-24) e na produção (2026-11-27, autorizada pela autora), site publicado.**
Ficou assim: `shared/supabase_migrations/143_review_bank_typed_text.sql` (o número 142 já tinha sido usado no Staging por outra
conversa, `142_admin_overview`); o site manda `opts.typedText` em `logBankHomeStudy` (nota e Voltar) e a fila só guarda o texto
no Errei de cartão de digitar; sem a 143 no banco, reenvia sem o texto. Aviso na Política (`shared/privacy-draft.js` e
`ajuda/textos/politica.html`, seções 3 e 7 e o mapa) e nas respostas da Ajuda (`ajuda/conteudo.js`). Testes:
`tests/banco-revisao-compartilhado/run.sh` 54/54 (23 novos da 143), `tests/banco-revisao-resposta-digitada/` (fila 11/11,
navegador 7/7). Teste ao vivo no Staging, desfeito no fim: Errei digitado guarda o texto; acerto não; 4 parâmetros segue ok.
Plano original:
- Migration nova (número livre na hora): coluna `typed_text text` em `review_bank_reviews`, com limite de 300 caracteres.
- Nova versão da RPC com um 5º parâmetro (`p_typed_text`), mantendo a de 4 parâmetros funcionando (aparelho com o site
  antigo em cache continua enviando sem quebrar). Mesma coisa para `correct_my_bank_review`. Sem `DROP`: só acrescenta.
- `logBankHomeStudy()` passa a mandar `STATE.reviewCardState.typedAnswer` na fila.
- Staging antes da produção, teste SQL local (`tests/banco-revisao-compartilhado/`) e teste no navegador.

**Etapa 3: mostrar para a professora. PRÉVIA pronta na branch (2026-11-27), aguarda aprovação da autora; nada publicado.**
Ficou assim: em cada item (Aulas e Todos os itens), "O que foi digitado ao errar (N)" com as 5 últimas respostas (data; na turma,
o nome de quem digitou), o erro marcado em vermelho por `typedAttemptHTML` (agora aceita a forma de comparar do idioma do ALUNO),
a resposta do cartão (na lacuna, a palavra da lacuna) e a nota dos 180 dias; fechado, e já aberto quando o item tem erros seguidos.
Etiqueta "Errou as últimas N" no item com 3 erros seguidos ou mais (aula e casa juntas; turma conta por pessoa). Na aba Desempenho,
acima do "Desempenho (aula e casa)", o bloco "Itens com erros seguidos (N)" (some quando não há nenhum), com as 2 últimas respostas
digitadas e "Ver item" (abre Todos os itens filtrado e destaca o item). Lógica em `shared/review-bank-model.js` (`rbItemReviews`,
`rbTypedAttempts`, `rbTypedExpected`, `rbMissStreak`, `rbStrugglingItems`), tela em `shared/review-bank.js`, CSS em
`shared/review-bank.css`. Teste `tests/banco-revisao-resposta-digitada/test_etapa3_playwright.js` 62/62 (fr e zh, claro e escuro,
1200 e 390, pt-BR e en). Plano original:
- No Banco > aluno > item: "Últimas respostas digitadas" (data, o que ela escreveu, certo/errado), com o erro marcado em
  vermelho pela mesma peça da Revisão (`typedAttemptHTML`).
- Na faixa de estatísticas, um aviso "itens que a aluna erra muito" (ex.: 3 erros seguidos), para achar cartão mal feito
  antes de virar report. Prévia visual antes de publicar (o Banco mantém o visual antigo).

## Registro das migrations

| Migration | Staging | Produção |
|---|---|---|
| 143_review_bank_typed_text | 20261124025513 (2026-11-24) | 20261127153200 (2026-11-27; as 5 funções com hash igual ao Staging; cron `purge-bank-typed-text` 07:23 UTC) |

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
