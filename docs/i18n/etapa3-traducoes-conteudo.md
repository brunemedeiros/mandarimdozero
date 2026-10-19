# Etapa 3, lote D: traduções de conteúdo (pt -> en)

Data: 2026-10-19. Itens b1, b2, c2 e c3 de `docs/i18n/etapa3-auditoria-pt-no-en.md`. Todas as traduções são novas e
aguardam a revisão da dona (mesmo status das outras traduções en: entram e ficam marcadas para revisão; as de
confiança média também estão no campo `review` do JSON da unidade).

Regras seguidas:

- Inglês americano simples. Palavras em francês/chinês dentro do texto ficam como estão.
- Pergunta de compreensão: as opções ficam **na mesma ordem** do português, porque a resposta certa (`ok`) é um índice
  em `fr/content.js`/`zh/content.js`. O formato do overlay só troca as opções quando a tradução tem o mesmo número delas
  (`shared/content-i18n.js`). A pergunta foi conferida contra as falas **em inglês** do diálogo (e, onde a fala do idioma
  estudado foi localizada para o site em inglês, contra a fala localizada).
- Explicação gramatical explica o francês para quem fala inglês; comparação com o português virou comparação com o
  inglês e está marcada como média.

Onde ficam: diálogo em `docs/i18n/content-en/<unidade>.json` e `docs/i18n/content-zh-en/<n>.json` (campo
`en.dialogue.scene` e `en.dialogue.check`), gerados em `fr/content.en.js`/`zh/content.en.js` por
`node scripts/build-content-overlay.js en fr|zh`. Desafios em `docs/i18n/challenges-en.json`, gerado em
`fr/challenges.en.js` por `node scripts/build-challenges-overlay.js en` (conferência: `node scripts/validate-challenges-en.js`).

## Resumo

| Tipo | Quantas |
|---|---|
| Cena do diálogo | 38 (fr 20, zh 18) |
| Pergunta de compreensão | 38 (fr 20, zh 18) |
| Opções da pergunta | 114 (3 por pergunta) |
| Complete a frase: tradução da frase | 6 |
| Complete a frase: explicação | 6 |
| Ouça e traduza: traduções de referência novas | 2 desafios (lt-a1m6-005, lt-a1m6-006; 3 frases cada) |
| Ouça e traduza: explicação | 35 (2 do lote A1-m6 que não tinha entrada + 33 que já tinham entrada mas sem a explicação) |
| Acentuação: explicação | 2 |
| Ouça e traduza do Módulo 3 realinhados (não é tradução nova) | 6 |

Confiança média: 10. Baixa: nenhuma.

- fr A1-2: adaptado: no site em inglês a fala diz "je suis américaine", então a resposta certa (2ª opção, mesmo índice) virou "The United States"
- zh 2: adaptado: no site em inglês a fala diz 我是美国人, então a resposta certa (1ª opção, mesmo índice) virou "The United States"
- zh 12: "colegas" pode ser de trabalho ou de turma; escolhi "coworkers" (o diálogo não diz)
- lt-a1m2-003: o "literalmente \"eu me levanto\"" do português virou um decalque em inglês ("I get myself up")
- lt-a1m2-005: a comparação com o português ("em português diz-se hoje é terça-feira") virou comparação com o inglês
- lt-a1m2-006: acrescentei o paralelo do inglês ("I'm working tomorrow")
- lt-a1m3-003: acrescentei que "le pantalon" é singular em francês (em inglês "pants" é plural, e o aluno poderia estranhar "coûte")
- lt-a1m4-001: a comparação com o português ("faz frio") virou comparação com o inglês ("it's cold")
- lt-a1m4-002: o português dizia que o francês "não usa estar para o clima" (comparação que só faz sentido em português); virou a comparação com o "it" de "it's raining"
- lt-a1m5-005: o português distingue "luminária" e "abajur"; em inglês os dois são "lamp", então virou "a floor lamp or a table lamp"

## Diálogo: cena e pergunta de compreensão

### Francês (fr/content.en.js, fonte docs/i18n/content-en/)

