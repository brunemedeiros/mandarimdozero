# Revisão do A1 e do A2 por função comunicativa (mapa v3)

Data: 2026-10-17. Documento de **revisão e proposta**. **Nenhum arquivo do site nem dos documentos 01 a 07 foi alterado.**
Base: `04-lacunas-e-propostas-fr.md` (seções 0.1, 1, 3, 4, 5, 6.3, 7, 9, 11, 13), `02-referencia-livros-fr.md` (Alter Ego+ 1, Défi 1,
Défi Actuel 1 na seção 15, Défi Actuel 2 na seção 14), `03-delf-cefr-a1-a2.md` (descritores e provas), `06-fonetica-trilha.md` (som por
módulo), `07-atividades-finais-defi.md` (défi por módulo) e `01-auditoria-fr-atual.md` (conteúdo real de cada unidade).
Siglas das fontes: **AE** Alter Ego+ 1; **D1** Défi 1; **DA1 / DA2** Défi Actuel 1 / 2; **GP** Grammaire Progressive A1; **CEFR**
descritores (paráfrase do `03`, confiança média); **DELF** provas do `03` (formato: confiança alta).

> ### Como ler os rótulos deste documento
>
> **Rótulo principal = posição na trilha.** `M3.2` quer dizer "2ª unidade do módulo 3", contando na ordem em que o aluno vê.
> `(g)` marca unidade de gramática. Quando o nível não está claro pelo contexto, vem antes: **A1 M3.2**, **A2 M4.5**.
> Os módulos são numerados na ordem real (M1 é o primeiro que o aluno faz).
>
> **Id interno** (ex.: `A1-21`, `A1-m7`, `A2-g9`) aparece só entre parênteses. Ele é uma **chave fixa** que guarda o progresso do aluno
> (cartões, unidades concluídas, Ponto de verificação). Ele **não diz a ordem nem o módulo**: `A1-21` foi só a 21ª unidade a ser criada.
> Com os ids estáveis da Etapa 0 (`04`, seção 2), a unidade pode mudar de lugar sem perder nada; por isso mudamos a **posição** e
> deixamos o id quieto. A tabela de correspondência posição ↔ id está no fim (seção 10).
>
> Quando cito o mapa do `04` (v2), escrevo "no v2" e o nome da unidade ou a posição antiga, nunca só o id.

---

## 0. Problema, causa e método

**Problema que a dona viu.** No v2, "Profissões" entrou no módulo 2 como unidade nova, longe de nome, idade e nacionalidade, embora
seja o mesmo ato de fala ("apresentar-se": DA1 unidade 1 junta identidade, soletrar, idade e profissão). E o módulo 1 do v2 ensina
"a contar" (números de 0 a 10, depois "Números de 11 a 20 e a idade") em vez de ensinar "a dizer a idade": a idade de um adulto
(20 a 69) só fica possível no módulo de Compras, porque 30 a 60 estavam lá.

**Causa.** As unidades novas foram postas "onde coube" e os números foram organizados como **sistema de contagem**, não como
**ferramenta de uma função**. O mesmo vício aparece em outros pontos (seção 1): dados pessoais antes dos meses e dos números que a
ficha exige; nacionalidades no módulo "Na cidade"; cores depois das roupas; imperativo depois do *défi* que pede o caminho; frequência
no módulo de lazer em vez de na rotina; comida espalhada por três módulos.

**Método desta revisão (o mesmo para os 18 módulos):**
1. Declarar o que o aluno **consegue fazer** no fim do módulo (3 a 6 frases "consigo..."), ancorado no CEFR e no DELF.
2. Cada unidade tem de servir a um desses "consigo". Números, gramática e som entram **porque a função pede**, no ponto em que pede.
3. **Pré-requisito**: nada que o *défi* do módulo exige pode ser ensinado depois dele. Uso como fórmula antes da regra é aceito (é a
   regra da casa: entrada antes da gramática, `check_grammar_input.js`), desde que a regra chegue **antes do *défi*** que a cobra.
4. O *défi* recicla o módulo dele (princípio 1.1 do `07`): cada peça obrigatória aponta para uma unidade do próprio módulo.
5. Decisões já tomadas valem (seção 5): COD, COI, *y*, *en*, futuro simples, imperfeito, condicional e relativos = A2; A1 só com
   *futur proche*; passé composé fecha o A1; nenhum símbolo fonético (IPA) para o aluno.

**O que é barato e o que custa.** Unidades novas do v2 **ainda não foram publicadas**: mudar o lugar delas é grátis. Mudar de módulo
uma unidade **existente** não muda id de cartão (o id do cartão vem da unidade e da chave, não do módulo), mas mexe no Ponto de
verificação herdado, nos Desafios e nos ditados (seção 8). Mover **palavras** entre unidades exige a Etapa 0.

---

## 1. Diagnóstico do v2 (achados que motivam o v3)

| # | Achado no v2 | Por que é problema | Correção no v3 |
|---|---|---|---|
| 1 | Profissões no módulo 2 | profissão é parte de "apresentar-se" (DA1 un. 1; DELF A1 PO1 entrevista) | **A1 M1.6 Dizer a profissão**; flexão de gênero das profissões vai para **M1.7 (g)** (gênero) |
| 2 | Módulo 1 ensina a **contar**; idade adulta (20 a 69) impossível até o módulo de Compras; 21 a 29 só numa nota | o "consigo dizer a idade" falha para quase todo aluno adulto (pedido da dona, ver 2.1) | M1.3 e M1.4 viram unidades **de idade**, com os números que a idade pede (1 a 69); contagem para preço e telefone vai para Compras |
| 3 | Dados pessoais (ficha + soletrar) no módulo 2 | a ficha pede data de nascimento (meses: módulo 3), ano e CEP (números até 1000: Compras), telefone em pares até 99 (Compras), *rue* (Cidade). Tudo vinha **depois** | ficha e soletrar vão para **A1 M7.5**, no módulo de hotel e férias (a ficha de hotel é o exemplo do CEFR A1 e do DELF A1 PE1) |
| 4 | Nacionalidades (6 pares) e "onde mora" no módulo "Na cidade" | é identidade (falar de si e dos outros), não cidade | **A1 M2.4 Dizer de onde é e onde mora**, junto da família |
| 5 | Cores e descrição (v2: no módulo Casa, 7º) **depois** das roupas (Compras, 5º); o *défi* de Compras pede cor | pré-requisito invertido | **A1 M2.3 Descrever pessoas: cores e aparência**, antes de Compras |
| 6 | Imperativo nas telas da gramática de modais, no módulo de viagem (6º); o *défi* "explicar o caminho" é do módulo da cidade (4º) | o *défi* cobra o imperativo antes de ensiná-lo | a gramática de modais, *il faut* e imperativo fica **dentro do módulo da cidade (A1 M6.6)**, antes do *défi* |
| 7 | Comida em 3 módulos (café na rotina, mercado e quantidades em Compras, restaurante em Viagem) | a função "comer e beber" (gostos, pedir, feira) fica picada | módulo próprio **A1 M4 Comer e beber** |
| 8 | Advérbios de frequência no módulo de lazer | frequência é a gramática da **rotina** (DA1 un. 4; D1 un. 5; AE 4.1) | **A1 M3.5 (g)** |
| 9 | *tôt, tard* postos em "Expressões de passado"; *tôt* já está numa frase e num Desafio de Acentuação da rotina | palavras de rotina (DA1 un. 4 léxico) | vão para **A1 M3.1 Dizer as horas e a rotina** |
| 10 | *défi* da rotina (`07`) pede *petit-déjeuner*, *parce que*, *j'adore*, todos ensinados depois | pré-requisito | *défi* ajustado (2.3) |
| 11 | *défi* do módulo 2 (`07`) traz a ficha de 8 campos | mesmos pré-requisitos do achado 3 | ficha sai; entra "troca de informações" (DELF A1 PO2) |
| 12 | *c'est / il est* previsto na gramática de adjetivos (módulo Casa) | quem apresenta a família precisa dele no módulo 2 (DA1 un. 3) | tela nova em **A1 M2.2 (g)** |
| 13 | Exemplo do E7 no `04` (seção 9): *Celui-ci coûte 20 euros* | pronome demonstrativo é A2 (A2 M3.6) | trocar por *Ce pull coûte vingt euros.* |
| 14 | Exemplo do E6 no `04` (*Je travaille dans un hôpital*) | *l'hôpital* só chega no módulo da cidade | modelo: *Je suis infirmière. J'aime mon travail.* |
| 15 | A2: "momentos da ação" no módulo de lembranças; concordância do particípio antes do COD; *le vol* (voo) e *le vol* (roubo) no mesmo módulo | função errada, pré-requisito, colisão de cartão | seção 3 |
| 16 | "Descrever o caráter" não tem unidade nem no A1 nem no A2 | é função do DELF A2 PO2 ("descreva um amigo") e aparece no A1 dos dois métodos (AE 3.2, DA1 un. 3 e 6) | lista curta no A1 (pergunta 6) e unidade nova **A2 M4.5** |

---

## 2. A1 módulo a módulo

Formato: (a) consigo...; (b) conteúdo e pré-requisitos; (c) mapa v3 do módulo; (d) *défi*; (e) som do módulo (`06`).
Confiança dos "consigo": DELF = alta (formato das provas); CEFR = média (paráfrase do `03`); livros = alta (prints e guias, `02`).

### 2.1 A1 M1 · Apresentar-se (id `A1-m1`)

**(a) Ao fim do módulo o aluno consegue:**
1. cumprimentar, despedir-se e agradecer, escolhendo *tu* ou *vous* (CEFR A1 Conversa; DA1 un. 0; AE D1 L1);
2. dizer e perguntar nome e nacionalidade, com a forma certa de masculino e feminino (CEFR A1 escala global; DELF A1 PO1; DA1 un. 1);
3. **dizer a própria idade e perguntar a do outro, para qualquer idade de 1 a 69** (DELF A1 PO1; DA1 un. 1 "dizer a idade"; AE D0
   ensina 0 a 69 já na abertura);
