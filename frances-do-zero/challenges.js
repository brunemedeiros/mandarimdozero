// ---------- Desafios: Expressões francesas com contexto em vídeo ----------
// Cada desafio segue: expressão -> vídeo autêntico do YouTube -> hipótese ->
// alternativas -> feedback -> segundo exemplo (flexionado, com TTS) ->
// microatividade. Ver a especificação completa da funcionalidade.
//
// `canonicalExpression` é a forma lexical que o aluno está aprendendo;
// `videoOccurrence` é a forma efetivamente pronunciada no vídeo — nunca a
// mesma coisa quando o vídeo usa uma forma flexionada. Nunca alterar uma
// pra parecer a outra.
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
      fr: "être mal après avoir trop bu de l'alcool",
      pt: "estar de ressaca"
    },
    video: {
      youtubeId: null, // ainda não verificado — ver texto acima
      startTime: null,
      endTime: null,
      spokenOccurrence: null, // forma efetivamente pronunciada no vídeo (diferente de canonicalExpression)
      transcript: null,       // só o trecho relevante, nunca a transcrição inteira do vídeo
      confidence: null,       // 0-1, estimativa do Gemini de que a expressão foi mesmo dita ali
      audioClarity: null,     // "high" | "medium" | "low"
      contextQuality: null,   // "high" | "medium" | "low"
      notes: null             // observação curta do Gemini sobre o trecho
    },
    question: { fr: "À votre avis, que signifie cette expression ?" },
    choices: [
      { text: "être très fatigué après un long voyage", correct: false },
      { text: "être mal après avoir trop bu de l'alcool", correct: true },
      { text: "avoir peur de quelque chose", correct: false },
      { text: "être très content d'une bonne nouvelle", correct: false }
    ],
    explanation: "\"Avoir la gueule de bois\" décrit le malaise physique (mal de tête, nausée...) ressenti le lendemain d'avoir trop bu d'alcool.",
    secondExample: {
      text: "Après la fête de samedi, j'avais une énorme gueule de bois le lendemain.",
      audioFile: "e919fd777a3a.mp3"
    },
    microActivity: {
      prompt: "Hier soir, j'ai beaucoup trop bu. Ce matin, j'__________.",
      answer: "j'ai la gueule de bois"
    },
    status: "needs_review"
  },
  {
    id: "expr-002",
    type: "expression",
    canonicalExpression: "avoir le cafard",
    level: "B1",
    meaning: {
      fr: "Être triste, mélancolique, déprimé.",
      pt: "Estar triste, melancólico, deprimido."
    },
    video: {
      youtubeId: "JNznh473W3g",
      startTime: 41.0,
      endTime: 43.0,
      spokenOccurrence: "avoir le cafard",
      transcript: "le cafard a eu une autre signification",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie l'expression 'avoir le cafard' ?" },
    choices: [
        { text: "Avoir beaucoup d'énergie", correct: false },
        { text: "Être de mauvaise humeur ou triste", correct: true },
        { text: "Avoir très faim", correct: false },
        { text: "Être en colère", correct: false }
    ],
    explanation: "L'expression vient de l'idée que le cafard, un insecte sombre, symbolise la tristesse ou les idées noires. On l'utilise pour décrire un état de déprime passagère.",
    secondExample: {
      text: "Depuis qu'il a déménagé, il a souvent le cafard le soir.",
      audioFile: null
    },
    microActivity: {
      prompt: "Quand il pleut toute la semaine, je commence à __________.",
      answer: "avoir le cafard"
    },
    status: "needs_review"
  },
  {
    id: "expr-003",
    type: "expression",
    canonicalExpression: "avoir un chat dans la gorge",
    level: "B1",
    meaning: {
      fr: "Avoir la voix enrouée ou cassée, comme si quelque chose bloquait la gorge.",
      pt: "Estar com a voz rouca ou falhando, como se algo estivesse bloqueando a garganta."
    },
    video: {
      youtubeId: "W3ULvfHRRvQ",
      startTime: 1.0,
      endTime: 2.0,
      spokenOccurrence: "avoir un chat dans la gorge",
      transcript: "avoir un chat dans la gorge",
      confidence: 1.0,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie l'expression 'avoir un chat dans la gorge' ?" },
    choices: [
        { text: "Être très fatigué.", correct: false },
        { text: "Avoir la voix rauque ou enrouée.", correct: true },
        { text: "Avoir peur de parler.", correct: false },
        { text: "Être surpris par quelque chose.", correct: false }
    ],
    explanation: "Cette expression imagée décrit la sensation d'avoir la gorge irritée, ce qui rend la voix rauque. On l'utilise quand on a du mal à parler clairement.",
    secondExample: {
      text: "Avant de monter sur scène, il a senti qu'il avait un chat dans la gorge et a bu un peu d'eau.",
      audioFile: null
    },
    microActivity: {
      prompt: "Quand il a essayé de parler, il s'est rendu compte qu'il __________.",
      answer: "avait un chat dans la gorge"
    },
    status: "needs_review"
  },
  {
    id: "expr-004",
    type: "expression",
    canonicalExpression: "coûter les yeux de la tête",
    level: "B1",
    meaning: {
      fr: "Cela signifie que quelque chose est extrêmement cher, qu'il faut payer beaucoup d'argent.",
      pt: "Significa que algo é extremamente caro, que é preciso pagar muito dinheiro."
    },
    video: {
      youtubeId: "IjukIJkOd9s",
      startTime: 3.0,
      endTime: 4.5,
      spokenOccurrence: "coûter les yeux de la tête",
      transcript: "coûter les yeux de la tête",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie cette expression ?" },
    choices: [
        { text: "Être très beau ou attirant.", correct: false },
        { text: "Être très difficile à faire.", correct: false },
        { text: "Être très cher.", correct: true },
        { text: "Être très dangereux.", correct: false }
    ],
    explanation: "L'expression 'coûter les yeux de la tête' est une hyperbole. Elle suggère que le prix est si élevé qu'on pourrait presque vendre ses propres yeux pour le payer.",
    secondExample: {
      text: "J'adorerais acheter cette voiture de sport, mais elle coûte vraiment les yeux de la tête.",
      audioFile: null
    },
    microActivity: {
      prompt: "Ce nouveau smartphone est incroyable, mais il __________ !",
      answer: "coûte les yeux de la tête"
    },
    status: "needs_review"
  },
  {
    id: "expr-005",
    type: "expression",
    canonicalExpression: "être dans la lune",
    level: "B1",
    meaning: {
      fr: "Être distrait, ne pas faire attention à ce qui se passe autour de soi.",
      pt: "Estar distraído, não prestar atenção ao que acontece ao seu redor."
    },
    video: {
      youtubeId: "wVfKlVkEj18",
      startTime: 2.7,
      endTime: 3.9,
      spokenOccurrence: "être dans la lune",
      transcript: "être dans la lune",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie cette expression ?" },
    choices: [
        { text: "Être très fatigué.", correct: false },
        { text: "Être rêveur ou distrait.", correct: true },
        { text: "Être en colère.", correct: false },
        { text: "Être très heureux.", correct: false }
    ],
    explanation: "Cette expression signifie que quelqu'un est perdu dans ses pensées et ne remarque pas ce qui se passe dans le monde réel. C'est comme si son esprit était parti sur la lune.",
    secondExample: {
      text: "Pardon, je n'ai pas entendu ta question, j'étais dans la lune.",
      audioFile: null
    },
    microActivity: {
      prompt: "Quand le professeur explique la leçon, il faut faire attention et ne pas __________.",
      answer: "être dans la lune"
    },
    status: "needs_review"
  },
  {
    id: "expr-006",
    type: "expression",
    canonicalExpression: "avoir la pêche",
    level: "B1",
    meaning: {
      fr: "Être en pleine forme, avoir beaucoup d'énergie.",
      pt: "Estar com muita energia, sentir-se bem e animado."
    },
    video: {
      youtubeId: "HNBOAIVoRcA",
      startTime: 0.0,
      endTime: 13.0,
      spokenOccurrence: "avoir la pêche",
      transcript: "Avoir la pêche",
      confidence: 1.0,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie cette expression ?" },
    choices: [
        { text: "Être fatigué et vouloir dormir.", correct: false },
        { text: "Être de mauvaise humeur.", correct: false },
        { text: "Être plein d'énergie et de vitalité.", correct: true },
        { text: "Avoir très faim.", correct: false }
    ],
    explanation: "Cette expression idiomatique signifie que quelqu'un se sent en excellente forme physique et mentale. C'est comme si la personne avait l'énergie d'une pêche mûre et juteuse.",
    secondExample: {
      text: "Après une bonne nuit de sommeil, je me suis réveillé avec la pêche ce matin !",
      audioFile: null
    },
    microActivity: {
      prompt: "Elle est toujours souriante et pleine de vie, elle a vraiment __________________ !",
      answer: "la pêche"
    },
    status: "needs_review"
  },
  {
    id: "expr-007",
    type: "expression",
    canonicalExpression: "mettre la main à la pâte",
    level: "B1",
    meaning: {
      fr: "Participer activement à une tâche, aider concrètement.",
      pt: "Participar ativamente de uma tarefa, ajudar concretamente."
    },
    video: {
      youtubeId: "We88gvSxReg",
      startTime: 16.667,
      endTime: 18.333,
      spokenOccurrence: "mettre la main à la pâte",
      transcript: "nous devons tous mettre la main à la pâte.",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie l'expression 'mettre la main à la pâte' ?" },
    choices: [
        { text: "Faire un travail manuel.", correct: false },
        { text: "Aider à faire quelque chose, participer activement.", correct: true },
        { text: "Se salir les mains.", correct: false },
        { text: "Être très occupé.", correct: false }
    ],
    explanation: "Cette expression signifie participer directement à une activité, souvent pour aider. Elle implique un engagement physique ou pratique dans une tâche.",
    secondExample: {
      text: "Pour organiser la fête, tout le monde a mis la main à la pâte pour décorer la salle.",
      audioFile: null
    },
    microActivity: {
      prompt: "Pour finir ce projet à temps, nous devons tous __________.",
      answer: "mettre la main à la pâte"
    },
    status: "needs_review"
  },
  {
    id: "expr-008",
    type: "expression",
    canonicalExpression: "tomber dans les pommes",
    level: "B1",
    meaning: {
      fr: "S'évanouir, perdre connaissance soudainement.",
      pt: "Desmaiar, perder a consciência subitamente."
    },
    video: {
      youtubeId: "UgNoyDAse1g",
      startTime: 1.56,
      endTime: 2.76,
      spokenOccurrence: "tomber dans les pommes",
      transcript: "tomber dans les pommes",
      confidence: 1.0,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie l'expression 'tomber dans les pommes' ?" },
    choices: [
        { text: "Tomber par terre à cause de la fatigue.", correct: false },
        { text: "Être très surpris par quelque chose.", correct: false },
        { text: "Perdre connaissance, s'évanouir.", correct: true },
        { text: "Tomber amoureux très rapidement.", correct: false }
    ],
    explanation: "Cette expression signifie s'évanouir. L'origine n'est pas certaine, mais elle est utilisée pour décrire une perte de conscience soudaine.",
    secondExample: {
      text: "Après avoir couru le marathon, il est tombé dans les pommes juste avant la ligne d'arrivée.",
      audioFile: null
    },
    microActivity: {
      prompt: "Il faisait si chaud dans la salle qu'elle a __________.",
      answer: "est tombée dans les pommes"
    },
    status: "needs_review"
  },
  {
    id: "expr-009",
    type: "expression",
    canonicalExpression: "avoir le coup de foudre",
    level: "B1",
    meaning: {
      fr: "C'est tomber amoureux de quelqu'un très rapidement, dès la première rencontre.",
      pt: "É apaixonar-se por alguém muito rapidamente, logo no primeiro encontro."
    },
    video: {
      youtubeId: "Rt23HRHUJ7s",
      startTime: 5.0,
      endTime: 6.0,
      spokenOccurrence: "Avoir un coup de foudre",
      transcript: "Avoir un coup de foudre",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie l'expression 'avoir le coup de foudre' ?" },
    choices: [
        { text: "Être surpris par un coup de tonnerre.", correct: false },
        { text: "Tomber amoureux instantanément de quelqu'un.", correct: true },
        { text: "Recevoir un choc électrique.", correct: false },
        { text: "Avoir une idée soudaine et brillante.", correct: false }
    ],
    explanation: "L'expression 'avoir le coup de foudre' décrit le sentiment d'être instantanément et intensément attiré par quelqu'un. C'est comme un coup de cœur immédiat.",
    secondExample: {
      text: "Quand il a vu Sophie pour la première fois, il a eu le coup de foudre.",
      audioFile: null
    },
    microActivity: {
      prompt: "Dès qu'il l'a vue, il a __________.",
      answer: "eu le coup de foudre"
    },
    status: "needs_review"
  },
  {
    id: "expr-010",
    type: "expression",
    canonicalExpression: "faire la grasse matinée",
    level: "B1",
    meaning: {
      fr: "Dormir tard le matin, ne pas se lever tôt.",
      pt: "Dormir até tarde, não acordar cedo."
    },
    video: {
      youtubeId: "agU1vljW8_w",
      startTime: 31.0,
      endTime: 32.0,
      spokenOccurrence: "faire la grasse matinée",
      transcript: "faire la grasse matinée",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie cette expression ?" },
    choices: [
        { text: "Se réveiller très tôt.", correct: false },
        { text: "Dormir beaucoup le matin.", correct: true },
        { text: "Se dépêcher le matin.", correct: false },
        { text: "Se lever avec le soleil.", correct: false }
    ],
    explanation: "L'expression 'faire la grasse matinée' signifie dormir plus longtemps que d'habitude le matin, souvent le week-end. C'est une façon de se reposer.",
    secondExample: {
      text: "Dimanche dernier, j'ai fait la grasse matinée car j'étais très fatigué.",
      audioFile: null
    },
    microActivity: {
      prompt: "Après une longue semaine de travail, j'aime bien __________ le samedi.",
      answer: "faire la grasse matinée"
    },
    status: "needs_review"
  },
  {
    id: "expr-011",
    type: "expression",
    canonicalExpression: "prendre la tête à quelqu'un",
    level: "B1",
    meaning: {
      fr: "Cela signifie que quelque chose ou quelqu'un vous agace, vous énerve ou vous ennuie profondément.",
      pt: "Significa que algo ou alguém te chateia, te irrita ou te aborrece profundamente."
    },
    video: {
      youtubeId: "X0TfDKhj5rw",
      startTime: 14.5,
      endTime: 15.5,
      spokenOccurrence: "ça me prend la tête",
      transcript: "Ça me prend la tête",
      confidence: 0.9,
      audioClarity: "high",
      contextQuality: "high",
      notes: null
    },
    question: { fr: "À votre avis, que signifie l'expression 'prendre la tête à quelqu'un' ?" },
    choices: [
        { text: "Faire rire quelqu'un", correct: false },
        { text: "Agacer ou énerver quelqu'un", correct: true },
        { text: "Aider quelqu'un", correct: false },
        { text: "Comprendre quelqu'un", correct: false }
    ],
    explanation: "L'expression 'prendre la tête à quelqu'un' est utilisée pour décrire une situation où une personne est tellement agacée par quelque chose ou quelqu'un qu'elle en perd son calme. C'est l'équivalent de 'to get on someone's nerves' en anglais.",
    secondExample: {
      text: "Arrête de faire ce bruit, tu me prends la tête !",
      audioFile: null
    },
    microActivity: {
      prompt: "Quand mon voisin met sa musique à fond la nuit, ça me ____________________.",
      answer: "prend la tête"
    },
    status: "needs_review"
  }
];
