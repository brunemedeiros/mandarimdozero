// Banco de explicações gramaticais — "Dicas e Notas"
// 54 pontos gramaticais oficiais do HSK1, organizados por unidade.
// Cada unidade pode ter 0 ou mais notas associadas.
// Formato: título, explicação em texto corrido, tabela de exemplos
// (array de {pt, cn} ou {label, pt, cn} para tabelas de contraste),
// e um exemplo real puxado do próprio curso.

const GRAMMAR_NOTES = {
  1: [
    {
      title: "不 (bù) — negação padrão",
      explanation: "不 (bù) é a negação mais comum do chinês — vem sempre antes do verbo ou adjetivo que se quer negar. Diferente do português, não muda de forma dependendo de quem fala ou de quando algo acontece.",
      table: [
        { pt: "Eu não entendo", cn: "我不懂 (wǒ bù dǒng)" },
        { pt: "Não é caro", cn: "不贵 (bú guì)" },
        { pt: "Não é longe", cn: "不远 (bù yuǎn)" }
      ],
      courseExample: { p: "Duì bu qǐ, wǒ bù dǒng.", c: "对不起，我不懂。", t: "Desculpe, eu não entendo." }
    }
  ],

  2: [
    {
      title: "是 (shì) — o verbo \"ser\"",
      explanation: "是 (shì) equivale ao verbo \"ser\" em português, mas com uma diferença importante: ele só liga substantivos entre si, nunca um substantivo a um adjetivo. Diferente do português, os verbos em chinês nunca são conjugados — a forma de 是 não muda no presente, passado ou futuro. \"Sou\", \"era\", \"fui\" viram todos apenas 是 (shì).",
      table: [
        { pt: "Eu sou brasileira", cn: "我是巴西人 (wǒ shì Bāxī rén)" },
        { pt: "Você é brasileiro", cn: "你是巴西人 (nǐ shì Bāxī rén)" },
        { pt: "Ele/Ela é brasileiro(a)", cn: "他/她是巴西人 (tā shì Bāxī rén)" },
        { pt: "Eu era estudante", cn: "我是学生 (wǒ shì xuésheng)" },
        { pt: "Eu fui professora", cn: "我是老师 (wǒ shì lǎoshī)" }
      ],
      courseExample: { p: "Wǒ shì Bāxī rén.", c: "我是巴西人。", t: "Eu sou brasileira." }
    },
    {
      title: "Ordem básica da frase: Sujeito + Verbo + Objeto",
      explanation: "A estrutura mais comum de uma frase em chinês segue a mesma ordem do português: primeiro quem faz a ação (sujeito), depois a ação em si (verbo), depois o que recebe a ação (objeto). Diferente do português, o chinês tem pouca flexibilidade nessa ordem — mudar a posição das palavras muda o significado da frase.",
      table: [
        { pt: "Eu (sujeito) estudo (verbo) chinês (objeto)", cn: "我学习汉语 (wǒ xuéxí Hànyǔ)" },
        { pt: "Você (sujeito) é (verbo) brasileiro (objeto)", cn: "你是巴西人 (nǐ shì Bāxī rén)" }
      ],
      courseExample: { p: "Wǒ shì Bāxī rén.", c: "我是巴西人。", t: "Eu sou brasileira." }
    }
  ],

  3: [
    {
      title: "Estrutura dos números em chinês",
      explanation: "Os números de 0 a 10 têm palavras próprias. A partir daí, o chinês constrói números maiores combinando essas palavras de forma bem lógica: 十一 (shí yī) é literalmente \"dez-um\" (11), 二十 (èr shí) é \"dois-dez\" (20). É mais regular que o português nesse sentido.",
      table: [
        { pt: "11 = dez + um", cn: "十一 (shí yī)" },
        { pt: "20 = dois + dez", cn: "二十 (èr shí)" },
        { pt: "25 = dois + dez + cinco", cn: "二十五 (èr shí wǔ)" }
      ],
      courseExample: { p: "Wǒ èr shí bā suì.", c: "我二十八岁。", t: "Eu tenho 28 anos." }
    },
    {
      title: "岁 (suì) — contando idade",
      explanation: "Para dizer a idade em chinês, o número vem seguido da palavra 岁 (suì), que funciona como a unidade \"anos\" — mas sem usar o verbo \"ter\" como em português. A estrutura é: Sujeito + Número + 岁.",
      table: [
        { pt: "Eu tenho 28 anos", cn: "我二十八岁 (wǒ èrshíbā suì)" },
        { pt: "Ele tem 30 anos", cn: "他三十岁 (tā sānshí suì)" },
        { pt: "Quantos anos você tem?", cn: "你几岁？(nǐ jǐ suì?)" }
      ],
      courseExample: { p: "Wǒ èr shí bā suì.", c: "我二十八岁。", t: "Eu tenho 28 anos." }
    },
    {
      title: "几 vs. 多 — duas formas de perguntar \"quanto\"",
      explanation: "几 (jǐ) é usado para perguntar sobre números pequenos e esperados, geralmente até 10 (idade de criança, quantidade de pessoas na família). 多 (duō) antes de um adjetivo pergunta sobre grau ou quantidade maior, sem expectativa de um número pequeno específico — como em \"quão alto\" ou \"quantos anos\" de um adulto.",
      table: [
        { pt: "Quantos anos você tem? (criança, número pequeno esperado)", cn: "你几岁？(nǐ jǐ suì?)" },
        { pt: "Quantos anos você tem? (adulto, sem expectativa de número pequeno)", cn: "你多大？(nǐ duō dà?)" },
        { pt: "Quão alto ele é?", cn: "他多高？(tā duō gāo?)" }
      ],
      courseExample: { p: "Nǐ jǐ suì? / Nǐ duō dà?", c: "你几岁？/ 你多大？", t: "Quantos anos você tem?" }
    }
  ],

  // Unidade 4 migrada pra explicação contextual (ver `concepts` em
  // content.js, unidade "Família") — as 4 notas que estavam aqui agora
  // disparam dentro da própria lição, no momento em que o conceito se torna
  // relevante, em vez de viverem só neste banco avulso ("Dicas e Notas").

  5: [
    {
      title: "要 (yào) — \"querer\"",
      explanation: "要 (yào) expressa vontade ou necessidade, tanto antes de um substantivo (\"eu quero chá\") quanto antes de um verbo (\"eu quero ir\"). É uma das palavras mais usadas do chinês cotidiano, especialmente para pedidos.",
      table: [
        { pt: "Eu quero uma xícara de chá", cn: "我要一杯茶 (wǒ yào yì bēi chá)" },
        { pt: "Eu quero comer", cn: "我要吃 (wǒ yào chī)" }
      ],
      courseExample: { p: "Wǒ yào yì bēi chá.", c: "我要一杯茶。", t: "Eu quero uma xícara de chá." }
    },
    {
      title: "很 (hěn) antes de adjetivo",
      explanation: "Em chinês, frases simples com adjetivo quase sempre levam 很 (hěn) antes dele — mesmo quando não se quer dizer \"muito\". Sem 很, a frase soa como uma comparação implícita ou fica gramaticalmente estranha. É praticamente obrigatório nesse tipo de frase.",
      table: [
        { pt: "Isso está gostoso", cn: "这个很好吃 (zhège hěn hǎochī)" },
        { pt: "Hoje está quente", cn: "今天很热 (jīntiān hěn rè)" }
      ],
      courseExample: { p: "Zhège hěn hǎo chī!", c: "这个很好吃！", t: "Isso está muito gostoso!" }
    },
    {
      title: "喜欢 (xǐhuan) — \"gostar de\"",
      explanation: "喜欢 (xǐhuan) significa \"gostar\" e vem seguido diretamente do que se gosta — pode ser um substantivo ou outro verbo, sem precisar de preposição como o \"de\" do português.",
      table: [
        { pt: "Eu gosto de beber café", cn: "我喜欢喝咖啡 (wǒ xǐhuan hē kāfēi)" },
        { pt: "Eu gosto de ler livros", cn: "我喜欢看书 (wǒ xǐhuan kàn shū)" }
      ],
      courseExample: { p: "Wǒ xǐhuan hē kāfēi.", c: "我喜欢喝咖啡。", t: "Eu gosto de beber café." }
    }
  ],

  6: [
    {
      title: "Palavras de tempo antes do verbo",
      explanation: "Diferente do português, onde \"todos os dias\" pode vir no fim da frase (\"eu levanto às 7h todos os dias\"), em chinês as expressões de tempo vêm sempre antes do verbo, geralmente logo depois do sujeito.",
      table: [
        { pt: "Eu levanto às 7h todos os dias", cn: "我每天七点起床 (wǒ měitiān qī diǎn qǐchuáng)" },
        { pt: "Ele vai trabalhar às 8h", cn: "他八点上班 (tā bā diǎn shàngbān)" }
      ],
      courseExample: { p: "Wǒ měitiān qī diǎn qǐchuáng.", c: "我每天七点起床。", t: "Eu levanto às sete horas todos os dias." }
    },
    {
      title: "Estrutura das horas com 点",
      explanation: "Para dizer as horas em chinês, o número vem seguido de 点 (diǎn), que funciona como \"hora(s)\". É uma estrutura simples e direta: Número + 点.",
      table: [
        { pt: "7 horas", cn: "七点 (qī diǎn)" },
        { pt: "Que horas são agora?", cn: "现在几点？(xiànzài jǐ diǎn?)" }
      ],
      courseExample: { p: "Xiànzài jǐ diǎn?", c: "现在几点？", t: "Que horas são agora?" }
    },
    {
      title: "(正)在 + verbo — ação em progresso",
      explanation: "Para dizer que uma ação está acontecendo agora, o chinês usa 在 (zài) ou 正在 (zhèngzài) antes do verbo — funciona como o \"estar + gerúndio\" do português (\"estou comendo\").",
      table: [
        { pt: "Estou comendo agora", cn: "我正在吃饭 (wǒ zhèngzài chī fàn)" },
        { pt: "Ele está trabalhando", cn: "他在工作 (tā zài gōngzuò)" }
      ],
      courseExample: { p: "Wǒ zhèngzài chī fàn.", c: "我正在吃饭。", t: "Eu estou comendo agora." }
    }
  ],

  7: [
    {
      title: "在 (zài) — localização",
      explanation: "在 (zài) indica onde algo ou alguém está — funciona como o verbo \"ficar\" ou \"estar\" quando se fala de localização. A estrutura é: Algo/Alguém + 在 + Lugar.",
      table: [
        { pt: "Onde fica o banheiro?", cn: "厕所在哪里？(cèsuǒ zài nǎlǐ?)" },
        { pt: "O hospital fica perto daqui", cn: "医院离这里很近 (yīyuàn lí zhèlǐ hěn jìn)" }
      ],
      courseExample: { p: "Cèsuǒ zài nǎlǐ?", c: "厕所在哪里？", t: "Onde fica o banheiro?" }
    },
    {
      title: "怎么 (zěnme) — perguntando \"como\"",
      explanation: "怎么 (zěnme) pergunta sobre o modo como algo é feito, geralmente vindo antes do verbo — equivale a \"como\" em português quando se pergunta sobre método ou jeito de fazer algo.",
      table: [
        { pt: "Como se vai lá?", cn: "怎么去？(zěnme qù?)" },
        { pt: "Como você veio?", cn: "你是怎么来的？(nǐ shì zěnme lái de?)" }
      ],
      courseExample: { p: "Yī yuàn lí zhèlǐ hěn jìn.", c: "医院离这里很近。", t: "O hospital fica perto daqui." }
    }
  ],

  8: [
    {
      title: "个 (gè) e outras palavras-medida",
      explanation: "Em chinês, não se pode colocar um número direto antes de um substantivo — é preciso usar uma \"palavra-medida\" entre eles, como um encaixe obrigatório. 个 (gè) é a mais genérica e comum, mas outras (como 件 para roupas, 杯 para líquidos, 张 para objetos planos) são usadas para categorias específicas.",
      table: [
        { pt: "uma pessoa", cn: "一个人 (yí gè rén)" },
        { pt: "uma peça de roupa", cn: "一件衣服 (yí jiàn yīfu)" },
        { pt: "uma xícara de chá", cn: "一杯茶 (yì bēi chá)" }
      ],
      courseExample: { p: "Wǒ yào mǎi zhè jiàn yīfu.", c: "我要买这件衣服。", t: "Eu quero comprar essa roupa." }
    },
    {
      title: "吧 (ba) — suavizando um pedido ou sugestão",
      explanation: "吧 (ba) no final de uma frase transforma uma ordem direta em algo mais suave, como uma sugestão ou pedido educado — parecido com adicionar \"né\" ou \"tá\" no final de uma frase em português.",
      table: [
        { pt: "Faz mais barato, vai", cn: "便宜一点吧 (piányi yìdiǎn ba)" },
        { pt: "Vamos, então", cn: "我们走吧 (wǒmen zǒu ba)" }
      ],
      courseExample: { p: "Tài guì le! Piányi yìdiǎn ba.", c: "太贵了！便宜一点吧。", t: "Está muito caro! Faz mais barato." }
    },
    {
      title: "块 e 毛 — contando dinheiro",
      explanation: "No chinês falado, o dinheiro é contado em 块 (kuài, a unidade principal, como \"real\") e 毛 (máo, um décimo do kuài, como \"centavos\"). A estrutura simplesmente junta os dois números em sequência.",
      table: [
        { pt: "30 yuans", cn: "三十块 (sānshí kuài)" },
        { pt: "5 yuans e 30 centavos", cn: "五块三毛 (wǔ kuài sān máo)" }
      ],
      courseExample: { p: "Wǔ kuài sān máo.", c: "五块三毛。", t: "5 yuans e 30 centavos." }
    }
  ],

  9: [
    {
      title: "会 (huì) — previsão sobre o futuro",
      explanation: "Além de significar \"saber fazer\" (uma habilidade aprendida), 会 (huì) também é usado para fazer previsões sobre o que vai acontecer — parecido com \"vai\" no futuro do português.",
      table: [
        { pt: "Amanhã vai chover", cn: "明天会下雨 (míngtiān huì xià yǔ)" },
        { pt: "Ele vai vir amanhã?", cn: "他明天会来吗？(tā míngtiān huì lái ma?)" }
      ],
      courseExample: { p: "Míngtiān huì xià yǔ.", c: "明天会下雨。", t: "Amanhã vai chover." }
    },
    {
      title: "不太 (bú tài) — \"não muito\"",
      explanation: "不太 (bú tài) suaviza uma negação, funcionando como \"não muito\" em português — em vez de negar totalmente algo, diz que não é bem assim, mas sem ser absoluto.",
      table: [
        { pt: "Hoje não está muito frio", cn: "今天不太冷 (jīntiān bú tài lěng)" },
        { pt: "Eu não gosto muito", cn: "我不太喜欢 (wǒ bú tài xǐhuan)" }
      ],
      courseExample: { p: "Jīntiān bú tài lěng.", c: "今天不太冷。", t: "Hoje não está muito frio." }
    }
  ],

  10: [
    {
      title: "去 (qù) — o verbo \"ir\"",
      explanation: "去 (qù) significa \"ir\" e é seguido diretamente pelo lugar de destino, sem precisar de uma preposição equivalente a \"para\" — a estrutura é: Sujeito + 去 + Lugar.",
      table: [
        { pt: "Eu vou ao aeroporto", cn: "我去机场 (wǒ qù jīchǎng)" },
        { pt: "Como se vai para o aeroporto?", cn: "去机场怎么去？(qù jīchǎng zěnme qù?)" }
      ],
      courseExample: { p: "Qù jīchǎng zěnme qù?", c: "去机场怎么去？", t: "Como se vai para o aeroporto?" }
    },
    {
      title: "是...的 — dando ênfase a como algo aconteceu",
      explanation: "A construção 是...的 é usada para dar ênfase a um detalhe específico de uma ação já concluída — geralmente o modo, o lugar ou o tempo em que ela aconteceu. É bem comum em perguntas do tipo \"como/quando/onde você fez isso\".",
      table: [
        { pt: "Como você veio? (dando ênfase ao \"como\")", cn: "你是怎么来的？(nǐ shì zěnme lái de?)" },
        { pt: "Eu vim de metrô", cn: "我是坐地铁来的 (wǒ shì zuò dìtiě lái de)" }
      ],
      courseExample: { p: "Nǐ shì zěnme lái de?", c: "你是怎么来的？", t: "Como você veio?" }
    },
    {
      title: "来 (lái) — o verbo \"vir\"",
      explanation: "来 (lái) significa \"vir\", complementando 去 (\"ir\") — juntos, são os dois verbos direcionais básicos do chinês, indicando movimento em direção ou para longe de quem fala.",
      table: [
        { pt: "Como você veio?", cn: "你是怎么来的？(nǐ shì zěnme lái de?)" },
        { pt: "Você consegue vir amanhã?", cn: "你明天能来吗？(nǐ míngtiān néng lái ma?)" }
      ],
      courseExample: { p: "Nǐ shì zěnme lái de?", c: "你是怎么来的？", t: "Como você veio?" }
    }
  ],

  11: [
    {
      title: "疼 (téng) — descrevendo dor",
      explanation: "Para dizer que alguma parte do corpo dói, a estrutura em chinês é bem direta: Parte do corpo + 疼 (téng) — sem precisar de um verbo equivalente a \"doer\" com sujeito separado como em português.",
      table: [
        { pt: "Minha cabeça está doendo", cn: "我头疼 (wǒ tóu téng)" },
        { pt: "Minha barriga dói", cn: "我肚子疼 (wǒ dùzi téng)" }
      ],
      courseExample: { p: "Wǒ tóu téng.", c: "我头疼。", t: "Minha cabeça está doendo." }
    },
    {
      title: "了 (le) marcando mudança de estado",
      explanation: "Além de marcar ações concluídas, 了 no final da frase (não logo após o verbo) indica que uma situação nova começou ou mudou — como \"o que houve com você?\" (uma mudança percebida agora, que antes não era assim).",
      table: [
        { pt: "O que houve com você?", cn: "你怎么了？(nǐ zěnme le?)" },
        { pt: "Está muito caro! (mudança percebida agora)", cn: "太贵了！(tài guì le!)" }
      ],
      courseExample: { p: "Nǐ zěnme le?", c: "你怎么了？", t: "O que houve com você?" }
    }
  ],

  12: [
    {
      title: "的 (de) — mostrando posse",
      explanation: "的 (de) é usado para indicar posse, como \"meu\", \"seu\", \"do fulano\" — parecido com o \"'s\" do inglês, mas mais simples: sempre fica entre o dono e a coisa possuída. A estrutura é: Dono + 的 + Coisa.",
      table: [
        { pt: "meu hobby", cn: "我的爱好 (wǒ de àihào)" },
        { pt: "seu nome", cn: "你的名字 (nǐ de míngzi)" },
        { pt: "hobby dela", cn: "她的爱好 (tā de àihào)" }
      ],
      courseExample: { p: "Nǐ de àihào shì shénme?", c: "你的爱好是什么？", t: "Qual é o seu hobby?" }
    }
  ],

  13: [
    {
      title: "打算 (dǎsuàn) — planos futuros",
      explanation: "打算 (dǎsuàn) significa \"planejar\" ou \"pretender\", e vem seguido diretamente de um verbo — é uma das formas mais comuns de falar sobre planos futuros em chinês.",
      table: [
        { pt: "Eu pretendo estudar chinês", cn: "我打算学中文 (wǒ dǎsuàn xué Zhōngwén)" },
        { pt: "Você planeja fazer o quê?", cn: "你打算做什么？(nǐ dǎsuàn zuò shénme?)" }
      ],
      courseExample: { p: "Wǒ dǎsuàn xué Zhōngwén.", c: "我打算学中文。", t: "Eu pretendo estudar chinês." }
    },
    {
      title: "以后 (yǐhòu) — \"depois de\"",
      explanation: "以后 (yǐhòu) significa \"depois\" ou \"no futuro\", e vem depois da referência de tempo à qual se refere — a estrutura inteira (tempo + 以后) funciona como uma unidade que indica \"depois desse momento\".",
      table: [
        { pt: "No futuro, eu quero viajar para a China", cn: "我以后要去中国旅游 (wǒ yǐhòu yào qù Zhōngguó lǚyóu)" },
        { pt: "Depois das 10h eu não estou em casa", cn: "十点以后我不在家 (shí diǎn yǐhòu wǒ bú zài jiā)" }
      ],
      courseExample: { p: "Wǒ yǐhòu yào qù Zhōngguó lǚyóu.", c: "我以后要去中国旅游。", t: "No futuro eu quero viajar para a China." }
    }
  ],

  14: [
    {
      title: "比 (bǐ) — fazendo comparações",
      explanation: "比 (bǐ) é usado para comparar duas coisas, funcionando como \"mais... que\" em português. A estrutura é: A + 比 + B + Adjetivo — bem mais direta que a construção em português.",
      table: [
        { pt: "Chinês é mais difícil que francês", cn: "中文比法文难 (Zhōngwén bǐ Fǎwén nán)" },
        { pt: "Hoje está mais quente que ontem", cn: "今天比昨天热 (jīntiān bǐ zuótiān rè)" }
      ],
      courseExample: { p: "Zhōngwén bǐ Fǎwén nán.", c: "中文比法文难。", t: "Chinês é mais difícil que francês." }
    },
    {
      title: "还是 (háishi) — \"ou\" em perguntas de escolha",
      explanation: "还是 (háishi) é usado para oferecer duas opções numa pergunta, equivalendo a \"ou\" quando se espera que a pessoa escolha entre uma coisa e outra — diferente de 或者, que é usado fora de perguntas.",
      table: [
        { pt: "Qual você acha mais difícil? Chinês ou italiano?", cn: "中文还是意大利文？(Zhōngwén háishi Yìdàlìwén?)" },
        { pt: "Você quer chá ou café?", cn: "你要茶还是咖啡？(nǐ yào chá háishi kāfēi?)" }
      ],
      courseExample: { p: "Nǐ juéde nǎge zuì nán? Zhōngwén háishi Yìdàlìwén?", c: "你觉得哪个最难？中文还是意大利文？", t: "Qual você acha o mais difícil? Chinês ou italiano?" }
    }
  ],

  15: [
    {
      title: "想 (xiǎng) — \"querer\" (desejo/intenção)",
      explanation: "想 (xiǎng) expressa vontade de fazer algo, de forma um pouco mais suave que 要 — é mais parecido com \"gostaria de\" ou \"estou pensando em\", enquanto 要 soa mais direto como \"quero\".",
      table: [
        { pt: "Eu quero ir ver um filme", cn: "我想去看电影 (wǒ xiǎng qù kàn diànyǐng)" },
        { pt: "Eu também quero ir", cn: "我也想去 (wǒ yě xiǎng qù)" }
      ],
      courseExample: { p: "Wǒ xiǎng qù kàn diànyǐng.", c: "我想去看电影。", t: "Eu quero ir ver um filme." }
    },
    {
      title: "会 (huì) — habilidade aprendida",
      explanation: "会 (huì) antes de um verbo indica uma habilidade que foi aprendida — como saber falar um idioma, dirigir, ou nadar. É diferente de 能 (poder fazer algo por capacidade física/permissão no momento).",
      table: [
        { pt: "Você sabe falar chinês?", cn: "你会说中文吗？(nǐ huì shuō Zhōngwén ma?)" },
        { pt: "Eu sei nadar", cn: "我会游泳 (wǒ huì yóuyǒng)" }
      ],
      courseExample: { p: "Nǐ huì shuō Zhōngwén ma?", c: "你会说中文吗？", t: "Você sabe falar chinês?" }
    },
    {
      title: "能 (néng) — capacidade ou permissão no momento",
      explanation: "能 (néng) indica que alguém consegue fazer algo numa situação específica — seja por capacidade física, tempo disponível, ou permissão. Diferente de 会, que é sobre uma habilidade aprendida de forma permanente.",
      table: [
        { pt: "Você consegue vir amanhã?", cn: "你明天能来吗？(nǐ míngtiān néng lái ma?)" },
        { pt: "Eu não consigo ir hoje", cn: "我今天不能去 (wǒ jīntiān bù néng qù)" }
      ],
      courseExample: { p: "Nǐ míngtiān néng lái ma?", c: "你明天能来吗？", t: "Você consegue vir amanhã?" }
    },
    {
      title: "请 (qǐng) — pedidos educados",
      explanation: "请 (qǐng) equivale a \"por favor\" quando vem antes de um pedido ou convite — é uma forma simples e educada de suavizar uma instrução direta.",
      table: [
        { pt: "Por favor, sente-se", cn: "请坐 (qǐng zuò)" },
        { pt: "Por favor, entre", cn: "请进 (qǐng jìn)" }
      ],
      courseExample: { p: "Qǐng zuò.", c: "请坐。", t: "Por favor, sente-se." }
    },
    {
      title: "都 (dōu) — \"todos\"",
      explanation: "都 (dōu) significa \"todos\" ou \"ambos\", mas sempre vem antes do verbo, nunca depois do substantivo como em português — diferente de \"nós todos vamos\", em chinês fica literalmente \"nós todos vamos\" na ordem sujeito+都+verbo.",
      table: [
        { pt: "Nós todos vamos", cn: "我们都去 (wǒmen dōu qù)" },
        { pt: "Nós todos queremos ir", cn: "我们都想去 (wǒmen dōu xiǎng qù)" }
      ],
      courseExample: { p: "Wǒmen dōu xiǎng qù.", c: "我们都想去。", t: "Nós todos queremos ir." }
    },
    {
      title: "也 (yě) — \"também\"",
      explanation: "也 (yě) equivale a \"também\", e assim como 都, sempre vem antes do verbo, nunca no final da frase como costuma ficar em português.",
      table: [
        { pt: "Eu também quero ir", cn: "我也想去 (wǒ yě xiǎng qù)" },
        { pt: "Hoje também está frio", cn: "今天也很冷 (jīntiān yě hěn lěng)" }
      ],
      courseExample: { p: "Wǒ yě xiǎng qù.", c: "我也想去。", t: "Eu também quero ir." }
    }
  ],

  16: [
    {
      title: "Estrutura dos dias da semana",
      explanation: "Os dias da semana em chinês seguem um padrão bem lógico: 星期 (xīngqī, \"semana\") seguido de um número de 1 a 6 para segunda a sábado. Domingo é a exceção, usando 星期天 ou 星期日 em vez de um número.",
      table: [
        { pt: "segunda-feira", cn: "星期一 (xīngqīyī)" },
        { pt: "quarta-feira", cn: "星期三 (xīngqīsān)" },
        { pt: "domingo (exceção)", cn: "星期天 (xīngqītiān)" }
      ],
      courseExample: { p: "Jīntiān xīngqī jǐ?", c: "今天星期几？", t: "Que dia da semana é hoje?" }
    },
    {
      title: "Estrutura de datas completas",
      explanation: "Uma data completa em chinês segue a ordem do maior para o menor: Ano + 年 + Mês + 月 + Dia + 号 — o oposto da ordem mais comum em português (dia/mês/ano). 号 é a forma usada na fala; a forma mais formal/escrita é 日.",
      table: [
        { pt: "20 de agosto", cn: "八月二十号 (bā yuè èrshí hào)" },
        { pt: "Hoje é dia 20 de agosto", cn: "今天八月二十号 (jīntiān bā yuè èrshí hào)" }
      ],
      courseExample: { p: "Jīntiān bā yuè èrshí hào.", c: "今天八月二十号。", t: "Hoje é dia 20 de agosto." }
    },
    {
      title: "Horas com minutos",
      explanation: "Para dizer um horário com minutos, basta juntar Número + 点 (hora) + Número + 分 (minuto) em sequência — bem direto, sem preposições como \"e\" entre eles.",
      table: [
        { pt: "11h18", cn: "十一点十八分 (shí yī diǎn shí bā fēn)" },
        { pt: "9h05", cn: "九点五分 (jiǔ diǎn wǔ fēn)" }
      ],
      courseExample: { p: "Xiànzài shí yī diǎn shí bā fēn.", c: "现在十一点十八分。", t: "Agora são 11h18." }
    },
    {
      title: "以前 (yǐqián) — \"antes de\"",
      explanation: "以前 (yǐqián) é o oposto de 以后 — significa \"antes\", e assim como 以后, vem depois da referência de tempo à qual se refere.",
      table: [
        { pt: "Antes das 10h eu estou em casa", cn: "十点以前我在家 (shí diǎn yǐqián wǒ zài jiā)" },
        { pt: "Antes de amanhã", cn: "明天以前 (míngtiān yǐqián)" }
      ],
      courseExample: { p: "Shí diǎn yǐqián wǒ zài jiā.", c: "十点以前我在家。", t: "Antes das 10h eu estou em casa." }
    }
  ],

  17: [
    {
      title: "了 (le) — marcando conclusão",
      explanation: "了 (le) depois de um verbo indica que a ação foi concluída — funciona parecido com o passado simples em português (\"comi\"). A estrutura é: Verbo + 了 + Objeto.",
      table: [
        { pt: "Eu comi duas maçãs", cn: "我吃了两个苹果 (wǒ chī le liǎng gè píngguǒ)" },
        { pt: "Ele já chegou", cn: "他到了 (tā dào le)" }
      ],
      courseExample: { p: "Wǒ chī le liǎng gè píngguǒ.", c: "我吃了两个苹果。", t: "Eu comi duas maçãs." }
    },
    {
      title: "不想...了 — \"não querer mais\"",
      explanation: "Quando 不 (ou 没) se combina com 了 no final da frase, o sentido vira \"não mais\" — indicando que algo que estava acontecendo ou era verdade parou de ser.",
      table: [
        { pt: "Eu não quero mais comer", cn: "我不想吃了 (wǒ bù xiǎng chī le)" },
        { pt: "Não chove mais", cn: "不下雨了 (bú xià yǔ le)" }
      ],
      courseExample: { p: "Wǒ bù xiǎng chī le.", c: "我不想吃了。", t: "Eu não quero mais comer." }
    },
    {
      title: "没有 + verbo — negando o passado",
      explanation: "Para dizer que algo não aconteceu no passado, o chinês usa 没有 (ou só 没) antes do verbo — nunca 不, que é reservado para negar o presente ou o futuro.",
      table: [
        { pt: "Ontem eu não fui trabalhar", cn: "昨天我没有去工作 (zuótiān wǒ méiyǒu qù gōngzuò)" },
        { pt: "Eu não fui ao bar", cn: "我没有去酒吧 (wǒ méiyǒu qù jiǔbā)" }
      ],
      courseExample: { p: "Wǒ zuótiān méiyǒu qù gōngzuò.", c: "我昨天没有去工作。", t: "Ontem eu não fui trabalhar." }
    },
    {
      title: "了...吗 — perguntando se algo já aconteceu",
      explanation: "Para perguntar se uma ação já foi concluída, junta-se 了 (marcando conclusão) com 吗 (marcando pergunta) no final da frase — a combinação pergunta \"isso já aconteceu?\".",
      table: [
        { pt: "Você já comeu?", cn: "你吃饭了吗？(nǐ chī fàn le ma?)" },
        { pt: "Ele já chegou?", cn: "他到了吗？(tā dào le ma?)" }
      ],
      courseExample: { p: "Nǐ chī fàn le ma?", c: "你吃饭了吗？", t: "Você já comeu?" }
    },
    {
      title: "不 vs. 没 — duas negações, dois tempos",
      explanation: "不 (bù) nega o presente e o futuro — o que não é ou não vai ser. 没 (méi) nega o passado — o que não aconteceu. Uma exceção importante: o verbo 是 nunca é negado com 没, sempre com 不, mesmo falando do passado.",
      table: [
        { label: "Presente/futuro (不)", pt: "Hoje à noite eu não vou beber", cn: "今天晚上我不喝酒 (jīntiān wǎnshang wǒ bù hē jiǔ)" },
        { label: "Passado (没)", pt: "Ontem eu não fui trabalhar", cn: "昨天我没有去工作 (zuótiān wǒ méiyǒu qù gōngzuò)" }
      ],
      courseExample: { p: "Jīntiān wǎnshang wǒ bù hē jiǔ.", c: "今天晚上我不喝酒。", t: "Hoje à noite eu não vou beber." }
    }
  ],

  18: [
    {
      title: "谁 (shéi) — perguntando \"quem\"",
      explanation: "谁 (shéi) pergunta sobre uma pessoa, ocupando o mesmo lugar na frase que a resposta ocuparia — se a resposta é \"eu\" no início da frase, 谁 também vai no início.",
      table: [
        { pt: "Quem é você?", cn: "你是谁？(nǐ shì shéi?)" },
        { pt: "Quem vai vir?", cn: "谁会来？(shéi huì lái?)" }
      ],
      courseExample: { p: "Nǐ shì shéi?", c: "你是谁？", t: "Quem é você?" }
    },
    {
      title: "为什么 (wèishénme) e 因为 (yīnwèi) — perguntar e responder \"por quê\"",
      explanation: "为什么 (wèishénme) pergunta \"por quê\", geralmente antes do verbo. A resposta costuma começar com 因为 (yīnwèi), \"porque\" — o par funciona de forma bem parecida ao português.",
      table: [
        { pt: "Por que você não vai?", cn: "你为什么不去？(nǐ wèishénme bú qù?)" },
        { pt: "Porque eu estou ocupado", cn: "因为我很忙 (yīnwèi wǒ hěn máng)" }
      ],
      courseExample: { p: "Nǐ wèishénme bù qù?", c: "你为什么不去？", t: "Por que você não vai?" }
    },
    {
      title: "在 + Lugar + Verbo — localização da ação",
      explanation: "Quando se quer dizer onde uma ação acontece (não só onde algo está parado), 在 + Lugar vem antes do verbo — diferente de quando 在 sozinho indica só a posição de algo.",
      table: [
        { pt: "Eu trabalho em Xangai", cn: "我在上海工作 (wǒ zài Shànghǎi gōngzuò)" },
        { pt: "Ela estuda na escola", cn: "她在学校学习 (tā zài xuéxiào xuéxí)" }
      ],
      courseExample: { p: "Wǒ zài Shànghǎi gōngzuò.", c: "我在上海工作。", t: "Eu trabalho em Xangai." }
    },
    {
      title: "Lugar + 有 + Objeto — dizendo o que existe num lugar",
      explanation: "Para dizer que algo existe em determinado lugar (\"aqui tem café\"), a estrutura é: Lugar + 有 + Objeto — bem diferente da ordem em português, onde o lugar viria depois.",
      table: [
        { pt: "Aqui tem um pouco de café", cn: "这里有一些咖啡 (zhèlǐ yǒu yìxiē kāfēi)" },
        { pt: "A escola tem muitos alunos", cn: "学校有很多学生 (xuéxiào yǒu hěn duō xuésheng)" }
      ],
      courseExample: { p: "Zhèlǐ yǒu yìxiē kāfēi.", c: "这里有一些咖啡。", t: "Aqui tem um pouco de café." }
    },
    {
      title: "一些 (yìxiē) — \"alguns\" ou \"um pouco de\"",
      explanation: "一些 (yìxiē) indica uma quantidade pequena e não específica de algo — equivale a \"alguns\" (para coisas contáveis) ou \"um pouco de\" (para coisas não-contáveis como líquidos).",
      table: [
        { pt: "um pouco de café", cn: "一些咖啡 (yìxiē kāfēi)" },
        { pt: "alguns livros", cn: "一些书 (yìxiē shū)" }
      ],
      courseExample: { p: "Zhèlǐ yǒu yìxiē kāfēi.", c: "这里有一些咖啡。", t: "Aqui tem um pouco de café." }
    },
    {
      title: "Posse próxima sem 的",
      explanation: "Para relações pessoais muito próximas (família, namorado(a)), o chinês às vezes omite o 的 que normalmente marcaria posse — \"minha namorada\" pode ser dito diretamente como \"eu namorada\", sem o 的 no meio.",
      table: [
        { pt: "minha namorada", cn: "我女朋友 (wǒ nǚpéngyou)" },
        { pt: "meu namorado", cn: "我男朋友 (wǒ nánpéngyou)" }
      ],
      courseExample: { p: "Zhè shì wǒ nǚpéngyou.", c: "这是我女朋友。", t: "Essa é minha namorada." }
    }
  ]
};
