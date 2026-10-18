// CONTEÚDO-BASE do curso de francês (E2 de docs/i18n/arquitetura-multi-idioma-cursos.md): só o IDIOMA ESTUDADO e a estrutura.
// O texto em língua de origem mora na CAMADA DO CURSO: courses/fr-pt-BR/layer.js (português) e fr/content.en.js (inglês).
// Ids, frases em francês (f), respostas, tipos e ordem. Sozinho NÃO é exibível: a camada carrega logo depois e se aplica sobre ele.
// Os comentários de autoria do arquivo anterior estão em docs/historico/conteudo-original/fr-<arquivo>.js.txt.
//
// CHAVE ESTÁVEL `k` (Etapa 0 de docs/i18n/curriculo/04-lacunas-e-propostas-fr.md): cada palavra (vocab), frase (phrases) e
// fala (dialogue.lines) tem uma chave congelada; o id do cartão e o progresso do aluno seguem a CHAVE, nunca a posição.
// - Nunca mudar nem reaproveitar um `k`. Item novo: rode `node fr/scripts/congelar_chaves.js` (dá a próxima chave livre).
// - Mover, reordenar ou corrigir o texto com o MESMO sentido: o item leva o `k` junto.
// - Mudou o sentido (outra palavra/frase): item novo com `k` novo; o antigo vai para STUDY_RETIRED_KEYS.
// - Fundir ou excluir: fr/curriculum-changes.js. O teste tests/curriculo-ids/test_ids_publicados.js bloqueia id perdido.

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
      { "k": "A1-1-v0", "f": "bonjour" },
      { "k": "A1-1-v1", "f": "bonsoir" },
      { "k": "A1-1-v2", "f": "au revoir" },
      { "k": "A1-1-v3", "f": "salut" },
      { "k": "A1-1-v4", "f": "merci" },
      { "k": "A1-1-v5", "f": "de rien" },
      { "k": "A1-1-v6", "f": "s'il vous plaît" },
      { "k": "A1-1-v7", "f": "pardon" },
      { "k": "A1-1-v8", "f": "ça va" },
      { "k": "A1-1-v9", "f": "à bientôt" }
    ],
    "phrases": [
      {
        "k": "A1-1-p0",
        "f": "Bonjour ! Je m'appelle {nome}.",
        "blocks": [
          { "f": "Bonjour !" },
          { "f": "Je m'appelle" },
          { "f": "{nome}." }
        ],
        "scenarioEmoji": "🎉"
      },
      {
        "k": "A1-1-p1",
        "f": "Merci beaucoup !",
        "blocks": [
          { "f": "Merci" },
          { "f": "beaucoup !" }
        ],
        "scenarioEmoji": "🛍️"
      },
      {
        "k": "A1-1-p2",
        "f": "Pardon, je ne comprends pas.",
        "blocks": [
          { "f": "Pardon," },
          { "f": "je ne" },
          { "f": "comprends pas." }
        ],
        "scenarioEmoji": "😕"
      },
      {
        "k": "A1-1-p3",
        "f": "Ça va bien, et toi ?",
        "blocks": [
          { "f": "Ça va" },
          { "f": "bien," },
          { "f": "et toi ?" }
        ],
        "scenarioEmoji": "☕"
      },
      {
        "k": "A1-1-p4",
        "f": "Bonsoir ! Comment allez-vous ?",
        "blocks": [
          { "f": "Bonsoir !" },
          { "f": "Comment allez-vous ?" }
        ]
      },
      {
        "k": "A1-1-p5",
        "f": "Au revoir, à demain !",
        "blocks": [
          { "f": "Au revoir," },
          { "f": "à demain !" }
        ]
      },
      {
        "k": "A1-1-p6",
        "f": "Salut ! Ça va bien ?",
        "blocks": [
          { "f": "Salut !" },
          { "f": "Ça va bien ?" }
        ]
      },
      {
        "k": "A1-1-p7",
        "f": "De rien, c'est normal.",
        "blocks": [
          { "f": "De rien," },
          { "f": "c'est normal." }
        ]
      },
      {
        "k": "A1-1-p8",
        "f": "Un café, s'il vous plaît.",
        "blocks": [
          { "f": "Un café," },
          { "f": "s'il vous plaît." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Léa", "e": "👩" },
        "B": { "n": "Hugo", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Bonsoir !", "S'il vous plaît !"]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["À bientôt !", "Au revoir !"]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-1-d0", "f": "Bonjour !" },
        { "k": "A1-1-d1", "f": "Bonjour ! Ça va ?" },
        { "k": "A1-1-d2", "f": "Ça va bien, merci ! Et toi ?" },
        { "k": "A1-1-d3", "f": "Ça va. À bientôt !" }
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
      { "k": "A1-2-v0", "f": "je" },
      { "k": "A1-2-v1", "f": "tu" },
      { "k": "A1-2-v2", "f": "s'appeler" },
      { "k": "A1-2-v3", "f": "le nom" },
      { "k": "A1-2-v4", "f": "être" },
      { "k": "A1-2-v5", "f": "la France" },
      { "k": "A1-2-v6", "f": "le Brésil" },
      { "k": "A1-2-v7", "f": "français / française" },
      { "k": "A1-2-v8", "f": "brésilien / brésilienne" },
      { "k": "A1-2-v9", "f": "le pays" }
    ],
    "phrases": [
      {
        "k": "A1-2-p0",
        "f": "Comment tu t'appelles ?",
        "blocks": [
          { "f": "Comment" },
          { "f": "tu" },
          { "f": "t'appelles ?" }
        ],
        "scenarioEmoji": "🤝"
      },
      {
        "k": "A1-2-p1",
        "f": "Je suis {nacionalidade}.",
        "blocks": [
          { "f": "Je" },
          { "f": "suis" },
          { "f": "{nacionalidade}." }
        ],
        "scenarioEmoji": "🇧🇷"
      },
      {
        "k": "A1-2-p2",
        "f": "Tu es de quel pays ?",
        "blocks": [
          { "f": "Tu" },
          { "f": "es de" },
          { "f": "quel pays ?" }
        ],
        "scenarioEmoji": "🌍"
      },
      {
        "k": "A1-2-p3",
        "f": "Moi aussi, je suis française !",
        "blocks": [
          { "f": "Moi aussi," },
          { "f": "je suis" },
          { "f": "française !" }
        ],
        "scenarioEmoji": "🇫🇷"
      },
      {
        "k": "A1-2-p4",
        "f": "Quel est le nom de la ville ?",
        "blocks": [
          { "f": "Quel est" },
          { "f": "le nom" },
          { "f": "de la ville ?" }
        ]
      },
      {
        "k": "A1-2-p5",
        "f": "J'aime la France.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "la France." }
        ]
      },
      {
        "k": "A1-2-p6",
        "f": "Le Brésil est très grand.",
        "blocks": [
          { "f": "Le Brésil" },
          { "f": "est très" },
          { "f": "grand." }
        ]
      },
      {
        "k": "A1-2-p7",
        "f": "Le pays est magnifique.",
        "blocks": [
          { "f": "Le pays" },
          { "f": "est magnifique." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Ana", "e": "👩" },
        "B": { "n": "Léo", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": ["Oui, je suis français.", "Non, je suis brésilien."]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": ["Je m'appelle Ana.", "Bonjour, comment tu t'appelles ?"]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-2-d0", "f": "Bonjour, comment tu t'appelles ?" },
        { "k": "A1-2-d1", "f": "Je m'appelle Léo. Et toi ?" },
        { "k": "A1-2-d2", "f": "Moi, c'est Ana. Tu es français ?" },
        { "k": "A1-2-d3", "f": "Oui, je suis français. Et toi, tu es brésilienne ?" },
        { "k": "A1-2-d4", "f": "Oui, je suis brésilienne !" }
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
      { "k": "A1-3-v0", "f": "zéro" },
      { "k": "A1-3-v1", "f": "un / une" },
      { "k": "A1-3-v2", "f": "deux" },
      { "k": "A1-3-v3", "f": "trois" },
      { "k": "A1-3-v4", "f": "dix" },
      { "k": "A1-3-v5", "f": "vingt" },
      { "k": "A1-3-v6", "f": "l'âge" },
      { "k": "A1-3-v7", "f": "avoir" },
      { "k": "A1-3-v8", "f": "ans" },
      { "k": "A1-3-v9", "f": "combien" }
    ],
    "phrases": [
      {
        "k": "A1-3-p0",
        "f": "Quel âge as-tu ?",
        "blocks": [
          { "f": "Quel âge" },
          { "f": "as-tu ?" }
        ],
        "scenarioEmoji": "🎂"
      },
      {
        "k": "A1-3-p1",
        "f": "J'ai vingt ans.",
        "blocks": [
          { "f": "J'ai" },
          { "f": "vingt" },
          { "f": "ans." }
        ],
        "scenarioEmoji": "🎈"
      },
      {
        "k": "A1-3-p2",
        "f": "Il a dix ans.",
        "blocks": [
          { "f": "Il a" },
          { "f": "dix" },
          { "f": "ans." }
        ],
        "scenarioEmoji": "👦"
      },
      {
        "k": "A1-3-p3",
        "f": "Nous sommes dix.",
        "blocks": [
          { "f": "Nous sommes" },
          { "f": "dix." }
        ],
        "scenarioEmoji": "🍽️"
      },
      {
        "k": "A1-3-p4",
        "f": "Combien ça coûte ?",
        "blocks": [
          { "f": "Combien" },
          { "f": "ça coûte ?" }
        ]
      },
      {
        "k": "A1-3-p5",
        "f": "Il fait zéro degré dehors.",
        "blocks": [
          { "f": "Il fait" },
          { "f": "zéro degré" },
          { "f": "dehors." }
        ]
      },
      {
        "k": "A1-3-p6",
        "f": "J'ai deux frères et trois sœurs.",
        "blocks": [
          { "f": "J'ai" },
          { "f": "deux frères" },
          { "f": "et trois sœurs." }
        ]
      },
      {
        "k": "A1-3-p7",
        "f": "Quel est l'âge de ton père ?",
        "blocks": [
          { "f": "Quel est" },
          { "f": "l'âge" },
          { "f": "de ton père ?" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Sophie", "e": "👩" },
        "B": { "n": "Marc", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 2,
          "bad": ["Elle a huit ans.", "Oui, merci !"]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Il a dix ans.", "Ils sont grands !"]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-3-d0", "f": "Quel âge a ta fille ?" },
        { "k": "A1-3-d1", "f": "Elle a huit ans. Et ton fils ?" },
        { "k": "A1-3-d2", "f": "Il a dix ans." },
        { "k": "A1-3-d3", "f": "Ils sont grands !" }
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
      { "k": "A1-4-v0", "f": "la famille" },
      { "k": "A1-4-v1", "f": "le père" },
      { "k": "A1-4-v2", "f": "la mère" },
      { "k": "A1-4-v3", "f": "le frère" },
      { "k": "A1-4-v4", "f": "la sœur" },
      { "k": "A1-4-v5", "f": "les parents" },
      { "k": "A1-4-v6", "f": "le fils" },
      { "k": "A1-4-v7", "f": "la fille" },
      { "k": "A1-4-v8", "f": "le mari" },
      { "k": "A1-4-v9", "f": "la femme" }
    ],
    "phrases": [
      {
        "k": "A1-4-p0",
        "f": "Voici ma famille.",
        "blocks": [
          { "f": "Voici" },
          { "f": "ma famille." }
        ],
        "scenarioEmoji": "👨‍👩‍👧‍👦"
      },
      {
        "k": "A1-4-p1",
        "f": "J'ai deux frères.",
        "blocks": [
          { "f": "J'ai" },
          { "f": "deux" },
          { "f": "frères." }
        ],
        "scenarioEmoji": "👬"
      },
      {
        "k": "A1-4-p2",
        "f": "Mon père s'appelle Marc.",
        "blocks": [
          { "f": "Mon père" },
          { "f": "s'appelle" },
          { "f": "Marc." }
        ],
        "scenarioEmoji": "👨"
      },
      {
        "k": "A1-4-p3",
        "f": "Elle est ma sœur.",
        "blocks": [
          { "f": "Elle est" },
          { "f": "ma sœur." }
        ],
        "scenarioEmoji": "👧"
      },
      {
        "k": "A1-4-p4",
        "f": "La famille est très importante.",
        "blocks": [
          { "f": "La famille" },
          { "f": "est très" },
          { "f": "importante." }
        ]
      },
      {
        "k": "A1-4-p5",
        "f": "Le père travaille en ville.",
        "blocks": [
          { "f": "Le père" },
          { "f": "travaille" },
          { "f": "en ville." }
        ]
      },
      {
        "k": "A1-4-p6",
        "f": "La mère prépare le dîner.",
        "blocks": [
          { "f": "La mère" },
          { "f": "prépare" },
          { "f": "le dîner." }
        ]
      },
      {
        "k": "A1-4-p7",
        "f": "Le frère et la sœur jouent ensemble.",
        "blocks": [
          { "f": "Le frère" },
          { "f": "et la sœur" },
          { "f": "jouent ensemble." }
        ]
      },
      {
        "k": "A1-4-p8",
        "f": "Les parents adorent leurs enfants.",
        "blocks": [
          { "f": "Les parents" },
          { "f": "adorent" },
          { "f": "leurs enfants." }
        ]
      },
      {
        "k": "A1-4-p9",
        "f": "Le fils et la fille aiment l'école.",
        "blocks": [
          { "f": "Le fils" },
          { "f": "et la fille" },
          { "f": "aiment l'école." }
        ]
      },
      {
        "k": "A1-4-p10",
        "f": "Le mari et la femme habitent à Paris.",
        "blocks": [
          { "f": "Le mari" },
          { "f": "et la femme" },
          { "f": "habitent à Paris." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Julie", "e": "👩" },
        "B": { "n": "Antoine", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 4,
          "bad": ["Il s'appelle Paul.", "Oui, j'ai une sœur."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Il a quinze ans.", "Il s'appelle Paul."]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-4-d0", "f": "Tu as des frères et sœurs ?" },
        { "k": "A1-4-d1", "f": "Oui, j'ai une sœur. Et toi ?" },
        { "k": "A1-4-d2", "f": "Moi, j'ai un frère. Il s'appelle Paul." },
        { "k": "A1-4-d3", "f": "Il a quel âge ?" },
        { "k": "A1-4-d4", "f": "Il a quinze ans." }
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
      { "k": "A1-5-v0", "f": "le pain" },
      { "k": "A1-5-v1", "f": "l'eau" },
      { "k": "A1-5-v2", "f": "le café" },
      { "k": "A1-5-v3", "f": "le lait" },
      { "k": "A1-5-v4", "f": "le fromage" },
      { "k": "A1-5-v5", "f": "la pomme" },
      { "k": "A1-5-v6", "f": "le poisson" },
      { "k": "A1-5-v7", "f": "manger" },
      { "k": "A1-5-v8", "f": "boire" },
      { "k": "A1-5-v9", "f": "détester" }
    ],
    "phrases": [
      {
        "k": "A1-5-p0",
        "f": "Je mange du pain le matin.",
        "blocks": [
          { "f": "Je mange" },
          { "f": "du pain" },
          { "f": "le matin." }
        ],
        "scenarioEmoji": "🥖"
      },
      {
        "k": "A1-5-p1",
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
        "k": "A1-5-p2",
        "f": "Tu bois du café ou du lait ?",
        "blocks": [
          { "f": "Tu bois" },
          { "f": "du café" },
          { "f": "ou du lait ?" }
        ],
        "scenarioEmoji": "☕"
      },
      {
        "k": "A1-5-p3",
        "f": "L'addition, s'il vous plaît.",
        "blocks": [
          { "f": "L'addition," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "🧾"
      },
      {
        "k": "A1-5-p4",
        "f": "Le pain est délicieux.",
        "blocks": [
          { "f": "Le pain" },
          { "f": "est délicieux." }
        ]
      },
      {
        "k": "A1-5-p5",
        "f": "Je voudrais de l'eau, s'il vous plaît.",
        "blocks": [
          { "f": "Je voudrais" },
          { "f": "de l'eau," },
          { "f": "s'il vous plaît." }
        ]
      },
      {
        "k": "A1-5-p6",
        "f": "Le café est très chaud.",
        "blocks": [
          { "f": "Le café" },
          { "f": "est très" },
          { "f": "chaud." }
        ]
      },
      {
        "k": "A1-5-p7",
        "f": "Le lait est dans le frigo.",
        "blocks": [
          { "f": "Le lait" },
          { "f": "est dans" },
          { "f": "le frigo." }
        ]
      },
      {
        "k": "A1-5-p8",
        "f": "La pomme est rouge et sucrée.",
        "blocks": [
          { "f": "La pomme" },
          { "f": "est rouge" },
          { "f": "et sucrée." }
        ]
      },
      {
        "k": "A1-5-p9",
        "f": "J'aime manger le matin.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "manger" },
          { "f": "le matin." }
        ]
      },
      {
        "k": "A1-5-p10",
        "f": "Tu veux boire quelque chose ?",
        "blocks": [
          { "f": "Tu veux" },
          { "f": "boire" },
          { "f": "quelque chose ?" }
        ]
      },
      {
        "k": "A1-5-p11",
        "f": "Je vais détester ce plat, je pense.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "détester" },
          { "f": "ce plat, je pense." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Nicolas", "e": "🧑‍🍳" },
        "B": { "n": "Manon", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Bonjour, vous désirez ?", "Ça fait cinq euros."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Non merci, c'est tout.", "Voilà, ça fait cinq euros."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-5-d0", "f": "Bonjour, vous désirez ?" },
        { "k": "A1-5-d1", "f": "Un café et un croissant, s'il vous plaît." },
        { "k": "A1-5-d2", "f": "Autre chose ?" },
        { "k": "A1-5-d3", "f": "Non merci, c'est tout." },
        { "k": "A1-5-d4", "f": "Voilà, ça fait cinq euros." }
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
      { "k": "A1-6-v0", "f": "l'heure" },
      { "k": "A1-6-v1", "f": "le matin" },
      { "k": "A1-6-v2", "f": "le midi" },
      { "k": "A1-6-v3", "f": "le soir" },
      { "k": "A1-6-v4", "f": "se réveiller" },
      { "k": "A1-6-v5", "f": "se lever" },
      { "k": "A1-6-v6", "f": "manger" },
      { "k": "A1-6-v7", "f": "travailler" },
      { "k": "A1-6-v8", "f": "dormir" },
      { "k": "A1-6-v9", "f": "minuit" }
    ],
    "phrases": [
      {
        "k": "A1-6-p0",
        "f": "Quelle heure est-il ?",
        "blocks": [
          { "f": "Quelle heure" },
          { "f": "est-il ?" }
        ],
        "scenarioEmoji": "⏰"
      },
      {
        "k": "A1-6-p1",
        "f": "Il est huit heures.",
        "blocks": [
          { "f": "Il est" },
          { "f": "huit heures." }
        ],
        "scenarioEmoji": "🕗"
      },
      {
        "k": "A1-6-p2",
        "f": "Je me réveille à sept heures.",
        "blocks": [
          { "f": "Je me réveille" },
          { "f": "à" },
          { "f": "sept heures." }
        ],
        "scenarioEmoji": "⏰"
      },
      {
        "k": "A1-6-p3",
        "f": "Le soir, je regarde la télé.",
        "blocks": [
          { "f": "Le soir," },
          { "f": "je regarde" },
          { "f": "la télé." }
        ],
        "scenarioEmoji": "📺"
      },
      {
        "k": "A1-6-p4",
        "f": "Il regarde l'heure sur son téléphone.",
        "blocks": [
          { "f": "Il regarde" },
          { "f": "l'heure" },
          { "f": "sur son téléphone." }
        ]
      },
      {
        "k": "A1-6-p5",
        "f": "Le midi, je mange à la maison.",
        "blocks": [
          { "f": "Le midi," },
          { "f": "je mange" },
          { "f": "à la maison." }
        ]
      },
      {
        "k": "A1-6-p6",
        "f": "Il va se réveiller tôt demain.",
        "blocks": [
          { "f": "Il va" },
          { "f": "se réveiller" },
          { "f": "tôt demain." }
        ]
      },
      {
        "k": "A1-6-p7",
        "f": "Elle va se lever à sept heures.",
        "blocks": [
          { "f": "Elle va" },
          { "f": "se lever" },
          { "f": "à sept heures." }
        ]
      },
      {
        "k": "A1-6-p8",
        "f": "Il doit travailler jusqu'à minuit.",
        "blocks": [
          { "f": "Il doit" },
          { "f": "travailler" },
          { "f": "jusqu'à minuit." }
        ]
      },
      {
        "k": "A1-6-p9",
        "f": "Je vais dormir maintenant.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "dormir" },
          { "f": "maintenant." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Clara", "e": "👩" },
        "B": { "n": "Julien", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Je me lève à six heures et demie.", "Je dors à minuit."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Je travaille le matin et l'après-midi.", "Je dors à minuit."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-6-d0", "f": "Tu te lèves à quelle heure ?" },
        { "k": "A1-6-d1", "f": "Je me lève à six heures et demie." },
        { "k": "A1-6-d2", "f": "Et tu travailles quand ?" },
        { "k": "A1-6-d3", "f": "Je travaille le matin et l'après-midi." }
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
      { "k": "A1-7-v0", "f": "lundi" },
      { "k": "A1-7-v1", "f": "mardi" },
      { "k": "A1-7-v2", "f": "aujourd'hui" },
      { "k": "A1-7-v3", "f": "demain" },
      { "k": "A1-7-v4", "f": "hier" },
      { "k": "A1-7-v5", "f": "la semaine" },
      { "k": "A1-7-v6", "f": "le mois" },
      { "k": "A1-7-v7", "f": "janvier" },
      { "k": "A1-7-v8", "f": "décembre" },
      { "k": "A1-7-v9", "f": "la date" }
    ],
    "phrases": [
      {
        "k": "A1-7-p0",
        "f": "Quel jour sommes-nous ?",
        "blocks": [
          { "f": "Quel jour" },
          { "f": "sommes-nous ?" }
        ],
        "scenarioEmoji": "📅"
      },
      {
        "k": "A1-7-p1",
        "f": "Nous sommes lundi.",
        "blocks": [
          { "f": "Nous sommes" },
          { "f": "lundi." }
        ],
        "scenarioEmoji": "🗓️"
      },
      {
        "k": "A1-7-p2",
        "f": "Mon anniversaire est en mars.",
        "blocks": [
          { "f": "Mon anniversaire" },
          { "f": "est" },
          { "f": "en mars." }
        ],
        "scenarioEmoji": "🎂"
      },
      {
        "k": "A1-7-p3",
        "f": "À demain !",
        "blocks": [
          { "f": "À" },
          { "f": "demain !" }
        ],
        "scenarioEmoji": "👋"
      },
      {
        "k": "A1-7-p4",
        "f": "Aujourd'hui, il fait beau.",
        "blocks": [
          { "f": "Aujourd'hui," },
          { "f": "il fait beau." }
        ]
      },
      {
        "k": "A1-7-p5",
        "f": "La semaine prochaine, je pars en voyage.",
        "blocks": [
          { "f": "La semaine" },
          { "f": "prochaine," },
          { "f": "je pars en voyage." }
        ]
      },
      {
        "k": "A1-7-p6",
        "f": "Le mois de janvier est très froid.",
        "blocks": [
          { "f": "Le mois" },
          { "f": "de janvier" },
          { "f": "est très froid." }
        ]
      },
      {
        "k": "A1-7-p7",
        "f": "Mon anniversaire est en décembre.",
        "blocks": [
          { "f": "Mon anniversaire" },
          { "f": "est en" },
          { "f": "décembre." }
        ]
      },
      {
        "k": "A1-7-p8",
        "f": "Quelle est la date aujourd'hui ?",
        "blocks": [
          { "f": "Quelle est" },
          { "f": "la date" },
          { "f": "aujourd'hui ?" }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Chloé", "e": "👩" },
        "B": { "n": "Maxime", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Non, je travaille mercredi.", "Mardi, ça te va ?"]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Parfait, à mercredi alors !", "Non, je travaille mardi."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-7-d0", "f": "On se voit quel jour ?" },
        { "k": "A1-7-d1", "f": "Mardi, ça te va ?" },
        { "k": "A1-7-d2", "f": "Non, je travaille mardi. Et mercredi ?" },
        { "k": "A1-7-d3", "f": "Parfait, à mercredi alors !" }
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
      { "k": "A1-8-v0", "f": "la rue" },
      { "k": "A1-8-v1", "f": "la place" },
      { "k": "A1-8-v2", "f": "le musée" },
      { "k": "A1-8-v3", "f": "l'hôpital" },
      { "k": "A1-8-v4", "f": "la gare" },
      { "k": "A1-8-v5", "f": "tout droit" },
      { "k": "A1-8-v6", "f": "à gauche" },
      { "k": "A1-8-v7", "f": "à droite" },
      { "k": "A1-8-v8", "f": "près" },
      { "k": "A1-8-v9", "f": "loin" }
    ],
    "phrases": [
      {
        "k": "A1-8-p0",
        "f": "Où est la gare ?",
        "blocks": [
          { "f": "Où est" },
          { "f": "la gare ?" }
        ],
        "scenarioEmoji": "🚉"
      },
      {
        "k": "A1-8-p1",
        "f": "Tournez à gauche.",
        "blocks": [
          { "f": "Tournez" },
          { "f": "à gauche." }
        ],
        "scenarioEmoji": "⬅️"
      },
      {
        "k": "A1-8-p2",
        "f": "C'est tout droit.",
        "blocks": [
          { "f": "C'est" },
          { "f": "tout droit." }
        ],
        "scenarioEmoji": "⬆️"
      },
      {
        "k": "A1-8-p3",
        "f": "C'est loin d'ici ?",
        "blocks": [
          { "f": "C'est loin" },
          { "f": "d'ici ?" }
        ],
        "scenarioEmoji": "🗺️"
      },
      {
        "k": "A1-8-p4",
        "f": "La rue est très calme le soir.",
        "blocks": [
          { "f": "La rue" },
          { "f": "est très calme" },
          { "f": "le soir." }
        ]
      },
      {
        "k": "A1-8-p5",
        "f": "La place est au centre-ville.",
        "blocks": [
          { "f": "La place" },
          { "f": "est au" },
          { "f": "centre-ville." }
        ]
      },
      {
        "k": "A1-8-p6",
        "f": "L'hôpital est loin d'ici.",
        "blocks": [
          { "f": "L'hôpital" },
          { "f": "est loin" },
          { "f": "d'ici." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Emma", "e": "👩" },
        "B": { "n": "Pierre", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Merci beaucoup !", "C'est à gauche."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Non, c'est à cinq minutes.", "Merci beaucoup !"]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-8-d0", "f": "Excusez-moi, où est le musée ?" },
        { "k": "A1-8-d1", "f": "C'est tout droit, puis à droite." },
        { "k": "A1-8-d2", "f": "C'est loin ?" },
        { "k": "A1-8-d3", "f": "Non, c'est à cinq minutes." },
        { "k": "A1-8-d4", "f": "Merci beaucoup !" }
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
      { "k": "A1-9-v0", "f": "français / française" },
      { "k": "A1-9-v1", "f": "brésilien / brésilienne" },
      { "k": "A1-9-v2", "f": "américain / américaine" },
      { "k": "A1-9-v3", "f": "anglais / anglaise" },
      { "k": "A1-9-v4", "f": "espagnol / espagnole" },
      { "k": "A1-9-v5", "f": "italien / italienne" },
      { "k": "A1-9-v6", "f": "allemand / allemande" },
      { "k": "A1-9-v7", "f": "portugais / portugaise" },
      { "k": "A1-9-v8", "f": "la nationalité" },
      { "k": "A1-9-v9", "f": "venir de" }
    ],
    "phrases": [
      {
        "k": "A1-9-p0",
        "f": "Je suis {nacionalidade}.",
        "blocks": [
          { "f": "Je suis" },
          { "f": "{nacionalidade}." }
        ],
        "scenarioEmoji": "🇧🇷"
      },
      {
        "k": "A1-9-p1",
        "f": "Il est français, elle est espagnole.",
        "blocks": [
          { "f": "Il est français," },
          { "f": "elle est" },
          { "f": "espagnole." }
        ],
        "scenarioEmoji": "🌍"
      },
      {
        "k": "A1-9-p2",
        "f": "D'où viens-tu ?",
        "blocks": [
          { "f": "D'où" },
          { "f": "viens-tu ?" }
        ],
        "scenarioEmoji": "✈️"
      },
      {
        "k": "A1-9-p3",
        "f": "Je viens du Portugal.",
        "blocks": [
          { "f": "Je viens" },
          { "f": "du Portugal." }
        ],
        "scenarioEmoji": "🇵🇹"
      },
      {
        "k": "A1-9-p4",
        "f": "La nationalité est écrite sur le passeport.",
        "blocks": [
          { "f": "La nationalité" },
          { "f": "est écrite" },
          { "f": "sur le passeport." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Thomas", "e": "🧑" },
        "B": { "n": "Sofia", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 4,
          "bad": ["Oui, je suis italienne.", "Je suis d'Italie."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Moi, je suis allemand.", "Non, j'habite au Portugal."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-9-d0", "f": "Tu es d'où ?" },
        { "k": "A1-9-d1", "f": "Je suis italienne, et toi ?" },
        { "k": "A1-9-d2", "f": "Moi, je suis allemand." },
        { "k": "A1-9-d3", "f": "Tu habites en Allemagne ?" },
        { "k": "A1-9-d4", "f": "Non, j'habite au Portugal maintenant." }
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
      { "k": "A1-10-v0", "f": "le pantalon" },
      { "k": "A1-10-v1", "f": "la robe" },
      { "k": "A1-10-v2", "f": "cher" },
      { "k": "A1-10-v3", "f": "pas cher" },
      { "k": "A1-10-v4", "f": "la taille" },
      { "k": "A1-10-v5", "f": "le magasin" },
      { "k": "A1-10-v6", "f": "trente" },
      { "k": "A1-10-v7", "f": "quarante" },
      { "k": "A1-10-v8", "f": "cinquante" },
      { "k": "A1-10-v9", "f": "soixante" },
      { "k": "A1-10-v10", "f": "soixante-dix" },
      { "k": "A1-10-v11", "f": "quatre-vingts" },
      { "k": "A1-10-v12", "f": "quatre-vingt-dix" },
      { "k": "A1-10-v13", "f": "cent" }
    ],
    "phrases": [
      {
        "k": "A1-10-p0",
        "f": "Combien ça coûte ?",
        "blocks": [
          { "f": "Combien" },
          { "f": "ça coûte ?" }
        ],
        "scenarioEmoji": "🏷️"
      },
      {
        "k": "A1-10-p1",
        "f": "Ça coûte quarante euros.",
        "blocks": [
          { "f": "Ça coûte" },
          { "f": "quarante" },
          { "f": "euros." }
        ],
        "scenarioEmoji": "💶"
      },
      {
        "k": "A1-10-p2",
        "f": "Je peux essayer ce pantalon ?",
        "blocks": [
          { "f": "Je peux essayer" },
          { "f": "ce pantalon ?" }
        ],
        "scenarioEmoji": "👖"
      },
      {
        "k": "A1-10-p3",
        "f": "Ça fait cent euros, s'il vous plaît.",
        "blocks": [
          { "f": "Ça fait" },
          { "f": "cent euros," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "💳"
      },
      {
        "k": "A1-10-p4",
        "f": "Le pantalon est trop grand.",
        "blocks": [
          { "f": "Le pantalon" },
          { "f": "est trop" },
          { "f": "grand." }
        ]
      },
      {
        "k": "A1-10-p5",
        "f": "La robe est très jolie.",
        "blocks": [
          { "f": "La robe" },
          { "f": "est très" },
          { "f": "jolie." }
        ]
      },
      {
        "k": "A1-10-p6",
        "f": "Ce n'est pas cher du tout.",
        "blocks": [
          { "f": "Ce n'est" },
          { "f": "pas cher" },
          { "f": "du tout." }
        ]
      },
      {
        "k": "A1-10-p7",
        "f": "La taille est trop petite.",
        "blocks": [
          { "f": "La taille" },
          { "f": "est trop" },
          { "f": "petite." }
        ]
      },
      {
        "k": "A1-10-p8",
        "f": "Le magasin ferme à dix-neuf heures.",
        "blocks": [
          { "f": "Le magasin" },
          { "f": "ferme" },
          { "f": "à dix-neuf heures." }
        ]
      },
      {
        "k": "A1-10-p9",
        "f": "Cette veste coûte trente euros.",
        "blocks": [
          { "f": "Cette veste" },
          { "f": "coûte" },
          { "f": "trente euros." }
        ]
      },
      {
        "k": "A1-10-p10",
        "f": "Ces chaussures coûtent cinquante euros.",
        "blocks": [
          { "f": "Ces chaussures" },
          { "f": "coûtent" },
          { "f": "cinquante euros." }
        ]
      },
      {
        "k": "A1-10-p11",
        "f": "Le manteau coûte soixante-dix euros.",
        "blocks": [
          { "f": "Le manteau" },
          { "f": "coûte" },
          { "f": "soixante-dix euros." }
        ]
      },
      {
        "k": "A1-10-p12",
        "f": "Cette robe coûte quatre-vingts euros.",
        "blocks": [
          { "f": "Cette robe" },
          { "f": "coûte" },
          { "f": "quatre-vingts euros." }
        ]
      },
      {
        "k": "A1-10-p13",
        "f": "Ce sac coûte quatre-vingt-dix euros.",
        "blocks": [
          { "f": "Ce sac" },
          { "f": "coûte" },
          { "f": "quatre-vingt-dix euros." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Inès", "e": "👩" },
        "B": { "n": "Vincent", "e": "🧑‍💼" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Je fais du 38.", "Je la prends !"]
        },
        {
          "k": "listen",
          "line": 1,
          "bad": ["Elle coûte soixante euros.", "Parfait, je la prends !"]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-10-d0", "f": "Bonjour, je cherche une robe." },
        { "k": "A1-10-d1", "f": "Quelle taille faites-vous ?" },
        { "k": "A1-10-d2", "f": "Je fais du 38. Ça coûte combien ?" },
        { "k": "A1-10-d3", "f": "Elle coûte soixante euros." },
        { "k": "A1-10-d4", "f": "Parfait, je la prends !" }
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
      { "k": "A1-11-v0", "f": "la viande" },
      { "k": "A1-11-v1", "f": "le poulet" },
      { "k": "A1-11-v2", "f": "les légumes" },
      { "k": "A1-11-v3", "f": "la salade" },
      { "k": "A1-11-v4", "f": "le riz" },
      { "k": "A1-11-v5", "f": "les pâtes" },
      { "k": "A1-11-v6", "f": "le sucre" },
      { "k": "A1-11-v7", "f": "le sel" },
      { "k": "A1-11-v8", "f": "l'œuf" },
      { "k": "A1-11-v9", "f": "le dessert" }
    ],
    "phrases": [
      {
        "k": "A1-11-p0",
        "f": "J'aime la viande.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "la viande." }
        ],
        "scenarioEmoji": "🥩"
      },
      {
        "k": "A1-11-p1",
        "f": "Je mange des légumes tous les jours.",
        "blocks": [
          { "f": "Je mange" },
          { "f": "des légumes" },
          { "f": "tous les jours." }
        ],
        "scenarioEmoji": "🥦"
      },
      {
        "k": "A1-11-p2",
        "f": "Je ne mange pas de viande.",
        "blocks": [
          { "f": "Je ne mange pas" },
          { "f": "de viande." }
        ],
        "scenarioEmoji": "🚫"
      },
      {
        "k": "A1-11-p3",
        "f": "Je prends du riz et des pâtes.",
        "blocks": [
          { "f": "Je prends" },
          { "f": "du riz" },
          { "f": "et des pâtes." }
        ],
        "scenarioEmoji": "🍚"
      },
      {
        "k": "A1-11-p4",
        "f": "Le poulet est délicieux ce soir.",
        "blocks": [
          { "f": "Le poulet" },
          { "f": "est délicieux" },
          { "f": "ce soir." }
        ]
      },
      {
        "k": "A1-11-p5",
        "f": "Les légumes sont bons pour la santé.",
        "blocks": [
          { "f": "Les légumes" },
          { "f": "sont bons" },
          { "f": "pour la santé." }
        ]
      },
      {
        "k": "A1-11-p6",
        "f": "La salade est fraîche.",
        "blocks": [
          { "f": "La salade" },
          { "f": "est fraîche." }
        ]
      },
      {
        "k": "A1-11-p7",
        "f": "Le riz et les pâtes sont mes plats préférés.",
        "blocks": [
          { "f": "Le riz" },
          { "f": "et les pâtes" },
          { "f": "sont mes plats préférés." }
        ]
      },
      {
        "k": "A1-11-p8",
        "f": "Le sucre et le sel sont sur la table.",
        "blocks": [
          { "f": "Le sucre" },
          { "f": "et le sel" },
          { "f": "sont sur la table." }
        ]
      },
      {
        "k": "A1-11-p9",
        "f": "L'œuf est cuit.",
        "blocks": [
          { "f": "L'œuf" },
          { "f": "est cuit." }
        ]
      },
      {
        "k": "A1-11-p10",
        "f": "Le dessert est prêt.",
        "blocks": [
          { "f": "Le dessert" },
          { "f": "est prêt." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Lucas", "e": "👨" },
        "B": { "n": "Marion", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": ["Oui, avec du sucre !", "Tu veux un dessert ?"]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": ["Du riz, des légumes et du poulet.", "Qu'est-ce qu'on achète ?"]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-11-d0", "f": "Qu'est-ce qu'on achète ?" },
        { "k": "A1-11-d1", "f": "Du riz, des légumes et du poulet." },
        { "k": "A1-11-d2", "f": "Tu veux un dessert ?" },
        { "k": "A1-11-d3", "f": "Oui, avec du sucre, s'il te plaît !" }
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
      { "k": "A1-12-v0", "f": "un kilo (de)" },
      { "k": "A1-12-v1", "f": "un demi-kilo" },
      { "k": "A1-12-v2", "f": "un litre" },
      { "k": "A1-12-v3", "f": "un gramme" },
      { "k": "A1-12-v4", "f": "un peu de" },
      { "k": "A1-12-v5", "f": "beaucoup de" },
      { "k": "A1-12-v6", "f": "assez de" },
      { "k": "A1-12-v7", "f": "trop de" },
      { "k": "A1-12-v8", "f": "une tranche (de)" },
      { "k": "A1-12-v9", "f": "une bouteille (de)" }
    ],
    "phrases": [
      {
        "k": "A1-12-p0",
        "f": "Je prends un kilo de pommes.",
        "blocks": [
          { "f": "Je prends" },
          { "f": "un kilo" },
          { "f": "de pommes." }
        ],
        "scenarioEmoji": "🍎"
      },
      {
        "k": "A1-12-p1",
        "f": "Un litre de lait, s'il vous plaît.",
        "blocks": [
          { "f": "Un litre" },
          { "f": "de lait," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "🥛"
      },
      {
        "k": "A1-12-p2",
        "f": "C'est trop de sucre pour moi.",
        "blocks": [
          { "f": "C'est trop" },
          { "f": "de sucre" },
          { "f": "pour moi." }
        ],
        "scenarioEmoji": "🍬"
      },
      {
        "k": "A1-12-p3",
        "f": "Une tranche de pain, s'il te plaît.",
        "blocks": [
          { "f": "Une tranche" },
          { "f": "de pain," },
          { "f": "s'il te plaît." }
        ],
        "scenarioEmoji": "🍞"
      },
      {
        "k": "A1-12-p4",
        "f": "Un gramme, c'est très peu.",
        "blocks": [
          { "f": "Un gramme," },
          { "f": "c'est très" },
          { "f": "peu." }
        ]
      },
      {
        "k": "A1-12-p5",
        "f": "Il y a beaucoup de monde ici.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "beaucoup de" },
          { "f": "monde ici." }
        ]
      },
      {
        "k": "A1-12-p6",
        "f": "Je n'ai pas assez de temps.",
        "blocks": [
          { "f": "Je n'ai pas" },
          { "f": "assez de" },
          { "f": "temps." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Michel", "e": "🧑‍🌾" },
        "B": { "n": "Hélène", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": ["Une bouteille d'eau.", "Et avec ça ?"]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": ["Un demi-kilo, s'il vous plaît.", "Vous voulez combien de pommes ?"]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-12-d0", "f": "Vous voulez combien de pommes ?" },
        { "k": "A1-12-d1", "f": "Un demi-kilo, s'il vous plaît." },
        { "k": "A1-12-d2", "f": "Et avec ça ?" },
        { "k": "A1-12-d3", "f": "Une bouteille d'eau et un peu de fromage." }
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
      { "k": "A1-13-v0", "f": "il fait beau" },
      { "k": "A1-13-v1", "f": "il fait froid" },
      { "k": "A1-13-v2", "f": "il fait chaud" },
      { "k": "A1-13-v3", "f": "il pleut" },
      { "k": "A1-13-v4", "f": "il neige" },
      { "k": "A1-13-v5", "f": "le soleil" },
      { "k": "A1-13-v6", "f": "le printemps" },
      { "k": "A1-13-v7", "f": "l'été" },
      { "k": "A1-13-v8", "f": "l'automne" },
      { "k": "A1-13-v9", "f": "l'hiver" }
    ],
    "phrases": [
      {
        "k": "A1-13-p0",
        "f": "Quel temps fait-il ?",
        "blocks": [
          { "f": "Quel temps" },
          { "f": "fait-il ?" }
        ],
        "scenarioEmoji": "🌦️"
      },
      {
        "k": "A1-13-p1",
        "f": "Il fait très chaud aujourd'hui.",
        "blocks": [
          { "f": "Il fait" },
          { "f": "très chaud" },
          { "f": "aujourd'hui." }
        ],
        "scenarioEmoji": "☀️"
      },
      {
        "k": "A1-13-p2",
        "f": "J'aime l'hiver.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "l'hiver." }
        ],
        "scenarioEmoji": "❄️"
      },
      {
        "k": "A1-13-p3",
        "f": "Il pleut souvent en automne.",
        "blocks": [
          { "f": "Il pleut" },
          { "f": "souvent" },
          { "f": "en automne." }
        ],
        "scenarioEmoji": "🍂"
      },
      {
        "k": "A1-13-p4",
        "f": "Il neige beaucoup en hiver.",
        "blocks": [
          { "f": "Il neige" },
          { "f": "beaucoup" },
          { "f": "en hiver." }
        ]
      },
      {
        "k": "A1-13-p5",
        "f": "Le soleil brille aujourd'hui.",
        "blocks": [
          { "f": "Le soleil" },
          { "f": "brille" },
          { "f": "aujourd'hui." }
        ]
      },
      {
        "k": "A1-13-p6",
        "f": "Le printemps est ma saison préférée.",
        "blocks": [
          { "f": "Le printemps" },
          { "f": "est ma saison" },
          { "f": "préférée." }
        ]
      },
      {
        "k": "A1-13-p7",
        "f": "L'automne est très coloré.",
        "blocks": [
          { "f": "L'automne" },
          { "f": "est très" },
          { "f": "coloré." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Alice", "e": "👩" },
        "B": { "n": "Baptiste", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": ["Je préfère l'été.", "Il neige et il fait chaud."]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": ["Il fait beau, mais il fait froid.", "Il pleut aujourd'hui."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-13-d0", "f": "Quel temps fait-il aujourd'hui ?" },
        { "k": "A1-13-d1", "f": "Il fait beau, mais il fait froid." },
        { "k": "A1-13-d2", "f": "Tu préfères quelle saison ?" },
        { "k": "A1-13-d3", "f": "Je préfère l'été, il fait chaud." }
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
      { "k": "A1-14-v0", "f": "le bus" },
      { "k": "A1-14-v1", "f": "le train" },
      { "k": "A1-14-v2", "f": "le métro" },
      { "k": "A1-14-v3", "f": "la voiture" },
      { "k": "A1-14-v4", "f": "le vélo" },
      { "k": "A1-14-v5", "f": "à pied" },
      { "k": "A1-14-v6", "f": "prendre" },
      { "k": "A1-14-v7", "f": "l'arrêt" },
      { "k": "A1-14-v8", "f": "le billet" },
      { "k": "A1-14-v9", "f": "la station" }
    ],
    "phrases": [
      {
        "k": "A1-14-p0",
        "f": "Je prends le métro tous les jours.",
        "blocks": [
          { "f": "Je prends" },
          { "f": "le métro" },
          { "f": "tous les jours." }
        ],
        "scenarioEmoji": "🚇"
      },
      {
        "k": "A1-14-p1",
        "f": "Où est l'arrêt de bus ?",
        "blocks": [
          { "f": "Où est" },
          { "f": "l'arrêt" },
          { "f": "de bus ?" }
        ],
        "scenarioEmoji": "🚌"
      },
      {
        "k": "A1-14-p2",
        "f": "Un billet, s'il vous plaît.",
        "blocks": [
          { "f": "Un billet," },
          { "f": "s'il vous plaît." }
        ],
        "scenarioEmoji": "🎫"
      },
      {
        "k": "A1-14-p3",
        "f": "Je vais au travail à pied.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "au travail" },
          { "f": "à pied." }
        ],
        "scenarioEmoji": "🚶"
      },
      {
        "k": "A1-14-p4",
        "f": "Je vais prendre le bus ce matin.",
        "blocks": [
          { "f": "Je vais prendre" },
          { "f": "le bus" },
          { "f": "ce matin." }
        ]
      },
      {
        "k": "A1-14-p5",
        "f": "Le train part à huit heures.",
        "blocks": [
          { "f": "Le train" },
          { "f": "part" },
          { "f": "à huit heures." }
        ]
      },
      {
        "k": "A1-14-p6",
        "f": "La voiture est garée devant la maison.",
        "blocks": [
          { "f": "La voiture" },
          { "f": "est garée" },
          { "f": "devant la maison." }
        ]
      },
      {
        "k": "A1-14-p7",
        "f": "Le vélo est plus rapide en ville.",
        "blocks": [
          { "f": "Le vélo" },
          { "f": "est plus rapide" },
          { "f": "en ville." }
        ]
      },
      {
        "k": "A1-14-p8",
        "f": "La station est fermée aujourd'hui.",
        "blocks": [
          { "f": "La station" },
          { "f": "est fermée" },
          { "f": "aujourd'hui." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Laura", "e": "👩" },
        "B": { "n": "Romain", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Oui, c'est la bonne direction.", "Le train va au centre-ville."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Ça coûte deux euros.", "Combien coûte le billet ?"]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-14-d0", "f": "Excusez-moi, ce train va au centre-ville ?" },
        { "k": "A1-14-d1", "f": "Oui, c'est la bonne direction." },
        { "k": "A1-14-d2", "f": "Combien coûte le billet ?" },
        { "k": "A1-14-d3", "f": "Ça coûte deux euros." }
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
      { "k": "A1-15-v0", "f": "la tête" },
      { "k": "A1-15-v1", "f": "le ventre" },
      { "k": "A1-15-v2", "f": "la main" },
      { "k": "A1-15-v3", "f": "le pied" },
      { "k": "A1-15-v4", "f": "malade" },
      { "k": "A1-15-v5", "f": "le médecin" },
      { "k": "A1-15-v6", "f": "la pharmacie" },
      { "k": "A1-15-v7", "f": "avoir mal" },
      { "k": "A1-15-v8", "f": "la fièvre" },
      { "k": "A1-15-v9", "f": "se sentir" }
    ],
    "phrases": [
      {
        "k": "A1-15-p0",
        "f": "J'ai mal à la tête.",
        "blocks": [
          { "f": "J'ai mal" },
          { "f": "à la tête." }
        ],
        "scenarioEmoji": "🤕"
      },
      {
        "k": "A1-15-p1",
        "f": "Je me sens malade.",
        "blocks": [
          { "f": "Je me sens" },
          { "f": "malade." }
        ],
        "scenarioEmoji": "🤒"
      },
      {
        "k": "A1-15-p2",
        "f": "Où est la pharmacie ?",
        "blocks": [
          { "f": "Où est" },
          { "f": "la pharmacie ?" }
        ],
        "scenarioEmoji": "💊"
      },
      {
        "k": "A1-15-p3",
        "f": "Il a de la fièvre.",
        "blocks": [
          { "f": "Il a" },
          { "f": "de la fièvre." }
        ],
        "scenarioEmoji": "🌡️"
      },
      {
        "k": "A1-15-p4",
        "f": "Le ventre me fait mal.",
        "blocks": [
          { "f": "Le ventre" },
          { "f": "me fait" },
          { "f": "mal." }
        ]
      },
      {
        "k": "A1-15-p5",
        "f": "La main est blessée.",
        "blocks": [
          { "f": "La main" },
          { "f": "est blessée." }
        ]
      },
      {
        "k": "A1-15-p6",
        "f": "Le pied me fait mal aussi.",
        "blocks": [
          { "f": "Le pied" },
          { "f": "me fait mal" },
          { "f": "aussi." }
        ]
      },
      {
        "k": "A1-15-p7",
        "f": "Le médecin arrive dans dix minutes.",
        "blocks": [
          { "f": "Le médecin" },
          { "f": "arrive" },
          { "f": "dans dix minutes." }
        ]
      },
      {
        "k": "A1-15-p8",
        "f": "Je vais avoir mal à la tête si ça continue.",
        "blocks": [
          { "f": "Je vais" },
          { "f": "avoir mal" },
          { "f": "à la tête si ça continue." }
        ]
      },
      {
        "k": "A1-15-p9",
        "f": "Il ne va pas se sentir bien demain.",
        "blocks": [
          { "f": "Il ne va pas" },
          { "f": "se sentir bien" },
          { "f": "demain." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Dr. Martin", "e": "🩺" },
        "B": { "n": "Théo", "e": "🧑" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["J'ai mal au ventre.", "Vous devez vous reposer."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Depuis hier soir.", "Vous devez vous reposer."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-15-d0", "f": "Qu'est-ce qui ne va pas ?" },
        { "k": "A1-15-d1", "f": "J'ai mal au ventre et j'ai de la fièvre." },
        { "k": "A1-15-d2", "f": "Depuis quand ?" },
        { "k": "A1-15-d3", "f": "Depuis hier soir." },
        { "k": "A1-15-d4", "f": "Vous devez vous reposer." }
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
      { "k": "A1-16-v0", "f": "rouge" },
      { "k": "A1-16-v1", "f": "bleu" },
      { "k": "A1-16-v2", "f": "vert" },
      { "k": "A1-16-v3", "f": "jaune" },
      { "k": "A1-16-v4", "f": "noir" },
      { "k": "A1-16-v5", "f": "blanc" },
      { "k": "A1-16-v6", "f": "grand" },
      { "k": "A1-16-v7", "f": "petit" },
      { "k": "A1-16-v8", "f": "joli" },
      { "k": "A1-16-v9", "f": "gentil" }
    ],
    "phrases": [
      {
        "k": "A1-16-p0",
        "f": "J'aime la couleur bleue.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "la couleur" },
          { "f": "bleue." }
        ],
        "scenarioEmoji": "🔵"
      },
      {
        "k": "A1-16-p1",
        "f": "Elle est très gentille.",
        "blocks": [
          { "f": "Elle est" },
          { "f": "très" },
          { "f": "gentille." }
        ],
        "scenarioEmoji": "😊"
      },
      {
        "k": "A1-16-p2",
        "f": "Mon chat est noir et blanc.",
        "blocks": [
          { "f": "Mon chat" },
          { "f": "est noir" },
          { "f": "et blanc." }
        ],
        "scenarioEmoji": "🐱"
      },
      {
        "k": "A1-16-p3",
        "f": "C'est une jolie robe rouge.",
        "blocks": [
          { "f": "C'est" },
          { "f": "une jolie robe" },
          { "f": "rouge." }
        ],
        "scenarioEmoji": "👗"
      },
      {
        "k": "A1-16-p4",
        "f": "Le pull est vert et jaune.",
        "blocks": [
          { "f": "Le pull" },
          { "f": "est vert" },
          { "f": "et jaune." }
        ]
      },
      {
        "k": "A1-16-p5",
        "f": "Le chien est petit.",
        "blocks": [
          { "f": "Le chien" },
          { "f": "est petit." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Pauline", "e": "👩" },
        "B": { "n": "Adrien", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Il a les cheveux noirs.", "Non, il est petit."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Oui, il est très gentil !", "Il est sympa ?"]
        },
        { "k": "understand", "ok": 0 }
      ],
      "lines": [
        { "k": "A1-16-d0", "f": "Comment est ton frère ?" },
        { "k": "A1-16-d1", "f": "Il est grand et il a les cheveux noirs." },
        { "k": "A1-16-d2", "f": "Il est sympa ?" },
        { "k": "A1-16-d3", "f": "Oui, il est très gentil !" }
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
      { "k": "A1-17-v0", "f": "la maison" },
      { "k": "A1-17-v1", "f": "l'appartement" },
      { "k": "A1-17-v2", "f": "la chambre" },
      { "k": "A1-17-v3", "f": "la cuisine" },
      { "k": "A1-17-v4", "f": "la salle de bain" },
      { "k": "A1-17-v5", "f": "le salon" },
      { "k": "A1-17-v6", "f": "la porte" },
      { "k": "A1-17-v7", "f": "la fenêtre" },
      { "k": "A1-17-v8", "f": "il y a" },
      { "k": "A1-17-v9", "f": "il n'y a pas de" }
    ],
    "phrases": [
      {
        "k": "A1-17-p0",
        "f": "Il y a une chambre.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "une chambre." }
        ],
        "scenarioEmoji": "🛏️"
      },
      {
        "k": "A1-17-p1",
        "f": "Il y a deux salles de bain.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "deux" },
          { "f": "salles de bain." }
        ],
        "scenarioEmoji": "🚿"
      },
      {
        "k": "A1-17-p2",
        "f": "Il n'y a pas de jardin.",
        "blocks": [
          { "f": "Il n'y a pas" },
          { "f": "de jardin." }
        ],
        "scenarioEmoji": "🚫"
      },
      {
        "k": "A1-17-p3",
        "f": "C'est une grande maison.",
        "blocks": [
          { "f": "C'est" },
          { "f": "une grande" },
          { "f": "maison." }
        ],
        "scenarioEmoji": "🏠"
      },
      {
        "k": "A1-17-p4",
        "f": "La maison est très grande.",
        "blocks": [
          { "f": "La maison" },
          { "f": "est très" },
          { "f": "grande." }
        ]
      },
      {
        "k": "A1-17-p5",
        "f": "L'appartement a deux chambres.",
        "blocks": [
          { "f": "L'appartement" },
          { "f": "a deux" },
          { "f": "chambres." }
        ]
      },
      {
        "k": "A1-17-p6",
        "f": "La chambre est au premier étage.",
        "blocks": [
          { "f": "La chambre" },
          { "f": "est au" },
          { "f": "premier étage." }
        ]
      },
      {
        "k": "A1-17-p7",
        "f": "La cuisine est très propre.",
        "blocks": [
          { "f": "La cuisine" },
          { "f": "est très" },
          { "f": "propre." }
        ]
      },
      {
        "k": "A1-17-p8",
        "f": "La salle de bain est à côté de la chambre.",
        "blocks": [
          { "f": "La salle de bain" },
          { "f": "est à côté" },
          { "f": "de la chambre." }
        ]
      },
      {
        "k": "A1-17-p9",
        "f": "Le salon est confortable.",
        "blocks": [
          { "f": "Le salon" },
          { "f": "est confortable." }
        ]
      },
      {
        "k": "A1-17-p10",
        "f": "La porte est fermée à clé.",
        "blocks": [
          { "f": "La porte" },
          { "f": "est fermée" },
          { "f": "à clé." }
        ]
      },
      {
        "k": "A1-17-p11",
        "f": "La fenêtre donne sur le jardin.",
        "blocks": [
          { "f": "La fenêtre" },
          { "f": "donne sur" },
          { "f": "le jardin." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Mathilde", "e": "👩" },
        "B": { "n": "Karim", "e": "🧑‍💼" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Oui, il y a un balcon.", "Il y a deux chambres."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["Non, il n'y a pas de balcon.", "Il y a un beau salon."]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-17-d0", "f": "Il y a combien de chambres ?" },
        { "k": "A1-17-d1", "f": "Il y a deux chambres et une cuisine." },
        { "k": "A1-17-d2", "f": "Il y a un balcon ?" },
        { "k": "A1-17-d3", "f": "Non, il n'y a pas de balcon, mais il y a un beau salon." }
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
      { "k": "A1-18-v0", "f": "le lit" },
      { "k": "A1-18-v1", "f": "la table" },
      { "k": "A1-18-v2", "f": "la chaise" },
      { "k": "A1-18-v3", "f": "le canapé" },
      { "k": "A1-18-v4", "f": "la lampe" },
      { "k": "A1-18-v5", "f": "sur" },
      { "k": "A1-18-v6", "f": "sous" },
      { "k": "A1-18-v7", "f": "devant" },
      { "k": "A1-18-v8", "f": "derrière" },
      { "k": "A1-18-v9", "f": "à côté de" }
    ],
    "phrases": [
      {
        "k": "A1-18-p0",
        "f": "Le lit est à côté de la fenêtre.",
        "blocks": [
          { "f": "Le lit" },
          { "f": "est à côté de" },
          { "f": "la fenêtre." }
        ],
        "scenarioEmoji": "🛏️"
      },
      {
        "k": "A1-18-p1",
        "f": "Il y a une lampe sur la table.",
        "blocks": [
          { "f": "Il y a" },
          { "f": "une lampe" },
          { "f": "sur la table." }
        ],
        "scenarioEmoji": "💡"
      },
      {
        "k": "A1-18-p2",
        "f": "Le chat est sous le canapé.",
        "blocks": [
          { "f": "Le chat" },
          { "f": "est sous" },
          { "f": "le canapé." }
        ],
        "scenarioEmoji": "🐈"
      },
      {
        "k": "A1-18-p3",
        "f": "La chaise bleue est devant la table.",
        "blocks": [
          { "f": "La chaise bleue" },
          { "f": "est devant" },
          { "f": "la table." }
        ],
        "scenarioEmoji": "🪑"
      },
      {
        "k": "A1-18-p4",
        "f": "Le chat est derrière la chaise.",
        "blocks": [
          { "f": "Le chat" },
          { "f": "est derrière" },
          { "f": "la chaise." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Enzo", "e": "🧒" },
        "B": { "n": "Maman", "e": "👩" }
      },
      "check": [
        {
          "k": "fill",
          "line": 1,
          "bad": ["Elles sont sur la table.", "Oui, il est grand."]
        },
        {
          "k": "listen",
          "line": 2,
          "bad": ["Il est sous le lit.", "Où est mon sac ?"]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-18-d0", "f": "Où est mon sac ?" },
        { "k": "A1-18-d1", "f": "Il est sous le lit." },
        { "k": "A1-18-d2", "f": "Et mes clés ?" },
        { "k": "A1-18-d3", "f": "Elles sont sur la table, à côté de la lampe." }
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
      { "k": "A1-19-v0", "f": "le cinéma" },
      { "k": "A1-19-v1", "f": "la musique" },
      { "k": "A1-19-v2", "f": "le sport" },
      { "k": "A1-19-v3", "f": "lire" },
      { "k": "A1-19-v4", "f": "jouer" },
      { "k": "A1-19-v5", "f": "danser" },
      { "k": "A1-19-v6", "f": "chanter" },
      { "k": "A1-19-v7", "f": "le week-end" },
      { "k": "A1-19-v8", "f": "sortir" },
      { "k": "A1-19-v9", "f": "le film" }
    ],
    "phrases": [
      {
        "k": "A1-19-p0",
        "f": "Qu'est-ce que tu fais le week-end ?",
        "blocks": [
          { "f": "Qu'est-ce que" },
          { "f": "tu fais" },
          { "f": "le week-end ?" }
        ],
        "scenarioEmoji": "🎨"
      },
      {
        "k": "A1-19-p1",
        "f": "J'aime lire des livres.",
        "blocks": [
          { "f": "J'aime" },
          { "f": "lire" },
          { "f": "des livres." }
        ],
        "scenarioEmoji": "📚"
      },
      {
        "k": "A1-19-p2",
        "f": "On va au cinéma ce soir ?",
        "blocks": [
          { "f": "On va" },
          { "f": "au cinéma" },
          { "f": "ce soir ?" }
        ],
        "scenarioEmoji": "🎬"
      },
      {
        "k": "A1-19-p3",
        "f": "Il joue de la guitare.",
        "blocks": [
          { "f": "Il joue" },
          { "f": "de la guitare." }
        ],
        "scenarioEmoji": "🎸"
      },
      {
        "k": "A1-19-p4",
        "f": "Le cinéma est fermé ce soir.",
        "blocks": [
          { "f": "Le cinéma" },
          { "f": "est fermé" },
          { "f": "ce soir." }
        ]
      },
      {
        "k": "A1-19-p5",
        "f": "J'adore écouter de la musique.",
        "blocks": [
          { "f": "J'adore" },
          { "f": "écouter" },
          { "f": "de la musique." }
        ]
      },
      {
        "k": "A1-19-p6",
        "f": "Le sport est bon pour la santé.",
        "blocks": [
          { "f": "Le sport" },
          { "f": "est bon" },
          { "f": "pour la santé." }
        ]
      },
      {
        "k": "A1-19-p7",
        "f": "Les enfants aiment jouer dehors.",
        "blocks": [
          { "f": "Les enfants" },
          { "f": "aiment jouer" },
          { "f": "dehors." }
        ]
      },
      {
        "k": "A1-19-p8",
        "f": "Elle adore danser et chanter.",
        "blocks": [
          { "f": "Elle adore" },
          { "f": "danser" },
          { "f": "et chanter." }
        ]
      },
      {
        "k": "A1-19-p9",
        "f": "On va sortir samedi soir.",
        "blocks": [
          { "f": "On va" },
          { "f": "sortir" },
          { "f": "samedi soir." }
        ]
      },
      {
        "k": "A1-19-p10",
        "f": "Le film commence à vingt heures.",
        "blocks": [
          { "f": "Le film" },
          { "f": "commence" },
          { "f": "à vingt heures." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Élise", "e": "👩" },
        "B": { "n": "Quentin", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["Oui, avec des amis.", "Je danse le samedi."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["On ne sait pas encore !", "Quel film vous allez voir ?"]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-19-d0", "f": "Tu as des projets pour le week-end ?" },
        { "k": "A1-19-d1", "f": "Oui, je vais au cinéma avec des amis." },
        { "k": "A1-19-d2", "f": "Quel film vous allez voir ?" },
        { "k": "A1-19-d3", "f": "On ne sait pas encore !" }
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
      { "k": "A1-20-v0", "f": "hier" },
      { "k": "A1-20-v1", "f": "avant-hier" },
      { "k": "A1-20-v2", "f": "la semaine dernière" },
      { "k": "A1-20-v3", "f": "le week-end dernier" },
      { "k": "A1-20-v4", "f": "le mois dernier" },
      { "k": "A1-20-v5", "f": "l'année dernière" },
      { "k": "A1-20-v6", "f": "il y a deux jours" },
      { "k": "A1-20-v7", "f": "ce matin" },
      { "k": "A1-20-v8", "f": "déjà" },
      { "k": "A1-20-v9", "f": "récemment" }
    ],
    "phrases": [
      {
        "k": "A1-20-p0",
        "f": "Hier, j'ai visité un musée.",
        "blocks": [
          { "f": "Hier," },
          { "f": "j'ai visité" },
          { "f": "un musée." }
        ],
        "scenarioEmoji": "🖼️"
      },
      {
        "k": "A1-20-p1",
        "f": "La semaine dernière, j'ai mangé au restaurant.",
        "blocks": [
          { "f": "La semaine dernière," },
          { "f": "j'ai mangé" },
          { "f": "au restaurant." }
        ],
        "scenarioEmoji": "🍽️"
      },
      {
        "k": "A1-20-p2",
        "f": "Le week-end dernier, il a plu.",
        "blocks": [
          { "f": "Le week-end dernier," },
          { "f": "il a plu." }
        ],
        "scenarioEmoji": "🌧️"
      },
      {
        "k": "A1-20-p3",
        "f": "Tu as déjà visité Paris ?",
        "blocks": [
          { "f": "Tu as déjà" },
          { "f": "visité Paris ?" }
        ],
        "scenarioEmoji": "🗼"
      },
      {
        "k": "A1-20-p4",
        "f": "Avant-hier, j'ai visité Paris.",
        "blocks": [
          { "f": "Avant-hier," },
          { "f": "j'ai visité" },
          { "f": "Paris." }
        ]
      },
      {
        "k": "A1-20-p5",
        "f": "Le mois dernier, j'ai voyagé en France.",
        "blocks": [
          { "f": "Le mois dernier," },
          { "f": "j'ai voyagé" },
          { "f": "en France." }
        ]
      },
      {
        "k": "A1-20-p6",
        "f": "L'année dernière, j'ai appris le français.",
        "blocks": [
          { "f": "L'année dernière," },
          { "f": "j'ai appris" },
          { "f": "le français." }
        ]
      },
      {
        "k": "A1-20-p7",
        "f": "Il y a deux jours, il a plu.",
        "blocks": [
          { "f": "Il y a deux jours," },
          { "f": "il a plu." }
        ]
      },
      {
        "k": "A1-20-p8",
        "f": "Ce matin, j'ai bu un café.",
        "blocks": [
          { "f": "Ce matin," },
          { "f": "j'ai bu" },
          { "f": "un café." }
        ]
      },
      {
        "k": "A1-20-p9",
        "f": "Récemment, j'ai changé de travail.",
        "blocks": [
          { "f": "Récemment," },
          { "f": "j'ai changé" },
          { "f": "de travail." }
        ]
      }
    ],
    "dialogue": {
      "speakers": {
        "A": { "n": "Sarah", "e": "👩" },
        "B": { "n": "Kévin", "e": "👨" }
      },
      "check": [
        {
          "k": "fill",
          "line": 3,
          "bad": ["J'ai travaillé le matin.", "Demain, je fais du sport."]
        },
        {
          "k": "listen",
          "line": 0,
          "bad": ["On est allés au cinéma avec des amis.", "Et le week-end dernier ?"]
        },
        { "k": "understand", "ok": 1 }
      ],
      "lines": [
        { "k": "A1-20-d0", "f": "Qu'est-ce que tu as fait hier ?" },
        { "k": "A1-20-d1", "f": "J'ai travaillé le matin, et l'après-midi j'ai fait du sport." },
        { "k": "A1-20-d2", "f": "Et le week-end dernier ?" },
        { "k": "A1-20-d3", "f": "On est allés au cinéma avec des amis." }
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
