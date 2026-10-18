# Auditoria do currículo atual da trilha de francês (A1 e A2)

Data: 2026-10-15. Somente leitura: nenhum arquivo existente foi alterado.
Objetivo: inventário fiel do que existe HOJE na trilha de francês, para a profa. Brune melhorar o currículo e depois usá-lo de molde para o português. Aqui não tem opinião sobre o que falta; onde algo é inferido, está escrito "inferência".

## 0. Fontes e método

| O que | Onde |
|---|---|
| Estrutura (ids, francês, ordem) | `fr/content.js` (4064 linhas) |
| Texto em português (títulos, objetivos, traduções, notas, perguntas) | `courses/fr-pt-BR/layer.js` (2466 linhas) |
| Camada em inglês (mesmas 30 unidades) | `fr/content.en.js` |
| Ditados | `fr/dictations.js` (+ `task` na camada) |
| Conjugação (banco de formas) | `fr/conjugation-data.js`; tempos e filtros em `fr/app.js:5112-5150` |
| Jogos da Conjugação | `fr/conj-games.js` |
| Desafios (Ouça e traduza, Acentuação, Expressões, Complete a frase) | lotes em `fr/scripts/challenges_import/lote-a1-m*.json`; o que está publicado vive na tabela `challenges` do Supabase (conferido ao vivo na produção, ver seção 2.4) |
| `fr/challenges.js` | só 12 desafios antigos de exemplo, todos `needs_review` (3 expressões B1, 3 Ouça e traduza A2, 6 Acentuação B1); não aparecem para o aluno |
| Como os exercícios são gerados | `fr/app.js:1549-1562` (passos da lição), `fr/app.js:2773-2835` (`buildExerciseSet`), `shared/core/exercicios-licao.js:143-165`, `shared/checkpoint-exam.js` (Ponto de verificação e Teste de Nível) |
| Validador curricular já existente | `node fr/scripts/check_grammar_input.js` (mapa `fr/scripts/grammar_input_map.json`) |

Todos os números abaixo saíram de scripts Node que carregam o conteúdo composto (base + camada) por `scripts/lib/course-content.js` (`load('fr')`), mais duas consultas SELECT só de leitura na produção (`challenges`). Contagens de "estrutura aparece em" usam expressões regulares sobre o francês das frases, diálogos e exemplos: é triagem (heurística), não análise linguística; os achados importantes foram conferidos à mão.

### Como uma unidade vira exercício (para entender as contagens)

Os exercícios das lições NÃO são escritos um a um; são gerados em tempo real a partir de campos da unidade:

| Campo da unidade | Vira |
|---|---|
| `vocab` | introdução palavra a palavra em blocos de 3 (`ACQ_BLOCK_SIZE`) + múltipla escolha de sentido, escuta e digitação (`pickVocabFormat`) |
| `phrases` com `blocks` | "ordenar" / "traduzir montando blocos" (máx. 4 por sessão, `REORDER_EXERCISE_CAP`) e "complete a frase" (cloze, 2 por sessão) |
| `phrases` com `scenario` | "o que você diz nesta situação?" (múltipla escolha) |
| `trueFalseExercises` | verdadeiro ou falso |
| `dialogue` + `dialogue.check` | leitura do diálogo + 3 checagens: `fill` (lacuna), `listen` (escuta), `understand` (compreensão) |
| `concepts` | cartões de explicação/nota que aparecem depois de uma palavra (`afterVocabIdx`) ou do diálogo |
| `grammar.blocks` + `grammar.exercises` | unidades de gramática: telas de explicação + lacunas digitadas |
| Lição `checkpoint` (fim de cada unidade) | consolidação com `buildExerciseSet` (vocabulário + frases + V/F + cloze) |
| Ponto de verificação do módulo | 12 itens digitados: 4 palavras, 3 frases, 3 escutas, 2 de gramática (`shared/checkpoint-exam.js:11-12`); aprovação 70% (`fr/app.js:4534`) |
| Teste de Nível A1 (`A1-final`) | 5 itens por módulo × 6 módulos = 30; aprovação 75% (`fr/app.js:4709-4710`) |

---

## 1. Mapa da trilha

### 1.1 Visão geral (números conferidos por script)

| Item | Total |
|---|---|
| Níveis declarados | 2 (`A1` "Nível 1 · Débutant", `A2` "Nível 2 · Élémentaire") |
| Níveis com conteúdo | **1 (só A1)**. A2 não tem módulo, unidade, ditado de trilha nem desafio de módulo |
| Módulos | 6 (A1-m1 a A1-m6) |
| Unidades | 30 = 20 de vocabulário/situação + 10 de gramática (`type:"grammar"`) |
| Lições (sem contar a lição "checkpoint") | 62 (19 unidades × 3 + A1-10 com 5) |
| Lições "checkpoint" (fim de unidade) | 20 |
| Itens de vocabulário | 204 (200 únicos; 4 repetidos entre unidades) |
| Frases (`phrases`) | 182, todas com `blocks` (ordenar/traduzir/cloze); 80 com `scenario` (4 por unidade) |
| Diálogos | 20 (1 por unidade de vocabulário), 87 falas |
| Checagens de diálogo | 60 (20 `fill`, 20 `listen`, 20 `understand`) |
| Verdadeiro ou falso | 8 (em 8 das 20 unidades) |
| Notas (`concepts`) | 45 = 20 explicações (1 por unidade) + 15 de realidade + 10 culturais |
| Unidades de gramática | 10, com 41 telas (blocos), 62 exemplos e 64 exercícios de lacuna |
| Ditados | 21 (6 grátis por módulo, 12 extras Premium por módulo, 3 de revisão do A1) |
| Desafios publicados ligados a módulo/unidade (produção) | 124 = 42 Ouça e traduza + 46 Acentuação + 30 Expressões + 6 Complete a frase |
| Conjugação | 241 verbos × 8 tempos (prática livre, sem ligação com unidade) |
| Jogos da Conjugação | 1 jogo ("Passé composé ou Imparfait?"), 22 frases |

### 1.2 Módulos e unidades (ordem real da trilha, `fr/content.js:4029-4061`)

| Módulo | Título | Unidades na ordem | Unid. vocab / gram. | Vocab | Frases | Falas de diálogo | Exerc. de gramática | Notas |
|---|---|---|---|---|---|---|---|---|
| A1-m1 | Primeiros contatos | A1-1, A1-2, A1-3, A1-g1, A1-4, A1-g2 | 4 / 2 | 40 | 36 | 18 | 12 | 13 |
| A1-m2 | Rotina do dia a dia | A1-5, A1-6, A1-g3, A1-7 | 3 / 1 | 30 | 31 | 13 | 6 | 7 |
| A1-m3 | Cidade e identidade | A1-8, A1-g4, A1-9, A1-10, A1-g10, A1-11, A1-12 | 5 / 2 | 54 | 44 | 23 | 12 | 8 |
| A1-m4 | Deslocando-se e cuidando de si | A1-13, A1-14, A1-g5, A1-15, A1-g6 | 3 / 2 | 30 | 27 | 13 | 14 | 5 |
| A1-m5 | Descrevendo o mundo ao redor | A1-16, A1-g7, A1-17, A1-18 | 3 / 1 | 30 | 23 | 12 | 6 | 7 |
| A1-m6 | Lazer e o passado | A1-19, A1-g8, A1-20, A1-g9 | 2 / 2 | 20 | 21 | 8 | 14 | 5 |

Depois de cada módulo vem o Ponto de verificação do módulo e a unidade opcional "Desafios do Módulo N". No fim do A1, o Teste de Nível `A1-final` (`fr/content.js:4063`) leva ao A2, que está vazio.

### 1.3 Unidades e lições (id, título, ordem, contagens)

Colunas: V = vocabulário; F = frases (cenário); D = falas do diálogo; VF = verdadeiro/falso; N = notas (explicação/realidade/cultural); "Novas" = palavras francesas das frases e do diálogo que ainda não tinham aparecido em nenhum vocabulário, frase, diálogo ou exemplo anterior da trilha (inclui nomes próprios); linha = início da unidade em `fr/content.js` / `courses/fr-pt-BR/layer.js`.

