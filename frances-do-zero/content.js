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
// Progressão completa do nível A1 (14 unidades). Próximos níveis (A2, B1...)
// entram depois como novas faixas de id, seguindo este mesmo schema.

const UNITS = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
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
    id: 6,
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
    id: 7,
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
    id: 8,
    title: "Compras",
    goal: "Perguntar preços e experimentar roupas numa loja.",
    vocab: [
      { f: "le pantalon", t: "a calça" },
      { f: "la robe", t: "o vestido" },
      { f: "les chaussures", t: "os sapatos" },
      { f: "le manteau", t: "o casaco" },
      { f: "cher", t: "caro" },
      { f: "pas cher", t: "barato" },
      { f: "la taille", t: "o tamanho" },
      { f: "essayer", t: "experimentar" },
      { f: "le magasin", t: "a loja" },
      { f: "payer", t: "pagar" }
    ],
    phrases: [
      { f: "Combien ça coûte ?", t: "Quanto custa isso?",
        blocks: [{f:"Combien"},{f:"ça coûte ?"}] },
      { f: "C'est trop cher.", t: "É caro demais.",
        blocks: [{f:"C'est"},{f:"trop cher."}] },
      { f: "Je peux essayer ce pantalon ?", t: "Posso experimentar essa calça?",
        blocks: [{f:"Je peux essayer"},{f:"ce pantalon ?"}] },
      { f: "Je vais payer par carte.", t: "Vou pagar com cartão.",
        blocks: [{f:"Je vais payer"},{f:"par carte."}] }
    ],
    dialogue: {
      title: "Numa loja",
      lines: [
        { spk: "A", f: "Bonjour, je cherche une robe.", t: "Olá, estou procurando um vestido." },
        { spk: "B", f: "Quelle taille faites-vous ?", t: "Qual é o seu tamanho?" },
        { spk: "A", f: "Je fais du 38.", t: "Eu uso 38." },
        { spk: "B", f: "Voici, vous pouvez l'essayer.", t: "Aqui está, você pode experimentar." },
        { spk: "A", f: "Merci, elle est parfaite !", t: "Obrigada, ele é perfeito!" }
      ]
    }
  },
  {
    id: 9,
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
    id: 10,
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
    id: 11,
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
    id: 12,
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
    id: 13,
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
    id: 14,
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
    id: 15,
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
    id: 16,
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
