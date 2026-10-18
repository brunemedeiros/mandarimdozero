# Revisão das unidades de gramática: A1 módulos 2 a 8 e A2 inteiro

Data: 2026-10-18. Documento de **revisão e proposta**. **Nenhum arquivo do site nem dos documentos 00 a 09 foi alterado.**
Base: `08-revisao-por-funcao-comunicativa.md` (mapa v3: 2.2 a 2.8, 3, 4, 6, 7, 10), `02-referencia-livros-fr.md` (2, 3, 4, 5, 9.2, 13.1,
14, 15), `03-delf-cefr-a1-a2.md` (2 e 3), `04-lacunas-e-propostas-fr.md` (0.1, 3, 6.3, 9, 11, 13), `09-preview-m1.md` (A.0.4, B.5, B.7,
B.9) e o código conferido nesta sessão: `fr/content.js` (as 10 gramáticas publicadas, telas e exercícios), `courses/fr-pt-BR/layer.js`,
`fr/app.js` (`renderGrammarExplanationStep` :2040, `renderGrammarExerciseStep` :2142, `buildExerciseSet` :2805),
`shared/checkpoint-exam.js` e `fr/scripts/grammar_input_map.json`.
Siglas: **AE** Alter Ego+ 1; **D1 / D2** Défi 1 / 2; **DA1 / DA2** Défi Actuel 1 / 2; **GP** Grammaire Progressive A1; **GEF** Grammaire
Essentielle; **GPI** Grammaire Progressive Intermédiaire.

> **Rótulos.** Igual ao `08`: o rótulo principal é a **posição** (`M3.2` = 2ª unidade do módulo 3, na ordem em que o aluno vê); `(g)` marca
> gramática; o **id interno** (`A1-g3`) vem entre parênteses e é só a chave fixa do progresso. "Antes" = mapa v3 do `08`; "depois" = esta
> proposta. Quando a posição muda, escrevo "M3.2 → M3.4".
>
> **Fora do escopo:** o M1 (outra sessão, `09`). Mas a opção C do `09` cria `A1-g17` "Artigos e plural" **dentro do M2**; trato isso como
> dependência (seção 1.4) e mostro o M2 nos dois casos.

---

## Resumo em uma tela

- Revisei **14 gramáticas do A1 (M2 a M8)** e **25 do A2**. Veredito: **22 ok** (várias com nova posição ou exemplos trocados), **14
  separadas, enxugadas ou ajustadas**, **2 do A2 viram notas** (`A2-g14`, `A2-g18`) e **1 do A2 é desfeita** (`A2-g23`: parte vira nota, parte
  entra na `A2-g21`). Sobem 3 gramáticas novas no A1 (pronominais, imperativo, futuro próximo), todas pedaços de unidades que juntavam 3 ou 4 assuntos.
- Concordo com os princípios da dona, com **dois ajustes com evidência**: (1) "pequeno e ligado ao vocabulário vira nota" **só quando o *défi*
  não cobra aquilo com correção**, porque nota não tem exercício, não entra no Ponto de verificação e não ancora Desafios (código, 1.1);
  (2) "um conceito por unidade" admite **um par que os livros sempre ensinam junto** (pergunta de sim ou não + *ne... pas*, GP cap. 5;
  modais + *il faut*, GP cap. 40 e DA1 U5; dois verbos irregulares, DA1 U4).
- Movimentos maiores no A1: *faire / prendre* sai da cidade e vai para **Comer e beber** (M4.6), onde *je prends un café* é usado; o **futuro
  próximo** ganha unidade própria no **M7** (planos de férias e o cartão-postal); o **imperativo** ganha unidade própria no M6; *savoir* sai do A1.
- Achado de código: as gramáticas publicadas que mudam de módulo trazem **exercícios com palavras que, na posição nova, ainda não foram
  ensinadas** (`A1-g8`: os 6 são de lazer; `A1-g5`: 4 de 6 são de clima, transporte e esporte; `A1-g3`, `A1-g7`). Reescrever antes de mover.
- Achado de regra: unidade de gramática **não tem nota** (`.claude/rules/conteudo-trilha.md`), então a nota regional *septante / nonante* que o
  `08` põe em M5.2 (g) tem de ir para a M5.1.
- Efeito: A1 M2 a M8 passa de 14 para 18 gramáticas (com a `A1-g17` do `09`), com ~+45 min, e o pico sai do M6; A2 cai de 25 para 22,
  com ~−1h. Nenhum id de cartão muda (gramática não gera cartão). 26 perguntas para a dona na seção 9.

---

## 1. Princípios, mecanismo real e critério

### 1.1 O que cada formato faz hoje (conferido no código)

| | Nota de explicação (`concepts` numa unidade de vocabulário) | Unidade de gramática (`type: "grammar"`) |
|---|---|---|
| Telas | 1 ou mais blocos; todas as do fr têm 1 hoje | **4 a 5** nas 10 publicadas (`A1-g10` tem 5) |
| Exercícios | **nenhum** | **6 a 8**, só "digite a forma" (`A1-g6` e `A1-g9` têm 8) |
| Ponto de verificação do módulo | não entra | entra: **2 itens** sorteados do conjunto de todas as gramáticas do módulo (`CHECKPOINT_EXAM_QUOTAS.grammar = 2`) |
| Desafios "Complete a frase" | não (planejados por gramática, `04` 8) | sim |
| Prática indireta | as frases da lição viram ordenar/traduzir/lacuna, mas os **blocos-isca são sorteados** (`buildReorderDistractors`), nunca o par que confunde (*ce* x *cette*) | |
| Pode ter nota dentro? | | **não** (regra `conteudo-trilha`: gramática "sem vocab, sem notas") |
| Tempo (estimativa do `08`, baixa) | 1 a 2 min | ~18 min (4 a 5 telas); uma enxuta de 3 telas e 6 exercícios, ~12 min |

Consequências: (a) **dividir** uma gramática não aumenta a prova do módulo (continua com 2 itens), só aumenta o conjunto de onde eles saem;
(b) **transformar em nota** tira toda a prática com correção daquele ponto; (c) gramática não gera cartão, então criar, dividir ou mover
gramática **não toca no FSRS**.

### 1.2 Os princípios da dona e a minha posição

| Princípio | Posição | Evidência |
|---|---|---|
| Uma gramática = um conceito (ou muito ligados) | **concordo**, com a leitura "uma decisão nova que o aluno toma ao produzir". Pares que **todos ou quase todos** os livros ensinam juntos contam como "muito ligados" | GP 5 (pergunta simples + *ne... pas*, um capítulo de 2 páginas); GP 40 e DA1 U5 (*vouloir, pouvoir, devoir* + *il faut*); DA1 U4 (*faire et prendre*) |
| Pequeno e ligado ao vocabulário de uma lição vira nota | **concordo, com uma condição**: só se o *défi* ou a prova do módulo não cobram aquilo com correção. Se cobram, o aluno precisa errar e ser corrigido antes (1.1) | `09` B.7 (a opção "só notas" deixava o gênero, alerta principal do *défi* do M1, sem nenhum exercício) |
| Informal cedo, sistematizado depois (espiral) | **concordo**; apliquei a 12 tópicos (seção 8) | AE espalha lugar do adjetivo em 3 lições (D6 L2, D6 L3, D8 L2) e *on* em 3 (D4 a D6); DA1 tem "concordância dos adjetivos (1)" na U3 e "(2)" na U6 |
| O aluno nunca volta a uma lição anterior | **concordo**; por isso cada passo da espiral **repete em 1 linha** o que a nota anterior disse ("Você já viu na M2.1: ...") | |
| Pré-requisito antes do uso | **concordo**, mantendo a regra da casa: uso como fórmula antes da regra é aceito, desde que a regra chegue **antes do *défi* que a cobra** (`08` 0, item 3) | `check_grammar_input.js` |
| Carga razoável | **concordo**; teto prático = **5 telas e 8 exercícios** (o tamanho de `A1-g6` e `A1-g10`, as maiores publicadas). Nada abaixo passa disso | |

### 1.3 Critério que usei (para a dona conferir)

1. O ponto pede uma **escolha** do aluno ao falar ou escrever (*ce* ou *cette*, *au* ou *en*, *me* ou *se*)? Se é só reconhecer, vai para nota.
2. O *défi* do módulo ou a prova do módulo **cobra** com correção? Se sim, precisa de exercício: fica em gramática (própria ou como tela de uma
   muito ligada).
3. É pequeno (1 ou 2 blocos) e **nasce de palavras ou frases da lição**? Se sim e o item 2 é "não", vira nota naquela lição.
4. Junta duas escolhas diferentes? Separa, a não ser que os livros as ensinem sempre juntas (1.2).
5. Passa de 5 telas ou 8 exercícios? Separa ou manda uma parte para nota ou para mais tarde (espiral).

### 1.4 Dependência do M1 (`09`, opção C)

Se a dona aprovar a opção C do `09`, o M2 ganha `A1-g17` "Artigos e plural" logo depois da família e a `A1-g12` recebe *pas de*. Mantive as duas
coisas. Sem a opção C (opção A: artigos no M1), o M2 fica com uma gramática a menos; mostro os dois casos em 2.1 e 5.

---

## 2. A1 módulo a módulo (M2 a M8)

Formato de cada unidade: **Antes** (posição e conteúdo no `08`) · **Hoje no site** (se publicada) · **Veredito** · **Por quê** · **Desenho final**.

### 2.1 A1 M2 · Família e pessoas próximas (`A1-m7`)

