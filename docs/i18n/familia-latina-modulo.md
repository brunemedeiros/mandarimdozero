# Módulo da família latina, fases 1 e 2 (2026-10-15)

> **Fase 2 feita** (seção 10): o fr usa o módulo de verdade. As seções 1 a 9 são o relatório da fase 1 (algumas frases
> sobre "não carregado" e "achados" valem só para aquele momento; o que mudou está na seção 10).

Pedido: extrair as regras de acento do francês para um módulo da família latina, com testes do português escritos a partir de exemplos reais, **sem religar o fr** (nenhuma mudança em produção). Base: decisão de famílias (`e4-plano-de-extracao.md`, seção 10) e ordem da E5 (`auditoria-app-portugues.md`, seções 7 e 8, passo 2).

## 1. Arquivos

| Arquivo | O que é |
|---|---|
| `shared/core/familias/latina.js` | Funções puras (sem DOM, STATE nem `t()`), um único global `FamiliaLatina` (no Node, `module.exports`). **Não é carregado por nenhuma página.** |
| `shared/core/familias/latina-idiomas.js` | Configuração do `fr` (cópia exata do que está no `fr/app.js`) e do `pt` (português do Brasil como idioma estudado, para quem fala inglês). |
| `tests/familia-latina/extrair-fr.js` | Extrai as funções de hoje do TEXTO do `fr/app.js` (+ `shared/core`, via `tests/e4/app-source.js`) e roda num VM. |
| `tests/familia-latina/test_paridade_fr.js` | Paridade fr x módulo sobre todo o conteúdo real do curso de francês e variações dele. |
| `tests/familia-latina/test_portugues.js` | Exemplos reais do português + propriedades sobre o texto em pt-BR da dona (`courses/fr-pt-BR/layer.js`). |
| `tests/familia-latina/test_frances.js` | Exemplos reais do francês, incluindo os achados como comportamento atual. |
| `tests/familia-latina/run.sh` | Roda os três. |

Os arquivos ficam numa subpasta de `shared/core/` de propósito: `tests/e4/test_core_carregado.js` exige que todo `shared/core/*.js` esteja no `index.html`; a subpasta não entra nessa regra até a fase 2.

## 2. Mapa do que existe hoje (só leitura)

**`fr/app.js`** (números de linha desta branch):
| Onde | Função | Regra |
|---|---|---|
| 5612 | `normalizeLoose` | sem acento + minúsculas: base de tudo que é "acento não conta" |
| 3274 / 3470 | seta `strip` (vocabulário de ouvido / lacuna digitada) | acento não conta; certo ou errado. As duas listas de pontuação diferem (só a do vocabulário ignora `’`) |
| 2160 | `canonSep` / `looseSep` (exercício de gramática) | hífen = espaço = apóstrofo; acento errado = "Quase" |
| 5182 | `conjEvaluate`, `conjOtherFormOf` | acento/maiúscula = "Quase", mas forma de outro tempo = erro. Dependem de `CONJUGATION_VERBS`: ficam no fr |
| 5216 | `conjAlign` | distância de edição letra a letra (marca as letras erradas) |
| 5300 | `conjFold` | busca de verbos sem acento |
| 8630 a 8654 | `normalizeForAccentCompare`, `isAccentAnswerCorrect`, `stripDiacriticsForAccentCompare`, `accentAnswerOutcome` | desafio Acentuação: acento EXIGIDO; só acento diferente = "Quase" |
| 6205 a 6584 | bloco do ditado (`normalizeDictationWord`, `dictLooseNorm`, `dictLightReason`, `frenchNumberWords`, `DICT_SPOKEN_PUNCT`, `prepareDictationUserText`, `tokenizeDictationText`, `mergeSplitCompoundWords`, `diffDictationWords`, `mergeDictationDiff`, `evaluateDictation`, `DICT_HOMOPHONE_GROUPS`, `classifyDictationError`) | tipos de erro leve: hífen, apóstrofo, ligadura, acento, grafia; homófonos e concordância |
| 6603 | `dictationLightNoteText` | texto da explicação do erro leve |
| 3215 a 3245 | `FR_ACCENT_GROUPS`, `frAccentPickerHTML`, `wireFrAccentPicker` | teclado de acentos (insere no cursor) |
| 5722 | teclado da Conjugação | repete a lógica do `wireFrAccentPicker` com "último campo focado" |
| 8216 | `normalizeForTranslationCompare` | compara a TRADUÇÃO (língua de origem), não o idioma estudado: já está em `shared/translation-compare.js`; fora deste módulo |