| Unidade | Campo | Português | Inglês | Confiança |
|---|---|---|---|---|
| A1-1 | cena | De manhã, na rua do bairro: Léa encontra o vizinho Hugo. | In the morning, on a neighborhood street: Léa runs into her neighbor Hugo. | alta |
| A1-1 | pergunta | Como Léa e Hugo se despedem no final? | How do Léa and Hugo say goodbye at the end? | alta |
| A1-1 | opções (certa = 1ª) | Dizem "até breve" / Dizem "de nada" / Pedem "por favor" | They say "see you soon" / They say "you're welcome" / They say "please" | alta |
| A1-2 | cena | Numa festa de boas-vindas, dois desconhecidos se apresentam. | At a welcome party, two strangers introduce themselves. | alta |
| A1-2 | pergunta | De que país é a Ana? | What country is Ana from? | alta |
| A1-2 | opções (certa = 2ª) | França / Brasil / Itália | France / The United States / Italy | média: adaptado: no site em inglês a fala diz "je suis américaine", então a resposta certa (2ª opção, mesmo índice) virou "The United States" |
| A1-3 | cena | No parque, dois pais conversam enquanto os filhos brincam. | At the park, two parents chat while their kids play. | alta |
| A1-3 | pergunta | Quantos anos tem a filha do Marc? | How old is Marc's daughter? | alta |
| A1-3 | opções (certa = 1ª) | Oito / Dez / Seis | Eight / Ten / Six | alta |
| A1-4 | cena | Na pausa do café do trabalho, dois colegas falam da família. | On a coffee break at work, two coworkers talk about their families. | alta |
| A1-4 | pergunta | Como se chama o irmão da Julie? | What is Julie's brother's name? | alta |
| A1-4 | opções (certa = 1ª) | Paul / Marc / Louis | Paul / Marc / Louis | alta |
| A1-5 | cena | Num café de Paris, de manhã: um cliente faz o pedido ao garçom. | At a café in Paris, in the morning: a customer orders from the waiter. | alta |
| A1-5 | pergunta | Quanto custa o pedido da Manon? | How much does Manon's order cost? | alta |
| A1-5 | opções (certa = 2ª) | Dois euros / Cinco euros / Dez euros | Two euros / Five euros / Ten euros | alta ("um cliente" virou "a customer" (neutro: quem pede é a Manon)) |
| A1-6 | cena | Na hora do almoço, dois colegas de trabalho falam da rotina. | At lunchtime, two coworkers talk about their daily routines. | alta |
| A1-6 | pergunta | A que horas o Julien levanta? | What time does Julien get up? | alta |
| A1-6 | opções (certa = 2ª) | Às seis horas / Às seis e meia / Ao meio-dia | At six o'clock / At six thirty / At noon | alta |
| A1-7 | cena | Dois amigos combinam de se ver na semana que vem. | Two friends make plans to see each other next week. | alta |
| A1-7 | pergunta | Em que dia Chloé e Maxime marcam o encontro? | What day do Chloé and Maxime agree to meet? | alta |
| A1-7 | opções (certa = 2ª) | Terça / Quarta / Segunda | Tuesday / Wednesday / Monday | alta |
| A1-8 | cena | Na rua, uma turista pede informação a um morador da cidade. | On the street, a tourist asks a local for directions. | alta |
| A1-8 | pergunta | O museu fica longe? | Is the museum far? | alta |
| A1-8 | opções (certa = 1ª) | Não, fica a cinco minutos / Sim, fica a uma hora / Está fechado | No, it's five minutes away / Yes, it's an hour away / It's closed | alta |
| A1-9 | cena | Numa festa internacional, duas pessoas descobrem de onde cada uma vem. | At an international party, two people find out where each other is from. | alta |
| A1-9 | pergunta | Onde o Thomas mora agora? | Where does Thomas live now? | alta |
| A1-9 | opções (certa = 2ª) | Na Alemanha / Em Portugal / Na Itália | In Germany / In Portugal / In Italy | alta |
| A1-10 | cena | Numa loja de roupas, uma cliente procura um vestido. | In a clothing store, a customer is looking for a dress. | alta |
| A1-10 | pergunta | Quanto custa o vestido? | How much is the dress? | alta |
| A1-10 | opções (certa = 2ª) | Quarenta euros / Sessenta euros / Cem euros | Forty euros / Sixty euros / A hundred euros | alta |
| A1-11 | cena | Dois amigos que moram juntos fazem a lista de compras da semana. | Two friends who live together make their shopping list for the week. | alta |
| A1-11 | pergunta | Quais itens estão na lista de compras? | What's on the shopping list? | alta |
| A1-11 | opções (certa = 1ª) | Arroz, legumes e frango / Peixe e salada / Pão e queijo | Rice, vegetables and chicken / Fish and salad / Bread and cheese | alta |
| A1-12 | cena | Numa feira livre, uma cliente compra maçãs, água e queijo. | At an open-air market, a customer buys apples, water and cheese. | alta |
| A1-12 | pergunta | Quantas maçãs a Hélène quer? | How many apples does Hélène want? | alta |
| A1-12 | opções (certa = 2ª) | Um quilo / Meio quilo / Uma garrafa | One kilo / Half a kilo / One bottle | alta (opções iguais ao português (a pergunta é "quantas maçãs" e a resposta certa é "meio quilo")) |
| A1-13 | cena | No ponto de ônibus, numa manhã fria, dois colegas falam do tempo. | At the bus stop, on a cold morning, two coworkers talk about the weather. | alta |
| A1-13 | pergunta | Qual estação o Baptiste prefere? | Which season does Baptiste prefer? | alta |
| A1-13 | opções (certa = 2ª) | Inverno / Verão / Outono | Winter / Summer / Fall | alta |
| A1-14 | cena | Na estação de metrô, uma passageira pergunta sobre o trem. | At the metro station, a passenger asks about the train. | alta |
| A1-14 | pergunta | Quanto custa a passagem? | How much is the ticket? | alta |
| A1-14 | opções (certa = 1ª) | Dois euros / Três euros / Um euro | Two euros / Three euros / One euro | alta |
| A1-15 | cena | Num consultório médico, um paciente conta o que está sentindo. | At the doctor's office, a patient explains how he's feeling. | alta |
| A1-15 | pergunta | O que o Théo está sentindo? | What's wrong with Théo? | alta |
| A1-15 | opções (certa = 2ª) | Dor de cabeça / Dor de barriga e febre / Dor no pé | He has a headache / He has a stomachache and a fever / His foot hurts | alta |
| A1-16 | cena | Dois amigos conversam e Adrien descreve o irmão para Pauline. | Two friends are chatting, and Adrien describes his brother to Pauline. | alta |
| A1-16 | pergunta | Como é o irmão do Adrien? | What is Adrien's brother like? | alta |
| A1-16 | opções (certa = 1ª) | Alto, de cabelo preto e gentil / Baixo, de cabelo claro e tímido / Alto e antipático | Tall, with black hair, and kind / Short, with light hair, and shy / Tall and unfriendly | alta |
| A1-17 | cena | Numa visita a um apartamento para alugar, a cliente faz perguntas ao corretor. | At an apartment viewing, the future tenant asks the real estate agent some questions. | alta |
| A1-17 | pergunta | O apartamento tem varanda? | Does the apartment have a balcony? | alta |
| A1-17 | opções (certa = 2ª) | Sim, e dois quartos / Não, mas tem uma sala bonita / Não, e não tem cozinha | Yes, and two bedrooms / No, but it has a nice living room / No, and it doesn't have a kitchen | alta |
| A1-18 | cena | Em casa, um menino procura suas coisas antes de sair para a escola. | At home, a boy looks for his things before leaving for school. | alta |
| A1-18 | pergunta | Onde estão as chaves do Enzo? | Where are Enzo's keys? | alta |
| A1-18 | opções (certa = 2ª) | Embaixo da cama / Em cima da mesa, ao lado da luminária / Atrás do sofá | Under the bed / On the table, next to the lamp / Behind the couch | alta |
| A1-19 | cena | Na sexta-feira, dois amigos falam dos planos para o fim de semana. | On Friday, two friends talk about their plans for the weekend. | alta |
| A1-19 | pergunta | Eles já escolheram o filme? | Have they already picked the movie? | alta |
| A1-19 | opções (certa = 2ª) | Sim, já escolheram / Ainda não sabem qual / Não vão ao cinema | Yes, they've already picked it / They don't know which one yet / They're not going to the movies | alta |
| A1-20 | cena | Na segunda-feira, dois colegas contam o que fizeram ontem e no fim de semana passado. | On Monday, two coworkers talk about what they did yesterday and last weekend. | alta |
| A1-20 | pergunta | O que o Kévin fez à tarde, ontem? | What did Kévin do yesterday afternoon? | alta |
| A1-20 | opções (certa = 2ª) | Trabalhou / Fez esporte / Foi ao cinema | He worked / He played sports / He went to the movies | alta |

