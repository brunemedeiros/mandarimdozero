# Padrão único de feedback dos exercícios (estudo do código e proposta)

Data: 2026-10-18. Pedido da dona: `12-decisoes-apos-maquete-m1.md`, itens 6, 7 e 8 (referência: Busuu).
Escopo: só análise e desenho. Nenhum código foi alterado. Grátis x Premium: **tudo grátis** (feedback é parte da lição; não
existe exercício nem idioma do site que fique atrás de cadeado por causa disto).

O que a dona pediu, em uma frase: depois de QUALQUER resposta (certa ou errada), um painel embaixo com o estado ("Bom trabalho!",
"Quase", "Resposta correta"), um cartão com 🔊 + a frase certa no idioma estudado + a tradução logo abaixo, e o botão Continuar;
nos exercícios de digitar e de conjugar, as letras erradas ou o que faltou marcados em vermelho.

---

## 0. Resumo dos achados (o que surpreende)

1. **Já existe diferença letra a letra**, mas só em 3 lugares: "Digite o que ouviu" e "Complete a frase" digitado da trilha do
   francês (`typedAttemptHTML`, `fr/app.js:5262`) e a Conjugação (`conjAnswerViewHTML`, `fr/app.js:5248`). Os dois usam o
   mesmo alinhamento (`alinharLetras`, `shared/core/familias/latina.js:166`). Onde a dona viu "só a caixa vermelha com a resposta"
   é nas **gramáticas** (`fr/app.js:2129`), no **Ponto de verificação do módulo** (`fr/app.js:4644`) e no **Teste de nível**
   (`fr/app.js:4796`): ali não há painel, nem áudio, nem tradução, nem marcação de letras. No chinês não há marcação em lugar nenhum.
2. **O alinhamento atual trata acento como erro**: `"je suis etudiant"` x `"je suis étudiante"` sai `je suis [e]tudiant_`, com o
   `e` sem acento pintado de vermelho igual a uma letra errada, embora na trilha o acento **não desconte** (decisão de 2026-09-16,
   `fr/lang-hooks.js:39`). Também marca maiúscula como certa mas pontuação como erro (`"Nous avons."` sai `Nous avons{+.}`), faz
   "sopa vermelha" quando a palavra é outra (`"merci"` x `"au revoir"` = 7 marcas) e bagunça ligadura (`"soeur"` x `"sœur"` sai
   `s{+o}[e]ur`). Saída real do código hoje, conferida com `node` sobre `alinharLetras`.
3. **"Quase" aparece num painel VERDE de acerto**: no "Digite o que ouviu" e no "Complete a frase", o meio ponto abre
   `showCorrectFeedbackPanel` com um elogio sorteado ("Perfeito!") e, dentro, "Quase lá" (`fr/app.js:3306` e `3463`). O título e
   o corpo se contradizem.
4. **Acerto quase nunca mostra a tradução**: múltipla escolha, "O que você diria?", V/F e o "Digite o que ouviu" abrem o painel
   verde sem a frase e sem a tradução (`fr/app.js:3207`, `3306`, `3392`; `shared/core/quase-iguais-pinyin.js:116`). Só o
   "Complete a frase" e o "Ordene" mostram frase + tradução no acerto. No zh, o "Digite o pinyin" mostra o hanzi no acerto sem
   pinyin e sem tradução (`zh/app.js:3325`).
5. **Seis regras diferentes de comparação de resposta digitada no francês** (seção 1.4). O painel novo não precisa mexer em
   nenhuma delas (impacto zero em XP), mas a dona deve saber que "acento faltando" vale ponto inteiro num lugar e meio ponto em outro,
   e que a maquete (`maquete-m1`, tela `m11-digitar`) mostra "a bientot" como Quase, diferente do site de hoje.
6. **Faltam traduções na base** para montar o padrão em dois lugares: os 59 exercícios das 10 unidades de gramática (só têm
   `prompt` com lacuna e `answer`, `courses/fr-pt-BR/layer.js:305`) e as perguntas de compreensão do "Você entendeu?" (não dizem
   qual fala responde a pergunta). As frases do V/F (`subject`) não têm tradução própria, mas quase todas existem nas frases da unidade.

---

## 1. Inventário: onde há feedback de resposta hoje

Legenda das colunas: **Estado** (título do painel), **Frase** (frase certa no idioma estudado), **Trad.** (tradução), **🔊**
(áudio no painel), **Dif.** (diferença marcada), **Expl.** (explicação/nota), **Quase** (existe meio ponto).

### 1.1 Motor de exercícios da trilha (lições, checagem rápida, prática, revisão da unidade, Ponto de verificação da unidade)

Um só motor serve a ponte com a lição anterior, a checagem rápida do bloco, a prática, a prática mista, a "Revisão dos Erros" e a
consolidação/Ponto de verificação da unidade (`renderExerciseStep`, `fr/app.js:2931`, `zh/app.js:2936`; fases em
`shared/core/estado-trilha-desafios.js:569-640`). Os painéis vêm de duas funções:

- Acerto: `showCorrectFeedbackPanel(contentEl, detail)` (`shared/core/estado-trilha-desafios.js:845`, já compartilhada fr/zh):
  título = elogio sorteado ou combo (`nextCorrectFeedbackPhrase`, `shared/core/exercicios-licao.js:348`), `detail` livre em HTML
  montado por quem chama, botão Continuar.
