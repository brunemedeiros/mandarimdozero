// ---------- Desafios: Expressões francesas com contexto e áudio ----------
// Cada desafio segue: expressão-alvo -> TTS só da expressão -> exemplo em
// contexto (texto) -> hipótese -> alternativas (reveladas só depois de um
// clique) -> feedback -> segundo exemplo (flexionado, com TTS) ->
// microatividade -> "pour aller plus loin" (recursos externos opcionais).
// Ver a especificação completa da funcionalidade.
//
// O desafio nunca depende de vídeo pra funcionar -- o conteúdo pedagógico é
// gerado e controlado pelo próprio site (scripts/challenges_pipeline/).
// expressionAudioFile é o áudio da expressão-alvo isolada (não da frase de
// exemplo) -- essa é a etapa de TTS inicial do desafio.
//
// externalResources segue uma hierarquia de fontes (dicionário/artigo >
// vídeo de qualidade > YouGlish) -- cada item tem `type`
// ("dictionary"|"article"|"youtube"|"youglish"), `approved` (o admin pode
// desmarcar antes de publicar) e `lastChecked` (null quando o link não pôde
// ser verificado automaticamente, não quando está quebrado).
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
    expressionAudioFile: "d87557d62cf5.mp3",
    meaning: {
      fr: "Avoir mal à la tête et se sentir mal après avoir trop bu d'alcool.",
      pt: "Sentir-se mal, ter dor de cabeça após ter bebido muito álcool."
    },
    example: {
      text: "Hier soir, j'ai trop bu et ce matin, j'ai vraiment la gueule de bois."
    },
    question: "Que signifie cette expression ?",
    options: [
      "Être très fatigué après une longue journée.",
      "Se sentir mal et avoir mal à la tête après avoir trop bu d'alcool.",
      "Avoir une mauvaise humeur passagère.",
      "Être surpris par une nouvelle."
    ],
    correctAnswer: "Se sentir mal et avoir mal à la tête après avoir trop bu d'alcool.",
    explanation: "Cette expression décrit les symptômes physiques désagréables qui suivent une consommation excessive d'alcool.",
    secondExample: {
      text: "Après la fête, les étudiants avaient la gueule de bois et regrettaient leurs excès.",
      audioFile: "3b1c6dda1481.mp3"
    },
    microActivity: {
      prompt: "Il a beaucoup plu hier, alors aujourd'hui, je __________ et je ne veux pas sortir.",
      answer: "ai la gueule de bois"
    },
    externalResources: [
      {
        type: "article",
        url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGz6mD55hRpawEhicDepI6tOMbyso4X2LvOZVBabU3fk8gN02G6-7RvRdlOci0hH9w5Ytk2z_UtldRPXx2pbOy9RyLWdM1swBNq_qcZfXU4-_KLtt4TIy9YWfj46u96-izIvTcZd8PFgF6aIbOLpJhKPdfcyG-X",
        title: "lalanguefrancaise.com",
        sourceName: "lalanguefrancaise.com",
        description: "Fornece uma explicação detalhada do significado, origem, sinônimos e exemplos de uso.",
        quality: "high",
        buttonLabel: "En savoir plus",
        approved: true,
        lastChecked: null
      },
      {
        type: "youglish",
        url: "https://youglish.com/pronounce/avoir%20la%20gueule%20de%20bois/french",
        title: "YouGlish",
        sourceName: "YouGlish",
        description: "Ouça a expressão sendo usada por falantes reais em vários vídeos.",
        quality: "high",
        buttonLabel: "Voir en contexte",
        approved: true,
        lastChecked: null
      }
    ],
    status: "needs_review"
  },
  {
    id: "expr-002",
    type: "expression",
    canonicalExpression: "casser les pieds",
    level: "B1",
    expressionAudioFile: "be1073fb6337.mp3",
    meaning: {
      fr: "C'est quand quelqu'un t'énerve ou t'ennuie beaucoup.",
      pt: "Significa incomodar ou irritar muito alguém."
    },
    example: {
      text: "Arrête de faire ce bruit, tu me casses les pieds depuis ce matin !"
    },
    question: "Que signifie l'expression \"casser les pieds\" ?",
    options: [
      "Faire du bruit fort",
      "Être très fatigué",
      "Incommoder ou énerver quelqu'un",
      "Casser un objet"
    ],
    correctAnswer: "Incommoder ou énerver quelqu'un",
    explanation: "Cette expression idiomatique signifie ennuyer ou agacer profondément quelqu'un. On l'utilise quand une personne ou une situation devient très irritante.",
    secondExample: {
      text: "J'ai essayé de lui expliquer, mais il n'écoute jamais, il me casse vraiment les pieds avec ses idées fixes.",
      audioFile: "c8afb5a2ce73.mp3"
    },
    microActivity: {
      prompt: "Mon frère a encore oublié de faire la vaisselle, il __________ !",
      answer: "me casse les pieds"
    },
    externalResources: [
      {
        type: "dictionary",
        url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFnabHsvcKme3zTwSpAflxhdx_CtdB3wElTHGpKaqzHPVppyxjpdtj8dYuqCbrHxgS4TjyVKAG5r-fRBz9oGO7dCpuViTVDO1nFe3E3JLQvMzjoZr2wYBs7E888o4gL4EDa3s9YiKJOiak=",
        title: "wiktionary.org",
        sourceName: "wiktionary.org",
        description: "Um dicionário colaborativo que fornece definições detalhadas, etimologia e exemplos de uso para palavras e expressões.",
        quality: "high",
        buttonLabel: "En savoir plus",
        approved: true,
        lastChecked: null
      },
      {
        type: "youglish",
        url: "https://youglish.com/pronounce/casser%20les%20pieds/french",
        title: "YouGlish",
        sourceName: "YouGlish",
        description: "Ouça a expressão sendo usada por falantes reais em vários vídeos.",
        quality: "high",
        buttonLabel: "Voir en contexte",
        approved: true,
        lastChecked: null
      }
    ],
    status: "needs_review"
  },
  {
    id: "expr-003",
    type: "expression",
    canonicalExpression: "poser un lapin",
    level: "B1",
    expressionAudioFile: "c27236a9a4e4.mp3",
    meaning: {
      fr: "Ne pas venir à un rendez-vous sans prévenir.",
      pt: "Dar um bolo, não comparecer a um compromisso."
    },
    example: {
      text: "J'étais très en colère parce que mon ami m'a posé un lapin pour notre rendez-vous hier soir."
    },
    question: "Que signifie cette expression ?",
    options: [
      "Faire une blague à quelqu'un.",
      "Ne pas venir à un rendez-vous sans prévenir.",
      "Inviter quelqu'un à manger.",
      "Raconter une histoire drôle."
    ],
    correctAnswer: "Ne pas venir à un rendez-vous sans prévenir.",
    explanation: "Cette expression signifie qu'une personne ne s'est pas présentée à un rendez-vous convenu et n'a pas donné de nouvelles.",
    secondExample: {
      text: "Elle a décidé de lui poser un lapin car elle ne voulait plus le voir.",
      audioFile: "830e4e90cee6.mp3"
    },
    microActivity: {
      prompt: "Il ne faut pas __________ quand on a promis de venir.",
      answer: "poser de lapin"
    },
    externalResources: [
      {
        type: "dictionary",
        url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFEL8cTUf19hTff_bmYHkSuRtzLnKu5aS4RXHSB9um9dCKHd0P6Jt8SNdXBsb9hVlTbBXao6uw_3RFGpqMEO2T8g9i_JT8eeueksNfwaaKHyH5Ayrk4HZP9V8HzkwwQi2ilWRWaXNs=",
        title: "wiktionary.org",
        sourceName: "wiktionary.org",
        description: "Dicionário com definições, etimologia e exemplos de uso da expressão.",
        quality: "high",
        buttonLabel: "En savoir plus",
        approved: true,
        lastChecked: null
      },
      {
        type: "youglish",
        url: "https://youglish.com/pronounce/poser%20un%20lapin/french",
        title: "YouGlish",
        sourceName: "YouGlish",
        description: "Ouça a expressão sendo usada por falantes reais em vários vídeos.",
        quality: "high",
        buttonLabel: "Voir en contexte",
        approved: true,
        lastChecked: null
      }
    ],
    status: "needs_review"
  }
];
