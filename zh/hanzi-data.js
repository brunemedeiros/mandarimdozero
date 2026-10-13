// BANCO DE HANZI do curso de chinês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/zh-pt-BR/layer.js (português) e zh/content.en.js (inglês).
// Caractere, pinyin e decomposição por radical (r); significado e mnemônico estão na camada.
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/zh-<arquivo>.js.txt.

const HANZI_LESSONS = [
  [
    {
      "char": "你",
      "pinyin": "nǐ",
      "radicals": [
        { "r": "亻" },
        { "r": "尔" }
      ]
    },
    {
      "char": "好",
      "pinyin": "hǎo",
      "radicals": [
        { "r": "女" },
        { "r": "子" }
      ]
    },
    {
      "char": "再",
      "pinyin": "zài",
      "radicals": []
    },
    {
      "char": "见",
      "pinyin": "jiàn",
      "radicals": []
    },
    {
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
      "char": "不",
      "pinyin": "bù",
      "radicals": []
    },
    {
      "char": "客",
      "pinyin": "kè",
      "radicals": [
        { "r": "宀" },
        { "r": "各" }
      ]
    },
    {
      "char": "气",
      "pinyin": "qì",
      "radicals": []
    },
    {
      "char": "对",
      "pinyin": "duì",
      "radicals": []
    },
    {
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
      "char": "没",
      "pinyin": "méi",
      "radicals": [
        { "r": "氵" },
        { "r": "殳" }
      ]
    },
    {
      "char": "关",
      "pinyin": "guān",
      "radicals": []
    },
    {
      "char": "系",
      "pinyin": "xì",
      "radicals": []
    },
    {
      "char": "早",
      "pinyin": "zǎo",
      "radicals": [
        { "r": "日" },
        { "r": "十" }
      ]
    },
    {
      "char": "上",
      "pinyin": "shàng",
      "radicals": []
    }
  ],
  [
    {
      "char": "晚",
      "pinyin": "wǎn",
      "radicals": [
        { "r": "日" },
        { "r": "免" }
      ]
    },
    {
      "char": "我",
      "pinyin": "wǒ",
      "radicals": []
    },
    {
      "char": "叫",
      "pinyin": "jiào",
      "radicals": [
        { "r": "口" },
        { "r": "丩" }
      ]
    },
    {
      "char": "名",
      "pinyin": "míng",
      "radicals": [
        { "r": "夕" },
        { "r": "口" }
      ]
    },
    {
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
      "char": "是",
      "pinyin": "shì",
      "radicals": []
    },
    {
      "char": "人",
      "pinyin": "rén",
      "radicals": []
    },
    {
      "char": "巴",
      "pinyin": "bā",
      "radicals": []
    },
    {
      "char": "西",
      "pinyin": "xī",
      "radicals": []
    },
    {
      "char": "中",
      "pinyin": "zhōng",
      "radicals": []
    }
  ],
  [
    {
      "char": "国",
      "pinyin": "guó",
      "radicals": [
        { "r": "囗" },
        { "r": "玉" }
      ]
    },
    {
      "char": "哪",
      "pinyin": "nǎ",
      "radicals": [
        { "r": "口" },
        { "r": "那" }
      ]
    },
    {
      "char": "零",
      "pinyin": "líng",
      "radicals": []
    },
    {
      "char": "一",
      "pinyin": "yī",
      "radicals": []
    },
    {
      "char": "二",
      "pinyin": "èr",
      "radicals": []
    }
  ],
  [
    {
      "char": "三",
      "pinyin": "sān",
      "radicals": []
    },
    {
      "char": "四",
      "pinyin": "sì",
      "radicals": []
    },
    {
      "char": "五",
      "pinyin": "wǔ",
      "radicals": []
    },
    {
      "char": "六",
      "pinyin": "liù",
      "radicals": []
    },
    {
      "char": "七",
      "pinyin": "qī",
      "radicals": []
    }
  ],
  [
    {
      "char": "八",
      "pinyin": "bā",
      "radicals": []
    },
    {
      "char": "九",
      "pinyin": "jiǔ",
      "radicals": []
    },
    {
      "char": "十",
      "pinyin": "shí",
      "radicals": []
    },
    {
      "char": "岁",
      "pinyin": "suì",
      "radicals": []
    },
    {
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
      "char": "大",
      "pinyin": "dà",
      "radicals": []
    },
    {
      "char": "家",
      "pinyin": "jiā",
      "radicals": [
        { "r": "宀" },
        { "r": "豕" }
      ]
    },
    {
      "char": "爸",
      "pinyin": "bà",
      "radicals": [
        { "r": "父" },
        { "r": "巴" }
      ]
    },
    {
      "char": "妈",
      "pinyin": "mā",
      "radicals": [
        { "r": "女" },
        { "r": "马" }
      ]
    },
    {
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
      "char": "弟",
      "pinyin": "dì",
      "radicals": []
    },
    {
      "char": "姐",
      "pinyin": "jiě",
      "radicals": [
        { "r": "女" },
        { "r": "且" }
      ]
    },
    {
      "char": "妹",
      "pinyin": "mèi",
      "radicals": [
        { "r": "女" },
        { "r": "未" }
      ]
    },
    {
      "char": "孩",
      "pinyin": "hái",
      "radicals": [
        { "r": "子" },
        { "r": "亥" }
      ]
    },
    {
      "char": "子",
      "pinyin": "zǐ",
      "radicals": []
    }
  ],
  [
    {
      "char": "有",
      "pinyin": "yǒu",
      "radicals": []
    },
    {
      "char": "几",
      "pinyin": "jǐ",
      "radicals": []
    },
    {
      "char": "个",
      "pinyin": "gè",
      "radicals": []
    },
    {
      "char": "口",
      "pinyin": "kǒu",
      "radicals": []
    },
    {
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
      "char": "喝",
      "pinyin": "hē",
      "radicals": [
        { "r": "口" },
        { "r": "曷" }
      ]
    },
    {
      "char": "米",
      "pinyin": "mǐ",
      "radicals": []
    },
    {
      "char": "饭",
      "pinyin": "fàn",
      "radicals": [
        { "r": "饣" },
        { "r": "反" }
      ]
    },
    {
      "char": "面",
      "pinyin": "miàn",
      "radicals": []
    },
    {
      "char": "水",
      "pinyin": "shuǐ",
      "radicals": []
    }
  ],
  [
    {
      "char": "茶",
      "pinyin": "chá",
      "radicals": [
        { "r": "艹" },
        { "r": "余" }
      ]
    },
    {
      "char": "咖",
      "pinyin": "kā",
      "radicals": [
        { "r": "口" },
        { "r": "加" }
      ]
    },
    {
      "char": "啡",
      "pinyin": "fēi",
      "radicals": [
        { "r": "口" },
        { "r": "非" }
      ]
    },
    {
      "char": "喜",
      "pinyin": "xǐ",
      "radicals": []
    },
    {
      "char": "欢",
      "pinyin": "huān",
      "radicals": []
    }
  ],
  [
    {
      "char": "要",
      "pinyin": "yào",
      "radicals": []
    },
    {
      "char": "杯",
      "pinyin": "bēi",
      "radicals": [
        { "r": "木" },
        { "r": "不" }
      ]
    },
    {
      "char": "点",
      "pinyin": "diǎn",
      "radicals": []
    },
    {
      "char": "床",
      "pinyin": "chuáng",
      "radicals": [
        { "r": "广" },
        { "r": "木" }
      ]
    },
    {
      "char": "班",
      "pinyin": "bān",
      "radicals": []
    }
  ],
  [
    {
      "char": "下",
      "pinyin": "xià",
      "radicals": []
    },
    {
      "char": "睡",
      "pinyin": "shuì",
      "radicals": [
        { "r": "目" },
        { "r": "垂" }
      ]
    },
    {
      "char": "觉",
      "pinyin": "jiào",
      "radicals": []
    },
    {
      "char": "每",
      "pinyin": "měi",
      "radicals": []
    },
    {
      "char": "天",
      "pinyin": "tiān",
      "radicals": []
    }
  ],
  [
    {
      "char": "现",
      "pinyin": "xiàn",
      "radicals": [
        { "r": "王" },
        { "r": "见" }
      ]
    },
    {
      "char": "在",
      "pinyin": "zài",
      "radicals": []
    },
    {
      "char": "今",
      "pinyin": "jīn",
      "radicals": []
    },
    {
      "char": "里",
      "pinyin": "lǐ",
      "radicals": []
    },
    {
      "char": "左",
      "pinyin": "zuǒ",
      "radicals": []
    }
  ],
  [
    {
      "char": "右",
      "pinyin": "yòu",
      "radicals": []
    },
    {
      "char": "前",
      "pinyin": "qián",
      "radicals": []
    },
    {
      "char": "后",
      "pinyin": "hòu",
      "radicals": []
    },
    {
      "char": "离",
      "pinyin": "lí",
      "radicals": []
    },
    {
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
      "char": "远",
      "pinyin": "yuǎn",
      "radicals": [
        { "r": "辶" },
        { "r": "元" }
      ]
    },
    {
      "char": "买",
      "pinyin": "mǎi",
      "radicals": []
    },
    {
      "char": "卖",
      "pinyin": "mài",
      "radicals": []
    },
    {
      "char": "少",
      "pinyin": "shǎo",
      "radicals": []
    },
    {
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
      "char": "块",
      "pinyin": "kuài",
      "radicals": [
        { "r": "土" },
        { "r": "块" }
      ]
    },
    {
      "char": "便",
      "pinyin": "pián",
      "radicals": []
    },
    {
      "char": "宜",
      "pinyin": "yí",
      "radicals": [
        { "r": "宀" },
        { "r": "且" }
      ]
    },
    {
      "char": "贵",
      "pinyin": "guì",
      "radicals": []
    },
    {
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
      "char": "那",
      "pinyin": "nà",
      "radicals": []
    },
    {
      "char": "衣",
      "pinyin": "yī",
      "radicals": []
    },
    {
      "char": "服",
      "pinyin": "fú",
      "radicals": []
    },
    {
      "char": "鞋",
      "pinyin": "xié",
      "radicals": [
        { "r": "革" },
        { "r": "圭" }
      ]
    },
    {
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
      "char": "冷",
      "pinyin": "lěng",
      "radicals": [
        { "r": "冫" },
        { "r": "令" }
      ]
    },
    {
      "char": "雨",
      "pinyin": "yǔ",
      "radicals": []
    },
    {
      "char": "晴",
      "pinyin": "qíng",
      "radicals": [
        { "r": "日" },
        { "r": "青" }
      ]
    },
    {
      "char": "阴",
      "pinyin": "yīn",
      "radicals": []
    },
    {
      "char": "风",
      "pinyin": "fēng",
      "radicals": []
    }
  ],
  [
    {
      "char": "怎",
      "pinyin": "zěn",
      "radicals": []
    },
    {
      "char": "么",
      "pinyin": "me",
      "radicals": []
    },
    {
      "char": "样",
      "pinyin": "yàng",
      "radicals": [
        { "r": "木" },
        { "r": "羊" }
      ]
    },
    {
      "char": "公",
      "pinyin": "gōng",
      "radicals": []
    },
    {
      "char": "共",
      "pinyin": "gòng",
      "radicals": []
    }
  ],
  [
    {
      "char": "汽",
      "pinyin": "qì",
      "radicals": [
        { "r": "氵" },
        { "r": "气" }
      ]
    },
    {
      "char": "车",
      "pinyin": "chē",
      "radicals": []
    },
    {
      "char": "地",
      "pinyin": "dì",
      "radicals": [
        { "r": "土" },
        { "r": "也" }
      ]
    },
    {
      "char": "铁",
      "pinyin": "tiě",
      "radicals": [
        { "r": "钅" },
        { "r": "失" }
      ]
    },
    {
      "char": "出",
      "pinyin": "chū",
      "radicals": []
    }
  ],
  [
    {
      "char": "租",
      "pinyin": "zū",
      "radicals": [
        { "r": "禾" },
        { "r": "且" }
      ]
    },
    {
      "char": "走",
      "pinyin": "zǒu",
      "radicals": []
    },
    {
      "char": "路",
      "pinyin": "lù",
      "radicals": [
        { "r": "足" },
        { "r": "各" }
      ]
    },
    {
      "char": "去",
      "pinyin": "qù",
      "radicals": []
    },
    {
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
      "char": "票",
      "pinyin": "piào",
      "radicals": []
    },
    {
      "char": "张",
      "pinyin": "zhāng",
      "radicals": [
        { "r": "弓" },
        { "r": "长" }
      ]
    },
    {
      "char": "身",
      "pinyin": "shēn",
      "radicals": []
    },
    {
      "char": "体",
      "pinyin": "tǐ",
      "radicals": [
        { "r": "亻" },
        { "r": "本" }
      ]
    },
    {
      "char": "头",
      "pinyin": "tóu",
      "radicals": []
    }
  ],
  [
    {
      "char": "肚",
      "pinyin": "dù",
      "radicals": [
        { "r": "月" },
        { "r": "土" }
      ]
    },
    {
      "char": "疼",
      "pinyin": "téng",
      "radicals": [
        { "r": "疒" },
        { "r": "冬" }
      ]
    },
    {
      "char": "生",
      "pinyin": "shēng",
      "radicals": []
    },
    {
      "char": "病",
      "pinyin": "bìng",
      "radicals": [
        { "r": "疒" },
        { "r": "丙" }
      ]
    },
    {
      "char": "医",
      "pinyin": "yī",
      "radicals": []
    }
  ],
  [
    {
      "char": "院",
      "pinyin": "yuàn",
      "radicals": [
        { "r": "阝" },
        { "r": "完" }
      ]
    },
    {
      "char": "舒",
      "pinyin": "shū",
      "radicals": []
    },
    {
      "char": "爱",
      "pinyin": "ài",
      "radicals": []
    },
    {
      "char": "看",
      "pinyin": "kàn",
      "radicals": [
        { "r": "手" },
        { "r": "目" }
      ]
    },
    {
      "char": "书",
      "pinyin": "shū",
      "radicals": []
    }
  ],
  [
    {
      "char": "听",
      "pinyin": "tīng",
      "radicals": [
        { "r": "口" },
        { "r": "斤" }
      ]
    },
    {
      "char": "音",
      "pinyin": "yīn",
      "radicals": []
    },
    {
      "char": "乐",
      "pinyin": "yuè",
      "radicals": []
    },
    {
      "char": "电",
      "pinyin": "diàn",
      "radicals": []
    },
    {
      "char": "影",
      "pinyin": "yǐng",
      "radicals": []
    }
  ],
  [
    {
      "char": "运",
      "pinyin": "yùn",
      "radicals": [
        { "r": "辶" },
        { "r": "云" }
      ]
    },
    {
      "char": "动",
      "pinyin": "dòng",
      "radicals": []
    },
    {
      "char": "唱",
      "pinyin": "chàng",
      "radicals": [
        { "r": "口" },
        { "r": "昌" }
      ]
    },
    {
      "char": "歌",
      "pinyin": "gē",
      "radicals": []
    },
    {
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
      "char": "舞",
      "pinyin": "wǔ",
      "radicals": []
    },
    {
      "char": "空",
      "pinyin": "kòng",
      "radicals": [
        { "r": "穴" },
        { "r": "工" }
      ]
    },
    {
      "char": "打",
      "pinyin": "dǎ",
      "radicals": [
        { "r": "扌" },
        { "r": "丁" }
      ]
    },
    {
      "char": "算",
      "pinyin": "suàn",
      "radicals": []
    },
    {
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
      "char": "星",
      "pinyin": "xīng",
      "radicals": [
        { "r": "日" },
        { "r": "生" }
      ]
    },
    {
      "char": "期",
      "pinyin": "qī",
      "radicals": []
    },
    {
      "char": "旅",
      "pinyin": "lǚ",
      "radicals": []
    },
    {
      "char": "游",
      "pinyin": "yóu",
      "radicals": [
        { "r": "氵" },
        { "r": "斿" }
      ]
    },
    {
      "char": "学",
      "pinyin": "xué",
      "radicals": []
    }
  ],
  [
    {
      "char": "习",
      "pinyin": "xí",
      "radicals": []
    },
    {
      "char": "计",
      "pinyin": "jì",
      "radicals": [
        { "r": "讠" },
        { "r": "十" }
      ]
    },
    {
      "char": "划",
      "pinyin": "huà",
      "radicals": []
    },
    {
      "char": "以",
      "pinyin": "yǐ",
      "radicals": []
    },
    {
      "char": "比",
      "pinyin": "bǐ",
      "radicals": []
    }
  ],
  [
    {
      "char": "更",
      "pinyin": "gèng",
      "radicals": []
    },
    {
      "char": "最",
      "pinyin": "zuì",
      "radicals": []
    },
    {
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
      "char": "高",
      "pinyin": "gāo",
      "radicals": []
    },
    {
      "char": "毛",
      "pinyin": "máo",
      "radicals": []
    },
    {
      "char": "想",
      "pinyin": "xiǎng",
      "radicals": [
        { "r": "相" },
        { "r": "心" }
      ]
    },
    {
      "char": "会",
      "pinyin": "huì",
      "radicals": []
    },
    {
      "char": "能",
      "pinyin": "néng",
      "radicals": []
    }
  ],
  [
    {
      "char": "请",
      "pinyin": "qǐng",
      "radicals": [
        { "r": "讠" },
        { "r": "青" }
      ]
    },
    {
      "char": "坐",
      "pinyin": "zuò",
      "radicals": [
        { "r": "人" },
        { "r": "土" }
      ]
    },
    {
      "char": "都",
      "pinyin": "dōu",
      "radicals": []
    },
    {
      "char": "也",
      "pinyin": "yě",
      "radicals": []
    },
    {
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
      "char": "来",
      "pinyin": "lái",
      "radicals": []
    },
    {
      "char": "号",
      "pinyin": "hào",
      "radicals": []
    },
    {
      "char": "月",
      "pinyin": "yuè",
      "radicals": []
    },
    {
      "char": "年",
      "pinyin": "nián",
      "radicals": []
    },
    {
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
      "char": "百",
      "pinyin": "bǎi",
      "radicals": []
    },
    {
      "char": "了",
      "pinyin": "le",
      "radicals": []
    },
    {
      "char": "苹",
      "pinyin": "píng",
      "radicals": [
        { "r": "艹" },
        { "r": "平" }
      ]
    },
    {
      "char": "果",
      "pinyin": "guǒ",
      "radicals": []
    },
    {
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
      "char": "完",
      "pinyin": "wán",
      "radicals": [
        { "r": "宀" },
        { "r": "元" }
      ]
    },
    {
      "char": "工",
      "pinyin": "gōng",
      "radicals": []
    },
    {
      "char": "作",
      "pinyin": "zuò",
      "radicals": [
        { "r": "亻" },
        { "r": "乍" }
      ]
    },
    {
      "char": "酒",
      "pinyin": "jiǔ",
      "radicals": [
        { "r": "氵" },
        { "r": "酉" }
      ]
    },
    {
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
      "char": "谁",
      "pinyin": "shéi",
      "radicals": [
        { "r": "讠" },
        { "r": "隹" }
      ]
    },
    {
      "char": "为",
      "pinyin": "wèi",
      "radicals": []
    },
    {
      "char": "什",
      "pinyin": "shén",
      "radicals": [
        { "r": "亻" },
        { "r": "十" }
      ]
    },
    {
      "char": "因",
      "pinyin": "yīn",
      "radicals": []
    },
    {
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
      "char": "女",
      "pinyin": "nǚ",
      "radicals": []
    },
    {
      "char": "朋",
      "pinyin": "péng",
      "radicals": []
    },
    {
      "char": "友",
      "pinyin": "yǒu",
      "radicals": []
    },
    {
      "char": "男",
      "pinyin": "nán",
      "radicals": [
        { "r": "田" },
        { "r": "力" }
      ]
    },
    {
      "char": "些",
      "pinyin": "xiē",
      "radicals": []
    }
  ]
];

// "Achata" a lista em um array único, também útil para buscas e contagem total
const HANZI_ALL = HANZI_LESSONS.flat();