- Erro e "Não sei": `showAnswerPanel(contentEl, ex, opts)` (`fr/app.js:3080`, `zh/app.js:3105`, quase idênticas; a do zh tem o
  título de tom). `showWrongAnswerPanel` (`shared/core/quase-iguais-simples.js:80`) só repassa. O corpo vem de
  `answerExplanationHTML(ex)` (`fr/app.js:3019`, `zh/app.js:3048`), que escolhe por `ex.format`. Efeitos colaterais que moram
  aqui e precisam continuar: zera o combo, soma `wordMisses` e `checkpointMisses`, `addStudyMinutes()` no Continuar.

| Exercício (fr / zh) | Acerto hoje | Erro hoje | Montado em |
|---|---|---|---|
| "O que significa?" (`meaning`) | Elogio. Sem frase, sem trad., sem 🔊 | "Não foi dessa vez" + Resposta certa: palavra 🔊 + trad. + "Onde você já viu isso" (frase de origem) ou nota da palavra | fr `3138`/`3207`, zh `3184`/`3257` |
| Ouvir e escolher (`listen`) | Igual ao de cima | Igual ao de cima | mesmas funções |
| "Digite o que ouviu" / "Digite o pinyin" (`type`) | fr: palavra 🔊 (sem trad.); meio ponto vira "Quase lá" dentro do painel verde. zh: hanzi 🔊 (sem pinyin, sem trad.) | fr: **Sua resposta com letras marcadas** (`typedAttemptHTML`) + resposta certa 🔊 + trad. + origem. zh: título "Quase! O tom..." quando só o tom difere, sem marcação | fr `3259-3330`, zh `3278-3350` |
| "O que você diria?" (`scenario`, só fr) | Elogio. Sem frase, sem trad. | Resposta certa: frase 🔊 + trad. | fr `3337-3398`, corpo em `3025` |
| Verdadeiro ou falso (`trueFalse`) | Elogio. Sem nada | Só o `whyNote` (sem frase, sem trad. da frase julgada) | `shared/core/quase-iguais-pinyin.js:61-121`, corpo fr `3047` |
| "Complete a frase" (`cloze`, opções ou digitado) | **Frase completa 🔊 + trad.** (já é o padrão); digitado com meio ponto: "Quase lá" no painel verde | Frase completa 🔊 + trad. + "Resposta certa: X"; digitado fr: Sua resposta com letras marcadas | fr `3404-3518` e `clozeFeedbackDetailHTML` `3011`; zh `3480-3605` e `3041` |
| "Ordene as palavras" (`reorder`) | **Frase 🔊 + trad.** | Sua resposta com blocos marcados (verde/vermelho tachado/amarelo sublinhado) + frase 🔊 + trad. + nota | fr `3522-3660`, zh `3683-3820` |
| "Escreva a frase" (`fullsentence`, só zh) | Frase (hanzi, pinyin, 🔊) + trad. | Frase + trad. | zh `3615-3680`, `phraseFeedbackDetailHTML` `3034` |
| "Não sei" → "Ver resposta" (todos) | não se aplica | "👀 Resposta revelada" + o mesmo corpo do erro | `wireDontKnowButton`, `shared/core/quase-iguais-chaves.js:22` |

O caso que a dona aprovou ("Ponto de verificação: a frase nova") é o `scenario` no erro: frase certa 🔊 + tradução
(`fr/app.js:3025-3029`). No zh, `phraseFeedbackDetailHTML` (`zh/app.js:3034`) é a peça mais próxima do padrão desejado: frase
(hanzi + pinyin + 🔊) e tradução separada por linha tracejada (`.feedback-phrase-trans`, `fr/index.html:1120`).

### 1.2 Passos fora do motor

| Lugar | Acerto hoje | Erro hoje | Montado em |
|---|---|---|---|
| "Você entendeu?" (3 checagens do diálogo, fr e zh) | Caixa própria `.dlg-fb.ok` "✅ Isso mesmo!", sem frase, sem trad., sem 🔊 | `.dlg-fb.no` com título **"Quase! A resposta certa era:"** (é erro, não meio ponto) + texto da opção certa, sem 🔊, sem trad.; acende a fala no diálogo | fr `2504-2585`, zh `2390-2470` |
| Exercícios das unidades de gramática (fr, `type:"grammar"`, 10 unidades, 59 itens) | Só a borda verde do campo | Borda vermelha + "→ resposta" embaixo do campo; Quase: borda e "Quase! → resposta". **Sem painel, sem 🔊, sem frase inteira, sem trad., sem marcação de letras**; botão "Próxima frase" secundário | fr `2129-2205`; CSS `fr/index.html:1197-1210` |
| Ponto de verificação do módulo (prova de 12) | Igual à gramática | Igual à gramática | fr `4644-4723` (`renderCheckpointQuizStep`) |
| Teste de nível | Igual à gramática | Igual à gramática | fr `4796-4876` (`renderLevelTestQuizStep`) |
| Conjugação, prática (fr) | Campo verde ✓ + 🔊 | Campo vermelho/amarelo com **letras marcadas** + "→ forma certa" 🔊 + aviso "é de outro tempo"; sem trad. da forma (o infinitivo traduzido fica no alto) | `conjAnswerViewHTML` fr `5248`, `renderConjPracticeStep` `5694-5745`; CSS `fr/index.html:3945-3951`, `4868-4882` |
| Jogos da Conjugação (fr) | "Certo" + por que esse tempo (linha do tempo) + 🔊 + trad. | Mesmo + "a resposta era X" | `shared/conj-games.js:110-120`. **Já segue o padrão Busuu** |
| Ditado (fr) | Texto do aluno com palavras certas, "quase" (leve) e erradas tachadas + a certa em seguida; frases com 🔊 uma a uma; nota 0 a 100; sem trad. | idem | `renderDictationResult` fr `6466-6545`; alinhamento por palavra `diffDitado` `shared/core/familias/latina.js:413` |
| Desafios (fr): Expressões, Ouça e traduza, Acentuação, Complete a frase (gramática) | Invólucro comum com ✓/~/✕ e corpo próprio por tipo | Ouça e traduza marca palavras da tradução; Acentuação mostra "sua resposta" e a palavra certa sem marcação de letras e sem trad. | `challengeFeedbackWrapperHTML` fr `7308`; corpos em `7999`, `8427`, `8533`, `8652` |
| Histórias (zh) | Opção certa verde, sem texto | Opção errada vermelha, sem texto | zh `1505-1535` |
| Teste de hanzi (zh) | Opção verde e avança sozinho em 0,9 s | idem | zh `5435-5455` |
| Revisão (flashcards, fora da trilha) "Digite a resposta" e Cloze | resposta colorida + "Quase lá" | resposta colorida, sem marcação de letras | fr `4037` e `4120`; `reviewAlmostHTML` `shared/review-answer-extras.js:55` |