4. dizer a profissão (*Je suis professeur*, sem artigo) e perguntar a do outro (DA1 un. 1; DELF A1 PO1);
5. reagir com *Et toi ? Moi aussi.* e pedir para repetir (*Pardon ? Vous pouvez répéter ?*) (CEFR A1: interage "se o outro fala devagar
   e ajuda").

**(b) A idade como função (pedido da dona).** O v2 fazia o contrário: módulo 1 = "Números de 0 a 10" + "Números de 11 a 20 e a idade",
com a justificativa "o aluno aprende a contar antes de dizer a idade" (`04`, seção 3 itens 1 e 2, deslocamento D1). Resultado: no fim
do módulo o aluno de 35 anos **não consegue** dizer a idade, porque *trente* só vinha em Compras e 21 a 29 só numa nota.
Desenho v3, a partir do "consigo 3":
- A função pede: *avoir* (*j'ai*), *ans*, *l'âge*, a pergunta (*Tu as quel âge ? / Quel âge avez-vous ?*), as **unidades 1 a 9** (para
  compor), *dix*, *vingt* e **as dezenas até 60**, mais a regra de composição (*vingt et un, vingt-deux... soixante-neuf*). De 11 a 16
  servem para idade de filhos e sobrinhos (módulo 2) e são irregulares; 17 a 19 saem pela regra (*dix-sept = dix + sept*).
- A função **não** pede: *zéro*, *combien* (que serve a preço e quantidade), 70 a 100, *mille*. Isso vai para **A1 M5.1 Perguntar o preço
  e pagar**, onde estão preço e telefone.
- Duas unidades, as duas com objetivo de idade:
  - **M1.3 Dizer a idade: de 1 a 29** (id `A1-3`): *l'âge, avoir, ans, un / une, deux, trois, quatre, cinq, six, sept, huit, neuf, dix,
    vingt* (14). Frases e diálogo de idade **ficam aqui** (eram do `A1-3` e o v2 os mandava embora). Ao fim desta unidade o aluno já diz
    qualquer idade de 1 a 10 e de 20 a 29 (*J'ai vingt-quatre ans*), com a regra de 21 a 29 numa tela de explicação ("21 = *vingt et un*,
    22 em diante sem *et*") e treino em frases com cenário.
  - **M1.4 Perguntar a idade dos outros: até 69** (id `A1-21`): *onze, douze, treize, quatorze, quinze, seize, trente, quarante,
    cinquante, soixante* (10). Frases novas sobre a idade de terceiros (*Ta mère a quel âge ? Elle a cinquante-deux ans.*), diálogo novo
    (apresentar um amigo e a idade dele), nota de explicação "17 a 19 e as dezenas: *dix-sept, trente et un, quarante-cinq*". A nota
    regional *septante / nonante* sai do módulo 1 e vai para M5.2 (g) (é sobre 70 e 90).
- **Para onde vai cada item que o v2 movia (resposta explícita):**
  - *vingt*, *l'âge*, *avoir*, *ans*: **ficam no M1.3** (id `A1-3`). O deslocamento D1 do v2 é **cancelado**.
  - frases e diálogo de idade do `A1-3`: **ficam no M1.3**.
  - *zéro* e *combien* (hoje no `A1-3`): vão para **M5.1 Perguntar o preço e pagar** (id `A1-28`), função preço e telefone.
  - *trente, quarante, cinquante, soixante* (hoje no `A1-10`, roupas): vão para **M1.4** (no v2 iam para Compras).
  - *soixante-dix, quatre-vingts, quatre-vingt-dix, cent* (hoje no `A1-10`): vão para **M5.1**, como no v2.
  - *dix-sept, dix-huit, dix-neuf*: **não viram cartão** (eram itens novos do v2, nunca publicados); entram pela regra, nas frases e no
    ditado de números.

**Profissões e gênero (decisão da dona).** M1.6 Dizer a profissão vem logo depois de *être* (M1.5 (g)) e antes da regra de gênero
(M1.7 (g)), que fecha o módulo antes do *défi*. Na unidade, cada cartão mostra o par (*le vendeur / la vendeuse*), como já acontece com
*français / française*; a explicação de **por que** (*-eur / -euse, -ier / -ière, -ien / -ienne*) fica toda na M1.7 (g).
Lista de M1.6 (id `A1-22`): *le professeur / la professeure, l'étudiant / l'étudiante, le médecin* (movido de "Corpo e saúde", que ganha
*se reposer*), *l'infirmier / l'infirmière, le vendeur / la vendeuse, le serveur / la serveuse, l'ingénieur / l'ingénieure, l'avocat /
l'avocate, le travail, le bureau* (10). Sai do v2 *l'entreprise* (pouco útil para dizer "onde trabalho" sem *dans une* + nome).
Nota de explicação: *Je suis professeur* (sem artigo) e *Qu'est-ce que vous faites dans la vie ?*. O contraste *c'est un professeur* x
*il est professeur* fica para M2.2 (g), onde se apresenta alguém.

M1.7 (g) Masculino e feminino, artigos e plural (id `A1-g11`): *le, la, l', les, un, une, des*; gênero não segue o português; *-s* do
plural mudo; **feminino de nacionalidades e profissões** (tela nova pedida pela dona: *-ais / -aise, -ien / -ienne, -eur / -euse,
-ier / -ière*; iguais: *médecin, ingénieure* com *e* só na escrita; nota de feminização = decisão 14 do `04`); *des → de* na negação
como gancho para M2.6 e M4.5.

Pré-requisitos conferidos: *être* (M1.2, fórmula) → M1.5 (g); *avoir* (M1.3) → M1.5 (g); possessivo *ton père* aparece como fórmula
(regra em M2.2); negação só em fórmula (*je ne comprends pas*). Nada que o *défi* cobra vem depois.

**(c) Mapa v3 do M1**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M1.1 | Cumprimentar e se despedir (`A1-1`) | alterada | 10 | nota Quebec *bienvenue* (v2); frases *Pardon ? Vous pouvez répéter ?* (consigo 5) e nota curta de instruções de aula (*écoutez, répétez*: `02` 15.1) |
| M1.2 | Dizer o nome e a nacionalidade (`A1-2`) | alterada | 10 | lições e palavras reordenadas (v2) |
| M1.3 | **Dizer a idade: de 1 a 29** (`A1-3`) | alterada | 14 | +6 unidades (4 a 9); *vingt, l'âge, avoir, ans* e o diálogo **ficam**; *zéro, combien* saem para M5.1; título e objetivo novos |
| M1.4 | **Perguntar a idade dos outros: até 69** (`A1-21`) | nova | 10 | 11 a 16 + dezenas 30 a 60 (4 movidas das roupas); no v2 era "11 a 20" |
| M1.5 (g) | *être* e *avoir*, pronomes tônicos (`A1-g1`) | alterada | | + tela *moi, toi... Moi aussi. Moi non plus.* (v2) |
| M1.6 | **Dizer a profissão** (`A1-22`) | nova, **veio do módulo 2** | 10 | pedido da dona; + *le médecin* |
| M1.7 (g) | **Masculino e feminino, artigos e plural** (`A1-g11`) | nova, **veio do módulo 2** | | + tela de feminino das profissões e nacionalidades |

**(d) *Défi* "Bienvenue au club !"** (`07` 4.1, mantido com ajuste). Peças obrigatórias passam a ser: cumprimento, nome, nacionalidade
**com concordância**, idade (**qualquer idade até 69**), profissão **sem artigo**, *et toi ?*, despedida. Correção: turnos fechados
automáticos; mensagem por peças; alerta *je suis un professeur* → sem artigo; alerta *je suis brésilien* quando a persona é mulher.
Recicla só o M1. Ok.

**(e) Som:** A1-S1 ritmo e entonação; notas de letras mudas e liaison na idade (*deux‿ans, trois‿ans, vingt‿et un, six‿ans*).

### 2.2 A1 M2 · Família e pessoas próximas (id `A1-m7`)

**(a) Consigo:**
1. apresentar a família e dizer nome, idade e profissão de cada um (DELF A1 PO1; DA1 un. 3; CEFR A1 PO "pessoas que conhece");
2. apresentar alguém (*C'est ma sœur. Elle est médecin.*) (DA1 un. 0 e 3);
3. descrever fisicamente uma pessoa de forma simples (*Il est grand, il a les yeux bleus.*) (AE D3 L2; CEFR A1 escrita criativa);
4. dizer de onde alguém é, onde mora e que línguas fala (CEFR A1 escala global "onde mora"; AE D0 "línguas"; DA1 un. 2-3);
5. fazer e responder perguntas simples e negar (DELF A1 PO2 "troca de informações"; CEFR A1 interação).

**(b) Conteúdo e pré-requisitos.** Família usa idades e profissões do M1 (agora completas). *c'est / il est* entra em M2.2 (g), não
no módulo de Compras. Cores vêm para cá (descrever olhos, cabelo, roupa de alguém) e ficam prontas para as roupas do M5.
"De onde é e onde mora" (id `A1-9`) vem do módulo "Na cidade": usa *venir de / du / des* + país **antes** da gramática de contraídos
(M6.2), então a M2.5 (g) ganha uma tela de procedência (*Je viens de France, du Brésil, des États-Unis*). Línguas faladas entram como
frases no M2.4 (*Je parle portugais et un peu anglais*), sem cartão novo (a palavra é a mesma da nacionalidade no masculino).

**(c) Mapa v3 do M2**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M2.1 | Apresentar a família (`A1-4`) | alterada, veio do módulo 1 | 10 | frases *mes grands-parents, j'ai deux enfants, je suis marié(e)* (v2) + *C'est mon père, il est ingénieur.* |
| M2.2 (g) | Possessivos e apresentar alguém (`A1-g2`) | alterada, veio do módulo 1 | | + tela *c'est* + nome x *il / elle est* + profissão/adjetivo (era do v2 na gramática de adjetivos) |
| M2.3 | **Descrever pessoas: cores e aparência** (`A1-16`) | alterada, **veio do módulo Casa** | 10 (ver pergunta 6) | frases de descrição física (v2) e de roupa de alguém; 2 frases com *plus ... que* (entrada para M7.3 (g)); título novo |
| M2.4 | **Dizer de onde é e onde mora** (`A1-9`) | alterada, **veio do módulo da cidade** | 10 | fusões e *habiter, la ville* (v2); + frases de línguas faladas; diálogo sobre terceiros (v2) |
| M2.5 (g) | Preposições com cidades e países (`A1-g4`) | alterada, **veio do módulo da cidade** | | + tela de procedência *de / d' / du / des* + país |
| M2.6 (g) | Frase negativa e perguntas (`A1-g12`) | nova (já era do módulo 2) | | igual ao v2 (tela "o jeito da rua" absorve as notas de pergunta no fim da frase) |

**(d) *Défi* "Devinez la famille !"** (`07`), **ajustado**: sai a ficha de inscrição de 8 campos (pré-requisitos do M3, M5 e M6; vai para
o M7). Entra o núcleo DELF A1 PO2: "faça 4 perguntas ao personagem" a partir de palavras-cartão (*âge ? profession ? ville ? frères ?*),
com *est-ce que* ou entonação. Pistas obrigatórias: 1 possessivo, 1 profissão sem artigo, 1 descrição com cor, 1 origem (*il vient
du...*), 1 negação. Recicla só o M2 e as idades do M1.

**(e) Som:** A1-S3 o som de *tu* (*tu, une, du, salut*); nota *mon‿ami* (A1-S4) em M2.2 (g); *le / les* já tratado em M1.7 (g).

### 2.3 A1 M3 · Rotina e calendário (id `A1-m2`)

**(a) Consigo:**
1. perguntar e dizer as horas e a que horas faço algo (CEFR A1 transações "horas"; AE D4 L1);
2. descrever a minha rotina e dizer com que frequência faço as coisas (DA1 un. 4; D1 un. 5; AE D4 L3);
3. dizer o dia, a data e o meu aniversário (DA1 un. 4; DELF A1: datas em documentos);
4. combinar um dia e uma hora com alguém (CEFR A1 interação; DELF A1 CE: convite).

**(b) Conteúdo e pré-requisitos.** Horas pedem números até 59 (M1 cobre até 69). *tôt* e *tard* entram como cartão na rotina
(*tôt* já está numa frase e num Desafio de Acentuação dessa unidade). *se coucher* entra (v2), *manger* sai por fusão com "Gostos e
pedidos no café" (v2; a frase *je mange à midi* fica como entrada). Frequência (M3.5 (g)) precisa de entrada: 3 frases novas em M3.1 e
M3.3 (*Le samedi, je me lève souvent tard.*). *on* = *nous* ganha tela em M3.2 (g) (`02` 15.1). Datas: *le premier mars*, *le deux
mars* (só *premier* é ordinal: nota em M3.4). Datas com ano ficam para o M7 (pedem *mille*).

**(c) Mapa v3 do M3**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M3.1 | Dizer as horas e a rotina (`A1-6`) | alterada | 12 | *manger* fundido (v2); + *se coucher* (v2), **+ *tôt, tard*** (no v2 iam para o passado); + frases de frequência; frases *et quart / et demie* (v2) |
| M3.2 (g) | Verbos em *-er*, pronominais e *on* (`A1-g3`) | alterada | | + letras mudas (v2) + tela *on* |
| M3.3 | Dizer o dia e combinar (`A1-7`) | alterada | 11 | dias completos (v2); meses saem (v2) |
| M3.4 | Dizer a data e o aniversário (`A1-24`) | nova | 14 | igual ao v2 + nota *le premier* |
| M3.5 (g) | Com que frequência (`A1-g8`) | alterada, **veio do módulo de lazer** | | gramática da rotina |

Sai do módulo: "Gostos e pedidos no café" (id `A1-5`), que vai para o M4.

**(d) *Défi* "Le calendrier des jours préférés"** (`07`), **ajustado**: sem refeições (*petit-déjeuner* é do M4), sem *parce que* (M8) e sem
*j'adore* (M4). Peças: 6 horários com verbo pronominal, 1 advérbio de frequência, o dia preferido, a data do aniversário. Recicla só o M3.

**(e) Som:** A1-S5 terminações mudas e *e* mudo (igual ao `06`).

### 2.4 A1 M4 · Comer e beber (id `A1-m3`)

**(a) Consigo:**
1. dizer do que gosto e do que não gosto de comer e beber, e reagir (*moi aussi / moi non plus*) (DA1 un. 2 e 7; AE D1 L3 e D7 L1);
2. pedir num café e num restaurante, e pedir a conta (CEFR A1 transações; DELF A1 PO3);
3. fazer a lista do mercado e pedir quantidades na feira (*un kilo de, un peu de*) (CEFR A1 transações "quantidades"; DA1 un. 7);
4. ler um cardápio simples (CEFR A1 "ler para se orientar"; DELF A1 CE).

**(b) Conteúdo e pré-requisitos.** Junta o que o v2 espalhava em 3 módulos. Preços até 69 bastam para café, feira e menu (M1).
*adorer* entra aqui (primeira unidade de gostos), não no lazer. *je voudrais* e *je vais prendre* aparecem como fórmula; a regra do
*futur proche* vem no M6.2 (g), e o *défi* deste módulo não a cobra. *au café, au restaurant* são fórmula até M6.2 (g).
*il y a beaucoup de monde* (feira) segue como fórmula; *il y a* é explicado em M6.1 e vira cartão em M7.1.

**(c) Mapa v3 do M4**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M4.1 | Gostos e pedidos no café (`A1-5`) | alterada, **veio da rotina** | 11 | frase R4 trocada (v2); recebe *manger* (fusão do v2); **+ *adorer*** (no v2 ia para o lazer); nota *moi aussi / moi non plus* |
| M4.2 | Fazer a lista do mercado (`A1-11`) | alterada | 10 | no v2 ia para Compras; fica aqui |
| M4.3 | Pedir quantidades na feira (`A1-12`) | alterada | 10 | idem; Acentuação corrigida (`04` v1 3.1) |
| M4.4 | Pedir no restaurante (`A1-25`) | nova, **veio do módulo de viagem** | 10 | lista do v2 |
| M4.5 (g) | Partitivos e quantidade (`A1-g14`) | nova, **veio de Compras** | | depois da entrada das 4 unidades |

**(d) *Défi* novo (o `07` não tinha módulo de comida): "Le panier et le café"** · F2 + F4. (1) Lista do mercado para um almoço de 4
pessoas com orçamento de 40 € (preços até 69): quantidades e partitivos, o site soma a "tabela da feira" (automático; vinha da
alternativa "Le panier anti-gaspi" do `07`, livro D1 un. 8). (2) Núcleo DELF A1 PO3: pedido em turnos no café de Léa (pedir para dois,
perguntar o que tem, pedir a conta). Recicla só o M4 e os números do M1.

**(e) Som:** A1-S7 as nasais e nasal x vogal + *n* (*du pain, du vin, la viande, c'est bon / bonne*). No `06` estava em Compras.

### 2.5 A1 M5 · Compras (id `A1-m8`)

**(a) Consigo:**
1. entender e dizer preços até 1000 € e pagar (*par carte, en espèces*) (CEFR A1 transações; DELF A1 PO3 e CO de loja);
2. dar e entender um número de telefone (em pares até 99) (AE D1 L2; CEFR A1 "lidar com números");
3. pedir uma roupa, dizer o tamanho e a cor e experimentar (DELF A1 PO3; DA1 un. 8; D1 un. 7);
4. escolher e descrever um objeto com *ce / cette* e o adjetivo concordado (DA1 un. 8; D1 un. 7);
5. ler uma etiqueta ou um anúncio de loja (DELF A1 CE).

**(b) Conteúdo e pré-requisitos.** Aqui moram os números que servem a **preço e telefone**: *zéro* e *combien* (vindos do M1), 70 a 100
e *mille*. Cores já vieram no M2.3. *je peux essayer* e *je la prends* seguem como fórmula (COD = A2; nota de reconhecimento, `04` 0.1).

**(c) Mapa v3 do M5**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M5.1 | **Perguntar o preço e pagar** (`A1-28`) | nova | 10 | *soixante-dix, quatre-vingts, quatre-vingt-dix, cent* (movidos das roupas, v2), ***zéro, combien*** (movidos do M1.3), *mille, le prix* (v2), ***payer, en espèces*** (novos; *par carte* em frase). No v2 tinha 30 a 60 (agora no M1.4) |
| M5.2 (g) | Números de 70 a 99 (`A1-g10`) | alterada (já estava em Compras no v2) | | + exemplos de telefone em pares; recebe a nota regional *septante / nonante* (antes no módulo 1) |
| M5.3 | Comprar roupas (`A1-10`) | alterada | 10 | lista do v2 (*la chemise, le pull, les chaussures, essayer*); números saem |
| M5.4 (g) | Adjetivos e demonstrativos (`A1-g15`) | nova, **veio do módulo Casa** | | concordância e plural do adjetivo (generaliza M1.7), posição, *ce / cet / cette / ces*; *c'est / il est* saiu para M2.2 |

**(d) *Défi* "La boutique"** (`07` "La boutique de souvenirs"), **ajustado**: os objetos da vitrine são as roupas ensinadas (*le pull, la
chemise, la robe, les chaussures, le pantalon*), não *t-shirt* e *tasse*, que nenhuma unidade ensina; preços até 1000 por extenso e em
algarismo; peças: cor concordada, 1 demonstrativo; sai "*du, de la, des*" (é do M4). Núcleo DELF: ditado de 5 preços e 1 telefone.
Recicla o M5 e as cores do M2.

**(e) Som:** A1-S9 feminino que se ouve (*petit / petite, blanc / blanche*), que casa com M5.4 (g). No `06` estava na Casa.

### 2.6 A1 M6 · Na cidade (id `A1-m4`)

**(a) Consigo:**
1. perguntar e explicar o caminho com instruções (*Tournez à gauche, allez tout droit*) (CEFR A1 "instruções"; DA1 un. 8; AE D2 L2);
2. dizer aonde vou e o que vou fazer (*Je vais au musée. Je vais visiter...*) (AE D4 L2; DA1 un. 8);
3. usar o transporte: comprar passagem, perguntar o horário e o preço (CEFR A1/A2 transações; DELF A1 CO anúncio de estação);
4. dizer onde dói, pedir ajuda na farmácia e entender um conselho (*il faut, vous devez*) (AE D3 L3; VP 6-7);
5. repassar em português a informação de um aviso (CEFR CV mediação A1/A2).

**(b) Conteúdo e pré-requisitos.** O imperativo (telas do v2 na gramática de modais) agora está **dentro** do módulo, antes do *défi*.
"Corpo e saúde" fica (é serviço da cidade: farmácia, médico); perde *le médecin* para M1.6 e ganha *se reposer* (já usado na frase
*Vous devez vous reposer*).

**(c) Mapa v3 do M6**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M6.1 | Perguntar e indicar o caminho (`A1-8`) | alterada | 10 | nota *il y a* com exemplo da própria unidade (v1); no v2 abria o módulo da cidade também |
| M6.2 (g) | *aller*, futuro próximo e contraídos (`A1-g13`) | nova | | igual ao v2; a procedência de país já foi vista em M2.5 |
| M6.3 | Pegar transporte (`A1-14`) | alterada | 10 | E4 e E5 (v2) |
| M6.4 (g) | *faire* e *prendre* (`A1-g5`) | mantida | | |
| M6.5 | Dizer onde dói e pedir ajuda (`A1-15`) | alterada, **veio do módulo de viagem (v2)** | 10 | − *le médecin* (→ M1.6), + *se reposer*; E10 da farmácia passa para cá (estava na rotina e usava *pharmacie* antes da hora) |
| M6.6 (g) | Modais, *il faut* e imperativo (`A1-g6`) | alterada, **veio do módulo de viagem (v2)** | | telas do imperativo (v2) |

Saem do módulo: "De onde é e onde mora" e as preposições com países (→ M2).

**(d) *Défi* "Mon itinéraire coup de cœur"** (`07`), **ajustado**: o imperativo agora é do módulo. Núcleo: em vez de aviso de metrô,
**mediação do aviso da farmácia** (horário de abertura, E10) + 1 conselho a um amigo que passa mal (*il faut boire de l'eau, va à la
pharmacie*). A alternativa "Le quiz de mon pays" do `07` depende de M2.4 e M2.5 e pode ir para o M2 como alternativa.

**(e) Som:** A1-S6 o *r* francês (igual ao `06`).

### 2.7 A1 M7 · Casa, hotel e férias (id `A1-m5`)

**(a) Consigo:**
1. descrever a minha casa e dizer onde as coisas estão (CEFR A1 PO "descrever onde mora"; DA1 un. 5; DELF A1 tema moradia);
2. comparar duas moradias, dois hotéis ou duas cidades (*plus grand que, moins cher que*) (GP 33; AE 8.3; confiança média, decisão 9);
3. reservar um quarto, soletrar o nome e preencher a ficha do hotel (CEFR A1 produção escrita "ficha de hotel"; DELF A1 PE1; DA1 un. 1);
4. falar do tempo e das estações (AE D6 L1);
5. escrever um cartão-postal de férias de 40 palavras (DELF A1 PE2; CEFR A1 PE).

**(b) Conteúdo e pré-requisitos.** É o primeiro ponto da trilha em que a ficha completa é possível: meses (M3), números até 1000 e
telefone (M5), *rue* (M6), alfabeto (aqui). Por isso **dados pessoais e soletrar** (o "A1-23" do v2, que estava no módulo 2) vêm para cá,
inteiros, como **M7.5**. Contraídos de *à côté du lit* já vieram em M6.2. *Il fait beau* usa *faire* (M6.4). *On y va* fica como fórmula
(*y* = A2).

**(c) Mapa v3 do M7**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M7.1 | Descrever a casa (`A1-17`) | alterada | 10 | gatilho da nota do térreo (v1); nota *très / super / hyper* (`02` 15.1); ordinal *le premier étage* |
| M7.2 | Dizer onde as coisas estão (`A1-18`) | alterada | 10 | + 2 frases (v1) |
| M7.3 (g) | Comparar (`A1-g7`) | alterada | | decisão 9 (fica no A1); entrada em M2.3 e M7.1 |
| M7.4 | Férias e hotel (`A1-26`) | nova, **veio do módulo de viagem (v2)** | 10 | lista do v2 |
| M7.5 | **Dar os dados pessoais: soletrar e preencher a ficha** (`A1-23`) | nova, **veio do módulo 2 (v2)** | 10 | lista do v2 (*le prénom, le nom de famille, épeler, l'adresse, le code postal, le numéro de téléphone, le portable, le mail, la date de naissance, né / née*); alfabeto em tela de explicação + ditado de soletrar; E2 (ficha) |
| M7.6 | Falar do tempo e das estações (`A1-13`) | alterada, **veio do módulo de viagem (v2)** | 10 | |

Sai do módulo: "Cores e descrições" (→ M2.3) e a gramática de adjetivos (→ M5.4).

**(d) *Défi* novo, juntando dois do `07`: "Check-in et carte postale"** · F2 + F1 + F9. (1) Núcleo DELF A1 PE1: ficha de hotel da
Sophie Martin (personagem; data de nascimento com ano, CEP, telefone, e-mail soletrado em áudio), correção automática por campo.
(2) DELF A1 PE2: cartão-postal de 35 a 50 palavras com 5 peças: onde estou, como é o lugar onde fico (*il y a*, 1 comparação), o tempo,
o que faço ou vou fazer, despedida. É a prova escrita do DELF A1 completa, e recicla só o M7 (mais *aller* do M6).
Alternativa: "Logements étudiants de mon pays" (`07`, sem mudança: agora os preços já existem).

**(e) Som:** A1-S8 o som de *deux* x o som de *heure* (*il pleut, deux, heureux, la chaleur*). No `06` estava em viagem.

### 2.8 A1 M8 · Lazer, convites e passado (id `A1-m6`)

**(a) Consigo:**
1. falar de lazer e do que gosto de fazer (*J'adore danser*) (DA1 un. 6; DELF A1 PO1);
2. convidar, aceitar, recusar com um motivo (*parce que*) e me desculpar (D1 un. 6 D2; AE D4 L2; CPD 22, 25; CEFR "Conversa" A2, aqui na
   versão simples);
3. contar em frases simples o que fiz no fim de semana (DA1 un. 7; AE D4 L3; D1 un. 8);
4. entender um convite escrito (DELF A1 CE).

**(b) Conteúdo e pré-requisitos.** *jouer au / de la* usa os contraídos (M6.2). Passé composé com *être* pede concordância (M1.7, M5.4).
O passado fecha o A1 (decisão 0.1.2). Sem frequência (foi para M3.5) e sem *adorer* (foi para M4.1).

**(c) Mapa v3 do M8**

| Pos. | Unidade (id interno) | Status | Cartões | O que muda e por quê |
|---|---|---|---|---|
| M8.1 | Falar de lazer (`A1-19`) | mantida | 10 | *adorer* não entra mais aqui (está em M4.1) |
| M8.2 | Convidar, aceitar, recusar e se desculpar (`A1-27`) | nova | 10 | igual ao v2 |
| M8.3 | **Contar o que você fez** (`A1-20`) | alterada | 10 | *hier* fundido e *récemment* → A2 (v2); entram ***pas encore*** e ***après*** (no v2 entravam *tôt, tard*, que foram para M3.1); título novo |
| M8.4 (g) | Passé composé com *avoir* (`A1-g9`) | alterada | | só *avoir* (v2) |
| M8.5 (g) | Passé composé com *être* (`A1-g16`) | nova | | igual ao v2 |

**(d) *Défi*: trocar o principal.** O `07` propõe "Une personne qui m'inspire" (biografia), que pede *naître* (A2) e quase não usa o
léxico de lazer e convites. Proposta: **principal "Invitation et week-end"** (era a atividade final do `04` 7.4): (1) Léa convida para
sábado; o aluno recusa com *désolé(e)* + *parce que* e propõe outro dia (F4); (2) conta o fim de semana em 5 frases (3 com *avoir*,
1 com *être* concordado, 1 negação), F1. Recicla M8.1 a M8.5 inteiros. "Une personne qui m'inspire" vira alternativa, sem *naître*.

**(e) Som:** A1-S10 presente x passé composé no ouvido (igual ao `06`).

---

## 3. A2 módulo a módulo

Mesmo formato, mais curto (o A2 é todo novo: mudar posição não tem custo para aluno). "Consigo" ancorados no DELF A2 (`03` seção 3) e no
CEFR A2 (`03` 4.2 e 4.4).

### 3.1 A2 M1 · Lembranças e fases da vida (id `A2-m1`)

Consigo: (1) contar como era a minha infância e o que eu fazia (DELF A2 PO2 "uma lembrança"); (2) comparar a vida de antes e a de agora
(*avant... maintenant je ne... plus*) (AE D8 L3; DA2 un. 7); (3) contar os marcos da minha vida com datas (*il y a dix ans, je me suis
marié*) (CEFR A2 PO "condições de vida").
Achados: **"Momentos da ação"** (*venir de, être en train de, être sur le point de*) não serve a nenhuma dessas funções; DA2 un. 5 o põe em
estudos e AE D5 L2 em telefonar e anunciar novidades. Já **"ne... plus"** é a estrutura do "antes e agora": DA2 un. 7 junta imperfeito
(antes x agora) com *ne... plus / rien / personne* e *ne... que*. Troca: a negação complexa vem do M9 para cá; "momentos da ação" vai
para o M9. Comparativo: este módulo usa o do A1 (M7.3 (g)); se a dona decidir que comparativo é A2 (decisão 9), A2 M3.4 (g) tem de vir para cá.

| Pos. | Unidade (id) | Mudança |
|---|---|---|
| M1.1 | Contar como era a infância (`A2-1`) | |
| M1.2 (g) | Imperfeito (`A2-g1`) | |
| M1.3 | Comparar antes e agora (`A2-2`) | |
| M1.4 (g) | **Negação: *ne... plus, jamais, rien, personne, que*** (`A2-g23`) | **veio do M9** |
| M1.5 | Contar as fases da vida (`A2-3`) | |

Saiu: "Momentos da ação" (`A2-g2`) → M9.2. *Défi* "Le musée de mon enfance" (`07`): + peça "1 frase com *ne... plus*" e "1 marco da vida
com *il y a*". Som A2-S1 sem mudança.

### 3.2 A2 M2 · Contar uma experiência (id `A2-m2`)

Consigo: (1) contar uma viagem ou um fato em 60 a 80 palavras, com cenário (imperfeito) e ações (passé composé) (DELF A2 PE1);
(2) contar um imprevisto e a solução; (3) entender e contar uma notícia do bairro (DELF A2 CO); (4) situar no tempo e ligar as ideias
(*il y a, pendant, d'abord, ensuite, donc, alors*).
Achados: **"Passé composé a fundo"** (`A2-g4`) ensinava a concordância do particípio com COD antes do COD (que estava no M4) e o resto
(negação, pronominais no PC) repete o A1. Relato precisa de COD (*je l'ai cherchée partout*), e DA2 põe COD na un. 2. Proposta: **COD vem
para cá** com a concordância, e o `A2-g4` é **absorvido** (revisão vai para uma tela de M2.2 (g); concordância vai para M2.4 (g)).
Colisão: *le vol* (voo, M2.1) e *le vol* (roubo, M2.5) seriam dois cartões iguais no mesmo módulo; em M2.5 trocar *le vol (roubo)* por
*le portefeuille* (*On m'a volé mon portefeuille*). *donc, alors* entram em M2.6 (g) (o relato precisa; causa e consequência completas
seguem em M10.2).

| Pos. | Unidade (id) | Mudança |
|---|---|---|
| M2.1 | Contar uma viagem (`A2-4`) | |
| M2.2 (g) | Passé composé x imperfeito (`A2-g3`) | + tela de revisão do PC (absorve parte do `A2-g4`) |
| M2.3 | Contar um imprevisto (`A2-5`) | |
| M2.4 (g) | **Pronomes COD e a concordância do particípio** (`A2-g9`) | **veio do M4**; absorve a concordância do `A2-g4` |
| M2.5 | Contar um acontecimento (`A2-6`) | *le vol (roubo)* → *le portefeuille*; *récemment* (do A1, v2) |
| M2.6 (g) | Tempo, duração e conectores (`A2-g5`) | + *donc, alors* |

*Défi* "Le voyage qui a mal tourné": + peça "1 COD" e "1 fato com a polícia ou testemunha" (M2.5). Som A2-S2 sem mudança.

### 3.3 A2 M3 · Objetos e consumo (id `A2-m3`)

Consigo: (1) descrever um objeto: forma, matéria, para que serve (*ça sert à, ça permet de*) (DA2 un. 1); (2) comprar on-line e reclamar
por escrito de forma educada (DELF A2 PO3/PE); (3) comparar produtos e dizer o melhor (DA2 un. 1-2); (4) dar uma opinião simples sobre
consumo (CEFR A2 Conversa).
Achados: a reclamação escrita (alternativa do *défi* no `07`) usa *Madame, Monsieur... Cordialement*, que só vinham no M9. Mover
***cordialement*** para M3.3 (no lugar do cartão *en ligne*, que vira frase) e pôr *Madame, Monsieur* em frase. Opinião (*je trouve que, à
mon avis*) entra como fórmula com nota em M3.5; a gramática completa segue em M10.2 (entrada antes da regra, como manda a casa).

| Pos. | Unidade (id) | Mudança |
|---|---|---|
| M3.1 | Descrever um objeto (`A2-7`) | + frase com *permettre de* (`02` 14.1) |
| M3.2 (g) | Relativos *qui, que, où* (`A2-g6`) | |
| M3.3 | Comprar on-line e reclamar (`A2-8`) | *en ligne* → ***cordialement*** |
| M3.4 (g) | Comparativo e superlativo (`A2-g7`) | |
| M3.5 | Opinar sobre o consumo (`A2-9`) | + nota *je trouve que / à mon avis* |
| M3.6 (g) | Pronomes demonstrativos (`A2-g8`) | |

*Défi* "La donnerie": ok; + peça "1 superlativo (*le plus pratique*)". Som A2-S3 sem mudança.

### 3.4 A2 M4 · Saúde e bem-estar (id `A2-m4`)

Consigo: (1) marcar consulta, descrever sintomas e entender a receita (DELF A2 PO3, CO recado de consultório); (2) pedir ajuda numa
emergência; (3) dar e pedir conselho (*tu devrais, je te conseille de*) (DA2 un. 2 e 4); (4) **descrever o caráter de alguém** (DELF A2 PO2
"descreva um amigo"; DA2 un. 4 "adjetivos de caráter" junto com esporte e valores).
Achados: COD saiu para M2.4. "Descrever o caráter" não tinha unidade (achado 16): unidade nova M4.5, ao lado do esporte (como no DA2 un. 4),
o que também equilibra o módulo. Lista (12, sem repetir nenhuma palavra do A1 ou do A2): *le caractère, courageux / courageuse, patient /
patiente, drôle, curieux / curieuse, généreux / généreuse, bavard / bavarde, têtu / têtue, sociable, égoïste, paresseux / paresseuse,
ambitieux / ambitieuse* (confiança média; se a dona puser *timide* e *sympa* no A1, eles ficam fora desta lista).

| Pos. | Unidade (id) | Mudança |
|---|---|---|
| M4.1 | Na consulta (`A2-10`) | |
| M4.2 | Corpo e emergências (`A2-11`) | |
| M4.3 (g) | Pronomes COI (`A2-g10`) | depois das duas unidades (entrada antes) |
| M4.4 | Esporte e hábitos saudáveis (`A2-12`) | |
| M4.5 | **Descrever o caráter** (id novo `A2-35`) | **nova** |
| M4.6 (g) | Condicional e conselhos (`A2-g11`) | + *conseiller de, proposer de, recommander de* (`02` 14.1) |

*Défi* "Le recueil des remèdes de grand-mère": peças passam a ser 1 COI, 1 condicional, 1 *je te conseille de* (COD vira reciclagem).
Som A2-S4 sem mudança.

### 3.5 A2 M5 · À mesa (id `A2-m5`)

Consigo: (1) reservar, pedir e reclamar do prato (DELF A2 PO3); (2) explicar uma receita; (3) descrever sabores e dar opinião sobre um
prato (DA2 un. 3). Sem achado de lugar. Ajustes: *de moins en moins* em M5.6 (g) (`02` 14.1); nota de opinião em M5.1 (fórmula).
Unidades: M5.1 Reservar e pedir no restaurante (`A2-13`) · M5.2 (g) *en* (`A2-g12`) · M5.3 Explicar uma receita (`A2-14`) · M5.4 (g)
Imperativo com pronomes (`A2-g13`) · M5.5 Descrever sabores (`A2-15`) · M5.6 (g) Advérbios e progressão (`A2-g14`).
*Défi* "Le guide gourmand de ma ville": ok. Som A2-S5.

### 3.6 A2 M6 · Estudos e projetos (id `A2-m6`)

Consigo: (1) contar a minha formação (DELF A2 PO1/PO2); (2) falar dos meus projetos e desejos (*j'aimerais, j'espère que, j'ai envie de*)
(DA2 un. 5); (3) falar de como aprendo línguas e do que sei fazer (*je sais, je connais*). Ajuste: "exprimir um desejo" (lacuna do `02`
14.1) vira tela em M6.4 (g). Unidades: M6.1 Contar a formação (`A2-16`) · M6.2 (g) Futuro simples (`A2-g15`) · M6.3 Falar do aprendizado
de línguas (`A2-17`) · M6.4 (g) *quand* + futuro, *si* + presente e desejo (`A2-g16`) · M6.5 Projetos e sonhos (`A2-18`) · M6.6 (g)
*savoir* x *connaître* (`A2-g17`). *Défi* "Le CV d'un personnage de fiction": + peça "1 desejo com *j'aimerais*". Som A2-S6.

### 3.7 A2 M7 · Trabalho e dinheiro (id `A2-m7`)

Consigo: (1) falar do meu trabalho (CEFR A2 PO "trabalho atual"); (2) responder a uma oferta e passar por uma entrevista simples (DA2 un. 6);
(3) entender regras e avisos (*il est interdit de*); (4) resolver o básico no banco; (5) relatar o que alguém disse ou perguntou (DA2 un. 6).
Sem mudança de lugar. Observação: M7.4 Entender regras e avisos (`A2-21`) tem *stationner, l'amende, le panneau*, que conversam com
M8.5 Trânsito (`A2-26`: *se garer, le parking*); revisar as duas listas juntas para não ensinar dois cartões com o mesmo sentido.
*Défi* "L'entretien d'embauche": ok. Som A2-S7.

### 3.8 A2 M8 · Moradia e cidade (id `A2-m8`)

Consigo: (1) ler um classificado e pedir informações sobre um apartamento (DELF A2 CE/PO3); (2) combinar regras de convivência e reclamar
com educação; (3) resolver papelada (correio, prefeitura); (4) falar de trânsito. Sem mudança. *Défi* "La charte de la coloc": ok. Som A2-S8.

### 3.9 A2 M9 · Comunicar e se relacionar (id `A2-m9`)

Consigo: (1) telefonar e deixar recado (*Je suis en train de conduire, je te rappelle. Je viens de voir ton message.*) (DELF A2 CO
mensagens de voz; AE D5 L2); (2) escrever para convidar, aceitar, recusar, agradecer, desculpar-se (DELF A2 PE2); (3) dizer como me sinto
e reagir (*félicitations*); (4) interagir em rede social (CEFR CV interação on-line A2).
Mudanças: "momentos da ação" chega do M1 (serve ao recado e à mensagem: "acabei de", "estou fazendo", "estou quase saindo"); a negação
complexa sai para o M1; M9.3 perde *cordialement* (foi para M3.3) e ganha *je t'embrasse*; M9.5 ganha *se sentir* + adjetivo (`02` 14.1).

| Pos. | Unidade (id) | Mudança |
|---|---|---|
| M9.1 | Telefonar e deixar recado (`A2-27`) | |
| M9.2 (g) | **Momentos da ação** (`A2-g2`) | **veio do M1** |
| M9.3 | Escrever para convidar, recusar e agradecer (`A2-28`) | *cordialement* → *je t'embrasse* |
| M9.4 (g) | Pergunta formal e interrogativos (`A2-g22`) | |
| M9.5 | Sentimentos e reações (`A2-29`) | + *se sentir* + adjetivo |
| M9.6 | Internet e redes (`A2-30`) | |

Saiu: negação complexa (`A2-g23`) → M1.4. *Défi* "Invitation et réponse": + recado de voz curto com *je viens de / je suis en train de*.
Som A2-S9.

### 3.10 A2 M10 · Opinião, cultura e mundo (id `A2-m10`)

Consigo: (1) apresentar um livro ou filme e dar a minha opinião com motivos (DELF A2 PO2); (2) falar de festas e tradições; (3) concordar
e discordar sobre o meio ambiente (*il faut qu'on recycle*); (4) descrever um lugar francófono. Ajuste só de ordem: *il faut que* logo
depois do meio ambiente (é onde ele serve) e gerúndio depois da francofonia (*en voyageant, on découvre*). *il faut que* continua no fim
do A2, como manda o `02` 12.3.

| Pos. | Unidade (id) | Mudança |
|---|---|---|
| M10.1 | Apresentar um livro, filme ou exposição (`A2-31`) | |
| M10.2 (g) | Opinar e ligar ideias (`A2-g24`) | |
| M10.3 | Patrimônio e festas (`A2-32`) | |
| M10.4 | Meio ambiente (`A2-33`) | |
| M10.5 (g) | ***Il faut que* / *je veux que*** (`A2-g26`) | **subiu de posição** (era a última) |
| M10.6 | Viajar pela francofonia (`A2-34`) | |
| M10.7 (g) | Gerúndio (`A2-g25`) | **desceu** (vem depois da francofonia) |

*Défi* "Mon festival de cinéma": ok. Som A2-S10.

---

## 4. Carga e curva

**Estimativa de duração** (minha, confiança **baixa**: não medida no site): unidade de vocabulário A1 ~30 min (4 lições), gramática A1
~18 min, Ponto de verificação + som do módulo ~13 min, *défi* conforme o `07`. A2: vocabulário ~40 min (12 palavras + E4/E5), gramática ~25 min.

### 4.1 A1

| Módulo v3 | Unid. (voc. + gram.) | Cartões | Duração est. | Gramática nova (peso) | v2 equivalente (unid. / cartões) |
|---|---|---|---|---|---|
| M1 Apresentar-se | 7 (5 + 2) | 54 | ~3h35 | *être, avoir*, gênero e artigos (médio) | 5 / 45 |
| M2 Família e pessoas próximas | 6 (3 + 3) | 30 | ~3h00 | possessivos, preposições, negação e perguntas (médio) | 6 / 30 |
| M3 Rotina e calendário | 5 (3 + 2) | 37 | ~2h40 | *-er*, pronominais, frequência (médio) | 5 / 45 |
| M4 Comer e beber | 5 (4 + 1) | 41 | ~2h55 | partitivos (médio) | (não existia) |
| M5 Compras | 4 (2 + 2) | 20 | ~2h15 | 70 a 99, adjetivos e demonstrativos (alto em número) | 6 / 40 |
| M6 Na cidade | 6 (3 + 3) | 30 | ~3h05 | *aller* e futuro próximo, *faire/prendre*, modais e imperativo (**o pico**) | 6 / 30 |
| M7 Casa, hotel e férias | 6 (5 + 1) | 50 | ~3h30 | comparativo (baixo); produção escrita DELF (alto) | 5 / 30 |
| M8 Lazer, convites e passado | 5 (3 + 2) | 30 | ~2h50 | passé composé (alto) | 6 / 31 |
| **Total** | **44 (28 + 16)** | **292** | **~24h** | | 44 / 291 |

Leitura: o M1 é o mais pesado em unidades (7), mas 2 delas são de idade com palavras curtas e o M1 é exatamente a unidade 0 + 1 dos dois
métodos (AE D0, DA1 un. 0 e 1). O M5 é o mais leve em cartões, mas tem os números mais difíceis (70 a 99) e duas gramáticas. A gramática
sobe até o M6 (pico) e a produção escrita sobe no M7 e M8 (cartão-postal, ficha, relato no passado): curva crescente, sem degrau
para baixo depois do M6. Alternativa de equilíbrio (pergunta 3): passar M1.7 (g) para o início do M2 e "Descrever pessoas" para o M5.

### 4.2 A2

| Módulo v3 | Unid. (voc. + gram.) | Cartões | Duração est. | Mudança de carga |
|---|---|---|---|---|
| M1 Lembranças | 5 (3 + 2) | 36 | ~3h10 | igual em número (troca de gramática) |
| M2 Experiência | 6 (3 + 3) | 36 (+ *récemment*) | ~3h55 | COD entra, PC a fundo sai |
| M3 Objetos | 6 (3 + 3) | 36 | ~3h55 | |
| M4 Saúde | 6 (4 + 2) | 48 | ~4h10 | COD sai, caráter entra |
| M5 À mesa | 6 (3 + 3) | 36 | ~3h55 | |
| M6 Estudos | 6 (3 + 3) | 36 | ~3h55 | |
| M7 Trabalho | 6 (4 + 2) | 48 | ~4h10 | |
| M8 Moradia | 6 (4 + 2) | 48 | ~4h10 | |
| M9 Comunicar | 6 (4 + 2) | 48 | ~4h10 | troca de gramática |
| M10 Opinião | 7 (4 + 3) | 48 | ~4h35 | só ordem |
| **Total** | **60 (35 + 25)** | **421** | **~40h** | v2: 60 (34 + 26), 408 + 1 |

Razão A2 / A1 em horas de trilha ≈ 1,6 (o `04` 6.1 recomenda F = 1,4 em unidades; em horas o A2 pesa mais porque cada unidade tem E4 e E5).
Curva: M1 do A2 mais leve (entrada no nível), M10 o mais pesado (fecho, com o subjuntivo em fórmula). Ok.

---

## 5. Coerência com as decisões já tomadas

| Decisão | Situação no v3 |
|---|---|
| COD, COI, *y*, *en* = A2 (0.1.1) | ok: COD em A2 M2.4, COI em A2 M4.3, *en* em A2 M5.2, *y* em A2 M8.3. No A1 só fórmula com nota (*je la prends*, *on y va*) |
| A1 só com *futur proche*; passé composé fecha o A1 (0.1.2) | ok: *futur proche* em A1 M6.2 (g); PC em A1 M8.4 e M8.5, último módulo |
| Futuro simples, imperfeito, condicional, relativos = A2 (decisão 1) | ok: A2 M6.2, M1.2, M4.6, M3.2 |
| Subjuntivo só em fórmula, no fim do A2 (`02` 12.3) | ok: A2 M10.5 (g) |
| Comparativo no A1 (decisão 9, aberta) | A1 M7.3 (g); dependência: A2 M1 usa o comparativo do A1 |
| Português do Brasil sem IPA (`06` 5.4) | ok: sons nomeados por palavra (*o som de tu*), sem símbolo |
| Ficha com personagem fictício (decisão 22) | ok: *défi* do A1 M7 usa Sophie Martin |
| Unidade nova nasce aberta, não concluída (2.10) | vale para toda unidade que muda de lugar (seção 8) |
| Conjuntos fechados com mais de 10 palavras (decisão 11) | muda: A1 M1.3 (14), M3.1 (12), M3.3 (11), M3.4 (14), M4.1 (11). M1.4 passa a 10 (era 13) |
| Acréscimos pequenos do DA1 (0.1.5) | colocados: *on* (A1 M3.2), ordinais (*le premier*: M3.4; *premier étage*: M7.1), *moi aussi / moi non plus* (M1.5 e M4.1), *très / super / hyper* (M7.1), instruções de aula (M1.1) |
| Acréscimos do DA2 (0.1.5) | colocados: desejo (A2 M6.4), *permettre de* (M3.1), conselhos (M4.6), *se sentir* (M9.5), *de moins en moins* (M5.6) |

---

## 6. (a) Mapa v3 consolidado

### 6.1 A1

| Pos. | Unidade (função) | Id interno | Cartões |
|---|---|---|---|
| **M1 · Apresentar-se** | | `A1-m1` | |
| M1.1 | Cumprimentar e se despedir | `A1-1` | 10 |
| M1.2 | Dizer o nome e a nacionalidade | `A1-2` | 10 |
| M1.3 | Dizer a idade: de 1 a 29 | `A1-3` | 14 |
| M1.4 | Perguntar a idade dos outros: até 69 | `A1-21` | 10 |
| M1.5 (g) | *être* e *avoir*, pronomes tônicos | `A1-g1` | |
| M1.6 | Dizer a profissão | `A1-22` | 10 |
| M1.7 (g) | Masculino e feminino, artigos e plural | `A1-g11` | |
| | *Défi*: Bienvenue au club ! | | |
| **M2 · Família e pessoas próximas** | | `A1-m7` | |
| M2.1 | Apresentar a família | `A1-4` | 10 |
| M2.2 (g) | Possessivos e apresentar alguém (*c'est / il est*) | `A1-g2` | |
| M2.3 | Descrever pessoas: cores e aparência | `A1-16` | 10 |
| M2.4 | Dizer de onde é e onde mora | `A1-9` | 10 |
| M2.5 (g) | Preposições com cidades e países | `A1-g4` | |
| M2.6 (g) | Frase negativa e perguntas | `A1-g12` | |
| | *Défi*: Devinez la famille ! | | |
| **M3 · Rotina e calendário** | | `A1-m2` | |
| M3.1 | Dizer as horas e a rotina | `A1-6` | 12 |
| M3.2 (g) | Verbos em *-er*, pronominais e *on* | `A1-g3` | |
| M3.3 | Dizer o dia e combinar | `A1-7` | 11 |
| M3.4 | Dizer a data e o aniversário | `A1-24` | 14 |
| M3.5 (g) | Com que frequência | `A1-g8` | |
| | *Défi*: Le calendrier des jours préférés | | |
| **M4 · Comer e beber** | | `A1-m3` | |
| M4.1 | Gostos e pedidos no café | `A1-5` | 11 |
| M4.2 | Fazer a lista do mercado | `A1-11` | 10 |
| M4.3 | Pedir quantidades na feira | `A1-12` | 10 |
| M4.4 | Pedir no restaurante | `A1-25` | 10 |
| M4.5 (g) | Partitivos e quantidade | `A1-g14` | |
| | *Défi*: Le panier et le café | | |
| **M5 · Compras** | | `A1-m8` | |
| M5.1 | Perguntar o preço e pagar | `A1-28` | 10 |
| M5.2 (g) | Números de 70 a 99 | `A1-g10` | |
| M5.3 | Comprar roupas | `A1-10` | 10 |
| M5.4 (g) | Adjetivos e demonstrativos | `A1-g15` | |
| | *Défi*: La boutique | | |
| **M6 · Na cidade** | | `A1-m4` | |
| M6.1 | Perguntar e indicar o caminho | `A1-8` | 10 |
| M6.2 (g) | *aller*, futuro próximo e contraídos | `A1-g13` | |
| M6.3 | Pegar transporte | `A1-14` | 10 |
| M6.4 (g) | *faire* e *prendre* | `A1-g5` | |
| M6.5 | Dizer onde dói e pedir ajuda | `A1-15` | 10 |
| M6.6 (g) | Modais, *il faut* e imperativo | `A1-g6` | |
| | *Défi*: Mon itinéraire coup de cœur | | |
| **M7 · Casa, hotel e férias** | | `A1-m5` | |
| M7.1 | Descrever a casa | `A1-17` | 10 |
| M7.2 | Dizer onde as coisas estão | `A1-18` | 10 |
| M7.3 (g) | Comparar | `A1-g7` | |
| M7.4 | Férias e hotel | `A1-26` | 10 |
| M7.5 | Dar os dados pessoais: soletrar e preencher a ficha | `A1-23` | 10 |
| M7.6 | Falar do tempo e das estações | `A1-13` | 10 |
| | *Défi*: Check-in et carte postale | | |
| **M8 · Lazer, convites e passado** | | `A1-m6` | |
| M8.1 | Falar de lazer | `A1-19` | 10 |
| M8.2 | Convidar, aceitar, recusar e se desculpar | `A1-27` | 10 |
| M8.3 | Contar o que você fez | `A1-20` | 10 |
| M8.4 (g) | Passé composé com *avoir* | `A1-g9` | |
| M8.5 (g) | Passé composé com *être* | `A1-g16` | |
| | *Défi*: Invitation et week-end | | |
| **Teste de Nível A1** | 5 itens × 8 módulos + simulado DELF (E9) | `A1-final` | |

### 6.2 A2

| Pos. | Unidade (função) | Id interno |
|---|---|---|
| **M1 · Lembranças e fases da vida** | | `A2-m1` |
| M1.1 | Contar como era a infância | `A2-1` |
| M1.2 (g) | Imperfeito | `A2-g1` |
| M1.3 | Comparar antes e agora | `A2-2` |
| M1.4 (g) | Negação: *ne... plus, jamais, rien, personne, que* | `A2-g23` |
| M1.5 | Contar as fases da vida | `A2-3` |
| **M2 · Contar uma experiência** | | `A2-m2` |
| M2.1 | Contar uma viagem | `A2-4` |
| M2.2 (g) | Passé composé x imperfeito (+ revisão do PC) | `A2-g3` |
| M2.3 | Contar um imprevisto | `A2-5` |
| M2.4 (g) | Pronomes COD e a concordância do particípio | `A2-g9` |
| M2.5 | Contar um acontecimento | `A2-6` |
| M2.6 (g) | Tempo, duração e conectores | `A2-g5` |
| **M3 · Objetos e consumo** | | `A2-m3` |
| M3.1 | Descrever um objeto | `A2-7` |
| M3.2 (g) | Relativos *qui, que, où* | `A2-g6` |
| M3.3 | Comprar on-line e reclamar | `A2-8` |
| M3.4 (g) | Comparativo e superlativo | `A2-g7` |
| M3.5 | Opinar sobre o consumo | `A2-9` |
| M3.6 (g) | Pronomes demonstrativos | `A2-g8` |
| **M4 · Saúde e bem-estar** | | `A2-m4` |
| M4.1 | Na consulta | `A2-10` |
| M4.2 | Corpo e emergências | `A2-11` |
| M4.3 (g) | Pronomes COI | `A2-g10` |
| M4.4 | Esporte e hábitos saudáveis | `A2-12` |
| M4.5 | Descrever o caráter | `A2-35` (novo) |
| M4.6 (g) | Condicional e conselhos | `A2-g11` |
| **M5 · À mesa** | | `A2-m5` |
| M5.1 | Reservar e pedir no restaurante | `A2-13` |
| M5.2 (g) | Pronome *en* | `A2-g12` |
| M5.3 | Explicar uma receita | `A2-14` |
| M5.4 (g) | Imperativo com pronomes | `A2-g13` |
| M5.5 | Descrever sabores | `A2-15` |
| M5.6 (g) | Advérbios e progressão | `A2-g14` |
| **M6 · Estudos e projetos** | | `A2-m6` |
| M6.1 | Contar a formação | `A2-16` |
| M6.2 (g) | Futuro simples | `A2-g15` |
| M6.3 | Falar do aprendizado de línguas | `A2-17` |
| M6.4 (g) | *quand* + futuro, *si* + presente e desejo | `A2-g16` |
| M6.5 | Projetos e sonhos | `A2-18` |
| M6.6 (g) | *savoir* x *connaître* e verbos com *à / de* | `A2-g17` |
| **M7 · Trabalho e dinheiro** | | `A2-m7` |
| M7.1 | Falar do trabalho | `A2-19` |
| M7.2 | Procurar emprego | `A2-20` |
| M7.3 (g) | Obrigação, proibição, permissão | `A2-g18` |
| M7.4 | Entender regras e avisos | `A2-21` |
| M7.5 | Resolver no banco | `A2-22` |
| M7.6 (g) | Discurso indireto no presente | `A2-g19` |
| **M8 · Moradia e cidade** | | `A2-m8` |
| M8.1 | Procurar moradia | `A2-23` |
| M8.2 | Dividir apartamento e vizinhos | `A2-24` |
| M8.3 (g) | Pronome *y* | `A2-g20` |
| M8.4 | Serviços e papelada | `A2-25` |
| M8.5 | Trânsito e carro | `A2-26` |
| M8.6 (g) | Indefinidos | `A2-g21` |
| **M9 · Comunicar e se relacionar** | | `A2-m9` |
| M9.1 | Telefonar e deixar recado | `A2-27` |
| M9.2 (g) | Momentos da ação | `A2-g2` |
| M9.3 | Escrever para convidar, recusar e agradecer | `A2-28` |
| M9.4 (g) | Pergunta formal e interrogativos | `A2-g22` |
| M9.5 | Sentimentos e reações | `A2-29` |
| M9.6 | Internet e redes | `A2-30` |
| **M10 · Opinião, cultura e mundo** | | `A2-m10` |
| M10.1 | Apresentar um livro, filme ou exposição | `A2-31` |
| M10.2 (g) | Opinar e ligar ideias | `A2-g24` |
| M10.3 | Patrimônio e festas | `A2-32` |
| M10.4 | Meio ambiente | `A2-33` |
| M10.5 (g) | *Il faut que / je veux que* (fórmula) | `A2-g26` |
| M10.6 | Viajar pela francofonia | `A2-34` |
| M10.7 (g) | Gerúndio | `A2-g25` |

---

## 7. (b) Todas as mudanças em relação ao 04 (v2)

"Existente" = unidade ou palavra que já está no site hoje. Posição antiga = posição no mapa do v2.

### 7.1 A1: unidades que mudam de módulo ou de posição

| # | Unidade | v2 | v3 | Existente? |
|---|---|---|---|---|
| 1 | Dizer a profissão (`A1-22`) | módulo 2, 4ª | **M1.6** | não (nova) |
| 2 | Masculino e feminino, artigos e plural (`A1-g11`) | módulo 2, 2ª | **M1.7 (g)** | não |
| 3 | Descrever pessoas: cores e aparência (`A1-16`) | módulo 7, 1ª | **M2.3** | **sim** |
| 4 | Dizer de onde é e onde mora (`A1-9`) | módulo 4, 3ª | **M2.4** | **sim** |
| 5 | Preposições com cidades e países (`A1-g4`) | módulo 4, 4ª | **M2.5 (g)** | **sim** |
| 6 | Frase negativa e perguntas (`A1-g12`) | módulo 2, 6ª | M2.6 (g) | não |
| 7 | Com que frequência (`A1-g8`) | módulo 8, 2ª | **M3.5 (g)** | **sim** |
| 8 | Gostos e pedidos no café (`A1-5`) | módulo 3, 1ª | **M4.1** | **sim** |
| 9 | Fazer a lista do mercado (`A1-11`) | módulo 5, 4ª | **M4.2** | **sim** |
| 10 | Pedir quantidades na feira (`A1-12`) | módulo 5, 5ª | **M4.3** | **sim** |
| 11 | Pedir no restaurante (`A1-25`) | módulo 6, 1ª | **M4.4** | não |
| 12 | Partitivos e quantidade (`A1-g14`) | módulo 5, 6ª | **M4.5 (g)** | não |
| 13 | Adjetivos e demonstrativos (`A1-g15`) | módulo 7, 2ª | **M5.4 (g)** | não |
| 14 | Perguntar e indicar o caminho (`A1-8`) | módulo 4, 1ª | M6.1 (módulo da cidade passa a ser o 6º) | **sim** |
| 15 | *aller*, futuro próximo e contraídos (`A1-g13`) | módulo 4, 2ª | M6.2 (g) | não |
| 16 | Pegar transporte (`A1-14`) e *faire / prendre* (`A1-g5`) | módulo 4, 5ª e 6ª | M6.3 e M6.4 (g) | **sim** |
| 17 | Dizer onde dói (`A1-15`) e Modais/imperativo (`A1-g6`) | módulo 6, 4ª e 5ª | **M6.5 e M6.6 (g)** | **sim** |
| 18 | Descrever a casa (`A1-17`), Onde as coisas estão (`A1-18`), Comparar (`A1-g7`) | módulo 7, 3ª a 5ª | M7.1 a M7.3 | **sim** |
| 19 | Férias e hotel (`A1-26`) | módulo 6, 3ª | **M7.4** | não |
| 20 | Dados pessoais: soletrar e ficha (`A1-23`) | módulo 2, 5ª | **M7.5** | não |
| 21 | Falar do tempo (`A1-13`) | módulo 6, 2ª | **M7.6** | **sim** |
| 22 | Convites (`A1-27`) | módulo 8, 3ª | M8.2 | não |

Ordem dos módulos: v2 = Primeiros contatos, Quem é você, Rotina e calendário, Na cidade, Compras, Viagem/tempo/saúde, Casa e descrição,
Lazer. v3 = Apresentar-se, Família e pessoas próximas, Rotina e calendário, **Comer e beber (novo)**, Compras, Na cidade, **Casa, hotel e
férias**, Lazer. O módulo "Viagem, tempo e saúde" do v2 **deixa de existir** (suas unidades foram para M4, M6 e M7).

### 7.2 A1: ids de módulo (rótulo interno)

| Módulo v3 | Id | v2 usava esse id para | Publicado hoje como |
|---|---|---|---|
| M1 Apresentar-se | `A1-m1` | Primeiros contatos | Primeiros contatos |
| M2 Família e pessoas próximas | `A1-m7` | Quem é você | (não publicado) |
| M3 Rotina e calendário | `A1-m2` | Rotina e calendário | Rotina do dia a dia |
| M4 Comer e beber | `A1-m3` | Na cidade | Cidade e identidade |
| M5 Compras | `A1-m8` | Compras | (não publicado) |
| M6 Na cidade | `A1-m4` | Viagem, tempo e saúde | Deslocando-se e cuidando de si |
| M7 Casa, hotel e férias | `A1-m5` | Casa e descrição | Descrevendo o mundo ao redor |
| M8 Lazer, convites e passado | `A1-m6` | Lazer, convites e passado | Lazer e o passado |

Critério: cada id ficou com o módulo v3 que tem **mais unidades existentes** do módulo publicado com esse id. Assim o "Ponto de
verificação aprovado" que o aluno já tem cai num módulo cujas unidades ele de fato fez (seção 8).

### 7.3 A1: palavras e frases (precisam da Etapa 0)

| # | Operação | v2 dizia | v3 |
|---|---|---|---|
| 1 | *vingt, l'âge, avoir, ans* + frases e diálogo de idade | mover do `A1-3` para o `A1-21` | **ficam** no M1.3 (`A1-3`) |
| 2 | *zéro, combien* | ficavam no `A1-3` | **mover** para M5.1 (`A1-28`) |
| 3 | *quatre... neuf* | inserir no `A1-3` | igual |
| 4 | *trente, quarante, cinquante, soixante* (hoje no `A1-10`) | mover para o `A1-28` | **mover para M1.4** (`A1-21`) |
| 5 | *soixante-dix, quatre-vingts, quatre-vingt-dix, cent* | mover para o `A1-28` | igual |
| 6 | *dix-sept, dix-huit, dix-neuf* | novos cartões no `A1-21` | **não criar** (regra + frases + ditado) |
| 7 | *l'euro*... (não havia) / *payer, en espèces* | `A1-28` = 8 números + *mille, le prix* | `A1-28` = 4 números + *zéro, combien, mille, le prix, payer, en espèces* |
| 8 | *le médecin* (hoje em "Corpo e saúde") | fica | **mover** para M1.6; "Corpo e saúde" ganha *se reposer* |
| 9 | Lista de "Profissões" | com *l'entreprise* | sem *l'entreprise*, com *le médecin* |
| 10 | *tôt, tard* | novos no passado (`A1-20`) | novos na rotina (M3.1) |
| 11 | *pas encore, après* | (não havia) | novos em M8.3 (no lugar de *tôt, tard*) |
| 12 | *adorer* | novo no lazer (`A1-19`) | novo em M4.1 (`A1-5`) |
| 13 | Fusões *français, brésilien, manger, hier*; *récemment* → A2; frase R4 | | iguais ao v2 |
| 14 | Frases novas | | 3 de frequência (M3.1, M3.3); línguas faladas (M2.4); *Pardon ? Vous pouvez répéter ?* (M1.1); idade de terceiros e diálogo novo (M1.4); *C'est mon père, il est...* (M2.1) |
| 15 | Notas | regional *septante* no `A1-21` | regional *septante / nonante* em M5.2 (g); regra 21 a 29 em M1.3; 17 a 19 e dezenas em M1.4; *le premier* em M3.4 |

### 7.4 A1: gramática (telas)

M1.5 (g) + tônicos (v2) · M1.7 (g) + feminino de profissões e nacionalidades (**novo**) · M2.2 (g) + *c'est / il est* (**movido** da
gramática de adjetivos) · M2.5 (g) + procedência *de / du / des* (**novo**) · M3.2 (g) + *on* (**novo**) e letras mudas (v2) ·
M5.4 (g) sem *c'est / il est* · M6.6 (g) + imperativo (v2, agora no módulo certo).

### 7.5 A1: renomeações (título visível muda: `DELIBERATE_PT_CHANGES` e camada em inglês)

Existentes: `A1-3` "Números e idade" → **Dizer a idade: de 1 a 29** · `A1-9` "Nacionalidades" → **Dizer de onde é e onde mora** ·
`A1-16` "Cores e descrições" → **Descrever pessoas: cores e aparência** · `A1-20` "Expressões de tempo passado" → **Contar o que você
fez** · `A1-10` "Compras" → **Comprar roupas** (v2 já mudava) · módulos `A1-m3` → **Comer e beber**, `A1-m4` → **Na cidade**,
`A1-m5` → **Casa, hotel e férias**. Novas: todas com nome funcional (seção 6.1). Os outros títulos podem ficar como estão.

### 7.6 A1: *défis* e sons (mudanças em relação ao `07` e ao `06`)

*Défis*: M1 ajustado (profissão, nacionalidade concordada, idade até 69) · M2 sem ficha, com troca de informações · M3 sem refeições,
*parce que* e *j'adore* · **M4 novo** ("Le panier et le café") · M5 só roupas ensinadas, sem partitivos · M6 com mediação da farmácia ·
**M7 novo** ("Check-in et carte postale", junta ficha e postal) · M8 principal trocado ("Invitation et week-end").
Exemplos do `04` seção 9: E6 e E7 corrigidos (achados 13 e 14); E10 passa da rotina para M6.5.
Sons: nasais (A1-S7) passam para M4; feminino que se ouve (A1-S9) para M5; som de *deux* x *heure* (A1-S8) para M7; os outros iguais.

### 7.7 A2

| # | Mudança | Tipo |
|---|---|---|
| 1 | Momentos da ação (`A2-g2`): M1 → **M9.2 (g)** | movimento |
| 2 | Negação complexa (`A2-g23`): M9 → **M1.4 (g)** | movimento |
| 3 | COD (`A2-g9`): M4 → **M2.4 (g)**, com a concordância do particípio | movimento + conteúdo |
| 4 | "Passé composé a fundo" (`A2-g4`): **removida** (revisão → tela em M2.2 (g); concordância → M2.4 (g)). O id `A2-g4` fica sem uso e nunca é reaproveitado | fusão/remoção |
| 5 | **Descrever o caráter** (id novo `A2-35`, 12 cartões): **M4.5** | nova |
| 6 | COI (`A2-g10`) sobe para M4.3 (depois das duas unidades de saúde) | ordem |
| 7 | *Il faut que* (`A2-g26`) → M10.5; gerúndio (`A2-g25`) → M10.7 | ordem |
| 8 | M2.5: *le vol (roubo)* → *le portefeuille* | palavra |
| 9 | *cordialement*: M9.3 → M3.3 (no lugar do cartão *en ligne*); M9.3 ganha *je t'embrasse* | palavra |
| 10 | Telas: revisão do PC (M2.2), *donc / alors* (M2.6), desejo (M6.4), conselhos (M4.6), *de moins en moins* (M5.6) | conteúdo |
| 11 | Frases e notas: *permettre de* (M3.1), opinião em fórmula (M3.5, M5.1), *se sentir* (M9.5) | conteúdo |
| 12 | Títulos funcionais em todas as unidades (seção 6.2) | renomeação (nada publicado) |
| 13 | *Défis*: M1, M2, M3, M4, M6, M9 com peças ajustadas (seção 3) | *défi* |

Totais: A2 continua com 60 unidades (35 de vocabulário + 25 de gramática, antes 34 + 26) e passa a 421 cartões (antes 408 + 1).

---

## 8. (c) Riscos para o progresso dos alunos

**O que é seguro por construção.** Com a Etapa 0 (`04` seção 2), o id do cartão vem da chave do item; mudar unidade de módulo não muda
nem a chave nem o id da unidade. Todo o A2 é novo (risco zero para progresso). Unidades novas do A1 nunca foram publicadas.
Ainda assim, cada movimento de unidade **existente** mexe em quatro coisas fora do cartão:

| Risco | Onde aparece | Mitigação |
|---|---|---|
| Ponto de verificação herdado "errado" | o aprovado é guardado por id de módulo | ids escolhidos por sobreposição (7.2). Conferido: quem aprovou o antigo `A1-m3` fez o café, o mercado e a feira (que estão no novo `A1-m3`); quem aprovou o antigo `A1-m4` fez transporte, *faire/prendre*, saúde e modais (novo `A1-m4`); quem aprovou o antigo `A1-m5` fez casa, móveis e comparativo (novo `A1-m5`). Sobram 2 casos: o novo `A1-m7` (M2) e o `A1-m8` (M5) nunca foram aprovados por ninguém. Regra proposta: módulo sem aprovação herdada **não bloqueia** quem já tem unidades abertas depois dele (regra 2.10) |
| Unidade aparece "nova" atrás de onde o aluno está | movimentos para trás: `A1-16` (do 5º para o 2º), `A1-9`/`A1-g4` (do 3º para o 2º), `A1-g8` (do 6º para o 3º), `A1-13` (fica mais à frente), `A1-5` (do 2º para o 4º) | regra 2.10: nasce aberta, não concluída; as já concluídas continuam concluídas onde quer que estejam |
| Desafios com `moduleId` antigo | Desafios publicados das unidades que mudam de módulo: `A1-4` (→ M2), `A1-5` (→ M4), `A1-8` (→ M6), `A1-9` (→ M2), `A1-10` (→ M5), `A1-13` (→ M7), `A1-16` (→ M2). Pelo `01` 2.2: ~14 Ouça e traduza + ~12 Acentuação + ~10 Expressões ≈ **36 linhas** (o v2 mexia em ~25) | atualizar no Staging antes, produção só com autorização (decisão 21); conferir o número exato pelo checklist |
| Ditados por módulo | d1 a d6 foram escritos com o vocabulário dos módulos antigos; o antigo m3 (cidade + compras) se divide entre M2, M4, M5 e M6 | re-hospedar cada ditado no módulo v3 de que ele mais usa palavras, rodar `check_dictation_vocab.py`, escrever os que faltam (M2, M4, M5, M7) |
| Palavras que mudam de unidade | *zéro, combien* (`A1-3` → `A1-28`, vai para **mais tarde**), *trente... soixante* (`A1-10` → `A1-21`, vai para **mais cedo**), *le médecin* (`A1-15` → `A1-22`, mais cedo) | marca `released` da Etapa 0: cartão já liberado continua na revisão; quem ainda não viu a unidade nova vê os cartões quando fizer a lição |
| Fusões | *manger* (agora o sobrevivente fica em M4.1, depois de M3.1, que usa a palavra em frase) | regra de fusão do v2 (revisão mais recente vence); só a posição pedagógica mudou |
| Percentual e "Módulo N" exibido | todos os alunos veem números de módulo diferentes | aviso no Mural (decisão 10) |

**Movimentos que mexem em unidades já existentes (lista completa):** `A1-4`, `A1-g2`, `A1-5`, `A1-8`, `A1-9`, `A1-g4`, `A1-10`, `A1-g10`,
`A1-11`, `A1-12`, `A1-13`, `A1-14`, `A1-g5`, `A1-15`, `A1-g6`, `A1-16`, `A1-17`, `A1-18`, `A1-g7`, `A1-g8`, `A1-19`, `A1-20`, `A1-g9`
(mudança de módulo ou de posição) e as palavras da 7.3 (linhas 2, 4, 5, 8). Nenhum exclui cartão; nenhum muda id.
**Ordem de execução:** junto com a Etapa 2 do `04` (reorganização do A1), nunca antes da Etapa 0. A recomposição de módulos sozinha não
muda id de cartão, mas mexe em Desafios, ditados e Ponto de verificação: não vale fazer em separado.
**Documentos que ficam desatualizados quando a dona aprovar:** `04` seções 3, 4.3, 5, 11; `06` 5.3; `07` 4.1 e 4.3 (este 08 não os edita).

---

## 9. (d) Perguntas para a dona

1. **Aprovar o mapa v3 do A1** (8 módulos por função, seção 6.1)? *Recomendo sim.*
2. **Idade no M1** como função: M1.3 "Dizer a idade: de 1 a 29" (14 cartões, *vingt, l'âge, avoir, ans* e o diálogo ficam) e M1.4
   "Perguntar a idade dos outros: até 69" (10 cartões, dezenas 30 a 60 movidas das roupas); *zéro* e *combien* vão para Compras;
   17 a 19 sem cartão. *Recomendo sim.* Alternativa: manter 17 a 19 como cartões (M1.4 com 13).
3. **M1 com 7 unidades** (o mais longo, ~3h35) ou equilibrar passando a gramática de gênero (M1.7) para o começo do M2 e "Descrever
   pessoas" para Compras? *Recomendo 7*: o gênero chega antes do *défi* que cobra *je suis brésilienne / infirmière*, e o M1 fica igual
   à abertura dos dois métodos.
4. **Dados pessoais e soletrar no M7** (ficha de hotel), e não no M2? *Recomendo sim*: é o primeiro ponto em que meses, números até 1000,
   telefone e *rue* já foram ensinados.
5. **Módulo novo "Comer e beber" (M4)** juntando café, mercado, feira e restaurante, e o módulo "Viagem, tempo e saúde" do v2 desfeito?
   *Recomendo sim.*
6. **Caráter no A1:** acrescentar *sympa* e *timide* em M2.3 (fica com 12)? *Recomendo sim* (AE 3.2 e DA1 un. 3 e 6 trazem no A1);
   o resto vai para A2 M4.5.
7. ***le médecin*** de "Corpo e saúde" para "Dizer a profissão" (M1.6), com *se reposer* entrando no lugar? *Recomendo sim.*
8. ***tôt, tard*** na rotina (M3.1) e ***pas encore, après*** em "Contar o que você fez" (M8.3)? *Recomendo sim.*
9. ***adorer*** em "Gostos e pedidos no café" (M4.1), e não no lazer? *Recomendo sim.*
10. **Ids de módulo por sobreposição** (7.2) e regra "módulo sem aprovação herdada não bloqueia"? *Recomendo sim.*
11. **Títulos novos** das 4 unidades existentes renomeadas e dos 3 módulos (7.5), com mudança registrada no `DELIBERATE_PT_CHANGES`?
    *Recomendo sim.*
12. **Défis do A1**: trocar o principal do M8 para "Invitation et week-end" e criar os de M4 ("Le panier et le café") e M7 ("Check-in et
    carte postale")? *Recomendo sim.*
13. **A2: COD no M2** (com a concordância) e remoção do "Passé composé a fundo"? *Recomendo sim* (DA2 un. 2; o relato precisa).
14. **A2: trocar "momentos da ação" (para M9) e negação complexa (para M1)?** *Recomendo sim* (DA2 un. 7 junta antes/agora e *ne... plus*).
15. **A2: unidade nova "Descrever o caráter" em M4.5?** *Recomendo sim* (DELF A2 PO2 "descreva um amigo").
16. **A2: *il faut que* continua no fim (M10.5)** ou vai para a saúde (conselho médico)? *Recomendo o fim*, como no `02` 12.3.
17. **Comparativo (decisão 9)**: confirmar no A1. Se for A2, a gramática A2 M3.4 tem de ir para o A2 M1. *Recomendo A1.*
18. **Sons**: aceitar o novo encaixe do `06` (nasais no M4, feminino que se ouve no M5, *deux* x *heure* no M7)? *Recomendo sim.*

---

## 10. Tabela de correspondência posição ↔ id interno

Lembrete: o id interno é só a chave fixa do progresso; a ordem é dada pela posição.

**A1**

| Posição | Id | Posição | Id | Posição | Id | Posição | Id |
|---|---|---|---|---|---|---|---|
| M1 | `A1-m1` | M3 | `A1-m2` | M5 | `A1-m8` | M7 | `A1-m5` |
| M1.1 | `A1-1` | M3.1 | `A1-6` | M5.1 | `A1-28` | M7.1 | `A1-17` |
| M1.2 | `A1-2` | M3.2 (g) | `A1-g3` | M5.2 (g) | `A1-g10` | M7.2 | `A1-18` |
| M1.3 | `A1-3` | M3.3 | `A1-7` | M5.3 | `A1-10` | M7.3 (g) | `A1-g7` |
| M1.4 | `A1-21` | M3.4 | `A1-24` | M5.4 (g) | `A1-g15` | M7.4 | `A1-26` |
| M1.5 (g) | `A1-g1` | M3.5 (g) | `A1-g8` | M6 | `A1-m4` | M7.5 | `A1-23` |
| M1.6 | `A1-22` | M4 | `A1-m3` | M6.1 | `A1-8` | M7.6 | `A1-13` |
| M1.7 (g) | `A1-g11` | M4.1 | `A1-5` | M6.2 (g) | `A1-g13` | M8 | `A1-m6` |
| M2 | `A1-m7` | M4.2 | `A1-11` | M6.3 | `A1-14` | M8.1 | `A1-19` |
| M2.1 | `A1-4` | M4.3 | `A1-12` | M6.4 (g) | `A1-g5` | M8.2 | `A1-27` |
| M2.2 (g) | `A1-g2` | M4.4 | `A1-25` | M6.5 | `A1-15` | M8.3 | `A1-20` |
| M2.3 | `A1-16` | M4.5 (g) | `A1-g14` | M6.6 (g) | `A1-g6` | M8.4 (g) | `A1-g9` |
| M2.4 | `A1-9` | | | | | M8.5 (g) | `A1-g16` |
| M2.5 (g) | `A1-g4` | | | | | | |
| M2.6 (g) | `A1-g12` | | | | | | |

**A2**

| Posição | Id | Posição | Id | Posição | Id | Posição | Id |
|---|---|---|---|---|---|---|---|
| M1.1 | `A2-1` | M3.4 (g) | `A2-g7` | M6.1 | `A2-16` | M8.4 | `A2-25` |
| M1.2 (g) | `A2-g1` | M3.5 | `A2-9` | M6.2 (g) | `A2-g15` | M8.5 | `A2-26` |
| M1.3 | `A2-2` | M3.6 (g) | `A2-g8` | M6.3 | `A2-17` | M8.6 (g) | `A2-g21` |
| M1.4 (g) | `A2-g23` | M4.1 | `A2-10` | M6.4 (g) | `A2-g16` | M9.1 | `A2-27` |
| M1.5 | `A2-3` | M4.2 | `A2-11` | M6.5 | `A2-18` | M9.2 (g) | `A2-g2` |
| M2.1 | `A2-4` | M4.3 (g) | `A2-g10` | M6.6 (g) | `A2-g17` | M9.3 | `A2-28` |
| M2.2 (g) | `A2-g3` | M4.4 | `A2-12` | M7.1 | `A2-19` | M9.4 (g) | `A2-g22` |
| M2.3 | `A2-5` | M4.5 | `A2-35` | M7.2 | `A2-20` | M9.5 | `A2-29` |
| M2.4 (g) | `A2-g9` | M4.6 (g) | `A2-g11` | M7.3 (g) | `A2-g18` | M9.6 | `A2-30` |
| M2.5 | `A2-6` | M5.1 | `A2-13` | M7.4 | `A2-21` | M10.1 | `A2-31` |
| M2.6 (g) | `A2-g5` | M5.2 (g) | `A2-g12` | M7.5 | `A2-22` | M10.2 (g) | `A2-g24` |
| M3.1 | `A2-7` | M5.3 | `A2-14` | M7.6 (g) | `A2-g19` | M10.3 | `A2-32` |
| M3.2 (g) | `A2-g6` | M5.4 (g) | `A2-g13` | M8.1 | `A2-23` | M10.4 | `A2-33` |
| M3.3 | `A2-8` | M5.5 | `A2-15` | M8.2 | `A2-24` | M10.5 (g) | `A2-g26` |
| | | M5.6 (g) | `A2-g14` | M8.3 (g) | `A2-g20` | M10.6 | `A2-34` |
| | | | | | | M10.7 (g) | `A2-g25` |

Módulos do A2: M1 a M10 = `A2-m1` a `A2-m10`, na mesma ordem. Id `A2-g4`: aposentado sem uso.

---

## Resumo

- O v2 punha unidades "onde cabiam" e tratava números como sistema de contagem. O v3 organiza por **função**: cada módulo diz o que o
  aluno consegue fazer, e números, gramática e som entram quando a função pede.
- **A1 M1 Apresentar-se** agora tem nome, nacionalidade, **idade de 1 a 69** (M1.3 e M1.4, ambas de idade; *vingt, l'âge, avoir, ans* e o
  diálogo ficam no M1.3), **profissão** (M1.6) e a regra de gênero com a flexão das profissões (M1.7 (g)). *zéro, combien*, 70 a 100 e
  *mille* vão para Compras (preço e telefone).
- Outras correções de pré-requisito: ficha e soletrar vão para o M7 (hotel); nacionalidades e origem para o M2; cores antes das roupas;
  imperativo dentro do módulo da cidade; frequência na rotina; comida num módulo só (M4).
- A1 v3: 8 módulos, 44 unidades, 292 cartões, ~24h. A2 v3: 10 módulos, 60 unidades (com "Descrever o caráter"), 421 cartões, ~40h; COD
  passa para o M2, "momentos da ação" e negação complexa trocam de módulo.
- *Défis* conferidos: 3 do A1 ajustados, 2 novos (M4 e M7), 1 principal trocado (M8); 6 do A2 com peças ajustadas.
- Risco: nenhum id muda e nenhum cartão sai; ~36 Desafios mudam de módulo, ditados precisam ser re-hospedados, Ponto de verificação é
  herdado por sobreposição. Tudo depois da Etapa 0, junto com a Etapa 2.
- 18 perguntas para a dona na seção 9, cada uma com recomendação.
