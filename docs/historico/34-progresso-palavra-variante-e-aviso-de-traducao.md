# 34. Progresso das palavras que trocam pelo idioma do site e aviso de lição sem tradução (2026-11-11)

Defeitos 1 e 2 da varredura de testes de 2026-11-05 (nenhum teste da `tests/` falhava por ambiente depois de
`tests/banco-local.sh`; 21 falhavam de verdade). Consertos autorizados pela dona em 2026-11-11. Valem para fr e zh (código em
`shared/` e nos dois `index.html`) e para o futuro pt. Nada no banco. Tudo grátis.

## Defeito 1: progresso trocado e depois perdido

Cartões que trocam de PALAVRA conforme o idioma do site ou o país do perfil (fr `uA1-2-v8` e verso: "brésilien / brésilienne"
no português, "américain / américaine" no inglês; zh `u2-v6` 巴西/美国 e o hanzi 巴/美) guardam o progresso da palavra que não
está na tela numa gaveta (`STATE.cardVariants`, `shared/card-variants.js`). Desde o K2-C o save da trilha só tem id e
progresso, então não dizia de QUAL palavra era o progresso salvo.

Caso reproduzido no navegador (aluna estuda "brésilien" 4 vezes no português, troca para o inglês, estuda "américain" 2
vezes, fecha e abre o site em português):
1. ao abrir, "brésilien" aparecia com as 2 revisões do américain;
2. trocando de novo para o inglês, essas 2 revisões iam para a gaveta como se fossem do brésilien, POR CIMA das 4 verdadeiras,
   e o américain voltava a zero. Perda de memória FSRS.

Conserto: o save grava `variantWord` (a palavra dona do progresso) nos cartões que já trocaram de palavra (campo novo em
`STUDY_PROGRESS_FIELDS`; o hanzi do zh já salvava o objeto inteiro) e `swapCardWordProgress` usa essa palavra como a "antiga".
Só vale se o cartão tem gaveta (um progresso vindo de outro id por fusão do currículo nunca é guardado com o nome de outra
palavra). Save antigo sem o campo funciona como antes. Cartões que nunca trocaram de palavra não ganham nada no save.

Produção conferida antes (2026-11-11, só leitura): das 47 contas com progresso, 2 tinham gaveta, ambas com 0 revisões. Ninguém
perdeu progresso.

## Defeito 2: aviso "This lesson isn't available in English yet" nunca aparecia

O aviso (`#ud-lang-notice`) usava a classe `lesson-unit-goal`, que o modo foco esconde (`body.lesson-focus .lesson-unit-goal`),
e a lição sempre abre em modo foco. Ganhou a classe própria `lesson-lang-notice` (mesmo visual: itálico, cor `--ink-soft`) nos dois
`index.html`. Conferido em fr e zh, claro e escuro, 390 px.

## Testes

- `tests/i18n/test_card_variants_browser.js` 24/24, com 8 verificações novas (troca depois do carregamento; carregar com 美 e o
  site em português; só os cartões que trocam gravam a palavra). Sem o conserto, as 8 falham.
- `tests/i18n/test_content_en.js` 30/30; `tests/k2c/test_study_native_unit.js` 88/88 (lista do save com `variantWord`; e a
  regex do `serializeCardsForSave`, que estava velha desde o A2).
- Paridade "antes x depois": a classe do aviso e o `variantWord` entraram nas neutralizações de `test_quase_iguais.js`,
  `quase-iguais-harness.js` e `test_atalhos.js` (com data e motivo). Com isso o resultado fica igual ao da `main` (fr 995/1000 e
  368/373, zh 999/1004 e 358/363; as 20 diferenças que sobram já estavam na `main`, de outras sessões). `test_atalhos` 92/92,
  `test_voz` 34/34, `test_correcoes_5d` 4/4, `test_m2_voz_cancelar` 16/16, `test_css_compartilhado` 5/5.

## Defeitos 3, 4 e 5 da mesma varredura

- 3 (link de turma do Mural) e 4 (deck público legado de português): pendências do site em português, decisão da dona em
  2026-11-11; registrados como T9 e T8 em `docs/i18n/e6-minimo-servidor-pt.md` seção 3.3.
- 5 (sem internet logo depois de publicar): consertado por outra sessão no PR #466 (`docs/historico/33-pwa-cache-offline.md`).