### 1.3 Duplicação de código hoje

- `showAnswerPanel` e `answerExplanationHTML` existem duas vezes (fr e zh), quase iguais (cerca de 55 + 50 linhas cada).
- `clozeFeedbackDetailHTML` (fr `3011`, zh `3041`) e o miolo "frase + 🔊 + trad." aparecem montados à mão em pelo menos 7 pontos
  (fr `3016`, `3028`, `3032`, `3043`, `3306`, `3642`; zh `3036`).
- Os três blocos de "Verificar" das gramáticas, do Ponto de verificação e do Teste de nível são o mesmo código copiado
  (fr `2166-2205`, `4697-4723`, `4849-4875`), só muda o contador e o comparador.
- A caixa `.dlg-fb` do "Você entendeu?" está duplicada em fr e zh (`fr/app.js:2564`, `zh/app.js:2452`).
- `typedAttemptHTML` e `conjAnswerViewHTML` repetem o mesmo mapeamento operação → HTML (`fr/app.js:5252-5255` e `5269-5272`).
- Três famílias de classes para o mesmo conceito: `.wrong-feedback`/`.correct-feedback` (trilha), `.dlg-fb` (diálogo),
  `.gram-exercise.ok/.almost/.wrong` (gramática e provas), mais `*-feedback` dos Desafios e `.cg-verdict` dos Jogos.

### 1.4 Comparadores de resposta digitada (o que decide certo, Quase e errado)

| Onde | Função | Acento faltando | Maiúscula/pontuação | Outros |
|---|---|---|---|---|
| Trilha fr: "Digite o que ouviu", lacuna digitada | `lessonTypedAnswerResult` → `avaliarRespostaDigitada` (`latina.js:76`) | **certo, ponto inteiro** (`acentoNaDigitacao:'tolerante'`) | ignoradas | `oe` por `œ` = Quase |
| Gramáticas fr | `avaliarComSeparadores` (`latina.js:102`) | Quase (0,5) | maiúscula ignorada | hífen, espaço e apóstrofo valem igual |
| Ponto de verificação do módulo e Teste de nível | `scoreCheckpointAnswer` (`shared/checkpoint-exam.js:65`) | Quase (0,5) | palavra/gramática: maiúscula ignorada só no Quase; frase/escuta: ignoradas | |
| Conjugação | `conjEvaluate` (`fr/app.js:5206`) | Quase | maiúscula = Quase | forma de outro tempo = errado |
| Revisão (flashcards) | `typedAnswerVerdict` (`shared/review-answer-extras.js:32`) | Quase (Difícil) | ignoradas | 1 letra a mais/a menos em palavra de 5+ letras = Quase |
| Desafio Acentuação | `resultadoAcentuacao` (`latina.js:126`) | é o próprio objeto do exercício | | |
| zh trilha | `normalizePinyinAnswer` + `isToneOnlyMiss` (`zh/app.js:3374`, `3177`) | tom faltando/errado = **errado**, com título "Quase! O tom..." | maiúscula ignorada | pinyin numerado aceito |

Proposta: o componente de feedback **recebe** o veredito pronto e nunca decide nota. Unificar as regras é outra conversa
(pergunta 3 da seção 6).

---

## 2. Padrão proposto: um componente único

### 2.1 Onde mora (regra `qualidade-de-codigo.md`: função pura + camada fina)

