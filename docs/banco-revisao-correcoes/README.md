# Correções de itens do Banco de Revisão feitas pelo Claude (com autorização da autora)

Cada correção guarda uma cópia do item e do cartão como estavam antes (`AAAA-MM-DD-<import_key>-backup-antes.json`).
Caminho usado: o MESMO do Painel (editar item + `sync_review_bank_item_cards` para cartão já entregue; item novo +
`approve_review_bank_item`), rodado no SQL com o login da professora simulado só dentro da transação
(`set local role authenticated` + `request.jwt.claims` com o id dela). Conteúdo dos cartões gerado pelo `rbBuildCard` real.
Sempre ensaio primeiro (transação desfeita por um erro proposital com o resultado na mensagem), depois a gravação.

## 2026-11-24: i082 "Corrija: Je n'ai besoin de payer" (Francielly) dividido em dois

Report 37. O cartão 628 pedia duas frases numa resposta só, e a 2ª na forma oral ("J'ai pas besoin de payer"): quem
escrevia a forma padrão levava errado. 10 tentativas, 8 erros. Autorizado pela autora no chat em 2026-11-24.

| | Item | Cartão | Pergunta → resposta | Observação |
|---|---|---|---|---|
| A | `i082` (28f460ef...) | 628 (o mesmo; progresso e agendamento mantidos) | Eu não precisei pagar. → Je n’ai pas eu besoin de payer. | a mesma de antes |
| B | novo (b66956f7...) | 2168 (novo, deck 341, começa do zero) | Eu não preciso pagar. → Je n’ai pas besoin de payer. | Na fala, é comum tirar o ne: J’ai pas besoin de payer. |

Para desfazer: voltar o item `i082` e o cartão 628 com os dados do backup (pelo Painel ou pela RPC de sincronizar) e
cortar o item B no Painel (o cartão 2168 some para a aluna).
