# 34. Progresso das palavras que trocam pelo idioma do site e lição sem tradução escondida (2026-11-11)

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

## Defeito 2: lição sem tradução (virou regra nova)

O aviso "This lesson isn't available in English yet" (`#ud-lang-notice`) usava a classe `lesson-unit-goal`, que o modo foco esconde,
então nunca aparecia. O primeiro conserto (classe própria) mostrava o aviso e abria a lição em português. A dona achou errado
(2026-11-11): **lição sem tradução não deve aparecer nem poder ser aberta**; as unidades seguintes continuam normais.

Regra nova, num ponto só (`shared/core/licao-base.js`): `isUnitAvailable(u)` (= `CONTENT_I18N.isUnitTranslated`) e
`availableUnits(lista)`. `trailGroups()` passa a usar só as unidades disponíveis, então a liberação, o "Continuar" e a próxima lição
pulam a escondida sozinhos. Também filtram: trilha em lista e Mapa (fr por módulos, zh por unidades e por módulos), busca do zh,
selo de nível concluído, módulos (`moduleVisibleUnitIds`: liberação, porcentagem, módulo concluído, prova do Ponto de verificação e
telas finais do módulo e do Teste de Nível; módulo sem nenhuma unidade disponível some). `openUnitDetail` não abre a unidade
escondida (volta para a trilha), inclusive por link antigo. O aviso, o CSS e o código dele saíram dos dois sites; as frases
`content.untranslatedNotice` ficaram no catálogo, sem uso.

O progresso da unidade escondida continua no save (ela segue em `UNITS`); hoje nenhuma unidade está sem tradução (fr 30/30, zh 18/18
em inglês), então nada muda para os alunos agora: a regra vale para conteúdo futuro.

## Testes

- `tests/i18n/test_card_variants_browser.js` 24/24, com 8 verificações novas (troca depois do carregamento; carregar com 美 e o
  site em português; só os cartões que trocam gravam a palavra). Sem o conserto, as 8 falham.
- `tests/i18n/test_content_en.js` 32/32 e `test_content_zh_en.js` 18/18 (regra nova: não aparece na lista, no Mapa nem na busca, não abre, a seguinte libera); `tests/k2c/test_study_native_unit.js` 88/88 (lista do save com `variantWord`; e a
  regex do `serializeCardsForSave`, que estava velha desde o A2).
- Paridade "antes x depois": o aviso que saiu e o `variantWord` entraram nas neutralizações de `test_quase_iguais.js`,
  `quase-iguais-harness.js` e `test_atalhos.js` (com data e motivo). Com isso o resultado fica igual ao da `main` (fr 995/1000 e
  368/373, zh 999/1004 e 358/363; as 20 diferenças que sobram já estavam na `main`, de outras sessões). `test_atalhos` 92/92,
  `test_voz` 34/34, `test_correcoes_5d` 4/4, `test_m2_voz_cancelar` 16/16, `test_css_compartilhado` 5/5.

## Defeitos 3, 4 e 5 da mesma varredura

- 3 (link de turma do Mural) e 4 (deck público legado de português): pendências do site em português, decisão da dona em
  2026-11-11; registrados como T9 e T8 em `docs/i18n/e6-minimo-servidor-pt.md` seção 3.3.
- 5 (sem internet logo depois de publicar): consertado por outra sessão no PR #466 (`docs/historico/33-pwa-cache-offline.md`); depois a
  dona decidiu que, por enquanto, o site só funciona com internet (tela "Sem internet", PR #468, regra em `.claude/rules/frontend-fr-zh.md`).

## Testes que ficaram para trás (PR seguinte, 2026-11-13)

Pedido da dona: atualizar num PR separado os testes que falhavam por mudanças aprovadas (nada muda no site). Cada ajuste diz a
data e o motivo no próprio teste: `test_desafios.js` 2333/2333 (antes 362 falhas: Grátis da Etapa 7 só no lado pt, selo
"Concluído" na lista de textos, Etapa D no Ouça e traduza/Acentuação/Complete a frase, espaço no class do 🐢);
`test_quase_iguais.js` 2752/2752 (moldura da sessão da Revisão da Etapa D, lote 3; "todas as novas de uma vez");
fase-h, e4 lote 5b, painel-admin analytics, fase-public-deck (textos das Etapas 4 e 7); desafios-progresso (anel no lugar
da barra); curriculo-ids save antigo (`bestStreak`); k2c e k2i (conferem o save, não a memória); trilha-tags (harness);
fase-identity (escape sem DOM, `get_my_profile`); report-reply (código em `email.ts`); pt-servidor (a cópia do
`notification-cron` para colar no painel ganhou a regra v30 da sequência em risco, igual ao `index.ts`).

Continuam falhando de propósito: `tests/registro/test_registry.js` e `tests/fase-public-deck/test_legacy_parity.js` (T9 e
T8, para quando o site pt abrir). Instáveis só quando rodam junto com outros (sozinhos passam; também na `main`):
`test_ui_language_*_browser.js` e a sequência em inglês do `test_quase_iguais.js` (o sorteio das opções do exercício
muda com a ordem de carregamento; em 2026-11-05 aconteceu no zh, agora no fr).

## Paridade em inglês estável (2026-11-13)

Causa achada: a frase de "carregando" (`loadingHTML`, `shared/utils.js`) sorteia com `Math.random`, o mesmo sorteio (com semente
fixa) que embaralha as opções dos exercícios. Quantas telas de "carregando" aparecem antes da 1ª lição depende de quando cada
carregamento termina; rodando junto com outros testes de navegador isso mudava, e o sorteio das opções da lição saía outro
(a sequência em inglês divergia desde a 4ª tela). Conserto só no harness `tests/paridade-sites/quase-iguais-harness.js`, igual nas
duas árvores: a frase de "carregando" fica fixa (sem tocar no sorteio) e a semente recomeça depois de cada cena, pela posição
da cena. O site não muda. Resultado: 2770/2770 sozinho e 3 vezes seguidas junto com `test_desafios`, `pwa-cache`, `test_atalhos` e
`test_ditados` ao mesmo tempo.
