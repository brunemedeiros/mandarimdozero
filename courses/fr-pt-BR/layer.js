// CAMADA DO CURSO frances@pt-BR (E2): todo o texto em português dos dados de fr/ (content.js, dictations.js, conjugation-data.js).
// Carrega DEPOIS desses arquivos e de shared/course-layer.js e se aplica sozinha sobre o que existir na página.
// Formato: o mesmo do overlay de inglês (shared/content-i18n.js) mais dialogue.speakers, stories, hanzi, dictations e conjugation.
// Editar este arquivo para mudar texto em português; ids, frases do idioma estudado e ordem ficam em fr/.
(function(){
  var L = {
    "units": {
      "A1-1": {
        "title": "Cumprimentar e se despedir",
        "goal": "Cumprimentar alguém, se despedir e agradecer numa interação básica.",
        "lessons": {
          "ola-e-tchau": "Dizer olá e até logo",
          "informal-agradecer": "Cumprimentar informalmente e agradecer",
          "cortesia-e-como-vai": "Pedir por favor e perguntar como vai",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "olá / bom dia",
          "boa noite (saudação)",
          "tchau / até logo",
          "oi / tchau (informal)",
          "obrigado(a)",
          "de nada",
          "por favor (formal)",
          "desculpe / com licença",
          "tudo bem",
          "até breve"
        ],
        "phrases": [
          {
            "t": "Olá! Eu me chamo {nome}.",
            "scenario": "Você encontra alguém novo numa festa e quer se apresentar. O que você diz?"
          },
          { "t": "Muito obrigada!", "scenario": "Um amigo te ajuda a carregar as compras. Como você agradece?" },
          {
            "t": "Desculpe, eu não entendo.",
            "scenario": "Alguém fala muito rápido em francês e você não entendeu nada. O que você diz?"
          },
          {
            "t": "Vou bem, e você?",
            "scenario": "Uma amiga pergunta \"Ça va?\". Você quer responder que está bem e perguntar de volta. O que você diz?"
          },
          { "t": "Boa noite! Como vai o senhor/a senhora?" },
          { "t": "Tchau, até amanhã!" },
          { "t": "Oi! Tudo bem?" },
          { "t": "De nada, é o de menos." },
          { "t": "Um café, por favor." }
        ],
        "dialogue": {
          "title": "Encontro na rua",
          "lines": ["Olá!", "Olá! Tudo bem?", "Vou bem, obrigada! E você?", "Tudo bem. Até breve!"],
          "speakers": ["A", "B", "A", "B"],
          "scene": "De manhã, na rua do bairro: Léa encontra o vizinho Hugo.",
          "check": [
            null,
            null,
            {
              "q": "Como Léa e Hugo se despedem no final?",
              "opts": ["Dizem \"até breve\"", "Dizem \"de nada\"", "Pedem \"por favor\""]
            }
          ]
        },
        "concepts": {
          "bonjour-vs-bonsoir": [
            {
              "title": "\"Bonjour\" ou \"Bonsoir\"?",
              "body": "Usamos <strong>bonjour</strong> de manhã até o fim da tarde — é a saudação padrão do dia. À noite, ao chegar num lugar, trocamos para <strong>bonsoir</strong>. Já <strong>salut</strong> funciona a qualquer hora, mas só entre amigos ou pessoas próximas — nunca com desconhecidos ou em contextos formais.",
              "examples": ["olá / bom dia", "boa noite (saudação)"]
            }
          ],
          "svp-informal": [
            {
              "title": "\"S'il vous plaît\" no dia a dia",
              "body": "Na fala informal ou em mensagens de texto, <strong>s'il vous plaît</strong> quase sempre encolhe: com amigos vira <strong>s'il te plaît</strong> (a forma \"tu\", não \"vous\"), e por escrito é comum ver só <strong>STP</strong>. A forma completa com \"vous\" continua sendo a mais segura com desconhecidos.",
              "examples": ["por favor (informal, entre amigos)", "abreviação de texto pra \"s'il te plaît\""]
            }
          ],
          "a-bientot-informal": [
            {
              "title": "\"À bientôt\" entre amigos vira \"à plus\"",
              "body": "Com amigos, <strong>à bientôt</strong> é comum, mas no dia a dia (e quase sempre em mensagem de texto) a despedida mais usada é <strong>à plus</strong> — e por escrito costuma virar só <strong>A+</strong>. Com desconhecidos ou em contexto formal, \"à bientôt\" continua sendo a escolha certa.",
              "examples": ["até mais (informal, entre amigos)", "abreviação de texto pra \"à plus\""]
            }
          ],
          "la-bise-cumprimento": [
            {
              "title": "Por que os franceses se cumprimentam com beijinhos no rosto?",
              "body": "Além de dizer \"bonjour\", é muito comum cumprimentar amigos e familiares com <strong>la bise</strong> — um ou mais beijinhos leves no rosto (o número varia por região: 2 é o mais comum, mas em algumas regiões são 3 ou até 4!). Entre desconhecidos ou em contexto formal/profissional, aperta-se a mão em vez disso.",
              "examples": ["cumprimentar com beijinho(s) no rosto"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Isso é o que dizemos quando alguém nos ajuda muito.",
            "whyNote": "Correto — <strong>merci beaucoup</strong> significa \"muito obrigado(a)\", é exatamente isso que se diz para agradecer por uma ajuda."
          }
        ]
      },
      "A1-2": {
        "title": "Se apresentar",
        "goal": "Dizer o nome, a nacionalidade e perguntar o mesmo para o outro.",
        "lessons": {
          "pronomes-e-nome": "Eu, você e dizer seu nome",
          "nome-e-ser": "O nome e o verbo être",
          "nacionalidades": "Falar da nacionalidade e do país",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "eu",
          "você (informal)",
          "chamar-se",
          "o nome",
          "ser / estar",
          "a França",
          "o Brasil",
          "francês / francesa",
          "brasileiro / brasileira",
          "o país"
        ],
        "phrases": [
          {
            "t": "Qual é o seu nome?",
            "scenario": "Você conhece alguém novo e quer saber o nome dela. O que você pergunta?"
          },
          {
            "t": "Eu sou {nacionalidade_t}.",
            "scenario": "Alguém pergunta de onde você é. Você quer dizer que é {nacionalidade_t}. O que você diz?"
          },
          {
            "t": "De que país você é?",
            "scenario": "Você quer saber de que país uma pessoa nova veio. O que você pergunta?"
          },
          {
            "t": "Eu também, eu sou francesa!",
            "scenario": "Alguém diz que é francesa, e você também é! Como você reage?"
          },
          { "t": "Qual é o nome da cidade?" },
          { "t": "Eu amo a França." },
          { "t": "O Brasil é muito grande." },
          { "t": "O país é magnífico." }
        ],
        "dialogue": {
          "title": "Primeiro encontro",
          "lines": [
            "Olá, qual é o seu nome?",
            "Eu me chamo Léo. E você?",
            "Eu sou a Ana. Você é francês?",
            "Sim, eu sou francês. E você, é brasileira?",
            "Sim, eu sou brasileira!"
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Numa festa de boas-vindas, dois desconhecidos se apresentam.",
          "check": [
            null,
            null,
            {
              "q": "De que país é a Ana?",
              "opts": ["França", "Brasil", "Itália"]
            }
          ]
        },
        "concepts": {
          "tu-vs-vous": [
            {
              "title": "\"Tu\" ou \"vous\"?",
              "body": "<strong>Tu</strong> é informal — usado com amigos, família e colegas da mesma idade. <strong>Vous</strong> é formal (usado com desconhecidos, superiores, pessoas mais velhas) e também é a forma de \"vocês\", no plural. Na dúvida, comece sempre com <strong>vous</strong> — é mais seguro do que parecer íntimo demais.",
              "examples": ["você (informal)", "você/vocês (formal ou plural)"]
            }
          ],
          "tu-es-contraction": [
            {
              "title": "\"Tu es\" vira \"t'es\" na fala",
              "body": "Seria \"Tu es français ?\", mas na fala corrida quase ninguém pronuncia as duas palavras separadas — <strong>tu es</strong> vira <strong>t'es</strong>. É tão comum que aparece até em mensagens escritas informais: \"T'es français ?\". Nos exercícios daqui, continue escrevendo a forma padrão <strong>tu es</strong> — a contração é só pra reconhecer quando ouvir ou ler.",
              "examples": ["você é francês? (fala corrida)"]
            }
          ],
          "comment-tappelles-wh-in-situ": [
            {
              "title": "\"Comment tu t'appelles ?\" também vira \"Tu t'appelles comment ?\"",
              "body": "Na fala cotidiana, é tão ou mais comum deixar a palavra de pergunta (\"comment\") no FIM da frase, mantendo a ordem normal sujeito-verbo — <strong>tu t'appelles comment ?</strong> em vez de \"comment tu t'appelles ?\". Nos exercícios daqui, continue usando a ordem com \"comment\" no início — é a forma que os dois exercícios daqui pedem.",
              "examples": ["qual é o seu nome? (fala cotidiana)"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa pergunta serve pra saber a idade de alguém.",
            "whyNote": "Errado — <strong>comment tu t'appelles ?</strong> pergunta o NOME (appeler = chamar-se), não a idade. Idade seria \"quel âge as-tu ?\"."
          }
        ]
      },
      "A1-3": {
        "title": "Números e idade",
        "goal": "Contar do zero a cem e dizer/perguntar a idade.",
        "lessons": {
          "primeiros-numeros": "Primeiros números",
          "contar-ate-vinte": "Contar até vinte",
          "idade": "Perguntar e dizer a idade",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": ["zero", "um / uma", "dois", "três", "dez", "vinte", "a idade", "ter", "anos", "quanto / quantos"],
        "phrases": [
          {
            "t": "Quantos anos você tem?",
            "scenario": "Você quer saber a idade de um novo amigo. O que você pergunta?"
          },
          {
            "t": "Eu tenho vinte anos.",
            "scenario": "Alguém pergunta sua idade e você tem vinte anos. O que você responde?"
          },
          {
            "t": "Ele tem dez anos.",
            "scenario": "Você está apresentando seu sobrinho de dez anos. O que você diz sobre a idade dele?"
          },
          {
            "t": "Somos dez (pessoas).",
            "scenario": "O garçom pergunta quantas pessoas são no seu grupo, que tem dez pessoas. O que você diz?"
          },
          { "t": "Quanto custa isso?" },
          { "t": "Está zero grau lá fora." },
          { "t": "Eu tenho dois irmãos e três irmãs." },
          { "t": "Qual é a idade do seu pai?" }
        ],
        "dialogue": {
          "title": "No parque",
          "lines": [
            "Qual é a idade da sua filha?",
            "Ela tem oito anos. E seu filho?",
            "Ele tem dez anos.",
            "Eles estão grandes!"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "No parque, dois pais conversam enquanto os filhos brincam.",
          "check": [
            null,
            null,
            {
              "q": "Quantos anos tem a filha do Marc?",
              "opts": ["Oito", "Dez", "Seis"]
            }
          ]
        },
        "concepts": {
          "avoir-age": [
            {
              "title": "\"J'ai vingt ans\" — por que \"ai\" e não \"suis\"?",
              "body": "Em português dizemos \"eu <strong>sou</strong>/<strong>tenho</strong> vinte anos\", mas em francês a idade sempre usa o verbo <strong>avoir</strong> (ter): <strong>j'ai</strong> vingt ans, nunca \"je suis vingt ans\". É um erro comum de quem traduz direto do português — vale gravar essa estrutura de cor.",
              "examples": ["ter", "a idade"]
            }
          ],
          "vingt-to-quatrevingts": [
            {
              "title": "\"Vingt\" é a base de um sistema esquisito",
              "body": "Na França, depois de 69 os números saltam pra base 20: 70 é <strong>soixante-dix</strong> (\"sessenta-dez\"), 80 é <strong>quatre-vingts</strong> (\"quatro-vintes\") — o \"vingt\" que você acabou de aprender, multiplicado! Mas isso não é assim em todo lugar onde se fala francês.",
              "examples": [],
              "variants": ["França", "Bélgica e Suíça", "Suíça (só lá)"]
            }
          ],
          "quel-age-wh-in-situ": [
            {
              "title": "\"Quel âge as-tu ?\" também vira \"T'as quel âge ?\"",
              "body": "Na fala cotidiana, \"tu as\" costuma encolher pra <strong>t'as</strong>, e a palavra de pergunta (\"quel âge\") pode ir pro fim da frase — <strong>t'as quel âge ?</strong> em vez de \"quel âge as-tu ?\". Nos exercícios daqui, continue usando a forma \"quel âge as-tu ?\" — é a forma que os exercícios pedem.",
              "examples": ["quantos anos você tem? (fala cotidiana)"]
            }
          ]
        }
      },
      "A1-g1": {
        "title": "Verbos avoir e être",
        "goal": "Conjugar avoir e être no presente e reconhecer seu uso nas frases.",
        "grammar": {
          "blocks": [
            {
              "title": "Avoir e être",
              "body": "Avoir (ter) e être (ser/estar) são os dois verbos mais usados do francês — e os únicos totalmente irregulares no presente. Você já viu várias formas deles nas últimas unidades (je suis, j'ai, il a...) sem parar pra pensar na conjugação completa.",
              "examples": ["Eu sou brasileira. (être)", "Eu tenho vinte anos. (avoir)"]
            },
            {
              "title": "Nenhum padrão pra deduzir",
              "body": "Repare que nenhuma das duas conjugações segue um padrão regular — não tem como \"deduzir\" a forma a partir do infinitivo, então vale a pena memorizar a tabela inteira, não só as formas isoladas que você já viu.",
              "examples": ["Ele tem dez anos. (avoir)", "Ela é minha irmã. (être)"]
            },
            {
              "title": "Uma pegadinha comum",
              "body": "O francês usa avoir (ter) em várias expressões onde o português usa \"estar\" ou \"ser\" — avoir faim (estar com fome), avoir soif (estar com sede), avoir peur (estar com medo), avoir raison (estar certo). Se em português a frase usa \"estar com/ter\", muito provavelmente em francês é avoir.",
              "examples": ["Estou com fome.", "Ela está certa."]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Être também funciona como verbo auxiliar de outros tempos verbais que você vai ver no A2 — a base que você constrói agora facilita bastante lá na frente. Aqui está a conjugação completa dos dois verbos antes de praticar:",
              "examples": [],
              "table": [
                {
                  "label": "être",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                },
                {
                  "label": "avoir",
                  "pronouns": ["je (j')", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "Je ___ étudiante.", "hint": "être" },
            { "prompt": "Tu ___ vingt ans.", "hint": "avoir" },
            { "prompt": "Nous ___ français.", "hint": "être" },
            { "prompt": "Ils ___ deux enfants.", "hint": "avoir" },
            { "prompt": "Vous ___ de Paris ?", "hint": "être" },
            { "prompt": "Elle ___ faim.", "hint": "avoir" }
          ]
        }
      },
      "A1-4": {
        "title": "Família",
        "goal": "Apresentar os membros da família e dizer quantos irmãos você tem.",
        "lessons": {
          "nuclear": "Família nuclear",
          "irmaos": "Falar de irmãos",
          "completa": "Família completa",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a família",
          "o pai",
          "a mãe",
          "o irmão",
          "a irmã",
          "os pais",
          "o filho",
          "a filha",
          "o marido",
          "a esposa / a mulher"
        ],
        "phrases": [
          {
            "t": "Aqui está minha família.",
            "scenario": "Você está mostrando uma foto e quer apresentar sua família. O que você diz?"
          },
          {
            "t": "Eu tenho dois irmãos.",
            "scenario": "Alguém pergunta se você tem irmãos, e você tem dois. O que você responde?"
          },
          {
            "t": "Meu pai se chama Marc.",
            "scenario": "Você está contando o nome do seu pai, que se chama Marc. O que você diz?"
          },
          {
            "t": "Ela é minha irmã.",
            "scenario": "Alguém pergunta quem é aquela garota na foto — é sua irmã. O que você responde?"
          },
          { "t": "A família é muito importante." },
          { "t": "O pai trabalha na cidade." },
          { "t": "A mãe prepara o jantar." },
          { "t": "O irmão e a irmã brincam juntos." },
          { "t": "Os pais adoram seus filhos." },
          { "t": "O filho e a filha gostam da escola." },
          { "t": "O marido e a esposa moram em Paris." }
        ],
        "dialogue": {
          "title": "Falando da família",
          "lines": [
            "Você tem irmãos?",
            "Sim, eu tenho uma irmã. E você?",
            "Eu tenho um irmão. Ele se chama Paul.",
            "Quantos anos ele tem?",
            "Ele tem quinze anos."
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Na pausa do café do trabalho, dois colegas falam da família.",
          "check": [
            null,
            null,
            {
              "q": "Como se chama o irmão da Julie?",
              "opts": ["Paul", "Marc", "Louis"]
            }
          ]
        },
        "concepts": {
          "mon-vs-ma": [
            {
              "title": "\"Mon frère\" ou \"ma sœur\"?",
              "body": "Em francês, o possessivo concorda com o gênero da palavra que vem depois, não com quem é o dono: <strong>mon</strong> père, <strong>mon</strong> frère (masculino), mas <strong>ma</strong> mère, <strong>ma</strong> sœur (feminino) — mesmo que seja você (homem ou mulher) falando. O dono da coisa não importa pra escolher mon/ma, só o gênero da palavra.",
              "examples": ["meu irmão", "minha irmã"]
            }
          ],
          "pere-mere-papa-maman": [
            {
              "title": "\"Le père\"/\"la mère\" no dia a dia viram \"papa\"/\"maman\"",
              "body": "Pra falar SOBRE pai/mãe em geral, ou de forma mais neutra, usa-se <strong>le père</strong>/<strong>la mère</strong>. Mas ao falar diretamente COM o próprio pai/mãe, ou sobre a própria família no dia a dia, o normal é <strong>papa</strong>/<strong>maman</strong> — mesmo entre adultos.",
              "examples": ["pai / papai (uso familiar)", "mãe / mamãe (uso familiar)"]
            }
          ],
          "repas-dominical": [
            {
              "title": "O almoço de domingo em família",
              "body": "Na França, é tradicional que a família se reúna pra um <strong>repas dominical</strong> — o almoço de domingo — que costuma ser mais longo e elaborado que as refeições do resto da semana, com várias etapas (entrada, prato principal, queijo, sobremesa). É um dos momentos em que várias gerações da família se encontram.",
              "examples": ["o almoço de domingo em família"]
            }
          ]
        }
      },
      "A1-g2": {
        "title": "Adjetivos possessivos",
        "goal": "Usar mon/ma/mes, ton/ta/tes, son/sa/ses e os demais adjetivos possessivos corretamente.",
        "grammar": {
          "blocks": [
            {
              "title": "Meu, minha, meus, minhas...",
              "body": "No francês, o adjetivo possessivo concorda com o gênero e número da coisa possuída — não com quem é o dono! Por isso \"meu\" pode ser mon, ma ou mes dependendo da palavra que vem depois.",
              "examples": ["Este é meu irmão. (frère é masculino)", "Esta é minha irmã. (sœur é feminino)"]
            },
            {
              "title": "Nosso, vosso, deles...",
              "body": "Já notre/votre/leur (nosso, vosso/de vocês, deles) não mudam de acordo com o gênero — só ganham um \"s\" no plural (nos/vos/leurs), sempre que a coisa possuída estiver no plural.",
              "examples": ["Nosso pai se chama Jean.", "Estes são os pais deles."]
            },
            {
              "title": "Uma exceção sonora",
              "body": "Antes de uma palavra feminina que começa com vogal (ou \"h\" mudo), usa-se mon/ton/son no lugar de ma/ta/sa — só pra evitar o encontro estranho de dois sons de vogal seguidos. O gênero da palavra continua feminino, só a forma escrita muda.",
              "examples": ["Esta é minha amiga Sophie. (amie é feminino, mas começa com vogal)", "A escola dela fica longe."]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Aqui está a tabela completa dos possessivos — organizada por gênero/número da coisa possuída, não por quem é o dono:",
              "examples": [],
              "table": [
                {
                  "label": "Masculino singular",
                  "pronouns": ["meu", "teu (informal)", "seu / dele / dela", "nosso", "vosso / de vocês", "deles / delas"]
                },
                {
                  "label": "Feminino singular",
                  "pronouns": ["minha", "tua (informal)", "sua / dele / dela", "nossa", "vossa / de vocês", "delas / deles"]
                },
                {
                  "label": "Plural (m/f)",
                  "pronouns": ["meus / minhas", "teus / tuas", "seus / suas", "nossos / nossas", "vossos / vossas", "deles / delas (pl.)"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "C'est ___ frère.", "hint": "meu (masc.)" },
            { "prompt": "C'est ___ sœur.", "hint": "minha (fem.)" },
            { "prompt": "Ce sont ___ parents.", "hint": "meus (plural)" },
            { "prompt": "___ père s'appelle Marc.", "hint": "nosso" },
            { "prompt": "Ce sont ___ fils.", "hint": "deles / delas (plural)" },
            { "prompt": "C'est ___ amie.", "hint": "minha — mas amie começa com vogal" }
          ]
        }
      },
      "A1-5": {
        "title": "Comida e bebida",
        "goal": "Pedir comida e bebida num café ou restaurante, e dizer do que você gosta ou não gosta de comer.",
        "lessons": {
          "pao-agua-cafe": "Pedir pão, água e café",
          "leite-queijo-maca": "Falar de leite, queijo e maçã",
          "comer-beber-detestar": "Comer, beber e dizer o que odeia",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "o pão",
          "a água",
          "o café",
          "o leite",
          "o queijo",
          "a maçã",
          "o peixe",
          "comer",
          "beber",
          "odiar / detestar"
        ],
        "phrases": [
          { "t": "Eu como pão de manhã.", "scenario": "Alguém pergunta o que você come de manhã. O que você responde?" },
          {
            "t": "Eu gosto de queijo, mas odeio peixe.",
            "scenario": "Você quer dizer que gosta de queijo mas não gosta nada de peixe. O que você diz?"
          },
          {
            "t": "Você bebe café ou leite?",
            "scenario": "Você está servindo o café da manhã para um amigo e quer saber o que ele bebe. O que você pergunta?"
          },
          {
            "t": "A conta, por favor.",
            "scenario": "Vocês terminaram de comer no restaurante e querem pedir a conta. O que vocês dizem ao garçom?"
          },
          { "t": "O pão está delicioso." },
          { "t": "Eu gostaria de água, por favor." },
          { "t": "O café está bem quente." },
          { "t": "O leite está na geladeira." },
          { "t": "A maçã é vermelha e doce." },
          { "t": "Eu gosto de comer de manhã." },
          { "t": "Você quer beber alguma coisa?" },
          { "t": "Acho que vou detestar esse prato." }
        ],
        "dialogue": {
          "title": "No café",
          "lines": [
            "Olá, o que deseja?",
            "Um café e um croissant, por favor.",
            "Mais alguma coisa?",
            "Não, obrigado(a), é só isso.",
            "Aqui está, são cinco euros."
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Num café de Paris, de manhã: um cliente faz o pedido ao garçom.",
          "check": [
            null,
            null,
            {
              "q": "Quanto custa o pedido da Manon?",
              "opts": ["Dois euros", "Cinco euros", "Dez euros"]
            }
          ]
        },
        "concepts": {
          "aime-le-vs-bois-du": [
            {
              "title": "\"J'aime LE café\" ou \"je bois DU café\"?",
              "body": "Com verbos de gosto (<strong>aimer</strong>, détester), usa-se o artigo definido pra falar da coisa em geral: <strong>j'aime le café</strong> (gosto de café, em geral). Já quando se fala de uma quantidade — bebendo, comendo, comprando — usa-se o artigo partitivo: <strong>je bois du café</strong> (bebo [uma quantidade de] café). É uma distinção que o português não tem, mas é essencial em francês.",
              "examples": ["beber", "odiar / detestar"]
            }
          ],
          "croissant-nao-e-diario": [
            {
              "title": "Croissant todo dia? Não pra maioria dos franceses",
              "body": "Existe a ideia de que os franceses comem croissant no café da manhã todos os dias — mas, na prática, é mais comum reservar o croissant pra fins de semana ou ocasiões especiais. No dia a dia, o café da manhã francês costuma ser mais simples: pão com manteiga/geleia (tartine), ou só café.",
              "examples": ["pão com manteiga/geleia — o café da manhã mais comum"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Dizemos isso pra pedir a conta num restaurante.",
            "whyNote": "Correto — <strong>l'addition</strong> é \"a conta\" em francês; essa frase é exatamente como se pede a conta num restaurante."
          }
        ]
      },
      "A1-6": {
        "title": "Horas e rotina diária",
        "goal": "Dizer as horas e descrever a rotina do dia a dia.",
        "lessons": {
          "horas-e-periodos": "Dizer as horas e os períodos do dia",
          "noite-acordar-levantar": "A noite, acordar e levantar",
          "rotina-diaria": "Comer, trabalhar, dormir e a meia-noite",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a hora",
          "a manhã",
          "o meio-dia",
          "a noite (à noite)",
          "acordar",
          "levantar-se",
          "comer",
          "trabalhar",
          "dormir",
          "meia-noite"
        ],
        "phrases": [
          {
            "t": "Que horas são?",
            "scenario": "Você esqueceu o relógio e quer saber que horas são. O que você pergunta?"
          },
          { "t": "São oito horas.", "scenario": "Alguém pergunta as horas e são oito horas. O que você responde?" },
          {
            "t": "Eu acordo às sete horas.",
            "scenario": "Alguém pergunta a que horas você acorda todo dia. O que você responde?"
          },
          { "t": "À noite, eu assisto TV.", "scenario": "Alguém pergunta o que você faz à noite. O que você responde?" },
          { "t": "Ele olha as horas no celular." },
          { "t": "Ao meio-dia, eu como em casa." },
          { "t": "Ele vai acordar cedo amanhã." },
          { "t": "Ela vai se levantar às sete horas." },
          { "t": "Ele precisa trabalhar até meia-noite." },
          { "t": "Vou dormir agora." }
        ],
        "dialogue": {
          "title": "Minha rotina",
          "lines": [
            "Você levanta a que horas?",
            "Eu levanto às seis e meia.",
            "E você trabalha quando?",
            "Eu trabalho de manhã e à tarde."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Na hora do almoço, dois colegas de trabalho falam da rotina.",
          "check": [
            null,
            null,
            {
              "q": "A que horas o Julien levanta?",
              "opts": ["Às seis horas", "Às seis e meia", "Ao meio-dia"]
            }
          ]
        },
        "concepts": {
          "etre-heures": [
            {
              "title": "\"Il est huit heures\" — de novo, nada de \"être\"... ou melhor, só \"être\"!",
              "body": "Diferente da idade (que usa avoir), as horas em francês usam o verbo <strong>être</strong>: <strong>il est</strong> huit heures (são oito horas). Repare que aqui o \"il\" não se refere a ninguém — é um \"il\" impessoal, só pra montar a frase, igual ao \"está\" de \"está chovendo\" em português.",
              "examples": ["a hora"]
            }
          ],
          "le-midi-almoco-longo": [
            {
              "title": "\"Le midi\" na França é hora de sentar pra comer de verdade",
              "body": "Na França, o almoço (<strong>le déjeuner</strong>, por volta de meio-dia às treze horas) costuma ser uma pausa de verdade — muitos restaurantes e cantinas de trabalho servem uma refeição completa (entrada, prato principal, às vezes sobremesa), e é comum reservar 45 minutos a uma hora só pra isso, em vez de comer rápido na mesa de trabalho.",
              "examples": ["o almoço"]
            }
          ]
        }
      },
      "A1-g3": {
        "title": "Verbos do 1º grupo e verbos pronominais",
        "goal": "Conjugar verbos regulares em -er e verbos pronominais (reflexivos) no presente.",
        "grammar": {
          "blocks": [
            {
              "title": "Verbos do 1º grupo (-er)",
              "body": "A maioria dos verbos franceses termina em -er no infinitivo — é o chamado \"1º grupo\", e é o mais regular de todos. Basta tirar o -er e adicionar as terminações -e, -es, -e, -ons, -ez, -ent.",
              "examples": ["Eu trabalho de manhã.", "Você come ao meio-dia."]
            },
            {
              "title": "Uma pequena exceção: manger",
              "body": "Verbos terminados em -ger (como manger) ganham um \"e\" extra antes de -ons, só pra manter o som suave do \"g\" — é a única mudança, e só acontece com \"nous\".",
              "examples": ["Nós comemos às sete horas.", "Vocês comem pão."]
            },
            {
              "title": "Verbos pronominais",
              "body": "Alguns verbos vêm sempre acompanhados de um pronome que \"reflete\" de volta pro sujeito — se réveiller (acordar), se lever (levantar-se). O pronome muda junto com o sujeito: me, te, se, nous, vous, se.",
              "examples": ["Eu levanto às seis horas.", "Você acorda cedo?"]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Repare que o verbo pronominal se conjuga exatamente como um verbo comum do 1º grupo — só muda o pronome reflexivo na frente. Aqui está a conjugação completa dos dois modelos:",
              "examples": [],
              "table": [
                {
                  "label": "travailler",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                },
                {
                  "label": "se lever",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "Je ___ à sept heures.", "hint": "se réveiller" },
            { "prompt": "Tu ___ tôt le matin ?", "hint": "se lever" },
            { "prompt": "Nous ___ à midi.", "hint": "manger" },
            { "prompt": "Il ___ le matin et l'après-midi.", "hint": "travailler" },
            { "prompt": "Vous ___ le fromage ?", "hint": "aimer" },
            { "prompt": "Elles ___ à six heures.", "hint": "se lever" }
          ]
        }
      },
      "A1-7": {
        "title": "Dias e meses",
        "goal": "Dizer os dias da semana, meses e marcar um encontro.",
        "lessons": {
          "dias-da-semana": "Dias da semana e hoje",
          "ontem-amanha-semana": "Amanhã, ontem e a semana",
          "meses-e-data": "Meses e a data",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "segunda-feira",
          "terça-feira",
          "hoje",
          "amanhã",
          "ontem",
          "a semana",
          "o mês",
          "janeiro",
          "dezembro",
          "a data"
        ],
        "phrases": [
          { "t": "Que dia é hoje?", "scenario": "Você perdeu a noção do dia da semana. O que você pergunta?" },
          {
            "t": "Hoje é segunda-feira.",
            "scenario": "Alguém pergunta que dia é hoje, e é segunda-feira. O que você responde?"
          },
          {
            "t": "Meu aniversário é em março.",
            "scenario": "Alguém pergunta em que mês é o seu aniversário — em março. O que você diz?"
          },
          {
            "t": "Até amanhã!",
            "scenario": "Você está se despedindo de um colega, e vai vê-lo de novo amanhã. O que você diz?"
          },
          { "t": "Hoje está bonito." },
          { "t": "Na próxima semana, eu vou viajar." },
          { "t": "O mês de janeiro é muito frio." },
          { "t": "Meu aniversário é em dezembro." },
          { "t": "Qual é a data hoje?" }
        ],
        "dialogue": {
          "title": "Marcando um encontro",
          "lines": [
            "A gente se vê que dia?",
            "Terça, tá bom pra você?",
            "Não, eu trabalho terça. E quarta?",
            "Perfeito, até quarta então!"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois amigos combinam de se ver na semana que vem.",
          "check": [
            null,
            null,
            {
              "q": "Em que dia Chloé e Maxime marcam o encontro?",
              "opts": ["Terça", "Quarta", "Segunda"]
            }
          ]
        },
        "concepts": {
          "a-demain-vs-a-bientot": [
            {
              "title": "\"À demain\" ou \"à bientôt\"?",
              "body": "As despedidas em francês variam conforme o tempo até o próximo encontro: <strong>à demain</strong> quando você sabe que vai rever a pessoa amanhã, e <strong>à bientôt</strong> quando o reencontro é mais incerto, só \"até breve\". Já <strong>au revoir</strong> é neutro e serve pra qualquer despedida, sem indicar quando será o próximo encontro.",
              "examples": ["amanhã", "ontem"]
            }
          ],
          "dias-semana-deuses-romanos": [
            {
              "title": "De onde vêm os nomes dos dias da semana?",
              "body": "Os dias da semana em francês vêm dos deuses/planetas romanos: <strong>lundi</strong> é o dia da Lua (Lune), <strong>mardi</strong> é o dia de Marte (Mars). O padrão continua: mercredi (Mercúrio), jeudi (Júpiter), vendredi (Vênus), samedi (Saturno) — só dimanche foge da regra, vindo do latim \"dia do Senhor\".",
              "examples": ["segunda-feira — dia da Lua", "terça-feira — dia de Marte"]
            }
          ],
          "nous-sommes-on-est": [
            {
              "title": "\"Nous sommes lundi\" no dia a dia vira \"On est lundi\"",
              "body": "Na fala cotidiana, <strong>on</strong> praticamente substituiu <strong>nous</strong> como \"a gente\"/\"nós\" — <strong>on est</strong> lundi em vez de \"nous sommes lundi\". O verbo conjuga como \"il/elle\" (on est, on a, on va), não como \"nous\". Nos exercícios daqui, continue usando \"nous\" — é a forma que os exercícios pedem.",
              "examples": ["hoje é segunda (fala cotidiana)"]
            }
          ]
        }
      },
      "A1-8": {
        "title": "Lugares e orientação",
        "goal": "Perguntar e indicar como chegar a um lugar na cidade.",
        "lessons": {
          "lugares-na-cidade": "Lugares na cidade",
          "hospital-estacao-em-frente": "Hospital, estação e seguir em frente",
          "direcoes": "Dar direções: esquerda, direita, perto e longe",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a rua",
          "a praça",
          "o museu",
          "o hospital",
          "a estação (de trem)",
          "sempre em frente",
          "à esquerda",
          "à direita",
          "perto",
          "longe"
        ],
        "phrases": [
          {
            "t": "Onde fica a estação?",
            "scenario": "Você está perdido e precisa achar a estação de trem. O que você pergunta a alguém na rua?"
          },
          {
            "t": "Vire à esquerda.",
            "scenario": "Você está dando instruções pra alguém chegar num lugar e precisa dizer para virar à esquerda. O que você diz?"
          },
          {
            "t": "É sempre em frente.",
            "scenario": "Alguém pergunta como chegar num lugar que fica sempre reto. O que você responde?"
          },
          {
            "t": "É longe daqui?",
            "scenario": "Você quer saber se o lugar que está procurando fica longe de onde você está. O que você pergunta?"
          },
          { "t": "A rua é bem tranquila à noite." },
          { "t": "A praça fica no centro da cidade." },
          { "t": "O hospital fica longe daqui." }
        ],
        "dialogue": {
          "title": "Pedindo informação",
          "lines": [
            "Com licença, onde fica o museu?",
            "É sempre em frente, depois à direita.",
            "É longe?",
            "Não, é a cinco minutos.",
            "Muito obrigado(a)!"
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Na rua, uma turista pede informação a um morador da cidade.",
          "check": [
            null,
            null,
            {
              "q": "O museu fica longe?",
              "opts": ["Não, fica a cinco minutos", "Sim, fica a uma hora", "Está fechado"]
            }
          ]
        },
        "concepts": {
          "ou-est-vs-il-y-a": [
            {
              "title": "\"Où est...?\" ou \"Il y a...?\"",
              "body": "Use <strong>où est...?</strong> quando você já sabe que o lugar existe e só quer saber onde fica (ex: où est la gare? — onde fica a estação?). Use <strong>il y a...?</strong> quando você não sabe se o lugar existe ali perto (ex: il y a une pharmacie près d'ici? — tem uma farmácia aqui perto?).",
              "examples": []
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa pergunta é sobre o preço de alguma coisa.",
            "whyNote": "Errado — <strong>c'est loin d'ici ?</strong> pergunta sobre DISTÂNCIA (loin = longe), não preço. Preço seria \"c'est combien ?\"."
          }
        ]
      },
      "A1-g4": {
        "title": "Preposições com países e cidades",
        "goal": "Usar à, en, au e aux corretamente com nomes de cidades e países.",
        "grammar": {
          "blocks": [
            {
              "title": "à + cidade",
              "body": "Para dizer que algo acontece numa cidade, usa-se sempre à — sem artigo antes do nome da cidade, e sem se preocupar com gênero.",
              "examples": ["Eu moro em Paris.", "Ela está viajando pra Tóquio."]
            },
            {
              "title": "en + país feminino / au + país masculino",
              "body": "A maioria dos países cujo nome termina em -e é feminina e usa en. Os demais (masculinos) usam au.",
              "examples": ["Eu vou pra França. (la France, feminino)", "Ele trabalha no Brasil. (le Brésil, masculino)"]
            },
            {
              "title": "aux + país no plural",
              "body": "Alguns países têm nome no plural — como les États-Unis (os Estados Unidos). Nesse caso, a preposição vira aux.",
              "examples": ["Eles moram nos Estados Unidos.", "Ela está na Holanda."]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Resumindo: cidade sempre leva à; país depende do gênero (en/au) ou de ser plural (aux). Aqui está a tabela com alguns exemplos:",
              "examples": [],
              "table": [
                {
                  "label": "Preposições",
                  "pronouns": ["cidade", "país feminino (a maioria)", "país masculino", "país no plural"]
                },
                {
                  "label": "Exemplos",
                  "pronouns": ["la France (fem.)", "le Brésil (masc.)", "le Portugal (masc.)", "les États-Unis (plural)"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "J'habite ___ Lyon.", "hint": "cidade" },
            { "prompt": "Il va ___ Portugal.", "hint": "país masculino" },
            { "prompt": "Elle voyage ___ Espagne.", "hint": "país feminino" },
            { "prompt": "Ils vivent ___ Pays-Bas.", "hint": "país no plural" },
            { "prompt": "Nous sommes ___ Londres.", "hint": "cidade" },
            { "prompt": "Tu habites ___ Canada.", "hint": "país masculino" }
          ]
        }
      },
      "A1-9": {
        "title": "Nacionalidades",
        "goal": "Dizer sua nacionalidade e a de outras pessoas, no masculino e no feminino.",
        "lessons": {
          "nacionalidades-1": "Francês, brasileiro e americano",
          "nacionalidades-2": "Inglês, espanhol e italiano",
          "nacionalidade-e-origem": "Alemão, português e perguntar de onde vem",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "francês / francesa",
          "brasileiro / brasileira",
          "americano / americana",
          "inglês / inglesa",
          "espanhol / espanhola",
          "italiano / italiana",
          "alemão / alemã",
          "português / portuguesa",
          "a nacionalidade",
          "vir de (um lugar)"
        ],
        "phrases": [
          {
            "t": "Eu sou {nacionalidade_t}.",
            "scenario": "Alguém te pergunta sua nacionalidade numa entrevista de trabalho. O que você diz?"
          },
          {
            "t": "Ele é francês, ela é espanhola.",
            "scenario": "Você está apresentando dois amigos de nacionalidades diferentes — um francês e uma espanhola. O que você diz sobre eles?"
          },
          {
            "t": "De onde você vem?",
            "scenario": "Você conheceu alguém novo numa viagem e quer saber de onde essa pessoa vem. O que você pergunta?"
          },
          {
            "t": "Eu venho de Portugal.",
            "scenario": "Alguém pergunta de onde você vem, e você vem de Portugal. O que você responde?"
          },
          { "t": "A nacionalidade está escrita no passaporte." }
        ],
        "dialogue": {
          "title": "De onde você é?",
          "lines": [
            "Você é de onde?",
            "Eu sou italiana, e você?",
            "Eu sou alemão.",
            "Você mora na Alemanha?",
            "Não, eu moro em Portugal agora."
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Numa festa internacional, duas pessoas descobrem de onde cada uma vem.",
          "check": [
            null,
            null,
            {
              "q": "Onde o Thomas mora agora?",
              "opts": ["Na Alemanha", "Em Portugal", "Na Itália"]
            }
          ]
        },
        "concepts": {
          "etre-nationalite-vs-venir-de": [
            {
              "title": "\"Je suis brésilienne\" ou \"je viens du Brésil\"?",
              "body": "<strong>Être + nacionalidade</strong> fala da sua identidade (je suis brésilienne). <strong>Venir de + país</strong> fala da sua origem/procedência (je viens du Brésil). As duas frases dizem quase a mesma coisa, mas repare na preposição: <strong>du</strong> Brésil, <strong>de</strong> France, <strong>d'</strong>Espagne — ela muda conforme o gênero e a primeira letra do nome do país.",
              "examples": ["vir de (um lugar)", "a nacionalidade"]
            }
          ],
          "dou-viens-tu-wh-in-situ": [
            {
              "title": "\"D'où viens-tu ?\" também vira \"Tu es d'où ?\"",
              "body": "Repare que o diálogo que você acabou de ler já usa a forma cotidiana: <strong>Tu es d'où ?</strong> em vez de \"D'où viens-tu ?\". Na fala cotidiana, é comum manter a ordem sujeito-verbo normal e jogar a palavra de pergunta pro fim. Nos exercícios daqui, continue usando \"D'où viens-tu ?\" — é a forma que os exercícios pedem.",
              "examples": ["de onde você é? (fala cotidiana)"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa pergunta serve pra saber o nome de alguém.",
            "whyNote": "Errado — <strong>d'où viens-tu ?</strong> pergunta de ONDE a pessoa vem (viens = vir), não o nome. Nome seria \"comment tu t'appelles ?\"."
          }
        ]
      },
      "A1-10": {
        "title": "Compras",
        "goal": "Perguntar preços (com números até cem), experimentar roupas e comprar numa loja.",
        "lessons": {
          "roupas-e-preco": "Calça, vestido e caro",
          "tamanho-e-loja": "Barato, tamanho e loja",
          "numeros-30-50": "Números: trinta a cinquenta",
          "numeros-60-80": "Números: sessenta a oitenta",
          "numeros-90-100": "Números: noventa e cem",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a calça",
          "o vestido",
          "caro",
          "barato",
          "o tamanho",
          "a loja",
          "trinta",
          "quarenta",
          "cinquenta",
          "sessenta",
          "setenta",
          "oitenta",
          "noventa",
          "cem"
        ],
        "phrases": [
          {
            "t": "Quanto custa isso?",
            "scenario": "Você está numa loja e quer saber o preço de um produto. O que você pergunta?"
          },
          {
            "t": "Custa quarenta euros.",
            "scenario": "Um cliente pergunta o preço de um produto que custa quarenta euros. O que você responde?"
          },
          {
            "t": "Posso experimentar essa calça?",
            "scenario": "Você está numa loja de roupas e quer experimentar uma calça antes de comprar. O que você pergunta?"
          },
          {
            "t": "São cem euros, por favor.",
            "scenario": "Você é o vendedor e precisa cobrar cem euros do cliente. O que você diz?"
          },
          { "t": "A calça está grande demais." },
          { "t": "O vestido é muito bonito." },
          { "t": "Não é nada caro." },
          { "t": "O tamanho é pequeno demais." },
          { "t": "A loja fecha às dezenove horas." },
          { "t": "Esta jaqueta custa trinta euros." },
          { "t": "Estes sapatos custam cinquenta euros." },
          { "t": "O casaco custa setenta euros." },
          { "t": "Este vestido custa oitenta euros." },
          { "t": "Esta bolsa custa noventa euros." }
        ],
        "dialogue": {
          "title": "Numa loja",
          "lines": [
            "Olá, estou procurando um vestido.",
            "Qual é o seu tamanho?",
            "Eu uso 38. Quanto custa?",
            "Custa sessenta euros.",
            "Perfeito, vou levar!"
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Numa loja de roupas, uma cliente procura um vestido.",
          "check": [
            null,
            null,
            {
              "q": "Quanto custa o vestido?",
              "opts": ["Quarenta euros", "Sessenta euros", "Cem euros"]
            }
          ]
        },
        "concepts": {
          "voudrais-vs-peux": [
            {
              "title": "\"Je voudrais\" ou \"je peux\"?",
              "body": "<strong>Je voudrais</strong> (eu gostaria) é a forma mais educada de pedir algo numa loja — soa mais gentil que \"je veux\" (eu quero). Já <strong>je peux...?</strong> (posso...?) é usado pra pedir permissão, como experimentar uma roupa: <strong>je peux</strong> essayer ce pantalon? Os dois são educados, mas servem pra momentos diferentes: pedir algo vs. pedir permissão.",
              "examples": []
            }
          ],
          "combien-ca-coute-wh-in-situ": [
            {
              "title": "\"Combien ça coûte ?\" também vira \"Ça coûte combien ?\"",
              "body": "Repare que o diálogo que você acabou de ler já usa a forma cotidiana: <strong>Ça coûte combien ?</strong> em vez de \"Combien ça coûte ?\". Na fala cotidiana, é comum jogar a palavra de pergunta pro fim da frase. Nos exercícios daqui, continue usando \"Combien ça coûte ?\" — é a forma que os exercícios pedem.",
              "examples": ["quanto custa? (fala cotidiana)"]
            }
          ]
        }
      },
      "A1-g10": {
        "title": "Números de 70 a 99",
        "goal": "Entender e formar corretamente os números de setenta a noventa e nove.",
        "grammar": {
          "blocks": [
            {
              "title": "Até sessenta, é regular",
              "body": "Trente (30), quarante (40), cinquante (50) e soixante (60) seguem o padrão normal, uma palavra pra cada dezena — igual em português. O problema começa depois de sessenta: o francês simplesmente não tem uma palavra própria pra setenta, oitenta ou noventa.",
              "examples": ["Eu tenho trinta anos.", "Custa sessenta euros."]
            },
            {
              "title": "70 = 60 + 10",
              "body": "Setenta (soixante-dix) é literalmente \"sessenta e dez\". De 71 a 79, continua somando a partir de sessenta: soixante et onze (71), soixante-douze (72)... até soixante-dix-neuf (79).",
              "examples": ["Ele tem setenta anos. (60+10)", "Dá setenta e cinco euros. (60+15)"]
            },
            {
              "title": "80 = 4 × 20",
              "body": "Oitenta (quatre-vingts) é \"quatro vezes vinte\". De 81 a 89, soma-se sem o \"et\": quatre-vingt-un (81), quatre-vingt-deux (82)... O \"s\" de vingts some assim que vem um número depois.",
              "examples": ["Ela tem oitenta anos. (4×20)", "Há oitenta e três pessoas. (4×20+3)"]
            },
            {
              "title": "90 = 4 × 20 + 10",
              "body": "Noventa (quatre-vingt-dix) junta as duas regras: quatro vezes vinte, mais dez. De 91 a 99, mesma lógica de 80: quatre-vingt-onze (91)... quatre-vingt-dix-neuf (99).",
              "examples": ["Meu avô tem noventa anos. (4×20+10)", "Custa noventa e nove euros. (4×20+19)"]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Resumindo a lógica das dezenas de 70 a 90 — o segredo é lembrar que soixante-dix e quatre-vingt-dix são a base pra somar de novo:",
              "examples": [],
              "table": [
                {
                  "label": "Dezenas",
                  "pronouns": ["70", "71", "80", "81", "90", "91", "99"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "70 em francês:", "hint": "60 + 10" },
            { "prompt": "71 em francês:", "hint": "60 + 11 (com et)" },
            { "prompt": "80 em francês:", "hint": "4 × 20" },
            { "prompt": "81 em francês:", "hint": "4×20 + 1 (sem et)" },
            { "prompt": "90 em francês:", "hint": "4×20 + 10" },
            { "prompt": "99 em francês:", "hint": "4×20 + 19" }
          ]
        }
      },
      "A1-11": {
        "title": "Fazendo compras de mercado",
        "goal": "Montar uma lista de compras e dizer o que você come ou não come no dia a dia.",
        "lessons": {
          "carne-frango-legumes": "Carne, frango e legumes",
          "salada-arroz-massa": "Salada, arroz e massa",
          "acucar-sal-ovo-sobremesa": "Açúcar, sal, ovo e sobremesa",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a carne",
          "o frango",
          "os legumes / as verduras",
          "a salada",
          "o arroz",
          "a massa",
          "o açúcar",
          "o sal",
          "o ovo",
          "a sobremesa"
        ],
        "phrases": [
          {
            "t": "Eu gosto de carne.",
            "scenario": "Alguém pergunta se você gosta de carne, e você gosta muito. O que você responde?"
          },
          {
            "t": "Como legumes todos os dias.",
            "scenario": "Alguém pergunta sobre seus hábitos alimentares e você come legumes todo dia. O que você diz?"
          },
          {
            "t": "Eu não como carne.",
            "scenario": "Você é vegetariano e precisa avisar o garçom que não come carne. O que você diz?"
          },
          {
            "t": "Eu levo arroz e massa.",
            "scenario": "No supermercado, alguém pergunta o que você vai levar. O que você responde?"
          },
          { "t": "O frango está delicioso hoje à noite." },
          { "t": "Os vegetais são bons para a saúde." },
          { "t": "A salada está fresca." },
          { "t": "O arroz e o macarrão são meus pratos favoritos." },
          { "t": "O açúcar e o sal estão na mesa." },
          { "t": "O ovo está cozido." },
          { "t": "A sobremesa está pronta." }
        ],
        "dialogue": {
          "title": "Fazendo a lista de compras",
          "lines": [
            "O que a gente compra?",
            "Arroz, legumes e frango.",
            "Você quer uma sobremesa?",
            "Sim, com açúcar, por favor!"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois amigos que moram juntos fazem a lista de compras da semana.",
          "check": [
            null,
            null,
            {
              "q": "Quais itens estão na lista de compras?",
              "opts": ["Arroz, legumes e frango", "Peixe e salada", "Pão e queijo"]
            }
          ]
        },
        "concepts": {
          "negation-partitif": [
            {
              "title": "\"Je ne mange pas DE viande\" — cadê o \"la\"?",
              "body": "Depois de uma negação com <strong>ne... pas</strong>, os artigos du/de la/des somem e viram só <strong>de</strong> (ou <strong>d'</strong> antes de vogal): je mange <strong>de la</strong> viande → je ne mange <strong>pas de</strong> viande. É uma regra que vale pra quase toda negação de quantidade em francês — vale prestar atenção nela.",
              "examples": ["a carne"]
            }
          ],
          "le-marche-tradicao": [
            {
              "title": "Além do supermercado: o marché",
              "body": "Em muitas cidades e vilarejos franceses, além do supermercado, é tradição fazer compras no <strong>marché</strong> — uma feira ao ar livre que costuma acontecer 1 ou 2 vezes por semana, com bancas de produtores locais vendendo frutas, legumes, queijos, carnes e pães frescos. É também um momento social: muita gente encontra vizinhos e conhecidos por lá.",
              "examples": ["a feira / o mercado ao ar livre"]
            }
          ]
        }
      },
      "A1-12": {
        "title": "Pesos e quantidades",
        "goal": "Pedir quantidades específicas ao fazer compras: kilo, litre, un peu de, beaucoup de...",
        "lessons": {
          "quilo-meio-quilo-litro": "Quilo, meio quilo e litro",
          "grama-pouco-muito": "Grama, um pouco e muito",
          "suficiente-demais-fatia-garrafa": "O suficiente, demais, fatia e garrafa",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "um quilo (de)",
          "meio quilo",
          "um litro",
          "uma grama",
          "um pouco de",
          "muito / bastante",
          "o suficiente de",
          "demais / em excesso",
          "uma fatia (de)",
          "uma garrafa (de)"
        ],
        "phrases": [
          {
            "t": "Eu levo um quilo de maçãs.",
            "scenario": "Você está na feira e quer comprar um quilo de maçãs. O que você diz ao vendedor?"
          },
          {
            "t": "Um litro de leite, por favor.",
            "scenario": "Você está no mercado e quer pedir um litro de leite. O que você diz?"
          },
          {
            "t": "É açúcar demais pra mim.",
            "scenario": "Alguém está te servindo café com muito açúcar e é demais pra você. O que você diz?"
          },
          {
            "t": "Uma fatia de pão, por favor.",
            "scenario": "Na mesa do café da manhã, você quer pedir uma fatia de pão. O que você diz?"
          },
          { "t": "Um grama é muito pouco." },
          { "t": "Tem muita gente aqui." },
          { "t": "Eu não tenho tempo suficiente." }
        ],
        "dialogue": {
          "title": "Comprando no mercado",
          "lines": [
            "Quantas maçãs você quer?",
            "Meio quilo, por favor.",
            "E mais alguma coisa?",
            "Uma garrafa de água e um pouco de queijo."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Numa feira livre, uma cliente compra maçãs, água e queijo.",
          "check": [
            null,
            null,
            {
              "q": "Quantas maçãs a Hélène quer?",
              "opts": ["Um quilo", "Meio quilo", "Uma garrafa"]
            }
          ]
        },
        "concepts": {
          "de-quantite": [
            {
              "title": "\"Un kilo DE pommes\" — a mesma regra do \"de\"",
              "body": "Depois de uma expressão de quantidade (un kilo <strong>de</strong>, un litre <strong>de</strong>, beaucoup <strong>de</strong>, trop <strong>de</strong>), o artigo também some e vira só <strong>de</strong>/<strong>d'</strong> — igual acontece depois de uma negação (unidade anterior). Repare: não se diz \"un kilo des pommes\", e sim <strong>un kilo de pommes</strong>.",
              "examples": ["um quilo (de)"]
            }
          ]
        }
      },
      "A1-13": {
        "title": "Clima e estações",
        "goal": "Falar sobre o tempo e as estações do ano.",
        "lessons": {
          "tempo-bonito-frio-quente": "Descrever o tempo: bonito, frio e quente",
          "chuva-neve-sol": "Chuva, neve e sol",
          "estacoes-do-ano": "As quatro estações do ano",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "está bonito (tempo)",
          "está frio",
          "está quente",
          "está chovendo",
          "está nevando",
          "o sol",
          "a primavera",
          "o verão",
          "o outono",
          "o inverno"
        ],
        "phrases": [
          {
            "t": "Como está o tempo?",
            "scenario": "Você vai sair e quer saber como está o tempo lá fora. O que você pergunta?"
          },
          {
            "t": "Está muito quente hoje.",
            "scenario": "Alguém pergunta como está o tempo, e está muito quente hoje. O que você responde?"
          },
          {
            "t": "Eu gosto do inverno.",
            "scenario": "Alguém pergunta sua estação preferida, e é o inverno. O que você diz?"
          },
          {
            "t": "Chove frequentemente no outono.",
            "scenario": "Alguém pergunta como é o outono na sua cidade, com chuva frequente. O que você diz?"
          },
          { "t": "Neva muito no inverno." },
          { "t": "O sol está brilhando hoje." },
          { "t": "A primavera é minha estação favorita." },
          { "t": "O outono é bem colorido." }
        ],
        "dialogue": {
          "title": "Falando do tempo",
          "lines": [
            "Como está o tempo hoje?",
            "Está bonito, mas está frio.",
            "Você prefere qual estação?",
            "Eu prefiro o verão, está quente."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "No ponto de ônibus, numa manhã fria, dois colegas falam do tempo.",
          "check": [
            null,
            null,
            {
              "q": "Qual estação o Baptiste prefere?",
              "opts": ["Inverno", "Verão", "Outono"]
            }
          ]
        },
        "concepts": {
          "il-fait-vs-jai": [
            {
              "title": "\"Il fait chaud\" ou \"j'ai chaud\"?",
              "body": "Pra falar do <strong>tempo/clima</strong>, o francês usa o verbo faire: <strong>il fait chaud</strong> (está calor lá fora). Pra falar de uma <strong>sensação sua</strong>, usa avoir: <strong>j'ai chaud</strong> (estou com calor, eu sinto calor). São frases parecidas mas com sujeitos bem diferentes — \"il\" impessoal pro clima, \"je\" pra você mesmo.",
              "examples": ["está quente"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa frase descreve como uma pessoa está se sentindo.",
            "whyNote": "Errado — <strong>il fait chaud</strong> descreve o CLIMA (faz calor), não como alguém se sente. O \"il\" aqui é impessoal, como em \"está fazendo calor\"."
          }
        ]
      },
      "A1-14": {
        "title": "Transporte",
        "goal": "Pegar um transporte público e comprar uma passagem.",
        "lessons": {
          "onibus-trem-metro": "Ônibus, trem e metrô",
          "carro-bicicleta-pe": "Carro, bicicleta e a pé",
          "pegar-transporte-passagem": "Pegar transporte, ponto, passagem e estação",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "o ônibus",
          "o trem",
          "o metrô",
          "o carro",
          "a bicicleta",
          "a pé",
          "pegar (um transporte)",
          "o ponto (de ônibus)",
          "a passagem",
          "a estação (de metrô)"
        ],
        "phrases": [
          {
            "t": "Eu pego o metrô todos os dias.",
            "scenario": "Alguém pergunta como você vai trabalhar, e é sempre de metrô. O que você responde?"
          },
          {
            "t": "Onde fica o ponto de ônibus?",
            "scenario": "Você está perdido e precisa achar o ponto de ônibus. O que você pergunta?"
          },
          {
            "t": "Uma passagem, por favor.",
            "scenario": "Você está na estação e quer comprar uma passagem. O que você diz?"
          },
          {
            "t": "Eu vou ao trabalho a pé.",
            "scenario": "Alguém pergunta como você vai ao trabalho, e você vai andando. O que você responde?"
          },
          { "t": "Vou pegar o ônibus hoje de manhã." },
          { "t": "O trem parte às oito horas." },
          { "t": "O carro está estacionado na frente da casa." },
          { "t": "A bicicleta é mais rápida na cidade." },
          { "t": "A estação está fechada hoje." }
        ],
        "dialogue": {
          "title": "Na estação de metrô",
          "lines": [
            "Com licença, esse trem vai pro centro?",
            "Sim, é a direção certa.",
            "Quanto custa a passagem?",
            "Custa dois euros."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Na estação de metrô, uma passageira pergunta sobre o trem.",
          "check": [
            null,
            null,
            {
              "q": "Quanto custa a passagem?",
              "opts": ["Dois euros", "Três euros", "Um euro"]
            }
          ]
        },
        "concepts": {
          "en-vs-a-transport": [
            {
              "title": "\"En métro\" ou \"à pied\"?",
              "body": "Meios de transporte \"fechados\" (onde você entra) usam <strong>en</strong>: <strong>en</strong> métro, <strong>en</strong> voiture, <strong>en</strong> bus. Já formas \"abertas\", sem se entrar em nada — como ir a pé ou de bicicleta montada por cima — usam <strong>à</strong>: <strong>à</strong> pied, <strong>à</strong> vélo. É uma regra pequena, mas aparece toda hora no dia a dia.",
              "examples": ["o metrô", "a pé"]
            }
          ],
          "metro-paris-historia": [
            {
              "title": "O metrô de Paris nasceu numa feira mundial",
              "body": "O metrô de Paris abriu em <strong>1900</strong>, bem a tempo da Exposição Universal daquele ano — um evento gigante que trouxe milhões de visitantes à cidade. É um dos metrôs mais antigos do mundo, e ainda hoje várias estações preservam a entrada original em ferro fundido no estilo Art Nouveau, desenhada por Hector Guimard.",
              "examples": ["o metrô"]
            }
          ]
        }
      },
      "A1-g5": {
        "title": "Verbos faire e prendre",
        "goal": "Conjugar os verbos irregulares faire e prendre no presente.",
        "grammar": {
          "blocks": [
            {
              "title": "Faire: um verbo com mil usos",
              "body": "Faire (fazer) é irregular e aparece em muitas expressões fixas — inclusive nas de clima que você já viu, como il fait chaud e il fait froid.",
              "examples": ["Está fazendo 30 graus hoje.", "O que você faz hoje à noite?"]
            },
            {
              "title": "Prendre: pegar, tomar, comer",
              "body": "Prendre (pegar/tomar) é usado tanto pra transporte, como você já viu, quanto pra pedir comida ou bebida — é um verbo bem versátil no dia a dia.",
              "examples": ["Eu pego o metrô frequentemente.", "Você vai tomar um café?"]
            },
            {
              "title": "Um padrão parecido",
              "body": "Repare que os dois verbos mudam de raiz no plural — faire vira fais-/fais-/fait- no singular mas faisons/faites/font no plural, e prendre dobra o \"n\" em ils/elles prennent. Vale prestar atenção nessas irregularidades.",
              "examples": ["Nós pegamos o ônibus juntos.", "O que vocês fazem esse fim de semana?"]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Aqui está a conjugação completa dos dois verbos — repare nas irregularidades destacadas:",
              "examples": [],
              "table": [
                {
                  "label": "faire",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                },
                {
                  "label": "prendre",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "Il ___ chaud aujourd'hui.", "hint": "faire" },
            { "prompt": "Je ___ le métro tous les jours.", "hint": "prendre" },
            { "prompt": "Nous ___ du sport le week-end.", "hint": "faire" },
            { "prompt": "Vous ___ un café ?", "hint": "prendre" },
            { "prompt": "Elles ___ le train ensemble.", "hint": "prendre" },
            { "prompt": "Tu ___ quoi ce soir ?", "hint": "faire" }
          ]
        }
      },
      "A1-15": {
        "title": "Corpo e saúde",
        "goal": "Descrever sintomas simples e ir ao médico.",
        "lessons": {
          "cabeca-barriga-mao": "Cabeça, barriga e mão",
          "pe-doente-medico": "Pé, estar doente e o médico",
          "farmacia-dor-febre": "Farmácia, dor, febre e se sentir",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a cabeça",
          "a barriga",
          "a mão",
          "o pé",
          "doente",
          "o médico",
          "a farmácia",
          "estar com dor",
          "a febre",
          "sentir-se"
        ],
        "phrases": [
          {
            "t": "Estou com dor de cabeça.",
            "scenario": "Você não está se sentindo bem, com dor de cabeça. O que você diz a um amigo?"
          },
          {
            "t": "Eu me sinto doente.",
            "scenario": "Você não está bem e precisa avisar que está doente. O que você diz?"
          },
          {
            "t": "Onde fica a farmácia?",
            "scenario": "Você precisa comprar remédio e não sabe onde fica a farmácia. O que você pergunta?"
          },
          {
            "t": "Ele está com febre.",
            "scenario": "Seu filho está com febre e você está explicando isso ao médico. O que você diz?"
          },
          { "t": "Minha barriga dói." },
          { "t": "A mão está machucada." },
          { "t": "O pé também dói." },
          { "t": "O médico chega em dez minutos." },
          { "t": "Vou ficar com dor de cabeça se isso continuar." },
          { "t": "Ele não vai se sentir bem amanhã." }
        ],
        "dialogue": {
          "title": "No médico",
          "lines": [
            "O que não vai bem?",
            "Estou com dor de barriga e com febre.",
            "Desde quando?",
            "Desde ontem à noite.",
            "Você precisa descansar."
          ],
          "speakers": ["A", "B", "A", "B", "A"],
          "scene": "Num consultório médico, um paciente conta o que está sentindo.",
          "check": [
            null,
            null,
            {
              "q": "O que o Théo está sentindo?",
              "opts": ["Dor de cabeça", "Dor de barriga e febre", "Dor no pé"]
            }
          ]
        },
        "concepts": {
          "avoir-mal-vs-etre-malade": [
            {
              "title": "\"J'ai mal à la tête\" ou \"je suis malade\"?",
              "body": "Pra dores localizadas numa parte do corpo, usa-se <strong>avoir mal à</strong>: <strong>j'ai mal à la</strong> tête (estou com dor de cabeça). Pra um estado geral de mal-estar, sem apontar uma parte específica, usa-se <strong>être malade</strong>: <strong>je suis malade</strong> (estou doente). A escolha do verbo muda conforme você está descrevendo uma dor específica ou um estado geral.",
              "examples": ["a cabeça", "doente"]
            }
          ],
          "quest-ce-qui-ne-va-pas-ca-va-pas": [
            {
              "title": "\"Qu'est-ce qui ne va pas ?\" no dia a dia vira \"Ça va pas ?\"",
              "body": "A pergunta completa que abre o diálogo, <strong>Qu'est-ce qui ne va pas ?</strong>, costuma encolher bastante na fala cotidiana: <strong>Ça va pas ?</strong> (literalmente \"não vai bem?\") pergunta a mesma coisa, de um jeito bem mais curto e casual — parecido com \"tá tudo bem?\" em português.",
              "examples": ["o que foi? / tá tudo bem? (fala cotidiana)"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa frase é usada quando alguém está com dor de cabeça.",
            "whyNote": "Correto — <strong>j'ai mal à la tête</strong> significa literalmente \"eu tenho mal na cabeça\", ou seja, dor de cabeça."
          }
        ]
      },
      "A1-g6": {
        "title": "Verbos modais e il faut",
        "goal": "Conjugar vouloir, pouvoir, devoir e savoir, e entender quando usar il faut no lugar de devoir.",
        "grammar": {
          "blocks": [
            {
              "title": "Vouloir e pouvoir",
              "body": "Vouloir (querer) e pouvoir (poder) são dois dos verbos mais usados do francês, e aparecem em quase toda conversa do dia a dia. Você já viu os dois em unidades anteriores, sem parar pra pensar na conjugação completa.",
              "examples": ["Você quer uma sobremesa?", "Posso experimentar esse vestido?"]
            },
            {
              "title": "Devoir e savoir",
              "body": "Devoir (dever/precisar) expressa obrigação pessoal, e savoir (saber) expressa conhecimento ou uma habilidade aprendida — diferente de connaître (conhecer um lugar/pessoa), que você vai ver mais adiante.",
              "examples": ["Você precisa descansar.", "Eu sei falar francês."]
            },
            {
              "title": "Il faut: uma alternativa impessoal a devoir",
              "body": "Il faut + infinitivo expressa uma necessidade ou regra geral — sem dizer QUEM precisa fazer algo. Il faut nunca conjuga, é sempre a mesma forma. Já devoir + infinitivo é pessoal: você conjuga o verbo pra dizer que UMA PESSOA específica precisa fazer algo (je dois, tu dois, il doit...). Compare os dois exemplos: o primeiro é uma regra geral, o segundo é dirigido a alguém específico.",
              "examples": [
                "É preciso dormir oito horas. (regra geral, vale pra qualquer um)",
                "Você precisa descansar. (dirigido a você especificamente)"
              ]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Quatro verbos essenciais — todos irregulares, então vale a pena memorizar a tabela inteira. Lembre-se: il faut não está na tabela porque não conjuga, é sempre invariável.",
              "examples": [],
              "table": [
                {
                  "label": "vouloir",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                },
                {
                  "label": "pouvoir",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                },
                {
                  "label": "devoir",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                },
                {
                  "label": "savoir",
                  "pronouns": ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "Je ___ un café.", "hint": "vouloir" },
            { "prompt": "Tu ___ essayer cette robe ?", "hint": "pouvoir" },
            { "prompt": "Nous ___ nous reposer.", "hint": "devoir" },
            { "prompt": "Elle ___ parler trois langues.", "hint": "savoir" },
            { "prompt": "Il ___ manger des légumes tous les jours.", "hint": "il faut (impessoal)" },
            { "prompt": "Vous ___ un dessert ?", "hint": "vouloir" },
            { "prompt": "Ils ___ prendre le bus.", "hint": "pouvoir" },
            { "prompt": "Je ___ nager.", "hint": "savoir" }
          ]
        }
      },
      "A1-16": {
        "title": "Cores e descrições",
        "goal": "Descrever cores, objetos e características de pessoas.",
        "lessons": {
          "vermelho-azul-verde": "Vermelho, azul e verde",
          "amarelo-preto-branco": "Amarelo, preto e branco",
          "tamanho-e-personalidade": "Descrever tamanho e personalidade",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "vermelho",
          "azul",
          "verde",
          "amarelo",
          "preto",
          "branco",
          "grande / alto",
          "pequeno / baixo",
          "bonito",
          "gentil / legal"
        ],
        "phrases": [
          {
            "t": "Eu gosto da cor azul.",
            "scenario": "Alguém pergunta sua cor preferida, que é o azul. O que você diz?"
          },
          {
            "t": "Ela é muito gentil.",
            "scenario": "Alguém pergunta como é a sua nova colega, que é muito gentil. O que você diz?"
          },
          {
            "t": "Meu gato é preto e branco.",
            "scenario": "Alguém pergunta como é o seu gato, que é preto e branco. O que você responde?"
          },
          {
            "t": "É um vestido vermelho bonito.",
            "scenario": "Você está descrevendo um vestido vermelho bonito que viu numa loja. O que você diz?"
          },
          { "t": "O suéter é verde e amarelo." },
          { "t": "O cachorro é pequeno." }
        ],
        "dialogue": {
          "title": "Descrevendo alguém",
          "lines": ["Como é o seu irmão?", "Ele é alto e tem cabelo preto.", "Ele é legal?", "Sim, ele é muito gentil!"],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois amigos conversam e Adrien descreve o irmão para Pauline.",
          "check": [
            null,
            null,
            {
              "q": "Como é o irmão do Adrien?",
              "opts": ["Alto, de cabelo preto e gentil", "Baixo, de cabelo claro e tímido", "Alto e antipático"]
            }
          ]
        },
        "concepts": {
          "adjective-placement": [
            {
              "title": "Por que \"une jolie robe rouge\" e não \"une rouge jolie robe\"?",
              "body": "A maioria dos adjetivos em francês vem <strong>depois</strong> do substantivo (une robe <strong>rouge</strong>, un chat <strong>noir</strong>) — diferente do português, mas parecido também. Só um grupo pequeno de adjetivos comuns e curtos (como jolie, grand, petit, bon) vem <strong>antes</strong>: une <strong>jolie</strong> robe. Por isso \"uma roupa vermelha bonita\" fica <strong>une jolie robe rouge</strong> — jolie antes, rouge depois.",
              "examples": ["vermelho", "bonito"]
            }
          ],
          "gentil-sympa": [
            {
              "title": "\"Gentil\" no dia a dia costuma virar \"sympa\"",
              "body": "Repare que o diálogo que você acabou de ler já usa <strong>sympa</strong> (\"Il est sympa ?\") — abreviação super comum de <strong>sympathique</strong>, usada o tempo todo no lugar de <strong>gentil</strong> pra dizer que alguém é legal/gente boa.",
              "examples": ["legal / gente boa (informal)"]
            }
          ],
          "bandeira-tricolor-historia": [
            {
              "title": "Bleu, blanc, rouge — a origem da bandeira francesa",
              "body": "As 3 cores que você acabou de aprender são as da bandeira francesa: <strong>bleu</strong> e <strong>rouge</strong> eram as cores de Paris, e <strong>blanc</strong> era a cor tradicional da monarquia — a bandeira, criada durante a Revolução Francesa, junta as duas.",
              "examples": ["a bandeira"]
            }
          ]
        }
      },
      "A1-g7": {
        "title": "Comparativos",
        "goal": "Comparar pessoas e coisas usando plus, moins e aussi... que.",
        "grammar": {
          "blocks": [
            {
              "title": "Plus... que (mais... que)",
              "body": "Pra dizer que algo tem \"mais\" de uma característica que outra coisa, usa-se plus + adjetivo + que. É a estrutura de comparação mais comum do francês.",
              "examples": ["Meu irmão é mais alto que eu.", "Esse vestido é mais bonito que o outro."]
            },
            {
              "title": "Moins... que / aussi... que",
              "body": "Do outro lado, moins... que expressa inferioridade (\"menos... que\") e aussi... que expressa igualdade (\"tão... quanto\"). A estrutura é sempre a mesma, só troca a palavrinha do meio.",
              "examples": ["Ela é menos alta que ele.", "Ele é tão gentil quanto o irmão."]
            },
            {
              "title": "Uma irregularidade: bon → meilleur",
              "body": "Assim como em português \"bom\" não vira \"mais bom\" e sim \"melhor\", em francês bon também foge do padrão: não existe \"plus bon\" — a forma correta é meilleur. O mesmo acontece com o advérbio bien (bem), que vira mieux (melhor) no comparativo.",
              "examples": ["Esse bolo é melhor que o outro.", "Ela canta melhor que eu."]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Recapitulando as três estruturas de comparação e a exceção do bon/bien — vale memorizar essa tabela, porque bon → meilleur é um erro muito comum entre iniciantes:",
              "examples": [],
              "table": [
                {
                  "label": "Comparativos",
                  "pronouns": [
                    "superioridade (mais... que)",
                    "inferioridade (menos... que)",
                    "igualdade (tão... quanto)",
                    "bon (bom) → irregular",
                    "bien (bem) → irregular"
                  ]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "Mon frère est ___ grand que moi.", "hint": "superioridade" },
            { "prompt": "Cette maison est ___ petite que l'autre.", "hint": "inferioridade" },
            { "prompt": "Il est ___ gentil que sa sœur.", "hint": "igualdade" },
            { "prompt": "Ce livre est ___ que l'autre.", "hint": "bon → irregular" },
            { "prompt": "Elle est ___ jolie que moi.", "hint": "igualdade" },
            { "prompt": "Ton chat est ___ grand que le mien.", "hint": "inferioridade" }
          ]
        }
      },
      "A1-17": {
        "title": "A casa e os cômodos",
        "goal": "Descrever uma casa, dizer o que tem (e o que não tem) nela.",
        "lessons": {
          "casa-apartamento-quarto": "Casa, apartamento e quarto",
          "cozinha-banheiro-sala": "Cozinha, banheiro e sala",
          "porta-janela-tem-nao-tem": "Porta, janela e dizer o que tem ou não tem",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a casa",
          "o apartamento",
          "o quarto",
          "a cozinha",
          "o banheiro",
          "a sala",
          "a porta",
          "a janela",
          "tem / há",
          "não tem / não há"
        ],
        "phrases": [
          {
            "t": "Tem um quarto.",
            "scenario": "Alguém pergunta quantos quartos tem seu apartamento pequeno, que tem só um. O que você diz?"
          },
          {
            "t": "Tem dois banheiros.",
            "scenario": "Você está descrevendo sua casa, que tem dois banheiros. O que você diz?"
          },
          {
            "t": "Não tem jardim.",
            "scenario": "Alguém pergunta se seu apartamento tem jardim, e não tem. O que você responde?"
          },
          {
            "t": "É uma casa grande.",
            "scenario": "Você está descrevendo a casa nova dos seus pais, que é bem grande. O que você diz?"
          },
          { "t": "A casa é bem grande." },
          { "t": "O apartamento tem dois quartos." },
          { "t": "O quarto fica no primeiro andar." },
          { "t": "A cozinha está bem limpa." },
          { "t": "O banheiro fica ao lado do quarto." },
          { "t": "A sala de estar é confortável." },
          { "t": "A porta está trancada." },
          { "t": "A janela dá para o jardim." }
        ],
        "dialogue": {
          "title": "Visitando um apartamento",
          "lines": [
            "Tem quantos quartos?",
            "Tem dois quartos e uma cozinha.",
            "Tem uma varanda?",
            "Não, não tem varanda, mas tem uma sala bonita."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Numa visita a um apartamento para alugar, a cliente faz perguntas ao corretor.",
          "check": [
            null,
            null,
            {
              "q": "O apartamento tem varanda?",
              "opts": ["Sim, e dois quartos", "Não, mas tem uma sala bonita", "Não, e não tem cozinha"]
            }
          ]
        },
        "concepts": {
          "il-y-a-vs-negation": [
            {
              "title": "\"Il y a\" ou \"il n'y a pas de\"?",
              "body": "<strong>Il y a</strong> (tem/há) apresenta algo que existe: il y a <strong>une</strong> chambre (tem um quarto). Na negação, o artigo vira <strong>de</strong>, igual às unidades de \"comidas\" e \"quantidades\": il n'y a <strong>pas de</strong> jardin (não tem jardim) — nunca \"il n'y a pas un jardin\".",
              "examples": ["tem / há", "não tem / não há"]
            }
          ],
          "il-y-a-ya": [
            {
              "title": "\"Il y a\" no dia a dia vira \"y'a\"",
              "body": "Na fala corrida, o \"il\" de <strong>il y a</strong> quase desaparece — sobra só <strong>y'a</strong>: \"y'a une chambre\", \"y'a pas de jardin\". É tão comum que aparece até em mensagens escritas informais. Nos exercícios daqui, continue escrevendo \"il y a\" completo — é a forma que os exercícios pedem.",
              "examples": ["tem um quarto (fala cotidiana)"]
            }
          ],
          "andar-terreo-premier-etage": [
            {
              "title": "\"1er étage\" não é o térreo",
              "body": "Na França, o andar térreo tem nome próprio: <strong>le rez-de-chaussée</strong>. A contagem só começa depois dele — <strong>le premier étage</strong> é o que, no Brasil, chamaríamos de \"segundo andar\" (um andar acima do térreo). Vale prestar atenção nisso ao procurar um endereço ou pegar o elevador.",
              "examples": ["o térreo", "o 1º andar (acima do térreo)"]
            }
          ]
        }
      },
      "A1-18": {
        "title": "Onde as coisas estão",
        "goal": "Descrever a posição de móveis e objetos usando preposições de lugar.",
        "lessons": {
          "cama-mesa-cadeira": "Cama, mesa e cadeira",
          "sofa-luminaria-em-cima": "Sofá, luminária e em cima de",
          "embaixo-frente-atras-lado": "Embaixo, na frente, atrás e ao lado",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "a cama",
          "a mesa",
          "a cadeira",
          "o sofá",
          "a luminária",
          "em cima de",
          "embaixo de",
          "na frente de",
          "atrás de",
          "ao lado de"
        ],
        "phrases": [
          {
            "t": "A cama fica ao lado da janela.",
            "scenario": "Você está descrevendo seu quarto e onde fica a cama, ao lado da janela. O que você diz?"
          },
          {
            "t": "Tem uma luminária em cima da mesa.",
            "scenario": "Alguém pergunta o que tem em cima da mesa — uma luminária. O que você responde?"
          },
          {
            "t": "O gato está embaixo do sofá.",
            "scenario": "Você está procurando o gato e o encontra embaixo do sofá. O que você diz?"
          },
          {
            "t": "A cadeira azul fica na frente da mesa.",
            "scenario": "Você está explicando onde fica a cadeira azul, na frente da mesa. O que você diz?"
          },
          { "t": "O gato está atrás da cadeira." }
        ],
        "dialogue": {
          "title": "Arrumando o quarto",
          "lines": [
            "Onde está minha mochila?",
            "Está embaixo da cama.",
            "E minhas chaves?",
            "Estão em cima da mesa, do lado da luminária."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Em casa, um menino procura suas coisas antes de sair para a escola.",
          "check": [
            null,
            null,
            {
              "q": "Onde estão as chaves do Enzo?",
              "opts": ["Embaixo da cama", "Em cima da mesa, ao lado da luminária", "Atrás do sofá"]
            }
          ]
        },
        "concepts": {
          "sur-vs-dans": [
            {
              "title": "\"Sur\" ou \"dans\"?",
              "body": "<strong>Sur</strong> é \"em cima de\", uma superfície: il y a une lampe <strong>sur</strong> la table. <strong>Dans</strong> é \"dentro de\", um espaço fechado: il y a des vêtements <strong>dans</strong> l'armoire. Os dois costumam ser confundidos por quem fala português, já que às vezes usamos \"em\" pras duas situações.",
              "examples": ["em cima de"]
            }
          ]
        }
      },
      "A1-19": {
        "title": "Lazer e atividades",
        "goal": "Falar sobre hobbies e combinar programas de fim de semana.",
        "lessons": {
          "cinema-musica-esporte": "Cinema, música e esporte",
          "ler-jogar-dancar": "Ler, jogar/tocar e dançar",
          "cantar-fim-de-semana-sair-filme": "Cantar, o fim de semana, sair e o filme",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "o cinema",
          "a música",
          "o esporte",
          "ler",
          "jogar / tocar (instrumento)",
          "dançar",
          "cantar",
          "o fim de semana",
          "sair",
          "o filme"
        ],
        "phrases": [
          {
            "t": "O que você faz no fim de semana?",
            "scenario": "Você quer saber o que um amigo costuma fazer nos fins de semana. O que você pergunta?"
          },
          {
            "t": "Eu gosto de ler livros.",
            "scenario": "Alguém pergunta seu hobby favorito, que é ler livros. O que você diz?"
          },
          {
            "t": "A gente vai ao cinema hoje à noite?",
            "scenario": "Você quer convidar um amigo para ir ao cinema hoje à noite. O que você pergunta?"
          },
          {
            "t": "Ele toca guitarra.",
            "scenario": "Alguém pergunta o que seu irmão sabe fazer — ele toca guitarra. O que você responde?"
          },
          { "t": "O cinema está fechado hoje à noite." },
          { "t": "Eu adoro ouvir música." },
          { "t": "O esporte é bom para a saúde." },
          { "t": "As crianças gostam de brincar lá fora." },
          { "t": "Ela adora dançar e cantar." },
          { "t": "Vamos sair no sábado à noite." },
          { "t": "O filme começa às vinte horas." }
        ],
        "dialogue": {
          "title": "O fim de semana",
          "lines": [
            "Você tem planos pro fim de semana?",
            "Sim, eu vou ao cinema com amigos.",
            "Qual filme vocês vão ver?",
            "A gente ainda não sabe!"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Na sexta-feira, dois amigos falam dos planos para o fim de semana.",
          "check": [
            null,
            null,
            {
              "q": "Eles já escolheram o filme?",
              "opts": ["Sim, já escolheram", "Ainda não sabem qual", "Não vão ao cinema"]
            }
          ]
        },
        "concepts": {
          "jouer-de-vs-jouer-a": [
            {
              "title": "\"Jouer DE la guitare\" ou \"jouer AU foot\"?",
              "body": "Pra instrumentos musicais, usa-se <strong>jouer de</strong>: jouer <strong>de la</strong> guitare, jouer <strong>du</strong> piano. Pra esportes e jogos, usa-se <strong>jouer à</strong>: jouer <strong>au</strong> foot, jouer <strong>aux</strong> cartes. É uma regrinha simples, mas sem ela dá pra trocar tudo — vale decorar esse par de preposições.",
              "examples": ["jogar / tocar (instrumento)"]
            }
          ],
          "cinema-nasceu-na-franca": [
            {
              "title": "O cinema nasceu na França",
              "body": "Em 1895, os irmãos <strong>Auguste e Louis Lumière</strong> fizeram em Paris a primeira exibição pública e paga de filmes da história, usando o cinematógrafo que eles mesmos inventaram. É por isso que a França é considerada o berço do cinema — e até hoje tem uma cena cinematográfica muito valorizada, com o Festival de Cannes entre os mais importantes do mundo.",
              "examples": ["o cinema"]
            }
          ],
          "ne-drop-on-sait-pas": [
            {
              "title": "\"On ne sait pas encore !\" no dia a dia perde o \"ne\"",
              "body": "Na fala cotidiana, o <strong>ne</strong> da negação quase sempre desaparece — <strong>on sait pas encore</strong> em vez de \"on ne sait pas encore\". É provavelmente a simplificação mais comum de todo o francês falado, e vale pra qualquer negação com \"ne... pas\". Nos exercícios daqui, continue escrevendo o \"ne\" — é a forma que os exercícios pedem.",
              "examples": ["a gente ainda não sabe (fala cotidiana)"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa é uma forma de convidar alguém pra sair.",
            "whyNote": "Correto — <strong>on va...?</strong> é um jeito casual de propor um programa, tipo \"vamos ao cinema hoje à noite?\"."
          }
        ]
      },
      "A1-g8": {
        "title": "Advérbios de frequência",
        "goal": "Usar toujours, souvent, parfois, rarement e jamais pra dizer com que frequência você faz algo.",
        "grammar": {
          "blocks": [
            {
              "title": "Advérbios de frequência",
              "body": "Do mais frequente ao menos frequente: toujours (sempre), souvent (frequentemente), parfois (às vezes), rarement (raramente) e jamais (nunca). No francês, o advérbio geralmente vem logo depois do verbo conjugado — não antes, como em inglês.",
              "examples": ["Eu sempre leio à noite.", "Ela às vezes toca guitarra."]
            },
            {
              "title": "Onde colocar o advérbio",
              "body": "A posição logo após o verbo vale pra qualquer verbo do dia a dia — inclusive os de lazer que você acabou de aprender.",
              "examples": ["Nós saímos frequentemente no fim de semana.", "Ele canta raramente."]
            },
            {
              "title": "Jamais precisa de ne",
              "body": "Jamais (nunca) funciona como uma negação — por isso precisa do ne antes do verbo, igual em ne...pas. A estrutura completa é ne...jamais.",
              "examples": ["Eu nunca danço.", "Ele nunca sai na segunda-feira."]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Aqui está a escala completa, do mais ao menos frequente — vale revisitar sempre que precisar descrever um hábito:",
              "examples": [],
              "table": [
                {
                  "label": "Advérbios (do mais ao menos frequente)",
                  "pronouns": ["sempre", "frequentemente", "às vezes", "raramente", "nunca (+ ne)"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "Je vais ___ au cinéma le week-end.", "hint": "sempre" },
            { "prompt": "Il joue ___ de la guitare.", "hint": "às vezes" },
            { "prompt": "Nous sortons ___ le dimanche.", "hint": "frequentemente" },
            { "prompt": "Elle ne chante ___.", "hint": "nunca" },
            { "prompt": "Tu lis ___ des livres ?", "hint": "raramente" },
            { "prompt": "Vous dansez ___ !", "hint": "sempre" }
          ]
        }
      },
      "A1-20": {
        "title": "Expressões de tempo passado",
        "goal": "Aprender marcadores de tempo pra falar sobre o passado, como preparação pro passé composé.",
        "lessons": {
          "ontem-anteontem-semana-passada": "Ontem, anteontem e a semana passada",
          "fim-de-semana-mes-ano-passados": "Fim de semana, mês e ano passados",
          "dois-dias-atras-ja-recentemente": "Há dois dias, hoje de manhã, já e recentemente",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "ontem",
          "anteontem",
          "a semana passada",
          "o fim de semana passado",
          "o mês passado",
          "o ano passado",
          "há dois dias / dois dias atrás",
          "esta manhã",
          "já",
          "recentemente"
        ],
        "phrases": [
          {
            "t": "Ontem eu visitei um museu.",
            "scenario": "Alguém pergunta o que você fez ontem, e você visitou um museu. O que você responde?"
          },
          {
            "t": "Semana passada eu comi num restaurante.",
            "scenario": "Alguém pergunta o que você fez de especial semana passada — comeu num restaurante. O que você diz?"
          },
          {
            "t": "No fim de semana passado, choveu.",
            "scenario": "Alguém pergunta como foi o tempo no fim de semana passado — choveu bastante. O que você responde?"
          },
          {
            "t": "Você já visitou Paris?",
            "scenario": "Você quer saber se um amigo já foi a Paris alguma vez. O que você pergunta?"
          },
          { "t": "Anteontem, eu visitei Paris." },
          { "t": "No mês passado, eu viajei para a França." },
          { "t": "No ano passado, eu aprendi francês." },
          { "t": "Há dois dias, choveu." },
          { "t": "Hoje de manhã, eu tomei um café." },
          { "t": "Recentemente, eu mudei de emprego." }
        ],
        "dialogue": {
          "title": "O que você fez ontem?",
          "lines": [
            "O que você fez ontem?",
            "Eu trabalhei de manhã, e à tarde eu fiz esporte.",
            "E no fim de semana passado?",
            "A gente foi ao cinema com amigos."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Na segunda-feira, dois colegas contam o que fizeram ontem e no fim de semana passado.",
          "check": [
            null,
            null,
            {
              "q": "O que o Kévin fez à tarde, ontem?",
              "opts": ["Trabalhou", "Fez esporte", "Foi ao cinema"]
            }
          ]
        },
        "concepts": {
          "hier-vs-semaine-derniere": [
            {
              "title": "\"Hier\" ou \"la semaine dernière\"?",
              "body": "<strong>Hier</strong> aponta um dia específico (ontem). <strong>La semaine/le week-end dernier(-ère)</strong> aponta um período mais largo (semana ou fim de semana passados). Todos combinam bem com o passé composé que você já viu: <strong>hier, j'ai visité</strong> un musée / <strong>la semaine dernière, j'ai mangé</strong> au restaurant.",
              "examples": ["ontem", "a semana passada"]
            }
          ],
          "quest-ce-que-tu-as-fait-wh-in-situ": [
            {
              "title": "\"Qu'est-ce que tu as fait hier ?\" também vira \"T'as fait quoi hier ?\"",
              "body": "Na fala bem cotidiana, essa pergunta costuma ficar assim: <strong>t'as fait quoi hier ?</strong> — \"qu'est-ce que\" some, \"quoi\" vai pro fim, e \"tu as\" contrai pra \"t'as\". Três simplificações ao mesmo tempo, todas muito comuns juntas. Nos exercícios daqui, continue usando a forma completa — é a que os exercícios pedem.",
              "examples": ["o que você fez ontem? (fala bem cotidiana)"]
            }
          ]
        }
      },
      "A1-g9": {
        "title": "O passé composé",
        "goal": "Conjugar o passé composé com avoir e com être pra falar sobre ações do passado.",
        "grammar": {
          "blocks": [
            {
              "title": "Passé composé com avoir",
              "body": "O passé composé é o tempo mais comum pra falar do passado em francês. A maioria dos verbos o forma com o presente de avoir + o particípio passado. Verbos regulares em -er formam o particípio trocando o -er por -é.",
              "examples": ["Eu comi no restaurante.", "Ela trabalhou o dia todo."]
            },
            {
              "title": "Alguns particípios irregulares",
              "body": "Alguns verbos muito comuns têm particípio irregular, que precisa ser memorizado — como faire → fait e prendre → pris, dois verbos que você já conhece.",
              "examples": ["Eu fiz esporte ontem.", "Ele pegou o trem."]
            },
            {
              "title": "Passé composé com être",
              "body": "Um grupo pequeno de verbos (principalmente de movimento, como aller) e TODOS os verbos pronominais usam être como auxiliar, não avoir. Quando o auxiliar é être, o particípio concorda em gênero e número com o sujeito — ganha um -e pro feminino e um -s pro plural.",
              "examples": [
                "Ela foi ao mercado. (être + concordância feminina)",
                "Eu levantei cedo. (verbo pronominal, sempre com être)"
              ]
            },
            {
              "title": "Très bien! 🎉",
              "body": "Você concluiu o nível A1! Aqui está um resumo dos dois auxiliares — repare que a maioria dos verbos usa avoir, e être fica reservado pra movimento e verbos pronominais:",
              "examples": [],
              "table": [
                {
                  "label": "Com avoir (maioria dos verbos)",
                  "pronouns": ["manger →", "faire →", "prendre →"]
                },
                {
                  "label": "Com être (movimento + pronominais)",
                  "pronouns": ["aller →", "arriver →", "se lever →"]
                }
              ]
            }
          ],
          "exercises": [
            { "prompt": "J'___ mangé une pomme.", "hint": "avoir (manger)" },
            { "prompt": "Tu ___ fait du sport ?", "hint": "avoir (faire)" },
            { "prompt": "Il ___ pris le bus.", "hint": "avoir (prendre)" },
            { "prompt": "Nous ___ travaillé ensemble.", "hint": "avoir (travailler)" },
            { "prompt": "Elle ___ allée au marché.", "hint": "être (aller)" },
            { "prompt": "Je me ___ levé tôt.", "hint": "être (se lever)" },
            { "prompt": "Ils ___ visité Paris.", "hint": "avoir (visiter)" },
            { "prompt": "Vous ___ arrivés à quelle heure ?", "hint": "être (arriver)" }
          ]
        }
      }
    },
    "levels": { "A1": "Nível 1 · Débutant", "A2": "Nível 2 · Élémentaire" },
    "modules": {
      "A1-m1": "Primeiros contatos",
      "A1-m2": "Rotina do dia a dia",
      "A1-m3": "Cidade e identidade",
      "A1-m4": "Deslocando-se e cuidando de si",
      "A1-m5": "Descrevendo o mundo ao redor",
      "A1-m6": "Lazer e o passado"
    },
    "levelTests": { "A1-final": "Teste de Nível A1" },
    "dictations": {
      "d1": { "task": "Se apresentando em sala de aula" },
      "d2": { "task": "Pedindo pão" },
      "d3": { "task": "Explicando o caminho até o museu" },
      "d4": { "task": "Um dia de chuva e dor de barriga" },
      "d5": { "task": "Apresentando a irmã e a casa dela" },
      "d6": { "task": "Planejando o fim de semana" },
      "d1-p1": { "task": "Apresentando um colega e uma amiga" },
      "d1-p2": { "task": "Apresentando dois amigos" },
      "d2-p1": { "task": "A manhã de uma terça-feira" },
      "d2-p2": { "task": "Um dia de descanso" },
      "d3-p1": { "task": "Uma brasileira em Paris" },
      "d3-p2": { "task": "Comprando uma roupa" },
      "d4-p1": { "task": "Léa na farmácia" },
      "d4-p2": { "task": "Um dia de inverno" },
      "d5-p1": { "task": "Passeando pela casa" },
      "d5-p2": { "task": "O quarto e as coisas dele" },
      "d6-p1": { "task": "O que fiz ontem e hoje" },
      "d6-p2": { "task": "Convidando um amigo para o fim de semana" },
      "r1": { "task": "Revisão do A1 · Eu e minha rotina" },
      "r2": { "task": "Revisão do A1 · Cidade, compras e deslocamento" },
      "r3": { "task": "Revisão do A1 · Casa, família e fim de semana" }
    },
    "conjugation": {
      "tenseExamples": {
        "presente": "Eu pego o metrô todas as manhãs.",
        "passeCompose": "Ontem, eu comi uma pizza.",
        "imparfait": "Quando eu era pequeno, eu jogava futebol todo domingo.",
        "plusQueParfait": "Quando eu cheguei, o filme já tinha começado.",
        "futurSimple": "Ano que vem, eu irei para Paris.",
        "condPresente": "Eu gostaria de um café, por favor.",
        "subjPresente": "Você tem que vir amanhã.",
        "imperatif": "Leve o guarda-chuva!"
      },
      "groups": {
        "core": { "label": "Être / avoir / aller / faire", "desc": "Os 4 verbos mais irregulares e mais usados do francês" },
        "g1": {
          "label": "1er groupe (-er)",
          "desc": "Verbos regulares terminados em -er (a grande maioria dos verbos franceses)"
        },
        "g2": { "label": "2e groupe (-ir)", "desc": "Verbos regulares tipo finir (nous finissons)" },
        "g3ir": { "label": "3e groupe irregular (-ir)", "desc": "Ex: venir, partir, dormir, ouvrir" },
        "g3re": { "label": "3e groupe irregular (-re)", "desc": "Ex: prendre, mettre, dire, boire" },
        "g3oir": { "label": "3e groupe irregular (-oir)", "desc": "Ex: pouvoir, vouloir, devoir, savoir" }
      },
      "verbTranslations": {
        "être": "ser / estar",
        "avoir": "ter",
        "aller": "ir",
        "faire": "fazer",
        "parler": "falar",
        "aimer": "amar / gostar",
        "habiter": "morar",
        "manger": "comer",
        "chercher": "procurar",
        "penser": "pensar",
        "donner": "dar",
        "jouer": "jogar / brincar",
        "écouter": "escutar",
        "regarder": "olhar / assistir",
        "travailler": "trabalhar",
        "arriver": "chegar",
        "entrer": "entrar",
        "rester": "ficar",
        "passer": "passar",
        "montrer": "mostrar",
        "demander": "pedir / perguntar",
        "trouver": "encontrar",
        "aider": "ajudar",
        "commencer": "começar",
        "continuer": "continuar",
        "changer": "mudar",
        "chanter": "cantar",
        "dessiner": "desenhar",
        "dépenser": "gastar",
        "gagner": "ganhar",
        "acheter": "comprar",
        "appeler": "chamar / ligar",
        "jeter": "jogar fora",
        "préférer": "preferir",
        "espérer": "esperar (desejar)",
        "payer": "pagar",
        "envoyer": "enviar",
        "nettoyer": "limpar",
        "employer": "empregar / usar",
        "essayer": "tentar",
        "voyager": "viajar",
        "ranger": "arrumar",
        "partager": "compartilhar",
        "marcher": "andar / caminhar",
        "tomber": "cair",
        "casser": "quebrar",
        "laver": "lavar",
        "préparer": "preparar",
        "inviter": "convidar",
        "accepter": "aceitar",
        "refuser": "recusar",
        "oublier": "esquecer",
        "expliquer": "explicar",
        "présenter": "apresentar",
        "apporter": "trazer",
        "emmener": "levar (alguém)",
        "amener": "trazer / levar",
        "rentrer": "voltar (pra casa)",
        "retourner": "voltar / retornar",
        "quitter": "deixar / sair de",
        "fermer": "fechar",
        "utiliser": "usar",
        "danser": "dançar",
        "nager": "nadar",
        "skier": "esquiar",
        "coûter": "custar",
        "durer": "durar",
        "sembler": "parecer",
        "exister": "existir",
        "participer": "participar",
        "décider": "decidir",
        "tourner": "virar / girar",
        "compter": "contar",
        "mesurer": "medir",
        "peser": "pesar",
        "pousser": "empurrar",
        "tirer": "puxar",
        "lancer": "lançar",
        "attraper": "pegar / capturar",
        "toucher": "tocar",
        "sonner": "tocar (campainha)",
        "garder": "guardar",
        "signer": "assinar",
        "copier": "copiar",
        "coller": "colar",
        "imprimer": "imprimir",
        "allumer": "acender / ligar",
        "éteindre": "apagar / desligar",
        "installer": "instalar",
        "vérifier": "verificar",
        "confirmer": "confirmar",
        "annuler": "cancelar",
        "réserver": "reservar",
        "emprunter": "pegar emprestado",
        "prêter": "emprestar",
        "rembourser": "reembolsar",
        "économiser": "economizar",
        "déjeuner": "almoçar",
        "dîner": "jantar",
        "cuisiner": "cozinhar",
        "goûter": "provar / lanchar",
        "commander": "pedir (encomendar)",
        "servir": "servir",
        "laisser": "deixar",
        "téléphoner": "telefonar",
        "discuter": "discutir / conversar",
        "raconter": "contar (uma história)",
        "crier": "gritar",
        "pleurer": "chorar",
        "rêver": "sonhar",
        "imaginer": "imaginar",
        "rappeler": "ligar de volta / lembrar",
        "noter": "anotar",
        "marquer": "marcar",
        "peindre": "pintar",
        "filmer": "filmar",
        "enregistrer": "gravar",
        "publier": "publicar",
        "poster": "postar",
        "suivre": "seguir",
        "bloquer": "bloquear",
        "brancher": "conectar / plugar",
        "débrancher": "desconectar",
        "réparer": "consertar",
        "construire": "construir",
        "planter": "plantar",
        "arroser": "regar",
        "couper": "cortar",
        "sécher": "secar",
        "plier": "dobrar",
        "déranger": "incomodar",
        "emballer": "embrulhar",
        "déballer": "desembrulhar",
        "finir": "terminar",
        "choisir": "escolher",
        "réussir": "conseguir / ter êxito",
        "remplir": "preencher",
        "grandir": "crescer",
        "grossir": "engordar",
        "maigrir": "emagrecer",
        "vieillir": "envelhecer",
        "rougir": "corar / ficar vermelho",
        "pâlir": "empalidecer",
        "réfléchir": "refletir",
        "obéir": "obedecer",
        "punir": "punir",
        "avertir": "avisar",
        "établir": "estabelecer",
        "fournir": "fornecer",
        "guérir": "curar",
        "nourrir": "alimentar",
        "saisir": "agarrar / apreender",
        "agir": "agir",
        "bâtir": "construir (edificar)",
        "ralentir": "desacelerar",
        "accomplir": "realizar",
        "applaudir": "aplaudir",
        "atterrir": "aterrissar",
        "définir": "definir",
        "envahir": "invadir",
        "franchir": "atravessar",
        "investir": "investir",
        "jouir": "desfrutar",
        "rajeunir": "rejuvenescer",
        "trahir": "trair",
        "venir": "vir",
        "tenir": "segurar",
        "partir": "partir",
        "sortir": "sair",
        "dormir": "dormir",
        "sentir": "sentir",
        "mentir": "mentir",
        "courir": "correr",
        "ouvrir": "abrir",
        "offrir": "oferecer",
        "souffrir": "sofrer",
        "couvrir": "cobrir",
        "découvrir": "descobrir",
        "mourir": "morrer",
        "devenir": "tornar-se",
        "revenir": "voltar",
        "obtenir": "obter",
        "maintenir": "manter",
        "appartenir": "pertencer",
        "retenir": "reter",
        "prendre": "pegar",
        "apprendre": "aprender",
        "comprendre": "entender",
        "surprendre": "surpreender",
        "mettre": "colocar",
        "permettre": "permitir",
        "promettre": "prometer",
        "dire": "dizer",
        "lire": "ler",
        "écrire": "escrever",
        "décrire": "descrever",
        "vivre": "viver",
        "conduire": "dirigir",
        "traduire": "traduzir",
        "connaître": "conhecer",
        "reconnaître": "reconhecer",
        "naître": "nascer",
        "plaire": "agradar",
        "battre": "bater",
        "rompre": "romper",
        "interrompre": "interromper",
        "attendre": "esperar (aguardar)",
        "entendre": "ouvir",
        "vendre": "vender",
        "descendre": "descer",
        "répondre": "responder",
        "perdre": "perder",
        "rendre": "devolver",
        "défendre": "defender",
        "boire": "beber",
        "croire": "acreditar",
        "rire": "rir",
        "sourire": "sorrir",
        "craindre": "temer",
        "joindre": "juntar / anexar",
        "atteindre": "atingir",
        "résoudre": "resolver",
        "coudre": "costurar",
        "moudre": "moer",
        "disparaître": "desaparecer",
        "paraître": "parecer",
        "apparaître": "aparecer",
        "pouvoir": "poder",
        "vouloir": "querer",
        "devoir": "dever",
        "savoir": "saber",
        "voir": "ver",
        "revoir": "rever",
        "recevoir": "receber",
        "apercevoir": "perceber / avistar",
        "décevoir": "decepcionar",
        "falloir": "ser preciso",
        "pleuvoir": "chover",
        "valoir": "valer",
        "s'asseoir": "sentar-se",
        "prévoir": "prever"
      }
    }
  };
  var g = typeof window !== 'undefined' ? window : globalThis;
  g.COURSE_LAYERS = g.COURSE_LAYERS || {};
  g.COURSE_LAYERS['frances@pt-BR'] = L;
  CourseLayer.apply({
    units: typeof UNITS !== 'undefined' ? UNITS : undefined,
    levels: typeof LEVELS !== 'undefined' ? LEVELS : undefined,
    modules: typeof MODULES !== 'undefined' ? MODULES : undefined,
    levelTests: typeof LEVEL_TESTS !== 'undefined' ? LEVEL_TESTS : undefined,
    stories: typeof STORIES !== 'undefined' ? STORIES : undefined,
    hanzi: typeof HANZI_LESSONS !== 'undefined' ? HANZI_LESSONS : undefined,
    dictations: typeof DICTATIONS !== 'undefined' ? DICTATIONS : undefined,
    conjugation: typeof CONJUGATION_GROUPS !== 'undefined' ? { groups: CONJUGATION_GROUPS, verbTranslations: VERB_TRANSLATIONS, tenseExamples: typeof CONJ_TENSE_EXAMPLES !== 'undefined' ? CONJ_TENSE_EXAMPLES : undefined } : undefined
  }, L);
})();