| Peça | Arquivo novo | O que faz | Testável em Node |
|---|---|---|---|
| `diferencaDeLetras(digitado, alvo, regras)` | `shared/core/diferenca-de-letras.js` | Seção 3. Devolve segmentos tipados, sem HTML | sim |
| `modeloDoFeedback(entrada)` | `shared/core/feedback-resposta.js` | Normaliza a entrada (seção 2.2), escolhe título, rótulos e o que mostrar; devolve um objeto simples | sim |
| `feedbackRespostaHTML(modelo, ganchos)` | mesmo arquivo | Transforma o modelo em HTML com `t()` e `escapeHTML` injetados; sem DOM, sem `STATE` | sim (string) |
| `abrirPainelDeFeedback(hostEl, modelo, aoContinuar)` | mesmo arquivo (parte com DOM, curta) | Insere, liga 🔊 (`wireAudioButtons`), foco, Enter e o Continuar | Playwright |
| Ganchos por idioma | `fr/lang-hooks.js`, `zh/lang-hooks.js` (`LANG_HOOKS.feedback`) | fr: regras de acento/ligadura da família latina; zh: linha de pinyin e regra de tom | sim |

Os efeitos de progresso (combo, `wordMisses`, `checkpointMisses`, XP, `exerciseScore`, `addStudyMinutes`) continuam em quem chama
(`showAnswerPanel`/`showCorrectFeedbackPanel` viram camadas finas que fazem os efeitos e chamam o componente). Por isso o
impacto em XP e progresso é **nenhum**.

### 2.2 Entrada

```js
{
  estado: 'certo' | 'quase' | 'errado' | 'revelado',   // vem do comparador do exercício
  alvo: { texto: 'Je suis étudiante.',                 // frase/palavra certa no idioma estudado (resolvida, sem {placeholders})
          transcricao: null,                           // zh: pinyin da frase; fr: null
          audio: 'Je suis étudiante.' },               // texto falado (ou null quando não há áudio possível)
  traducao: 'Eu sou estudante.',                       // no idioma do site; null quando a base não tem (ver 2.4)
  respostaDoAluno: 'je suis etudiant',                 // só nos de digitar; null nos de clicar
  escolhaDoAluno: null,                                // nos de clicar: texto da opção escolhida, quando errada
  destaqueDaLacuna: 'suis',                            // opcional: a parte que o exercício cobrava (negrito dentro da frase)
  explicacao: null,                                    // opcional: whyNote, "é de outro tempo", explicação do Desafio
  notaRelacionada: null,                               // opcional: { titulo, corpo } (noteOrConceptReviewHTML, mesma regra de coerência)
  ondeViu: null,                                       // opcional: frase de origem (findMatchingPhrase)
  regrasDaDiferenca: 'latina' | 'pinyin' | null,       // de LANG_HOOKS
  rotuloContinuar: 'common.continueArrow'              // chave i18n (ex.: "Próxima pergunta", "Ver resultado")
}
```

### 2.3 Saída (o que o aluno vê, de cima para baixo)

1. **Faixa de estado** (cor + ícone + texto, nunca só cor):
   - `certo`: ✓ + elogio sorteado de sempre (`feedback.praise.*`, combo mantido). Fundo `--jade` suave.
   - `quase`: ~ + **"Quase!"** e uma linha curta do motivo ("Faltou o acento", "Escreva œ", "O tom não é esse"). Fundo do token
     novo `--feedback-almost` (âmbar). Deixa de existir o "Quase lá" dentro do painel verde.
   - `errado`: ✕ + "Não foi dessa vez". Fundo `--error-red` suave.
   - `revelado`: 👀 + "Resposta revelada" (como hoje).
2. **"Sua resposta"** (só digitar, e só em `quase`/`errado`): a resposta com a diferença letra a letra (seção 3).
   Nos de clicar com erro: "Você escolheu: …" em uma linha discreta (hoje a opção já fica vermelha na tela; a linha é opcional, ver pergunta 12).
3. **Cartão da resposta certa** (SEMPRE, nos 4 estados): rótulo "Resposta correta" (ou "Frase completa" no cloze), 🔊 (44 px no
   celular), a frase no idioma estudado com a parte cobrada em negrito, a transcrição (zh: pinyin, que obedece "esconder pinyin"
   porque usa a classe `.pinyin`) e, abaixo de uma linha tracejada, a **tradução** (reaproveita `.feedback-phrase-trans`).
4. **Explicação / nota / onde você viu** (opcional, só em `errado`/`revelado`/`quase`, nunca no `certo` para não alongar o acerto),
   com a mesma regra de coerência de hoje (`requireVocabMatch`).
5. **Continuar** (botão primário na cor do estado, `background` + `color` juntos com `--on-vivid`).

Comportamento:
- Painel **preso embaixo** da área da lição no celular (`position: sticky; bottom: 0`, altura máx. 60vh com rolagem própria), como
  no Busuu; no computador, no fluxo, logo abaixo do exercício (pergunta 5).
- Ao abrir: foco vai para o título do painel (`tabindex="-1"`), o painel tem `role="status"` e `aria-live="polite"`; o Continuar
  recebe Enter, com a trava de 350 ms que os Jogos já usam (`shared/conj-games.js`, `S.shownAt`) para o mesmo Enter que respondeu
  não pular o painel. Atalho global de Continuar respeita a regra "Enter dentro de campo pertence ao campo".
- Áudio: toca uma vez sozinho no `errado` e no `quase`; no `certo`, só nos exercícios em que o aluno ainda não ouviu a frase (clicar
  em tradução, cenário, V/F). Nos de ouvir, não repete sozinho. Preview nunca toca nem conta analytics (pergunta 4).
