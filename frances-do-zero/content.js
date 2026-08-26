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
// Progressão completa do nível A1 (20 unidades: 16 comunicativas + 4 de
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
        blocks: [{f:"Bonjour !"},{f:"Je m'appelle"},{f:"Brune."}] },
      { f: "Merci beaucoup !", t: "Muito obrigada!",
        blocks: [{f:"Merci"},{f:"beaucoup !"}] },
      { f: "Pardon, je ne comprends pas.", t: "Desculpe, eu não entendo.",
        blocks: [{f:"Pardon,"},{f:"je ne"},{f:"comprends pas."}] },
      { f: "Ça va bien, et toi ?", t: "Vou bem, e você?",
        blocks: [{f:"Ça va"},{f:"bien,"},{f:"et toi ?"}] }
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
    vocab: [
      { f: "je", t: "eu" },
      { f: "tu", t: "você (informal)" },
      { f: "m'appeler", t: "chamar-se" },
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
        blocks: [{f:"Comment"},{f:"tu"},{f:"t'appelles ?"}] },
      { f: "Je suis brésilienne.", t: "Eu sou brasileira.",
        blocks: [{f:"Je"},{f:"suis"},{f:"brésilienne."}] },
      { f: "Tu es de quel pays ?", t: "De que país você é?",
        blocks: [{f:"Tu"},{f:"es de"},{f:"quel pays ?"}] },
      { f: "Moi aussi, je suis française !", t: "Eu também, eu sou francesa!",
        blocks: [{f:"Moi aussi,"},{f:"je suis"},{f:"française !"}] }
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
        blocks: [{f:"Quel âge"},{f:"as-tu ?"}] },
      { f: "J'ai vingt ans.", t: "Eu tenho vinte anos.",
        blocks: [{f:"J'ai"},{f:"vingt"},{f:"ans."}] },
      { f: "Il a dix ans.", t: "Ele tem dez anos.",
        blocks: [{f:"Il a"},{f:"dix"},{f:"ans."}] },
      { f: "Nous sommes dix.", t: "Somos dez (pessoas).",
        blocks: [{f:"Nous sommes"},{f:"dix."}] }
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
    id: "A1-4",
    level: "A1",
    title: "Família",
    goal: "Apresentar os membros da família e dizer quantos irmãos você tem.",
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
        blocks: [{f:"Voici"},{f:"ma famille."}] },
      { f: "J'ai deux frères.", t: "Eu tenho dois irmãos.",
        blocks: [{f:"J'ai"},{f:"deux"},{f:"frères."}] },
      { f: "Mon père s'appelle Marc.", t: "Meu pai se chama Marc.",
        blocks: [{f:"Mon père"},{f:"s'appelle"},{f:"Marc."}] },
      { f: "Elle est ma sœur.", t: "Ela é minha irmã.",
        blocks: [{f:"Elle est"},{f:"ma sœur."}] }
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
    id: "A1-5",
    level: "A1",
    title: "Comida e bebida",
    goal: "Falar sobre alimentos, bebidas e gostos alimentares (o que você gosta e não gosta de comer).",
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
        blocks: [{f:"Je mange"},{f:"du pain"},{f:"le matin."}] },
      { f: "J'aime le fromage, mais je déteste le poisson.", t: "Eu gosto de queijo, mas odeio peixe.",
        blocks: [{f:"J'aime"},{f:"le fromage,"},{f:"mais je déteste"},{f:"le poisson."}] },
      { f: "Tu bois du café ou du lait ?", t: "Você bebe café ou leite?",
        blocks: [{f:"Tu bois"},{f:"du café"},{f:"ou du lait ?"}] },
      { f: "L'addition, s'il vous plaît.", t: "A conta, por favor.",
        blocks: [{f:"L'addition,"},{f:"s'il vous plaît."}] }
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
        blocks: [{f:"Quelle heure"},{f:"est-il ?"}] },
      { f: "Il est huit heures.", t: "São oito horas.",
        blocks: [{f:"Il est"},{f:"huit heures."}] },
      { f: "Je me réveille à sept heures.", t: "Eu acordo às sete horas.",
        blocks: [{f:"Je me réveille"},{f:"à"},{f:"sept heures."}] },
      { f: "Le soir, je regarde la télé.", t: "À noite, eu assisto TV.",
        blocks: [{f:"Le soir,"},{f:"je regarde"},{f:"la télé."}] }
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
    id: "A1-g2",
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
    title: "Lugares e orientação",
    goal: "Perguntar e indicar como chegar a um lugar na cidade.",
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
        blocks: [{f:"Où est"},{f:"la gare ?"}] },
      { f: "Tournez à gauche.", t: "Vire à esquerda.",
        blocks: [{f:"Tournez"},{f:"à gauche."}] },
      { f: "C'est tout droit.", t: "É sempre em frente.",
        blocks: [{f:"C'est"},{f:"tout droit."}] },
      { f: "C'est loin d'ici ?", t: "É longe daqui?",
        blocks: [{f:"C'est loin"},{f:"d'ici ?"}] }
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
    id: "A1-8",
    level: "A1",
    title: "Compras",
    goal: "Perguntar preços (com números até cem), experimentar roupas e comprar numa loja.",
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
        blocks: [{f:"Combien"},{f:"ça coûte ?"}] },
      { f: "Ça coûte quarante euros.", t: "Custa quarenta euros.",
        blocks: [{f:"Ça coûte"},{f:"quarante"},{f:"euros."}] },
      { f: "Je peux essayer ce pantalon ?", t: "Posso experimentar essa calça?",
        blocks: [{f:"Je peux essayer"},{f:"ce pantalon ?"}] },
      { f: "Ça fait cent euros, s'il vous plaît.", t: "São cem euros, por favor.",
        blocks: [{f:"Ça fait"},{f:"cent euros,"},{f:"s'il vous plaît."}] }
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
    id: "A1-9",
    level: "A1",
    title: "Clima e estações",
    goal: "Falar sobre o tempo e as estações do ano.",
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
        blocks: [{f:"Quel temps"},{f:"fait-il ?"}] },
      { f: "Il fait très chaud aujourd'hui.", t: "Está muito quente hoje.",
        blocks: [{f:"Il fait"},{f:"très chaud"},{f:"aujourd'hui."}] },
      { f: "J'aime l'hiver.", t: "Eu gosto do inverno.",
        blocks: [{f:"J'aime"},{f:"l'hiver."}] },
      { f: "Il pleut souvent en automne.", t: "Chove frequentemente no outono.",
        blocks: [{f:"Il pleut"},{f:"souvent"},{f:"en automne."}] }
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
    id: "A1-10",
    level: "A1",
    title: "Transporte",
    goal: "Pegar um transporte público e comprar uma passagem.",
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
        blocks: [{f:"Je prends"},{f:"le métro"},{f:"tous les jours."}] },
      { f: "Où est l'arrêt de bus ?", t: "Onde fica o ponto de ônibus?",
        blocks: [{f:"Où est"},{f:"l'arrêt"},{f:"de bus ?"}] },
      { f: "Un billet, s'il vous plaît.", t: "Uma passagem, por favor.",
        blocks: [{f:"Un billet,"},{f:"s'il vous plaît."}] },
      { f: "Je vais au travail à pied.", t: "Eu vou ao trabalho a pé.",
        blocks: [{f:"Je vais"},{f:"au travail"},{f:"à pied."}] }
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
    id: "A1-g3",
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
            { f: "Notre maison est grande.", t: "Nossa casa é grande." },
            { f: "Leurs enfants sont gentils.", t: "Os filhos deles são gentis." }
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
        { prompt: "___ maison est grande.", hint: "nossa", answer: "notre" },
        { prompt: "Ce sont ___ enfants.", hint: "deles / delas (plural)", answer: "leurs" },
        { prompt: "C'est ___ amie.", hint: "minha — mas amie começa com vogal", answer: "mon" }
      ]
    }
  },
  {
    id: "A1-11",
    level: "A1",
    title: "Corpo e saúde",
    goal: "Descrever sintomas simples e ir ao médico.",
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
        blocks: [{f:"J'ai mal"},{f:"à la tête."}] },
      { f: "Je me sens malade.", t: "Eu me sinto doente.",
        blocks: [{f:"Je me sens"},{f:"malade."}] },
      { f: "Où est la pharmacie ?", t: "Onde fica a farmácia?",
        blocks: [{f:"Où est"},{f:"la pharmacie ?"}] },
      { f: "Il a de la fièvre.", t: "Ele está com febre.",
        blocks: [{f:"Il a"},{f:"de la fièvre."}] }
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
    id: "A1-12",
    level: "A1",
    title: "Cores e descrições",
    goal: "Descrever cores, objetos e características de pessoas.",
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
        blocks: [{f:"J'aime"},{f:"la couleur"},{f:"bleue."}] },
      { f: "Elle est très gentille.", t: "Ela é muito gentil.",
        blocks: [{f:"Elle est"},{f:"très"},{f:"gentille."}] },
      { f: "Mon chat est noir et blanc.", t: "Meu gato é preto e branco.",
        blocks: [{f:"Mon chat"},{f:"est noir"},{f:"et blanc."}] },
      { f: "C'est une jolie robe rouge.", t: "É um vestido vermelho bonito.",
        blocks: [{f:"C'est"},{f:"une jolie robe"},{f:"rouge."}] }
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
    id: "A1-g4",
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
    id: "A1-13",
    level: "A1",
    title: "A casa e os cômodos",
    goal: "Descrever uma casa, dizer o que tem (e o que não tem) nela.",
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
        blocks: [{f:"Il y a"},{f:"une chambre."}] },
      { f: "Il y a deux salles de bain.", t: "Tem dois banheiros.",
        blocks: [{f:"Il y a"},{f:"deux"},{f:"salles de bain."}] },
      { f: "Il n'y a pas de jardin.", t: "Não tem jardim.",
        blocks: [{f:"Il n'y a pas"},{f:"de jardin."}] },
      { f: "C'est une grande maison.", t: "É uma casa grande.",
        blocks: [{f:"C'est"},{f:"une grande"},{f:"maison."}] }
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
    id: "A1-14",
    level: "A1",
    title: "Onde as coisas estão",
    goal: "Descrever a posição de móveis e objetos usando preposições de lugar.",
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
        blocks: [{f:"Le lit"},{f:"est à côté de"},{f:"la fenêtre."}] },
      { f: "Il y a une lampe sur la table.", t: "Tem uma luminária em cima da mesa.",
        blocks: [{f:"Il y a"},{f:"une lampe"},{f:"sur la table."}] },
      { f: "Le chat est sous le canapé.", t: "O gato está embaixo do sofá.",
        blocks: [{f:"Le chat"},{f:"est sous"},{f:"le canapé."}] },
      { f: "La chaise bleue est devant la table.", t: "A cadeira azul fica na frente da mesa.",
        blocks: [{f:"La chaise bleue"},{f:"est devant"},{f:"la table."}] }
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
    id: "A1-15",
    level: "A1",
    title: "Dias e datas",
    goal: "Dizer os dias da semana, meses e marcar um encontro.",
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
        blocks: [{f:"Quel jour"},{f:"sommes-nous ?"}] },
      { f: "Nous sommes lundi.", t: "Hoje é segunda-feira.",
        blocks: [{f:"Nous sommes"},{f:"lundi."}] },
      { f: "Mon anniversaire est en mars.", t: "Meu aniversário é em março.",
        blocks: [{f:"Mon anniversaire"},{f:"est"},{f:"en mars."}] },
      { f: "À demain !", t: "Até amanhã!",
        blocks: [{f:"À"},{f:"demain !"}] }
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
    id: "A1-16",
    level: "A1",
    title: "Lazer e atividades",
    goal: "Falar sobre hobbies e combinar programas de fim de semana.",
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
        blocks: [{f:"Qu'est-ce que"},{f:"tu fais"},{f:"le week-end ?"}] },
      { f: "J'aime lire des livres.", t: "Eu gosto de ler livros.",
        blocks: [{f:"J'aime"},{f:"lire"},{f:"des livres."}] },
      { f: "On va au cinéma ce soir ?", t: "A gente vai ao cinema hoje à noite?",
        blocks: [{f:"On va"},{f:"au cinéma"},{f:"ce soir ?"}] },
      { f: "Il joue de la guitare.", t: "Ele toca guitarra.",
        blocks: [{f:"Il joue"},{f:"de la guitare."}] }
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
  }
];