### Mandarim (zh/content.en.js, fonte docs/i18n/content-zh-en/)

| Unidade | Campo | Português | Inglês | Confiança |
|---|---|---|---|---|
| 1 | cena | Duas pessoas se encontram na rua pela manhã. | Two people run into each other on the street in the morning. | alta |
| 1 | pergunta | Em que parte do dia acontece essa conversa? | What time of day does this conversation happen? | alta |
| 1 | opções (certa = 1ª) | De manhã / À noite / Não dá para saber | In the morning / At night / You can't tell | alta |
| 2 | cena | Brune conhece Xiao Li num evento de intercâmbio. | Brune meets Xiao Li at a language exchange event. | alta |
| 2 | pergunta | De que país Brune é? | What country is Brune from? | alta |
| 2 | opções (certa = 1ª) | Brasil / China / A conversa não diz | The United States / China / The conversation doesn't say | média: adaptado: no site em inglês a fala diz 我是美国人, então a resposta certa (1ª opção, mesmo índice) virou "The United States" |
| 3 | cena | Dois colegas de curso conversam no intervalo da aula. | Two classmates chat during a break in class. | alta |
| 3 | pergunta | Quem tem 30 anos? | Who is 30 years old? | alta |
| 3 | opções (certa = 1ª) | Quem fez a primeira pergunta / Quem respondeu primeiro / Nenhum dos dois | The person who asked the first question / The person who answered first / Neither of them | alta |
| 4 | cena | Duas amigas olham fotos de família. | Two friends look at family photos. | alta |
| 4 | pergunta | Quantas pessoas tem a família de quem responde? | How many people are in the family of the person answering? | alta |
| 4 | opções (certa = 2ª) | 3 / 4 / 5 | 3 / 4 / 5 | alta |
| 5 | cena | Brune pede o almoço num restaurante. | Brune orders lunch at a restaurant. | alta |
| 5 | pergunta | O que Brune pede para beber? | What does Brune order to drink? | alta |
| 5 | opções (certa = 1ª) | Chá / Café / Água | Tea / Coffee / Water | alta |
| 6 | cena | Dois colegas de trabalho conversam no corredor do escritório. | Two coworkers chat in the office hallway. | alta |
| 6 | pergunta | A que horas quem responde começa a trabalhar? | What time does the person answering start work? | alta |
| 6 | opções (certa = 2ª) | 7h / 8h / 5h | 7 a.m. / 8 a.m. / 5 p.m. | alta ("7h/8h/5h" viraram "7 a.m./8 a.m./5 p.m." (o 5 é a hora de sair do trabalho)) |
| 7 | cena | Num shopping, alguém procura o banheiro e pergunta a uma senhora. | At a mall, someone looking for the restroom asks an older woman. | alta |
| 7 | pergunta | Onde fica o banheiro? | Where is the restroom? | alta |
| 7 | opções (certa = 1ª) | Na frente, à esquerda / Atrás, à direita / Longe daqui | Up ahead, on the left / Behind you, on the right / Far from here | alta |
| 8 | cena | Brune pechincha numa banca de feira. | Brune haggles at a market stall. | alta |
| 8 | pergunta | Quanto Brune paga no final? | How much does Brune pay in the end? | alta |
| 8 | opções (certa = 2ª) | 30 yuans / 25 yuans / 20 yuans | 30 yuan / 25 yuan / 20 yuan | alta |
| 9 | cena | Dois amigos olham a previsão do tempo. | Two friends check the weather forecast. | alta |
| 9 | pergunta | Como será o tempo amanhã? | What will the weather be like tomorrow? | alta |
| 9 | opções (certa = 1ª) | Chuva e um pouco de frio / Sol e calor / Vento forte | Rainy and a bit cold / Sunny and hot / Very windy | alta |
| 10 | cena | Na recepção de um hotel, um hóspede pergunta como chegar ao aeroporto. | At a hotel front desk, a guest asks how to get to the airport. | alta |
| 10 | pergunta | Que transportes a recepcionista sugere? | How does the receptionist suggest getting there? | alta |
| 10 | opções (certa = 1ª) | Metrô ou táxi / Ônibus ou a pé / Só avião | By subway or taxi / By bus or on foot / Only by plane | alta |
| 11 | cena | Um amigo percebe que o outro não está bem. | A friend notices that the other one isn't feeling well. | alta |
| 11 | pergunta | O que está doendo em quem não se sente bem? | What hurts for the person who isn't feeling well? | alta |
| 11 | opções (certa = 1ª) | A cabeça / A barriga / A perna | Their head / Their stomach / Their leg | alta |
| 12 | cena | Dois colegas combinam um programa para o fim de semana. | Two coworkers make plans for the weekend. | média: "colegas" pode ser de trabalho ou de turma; escolhi "coworkers" (o diálogo não diz) |
| 12 | pergunta | O que quem responde primeiro gosta de fazer? | What does the person who answers first like to do? | alta |
| 12 | opções (certa = 1ª) | Assistir filme e dançar / Fazer exercício / Cantar e ler | Watch movies and dance / Exercise / Sing and read | alta |
| 13 | cena | Dois amigos falam dos planos para o futuro. | Two friends talk about their plans for the future. | alta |
| 13 | pergunta | O que quem responde pretende fazer na semana que vem? | What does the person answering plan to do next week? | alta |
| 13 | opções (certa = 1ª) | Estudar chinês / Viajar à China / Trabalhar | Study Chinese / Travel to China / Work | alta |
| 14 | cena | Dois colegas de turma conversam sobre estudar idiomas. | Two classmates talk about studying languages. | alta |
| 14 | pergunta | Qual idioma quem responde acha mais difícil? | Which language does the person answering think is the hardest? | alta |
| 14 | opções (certa = 1ª) | Chinês / Francês / Italiano | Chinese / French / Italian | alta |
| 15 | cena | Um amigo convida o outro para ir ao cinema. | One friend invites another to the movies. | alta |
| 15 | pergunta | A que horas é o filme? | What time is the movie? | alta |
| 15 | opções (certa = 1ª) | 19h / 17h / 21h | 7 p.m. / 5 p.m. / 9 p.m. | alta ("19h/17h/21h" viraram "7 p.m./5 p.m./9 p.m." (a fala diz "At 7 in the evening")) |
| 16 | cena | Dois amigos marcam de se ver no fim de semana. | Two friends arrange to meet over the weekend. | alta |
| 16 | pergunta | Em que dia eles vão se encontrar? | What day are they going to meet? | alta |
| 16 | opções (certa = 1ª) | Domingo / Sexta-feira / Sábado | Sunday / Friday / Saturday | alta |
| 17 | cena | Dois colegas conversam na hora do jantar. | Two coworkers chat at dinnertime. | alta |
| 17 | pergunta | O que a pessoa que comeu disse que comeu? | What did the person who has already eaten say they ate? | alta |
| 17 | opções (certa = 1ª) | Duas maçãs / Arroz / Nada | Two apples / Rice / Nothing | alta |
| 18 | cena | Alguém pergunta ao amigo quem é a moça da foto. | Someone asks a friend who the young woman in the photo is. | alta |
| 18 | pergunta | O que a namorada faz? | What does the girlfriend do? | alta |
| 18 | opções (certa = 1ª) | Estuda numa escola / Trabalha num hospital / É médica | She studies at a school / She works at a hospital / She's a doctor | alta |

