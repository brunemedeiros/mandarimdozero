// Banco de conteúdo — Mandarim do Zero (Nível Iniciante / HSK 1)
// 14 unidades, cada uma com objetivo comunicacional, vocabulário, frases-modelo e diálogo.

// Hoje só existe o Nível 1 -- preparado pra crescer quando os próximos
// níveis do HSK forem adicionados (mesmo padrão de LEVELS do francês, ver
// shared/wizard.js).
const LEVELS = [
  { id: "HSK1", label: "Nível 1 · Iniciante" }
];

const UNITS = [
  {
    id: 1,
    level: "HSK1",
    title: "Cumprimentar e se despedir",
    goal: "Cumprimentar alguém, se despedir e agradecer numa interação básica.",
    usageNote: { title: "\"Duìbuqǐ\" ou \"méi guānxi\"?", body: "<strong>Duìbuqǐ</strong> (对不起) é quem pede desculpa. <strong>Méi guānxi</strong> (没关系) é a resposta de quem recebe o pedido de desculpa — \"tudo bem, não tem problema\". São as duas metades de uma mesma troca, não sinônimos: nunca se usa méi guānxi pra pedir desculpa, nem duìbuqǐ pra tranquilizar alguém." },
    trueFalseExercises: [{ subject: "谢谢", pinyin: "xièxiè", emoji: "🎁", claim: "Isto é o que dizemos quando recebemos um presente de outra pessoa.", answer: true,
      whyNote: "Correto — <strong>谢谢 (xièxiè)</strong> é \"obrigado(a)\", usado sempre que alguém faz algo por você, incluindo dar um presente." }],
    vocab: [
      { p: "nǐ hǎo", c: "你好", t: "olá" },
      { p: "zài jiàn", c: "再见", t: "tchau / até logo" },
      { p: "xiè xiè", c: "谢谢", t: "obrigado(a)" },
      { p: "bú kè qi", c: "不客气", t: "de nada" },
      { p: "duì bu qǐ", c: "对不起", t: "desculpe" },
      { p: "méi guān xi", c: "没关系", t: "tudo bem / não tem problema" },
      { p: "zǎo shang hǎo", c: "早上好", t: "bom dia" },
      { p: "wǎn shang hǎo", c: "晚上好", t: "boa noite (saudação)" }
    ],
    phrases: [
      { p: "Nǐ hǎo! Wǒ jiào Brune.", c: "你好！我叫Brune。", t: "Olá! Eu me chamo Brune.",
        blocks: [{p:"Nǐ hǎo!",c:"你好！"},{p:"Wǒ jiào",c:"我叫"},{p:"Brune.",c:"Brune。"}] },
      { p: "Xiè xiè nǐ!", c: "谢谢你！", t: "Obrigada!",
        blocks: [{p:"Xiè xiè",c:"谢谢"},{p:"nǐ!",c:"你！"}] },
      { p: "Duì bu qǐ, wǒ bù dǒng.", c: "对不起，我不懂。", t: "Desculpe, eu não entendo.",
        blocks: [{p:"Duì bu qǐ,",c:"对不起，"},{p:"wǒ",c:"我"},{p:"bù dǒng.",c:"不懂。"}] },
      { p: "Shì a! Wǒ yě shì.", c: "是啊！我也是。", t: "Ah, sim! Eu também.",
        blocks: [{p:"Shì a!",c:"是啊！"},{p:"Wǒ yě",c:"我也"},{p:"shì.",c:"是。"}] }
    ],
    dialogue: {
      title: "Encontro na rua",
      lines: [
        { spk: "A", p: "Nǐ hǎo!", c: "你好！", t: "Olá!" },
        { spk: "B", p: "Nǐ hǎo! Zǎo shang hǎo.", c: "你好！早上好。", t: "Olá! Bom dia." },
        { spk: "A", p: "Xiè xiè, zài jiàn!", c: "谢谢，再见！", t: "Obrigada, até logo!" },
        { spk: "B", p: "Zài jiàn!", c: "再见！", t: "Até logo!" }
      ]
    }
  },
  {
    id: 2,
    level: "HSK1",
    title: "Se apresentar",
    goal: "Dizer o nome, nacionalidade e perguntar o mesmo para o outro.",
    usageNote: { title: "\"Wǒ shì Bāxī rén\" ou \"wǒ jiào Brune\"?", body: "<strong>Shì</strong> (是) liga você a uma categoria — nacionalidade, profissão, identidade: wǒ <strong>shì</strong> Bāxī rén (eu sou brasileira). <strong>Jiào</strong> (叫) é usado só pra dizer o nome: wǒ <strong>jiào</strong> Brune (eu me chamo Brune). Repare que \"eu me chamo\" nunca usa shì em chinês — só jiào." },
    trueFalseExercises: [{ subject: "你叫什么名字？", pinyin: "nǐ jiào shénme míngzi?", emoji: "🙋", claim: "Essa pergunta serve pra saber a nacionalidade de alguém.", answer: false,
      whyNote: "Errado — <strong>你叫什么名字？</strong> pergunta o NOME (叫 = chamar-se, 名字 = nome), não a nacionalidade. Nacionalidade seria \"你是哪国人？\"." }],
    vocab: [
      { p: "wǒ", c: "我", t: "eu" },
      { p: "nǐ", c: "你", t: "você" },
      { p: "jiào", c: "叫", t: "chamar-se" },
      { p: "míngzi", c: "名字", t: "nome" },
      { p: "shì", c: "是", t: "ser/estar" },
      { p: "rén", c: "人", t: "pessoa" },
      { p: "Bāxī", c: "巴西", t: "Brasil" },
      { p: "Zhōngguó", c: "中国", t: "China" },
      { p: "nǎ", c: "哪", t: "qual" },
      { p: "guó", c: "国", t: "país" }
    ],
    phrases: [
      { p: "Nǐ jiào shénme míngzi?", c: "你叫什么名字？", t: "Qual é o seu nome?",
        blocks: [{p:"Nǐ",c:"你"},{p:"jiào",c:"叫"},{p:"shénme míngzi?",c:"什么名字？"}] },
      { p: "Wǒ shì Bāxī rén.", c: "我是巴西人。", t: "Eu sou brasileira.",
        blocks: [{p:"Wǒ",c:"我"},{p:"shì",c:"是"},{p:"Bāxī rén.",c:"巴西人。"}] },
      { p: "Nǐ shì nǎ guó rén?", c: "你是哪国人？", t: "De que país você é?",
        blocks: [{p:"Nǐ",c:"你"},{p:"shì",c:"是"},{p:"nǎ guó rén?",c:"哪国人？"}] }
    ],
    dialogue: {
      title: "Primeiro encontro",
      lines: [
        { spk: "A", p: "Nǐ hǎo, nǐ jiào shénme míngzi?", c: "你好，你叫什么名字？", t: "Olá, qual é o seu nome?" },
        { spk: "B", p: "Wǒ jiào Brune. Nǐ ne?", c: "我叫Brune。你呢？", t: "Eu me chamo Brune. E você?" },
        { spk: "A", p: "Wǒ jiào Xiǎo Lǐ. Nǐ shì nǎ guó rén?", c: "我叫小李。你是哪国人？", t: "Eu me chamo Xiao Li. De que país você é?" },
        { spk: "B", p: "Wǒ shì Bāxī rén.", c: "我是巴西人。", t: "Eu sou brasileira." }
      ]
    }
  },
  {
    id: 3,
    level: "HSK1",
    title: "Números e idade",
    goal: "Contar de 0 a 100 e dizer/perguntar a idade.",
    usageNote: { title: "\"Nǐ jǐ suì\" ou \"nǐ duō dà\"?", body: "<strong>Jǐ suì</strong> (几岁) é usado pra perguntar a idade de <strong>crianças</strong>, já que 几 espera um número pequeno. Pra adultos, a forma neutra e mais comum é <strong>duō dà</strong> (多大) — perguntar \"jǐ suì\" pra um adulto pode soar estranho, como se você esperasse um número de um dígito só." },
    vocab: [
      { p: "líng", c: "零", t: "zero" },
      { p: "yī", c: "一", t: "um" },
      { p: "èr", c: "二", t: "dois" },
      { p: "sān", c: "三", t: "três" },
      { p: "sì", c: "四", t: "quatro" },
      { p: "wǔ", c: "五", t: "cinco" },
      { p: "liù", c: "六", t: "seis" },
      { p: "qī", c: "七", t: "sete" },
      { p: "bā", c: "八", t: "oito" },
      { p: "jiǔ", c: "九", t: "nove" },
      { p: "shí", c: "十", t: "dez" },
      { p: "suì", c: "岁", t: "anos (idade)" },
      { p: "duō dà", c: "多大", t: "quantos anos" },
      { p: "gāo", c: "高", t: "alto" }
    ],
    phrases: [
      { p: "Nǐ jǐ suì? / Nǐ duō dà?", c: "你几岁？/ 你多大？", t: "Quantos anos você tem?",
        blocks: [{p:"Nǐ",c:"你"},{p:"jǐ suì?",c:"几岁？"}] },
      { p: "Wǒ èr shí bā suì.", c: "我二十八岁。", t: "Eu tenho 28 anos.",
        blocks: [{p:"Wǒ",c:"我"},{p:"èr shí bā",c:"二十八"},{p:"suì.",c:"岁。"}] },
      { p: "Tā duō gāo?", c: "他多高？", t: "Quão alto ele é?",
        blocks: [{p:"Tā",c:"他"},{p:"duō gāo?",c:"多高？"}] }
    ],
    dialogue: {
      title: "Perguntando a idade",
      lines: [
        { spk: "A", p: "Nǐ duō dà?", c: "你多大？", t: "Quantos anos você tem?" },
        { spk: "B", p: "Wǒ èr shí bā suì. Nǐ ne?", c: "我二十八岁。你呢？", t: "Eu tenho 28 anos. E você?" },
        { spk: "A", p: "Wǒ sān shí suì.", c: "我三十岁。", t: "Eu tenho 30 anos." }
      ]
    }
  },
  {
    id: 4,
    level: "HSK1",
    title: "Família",
    goal: "Apresentar membros da família e falar quantas pessoas há na família.",
    // Explicação contextual (não mais "Dicas e Notas" avulso): cada conceito
    // dispara no momento em que se torna relevante, não num manual à parte.
    // `trigger.afterVocabIdx` dispara ao fim do BLOCO de aquisição que contém
    // aquele índice de vocab (antes da checagem do bloco); `trigger.after:
    // 'dialogue'` dispara ao concluir o passo de diálogo, antes do próximo
    // passo. Ver `runConceptQueueThen`/`pendingConceptsForBlock` no app.js.
    concepts: [
      {
        id: "classifiers",
        trigger: { afterVocabIdx: 11 },
        blocks: [
          {
            title: "一个人, não só \"um rén\"",
            body: "Em chinês, um número quase nunca fica colado direto num substantivo — entre os dois entra um <strong>classificador</strong> (uma espécie de \"medida\"). 个 (gè) é o classificador mais genérico, usado pra pessoas e muita coisa em geral.",
            examples: [
              { c: "一个人", p: "yí gè rén", t: "uma pessoa" },
              { c: "一个姐姐", p: "yí gè jiějie", t: "uma irmã mais velha" }
            ]
          },
          {
            title: "个 (gè) ou 口 (kǒu)?",
            body: "Pra contar pessoas em geral, 个 já resolve. Mas pra contar quantas pessoas moram numa mesma casa, o chinês tem um classificador específico: <strong>kǒu</strong> (口, literalmente \"boca\") — só nesse contexto de família.",
            examples: [
              { c: "几口人？", p: "jǐ kǒu rén?", t: "quantas pessoas? (contexto família)" }
            ],
            wrapup: true
          }
        ]
      },
      {
        id: "you",
        trigger: { afterVocabIdx: 8 },
        blocks: [
          {
            title: "有 (yǒu) — \"ter\" / \"haver\"",
            body: "有 (yǒu) é o verbo usado tanto pra dizer que alguém possui algo quanto pra dizer que algo existe. Estrutura simples: Sujeito + 有 + Objeto.",
            examples: [
              { c: "我有一个姐姐。", p: "Wǒ yǒu yí gè jiějie.", t: "Eu tenho uma irmã mais velha." }
            ],
            wrapup: true
          }
        ]
      },
      {
        id: "he",
        trigger: { after: "dialogue" },
        blocks: [
          {
            title: "和 (hé) — juntando substantivos",
            body: "和 (hé) equivale a \"e\", mas só junta substantivos entre si — nunca frases inteiras. Pra ligar duas frases completas, o chinês normalmente nem usa palavra de ligação nenhuma.",
            examples: [
              { c: "爸爸和妈妈", p: "bàba hé māma", t: "pai e mãe" }
            ],
            wrapup: true
          }
        ]
      },
      {
        id: "meiyou",
        trigger: { after: "dialogue" },
        blocks: [
          {
            title: "没(有) — negando \"ter\"",
            body: "Pra negar 有 (ter), o chinês não usa 不 — usa 没 ou 没有, especialmente pra isso. É uma das poucas exceções à regra geral de negação com 不.",
            examples: [
              { c: "我没有妹妹。", p: "Wǒ méiyǒu mèimei.", t: "Eu não tenho irmã mais nova." }
            ],
            wrapup: true
          }
        ]
      }
    ],
    vocab: [
      { p: "jiā", c: "家", t: "família / casa" },
      { p: "bàba", c: "爸爸", t: "pai" },
      { p: "māma", c: "妈妈", t: "mãe" },
      { p: "gēge", c: "哥哥", t: "irmão mais velho" },
      { p: "dìdi", c: "弟弟", t: "irmão mais novo" },
      { p: "jiějie", c: "姐姐", t: "irmã mais velha" },
      { p: "mèimei", c: "妹妹", t: "irmã mais nova" },
      { p: "háizi", c: "孩子", t: "filho(a)/criança" },
      { p: "yǒu", c: "有", t: "ter/haver" },
      { p: "jǐ", c: "几", t: "quantos" },
      { p: "yí gè jiějie", c: "一个姐姐", t: "uma irmã mais velha (个 em contexto)" },
      { p: "jǐ kǒu rén", c: "几口人", t: "quantas pessoas (口 em contexto)" }
    ],
    phrases: [
      { p: "Nǐ jiā yǒu jǐ kǒu rén?", c: "你家有几口人？", t: "Quantas pessoas há na sua família?",
        blocks: [{p:"Nǐ jiā",c:"你家"},{p:"yǒu",c:"有"},{p:"jǐ kǒu rén?",c:"几口人？"}] },
      { p: "Wǒ yǒu yí gè jiějie.", c: "我有一个姐姐。", t: "Eu tenho uma irmã mais velha.",
        blocks: [{p:"Wǒ",c:"我"},{p:"yǒu",c:"有"},{p:"yí gè jiějie.",c:"一个姐姐。"}] }
    ],
    dialogue: {
      title: "Falando da família",
      lines: [
        { spk: "A", p: "Nǐ jiā yǒu jǐ kǒu rén?", c: "你家有几口人？", t: "Quantas pessoas há na sua família?" },
        { spk: "B", p: "Wǒ jiā yǒu sì kǒu rén: bàba, māma, gēge hé wǒ.", c: "我家有四口人：爸爸，妈妈，哥哥和我。", t: "Minha família tem 4 pessoas: pai, mãe, irmão mais velho e eu." },
        { spk: "A", p: "Nǐ yǒu mèimei ma?", c: "你有妹妹吗？", t: "Você tem irmã mais nova?" },
        { spk: "B", p: "Méiyǒu, wǒ méiyǒu mèimei.", c: "没有，我没有妹妹。", t: "Não, eu não tenho irmã mais nova." }
      ]
    }
  },
  {
    id: 5,
    level: "HSK1",
    title: "Comida e bebida",
    goal: "Pedir comida/bebida num restaurante e expressar preferências simples.",
    usageNote: { title: "\"Xǐhuan\" ou \"yào\"?", body: "<strong>Xǐhuan</strong> (喜欢) é gostar de algo em geral, uma preferência: wǒ <strong>xǐhuan</strong> hē kāfēi (eu gosto de beber café, como hábito). <strong>Yào</strong> (要) é querer algo específico, agora: wǒ <strong>yào</strong> yì bēi chá (eu quero uma xícara de chá, nesse momento). Um fala de gosto, o outro de pedido." },
    trueFalseExercises: [{ subject: "我要一杯茶。", pinyin: "wǒ yào yì bēi chá.", emoji: "☕", claim: "Essa frase é usada pra pedir algo num restaurante ou café.", answer: true,
      whyNote: "Correto — <strong>我要...(wǒ yào)</strong> significa \"eu quero\", usado pra pedir algo num restaurante ou café; aqui, \"uma xícara de chá\"." }],
    vocab: [
      { p: "chī", c: "吃", t: "comer" },
      { p: "hē", c: "喝", t: "beber" },
      { p: "mǐfàn", c: "米饭", t: "arroz" },
      { p: "miàn", c: "面", t: "macarrão" },
      { p: "shuǐ", c: "水", t: "água" },
      { p: "chá", c: "茶", t: "chá" },
      { p: "kāfēi", c: "咖啡", t: "café" },
      { p: "hǎo chī", c: "好吃", t: "gostoso (comida)" },
      { p: "xǐhuan", c: "喜欢", t: "gostar" },
      { p: "yào", c: "要", t: "querer" },
      { p: "yì bēi chá", c: "一杯茶", t: "uma xícara de chá (杯 em contexto)" }
    ],
    phrases: [
      { p: "Wǒ yào yì bēi chá.", c: "我要一杯茶。", t: "Eu quero uma xícara de chá.",
        blocks: [{p:"Wǒ",c:"我"},{p:"yào",c:"要"},{p:"yì bēi chá.",c:"一杯茶。"}] },
      { p: "Zhège hěn hǎo chī!", c: "这个很好吃！", t: "Isso está muito gostoso!",
        blocks: [{p:"Zhège",c:"这个"},{p:"hěn",c:"很"},{p:"hǎo chī!",c:"好吃！"}] },
      { p: "Wǒ xǐhuan hē kāfēi.", c: "我喜欢喝咖啡。", t: "Eu gosto de beber café.",
        blocks: [{p:"Wǒ",c:"我"},{p:"xǐhuan",c:"喜欢"},{p:"hē kāfēi.",c:"喝咖啡。"}] }
    ],
    dialogue: {
      title: "No restaurante",
      lines: [
        { spk: "Garçom", p: "Nǐ hǎo, nǐ yào chī shénme?", c: "你好，你要吃什么？", t: "Olá, o que você quer comer?" },
        { spk: "Brune", p: "Wǒ yào mǐfàn hé chá.", c: "我要米饭和茶。", t: "Eu quero arroz e chá." },
        { spk: "Garçom", p: "Hǎo de. Nǐ yào hē kāfēi ma?", c: "好的。你要喝咖啡吗？", t: "Certo. Você quer beber café?" },
        { spk: "Brune", p: "Bú yào, xièxiè. Wǒ xǐhuan hē chá.", c: "不要，谢谢。我喜欢喝茶。", t: "Não, obrigada. Eu gosto de beber chá." }
      ]
    }
  },
  {
    id: 6,
    level: "HSK1",
    title: "Rotina diária",
    goal: "Descrever atividades do dia a dia e dizer as horas.",
    usageNote: { title: "\"Měitiān\" ou \"xiànzài\"?", body: "<strong>Měitiān</strong> (每天, todos os dias) marca um hábito, algo que se repete. <strong>Xiànzài</strong> (现在, agora) marca o momento presente, muitas vezes usado com <strong>zài</strong> antes do verbo pra dizer que a ação está acontecendo neste instante: wǒ <strong>zài</strong> chīfàn (estou comendo agora). Repare que esse \"zài\" de \"estar fazendo algo\" é diferente do \"zài\" de localização (você vai ver isso na próxima unidade)." },
    vocab: [
      { p: "diǎn", c: "点", t: "hora(s)" },
      { p: "qǐchuáng", c: "起床", t: "levantar (da cama)" },
      { p: "shàngbān", c: "上班", t: "ir trabalhar" },
      { p: "xiàbān", c: "下班", t: "sair do trabalho" },
      { p: "shuìjiào", c: "睡觉", t: "dormir" },
      { p: "měitiān", c: "每天", t: "todos os dias" },
      { p: "xiànzài", c: "现在", t: "agora" },
      { p: "jīntiān", c: "今天", t: "hoje" },
      { p: "méiyǒu", c: "没有", t: "não ter / não há" }
    ],
    phrases: [
      { p: "Wǒ měitiān qī diǎn qǐchuáng.", c: "我每天七点起床。", t: "Eu levanto às sete horas todos os dias.",
        blocks: [{p:"Wǒ měitiān",c:"我每天"},{p:"qī diǎn",c:"七点"},{p:"qǐchuáng.",c:"起床。"}] },
      { p: "Xiànzài jǐ diǎn?", c: "现在几点？", t: "Que horas são agora?",
        blocks: [{p:"Xiànzài",c:"现在"},{p:"jǐ diǎn?",c:"几点？"}] },
      { p: "Wǒ zhèngzài chī fàn.", c: "我正在吃饭。", t: "Eu estou comendo agora.",
        blocks: [{p:"Wǒ zhèngzài",c:"我正在"},{p:"chī fàn.",c:"吃饭。"}] }
    ],
    dialogue: {
      title: "Perguntando sobre a rotina",
      lines: [
        { spk: "A", p: "Nǐ měitiān jǐ diǎn qǐchuáng?", c: "你每天几点起床？", t: "Que horas você levanta todos os dias?" },
        { spk: "B", p: "Wǒ měitiān qī diǎn qǐchuáng, bā diǎn shàngbān.", c: "我每天七点起床，八点上班。", t: "Eu levanto às 7h e vou trabalhar às 8h todos os dias." },
        { spk: "A", p: "Jīntiān nǐ jǐ diǎn xiàbān?", c: "今天你几点下班？", t: "Que horas você sai do trabalho hoje?" },
        { spk: "B", p: "Jīntiān wǔ diǎn xiàbān.", c: "今天五点下班。", t: "Hoje eu saio às 5h." }
      ]
    }
  },
  {
    id: 7,
    level: "HSK1",
    title: "Direções e localização",
    goal: "Perguntar e entender direções básicas, localizar lugares.",
    usageNote: { title: "\"Zài\" ou \"lí\"?", body: "<strong>Zài</strong> (在) diz <strong>onde algo está</strong>: cèsuǒ <strong>zài</strong> nǎlǐ? (onde fica o banheiro?). <strong>Lí</strong> (离) diz a <strong>distância entre dois lugares</strong>, sempre comparando um ponto de referência: yīyuàn <strong>lí</strong> zhèlǐ hěn jìn (o hospital fica perto daqui). Zài localiza um lugar sozinho; lí sempre compara dois." },
    trueFalseExercises: [{ subject: "厕所在哪里？", pinyin: "cèsuǒ zài nǎlǐ?", emoji: "🚻", claim: "Essa pergunta é sobre o preço de um produto.", answer: false,
      whyNote: "Errado — <strong>厕所在哪里？</strong> pergunta ONDE fica o banheiro (在哪里 = onde fica), não o preço. Preço seria \"多少钱？\"." }],
    vocab: [
      { p: "zài", c: "在", t: "estar (localização)" },
      { p: "nǎlǐ", c: "哪里", t: "onde" },
      { p: "zuǒ", c: "左", t: "esquerda" },
      { p: "yòu", c: "右", t: "direita" },
      { p: "qiánmiàn", c: "前面", t: "na frente" },
      { p: "hòumiàn", c: "后面", t: "atrás" },
      { p: "lí", c: "离", t: "distância de" },
      { p: "jìn", c: "近", t: "perto" },
      { p: "yuǎn", c: "远", t: "longe" }
    ],
    phrases: [
      { p: "Cèsuǒ zài nǎlǐ?", c: "厕所在哪里？", t: "Onde fica o banheiro?",
        blocks: [{p:"Cèsuǒ",c:"厕所"},{p:"zài",c:"在"},{p:"nǎlǐ?",c:"哪里？"}] },
      { p: "Yī yuàn lí zhèlǐ hěn jìn.", c: "医院离这里很近。", t: "O hospital fica perto daqui.",
        blocks: [{p:"Yī yuàn",c:"医院"},{p:"lí zhèlǐ",c:"离这里"},{p:"hěn jìn.",c:"很近。"}] }
    ],
    dialogue: {
      title: "Pedindo direções na rua",
      lines: [
        { spk: "A", p: "Duì bu qǐ, cèsuǒ zài nǎlǐ?", c: "对不起，厕所在哪里？", t: "Com licença, onde fica o banheiro?" },
        { spk: "B", p: "Zài qiánmiàn, zuǒ biān.", c: "在前面，左边。", t: "Fica na frente, do lado esquerdo." },
        { spk: "A", p: "Lí zhèlǐ yuǎn ma?", c: "离这里远吗？", t: "Fica longe daqui?" },
        { spk: "B", p: "Bù yuǎn, hěn jìn.", c: "不远，很近。", t: "Não é longe, é bem perto." }
      ]
    }
  },
  {
    id: 8,
    level: "HSK1",
    title: "Compras",
    goal: "Perguntar preços, negociar valores e fazer uma compra simples.",
    usageNote: { title: "\"Kuài\" ou \"máo\"?", body: "No dinheiro chinês falado, <strong>kuài</strong> (块) é a unidade principal (equivalente a \"um real\"), e <strong>máo</strong> (毛) é um décimo de um kuài (equivalente a \"dez centavos\"). Wǔ kuài sān máo (五块三毛) é \"5 yuans e 30 centavos\" — não \"5 e 3\", os dois números têm pesos diferentes." },
    vocab: [
      { p: "mǎi", c: "买", t: "comprar" },
      { p: "mài", c: "卖", t: "vender" },
      { p: "duōshao qián", c: "多少钱", t: "quanto custa" },
      { p: "kuài", c: "块", t: "unidade monetária (coloquial)" },
      { p: "máo", c: "毛", t: "centavo (1/10 do kuài)" },
      { p: "piányi", c: "便宜", t: "barato" },
      { p: "guì", c: "贵", t: "caro" },
      { p: "zhège", c: "这个", t: "este/esta" },
      { p: "nàge", c: "那个", t: "aquele/aquela" },
      { p: "yīfu", c: "衣服", t: "roupa" },
      { p: "xié", c: "鞋", t: "sapato" }
    ],
    phrases: [
      { p: "Zhège duōshao qián?", c: "这个多少钱？", t: "Quanto custa isso?",
        blocks: [{p:"Zhège",c:"这个"},{p:"duōshao",c:"多少"},{p:"qián?",c:"钱？"}] },
      { p: "Tài guì le! Piányi yìdiǎn ba.", c: "太贵了！便宜一点吧。", t: "Está muito caro! Faz mais barato.",
        blocks: [{p:"Tài guì le!",c:"太贵了！"},{p:"Piányi",c:"便宜"},{p:"yìdiǎn ba.",c:"一点吧。"}] },
      { p: "Wǒ yào mǎi zhè jiàn yīfu.", c: "我要买这件衣服。", t: "Eu quero comprar essa roupa.",
        blocks: [{p:"Wǒ yào",c:"我要"},{p:"mǎi",c:"买"},{p:"zhè jiàn yīfu.",c:"这件衣服。"}] },
      { p: "Wǔ kuài sān máo.", c: "五块三毛。", t: "5 yuans e 30 centavos.",
        blocks: [{p:"Wǔ kuài",c:"五块"},{p:"sān máo.",c:"三毛。"}] }
    ],
    dialogue: {
      title: "No mercado",
      lines: [
        { spk: "Brune", p: "Zhège duōshao qián?", c: "这个多少钱？", t: "Quanto custa isso?" },
        { spk: "Vendedor", p: "Sān shí kuài.", c: "三十块。", t: "30 yuans." },
        { spk: "Brune", p: "Tài guì le! Piányi yìdiǎn ba.", c: "太贵了！便宜一点吧。", t: "Está muito caro! Faz mais barato." },
        { spk: "Vendedor", p: "Hǎo ba, èr shí wǔ kuài.", c: "好吧，二十五块。", t: "Tá bom, 25 yuans." }
      ]
    }
  },
  {
    id: 9,
    level: "HSK1",
    title: "Clima",
    goal: "Descrever o tempo/clima e reagir a ele.",
    usageNote: { title: "Por que \"jīntiān hěn rè\" e não \"jīntiān shì rè\"?", body: "Adjetivos em chinês (rè, lěng, guì, piányi...) funcionam como o próprio verbo da frase — eles não precisam do verbo <strong>shì</strong> (ser/estar) na frente. Por isso se diz <strong>jīntiān hěn rè</strong> (hoje [está] muito quente), nunca \"jīntiān shì rè\". O <strong>hěn</strong> aqui quase não significa \"muito\" — é só uma palavra de ligação obrigatória antes do adjetivo." },
    trueFalseExercises: [{ subject: "今天很热。", pinyin: "jīntiān hěn rè.", emoji: "☀️", claim: "Essa frase descreve como uma pessoa está se sentindo.", answer: false,
      whyNote: "Errado — <strong>今天很热</strong> descreve o CLIMA (hoje está quente), não como uma pessoa se sente. \"Estou com calor\" seria \"我很热\"." }],
    vocab: [
      { p: "tiānqì", c: "天气", t: "clima/tempo" },
      { p: "rè", c: "热", t: "quente" },
      { p: "lěng", c: "冷", t: "frio" },
      { p: "xià yǔ", c: "下雨", t: "chover" },
      { p: "qíngtiān", c: "晴天", t: "dia ensolarado" },
      { p: "yīntiān", c: "阴天", t: "dia nublado" },
      { p: "fēng", c: "风", t: "vento" },
      { p: "jīntiān tiānqì zěnmeyàng", c: "今天天气怎么样", t: "como está o tempo hoje" }
    ],
    phrases: [
      { p: "Jīntiān tiānqì zěnmeyàng?", c: "今天天气怎么样？", t: "Como está o tempo hoje?",
        blocks: [{p:"Jīntiān",c:"今天"},{p:"tiānqì",c:"天气"},{p:"zěnmeyàng?",c:"怎么样？"}] },
      { p: "Jīntiān hěn rè.", c: "今天很热。", t: "Hoje está muito quente.",
        blocks: [{p:"Jīntiān",c:"今天"},{p:"hěn",c:"很"},{p:"rè.",c:"热。"}] },
      { p: "Míngtiān huì xià yǔ.", c: "明天会下雨。", t: "Amanhã vai chover.",
        blocks: [{p:"Míngtiān",c:"明天"},{p:"huì",c:"会"},{p:"xià yǔ.",c:"下雨。"}] },
      { p: "Jīntiān bú tài lěng.", c: "今天不太冷。", t: "Hoje não está muito frio.",
        blocks: [{p:"Jīntiān",c:"今天"},{p:"bú tài",c:"不太"},{p:"lěng.",c:"冷。"}] }
    ],
    dialogue: {
      title: "Comentando o clima",
      lines: [
        { spk: "A", p: "Jīntiān tiānqì zěnmeyàng?", c: "今天天气怎么样？", t: "Como está o tempo hoje?" },
        { spk: "B", p: "Jīntiān hěn rè, qíngtiān.", c: "今天很热，晴天。", t: "Hoje está bem quente, ensolarado." },
        { spk: "A", p: "Míngtiān ne?", c: "明天呢？", t: "E amanhã?" },
        { spk: "B", p: "Míngtiān huì xià yǔ, yǒu diǎn lěng.", c: "明天会下雨，有点冷。", t: "Amanhã vai chover, vai estar meio frio." }
      ]
    }
  },
  {
    id: 10,
    level: "HSK1",
    title: "Transporte",
    goal: "Perguntar como chegar a um lugar usando transporte público ou táxi.",
    usageNote: { title: "\"Zǒu lù\" ou \"zuò dìtiě\"?", body: "Pra ir a pé, usa-se só <strong>zǒu lù</strong> (走路, andar), sem nenhum outro verbo. Pra qualquer veículo em que você entra e senta, usa-se <strong>zuò</strong> (坐, literalmente \"sentar\") antes do meio de transporte: <strong>zuò</strong> dìtiě, <strong>zuò</strong> gōngjiāochē, <strong>zuò</strong> chūzūchē. É o mesmo \"zuò\" de sentar numa cadeira — pense nele como \"ir sentado em\"." },
    vocab: [
      { p: "gōngjiāochē", c: "公共汽车", t: "ônibus" },
      { p: "dìtiě", c: "地铁", t: "metrô" },
      { p: "chūzūchē", c: "出租车", t: "táxi" },
      { p: "zǒu lù", c: "走路", t: "ir a pé" },
      { p: "zěnme qù", c: "怎么去", t: "como ir" },
      { p: "zhàn", c: "站", t: "estação/parada" },
      { p: "piào", c: "票", t: "passagem/bilhete" },
      { p: "yì zhāng piào", c: "一张票", t: "uma passagem (张 em contexto)" }
    ],
    phrases: [
      { p: "Qù jīchǎng zěnme qù?", c: "去机场怎么去？", t: "Como se vai para o aeroporto?",
        blocks: [{p:"Qù jīchǎng",c:"去机场"},{p:"zěnme",c:"怎么"},{p:"qù?",c:"去？"}] },
      { p: "Wǒ zuò dìtiě qù.", c: "我坐地铁去。", t: "Eu vou de metrô.",
        blocks: [{p:"Wǒ",c:"我"},{p:"zuò dìtiě",c:"坐地铁"},{p:"qù.",c:"去。"}] },
      { p: "Wǒ yào mǎi yì zhāng piào.", c: "我要买一张票。", t: "Eu quero comprar uma passagem.",
        blocks: [{p:"Wǒ yào",c:"我要"},{p:"mǎi",c:"买"},{p:"yì zhāng piào.",c:"一张票。"}] },
      { p: "Nǐ shì zěnme lái de?", c: "你是怎么来的？", t: "Como você veio?",
        blocks: [{p:"Nǐ shì",c:"你是"},{p:"zěnme lái",c:"怎么来"},{p:"de?",c:"的？"}] }
    ],
    dialogue: {
      title: "Perguntando como chegar",
      lines: [
        { spk: "A", p: "Qù jīchǎng zěnme qù?", c: "去机场怎么去？", t: "Como se vai para o aeroporto?" },
        { spk: "B", p: "Nǐ kěyǐ zuò dìtiě huò chūzūchē.", c: "你可以坐地铁或出租车。", t: "Você pode ir de metrô ou de táxi." },
        { spk: "A", p: "Dìtiě zhàn zài nǎlǐ?", c: "地铁站在哪里？", t: "Onde fica a estação de metrô?" },
        { spk: "B", p: "Zài qiánmiàn, hěn jìn.", c: "在前面，很近。", t: "Fica na frente, bem perto." }
      ]
    }
  },
  {
    id: 11,
    level: "HSK1",
    title: "Saúde e corpo",
    goal: "Descrever sintomas simples e partes do corpo, pedir ajuda médica básica.",
    usageNote: { title: "\"Tóu téng\" ou \"bù shūfu\"?", body: "<strong>Téng</strong> (疼) descreve uma dor específica, numa parte do corpo: tóu <strong>téng</strong> (dor de cabeça), dùzi <strong>téng</strong> (dor de barriga). <strong>Bù shūfu</strong> (不舒服) é mais geral — um mal-estar sem apontar onde dói. Se você sabe exatamente o que dói, use téng; se é só uma sensação geral de \"estou mal\", use bù shūfu." },
    trueFalseExercises: [{ subject: "我头疼。", pinyin: "wǒ tóu téng.", emoji: "🤕", claim: "Essa frase é usada quando alguém está com dor de cabeça.", answer: true,
      whyNote: "Correto — <strong>我头疼 (wǒ tóu téng)</strong> significa literalmente \"minha cabeça dói\", ou seja, dor de cabeça." }],
    vocab: [
      { p: "shēntǐ", c: "身体", t: "corpo" },
      { p: "tóu", c: "头", t: "cabeça" },
      { p: "dùzi", c: "肚子", t: "barriga" },
      { p: "téng", c: "疼", t: "doer" },
      { p: "shēngbìng", c: "生病", t: "ficar doente" },
      { p: "yīshēng", c: "医生", t: "médico(a)" },
      { p: "yīyuàn", c: "医院", t: "hospital" },
      { p: "bù shūfu", c: "不舒服", t: "não estar bem/mal-estar" }
    ],
    phrases: [
      { p: "Wǒ tóu téng.", c: "我头疼。", t: "Minha cabeça está doendo.",
        blocks: [{p:"Wǒ",c:"我"},{p:"tóu",c:"头"},{p:"téng.",c:"疼。"}] },
      { p: "Wǒ bù shūfu.", c: "我不舒服。", t: "Eu não estou bem.",
        blocks: [{p:"Wǒ",c:"我"},{p:"bù",c:"不"},{p:"shūfu.",c:"舒服。"}] },
      { p: "Wǒ xūyào kàn yīshēng.", c: "我需要看医生。", t: "Eu preciso ver um médico.",
        blocks: [{p:"Wǒ xūyào",c:"我需要"},{p:"kàn",c:"看"},{p:"yīshēng.",c:"医生。"}] }
    ],
    dialogue: {
      title: "Não estou me sentindo bem",
      lines: [
        { spk: "A", p: "Nǐ zěnme le?", c: "你怎么了？", t: "O que houve com você?" },
        { spk: "B", p: "Wǒ bù shūfu, tóu hěn téng.", c: "我不舒服，头很疼。", t: "Não estou bem, minha cabeça está doendo muito." },
        { spk: "A", p: "Nǐ xūyào kàn yīshēng ma?", c: "你需要看医生吗？", t: "Você precisa ver um médico?" },
        { spk: "B", p: "Shì de, yīyuàn lí zhèlǐ yuǎn ma?", c: "是的，医院离这里远吗？", t: "Sim, o hospital fica longe daqui?" }
      ]
    }
  },
  {
    id: 12,
    level: "HSK1",
    title: "Hobbies e tempo livre",
    goal: "Falar sobre hobbies, gostos e o que faz no tempo livre.",
    usageNote: { title: "\"Kàn\" ou \"tīng\"?", body: "<strong>Kàn</strong> (看) é usado pra atividades visuais: <strong>kàn</strong> shū (ler/\"ver\" livro), <strong>kàn</strong> diànyǐng (assistir filme). <strong>Tīng</strong> (听) é usado pra atividades de ouvir: <strong>tīng</strong> yīnyuè (ouvir música). Trocar os dois é um erro comum — \"ouvir um filme\" ou \"ver música\" soam estranhos em chinês, igual soariam em português." },
    trueFalseExercises: [{ subject: "周末你有空吗？", pinyin: "zhōumò nǐ yǒu kòng ma?", emoji: "🎬", claim: "Essa é uma forma de convidar alguém pra fazer algo.", answer: true,
      whyNote: "Correto — <strong>你有空吗？</strong> pergunta se a pessoa está livre/disponível, um jeito comum de convidar alguém pra fazer algo no fim de semana." }],
    vocab: [
      { p: "àihào", c: "爱好", t: "hobby" },
      { p: "kàn shū", c: "看书", t: "ler livro" },
      { p: "tīng yīnyuè", c: "听音乐", t: "ouvir música" },
      { p: "kàn diànyǐng", c: "看电影", t: "assistir filme" },
      { p: "yùndòng", c: "运动", t: "fazer exercício/esporte" },
      { p: "chàng gē", c: "唱歌", t: "cantar" },
      { p: "tiàowǔ", c: "跳舞", t: "dançar" },
      { p: "yǒu kòng", c: "有空", t: "ter tempo livre" }
    ],
    phrases: [
      { p: "Nǐ de àihào shì shénme?", c: "你的爱好是什么？", t: "Qual é o seu hobby?",
        blocks: [{p:"Nǐ de àihào",c:"你的爱好"},{p:"shì",c:"是"},{p:"shénme?",c:"什么？"}] },
      { p: "Wǒ xǐhuan kàn shū hé tīng yīnyuè.", c: "我喜欢看书和听音乐。", t: "Eu gosto de ler livros e ouvir música.",
        blocks: [{p:"Wǒ xǐhuan",c:"我喜欢"},{p:"kàn shū hé",c:"看书和"},{p:"tīng yīnyuè.",c:"听音乐。"}] },
      { p: "Zhōumò nǐ yǒu kòng ma?", c: "周末你有空吗？", t: "Você tem tempo livre no fim de semana?",
        blocks: [{p:"Zhōumò",c:"周末"},{p:"nǐ yǒu kòng",c:"你有空"},{p:"ma?",c:"吗？"}] }
    ],
    dialogue: {
      title: "Combinando um programa",
      lines: [
        { spk: "A", p: "Nǐ de àihào shì shénme?", c: "你的爱好是什么？", t: "Qual é o seu hobby?" },
        { spk: "B", p: "Wǒ xǐhuan kàn diànyǐng hé tiàowǔ. Nǐ ne?", c: "我喜欢看电影和跳舞。你呢？", t: "Eu gosto de assistir filme e dançar. E você?" },
        { spk: "A", p: "Wǒ xǐhuan yùndòng. Zhōumò nǐ yǒu kòng ma?", c: "我喜欢运动。周末你有空吗？", t: "Eu gosto de fazer exercício. Você tem tempo livre no fim de semana?" },
        { spk: "B", p: "Yǒu kòng! Wǒmen qù kàn diànyǐng ba.", c: "有空！我们去看电影吧。", t: "Tenho! Vamos assistir um filme." }
      ]
    }
  },
  {
    id: 13,
    level: "HSK1",
    title: "Planos futuros",
    goal: "Expressar planos e intenções usando 要 e 打算.",
    usageNote: { title: "\"Dǎsuàn\" ou \"yào\"?", body: "<strong>Dǎsuàn</strong> (打算) é um plano mais pensado, com alguma organização: wǒ <strong>dǎsuàn</strong> xuéxí Zhōngwén (eu pretendo estudar chinês). <strong>Yào</strong> (要) pode expressar uma intenção mais imediata ou simples, \"vou fazer isso\": wǒ yǐhòu <strong>yào</strong> qù Zhōngguó lǚyóu (no futuro eu vou/quero viajar pra China). Dǎsuàn soa um pouco mais formal e deliberado que yào." },
    vocab: [
      { p: "dǎsuàn", c: "打算", t: "planejar/pretender" },
      { p: "míngtiān", c: "明天", t: "amanhã" },
      { p: "xià ge xīngqī", c: "下个星期", t: "semana que vem" },
      { p: "lǚyóu", c: "旅游", t: "viajar/turismo" },
      { p: "xuéxí", c: "学习", t: "estudar" },
      { p: "jìhuà", c: "计划", t: "plano" },
      { p: "yǐhòu", c: "以后", t: "depois/no futuro" }
    ],
    phrases: [
      { p: "Nǐ míngtiān yǒu shénme jìhuà?", c: "你明天有什么计划？", t: "Quais são seus planos para amanhã?",
        blocks: [{p:"Nǐ míngtiān",c:"你明天"},{p:"yǒu shénme",c:"有什么"},{p:"jìhuà?",c:"计划？"}] },
      { p: "Wǒ dǎsuàn xué Zhōngwén.", c: "我打算学中文。", t: "Eu pretendo estudar chinês.",
        blocks: [{p:"Wǒ dǎsuàn",c:"我打算"},{p:"xué",c:"学"},{p:"Zhōngwén.",c:"中文。"}] },
      { p: "Wǒ yǐhòu yào qù Zhōngguó lǚyóu.", c: "我以后要去中国旅游。", t: "No futuro eu quero viajar para a China.",
        blocks: [{p:"Wǒ yǐhòu",c:"我以后"},{p:"yào qù",c:"要去"},{p:"Zhōngguó lǚyóu.",c:"中国旅游。"}] }
    ],
    dialogue: {
      title: "Falando sobre o futuro",
      lines: [
        { spk: "A", p: "Nǐ xià ge xīngqī yǒu shénme jìhuà?", c: "你下个星期有什么计划？", t: "Quais são seus planos para semana que vem?" },
        { spk: "B", p: "Wǒ dǎsuàn xuéxí Zhōngwén.", c: "我打算学习中文。", t: "Eu pretendo estudar chinês." },
        { spk: "A", p: "Nǐ yǐhòu yào qù Zhōngguó ma?", c: "你以后要去中国吗？", t: "Você quer ir à China no futuro?" },
        { spk: "B", p: "Yào! Wǒ yào qù Zhōngguó lǚyóu.", c: "要！我要去中国旅游。", t: "Quero! Eu quero viajar para a China." }
      ]
    }
  },
  {
    id: 14,
    level: "HSK1",
    title: "Comparações simples",
    goal: "Fazer comparações básicas entre pessoas, objetos e situações.",
    usageNote: { title: "\"Bǐ\" ou \"yíyàng\"?", body: "<strong>Bǐ</strong> (比) compara uma <strong>diferença</strong> entre duas coisas: Zhōngwén <strong>bǐ</strong> Fǎwén nán (chinês é mais difícil que francês). <strong>Yíyàng</strong> (一样) diz que duas coisas são <strong>iguais</strong>: zhège hé nàge <strong>yíyàng</strong> (este e aquele são iguais). Repare que \"bù yíyàng\" (não são iguais) não usa bǐ — são duas estruturas de comparação separadas, não se misturam." },
    vocab: [
      { p: "bǐ", c: "比", t: "comparado a / mais que" },
      { p: "gèng", c: "更", t: "ainda mais" },
      { p: "yíyàng", c: "一样", t: "igual" },
      { p: "bù yíyàng", c: "不一样", t: "diferente" },
      { p: "zuì", c: "最", t: "o mais (superlativo)" },
      { p: "háishi", c: "还是", t: "ou (em perguntas de escolha)" }
    ],
    phrases: [
      { p: "Zhōngwén bǐ Fǎwén nán.", c: "中文比法文难。", t: "Chinês é mais difícil que francês.",
        blocks: [{p:"Zhōngwén",c:"中文"},{p:"bǐ Fǎwén",c:"比法文"},{p:"nán.",c:"难。"}] },
      { p: "Zhège hé nàge yíyàng.", c: "这个和那个一样。", t: "Este e aquele são iguais.",
        blocks: [{p:"Zhège hé nàge",c:"这个和那个"},{p:"yíyàng.",c:"一样。"}] },
      { p: "Nǐ juéde nǎge zuì hǎo?", c: "你觉得哪个最好？", t: "Qual você acha que é o melhor?",
        blocks: [{p:"Nǐ juéde",c:"你觉得"},{p:"nǎge",c:"哪个"},{p:"zuì hǎo?",c:"最好？"}] }
    ],
    dialogue: {
      title: "Comparando idiomas",
      lines: [
        { spk: "A", p: "Nǐ juéde Zhōngwén nán ma?", c: "你觉得中文难吗？", t: "Você acha o chinês difícil?" },
        { spk: "B", p: "Zhōngwén bǐ Fǎwén gèng nán, dànshì hěn yǒu yìsi.", c: "中文比法文更难，但是很有意思。", t: "Chinês é ainda mais difícil que francês, mas é bem interessante." },
        { spk: "A", p: "Nǐ juéde nǎge zuì nán? Zhōngwén háishi Yìdàlìwén?", c: "你觉得哪个最难？中文还是意大利文？", t: "Qual você acha o mais difícil? Chinês ou italiano?" },
        { spk: "B", p: "Dāngrán shì Zhōngwén!", c: "当然是中文！", t: "Chinês, claro!" }
      ]
    }
  }
,
{
    id: 15,
    level: "HSK1",
    title: "Convites e capacidades",
    goal: "Convidar alguém para algo, dizer o que sabe ou consegue fazer, fazer pedidos educados.",
    usageNote: { title: "\"Huì\" ou \"néng\"?", body: "<strong>Huì</strong> (会) é uma habilidade aprendida: nǐ <strong>huì</strong> shuō Zhōngwén ma? (você sabe falar chinês? — algo que se aprende). <strong>Néng</strong> (能) é capacidade ou permissão numa situação específica: nǐ míngtiān <strong>néng</strong> lái ma? (você consegue vir amanhã? — depende da sua agenda, não de habilidade). Uma pergunta sobre saber fazer algo usa huì; uma pergunta sobre poder fazer algo agora usa néng." },
    vocab: [
      { p: "xiǎng", c: "想", t: "querer / pensar em fazer algo" },
      { p: "huì", c: "会", t: "saber fazer (habilidade aprendida)" },
      { p: "néng", c: "能", t: "conseguir, poder (capacidade/permissão)" },
      { p: "qǐng", c: "请", t: "por favor / convidar" },
      { p: "zuò", c: "坐", t: "sentar" },
      { p: "dōu", c: "都", t: "todos, ambos" },
      { p: "yě", c: "也", t: "também" },
      { p: "shuō", c: "说", t: "falar" },
      { p: "lái", c: "来", t: "vir" },
      { p: "diànyǐngyuàn", c: "电影院", t: "cinema" }
    ],
    phrases: [
      { p: "Wǒ xiǎng qù kàn diànyǐng.", c: "我想去看电影。", t: "Eu quero ir ver um filme.",
        blocks: [{p:"Wǒ xiǎng",c:"我想"},{p:"qù kàn",c:"去看"},{p:"diànyǐng.",c:"电影。"}] },
      { p: "Nǐ huì shuō Zhōngwén ma?", c: "你会说中文吗？", t: "Você sabe falar chinês?",
        blocks: [{p:"Nǐ huì",c:"你会"},{p:"shuō Zhōngwén",c:"说中文"},{p:"ma?",c:"吗？"}] },
      { p: "Nǐ míngtiān néng lái ma?", c: "你明天能来吗？", t: "Você consegue vir amanhã?",
        blocks: [{p:"Nǐ míngtiān",c:"你明天"},{p:"néng lái",c:"能来"},{p:"ma?",c:"吗？"}] },
      { p: "Qǐng zuò.", c: "请坐。", t: "Por favor, sente-se.",
        blocks: [{p:"Qǐng",c:"请"},{p:"zuò.",c:"坐。"}] },
      { p: "Wǒmen dōu xiǎng qù.", c: "我们都想去。", t: "Nós todos queremos ir.",
        blocks: [{p:"Wǒmen dōu",c:"我们都"},{p:"xiǎng qù.",c:"想去。"}] },
      { p: "Wǒ yě xiǎng qù.", c: "我也想去。", t: "Eu também quero ir.",
        blocks: [{p:"Wǒ yě",c:"我也"},{p:"xiǎng qù.",c:"想去。"}] }
    ],
    dialogue: {
      title: "Convite para o cinema",
      lines: [
        { spk: "A", p: "Wǒ xiǎng qù kàn diànyǐng, nǐ néng lái ma?", c: "我想去看电影，你能来吗？", t: "Eu quero ir ver um filme, você consegue vir?" },
        { spk: "B", p: "Néng! Jǐ diǎn?", c: "能！几点？", t: "Consigo! Que horas?" },
        { spk: "A", p: "Wǎnshang qī diǎn, zài diànyǐngyuàn.", c: "晚上七点，在电影院。", t: "Às 7 da noite, no cinema." },
        { spk: "B", p: "Hǎo de, wǒ yě xiǎng kàn nà bù diànyǐng!", c: "好的，我也想看那部电影！", t: "Combinado, eu também quero ver esse filme!" }
      ]
    }
  },

  {
    id: 16,
    level: "HSK1",
    title: "Calendário e datas",
    goal: "Falar sobre dias da semana, datas completas e horários, e marcar um encontro.",
    usageNote: { title: "\"Yǐqián\" ou \"yǐhòu\"?", body: "<strong>Yǐqián</strong> (以前) é \"antes de\": shí diǎn <strong>yǐqián</strong> wǒ zài jiā (antes das 10h eu estou em casa). <strong>Yǐhòu</strong> (以后) é \"depois de\": shí diǎn <strong>yǐhòu</strong> wǒ bú zài jiā (depois das 10h eu não estou em casa). Os dois vêm sempre <strong>depois</strong> da referência de tempo ou evento — nunca antes dela, diferente do português." },
    vocab: [
      { p: "xīngqī", c: "星期", t: "semana" },
      { p: "xīngqīyī", c: "星期一", t: "segunda-feira" },
      { p: "xīngqītiān", c: "星期天", t: "domingo" },
      { p: "hào", c: "号", t: "dia do mês (uso falado)" },
      { p: "yuè", c: "月", t: "mês" },
      { p: "nián", c: "年", t: "ano" },
      { p: "fēn", c: "分", t: "minuto" },
      { p: "yǐhòu", c: "以后", t: "depois de" },
      { p: "yǐqián", c: "以前", t: "antes de" },
      { p: "bǎi", c: "百", t: "cem" }
    ],
    phrases: [
      { p: "Jīntiān xīngqī jǐ?", c: "今天星期几？", t: "Que dia da semana é hoje?",
        blocks: [{p:"Jīntiān",c:"今天"},{p:"xīngqī jǐ?",c:"星期几？"}] },
      { p: "Jīntiān xīngqīsān.", c: "今天星期三。", t: "Hoje é quarta-feira.",
        blocks: [{p:"Jīntiān",c:"今天"},{p:"xīngqīsān.",c:"星期三。"}] },
      { p: "Jīntiān bā yuè èrshí hào.", c: "今天八月二十号。", t: "Hoje é dia 20 de agosto.",
        blocks: [{p:"Jīntiān",c:"今天"},{p:"bā yuè",c:"八月"},{p:"èrshí hào.",c:"二十号。"}] },
      { p: "Xiànzài shí yī diǎn shí bā fēn.", c: "现在十一点十八分。", t: "Agora são 11h18.",
        blocks: [{p:"Xiànzài",c:"现在"},{p:"shí yī diǎn",c:"十一点"},{p:"shí bā fēn.",c:"十八分。"}] },
      { p: "Shí diǎn yǐqián wǒ zài jiā.", c: "十点以前我在家。", t: "Antes das 10h eu estou em casa.",
        blocks: [{p:"Shí diǎn yǐqián",c:"十点以前"},{p:"wǒ zài",c:"我在"},{p:"jiā.",c:"家。"}] },
      { p: "Shí diǎn yǐhòu wǒ bú zài jiā.", c: "十点以后我不在家。", t: "Depois das 10h eu não estou em casa.",
        blocks: [{p:"Shí diǎn yǐhòu",c:"十点以后"},{p:"wǒ bú zài",c:"我不在"},{p:"jiā.",c:"家。"}] }
    ],
    dialogue: {
      title: "Marcando um encontro",
      lines: [
        { spk: "A", p: "Jīntiān xīngqī jǐ?", c: "今天星期几？", t: "Que dia da semana é hoje?" },
        { spk: "B", p: "Jīntiān xīngqīwǔ, bā yuè shíwǔ hào.", c: "今天星期五，八月十五号。", t: "Hoje é sexta-feira, 15 de agosto." },
        { spk: "A", p: "Nà wǒmen xīngqītiān jiàn, hǎo ma?", c: "那我们星期天见，好吗？", t: "Então a gente se vê no domingo, tá bom?" },
        { spk: "B", p: "Hǎo! Xiàwǔ sān diǎn yǐhòu wǒ dōu yǒu kòng.", c: "好！下午三点以后我都有空。", t: "Combinado! Depois das 15h eu tenho tempo livre." }
      ]
    }
  },

  {
    id: 17,
    level: "HSK1",
    title: "O que já aconteceu",
    goal: "Falar sobre ações já concluídas, mudanças de estado, e o que ainda não aconteceu.",
    usageNote: { title: "Por que \"wǒ hái méi chī\" nunca leva \"le\"?", body: "<strong>Le</strong> (了) marca uma ação concluída: wǒ chī <strong>le</strong> liǎng gè píngguǒ (eu comi duas maçãs). Mas na negação com <strong>hái méi</strong> (还没, ainda não), o le <strong>desaparece</strong>: wǒ <strong>hái méi</strong> chī (eu ainda não comi) — nunca \"wǒ hái méi chī le\". Faz sentido: se a ação ainda não aconteceu, não tem como marcar ela como concluída." },
    vocab: [
      { p: "le", c: "了", t: "partícula de conclusão/mudança" },
      { p: "chī fàn", c: "吃饭", t: "comer (uma refeição)" },
      { p: "píngguǒ", c: "苹果", t: "maçã" },
      { p: "hái méi", c: "还没", t: "ainda não" },
      { p: "zuótiān", c: "昨天", t: "ontem" },
      { p: "wán", c: "完", t: "terminar, acabar" },
      { p: "gōngzuò", c: "工作", t: "trabalho / trabalhar" },
      { p: "jiǔbā", c: "酒吧", t: "bar" }
    ],
    phrases: [
      { p: "Wǒ chī le liǎng gè píngguǒ.", c: "我吃了两个苹果。", t: "Eu comi duas maçãs.",
        blocks: [{p:"Wǒ chī le",c:"我吃了"},{p:"liǎng gè",c:"两个"},{p:"píngguǒ.",c:"苹果。"}] },
      { p: "Wǒ bù xiǎng chī le.", c: "我不想吃了。", t: "Eu não quero mais comer.",
        blocks: [{p:"Wǒ bù xiǎng",c:"我不想"},{p:"chī le.",c:"吃了。"}] },
      { p: "Wǒ zuótiān méiyǒu qù gōngzuò.", c: "我昨天没有去工作。", t: "Ontem eu não fui trabalhar.",
        blocks: [{p:"Wǒ zuótiān",c:"我昨天"},{p:"méiyǒu qù",c:"没有去"},{p:"gōngzuò.",c:"工作。"}] },
      { p: "Nǐ chī fàn le ma?", c: "你吃饭了吗？", t: "Você já comeu?",
        blocks: [{p:"Nǐ chī fàn",c:"你吃饭"},{p:"le ma?",c:"了吗？"}] },
      { p: "Wǒ hái méi chī.", c: "我还没吃。", t: "Eu ainda não comi.",
        blocks: [{p:"Wǒ",c:"我"},{p:"hái méi",c:"还没"},{p:"chī.",c:"吃。"}] },
      { p: "Jīntiān wǎnshang wǒ bù hē jiǔ.", c: "今天晚上我不喝酒。", t: "Hoje à noite eu não vou beber.",
        blocks: [{p:"Jīntiān wǎnshang",c:"今天晚上"},{p:"wǒ bù",c:"我不"},{p:"hē jiǔ.",c:"喝酒。"}] }
    ],
    dialogue: {
      title: "Já comeu?",
      lines: [
        { spk: "A", p: "Nǐ chī fàn le ma?", c: "你吃饭了吗？", t: "Você já comeu?" },
        { spk: "B", p: "Hái méi, wǒ hái zài gōngzuò.", c: "还没，我还在工作。", t: "Ainda não, ainda estou trabalhando." },
        { spk: "A", p: "Wǒ chī le, wǒ chī le liǎng gè píngguǒ.", c: "我吃了，我吃了两个苹果。", t: "Eu já comi, comi duas maçãs." },
        { spk: "B", p: "Zuótiān wǒ méiyǒu chī wǎnfàn, jīntiān hěn è.", c: "昨天我没有吃晚饭，今天很饿。", t: "Ontem eu não jantei, hoje estou com muita fome." }
      ]
    }
  },

  {
    id: 18,
    level: "HSK1",
    title: "Perguntas do dia a dia",
    goal: "Fazer perguntas abertas variadas: quem, por quê, onde alguém mora ou trabalha, se há algo num lugar.",
    usageNote: { title: "\"Wèishénme\" ou \"yīnwèi\"?", body: "<strong>Wèishénme</strong> (为什么) é a pergunta: \"por quê?\". <strong>Yīnwèi</strong> (因为) é a resposta: \"porque\". Nǐ <strong>wèishénme</strong> bú qù? <strong>Yīnwèi</strong> wǒ hěn máng (Por que você não vai? Porque eu estou muito ocupado). É a pergunta e a resposta andando sempre juntas, como um par." },
    trueFalseExercises: [{ subject: "你为什么不去？", pinyin: "nǐ wèishénme bú qù?", emoji: "🤔", claim: "Essa pergunta pede pra saber onde alguém mora.", answer: false,
      whyNote: "Errado — <strong>你为什么不去？</strong> pergunta o MOTIVO (为什么 = por quê) de não ir, não onde a pessoa mora. Onde mora seria \"你住在哪里？\"." }],
    vocab: [
      { p: "shéi", c: "谁", t: "quem" },
      { p: "wèishénme", c: "为什么", t: "por quê" },
      { p: "yīnwèi", c: "因为", t: "porque" },
      { p: "zhèlǐ", c: "这里", t: "aqui" },
      { p: "xuéxiào", c: "学校", t: "escola" },
      { p: "xuésheng", c: "学生", t: "estudante" },
      { p: "nǚpéngyou", c: "女朋友", t: "namorada" },
      { p: "nánpéngyou", c: "男朋友", t: "namorado" },
      { p: "yìxiē", c: "一些", t: "alguns, um pouco de" },
      { p: "gōngzuò", c: "工作", t: "trabalhar (em um lugar)" }
    ],
    phrases: [
      { p: "Nǐ shì shéi?", c: "你是谁？", t: "Quem é você?",
        blocks: [{p:"Nǐ shì",c:"你是"},{p:"shéi?",c:"谁？"}] },
      { p: "Nǐ wèishénme bù qù?", c: "你为什么不去？", t: "Por que você não vai?",
        blocks: [{p:"Nǐ wèishénme",c:"你为什么"},{p:"bù qù?",c:"不去？"}] },
      { p: "Yīnwèi wǒ hěn máng.", c: "因为我很忙。", t: "Porque eu estou muito ocupado.",
        blocks: [{p:"Yīnwèi",c:"因为"},{p:"wǒ hěn",c:"我很"},{p:"máng.",c:"忙。"}] },
      { p: "Wǒ zài Shànghǎi gōngzuò.", c: "我在上海工作。", t: "Eu trabalho em Xangai.",
        blocks: [{p:"Wǒ zài",c:"我在"},{p:"Shànghǎi",c:"上海"},{p:"gōngzuò.",c:"工作。"}] },
      { p: "Zhèlǐ yǒu yìxiē kāfēi.", c: "这里有一些咖啡。", t: "Aqui tem um pouco de café.",
        blocks: [{p:"Zhèlǐ yǒu",c:"这里有"},{p:"yìxiē",c:"一些"},{p:"kāfēi.",c:"咖啡。"}] },
      { p: "Zhè shì wǒ nǚpéngyou.", c: "这是我女朋友。", t: "Essa é minha namorada.",
        blocks: [{p:"Zhè shì",c:"这是"},{p:"wǒ",c:"我"},{p:"nǚpéngyou.",c:"女朋友。"}] }
    ],
    dialogue: {
      title: "Apresentando um amigo",
      lines: [
        { spk: "A", p: "Zhè shì shéi?", c: "这是谁？", t: "Quem é essa?" },
        { spk: "B", p: "Zhè shì wǒ nǚpéngyou, tā shì xuéshēng.", c: "这是我女朋友，她是学生。", t: "Essa é minha namorada, ela é estudante." },
        { spk: "A", p: "Tā zài nǎlǐ gōngzuò huò xuéxí?", c: "她在哪里工作或学习？", t: "Onde ela trabalha ou estuda?" },
        { spk: "B", p: "Tā zài xuéxiào xuéxí, zhèlǐ yǒu yìxiē tā de shū.", c: "她在学校学习，这里有一些她的书。", t: "Ela estuda na escola, aqui tem alguns livros dela." }
      ]
    }
  }
];
