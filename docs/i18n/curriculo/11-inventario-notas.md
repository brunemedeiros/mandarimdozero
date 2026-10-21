# 11 · Inventário das notas da trilha de francês (base para a rodada de decisão)

Data: 2026-10-18. Documento de **levantamento e proposta**. Nenhum arquivo do site nem dos documentos 00 a 10 foi alterado.
Fontes: `fr/content.js` + `courses/fr-pt-BR/layer.js` (carregados juntos por `scripts/lib/course-content.js`), `fr/audio-manifest.js`,
`fr/app.js`, `shared/core/*.js`, `fr/index.html`; regras em `.claude/rules/conteudo-trilha.md`, skill `notas-de-realidade`,
`docs/historico/01-regras-gerais-notas-realidade-cultura-streak.md` (confiança registrada); propostas em `04` (v2, seção 10), `04-v1`
(seção 8, que o `04` v2 diz "continuar valendo"), `08` (mapa v3), `09` (M1) e `10` (gramáticas M2 a M8).

Todos os números das seções 1 e 5 saíram de um script Node (apêndice A), rodado sobre o conteúdo com a camada pt-BR aplicada.
Rótulos: posição do mapa v3 do `08` (**M3.3**); quando o `09`/`10` propõe outra posição, ela vem entre parênteses ("10: M2.5").
Números das notas: **N01 a N45**, na ordem em que o aluno as veria no v3.
Títulos citados como estão no site, só com o travessão trocado por dois-pontos.

---

## Resumo em uma tela

- Existem **45 notas** em 20 unidades (nenhuma nas 10 gramáticas): **20 de explicação**, **15 de realidade** (9 gramática coloquial,
  5 informal, 1 regional) e **10 culturais** (6 costume, 4 história, 0 festividade). 32 disparam depois de uma palavra, 13 depois do diálogo.
- Todas têm 1 bloco só. Corpo: mediana **49 palavras**, máximo **60**; **nenhuma passa de 80** (com o título: mediana 57, máximo 68).
- 59 exemplos, todos com mp3 pré-gerado; 3 notas sem exemplo (N09 só com variantes sem áudio, N29, N31). O texto do corpo nunca tem áudio.
- Fenômeno mais repetido: **pergunta com a palavra interrogativa no fim** (5 notas hoje, 6 com a nota nova da M1.6, mais uma tela na M2.7 (g)).
  Outros: queda do *ne* (2 + tela), *de* depois de negação ou quantidade (3 + 2 gramáticas), *t'* de *tu* (3), *il y a* (3), *à bientôt* (2).
- Proposta: 1 nota completa por fenômeno; as seguintes viram **breves** só quando trazem conteúdo novo; 2 cortes (N30, N36); 1 mudança de
  unidade (N09 para M5.1); 3 gatilhos errados a corrigir (N21, N23, N38); 7 textos a ajustar, fora o "pra". Notas novas previstas no A1: **60** (seção 3.2).
- Gatilho hoje é **posição** (`afterVocabIdx`) e, nas unidades com lições, só escolhe a **lição** (a nota aparece depois de todas as palavras
  da lição). Com a chave `k` o gatilho segue a palavra quando ela muda de lugar.
- "Nota vista" **não é salva** hoje: `STEP_STATE.conceptsShown` vive só enquanto a unidade está aberta. A lâmpada precisa de um campo no
  progresso (sem migration: o progresso é JSON na tabela `progress`).
- 35 notas candidatas a V/F com 1 ou 2 afirmações cada (seção 4). Hoje o V/F mostra a explicação **só no erro**.
- 22 perguntas para a dona (seção 8), cada uma com recomendação.

---

## 1. Tabela de todas as notas

Colunas: **Gatilho → lição hoje** = palavra (posição e chave) ou diálogo, e a lição em que a nota cai hoje (L3/4 = 3ª de 4 lições; a 4ª é
sempre o Ponto de verificação). **Pal.** = palavras do corpo (sem título nem exemplos). **Ex.** = exemplos (com mp3 / total). **Conf.** =
confiança registrada no `historico/01` (só existe para realidade e cultura; explicação nunca teve registro). Tipo: **E** explicação,
**R** realidade, **C** cultura.