- Claro/escuro: só tokens; token novo `--feedback-almost` e `--on-feedback-almost` nos 3 blocos de tema de `fr/index.html` e
  `zh/index.html` (hoje `--conj-quase` existe só dentro de `#view-conjugaison`, sem tema escuro, `fr/index.html:4868`; passa a
  apontar para o token novo). Atenção: `--seal-red` é azul no fr; o componente usa `--jade`/`--error-red`/`--feedback-almost`.
- Site em inglês: todo texto por `t()`; a tradução vem da camada do curso no idioma do site (`content.en.js`), nunca do português.
  Chaves novas em `pt-BR` e `en`. Site em inglês não mostra nada em português.

### 2.4 Regras de conteúdo (de onde vem cada pedaço, e o que fazer quando falta)

| Exercício | Alvo (idioma estudado) | Tradução | Regra quando falta |
|---|---|---|---|
| Palavra solta (`meaning`, `listen`, `type`, "Como se diz?") | `item.f` / `item.c` + `item.p` | `item.t` | sempre existe. Se houver frase de origem, ela entra como "Onde você já viu" (não substitui a palavra) |
| Frase (`scenario`, `cloze`, `reorder`, `fullsentence`, PV "Escreva em francês", "Ouça e escreva") | `phrase.f` (zh: `phraseForExercise`) | `phrase.t` | sempre existe |
| V/F | `subject` | tradução da frase/palavra da unidade com o mesmo texto (`findMatchingPhrase` ou `vocab`) | se não achar, campo novo `t` no item da camada (script), entra como `needs_review` |
| Gramática e item de gramática do PV | frase inteira montada: `prompt` com a lacuna trocada por `answer` (`Je ___ étudiante.` → `Je suis étudiante.`), lacuna em negrito | **não existe hoje** | campo novo `t` por exercício na camada pt-BR e na en (59 frases); gerado por script e revisado pela dona; enquanto faltar, o cartão mostra a frase sem tradução e o validador acusa (nunca inventar na hora) |
| "Você entendeu?": completar fala / ouvir e responder | a fala certa (`lines[i].f`) | `lines[i].t` | sempre existe |
| "Você entendeu?": pergunta de compreensão | a fala do diálogo que responde (campo opcional novo `line`) | a resposta em português já é a própria opção; a fala ganha `lines[line].t` | sem `line`: mostra só a resposta certa (sem frase em francês) |
| Opção em francês (cenário, completar fala) | a opção certa | a tradução dela | idem acima |
| Escuta (`listen`, "Ouça e escreva", "ouvir e responder") | o que foi dito | tradução | a frase certa só aparece DEPOIS da resposta (já é assim) |
| Conjugação (prática) | a forma com pronome (`conjSpeakText`) | **não mostrar** tradução da forma (não existe e seria inventada); o infinitivo traduzido continua no alto | a tela da conjugação mantém a grade; só a marcação de letras passa a vir do componente (seção 4, etapa 7) |
| Desafios | cada tipo já tem a frase original; Acentuação ganha a tradução se a base tiver (`challengeText`) | idem | não forçar o painel novo inteiro nos Desafios (pergunta 11) |

Placeholders de perfil (`{nome}`, `{nacionalidade}`) chegam já resolvidos; o áudio cai no Web Speech como hoje.

---

## 3. Diferença letra a letra

### 3.1 O que já existe e o que muda

- `alinharLetras(a, b)` (`shared/core/familias/latina.js:166`): Levenshtein clássico com volta, ignora maiúscula, devolve
  `same | sub | extra | missing`. Não sabe o que é acento, ligadura ou pontuação, e não devolve qual letra faltou.
- Ditado: alinha **palavras** por LCS sobre a forma frouxa (`diffDitado`, `latina.js:413`), junta "faltou + sobrou" em troca
  (`juntarDiff`) e classifica o erro leve (hífen, apóstrofo, ligadura, acento: `motivoErroLeve`, `latina.js:251`). É a parte boa
  para reaproveitar em frases.
- zh: `isToneOnlyMiss` só diz se a diferença é só de tom; não diz onde.

### 3.2 Algoritmo proposto (função pura `diferencaDeLetras`)

1. **Formas candidatas**: se o alvo tem barra ("allemand / allemande"), compara com a forma mais parecida (como `typedAttemptHTML`
   já faz).
2. **Unidades**: quebra cada lado em unidades (código Unicode NFC). Ligadura do alvo vira duas unidades marcadas
   (`œ` → `o`+`e` com `lig:true`); no zh, pinyin numerado é convertido antes (`convertNumberedPinyin`).
3. **Duas camadas** quando o alvo tem mais de uma palavra: primeiro alinha **palavras** (mesmo LCS frouxo do ditado); depois, dentro
   de cada par de palavras trocadas, alinha **letras**. Assim "suis je" x "je suis" vira "palavras fora de ordem" (sublinhado amarelo,
   como o "Ordene" já faz), não seis letras vermelhas.
4. **Alinhamento de letras** sobre a forma de base (sem acento, minúscula), com custo 1 para trocar, sobrar e faltar; o caminho de
   volta guarda `a` (letra digitada) **e `b` (letra do alvo)**.
5. **Classificação** de cada operação:
   - `igual`: mesma base e mesmo acento (maiúscula não conta);
   - `acento`: mesma base, acento diferente ou faltando (zh: mesma sílaba, tom diferente ou faltando, marcado na vogal do tom);
   - `ligadura`: `oe` digitado contra `œ` do alvo;
   - `trocada`: letra diferente;
   - `sobrando`: letra a mais;
   - `faltando`: letra do alvo que não veio (guarda qual era);
   - `pontuacao`: diferença só de pontuação ou de apóstrofo/espaço onde a regra do exercício ignora (neutra, sem marca vermelha).
