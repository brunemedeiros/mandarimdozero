// CONTEÚDO-BASE do curso de francês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/fr-pt-BR/layer.js (português) e fr/content.en.js (inglês).
// Ids, frases em francês (f), respostas, tipos e ordem. Sozinho NÃO é exibível: a camada carrega logo depois e se aplica sobre ele.
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/fr-<arquivo>.js.txt.

const LEVELS = [
  { "id": "A1" },
  { "id": "A2" }
];

const UNITS = [
  {
    "id": "A1-1",
    "level": "A1",
    "lessons": [
      {
        "id": "ola-e-tchau",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "informal-agradecer",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "cortesia-e-como-vai",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "bonjour-vs-bonsoir",
        "trigger": { "afterVocabIdx": 1 },
        "blocks": [
          {
            "examples": [
              { "f": "bonjour" },
              { "f": "bonsoir" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "svp-informal",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 6 },
        "blocks": [
          {
            "examples": [
              { "f": "s'il te plaît" },
              { "f": "STP" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "a-bientot-informal",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 9 },
        "blocks": [
          {
            "examples": [
              { "f": "à plus" },
              { "f": "A+" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "la-bise-cumprimento",
        "kind": "culture",
        "category": "costume",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "faire la bise" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "Merci beaucoup !", "emoji": "🙏", "answer": true }
    ],
    "vocab": [
      { "f": "bonjour" },
      { "f": "bonsoir" },
      { "f": "au revoir" },
      { "f": "salut" },
      { "f": "merci" },
      { "f": "de rien" },
      { "f": "s'il vous plaît" },
      { "f": "pardon" },
      { "f": "ça va" },
      { "f": "à bientôt" }
    ],
    "phrases": [
      {
        "f": "Bonjour ! Je m'appelle {nome}.",
        "blocks": [
          { "f": "Bonjour !" },
          { "f": "Je m'appelle" },
          { "f": "{nome}." }
        ],
        "scenarioEmoji": "🎉"
      },
      {
        "f": "Merci beaucoup !",
        "blocks": [
          { "f": "Merci" },
          { "f": "beaucoup !" }
        ],
        "scenarioEmoji": "🛍️"
      },
      {
        "f": "Pardon, je ne comprends pas.",
        "blocks": [
          { "f": "Pardon," },
          { "f": "je ne" },
          { "f": "comprends pas." }
        ],
        "scenarioEmoji": "😕"
      },
      {
        "f": "Ça va bien, et toi ?",
        "blocks": [
          { "f": "Ça va" },
          { "f": "bien," },
          { "f": "et toi ?" }
        ],
        "scenarioEmoji": "☕"
      },
      {
        "f": "Bonsoir ! Comment allez-vous ?",
        "blocks": [
          { "f": "Bonsoir !" },
          { "f": "Comment allez-vous ?" }
        ]
      },
      {
        "f": "Au revoir, à demain !",
        "blocks": [
          { "f": "Au revoir," },
          { "f": "à demain !" }
        ]
      },
      {
        "f": "Salut ! Ça va bien ?",
        "blocks": [
          { "f": "Salut !" },
          { "f": "Ça va bien ?" }
        ]
      },
      {
        "f": "De rien, c'est normal.",
        "blocks": [
          { "f": "De rien," },
          { "f": "c'est normal." }
        ]
      },
      {
        "f": "Un café, s'il vous plaît.",
        "blocks": [
          { "f": "Un café," },
          { "f": "s'il vous plaît." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Bonjour !" },
        { "f": "Bonjour ! Ça va ?" },
        { "f": "Ça va bien, merci ! Et toi ?" },
        { "f": "Ça va. À bientôt !" }
      ]
    }
  },
  {
    "id": "A1-2",
    "level": "A1",
    "lessons": [
      {
        "id": "pronomes-e-nome",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "nome-e-ser",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "nacionalidades",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "tu-vs-vous",
        "trigger": { "afterVocabIdx": 1 },
        "blocks": [
          {
            "examples": [
              { "f": "tu" },
              { "f": "vous" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "tu-es-contraction",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "t'es français ?" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "comment-tappelles-wh-in-situ",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "tu t'appelles comment ?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "Comment tu t'appelles ?", "emoji": "🙋", "answer": false }
    ],
    "vocab": [
      { "f": "je" },
      { "f": "tu" },
      { "f": "s'appeler" },
      { "f": "le nom" },
      { "f": "être" },
      { "f": "la France" },
      { "f": "le Brésil" },
      { "f": "français / française" },
      { "f": "brésilien / brésilienne" },
      { "f": "le pays" }
    ],
    "phrases": [
      {
        "f": "Comment tu t'appelles ?",
        "blocks": [
          { "f": "Comment" },
          { "f": "tu" },
          { "f": "t'appelles ?" }
        ],
        "scenarioEmoji": "🤝"
      },
      {
        "f": "Je suis {nacionalidade}.",
        "blocks": [
          { "f": "Je" },
          { "f": "suis" },
          { "f": "{nacionalidade}." }
        ],
        "scenarioEmoji": "🇧🇷"
      },
      {
        "f": "Tu es de quel pays ?",
        "blocks": [
          { "f": "Tu" },
          { "f": "es de" },
          { "f": "quel pays ?" }
        ],
        "scenarioEmoji": "🌍"
      },
      {
        "f": "Moi aussi, je suis française !",
        "blocks": [
          { "f": "Moi aussi," },
          { "f": "je suis" },
          { "f": "française !" }
        ],
        "scenarioEmoji": "🇫🇷"
      },
      {
        "f": "Quel est le nom de la ville ?",
        "blocks": [
          { "f": "Quel est" },
          { "f": "le nom" },
          { "f": "de la ville ?" }
        ]
      },
      {
        "f": "J'aime la France.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "la France." }
        ]
      },
      {
        "f": "Le Brésil est très grand.",
        "blocks": [
          { "f": "Le Brésil" },
          { "f": "est très" },
          { "f": "grand." }
        ]
      },
      {
        "f": "Le pays est magnifique.",
        "blocks": [
          { "f": "Le pays" },
          { "f": "est magnifique." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Bonjour, comment tu t'appelles ?" },
        { "f": "Je m'appelle Léo. Et toi ?" },
        { "f": "Moi, c'est Ana. Tu es français ?" },
        { "f": "Oui, je suis français. Et toi, tu es brésilienne ?" },
        { "f": "Oui, je suis brésilienne !" }
      ]
    }
  },
  {
    "id": "A1-3",
    "level": "A1",
    "lessons": [
      {
        "id": "primeiros-numeros",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "contar-ate-vinte",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "idade",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "avoir-age",
        "trigger": { "afterVocabIdx": 7 },
        "blocks": [
          {
            "examples": [
              { "f": "avoir" },
              { "f": "l'âge" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "vingt-to-quatrevingts",
        "kind": "reality",
        "category": "regional",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "variants": [
              { "form": "soixante-dix (70), quatre-vingts (80), quatre-vingt-dix (90)" },
              { "form": "septante (70) e nonante (90) — mais parecido com contar de 10 em 10" },
              { "form": "huitante (80) — a Bélgica continua usando quatre-vingts" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "quel-age-wh-in-situ",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "f": "t'as quel âge ?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "zéro" },
      { "f": "un / une" },
      { "f": "deux" },
      { "f": "trois" },
      { "f": "dix" },
      { "f": "vingt" },
      { "f": "l'âge" },
      { "f": "avoir" },
      { "f": "ans" },
      { "f": "combien" }
    ],
    "phrases": [
      {
        "f": "Quel âge as-tu ?",
        "blocks": [
          { "f": "Quel âge" },
          { "f": "as-tu ?" }
        ],
        "scenarioEmoji": "🎂"
      },
      {
        "f": "J'ai vingt ans.",
        "blocks": [
          { "f": "J'ai" },
          { "f": "vingt" },
          { "f": "ans." }
        ],
        "scenarioEmoji": "🎈"
      },
      {
        "f": "Il a dix ans.",
        "blocks": [
          { "f": "Il a" },
          { "f": "dix" },
          { "f": "ans." }
        ],
        "scenarioEmoji": "👦"
      },
      {
        "f": "Nous sommes dix.",
        "blocks": [
          { "f": "Nous sommes" },
          { "f": "dix." }
        ],
        "scenarioEmoji": "🍽️"
      },
      {
        "f": "Combien ça coûte ?",
        "blocks": [
          { "f": "Combien" },
          { "f": "ça coûte ?" }
        ]
      },
      {
        "f": "Il fait zéro degré dehors.",
        "blocks": [
          { "f": "Il fait" },
          { "f": "zéro degré" },
          { "f": "dehors." }
        ]
      },
      {
        "f": "J'ai deux frères et trois sœurs.",
        "blocks": [
          { "f": "J'ai" },
          { "f": "deux frères" },
          { "f": "et trois sœurs." }
        ]
      },
      {
        "f": "Quel est l'âge de ton père ?",
        "blocks": [
          { "f": "Quel est" },
          { "f": "l'âge" },
          { "f": "de ton père ?" }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Quel âge a ta fille ?" },
        { "f": "Elle a huit ans. Et ton fils ?" },
        { "f": "Il a dix ans." },
        { "f": "Ils sont grands !" }
      ]
    }
  },
  {
    "id": "A1-g1",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "Je suis brésilienne." },
            { "f": "J'ai vingt ans." }
          ]
        },
        {
          "examples": [
            { "f": "Il a dix ans." },
            { "f": "Elle est ma sœur." }
          ]
        },
        {
          "examples": [
            { "f": "J'ai faim." },
            { "f": "Elle a raison." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "suis" },
              { "form": "es" },
              { "form": "est" },
              { "form": "sommes" },
              { "form": "êtes" },
              { "form": "sont" }
            ],
            "1": [
              { "form": "ai" },
              { "form": "as" },
              { "form": "a" },
              { "form": "avons" },
              { "form": "avez" },
              { "form": "ont" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "suis" },
        { "answer": "as" },
        { "answer": "sommes" },
        { "answer": "ont" },
        { "answer": "êtes" },
        { "answer": "a" }
      ]
    }
  },
  {
    "id": "A1-4",
    "level": "A1",
    "lessons": [
      {
        "id": "nuclear",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "irmaos",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "completa",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "mon-vs-ma",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "f": "mon frère" },
              { "f": "ma sœur" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "pere-mere-papa-maman",
        "kind": "reality",
        "category": "informal",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "papa" },
              { "f": "maman" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "repas-dominical",
        "kind": "culture",
        "category": "costume",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "le repas dominical" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "la famille" },
      { "f": "le père" },
      { "f": "la mère" },
      { "f": "le frère" },
      { "f": "la sœur" },
      { "f": "les parents" },
      { "f": "le fils" },
      { "f": "la fille" },
      { "f": "le mari" },
      { "f": "la femme" }
    ],
    "phrases": [
      {
        "f": "Voici ma famille.",
        "blocks": [
          { "f": "Voici" },
          { "f": "ma famille." }
        ],
        "scenarioEmoji": "👨‍👩‍👧‍👦"
      },
      {
        "f": "J'ai deux frères.",
        "blocks": [
          { "f": "J'ai" },
          { "f": "deux" },
          { "f": "frères." }
        ],
        "scenarioEmoji": "👬"
      },
      {
        "f": "Mon père s'appelle Marc.",
        "blocks": [
          { "f": "Mon père" },
          { "f": "s'appelle" },
          { "f": "Marc." }
        ],
        "scenarioEmoji": "👨"
      },
      {
        "f": "Elle est ma sœur.",
        "blocks": [
          { "f": "Elle est" },
          { "f": "ma sœur." }
        ],
        "scenarioEmoji": "👧"
      },
      {
        "f": "La famille est très importante.",
        "blocks": [
          { "f": "La famille" },
          { "f": "est très" },
          { "f": "importante." }
        ]
      },
      {
        "f": "Le père travaille en ville.",
        "blocks": [
          { "f": "Le père" },
          { "f": "travaille" },
          { "f": "en ville." }
        ]
      },
      {
        "f": "La mère prépare le dîner.",
        "blocks": [
          { "f": "La mère" },
          { "f": "prépare" },
          { "f": "le dîner." }
        ]
      },
      {
        "f": "Le frère et la sœur jouent ensemble.",
        "blocks": [
          { "f": "Le frère" },
          { "f": "et la sœur" },
          { "f": "jouent ensemble." }
        ]
      },
      {
        "f": "Les parents adorent leurs enfants.",
        "blocks": [
          { "f": "Les parents" },
          { "f": "adorent" },
          { "f": "leurs enfants." }
        ]
      },
      {
        "f": "Le fils et la fille aiment l'école.",
        "blocks": [
          { "f": "Le fils" },
          { "f": "et la fille" },
          { "f": "aiment l'école." }
        ]
      },
      {
        "f": "Le mari et la femme habitent à Paris.",
        "blocks": [
          { "f": "Le mari" },
          { "f": "et la femme" },
          { "f": "habitent à Paris." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Tu as des frères et sœurs ?" },
        { "f": "Oui, j'ai une sœur. Et toi ?" },
        { "f": "Moi, j'ai un frère. Il s'appelle Paul." },
        { "f": "Il a quel âge ?" },
        { "f": "Il a quinze ans." }
      ]
    }
  },
  {
    "id": "A1-g2",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "C'est mon frère." },
            { "f": "C'est ma sœur." }
          ]
        },
        {
          "examples": [
            { "f": "Notre père s'appelle Jean." },
            { "f": "Ce sont leurs parents." }
          ]
        },
        {
          "examples": [
            { "f": "C'est mon amie Sophie." },
            { "f": "Son école est loin." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "mon" },
              { "form": "ton" },
              { "form": "son" },
              { "form": "notre" },
              { "form": "votre" },
              { "form": "leur" }
            ],
            "1": [
              { "form": "ma" },
              { "form": "ta" },
              { "form": "sa" },
              { "form": "notre" },
              { "form": "votre" },
              { "form": "leur" }
            ],
            "2": [
              { "form": "mes" },
              { "form": "tes" },
              { "form": "ses" },
              { "form": "nos" },
              { "form": "vos" },
              { "form": "leurs" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "mon" },
        { "answer": "ma" },
        { "answer": "mes" },
        { "answer": "notre" },
        { "answer": "leurs" },
        { "answer": "mon" }
      ]
    }
  },
  {
    "id": "A1-5",
    "level": "A1",
    "lessons": [
      {
        "id": "pao-agua-cafe",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "leite-queijo-maca",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "comer-beber-detestar",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "aime-le-vs-bois-du",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "f": "boire" },
              { "f": "détester" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "croissant-nao-e-diario",
        "kind": "culture",
        "category": "costume",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "la tartine" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "L'addition, s'il vous plaît.", "emoji": "🧾", "answer": true }
    ],
    "vocab": [
      { "f": "le pain" },
      { "f": "l'eau" },
      { "f": "le café" },
      { "f": "le lait" },
      { "f": "le fromage" },
      { "f": "la pomme" },
      { "f": "le poisson" },
      { "f": "manger" },
      { "f": "boire" },
      { "f": "détester" }
    ],
    "phrases": [
      {
        "f": "Je mange du pain le matin.",
        "blocks": [
          { "f": "Je mange" },
          { "f": "du pain" },
          { "f": "le matin." }
        ],
        "scenarioEmoji": "🥖"
      },
      {
        "f": "J'aime le fromage, mais je déteste le poisson.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "le fromage," },
          { "f": "mais je déteste" },
          { "f": "le poisson." }
        ],
        "scenarioEmoji": "🧀"
      },
      {
        "f": "Tu bois du café ou du lait ?",
        "blocks": [
          { "f": "Tu bois" },
          { "f": "du café" },
          { "f": "ou du lait ?" }
        ],
        "scenarioEmoji": "☕"
      },
      {
        "f": "L'addition, s'il vous plaît.",
        "blocks": [
          { "f": "L'addition," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "🧾"
      },
      {
        "f": "Le pain est délicieux.",
        "blocks": [
          { "f": "Le pain" },
          { "f": "est délicieux." }
        ]
      },
      {
        "f": "Je voudrais de l'eau, s'il vous plaît.",
        "blocks": [
          { "f": "Je voudrais" },
          { "f": "de l'eau," },
          { "f": "s'il vous plaît." }
        ]
      },
      {
        "f": "Le café est très chaud.",
        "blocks": [
          { "f": "Le café" },
          { "f": "est très" },
          { "f": "chaud." }
        ]
      },
      {
        "f": "Le lait est dans le frigo.",
        "blocks": [
          { "f": "Le lait" },
          { "f": "est dans" },
          { "f": "le frigo." }
        ]
      },
      {
        "f": "La pomme est rouge et sucrée.",
        "blocks": [
          { "f": "La pomme" },
          { "f": "est rouge" },
          { "f": "et sucrée." }
        ]
      },
      {
        "f": "J'aime manger le matin.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "manger" },
          { "f": "le matin." }
        ]
      },
      {
        "f": "Tu veux boire quelque chose ?",
        "blocks": [
          { "f": "Tu veux" },
          { "f": "boire" },
          { "f": "quelque chose ?" }
        ]
      },
      {
        "f": "Je vais détester ce plat, je pense.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "détester" },
          { "f": "ce plat, je pense." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Bonjour, vous désirez ?" },
        { "f": "Un café et un croissant, s'il vous plaît." },
        { "f": "Autre chose ?" },
        { "f": "Non merci, c'est tout." },
        { "f": "Voilà, ça fait cinq euros." }
      ]
    }
  },
  {
    "id": "A1-6",
    "level": "A1",
    "lessons": [
      {
        "id": "horas-e-periodos",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "noite-acordar-levantar",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "rotina-diaria",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "etre-heures",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "f": "l'heure" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "le-midi-almoco-longo",
        "kind": "culture",
        "category": "costume",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "le déjeuner" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "l'heure" },
      { "f": "le matin" },
      { "f": "le midi" },
      { "f": "le soir" },
      { "f": "se réveiller" },
      { "f": "se lever" },
      { "f": "manger" },
      { "f": "travailler" },
      { "f": "dormir" },
      { "f": "minuit" }
    ],
    "phrases": [
      {
        "f": "Quelle heure est-il ?",
        "blocks": [
          { "f": "Quelle heure" },
          { "f": "est-il ?" }
        ],
        "scenarioEmoji": "⏰"
      },
      {
        "f": "Il est huit heures.",
        "blocks": [
          { "f": "Il est" },
          { "f": "huit heures." }
        ],
        "scenarioEmoji": "🕗"
      },
      {
        "f": "Je me réveille à sept heures.",
        "blocks": [
          { "f": "Je me réveille" },
          { "f": "à" },
          { "f": "sept heures." }
        ],
        "scenarioEmoji": "⏰"
      },
      {
        "f": "Le soir, je regarde la télé.",
        "blocks": [
          { "f": "Le soir," },
          { "f": "je regarde" },
          { "f": "la télé." }
        ],
        "scenarioEmoji": "📺"
      },
      {
        "f": "Il regarde l'heure sur son téléphone.",
        "blocks": [
          { "f": "Il regarde" },
          { "f": "l'heure" },
          { "f": "sur son téléphone." }
        ]
      },
      {
        "f": "Le midi, je mange à la maison.",
        "blocks": [
          { "f": "Le midi," },
          { "f": "je mange" },
          { "f": "à la maison." }
        ]
      },
      {
        "f": "Il va se réveiller tôt demain.",
        "blocks": [
          { "f": "Il va" },
          { "f": "se réveiller" },
          { "f": "tôt demain." }
        ]
      },
      {
        "f": "Elle va se lever à sept heures.",
        "blocks": [
          { "f": "Elle va" },
          { "f": "se lever" },
          { "f": "à sept heures." }
        ]
      },
      {
        "f": "Il doit travailler jusqu'à minuit.",
        "blocks": [
          { "f": "Il doit" },
          { "f": "travailler" },
          { "f": "jusqu'à minuit." }
        ]
      },
      {
        "f": "Je vais dormir maintenant.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "dormir" },
          { "f": "maintenant." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Tu te lèves à quelle heure ?" },
        { "f": "Je me lève à six heures et demie." },
        { "f": "Et tu travailles quand ?" },
        { "f": "Je travaille le matin et l'après-midi." }
      ]
    }
  },
  {
    "id": "A1-g3",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "Je travaille le matin." },
            { "f": "Tu manges à midi." }
          ]
        },
        {
          "examples": [
            { "f": "Nous mangeons à sept heures." },
            { "f": "Vous mangez du pain." }
          ]
        },
        {
          "examples": [
            { "f": "Je me lève à six heures." },
            { "f": "Tu te réveilles tôt ?" }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "travaille" },
              { "form": "travailles" },
              { "form": "travaille" },
              { "form": "travaillons" },
              { "form": "travaillez" },
              { "form": "travaillent" }
            ],
            "1": [
              { "form": "me lève" },
              { "form": "te lèves" },
              { "form": "se lève" },
              { "form": "nous levons" },
              { "form": "vous levez" },
              { "form": "se lèvent" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "me réveille" },
        { "answer": "te lèves" },
        { "answer": "mangeons" },
        { "answer": "travaille" },
        { "answer": "aimez" },
        { "answer": "se lèvent" }
      ]
    }
  },
  {
    "id": "A1-7",
    "level": "A1",
    "lessons": [
      {
        "id": "dias-da-semana",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "ontem-amanha-semana",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "meses-e-data",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "a-demain-vs-a-bientot",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "f": "demain" },
              { "f": "hier" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "dias-semana-deuses-romanos",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 1 },
        "blocks": [
          {
            "examples": [
              { "f": "lundi" },
              { "f": "mardi" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "nous-sommes-on-est",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "on est lundi" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "lundi" },
      { "f": "mardi" },
      { "f": "aujourd'hui" },
      { "f": "demain" },
      { "f": "hier" },
      { "f": "la semaine" },
      { "f": "le mois" },
      { "f": "janvier" },
      { "f": "décembre" },
      { "f": "la date" }
    ],
    "phrases": [
      {
        "f": "Quel jour sommes-nous ?",
        "blocks": [
          { "f": "Quel jour" },
          { "f": "sommes-nous ?" }
        ],
        "scenarioEmoji": "📅"
      },
      {
        "f": "Nous sommes lundi.",
        "blocks": [
          { "f": "Nous sommes" },
          { "f": "lundi." }
        ],
        "scenarioEmoji": "🗓️"
      },
      {
        "f": "Mon anniversaire est en mars.",
        "blocks": [
          { "f": "Mon anniversaire" },
          { "f": "est" },
          { "f": "en mars." }
        ],
        "scenarioEmoji": "🎂"
      },
      {
        "f": "À demain !",
        "blocks": [
          { "f": "À" },
          { "f": "demain !" }
        ],
        "scenarioEmoji": "👋"
      },
      {
        "f": "Aujourd'hui, il fait beau.",
        "blocks": [
          { "f": "Aujourd'hui," },
          { "f": "il fait beau." }
        ]
      },
      {
        "f": "La semaine prochaine, je pars en voyage.",
        "blocks": [
          { "f": "La semaine" },
          { "f": "prochaine," },
          { "f": "je pars en voyage." }
        ]
      },
      {
        "f": "Le mois de janvier est très froid.",
        "blocks": [
          { "f": "Le mois" },
          { "f": "de janvier" },
          { "f": "est très froid." }
        ]
      },
      {
        "f": "Mon anniversaire est en décembre.",
        "blocks": [
          { "f": "Mon anniversaire" },
          { "f": "est en" },
          { "f": "décembre." }
        ]
      },
      {
        "f": "Quelle est la date aujourd'hui ?",
        "blocks": [
          { "f": "Quelle est" },
          { "f": "la date" },
          { "f": "aujourd'hui ?" }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "On se voit quel jour ?" },
        { "f": "Mardi, ça te va ?" },
        { "f": "Non, je travaille mardi. Et mercredi ?" },
        { "f": "Parfait, à mercredi alors !" }
      ]
    }
  },
  {
    "id": "A1-8",
    "level": "A1",
    "lessons": [
      {
        "id": "lugares-na-cidade",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "hospital-estacao-em-frente",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "direcoes",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "ou-est-vs-il-y-a",
        "trigger": { "after": "dialogue" },
        "blocks": [
          { "wrapup": true }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "C'est loin d'ici ?", "emoji": "🗺️", "answer": false }
    ],
    "vocab": [
      { "f": "la rue" },
      { "f": "la place" },
      { "f": "le musée" },
      { "f": "l'hôpital" },
      { "f": "la gare" },
      { "f": "tout droit" },
      { "f": "à gauche" },
      { "f": "à droite" },
      { "f": "près" },
      { "f": "loin" }
    ],
    "phrases": [
      {
        "f": "Où est la gare ?",
        "blocks": [
          { "f": "Où est" },
          { "f": "la gare ?" }
        ],
        "scenarioEmoji": "🚉"
      },
      {
        "f": "Tournez à gauche.",
        "blocks": [
          { "f": "Tournez" },
          { "f": "à gauche." }
        ],
        "scenarioEmoji": "⬅️"
      },
      {
        "f": "C'est tout droit.",
        "blocks": [
          { "f": "C'est" },
          { "f": "tout droit." }
        ],
        "scenarioEmoji": "⬆️"
      },
      {
        "f": "C'est loin d'ici ?",
        "blocks": [
          { "f": "C'est loin" },
          { "f": "d'ici ?" }
        ],
        "scenarioEmoji": "🗺️"
      },
      {
        "f": "La rue est très calme le soir.",
        "blocks": [
          { "f": "La rue" },
          { "f": "est très calme" },
          { "f": "le soir." }
        ]
      },
      {
        "f": "La place est au centre-ville.",
        "blocks": [
          { "f": "La place" },
          { "f": "est au" },
          { "f": "centre-ville." }
        ]
      },
      {
        "f": "L'hôpital est loin d'ici.",
        "blocks": [
          { "f": "L'hôpital" },
          { "f": "est loin" },
          { "f": "d'ici." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Excusez-moi, où est le musée ?" },
        { "f": "C'est tout droit, puis à droite." },
        { "f": "C'est loin ?" },
        { "f": "Non, c'est à cinq minutes." },
        { "f": "Merci beaucoup !" }
      ]
    }
  },
  {
    "id": "A1-g4",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "J'habite à Paris." },
            { "f": "Elle voyage à Tokyo." }
          ]
        },
        {
          "examples": [
            { "f": "Je vais en France." },
            { "f": "Il travaille au Brésil." }
          ]
        },
        {
          "examples": [
            { "f": "Ils habitent aux États-Unis." },
            { "f": "Elle est aux Pays-Bas." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "à" },
              { "form": "en" },
              { "form": "au" },
              { "form": "aux" }
            ],
            "1": [
              { "form": "en France" },
              { "form": "au Brésil" },
              { "form": "au Portugal" },
              { "form": "aux États-Unis" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "à" },
        { "answer": "au" },
        { "answer": "en" },
        { "answer": "aux" },
        { "answer": "à" },
        { "answer": "au" }
      ]
    }
  },
  {
    "id": "A1-9",
    "level": "A1",
    "lessons": [
      {
        "id": "nacionalidades-1",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "nacionalidades-2",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "nacionalidade-e-origem",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "etre-nationalite-vs-venir-de",
        "trigger": { "afterVocabIdx": 9 },
        "blocks": [
          {
            "examples": [
              { "f": "venir de" },
              { "f": "la nationalité" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "dou-viens-tu-wh-in-situ",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "tu es d'où ?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "D'où viens-tu ?", "emoji": "🌍", "answer": false }
    ],
    "vocab": [
      { "f": "français / française" },
      { "f": "brésilien / brésilienne" },
      { "f": "américain / américaine" },
      { "f": "anglais / anglaise" },
      { "f": "espagnol / espagnole" },
      { "f": "italien / italienne" },
      { "f": "allemand / allemande" },
      { "f": "portugais / portugaise" },
      { "f": "la nationalité" },
      { "f": "venir de" }
    ],
    "phrases": [
      {
        "f": "Je suis {nacionalidade}.",
        "blocks": [
          { "f": "Je suis" },
          { "f": "{nacionalidade}." }
        ],
        "scenarioEmoji": "🇧🇷"
      },
      {
        "f": "Il est français, elle est espagnole.",
        "blocks": [
          { "f": "Il est français," },
          { "f": "elle est" },
          { "f": "espagnole." }
        ],
        "scenarioEmoji": "🌍"
      },
      {
        "f": "D'où viens-tu ?",
        "blocks": [
          { "f": "D'où" },
          { "f": "viens-tu ?" }
        ],
        "scenarioEmoji": "✈️"
      },
      {
        "f": "Je viens du Portugal.",
        "blocks": [
          { "f": "Je viens" },
          { "f": "du Portugal." }
        ],
        "scenarioEmoji": "🇵🇹"
      },
      {
        "f": "La nationalité est écrite sur le passeport.",
        "blocks": [
          { "f": "La nationalité" },
          { "f": "est écrite" },
          { "f": "sur le passeport." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Tu es d'où ?" },
        { "f": "Je suis italienne, et toi ?" },
        { "f": "Moi, je suis allemand." },
        { "f": "Tu habites en Allemagne ?" },
        { "f": "Non, j'habite au Portugal maintenant." }
      ]
    }
  },
  {
    "id": "A1-10",
    "level": "A1",
    "lessons": [
      {
        "id": "roupas-e-preco",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "tamanho-e-loja",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "numeros-30-50",
        "vocabIdx": [6, 7, 8]
      },
      {
        "id": "numeros-60-80",
        "vocabIdx": [9, 10, 11]
      },
      {
        "id": "numeros-90-100",
        "vocabIdx": [12, 13],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "voudrais-vs-peux",
        "trigger": { "after": "dialogue" },
        "blocks": [
          { "wrapup": true }
        ]
      },
      {
        "id": "combien-ca-coute-wh-in-situ",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "ça coûte combien ?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "le pantalon" },
      { "f": "la robe" },
      { "f": "cher" },
      { "f": "pas cher" },
      { "f": "la taille" },
      { "f": "le magasin" },
      { "f": "trente" },
      { "f": "quarante" },
      { "f": "cinquante" },
      { "f": "soixante" },
      { "f": "soixante-dix" },
      { "f": "quatre-vingts" },
      { "f": "quatre-vingt-dix" },
      { "f": "cent" }
    ],
    "phrases": [
      {
        "f": "Combien ça coûte ?",
        "blocks": [
          { "f": "Combien" },
          { "f": "ça coûte ?" }
        ],
        "scenarioEmoji": "🏷️"
      },
      {
        "f": "Ça coûte quarante euros.",
        "blocks": [
          { "f": "Ça coûte" },
          { "f": "quarante" },
          { "f": "euros." }
        ],
        "scenarioEmoji": "💶"
      },
      {
        "f": "Je peux essayer ce pantalon ?",
        "blocks": [
          { "f": "Je peux essayer" },
          { "f": "ce pantalon ?" }
        ],
        "scenarioEmoji": "👖"
      },
      {
        "f": "Ça fait cent euros, s'il vous plaît.",
        "blocks": [
          { "f": "Ça fait" },
          { "f": "cent euros," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "💳"
      },
      {
        "f": "Le pantalon est trop grand.",
        "blocks": [
          { "f": "Le pantalon" },
          { "f": "est trop" },
          { "f": "grand." }
        ]
      },
      {
        "f": "La robe est très jolie.",
        "blocks": [
          { "f": "La robe" },
          { "f": "est très" },
          { "f": "jolie." }
        ]
      },
      {
        "f": "Ce n'est pas cher du tout.",
        "blocks": [
          { "f": "Ce n'est" },
          { "f": "pas cher" },
          { "f": "du tout." }
        ]
      },
      {
        "f": "La taille est trop petite.",
        "blocks": [
          { "f": "La taille" },
          { "f": "est trop" },
          { "f": "petite." }
        ]
      },
      {
        "f": "Le magasin ferme à dix-neuf heures.",
        "blocks": [
          { "f": "Le magasin" },
          { "f": "ferme" },
          { "f": "à dix-neuf heures." }
        ]
      },
      {
        "f": "Cette veste coûte trente euros.",
        "blocks": [
          { "f": "Cette veste" },
          { "f": "coûte" },
          { "f": "trente euros." }
        ]
      },
      {
        "f": "Ces chaussures coûtent cinquante euros.",
        "blocks": [
          { "f": "Ces chaussures" },
          { "f": "coûtent" },
          { "f": "cinquante euros." }
        ]
      },
      {
        "f": "Le manteau coûte soixante-dix euros.",
        "blocks": [
          { "f": "Le manteau" },
          { "f": "coûte" },
          { "f": "soixante-dix euros." }
        ]
      },
      {
        "f": "Cette robe coûte quatre-vingts euros.",
        "blocks": [
          { "f": "Cette robe" },
          { "f": "coûte" },
          { "f": "quatre-vingts euros." }
        ]
      },
      {
        "f": "Ce sac coûte quatre-vingt-dix euros.",
        "blocks": [
          { "f": "Ce sac" },
          { "f": "coûte" },
          { "f": "quatre-vingt-dix euros." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Bonjour, je cherche une robe." },
        { "f": "Quelle taille faites-vous ?" },
        { "f": "Je fais du 38. Ça coûte combien ?" },
        { "f": "Elle coûte soixante euros." },
        { "f": "Parfait, je la prends !" }
      ]
    }
  },
  {
    "id": "A1-g10",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "J'ai trente ans." },
            { "f": "Ça coûte soixante euros." }
          ]
        },
        {
          "examples": [
            { "f": "Il a soixante-dix ans." },
            { "f": "Ça fait soixante-quinze euros." }
          ]
        },
        {
          "examples": [
            { "f": "Elle a quatre-vingts ans." },
            { "f": "Il y a quatre-vingt-trois personnes." }
          ]
        },
        {
          "examples": [
            { "f": "Mon grand-père a quatre-vingt-dix ans." },
            { "f": "Ça coûte quatre-vingt-dix-neuf euros." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "soixante-dix (60+10)" },
              { "form": "soixante et onze (60+11)" },
              { "form": "quatre-vingts (4×20)" },
              { "form": "quatre-vingt-un (4×20+1)" },
              { "form": "quatre-vingt-dix (4×20+10)" },
              { "form": "quatre-vingt-onze (4×20+11)" },
              { "form": "quatre-vingt-dix-neuf (4×20+19)" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        {
          "answer": "soixante-dix",
          "alt": ["septante"]
        },
        {
          "answer": "soixante et onze",
          "alt": ["septante et un"]
        },
        {
          "answer": "quatre-vingts",
          "alt": ["huitante"]
        },
        {
          "answer": "quatre-vingt-un",
          "alt": ["huitante et un", "huitante-et-un"]
        },
        {
          "answer": "quatre-vingt-dix",
          "alt": ["nonante"]
        },
        {
          "answer": "quatre-vingt-dix-neuf",
          "alt": ["nonante-neuf"]
        }
      ]
    }
  },
  {
    "id": "A1-11",
    "level": "A1",
    "lessons": [
      {
        "id": "carne-frango-legumes",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "salada-arroz-massa",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "acucar-sal-ovo-sobremesa",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "negation-partitif",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "f": "la viande" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "le-marche-tradicao",
        "kind": "culture",
        "category": "costume",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "le marché" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "la viande" },
      { "f": "le poulet" },
      { "f": "les légumes" },
      { "f": "la salade" },
      { "f": "le riz" },
      { "f": "les pâtes" },
      { "f": "le sucre" },
      { "f": "le sel" },
      { "f": "l'œuf" },
      { "f": "le dessert" }
    ],
    "phrases": [
      {
        "f": "J'aime la viande.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "la viande." }
        ],
        "scenarioEmoji": "🥩"
      },
      {
        "f": "Je mange des légumes tous les jours.",
        "blocks": [
          { "f": "Je mange" },
          { "f": "des légumes" },
          { "f": "tous les jours." }
        ],
        "scenarioEmoji": "🥦"
      },
      {
        "f": "Je ne mange pas de viande.",
        "blocks": [
          { "f": "Je ne mange pas" },
          { "f": "de viande." }
        ],
        "scenarioEmoji": "🚫"
      },
      {
        "f": "Je prends du riz et des pâtes.",
        "blocks": [
          { "f": "Je prends" },
          { "f": "du riz" },
          { "f": "et des pâtes." }
        ],
        "scenarioEmoji": "🍚"
      },
      {
        "f": "Le poulet est délicieux ce soir.",
        "blocks": [
          { "f": "Le poulet" },
          { "f": "est délicieux" },
          { "f": "ce soir." }
        ]
      },
      {
        "f": "Les légumes sont bons pour la santé.",
        "blocks": [
          { "f": "Les légumes" },
          { "f": "sont bons" },
          { "f": "pour la santé." }
        ]
      },
      {
        "f": "La salade est fraîche.",
        "blocks": [
          { "f": "La salade" },
          { "f": "est fraîche." }
        ]
      },
      {
        "f": "Le riz et les pâtes sont mes plats préférés.",
        "blocks": [
          { "f": "Le riz" },
          { "f": "et les pâtes" },
          { "f": "sont mes plats préférés." }
        ]
      },
      {
        "f": "Le sucre et le sel sont sur la table.",
        "blocks": [
          { "f": "Le sucre" },
          { "f": "et le sel" },
          { "f": "sont sur la table." }
        ]
      },
      {
        "f": "L'œuf est cuit.",
        "blocks": [
          { "f": "L'œuf" },
          { "f": "est cuit." }
        ]
      },
      {
        "f": "Le dessert est prêt.",
        "blocks": [
          { "f": "Le dessert" },
          { "f": "est prêt." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Qu'est-ce qu'on achète ?" },
        { "f": "Du riz, des légumes et du poulet." },
        { "f": "Tu veux un dessert ?" },
        { "f": "Oui, avec du sucre, s'il te plaît !" }
      ]
    }
  },
  {
    "id": "A1-12",
    "level": "A1",
    "lessons": [
      {
        "id": "quilo-meio-quilo-litro",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "grama-pouco-muito",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "suficiente-demais-fatia-garrafa",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "de-quantite",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "f": "un kilo (de)" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "un kilo (de)" },
      { "f": "un demi-kilo" },
      { "f": "un litre" },
      { "f": "un gramme" },
      { "f": "un peu de" },
      { "f": "beaucoup de" },
      { "f": "assez de" },
      { "f": "trop de" },
      { "f": "une tranche (de)" },
      { "f": "une bouteille (de)" }
    ],
    "phrases": [
      {
        "f": "Je prends un kilo de pommes.",
        "blocks": [
          { "f": "Je prends" },
          { "f": "un kilo" },
          { "f": "de pommes." }
        ],
        "scenarioEmoji": "🍎"
      },
      {
        "f": "Un litre de lait, s'il vous plaît.",
        "blocks": [
          { "f": "Un litre" },
          { "f": "de lait," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "🥛"
      },
      {
        "f": "C'est trop de sucre pour moi.",
        "blocks": [
          { "f": "C'est trop" },
          { "f": "de sucre" },
          { "f": "pour moi." }
        ],
        "scenarioEmoji": "🍬"
      },
      {
        "f": "Une tranche de pain, s'il te plaît.",
        "blocks": [
          { "f": "Une tranche" },
          { "f": "de pain," },
          { "f": "s'il te plaît." }
        ],
        "scenarioEmoji": "🍞"
      },
      {
        "f": "Un gramme, c'est très peu.",
        "blocks": [
          { "f": "Un gramme," },
          { "f": "c'est très" },
          { "f": "peu." }
        ]
      },
      {
        "f": "Il y a beaucoup de monde ici.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "beaucoup de" },
          { "f": "monde ici." }
        ]
      },
      {
        "f": "Je n'ai pas assez de temps.",
        "blocks": [
          { "f": "Je n'ai pas" },
          { "f": "assez de" },
          { "f": "temps." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Vous voulez combien de pommes ?" },
        { "f": "Un demi-kilo, s'il vous plaît." },
        { "f": "Et avec ça ?" },
        { "f": "Une bouteille d'eau et un peu de fromage." }
      ]
    }
  },
  {
    "id": "A1-13",
    "level": "A1",
    "lessons": [
      {
        "id": "tempo-bonito-frio-quente",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "chuva-neve-sol",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "estacoes-do-ano",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "il-fait-vs-jai",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "il fait chaud" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "Il fait très chaud aujourd'hui.", "emoji": "☀️", "answer": false }
    ],
    "vocab": [
      { "f": "il fait beau" },
      { "f": "il fait froid" },
      { "f": "il fait chaud" },
      { "f": "il pleut" },
      { "f": "il neige" },
      { "f": "le soleil" },
      { "f": "le printemps" },
      { "f": "l'été" },
      { "f": "l'automne" },
      { "f": "l'hiver" }
    ],
    "phrases": [
      {
        "f": "Quel temps fait-il ?",
        "blocks": [
          { "f": "Quel temps" },
          { "f": "fait-il ?" }
        ],
        "scenarioEmoji": "🌦️"
      },
      {
        "f": "Il fait très chaud aujourd'hui.",
        "blocks": [
          { "f": "Il fait" },
          { "f": "très chaud" },
          { "f": "aujourd'hui." }
        ],
        "scenarioEmoji": "☀️"
      },
      {
        "f": "J'aime l'hiver.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "l'hiver." }
        ],
        "scenarioEmoji": "❄️"
      },
      {
        "f": "Il pleut souvent en automne.",
        "blocks": [
          { "f": "Il pleut" },
          { "f": "souvent" },
          { "f": "en automne." }
        ],
        "scenarioEmoji": "🍂"
      },
      {
        "f": "Il neige beaucoup en hiver.",
        "blocks": [
          { "f": "Il neige" },
          { "f": "beaucoup" },
          { "f": "en hiver." }
        ]
      },
      {
        "f": "Le soleil brille aujourd'hui.",
        "blocks": [
          { "f": "Le soleil" },
          { "f": "brille" },
          { "f": "aujourd'hui." }
        ]
      },
      {
        "f": "Le printemps est ma saison préférée.",
        "blocks": [
          { "f": "Le printemps" },
          { "f": "est ma saison" },
          { "f": "préférée." }
        ]
      },
      {
        "f": "L'automne est très coloré.",
        "blocks": [
          { "f": "L'automne" },
          { "f": "est très" },
          { "f": "coloré." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Quel temps fait-il aujourd'hui ?" },
        { "f": "Il fait beau, mais il fait froid." },
        { "f": "Tu préfères quelle saison ?" },
        { "f": "Je préfère l'été, il fait chaud." }
      ]
    }
  },
  {
    "id": "A1-14",
    "level": "A1",
    "lessons": [
      {
        "id": "onibus-trem-metro",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "carro-bicicleta-pe",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "pegar-transporte-passagem",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "en-vs-a-transport",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "f": "le métro" },
              { "f": "à pied" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "metro-paris-historia",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "le métro" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "le bus" },
      { "f": "le train" },
      { "f": "le métro" },
      { "f": "la voiture" },
      { "f": "le vélo" },
      { "f": "à pied" },
      { "f": "prendre" },
      { "f": "l'arrêt" },
      { "f": "le billet" },
      { "f": "la station" }
    ],
    "phrases": [
      {
        "f": "Je prends le métro tous les jours.",
        "blocks": [
          { "f": "Je prends" },
          { "f": "le métro" },
          { "f": "tous les jours." }
        ],
        "scenarioEmoji": "🚇"
      },
      {
        "f": "Où est l'arrêt de bus ?",
        "blocks": [
          { "f": "Où est" },
          { "f": "l'arrêt" },
          { "f": "de bus ?" }
        ],
        "scenarioEmoji": "🚌"
      },
      {
        "f": "Un billet, s'il vous plaît.",
        "blocks": [
          { "f": "Un billet," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "🎫"
      },
      {
        "f": "Je vais au travail à pied.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "au travail" },
          { "f": "à pied." }
        ],
        "scenarioEmoji": "🚶"
      },
      {
        "f": "Je vais prendre le bus ce matin.",
        "blocks": [
          { "f": "Je vais prendre" },
          { "f": "le bus" },
          { "f": "ce matin." }
        ]
      },
      {
        "f": "Le train part à huit heures.",
        "blocks": [
          { "f": "Le train" },
          { "f": "part" },
          { "f": "à huit heures." }
        ]
      },
      {
        "f": "La voiture est garée devant la maison.",
        "blocks": [
          { "f": "La voiture" },
          { "f": "est garée" },
          { "f": "devant la maison." }
        ]
      },
      {
        "f": "Le vélo est plus rapide en ville.",
        "blocks": [
          { "f": "Le vélo" },
          { "f": "est plus rapide" },
          { "f": "en ville." }
        ]
      },
      {
        "f": "La station est fermée aujourd'hui.",
        "blocks": [
          { "f": "La station" },
          { "f": "est fermée" },
          { "f": "aujourd'hui." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Excusez-moi, ce train va au centre-ville ?" },
        { "f": "Oui, c'est la bonne direction." },
        { "f": "Combien coûte le billet ?" },
        { "f": "Ça coûte deux euros." }
      ]
    }
  },
  {
    "id": "A1-g5",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "Il fait 30 degrés aujourd'hui." },
            { "f": "Que fais-tu ce soir ?" }
          ]
        },
        {
          "examples": [
            { "f": "Je prends souvent le métro." },
            { "f": "Tu prends un café ?" }
          ]
        },
        {
          "examples": [
            { "f": "Nous prenons le bus ensemble." },
            { "f": "Vous faites quoi ce week-end ?" }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "fais" },
              { "form": "fais" },
              { "form": "fait" },
              { "form": "faisons" },
              { "form": "faites" },
              { "form": "font" }
            ],
            "1": [
              { "form": "prends" },
              { "form": "prends" },
              { "form": "prend" },
              { "form": "prenons" },
              { "form": "prenez" },
              { "form": "prennent" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "fait" },
        { "answer": "prends" },
        { "answer": "faisons" },
        { "answer": "prenez" },
        { "answer": "prennent" },
        { "answer": "fais" }
      ]
    }
  },
  {
    "id": "A1-15",
    "level": "A1",
    "lessons": [
      {
        "id": "cabeca-barriga-mao",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "pe-doente-medico",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "farmacia-dor-febre",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "avoir-mal-vs-etre-malade",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "f": "la tête" },
              { "f": "malade" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "quest-ce-qui-ne-va-pas-ca-va-pas",
        "kind": "reality",
        "category": "informal",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "ça va pas ?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "J'ai mal à la tête.", "emoji": "🤕", "answer": true }
    ],
    "vocab": [
      { "f": "la tête" },
      { "f": "le ventre" },
      { "f": "la main" },
      { "f": "le pied" },
      { "f": "malade" },
      { "f": "le médecin" },
      { "f": "la pharmacie" },
      { "f": "avoir mal" },
      { "f": "la fièvre" },
      { "f": "se sentir" }
    ],
    "phrases": [
      {
        "f": "J'ai mal à la tête.",
        "blocks": [
          { "f": "J'ai mal" },
          { "f": "à la tête." }
        ],
        "scenarioEmoji": "🤕"
      },
      {
        "f": "Je me sens malade.",
        "blocks": [
          { "f": "Je me sens" },
          { "f": "malade." }
        ],
        "scenarioEmoji": "🤒"
      },
      {
        "f": "Où est la pharmacie ?",
        "blocks": [
          { "f": "Où est" },
          { "f": "la pharmacie ?" }
        ],
        "scenarioEmoji": "💊"
      },
      {
        "f": "Il a de la fièvre.",
        "blocks": [
          { "f": "Il a" },
          { "f": "de la fièvre." }
        ],
        "scenarioEmoji": "🌡️"
      },
      {
        "f": "Le ventre me fait mal.",
        "blocks": [
          { "f": "Le ventre" },
          { "f": "me fait" },
          { "f": "mal." }
        ]
      },
      {
        "f": "La main est blessée.",
        "blocks": [
          { "f": "La main" },
          { "f": "est blessée." }
        ]
      },
      {
        "f": "Le pied me fait mal aussi.",
        "blocks": [
          { "f": "Le pied" },
          { "f": "me fait mal" },
          { "f": "aussi." }
        ]
      },
      {
        "f": "Le médecin arrive dans dix minutes.",
        "blocks": [
          { "f": "Le médecin" },
          { "f": "arrive" },
          { "f": "dans dix minutes." }
        ]
      },
      {
        "f": "Je vais avoir mal à la tête si ça continue.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "avoir mal" },
          { "f": "à la tête si ça continue." }
        ]
      },
      {
        "f": "Il ne va pas se sentir bien demain.",
        "blocks": [
          { "f": "Il ne va pas" },
          { "f": "se sentir bien" },
          { "f": "demain." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Qu'est-ce qui ne va pas ?" },
        { "f": "J'ai mal au ventre et j'ai de la fièvre." },
        { "f": "Depuis quand ?" },
        { "f": "Depuis hier soir." },
        { "f": "Vous devez vous reposer." }
      ]
    }
  },
  {
    "id": "A1-g6",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "Tu veux un dessert ?" },
            { "f": "Je peux essayer cette robe ?" }
          ]
        },
        {
          "examples": [
            { "f": "Vous devez vous reposer." },
            { "f": "Je sais parler français." }
          ]
        },
        {
          "examples": [
            { "f": "Il faut dormir huit heures." },
            { "f": "Tu dois te reposer." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "veux" },
              { "form": "veux" },
              { "form": "veut" },
              { "form": "voulons" },
              { "form": "voulez" },
              { "form": "veulent" }
            ],
            "1": [
              { "form": "peux" },
              { "form": "peux" },
              { "form": "peut" },
              { "form": "pouvons" },
              { "form": "pouvez" },
              { "form": "peuvent" }
            ],
            "2": [
              { "form": "dois" },
              { "form": "dois" },
              { "form": "doit" },
              { "form": "devons" },
              { "form": "devez" },
              { "form": "doivent" }
            ],
            "3": [
              { "form": "sais" },
              { "form": "sais" },
              { "form": "sait" },
              { "form": "savons" },
              { "form": "savez" },
              { "form": "savent" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "veux" },
        { "answer": "peux" },
        { "answer": "devons" },
        { "answer": "sait" },
        { "answer": "faut" },
        { "answer": "voulez" },
        { "answer": "peuvent" },
        { "answer": "sais" }
      ]
    }
  },
  {
    "id": "A1-16",
    "level": "A1",
    "lessons": [
      {
        "id": "vermelho-azul-verde",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "amarelo-preto-branco",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "tamanho-e-personalidade",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "adjective-placement",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "f": "rouge" },
              { "f": "joli" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "gentil-sympa",
        "kind": "reality",
        "category": "informal",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "sympa" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "bandeira-tricolor-historia",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "f": "le drapeau" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "rouge" },
      { "f": "bleu" },
      { "f": "vert" },
      { "f": "jaune" },
      { "f": "noir" },
      { "f": "blanc" },
      { "f": "grand" },
      { "f": "petit" },
      { "f": "joli" },
      { "f": "gentil" }
    ],
    "phrases": [
      {
        "f": "J'aime la couleur bleue.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "la couleur" },
          { "f": "bleue." }
        ],
        "scenarioEmoji": "🔵"
      },
      {
        "f": "Elle est très gentille.",
        "blocks": [
          { "f": "Elle est" },
          { "f": "très" },
          { "f": "gentille." }
        ],
        "scenarioEmoji": "😊"
      },
      {
        "f": "Mon chat est noir et blanc.",
        "blocks": [
          { "f": "Mon chat" },
          { "f": "est noir" },
          { "f": "et blanc." }
        ],
        "scenarioEmoji": "🐱"
      },
      {
        "f": "C'est une jolie robe rouge.",
        "blocks": [
          { "f": "C'est" },
          { "f": "une jolie robe" },
          { "f": "rouge." }
        ],
        "scenarioEmoji": "👗"
      },
      {
        "f": "Le pull est vert et jaune.",
        "blocks": [
          { "f": "Le pull" },
          { "f": "est vert" },
          { "f": "et jaune." }
        ]
      },
      {
        "f": "Le chien est petit.",
        "blocks": [
          { "f": "Le chien" },
          { "f": "est petit." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Comment est ton frère ?" },
        { "f": "Il est grand et il a les cheveux noirs." },
        { "f": "Il est sympa ?" },
        { "f": "Oui, il est très gentil !" }
      ]
    }
  },
  {
    "id": "A1-g7",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "Mon frère est plus grand que moi." },
            { "f": "Cette robe est plus jolie que l'autre." }
          ]
        },
        {
          "examples": [
            { "f": "Elle est moins grande que lui." },
            { "f": "Il est aussi gentil que son frère." }
          ]
        },
        {
          "examples": [
            { "f": "Ce gâteau est meilleur que l'autre." },
            { "f": "Elle chante mieux que moi." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "plus ... que" },
              { "form": "moins ... que" },
              { "form": "aussi ... que" },
              { "form": "meilleur" },
              { "form": "mieux" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "plus" },
        { "answer": "moins" },
        { "answer": "aussi" },
        { "answer": "meilleur" },
        { "answer": "aussi" },
        { "answer": "moins" }
      ]
    }
  },
  {
    "id": "A1-17",
    "level": "A1",
    "lessons": [
      {
        "id": "casa-apartamento-quarto",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "cozinha-banheiro-sala",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "porta-janela-tem-nao-tem",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "il-y-a-vs-negation",
        "trigger": { "afterVocabIdx": 9 },
        "blocks": [
          {
            "examples": [
              { "f": "il y a" },
              { "f": "il n'y a pas de" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "il-y-a-ya",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "afterVocabIdx": 8 },
        "blocks": [
          {
            "examples": [
              { "f": "y'a une chambre" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "andar-terreo-premier-etage",
        "kind": "culture",
        "category": "costume",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "le rez-de-chaussée" },
              { "f": "le premier étage" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "la maison" },
      { "f": "l'appartement" },
      { "f": "la chambre" },
      { "f": "la cuisine" },
      { "f": "la salle de bain" },
      { "f": "le salon" },
      { "f": "la porte" },
      { "f": "la fenêtre" },
      { "f": "il y a" },
      { "f": "il n'y a pas de" }
    ],
    "phrases": [
      {
        "f": "Il y a une chambre.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "une chambre." }
        ],
        "scenarioEmoji": "🛏️"
      },
      {
        "f": "Il y a deux salles de bain.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "deux" },
          { "f": "salles de bain." }
        ],
        "scenarioEmoji": "🚿"
      },
      {
        "f": "Il n'y a pas de jardin.",
        "blocks": [
          { "f": "Il n'y a pas" },
          { "f": "de jardin." }
        ],
        "scenarioEmoji": "🚫"
      },
      {
        "f": "C'est une grande maison.",
        "blocks": [
          { "f": "C'est" },
          { "f": "une grande" },
          { "f": "maison." }
        ],
        "scenarioEmoji": "🏠"
      },
      {
        "f": "La maison est très grande.",
        "blocks": [
          { "f": "La maison" },
          { "f": "est très" },
          { "f": "grande." }
        ]
      },
      {
        "f": "L'appartement a deux chambres.",
        "blocks": [
          { "f": "L'appartement" },
          { "f": "a deux" },
          { "f": "chambres." }
        ]
      },
      {
        "f": "La chambre est au premier étage.",
        "blocks": [
          { "f": "La chambre" },
          { "f": "est au" },
          { "f": "premier étage." }
        ]
      },
      {
        "f": "La cuisine est très propre.",
        "blocks": [
          { "f": "La cuisine" },
          { "f": "est très" },
          { "f": "propre." }
        ]
      },
      {
        "f": "La salle de bain est à côté de la chambre.",
        "blocks": [
          { "f": "La salle de bain" },
          { "f": "est à côté" },
          { "f": "de la chambre." }
        ]
      },
      {
        "f": "Le salon est confortable.",
        "blocks": [
          { "f": "Le salon" },
          { "f": "est confortable." }
        ]
      },
      {
        "f": "La porte est fermée à clé.",
        "blocks": [
          { "f": "La porte" },
          { "f": "est fermée" },
          { "f": "à clé." }
        ]
      },
      {
        "f": "La fenêtre donne sur le jardin.",
        "blocks": [
          { "f": "La fenêtre" },
          { "f": "donne sur" },
          { "f": "le jardin." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Il y a combien de chambres ?" },
        { "f": "Il y a deux chambres et une cuisine." },
        { "f": "Il y a un balcon ?" },
        { "f": "Non, il n'y a pas de balcon, mais il y a un beau salon." }
      ]
    }
  },
  {
    "id": "A1-18",
    "level": "A1",
    "lessons": [
      {
        "id": "cama-mesa-cadeira",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "sofa-luminaria-em-cima",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "embaixo-frente-atras-lado",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "sur-vs-dans",
        "trigger": { "afterVocabIdx": 5 },
        "blocks": [
          {
            "examples": [
              { "f": "sur" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "le lit" },
      { "f": "la table" },
      { "f": "la chaise" },
      { "f": "le canapé" },
      { "f": "la lampe" },
      { "f": "sur" },
      { "f": "sous" },
      { "f": "devant" },
      { "f": "derrière" },
      { "f": "à côté de" }
    ],
    "phrases": [
      {
        "f": "Le lit est à côté de la fenêtre.",
        "blocks": [
          { "f": "Le lit" },
          { "f": "est à côté de" },
          { "f": "la fenêtre." }
        ],
        "scenarioEmoji": "🛏️"
      },
      {
        "f": "Il y a une lampe sur la table.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "une lampe" },
          { "f": "sur la table." }
        ],
        "scenarioEmoji": "💡"
      },
      {
        "f": "Le chat est sous le canapé.",
        "blocks": [
          { "f": "Le chat" },
          { "f": "est sous" },
          { "f": "le canapé." }
        ],
        "scenarioEmoji": "🐈"
      },
      {
        "f": "La chaise bleue est devant la table.",
        "blocks": [
          { "f": "La chaise bleue" },
          { "f": "est devant" },
          { "f": "la table." }
        ],
        "scenarioEmoji": "🪑"
      },
      {
        "f": "Le chat est derrière la chaise.",
        "blocks": [
          { "f": "Le chat" },
          { "f": "est derrière" },
          { "f": "la chaise." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Où est mon sac ?" },
        { "f": "Il est sous le lit." },
        { "f": "Et mes clés ?" },
        { "f": "Elles sont sur la table, à côté de la lampe." }
      ]
    }
  },
  {
    "id": "A1-19",
    "level": "A1",
    "lessons": [
      {
        "id": "cinema-musica-esporte",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "ler-jogar-dancar",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "cantar-fim-de-semana-sair-filme",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "jouer-de-vs-jouer-a",
        "trigger": { "afterVocabIdx": 4 },
        "blocks": [
          {
            "examples": [
              { "f": "jouer" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "cinema-nasceu-na-franca",
        "kind": "culture",
        "category": "historia",
        "trigger": { "afterVocabIdx": 0 },
        "blocks": [
          {
            "examples": [
              { "f": "le cinéma" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "ne-drop-on-sait-pas",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "on sait pas encore" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "trueFalseExercises": [
      { "subject": "On va au cinéma ce soir ?", "emoji": "🎬", "answer": true }
    ],
    "vocab": [
      { "f": "le cinéma" },
      { "f": "la musique" },
      { "f": "le sport" },
      { "f": "lire" },
      { "f": "jouer" },
      { "f": "danser" },
      { "f": "chanter" },
      { "f": "le week-end" },
      { "f": "sortir" },
      { "f": "le film" }
    ],
    "phrases": [
      {
        "f": "Qu'est-ce que tu fais le week-end ?",
        "blocks": [
          { "f": "Qu'est-ce que" },
          { "f": "tu fais" },
          { "f": "le week-end ?" }
        ],
        "scenarioEmoji": "🎨"
      },
      {
        "f": "J'aime lire des livres.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "lire" },
          { "f": "des livres." }
        ],
        "scenarioEmoji": "📚"
      },
      {
        "f": "On va au cinéma ce soir ?",
        "blocks": [
          { "f": "On va" },
          { "f": "au cinéma" },
          { "f": "ce soir ?" }
        ],
        "scenarioEmoji": "🎬"
      },
      {
        "f": "Il joue de la guitare.",
        "blocks": [
          { "f": "Il joue" },
          { "f": "de la guitare." }
        ],
        "scenarioEmoji": "🎸"
      },
      {
        "f": "Le cinéma est fermé ce soir.",
        "blocks": [
          { "f": "Le cinéma" },
          { "f": "est fermé" },
          { "f": "ce soir." }
        ]
      },
      {
        "f": "J'adore écouter de la musique.",
        "blocks": [
          { "f": "J'adore" },
          { "f": "écouter" },
          { "f": "de la musique." }
        ]
      },
      {
        "f": "Le sport est bon pour la santé.",
        "blocks": [
          { "f": "Le sport" },
          { "f": "est bon" },
          { "f": "pour la santé." }
        ]
      },
      {
        "f": "Les enfants aiment jouer dehors.",
        "blocks": [
          { "f": "Les enfants" },
          { "f": "aiment jouer" },
          { "f": "dehors." }
        ]
      },
      {
        "f": "Elle adore danser et chanter.",
        "blocks": [
          { "f": "Elle adore" },
          { "f": "danser" },
          { "f": "et chanter." }
        ]
      },
      {
        "f": "On va sortir samedi soir.",
        "blocks": [
          { "f": "On va" },
          { "f": "sortir" },
          { "f": "samedi soir." }
        ]
      },
      {
        "f": "Le film commence à vingt heures.",
        "blocks": [
          { "f": "Le film" },
          { "f": "commence" },
          { "f": "à vingt heures." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Tu as des projets pour le week-end ?" },
        { "f": "Oui, je vais au cinéma avec des amis." },
        { "f": "Quel film vous allez voir ?" },
        { "f": "On ne sait pas encore !" }
      ]
    }
  },
  {
    "id": "A1-g8",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "Je lis toujours le soir." },
            { "f": "Elle joue parfois de la guitare." }
          ]
        },
        {
          "examples": [
            { "f": "Nous sortons souvent le week-end." },
            { "f": "Il chante rarement." }
          ]
        },
        {
          "examples": [
            { "f": "Je ne danse jamais." },
            { "f": "Il ne sort jamais le lundi." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "toujours" },
              { "form": "souvent" },
              { "form": "parfois" },
              { "form": "rarement" },
              { "form": "ne ... jamais" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "toujours" },
        { "answer": "parfois" },
        { "answer": "souvent" },
        { "answer": "jamais" },
        { "answer": "rarement" },
        { "answer": "toujours" }
      ]
    }
  },
  {
    "id": "A1-20",
    "level": "A1",
    "lessons": [
      {
        "id": "ontem-anteontem-semana-passada",
        "vocabIdx": [0, 1, 2]
      },
      {
        "id": "fim-de-semana-mes-ano-passados",
        "vocabIdx": [3, 4, 5]
      },
      {
        "id": "dois-dias-atras-ja-recentemente",
        "vocabIdx": [6, 7, 8, 9],
        "includesDialogue": true
      },
      {
        "id": "checkpoint",
        "vocabIdx": [],
        "isCheckpoint": true
      }
    ],
    "concepts": [
      {
        "id": "hier-vs-semaine-derniere",
        "trigger": { "afterVocabIdx": 2 },
        "blocks": [
          {
            "examples": [
              { "f": "hier" },
              { "f": "la semaine dernière" }
            ],
            "wrapup": true
          }
        ]
      },
      {
        "id": "quest-ce-que-tu-as-fait-wh-in-situ",
        "kind": "reality",
        "category": "gramatica-coloquial",
        "trigger": { "after": "dialogue" },
        "blocks": [
          {
            "examples": [
              { "f": "t'as fait quoi hier ?" }
            ],
            "wrapup": true
          }
        ]
      }
    ],
    "vocab": [
      { "f": "hier" },
      { "f": "avant-hier" },
      { "f": "la semaine dernière" },
      { "f": "le week-end dernier" },
      { "f": "le mois dernier" },
      { "f": "l'année dernière" },
      { "f": "il y a deux jours" },
      { "f": "ce matin" },
      { "f": "déjà" },
      { "f": "récemment" }
    ],
    "phrases": [
      {
        "f": "Hier, j'ai visité un musée.",
        "blocks": [
          { "f": "Hier," },
          { "f": "j'ai visité" },
          { "f": "un musée." }
        ],
        "scenarioEmoji": "🖼️"
      },
      {
        "f": "La semaine dernière, j'ai mangé au restaurant.",
        "blocks": [
          { "f": "La semaine dernière," },
          { "f": "j'ai mangé" },
          { "f": "au restaurant." }
        ],
        "scenarioEmoji": "🍽️"
      },
      {
        "f": "Le week-end dernier, il a plu.",
        "blocks": [
          { "f": "Le week-end dernier," },
          { "f": "il a plu." }
        ],
        "scenarioEmoji": "🌧️"
      },
      {
        "f": "Tu as déjà visité Paris ?",
        "blocks": [
          { "f": "Tu as déjà" },
          { "f": "visité Paris ?" }
        ],
        "scenarioEmoji": "🗼"
      },
      {
        "f": "Avant-hier, j'ai visité Paris.",
        "blocks": [
          { "f": "Avant-hier," },
          { "f": "j'ai visité" },
          { "f": "Paris." }
        ]
      },
      {
        "f": "Le mois dernier, j'ai voyagé en France.",
        "blocks": [
          { "f": "Le mois dernier," },
          { "f": "j'ai voyagé" },
          { "f": "en France." }
        ]
      },
      {
        "f": "L'année dernière, j'ai appris le français.",
        "blocks": [
          { "f": "L'année dernière," },
          { "f": "j'ai appris" },
          { "f": "le français." }
        ]
      },
      {
        "f": "Il y a deux jours, il a plu.",
        "blocks": [
          { "f": "Il y a deux jours," },
          { "f": "il a plu." }
        ]
      },
      {
        "f": "Ce matin, j'ai bu un café.",
        "blocks": [
          { "f": "Ce matin," },
          { "f": "j'ai bu" },
          { "f": "un café." }
        ]
      },
      {
        "f": "Récemment, j'ai changé de travail.",
        "blocks": [
          { "f": "Récemment," },
          { "f": "j'ai changé" },
          { "f": "de travail." }
        ]
      }
    ],
    "dialogue": {
      "lines": [
        { "f": "Qu'est-ce que tu as fait hier ?" },
        { "f": "J'ai travaillé le matin, et l'après-midi j'ai fait du sport." },
        { "f": "Et le week-end dernier ?" },
        { "f": "On est allés au cinéma avec des amis." }
      ]
    }
  },
  {
    "id": "A1-g9",
    "level": "A1",
    "type": "grammar",
    "grammar": {
      "blocks": [
        {
          "examples": [
            { "f": "J'ai mangé au restaurant." },
            { "f": "Elle a travaillé toute la journée." }
          ]
        },
        {
          "examples": [
            { "f": "J'ai fait du sport hier." },
            { "f": "Il a pris le train." }
          ]
        },
        {
          "examples": [
            { "f": "Elle est allée au marché." },
            { "f": "Je me suis levé tôt." }
          ]
        },
        {
          "examples": [],
          "table": {
            "0": [
              { "form": "j'ai mangé" },
              { "form": "j'ai fait" },
              { "form": "j'ai pris" }
            ],
            "1": [
              { "form": "je suis allé(e)" },
              { "form": "je suis arrivé(e)" },
              { "form": "je me suis levé(e)" }
            ]
          },
          "wrapup": true
        }
      ],
      "exercises": [
        { "answer": "ai" },
        { "answer": "as" },
        { "answer": "a" },
        { "answer": "avons" },
        { "answer": "est" },
        { "answer": "suis" },
        { "answer": "ont" },
        { "answer": "êtes" }
      ]
    }
  }
];

const MODULES = [
  {
    "id": "A1-m1",
    "level": "A1",
    "unitIds": ["A1-1", "A1-2", "A1-3", "A1-g1", "A1-4", "A1-g2"]
  },
  {
    "id": "A1-m2",
    "level": "A1",
    "unitIds": ["A1-5", "A1-6", "A1-g3", "A1-7"]
  },
  {
    "id": "A1-m3",
    "level": "A1",
    "unitIds": ["A1-8", "A1-g4", "A1-9", "A1-10", "A1-g10", "A1-11", "A1-12"]
  },
  {
    "id": "A1-m4",
    "level": "A1",
    "unitIds": ["A1-13", "A1-14", "A1-g5", "A1-15", "A1-g6"]
  },
  {
    "id": "A1-m5",
    "level": "A1",
    "unitIds": ["A1-16", "A1-g7", "A1-17", "A1-18"]
  },
  {
    "id": "A1-m6",
    "level": "A1",
    "unitIds": ["A1-19", "A1-g8", "A1-20", "A1-g9"]
  }
];

const LEVEL_TESTS = [
  { "id": "A1-final", "level": "A1", "nextLevel": "A2" }
];
