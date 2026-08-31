// ---------- Desafios: Expressões francesas com contexto e áudio ----------
// Cada desafio segue: expressão -> exemplo em contexto (TTS) -> hipótese ->
// alternativas (reveladas só depois de um clique) -> feedback -> segundo
// exemplo (flexionado, com TTS) -> microatividade -> "pour aller plus loin"
// (recursos externos opcionais, nunca necessários pra completar o desafio).
// Ver a especificação completa da funcionalidade.
//
// O desafio nunca depende de vídeo pra funcionar -- o conteúdo pedagógico é
// gerado e controlado pelo próprio site (scripts/challenges_pipeline/).
// externalResources é só um link opcional de aprofundamento, mostrado
// depois do feedback.
//
// `status`:
//   needs_review — gerado automaticamente, ainda não confirmado por um humano
//   approved     — confirmado, mas ainda não visível pro aluno
//   published    — visível pro aluno
//   rejected     — descartado
//
// Só desafios com status "published" aparecem pro aluno.
const CHALLENGES = [
  {
    id: "expr-001",
    type: "expression",
    canonicalExpression: "avoir la gueule de bois",
    level: "B1",
    meaning: {
      fr: "Avoir mal à la tête et se sentir mal après avoir trop bu d'alcool.",
      pt: "Sentir-se mal (dor de cabeça, indisposição) após ter bebido álcool em excesso."
    },
    example: {
      text: "Hier soir, j'ai trop bu et ce matin, j'ai vraiment la gueule de bois.",
      audioFile: "762913bfed75.mp3"
    },
    question: "Que signifie cette expression ?",
    options: [
      "Être très fatigué après une longue journée.",
      "Avoir mal à la tête et se sentir mal après avoir trop bu.",
      "Être très heureux d'avoir passé une bonne soirée.",
      "Avoir des problèmes pour dormir la nuit."
    ],
    correctAnswer: "Avoir mal à la tête et se sentir mal après avoir trop bu.",
    explanation: "Cette expression décrit les symptômes physiques désagréables qui suivent une consommation excessive d'alcool.",
    secondExample: {
      text: "Après la fête, il s'est réveillé avec une terrible gueule de bois et n'a pas pu aller travailler.",
      audioFile: "4aea24a19409.mp3"
    },
    microActivity: {
      prompt: "Après avoir célébré son anniversaire toute la nuit, Paul avait une grosse __________.",
      answer: "gueule de bois"
    },
    externalResources: [
      { type: "youtube", url: "https://www.youtube.com/watch?v=BRTX_84pE0E", title: "Avoir la gueule de bois : signification et exemples 🍷🤕 | Expression française courante" }
    ],
    status: "needs_review"
  },
  {
    id: "expr-002",
    type: "expression",
    canonicalExpression: "casser les pieds",
    level: "B1",
    meaning: {
      fr: "Embêter quelqu'un, l'ennuyer beaucoup.",
      pt: "Incomodar alguém, chatear muito."
    },
    example: {
      text: "Mon petit frère me casse les pieds avec ses questions incessantes quand j'essaie de faire mes devoirs.",
      audioFile: "bd97beb13e21.mp3"
    },
    question: "Que signifie l'expression 'casser les pieds' ?",
    options: [
      "Faire du mal physiquement.",
      "Causer beaucoup de problèmes.",
      "Embêter ou ennuyer quelqu'un.",
      "Rendre quelqu'un très heureux."
    ],
    correctAnswer: "Embêter ou ennuyer quelqu'un.",
    explanation: "Cette expression signifie importuner ou agacer une personne de manière répétée. On l'utilise souvent pour décrire une situation ou une personne qui devient très ennuyeuse.",
    secondExample: {
      text: "Arrête de faire ce bruit, tu me casses les pieds ! Je n'arrive pas à me concentrer.",
      audioFile: "5522208d08fa.mp3"
    },
    microActivity: {
      prompt: "Quand mon voisin met sa musique à fond tous les soirs, il __________.",
      answer: "me casse les pieds"
    },
    externalResources: [
      { type: "youtube", url: "https://www.youtube.com/watch?v=13vxJNJVbv4", title: "Expression française : casser les pieds" }
    ],
    status: "needs_review"
  },
  {
    id: "expr-003",
    type: "expression",
    canonicalExpression: "poser un lapin",
    level: "B1",
    meaning: {
      fr: "Ne pas venir à un rendez-vous sans prévenir.",
      pt: "Dar um bolo, não comparecer a um compromisso."
    },
    example: {
      text: "J'étais furieux parce que mon ami m'avait posé un lapin pour notre rendez-vous au cinéma.",
      audioFile: "969a19decd33.mp3"
    },
    question: "Que signifie l'expression 'poser un lapin' ?",
    options: [
      "Inviter quelqu'un à manger.",
      "Ne pas venir à un rendez-vous.",
      "Offrir un cadeau.",
      "Raconter une blague."
    ],
    correctAnswer: "Ne pas venir à un rendez-vous.",
    explanation: "C'est quand on ne se présente pas à un rendez-vous convenu avec quelqu'un. La personne attendue n'arrive pas.",
    secondExample: {
      text: "Elle a décidé de lui poser un lapin pour lui montrer qu'elle était fâchée.",
      audioFile: "9657cd22a3e9.mp3"
    },
    microActivity: {
      prompt: "Il ne faut pas __________ à un ami, c'est impoli.",
      answer: "poser de lapin"
    },
    externalResources: [
      { type: "youtube", url: "https://www.youtube.com/watch?v=gSYuJr-NyRs", title: "🇫🇷 French Expression in 3 minutes: \"POSER UN LAPIN\" 🐰" }
    ],
    status: "needs_review"
  }
];