6. **Corte de "sopa vermelha"**: se a distância passa de metade do tamanho do alvo (ex.: "merci" x "au revoir"), não marca letra por
   letra: mostra a resposta inteira tachada e o cartão da resposta correta abaixo.
7. **Coerência com a nota**: a marcação nunca contradiz o veredito. Se o comparador deu `certo` (ex.: acento na trilha, que não
   desconta), as marcas de `acento` aparecem em âmbar com a linha "Repare no acento" e o estado continua `certo` (pergunta 2).

### 3.3 Exibição (acessível, sem depender só de cor)

| Tipo | Visual | Leitor de tela |
|---|---|---|
| `trocada` | letra digitada em vermelho (`--error-red-text`), fundo vermelho leve, sublinhado ondulado (classe atual `.conj-x`) | o resumo diz "letra trocada: t por s" |
| `sobrando` | vermelho **tachado** | "letra a mais: t" |
| `faltando` | traço vermelho embaixo no lugar (classe atual `.conj-gap`) com a letra que faltou em tamanho pequeno acima, só depois da resposta | "faltou: e" |
| `acento` / tom | letra em âmbar com sublinhado pontilhado | "acento: é" / "tom: ǐ" |
| `ligadura` | as duas letras em âmbar, unidas por um arco | "escreva œ" |
| `pontuacao` | sem marca (cinza claro, opcional) | não lê |
| palavra fora de ordem | sublinhado amarelo grosso (classe atual `.reorder-attempt-w.near`) | "palavra no lugar errado" |

Embaixo, uma legenda curta só com os tipos que aparecem ("vermelho: letra errada · traço: faltou · âmbar: acento"). O contêiner
tem texto visível normal (não `role="img"` como hoje em `conjAnswerViewHTML`) e um resumo em `.sr-only` (classe já existe em
`fr/index.html:227`).

### 3.4 Casos de teste concretos (entram em `tests/feedback/test_diferenca_letras.js`)

Formato: digitado x alvo → marcas esperadas (`[x]` trocada, `{x}` sobrando, `_e` faltou "e", `^é` acento, `(oe)` ligadura).
Hoje (saída real de `alinharLetras`) entre parênteses quando é diferente.

| # | Digitado | Alvo | Esperado | Hoje |
|---|---|---|---|---|
| 1 | `je suis etudiant` | `je suis étudiante` | `je suis ^étudiant_e` | `je suis [e]tudiant_` (acento como erro, sem dizer o que faltou) |
| 2 | `nous avont` | `nous avons` | `nous avon[t→s]` | igual, sem a letra certa |
| 3 | `nous avons` | `nous avons` | nenhuma marca | igual |
| 4 | `Nous avons.` | `nous avons` | nenhuma marca (maiúscula e ponto neutros) | `Nous avons{.}` |
| 5 | `soeur` | `sœur` | `s(oe)ur` | `s{o}[e]ur` |
| 6 | `bonjur` | `bonjour` | `bonj_our` | `bonj_ur` (sem dizer qual) |
| 7 | `j ai` | `j'ai` | nenhuma marca (apóstrofo/espaço neutros na trilha) | `j[ ]ai` |
| 8 | `suis je` | `je suis` | as duas palavras com sublinhado "fora de ordem" | 6 letras vermelhas |
| 9 | `merci` | `au revoir` | resposta inteira tachada, sem letras | 7 marcas |
| 10 | `a bientot` | `à bientôt` | `^à bient^ôt`, estado `certo` na trilha, `quase` nas gramáticas/PV | (painel verde sem marcas) |
| 11 | `allemande` | `allemand / allemande` | nenhuma marca (forma mais parecida) | igual |
| 12 | `allemnd` | `allemand / allemande` | `allem_and` | igual sem a letra |
| 13 | vazio | `bonsoir` | "—" + cartão da resposta | igual |
| 14 | `il a parle` | `il a parlé` | estado `errado` (outro tempo, `conjOtherFormOf`), a letra `^é` marcada e o aviso de tempo | `[e]` vermelho |
| 15 (zh) | `ni hao` | `nǐ hǎo` | `n^ǐ h^ǎo`, título "Faltou o tom" | nada marcado |
| 16 (zh) | `nì hǎo` | `nǐ hǎo` | `n^ǐ hǎo` (tom errado) | nada |
| 17 (zh) | `ni3 hao3` | `nǐ hǎo` | nenhuma marca (numerado vale) | igual |
| 18 (zh) | `ni hau` | `nǐ hǎo` | `n^ǐ h^ǎ[u→o]` | nada |

---

## 4. Plano de migração (um tipo por vez, cada etapa publicável sozinha)

Regra de todas as etapas: o veredito e a pontuação não mudam (XP, `exerciseScore`, combo, `wordMisses`, `checkpointMisses`,
FSRS, Ponto de verificação aprovado com 70%: **impacto nenhum**). Cada etapa leva teste novo e a regressão da área, com capturas
fr/zh × claro/escuro × 390 px (skill `teste-navegador`).