#### M2.2 (g) → M2.4 (g) · Possessivos (`A1-g2`, publicada)
- **Antes:** possessivos + tela nova *c'est* + nome x *il / elle est* + profissão ou adjetivo.
- **Hoje no site:** 4 telas ("Meu, minha...", "Nosso, vosso, deles...", "Uma exceção sonora" *mon amie*, quadro), 6 exercícios.
- **Veredito:** **separar**. Possessivos ficam como estão; *c'est / il est* vira **nota na M2.1**.
- **Por quê:** são duas escolhas diferentes (que possessivo; com ou sem artigo depois de *être*). Os possessivos já são pesados para quem fala
  português (*sa mère* = "a mãe dele"; *mon amie*). A frase que motiva *c'est / il est* está na própria M2.1 (*C'est mon père, il est
  ingénieur*, `08`), e a nota da M1.6 já promete "com *c'est* é diferente: vem no módulo 2" (`09` A.6). O *défi* do M2 não tem peça de
  *c'est / il est* (as peças são possessivo, profissão sem artigo, cor, origem, negação), então passa no critério 1.3. Fontes divididas:
  DA1 U3 junta os dois; AE (D1 L1 x D5 L3), D1 (U3 D1 x U3 D2) e GP (14 x 26) separam.
- **Desenho final:** igual ao publicado (4 telas, 6 exercícios). Posição M2.4 (depois de "Descrever pessoas"), se a `A1-g17` ocupar a M2.2;
  sem a opção C, fica na M2.2.