**`shared/`** (já compartilhado, neutro de idioma, ficou fora do módulo): `review-answer-extras.js` `typedAnswerVerdict` (Revisão: ok/quase/errou, aceita 1 letra de diferença em palavra de 5+), `checkpoint-exam.js` `scoreCheckpointAnswer`, `flashcard-model.js` `normalizeTagSlug` (tags), `review-bank.js` (busca), `mural.js` (nome de arquivo).

**`zh/app.js`**: nada da família latina (o pinyin tem a regra oposta: tom é exigido).

## 3. O que o módulo tem

- Genéricas: `semAcento`, `normalizarFrouxo`, `dobrarBusca`, `formasAceitas`, `respostaDigitadaCerta` (com a lista de pontuação como parâmetro), `avaliarRespostaDigitada` (nova, 3 níveis, modo `tolerante` ou `quase`), `avaliarComSeparadores`, Acentuação (`acentuacaoCerta`, `resultadoAcentuacao`), `tiposDeErroDeAcento` (novo: faltou, sobrou ou trocado, e qual marca: agudo, grave, circunflexo, til, cedilha, trema), `nomeDaMarca`, `htmlTecladoDeAcentos` (classes como parâmetro), `inserirNoCursor`.
- Por idioma, `FamiliaLatina.criar(config)`: todo o ditado (normalização estrita e frouxa, motivo do erro leve, preparo do texto, alinhamento, nota, classificação da troca, texto da explicação), mais contrações e acentos abolidos para quem declarar.
- Configuração: ligaduras, hífen, apóstrofo, elisão, grupos do teclado, pontuação falada, números por extenso, homófonos, regra de concordância, contrações, acentos abolidos, textos das explicações.

## 4. O que é só do francês
Ligaduras `œ`/`æ`; elisão (`j' ai` vira `j'ai`); números com `soixante-dix`/`quatre-vingts`; pontuação ditada (`virgule`, `point`...); homófonos (a/à, et/est, son/sont...); concordância por sufixo `-e/-s/-es/-x`; teclado com `è ë î ï œ ù û ü`; textos das explicações em pt-BR. Tudo isso está em `latina-idiomas.js` (`fr`) e, na fase 2, vai para `fr/lang-hooks.js`.

## 5. O que o português precisa de diferente (rascunho para a revisão da dona)
- **Teclado**: `á à â ã`, `ç`, `é ê`, `í`, `ó ô õ`, `ú`. Sem `ü` (trema abolido) e sem as letras do francês.
- **Contrações** (de + a = da, em + o = no, por + a = pela, em + um = num, de + isso = disso, de + ele = dele): ditado com "em o" por "no" vira erro leve de contração, com explicação. O contrário também ("da" onde a norma separa: "antes de a aula começar"). A crase fica fora das contrações: "à" x "a" é diferença de acento e já cai no grupo a/à/há.
- **Números com gênero**: "2" vale "dois" ou "duas" conforme o texto; "14" vale "catorze" ou "quatorze"; e o dígito do próprio texto fica como está.
- **Reforma de 2009**: "idéia", "vôo", "lingüiça", "pára" etc. viram erro leve de acento com a explicação de que o acento caiu.
- **Concordância**: o português troca a vogal final (obrigado/obrigada, falo/fala, bonitos/bonitas), além de plural (+s, +es, -ão para -ões/-ães/-ãos) e -or/-ora. Nome próprio não conta.
- **Homófonos e acento diferencial** (com explicação em inglês, porque o `/pt` só tem site em inglês): a/à/há, mas/mais, e/é, esta/está, por/pôr, pode/pôde, tem/têm, vem/vêm, mal/mau, cem/sem, nos/nós, da/dá, avó/avô, pais/país, sexta/cesta, concerto/conserto, acento/assento.
- **Pontuação ditada**: vírgula, ponto, ponto final, ponto de interrogação, ponto de exclamação, ponto e vírgula, dois pontos. Aspas curvas “ ” são ignoradas no ditado.
- **Apóstrofo**: existe, raro (copo d'água, Sant'Ana); sem elisão.
- Nomes das marcas em inglês para a aluna (crase, tilde, cedilla...).

