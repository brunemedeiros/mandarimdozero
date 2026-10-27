// BANCO DE HANZI do curso de chinês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/zh-pt-BR/layer.js (português) e zh/content.en.js (inglês).
// Caractere, pinyin e decomposição por radical (r); significado e mnemônico estão na camada.
// `k`: chave congelada do caractere (id do cartão = "h" + k; zh/app.js hanziCardId). Nunca mudar nem reaproveitar; caractere
// novo entra SEM `k` e ganha a próxima chave livre com: node scripts/congelar_chaves.js zh (registro em zh/scripts/item_keys_registry.json).
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/zh-<arquivo>.js.txt.

const HANZI_LESSONS = [
  [
    {
      "k": "0-c0",
      "char": "你",
      "pinyin": "nǐ",
      "radicals": [
        { "r": "亻" },
        { "r": "尔" }
      ]
    },
    {
      "k": "0-c1",
      "char": "好",
      "pinyin": "hǎo",
      "radicals": [
        { "r": "女" },
        { "r": "子" }
      ]
    },
    {
      "k": "0-c2",
      "char": "再",
      "pinyin": "zài",
      "radicals": []
    },
    {
      "k": "0-c3",
      "char": "见",
      "pinyin": "jiàn",
      "radicals": []
    },
    {
      "k": "0-c4",
      "char": "谢",
      "pinyin": "xiè",
      "radicals": [
        { "r": "讠" },
        { "r": "射" }
      ]
    }
  ],
  [
    {
      "k": "1-c0",
      "char": "不",
      "pinyin": "bù",
      "radicals": []
    },
    {
      "k": "1-c1",
      "char": "客",
      "pinyin": "kè",
      "radicals": [
        { "r": "宀" },
        { "r": "各" }
      ]
    },
    {
      "k": "1-c2",
      "char": "气",
      "pinyin": "qì",
      "radicals": []
    },
    {
      "k": "1-c3",
      "char": "对",
      "pinyin": "duì",
      "radicals": []
    },
    {
      "k": "1-c4",
      "char": "起",
      "pinyin": "qǐ",
      "radicals": [
        { "r": "走" },
        { "r": "己" }
      ]
    }
  ],
  [
    {
      "k": "2-c0",
      "char": "没",
      "pinyin": "méi",
      "radicals": [
        { "r": "氵" },
        { "r": "殳" }
      ]
    },
    {
      "k": "2-c1",
      "char": "关",
      "pinyin": "guān",
      "radicals": []
    },
    {
      "k": "2-c2",
      "char": "系",
      "pinyin": "xì",
      "radicals": []
    },
    {
      "k": "2-c3",
      "char": "早",
      "pinyin": "zǎo",
      "radicals": [
        { "r": "日" },
        { "r": "十" }
      ]
    },
    {
      "k": "2-c4",
      "char": "上",
      "pinyin": "shàng",
      "radicals": []
    }
  ],
  [
    {
      "k": "3-c0",
      "char": "晚",
      "pinyin": "wǎn",
      "radicals": [
        { "r": "日" },
        { "r": "免" }
      ]
    },
    {
      "k": "3-c1",
      "char": "我",
      "pinyin": "wǒ",
      "radicals": []
    },
    {
      "k": "3-c2",
      "char": "叫",
      "pinyin": "jiào",
      "radicals": [
        { "r": "口" },
        { "r": "丩" }
      ]
    },
    {
      "k": "3-c3",
      "char": "名",
      "pinyin": "míng",
      "radicals": [
        { "r": "夕" },
        { "r": "口" }
      ]
    },
    {
      "k": "3-c4",
      "char": "字",
      "pinyin": "zì",
      "radicals": [
        { "r": "宀" },
        { "r": "子" }
      ]
    }
  ],
  [
    {
      "k": "4-c0",
      "char": "是",
      "pinyin": "shì",
      "radicals": []
    },
    {
      "k": "4-c1",
      "char": "人",
      "pinyin": "rén",
      "radicals": []
    },
    {
      "k": "4-c2",
      "char": "巴",
      "pinyin": "bā",
      "radicals": []
    },
    {
      "k": "4-c3",
      "char": "西",
      "pinyin": "xī",
      "radicals": []
    },
    {
      "k": "4-c4",
      "char": "中",
      "pinyin": "zhōng",
      "radicals": []
    }
  ],
  [
    {
      "k": "5-c0",
      "char": "国",
      "pinyin": "guó",
      "radicals": [
        { "r": "囗" },
        { "r": "玉" }
      ]
    },
    {
      "k": "5-c1",
      "char": "哪",
      "pinyin": "nǎ",
      "radicals": [
        { "r": "口" },
        { "r": "那" }
      ]
    },
    {
      "k": "5-c2",
      "char": "零",
      "pinyin": "líng",
      "radicals": []
    },
    {
      "k": "5-c3",
      "char": "一",
      "pinyin": "yī",
      "radicals": []
    },
    {
      "k": "5-c4",
      "char": "二",
      "pinyin": "èr",
      "radicals": []
    }
  ],
  [
    {
      "k": "6-c0",
      "char": "三",
      "pinyin": "sān",
      "radicals": []
    },
    {
      "k": "6-c1",
      "char": "四",
      "pinyin": "sì",
      "radicals": []
    },
    {
      "k": "6-c2",
      "char": "五",
      "pinyin": "wǔ",
      "radicals": []
    },
    {
      "k": "6-c3",
      "char": "六",
      "pinyin": "liù",
      "radicals": []
    },
    {
      "k": "6-c4",
      "char": "七",
      "pinyin": "qī",
      "radicals": []
    }
  ],
  [
    {
      "k": "7-c0",
      "char": "八",
      "pinyin": "bā",
      "radicals": []
    },
    {
      "k": "7-c1",
      "char": "九",
      "pinyin": "jiǔ",
      "radicals": []
    },
    {
      "k": "7-c2",
      "char": "十",
      "pinyin": "shí",
      "radicals": []
    },
    {
      "k": "7-c3",
      "char": "岁",
      "pinyin": "suì",
      "radicals": []
    },
    {
      "k": "7-c4",
      "char": "多",
      "pinyin": "duō",
      "radicals": [
        { "r": "夕" },
        { "r": "夕" }
      ]
    }
  ],
  [
    {
      "k": "8-c0",
      "char": "大",
      "pinyin": "dà",
      "radicals": []
    },
    {
      "k": "8-c1",
      "char": "家",
      "pinyin": "jiā",
      "radicals": [
        { "r": "宀" },
        { "r": "豕" }
      ]
    },
    {
      "k": "8-c2",
      "char": "爸",
      "pinyin": "bà",
      "radicals": [
        { "r": "父" },
        { "r": "巴" }
      ]
    },
    {
      "k": "8-c3",
      "char": "妈",
      "pinyin": "mā",
      "radicals": [
        { "r": "女" },
        { "r": "马" }
      ]
    },
    {
      "k": "8-c4",
      "char": "哥",
      "pinyin": "gē",
      "radicals": [
        { "r": "可" },
        { "r": "可" }
      ]
    }
  ],
  [
    {
      "k": "9-c0",
      "char": "弟",
      "pinyin": "dì",
      "radicals": []
    },
    {
      "k": "9-c1",
      "char": "姐",
      "pinyin": "jiě",
      "radicals": [
        { "r": "女" },
        { "r": "且" }
      ]
    },
    {
      "k": "9-c2",
      "char": "妹",
      "pinyin": "mèi",
      "radicals": [
        { "r": "女" },
        { "r": "未" }
      ]
    },
    {
      "k": "9-c3",
      "char": "孩",
      "pinyin": "hái",
      "radicals": [
        { "r": "子" },
        { "r": "亥" }
      ]
    },
    {
      "k": "9-c4",
      "char": "子",
      "pinyin": "zǐ",
      "radicals": []
    }
  ],
  [
    {
      "k": "10-c0",
      "char": "有",
      "pinyin": "yǒu",
      "radicals": []
    },
    {
      "k": "10-c1",
      "char": "几",
      "pinyin": "jǐ",
      "radicals": []
    },
    {
      "k": "10-c2",
      "char": "个",
      "pinyin": "gè",
      "radicals": []
    },
    {
      "k": "10-c3",
      "char": "口",
      "pinyin": "kǒu",
      "radicals": []
    },
    {
      "k": "10-c4",
      "char": "吃",
      "pinyin": "chī",
      "radicals": [
        { "r": "口" },
        { "r": "乞" }
      ]
    }
  ],
  [
    {
      "k": "11-c0",
      "char": "喝",
      "pinyin": "hē",
      "radicals": [
        { "r": "口" },
        { "r": "曷" }
      ]
    },
    {
      "k": "11-c1",
      "char": "米",
      "pinyin": "mǐ",
      "radicals": []
    },
    {
      "k": "11-c2",
      "char": "饭",
      "pinyin": "fàn",
      "radicals": [
        { "r": "饣" },
        { "r": "反" }
      ]
    },
    {
      "k": "11-c3",
      "char": "面",
      "pinyin": "miàn",
      "radicals": []
    },
    {
      "k": "11-c4",
      "char": "水",
      "pinyin": "shuǐ",
      "radicals": []
    }
  ],
  [
    {
      "k": "12-c0",
      "char": "茶",
      "pinyin": "chá",
      "radicals": [
        { "r": "艹" },
        { "r": "余" }
      ]
    },
    {
      "k": "12-c1",
      "char": "咖",
      "pinyin": "kā",
      "radicals": [
        { "r": "口" },
        { "r": "加" }
      ]
    },
    {
      "k": "12-c2",
      "char": "啡",
      "pinyin": "fēi",
      "radicals": [
        { "r": "口" },
        { "r": "非" }
      ]
    },
    {
      "k": "12-c3",
      "char": "喜",
      "pinyin": "xǐ",
      "radicals": []
    },
    {
      "k": "12-c4",
      "char": "欢",
      "pinyin": "huān",
      "radicals": []
    }
  ],
  [
    {
      "k": "13-c0",
      "char": "要",
      "pinyin": "yào",
      "radicals": []
    },
    {
      "k": "13-c1",
      "char": "杯",
      "pinyin": "bēi",
      "radicals": [
        { "r": "木" },
        { "r": "不" }
      ]
    },
    {
      "k": "13-c2",
      "char": "点",
      "pinyin": "diǎn",
      "radicals": []
    },
    {
      "k": "13-c3",
      "char": "床",
      "pinyin": "chuáng",
      "radicals": [
        { "r": "广" },
        { "r": "木" }
      ]
    },
    {
      "k": "13-c4",
      "char": "班",
      "pinyin": "bān",
      "radicals": []
    }
  ],
  [
    {
      "k": "14-c0",
      "char": "下",
      "pinyin": "xià",
      "radicals": []
    },
    {
      "k": "14-c1",
      "char": "睡",
      "pinyin": "shuì",
      "radicals": [
        { "r": "目" },
        { "r": "垂" }
      ]
    },
    {
      "k": "14-c2",
      "char": "觉",
      "pinyin": "jiào",
      "radicals": []
    },
    {
      "k": "14-c3",
      "char": "每",
      "pinyin": "měi",
      "radicals": []
    },
    {
      "k": "14-c4",
      "char": "天",
      "pinyin": "tiān",
      "radicals": []
    }
  ],
  [
    {
      "k": "15-c0",
      "char": "现",
      "pinyin": "xiàn",
      "radicals": [
        { "r": "王" },
        { "r": "见" }
      ]
    },
    {
      "k": "15-c1",
      "char": "在",
      "pinyin": "zài",
      "radicals": []
    },
    {
      "k": "15-c2",
      "char": "今",
      "pinyin": "jīn",
      "radicals": []
    },
    {
      "k": "15-c3",
      "char": "里",
      "pinyin": "lǐ",
      "radicals": []
    },
    {
      "k": "15-c4",
      "char": "左",
      "pinyin": "zuǒ",
      "radicals": []
    }
  ],
  [
    {
      "k": "16-c0",
      "char": "右",
      "pinyin": "yòu",
      "radicals": []
    },
    {
      "k": "16-c1",
      "char": "前",
      "pinyin": "qián",
      "radicals": []
    },
    {
      "k": "16-c2",
      "char": "后",
      "pinyin": "hòu",
      "radicals": []
    },
    {
      "k": "16-c3",
      "char": "离",
      "pinyin": "lí",
      "radicals": []
    },
    {
      "k": "16-c4",
      "char": "近",
      "pinyin": "jìn",
      "radicals": [
        { "r": "辶" },
        { "r": "斤" }
      ]
    }
  ],
  [
    {
      "k": "17-c0",
      "char": "远",
      "pinyin": "yuǎn",
      "radicals": [
        { "r": "辶" },
        { "r": "元" }
      ]
    },
    {
      "k": "17-c1",
      "char": "买",
      "pinyin": "mǎi",
      "radicals": []
    },
    {
      "k": "17-c2",
      "char": "卖",
      "pinyin": "mài",
      "radicals": []
    },
    {
      "k": "17-c3",
      "char": "少",
      "pinyin": "shǎo",
      "radicals": []
    },
    {
      "k": "17-c4",
      "char": "钱",
      "pinyin": "qián",
      "radicals": [
        { "r": "钅" },
        { "r": "戋" }
      ]
    }
  ],
  [
    {
      "k": "18-c0",
      "char": "块",
      "pinyin": "kuài",
      "radicals": [
        { "r": "土" },
        { "r": "块" }
      ]
    },
    {
      "k": "18-c1",
      "char": "便",
      "pinyin": "pián",
      "radicals": []
    },
    {
      "k": "18-c2",
      "char": "宜",
      "pinyin": "yí",
      "radicals": [
        { "r": "宀" },
        { "r": "且" }
      ]
    },
    {
      "k": "18-c3",
      "char": "贵",
      "pinyin": "guì",
      "radicals": []
    },
    {
      "k": "18-c4",
      "char": "这",
      "pinyin": "zhè",
      "radicals": [
        { "r": "辶" },
        { "r": "文" }
      ]
    }
  ],
  [
    {
      "k": "19-c0",
      "char": "那",
      "pinyin": "nà",
      "radicals": []
    },
    {
      "k": "19-c1",
      "char": "衣",
      "pinyin": "yī",
      "radicals": []
    },
    {
      "k": "19-c2",
      "char": "服",
      "pinyin": "fú",
      "radicals": []
    },
    {
      "k": "19-c3",
      "char": "鞋",
      "pinyin": "xié",
      "radicals": [
        { "r": "革" },
        { "r": "圭" }
      ]
    },
    {
      "k": "19-c4",
      "char": "热",
      "pinyin": "rè",
      "radicals": [
        { "r": "扌" },
        { "r": "灬" }
      ]
    }
  ],
  [
    {
      "k": "20-c0",
      "char": "冷",
      "pinyin": "lěng",
      "radicals": [
        { "r": "冫" },
        { "r": "令" }
      ]
    },
    {
      "k": "20-c1",
      "char": "雨",
      "pinyin": "yǔ",
      "radicals": []
    },
    {
      "k": "20-c2",
      "char": "晴",
      "pinyin": "qíng",
      "radicals": [
        { "r": "日" },
        { "r": "青" }
      ]
    },
    {
      "k": "20-c3",
      "char": "阴",
      "pinyin": "yīn",
      "radicals": []
    },
    {
      "k": "20-c4",
      "char": "风",
      "pinyin": "fēng",
      "radicals": []
    }
  ],
  [
    {
      "k": "21-c0",
      "char": "怎",
      "pinyin": "zěn",
      "radicals": []
    },
    {
      "k": "21-c1",
      "char": "么",
      "pinyin": "me",
      "radicals": []
    },
    {
      "k": "21-c2",
      "char": "样",
      "pinyin": "yàng",
      "radicals": [
        { "r": "木" },
        { "r": "羊" }
      ]
    },
    {
      "k": "21-c3",
      "char": "公",
      "pinyin": "gōng",
      "radicals": []
    },
    {
      "k": "21-c4",
      "char": "共",
      "pinyin": "gòng",
      "radicals": []
    }
  ],
  [
    {
      "k": "22-c0",
      "char": "汽",
      "pinyin": "qì",
      "radicals": [
        { "r": "氵" },
        { "r": "气" }
      ]
    },
    {
      "k": "22-c1",
      "char": "车",
      "pinyin": "chē",
      "radicals": []
    },
    {
      "k": "22-c2",
      "char": "地",
      "pinyin": "dì",
      "radicals": [
        { "r": "土" },
        { "r": "也" }
      ]
    },
    {
      "k": "22-c3",
      "char": "铁",
      "pinyin": "tiě",
      "radicals": [
        { "r": "钅" },
        { "r": "失" }
      ]
    },
    {
      "k": "22-c4",
      "char": "出",
      "pinyin": "chū",
      "radicals": []
    }
  ],
  [
    {
      "k": "23-c0",
      "char": "租",
      "pinyin": "zū",
      "radicals": [
        { "r": "禾" },
        { "r": "且" }
      ]
    },
    {
      "k": "23-c1",
      "char": "走",
      "pinyin": "zǒu",
      "radicals": []
    },
    {
      "k": "23-c2",
      "char": "路",
      "pinyin": "lù",
      "radicals": [
        { "r": "足" },
        { "r": "各" }
      ]
    },
    {
      "k": "23-c3",
      "char": "去",
      "pinyin": "qù",
      "radicals": []
    },
    {
      "k": "23-c4",
      "char": "站",
      "pinyin": "zhàn",
      "radicals": [
        { "r": "立" },
        { "r": "占" }
      ]
    }
  ],
  [
    {
      "k": "24-c0",
      "char": "票",
      "pinyin": "piào",
      "radicals": []
    },
    {
      "k": "24-c1",
      "char": "张",
      "pinyin": "zhāng",
      "radicals": [
        { "r": "弓" },
        { "r": "长" }
      ]
    },
    {
      "k": "24-c2",
      "char": "身",
      "pinyin": "shēn",
      "radicals": []
    },
    {
      "k": "24-c3",
      "char": "体",
      "pinyin": "tǐ",
      "radicals": [
        { "r": "亻" },
        { "r": "本" }
      ]
    },
    {
      "k": "24-c4",
      "char": "头",
      "pinyin": "tóu",
      "radicals": []
    }
  ],
  [
    {
      "k": "25-c0",
      "char": "肚",
      "pinyin": "dù",
      "radicals": [
        { "r": "月" },
        { "r": "土" }
      ]
    },
    {
      "k": "25-c1",
      "char": "疼",
      "pinyin": "téng",
      "radicals": [
        { "r": "疒" },
        { "r": "冬" }
      ]
    },
    {
      "k": "25-c2",
      "char": "生",
      "pinyin": "shēng",
      "radicals": []
    },
    {
      "k": "25-c3",
      "char": "病",
      "pinyin": "bìng",
      "radicals": [
        { "r": "疒" },
        { "r": "丙" }
      ]
    },
    {
      "k": "25-c4",
      "char": "医",
      "pinyin": "yī",
      "radicals": []
    }
  ],
  [
    {
      "k": "26-c0",
      "char": "院",
      "pinyin": "yuàn",
      "radicals": [
        { "r": "阝" },
        { "r": "完" }
      ]
    },
    {
      "k": "26-c1",
      "char": "舒",
      "pinyin": "shū",
      "radicals": []
    },
    {
      "k": "26-c2",
      "char": "爱",
      "pinyin": "ài",
      "radicals": []
    },
    {
      "k": "26-c3",
      "char": "看",
      "pinyin": "kàn",
      "radicals": [
        { "r": "手" },
        { "r": "目" }
      ]
    },
    {
      "k": "26-c4",
      "char": "书",
      "pinyin": "shū",
      "radicals": []
    }
  ],
  [
    {
      "k": "27-c0",
      "char": "听",
      "pinyin": "tīng",
      "radicals": [
        { "r": "口" },
        { "r": "斤" }
      ]
    },
    {
      "k": "27-c1",
      "char": "音",
      "pinyin": "yīn",
      "radicals": []
    },
    {
      "k": "27-c2",
      "char": "乐",
      "pinyin": "yuè",
      "radicals": []
    },
    {
      "k": "27-c3",
      "char": "电",
      "pinyin": "diàn",
      "radicals": []
    },
    {
      "k": "27-c4",
      "char": "影",
      "pinyin": "yǐng",
      "radicals": []
    }
  ],
  [
    {
      "k": "28-c0",
      "char": "运",
      "pinyin": "yùn",
      "radicals": [
        { "r": "辶" },
        { "r": "云" }
      ]
    },
    {
      "k": "28-c1",
      "char": "动",
      "pinyin": "dòng",
      "radicals": []
    },
    {
      "k": "28-c2",
      "char": "唱",
      "pinyin": "chàng",
      "radicals": [
        { "r": "口" },
        { "r": "昌" }
      ]
    },
    {
      "k": "28-c3",
      "char": "歌",
      "pinyin": "gē",
      "radicals": []
    },
    {
      "k": "28-c4",
      "char": "跳",
      "pinyin": "tiào",
      "radicals": [
        { "r": "足" },
        { "r": "兆" }
      ]
    }
  ],
  [
    {
      "k": "29-c0",
      "char": "舞",
      "pinyin": "wǔ",
      "radicals": []
    },
    {
      "k": "29-c1",
      "char": "空",
      "pinyin": "kòng",
      "radicals": [
        { "r": "穴" },
        { "r": "工" }
      ]
    },
    {
      "k": "29-c2",
      "char": "打",
      "pinyin": "dǎ",
      "radicals": [
        { "r": "扌" },
        { "r": "丁" }
      ]
    },
    {
      "k": "29-c3",
      "char": "算",
      "pinyin": "suàn",
      "radicals": []
    },
    {
      "k": "29-c4",
      "char": "明",
      "pinyin": "míng",
      "radicals": [
        { "r": "日" },
        { "r": "月" }
      ]
    }
  ],
  [
    {
      "k": "30-c0",
      "char": "星",
      "pinyin": "xīng",
      "radicals": [
        { "r": "日" },
        { "r": "生" }
      ]
    },
    {
      "k": "30-c1",
      "char": "期",
      "pinyin": "qī",
      "radicals": []
    },
    {
      "k": "30-c2",
      "char": "旅",
      "pinyin": "lǚ",
      "radicals": []
    },
    {
      "k": "30-c3",
      "char": "游",
      "pinyin": "yóu",
      "radicals": [
        { "r": "氵" },
        { "r": "斿" }
      ]
    },
    {
      "k": "30-c4",
      "char": "学",
      "pinyin": "xué",
      "radicals": []
    }
  ],
  [
    {
      "k": "31-c0",
      "char": "习",
      "pinyin": "xí",
      "radicals": []
    },
    {
      "k": "31-c1",
      "char": "计",
      "pinyin": "jì",
      "radicals": [
        { "r": "讠" },
        { "r": "十" }
      ]
    },
    {
      "k": "31-c2",
      "char": "划",
      "pinyin": "huà",
      "radicals": []
    },
    {
      "k": "31-c3",
      "char": "以",
      "pinyin": "yǐ",
      "radicals": []
    },
    {
      "k": "31-c4",
      "char": "比",
      "pinyin": "bǐ",
      "radicals": []
    }
  ],
  [
    {
      "k": "32-c0",
      "char": "更",
      "pinyin": "gèng",
      "radicals": []
    },
    {
      "k": "32-c1",
      "char": "最",
      "pinyin": "zuì",
      "radicals": []
    },
    {
      "k": "32-c2",
      "char": "还",
      "pinyin": "hái",
      "radicals": [
        { "r": "辶" },
        { "r": "不" }
      ]
    }
  ],
  [
    {
      "k": "33-c0",
      "char": "高",
      "pinyin": "gāo",
      "radicals": []
    },
    {
      "k": "33-c1",
      "char": "毛",
      "pinyin": "máo",
      "radicals": []
    },
    {
      "k": "33-c2",
      "char": "想",
      "pinyin": "xiǎng",
      "radicals": [
        { "r": "相" },
        { "r": "心" }
      ]
    },
    {
      "k": "33-c3",
      "char": "会",
      "pinyin": "huì",
      "radicals": []
    },
    {
      "k": "33-c4",
      "char": "能",
      "pinyin": "néng",
      "radicals": []
    }
  ],
  [
    {
      "k": "34-c0",
      "char": "请",
      "pinyin": "qǐng",
      "radicals": [
        { "r": "讠" },
        { "r": "青" }
      ]
    },
    {
      "k": "34-c1",
      "char": "坐",
      "pinyin": "zuò",
      "radicals": [
        { "r": "人" },
        { "r": "土" }
      ]
    },
    {
      "k": "34-c2",
      "char": "都",
      "pinyin": "dōu",
      "radicals": []
    },
    {
      "k": "34-c3",
      "char": "也",
      "pinyin": "yě",
      "radicals": []
    },
    {
      "k": "34-c4",
      "char": "说",
      "pinyin": "shuō",
      "radicals": [
        { "r": "讠" },
        { "r": "兑" }
      ]
    }
  ],
  [
    {
      "k": "35-c0",
      "char": "来",
      "pinyin": "lái",
      "radicals": []
    },
    {
      "k": "35-c1",
      "char": "号",
      "pinyin": "hào",
      "radicals": []
    },
    {
      "k": "35-c2",
      "char": "月",
      "pinyin": "yuè",
      "radicals": []
    },
    {
      "k": "35-c3",
      "char": "年",
      "pinyin": "nián",
      "radicals": []
    },
    {
      "k": "35-c4",
      "char": "分",
      "pinyin": "fēn",
      "radicals": [
        { "r": "八" },
        { "r": "刀" }
      ]
    }
  ],
  [
    {
      "k": "36-c0",
      "char": "百",
      "pinyin": "bǎi",
      "radicals": []
    },
    {
      "k": "36-c1",
      "char": "了",
      "pinyin": "le",
      "radicals": []
    },
    {
      "k": "36-c2",
      "char": "苹",
      "pinyin": "píng",
      "radicals": [
        { "r": "艹" },
        { "r": "平" }
      ]
    },
    {
      "k": "36-c3",
      "char": "果",
      "pinyin": "guǒ",
      "radicals": []
    },
    {
      "k": "36-c4",
      "char": "昨",
      "pinyin": "zuó",
      "radicals": [
        { "r": "日" },
        { "r": "乍" }
      ]
    }
  ],
  [
    {
      "k": "37-c0",
      "char": "完",
      "pinyin": "wán",
      "radicals": [
        { "r": "宀" },
        { "r": "元" }
      ]
    },
    {
      "k": "37-c1",
      "char": "工",
      "pinyin": "gōng",
      "radicals": []
    },
    {
      "k": "37-c2",
      "char": "作",
      "pinyin": "zuò",
      "radicals": [
        { "r": "亻" },
        { "r": "乍" }
      ]
    },
    {
      "k": "37-c3",
      "char": "酒",
      "pinyin": "jiǔ",
      "radicals": [
        { "r": "氵" },
        { "r": "酉" }
      ]
    },
    {
      "k": "37-c4",
      "char": "吧",
      "pinyin": "ba",
      "radicals": [
        { "r": "口" },
        { "r": "巴" }
      ]
    }
  ],
  [
    {
      "k": "38-c0",
      "char": "谁",
      "pinyin": "shéi",
      "radicals": [
        { "r": "讠" },
        { "r": "隹" }
      ]
    },
    {
      "k": "38-c1",
      "char": "为",
      "pinyin": "wèi",
      "radicals": []
    },
    {
      "k": "38-c2",
      "char": "什",
      "pinyin": "shén",
      "radicals": [
        { "r": "亻" },
        { "r": "十" }
      ]
    },
    {
      "k": "38-c3",
      "char": "因",
      "pinyin": "yīn",
      "radicals": []
    },
    {
      "k": "38-c4",
      "char": "校",
      "pinyin": "xiào",
      "radicals": [
        { "r": "木" },
        { "r": "交" }
      ]
    }
  ],
  [
    {
      "k": "39-c0",
      "char": "女",
      "pinyin": "nǚ",
      "radicals": []
    },
    {
      "k": "39-c1",
      "char": "朋",
      "pinyin": "péng",
      "radicals": []
    },
    {
      "k": "39-c2",
      "char": "友",
      "pinyin": "yǒu",
      "radicals": []
    },
    {
      "k": "39-c3",
      "char": "男",
      "pinyin": "nán",
      "radicals": [
        { "r": "田" },
        { "r": "力" }
      ]
    },
    {
      "k": "39-c4",
      "char": "些",
      "pinyin": "xiē",
      "radicals": []
    }
  ]
];

// "Achata" a lista em um array único, também útil para buscas e contagem total
const HANZI_ALL = HANZI_LESSONS.flat();