| Etapa | O que | Testes que mudam de propósito | Código que some | Esforço | Risco |
|---|---|---|---|---|---|
| 0 | Funções puras `diferencaDeLetras` e `modeloDoFeedback` + testes Node (seção 3.4); token `--feedback-almost` nos 3 temas; chaves i18n novas. Nada aparece na tela | nenhum | nada | 1 sessão | baixo |
| 1 | Trilha: "Digite o que ouviu" (fr e zh). Painel novo no certo/quase/errado, tradução no acerto, Quase em âmbar, marcas novas; zh ganha marca de tom | `tests/familia-latina/test_playwright.js` (procura `.review-almost` dentro de `.correct-feedback`), `tests/checkpoint-zh/test_playwright.js` (título do painel de erro) | `typedAttemptHTML` | 1 sessão | médio (é o exercício mais visto) |
| 2 | Trilha: múltipla escolha, ouvir e escolher, cenário, V/F (fr/zh). Acerto passa a mostrar frase + 🔊 + tradução; V/F busca a tradução da frase | testes de capturas da trilha | os `null` dos acertos, ramo `scenario`/`trueFalse` de `answerExplanationHTML` | 1 sessão | baixo |
| 3 | Trilha: cloze, ordene, escreva a frase. Só troca de invólucro (o conteúdo já é o padrão); `showAnswerPanel` e `answerExplanationHTML` de fr e zh viram uma camada fina compartilhada | idem | `showAnswerPanel` ×2, `answerExplanationHTML` ×2, `clozeFeedbackDetailHTML` ×2, `phraseFeedbackDetailHTML` (cerca de 200 linhas) | 1 a 2 sessões | médio (efeitos colaterais do combo e das contagens: teste de unidade para cada um) |
| 4 | "Você entendeu?" (fr e zh): painel novo com a fala certa, 🔊 e tradução; "Quase! A resposta certa era:" vira "Não foi dessa vez" | `tests/dialogo-idioma/test_playwright.js` (`.dlg-fb-right`), `tests/i18n` (`DELIBERATE_PT_CHANGES`) | `.dlg-fb` ×2 e o CSS | 1 sessão | baixo |
| 5 | Conteúdo: tradução das 59 frases de gramática (pt e en), por script na camada, validador que acusa frase sem tradução; `line` opcional nas perguntas de compreensão (20 diálogos) | `tests/camada-curso` (camada nova) | nada | 1 sessão + revisão da dona | baixo (texto novo, `needs_review`) |
| 6 | Gramáticas, Ponto de verificação do módulo e Teste de nível: um único passo de "pergunta digitada" com o painel novo (frase inteira, 🔊, tradução, marcas) | `tests/trilha/test_skip_checkpoint_ui.js` (`#checkpoint-expected`), `tests/trilha/test_checkpoint_exam.js` não muda (é a nota) | os 3 blocos de Verificar copiados (cerca de 90 linhas) | 1 a 2 sessões | médio (prova que aprova módulo: conferir que a nota é idêntica com teste de ida e volta) |
| 7 | Conjugação: a grade continua; só a marcação passa a vir de `diferencaDeLetras` (acento em âmbar, letra que faltou) | `tests/conjugacao/test_playwright.js` (mantendo a classe `.conj-x` o teste não quebra) | mapeamento duplicado de `conjAnswerViewHTML` | meia sessão | baixo |
| 8 (opcional) | Ditado: letras marcadas dentro das palavras trocadas; Desafio Acentuação: marcas; Revisão "Digite a resposta": marcas | `tests/ditado`, `tests/banco-revisao` | pouco | 1 sessão | baixo |

Tamanho do código: entram cerca de 250 linhas (duas funções puras, a camada de DOM e CSS) e mais os testes; saem cerca de 350 a
400 linhas duplicadas (fr e zh) e três famílias de CSS de feedback viram uma. Linha nova no `docs/guia-do-desenvolvedor.md` na
etapa 0 (onde fica, como mudar, como testar, "não montar painel de feedback à mão").

Riscos gerais: teclado virtual do celular cobrindo o painel preso embaixo (o campo é desativado ao verificar, o teclado fecha;
conferir em 390 px); Enter duplo; texto em português mudando (lista de mudanças deliberadas em `tests/i18n`); paridade de CSS entre
`fr/index.html` e `zh/index.html` (há teste que compara os dois); outras sessões mexendo no `fr/app.js` em paralelo (etapas pequenas
diminuem o conflito).

Ordem recomendada: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → (8). A 5 pode correr em paralelo com 1 a 4.

---

## 5. Telas da maquete para a dona validar

Hoje a maquete (`docs/i18n/curriculo/maquete-m1/index.html`) usa o painel antigo (função `feedbackPanel`, linha 672) e **ainda não
mostra o padrão novo** nem a marcação de letras; só "Ponto de verificação da unidade: a frase nova" (`m11-pv`, linha 1066) mostra
frase + 🔊 + tradução, e só no acerto. Para a maquete v2 (sem alterar nada agora), as telas que devem receber o componente:

