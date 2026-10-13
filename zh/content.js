// CONTEÚDO-BASE do curso de chinês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/zh-pt-BR/layer.js (português) e zh/content.en.js (inglês).
// Ids, hanzi (c), pinyin (p), tipos e ordem. Sozinho NÃO é exibível: a camada carrega logo depois e se aplica sobre ele.
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/zh-<arquivo>.js.txt.

const LEVELS = [
  { "id": "HSK1" }
];

const UNITS = [
  {
    "id": 1,
    "level": "HSK1",
    "lessons": [
      {
        "id": "cumprimentar",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "desculpas",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "saudacoes",
        "vocabIdx": [6, 7],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "duibuqi-vs-meiguanxi",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "对不起", "p": "duìbuqǐ" },
              { "c": "没关系", "p": "méi guānxi" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "bu-negation",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "我不懂", "p": "wǒ bù dǒng" },
              { "c": "不贵", "p": "bú guì" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zaijian-baibai",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 1 },
        "blocks": [
          {
            "examples": [
              { "c": "拜拜", "p": "bàibài" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "duibuqi-buhaoyisi",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "不好意思", "p": "bù hǎoyìsi" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zaoshang-hao-zao",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "早", "p": "zǎo" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "谢谢", "pinyin": "xièxiè", "emoji": "🎁", "answer": true }
    ],
    "vocab": [
      { "p": "nǐ hǎo", "c": "你好" },
      { "p": "zài jiàn", "c": "再见" },
      { "p": "xiè xiè", "c": "谢谢" },
      { "p": "bú kè qi", "c": "不客气" },
      { "p": "duì bu qǐ", "c": "对不起" },
      { "p": "méi guān xi", "c": "没关系" },
      { "p": "zǎo shang hǎo", "c": "早上好" },
      { "p": "wǎn shang hǎo", "c": "晚上好" }
    ],
    "phrases": [
      {
        "p": "Nǐ hǎo! Wǒ jiào {nome}.",
        "c": "你好！我叫{nome}。",
        "blocks": [
          { "p": "Nǐ hǎo!", "c": "你好！" },
          { "p": "Wǒ jiào", "c": "我叫" },
          { "p": "{nome}.", "c": "{nome}。" }
        ]
      },
      {
        "p": "Xiè xiè nǐ!",
        "c": "谢谢你！",
        "blocks": [
          { "p": "Xiè xiè", "c": "谢谢" },
          { "p": "nǐ!", "c": "你！" }
        ]
      },
      {
        "p": "Duì bu qǐ, wǒ bù dǒng.",
        "c": "对不起，我不懂。",
        "blocks": [
          { "p": "Duì bu qǐ,", "c": "对不起，" },
          { "p": "wǒ", "c": "我" },
          { "p": "bù dǒng.", "c": "不懂。" }
        ]
      },
      {
        "p": "Shì a! Wǒ yě shì.",
        "c": "是啊！我也是。",
        "blocks": [
          { "p": "Shì a!", "c": "是啊！" },
          { "p": "Wǒ yě", "c": "我也" },
          { "p": "shì.", "c": "是。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小李", "e": "🧑" },
        "B": { "n": "老王", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "谢谢！", "p": "Xièxie!" },
            { "c": "对不起！", "p": "Duìbuqǐ!" }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "不客气！", "p": "Bú kèqi!" },
            { "c": "早上好！", "p": "Zǎoshang hǎo!" }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ hǎo!", "c": "你好！" },
        { "p": "Nǐ hǎo! Zǎo shang hǎo.", "c": "你好！早上好。" },
        { "p": "Xiè xiè, zài jiàn!", "c": "谢谢，再见！" },
        { "p": "Zài jiàn!", "c": "再见！" }
      ]
    }
  },
  {
    "id": 2,
    "level": "HSK1",
    "lessons": [
      {
        "id": "nome",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "ser-pessoa",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "nacionalidade",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "shi",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "我是巴西人", "p": "wǒ shì Bāxī rén" }
            ]
          },
          {
            "examples": [
              { "c": "我叫Brune", "p": "wǒ jiào Brune" },
              { "c": "我是巴西人", "p": "wǒ shì Bāxī rén" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "svo-order",
        "trigger": { "afterVocabIdx": 9 },
        "blocks": [
          {
            "examples": [
              { "c": "你是哪国人？", "p": "nǐ shì nǎ guó rén?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "shi-drop-casual",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "我巴西人", "p": "wǒ Bāxī rén" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "ordem-nomes-sobrenome-primeiro",
        "kind": "culture",
        "category": "costume",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "小李", "p": "Xiǎo Lǐ" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "你叫什么名字？", "pinyin": "nǐ jiào shénme míngzi?", "emoji": "🙋", "answer": false }
    ],
    "vocab": [
      { "p": "wǒ", "c": "我" },
      { "p": "nǐ", "c": "你" },
      { "p": "jiào", "c": "叫" },
      { "p": "míngzi", "c": "名字" },
      { "p": "shì", "c": "是" },
      { "p": "rén", "c": "人" },
      { "p": "Bāxī", "c": "巴西" },
      { "p": "Zhōngguó", "c": "中国" },
      { "p": "nǎ", "c": "哪" },
      { "p": "guó", "c": "国" }
    ],
    "phrases": [
      {
        "p": "Nǐ jiào shénme míngzi?",
        "c": "你叫什么名字？",
        "blocks": [
          { "p": "Nǐ", "c": "你" },
          { "p": "jiào", "c": "叫" },
          { "p": "shénme míngzi?", "c": "什么名字？" }
        ]
      },
      {
        "p": "Wǒ shì {nacionalidade_p}.",
        "c": "我是{nacionalidade}。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "shì", "c": "是" },
          { "p": "{nacionalidade_p}.", "c": "{nacionalidade}。" }
        ]
      },
      {
        "p": "Nǐ shì nǎ guó rén?",
        "c": "你是哪国人？",
        "blocks": [
          { "p": "Nǐ", "c": "你" },
          { "p": "shì", "c": "是" },
          { "p": "nǎ guó rén?", "c": "哪国人？" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小李", "e": "🧑" },
        "B": { "n": "Brune", "e": "🙋‍♀️" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": [
            { "c": "我是中国人。", "p": "Wǒ shì Zhōngguó rén." },
            { "c": "我叫巴西。", "p": "Wǒ jiào Bāxī." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "我是巴西人。", "p": "Wǒ shì Bāxī rén." },
            { "c": "再见！", "p": "Zàijiàn!" }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ hǎo, nǐ jiào shénme míngzi?", "c": "你好，你叫什么名字？" },
        { "p": "Wǒ jiào Brune. Nǐ ne?", "c": "我叫Brune。你呢？" },
        { "p": "Wǒ jiào Xiǎo Lǐ. Nǐ shì nǎ guó rén?", "c": "我叫小李。你是哪国人？" },
        { "p": "Wǒ shì Bāxī rén.", "c": "我是巴西人。" }
      ]
    }
  },
  {
    "id": 3,
    "level": "HSK1",
    "lessons": [
      {
        "id": "numeros-1",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "numeros-2",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "numeros-3",
        "vocabIdx": [6, 7, 8]
      },
      {
        "id": "numeros-idade",
        "vocabIdx": [9, 10, 11]
      },
      {
        "id": "idade-altura",
        "vocabIdx": [12, 13],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "number-structure",
        "trigger": { "afterVocabIdx": 10 },
        "blocks": [
          {
            "examples": [
              { "c": "十一", "p": "shí yī" },
              { "c": "二十五", "p": "èr shí wǔ" }
            ]
          },
          {
            "examples": [
              { "c": "我二十八岁", "p": "wǒ èr shí bā suì" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "ji-vs-duo",
        "trigger": { "afterVocabIdx": 12 },
        "blocks": [
          {
            "examples": [
              { "c": "他多高？", "p": "tā duō gāo?" }
            ]
          },
          {
            "examples": [
              { "c": "你几岁？", "p": "nǐ jǐ suì?" },
              { "c": "你多大？", "p": "nǐ duō dà?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "xusui-ano-novo",
        "kind": "culture",
        "category": "festividade",
        "trigger": { "afterVocabIdx": 11 },
        "blocks": [
          {
            "examples": [
              { "c": "虚岁", "p": "xūsuì" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "si-numero-azarado",
        "kind": "culture",
        "category": "costume",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "四", "p": "sì" },
              { "c": "死", "p": "sǐ" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "líng", "c": "零" },
      { "p": "yī", "c": "一" },
      { "p": "èr", "c": "二" },
      { "p": "sān", "c": "三" },
      { "p": "sì", "c": "四" },
      { "p": "wǔ", "c": "五" },
      { "p": "liù", "c": "六" },
      { "p": "qī", "c": "七" },
      { "p": "bā", "c": "八" },
      { "p": "jiǔ", "c": "九" },
      { "p": "shí", "c": "十" },
      { "p": "suì", "c": "岁" },
      { "p": "duō dà", "c": "多大" },
      { "p": "gāo", "c": "高" }
    ],
    "phrases": [
      {
        "p": "Nǐ jǐ suì? / Nǐ duō dà?",
        "c": "你几岁？/ 你多大？",
        "blocks": [
          { "p": "Nǐ", "c": "你" },
          { "p": "jǐ suì?", "c": "几岁？" }
        ]
      },
      {
        "p": "Wǒ èr shí bā suì.",
        "c": "我二十八岁。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "èr shí bā", "c": "二十八" },
          { "p": "suì.", "c": "岁。" }
        ]
      },
      {
        "p": "Tā duō gāo?",
        "c": "他多高？",
        "blocks": [
          { "p": "Tā", "c": "他" },
          { "p": "duō gāo?", "c": "多高？" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小张", "e": "🧑" },
        "B": { "n": "小美", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "我是巴西人。", "p": "Wǒ shì Bāxī rén." },
            { "c": "我叫小李。", "p": "Wǒ jiào Xiǎo Lǐ." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "我很高。", "p": "Wǒ hěn gāo." },
            { "c": "谢谢！", "p": "Xièxie!" }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ duō dà?", "c": "你多大？" },
        { "p": "Wǒ èr shí bā suì. Nǐ ne?", "c": "我二十八岁。你呢？" },
        { "p": "Wǒ sān shí suì.", "c": "我三十岁。" }
      ]
    }
  },
  {
    "id": 4,
    "level": "HSK1",
    "lessons": [
      {
        "id": "pais",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "irmaos",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "ter-familia",
        "vocabIdx": [6, 7, 8]
      },
      {
        "id": "quantas-pessoas",
        "vocabIdx": [9, 10, 11],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "classifiers",
        "trigger": { "afterVocabIdx": 11 },
        "blocks": [
          {
            "examples": [
              { "c": "一个人", "p": "yí gè rén" },
              { "c": "一个姐姐", "p": "yí gè jiějie" }
            ]
          },
          {
            "examples": [
              { "c": "几口人？", "p": "jǐ kǒu rén?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "you",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "c": "我有一个姐姐。", "p": "Wǒ yǒu yí gè jiějie." }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "he",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "爸爸和妈妈", "p": "bàba hé māma" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "meiyou",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "我没有妹妹。", "p": "Wǒ méiyǒu mèimei." }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "politica-filho-unico-historia",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 7 },
        "blocks": [
          {
            "examples": [
              { "c": "孩子", "p": "háizi" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "jiā", "c": "家" },
      { "p": "bàba", "c": "爸爸" },
      { "p": "māma", "c": "妈妈" },
      { "p": "gēge", "c": "哥哥" },
      { "p": "dìdi", "c": "弟弟" },
      { "p": "jiějie", "c": "姐姐" },
      { "p": "mèimei", "c": "妹妹" },
      { "p": "háizi", "c": "孩子" },
      { "p": "yǒu", "c": "有" },
      { "p": "jǐ", "c": "几" },
      { "p": "yí gè jiějie", "c": "一个姐姐" },
      { "p": "jǐ kǒu rén", "c": "几口人" }
    ],
    "phrases": [
      {
        "p": "Nǐ jiā yǒu jǐ kǒu rén?",
        "c": "你家有几口人？",
        "blocks": [
          { "p": "Nǐ jiā", "c": "你家" },
          { "p": "yǒu", "c": "有" },
          { "p": "jǐ kǒu rén?", "c": "几口人？" }
        ]
      },
      {
        "p": "Wǒ yǒu yí gè jiějie.",
        "c": "我有一个姐姐。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "yǒu", "c": "有" },
          { "p": "yí gè jiějie.", "c": "一个姐姐。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小陈", "e": "👩" },
        "B": { "n": "小雨", "e": "🧑‍🦱" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": [
            { "c": "有，我有妹妹。", "p": "Yǒu, wǒ yǒu mèimei." },
            { "c": "我家有四口人。", "p": "Wǒ jiā yǒu sì kǒu rén." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "我家有三口人。", "p": "Wǒ jiā yǒu sān kǒu rén." },
            { "c": "我家有五口人。", "p": "Wǒ jiā yǒu wǔ kǒu rén." }
          ]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "p": "Nǐ jiā yǒu jǐ kǒu rén?", "c": "你家有几口人？" },
        { "p": "Wǒ jiā yǒu sì kǒu rén: bàba, māma, gēge hé wǒ.", "c": "我家有四口人：爸爸，妈妈，哥哥和我。" },
        { "p": "Nǐ yǒu mèimei ma?", "c": "你有妹妹吗？" },
        { "p": "Méiyǒu, wǒ méiyǒu mèimei.", "c": "没有，我没有妹妹。" }
      ]
    }
  },
  {
    "id": 5,
    "level": "HSK1",
    "lessons": [
      {
        "id": "comer-beber",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "pedir-comida",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "gostoso",
        "vocabIdx": [6, 7, 8]
      },
      {
        "id": "pedir-o-que-quer",
        "vocabIdx": [9, 10],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "hen-adjective",
        "trigger": { "afterVocabIdx": 7 },
        "blocks": [
          {
            "examples": [
              { "c": "这个很好吃", "p": "zhège hěn hǎochī" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "yao-xihuan",
        "trigger": { "afterVocabIdx": 10 },
        "blocks": [
          {
            "examples": [
              { "c": "我要一杯茶", "p": "wǒ yào yì bēi chá" }
            ]
          },
          {
            "examples": [
              { "c": "我喜欢喝咖啡", "p": "wǒ xǐhuan hē kāfēi" },
              { "c": "我要一杯茶", "p": "wǒ yào yì bēi chá" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "cha-origem-china",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "茶", "p": "chá" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "我要一杯茶。", "pinyin": "wǒ yào yì bēi chá.", "emoji": "☕", "answer": true }
    ],
    "vocab": [
      { "p": "chī", "c": "吃" },
      { "p": "hē", "c": "喝" },
      { "p": "mǐfàn", "c": "米饭" },
      { "p": "miàn", "c": "面" },
      { "p": "shuǐ", "c": "水" },
      { "p": "chá", "c": "茶" },
      { "p": "kāfēi", "c": "咖啡" },
      { "p": "hǎo chī", "c": "好吃" },
      { "p": "xǐhuan", "c": "喜欢" },
      { "p": "yào", "c": "要" },
      { "p": "yì bēi chá", "c": "一杯茶" }
    ],
    "phrases": [
      {
        "p": "Wǒ yào yì bēi chá.",
        "c": "我要一杯茶。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "yào", "c": "要" },
          { "p": "yì bēi chá.", "c": "一杯茶。" }
        ]
      },
      {
        "p": "Zhège hěn hǎo chī!",
        "c": "这个很好吃！",
        "blocks": [
          { "p": "Zhège", "c": "这个" },
          { "p": "hěn", "c": "很" },
          { "p": "hǎo chī!", "c": "好吃！" }
        ]
      },
      {
        "p": "Wǒ xǐhuan hē kāfēi.",
        "c": "我喜欢喝咖啡。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "xǐhuan", "c": "喜欢" },
          { "p": "hē kāfēi.", "c": "喝咖啡。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "Garçom": { "n": "服务员", "e": "🧑‍🍳" },
        "Brune": { "n": "Brune", "e": "🙋‍♀️" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "我喜欢咖啡。", "p": "Wǒ xǐhuan kāfēi." },
            { "c": "再见，谢谢。", "p": "Zàijiàn, xièxie." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "要，谢谢。我喜欢喝咖啡。", "p": "Yào, xièxie. Wǒ xǐhuan hē kāfēi." },
            { "c": "没关系，我不吃米饭。", "p": "Méi guānxi, wǒ bù chī mǐfàn." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ hǎo, nǐ yào chī shénme?", "c": "你好，你要吃什么？" },
        { "p": "Wǒ yào mǐfàn hé chá.", "c": "我要米饭和茶。" },
        { "p": "Hǎo de. Nǐ yào hē kāfēi ma?", "c": "好的。你要喝咖啡吗？" },
        { "p": "Bú yào, xièxiè. Wǒ xǐhuan hē chá.", "c": "不要，谢谢。我喜欢喝茶。" }
      ]
    }
  },
  {
    "id": 6,
    "level": "HSK1",
    "lessons": [
      {
        "id": "horas",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "rotina",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "presente",
        "vocabIdx": [6, 7, 8],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "dian-hours",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "七点", "p": "qī diǎn" },
              { "c": "现在几点？", "p": "xiànzài jǐ diǎn?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "fuso-horario-unico",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "北京时间", "p": "Běijīng shíjiān" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "time-before-verb",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "我每天七点起床", "p": "wǒ měitiān qī diǎn qǐchuáng" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zai-progressive",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "我正在吃饭", "p": "wǒ zhèngzài chī fàn" }
            ]
          },
          {
            "examples": [
              { "c": "我每天七点起床", "p": "wǒ měitiān qī diǎn qǐchuáng" },
              { "c": "现在几点？", "p": "xiànzài jǐ diǎn?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "diǎn", "c": "点" },
      { "p": "qǐchuáng", "c": "起床" },
      { "p": "shàngbān", "c": "上班" },
      { "p": "xiàbān", "c": "下班" },
      { "p": "shuìjiào", "c": "睡觉" },
      { "p": "měitiān", "c": "每天" },
      { "p": "xiànzài", "c": "现在" },
      { "p": "jīntiān", "c": "今天" },
      { "p": "méiyǒu", "c": "没有" }
    ],
    "phrases": [
      {
        "p": "Wǒ měitiān qī diǎn qǐchuáng.",
        "c": "我每天七点起床。",
        "blocks": [
          { "p": "Wǒ měitiān", "c": "我每天" },
          { "p": "qī diǎn", "c": "七点" },
          { "p": "qǐchuáng.", "c": "起床。" }
        ]
      },
      {
        "p": "Xiànzài jǐ diǎn?",
        "c": "现在几点？",
        "blocks": [
          { "p": "Xiànzài", "c": "现在" },
          { "p": "jǐ diǎn?", "c": "几点？" }
        ]
      },
      {
        "p": "Wǒ zhèngzài chī fàn.",
        "c": "我正在吃饭。",
        "blocks": [
          { "p": "Wǒ zhèngzài", "c": "我正在" },
          { "p": "chī fàn.", "c": "吃饭。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小刘", "e": "🧑" },
        "B": { "n": "小周", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": [
            { "c": "今天七点起床。", "p": "Jīntiān qī diǎn qǐchuáng." },
            { "c": "我每天八点上班。", "p": "Wǒ měitiān bā diǎn shàngbān." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "今天五点下班。", "p": "Jīntiān wǔ diǎn xiàbān." },
            { "c": "现在三点。", "p": "Xiànzài sān diǎn." }
          ]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "p": "Nǐ měitiān jǐ diǎn qǐchuáng?", "c": "你每天几点起床？" },
        { "p": "Wǒ měitiān qī diǎn qǐchuáng, bā diǎn shàngbān.", "c": "我每天七点起床，八点上班。" },
        { "p": "Jīntiān nǐ jǐ diǎn xiàbān?", "c": "今天你几点下班？" },
        { "p": "Jīntiān wǔ diǎn xiàbān.", "c": "今天五点下班。" }
      ]
    }
  },
  {
    "id": 7,
    "level": "HSK1",
    "lessons": [
      {
        "id": "onde-fica",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "direcoes",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "perto-longe",
        "vocabIdx": [6, 7, 8],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "zai-location",
        "trigger": { "afterVocabIdx": 1 },
        "blocks": [
          {
            "examples": [
              { "c": "厕所在哪里？", "p": "cèsuǒ zài nǎlǐ?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zai-vs-li",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "c": "厕所在哪里？", "p": "cèsuǒ zài nǎlǐ?" },
              { "c": "医院离这里很近", "p": "yīyuàn lí zhèlǐ hěn jìn" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "厕所在哪里？", "pinyin": "cèsuǒ zài nǎlǐ?", "emoji": "🚻", "answer": false }
    ],
    "vocab": [
      { "p": "zài", "c": "在" },
      { "p": "nǎlǐ", "c": "哪里" },
      { "p": "zuǒ", "c": "左" },
      { "p": "yòu", "c": "右" },
      { "p": "qiánmiàn", "c": "前面" },
      { "p": "hòumiàn", "c": "后面" },
      { "p": "lí", "c": "离" },
      { "p": "jìn", "c": "近" },
      { "p": "yuǎn", "c": "远" }
    ],
    "phrases": [
      {
        "p": "Cèsuǒ zài nǎlǐ?",
        "c": "厕所在哪里？",
        "blocks": [
          { "p": "Cèsuǒ", "c": "厕所" },
          { "p": "zài", "c": "在" },
          { "p": "nǎlǐ?", "c": "哪里？" }
        ]
      },
      {
        "p": "Yī yuàn lí zhèlǐ hěn jìn.",
        "c": "医院离这里很近。",
        "blocks": [
          { "p": "Yī yuàn", "c": "医院" },
          { "p": "lí zhèlǐ", "c": "离这里" },
          { "p": "hěn jìn.", "c": "很近。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小林", "e": "🧑" },
        "B": { "n": "王阿姨", "e": "👵" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": [
            { "c": "很远。", "p": "Hěn yuǎn." },
            { "c": "在后面，右边。", "p": "Zài hòumiàn, yòubiān." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "在后面，右边。", "p": "Zài hòumiàn, yòubiān." },
            { "c": "不远，很近。", "p": "Bù yuǎn, hěn jìn." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Duì bu qǐ, cèsuǒ zài nǎlǐ?", "c": "对不起，厕所在哪里？" },
        { "p": "Zài qiánmiàn, zuǒ biān.", "c": "在前面，左边。" },
        { "p": "Lí zhèlǐ yuǎn ma?", "c": "离这里远吗？" },
        { "p": "Bù yuǎn, hěn jìn.", "c": "不远，很近。" }
      ]
    }
  },
  {
    "id": 8,
    "level": "HSK1",
    "lessons": [
      {
        "id": "comprar-vender",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "dinheiro",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "caro-desconto",
        "vocabIdx": [6, 7, 8]
      },
      {
        "id": "roupas-sapatos",
        "vocabIdx": [9, 10],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "kuai-mao",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "五块三毛", "p": "wǔ kuài sān máo" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "kuai-mao-yuan-jiao",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "元", "p": "yuán" },
              { "c": "角", "p": "jiǎo" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "ba-particle",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "便宜一点吧", "p": "piányi yìdiǎn ba" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "classifiers-more",
        "trigger": { "afterVocabIdx": 9 },
        "blocks": [
          {
            "examples": [
              { "c": "一件衣服", "p": "yí jiàn yīfu" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "pechinchar-mercado",
        "kind": "culture",
        "category": "costume",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "便宜一点吧", "p": "piányi yìdiǎn ba" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "mǎi", "c": "买" },
      { "p": "mài", "c": "卖" },
      { "p": "duōshao qián", "c": "多少钱" },
      { "p": "kuài", "c": "块" },
      { "p": "máo", "c": "毛" },
      { "p": "piányi", "c": "便宜" },
      { "p": "guì", "c": "贵" },
      { "p": "zhège", "c": "这个" },
      { "p": "nàge", "c": "那个" },
      { "p": "yīfu", "c": "衣服" },
      { "p": "xié", "c": "鞋" }
    ],
    "phrases": [
      {
        "p": "Zhège duōshao qián?",
        "c": "这个多少钱？",
        "blocks": [
          { "p": "Zhège", "c": "这个" },
          { "p": "duōshao", "c": "多少" },
          { "p": "qián?", "c": "钱？" }
        ]
      },
      {
        "p": "Tài guì le! Piányi yìdiǎn ba.",
        "c": "太贵了！便宜一点吧。",
        "blocks": [
          { "p": "Tài guì le!", "c": "太贵了！" },
          { "p": "Piányi", "c": "便宜" },
          { "p": "yìdiǎn ba.", "c": "一点吧。" }
        ]
      },
      {
        "p": "Wǒ yào mǎi zhè jiàn yīfu.",
        "c": "我要买这件衣服。",
        "blocks": [
          { "p": "Wǒ yào", "c": "我要" },
          { "p": "mǎi", "c": "买" },
          { "p": "zhè jiàn yīfu.", "c": "这件衣服。" }
        ]
      },
      {
        "p": "Wǔ kuài sān máo.",
        "c": "五块三毛。",
        "blocks": [
          { "p": "Wǔ kuài", "c": "五块" },
          { "p": "sān máo.", "c": "三毛。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "Brune": { "n": "Brune", "e": "🙋‍♀️" },
        "Vendedor": { "n": "摊主", "e": "🧑‍🌾" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": [
            { "c": "不行，三十块。", "p": "Bù xíng, sān shí kuài." },
            { "c": "好吧，三十五块。", "p": "Hǎo ba, sān shí wǔ kuài." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "好吧，二十五块。", "p": "Hǎo ba, èr shí wǔ kuài." },
            { "c": "太贵了！", "p": "Tài guì le!" }
          ]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "p": "Zhège duōshao qián?", "c": "这个多少钱？" },
        { "p": "Sān shí kuài.", "c": "三十块。" },
        { "p": "Tài guì le! Piányi yìdiǎn ba.", "c": "太贵了！便宜一点吧。" },
        { "p": "Hǎo ba, èr shí wǔ kuài.", "c": "好吧，二十五块。" }
      ]
    }
  },
  {
    "id": 9,
    "level": "HSK1",
    "lessons": [
      {
        "id": "quente-frio",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "clima-geral",
        "vocabIdx": [3, 4, 5, 6],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "adjective-predicate",
        "trigger": { "afterVocabIdx": 1 },
        "blocks": [
          {
            "examples": [
              { "c": "今天很热", "p": "jīntiān hěn rè" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "buta-not-very",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "今天不太冷", "p": "jīntiān bú tài lěng" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "hui-future-prediction",
        "trigger": { "afterVocabIdx": 3 },
        "blocks": [
          {
            "examples": [
              { "c": "明天会下雨", "p": "míngtiān huì xià yǔ" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "今天很热。", "pinyin": "jīntiān hěn rè.", "emoji": "☀️", "answer": false }
    ],
    "vocab": [
      { "p": "tiānqì", "c": "天气" },
      { "p": "rè", "c": "热" },
      { "p": "lěng", "c": "冷" },
      { "p": "xià yǔ", "c": "下雨" },
      { "p": "qíngtiān", "c": "晴天" },
      { "p": "yīntiān", "c": "阴天" },
      { "p": "fēng", "c": "风" }
    ],
    "phrases": [
      {
        "p": "Jīntiān tiānqì zěnmeyàng?",
        "c": "今天天气怎么样？",
        "blocks": [
          { "p": "Jīntiān", "c": "今天" },
          { "p": "tiānqì", "c": "天气" },
          { "p": "zěnmeyàng?", "c": "怎么样？" }
        ]
      },
      {
        "p": "Jīntiān hěn rè.",
        "c": "今天很热。",
        "blocks": [
          { "p": "Jīntiān", "c": "今天" },
          { "p": "hěn", "c": "很" },
          { "p": "rè.", "c": "热。" }
        ]
      },
      {
        "p": "Míngtiān huì xià yǔ.",
        "c": "明天会下雨。",
        "blocks": [
          { "p": "Míngtiān", "c": "明天" },
          { "p": "huì", "c": "会" },
          { "p": "xià yǔ.", "c": "下雨。" }
        ]
      },
      {
        "p": "Jīntiān bú tài lěng.",
        "c": "今天不太冷。",
        "blocks": [
          { "p": "Jīntiān", "c": "今天" },
          { "p": "bú tài", "c": "不太" },
          { "p": "lěng.", "c": "冷。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小马", "e": "🧑" },
        "B": { "n": "小杨", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "今天下雨，很冷。", "p": "Jīntiān xià yǔ, hěn lěng." },
            { "c": "明天会下雨。", "p": "Míngtiān huì xià yǔ." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "今天很热，晴天。", "p": "Jīntiān hěn rè, qíngtiān." },
            { "c": "明天很热。", "p": "Míngtiān hěn rè." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Jīntiān tiānqì zěnmeyàng?", "c": "今天天气怎么样？" },
        { "p": "Jīntiān hěn rè, qíngtiān.", "c": "今天很热，晴天。" },
        { "p": "Míngtiān ne?", "c": "明天呢？" },
        { "p": "Míngtiān huì xià yǔ, yǒu diǎn lěng.", "c": "明天会下雨，有点冷。" }
      ]
    }
  },
  {
    "id": 10,
    "level": "HSK1",
    "lessons": [
      {
        "id": "meios-transporte",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "como-chegar",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "passagem",
        "vocabIdx": [6, 7],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "zenme",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "去机场怎么去？", "p": "qù jīchǎng zěnme qù?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "qu-lai",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "我去机场", "p": "wǒ qù jīchǎng" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zoulu-vs-zuo",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "我坐地铁去", "p": "wǒ zuò dìtiě qù" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zuo-chuzuche-dache",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "打车", "p": "dǎchē" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "gōngjiāochē", "c": "公共汽车" },
      { "p": "dìtiě", "c": "地铁" },
      { "p": "chūzūchē", "c": "出租车" },
      { "p": "zǒu lù", "c": "走路" },
      { "p": "zěnme qù", "c": "怎么去" },
      { "p": "zhàn", "c": "站" },
      { "p": "piào", "c": "票" },
      { "p": "yì zhāng piào", "c": "一张票" }
    ],
    "phrases": [
      {
        "p": "Qù jīchǎng zěnme qù?",
        "c": "去机场怎么去？",
        "blocks": [
          { "p": "Qù jīchǎng", "c": "去机场" },
          { "p": "zěnme", "c": "怎么" },
          { "p": "qù?", "c": "去？" }
        ]
      },
      {
        "p": "Wǒ zuò dìtiě qù.",
        "c": "我坐地铁去。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "zuò dìtiě", "c": "坐地铁" },
          { "p": "qù.", "c": "去。" }
        ]
      },
      {
        "p": "Wǒ yào mǎi yì zhāng piào.",
        "c": "我要买一张票。",
        "blocks": [
          { "p": "Wǒ yào", "c": "我要" },
          { "p": "mǎi", "c": "买" },
          { "p": "yì zhāng piào.", "c": "一张票。" }
        ]
      },
      {
        "p": "Nǐ shì zěnme lái de?",
        "c": "你是怎么来的？",
        "blocks": [
          { "p": "Nǐ shì", "c": "你是" },
          { "p": "zěnme lái", "c": "怎么来" },
          { "p": "de?", "c": "的？" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小高", "e": "🧳" },
        "B": { "n": "前台", "e": "👩‍💼" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "我要一张票。", "p": "Wǒ yào yì zhāng piào." },
            { "c": "地铁站在前面。", "p": "Dìtiě zhàn zài qiánmiàn." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "在后面，很远。", "p": "Zài hòumiàn, hěn yuǎn." },
            { "c": "一张票。", "p": "Yì zhāng piào." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Qù jīchǎng zěnme qù?", "c": "去机场怎么去？" },
        { "p": "Nǐ kěyǐ zuò dìtiě huò chūzūchē.", "c": "你可以坐地铁或出租车。" },
        { "p": "Dìtiě zhàn zài nǎlǐ?", "c": "地铁站在哪里？" },
        { "p": "Zài qiánmiàn, hěn jìn.", "c": "在前面，很近。" }
      ]
    }
  },
  {
    "id": 11,
    "level": "HSK1",
    "lessons": [
      {
        "id": "partes-corpo",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "dor",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "ajuda-medica",
        "vocabIdx": [6, 7],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "teng",
        "trigger": { "afterVocabIdx": 3 },
        "blocks": [
          {
            "examples": [
              { "c": "我头疼", "p": "wǒ tóu téng" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "teng-vs-bushufu",
        "trigger": { "afterVocabIdx": 7 },
        "blocks": [
          {
            "examples": [
              { "c": "我头疼", "p": "wǒ tóu téng" },
              { "c": "我不舒服", "p": "wǒ bù shūfu" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "le-change-of-state",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "你怎么了？", "p": "nǐ zěnme le?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "我头疼。", "pinyin": "wǒ tóu téng.", "emoji": "🤕", "answer": true }
    ],
    "vocab": [
      { "p": "shēntǐ", "c": "身体" },
      { "p": "tóu", "c": "头" },
      { "p": "dùzi", "c": "肚子" },
      { "p": "téng", "c": "疼" },
      { "p": "shēngbìng", "c": "生病" },
      { "p": "yīshēng", "c": "医生" },
      { "p": "yīyuàn", "c": "医院" },
      { "p": "bù shūfu", "c": "不舒服" }
    ],
    "phrases": [
      {
        "p": "Wǒ tóu téng.",
        "c": "我头疼。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "tóu", "c": "头" },
          { "p": "téng.", "c": "疼。" }
        ]
      },
      {
        "p": "Wǒ bù shūfu.",
        "c": "我不舒服。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "bù", "c": "不" },
          { "p": "shūfu.", "c": "舒服。" }
        ]
      },
      {
        "p": "Wǒ xūyào kàn yīshēng.",
        "c": "我需要看医生。",
        "blocks": [
          { "p": "Wǒ xūyào", "c": "我需要" },
          { "p": "kàn", "c": "看" },
          { "p": "yīshēng.", "c": "医生。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小赵", "e": "🧑" },
        "B": { "n": "小孙", "e": "🤒" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "我很好，谢谢。", "p": "Wǒ hěn hǎo, xièxie." },
            { "c": "我去医院。", "p": "Wǒ qù yīyuàn." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "不用，谢谢。", "p": "Bú yòng, xièxie." },
            { "c": "我在医院工作。", "p": "Wǒ zài yīyuàn gōngzuò." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ zěnme le?", "c": "你怎么了？" },
        { "p": "Wǒ bù shūfu, tóu hěn téng.", "c": "我不舒服，头很疼。" },
        { "p": "Nǐ xūyào kàn yīshēng ma?", "c": "你需要看医生吗？" },
        { "p": "Shì de, yīyuàn lí zhèlǐ yuǎn ma?", "c": "是的，医院离这里远吗？" }
      ]
    }
  },
  {
    "id": 12,
    "level": "HSK1",
    "lessons": [
      {
        "id": "hobbies-leitura",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "atividades",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "dancar-tempo-livre",
        "vocabIdx": [6, 7],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "de-posse",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "你的爱好是什么？", "p": "nǐ de àihào shì shénme?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "kan-vs-ting",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "看书", "p": "kàn shū" },
              { "c": "听音乐", "p": "tīng yīnyuè" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "guangchangwu-danca-praca",
        "kind": "culture",
        "category": "costume",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "广场舞", "p": "guǎngchǎng wǔ" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "周末你有空吗？", "pinyin": "zhōumò nǐ yǒu kòng ma?", "emoji": "🎬", "answer": true }
    ],
    "vocab": [
      { "p": "àihào", "c": "爱好" },
      { "p": "kàn shū", "c": "看书" },
      { "p": "tīng yīnyuè", "c": "听音乐" },
      { "p": "kàn diànyǐng", "c": "看电影" },
      { "p": "yùndòng", "c": "运动" },
      { "p": "chàng gē", "c": "唱歌" },
      { "p": "tiàowǔ", "c": "跳舞" },
      { "p": "yǒu kòng", "c": "有空" }
    ],
    "phrases": [
      {
        "p": "Nǐ de àihào shì shénme?",
        "c": "你的爱好是什么？",
        "blocks": [
          { "p": "Nǐ de àihào", "c": "你的爱好" },
          { "p": "shì", "c": "是" },
          { "p": "shénme?", "c": "什么？" }
        ]
      },
      {
        "p": "Wǒ xǐhuan kàn shū hé tīng yīnyuè.",
        "c": "我喜欢看书和听音乐。",
        "blocks": [
          { "p": "Wǒ xǐhuan", "c": "我喜欢" },
          { "p": "kàn shū hé", "c": "看书和" },
          { "p": "tīng yīnyuè.", "c": "听音乐。" }
        ]
      },
      {
        "p": "Zhōumò nǐ yǒu kòng ma?",
        "c": "周末你有空吗？",
        "blocks": [
          { "p": "Zhōumò", "c": "周末" },
          { "p": "nǐ yǒu kòng", "c": "你有空" },
          { "p": "ma?", "c": "吗？" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小吴", "e": "🧑" },
        "B": { "n": "小郑", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "有空！我们去看电影吧。", "p": "Yǒu kòng! Wǒmen qù kàn diànyǐng ba." },
            { "c": "再见，周末见！", "p": "Zàijiàn, zhōumò jiàn!" }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "我喜欢看电影和跳舞。", "p": "Wǒ xǐhuan kàn diànyǐng hé tiàowǔ." },
            { "c": "我的爱好是什么？", "p": "Wǒ de àihào shì shénme?" }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ de àihào shì shénme?", "c": "你的爱好是什么？" },
        { "p": "Wǒ xǐhuan kàn diànyǐng hé tiàowǔ. Nǐ ne?", "c": "我喜欢看电影和跳舞。你呢？" },
        { "p": "Wǒ xǐhuan yùndòng. Zhōumò nǐ yǒu kòng ma?", "c": "我喜欢运动。周末你有空吗？" },
        { "p": "Yǒu kòng! Wǒmen qù kàn diànyǐng ba.", "c": "有空！我们去看电影吧。" }
      ]
    }
  },
  {
    "id": 13,
    "level": "HSK1",
    "lessons": [
      {
        "id": "planos",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "viagem-estudo",
        "vocabIdx": [3, 4, 5, 6],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "dasuan",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "我打算学中文", "p": "wǒ dǎsuàn xué Zhōngwén" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "yihou",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "我以后要去中国旅游", "p": "wǒ yǐhòu yào qù Zhōngguó lǚyóu" }
            ]
          },
          {
            "examples": [
              { "c": "我打算学中文", "p": "wǒ dǎsuàn xué Zhōngwén" },
              { "c": "我以后要去中国旅游", "p": "wǒ yǐhòu yào qù Zhōngguó lǚyóu" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "dǎsuàn", "c": "打算" },
      { "p": "míngtiān", "c": "明天" },
      { "p": "xià ge xīngqī", "c": "下个星期" },
      { "p": "lǚyóu", "c": "旅游" },
      { "p": "xuéxí", "c": "学习" },
      { "p": "jìhuà", "c": "计划" },
      { "p": "yǐhòu", "c": "以后" }
    ],
    "phrases": [
      {
        "p": "Nǐ míngtiān yǒu shénme jìhuà?",
        "c": "你明天有什么计划？",
        "blocks": [
          { "p": "Nǐ míngtiān", "c": "你明天" },
          { "p": "yǒu shénme", "c": "有什么" },
          { "p": "jìhuà?", "c": "计划？" }
        ]
      },
      {
        "p": "Wǒ dǎsuàn xué Zhōngwén.",
        "c": "我打算学中文。",
        "blocks": [
          { "p": "Wǒ dǎsuàn", "c": "我打算" },
          { "p": "xué", "c": "学" },
          { "p": "Zhōngwén.", "c": "中文。" }
        ]
      },
      {
        "p": "Wǒ yǐhòu yào qù Zhōngguó lǚyóu.",
        "c": "我以后要去中国旅游。",
        "blocks": [
          { "p": "Wǒ yǐhòu", "c": "我以后" },
          { "p": "yào qù", "c": "要去" },
          { "p": "Zhōngguó lǚyóu.", "c": "中国旅游。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小冯", "e": "👩" },
        "B": { "n": "小韩", "e": "🧑" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "我昨天学习了。", "p": "Wǒ zuótiān xuéxí le." },
            { "c": "我很好，谢谢。", "p": "Wǒ hěn hǎo, xièxie." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "不要，谢谢。", "p": "Bú yào, xièxie." },
            { "c": "我打算学习中文。", "p": "Wǒ dǎsuàn xuéxí Zhōngwén." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ xià ge xīngqī yǒu shénme jìhuà?", "c": "你下个星期有什么计划？" },
        { "p": "Wǒ dǎsuàn xuéxí Zhōngwén.", "c": "我打算学习中文。" },
        { "p": "Nǐ yǐhòu yào qù Zhōngguó ma?", "c": "你以后要去中国吗？" },
        { "p": "Yào! Wǒ yào qù Zhōngguó lǚyóu.", "c": "要！我要去中国旅游。" }
      ]
    }
  },
  {
    "id": 14,
    "level": "HSK1",
    "lessons": [
      {
        "id": "comparar",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "diferente-melhor",
        "vocabIdx": [3, 4, 5],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "bi-comparison",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "中文比法文难", "p": "Zhōngwén bǐ Fǎwén nán" }
            ]
          },
          {
            "examples": [
              { "c": "这个和那个一样", "p": "zhège hé nàge yíyàng" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "haishi",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "你要茶还是咖啡？", "p": "nǐ yào chá háishi kāfēi?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "bǐ", "c": "比" },
      { "p": "gèng", "c": "更" },
      { "p": "yíyàng", "c": "一样" },
      { "p": "bù yíyàng", "c": "不一样" },
      { "p": "zuì", "c": "最" },
      { "p": "háishi", "c": "还是" }
    ],
    "phrases": [
      {
        "p": "Zhōngwén bǐ Fǎwén nán.",
        "c": "中文比法文难。",
        "blocks": [
          { "p": "Zhōngwén", "c": "中文" },
          { "p": "bǐ Fǎwén", "c": "比法文" },
          { "p": "nán.", "c": "难。" }
        ]
      },
      {
        "p": "Zhège hé nàge yíyàng.",
        "c": "这个和那个一样。",
        "blocks": [
          { "p": "Zhège hé nàge", "c": "这个和那个" },
          { "p": "yíyàng.", "c": "一样。" }
        ]
      },
      {
        "p": "Nǐ juéde nǎge zuì hǎo?",
        "c": "你觉得哪个最好？",
        "blocks": [
          { "p": "Nǐ juéde", "c": "你觉得" },
          { "p": "nǎge", "c": "哪个" },
          { "p": "zuì hǎo?", "c": "最好？" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小曹", "e": "🧑" },
        "B": { "n": "小丁", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "法文比中文更难。", "p": "Fǎwén bǐ Zhōngwén gèng nán." },
            { "c": "中文很贵，但是很好吃。", "p": "Zhōngwén hěn guì, dànshì hěn hǎochī." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "不难。", "p": "Bù nán." },
            { "c": "谢谢，再见！", "p": "Xièxie, zàijiàn!" }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ juéde Zhōngwén nán ma?", "c": "你觉得中文难吗？" },
        { "p": "Zhōngwén bǐ Fǎwén gèng nán, dànshì hěn yǒu yìsi.", "c": "中文比法文更难，但是很有意思。" },
        { "p": "Nǐ juéde nǎge zuì nán? Zhōngwén háishi Yìdàlìwén?", "c": "你觉得哪个最难？中文还是意大利文？" },
        { "p": "Dāngrán shì Zhōngwén!", "c": "当然是中文！" }
      ]
    }
  },
  {
    "id": 15,
    "level": "HSK1",
    "lessons": [
      {
        "id": "saber-conseguir",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "pedidos",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "convite-cinema",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "hui-vs-neng",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "你会说中文吗？", "p": "nǐ huì shuō Zhōngwén ma?" },
              { "c": "你明天能来吗？", "p": "nǐ míngtiān néng lái ma?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "xiang-vs-yao",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "我想去看电影", "p": "wǒ xiǎng qù kàn diànyǐng" },
              { "c": "我要一杯茶", "p": "wǒ yào yì bēi chá" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "qing-please",
        "trigger": { "afterVocabIdx": 3 },
        "blocks": [
          {
            "examples": [
              { "c": "请坐", "p": "qǐng zuò" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "dou-all",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "c": "我们都想去", "p": "wǒmen dōu xiǎng qù" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "ye-also",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "我也想去", "p": "wǒ yě xiǎng qù" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "xiǎng", "c": "想" },
      { "p": "huì", "c": "会" },
      { "p": "néng", "c": "能" },
      { "p": "qǐng", "c": "请" },
      { "p": "zuò", "c": "坐" },
      { "p": "dōu", "c": "都" },
      { "p": "yě", "c": "也" },
      { "p": "shuō", "c": "说" },
      { "p": "lái", "c": "来" },
      { "p": "diànyǐngyuàn", "c": "电影院" }
    ],
    "phrases": [
      {
        "p": "Wǒ xiǎng qù kàn diànyǐng.",
        "c": "我想去看电影。",
        "blocks": [
          { "p": "Wǒ xiǎng", "c": "我想" },
          { "p": "qù kàn", "c": "去看" },
          { "p": "diànyǐng.", "c": "电影。" }
        ]
      },
      {
        "p": "Nǐ huì shuō Zhōngwén ma?",
        "c": "你会说中文吗？",
        "blocks": [
          { "p": "Nǐ huì", "c": "你会" },
          { "p": "shuō Zhōngwén", "c": "说中文" },
          { "p": "ma?", "c": "吗？" }
        ]
      },
      {
        "p": "Nǐ míngtiān néng lái ma?",
        "c": "你明天能来吗？",
        "blocks": [
          { "p": "Nǐ míngtiān", "c": "你明天" },
          { "p": "néng lái", "c": "能来" },
          { "p": "ma?", "c": "吗？" }
        ]
      },
      {
        "p": "Qǐng zuò.",
        "c": "请坐。",
        "blocks": [
          { "p": "Qǐng", "c": "请" },
          { "p": "zuò.", "c": "坐。" }
        ]
      },
      {
        "p": "Wǒmen dōu xiǎng qù.",
        "c": "我们都想去。",
        "blocks": [
          { "p": "Wǒmen dōu", "c": "我们都" },
          { "p": "xiǎng qù.", "c": "想去。" }
        ]
      },
      {
        "p": "Wǒ yě xiǎng qù.",
        "c": "我也想去。",
        "blocks": [
          { "p": "Wǒ yě", "c": "我也" },
          { "p": "xiǎng qù.", "c": "想去。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小彭", "e": "🧑" },
        "B": { "n": "小蔡", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "在电影院。", "p": "Zài diànyǐngyuàn." },
            { "c": "我叫小蔡。", "p": "Wǒ jiào Xiǎo Cài." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "我是巴西人。", "p": "Wǒ shì Bāxī rén." },
            { "c": "晚上七点。", "p": "Wǎnshang qī diǎn." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Wǒ xiǎng qù kàn diànyǐng, nǐ néng lái ma?", "c": "我想去看电影，你能来吗？" },
        { "p": "Néng! Jǐ diǎn?", "c": "能！几点？" },
        { "p": "Wǎnshang qī diǎn, zài diànyǐngyuàn.", "c": "晚上七点，在电影院。" },
        { "p": "Hǎo de, wǒ yě xiǎng kàn nà bù diànyǐng!", "c": "好的，我也想看那部电影！" }
      ]
    }
  },
  {
    "id": 16,
    "level": "HSK1",
    "lessons": [
      {
        "id": "dias-semana",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "data-completa",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "hora-encontro",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "weekdays",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "星期一", "p": "xīngqīyī" },
              { "c": "星期天", "p": "xīngqītiān" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "dates",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "c": "八月二十号", "p": "bā yuè èrshí hào" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "hao-vs-ri",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 3 },
        "blocks": [
          {
            "examples": [
              { "c": "八月二十日", "p": "bā yuè èrshí rì" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "hours-minutes",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "十一点十八分", "p": "shí yī diǎn shí bā fēn" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "yiqian-vs-yihou",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "c": "十点以前我在家", "p": "shí diǎn yǐqián wǒ zài jiā" },
              { "c": "十点以后我不在家", "p": "shí diǎn yǐhòu wǒ bú zài jiā" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "xīngqī", "c": "星期" },
      { "p": "xīngqīyī", "c": "星期一" },
      { "p": "xīngqītiān", "c": "星期天" },
      { "p": "hào", "c": "号" },
      { "p": "yuè", "c": "月" },
      { "p": "nián", "c": "年" },
      { "p": "fēn", "c": "分" },
      { "p": "yǐhòu", "c": "以后" },
      { "p": "yǐqián", "c": "以前" },
      { "p": "bǎi", "c": "百" }
    ],
    "phrases": [
      {
        "p": "Jīntiān xīngqī jǐ?",
        "c": "今天星期几？",
        "blocks": [
          { "p": "Jīntiān", "c": "今天" },
          { "p": "xīngqī jǐ?", "c": "星期几？" }
        ]
      },
      {
        "p": "Jīntiān xīngqīsān.",
        "c": "今天星期三。",
        "blocks": [
          { "p": "Jīntiān", "c": "今天" },
          { "p": "xīngqīsān.", "c": "星期三。" }
        ]
      },
      {
        "p": "Jīntiān bā yuè èrshí hào.",
        "c": "今天八月二十号。",
        "blocks": [
          { "p": "Jīntiān", "c": "今天" },
          { "p": "bā yuè", "c": "八月" },
          { "p": "èrshí hào.", "c": "二十号。" }
        ]
      },
      {
        "p": "Xiànzài shí yī diǎn shí bā fēn.",
        "c": "现在十一点十八分。",
        "blocks": [
          { "p": "Xiànzài", "c": "现在" },
          { "p": "shí yī diǎn", "c": "十一点" },
          { "p": "shí bā fēn.", "c": "十八分。" }
        ]
      },
      {
        "p": "Shí diǎn yǐqián wǒ zài jiā.",
        "c": "十点以前我在家。",
        "blocks": [
          { "p": "Shí diǎn yǐqián", "c": "十点以前" },
          { "p": "wǒ zài", "c": "我在" },
          { "p": "jiā.", "c": "家。" }
        ]
      },
      {
        "p": "Shí diǎn yǐhòu wǒ bú zài jiā.",
        "c": "十点以后我不在家。",
        "blocks": [
          { "p": "Shí diǎn yǐhòu", "c": "十点以后" },
          { "p": "wǒ bú zài", "c": "我不在" },
          { "p": "jiā.", "c": "家。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小罗", "e": "🧑" },
        "B": { "n": "小梁", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "今天星期天，八月五号。", "p": "Jīntiān xīngqītiān, bā yuè wǔ hào." },
            { "c": "明天星期五。", "p": "Míngtiān xīngqīwǔ." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "今天星期五。", "p": "Jīntiān xīngqīwǔ." },
            { "c": "八月十五号。", "p": "Bā yuè shíwǔ hào." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Jīntiān xīngqī jǐ?", "c": "今天星期几？" },
        { "p": "Jīntiān xīngqīwǔ, bā yuè shíwǔ hào.", "c": "今天星期五，八月十五号。" },
        { "p": "Nà wǒmen xīngqītiān jiàn, hǎo ma?", "c": "那我们星期天见，好吗？" },
        { "p": "Hǎo! Xiàwǔ sān diǎn yǐhòu wǒ dōu yǒu kòng.", "c": "好！下午三点以后我都有空。" }
      ]
    }
  },
  {
    "id": 17,
    "level": "HSK1",
    "lessons": [
      {
        "id": "ja-comeu",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "ainda-nao",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "nao-aconteceu",
        "vocabIdx": [6, 7],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "le-completion",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "我吃了两个苹果", "p": "wǒ chī le liǎng gè píngguǒ" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "buxiang-le",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "我不想吃了", "p": "wǒ bù xiǎng chī le" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "le-question",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "你吃饭了吗？", "p": "nǐ chī fàn le ma?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "chifanle-greeting",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "你吃了吗？", "p": "nǐ chī le ma?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "haimei",
        "trigger": { "afterVocabIdx": 3 },
        "blocks": [
          {
            "examples": [
              { "c": "我还没吃", "p": "wǒ hái méi chī" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "meiyou-past",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "我昨天没有去工作", "p": "wǒ zuótiān méiyǒu qù gōngzuò" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "bu-vs-mei",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "今天晚上我不喝酒", "p": "jīntiān wǎnshang wǒ bù hē jiǔ" },
              { "c": "昨天我没有去工作", "p": "zuótiān wǒ méiyǒu qù gōngzuò" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "le-bridge",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "你怎么了？", "p": "nǐ zěnme le?" },
              { "c": "我吃了两个苹果", "p": "wǒ chī le liǎng gè píngguǒ" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "shide-deferred",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "c": "你是怎么来的？", "p": "nǐ shì zěnme lái de?" },
              { "c": "我是坐地铁来的", "p": "wǒ shì zuò dìtiě lái de" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "p": "le", "c": "了" },
      { "p": "chī fàn", "c": "吃饭" },
      { "p": "píngguǒ", "c": "苹果" },
      { "p": "hái méi", "c": "还没" },
      { "p": "zuótiān", "c": "昨天" },
      { "p": "wán", "c": "完" },
      { "p": "gōngzuò", "c": "工作" },
      { "p": "jiǔbā", "c": "酒吧" }
    ],
    "phrases": [
      {
        "p": "Wǒ chī le liǎng gè píngguǒ.",
        "c": "我吃了两个苹果。",
        "blocks": [
          { "p": "Wǒ chī le", "c": "我吃了" },
          { "p": "liǎng gè", "c": "两个" },
          { "p": "píngguǒ.", "c": "苹果。" }
        ]
      },
      {
        "p": "Wǒ bù xiǎng chī le.",
        "c": "我不想吃了。",
        "blocks": [
          { "p": "Wǒ bù xiǎng", "c": "我不想" },
          { "p": "chī le.", "c": "吃了。" }
        ]
      },
      {
        "p": "Wǒ zuótiān méiyǒu qù gōngzuò.",
        "c": "我昨天没有去工作。",
        "blocks": [
          { "p": "Wǒ zuótiān", "c": "我昨天" },
          { "p": "méiyǒu qù", "c": "没有去" },
          { "p": "gōngzuò.", "c": "工作。" }
        ]
      },
      {
        "p": "Nǐ chī fàn le ma?",
        "c": "你吃饭了吗？",
        "blocks": [
          { "p": "Nǐ chī fàn", "c": "你吃饭" },
          { "p": "le ma?", "c": "了吗？" }
        ]
      },
      {
        "p": "Wǒ hái méi chī.",
        "c": "我还没吃。",
        "blocks": [
          { "p": "Wǒ", "c": "我" },
          { "p": "hái méi", "c": "还没" },
          { "p": "chī.", "c": "吃。" }
        ]
      },
      {
        "p": "Jīntiān wǎnshang wǒ bù hē jiǔ.",
        "c": "今天晚上我不喝酒。",
        "blocks": [
          { "p": "Jīntiān wǎnshang", "c": "今天晚上" },
          { "p": "wǒ bù", "c": "我不" },
          { "p": "hē jiǔ.", "c": "喝酒。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小许", "e": "👩" },
        "B": { "n": "小何", "e": "🧑" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "我昨天吃了苹果。", "p": "Wǒ zuótiān chī le píngguǒ." },
            { "c": "我叫小何。", "p": "Wǒ jiào Xiǎo Hé." }
          ]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": [
            { "c": "谢谢，不客气。", "p": "Xièxie, bú kèqi." },
            { "c": "今天很饿。", "p": "Jīntiān hěn è." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Nǐ chī fàn le ma?", "c": "你吃饭了吗？" },
        { "p": "Hái méi, wǒ hái zài gōngzuò.", "c": "还没，我还在工作。" },
        { "p": "Wǒ chī le, wǒ chī le liǎng gè píngguǒ.", "c": "我吃了，我吃了两个苹果。" },
        { "p": "Zuótiān wǒ méiyǒu chī wǎnfàn, jīntiān hěn è.", "c": "昨天我没有吃晚饭，今天很饿。" }
      ]
    }
  },
  {
    "id": 18,
    "level": "HSK1",
    "lessons": [
      {
        "id": "quem-porque",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "escola",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "apresentar-trabalho",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "shei",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "c": "你是谁？", "p": "nǐ shì shéi?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "weishenme-yinwei",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "c": "你为什么不去？", "p": "nǐ wèishénme bú qù?" },
              { "c": "因为我很忙", "p": "yīnwèi wǒ hěn máng" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "meiyou-de",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "c": "我女朋友", "p": "wǒ nǚpéngyou" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "difang-you",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "c": "这里有一些咖啡", "p": "zhèlǐ yǒu yìxiē kāfēi" }
            ]
          },
          {
            "examples": [
              { "c": "一些书", "p": "yìxiē shū" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "zai-difang-verb",
        "trigger": { "afterVocabIdx": 9 },
        "blocks": [
          {
            "examples": [
              { "c": "我在上海工作", "p": "wǒ zài Shànghǎi gōngzuò" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "你为什么不去？", "pinyin": "nǐ wèishénme bú qù?", "emoji": "🤔", "answer": false }
    ],
    "vocab": [
      { "p": "shéi", "c": "谁" },
      { "p": "wèishénme", "c": "为什么" },
      { "p": "yīnwèi", "c": "因为" },
      { "p": "zhèlǐ", "c": "这里" },
      { "p": "xuéxiào", "c": "学校" },
      { "p": "xuésheng", "c": "学生" },
      { "p": "nǚpéngyou", "c": "女朋友" },
      { "p": "nánpéngyou", "c": "男朋友" },
      { "p": "yìxiē", "c": "一些" },
      { "p": "gōngzuò", "c": "工作" }
    ],
    "phrases": [
      {
        "p": "Nǐ shì shéi?",
        "c": "你是谁？",
        "blocks": [
          { "p": "Nǐ shì", "c": "你是" },
          { "p": "shéi?", "c": "谁？" }
        ]
      },
      {
        "p": "Nǐ wèishénme bù qù?",
        "c": "你为什么不去？",
        "blocks": [
          { "p": "Nǐ wèishénme", "c": "你为什么" },
          { "p": "bù qù?", "c": "不去？" }
        ]
      },
      {
        "p": "Yīnwèi wǒ hěn máng.",
        "c": "因为我很忙。",
        "blocks": [
          { "p": "Yīnwèi", "c": "因为" },
          { "p": "wǒ hěn", "c": "我很" },
          { "p": "máng.", "c": "忙。" }
        ]
      },
      {
        "p": "Wǒ zài Shànghǎi gōngzuò.",
        "c": "我在上海工作。",
        "blocks": [
          { "p": "Wǒ zài", "c": "我在" },
          { "p": "Shànghǎi", "c": "上海" },
          { "p": "gōngzuò.", "c": "工作。" }
        ]
      },
      {
        "p": "Zhèlǐ yǒu yìxiē kāfēi.",
        "c": "这里有一些咖啡。",
        "blocks": [
          { "p": "Zhèlǐ yǒu", "c": "这里有" },
          { "p": "yìxiē", "c": "一些" },
          { "p": "kāfēi.", "c": "咖啡。" }
        ]
      },
      {
        "p": "Zhè shì wǒ nǚpéngyou.",
        "c": "这是我女朋友。",
        "blocks": [
          { "p": "Zhè shì", "c": "这是" },
          { "p": "wǒ", "c": "我" },
          { "p": "nǚpéngyou.", "c": "女朋友。" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "小唐", "e": "👩" },
        "B": { "n": "小宋", "e": "🧑" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": [
            { "c": "这是我爸爸，他是医生。", "p": "Zhè shì wǒ bàba, tā shì yīshēng." },
            { "c": "这是我哥哥，他是学生。", "p": "Zhè shì wǒ gēge, tā shì xuésheng." }
          ]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": [
            { "c": "她在医院工作。", "p": "Tā zài yīyuàn gōngzuò." },
            { "c": "这是我女朋友。", "p": "Zhè shì wǒ nǚpéngyou." }
          ]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "p": "Zhè shì shéi?", "c": "这是谁？" },
        { "p": "Zhè shì wǒ nǚpéngyou, tā shì xuésheng.", "c": "这是我女朋友，她是学生。" },
        { "p": "Tā zài nǎlǐ gōngzuò huò xuéxí?", "c": "她在哪里工作或学习？" },
        { "p": "Tā zài xuéxiào xuéxí, zhèlǐ yǒu yìxiē tā de shū.", "c": "她在学校学习，这里有一些她的书。" }
      ]
    }
  }
];