## Desafios (fr)

### Complete a frase (cloze_grammar): tradução e explicação

| Id | Campo | Português | Inglês | Confiança |
|---|---|---|---|---|
| cloze-a1m6-001 | tradução | Ontem, nós comemos no restaurante. | Yesterday, we ate at the restaurant. | alta |
| cloze-a1m6-001 | explicação | "Manger" forma o passé composé com avoir: nous avons mangé. A maioria dos verbos usa avoir. | "Manger" forms the passé composé with avoir: nous avons mangé. Most verbs use avoir. | alta |
| cloze-a1m6-002 | tradução | Ontem, ela foi ao cinema. | Yesterday, she went to the movies. | alta |
| cloze-a1m6-002 | explicação | "Aller" é verbo de movimento e usa être: elle est allée. Com être, o particípio concorda com o sujeito (allée, feminino). | "Aller" is a verb of movement and uses être: elle est allée. With être, the past participle agrees with the subject (allée, feminine). | alta |
| cloze-a1m6-003 | tradução | No fim de semana passado, eu fiz esporte. | Last weekend, I played sports. | alta |
| cloze-a1m6-003 | explicação | O particípio de "faire" é irregular: fait. Com avoir, ele não concorda com o sujeito, então nada de -e. | The past participle of "faire" is irregular: fait. With avoir, it doesn't agree with the subject, so no -e. | alta |
| cloze-a1m6-004 | tradução | Hoje de manhã, a Sophie foi ao mercado. | This morning, Sophie went to the market. | alta |
| cloze-a1m6-004 | explicação | Com être, o particípio concorda com o sujeito: Sophie é feminino, então allée (com -e). "Aller" é o infinitivo, não o particípio. | With être, the past participle agrees with the subject: Sophie is feminine, so allée (with -e). "Aller" is the infinitive, not the past participle. | alta |
| cloze-a1m6-005 | tradução | Ele pegou o trem anteontem. | He took the train the day before yesterday. | alta |
| cloze-a1m6-005 | explicação | "Prendre" usa avoir (il a pris), mesmo sendo uma viagem: só um grupo pequeno de verbos de movimento, como aller, usa être. O particípio é irregular: pris. | "Prendre" uses avoir (il a pris), even though it's about traveling: only a small group of movement verbs, like aller, use être. The past participle is irregular: pris. | alta |
| cloze-a1m6-006 | tradução | No fim de semana passado, nós fomos ao cinema. | Last weekend, we went to the movies. | alta |
| cloze-a1m6-006 | explicação | "Aller" usa être (nous sommes) e o particípio concorda com o sujeito no plural: allés (com -s). | "Aller" uses être (nous sommes), and the past participle agrees with the plural subject: allés (with -s). | alta |

