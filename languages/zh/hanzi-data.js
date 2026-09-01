// Banco de dados de caracteres (Hanzi) — extraído automaticamente do vocabulário
// das 14 unidades, agrupado em lições de 5, na ordem de primeira aparição.
//
// Cada caractere tem: pinyin individual, significado principal, e (quando
// aplicável) decomposição de radicais para o mnemônico visual (Opção C).
// Mnemônicos narrativos (Opção A) serão adicionados numa fase posterior,
// só onde a composição contar uma história clara.

const HANZI_LESSONS = [
  // Lição 1
  [
    { char: "你", pinyin: "nǐ", meaning: "você", radicals: [{r:"亻",m:"pessoa"},{r:"尔",m:"tu (fonético)"}] },
    { char: "好", pinyin: "hǎo", meaning: "bom, bem", radicals: [{r:"女",m:"mulher"},{r:"子",m:"filho"}] },
    { char: "再", pinyin: "zài", meaning: "de novo, outra vez", radicals: [] },
    { char: "见", pinyin: "jiàn", meaning: "ver, encontrar", radicals: [] },
    { char: "谢", pinyin: "xiè", meaning: "agradecer", radicals: [{r:"讠",m:"fala"},{r:"射",m:"atirar (fonético)"}] }
  ],
  // Lição 2
  [
    { char: "不", pinyin: "bù", meaning: "não", radicals: [] },
    { char: "客", pinyin: "kè", meaning: "convidado, hóspede", radicals: [{r:"宀",m:"teto/casa"},{r:"各",m:"cada (fonético)"}] },
    { char: "气", pinyin: "qì", meaning: "ar, energia", radicals: [] },
    { char: "对", pinyin: "duì", meaning: "certo, correto; em relação a", radicals: [] },
    { char: "起", pinyin: "qǐ", meaning: "levantar, começar", radicals: [{r:"走",m:"andar"},{r:"己",m:"si mesmo (fonético)"}] }
  ],
  // Lição 3
  [
    { char: "没", pinyin: "méi", meaning: "não ter, não há", radicals: [{r:"氵",m:"água"},{r:"殳",m:"instrumento (fonético)"}] },
    { char: "关", pinyin: "guān", meaning: "fechar; relação", radicals: [] },
    { char: "系", pinyin: "xì", meaning: "sistema, ligação", radicals: [] },
    { char: "早", pinyin: "zǎo", meaning: "cedo, manhã", radicals: [{r:"日",m:"sol"},{r:"十",m:"dez"}] },
    { char: "上", pinyin: "shàng", meaning: "em cima, subir", radicals: [] }
  ],
  // Lição 4
  [
    { char: "晚", pinyin: "wǎn", meaning: "noite, tarde", radicals: [{r:"日",m:"sol"},{r:"免",m:"evitar (fonético)"}] },
    { char: "我", pinyin: "wǒ", meaning: "eu", radicals: [] },
    { char: "叫", pinyin: "jiào", meaning: "chamar-se, gritar", radicals: [{r:"口",m:"boca"},{r:"丩",m:"enroscar (fonético)"}] },
    { char: "名", pinyin: "míng", meaning: "nome", radicals: [{r:"夕",m:"anoitecer"},{r:"口",m:"boca"}] },
    { char: "字", pinyin: "zì", meaning: "caractere, palavra", radicals: [{r:"宀",m:"teto/casa"},{r:"子",m:"filho"}] }
  ],
  // Lição 5
  [
    { char: "是", pinyin: "shì", meaning: "ser, estar", radicals: [] },
    { char: "人", pinyin: "rén", meaning: "pessoa", radicals: [] },
    { char: "巴", pinyin: "bā", meaning: "(parte de Bāxī, Brasil)", radicals: [] },
    { char: "西", pinyin: "xī", meaning: "oeste", radicals: [] },
    { char: "中", pinyin: "zhōng", meaning: "meio, centro", radicals: [] }
  ],
  // Lição 6
  [
    { char: "国", pinyin: "guó", meaning: "país", radicals: [{r:"囗",m:"cercado, fronteira"},{r:"玉",m:"jade (tesouro)"}] },
    { char: "哪", pinyin: "nǎ", meaning: "qual", radicals: [{r:"口",m:"boca"},{r:"那",m:"aquele (fonético)"}] },
    { char: "零", pinyin: "líng", meaning: "zero", radicals: [] },
    { char: "一", pinyin: "yī", meaning: "um", radicals: [] },
    { char: "二", pinyin: "èr", meaning: "dois", radicals: [] }
  ],
  // Lição 7
  [
    { char: "三", pinyin: "sān", meaning: "três", radicals: [] },
    { char: "四", pinyin: "sì", meaning: "quatro", radicals: [] },
    { char: "五", pinyin: "wǔ", meaning: "cinco", radicals: [] },
    { char: "六", pinyin: "liù", meaning: "seis", radicals: [] },
    { char: "七", pinyin: "qī", meaning: "sete", radicals: [] }
  ],
  // Lição 8
  [
    { char: "八", pinyin: "bā", meaning: "oito", radicals: [] },
    { char: "九", pinyin: "jiǔ", meaning: "nove", radicals: [] },
    { char: "十", pinyin: "shí", meaning: "dez", radicals: [] },
    { char: "岁", pinyin: "suì", meaning: "anos (idade)", radicals: [] },
    { char: "多", pinyin: "duō", meaning: "muito, quanto", radicals: [{r:"夕",m:"anoitecer"},{r:"夕",m:"anoitecer (repetido)"}] }
  ],
  // Lição 9
  [
    { char: "大", pinyin: "dà", meaning: "grande", radicals: [] },
    { char: "家", pinyin: "jiā", meaning: "família, casa", radicals: [{r:"宀",m:"teto/casa"},{r:"豕",m:"porco"}] },
    { char: "爸", pinyin: "bà", meaning: "pai", radicals: [{r:"父",m:"pai"},{r:"巴",m:"(fonético)"}] },
    { char: "妈", pinyin: "mā", meaning: "mãe", radicals: [{r:"女",m:"mulher"},{r:"马",m:"cavalo (fonético)"}] },
    { char: "哥", pinyin: "gē", meaning: "irmão mais velho", radicals: [{r:"可",m:"poder (fonético)"},{r:"可",m:"poder (repetido)"}] }
  ],
  // Lição 10
  [
    { char: "弟", pinyin: "dì", meaning: "irmão mais novo", radicals: [] },
    { char: "姐", pinyin: "jiě", meaning: "irmã mais velha", radicals: [{r:"女",m:"mulher"},{r:"且",m:"além disso (fonético)"}] },
    { char: "妹", pinyin: "mèi", meaning: "irmã mais nova", radicals: [{r:"女",m:"mulher"},{r:"未",m:"ainda não (fonético)"}] },
    { char: "孩", pinyin: "hái", meaning: "criança, filho(a)", radicals: [{r:"子",m:"filho"},{r:"亥",m:"(fonético)"}] },
    { char: "子", pinyin: "zǐ", meaning: "filho, criança", radicals: [] }
  ],
  // Lição 11
  [
    { char: "有", pinyin: "yǒu", meaning: "ter, haver", radicals: [] },
    { char: "几", pinyin: "jǐ", meaning: "quantos", radicals: [] },
    { char: "个", pinyin: "gè", meaning: "(classificador geral)", radicals: [] },
    { char: "口", pinyin: "kǒu", meaning: "boca; (classificador p/ pessoas da família)", radicals: [] },
    { char: "吃", pinyin: "chī", meaning: "comer", radicals: [{r:"口",m:"boca"},{r:"乞",m:"mendigar (fonético)"}] }
  ],
  // Lição 12
  [
    { char: "喝", pinyin: "hē", meaning: "beber", radicals: [{r:"口",m:"boca"},{r:"曷",m:"(fonético)"}] },
    { char: "米", pinyin: "mǐ", meaning: "arroz (grão)", radicals: [] },
    { char: "饭", pinyin: "fàn", meaning: "arroz (cozido), refeição", radicals: [{r:"饣",m:"comida"},{r:"反",m:"reverso (fonético)"}] },
    { char: "面", pinyin: "miàn", meaning: "macarrão; rosto", radicals: [] },
    { char: "水", pinyin: "shuǐ", meaning: "água", radicals: [] }
  ],
  // Lição 13
  [
    { char: "茶", pinyin: "chá", meaning: "chá", radicals: [{r:"艹",m:"planta"},{r:"余",m:"restante (fonético)"}] },
    { char: "咖", pinyin: "kā", meaning: "(parte de kāfēi, café)", radicals: [{r:"口",m:"boca"},{r:"加",m:"adicionar (fonético)"}] },
    { char: "啡", pinyin: "fēi", meaning: "(parte de kāfēi, café)", radicals: [{r:"口",m:"boca"},{r:"非",m:"não (fonético)"}] },
    { char: "喜", pinyin: "xǐ", meaning: "gostar, alegria", radicals: [] },
    { char: "欢", pinyin: "huān", meaning: "alegre (em xǐhuan, gostar)", radicals: [] }
  ],
  // Lição 14
  [
    { char: "要", pinyin: "yào", meaning: "querer, precisar", radicals: [] },
    { char: "杯", pinyin: "bēi", meaning: "copo, xícara", radicals: [{r:"木",m:"madeira"},{r:"不",m:"não (fonético)"}] },
    { char: "点", pinyin: "diǎn", meaning: "hora; ponto", radicals: [] },
    { char: "床", pinyin: "chuáng", meaning: "cama", radicals: [{r:"广",m:"abrigo"},{r:"木",m:"madeira"}] },
    { char: "班", pinyin: "bān", meaning: "turno, turma (em shàngbān, trabalhar)", radicals: [] }
  ],
  // Lição 15
  [
    { char: "下", pinyin: "xià", meaning: "embaixo, descer", radicals: [] },
    { char: "睡", pinyin: "shuì", meaning: "dormir", radicals: [{r:"目",m:"olho"},{r:"垂",m:"pendurar (fonético)"}] },
    { char: "觉", pinyin: "jiào", meaning: "sono (em shuìjiào, dormir)", radicals: [] },
    { char: "每", pinyin: "měi", meaning: "cada", radicals: [] },
    { char: "天", pinyin: "tiān", meaning: "dia, céu", radicals: [] }
  ],
  // Lição 16
  [
    { char: "现", pinyin: "xiàn", meaning: "atual, presente", radicals: [{r:"王",m:"jade/rei"},{r:"见",m:"ver (fonético)"}] },
    { char: "在", pinyin: "zài", meaning: "estar (localização); em", radicals: [] },
    { char: "今", pinyin: "jīn", meaning: "hoje, presente", radicals: [] },
    { char: "里", pinyin: "lǐ", meaning: "dentro", radicals: [] },
    { char: "左", pinyin: "zuǒ", meaning: "esquerda", radicals: [] }
  ],
  // Lição 17
  [
    { char: "右", pinyin: "yòu", meaning: "direita", radicals: [] },
    { char: "前", pinyin: "qián", meaning: "frente, antes", radicals: [] },
    { char: "后", pinyin: "hòu", meaning: "atrás, depois", radicals: [] },
    { char: "离", pinyin: "lí", meaning: "distância de, longe de", radicals: [] },
    { char: "近", pinyin: "jìn", meaning: "perto", radicals: [{r:"辶",m:"caminhar"},{r:"斤",m:"machado (fonético)"}] }
  ],
  // Lição 18
  [
    { char: "远", pinyin: "yuǎn", meaning: "longe", radicals: [{r:"辶",m:"caminhar"},{r:"元",m:"origem (fonético)"}] },
    { char: "买", pinyin: "mǎi", meaning: "comprar", radicals: [] },
    { char: "卖", pinyin: "mài", meaning: "vender", radicals: [] },
    { char: "少", pinyin: "shǎo", meaning: "pouco", radicals: [] },
    { char: "钱", pinyin: "qián", meaning: "dinheiro", radicals: [{r:"钅",m:"metal"},{r:"戋",m:"pequeno (fonético)"}] }
  ],
  // Lição 19
  [
    { char: "块", pinyin: "kuài", meaning: "pedaço; unidade monetária", radicals: [{r:"土",m:"terra"},{r:"块",m:"(fonético)"}] },
    { char: "便", pinyin: "pián", meaning: "barato (em piányi)", radicals: [] },
    { char: "宜", pinyin: "yí", meaning: "apropriado (em piányi, barato)", radicals: [{r:"宀",m:"teto/casa"},{r:"且",m:"além disso"}] },
    { char: "贵", pinyin: "guì", meaning: "caro, precioso", radicals: [] },
    { char: "这", pinyin: "zhè", meaning: "este, esta", radicals: [{r:"辶",m:"caminhar"},{r:"文",m:"escrita (fonético)"}] }
  ],
  // Lição 20
  [
    { char: "那", pinyin: "nà", meaning: "aquele, aquela", radicals: [] },
    { char: "衣", pinyin: "yī", meaning: "roupa", radicals: [] },
    { char: "服", pinyin: "fú", meaning: "roupa, vestir (em yīfu)", radicals: [] },
    { char: "鞋", pinyin: "xié", meaning: "sapato", radicals: [{r:"革",m:"couro"},{r:"圭",m:"jade (fonético)"}] },
    { char: "热", pinyin: "rè", meaning: "quente", radicals: [{r:"扌",m:"mão"},{r:"灬",m:"fogo"}] }
  ],
  // Lição 21
  [
    { char: "冷", pinyin: "lěng", meaning: "frio", radicals: [{r:"冫",m:"gelo"},{r:"令",m:"ordem (fonético)"}] },
    { char: "雨", pinyin: "yǔ", meaning: "chuva", radicals: [] },
    { char: "晴", pinyin: "qíng", meaning: "ensolarado", radicals: [{r:"日",m:"sol"},{r:"青",m:"verde-azulado (fonético)"}] },
    { char: "阴", pinyin: "yīn", meaning: "nublado, sombrio", radicals: [] },
    { char: "风", pinyin: "fēng", meaning: "vento", radicals: [] }
  ],
  // Lição 22
  [
    { char: "怎", pinyin: "zěn", meaning: "como (em zěnme)", radicals: [] },
    { char: "么", pinyin: "me", meaning: "(partícula interrogativa)", radicals: [] },
    { char: "样", pinyin: "yàng", meaning: "tipo, aparência", radicals: [{r:"木",m:"madeira"},{r:"羊",m:"ovelha (fonético)"}] },
    { char: "公", pinyin: "gōng", meaning: "público", radicals: [] },
    { char: "共", pinyin: "gòng", meaning: "comum, junto", radicals: [] }
  ],
  // Lição 23
  [
    { char: "汽", pinyin: "qì", meaning: "vapor (em qìchē, carro)", radicals: [{r:"氵",m:"água"},{r:"气",m:"ar (fonético)"}] },
    { char: "车", pinyin: "chē", meaning: "carro, veículo", radicals: [] },
    { char: "地", pinyin: "dì", meaning: "terra, chão (em dìtiě, metrô)", radicals: [{r:"土",m:"terra"},{r:"也",m:"também (fonético)"}] },
    { char: "铁", pinyin: "tiě", meaning: "ferro (em dìtiě, metrô)", radicals: [{r:"钅",m:"metal"},{r:"失",m:"perder (fonético)"}] },
    { char: "出", pinyin: "chū", meaning: "sair", radicals: [] }
  ],
  // Lição 24
  [
    { char: "租", pinyin: "zū", meaning: "alugar (em chūzūchē, táxi)", radicals: [{r:"禾",m:"cereal"},{r:"且",m:"além disso (fonético)"}] },
    { char: "走", pinyin: "zǒu", meaning: "andar, ir a pé", radicals: [] },
    { char: "路", pinyin: "lù", meaning: "caminho, estrada", radicals: [{r:"足",m:"pé"},{r:"各",m:"cada (fonético)"}] },
    { char: "去", pinyin: "qù", meaning: "ir", radicals: [] },
    { char: "站", pinyin: "zhàn", meaning: "estação, parada", radicals: [{r:"立",m:"ficar de pé"},{r:"占",m:"ocupar (fonético)"}] }
  ],
  // Lição 25
  [
    { char: "票", pinyin: "piào", meaning: "bilhete, passagem", radicals: [] },
    { char: "张", pinyin: "zhāng", meaning: "(classificador p/ objetos planos)", radicals: [{r:"弓",m:"arco"},{r:"长",m:"longo (fonético)"}] },
    { char: "身", pinyin: "shēn", meaning: "corpo", radicals: [] },
    { char: "体", pinyin: "tǐ", meaning: "corpo (em shēntǐ)", radicals: [{r:"亻",m:"pessoa"},{r:"本",m:"raiz/origem"}] },
    { char: "头", pinyin: "tóu", meaning: "cabeça", radicals: [] }
  ],
  // Lição 26
  [
    { char: "肚", pinyin: "dù", meaning: "barriga", radicals: [{r:"月",m:"carne/corpo"},{r:"土",m:"terra (fonético)"}] },
    { char: "疼", pinyin: "téng", meaning: "doer", radicals: [{r:"疒",m:"doença"},{r:"冬",m:"inverno (fonético)"}] },
    { char: "生", pinyin: "shēng", meaning: "nascer, vida (em shēngbìng, ficar doente)", radicals: [] },
    { char: "病", pinyin: "bìng", meaning: "doença", radicals: [{r:"疒",m:"doença"},{r:"丙",m:"terceiro (fonético)"}] },
    { char: "医", pinyin: "yī", meaning: "medicina, médico", radicals: [] }
  ],
  // Lição 27
  [
    { char: "院", pinyin: "yuàn", meaning: "pátio, instituição (em yīyuàn, hospital)", radicals: [{r:"阝",m:"colina/lugar"},{r:"完",m:"completo (fonético)"}] },
    { char: "舒", pinyin: "shū", meaning: "confortável (em bù shūfu)", radicals: [] },
    { char: "爱", pinyin: "ài", meaning: "amor, gostar muito", radicals: [] },
    { char: "看", pinyin: "kàn", meaning: "ver, assistir", radicals: [{r:"手",m:"mão"},{r:"目",m:"olho"}] },
    { char: "书", pinyin: "shū", meaning: "livro", radicals: [] }
  ],
  // Lição 28
  [
    { char: "听", pinyin: "tīng", meaning: "ouvir", radicals: [{r:"口",m:"boca"},{r:"斤",m:"machado (fonético)"}] },
    { char: "音", pinyin: "yīn", meaning: "som", radicals: [] },
    { char: "乐", pinyin: "yuè", meaning: "música (em yīnyuè)", radicals: [] },
    { char: "电", pinyin: "diàn", meaning: "eletricidade", radicals: [] },
    { char: "影", pinyin: "yǐng", meaning: "sombra, filme (em diànyǐng)", radicals: [] }
  ],
  // Lição 29
  [
    { char: "运", pinyin: "yùn", meaning: "mover, sorte (em yùndòng, esporte)", radicals: [{r:"辶",m:"caminhar"},{r:"云",m:"nuvem (fonético)"}] },
    { char: "动", pinyin: "dòng", meaning: "mover (em yùndòng, esporte)", radicals: [] },
    { char: "唱", pinyin: "chàng", meaning: "cantar", radicals: [{r:"口",m:"boca"},{r:"昌",m:"próspero (fonético)"}] },
    { char: "歌", pinyin: "gē", meaning: "canção", radicals: [] },
    { char: "跳", pinyin: "tiào", meaning: "pular, dançar", radicals: [{r:"足",m:"pé"},{r:"兆",m:"presságio (fonético)"}] }
  ],
  // Lição 30
  [
    { char: "舞", pinyin: "wǔ", meaning: "dança (em tiàowǔ)", radicals: [] },
    { char: "空", pinyin: "kòng", meaning: "vazio, tempo livre (em yǒu kòng)", radicals: [{r:"穴",m:"caverna/buraco"},{r:"工",m:"trabalho (fonético)"}] },
    { char: "打", pinyin: "dǎ", meaning: "bater, fazer (em dǎsuàn, planejar)", radicals: [{r:"扌",m:"mão"},{r:"丁",m:"prego (fonético)"}] },
    { char: "算", pinyin: "suàn", meaning: "calcular, planejar (em dǎsuàn)", radicals: [] },
    { char: "明", pinyin: "míng", meaning: "claro, amanhã (em míngtiān)", radicals: [{r:"日",m:"sol"},{r:"月",m:"lua"}] }
  ],
  // Lição 31
  [
    { char: "星", pinyin: "xīng", meaning: "estrela (em xīngqī, semana)", radicals: [{r:"日",m:"sol"},{r:"生",m:"nascer (fonético)"}] },
    { char: "期", pinyin: "qī", meaning: "período (em xīngqī, semana)", radicals: [] },
    { char: "旅", pinyin: "lǚ", meaning: "viajar", radicals: [] },
    { char: "游", pinyin: "yóu", meaning: "passear, nadar (em lǚyóu, viajar)", radicals: [{r:"氵",m:"água"},{r:"斿",m:"(fonético)"}] },
    { char: "学", pinyin: "xué", meaning: "estudar, aprender", radicals: [] }
  ],
  // Lição 32
  [
    { char: "习", pinyin: "xí", meaning: "praticar (em xuéxí, estudar)", radicals: [] },
    { char: "计", pinyin: "jì", meaning: "calcular, plano (em jìhuà)", radicals: [{r:"讠",m:"fala"},{r:"十",m:"dez (fonético)"}] },
    { char: "划", pinyin: "huà", meaning: "planejar (em jìhuà, plano)", radicals: [] },
    { char: "以", pinyin: "yǐ", meaning: "com, por meio de (em yǐhòu, depois)", radicals: [] },
    { char: "比", pinyin: "bǐ", meaning: "comparar, mais que", radicals: [] }
  ],
  // Lição 33
  [
    { char: "更", pinyin: "gèng", meaning: "ainda mais", radicals: [] },
    { char: "最", pinyin: "zuì", meaning: "o mais (superlativo)", radicals: [] },
    { char: "还", pinyin: "hái", meaning: "ainda; ou (em háishi)", radicals: [{r:"辶",m:"caminhar"},{r:"不",m:"não (fonético)"}] }
  ],
  // Lição 34
  [
    { char: "高", pinyin: "gāo", meaning: "alto", radicals: [] },
    { char: "毛", pinyin: "máo", meaning: "pelo; centavo (1/10 do kuài)", radicals: [] },
    { char: "想", pinyin: "xiǎng", meaning: "querer, pensar em", radicals: [{r:"相",m:"mútuo (fonético)"},{r:"心",m:"coração"}] },
    { char: "会", pinyin: "huì", meaning: "saber fazer (habilidade aprendida)", radicals: [] },
    { char: "能", pinyin: "néng", meaning: "conseguir, poder", radicals: [] }
  ],
  // Lição 35
  [
    { char: "请", pinyin: "qǐng", meaning: "por favor, convidar", radicals: [{r:"讠",m:"fala"},{r:"青",m:"verde-azulado (fonético)"}] },
    { char: "坐", pinyin: "zuò", meaning: "sentar", radicals: [{r:"人",m:"pessoa"},{r:"土",m:"terra"}] },
    { char: "都", pinyin: "dōu", meaning: "todos, ambos", radicals: [] },
    { char: "也", pinyin: "yě", meaning: "também", radicals: [] },
    { char: "说", pinyin: "shuō", meaning: "falar", radicals: [{r:"讠",m:"fala"},{r:"兑",m:"trocar (fonético)"}] }
  ],
  // Lição 36
  [
    { char: "来", pinyin: "lái", meaning: "vir", radicals: [] },
    { char: "号", pinyin: "hào", meaning: "dia do mês (uso falado)", radicals: [] },
    { char: "月", pinyin: "yuè", meaning: "mês; lua", radicals: [] },
    { char: "年", pinyin: "nián", meaning: "ano", radicals: [] },
    { char: "分", pinyin: "fēn", meaning: "minuto; dividir", radicals: [{r:"八",m:"dividir/oito"},{r:"刀",m:"faca"}] }
  ],
  // Lição 37
  [
    { char: "百", pinyin: "bǎi", meaning: "cem", radicals: [] },
    { char: "了", pinyin: "le", meaning: "partícula de conclusão/mudança de estado", radicals: [] },
    { char: "苹", pinyin: "píng", meaning: "(parte de píngguǒ, maçã)", radicals: [{r:"艹",m:"planta"},{r:"平",m:"plano (fonético)"}] },
    { char: "果", pinyin: "guǒ", meaning: "fruta; resultado (em píngguǒ, maçã)", radicals: [] },
    { char: "昨", pinyin: "zuó", meaning: "ontem (em zuótiān)", radicals: [{r:"日",m:"sol"},{r:"乍",m:"de repente (fonético)"}] }
  ],
  // Lição 38
  [
    { char: "完", pinyin: "wán", meaning: "terminar, acabar", radicals: [{r:"宀",m:"teto/casa"},{r:"元",m:"origem (fonético)"}] },
    { char: "工", pinyin: "gōng", meaning: "trabalho (em gōngzuò)", radicals: [] },
    { char: "作", pinyin: "zuò", meaning: "fazer, trabalhar (em gōngzuò)", radicals: [{r:"亻",m:"pessoa"},{r:"乍",m:"de repente (fonético)"}] },
    { char: "酒", pinyin: "jiǔ", meaning: "álcool, bebida alcoólica", radicals: [{r:"氵",m:"água"},{r:"酉",m:"jarro de vinho"}] },
    { char: "吧", pinyin: "ba", meaning: "partícula de sugestão; bar (em jiǔbā)", radicals: [{r:"口",m:"boca"},{r:"巴",m:"(fonético)"}] }
  ],
  // Lição 39
  [
    { char: "谁", pinyin: "shéi", meaning: "quem", radicals: [{r:"讠",m:"fala"},{r:"隹",m:"pássaro (fonético)"}] },
    { char: "为", pinyin: "wèi", meaning: "para, por (em wèishénme, por quê)", radicals: [] },
    { char: "什", pinyin: "shén", meaning: "que (em shénme/wèishénme)", radicals: [{r:"亻",m:"pessoa"},{r:"十",m:"dez"}] },
    { char: "因", pinyin: "yīn", meaning: "causa (em yīnwèi, porque)", radicals: [] },
    { char: "校", pinyin: "xiào", meaning: "escola (em xuéxiào)", radicals: [{r:"木",m:"madeira"},{r:"交",m:"trocar (fonético)"}] }
  ],
  // Lição 40
  [
    { char: "女", pinyin: "nǚ", meaning: "mulher (em nǚpéngyou, namorada)", radicals: [] },
    { char: "朋", pinyin: "péng", meaning: "amigo (em péngyou)", radicals: [] },
    { char: "友", pinyin: "yǒu", meaning: "amigo (em péngyou)", radicals: [] },
    { char: "男", pinyin: "nán", meaning: "homem (em nánpéngyou, namorado)", radicals: [{r:"田",m:"campo"},{r:"力",m:"força"}] },
    { char: "些", pinyin: "xiē", meaning: "alguns, um pouco (em yìxiē)", radicals: [] }
  ]
];

// "Achata" a lista em um array único, também útil para buscas e contagem total
const HANZI_ALL = HANZI_LESSONS.flat();
