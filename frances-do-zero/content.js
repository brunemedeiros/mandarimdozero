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
// Estas são 2 unidades de exemplo para validar o formato e a estrutura do app.
// O restante do curso (progressão A1 completa) é conteúdo a ser adicionado
// depois, seguindo este mesmo schema.

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
  }
];