| N | Id | Pos. v3 (id) | Tipo | Gatilho → lição hoje | Título | Pal. | Ex. | Conf. | Fenômeno ensinado |
|---|---|---|---|---|---|---|---|---|---|
| N01 | `bonjour-vs-bonsoir` | M1.1 (`A1-1`) | E | *bonsoir* (v1, `A1-1-v1`) → L1 | "Bonjour" ou "Bonsoir"? | 44 | 2/2 | não registrada | saudação pela hora do dia; *salut* só com próximos |
| N02 | `svp-informal` | M1.1 | R informal | *s'il vous plaît* (v6) → L3 | "S'il vous plaît" no dia a dia | 45 | 2/2 | alta | *s'il te plaît*, STP |
| N03 | `a-bientot-informal` | M1.1 | R informal | *à bientôt* (v9) → L3 | "À bientôt" entre amigos vira "à plus" | 45 | 2/2 | alta | despedida informal *à plus*, A+ |
| N04 | `la-bise-cumprimento` | M1.1 | C costume | diálogo → L3 | Por que os franceses se cumprimentam com beijinhos no rosto? | 52 | 1/1 | alta | *la bise* |
| N05 | `tu-vs-vous` | M1.2 (`A1-2`) | E | *tu* (v1) → L1 | "Tu" ou "vous"? | 45 | 2/2 | não registrada | *tu* x *vous* (e *vous* plural) |
| N06 | `comment-tappelles-wh-in-situ` | M1.2 | R gram. coloquial | *s'appeler* (v2) → L1 | "Comment tu t'appelles ?" também vira "Tu t'appelles comment ?" | 52 | 1/1 | alta | pergunta *in situ* (*comment*) |
| N07 | `tu-es-contraction` | M1.2 | R gram. coloquial | diálogo → L3 | "Tu es" vira "t'es" na fala | 51 | 1/1 | alta | contração *tu es* → *t'es* |
| N08 | `avoir-age` | M1.3 (`A1-3`) | E | *avoir* (v7) → L3 | "J'ai vingt ans": por que "ai" e não "suis"? | 43 | 2/2 | não registrada | idade com *avoir* |
| N09 | `vingt-to-quatrevingts` | M1.3 | R regional | *vingt* (v5) → L2 | "Vingt" é a base de um sistema esquisito | 39 | 0 (3 variantes, sem áudio) | alta | base 20 na França; *septante, huitante, nonante* |
| N10 | `quel-age-wh-in-situ` | M1.3 | R gram. coloquial | *ans* (v8) → L3 | "Quel âge as-tu ?" também vira "T'as quel âge ?" | 48 | 1/1 | alta | *in situ* (*quel âge*) + *t'as* |
| N11 | `pere-mere-papa-maman` | M2.1 (`A1-4`) | R informal | *la mère* (v2) → L1 | "Le père"/"la mère" no dia a dia viram "papa"/"maman" | 41 | 2/2 | alta | *papa, maman* |
| N12 | `mon-vs-ma` | M2.1 | E | *la sœur* (v4) → L2 | "Mon frère" ou "ma sœur"? | 52 | 2/2 | não registrada | possessivo concorda com a palavra |
| N13 | `repas-dominical` | M2.1 | C costume | diálogo → L3 | O almoço de domingo em família | 51 | 1/1 | alta | almoço de domingo |
| N14 | `bandeira-tricolor-historia` | M2.3 (`A1-16`) | C história | *blanc* (v5) → L2 | Bleu, blanc, rouge: a origem da bandeira francesa | 39 | 1/1 | alta | bandeira |
| N15 | `adjective-placement` | M2.3 | E | *joli* (v8) → L3 | Por que "une jolie robe rouge" e não "une rouge jolie robe"? | 56 | 2/2 | não registrada | lugar do adjetivo |
| N16 | `gentil-sympa` | M2.3 | R informal | diálogo → L3 | "Gentil" no dia a dia costuma virar "sympa" | 35 | 1/1 | alta | *sympa* |
| N17 | `etre-nationalite-vs-venir-de` | M2.4 (`A1-9`; 10: M2.5) | E | *venir de* (v9) → L3 | "Je suis brésilienne" ou "je viens du Brésil"? | 51 | 2/2 | não registrada | identidade x origem; *de / du / d'* + país |
| N18 | `dou-viens-tu-wh-in-situ` | M2.4 (10: M2.5) | R gram. coloquial | diálogo → L3 | "D'où viens-tu ?" também vira "Tu es d'où ?" | 54 | 1/1 | alta | *in situ* (*d'où*) |
| N19 | `etre-heures` | M3.1 (`A1-6`) | E | *l'heure* (v0) → L1 | "Il est huit heures": de novo, nada de "être"... ou melhor, só "être"! | 48 | 1/1 | não registrada | horas com *être*, *il* impessoal |
| N20 | `le-midi-almoco-longo` | M3.1 | C costume | *le midi* (v2) → L1 | "Le midi" na França é hora de sentar pra comer de verdade | 56 | 1/1 | alta | almoço como pausa |
| N21 | `a-demain-vs-a-bientot` | M3.3 (`A1-7`) | E | ***hier*** (v4) → L2 | "À demain" ou "à bientôt"? | 52 | 2/2 | não registrada | despedida pelo prazo do reencontro |
| N22 | `dias-semana-deuses-romanos` | M3.3 | C história | *mardi* (v1) → L1 | De onde vêm os nomes dos dias da semana? | 46 | 2/2 | alta | etimologia dos dias |
| N23 | `nous-sommes-on-est` | M3.3 | R gram. coloquial | *aujourd'hui* (v2) → L1 | "Nous sommes lundi" no dia a dia vira "On est lundi" | 46 | 1/1 | alta | *on* = *nous* |
| N24 | `aime-le-vs-bois-du` | M4.1 (`A1-5`) | E | *boire* (v8) → L3 | "J'aime LE café" ou "je bois DU café"? | 60 | 2/2 | não registrada | artigo definido (gosto) x partitivo (quantidade) |
| N25 | `croissant-nao-e-diario` | M4.1 | C costume | diálogo → L3 | Croissant todo dia? Não pra maioria dos franceses | 52 | 1/1 | alta | café da manhã real |
| N26 | `negation-partitif` | M4.2 (`A1-11`) | E | *la viande* (v0) → L1 | "Je ne mange pas DE viande": cadê o "la"? | 49 | 1/1 | não registrada | *du / de la* → *de* na negação |
| N27 | `le-marche-tradicao` | M4.2 | C costume | diálogo → L3 | Além do supermercado: o marché | 55 | 1/1 | alta | feira ao ar livre |
| N28 | `de-quantite` | M4.3 (`A1-12`) | E | *un kilo (de)* (v0) → L1 | "Un kilo DE pommes": a mesma regra do "de" | 47 | 1/1 | não registrada | *de* depois de quantidade |
| N29 | `voudrais-vs-peux` | M5.3 (`A1-10`) | E | diálogo → L5/6 | "Je voudrais" ou "je peux"? | 54 | 0 | não registrada | pedir x pedir permissão |
| N30 | `combien-ca-coute-wh-in-situ` | M5.3 | R gram. coloquial | diálogo → L5/6 | "Combien ça coûte ?" também vira "Ça coûte combien ?" | 52 | 1/1 | alta | *in situ* (*combien*) |
| N31 | `ou-est-vs-il-y-a` | M6.1 (`A1-8`) | E | diálogo → L3 | "Où est...?" ou "Il y a...?" | 53 | 0 | não registrada | *où est* x *il y a* |
| N32 | `metro-paris-historia` | M6.3 (`A1-14`) | C história | *le métro* (v2) → L1 | O metrô de Paris nasceu numa feira mundial | 53 | 1/1 | alta | metrô de 1900 |
| N33 | `en-vs-a-transport` | M6.3 | E | *à pied* (v5) → L2 | "En métro" ou "à pied"? | 51 | 2/2 | não registrada | *en* x *à* com transporte |
| N34 | `avoir-mal-vs-etre-malade` | M6.5 (`A1-15`) | E | *malade* (v4) → L2 | "J'ai mal à la tête" ou "je suis malade"? | 56 | 2/2 | não registrada | dor localizada x mal-estar |
| N35 | `quest-ce-qui-ne-va-pas-ca-va-pas` | M6.5 | R informal | diálogo → L3 | "Qu'est-ce qui ne va pas ?" no dia a dia vira "Ça va pas ?" | 44 | 1/1 | alta | pergunta encurtada (e sem *ne*) |
| N36 | `il-y-a-vs-negation` | M7.1 (`A1-17`) | E | *il n'y a pas de* (v9) → L3 | "Il y a" ou "il n'y a pas de"? | 45 | 2/2 | não registrada | *il n'y a pas de* |
| N37 | `il-y-a-ya` | M7.1 | R gram. coloquial | *il y a* (v8) → L3 | "Il y a" no dia a dia vira "y'a" | 47 | 1/1 | alta | *y'a* |
| N38 | `andar-terreo-premier-etage` | M7.1 | C costume | ***la chambre*** (v2) → L1 | "1er étage" não é o térreo | 45 | 2/2 | alta | contagem de andares |
| N39 | `sur-vs-dans` | M7.2 (`A1-18`) | E | *sur* (v5) → L2 | "Sur" ou "dans"? | 47 | 1/1 | não registrada | *sur* x *dans* |
| N40 | `il-fait-vs-jai` | M7.6 (`A1-13`; 10: M7.7) | E | *il fait chaud* (v2) → L1 | "Il fait chaud" ou "j'ai chaud"? | 49 | 1/1 | não registrada | clima (*faire*) x sensação (*avoir*) |
| N41 | `cinema-nasceu-na-franca` | M8.1 (`A1-19`) | C história | *le cinéma* (v0) → L1 | O cinema nasceu na França | 60 | 1/1 | alta | irmãos Lumière |
| N42 | `jouer-de-vs-jouer-a` | M8.1 | E | *jouer* (v4) → L2 | "Jouer DE la guitare" ou "jouer AU foot"? | 43 | 1/1 | não registrada | *jouer de* x *jouer à* |
| N43 | `ne-drop-on-sait-pas` | M8.1 | R gram. coloquial | diálogo → L3 | "On ne sait pas encore !" no dia a dia perde o "ne" | 55 | 1/1 | alta | queda do *ne* |
| N44 | `hier-vs-semaine-derniere` | M8.3 (`A1-20`; 10: M8.2) | E | *la semaine dernière* (v2) → L1 | "Hier" ou "la semaine dernière"? | 44 | 2/2 | não registrada | marcadores de passado |
| N45 | `quest-ce-que-tu-as-fait-wh-in-situ` | M8.3 (10: M8.2) | R gram. coloquial | diálogo → L3 | "Qu'est-ce que tu as fait hier ?" também vira "T'as fait quoi hier ?" | 49 | 1/1 | alta | *in situ* (*quoi*) + *t'as* + some *qu'est-ce que* |

Observações conferidas no código e no conteúdo:
- **Gatilhos em negrito estão errados** para a palavra que a nota explica: N21 explica *à demain* e dispara depois de *hier*; N38 dispara
  depois de *la chambre* (*étage* só está na frase p6); N23 dispara depois de *aujourd'hui* e fala de *Nous sommes lundi* (achados 29 e 30
  do `01` para N23 e N38; N21 é achado novo). Na lição o efeito é pequeno (a nota sai no fim das palavras da lição), mas no painel de erro
  `noteOrConceptReviewHTML` (`fr/app.js:3064`) casa a nota com a palavra errada: errar *hier* mostra "À demain ou à bientôt?".
