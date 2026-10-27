# 24. Paridade C2 a C5 e D6: retorno de erro da lição e áudio, em código comum (2026-10-23)

Plano: itens C2, C3, C4, C5 e D6 de `docs/auditoria-paridade-fr-zh.md`, aprovados pela dona em 2026-10-23 ("o que vale
para um site vale para todos"), na branch `claude/friendly-hamilton-u4ssl2`. Continua o C1 (`23-paridade-c1-chave-estavel-zh.md`).
Grátis x Premium: tudo grátis (exercícios de lição e Revisão rápida, como já eram no fr).

## O que foi para código comum

- `shared/core/licao-feedback.js` (novo, carregado por `fr/index.html` e `zh/index.html` antes do `app.js`):
  - `alinharLetras(a, b)`: distância de edição letra a letra. Saiu de `shared/core/familias/latina.js` (não é latino);
    `FamiliaLatina.alinharLetras` deixou de existir e o `conjAlign` do fr chama a comum.
  - `alinhamentoHTML(ops)` e `typedAttemptHTML(typed, expected)`: "Sua resposta" com a letra errada em vermelho (`.conj-x`) e um
    traço onde faltou letra (`.conj-gap`). Gancho `LANG_HOOKS.typedAttemptForm`: fr = texto como digitado (igual a antes);
    zh = `pinyinAttemptDisplayForm` (pinyin numerado convertido para marca de tom, sem pontuação, maiúscula como digitada).
  - `trueFalseHint(unit)`: dica do Verdadeiro ou Falso que cita o conceito já visto; chaves em `LANG_HOOKS.trueFalseHintKeys`.
  - `reorderBlockStatus` e `markReorderSlots`: estado de cada bloco do Ordenar e as cores das caixas ao responder.
- `shared/licao-feedback.css` (novo, `<link>` nos dois sites): `.typed-attempt`, `.conj-x`, `.conj-gap`, tirados do `fr/index.html`.
- `LANG_HOOKS.pregenRate()` agora é a única fonte da velocidade do mp3 pré-gravado: `speakFrenchAudioOnly` e
  `speakChineseAudioOnly` passam o valor do gancho. fr 0,9 (`PREGEN_AUDIO_RATE`), zh 0,9 (antes 1,0).

## Por que o zh compara o pinyin convertido

O veredito do zh compara `pinyinAnswerCompareForm` (nome novo da seta `strip` que os exercícios já tinham, mesmo corpo):
`convertNumberedPinyin` + NFC + minúsculas + sem pontuação. A marcação usa a mesma conversão, só sem baixar a caixa
(o alinhamento já ignora maiúscula). Assim: "ni3 hao" por "nǐ hǎo" mostra "nǐ h**a**o" (só o "a" sem tom marcado);
"ni3 hao3" certo não marca nada; pontuação, que o veredito ignora, não aparece vermelha. Comparar o texto cru marcaria o
"3" como erro numa sílaba que o veredito deu como certa.

## O que muda para a aluna

- zh: no "Digite o pinyin do que ouviu" e na lacuna digitada, o painel de erro ganha "Sua resposta" com as letras erradas
  marcadas (como no fr). O título continua dizendo "Quase! O tom não é esse" quando é só o tom.
- zh: dica do Verdadeiro ou Falso passa a citar a explicação já vista ("Pense na explicação: ..."), como no fr.
- zh: no Ordenar errado, os blocos já na posição certa ficam verdes (antes todos ficavam vermelhos).
- zh: o mp3 pré-gravado toca a 0,9 (como no fr). A voz do navegador continua a 0,85.
- zh: selo de unidade pulada por `t('trail.unit.skippedBadge')` ("⏭ Pulada" / "⏭ Skipped"; antes "⏭ 跳过", inalcançável hoje)
  e "pts" da Revisão rápida por `t('review.speed.points')`. O fr também tinha um "pts" fixo no placar ao vivo (`.speed-score`): trocado.
- fr: nada muda na tela (prova abaixo).

## Provas (2026-10-23)

- `tests/paridade-sites/test_licao_feedback.js` (novo): 43/43. C2 fr: `typedAttemptHTML` comum = fr antigo (`93bbd071`)
  em 26 772 casos (todo "f" do `fr/content.js` com erros gerados), 0 diferenças. C2 zh: 6 336 respostas em 576 pinyins do
  `zh/content.js` (numerado, sem tom, tom trocado, letra a menos/a mais, maiúsculas, pontuação): veredito e aviso de tom
  iguais aos de antes; toda resposta errada tem marca; numerado certo não marca. C3, C4, C5 e D6 nos dois sites.
- `tests/paridade-sites/test_licao_feedback_playwright.js` (novo): 24/24 (digitar, lacuna e Ordenar errados em fr e zh,
  `playbackRate` 0,9 nos dois, selo "⏭ Skipped" e "7 pts" no zh em inglês, sem rolagem horizontal). Capturas com
  `SHOTS=pasta`: fr e zh, claro e escuro, 390 e 900px (20 imagens), conferidas.
- Teste atualizado de propósito: `tests/e4/test_lote5c_chaves.js` esperava `pregenRate()` 0 no zh; agora 0,9 nos dois (20/20).
  `tests/familia-latina/extrair-fr.js` pega `alinharLetras` do core (paridade com o fr antigo: 1 483 871/1 483 871).
- Regressão: respostas-digitadas (17/17, 5/5, navegador 10/10), e4 (core 31/31, 5c 20/20, 5d 12/12, 5e 10/10, ida e volta 26/26),
  família latina (60/60, 121/121, navegador 23/23), modo foco 19/19, i18n unit 2344/2344, sem português no en 6/6 (0 trechos),
  i18n navegador 209/209, trilha repinta 26, paridade CSS 6/6, cores-marca 20/20, 6/6, 26/26, checkpoint-zh 25/25,
  `zh/scripts/test_answer_validation.js` 39/39, conjugação 80/80, xp 10/10, 18/18, 10/10, 9/9, diálogo 20, curriculo-ids
  125/125 e 39/39, trilha UI 86, pular checkpoint 19, histórias 4, lembrete de revisão 26. Varredura de literais em português igual à da main.
- Falha pré-existente (igual na `origin/main`): `tests/e4/test_lote5b_textos.js` 9/11 (`review.match.attempts` não é texto simples).

## Pendências

- Nenhum passo manual (sem banco, sem Edge Function). Publica com o próximo PR que a dona pedir.
- A dona pode pedir outra velocidade para o zh depois: é só o `pregenRate` do `zh/lang-hooks.js`.
