// HISTÓRIAS do curso de chinês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/zh-pt-BR/layer.js (português) e zh/content.en.js (inglês).
// Linhas em hanzi (c) e pinyin (p), falantes (spk, nomes próprios), índice da resposta certa (correctIndex).
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/zh-<arquivo>.js.txt.

const STORIES = [
  {
    "id": 1,
    "afterUnit": 5,
    "coversUnits": [1, 2, 3, 4, 5],
    "icon": "🏠",
    "beats": [
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Nǐ hǎo, Brune!", "c": "你好，Brune！" },
          { "spk": "Brune", "p": "Nǐ hǎo! Zǎo shang hǎo!", "c": "你好！早上好！" },
          { "spk": "Xiǎo Lǐ", "p": "Zhè shì wǒ bàba.", "c": "这是我爸爸。" }
        ],
        "question": { "correctIndex": 1 }
      },
      {
        "lines": [
          { "spk": "Bàba", "p": "Nǐ hǎo! Nǐ shì nǎ guó rén?", "c": "你好！你是哪国人？" },
          { "spk": "Brune", "p": "Wǒ shì Bāxī rén.", "c": "我是巴西人。" },
          { "spk": "Bàba", "p": "Bāxī! Hǎo!", "c": "巴西！好！" }
        ]
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Zhè shì wǒ jiějie.", "c": "这是我姐姐。" },
          { "spk": "Brune", "p": "Nǐ hǎo! Nǐ duō dà?", "c": "你好！你多大？" },
          { "spk": "Jiějie", "p": "Wǒ sān shí suì. Nǐ ne?", "c": "我三十岁。你呢？" },
          { "spk": "Brune", "p": "Wǒ èr shí bā suì.", "c": "我二十八岁。" }
        ],
        "question": { "correctIndex": 1 }
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Nǐ jiā yǒu jǐ kǒu rén, Brune?", "c": "你家有几口人，Brune？" },
          { "spk": "Brune", "p": "Wǒ jiā yǒu bàba, māma hé wǒ.", "c": "我家有爸爸，妈妈和我。" },
          { "spk": "Xiǎo Lǐ", "p": "Nǐ yǒu jiějie ma?", "c": "你有姐姐吗？" },
          { "spk": "Brune", "p": "Méiyǒu. Wǒ yǒu yí gè gēge.", "c": "没有。我有一个哥哥。" }
        ]
      },
      {
        "lines": [
          { "spk": "Māma", "p": "Brune, nǐ yào chī shénme?", "c": "Brune，你要吃什么？" },
          { "spk": "Brune", "p": "Wǒ yào chī mǐfàn. Zhège hěn hǎo chī!", "c": "我要吃米饭。这个很好吃！" },
          { "spk": "Māma", "p": "Nǐ yào hē chá ma?", "c": "你要喝茶吗？" },
          { "spk": "Brune", "p": "Yào! Wǒ xǐhuan hē chá.", "c": "要！我喜欢喝茶。" }
        ],
        "question": { "correctIndex": 2 }
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Xiè xiè nǐ, Brune!", "c": "谢谢你，Brune！" },
          { "spk": "Brune", "p": "Bú kè qi! Zài jiàn!", "c": "不客气！再见！" },
          { "spk": "Xiǎo Lǐ", "p": "Zài jiàn!", "c": "再见！" }
        ]
      }
    ]
  },
  {
    "id": 2,
    "afterUnit": 10,
    "coversUnits": [6, 7, 8, 9, 10],
    "icon": "🚇",
    "beats": [
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Brune, nǐ měitiān jǐ diǎn qǐchuáng?", "c": "Brune，你每天几点起床？" },
          { "spk": "Brune", "p": "Wǒ měitiān qī diǎn qǐchuáng, jiǔ diǎn shàngbān.", "c": "我每天七点起床，九点上班。" },
          { "spk": "Xiǎo Lǐ", "p": "Jīntiān nǐ jǐ diǎn xiàbān?", "c": "今天你几点下班？" },
          { "spk": "Brune", "p": "Xiànzài! Wǒ xiàbān le.", "c": "现在！我下班了。" }
        ],
        "question": { "correctIndex": 2 }
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Nǐ yào mǎi yīfu ma?", "c": "你要买衣服吗？" },
          { "spk": "Brune", "p": "Yào! Zài nǎlǐ?", "c": "要！在哪里？" },
          { "spk": "Xiǎo Lǐ", "p": "Zài qiánmiàn, zuǒbiān. Lí zhèlǐ hěn jìn.", "c": "在前面，左边。离这里很近。" }
        ]
      },
      {
        "lines": [
          { "spk": "Brune", "p": "Zhège duōshao qián?", "c": "这个多少钱？" },
          { "spk": "Màijiā", "p": "Sān shí kuài.", "c": "三十块。" },
          { "spk": "Brune", "p": "Tài guì le! Piányi yìdiǎn ba.", "c": "太贵了！便宜一点吧。" },
          { "spk": "Màijiā", "p": "Hǎo ba, èr shí kuài.", "c": "好吧，二十块。" }
        ],
        "question": { "correctIndex": 2 }
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Jīntiān tiānqì zěnmeyàng?", "c": "今天天气怎么样？" },
          { "spk": "Brune", "p": "Jīntiān hěn rè, qíngtiān.", "c": "今天很热，晴天。" },
          { "spk": "Xiǎo Lǐ", "p": "Míngtiān ne?", "c": "明天呢？" },
          { "spk": "Brune", "p": "Míngtiān huì xià yǔ, yǒu diǎn lěng.", "c": "明天会下雨，有点冷。" }
        ]
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Xiànzài zěnme qù chēzhàn?", "c": "现在怎么去车站？" },
          { "spk": "Brune", "p": "Zǒu lù ma?", "c": "走路吗？" },
          { "spk": "Xiǎo Lǐ", "p": "Bù, tài yuǎn le. Zuò dìtiě ba.", "c": "不，太远了。坐地铁吧。" },
          { "spk": "Brune", "p": "Hǎo de! Dìtiě zhàn zài nǎlǐ?", "c": "好的！地铁站在哪里？" }
        ],
        "question": { "correctIndex": 3 }
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Zài qiánmiàn, hěn jìn.", "c": "在前面，很近。" },
          { "spk": "Brune", "p": "Tài hǎo le! Jīntiān hěn hǎo.", "c": "太好了！今天很好。" },
          { "spk": "Xiǎo Lǐ", "p": "Zài jiàn, Brune!", "c": "再见，Brune！" },
          { "spk": "Brune", "p": "Zài jiàn!", "c": "再见！" }
        ]
      }
    ]
  },
  {
    "id": 3,
    "afterUnit": 14,
    "coversUnits": [11, 12, 13, 14],
    "icon": "🩺",
    "beats": [
      {
        "lines": [
          { "spk": "Brune", "p": "Xiǎo Lǐ, nǐ zěnme le?", "c": "小李，你怎么了？" },
          { "spk": "Xiǎo Lǐ", "p": "Wǒ bù shūfu, tóu hěn téng.", "c": "我不舒服，头很疼。" },
          { "spk": "Brune", "p": "Nǐ yào qù yīyuàn ma?", "c": "你要去医院吗？" },
          { "spk": "Xiǎo Lǐ", "p": "Yào. Yīyuàn lí zhèlǐ yuǎn ma?", "c": "要。医院离这里远吗？" }
        ],
        "question": { "correctIndex": 1 }
      },
      {
        "lines": [
          { "spk": "Brune", "p": "Bù yuǎn, hěn jìn.", "c": "不远，很近。" },
          { "spk": "Xiǎo Lǐ", "p": "Xiè xiè nǐ, Brune.", "c": "谢谢你，Brune。" },
          { "spk": "Brune", "p": "Bú kè qi! Nǐ xiànzài hǎo diǎn ma?", "c": "不客气！你现在好点吗？" }
        ]
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Hǎo diǎn le. Nǐ de àihào shì shénme?", "c": "好点了。你的爱好是什么？" },
          { "spk": "Brune", "p": "Wǒ xǐhuan kàn diànyǐng hé tiàowǔ. Nǐ ne?", "c": "我喜欢看电影和跳舞。你呢？" },
          { "spk": "Xiǎo Lǐ", "p": "Wǒ xǐhuan yùndòng, dànshì xiànzài bù hǎo.", "c": "我喜欢运动，但是现在不好。" }
        ],
        "question": { "correctIndex": 2 }
      },
      {
        "lines": [
          { "spk": "Brune", "p": "Nǐ xià ge xīngqī yǒu shénme jìhuà?", "c": "你下个星期有什么计划？" },
          { "spk": "Xiǎo Lǐ", "p": "Wǒ dǎsuàn zài jiā. Wǒ hái méi hǎo.", "c": "我打算在家。我还没好。" },
          { "spk": "Brune", "p": "Hǎo de. Nǐ yǐhòu yào qù yùndòng ma?", "c": "好的。你以后要去运动吗？" },
          { "spk": "Xiǎo Lǐ", "p": "Yào! Yùndòng bǐ kàn diànyǐng gèng hǎo.", "c": "要！运动比看电影更好。" }
        ],
        "question": { "correctIndex": 1 }
      },
      {
        "lines": [
          { "spk": "Brune", "p": "Nǐ juéde Zhōngwén nán ma?", "c": "你觉得中文难吗？" },
          { "spk": "Xiǎo Lǐ", "p": "Bù nán! Dànshì hěn yǒu yìsi.", "c": "不难！但是很有意思。" },
          { "spk": "Brune", "p": "Duì! Wǒ juéde Zhōngwén zuì yǒu yìsi.", "c": "对！我觉得中文最有意思。" }
        ]
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Xiè xiè nǐ jīntiān lái kàn wǒ.", "c": "谢谢你今天来看我。" },
          { "spk": "Brune", "p": "Bú kè qi! Zài jiàn!", "c": "不客气！再见！" },
          { "spk": "Xiǎo Lǐ", "p": "Xiè xiè! Zài jiàn.", "c": "谢谢！再见。" }
        ]
      }
    ]
  },
  {
    "id": 4,
    "afterUnit": 18,
    "coversUnits": [15, 16, 17, 18],
    "icon": "🎬",
    "beats": [
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Brune, wǒ xiǎng qù kàn diànyǐng. Nǐ néng lái ma?", "c": "Brune，我想去看电影。你能来吗？" },
          { "spk": "Brune", "p": "Néng! Jǐ diǎn?", "c": "能！几点？" },
          { "spk": "Xiǎo Lǐ", "p": "Xīngqī tiān wǎnshang qī diǎn, zài diànyǐngyuàn.", "c": "星期天晚上七点，在电影院。" }
        ],
        "question": { "correctIndex": 2 }
      },
      {
        "lines": [
          { "spk": "Brune", "p": "Hǎo de! Jīntiān xīngqī jǐ?", "c": "好的！今天星期几？" },
          { "spk": "Xiǎo Lǐ", "p": "Jīntiān xīngqī wǔ.", "c": "今天星期五。" },
          { "spk": "Brune", "p": "Hǎo, wǒ dōu yǒu kòng!", "c": "好，我都有空！" }
        ]
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Nǐ chī fàn le ma?", "c": "你吃饭了吗？" },
          { "spk": "Brune", "p": "Hái méi, wǒ hái zài gōngzuò.", "c": "还没，我还在工作。" },
          { "spk": "Xiǎo Lǐ", "p": "Wǒ chī le, wǒ chī le liǎng gè píngguǒ.", "c": "我吃了，我吃了两个苹果。" },
          { "spk": "Brune", "p": "Zuótiān wǒ méiyǒu chī wǎnfàn, jīntiān hěn è.", "c": "昨天我没有吃晚饭，今天很饿。" }
        ],
        "question": { "correctIndex": 1 }
      },
      {
        "lines": [
          {
            "spk": "Xiǎo Lǐ",
            "p": "Xīngqī tiān jiàn! Zhè shì wǒ de nǚpéngyou, tā yě yào lái.",
            "c": "星期天见！这是我的女朋友，她也要来。"
          },
          { "spk": "Brune", "p": "Tā shì shéi?", "c": "她是谁？" },
          { "spk": "Xiǎo Lǐ", "p": "Tā jiào Xiǎo Měi, tā shì xuésheng.", "c": "她叫小美，她是学生。" }
        ],
        "question": { "correctIndex": 1 }
      },
      {
        "lines": [
          { "spk": "Brune", "p": "Tā zài nǎlǐ xuéxí?", "c": "她在哪里学习？" },
          { "spk": "Xiǎo Lǐ", "p": "Tā zài xuéxiào xuéxí. Wèishénme?", "c": "她在学校学习。为什么？" },
          { "spk": "Brune", "p": "Yīnwèi wǒ yě xǐhuan xuéxí!", "c": "因为我也喜欢学习！" }
        ]
      },
      {
        "lines": [
          { "spk": "Xiǎo Lǐ", "p": "Xīngqī tiān jiàn, Brune!", "c": "星期天见，Brune！" },
          { "spk": "Brune", "p": "Hǎo de! Zài jiàn!", "c": "好的！再见！" },
          { "spk": "Xiǎo Lǐ", "p": "Zài jiàn!", "c": "再见！" }
        ]
      }
    ]
  }
];