- Ordem dentro da lição = ordem do array `concepts`, não a do gatilho: na `A1-17` L3, N36 (v9) sai **antes** de N37 (v8).
- 34 lições têm nota: 24 com 1, 9 com 2, 1 com 3 (`A1-1` L3: N02, N03 e, depois do diálogo, N04).
- Todas as 45 têm texto em `fr/content.en.js` (busca pelo id).
- **"pra" em texto visível** (regra do projeto): 21 das 45 notas (N02, N03, N07, N09, N10, N11, N12, N13, N16, N19, N20, N21, N24, N25, N26,
  N29, N34, N40, N42, N43, N45) e 4 dos 8 V/F que já existem.
- **9 notas de realidade** terminam com "Nos exercícios daqui, continue escrevendo a forma padrão" (N06, N07, N10, N18, N23, N30, N37, N43, N45).
- Vocabulário que ainda não foi visto **na posição nova do v3**: N15 usa *robe* (M5.3) e passa a vir na M2.3; N31 usa *pharmacie* (M6.5),
  achado 18 do `01`; N44 diz "o passé composé que você já viu", mas a gramática vem depois nos dois desenhos (M8.4 no `08`, M8.3 no `10`);
  N09 diz "o vingt que você acabou de aprender" e vai mudar de unidade.

---

## 2. Fenômenos repetidos e proposta (completa, breve ou corte)

Regra da dona usada aqui: **nota igual não**; nota do mesmo conceito com **conteúdo novo ou estrutura mais difícil** pode existir, **mais breve**.
Proposta de formato de nota breve: título + 1 ou 2 frases (até ~25 palavras) + 1 exemplo com áudio. Sem "você já viu na M1.2": a trilha
deixa abrir unidades fora de ordem (2.10 do `04`), então a breve tem de se sustentar sozinha (pergunta 3).

### 2.1 Pergunta com a palavra interrogativa no fim (*in situ*): 5 notas hoje, 6 com a nova da M1.6, + tela "Na rua" da M2.7 (g)

