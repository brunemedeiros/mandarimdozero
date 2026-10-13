// Histórias-checkpoint — recombinam vocabulário de um grupo de unidades já
// estudadas numa situação nova (não repetição literal), com personagens
// recorrentes (Brune, Xiao Li — os mesmos já estabelecidos nos diálogos) e
// perguntas de compreensão intercaladas ao longo da leitura, não só no fim.
//
// Regra rígida: toda linha usa APENAS caracteres já ensinados (vocabulário,
// frases-modelo ou diálogo) nas unidades cobertas pela história — validado
// por script antes de finalizar, sem exceção.

// Nota: a História 4 usa "小美" (Xiao Mei, nome próprio) — o caractere 美
// isoladamente não é ensinado como vocabulário próprio até a Unidade 18,
// mas já aparece dentro de 美国 (América) desde a Unidade 2. Nomes próprios
// seguem o mesmo padrão já usado com "Brune" e "Xiao Li": não são
// "vocabulário novo" no sentido pedagógico, só rótulos de personagem.
const STORIES = [
  {
    id: 1,
    afterUnit: 5, // desbloqueia ao completar a Unidade 5
    coversUnits: [1, 2, 3, 4, 5],
    title: "A família de Xiao Li",
    subtitle: "Revendo Unidades 1-5",
    icon: "🏠",
    beats: [
      {
        lines: [
          { spk: "Xiǎo Lǐ", p: "Nǐ hǎo, Brune!", c: "你好，Brune！", t: "Olá, Brune!" },
          { spk: "Brune", p: "Nǐ hǎo! Zǎo shang hǎo!", c: "你好！早上好！", t: "Olá! Bom dia!" },
          { spk: "Xiǎo Lǐ", p: "Zhè shì wǒ bàba.", c: "这是我爸爸。", t: "Este é meu pai." }
        ],
        question: {
          prompt: "Quem é apresentado nesta parte?",
          options: ["A mãe de Xiao Li", "O pai de Xiao Li", "A irmã de Xiao Li", "Um amigo de Brune"],
          correctIndex: 1
        }
      },
      {
        lines: [
          { spk: "Bàba", p: "Nǐ hǎo! Nǐ shì nǎ guó rén?", c: "你好！你是哪国人？", t: "Olá! De que país você é?" },
          { spk: "Brune", p: "Wǒ shì Bāxī rén.", c: "我是巴西人。", t: "Eu sou brasileira." },
          { spk: "Bàba", p: "Bāxī! Hǎo!", c: "巴西！好！", t: "Brasil! Legal!" }
        ]
      },
      {
        lines: [
          { spk: "Xiǎo Lǐ", p: "Zhè shì wǒ jiějie.", c: "这是我姐姐。", t: "Esta é minha irmã mais velha." },
          { spk: "Brune", p: "Nǐ hǎo! Nǐ duō dà?", c: "你好！你多大？", t: "Olá! Quantos anos você tem?" },
          { spk: "Jiějie", p: "Wǒ sān shí suì. Nǐ ne?", c: "我三十岁。你呢？", t: "Eu tenho 30 anos. E você?" },
          { spk: "Brune", p: "Wǒ èr shí bā suì.", c: "我二十八岁。", t: "Eu tenho 28 anos." }
        ],
        question: {
          prompt: "Quantos anos a irmã de Xiao Li tem?",
          options: ["28 anos", "30 anos", "18 anos", "13 anos"],
          correctIndex: 1
        }
      },
      {
        lines: [
          { spk: "Xiǎo Lǐ", p: "Nǐ jiā yǒu jǐ kǒu rén, Brune?", c: "你家有几口人，Brune？", t: "Quantas pessoas há na sua família, Brune?" },
          { spk: "Brune", p: "Wǒ jiā yǒu bàba, māma hé wǒ.", c: "我家有爸爸，妈妈和我。", t: "Minha família tem pai, mãe e eu." },
          { spk: "Xiǎo Lǐ", p: "Nǐ yǒu jiějie ma?", c: "你有姐姐吗？", t: "Você tem irmã mais velha?" },
          { spk: "Brune", p: "Méiyǒu. Wǒ yǒu yí gè gēge.", c: "没有。我有一个哥哥。", t: "Não tenho. Eu tenho um irmão mais velho." }
        ]
      },
      {
        lines: [
          { spk: "Māma", p: "Brune, nǐ yào chī shénme?", c: "Brune，你要吃什么？", t: "Brune, o que você quer comer?" },
          { spk: "Brune", p: "Wǒ yào chī mǐfàn. Zhège hěn hǎo chī!", c: "我要吃米饭。这个很好吃！", t: "Eu quero comer arroz. Isso está muito gostoso!" },
          { spk: "Māma", p: "Nǐ yào hē chá ma?", c: "你要喝茶吗？", t: "Você quer beber chá?" },
          { spk: "Brune", p: "Yào! Wǒ xǐhuan hē chá.", c: "要！我喜欢喝茶。", t: "Quero! Eu gosto de beber chá." }
        ],
        question: {
          prompt: "O que Brune quer comer?",
          options: ["Macarrão", "Café", "Arroz", "Água"],
          correctIndex: 2
        }
      },
      {
        lines: [
          { spk: "Xiǎo Lǐ", p: "Xiè xiè nǐ, Brune!", c: "谢谢你，Brune！", t: "Obrigado, Brune!" },
          { spk: "Brune", p: "Bú kè qi! Zài jiàn!", c: "不客气！再见！", t: "De nada! Tchau!" },
          { spk: "Xiǎo Lǐ", p: "Zài jiàn!", c: "再见！", t: "Tchau!" }
        ]
      }
    ]
  }
,
  {
  id: 2,
  afterUnit: 10,
  coversUnits: [6, 7, 8, 9, 10],
  title: "Um dia na cidade",
  subtitle: "Revendo Unidades 6-10",
  icon: "🚇",
  beats: [
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Brune, nǐ měitiān jǐ diǎn qǐchuáng?", c: "Brune，你每天几点起床？", t: "Brune, que horas você levanta todos os dias?" },
        { spk: "Brune", p: "Wǒ měitiān qī diǎn qǐchuáng, jiǔ diǎn shàngbān.", c: "我每天七点起床，九点上班。", t: "Eu levanto às 7h e vou trabalhar às 9h todos os dias." },
        { spk: "Xiǎo Lǐ", p: "Jīntiān nǐ jǐ diǎn xiàbān?", c: "今天你几点下班？", t: "Hoje você sai do trabalho que horas?" },
        { spk: "Brune", p: "Xiànzài! Wǒ xiàbān le.", c: "现在！我下班了。", t: "Agora! Eu já saí do trabalho." }
      ],
      question: {
        prompt: "A que horas Brune vai trabalhar?",
        options: ["7h", "8h", "9h", "5h"],
        correctIndex: 2
      }
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Nǐ yào mǎi yīfu ma?", c: "你要买衣服吗？", t: "Você quer comprar roupa?" },
        { spk: "Brune", p: "Yào! Zài nǎlǐ?", c: "要！在哪里？", t: "Quero! Onde fica?" },
        { spk: "Xiǎo Lǐ", p: "Zài qiánmiàn, zuǒbiān. Lí zhèlǐ hěn jìn.", c: "在前面，左边。离这里很近。", t: "Fica na frente, do lado esquerdo. Fica bem perto daqui." }
      ]
    },
    {
      lines: [
        { spk: "Brune", p: "Zhège duōshao qián?", c: "这个多少钱？", t: "Quanto custa isso?" },
        { spk: "Màijiā", p: "Sān shí kuài.", c: "三十块。", t: "30 yuans." },
        { spk: "Brune", p: "Tài guì le! Piányi yìdiǎn ba.", c: "太贵了！便宜一点吧。", t: "Está muito caro! Faz mais barato." },
        { spk: "Màijiā", p: "Hǎo ba, èr shí kuài.", c: "好吧，二十块。", t: "Tá bom, 20 yuans." }
      ],
      question: {
        prompt: "Por quanto Brune conseguiu comprar a roupa?",
        options: ["30 yuans", "25 yuans", "20 yuans", "15 yuans"],
        correctIndex: 2
      }
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Jīntiān tiānqì zěnmeyàng?", c: "今天天气怎么样？", t: "Como está o tempo hoje?" },
        { spk: "Brune", p: "Jīntiān hěn rè, qíngtiān.", c: "今天很热，晴天。", t: "Hoje está bem quente, ensolarado." },
        { spk: "Xiǎo Lǐ", p: "Míngtiān ne?", c: "明天呢？", t: "E amanhã?" },
        { spk: "Brune", p: "Míngtiān huì xià yǔ, yǒu diǎn lěng.", c: "明天会下雨，有点冷。", t: "Amanhã vai chover, vai estar meio frio." }
      ]
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Xiànzài zěnme qù chēzhàn?", c: "现在怎么去车站？", t: "Agora, como se vai até a estação?" },
        { spk: "Brune", p: "Zǒu lù ma?", c: "走路吗？", t: "A pé?" },
        { spk: "Xiǎo Lǐ", p: "Bù, tài yuǎn le. Zuò dìtiě ba.", c: "不，太远了。坐地铁吧。", t: "Não, é muito longe. Vamos de metrô." },
        { spk: "Brune", p: "Hǎo de! Dìtiě zhàn zài nǎlǐ?", c: "好的！地铁站在哪里？", t: "Combinado! Onde fica a estação de metrô?" }
      ],
      question: {
        prompt: "Como eles decidem ir até a estação?",
        options: ["A pé", "De ônibus", "De táxi", "De metrô"],
        correctIndex: 3
      }
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Zài qiánmiàn, hěn jìn.", c: "在前面，很近。", t: "Fica na frente, bem perto." },
        { spk: "Brune", p: "Tài hǎo le! Jīntiān hěn hǎo.", c: "太好了！今天很好。", t: "Ótimo! Hoje foi muito bom." },
        { spk: "Xiǎo Lǐ", p: "Zài jiàn, Brune!", c: "再见，Brune！", t: "Tchau, Brune!" },
        { spk: "Brune", p: "Zài jiàn!", c: "再见！", t: "Tchau!" }
      ]
    }
  ]
},
  {
  id: 3,
  afterUnit: 14,
  coversUnits: [11, 12, 13, 14],
  title: "Xiao Li não está bem",
  subtitle: "Revendo Unidades 11-14",
  icon: "🩺",
  beats: [
    {
      lines: [
        { spk: "Brune", p: "Xiǎo Lǐ, nǐ zěnme le?", c: "小李，你怎么了？", t: "Xiao Li, o que houve com você?" },
        { spk: "Xiǎo Lǐ", p: "Wǒ bù shūfu, tóu hěn téng.", c: "我不舒服，头很疼。", t: "Não estou bem, minha cabeça está doendo muito." },
        { spk: "Brune", p: "Nǐ yào qù yīyuàn ma?", c: "你要去医院吗？", t: "Você quer ir ao hospital?" },
        { spk: "Xiǎo Lǐ", p: "Yào. Yīyuàn lí zhèlǐ yuǎn ma?", c: "要。医院离这里远吗？", t: "Quero. O hospital fica longe daqui?" }
      ],
      question: {
        prompt: "O que está doendo em Xiao Li?",
        options: ["A barriga", "A cabeça", "As costas", "Os pés"],
        correctIndex: 1
      }
    },
    {
      lines: [
        { spk: "Brune", p: "Bù yuǎn, hěn jìn.", c: "不远，很近。", t: "Não é longe, é bem perto." },
        { spk: "Xiǎo Lǐ", p: "Xiè xiè nǐ, Brune.", c: "谢谢你，Brune。", t: "Obrigado, Brune." },
        { spk: "Brune", p: "Bú kè qi! Nǐ xiànzài hǎo diǎn ma?", c: "不客气！你现在好点吗？", t: "De nada! Você está melhor agora?" }
      ]
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Hǎo diǎn le. Nǐ de àihào shì shénme?", c: "好点了。你的爱好是什么？", t: "Um pouco melhor. Qual é o seu hobby?" },
        { spk: "Brune", p: "Wǒ xǐhuan kàn diànyǐng hé tiàowǔ. Nǐ ne?", c: "我喜欢看电影和跳舞。你呢？", t: "Eu gosto de assistir filme e dançar. E você?" },
        { spk: "Xiǎo Lǐ", p: "Wǒ xǐhuan yùndòng, dànshì xiànzài bù hǎo.", c: "我喜欢运动，但是现在不好。", t: "Eu gosto de fazer exercício, mas agora não está bom (pra isso)." }
      ],
      question: {
        prompt: "Qual é o hobby de Xiao Li?",
        options: ["Assistir filme", "Dançar", "Fazer exercício", "Cantar"],
        correctIndex: 2
      }
    },
    {
      lines: [
        { spk: "Brune", p: "Nǐ xià ge xīngqī yǒu shénme jìhuà?", c: "你下个星期有什么计划？", t: "Quais são seus planos para semana que vem?" },
        { spk: "Xiǎo Lǐ", p: "Wǒ dǎsuàn zài jiā. Wǒ hái méi hǎo.", c: "我打算在家。我还没好。", t: "Eu pretendo ficar em casa. Eu ainda não estou bom." },
        { spk: "Brune", p: "Hǎo de. Nǐ yǐhòu yào qù yùndòng ma?", c: "好的。你以后要去运动吗？", t: "Certo. Você quer ir fazer exercício no futuro?" },
        { spk: "Xiǎo Lǐ", p: "Yào! Yùndòng bǐ kàn diànyǐng gèng hǎo.", c: "要！运动比看电影更好。", t: "Quero! Fazer exercício é ainda melhor que assistir filme." }
      ],
      question: {
        prompt: "O que Xiao Li acha que é melhor: exercício ou filme?",
        options: ["Filme", "Exercício", "Os dois são iguais", "Nenhum dos dois"],
        correctIndex: 1
      }
    },
    {
      lines: [
        { spk: "Brune", p: "Nǐ juéde Zhōngwén nán ma?", c: "你觉得中文难吗？", t: "Você acha o chinês difícil?" },
        { spk: "Xiǎo Lǐ", p: "Bù nán! Dànshì hěn yǒu yìsi.", c: "不难！但是很有意思。", t: "Não é difícil! Mas é bem interessante." },
        { spk: "Brune", p: "Duì! Wǒ juéde Zhōngwén zuì yǒu yìsi.", c: "对！我觉得中文最有意思。", t: "Certo! Eu acho que chinês é o mais interessante." }
      ]
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Xiè xiè nǐ jīntiān lái kàn wǒ.", c: "谢谢你今天来看我。", t: "Obrigado por vir me ver hoje." },
        { spk: "Brune", p: "Bú kè qi! Zài jiàn!", c: "不客气！再见！", t: "De nada! Tchau!" },
        { spk: "Xiǎo Lǐ", p: "Xiè xiè! Zài jiàn.", c: "谢谢！再见。", t: "Obrigado! Tchau." }
      ]
    }
  ]
},
  {
  id: 4,
  afterUnit: 18,
  coversUnits: [15, 16, 17, 18],
  title: "Convite para o cinema",
  subtitle: "Revendo Unidades 15-18 — o fim do HSK1!",
  icon: "🎬",
  beats: [
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Brune, wǒ xiǎng qù kàn diànyǐng. Nǐ néng lái ma?", c: "Brune，我想去看电影。你能来吗？", t: "Brune, eu quero ir ver um filme. Você consegue vir?" },
        { spk: "Brune", p: "Néng! Jǐ diǎn?", c: "能！几点？", t: "Consigo! Que horas?" },
        { spk: "Xiǎo Lǐ", p: "Xīngqī tiān wǎnshang qī diǎn, zài diànyǐngyuàn.", c: "星期天晚上七点，在电影院。", t: "Domingo às 7 da noite, no cinema." }
      ],
      question: {
        prompt: "Que dia da semana é o cinema?",
        options: ["Segunda-feira", "Sexta-feira", "Domingo", "Hoje"],
        correctIndex: 2
      }
    },
    {
      lines: [
        { spk: "Brune", p: "Hǎo de! Jīntiān xīngqī jǐ?", c: "好的！今天星期几？", t: "Combinado! Que dia da semana é hoje?" },
        { spk: "Xiǎo Lǐ", p: "Jīntiān xīngqī wǔ.", c: "今天星期五。", t: "Hoje é sexta-feira." },
        { spk: "Brune", p: "Hǎo, wǒ dōu yǒu kòng!", c: "好，我都有空！", t: "Ótimo, eu tenho tempo livre em ambos os dias!" }
      ]
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Nǐ chī fàn le ma?", c: "你吃饭了吗？", t: "Você já comeu?" },
        { spk: "Brune", p: "Hái méi, wǒ hái zài gōngzuò.", c: "还没，我还在工作。", t: "Ainda não, ainda estou trabalhando." },
        { spk: "Xiǎo Lǐ", p: "Wǒ chī le, wǒ chī le liǎng gè píngguǒ.", c: "我吃了，我吃了两个苹果。", t: "Eu já comi, comi duas maçãs." },
        { spk: "Brune", p: "Zuótiān wǒ méiyǒu chī wǎnfàn, jīntiān hěn è.", c: "昨天我没有吃晚饭，今天很饿。", t: "Ontem eu não jantei, hoje estou com muita fome." }
      ],
      question: {
        prompt: "O que Xiao Li já comeu?",
        options: ["Arroz", "Duas maçãs", "Macarrão", "Nada"],
        correctIndex: 1
      }
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Xīngqī tiān jiàn! Zhè shì wǒ de nǚpéngyou, tā yě yào lái.", c: "星期天见！这是我的女朋友，她也要来。", t: "Até domingo! Esta é minha namorada, ela também vai vir." },
        { spk: "Brune", p: "Tā shì shéi?", c: "她是谁？", t: "Quem é ela?" },
        { spk: "Xiǎo Lǐ", p: "Tā jiào Xiǎo Měi, tā shì xuésheng.", c: "她叫小美，她是学生。", t: "Ela se chama Xiao Mei, ela é estudante." }
      ],
      question: {
        prompt: "O que Xiao Mei faz?",
        options: ["Trabalha num hospital", "É estudante", "É médica", "Trabalha na escola"],
        correctIndex: 1
      }
    },
    {
      lines: [
        { spk: "Brune", p: "Tā zài nǎlǐ xuéxí?", c: "她在哪里学习？", t: "Onde ela estuda?" },
        { spk: "Xiǎo Lǐ", p: "Tā zài xuéxiào xuéxí. Wèishénme?", c: "她在学校学习。为什么？", t: "Ela estuda na escola. Por quê?" },
        { spk: "Brune", p: "Yīnwèi wǒ yě xǐhuan xuéxí!", c: "因为我也喜欢学习！", t: "Porque eu também gosto de estudar!" }
      ]
    },
    {
      lines: [
        { spk: "Xiǎo Lǐ", p: "Xīngqī tiān jiàn, Brune!", c: "星期天见，Brune！", t: "Até domingo, Brune!" },
        { spk: "Brune", p: "Hǎo de! Zài jiàn!", c: "好的！再见！", t: "Combinado! Tchau!" },
        { spk: "Xiǎo Lǐ", p: "Zài jiàn!", c: "再见！", t: "Tchau!" }
      ]
    }
  ]
}
];