## 6. Achados (nada foi mudado)
1. `fr/scripts/test_answer_validation.js` **está quebrado desde o lote 4 da E4**: extrai o bloco `accent-answer-logic` do `fr/app.js` esperando `acceptedForms` lá dentro, e ela foi para `shared/core/estado-trilha-desafios.js`. Sai com `ReferenceError` antes de testar. Conserto simples (ler com `withCore`, como os testes de `tests/e4`), fora do escopo desta fase.
2. **"soeur" por "sœur"**: no vocabulário e na lacuna digitada dá ERRADO (o acento é tolerado, mas `œ` não é acento para o NFD); no desafio Acentuação também dá errado (não "Quase"); no ditado é erro leve de ligadura. 16 itens do `fr/content.js` têm `œ`.
3. As explicações do ditado (`classifyDictationError`, `dictationLightNoteText`) são **texto em português escrito direto no `fr/app.js`**: aparecem em português também no site em inglês (contra a regra do projeto).
4. **Dígitos no texto do ditado**: se o texto tiver "30", a aluna que digita "30" perde ponto (o dígito dela vira "trente"). Latente: nenhum dos 21 ditados do fr tem dígito. O módulo tem a opção `digitosDoTextoFicam` (ligada no pt, desligada no fr para a paridade).
5. As duas setas `strip` do fr ignoram pontuações diferentes: `l’école` (apóstrofo curvo do celular) é aceito no vocabulário e recusado na lacuna digitada.
6. Ditado: dois erros na mesma palavra (sem hífen E sem acento, "peut etre") caem em "pequena diferença de grafia" em vez de citar os dois.
7. Aplicada ao português, a regra do fr ("acento não conta") aceitaria "avô" para "avó" e "pais" para "país" (teste documenta).

## 7. Decisões para a dona
1. **Português, exercícios de digitar**: acento não conta (como no fr) ou acento faltando = "Quase" (meio ponto, mostra a forma certa)? Recomendo "Quase" (`avaliarRespostaDigitada` com `acento: 'quase'`) por causa de avó/avô, pais/país, esta/está.
2. **Contração no ditado**: "em o" por "no" vale meio ponto (como está) ou ponto inteiro com aviso? E "da" onde a norma separa ("antes de a aula começar"): meio ponto (como está) ou aceitar, já que na fala ninguém separa?
3. **Grafia antiga (Reforma de 2009)**: meio ponto com explicação (como está) ou aceitar com aviso?
4. **Francês, "oe" por "œ"**: continuar errado no vocabulário e na Acentuação, ou virar "Quase"/aceito como no ditado? (Mudaria o fr: só com autorização.)
5. **Francês, explicações do ditado no site em inglês**: passar para os catálogos de tradução na fase 2 (muda o que a aluna do site em inglês vê, para melhor).
6. Revisar os textos em inglês e a lista de homófonos do pt em `latina-idiomas.js` (rascunho meu, confiança alta nos fatos de gramática; média em "sexta/cesta soam igual na maior parte do Brasil").