| Ordem no v3 | Nota | O que traz de novo | Proposta |
|---|---|---|---|
| M1.2 | N06 *Tu t'appelles comment ?* | o fenômeno | **completa** (fica como está, 52 palavras) |
| M1.3 | N10 *T'as quel âge ?* | *tu as* → *t'as* | **breve**: "na fala, *tu as* vira *t'as*, e *quel âge* também vai para o fim" |
| M1.6 | nova (`09`) *Tu fais quoi dans la vie ?* | *qu'est-ce que* → *quoi* no fim (estrutura mais difícil) | **breve** |
| M2.5 (10) | N18 *Tu es d'où ?* | *où* | **breve**, vira a nota "*où* vai para o fim" do `10`; depende do diálogo novo da `A1-9` (`04` 4.1: o diálogo passa a falar de terceiros) |
| M2.7 (g) | tela "Na rua" (`10`, `A1-g12`) | sistematiza (*Tu habites où ?*, *J'ai pas de frère*) | tela de gramática, não nota |
| M5.1 | nova (`10`) nota *combien* | *combien* | **breve** e **absorve** N30 (1 linha: "na fala, *ça coûte combien ?*") |
| M5.3 | N30 *Ça coûte combien ?* | nada além da M5.1 | **cortar** (o diálogo continua mostrando a forma) |
| M8.2 ou M8.3 | N45 *T'as fait quoi hier ?* | o mesmo no passado | **breve** se a nota da M1.6 for aprovada; sem ela, fica completa |

Hoje: 5 notas, 255 palavras de corpo. Com a proposta: 1 completa + 4 breves (+ 1 breve nova), ~150 palavras.

### 2.2 Contração de *tu* (*t'*): N07 (*t'es*, M1.2), N10 (*t'as*, M1.3), N45 (*t'as*, M8)
Completa: **N07**. N10 e N45 citam *t'as* numa oração (já previsto em 2.1). Nenhum corte.

### 2.3 Queda do *ne*: N43 (M8.1), N35 em parte (*Ça va pas ?*, M6.5), + tela "Na rua" da M2.7 (g) (*J'ai pas de frère*)
No v3 a tela da M2.7 (g) é o primeiro contato (M2). Proposta: **N43 breve** ("*on sait pas encore*: o *ne* some, a frase continua
negativa"); N35 fica (o assunto dela é a pergunta encurtada, não o *ne*).

### 2.4 *de* depois de negação ou de quantidade: N26 (M4.2), N28 (M4.3), N36 (M7.1) + M2.7 (g) *pas de* (`09`/`10`) + M4.4 (g) partitivos
No v3 *pas de* chega na M2.7 (g), antes do M4. Proposta: **N26 breve** (novo: também *du / de la* viram *de*, não só *un / une / des*);
**N28 fica** (estrutura nova: quantidade, e é a entrada da M4.4 (g)); **N36 cortar** (o próprio cartão *il n'y a pas de* ensina, e a regra
já veio duas vezes).

### 2.5 *il y a*: N31 (M6.1), N36 (M7.1), N37 (M7.1)
Completa: **N31** (com exemplo da própria unidade: *Il y a un musée près de la gare ?*). **N37 fica** (forma nova *y'a*). N36: ver 2.4.

### 2.6 Despedidas: N03 (*à plus*, M1.1) e N21 (*à demain* x *à bientôt* x *au revoir*, M3.3)
As duas explicam *à bientôt*. Proposta: N03 completa; **N21 breve** (novo: *à demain*), com o gatilho corrigido para *demain*.

### 2.7 Verbo diferente do português: N08 (idade com *avoir*), N19 (horas com *être*), N34 (*avoir mal*), N40 (*il fait* x *j'ai*), + nova "pegadinha" *avoir faim* (M4.1, `09` pergunta 26)
Cada uma é uma estrutura diferente: **todas ficam**. N19 e N40 explicam o mesmo *il* impessoal: N40 pode citá-lo numa oração e encurtar.

### 2.8 *tu* x *vous* e registro: N05 (M1.2) e N02 (M1.1)
N02 fala de "forma tu, não vous" uma unidade **antes** de N05 explicar *tu* x *vous*. Proposta: N02 ganha meia frase ("*tu* = você entre
amigos; a diferença vem na próxima unidade") ou N05 sobe para a M1.1 (pergunta 18).

### 2.9 Possessivo: N12 (M2.1) x tela 1 da `A1-g2` (M2.4 (g) no `10`)
É a mesma regra (concorda com a palavra, não com o dono). A família precisa de *ma mère* antes da gramática. Proposta: **N12 breve** (contato), a regra completa fica na gramática.

### 2.10 Preposições que o português não separa: N17 (*venir de*), N33 (*en / à*), N39 (*sur / dans*), N42 (*jouer de / à*)
Conteúdos diferentes: ficam. **N17**: a parte "*du Brésil, de France, d'Espagne*" repete a tela nova de procedência da M2.6 (g), que vem logo
depois: **enxugar** para identidade x origem.

### 2.11 Base 20 dos números: N09 (M1.3) x `A1-g10` (M5.2 (g))
A gramática já ensina 70 = 60 + 10 e 80 = 4 × 20. Proposta (`09` e `10` pergunta 12): N09 **sai do M1** e vai para **M5.1** com gatilho
*soixante-dix*, **só com a parte regional** (*septante, huitante, nonante*). A M1.3 fica sem nota de base 20.

### 2.12 Lugar do adjetivo e *c'est* (espirais do `10`, todas novas menos N15)
Lugar do adjetivo: N15 (M2.3, completa) e nova breve na M7.1 (*une grande maison*). *c'est* x *il est*: nova completa na M2.1; breves novas na
M1.6 (sem artigo), M4.1 (*c'est bon*), M7.1 (*c'est une grande maison* x *la maison est grande*).

### 2.13 Pronomes tônicos (espiral do `09`, todas novas)
M1.2 *Moi, toi* (completa), M1.4 *Et lui ? Et elle ?* (breve), M4.1 *Pour moi, un café* (breve), M8.x *avec moi, chez toi* (breve, `10`).

### 2.14 Não são repetição (ficam)
N11 *papa*, N16 *sympa*, N02 STP, N03 *à plus*: palavras diferentes do mesmo registro informal; cada uma responde à palavra da lição.
N23 *on* = *nous*: a M3.2 (g) põe *on* na tabela (`10`), e a nota traz o uso na fala. As 10 culturais: nenhuma repetida.

---

## 3. O que acontece com cada nota no v3, e as notas novas

### 3.1 As 45 notas de hoje

Lição no v3: igual à de hoje, salvo indicação. Nas unidades cujo vocabulário muda (`A1-3`, `A1-2`, `A1-7`, `A1-10`, `A1-15`, `A1-5`, `A1-6`,
`A1-20`), o índice do gatilho muda junto: com a chave `k` a nota segue a palavra (seção 6).

| N | Destino | Lição no v3 | Motivo / fonte |
|---|---|---|---|
| N01 | fica | L1 | |
| N02 | fica, texto ajustado | L3 | "pra"; menção a *tu* antes da M1.2 (2.8) |
| N03 | fica (completa do grupo despedidas) | L3 | |
| N04 | fica | depois do diálogo, L3 | |
| N05 | fica | L1 "Eu, você e o seu nome" (`09`) | |
| N06 | fica, **completa** do grupo *in situ* | L1 | `04` dúvida b |
| N07 | fica, completa do grupo *t'* | depois do diálogo, L3 "Falar do país" | |
| N08 | fica, **muda de lição** | L1 "Dizer quantos anos você tem" (`09`) | *avoir* sobe para a L1 |
| N09 | **muda de unidade** para M5.1 (`A1-28`), gatilho *soixante-dix*, só regional | lição de 70 a 100 da M5.1 | `09`, `10` (gramática não tem nota) |
| N10 | fica **breve**, **muda de lição** | L1 (`09`) | 2.1 |
| N11 | fica | L1 | |
| N12 | fica **breve** | L2 | 2.9 |
| N13 | fica | depois do diálogo | |
| N14 | fica | L2 | |
| N15 | fica + 1 linha "o mesmo *-e* da M1.7: *grand, grande*" (`10`); troca *robe* | L3 | `10` 2.1 |
| N16 | fica | depois do diálogo | |
| N17 | fica, **enxugada** | L3 | 2.10 |
| N18 | **muda**: vira a breve "*où* vai para o fim" | depois do diálogo novo | `10`, decisão 13 do `04` |
| N19 | fica, título ajustado | L1 | título confuso |
| N20 | fica | L1 | |
| N21 | fica **breve**, gatilho → *demain* | L2 | 2.6 |
| N22 | fica | L1 | |
| N23 | fica, gatilho → *lundi* ou diálogo | L1 ou depois do diálogo | `04-v1` achado 29 |
| N24 | fica (entrada da M4.4 (g)) | L3 | `10` espiral |
| N25 | fica | depois do diálogo | |
| N26 | fica **breve** | L1 | 2.4 |
| N27 | fica | depois do diálogo | |
| N28 | fica | L1 | |
| N29 | fica (a `A1-g6` retoma *je voudrais*) | depois do diálogo | `10` 2.5 |
| N30 | **cortada** (absorvida pela nota *combien* da M5.1) | | 2.1 |
| N31 | fica, exemplo trocado | depois do diálogo | `08` M6.1, achado 18 |
| N32 | fica | L1 | |
| N33 | fica (ver pergunta 19) | L2 | |
| N34 | fica | L2 (*le médecin* sai da unidade: índice muda) | |
| N35 | fica | depois do diálogo | |
| N36 | **cortada** | | 2.4 |
| N37 | fica | L3 | |
| N38 | fica, gatilho → diálogo; junta a nota "ordinal *le premier étage*" do `08` | depois do diálogo | `04-v1` achado 30, `08` M7.1 |
| N39 | fica | L2 | |
| N40 | fica (pode citar o *il* impessoal de N19) | L1 | 2.7 |
| N41 | fica | L1 | |
| N42 | fica | L2 | |
| N43 | fica **breve** | depois do diálogo | 2.3 |
| N44 | fica, texto corrigido ("que você já viu" sai) | L1 | `04-v1` item 9 |
| N45 | fica **breve** (ou completa, 2.1) | depois do diálogo | `04` dúvida b |

Resumo: 35 ficam (com ou sem ajuste de texto, gatilho ou lição), 6 viram breves (N10, N12, N21, N26, N43, N45), 1 é transformada
em breve sobre outra pergunta (N18), 2 são cortadas (N30, N36) e 1 muda de unidade (N09). Mudam de lição: N08 e N10. **Nenhuma vai para o A2 e nenhuma vira tela de gramática**; o conteúdo de
N06, N26 e N43 passa a ser **também** sistematizado por telas da M2.7 (g). Notas não têm FSRS: cortar ou mover não toca no progresso.

### 3.2 Notas novas previstas (A1)

Fonte: `08`, `09`, `10`, e `04-v1` seção 8 (o `04` v2, seção 10, diz que continuam valendo). Tipo: E, R, C; (S) = explicação de som.
Confiança do autor da proposta quando registrada. "Gatilho" com frase = ainda não existe gatilho por frase (seção 6).

| Pos. (id) | Nota nova | Tipo | Gatilho / lição | Fonte | Conf. |
|---|---|---|---|---|---|
| M1.1 (`A1-1`) | Letras caladas no fim | E (S) | *salut*, L2 | `09` | alta |
| M1.1 | *Bienvenue* no Quebec (de nada, e também "bem-vindo(a)") | R regional | *de rien*, L2 | `08`, `09`, `04-v1` | alta |
| M1.2 (`A1-2`) | *Moi, toi* (tônicos 1) | E | *s'appeler*, L1 | `09` B.10 | alta |
| M1.2 | *Français, française*: o feminino que se ouve | E | L2 | `09` opção C | alta |
| M1.3 (`A1-3`) | *Deux ans, trois ans*: a letra muda acorda | E (S) | L2 | `09` | alta (texto com erro, pergunta 20) |
| M1.3 | De 21 a 29 + *vingt‿et un* (2 blocos) | E (S) | L4 | `08`, `09` | alta |
| M1.4 (`A1-21`) | 17, 18, 19 e as dezenas | E | L3 | `08`, `09` | alta |
| M1.4 | *Et lui ? Et elle ?* (tônicos 2) | E | depois do diálogo | `09` | alta |
| M1.6 (`A1-22`) | *Je suis professeur*: sem artigo | E | 1º item, L1 | `08`, `09` | alta |
| M1.6 | *Tu fais quoi dans la vie ?* | R gram. coloquial | depois do diálogo | `09` | alta |
| M2.1 (`A1-4`) | *c'est* x *il / elle est* | E | frase *C'est mon père, il est ingénieur* | `10` | alta |
| M2.5 (`A1-9`) | Feminino das outras 6 nacionalidades | E | L1 ou L2 | `09` opção C | |
| M3.1 (`A1-6`) | *quel / quelle* (*quelle heure*) | E | frase *Quelle heure est-il ?* | `10` | |
| M3.3 (`A1-7`) | *le samedi* = todo sábado | E | *samedi* (palavra nova) | `10` | |
| M3.3 | *e* caduco (*sam'di*) | E (S) | *samedi* | `04-v1` 8.3 | |
| M3.4 (`A1-24`; 10: M3.5) | *le premier mai*, mas *le deux mai* | E | frase | `08`, `04-v1` | alta |
| M3.4 | 14 de julho | C festividade | *juillet* | `04-v1` | alta |
| M3.4 | 1º de maio e o *muguet* | C festividade | *mai* | `04-v1` | alta |
| M4.1 (`A1-5`) | *Moi aussi / moi non plus* | E | | `08` | |
| M4.1 | *c'est bon, c'est délicieux* | E | | `10` | |
| M4.1 | "Pegadinha": *avoir faim, avoir soif* (sai da tela da `A1-g1`) | E | | `09` pergunta 26 | |
| M4.1 | *Pour moi, un café* (tônicos) | E | | `09` pergunta 27 | |
| M4.1 | Vogais nasais (*pain, poisson*) | E (S) | *le pain* | `04-v1` 8.3 | |
| M4.3 (`A1-12`) | *une livre* = meio quilo | R informal | *un demi-kilo* | `04-v1` | alta |
| M4.4 (`A1-25`; 10: M4.5) | *déjeuner / dîner / souper* na Bélgica, Suíça e Quebec | R regional | *le déjeuner* | `04-v1` | alta |
| M4.4 | Água da torneira e pão de graça | C costume | *la carte* | `04-v1` | alta |
| M4.4 | *le menu* x *la carte* (falso amigo) | E | *le menu* | `04-v1` | alta |
| M5.1 (`A1-28`) | Telefone em pares | E | *zéro* | `10` | |
| M5.1 | *combien* (absorve N30) | E | *combien* | `10` | |
| M5.3 (`A1-10`) | *ce, cette, ces* | E | frase *ce pantalon* | `10` | alta |
| M5.3 | O gênero nem sempre bate com o português (*le pantalon, la robe*) | E | *la robe* | `09` pergunta 5 | |
| M5.3 | *Je la prends*: reconhecer o COD | E | depois do diálogo | `04` 0.1, `04-v1` 28 | |
| M6.1 (`A1-8`) | 20 *arrondissements* | C costume | *la place* ou diálogo | `04-v1` | alta |
| M6.1 | [y] x [u]: *rue* x *roue* | E (S) | *la rue* | `04-v1` 8.3 | |
| M6.3 (`A1-14`) | Bicicletas compartilhadas | C costume | *le vélo* | `04-v1` | alta |
| M6.3 | *J'y vais en métro* (fórmula com *y*) | E | | `04-v1` 27 (ou M7.4) | |
| M6.5 (`A1-15`) | *Reposez-vous !* | E | | `10` | |
| M6.5 | Farmácia: cruz verde (os números de emergência foram redistribuídos: 17 e 112 na A1 M8.6; 15 e 18 na A2 M4.3; ver `08` v2, decisão 141) | C costume | *la pharmacie* | `04-v1` | alta |
| M6.5 | *depuis* como fórmula | E | | `04-v1` | |
| M7.1 (`A1-17`) | *très / super / hyper* | R informal | | `08` | |
| M7.1 | *C'est une grande maison* x *La maison est grande* | E | frase | `10` | |
| M7.1 | Lugar do adjetivo (2) | E | | `10` | |
| M7.1 | *e* caduco (*la fenêtre*) | E (S) | *la fenêtre* | `04-v1` 8.3 | |
| M7.2 (`A1-18`) | *à côté du lit* (*de + le = du*) | E | *à côté de* | `10` | |
| M7.4 (`A1-26`) | *Congés payés* (1936) e as férias de verão | C história | *les vacances* | `04-v1` | alta |
| M7.4 | *Bisous, grosses bises* no cartão-postal | R informal | *la carte postale* | `04-v1` | alta |
| M7.4 | *On y va* (fórmula) | E | | `08` | |
| M7.5 (`A1-23`; 10: M7.6) | Ordem do endereço e CEP | C costume | *l'adresse* | `04-v1` | alta |
| M7.5 | *courriel* no Quebec, *arobase* | R regional | *le mail* | `04-v1` | alta |
| M7.5 | Alfabeto e nomes dos acentos | E (S) | *épeler* | `04-v1` 8.3 | |
| M7.5 | *Allô ?* | E | | `04-v1` 31 | |
| M7.6 (`A1-13`; 10: M7.7) | *Il fait frette* no Quebec | R regional | *il fait froid* | `04-v1` | alta |
| M8.2 (`A1-27`; 10: M8.4) | *Désolé(e)* x *Pardon* x *Excusez-moi* | R | | `04` 10 | alta |
| M8.2 | *pourquoi ? / parce que* | E | | `04-v1`, `10` | |
| M8.2 | Tônicos depois de preposição (*avec moi, chez toi*) | E | frase *Tu viens avec moi ?* | `10` | |
| M8.2 | *Fête de la musique* | C festividade | *la fête* | `04-v1` | alta |
| M8.2 | *Galette des rois* | C festividade | *l'anniversaire* | `04-v1` | alta |
| M8.2 | *OK, ça marche* (sem *carrément*, que fica para o A2) | R informal | *d'accord* | `04-v1` | alta |
| M8.3 (`A1-20`; 10: M8.2) | *j'ai* + particípio (primeiro contato) | E | | `04-v1` item 9 | |
| M8.3 | Aviso: com alguns verbos é *je suis* + particípio (*on est allés*) | E | depois do diálogo | `04-v1` R6 | |

Total: **60 notas novas** no A1 (linhas da tabela acima, contadas por script). Fora da lista: *Pardon* x *Excusez-moi* na rua (M6.1, confiança **média**:
não publicar sem a dona), *Celsius / la météo* (M7.6, "fraca, opcional") e a nota de instruções de aula da M1.1 (`09` recomenda tirar).
Com as 45 de hoje menos 2 cortes: ~103 notas no A1 (mais que o dobro). M4.1 sozinha passaria a ter **7 notas** (2 de hoje + 5 novas): pergunta 17.

**Fica para o A2** (nenhuma das 45 atuais): `familiar-giria` (*le boulot, crevé, carrément*...), as culturais do `04-v1` 8.2 e as notas que
o `10` cria a partir de gramáticas desfeitas (*ne... plus* em A2 M1.3; *d'abord... enfin* em M2.1; *donc, alors* e *-ment* em M2.3;
*ne... que* em M5.1; intensidade em M5.5; desejo e verbo + *de* em M6.5; obrigação em M7.4; *tout, chaque* em M8.2; opinião em M10.1;
quantidade comparada em M3.5).

---

## 4. Candidatas a verdadeiro ou falso

Formato de hoje (`trueFalseExercises`): uma frase em francês com áudio (**Frase**), uma afirmação em português (**Afirmação**), a resposta
e um `whyNote`. Hoje o `whyNote` aparece **só quando o aluno erra** (`shared/core/quase-iguais-pinyin.js:116` manda o painel de acerto sem
texto); mostrar a mesma explicação no acerto é uma mudança pequena de código (pergunta 13). Cultura não leva V/F. Todas as frases usam só
palavras já vistas na posição do v3. Nas de gramática coloquial a afirmação é sempre sobre **reconhecer**, nunca pede para produzir a forma
coloquial (os exercícios ainda cobram a forma padrão). Os 8 V/F que já existem (`A1-1, 2, 5, 8, 9, 13, 15, 19`) são de sentido; nenhum dos
abaixo repete um deles.

| N | Frase | Afirmação | V/F | Explicação (acerto e erro) |
|---|---|---|---|---|
| N01 | *Bonsoir !* | Você chega a uma festa às nove da noite. Dizer isso ao chegar é o normal. | V | À noite, ao chegar, *bonjour* vira *bonsoir*. |
| N01 | *Salut !* | É um bom jeito de cumprimentar o vendedor de uma loja. | F | *Salut* é só entre amigos; com desconhecidos, *bonjour*. |
| N02 | *STP* | Numa mensagem para um amigo, quer dizer "por favor". | V | É a abreviação de *s'il te plaît*, a forma com *tu*. |
| N02 | *S'il te plaît* | É a forma mais segura com um desconhecido. | F | Com desconhecidos, *s'il vous plaît*. |
| N03 | *À plus !* | É uma despedida informal, comum entre amigos. | V | Na mensagem vira A+; em contexto formal, *à bientôt* ou *au revoir*. |
| N05 | *Vous* | Serve também para falar com um grupo de amigos. | V | *Vous* é o "você" formal e também o "vocês". |
| N05 | *Tu* | É a escolha mais segura com uma pessoa mais velha que você não conhece. | F | Na dúvida, comece com *vous*. |
| N06 | *Tu t'appelles comment ?* | A frase está errada: a palavra de pergunta tem de vir no começo. | F | Na fala, a palavra de pergunta pode ir para o fim. |
| N07 | *T'es français ?* | É o mesmo que *tu es français ?*, dito rápido. | V | *Tu es* vira *t'es* na fala; nos exercícios, escreva *tu es*. |
| N08 | *J'ai vingt ans.* | Para dizer a idade, o francês usa o verbo "ser". | F | Idade é sempre com *avoir* (ter): *j'ai vingt ans*. |
| N09 | *Septante* | Na Bélgica e na Suíça, 70 se diz assim. | V | Na França é *soixante-dix*. |
| N09 | *Septante* | É assim que se diz 70 em Paris. | F | Em Paris, *soixante-dix*; *septante* é da Bélgica e da Suíça. |
| N10 | *T'as quel âge ?* | Pergunta a idade, de um jeito informal. | V | *Tu as* vira *t'as* e *quel âge* vai para o fim. |
| N11 | *Maman* | Só criança pequena diz isso; adulto sempre diz *ma mère*. | F | Adultos também dizem *papa* e *maman* com a própria família. |
| N12 | *Ma sœur* | Um homem falando diria *mon sœur*. | F | O possessivo segue a palavra (*sœur* é feminina), não quem fala. |
| N15 | *Il a les yeux bleus.* | A cor vem depois do substantivo. | V | A maioria dos adjetivos vem depois; *petit, grand, joli* vêm antes. |
| N15 | *Une petite fille* | *Petite* está no lugar errado: deveria vir depois. | F | *Petit, grand, joli, bon* vêm antes do substantivo. |
| N16 | *Il est sympa.* | Quer dizer que ele é legal, gente boa. | V | *Sympa* (de *sympathique*) é o jeito do dia a dia. |
| N17 | *Je viens du Brésil.* | Fala de onde a pessoa vem. | V | *Venir de* = origem; *je suis brésilienne* = nacionalidade. |
| N18 | *Tu es d'où ?* | Pergunta de onde a pessoa é. | V | Na fala, *d'où* pode ir para o fim. |
| N19 | *Il est huit heures.* | O *il* da frase é uma pessoa. | F | É um *il* impessoal, como o "está" de "está chovendo". |
| N19 | *Il est huit heures.* | Para as horas se usa *être*; para a idade, *avoir*. | V | *Il est* + hora; *j'ai* + idade. |
| N21 | *À demain !* | Você diz isso quando vai ver a pessoa amanhã. | V | *À demain* = até amanhã; *à bientôt* quando não se sabe quando. |
| N21 | *Au revoir !* | Só serve se o reencontro for no dia seguinte. | F | *Au revoir* é neutro, serve para qualquer despedida. |
| N23 | *On est lundi.* | Na fala, *on* faz o papel de *nous*. | V | O verbo fica como o de *il*: *on est*, não *on sommes*. |
| N24 | *Je bois du café.* | *Du* aqui indica uma quantidade de café. | V | Beber, comer, comprar: partitivo (*du*). |
| N24 | *J'aime du café.* | É o jeito certo de dizer que você gosta de café. | F | Gosto em geral: artigo definido, *j'aime le café*. |
| N26 | *Je ne mange pas de viande.* | Depois de *ne... pas*, *de la viande* vira *de viande*. | V | Na negação, *du / de la / des* viram *de*. |
| N28 | *Un kilo de pommes* | O certo seria *un kilo des pommes*. | F | Depois de quantidade, só *de*. |
| N29 | *Je peux essayer ce pantalon ?* | A pessoa pede permissão. | V | *Je peux...?* pede permissão; *je voudrais* pede algo. |
| N29 | *Je voudrais une robe.* | É menos educado que *je veux une robe*. | F | *Je voudrais* é a forma mais educada. |
| N30 | *Ça coûte combien ?* | Pergunta o preço. | V | Na fala, *combien* vai para o fim. (Se N30 for cortada, este item vai para a nota *combien* da M5.1.) |
| N31 | *Il y a un musée près d'ici ?* | Você pergunta isso quando não sabe se existe um museu ali perto. | V | *Il y a* pergunta se existe; *où est* pergunta onde fica. |
| N31 | *Où est la gare ?* | Você pergunta isso quando nem sabe se a cidade tem estação. | F | *Où est* supõe que o lugar existe. |
| N33 | *Je vais à la gare en métro.* | Com metrô, ônibus e carro, o francês usa *en*. | V | Transporte em que se entra: *en*. |
| N33 | *En pied* | É assim que se diz "a pé". | F | *À pied*. |
| N34 | *Je suis malade.* | A frase aponta dor numa parte do corpo. | F | Estado geral: *être malade*; dor localizada: *avoir mal à*. |
| N35 | *Ça va pas ?* | Pode ser um jeito casual de perguntar "o que foi?". | V | Encurta *Qu'est-ce qui ne va pas ?*. |
| N36 | *Il n'y a pas de jardin.* | O certo seria *il n'y a pas un jardin*. | F | Na negação, *un* vira *de*. (Só se N36 não for cortada.) |
| N37 | *Y'a une chambre.* | É *il y a une chambre*, dito rápido. | V | O *il* quase some na fala; escreva *il y a*. |
| N39 | *La lampe est sur la table.* | A luminária está dentro da mesa. | F | *Sur* = em cima de; *dans* = dentro de. |
| N40 | *J'ai chaud.* | Fala do clima lá fora. | F | *J'ai chaud* é a sua sensação; o clima é *il fait chaud*. |
| N42 | *Jouer au foot* | Com esporte se usa *jouer à*. | V | Esporte e jogo: *à*; instrumento: *de*. |
| N42 | *Je joue au piano.* | É o jeito certo de dizer que toca piano. | F | Instrumento: *jouer du piano*. |
| N43 | *On sait pas encore.* | Sem o *ne*, a frase passa a ser afirmativa. | F | Na fala o *ne* some e a frase continua negativa; escreva o *ne*. |
| N44 | *La semaine dernière* | Aponta um dia específico, como *hier*. | F | *Hier* = um dia; *la semaine dernière* = um período. |
| N45 | *T'as fait quoi hier ?* | Pergunta o que a pessoa fez ontem. | V | *Qu'est-ce que* some, *quoi* vai para o fim e *tu as* vira *t'as*. |

Para as notas novas do M1 (piloto do `09`), no mesmo formato: *Salut* "o *t* do fim se pronuncia" (F); *Merci ! Bienvenue !* "no Quebec, a
resposta quer dizer 'de nada'" (V); *Moi aussi !* "quer dizer 'eu também'" (V); *française* "o *s* do fim soa, como *z*" (V); *deux ans* "o
*x* de *deux* soa como *z* antes de *ans*" (V); *vingt-deux* "de 22 a 29 se usa *et*: *vingt et deux*" (F); *dix-sept* "é 10 + 7" (V);
*Et elle ?* "pergunta 'e ela?' sem repetir o nome" (V); *Je suis professeur.* "falta o artigo: o certo é *je suis un professeur*" (F);
*Tu fais quoi dans la vie ?* "pergunta a profissão, de modo informal" (V).

---

## 5. Medidas (conferidas por script)

| Medida | Valor |
|---|---|
| Notas | 45 (E 20, R 15, C 10) em 20 unidades, 34 lições |
| Gatilho | 32 depois de palavra, 13 depois do diálogo |
| Blocos por nota | 1 em todas (nenhuma usa "1 de N") |
| Palavras do corpo | mínimo 35 (N16), **mediana 49**, média 48,9, **máximo 60** (N24 e N41) |
| Por tipo (mediana / máximo) | explicação 49 / 60; realidade 47 / 55; cultura 52 / 60 |
| Título + corpo | mínimo 43, mediana 57, máximo 68 |
| Mais de 80 palavras | **0** (corpo e título + corpo); mais de 60: 0; 55 ou mais: 7 (N24, N41, N20, N34, N15, N27, N43) |
| Exemplos | 59, todos com mp3 no `AUDIO_MANIFEST`; sem exemplo: N09 (3 variantes regionais sem áudio), N29, N31 |
| "pra" em texto visível | 21 notas, 4 dos 8 V/F |

Se a regra de tamanho for "completa até 60, breve até 25" (pergunta 3), nenhuma nota atual precisa ser cortada por tamanho.

---

## 6. Como o código ancora a nota hoje e o que muda com a chave `k`

**Hoje (conferido):**
- `trigger: { afterVocabIdx: N }` (posição no array `vocab`) ou `{ after: 'dialogue' }`.
- Nas unidades com lições, o "bloco" de aquisição é a **lição inteira**: `freshAcquisitionState` faz `blocks = [lesson.vocabIdx]`
  (`shared/core/quase-iguais-chaves.js:192`). `pendingConceptsForBlock` (`shared/core/exercicios-licao.js:168`) pega toda nota cujo índice
  está nessa lição, e `finishBlockIntro` (`shared/core/estado-trilha-desafios.js:612`) mostra a fila **depois da apresentação de todas as
  palavras da lição**, antes da checagem. Ou seja: o índice escolhe a lição, não o momento exato.
- `{ after: 'dialogue' }`: `pendingConceptsAfterDialogue` (`exercicios-licao.js:180`), chamada ao sair do passo do diálogo (`fr/app.js:2730`).
- O índice também escolhe a nota do painel de erro: `noteOrConceptReviewHTML(u, vocabIdx, true)` (`fr/app.js:3064`) só mostra a nota se
  `trigger.afterVocabIdx === vocabIdx` da palavra errada.
- O texto da nota na camada é por **id da nota** (`shared/course-layer.js:37-41` e `210-211`): estável. Os 45 ids são únicos e não colidem
  com os 73 do zh. Os exemplos são por posição dentro do bloco; o áudio, pelo texto em francês.
- Uma nota cujo índice não cai em nenhuma lição **nunca aparece** (hoje todas caem; conferido).

**O risco:** o v3 reordena ou troca palavras em 8 unidades com nota (`A1-2`, `A1-3`, `A1-5`, `A1-6`, `A1-7`, `A1-10`, `A1-15`, `A1-20`). Com
índice, a nota muda de palavra em silêncio (o `04`, 2.3 item 12, previa o script `fr/scripts/curriculo_ops.js` para reescrever os índices;
ele **ainda não existe**).

**Com a chave:**
- Conteúdo: `trigger: { afterKey: 'A1-3-v7' }` no lugar de `{ afterVocabIdx: 7 }` (só no fr; o zh continua com índice).
- Código: uma função `conceptTriggerIdx(u, c)` que devolve `u.vocab.findIndex(v => v.k === c.trigger.afterKey)` ou, sem chave, o
  `afterVocabIdx`; usada nos 2 pontos acima (`exercicios-licao.js:172` e `fr/app.js:3068`). O zh tem a sua própria
  `noteOrConceptReviewHTML` (`zh/app.js:3093`), que não muda.
- Conversão: script de uma vez, índice → `k` das 32 notas (o `k` é congelado e pode não bater com a posição depois de mexer, que é justamente
  o ponto). Corrigir os 3 gatilhos errados na mesma passada (N21 → *demain*, N23 → *lundi* ou diálogo, N38 → diálogo).
- Teste novo em `tests/curriculo-ids/`: toda `afterKey` existe na **mesma** unidade; toda nota cai numa lição; nenhuma nota em unidade de gramática.
- **Gatilho por frase não existe.** As notas novas do `10` presas a frase (*C'est mon père...*, *Quelle heure est-il ?*, *ce pantalon*,
  *Tu viens avec moi ?*) precisam ser ancoradas na **palavra** cujo cartão mostra a frase ("Na frase") ou no diálogo; frase não é um passo
  da lição (aparece no cartão e nos exercícios). Pergunta 8.
- Mudar a nota de unidade (N09 para a `A1-28`) = mover o objeto em `fr/content.js`, `layer.js` e `content.en.js`; como o id não muda, a
  "nota vista" (seção 7) continua valendo.

---

## 7. A lâmpada e o gatilho

**O que existe:**
- `STEP_STATE.conceptsShown` (`fr/app.js:1668`): `Set` com os ids das notas lidas. Recebe o id quando o aluno passa do último bloco
  (`exercicios-licao.js:204`). É **zerado ao abrir a unidade** (`fr/app.js:1706`) e **não é salvo**.
- Quem usa: o painel de erro (`noteOrConceptReviewHTML`, só notas já lidas nesta sessão) e a dica do V/F (`fr/app.js:1838`, cita o título da
  1ª nota lida). No Ponto de verificação aberto num dia novo o `Set` está vazio: a dica do V/F cai no texto genérico e o painel de erro não
  tem nota para mostrar.
- Progresso salvo: `serializeState` (`fr/app.js:646`) grava um JSON na tabela `progress` (`shared/auth.js:532`), um bloco por curso.
  `unitProgress[unitId]` é gravado inteiro e restaurado com `Object.assign` (também nas fusões, `shared/study-trail-model.js:524`): **um
  campo novo ali sobrevive ao salvar e carregar sem migration**.
- Botão: o ⚑ da lição fica na barra de foco (`fr/index.html:5531`, `zh/index.html:4677`, `#report-flag-lesson-btn`); a lâmpada entraria ao
  lado, com a mesma classe.

**Como se relaciona com o gatilho:** a nota continua aparecendo **uma vez** no fluxo, no mesmo ponto de hoje. Ao terminar de lê-la, o id
entra em `conceptsShown` **e** no progresso; a lâmpada mostra as notas da lição que já estão marcadas e abre qualquer uma num popover
(mesmo HTML de `renderConceptStep`: banner, título, corpo, exemplos com áudio). Antes da 1ª nota da lição, a lâmpada fica escondida ou apagada.

**O que falta:**
1. Campo salvo: recomendo **global por id** (`STATE.notesSeen = { idDaNota: 'AAAA-MM-DD' }`, 2 linhas em `serializeState` e
   `applySerializedState`), porque N09 muda de unidade; alternativa sem tocar no serializador: `unitProgress[uid].notesSeen = [...]`.
2. Função "notas desta lição" que resolve gatilho (chave ou diálogo) para a lição (a mesma conta da seção 6).
3. Ao abrir a unidade, iniciar `conceptsShown` com o que está salvo: o painel de erro e a dica do V/F passam a funcionar no Ponto de
   verificação e em outro dia.
4. Interface: botão, popover, contador; chaves de texto pt-BR e en (o site em inglês não pode ter português); validar fr e zh, claro e escuro
   (o código é compartilhado: `renderConceptStep` está em `shared/core/quase-iguais-pinyin.js:6`).
5. Revisão de lição (`STEP_STATE.lessonReview`) mostra a nota de novo no fluxo; decidir se pula a nota já vista (pergunta 11).
6. Notas novas em unidade já concluída (`09` B.13: quem concluiu não vê): a lâmpada pode indicar "nova" na lição; sem refazer lição (pergunta 12).

**Grátis x Premium:** notas, lâmpada e V/F das notas **grátis** (são parte da trilha, que é grátis); nada disso depende de paywall.

---

## 8. Perguntas para a dona

1. Plano do *in situ* (2.1): N06 completa; N10, nova da M1.6, N18 (vira *où*) e N45 breves; N30 cortada e absorvida pela nota *combien* da M5.1? *Recomendo sim.*
2. Nota da M1.6 *Tu fais quoi dans la vie ?* (`09`) entra como breve, e por isso N45 também fica breve? *Recomendo sim.*
3. Formato da nota breve: título + até ~25 palavras + 1 exemplo com áudio, sem "você já viu na unidade X" (o aluno pode ter pulado); completa até 60 palavras? *Recomendo sim.*
4. Queda do *ne*: a tela "Na rua" da M2.7 (g) ensina primeiro e N43 vira breve? *Recomendo sim.*
5. *de* na negação e na quantidade: N26 breve, N28 fica, N36 cortada? *Recomendo sim.*
6. N12 (*mon / ma*) fica como contato breve antes da gramática de possessivos, ou sai? *Recomendo breve.*
7. N09 sai do M1 e vai para a M5.1 só com a parte regional (gatilho *soixante-dix*)? *Recomendo sim (já é a pergunta 12 do `10`).*
8. Gatilho com chave `afterKey` no fr, convertido por script junto com a Etapa 0b; e nota "presa a frase" ancorada na palavra cujo cartão mostra a frase? *Recomendo sim.*
9. Corrigir os 3 gatilhos errados (N21, N23, N38) na mesma passada, e mostrar as notas da lição na ordem dos gatilhos (hoje N36 sai antes de N37)? *Recomendo sim.*
10. Salvar "nota vista" no progresso, global por id da nota? *Recomendo sim (sem migration).*
11. Lâmpada: mostra as notas já vistas **desta lição**; na lição Ponto de verificação (que não tem nota), mostra as da unidade? E na revisão de lição, a nota já vista vai direto para a lâmpada em vez de abrir no fluxo? *Recomendo sim às duas.*
12. Nota nova em unidade já concluída: lâmpada com sinal "nova" quando o aluno abrir a unidade, sem refazer lição? *Recomendo sim.*
13. V/F das notas: onde aparecem? (a) logo depois da nota; (b) no Ponto de verificação da unidade, como os 8 de hoje; (c) também na Revisão. E a explicação passa a aparecer no acerto **e** no erro? *Recomendo (b) e explicação nos dois casos.*
14. V/F de gramática coloquial só pergunta se o aluno **reconhece** a forma, nunca pede para produzi-la? *Recomendo sim.*
15. V/F não vira cartão nem entra no FSRS (como hoje)? *Recomendo sim.*
16. Trocar "pra" por "para" nas 21 notas e nos 4 V/F (muda texto publicado: `DELIBERATE_PT_CHANGES`)? *Recomendo sim.*
17. M4.1 ficaria com 7 notas. Quais entram? *Recomendo:* *moi aussi / moi non plus*, *c'est bon*, *avoir faim* e as 2 de hoje; *Pour moi* vai para a M8.2 com os tônicos; nasais vão para o "Som do módulo".
18. N02 fala de *tu* antes da M1.2: acrescentar meia frase em N02, ou subir N05 (*tu / vous*) para a M1.1? *Recomendo meia frase em N02.*
19. N33 dá *à vélo* como a forma; na fala *en vélo* é muito comum (minha confiança: **média**). Acrescentar uma linha ("na fala também se ouve *en vélo*")? *Recomendo conferir com a sua fonte antes.*
20. O rascunho do `09` para a nota da M1.3 diz "o **s** de *deux*": *deux* termina em **x** (a ligação [z] é do *x*). Corrigir antes de publicar? *Recomendo sim.*
21. Ajustes de texto: N19 (título confuso), N31 (exemplo com *pharmacie*), N44 ("que você já viu"), N15 (*robe*), N17 (enxugar preposições), N09 (reescrever ao mudar de unidade). Aprovar em lote? *Recomendo sim.*
22. Notas, lâmpada e V/F grátis? *Recomendo sim.*

---

## Apêndice A · Script usado para os números

```js
// node este-arquivo.js  (na raiz do repositório)
const c = require('./scripts/lib/course-content.js').load('fr');
const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync('fr/audio-manifest.js', 'utf8') + ';this.M=AUDIO_MANIFEST;', ctx);
const strip = s => (s || '').replace(/<[^>]+>/g, ' ');
const wc = s => strip(s).split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
const rows = [];
c.UNITS.forEach(u => (u.concepts || []).forEach(n => {
  const t = n.trigger, li = typeof t.afterVocabIdx === 'number'
    ? u.lessons.findIndex(l => l.vocabIdx.includes(t.afterVocabIdx))
    : u.lessons.findIndex(l => l.includesDialogue);
  const ex = n.blocks.flatMap(b => b.examples || []);
  rows.push({ unit: u.id, id: n.id, kind: n.kind || 'explicacao', cat: n.category || '', lesson: li + 1,
    body: n.blocks.reduce((s, b) => s + wc(b.body), 0), ex: ex.length, mp3: ex.filter(e => ctx.M[e.f]).length });
}));
console.table(rows);
const w = rows.map(r => r.body).sort((a, b) => a - b);
console.log('notas', rows.length, 'mediana', (w[22]), 'max', w[w.length - 1], '>80', w.filter(x => x > 80).length);
```
