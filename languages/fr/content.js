// Banco de conteúdo — Francês do Zero (Nível A1)
// Cada unidade tem objetivo comunicacional, vocabulário, frases-modelo e diálogo.
//
// Schema (mais simples que o do Mandarim do Zero: francês usa alfabeto latino,
// não existe separação pinyin/caractere — um único campo "f" carrega a palavra
// ou frase em francês, e "t" a tradução em português):
//   vocab:    [{ f: "bonjour", t: "olá" }, ...]
//   phrases:  [{ f: "...", t: "...", blocks: [{f:"..."}, ...] }, ...]
//             (blocks = a frase segmentada em pedaços, usada no exercício de
//              ordenar a frase — cada bloco é um trecho clicável)
//   dialogue: { title: "...", lines: [{ spk: "A", f: "...", t: "..." }, ...] }
//
// Progressão completa do nível A1 (29 unidades: 20 comunicativas + 9 de
// gramática). Próximos níveis entram como novas unidades com "level"
// diferente, seguindo este mesmo schema — cada unidade carrega seu próprio
// campo "level" (ex: "A1", "A2"), usado pelo seletor de nível na Trilha pra
// filtrar/agrupar.
//
// Esquema de "id": cada nível tem sua própria numeração, independente dos
// outros níveis — "A1-1", "A1-2"... e "A2-1", "A2-2"... (não é uma sequência
// global contínua). Dentro de um nível, unidades de gramática têm sua PRÓPRIA
// contagem separada da sequência comunicacional: "A1-g1", "A1-g2"... A posição
// numérica mostrada ao aluno ("Unidade 4 de 16", "Unidade de gramática 1 de 2")
// também é calculada separadamente por tipo — uma unidade de gramática não
// consome um número da sequência comunicacional, só entra na ordem/desbloqueio
// sequencial da trilha. Ex.: unidades 1, 2, 3, 4 (comunicativas) + unidade de
// gramática 1 + unidades 5, 6, 7... (comunicativas, numeração comunicacional
// segue contando normalmente).
//
// Unidades de gramática (type: "grammar"): em vez de vocab/phrases/dialogue,
// têm um campo "grammar" com { blocks, exercises }. Cada item de "blocks" é
// uma tela de explicação própria — { title, body, examples: [{f,t}], table?,
// wrapup? } — no estilo Busuu: o aluno avança bloco por bloco (como no
// vocabulário palavra-por-palavra), cada um com 1-2 frases de exemplo
// divididas por uma linha quando há mais de uma. O último bloco normalmente
// tem wrapup:true (mensagem de incentivo) e pode trazer a tabela de
// conjugação completa antes dos exercícios. Fluxo na Trilha: Explicação
// (paginada por bloco) → Exercícios — em vez de Vocabulário → Diálogo →
// Exercícios das unidades comunicativas.

const LEVELS = [
  { id: "A1", label: "Nível 1 · Débutant" },
  { id: "A2", label: "Nível 2 · Élémentaire" }
];