## 8. Fase 2: como religar o fr (lote por lote, só com autorização)
Antes de começar: consertar `fr/scripts/test_answer_validation.js` (achado 1) e gravar um **gabarito** das saídas atuais: o `extrair-fr.js` passa a aceitar um commit de referência (ler o `fr/app.js` com `git show <commit>:fr/app.js`), para que a paridade continue comparando com o código ANTIGO depois que o novo virar só um repasse.

Ordem (menos arriscado primeiro), cada lote com os mesmos gates dos lotes da E4: bateria completa antes e depois (as mesmas falhas, nenhuma nova), `tests/e4/test_progresso_ida_e_volta.js` 22/22, `tests/e4/capturas.js` + `comparar-capturas.js` (18 de 18 iguais), `tests/e4/test_core_carregado.js`, `tests/familia-latina/run.sh` contra o gabarito, e os testes da área (`tests/ditado`, `tests/conjugacao`, `fr/scripts/test_answer_validation.js`).
1. **L1, comparação pura**: carregar `latina.js` e a configuração no `fr/index.html` antes do `app.js` (e no service worker), e trocar o corpo de `normalizeLoose`, `conjFold`, `conjAlign` e das setas `strip`/`canonSep`/`looseSep` por chamadas ao módulo, mantendo os nomes e os marcadores BEGIN/END.
2. **L2, Acentuação**: o bloco `accent-challenge-logic`.
3. **L3, Ditado**: o bloco `dictation-answer-logic` + `dictationLightNoteText`; os dados do fr (homófonos, números, pontuação falada) vão para `LANG_HOOKS` em `fr/lang-hooks.js`. Os textos das explicações vão para `t()` num lote separado, porque mudam o site em inglês (decisão 5).
4. **L4, teclado**: `frAccentPickerHTML` e `wireFrAccentPicker` (e a cópia do teclado da Conjugação) passam a usar `htmlTecladoDeAcentos` e `inserirNoCursor`; o CSS `fr-accent-*` vira `lat-accent-*` só se a dona quiser (mexe em captura de tela).
5. Depois disso, o grupo D da E4 (exercícios grandes) pode ser desenhado com o `/pt` como segundo membro da família, como decidido na seção 10 do plano.

## 9. Números desta fase
- `node --check` nos 2 arquivos do módulo e nos 4 de teste: ok.
- `test_paridade_fr.js`: **1.594.677/1.594.677** comparações iguais, 21 grupos (corpus: 9.173 textos do curso de francês, 21 ditados, 10.902 formas verbais, mais variações). Conferido que o teste pega diferença: com a elisão desligada e um homófono a menos na configuração do fr, 3 grupos falham.
- `test_portugues.js`: **111/111** (inclui 571 frases reais em pt-BR da dona: ditado da própria frase = 100, sem acento só gera erro leve de acento, Acentuação sem acento = "Quase").
- `test_frances.js`: **31/31**.
- Sem regressão nos vizinhos: `tests/e4/test_core_carregado.js` 27/27, `tests/i18n/test_i18n_unit.js` 2032/2032, `tests/i18n/test_translation_compare.js` 18/18, `tests/e4/test_lote5e_dados.js` 10/10.

## 10. Fase 2 (2026-10-15, autorizada pela dona): o fr religado ao módulo

Branch local `familia-latina-fase2`, um commit por lote. Nada em Supabase/produção, zh sem mudança.

### Como ficou
- `fr/index.html` carrega `../shared/core/familias/latina.js` antes do `lang-hooks.js` (o `latina-idiomas.js` não entra
  na página: agora só guarda o rascunho do pt).
- A configuração do francês está em `fr/lang-hooks.js`, `LANG_HOOKS.familiaLatina` (ligaduras, hífen, apóstrofo,
  elisão, regra de acento nos exercícios de digitar, teclado, pontuação falada, números, homófonos, concordância e os
  textos das explicações via `t()`).