| # | Unidade | Título | Lições (palavras por lição) | V | F (cen.) | D | VF | N (e/r/c) | Novas | Linhas |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | A1-1 | Cumprimentar e se despedir | ola-e-tchau, informal-agradecer, cortesia-e-como-vai+diálogo, checkpoint (3/3/4) | 10 | 9 (4) | 4 | 1 | 1/2/1 | 18 | 13 / 8 |
| 2 | A1-2 | Se apresentar | pronomes-e-nome, nome-e-ser, nacionalidades+diálogo, checkpoint (3/3/4) | 10 | 8 (4) | 5 | 1 | 1/2/0 | 16 | 208 / 100 |
| 3 | A1-3 | Números e idade | primeiros-numeros, contar-ate-vinte, idade+diálogo, checkpoint (3/3/4) | 10 | 8 (4) | 4 | 0 | 1/2/0 | 20 | 384 / 193 |
| 4 | A1-g1 | Verbos avoir e être | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 9 | 557 / 269 |
| 5 | A1-4 | Família | nuclear, irmaos, completa+diálogo, checkpoint (3/3/4) | 10 | 11 (4) | 5 | 0 | 1/1/1 | 18 | 614 / 315 |
| 6 | A1-g2 | Adjetivos possessivos | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 8 | 812 / 405 |
| 7 | A1-5 | Comida e bebida | pao-agua-cafe, leite-queijo-maca, comer-beber-detestar+diálogo, checkpoint (3/3/4) | 10 | 12 (4) | 5 | 1 | 1/0/1 | 29 | 877 / 455 |
| 8 | A1-6 | Horas e rotina diária | horas-e-periodos, noite-acordar-levantar, rotina-diaria+diálogo, checkpoint (3/3/4) | 10 | 10 (4) | 4 | 0 | 1/0/1 | 22 | 1072 / 542 |
| 9 | A1-g3 | Verbos do 1º grupo e verbos pronominais | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 7 | 1245 / 617 |
| 10 | A1-7 | Dias e meses | dias-da-semana, ontem-amanha-semana, meses-e-data+diálogo, checkpoint (3/3/4) | 10 | 9 (4) | 4 | 0 | 1/1/1 | 14 | 1302 / 663 |
| 11 | A1-8 | Lugares e orientação | lugares-na-cidade, hospital-estacao-em-frente, direcoes+diálogo, checkpoint (3/3/4) | 10 | 7 (4) | 5 | 1 | 1/0/0 | 9 | 1481 / 747 |
| 12 | A1-g4 | Preposições com países e cidades | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 12 | 1613 / 825 |
| 13 | A1-9 | Nacionalidades | nacionalidades-1, nacionalidades-2, nacionalidade-e-origem+diálogo, checkpoint (3/3/4) | 10 | 5 (4) | 5 | 1 | 1/1/0 | 5 | 1666 / 871 |
| 14 | A1-10 | Compras | roupas-e-preco, tamanho-e-loja, numeros-30-50, numeros-60-80, numeros-90-100+diálogo, checkpoint (3/3/3/3/2) | 14 | 14 (4) | 5 | 0 | 1/1/0 | 19 | 1803 / 954 |
| 15 | A1-g10 | Números de 70 a 99 | (gramática) 5 telas, 6 exercícios | - | - | - | - | - | 8 | 2016 / 1046 |
| 16 | A1-11 | Fazendo compras de mercado | carne-frango-legumes, salada-arroz-massa, acucar-sal-ovo-sobremesa+diálogo, checkpoint (3/3/4) | 10 | 11 (4) | 4 | 0 | 1/0/1 | 15 | 2090 / 1093 |
| 17 | A1-12 | Pesos e quantidades | quilo-meio-quilo-litro, grama-pouco-muito, suficiente-demais-fatia-garrafa+diálogo, checkpoint (3/3/4) | 10 | 7 (4) | 4 | 0 | 1/0/0 | 4 | 2268 / 1175 |
| 18 | A1-13 | Clima e estações | tempo-bonito-frio-quente, chuva-neve-sol, estacoes-do-ano+diálogo, checkpoint (3/3/4) | 10 | 8 (4) | 4 | 1 | 1/0/0 | 8 | 2405 / 1246 |
| 19 | A1-14 | Transporte | onibus-trem-metro, carro-bicicleta-pe, pegar-transporte-passagem+diálogo, checkpoint (3/3/4) | 10 | 9 (4) | 4 | 0 | 1/0/1 | 8 | 2551 / 1324 |
| 20 | A1-g5 | Verbos faire e prendre | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 11 | 2718 / 1404 |
| 21 | A1-15 | Corpo e saúde | cabeca-barriga-mao, pe-doente-medico, farmacia-dor-febre+diálogo, checkpoint (3/3/4) | 10 | 10 (4) | 5 | 1 | 1/1/0 | 9 | 2775 / 1450 |
| 22 | A1-g6 | Verbos modais e il faut | (gramática) 4 telas, 8 exercícios | - | - | - | - | - | 9 | 2950 / 1538 |
| 23 | A1-16 | Cores e descrições | vermelho-azul-verde, amarelo-preto-branco, tamanho-e-personalidade+diálogo, checkpoint (3/3/4) | 10 | 6 (4) | 4 | 0 | 1/1/1 | 9 | 3025 / 1597 |
| 24 | A1-g7 | Comparativos | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 10 | 3182 / 1676 |
| 25 | A1-17 | A casa e os cômodos | casa-apartamento-quarto, cozinha-banheiro-sala, porta-janela-tem-nao-tem+diálogo, checkpoint (3/3/4) | 10 | 12 (4) | 4 | 0 | 1/1/1 | 11 | 3230 / 1724 |
| 26 | A1-18 | Onde as coisas estão | cama-mesa-cadeira, sofa-luminaria-em-cima, embaixo-frente-atras-lado+diálogo, checkpoint (3/3/4) | 10 | 5 (4) | 4 | 0 | 1/0/0 | 1 | 3434 / 1814 |
| 27 | A1-19 | Lazer e atividades | cinema-musica-esporte, ler-jogar-dancar, cantar-fim-de-semana-sair-filme+diálogo, checkpoint (3/3/4) | 10 | 11 (4) | 4 | 1 | 1/1/1 | 14 | 3555 / 1883 |
| 28 | A1-g8 | Advérbios de frequência | (gramática) 4 telas, 6 exercícios | - | - | - | - | - | 10 | 3754 / 1978 |
| 29 | A1-20 | Expressões de tempo passado | ontem-anteontem-semana-passada, fim-de-semana-mes-ano-passados, dois-dias-atras-ja-recentemente+diálogo, checkpoint (3/3/4) | 10 | 10 (4) | 4 | 0 | 1/1/0 | 10 | 3802 / 2020 |
| 30 | A1-g9 | O passé composé | (gramática) 4 telas, 8 exercícios | - | - | - | - | - | 7 | 3975 / 2101 |

Padrão fixo das 20 unidades de vocabulário (fato): 3 lições de vocabulário (a 3ª com o diálogo) + 1 lição "checkpoint"; 10 palavras (exceto A1-10, 14); 4 frases com cenário; diálogo de 4 ou 5 falas com exatamente 3 checagens (fill, listen, understand); exatamente 1 nota de explicação por unidade. Padrão fixo das 10 de gramática: 4 telas (A1-g10 tem 5), a última sempre "Très bien! 🎉" com tabela; 6 exercícios (A1-g6 e A1-g9 têm 8).

---

## 2. Unidade por unidade

Convenções: **Objetivo** é o campo `goal` da camada (texto da autora); a **leitura comunicativa** ao lado é inferência minha. "Ensinada" = aparece numa unidade de gramática ou numa nota de explicação; "só aparece" = está em frase/diálogo sem explicação. Desafios = publicados na produção (tabela `challenges`, conferido 2026-10-15). Conjugação: o módulo de Conjugação é prática livre e não tem ligação com unidade; listo quais verbos da unidade existem no banco (`#n` = posição no banco, que o filtro "Top N" usa como ranking) e quais faltam.