### Lote A1-m6 sem entrada (Ouça e traduza e Acentuação)

| Id | Campo | Português | Inglês | Confiança |
|---|---|---|---|---|
| lt-a1m6-005 | traduções de referência | Eu gosto de ouvir música. / Gosto de escutar música. / Eu adoro ouvir música. | I like to listen to music. / I like listening to music. / I love listening to music. | alta |
| lt-a1m6-005 | explicação | "Aimer" + infinitivo expressa gosto; "de la musique" é partitivo (música em geral). | "Aimer" + infinitive says what you like doing; "de la musique" is the partitive (music in general). | alta |
| lt-a1m6-006 | traduções de referência | Ontem à noite eu comi uma maçã. / Ontem à noite comi uma maçã. / Ontem à noite eu comi uma maçã | Last night I ate an apple. / Last night, I ate an apple. / Yesterday evening I ate an apple. | alta |
| lt-a1m6-006 | explicação | "Hier soir" pede o passado composto: "j'ai mangé" (avoir + particípio de "manger"). | "Hier soir" ("last night") calls for the passé composé: "j'ai mangé" (avoir + the past participle of "manger"). | alta |
| accent-a1m6-006 | explicação | Os dois "e" têm acento agudo. | Both "e"s have an acute accent. | alta |
| accent-a1m6-007 | explicação | Os dois últimos "e" têm acento agudo. | The last two "e"s have an acute accent. | alta |