- No `fr/app.js`, as funções mantêm o nome (e os marcadores BEGIN/END) e só repassam: `normalizeLoose`, `conjFold`,
  `conjAlign`, `lessonTypedAnswerResult` (nova: "Digite o que ouviu" e lacuna digitada), o exercício de gramática,
  o bloco `accent-challenge-logic`, o bloco `dictation-answer-logic`, `dictationLightNoteText`, `frAccentPickerHTML`,
  `wireFrAccentPicker` e o teclado da Conjugação (`insertAccentAtCursor`, nova). `latinaFr()` cria a instância.
- Explicações do ditado: chaves `fr.dict.*` em `shared/i18n/pt-BR.js` (texto igual ao de antes) e `en.js`
  (tradução nova, needs_review, confiança em cada linha). Inclui o título "Faltou este sinal (não desconta pontos)".

### Mudanças de comportamento do francês (todas autorizadas)
| | Onde | Antes | Agora |
|---|---|---|---|
| (a) | "Digite o que ouviu" e lacuna digitada: "soeur" por "sœur" | errado | Quase: meio ponto, painel de acerto com "Quase lá" e a forma certa; XP pela metade (2 em vez de 4) |
| (a) | Desafio Acentuação: "soeur" por "sœur" | Errado (fail) | Quase (partial), com o texto de sempre "Quase: confira os acentos." |
| (a) | Ditado: "soeur" | erro leve de ligadura (meio ponto) | igual (já era erro leve) |
| (b) | Explicações do ditado no site em inglês | em português | em inglês; no site em português, texto idêntico |
| (c) | Lacuna digitada com apóstrofo curvo ("l’école") | errado | certo (mesma lista do "Digite o que ouviu") |
| (d) | Ditado cujo texto tem número em dígito ("30") e a aluna digita "30" | perdia ponto (o "30" dela virava "trente") | acerto, sem a nota "por extenso" |
| (e) | Ditado: dois erros leves na mesma palavra ("peut etre") | "pequena diferença de grafia" | "confira o hífen e os acentos" (`reason: 'multiple'`, `reasons`), nota igual (meio ponto) |

Português (só o módulo, sem página): `acentoNaDigitacao: 'quase'` (avô/avó, pais/país), textos em inglês para dois erros na
mesma palavra. Contrações e grafia antiga ficam como estavam (meio ponto com explicação).

### Testes
- `tests/familia-latina/extrair-fr.js` lê o fr ANTIGO do commit `675f824` (gabarito, `FAMILIA_LATINA_REF` troca) e o novo
  (fr/app.js + módulo + lang-hooks). `test_paridade_fr.js` compara os dois e só aceita as diferenças das regras (a), (c),
  (d) e (e), contadas à parte por regra. Conferido que ele pega diferença: com `acentoNaDigitacao: 'quase'` no fr,
  2 grupos falham (24.502 comparações).
- `tests/familia-latina/test_playwright.js` (novo): telas do Quase, Acentuação, ditado no site em inglês e em português,
  teclado. `run.sh` roda os quatro.
- `fr/scripts/test_answer_validation.js`: o helper do vocabulário passou a usar a função real do app (antes era uma cópia da
  seta `strip`); as 154 asserções antigas continuam iguais e passam; 22 casos NOVOS marcados "NOVO (a)..(e)".
- `tests/i18n/test_i18n_unit.js`: chaves novas na lista NEW_KEYS (`fr.dict.light.multiple`, `fr.dict.part.*`, e
  `fr.dict.hom.ces`, cujo texto só perde o escape `\'` do código antigo).

### Pendente
- Revisão da dona: traduções em inglês `fr.dict.*` (needs_review) e o texto "Quase: confira os acentos." aparecendo
  também quando a diferença é só o "œ" (pode merecer texto próprio; não criei texto novo em português sem aprovação).
- No ditado, a palavra composta digitada separada aparece junta na explicação ("você escreveu «peutetre»"): já era assim.
- O `/pt` (página, `pt/lang-hooks.js`) e o grupo D da E4 continuam para depois.