### Módulo A1-m1 · Primeiros contatos

**A1-1 Cumprimentar e se despedir**
- Objetivo: "Cumprimentar alguém, se despedir e agradecer numa interação básica." (inferência: abrir e fechar um contato social, formal e informal).
- Vocabulário: saudações e despedidas (bonjour, bonsoir, salut, au revoir, à bientôt); cortesia (merci, de rien, s'il vous plaît, pardon); estado (ça va).
- Estruturas: só aparecem: je m'appelle (pronominal), negação "je ne comprends pas", inversão "Comment allez-vous ?", c'est, pronome tônico "et toi ?". Ensinado explicitamente: escolha bonjour/bonsoir/salut (nota de explicação).
- Funções: cumprimentar, despedir-se, agradecer, responder a agradecimento, pedir algo com "por favor", dizer que não entendeu, perguntar como vai.
- Fonética/ortografia: nada explícito. Formas de escrita informal em notas (STP, A+).
- Notas: explicação "Bonjour ou Bonsoir?"; realidade/informal "s'il te plaît / STP" e "à plus / A+"; cultural/costume "la bise".
- Desafios: Ouça e traduza 2 ("Bonsoir, ça va ?", "Un café, s'il vous plaît."); Acentuação 1 ("s'il vous plaît"); Expressões 4 (Comme ci, comme ça; Pas mal; Ça marche !; Pas de problème !). Ditado do módulo: d1 (grátis), d1-p1, d1-p2.
- Conjugação: nenhum verbo no vocabulário.

**A1-2 Se apresentar**
- Objetivo: "Dizer o nome, a nacionalidade e perguntar o mesmo para o outro."
- Vocabulário: pronomes (je, tu); identidade (s'appeler, le nom, être); países e nacionalidades (la France, le Brésil, français/française, brésilien/brésilienne, le pays).
- Estruturas: só aparecem: être no presente (je suis, tu es), -er (j'aime), pronominal (tu t'appelles), "quel" (de quel pays), pergunta in situ, concordância de nacionalidade no feminino. Ensinado: tu x vous (nota de explicação).
- Funções: apresentar-se, perguntar o nome, dizer e perguntar a nacionalidade/país.
- Fonética: nota de realidade "tu es → t'es" (única nota que fala de pronúncia, `courses/fr-pt-BR/layer.js:174`).
- Notas: explicação tu/vous; realidade/gramática coloquial "t'es" e "Tu t'appelles comment ?".
- Desafios: OT 2; Acentuação 3 (brésilien, brésilienne, être); Expressões 1 (Enchanté !).
- Conjugação: appeler #32, être #1.

**A1-3 Números e idade**
- Objetivo: "Contar do zero a cem e dizer/perguntar a idade."
- Vocabulário: números (zéro, un/une, deux, trois, dix, vingt); idade (l'âge, avoir, ans, combien).
- Estruturas: só aparecem: avoir no presente, inversão "Quel âge as-tu ?", possessivos (ton père, ta fille), faire impessoal ("Il fait zéro degré"), être plural (ils sont). Ensinado: idade com avoir (nota de explicação "J'ai vingt ans").
- Funções: dizer e perguntar a idade, contar pessoas, perguntar preço (frase "Combien ça coûte ?").
- Notas: explicação avoir + idade; realidade/regional "vingt" e a base 20 (menciona que não é igual em todo lugar); realidade "T'as quel âge ?".
- Desafios: OT 2; Acentuação 2 (zéro, âge); Expressões 0.
- Conjugação: avoir #2.

**A1-g1 Verbos avoir e être** (gramática)
- Objetivo: "Conjugar avoir e être no presente e reconhecer seu uso nas frases."
- Ensina: tabelas completas de être e avoir no presente; avoir em expressões onde o português usa "estar com" (avoir faim, soif, peur, raison). Menciona que être é auxiliar "no A2" (`layer.js:291`).
- Exercícios: 6 lacunas (suis, as, sommes, ont, êtes, a).
- Conjugação: être #1, avoir #2 (grupo `core`).

**A1-4 Família**
- Objetivo: "Apresentar os membros da família e dizer quantos irmãos você tem."
- Vocabulário: família nuclear e cônjuges (la famille, le père, la mère, le frère, la sœur, les parents, le fils, la fille, le mari, la femme).
- Estruturas: só aparecem: possessivos (mon, ma, leurs), -er no plural (jouent, adorent, aiment, habitent), voici, "il a quel âge ?". Ensinado: mon x ma (nota de explicação, antes da gramática A1-g2).
- Funções: apresentar a família, dizer quantos irmãos tem, dizer o nome e a idade de um parente.
- Notas: explicação mon/ma; realidade/informal papa/maman; cultural/costume repas dominical.
- Desafios: OT 2; Acentuação 3 (père, mère, frère); Expressões 0.
- Conjugação: nenhum verbo no vocabulário.

**A1-g2 Adjetivos possessivos** (gramática)
- Objetivo: "Usar mon/ma/mes, ton/ta/tes, son/sa/ses e os demais adjetivos possessivos corretamente."
- Ensina: concordância com a coisa possuída; notre/votre/leur e plurais; mon/ton/son antes de feminino com vogal (mon amie); tabela completa.
- Exercícios: 6 lacunas (mon, ma, mes, notre, leurs, mon).

### Módulo A1-m2 · Rotina do dia a dia

**A1-5 Comida e bebida**
- Objetivo: "Pedir comida e bebida num café ou restaurante, e dizer do que você gosta ou não gosta de comer."
- Vocabulário: alimentos e bebidas (le pain, l'eau, le café, le lait, le fromage, la pomme, le poisson); verbos (manger, boire, détester).
- Estruturas: só aparecem: partitivo (du pain, de l'eau), "je voudrais" (condicional de cortesia), vouloir (tu veux), futur proche ("Je vais détester ce plat", `fr/content.js:1036`), ou/mais. Ensinado: artigo definido com verbos de gosto x partitivo para quantidade (nota de explicação "J'aime LE café ou je bois DU café?").
- Funções: pedir num café, pedir a conta, dizer do que gosta/não gosta.
- Notas: explicação le x du; cultural/costume croissant não é diário.
- Desafios: OT 2; Acentuação 2 (café, détester); Expressões 2 (Bon appétit !; À table !). Ditados do módulo: d2, d2-p1, d2-p2.
- Conjugação: manger #8, boire #215, aimer #6, vouloir #229; détester AUSENTE do banco.

**A1-6 Horas e rotina diária**
- Objetivo: "Dizer as horas e descrever a rotina do dia a dia."
- Vocabulário: tempo do dia (l'heure, le matin, le midi, le soir, minuit); rotina (se réveiller, se lever, manger, travailler, dormir).
- Estruturas: só aparecem: pronominais (je me réveille, tu te lèves), futur proche (3 frases: "Il va se réveiller tôt demain", `fr/content.js:1186`), devoir ("Il doit travailler jusqu'à minuit", `fr/content.js:1202`), inversão "Quelle heure est-il ?". Ensinado: horas com être e "il" impessoal (nota de explicação).
- Funções: perguntar e dizer as horas, descrever a rotina, perguntar a que horas alguém faz algo.
- Notas: explicação "Il est huit heures"; cultural/costume almoço longo.
- Desafios: OT 2; Acentuação 2 (se réveiller, tôt); Expressões 2 (À tout à l'heure !; Tout de suite).
- Conjugação: manger #8, travailler #15, dormir #170, regarder #14; se réveiller e se lever AUSENTES (nem réveiller nem lever estão no banco).

**A1-g3 Verbos do 1º grupo e verbos pronominais** (gramática)
- Objetivo: "Conjugar verbos regulares em -er e verbos pronominais (reflexivos) no presente."
- Ensina: terminações -e/-es/-e/-ons/-ez/-ent; manger → mangeons; pronominais com me/te/se/nous/vous/se; tabelas de travailler e se lever.
- Exercícios: 6 lacunas (me réveille, te lèves, mangeons, travaille, aimez, se lèvent).
- Conjugação: travailler #15, manger #8, aimer #6; se lever/se réveiller AUSENTES.

**A1-7 Dias e meses**
- Objetivo: "Dizer os dias da semana, meses e marcar um encontro."
- Vocabulário: dias (lundi, mardi); dêiticos de tempo (aujourd'hui, demain, hier); calendário (la semaine, le mois, janvier, décembre, la date).
- Estruturas: só aparecem: inversão "Quel jour sommes-nous ?", "on" (on se voit), en + mês, "la semaine prochaine, je pars". Ensinado: à demain x à bientôt x au revoir (nota de explicação).
- Funções: dizer a data e o dia, marcar e recusar um encontro, propor outro dia.
- Notas: explicação despedidas; cultural/história nomes dos dias; realidade "On est lundi".
- Desafios: OT 2; Acentuação 4 (décembre, février, août, à demain); Expressões 1 (Bonne journée !).
- Conjugação: partir #168, voir #232 (nas frases).

### Módulo A1-m3 · Cidade e identidade

**A1-8 Lugares e orientação**
- Objetivo: "Perguntar e indicar como chegar a um lugar na cidade."
- Vocabulário: lugares (la rue, la place, le musée, l'hôpital, la gare); direções e distância (tout droit, à gauche, à droite, près, loin).
- Estruturas: só aparecem: imperativo ("Tournez à gauche", `fr/content.js:1537`; "Excusez-moi"), où est, c'est + lugar. Ensinado: où est x il y a (nota de explicação, depois do diálogo).
- Funções: pedir informação de caminho, dar direções, perguntar distância, agradecer.
- Notas: só a explicação (0 de realidade, 0 cultural).
- Desafios: OT 2 (no banco; o lote do repo tem 1); Acentuação 2 (près, hôpital); Expressões 2 (Excusez-moi !; Je vous en prie). Ditados do módulo: d3, d3-p1, d3-p2.
- Conjugação: tourner #72, aller #3.

**A1-g4 Preposições com países e cidades** (gramática)
- Objetivo: "Usar à, en, au e aux corretamente com nomes de cidades e países."
- Ensina: à + cidade; en + país feminino; au + masculino; aux + plural; tabela.
- Exercícios: 6 lacunas (à, au, en, aux, à, au).
- Conjugação: habiter #7, aller #3, voyager #41, vivre #197.

**A1-9 Nacionalidades**
- Objetivo: "Dizer sua nacionalidade e a de outras pessoas, no masculino e no feminino."
- Vocabulário: 8 pares de nacionalidade m/f (français, brésilien, américain, anglais, espagnol, italien, allemand, portugais); la nationalité; venir de.
- Estruturas: só aparecem: venir de/du + país ("Je viens du Portugal"), inversão "D'où viens-tu ?", "Tu es d'où ?", en/au + país (do A1-g4). Ensinado: être + nacionalidade x venir de + país (nota de explicação).
- Funções: dizer e perguntar nacionalidade e origem, dizer onde mora.
- Notas: explicação être x venir de; realidade "Tu es d'où ?".
- Desafios: OT 2; Acentuação 2 (nationalité, où); Expressões 0.
- Conjugação: venir #166, habiter #7.

**A1-10 Compras**
- Objetivo: "Perguntar preços (com números até cem), experimentar roupas e comprar numa loja."
- Vocabulário: roupas (le pantalon, la robe); preço e loja (cher, pas cher, la taille, le magasin); números (trente, quarante, cinquante, soixante, soixante-dix, quatre-vingts, quatre-vingt-dix, cent).
- Estruturas: só aparecem: demonstrativos (ce, cette, ces), pouvoir (je peux essayer), pronome objeto ("je la prends", `fr/content.js:2002`), negação (ce n'est pas cher), "trop + adjetivo", inversão "Quelle taille faites-vous ?". Ensinado: je voudrais x je peux (nota de explicação).
- Funções: perguntar preço, pedir para experimentar, dizer o tamanho, decidir a compra.
- Notas: explicação voudrais/peux; realidade "Ça coûte combien ?".
- Desafios: OT 2; Acentuação 1 (coûte); Expressões 2 (Ça fait combien ?; C'est trop cher !).
- Conjugação: coûter #66, essayer #40, chercher #9, prendre #186, fermer #61, pouvoir #228.

**A1-g10 Números de 70 a 99** (gramática)
- Objetivo: "Entender e formar corretamente os números de setenta a noventa e nove."
- Ensina: dezenas regulares até 60; 70 = 60+10; 71 com "et"; 80 = 4×20 (s some quando vem número depois); 90 = 4×20+10; tabela.
- Exercícios: 6 (escrever 70, 71, 80, 81, 90, 99 por extenso).

**A1-11 Fazendo compras de mercado**
- Objetivo: "Montar uma lista de compras e dizer o que você come ou não come no dia a dia."
- Vocabulário: carnes (la viande, le poulet); acompanhamentos (les légumes, la salade, le riz, les pâtes); temperos (le sucre, le sel); l'œuf; le dessert.
- Estruturas: só aparecem: qu'est-ce que ("Qu'est-ce qu'on achète ?"), on, partitivo plural (des légumes), "tous les jours". Ensinado: "pas de" depois de negação (nota de explicação "Je ne mange pas DE viande").
- Funções: montar lista de compras, dizer o que come ou não come, oferecer sobremesa.
- Notas: explicação negação + de; cultural/costume le marché.
- Desafios: OT 2; Acentuação 2 (légumes, pâtes); Expressões 0.
- Conjugação: acheter #31, prendre #186, manger #8.

**A1-12 Pesos e quantidades**
- Objetivo: "Pedir quantidades específicas ao fazer compras: kilo, litre, un peu de, beaucoup de..."
- Vocabulário: medidas (un kilo, un demi-kilo, un litre, un gramme, une tranche, une bouteille); quantidade (un peu de, beaucoup de, assez de, trop de).
- Estruturas: só aparecem: il y a ("Il y a beaucoup de monde ici", `fr/content.js:2362`, antes de il y a virar vocabulário no A1-17), "Je n'ai pas assez de temps". Ensinado: de depois de expressão de quantidade (nota de explicação).
- Funções: pedir quantidade na feira, responder "e mais alguma coisa?".
- Notas: só a explicação.
- Desafios: OT 2; Acentuação 1 (très); Expressões 1 (Et avec ça ?).
- Conjugação: prendre #186, vouloir #229.

### Módulo A1-m4 · Deslocando-se e cuidando de si

**A1-13 Clima e estações**
- Objetivo: "Falar sobre o tempo e as estações do ano."
- Vocabulário: tempo (il fait beau/froid/chaud, il pleut, il neige, le soleil); estações (le printemps, l'été, l'automne, l'hiver).
- Estruturas: só aparecem: inversão "Quel temps fait-il ?", préférer, "souvent" (advérbio de frequência antes do A1-g8), en + estação. Ensinado: il fait chaud x j'ai chaud (nota de explicação).
- Funções: perguntar e descrever o tempo, dizer a estação preferida.
- Notas: só a explicação.
- Desafios: OT 2; Acentuação 1 (été); Expressões 2 (Il pleut des cordes; Quel temps !). Ditados do módulo: d4, d4-p1, d4-p2.
- Conjugação: faire #4, pleuvoir #238, préférer #34; neiger AUSENTE.

**A1-14 Transporte**
- Objetivo: "Pegar um transporte público e comprar uma passagem."
- Vocabulário: meios (le bus, le train, le métro, la voiture, le vélo, à pied); uso (prendre, l'arrêt, le billet, la station).
- Estruturas: só aparecem: prendre (antes do A1-g5), futur proche ("Je vais prendre le bus", `fr/content.js:2651`), "plus rapide" (comparativo sem "que", `fr/content.js:2675`, antes do A1-g7), adjetivo antes do nome (la bonne direction). Ensinado: en métro x à pied (nota de explicação).
- Funções: perguntar direção do trem, comprar passagem, perguntar preço, dizer como vai ao trabalho.
- Notas: explicação en/à; cultural/história metrô de Paris.
- Desafios: OT 2; Acentuação 4 (métro, vélo, arrêt, à pied); Expressões 1 (Bon voyage !).
- Conjugação: prendre #186, aller #3, partir #168.

**A1-g5 Verbos faire e prendre** (gramática)
- Objetivo: "Conjugar os verbos irregulares faire e prendre no presente."
- Ensina: usos de faire (clima, "que fais-tu"), de prendre (transporte, comida); irregularidades do plural; tabelas.
- Exercícios: 6 lacunas (fait, prends, faisons, prenez, prennent, fais).
- Conjugação: faire #4, prendre #186.

**A1-15 Corpo e saúde**
- Objetivo: "Descrever sintomas simples e ir ao médico."
- Vocabulário: corpo (la tête, le ventre, la main, le pied); saúde (malade, le médecin, la pharmacie, avoir mal, la fièvre, se sentir).
- Estruturas: só aparecem: avoir mal à/au, partitivo (de la fièvre), depuis, devoir ("Vous devez vous reposer", antes do A1-g6), futur proche negativo ("Il ne va pas se sentir bien demain", `fr/content.js:2914`), "si ça continue", "qu'est-ce qui". Ensinado: avoir mal à x être malade (nota de explicação).
- Funções: dizer onde dói, dizer que está doente, perguntar onde fica a farmácia, consulta médica.
- Notas: explicação avoir mal/être malade; realidade/informal "Ça va pas ?".
- Desafios: OT 2; Acentuação 3 (tête, médecin, fièvre); Expressões 2 (Bon rétablissement !; À tes souhaits !).
- Conjugação: sentir #171, avoir #2, arriver #16, continuer #25, devoir #230; reposer AUSENTE.

**A1-g6 Verbos modais e il faut** (gramática)
- Objetivo: "Conjugar vouloir, pouvoir, devoir e savoir, e entender quando usar il faut no lugar de devoir."
- Ensina: vouloir/pouvoir; devoir/savoir (cita que connaître vem "mais adiante", `layer.js:1550`); il faut impessoal x devoir pessoal; tabelas dos 4 verbos.
- Exercícios: 8 lacunas.
- Conjugação: vouloir #229, pouvoir #228, devoir #230, savoir #231, falloir #237.

### Módulo A1-m5 · Descrevendo o mundo ao redor

**A1-16 Cores e descrições**
- Objetivo: "Descrever cores, objetos e características de pessoas."
- Vocabulário: cores (rouge, bleu, vert, jaune, noir, blanc); descrição (grand, petit, joli, gentil).
- Estruturas: só aparecem: concordância feminina (bleue, gentille, jolie), avoir + cheveux. Ensinado: posição do adjetivo (nota de explicação "une jolie robe rouge").
- Funções: descrever objetos e pessoas, dizer a cor preferida.
- Notas: explicação posição do adjetivo; realidade/informal "sympa"; cultural/história bandeira.
- Desafios: OT 2; Acentuação 1 (très); Expressões 2 (Ça te va bien !; Ça te plaît ?). Ditados do módulo: d5, d5-p1, d5-p2.
- Conjugação: aimer #6.

**A1-g7 Comparativos** (gramática)
- Objetivo: "Comparar pessoas e coisas usando plus, moins e aussi... que."
- Ensina: plus/moins/aussi... que; bon → meilleur, bien → mieux; tabela.
- Exercícios: 6 lacunas.

**A1-17 A casa e os cômodos**
- Objetivo: "Descrever uma casa, dizer o que tem (e o que não tem) nela."
- Vocabulário: moradia (la maison, l'appartement); cômodos (la chambre, la cuisine, la salle de bain, le salon); partes (la porte, la fenêtre); existência (il y a, il n'y a pas de).
- Estruturas: il y a vira vocabulário; negação + de (já ensinada no A1-11). Ensinado: il y a x il n'y a pas de (nota de explicação).
- Funções: descrever a casa, perguntar quantos cômodos, dizer o que não tem.
- Notas: explicação il y a/negação; realidade "y'a"; cultural/costume rez-de-chaussée.
- Desafios: OT 2; Acentuação 2 (fenêtre, étage); Expressões 3 (Fais comme chez toi; Chez moi; Bienvenue !).
- Conjugação: donner #11, fermer #61.

**A1-18 Onde as coisas estão**
- Objetivo: "Descrever a posição de móveis e objetos usando preposições de lugar."
- Vocabulário: móveis (le lit, la table, la chaise, le canapé, la lampe); preposições (sur, sous, devant, derrière, à côté de).
- Estruturas: où est, il y a, pronome "il/elles" retomando objeto. Ensinado: sur x dans (nota de explicação).
- Funções: perguntar e dizer onde está um objeto.
- Notas: só a explicação.
- Desafios: OT 2; Acentuação 3 (derrière, canapé, à côté de); Expressões 0.
- Conjugação: nenhum verbo novo.

### Módulo A1-m6 · Lazer e o passado

**A1-19 Lazer e atividades**
- Objetivo: "Falar sobre hobbies e combinar programas de fim de semana."
- Vocabulário: lazer (le cinéma, la musique, le sport, le film, le week-end); atividades (lire, jouer, danser, chanter, sortir).
- Estruturas: só aparecem: futur proche ("On va sortir samedi soir"), "on" = nous, qu'est-ce que, "jouer de", "ne sais pas encore". Ensinado: jouer de x jouer à (nota de explicação).
- Funções: falar de hobbies, convidar, combinar programa, dizer que ainda não sabe.
- Notas: explicação jouer de/à; cultural/história cinema; realidade queda do "ne".
- Desafios: OT 3; Acentuação 3 (cinéma, écouter, été); Expressões 3 (C'est parti !; Bon week-end !; Bonne soirée !). Ditados do módulo: d6, d6-p1, d6-p2.
- Conjugação: lire #194, jouer #12, danser #63, chanter #27, sortir #169, écouter #13, commencer #24, voir #232, savoir #231; adorer AUSENTE.

**A1-g8 Advérbios de frequência** (gramática)
- Objetivo: "Usar toujours, souvent, parfois, rarement e jamais pra dizer com que frequência você faz algo."
- Ensina: escala de frequência; posição depois do verbo conjugado; ne... jamais; tabela.
- Exercícios: 6 lacunas.

**A1-20 Expressões de tempo passado**
- Objetivo: "Aprender marcadores de tempo pra falar sobre o passado, como preparação pro passé composé."
- Vocabulário: marcadores de passado (hier, avant-hier, la semaine dernière, le week-end dernier, le mois dernier, l'année dernière, il y a deux jours, ce matin, déjà, récemment).
- Estruturas: só aparecem: passé composé com avoir em 9 das 10 frases e no diálogo (j'ai visité, j'ai mangé, il a plu, j'ai appris...), passé composé com être no diálogo ("On est allés au cinéma", `fr/content.js:3962`). Ensinado: hier x la semaine dernière (nota de explicação, que diz "o passé composé que você já viu", `layer.js:2088`).
- Funções: contar o que fez ontem/no fim de semana, perguntar se alguém já fez algo.
- Notas: explicação hier/semaine dernière; realidade "T'as fait quoi hier ?".
- Desafios: OT 3; Acentuação 4 (dernière, récemment, année, préféré); Expressões 2 (Quoi de neuf ?; Ça fait longtemps !).
- Conjugação: manger #8, pleuvoir #238, voyager #41, apprendre #187, boire #215, changer #26, travailler #15, faire #4, aller #3; visiter AUSENTE.

**A1-g9 O passé composé** (gramática)
- Objetivo: "Conjugar o passé composé com avoir e com être pra falar sobre ações do passado."
- Ensina: avoir + particípio (-er → -é); particípios irregulares (fait, pris); être com verbos de movimento e TODOS os pronominais, com concordância; tabela. A última tela diz "Você concluiu o nível A1!" (`layer.js:2126`).
- Exercícios: 8 lacunas (ai, as, a, avons, est, suis, ont, êtes).
- Desafios: Complete a frase (gramática) 6 (`cloze_grammar`, todos desta unidade).
- Conjugação: tempo `passeCompose` existe para os 241 verbos; Jogo "Passé composé ou Imparfait?" (22 frases, 13 verbos) trabalha passé composé x imparfait, e o imparfait não é ensinado na trilha.

### 2.4 Desafios: o que está publicado (produção, 2026-10-15)

| Módulo | Ouça e traduza | Acentuação | Expressões | Complete a frase | Ditados (grátis + extras) |
|---|---|---|---|---|---|
| A1-m1 | 8 | 9 | 5 | 0 | 1 + 2 |
| A1-m2 | 6 | 8 | 5 | 0 | 1 + 2 |
| A1-m3 | 10 | 8 | 5 | 0 | 1 + 2 |
| A1-m4 | 6 | 8 | 5 | 0 | 1 + 2 |
| A1-m5 | 6 | 6 | 5 | 0 | 1 + 2 |
| A1-m6 | 6 | 7 | 5 | 6 | 1 + 2 |
| Revisão do A1 (`A1-revisao`) | - | - | - | - | 1 + 2 (r1 a r3, 39 a 43 palavras) |

Fora dos módulos (banco geral de Desafios, sem `moduleId`): 92 Expressões publicadas (A1 3, A2 15, B1 55, B2 19), 9 Acentuação (A1 1, A2 1, B1 6, B2 1), 6 Ouça e traduza (A1 1, A2 3, B1 1, B2 1) + 1 aprovado não publicado.
Ditados da trilha: 18 a 33 palavras cada; o validador `python3 fr/scripts/check_dictation_vocab.py` só acusa nomes próprios (Clara, Julie, Silva, Sofia, Tom, Léa).
Grátis x Premium hoje: ditado "grátis" = 1 por módulo + r1; os extras são marcados `free:false`; paywall dos Desafios desligado (`CHALLENGE_PAYWALL_ENABLED=false`), então na prática tudo abre.

### 2.5 Conjugação (fora da trilha)

- 241 verbos em 6 grupos: `core` 4 (être, avoir, aller, faire), `g1` 125, `g2` 32, `g3ir` 21, `g3re` 45, `g3oir` 14.
- 8 tempos para todos os verbos: présent, passé composé, imparfait, plus-que-parfait, futur simple, conditionnel présent, subjonctif présent, impératif (`fr/app.js:5112-5123`). Futur proche foi tirado da prática (só aller + infinitivo).
- Não há vínculo unidade → verbo/tempo: o aluno escolhe livremente.
- Na trilha A1, o único tempo ensinado além do présent é o passé composé (A1-g9). Os outros 6 tempos do módulo de Conjugação não aparecem em nenhuma unidade.

---

## 3. Progressão gramatical global

"Ensinada" = unidade de gramática (A1-gN) ou nota de explicação. "Primeira aparição" = primeira frase/diálogo/exemplo da trilha com a estrutura (heurística por regex, conferida à mão). Números entre parênteses = quantas unidades a usam.

| Estrutura | Primeira aparição (só uso) | Onde é ensinada explicitamente | Reforçada (aparece em) |
|---|---|---|---|
| Gênero dos substantivos, artigos definido/indefinido (le/la/un/une/les) | A1-1 ("Un café") e todo o vocabulário vem com artigo | **Não há explicação** em nenhuma unidade ou nota | todas |
| Artigo definido x partitivo (le café x du café) | A1-5 | A1-5 (nota de explicação) | 14 unidades com du/de la/de l' |
| de depois de negação | A1-11 | A1-11 (nota) | A1-12, A1-17 (nota que retoma) |
| de depois de quantidade | A1-12 | A1-12 (nota) | A1-12 |
| être no presente | A1-1 (c'est), A1-2 (je suis) | A1-g1 | 20 unidades |
| avoir no presente | A1-3 | A1-3 (nota idade), A1-g1 | 9 unidades |
| avoir em expressões (faim, mal, chaud) | A1-3 (idade) | A1-g1 (bloco 2), A1-13 (nota), A1-15 (nota) | A1-15 |
| aller no presente | A1-1 (ça va, allez-vous) | **Não há tabela nem explicação de aller** (só está no grupo `core` da Conjugação) | 9 unidades |
| faire no presente | A1-3 (il fait) | A1-13 (nota clima), A1-g5 | 11 unidades |
| Verbos -er no presente | A1-2 (j'aime) | A1-g3 | 14 unidades |
| Verbos pronominais | A1-1 (je m'appelle) | A1-g3 | 7 unidades |
| prendre | A1-11 (je prends) | A1-g5 | A1-12, A1-14 |
| vouloir/pouvoir/devoir/savoir | A1-5 (tu veux) | A1-g6 | 8 unidades |
| je voudrais (cortesia) | A1-5 | A1-10 (nota voudrais x peux) | A1-5, dictado d2 |
| il faut | A1-g6 | A1-g6 | só A1-g6 |
| Negação ne... pas | A1-1 ("je ne comprends pas") | **Sem explicação própria**; citada nas notas A1-11 (pas de) e A1-19 (queda do ne) | 7 unidades |
| ne... jamais | A1-g8 | A1-g8 | só A1-g8 |
| Pergunta por entonação | A1-1 ("Ça va ?") | Não há explicação | quase todas |
| Pergunta por inversão | A1-1 ("Comment allez-vous ?") | Não há explicação | 8 unidades |
| est-ce que / qu'est-ce que | A1-11 | Não há explicação | A1-15, A1-19, A1-20 |
| Palavra interrogativa no fim (in situ) | A1-2 ("Tu es de quel pays ?") | Só notas de realidade (A1-2, A1-3, A1-9, A1-10, A1-20) | 6 unidades |
| quel/quelle | A1-2 | Não há explicação | 9 unidades |
| tu x vous | A1-2 | A1-2 (nota de explicação) | sempre |
| Possessivos | A1-3 (ton père, ta fille) | A1-4 (nota mon/ma), A1-g2 | 16 unidades |
| Demonstrativos ce/cet/cette/ces | A1-g2 ("Ce sont") e A1-5 ("ce plat") | Não há explicação | 8 unidades |
| Concordância de adjetivo (feminino) | A1-2 (française) | A1-9 (objetivo e pares m/f no vocabulário); sem regra geral | 12 unidades |
| Posição do adjetivo | A1-14 (la bonne direction) | A1-16 (nota) | A1-17 |
| Preposições com cidades e países (à/en/au/aux) | A1-g4 | A1-g4 | A1-9, A1-20 |
| venir de / du + país | A1-9 | A1-9 (nota) | só A1-9 |
| il y a | A1-g10 (exemplo), A1-12 (frase) | A1-8 (nota où est x il y a), A1-17 (vocabulário + nota) | 5 unidades |
| Horas (il est X heures) | A1-6 | A1-6 (nota) | A1-6, ditados m2 |
| Números 0-20 | A1-3 (só 0, 1, 2, 3, 10, 20 viram vocabulário) | A1-3 | - |
| Números 30-100 | A1-10 | A1-10 (vocabulário), A1-g10 (70-99) | ditados |
| Transporte en x à | A1-14 | A1-14 (nota) | - |
| jouer de x jouer à | A1-19 | A1-19 (nota) | - |
| sur x dans | A1-18 | A1-18 (nota) | - |
| Comparativos | A1-14 ("plus rapide", sem "que") | A1-g7 | só A1-g7 |
| Advérbios de frequência | A1-13 ("souvent") | A1-g8 | A1-g5 (exemplo) |
| on = nous | A1-7 | A1-7 (nota de realidade) | A1-11, A1-19, A1-20 |
| Pronome tônico (moi, toi, lui) | A1-1 ("et toi ?") | Não há explicação | 8 unidades |
| Imperativo | A1-8 ("Tournez", "Excusez-moi") | Não há explicação | A1-14, ditado d3 |
| Pronome objeto (le/la/les) | A1-10 ("je la prends") | Não há explicação | só A1-10 |
| Futur proche (aller + infinitivo) | A1-5 ("Je vais détester ce plat") | **Não há explicação** | A1-6 (3 frases), A1-14, A1-15, A1-19 |
| Passé composé com avoir | A1-20 (9 frases + diálogo) | A1-g9 | Complete a frase m6, ditado d6-p1 |
| Passé composé com être | A1-20 ("On est allés") | A1-g9 | Complete a frase m6 |
| depuis | A1-15 | Não há explicação | só A1-15 |
| Imparfait, futur simple, conditionnel, subjonctif, plus-que-parfait | não aparecem na trilha | não | só no módulo de Conjugação e no Jogo (imparfait) |

O validador da casa (`node fr/scripts/check_grammar_input.js`) dá hoje 8 avisos em 10 unidades de gramática: A1-g4 (0 ocorrências antes, só depois), A1-g6 (savoir e il faut com 0 antes), A1-g7 (0 antes, 0 depois), A1-g8 (2 antes), A1-g9 (passé composé com être 0 antes, 11 com avoir antes).

---

## 4. Carga por nível

| Nível | Módulos | Unidades (vocab + gram.) | Lições | Vocab | Frases | Falas | Exerc. gram. | Notas | Ditados | Desafios de módulo publicados |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | 6 | 30 (20 + 10) | 62 + 20 checkpoints | 204 | 182 | 87 | 64 | 45 | 21 | 124 |
| A2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- Horas estimadas: **não existe dado de tempo** em nenhum arquivo da trilha (procurado em `fr/content.js` e na camada); não estimei.
- Densidade de vocabulário: 10 palavras por unidade em 19 unidades; 14 no A1-10. Por lição: 3/3/4 (A1-10: 3/3/3/3/2). Total de vocabulário ensinado no A1: 200 itens únicos.
- Palavras francesas novas nas frases e diálogos (não ensinadas antes): de 1 (A1-18) a 29 (A1-5) por unidade; média de 13,2 nas 20 unidades de vocabulário (lista completa no script; inclui nomes próprios).
- Ritmo de gramática: 10 unidades de gramática para 20 de vocabulário (1 a cada 2); por módulo: m1 2, m2 1, m3 2, m4 2, m5 1, m6 2. Toda unidade de vocabulário tem exatamente 1 nota de explicação (20 microexplicações), além das unidades de gramática.
- Tamanho dos módulos: de 4 unidades (m2, m5, m6) a 7 (m3, com 54 palavras, 2,7 vezes o m6 com 20).

---

## 5. Anomalias observadas (só fatos)

### 5.1 Estrutura e equilíbrio
1. **A2 declarado, mas vazio**: `fr/content.js:8` declara o nível A2; não há módulo, unidade, ditado de trilha nem desafio de módulo A2. O Teste de Nível A1 aponta para ele (`fr/content.js:4063`) e textos citam o A2 como continuação (`layer.js:291`).
2. **A1-10 fora do padrão**: 14 palavras e 5 lições, contra 10 palavras e 3 lições em todas as outras 19 unidades (`fr/content.js:1803`).
3. **Módulos desiguais**: A1-m3 tem 7 unidades e 54 palavras; A1-m6 tem 4 unidades e 20 palavras (`fr/content.js:4029-4061`).
4. **Notas desiguais**: A1-8, A1-12, A1-13 e A1-18 só têm a nota de explicação (0 de realidade e 0 cultural); A1-1 tem 4.
5. **Verdadeiro ou falso em só 8 de 20 unidades** (A1-1, 2, 5, 8, 9, 13, 15, 19).
6. **Variedade de frases**: A1-9 e A1-18 têm 5 frases; A1-10 tem 14.

### 5.2 Conteúdo repetido
7. Vocabulário repetido entre unidades: "français / française" (A1-2 v7 `fr/content.js:284` e A1-9 v0 `:1721`), "brésilien / brésilienne" (A1-2 v8 e A1-9 v1), "manger" (A1-5 v7 `:939`, A1-6 v6 `:1129`), "hier" (A1-7 v4 `:1332`, A1-20 v0 `:3831`).
8. Frases repetidas: "Je suis {nacionalidade}." (A1-2 p1 `:299` e A1-9 p0 `:1734`), "Combien ça coûte ?" (A1-3 p4 `:499` e A1-10 p0 `:1874`), "Il a dix ans." (frase e diálogo do A1-3), "Merci beaucoup !" (A1-1 p1 e diálogo do A1-8).
9. Números 70, 80 e 90 entram como vocabulário no A1-10 e voltam como gramática no A1-g10 logo depois; a base 20 já é apresentada numa nota do A1-3 (`vingt-to-quatrevingts`).

### 5.3 Estrutura usada antes de ser ensinada (ou nunca ensinada)
10. **Futur proche** aparece em 8 frases de 5 unidades (primeira: A1-5 `fr/content.js:1036`; A1-6 `:1186`; A1-14 `:2651`; A1-15 `:2906`, `:2914`; A1-19 `:3711`) e não é ensinado em lugar nenhum.
11. **aller** é usado desde A1-1 e não tem tabela nem explicação em nenhuma unidade.
12. **Negação ne... pas**: primeira frase em A1-1 (`fr/content.js:128`); não há explicação própria da estrutura (só notas sobre "pas de" no A1-11 e queda do "ne" no A1-19).
13. **Gênero e artigos (le/la/un/une/les)**: usados desde a 1ª palavra com artigo; nenhuma unidade ou nota explica gênero ou artigo definido/indefinido (só partitivo, A1-5).
14. **Perguntas** (inversão, est-ce que, quel): usadas desde A1-1 (inversão) e A1-11 (qu'est-ce que); nenhuma explicação da formação de perguntas; só notas de realidade sobre a forma coloquial in situ.
15. **devoir** usado em A1-6 ("Il doit travailler", `:1202`) e A1-15 ("Vous devez vous reposer", `:2931`) antes do A1-g6.
16. **prendre** usado em A1-11, A1-12 e A1-14 (com `prendre` como vocabulário em A1-14) antes do A1-g5. Fato, sem juízo: é o padrão declarado "a gramática sistematiza o que já foi visto".
17. **Passé composé** usado em 9 das 10 frases do A1-20 e no diálogo (incluindo com être, "On est allés", `:3962`) antes do A1-g9; a nota do A1-20 diz "o passé composé que você já viu" (`layer.js:2088`), mas a unidade que o ensina (A1-g9) vem depois.
18. **il y a** usado em A1-12 (`:2362`) e explicado na nota do A1-8 (`fr/content.js:1505`, exemplo com "pharmacie", palavra do A1-15) antes de virar vocabulário no A1-17.
19. **Comparativo** "plus rapide" no A1-14 (`:2675`) antes do A1-g7; e o validador acusa 0 ocorrências de "plus/moins/aussi ... que" antes e depois do A1-g7.
20. **Imperativo** ("Tournez à gauche", `:1537`) e **pronome objeto** ("je la prends", `:2002`) aparecem sem explicação em nenhum ponto.
21. Preposições de país (A1-g4) vêm antes de qualquer frase da trilha com en/au + país (validador: 0 antes).
22. A1-g6 cita "connaître ... que você vai ver mais adiante" (`layer.js:1550`); connaître não aparece em nenhuma unidade.

### 5.4 Objetivo x conteúdo
23. **A1-3** promete "Contar do zero a cem" (`layer.js:195`), mas o vocabulário só tem zéro, un/une, deux, trois, dix, vingt (`fr/content.js:384`). A lição se chama "Contar até vinte" e ensina trois, dix, vingt.
24. Números 4 a 9 e 11 a 19 **nunca viram vocabulário** em unidade nenhuma; mesmo assim aparecem huit (A1-3 diálogo `:539`, A1-6, A1-14, A1-g6), quinze (A1-4 diálogo `:798`), sept/six (A1-6, A1-g3), cinq (A1-5, A1-8), dix-neuf (A1-10), vingt-cinq (ditado d1).
25. **A1-7 "Dias e meses"**: só lundi, mardi, janvier e décembre são vocabulário; mercredi aparece no diálogo, samedi e dimanche depois (A1-19, A1-g8); jeudi, vendredi e os outros 8 meses não aparecem em francês fora da nota cultural. O desafio de Acentuação do A1-7 cobra "février" e "août", que não estão na unidade.
26. **A1-20** tem objetivo de "preparação pro passé composé", mas suas frases já são todas no passé composé (ver item 17).
27. **A1-g9** diz "Você concluiu o nível A1!" (`layer.js:2126`), mas depois dela ainda vêm o Ponto de verificação do módulo, os Desafios do Módulo 6 e o Teste de Nível.
28. Nomes de lição x conteúdo: no A1-2 a lição "nome-e-ser" ensina "le nom, être, la France" (a França cai na lição do nome) e a lição "nacionalidades" abre com "le Brésil".

### 5.5 Notas com gancho fraco (o gatilho não é a palavra da nota)
29. `nous-sommes-on-est` (A1-7, `fr/content.js:1354`, layer `:738`) dispara depois de "aujourd'hui" (v2), mas fala de "Nous sommes lundi" (frase p1), não de aujourd'hui.
30. `andar-terreo-premier-etage` (A1-17, `fr/content.js:3281`, layer `:1805`) dispara depois de "la chambre" (v2); "étage" não é vocabulário (está só na frase p6).
31. `ou-est-vs-il-y-a` (A1-8, `fr/content.js:1505`) explica il y a com "pharmacie", sem relação com o vocabulário da unidade (ver item 18).

### 5.6 Conjugação
32. **"Top N" não é frequência**: o comentário de `fr/app.js:5139-5144` diz que a ordem do arquivo "já é do mais comum pro mais raro", mas o arquivo está ordenado por grupo: posições 1-4 `core`, 5-129 `g1`, depois `g2`, `g3`. Resultado: prendre é #186, pouvoir #228, vouloir #229, devoir #230, savoir #231. Com "Top 10/25/50/100" o grupo `g3oir` (e quase todo `g3re`/`g3ir`) fica vazio (o filtro está em `fr/app.js:5496`).
33. Verbos ensinados na trilha que **não existem no banco**: se lever, se réveiller (tabela do A1-g3), détester (A1-5), visiter (A1-20, A1-g9), adorer (A1-19), neiger (A1-13), se reposer (A1-15). Nenhum verbo pronominal está no banco (só s'asseoir).
34. `éteindre` está classificado como `g1` (`fr/conjugation-data.js:6042`), mas é um verbo em -re do 3º grupo (as formas estão certas: éteins, éteignons).
35. O Jogo "Passé composé ou Imparfait?" e 6 dos 8 tempos da Conjugação (imparfait, plus-que-parfait, futur simple, conditionnel, subjonctif, impératif) não têm unidade correspondente na trilha (o imparfait não aparece em nenhuma frase do A1).

### 5.7 Desafios
36. Repo x banco: o lote `lote-a1-m3.json` tem 6 Ouça e traduza; na produção o A1-m3 tem 10 publicados (4 a mais que não estão nos lotes do repo). Nos outros módulos bate (m1 8, m2 a m6 6). Acentuação (46) e Expressões (30) batem.
37. Unidades sem nenhuma Expressão publicada: A1-3, A1-4, A1-9, A1-11, A1-18 (e todas as de gramática).
38. Desafios de Acentuação cobram palavras sem acento-alvo da unidade: "très" no A1-12 e no A1-16 (não é vocabulário de nenhuma das duas).

### 5.8 Lições sem exercício
39. Nenhuma lição está sem exercício: toda lição de vocabulário gera prática a partir do vocabulário; toda unidade tem diálogo com 3 checagens; toda unidade de gramática tem 6 a 8 exercícios. As unidades de gramática não têm lição "checkpoint" própria (os exercícios delas entram no Ponto de verificação do módulo, cota de 2 itens).

---

## 6. O que é do francês x o que é pedagogia reaproveitável

### 6.1 Específico do francês (não vai para o português como está)
- **Gênero com artigo** (le/la, l' com elisão), mon amie com vogal, concordância de adjetivo e de particípio com être (A1-g2, A1-g9, A1-9, A1-16).
- **Elisão** (j'ai, je m'appelle, l'eau, d'où, qu'est-ce que): usada o tempo todo, nunca explicada.
- **Liaison e nasais**: nenhuma explicação na trilha (grep sem resultado para "liaison" e "nasal" na camada). Só a nota "tu es → t'es".
- **Acentos gráficos** (é, è, ê, à, ç, œ): trabalhados só pelo Desafio de Acentuação (46 publicados) e pela correção "quase certo" das digitações; nenhuma explicação na trilha.
- **Partitivo e "de" depois de negação/quantidade** (A1-5, A1-11, A1-12, A1-17).
- **Números com base 20** (A1-3 nota, A1-10, A1-g10) e a variação regional (septante/nonante, citada só como "não é assim em todo lugar").
- **Pronome on = nous**, queda do "ne", "t'es", "y'a", pergunta in situ (notas de realidade).
- **Preposições à/en/au/aux com lugares** (A1-g4), en x à com transporte (A1-14), jouer de x à (A1-19).
- **Auxiliar être x avoir no passé composé** (A1-g9), verbos pronominais com être.
- **Inversão sujeito-verbo** nas perguntas (Comment allez-vous ?, Quel âge as-tu ?).
- **Cultura**: la bise, repas dominical, croissant, almoço longo, nomes dos dias, metrô, bandeira, marché, rez-de-chaussée, cinema dos Lumière.
- Banco de Conjugação (Verbiste, 6 grupos franceses) e o Jogo passé composé x imparfait.

### 6.2 Pedagogia reaproveitável (independe do idioma)
- **Ordem de situações** (sequência de funções comunicativas do A1): cumprimentar → apresentar-se → números/idade → família → comer e beber → horas e rotina → dias e marcar encontro → pedir caminho → nacionalidade/origem → loja e preços → mercado → quantidades → clima → transporte → saúde → descrever (cores, pessoas) → casa → posição de objetos → lazer e convites → falar do passado.
- **Agrupamento em 6 módulos temáticos** (primeiros contatos, rotina, cidade e identidade, deslocamento e saúde, descrição, lazer e passado).
- **Molde da unidade**: 10 palavras em 3 lições de 3/3/4 → diálogo situado com 2 personagens nomeados e cena → 3 checagens (lacuna, escuta, compreensão) → lição de consolidação.
- **Frases com cenário** ("o que você diz nesta situação?"), 4 por unidade.
- **Gramática como sistematização depois do input** (regra declarada em `grammar_input_map.json`): unidade de gramática a cada ~2 de vocabulário, com telas curtas, tabela final e 6 a 8 lacunas.
- **Uma nota de explicação contrastiva por unidade** (X ou Y?), disparada logo depois da palavra que a motiva.
- **Notas de realidade** (forma ensinada x forma falada) e **notas culturais** com gatilho.
- **Avaliação em camadas**: consolidação da unidade, Ponto de verificação do módulo (palavra + frase + escuta + gramática, 70%), Teste de Nível (30 itens, 75%) que também serve para pular.
- **Desafios por módulo**: Ditado (1 grátis + 2 extras), Ouça e traduza, Acentuação (no português: acentos e til), Expressões, Complete a frase.
- Validadores automáticos: vocabulário dos ditados, input antes da gramática.

---

## Resumo

- Mapeado: nível, módulo, unidade e lição da trilha de francês inteira (30 unidades), com objetivo, vocabulário, estruturas, funções, notas, desafios publicados e verbos de conjugação por unidade.
- Números principais: só o A1 tem conteúdo (A2 vazio); 6 módulos; 20 unidades de vocabulário + 10 de gramática; 62 lições + 20 checkpoints; 204 itens de vocabulário (200 únicos); 182 frases; 20 diálogos com 87 falas e 60 checagens; 45 notas (20 de explicação, 15 de realidade, 10 culturais); 64 exercícios de gramática; 21 ditados; 124 desafios publicados ligados a módulos; Conjugação com 241 verbos × 8 tempos, sem ligação com as unidades.
- Principais fatos para a revisão: futur proche, aller, negação, perguntas, gênero/artigos e imperativo são usados sem explicação; o passé composé aparece inteiro no A1-20 antes do A1-g9; números de 4 a 19, a maioria dos dias e 10 dos 12 meses nunca viram vocabulário; o filtro "Top N" da Conjugação não ordena por frequência.
- Arquivo criado: `docs/i18n/curriculo/01-auditoria-fr-atual.md`. Nenhum arquivo existente foi alterado.
