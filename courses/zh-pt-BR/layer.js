// CAMADA DO CURSO mandarim@pt-BR (E2): todo o texto em português dos dados de zh/ (content.js, stories.js, hanzi-data.js).
// Carrega DEPOIS desses arquivos e de shared/course-layer.js e se aplica sozinha sobre o que existir na página.
// Formato: o mesmo do overlay de inglês (shared/content-i18n.js) mais dialogue.speakers, stories, hanzi, dictations e conjugation.
// Editar este arquivo para mudar texto em português; ids, frases do idioma estudado e ordem ficam em zh/.
(function(){
  var L = {
    "units": {
      "1": {
        "title": "Cumprimentar e se despedir",
        "goal": "Cumprimentar alguém, se despedir e agradecer numa interação básica.",
        "lessons": {
          "cumprimentar": "Cumprimentar e agradecer",
          "desculpas": "Pedir desculpa e responder",
          "saudacoes": "Saudar de manhã e à noite",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "olá",
          "tchau / até logo",
          "obrigado(a)",
          "de nada",
          "desculpe",
          "tudo bem / não tem problema",
          "bom dia",
          "boa noite (saudação)"
        ],
        "phrases": [
          { "t": "Olá! Eu me chamo {nome}." },
          { "t": "Obrigada!" },
          { "t": "Desculpe, eu não entendo." },
          { "t": "Ah, sim! Eu também." }
        ],
        "dialogue": {
          "title": "Encontro na rua",
          "lines": ["Olá!", "Olá! Bom dia.", "Obrigada, até logo!", "Até logo!"],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Duas pessoas se encontram na rua pela manhã.",
          "check": [
            null,
            null,
            {
              "q": "Em que parte do dia acontece essa conversa?",
              "opts": ["De manhã", "À noite", "Não dá para saber"]
            }
          ]
        },
        "concepts": {
          "duibuqi-vs-meiguanxi": [
            {
              "title": "\"Duìbuqǐ\" ou \"méi guānxi\"?",
              "body": "<strong>Duìbuqǐ</strong> (对不起) é quem pede desculpa. <strong>Méi guānxi</strong> (没关系) é a resposta de quem recebe o pedido — \"tudo bem, não tem problema\". São as duas metades de uma mesma troca, não sinônimos: nunca se usa méi guānxi pra pedir desculpa, nem duìbuqǐ pra tranquilizar alguém.",
              "examples": ["desculpe (quem pede)", "tudo bem (quem responde)"]
            }
          ],
          "bu-negation": [
            {
              "title": "不 (bù) — negação padrão",
              "body": "不 (bù) é a negação mais comum do chinês — vem sempre antes do verbo ou adjetivo que se quer negar. Diferente do português, não muda de forma dependendo de quem fala ou de quando algo acontece.",
              "examples": ["eu não entendo", "não é caro"]
            }
          ],
          "zaijian-baibai": [
            {
              "title": "\"再见\" no dia a dia costuma virar \"拜拜\"",
              "body": "<strong>再见 (zàijiàn)</strong> é a despedida padrão e sempre correta. No dia a dia, principalmente entre pessoas mais jovens, é muito comum ouvir <strong>拜拜 (bàibài)</strong> — emprestado do inglês \"bye-bye\" — em vez de 再见, especialmente ao telefone ou em mensagens.",
              "examples": ["tchau (informal, do inglês \"bye-bye\")"]
            }
          ],
          "duibuqi-buhaoyisi": [
            {
              "title": "Pra coisas pequenas, \"对不起\" costuma virar \"不好意思\"",
              "body": "<strong>对不起 (duìbuqǐ)</strong> é a forma padrão de pedir desculpa, mas no dia a dia costuma soar pesada demais pra coisas pequenas — esbarrar em alguém, chegar um pouco atrasado, interromper. Pra essas situações, é muito mais comum ouvir <strong>不好意思 (bù hǎoyìsi)</strong>, um pedido de desculpa mais leve, quase como \"foi mal\" ou \"com licença\".",
              "examples": ["foi mal / com licença (desculpa leve, coisas pequenas)"]
            }
          ],
          "zaoshang-hao-zao": [
            {
              "title": "\"早上好\" no dia a dia vira só \"早\"",
              "body": "<strong>早上好 (zǎoshang hǎo)</strong> é a forma completa e educada de \"bom dia\". No dia a dia, entre pessoas que já se conhecem — colegas, vizinhos, amigos — é muito mais comum ouvir só <strong>早 (zǎo)</strong>, literalmente \"cedo\". Usar a forma completa com alguém próximo pode até soar um pouco formal demais.",
              "examples": ["bom dia (informal, curto)"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Isto é o que dizemos quando recebemos um presente de outra pessoa.",
            "whyNote": "Correto — <strong>谢谢 (xièxiè)</strong> é \"obrigado(a)\", usado sempre que alguém faz algo por você, incluindo dar um presente."
          }
        ]
      },
      "2": {
        "title": "Se apresentar",
        "goal": "Dizer o nome, nacionalidade e perguntar o mesmo para o outro.",
        "lessons": {
          "nome": "Eu, você e como se chamar",
          "ser-pessoa": "Nome e o verbo ser",
          "nacionalidade": "Dizer de que país você é",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": ["eu", "você", "chamar-se", "nome", "ser/estar", "pessoa", "Brasil", "China", "qual", "país"],
        "phrases": [
          { "t": "Qual é o seu nome?" },
          { "t": "Eu sou {nacionalidade_t}." },
          { "t": "De que país você é?" }
        ],
        "dialogue": {
          "title": "Primeiro encontro",
          "lines": [
            "Olá, qual é o seu nome?",
            "Eu me chamo Brune. E você?",
            "Eu me chamo Xiao Li. De que país você é?",
            "Eu sou brasileira."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Brune conhece Xiao Li num evento de intercâmbio.",
          "check": [
            null,
            null,
            {
              "q": "De que país Brune é?",
              "opts": ["Brasil", "China", "A conversa não diz"]
            }
          ]
        },
        "concepts": {
          "shi": [
            {
              "title": "是 (shì) — o verbo \"ser\"",
              "body": "是 (shì) equivale ao verbo \"ser\", mas com uma diferença importante: só liga substantivos entre si, nunca um substantivo a um adjetivo. E os verbos em chinês nunca são conjugados — a forma de 是 não muda no presente, passado ou futuro.",
              "examples": ["eu sou brasileira"]
            },
            {
              "title": "\"Wǒ shì Bāxī rén\" ou \"wǒ jiào Brune\"?",
              "body": "<strong>Shì</strong> liga você a uma categoria — nacionalidade, profissão, identidade. <strong>Jiào</strong> (叫) é usado só pra dizer o nome. Repare que \"eu me chamo\" nunca usa shì em chinês — só jiào.",
              "examples": ["eu me chamo Brune", "eu sou brasileira"]
            }
          ],
          "svo-order": [
            {
              "title": "Ordem básica da frase: Sujeito + Verbo + Objeto",
              "body": "A estrutura mais comum de uma frase em chinês segue a mesma ordem do português: sujeito, depois verbo, depois objeto. Diferente do português, o chinês tem pouca flexibilidade nessa ordem — mudar a posição das palavras muda o significado da frase.",
              "examples": ["de que país você é?"]
            }
          ],
          "shi-drop-casual": [
            {
              "title": "\"Wǒ shì Bāxī rén\" às vezes perde o \"shì\"",
              "body": "Na fala rápida e bem casual, é possível ouvir <strong>我巴西人 (wǒ Bāxī rén)</strong> sem o 是 — o significado continua claro pelo contexto. Isso é bem informal e só funciona em frases curtas assim. Nos exercícios daqui, continue escrevendo a forma padrão com <strong>是</strong>, que é a que sempre soa correta.",
              "examples": ["eu (sou) brasileira (fala muito casual)"]
            }
          ],
          "ordem-nomes-sobrenome-primeiro": [
            {
              "title": "Em chinês, o sobrenome vem primeiro",
              "body": "Repare em \"小李\" (Xiǎo Lǐ) no diálogo: <strong>Lǐ</strong> é o sobrenome, e vem ANTES do nome próprio — o oposto da ordem em português. 小 (xiǎo, \"pequeno\") é um prefixo carinhoso e informal, comum entre colegas e amigos mais próximos, usado com o sobrenome de alguém mais jovem ou da mesma idade.",
              "examples": ["(apelido carinhoso) \"Li\" — sobrenome Lǐ + prefixo 小"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa pergunta serve pra saber a nacionalidade de alguém.",
            "whyNote": "Errado — <strong>你叫什么名字？</strong> pergunta o NOME (叫 = chamar-se, 名字 = nome), não a nacionalidade. Nacionalidade seria \"你是哪国人？\"."
          }
        ]
      },
      "3": {
        "title": "Números e idade",
        "goal": "Contar de 0 a 100 e dizer/perguntar a idade.",
        "lessons": {
          "numeros-1": "Contar até dois",
          "numeros-2": "Contar até cinco",
          "numeros-3": "Contar até oito",
          "numeros-idade": "Contar até dez e dizer a idade",
          "idade-altura": "Perguntar idade e altura",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "zero",
          "um",
          "dois",
          "três",
          "quatro",
          "cinco",
          "seis",
          "sete",
          "oito",
          "nove",
          "dez",
          "anos (idade)",
          "quantos anos",
          "alto"
        ],
        "phrases": [
          { "t": "Quantos anos você tem?" },
          { "t": "Eu tenho 28 anos." },
          { "t": "Quão alto ele é?" }
        ],
        "dialogue": {
          "title": "Perguntando a idade",
          "lines": ["Quantos anos você tem?", "Eu tenho 28 anos. E você?", "Eu tenho 30 anos."],
          "speakers": ["A", "B", "A"],
          "scene": "Dois colegas de curso conversam no intervalo da aula.",
          "check": [
            null,
            null,
            {
              "q": "Quem tem 30 anos?",
              "opts": ["Quem fez a primeira pergunta", "Quem respondeu primeiro", "Nenhum dos dois"]
            }
          ]
        },
        "concepts": {
          "number-structure": [
            {
              "title": "Estrutura dos números em chinês",
              "body": "Os números de 0 a 10 têm palavras próprias. A partir daí, o chinês constrói números maiores combinando essas palavras de forma bem lógica: 十一 (shí yī) é literalmente \"dez-um\" (11), 二十 (èr shí) é \"dois-dez\" (20). É mais regular que o português nesse sentido.",
              "examples": ["11 = dez + um", "25 = dois + dez + cinco"]
            },
            {
              "title": "岁 (suì) — contando idade",
              "body": "Pra dizer a idade, o número vem seguido de 岁 (suì), que funciona como a unidade \"anos\" — mas sem usar o verbo \"ter\" como em português. A estrutura é: Sujeito + Número + 岁.",
              "examples": ["eu tenho 28 anos"]
            }
          ],
          "ji-vs-duo": [
            {
              "title": "几 vs. 多 — duas formas de perguntar \"quanto\"",
              "body": "几 (jǐ) é usado pra perguntar sobre números pequenos e esperados, geralmente até 10. 多 (duō) antes de um adjetivo pergunta sobre grau ou quantidade maior, sem esperar um número pequeno específico.",
              "examples": ["quão alto ele é?"]
            },
            {
              "title": "\"Nǐ jǐ suì\" ou \"nǐ duō dà\"?",
              "body": "<strong>Jǐ suì</strong> (几岁) é usado pra perguntar a idade de <strong>crianças</strong>, já que 几 espera um número pequeno. Pra adultos, a forma neutra e mais comum é <strong>duō dà</strong> (多大) — perguntar \"jǐ suì\" pra um adulto pode soar estranho.",
              "examples": ["quantos anos (criança)?", "quantos anos (adulto)?"]
            }
          ],
          "xusui-ano-novo": [
            {
              "title": "Na China tradicional, a idade muda no Ano Novo — não no aniversário",
              "body": "No sistema tradicional chinês (<strong>虚岁, xūsuì</strong>, \"idade nominal\"), um bebê já nasce com 1 ano, e todo mundo ganha mais um ano junto no Ano Novo Chinês — não no próprio aniversário. Hoje o sistema ocidental (idade real, 周岁) é o mais usado no dia a dia, mas o 虚岁 ainda aparece em contextos tradicionais.",
              "examples": ["idade nominal (sistema tradicional)"]
            }
          ],
          "si-numero-azarado": [
            {
              "title": "Por que o número 4 é evitado na China",
              "body": "四 (sì, \"quatro\") soa muito parecido com 死 (sǐ, \"morte\") — por causa dessa semelhança de som, muita gente evita o número 4 em situações do dia a dia: é comum prédios pularem o 4º andar (ou o número do apartamento), e números de telefone ou placas de carro com 4 podem ser considerados menos desejáveis. É o mesmo tipo de superstição que o número 13 tem em vários países ocidentais.",
              "examples": ["quatro", "morte / morrer"]
            }
          ]
        }
      },
      "4": {
        "title": "Família",
        "goal": "Apresentar membros da família e falar quantas pessoas há na família.",
        "lessons": {
          "pais": "Apresentar a família: pai e mãe",
          "irmaos": "Falar dos irmãos",
          "ter-familia": "Dizer quem você tem na família",
          "quantas-pessoas": "Perguntar quantas pessoas há na família",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "família / casa",
          "pai",
          "mãe",
          "irmão mais velho",
          "irmão mais novo",
          "irmã mais velha",
          "irmã mais nova",
          "filho(a)/criança",
          "ter/haver",
          "quantos",
          "uma irmã mais velha (个 em contexto)",
          "quantas pessoas (口 em contexto)"
        ],
        "phrases": [
          { "t": "Quantas pessoas há na sua família?" },
          { "t": "Eu tenho uma irmã mais velha." }
        ],
        "dialogue": {
          "title": "Falando da família",
          "lines": [
            "Quantas pessoas há na sua família?",
            "Minha família tem 4 pessoas: pai, mãe, irmão mais velho e eu.",
            "Você tem irmã mais nova?",
            "Não, eu não tenho irmã mais nova."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Duas amigas olham fotos de família.",
          "check": [
            null,
            null,
            {
              "q": "Quantas pessoas tem a família de quem responde?",
              "opts": ["3", "4", "5"]
            }
          ]
        },
        "concepts": {
          "classifiers": [
            {
              "title": "一个人, não só \"um rén\"",
              "body": "Em chinês, um número quase nunca fica colado direto num substantivo — entre os dois entra um <strong>classificador</strong> (uma espécie de \"medida\"). 个 (gè) é o classificador mais genérico, usado pra pessoas e muita coisa em geral.",
              "examples": ["uma pessoa", "uma irmã mais velha"]
            },
            {
              "title": "个 (gè) ou 口 (kǒu)?",
              "body": "Pra contar pessoas em geral, 个 já resolve. Mas pra contar quantas pessoas moram numa mesma casa, o chinês tem um classificador específico: <strong>kǒu</strong> (口, literalmente \"boca\") — só nesse contexto de família.",
              "examples": ["quantas pessoas? (contexto família)"]
            }
          ],
          "you": [
            {
              "title": "有 (yǒu) — \"ter\" / \"haver\"",
              "body": "有 (yǒu) é o verbo usado tanto pra dizer que alguém possui algo quanto pra dizer que algo existe. Estrutura simples: Sujeito + 有 + Objeto.",
              "examples": ["Eu tenho uma irmã mais velha."]
            }
          ],
          "he": [
            {
              "title": "和 (hé) — juntando substantivos",
              "body": "和 (hé) equivale a \"e\", mas só junta substantivos entre si — nunca frases inteiras. Pra ligar duas frases completas, o chinês normalmente nem usa palavra de ligação nenhuma.",
              "examples": ["pai e mãe"]
            }
          ],
          "meiyou": [
            {
              "title": "没(有) — negando \"ter\"",
              "body": "Pra negar 有 (ter), o chinês não usa 不 — usa 没 ou 没有, especialmente pra isso. É uma das poucas exceções à regra geral de negação com 不.",
              "examples": ["Eu não tenho irmã mais nova."]
            }
          ],
          "politica-filho-unico-historia": [
            {
              "title": "Por que muita gente da geração dos pais só tem um irmão (ou nenhum)",
              "body": "De 1979 até o fim de 2015, a China teve a <strong>política do filho único</strong> (一孩政策), que limitava a maioria das famílias urbanas a ter apenas um filho, como forma de conter o crescimento populacional. A política foi encerrada oficialmente em 2016, substituída primeiro pela permissão de dois filhos e depois de três — mas seu efeito ainda aparece hoje na estrutura de muitas famílias chinesas.",
              "examples": ["filho(a) / criança"]
            }
          ]
        }
      },
      "5": {
        "title": "Comida e bebida",
        "goal": "Pedir comida/bebida num restaurante e expressar preferências simples.",
        "lessons": {
          "comer-beber": "Comer e beber",
          "pedir-comida": "Pedir macarrão, água e chá",
          "gostoso": "Dizer que algo está gostoso",
          "pedir-o-que-quer": "Pedir o que você quer",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "comer",
          "beber",
          "arroz",
          "macarrão",
          "água",
          "chá",
          "café",
          "gostoso (comida)",
          "gostar",
          "querer",
          "uma xícara de chá (杯 em contexto)"
        ],
        "phrases": [
          { "t": "Eu quero uma xícara de chá." },
          { "t": "Isso está muito gostoso!" },
          { "t": "Eu gosto de beber café." }
        ],
        "dialogue": {
          "title": "No restaurante",
          "lines": [
            "Olá, o que você quer comer?",
            "Eu quero arroz e chá.",
            "Certo. Você quer beber café?",
            "Não, obrigada. Eu gosto de beber chá."
          ],
          "speakers": ["Garçom", "Brune", "Garçom", "Brune"],
          "scene": "Brune pede o almoço num restaurante.",
          "check": [
            null,
            null,
            {
              "q": "O que Brune pede para beber?",
              "opts": ["Chá", "Café", "Água"]
            }
          ]
        },
        "concepts": {
          "hen-adjective": [
            {
              "title": "很 (hěn) antes de adjetivo",
              "body": "Em chinês, frases simples com adjetivo quase sempre levam 很 (hěn) antes dele — mesmo quando não se quer dizer \"muito\". Sem 很, a frase soa como uma comparação implícita ou fica gramaticalmente estranha.",
              "examples": ["isso está gostoso"]
            }
          ],
          "yao-xihuan": [
            {
              "title": "要 (yào) — \"querer\"",
              "body": "要 (yào) expressa vontade ou necessidade, tanto antes de um substantivo (\"eu quero chá\") quanto antes de um verbo (\"eu quero ir\"). É uma das palavras mais usadas do chinês cotidiano, especialmente pra pedidos.",
              "examples": ["eu quero uma xícara de chá"]
            },
            {
              "title": "\"Xǐhuan\" ou \"yào\"?",
              "body": "<strong>Xǐhuan</strong> (喜欢) é gostar de algo em geral, uma preferência — vem seguido diretamente do que se gosta (substantivo ou outro verbo), sem precisar de uma preposição como o \"de\" do português. <strong>Yào</strong> (要) é querer algo específico, agora. Um fala de gosto, o outro de pedido.",
              "examples": ["eu gosto de beber café (hábito)", "eu quero uma xícara de chá (agora)"]
            }
          ],
          "cha-origem-china": [
            {
              "title": "A China é o berço do chá",
              "body": "O chá tem origem na China — é consumido no país há milhares de anos, e a própria palavra \"chá\"/\"tea\" em várias línguas do mundo vem de palavras chinesas (chá 茶, dependendo da rota comercial). O costume de servir chá pra convidados é parte importante da hospitalidade chinesa até hoje.",
              "examples": ["chá"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa frase é usada pra pedir algo num restaurante ou café.",
            "whyNote": "Correto — <strong>我要...(wǒ yào)</strong> significa \"eu quero\", usado pra pedir algo num restaurante ou café; aqui, \"uma xícara de chá\"."
          }
        ]
      },
      "6": {
        "title": "Rotina diária",
        "goal": "Descrever atividades do dia a dia e dizer as horas.",
        "lessons": {
          "horas": "Dizer que horas são",
          "rotina": "Contar sua rotina",
          "presente": "O que está acontecendo agora",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "hora(s)",
          "levantar (da cama)",
          "ir trabalhar",
          "sair do trabalho",
          "dormir",
          "todos os dias",
          "agora",
          "hoje",
          "não ter / não há"
        ],
        "phrases": [
          { "t": "Eu levanto às sete horas todos os dias." },
          { "t": "Que horas são agora?" },
          { "t": "Eu estou comendo agora." }
        ],
        "dialogue": {
          "title": "Perguntando sobre a rotina",
          "lines": [
            "Que horas você levanta todos os dias?",
            "Eu levanto às 7h e vou trabalhar às 8h todos os dias.",
            "Que horas você sai do trabalho hoje?",
            "Hoje eu saio às 5h."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois colegas de trabalho conversam no corredor do escritório.",
          "check": [
            null,
            null,
            {
              "q": "A que horas quem responde começa a trabalhar?",
              "opts": ["7h", "8h", "5h"]
            }
          ]
        },
        "concepts": {
          "dian-hours": [
            {
              "title": "Estrutura das horas com 点",
              "body": "Pra dizer as horas em chinês, o número vem seguido de 点 (diǎn), que funciona como \"hora(s)\". É uma estrutura simples e direta: Número + 点.",
              "examples": ["7 horas", "que horas são agora?"]
            }
          ],
          "fuso-horario-unico": [
            {
              "title": "A China inteira usa o mesmo horário",
              "body": "Apesar de o território da China cobrir uma faixa larga o bastante pra caber 5 fusos horários geográficos, o país inteiro usa um único horário oficial: o <strong>horário de Pequim</strong> (北京时间). Isso significa que, no extremo oeste do país, o sol pode nascer bem mais tarde no relógio do que no leste — mas todo mundo diz as horas do mesmo jeito.",
              "examples": ["horário de Pequim (horário oficial do país todo)"]
            }
          ],
          "time-before-verb": [
            {
              "title": "Palavras de tempo antes do verbo",
              "body": "Diferente do português, onde \"todos os dias\" pode vir no fim da frase, em chinês as expressões de tempo vêm sempre antes do verbo, geralmente logo depois do sujeito.",
              "examples": ["eu levanto às 7h todos os dias"]
            }
          ],
          "zai-progressive": [
            {
              "title": "(正)在 + verbo — ação em progresso",
              "body": "Pra dizer que uma ação está acontecendo agora, o chinês usa 在 (zài) ou 正在 (zhèngzài) antes do verbo — funciona como o \"estar + gerúndio\" do português.",
              "examples": ["eu estou comendo agora"]
            },
            {
              "title": "\"Měitiān\" ou \"xiànzài\"?",
              "body": "<strong>Měitiān</strong> (每天, todos os dias) marca um hábito. <strong>Xiànzài</strong> (现在, agora) marca o momento presente, muitas vezes usado com esse <strong>zài</strong> de ação em progresso — diferente do \"zài\" de localização que você vai ver na próxima unidade.",
              "examples": ["eu levanto às 7h todos os dias (hábito)", "que horas são agora? (momento presente)"]
            }
          ]
        }
      },
      "7": {
        "title": "Direções e localização",
        "goal": "Perguntar e entender direções básicas, localizar lugares.",
        "lessons": {
          "onde-fica": "Perguntar onde fica algo",
          "direcoes": "Dar direções: direita, frente e atrás",
          "perto-longe": "Dizer se fica perto ou longe",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": ["estar (localização)", "onde", "esquerda", "direita", "na frente", "atrás", "distância de", "perto", "longe"],
        "phrases": [
          { "t": "Onde fica o banheiro?" },
          { "t": "O hospital fica perto daqui." }
        ],
        "dialogue": {
          "title": "Pedindo direções na rua",
          "lines": [
            "Com licença, onde fica o banheiro?",
            "Fica na frente, do lado esquerdo.",
            "Fica longe daqui?",
            "Não é longe, é bem perto."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Num shopping, alguém procura o banheiro e pergunta a uma senhora.",
          "check": [
            null,
            null,
            {
              "q": "Onde fica o banheiro?",
              "opts": ["Na frente, à esquerda", "Atrás, à direita", "Longe daqui"]
            }
          ]
        },
        "concepts": {
          "zai-location": [
            {
              "title": "在 (zài) — localização",
              "body": "在 (zài) indica onde algo ou alguém está — funciona como o verbo \"ficar\" ou \"estar\" quando se fala de localização. A estrutura é: Algo/Alguém + 在 + Lugar.",
              "examples": ["onde fica o banheiro?"]
            }
          ],
          "zai-vs-li": [
            {
              "title": "\"Zài\" ou \"lí\"?",
              "body": "<strong>Zài</strong> (在) diz <strong>onde algo está</strong>. <strong>Lí</strong> (离) diz a <strong>distância entre dois lugares</strong>, sempre comparando um ponto de referência. Zài localiza um lugar sozinho; lí sempre compara dois.",
              "examples": ["onde fica o banheiro? (localização)", "o hospital fica perto daqui (distância)"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa pergunta é sobre o preço de um produto.",
            "whyNote": "Errado — <strong>厕所在哪里？</strong> pergunta ONDE fica o banheiro (在哪里 = onde fica), não o preço. Preço seria \"多少钱？\"."
          }
        ]
      },
      "8": {
        "title": "Compras",
        "goal": "Perguntar preços, negociar valores e fazer uma compra simples.",
        "lessons": {
          "comprar-vender": "Comprar, vender e perguntar o preço",
          "dinheiro": "Falar de dinheiro: kuài e máo",
          "caro-desconto": "Dizer que está caro e pedir desconto",
          "roupas-sapatos": "Comprar roupas e sapatos",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "comprar",
          "vender",
          "quanto custa",
          "unidade monetária (coloquial)",
          "centavo (1/10 do kuài)",
          "barato",
          "caro",
          "este/esta",
          "aquele/aquela",
          "roupa",
          "sapato"
        ],
        "phrases": [
          { "t": "Quanto custa isso?" },
          { "t": "Está muito caro! Faz mais barato." },
          { "t": "Eu quero comprar essa roupa." },
          { "t": "5 yuans e 30 centavos." }
        ],
        "dialogue": {
          "title": "No mercado",
          "lines": ["Quanto custa isso?", "30 yuans.", "Está muito caro! Faz mais barato.", "Tá bom, 25 yuans."],
          "speakers": ["Brune", "Vendedor", "Brune", "Vendedor"],
          "scene": "Brune pechincha numa banca de feira.",
          "check": [
            null,
            null,
            {
              "q": "Quanto Brune paga no final?",
              "opts": ["30 yuans", "25 yuans", "20 yuans"]
            }
          ]
        },
        "concepts": {
          "kuai-mao": [
            {
              "title": "\"Kuài\" ou \"máo\"?",
              "body": "No dinheiro chinês falado, <strong>kuài</strong> (块) é a unidade principal (equivalente a \"um real\"), e <strong>máo</strong> (毛) é um décimo de um kuài (equivalente a \"dez centavos\"). A estrutura simplesmente junta os dois números em sequência.",
              "examples": ["5 yuans e 30 centavos"]
            }
          ],
          "kuai-mao-yuan-jiao": [
            {
              "title": "\"Kuài\"/\"máo\" são o que se FALA — \"yuán\"/\"jiǎo\" é o que se ESCREVE",
              "body": "<strong>Kuài</strong> e <strong>máo</strong> são as formas que você vai OUVIR o tempo todo, no dia a dia. Mas em preços impressos, recibos e notícias, é comum ver as formas formais/escritas: <strong>yuán</strong> (元, equivalente a kuài) e <strong>jiǎo</strong> (角, equivalente a máo). Ninguém fala \"yuán\" numa conversa casual, mas vale reconhecer por escrito.",
              "examples": ["unidade monetária (forma escrita/formal de 块)", "um décimo de yuán (forma escrita/formal de 毛)"]
            }
          ],
          "ba-particle": [
            {
              "title": "吧 (ba) — suavizando um pedido ou sugestão",
              "body": "吧 (ba) no final de uma frase transforma uma ordem direta em algo mais suave, como uma sugestão ou pedido educado — parecido com adicionar \"né\" ou \"tá\" no final de uma frase em português.",
              "examples": ["faz mais barato, vai"]
            }
          ],
          "classifiers-more": [
            {
              "title": "Mais classificadores",
              "body": "Você já viu que todo número precisa de um classificador antes do substantivo (个/口, lá na Unidade 4). Assim como 口 é específico pra contar pessoas da família, outras categorias de coisas têm seu próprio classificador — como 件 pra roupas.",
              "examples": ["uma peça de roupa"]
            }
          ],
          "pechinchar-mercado": [
            {
              "title": "Pechinchar é normal — mas só em certos lugares",
              "body": "Repare como o preço caiu de 30 para 25 kuài no diálogo: em mercados de rua, feiras e pequenas lojas de bairro, pechinchar o preço é normal e até esperado. Mas em shoppings, supermercados e lojas de marca, o preço é fixo e pechinchar soa fora de lugar — o segredo é reconhecer o tipo de estabelecimento antes de tentar.",
              "examples": ["faz mais barato (frase típica de quem está pechinchando)"]
            }
          ]
        }
      },
      "9": {
        "title": "Clima",
        "goal": "Descrever o tempo/clima e reagir a ele.",
        "lessons": {
          "quente-frio": "Descrever se está quente ou frio",
          "clima-geral": "Falar sobre chuva, sol e vento",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": ["clima/tempo", "quente", "frio", "chover", "dia ensolarado", "dia nublado", "vento"],
        "phrases": [
          { "t": "Como está o tempo hoje?" },
          { "t": "Hoje está muito quente." },
          { "t": "Amanhã vai chover." },
          { "t": "Hoje não está muito frio." }
        ],
        "dialogue": {
          "title": "Comentando o clima",
          "lines": [
            "Como está o tempo hoje?",
            "Hoje está bem quente, ensolarado.",
            "E amanhã?",
            "Amanhã vai chover, vai estar meio frio."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois amigos olham a previsão do tempo.",
          "check": [
            null,
            null,
            {
              "q": "Como será o tempo amanhã?",
              "opts": ["Chuva e um pouco de frio", "Sol e calor", "Vento forte"]
            }
          ]
        },
        "concepts": {
          "adjective-predicate": [
            {
              "title": "Por que \"jīntiān hěn rè\" e não \"jīntiān shì rè\"?",
              "body": "Adjetivos em chinês (rè, lěng, guì, piányi...) funcionam como o próprio verbo da frase — eles não precisam do verbo <strong>shì</strong> (ser/estar) na frente. O <strong>hěn</strong> aqui quase não significa \"muito\" — é só uma palavra de ligação obrigatória antes do adjetivo.",
              "examples": ["hoje está muito quente"]
            }
          ],
          "buta-not-very": [
            {
              "title": "不太 (bú tài) — \"não muito\"",
              "body": "不太 (bú tài) suaviza uma negação, funcionando como \"não muito\" em português — em vez de negar totalmente algo, diz que não é bem assim, mas sem ser absoluto.",
              "examples": ["hoje não está muito frio"]
            }
          ],
          "hui-future-prediction": [
            {
              "title": "会 (huì) — previsão sobre o futuro",
              "body": "Além de significar \"saber fazer\" (uma habilidade aprendida, que você vai ver na Unidade 15), 会 (huì) também é usado pra fazer previsões sobre o que vai acontecer — parecido com \"vai\" no futuro do português.",
              "examples": ["amanhã vai chover"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa frase descreve como uma pessoa está se sentindo.",
            "whyNote": "Errado — <strong>今天很热</strong> descreve o CLIMA (hoje está quente), não como uma pessoa se sente. \"Estou com calor\" seria \"我很热\"."
          }
        ]
      },
      "10": {
        "title": "Transporte",
        "goal": "Perguntar como chegar a um lugar usando transporte público ou táxi.",
        "lessons": {
          "meios-transporte": "Nomear os meios de transporte",
          "como-chegar": "Perguntar como chegar a um lugar",
          "passagem": "Comprar uma passagem",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "ônibus",
          "metrô",
          "táxi",
          "ir a pé",
          "como ir",
          "estação/parada",
          "passagem/bilhete",
          "uma passagem (张 em contexto)"
        ],
        "phrases": [
          { "t": "Como se vai para o aeroporto?" },
          { "t": "Eu vou de metrô." },
          { "t": "Eu quero comprar uma passagem." },
          { "t": "Como você veio?" }
        ],
        "dialogue": {
          "title": "Perguntando como chegar",
          "lines": [
            "Como se vai para o aeroporto?",
            "Você pode ir de metrô ou de táxi.",
            "Onde fica a estação de metrô?",
            "Fica na frente, bem perto."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Na recepção de um hotel, um hóspede pergunta como chegar ao aeroporto.",
          "check": [
            null,
            null,
            {
              "q": "Que transportes a recepcionista sugere?",
              "opts": ["Metrô ou táxi", "Ônibus ou a pé", "Só avião"]
            }
          ]
        },
        "concepts": {
          "zenme": [
            {
              "title": "怎么 (zěnme) — perguntando \"como\"",
              "body": "怎么 (zěnme) pergunta sobre o modo como algo é feito, geralmente vindo antes do verbo — equivale a \"como\" em português quando se pergunta sobre método ou jeito de fazer algo.",
              "examples": ["como se vai para o aeroporto?"]
            }
          ],
          "qu-lai": [
            {
              "title": "去 (qù) e 来 (lái) — \"ir\" e \"vir\"",
              "body": "去 (qù) significa \"ir\" e é seguido diretamente pelo lugar de destino, sem preposição. 来 (lái) significa \"vir\" — juntos, são os dois verbos direcionais básicos do chinês, indicando movimento em direção ou para longe de quem fala.",
              "examples": ["eu vou ao aeroporto"]
            }
          ],
          "zoulu-vs-zuo": [
            {
              "title": "\"Zǒu lù\" ou \"zuò dìtiě\"?",
              "body": "Pra ir a pé, usa-se só <strong>zǒu lù</strong> (走路, andar), sem nenhum outro verbo. Pra qualquer veículo em que você entra e senta, usa-se <strong>zuò</strong> (坐, literalmente \"sentar\") antes do meio de transporte — o mesmo \"zuò\" de sentar numa cadeira, pense nele como \"ir sentado em\".",
              "examples": ["eu vou de metrô"]
            }
          ],
          "zuo-chuzuche-dache": [
            {
              "title": "\"Zuò chūzūchē\" no dia a dia vira \"dǎchē\"",
              "body": "Em vez da estrutura completa <strong>zuò chūzūchē</strong> (ir de táxi), o verbo cotidiano pra \"pegar um táxi\" (ou um app de carro) é <strong>dǎchē</strong> (打车, literalmente \"bater carro\") — usado o tempo todo em vez da frase mais longa.",
              "examples": ["pegar um táxi/carro (fala cotidiana)"]
            }
          ]
        }
      },
      "11": {
        "title": "Saúde e corpo",
        "goal": "Descrever sintomas simples e partes do corpo, pedir ajuda médica básica.",
        "lessons": {
          "partes-corpo": "Nomear partes do corpo",
          "dor": "Dizer que algo dói",
          "ajuda-medica": "Pedir ajuda médica",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": ["corpo", "cabeça", "barriga", "doer", "ficar doente", "médico(a)", "hospital", "não estar bem/mal-estar"],
        "phrases": [
          { "t": "Minha cabeça está doendo." },
          { "t": "Eu não estou bem." },
          { "t": "Eu preciso ver um médico." }
        ],
        "dialogue": {
          "title": "Não estou me sentindo bem",
          "lines": [
            "O que houve com você?",
            "Não estou bem, minha cabeça está doendo muito.",
            "Você precisa ver um médico?",
            "Sim, o hospital fica longe daqui?"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Um amigo percebe que o outro não está bem.",
          "check": [
            null,
            null,
            {
              "q": "O que está doendo em quem não se sente bem?",
              "opts": ["A cabeça", "A barriga", "A perna"]
            }
          ]
        },
        "concepts": {
          "teng": [
            {
              "title": "疼 (téng) — descrevendo dor",
              "body": "Pra dizer que alguma parte do corpo dói, a estrutura em chinês é bem direta: Parte do corpo + 疼 (téng) — sem precisar de um verbo equivalente a \"doer\" com sujeito separado como em português.",
              "examples": ["minha cabeça está doendo"]
            }
          ],
          "teng-vs-bushufu": [
            {
              "title": "\"Tóu téng\" ou \"bù shūfu\"?",
              "body": "<strong>Téng</strong> (疼) descreve uma dor específica, numa parte do corpo. <strong>Bù shūfu</strong> (不舒服) é mais geral — um mal-estar sem apontar onde dói. Se você sabe exatamente o que dói, use téng; se é só uma sensação geral de \"estou mal\", use bù shūfu.",
              "examples": ["minha cabeça dói (dor específica)", "eu não estou bem (mal-estar geral)"]
            }
          ],
          "le-change-of-state": [
            {
              "title": "了 (le) marcando mudança de estado",
              "body": "了 no final da frase (não logo após o verbo) indica que uma situação nova começou ou mudou — como \"o que houve com você?\", uma mudança percebida agora, que antes não era assim.",
              "examples": ["o que houve com você?"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa frase é usada quando alguém está com dor de cabeça.",
            "whyNote": "Correto — <strong>我头疼 (wǒ tóu téng)</strong> significa literalmente \"minha cabeça dói\", ou seja, dor de cabeça."
          }
        ]
      },
      "12": {
        "title": "Hobbies e tempo livre",
        "goal": "Falar sobre hobbies, gostos e o que faz no tempo livre.",
        "lessons": {
          "hobbies-leitura": "Falar de hobbies: ler e ouvir música",
          "atividades": "Assistir filme, se exercitar e cantar",
          "dancar-tempo-livre": "Convidar alguém pra dançar",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "hobby",
          "ler livro",
          "ouvir música",
          "assistir filme",
          "fazer exercício/esporte",
          "cantar",
          "dançar",
          "ter tempo livre"
        ],
        "phrases": [
          { "t": "Qual é o seu hobby?" },
          { "t": "Eu gosto de ler livros e ouvir música." },
          { "t": "Você tem tempo livre no fim de semana?" }
        ],
        "dialogue": {
          "title": "Combinando um programa",
          "lines": [
            "Qual é o seu hobby?",
            "Eu gosto de assistir filme e dançar. E você?",
            "Eu gosto de fazer exercício. Você tem tempo livre no fim de semana?",
            "Tenho! Vamos assistir um filme."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois colegas combinam um programa para o fim de semana.",
          "check": [
            null,
            null,
            {
              "q": "O que quem responde primeiro gosta de fazer?",
              "opts": ["Assistir filme e dançar", "Fazer exercício", "Cantar e ler"]
            }
          ]
        },
        "concepts": {
          "de-posse": [
            {
              "title": "的 (de) — mostrando posse",
              "body": "的 (de) é usado pra indicar posse, como \"meu\", \"seu\", \"do fulano\" — parecido com o \"'s\" do inglês, mas mais simples: sempre fica entre o dono e a coisa possuída. A estrutura é: Dono + 的 + Coisa.",
              "examples": ["qual é o seu hobby?"]
            }
          ],
          "kan-vs-ting": [
            {
              "title": "\"Kàn\" ou \"tīng\"?",
              "body": "<strong>Kàn</strong> (看) é usado pra atividades visuais: ler, assistir filme. <strong>Tīng</strong> (听) é usado pra atividades de ouvir. Trocar os dois é um erro comum — \"ouvir um filme\" ou \"ver música\" soam estranhos em chinês, igual soariam em português.",
              "examples": ["ler livro (atividade visual)", "ouvir música (atividade auditiva)"]
            }
          ],
          "guangchangwu-danca-praca": [
            {
              "title": "A dança de praça: um hobby muito chinês",
              "body": "Em praças e parques por toda a China, é comum ver grupos — geralmente de senhoras de meia-idade e idosas — se reunindo todo fim de tarde pra dançar em conjunto ao som de música, numa tradição conhecida como <strong>guǎngchǎng wǔ</strong> (广场舞, \"dança de praça\"). É ao mesmo tempo exercício físico e um momento social importante para essa geração.",
              "examples": ["dança de praça"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa é uma forma de convidar alguém pra fazer algo.",
            "whyNote": "Correto — <strong>你有空吗？</strong> pergunta se a pessoa está livre/disponível, um jeito comum de convidar alguém pra fazer algo no fim de semana."
          }
        ]
      },
      "13": {
        "title": "Planos futuros",
        "goal": "Expressar planos e intenções usando 要 e 打算.",
        "lessons": {
          "planos": "Dizer o que você planeja fazer",
          "viagem-estudo": "Falar de planos de viagem e estudo",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": ["planejar/pretender", "amanhã", "semana que vem", "viajar/turismo", "estudar", "plano", "depois/no futuro"],
        "phrases": [
          { "t": "Quais são seus planos para amanhã?" },
          { "t": "Eu pretendo estudar chinês." },
          { "t": "No futuro eu quero viajar para a China." }
        ],
        "dialogue": {
          "title": "Falando sobre o futuro",
          "lines": [
            "Quais são seus planos para semana que vem?",
            "Eu pretendo estudar chinês.",
            "Você quer ir à China no futuro?",
            "Quero! Eu quero viajar para a China."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois amigos falam dos planos para o futuro.",
          "check": [
            null,
            null,
            {
              "q": "O que quem responde pretende fazer na semana que vem?",
              "opts": ["Estudar chinês", "Viajar à China", "Trabalhar"]
            }
          ]
        },
        "concepts": {
          "dasuan": [
            {
              "title": "打算 (dǎsuàn) — planos futuros",
              "body": "打算 (dǎsuàn) significa \"planejar\" ou \"pretender\", e vem seguido diretamente de um verbo — é uma das formas mais comuns de falar sobre planos futuros em chinês.",
              "examples": ["eu pretendo estudar chinês"]
            }
          ],
          "yihou": [
            {
              "title": "以后 (yǐhòu) — \"depois de\"",
              "body": "以后 (yǐhòu) significa \"depois\" ou \"no futuro\", e vem depois da referência de tempo à qual se refere — a estrutura inteira (tempo + 以后) funciona como uma unidade que indica \"depois desse momento\".",
              "examples": ["no futuro eu quero viajar para a China"]
            },
            {
              "title": "\"Dǎsuàn\" ou \"yào\"?",
              "body": "<strong>Dǎsuàn</strong> (打算) é um plano mais pensado, com alguma organização. <strong>Yào</strong> (要, que você já viu lá na Unidade 5) pode expressar uma intenção mais imediata ou simples, \"vou fazer isso\". Dǎsuàn soa um pouco mais formal e deliberado que yào.",
              "examples": ["eu pretendo estudar chinês (plano)", "eu quero viajar pra China (intenção)"]
            }
          ]
        }
      },
      "14": {
        "title": "Comparações simples",
        "goal": "Fazer comparações básicas entre pessoas, objetos e situações.",
        "lessons": {
          "comparar": "Comparar duas coisas",
          "diferente-melhor": "Dizer o que é diferente ou o melhor",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "comparado a / mais que",
          "ainda mais",
          "igual",
          "diferente",
          "o mais (superlativo)",
          "ou (em perguntas de escolha)"
        ],
        "phrases": [
          { "t": "Chinês é mais difícil que francês." },
          { "t": "Este e aquele são iguais." },
          { "t": "Qual você acha que é o melhor?" }
        ],
        "dialogue": {
          "title": "Comparando idiomas",
          "lines": [
            "Você acha o chinês difícil?",
            "Chinês é ainda mais difícil que francês, mas é bem interessante.",
            "Qual você acha o mais difícil? Chinês ou italiano?",
            "Chinês, claro!"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois colegas de turma conversam sobre estudar idiomas.",
          "check": [
            null,
            null,
            {
              "q": "Qual idioma quem responde acha mais difícil?",
              "opts": ["Chinês", "Francês", "Italiano"]
            }
          ]
        },
        "concepts": {
          "bi-comparison": [
            {
              "title": "比 (bǐ) — fazendo comparações",
              "body": "比 (bǐ) é usado pra comparar duas coisas, funcionando como \"mais... que\" em português. A estrutura é: A + 比 + B + Adjetivo — bem mais direta que a construção em português.",
              "examples": ["chinês é mais difícil que francês"]
            },
            {
              "title": "\"Bǐ\" ou \"yíyàng\"?",
              "body": "<strong>Bǐ</strong> compara uma <strong>diferença</strong> entre duas coisas. <strong>Yíyàng</strong> (一样) diz que duas coisas são <strong>iguais</strong>. Repare que \"bù yíyàng\" (não são iguais) não usa bǐ — são duas estruturas separadas, não se misturam.",
              "examples": ["este e aquele são iguais"]
            }
          ],
          "haishi": [
            {
              "title": "还是 (háishi) — \"ou\" em perguntas de escolha",
              "body": "还是 (háishi) é usado pra oferecer duas opções numa pergunta, equivalendo a \"ou\" quando se espera que a pessoa escolha entre uma coisa e outra — diferente de 或者, que é usado fora de perguntas.",
              "examples": ["você quer chá ou café?"]
            }
          ]
        }
      },
      "15": {
        "title": "Convites e capacidades",
        "goal": "Convidar alguém para algo, dizer o que sabe ou consegue fazer, fazer pedidos educados.",
        "lessons": {
          "saber-conseguir": "Dizer o que você sabe ou consegue fazer",
          "pedidos": "Fazer pedidos educados",
          "convite-cinema": "Convidar alguém para o cinema",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "querer / pensar em fazer algo",
          "saber fazer (habilidade aprendida)",
          "conseguir, poder (capacidade/permissão)",
          "por favor / convidar",
          "sentar",
          "todos, ambos",
          "também",
          "falar",
          "vir",
          "cinema"
        ],
        "phrases": [
          { "t": "Eu quero ir ver um filme." },
          { "t": "Você sabe falar chinês?" },
          { "t": "Você consegue vir amanhã?" },
          { "t": "Por favor, sente-se." },
          { "t": "Nós todos queremos ir." },
          { "t": "Eu também quero ir." }
        ],
        "dialogue": {
          "title": "Convite para o cinema",
          "lines": [
            "Eu quero ir ver um filme, você consegue vir?",
            "Consigo! Que horas?",
            "Às 7 da noite, no cinema.",
            "Combinado, eu também quero ver esse filme!"
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Um amigo convida o outro para ir ao cinema.",
          "check": [
            null,
            null,
            {
              "q": "A que horas é o filme?",
              "opts": ["19h", "17h", "21h"]
            }
          ]
        },
        "concepts": {
          "hui-vs-neng": [
            {
              "title": "\"Huì\" ou \"néng\"?",
              "body": "<strong>Huì</strong> (会) é uma habilidade aprendida — algo que se sabe fazer porque aprendeu. <strong>Néng</strong> (能) é capacidade ou permissão numa situação específica — depende da sua agenda ou circunstância, não de habilidade.",
              "examples": ["você sabe falar chinês? (habilidade)", "você consegue vir amanhã? (situação)"]
            }
          ],
          "xiang-vs-yao": [
            {
              "title": "\"Xiǎng\" ou \"yào\"?",
              "body": "想 (xiǎng) expressa vontade de fazer algo de forma mais suave — mais parecido com \"gostaria de\" ou \"estou pensando em\". 要 (que você já viu na Unidade 5) soa mais direto, como \"quero\", especialmente pra pedidos.",
              "examples": ["eu quero ir ver um filme (mais suave)", "eu quero uma xícara de chá (pedido direto)"]
            }
          ],
          "qing-please": [
            {
              "title": "请 (qǐng) — pedidos educados",
              "body": "请 (qǐng) equivale a \"por favor\" quando vem antes de um pedido ou convite — é uma forma simples e educada de suavizar uma instrução direta.",
              "examples": ["por favor, sente-se"]
            }
          ],
          "dou-all": [
            {
              "title": "都 (dōu) — \"todos\"",
              "body": "都 (dōu) significa \"todos\" ou \"ambos\", mas sempre vem antes do verbo, nunca depois do substantivo como em português.",
              "examples": ["nós todos queremos ir"]
            }
          ],
          "ye-also": [
            {
              "title": "也 (yě) — \"também\"",
              "body": "也 (yě) equivale a \"também\", e assim como 都, sempre vem antes do verbo, nunca no final da frase como costuma ficar em português.",
              "examples": ["eu também quero ir"]
            }
          ]
        }
      },
      "16": {
        "title": "Calendário e datas",
        "goal": "Falar sobre dias da semana, datas completas e horários, e marcar um encontro.",
        "lessons": {
          "dias-semana": "Dizer os dias da semana",
          "data-completa": "Dizer uma data completa",
          "hora-encontro": "Dizer a hora exata e marcar um encontro",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "semana",
          "segunda-feira",
          "domingo",
          "dia do mês (uso falado)",
          "mês",
          "ano",
          "minuto",
          "depois de",
          "antes de",
          "cem"
        ],
        "phrases": [
          { "t": "Que dia da semana é hoje?" },
          { "t": "Hoje é quarta-feira." },
          { "t": "Hoje é dia 20 de agosto." },
          { "t": "Agora são 11h18." },
          { "t": "Antes das 10h eu estou em casa." },
          { "t": "Depois das 10h eu não estou em casa." }
        ],
        "dialogue": {
          "title": "Marcando um encontro",
          "lines": [
            "Que dia da semana é hoje?",
            "Hoje é sexta-feira, 15 de agosto.",
            "Então a gente se vê no domingo, tá bom?",
            "Combinado! Depois das 15h eu tenho tempo livre."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois amigos marcam de se ver no fim de semana.",
          "check": [
            null,
            null,
            {
              "q": "Em que dia eles vão se encontrar?",
              "opts": ["Domingo", "Sexta-feira", "Sábado"]
            }
          ]
        },
        "concepts": {
          "weekdays": [
            {
              "title": "Estrutura dos dias da semana",
              "body": "Os dias da semana em chinês seguem um padrão bem lógico: 星期 (xīngqī, \"semana\") seguido de um número de 1 a 6 para segunda a sábado. Domingo é a exceção, usando 星期天 ou 星期日 em vez de um número.",
              "examples": ["segunda-feira", "domingo (exceção)"]
            }
          ],
          "dates": [
            {
              "title": "Estrutura de datas completas",
              "body": "Uma data completa em chinês segue a ordem do maior para o menor: Ano + 年 + Mês + 月 + Dia + 号 — o oposto da ordem mais comum em português (dia/mês/ano).",
              "examples": ["20 de agosto"]
            }
          ],
          "hao-vs-ri": [
            {
              "title": "\"Hào\" é o que se FALA — \"rì\" é o que se ESCREVE",
              "body": "<strong>Hào</strong> (号) é a forma que você vai ouvir no dia a dia pra dizer o dia do mês. Em textos formais, documentos e datas escritas, é comum ver <strong>rì</strong> (日) no lugar — mesmo caractere que aparece em 星期日 (domingo) e em 今天/明天.",
              "examples": ["20 de agosto (forma escrita/formal)"]
            }
          ],
          "hours-minutes": [
            {
              "title": "Horas com minutos",
              "body": "Pra dizer um horário com minutos, basta juntar Número + 点 (hora) + Número + 分 (minuto) em sequência — bem direto, sem preposições como \"e\" entre eles.",
              "examples": ["11h18"]
            }
          ],
          "yiqian-vs-yihou": [
            {
              "title": "\"Yǐqián\" ou \"yǐhòu\"?",
              "body": "<strong>Yǐqián</strong> (以前) é \"antes de\". <strong>Yǐhòu</strong> (以后) é \"depois de\". Os dois vêm sempre <strong>depois</strong> da referência de tempo ou evento — nunca antes dela, diferente do português.",
              "examples": ["antes das 10h eu estou em casa", "depois das 10h eu não estou em casa"]
            }
          ]
        }
      },
      "17": {
        "title": "O que já aconteceu",
        "goal": "Falar sobre ações já concluídas, mudanças de estado, e o que ainda não aconteceu.",
        "lessons": {
          "ja-comeu": "Dizer o que você já comeu",
          "ainda-nao": "Dizer o que ainda não aconteceu",
          "nao-aconteceu": "Falar do que não aconteceu ontem",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "partícula de conclusão/mudança",
          "comer (uma refeição)",
          "maçã",
          "ainda não",
          "ontem",
          "terminar, acabar",
          "trabalho / trabalhar",
          "bar"
        ],
        "phrases": [
          { "t": "Eu comi duas maçãs." },
          { "t": "Eu não quero mais comer." },
          { "t": "Ontem eu não fui trabalhar." },
          { "t": "Você já comeu?" },
          { "t": "Eu ainda não comi." },
          { "t": "Hoje à noite eu não vou beber." }
        ],
        "dialogue": {
          "title": "Já comeu?",
          "lines": [
            "Você já comeu?",
            "Ainda não, ainda estou trabalhando.",
            "Eu já comi, comi duas maçãs.",
            "Ontem eu não jantei, hoje estou com muita fome."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Dois colegas conversam na hora do jantar.",
          "check": [
            null,
            null,
            {
              "q": "O que a pessoa que comeu disse que comeu?",
              "opts": ["Duas maçãs", "Arroz", "Nada"]
            }
          ]
        },
        "concepts": {
          "le-completion": [
            {
              "title": "了 (le) — marcando conclusão",
              "body": "了 (le) depois de um verbo indica que a ação foi concluída — funciona parecido com o passado simples em português (\"comi\"). A estrutura é: Verbo + 了 + Objeto.",
              "examples": ["eu comi duas maçãs"]
            }
          ],
          "buxiang-le": [
            {
              "title": "不想...了 — \"não querer mais\"",
              "body": "Quando 不 (ou 没) se combina com 了 no final da frase, o sentido vira \"não mais\" — indicando que algo que estava acontecendo ou era verdade parou de ser.",
              "examples": ["eu não quero mais comer"]
            }
          ],
          "le-question": [
            {
              "title": "了...吗 — perguntando se algo já aconteceu",
              "body": "Pra perguntar se uma ação já foi concluída, junta-se 了 (marcando conclusão) com 吗 (marcando pergunta) no final da frase — a combinação pergunta \"isso já aconteceu?\".",
              "examples": ["você já comeu?"]
            }
          ],
          "chifanle-greeting": [
            {
              "title": "\"你吃饭了吗？\" às vezes não é uma pergunta de verdade",
              "body": "Além de perguntar literalmente se alguém já comeu, <strong>你吃了吗？</strong> (versão curta, sem 饭) é tradicionalmente usado como um cumprimento — parecido com \"tudo bem?\" em português, sem esperar uma resposta detalhada sobre comida. É um uso mais cultural/tradicional do que universal hoje em dia, mas vale reconhecer quando ouvir.",
              "examples": ["tudo bem? (cumprimento tradicional, não pergunta literal)"]
            }
          ],
          "haimei": [
            {
              "title": "Por que \"wǒ hái méi chī\" nunca leva \"le\"?",
              "body": "了 marca uma ação concluída. Mas na negação com <strong>hái méi</strong> (还没, ainda não), o le <strong>desaparece</strong> — nunca \"wǒ hái méi chī le\". Faz sentido: se a ação ainda não aconteceu, não tem como marcar ela como concluída.",
              "examples": ["eu ainda não comi"]
            }
          ],
          "meiyou-past": [
            {
              "title": "没有 + verbo — negando o passado",
              "body": "Pra dizer que algo não aconteceu no passado, o chinês usa 没有 (ou só 没) antes do verbo — nunca 不, que é reservado pra negar o presente ou o futuro.",
              "examples": ["ontem eu não fui trabalhar"]
            }
          ],
          "bu-vs-mei": [
            {
              "title": "不 vs. 没 — duas negações, dois tempos",
              "body": "不 (bù) nega o presente e o futuro — o que não é ou não vai ser. 没 (méi) nega o passado — o que não aconteceu. Uma exceção importante: o verbo 是 nunca é negado com 没, sempre com 不, mesmo falando do passado.",
              "examples": ["hoje à noite eu não vou beber (presente/futuro)", "ontem eu não fui trabalhar (passado)"]
            }
          ],
          "le-bridge": [
            {
              "title": "O mesmo 了 de novo, com outro papel",
              "body": "Lembra do \"你怎么了？\" (o que houve com você?) lá na Unidade 11? Ali, 了 marcava uma <strong>mudança de estado</strong>. Aqui, 了 depois do verbo marca uma <strong>ação concluída</strong>. É a mesma partícula, dois papéis diferentes — o contexto (fim da frase vs. logo após o verbo) diz qual é qual.",
              "examples": ["o que houve com você? (mudança de estado)", "eu comi duas maçãs (ação concluída)"]
            }
          ],
          "shide-deferred": [
            {
              "title": "是...的 — dando ênfase a como algo aconteceu",
              "body": "Lembra de \"Nǐ shì zěnme lái de?\" (como você veio?) lá na Unidade 10? Agora que você já sabe que o chinês marca ações concluídas, essa construção faz mais sentido: 是...的 dá ênfase a um detalhe específico (modo, lugar ou tempo) de uma ação <strong>já concluída</strong> — é por isso que a pergunta usa essa estrutura, e não uma pergunta comum.",
              "examples": ["como você veio? (ênfase no modo)", "eu vim de metrô"]
            }
          ]
        }
      },
      "18": {
        "title": "Perguntas do dia a dia",
        "goal": "Fazer perguntas abertas variadas: quem, por quê, onde alguém mora ou trabalha, se há algo num lugar.",
        "lessons": {
          "quem-porque": "Perguntar quem e por quê",
          "escola": "Falar de escola e estudantes",
          "apresentar-trabalho": "Apresentar alguém e dizer onde trabalha",
          "checkpoint": "Revisão da Unidade"
        },
        "vocab": [
          "quem",
          "por quê",
          "porque",
          "aqui",
          "escola",
          "estudante",
          "namorada",
          "namorado",
          "alguns, um pouco de",
          "trabalhar (em um lugar)"
        ],
        "phrases": [
          { "t": "Quem é você?" },
          { "t": "Por que você não vai?" },
          { "t": "Porque eu estou muito ocupado." },
          { "t": "Eu trabalho em Xangai." },
          { "t": "Aqui tem um pouco de café." },
          { "t": "Essa é minha namorada." }
        ],
        "dialogue": {
          "title": "Apresentando um amigo",
          "lines": [
            "Quem é essa?",
            "Essa é minha namorada, ela é estudante.",
            "Onde ela trabalha ou estuda?",
            "Ela estuda na escola, aqui tem alguns livros dela."
          ],
          "speakers": ["A", "B", "A", "B"],
          "scene": "Alguém pergunta ao amigo quem é a moça da foto.",
          "check": [
            null,
            null,
            {
              "q": "O que a namorada faz?",
              "opts": ["Estuda numa escola", "Trabalha num hospital", "É médica"]
            }
          ]
        },
        "concepts": {
          "shei": [
            {
              "title": "谁 (shéi) — perguntando \"quem\"",
              "body": "谁 (shéi) pergunta sobre uma pessoa, ocupando o mesmo lugar na frase que a resposta ocuparia — se a resposta é \"eu\" no início da frase, 谁 também vai no início.",
              "examples": ["quem é você?"]
            }
          ],
          "weishenme-yinwei": [
            {
              "title": "\"Wèishénme\" ou \"yīnwèi\"?",
              "body": "<strong>Wèishénme</strong> (为什么) é a pergunta: \"por quê?\". <strong>Yīnwèi</strong> (因为) é a resposta: \"porque\". É a pergunta e a resposta andando sempre juntas, como um par.",
              "examples": ["por que você não vai?", "porque eu estou muito ocupado"]
            }
          ],
          "meiyou-de": [
            {
              "title": "Posse próxima sem 的",
              "body": "Pra relações pessoais muito próximas (família, namorado(a)), o chinês às vezes omite o 的 que normalmente marcaria posse.",
              "examples": ["minha namorada"]
            }
          ],
          "difang-you": [
            {
              "title": "Lugar + 有 + Objeto — dizendo o que existe num lugar",
              "body": "Pra dizer que algo existe em determinado lugar (\"aqui tem café\"), a estrutura é: Lugar + 有 + Objeto — bem diferente da ordem em português, onde o lugar viria depois.",
              "examples": ["aqui tem um pouco de café"]
            },
            {
              "title": "一些 (yìxiē) — \"alguns\" ou \"um pouco de\"",
              "body": "一些 (yìxiē) indica uma quantidade pequena e não específica de algo — equivale a \"alguns\" (coisas contáveis) ou \"um pouco de\" (coisas não-contáveis, como líquidos).",
              "examples": ["alguns livros"]
            }
          ],
          "zai-difang-verb": [
            {
              "title": "在 + Lugar + Verbo — localização da ação",
              "body": "Quando se quer dizer onde uma ação acontece (não só onde algo está parado), 在 + Lugar vem antes do verbo — diferente de quando 在 sozinho indica só a posição de algo.",
              "examples": ["eu trabalho em Xangai"]
            }
          ]
        },
        "trueFalse": [
          {
            "claim": "Essa pergunta pede pra saber onde alguém mora.",
            "whyNote": "Errado — <strong>你为什么不去？</strong> pergunta o MOTIVO (为什么 = por quê) de não ir, não onde a pessoa mora. Onde mora seria \"你住在哪里？\"."
          }
        ]
      }
    },
    "levels": { "HSK1": "Nível 1 · Iniciante" },
    "stories": {
      "1": {
        "title": "A família de Xiao Li",
        "subtitle": "Revendo Unidades 1-5",
        "beats": [
          {
            "lines": ["Olá, Brune!", "Olá! Bom dia!", "Este é meu pai."],
            "question": {
              "prompt": "Quem é apresentado nesta parte?",
              "options": ["A mãe de Xiao Li", "O pai de Xiao Li", "A irmã de Xiao Li", "Um amigo de Brune"]
            }
          },
          {
            "lines": ["Olá! De que país você é?", "Eu sou brasileira.", "Brasil! Legal!"]
          },
          {
            "lines": [
              "Esta é minha irmã mais velha.",
              "Olá! Quantos anos você tem?",
              "Eu tenho 30 anos. E você?",
              "Eu tenho 28 anos."
            ],
            "question": {
              "prompt": "Quantos anos a irmã de Xiao Li tem?",
              "options": ["28 anos", "30 anos", "18 anos", "13 anos"]
            }
          },
          {
            "lines": [
              "Quantas pessoas há na sua família, Brune?",
              "Minha família tem pai, mãe e eu.",
              "Você tem irmã mais velha?",
              "Não tenho. Eu tenho um irmão mais velho."
            ]
          },
          {
            "lines": [
              "Brune, o que você quer comer?",
              "Eu quero comer arroz. Isso está muito gostoso!",
              "Você quer beber chá?",
              "Quero! Eu gosto de beber chá."
            ],
            "question": {
              "prompt": "O que Brune quer comer?",
              "options": ["Macarrão", "Café", "Arroz", "Água"]
            }
          },
          {
            "lines": ["Obrigado, Brune!", "De nada! Tchau!", "Tchau!"]
          }
        ]
      },
      "2": {
        "title": "Um dia na cidade",
        "subtitle": "Revendo Unidades 6-10",
        "beats": [
          {
            "lines": [
              "Brune, que horas você levanta todos os dias?",
              "Eu levanto às 7h e vou trabalhar às 9h todos os dias.",
              "Hoje você sai do trabalho que horas?",
              "Agora! Eu já saí do trabalho."
            ],
            "question": {
              "prompt": "A que horas Brune vai trabalhar?",
              "options": ["7h", "8h", "9h", "5h"]
            }
          },
          {
            "lines": ["Você quer comprar roupa?", "Quero! Onde fica?", "Fica na frente, do lado esquerdo. Fica bem perto daqui."]
          },
          {
            "lines": ["Quanto custa isso?", "30 yuans.", "Está muito caro! Faz mais barato.", "Tá bom, 20 yuans."],
            "question": {
              "prompt": "Por quanto Brune conseguiu comprar a roupa?",
              "options": ["30 yuans", "25 yuans", "20 yuans", "15 yuans"]
            }
          },
          {
            "lines": [
              "Como está o tempo hoje?",
              "Hoje está bem quente, ensolarado.",
              "E amanhã?",
              "Amanhã vai chover, vai estar meio frio."
            ]
          },
          {
            "lines": [
              "Agora, como se vai até a estação?",
              "A pé?",
              "Não, é muito longe. Vamos de metrô.",
              "Combinado! Onde fica a estação de metrô?"
            ],
            "question": {
              "prompt": "Como eles decidem ir até a estação?",
              "options": ["A pé", "De ônibus", "De táxi", "De metrô"]
            }
          },
          {
            "lines": ["Fica na frente, bem perto.", "Ótimo! Hoje foi muito bom.", "Tchau, Brune!", "Tchau!"]
          }
        ]
      },
      "3": {
        "title": "Xiao Li não está bem",
        "subtitle": "Revendo Unidades 11-14",
        "beats": [
          {
            "lines": [
              "Xiao Li, o que houve com você?",
              "Não estou bem, minha cabeça está doendo muito.",
              "Você quer ir ao hospital?",
              "Quero. O hospital fica longe daqui?"
            ],
            "question": {
              "prompt": "O que está doendo em Xiao Li?",
              "options": ["A barriga", "A cabeça", "As costas", "Os pés"]
            }
          },
          {
            "lines": ["Não é longe, é bem perto.", "Obrigado, Brune.", "De nada! Você está melhor agora?"]
          },
          {
            "lines": [
              "Um pouco melhor. Qual é o seu hobby?",
              "Eu gosto de assistir filme e dançar. E você?",
              "Eu gosto de fazer exercício, mas agora não está bom (pra isso)."
            ],
            "question": {
              "prompt": "Qual é o hobby de Xiao Li?",
              "options": ["Assistir filme", "Dançar", "Fazer exercício", "Cantar"]
            }
          },
          {
            "lines": [
              "Quais são seus planos para semana que vem?",
              "Eu pretendo ficar em casa. Eu ainda não estou bom.",
              "Certo. Você quer ir fazer exercício no futuro?",
              "Quero! Fazer exercício é ainda melhor que assistir filme."
            ],
            "question": {
              "prompt": "O que Xiao Li acha que é melhor: exercício ou filme?",
              "options": ["Filme", "Exercício", "Os dois são iguais", "Nenhum dos dois"]
            }
          },
          {
            "lines": [
              "Você acha o chinês difícil?",
              "Não é difícil! Mas é bem interessante.",
              "Certo! Eu acho que chinês é o mais interessante."
            ]
          },
          {
            "lines": ["Obrigado por vir me ver hoje.", "De nada! Tchau!", "Obrigado! Tchau."]
          }
        ]
      },
      "4": {
        "title": "Convite para o cinema",
        "subtitle": "Revendo Unidades 15-18 — o fim do HSK1!",
        "beats": [
          {
            "lines": [
              "Brune, eu quero ir ver um filme. Você consegue vir?",
              "Consigo! Que horas?",
              "Domingo às 7 da noite, no cinema."
            ],
            "question": {
              "prompt": "Que dia da semana é o cinema?",
              "options": ["Segunda-feira", "Sexta-feira", "Domingo", "Hoje"]
            }
          },
          {
            "lines": [
              "Combinado! Que dia da semana é hoje?",
              "Hoje é sexta-feira.",
              "Ótimo, eu tenho tempo livre em ambos os dias!"
            ]
          },
          {
            "lines": [
              "Você já comeu?",
              "Ainda não, ainda estou trabalhando.",
              "Eu já comi, comi duas maçãs.",
              "Ontem eu não jantei, hoje estou com muita fome."
            ],
            "question": {
              "prompt": "O que Xiao Li já comeu?",
              "options": ["Arroz", "Duas maçãs", "Macarrão", "Nada"]
            }
          },
          {
            "lines": [
              "Até domingo! Esta é minha namorada, ela também vai vir.",
              "Quem é ela?",
              "Ela se chama Xiao Mei, ela é estudante."
            ],
            "question": {
              "prompt": "O que Xiao Mei faz?",
              "options": ["Trabalha num hospital", "É estudante", "É médica", "Trabalha na escola"]
            }
          },
          {
            "lines": ["Onde ela estuda?", "Ela estuda na escola. Por quê?", "Porque eu também gosto de estudar!"]
          },
          {
            "lines": ["Até domingo, Brune!", "Combinado! Tchau!", "Tchau!"]
          }
        ]
      }
    },
    "hanzi": {
      "你": {
        "meaning": "você",
        "radicals": ["pessoa", "tu (fonético)"]
      },
      "好": {
        "meaning": "bom, bem",
        "radicals": ["mulher", "filho"],
        "mnemonic": "Uma mulher (女) ao lado de um filho (子) — a imagem tradicional de uma família reunida, algo bom e completo."
      },
      "再": {
        "meaning": "de novo, outra vez",
        "radicals": []
      },
      "见": {
        "meaning": "ver, encontrar",
        "radicals": []
      },
      "谢": {
        "meaning": "agradecer",
        "radicals": ["fala", "atirar (fonético)"]
      },
      "不": {
        "meaning": "não",
        "radicals": []
      },
      "客": {
        "meaning": "convidado, hóspede",
        "radicals": ["teto/casa", "cada (fonético)"]
      },
      "气": {
        "meaning": "ar, energia",
        "radicals": []
      },
      "对": {
        "meaning": "certo, correto; em relação a",
        "radicals": []
      },
      "起": {
        "meaning": "levantar, começar",
        "radicals": ["andar", "si mesmo (fonético)"]
      },
      "没": {
        "meaning": "não ter, não há",
        "radicals": ["água", "instrumento (fonético)"]
      },
      "关": {
        "meaning": "fechar; relação",
        "radicals": []
      },
      "系": {
        "meaning": "sistema, ligação",
        "radicals": []
      },
      "早": {
        "meaning": "cedo, manhã",
        "radicals": ["sol", "dez"],
        "mnemonic": "O sol (日) nascendo bem acima da linha do horizonte (十, como as primeiras raias de luz) — a imagem do início da manhã."
      },
      "上": {
        "meaning": "em cima, subir",
        "radicals": []
      },
      "晚": {
        "meaning": "noite, tarde",
        "radicals": ["sol", "evitar (fonético)"]
      },
      "我": {
        "meaning": "eu",
        "radicals": []
      },
      "叫": {
        "meaning": "chamar-se, gritar",
        "radicals": ["boca", "enroscar (fonético)"]
      },
      "名": {
        "meaning": "nome",
        "radicals": ["anoitecer", "boca"]
      },
      "字": {
        "meaning": "caractere, palavra",
        "radicals": ["teto/casa", "filho"]
      },
      "是": {
        "meaning": "ser, estar",
        "radicals": []
      },
      "人": {
        "meaning": "pessoa",
        "radicals": []
      },
      "巴": {
        "meaning": "(parte de Bāxī, Brasil)",
        "radicals": []
      },
      "西": {
        "meaning": "oeste",
        "radicals": []
      },
      "中": {
        "meaning": "meio, centro",
        "radicals": []
      },
      "国": {
        "meaning": "país",
        "radicals": ["cercado, fronteira", "jade (tesouro)"]
      },
      "哪": {
        "meaning": "qual",
        "radicals": ["boca", "aquele (fonético)"]
      },
      "零": {
        "meaning": "zero",
        "radicals": []
      },
      "一": {
        "meaning": "um",
        "radicals": []
      },
      "二": {
        "meaning": "dois",
        "radicals": []
      },
      "三": {
        "meaning": "três",
        "radicals": []
      },
      "四": {
        "meaning": "quatro",
        "radicals": []
      },
      "五": {
        "meaning": "cinco",
        "radicals": []
      },
      "六": {
        "meaning": "seis",
        "radicals": []
      },
      "七": {
        "meaning": "sete",
        "radicals": []
      },
      "八": {
        "meaning": "oito",
        "radicals": []
      },
      "九": {
        "meaning": "nove",
        "radicals": []
      },
      "十": {
        "meaning": "dez",
        "radicals": []
      },
      "岁": {
        "meaning": "anos (idade)",
        "radicals": []
      },
      "多": {
        "meaning": "muito, quanto",
        "radicals": ["anoitecer", "anoitecer (repetido)"]
      },
      "大": {
        "meaning": "grande",
        "radicals": []
      },
      "家": {
        "meaning": "família, casa",
        "radicals": ["teto/casa", "porco"],
        "mnemonic": "Um porco (豕) sob um teto (宀) — na China antiga, ter um porco dentro de casa era sinal de que a família tinha se estabelecido e tinha fartura."
      },
      "爸": {
        "meaning": "pai",
        "radicals": ["pai", "(fonético)"]
      },
      "妈": {
        "meaning": "mãe",
        "radicals": ["mulher", "cavalo (fonético)"]
      },
      "哥": {
        "meaning": "irmão mais velho",
        "radicals": ["poder (fonético)", "poder (repetido)"]
      },
      "弟": {
        "meaning": "irmão mais novo",
        "radicals": []
      },
      "姐": {
        "meaning": "irmã mais velha",
        "radicals": ["mulher", "além disso (fonético)"]
      },
      "妹": {
        "meaning": "irmã mais nova",
        "radicals": ["mulher", "ainda não (fonético)"]
      },
      "孩": {
        "meaning": "criança, filho(a)",
        "radicals": ["filho", "(fonético)"]
      },
      "子": {
        "meaning": "filho, criança",
        "radicals": []
      },
      "有": {
        "meaning": "ter, haver",
        "radicals": []
      },
      "几": {
        "meaning": "quantos",
        "radicals": []
      },
      "个": {
        "meaning": "(classificador geral)",
        "radicals": []
      },
      "口": {
        "meaning": "boca; (classificador p/ pessoas da família)",
        "radicals": []
      },
      "吃": {
        "meaning": "comer",
        "radicals": ["boca", "mendigar (fonético)"]
      },
      "喝": {
        "meaning": "beber",
        "radicals": ["boca", "(fonético)"]
      },
      "米": {
        "meaning": "arroz (grão)",
        "radicals": []
      },
      "饭": {
        "meaning": "arroz (cozido), refeição",
        "radicals": ["comida", "reverso (fonético)"]
      },
      "面": {
        "meaning": "macarrão; rosto",
        "radicals": []
      },
      "水": {
        "meaning": "água",
        "radicals": []
      },
      "茶": {
        "meaning": "chá",
        "radicals": ["planta", "restante (fonético)"]
      },
      "咖": {
        "meaning": "(parte de kāfēi, café)",
        "radicals": ["boca", "adicionar (fonético)"]
      },
      "啡": {
        "meaning": "(parte de kāfēi, café)",
        "radicals": ["boca", "não (fonético)"]
      },
      "喜": {
        "meaning": "gostar, alegria",
        "radicals": []
      },
      "欢": {
        "meaning": "alegre (em xǐhuan, gostar)",
        "radicals": []
      },
      "要": {
        "meaning": "querer, precisar",
        "radicals": []
      },
      "杯": {
        "meaning": "copo, xícara",
        "radicals": ["madeira", "não (fonético)"]
      },
      "点": {
        "meaning": "hora; ponto",
        "radicals": []
      },
      "床": {
        "meaning": "cama",
        "radicals": ["abrigo", "madeira"]
      },
      "班": {
        "meaning": "turno, turma (em shàngbān, trabalhar)",
        "radicals": []
      },
      "下": {
        "meaning": "embaixo, descer",
        "radicals": []
      },
      "睡": {
        "meaning": "dormir",
        "radicals": ["olho", "pendurar (fonético)"]
      },
      "觉": {
        "meaning": "sono (em shuìjiào, dormir)",
        "radicals": []
      },
      "每": {
        "meaning": "cada",
        "radicals": []
      },
      "天": {
        "meaning": "dia, céu",
        "radicals": []
      },
      "现": {
        "meaning": "atual, presente",
        "radicals": ["jade/rei", "ver (fonético)"]
      },
      "在": {
        "meaning": "estar (localização); em",
        "radicals": []
      },
      "今": {
        "meaning": "hoje, presente",
        "radicals": []
      },
      "里": {
        "meaning": "dentro",
        "radicals": []
      },
      "左": {
        "meaning": "esquerda",
        "radicals": []
      },
      "右": {
        "meaning": "direita",
        "radicals": []
      },
      "前": {
        "meaning": "frente, antes",
        "radicals": []
      },
      "后": {
        "meaning": "atrás, depois",
        "radicals": []
      },
      "离": {
        "meaning": "distância de, longe de",
        "radicals": []
      },
      "近": {
        "meaning": "perto",
        "radicals": ["caminhar", "machado (fonético)"]
      },
      "远": {
        "meaning": "longe",
        "radicals": ["caminhar", "origem (fonético)"]
      },
      "买": {
        "meaning": "comprar",
        "radicals": []
      },
      "卖": {
        "meaning": "vender",
        "radicals": []
      },
      "少": {
        "meaning": "pouco",
        "radicals": []
      },
      "钱": {
        "meaning": "dinheiro",
        "radicals": ["metal", "pequeno (fonético)"]
      },
      "块": {
        "meaning": "pedaço; unidade monetária",
        "radicals": ["terra", "(fonético)"]
      },
      "便": {
        "meaning": "barato (em piányi)",
        "radicals": []
      },
      "宜": {
        "meaning": "apropriado (em piányi, barato)",
        "radicals": ["teto/casa", "além disso"]
      },
      "贵": {
        "meaning": "caro, precioso",
        "radicals": []
      },
      "这": {
        "meaning": "este, esta",
        "radicals": ["caminhar", "escrita (fonético)"]
      },
      "那": {
        "meaning": "aquele, aquela",
        "radicals": []
      },
      "衣": {
        "meaning": "roupa",
        "radicals": []
      },
      "服": {
        "meaning": "roupa, vestir (em yīfu)",
        "radicals": []
      },
      "鞋": {
        "meaning": "sapato",
        "radicals": ["couro", "jade (fonético)"]
      },
      "热": {
        "meaning": "quente",
        "radicals": ["mão", "fogo"]
      },
      "冷": {
        "meaning": "frio",
        "radicals": ["gelo", "ordem (fonético)"]
      },
      "雨": {
        "meaning": "chuva",
        "radicals": []
      },
      "晴": {
        "meaning": "ensolarado",
        "radicals": ["sol", "verde-azulado (fonético)"]
      },
      "阴": {
        "meaning": "nublado, sombrio",
        "radicals": []
      },
      "风": {
        "meaning": "vento",
        "radicals": []
      },
      "怎": {
        "meaning": "como (em zěnme)",
        "radicals": []
      },
      "么": {
        "meaning": "(partícula interrogativa)",
        "radicals": []
      },
      "样": {
        "meaning": "tipo, aparência",
        "radicals": ["madeira", "ovelha (fonético)"]
      },
      "公": {
        "meaning": "público",
        "radicals": []
      },
      "共": {
        "meaning": "comum, junto",
        "radicals": []
      },
      "汽": {
        "meaning": "vapor (em qìchē, carro)",
        "radicals": ["água", "ar (fonético)"]
      },
      "车": {
        "meaning": "carro, veículo",
        "radicals": []
      },
      "地": {
        "meaning": "terra, chão (em dìtiě, metrô)",
        "radicals": ["terra", "também (fonético)"]
      },
      "铁": {
        "meaning": "ferro (em dìtiě, metrô)",
        "radicals": ["metal", "perder (fonético)"]
      },
      "出": {
        "meaning": "sair",
        "radicals": []
      },
      "租": {
        "meaning": "alugar (em chūzūchē, táxi)",
        "radicals": ["cereal", "além disso (fonético)"]
      },
      "走": {
        "meaning": "andar, ir a pé",
        "radicals": []
      },
      "路": {
        "meaning": "caminho, estrada",
        "radicals": ["pé", "cada (fonético)"]
      },
      "去": {
        "meaning": "ir",
        "radicals": []
      },
      "站": {
        "meaning": "estação, parada",
        "radicals": ["ficar de pé", "ocupar (fonético)"]
      },
      "票": {
        "meaning": "bilhete, passagem",
        "radicals": []
      },
      "张": {
        "meaning": "(classificador p/ objetos planos)",
        "radicals": ["arco", "longo (fonético)"]
      },
      "身": {
        "meaning": "corpo",
        "radicals": []
      },
      "体": {
        "meaning": "corpo (em shēntǐ)",
        "radicals": ["pessoa", "raiz/origem"]
      },
      "头": {
        "meaning": "cabeça",
        "radicals": []
      },
      "肚": {
        "meaning": "barriga",
        "radicals": ["carne/corpo", "terra (fonético)"]
      },
      "疼": {
        "meaning": "doer",
        "radicals": ["doença", "inverno (fonético)"]
      },
      "生": {
        "meaning": "nascer, vida (em shēngbìng, ficar doente)",
        "radicals": []
      },
      "病": {
        "meaning": "doença",
        "radicals": ["doença", "terceiro (fonético)"]
      },
      "医": {
        "meaning": "medicina, médico",
        "radicals": []
      },
      "院": {
        "meaning": "pátio, instituição (em yīyuàn, hospital)",
        "radicals": ["colina/lugar", "completo (fonético)"]
      },
      "舒": {
        "meaning": "confortável (em bù shūfu)",
        "radicals": []
      },
      "爱": {
        "meaning": "amor, gostar muito",
        "radicals": []
      },
      "看": {
        "meaning": "ver, assistir",
        "radicals": ["mão", "olho"],
        "mnemonic": "Uma mão (手) protegendo o olho (目) do sol — o gesto de fazer uma pala com a mão para enxergar melhor algo à distância."
      },
      "书": {
        "meaning": "livro",
        "radicals": []
      },
      "听": {
        "meaning": "ouvir",
        "radicals": ["boca", "machado (fonético)"]
      },
      "音": {
        "meaning": "som",
        "radicals": []
      },
      "乐": {
        "meaning": "música (em yīnyuè)",
        "radicals": []
      },
      "电": {
        "meaning": "eletricidade",
        "radicals": []
      },
      "影": {
        "meaning": "sombra, filme (em diànyǐng)",
        "radicals": []
      },
      "运": {
        "meaning": "mover, sorte (em yùndòng, esporte)",
        "radicals": ["caminhar", "nuvem (fonético)"]
      },
      "动": {
        "meaning": "mover (em yùndòng, esporte)",
        "radicals": []
      },
      "唱": {
        "meaning": "cantar",
        "radicals": ["boca", "próspero (fonético)"]
      },
      "歌": {
        "meaning": "canção",
        "radicals": []
      },
      "跳": {
        "meaning": "pular, dançar",
        "radicals": ["pé", "presságio (fonético)"]
      },
      "舞": {
        "meaning": "dança (em tiàowǔ)",
        "radicals": []
      },
      "空": {
        "meaning": "vazio, tempo livre (em yǒu kòng)",
        "radicals": ["caverna/buraco", "trabalho (fonético)"]
      },
      "打": {
        "meaning": "bater, fazer (em dǎsuàn, planejar)",
        "radicals": ["mão", "prego (fonético)"]
      },
      "算": {
        "meaning": "calcular, planejar (em dǎsuàn)",
        "radicals": []
      },
      "明": {
        "meaning": "claro, amanhã (em míngtiān)",
        "radicals": ["sol", "lua"],
        "mnemonic": "O sol (日) e a lua (月) lado a lado — juntos, os dois maiores astros do céu, iluminando tudo: daí o sentido de \"claro\" e \"brilhante\"."
      },
      "星": {
        "meaning": "estrela (em xīngqī, semana)",
        "radicals": ["sol", "nascer (fonético)"]
      },
      "期": {
        "meaning": "período (em xīngqī, semana)",
        "radicals": []
      },
      "旅": {
        "meaning": "viajar",
        "radicals": []
      },
      "游": {
        "meaning": "passear, nadar (em lǚyóu, viajar)",
        "radicals": ["água", "(fonético)"]
      },
      "学": {
        "meaning": "estudar, aprender",
        "radicals": []
      },
      "习": {
        "meaning": "praticar (em xuéxí, estudar)",
        "radicals": []
      },
      "计": {
        "meaning": "calcular, plano (em jìhuà)",
        "radicals": ["fala", "dez (fonético)"]
      },
      "划": {
        "meaning": "planejar (em jìhuà, plano)",
        "radicals": []
      },
      "以": {
        "meaning": "com, por meio de (em yǐhòu, depois)",
        "radicals": []
      },
      "比": {
        "meaning": "comparar, mais que",
        "radicals": []
      },
      "更": {
        "meaning": "ainda mais",
        "radicals": []
      },
      "最": {
        "meaning": "o mais (superlativo)",
        "radicals": []
      },
      "还": {
        "meaning": "ainda; ou (em háishi)",
        "radicals": ["caminhar", "não (fonético)"]
      },
      "高": {
        "meaning": "alto",
        "radicals": []
      },
      "毛": {
        "meaning": "pelo; centavo (1/10 do kuài)",
        "radicals": []
      },
      "想": {
        "meaning": "querer, pensar em",
        "radicals": ["mútuo (fonético)", "coração"]
      },
      "会": {
        "meaning": "saber fazer (habilidade aprendida)",
        "radicals": []
      },
      "能": {
        "meaning": "conseguir, poder",
        "radicals": []
      },
      "请": {
        "meaning": "por favor, convidar",
        "radicals": ["fala", "verde-azulado (fonético)"]
      },
      "坐": {
        "meaning": "sentar",
        "radicals": ["pessoa", "terra"],
        "mnemonic": "Duas pessoas (人, duplicado no traço) sentadas diretamente no chão (土) — a imagem mais simples possível de sentar-se."
      },
      "都": {
        "meaning": "todos, ambos",
        "radicals": []
      },
      "也": {
        "meaning": "também",
        "radicals": []
      },
      "说": {
        "meaning": "falar",
        "radicals": ["fala", "trocar (fonético)"]
      },
      "来": {
        "meaning": "vir",
        "radicals": []
      },
      "号": {
        "meaning": "dia do mês (uso falado)",
        "radicals": []
      },
      "月": {
        "meaning": "mês; lua",
        "radicals": []
      },
      "年": {
        "meaning": "ano",
        "radicals": []
      },
      "分": {
        "meaning": "minuto; dividir",
        "radicals": ["dividir/oito", "faca"]
      },
      "百": {
        "meaning": "cem",
        "radicals": []
      },
      "了": {
        "meaning": "partícula de conclusão/mudança de estado",
        "radicals": []
      },
      "苹": {
        "meaning": "(parte de píngguǒ, maçã)",
        "radicals": ["planta", "plano (fonético)"]
      },
      "果": {
        "meaning": "fruta; resultado (em píngguǒ, maçã)",
        "radicals": []
      },
      "昨": {
        "meaning": "ontem (em zuótiān)",
        "radicals": ["sol", "de repente (fonético)"]
      },
      "完": {
        "meaning": "terminar, acabar",
        "radicals": ["teto/casa", "origem (fonético)"]
      },
      "工": {
        "meaning": "trabalho (em gōngzuò)",
        "radicals": []
      },
      "作": {
        "meaning": "fazer, trabalhar (em gōngzuò)",
        "radicals": ["pessoa", "de repente (fonético)"]
      },
      "酒": {
        "meaning": "álcool, bebida alcoólica",
        "radicals": ["água", "jarro de vinho"]
      },
      "吧": {
        "meaning": "partícula de sugestão; bar (em jiǔbā)",
        "radicals": ["boca", "(fonético)"]
      },
      "谁": {
        "meaning": "quem",
        "radicals": ["fala", "pássaro (fonético)"]
      },
      "为": {
        "meaning": "para, por (em wèishénme, por quê)",
        "radicals": []
      },
      "什": {
        "meaning": "que (em shénme/wèishénme)",
        "radicals": ["pessoa", "dez"]
      },
      "因": {
        "meaning": "causa (em yīnwèi, porque)",
        "radicals": []
      },
      "校": {
        "meaning": "escola (em xuéxiào)",
        "radicals": ["madeira", "trocar (fonético)"]
      },
      "女": {
        "meaning": "mulher (em nǚpéngyou, namorada)",
        "radicals": []
      },
      "朋": {
        "meaning": "amigo (em péngyou)",
        "radicals": []
      },
      "友": {
        "meaning": "amigo (em péngyou)",
        "radicals": []
      },
      "男": {
        "meaning": "homem (em nánpéngyou, namorado)",
        "radicals": ["campo", "força"],
        "mnemonic": "Um campo de cultivo (田) sobre força/vigor físico (力) — na sociedade agrícola tradicional, o homem era quem trabalhava a terra com sua força."
      },
      "些": {
        "meaning": "alguns, um pouco (em yìxiē)",
        "radicals": []
      }
    }
  };
  var g = typeof window !== 'undefined' ? window : globalThis;
  g.COURSE_LAYERS = g.COURSE_LAYERS || {};
  g.COURSE_LAYERS['mandarim@pt-BR'] = L;
  CourseLayer.apply({
    units: typeof UNITS !== 'undefined' ? UNITS : undefined,
    levels: typeof LEVELS !== 'undefined' ? LEVELS : undefined,
    modules: typeof MODULES !== 'undefined' ? MODULES : undefined,
    levelTests: typeof LEVEL_TESTS !== 'undefined' ? LEVEL_TESTS : undefined,
    stories: typeof STORIES !== 'undefined' ? STORIES : undefined,
    hanzi: typeof HANZI_LESSONS !== 'undefined' ? HANZI_LESSONS : undefined,
    dictations: typeof DICTATIONS !== 'undefined' ? DICTATIONS : undefined,
    conjugation: typeof CONJUGATION_GROUPS !== 'undefined' ? { groups: CONJUGATION_GROUPS, verbTranslations: VERB_TRANSLATIONS } : undefined
  }, L);
})();