- **Nota nova na M2.1** (`kind: explicação`, gatilho: frase *C'est mon père, il est ingénieur*): "*C'est* + alguém com *mon, ma, un, une* ou
  nome (*c'est mon père, c'est Léa*); *il / elle est* + profissão ou como a pessoa é (*il est ingénieur, elle est grande*)". Confiança **alta**.
  A parte "*c'est* + adjetivo para coisas" (*c'est cher, c'est délicieux*) volta como nota na M4.1 e na M7.1 (espiral, seção 8).

#### M2.5 (g) → M2.6 (g) · Preposições com cidades e países (`A1-g4`, publicada)
- **Antes:** *à* + cidade, *en / au / aux* + país, + tela nova de procedência *de / d' / du / des* + país.
- **Hoje no site:** 4 telas (*à* + cidade; *en / au*; *aux*; quadro), 6 exercícios.
- **Veredito:** **ok** como no `08`.
- **Por quê:** é uma escolha só: o **gênero do país** decide a preposição, na ida (*au Brésil*) e na vinda (*du Brésil*). GP 22 e DA1 U2
  ("preposições com países e cidades" junto com *aller e venir*) tratam como um ponto. O *défi* cobra "1 origem (*il vient du...*)", então
  precisa de exercício.
- **Desenho final:** 5 telas (*à* + cidade; *en* + país feminino, *au* + masculino; *aux*; **de onde: *de / d' / du / des***; quadro) e
  8 exercícios (+ *Je viens ___ Brésil.* → *du*; *Elle vient ___ France.* → *de*). O *du* aqui é fórmula; a regra da contração chega na M6.2.

#### M2.6 (g) → M2.7 (g) · Perguntar e negar (`A1-g12`, nova)
- **Antes:** *ne... pas*; 3 jeitos de perguntar (entonação, *est-ce que*, inversão para reconhecer); palavras interrogativas (*comment, où,
  quand, combien, pourquoi, qui, qu'est-ce que*); *quel / quelle / quels / quelles*; tela "o jeito da rua"; tela de entonação; e, pela opção C,
  *pas de*. Contando: **6 a 7 telas** (`09` B.9 marcou "suspeita alta").
- **Veredito:** **enxugar** para o escopo do GP cap. 5 (+ *pas de*, GP 20). As palavras interrogativas e *quel* saem para **notas onde
  aparecem**, e o sistema completo fica para o A2 M9.4 (g).
- **Por quê:** a pergunta de sim ou não e a resposta negativa são o par da troca de informações (DELF A1 PO2: "Tu as des frères ? Non, je n'ai
  pas de frère."), e o GP ensina as duas num capítulo só (cap. 5). Palavras interrogativas: o GP as deixa para o fim do A1 (51 e 52), o AE
  para D5 L1; cada uma nasce presa a uma palavra da trilha (*où* em M2.5, *quelle heure* em M3.1, *quand* em M3.3, *combien* em M5.1,
  *pourquoi / parce que* em M8.4), e o *défi* do M2 aceita a pergunta "do jeito da rua" (*Vous habitez où ?*). *Pas de* fica aqui porque a
  família pede (*Je n'ai pas de frère*) e porque D1 U2 D2 e GP 20 juntam negação e artigo indefinido.
- **Divergência que registro:** pelo princípio estrito seriam duas unidades (negar; perguntar). Isso deixaria o M2 com 5 gramáticas para 3
  de vocabulário (8 unidades). Pergunta 3.
- **Desenho final:** 4 telas + quadro, 8 exercícios (~18 min).
  ```
  Passo 1 de 5 · Pergunta de sim ou não
    Tu as des frères ? (só a voz sobe) · Est-ce que tu as des frères ? (neutro, também por escrito)
    Reconhecer: As-tu des frères ? (mais formal; você vai usar no A2)
  Passo 2 de 5 · Responder que não: ne... pas
    Je ne suis pas marié. · Elle n'a pas vingt ans. (n' antes de vogal)
  Passo 3 de 5 · pas de: un, une, des viram de
    J'ai une sœur. → Je n'ai pas de sœur. · Il n'a pas d'enfants. · Mas: Ce n'est pas mon frère. (mon fica)
  Passo 4 de 5 · Na rua
    J'ai pas de frère. (o ne some na fala) · Tu habites où ? (a palavra de pergunta vai para o fim)
  Passo 5 de 5 · Quadro
  ```
  Exercícios: *___ tu as des enfants ? (pergunta neutra)* → *Est-ce que* · *Je ___ suis pas marié.* → *ne* · *Il ___ a pas vingt ans.* →
  *n'* · *Nous ne sommes ___ français.* → *pas* · *Je n'ai pas ___ sœur.* → *de* · *Elle n'a pas ___ enfants.* → *d'* · *Ce n'est pas
  ___ père. (meu)* → *mon* · *Est-ce qu'il ___ médecin ? (être)* → *est*. Todas as palavras vêm do M1 e da M2.1.

#### Mapa final do M2

| Pos. | Unidade (id) | Muda em relação ao `08` |
|---|---|---|
| M2.1 | Apresentar a família (`A1-4`) | + nota *c'est / il est* |
| M2.2 (g) | Artigos e plural (`A1-g17`, do `09` opção C) | (não é desta revisão) |
| M2.3 | Descrever pessoas: cores e aparência (`A1-16`) | a nota de lugar do adjetivo que já existe fica; + 1 linha "o mesmo *-e* da M1.7: *grand, grande*" |
| M2.4 (g) | Possessivos (`A1-g2`) | sem *c'est / il est*; posição M2.2 → M2.4 |
| M2.5 | Dizer de onde é e onde mora (`A1-9`) | nota "a pergunta *où* vai para o fim" (encurta a nota *in situ* que já existe, decisão 13 do `04`) |
| M2.6 (g) | Preposições com cidades e países (`A1-g4`) | igual ao `08` |
| M2.7 (g) | Perguntar e negar (`A1-g12`) | enxuta (GP 5 + *pas de*) |

Sem a opção C: 6 unidades (M2.1, M2.2 (g) possessivos, M2.3, M2.4, M2.5 (g) preposições, M2.6 (g) perguntar e negar).

### 2.2 A1 M3 · Rotina e calendário (`A1-m2`)

#### M3.2 (g) · Verbos em *-er*, pronominais e *on* (`A1-g3`, publicada) → separar
- **Antes:** conjugação em *-er*, tela de letras mudas (v2), pronominais, tela de *on*. Seriam **6 telas**.
- **Hoje no site:** 4 telas ("Verbos do 1º grupo", "Uma pequena exceção: *manger*", "Verbos pronominais", quadro), 6 exercícios (2 deles pronominais).
- **Veredito:** **separar em 2**: M3.2 (g) **Verbos em *-er*** (`A1-g3`) e **M3.4 (g) Verbos pronominais** (id novo `A1-g18`). *On* vira **linha
  da tabela** (*il / elle / on parle*) e continua na nota que já existe no `A1-7` (M3.3), sem tela própria.
- **Por quê:** GP 6 a 9 dá 4 capítulos; DA1 põe *-er* na U2 e pronominais na U4; AE em D1 L3 e D4 L1. São escolhas diferentes (a terminação
  x o pronome *me / te / se*). O *défi* cobra o pronominal com correção ("*je me lève*, não *je lève*", `07`), então ele precisa dos próprios
  exercícios. Letras mudas (*parle, parles, parlent* soam igual) é o mesmo conceito da conjugação: fica na `A1-g3`.
- **Desenho final:**
  - **M3.2 (g) Verbos em *-er*** (`A1-g3`): 4 telas (a conjugação, com *on* na tabela; o que não se pronuncia; *manger → nous mangeons*;
    quadro), 6 exercícios. **Reescrever** *Vous ___ le fromage ?*: *fromage* passa a ser do M4 (o café saiu da rotina). Troca:
    *Vous ___ le soir ? (travailler)* → *travaillez*. Os 2 exercícios pronominais vão para a `A1-g18`.
  - **M3.4 (g) Verbos pronominais** (`A1-g18`, nova, ~12 min): 4 telas.
    ```
    Passo 1 · Je me lève: um pronome a mais (me, te, se, nous, vous, se)
      Je me réveille à sept heures. · Tu te lèves tôt ?
    Passo 2 · m', t', s' antes de vogal: Je m'appelle Léa. · Elle s'appelle Ana.
    Passo 3 · Com ne... pas, o ne vem antes do pronome: Je ne me lève pas tôt le samedi.
    Passo 4 · Quadro
    ```
    Exercícios (6): *Je ___ réveille à sept heures.* → *me* · *Tu ___ lèves à quelle heure ?* → *te* · *Nous ___ couchons à minuit.* →
    *nous* · *Elle ___ appelle Léa.* → *s'* · *Ils ___ lèvent tard le samedi.* → *se* · *Je ne ___ lève pas tôt.* → *me*.
    Posição depois de "Dizer o dia e combinar" (M3.3): o diálogo *On se voit quel jour ?* dá mais entrada, e evita duas gramáticas seguidas.

#### M3.5 (g) → M3.6 (g) · Com que frequência (`A1-g8`, publicada)
- **Antes:** veio do módulo de lazer; *toujours, souvent, parfois, rarement, jamais*, lugar do advérbio, *ne... jamais*.
- **Hoje no site:** 4 telas, 6 exercícios. **Todos os 6 exercícios e os 6 exemplos usam palavras de lazer** (*cinéma, guitare, sortir, chanter,
  lire, danser*), que no v3 só chegam no M8.
- **Veredito:** **ok** no conteúdo (um conceito: dizer com que frequência), **reescrever todos os exemplos e exercícios** com palavras da rotina.
- **Por quê:** DA1 U4, D1 U5 D2 e AE D4 L3 põem a frequência na rotina (`08` achado 8). *Ne... jamais* aproveita o *ne... pas* da M2.7
  (espiral; a negação completa fica no A2). *Le samedi* = "todo sábado" (AE D4 L1) é pequeno e preso aos dias: vira **nota na M3.3**.
- **Desenho final:** 4 telas, 6 exercícios. Exemplos novos: *Je me lève toujours à sept heures.* · *Le samedi, je me lève souvent tard.* ·
  *Je ne travaille jamais le dimanche.* Exercícios: *Je ___ travaille le soir. (às vezes)* → *parfois* · *Il se couche ___ tard. (sempre)* →
  *toujours* · *Nous mangeons ___ à midi. (frequentemente)* → *souvent* · *Elle ne se lève ___ tôt. (nunca)* → *jamais* · *Tu dors ___
  l'après-midi ? (raramente)* → *rarement* · *Je ne travaille ___ le dimanche.* → *jamais*.

#### Mapa final do M3

| Pos. | Unidade (id) | Muda |
|---|---|---|
| M3.1 | Dizer as horas e a rotina (`A1-6`) | + nota *quel / quelle* (gatilho *Quelle heure est-il ?*: *quelle* porque *heure* é feminino) |
| M3.2 (g) | Verbos em *-er* (`A1-g3`) | sem pronominais; *on* na tabela; 1 exercício reescrito |
| M3.3 | Dizer o dia e combinar (`A1-7`) | + nota *le samedi* = todo sábado; nota *on* = *nous* já existe |
| M3.4 (g) | **Verbos pronominais** (`A1-g18`, nova) | separada da `A1-g3` |
| M3.5 | Dizer a data e o aniversário (`A1-24`) | |
| M3.6 (g) | Com que frequência (`A1-g8`) | exemplos e exercícios reescritos |

### 2.3 A1 M4 · Comer e beber (`A1-m3`)

#### M4.5 (g) → M4.4 (g) · Partitivos e quantidade (`A1-g14`, nova)
- **Antes:** *du / de la / de l' / des*, *pas de*, *beaucoup de / un kilo de*, *aimer le* x *manger du*; depois das 4 unidades de vocabulário.
- **Veredito:** **ok**, com duas mudanças: a quantidade (*un kilo de, beaucoup de*) deixa de ser tela e fica como **recapitulação** dentro da
  tela "*de* sozinho"; a unidade sobe para **antes do restaurante**.
- **Por quê:** é uma escolha só ("que palavra vem antes da comida: *le*, *du* ou *de*"), e os dois métodos juntam: AE D7 L1 (partitivos x
  definidos x indefinidos + *pas de*), D1 U8 D1 (partitivos + quantidade + pesos). A quantidade já tem nota no `A1-12` (M4.3), presa às palavras
  *un kilo (de), beaucoup de*. Quatro unidades de vocabulário seguidas é o maior bloco sem gramática do A1; o restaurante (M4.5) ganha uso
  imediato (*du vin, de l'eau*).
- **Desenho final:** 4 telas (*du, de la, de l', des*; *J'aime le fromage* x *Je mange du fromage*; *de* sozinho depois de não e de quantidade,
  com "você já viu: *pas de* na M2.7, *un kilo de* na M4.3"; quadro), 8 exercícios.

#### M6.4 (g) → M4.6 (g) · *faire* e *prendre* (`A1-g5`, publicada)
- **Antes:** M6.4, depois de "Pegar transporte".
- **Hoje no site:** 4 telas, 6 exercícios; **4 dos 6 exercícios** usam *chaud* (clima, M7), *le métro* e *le train* (M6), *du sport* (M8).
- **Veredito:** **mover para M4.6**, mantendo os dois verbos juntos; reescrever exemplos e exercícios.
- **Por quê:** *prendre* é o verbo do café e do restaurante (*Je prends un café. Vous prenez quoi ?*) e o *défi* do M4 tem um pedido em turnos
  no café; *faire* aparece em *Ça fait cinq euros* (diálogo do `A1-5`) e *faire les courses*. DA1 U4 ensina "*faire* et *prendre*" juntos, na
  rotina, bem antes da cidade. Tira uma gramática do M6, que o `08` chama de pico. *Prendre le métro* (M6.3) e *il fait beau* (M7) viram reuso.
- **Desenho final:** 4 telas, 6 exercícios. Exemplos: *Tu prends un café ?* · *Je prends du pain.* · *Ça fait cinq euros.* · *Le samedi, je fais
  les courses.* Exercícios: *Je ___ un café.* → *prends* · *Vous ___ quoi ?* → *prenez* · *Nous ___ les courses le samedi.* → *faisons* ·
  *Ça ___ dix euros.* → *fait* · *Elles ___ du riz.* → *prennent* · *Tu ___ quoi ce soir ?* → *fais*.
  Frase nova no `A1-11` (M4.2) para dar entrada: *Le samedi, je fais les courses.* (chave nova).

#### Mapa final do M4

| Pos. | Unidade (id) | Muda |
|---|---|---|
| M4.1 | Gostos e pedidos no café (`A1-5`) | + nota *c'est bon, c'est délicieux* (*c'est* + adjetivo, espiral da M2.1) |
| M4.2 | Fazer a lista do mercado (`A1-11`) | + frase *Le samedi, je fais les courses.* |
| M4.3 | Pedir quantidades na feira (`A1-12`) | nota de quantidade já existe |
| M4.4 (g) | Partitivos e quantidade (`A1-g14`) | sobe uma posição |
| M4.5 | Pedir no restaurante (`A1-25`) | |
| M4.6 (g) | ***faire* e *prendre*** (`A1-g5`) | **veio do M6** |

### 2.4 A1 M5 · Compras (`A1-m8`)

#### M5.2 (g) · Números de 70 a 99 (`A1-g10`, publicada)
- **Antes:** + exemplos de telefone em pares; recebe a nota regional *septante / nonante*.
- **Hoje no site:** 5 telas, 6 exercícios.
- **Veredito:** **ok**; mas a **nota regional não pode ficar aqui** (gramática não tem nota) e o telefone em pares cabe melhor como nota.
- **Por quê:** um conceito (como se montam 70 a 99). Uma tela a mais passaria de 5. *Zéro* e *soixante-dix* são cartões da M5.1, gatilhos
  naturais das duas notas.
- **Desenho final:** 5 telas como hoje, 7 exercícios (+ *06 12 34 56 78: "56" em francês* → *cinquante-six*). Na **M5.1**: nota regional
  *septante / nonante* (gatilho *soixante-dix*; confiança alta) e nota "telefone em pares" (gatilho *zéro*).

#### M5.4 (g) · Adjetivos e demonstrativos (`A1-g15`, nova) → enxugar
- **Antes:** concordância e plural do adjetivo (generaliza a M1.7), lugar do adjetivo, *ce / cet / cette / ces*. ~5 telas (`09` B.9: suspeita alta).
- **Veredito:** **separar**: a unidade fica **só com masculino, feminino e plural do adjetivo**; demonstrativos viram **nota na M5.3**; lugar do
  adjetivo fica na **nota que já existe no `A1-16`** (agora M2.3) e volta na M7.1.
- **Por quê:** GP separa (2 e 3 adjetivo; 15 demonstrativo; 16 lugar); AE (D2 L3 x D3 L2) e D1 (U3 e U6 x U7 D2) também. Demonstrativo é
  pequeno e nasce nas frases da própria M5.3 (*Je peux essayer ce pantalon ?*, *Cette veste coûte trente euros.*, *Ces chaussures...*); ele copia
  o artigo que o aluno já sabe (*le → ce, la → cette, l' → cet, les → ces*). O lugar do adjetivo o AE espalha em 3 lições.
- **Risco que registro:** o *défi* do M5 tem a peça "1 demonstrativo". Como nota, *ce* x *cette* não tem exercício antes. Mitigação: a peça
  vira "presença" e o alerta do *défi* corrige (*ce robe* → *cette robe*). Se a dona preferir prática, a alternativa é uma gramática pequena
  `A1-g21` (3 telas, 6 exercícios) depois da M5.3 (pergunta 10).
- **Desenho final** (`A1-g15`, ~15 min): 4 telas (o feminino ganha *-e* e às vezes muda mais: *blanc / blanche, gentil / gentille*; o feminino
  que se ouve x o que só se escreve, ligado ao som A1-S9; plural com *-s* mudo; quadro), 8 exercícios (*une robe ___ (vert)* → *verte*;
  *des chaussures ___ (noir)* → *noires*; *elle est ___ (gentil)* → *gentille*...).
- **Nota nova na M5.3** (`kind: explicação`, gatilho: *ce pantalon*): "*ce, cette, ces* = o artigo trocado por 'este': *le pantalon → ce
  pantalon; la robe → cette robe; les chaussures → ces chaussures*; antes de vogal, masculino vira *cet*: *cet hôtel*". Confiança **alta**.

#### Mapa final do M5

| Pos. | Unidade (id) | Muda |
|---|---|---|
| M5.1 | Perguntar o preço e pagar (`A1-28`) | + notas regional e telefone (vindas da gramática); + nota *combien* (palavra de pergunta) |
| M5.2 (g) | Números de 70 a 99 (`A1-g10`) | + 1 exercício de telefone |
| M5.3 | Comprar roupas (`A1-10`) | + nota demonstrativos |
| M5.4 (g) | Adjetivos: masculino, feminino e plural (`A1-g15`) | sem demonstrativos e sem lugar |

### 2.5 A1 M6 · Na cidade (`A1-m4`)

#### M6.2 (g) · *aller*, futuro próximo e contraídos (`A1-g13`, nova) → separar
- **Antes:** tabela de *aller*; *à la / au / à l' / aux* + lugar; *je vais* + infinitivo; *je ne vais pas* + infinitivo; *venir de la / du*.
- **Veredito:** **separar**: M6.2 (g) ***aller* e os contraídos: aonde você vai** (`A1-g13`); o **futuro próximo** vira unidade própria
  (`A1-g20`) no **M7** (2.6). *De + le = du* sai (já veio como fórmula em M2.6 e volta como nota na M7.2 com *à côté du lit*).
- **Por quê:** são três decisões (a forma de *aller*; a contração; um tempo verbal). Nenhuma fonte junta as três: GP 13, 42, 43; AE D2 L1
  (contraídos), D2 L2 (*aller*), D4 L2 (futuro próximo); DA1 U6 (contraídos) e U8 (futuro próximo). *Aller* e a contração vão juntos porque a
  função "dizer aonde vou" é *aller à* + lugar, e o *défi* do M6 corrige "*à le* → *au*" (`07`). O futuro próximo é o único futuro do A1 (P0
  confirmado da dona): merece exercícios próprios, não 1 tela.
- **Desenho final** (`A1-g13`, ~15 min): 4 telas (*aller* no presente; *à + le = au, à + les = aux, à la, à l'*; *Je vais à la gare, au musée,
  à l'hôpital*; quadro), 8 exercícios (*Je ___ à la gare.* → *vais*; *Nous allons ___ musée.* → *au*; *Ils ___ à l'hôpital.* → *vont*...).

#### Imperativo → **M6.4 (g) Dar instruções: o imperativo** (id novo `A1-g19`)
- **Antes:** telas do imperativo dentro da `A1-g6` (modais), na M6.6.
- **Veredito:** **separar** em unidade própria, logo depois de "Pegar transporte".
- **Por quê:** imperativo é outro modo verbal, com outra função (instruções: *Tournez à gauche, prenez le métro*), e o *défi* cobra (explicar o
  caminho + 1 conselho). AE ensina no D4 L2 e D5 L2, separado de *devoir / il faut* (D4 L1); D1 em U7 D2. Pré-requisitos já vistos: *-er* (M3.2),
  *prendre* (M4.6), *aller* (M6.2). O imperativo pronominal (*Reposez-vous !*) fica como **nota na M6.5** (A2 M5.4 retoma com pronomes).
- **Desenho final** (~13 min): 4 telas, 8 exercícios.
  ```
  Passo 1 · Para dar uma instrução, tire o sujeito: Vous tournez → Tournez à gauche. · Tu prends → Prends le bus.
  Passo 2 · Com tu, o -er perde o -s: Tu tournes → Tourne ! · E aller: Tu vas → Va !
  Passo 3 · Nous = "vamos": Allons au musée ! · Para proibir: Ne prenez pas le bus.
  Passo 4 · Quadro
  ```
  Exercícios: *___ à gauche ! (tourner, vous)* → *Tournez* · *___ le métro ! (prendre, tu)* → *Prends* · *___ tout droit ! (aller, vous)* →
  *Allez* · *___ à droite ! (tourner, tu)* → *Tourne* · *___ au musée ! (aller, nous)* → *Allons* · *Ne ___ pas le bus ! (prendre, vous)* →
  *prenez* · *___ à la pharmacie ! (aller, tu)* → *Va* · *Ne ___ pas maintenant ! (manger, tu)* → *mange*.

#### M6.6 (g) · Modais, *il faut* e imperativo (`A1-g6`, publicada) → enxugar
- **Hoje no site:** 4 telas ("*Vouloir* e *pouvoir*", "*Devoir* e *savoir*", "*Il faut*", quadro), 8 exercícios (2 de *savoir*: *Elle ___ parler
  trois langues*, *Je ___ nager*).
- **Veredito:** **enxugar**: fica ***vouloir, pouvoir, devoir* + infinitivo e *il faut***; sai o imperativo (unidade própria) e sai ***savoir***
  (vai inteiro para A2 M6.4 (g) *savoir* x *connaître*).
- **Por quê:** é um padrão só (verbo + infinitivo; *il faut* é o *devoir* impessoal): GP 40 é um capítulo, DA1 U5 junta *pouvoir, devoir,
  falloir, vouloir*. *Savoir* é outra escolha (saber x conhecer), já prometida ao A2 (`04` anomalia 22, `A2-g17`); *nager* é palavra do A2.
- **Desenho final:** 4 telas (*vouloir* e *pouvoir*, com *je voudrais* de cortesia retomando a nota do `A1-10`; *devoir*; *il faut* = "é
  preciso"; quadro), 8 exercícios (troca os 2 de *savoir* por *Vous ___ prendre le bus 12. (devoir)* → *devez* e *Il ___ boire de l'eau.* → *faut*).

#### Mapa final do M6

| Pos. | Unidade (id) | Muda |
|---|---|---|
| M6.1 | Perguntar e indicar o caminho (`A1-8`) | (a nota *au / à la* entra na gramática logo depois) |
| M6.2 (g) | ***aller* e os contraídos** (`A1-g13`) | sem futuro próximo e sem *du / des* |
| M6.3 | Pegar transporte (`A1-14`) | |
| M6.4 (g) | **Dar instruções: o imperativo** (`A1-g19`, nova) | separada da `A1-g6` |
| M6.5 | Dizer onde dói e pedir ajuda (`A1-15`) | + nota *Reposez-vous !* |
| M6.6 (g) | Modais e *il faut* (`A1-g6`) | sem imperativo e sem *savoir* |

Sai do M6: *faire / prendre* (→ M4.6) e o futuro próximo (→ M7.5).

### 2.6 A1 M7 · Casa, hotel e férias (`A1-m5`)

#### M7.3 (g) · Comparar (`A1-g7`, publicada)
- **Hoje no site:** 4 telas, 6 exercícios. Exemplos e exercícios trazem *chante mieux* (*chanter*: M8), *ce livre* (M8), *ce gâteau* (não
  ensinado) e *le mien* (pronome possessivo, A2 a B1 pelo `02` 9.2).
- **Veredito:** **ok** (um conceito: *plus / moins / aussi... que* + *meilleur*); trocar 3 exemplos e 2 exercícios. Superlativo continua no A2 (decisão 9).
- **Desenho final:** 4 telas, 6 exercícios. Trocas: *Ce livre est ___ que l'autre* → *Cet hôtel est ___ que l'autre (bon)* → *meilleur*;
  *Ton chat est ___ grand que le mien* → *La cuisine est ___ grande que le salon (−)* → *moins*; tirar *mieux* (vai com o superlativo no A2).

#### Futuro próximo → **M7.5 (g) O que vou fazer: o futuro próximo** (id novo `A1-g20`)
- **Antes:** uma tela da `A1-g13` (M6.2).
- **Veredito:** **unidade própria no M7**, depois de "Férias e hotel".
- **Por quê:** a função é "falar de planos": férias (*Cet été, je vais visiter Nice*), hotel (*Je vais rester deux nuits*), e o cartão-postal do
  *défi* do M7 ("o que faço **ou vou fazer**"). AE D4 L2 liga o futuro próximo a "falar de planos"; D1 o põe em U7 e DA1 em U8 (penúltima e
  última unidades); GP 43 na U6 de 8. A entrada é farta: já há frases com *je vais* + infinitivo em M3.1, M4.1, M6.3 e M6.5 (`01` seção 3).
  *Aller* chega antes (M6.2). O M7 é o módulo com menos gramática (1); o M6 perde uma.
- **Alternativa:** no M8, antes do passé composé (planos do fim de semana; GP U6 junta os tempos). Deixaria o M8 com 3 gramáticas de tempo
  verbal seguidas (pergunta 13).
- **Desenho final** (~12 min): 4 telas (*aller* + infinitivo; com *ne... pas*: *Je ne vais pas travailler demain*; quando: *demain, ce soir,
  la semaine prochaine, cet été*; quadro), 6 exercícios (*Demain, je ___ visiter le musée.* → *vais*; *Nous ___ prendre le train.* →
  *allons*; *Ils ___ dormir à l'hôtel.* → *vont*; *Je ne vais ___ travailler demain.* → *pas*...).

#### Mapa final do M7

| Pos. | Unidade (id) | Muda |
|---|---|---|
| M7.1 | Descrever a casa (`A1-17`) | + nota *C'est une grande maison* x *La maison est grande* (fecha a espiral de *c'est*) e lugar do adjetivo (2) |
| M7.2 | Dizer onde as coisas estão (`A1-18`) | + nota *à côté du lit* (*de + le = du*) |
| M7.3 (g) | Comparar (`A1-g7`) | exemplos trocados |
| M7.4 | Férias e hotel (`A1-26`) | frases com *je vais* + infinitivo (entrada) |
| M7.5 (g) | **O que vou fazer: o futuro próximo** (`A1-g20`, nova) | **veio do M6** |
| M7.6 | Dar os dados pessoais: soletrar e preencher a ficha (`A1-23`) | |
| M7.7 | Falar do tempo e das estações (`A1-13`) | + frase *Demain, il va pleuvoir.* (reuso) |

### 2.7 A1 M8 · Lazer, convites e passado (`A1-m6`)

#### M8.4 (g) → M8.3 (g) · Passé composé com *avoir* (`A1-g9`, publicada)
- **Hoje no site:** 4 telas (com *avoir*; particípios irregulares; com *être*; quadro), 8 exercícios (3 com *être*).
- **Veredito:** **ok** como no `08` (só *avoir*), + tela de **negação no passé composé** no lugar da tela de *être*.
- **Por quê:** um conceito (o tempo e a sua forma). GP 54 e DA1 U7 trazem a negação no passé composé (*je n'ai pas mangé*), e o *défi* do M8
  pede "1 negação" no relato. Os 3 exercícios com *être* vão para a `A1-g16`.
- **Desenho final:** 4 telas (*j'ai* + particípio em *-é*; particípios irregulares *fait, pris, bu, vu, eu, été*; *Je n'ai pas mangé*; quadro), 8 exercícios.

#### M8.5 (g) · Passé composé com *être* (`A1-g16`, nova)
- **Antes:** verbos de movimento, concordância, pronominais (*je me suis levé(e)*).
- **Veredito:** **ok**: tudo depende do mesmo auxiliar, e AE D5 L3, GP 46 e DA1 U7 ensinam juntos. Pré-requisitos já vistos: concordância (M5.4),
  pronominais (M3.4).
- **Desenho final:** 4 telas, 8 exercícios (inclui os 3 que saem da `A1-g9`).

#### Ordem do M8 (proposta pequena)
O `08` deixa as duas gramáticas no fim, seguidas. Proposta: **M8.1 Lazer → M8.2 Contar o que você fez (`A1-20`) → M8.3 (g) PC com *avoir* →
M8.4 Convidar, aceitar, recusar (`A1-27`) → M8.5 (g) PC com *être***. O convite (presente e fórmulas) não depende do passado, separa as duas
gramáticas e dá entrada para *être* (*Désolée, je suis rentrée tard hier*: frase nova, `A1-27` ainda não publicada). Na M8.4, **nota de
pronomes tônicos depois de preposição** (*avec moi, chez toi, pour elle*; AE D5 L1 "*chez* + tônico"; GP 59): é a segunda volta da espiral
de *Et toi ? Moi aussi.* do M1, presa a *Tu viens avec moi ?*. E nota *pourquoi / parce que* (já prevista no `04`).

---

## 3. A2 módulo a módulo

Todo o A2 é inédito: mudar posição ou conteúdo não custa nada ao aluno. Tempo de gramática do A2 pelo `08`: ~25 min.

### 3.1 A2 M1 · Lembranças e fases da vida (`A2-m1`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M1.2 (g) Imperfeito** (`A2-g1`) | formação e usos (descrição, hábito) | **ok** | um conceito (o tempo); AE D8 L3, GP 47, DA2 U7 | 4 telas (formação pela forma *nous*; *être → j'étais*; descrever e hábito: *quand j'étais petit, je jouais*; quadro), 8 ex. |
| **M1.4 (g) Negação: *ne... plus, jamais, rien, personne, que*** (`A2-g23`) | veio do M9 no `08` | **desfazer**: *ne... plus* vira **nota na M1.3**; *rien, personne, aucun* vão para **A2 M8.6 (g)** (com os indefinidos); *ne... que* vira **nota na A2 M5.1**; *jamais* já é do A1 (M3.6) | 5 negações e uma restrição (*ne... que* = "só", não é negação) seriam a maior gramática do A2. As fontes espalham: DA2 U4 e U7; DA Actuel 2 U2 (*plus*), U4 (*jamais*), U7 (*que*), U8 (*rien, personne, aucun*); AE D8 L2. *Ne... plus* é o que a função "antes e agora" pede (`08`) e cabe numa nota (troca *pas* por *plus*, mesmo lugar). *Rien / personne / aucun* têm outro lugar no passé composé (*je n'ai vu personne*): são pronomes, par de *quelqu'un / quelque chose* | M1.3 ganha nota "*ne... plus* = não... mais" (gatilho *avant / maintenant*). `A2-g23` fica **sem uso** |

Mapa final do M1: M1.1 Infância (`A2-1`) · M1.2 (g) Imperfeito (`A2-g1`) · M1.3 Antes e agora (`A2-2`, + nota *ne... plus*) · M1.4 Fases da
vida (`A2-3`). 4 unidades (o módulo de entrada fica leve, como o `08` já queria).

### 3.2 A2 M2 · Contar uma experiência (`A2-m2`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M2.2 (g) Passé composé x imperfeito** (`A2-g3`) | + tela de revisão do PC (absorve parte do `A2-g4`) | **ok** | um conceito (cenário x ação); a revisão é 1 tela de espiral, não conceito novo | 5 telas (revisão do PC; imperfeito = cenário; PC = o que aconteceu; os dois numa frase: *Il pleuvait quand je suis arrivé*; quadro), 8 ex. |
| **M2.4 (g) Pronomes COD e a concordância do particípio** (`A2-g9`) | veio do M4; absorve a concordância | **ok** (no teto) | a concordância só existe por causa do COD antes de *avoir*: é consequência, não outra escolha. D2 U2 e DA2 U2 trazem COD no presente, no PC e com futuro próximo | 5 telas (*le, la, l', les*; antes do verbo, também com *ne... pas*; no PC: *je l'ai perdu*; com futuro próximo: *je vais le chercher*; a concordância: *ma valise, je l'ai perdue*, só se ouve em *prise, faite, mise*), 8 ex. |
| **M2.6 (g) Tempo, duração e conectores** (`A2-g5`) | *il y a, depuis, pendant, en, ça fait... que*; *d'abord, ensuite, puis, enfin*; + *donc, alors* | **separar**: fica **"Marcar o tempo: *il y a, depuis, pendant, en, ça fait... que*"**; *d'abord, ensuite, puis, enfin* viram **nota na M2.1**; *donc, alors* **nota na M2.3** (o sistema completo é A2 M10.2) | três coisas: duração (escolha entre *depuis / pendant / il y a*), sequência (palavras) e consequência (palavras). AE D4 L1 trata os conectores de tempo como **léxico**; GP 50 traz só os marcadores; DA2 U5 separa duração de causa e consequência (U4) | 4 telas, 8 ex. |

Notas novas do M2: M2.1 "*d'abord, ensuite, puis, enfin*" (gatilho: relato da viagem); M2.3 "*donc, alors*" e "*-ment* = *-mente*:
*heureusement* = felizmente" (gatilho: *heureusement, malheureusement*, que já são cartões do `A2-5`). Confiança **alta** nas duas.

### 3.3 A2 M3 · Objetos e consumo (`A2-m3`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M3.2 (g) Relativos *qui, que, où*** (`A2-g6`) | | **ok** | uma escolha (que relativo, pela função na frase); AE D7 L3, GP 60, DA Actuel 2 U1 (*où*) | 4 telas (*qui*; *que*; *où*; quadro), 8 ex. |
| **M3.4 (g) Comparativo e superlativo** (`A2-g7`) | | **ajustar o foco**: **superlativo** (*le plus, le moins, le meilleur, le mieux*), com 1 tela de revisão do comparativo do A1; a comparação de quantidade (*plus de, moins de, autant de*) vira **nota na M3.5** | o comparativo é do A1 (M7.3); o novo é o superlativo (DA2 U2, DA Actuel 2 U2). *Meilleur / mieux* juntos aqui (o A1 só viu *meilleur*). Se a decisão 9 levar o comparativo ao A2, ele volta como tela e a unidade sobe para o A2 M1 (`08` 3.1) | 4 telas, 8 ex. |
| **M3.6 (g) Pronomes demonstrativos** (`A2-g8`) | *celui, celle, ceux, celles (-ci, -là)* | **ok, + *lequel*** como tela (vinda da `A2-g22`) | escolher entre objetos é pergunta e resposta: *Lequel tu préfères ? Celui-ci.* Mesma concordância (*laquelle / celle-là*). DA2 U3 e DA Actuel 2 U3 trazem *lequel*; o *défi* "La donnerie" usa os dois | 4 telas (*celui-ci, celle-là*; plural; *Lequel ? Laquelle ?*; quadro), 8 ex. |

### 3.4 A2 M4 · Saúde e bem-estar (`A2-m4`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M4.3 (g) Pronomes COI** (`A2-g10`) | *lui, leur* + *me, te, nous, vous* | **ok** | uma escolha (COI x COD, com verbos de *à*); AE D7 L3, GP 58, DA Actuel 2 U2 | 4 telas, 8 ex. |
| **M4.6 (g) Condicional e conselhos** (`A2-g11`) | condicional (cortesia e conselho) + *conseiller de, proposer de, recommander de* | **ajustar**: **condicional só com *devoir, vouloir, pouvoir, aimer*** (*tu devrais, je voudrais, on pourrait, j'aimerais*); *je te conseille de* fica como exemplo da mesma função | **achado de pré-requisito:** o condicional se forma com o radical do **futuro simples**, que só chega no A2 M6.2. A GPI ensina o condicional de cortesia e conselho (cap. 31) antes do futuro (cap. 47), com poucos verbos; é o que cabe aqui. A formação geral entra como linha de reconhecimento no quadro da `A2-g15` (*je parlerai / je parlerais*) | 4 telas (as 4 formas; conselho: *tu devrais*; cortesia e desejo: *je voudrais, j'aimerais*; quadro), 8 ex. |

### 3.5 A2 M5 · À mesa (`A2-m5`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M5.2 (g) Pronome *en*** (`A2-g12`) | | **ok** | uma escolha; AE D8 L1, DA2 U3 | 4 telas, 8 ex. |
| **M5.4 (g) Imperativo com pronomes** (`A2-g13`) | *Prends-le ! Ne le prends pas !* | **ok** | um conceito (lugar do pronome no imperativo); pré-requisitos COD, COI e *en* já vistos; o imperativo simples é do A1 (M6.4) | 4 telas, 8 ex. |
| **M5.6 (g) Advérbios e progressão** (`A2-g14`) | intensidade (*assez, plutôt, trop*), *-ment*, *de plus en plus / de moins en moins* | **virar notas**: intensidade e progressão na **M5.5**; *-ment* já foi para a **M2.3** | três assuntos pequenos. DA Actuel 2 U3 trata a intensidade como **léxico** e a progressão como uma linha de gramática; *-ment* é DA2 U8. Os três são presos a palavras (*plutôt salé, de moins en moins de viande*) e nenhum é escolha difícil | `A2-g14` fica **sem uso**; M5.5 ganha 2 notas (intensidade; *de plus en plus de* + nome) |

Nota nova na M5.1: *ne... que* = "só" (*Il ne reste que du poisson*; AE D8 L2 a põe no restaurante). Confiança **média** no gatilho.

### 3.6 A2 M6 · Estudos e projetos (`A2-m6`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M6.2 (g) Futuro simples** (`A2-g15`) | | **ok** | um tempo | 4 telas + quadro com a linha de reconhecimento do condicional, 8 ex. |
| **M6.4 (g) *quand* + futuro, *si* + presente e desejo** (`A2-g16`) | | **separar e mover para M6.6**: fica ***quand* e *si*: falar do futuro com condição**; o desejo (*j'aimerais, j'espère que, avoir envie de*) vira **nota na M6.5** | *quand* e *si* são a mesma pergunta ("que tempo vem depois?") e DA2 U5 junta os dois. O desejo é léxico: *espérer, avoir envie de, rêver de* **já são cartões do `A2-18`** (M6.5), que vem **depois** da M6.4 no `08`. Bom contraste para quem fala português: *quand je serai* (futuro) x "quando eu for"; *j'espère que tu viens* (indicativo) x "espero que você venha" | 4 telas, 8 ex.; posição **M6.6**, depois de "Projetos e sonhos" (*Quand j'aurai mon diplôme, je voyagerai*) |
| **M6.6 (g) *savoir* x *connaître* e verbos com *à / de*** (`A2-g17`) | o `08` 6.2 diz "e verbos com *à / de*"; o `08` 3.6 diz só *savoir* x *connaître* | **separar e mover para M6.4**: fica **só *savoir* x *connaître*** (recebe o *savoir* que sai da `A1-g6`); verbos com preposição ficam **nos cartões** (*rêver de, décider de* já vêm com *de*) + nota na M6.5 | duas escolhas sem ligação. A função "dizer o que sei fazer" é da M6.3 "Falar do aprendizado de línguas" (`08` consigo 3): *Je sais parler anglais. Je connais bien Paris.* | 3 telas, 6 ex.; posição **M6.4** |

Mapa final do M6: M6.1 Formação · M6.2 (g) Futuro simples · M6.3 Aprender línguas · **M6.4 (g) *savoir* x *connaître*** · M6.5 Projetos
e sonhos (+ notas desejo e verbo + *de* + infinitivo) · **M6.6 (g) *quand* e *si***.

### 3.7 A2 M7 · Trabalho e dinheiro (`A2-m7`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M7.3 (g) Obrigação, proibição, permissão** (`A2-g18`) | *il est interdit de, avoir le droit de, il ne faut pas* | **virar notas na unidade de regras e avisos** | **repete o vocabulário da unidade seguinte**: o `A2-21` (M7.4) ensina como cartão *interdit, autorisé, avoir le droit de, obligatoire, permettre, défendre*, e a gramática vinha **antes** dele (inverte a regra "entrada antes"). É o caso exato do princípio da dona | `A2-g18` **sem uso**; 2 notas no `A2-21`: "*il est interdit de* + infinitivo" e "*il ne faut pas* = não pode (não é 'não precisa': isso é *pas besoin de*)" (confiança alta) |
| **M7.6 (g) Discurso indireto no presente** (`A2-g19`) | *il dit que, il demande si / ce que / où* | **ok, mover para M7.3** | um conceito; logo depois de "Procurar emprego" (entrevista: *Elle me demande si j'ai de l'expérience*), que é onde a função nasce | 4 telas, 8 ex. |

Mapa final do M7: M7.1 Trabalho · M7.2 Procurar emprego · **M7.3 (g) Discurso indireto** · M7.4 Regras e avisos (+ 2 notas) · M7.5 Banco.

### 3.8 A2 M8 · Moradia e cidade (`A2-m8`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M8.3 (g) Pronome *y*** (`A2-g20`) | | **ok** | uma escolha; *on y va* foi fórmula no A1 | 4 telas, 8 ex. |
| **M8.6 (g) Indefinidos** (`A2-g21`) | *quelqu'un, quelque chose, tout / tous / toute(s), chaque, plusieurs* | **reorganizar**: **"Alguém e ninguém: *quelqu'un / personne, quelque chose / rien, aucun*"** (recebe da `A2-g23`); *tout, chaque, plusieurs, chacun* viram **nota na M8.2** | os pares positivo e negativo são um conceito só; DA Actuel 2 U8 junta *tout* com *rien, personne, aucun*, mas *tout / chaque / plusieurs* são determinantes de quantidade, outra escolha, e nascem nas regras da casa (*chacun fait le ménage, tous les samedis*). O *défi* "La charte de la coloc" pede indefinido: vem antes dele | 5 telas (*quelqu'un / personne*; *quelque chose / rien*; no PC: *je n'ai rien vu, je n'ai vu personne*; *aucun / aucune* + nome; quadro), 8 ex. |

### 3.9 A2 M9 · Comunicar e se relacionar (`A2-m9`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M9.2 (g) Momentos da ação** (`A2-g2`) | *venir de, être en train de, être sur le point de, commencer à, arrêter de* | **ok** | um conceito (em que ponto está a ação); DA2 U5, GPI 46; serve ao recado (`08`) | 4 telas, 8 ex. |
| **M9.4 (g) Pergunta formal e interrogativos** (`A2-g22`) | inversão produzida, *lequel* | **ajustar**: **"Perguntar em três registros"** (entonação, *est-ce que*, inversão com *-t-*), com o **quadro das palavras de pergunta** que no A1 ficaram em notas; *lequel* sai para a `A2-g8` | é a sistematização prometida pelo A1 (seção 8); registro na pergunta é DA Actuel 2 U7. *Lequel* é outra escolha (pronome) | 4 telas (o mesmo pedido em 3 registros; inversão com *-t-*; palavras de pergunta em cada registro: *Tu vas où ? / Où est-ce que tu vas ? / Où vas-tu ?*; quadro), 8 ex. |

### 3.10 A2 M10 · Opinião, cultura e mundo (`A2-m10`)

| Unidade (g) | Antes | Veredito | Por quê | Desenho final |
|---|---|---|---|---|
| **M10.2 (g) Opinar e ligar ideias** (`A2-g24`) | *je pense que, à mon avis*; causa, consequência, finalidade | **separar**: fica **"Causa, consequência e finalidade"** (*parce que, comme, grâce à, à cause de, donc, c'est pour ça que, pour* + infinitivo); a opinião vira **nota na M10.1** (já é fórmula com nota em A2 M3.5 e M5.1, `08`) | a opinião é léxico (DA Actuel 2 U3 e U8 a põem em "léxico"); causa e consequência são gramática em DA2 U4 e DA Actuel 2 U4 | 4 telas, 8 ex. |
| **M10.5 (g) *Il faut que / je veux que*** (`A2-g26`) | fórmula | **ok** | um conceito; `02` 12.3 | 3 telas, 6 ex. |
| **M10.7 (g) Gerúndio** (`A2-g25`) | | **ok** | um conceito | 3 telas, 6 ex. |

---

## 4. (a) Tabela consolidada: antes x depois

### 4.1 A1 (M2 a M8)

| Antes (`08`) | Depois | Veredito |
|---|---|---|
| — | M2.2 (g) Artigos e plural (`A1-g17`) | do `09` (opção C), não desta revisão |
| M2.2 (g) Possessivos e *c'est / il est* (`A1-g2`) | **M2.4 (g)** Possessivos | separar: *c'est / il est* → nota M2.1 |
| M2.5 (g) Preposições + procedência (`A1-g4`) | **M2.6 (g)** igual | ok |
| M2.6 (g) Frase negativa e perguntas (`A1-g12`) | **M2.7 (g)** Perguntar e negar (GP 5 + *pas de*) | enxugar: interrogativos → notas; sistema no A2 M9.4 |
| M3.2 (g) *-er*, pronominais e *on* (`A1-g3`) | M3.2 (g) Verbos em *-er* | separar |
| — | **M3.4 (g) Verbos pronominais (`A1-g18`)** | nova (parte da `A1-g3`) |
| M3.5 (g) Frequência (`A1-g8`) | **M3.6 (g)** igual | ok; exercícios reescritos |
| M4.5 (g) Partitivos e quantidade (`A1-g14`) | **M4.4 (g)** igual | ok; sobe uma posição |
| M6.4 (g) *faire* e *prendre* (`A1-g5`) | **M4.6 (g)** igual | mover; exercícios reescritos |
| M5.2 (g) 70 a 99 (`A1-g10`) | M5.2 (g) igual | ok; notas para a M5.1 |
| M5.4 (g) Adjetivos e demonstrativos (`A1-g15`) | M5.4 (g) Adjetivos: masculino, feminino e plural | separar: demonstrativos → nota M5.3; lugar → notas M2.3 e M7.1 |
| M6.2 (g) *aller*, futuro próximo e contraídos (`A1-g13`) | M6.2 (g) *aller* e os contraídos | separar |
| — | **M6.4 (g) Imperativo (`A1-g19`)** | nova (parte da `A1-g6`) |
| M6.6 (g) Modais, *il faut* e imperativo (`A1-g6`) | M6.6 (g) Modais e *il faut* | enxugar: imperativo sai; *savoir* → A2 |
| M7.3 (g) Comparar (`A1-g7`) | M7.3 (g) igual | ok; exemplos trocados |
| — | **M7.5 (g) Futuro próximo (`A1-g20`)** | nova (parte da `A1-g13`), veio do M6 |
| M8.4 (g) PC com *avoir* (`A1-g9`) | **M8.3 (g)** igual + negação no PC | ok |
| M8.5 (g) PC com *être* (`A1-g16`) | M8.5 (g) igual | ok |

### 4.2 A2

| Antes (`08`) | Depois | Veredito |
|---|---|---|
| M1.2 (g) Imperfeito (`A2-g1`) | M1.2 (g) igual | ok |
| M1.4 (g) Negação complexa (`A2-g23`) | — (nota M1.3; → M8.6; nota M5.1) | desfeita, id sem uso |
| M2.2 (g) PC x imperfeito (`A2-g3`) | igual | ok |
| M2.4 (g) COD e concordância (`A2-g9`) | igual | ok (no teto) |
| M2.6 (g) Tempo, duração e conectores (`A2-g5`) | M2.6 (g) Marcar o tempo | separar: conectores → notas M2.1 e M2.3 |
| M3.2 (g) Relativos (`A2-g6`) | igual | ok |
| M3.4 (g) Comparativo e superlativo (`A2-g7`) | M3.4 (g) Superlativo (+ revisão) | ajustar foco |
| M3.6 (g) Pronomes demonstrativos (`A2-g8`) | M3.6 (g) + *lequel* | ok + tela |
| M4.3 (g) COI (`A2-g10`) | igual | ok |
| M4.6 (g) Condicional e conselhos (`A2-g11`) | M4.6 (g) Condicional dos conselhos (4 verbos) | ajustar (pré-requisito do futuro) |
| M5.2 (g) *en* (`A2-g12`) | igual | ok |
| M5.4 (g) Imperativo com pronomes (`A2-g13`) | igual | ok |
| M5.6 (g) Advérbios e progressão (`A2-g14`) | — (notas M5.5 e M2.3) | vira notas, id sem uso |
| M6.2 (g) Futuro simples (`A2-g15`) | igual | ok |
| M6.4 (g) *quand*, *si* e desejo (`A2-g16`) | **M6.6 (g)** *quand* e *si* | separar e mover |
| M6.6 (g) *savoir* x *connaître* e verbos com *à / de* (`A2-g17`) | **M6.4 (g)** *savoir* x *connaître* | separar e mover |
| M7.3 (g) Obrigação, proibição, permissão (`A2-g18`) | — (notas no `A2-21`) | vira notas, id sem uso |
| M7.6 (g) Discurso indireto (`A2-g19`) | **M7.3 (g)** igual | ok, mover |
| M8.3 (g) *y* (`A2-g20`) | igual | ok |
| M8.6 (g) Indefinidos (`A2-g21`) | M8.6 (g) Alguém e ninguém | reorganizar (+ *rien, personne, aucun*) |
| M9.2 (g) Momentos da ação (`A2-g2`) | igual | ok |
| M9.4 (g) Pergunta formal e interrogativos (`A2-g22`) | M9.4 (g) Perguntar em três registros | ajustar (*lequel* → `A2-g8`) |
| M10.2 (g) Opinar e ligar ideias (`A2-g24`) | M10.2 (g) Causa, consequência e finalidade | separar: opinião → nota M10.1 |
| M10.5 (g) *Il faut que* (`A2-g26`) | igual | ok |
| M10.7 (g) Gerúndio (`A2-g25`) | igual | ok |

Contagem: A1 M2 a M8, 14 → **18** gramáticas (17 sem a opção C do `09`); A2, 25 → **22**.

---

## 5. (b) Efeito no tamanho dos módulos

Tempo: estimativa minha (confiança **baixa**, não medida), com a base do `08` 4 (vocabulário A1 ~30 min, gramática A1 ~18 min; enxuta de 3 a 4 telas
~12 a 15 min; A2 vocabulário ~40 min, gramática ~25 min). Cartões não mudam: gramática e nota não geram cartão.

### 5.1 A1

| Módulo | `08`: unid. (voc. + gram.) / tempo | Depois: unid. / tempo | Cartões | Leitura |
|---|---|---|---|---|
| M2 Família | 6 (3 + 3) / ~3h00 | **7 (3 + 4)** / ~3h15 (6 e ~3h00 sem a opção C) | 30 | o mais carregado em gramática, por causa da `A1-g17` do M1; a `A1-g2` e a `A1-g12` ficam menores |
| M3 Rotina | 5 (3 + 2) / ~2h40 | **6 (3 + 3)** / ~2h50 | 37 | pronominais com prática própria |
| M4 Comer e beber | 5 (4 + 1) / ~2h55 | **6 (4 + 2)** / ~3h15 | 41 | recebe *faire / prendre* |
| M5 Compras | 4 (2 + 2) / ~2h15 | 4 (2 + 2) / ~2h10 | 20 | continua o mais leve |
| M6 Na cidade | 6 (3 + 3) / ~3h05 | 6 (3 + 3) / ~2h55 | 30 | **deixa de ser o pico**: três gramáticas de 1 assunto cada, em vez de três de 2 a 3 |
| M7 Casa, hotel e férias | 6 (5 + 1) / ~3h30 | **7 (5 + 2)** / ~3h45 | 50 | **o mais longo do A1**; gramática leve (comparar, futuro próximo) |
| M8 Lazer e passado | 5 (3 + 2) / ~2h50 | 5 (3 + 2) / ~2h50 | 30 | só a ordem muda |
| **Total M2 a M8** | 37 (23 + 14) / ~20h15 | **41 (23 + 18)** / ~21h00 | 238 | +~45 min, dos quais ~15 vêm da `A1-g17` que sai do M1 |

Desequilíbrio: **M7** (~3h45, 7 unidades) e **M2** (7 unidades, 4 gramáticas). Alavancas, se a dona quiser: futuro próximo no M8 em vez do
M7 (M7 volta a ~3h30, M8 vai a ~3h05 com 3 gramáticas de tempo verbal seguidas); opção A ou B do `09` no M1 (M2 volta a 6 unidades); juntar
negação e pergunta já está feito (separar levaria o M2 a 8 unidades).

### 5.2 A2

| Módulo | `08` | Depois | Leitura |
|---|---|---|---|
| M1 Lembranças | 5 (3 + 2) / ~3h10 | **4 (3 + 1)** / ~2h50 | entrada leve |
| M2 Experiência | 6 (3 + 3) / ~3h55 | 6 (3 + 3) / ~3h55 | igual (conectores viram notas, ~−3 min) |
| M3 Objetos | 6 (3 + 3) / ~3h55 | 6 (3 + 3) / ~3h55 | igual |
| M4 Saúde | 6 (4 + 2) / ~4h10 | 6 (4 + 2) / ~4h10 | igual |
| M5 À mesa | 6 (3 + 3) / ~3h55 | **5 (3 + 2)** / ~3h35 | mais leve |
| M6 Estudos | 6 (3 + 3) / ~3h55 | 6 (3 + 3) / ~3h50 | só a ordem |
| M7 Trabalho | 6 (4 + 2) / ~4h10 | **5 (4 + 1)** / ~3h50 | mais leve |
| M8 Moradia | 6 (4 + 2) / ~4h10 | 6 (4 + 2) / ~4h10 | igual |
| M9 Comunicar | 6 (4 + 2) / ~4h10 | 6 (4 + 2) / ~4h10 | igual |
| M10 Opinião | 7 (4 + 3) / ~4h35 | 7 (4 + 3) / ~4h35 | igual |
| **Total** | 60 (35 + 25) / ~40h | **57 (35 + 22)** / ~39h | |

Nenhum módulo do A2 desequilibra para cima; M1, M5 e M7 ficam mais leves. A curva continua crescente até o M10.

---

## 6. (c) Impacto nos *défis* (versões do `08`)

| Módulo | *Défi* | Efeito | Ação |
|---|---|---|---|
| A1 M2 | Devinez la famille ! | todas as peças têm gramática antes (possessivo M2.4, origem M2.6, negação e pergunta M2.7) | nenhuma; *c'est / il est* fica só como alerta (*il est mon père*), não peça |
| A1 M3 | Le calendrier des jours préférés | o pronominal agora tem gramática própria antes (M3.4) | nenhuma |
| A1 M4 | Le panier et le café | **melhora**: *prendre* (pedido no café) passa a ter regra antes (M4.6) | pode exigir "1 frase com *prendre*" |
| A1 M5 | La boutique | o demonstrativo vira nota (sem exercício) | peça "1 demonstrativo" vira **presença**; alerta *ce robe → cette robe* no próprio *défi* (pergunta 10) |
| A1 M6 | Mon itinéraire coup de cœur | o futuro próximo sai do módulo | trocar a peça "o que você vai fazer lá" (`07` 4.1) por "aonde vou" (*je vais au musée*) ou "o que tem lá" (*il y a*) |
| A1 M7 | Check-in et carte postale | **melhora**: o futuro próximo chega antes do cartão-postal | pode exigir "1 frase com *je vais* + infinitivo" |
| A1 M8 | Invitation et week-end | igual (PC antes; convite entre as duas gramáticas) | nenhuma |
| A2 M1 | Le musée de mon enfance | *ne... plus* agora é nota | peça "1 frase com *ne... plus*" fica como presença |
| A2 M2 | Le voyage qui a mal tourné | conectores viram notas e cartões (*heureusement, soudain* já são cartões) | nenhuma |
| A2 M3 | La donnerie | *lequel* entra na `A2-g8` | pode usar *Lequel ?* no turno com o doador |
| A2 M4 | Remèdes de grand-mère | condicional com 4 verbos basta (*tu devrais*) | nenhuma |
| A2 M5 | Le guide gourmand | *de plus en plus* e *plutôt, trop* viram notas | peças ficam como presença |
| A2 M6 | Le CV d'un personnage | *savoir / connaître* chega antes (M6.4); *si* + presente continua antes do *défi* (M6.6) | nenhuma |
| A2 M7 | L'entretien d'embauche | obrigação vem das notas e cartões do `A2-21`; discurso indireto antes | nenhuma |
| A2 M8 | La charte de la coloc | indefinidos ganham *personne, rien* (*Personne ne fume dans l'appartement*) | pode aceitar indefinido negativo como peça |
| A2 M9, M10 | Invitation et réponse; Mon festival | igual | nenhuma |

---

## 7. (d) Riscos para ids e progresso

**Seguro por construção** (Etapa 0 e `09` B.6): gramática não gera cartão (`shared/core/quase-iguais-chaves.js:175`), então dividir, mover ou
enxugar gramática não toca em FSRS; o A2 é todo inédito; os ids novos estão livres (busca no repositório: `A1-g18`, `A1-g19`, `A1-g20`,
`A1-g21` com zero ocorrências; `A1-g17` só citado no `09`). Notas não têm FSRS.

| Risco | Onde | Mitigação |
|---|---|---|
| Gramática publicada dividida: o aluno que concluiu `A1-g3` ou `A1-g6` vê a parte nova como unidade não concluída | `A1-g3` → `A1-g18`; `A1-g6` → `A1-g19` (`A1-g13` não está publicada) | regra 2.10 do `04`: nasce aberta, não concluída; não bloqueia |
| Gramática publicada muda de módulo | `A1-g5` (do antigo `A1-m4` para `A1-m3`); `A1-g8` (já movida no `08`) | o Ponto de verificação aprovado continua aprovado; quem aprovou o `A1-m3` e não fez a `A1-g5` a vê aberta, não concluída |
| Exercícios com palavra ainda não ensinada na posição nova | `A1-g8` (6 de 6), `A1-g5` (4 de 6), `A1-g3` (1), `A1-g7` (2 + 3 exemplos), `A1-g6` (2 de *savoir*) | reescrever **antes** de mover (seção 2); nenhuma ferramenta confere isso hoje (`check_dictation_vocab.py` só olha ditados; `check_grammar_input.js` só conta entrada): vale um teste novo "exercício de gramática só com palavras vistas" |
| Prova do módulo muda de conjunto | módulos que ganham ou perdem gramática | a cota continua 2 itens (`CHECKPOINT_EXAM_QUOTAS`); só o sorteio muda |
| Desafios "Complete a frase" presos a uma gramática | os 6 publicados do antigo m6 vêm todos da `A1-g9`, e alguns usam *être* | conferir no banco quais usam *être* e reancorar na `A1-g16` (mesmo módulo); Staging antes (decisão 21 do `04`) |
| Ids do A2 sem uso | `A2-g14`, `A2-g18`, `A2-g23` (e o `A2-g4` do `08`) | como o `A2-g4`: nunca reaproveitar; registrar no livro-razão quando o A2 for publicado |
| `grammar_input_map.json` | entradas novas (`A1-g18`, `A1-g19`, `A1-g20`) e formas que mudam (`A1-g3` sem pronominais, `A1-g6` sem *savoir*, `A1-g13` sem futuro) | rodar `check_grammar_input.js` depois de cada lote |
| Texto em português que muda | títulos e telas de `A1-g3`, `A1-g5`, `A1-g6`, `A1-g7`, `A1-g8` | `DELIBERATE_PT_CHANGES` + camada em inglês (o site em inglês não tem nada em português) |

**Movimentos seguros pela Etapa 0 (lista):** todos os desta revisão. Nenhum muda chave `k`, nenhum exclui cartão. Os únicos itens com chave nova
são as frases de entrada sugeridas (*Le samedi, je fais les courses.*, *Désolée, je suis rentrée tard hier*, *Demain, il va pleuvoir.*), via
`congelar_chaves.js`, com áudio novo (skill `audio-tts`).

---

## 8. Espiral: onde cada tópico volta (para o aluno nunca voltar atrás)

| Tópico | Primeiro contato (fórmula ou nota) | Regra (gramática) | Volta depois |
|---|---|---|---|
| Pronomes tônicos | M1 *Et toi ? Moi aussi.* | M1.5 (g) (`09`) | nota M8.4 *avec moi, chez toi*; GP 59 |
| *c'est* x *il est* | nota M1.6 (sem artigo) | nota M2.1 (pessoas) | nota M4.1 (*c'est bon*), nota M7.1 (*c'est une grande maison* x *elle est grande*) |
| Negação | M1.1 *je ne comprends pas* | M2.7 (g) *ne... pas, pas de* | M3.6 *ne... jamais*; M4.4 *pas de* com partitivo; M8.3 no PC; A2 M1.3 *ne... plus*; A2 M8.6 *rien, personne* |
| Perguntas | M1 (*Tu es de quel pays ?*) e notas *in situ* | M2.7 (g) sim ou não | notas *quel* (M3.1), *quand* (M3.3), *combien* (M5.1), *pourquoi* (M8.4); A2 M7.3 indireta; A2 M9.4 (g) registros |
| Feminino | M1.2 *française* | M1.7 (g) pessoas (`09`) | nota M2.3; M5.4 (g) adjetivos; M8.5 concordância do PC |
| Lugar do adjetivo | nota M2.3 (já existe) | (sem gramática no A1) | nota M7.1 |
| Contraídos | M2.6 *du Brésil*; M4 *au café* | M6.2 (g) | nota M7.2 *à côté du lit* |
| Partitivo | M4.1 *du pain* (nota que já existe) | M4.4 (g) | A2 M5.2 *en* |
| Futuro | *je vais* + infinitivo desde M3.1 | M7.5 (g) futuro próximo | A2 M6.2 futuro simples |
| Condicional | *je voudrais* desde M4.1 | A2 M4.6 (g) 4 verbos | quadro da A2 M6.2 |
| Imperativo | M6.1 *Tournez à gauche* | M6.4 (g) | A2 M5.4 com pronomes |
| Comparar | M2.3 e M7.1 (frases) | M7.3 (g) | A2 M3.4 superlativo; nota A2 M3.5 quantidade |

---

## 9. (e) Perguntas de verificação para a dona

Critério geral
1. Critério "vira nota só se o *défi* não cobra aquilo com correção" (1.3)? *Recomendo sim.*
2. Teto de 5 telas e 8 exercícios por gramática? *Recomendo sim.*
3. A1 M2: "Perguntar e negar" (pergunta de sim ou não + *ne... pas* + *pas de*) numa unidade só, como o GP cap. 5, ou separar em duas (M2 com
   8 unidades)? *Recomendo uma.*
4. Palavras de pergunta (*où, quand, combien, quel, pourquoi*) como notas onde aparecem no A1, com o sistema no A2 M9.4? *Recomendo sim.*

A1
5. *c'est / il est* como nota na M2.1, e não tela da `A1-g2`? *Recomendo sim.*
6. Dividir a `A1-g3`: *-er* na M3.2 e pronominais em gramática nova (`A1-g18`) na M3.4? *Recomendo sim.*
7. *on* só como linha da tabela da `A1-g3` + a nota que já existe, sem tela própria? *Recomendo sim.*
8. *faire* e *prendre* (`A1-g5`) para o M4.6, juntos como hoje? *Recomendo sim.*
9. Partitivos (`A1-g14`) antes do restaurante (M4.4)? *Recomendo sim.*
10. Demonstrativos (*ce, cette, ces*) como nota na M5.3, ou gramática pequena `A1-g21`? *Recomendo nota.*
11. `A1-g15` só com masculino, feminino e plural (lugar do adjetivo nas notas M2.3 e M7.1)? *Recomendo sim.*
12. Nota regional *septante / nonante* e "telefone em pares" na M5.1 (gramática não tem nota)? *Recomendo sim.*
13. Futuro próximo em gramática própria (`A1-g20`) no M7, depois de "Férias e hotel", ou no M8, antes do passé composé? *Recomendo M7.*
14. Imperativo em gramática própria (`A1-g19`, M6.4) e `A1-g6` só com modais e *il faut*? *Recomendo sim.*
15. Tirar *savoir* do A1 (vai inteiro para o A2 M6.4)? *Recomendo sim.*
16. M8 na ordem Lazer → Contar → (g) PC *avoir* → Convites → (g) PC *être*? *Recomendo sim.*
17. Reescrever os exercícios das gramáticas publicadas que mudam de lugar (`A1-g8`, `A1-g5`, `A1-g3`, `A1-g7`, `A1-g6`) e criar um teste
    "exercício de gramática só com palavras vistas"? *Recomendo sim.*

A2
18. Desfazer a "Negação complexa" (`A2-g23`): *ne... plus* nota na M1.3, *rien / personne / aucun* na `A2-g21`, *ne... que* nota na M5.1? *Recomendo sim.*
19. `A2-g5` só com marcadores de tempo; *d'abord... enfin*, *donc, alors* e *-ment* como notas no M2? *Recomendo sim.*
20. `A2-g7` focada no superlativo, com *lequel* indo para a `A2-g8`? *Recomendo sim.*
21. Condicional do M4 só com *devoir, vouloir, pouvoir, aimer* (o futuro só chega no M6)? *Recomendo sim.*
22. `A2-g14` (advérbios e progressão) virar notas na M5.5? *Recomendo sim.*
23. A2 M6 na ordem futuro → aprender línguas → (g) *savoir* x *connaître* → projetos → (g) *quand* e *si*, com desejo e verbos com *de* em notas? *Recomendo sim.*
24. `A2-g18` (obrigação) virar 2 notas no `A2-21`, porque repete o vocabulário dele? *Recomendo sim.*
25. Discurso indireto logo depois de "Procurar emprego" (A2 M7.3)? *Recomendo sim.*
26. Ids `A2-g14`, `A2-g18`, `A2-g23` aposentados sem uso, como o `A2-g4`? *Recomendo sim.*

---

## Resumo

- 14 gramáticas do A1 (M2 a M8) e 25 do A2 revisadas, cada uma com posição, conteúdo, veredito, justificativa por fonte e desenho final.
- Princípios da dona aceitos, com duas ressalvas com evidência: nota só quando o *défi* não cobra (nota não tem exercício nem entra na prova);
  pares que os livros sempre ensinam juntos contam como um conceito (GP 5, GP 40, DA1 U4 e U5).
- A1: 3 gramáticas novas (pronominais, imperativo, futuro próximo); *faire / prendre* vai para Comer e beber; *savoir* sai para o A2; *c'est /
  il est*, demonstrativos, palavras de pergunta e as notas regionais viram notas na lição que as usa. O M6 deixa de ser o pico; M7 e M2 ficam os maiores.
- A2: 2 gramáticas viram notas (advérbios, obrigação), a negação complexa é desfeita, 8 são enxugadas, ajustadas ou reordenadas, e o
  condicional se adapta ao futuro que vem depois.
- Achados: exercícios publicados com palavras de módulos posteriores (`A1-g8`, `A1-g5`, `A1-g3`, `A1-g7`), *le mien* e *savoir* no A1, nota
  regional impossível numa gramática, *A2-g18* repetindo o vocabulário da unidade seguinte.
- Nenhum id de cartão muda; riscos de progresso só os de sempre (regra 2.10, Desafios do antigo m6). 26 perguntas para a dona.