const UNITS = [
  {
    id: "A1-1",
    level: "A1",
    title: "Cumprimentar e se despedir",
    goal: "Cumprimentar alguém, se despedir e agradecer numa interação básica.",
    usageNote: { title: "\"Bonjour\" ou \"Bonsoir\"?", body: "Usamos <strong>bonjour</strong> de manhã até o fim da tarde — é a saudação padrão do dia. À noite, ao chegar num lugar, trocamos para <strong>bonsoir</strong>. Já <strong>salut</strong> funciona a qualquer hora, mas só entre amigos ou pessoas próximas — nunca com desconhecidos ou em contextos formais." },
    trueFalseExercises: [{ subject: "Merci beaucoup !", emoji: "🙏", claim: "Isso é o que dizemos quando alguém nos ajuda muito.", answer: true,
      whyNote: "Correto — <strong>merci beaucoup</strong> significa \"muito obrigado(a)\", é exatamente isso que se diz para agradecer por uma ajuda." }],
    vocab: [
      { f: "bonjour", t: "olá / bom dia" },
      { f: "bonsoir", t: "boa noite (saudação)" },
      { f: "au revoir", t: "tchau / até logo" },
      { f: "salut", t: "oi / tchau (informal)" },
      { f: "merci", t: "obrigado(a)" },
      { f: "de rien", t: "de nada" },
      { f: "s'il vous plaît", t: "por favor (formal)" },
      { f: "pardon", t: "desculpe / com licença" },
      { f: "ça va", t: "tudo bem" },
      { f: "à bientôt", t: "até breve" }
    ],
    phrases: [
      { f: "Bonjour ! Je m'appelle Brune.", t: "Olá! Eu me chamo Brune.",
        blocks: [{f:"Bonjour !"},{f:"Je m'appelle"},{f:"Brune."}],
        scenario: "Você encontra alguém novo numa festa e quer se apresentar. O que você diz?", scenarioEmoji: "🎉" },
      { f: "Merci beaucoup !", t: "Muito obrigada!",
        blocks: [{f:"Merci"},{f:"beaucoup !"}],
        scenario: "Um amigo te ajuda a carregar as compras. Como você agradece?", scenarioEmoji: "🛍️" },
      { f: "Pardon, je ne comprends pas.", t: "Desculpe, eu não entendo.",
        blocks: [{f:"Pardon,"},{f:"je ne"},{f:"comprends pas."}],
        scenario: "Alguém fala muito rápido em francês e você não entendeu nada. O que você diz?", scenarioEmoji: "😕" },
      { f: "Ça va bien, et toi ?", t: "Vou bem, e você?",
        blocks: [{f:"Ça va"},{f:"bien,"},{f:"et toi ?"}],
        scenario: "Uma amiga pergunta \"Ça va?\". Você quer responder que está bem e perguntar de volta. O que você diz?", scenarioEmoji: "☕" },
      { f: "Bonsoir ! Comment allez-vous ?", t: "Boa noite! Como vai o senhor/a senhora?",
        blocks: [{f:"Bonsoir !"},{f:"Comment allez-vous ?"}] },
      { f: "Au revoir, à demain !", t: "Tchau, até amanhã!",
        blocks: [{f:"Au revoir,"},{f:"à demain !"}] },
      { f: "Salut ! Ça va bien ?", t: "Oi! Tudo bem?",
        blocks: [{f:"Salut !"},{f:"Ça va bien ?"}] },
      { f: "De rien, c'est normal.", t: "De nada, é o de menos.",
        blocks: [{f:"De rien,"},{f:"c'est normal."}] },
      { f: "Un café, s'il vous plaît.", t: "Um café, por favor.",
        blocks: [{f:"Un café,"},{f:"s'il vous plaît."}] }
    ],
    dialogue: {
      title: "Encontro na rua",
      lines: [
        { spk: "A", f: "Bonjour !", t: "Olá!" },
        { spk: "B", f: "Bonjour ! Ça va ?", t: "Olá! Tudo bem?" },
        { spk: "A", f: "Ça va bien, merci ! Et toi ?", t: "Vou bem, obrigada! E você?" },
        { spk: "B", f: "Ça va. À bientôt !", t: "Tudo bem. Até breve!" }
      ]
    }
  },
  {
    id: "A1-2",
    level: "A1",
    title: "Se apresentar",
    goal: "Dizer o nome, a nacionalidade e perguntar o mesmo para o outro.",
    usageNote: { title: "\"Tu\" ou \"vous\"?", body: "<strong>Tu</strong> é informal — usado com amigos, família e colegas da mesma idade. <strong>Vous</strong> é formal (usado com desconhecidos, superiores, pessoas mais velhas) e também é a forma de \"vocês\", no plural. Na dúvida, comece sempre com <strong>vous</strong> — é mais seguro do que parecer íntimo demais." },
    trueFalseExercises: [{ subject: "Comment tu t'appelles ?", emoji: "🙋", claim: "Essa pergunta serve pra saber a idade de alguém.", answer: false,
      whyNote: "Errado — <strong>comment tu t'appelles ?</strong> pergunta o NOME (appeler = chamar-se), não a idade. Idade seria \"quel âge as-tu ?\"." }],
    vocab: [
      { f: "je", t: "eu" },
      { f: "tu", t: "você (informal)" },
      { f: "s'appeler", t: "chamar-se" },
      { f: "le nom", t: "o nome" },
      { f: "être", t: "ser / estar" },
      { f: "la France", t: "a França" },
      { f: "le Brésil", t: "o Brasil" },
      { f: "français / française", t: "francês / francesa" },
      { f: "brésilien / brésilienne", t: "brasileiro / brasileira" },
      { f: "le pays", t: "o país" }
    ],
    phrases: [
      { f: "Comment tu t'appelles ?", t: "Qual é o seu nome?",
        blocks: [{f:"Comment"},{f:"tu"},{f:"t'appelles ?"}],
        scenario: "Você conhece alguém novo e quer saber o nome dela. O que você pergunta?", scenarioEmoji: "🤝" },
      { f: "Je suis brésilienne.", t: "Eu sou brasileira.",
        blocks: [{f:"Je"},{f:"suis"},{f:"brésilienne."}],
        scenario: "Alguém pergunta de onde você é. Você quer dizer que é brasileira. O que você diz?", scenarioEmoji: "🇧🇷" },
      { f: "Tu es de quel pays ?", t: "De que país você é?",
        blocks: [{f:"Tu"},{f:"es de"},{f:"quel pays ?"}],
        scenario: "Você quer saber de que país uma pessoa nova veio. O que você pergunta?", scenarioEmoji: "🌍" },
      { f: "Moi aussi, je suis française !", t: "Eu também, eu sou francesa!",
        blocks: [{f:"Moi aussi,"},{f:"je suis"},{f:"française !"}],
        scenario: "Alguém diz que é francesa, e você também é! Como você reage?", scenarioEmoji: "🇫🇷" },
      { f: "Quel est le nom de la ville ?", t: "Qual é o nome da cidade?",
        blocks: [{f:"Quel est"},{f:"le nom"},{f:"de la ville ?"}] },
      { f: "J'aime la France.", t: "Eu amo a França.",
        blocks: [{f:"J'aime"},{f:"la France."}] },
      { f: "Le Brésil est très grand.", t: "O Brasil é muito grande.",
        blocks: [{f:"Le Brésil"},{f:"est très"},{f:"grand."}] },
      { f: "Le pays est magnifique.", t: "O país é magnífico.",
        blocks: [{f:"Le pays"},{f:"est magnifique."}] }
    ],
    dialogue: {
      title: "Primeiro encontro",
      lines: [
        { spk: "A", f: "Bonjour, comment tu t'appelles ?", t: "Olá, qual é o seu nome?" },
        { spk: "B", f: "Je m'appelle Léo. Et toi ?", t: "Eu me chamo Léo. E você?" },
        { spk: "A", f: "Moi, c'est Ana. Tu es français ?", t: "Eu sou a Ana. Você é francês?" },
        { spk: "B", f: "Oui, je suis français. Et toi, tu es brésilienne ?", t: "Sim, eu sou francês. E você, é brasileira?" },
        { spk: "A", f: "Oui, je suis brésilienne !", t: "Sim, eu sou brasileira!" }
      ]
    }
  },
  {
    id: "A1-3",
    level: "A1",
    title: "Números e idade",
    goal: "Contar do zero a cem e dizer/perguntar a idade.",
    usageNote: { title: "\"J'ai vingt ans\" — por que \"ai\" e não \"suis\"?", body: "Em português dizemos \"eu <strong>sou</strong>/<strong>tenho</strong> vinte anos\", mas em francês a idade sempre usa o verbo <strong>avoir</strong> (ter): <strong>j'ai</strong> vingt ans, nunca \"je suis vingt ans\". É um erro comum de quem traduz direto do português — vale gravar essa estrutura de cor." },
    vocab: [
      { f: "zéro", t: "zero" },
      { f: "un / une", t: "um / uma" },
      { f: "deux", t: "dois" },
      { f: "trois", t: "três" },
      { f: "dix", t: "dez" },
      { f: "vingt", t: "vinte" },
      { f: "l'âge", t: "a idade" },
      { f: "avoir", t: "ter" },
      { f: "ans", t: "anos" },
      { f: "combien", t: "quanto / quantos" }
    ],
    phrases: [
      { f: "Quel âge as-tu ?", t: "Quantos anos você tem?",
        blocks: [{f:"Quel âge"},{f:"as-tu ?"}],
        scenario: "Você quer saber a idade de um novo amigo. O que você pergunta?", scenarioEmoji: "🎂" },
      { f: "J'ai vingt ans.", t: "Eu tenho vinte anos.",
        blocks: [{f:"J'ai"},{f:"vingt"},{f:"ans."}],
        scenario: "Alguém pergunta sua idade e você tem vinte anos. O que você responde?", scenarioEmoji: "🎈" },
      { f: "Il a dix ans.", t: "Ele tem dez anos.",
        blocks: [{f:"Il a"},{f:"dix"},{f:"ans."}],
        scenario: "Você está apresentando seu sobrinho de dez anos. O que você diz sobre a idade dele?", scenarioEmoji: "👦" },
      { f: "Nous sommes dix.", t: "Somos dez (pessoas).",
        blocks: [{f:"Nous sommes"},{f:"dix."}],
        scenario: "O garçom pergunta quantas pessoas são no seu grupo, que tem dez pessoas. O que você diz?", scenarioEmoji: "🍽️" },
      { f: "Combien ça coûte ?", t: "Quanto custa isso?",
        blocks: [{f:"Combien"},{f:"ça coûte ?"}] },
      { f: "Il fait zéro degré dehors.", t: "Está zero grau lá fora.",
        blocks: [{f:"Il fait"},{f:"zéro degré"},{f:"dehors."}] },
      { f: "J'ai deux frères et trois sœurs.", t: "Eu tenho dois irmãos e três irmãs.",
        blocks: [{f:"J'ai"},{f:"deux frères"},{f:"et trois sœurs."}] },
      { f: "Quel est l'âge de ton père ?", t: "Qual é a idade do seu pai?",
        blocks: [{f:"Quel est"},{f:"l'âge"},{f:"de ton père ?"}] }
    ],
    dialogue: {
      title: "No parque",
      lines: [
        { spk: "A", f: "Quel âge a ta fille ?", t: "Qual é a idade da sua filha?" },
        { spk: "B", f: "Elle a huit ans. Et ton fils ?", t: "Ela tem oito anos. E seu filho?" },
        { spk: "A", f: "Il a dix ans.", t: "Ele tem dez anos." },
        { spk: "B", f: "Ils sont grands !", t: "Eles estão grandes!" }
      ]
    }
  },
  {
    id: "A1-g1",
    level: "A1",
    type: "grammar",
    title: "Verbos avoir e être",
    goal: "Conjugar avoir e être no presente e reconhecer seu uso nas frases.",
    grammar: {
      // Cada bloco é uma "tela" própria na Trilha (como no Busuu): título curto,
      // explicação breve e uma caixa com 1-2 frases de exemplo (com áudio),
      // separadas por uma divisória quando há mais de uma. O último bloco
      // (wrapup: true) fecha a explicação com uma mensagem de incentivo e a
      // tabela de conjugação completa, antes de entrar nos exercícios.
      blocks: [
        {
          title: "Avoir e être",
          body: "Avoir (ter) e être (ser/estar) são os dois verbos mais usados do francês — e os únicos totalmente irregulares no presente. Você já viu várias formas deles nas últimas unidades (je suis, j'ai, il a...) sem parar pra pensar na conjugação completa.",
          examples: [
            { f: "Je suis brésilienne.", t: "Eu sou brasileira. (être)" },
            { f: "J'ai vingt ans.", t: "Eu tenho vinte anos. (avoir)" }
          ]
        },
        {
          title: "Nenhum padrão pra deduzir",
          body: "Repare que nenhuma das duas conjugações segue um padrão regular — não tem como \"deduzir\" a forma a partir do infinitivo, então vale a pena memorizar a tabela inteira, não só as formas isoladas que você já viu.",
          examples: [
            { f: "Il a dix ans.", t: "Ele tem dez anos. (avoir)" },
            { f: "Elle est ma sœur.", t: "Ela é minha irmã. (être)" }
          ]
        },
        {
          title: "Uma pegadinha comum",
          body: "O francês usa avoir (ter) em várias expressões onde o português usa \"estar\" ou \"ser\" — avoir faim (estar com fome), avoir soif (estar com sede), avoir peur (estar com medo), avoir raison (estar certo). Se em português a frase usa \"estar com/ter\", muito provavelmente em francês é avoir.",
          examples: [
            { f: "J'ai faim.", t: "Estou com fome." },
            { f: "Elle a raison.", t: "Ela está certa." }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Être também funciona como verbo auxiliar de outros tempos verbais que você vai ver no A2 — a base que você constrói agora facilita bastante lá na frente. Aqui está a conjugação completa dos dois verbos antes de praticar:",
          examples: [],
          table: {
            être: [
              { pronoun: "je", form: "suis" },
              { pronoun: "tu", form: "es" },
              { pronoun: "il / elle / on", form: "est" },
              { pronoun: "nous", form: "sommes" },
              { pronoun: "vous", form: "êtes" },
              { pronoun: "ils / elles", form: "sont" }
            ],
            avoir: [
              { pronoun: "je (j')", form: "ai" },
              { pronoun: "tu", form: "as" },
              { pronoun: "il / elle / on", form: "a" },
              { pronoun: "nous", form: "avons" },
              { pronoun: "vous", form: "avez" },
              { pronoun: "ils / elles", form: "ont" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "Je ___ étudiante.", hint: "être", answer: "suis" },
        { prompt: "Tu ___ vingt ans.", hint: "avoir", answer: "as" },
        { prompt: "Nous ___ français.", hint: "être", answer: "sommes" },
        { prompt: "Ils ___ deux enfants.", hint: "avoir", answer: "ont" },
        { prompt: "Vous ___ de Paris ?", hint: "être", answer: "êtes" },
        { prompt: "Elle ___ faim.", hint: "avoir", answer: "a" }
      ]
    }
  },
  {
    id: "A1-4",
    level: "A1",
    title: "Família",
    goal: "Apresentar os membros da família e dizer quantos irmãos você tem.",
    usageNote: { title: "\"Mon frère\" ou \"ma sœur\"?", body: "Em francês, o possessivo concorda com o gênero da palavra que vem depois, não com quem é o dono: <strong>mon</strong> père, <strong>mon</strong> frère (masculino), mas <strong>ma</strong> mère, <strong>ma</strong> sœur (feminino) — mesmo que seja você (homem ou mulher) falando. O dono da coisa não importa pra escolher mon/ma, só o gênero da palavra." },
    vocab: [
      { f: "la famille", t: "a família" },
      { f: "le père", t: "o pai" },
      { f: "la mère", t: "a mãe" },
      { f: "le frère", t: "o irmão" },
      { f: "la sœur", t: "a irmã" },
      { f: "les parents", t: "os pais" },
      { f: "le fils", t: "o filho" },
      { f: "la fille", t: "a filha" },
      { f: "le mari", t: "o marido" },
      { f: "la femme", t: "a esposa / a mulher" }
    ],
    phrases: [
      { f: "Voici ma famille.", t: "Aqui está minha família.",
        blocks: [{f:"Voici"},{f:"ma famille."}],
        scenario: "Você está mostrando uma foto e quer apresentar sua família. O que você diz?", scenarioEmoji: "👨‍👩‍👧‍👦" },
      { f: "J'ai deux frères.", t: "Eu tenho dois irmãos.",
        blocks: [{f:"J'ai"},{f:"deux"},{f:"frères."}],
        scenario: "Alguém pergunta se você tem irmãos, e você tem dois. O que você responde?", scenarioEmoji: "👬" },
      { f: "Mon père s'appelle Marc.", t: "Meu pai se chama Marc.",
        blocks: [{f:"Mon père"},{f:"s'appelle"},{f:"Marc."}],
        scenario: "Você está contando o nome do seu pai, que se chama Marc. O que você diz?", scenarioEmoji: "👨" },
      { f: "Elle est ma sœur.", t: "Ela é minha irmã.",
        blocks: [{f:"Elle est"},{f:"ma sœur."}],
        scenario: "Alguém pergunta quem é aquela garota na foto — é sua irmã. O que você responde?", scenarioEmoji: "👧" },
      { f: "La famille est très importante.", t: "A família é muito importante.",
        blocks: [{f:"La famille"},{f:"est très"},{f:"importante."}] },
      { f: "Le père travaille en ville.", t: "O pai trabalha na cidade.",
        blocks: [{f:"Le père"},{f:"travaille"},{f:"en ville."}] },
      { f: "La mère prépare le dîner.", t: "A mãe prepara o jantar.",
        blocks: [{f:"La mère"},{f:"prépare"},{f:"le dîner."}] },
      { f: "Le frère et la sœur jouent ensemble.", t: "O irmão e a irmã brincam juntos.",
        blocks: [{f:"Le frère"},{f:"et la sœur"},{f:"jouent ensemble."}] },
      { f: "Les parents adorent leurs enfants.", t: "Os pais adoram seus filhos.",
        blocks: [{f:"Les parents"},{f:"adorent"},{f:"leurs enfants."}] },
      { f: "Le fils et la fille aiment l'école.", t: "O filho e a filha gostam da escola.",
        blocks: [{f:"Le fils"},{f:"et la fille"},{f:"aiment l'école."}] },
      { f: "Le mari et la femme habitent à Paris.", t: "O marido e a esposa moram em Paris.",
        blocks: [{f:"Le mari"},{f:"et la femme"},{f:"habitent à Paris."}] }
    ],
    dialogue: {
      title: "Falando da família",
      lines: [
        { spk: "A", f: "Tu as des frères et sœurs ?", t: "Você tem irmãos?" },
        { spk: "B", f: "Oui, j'ai une sœur. Et toi ?", t: "Sim, eu tenho uma irmã. E você?" },
        { spk: "A", f: "Moi, j'ai un frère. Il s'appelle Paul.", t: "Eu tenho um irmão. Ele se chama Paul." },
        { spk: "B", f: "Il a quel âge ?", t: "Quantos anos ele tem?" },
        { spk: "A", f: "Il a quinze ans.", t: "Ele tem quinze anos." }
      ]
    }
  },
  {
    id: "A1-g2",
    level: "A1",
    type: "grammar",
    title: "Adjetivos possessivos",
    goal: "Usar mon/ma/mes, ton/ta/tes, son/sa/ses e os demais adjetivos possessivos corretamente.",
    grammar: {
      blocks: [
        {
          title: "Meu, minha, meus, minhas...",
          body: "No francês, o adjetivo possessivo concorda com o gênero e número da coisa possuída — não com quem é o dono! Por isso \"meu\" pode ser mon, ma ou mes dependendo da palavra que vem depois.",
          examples: [
            { f: "C'est mon frère.", t: "Este é meu irmão. (frère é masculino)" },
            { f: "C'est ma sœur.", t: "Esta é minha irmã. (sœur é feminino)" }
          ]
        },
        {
          title: "Nosso, vosso, deles...",
          body: "Já notre/votre/leur (nosso, vosso/de vocês, deles) não mudam de acordo com o gênero — só ganham um \"s\" no plural (nos/vos/leurs), sempre que a coisa possuída estiver no plural.",
          examples: [
            { f: "Notre père s'appelle Jean.", t: "Nosso pai se chama Jean." },
            { f: "Ce sont leurs parents.", t: "Estes são os pais deles." }
          ]
        },
        {
          title: "Uma exceção sonora",
          body: "Antes de uma palavra feminina que começa com vogal (ou \"h\" mudo), usa-se mon/ton/son no lugar de ma/ta/sa — só pra evitar o encontro estranho de dois sons de vogal seguidos. O gênero da palavra continua feminino, só a forma escrita muda.",
          examples: [
            { f: "C'est mon amie Sophie.", t: "Esta é minha amiga Sophie. (amie é feminino, mas começa com vogal)" },
            { f: "Son école est loin.", t: "A escola dela fica longe." }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Aqui está a tabela completa dos possessivos — organizada por gênero/número da coisa possuída, não por quem é o dono:",
          examples: [],
          table: {
            "Masculino singular": [
              { pronoun: "meu", form: "mon" },
              { pronoun: "teu (informal)", form: "ton" },
              { pronoun: "seu / dele / dela", form: "son" },
              { pronoun: "nosso", form: "notre" },
              { pronoun: "vosso / de vocês", form: "votre" },
              { pronoun: "deles / delas", form: "leur" }
            ],
            "Feminino singular": [
              { pronoun: "minha", form: "ma" },
              { pronoun: "tua (informal)", form: "ta" },
              { pronoun: "sua / dele / dela", form: "sa" },
              { pronoun: "nossa", form: "notre" },
              { pronoun: "vossa / de vocês", form: "votre" },
              { pronoun: "delas / deles", form: "leur" }
            ],
            "Plural (m/f)": [
              { pronoun: "meus / minhas", form: "mes" },
              { pronoun: "teus / tuas", form: "tes" },
              { pronoun: "seus / suas", form: "ses" },
              { pronoun: "nossos / nossas", form: "nos" },
              { pronoun: "vossos / vossas", form: "vos" },
              { pronoun: "deles / delas (pl.)", form: "leurs" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "C'est ___ frère.", hint: "meu (masc.)", answer: "mon" },
        { prompt: "C'est ___ sœur.", hint: "minha (fem.)", answer: "ma" },
        { prompt: "Ce sont ___ parents.", hint: "meus (plural)", answer: "mes" },
        { prompt: "___ père s'appelle Marc.", hint: "nosso", answer: "notre" },
        { prompt: "Ce sont ___ fils.", hint: "deles / delas (plural)", answer: "leurs" },
        { prompt: "C'est ___ amie.", hint: "minha — mas amie começa com vogal", answer: "mon" }
      ]
    }
  },
  {
    id: "A1-5",
    level: "A1",
    title: "Comida e bebida",
    goal: "Pedir comida e bebida num café ou restaurante, e dizer do que você gosta ou não gosta de comer.",
    usageNote: { title: "\"J'aime LE café\" ou \"je bois DU café\"?", body: "Com verbos de gosto (<strong>aimer</strong>, détester), usa-se o artigo definido pra falar da coisa em geral: <strong>j'aime le café</strong> (gosto de café, em geral). Já quando se fala de uma quantidade — bebendo, comendo, comprando — usa-se o artigo partitivo: <strong>je bois du café</strong> (bebo [uma quantidade de] café). É uma distinção que o português não tem, mas é essencial em francês." },
    trueFalseExercises: [{ subject: "L'addition, s'il vous plaît.", emoji: "🧾", claim: "Dizemos isso pra pedir a conta num restaurante.", answer: true,
      whyNote: "Correto — <strong>l'addition</strong> é \"a conta\" em francês; essa frase é exatamente como se pede a conta num restaurante." }],
    vocab: [
      { f: "le pain", t: "o pão" },
      { f: "l'eau", t: "a água" },
      { f: "le café", t: "o café" },
      { f: "le lait", t: "o leite" },
      { f: "le fromage", t: "o queijo" },
      { f: "la pomme", t: "a maçã" },
      { f: "le poisson", t: "o peixe" },
      { f: "manger", t: "comer" },
      { f: "boire", t: "beber" },
      { f: "détester", t: "odiar / detestar" }
    ],
    phrases: [
      { f: "Je mange du pain le matin.", t: "Eu como pão de manhã.",
        blocks: [{f:"Je mange"},{f:"du pain"},{f:"le matin."}],
        scenario: "Alguém pergunta o que você come de manhã. O que você responde?", scenarioEmoji: "🥖" },
      { f: "J'aime le fromage, mais je déteste le poisson.", t: "Eu gosto de queijo, mas odeio peixe.",
        blocks: [{f:"J'aime"},{f:"le fromage,"},{f:"mais je déteste"},{f:"le poisson."}],
        scenario: "Você quer dizer que gosta de queijo mas não gosta nada de peixe. O que você diz?", scenarioEmoji: "🧀" },
      { f: "Tu bois du café ou du lait ?", t: "Você bebe café ou leite?",
        blocks: [{f:"Tu bois"},{f:"du café"},{f:"ou du lait ?"}],
        scenario: "Você está servindo o café da manhã para um amigo e quer saber o que ele bebe. O que você pergunta?", scenarioEmoji: "☕" },
      { f: "L'addition, s'il vous plaît.", t: "A conta, por favor.",
        blocks: [{f:"L'addition,"},{f:"s'il vous plaît."}],
        scenario: "Vocês terminaram de comer no restaurante e querem pedir a conta. O que vocês dizem ao garçom?", scenarioEmoji: "🧾" },
      { f: "Le pain est délicieux.", t: "O pão está delicioso.",
        blocks: [{f:"Le pain"},{f:"est délicieux."}] },
      { f: "Je voudrais de l'eau, s'il vous plaît.", t: "Eu gostaria de água, por favor.",
        blocks: [{f:"Je voudrais"},{f:"de l'eau,"},{f:"s'il vous plaît."}] },
      { f: "Le café est très chaud.", t: "O café está bem quente.",
        blocks: [{f:"Le café"},{f:"est très"},{f:"chaud."}] },
      { f: "Le lait est dans le frigo.", t: "O leite está na geladeira.",
        blocks: [{f:"Le lait"},{f:"est dans"},{f:"le frigo."}] },
      { f: "La pomme est rouge et sucrée.", t: "A maçã é vermelha e doce.",
        blocks: [{f:"La pomme"},{f:"est rouge"},{f:"et sucrée."}] },
      { f: "J'aime manger le matin.", t: "Eu gosto de comer de manhã.",
        blocks: [{f:"J'aime"},{f:"manger"},{f:"le matin."}] },
      { f: "Tu veux boire quelque chose ?", t: "Você quer beber alguma coisa?",
        blocks: [{f:"Tu veux"},{f:"boire"},{f:"quelque chose ?"}] },
      { f: "Je vais détester ce plat, je pense.", t: "Acho que vou detestar esse prato.",
        blocks: [{f:"Je vais"},{f:"détester"},{f:"ce plat, je pense."}] }
    ],
    dialogue: {
      title: "No café",
      lines: [
        { spk: "A", f: "Bonjour, vous désirez ?", t: "Olá, o que deseja?" },
        { spk: "B", f: "Un café et un croissant, s'il vous plaît.", t: "Um café e um croissant, por favor." },
        { spk: "A", f: "Autre chose ?", t: "Mais alguma coisa?" },
        { spk: "B", f: "Non merci, c'est tout.", t: "Não, obrigado(a), é só isso." },
        { spk: "A", f: "Voilà, ça fait cinq euros.", t: "Aqui está, são cinco euros." }
      ]
    }
  },
  {
    id: "A1-6",
    level: "A1",
    title: "Horas e rotina diária",
    goal: "Dizer as horas e descrever a rotina do dia a dia.",
    usageNote: { title: "\"Il est huit heures\" — de novo, nada de \"être\"... ou melhor, só \"être\"!", body: "Diferente da idade (que usa avoir), as horas em francês usam o verbo <strong>être</strong>: <strong>il est</strong> huit heures (são oito horas). Repare que aqui o \"il\" não se refere a ninguém — é um \"il\" impessoal, só pra montar a frase, igual ao \"está\" de \"está chovendo\" em português." },
    vocab: [
      { f: "l'heure", t: "a hora" },
      { f: "le matin", t: "a manhã" },
      { f: "le midi", t: "o meio-dia" },
      { f: "le soir", t: "a noite (à noite)" },
      { f: "se réveiller", t: "acordar" },
      { f: "se lever", t: "levantar-se" },
      { f: "manger", t: "comer" },
      { f: "travailler", t: "trabalhar" },
      { f: "dormir", t: "dormir" },
      { f: "minuit", t: "meia-noite" }
    ],
    phrases: [
      { f: "Quelle heure est-il ?", t: "Que horas são?",
        blocks: [{f:"Quelle heure"},{f:"est-il ?"}],
        scenario: "Você esqueceu o relógio e quer saber que horas são. O que você pergunta?", scenarioEmoji: "⏰" },
      { f: "Il est huit heures.", t: "São oito horas.",
        blocks: [{f:"Il est"},{f:"huit heures."}],
        scenario: "Alguém pergunta as horas e são oito horas. O que você responde?", scenarioEmoji: "🕗" },
      { f: "Je me réveille à sept heures.", t: "Eu acordo às sete horas.",
        blocks: [{f:"Je me réveille"},{f:"à"},{f:"sept heures."}],
        scenario: "Alguém pergunta a que horas você acorda todo dia. O que você responde?", scenarioEmoji: "⏰" },
      { f: "Le soir, je regarde la télé.", t: "À noite, eu assisto TV.",
        blocks: [{f:"Le soir,"},{f:"je regarde"},{f:"la télé."}],
        scenario: "Alguém pergunta o que você faz à noite. O que você responde?", scenarioEmoji: "📺" },
      { f: "Il regarde l'heure sur son téléphone.", t: "Ele olha as horas no celular.",
        blocks: [{f:"Il regarde"},{f:"l'heure"},{f:"sur son téléphone."}] },
      { f: "Le midi, je mange à la maison.", t: "Ao meio-dia, eu como em casa.",
        blocks: [{f:"Le midi,"},{f:"je mange"},{f:"à la maison."}] },
      { f: "Il va se réveiller tôt demain.", t: "Ele vai acordar cedo amanhã.",
        blocks: [{f:"Il va"},{f:"se réveiller"},{f:"tôt demain."}] },
      { f: "Elle va se lever à sept heures.", t: "Ela vai se levantar às sete horas.",
        blocks: [{f:"Elle va"},{f:"se lever"},{f:"à sept heures."}] },
      { f: "Il doit travailler jusqu'à minuit.", t: "Ele precisa trabalhar até meia-noite.",
        blocks: [{f:"Il doit"},{f:"travailler"},{f:"jusqu'à minuit."}] },
      { f: "Je vais dormir maintenant.", t: "Vou dormir agora.",
        blocks: [{f:"Je vais"},{f:"dormir"},{f:"maintenant."}] }
    ],
    dialogue: {
      title: "Minha rotina",
      lines: [
        { spk: "A", f: "Tu te lèves à quelle heure ?", t: "Você levanta a que horas?" },
        { spk: "B", f: "Je me lève à six heures et demie.", t: "Eu levanto às seis e meia." },
        { spk: "A", f: "Et tu travailles quand ?", t: "E você trabalha quando?" },
        { spk: "B", f: "Je travaille le matin et l'après-midi.", t: "Eu trabalho de manhã e à tarde." }
      ]
    }
  },
  {
    id: "A1-g3",
    level: "A1",
    type: "grammar",
    title: "Verbos do 1º grupo e verbos pronominais",
    goal: "Conjugar verbos regulares em -er e verbos pronominais (reflexivos) no presente.",
    grammar: {
      blocks: [
        {
          title: "Verbos do 1º grupo (-er)",
          body: "A maioria dos verbos franceses termina em -er no infinitivo — é o chamado \"1º grupo\", e é o mais regular de todos. Basta tirar o -er e adicionar as terminações -e, -es, -e, -ons, -ez, -ent.",
          examples: [
            { f: "Je travaille le matin.", t: "Eu trabalho de manhã." },
            { f: "Tu manges à midi.", t: "Você come ao meio-dia." }
          ]
        },
        {
          title: "Uma pequena exceção: manger",
          body: "Verbos terminados em -ger (como manger) ganham um \"e\" extra antes de -ons, só pra manter o som suave do \"g\" — é a única mudança, e só acontece com \"nous\".",
          examples: [
            { f: "Nous mangeons à sept heures.", t: "Nós comemos às sete horas." },
            { f: "Vous mangez du pain.", t: "Vocês comem pão." }
          ]
        },
        {
          title: "Verbos pronominais",
          body: "Alguns verbos vêm sempre acompanhados de um pronome que \"reflete\" de volta pro sujeito — se réveiller (acordar), se lever (levantar-se). O pronome muda junto com o sujeito: me, te, se, nous, vous, se.",
          examples: [
            { f: "Je me lève à six heures.", t: "Eu levanto às seis horas." },
            { f: "Tu te réveilles tôt ?", t: "Você acorda cedo?" }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Repare que o verbo pronominal se conjuga exatamente como um verbo comum do 1º grupo — só muda o pronome reflexivo na frente. Aqui está a conjugação completa dos dois modelos:",
          examples: [],
          table: {
            travailler: [
              { pronoun: "je", form: "travaille" },
              { pronoun: "tu", form: "travailles" },
              { pronoun: "il / elle / on", form: "travaille" },
              { pronoun: "nous", form: "travaillons" },
              { pronoun: "vous", form: "travaillez" },
              { pronoun: "ils / elles", form: "travaillent" }
            ],
            "se lever": [
              { pronoun: "je", form: "me lève" },
              { pronoun: "tu", form: "te lèves" },
              { pronoun: "il / elle / on", form: "se lève" },
              { pronoun: "nous", form: "nous levons" },
              { pronoun: "vous", form: "vous levez" },
              { pronoun: "ils / elles", form: "se lèvent" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "Je ___ à sept heures.", hint: "se réveiller", answer: "me réveille" },
        { prompt: "Tu ___ tôt le matin ?", hint: "se lever", answer: "te lèves" },
        { prompt: "Nous ___ à midi.", hint: "manger", answer: "mangeons" },
        { prompt: "Il ___ le matin et l'après-midi.", hint: "travailler", answer: "travaille" },
        { prompt: "Vous ___ le fromage ?", hint: "aimer", answer: "aimez" },
        { prompt: "Elles ___ à six heures.", hint: "se lever", answer: "se lèvent" }
      ]
    }
  },
  {
    id: "A1-7",
    level: "A1",
    title: "Dias e meses",
    goal: "Dizer os dias da semana, meses e marcar um encontro.",
    usageNote: { title: "\"À demain\" ou \"à bientôt\"?", body: "As despedidas em francês variam conforme o tempo até o próximo encontro: <strong>à demain</strong> quando você sabe que vai rever a pessoa amanhã, e <strong>à bientôt</strong> quando o reencontro é mais incerto, só \"até breve\". Já <strong>au revoir</strong> é neutro e serve pra qualquer despedida, sem indicar quando será o próximo encontro." },
    vocab: [
      { f: "lundi", t: "segunda-feira" },
      { f: "mardi", t: "terça-feira" },
      { f: "aujourd'hui", t: "hoje" },
      { f: "demain", t: "amanhã" },
      { f: "hier", t: "ontem" },
      { f: "la semaine", t: "a semana" },
      { f: "le mois", t: "o mês" },
      { f: "janvier", t: "janeiro" },
      { f: "décembre", t: "dezembro" },
      { f: "la date", t: "a data" }
    ],
    phrases: [
      { f: "Quel jour sommes-nous ?", t: "Que dia é hoje?",
        blocks: [{f:"Quel jour"},{f:"sommes-nous ?"}],
        scenario: "Você perdeu a noção do dia da semana. O que você pergunta?", scenarioEmoji: "📅" },
      { f: "Nous sommes lundi.", t: "Hoje é segunda-feira.",
        blocks: [{f:"Nous sommes"},{f:"lundi."}],
        scenario: "Alguém pergunta que dia é hoje, e é segunda-feira. O que você responde?", scenarioEmoji: "🗓️" },
      { f: "Mon anniversaire est en mars.", t: "Meu aniversário é em março.",
        blocks: [{f:"Mon anniversaire"},{f:"est"},{f:"en mars."}],
        scenario: "Alguém pergunta em que mês é o seu aniversário — em março. O que você diz?", scenarioEmoji: "🎂" },
      { f: "À demain !", t: "Até amanhã!",
        blocks: [{f:"À"},{f:"demain !"}],
        scenario: "Você está se despedindo de um colega, e vai vê-lo de novo amanhã. O que você diz?", scenarioEmoji: "👋" },
      { f: "Aujourd'hui, il fait beau.", t: "Hoje está bonito.",
        blocks: [{f:"Aujourd'hui,"},{f:"il fait beau."}] },
      { f: "La semaine prochaine, je pars en voyage.", t: "Na próxima semana, eu vou viajar.",
        blocks: [{f:"La semaine"},{f:"prochaine,"},{f:"je pars en voyage."}] },
      { f: "Le mois de janvier est très froid.", t: "O mês de janeiro é muito frio.",
        blocks: [{f:"Le mois"},{f:"de janvier"},{f:"est très froid."}] },
      { f: "Mon anniversaire est en décembre.", t: "Meu aniversário é em dezembro.",
        blocks: [{f:"Mon anniversaire"},{f:"est en"},{f:"décembre."}] },
      { f: "Quelle est la date aujourd'hui ?", t: "Qual é a data hoje?",
        blocks: [{f:"Quelle est"},{f:"la date"},{f:"aujourd'hui ?"}] }
    ],
    dialogue: {
      title: "Marcando um encontro",
      lines: [
        { spk: "A", f: "On se voit quel jour ?", t: "A gente se vê que dia?" },
        { spk: "B", f: "Mardi, ça te va ?", t: "Terça, tá bom pra você?" },
        { spk: "A", f: "Non, je travaille mardi. Et mercredi ?", t: "Não, eu trabalho terça. E quarta?" },
        { spk: "B", f: "Parfait, à mercredi alors !", t: "Perfeito, até quarta então!" }
      ]
    }
  },
  {
    id: "A1-8",
    level: "A1",
    title: "Lugares e orientação",
    goal: "Perguntar e indicar como chegar a um lugar na cidade.",
    usageNote: { title: "\"Où est...?\" ou \"Il y a...?\"", body: "Use <strong>où est...?</strong> quando você já sabe que o lugar existe e só quer saber onde fica (ex: où est la gare? — onde fica a estação?). Use <strong>il y a...?</strong> quando você não sabe se o lugar existe ali perto (ex: il y a une pharmacie près d'ici? — tem uma farmácia aqui perto?)." },
    trueFalseExercises: [{ subject: "C'est loin d'ici ?", emoji: "🗺️", claim: "Essa pergunta é sobre o preço de alguma coisa.", answer: false,
      whyNote: "Errado — <strong>c'est loin d'ici ?</strong> pergunta sobre DISTÂNCIA (loin = longe), não preço. Preço seria \"c'est combien ?\"." }],
    vocab: [
      { f: "la rue", t: "a rua" },
      { f: "la place", t: "a praça" },
      { f: "le musée", t: "o museu" },
      { f: "l'hôpital", t: "o hospital" },
      { f: "la gare", t: "a estação (de trem)" },
      { f: "tout droit", t: "sempre em frente" },
      { f: "à gauche", t: "à esquerda" },
      { f: "à droite", t: "à direita" },
      { f: "près", t: "perto" },
      { f: "loin", t: "longe" }
    ],
    phrases: [
      { f: "Où est la gare ?", t: "Onde fica a estação?",
        blocks: [{f:"Où est"},{f:"la gare ?"}],
        scenario: "Você está perdido e precisa achar a estação de trem. O que você pergunta a alguém na rua?", scenarioEmoji: "🚉" },
      { f: "Tournez à gauche.", t: "Vire à esquerda.",
        blocks: [{f:"Tournez"},{f:"à gauche."}],
        scenario: "Você está dando instruções pra alguém chegar num lugar e precisa dizer para virar à esquerda. O que você diz?", scenarioEmoji: "⬅️" },
      { f: "C'est tout droit.", t: "É sempre em frente.",
        blocks: [{f:"C'est"},{f:"tout droit."}],
        scenario: "Alguém pergunta como chegar num lugar que fica sempre reto. O que você responde?", scenarioEmoji: "⬆️" },
      { f: "C'est loin d'ici ?", t: "É longe daqui?",
        blocks: [{f:"C'est loin"},{f:"d'ici ?"}],
        scenario: "Você quer saber se o lugar que está procurando fica longe de onde você está. O que você pergunta?", scenarioEmoji: "🗺️" },
      { f: "La rue est très calme le soir.", t: "A rua é bem tranquila à noite.",
        blocks: [{f:"La rue"},{f:"est très calme"},{f:"le soir."}] },
      { f: "La place est au centre-ville.", t: "A praça fica no centro da cidade.",
        blocks: [{f:"La place"},{f:"est au"},{f:"centre-ville."}] },
      { f: "L'hôpital est loin d'ici.", t: "O hospital fica longe daqui.",
        blocks: [{f:"L'hôpital"},{f:"est loin"},{f:"d'ici."}] }
    ],
    dialogue: {
      title: "Pedindo informação",
      lines: [
        { spk: "A", f: "Excusez-moi, où est le musée ?", t: "Com licença, onde fica o museu?" },
        { spk: "B", f: "C'est tout droit, puis à droite.", t: "É sempre em frente, depois à direita." },
        { spk: "A", f: "C'est loin ?", t: "É longe?" },
        { spk: "B", f: "Non, c'est à cinq minutes.", t: "Não, é a cinco minutos." },
        { spk: "A", f: "Merci beaucoup !", t: "Muito obrigado(a)!" }
      ]
    }
  },
  {
    id: "A1-g4",
    level: "A1",
    type: "grammar",
    title: "Preposições com países e cidades",
    goal: "Usar à, en, au e aux corretamente com nomes de cidades e países.",
    grammar: {
      blocks: [
        {
          title: "à + cidade",
          body: "Para dizer que algo acontece numa cidade, usa-se sempre à — sem artigo antes do nome da cidade, e sem se preocupar com gênero.",
          examples: [
            { f: "J'habite à Paris.", t: "Eu moro em Paris." },
            { f: "Elle voyage à Tokyo.", t: "Ela está viajando pra Tóquio." }
          ]
        },
        {
          title: "en + país feminino / au + país masculino",
          body: "A maioria dos países cujo nome termina em -e é feminina e usa en. Os demais (masculinos) usam au.",
          examples: [
            { f: "Je vais en France.", t: "Eu vou pra França. (la France, feminino)" },
            { f: "Il travaille au Brésil.", t: "Ele trabalha no Brasil. (le Brésil, masculino)" }
          ]
        },
        {
          title: "aux + país no plural",
          body: "Alguns países têm nome no plural — como les États-Unis (os Estados Unidos). Nesse caso, a preposição vira aux.",
          examples: [
            { f: "Ils habitent aux États-Unis.", t: "Eles moram nos Estados Unidos." },
            { f: "Elle est aux Pays-Bas.", t: "Ela está na Holanda." }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Resumindo: cidade sempre leva à; país depende do gênero (en/au) ou de ser plural (aux). Aqui está a tabela com alguns exemplos:",
          examples: [],
          table: {
            "Preposições": [
              { pronoun: "cidade", form: "à" },
              { pronoun: "país feminino (a maioria)", form: "en" },
              { pronoun: "país masculino", form: "au" },
              { pronoun: "país no plural", form: "aux" }
            ],
            "Exemplos": [
              { pronoun: "la France (fem.)", form: "en France" },
              { pronoun: "le Brésil (masc.)", form: "au Brésil" },
              { pronoun: "le Portugal (masc.)", form: "au Portugal" },
              { pronoun: "les États-Unis (plural)", form: "aux États-Unis" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "J'habite ___ Lyon.", hint: "cidade", answer: "à" },
        { prompt: "Il va ___ Portugal.", hint: "país masculino", answer: "au" },
        { prompt: "Elle voyage ___ Espagne.", hint: "país feminino", answer: "en" },
        { prompt: "Ils vivent ___ Pays-Bas.", hint: "país no plural", answer: "aux" },
        { prompt: "Nous sommes ___ Londres.", hint: "cidade", answer: "à" },
        { prompt: "Tu habites ___ Canada.", hint: "país masculino", answer: "au" }
      ]
    }
  },
  {
    id: "A1-9",
    level: "A1",
    title: "Nacionalidades",
    goal: "Dizer sua nacionalidade e a de outras pessoas, no masculino e no feminino.",
    usageNote: { title: "\"Je suis brésilienne\" ou \"je viens du Brésil\"?", body: "<strong>Être + nacionalidade</strong> fala da sua identidade (je suis brésilienne). <strong>Venir de + país</strong> fala da sua origem/procedência (je viens du Brésil). As duas frases dizem quase a mesma coisa, mas repare na preposição: <strong>du</strong> Brésil, <strong>de</strong> France, <strong>d'</strong>Espagne — ela muda conforme o gênero e a primeira letra do nome do país." },
    trueFalseExercises: [{ subject: "D'où viens-tu ?", emoji: "🌍", claim: "Essa pergunta serve pra saber o nome de alguém.", answer: false,
      whyNote: "Errado — <strong>d'où viens-tu ?</strong> pergunta de ONDE a pessoa vem (viens = vir), não o nome. Nome seria \"comment tu t'appelles ?\"." }],
    vocab: [
      { f: "français / française", t: "francês / francesa" },
      { f: "brésilien / brésilienne", t: "brasileiro / brasileira" },
      { f: "américain / américaine", t: "americano / americana" },
      { f: "anglais / anglaise", t: "inglês / inglesa" },
      { f: "espagnol / espagnole", t: "espanhol / espanhola" },
      { f: "italien / italienne", t: "italiano / italiana" },
      { f: "allemand / allemande", t: "alemão / alemã" },
      { f: "portugais / portugaise", t: "português / portuguesa" },
      { f: "la nationalité", t: "a nacionalidade" },
      { f: "venir de", t: "vir de (um lugar)" }
    ],
    phrases: [
      { f: "Je suis brésilienne.", t: "Eu sou brasileira.",
        blocks: [{f:"Je suis"},{f:"brésilienne."}],
        scenario: "Alguém te pergunta sua nacionalidade numa entrevista de trabalho. O que você diz?", scenarioEmoji: "🇧🇷" },
      { f: "Il est français, elle est espagnole.", t: "Ele é francês, ela é espanhola.",
        blocks: [{f:"Il est français,"},{f:"elle est"},{f:"espagnole."}],
        scenario: "Você está apresentando dois amigos de nacionalidades diferentes — um francês e uma espanhola. O que você diz sobre eles?", scenarioEmoji: "🌍" },
      { f: "D'où viens-tu ?", t: "De onde você vem?",
        blocks: [{f:"D'où"},{f:"viens-tu ?"}],
        scenario: "Você conheceu alguém novo numa viagem e quer saber de onde essa pessoa vem. O que você pergunta?", scenarioEmoji: "✈️" },
      { f: "Je viens du Portugal.", t: "Eu venho de Portugal.",
        blocks: [{f:"Je viens"},{f:"du Portugal."}],
        scenario: "Alguém pergunta de onde você vem, e você vem de Portugal. O que você responde?", scenarioEmoji: "🇵🇹" },
      { f: "La nationalité est écrite sur le passeport.", t: "A nacionalidade está escrita no passaporte.",
        blocks: [{f:"La nationalité"},{f:"est écrite"},{f:"sur le passeport."}] }
    ],
    dialogue: {
      title: "De onde você é?",
      lines: [
        { spk: "A", f: "Tu es d'où ?", t: "Você é de onde?" },
        { spk: "B", f: "Je suis italienne, et toi ?", t: "Eu sou italiana, e você?" },
        { spk: "A", f: "Moi, je suis allemand.", t: "Eu sou alemão." },
        { spk: "B", f: "Tu habites en Allemagne ?", t: "Você mora na Alemanha?" },
        { spk: "A", f: "Non, j'habite au Portugal maintenant.", t: "Não, eu moro em Portugal agora." }
      ]
    }
  },
  {
    id: "A1-10",
    level: "A1",
    title: "Compras",
    goal: "Perguntar preços (com números até cem), experimentar roupas e comprar numa loja.",
    usageNote: { title: "\"Je voudrais\" ou \"je peux\"?", body: "<strong>Je voudrais</strong> (eu gostaria) é a forma mais educada de pedir algo numa loja — soa mais gentil que \"je veux\" (eu quero). Já <strong>je peux...?</strong> (posso...?) é usado pra pedir permissão, como experimentar uma roupa: <strong>je peux</strong> essayer ce pantalon? Os dois são educados, mas servem pra momentos diferentes: pedir algo vs. pedir permissão." },
    vocab: [
      { f: "le pantalon", t: "a calça" },
      { f: "la robe", t: "o vestido" },
      { f: "cher", t: "caro" },
      { f: "pas cher", t: "barato" },
      { f: "la taille", t: "o tamanho" },
      { f: "le magasin", t: "a loja" },
      { f: "trente", t: "trinta" },
      { f: "quarante", t: "quarenta" },
      { f: "cinquante", t: "cinquenta" },
      { f: "soixante", t: "sessenta" },
      { f: "soixante-dix", t: "setenta" },
      { f: "quatre-vingts", t: "oitenta" },
      { f: "quatre-vingt-dix", t: "noventa" },
      { f: "cent", t: "cem" }
    ],
    phrases: [
      { f: "Combien ça coûte ?", t: "Quanto custa isso?",
        blocks: [{f:"Combien"},{f:"ça coûte ?"}],
        scenario: "Você está numa loja e quer saber o preço de um produto. O que você pergunta?", scenarioEmoji: "🏷️" },
      { f: "Ça coûte quarante euros.", t: "Custa quarenta euros.",
        blocks: [{f:"Ça coûte"},{f:"quarante"},{f:"euros."}],
        scenario: "Um cliente pergunta o preço de um produto que custa quarenta euros. O que você responde?", scenarioEmoji: "💶" },
      { f: "Je peux essayer ce pantalon ?", t: "Posso experimentar essa calça?",
        blocks: [{f:"Je peux essayer"},{f:"ce pantalon ?"}],
        scenario: "Você está numa loja de roupas e quer experimentar uma calça antes de comprar. O que você pergunta?", scenarioEmoji: "👖" },
      { f: "Ça fait cent euros, s'il vous plaît.", t: "São cem euros, por favor.",
        blocks: [{f:"Ça fait"},{f:"cent euros,"},{f:"s'il vous plaît."}],
        scenario: "Você é o vendedor e precisa cobrar cem euros do cliente. O que você diz?", scenarioEmoji: "💳" },
      { f: "Le pantalon est trop grand.", t: "A calça está grande demais.",
        blocks: [{f:"Le pantalon"},{f:"est trop"},{f:"grand."}] },
      { f: "La robe est très jolie.", t: "O vestido é muito bonito.",
        blocks: [{f:"La robe"},{f:"est très"},{f:"jolie."}] },
      { f: "Ce n'est pas cher du tout.", t: "Não é nada caro.",
        blocks: [{f:"Ce n'est"},{f:"pas cher"},{f:"du tout."}] },
      { f: "La taille est trop petite.", t: "O tamanho é pequeno demais.",
        blocks: [{f:"La taille"},{f:"est trop"},{f:"petite."}] },
      { f: "Le magasin ferme à dix-neuf heures.", t: "A loja fecha às dezenove horas.",
        blocks: [{f:"Le magasin"},{f:"ferme"},{f:"à dix-neuf heures."}] },
      { f: "Cette veste coûte trente euros.", t: "Esta jaqueta custa trinta euros.",
        blocks: [{f:"Cette veste"},{f:"coûte"},{f:"trente euros."}] },
      { f: "Ces chaussures coûtent cinquante euros.", t: "Estes sapatos custam cinquenta euros.",
        blocks: [{f:"Ces chaussures"},{f:"coûtent"},{f:"cinquante euros."}] },
      { f: "Le manteau coûte soixante-dix euros.", t: "O casaco custa setenta euros.",
        blocks: [{f:"Le manteau"},{f:"coûte"},{f:"soixante-dix euros."}] },
      { f: "Cette robe coûte quatre-vingts euros.", t: "Este vestido custa oitenta euros.",
        blocks: [{f:"Cette robe"},{f:"coûte"},{f:"quatre-vingts euros."}] },
      { f: "Ce sac coûte quatre-vingt-dix euros.", t: "Esta bolsa custa noventa euros.",
        blocks: [{f:"Ce sac"},{f:"coûte"},{f:"quatre-vingt-dix euros."}] }
    ],
    dialogue: {
      title: "Numa loja",
      lines: [
        { spk: "A", f: "Bonjour, je cherche une robe.", t: "Olá, estou procurando um vestido." },
        { spk: "B", f: "Quelle taille faites-vous ?", t: "Qual é o seu tamanho?" },
        { spk: "A", f: "Je fais du 38. Ça coûte combien ?", t: "Eu uso 38. Quanto custa?" },
        { spk: "B", f: "Elle coûte soixante euros.", t: "Custa sessenta euros." },
        { spk: "A", f: "Parfait, je la prends !", t: "Perfeito, vou levar!" }
      ]
    }
  },
  {
    id: "A1-g10",
    level: "A1",
    type: "grammar",
    title: "Números de 70 a 99",
    goal: "Entender e formar corretamente os números de setenta a noventa e nove.",
    grammar: {
      blocks: [
        {
          title: "Até sessenta, é regular",
          body: "Trente (30), quarante (40), cinquante (50) e soixante (60) seguem o padrão normal, uma palavra pra cada dezena — igual em português. O problema começa depois de sessenta: o francês simplesmente não tem uma palavra própria pra setenta, oitenta ou noventa.",
          examples: [
            { f: "J'ai trente ans.", t: "Eu tenho trinta anos." },
            { f: "Ça coûte soixante euros.", t: "Custa sessenta euros." }
          ]
        },
        {
          title: "70 = 60 + 10",
          body: "Setenta (soixante-dix) é literalmente \"sessenta e dez\". De 71 a 79, continua somando a partir de sessenta: soixante et onze (71), soixante-douze (72)... até soixante-dix-neuf (79).",
          examples: [
            { f: "Il a soixante-dix ans.", t: "Ele tem setenta anos. (60+10)" },
            { f: "Ça fait soixante-quinze euros.", t: "Dá setenta e cinco euros. (60+15)" }
          ]
        },
        {
          title: "80 = 4 × 20",
          body: "Oitenta (quatre-vingts) é \"quatro vezes vinte\". De 81 a 89, soma-se sem o \"et\": quatre-vingt-un (81), quatre-vingt-deux (82)... O \"s\" de vingts some assim que vem um número depois.",
          examples: [
            { f: "Elle a quatre-vingts ans.", t: "Ela tem oitenta anos. (4×20)" },
            { f: "Il y a quatre-vingt-trois personnes.", t: "Há oitenta e três pessoas. (4×20+3)" }
          ]
        },
        {
          title: "90 = 4 × 20 + 10",
          body: "Noventa (quatre-vingt-dix) junta as duas regras: quatro vezes vinte, mais dez. De 91 a 99, mesma lógica de 80: quatre-vingt-onze (91)... quatre-vingt-dix-neuf (99).",
          examples: [
            { f: "Mon grand-père a quatre-vingt-dix ans.", t: "Meu avô tem noventa anos. (4×20+10)" },
            { f: "Ça coûte quatre-vingt-dix-neuf euros.", t: "Custa noventa e nove euros. (4×20+19)" }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Resumindo a lógica das dezenas de 70 a 90 — o segredo é lembrar que soixante-dix e quatre-vingt-dix são a base pra somar de novo:",
          examples: [],
          table: {
            "Dezenas": [
              { pronoun: "70", form: "soixante-dix (60+10)" },
              { pronoun: "71", form: "soixante et onze (60+11)" },
              { pronoun: "80", form: "quatre-vingts (4×20)" },
              { pronoun: "81", form: "quatre-vingt-un (4×20+1)" },
              { pronoun: "90", form: "quatre-vingt-dix (4×20+10)" },
              { pronoun: "91", form: "quatre-vingt-onze (4×20+11)" },
              { pronoun: "99", form: "quatre-vingt-dix-neuf (4×20+19)" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "70 em francês:", hint: "60 + 10", answer: "soixante-dix" },
        { prompt: "71 em francês:", hint: "60 + 11 (com et)", answer: "soixante et onze" },
        { prompt: "80 em francês:", hint: "4 × 20", answer: "quatre-vingts" },
        { prompt: "81 em francês:", hint: "4×20 + 1 (sem et)", answer: "quatre-vingt-un" },
        { prompt: "90 em francês:", hint: "4×20 + 10", answer: "quatre-vingt-dix" },
        { prompt: "99 em francês:", hint: "4×20 + 19", answer: "quatre-vingt-dix-neuf" }
      ]
    }
  },
  {
    id: "A1-11",
    level: "A1",
    title: "Fazendo compras de mercado",
    goal: "Montar uma lista de compras e dizer o que você come ou não come no dia a dia.",
    usageNote: { title: "\"Je ne mange pas DE viande\" — cadê o \"la\"?", body: "Depois de uma negação com <strong>ne... pas</strong>, os artigos du/de la/des somem e viram só <strong>de</strong> (ou <strong>d'</strong> antes de vogal): je mange <strong>de la</strong> viande → je ne mange <strong>pas de</strong> viande. É uma regra que vale pra quase toda negação de quantidade em francês — vale prestar atenção nela." },
    vocab: [
      { f: "la viande", t: "a carne" },
      { f: "le poulet", t: "o frango" },
      { f: "les légumes", t: "os legumes / as verduras" },
      { f: "la salade", t: "a salada" },
      { f: "le riz", t: "o arroz" },
      { f: "les pâtes", t: "a massa" },
      { f: "le sucre", t: "o açúcar" },
      { f: "le sel", t: "o sal" },
      { f: "l'œuf", t: "o ovo" },
      { f: "le dessert", t: "a sobremesa" }
    ],
    phrases: [
      { f: "J'aime la viande.", t: "Eu gosto de carne.",
        blocks: [{f:"J'aime"},{f:"la viande."}],
        scenario: "Alguém pergunta se você gosta de carne, e você gosta muito. O que você responde?", scenarioEmoji: "🥩" },
      { f: "Je mange des légumes tous les jours.", t: "Como legumes todos os dias.",
        blocks: [{f:"Je mange"},{f:"des légumes"},{f:"tous les jours."}],
        scenario: "Alguém pergunta sobre seus hábitos alimentares e você come legumes todo dia. O que você diz?", scenarioEmoji: "🥦" },
      { f: "Je ne mange pas de viande.", t: "Eu não como carne.",
        blocks: [{f:"Je ne mange pas"},{f:"de viande."}],
        scenario: "Você é vegetariano e precisa avisar o garçom que não come carne. O que você diz?", scenarioEmoji: "🚫" },
      { f: "Je prends du riz et des pâtes.", t: "Eu levo arroz e massa.",
        blocks: [{f:"Je prends"},{f:"du riz"},{f:"et des pâtes."}],
        scenario: "No supermercado, alguém pergunta o que você vai levar. O que você responde?", scenarioEmoji: "🍚" },
      { f: "Le poulet est délicieux ce soir.", t: "O frango está delicioso hoje à noite.",
        blocks: [{f:"Le poulet"},{f:"est délicieux"},{f:"ce soir."}] },
      { f: "Les légumes sont bons pour la santé.", t: "Os vegetais são bons para a saúde.",
        blocks: [{f:"Les légumes"},{f:"sont bons"},{f:"pour la santé."}] },
      { f: "La salade est fraîche.", t: "A salada está fresca.",
        blocks: [{f:"La salade"},{f:"est fraîche."}] },
      { f: "Le riz et les pâtes sont mes plats préférés.", t: "O arroz e o macarrão são meus pratos favoritos.",
        blocks: [{f:"Le riz"},{f:"et les pâtes"},{f:"sont mes plats préférés."}] },
      { f: "Le sucre et le sel sont sur la table.", t: "O açúcar e o sal estão na mesa.",
        blocks: [{f:"Le sucre"},{f:"et le sel"},{f:"sont sur la table."}] },
      { f: "L'œuf est cuit.", t: "O ovo está cozido.",
        blocks: [{f:"L'œuf"},{f:"est cuit."}] },
      { f: "Le dessert est prêt.", t: "A sobremesa está pronta.",
        blocks: [{f:"Le dessert"},{f:"est prêt."}] }
    ],
    dialogue: {
      title: "Fazendo a lista de compras",
      lines: [
        { spk: "A", f: "Qu'est-ce qu'on achète ?", t: "O que a gente compra?" },
        { spk: "B", f: "Du riz, des légumes et du poulet.", t: "Arroz, legumes e frango." },
        { spk: "A", f: "Tu veux un dessert ?", t: "Você quer uma sobremesa?" },
        { spk: "B", f: "Oui, avec du sucre, s'il te plaît !", t: "Sim, com açúcar, por favor!" }
      ]
    }
  },
  {
    id: "A1-12",
    level: "A1",
    title: "Pesos e quantidades",
    goal: "Pedir quantidades específicas ao fazer compras: kilo, litre, un peu de, beaucoup de...",
    usageNote: { title: "\"Un kilo DE pommes\" — a mesma regra do \"de\"", body: "Depois de uma expressão de quantidade (un kilo <strong>de</strong>, un litre <strong>de</strong>, beaucoup <strong>de</strong>, trop <strong>de</strong>), o artigo também some e vira só <strong>de</strong>/<strong>d'</strong> — igual acontece depois de uma negação (unidade anterior). Repare: não se diz \"un kilo des pommes\", e sim <strong>un kilo de pommes</strong>." },
    vocab: [
      { f: "un kilo (de)", t: "um quilo (de)" },
      { f: "un demi-kilo", t: "meio quilo" },
      { f: "un litre", t: "um litro" },
      { f: "un gramme", t: "uma grama" },
      { f: "un peu de", t: "um pouco de" },
      { f: "beaucoup de", t: "muito / bastante" },
      { f: "assez de", t: "o suficiente de" },
      { f: "trop de", t: "demais / em excesso" },
      { f: "une tranche (de)", t: "uma fatia (de)" },
      { f: "une bouteille (de)", t: "uma garrafa (de)" }
    ],
    phrases: [
      { f: "Je prends un kilo de pommes.", t: "Eu levo um quilo de maçãs.",
        blocks: [{f:"Je prends"},{f:"un kilo"},{f:"de pommes."}],
        scenario: "Você está na feira e quer comprar um quilo de maçãs. O que você diz ao vendedor?", scenarioEmoji: "🍎" },
      { f: "Un litre de lait, s'il vous plaît.", t: "Um litro de leite, por favor.",
        blocks: [{f:"Un litre"},{f:"de lait,"},{f:"s'il vous plaît."}],
        scenario: "Você está no mercado e quer pedir um litro de leite. O que você diz?", scenarioEmoji: "🥛" },
      { f: "C'est trop de sucre pour moi.", t: "É açúcar demais pra mim.",
        blocks: [{f:"C'est trop"},{f:"de sucre"},{f:"pour moi."}],
        scenario: "Alguém está te servindo café com muito açúcar e é demais pra você. O que você diz?", scenarioEmoji: "🍬" },
      { f: "Une tranche de pain, s'il te plaît.", t: "Uma fatia de pão, por favor.",
        blocks: [{f:"Une tranche"},{f:"de pain,"},{f:"s'il te plaît."}],
        scenario: "Na mesa do café da manhã, você quer pedir uma fatia de pão. O que você diz?", scenarioEmoji: "🍞" },
      { f: "Un gramme, c'est très peu.", t: "Um grama é muito pouco.",
        blocks: [{f:"Un gramme,"},{f:"c'est très"},{f:"peu."}] },
      { f: "Il y a beaucoup de monde ici.", t: "Tem muita gente aqui.",
        blocks: [{f:"Il y a"},{f:"beaucoup de"},{f:"monde ici."}] },
      { f: "Je n'ai pas assez de temps.", t: "Eu não tenho tempo suficiente.",
        blocks: [{f:"Je n'ai pas"},{f:"assez de"},{f:"temps."}] }
    ],
    dialogue: {
      title: "Comprando no mercado",
      lines: [
        { spk: "A", f: "Vous voulez combien de pommes ?", t: "Quantas maçãs você quer?" },
        { spk: "B", f: "Un demi-kilo, s'il vous plaît.", t: "Meio quilo, por favor." },
        { spk: "A", f: "Et avec ça ?", t: "E mais alguma coisa?" },
        { spk: "B", f: "Une bouteille d'eau et un peu de fromage.", t: "Uma garrafa de água e um pouco de queijo." }
      ]
    }
  },
  {
    id: "A1-13",
    level: "A1",
    title: "Clima e estações",
    goal: "Falar sobre o tempo e as estações do ano.",
    usageNote: { title: "\"Il fait chaud\" ou \"j'ai chaud\"?", body: "Pra falar do <strong>tempo/clima</strong>, o francês usa o verbo faire: <strong>il fait chaud</strong> (está calor lá fora). Pra falar de uma <strong>sensação sua</strong>, usa avoir: <strong>j'ai chaud</strong> (estou com calor, eu sinto calor). São frases parecidas mas com sujeitos bem diferentes — \"il\" impessoal pro clima, \"je\" pra você mesmo." },
    trueFalseExercises: [{ subject: "Il fait très chaud aujourd'hui.", emoji: "☀️", claim: "Essa frase descreve como uma pessoa está se sentindo.", answer: false,
      whyNote: "Errado — <strong>il fait chaud</strong> descreve o CLIMA (faz calor), não como alguém se sente. O \"il\" aqui é impessoal, como em \"está fazendo calor\"." }],
    vocab: [
      { f: "il fait beau", t: "está bonito (tempo)" },
      { f: "il fait froid", t: "está frio" },
      { f: "il fait chaud", t: "está quente" },
      { f: "il pleut", t: "está chovendo" },
      { f: "il neige", t: "está nevando" },
      { f: "le soleil", t: "o sol" },
      { f: "le printemps", t: "a primavera" },
      { f: "l'été", t: "o verão" },
      { f: "l'automne", t: "o outono" },
      { f: "l'hiver", t: "o inverno" }
    ],
    phrases: [
      { f: "Quel temps fait-il ?", t: "Como está o tempo?",
        blocks: [{f:"Quel temps"},{f:"fait-il ?"}],
        scenario: "Você vai sair e quer saber como está o tempo lá fora. O que você pergunta?", scenarioEmoji: "🌦️" },
      { f: "Il fait très chaud aujourd'hui.", t: "Está muito quente hoje.",
        blocks: [{f:"Il fait"},{f:"très chaud"},{f:"aujourd'hui."}],
        scenario: "Alguém pergunta como está o tempo, e está muito quente hoje. O que você responde?", scenarioEmoji: "☀️" },
      { f: "J'aime l'hiver.", t: "Eu gosto do inverno.",
        blocks: [{f:"J'aime"},{f:"l'hiver."}],
        scenario: "Alguém pergunta sua estação preferida, e é o inverno. O que você diz?", scenarioEmoji: "❄️" },
      { f: "Il pleut souvent en automne.", t: "Chove frequentemente no outono.",
        blocks: [{f:"Il pleut"},{f:"souvent"},{f:"en automne."}],
        scenario: "Alguém pergunta como é o outono na sua cidade, com chuva frequente. O que você diz?", scenarioEmoji: "🍂" },
      { f: "Il neige beaucoup en hiver.", t: "Neva muito no inverno.",
        blocks: [{f:"Il neige"},{f:"beaucoup"},{f:"en hiver."}] },
      { f: "Le soleil brille aujourd'hui.", t: "O sol está brilhando hoje.",
        blocks: [{f:"Le soleil"},{f:"brille"},{f:"aujourd'hui."}] },
      { f: "Le printemps est ma saison préférée.", t: "A primavera é minha estação favorita.",
        blocks: [{f:"Le printemps"},{f:"est ma saison"},{f:"préférée."}] },
      { f: "L'automne est très coloré.", t: "O outono é bem colorido.",
        blocks: [{f:"L'automne"},{f:"est très"},{f:"coloré."}] }
    ],
    dialogue: {
      title: "Falando do tempo",
      lines: [
        { spk: "A", f: "Quel temps fait-il aujourd'hui ?", t: "Como está o tempo hoje?" },
        { spk: "B", f: "Il fait beau, mais il fait froid.", t: "Está bonito, mas está frio." },
        { spk: "A", f: "Tu préfères quelle saison ?", t: "Você prefere qual estação?" },
        { spk: "B", f: "Je préfère l'été, il fait chaud.", t: "Eu prefiro o verão, está quente." }
      ]
    }
  },
  {
    id: "A1-14",
    level: "A1",
    title: "Transporte",
    goal: "Pegar um transporte público e comprar uma passagem.",
    usageNote: { title: "\"En métro\" ou \"à pied\"?", body: "Meios de transporte \"fechados\" (onde você entra) usam <strong>en</strong>: <strong>en</strong> métro, <strong>en</strong> voiture, <strong>en</strong> bus. Já formas \"abertas\", sem se entrar em nada — como ir a pé ou de bicicleta montada por cima — usam <strong>à</strong>: <strong>à</strong> pied, <strong>à</strong> vélo. É uma regra pequena, mas aparece toda hora no dia a dia." },
    vocab: [
      { f: "le bus", t: "o ônibus" },
      { f: "le train", t: "o trem" },
      { f: "le métro", t: "o metrô" },
      { f: "la voiture", t: "o carro" },
      { f: "le vélo", t: "a bicicleta" },
      { f: "à pied", t: "a pé" },
      { f: "prendre", t: "pegar (um transporte)" },
      { f: "l'arrêt", t: "o ponto (de ônibus)" },
      { f: "le billet", t: "a passagem" },
      { f: "la station", t: "a estação (de metrô)" }
    ],
    phrases: [
      { f: "Je prends le métro tous les jours.", t: "Eu pego o metrô todos os dias.",
        blocks: [{f:"Je prends"},{f:"le métro"},{f:"tous les jours."}],
        scenario: "Alguém pergunta como você vai trabalhar, e é sempre de metrô. O que você responde?", scenarioEmoji: "🚇" },
      { f: "Où est l'arrêt de bus ?", t: "Onde fica o ponto de ônibus?",
        blocks: [{f:"Où est"},{f:"l'arrêt"},{f:"de bus ?"}],
        scenario: "Você está perdido e precisa achar o ponto de ônibus. O que você pergunta?", scenarioEmoji: "🚌" },
      { f: "Un billet, s'il vous plaît.", t: "Uma passagem, por favor.",
        blocks: [{f:"Un billet,"},{f:"s'il vous plaît."}],
        scenario: "Você está na estação e quer comprar uma passagem. O que você diz?", scenarioEmoji: "🎫" },
      { f: "Je vais au travail à pied.", t: "Eu vou ao trabalho a pé.",
        blocks: [{f:"Je vais"},{f:"au travail"},{f:"à pied."}],
        scenario: "Alguém pergunta como você vai ao trabalho, e você vai andando. O que você responde?", scenarioEmoji: "🚶" },
      { f: "Je vais prendre le bus ce matin.", t: "Vou pegar o ônibus hoje de manhã.",
        blocks: [{f:"Je vais prendre"},{f:"le bus"},{f:"ce matin."}] },
      { f: "Le train part à huit heures.", t: "O trem parte às oito horas.",
        blocks: [{f:"Le train"},{f:"part"},{f:"à huit heures."}] },
      { f: "La voiture est garée devant la maison.", t: "O carro está estacionado na frente da casa.",
        blocks: [{f:"La voiture"},{f:"est garée"},{f:"devant la maison."}] },
      { f: "Le vélo est plus rapide en ville.", t: "A bicicleta é mais rápida na cidade.",
        blocks: [{f:"Le vélo"},{f:"est plus rapide"},{f:"en ville."}] },
      { f: "La station est fermée aujourd'hui.", t: "A estação está fechada hoje.",
        blocks: [{f:"La station"},{f:"est fermée"},{f:"aujourd'hui."}] }
    ],
    dialogue: {
      title: "Na estação de metrô",
      lines: [
        { spk: "A", f: "Excusez-moi, ce train va au centre-ville ?", t: "Com licença, esse trem vai pro centro?" },
        { spk: "B", f: "Oui, c'est la bonne direction.", t: "Sim, é a direção certa." },
        { spk: "A", f: "Combien coûte le billet ?", t: "Quanto custa a passagem?" },
        { spk: "B", f: "Ça coûte deux euros.", t: "Custa dois euros." }
      ]
    }
  },
  {
    id: "A1-g5",
    level: "A1",
    type: "grammar",
    title: "Verbos faire e prendre",
    goal: "Conjugar os verbos irregulares faire e prendre no presente.",
    grammar: {
      blocks: [
        {
          title: "Faire: um verbo com mil usos",
          body: "Faire (fazer) é irregular e aparece em muitas expressões fixas — inclusive nas de clima que você já viu, como il fait chaud e il fait froid.",
          examples: [
            { f: "Il fait 30 degrés aujourd'hui.", t: "Está fazendo 30 graus hoje." },
            { f: "Que fais-tu ce soir ?", t: "O que você faz hoje à noite?" }
          ]
        },
        {
          title: "Prendre: pegar, tomar, comer",
          body: "Prendre (pegar/tomar) é usado tanto pra transporte, como você já viu, quanto pra pedir comida ou bebida — é um verbo bem versátil no dia a dia.",
          examples: [
            { f: "Je prends souvent le métro.", t: "Eu pego o metrô frequentemente." },
            { f: "Tu prends un café ?", t: "Você vai tomar um café?" }
          ]
        },
        {
          title: "Um padrão parecido",
          body: "Repare que os dois verbos mudam de raiz no plural — faire vira fais-/fais-/fait- no singular mas faisons/faites/font no plural, e prendre dobra o \"n\" em ils/elles prennent. Vale prestar atenção nessas irregularidades.",
          examples: [
            { f: "Nous prenons le bus ensemble.", t: "Nós pegamos o ônibus juntos." },
            { f: "Vous faites quoi ce week-end ?", t: "O que vocês fazem esse fim de semana?" }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Aqui está a conjugação completa dos dois verbos — repare nas irregularidades destacadas:",
          examples: [],
          table: {
            faire: [
              { pronoun: "je", form: "fais" },
              { pronoun: "tu", form: "fais" },
              { pronoun: "il / elle / on", form: "fait" },
              { pronoun: "nous", form: "faisons" },
              { pronoun: "vous", form: "faites" },
              { pronoun: "ils / elles", form: "font" }
            ],
            prendre: [
              { pronoun: "je", form: "prends" },
              { pronoun: "tu", form: "prends" },
              { pronoun: "il / elle / on", form: "prend" },
              { pronoun: "nous", form: "prenons" },
              { pronoun: "vous", form: "prenez" },
              { pronoun: "ils / elles", form: "prennent" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "Il ___ chaud aujourd'hui.", hint: "faire", answer: "fait" },
        { prompt: "Je ___ le métro tous les jours.", hint: "prendre", answer: "prends" },
        { prompt: "Nous ___ du sport le week-end.", hint: "faire", answer: "faisons" },
        { prompt: "Vous ___ un café ?", hint: "prendre", answer: "prenez" },
        { prompt: "Elles ___ le train ensemble.", hint: "prendre", answer: "prennent" },
        { prompt: "Tu ___ quoi ce soir ?", hint: "faire", answer: "fais" }
      ]
    }
  },
  {
    id: "A1-15",
    level: "A1",
    title: "Corpo e saúde",
    goal: "Descrever sintomas simples e ir ao médico.",
    usageNote: { title: "\"J'ai mal à la tête\" ou \"je suis malade\"?", body: "Pra dores localizadas numa parte do corpo, usa-se <strong>avoir mal à</strong>: <strong>j'ai mal à la</strong> tête (estou com dor de cabeça). Pra um estado geral de mal-estar, sem apontar uma parte específica, usa-se <strong>être malade</strong>: <strong>je suis malade</strong> (estou doente). A escolha do verbo muda conforme você está descrevendo uma dor específica ou um estado geral." },
    trueFalseExercises: [{ subject: "J'ai mal à la tête.", emoji: "🤕", claim: "Essa frase é usada quando alguém está com dor de cabeça.", answer: true,
      whyNote: "Correto — <strong>j'ai mal à la tête</strong> significa literalmente \"eu tenho mal na cabeça\", ou seja, dor de cabeça." }],
    vocab: [
      { f: "la tête", t: "a cabeça" },
      { f: "le ventre", t: "a barriga" },
      { f: "la main", t: "a mão" },
      { f: "le pied", t: "o pé" },
      { f: "malade", t: "doente" },
      { f: "le médecin", t: "o médico" },
      { f: "la pharmacie", t: "a farmácia" },
      { f: "avoir mal", t: "estar com dor" },
      { f: "la fièvre", t: "a febre" },
      { f: "se sentir", t: "sentir-se" }
    ],
    phrases: [
      { f: "J'ai mal à la tête.", t: "Estou com dor de cabeça.",
        blocks: [{f:"J'ai mal"},{f:"à la tête."}],
        scenario: "Você não está se sentindo bem, com dor de cabeça. O que você diz a um amigo?", scenarioEmoji: "🤕" },
      { f: "Je me sens malade.", t: "Eu me sinto doente.",
        blocks: [{f:"Je me sens"},{f:"malade."}],
        scenario: "Você não está bem e precisa avisar que está doente. O que você diz?", scenarioEmoji: "🤒" },
      { f: "Où est la pharmacie ?", t: "Onde fica a farmácia?",
        blocks: [{f:"Où est"},{f:"la pharmacie ?"}],
        scenario: "Você precisa comprar remédio e não sabe onde fica a farmácia. O que você pergunta?", scenarioEmoji: "💊" },
      { f: "Il a de la fièvre.", t: "Ele está com febre.",
        blocks: [{f:"Il a"},{f:"de la fièvre."}],
        scenario: "Seu filho está com febre e você está explicando isso ao médico. O que você diz?", scenarioEmoji: "🌡️" },
      { f: "Le ventre me fait mal.", t: "Minha barriga dói.",
        blocks: [{f:"Le ventre"},{f:"me fait"},{f:"mal."}] },
      { f: "La main est blessée.", t: "A mão está machucada.",
        blocks: [{f:"La main"},{f:"est blessée."}] },
      { f: "Le pied me fait mal aussi.", t: "O pé também dói.",
        blocks: [{f:"Le pied"},{f:"me fait mal"},{f:"aussi."}] },
      { f: "Le médecin arrive dans dix minutes.", t: "O médico chega em dez minutos.",
        blocks: [{f:"Le médecin"},{f:"arrive"},{f:"dans dix minutes."}] },
      { f: "Je vais avoir mal à la tête si ça continue.", t: "Vou ficar com dor de cabeça se isso continuar.",
        blocks: [{f:"Je vais"},{f:"avoir mal"},{f:"à la tête si ça continue."}] },
      { f: "Il ne va pas se sentir bien demain.", t: "Ele não vai se sentir bem amanhã.",
        blocks: [{f:"Il ne va pas"},{f:"se sentir bien"},{f:"demain."}] }
    ],
    dialogue: {
      title: "No médico",
      lines: [
        { spk: "A", f: "Qu'est-ce qui ne va pas ?", t: "O que não vai bem?" },
        { spk: "B", f: "J'ai mal au ventre et j'ai de la fièvre.", t: "Estou com dor de barriga e com febre." },
        { spk: "A", f: "Depuis quand ?", t: "Desde quando?" },
        { spk: "B", f: "Depuis hier soir.", t: "Desde ontem à noite." },
        { spk: "A", f: "Vous devez vous reposer.", t: "Você precisa descansar." }
      ]
    }
  },
  {
    id: "A1-g6",
    level: "A1",
    type: "grammar",
    title: "Verbos modais e il faut",
    goal: "Conjugar vouloir, pouvoir, devoir e savoir, e entender quando usar il faut no lugar de devoir.",
    grammar: {
      blocks: [
        {
          title: "Vouloir e pouvoir",
          body: "Vouloir (querer) e pouvoir (poder) são dois dos verbos mais usados do francês, e aparecem em quase toda conversa do dia a dia. Você já viu os dois em unidades anteriores, sem parar pra pensar na conjugação completa.",
          examples: [
            { f: "Tu veux un dessert ?", t: "Você quer uma sobremesa?" },
            { f: "Je peux essayer cette robe ?", t: "Posso experimentar esse vestido?" }
          ]
        },
        {
          title: "Devoir e savoir",
          body: "Devoir (dever/precisar) expressa obrigação pessoal, e savoir (saber) expressa conhecimento ou uma habilidade aprendida — diferente de connaître (conhecer um lugar/pessoa), que você vai ver mais adiante.",
          examples: [
            { f: "Vous devez vous reposer.", t: "Você precisa descansar." },
            { f: "Je sais parler français.", t: "Eu sei falar francês." }
          ]
        },
        {
          title: "Il faut: uma alternativa impessoal a devoir",
          body: "Il faut + infinitivo expressa uma necessidade ou regra geral — sem dizer QUEM precisa fazer algo. Il faut nunca conjuga, é sempre a mesma forma. Já devoir + infinitivo é pessoal: você conjuga o verbo pra dizer que UMA PESSOA específica precisa fazer algo (je dois, tu dois, il doit...). Compare os dois exemplos: o primeiro é uma regra geral, o segundo é dirigido a alguém específico.",
          examples: [
            { f: "Il faut dormir huit heures.", t: "É preciso dormir oito horas. (regra geral, vale pra qualquer um)" },
            { f: "Tu dois te reposer.", t: "Você precisa descansar. (dirigido a você especificamente)" }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Quatro verbos essenciais — todos irregulares, então vale a pena memorizar a tabela inteira. Lembre-se: il faut não está na tabela porque não conjuga, é sempre invariável.",
          examples: [],
          table: {
            vouloir: [
              { pronoun: "je", form: "veux" },
              { pronoun: "tu", form: "veux" },
              { pronoun: "il / elle / on", form: "veut" },
              { pronoun: "nous", form: "voulons" },
              { pronoun: "vous", form: "voulez" },
              { pronoun: "ils / elles", form: "veulent" }
            ],
            pouvoir: [
              { pronoun: "je", form: "peux" },
              { pronoun: "tu", form: "peux" },
              { pronoun: "il / elle / on", form: "peut" },
              { pronoun: "nous", form: "pouvons" },
              { pronoun: "vous", form: "pouvez" },
              { pronoun: "ils / elles", form: "peuvent" }
            ],
            devoir: [
              { pronoun: "je", form: "dois" },
              { pronoun: "tu", form: "dois" },
              { pronoun: "il / elle / on", form: "doit" },
              { pronoun: "nous", form: "devons" },
              { pronoun: "vous", form: "devez" },
              { pronoun: "ils / elles", form: "doivent" }
            ],
            savoir: [
              { pronoun: "je", form: "sais" },
              { pronoun: "tu", form: "sais" },
              { pronoun: "il / elle / on", form: "sait" },
              { pronoun: "nous", form: "savons" },
              { pronoun: "vous", form: "savez" },
              { pronoun: "ils / elles", form: "savent" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "Je ___ un café.", hint: "vouloir", answer: "veux" },
        { prompt: "Tu ___ essayer cette robe ?", hint: "pouvoir", answer: "peux" },
        { prompt: "Nous ___ nous reposer.", hint: "devoir", answer: "devons" },
        { prompt: "Elle ___ parler trois langues.", hint: "savoir", answer: "sait" },
        { prompt: "Il ___ manger des légumes tous les jours.", hint: "il faut (impessoal)", answer: "faut" },
        { prompt: "Vous ___ un dessert ?", hint: "vouloir", answer: "voulez" },
        { prompt: "Ils ___ prendre le bus.", hint: "pouvoir", answer: "peuvent" },
        { prompt: "Je ___ nager.", hint: "savoir", answer: "sais" }
      ]
    }
  },
  {
    id: "A1-16",
    level: "A1",
    title: "Cores e descrições",
    goal: "Descrever cores, objetos e características de pessoas.",
    usageNote: { title: "Por que \"une jolie robe rouge\" e não \"une rouge jolie robe\"?", body: "A maioria dos adjetivos em francês vem <strong>depois</strong> do substantivo (une robe <strong>rouge</strong>, un chat <strong>noir</strong>) — diferente do português, mas parecido também. Só um grupo pequeno de adjetivos comuns e curtos (como jolie, grand, petit, bon) vem <strong>antes</strong>: une <strong>jolie</strong> robe. Por isso \"uma roupa vermelha bonita\" fica <strong>une jolie robe rouge</strong> — jolie antes, rouge depois." },
    vocab: [
      { f: "rouge", t: "vermelho" },
      { f: "bleu", t: "azul" },
      { f: "vert", t: "verde" },
      { f: "jaune", t: "amarelo" },
      { f: "noir", t: "preto" },
      { f: "blanc", t: "branco" },
      { f: "grand", t: "grande / alto" },
      { f: "petit", t: "pequeno / baixo" },
      { f: "joli", t: "bonito" },
      { f: "gentil", t: "gentil / legal" }
    ],
    phrases: [
      { f: "J'aime la couleur bleue.", t: "Eu gosto da cor azul.",
        blocks: [{f:"J'aime"},{f:"la couleur"},{f:"bleue."}],
        scenario: "Alguém pergunta sua cor preferida, que é o azul. O que você diz?", scenarioEmoji: "🔵" },
      { f: "Elle est très gentille.", t: "Ela é muito gentil.",
        blocks: [{f:"Elle est"},{f:"très"},{f:"gentille."}],
        scenario: "Alguém pergunta como é a sua nova colega, que é muito gentil. O que você diz?", scenarioEmoji: "😊" },
      { f: "Mon chat est noir et blanc.", t: "Meu gato é preto e branco.",
        blocks: [{f:"Mon chat"},{f:"est noir"},{f:"et blanc."}],
        scenario: "Alguém pergunta como é o seu gato, que é preto e branco. O que você responde?", scenarioEmoji: "🐱" },
      { f: "C'est une jolie robe rouge.", t: "É um vestido vermelho bonito.",
        blocks: [{f:"C'est"},{f:"une jolie robe"},{f:"rouge."}],
        scenario: "Você está descrevendo um vestido vermelho bonito que viu numa loja. O que você diz?", scenarioEmoji: "👗" },
      { f: "Le pull est vert et jaune.", t: "O suéter é verde e amarelo.",
        blocks: [{f:"Le pull"},{f:"est vert"},{f:"et jaune."}] },
      { f: "Le chien est petit.", t: "O cachorro é pequeno.",
        blocks: [{f:"Le chien"},{f:"est petit."}] }
    ],
    dialogue: {
      title: "Descrevendo alguém",
      lines: [
        { spk: "A", f: "Comment est ton frère ?", t: "Como é o seu irmão?" },
        { spk: "B", f: "Il est grand et il a les cheveux noirs.", t: "Ele é alto e tem cabelo preto." },
        { spk: "A", f: "Il est sympa ?", t: "Ele é legal?" },
        { spk: "B", f: "Oui, il est très gentil !", t: "Sim, ele é muito gentil!" }
      ]
    }
  },
  {
    id: "A1-g7",
    level: "A1",
    type: "grammar",
    title: "Comparativos",
    goal: "Comparar pessoas e coisas usando plus, moins e aussi... que.",
    grammar: {
      blocks: [
        {
          title: "Plus... que (mais... que)",
          body: "Pra dizer que algo tem \"mais\" de uma característica que outra coisa, usa-se plus + adjetivo + que. É a estrutura de comparação mais comum do francês.",
          examples: [
            { f: "Mon frère est plus grand que moi.", t: "Meu irmão é mais alto que eu." },
            { f: "Cette robe est plus jolie que l'autre.", t: "Esse vestido é mais bonito que o outro." }
          ]
        },
        {
          title: "Moins... que / aussi... que",
          body: "Do outro lado, moins... que expressa inferioridade (\"menos... que\") e aussi... que expressa igualdade (\"tão... quanto\"). A estrutura é sempre a mesma, só troca a palavrinha do meio.",
          examples: [
            { f: "Elle est moins grande que lui.", t: "Ela é menos alta que ele." },
            { f: "Il est aussi gentil que son frère.", t: "Ele é tão gentil quanto o irmão." }
          ]
        },
        {
          title: "Uma irregularidade: bon → meilleur",
          body: "Assim como em português \"bom\" não vira \"mais bom\" e sim \"melhor\", em francês bon também foge do padrão: não existe \"plus bon\" — a forma correta é meilleur. O mesmo acontece com o advérbio bien (bem), que vira mieux (melhor) no comparativo.",
          examples: [
            { f: "Ce gâteau est meilleur que l'autre.", t: "Esse bolo é melhor que o outro." },
            { f: "Elle chante mieux que moi.", t: "Ela canta melhor que eu." }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Recapitulando as três estruturas de comparação e a exceção do bon/bien — vale memorizar essa tabela, porque bon → meilleur é um erro muito comum entre iniciantes:",
          examples: [],
          table: {
            Comparativos: [
              { pronoun: "superioridade (mais... que)", form: "plus ... que" },
              { pronoun: "inferioridade (menos... que)", form: "moins ... que" },
              { pronoun: "igualdade (tão... quanto)", form: "aussi ... que" },
              { pronoun: "bon (bom) → irregular", form: "meilleur" },
              { pronoun: "bien (bem) → irregular", form: "mieux" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "Mon frère est ___ grand que moi.", hint: "superioridade", answer: "plus" },
        { prompt: "Cette maison est ___ petite que l'autre.", hint: "inferioridade", answer: "moins" },
        { prompt: "Il est ___ gentil que sa sœur.", hint: "igualdade", answer: "aussi" },
        { prompt: "Ce livre est ___ que l'autre.", hint: "bon → irregular", answer: "meilleur" },
        { prompt: "Elle est ___ jolie que moi.", hint: "igualdade", answer: "aussi" },
        { prompt: "Ton chat est ___ grand que le mien.", hint: "inferioridade", answer: "moins" }
      ]
    }
  },
  {
    id: "A1-17",
    level: "A1",
    title: "A casa e os cômodos",
    goal: "Descrever uma casa, dizer o que tem (e o que não tem) nela.",
    usageNote: { title: "\"Il y a\" ou \"il n'y a pas de\"?", body: "<strong>Il y a</strong> (tem/há) apresenta algo que existe: il y a <strong>une</strong> chambre (tem um quarto). Na negação, o artigo vira <strong>de</strong>, igual às unidades de \"comidas\" e \"quantidades\": il n'y a <strong>pas de</strong> jardin (não tem jardim) — nunca \"il n'y a pas un jardin\"." },
    vocab: [
      { f: "la maison", t: "a casa" },
      { f: "l'appartement", t: "o apartamento" },
      { f: "la chambre", t: "o quarto" },
      { f: "la cuisine", t: "a cozinha" },
      { f: "la salle de bain", t: "o banheiro" },
      { f: "le salon", t: "a sala" },
      { f: "la porte", t: "a porta" },
      { f: "la fenêtre", t: "a janela" },
      { f: "il y a", t: "tem / há" },
      { f: "il n'y a pas de", t: "não tem / não há" }
    ],
    phrases: [
      { f: "Il y a une chambre.", t: "Tem um quarto.",
        blocks: [{f:"Il y a"},{f:"une chambre."}],
        scenario: "Alguém pergunta quantos quartos tem seu apartamento pequeno, que tem só um. O que você diz?", scenarioEmoji: "🛏️" },
      { f: "Il y a deux salles de bain.", t: "Tem dois banheiros.",
        blocks: [{f:"Il y a"},{f:"deux"},{f:"salles de bain."}],
        scenario: "Você está descrevendo sua casa, que tem dois banheiros. O que você diz?", scenarioEmoji: "🚿" },
      { f: "Il n'y a pas de jardin.", t: "Não tem jardim.",
        blocks: [{f:"Il n'y a pas"},{f:"de jardin."}],
        scenario: "Alguém pergunta se seu apartamento tem jardim, e não tem. O que você responde?", scenarioEmoji: "🚫" },
      { f: "C'est une grande maison.", t: "É uma casa grande.",
        blocks: [{f:"C'est"},{f:"une grande"},{f:"maison."}],
        scenario: "Você está descrevendo a casa nova dos seus pais, que é bem grande. O que você diz?", scenarioEmoji: "🏠" },
      { f: "La maison est très grande.", t: "A casa é bem grande.",
        blocks: [{f:"La maison"},{f:"est très"},{f:"grande."}] },
      { f: "L'appartement a deux chambres.", t: "O apartamento tem dois quartos.",
        blocks: [{f:"L'appartement"},{f:"a deux"},{f:"chambres."}] },
      { f: "La chambre est au premier étage.", t: "O quarto fica no primeiro andar.",
        blocks: [{f:"La chambre"},{f:"est au"},{f:"premier étage."}] },
      { f: "La cuisine est très propre.", t: "A cozinha está bem limpa.",
        blocks: [{f:"La cuisine"},{f:"est très"},{f:"propre."}] },
      { f: "La salle de bain est à côté de la chambre.", t: "O banheiro fica ao lado do quarto.",
        blocks: [{f:"La salle de bain"},{f:"est à côté"},{f:"de la chambre."}] },
      { f: "Le salon est confortable.", t: "A sala de estar é confortável.",
        blocks: [{f:"Le salon"},{f:"est confortable."}] },
      { f: "La porte est fermée à clé.", t: "A porta está trancada.",
        blocks: [{f:"La porte"},{f:"est fermée"},{f:"à clé."}] },
      { f: "La fenêtre donne sur le jardin.", t: "A janela dá para o jardim.",
        blocks: [{f:"La fenêtre"},{f:"donne sur"},{f:"le jardin."}] }
    ],
    dialogue: {
      title: "Visitando um apartamento",
      lines: [
        { spk: "A", f: "Il y a combien de chambres ?", t: "Tem quantos quartos?" },
        { spk: "B", f: "Il y a deux chambres et une cuisine.", t: "Tem dois quartos e uma cozinha." },
        { spk: "A", f: "Il y a un balcon ?", t: "Tem uma varanda?" },
        { spk: "B", f: "Non, il n'y a pas de balcon, mais il y a un beau salon.", t: "Não, não tem varanda, mas tem uma sala bonita." }
      ]
    }
  },
  {
    id: "A1-18",
    level: "A1",
    title: "Onde as coisas estão",
    goal: "Descrever a posição de móveis e objetos usando preposições de lugar.",
    usageNote: { title: "\"Sur\" ou \"dans\"?", body: "<strong>Sur</strong> é \"em cima de\", uma superfície: il y a une lampe <strong>sur</strong> la table. <strong>Dans</strong> é \"dentro de\", um espaço fechado: il y a des vêtements <strong>dans</strong> l'armoire. Os dois costumam ser confundidos por quem fala português, já que às vezes usamos \"em\" pras duas situações." },
    vocab: [
      { f: "le lit", t: "a cama" },
      { f: "la table", t: "a mesa" },
      { f: "la chaise", t: "a cadeira" },
      { f: "le canapé", t: "o sofá" },
      { f: "la lampe", t: "a luminária" },
      { f: "sur", t: "em cima de" },
      { f: "sous", t: "embaixo de" },
      { f: "devant", t: "na frente de" },
      { f: "derrière", t: "atrás de" },
      { f: "à côté de", t: "ao lado de" }
    ],
    phrases: [
      { f: "Le lit est à côté de la fenêtre.", t: "A cama fica ao lado da janela.",
        blocks: [{f:"Le lit"},{f:"est à côté de"},{f:"la fenêtre."}],
        scenario: "Você está descrevendo seu quarto e onde fica a cama, ao lado da janela. O que você diz?", scenarioEmoji: "🛏️" },
      { f: "Il y a une lampe sur la table.", t: "Tem uma luminária em cima da mesa.",
        blocks: [{f:"Il y a"},{f:"une lampe"},{f:"sur la table."}],
        scenario: "Alguém pergunta o que tem em cima da mesa — uma luminária. O que você responde?", scenarioEmoji: "💡" },
      { f: "Le chat est sous le canapé.", t: "O gato está embaixo do sofá.",
        blocks: [{f:"Le chat"},{f:"est sous"},{f:"le canapé."}],
        scenario: "Você está procurando o gato e o encontra embaixo do sofá. O que você diz?", scenarioEmoji: "🐈" },
      { f: "La chaise bleue est devant la table.", t: "A cadeira azul fica na frente da mesa.",
        blocks: [{f:"La chaise bleue"},{f:"est devant"},{f:"la table."}],
        scenario: "Você está explicando onde fica a cadeira azul, na frente da mesa. O que você diz?", scenarioEmoji: "🪑" },
      { f: "Le chat est derrière la chaise.", t: "O gato está atrás da cadeira.",
        blocks: [{f:"Le chat"},{f:"est derrière"},{f:"la chaise."}] }
    ],
    dialogue: {
      title: "Arrumando o quarto",
      lines: [
        { spk: "A", f: "Où est mon sac ?", t: "Onde está minha mochila?" },
        { spk: "B", f: "Il est sous le lit.", t: "Está embaixo da cama." },
        { spk: "A", f: "Et mes clés ?", t: "E minhas chaves?" },
        { spk: "B", f: "Elles sont sur la table, à côté de la lampe.", t: "Estão em cima da mesa, do lado da luminária." }
      ]
    }
  },
  {
    id: "A1-19",
    level: "A1",
    title: "Lazer e atividades",
    goal: "Falar sobre hobbies e combinar programas de fim de semana.",
    usageNote: { title: "\"Jouer DE la guitare\" ou \"jouer AU foot\"?", body: "Pra instrumentos musicais, usa-se <strong>jouer de</strong>: jouer <strong>de la</strong> guitare, jouer <strong>du</strong> piano. Pra esportes e jogos, usa-se <strong>jouer à</strong>: jouer <strong>au</strong> foot, jouer <strong>aux</strong> cartes. É uma regrinha simples, mas sem ela dá pra trocar tudo — vale decorar esse par de preposições." },
    trueFalseExercises: [{ subject: "On va au cinéma ce soir ?", emoji: "🎬", claim: "Essa é uma forma de convidar alguém pra sair.", answer: true,
      whyNote: "Correto — <strong>on va...?</strong> é um jeito casual de propor um programa, tipo \"vamos ao cinema hoje à noite?\"." }],
    vocab: [
      { f: "le cinéma", t: "o cinema" },
      { f: "la musique", t: "a música" },
      { f: "le sport", t: "o esporte" },
      { f: "lire", t: "ler" },
      { f: "jouer", t: "jogar / tocar (instrumento)" },
      { f: "danser", t: "dançar" },
      { f: "chanter", t: "cantar" },
      { f: "le week-end", t: "o fim de semana" },
      { f: "sortir", t: "sair" },
      { f: "le film", t: "o filme" }
    ],
    phrases: [
      { f: "Qu'est-ce que tu fais le week-end ?", t: "O que você faz no fim de semana?",
        blocks: [{f:"Qu'est-ce que"},{f:"tu fais"},{f:"le week-end ?"}],
        scenario: "Você quer saber o que um amigo costuma fazer nos fins de semana. O que você pergunta?", scenarioEmoji: "🎨" },
      { f: "J'aime lire des livres.", t: "Eu gosto de ler livros.",
        blocks: [{f:"J'aime"},{f:"lire"},{f:"des livres."}],
        scenario: "Alguém pergunta seu hobby favorito, que é ler livros. O que você diz?", scenarioEmoji: "📚" },
      { f: "On va au cinéma ce soir ?", t: "A gente vai ao cinema hoje à noite?",
        blocks: [{f:"On va"},{f:"au cinéma"},{f:"ce soir ?"}],
        scenario: "Você quer convidar um amigo para ir ao cinema hoje à noite. O que você pergunta?", scenarioEmoji: "🎬" },
      { f: "Il joue de la guitare.", t: "Ele toca guitarra.",
        blocks: [{f:"Il joue"},{f:"de la guitare."}],
        scenario: "Alguém pergunta o que seu irmão sabe fazer — ele toca guitarra. O que você responde?", scenarioEmoji: "🎸" },
      { f: "Le cinéma est fermé ce soir.", t: "O cinema está fechado hoje à noite.",
        blocks: [{f:"Le cinéma"},{f:"est fermé"},{f:"ce soir."}] },
      { f: "J'adore écouter de la musique.", t: "Eu adoro ouvir música.",
        blocks: [{f:"J'adore"},{f:"écouter"},{f:"de la musique."}] },
      { f: "Le sport est bon pour la santé.", t: "O esporte é bom para a saúde.",
        blocks: [{f:"Le sport"},{f:"est bon"},{f:"pour la santé."}] },
      { f: "Les enfants aiment jouer dehors.", t: "As crianças gostam de brincar lá fora.",
        blocks: [{f:"Les enfants"},{f:"aiment jouer"},{f:"dehors."}] },
      { f: "Elle adore danser et chanter.", t: "Ela adora dançar e cantar.",
        blocks: [{f:"Elle adore"},{f:"danser"},{f:"et chanter."}] },
      { f: "On va sortir samedi soir.", t: "Vamos sair no sábado à noite.",
        blocks: [{f:"On va"},{f:"sortir"},{f:"samedi soir."}] },
      { f: "Le film commence à vingt heures.", t: "O filme começa às vinte horas.",
        blocks: [{f:"Le film"},{f:"commence"},{f:"à vingt heures."}] }
    ],
    dialogue: {
      title: "O fim de semana",
      lines: [
        { spk: "A", f: "Tu as des projets pour le week-end ?", t: "Você tem planos pro fim de semana?" },
        { spk: "B", f: "Oui, je vais au cinéma avec des amis.", t: "Sim, eu vou ao cinema com amigos." },
        { spk: "A", f: "Quel film vous allez voir ?", t: "Qual filme vocês vão ver?" },
        { spk: "B", f: "On ne sait pas encore !", t: "A gente ainda não sabe!" }
      ]
    }
  },
  {
    id: "A1-g8",
    level: "A1",
    type: "grammar",
    title: "Advérbios de frequência",
    goal: "Usar toujours, souvent, parfois, rarement e jamais pra dizer com que frequência você faz algo.",
    grammar: {
      blocks: [
        {
          title: "Advérbios de frequência",
          body: "Do mais frequente ao menos frequente: toujours (sempre), souvent (frequentemente), parfois (às vezes), rarement (raramente) e jamais (nunca). No francês, o advérbio geralmente vem logo depois do verbo conjugado — não antes, como em inglês.",
          examples: [
            { f: "Je lis toujours le soir.", t: "Eu sempre leio à noite." },
            { f: "Elle joue parfois de la guitare.", t: "Ela às vezes toca guitarra." }
          ]
        },
        {
          title: "Onde colocar o advérbio",
          body: "A posição logo após o verbo vale pra qualquer verbo do dia a dia — inclusive os de lazer que você acabou de aprender.",
          examples: [
            { f: "Nous sortons souvent le week-end.", t: "Nós saímos frequentemente no fim de semana." },
            { f: "Il chante rarement.", t: "Ele canta raramente." }
          ]
        },
        {
          title: "Jamais precisa de ne",
          body: "Jamais (nunca) funciona como uma negação — por isso precisa do ne antes do verbo, igual em ne...pas. A estrutura completa é ne...jamais.",
          examples: [
            { f: "Je ne danse jamais.", t: "Eu nunca danço." },
            { f: "Il ne sort jamais le lundi.", t: "Ele nunca sai na segunda-feira." }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Aqui está a escala completa, do mais ao menos frequente — vale revisitar sempre que precisar descrever um hábito:",
          examples: [],
          table: {
            "Advérbios (do mais ao menos frequente)": [
              { pronoun: "sempre", form: "toujours" },
              { pronoun: "frequentemente", form: "souvent" },
              { pronoun: "às vezes", form: "parfois" },
              { pronoun: "raramente", form: "rarement" },
              { pronoun: "nunca (+ ne)", form: "ne ... jamais" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "Je vais ___ au cinéma le week-end.", hint: "sempre", answer: "toujours" },
        { prompt: "Il joue ___ de la guitare.", hint: "às vezes", answer: "parfois" },
        { prompt: "Nous sortons ___ le dimanche.", hint: "frequentemente", answer: "souvent" },
        { prompt: "Elle ne chante ___.", hint: "nunca", answer: "jamais" },
        { prompt: "Tu lis ___ des livres ?", hint: "raramente", answer: "rarement" },
        { prompt: "Vous dansez ___ !", hint: "sempre", answer: "toujours" }
      ]
    }
  },
  {
    id: "A1-20",
    level: "A1",
    title: "Expressões de tempo passado",
    goal: "Aprender marcadores de tempo pra falar sobre o passado, como preparação pro passé composé.",
    usageNote: { title: "\"Hier\" ou \"la semaine dernière\"?", body: "<strong>Hier</strong> aponta um dia específico (ontem). <strong>La semaine/le week-end dernier(-ère)</strong> aponta um período mais largo (semana ou fim de semana passados). Todos combinam bem com o passé composé que você já viu: <strong>hier, j'ai visité</strong> un musée / <strong>la semaine dernière, j'ai mangé</strong> au restaurant." },
    vocab: [
      { f: "hier", t: "ontem" },
      { f: "avant-hier", t: "anteontem" },
      { f: "la semaine dernière", t: "a semana passada" },
      { f: "le week-end dernier", t: "o fim de semana passado" },
      { f: "le mois dernier", t: "o mês passado" },
      { f: "l'année dernière", t: "o ano passado" },
      { f: "il y a deux jours", t: "há dois dias / dois dias atrás" },
      { f: "ce matin", t: "esta manhã" },
      { f: "déjà", t: "já" },
      { f: "récemment", t: "recentemente" }
    ],
    phrases: [
      { f: "Hier, j'ai visité un musée.", t: "Ontem eu visitei um museu.",
        blocks: [{f:"Hier,"},{f:"j'ai visité"},{f:"un musée."}],
        scenario: "Alguém pergunta o que você fez ontem, e você visitou um museu. O que você responde?", scenarioEmoji: "🖼️" },
      { f: "La semaine dernière, j'ai mangé au restaurant.", t: "Semana passada eu comi num restaurante.",
        blocks: [{f:"La semaine dernière,"},{f:"j'ai mangé"},{f:"au restaurant."}],
        scenario: "Alguém pergunta o que você fez de especial semana passada — comeu num restaurante. O que você diz?", scenarioEmoji: "🍽️" },
      { f: "Le week-end dernier, il a plu.", t: "No fim de semana passado, choveu.",
        blocks: [{f:"Le week-end dernier,"},{f:"il a plu."}],
        scenario: "Alguém pergunta como foi o tempo no fim de semana passado — choveu bastante. O que você responde?", scenarioEmoji: "🌧️" },
      { f: "Tu as déjà visité Paris ?", t: "Você já visitou Paris?",
        blocks: [{f:"Tu as déjà"},{f:"visité Paris ?"}],
        scenario: "Você quer saber se um amigo já foi a Paris alguma vez. O que você pergunta?", scenarioEmoji: "🗼" },
      { f: "Avant-hier, j'ai visité Paris.", t: "Anteontem, eu visitei Paris.",
        blocks: [{f:"Avant-hier,"},{f:"j'ai visité"},{f:"Paris."}] },
      { f: "Le mois dernier, j'ai voyagé en France.", t: "No mês passado, eu viajei para a França.",
        blocks: [{f:"Le mois dernier,"},{f:"j'ai voyagé"},{f:"en France."}] },
      { f: "L'année dernière, j'ai appris le français.", t: "No ano passado, eu aprendi francês.",
        blocks: [{f:"L'année dernière,"},{f:"j'ai appris"},{f:"le français."}] },
      { f: "Il y a deux jours, il a plu.", t: "Há dois dias, choveu.",
        blocks: [{f:"Il y a deux jours,"},{f:"il a plu."}] },
      { f: "Ce matin, j'ai bu un café.", t: "Hoje de manhã, eu tomei um café.",
        blocks: [{f:"Ce matin,"},{f:"j'ai bu"},{f:"un café."}] },
      { f: "Récemment, j'ai changé de travail.", t: "Recentemente, eu mudei de emprego.",
        blocks: [{f:"Récemment,"},{f:"j'ai changé"},{f:"de travail."}] }
    ],
    dialogue: {
      title: "O que você fez ontem?",
      lines: [
        { spk: "A", f: "Qu'est-ce que tu as fait hier ?", t: "O que você fez ontem?" },
        { spk: "B", f: "J'ai travaillé le matin, et l'après-midi j'ai fait du sport.", t: "Eu trabalhei de manhã, e à tarde eu fiz esporte." },
        { spk: "A", f: "Et le week-end dernier ?", t: "E no fim de semana passado?" },
        { spk: "B", f: "On est allés au cinéma avec des amis.", t: "A gente foi ao cinema com amigos." }
      ]
    }
  },
  {
    id: "A1-g9",
    level: "A1",
    type: "grammar",
    title: "O passé composé",
    goal: "Conjugar o passé composé com avoir e com être pra falar sobre ações do passado.",
    grammar: {
      blocks: [
        {
          title: "Passé composé com avoir",
          body: "O passé composé é o tempo mais comum pra falar do passado em francês. A maioria dos verbos o forma com o presente de avoir + o particípio passado. Verbos regulares em -er formam o particípio trocando o -er por -é.",
          examples: [
            { f: "J'ai mangé au restaurant.", t: "Eu comi no restaurante." },
            { f: "Elle a travaillé toute la journée.", t: "Ela trabalhou o dia todo." }
          ]
        },
        {
          title: "Alguns particípios irregulares",
          body: "Alguns verbos muito comuns têm particípio irregular, que precisa ser memorizado — como faire → fait e prendre → pris, dois verbos que você já conhece.",
          examples: [
            { f: "J'ai fait du sport hier.", t: "Eu fiz esporte ontem." },
            { f: "Il a pris le train.", t: "Ele pegou o trem." }
          ]
        },
        {
          title: "Passé composé com être",
          body: "Um grupo pequeno de verbos (principalmente de movimento, como aller) e TODOS os verbos pronominais usam être como auxiliar, não avoir. Quando o auxiliar é être, o particípio concorda em gênero e número com o sujeito — ganha um -e pro feminino e um -s pro plural.",
          examples: [
            { f: "Elle est allée au marché.", t: "Ela foi ao mercado. (être + concordância feminina)" },
            { f: "Je me suis levé tôt.", t: "Eu levantei cedo. (verbo pronominal, sempre com être)" }
          ]
        },
        {
          title: "Très bien! 🎉",
          body: "Você concluiu o nível A1! Aqui está um resumo dos dois auxiliares — repare que a maioria dos verbos usa avoir, e être fica reservado pra movimento e verbos pronominais:",
          examples: [],
          table: {
            "Com avoir (maioria dos verbos)": [
              { pronoun: "manger →", form: "j'ai mangé" },
              { pronoun: "faire →", form: "j'ai fait" },
              { pronoun: "prendre →", form: "j'ai pris" }
            ],
            "Com être (movimento + pronominais)": [
              { pronoun: "aller →", form: "je suis allé(e)" },
              { pronoun: "arriver →", form: "je suis arrivé(e)" },
              { pronoun: "se lever →", form: "je me suis levé(e)" }
            ]
          },
          wrapup: true
        }
      ],
      exercises: [
        { prompt: "J'___ mangé une pomme.", hint: "avoir (manger)", answer: "ai" },
        { prompt: "Tu ___ fait du sport ?", hint: "avoir (faire)", answer: "as" },
        { prompt: "Il ___ pris le bus.", hint: "avoir (prendre)", answer: "a" },
        { prompt: "Nous ___ travaillé ensemble.", hint: "avoir (travailler)", answer: "avons" },
        { prompt: "Elle ___ allée au marché.", hint: "être (aller)", answer: "est" },
        { prompt: "Je me ___ levé tôt.", hint: "être (se lever)", answer: "suis" },
        { prompt: "Ils ___ visité Paris.", hint: "avoir (visiter)", answer: "ont" },
        { prompt: "Vous ___ arrivés à quelle heure ?", hint: "être (arriver)", answer: "êtes" }
      ]
    }
  }
];

// ============================================================
// MÓDULOS (estilo Busuu): agrupam as unidades em blocos temáticos menores,
// pra não apresentar as 29 unidades do A1 de uma vez só. Cada módulo termina
// com um "Ponto de verificação" — um teste rápido que pode ser feito a
// qualquer momento (não precisa ter completado as unidades antes) e que, se
// aprovado, marca todas as unidades do módulo como concluídas de uma vez.
const MODULES = [
  { id: "A1-m1", level: "A1", title: "Primeiros contatos",
    unitIds: ["A1-1", "A1-2", "A1-3", "A1-g1", "A1-4", "A1-g2"] },
  { id: "A1-m2", level: "A1", title: "Rotina do dia a dia",
    unitIds: ["A1-5", "A1-6", "A1-g3", "A1-7"] },
  { id: "A1-m3", level: "A1", title: "Cidade e identidade",
    unitIds: ["A1-8", "A1-g4", "A1-9", "A1-10", "A1-g10", "A1-11", "A1-12"] },
  { id: "A1-m4", level: "A1", title: "Deslocando-se e cuidando de si",
    unitIds: ["A1-13", "A1-14", "A1-g5", "A1-15", "A1-g6"] },
  { id: "A1-m5", level: "A1", title: "Descrevendo o mundo ao redor",
    unitIds: ["A1-16", "A1-g7", "A1-17", "A1-18"] },
  { id: "A1-m6", level: "A1", title: "Lazer e o passado",
    unitIds: ["A1-19", "A1-g8", "A1-20", "A1-g9"] }
];

// ============================================================
// TESTE DE NÍVEL: uma prova mais ampla que os pontos de verificação de
// módulo — cobre o nível inteiro (amostra de todos os módulos) em vez de só
// um bloco temático. Sempre desbloqueado, desde o primeiro acesso: um aluno
// que já sabe o nível pode fazer a prova e pular direto pro próximo nível,
// sem precisar abrir nenhuma unidade antes. Se aprovado, credita o nível
// inteiro (todas as unidades + todos os pontos de verificação de módulo).
const LEVEL_TESTS = [
  { id: "A1-final", level: "A1", title: "Teste de Nível A1", nextLevel: "A2" }
];