### Explicações do Ouça e traduza que faltavam (o português aparecia no site em inglês)

| Id | Campo | Português | Inglês | Confiança |
|---|---|---|---|---|
| lt-a1m1-001 | explicação | "Bonsoir" é o cumprimento da noite; "ça va ?" é a pergunta informal "tudo bem?". | "Bonsoir" is the evening greeting; "ça va ?" is the informal question "how are you?". | alta |
| lt-a1m1-002 | explicação | "S'il vous plaît" é o "por favor" educado; "un café" já pede o item sem verbo. | "S'il vous plaît" is the polite "please"; "un café" asks for the item without a verb. | alta |
| lt-a1m1-006 | explicação | Na inversão "as-tu", o verbo vem antes do sujeito: "quel âge as-tu ?" = "quantos anos você tem?". | In the inversion "as-tu", the verb comes before the subject: "quel âge as-tu ?" = "how old are you?" (literally "what age have you?"). | alta |
| lt-a1m1-007 | explicação | "Mon" é o possessivo masculino; "s'appelle" é "se chama" (verbo reflexivo). | "Mon" is the masculine possessive ("my"); "s'appelle" means "is called" (a reflexive verb, literally "calls himself"). | alta |
| lt-a1m1-008 | explicação | "Un" é masculino (frère) e "une" é feminino (sœur): o artigo concorda com o gênero. | "Un" is masculine (frère) and "une" is feminine (sœur): the article agrees with the gender of the noun. | alta |
| lt-a1m2-001 | explicação | "Je voudrais" é a forma educada de pedir; "du" (de + le) indica uma quantidade de queijo. | "Je voudrais" ("I would like") is the polite way to ask for something; "du" (de + le) means an amount of cheese, "some cheese". | alta |
| lt-a1m2-002 | explicação | "Du lait" usa o artigo partitivo: leite não se conta, então "du" e não "un". | "Du lait" uses the partitive article: milk isn't something you count, so it's "du", not "un". | alta |
| lt-a1m2-003 | explicação | Verbo reflexivo: "je me lève" é literalmente "eu me levanto"; a hora vem com "à ... heures". | Reflexive verb: "je me lève" is literally "I get myself up"; the time comes with "à ... heures". | média: o "literalmente \"eu me levanto\"" do português virou um decalque em inglês ("I get myself up") |
| lt-a1m2-004 | explicação | Para a hora, o francês diz "il est sept heures"; "du soir" indica a noite. | To tell the time, French says "il est sept heures" (literally "it is seven hours"); "du soir" means "in the evening". | alta |
| lt-a1m2-005 | explicação | Para o dia da semana, o francês diz "nous sommes mardi" (literalmente "estamos terça"); em português diz-se "hoje é terça-feira". | For the day of the week, French says "nous sommes mardi" (literally "we are Tuesday"); in English you say "today is Tuesday". | média: a comparação com o português ("em português diz-se hoje é terça-feira") virou comparação com o inglês |
| lt-a1m2-006 | explicação | "Demain matin" é "amanhã de manhã"; o presente "je travaille" também pode indicar o futuro próximo. | "Demain matin" means "tomorrow morning"; the present tense "je travaille" can also talk about the near future, like "I'm working tomorrow" in English. | média: acrescentei o paralelo do inglês ("I'm working tomorrow") |
| lt-a1m3-001 | explicação | "Tournez" é o imperativo de cortesia (vous); "tout droit" = "siga em frente". | "Tournez" is the polite imperative (vous); "tout droit" = "straight ahead". | alta |
| lt-a1m3-002 | explicação | "Je viens de" indica origem: "du" = de + le (du Brésil); "et toi ?" devolve a pergunta. | "Je viens de" tells where you're from: "du" = de + le (du Brésil); "et toi ?" turns the question back around. | alta |
| lt-a1m3-003 | explicação | "Coûte" é a forma do verbo "coûter" (custar) para uma coisa só; "cinquante" = 50. | "Coûte" is the form of the verb "coûter" (to cost) for a single thing: in French, "le pantalon" is singular; "cinquante" = 50. | média: acrescentei que "le pantalon" é singular em francês (em inglês "pants" é plural, e o aluno poderia estranhar "coûte") |
| lt-a1m3-004 | explicação | "Je cherche" já significa "estou procurando": o francês usa o presente para a ação em curso. | "Je cherche" already means "I'm looking for": French uses the simple present for an action in progress. | alta |
| lt-a1m3-005 | explicação | "Des" é o plural indefinido ("legumes") e "du" é partitivo ("arroz", sem contar). | "Des" is the plural indefinite article (vegetables) and "du" is the partitive (rice, which you don't count). | alta |
| lt-a1m3-006 | explicação | Depois de quantidade, o francês usa "de": "un kilo de pommes", sem artigo. | After a quantity, French uses "de" with no article: "un kilo de pommes". | alta |
| lt-a1m4-001 | explicação | O tempo usa "il fait" (il fait froid); em português, "faz frio". | Weather uses "il fait" (il fait froid), where English says "it's cold". | média: a comparação com o português ("faz frio") virou comparação com o inglês ("it's cold") |
| lt-a1m4-002 | explicação | "Il pleut" é impessoal: o "il" não é uma pessoa, e o francês não usa "estar" para o clima. | "Il pleut" is impersonal: the "il" isn't a person, just like the "it" in "it's raining". | média: o português dizia que o francês "não usa estar para o clima" (comparação que só faz sentido em português); virou a comparação com o "it" de "it's raining" |
| lt-a1m4-003 | explicação | "Prendre le bus" é "pegar o ônibus"; "tous les jours" = "todos os dias". | "Prendre le bus" means "to take the bus"; "tous les jours" = "every day". | alta |
| lt-a1m4-004 | explicação | "Où est" pergunta onde algo fica; "station de métro" = "estação de metrô". | "Où est" asks where something is; "station de métro" = "metro (subway) station". | alta |
| lt-a1m4-005 | explicação | A dor usa "avoir mal à": "il a mal au ventre" (à + le = au) = "ele está com dor de barriga". | Pain is expressed with "avoir mal à": "il a mal au ventre" (à + le = au) = "he has a stomachache". | alta |
| lt-a1m4-006 | explicação | "Aller à la" indica destino; "pharmacie" é feminino, por isso "à la". | "Aller à la" shows the destination; "pharmacie" is feminine, so it's "à la". | alta |
| lt-a1m5-001 | explicação | Os adjetivos concordam com "sœur" (feminino): "grande", "gentille" (masculino: gentil). | The adjectives agree with "sœur" (feminine): "grande", "gentille" (masculine: gentil). | alta |
| lt-a1m5-002 | explicação | "Son" é "dele/dela": concorda com "pull" (masculino), não com quem é o dono. | "Son" can mean "his" or "her": it agrees with "pull" (masculine), not with the owner. | alta |
| lt-a1m5-003 | explicação | "À côté de" = "ao lado de"; "de + le" vira "du" (du salon). | "À côté de" = "next to"; "de + le" becomes "du" (du salon). | alta |
| lt-a1m5-004 | explicação | "Il y a" = "tem/há"; "dans" indica o lugar onde algo está. | "Il y a" = "there is / there are"; "dans" shows where something is. | alta |
| lt-a1m5-005 | explicação | "Lampe" é a luminária ou o abajur; "sur" indica em cima de algo. | "Lampe" is a lamp (a floor lamp or a table lamp); "sur" means on top of something. | média: o português distingue "luminária" e "abajur"; em inglês os dois são "lamp", então virou "a floor lamp or a table lamp" |
| lt-a1m5-006 | explicação | "Sous" é "embaixo de"; o oposto é "sur" (em cima de). | "Sous" means "under"; the opposite is "sur" (on). | alta |
| lt-a1m6-001 | explicação | "Le week-end" sem preposição indica algo habitual; "j'aime lire" = "eu gosto de ler" (infinitivo). | "Le week-end" with no preposition shows a habit ("on weekends"); "j'aime lire" = "I like to read" (infinitive). | alta |
| lt-a1m6-002 | explicação | "On" no francês falado vale "nós/a gente"; "au cinéma" = à + le cinéma. | In spoken French, "on" means "we"; "au cinéma" = à + le cinéma. | alta |
| lt-a1m6-003 | explicação | "Hier" pede o passado composto: "j'ai mangé" (avoir + particípio). | "Hier" ("yesterday") calls for the passé composé: "j'ai mangé" (avoir + past participle). | alta |
| lt-a1m6-004 | explicação | "Ce matin" é o dia de hoje; "j'ai pris" é o passado composto de "prendre". | "Ce matin" ("this morning") is part of today; "j'ai pris" is the passé composé of "prendre". | alta |

### Ouça e traduza do Módulo 3: traduções em inglês trocadas de desafio (corrigido)

O lote `lote-a1-m3.json` foi reduzido de 10 para 6 e renumerado (commit 2fb4ca1, 2026-10-06) **depois** da tradução para o
inglês (f042da2, 2026-10-05). O overlay en continuava com os ids antigos: no site em inglês, "Tournez à droite, puis tout droit."
era corrigido contra "The museum is far from here.", e assim por diante nos 6. Agora cada id usa a tradução da sua frase atual
(mesmas frases em inglês, só trocadas de id). As entradas antigas `lt-a1m3-007` a `lt-a1m3-010` (ids que não existem mais no
lote) saíram do overlay (o validador já acusava). **Não conferido na produção** (sem acesso ao banco nesta tarefa): se a tabela
`challenges` da produção ainda tiver o conjunto antigo de 10, os ids de lá não batem com o lote do repositório.

| Id | Frase em francês (lote atual) | Inglês de referência (agora) | Vinha de |
|---|---|---|---|
| lt-a1m3-001 | Tournez à droite, puis tout droit. | Turn right, then go straight. / Turn right and then go straight ahead. / Turn right, then straight ahead. | lt-a1m3-002 (id antigo) |
| lt-a1m3-002 | Je viens du Brésil, et toi ? | I come from Brazil, and you? / I'm from Brazil, and you? / I am from Brazil, and you? | lt-a1m3-003 (id antigo) |
| lt-a1m3-003 | Le pantalon coûte cinquante euros. | The pants cost fifty euros. / The pants are fifty euros. / The trousers cost fifty euros. | lt-a1m3-005 (id antigo) |
| lt-a1m3-004 | Je cherche une robe. | I'm looking for a dress. / I am looking for a dress. / I look for a dress. | lt-a1m3-006 (id antigo) |
| lt-a1m3-005 | J'achète des légumes et du riz. | I buy vegetables and rice. / I'm buying vegetables and rice. / I am buying vegetables and rice. | lt-a1m3-007 (id antigo) |
| lt-a1m3-006 | Je prends un kilo de pommes. | I'll take a kilo of apples. / I take a kilo of apples. / I'll take one kilo of apples. | lt-a1m3-009 (id antigo) |