| Tela (id) | O que validar |
|---|---|
| `m11-checagem` "O que significa?" | acerto com a palavra, 🔊 e tradução; erro com "onde você viu" |
| `m11-digitar` "Digite o que ouviu" | os 4 estados e as marcas (testar `a bientot`, `a bientôt`, `à bientot`, `a bientoot`) |
| `m11-entendeu` "Você entendeu?" | fala certa com 🔊 e tradução nas 3 checagens |
| `m11-pv` e `m13-cenario` | frase nova no acerto e no erro |
| `m16-nota-artigo` (V/F rápido) | tradução da frase julgada + `whyNote` |
| `m15-exercicios` e `m17-exercicios` (gramática digitada) | frase inteira com a lacuna em negrito, 🔊, tradução e marcas (`nous avont`, `je suis etudiant`) |
| `som-exercicios` | escuta: a frase só aparece depois |
| `pv-prova` | a prova com o mesmo painel |
| tela nova "Padrão de feedback" | os 4 estados lado a lado, fr e zh (pinyin), claro e escuro, site em pt e em en, e a tabela 3.4 interativa |

---

## 6. Perguntas para a dona

1. **Título do acerto**: manter os elogios sorteados (Na mosca!, Mandou bem!...) e o combo, ou fixar "Bom trabalho!" como no Busuu?
   *Recomendo manter os sorteados* (já existem em pt e en e dão variedade); "Quase!" e "Não foi dessa vez" fixos.
2. **Acento na trilha** ("Digite o que ouviu" e lacuna digitada): hoje vale ponto inteiro (decisão de 2026-09-16), mas a maquete
   mostrou "a bientot" como Quase. *Recomendo, neste projeto, não mudar a nota*: o painel fica verde e mostra o acento em âmbar com
   "Repare no acento". Se a senhora quiser Quase (meio ponto), é uma linha de configuração (`acentoNaDigitacao`) e muda a nota dali
   para frente, sem apagar nada.
3. **Unificar as seis regras de comparação** (seção 1.4)? *Recomendo deixar para depois*, numa etapa própria, com a tabela na mão.
4. **Áudio automático no painel**: *recomendo* tocar sozinho uma vez no erro e no Quase, e no acerto só quando o aluno ainda não
   ouviu a frase. Ou prefere sempre manual?
5. **Painel preso embaixo** (como o Busuu) no celular e no computador, ou só no celular? *Recomendo* preso embaixo no celular e no
   fluxo no computador.
6. **Traduções das 59 frases de gramática** (pt e en): posso escrever por script como `needs_review`, com nível de confiança, para a
   senhora revisar? *Recomendo sim*; sem elas, gramática e PV ficam sem a tradução que a senhora pediu.
7. **"Você entendeu?", pergunta de compreensão**: marcar qual fala responde a pergunta, para mostrar a fala em francês com 🔊 e
   tradução? *Recomendo sim* (campo opcional, 20 diálogos).
8. **"Quase! A resposta certa era:"** no "Você entendeu?" é usado para resposta errada. Trocar por "Não foi dessa vez"? *Recomendo
   sim*: "Quase" passa a significar só meio ponto em todo o site.
9. **Letra que faltou**: mostrar a letra pequena acima do traço depois da resposta, ou só o traço (como hoje)? *Recomendo mostrar*;
   o cartão da resposta correta está logo abaixo de qualquer jeito.
10. **Conjugação**: manter a grade atual e só trocar a marcação (acento em âmbar, letra que faltou)? *Recomendo sim*; painel embaixo
    numa grade de 6 a 24 campos atrapalharia.
11. **Desafios, Ditado e Revisão (flashcards)**: entram agora ou depois? *Recomendo depois* (etapa 8 opcional), só com as marcas
    de letras; os Desafios já têm corpo próprio rico e o Ditado tem nota por palavra.
12. **Exercício de clicar com erro**: além da opção vermelha na tela, repetir "Você escolheu: X" no painel? *Recomendo não*
    (a opção já fica marcada; o painel foca na resposta certa e na tradução).
13. **zh**: marcar o tom errado/faltando em âmbar na vogal, e letra errada em vermelho, com o título "Faltou o tom"/"O tom não é
    esse" que já existe? Tom continua valendo zero (é outra palavra). *Recomendo sim*.
14. **Resposta muito diferente** (mais da metade das letras): tachar a resposta inteira em vez de marcar letra por letra?
    *Recomendo sim*.

---

## Resumo (para o chat)

- O padrão Busuu já existe só em pedaços: cloze/ordene (frase + 🔊 + tradução sempre), cenário no erro, Jogos da Conjugação.
- Acerto quase nunca mostra tradução (múltipla escolha, cenário, V/F, "Digite o que ouviu"); "Quase" abre painel verde com elogio.
- Gramáticas, PV do módulo e Teste de nível não têm painel: só caixa vermelha e "→ resposta" (3 blocos copiados, `fr/app.js`).
- Diferença letra a letra já existe (`alinharLetras`) na trilha fr e na Conjugação, mas pinta acento como erro, marca pontuação,
  faz "sopa vermelha" e não diz qual letra faltou; zh não tem nenhuma.
- Seis regras de comparação diferentes; o componente não muda nenhuma (XP e progresso: impacto nenhum).
- Proposta: `diferencaDeLetras` + `modeloDoFeedback` puros em `shared/core/`, camada fina de DOM, ganchos por idioma.
- Faltam traduções: 59 frases de gramática (pt e en) e a fala que responde cada pergunta de compreensão.
- Plano em 8 etapas pequenas, um tipo por vez; cerca de 350 a 400 linhas duplicadas somem. Tudo grátis.
- 14 perguntas à dona, a principal: acento na trilha continua sem descontar (só aviso) ou vira Quase?
